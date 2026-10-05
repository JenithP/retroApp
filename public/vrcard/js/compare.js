// 반 전체 비교 — 카드마다 조들이 어느 칸에 놓았는지. 학생 「공유」 화면과 현황판이 같이 쓴다.
import { CARDS, QUADS, QUAD_KEYS, WARNS, teamLabel, theoryName, cardDone, cardImg } from "./data.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// boards: { T01: {cards:{...}}, ... }
export function tally(boards) {
  return CARDS.map(c => {
    const n = { vr: 0, train: 0, keep: 0, guide: 0 }, warn = { 1: 0, 2: 0 }, rows = [];
    Object.entries(boards || {}).forEach(([id, b]) => {
      const x = b?.cards?.[c.id];
      if (!x?.q) return;
      n[x.q]++;
      (x.warn || []).forEach(w => warn[w] = (warn[w] || 0) + 1);
      rows.push({ team: Number(id.slice(1)), ...x });
    });
    const total = QUAD_KEYS.reduce((a, k) => a + n[k], 0);
    const top = Math.max(0, ...QUAD_KEYS.map(k => n[k]));
    const split = total ? 1 - top / total : 0;   // 0 = 모두 같은 칸, 클수록 갈림
    return { card: c, n, warn, total, split, rows: rows.sort((a, b) => a.team - b.team) };
  });
}

export function renderCompare(box, boards, { myTeam = null, order = "split", open = null, onToggle = null } = {}) {
  const T = tally(boards);
  const list = order === "split" ? [...T].sort((a, b) => b.split - a.split || a.card.id - b.card.id) : T;
  box.innerHTML = `<div class="cmp-legend">${QUAD_KEYS.map(k => `<span><i style="background:${QUADS[k].color}"></i>${esc(QUADS[k].ko)}</span>`).join("")}
      <span class="muted">⚠① ${esc(WARNS[0].ko)} · ⚠② ${esc(WARNS[1].ko)}</span></div>` +
    list.map(r => {
      const mine = myTeam ? (boards?.["T" + String(myTeam).padStart(2, "0")]?.cards?.[r.card.id]?.q) : null;
      const segs = r.total ? QUAD_KEYS.filter(k => r.n[k]).map(k =>
        `<span class="seg" style="flex:${r.n[k]};background:${QUADS[k].color}" title="${esc(QUADS[k].ko)} ${r.n[k]}조">${r.n[k]}</span>`).join("") : `<span class="seg none">아직 없음</span>`;
      const tag = r.total >= 3 && r.split >= 0.45 ? `<em class="hot">갈림</em>` : "";
      const isOpen = open === r.card.id;
      return `<div class="cmp-row${isOpen ? " open" : ""}" data-id="${r.card.id}">
        <button type="button" class="cmp-head">
          <span class="cmp-t">${cardImg(r.card.id) ? `<img class="cimg" src="${cardImg(r.card.id)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<b>${r.card.id}</b> ${esc(r.card.title)} ${tag}</span>
          <span class="cmp-bar">${segs}</span>
          <span class="cmp-w">${r.warn[1] ? `⚠① ${r.warn[1]}` : ""} ${r.warn[2] ? `⚠② ${r.warn[2]}` : ""}</span>
          <span class="cmp-me">${mine ? `우리 조 <i style="background:${QUADS[mine].color}"></i>${esc(QUADS[mine].ko)}` : ""}</span>
        </button>
        ${isOpen ? `<ol class="cmp-why">${r.rows.map(x => `<li><b>${teamLabel(x.team)}</b>
            <span class="qchip" style="background:${QUADS[x.q].color}">${esc(QUADS[x.q].ko)}</span>
            ${(x.warn || []).map(w => `<span class="wchip">⚠${w === 1 ? "①" : "②"}</span>`).join("")}
            <span class="th">${esc(theoryName(x.theory) || x.theoryOther || "")}</span>
            <span>${esc(x.why || "")}</span>${cardDone(x) ? "" : `<small> (근거 미완성)</small>`}</li>`).join("") || `<li class="muted">아직 없음</li>`}</ol>` : ""}
      </div>`;
    }).join("");
  box.querySelectorAll(".cmp-head").forEach(b => b.onclick = () => {
    const id = b.parentElement.dataset.id;
    onToggle?.(open === id ? null : id);
  });
}
