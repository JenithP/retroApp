// 노만의 공방 — 자리들을 잇는다.
//
// 공방(제작·붙이기) · 상점(재료) · 앱시장(출품) · 문제 풀기(보상).
// 파이어베이스에 닿는 것은 붙여 둔 것을 담아 두는 일(hci4_drafts)과
// 어느 조가 앉아 있는지 알리는 일(hci4_presence)뿐이다.

import { fresh, render, act, wears, argOf, partOf, canWear } from "./app.js";
import { queueFor, TEAMS, JOBS, jobById } from "./jobs.js";
const JOBCOUNT = JOBS.length;
import { recipeById } from "./parts.js";

import { pingTo, putDoc, readDoc } from "../../js/firebase.js";
import { NORMAN, BROKER, faceSVG, hasArt } from "./cast.js";
import { purse, mode, session, connect, takeJob as claimJob, quizLeft,
         logRun, report, onChange as onWallet } from "./wallet.js";
import * as Report from "./report.js";
import * as Talk from "./talk.js";
import * as Craft from "./craft.js";
import * as Shop from "./shop.js";
import * as Market from "./market.js";
import * as Quiz from "./quiz.js";
import * as Sim from "./sim.js";

const $ = id => document.getElementById(id);
const nodes = {
  screen: $("screen"), craft: $("craft"), order: $("order"),
  toast: $("toast"), check: $("checkfx"), verdict: $("verdict"),
  note: $("phonenote"), whoami: $("whoami"),
};

let queue = [], job = null, st = null;
let layout = [];                      // 부품 차례. 붙인 단서는 서버 지갑에 있다.
let bare = false;
let where = "bench", lastRun = null;
let team = null, tok = null;

/* ── 화면 ─────────────────────────────────────────────────── */

function redraw(opt = {}) {
  const a = document.activeElement;
  const keep = a && a.classList && a.classList.contains("inbox")
    ? { act: a.dataset.act, s: a.selectionStart } : null;

  if (!job) return;
  render(nodes.screen, job, st, bare ? {} : purse.attached, layout, false);

  if (keep) {
    const n = nodes.screen.querySelector('[data-act="' + keep.act + '"]');
    if (n) { n.focus(); n.setSelectionRange(keep.s, keep.s); }
  }
  if (opt.craft !== false) Craft.paint();
  paintOrder();
  paintShelf();
}

/** 선반 — 앱시장에 내놓은 것이 쌓인다. 무엇을 만들어 팔았는지 보인다. */
function paintShelf() {
  const box = $("shelf");
  if (!box) return;
  const sold = purse.sold || [];
  box.hidden = false;
  const worn = sold.reduce(function (a, s) { return a + (s.worn || []).length; }, 0);
  box.innerHTML =
    "<h4>만든 앱 <em>" + sold.length + (worn ? " · 시그니파이어 " + worn : "") +
      "</em></h4>" +
    (sold.length
      ? "<ol>" + sold.map(function (s) {
          const j = jobById(s.job) || {};
          return "<li><i>+" + (s.price || 0) + "</i><b>" + (j.app || "") + "</b>" +
            "<span>" + (j.screen || s.job) +
            ((s.worn || []).length ? " · 시그니파이어 " + s.worn.length + "개" : "") +
            "</span></li>";
        }).join("") + "</ol>"
      : '<p class="none">아직 앱시장에 내놓은 것이 없습니다. ' +
        "하나를 고쳐 팔면 여기에 쌓입니다.</p>");
}

/** 주문서 — 어디가 문제인지는 적지 않는다. 찾아내는 것이 과업이다. */
function paintOrder() {
  if (noMore) {
    nodes.order.innerHTML =
      '<p class="oeyebrow">주문서</p>' +
      "<h1>더 들어온 의뢰가 없습니다</h1>" +
      '<p class="otask">마흔 가지를 모두 앱시장에 내놓았습니다. ' +
      "왼쪽 선반에 만든 앱이 쌓여 있습니다. 남은 시간에는 <b>문제 풀기</b>로 " +
      "포인트를 더 벌 수 있습니다.</p>";
    return;
  }
  if (!job) return;
  nodes.order.innerHTML =
    '<p class="oeyebrow">주문서 · ' + (purse.done.length + 1) + '번째</p>' +
    '<h1>' + job.app + ' <span>' + job.screen + '</span></h1>' +
    '<p class="otask">' + job.task + '</p>' +
    '<p class="osay">사용자 말 — 「' + job.say + '」</p>' +
    '<p class="opartstop">이 화면에 있는 것 <small>터치해서 짚어 봅니다</small></p>' +
    '<p class="oparts">' + job.parts.map(function (p) {
      return '<button class="part-chip k-' + p.kind + '" data-point="' + p.id + '">' +
        (p.label || p.text || p.id) + '</button>';
    }).join("") + '</p>' +
    '<p class="ofind">화면에 무엇이 있는지는 적어 두었습니다. ' +
    '<b>어떤 단서가 부족한지</b>는 「테스트해 보기」로 직접 찾아내세요.</p>';
}

