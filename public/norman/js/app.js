// 주문으로 들어온 물건 — 운동 기록 앱.
//
// 이 앱은 처음부터 끝까지 **다 작동한다.**
//   · 칸을 누르면 진짜로 글자가 써진다. 다만 커서가 보이지 않는다.
//   · 아래쪽 띠를 누르면 진짜로 저장된다. 다만 단추처럼 보이지 않는다.
//   · 목록을 옆으로 밀면 진짜로 지워진다. 다만 밀 수 있다고 알려 주지 않는다.
//
// 어포던스는 다 있다. 없는 것은 시그니파이어뿐이다.
// 어디가 막히는지는 조에게 알려 주지 않는다 — 테스트해서 찾아내야 한다.

import { ICONS, svgOf } from "./icons.js";
import { recipeById } from "./parts.js";

export const APP = {
  name: "운동 기록",
  task: "60킬로그램으로 8회씩, 세 세트를 기록하십시오.",
  // kind — 어떤 연장이 붙는 자리인가
  parts: [
    { id: "name",   kind: "input",  label: "맨 위 칸" },
    { id: "weight", kind: "input",  label: "가운데 왼쪽 칸" },
    { id: "reps",   kind: "input",  label: "가운데 오른쪽 칸" },
    { id: "save",   kind: "button", label: "아래쪽 띠" },
    { id: "list",   kind: "list",   label: "맨 아래 자리" },
  ],
};

export const PART = id => APP.parts.find(p => p.id === id);
export const DEFAULT_LAYOUT = APP.parts.map(p => p.id);

export const fresh = () => ({ name: "", weight: "", reps: "", sets: [], rest: 0 });

/* ── 붙은 연장 꺼내 보기 ──────────────────────────────────── */

const listOf = (at, id) => (at?.[id]) || [];
export const wears = (at, id, rid) => listOf(at, id).some(x => x.recipe === rid);
export const argOf = (at, id, rid) =>
  listOf(at, id).find(x => x.recipe === rid)?.arg ?? "";
export const wornWhen = (at, id, when) =>
  listOf(at, id).filter(x => recipeById(x.recipe)?.when === when);
export const allWorn = at => {
  const out = [];
  for (const [id, l] of Object.entries(at || {}))
    for (const x of l || []) out.push({ ...x, part: id });
  return out;
};

/* ── 작은 도움들 ──────────────────────────────────────────── */

