// 아바타 신뢰 게임 (11주차) — 규칙과 계산. 브라우저와 버셀 함수(api/trust.js)가 같이 쓴다.
//
// 한 판: 무작위 짝 → 대화(채팅 · 아바타 단서) → 결정 → 공개.
// 투자자는 10점 중 보낼 돈을 정하고, 보낸 돈은 세 배가 되어 수탁자에게 간다.
// 수탁자는 대화 중에 돌려줄 비율을 미리 정해 둔다 (전략 방식).

export const ENDOW = 10;          // 투자자가 판마다 받는 돈
export const MULT = 3;            // 보낸 돈이 불어나는 배수
export const TALK_SEC = 120;      // 대화 기본 시간
export const SEEN_MS = 90 * 1000; // 이 시간 안에 신호가 있던 사람만 짝을 맺는다

export const PHASES = ["lobby", "talk", "decide", "reveal", "end"];
export const PHASE_LABEL = { lobby: "대기", talk: "대화", decide: "결정", reveal: "공개", end: "마침" };

// 판의 조건 — 무엇으로 대화하나
export const CONDS = {
  text: { label: "채팅만", text: true, cue: false },
  both: { label: "채팅 + 아바타 단서", text: true, cue: true },
  cue:  { label: "아바타 단서만", text: false, cue: true },
};

// Davis et al. (2009)의 비언어 단서 여섯 가지. keep: 상태로 남는 단서(표정 · 시선 · 몸 자세 일부), 나머지는 한 번 움직임
export const CUE_GROUPS = [
  { id: "gaze", label: "시선", cues: [{ id: "gaze_on", label: "바라보기", keep: "gaze" }, { id: "gaze_off", label: "시선 피하기", keep: "gaze" }] },
  { id: "head", label: "머리 자세", cues: [{ id: "nod", label: "끄덕이기" }, { id: "shake", label: "고개 젓기" }] },
  { id: "eyes", label: "눈 방향", cues: [{ id: "look", label: "두리번거리기" }] },
  { id: "arms", label: "팔 동작", cues: [{ id: "wave", label: "손 흔들기" }, { id: "clap", label: "박수" }, { id: "heart", label: "하트" }, { id: "promise", label: "약속해요" }] },
  { id: "body", label: "몸 자세", cues: [{ id: "wall", label: "기대기", keep: "body" }, { id: "sit", label: "앉기", keep: "body" }, { id: "stand", label: "바로 서기", keep: "body" }, { id: "jump", label: "뛰기" }] },
  { id: "face", label: "표정", cues: [{ id: "smile", label: "웃기", keep: "face" }, { id: "frown", label: "찡그리기", keep: "face" }, { id: "neutral", label: "무표정", keep: "face" }] },
];
export const CUES = CUE_GROUPS.flatMap(g => g.cues.map(c => ({ ...c, group: g.id })));
export const CUE_IDS = CUES.map(c => c.id);
export const cueById = Object.fromEntries(CUES.map(c => [c.id, c]));

export const MISSIONS = {
  honest: { label: "정직", text: "받은 돈의 절반 이상을 돌려주세요." },
  betray: { label: "배신", text: "상대가 많이 보내도록 만든 뒤, 20% 이하만 돌려주세요." },
};

// 결정 단계 문항 (1~7)
export const RATINGS = [
  { id: "presence", text: "상대가 나와 함께 있다고 느꼈다" },
  { id: "trust", text: "상대를 믿을 수 있다고 느꼈다" },
];

const COLORS = ["파란", "초록", "노란", "보라", "주황", "하얀", "빨간", "남색", "분홍", "회색"];
const ANIMALS = ["여우", "고래", "수달", "펭귄", "올빼미", "다람쥐", "판다", "거북", "고양이", "토끼", "사슴", "너구리"];
export const ALL_NICKS = COLORS.flatMap(c => ANIMALS.map(a => `${c} ${a}`));

export const pairId = (round, i) => `R${round}_P${String(i + 1).padStart(2, "0")}`;
export const seatId = (uid, round) => `${uid}_${round}`;

