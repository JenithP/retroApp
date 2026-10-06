// 실습보고서 — 조가 입력한 내용을 미리 적은 워드 문서(.docx)를 만들어 내려 준다.
//   1부 — 우리 조 분류와 반 전체 비교 (자동)
//   2부 — 재설계안 (자동)
//   3부 — 받은 부작용과 대응책 · 우리가 붙인 부작용 (자동)
//   4부 — 온라인 강의 연결 질문 (질문마다 우리 조 입력 내용을 참고로 붙이고, 답은 학생이 쓴다)
//   5부 — 개인 의견
// 진짜 .docx(OOXML)를 직접 쓴다 — 묶기와 내려받기는 공용 모듈(../../js/docx.js).
import { CARDS, QUADS, WARNS, CHECKS, teamId, teamLabel, cardOf, theoryName, sideName, sideTargetOf, sideFromOf, sideDocId, pairOf } from "./data.js";
import { tally } from "./compare.js";
import { docxBlob as docx, saveBlob, BODY_W as W } from "../../js/docx.js";

/* ── OOXML 조각 ─────────────────────────────────────────── */
const x = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const GREY = "6B7280", HEAD = "EEF1F4";

// r("글자", { b, sz, color }) — sz 는 pt
function r(text, o = {}) {
  const pr = (o.b ? "<w:b/>" : "") + (o.color ? `<w:color w:val="${o.color}"/>` : "") + (o.sz ? `<w:sz w:val="${o.sz * 2}"/><w:szCs w:val="${o.sz * 2}"/>` : "");
  return String(text == null ? "" : text).split("\n").map((ln, i) =>
    `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${x(ln)}</w:t></w:r>`).join("");
}
// p(r(…) 결과 | "글자", { before, after, keep, align })
function p(runs, o = {}) {
  if (!String(runs).startsWith("<w:r>")) runs = r(runs);
  return `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}${o.border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>` : ""}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 80}"/>${o.align ? `<w:jc w:val="${o.align}"/>` : ""}</w:pPr>${runs}</w:p>`;
}
const h1 = t => p(r(t, { b: true, sz: 17 }), { after: 120 });
const h2 = t => p(r(t, { b: true, sz: 13 }), { before: 320, after: 120, keep: true, border: true });
const q = t => p(r(t, { b: true }), { before: 200, after: 60, keep: true });
const hint = t => t ? p(r(t, { sz: 9, color: GREY }), { after: 60, keep: true }) : "";

// cell 내용: 문자열 또는 [[글자, opts], …] (줄 단위)
function cell(c, w, head) {
  const lines = Array.isArray(c) ? c : [[c, {}]];
  const body = lines.map(([t, o]) => p(r(t, { sz: 9, b: head, ...o }), { after: 0 })).join("") || p("");
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? `<w:shd w:val="clear" w:color="auto" w:fill="${HEAD}"/>` : ""}</w:tcPr>${body}</w:tc>`;
}
// table(폭 배열, 행 배열, { head: 첫 행 머리줄, side: 첫 열 머리칸, height })
function table(widths, rows, o = {}) {
  const b = ["top", "left", "bottom", "right", "insideH", "insideV"].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="888888"/>`).join("");
  const tr = (row, i) => `<w:tr>${o.height ? `<w:trPr><w:trHeight w:val="${o.height}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>` : (i === 0 && o.head ? "<w:trPr><w:tblHeader/></w:trPr>" : "")}${row.map((c, j) => cell(c, widths[j], (o.head && i === 0) || (o.side && j === 0))).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>
