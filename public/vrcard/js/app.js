// VR로 갈까, AR로 갈까 — 학생 화면. 단계(교수 현황판이 넘김)에 따라 보이는 화면이 바뀐다.
//   안내 → 분류(카드를 네 칸에 · 근거) → 공유(반 전체 비교) → 재설계(스케치) → 부작용 찾기 → 대응책 → 마침
import { CARDS, QUADS, QUAD_KEYS, AXES, WARNS, THEORIES, CHECKS, SIDES, PHASES, TEAM_COUNT, MAX_CUSTOM,
         teamId, teamLabel, cardOf, cardImg, cardDone, theoryName, sideName, sideTargetOf, sideFromOf, sideDocId } from "./data.js";
import { me, ready, watchState, watchBoards, watchDesigns, watchSides, saveCard, saveDesign, saveSide, saveReply } from "./fb.js";
import { renderCompare } from "./compare.js";
import { download as downloadReport } from "./report.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem("vrcard." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("vrcard." + k, v); } catch { /* 저장 못 해도 진행 */ } },
};
const S = { phase: null, team: Number(store.get("team")) || null, name: store.get("name") || "",
            boards: {}, designs: {}, sides: {}, sel: null, open: null, order: "split" };
// 주소로 조를 열 수 있게 — ?team=3 (이름은 ?name= 으로, 없으면 물어본다)
const QP = new URLSearchParams(location.search);
if (Number(QP.get("team")) >= 1 && Number(QP.get("team")) <= TEAM_COUNT) {
  S.team = Number(QP.get("team"));
  if (QP.get("name")) S.name = QP.get("name").slice(0, 20);
}
const myBoard = () => S.boards[teamId(S.team)] || { cards: {} };
const myCards = () => myBoard().cards || {};
const canSort = () => S.phase === "sort";

/* ── 조 고르기 ───────────────────────────────────────── */
function renderJoin() {
  const pick = $("teamPick");
  pick.innerHTML = "";
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tp" + (S.team === t ? " on" : "");
    b.innerHTML = `<b>${t}조</b>`;
    b.onclick = () => { S.team = t; renderJoin(); };
    pick.appendChild(b);
  }
  $("myName").value = S.name;
  const check = () => $("joinBtn").disabled = !(S.team && $("myName").value.trim());
  $("myName").oninput = check;
  check();
}
$("joinBtn").onclick = () => { S.name = $("myName").value.trim(); store.set("team", S.team); store.set("name", S.name); start(); };

/* ── 단계 전환 ───────────────────────────────────────── */
const VIEWS = { join: "vJoin", ready: "vReady", sort: "vSort", share: "vShare", design: "vDesign", side: "vSide", reply: "vReply", end: "vEnd" };
function show(v) { Object.values(VIEWS).forEach(id => $(id).hidden = true); $(VIEWS[v]).hidden = false; }

let started = false;
async function start() {
  await ready();
  if (!S.team) { show("join"); renderJoin(); return; }
  if (started) return;
  started = true;
  $("teamChip").hidden = false;
  $("teamChip").textContent = `${teamLabel(S.team)} · ${S.name}`;
  $("teamChip").title = "눌러서 조 바꾸기";
  $("teamChip").onclick = () => { if (confirm("조를 다시 고를까요?")) { store.set("team", ""); location.reload(); } };
  renderIntro();
  watchBoards(all => { S.boards = all; renderSort(); renderShare(); });
  watchDesigns(all => { S.designs = all; remoteDesign(); renderSide(); renderReply(); });
  watchSides(all => { S.sides = all; renderSide(); renderReply(); });
  watchState(st => setPhase(st.phase || "ready"));
}
function setPhase(p) {
  const changed = p !== S.phase;
  S.phase = p;
  $("phaseChip").textContent = PHASES[p] || p;
  $("phaseChip").dataset.p = p;
  if (!changed) return;
  show(p);
  if (p === "sort") renderSort();
  if (p === "share") renderShare();
  if (p === "design") remoteDesign();
  if (p === "side") renderSide(true);
  if (p === "reply") renderReply(true);
}

