// 노만의 공방 — 작업대를 잇는다.
//
// 지금 파이어베이스에 닿는 것은 둘뿐이다 — 붙여 둔 단서를 담아 두는 것(hci4_drafts)과
// 어느 조가 앉아 있는지 알리는 것(hci4_presence). 둘 다 돈과 무관하다.
// 상점·장부·품평은 아직 없다. 그쪽은 서버 함수를 거쳐야 하므로 나중에 얹는다.

import { APP, fresh, render, act, argOf, has } from "./app.js";
import { TEAMS, orderOf, partnerOf, FALLBACK } from "./orders.js";
import { pingTo, putDoc, readDoc } from "../../js/firebase.js";
import { NORMAN, faceSVG } from "./cast.js";
import * as Talk from "./talk.js";
import * as Ed from "./editor.js";
import * as Sim from "./sim.js";

const $ = id => document.getElementById(id);
const nodes = {
  screen: $("screen"), hats: $("hats"), palette: $("palette"), cats: $("cats"),
  order: $("order"), toast: $("toast"), check: $("checkfx"), verdict: $("verdict"),
  elname: $("elname"), elhint: $("elhint"), note: $("phonenote"), whoami: $("whoami"),
};

let st = fresh();
const scripts = {};                   // 자리에 붙은 단서. 통째로 갈아 끼우지 않는다.
let sel = null;
let tok = null;                       // 시연 중단용
let team = null;                      // 조 번호
let order = null;                     // 맡은 물건

/* ── 화면 ─────────────────────────────────────────────────── */

function redraw(opt = {}) {
  const a = document.activeElement;
  const keep = a?.classList?.contains("namebox")
    ? { v: a.value, s: a.selectionStart } : null;

  render(nodes.screen, st, scripts, sel);

  if (keep) {
    const n = nodes.screen.querySelector(".namebox");
    if (n) { n.value = keep.v; n.focus(); n.setSelectionRange(keep.s, keep.s); }
  }
  if (opt.hats !== false) { Ed.hats(sel); Sim.clearBlame(nodes.hats); }
  paintOrder();
}

function paintOrder() {
  const el = APP.elements.find(e => e.id === sel);
  nodes.order.innerHTML =
    `<p class="oeyebrow">주문서</p>
     <h1>${APP.name}</h1>
     <p class="otask">${APP.task}</p>
     <p class="oparts">${APP.elements.map(e =>
        `<button class="part${e.id === sel ? " on" : ""}" data-pick="${e.id}">${e.label}</button>`
      ).join("")}</p>` +
    (el ? `<p class="onote">${el.note}</p>` : "");
}

function pick(el) {
  sel = el;
  const e = APP.elements.find(x => x.id === el);
  nodes.elname.textContent = e ? e.label : "부품을 고르세요";
  nodes.elhint.textContent = e ? e.note : "가운데 화면에서 손볼 곳을 누릅니다";
  redraw();
}

/* ── 하고 난 뒤 — 붙은 단서가 실제로 작동한다 ─────────────── */

let ac = null;
function blip() {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
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
function fire(el) {
  if (has(scripts, el, "after", "toast")) {
    const msg = argOf(scripts, el, "after", "toast") || "…";
    nodes.toast.textContent = msg;
    nodes.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { nodes.toast.hidden = true; }, 1500);
  }
  if (has(scripts, el, "after", "check")) {
    nodes.check.hidden = false;
    nodes.check.classList.remove("pop");
    void nodes.check.offsetWidth;
    nodes.check.classList.add("pop");
    setTimeout(() => { nodes.check.hidden = true; }, 700);
  }
  if (has(scripts, el, "after", "buzz")) {
    blip();
    navigator.vibrate?.(40);
    document.getElementById("phone").classList.add("shake");
    setTimeout(() => document.getElementById("phone").classList.remove("shake"), 260);
  }
  Sim.glow(nodes.hats, "after");
}

/* ── 손대기 ───────────────────────────────────────────────── */

nodes.screen.addEventListener("click", e => {
  const ctl = e.target.closest("[data-act]");
  if (ctl) {                                   // 진짜로 작동한다 — 언제나
    if (ctl.dataset.act === "name") { pick("name"); return; }
    const r = act(st, ctl.dataset.act, scripts);
    redraw({ hats: false });
    if (r.el && r.did && r.did !== "locked") fire(r.el);
    if (r.did === "locked") nudge(ctl);
    if (r.el) { pick(r.el); }
    return;
  }
  const box = e.target.closest(".field");
  if (box) pick(box.dataset.el);
});

nodes.screen.addEventListener("input", e => {
  if (e.target.classList.contains("namebox")) st.name = e.target.value;
});

function nudge(n) {
  n.classList.add("nope");
  setTimeout(() => n.classList.remove("nope"), 320);
}

nodes.order.addEventListener("click", e => {
  const b = e.target.closest("[data-pick]");
  if (b) pick(b.dataset.pick);
});

/* ── 세트 목록 밀어 지우기 — 아무도 알려 주지 않는 어포던스 ── */

