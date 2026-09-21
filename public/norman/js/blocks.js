// 연장대에 걸린 시그니파이어들.
//
// 이름은 읽는 순간 그림이 그려져야 한다. 그래서 두 줄로 쓴다 —
// 윗줄은 **무엇을 하는지**, 아랫줄 tip 은 **그러면 어떻게 보이는지**.
// 학생이 "이게 뭐지" 하고 물어야 하는 이름은 연장대에서 뺀다.
//
// cat  — 무엇으로 알리는가. 하트슨(2003)의 네 갈래.
// fits — 어느 자리에서 제 일을 하는가.
//        여기 적힌 자리가 아니어도 **붙기는 한다**. 막지 않는다.
//        엉뚱한 자리에 붙은 단서는 시연에서 아무도 못 보게 되고,
//        그게 눈에 보여야 왜 틀렸는지 알게 된다.

export const CATS = {
  sense: { name: "감각적", desc: "눈과 귀에 띄게" },
  cog:   { name: "인지적", desc: "무슨 뜻인지 알게" },
  phys:  { name: "물리적", desc: "손으로 하기 쉽게" },
  limit: { name: "제약",   desc: "못 하는 쪽을 막아서" },
};

// 자리 — 언제 알리는가. 앞의 셋이 노먼의 두 간극을 가른다.
export const HATS = [
  { id: "idle",  name: "평소 모습",    desc: "손대기 전에 늘 보이는 것", gulf: "실행" },
  { id: "touch", name: "손댔을 때",    desc: "만지는 동안 달라지는 것",  gulf: "실행" },
  { id: "after", name: "누르고 난 뒤", desc: "무슨 일이 생겼는지",       gulf: "평가" },
  { id: "block", name: "막아 두기",    desc: "지금은 안 된다고 알리기",  gulf: "제약" },
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

// 그림표 고르기에 쓸 우리말 이름
export const ICON_NAMES = {
  save: "저장", plus: "더하기", minus: "빼기", weight: "아령",
  rep: "반복", clock: "시계", pencil: "연필", list: "목록",
};

export const BLOCKS = [
  /* ── 인지적 · 무슨 뜻인지 알게 ─────────────────────────── */
  { id: "label",  name: "이름 적어 주기",  cat: "cog", fits: ["idle"],
    tip: "빈 칸 위에 「무게」 같은 글자가 붙는다",
    arg: { kind: "text", ph: "뭐라고 적을까", max: 12 } },

  { id: "icon",   name: "그림 넣어 주기",  cat: "cog", fits: ["idle"],
    tip: "글자 대신 그림으로 알아보게 한다",
    arg: { kind: "icon" } },

  { id: "unit",   name: "무슨 숫자인지 적기", cat: "cog", fits: ["idle"],
    tip: "60 이던 것이 60 kg 으로 보인다",
    arg: { kind: "text", ph: "kg · 회 · 분", max: 4 } },

  { id: "hint",   name: "한 줄 설명 달기",  cat: "cog", fits: ["idle"],
    tip: "밑에 작은 글씨로 한 줄 덧붙는다",
    arg: { kind: "text", ph: "한 줄로 알려 주기", max: 22 } },

  { id: "status", name: "지금 어떤지 보여 주기", cat: "cog", fits: ["idle", "after"],
    tip: "「3세트 기록됨」 「쉬는 중 42초」가 뜬다" },

  { id: "toast",  name: "됐다고 말해 주기", cat: "cog", fits: ["after"],
    tip: "화면 아래에 쪽지가 잠깐 떴다 사라진다",
    arg: { kind: "text", ph: "뭐라고 말해 줄까", max: 20 } },

  /* ── 감각적 · 눈과 귀에 띄게 ───────────────────────────── */
  { id: "strong", name: "눈에 띄는 색으로", cat: "sense", fits: ["idle"],
    tip: "흐린 회색이 진한 파란색으로 바뀐다" },

  { id: "big",    name: "크게 만들기",      cat: "sense", fits: ["idle"],
    tip: "칸과 글자가 한눈에 들어올 만큼 커진다" },

  { id: "glow",   name: "손대면 환해지기",  cat: "sense", fits: ["touch"],
    tip: "손가락이 닿는 동안만 밝아진다" },

  { id: "check",  name: "체크 표시 띄우기", cat: "sense", fits: ["after"],
    tip: "큰 ✓ 가 화면 가운데 나타났다 사라진다" },

  { id: "buzz",   name: "소리 내고 떨리기", cat: "sense", fits: ["after"],
    tip: "딩 소리가 나고 화면이 짧게 흔들린다" },

  /* ── 물리적 · 손으로 하기 쉽게 ─────────────────────────── */
  { id: "wide",   name: "누르는 칸 크게 하기", cat: "phys", fits: ["idle"],
    tip: "손가락보다 작으면 자꾸 빗나간다" },

  { id: "press",  name: "눌리는 느낌 주기",    cat: "phys", fits: ["touch"],
    tip: "누르는 동안 단추가 쑥 들어간다" },

  { id: "grip",   name: "잡는 자리 표시하기",  cat: "phys", fits: ["idle"],
    tip: "여기를 쥐거나 민다는 홈이 생긴다" },

  /* ── 제약 · 못 하는 쪽을 막아서 ────────────────────────── */
  { id: "lock",   name: "못 누르게 잠그기",    cat: "limit", fits: ["block"],
    tip: "흐려지고 눌러도 아무 일이 없다" },
];

export const byId = id => BLOCKS.find(b => b.id === id);

/** 이 단서가 이 자리에서 제 일을 하는가. 붙는 것은 언제나 되고, 보이는지만 갈린다. */
export const works = (blockId, hatId) => !!byId(blockId)?.fits.includes(hatId);