function make(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** 붙은 연장을 부품에 입힌다. 언제 보이는지는 연장이 스스로 정한다. */
function dress(box, core, at, id) {
  const add = (rid, fn) => { if (wears(at, id, rid)) fn(argOf(at, id, rid)); };

  add("caret",  () => core.classList.add("sg-caret"));
  add("hot",    () => core.classList.add("sg-hot"));
  add("press",  () => core.classList.add("sg-press"));
  add("bigbtn", () => core.classList.add("sg-bigbtn"));
  add("bold",   () => core.classList.add("sg-bold"));
  add("grip",   () => core.classList.add("sg-grip"));

  add("label", t => box.prepend(make("p", "sg-label", t || "…")));
  add("unit",  t => { core.classList.add("sg-unit"); core.dataset.unit = t || ""; });
  add("guide", t => {
    const g = make("p", "sg-guide");
    g.append(svgOf(ICONS.arrow, "ar"), make("span", null, t || "여기"));
    box.appendChild(g);
  });
  add("iconbtn", k => { if (ICONS[k]) core.prepend(svgOf(ICONS[k])); });
  add("state", k => {
    const p = make("p", "sg-state");
    if (ICONS[k]) p.appendChild(svgOf(ICONS[k]));
    p.appendChild(make("span", null, box.dataset.state || ""));
    box.appendChild(p);
  });
  return box;
}

/* ── 부품 하나씩 ──────────────────────────────────────────── */

function inputPart(st, at, id) {
  const core = make("input", "box inbox");
  core.value = st[id];
  core.dataset.act = "type:" + id;
  core.setAttribute("aria-label", PART(id).label);
  const box = make("div", "part");
  box.dataset.part = id;
  box.dataset.state =
    id === "weight" ? (st.weight ? st.weight + " 킬로그램" : "비어 있음")
  : id === "reps"   ? (st.reps ? st.reps + " 회" : "비어 있음")
  :                   (st.name || "비어 있음");
  box.appendChild(core);
  return dress(box, core, at, id);
}

function savePart(st, at) {
  const core = make("button", "box savestrip", argOf(at, "save", "label") || "");
  core.dataset.act = "save";
  core.setAttribute("aria-label", "저장");
  const box = make("div", "part");
  box.dataset.part = "save";
  box.dataset.state = st.sets.length + "세트 기록됨";
  box.appendChild(core);
  return dress(box, core, at, "save");
}

function listPart(st, at) {
  const ul = make("ul", "setlist");
  st.sets.forEach((x, i) => {
    const li = make("li", "box setrow");
    li.dataset.act = "del:" + i;
    const u = argOf(at, "weight", "unit"), v = argOf(at, "reps", "unit");
    li.appendChild(make("span", "setval",
      x.weight + (u ? " " + u : "") + "   " + x.reps + (v ? " " + v : "")));
    if (wears(at, "list", "grip")) li.appendChild(make("span", "swipe", "‹ 밀기"));
    ul.appendChild(li);
  });
  if (!st.sets.length) ul.appendChild(make("li", "box setrow empty", ""));
  const box = make("div", "part");
  box.dataset.part = "list";
  box.dataset.state = st.rest > 0 ? "쉬는 중 " + st.rest + "초"
                                  : st.sets.length + "세트 기록됨";
  box.appendChild(ul);
  return dress(box, ul, at, "list");
}

const BUILD = {
  name:   (st, at) => inputPart(st, at, "name"),
  weight: (st, at) => inputPart(st, at, "weight"),
  reps:   (st, at) => inputPart(st, at, "reps"),
  save:   savePart,
  list:   listPart,
};

/* ── 화면 그리기 ──────────────────────────────────────────── */

export function render(screen, st, at, hot, layout, arrange) {
  screen.textContent = "";
  screen.classList.toggle("arranging", !!arrange);

  const order = (layout && layout.length ? layout : DEFAULT_LAYOUT).filter(id => BUILD[id]);
  for (const id of DEFAULT_LAYOUT) if (!order.includes(id)) order.push(id);

  // 무게와 횟수가 이웃해 있으면 나란히 놓는다. 떼어 놓는 것도 조의 몫이다.
  let i = 0;
  while (i < order.length) {
    const id = order[i], nx = order[i + 1];
    if ((id === "weight" && nx === "reps") || (id === "reps" && nx === "weight")) {
      const row = make("div", "pair");
      row.append(BUILD[id](st, at), BUILD[nx](st, at));
      screen.appendChild(row);
      i += 2;
      continue;
    }
    screen.appendChild(BUILD[id](st, at));
    i++;
  }

  if (arrange) screen.querySelectorAll(".part").forEach(f => {
    const h = make("span", "grab", "⠿");
    h.dataset.grab = f.dataset.part;
    f.prepend(h);
  });

  if (hot) screen.querySelector('.part[data-part="' + hot + '"]')?.classList.add("picked");
}

/* ── 진짜로 일어나는 일 ───────────────────────────────────── */

export function act(st, code, val) {
  const [what, which] = String(code).split(":");

  if (what === "type") {
    st[which] = which === "name" ? String(val).slice(0, 14)
              : String(val).replace(/[^0-9]/g, "").slice(0, 3);
    return { part: which, did: "type" };
  }
  if (what === "save") {
    if (!st.weight || !st.reps) return { part: "save", did: "empty" };
    st.sets.push({ weight: Number(st.weight), reps: Number(st.reps) });
    st.rest = 60;
    return { part: "save", did: "save" };
  }
  if (what === "del") {
    st.sets.splice(Number(which), 1);
    return { part: "list", did: "delete" };
  }
  return { part: null, did: null };
}

export const rightSets = st =>
  st.sets.filter(x => x.weight === 60 && x.reps === 8).length;
