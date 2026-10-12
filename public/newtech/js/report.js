// 실습보고서 — 내 기록과 조의 결과를 미리 적은 워드 문서(.docx)를 만들어 내려 준다.
//   1부 — 체험 조건과 내 기록 (자동)
//   2부 — 확인 과제 결과와 유형별 비교 (자동)
//   3부 — 우리 집 자동화 규칙 설계 (자동)
//   4부 — 조별 의견 (자동)
//   5부 — 온라인 강의 연결 질문 (학생이 씀)
//   6부 — 개인 의견
import { TYPES, TYPE_KEYS, STATIONS, QUIZ, EFFICACY, OPINION, WHEN, teamId, teamLabel, typeOf, score, evKo, actKo } from "./data.js";
import { tallyTypes } from "./stats.js";
import { docxBlob as docx, saveBlob, BODY_W as W } from "../../js/docx.js";

/* ── OOXML 조각 (6주차 보고서와 같은 모양) ─────────────────── */
const x = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const GREY = "6B7280", HEAD = "EEF1F4";
function r(text, o = {}) {
  const pr = (o.b ? "<w:b/>" : "") + (o.color ? `<w:color w:val="${o.color}"/>` : "") + (o.sz ? `<w:sz w:val="${o.sz * 2}"/><w:szCs w:val="${o.sz * 2}"/>` : "");
  return String(text == null ? "" : text).split("\n").map((ln, i) =>
    `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${x(ln)}</w:t></w:r>`).join("");
}
function p(runs, o = {}) {
  if (!String(runs).startsWith("<w:r>")) runs = r(runs);
  return `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}${o.border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>` : ""}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 80}"/>${o.align ? `<w:jc w:val="${o.align}"/>` : ""}</w:pPr>${runs}</w:p>`;
}
const h1 = t => p(r(t, { b: true, sz: 17 }), { after: 120 });
const h2 = t => p(r(t, { b: true, sz: 13 }), { before: 320, after: 120, keep: true, border: true });
const q = t => p(r(t, { b: true }), { before: 200, after: 60, keep: true });
const hint = t => t ? p(r(t, { sz: 9, color: GREY }), { after: 60, keep: true }) : "";
function cell(c, w, head) {
  const lines = Array.isArray(c) ? c : [[c, {}]];
  const body = lines.map(([t, o]) => p(r(t, { sz: 9, b: head, ...o }), { after: 0 })).join("") || p("");
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? `<w:shd w:val="clear" w:color="auto" w:fill="${HEAD}"/>` : ""}</w:tcPr>${body}</w:tc>`;
}
function table(widths, rows, o = {}) {
  const b = ["top", "left", "bottom", "right", "insideH", "insideV"].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="888888"/>`).join("");
  const tr = (row, i) => `<w:tr>${o.height ? `<w:trPr><w:trHeight w:val="${o.height}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>` : (i === 0 && o.head ? "<w:trPr><w:tblHeader/></w:trPr>" : "")}${row.map((c, j) => cell(c, widths[j], (o.head && i === 0) || (o.side && j === 0))).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>