/** 판의 점수. send 는 0~ENDOW 정수, retPct 는 0~100 정수. */
export function payoff(send, retPct) {
  const pot = send * MULT;
  const ret = Math.round(pot * retPct / 100);
  return { pot, ret, inv: ENDOW - send + ret, tru: pot - ret };
}

function shuffle(a, rng) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 짝 맺기.
 * people: [{ uid, trusteeN, restN, partners: [uid] }]
 * 홀수면 쉰 적이 가장 적은 사람이 한 명 쉰다. 같은 상대를 다시 만나지 않게 여러 번 섞어 가장 나은 것을 고른다.
 * 역할은 수탁자를 덜 해 본 사람이 수탁자. 비밀 역할은 수탁자의 절반씩 (홀수면 남는 하나는 무작위).
 * 돌려주는 값: { pairs: [{ inv, tru, mission }], rest: uid | null }
 */
export function matchRound(people, { rng = Math.random, missions = true } = {}) {
  let pool = shuffle(people, rng);
  let rest = null;
  if (pool.length % 2) {
    const least = Math.min(...pool.map(p => p.restN || 0));
    rest = pool.find(p => (p.restN || 0) === least);
    pool = pool.filter(p => p !== rest);
  }
  // 「수탁자 횟수 − 투자자 횟수」가 작은 절반이 이번 판 수탁자, 나머지 절반이 투자자. 같은 값끼리는 무작위
  // (투자자 횟수 = 만난 상대 수 − 수탁자 횟수. 쉰 사람도 두 역할을 고르게 맡는다)
  const lean = p => 2 * (p.trusteeN || 0) - (p.partners || []).length;
  const sorted = pool.map(p => [p, rng()]).sort((a, b) => lean(a[0]) - lean(b[0]) || a[1] - b[1]).map(x => x[0]);
  const half = sorted.length / 2;
  const trs = sorted.slice(0, half), invs = sorted.slice(half);
  const met = (a, b) => (a.partners || []).includes(b.uid);
  let best = null, bestBad = Infinity;
  for (let t = 0; t < 80 && bestBad > 0; t++) {
    const order = t ? shuffle(invs, rng) : invs;
    const bad = trs.filter((tr, i) => met(tr, order[i])).length;
    if (bad < bestBad) { best = order; bestBad = bad; }
  }
  const pairs = trs.map((tr, i) => ({ inv: best[i].uid, tru: tr.uid }));
  const tags = shuffle(pairs.map((_, i) => (i % 2 ? "betray" : "honest")), rng);
  pairs.forEach((p, i) => { p.mission = missions ? tags[i] : null; });
  return { pairs, rest: rest ? rest.uid : null };
}

/** 학생이 정한 닉네임 다듬기 — 보이지 않는 문자를 빼고 공백을 하나로, 12자까지. 비면 "" */
export const NICK_MAX = 12;
export function cleanNick(v) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/\s+/g, " ").trim().slice(0, NICK_MAX);
}
export const nickKey = v => cleanNick(v).toLowerCase().replace(/\s/g, "");

/** 판마다 겹치지 않는 별명 n개 (닉네임이 없는 사람에게만 쓴다) */
export function nicks(n, rng = Math.random) {
  return shuffle(ALL_NICKS, rng).slice(0, n);
}

/** 짝 하나의 메시지에서 사람별 단서 횟수와 채팅 수 */
export function countCues(msgs, uid) {
  const out = Object.fromEntries(CUE_IDS.map(id => [id, 0]));
  let text = 0;
  for (const m of msgs) {
    if (m.by !== uid) continue;
    if (m.kind === "cue" && m.cue in out) out[m.cue] += 1;
    if (m.kind === "text") text += 1;
  }
  return { cues: out, total: CUE_IDS.reduce((s, id) => s + out[id], 0), text };
}

const clampInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/** 함수가 받은 결정 값 확인. 맞으면 저장할 값만, 틀리면 null */
export function cleanMove(role, body) {
  const out = {};
  for (const r of RATINGS) if (body[r.id] !== undefined) {
    if (!clampInt(body[r.id], 1, 7)) return null;
    out[r.id] = body[r.id];
  }
  if (role === "investor") {
    if (body.send !== undefined) { if (!clampInt(body.send, 0, ENDOW)) return null; out.send = body.send; }
    if (body.predict !== undefined) { if (!clampInt(body.predict, 0, 100)) return null; out.predict = body.predict; }
    if (body.guess !== undefined) { if (!(body.guess in MISSIONS)) return null; out.guess = body.guess; }
  } else if (role === "trustee") {
    if (body.ret !== undefined) { if (!clampInt(body.ret, 0, 100)) return null; out.ret = body.ret; }
  } else return null;
  return out;
}

/**
 * 공개할 때 짝 하나의 결과.
 * moves: { inv: {...}, tru: {...} } — 빠진 값은 missing 으로 표시하고 통계에서 뺀다
 */
export function settle(pair, moves, msgs) {
  const inv = moves?.inv || {}, tru = moves?.tru || {};
  const missing = [];
  if (!Number.isInteger(inv.send)) missing.push("send");
  if (!Number.isInteger(tru.ret)) missing.push("ret");
  const send = Number.isInteger(inv.send) ? inv.send : 0;
  const ret = Number.isInteger(tru.ret) ? tru.ret : 0;
  const p = payoff(send, ret);
  return {
    send, retPct: ret, ...p,
    predict: Number.isInteger(inv.predict) ? inv.predict : null,
    guess: inv.guess || null,
    mission: pair.mission || null,
    correct: pair.mission && inv.guess ? inv.guess === pair.mission : null,
    invRate: { presence: inv.presence ?? null, trust: inv.trust ?? null },
    truRate: { presence: tru.presence ?? null, trust: tru.trust ?? null },
    invCues: countCues(msgs, pair.inv),
    truCues: countCues(msgs, pair.tru),
    missing,
  };
}

const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const nums = a => a.filter(v => typeof v === "number" && Number.isFinite(v));

/** 현황판 통계. pairs: [{ round, cond, mission, result }] — result 가 있는 것만 센다 */
export function summarize(pairs) {
  const done = pairs.filter(p => p.result);
  const byCond = {};
  for (const c of Object.keys(CONDS)) {
    const ps = done.filter(p => p.cond === c);
    if (!ps.length) continue;
    const full = ps.filter(p => !p.result.missing?.includes("send"));
    const withRet = ps.filter(p => !p.result.missing?.includes("ret"));
    const guessed = ps.filter(p => p.result.correct !== null && p.result.correct !== undefined);
    byCond[c] = {
      n: ps.length,
      send: mean(full.map(p => p.result.send)),
      retPct: mean(withRet.map(p => p.result.retPct)),
      presence: mean(nums(ps.flatMap(p => [p.result.invRate?.presence, p.result.truRate?.presence]))),
      trust: mean(nums(ps.map(p => p.result.invRate?.trust))),
      hit: guessed.length ? guessed.filter(p => p.result.correct).length / guessed.length : null,
      guessedN: guessed.length,
    };
  }
  // 비밀 역할별 — 단서를 쓸 수 있던 판의 수탁자만
  const byMission = {};
  for (const m of Object.keys(MISSIONS)) {
    const ps = done.filter(p => p.mission === m);
    if (!ps.length) continue;
    const cuePs = ps.filter(p => CONDS[p.cond]?.cue);
    byMission[m] = {
      n: ps.length,
      cueN: cuePs.length,
      send: mean(ps.filter(p => !p.result.missing?.includes("send")).map(p => p.result.send)),
      retPct: mean(ps.filter(p => !p.result.missing?.includes("ret")).map(p => p.result.retPct)),
      trust: mean(nums(ps.map(p => p.result.invRate?.trust))),
      cueTotal: mean(cuePs.map(p => p.result.truCues?.total || 0)),
      textTotal: mean(ps.filter(p => CONDS[p.cond]?.text).map(p => p.result.truCues?.text || 0)),
      cues: Object.fromEntries(CUE_IDS.map(id => [id, mean(cuePs.map(p => p.result.truCues?.cues?.[id] || 0))])),
    };
  }
  return { byCond, byMission, pairs: done.length };
}