/* ── 네 칸 그리기 (분류 · 공유 · 안내가 같이 씀) ─────────── */
function planeHTML(cards, { interactive = false, sel = null } = {}) {
  const cell = k => {
    const q = QUADS[k];
    const here = Object.entries(cards).filter(([, c]) => c.q === k).sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0]));
    return `<div class="quad" data-q="${k}" style="--qc:${q.color}">
      <div class="qhead"><b>${esc(q.ko)}</b><span>${esc(q.sub)}</span></div>
      <div class="qcards">${here.map(([id, c]) => chipHTML(id, c, { sel })).join("") || (interactive ? `<p class="qempty">여기에 놓기</p>` : "")}</div>
    </div>`;
  };
  return `<div class="axis-y"><b>${esc(AXES.y.ko)}</b><small>↑ ${esc(AXES.y.why)}</small><span class="hi">높음</span><span class="lo">낮음</span></div>
    <div class="axis-x-top"><span>현실에 붙을 필요 낮음</span><span>현실에 붙을 필요 높음</span></div>
    <div class="quads">${cell("vr")}${cell("train")}${cell("keep")}${cell("guide")}</div>
    <div class="axis-x"><b>→ ${esc(AXES.x.ko)}</b> <small>${esc(AXES.x.why)}</small></div>`;
}
function chipHTML(id, c, { sel = null } = {}) {
  const card = cardOf(id, myBoard());
  const title = c?.title || card.title;
  return `<button type="button" class="vchip${sel === id ? " sel" : ""}${cardDone(c) ? " done" : ""}${card.custom || c?.custom ? " custom" : ""}" draggable="true" data-id="${esc(id)}"
    title="${esc(card.desc || c?.desc || "")}">${cardImg(id) ? `<img class="cimg" src="${cardImg(id)}" alt="" loading="lazy" draggable="false" onerror="this.remove()">` : ""}<span class="no">${/^\d+$/.test(id) ? id : "+"}</span><span class="tt">${esc(title)}</span>
    ${(c?.warn || []).map(w => `<span class="wchip">⚠${w === 1 ? "①" : "②"}</span>`).join("")}<span class="ok">${cardDone(c) ? "✓" : ""}</span></button>`;
}

function renderIntro() {
  const sample = { 3: { q: "guide" }, 1: { q: "vr" }, 15: { q: "keep" }, 5: { q: "train" } };
  $("introPlane").innerHTML = planeHTML(sample);
  $("introWarns").innerHTML = WARNS.map(w => `<div class="warncard"><b>⚠ ${esc(w.ko)}</b><span>${esc(w.hint)}이라면 → ${esc(w.ref)}</span></div>`).join("")
    + `<p class="muted small">경고 카드에 걸리면 칸을 옮기거나, 그 위험을 줄일 방법을 이유에 함께 적습니다.</p>`;
  $("introTheories").innerHTML = THEORIES.map(t => `<li><b>${esc(t.ko)}</b> ${esc(t.line)} <small>${esc(t.ref)}</small></li>`).join("");
}

/* ── 분류 ───────────────────────────────────────────── */
function renderSort() {
  if (S.phase !== "sort") return;
  const cards = myCards();
  const all = [...CARDS.map(c => c.id), ...Object.keys(cards).filter(k => k.startsWith("c") && !cards[k].removed)];
  const placed = all.filter(id => cards[id]?.q);
  const done = all.filter(id => cardDone(cards[id]));
  $("progress").innerHTML = `<span><b>${placed.length}</b> / ${all.length}장 놓음</span><span><b>${done.length}</b>장 근거 완료</span>
    <span class="bar"><span style="width:${all.length ? done.length / all.length * 100 : 0}%"></span></span>`;
  $("addCustom").disabled = Object.keys(cards).filter(k => k.startsWith("c") && !cards[k].removed).length >= MAX_CUSTOM;

  const unplaced = all.filter(id => !cards[id]?.q);
  $("tray").innerHTML = unplaced.map(id => chipHTML(id, cards[id] || {}, { sel: S.sel })).join("") || `<p class="muted">모든 카드를 놓았습니다</p>`;
  $("plane").innerHTML = planeHTML(cards, { interactive: true, sel: S.sel });
  wireDnD();
  renderEditor();
}
function wireDnD() {
  document.querySelectorAll("#vSort .vchip").forEach(ch => {
    ch.onclick = () => { S.sel = ch.dataset.id; renderSort(); };
    ch.ondragstart = e => { e.dataTransfer.setData("text/plain", ch.dataset.id); ch.classList.add("drag"); };
    ch.ondragend = () => ch.classList.remove("drag");
  });
  document.querySelectorAll("#plane .quad").forEach(q => {
    q.ondragover = e => { e.preventDefault(); q.classList.add("over"); };
    q.ondragleave = () => q.classList.remove("over");
    q.ondrop = e => { e.preventDefault(); q.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); if (id) { S.sel = id; patchCard(id, { q: q.dataset.q }); } };
  });
  const tray = $("tray");
  tray.ondragover = e => e.preventDefault();
  tray.ondrop = e => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) patchCard(id, { q: null }); };
}

