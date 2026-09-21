// 주문서로 들어온 물건 — 운동 기록 앱.
//
// 중요한 것: 이 앱은 **처음부터 끝까지 다 작동한다.**
// 단추는 진짜로 눌리고, 숫자는 진짜로 바뀌고, 기록은 진짜로 쌓이고,
// 목록은 진짜로 옆으로 밀어 지울 수 있다. 쉬는 시계도 진짜로 돈다.
// 다만 그 가운데 어느 것도 스스로 말해 주지 않는다.
// 어포던스는 이미 다 있다. 없는 것은 시그니파이어뿐이다.

import { ICONS } from "./blocks.js";

export const APP = {
  name: "운동 기록",
  task: "60킬로그램으로 8회씩, 세 세트를 기록하십시오.",
  elements: [
    { id: "name",   label: "운동 이름 칸", note: "눌러서 글자를 쓸 수 있다" },
    { id: "weight", label: "무게 조절",    note: "양옆을 누르면 5씩 오르내린다" },
    { id: "reps",   label: "횟수 조절",    note: "양옆을 누르면 1씩 오르내린다" },
    { id: "save",   label: "기록 단추",    note: "누르면 한 세트가 쌓이고 쉬는 시계가 돈다" },
    { id: "list",   label: "세트 목록",    note: "옆으로 밀면 지워진다" },
  ],
};

export const fresh = () => ({
  name: "", weight: 20, reps: 10, sets: [], rest: 0, lastSaved: 0,
});

/* ── 붙은 단서를 꺼내 보는 도구 ───────────────────────────── */

const at = (s, el, hat) => (s?.[el]?.[hat]) || [];
export const has = (s, el, hat, id) => at(s, el, hat).some(b => b.block === id);
export const argOf = (s, el, hat, id) =>
  at(s, el, hat).find(b => b.block === id)?.arg ?? "";
export const countAt = (s, el, hat) => at(s, el, hat).length;

/* ── 작은 도움들 ──────────────────────────────────────────── */

function make(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function svg(path) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 18 18");
  s.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  s.appendChild(p);
  return s;
}

/** 평소에 붙은 단서를 이 부품에 입힌다. */
function dress(node, s, el) {
  if (has(s, el, "idle", "strong")) node.classList.add("sg-strong");
  if (has(s, el, "idle", "big"))    node.classList.add("sg-big");
  if (has(s, el, "idle", "wide"))   node.classList.add("sg-wide");
  if (has(s, el, "idle", "grip"))   node.classList.add("sg-grip");
  if (has(s, el, "block", "lock"))  node.classList.add("sg-lock");
  if (has(s, el, "touch", "glow"))  node.classList.add("sg-glow");
  if (has(s, el, "touch", "press")) node.classList.add("sg-press");
  return node;
}

/** 이름표·그림표·안내문 — 부품을 감싸는 한 칸으로 만든다. */
function wrap(el, s, inner, statusText) {
  const box = make("div", "field");
  box.dataset.el = el;

  const lab = argOf(s, el, "idle", "label");
  if (lab) box.appendChild(make("p", "sg-label", lab));

  const row = make("div", "fieldrow");
  const ico = argOf(s, el, "idle", "icon");
  if (ico && ICONS[ico]) {
    const b = make("span", "sg-icon");
    b.appendChild(svg(ICONS[ico]));
    row.appendChild(b);
  }
  row.appendChild(inner);
  box.appendChild(row);

  if (has(s, el, "idle", "status") && statusText)
    box.appendChild(make("p", "sg-status", statusText));

  const hint = argOf(s, el, "idle", "hint");
  if (hint) box.appendChild(make("p", "sg-hint", hint));

  return box;
}

const unitOf = (s, el) => argOf(s, el, "idle", "unit");

/* ── 화면 그리기 ──────────────────────────────────────────── */

