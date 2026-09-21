// 재료와 조합표.
//
// 상점에서는 **완성된 단서를 팔지 않는다.** 재료만 판다.
// 글자·테두리·깜박임 같은 것들이고, 그 자체로는 아무것도 알리지 못한다.
// 둘을 합쳐야 비로소 단서가 된다 — 테두리 + 깜박임 = 커서 깜박이는 입력칸.
//
// 언제 보이는지(when)는 조가 고르는 것이 아니라 **만든 단서가 정한다.**
// 깜박이는 커서는 늘 보이는 것이고, 알림 쪽지는 누른 뒤에만 뜬다.
// 그래서 무엇을 만들지 고르는 일이 곧 어느 간극을 메울지 고르는 일이 된다.

export const MATERIALS = [
  { id: "glyph", name: "글자",     price: 40, arg: { kind: "text", ph: "넣을 글자", max: 12 },
    tip: "입력한 말을 화면에 붙입니다" },
  { id: "icon",  name: "그림",     price: 40, arg: { kind: "icon" },
    tip: "아이콘으로 의미를 보여줍니다" },
  { id: "frame", name: "테두리",   price: 30, tip: "입력칸이나 영역의 경계를 보여줍니다" },
  { id: "blink", name: "깜박임",   price: 40, tip: "눈에 띄도록 반복해서 깜박입니다" },
  { id: "tint",  name: "진한 색",  price: 30, tip: "중요한 부분을 진한 색으로 강조합니다" },
  { id: "grow",  name: "큰 크기",  price: 30, tip: "더 크고 누르기 쉬워 보이게 만듭니다" },
  { id: "slip",  name: "쪽지",     price: 50, tip: "잠깐 나타나는 안내 메시지입니다" },
  { id: "tick",  name: "체크 표시", price: 40, tip: "완료나 선택을 ✓로 보여줍니다" },
  { id: "arrow", name: "화살표",   price: 30, tip: "봐야 할 곳을 가리킵니다" },
  { id: "sound", name: "소리",     price: 40, tip: "조작이 받아들여졌음을 소리로 알립니다" },
  { id: "shake", name: "떨림",     price: 30, tip: "짧은 진동으로 반응을 줍니다" },
  { id: "notch", name: "홈",       price: 30, tip: "잡거나 밀 수 있는 느낌을 줍니다" },
  { id: "shade", name: "그늘",     price: 30, tip: "눌린 듯한 깊이를 만듭니다" },
  { id: "line",  name: "밑줄",     price: 20, tip: "글자나 숫자 아래에 기준선을 긋습니다" },
];

export const mat = id => MATERIALS.find(m => m.id === id);

/* ── 조합표 ───────────────────────────────────────────────────
   when — 언제 보이는가. idle 늘 · touch 닿는 동안 · after 하고 난 뒤
   on   — 어떤 부품에 붙는가. input 쓰는 칸 · button 누르는 곳 · list 목록
   gulf — 어느 간극을 메우는가. 앱시장 품평이 이것으로 값을 매긴다.          */

export const RECIPES = [
  { a: "frame", b: "blink", id: "caret", name: "깜박이는 입력칸",
    when: "idle", on: ["input"], gulf: "실행",
    line: "입력할 수 있는 칸임을 보여줍니다" },

  { a: "glyph", b: "frame", id: "label", name: "라벨 붙은 요소",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "이 요소의 이름과 역할을 글자로 알려줍니다" },

  { a: "glyph", b: "tint", id: "bold", name: "강조된 글자",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "중요한 글자나 항목을 더 눈에 띄게 만듭니다" },

  { a: "icon", b: "frame", id: "iconbtn", name: "아이콘 단서",
    when: "idle", on: ["button"], gulf: "실행",
    line: "아이콘으로 무엇을 하는 곳인지 알려줍니다" },

  { a: "tint", b: "grow", id: "bigbtn", name: "크고 진한 버튼",
    when: "idle", on: ["button"], gulf: "실행",
    line: "크기와 색으로 누를 수 있는 곳임을 보여줍니다" },

  { a: "glyph", b: "arrow", id: "guide", name: "가리키는 안내",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "봐야 할 곳을 글자와 화살표로 짚어 줍니다" },

  { a: "glyph", b: "line", id: "unit", name: "단위 글자",
    when: "idle", on: ["input"], gulf: "실행",
    line: "숫자가 금액인지 횟수인지처럼 단위를 알려줍니다" },

  { a: "notch", b: "frame", id: "grip", name: "드래그 손잡이",
    when: "idle", on: ["list"], gulf: "실행",
    line: "밀거나 끌 수 있는 부분임을 보여줍니다" },

  { a: "blink", b: "tint", id: "hot", name: "터치 강조",
    when: "touch", on: ["input", "button"], gulf: "실행",
    line: "손이 닿으면 색이 바뀌어 지금 만지는 곳을 보여줍니다" },

  { a: "shade", b: "frame", id: "press", name: "눌림 반응",
    when: "touch", on: ["button"], gulf: "실행",
    line: "누르는 동안 눌린 느낌을 보여줍니다" },

  { a: "glyph", b: "slip", id: "toast", name: "알림 쪽지",
    when: "after", on: ["input", "button", "list"], gulf: "평가",
    line: "조작 후 결과를 짧은 메시지로 알려줍니다" },

  { a: "tick", b: "blink", id: "done", name: "완료 표시",
    when: "after", on: ["input", "button"], gulf: "평가",
    line: "작업 완료를 ✓ 표시로 알려줍니다" },

  { a: "sound", b: "shake", id: "feel", name: "손끝 알림",
    when: "after", on: ["button"], gulf: "평가",
    line: "소리와 떨림으로 조작이 받아들여졌음을 알려줍니다" },

  { a: "icon", b: "tint", id: "state", name: "상태 표시",
    when: "idle", on: ["list", "input"], gulf: "평가",
    line: "현재 상태를 그림과 글자로 계속 보여줍니다" },
];

/** 두 재료로 무엇이 되는가. 순서는 상관없다. */
export function combine(x, y) {
  return RECIPES.find(r =>
    (r.a === x && r.b === y) || (r.a === y && r.b === x)) || null;
}

export const recipeById = id => RECIPES.find(r => r.id === id);

/** 아직 안 나온 조합이 몇 가지 남았는지 — 제작대에 보여 준다. */
export const RECIPE_COUNT = RECIPES.length;

/** 붙지 않는 짝에 노만이 하는 말. 힌트를 조금만 준다. */
export function rebuff(x, y) {
  const nx = mat(x)?.name, ny = mat(y)?.name;
  const near = RECIPES.filter(r => r.a === x || r.b === x || r.a === y || r.b === y);
  if (!near.length) return `${nx}와 ${ny}로는 만들 수 있는 단서가 없습니다.`;
  const hint = near[0];
  const other = mat(hint.a === x || hint.b === x
    ? (hint.a === x ? hint.b : hint.a)
    : (hint.a === y ? hint.b : hint.a))?.name;
  return `${nx}와 ${ny}는 조합되지 않습니다. ${
    mat(hint.a === x || hint.b === x ? x : y)?.name}는 ${other}와 조합해 보세요.`;
}
