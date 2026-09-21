// 제작대 — 재료 둘을 합쳐 단서를 만들고, 만든 단서를 화면 위에 끌어다 붙인다.
//
// 무엇과 무엇이 합쳐지는지, 재료가 정말 있는지, 그 자리에 붙을 수 있는지는
// 전부 서버가 판단한다. 이 파일은 「하겠다」고 말하고 돌아온 지갑을 그린다.

import { MATERIALS, mat, combine, rebuff, recipeById } from "./parts.js";
import { ICONS, ICON_NAMES } from "./icons.js";
import { purse, countMat, craft as makeTool, setArg, attach, detach } from "./wallet.js";
import { allWorn } from "./app.js";
import { bookHTML } from "./book.js";

const slot = [null, null];
let ctx = null, scolded = "";

export function mount(c) { ctx = c; }

/* ── 그리기 ───────────────────────────────────────────────── */

export function paint() {
  const box = ctx.nodes.craft;
  const mine = MATERIALS.filter(m => countMat(m.id) > 0);
  const found = combine(slot[0], slot[1]);

  box.innerHTML = `
    <div class="cbench">
      <h2>제작대</h2>
      <p class="csub">재료 두 개를 골라 단서를 만듭니다</p>
      <div class="cslots">
        <button class="cslot${slot[0] ? " full" : ""}" data-slot="0">${
          slot[0] ? mat(slot[0]).name : "재료"}</button>
        <span class="cplus">+</span>
        <button class="cslot${slot[1] ? " full" : ""}" data-slot="1">${
          slot[1] ? mat(slot[1]).name : "재료"}</button>
        <span class="cplus">→</span>
        <span class="cout${found ? " got" : ""}">${
          found ? found.name : (slot[0] && slot[1] ? "조합 없음" : "?")}</span>
      </div>
      ${found ? `<p class="cline">${found.line}</p>` : ""}
      <button class="big cmake" id="cmake"${found ? "" : " disabled"}>단서 만들기</button>
    </div>

    <div class="cmats">
      <h3>내 재료 <small>터치하면 조합대에 올라갑니다</small></h3>
      ${mine.length
        ? `<div class="mgrid">${mine.map(m =>
            `<button class="mchip" data-mat="${m.id}">
               <span>${m.name}</span><em>${countMat(m.id)}</em></button>`).join("")}</div>`
        : `<p class="cempty">재료가 없습니다. <b>상점</b>에서 재료를 사 오세요.</p>`}
    </div>

    <div class="cworn">
      <h3>화면에 붙인 단서 <small>×를 터치하면 떼어집니다</small></h3>
      ${wornList()}
    </div>

    <div class="ctools">
      <h3>만든 단서 <small>화면 위로 끌어다 놓습니다</small></h3>
      ${purse.tools.length
        ? `<div class="tlist">${purse.tools.map(toolChip).join("")}</div>`
        : `<p class="cempty">아직 만든 단서가 없습니다.</p>`}
    </div>

    ${bookHTML(!mine.length)}`;
}

function wornList() {
  const w = allWorn(purse.attached);
  if (!w.length) return `<p class="cempty">아직 아무것도 붙이지 않았습니다.</p>`;
  const byPart = {};
  w.forEach(x => (byPart[x.part] = byPart[x.part] || []).push(x));
  return Object.keys(byPart).map(part =>
    `<div class="wpart"><p class="wname">${
      ctx.labelOf ? ctx.labelOf(part) : part}</p>
      ${byPart[part].map((x, i) => {
        const r = recipeById(x.recipe);
        return `<span class="wtag w-${r ? r.when : ""}">${r ? r.name : "?"}${
          x.arg ? " · " + x.arg : ""}
          <button class="wx" data-off="${part}:${i}" title="떼어 낸다">×</button></span>`;
      }).join("")}</div>`).join("");
}

const NEEDS_TEXT = ["label", "unit", "toast", "guide", "bold"];
const NEEDS_ICON = ["iconbtn", "state"];

function toolChip(t, i) {
  const r = recipeById(t.recipe);
  if (!r) return "";
  return `<div class="tool w-${r.when}" data-tool="${i}">
      <span class="tname">${r.name}</span>
      <span class="twhen">${
        r.when === "idle" ? "처음부터 보임" : r.when === "touch" ? "손댈 때 보임" : "조작 후 보임"}</span>
      ${NEEDS_TEXT.indexOf(r.id) >= 0
        ? `<input class="targ" data-targ="${i}" value="${t.arg || ""}"
             placeholder="넣을 글자" maxlength="14">` : ""}
      ${NEEDS_ICON.indexOf(r.id) >= 0
        ? `<select class="targ" data-targ="${i}">
             <option value="">그림 고르기</option>
             ${Object.keys(ICONS).map(k =>
               `<option value="${k}"${t.arg === k ? " selected" : ""}>${
                 ICON_NAMES[k]}</option>`).join("")}</select>` : ""}
      <span class="ton">${r.on.map(k =>
        k === "input" ? "입력칸" : k === "button" ? "버튼·선택 항목" : "목록·막대"
      ).join(" · ")}에 붙일 수 있음</span>
    </div>`;
}

