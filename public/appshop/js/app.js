// 앱 공방 — 학생 화면. 단계(교수 현황판이 넘김)에 따라 보이는 화면이 바뀐다.
//   준비 → 제작(설계서 · 생성 5번) → 평가(출판된 다른 조 앱 두 개) → 피드백 → 마침
import { missionOf, targetsOf, HEURISTICS, SEVERITY, PHASES, GEN_LIMIT, SCENE_COUNT, TEAM_COUNT } from "./data.js";
import { quad, avg } from "./quad.js";
import { me, ready, watchState, watchTeam, watchTeams, watchSpec, saveSpec, watchEvals, addEval, generate, wrapApp } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem("appshop." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("appshop." + k, v); } catch { /* 저장 못 해도 진행 */ } },
};

const S = { phase: null, state: {}, team: Number(store.get("team")) || null, name: store.get("name") || "", teamDoc: {}, teams: {} };

/* ── 조 고르기 ───────────────────────────────────────── */
function renderJoin() {
  const pick = $("teamPick");
  pick.innerHTML = "";
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tp" + (S.team === t ? " on" : "");
    b.innerHTML = `<b>${t}조</b><span>${esc(missionOf(t).name)}</span>`;
    b.onclick = () => { S.team = t; renderJoin(); };
    pick.appendChild(b);
  }
  $("myName").value = S.name;
  const check = () => $("joinBtn").disabled = !(S.team && $("myName").value.trim());
  $("myName").oninput = check;
  check();
}
$("joinBtn").onclick = () => {
  S.name = $("myName").value.trim();
  store.set("team", S.team); store.set("name", S.name);
  start();
};

function missionCard(m, withTask = false) {
  return `<p class="mno">미션 ${m.id}</p><h2>${esc(m.name)}</h2>
    <dl><dt>누가</dt><dd>${esc(m.who)}</dd><dt>언제 · 어디서</dt><dd>${esc(m.when)}</dd><dt>무엇을</dt><dd>${esc(m.goal)}</dd>
    ${withTask ? `<dt class="task">평가 과업</dt><dd class="task">${esc(m.task)}</dd>` : ""}</dl>`;
}

/* ── 단계 전환 ───────────────────────────────────────── */
const VIEWS = { join: "vJoin", ready: "vReady", build: "vBuild", eval: "vEval", feedback: "vFeedback", end: "vEnd" };
function show(v) {
  Object.values(VIEWS).forEach(id => $(id).hidden = true);
  $(VIEWS[v]).hidden = false;
}

let started = false;
async function start() {
  await ready();
  if (!S.team) { show("join"); renderJoin(); return; }
  if (started) return;
  started = true;
  $("teamChip").hidden = false;
  $("teamChip").textContent = `${S.team}조 · ${S.name}`;
  $("teamChip").title = "눌러서 조 바꾸기";
  $("teamChip").onclick = () => { if (confirm("조를 다시 고를까요?")) { store.set("team", ""); location.reload(); } };

  const m = missionOf(S.team);
  $("readyMission").innerHTML = missionCard(m);
  $("buildMission").innerHTML = missionCard(m);
  $("genLimit").textContent = GEN_LIMIT;

  watchTeam(S.team, d => { S.teamDoc = d; renderBuildSide(); renderFeedback(); });
  watchTeams(all => { S.teams = all; if (S.phase === "eval") renderEvalList(); });
  watchSpec(S.team, remoteSpec);
  watchEvals(list => { S.myEvals = list.filter(e => e.uid === me.uid); if (S.phase === "eval") renderEvalList(); });
  watchEvals(list => { S.received = list; renderFeedback(); }, S.team);
  watchState(st => { S.state = st; setPhase(st.phase || "ready"); });
}

function setPhase(p) {
  const changed = p !== S.phase;
  S.phase = p;
  $("phaseChip").textContent = PHASES[p] || p;
  $("phaseChip").dataset.p = p;
  renderBuildSide();
  if (!changed) return;
  show(p);
  if (p === "eval") renderEvalList();
  if (p === "feedback") renderFeedback(true);
}

