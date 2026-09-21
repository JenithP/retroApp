// 상점 카드에 들어가는 축소판 — 「붙이기 전 → 붙인 뒤」.
//
// 그림을 그려 넣지 않는다. 실제 효과와 어긋날 수 있고, 연장을 고칠 때마다
// 그림도 같이 고쳐야 하기 때문이다. 대신 물건에 쓰는 것과 같은 모양을
// 작게 줄여 보여 준다. 움직이는 단서는 여기서도 움직인다.

import { ICONS } from "./blocks.js";

const box = (cls = "", inner = "") => `<i class="mb ${cls}">${inner}</i>`;
const ico = k => `<svg viewBox="0 0 18 18"><path d="${ICONS[k]}"/></svg>`;

/** 왼쪽은 언제나 손대기 전 모습. 오른쪽만 달라진다. */
const PAIR = {
  label:  [box(), `<span class="ml">무게</span>${box()}`],
  icon:   [box(), box("", ico("weight"))],
  unit:   [box("", "60"), box("", "60 kg")],
  hint:   [box(), `${box()}<span class="mh">양옆을 눌러 조절</span>`],
  status: [box(), `${box()}<span class="ms">3세트 기록됨</span>`],
  toast:  [box(), `${box()}<span class="mt">기록됐어요</span>`],

  strong: [box(), box("m-strong")],
  big:    [box(), box("m-big")],
  glow:   [box(), box("m-glow")],
  check:  [box(), `${box()}<span class="mc">✓</span>`],
  buzz:   [box(), `<span class="mz">${box("m-shake")}<b>♪</b></span>`],

  wide:   [box("m-narrow"), box("m-wide")],
  press:  [box(), box("m-press")],
  grip:   [box(), box("m-grip")],

  lock:   [box(), box("m-lock")],
};

export function demo(id) {
  const p = PAIR[id];
  if (!p) return "";
  return `<span class="demo" aria-hidden="true">
      <span class="dp">${p[0]}</span>
      <span class="darr">→</span>
      <span class="dp on">${p[1]}</span>
    </span>`;
}
