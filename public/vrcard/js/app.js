// VR · AR 적용 판단 실습 — 학생 화면. 단계(교수 현황판이 넘김)에 따라 보이는 화면이 바뀐다.
//   안내 → 분류(카드를 네 칸에 · 근거) → 공유(반 전체 비교) → 재설계(스케치) → 부작용 검토 → 대응책 → 종료
import { CARDS, QUADS, QUAD_KEYS, AXES, WARNS, THEORIES, CHECKS, SIDES, PHASES, TEAM_COUNT, MAX_CUSTOM,
         teamId, teamLabel, cardOf, cardImg, cardDone, theoryName, sideName, sideTargetOf, sideFromOf, sideDocId, pairOf, GEN_LIMIT } from "./data.js";
import { me, ready, watchState, watchBoards, watchDesigns, watchSides, watchMockups, saveCard, saveDesign, saveSide, saveReply, generateMockup, wrapMock } from "./fb.js";
import { renderCompare } from "./compare.js";
import { download as downloadReport } from "./report.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem("vrcard." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("vrcard." + k, v); } catch { /* 저장 못 해도 진행 */ } },
};
const S = { phase: null, team: Number(store.get("team")) || null, name: store.get("name") || "",
            boards: {}, designs: {}, sides: {}, mockups: {}, sel: null, open: null, order: "split", shareView: "pair" };
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
  $("teamChip").title = "조 변경";
  $("teamChip").onclick = () => { if (confirm("조를 변경하시겠습니까?")) { store.set("team", ""); location.reload(); } };
  renderIntro();
  watchBoards(all => { S.boards = all; renderSort(); renderShare(); });
  watchDesigns(all => { S.designs = all; remoteDesign(); renderSide(); renderReply(); });
  watchSides(all => { S.sides = all; renderSide(); renderReply(); });
  watchMockups(all => { S.mockups = all; renderMock(); renderSide(); renderReply(); });
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
  if (p === "design") { remoteDesign(); renderMock(); }
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
  return `<div class="axis-y"><b>${esc(AXES.y.ko)}</b><small>↑ ${esc(AXES.y.why)}</small><span class="hi">필요 높음</span><span class="lo">필요 낮음</span></div>
    <div class="axis-x-top"><span>정보 결합 필요 낮음</span><span>정보 결합 필요 높음</span></div>
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
  $("introWarns").innerHTML = WARNS.map(w => `<div class="warncard"><b>⚠${w.n === 1 ? "①" : "②"} ${esc(w.ko)}</b><span>${esc(w.hint)} · ${esc(w.ref)}</span></div>`).join("")
    + `<p class="muted small">해당 시: 배치 칸 변경 또는 이유에 위험 감소 방안 기재</p>`;
  $("introTheories").innerHTML = THEORIES.map(t => `<li><b>${esc(t.ko)}</b> ${esc(t.line)} <small>${esc(t.ref)}</small></li>`).join("");
}

/* ── 분류 ───────────────────────────────────────────── */
function renderSort() {
  if (S.phase !== "sort") return;
  const cards = myCards();
  const all = [...CARDS.map(c => c.id), ...Object.keys(cards).filter(k => k.startsWith("c") && !cards[k].removed)];
  const placed = all.filter(id => cards[id]?.q);
  const done = all.filter(id => cardDone(cards[id]));
  $("progress").innerHTML = `<span>배치 <b>${placed.length}</b> / ${all.length}</span><span>근거 완료 <b>${done.length}</b></span>
    <span class="bar"><span style="width:${all.length ? done.length / all.length * 100 : 0}%"></span></span>`;
  $("addCustom").disabled = Object.keys(cards).filter(k => k.startsWith("c") && !cards[k].removed).length >= MAX_CUSTOM;

  const unplaced = all.filter(id => !cards[id]?.q);
  $("tray").innerHTML = unplaced.map(id => chipHTML(id, cards[id] || {}, { sel: S.sel })).join("") || `<p class="muted">전체 배치 완료</p>`;
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
    catch (e) { console.error(e); alert("저장 실패 (분류 단계 종료 또는 연결 끊김)"); }
  }, delay);
}
const clean = c => ({ q: c.q || null, warn: c.warn || [], theory: c.theory || null, theoryOther: (c.theoryOther || "").slice(0, 40),
  why: (c.why || "").slice(0, 300), ...(c.title !== undefined ? { title: String(c.title).slice(0, 30), desc: String(c.desc || "").slice(0, 80), custom: true, removed: !!c.removed } : {}) });

function renderEditor() {
  const box = $("editor");
  const id = S.sel;
  if (!id) { box.innerHTML = `<div class="ehelp"><h3>카드 선택</h3><p>배치 방법: 칸으로 끌어 놓기 또는 카드 선택 후 이 영역에서 칸 지정</p>
      <p>완료 조건: <b>배치 칸 · 근거 이론 · 이유</b> 입력 (✓ 표시)</p><p class="muted">종이 카드 토론 결과 입력 가능</p></div>`; return; }
  const c = myCards()[id] || {};
  const card = cardOf(id, myBoard());
  const custom = id.startsWith("c");
  // 입력 중인 칸은 다시 그리지 않는다 — 조원이 다른 카드를 고쳐 화면이 새로 그려져도 쓰던 글이 날아가지 않게
  if (box.dataset.id === id && box.contains(document.activeElement) && document.activeElement.matches("textarea,input")) { syncEditorChips(c); return; }
  box.dataset.id = id;
  box.innerHTML = `<p class="eno">${custom ? "우리 조 사례" : `카드 ${id}`}</p>
    ${custom ? `<label class="field">사례명 <input id="eTitle" maxlength="30" value="${esc(c.title || "")}"></label>
               <label class="field">상황 <input id="eDesc" maxlength="80" value="${esc(c.desc || "")}"></label>`
             : `${cardImg(id) ? `<img class="eimg" src="${cardImg(id)}" alt="${esc(card.title)} 장면" onerror="this.remove()">` : ""}<h3>${esc(card.title)}</h3><p class="edesc">${esc(card.desc)}</p>`}
    <div class="field">배치 칸 <div class="qpick" id="eQ">${QUAD_KEYS.map(k => `<button type="button" data-q="${k}" style="--qc:${QUADS[k].color}">${esc(QUADS[k].ko)}</button>`).join("")}</div></div>
    <div class="field">경고 기준 해당 <div class="wpick" id="eW">${WARNS.map(w => `<button type="button" data-w="${w.n}">⚠${w.n === 1 ? "①" : "②"} ${esc(w.ko)}</button>`).join("")}</div></div>
    <div class="field">근거 이론 <div class="tpick" id="eT">${THEORIES.map(t => `<button type="button" data-t="${t.id}" title="${esc(t.line)} — ${esc(t.ref)}">${esc(t.ko)}</button>`).join("")}<button type="button" data-t="other">기타</button></div></div>
    <label class="field" id="eOtherWrap" ${c.theory === "other" ? "" : "hidden"}>기타 이론명 <input id="eOther" maxlength="40" value="${esc(c.theoryOther || "")}"></label>
    <label class="field">이유 <small>이론 적용 이유 · 경고 기준 해당 시 위험 감소 방안</small>
      <textarea id="eWhy" rows="4" maxlength="300">${esc(c.why || "")}</textarea></label>
    <div class="efoot"><button type="button" class="btn ghost" id="eUnplace">배치 해제</button>
      ${custom ? `<button type="button" class="btn ghost danger" id="eDel">사례 삭제</button>` : ""}<button type="button" class="btn primary" id="eNext">다음 미완료 카드</button></div>`;
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
    $("eDel").onclick = () => { if (confirm("이 사례를 삭제하시겠습니까?")) { patchCard(id, { q: null, title: "", desc: "", why: "", theory: null, warn: [], removed: true }); S.sel = null; renderSort(); } };
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
  $("sharePair").hidden = S.shareView !== "pair";
  $("shareClass").hidden = S.shareView !== "class";
  renderPair();
  renderCompare($("compare"), visibleBoards(), { myTeam: S.team, order: S.order, open: S.open, onToggle: id => { S.open = id; renderShare(); } });
  $("myPlane").innerHTML = planeHTML(liveCards(myCards()));
}
// 짝 조 비교 — 두 분류판과, 배치가 다른 사례의 근거를 나란히
function renderPair() {
  const p = pairOf(S.team), mine = liveCards(myCards()), other = liveCards(S.boards[teamId(p)]?.cards);
  $("pairTitle").textContent = `짝 조 비교: ${teamLabel(S.team)} · ${teamLabel(p)}`;
  $("pairMineT").textContent = `우리 조 (${teamLabel(S.team)})`;
  $("pairOtherT").textContent = `짝 조 (${teamLabel(p)})`;
  $("pairMine").innerHTML = planeHTML(mine, { sel: S.pairSel });
  $("pairOther").innerHTML = planeHTML(other, { sel: S.pairSel });
  const side = c => c?.q ? `<span class="qchip" style="background:${QUADS[c.q].color}">${esc(QUADS[c.q].ko)}</span>${(c.warn || []).map(w => `<span class="wchip">⚠${w === 1 ? "①" : "②"}</span>`).join("")}
      <span class="th">${esc(theoryName(c.theory) || c.theoryOther || "")}</span><span>${esc(c.why || "")}</span>` : `<span class="muted">미배치</span>`;
  const title = id => (mine[id]?.title || other[id]?.title || cardOf(id).title);
  const row = id => `<div class="pdrow"><div class="pdt">${cardImg(id) ? `<img class="cimg" src="${cardImg(id)}" alt="" onerror="this.remove()">` : ""}<b>${/^\d+$/.test(id) ? id : "+"}</b> ${esc(title(id))}</div>
      <div class="pdc"><small>우리 조</small>${side(mine[id])}</div><div class="pdc"><small>짝 조</small>${side(other[id])}</div></div>`;

  // 카드를 누르면 그 사례의 두 조 근거 — 같은 칸에 놓은 사례도 볼 수 있게
  $("pairDetail").innerHTML = S.pairSel ? `<h3 class="pdh">선택 사례 근거 비교 <button type="button" class="btn ghost" id="pairClose">닫기</button></h3>${row(S.pairSel)}`
    : `<p class="muted small">분류판의 카드 선택 시 해당 사례의 두 조 근거 표시</p>`;
  if ($("pairClose")) $("pairClose").onclick = () => { S.pairSel = null; renderPair(); };
  document.querySelectorAll("#pairMine .vchip, #pairOther .vchip").forEach(ch => {
    ch.draggable = false;
    ch.onclick = () => { S.pairSel = S.pairSel === ch.dataset.id ? null : ch.dataset.id; renderPair(); };
  });

  const diff = CARDS.filter(c => (mine[c.id]?.q || null) !== (other[c.id]?.q || null));
  const theoryDiff = CARDS.filter(c => mine[c.id]?.q && mine[c.id].q === other[c.id]?.q
    && (mine[c.id].theory || "") !== (other[c.id].theory || ""));
  $("pairDiffT").textContent = `배치가 다른 사례 ${diff.length}개 · 같은 칸 · 근거 이론이 다른 사례 ${theoryDiff.length}개`;
  $("pairDiff").innerHTML = (diff.map(c => row(c.id)).join("") || `<p class="muted">모든 사례 배치 일치</p>`)
    + (theoryDiff.length ? `<h3 class="pdh">같은 칸 · 근거 이론이 다른 사례</h3>` + theoryDiff.map(c => row(c.id)).join("") : "");
}
document.querySelectorAll("#shareTabs button").forEach(b => b.onclick = () => {
  S.shareView = b.dataset.v;
  document.querySelectorAll("#shareTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderShare();
});
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
  $("dTheory").innerHTML = `<option value="">— 선택 —</option>` + THEORIES.map(t => `<option value="${t.id}">${esc(t.ko)} — ${esc(t.line)}</option>`).join("");
  $("kindPick").innerHTML = ["VR", "AR"].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("");
  $("checks").innerHTML = CHECKS.map(c => `<label class="field ck"><span><b>${esc(c.ko)}</b> ${esc(c.q)}</span><textarea data-ck="${c.id}" rows="2" maxlength="200"></textarea></label>`).join("");
  $("kindPick").querySelectorAll("button").forEach(b => b.onclick = () => { setKind(b.dataset.k); queueDesign(); });
})();
const setKind = k => { $("kindPick").dataset.k = k || ""; $("kindPick").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); };
function designCardOptions() {
  const cards = liveCards(myCards());
  const ok = Object.entries(cards).filter(([, c]) => ["vr", "train", "guide"].includes(c.q));
  const cur = dForm.card.value;
  $("dCard").innerHTML = `<option value="">— 선택 (우리 조 VR · AR 칸 사례) —</option>` + ok.map(([id, c]) =>
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
}
function remoteDesign() {
  if (S.phase !== "design") return;
  designCardOptions();
  const d = S.designs[teamId(S.team)];
  if (!d) return;
  // 처음 한 번은 (내가 아직 아무것도 고치지 않았다면) 저장된 것을 불러오고,
  // 그 뒤로는 조원의 다른 기기가 고친 것만 받는다 — 내가 저장한 것이 되돌아와 쓰던 글을 덮지 않게
  if (!designFilled) { designFilled = true; if (!designDirty) fillDesign(); return; }
  if (d.by !== me.uid) { fillDesign(); $("dSaved").textContent = "조원 수정 내용 반영"; }
}
let dT;
function queueDesign() {
  if (S.phase !== "design") return;
  designDirty = true;
  clearTimeout(dT);
  $("dSaved").textContent = "저장 중";
  dT = setTimeout(async () => {
    try { await saveDesign(S.team, readDesign()); $("dSaved").textContent = "저장 완료"; }
    catch (e) { console.error(e); $("dSaved").textContent = "저장 실패 (재설계 단계 종료 또는 연결 끊김)"; }
  }, 700);
}
dForm.addEventListener("input", queueDesign);
dForm.addEventListener("change", queueDesign);
// 카드를 고르면 칸에 따라 VR · AR 을 먼저 맞춰 둔다 (바꿀 수 있음)
$("dCard").addEventListener("change", () => {
  const c = myCards()[dForm.card.value];
  if (c && !$("kindPick").dataset.k) setKind(c.q === "vr" ? "VR" : "AR");
});

/* ── 화면 목업 (AI 생성 · 조당 GEN_LIMIT 번) ────────────── */
let shownMock = -1, mBusy = false;
function renderMock() {
  if (S.phase !== "design") return;
  const m = S.mockups[teamId(S.team)] || {};
  const used = m.gens || 0;
  $("mGens").innerHTML = Array.from({ length: GEN_LIMIT }, (_, i) => `<span class="pip${i < used ? " used" : ""}">${i + 1}</span>`).join("") + `<em>남은 생성 ${GEN_LIMIT - used}회</em>`;
  const busy = m.generating && Date.now() - (m.generatingAt || 0) < 6 * 60 * 1000;
  $("mGen").disabled = busy || used >= GEN_LIMIT || mBusy;
  if (!mBusy) $("mMsg").textContent = busy ? "같은 조의 다른 기기에서 생성 중" : m.lastError ? m.lastError : m.version ? `${m.version}번째 목업` : "설명 · 체크리스트 작성 후 생성";
  if (m.html && m.version !== shownMock) { shownMock = m.version; $("mFrame").srcdoc = wrapMock(m.html); }
  if (!m.html && shownMock === -1) { shownMock = 0; $("mFrame").srcdoc = wrapMock(null); }
}
$("mGen").onclick = async () => {
  const d = readDesign();
  if (!d.card) { $("mMsg").textContent = "선택 사례 미지정"; return; }
  if (!d.change) { $("mMsg").textContent = "VR · AR 적용 화면 설명 미기재"; return; }
  if (!confirm(`생성은 조당 ${GEN_LIMIT}회입니다. 지금 설계안으로 생성하시겠습니까?`)) return;
  mBusy = true; $("mGen").disabled = true;
  const t0 = Date.now();
  const tick = setInterval(() => $("mMsg").textContent = `생성 중 ${Math.round((Date.now() - t0) / 1000)}초 (1~2분 소요)`, 500);
  try {
    clearTimeout(dT);
    await saveDesign(S.team, readDesign());   // 서버는 저장된 설계안을 읽는다
    const r = await generateMockup(S.team);
    $("mMsg").textContent = `생성 완료 (${Math.round(r.ms / 1000)}초) · 남은 생성 ${r.left}회`;
  } catch (e) { $("mMsg").textContent = e.message; }
  finally { clearInterval(tick); mBusy = false; const said = $("mMsg").textContent; renderMock(); $("mMsg").textContent = said; }
};
$("mReload").onclick = () => { $("mFrame").srcdoc = wrapMock((S.mockups[teamId(S.team)] || {}).html); };
const attr = s => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const mockFrame = team => {
  const m = S.mockups[teamId(team)];
  return m?.html ? `<div class="mockwrap"><iframe sandbox="allow-scripts" title="화면 목업" srcdoc="${attr(wrapMock(m.html))}"></iframe></div>` : `<p class="muted">목업 없음</p>`;
};

/* ── 설계안 보기 (부작용 찾기 · 대응책) ─────────────────── */
function designView(team) {
  const d = S.designs[teamId(team)];
  if (!d || !d.card) return `<p class="muted">${teamLabel(team)} 설계안 미제출</p>`;
  const board = S.boards[teamId(team)];
  const c = board?.cards?.[d.card] || {};
  return `<p class="eno">${teamLabel(team)} · 적용 방향: ${esc(d.kind || "")}</p><h3>${esc(c.title || cardOf(d.card).title)}</h3>
    <dl class="dl"><dt>사용자 · 시점 · 장소</dt><dd>${esc(d.who || "—")}</dd><dt>현행 방식의 문제</dt><dd>${esc(d.pain || "—")}</dd>
    <dt>적용 화면 설명</dt><dd>${esc(d.change || "—")}</dd><dt>근거 이론</dt><dd>${esc(theoryName(d.theory) || "—")}</dd></dl>
    ${mockFrame(team)}
    <dl class="dl ck">${CHECKS.map(k => `<dt>${esc(k.ko)}</dt><dd>${esc(d.checks?.[k.id] || "—")}</dd>`).join("")}</dl>`;
}

/* ── 부작용 찾기 ─────────────────────────────────────── */
const SD = { kind: null, items: null };
function renderSide(force) {
  if (S.phase !== "side") return;
  const target = sideTargetOf(S.team);
  $("sideTitle").textContent = `검토 대상: ${teamLabel(target)} 설계안`;
  $("sideView").innerHTML = designView(target);
  const doc = S.sides[sideDocId(target, S.team)];
  if (SD.items === null || force || (doc && doc.by !== me.uid)) SD.items = (doc?.items || []).map(x => ({ ...x }));
  $("sidePick").innerHTML = SIDES.map(s => `<button type="button" data-k="${s.id}" class="${SD.kind === s.id ? "on" : ""}"><b>${esc(s.ko)}</b><small>${esc(s.hint)}</small></button>`).join("");
  $("sidePick").querySelectorAll("button").forEach(b => b.onclick = () => { SD.kind = b.dataset.k; renderSide(); });
  $("addSide").disabled = !(SD.kind && $("sideNote").value.trim());
  $("sideList").innerHTML = SD.items.map((x, i) => `<li><span class="kchip">${esc(sideName(x.kind))}</span><span>${esc(x.note)}</span><button type="button" data-i="${i}" aria-label="지우기">×</button></li>`).join("")
    || `<li class="muted">입력된 부작용 없음</li>`;
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
  $("sideSaved").textContent = "저장 중";
  try { await saveSide(sideTargetOf(S.team), S.team, SD.items.slice(0, 12)); $("sideSaved").textContent = `${teamLabel(sideTargetOf(S.team))} 전송 완료`; }
  catch (e) { console.error(e); $("sideSaved").textContent = "저장 실패 (부작용 검토 단계 종료 또는 연결 끊김)"; }
}

/* ── 대응책 ─────────────────────────────────────────── */
let RP = null;
function renderReply(force) {
  if (S.phase !== "reply") return;
  const from = sideFromOf(S.team);
  $("myDesignView").innerHTML = designView(S.team);
  const doc = S.sides[sideDocId(S.team, from)];
  $("replyTitle").textContent = `${teamLabel(from)} 입력 부작용 · 우리 조 대응책`;
  if (!doc?.items?.length) { $("replyList").innerHTML = `<p class="muted">${teamLabel(from)} 입력 부작용 없음</p>`; return; }
  if (RP === null || force || (doc.replyBy && doc.replyBy !== me.uid)) RP = doc.items.map((_, i) => doc.replies?.[i] || "");
  const box = $("replyList");
  if (box.contains(document.activeElement) && !force) return;
  box.innerHTML = doc.items.map((x, i) => `<div class="reply"><p><span class="kchip">${esc(sideName(x.kind))}</span> ${esc(x.note)}</p>
    <label class="field">대응책 <textarea data-i="${i}" rows="2" maxlength="200">${esc(RP[i] || "")}</textarea></label></div>`).join("");
  let rT;
  box.querySelectorAll("textarea").forEach(t => t.oninput = () => {
    RP[Number(t.dataset.i)] = t.value;
    clearTimeout(rT); $("replySaved").textContent = "저장 중";
    rT = setTimeout(async () => {
      try { await saveReply(S.team, from, RP.map(v => v.trim().slice(0, 200))); $("replySaved").textContent = "저장 완료"; }
      catch (e) { console.error(e); $("replySaved").textContent = "저장 실패 (대응책 단계 종료 또는 연결 끊김)"; }
    }, 700);
  });
}

/* ── 실습보고서 ─────────────────────────────────────── */
$("reportBtn").onclick = () => downloadReport({ team: S.team, name: S.name, boards: visibleBoards(), designs: S.designs, sides: S.sides });

/* ── 시작 ───────────────────────────────────────────── */
if (S.team && S.name) start(); else ready().then(() => { show("join"); renderJoin(); });
