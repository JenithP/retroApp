// 공방에 드나드는 사람들.
//
// 초상은 img/<id>.webp 를 먼저 찾고, 없으면 아래 그림으로 대신한다.
// 파일이 없어도 실습은 그대로 돌아간다 — 2주차 매체 파일과 같은 규칙이다.
//
// 그려 넣을 그림 (public/norman/img/)
//   norman.webp  늙은 장인. 공방 벽에 걸린 초상화로 쓴다 — 이 공방을 세운 사람
//   guest.webp   테스트 사용자. 화면을 처음 만져 보는 사람. 곤란해하는 표정
//   tinker.webp  상점 주인. 재료 진열대를 지키는 사람
//   critic.webp  앱시장 중개인. 주문을 물어 오고, 출품을 심사하고, 값을 매긴다

export const CAST = {
  norman: { name: "노만 영감", tone: "norman", face: ["#D9A441", "#4A3B28"] },
  guest:  { name: "테스트 사용자", tone: "guest",  face: ["#8FB5D9", "#2C3F52"] },
  tinker: { name: "상점 주인", tone: "tinker", face: ["#A07BC4", "#3B2C4A"] },
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
  knock: job => [
    "앱시장에서 새 의뢰를 가져왔습니다.",
    `${job.app} 앱의 ${job.screen} 화면입니다. 사용자는 이렇게 말했습니다 — 「${job.say}」`,
    "기능은 그대로 두고, 사용자가 알아볼 수 있는 단서를 붙여 주세요. 시장에 내놓을 만하면 값을 매기겠습니다.",
  ],

  next: job =>
    `새 의뢰입니다. ${job.app} 앱의 ${job.screen} 화면입니다. ` +
    `사용자는 「${job.say}」라고 말했습니다.`,
  waiting:
    "값을 매기려면 먼저 테스트 결과가 필요합니다. " +
    "공방에서 「테스트해 보기」를 한 번 실행하고 오세요.",
  looking: "테스트 결과가 남아 있군요. 그 결과를 기준으로 살펴보겠습니다.",
  reject: v =>
    `이대로는 시장에 내놓기 어렵습니다. 테스트 사용자가 과제를 끝내지 못했습니다 — ` +
    `${v.of}단계 가운데 ${v.right}단계만 성공했습니다. 더 고쳐 주세요.`,
  pass: p => `좋습니다. ${p}포인트로 사겠습니다. 다음 의뢰도 기대하겠습니다.`,
};

export const NORMAN = {
  // 조가 공방 주인이다. 노만은 벽에서 거드는 사람.
  wake: team =>
    `(액자 속 노인이 눈을 뜹니다) ${team}조, 이제 이 공방은 여러분 차례입니다. ` +
    `나는 옆에서 도와주겠습니다.`,

  heard: () =>
    `방금 의뢰를 들었죠? 저 화면은 고장 난 게 아닙니다. 기능은 이미 작동합니다.`,

  rule:
    `문제는 사용자가 그 사실을 알아차리지 못한다는 점입니다. ` +
    `여러분이 고칠 것은 기능이 아니라 사용자를 안내하는 단서입니다.`,

  cantBuy:
    `어포던스 자체를 살 수는 없습니다. 가능한 행동은 화면에 이미 들어 있습니다. ` +
    `여러분이 만들 수 있는 것은 그 가능성을 알려 주는 시그니파이어입니다.`,

  first: `좋아요. 붙인 단서가 화면에 보이죠? 이런 표시가 사용자의 행동을 이끕니다.`,

  beforeTest: `이제 처음 보는 사용자가 어떻게 쓰는지 봅시다. ` +
    `우리에게 쉬운 화면이 처음 보는 사람에게도 쉬운지가 핵심입니다.`,

  toMarket: `테스트가 잘 통과되면 위쪽의 「앱시장」에 내놓아 보세요. 중개인이 값을 매깁니다.`,

  broke: `포인트가 부족하면 「문제 풀기」로 가세요. 강의 내용을 맞히면 포인트를 받을 수 있습니다.`,

  /** 주머니가 비어 갈 때 초상화가 스스로 빛난다 */
  lowPoint: p =>
    `(초상화가 환해집니다) 남은 포인트가 ${p}입니다. ` +
    `내가 내는 문제를 맞히면 한 문제에 40포인트를 드립니다. 액자를 터치해 보세요.`,

  /** 판정을 보고 던지는 한마디 — 비어 있던 자리를 짚는다 */
  verdict(v) {
    if (v.clean)
      return `사용자가 막히지 않았습니다. 이 정도면 시장에 내놓아도 됩니다. 아래 버튼을 터치하세요.`;
    if (v.evalGap > 0 && v.exec > 0)
      return `두 가지가 모두 막혔습니다. 어디를 터치해야 하는지도 몰랐고, 터치한 뒤 결과도 알 수 없었습니다.`;
    if (v.evalGap > 0)
      return `사용자가 같은 곳을 다시 터치한 이유는 결과가 보이지 않았기 때문입니다. ` +
             `조작 후 피드백을 붙여 보세요.`;
    if (v.wrong > 0)
      return `여러 번 터치했지만 입력된 값이 의뢰와 다릅니다. 사용자가 상태를 읽기 어렵습니다.`;
    return `아직 어디를 터치해야 할지 모릅니다. 처음부터 보이는 단서를 더 붙여 보세요.`;
  },
};

/* ── 손님이 하는 말 — 시연에서 사건마다 한 마디 ───────────── */

export const GUEST = {
  seek:   ["…어디를 터치해야 하는 거죠?", "음… 이 화면에서 뭘 해야 하죠?"],
  miss:   ["여기가 아닌가 봐요.", "어… 이것도 아니네요.", "제가 뭘 잘못 터치했나요?"],
  found:  ["아, 이거였구나.", "여기였네요. 한참 찾았어요."],
  direct: ["아, 여기네요.", "이건 바로 알겠어요."],
  typed:  v => `${v}라고 썼어요.`,
  nocaret:"터치했는데… 여기에 쓰는 게 맞나요? 아무 반응이 없는데.",
  nosave: "다 적었는데 어디를 터치해야 저장되죠?",
  foundsave: "(아무것도 없는 띠를 터치해 본다) 어, 됐나?",
  quiet:  ["…된 건가요?", "어? 아무 말이 없는데요.", "터치가 안 됐나…"],
  bash:   n => `(${n}번 더 누른다) 이게 되는 건지 모르겠어요.`,
  ok:     n => `${n}번째 단계까지 됐네요.`,
  blind:  "몇 개나 들어갔는지는… 모르겠어요.",
  wrong:  n => `그런데 이 숫자들, 제가 하려던 것과 다른 것 같은데… ${n}개나 됐나요?`,
};

/** 같은 말이 반복되지 않게 돌려 가며 쓴다. */
const turn = {};
export function pickLine(key, list) {
  if (typeof list === "string") return list;
  turn[key] = (turn[key] || 0) % list.length;
  return list[turn[key]++];
}
