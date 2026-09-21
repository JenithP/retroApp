// 공방에 드나드는 사람들.
//
// 초상은 img/<id>.webp 를 먼저 찾고, 없으면 아래 그림으로 대신한다.
// 파일이 없어도 실습은 그대로 돌아간다 — 2주차 매체 파일과 같은 규칙이다.
//
// 그려 넣을 그림 (public/norman/img/)
//   norman.webp  늙은 장인. 공방 벽에 걸린 초상화로 쓴다 — 이 공방을 세운 사람
//   guest.webp   테스트 사용자. 물건을 처음 만져 보는 사람. 곤란해하는 표정
//   tinker.webp  연장 장수. 연장대를 지키는 사람
//   critic.webp  앱시장 중개인. 주문을 물어 오고, 출품을 심사하고, 값을 매긴다

export const CAST = {
  norman: { name: "노만 영감", tone: "norman", face: ["#D9A441", "#4A3B28"] },
  guest:  { name: "테스트 사용자", tone: "guest",  face: ["#8FB5D9", "#2C3F52"] },
  tinker: { name: "연장 장수", tone: "tinker", face: ["#A07BC4", "#3B2C4A"] },
  critic: { name: "앱시장 중개인", tone: "critic", face: ["#7FA86B", "#2C3F28"] },
};

/** 그림 파일이 없을 때 대신 쓰는 얼굴. 사람마다 다르게 보이기만 하면 된다. */
export function faceSVG(who) {
  const [skin, back] = CAST[who]?.face || ["#9C9184", "#2A2320"];
  const cap = who === "norman"
    ? `<path d="M10 20c0-7 5-11 12-11s12 4 12 11" fill="${skin}" opacity=".55"/>`
    : who === "critic"
    ? `<path d="M9 19h26l-3-5H12z" fill="${skin}" opacity=".55"/>`
    : "";
  return `<svg viewBox="0 0 44 44" aria-hidden="true">
    <rect width="44" height="44" rx="7" fill="${back}"/>
    <circle cx="22" cy="19" r="9" fill="${skin}"/>
    <path d="M6 44c1-9 7-13 16-13s15 4 16 13z" fill="${skin}" opacity=".8"/>
    ${cap}</svg>`;
}

/* ── 초상 그림이 있는지 한 번만 알아본다 ─────────────────────
   말할 때마다 찾으면 같은 파일을 스무 번 부르게 된다.
   그림이 아직 없으면 조용히 그려 둔 얼굴로 간다. */

const art = {};                 // who → true(있다) · false(없다) · undefined(아직 모름)
const asked = {};

export const hasArt = who => art[who] === true;

export function probeArt(who, whenFound) {
  if (asked[who]) return;
  asked[who] = true;
  const img = new Image();
  img.onload  = () => { art[who] = true;  whenFound?.(who); };
  img.onerror = () => { art[who] = false; };
  img.src = `img/${who}.webp`;
}

/** 공방에 들어설 때 넷을 한꺼번에 알아본다. */
export function probeAll(whenFound) {
  for (const who of Object.keys(CAST)) probeArt(who, whenFound);
}

/* ── 노만 영감이 하는 말 ──────────────────────────────────── */

/* ── 앱시장 중개인 — 주문을 물어 오고, 나중에 심사해 값을 매긴다 ── */

export const BROKER = {
  knock: [
    "실례하오. 앱시장에서 왔소이다.",
    "요새 이런 물건이 잘 나가오. 헌데 사 간 사람마다 쓸 줄을 몰라 죄 도로 가져오지 뭐요.",
    "쓸 만하게 고쳐 주시오. 시장에 내놓을 만하면 값은 후하게 쳐드리리다.",
  ],
  waiting:
    "값을 매기려면 먼저 물건이 도는 걸 봐야 하오. " +
    "공방에서 「테스트해 보기」를 한 번 돌려 보고 오시오.",
  looking: "물건을 봅시다. 테스트한 자국이 남았으니 그걸로 보겠소.",
  reject: v =>
    `이래서는 못 내놓소. 테스트 사용자가 주문대로 해내질 못했소 — ` +
    `세 줄이어야 하는데 ${v.right}줄이오. 더 고쳐서 오시오.`,
  pass: p => `좋소, ${p}포인트 드리리다. 다음 물건도 기대하겠소.`,
};

