// 재료와 조합표.
//
// 상점에서는 **완성된 단서를 팔지 않는다.** 재료만 판다.
// 글자·테두리·깜박임 같은 것들이고, 그 자체로는 아무것도 알리지 못한다.
// 둘을 합쳐야 비로소 단서가 된다 — 테두리 + 깜박임 = 커서 깜박이는 입력칸.
//
// 언제 보이는지(when)는 조가 고르는 것이 아니라 **만든 단서가 정한다.**
// 깜박이는 커서는 늘 보이는 것이고, 알림 쪽지는 터치한 뒤에만 뜬다.
// 그래서 무엇을 만들지 고르는 일이 곧 어느 간극을 메울지 고르는 일이 된다.

export const MATERIALS = [
  { id: "glyph", name: "글자",     price: 40, arg: { kind: "text", ph: "넣을 글자", max: 12 },
    tip: "입력한 말을 화면에 붙입니다" },
  { id: "icon",  name: "그림",     price: 40, arg: { kind: "icon" },
    tip: "아이콘으로 의미를 보여줍니다" },
  { id: "frame", name: "테두리",   price: 30, tip: "입력칸이나 영역의 경계를 보여줍니다" },
  { id: "blink", name: "깜박임",   price: 40, tip: "눈에 띄도록 반복해서 깜박입니다" },
  { id: "tint",  name: "진한 색",  price: 30, tip: "중요한 부분을 진한 색으로 강조합니다" },
  { id: "grow",  name: "큰 크기",  price: 30, tip: "더 크고 터치하기 쉬워 보이게 만듭니다" },
  { id: "slip",  name: "알림창",   price: 50, tip: "잠깐 떴다 사라지는 알림 창입니다" },
  { id: "tick",  name: "체크 표시", price: 40, tip: "완료나 선택을 ✓로 보여줍니다" },
  { id: "arrow", name: "화살표",   price: 30, tip: "봐야 할 곳을 가리킵니다" },
  { id: "sound", name: "소리",     price: 40, tip: "조작이 받아들여졌음을 소리로 알립니다" },
  { id: "shake", name: "떨림",     price: 30, tip: "짧은 진동으로 반응을 줍니다" },
  { id: "notch", name: "홈",       price: 30, tip: "잡거나 밀 수 있는 느낌을 줍니다" },
  { id: "shade", name: "그늘",     price: 30, tip: "터치된 듯한 깊이를 만듭니다" },
  { id: "line",  name: "밑줄",     price: 20, tip: "글자나 숫자 아래에 기준선을 긋습니다" },

  // ── 여기부터는 나중에 더한 재료다 ──────────────────────────
  { id: "btnface", name: "버튼 바탕", price: 45,
    tip: "버튼처럼 색이 채워진 바탕입니다" },
  { id: "blue",  name: "파란 글씨", price: 35,
    tip: "링크에 쓰는 파란 글자색입니다" },
  { id: "star",  name: "별표",     price: 25, arg: { kind: "text", ph: "넣을 글자", max: 12 },
    tip: "빠뜨리면 안 되는 곳에 붙는 * 표시입니다" },
  { id: "fade",  name: "흐림",     price: 25,
    tip: "지금은 할 수 없는 곳을 흐리게 만듭니다" },
  { id: "spin",  name: "도는 그림", price: 40,
    tip: "일이 되고 있는 중임을 돌아가며 보여줍니다" },
  { id: "badge", name: "숫자 딱지", price: 35,
    tip: "몇 개인지 작은 숫자로 보여줍니다" },
  { id: "bubble", name: "말풍선",  price: 40, arg: { kind: "text", ph: "넣을 글자", max: 14 },
    tip: "가리킨 곳 옆에 설명을 띄웁니다" },
  { id: "fill",  name: "채움",     price: 35,
    tip: "고른 것에 색이 차오릅니다" },
];

export const mat = id => MATERIALS.find(m => m.id === id);

