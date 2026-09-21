// 노만의 공방 — 자리들을 잇는다.
//
// 공방(제작·붙이기) · 상점(재료) · 앱시장(출품) · 문제 풀기(품삯).
// 파이어베이스에 닿는 것은 붙여 둔 것을 담아 두는 일(hci4_drafts)과
// 어느 조가 앉아 있는지 알리는 일(hci4_presence)뿐이다.

import { fresh, render, act, wears, argOf, partOf, canWear } from "./app.js";
import { queueFor } from "./jobs.js";
import { recipeById } from "./parts.js";
import { TEAMS, orderOf, partnerOf, FALLBACK } from "./orders.js";
import { pingTo, putDoc, readDoc } from "../../js/firebase.js";
import { NORMAN, BROKER, faceSVG, hasArt } from "./cast.js";
import { purse, mode, connect, takeJob as claimJob, quizLeft } from "./wallet.js";
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
let arrange = false, bare = false;
let where = "bench", lastRun = null;
let team = null, order = null, tok = null;

/* ── 화면 ─────────────────────────────────────────────────── */

function redraw(opt = {}) {
  const a = document.activeElement;
  const keep = a && a.classList && a.classList.contains("inbox")
    ? { act: a.dataset.act, s: a.selectionStart } : null;

  if (!job) return;
  render(nodes.screen, job, st, bare ? {} : purse.attached, layout, arrange);

  if (keep) {
    const n = nodes.screen.querySelector('[data-act="' + keep.act + '"]');
    if (n) { n.focus(); n.setSelectionRange(keep.s, keep.s); }
  }
  if (opt.craft !== false) Craft.paint();
  paintOrder();
}

/** 주문서 — 어디가 문제인지는 적지 않는다. 찾아내는 것이 과업이다. */
function paintOrder() {
  if (!job) return;
  nodes.order.innerHTML =
    '<p class="oeyebrow">주문서 · ' + (purse.done.length + 1) + '번째</p>' +
    '<h1>' + job.app + ' <span>' + job.screen + '</span></h1>' +
    '<p class="otask">' + job.task + '</p>' +
    '<p class="osay">쓴 사람들 말 — 「' + job.say + '」</p>' +
    '<p class="opartstop">이 화면에 있는 것 <small>눌러서 짚어 봅니다</small></p>' +
    '<p class="oparts">' + job.parts.map(function (p) {
      return '<button class="part-chip k-' + p.kind + '" data-point="' + p.id + '">' +
        (p.label || p.text || p.id) + '</button>';
    }).join("") + '</p>' +
    '<p class="ofind">화면에 무엇이 있는지는 적어 두었습니다. ' +
    '<b>어떤 단서가 부족한지</b>는 「테스트해 보기」로 직접 찾아내세요.</p>';
}

/** 의뢰를 하나 집어 든다 — 물건도 붙인 것도 새로 시작한다. */
async function takeJob(j) {
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

/* ── 하고 난 뒤 — 붙은 연장이 실제로 작동한다 ─────────────── */

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
  if (wears(at, part, "feel")) {
    blip();
    if (navigator.vibrate) navigator.vibrate(40);
    $("phone").classList.add("shake");
    setTimeout(function () { $("phone").classList.remove("shake"); }, 260);
  }
}

/* ── 손대기 — 물건은 언제나 진짜로 작동한다 ───────────────── */