/** 의뢰를 하나 집어 든다 — 화면도 붙인 것도 새로 시작한다. */
let noMore = false;

async function takeJob(j) {
  if (!j) { noMore = true; paintOrder(); Talk.cut("norman",
    "마흔 가지 의뢰를 모두 끝냈습니다. 남은 시간에는 문제를 풀어 더 버십시오."); return; }
  noMore = false;
  job = j;
  st = fresh(job);
  layout = job.parts.map(function (p) { return p.id; });
  try { await claimJob(job.id); } catch (e) { console.warn('의뢰', e); }
  lastRun = null;
  nodes.verdict.hidden = true;
  nodes.whoami.textContent = "맡은 일 — " + job.app + " " + job.screen;
}

/* ── 붙이고 떼기 ──────────────────────────────────────────── */

/** 붙이고 떼는 일은 제작대가 서버에 맡긴다. 여기서는 붙은 뒤에 알릴 뿐이다. */
function afterAttach(part, r) {
  const lp = partOf(job, part);
  Talk.cut("norman", (lp && lp.label ? lp.label : part) + '에 「' + r.name + '」 단서를 붙였습니다.');
  redraw();
}

/* ── 하고 난 뒤 — 붙은 단서가 실제로 작동한다 ─────────────── */

let ac = null;
function blip() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 880; o.type = "triangle";
    g.gain.setValueAtTime(.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.18, ac.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .16);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + .18);
  } catch (e) { /* 소리가 안 나도 실습은 돈다 */ }
}

let toastTimer = 0;
function fire(part) {
  const at = bare ? {} : purse.attached;
  if (wears(at, part, "toast")) {
    nodes.toast.textContent = argOf(at, part, "toast") || "…";
    nodes.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { nodes.toast.hidden = true; }, 1500);
  }
  if (wears(at, part, "done")) {
    nodes.check.hidden = false;
    nodes.check.classList.remove("pop");
    void nodes.check.offsetWidth;
    nodes.check.classList.add("pop");
    setTimeout(function () { nodes.check.hidden = true; }, 700);
  }
  if (wears(at, part, "busy")) {
    nodes.toast.className = "toast spin";
    nodes.toast.textContent = "처리 중…";
    nodes.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      nodes.toast.hidden = true; nodes.toast.className = "toast";
    }, 1400);
  }
  if (wears(at, part, "feel")) {
    blip();
    if (navigator.vibrate) navigator.vibrate(40);
    $("phone").classList.add("shake");
    setTimeout(function () { $("phone").classList.remove("shake"); }, 260);
  }
}

/* ── 손대기 — 화면은 언제나 진짜로 작동한다 ───────────────── */

nodes.screen.addEventListener("click", function (e) {
  const ctl = e.target.closest("[data-act]");
  if (!ctl || ctl.dataset.act.indexOf("type") === 0) return;
  if (ctl.dataset.act.indexOf("read") === 0) return;
  const r = act(job, st, ctl.dataset.act);
  redraw({ craft: false });
  if (r.part && r.did && r.did !== "empty") fire(r.part);
  if (r.did === "empty") {
    ctl.classList.add("nope");
    setTimeout(function () { ctl.classList.remove("nope"); }, 320);
  }
});

nodes.screen.addEventListener("input", function (e) {
  const n = e.target.closest("[data-act]");
  if (!n || n.dataset.act.indexOf("type") !== 0) return;
  act(job, st, n.dataset.act, n.value);
  redraw({ craft: false });
});

/** 부품 이름을 터치하면 화면에서 잠깐 짚어 준다 */
nodes.order.addEventListener("click", function (e) {
  const c = e.target.closest("[data-point]");
  if (!c) return;
  const box = nodes.screen.querySelector('.part[data-part="' + c.dataset.point + '"]');
  if (!box) return;
  nodes.screen.querySelectorAll(".part.picked").forEach(function (n) {
    n.classList.remove("picked");
  });
  box.classList.add("picked");
  setTimeout(function () { box.classList.remove("picked"); }, 1800);
});


