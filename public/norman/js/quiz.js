// 문제 풀기 — 노만 영감이 내는 품삯 일감.
//
// 포인트가 모자라면 여기서 번다. 벌이가 되는 길이 전부 강의 내용을 지나게
// 해 두어야 한다. 그러지 않으면 조는 어포던스를 잊고 돈놀이만 한다.
//
// 정답은 이 파일에 없다. 서버에만 있고 채점도 서버가 한다 —
// 브라우저에 내려가는 것은 문제와 보기뿐이다.

import { QUESTIONS, REWARD } from "./quizdata.js";
import { purse, answer, solvedCount, quizLeft } from "./wallet.js";

let host = null, ctx = null, at = null, shown = null, judged = null, busy = false;

export const left = quizLeft;

export function open(el, opts) {
  host = el; ctx = opts; at = null; shown = null; judged = null;
  paint();
  opts.talk && opts.talk("norman", quizLeft()
    ? "포인트가 부족하면 강의 내용을 확인해 보세요. 맞히면 포인트를 받을 수 있습니다."
    : "풀 수 있는 문제를 모두 풀었습니다. 이제는 의뢰를 완성해서 포인트를 벌어야 합니다.");
}

function paint() {
  const done = purse.quiz;
  const list = QUESTIONS.map(function (q, i) {
    const state = done[i] === true ? "ok" : done[i] === false ? "no" : "";
    return `<button class="qcell ${state}${at === i ? " on" : ""}" data-q="${i}"${
      done[i] !== undefined ? " disabled" : ""}>${i + 1}</button>`;
  }).join("");

  host.innerHTML = `
    <div class="shoptop"><div>
      <p class="oeyebrow">문제 풀기 · 4주차 온라인</p>
      <h1>노만 영감이 묻습니다</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
    <div class="qbody">
      <aside class="qside">
        <p class="qhead">맞힌 문제 <b>${solvedCount()}</b> / ${QUESTIONS.length}</p>
        <p class="qdim">한 문제에 <b>${REWARD}포인트</b>. 각 문제는 한 번만 답할 수 있습니다.</p>
        <div class="qgrid">${list}</div>
        <button class="flag ghost wide2" id="qback">공방으로 돌아가기</button>
      </aside>
      <section class="qmain">${at === null ? qpick() : qcard(at)}</section>
    </div>`;
}

const qpick = () => quizLeft()
  ? `<p class="qempty">왼쪽에서 문제 번호를 고르세요.<br>
     <span class="dim">아직 ${quizLeft()}문제 남았습니다 — 최대 ${quizLeft() * REWARD}포인트.</span></p>`
  : `<p class="qempty">문제를 다 풀었습니다.<br>
     <span class="dim">${solvedCount() * REWARD}포인트를 벌었습니다.</span></p>`;

function qcard(i) {
  const q = QUESTIONS[i];
  return `<p class="qno">${i + 1}번</p>
    <h2 class="qq">${q.q}</h2>
    <div class="qopts">${q.a.map(function (t, k) {
      let cls = "";
      if (judged) {
        if (k === judged.c) cls = " right";
        else if (k === shown) cls = " wrong";
      }
      return `<button class="qopt${cls}" data-a="${k}"${
        judged || busy ? " disabled" : ""}>${t}</button>`;
    }).join("")}</div>
    ${judged
      ? `<div class="qwhy ${judged.right ? "ok" : judged.right === null ? "warn" : "no"}">
           <b>${judged.right === null ? "연습 모드"
                : judged.right ? `맞혔습니다 · +${REWARD}포인트` : "틀렸습니다"}</b>
           <p>${judged.why}</p>
           <button class="flag ghost" id="qnext">${quizLeft() ? "다음 문제" : "공방으로"}</button>
         </div>`
      : ""}`;
}

document.addEventListener("click", async function (e) {
  if (!host || host.hidden) return;

  const cell = e.target.closest("[data-q]");
  if (cell) { at = Number(cell.dataset.q); shown = null; judged = null; paint(); return; }

  const opt = e.target.closest("[data-a]");
  if (opt && at !== null && !judged && !busy) {
    busy = true;
    shown = Number(opt.dataset.a);
    paint();
    try {
      const r = await answer(at, shown);
      judged = { right: r.right, why: r.why, c: r.right === true ? shown : -1 };
      ctx.talk && ctx.talk("norman", r.right === null
        ? "연습 모드입니다. 서버가 연결되면 이 자리에서 채점됩니다."
        : r.right ? "맞았습니다. 포인트를 받았습니다." : "틀렸습니다. 다시 확인해 보세요 — " + r.why);
      ctx.onChange && ctx.onChange();
    } catch (err) {
      judged = { right: false, why: String(err.message || err), c: -1 };
    }
    busy = false;
    paint();
    return;
  }

  if (e.target.closest("#qnext")) {
    let next = -1;
    for (let i = 0; i < QUESTIONS.length; i++)
      if (purse.quiz[i] === undefined) { next = i; break; }
    at = next >= 0 ? next : null;
    shown = null; judged = null;
    if (next < 0) return ctx.onBack && ctx.onBack();
    paint();
    return;
  }

  if (e.target.closest("#qback")) ctx.onBack && ctx.onBack();
});
