// 유형별 집계 — 결과 공개 화면(학생)과 현황판(교수)이 같이 쓴다.
import { TYPES, TYPE_KEYS, QUIZ, STATIONS, score } from "./data.js";

const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const pct = (n, d) => d ? n / d * 100 : null;

export function tallyTypes(people) {
  const out = {};
  for (const k of TYPE_KEYS) {
    const ps = Object.values(people).filter(p => p.type === k);
    const quizzed = ps.filter(p => p.quiz?.answers);
    const sc = quizzed.map(p => score(p.quiz.answers));
    const agents = ps.map(p => p.agent?.r1).filter(a => a && a.decision);
    out[k] = {
      n: ps.length,
      nQuiz: quizzed.length,
      score: avg(sc.map(s => s.total)),
      concept: avg(sc.map(s => s.개념 / s.n개념 * 100)),
      exp: avg(sc.map(s => s.체험 / s.n체험 * 100)),
      items: Object.fromEntries(QUIZ.map(q => [q.id, pct(quizzed.filter(p => p.quiz.answers[q.id] === q.a).length, quizzed.length)])),
      eff: Object.fromEntries(STATIONS.map(s => [s.id, avg(quizzed.map(p => p.quiz.eff?.[s.id]).filter(Boolean))])),
      help: avg(ps.map(p => p.help?.r1 || 0)),
      agentDetail: pct(agents.filter(a => a.detail).length, agents.length),
      agentFix: pct(agents.filter(a => a.decision === "fix").length, agents.length),
      minutes: avg(ps.map(p => Object.values(p.t?.r1 || {}).reduce((s, v) => s + v, 0) / 60)),
    };
  }
  const emo = Object.values(people).reduce((a, p) => ({ match: a.match + (p.emo?.match || 0), mismatch: a.mismatch + (p.emo?.mismatch || 0) }), { match: 0, mismatch: 0 });
  return { types: out, emo };
}

const f = (v, d = 0) => v == null ? "—" : v.toFixed(d);

/** 유형 셋을 가로 막대로 — rows: [{ ko, key, max, unit, digits }] */
export function barsHTML(t, rows) {
  return rows.map(r => `<div class="trow"><h4>${r.ko}${r.sub ? ` <small>${r.sub}</small>` : ""}</h4>${TYPE_KEYS.map(k => {
    const v = typeof r.key === "function" ? r.key(t.types[k]) : t.types[k][r.key];
    const w = v == null ? 0 : Math.max(0, Math.min(100, v / r.max * 100));
    return `<div class="tb"><span class="tl" style="color:${TYPES[k].color}">${TYPES[k].ko}</span><i><u style="width:${w}%;background:${TYPES[k].color}"></u></i><em>${f(v, r.digits || 0)}${r.unit || ""}</em></div>`;
  }).join("")}</div>`).join("");
}

export const RESULT_ROWS = [
  { ko: "확인 과제 점수", sub: `${QUIZ.length}문항`, key: "score", max: QUIZ.length, unit: "점", digits: 1 },
  { ko: "개념 문항 정답률", sub: "설명서로도 풀 수 있는 문항", key: "concept", max: 100, unit: "%" },
  { ko: "체험 문항 정답률", sub: "직접 해 봐야 풀 수 있는 문항", key: "exp", max: 100, unit: "%" },
  { ko: "설명할 수 있다 (평균)", sub: "1~5", key: t => { const v = Object.values(t.eff).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }, max: 5, digits: 1 },
  { ko: "예약 상세를 확인한 비율", sub: "1차 · 체험한 사람 중", key: "agentDetail", max: 100, unit: "%" },
  { ko: "도움 요청 (1인 평균)", sub: "1차", key: "help", max: 5, unit: "회", digits: 1 },
];
