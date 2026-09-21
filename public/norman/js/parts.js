// 재료와 조합표.
//
// 상점에서는 **완성된 단서를 팔지 않는다.** 재료만 판다.
// 글자·테두리·깜박임 같은 것들이고, 그 자체로는 아무것도 알리지 못한다.
// 둘을 합쳐야 비로소 연장이 된다 — 테두리 + 깜박임 = 커서 깜박이는 입력칸.
//
// 언제 보이는지(when)는 조가 고르는 것이 아니라 **만든 물건이 정한다.**
// 깜박이는 커서는 늘 보이는 것이고, 알림 쪽지는 누른 뒤에만 뜬다.
// 그래서 무엇을 만들지 고르는 일이 곧 어느 간극을 메울지 고르는 일이 된다.

export const MATERIALS = [
  { id: "glyph", name: "글자",     price: 40, arg: { kind: "text", ph: "무슨 글자", max: 12 },
    tip: "쓴 대로 화면에 붙는다" },
  { id: "icon",  name: "그림",     price: 40, arg: { kind: "icon" },
    tip: "작은 그림 하나" },
  { id: "frame", name: "테두리",   price: 30, tip: "칸의 가장자리를 그린다" },
  { id: "blink", name: "깜박임",   price: 40, tip: "일정하게 깜박인다" },
  { id: "tint",  name: "진한 색",  price: 30, tip: "바탕을 진하게 물들인다" },
  { id: "grow",  name: "큰 크기",  price: 30, tip: "붙은 것을 키운다" },
  { id: "slip",  name: "쪽지",     price: 50, tip: "떴다가 사라지는 종잇조각" },
  { id: "tick",  name: "체크 표시", price: 40, tip: "✓ 모양" },
  { id: "arrow", name: "화살표",   price: 30, tip: "한쪽을 가리킨다" },
  { id: "sound", name: "소리",     price: 40, tip: "짧은 소리 하나" },
  { id: "shake", name: "떨림",     price: 30, tip: "짧게 흔들린다" },
  { id: "notch", name: "홈",       price: 30, tip: "손이 걸리는 결" },
  { id: "shade", name: "그늘",     price: 30, tip: "눌린 것처럼 어둡게" },
  { id: "line",  name: "밑줄",     price: 20, tip: "아래에 긋는 줄" },
];

export const mat = id => MATERIALS.find(m => m.id === id);

/* ── 조합표 ───────────────────────────────────────────────────
   when — 언제 보이는가. idle 늘 · touch 닿는 동안 · after 하고 난 뒤
   on   — 어떤 부품에 붙는가. input 쓰는 칸 · button 누르는 곳 · list 목록
   gulf — 어느 간극을 메우는가. 앱시장 품평이 이것으로 값을 매긴다.          */

export const RECIPES = [
  { a: "frame", b: "blink", id: "caret", name: "깜박이는 입력칸",
    when: "idle", on: ["input"], gulf: "실행",
    line: "여기에 쓸 수 있다는 것을 알린다" },

  { a: "glyph", b: "frame", id: "label", name: "이름표 붙은 칸",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "이 칸이 무엇인지 글자로 알린다" },

  { a: "glyph", b: "tint", id: "bold", name: "도드라진 글자",
    when: "idle", on: ["button", "list"], gulf: "실행",
    line: "진한 바탕 위에 글자를 올려 눈에 띄게 한다" },

  { a: "icon", b: "frame", id: "iconbtn", name: "그림 단추",
    when: "idle", on: ["button"], gulf: "실행",
    line: "글자 없이 그림으로 무엇인지 알린다" },

  { a: "tint", b: "grow", id: "bigbtn", name: "커다란 단추",
    when: "idle", on: ["button"], gulf: "실행",
    line: "손가락보다 크고 진해서 누를 곳임을 알린다" },

  { a: "glyph", b: "arrow", id: "guide", name: "가리키는 안내",
    when: "idle", on: ["input", "button", "list"], gulf: "실행",
    line: "어디를 보라고 화살표로 짚어 준다" },

  { a: "glyph", b: "line", id: "unit", name: "단위 글자",
    when: "idle", on: ["input"], gulf: "실행",
    line: "숫자 뒤에 kg·회를 붙여 무슨 수인지 알린다" },

  { a: "notch", b: "frame", id: "grip", name: "잡는 손잡이",
    when: "idle", on: ["list"], gulf: "실행",
    line: "쥐거나 밀 수 있는 자리임을 알린다" },

  { a: "blink", b: "tint", id: "hot", name: "닿으면 밝아짐",
    when: "touch", on: ["input", "button"], gulf: "실행",
    line: "손가락이 닿는 동안 밝아져 지금 만지는 곳을 알린다" },

  { a: "shade", b: "frame", id: "press", name: "눌리는 단추",
    when: "touch", on: ["button"], gulf: "실행",
    line: "누르는 동안 쑥 들어가 눌렸다는 것을 알린다" },

  { a: "glyph", b: "slip", id: "toast", name: "알림 쪽지",
    when: "after", on: ["input", "button", "list"], gulf: "평가",
    line: "일이 끝난 뒤 무슨 일이 있었는지 쪽지로 알린다" },

  { a: "tick", b: "blink", id: "done", name: "완료 표시",
    when: "after", on: ["input", "button"], gulf: "평가",
    line: "끝났다는 것을 ✓ 로 알린다" },

  { a: "sound", b: "shake", id: "feel", name: "손끝 알림",
    when: "after", on: ["button"], gulf: "평가",
    line: "소리와 떨림으로 받아들여졌다는 것을 알린다" },

  { a: "icon", b: "tint", id: "state", name: "상태 그림",
    when: "idle", on: ["list", "input"], gulf: "평가",
    line: "지금 어떤 상태인지 그림과 글자로 계속 보여 준다" },
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
  if (!near.length) return `${nx}와 ${ny}… 이 둘로는 아무것도 안 되네.`;
  const hint = near[0];
  const other = mat(hint.a === x || hint.b === x
    ? (hint.a === x ? hint.b : hint.a)
    : (hint.a === y ? hint.b : hint.a))?.name;
  return `${nx}와 ${ny}는 안 붙네. ${
    mat(hint.a === x || hint.b === x ? x : y)?.name}는 ${other}와 붙여 보게.`;
}
