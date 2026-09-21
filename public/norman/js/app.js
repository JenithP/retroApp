// 주문으로 들어온 물건 — 의뢰 데이터로 조립해 그린다.
//
// 어느 의뢰든 **처음부터 다 작동한다.** 칸에는 글자가 써지고 단추는 눌리고
// 목록은 밀린다. 다만 그렇다고 알려 주지 않는다.
// 어포던스는 다 있고, 없는 것은 시그니파이어뿐이다.

import { build, needOf, givesOf, bucketOf } from "./kit.js";
import { recipeById } from "./parts.js";

export const fresh = job => ({
  vals: {},                 // 부품마다의 값 — 글자·켜짐·지워짐 따위
  hits: {},                 // 부품을 몇 번 눌렀나
  order: (job.parts || []).map(p => p.id),
});

export const partOf = (job, id) => job.parts.find(p => p.id === id);

/* ── 붙은 연장 꺼내 보기 ──────────────────────────────────── */

const listOf = (at, id) => (at && at[id]) || [];
export const wears = (at, id, rid) => listOf(at, id).some(x => x.recipe === rid);
export const argOf = (at, id, rid) => {
  const f = listOf(at, id).find(x => x.recipe === rid);
  return f ? (f.arg || "") : "";
};
export const allWorn = at => {
  const out = [];
  for (const id of Object.keys(at || {}))
    for (const x of at[id] || []) out.push(Object.assign({}, x, { part: id }));
  return out;
};

/** 이 부품이 필요한 것 가운데 아직 못 알린 것 */
export function missingOn(job, at, id) {
  const p = partOf(job, id);
  if (!p) return [];
  const given = {};
  for (const x of listOf(at, id))
    for (const g of givesOf(x.recipe)) given[g] = true;
  return needOf(p).filter(n => !given[n]);
}

/** 붙을 수 있는 자리인가 */
export const canWear = (job, id, rid) => {
  const p = partOf(job, id), r = recipeById(rid);
  return !!(p && r && r.on.indexOf(bucketOf(p.kind)) >= 0);
};

/* ── 그리기 ───────────────────────────────────────────────── */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** 이 부품이 지금 어떤 상태인지 — 「지금 어떤지 보여 주기」가 읽어 준다 */
function stateText(p, st) {
  const v = st.vals[p.id];
  switch (p.kind) {
    case "input":    return v ? "적힌 것 · " + v : "아직 비어 있음";
    case "toggle":   return (v == null ? p.on : v) ? "켜짐" : "꺼짐";
    case "check":    return v ? "고름" : "안 고름";
    case "tab":      return (p.opts || [])[(v == null ? 0 : v)] + " 골라짐";
    case "list":     return v === "gone" ? "지워짐" : "그대로 있음";
    case "slider":   return Math.round((v || 0) * 100) + "%";
    case "progress": return st.vals[p.id] ? "끝났음" : "가는 중";
    case "status":   return st.hits.__sent ? "읽음" : "보내는 중";
    case "button":   return (st.hits[p.id] || 0) + "번 눌렸음";
    default:         return "";
  }
}

/** 붙은 연장을 부품에 입힌다. 언제 보이는지는 연장이 스스로 안다. */
function dress(box, core, at, id, words) {
  const on = rid => wears(at, id, rid);
  const arg = rid => argOf(at, id, rid);

  if (on("caret"))  core.classList.add("sg-caret");
  if (on("hot"))    core.classList.add("sg-hot");
  if (on("press"))  core.classList.add("sg-press");
  if (on("bigbtn")) core.classList.add("sg-bigbtn");
  if (on("bold"))   core.classList.add("sg-bold");
  if (on("grip"))   core.classList.add("sg-grip");
  if (on("iconbtn")) core.classList.add("sg-icon");

  if (on("label")) box.prepend(el("p", "sg-label", arg("label") || "…"));
  if (on("unit"))  { core.classList.add("sg-unit"); box.dataset.unit = arg("unit") || ""; }
  if (on("guide")) {
    const g = el("p", "sg-guide");
    g.append(el("span", "ar", "→"), el("span", null, arg("guide") || "여기"));
    box.appendChild(g);
  }
  if (on("state")) box.appendChild(el("p", "sg-state", words));
  return box;
}

