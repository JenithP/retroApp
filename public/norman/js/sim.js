// 돌려 보기 — 만든 물건을 공방에서 직접 시험한다.
//
// 곁에서 누가 떠드는 것이 아니다. 의뢰에 적힌 차례(steps)를 그대로 걷고,
// 부품이 알려야 할 것(need)이 빠져 있으면 그 자리에서 멈춘다.
// 조에게는 「어디서 멈췄는지」만 돌려준다. 고칠 곳은 짚어 주지 않는다.

import { act, partOf, missingOn, doneSteps, allDone, strayHits } from "./app.js";

export class Stop extends Error {}

function sleeper(tok) {
  return ms => new Promise((res, rej) => {
    if (tok.dead) return rej(new Stop());
    const t = setTimeout(res, ms);
    tok.cancels.push(() => { clearTimeout(t); rej(new Stop()); });
  });
}

const STUCK = {
  name:  "무엇을 하는 곳인지 모른다",
  type:  "눌러도 써지는지 알 수 없다",
  push:  "눌러도 되는 곳인지 모른다",
  feed:  "하고 나서 어찌 됐는지 알 수 없다",
  state: "지금 어떤 상태인지 읽을 수 없다",
  move:  "밀거나 끌 수 있다는 것을 모른다",
};

/* ── 돌려 보기 ────────────────────────────────────────── */

export async function cold(ui) {
  const { job, st, attached: at, redraw, screen, log, tok } = ui;
  const wait = sleeper(tok);
  const t0 = performance.now();
  const evs = [];
  const stuck = [];

  // 누가 곁에서 떠드는 것이 아니다. 돌려 보고 어디서 멈추는지 적을 뿐이다.
  const say = (kind, part, text) => {
    const e = { t: (performance.now() - t0) / 1000, kind, part, text };
    evs.push(e); log(e);
  };

  const point = async id => {
    const box = screen.querySelector('.part[data-part="' + id + '"]');
    if (!box) return;
    const r = box.getBoundingClientRect(), p = screen.getBoundingClientRect();
    ui.dot.hidden = false;
    ui.dot.style.transform =
      "translate(" + (r.left - p.left + r.width / 2 - 11) + "px," +
      (r.top - p.top + r.height / 2 - 11) + "px)";
    await wait(300);
  };

  const tap = async id => {
    await point(id);
    ui.dot.classList.add("tapping");
    await wait(140);
    ui.dot.classList.remove("tapping");
    await wait(100);
  };

  /** 이 부품 말고 눌러 볼 만한 다른 곳 */
  const elsewhere = id => job.parts
    .filter(p => p.id !== id && p.kind !== "text")
    .slice(0, 2).map(p => p.id);

  const note = (part, what) => {
    const key = part + ":" + what;
    if (stuck.indexOf(key) < 0) stuck.push(key);
  };

  try {
    for (const s of job.steps) {
      const p = partOf(job, s.part);
      if (!p) continue;
      const miss = missingOn(job, at, s.part);
      const lacks = k => miss.indexOf(k) >= 0;

      /* ① 찾기 — 무엇인지 모르면 엉뚱한 데를 눌러 본다 */
      if (lacks("name")) {
        note(s.part, "name");
        say("seek", s.part, "어느 것인지 모른다");
        for (const w of elsewhere(s.part)) {
          await tap(w);
          act(job, st, "press:" + w); redraw();
          say("miss", w, "여기가 아니다");
        }
        say("hit", s.part, "여러 번 만에 겨우 찾는다");
      } else {
        say("hit", s.part, "보고 곧장 찾는다");
      }
      await tap(s.part);

      /* ② 하기 — 할 수 있다는 것을 모르면 한 번 머뭇거린다 */
      if (s.do === "type" && lacks("type")) {
        note(s.part, "type");
        say("blind", s.part, "눌렀는데 써지는지 알 수 없다");
        await wait(700);
      }
      if ((s.do === "press") && lacks("push")) {
        note(s.part, "push");
        say("blind", s.part, "눌러도 되는 곳인지 모른다");
        await wait(700);
      }
      if ((s.do === "swipe" || s.do === "drag") && lacks("move")) {
        note(s.part, "move");
        say("blind", s.part, "밀 수 있는 줄 모른다");
        await wait(700);
      }
      if (s.do === "read" && lacks("state")) {
        note(s.part, "state");
        say("blind", s.part, "읽을 수가 없다");
        await wait(700);
        continue;
      }

      /* ③ 실제로 한다 — 단서가 있든 없든 물건은 작동한다 */
      if (s.do === "type") {
        for (let i = 1; i <= String(s.val).length; i++) {
          act(job, st, "type:" + s.part, String(s.val).slice(0, i));
          redraw(); await wait(110);
        }
        say("done", s.part, s.val + " 을 적었다");
      } else if (s.do === "read") {
        say("done", s.part, "읽어 낸다");
      } else {
        act(job, st, s.do + ":" + s.part); redraw();
        say("done", s.part, "해냈다");
      }

      /* ④ 어찌 됐는지 — 아무 말이 없으면 연타한다 */
      if (s.do === "press" && lacks("feed")) {
        note(s.part, "feed");
        say("repeat", s.part, "눌렀는데 아무 말이 없다");
        const again = 3;
        for (let k = 0; k < again; k++) {
          await tap(s.part); act(job, st, "press:" + s.part); redraw(); await wait(110);
        }
        say("repeat", s.part, again + "번 더 눌렀다");
      }
    }

    ui.dot.hidden = true;
    return verdict(job, st, evs, stuck);
  } catch (e) {
    if (e instanceof Stop) { ui.dot.hidden = true; return null; }
    throw e;
  }
}

/* ── 판정 ─────────────────────────────────────────────────── */

function verdict(job, st, evs, stuck) {
  const miss  = evs.filter(e => e.kind === "miss").length;
  const seek  = evs.filter(e => e.kind === "seek").length;
  const blind = evs.filter(e => e.kind === "blind").length;
  const secs  = evs.length ? evs[evs.length - 1].t : 0;

  const done = doneSteps(job, st);
  const stray = strayHits(job, st);

  const words = stuck.map(k => {
    const bits = k.split(":");
    const p = partOf(job, bits[0]);
    return (p && p.label ? p.label + " — " : "") + STUCK[bits[1]];
  });

  return {
    evs, secs, miss, seek, blind,
    stuck: words,
    exec: seek + miss + blind,
    evalGap: stray,
    right: done, of: job.steps.length,
    wrong: 0,
    passed: allDone(job, st),
    clean: seek === 0 && miss === 0 && blind === 0 && stray === 0 && allDone(job, st),
  };
}
