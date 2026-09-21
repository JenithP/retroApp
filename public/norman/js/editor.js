// 연장대와 자리 — 끌어다 붙이고, 빼내고, 순서를 바꾸는 곳.
//
// 붙는 것은 무엇이든 어디에든 붙는다. 막지 않는다.
// 엉뚱한 자리에 놓은 단서가 왜 쓸모없는지는 시연에서 드러난다.

import { BLOCKS, CATS, HATS, ICONS, byId } from "./blocks.js";

const ctx = { scripts: null, sel: null, onChange: () => {}, nodes: {} };

/* ── 연장대 ───────────────────────────────────────────────── */

export function paint(nodes, scripts, onChange) {
  ctx.nodes = nodes;
  ctx.scripts = scripts;
  ctx.onChange = onChange;

  nodes.cats.textContent = "";
  for (const [id, c] of Object.entries(CATS)) {
    const t = document.createElement("span");
    t.className = "cat c-" + id;
    t.innerHTML = `<i></i>${c.name}<small>${c.desc}</small>`;
    nodes.cats.appendChild(t);
  }

  nodes.palette.textContent = "";
  for (const b of BLOCKS) nodes.palette.appendChild(chip(b, null));
}

/** 연장대에 걸린 한 개. 끌면 복제본이 따라온다. */
function chip(b) {
  const n = document.createElement("div");
  n.className = "pblock c-" + b.cat;
  n.dataset.block = b.id;
  n.innerHTML = `<span class="bname">${b.name}</span>`;
  if (b.arg) n.insertAdjacentHTML("beforeend", `<span class="bslot"></span>`);
  return n;
}

/* ── 자리(해트)와 거기 쌓인 단서 ──────────────────────────── */

export function hats(el) {
  const box = ctx.nodes.hats;
  box.textContent = "";
  ctx.sel = el;
  if (!el) { box.innerHTML = `<p class="nopick">부품을 고르면 자리가 열립니다.</p>`; return; }

  for (const h of HATS) {
    const wrap = document.createElement("section");
    wrap.className = "hat g-" + (h.gulf === "평가" ? "eval" : h.gulf === "실행" ? "exec" : "limit");
    wrap.dataset.hat = h.id;
    wrap.innerHTML =
      `<header class="hathead">
         <b>${h.name}</b><span>${h.desc}</span>
         <em class="gulf">${h.gulf}</em>
       </header>
       <div class="stack" data-hat="${h.id}"></div>`;
    const stack = wrap.querySelector(".stack");

    const list = ctx.scripts[el]?.[h.id] || [];
    if (!list.length) stack.appendChild(empty(h));
    list.forEach((item, i) => stack.appendChild(placed(item, el, h.id, i)));

    box.appendChild(wrap);
  }
}

function empty(h) {
  const n = document.createElement("p");
  n.className = "hollow";
  n.dataset.gulf = h.gulf;
  n.textContent = "비어 있음";
  return n;
}

/** 자리에 붙은 한 개. 값 칸이 있으면 여기서 바로 적는다. */
function placed(item, el, hat, i) {
  const b = byId(item.block);
  const n = document.createElement("div");
  n.className = "sblock c-" + b.cat;
  n.dataset.block = b.id;
  n.dataset.idx = i;
  n.innerHTML = `<span class="bname">${b.name}</span>`;

  if (b.arg?.kind === "text") {
    const inp = document.createElement("input");
    inp.className = "barg";
    inp.value = item.arg || "";
    inp.placeholder = b.arg.ph;
    inp.maxLength = b.arg.max || 20;
    inp.addEventListener("input", () => {
      ctx.scripts[el][hat][i].arg = inp.value;
      ctx.onChange({ keepFocus: true });
    });
    n.appendChild(inp);
  }

  if (b.arg?.kind === "icon") {
    const sel = document.createElement("select");
    sel.className = "barg";
    sel.innerHTML = `<option value="">고르기</option>` +
      Object.keys(ICONS).map(k => `<option value="${k}">${k}</option>`).join("");
    sel.value = item.arg || "";
    sel.addEventListener("change", () => {
      ctx.scripts[el][hat][i].arg = sel.value;
      ctx.onChange({});
    });
    n.appendChild(sel);
  }

  const x = document.createElement("button");
  x.className = "bx";
  x.title = "빼낸다";
  x.textContent = "×";
  x.addEventListener("click", ev => {
    ev.stopPropagation();
    ctx.scripts[el][hat].splice(i, 1);
    ctx.onChange({});
  });
  n.appendChild(x);

  return n;
}