export function render(screen, job, st, at, layout, arrange) {
  screen.textContent = "";
  screen.classList.toggle("arranging", !!arrange);

  const ids = (layout && layout.length ? layout : st.order)
    .filter(id => partOf(job, id));
  for (const p of job.parts) if (ids.indexOf(p.id) < 0) ids.push(p.id);

  // 핀은 한 줄로 세우면 지도로 안 보인다 — 판 위에 흩어 놓는다
  const pins = ids.filter(id => partOf(job, id).kind === "pin");
  if (pins.length) {
    const map = el("div", "mapbox");
    pins.forEach((id, i) => {
      const p = partOf(job, id);
      const core = build(p, st);
      const box = el("div", "part pinpart");
      box.dataset.part = id;
      box.style.left = (16 + i * 26) + "%";
      box.style.top = (24 + (i % 2) * 32) + "%";
      box.appendChild(core);
      map.appendChild(dress(box, core, at, id, stateText(p, st)));
    });
    screen.appendChild(map);
  }

  for (const id of ids) {
    const p = partOf(job, id);
    if (p.kind === "pin") continue;
    const core = build(p, st);
    const box = el("div", "part k-" + p.kind);
    box.dataset.part = id;
    box.appendChild(core);
    screen.appendChild(dress(box, core, at, id, stateText(p, st)));
  }

  if (arrange) screen.querySelectorAll(".part").forEach(f => {
    const h = el("span", "grab", "⠿");
    h.dataset.grab = f.dataset.part;
    f.prepend(h);
  });
}

/* ── 진짜로 일어나는 일 ───────────────────────────────────── */

export function act(job, st, code, val) {
  const bits = String(code).split(":");
  const what = bits[0], id = bits[1];
  const p = partOf(job, id);
  if (!p) return { part: null, did: null };

  if (what === "type") { st.vals[id] = val; return { part: id, did: "type" }; }

  if (what === "press") {
    st.hits[id] = (st.hits[id] || 0) + 1;
    if (p.decoy) return { part: id, did: "nothing" };
    if (p.kind === "toggle")
      st.vals[id] = !(st.vals[id] == null ? p.on : st.vals[id]);
    else if (p.kind === "check") st.vals[id] = !st.vals[id];
    else if (p.kind === "tab")
      st.vals[id] = ((st.vals[id] == null ? 0 : st.vals[id]) + 1) %
        ((p.opts || ["", ""]).length);
    else if (p.kind === "progress") st.vals[id] = 1;
    if (id === "send") st.hits.__sent = true;
    return { part: id, did: "press" };
  }

  if (what === "swipe") { st.vals[id] = "gone"; return { part: id, did: "swipe" }; }
  if (what === "drag") {
    st.vals[id] = Math.min(1, (st.vals[id] || 0) + .5);
    return { part: id, did: "drag" };
  }
  if (what === "read") return { part: id, did: "read" };
  return { part: null, did: null };
}

/* ── 과업이 끝났는가 ──────────────────────────────────────── */

export function stepDone(job, st, s) {
  const p = partOf(job, s.part);
  if (!p) return false;
  if (s.do === "type")  return String(st.vals[s.part] || "") === String(s.val);
  if (s.do === "press") return (st.hits[s.part] || 0) > 0 && !p.decoy;
  if (s.do === "swipe") return st.vals[s.part] === "gone";
  if (s.do === "drag")  return (st.vals[s.part] || 0) > 0;
  if (s.do === "read")  return true;
  return false;
}

export const doneSteps = (job, st) =>
  job.steps.filter(s => stepDone(job, st, s)).length;

export const allDone = (job, st) => doneSteps(job, st) === job.steps.length;

/** 헛눌림 — 과업에 없는 곳이나 decoy 를 누른 횟수, 그리고 연타 */
export function strayHits(job, st) {
  const wanted = {};
  job.steps.forEach(s => { wanted[s.part] = true; });
  let n = 0;
  for (const id of Object.keys(st.hits)) {
    if (id === "__sent") continue;
    const p = partOf(job, id);
    if (!p) continue;
    if (!wanted[id] || p.decoy) n += st.hits[id];
    else if (st.hits[id] > 1) n += st.hits[id] - 1;
  }
  return n;
}