<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.map(tr).join("")}</w:tbl>` + p("", { after: 60 });
}
const box = (h = 1800) => table([W], [[""]], { height: h });

/* ── 보고서 내용 ─────────────────────────────────────────── */
const min = s => s ? `${Math.round(s / 60)}분` : "—";
const f1 = v => v == null ? "—" : v.toFixed(1);
const f0 = v => v == null ? "—" : Math.round(v) + "%";
const DEC = { confirm: "그대로 확정", fix: "수정 요청" };
const yn = v => v ? "예" : "아니요";

export function build({ team, name, me = {}, people = {}, homes = {}, opinions = {} }) {
  const type = typeOf(team), T = TYPES[type];
  const t1 = me.t?.r1 || {}, t2 = me.t?.r2 || {};
  const a1 = me.agent?.r1, a2 = me.agent?.r2;
  const agentLine = a => a ? `상세 보기 ${yn(a.detail)} · 진행 과정 ${yn(a.steps)} · 결정 ${DEC[a.decision] || "미결정"}` : "체험 없음";

  // 1부
  const part1 = table([2600, W - 2600], [
    ["1차 체험 조건", `${T.ko} 유형 · ${T.name} — ${T.desc}`],
    ["1차 체험 시간", type === "C" ? `설명서 ${min(t1.manual)}` : STATIONS.map(s => `${s.ko} ${min(t1[s.id])}`).join(" · ")],
    ["2차 체험 시간", STATIONS.map(s => `${s.ko} ${min(t2[s.id])}`).join(" · ")],
    ["도움 요청", `1차 ${me.help?.r1 || 0}회 · 2차 ${me.help?.r2 || 0}회`],
    ["표정 판정과 실제 기분", `맞음 ${me.emo?.match || 0}회 · 다름 ${me.emo?.mismatch || 0}회`],
    ["예약 비서 (1차)", agentLine(a1)],
    ["예약 비서 (2차)", agentLine(a2)],
  ], { side: true });

  // 2부
  const ans = me.quiz?.answers || {};
  const sc = me.quiz ? score(ans) : null;
  const tt = tallyTypes(people).types;
  const part2 = me.quiz ? [
    table([650, 800, W - 3350, 1900], [["번호", "구분", "문항", "내 답"],
      ...QUIZ.map((qq, i) => [String(i + 1), qq.kind, qq.q, ans[qq.id] === qq.a ? "정답" : `오답 (정답: ${qq.opts[qq.a]})`])], { head: true }),
    p(`내 점수 ${sc.total} / ${QUIZ.length} · 개념 ${sc.개념}/${sc.n개념} · 체험 ${sc.체험}/${sc.n체험} · 설명할 수 있다 ${EFFICACY.map(e => `${STATIONS.find(s => s.id === e.id).ko} ${me.quiz.eff?.[e.id] || "—"}`).join(" · ")}`),
    q("유형별 결과 (반 전체)"),
    table([2400, ...TYPE_KEYS.map(() => Math.floor((W - 2400) / 3))], [
      ["", ...TYPE_KEYS.map(k => `${TYPES[k].ko} · ${TYPES[k].name}`)],
      ["확인 과제 점수 (평균)", ...TYPE_KEYS.map(k => f1(tt[k].score))],
      ["개념 문항 정답률", ...TYPE_KEYS.map(k => f0(tt[k].concept))],
      ["체험 문항 정답률", ...TYPE_KEYS.map(k => f0(tt[k].exp))],
      ["설명할 수 있다 (1~5)", ...TYPE_KEYS.map(k => f1(avgOf(tt[k].eff)))],
      ["예약 상세 확인 비율 (1차)", ...TYPE_KEYS.map(k => f0(tt[k].agentDetail))],
      ["도움 요청 (1인 평균, 1차)", ...TYPE_KEYS.map(k => f1(tt[k].help))],
    ], { head: true, side: true }),
  ].join("") : p("제출한 확인 과제 없음");

  // 3부
  const h = homes[teamId(team)] || {};
  const part3 = [
    table([2600, W - 2600], [["설계 목적", h.purpose || "(적지 않음)"]], { side: true }),
    (h.rules || []).length ? table([500, 1700, 1300, W - 3500], [["순서", "이벤트", "조건", "동작 · 이름"],
      ...h.rules.map((ru, i) => [String(i + 1), evKo(ru.ev), WHEN[ru.when] || "", `${(ru.acts || []).map(actKo).join(", ")}${ru.note ? ` 「${ru.note}」` : ""}`])], { head: true }) : p("저장된 규칙 없음"),
  ].join("");

  // 4부
  const op = opinions[teamId(team)] || {};
  const part4 = OPINION.map(o => q(o.q) + p(op[o.id] || "(작성 없음)")).join("");

  const QS = [
    ["1. 1차 체험에서 우리 조의 조건은 디지털 격차의 세 단계(접근 · 활용 · 결과) 가운데 어디에 해당했는지 쓰고, 그 조건이 확인 과제 결과에 어떤 영향을 주었는지 2부 표를 근거로 설명하십시오.", "온라인 14 · 15쪽"],
    ["2. 표정 판정이 실제 기분과 달랐던 경험을 쓰고, 그 경험을 표정으로 감정을 판단하는 기술에 대한 반론(Barrett et al., 2019)과 연결하여 설명하십시오.", "온라인 8쪽"],
    ["3. 스마트홈에서 기기가 예상과 다르게 작동한 이유를 찾은 과정을 쓰고, 이해 가능성(Bellotti & Edwards, 2001)의 관점에서 우리 집 규칙 설계에 반영한 점이나 반영할 점을 쓰십시오.", "온라인 9쪽 · 3부"],
    ["4. 예약 비서의 결과를 확인했는지, 확인했거나 확인하지 않은 이유는 무엇이었는지 쓰고, 자동화의 아이러니(Bainbridge, 1983)와 연결하여 설명하십시오.", "온라인 10 · 11쪽"],
    ["5. 실습 중 도움을 요청하거나 도움을 준 경험을 쓰고, 따뜻한 전문가(Bakardjieva, 2005) 개념으로 설명하십시오.", "온라인 17쪽"],
  ];

  const body = [
    h1("7주차 오프라인 실습보고서 — 신기술 인터페이스 체험 실습"),
    p(`${teamLabel(team)} · 이름 ${name || ""} · 학번 `),
    h2("1부. 체험 조건과 내 기록"), part1,
    h2("2부. 확인 과제 결과"), part2,
    h2("3부. 우리 집 자동화 규칙 설계"), part3,
    h2("4부. 조별 의견"), part4,
    h2("5부. 온라인 강의 연결 질문"),
    hint("질문마다 3~5문장으로 쓰십시오. 회색 줄은 참고할 7주차 온라인 자료 쪽 번호입니다."),
    ...QS.flatMap(([t, hh]) => [q(t), hint(hh), box()]),
    h2("6부. 개인 의견"),
    q("오늘 실습에서 새롭게 알게 된 점은 무엇이며, 앞으로 새 기술을 설계하거나 사용할 때 무엇을 고려해야 한다고 생각하는지 쓰십시오."), box(2400),
  ].join("");
  return docx(body);
}
const avgOf = o => { const v = Object.values(o || {}).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function download(data) {
  saveBlob(build(data), `7주차_실습보고서_${teamLabel(data.team)}_${(data.name || "").replace(/[\\/:*?"<>|]/g, "")}.docx`);
}
