// 시그니파이어 상점 — 연장 장수가 지키는 가게.
//
// 공방에는 사 온 것만 놓인다. 그래서 「무엇이 필요한가」를 먼저 생각하게 된다.
// 여기서 파는 것은 전부 단서다. 어포던스는 팔지 않는다 — 이미 물건에 들어 있으니까.

import { CATS } from "./blocks.js";
import { demo } from "./demo.js";
import { CATALOG, purse, countOwn, priceOf, buy } from "./wallet.js";

const cart = {};
let host = null, onDone = null, talk = null;

export function open(el, opts) {
  host = el; onDone = opts.onDone; talk = opts.talk;
  for (const k of Object.keys(cart)) delete cart[k];
  paint();
  talk?.("tinker", "어서 오시오. 뭐가 필요한지는 정하고 왔소? " +
    "여기 있는 건 죄 단서요 — 알려 주는 물건 말이오.");
}

const bill = () =>
  Object.entries(cart).reduce((s, [id, n]) => s + priceOf(id) * n, 0);

function paint() {
  const groups = Object.keys(CATS).map(cat => {
    const items = CATALOG.filter(b => b.cat === cat);
    return `<section class="shelf">
      <h3 class="c-${cat}"><i></i>${CATS[cat].name}<small>${CATS[cat].desc}</small></h3>
      <div class="goods">${items.map(card).join("")}</div>
    </section>`;
  }).join("");

  const lines = Object.entries(cart).filter(([, n]) => n > 0);
  const over = bill() > purse.point;

  host.innerHTML = `
    <div class="shoptop">
      <div>
        <p class="oeyebrow">시그니파이어 상점</p>
        <h1>무엇을 사 가시려오</h1>
      </div>
      <p class="purse">남은 포인트 <b>${purse.point}</b></p>
    </div>
    <div class="shopbody">
      <div class="shelves">${groups}</div>
      <aside class="cart">
        <h3>장바구니</h3>
        ${lines.length
          ? `<ul>${lines.map(([id, n]) => {
              const b = CATALOG.find(x => x.id === id);
              return `<li><span>${b.name}</span><em>×${n}</em>
                <b>${b.price * n}</b>
                <button class="cx" data-drop="${id}" title="뺀다">−</button></li>`;
            }).join("")}</ul>
             <p class="bill${over ? " over" : ""}">
               합계 <b>${bill()}</b>${over ? " — 포인트가 모자랍니다" : ""}</p>
             <button class="big" id="pay"${over ? " disabled" : ""}>계산하고 공방으로</button>`
          : `<p class="cartempty">아직 담은 것이 없습니다.<br>
             연장을 눌러 담으십시오.</p>`}
        <button class="flag ghost wide2" id="leave">그냥 공방으로 돌아가기</button>
      </aside>
    </div>`;
}

function card(b) {
  const have = countOwn(b.id);
  const inCart = cart[b.id] || 0;
  return `<button class="good c-${b.cat}" data-buy="${b.id}">
      <span class="gname">${b.name}</span>
      ${demo(b.id)}
      <span class="gtip">${b.tip}</span>
      <span class="gfoot">
        <b>${b.price}</b>
        ${have ? `<em class="have">가진 것 ${have}</em>` : ""}
        ${inCart ? `<em class="incart">담음 ${inCart}</em>` : ""}
      </span>
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
      talk?.("tinker", "포인트가 모자라오. 하나 빼든지, 위에 「문제 풀기」에 들렀다 오시오.");
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
    const paid = buy(cart);
    if (paid == null) return;
    const n = Object.values(cart).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(cart)) delete cart[k];
    onDone?.({ paid, n });
    return;
  }

  if (e.target.closest("#leave")) onDone?.({ paid: 0, n: 0 });
});