let sw = null;
nodes.screen.addEventListener("pointerdown", e => {
  const row = e.target.closest(".setrow[data-act]");
  if (row) sw = { row, x: e.clientX };
});
addEventListener("pointermove", e => {
  if (!sw) return;
  const d = Math.min(0, e.clientX - sw.x);
  sw.row.style.transform = `translateX(${d}px)`;
  sw.row.style.opacity = String(1 + d / 160);
});
addEventListener("pointerup", e => {
  if (!sw) return;
  const d = e.clientX - sw.x;
  const row = sw.row; sw = null;
  row.style.transform = ""; row.style.opacity = "";
  if (d < -70) { act(st, row.dataset.act, scripts); redraw({ hats: false }); fire("list"); }
});

/* ── 쉬는 시계 ────────────────────────────────────────────── */

setInterval(() => {
  if (st.rest <= 0) return;
  st.rest--;
  if (has(scripts, "list", "idle", "status") || has(scripts, "list", "after", "status"))
    if (!document.activeElement?.classList?.contains("namebox")) redraw({ hats: false });
}, 1000);

/* ── 단추들 ───────────────────────────────────────────────── */

$("reset").addEventListener("click", () => {
  stopSim();
  st = fresh();
  nodes.verdict.hidden = true;
  Sim.clearAstray(nodes.hats);
  document.querySelector(".guestbox")?.remove();
  Talk.cut("norman", NORMAN.rule);
  nodes.note.innerHTML = "이 물건은 <b>이미 다 작동합니다.</b> 아무것도 알려 주지 않을 뿐입니다.";
  redraw();
});

$("run").addEventListener("click", () => {
  stopSim();
  st = fresh();
  nodes.verdict.hidden = true;
  redraw();
  Sim.markAstray(nodes.hats);
  nodes.note.innerHTML = "<b>직접 써 보십시오.</b> 붙인 단서가 그대로 작동합니다. " +
    "제자리가 아닌 단서는 오른쪽에 흐리게 표시됩니다.";
});

$("cold").addEventListener("click", async () => {
  stopSim();
  st = fresh();
  redraw();
  Sim.markAstray(nodes.hats);
  nodes.note.innerHTML = "<b>이 물건을 처음 본 사람</b>이 써 보는 중입니다. 화면에 붙은 것만 보고 합니다.";

  const dot = document.createElement("div");
  dot.className = "cursor"; dot.hidden = true;
  document.getElementById("phone").appendChild(dot);

  const who = document.createElement("div");
  who.className = "guestbox";
  who.innerHTML = `<div class="port p-guest">${faceSVG("guest")}` +
    `<img src="img/guest.webp" alt="" onerror="this.remove()"></div><p>손님</p>`;
  document.getElementById("phone").appendChild(who);

  Talk.hush();
  Talk.say("norman", NORMAN.beforeGuest, 1800);

  nodes.verdict.hidden = false;
  nodes.verdict.innerHTML = `<h3>처음 본 사람</h3><ol class="tl" id="tl"></ol>`;
  const tl = $("tl");

  tok = { dead: false, cancels: [] };
  const v = await Sim.cold({
    st, scripts, screen: nodes.screen, dot, tok,
    redraw: () => redraw({ hats: false }),
    speak: (w, t) => Talk.cut(w, t),
    log: e => {
      const li = document.createElement("li");
      li.className = "ev k-" + e.kind;
      li.innerHTML = `<b>${e.t.toFixed(1)}초</b><span>${e.text}</span>`;
      tl.appendChild(li);
      tl.scrollTop = tl.scrollHeight;
    },
  });
  dot.remove();
  who.remove();
  if (v) { showVerdict(v); Talk.say("norman", NORMAN.verdict(v)); }
});

function stopSim() {
  if (!tok) return;
  tok.dead = true;
  tok.cancels.forEach(f => f());
  tok = null;
  document.querySelector(".cursor")?.remove();
}

/* ── 판정 ─────────────────────────────────────────────────── */

function showVerdict(v) {
  const rows = [
    ["실행의 간극", v.exec, "무엇을 해야 할지 몰라 헤맨 횟수", v.exec > 0],
    ["평가의 간극", v.evalGap, "무슨 일이 생겼는지 몰라 잘못 쌓인 건수", v.evalGap > 0],
    ["주문대로 기록", `${v.right} / 3`,
      v.wrong ? `엉뚱한 값으로 ${v.wrong}건이 더 적혔습니다`
              : v.right > 3 ? `같은 것이 ${v.right - 3}건 더 쌓였습니다` : "알맞습니다",
      v.right !== 3 || v.wrong > 0],
    ["걸린 시간", v.secs.toFixed(1) + "초", "", false],
  ];

  nodes.verdict.innerHTML =
    `<h3>처음 본 사람 ${v.clean ? "<em class='good'>막힘 없이 해냈습니다</em>" : "<em class='bad'>막혔습니다</em>"}</h3>
     <div class="scores">${rows.map(([k, n, d, hot]) =>
        `<div class="score${hot ? " hot" : ""}">
           <b>${n}</b><span>${k}</span><small>${d}</small></div>`).join("")}</div>
     <ol class="tl">${v.evs.map(e =>
        `<li class="ev k-${e.kind}"><b>${e.t.toFixed(1)}초</b><span>${e.text}</span></li>`).join("")}</ol>` +
    (v.blame.length
      ? `<p class="blame">비어 있어서 막은 자리 — ${v.blame.map(b =>
          `<button data-pick="${b.el}">${APP.elements.find(e => e.id === b.el).label} · ${
            b.hat === "idle" ? "평소에" : "하고 난 뒤"}</button>`).join(" ")}</p>`
      : `<p class="blame ok">빈 자리 없이 전달되었습니다.</p>`);

  nodes.verdict.querySelectorAll("[data-pick]").forEach(b =>
    b.addEventListener("click", () => {
      pick(b.dataset.pick);
      Sim.flashBlame(nodes.hats, v.blame, b.dataset.pick);
    }));
}