/* ── 머리 버튼 ────────────────────────────────────────────── */

$("before").addEventListener("click", function (e) {
  bare = !bare;
  e.currentTarget.classList.toggle("on", bare);
  e.currentTarget.textContent = bare ? "내 화면" : "원래 화면";
  nodes.note.innerHTML = bare
    ? "<b>단서를 붙이기 전</b> 화면입니다. 의뢰가 들어왔을 때 이 모습이었습니다."
    : "이 화면은 <b>이미 다 작동합니다.</b> 무엇을 할 수 있는지 알려 주지 않을 뿐입니다.";
  redraw({ craft: false });
});

$("reset").addEventListener("click", function () {
  stopSim(); st = fresh(job);
  nodes.verdict.hidden = true;
  const g = document.querySelector(".guestbox"); if (g) g.remove();
  Talk.cut("norman", NORMAN.rule);
  redraw();
});

$("cold").addEventListener("click", async function () {
  stopSim(); st = fresh(job); unbare();
  redraw();
  nodes.note.innerHTML = "<b>테스트 중입니다.</b> 사용자가 어디서 막히는지 보세요.";

  const dot = document.createElement("div");
  dot.className = "cursor"; dot.hidden = true;
  $("phone").appendChild(dot);

  Talk.hush();
  Talk.say("norman", NORMAN.beforeTest, 1600);

  nodes.verdict.hidden = false;
  nodes.verdict.innerHTML = '<h3>테스트 중…</h3><ol class="tl" id="tl"></ol>';
  const tl = $("tl");

  tok = { dead: false, cancels: [] };
  const v = await Sim.cold({
    job: job, st: st, attached: purse.attached, screen: nodes.screen, dot: dot, tok: tok,
    redraw: function () { redraw({ craft: false }); },
    log: function (e) {
      const li = document.createElement("li");
      li.className = "ev k-" + e.kind;
      li.innerHTML = "<b>" + e.t.toFixed(1) + "초</b><span>" + e.text + "</span>";
      tl.appendChild(li); tl.scrollTop = tl.scrollHeight;
    },
  });
  dot.remove();
  if (v) {
    lastRun = v; showVerdict(v); Talk.say("norman", NORMAN.verdict(v)); stash();
    // 워크북에 「처음엔 이랬고 고친 뒤엔 이랬다」를 적으려면 남겨야 한다
    logRun(v);
  }
});

function unbare() {
  if (!bare) return;
  bare = false;
  const b = $("before");
  b.classList.remove("on"); b.textContent = "원래 화면";
}

function stopSim() {
  if (!tok) return;
  tok.dead = true;
  tok.cancels.forEach(function (f) { f(); });
  tok = null;
  const c = document.querySelector(".cursor"); if (c) c.remove();
}

/* ── 판정 — 고칠 곳이 아니라 「무엇이 불편했는지」를 준다 ──── */

