// 주머니 — 포인트, 사 둔 재료, 만들어 둔 연장.
//
// 지금은 이 화면 안에서만 셈을 한다. 성적이 걸리는 판이므로
// 수업 전에 거래를 버셀 함수로 옮긴다. 그때 바뀌는 것은 이 파일 안쪽뿐이다.

import { MATERIALS, mat } from "./parts.js";

export const START = 1000;

export const purse = {
  point: START,
  mats:  {},        // 재료 이름: 남은 개수
  tools: [],        // 만들어 둔 연장 [{recipe, arg}]
  sold:  [],        // 앱시장에 판 기록
  quiz:  {},        // 푼 문제
  done:  [],        // 마친 의뢰
};

export const priceOf = id => mat(id)?.price ?? 40;
export const countMat = id => purse.mats[id] || 0;

/** 장바구니를 한 번에 계산한다. 모자라면 null. */
export function buyMats(cart) {
  const bill = Object.entries(cart).reduce((s, [id, n]) => s + priceOf(id) * n, 0);
  if (bill > purse.point) return null;
  purse.point -= bill;
  for (const [id, n] of Object.entries(cart))
    if (n > 0) purse.mats[id] = countMat(id) + n;
  return bill;
}

/** 제작대에 올릴 때 하나 꺼낸다. */
export function takeMat(id) {
  if (countMat(id) <= 0) return false;
  purse.mats[id]--;
  return true;
}

/** 내릴 때 도로 들어온다 — 잘못 올렸다고 돈을 버리게 하지 않는다. */
export function giveMat(id) { purse.mats[id] = countMat(id) + 1; }

export function gain(amount) { purse.point += amount; }

export function earn(amount, row) {
  purse.point += amount;
  purse.sold.push(row);
}

/* ── 담아 두기 ────────────────────────────────────────────── */

export function dump() {
  return { point: purse.point, mats: purse.mats, tools: purse.tools,
           sold: purse.sold, quiz: purse.quiz, done: purse.done };
}

export function load(d) {
  if (!d || typeof d !== "object") return;
  if (Number.isFinite(d.point)) purse.point = d.point;
  if (d.mats && typeof d.mats === "object") purse.mats = { ...d.mats };
  if (Array.isArray(d.tools)) purse.tools = d.tools;
  if (Array.isArray(d.sold))  purse.sold = d.sold;
  if (d.quiz && typeof d.quiz === "object") purse.quiz = { ...d.quiz };
  if (Array.isArray(d.done))  purse.done = d.done;
}

export const CATALOG = MATERIALS;
