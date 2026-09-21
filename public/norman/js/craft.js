// 제작대 — 재료 둘을 합쳐 연장을 만들고, 만든 연장을 물건 위에 끌어다 붙인다.
//
// 자리(해트)를 고르게 하지 않는다. 언제 보이는지는 만든 연장이 스스로 안다.
// 그래서 조가 할 일은 「어느 칸에 무엇을 넣을까」가 아니라
// 「무엇을 만들어 어디에 붙일까」가 된다.

import { MATERIALS, mat, combine, rebuff, recipeById } from "./parts.js";
import { ICONS, ICON_NAMES, svgOf } from "./icons.js";
import { purse, countMat, takeMat, giveMat } from "./wallet.js";
import { PART, allWorn } from "./app.js";

const slot = [null, null];
let ctx = null;

export function mount(c) { ctx = c; }

/* ── 그리기 ───────────────────────────────────────────────── */

export function paint() {
  const box = ctx.nodes.craft;
  const mine = MATERIALS.filter(m => countMat(m.id) > 0);
  const found = combine(slot[0], slot[1]);

  box.innerHTML = `
    <div class="cbench">
      <h2>제작대</h2>
      <p class="csub">재료 둘을 올려 합칩니다</p>
      <div class="cslots">
        <button class="cslot${slot[0] ? " full" : ""}" data-slot="0">${
          slot[0] ? mat(slot[0]).name : "재료"}</button>
        <span class="cplus">+</span>
        <button class="cslot${slot[1] ? " full" : ""}" data-slot="1">${
          slot[1] ? mat(slot[1]).name : "재료"}</button>
        <span class="cplus">→</span>
        <span class="cout${found ? " got" : ""}">${
          found ? found.name : (slot[0] && slot[1] ? "안 붙음" : "?")}</span>
      </div>
      ${found ? `<p class="cline">${found.line}</p>` : ""}
      <button class="big cmake" id="cmake"${found ? "" : " disabled"}>만든다</button>
    </div>

    <div class="cmats">
      <h3>내 재료 <small>눌러서 올립니다</small></h3>
      ${mine.length
        ? `<div class="mgrid">${mine.map(m =>
            `<button class="mchip" data-mat="${m.id}">
               <span>${m.name}</span><em>${countMat(m.id)}</em></button>`).join("")}</div>`
        : `<p class="cempty">재료가 없습니다. <b>상점</b>에 다녀오십시오.</p>`}
    </div>

    <div class="cworn">
      <h3>물건에 붙인 것 <small>×를 누르면 도로 떼어집니다</small></h3>
      ${wornList()}
    </div>

    <div class="ctools">
      <h3>만든 연장 <small>물건 위로 끌어다 놓습니다</small></h3>
      ${purse.tools.length
        ? `<div class="tlist">${purse.tools.map(toolChip).join("")}</div>`
        : `<p class="cempty">아직 만든 연장이 없습니다.</p>`}
    </div>`;
}

function wornList() {
  const w = allWorn(ctx.worn ? ctx.worn() : {});
  if (!w.length) return `<p class="cempty">아직 아무것도 붙이지 않았습니다.</p>`;
  const byPart = {};
  w.forEach(x => (byPart[x.part] = byPart[x.part] || []).push(x));
  return Object.entries(byPart).map(([part, list]) =>
    `<div class="wpart"><p class="wname">${PART(part)?.label || part}</p>
      ${list.map((x, i) => {
        const r = recipeById(x.recipe);
        return `<span class="wtag w-${r?.when}">${r?.name}${x.arg ? ` · ${x.arg}` : ""}
          <button class="wx" data-off="${part}:${i}" title="떼어 낸다">×</button></span>`;
      }).join("")}</div>`).join("");
}

function toolChip(t, i) {
  const r = recipeById(t.recipe);
  if (!r) return "";
  const needArg = r.id === "label" || r.id === "unit" || r.id === "toast" ||
                  r.id === "guide" || r.id === "bold";
  const needIcon = r.id === "iconbtn" || r.id === "state";
  return `<div class="tool w-${r.when}" data-tool="${i}" draggable="false">
      <span class="tname">${r.name}</span>
      <span class="twhen">${
        r.when === "idle" ? "늘 보임" : r.when === "touch" ? "닿을 때" : "하고 난 뒤"}</span>
      ${needArg ? `<input class="targ" data-targ="${i}" value="${t.arg || ""}"
          placeholder="무슨 글자" maxlength="14">` : ""}
      ${needIcon ? `<select class="targ" data-targ="${i}">
          <option value="">그림 고르기</option>
          ${Object.keys(ICONS).map(k =>
            `<option value="${k}"${t.arg === k ? " selected" : ""}>${ICON_NAMES[k]}</option>`
          ).join("")}</select>` : ""}
      <span class="ton">${r.on.map(k =>
        k === "input" ? "쓰는 칸" : k === "button" ? "누르는 곳" : "목록").join(" · ")}에</span>
    </div>`;
}

