// 시그니파이어 상점 — 연장 장수가 지키는 가게.
//
// 여기서 파는 것은 **재료뿐이다.** 완성된 단서는 팔지 않는다.
// 글자·테두리·깜박임 따위는 그 자체로 아무것도 알리지 못하고,
// 둘을 합쳐야 비로소 연장이 된다. 합치는 일은 공방 제작대에서 한다.

import { MATERIALS, RECIPES } from "./parts.js";
import { purse, countMat, priceOf, buyMats } from "./wallet.js";
import { demo } from "./demo.js";
import { bookHTML } from "./book.js";

const cart = {};
let host = null, onDone = null, talk = null;

export function open(el, opts) {
  host = el; onDone = opts.onDone; talk = opts.talk;
  for (const k of Object.keys(cart)) delete cart[k];
  paint();
  talk?.("tinker", "어서 오시오. 여기 있는 건 죄 재료요. " +
    "혼자서는 아무것도 못 알리지 — 둘을 합쳐야 연장이 되오.");
}

const bill = () =>
  Object.entries(cart).reduce((s, [id, n]) => s + priceOf(id) * n, 0);

function paint() {
  const lines = Object.entries(cart).filter(([, n]) => n > 0);
  const over = bill() > purse.point;

  host.innerHTML = `
    <div class="shoptop">
      <div><p class="oeyebrow">시그니파이어 상점</p><h1>재료를 고르십시오</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p>
    </div>
    <div class="shopbody">
      <div class="shelves">
        <p class="shelfnote">재료 하나로는 아무것도 알리지 못합니다.
          <b>둘을 합쳐야</b> 연장이 됩니다 — 합치는 일은 공방 제작대에서.
          지금 만들 수 있는 연장은 모두 <b>${RECIPES.length}가지</b>입니다.</p>
        <div class="goods">${MATERIALS.map(card).join("")}</div>
        ${bookHTML(false)}
      </div>
      <aside class="cart">
        <h3>장바구니</h3>
        ${lines.length
          ? `<ul>${lines.map(([id, n]) => {
              const m = MATERIALS.find(x => x.id === id);
              return `<li><span>${m.name}</span><em>×${n}</em><b>${m.price * n}</b>
                <button class="cx" data-drop="${id}" title="뺀다">−</button></li>`;
            }).join("")}</ul>
             <p class="bill${over ? " over" : ""}">합계 <b>${bill()}</b>${
               over ? " — 포인트가 모자랍니다" : ""}</p>
             <button class="big" id="pay"${over ? " disabled" : ""}>계산하고 공방으로</button>`
          : `<p class="cartempty">아직 담은 것이 없습니다.<br>재료를 눌러 담으십시오.</p>`}
        <button class="flag ghost wide2" id="leave">그냥 공방으로 돌아가기</button>
      </aside>
    </div>`;
}

function card(m) {
  const have = countMat(m.id), inCart = cart[m.id] || 0;
  return `<button class="good c-mat" data-buy="${m.id}">
      <span class="gname">${m.name}</span>
      ${demo(m.id)}
      <span class="gtip">${m.tip}</span>
      <span class="gfoot"><b>${m.price}</b>
        ${have ? `<em class="have">가진 것 ${have}</em>` : ""}
        ${inCart ? `<em class="incart">담음 ${inCart}</em>` : ""}</span>
    </button>`;
}

document.addEventListener("click", e => {
  if (!host || host.hidden) return;

  const add = e.target.closest("[data-buy]");
  if (add) {
    const id = add.dataset.buy;
    cart[id] = (cart[id] || 0) + 1;
    if (bill() > purse.point) {
      cart[id]--;
      talk?.("tinker", "포인트가 모자라오. 하나 빼든지, 「문제 풀기」에 들렀다 오시오.");
    }
    paint();
    return;
  }
  const drop = e.target.closest("[data-drop]");
  if (drop) {
    cart[drop.dataset.drop] = Math.max(0, (cart[drop.dataset.drop] || 0) - 1);
    paint();
    return;
  }
  if (e.target.closest("#pay")) {
    const paid = buyMats(cart);
    if (paid == null) return;
    const n = Object.values(cart).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(cart)) delete cart[k];
    onDone?.({ paid, n });
    return;
  }
  if (e.target.closest("#leave")) onDone?.({ paid: 0, n: 0 });
});
