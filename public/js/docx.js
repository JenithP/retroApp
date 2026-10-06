// 워드 문서(.docx) 만들기 — 외부 라이브러리 없이 브라우저에서 OOXML 을 직접 쓰고 무압축 zip 으로 묶는다.
//
// HTML 을 .doc 이름으로 내려 주면 워드는 「인터넷에서 받은 파일」의 제한된 보기에서 열지 못하는 일이 있고,
// 휴대폰 · 맥 · 한글은 아예 읽지 못하기도 한다. 진짜 .docx 는 어디서나 열린다.
//   docxBlob(bodyXml)  — <w:body> 안에 들어갈 XML 로 문서를 만든다 (6주차 vrcard)
//   htmlToDocx(html)   — 4 · 5주차 보고서 HTML(정해진 몇 가지 태그 · 클래스만)을 문서로 옮긴다

/* ── zip (무압축) ─────────────────────────────────────────── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

function zip(files, type) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), d = enc.encode(text), c = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(12, 0x21, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(14, 0x21, true); ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
    parts.push(h, n, d); central.push(ch, n); off += 30 + n.length + d.length;
  }
  const size = central.reduce((s, b) => s + b.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e], { type });
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const BODY_W = 9906;   // 본문 폭 (twip) — A4 11906 - 여백 1000 × 2

export function docxBlob(body) {
  const font = `<w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/>`;
  const x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    ["[Content_Types].xml", `${x}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ["_rels/.rels", `${x}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `${x}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["word/styles.xml", `${x}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`],
    ["word/document.xml", `${x}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ], DOCX);
}

/* ── 보고서 HTML → 문서 ──────────────────────────────────── */
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hex = c => { if (!c) return ""; c = c.replace("#", ""); return c.length === 3 ? c.split("").map(h => h + h).join("") : c; };
const twip = (v, whole) => { const m = /([\d.]+)\s*(pt|%)/.exec(v || ""); return m ? Math.round(m[2] === "%" ? whole * m[1] / 100 : m[1] * 20) : 0; };

function run(text, f) {
  const pr = (f.b ? "<w:b/>" : "") + (f.i ? "<w:i/>" : "") + (f.color ? `<w:color w:val="${f.color}"/>` : "") +
    (f.sz ? `<w:sz w:val="${Math.round(f.sz * 2)}"/><w:szCs w:val="${Math.round(f.sz * 2)}"/>` : "");
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

// 글자 단위 — b · i · small · br · span (.pt 는 h3 에서 따로 붙인다)
function inline(node, f) {
  let out = "";
  for (const n of node.childNodes) {
    if (n.nodeType === 3) {
      const t = n.data.replace(/[ \t\r\n]+/g, " ").replace(/ /g, " ");
      if (t) out += run(t, f);
    } else if (n.nodeType === 1) {
      const tag = n.tagName.toLowerCase();
      if (tag === "br") out += "<w:r><w:br/></w:r>";
      else if (tag === "span" && n.classList.contains("pt")) continue;
      else if (tag === "b" || tag === "strong") out += inline(n, { ...f, b: true });
      else if (tag === "i" || tag === "em") out += inline(n, { ...f, i: true, color: "888888" });
      else if (tag === "small") out += inline(n, { ...f, sz: Math.min(f.sz || 10.5, 9), color: "666666" });
      else out += inline(n, f);
    }
  }
  return out;
}

function para(runs, o = {}) {
  return `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}${o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="2" w:color="333333"/></w:pBdr>' : ""}<w:spacing w:before="${o.before || 0}" w:after="${o.after ?? 80}"/></w:pPr>${runs}</w:p>`;
}

function cellXml(inner, w, fill) {
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${inner}</w:tc>`;
}

function tableXml(widths, rows, after = 160) {
  const b = ["top", "left", "bottom", "right", "insideH", "insideV"].map(k => `<w:${k} w:val="single" w:sz="6" w:space="0" w:color="999999"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${BODY_W}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>` + para("", { after });
}

function table(el) {
  const trs = [...el.querySelectorAll("tr")];
  const n = Math.max(...trs.map(tr => tr.children.length));
  // 열 폭 — 첫 줄 칸의 style width (pt · %), table.t 는 첫 열 130pt, 나머지는 똑같이 나눈다
  const fixed = new Array(n).fill(0);
  [...(trs[0]?.children || [])].forEach((c, i) => { fixed[i] = twip(c.getAttribute("style"), BODY_W); });
  if (el.classList.contains("t") && !fixed[0]) fixed[0] = 2600;
  const used = fixed.reduce((s, v) => s + v, 0), free = fixed.filter(v => !v).length;
  const widths = fixed.map(v => v || Math.floor((BODY_W - used) / Math.max(1, free)));
  const height = el.classList.contains("ask") ? 1700 : 0;
  const rows = trs.map(tr => {
    const h = height || (tr.querySelector("td.write") ? 520 : 0);
    const cells = [...tr.children].map((c, i) => {
      const th = c.tagName.toLowerCase() === "th";
      const f = th ? { sz: 10, color: "444444" } : { sz: 10 };
      const fill = th ? "F2F4F6" : c.classList.contains("fill") ? "FFFDF0" : "";
      return cellXml(para(inline(c, f), { after: 0 }), widths[i], fill);
    });
    return `<w:tr>${h ? `<w:trPr><w:cantSplit/><w:trHeight w:val="${h}" w:hRule="atLeast"/></w:trPr>` : ""}${cells.join("")}</w:tr>`;
  });
  return tableXml(widths, rows, el.classList.contains("ask") ? 280 : 160);
}

function block(el) {
  const tag = el.tagName.toLowerCase(), cls = el.classList;
  if (tag === "h1") return para(inline(el, { b: true, sz: 16 }), { after: 40 });
  if (tag === "h2") return para(inline(el, { b: true, sz: 12.5 }), { before: 480, after: 120, keep: true, border: true });
  if (tag === "h3") {
    const pt = el.querySelector("span.pt");
    return para(inline(el, { b: true, sz: 11, color: "1A3A5C" }) + (pt ? run(`  (${pt.textContent.trim()})`, { sz: 9, color: "777777" }) : ""), { before: 300, after: 80, keep: true });
  }
  if (tag === "table") return table(el);
  if (tag === "p") {
    if (cls.contains("bridge")) return tableXml([BODY_W], [`<w:tr>${cellXml(para(inline(el, { sz: 9.5 }), { after: 0 }), BODY_W, "F7F9FB")}</w:tr>`]);
    if (cls.contains("sub")) return para(inline(el, { sz: 9.5, color: "555555" }), { after: 280 });
    if (cls.contains("lead")) return para(inline(el, { sz: 9.5, color: "444444" }), { after: 200, keep: true });
    const color = hex((/color:\s*(#[0-9a-fA-F]{3,6})/.exec(el.getAttribute("style") || "") || [])[1]);
    const sz = (/font-size:\s*([\d.]+)pt/.exec(el.getAttribute("style") || "") || [])[1];
    return para(inline(el, { color, sz: sz ? +sz : 0 }), { before: color ? 400 : 0 });
  }
  return [...el.children].map(block).join("");
}

export function htmlToDocx(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return docxBlob([...doc.body.children].map(block).join(""));
}

/** 만든 문서를 내려 준다. */
export function saveBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