/* ── 터치하기 ───────────────────────────────────────────────── */

document.addEventListener("click", async function (e) {
  if (!ctx || ctx.nodes.craft.hidden || ctx.nodes.craft.closest("[hidden]")) return;

  const m = e.target.closest("[data-mat]");
  if (m) {
    const id = m.dataset.mat;
    const k = slot[0] === null ? 0 : slot[1] === null ? 1 : 0;
    // 같은 재료를 두 칸에 올리려면 두 개가 있어야 한다
    if (slot[1 - k] === id && countMat(id) < 2) {
      ctx.talk && ctx.talk("norman", `${mat(id).name}가 하나뿐입니다. 하나 더 사 오세요.`);
      return;
    }
    slot[k] = id;
    paint();
    if (slot[0] && slot[1] && !combine(slot[0], slot[1])) {
      const key = slot.join("+");
      if (scolded !== key) { scolded = key; ctx.talk && ctx.talk("norman", rebuff(slot[0], slot[1])); }
    }
    return;
  }

  const s = e.target.closest("[data-slot]");
  if (s) { slot[Number(s.dataset.slot)] = null; paint(); return; }

  if (e.target.closest("#cmake")) {
    const a = slot[0], b = slot[1];
    if (!combine(a, b)) return;
    try {
      const r = await makeTool(a, b);
      slot[0] = slot[1] = null;
      paint();
      ctx.onChange && ctx.onChange();
      ctx.talk && ctx.talk("norman",
        `「${r.name}」 단서를 만들었습니다. ${r.line} 화면의 알맞은 부분에 끌어다 놓으세요.`);
    } catch (err) {
      ctx.talk && ctx.talk("norman", String(err.message || err));
      paint();
    }
    return;
  }

  const x = e.target.closest("[data-off]");
  if (x) {
    const bits = x.dataset.off.split(":");
    try { await detach(bits[0], Number(bits[1])); } catch (err) {}
    paint();
    ctx.onChange && ctx.onChange();
  }
});

document.addEventListener("input", function (e) {
  const t = e.target.closest("input[data-targ]");
  if (!t || !ctx) return;
  clearTimeout(t._t);
  t._t = setTimeout(function () {
    setArg(Number(t.dataset.targ), t.value).then(function () {
      ctx.onChange && ctx.onChange({ quiet: true });
    });
  }, 400);
});

document.addEventListener("change", function (e) {
  const t = e.target.closest("select[data-targ]");
  if (!t || !ctx) return;
  setArg(Number(t.dataset.targ), t.value).then(function () {
    paint();
    ctx.onChange && ctx.onChange();
  });
});

/* ── 화면 위로 끌어다 놓기 ────────────────────────────────── */

export function drag(dragEl) {
  let live = null;

  document.addEventListener("pointerdown", function (e) {
    const src = e.target.closest(".tool");
    if (!src || e.target.closest("input, select")) return;
    e.preventDefault();
    const i = Number(src.dataset.tool);
    const t = purse.tools[i];
    if (!t) return;
    const r = recipeById(t.recipe);
    live = { i: i, r: r, drop: null };

    const g = src.cloneNode(true);
    g.classList.add("ghost");
    g.querySelectorAll("input, select").forEach(function (x) { x.remove(); });
    dragEl.textContent = "";
    dragEl.appendChild(g);
    dragEl.hidden = false;
    dragEl.style.width = src.offsetWidth + "px";
    src.classList.add("lifted");
    document.body.classList.add("dragging");
    ctx.markTargets && ctx.markTargets(r.on);
    move(e);
  });

  function move(e) {
    if (!live) return;
    dragEl.style.transform =
      "translate(" + (e.clientX - 70) + "px," + (e.clientY - 18) + "px)";
    dragEl.style.visibility = "hidden";
    const u = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.visibility = "";
    const part = u && u.closest ? u.closest(".part") : null;
    document.querySelectorAll(".part.over").forEach(function (n) { n.classList.remove("over"); });
    live.drop = null;
    if (part && ctx.canDrop && ctx.canDrop(part.dataset.part, live.r.id)) {
      part.classList.add("over");
      live.drop = part.dataset.part;
    }
  }

  document.addEventListener("pointermove", move);

  document.addEventListener("pointerup", async function () {
    if (!live) return;
    const job = live;
    live = null;
    dragEl.hidden = true;
    dragEl.textContent = "";
    document.body.classList.remove("dragging");
    document.querySelectorAll(".part.over").forEach(function (n) { n.classList.remove("over"); });
    ctx.markTargets && ctx.markTargets(null);

    if (!job.drop) {
      ctx.talk && ctx.talk("norman", "그건 " + job.r.on.map(function (k) {
        return k === "input" ? "입력칸" : k === "button" ? "버튼·선택 항목" : "목록·막대";
      }).join("이나 ") + "에만 붙일 수 있습니다.");
      paint();
      return;
    }
    try { await attach(job.i, job.drop); }
    catch (err) { ctx.talk && ctx.talk("norman", String(err.message || err)); }
    paint();
    ctx.onAttached && ctx.onAttached(job.drop, job.r);
  });
}
