// 앱시장 — 고친 물건을 내다 파는 곳.
//
// 값을 매기는 것도 받아 줄지 말지도 **서버가 정한다.** 이 파일은 물어보고
// 보여 줄 뿐이다. 그래서 화면의 숫자를 고쳐도 받는 포인트는 달라지지 않는다.

import { purse, look, sell } from "./wallet.js";
import { BROKER } from "./cast.js";

let host = null, ctx = null, seen = null, busy = false;

export async function open(el, opts) {
  host = el; ctx = opts; seen = null;
  host.innerHTML = `<div class="shoptop"><div>
      <p class="oeyebrow">앱시장 · 출품 심사</p><h1>화면을 살펴보는 중…</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>`;
  try { seen = await look(); }
  catch (e) { seen = null; }
  paint();
  if (!seen) return opts.talk && opts.talk("critic", BROKER.waiting);
  opts.talk && opts.talk("critic", seen.passed
    ? BROKER.looking
    : `이대로는 시장에 내놓기 어렵습니다. 아직 ${seen.blocked}군데에서 사용자가 막힙니다. 더 고쳐 주세요.`);
}

function paint() {
  if (!seen) {
    host.innerHTML = `
      <div class="shoptop"><div>
        <p class="oeyebrow">앱시장</p><h1>아직 값을 매길 수 없습니다</h1></div>
        <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
      <div class="mkempty">
        <p>맡은 의뢰가 없거나 아직 단서를 붙이지 않은 화면입니다.</p>
        <p class="dim">공방으로 돌아가 필요한 단서를 붙여 보세요.</p>
        <button class="flag ghost" id="mkback">공방으로 돌아가기</button>
      </div>`;
    return;
  }

  const a = seen, sold = purse.sold.length;
  host.innerHTML = `
    <div class="shoptop"><div>
      <p class="oeyebrow">앱시장 · 출품 심사</p>
      <h1>${a.passed ? "중개인이 화면을 살펴봅니다" : "이대로는 내놓을 수 없습니다"}</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
    <div class="mkbody">
      <section class="review">
        <ul class="notes">${a.notes.map(function (n) {
          return `<li class="n-${n[0]}">${n[1]}</li>`;
        }).join("")}</ul>
      </section>
      <aside class="offer${a.passed ? "" : " turned"}">
        ${a.passed
          ? `<p class="opre">제안 가격</p>
             <p class="oprice">${a.price}</p>
             <p class="odim">붙인 단서 ${a.worn}개</p>
             <button class="big" id="sell"${busy ? " disabled" : ""}>이 값에 판다</button>`
          : `<p class="opre">출품 반려</p>
             <p class="oprice bad">—</p>
             <p class="odim">아직 ${a.blocked}군데에서 막힙니다.<br>
               막히는 데가 없어야 받습니다.</p>`}
        <button class="flag ghost wide2" id="mkback">${
          a.passed ? "더 고치고 오기" : "공방으로 돌아가 고친다"}</button>
        ${sold ? `<p class="odim">지금까지 완료한 의뢰 ${sold}개</p>` : ""}
      </aside>
    </div>`;
}

document.addEventListener("click", async function (e) {
  if (!host || host.hidden) return;

  if (e.target.closest("#sell") && !busy) {
    busy = true; paint();
    try {
      const r = await sell();
      if (r.refused) {
        seen = r.appraisal; busy = false; paint();
        ctx.talk && ctx.talk("critic", "이대로는 시장에 내놓기 어렵습니다. 더 고쳐 주세요.");
        return;
      }
      busy = false;
      ctx.talk && ctx.talk("critic", BROKER.pass(r.appraisal.price));
      ctx.onSold && ctx.onSold(r.appraisal);
    } catch (err) {
      busy = false; paint();
      ctx.talk && ctx.talk("critic", String(err.message || err));
    }
    return;
  }
  if (e.target.closest("#mkback")) ctx.onBack && ctx.onBack();
});