// 제작 남은 시간
setInterval(() => {
  const end = S.state.buildEndsAt;
  const t = $("timer");
  if (S.phase !== "build" || !end) { t.hidden = true; return; }
  t.hidden = false;
  const left = Math.max(0, end - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
  t.textContent = left ? `${m}:${String(s).padStart(2, "0")}` : "시간 끝 — 출판을 기다리는 중";
  t.classList.toggle("warn", left < 5 * 60000);
}, 500);

/* ── 제작: 설계서 ────────────────────────────────────── */
const form = $("specForm");
(function buildScenes() {
  const box = $("scenes");
  for (let i = 0; i < SCENE_COUNT; i++) {
    const f = document.createElement("fieldset");
    f.className = "scene";
    f.innerHTML = `<legend>장면 ${i + 1}</legend>
      <label>화면에 보이는 것<textarea data-i="${i}" data-k="see" rows="2" maxlength="300"></textarea></label>
      <label>사용자가 하는 일<textarea data-i="${i}" data-k="do" rows="2" maxlength="300"></textarea></label>
      <label>앱의 반응<textarea data-i="${i}" data-k="react" rows="2" maxlength="300"></textarea></label>`;
    box.appendChild(f);
  }
  box.querySelectorAll("textarea").forEach(t => t.placeholder = {
    see: i => i === 0 ? "예: 가운데에 큰 글씨로 「오늘의 약」, 아래에 아침 · 점심 · 저녁 버튼 세 개" : "",
    do: i => i === 0 ? "예: 점심 버튼을 누른다" : "",
    react: i => i === 0 ? "예: 점심 버튼이 초록색으로 바뀌고 「먹음」 이라고 표시된다" : "",
  }[t.dataset.k](Number(t.dataset.i)));
})();

function readSpec() {
  const spec = { appName: form.appName.value.trim(), style: form.style.value.trim(), scenes: [] };
  for (let i = 0; i < SCENE_COUNT; i++) {
    const g = k => form.querySelector(`textarea[data-i="${i}"][data-k="${k}"]`).value.trim();
    spec.scenes.push({ see: g("see"), do: g("do"), react: g("react") });
  }
  return spec;
}
function fillSpec(spec) {
  if (!spec) return;
  const setv = (el, v) => { if (document.activeElement !== el) el.value = v || ""; };
  setv(form.appName, spec.appName);
  setv(form.style, spec.style);
  (spec.scenes || []).forEach((sc, i) => ["see", "do", "react"].forEach(k => {
    const el = form.querySelector(`textarea[data-i="${i}"][data-k="${k}"]`);
    if (el) setv(el, sc[k]);
  }));
}

let firstSpec = true;
function remoteSpec(d) {
  if (firstSpec) {
    firstSpec = false;
    if (d?.spec) fillSpec(d.spec);
    else form.appName.value = missionOf(S.team).name;
    return;
  }
  if (d && d.by !== me.uid) { fillSpec(d.spec); $("savedMsg").textContent = "조원이 고친 내용을 받았습니다"; }
}

let saveT;
form.addEventListener("input", () => {
  if (S.phase !== "build") return;
  clearTimeout(saveT);
  $("savedMsg").textContent = "저장하는 중…";
  saveT = setTimeout(async () => {
    try { await saveSpec(S.team, readSpec()); $("savedMsg").textContent = "조 전체에 저장됨"; }
    catch (e) { console.error(e); $("savedMsg").textContent = "저장하지 못했습니다 — 출판 뒤에는 고칠 수 없습니다"; }
  }, 700);
});

/* ── 제작: 생성과 폰 화면 ─────────────────────────────── */
let shownVersion = -1;
function renderBuildSide() {
  const d = S.teamDoc;
  const used = d.gens || 0;
  $("gens").innerHTML = Array.from({ length: GEN_LIMIT }, (_, i) =>
    `<span class="pip${i < used ? " used" : ""}">${i + 1}</span>`).join("") + `<em>남은 생성 ${GEN_LIMIT - used}번</em>`;
  const busy = d.generating && Date.now() - (d.generatingAt || 0) < 6 * 60 * 1000;
  $("genBtn").disabled = busy || used >= GEN_LIMIT || S.phase !== "build" || d.published;
  if (busy && !localBusy) $("genMsg").textContent = "조의 다른 기기에서 만드는 중입니다…";
  else if (!localBusy && d.lastError) $("genMsg").textContent = d.lastError;
  else if (!localBusy && d.version) $("genMsg").textContent = `${d.version}번째로 만든 앱입니다. 직접 눌러 보며 확인하세요.`;
  if (d.html && d.version !== shownVersion) { shownVersion = d.version; $("buildFrame").srcdoc = wrapApp(d.html); }
  if (!d.html && shownVersion === -1) { shownVersion = 0; $("buildFrame").srcdoc = wrapApp(null); }
}

let localBusy = false;
$("genBtn").onclick = async () => {
  const spec = readSpec();
  if (!spec.scenes.some(s => s.see || s.do || s.react)) { $("genMsg").textContent = "장면을 하나 이상 적어 주세요"; return; }
  if (!confirm(`생성은 ${GEN_LIMIT}번뿐입니다. 이 설계서로 만들까요?`)) return;
  localBusy = true;
  $("genBtn").disabled = true;
  const t0 = Date.now();
  const tick = setInterval(() => $("genMsg").textContent = `설계서대로 만드는 중… ${Math.round((Date.now() - t0) / 1000)}초 (1~2분 걸릴 수 있습니다)`, 500);
  try {
    await saveSpec(S.team, spec).catch(() => {});
    const r = await generate(S.team, spec);
    $("genMsg").textContent = `다 만들었습니다 (${Math.round(r.ms / 1000)}초). 남은 생성 ${r.left}번.`;
  } catch (e) {
    $("genMsg").textContent = e.message;
  } finally {
    clearInterval(tick);
    localBusy = false;
    const said = $("genMsg").textContent;   // 결과 문구는 남기고 버튼 · 남은 횟수만 새로
    renderBuildSide();
    $("genMsg").textContent = said;
  }
};
$("reloadBuild").onclick = () => { $("buildFrame").srcdoc = wrapApp(S.teamDoc.html); };

/* ── 평가 ───────────────────────────────────────────── */
const EV = { target: null, tags: [], h: null, sev: null, pq: null, hq: null, t0: 0, ms: 0, taps: 0, done: null, running: false };

function renderEvalList() {
  const box = $("evalList");
  if (!$("evalWork").hidden) return;
  const mine = S.myEvals || [];
  box.innerHTML = `<h2>다른 조의 앱을 평가합니다</h2>
    <p class="lead">두 앱을 차례로 내려받아 <b>평가 과업</b>을 직접 해 보세요. 막히거나 이상한 곳마다 닐슨의 원칙으로 적습니다. 각자 따로 평가하고, 결과는 조별로 합쳐집니다.</p>
    <div class="cards">${targetsOf(S.team).map(t => {
      const m = missionOf(t), d = S.teams["T" + String(t).padStart(2, "0")] || {};
      const done = mine.some(e => e.target === t);
      return `<article class="appcard${done ? " done" : ""}">
        <p class="mno">${t}조의 앱 · 미션 ${m.id}</p><h3>${esc(d.publishedSpec?.appName || m.name)}</h3>
        <p>${esc(m.goal)}</p>
        ${d.publishedHtml ? `<button class="btn primary" data-t="${t}">${done ? "다시 평가하기" : "내려받아 평가하기"}</button>` : `<p class="muted">출판된 앱이 없습니다</p>`}
        ${done ? `<p class="ok">평가를 보냈습니다</p>` : ""}
      </article>`;
    }).join("")}</div>`;
  box.querySelectorAll("button[data-t]").forEach(b => b.onclick = () => openEval(Number(b.dataset.t)));
  box.hidden = false;
}

function openEval(t) {
  Object.assign(EV, { target: t, tags: [], h: null, sev: null, pq: null, hq: null, t0: 0, ms: 0, taps: 0, done: null, running: false });
  const d = S.teams["T" + String(t).padStart(2, "0")] || {};
  $("evalMission").innerHTML = `<p class="mno">${t}조의 앱</p>` + missionCard(missionOf(t), true).replace(/^<p class="mno">[^<]*<\/p>/, "");
  $("evalFrame").srcdoc = wrapApp(d.publishedHtml);
  $("evalList").hidden = true;
  $("evalWork").hidden = false;
  ["tWhere", "tNote", "comment"].forEach(id => $(id).value = "");
  $("evalMsg").textContent = "";
  $("taskStart").disabled = false; $("taskDone").disabled = true; $("taskGiveup").disabled = true;
  $("taskTime").textContent = "0:00"; $("taps").textContent = "탭 0";
  renderPicks(); renderTags(); renderLikert(); checkSubmit();
  window.scrollTo(0, 0);
}
$("backList").onclick = () => {
  if (EV.tags.length && !confirm("적은 내용이 사라집니다. 목록으로 갈까요?")) return;
  EV.running = false;
  $("evalWork").hidden = true; renderEvalList();
};
$("reloadEval").onclick = () => { $("evalFrame").srcdoc = wrapApp((S.teams["T" + String(EV.target).padStart(2, "0")] || {}).publishedHtml); };

// 과업 시간과 탭 — 앱 안의 탭은 iframe 이 알려 준다
window.addEventListener("message", e => {
  if (e.data?.appshop !== "tap") return;
  if (e.source === $("evalFrame").contentWindow && EV.running) { EV.taps++; $("taps").textContent = `탭 ${EV.taps}`; }
});
$("taskStart").onclick = () => {
  Object.assign(EV, { t0: Date.now(), taps: 0, running: true, done: null });
  $("reloadEval").click();
  $("taskStart").disabled = true; $("taskDone").disabled = false; $("taskGiveup").disabled = false;
};
const endTask = done => {
  EV.running = false; EV.ms = Date.now() - EV.t0; EV.done = done;
  $("taskDone").disabled = true; $("taskGiveup").disabled = true;
  $("taskTime").textContent = fmt(EV.ms) + (done ? " · 끝냄" : " · 포기");
  checkSubmit();
};
$("taskDone").onclick = () => endTask(true);
$("taskGiveup").onclick = () => endTask(false);
setInterval(() => { if (EV.running) $("taskTime").textContent = fmt(Date.now() - EV.t0); }, 250);
const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

function renderPicks() {
  $("hPick").innerHTML = HEURISTICS.map(h =>
    `<button type="button" class="hb${EV.h === h.n ? " on" : ""}" data-h="${h.n}" title="${esc(h.hint)} (${esc(h.en)})"><b>${h.n}</b><span>${esc(h.ko)}<small>${esc(h.hint)}</small></span></button>`).join("");
  $("sPick").innerHTML = SEVERITY.map(s =>
    `<button type="button" class="sb s${s.v}${EV.sev === s.v ? " on" : ""}" data-s="${s.v}"><b>${s.v}</b>${esc(s.ko)}</button>`).join("");
  $("hPick").querySelectorAll("button").forEach(b => b.onclick = () => { EV.h = Number(b.dataset.h); renderPicks(); });
  $("sPick").querySelectorAll("button").forEach(b => b.onclick = () => { EV.sev = Number(b.dataset.s); renderPicks(); });
  $("addTag").disabled = !(EV.h && EV.sev !== null && $("tNote").value.trim());
}
$("tNote").oninput = renderPicks;
$("addTag").onclick = () => {
  EV.tags.push({ where: $("tWhere").value.trim().slice(0, 60), h: EV.h, sev: EV.sev, note: $("tNote").value.trim().slice(0, 120) });
  EV.h = null; EV.sev = null; $("tNote").value = ""; $("tWhere").value = "";
  renderPicks(); renderTags(); checkSubmit();
};
function renderTags() {
  $("tagList").innerHTML = EV.tags.map((t, i) =>
    `<li><span class="hnum">${t.h}</span><span class="sev s${t.sev}">${t.sev}</span><span>${esc(t.where ? t.where + " — " : "")}${esc(t.note)}</span><button type="button" data-i="${i}" aria-label="지우기">×</button></li>`).join("")
    || `<li class="muted">아직 적은 문제가 없습니다</li>`;
  $("tagList").querySelectorAll("button").forEach(b => b.onclick = () => { EV.tags.splice(Number(b.dataset.i), 1); renderTags(); checkSubmit(); });
}
function renderLikert() {
  document.querySelectorAll(".likert").forEach(el => {
    const k = el.dataset.k;
    el.querySelector("div").innerHTML = [1, 2, 3, 4, 5, 6, 7].map(v =>
      `<button type="button" class="${EV[k] === v ? "on" : ""}" data-v="${v}">${v}</button>`).join("") + `<small>1 전혀 · 7 매우</small>`;
    el.querySelectorAll("button").forEach(b => b.onclick = () => { EV[k] = Number(b.dataset.v); renderLikert(); checkSubmit(); });
  });
}
function checkSubmit() {
  $("submitEval").disabled = !(EV.done !== null && EV.pq && EV.hq);
  $("submitEval").title = EV.done === null ? "과업을 끝내거나 포기한 뒤에 보낼 수 있습니다" : (!EV.pq || !EV.hq) ? "두 질문에 답해 주세요" : "";
}
$("submitEval").onclick = async () => {
  $("submitEval").disabled = true;
  try {
    await addEval({ team: S.team, name: S.name, target: EV.target, tags: EV.tags, pq: EV.pq, hq: EV.hq,
      comment: $("comment").value.trim().slice(0, 150), taskDone: EV.done, ms: EV.ms, taps: EV.taps });
    EV.tags = [];
    $("evalWork").hidden = true; renderEvalList();
  } catch (e) {
    console.error(e);
    $("evalMsg").textContent = "보내지 못했습니다 — 평가 시간이 끝났거나 연결이 끊겼습니다";
    $("submitEval").disabled = false;
  }
};

/* ── 피드백 ─────────────────────────────────────────── */
let fbShown = null;
function renderFeedback(force) {
  if (S.phase !== "feedback" && !force) return;
  const d = S.teamDoc, list = S.received || [];
  if (d.publishedHtml && fbShown !== d.publishedVersion) { fbShown = d.publishedVersion; $("fbFrame").srcdoc = wrapApp(d.publishedHtml); }
  const people = list.length, teams = new Set(list.map(e => e.team)).size;
  $("fbCount").textContent = people ? `${teams}개 조 · ${people}명` : "아직 없습니다";

  const tags = list.flatMap(e => (e.tags || []).map(t => ({ ...t, by: e.name, team: e.team })));
  const byH = HEURISTICS.map(h => {
    const ts = tags.filter(t => t.h === h.n);
    return { h, n: ts.length, sev: ts.length ? ts.reduce((a, t) => a + t.sev, 0) / ts.length : 0 };
  });
  const max = Math.max(1, ...byH.map(x => x.n));
  $("fbBars").innerHTML = `<h4>닐슨의 10가지 사용성 원칙별 지적 횟수 <small>막대 색 = 평균 심각도</small></h4>` + byH.map(x =>
    `<div class="hbar"><span class="hl"><b>${x.h.n}</b> ${esc(x.h.ko)}</span><span class="track"><span class="fill sv${Math.round(x.sev)}" style="width:${x.n / max * 100}%"></span></span><span class="hn">${x.n || ""}</span></div>`).join("");

  const pq = avg(list.map(e => e.pq)), hq = avg(list.map(e => e.hq));
  $("fbQuad").innerHTML = `<h4>실용적 품질 × 쾌락적 품질 <small>평가자 평균</small></h4>` + quad(list.map(e => [e.pq, e.hq]), pq, hq);

  const spec = d.publishedSpec || d.spec;
  $("fbSpec").innerHTML = spec ? `<p><b>${esc(spec.appName)}</b></p>` + (spec.scenes || []).map((s, i) =>
    (s.see || s.do || s.react) ? `<div class="sc"><b>장면 ${i + 1}</b><p>보이는 것 — ${esc(s.see || "(적지 않음)")}</p><p>하는 일 — ${esc(s.do || "(적지 않음)")}</p><p>반응 — ${esc(s.react || "(적지 않음)")}</p></div>` : "").join("")
    + `<p class="muted">꾸밈 — ${esc(spec.style || "(적지 않음)")}</p>` : `<p class="muted">출판된 설계서가 없습니다</p>`;

  $("fbTags").innerHTML = tags.sort((a, b) => b.sev - a.sev).map(t =>
    `<li><span class="hnum">${t.h}</span><span class="sev s${t.sev}">${t.sev}</span><span>${esc(t.where ? t.where + " — " : "")}${esc(t.note)}</span></li>`).join("") || `<li class="muted">없음</li>`;
  $("fbComments").innerHTML = list.filter(e => e.comment).map(e => `<li>${esc(e.comment)}</li>`).join("") || `<li class="muted">없음</li>`;
}
/* ── 시작 ───────────────────────────────────────────── */
if (S.team && S.name) start(); else { ready().then(() => { show("join"); renderJoin(); }); }