export const NORMAN = {
  // 조가 공방 주인이다. 노만은 벽에서 거드는 사람.
  wake: team =>
    `(액자 속 노인이 눈을 뜬다) 이 공방은 이제 자네 것일세, ${team}조. ` +
    `나는 벽에서 거들기나 하지.`,

  heard: () =>
    `들었나? 잘 듣게 — 저 물건은 이미 멀쩡히 돌아가네. 고장 난 게 아니야.`,

  rule:
    `단추는 눌리고 기록은 쌓이네. 다만 아무 말을 안 할 뿐이지. ` +
    `그러니 자네가 고칠 것은 기능이 아니라 알려 주는 일이야.`,

  cantBuy:
    `어포던스를 사겠다고? 그런 건 안 파네. 저 물건에 이미 들어 있는 것이니까. ` +
    `자네가 살 수 있는 건 그게 있다고 알리는 단서뿐이야.`,

  first: `좋아. 붙인 것이 바로 화면에 나타나지? 그게 단서라는 것일세.`,

  beforeGuest: `저 물건을 처음 만져 보는 사람에게 쥐여 보겠네. ` +
    `우리 눈에는 다 뻔하지. 처음 보는 사람 눈에도 그런지가 문제일세.`,

  toMarket: `내놓을 만하다 싶거든 위에 「앱시장」을 누르게. 중개인이 보고 값을 매길 걸세.`,

  broke: `포인트가 모자라거든 「문제 풀기」에 들르게. 배운 걸 대면 품삯을 주지.`,

  /** 주머니가 비어 갈 때 초상화가 스스로 빛난다 */
  lowPoint: p =>
    `(초상화가 환해진다) 주머니가 가볍구먼 — ${p}포인트뿐일세. ` +
    `내가 묻는 걸 맞히면 한 문제에 40씩 주지. 액자를 누르게.`,

  /** 판정을 보고 던지는 한마디 — 비어 있던 자리를 짚는다 */
  verdict(v) {
    if (v.clean)
      return `막힘이 없었네. 이만하면 내놓아도 되겠어.`;
    if (v.evalGap > 0 && v.exec > 0)
      return `둘 다 막혔네. 어디를 눌러야 할지도 몰랐고, 누른 뒤에 어찌 됐는지도 몰랐어.`;
    if (v.evalGap > 0)
      return `손님이 왜 자꾸 눌렀는지 아나? 눌렀는데 아무 일도 안 일어나 보였기 때문이야. ` +
             `「누르고 난 뒤」 자리가 비었네.`;
    if (v.wrong > 0)
      return `세 번은 눌렀네만, 적힌 값이 주문과 다르네. 손님은 그걸 읽을 수가 없었어.`;
    return `아직 어디를 눌러야 할지 모르더군. 「평소 모습」 자리를 보게.`;
  },
};

/* ── 손님이 하는 말 — 시연에서 사건마다 한 마디 ───────────── */

export const GUEST = {
  seek:   ["…어디를 눌러야 하는 거죠?", "음… 이게 뭘 하는 물건이죠?"],
  miss:   ["여기가 아닌가 봐요.", "어… 이것도 아니네요.", "제가 뭘 잘못 눌렀나요?"],
  found:  ["아, 이거였구나.", "여기였네요. 한참 찾았어요."],
  direct: ["아, 여기네요.", "이건 바로 알겠어요."],
  typed:  v => `${v} 라고 썼어요.`,
  nocaret:"눌렀는데… 여기에 쓰는 게 맞나요? 아무 반응이 없는데.",
  nosave: "다 적었는데 어디를 눌러야 저장되죠?",
  foundsave: "(아무것도 없는 띠를 눌러 본다) 어, 됐나?",
  quiet:  ["…된 건가요?", "어? 아무 말이 없는데요.", "안 눌렸나…"],
  bash:   n => `(${n}번 더 누른다) 이게 되는 건지 모르겠어요.`,
  ok:     n => `${n}세트째. 됐네요.`,
  blind:  "몇 개나 들어갔는지는… 모르겠어요.",
  wrong:  n => `그런데 이 숫자들, 제가 하려던 거랑 다른 것 같은데… ${n}개나요?`,
};

/** 같은 말이 반복되지 않게 돌려 가며 쓴다. */
const turn = {};
export function pickLine(key, list) {
  if (typeof list === "string") return list;
  turn[key] = (turn[key] || 0) % list.length;
  return list[turn[key]++];
}
