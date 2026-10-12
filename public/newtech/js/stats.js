// 유형별 집계 — 결과 공개 화면(학생)과 현황판(교수)이 같이 쓴다.
import { TYPES, TYPE_KEYS, QUIZ, STATIONS, score, typeOf } from "./data.js";

const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const pct = (n, d) => d ? n / d * 100 : null;

export function tallyTypes(people, notes = {}, homes = {}) {
  const NS = Object.values(notes).filter(n => n.phase !== "r2");   // 1차의 쪽지만
  const out = {};
  for (const k of TYPE_KEYS) {
    const ps = Object.values(people).filter(p => p.type === k);
    const quizzed = ps.filter(p => p.quiz?.answers);
    const sc = quizzed.map(p => score(p.quiz.answers));
    const teams = [...new Set(ps.map(p => p.team))];
    const solved = teams.filter(t => homes["T" + String(t).padStart(2, "0")]?.checks?.r1?.pass);
    const sent = NS.filter(n => typeOf(n.fromTeam) === k);
    out[k] = {
      n: ps.length,
      nQuiz: quizzed.length,
      pass: pct(ps.filter(p => p.emo?.r1?.passed).length, ps.length),
      tried: pct(ps.filter(p => p.emo?.r1?.attempts?.length).length, ps.length),
      home: pct(solved.length, teams.length),
      agentMet: ps.length ? avg(ps.map(p => p.agent?.r1?.met || 0)) : null,
      agentAll: pct(ps.filter(p => p.agent?.r1?.met === 7).length, ps.length),
      report: avg(sc.map(s => s.total / s.n * 100)),
      items: Object.fromEntries(QUIZ.map(q => [q.id, avg(quizzed.map(p => score(p.quiz.answers).items[q.id] * 100))])),
      eff: Object.fromEntries(STATIONS.map(s => [s.id, avg(quizzed.map(p => p.quiz.eff?.[s.id]).filter(Boolean))])),
      help: avg(ps.map(p => p.help?.r1 || 0)),
      potion: avg(ps.map(p => p.potion?.r1?.used || 0)),
      notes: ps.length ? sent.length / ps.length : null,
      replyRate: pct(sent.filter(n => n.reply).length, sent.length),
    };
  }
  return { types: out };
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
  { ko: "인턴 면접 합격", sub: "1차 · 조원 중 비율", key: "pass", max: 100, unit: "%" },
  { ko: "고양이 보리 성공", sub: "1차 · 조 단위", key: "home", max: 100, unit: "%" },
  { ko: "예약 조건 충족", sub: "1차 · 7개 중 평균", key: "agentMet", max: 7, unit: "개", digits: 1 },
  { ko: "결과 보고 정답률", sub: "개인별", key: "report", max: 100, unit: "%" },
  { ko: "설명할 수 있다 (평균)", sub: "1~5", key: t => { const v = Object.values(t.eff).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }, max: 5, digits: 1 },
  { ko: "다른 조에 보낸 쪽지 (1인 평균)", sub: "1차", key: "notes", max: 4, unit: "개", digits: 1 },
  { ko: "답을 받은 쪽지 비율", sub: "1차", key: "replyRate", max: 100, unit: "%" },
  { ko: "물약 사용 (1인 평균)", sub: "1차 · 가 유형만 받음", key: "potion", max: 6, unit: "개", digits: 1 },
  { ko: "조원에게 물어봄 (1인 평균)", sub: "1차", key: "help", max: 5, unit: "회", digits: 1 },
];