nodes.screen.addEventListener("click", function (e) {
  if (arrange) return;
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

/** 부품 이름을 누르면 화면에서 잠깐 짚어 준다 */
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

/* ── 자리 옮기기 ──────────────────────────────────────────── */

$("arrange").addEventListener("click", function (e) {
  arrange = !arrange;
  e.currentTarget.classList.toggle("on", arrange);
  nodes.note.innerHTML = arrange
    ? "<b>자리를 옮기는 중입니다.</b> 왼쪽 손잡이를 끌어 순서를 바꾸세요."
    : "이 물건은 <b>이미 다 작동합니다.</b> 아무것도 알려 주지 않을 뿐입니다.";
  if (arrange) Talk.cut("norman",
    "어디에 두느냐도 중요한 단서입니다. 가까이 두면 같은 묶음으로 보입니다.");
  redraw({ craft: false });
});

let lift = null;
nodes.screen.addEventListener("pointerdown", function (e) {
  const h = e.target.closest("[data-grab]");
  if (!h) return;
  e.preventDefault();
  lift = h.dataset.grab;
  document.body.classList.add("dragging");
});
addEventListener("pointermove", function (e) {
  if (!lift) return;
  const ps = [].slice.call(nodes.screen.querySelectorAll(".part"));
  let to = ps.length - 1;
  for (let i = 0; i < ps.length; i++) {
    const r = ps[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { to = i; break; }
  }
  const from = layout.indexOf(lift);
  if (from < 0 || from === to) return;
  layout.splice(to, 0, layout.splice(from, 1)[0]);
  redraw({ craft: false });
});
addEventListener("pointerup", function () {
  if (!lift) return;
  lift = null;
  document.body.classList.remove("dragging");
  stash();
});

/* ── 머리 단추 ────────────────────────────────────────────── */

$("before").addEventListener("click", function (e) {
  bare = !bare;
  e.currentTarget.classList.toggle("on", bare);
  e.currentTarget.textContent = bare ? "내 물건" : "원래 물건";
  nodes.note.innerHTML = bare
    ? "<b>손대기 전</b> 물건입니다. 주문이 들어왔을 때 이 모습이었습니다."
    : "이 물건은 <b>이미 다 작동합니다.</b> 아무것도 알려 주지 않을 뿐입니다.";
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
  if (v) { lastRun = v; showVerdict(v); Talk.say("norman", NORMAN.verdict(v)); stash(); }
});

function unbare() {
  if (!bare) return;
  bare = false;
  const b = $("before");
  b.classList.remove("on"); b.textContent = "원래 물건";
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
    ["헛누름", v.evalGap, "엉뚱한 곳을 누르거나 같은 곳을 또 누른 횟수", v.evalGap > 0],
    ["과제 완료", v.right + " / " + v.of,
      v.passed ? "끝까지 성공했습니다" : "중간에 막혔습니다", !v.passed],
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
        v.stuck.map(function (t) { return "<li>" + t + "</li>"; }).join("") +
        '</ul><p class="stuckdim">오른쪽 <b>단서 조합표</b>에서 같은 기준을 찾으세요. ' +
        '그 줄에 적힌 재료를 사 오면 부족한 단서를 만들 수 있습니다.</p></div>'
      : "") +
    '<div class="vend">' +
      (v.passed
        ? '<button class="big" id="tomarket">다 됐다 — 앱시장에 내놓는다</button>'
        : '<p class="notyet">아직 사용자가 과제를 끝까지 해내지 못합니다. ' +
          '더 고쳐야 내놓을 수 있습니다.</p>') +
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

function coin() { $("coin").textContent = purse.point; nudgePortrait(); }

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
          ? r.n + "개 사 왔구먼. " + r.paid + "포인트 나갔네. 제작대에서 둘씩 합쳐 보게."
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
        Talk.cut("norman", a.price + "포인트 받아 왔습니다. 물건은 시장으로 갔습니다.");
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
  const o = orderOf(picking), use = (o && o.ready) ? o : FALLBACK;
  peek.hidden = false;
  peek.innerHTML =
    '<p class="pk">' + picking + "조가 맡은 물건</p><h2>" + use.name + "</h2>" +
    '<p class="pkline">' + use.line + "</p>" +
    '<p class="pkmate">같은 물건을 ' + partnerOf(picking) + "조도 맡습니다.</p>" +
    (o && !o.ready
      ? '<p class="pkwarn">「' + o.name + "」은 아직 준비 중이라 오늘은 <b>" +
        FALLBACK.name + "</b>으로 들어갑니다.</p>"
      : "");
  enterBtn.disabled = false;
});

enterBtn.addEventListener("click", function () { enter(picking); });
$("swap").addEventListener("click", function () {
  gate.hidden = false; $("bar").hidden = true;
  PLACES.forEach(function (k) { $(k).hidden = true; });
});

async function enter(n) {
  team = n;
  const o = orderOf(n);
  order = (o && o.ready) ? o : FALLBACK;
  try { localStorage.setItem("hci4_team", String(n)); } catch (e) {}

  gate.hidden = true;
  $("bar").hidden = false;
  $("teamtag").textContent = n + "조";
  nodes.whoami.textContent = "주문서 · " + order.name;

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
  Talk.say("norman", "재료는 「상점」에서 사다 제작대에서 둘씩 합치게. " +
    "주머니에 1000포인트 있네.", 3600);
  Talk.say("norman", NORMAN.broke);
  go("bench");
  beat();
}

/** 끌고 있는 연장이 이 부품에 붙을 수 있는가 — 테두리를 띄울 때 쓴다 */
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
  return queue[0];
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
      team: team, order: order.id,
      work: JSON.stringify({ job: job ? job.id : null, layout: layout }),
    }).catch(function (e) { console.warn("저장", (e && (e.code || e.message)) || e); });
  }, 1600);
}

let heart = null;
function beat() {
  clearInterval(heart);
  const send = function () {
    pingTo("hci4_presence", { team: team, order: order.id, where: "공방" });
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
