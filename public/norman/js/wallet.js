// 주머니 — 포인트와 사 둔 연장.
//
// 지금은 이 화면 안에서만 셈을 한다. 성적이 걸리는 판에서는
// 개발자도구로 고칠 수 있으므로, 수업 전에 거래를 버셀 함수로 옮긴다.
// 그때 바뀌는 것은 buy() 안쪽뿐이고 부르는 쪽은 그대로다.

import { BLOCKS, byId } from "./blocks.js";

export const START = 1000;

/** 연장 값. 오래 보이는 것일수록, 여러 곳에 쓰이는 것일수록 비싸다. */
export const PRICE = {
  label: 60, icon: 50, unit: 40, hint: 70, status: 110, toast: 90,
  strong: 50, big: 40, glow: 60, check: 80, buzz: 70,
  wide: 60, press: 70, grip: 80,
  lock: 50,
};

export const priceOf = id => PRICE[id] ?? 60;

export const purse = {
  point: START,
  own: {},          // { 연장 이름: 남은 개수 }
  sold: [],         // 앱시장에 판 기록
  quiz: {},         // 푼 문제 — 번호: 맞혔나
};

export const countOwn = id => purse.own[id] || 0;
export const totalOwn = () =>
  Object.values(purse.own).reduce((a, b) => a + b, 0);

/** 지금까지 연장에 쓴 돈 — 처음 자본에서 남은 것을 뺀 값이 아니라
 *  실제로 산 값의 합. 판 돈이 들어와도 흔들리지 않게 따로 센다. */
export let spent = 0;

/** 장바구니를 한 번에 계산한다. 돌려주는 값 — 모자라면 null. */
export function buy(cart) {
  const bill = Object.entries(cart)
    .reduce((sum, [id, n]) => sum + priceOf(id) * n, 0);
  if (bill > purse.point) return null;
  purse.point -= bill;
  spent += bill;
  for (const [id, n] of Object.entries(cart)) {
    if (n > 0) purse.own[id] = countOwn(id) + n;
  }
  return bill;
}

/** 붙일 때 하나 꺼내 쓴다. 없으면 붙지 않는다. */
export function take(id) {
  if (countOwn(id) <= 0) return false;
  purse.own[id]--;
  return true;
}

/** 빼내면 도로 주머니에 들어온다 — 자리를 잘못 잡았다고 돈을 버리게 하지 않는다. */
export function give(id) {
  purse.own[id] = countOwn(id) + 1;
}

/** 품삯처럼 그냥 들어오는 돈 — 판 기록에는 남기지 않는다. */
export function gain(amount) { purse.point += amount; }

/** 물건을 팔아 돈을 받는다. */
export function earn(amount, row) {
  purse.point += amount;
  purse.sold.push(row);
}

/* ── 담아 두기 ────────────────────────────────────────────── */

export function dump() {
  return { point: purse.point, own: purse.own, sold: purse.sold, quiz: purse.quiz, spent };
}

export function load(d) {
  if (!d || typeof d !== "object") return;
  if (Number.isFinite(d.point)) purse.point = d.point;
  if (d.own && typeof d.own === "object") purse.own = { ...d.own };
  if (Array.isArray(d.sold)) purse.sold = d.sold;
  if (d.quiz && typeof d.quiz === "object") purse.quiz = { ...d.quiz };
  if (Number.isFinite(d.spent)) spent = d.spent;
}

/** 자리에 붙어 있는 것까지 합쳐 「가진 연장」을 센다 — 상점에서 보여 줄 때 쓴다. */
export function placedCount(scripts) {
  const n = {};
  for (const el of Object.values(scripts || {}))
    for (const list of Object.values(el || {}))
      for (const it of list || []) n[it.block] = (n[it.block] || 0) + 1;
  return n;
}

export const CATALOG = BLOCKS.map(b => ({ ...b, price: priceOf(b.id) }));
export { byId };