/* ── 끌어다 붙이기 ────────────────────────────────────────── */

export function drag(dragEl) {
  let live = null;   // { id, from, ghost, gap }

  const gapNode = () => {
    const g = document.createElement("div");
    g.className = "gap";
    return g;
  };

  document.addEventListener("pointerdown", e => {
    const src = e.target.closest(".pblock, .sblock");
    if (!src) return;
    if (e.target.closest("input, select, button")) return;   // 값 칸은 끌리지 않는다
    if (!ctx.sel && src.classList.contains("pblock")) return;

    e.preventDefault();
    const id = src.dataset.block;
    const from = src.classList.contains("sblock")
      ? { hat: src.closest(".stack").dataset.hat, idx: Number(src.dataset.idx) }
      : null;

    const ghost = src.cloneNode(true);
    ghost.classList.add("ghost");
    ghost.querySelectorAll("input, select, button").forEach(x => x.remove());
    dragEl.textContent = "";
    dragEl.appendChild(ghost);
    dragEl.hidden = false;
    dragEl.style.width = src.offsetWidth + "px";

    live = { id, from, gap: gapNode() };
    if (from) src.classList.add("lifted");
    move(e);
    document.body.classList.add("dragging");
  });

  function move(e) {
    if (!live) return;
    dragEl.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 16}px)`;

    dragEl.style.visibility = "hidden";
    const under = document.elementFromPoint(e.clientX, e.clientY);
    dragEl.style.visibility = "";

    const stack = under?.closest?.(".stack");
    live.gap.remove();
    if (!stack) { live.target = null; return; }

    const kids = [...stack.querySelectorAll(".sblock:not(.lifted)")];
    let at = kids.length;
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { at = i; break; }
    }
    stack.querySelector(".hollow")?.remove();
    stack.insertBefore(live.gap, kids[at] || null);
    live.target = { hat: stack.dataset.hat, at };
  }

  document.addEventListener("pointermove", move);

  document.addEventListener("pointerup", () => {
    if (!live) return;
    const { id, from, target } = live;
    live.gap.remove();
    dragEl.hidden = true;
    document.body.classList.remove("dragging");
    live = null;

    const el = ctx.sel;
    const S = (ctx.scripts[el] ||= { idle: [], touch: [], after: [], block: [] });

    // 자리 밖에 놓으면 빼낸 것으로 본다
    if (!target) {
      if (from) S[from.hat].splice(from.idx, 1);
      ctx.onChange({});
      return;
    }

    let item = { block: id, arg: "" };
    if (from) {
      item = S[from.hat][from.idx];
      S[from.hat].splice(from.idx, 1);
      // 같은 자리에서 위로 옮기면 하나 밀린다
      if (from.hat === target.hat && from.idx < target.at) target.at--;
    }
    S[target.hat].splice(target.at, 0, item);
    ctx.onChange({ focus: { hat: target.hat, idx: target.at } });
  });
}

/** 방금 붙인 것의 값 칸에 바로 쓸 수 있게 한다. */
export function focusArg(where) {
  if (!where) return;
  const n = ctx.nodes.hats.querySelector(
    `.stack[data-hat="${where.hat}"] .sblock[data-idx="${where.idx}"] .barg`);
  n?.focus();
  if (n?.select) n.select();
}