// 카드 한 장 고치기 — 화면에 먼저 반영하고 조 전체에 저장
let saveTimers = {};
function patchCard(id, patch, delay = 0) {
  if (!canSort()) return;
  const b = S.boards[teamId(S.team)] ||= { cards: {} };
  b.cards ||= {};
  const next = { ...(b.cards[id] || {}), ...patch };
  b.cards[id] = next;
  if (delay === 0) renderSort();
  clearTimeout(saveTimers[id]);
  $("progress").dataset.saving = "1";
  saveTimers[id] = setTimeout(async () => {
    try { await saveCard(S.team, id, clean(next)); delete $("progress").dataset.saving; }
    catch (e) { console.error(e); alert("저장하지 못했습니다 — 분류 시간이 끝났거나 연결이 끊겼습니다"); }
  }, delay);
}
const clean = c => ({ q: c.q || null, warn: c.warn || [], theory: c.theory || null, theoryOther: (c.theoryOther || "").slice(0, 40),
  why: (c.why || "").slice(0, 300), ...(c.title !== undefined ? { title: String(c.title).slice(0, 30), desc: String(c.desc || "").slice(0, 80), custom: true, removed: !!c.removed } : {}) });

function renderEditor() {
  const box = $("editor");
  const id = S.sel;
  if (!id) { box.innerHTML = `<div class="ehelp"><h3>카드를 하나 고르세요</h3><p>카드를 칸에 끌어다 놓거나, 카드를 누른 뒤 여기서 칸을 고릅니다.</p>
      <p>카드마다 <b>칸 · 근거 이론 · 이유</b>를 채우면 ✓ 표시가 붙습니다.</p><p class="muted">조원과 종이 카드로 먼저 토론하고, 정한 것을 여기에 입력해도 됩니다.</p></div>`; return; }
  const c = myCards()[id] || {};
  const card = cardOf(id, myBoard());
  const custom = id.startsWith("c");
  // 입력 중인 칸은 다시 그리지 않는다 — 조원이 다른 카드를 고쳐 화면이 새로 그려져도 쓰던 글이 날아가지 않게
  if (box.dataset.id === id && box.contains(document.activeElement) && document.activeElement.matches("textarea,input")) { syncEditorChips(c); return; }
  box.dataset.id = id;
  box.innerHTML = `<p class="eno">${custom ? "우리 조 사례" : `카드 ${id}`}</p>
    ${custom ? `<label class="field">사례 이름 <input id="eTitle" maxlength="30" value="${esc(c.title || "")}"></label>
               <label class="field">상황 <input id="eDesc" maxlength="80" value="${esc(c.desc || "")}"></label>`
             : `${cardImg(id) ? `<img class="eimg" src="${cardImg(id)}" alt="${esc(card.title)} 장면" onerror="this.remove()">` : ""}<h3>${esc(card.title)}</h3><p class="edesc">${esc(card.desc)}</p>`}
    <div class="field">어느 칸인가 <div class="qpick" id="eQ">${QUAD_KEYS.map(k => `<button type="button" data-q="${k}" style="--qc:${QUADS[k].color}">${esc(QUADS[k].ko)}</button>`).join("")}</div></div>
    <div class="field">경고 카드에 걸리는가 <div class="wpick" id="eW">${WARNS.map(w => `<button type="button" data-w="${w.n}">⚠${w.n === 1 ? "①" : "②"} ${esc(w.ko)}</button>`).join("")}</div></div>
    <div class="field">근거 이론 <div class="tpick" id="eT">${THEORIES.map(t => `<button type="button" data-t="${t.id}" title="${esc(t.line)} — ${esc(t.ref)}">${esc(t.ko)}</button>`).join("")}<button type="button" data-t="other">기타</button></div></div>
    <label class="field" id="eOtherWrap" ${c.theory === "other" ? "" : "hidden"}>기타 이론 이름 <input id="eOther" maxlength="40" value="${esc(c.theoryOther || "")}"></label>
    <label class="field">이유 <small>이 이론이 이 사례에 왜 들어맞는지 · 경고 카드에 걸리면 위험을 줄일 방법까지</small>
      <textarea id="eWhy" rows="4" maxlength="300">${esc(c.why || "")}</textarea></label>
    <div class="efoot"><button type="button" class="btn ghost" id="eUnplace">칸에서 빼기</button>
      ${custom ? `<button type="button" class="btn ghost danger" id="eDel">사례 지우기</button>` : ""}<button type="button" class="btn primary" id="eNext">다음 카드</button></div>`;
  syncEditorChips(c);
  box.querySelectorAll("#eQ button").forEach(b => b.onclick = () => patchCard(id, { q: b.dataset.q }));
  box.querySelectorAll("#eW button").forEach(b => b.onclick = () => {
    const n = Number(b.dataset.w), cur = new Set(myCards()[id]?.warn || []);
    cur.has(n) ? cur.delete(n) : cur.add(n);
    patchCard(id, { warn: [...cur].sort() });
  });
  box.querySelectorAll("#eT button").forEach(b => b.onclick = () => patchCard(id, { theory: b.dataset.t }));
  $("eWhy").oninput = e => patchCard(id, { why: e.target.value }, 600);
  if ($("eOther")) $("eOther").oninput = e => patchCard(id, { theoryOther: e.target.value }, 600);
  if (custom) {
    $("eTitle").oninput = e => patchCard(id, { title: e.target.value }, 600);
    $("eDesc").oninput = e => patchCard(id, { desc: e.target.value }, 600);
    $("eDel").onclick = () => { if (confirm("이 사례를 지울까요?")) { patchCard(id, { q: null, title: "", desc: "", why: "", theory: null, warn: [], removed: true }); S.sel = null; renderSort(); } };
  }
  $("eUnplace").onclick = () => patchCard(id, { q: null });
  $("eNext").onclick = () => {
    const all = [...CARDS.map(c => c.id), ...Object.keys(myCards()).filter(k => k.startsWith("c") && !myCards()[k].removed)];
    const next = all.find(k => k !== id && !cardDone(myCards()[k])) || null;
    S.sel = next; renderSort();
  };
}
function syncEditorChips(c) {
  document.querySelectorAll("#eQ button").forEach(b => b.classList.toggle("on", c.q === b.dataset.q));
  document.querySelectorAll("#eW button").forEach(b => b.classList.toggle("on", (c.warn || []).includes(Number(b.dataset.w))));
  document.querySelectorAll("#eT button").forEach(b => b.classList.toggle("on", c.theory === b.dataset.t));
  const ow = $("eOtherWrap"); if (ow) ow.hidden = c.theory !== "other";
}
$("addCustom").onclick = () => {
  const used = Object.keys(myCards()).filter(k => k.startsWith("c") && !myCards()[k]?.removed);
  if (used.length >= MAX_CUSTOM) return;
  let n = 1; while (myCards()["c" + n] && !myCards()["c" + n].removed) n++;
  const id = "c" + n;
  S.sel = id;
  patchCard(id, { title: "", desc: "", q: null, why: "", theory: null, warn: [], removed: false });
};

