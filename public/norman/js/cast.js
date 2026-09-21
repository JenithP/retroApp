// 공방에 드나드는 사람들.
//
// 초상은 img/<id>.webp 를 먼저 찾고, 없으면 아래 그림으로 대신한다.
// 파일이 없어도 실습은 그대로 돌아간다 — 2주차 매체 파일과 같은 규칙이다.
//
// 그려 넣을 그림 (public/norman/img/)
//   norman.webp  늙은 장인. 앞치마, 돋보기, 무뚝뚝하고 짧게 말한다
//   guest.webp   처음 온 손님. 물건을 처음 본 사람. 곤란해하는 표정
//   tinker.webp  연장 장수. 연장대를 지키는 사람
//   critic.webp  앱시장 상인. 값을 매기는 사람

export const CAST = {
  norman: { name: "노만 영감", tone: "norman", face: ["#D9A441", "#4A3B28"] },
  guest:  { name: "손님",     tone: "guest",  face: ["#8FB5D9", "#2C3F52"] },
  tinker: { name: "연장 장수", tone: "tinker", face: ["#A07BC4", "#3B2C4A"] },
  critic: { name: "앱시장 상인", tone: "critic", face: ["#7FA86B", "#2C3F28"] },
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

/* ── 노만 영감이 하는 말 ──────────────────────────────────── */

export const NORMAN = {
  hello: team =>
    `어서 오게, ${team}조. 저 위에 주문이 하나 걸려 있네. ` +
    `미리 말해 두지 — 저 물건은 이미 멀쩡히 돌아가네. 고장 난 게 아니야.`,

  rule:
    `단추는 눌리고 기록은 쌓이네. 다만 아무 말을 안 할 뿐이지. ` +
    `그러니 자네가 고칠 것은 기능이 아니라 알려 주는 일이야.`,

  cantBuy:
    `어포던스를 사겠다고? 그런 건 안 파네. 저 물건에 이미 들어 있는 것이니까. ` +
    `자네가 살 수 있는 건 그게 있다고 알리는 단서뿐이야.`,

  first: `좋아. 붙인 것이 바로 화면에 나타나지? 그게 단서라는 것일세.`,

  beforeGuest: `손님을 한 사람 불러오겠네. 저 물건을 오늘 처음 보는 사람이야.`,

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
  set:    v => `${v} 맞췄어요.`,
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
