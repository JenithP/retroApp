// 조별 발표 현황판 — 문헌 신청 현황 · 발표 순서 입력 · 발표 날 질문 생성 · 보너스 명단.
import { TEAM_COUNT, MAX_TEAMS_PER_PAPER, WEEKS, SLOTS_PER_WEEK, PAPERS, teamId, paperOf, weekLabel, fmt, openAt, questionCloseAt } from "./data.js";
import { ready, watchState, watchPicks, watchFiles, watchSelect, watchPeople, adminCall } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = { get() { try { return sessionStorage.getItem("present.code") || ""; } catch { return ""; } }, set(v) { try { sessionStorage.setItem("present.code", v); } catch { } } };
const B = { code: ss.get(), state: { locked: false, slots: {} }, picks: {}, files: {}, select: {}, people: {}, qcount: {}, view: "picks", day: 0, draft: null };

async function unlock(code) {
  try { await adminCall(code, "check"); B.code = code; ss.set(code); $("lock").hidden = true; $("steps").hidden = false; refreshCounts(); }
  catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
if (B.code) unlock(B.code);
document.querySelectorAll("#btabs .ptab").forEach(b => b.onclick = () => { B.view = b.dataset.v; tab(); });
function tab() {
  document.querySelectorAll("#btabs .ptab").forEach(b => b.classList.toggle("on", b.dataset.v === B.view));
  document.querySelectorAll(".pv").forEach(v => v.hidden = v.id !== "pv-" + B.view);
  if (B.view === "day" || B.view === "bonus") refreshCounts();
}
const msg = t => $("stepMsg").textContent = t;
$("lockPicks").onclick = async () => {
  const to = !B.state.locked;
  if (!confirm(to ? "문헌 신청 마감 (학생 화면에서 신청 · 변경 불가)" : "문헌 신청 다시 열기")) return;
  try { await adminCall(B.code, "lock", { locked: to }); msg(to ? "신청 마감" : "신청 열림"); } catch (e) { msg(e.message); }
};
$("reset").onclick = async () => {
  if (!confirm("신청 · 일정 · 발표 자료 · 질문 · 선정 결과 전체 삭제 (리허설 후 전용)")) return;
  if (prompt("확인 문구 입력: 초기화") !== "초기화") return;
  try { await adminCall(B.code, "reset"); msg("초기화 완료"); } catch (e) { msg(e.message); }
};
async function refreshCounts() {
  if (!B.code) return;
  try {
    const { questions } = await adminCall(B.code, "allQuestions");
    B.qcount = {}; questions.forEach(q => B.qcount[q.target] = (B.qcount[q.target] || 0) + 1);
    renderDay();
  } catch (e) { console.error(e); }
}

/* ── 문헌 신청 ─────────────────────────────────────── */
function renderPicks() {
  const picked = Object.keys(B.picks).length;
  $("pickSum").textContent = `${picked} / ${TEAM_COUNT}조 신청${B.state.locked ? " · 마감됨" : ""}`;
  $("lockPicks").textContent = B.state.locked ? "신청 다시 열기" : "신청 마감";
  const none = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).filter(t => !B.picks[teamId(t)]);
  $("pickTable").innerHTML = `<table class="ptable"><thead><tr><th>#</th><th>문헌</th><th>신청 조</th></tr></thead><tbody>${PAPERS.map((p, i) => {
    const ts = Object.values(B.picks).filter(x => x.paper === p.id).map(x => x.team).sort((a, b) => a - b);
    return `<tr class="${ts.length >= MAX_TEAMS_PER_PAPER ? "full" : ""}"><td>${i + 1}</td><td><b>${esc(p.title)}</b><br><small>${esc(p.authors)} ${p.year || ""}</small></td><td>${ts.map(t => `${t}조`).join(" · ") || "—"} <small>(${ts.length}/${MAX_TEAMS_PER_PAPER})</small></td></tr>`;
  }).join("")}</tbody></table><p class="small">미신청: ${none.map(t => `${t}조`).join(" · ") || "없음"}</p>`;
}

