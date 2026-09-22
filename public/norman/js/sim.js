// 돌려 보기 — 만든 화면을 공방에서 직접 시험한다.
//
// 곁에서 누가 떠드는 것이 아니다. 의뢰에 적힌 차례(steps)를 그대로 걷고,
// 부품이 알려야 할 것(need)이 빠져 있으면 그 자리에서 멈춘다.
// 조에게는 「어디서 멈췄는지」만 돌려준다. 고칠 곳은 짚어 주지 않는다.

import { act, partOf, missingOn, doneSteps, allDone, strayHits } from "./app.js";
import { GAPNAME } from "./kit.js";

export class Stop extends Error {}

function sleeper(tok) {
  return ms => new Promise((res, rej) => {
    if (tok.dead) return rej(new Stop());
    const t = setTimeout(res, ms);
    tok.cancels.push(() => { clearTimeout(t); rej(new Stop()); });
  });
}

const STUCK = {
  name:  "무엇을 하는 곳인지 모름",
  type:  "입력할 수 있는 칸인지 모름",
  push:  "터치할 수 있는 곳인지 모름",
  feed:  "조작한 뒤 결과를 알 수 없음",
  state: "현재 상태를 알 수 없음",
  move:  "밀거나 끌 수 있는지 모름",
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

  /** 이 부품 말고 터치해 볼 만한 다른 곳 */
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

      /* ① 찾기 — 무엇인지 모르면 엉뚱한 데를 터치해 본다 */
      if (lacks("name")) {
        note(s.part, "name");
        say("seek", s.part, "어느 요소를 써야 하는지 모름");
        for (const w of elsewhere(s.part)) {
          await tap(w);
          act(job, st, "press:" + w); redraw();
          say("miss", w, "다른 곳을 터치해 봄");
        }
        say("hit", s.part, "여러 번 시도한 뒤 겨우 찾음");
      } else {
        say("hit", s.part, "보고 바로 찾음");
      }
      await tap(s.part);

      /* ② 하기 — 할 수 있다는 것을 모르면 한 번 머뭇거린다 */
      if (s.do === "type" && lacks("type")) {
        note(s.part, "type");
        say("blind", s.part, "입력할 수 있는 칸인지 알 수 없음");
        await wait(700);
      }
      if ((s.do === "press") && lacks("push")) {
        note(s.part, "push");
        say("blind", s.part, "터치할 수 있는 곳인지 알 수 없음");
        await wait(700);
      }
      if ((s.do === "swipe" || s.do === "drag") && lacks("move")) {
        note(s.part, "move");
        say("blind", s.part, "밀거나 끌 수 있는지 알 수 없음");
        await wait(700);
      }
      if (s.do === "read" && lacks("state")) {
        note(s.part, "state");
        say("blind", s.part, "현재 상태를 읽을 수 없음");
        await wait(700);
        continue;
      }

      /* ③ 실제로 한다 — 단서가 있든 없든 화면은 작동한다 */
      if (s.do === "type") {
        for (let i = 1; i <= String(s.val).length; i++) {
          act(job, st, "type:" + s.part, String(s.val).slice(0, i));
          redraw(); await wait(110);
        }
        say("done", s.part, s.val + "을 입력함");
      } else if (s.do === "read") {
        say("done", s.part, "상태를 확인함");
      } else {
        act(job, st, s.do + ":" + s.part); redraw();
        say("done", s.part, "조작을 수행함");
      }

      /* ④ 그래서 지금 어떤 상태인가 — 켜졌는지 골랐는지 모르면 멈춘다.
         체크·스위치·탭이 여기에 걸린다. 평가의 간극이다. */
      if (s.do !== "read" && lacks("state")) {
        note(s.part, "state");
        say("blind", s.part, "터치했지만 지금 어떤 상태인지 알 수 없음");
        await wait(700);
      }

      /* ⑤ 어찌 됐는지 — 아무 말이 없으면 같은 곳을 반복 터치한다 */
      if (s.do === "press" && lacks("feed")) {
        note(s.part, "feed");
        say("repeat", s.part, "터치했지만 결과가 보이지 않음");
        const again = 3;
        for (let k = 0; k < again; k++) {
          await tap(s.part); act(job, st, "press:" + s.part); redraw(); await wait(110);
        }
        say("repeat", s.part, again + "번 더 터치해 봄");
      }
    }

    /* ⑥ 빠뜨린 것이 없는지 마지막으로 훑는다.
       여기서 잡히는 것은 앱시장이 잡는 것과 같다. 둘이 다른 말을 하면
       「테스트는 됐다는데 시장은 안 받는다」가 되어, 조는 무엇을 믿어야
       할지 알 수 없게 된다. */
    const seen = {};
    let blocked = 0;
    for (const s of job.steps) {
      if (seen[s.part]) continue;          // 한 부품을 두 번 밟아도 한 군데다
      seen[s.part] = true;
      const left = missingOn(job, at, s.part);
      if (left.length) blocked++;
      for (const k of left) note(s.part, k);
    }

    ui.dot.hidden = true;
    return verdict(job, st, evs, stuck, blocked);
  } catch (e) {
    if (e instanceof Stop) { ui.dot.hidden = true; return null; }
    throw e;
  }
}

/* ── 판정 ─────────────────────────────────────────────────── */

function verdict(job, st, evs, stuck, blocked) {
  const miss  = evs.filter(e => e.kind === "miss").length;
  const seek  = evs.filter(e => e.kind === "seek").length;
  const blind = evs.filter(e => e.kind === "blind").length;
  const secs  = evs.length ? evs[evs.length - 1].t : 0;

  const done = doneSteps(job, st);
  const stray = strayHits(job, st);

  // 의뢰가 그 부품에 맞는 말을 적어 두었으면 그것을 쓴다.
  // 「터치할 수 있는 곳인지 모름」보다 「카드 전체를 터치해 들어갈 수 있는지
  // 알기 어렵습니다」가 학생에게 훨씬 잘 와닿는다.
  // 의뢰가 제 화면에 맞는 말을 적어 두었으면 그것을 쓴다. 다만 **어느
  // 기준이 모자란지는 언제나 함께 적는다** — 그 말이 조합표의 묶음
  // 이름과 같아서, 조는 그것을 보고 무엇을 만들지 찾는다.
  const words = stuck.map(k => {
    const bits = k.split(":");
    const p = partOf(job, bits[0]);
    const own = p && p.stuck && p.stuck[bits[1]];
    return {
      gap: GAPNAME[bits[1]] || bits[1],
      text: own || (p && p.label ? p.label + " — " : "") + STUCK[bits[1]],
    };
  });

  return {
    evs, secs, miss, seek, blind,
    stuck: words,
    exec: seek + miss + blind,
    evalGap: stray,
    right: done, of: job.steps.length,
    wrong: 0,
    blocked: blocked,
    passed: allDone(job, st),
    // 앱시장이 받아 줄 화면인가. 과제를 끝냈다는 것과는 다른 물음이다 —
    // 끝까지 가기는 했지만 무엇이 골라졌는지 모르는 화면이 있다.
    sellable: blocked === 0,
    clean: seek === 0 && miss === 0 && blind === 0 && stray === 0 &&
           blocked === 0 && allDone(job, st),
  };
}