/* ── 누르기 ───────────────────────────────────────────────── */

document.addEventListener("click", e => {
  if (!ctx || ctx.nodes.craft.closest("[hidden]")) return;

  const m = e.target.closest("[data-mat]");
  if (m) {
    const id = m.dataset.mat;
    const k = slot[0] === null ? 0 : slot[1] === null ? 1 : 0;
    if (slot[k]) giveMat(slot[k]);
    if (!takeMat(id)) return;
    slot[k] = id;
    paint(); ctx.onChange?.();
    return;
  }

  const s = e.target.closest("[data-slot]");
  if (s) {
    const k = Number(s.dataset.slot);
    if (slot[k]) { giveMat(slot[k]); slot[k] = null; paint(); ctx.onChange?.(); }
    return;
  }

  if (e.target.closest("#cmake")) {
    const r = combine(slot[0], slot[1]);
    if (!r) return;
    purse.tools.push({ recipe: r.id, arg: "" });
    slot[0] = slot[1] = null;
    paint(); ctx.onChange?.();
    ctx.talk?.("norman", `「${r.name}」이 되었구먼. ${r.line} 물건 위에 끌어다 놓게.`);
    return;
  }
});

/** 안 붙는 짝을 올렸을 때 한 번만 일러 준다 */
let scolded = "";
export function checkPair() {
  if (!slot[0] || !slot[1]) return;
  const key = slot.join("+");
  if (combine(slot[0], slot[1]) || scolded === key) return;
  scolded = key;
  ctx.talk?.("norman", rebuff(slot[0], slot[1]));
}

document.addEventListener("input", e => {
  const t = e.target.closest("[data-targ]");
  if (!t || !ctx) return;
  purse.tools[Number(t.dataset.targ)].arg = t.value;
  ctx.onChange?.({ quiet: true });
});
document.addEventListener("change", e => {
  const t = e.target.closest("select[data-targ]");
  if (!t || !ctx) return;
  purse.tools[Number(t.dataset.targ)].arg = t.value;
  ctx.onChange?.();
});

/* ── 물건 위로 끌어다 놓기 ────────────────────────────────── */

export function drag(dragEl) {
  let live = null;

  document.addEventListener("pointerdown", e => {
    const src = e.target.closest(".tool");
    if (!src || e.target.closest("input, select")) return;
    e.preventDefault();
    const i = Number(src.dataset.tool);
    const t = purse.tools[i];
    const r = recipeById(t.recipe);
    live = { i, t, r };

    const g = src.cloneNode(true);
    g.classList.add("ghost");
    g.querySelectorAll("input, select").forEach(x => x.remove());
    dragEl.textContent = "";
    dragEl.appendChild(g);
    dragEl.hidden = false;
    dragEl.style.width = src.offsetWidth + "px";
    src.classList.add("lifted");
    document.body.classList.add("dragging");
    ctx.markTargets?.(r.on);
    move(e);
  });

  function move(e) {
    if (!live) return;
    dragEl.style.transform =
      `translate(${e.clientX - 70}px, ${e.clientY - 18}px)`;
    dragEl.style.visibility = "hidden";
    const u = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.visibility = "";
    const part = u?.closest?.(".part");
    document.querySelectorAll(".part.over").forEach(n => n.classList.remove("over"));
    live.drop = null;
    if (part && live.r.on.includes(PART(part.dataset.part)?.kind)) {
      part.classList.add("over");
      live.drop = part.dataset.part;
    }
  }

  document.addEventListener("pointermove", move);

  document.addEventListener("pointerup", e => {
    if (!live) return;
    const { i, t, r, drop } = live;
    live = null;
    dragEl.hidden = true;
    dragEl.textContent = "";           // 끌던 복제본을 치운다
    document.body.classList.remove("dragging");
    document.querySelectorAll(".part.over").forEach(n => n.classList.remove("over"));
    ctx.markTargets?.(null);

    if (!drop) {
      const u = document.elementFromPoint(e.clientX, e.clientY);
      const part = u?.closest?.(".part");
      if (part) ctx.talk?.("norman",
        `그건 ${r.on.map(k => k === "input" ? "쓰는 칸" : k === "button" ? "누르는 곳" : "목록")
          .join("이나 ")}에만 붙네.`);
      paint();
      return;
    }
    purse.tools.splice(i, 1);
    ctx.attach?.(drop, { recipe: t.recipe, arg: t.arg });
    paint();
  });
}

/** 물건에서 떼어 내면 제작대로 돌아온다 */
export function unattach(item) {
  purse.tools.push({ recipe: item.recipe, arg: item.arg });
  paint();
}
