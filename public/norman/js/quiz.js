// 문제 풀기 — 노만 영감이 내는 품삯 일감.
//
// 포인트가 모자라면 여기서 번다. 벌이가 되는 길을 전부 강의 내용으로
// 통과시켜 두는 것이 중요하다. 그러지 않으면 조는 어포던스를 잊고
// 돈놀이만 한다. 여기·상점·앱시장 셋 말고 돈이 들어오는 문은 없다.
//
// 문항은 4주차 온라인 강의에서 그대로 가져왔다.

import { purse, gain } from "./wallet.js";

export const REWARD = 40;

export const QUESTIONS = [
  { q: "어포던스라는 개념을 처음 내놓은 사람은?",
    a: ["제임스 깁슨", "도널드 노먼", "윌리엄 개버", "렉스 하트슨"], c: 0,
    why: "지각심리학자 깁슨이 1977년에 제안했습니다. 노먼은 1988년에 HCI로 가져왔습니다." },

  { q: "어포던스는 어디에 있습니까?",
    a: ["사물의 속성 안에", "사람의 머릿속에", "사물과 행위자의 관계 속에", "디자이너의 의도 안에"], c: 2,
    why: "「어포던스는 사물에도, 머릿속에도 없다. 둘 사이의 관계에 있다」 — 깁슨(1979)." },

  { q: "열린 창문은 도둑에게 기어오를 가능성을 줍니다. 키가 작은 아이에게는?",
    a: ["똑같은 어포던스를 준다", "아무런 어포던스도 주지 않는다",
        "시그니파이어만 준다", "거짓 어포던스를 준다"], c: 1,
    why: "창문의 물리적 속성은 같습니다. 어포던스는 행동 능력이 있어야 성립합니다." },

  { q: "노먼이 2008년 글에서 한 말은?",
    a: ["어포던스, 시그니파이어가 아니다", "시그니파이어, 어포던스가 아니다",
        "어포던스는 추가할 수 있다", "지각된 어포던스가 전부다"], c: 1,
    why: "제목이 곧 요지였습니다 — 「Signifiers, not affordances.」" },

  { q: "「이 버튼에 어포던스를 추가했다」는 말이 틀린 이유는?",
    a: ["버튼에는 어포던스가 없어서", "어포던스는 이미 있는 것이라 더할 수 없어서",
        "버튼은 시그니파이어라서", "추가한 것은 제약이라서"], c: 1,
    why: "어포던스는 이미 존재합니다. 디자이너가 더하는 것은 그것을 알리는 단서 — 시그니파이어입니다." },

  { q: "처음 보는 문 앞에서 밀지 당길지 모르겠습니다. 어느 간극입니까?",
    a: ["실행의 간극", "평가의 간극", "둘 다 아니다", "둘 다 맞다"], c: 0,
    why: "무엇을 해야 할지 모르는 것이 실행의 간극입니다." },

  { q: "엘리베이터 닫힘 버튼을 눌렀는데 반응이 없어 자꾸 누릅니다. 어느 간극입니까?",
    a: ["실행의 간극", "평가의 간극", "문화적 제약", "거짓 어포던스"], c: 1,
    why: "무슨 일이 일어났는지 알 수 없는 것이 평가의 간극입니다. 입력이 받아들여졌다는 단서가 없어서입니다." },

  { q: "평가의 간극을 줄이는 것은?",
    a: ["시그니파이어", "피드백", "물리적 제약", "어포던스"], c: 1,
    why: "실행의 간극은 시그니파이어와 제약으로, 평가의 간극은 피드백으로 줄입니다." },

  { q: "개버(1991)의 구분에서 「할 수 있는데 알리는 단서가 없는」 경우는?",
    a: ["지각 가능한 어포던스", "숨은 어포던스", "거짓 어포던스", "지각된 어포던스"], c: 1,
    why: "할 수 있는데 단서가 없으면 숨은 어포던스입니다. 있는 줄 모르니 쓰이지 못합니다." },

  { q: "눌릴 것처럼 생겼는데 실제로는 눌리지 않는 것은?",
    a: ["숨은 어포던스", "거짓 어포던스", "물리적 제약", "지각 가능한 어포던스"], c: 1,
    why: "단서는 있는데 할 수 없는 경우 — 거짓 어포던스입니다." },

  { q: "하트슨(2003)의 넷 가운데 「글자가 배경과 충분히 구별되는가」는?",
    a: ["물리적", "감각적", "인지적", "기능적"], c: 1,
    why: "알아볼 수 있게 해 주는 것이 감각적 어포던스입니다." },

  { q: "하트슨의 넷 가운데 「눌렀을 때 실제로 보내지는가」는?",
    a: ["물리적", "감각적", "인지적", "기능적"], c: 3,
    why: "그 행동이 목적에 닿는가 — 기능적 어포던스입니다." },

  { q: "USB 단자가 뒤집으면 들어가지 않는 것은 어떤 제약입니까?",
    a: ["물리적 제약", "의미적 제약", "문화적 제약", "논리적 제약"], c: 0,
    why: "모양이 맞지 않으면 아예 못 넣게 막는 것 — 물리적 제약입니다." },

  { q: "빨강은 멈춤, 클립 모양은 첨부. 이것은 어떤 제약입니까?",
    a: ["물리적 제약", "의미·문화적 제약", "논리적 제약", "제약이 아니다"], c: 1,
    why: "배워서 아는 약속입니다. 문화와 시대에 매여 있어 처음 본 사람은 모릅니다." },

  { q: "iOS 7 이후 플랫 디자인 논쟁의 핵심은?",
    a: ["색이 너무 화려해졌다", "덜어낸 것이 장식이었는지 시그니파이어였는지",
        "어포던스가 사라졌다", "제약이 너무 많아졌다"], c: 1,
    why: "장식을 걷어내 깔끔해졌지만, 무엇이 눌리는지 알기 어려워졌습니다." },

  { q: "노먼이 1988년에 쓴 「지각된 어포던스」는 지금 어떻게 되었습니까?",
    a: ["그대로 쓰인다", "본인이 철회했다", "깁슨이 이어받았다", "제약으로 이름이 바뀌었다"], c: 1,
    why: "노먼 본인이 용어를 철회하고, 2013년 개정판에서 깁슨의 정의로 돌아갔습니다." },
];

