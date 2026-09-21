// 앱시장 — 고친 물건을 내다 파는 곳.
//
// 상인은 물건을 뜯어보고 값을 매긴다. 기준은 강의에서 쓴 말 그대로다.
// 지금은 규칙으로 값을 매긴다. 수업 전에 이 자리를 버셀 함수의
// AI 품평으로 갈아 끼울 셈이다 — 그때 바뀌는 것은 appraise() 안쪽뿐이다.

import { byId, works } from "./blocks.js";
import { purse, earn } from "./wallet.js";

const HARTSON = { sense: "감각적", cog: "인지적", phys: "물리적", limit: "제약" };

/** 물건을 훑어 값과 품평을 낸다. run 은 「처음 본 사람」이 남긴 판정. */
export function appraise(scripts, run) {
  const notes = [];
  let price = 300;

  // 붙은 것 세기
  const all = [];
  for (const [el, hats] of Object.entries(scripts || {}))
    for (const [hat, list] of Object.entries(hats || {}))
      for (const it of list || []) all.push({ ...it, el, hat });

  const astray = all.filter(a => !works(a.block, a.hat));
  const cats = new Set(all.filter(a => works(a.block, a.hat)).map(a => byId(a.block)?.cat));

  // ① 두 간극 — 값의 대부분이 여기서 갈린다
  if (run.exec === 0) { price += 350; notes.push(["good", "어디를 눌러야 할지 바로 알겠더군. 실행의 간극이 없소."]); }
  else notes.push(["bad", `손님이 ${run.exec}번 헤맸소. 실행의 간극이오 — 무엇을 해야 할지 모르는 것.`]);

  if (run.evalGap === 0) { price += 400; notes.push(["good", "누른 뒤에 어찌 됐는지 분명했소. 평가의 간극이 없소."]); }
  else notes.push(["bad", `누르고도 몰라 ${run.evalGap}건이 잘못 쌓였소. 평가의 간극이오.`]);

  // ② 주문대로 되었는가
  if (run.right === 3 && run.wrong === 0) { price += 300; notes.push(["good", "주문대로 세 줄이 정확히 남았소."]); }
  else notes.push(["bad", `주문은 세 줄인데 제대로 남은 건 ${run.right}줄이오.`]);

  // ③ 하트슨의 네 갈래를 고루 썼는가
  const covered = [...cats].filter(Boolean);
  price += covered.length * 60;
  if (covered.length >= 3)
    notes.push(["good", `${covered.map(c => HARTSON[c]).join("·")} 단서를 고루 썼소.`]);
  else if (covered.length)
    notes.push(["warn", `${covered.map(c => HARTSON[c]).join("·")} 쪽으로만 치우쳤소. 네 갈래를 고루 보시오.`]);
  else
    notes.push(["bad", "제자리에 붙은 단서가 하나도 없소. 이건 손대기 전 물건이나 매한가지요."]);

  // ④ 헛되이 붙인 것 — 자리를 잘못 잡으면 아무도 못 본다
  if (astray.length) {
    price -= astray.length * 70;
    notes.push(["bad", `제자리가 아닌 단서가 ${astray.length}개요. 값은 치렀는데 아무도 못 보오.`]);
  }

  // ⑤ 과하게 붙인 것 — 덜어낸 것이 장식이었는지 단서였는지(25쪽)의 반대쪽
  if (all.length > 14) {
    const over = all.length - 14;
    price -= over * 40;
    notes.push(["warn", `단서가 ${all.length}개면 도리어 어지럽소. 덜어낼 것도 보시오.`]);
  }

  price = Math.max(120, Math.min(1800, Math.round(price / 10) * 10));
  return { price, notes, astray: astray.length, blocks: all.length, covered };
}

/* ── 화면 ─────────────────────────────────────────────────── */

let host = null, ctx = null;

export function open(el, opts) {
  host = el; ctx = opts;
  paint();
  opts.talk?.("critic", ctx.run
    ? "물건을 봅시다. 손님이 써 본 자국이 남아 있으니 그걸로 보겠소."
    : "값을 매기려면 손님이 한 번은 써 봐야 하오. 공방으로 돌아가 「처음 본 사람」을 불러오시오.");
}

function paint() {
  if (!ctx.run) {
    host.innerHTML = `
      <div class="shoptop"><div>
        <p class="oeyebrow">앱시장</p><h1>아직 값을 매길 수 없소</h1></div>
        <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
      <div class="mkempty">
        <p>손님이 한 번도 써 보지 않은 물건은 받지 않습니다.</p>
        <p class="dim">공방으로 돌아가 <b>「처음 본 사람」</b>을 눌러 보십시오.</p>
        <button class="flag ghost" id="mkback">공방으로 돌아가기</button>
      </div>`;
    return;
  }

  const a = appraise(ctx.scripts, ctx.run);
  const sold = purse.sold.length;

  host.innerHTML = `
    <div class="shoptop"><div>
      <p class="oeyebrow">앱시장</p><h1>상인이 물건을 뜯어봅니다</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p></div>
    <div class="mkbody">
      <section class="review">
        <ul class="notes">${a.notes.map(([k, t]) =>
          `<li class="n-${k}">${t}</li>`).join("")}</ul>
      </section>
      <aside class="offer">
        <p class="opre">쳐 드릴 값</p>
        <p class="oprice">${a.price}</p>
        <p class="odim">붙인 단서 ${a.blocks}개${a.astray ? ` · 헛것 ${a.astray}개` : ""}</p>
        <button class="big" id="sell">이 값에 판다</button>
        <button class="flag ghost wide2" id="mkback">더 고치고 오겠소</button>
        ${sold ? `<p class="odim">지금까지 판 것 ${sold}개</p>` : ""}
      </aside>
    </div>`;
}

document.addEventListener("click", e => {
  if (!host || host.hidden) return;

  if (e.target.closest("#sell")) {
    const a = appraise(ctx.scripts, ctx.run);
    earn(a.price, { at: Date.now(), price: a.price, blocks: a.blocks });
    ctx.talk?.("critic", `좋소, ${a.price}포인트 드리리다. 다음 물건도 기대하겠소.`);
    ctx.onSold?.(a);
    return;
  }
  if (e.target.closest("#mkback")) ctx.onBack?.();
});
