// 앱시장 — 고친 물건을 내다 파는 곳.
//
// 상인은 물건을 뜯어보고 값을 매긴다. 기준은 강의에서 쓴 말 그대로다.
// 지금은 규칙으로 값을 매긴다. 수업 전에 이 자리를 버셀 함수의
// AI 품평으로 갈아 끼울 셈이다 — 그때 바뀌는 것은 appraise() 안쪽뿐이다.

import { recipeById } from "./parts.js";
import { allWorn } from "./app.js";
import { purse, earn } from "./wallet.js";
import { BROKER } from "./cast.js";

/** 물건을 훑어 값과 품평을 낸다. run 은 「처음 본 사람」이 남긴 판정. */
export function appraise(attached, run) {
  const notes = [];
  let price = 300;

  const worn = allWorn(attached);
  const gulfs = new Set(worn.map(w => recipeById(w.recipe)?.gulf).filter(Boolean));

  if (run.exec === 0) { price += 350; notes.push(["good", "어디를 눌러야 할지 바로 알겠더군. 실행의 간극이 없소."]); }
  else notes.push(["bad", `테스트 사용자가 ${run.exec}번 막혔소. 실행의 간극이오 — 무엇을 해야 할지 모르는 것.`]);

  if (run.evalGap === 0) { price += 400; notes.push(["good", "누른 뒤에 어찌 됐는지 분명했소. 평가의 간극이 없소."]); }
  else notes.push(["bad", `누르고도 몰라 ${run.evalGap}건이 잘못 쌓였소. 평가의 간극이오.`]);

  if (run.right === 3 && run.wrong === 0) { price += 300; notes.push(["good", "주문대로 세 줄이 정확히 남았소."]); }
  else notes.push(["bad", `주문은 세 줄인데 제대로 남은 건 ${run.right}줄이오.`]);

  if (gulfs.has("실행") && gulfs.has("평가")) {
    price += 150;
    notes.push(["good", "무엇을 할지 알리는 단서와 무슨 일이 생겼는지 알리는 단서를 둘 다 달았소."]);
  } else if (gulfs.size) {
    notes.push(["warn", `${[...gulfs].join("·")}의 간극만 손봤소. 나머지 한쪽도 보시오.`]);
  } else {
    notes.push(["bad", "붙인 단서가 하나도 없소. 손대기 전 물건이나 매한가지요."]);
  }

  if (worn.length > 12) {
    const over = worn.length - 12;
    price -= over * 40;
    notes.push(["warn", `단서가 ${worn.length}개면 도리어 어지럽소. 덜어낼 것도 보시오.`]);
  }

  const passed = run.right >= 3;
  price = Math.max(120, Math.min(1800, Math.round(price / 10) * 10));
  return { price, notes, passed, blocks: worn.length, astray: 0 };
}

/* ── 화면 ─────────────────────────────────────────────────── */

let host = null, ctx = null;

export function open(el, opts) {
  host = el; ctx = opts;
  paint();
  if (!ctx.run) return opts.talk?.("critic", BROKER.waiting);
  const a = appraise(ctx.attached, ctx.run);
  opts.talk?.("critic", a.passed ? BROKER.looking : BROKER.reject(ctx.run));
}

function paint() {
  if (!ctx.run) {
    host.innerHTML = `
      <div class="shoptop"><div>
        <p class="oeyebrow">앱시장</p><h1>아직 값을 매길 수 없소</h1></div>
        <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
      <div class="mkempty">
        <p>한 번도 테스트하지 않은 물건은 받지 않습니다.</p>
        <p class="dim">공방에서 <b>「테스트해 보기」</b>를 한 번 돌려 보고 오십시오.</p>
        <button class="flag ghost" id="mkback">공방으로 돌아가기</button>
      </div>`;
    return;
  }

  const a = appraise(ctx.attached, ctx.run);
  const sold = purse.sold.length;

  host.innerHTML = `
    <div class="shoptop"><div>
      <p class="oeyebrow">앱시장 · 출품 심사</p>
      <h1>${a.passed ? "중개인이 물건을 뜯어봅니다" : "이대로는 내놓을 수 없습니다"}</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
    <div class="mkbody">
      <section class="review">
        <ul class="notes">${a.notes.map(([k, t]) =>
          `<li class="n-${k}">${t}</li>`).join("")}</ul>
      </section>
      <aside class="offer${a.passed ? "" : " turned"}">
        ${a.passed
          ? `<p class="opre">쳐 드릴 값</p>
             <p class="oprice">${a.price}</p>
             <p class="odim">붙인 단서 ${a.blocks}개${a.astray ? ` · 헛것 ${a.astray}개` : ""}</p>
             <button class="big" id="sell">이 값에 판다</button>`
          : `<p class="opre">출품 반려</p>
             <p class="oprice bad">—</p>
             <p class="odim">테스트 사용자가 주문대로 해낸 것이
               ${ctx.run.right} / 3 줄입니다.<br>세 줄을 채워야 받습니다.</p>`}
        <button class="flag ghost wide2" id="mkback">${
          a.passed ? "더 고치고 오겠소" : "공방으로 돌아가 고친다"}</button>
        ${sold ? `<p class="odim">지금까지 판 것 ${sold}개</p>` : ""}
      </aside>
    </div>`;
}

document.addEventListener("click", e => {
  if (!host || host.hidden) return;

  if (e.target.closest("#sell")) {
    const a = appraise(ctx.attached, ctx.run);
    if (!a.passed) return;
    earn(a.price, { at: Date.now(), price: a.price, blocks: a.blocks });
    ctx.talk?.("critic", BROKER.pass(a.price));
    ctx.onSold?.(a);
    return;
  }
  if (e.target.closest("#mkback")) ctx.onBack?.();
});