/* ── 공유 ───────────────────────────────────────────── */
function renderShare() {
  if (S.phase !== "share") return;
  renderCompare($("compare"), visibleBoards(), { myTeam: S.team, order: S.order, open: S.open, onToggle: id => { S.open = id; renderShare(); } });
  $("myPlane").innerHTML = planeHTML(liveCards(myCards()));
}
document.querySelectorAll("#vShare .seg2 button").forEach(b => b.onclick = () => {
  S.order = b.dataset.o;
  document.querySelectorAll("#vShare .seg2 button").forEach(x => x.classList.toggle("on", x === b));
  renderShare();
});
const liveCards = cards => Object.fromEntries(Object.entries(cards || {}).filter(([, c]) => !c.removed));
const visibleBoards = () => Object.fromEntries(Object.entries(S.boards).map(([k, b]) => [k, { ...b, cards: liveCards(b.cards) }]));

/* ── 재설계 ─────────────────────────────────────────── */
const dForm = $("dForm");
(function buildDesignForm() {
  $("dTheory").innerHTML = `<option value="">— 고르기 —</option>` + THEORIES.map(t => `<option value="${t.id}">${esc(t.ko)} — ${esc(t.line)}</option>`).join("");
  $("kindPick").innerHTML = ["VR", "AR"].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("");
  $("checks").innerHTML = CHECKS.map(c => `<label class="field ck"><span><b>${esc(c.ko)}</b> ${esc(c.q)}</span><textarea data-ck="${c.id}" rows="2" maxlength="200"></textarea></label>`).join("");
  $("kindPick").querySelectorAll("button").forEach(b => b.onclick = () => { setKind(b.dataset.k); queueDesign(); });
})();
const setKind = k => { $("kindPick").dataset.k = k || ""; $("kindPick").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); };
function designCardOptions() {
  const cards = liveCards(myCards());
  const ok = Object.entries(cards).filter(([, c]) => ["vr", "train", "guide"].includes(c.q));
  const cur = dForm.card.value;
  $("dCard").innerHTML = `<option value="">— 우리 조 VR · AR 칸 카드 —</option>` + ok.map(([id, c]) =>
    `<option value="${esc(id)}">${/^\d+$/.test(id) ? id + ". " : ""}${esc(c.title || cardOf(id).title)} (${esc(QUADS[c.q].ko)})</option>`).join("");
  if (cur) dForm.card.value = cur;
}
function readDesign() {
  return { card: dForm.card.value, kind: $("kindPick").dataset.k || "", who: dForm.who.value.trim(), pain: dForm.pain.value.trim(),
    change: dForm.change.value.trim(), theory: dForm.theory.value,
    checks: Object.fromEntries([...dForm.querySelectorAll("textarea[data-ck]")].map(t => [t.dataset.ck, t.value.trim()])) };
}
let designFilled = false, designDirty = false;
// 서버의 설계안을 칸에 채운다 — 쓰는 중인 칸은 건드리지 않는다
function fillDesign() {
  designCardOptions();
  const d = S.designs[teamId(S.team)];
  if (!d) return;
  const setv = (el, v) => { if (document.activeElement !== el) el.value = v || ""; };
  setv(dForm.card, d.card); setv(dForm.who, d.who); setv(dForm.pain, d.pain); setv(dForm.change, d.change); setv(dForm.theory, d.theory);
  setKind(d.kind);
  dForm.querySelectorAll("textarea[data-ck]").forEach(t => setv(t, d.checks?.[t.dataset.ck]));
  if (d.sketch) drawSketch(d.sketch);
}
function remoteDesign() {
  if (S.phase !== "design") return;
  designCardOptions();
  const d = S.designs[teamId(S.team)];
  if (!d) return;
  // 처음 한 번은 (내가 아직 아무것도 고치지 않았다면) 저장된 것을 불러오고,
  // 그 뒤로는 조원의 다른 기기가 고친 것만 받는다 — 내가 저장한 것이 되돌아와 쓰던 글을 덮지 않게
  if (!designFilled) { designFilled = true; if (!designDirty) fillDesign(); else if (d.sketch) drawSketch(d.sketch); return; }
  if (d.by !== me.uid) { fillDesign(); $("dSaved").textContent = "조원이 고친 내용을 받았습니다"; }
}
let dT;
function queueDesign() {
  if (S.phase !== "design") return;
  designDirty = true;
  clearTimeout(dT);
  $("dSaved").textContent = "저장하는 중…";
  dT = setTimeout(async () => {
    try { await saveDesign(S.team, readDesign()); $("dSaved").textContent = "조 전체에 저장됨"; }
    catch (e) { console.error(e); $("dSaved").textContent = "저장하지 못했습니다 — 재설계 시간이 끝났거나 연결이 끊겼습니다"; }
  }, 700);
}
dForm.addEventListener("input", queueDesign);
dForm.addEventListener("change", queueDesign);
// 카드를 고르면 칸에 따라 VR · AR 을 먼저 맞춰 둔다 (바꿀 수 있음)
$("dCard").addEventListener("change", () => {
  const c = myCards()[dForm.card.value];
  if (c && !$("kindPick").dataset.k) setKind(c.q === "vr" ? "VR" : "AR");
});

