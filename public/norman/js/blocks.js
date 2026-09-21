// 연장대에 걸린 시그니파이어들.
//
// cat  — 무엇으로 알리는가. 하트슨(2003)의 네 갈래.
//        sense 감각적 · cog 인지적 · phys 물리적 · limit 제약
// fits — 어느 자리에서 제 일을 하는가.
//        여기 적힌 자리가 아니어도 **붙기는 한다**. 막지 않는다.
//        엉뚱한 자리에 붙은 단서는 시연에서 아무도 못 보게 되고,
//        그게 눈에 보여야 왜 틀렸는지 알게 된다.

export const CATS = {
  sense: { name: "감각적", desc: "알아볼 수 있게" },
  cog:   { name: "인지적", desc: "뜻을 알 수 있게" },
  phys:  { name: "물리적", desc: "몸으로 할 수 있게" },
  limit: { name: "제약",   desc: "못 하는 쪽을 막아서" },
};

// 자리 — 언제 알리는가. 앞의 셋이 노먼의 두 간극을 가른다.
export const HATS = [
  { id: "idle",  name: "평소에",        desc: "늘 보이는 단서",        gulf: "실행" },
  { id: "touch", name: "손이 닿는 동안", desc: "만졌을 때 달라지는 것", gulf: "실행" },
  { id: "after", name: "하고 난 뒤",    desc: "무슨 일이 생겼는지",    gulf: "평가" },
  { id: "block", name: "못 하게 막기",  desc: "할 수 없는 쪽을 닫는다", gulf: "제약" },
];

export const ICONS = {
  save:   "M3 3h10l2 2v9H3z M6 3v4h5V3 M6 10h6v4H6z",
  plus:   "M9 3v12 M3 9h12",
  minus:  "M3 9h12",
  weight: "M4 6h10l1 8H3z M6 6a3 3 0 0 1 6 0",
  rep:    "M4 7a5 5 0 0 1 9-2 M14 11a5 5 0 0 1-9 2 M13 2v4h-4 M5 16v-4h4",
  clock:  "M9 4v5l3 2 M9 1a8 8 0 1 0 0 16A8 8 0 0 0 9 1z",
  pencil: "M3 13l8-8 3 3-8 8H3z",
  list:   "M3 5h12 M3 9h12 M3 13h8",
};

export const BLOCKS = [
  // ── 인지적 · 뜻을 알려 준다 ────────────────────────────────
  { id: "label",  name: "이름표 붙이기",     cat: "cog", fits: ["idle"],
    arg: { kind: "text", ph: "무엇이라고 적을까", max: 12 } },
  { id: "icon",   name: "그림표 붙이기",     cat: "cog", fits: ["idle"],
    arg: { kind: "icon" } },
  { id: "unit",   name: "단위 붙이기",       cat: "cog", fits: ["idle"],
    arg: { kind: "text", ph: "kg · 회 · 분", max: 4 } },
  { id: "hint",   name: "안내문 한 줄",      cat: "cog", fits: ["idle"],
    arg: { kind: "text", ph: "한 줄로 알려 주기", max: 22 } },
  { id: "status", name: "지금 상태 보이기",  cat: "cog", fits: ["idle", "after"] },
  { id: "toast",  name: "알림 띄우기",       cat: "cog", fits: ["after"],
    arg: { kind: "text", ph: "무슨 일이 생겼는지", max: 20 } },

  // ── 감각적 · 알아보게 한다 ─────────────────────────────────
  { id: "strong", name: "또렷하게",          cat: "sense", fits: ["idle"] },
  { id: "big",    name: "크게",              cat: "sense", fits: ["idle"] },
  { id: "glow",   name: "밝아지기",          cat: "sense", fits: ["touch"] },
  { id: "check",  name: "체크 번쩍",         cat: "sense", fits: ["after"] },
  { id: "buzz",   name: "소리와 떨림",       cat: "sense", fits: ["after"] },

  // ── 물리적 · 몸으로 하게 한다 ──────────────────────────────
  { id: "wide",   name: "누를 자리 넓히기",  cat: "phys", fits: ["idle"] },
  { id: "press",  name: "눌리는 모양",       cat: "phys", fits: ["touch"] },
  { id: "grip",   name: "잡을 홈 파기",      cat: "phys", fits: ["idle"] },

  // ── 제약 · 못 하는 쪽을 막는다 ─────────────────────────────
  { id: "lock",   name: "잠그기",            cat: "limit", fits: ["block"] },
];

export const byId = id => BLOCKS.find(b => b.id === id);

/** 이 단서가 이 자리에서 제 일을 하는가. 붙는 것은 언제나 되고, 보이는지만 갈린다. */
export const works = (blockId, hatId) => !!byId(blockId)?.fits.includes(hatId);
