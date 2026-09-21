// 테스트해 보기 — 이 물건을 처음 만져 보는 사람에게 쥐여 본다.
//
// 기능은 처음부터 다 돌았다. 여기서 보는 것은 기능이 아니라 **전달**이다.
// 막힌 곳을 말로 알려 주므로, 조는 이걸 돌려 보고서야 어디가 문제인지 안다.
// 어디가 문제인지 미리 일러 주지 않는 것이 이 판의 규칙이다.

import { act, wears, rightSets } from "./app.js";
import { GUEST, pickLine } from "./cast.js";

export class Stop extends Error {}

function sleeper(tok) {
  return ms => new Promise((res, rej) => {
    if (tok.dead) return rej(new Stop());
    const t = setTimeout(res, ms);
    tok.cancels.push(() => { clearTimeout(t); rej(new Stop()); });
  });
}

/* ── 무엇이 보이는가 ──────────────────────────────────────── */

/** 이 칸이 무엇인지 알 수 있는가 */
const named = (at, id) =>
  wears(at, id, "label") || wears(at, id, "guide") ||
  wears(at, id, "iconbtn") || wears(at, id, "bold") || wears(at, id, "unit");

/** 여기에 쓸 수 있다는 것을 알 수 있는가 */
const typable = (at, id) =>
  wears(at, id, "caret") || wears(at, id, "hot");

/** 누르는 곳처럼 보이는가 */
const pushable = (at, id) =>
  wears(at, id, "bigbtn") || wears(at, id, "press") ||
  wears(at, id, "iconbtn") || wears(at, id, "bold") || wears(at, id, "label");

/** 하고 난 뒤 무슨 일이 생겼는지 알 수 있는가 */
const answered = (at, id) =>
  wears(at, id, "toast") || wears(at, id, "done") ||
  wears(at, id, "feel") || wears(at, id, "state");

/* ── 테스트 사용자 ────────────────────────────────────────── */

export async function cold(ui) {
  const { st, attached: at, redraw, screen, log, tok } = ui;
  const wait = sleeper(tok);
  const t0 = performance.now();
  const evs = [];
  const say = (kind, part, text, voice) => {
    const e = { t: (performance.now() - t0) / 1000, kind, part, text };
    evs.push(e); log(e);
    if (voice && ui.speak) ui.speak("guest", voice);
  };

  const point = async id => {
    const box = screen.querySelector(`.part[data-part="${id}"]`);
    if (!box) return;
    const r = box.getBoundingClientRect(), p = screen.getBoundingClientRect();
    ui.dot.hidden = false;
    ui.dot.style.transform =
      `translate(${r.left - p.left + r.width / 2 - 11}px, ${r.top - p.top + r.height / 2 - 11}px)`;
    await wait(300);
  };

  const tap = async id => {
    await point(id);
    ui.dot.classList.add("tapping");
    await wait(140);
    ui.dot.classList.remove("tapping");
    await wait(110);
  };

  /** 쓰는 칸 하나를 채운다 */
  const fill = async (id, val, others) => {
    if (named(at, id)) say("hit", id, "이름표를 보고 곧장 찾는다", pickLine("direct", GUEST.direct));
    else {
      say("seek", id, "어느 칸인지 모른다", pickLine("seek", GUEST.seek));
      for (const w of others) { await tap(w); say("miss", w, "여기가 아니다", pickLine("miss", GUEST.miss)); }
      say("hit", id, "여러 번 만에 겨우 찾는다", pickLine("found", GUEST.found));
    }
    await tap(id);

    if (!typable(at, id)) {
      say("blind", id, "눌렀는데 써지는지 알 수 없다", GUEST.nocaret);
      await wait(700);
    }
    // 단서가 있든 없든 글자는 써진다 — 어포던스는 처음부터 있었다
    for (let i = 1; i <= String(val).length; i++) {
      act(st, "type:" + id, String(val).slice(0, i));
      redraw(); await wait(130);
    }
    say("done", id, `${val} 을 적었다`, GUEST.typed(val));
  };

  try {
    await fill("weight", "60", ["name", "reps"]);
    await fill("reps", "8", ["name"]);

    /* 저장 — 단추처럼 보이지 않으면 한참 찾는다 */
    if (pushable(at, "save"))
      say("hit", "save", "단추를 알아본다", pickLine("direct", GUEST.direct));
    else {
      say("seek", "save", "어디를 눌러야 저장되는지 모른다", GUEST.nosave);
      await tap("list"); say("miss", "list", "여기가 아니다", pickLine("miss", GUEST.miss));
      await tap("name"); say("miss", "name", "여기도 아니다", pickLine("miss", GUEST.miss));
      say("hit", "save", "띠를 눌러 본다", GUEST.foundsave);
    }

    for (let n = 1; n <= 3; n++) {
      await tap("save");
      act(st, "save"); redraw(); await wait(200);
      if (answered(at, "save")) { say("done", "save", `${n}세트째 — 됐다는 것을 알아본다`, GUEST.ok(n)); continue; }
      say("repeat", "save", "눌렀는데 아무 말이 없다", pickLine("quiet", GUEST.quiet));
      const again = 3 + (n % 2);
      for (let k = 0; k < again; k++) { await tap("save"); act(st, "save"); redraw(); await wait(110); }
      say("repeat", "save", `${again}번 더 눌렀다 — 그만큼 더 쌓였다`, GUEST.bash(again));
    }

    if (!named(at, "list") && !wears(at, "list", "state"))
      say("blind", "list", "몇 세트가 쌓였는지 읽을 수 없다", GUEST.blind);
    else
      say("done", "list", `목록에서 ${st.sets.length}세트를 확인한다`, `${st.sets.length}개 들어갔네요.`);

    ui.dot.hidden = true;
    return verdict(evs, st, at);
  } catch (e) {
    if (e instanceof Stop) { ui.dot.hidden = true; return null; }
    throw e;
  }
}

/* ── 판정 ─────────────────────────────────────────────────── */

function verdict(evs, st, at) {
  const miss  = evs.filter(e => e.kind === "miss").length;
  const seek  = evs.filter(e => e.kind === "seek").length;
  const blind = evs.filter(e => e.kind === "blind").length;
  const secs  = evs.length ? evs[evs.length - 1].t : 0;

  const right = rightSets(st);
  const wrong = st.sets.length - right;
  const extra = Math.max(0, right - 3) + wrong;

  // 막힌 곳 — 조에게 「어디를 고쳐야 하는지」 대신 「무엇이 불편했는지」로 준다
  const stuck = [];
  if (!named(at, "weight") || !named(at, "reps")) stuck.push("어느 칸에 무엇을 넣는지 모른다");
  if (!typable(at, "weight") || !typable(at, "reps")) stuck.push("칸을 눌러도 써지는지 알 수 없다");
  if (!pushable(at, "save")) stuck.push("어디를 눌러야 저장되는지 모른다");
  if (!answered(at, "save")) stuck.push("저장됐는지 알 수 없어 자꾸 누른다");
  if (!named(at, "list") && !wears(at, "list", "state")) stuck.push("몇 개나 쌓였는지 읽을 수 없다");

  return {
    evs, secs, miss, seek, blind, extra, right, wrong, stuck,
    sets: st.sets.length,
    exec: seek + miss + blind,
    evalGap: extra,
    passed: right >= 3,
    clean: seek === 0 && miss === 0 && blind === 0 && extra === 0 && right === 3,
  };
}