/* ── 조합표 ───────────────────────────────────────────────────
   when — 언제 보이는가. idle 늘 · touch 닿는 동안 · after 하고 난 뒤
   on   — 어떤 부품에 붙는가. input 쓰는 칸 · button 터치하는 곳 · list 목록
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
    line: "크기와 색으로 터치할 수 있는 곳임을 보여줍니다" },

  { a: "glyph", b: "arrow", id: "guide", name: "가리키는 안내",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "봐야 할 곳을 글자와 화살표로 짚어 줍니다" },

  { a: "glyph", b: "line", id: "unit", name: "단위 글자",
    when: "idle", on: ["input"], gulf: "실행",
    line: "숫자가 금액인지 횟수인지처럼 단위를 알려줍니다" },

  { a: "frame", b: "tint", id: "cardedge", name: "떠 보이는 카드",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "테두리와 그림자로 이 덩어리 전체가 하나의 터치할 거리임을 보여줍니다" },

  { a: "arrow", b: "frame", id: "chevron", name: "들어가기 화살표",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "오른쪽 끝의 › 로 터치해서 들어가는 곳임을 보여줍니다" },

  { a: "notch", b: "frame", id: "grip", name: "드래그 손잡이",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "밀거나 끌 수 있는 부분임을 보여줍니다" },

  { a: "blink", b: "tint", id: "hot", name: "터치 강조",
    when: "touch", on: ["input", "button"], gulf: "실행",
    line: "손이 닿으면 색이 바뀌어 지금 만지는 곳을 보여줍니다" },

  { a: "shade", b: "frame", id: "press", name: "터치 반응",
    when: "touch", on: ["button"], gulf: "실행",
    line: "터치하는 동안 터치된 느낌을 보여줍니다" },

  { a: "glyph", b: "slip", id: "toast", name: "알림 팝업",
    when: "after", on: ["input", "button", "list"], gulf: "평가",
    line: "조작 후 결과를 짧은 메시지로 알려줍니다" },

  { a: "tick", b: "blink", id: "done", name: "완료 표시",
    when: "after", on: ["input", "button"], gulf: "평가",
    line: "작업 완료를 ✓ 표시로 알려줍니다" },

  { a: "sound", b: "shake", id: "feel", name: "손끝 알림",
    when: "after", on: ["button"], gulf: "평가",
    line: "소리와 떨림으로 조작이 받아들여졌음을 알려줍니다" },

  { a: "icon", b: "tint", id: "state", name: "상태 표시",
    when: "idle", on: ["input", "button", "list"], gulf: "평가",
    line: "현재 상태를 그림과 글자로 계속 보여줍니다" },

  /* ── 나중에 더한 것 ──────────────────────────────────────
     글자를 덧붙이는 것만으로는 「여기가 버튼이다」가 되지 않는다.
     실제 앱은 바탕을 채우고 그림자를 넣어 버튼을 만든다. 파란 밑줄
     글씨는 배워서 아는 단서고(21쪽), 흐림은 할 수 없는 쪽을 막아
     알리는 제약이다(20쪽).                                        */

  { a: "btnface", b: "shade", id: "solidbtn", name: "눌리는 버튼",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "바탕을 채우고 그림자를 넣어 터치하는 버튼으로 만듭니다" },

  { a: "btnface", b: "glyph", id: "labelbtn", name: "글자 버튼",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "버튼 안에 글자를 넣어 무엇을 하는 버튼인지 알려줍니다" },

  { a: "blue", b: "line", id: "link", name: "파란 밑줄 글씨",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "파란 글씨에 밑줄은 터치하는 곳이라는 오래된 약속입니다" },

  { a: "bubble", b: "glyph", id: "tip", name: "말풍선 설명",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "옆에 말풍선을 띄워 무엇을 하는 곳인지 알려줍니다" },

  { a: "star", b: "glyph", id: "must", name: "별표 안내",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "* 와 글자로 반드시 해야 하는 것임을 알려줍니다" },

  { a: "badge", b: "icon", id: "count", name: "개수 딱지",
    when: "idle", on: ["button", "list"], gulf: "평가",
    line: "몇 개가 들어 있는지 작은 숫자로 계속 보여줍니다" },

  { a: "fill", b: "tick", id: "chosen", name: "고른 표시",
    when: "idle", on: ["button", "list"], gulf: "평가",
    line: "고른 것에 색이 차고 ✓ 가 붙어 지금 골라졌음을 보여줍니다" },

  { a: "fade", b: "frame", id: "locked", name: "흐린 잠금",
    when: "idle", on: ["input", "button", "list"], gulf: "평가",
    line: "지금은 할 수 없는 곳임을 흐리게 보여줍니다" },

  { a: "spin", b: "tint", id: "busy", name: "도는 표시",
    when: "after", on: ["input", "button", "list"], gulf: "평가",
    line: "터치한 뒤 일이 되고 있는 중임을 도는 그림으로 보여줍니다" },

  { a: "arrow", b: "grow", id: "swipehint", name: "미는 화살표",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "가장자리에 화살표를 두어 옆으로 밀 수 있음을 보여줍니다" },

  { a: "glyph", b: "fade", id: "hintword", name: "흐린 안내 글자",
    when: "idle", on: ["input"], gulf: "실행",
    line: "칸 안에 흐린 글자를 미리 띄워 무엇을 적는 칸인지 알려줍니다" },
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