/* ── 발표 순서 ─────────────────────────────────────── */
function draftFromState() {
  const d = {};
  for (const [id, s] of Object.entries(B.state.slots || {})) d[`${s.week}_${s.order}`] = Number(id.slice(1));
  return d;
}
function renderOrder() {
  B.draft ||= draftFromState();
  const used = new Set(Object.values(B.draft).filter(Boolean));
  $("orderGrid").innerHTML = WEEKS.map((_, w) => `<div class="oweek"><h3>${weekLabel(w)}</h3><small>자료 공개 ${fmt(openAt(w))} · 질문 마감 ${fmt(questionCloseAt(w))}</small>
    ${Array.from({ length: SLOTS_PER_WEEK }, (_, k) => { const key = `${w}_${k + 1}`, cur = B.draft[key] || "";
      return `<label class="oslot"><span>${k + 1}</span><select data-k="${key}"><option value="">—</option>${Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(t => {
        const p = paperOf(B.picks[teamId(t)]?.paper);
        return `<option value="${t}"${t === cur ? " selected" : ""}${used.has(t) && t !== cur ? " disabled" : ""}>${t}조${p ? " · " + esc(p.title.slice(0, 18)) : ""}</option>`; }).join("")}</select></label>`; }).join("")}</div>`).join("");
  $("orderGrid").querySelectorAll("select").forEach(s => s.onchange = () => { B.draft[s.dataset.k] = Number(s.value) || null; B.dirty = true; renderOrder(); });
}
$("autoOrder").onclick = () => {
  // 빈칸을 문헌 순서(같은 문헌은 이어서) · 조 번호 순으로 채운다
  const used = new Set(Object.values(B.draft || {}).filter(Boolean));
  const rest = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).filter(t => !used.has(t))
    .sort((a, b) => (PAPERS.findIndex(p => p.id === B.picks[teamId(a)]?.paper) + 1 || 999) - (PAPERS.findIndex(p => p.id === B.picks[teamId(b)]?.paper) + 1 || 999) || a - b);
  for (let w = 0; w < WEEKS.length; w++) for (let k = 1; k <= SLOTS_PER_WEEK; k++) { const key = `${w}_${k}`; if (!B.draft[key] && rest.length) B.draft[key] = rest.shift(); }
  B.dirty = true; renderOrder();
};
$("saveOrder").onclick = async () => {
  const slots = {};
  for (const [key, t] of Object.entries(B.draft || {})) if (t) { const [w, o] = key.split("_").map(Number); slots[teamId(t)] = { week: w, order: o }; }
  try { const r = await adminCall(B.code, "schedule", { slots }); B.dirty = false; $("orderMsg").textContent = `저장 — ${r.n}개 조`; } catch (e) { $("orderMsg").textContent = e.message; }
};