function showVerdict(v) {
  const rows = [
    ["막힌 횟수", v.exec, "무엇을 해야 할지 몰라 멈춘 횟수", v.exec > 0],
    ["잘못 터치함", v.evalGap, "엉뚱한 곳을 터치하거나 같은 곳을 또 터치한 횟수", v.evalGap > 0],
    ["과제 완료", v.right + " / " + v.of,
      v.passed ? "끝까지 성공했습니다" : "중간에 막혔습니다", !v.passed],
    ["모자란 단서", v.blocked, v.blocked
      ? "이만큼 채워야 앱시장이 받아 줍니다" : "앱시장에 내놓을 수 있습니다",
      v.blocked > 0],
    ["걸린 시간", v.secs.toFixed(1) + "초", "", false],
  ];

  nodes.verdict.innerHTML =
    "<h3>테스트 결과 " + (v.clean
      ? "<em class='good'>막힘이 없었습니다</em>"
      : "<em class='bad'>막히는 데가 있습니다</em>") + "</h3>" +
    '<div class="scores">' + rows.map(function (r) {
      return '<div class="score' + (r[3] ? " hot" : "") + '"><b>' + r[1] +
        "</b><span>" + r[0] + "</span><small>" + r[2] + "</small></div>";
    }).join("") + "</div>" +
    (v.stuck.length
      ? '<div class="stuck"><p class="stucktop">사용자가 막힌 이유</p><ul>' +
        v.stuck.map(function (s) {
          return '<li><b class="gap">' + s.gap + "</b>" + s.text + "</li>";
        }).join("") +
        '</ul><p class="stuckdim">굵은 글씨가 <b>모자란 단서의 이름</b>입니다. ' +
        '오른쪽 <b>단서 조합표</b>에서 같은 이름의 묶음을 찾아, 그 줄에 적힌 ' +
        '재료를 상점에서 사 오세요.</p></div>'
      : "") +
    // 앱시장이 받아 줄 화면일 때만 내놓기를 연다. 과제를 끝까지 해냈다는
    // 것만으로는 모자란다 — 끝까지 가기는 했지만 무엇이 골라졌는지 모르는
    // 화면이 있다. 여기서 열어 두면 시장에 가서 되돌아온다.
    '<div class="vend">' +
      (v.sellable
        ? '<button class="big" id="tomarket">다 됐습니다 — 앱시장에 내놓기</button>'
        : '<p class="notyet">' + (v.passed
            ? "끝까지 해내기는 했지만 아직 " + v.blocked +
              "군데에 단서가 모자랍니다. "
            : "아직 사용자가 과제를 끝까지 해내지 못합니다. ") +
          "더 고쳐야 내놓을 수 있습니다.</p>") +
    "</div>" +
    '<ol class="tl">' + v.evs.map(function (e) {
      return '<li class="ev k-' + e.kind + '"><b>' + e.t.toFixed(1) +
        "초</b><span>" + e.text + "</span></li>";
    }).join("") + "</ol>";
}

nodes.verdict.addEventListener("click", function (e) {
  if (e.target.closest("#tomarket")) go("market");
});

/* ── 자리 옮기기 — 공방 · 상점 · 앱시장 · 문제 풀기 ───────── */

const PLACES = ["bench", "shop", "market", "quiz"];

function coin() { $("coin").textContent = purse.point; nudgePortrait(); paintShelf(); }

function lit(who) {
  const p = $("portrait");
  if (p) p.classList.toggle("talking", who === "norman");
}

const LOW = 150;
let nagged = false;
function nudgePortrait() {
  const port = $("portrait");
  if (!port) return;
  const low = purse.point < LOW && quizLeft() > 0;
  port.classList.toggle("low", low);
  $("portping").hidden = !low;
  if (low && !nagged && where === "bench") {
    nagged = true;
    Talk.say("norman", NORMAN.lowPoint(purse.point));
  }
  if (!low) nagged = false;
}
$("portrait").addEventListener("click", function () { go("quiz"); });

function go(to) {
  where = to;
  stopSim();
  $("places").querySelectorAll(".place").forEach(function (b) {
    b.classList.toggle("on", b.dataset.go === to);
  });
  PLACES.forEach(function (k) { $(k).hidden = to !== k; });
  coin();

  if (to === "shop")
    Shop.open($("shop"), {
      talk: function (w, t) { Talk.cut(w, t); },
      onDone: function (r) {
        go("bench"); stash();
        Talk.cut("norman", r.n
          ? r.n + "개를 샀습니다. " + r.paid + "포인트를 썼어요. 제작대에서 재료 두 개씩 조합해 보세요."
          : NORMAN.rule);
        nagged = false; nudgePortrait();
      },
    });

  if (to === "market")
    Market.open($("market"), {
      
      talk: function (w, t) { Talk.cut(w, t); },
      onBack: function () { go("bench"); },
      onSold: async function (a) {
        coin();
        await takeJob(pickJob());
        go("bench");
        Talk.cut("norman", a.price + "포인트를 받았습니다. 이 의뢰는 시장에 넘겼어요.");
        Talk.say("critic", BROKER.next(job), 3400);
      },
    });

  if (to === "quiz")
    Quiz.open($("quiz"), {
      talk: function (w, t) { Talk.cut(w, t); },
      onChange: function () { coin(); stash(); },
      onBack: function () { go("bench"); },
    });

  if (to === "bench") redraw();
}

$("places").addEventListener("click", function (e) {
  const b = e.target.closest("[data-go]");
  if (b) go(b.dataset.go);
});

/* ── 조 고르기 ────────────────────────────────────────────── */

const gate = $("gate"), grid = $("teamgrid"), peek = $("orderpeek"), enterBtn = $("enter");
let picking = null;