export function render(screen, st, s, hot) {
  screen.textContent = "";

  /* 운동 이름 칸 */
  {
    const inp = make("input", "namebox");
    inp.value = st.name;
    inp.placeholder = "";
    inp.dataset.act = "name";
    dress(inp, s, "name");
    screen.appendChild(wrap("name", s, inp, st.name || "아직 비어 있음"));
  }

  /* 무게·횟수 조절 */
  for (const el of ["weight", "reps"]) {
    const row = make("div", "stepper");
    const minus = dress(make("button", "step", ""), s, el);
    const plus  = dress(make("button", "step", ""), s, el);
    minus.dataset.act = el + ":-";
    plus.dataset.act  = el + ":+";

    const ico = argOf(s, el, "idle", "icon");
    if (ico === "plus" || ico === "minus") {
      minus.appendChild(svg(ICONS.minus));
      plus.appendChild(svg(ICONS.plus));
    }

    const u = unitOf(s, el);
    const val = make("span", "value", st[el] + (u ? " " + u : ""));

    row.append(minus, val, plus);
    const words = el === "weight" ? `${st.weight} 킬로그램` : `${st.reps} 회`;
    screen.appendChild(wrap(el, s, row, words));
  }

  /* 기록 단추 */
  {
    const btn = make("button", "savebtn", argOf(s, "save", "idle", "label") || "");
    btn.dataset.act = "save";
    dress(btn, s, "save");
    const ico = argOf(s, "save", "idle", "icon");
    if (ico && ICONS[ico]) btn.prepend(svg(ICONS[ico]));

    const box = make("div", "field");
    box.dataset.el = "save";
    box.appendChild(btn);
    if (has(s, "save", "idle", "status"))
      box.appendChild(make("p", "sg-status", `지금까지 ${st.sets.length}세트`));
    const hint = argOf(s, "save", "idle", "hint");
    if (hint) box.appendChild(make("p", "sg-hint", hint));
    screen.appendChild(box);
  }

  /* 세트 목록과 쉬는 시계 */
  {
    const ul = make("ul", "setlist");
    dress(ul, s, "list");
    st.sets.forEach((x, i) => {
      const li = make("li", "setrow");
      li.dataset.act = "del:" + i;
      const uw = unitOf(s, "weight"), ur = unitOf(s, "reps");
      li.append(
        make("span", "setno", has(s, "list", "idle", "label") ? `${i + 1}` : ""),
        make("span", "setval", `${x.weight}${uw ? " " + uw : ""}  ${x.reps}${ur ? " " + ur : ""}`)
      );
      if (has(s, "list", "idle", "grip")) li.appendChild(make("span", "swipehint", "‹ 밀기"));
      ul.appendChild(li);
    });
    if (!st.sets.length) ul.appendChild(make("li", "setrow empty", ""));

    const words = st.rest > 0
      ? `쉬는 중 ${st.rest}초`
      : `${st.sets.length}세트 기록됨`;
    screen.appendChild(wrap("list", s, ul, words));
  }

  /* 고른 부품을 작업대에서 짚어 준다 */
  if (hot) screen.querySelector(`.field[data-el="${hot}"]`)?.classList.add("picked");
}

/* ── 진짜로 일어나는 일 ───────────────────────────────────── */

/** 행동을 실제로 수행한다. 단서가 있든 없든 결과는 똑같다.
 *  돌려주는 값 — 어느 부품에서 무엇이 일어났는지. */
export function act(st, code, s) {
  const [what, how] = String(code).split(":");

  if (what === "name") return { el: "name", did: "type" };

  if (what === "weight" || what === "reps") {
    if (has(s, what, "block", "lock")) return { el: what, did: "locked" };
    const step = what === "weight" ? 5 : 1;
    const lo   = what === "weight" ? 5 : 1;
    const hi   = what === "weight" ? 200 : 30;
    st[what] = Math.min(hi, Math.max(lo, st[what] + (how === "+" ? step : -step)));
    return { el: what, did: "change" };
  }

  if (what === "save") {
    if (has(s, "save", "block", "lock")) return { el: "save", did: "locked" };
    st.sets.push({ weight: st.weight, reps: st.reps });
    st.rest = 60;
    st.lastSaved = Date.now();
    return { el: "save", did: "save" };
  }

  if (what === "del") {
    if (has(s, "list", "block", "lock")) return { el: "list", did: "locked" };
    st.sets.splice(Number(how), 1);
    return { el: "list", did: "delete" };
  }

  return { el: null, did: null };
}

/** 과업이 끝났는가 — 60킬로그램 8회로 세 세트. */
export const done = st =>
  st.sets.filter(x => x.weight === 60 && x.reps === 8).length >= 3;
