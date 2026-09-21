// 시연 — 만든 물건이 실제로 전달되는지 본다.
//
// 기능은 처음부터 다 돌았다. 여기서 보는 것은 기능이 아니라 **전달**이다.
// 「처음 본 사람」은 화면에 붙은 단서만 보고 과업을 해 보려 한다.
// 단서가 없으면 헤매고(실행의 간극), 눌렀는데 아무 말이 없으면 연타한다(평가의 간극).

import { HATS, works } from "./blocks.js";
import { act, has, countAt } from "./app.js";
import { GUEST, pickLine } from "./cast.js";

export class Stop extends Error {}

function sleeper(tok) {
  return ms => new Promise((res, rej) => {
    if (tok.dead) return rej(new Stop());
    const t = setTimeout(res, ms);
    tok.cancels.push(() => { clearTimeout(t); rej(new Stop()); });
  });
}

/* ── 단서가 있는가 ────────────────────────────────────────── */

/** 처음 본 사람이 이 부품을 **찾을** 수 있는가 — 평소에 붙은 인지·감각 단서. */
const findable = (s, el) =>
  !!(has(s, el, "idle", "label") || has(s, el, "idle", "icon") ||
     has(s, el, "idle", "hint")  || has(s, el, "idle", "status"));

/** 묶어 두기만 되어 있으면 어느 언저리인지는 안다 — 다만 무엇인지는 모른다. */
const grouped = (s, el) => !!has(s, el, "idle", "group");

/** 하고 난 뒤 **무슨 일이 생겼는지** 알 수 있는가. */
const answered = (s, el) =>
  ["toast", "check", "buzz", "status"].some(b => has(s, el, "after", b));

/* ── 처음 본 사람 ─────────────────────────────────────────── */

export async function cold(ui) {
  const { st, scripts: s, redraw, screen, log, tok } = ui;
  const wait = sleeper(tok);
  const t0 = performance.now();
  const evs = [];
  const say = (kind, el, text, voice) => {
    const e = { t: (performance.now() - t0) / 1000, kind, el, text };
    evs.push(e); log(e);
    if (voice && ui.speak) ui.speak("guest", voice);
  };

  const point = async el => {
    const box = screen.querySelector(`.field[data-el="${el}"]`);
    if (!box) return;
    const r = box.getBoundingClientRect(), p = screen.getBoundingClientRect();
    const dot = ui.dot;
    dot.hidden = false;
    dot.style.transform =
      `translate(${r.left - p.left + r.width / 2 - 11}px, ${r.top - p.top + r.height / 2 - 11}px)`;
    await wait(280);
  };

  const tap = async (code, el) => {
    await point(el);
    ui.dot.classList.add("tapping");
    act(st, code, s);
    redraw();
    await wait(130);
    ui.dot.classList.remove("tapping");
    await wait(110);
  };

  /** 과업 하나를 하기 전에 그 부품을 찾는다. 단서가 없으면 엉뚱한 데를 눌러 본다. */
  const reach = async (el, others) => {
    if (findable(s, el)) { say("hit", el, "단서를 보고 곧장 찾는다", pickLine("direct", GUEST.direct));
      await point(el); await wait(320); return; }
    say("seek", el, "어디를 눌러야 할지 모른다", pickLine("seek", GUEST.seek));
    // 묶여 있으면 언저리는 아니까 한 번만 헛짚는다
    const tries = grouped(s, el) ? others.slice(0, 1) : others;
    for (const w of tries) {
      await point(w);
      await wait(520);
      say("miss", w, "여기가 아니다", pickLine("miss", GUEST.miss));
      await tap(w.code, w.el ?? w);
    }
    await wait(420);
    say("hit", el, "여러 번 만에 겨우 찾는다", pickLine("found", GUEST.found));
  };

  try {
    /* ① 무게를 60으로 */
    await reach("weight", findable(s, "weight") ? [] :
      [{ el: "reps", code: "reps:+" }, { el: "name", code: "name" }]);
    while (st.weight < 60) await tap("weight:+", "weight");
    say("done", "weight", `무게를 ${st.weight}까지 올렸다`, GUEST.set(st.weight));

    /* ② 횟수를 8로 */
    await reach("reps", findable(s, "reps") ? [] : [{ el: "weight", code: "weight:+" }]);
    while (st.reps > 8) await tap("reps:-", "reps");
    while (st.reps < 8) await tap("reps:+", "reps");
    say("done", "reps", `횟수를 ${st.reps}로 맞췄다`, GUEST.set(st.reps));

    /* ③ 세 세트 기록 */
    await reach("save", findable(s, "save") ? [] : [{ el: "list", code: "del:0" }]);
    for (let n = 1; n <= 3; n++) {
      await tap("save", "save");
      if (answered(s, "save")) {
        say("done", "save", `${n}세트째 — 됐다는 것을 알아본다`, GUEST.ok(n));
      } else {
        say("repeat", "save", "눌렀는데 아무 말이 없다", pickLine("quiet", GUEST.quiet));
        const again = 3 + (n % 2);
        for (let k = 0; k < again; k++) { await tap("save", "save"); await wait(90); }
        say("repeat", "save", `${again}번 더 눌렀다 — 그만큼 더 쌓였다`, GUEST.bash(again));
      }
    }

    /* ④ 끝났는지 확인 */
    // 헤매는 동안 엉뚱한 쪽을 눌러 값이 틀어졌을 수 있다.
    // 단위나 이름표가 없으면 무엇이 적혔는지 읽을 수 없어 그대로 넘어간다.
    const bad = st.sets.filter(x => x.weight !== 60 || x.reps !== 8).length;
    if (bad) say("stall", "list",
      `주문은 60킬로그램 8회인데 ${bad}건이 다른 값으로 적혔다 — 읽을 수가 없어 모르고 지나친다`,
      GUEST.wrong(bad));

    if (!findable(s, "list") && !has(s, "list", "idle", "status"))
      say("stall", "list", "몇 세트가 쌓였는지 읽을 수 없다", GUEST.blind);
    else
      say("done", "list", `목록에서 ${st.sets.length}세트를 확인한다`, `${st.sets.length}개 들어갔네요.`);

    ui.dot.hidden = true;
    return verdict(evs, st, s);
  } catch (e) {
    if (e instanceof Stop) { ui.dot.hidden = true; return null; }
    throw e;
  }
}

