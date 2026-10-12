// 실습보고서 — 내 기록과 조의 결과를 미리 적은 워드 문서(.docx)를 만들어 내려 준다.
//   1부 — 미션 조건과 내 미션 기록 · 보낸 쪽지 (자동)
//   2부 — 결과 보고와 유형별 비교 (자동)
//   3부 — 고양이 보리: 우리 조 규칙 · 기기 설정 · 집 관리 메모 (자동)
//   4부 — 조별 의견 (자동)
//   5부 — 온라인 강의 연결 질문 (학생이 씀)
//   6부 — 개인 의견
import { TYPES, TYPE_KEYS, STATIONS, QUIZ, EFFICACY, OPINION, WHEN, RESTAURANTS, familyReact, PRESET_SETTINGS, SETTINGS, teamId, teamLabel, typeOf, score, evKo, actKo, bookingCheck } from "./data.js";
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

export function build({ team, name, me = {}, people = {}, homes = {}, opinions = {}, notes = {}, uid = null }) {
  const type = typeOf(team), T = TYPES[type];
  const iv = r => { const x = me.emo?.[r]; return x?.attempts?.length ? `응시 ${x.attempts.length}회 · 최고 ${Math.max(...x.attempts.map(a => a.total))}점 · ${x.passed ? "합격" : "불합격"}` : "응시 없음"; };
  const hk = homes[teamId(team)]?.checks || {};
  const hc = r => { const x = hk[r]; return x ? `우리 조 집 ${x.ok}/5 · ${x.pass ? "성공" : "미해결"}` : "기록 없음"; };
  const ag = r => { const x = me.agent?.[r]; if (!x) return "기록 없음";
    const o = x.opened || {};
    return `${x.final ? `확정: ${RESTAURANTS[x.final.rest].name} · 조건 ${x.met}/7` : "확정 안 함"} · 상세 ${o.detail || 0}회 · 식당 정보 ${o.info || 0}회 · 진행 과정 ${o.trace || 0}회`; };

  // 1부
  const part1 = table([2600, W - 2600], [
    ["1차 미션 조건", `${T.ko} 유형 · ${T.name} — ${T.desc}`],
    ["인턴 면접", `1차 ${iv("r1")}
2차 ${iv("r2")}`],
    ["고양이 보리", `1차 ${hc("r1")}
2차 ${hc("r2")}`],
    ["가족 모임 예약", `1차 ${ag("r1")}
2차 ${ag("r2")}`],
    ["디지털 리터러시 물약", `1차 ${me.potion?.r1?.used || 0}개 · 2차 ${me.potion?.r2?.used || 0}개`],
    ["조원에게 물어봄", `1차 ${me.help?.r1 || 0}회 · 2차 ${me.help?.r2 || 0}회`],
  ], { side: true });
  const mySent = Object.values(notes).filter(n => uid && n.fromUid === uid).sort((a, b) => a.at - b.at);
  const sentT = mySent.length ? q("내가 보낸 쪽지") + table([900, 1100, W - 5000, 3000], [["받는 조", "미션", "질문", "받은 답"],
    ...mySent.map(n => [`${n.toTeam}조`, STATIONS.find(s => s.id === n.st)?.ko || "", n.text, n.reply ? `${n.replyTeam}조: ${n.reply}` : "(답 없음)"])], { head: true }) : p("보낸 쪽지 없음");
  const lastIv = [...(me.emo?.r2?.attempts || []), ...(me.emo?.r1?.attempts || [])].sort((a, b) => b.at - a.at)[0];
  const ivT = lastIv ? q("마지막 면접 평가 근거") + table([W], [[[...Object.entries({ 호감도: "likable", 진실성: "honest", 성실성: "diligent", "정서 안정성": "stable" }).map(([k, v]) => [`${k} ${lastIv.dims[v]}`, {}]),
    ...(lastIv.events || []).map(e => [e, { color: GREY }])]]]) : "";

  const famB = me.agent?.r2?.final || me.agent?.r1?.final;
  const famT = q("가족 모임 당일 — 가족 대화방") + table([1400, W - 1400], familyReact(famB).map(([w, t]) => [w, t]), { side: true });

  // 2부
  const ans = me.quiz?.answers || {};
  const sc = me.quiz ? score(ans) : null;
  const tt = tallyTypes(people, notes, homes).types;
  const optTxt = (qq, a) => qq.multi ? (Array.isArray(a) && a.length ? a.map(i => qq.opts[i]).join(", ") : "(선택 없음)") : (qq.opts[a] ?? "(선택 없음)");
  const part2 = me.quiz ? [
    table([500, W - 4500, 2000, 2000], [["번호", "문항", "내 답", "정답"],
      ...QUIZ.map((qq, i) => [String(i + 1), qq.q, optTxt(qq, ans[qq.id]), `${optTxt(qq, qq.a)} (${Math.round(sc.items[qq.id] * 100)}%)`])], { head: true }),
    p(`내 정답률 ${Math.round(sc.total / sc.n * 100)}% · 설명할 수 있다 ${EFFICACY.map(e => `${STATIONS.find(s => s.id === e.id).ko} ${me.quiz.eff?.[e.id] || "—"}`).join(" · ")}`),
    q("유형별 결과 (반 전체 · 1차)"),
    table([2700, ...TYPE_KEYS.map(() => Math.floor((W - 2700) / 3))], [
      ["", ...TYPE_KEYS.map(k => `${TYPES[k].ko} · ${TYPES[k].name}`)],
      ["인턴 면접 합격", ...TYPE_KEYS.map(k => f0(tt[k].pass))],
      ["고양이 보리 성공 (조)", ...TYPE_KEYS.map(k => f0(tt[k].home))],
      ["예약 조건 충족 (7개 중)", ...TYPE_KEYS.map(k => f1(tt[k].agentMet))],
      ["결과 보고 정답률", ...TYPE_KEYS.map(k => f0(tt[k].report))],
      ["설명할 수 있다 (1~5)", ...TYPE_KEYS.map(k => f1(avgOf(tt[k].eff)))],
      ["다른 조에 보낸 쪽지 (1인 평균)", ...TYPE_KEYS.map(k => f1(tt[k].notes))],
      ["답을 받은 쪽지 비율", ...TYPE_KEYS.map(k => f0(tt[k].replyRate))],
    ], { head: true, side: true }),
  ].join("") : p("제출한 결과 보고 없음");

  // 3부
  const h = homes[teamId(team)] || {};
  const set = { ...PRESET_SETTINGS, ...(h.settings || {}) };
  const part3 = [
    table([2600, W - 2600], [
      ["보리의 하루 (홈캠 기록)", ["r1", "r2"].filter(r => hk[r]).map(r => `${r === "r1" ? "1차" : "2차"} ${hk[r].ok}/5\n${hk[r].tests.map(x => (x.ok ? "○ " : "× ") + x.text).join("\n")}`).join("\n\n") || "기록 없음"],
      ["기기 설정", SETTINGS.map(x => `${x.ko} ${set[x.id] ? "켜짐" : "꺼짐"}`).join(" · ")],
      ["집 관리 메모", h.sms || "(작성 없음)"],
    ], { side: true }),
    (h.rules || []).length ? table([500, 1700, 1300, W - 3500], [["순서", "이벤트", "조건", "동작 · 이름"],
      ...h.rules.map((ru, i) => [String(i + 1), evKo(ru.ev), WHEN[ru.when] || "", `${(ru.acts || []).map(actKo).join(", ")}${ru.note ? ` 「${ru.note}」` : ""}`])], { head: true }) : p("저장된 규칙 없음"),
  ].join("");

  // 4부
  const op = opinions[teamId(team)] || {};
  const part4 = OPINION.map(o => q(o.q) + p(op[o.id] || "(작성 없음)")).join("");

  const QS = [
    ["1. 1차 미션에서 우리 조의 조건은 디지털 격차의 세 단계(접근 · 활용 · 결과) 가운데 어디에 해당했는지 쓰고, 그 조건이 미션 결과에 어떤 영향을 주었는지 2부 표를 근거로 설명하십시오.", "온라인 14 · 15쪽"],
    ["2. AI 면접이 표정으로 진실성 · 성실성 같은 성격을 판단하고, 읽은 감정에 따라 질문 난이도를 바꾼 것을 정서 컴퓨팅의 관점에서 설명하고, 이런 판단의 문제를 표정과 감정에 대한 반론(Barrett et al., 2019)과 EU AI법의 직장 내 감정 인식 금지와 연결하여 쓰십시오.", "온라인 8쪽 · 1부 평가 근거"],
    ["3. 보리에게 생긴 문제의 원인이 규칙 목록 밖(기기 설정)에도 숨어 있었고, 기기들이 사람을 기준으로 만들어져 있었던 것을 보이지 않는 컴퓨터(Weiser, 1991)와 이해 가능성(Bellotti & Edwards, 2001)의 관점에서 설명하고, 어떤 설계가 필요한지 쓰십시오.", "온라인 9쪽 · 3부"],
    ["4. 예약 비서가 말없이 바꾼 조건을 찾았는지, 찾았거나 놓친 이유는 무엇이었는지 쓰고, 자동화의 아이러니(Bainbridge, 1983)와 평가의 간극으로 설명하십시오.", "온라인 10 · 11쪽"],
    ["5. 쪽지로 다른 조에 묻거나 다른 조의 쪽지에 답한 경험을 쓰고, 어떤 답이 실제로 도움이 되었는지를 따뜻한 전문가(Bakardjieva, 2005) 개념으로 설명하십시오.", "온라인 17쪽 · 1부 내가 보낸 쪽지"],
  ];

  const body = [
    h1("7주차 오프라인 실습보고서 — 신기술 인터페이스 체험 실습"),
    p(`${teamLabel(team)} · 이름 ${name || ""} · 학번 `),
    h2("1부. 미션 조건과 내 기록"), part1, ivT, famT, sentT,
    h2("2부. 결과 보고"), part2,
    h2("3부. 고양이 보리 — 우리 조 규칙 · 기기 설정 · 메모"), part3,
    h2("4부. 조별 의견"), part4,
    h2("5부. 온라인 강의 연결 질문"),
    hint("질문마다 3~5문장으로 쓰십시오. 회색 줄은 참고할 7주차 온라인 자료 쪽 번호입니다."),
    ...QS.flatMap(([tq, hh]) => [q(tq), hint(hh), box()]),
    h2("6부. 개인 의견"),
    q("오늘 실습에서 새롭게 알게 된 점은 무엇이며, 앞으로 새 기술을 설계하거나 사용할 때 무엇을 고려해야 한다고 생각하는지 쓰십시오."), box(2400),
  ].join("");
  return docx(body);
}
const avgOf = o => { const v = Object.values(o || {}).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function download(data) {
  saveBlob(build(data), `7주차_실습보고서_${teamLabel(data.team)}_${(data.name || "").replace(/[\\/:*?"<>|]/g, "")}.docx`);
}