/* ── 화면 ─────────────────────────────────────────────────── */

let host = null, ctx = null, at = null, shown = null;

const doneMap = () => (purse.quiz ||= {});
export const solved = () => Object.values(doneMap()).filter(v => v === true).length;
export const attempted = () => Object.keys(doneMap()).length;
export const left = () => QUESTIONS.length - attempted();

export function open(el, opts) {
  host = el; ctx = opts; at = null; shown = null;
  paint();
  opts.talk?.("norman", left()
    ? "포인트가 모자라나? 그러면 배운 걸 대 보게. 맞히면 품삯을 주지."
    : "물어볼 건 다 물어봤네. 이제는 만들어서 버는 수밖에 없어.");
}

function paint() {
  const done = doneMap();
  const list = QUESTIONS.map((q, i) => {
    const state = done[i] === true ? "ok" : done[i] === false ? "no" : "";
    return `<button class="qcell ${state}${at === i ? " on" : ""}" data-q="${i}"
      ${done[i] !== undefined ? "disabled" : ""}>${i + 1}</button>`;
  }).join("");

  host.innerHTML = `
    <div class="shoptop"><div>
      <p class="oeyebrow">문제 풀기 · 4주차 온라인</p>
      <h1>노만 영감이 묻습니다</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
    <div class="qbody">
      <aside class="qside">
        <p class="qhead">맞힌 문제 <b>${solved()}</b> / ${QUESTIONS.length}</p>
        <p class="qdim">한 문제에 <b>${REWARD}포인트</b>. 한 번만 답할 수 있습니다.</p>
        <div class="qgrid">${list}</div>
        <button class="flag ghost wide2" id="qback">공방으로 돌아가기</button>
      </aside>
      <section class="qmain">${at === null ? qpick() : qcard(at)}</section>
    </div>`;
}

const qpick = () => left()
  ? `<p class="qempty">왼쪽에서 번호를 고르십시오.<br>
     <span class="dim">아직 ${left()}문제 남았습니다 — 최대 ${left() * REWARD}포인트.</span></p>`
  : `<p class="qempty">문제를 다 풀었습니다.<br>
     <span class="dim">${solved() * REWARD}포인트를 벌었습니다.</span></p>`;

function qcard(i) {
  const q = QUESTIONS[i];
  const done = doneMap()[i];
  return `<p class="qno">${i + 1}번</p>
    <h2 class="qq">${q.q}</h2>
    <div class="qopts">${q.a.map((t, k) => {
      let cls = "";
      if (shown !== null) {
        if (k === q.c) cls = " right";
        else if (k === shown) cls = " wrong";
      }
      return `<button class="qopt${cls}" data-a="${k}"
        ${shown !== null ? "disabled" : ""}>${t}</button>`;
    }).join("")}</div>
    ${shown !== null
      ? `<div class="qwhy ${done ? "ok" : "no"}">
           <b>${done ? `맞혔습니다 · +${REWARD}포인트` : "틀렸습니다"}</b>
           <p>${q.why}</p>
           <button class="flag ghost" id="qnext">${left() ? "다음 문제" : "공방으로"}</button>
         </div>`
      : ""}`;
}

document.addEventListener("click", e => {
  if (!host || host.hidden) return;

  const cell = e.target.closest("[data-q]");
  if (cell) { at = Number(cell.dataset.q); shown = null; paint(); return; }

  const opt = e.target.closest("[data-a]");
  if (opt && at !== null && shown === null) {
    const k = Number(opt.dataset.a);
    const right = k === QUESTIONS[at].c;
    shown = k;
    doneMap()[at] = right;
    if (right) gain(REWARD);
    ctx.talk?.("norman", right
      ? "옳지. 품삯일세."
      : "아닐세. 다시 새겨 두게 — " + QUESTIONS[at].why);
    ctx.onChange?.();
    paint();
    return;
  }

  if (e.target.closest("#qnext")) {
    const next = QUESTIONS.findIndex((_, i) => doneMap()[i] === undefined);
    at = next >= 0 ? next : null;
    shown = null;
    if (next < 0) return ctx.onBack?.();
    paint();
    return;
  }

  if (e.target.closest("#qback")) ctx.onBack?.();
});
