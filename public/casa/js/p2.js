// 2부 장치 의인화 — 학생 화면. 단계는 현황판이 넘긴다(p1 → build → rate → result).
//   제작   — Feine 분류로 단서를 찾아 명세서(최대 5개)에 적고, 저장된 명세서로 장치를 만든다(조당 2회)
//   평가   — 다른 조 장치 셋을 직접 조작해 보고 Godspeed 의인화 · 생동감 + 마음 지각 척도로 각자 평가
//   결과   — 앞 화면에서 함께 본다. 이때부터 다른 조 명세서도 읽을 수 있다
import * as D from "./data.js";
import { ready, setTeam, watchState, watchSpec, saveSpec, watchDevice, watchDeviceList, saveRating, generateDevice, wrapDevice, BASE_DEVICE, isDemoMode } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TEAM_KEY = "hci9_team" + (isDemoMode ? "_demo" : "");

const S = { phase: null, team: null, cues: [], dirty: false, device: null, shown: -1, list: [], rated: {}, cur: null, ans: {} };
const unsub = [];

try { S.team = Number(localStorage.getItem(TEAM_KEY)) || null; } catch { /* 저장 못 해도 다시 고르면 된다 */ }
if (isDemoMode) {
  S.team = S.team || 1;
  document.body.insertAdjacentHTML("beforeend", '<div class="demo">미리보기 — 가짜 자료입니다. 기록이 남지 않습니다.</div>');
}

/* ── 조 ── */
$("teams").innerHTML = Array.from({ length: D.TEAM_COUNT }, (_, i) => `<button class="btn" type="button" data-t="${i + 1}">${i + 1}조</button>`).join("");
$("teams").onclick = async e => {
  const t = Number(e.target.dataset.t);
  if (!t) return;
  await ready();
  try { await setTeam(t); } catch (err) { console.error(err); }
  try { localStorage.setItem(TEAM_KEY, t); } catch { /* 무시 */ }
  S.team = t; S.cues = []; S.dirty = false; S.shown = -1; S.rated = {}; S.cur = null;
  subscribeTeam(); render();
};
$("teamChip").onclick = () => { S.team = null; render(); };

function subscribeTeam() {
  unsub.splice(0).forEach(f => f());
  if (!S.team) return;
  unsub.push(watchSpec(S.team, spec => {
    if (!S.dirty) S.cues = (spec?.cues || []).map(c => ({ ...D.emptyCue(), ...c }));
    S.specAt = spec?.updatedAt;
    if (S.phase === "build") renderCues();
    if (S.phase === "result") renderMySpec();
  }));
  unsub.push(watchDevice(S.team, d => { S.device = d; renderMyDevice(); }));
}

/* ── 제작 ── */
$("cats").innerHTML = `<thead><tr><th>분류</th><th>하위 범주</th><th>예</th></tr></thead><tbody>${
  D.CUE_CATS.map(c => `<tr><th>${c.ko}</th><td>${c.sub}</td><td>${c.ex}</td></tr>`).join("")}</tbody>`;

