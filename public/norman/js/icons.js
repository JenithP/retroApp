// 작은 그림들. 「그림」 재료를 고를 때 쓰고, 화살표는 안내 단서가 쓴다.
export const ICONS = {
  save:   "M3 3h10l2 2v9H3z M6 3v4h5V3 M6 10h6v4H6z",
  weight: "M4 6h10l1 8H3z M6 6a3 3 0 0 1 6 0",
  rep:    "M4 7a5 5 0 0 1 9-2 M14 11a5 5 0 0 1-9 2 M13 2v4h-4 M5 16v-4h4",
  clock:  "M9 4v5l3 2 M9 1a8 8 0 1 0 0 16A8 8 0 0 0 9 1z",
  pencil: "M3 13l8-8 3 3-8 8H3z",
  list:   "M3 5h12 M3 9h12 M3 13h8",
  check:  "M3 9l4 4 8-9",
  arrow:  "M3 9h11 M10 5l4 4-4 4",
};

export const ICON_NAMES = {
  save: "저장", weight: "아령", rep: "반복", clock: "시계",
  pencil: "연필", list: "목록", check: "체크", arrow: "화살표",
};

export function svgOf(path, cls) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 18 18");
  s.setAttribute("aria-hidden", "true");
  if (cls) s.setAttribute("class", cls);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  s.appendChild(p);
  return s;
}