for (let n = 1; n <= TEAMS; n++) {
  const b = document.createElement("button");
  b.className = "teamcell"; b.dataset.team = n; b.textContent = n + "조";
  grid.appendChild(b);
}

grid.addEventListener("click", function (e) {
  const b = e.target.closest(".teamcell");
  if (!b) return;
  picking = Number(b.dataset.team);
  grid.querySelectorAll(".teamcell").forEach(function (x) {
    x.classList.toggle("on", Number(x.dataset.team) === picking);
  });
  const first = queueFor(picking)[0];
  peek.hidden = false;
  peek.innerHTML =
    '<p class="pk">' + picking + "조의 첫 의뢰</p>" +
    "<h2>" + first.app + ' <span>' + first.screen + '</span></h2>' +
    '<p class="pkline">' + first.task + "</p>" +
    '<p class="pkmate">공방에서 열심히 고쳐 좋은 상품을 만들어 앱시장에 내십시오.<br>' +
    "하나를 완성해 팔면 다음 의뢰가 들어옵니다. 모두 " + JOBCOUNT + "가지입니다.</p>";
  enterBtn.disabled = false;
});

enterBtn.addEventListener("click", function () { enter(picking); });
$("swap").addEventListener("click", function () {
  gate.hidden = false; $("bar").hidden = true;
  PLACES.forEach(function (k) { $(k).hidden = true; });
});

async function enter(n) {
  team = n;
  try { localStorage.setItem("hci4_team", String(n)); } catch (e) {}

  gate.hidden = true;
  $("bar").hidden = false;
  $("teamtag").textContent = n + "조";

  queue = queueFor(n);
  Talk.mount($("talk"), { onWho: lit });
  Talk.say("norman", NORMAN.wake(n), 3200);

  Craft.mount({
    nodes: nodes,
    talk: function (w, t) { Talk.cut(w, t); },
    onChange: function () { coin(); stash(); },
    onAttached: afterAttach,
    markTargets: function (kinds) {
      nodes.screen.querySelectorAll(".part").forEach(function (p) {
        p.classList.toggle("target", !!kinds && canDropHere(p.dataset.part, kinds));
      });
    },
    canDrop: function (partId, rid) { return canWear(job, partId, rid); },
    labelOf: function (partId) {
      const p = partOf(job, partId);
      return p ? (p.label || p.text || partId) : partId;
    },
  });
  Craft.drag($("drag"));

  await connect(n);
  if (!mode.server) {
    const t = $("netmsg"), d = $("netdot");
    if (t) { t.textContent = "연습 모드"; t.title = mode.why; }
    if (d) d.className = "dot warn";
  }
  await restore();
  await takeJob(pickJob());
  restoreLayout();
  BROKER.knock(job).forEach(function (t, i) { Talk.say("critic", t, i < 2 ? 2600 : 3200); });
  Talk.say("norman", NORMAN.heard(), 3400);
  Talk.say("norman", "재료는 「상점」에서 사고, 제작대에서 두 개씩 조합하세요. " +
    "처음 주머니에는 1000포인트가 있습니다.", 3600);
  Talk.say("norman", NORMAN.broke);
  go("bench");
  beat();
  follow();
  // 활동이 이미 닫힌 뒤에 들어왔다면 곧바로 닫힌 화면을 보여 준다
  if (session.ended) close();
}

/* ── 네 대가 같이 본다 ────────────────────────────────────────
   한 조가 피시 네 대로 들어온다. 네 대 모두 같은 지갑(hci4_wallets/team N)을
   쓰므로 산 것도 붙인 것도 이미 공유되지만, 화면은 제 차례가 올 때까지 옛
   숫자를 들고 있었다. 지갑이 바뀔 때마다 다시 그려 준다. */

function follow() {
  onWallet(function () {
    if (session.ended) return close();
    coin();
    // 옆자리가 화면을 팔고 다음 의뢰를 집었다면 이쪽도 따라간다
    if (purse.job && (!job || purse.job !== job.id)) {
      const next = queue.find(function (j) { return j.id === purse.job; });
      if (next) {
        takeJob(next).then(function () { restoreLayout(); redraw(); });
        Talk.cut("norman", "옆자리에서 다음 의뢰를 집었습니다 — " +
          next.app + " " + next.screen + ".");
        return;
      }
    }
    redraw();
  });
}