/* ── 판정 ─────────────────────────────────────────────────── */

function verdict(evs, st, s) {
  const miss   = evs.filter(e => e.kind === "miss").length;
  const seek   = evs.filter(e => e.kind === "seek").length;
  const stall  = evs.filter(e => e.kind === "stall").length;
  const secs   = evs.length ? evs[evs.length - 1].t : 0;

  // 몇 건이 쌓였느냐가 아니라 **주문대로** 쌓였느냐를 센다.
  // 연타로 늘어난 것과 엉뚱한 값으로 적힌 것이 여기서 갈린다.
  const right = st.sets.filter(x => x.weight === 60 && x.reps === 8).length;
  const wrong = st.sets.length - right;
  const extra = Math.max(0, right - 3) + wrong;

  const blame = [];
  for (const el of ["weight", "reps", "save", "list"])
    if (!findable(s, el)) blame.push({ el, hat: "idle" });
  if (!answered(s, "save")) blame.push({ el: "save", hat: "after" });

  return {
    evs, secs, miss, seek, stall, extra, right, wrong,
    sets: st.sets.length,
    exec: seek + miss,
    evalGap: extra,
    blame,
    clean: seek === 0 && miss === 0 && extra === 0 && right === 3,
  };
}

/* ── 자리를 잘못 잡은 단서 표시 ───────────────────────────── */

/** 시연을 누르는 순간에만 알려 준다. 붙일 때 막으면 틀려 볼 기회가 사라진다. */
export function markAstray(hatsEl) {
  hatsEl.querySelectorAll(".sblock").forEach(n => {
    const hat = n.closest(".stack").dataset.hat;
    const bad = !works(n.dataset.block, hat);
    n.classList.toggle("astray", bad);
    n.querySelector(".astraynote")?.remove();
    if (bad) {
      const p = document.createElement("p");
      p.className = "astraynote";
      p.textContent = "이 자리에서는 아무도 못 봅니다";
      n.appendChild(p);
    }
  });
}

export function clearAstray(hatsEl) {
  hatsEl.querySelectorAll(".sblock").forEach(n => {
    n.classList.remove("astray");
    n.querySelector(".astraynote")?.remove();
  });
}

/** 지금 작동한 단서를 잠깐 빛나게 한다 — 스크래치에서 실행 중인 블록처럼. */
export function glow(hatsEl, hat) {
  const stack = hatsEl.querySelector(`.stack[data-hat="${hat}"]`);
  if (!stack) return;
  stack.querySelectorAll(".sblock").forEach(n => {
    n.classList.add("lit");
    setTimeout(() => n.classList.remove("lit"), 620);
  });
}

/** 비어 있어서 사람을 막은 자리를 빨갛게 깜빡인다. */
export function flashBlame(hatsEl, blame, sel) {
  for (const b of blame) {
    if (b.el !== sel) continue;
    const stack = hatsEl.querySelector(`.stack[data-hat="${b.hat}"]`);
    stack?.closest(".hat")?.classList.add("blamed");
  }
}

export function clearBlame(hatsEl) {
  hatsEl.querySelectorAll(".hat").forEach(n => n.classList.remove("blamed"));
}

/** 어느 자리가 비어 있는지 한눈에 — 교수 현황판으로 그대로 옮겨 갈 셈이다. */
export function emptyMap(scripts, els) {
  const m = {};
  for (const h of HATS) m[h.id] = els.filter(e => countAt(scripts, e.id, h.id) === 0).length;
  return m;
}