function renderCues() {
  if (!S.cues.length) S.cues = [D.emptyCue()];
  $("cues").innerHTML = S.cues.map((c, i) => `
    <div class="cue" data-i="${i}">
      <div class="cue-head"><span>단서 ${i + 1}</span><button class="btn del" type="button" data-del="${i}">지우기</button></div>
      <label>${D.SPEC_FIELDS[0].ko}</label>
      <input data-f="name" maxlength="${D.SPEC_FIELDS[0].max}" placeholder="${esc(D.SPEC_FIELDS[0].ph)}" value="${esc(c.name)}">
      <div class="two">
        <div><label>분류</label><select data-f="cat"><option value="">고르기</option>${
          D.CUE_CATS.map(k => `<option value="${k.id}"${c.cat === k.id ? " selected" : ""}>${k.ko}</option>`).join("")}</select></div>
        <div><label>넣을 시점</label><select data-f="when"><option value="">고르기</option>${
          D.WHEN.map(w => `<option${c.when === w ? " selected" : ""}>${w}</option>`).join("")}</select></div>
      </div>
      ${D.SPEC_FIELDS.slice(1).map(f => `<label>${f.ko}</label><textarea data-f="${f.id}" maxlength="${f.max}" placeholder="${esc(f.ph)}">${esc(c[f.id])}</textarea>`).join("")}
    </div>`).join("");
  $("addCue").disabled = S.cues.length >= D.MAX_CUES;
  $("saved").textContent = S.dirty ? "저장 안 됨" : S.specAt ? `저장됨 ${new Date(S.specAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : "";
}
$("cues").addEventListener("input", e => {
  const box = e.target.closest(".cue"), f = e.target.dataset.f;
  if (!box || !f) return;
  S.cues[Number(box.dataset.i)][f] = e.target.value;
  S.dirty = true; $("saved").textContent = "저장 안 됨";
});
$("cues").addEventListener("click", e => {
  const i = e.target.dataset.del;
  if (i === undefined) return;
  S.cues.splice(Number(i), 1); S.dirty = true; renderCues();
});
$("addCue").onclick = () => { if (S.cues.length < D.MAX_CUES) { S.cues.push(D.emptyCue()); S.dirty = true; renderCues(); } };
$("saveSpec").onclick = async () => {
  const cues = S.cues.filter(c => c.name.trim() || c.detail.trim());
  try {
    await ready();
    await saveSpec(S.team, cues);
    S.dirty = false; S.specAt = Date.now(); renderCues();
  } catch (e) { console.error(e); $("saved").textContent = "저장 실패 — 제작 단계인지 확인"; }
};

function renderMyDevice() {
  const d = S.device;
  const left = D.GEN_LIMIT - (d?.gens || 0);
  $("genLeft").textContent = `생성 ${left}회 남음`;
  $("gen").disabled = left <= 0 || d?.generating;
  if (d?.generating) $("genMsg").textContent = "만드는 중… 1–2분 걸립니다";
  else if (d?.lastError) { $("genMsg").textContent = d.lastError; $("genMsg").className = "msg err"; }
  const v = d?.html ? d.version : 0;
  if (v !== S.shown) {
    S.shown = v;
    const html = wrapDevice(d?.html || BASE_DEVICE);
    $("myFrame").srcdoc = html;
    $("resFrame").srcdoc = html;
  }
}
$("reload").onclick = () => { $("myFrame").srcdoc = wrapDevice(S.device?.html || BASE_DEVICE); };
$("gen").onclick = async () => {
  if (S.dirty) { $("genMsg").className = "msg err"; $("genMsg").textContent = "명세서를 먼저 저장하십시오."; return; }
  $("gen").disabled = true; $("genMsg").className = "msg"; $("genMsg").textContent = "만드는 중… 1–2분 걸립니다";
  try {
    await ready();
    const r = await generateDevice(S.team);
    $("genMsg").className = "msg ok"; $("genMsg").textContent = `완성 — 생성 ${r.left}회 남음`;
  } catch (e) {
    $("genMsg").className = "msg err"; $("genMsg").textContent = e.message;
  } finally { renderMyDevice(); }
};

/* ── 평가 ── */
const pts = (name, n) => `<div class="pts" style="grid-template-columns:repeat(${n},1fr)">${
  Array.from({ length: n }, (_, i) => `<label><input type="radio" name="${name}" value="${i + 1}"><span>${i + 1}</span></label>`).join("")}</div>`;
$("godspeed").innerHTML = D.GODSPEED.map(g => `<div class="sd"><span class="lo">${g.lo}</span>${pts(g.id, 5)}<span class="hi">${g.hi}</span></div>`).join("");
$("mind").innerHTML = D.MIND.map(m => `<div class="lk"><span>${m.ko}</span>${pts(m.id, 7)}</div>`).join("");
const NEED = D.GODSPEED.length + D.MIND.length;

function targets() { return D.rateTargets(S.team, new Set(S.list.filter(t => t !== S.team))); }

function renderRate() {
  const ts = targets();
  if (!ts.length) { $("rateTabs").innerHTML = '<span class="muted">평가할 장치가 아직 없습니다.</span>'; $("rateBody").hidden = true; return; }
  if (!ts.includes(S.cur)) S.cur = ts.find(t => !S.rated[t]) ?? ts[0];
  $("rateTabs").innerHTML = ts.map((t, i) => `<button class="btn" role="tab" type="button" data-t="${t}" aria-selected="${t === S.cur}">장치 ${String.fromCharCode(65 + i)}${S.rated[t] ? '<span class="done">완료</span>' : ""}</button>`).join("");
  const allDone = ts.every(t => S.rated[t]);
  $("rateDone").hidden = !allDone;
  $("rateBody").hidden = false;
  $("rateTitle").textContent = `장치 ${String.fromCharCode(65 + ts.indexOf(S.cur))}`;
}
$("rateTabs").onclick = e => {
  const t = Number(e.target.closest("[data-t]")?.dataset.t);
  if (!t || t === S.cur) return;
  S.cur = t; loadTarget(); renderRate();
};

let stopTarget = null;
function loadTarget() {
  stopTarget && stopTarget();
  S.ans = { ...(S.rated[S.cur] || {}) };
  document.querySelectorAll("#rateBody input[type=radio]").forEach(r => { r.checked = S.ans[r.name] === Number(r.value); });
  refreshCount();
  $("rateMsg").textContent = "";
  let shownHtml = null;
  stopTarget = watchDevice(S.cur, d => {
    if (d?.html && d.html !== shownHtml) { shownHtml = d.html; $("rateFrame").srcdoc = wrapDevice(d.html); }
  });
}
$("rateReload").onclick = () => { const f = $("rateFrame"); f.srcdoc = f.srcdoc; };
function refreshCount() {
  const c = Object.keys(S.ans).length;
  $("rateCount").textContent = `${c} / ${NEED}`;
  $("sendRate").disabled = c < NEED;
}
$("rateBody").addEventListener("change", e => {
  if (e.target.type !== "radio") return;
  S.ans[e.target.name] = Number(e.target.value);
  refreshCount();
});
$("sendRate").onclick = async () => {
  $("sendRate").disabled = true;
  try {
    await ready();
    await saveRating(S.cur, S.team, S.ans);
    S.rated[S.cur] = { ...S.ans };
    const next = targets().find(t => !S.rated[t]);
    if (next) { S.cur = next; loadTarget(); }
    renderRate();
    $("rateMsg").className = "msg ok";
    $("rateMsg").textContent = next ? "보냈습니다. 다음 장치를 평가하십시오." : "보냈습니다.";
  } catch (e) {
    console.error(e);
    $("rateMsg").className = "msg err"; $("rateMsg").textContent = "보내지 못했습니다 — 평가 단계인지 확인하고 다시 눌러 주십시오.";
    $("sendRate").disabled = false;
  }
};

/* ── 결과 ── */
function renderMySpec() {
  const cues = S.cues.filter(c => c.name || c.detail);
  $("mySpec").innerHTML = cues.length ? `<div class="spec-view">${cues.map((c, i) => `<div class="cue"><div class="cue-head">단서 ${i + 1} · ${esc(c.name)}</div><dl>
    <dt>분류</dt><dd>${esc(D.CUE_CATS.find(k => k.id === c.cat)?.ko || "—")}</dd>
    <dt>넣을 시점</dt><dd>${esc(c.when || "—")}</dd>
    <dt>구체적 내용</dt><dd>${esc(c.detail)}</dd>
    <dt>출처</dt><dd>${esc(c.source)}</dd>
    <dt>예상 효과</dt><dd>${esc(c.effect)}</dd></dl></div>`).join("")}</div>` : '<p class="muted">명세서 없음</p>';
}

/* ── 단계 ── */
function render() {
  const p = S.phase;
  $("phaseChip").textContent = D.PHASES[p] || "연결 중";
  $("teamChip").hidden = !S.team;
  $("teamChip").textContent = S.team ? `${S.team}조 · 바꾸기` : "";
  $("pickTeam").hidden = !!S.team;
  for (const id of ["wait", "build", "rate", "result"]) $(id).hidden = true;
  if (!S.team || !p) return;
  if (p === "p1") $("wait").hidden = false;
  if (p === "build") { $("build").hidden = false; renderCues(); renderMyDevice(); }
  if (p === "rate") { $("rate").hidden = false; renderRate(); if (S.cur && !stopTarget) loadTarget(); }
  if (p === "result") { $("result").hidden = false; renderMySpec(); }
}

watchState(st => {
  const was = S.phase;
  S.phase = st.phase || "p1";
  if (was !== S.phase) { S.shown = -1; subscribeTeam(); }
  render();
});
watchDeviceList(list => { S.list = list; if (S.phase === "rate") { renderRate(); if (S.cur && !stopTarget) loadTarget(); } });
if (S.team) ready().then(() => setTeam(S.team).catch(() => {}));