/* ── 발표 날 ───────────────────────────────────────── */
$("daySel").innerHTML = WEEKS.map((_, w) => `<option value="${w}">${weekLabel(w)}</option>`).join("");
{ const now = Date.now(), w = WEEKS.findIndex((_, i) => questionCloseAt(i).getTime() + 12 * 3600e3 > now); B.day = w < 0 ? WEEKS.length - 1 : w; $("daySel").value = B.day; }
$("daySel").onchange = () => { B.day = Number($("daySel").value); $("stageBox").hidden = true; renderDay(); };
function renderDay() {
  const rows = Object.entries(B.state.slots || {}).filter(([, s]) => s.week === B.day).sort((a, b) => a[1].order - b[1].order);
  $("dayGrid").innerHTML = rows.length ? rows.map(([id, s]) => {
    const t = Number(id.slice(1)), p = paperOf(B.picks[id]?.paper), sel = B.select[id];
    return `<div class="dcard"><b>${s.order}. ${t}조</b><span>${p ? esc(p.title) : "문헌 미신청"}</span>
      <small>자료 ${B.files[id] ? "있음" : "없음"} · 질문 ${B.qcount[id] || 0}개${sel ? ` · 선정 ${sel.revealed}/${sel.picks.length} 공개` : ""}</small>
      <div class="dacts">${B.files[id] ? `<button class="btn small" data-file="${t}" type="button">자료</button>` : ""}
        <button class="btn primary" data-gen="${t}" type="button">질문 생성</button></div></div>`;
  }).join("") : `<p class="muted">이 주에 배정된 조 없음 — 「발표 순서」에서 입력</p>`;
  $("dayGrid").querySelectorAll("[data-file]").forEach(b => b.onclick = async () => {
    const w = window.open("", "_blank");
    try { const { url } = await adminCall(B.code, "file", { team: Number(b.dataset.file) }); w.location = url; } catch (e) { w.close(); alert(e.message); }
  });
  $("dayGrid").querySelectorAll("[data-gen]").forEach(b => b.onclick = () => generate(Number(b.dataset.gen), b));
}
async function generate(team, btn) {
  const box = $("stageBox"); box.hidden = false;
  let sel = B.select[teamId(team)];
  try {
    if (!sel) {
      btn.disabled = true;
      box.innerHTML = `<div class="stage"><p class="muted">AI가 ${team}조 발표 자료와 질문 ${B.qcount[teamId(team)] || ""}개를 읽고 고르는 중… (30초 안팎)</p></div>`;
      sel = await adminCall(B.code, "select", { team });
      btn.disabled = false;
    }
    if ((sel.revealed || 0) < sel.picks.length) sel = await adminCall(B.code, "reveal", { team });
    showStage(team, sel);
  } catch (e) { btn.disabled = false; box.innerHTML = `<div class="stage"><p class="msg">${esc(e.message)}</p></div>`; }
}
function showStage(team, sel) {
  const n = sel.revealed || 0, q = sel.picks[n - 1];
  $("stageBox").innerHTML = `<div class="stage"><p class="sno">${team}조 발표 · 질문 ${n} / ${sel.picks.length} <small>등록 질문 ${sel.total}개 중 AI 선정</small></p>
    <h2 class="sq">${esc(q.text)}</h2><p class="sr">${esc(q.reason)}</p><p class="sw">질문 ${esc(q.name)} (${q.team}조)</p>
    <div class="dacts">${n < sel.picks.length ? `<button class="btn primary big" id="nextQ" type="button">다음 질문</button>` : `<span class="muted">세 질문 모두 공개</span>`}
      <button class="btn ghost small" id="reSel" type="button">다시 선정</button></div></div>`;
  $("nextQ")?.addEventListener("click", () => generate(team, $("nextQ")));
  $("reSel").onclick = async () => {
    if (!confirm(`${team}조 질문을 처음부터 다시 선정합니다 (이미 공개한 질문도 바뀔 수 있음)`)) return;
    await adminCall(B.code, "reselect", { team }); delete B.select[teamId(team)]; generate(team, $("reSel"));
  };
}

/* ── 보너스 ───────────────────────────────────────── */
function bonusRows() {
  return Object.entries(B.select).flatMap(([id, s]) => s.picks.slice(0, s.revealed || 0).map((q, i) => ({ target: Number(id.slice(1)), n: i + 1, ...q })))
    .sort((a, b) => a.target - b.target || a.n - b.n);
}
function renderBonus() {
  const rows = bonusRows();
  $("bonusTable").innerHTML = rows.length ? `<table class="ptable"><thead><tr><th>발표 조</th><th>순서</th><th>학번</th><th>이름</th><th>질문자 조</th><th>질문</th></tr></thead><tbody>${rows.map(r =>
    `<tr><td>${r.target}조</td><td>${r.n}</td><td>${esc(r.sid)}</td><td>${esc(r.name)}</td><td>${r.team}조</td><td>${esc(r.text)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">아직 없음 — 발표 날 공개한 질문만 집계</p>`;
}
$("csv").onclick = () => {
  const rows = bonusRows(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [["발표 조", "순서", "학번", "이름", "질문자 조", "질문", "보너스"].map(q).join(","), ...rows.map(r => [r.target, r.n, r.sid, r.name, r.team, r.text, 1].map(q).join(","))].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "조별발표_질문채택_보너스.csv"; a.click();
};

function renderAll() { renderPicks(); if (!B.dirty) B.draft = null; renderOrder(); renderDay(); renderBonus(); }   // 저장 안 한 순서는 지우지 않는다
await ready();
watchState(st => { B.state = st; renderAll(); });
watchPicks(p => { B.picks = p; renderAll(); });
watchFiles(f => { B.files = f; renderDay(); });
watchSelect(s => { B.select = s; renderDay(); renderBonus(); });
watchPeople(p => { B.people = p; });
tab();