/* ── 스케치 ─────────────────────────────────────────── */
const cv = $("sketch"), cx = cv.getContext("2d");
const PEN = { color: "#22211E", size: 3, erase: false };
function blankSketch() { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); }
blankSketch();
$("sketchTools").innerHTML = [["#22211E", "검정"], ["#0070C0", "파랑"], ["#C0392B", "빨강"], ["#548235", "초록"]].map(([c, n]) =>
  `<button type="button" class="pen${c === PEN.color ? " on" : ""}" data-c="${c}" title="${n}" style="--pc:${c}"></button>`).join("")
  + `<button type="button" class="btn ghost" data-size="2">가늘게</button><button type="button" class="btn ghost" data-size="6">굵게</button>`
  + `<button type="button" class="btn ghost" data-erase="1">지우개</button><button type="button" class="btn ghost danger" data-clear="1">다 지우기</button>`;
$("sketchTools").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.c) { PEN.color = b.dataset.c; PEN.erase = false; }
  if (b.dataset.size) PEN.size = Number(b.dataset.size);
  if (b.dataset.erase) PEN.erase = true;
  if (b.dataset.clear) { if (!confirm("스케치를 모두 지울까요?")) return; blankSketch(); saveSketch(); }
  $("sketchTools").querySelectorAll(".pen").forEach(p => p.classList.toggle("on", !PEN.erase && p.dataset.c === PEN.color));
  $("sketchTools").querySelector("[data-erase]").classList.toggle("on", PEN.erase);
};
let drawing = false, last = null;
const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
cv.onpointerdown = e => { if (S.phase !== "design") return; drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
cv.onpointermove = e => {
  if (!drawing) return;
  const p = pos(e);
  cx.strokeStyle = PEN.erase ? "#fff" : PEN.color; cx.lineWidth = PEN.erase ? 18 : PEN.size; cx.lineCap = "round"; cx.lineJoin = "round";
  cx.beginPath(); cx.moveTo(...last); cx.lineTo(...p); cx.stroke(); last = p;
};
cv.onpointerup = cv.onpointercancel = () => { if (!drawing) return; drawing = false; saveSketch(); };
let sT;
function saveSketch() {
  clearTimeout(sT);
  $("sSaved").textContent = "저장하는 중…";
  sT = setTimeout(async () => {
    const url = cv.toDataURL("image/jpeg", 0.7);
    try { await saveDesign(S.team, { sketch: url }); $("sSaved").textContent = "스케치 저장됨"; }
    catch (e) { console.error(e); $("sSaved").textContent = "저장하지 못했습니다"; }
  }, 500);
}
let shownSketch = null;
function drawSketch(url) {
  if (!url || url === shownSketch || drawing) return;
  shownSketch = url;
  const img = new Image();
  img.onload = () => { blankSketch(); cx.drawImage(img, 0, 0, cv.width, cv.height); };
  img.src = url;
}

/* ── 설계안 보기 (부작용 찾기 · 대응책) ─────────────────── */
function designView(team) {
  const d = S.designs[teamId(team)];
  if (!d || !d.card) return `<p class="muted">${teamLabel(team)}가 아직 설계안을 내지 않았습니다.</p>`;
  const board = S.boards[teamId(team)];
  const c = board?.cards?.[d.card] || {};
  return `<p class="eno">${teamLabel(team)} · ${esc(d.kind || "")}로 바꾸기</p><h3>${esc(c.title || cardOf(d.card).title)}</h3>
    <dl class="dl"><dt>누가 · 언제 · 어디서</dt><dd>${esc(d.who || "—")}</dd><dt>지금 방식의 문제</dt><dd>${esc(d.pain || "—")}</dd>
    <dt>바꾸면 달라지는 것</dt><dd>${esc(d.change || "—")}</dd><dt>근거 이론</dt><dd>${esc(theoryName(d.theory) || "—")}</dd></dl>
    ${d.sketch ? `<img class="sk" src="${d.sketch}" alt="화면 스케치">` : `<p class="muted">스케치 없음</p>`}
    <dl class="dl ck">${CHECKS.map(k => `<dt>${esc(k.ko)}</dt><dd>${esc(d.checks?.[k.id] || "—")}</dd>`).join("")}</dl>`;
}

/* ── 부작용 찾기 ─────────────────────────────────────── */
const SD = { kind: null, items: null };
function renderSide(force) {
  if (S.phase !== "side") return;
  const target = sideTargetOf(S.team);
  $("sideTitle").textContent = `${teamLabel(target)}의 설계안`;
  $("sideView").innerHTML = designView(target);
  const doc = S.sides[sideDocId(target, S.team)];
  if (SD.items === null || force || (doc && doc.by !== me.uid)) SD.items = (doc?.items || []).map(x => ({ ...x }));
  $("sidePick").innerHTML = SIDES.map(s => `<button type="button" data-k="${s.id}" class="${SD.kind === s.id ? "on" : ""}"><b>${esc(s.ko)}</b><small>${esc(s.hint)}</small></button>`).join("");
  $("sidePick").querySelectorAll("button").forEach(b => b.onclick = () => { SD.kind = b.dataset.k; renderSide(); });
  $("addSide").disabled = !(SD.kind && $("sideNote").value.trim());
  $("sideList").innerHTML = SD.items.map((x, i) => `<li><span class="kchip">${esc(sideName(x.kind))}</span><span>${esc(x.note)}</span><button type="button" data-i="${i}" aria-label="지우기">×</button></li>`).join("")
    || `<li class="muted">아직 붙인 부작용이 없습니다</li>`;
  $("sideList").querySelectorAll("button").forEach(b => b.onclick = () => { SD.items.splice(Number(b.dataset.i), 1); pushSide(); });
}
$("sideNote").oninput = () => $("addSide").disabled = !(SD.kind && $("sideNote").value.trim());
$("addSide").onclick = () => {
  SD.items.push({ kind: SD.kind, note: $("sideNote").value.trim().slice(0, 150) });
  SD.kind = null; $("sideNote").value = "";
  pushSide();
};
async function pushSide() {
  renderSide();
  $("sideSaved").textContent = "저장하는 중…";
  try { await saveSide(sideTargetOf(S.team), S.team, SD.items.slice(0, 12)); $("sideSaved").textContent = `${teamLabel(sideTargetOf(S.team))}에 보냈습니다`; }
  catch (e) { console.error(e); $("sideSaved").textContent = "저장하지 못했습니다 — 부작용 찾기 시간이 끝났거나 연결이 끊겼습니다"; }
}

/* ── 대응책 ─────────────────────────────────────────── */
let RP = null;
function renderReply(force) {
  if (S.phase !== "reply") return;
  const from = sideFromOf(S.team);
  $("myDesignView").innerHTML = designView(S.team);
  const doc = S.sides[sideDocId(S.team, from)];
  $("replyTitle").textContent = `${teamLabel(from)}가 붙인 부작용과 우리 조의 대응책`;
  if (!doc?.items?.length) { $("replyList").innerHTML = `<p class="muted">${teamLabel(from)}가 붙인 부작용이 아직 없습니다.</p>`; return; }
  if (RP === null || force || (doc.replyBy && doc.replyBy !== me.uid)) RP = doc.items.map((_, i) => doc.replies?.[i] || "");
  const box = $("replyList");
  if (box.contains(document.activeElement) && !force) return;
  box.innerHTML = doc.items.map((x, i) => `<div class="reply"><p><span class="kchip">${esc(sideName(x.kind))}</span> ${esc(x.note)}</p>
    <label class="field">대응책 <textarea data-i="${i}" rows="2" maxlength="200">${esc(RP[i] || "")}</textarea></label></div>`).join("");
  let rT;
  box.querySelectorAll("textarea").forEach(t => t.oninput = () => {
    RP[Number(t.dataset.i)] = t.value;
    clearTimeout(rT); $("replySaved").textContent = "저장하는 중…";
    rT = setTimeout(async () => {
      try { await saveReply(S.team, from, RP.map(v => v.trim().slice(0, 200))); $("replySaved").textContent = "저장됨"; }
      catch (e) { console.error(e); $("replySaved").textContent = "저장하지 못했습니다 — 대응책 시간이 끝났거나 연결이 끊겼습니다"; }
    }, 700);
  });
}

/* ── 실습보고서 ─────────────────────────────────────── */
$("reportBtn").onclick = () => downloadReport({ team: S.team, name: S.name, boards: visibleBoards(), designs: S.designs, sides: S.sides });

/* ── 시작 ───────────────────────────────────────────── */
if (S.team && S.name) start(); else ready().then(() => { show("join"); renderJoin(); });
