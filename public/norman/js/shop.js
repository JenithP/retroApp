// 시그니파이어 상점 — 상점 주인이 지키는 가게.
//
// 여기서 파는 것은 **재료뿐이다.** 완성된 단서는 팔지 않는다.
// 값을 세고 주머니에서 빼는 일은 서버가 한다 — 이 파일은 담고 보여 줄 뿐이다.

import { MATERIALS, RECIPES } from "./parts.js";
import { purse, countMat, priceOf, buy } from "./wallet.js";
import { demo } from "./demo.js";
import { bookHTML } from "./book.js";

const cart = {};
let host = null, onDone = null, talk = null;

export function open(el, opts) {
  host = el; onDone = opts.onDone; talk = opts.talk;
  Object.keys(cart).forEach(function (k) { delete cart[k]; });
  paint();
  talk && talk("tinker", "어서 오세요. 여기서는 완성된 단서가 아니라 재료를 팝니다. " +
    "재료 두 개를 조합하면 화면에 붙일 단서가 됩니다.");
}

const bill = () =>
  Object.keys(cart).reduce(function (s, id) { return s + priceOf(id) * cart[id]; }, 0);

function paint() {
  const lines = Object.keys(cart).filter(function (id) { return cart[id] > 0; });
  const over = bill() > purse.point;

  host.innerHTML = `
    <div class="shoptop">
      <div><p class="oeyebrow">시그니파이어 상점</p><h1>재료를 고르세요</h1></div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p>
    </div>
    <div class="shopbody">
      <div class="shelves">
        <p class="shelfnote">재료 하나만으로는 사용자가 알아볼 단서가 되지 않습니다.
          <b>두 개를 조합하면</b> 화면에 붙일 수 있는 단서가 됩니다.
          조합은 공방의 제작대에서 하며, 만들 수 있는 단서는 모두 <b>${RECIPES.length}가지</b>입니다.</p>
        <div class="goods">${MATERIALS.map(card).join("")}</div>
        ${bookHTML(false)}
      </div>
      <aside class="cart">
        <h3>장바구니</h3>
        ${lines.length
          ? `<ul>${lines.map(function (id) {
              const m = MATERIALS.find(function (x) { return x.id === id; });
              return `<li><span>${m.name}</span><em>×${cart[id]}</em>
                <b>${m.price * cart[id]}</b>
                <button class="cx" data-drop="${id}" title="뺀다">−</button></li>`;
            }).join("")}</ul>
             <p class="bill${over ? " over" : ""}">합계 <b>${bill()}</b>${
               over ? " — 포인트가 모자랍니다" : ""}</p>
             <button class="big" id="pay"${over ? " disabled" : ""}>구매하고 공방으로</button>`
          : `<p class="cartempty">아직 담은 것이 없습니다.<br>재료를 터치해 장바구니에 담으세요.</p>`}
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
        ${have ? `<em class="have">보유 ${have}</em>` : ""}
        ${inCart ? `<em class="incart">담은 수 ${inCart}</em>` : ""}</span>
    </button>`;
}

document.addEventListener("click", async function (e) {
  if (!host || host.hidden) return;

  const add = e.target.closest("[data-buy]");
  if (add) {
    const id = add.dataset.buy;
    cart[id] = (cart[id] || 0) + 1;
    if (bill() > purse.point) {
      cart[id]--;
      talk && talk("tinker", "포인트가 부족합니다. 장바구니에서 하나 빼거나 「문제 풀기」에서 포인트를 벌어 오세요.");
    }
    paint();
    return;
  }
  const drop = e.target.closest("[data-drop]");
  if (drop) {
    const id = drop.dataset.drop;
    cart[id] = Math.max(0, (cart[id] || 0) - 1);
    paint();
    return;
  }
  if (e.target.closest("#pay")) {
    const btn = e.target.closest("#pay");
    btn.disabled = true;
    try {
      const r = await buy(cart);
      Object.keys(cart).forEach(function (k) { delete cart[k]; });
      onDone && onDone({ paid: r.bill, n: r.n });
    } catch (err) {
      btn.disabled = false;
      talk && talk("tinker", String(err.message || err));
      paint();
    }
    return;
  }
  if (e.target.closest("#leave")) onDone && onDone({ paid: 0, n: 0 });
});