/* ── 조 고르기 ────────────────────────────────────────────── */

const gate = $("gate"), grid = $("teamgrid"), peek = $("orderpeek"), enterBtn = $("enter");
let picking = null;

for (let n = 1; n <= TEAMS; n++) {
  const b = document.createElement("button");
  b.className = "teamcell";
  b.dataset.team = n;
  b.textContent = n + "조";
  grid.appendChild(b);
}

grid.addEventListener("click", e => {
  const b = e.target.closest(".teamcell");
  if (!b) return;
  picking = Number(b.dataset.team);
  grid.querySelectorAll(".teamcell").forEach(x =>
    x.classList.toggle("on", Number(x.dataset.team) === picking));

  const o = orderOf(picking);
  const use = o?.ready ? o : FALLBACK;
  peek.hidden = false;
  peek.innerHTML =
    `<p class="pk">${picking}조가 맡은 물건</p>
     <h2>${use.name}</h2>
     <p class="pkline">${use.line}</p>
     <p class="pkmate">같은 물건을 ${partnerOf(picking)}조도 맡습니다 — 끝나고 둘을 나란히 놓고 봅니다.</p>` +
    (o && !o.ready
      ? `<p class="pkwarn">「${o.name}」은 아직 준비 중이라 오늘은 <b>${FALLBACK.name}</b>으로 들어갑니다.</p>`
      : "");
  enterBtn.disabled = false;
});

enterBtn.addEventListener("click", () => enter(picking));
$("swap").addEventListener("click", () => {
  gate.hidden = false;
  $("bar").hidden = true;
  $("bench").hidden = true;
});

async function enter(n) {
  team = n;
  const o = orderOf(n);
  order = o?.ready ? o : FALLBACK;
  try { localStorage.setItem("hci4_team", String(n)); } catch (e) {}

  gate.hidden = true;
  $("bar").hidden = false;
  $("bench").hidden = false;
  $("teamtag").textContent = n + "조";
  nodes.whoami.textContent = "주문서 · " + order.name;

  Talk.mount($("talk"));
  Talk.say("norman", NORMAN.hello(n), 3400);
  Talk.say("norman", NORMAN.rule);

  await restore();
  beat();
}

/* ── 하던 작업 되찾기 · 자리 알리기 ───────────────────────── */

/** 새로고침하거나 노트북이 꺼져도 붙여 둔 단서는 남아야 한다. */
async function restore() {
  try {
    const d = await readDoc("hci4_drafts", "team" + team);
    const saved = d?.scripts ? JSON.parse(d.scripts) : null;
    if (saved && typeof saved === "object") {
      for (const k of Object.keys(scripts)) delete scripts[k];
      Object.assign(scripts, saved);
    }
  } catch (e) { console.warn("되찾기", e?.code || e?.message); }
  pick(null);
  redraw();
}

let saveTimer = 0;
/** 손을 뗀 뒤에 한 번만 보낸다 — 한 글자마다 보내면 읽기·쓰기가 터진다. */
function stash() {
  if (!team) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    putDoc("hci4_drafts", "team" + team,
      { team, order: order.id, scripts: JSON.stringify(scripts) })
      .catch(e => console.warn("저장", e?.code || e?.message));
  }, 1600);
}

/** 오래 앉아 있는 조도 현황판에서 사라지지 않게 일 분에 한 번 알린다. */
let heart = null;
function beat() {
  clearInterval(heart);
  const send = () => pingTo("hci4_presence", { team, order: order.id, where: "공방" });
  send();
  heart = setInterval(send, 60000);
}

/* ── 시작 ─────────────────────────────────────────────────── */

let greeted = false;
Ed.paint(nodes, scripts, o => {
  redraw();
  stash();
  if (!greeted && o.focus) { greeted = true; Talk.say("norman", NORMAN.first); }
  if (o.focus) Ed.focusArg(o.focus);
});
Ed.drag($("drag"));
pick(null);
redraw();

// 지난번에 고른 조가 있으면 눌러 둔 채로 보여 준다 — 다시 찾게 하지 않는다
try {
  const last = Number(localStorage.getItem("hci4_team"));
  if (last >= 1 && last <= TEAMS)
    grid.querySelector(`.teamcell[data-team="${last}"]`)?.click();
} catch (e) {}
