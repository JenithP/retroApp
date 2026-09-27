// 앱 공방 현황판 — 교수가 단계를 넘기고(버셀 함수 · 교수용 암호), 조별 진행과 반 전체 결과를 본다.
import { missionOf, HEURISTICS, PHASES, GEN_LIMIT, TEAM_COUNT } from "./data.js";
import { ready, watchState, watchTeams, watchSpecs, watchEvals, adminCall, wrapApp, teamId } from "./fb.js";
import { quad, avg } from "./quad.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("appshop.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("appshop.code", v); } catch { /* 이 탭에서만 */ } },
};
const B = { state: {}, teams: {}, specs: {}, evals: [], code: ss.get() };

/* ── 잠금과 단계 ─────────────────────────────────────── */
async function unlock(code) {
  try {
    await adminCall(code, "check");
    B.code = code; ss.set(code);
    $("lock").hidden = true; $("steps").hidden = false;
  } catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
if (B.code) unlock(B.code);

const CONFIRM = {
  build: "제작을 시작합니다. 30분 타이머가 돌아갑니다.",
  eval: "지금 출판합니다. 각 조의 마지막 앱이 시장에 올라가고, 그 뒤로는 설계서도 앱도 고칠 수 없습니다.",
  feedback: "평가를 닫고 피드백을 공개합니다. 더는 평가를 보낼 수 없습니다.",
  end: "공방을 마칩니다.",
};
document.querySelectorAll(".step[data-phase]").forEach(b => b.onclick = async () => {
  const p = b.dataset.phase;
  if (CONFIRM[p] && !confirm(CONFIRM[p])) return;
  $("stepMsg").textContent = "넘기는 중…";
  try { await adminCall(B.code, "phase", { phase: p }); $("stepMsg").textContent = `${PHASES[p]} 단계로 넘겼습니다`; }
  catch (e) { $("stepMsg").textContent = e.message; }
});
$("extend").onclick = async () => {
  try { await adminCall(B.code, "extend", { minutes: 5 }); $("stepMsg").textContent = "5분 늘렸습니다"; }
  catch (e) { $("stepMsg").textContent = e.message; }
};
$("reset").onclick = async () => {
  if (!confirm("모든 조의 설계서 · 앱 · 평가를 지웁니다. 리허설 뒤에만 쓰세요.")) return;
  if (prompt("정말 지우려면 「비우기」 라고 적으세요") !== "비우기") return;
  try { await adminCall(B.code, "reset"); $("stepMsg").textContent = "비웠습니다"; }
  catch (e) { $("stepMsg").textContent = e.message; }
};

setInterval(() => {
  const end = B.state.buildEndsAt, t = $("timer");
  if (B.state.phase !== "build" || !end) { t.hidden = true; return; }
  t.hidden = false;
  const left = Math.max(0, end - Date.now());
  t.textContent = left ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}` : "시간 끝 — 출판하세요";
  t.classList.toggle("warn", left < 5 * 60000);
}, 500);
setInterval(renderTeams, 15000);   // 「몇 분 전」 을 새로 적는다

/* ── 그리기 ─────────────────────────────────────────── */
const ago = ms => { if (!ms) return ""; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "방금" : `${m}분 전`; };

function renderAll() { renderKpis(); renderTeams(); renderClass(); }

function renderKpis() {
  const T = Object.values(B.teams), specs = Object.values(B.specs);
  const gens = T.reduce((a, t) => a + (t.gens || 0), 0);
  const pub = T.filter(t => t.publishedHtml).length;
  const tags = B.evals.reduce((a, e) => a + (e.tags || []).length, 0);
  const k = [[specs.length, "설계서를 쓴 조"], [gens, "생성한 횟수"], [pub, "출판된 앱"], [B.evals.length, "보낸 평가"], [tags, "찾아낸 문제"]];
  $("kpis").innerHTML = k.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
}

function renderTeams() {
  const box = $("teams");
  box.innerHTML = "";
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const d = B.teams[teamId(t)] || {}, sp = B.specs[teamId(t)], m = missionOf(t);
    const used = d.gens || 0;
    const busy = d.generating && Date.now() - (d.generatingAt || 0) < 6 * 60000;
    const recv = B.evals.filter(e => e.target === t);
    let st = `<span class="st none">설계 전</span>`;
    if (sp) st = `<span class="st none">설계 중 · ${ago(sp.updatedAt)}</span>`;
    if (d.version) st = `<span class="st">${d.version}번째 앱 · ${ago(d.genAt)}</span>`;
    if (busy) st = `<span class="st busy">만드는 중…</span>`;
    if (d.published) st = d.publishedHtml ? `<span class="st pub">출판 · 평가 ${recv.length}건</span>` : `<span class="st none">출판할 앱 없음</span>`;
    const last = Math.max(sp?.updatedAt || 0, d.genAt || 0);
    const quiet = B.state.phase === "build" && (!last || Date.now() - last > 5 * 60000);
    const b = document.createElement("button");
    b.className = "tcard" + (quiet ? " quiet" : "");
    b.innerHTML = `<div class="tn"><b>${t}조</b><span>미션 ${m.id}</span></div><div class="tm">${esc(sp?.spec?.appName || m.name)}</div>
      <div class="pips">${Array.from({ length: GEN_LIMIT }, (_, i) => `<i class="${i < used ? "u" : ""}"></i>`).join("")}</div>${st}`;
    b.onclick = () => openDetail(t);
    box.appendChild(b);
  }
}

function renderClass() {
  const tags = B.evals.flatMap(e => e.tags || []);
  const byH = HEURISTICS.map(h => { const ts = tags.filter(t => t.h === h.n); return { h, n: ts.length, sev: ts.length ? avg(ts.map(t => t.sev)) : 0 }; });
  const max = Math.max(1, ...byH.map(x => x.n));
  $("classBars").innerHTML = byH.map(x =>
    `<div class="hbar"><span class="hl"><b>${x.h.n}</b> ${esc(x.h.ko)}</span><span class="track"><span class="fill sv${Math.round(x.sev)}" style="width:${x.n / max * 100}%"></span></span><span class="hn">${x.n || ""}</span></div>`).join("");

  // 평가자를 합칠수록 — 앱마다 「짚인 원칙 종류」 를 평가자 1명 / 한 조 / 모든 평가자로 세어 평균
  const targets = [...new Set(B.evals.map(e => e.target))];
  const one = [], team = [], all = [];
  targets.forEach(tg => {
    const es = B.evals.filter(e => e.target === tg);
    const set = list => new Set(list.flatMap(e => (e.tags || []).map(t => t.h))).size;
    es.forEach(e => one.push(set([e])));
    [...new Set(es.map(e => e.team))].forEach(tm => team.push(set(es.filter(e => e.team === tm))));
    all.push(set(es));
  });
  const rows = [["평가자 한 명", avg(one)], ["한 조를 합치면", avg(team)], ["모든 평가자를 합치면", avg(all)]];
  const cmax = Math.max(1, ...rows.map(r => r[1] || 0));
  $("curve").innerHTML = targets.length ? `<div class="curve">${rows.map(([l, v]) =>
    `<div class="crow"><span>${l}</span><span class="track"><span class="fill" style="width:${(v || 0) / cmax * 100}%"></span></span><b>${v ? v.toFixed(1) : "-"}</b></div>`).join("")}</div>`
    : `<p class="muted">평가가 들어오면 채워집니다</p>`;

  const pts = [], labels = [];
  targets.sort((a, b) => a - b).forEach(tg => {
    const es = B.evals.filter(e => e.target === tg);
    const p = avg(es.map(e => e.pq)), h = avg(es.map(e => e.hq));
    if (p && h) { pts.push([p, h]); labels.push(tg); }
  });
  $("classQuad").innerHTML = quad(pts, null, null, labels);
}

function openDetail(t) {
  const d = B.teams[teamId(t)] || {}, sp = B.specs[teamId(t)];
  const html = d.publishedHtml || d.html;
  const spec = d.publishedSpec || d.spec || sp?.spec;
  $("dTitle").textContent = `${t}조 — ${spec?.appName || missionOf(t).name}`;
  $("dFrame").srcdoc = wrapApp(html);
  $("dMission").innerHTML = (() => { const m = missionOf(t); return `<p class="mno">미션 ${m.id}</p><h2>${esc(m.name)}</h2><dl><dt>누가</dt><dd>${esc(m.who)}</dd><dt>언제</dt><dd>${esc(m.when)}</dd><dt>무엇을</dt><dd>${esc(m.goal)}</dd></dl>`; })();
  $("dVer").textContent = d.published ? `출판본 · ${d.publishedVersion || 0}번째` : d.version ? `${d.version}번째로 만든 앱의 설계서` : "아직 만들지 않은 초안";
  $("dSpec").innerHTML = spec ? (spec.scenes || []).map((s, i) => (s.see || s.do || s.react)
    ? `<div class="sc"><b>장면 ${i + 1}</b><p>보이는 것 — ${esc(s.see || "(적지 않음)")}</p><p>하는 일 — ${esc(s.do || "(적지 않음)")}</p><p>반응 — ${esc(s.react || "(적지 않음)")}</p></div>` : "").join("")
    + `<p class="muted">꾸밈 — ${esc(spec.style || "(적지 않음)")}</p>` : `<p class="muted">없음</p>`;
  const tags = B.evals.filter(e => e.target === t).flatMap(e => (e.tags || []).map(x => ({ ...x, by: `${e.team}조 ${e.name}` })));
  $("dTags").innerHTML = tags.sort((a, b) => b.sev - a.sev).map(x =>
    `<li><span class="hnum">${x.h}</span><span class="sev s${x.sev}">${x.sev}</span><span>${esc(x.where ? x.where + " — " : "")}${esc(x.note)} <small>${esc(x.by)}</small></span></li>`).join("") || `<li class="muted">없음</li>`;
  $("detail").showModal();
}
$("dClose").onclick = () => $("detail").close();

/* ── 연결 ───────────────────────────────────────────── */
await ready();
watchState(st => {
  B.state = st;
  $("phaseChip").textContent = PHASES[st.phase] || "준비";
  $("phaseChip").dataset.p = st.phase || "ready";
  document.querySelectorAll(".step[data-phase]").forEach(b => b.classList.toggle("on", b.dataset.phase === (st.phase || "ready")));
  renderTeams();
});
watchTeams(all => { B.teams = all; renderAll(); });
watchSpecs(all => { B.specs = all; renderAll(); });
watchEvals(list => { B.evals = list; renderAll(); });
renderAll();
