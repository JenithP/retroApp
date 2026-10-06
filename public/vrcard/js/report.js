// 실습보고서 — 조가 입력한 내용을 미리 적은 워드 문서(.docx)를 만들어 내려 준다.
//   1부 — 우리 조 분류와 반 전체 비교 (자동)
//   2부 — 재설계안 (자동)
//   3부 — 받은 부작용과 대응책 · 우리가 붙인 부작용 (자동)
//   4부 — 온라인 강의 연결 질문 (질문마다 우리 조 입력 내용을 참고로 붙이고, 답은 학생이 쓴다)
//   5부 — 개인 의견
// HTML 을 .doc 이름으로 내려 주던 방식은 인터넷에서 받은 파일로 표시되면 워드 제한된 보기에서 열리지 않고,
// 휴대폰 · 맥 · 한글에서도 못 읽는 경우가 있어 진짜 .docx(OOXML)를 직접 만든다. 외부 라이브러리 없음.
import { CARDS, QUADS, WARNS, CHECKS, teamId, teamLabel, cardOf, theoryName, sideName, sideTargetOf, sideFromOf, sideDocId, pairOf } from "./data.js";
import { tally } from "./compare.js";

/* ── OOXML 조각 ─────────────────────────────────────────── */
const x = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const GREY = "6B7280", HEAD = "EEF1F4";
const W = 9906;   // 본문 폭 (twip) — A4 11906 - 여백 1000 × 2

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

/* ── 저장용 zip (무압축) ─────────────────────────────────── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), d = enc.encode(text), c = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
    parts.push(h, n, d); central.push(ch, n); off += 30 + n.length + d.length;
  }
  const size = central.reduce((s, b) => s + b.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function docx(body) {
  const font = `<w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/>`;
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`],
    ["word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ]);
}

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
    ["1. VR 칸 사례 1개 선택: 해당 착각(장소 착각 · 개연성 착각 · 몸의 착각) 및 그 착각이 훈련 · 치료 효과로 이어지는 과정",
      `온라인 7 · 8 · 9 · 18쪽 | 우리 조 VR 칸: ${list(byQ("vr"))}`],
    ["2. AR 안내 · AR · MR 훈련 칸 사례 1개 선택: 현행 방식의 분할 주의 장면 및 AR 정합 후 줄어드는 인지 처리",
      `온라인 11 · 12쪽 | 우리 조 AR 칸: ${list([...byQ("guide"), ...byQ("train")])}`],
    ["3. 현행 유지 칸 사례 1개 선택: 해당 경고 기준(⚠① 주의 터널링 · ⚠② 외재적 인지 부하) 및 VR · AR 적용 시 예상 문제",
      `온라인 14 · 20 · 21쪽 | 우리 조 현행 유지 칸: ${list(byQ("keep"))}`],
    ["4. 재설계안의 현실 동작 유지 부분과 현실 이탈 부분 구분 및 근거 (실재 기반 인터랙션 · 자연스러움과 마법 사이)",
      `온라인 16 · 17쪽 | 우리 조 기재: ${d.checks?.magic || "없음"}`],
    ["5. 재설계안의 몰입 요소 범위 결정 근거 (실재감과 학습 효과의 관계 — 수술 훈련과 과학 수업 결과 차이)",
      `온라인 20 · 21쪽 | 우리 조 기재: ${d.checks?.load || "없음"}`],
    ["6. 받은 부작용 1개의 원인이 되는 지각 · 인지 원리 및 같은 원리가 재설계안 장점으로 작용하는 지점",
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
    hint("작성 방법: 질문별 3~5문장 · 아래 회색 줄은 참고용 우리 조 입력 내용"),
    ...QS.flatMap(([t, h]) => [q(t), hint(h), box()]),

    h2("5부. 개인 의견"),
    q("1. 반 전체와 판단이 가장 다른 사례 및 우리 조의 판단 근거"), hint("참고: 1부 「불일치」 표시"), box(),
    q("2. 실습 후 달라진 VR · AR 적용 판단 기준"), box(),
  ].join("");
  return docx(body);
}

export function download(data) {
  const blob = build(data);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `6주차_실습보고서_${teamLabel(data.team)}_${(data.name || "").replace(/[\\/:*?"<>|]/g, "")}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
