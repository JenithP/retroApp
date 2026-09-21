// 상점 카드의 축소판 — 재료가 어떻게 생긴 것인지 보여 준다.
//
// 그림 파일을 쓰지 않는다. 실제 효과와 어긋날 수 있고, 재료를 고치면
// 그림도 같이 고쳐야 하기 때문이다. 물건에 쓰는 모양을 그대로 줄여 놓았다.

const SHOW = {
  glyph: `<span class="d-glyph">무게</span>`,
  icon:  `<svg class="d-ico" viewBox="0 0 18 18"><path d="M4 6h10l1 8H3z M6 6a3 3 0 0 1 6 0"/></svg>`,
  frame: `<span class="d-frame"></span>`,
  blink: `<span class="d-blink"></span>`,
  tint:  `<span class="d-tint"></span>`,
  grow:  `<span class="d-grow"><i></i><b></b></span>`,
  slip:  `<span class="d-slip">저장됐어요</span>`,
  tick:  `<svg class="d-tick" viewBox="0 0 18 18"><path d="M3 9l4 4 8-9"/></svg>`,
  arrow: `<svg class="d-arrow" viewBox="0 0 18 18"><path d="M3 9h11 M10 5l4 4-4 4"/></svg>`,
  sound: `<span class="d-sound">♪<i></i><i></i></span>`,
  shake: `<span class="d-shake"></span>`,
  notch: `<span class="d-notch"></span>`,
  shade: `<span class="d-shade"></span>`,
  line:  `<span class="d-line"></span>`,
};

export function demo(id) {
  const s = SHOW[id];
  return s ? `<span class="demo" aria-hidden="true">${s}</span>` : "";
}