/* ── 활동이 끝났을 때 ─────────────────────────────────────────
   교수가 현황판에서 종료를 터치하면 서버가 포인트를 더 움직이지 않는다.
   학생 화면은 여기서 멈추고, 자기 조 기록이 적힌 워크북을 내려 준다. */

let closedAlready = false;
function close() {
  if (closedAlready) return;
  closedAlready = true;
  stopSim();
  coin();
  const box = $("closing");
  box.hidden = false;
  box.innerHTML =
    '<div class="closebox">' +
      "<p class=\"oeyebrow\">조별 활동 종료</p>" +
      "<h2>오늘 공방 문을 닫습니다</h2>" +
      "<p>" + team + "조가 한 일이 그대로 적힌 <b>4주차 실습보고서</b>를 " +
      "내려받으십시오. 숫자는 이미 채워져 있습니다 — 학번과 이름, 그리고 " +
      "생각만 적으면 됩니다.</p>" +
      '<p class="mine"></p>' +
      '<button class="big" id="getdoc">실습보고서 내려받기</button>' +
      '<p class="dim">워드와 한글에서 열립니다. 한 사람씩 각자 내려받으세요.</p>' +
    "</div>";

  report().then(function (r) {
    const g = Report.gather(r.team || team, r.purse || purse);
    box.querySelector(".mine").innerHTML =
      "만든 앱 <b>" + g.jobs.filter(function (j) { return j.price != null; }).length +
      "</b>개 · 완성한 시그니파이어 <b>" + g.totalWorn + "</b>개 · 맞힌 문제 <b>" +
      g.solved + " / " + g.ofQuiz + "</b> · 남은 포인트 <b>" + g.point + "</b>";
  });

  $("getdoc").addEventListener("click", function () {
    this.disabled = true;
    report().then(function (r) {
      Report.download(r.team || team, r.purse || purse, { practice: !r.server });
      document.getElementById("getdoc").disabled = false;
    });
  });
}

/** 끌고 있는 단서가 이 부품에 붙을 수 있는가 — 테두리를 띄울 때 쓴다 */
const BUCKET = { input: "input", button: "button", card: "button", icon: "button",
  pin: "button", thumb: "button", check: "button", toggle: "button", tab: "button",
  list: "list", slider: "list", progress: "list", status: "list", text: "none" };
function canDropHere(partId, kinds) {
  const p = partOf(job, partId);
  return !!p && kinds.indexOf(BUCKET[p.kind]) >= 0;
}

/* ── 담아 두고 되찾기 ─────────────────────────────────────── */

let saved = null;

/** 줄 세운 의뢰 가운데 아직 안 판 것을 집는다 */
function pickJob() {
  const done = purse.done || [];
  for (const j of queue) if (done.indexOf(j.id) < 0) return j;
  return null;                        // 마흔을 다 끝냈다
}

/** 부품을 어떤 차례로 놓았는지만 되살린다. 붙인 단서는 서버 지갑에 있다. */
function restoreLayout() {
  if (!saved || !job || saved.job !== job.id) return;
  if (Array.isArray(saved.layout) && saved.layout.length) {
    layout = saved.layout.filter(function (x) { return !!partOf(job, x); });
    job.parts.forEach(function (p) { if (layout.indexOf(p.id) < 0) layout.push(p.id); });
  }
}

async function restore() {
  try {
    const d = await readDoc("hci4_drafts", "team" + team);
    if (d && d.work) saved = JSON.parse(d.work);
  } catch (e) { console.warn("되찾기", (e && (e.code || e.message)) || e); }
  coin();
}

let saveTimer = 0;
function stash() {
  if (!team) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    putDoc("hci4_drafts", "team" + team, {
      team: team,
      work: JSON.stringify({ job: job ? job.id : null, layout: layout }),
    }).catch(function (e) { console.warn("저장", (e && (e.code || e.message)) || e); });
  }, 1600);
}

let heart = null;
function beat() {
  clearInterval(heart);
  const send = function () {
    pingTo("hci4_presence", { team: team, job: job ? job.id : null, where: "공방" });
  };
  send();
  heart = setInterval(send, 60000);
}

/* ── 시작 ─────────────────────────────────────────────────── */

try {
  const last = Number(localStorage.getItem("hci4_team"));
  if (last >= 1 && last <= TEAMS) {
    const c = grid.querySelector('.teamcell[data-team="' + last + '"]');
    if (c) c.click();
  }
} catch (e) {}