<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.map(tr).join("")}</w:tbl>` + p("", { after: 60 });
}
const box = (h = 1800) => table([W], [[""]], { height: h });

/* ── 보고서 내용 ─────────────────────────────────────────── */
const qName = k => k ? QUADS[k].ko : "—";
const warnText = w => (w || []).map(n => n === 1 ? "⚠①" : "⚠②").join(" ");
const list = a => a.length ? a.join(", ") : "없음";

export function build({ team, name, boards, designs, sides }) {
  const my = boards[teamId(team)]?.cards || {};
  const pc = boards[teamId(pairOf(team))]?.cards || {};
  const T = tally(boards);
  const top = t => { const k = Object.keys(t.n).sort((a, b) => t.n[b] - t.n[a])[0]; return t.total ? `${QUADS[k].ko} (${t.n[k]}/${t.total}조)` : "—"; };
  const title = id => my[id]?.title || cardOf(id).title;

  // 1부
  const rows = CARDS.map(c => {
    const v = my[c.id] || {}, t = T.find(y => y.card.id === c.id);
    const same = v.q && t.total && t.n[v.q] === Math.max(...Object.values(t.n));
    return [c.id, c.title, qName(v.q), warnText(v.warn), theoryName(v.theory) || v.theoryOther || "", v.why || "",
      qName(pc[c.id]?.q) + ((pc[c.id]?.q || null) !== (v.q || null) ? " ◀" : ""), top(t) + (v.q && !same ? " ◀ 불일치" : "")];
  });
  const custom = Object.entries(my).filter(([k, v]) => k.startsWith("c") && !v.removed && v.title).map(([, v]) =>
    ["+", [[v.title, {}], [v.desc || "", { color: GREY }]], qName(v.q), warnText(v.warn), theoryName(v.theory) || v.theoryOther || "", v.why || "", "—", "우리 조 사례"]);
  const byQ = k => Object.keys(my).filter(id => my[id]?.q === k && !my[id]?.removed).map(id => `${/^\d+$/.test(id) ? id + ". " : ""}${title(id)}`);

  // 2부
  const d = designs[teamId(team)] || {};
  const design = d.card ? table([2600, W - 2600], [
    ["선택 사례", `${title(d.card)} → ${d.kind || ""}`],
    ["사용자 · 시점 · 장소", d.who || ""], ["현행 방식의 문제", d.pain || ""], ["적용 화면 설명", d.change || ""], ["근거 이론", theoryName(d.theory)],
    ...CHECKS.map(k => [[[k.ko, { b: true }], [k.q, { b: false, color: GREY }]], d.checks?.[k.id] || ""]),
  ], { side: true }) + hint("화면 목업: 웹 화면(재설계 · 부작용 검토 단계)에서 확인") : p("제출 설계안 없음");

  // 3부
  const from = sideFromOf(team), target = sideTargetOf(team);
  const got = sides[sideDocId(team, from)], gave = sides[sideDocId(target, team)];
  const gotT = got?.items?.length ? table([1700, 4300, W - 6000], [["부작용", "내용", "우리 조 대응책"], ...got.items.map((v, i) => [sideName(v.kind), v.note || "", got.replies?.[i] || ""])], { head: true }) : p("받은 부작용 없음");
  const gaveT = gave?.items?.length ? table([1700, W - 1700], [["부작용", "내용"], ...gave.items.map(v => [sideName(v.kind), v.note || ""])], { head: true }) : p("입력한 부작용 없음");

  // 4부 — 질문마다 참고할 우리 조 입력 내용을 붙인다 (쪽 번호: 「6주차_온라인_신규」 슬라이드 번호)
  const QS = [
    ["1. 우리 조가 VR 칸에 놓은 사례 하나를 고르십시오. 그 사례에서 사용자가 겪을 착각이 장소 착각 · 개연성 착각 · 몸의 착각 가운데 무엇이라고 생각하는지, 그 착각이 어떻게 훈련이나 치료 효과로 이어지는지 쓰십시오.",
      `온라인 7 · 8 · 9 · 18쪽 | 우리 조 VR 칸: ${list(byQ("vr"))}`],
    ["2. 우리 조가 AR 안내 또는 AR · MR 훈련 칸에 놓은 사례 하나를 고르십시오. 지금 방식에서 사용자가 정보와 대상을 번갈아 보아야 하는 장면(분할 주의)을 찾고, AR로 정보를 대상 위에 겹쳐 보여 주면 무엇이 줄어든다고 생각하는지 쓰십시오.",
      `온라인 11 · 12쪽 | 우리 조 AR 칸: ${list([...byQ("guide"), ...byQ("train")])}`],
    ["3. 우리 조가 현행 유지 칸에 놓은 사례 하나를 고르십시오. 그 사례에 VR이나 AR을 적용하면 어떤 문제가 생길 것이라고 생각하는지, 경고 기준(⚠① 주의 터널링 · ⚠② 외재적 인지 부하) 가운데 어느 쪽에 해당하는지 밝혀 쓰십시오.",
      `온라인 14 · 20 · 21쪽 | 우리 조 현행 유지 칸: ${list(byQ("keep"))}`],
    ["4. 우리 조 재설계안에서 현실의 동작을 그대로 살린 부분과 현실에서 벗어나게 만든 부분은 각각 무엇입니까? 그렇게 나눈 까닭을 실재 기반 인터랙션의 관점에서 쓰십시오.",
      `온라인 16 · 17쪽 | 우리 조 기재: ${d.checks?.magic || "없음"}`],
    ["5. 우리 조 재설계안에 몰입 요소를 어디까지 넣었는지, 그 범위가 적절하다고 생각하는 까닭을 쓰십시오. 수술 훈련에서는 효과가 있었지만 과학 수업에서는 학습이 줄어든 연구 결과를 근거로 드십시오.",
      `온라인 20 · 21쪽 | 우리 조 기재: ${d.checks?.load || "없음"}`],
    ["6. 짝 조에게 받은 부작용 하나를 고르십시오. 그 부작용이 어떤 지각 · 인지 원리 때문에 생긴다고 생각하는지 쓰고, 같은 원리가 우리 설계안의 장점으로는 어떻게 작용하는지도 쓰십시오.",
      `온라인 15쪽 | 받은 부작용: ${list((got?.items || []).map(v => sideName(v.kind)))}`],
  ];

  const body = [
    h1("6주차 오프라인 실습보고서 — VR · AR 적용 판단 실습"),
    p(`${teamLabel(team)} · 이름 ${name || ""} · 학번 `),
    p(r(`분류 기준 — 세로: 신체 반응 필요 여부(실재감 · 체화) / 가로: 현실 사물과의 정보 결합 필요 여부(분할 주의 · 정합)\n경고 기준 — ⚠① ${WARNS[0].ko} (${WARNS[0].ref}) · ⚠② ${WARNS[1].ko} (${WARNS[1].ref})`, { sz: 9, color: GREY })),

    h2("1부. 우리 조 분류 · 반 전체 비교"),
    table([450, 1500, 1000, 650, 1150, 2556, 1100, 1500],
      [["번호", "사례", "우리 조 배치", "경고 기준", "근거 이론", "이유", `짝 조(${teamLabel(pairOf(team))})`, "반 전체 최다 배치"], ...rows, ...custom], { head: true }),

    h2("2부. 재설계안"), design,

    h2("3부. 부작용 · 대응책"),
    q(`받은 부작용 (입력: ${teamLabel(from)})`), gotT,
    q(`입력한 부작용 (대상: ${teamLabel(target)} 설계안)`), gaveT,

    h2("4부. 온라인 강의 연결 질문"),
    hint("질문마다 3~5문장으로 쓰십시오. 질문 아래 회색 줄은 참고할 쪽 번호와 우리 조가 입력한 내용입니다."),
    ...QS.flatMap(([t, h]) => [q(t), hint(h), box()]),

    h2("5부. 개인 의견"),
    q("1. 우리 조의 판단이 반 전체와 가장 달랐던 사례는 무엇입니까? 우리 조가 그렇게 판단한 근거를 쓰고, 지금 다시 판단한다면 어느 칸에 놓을지 쓰십시오."), hint("참고: 1부 「불일치」 표시"), box(),
    q("2. 이번 실습을 하기 전과 후에 VR · AR을 적용할지 판단하는 기준이 어떻게 달라졌다고 생각하는지 쓰십시오."), box(),
  ].join("");
  return docx(body);
}

export function download(data) {
  saveBlob(build(data), `6주차_실습보고서_${teamLabel(data.team)}_${(data.name || "").replace(/[\\/:*?"<>|]/g, "")}.docx`);
}
