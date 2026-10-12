// 신기술 인터페이스 체험 실습 — 학생 화면. 단계(교수 현황판이 넘김)에 따라 보이는 화면이 바뀐다.
//   안내 → 1차 체험(조 유형별 조건) → 확인 과제 → 2차 체험 · 설계 → 결과 공개 → 조별 의견 → 종료
import { TEAM_COUNT, PHASES, TYPES, STATIONS, GUIDES, MANUALS, QUIZ, EFFICACY, LIKERT, OPINION, NATIONAL, NATIONAL_AI,
         teamId, teamLabel, typeOf, access, score } from "./data.js";
import { me, ready, watchState, watchPeople, watchHomes, watchOpinions, savePerson, saveOpinion } from "./fb.js";
import { mountEmo } from "./emo.js";
import { mountHome } from "./home.js";
import { mountAgent } from "./agent.js";
import { tallyTypes, barsHTML, RESULT_ROWS } from "./stats.js";
import { download as downloadReport } from "./report.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem("newtech." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("newtech." + k, v); } catch { /* 저장 못 해도 진행 */ } },
};
const S = { phase: null, team: Number(store.get("team")) || null, name: store.get("name") || "",
            people: {}, homes: {}, opinions: {}, st: store.get("st") || "emo", mounted: null, mountKey: "" };
const QP = new URLSearchParams(location.search);
if (Number(QP.get("team")) >= 1 && Number(QP.get("team")) <= TEAM_COUNT) {
  S.team = Number(QP.get("team"));
  if (QP.get("name")) S.name = QP.get("name").slice(0, 20);
}
const type = () => typeOf(S.team);
const mine = () => S.people[me.uid] || {};
const round = () => S.phase === "r2" ? "r2" : "r1";

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
const VIEWS = { join: "vJoin", ready: "vReady", r1: "vExp", check: "vCheck", r2: "vExp", reveal: "vReveal", opinion: "vOpinion", end: "vEnd" };
function show(v) { Object.values(VIEWS).forEach(id => $(id).hidden = true); $(VIEWS[v]).hidden = false; }

let started = false;
async function start() {
  await ready();
  if (!S.team || !S.name) { show("join"); renderJoin(); return; }
  if (started) return;
  started = true;
  $("teamChip").hidden = false;
  $("teamChip").textContent = `${teamLabel(S.team)} · ${S.name}`;
  $("teamChip").title = "조 변경";
  $("teamChip").onclick = () => { if (confirm("조를 변경하시겠습니까?")) { store.set("team", ""); location.reload(); } };
  savePerson({ team: S.team, name: S.name, type: type() }).catch(e => console.error(e));
  renderIntro();
  watchPeople(all => { S.people = all; renderHelp(); renderCheck(); if (S.phase === "reveal") renderReveal(); });
  watchHomes(all => { S.homes = all; });
  watchOpinions(all => { S.opinions = all; renderOpinion(); });
  watchState(st => setPhase(st.phase || "ready"));
}
function setPhase(p) {
  const changed = p !== S.phase;
  if (changed) flushTime();   // 지난 단계의 시간을 지난 단계에 더한다
  S.phase = p;
  $("phaseChip").textContent = PHASES[p] || p;
  $("phaseChip").dataset.p = p;
  if (!changed) return;
  show(p);
  if (p === "r1" || p === "r2") renderExp(); else unmount();
  if (p === "check") renderCheck(true);
  if (p === "reveal") renderReveal();
  if (p === "opinion") renderOpinion(true);
}

function renderIntro() {
  $("introStations").innerHTML = STATIONS.map(s => `<div class="stcard"><b>${esc(s.ko)}</b><span>${esc(s.sub)}</span></div>`).join("");
}

/* ── 체험 ───────────────────────────────────────────── */
function renderExp() {
  const A = access(S.phase, type());
  $("expTitle").textContent = S.phase === "r2" ? "2차 체험 · 설계" : "1차 체험";
  // 1차 체험에서는 조건을 글로 알려 주지 않는다 — 유형은 결과 공개 때 밝힌다
  $("expCond").innerHTML = S.phase === "r2"
    ? "모든 조 같은 조건 · 단계별 안내 제공 · 연결화 탭에서 <b>우리 집 자동화 규칙 설계</b>"
    : "세 가지 기술 체험 · 순서 자유";
  $("tabs").innerHTML = STATIONS.map(s => `<button type="button" class="tab${S.st === s.id ? " on" : ""}" data-st="${s.id}"><b>${esc(s.ko)}</b><small>${esc(s.sub)}</small></button>`).join("");
  $("tabs").querySelectorAll(".tab").forEach(b => b.onclick = () => { S.st = b.dataset.st; store.set("st", S.st); renderExp(); });
  $("expGrid").classList.toggle("noguide", !A.guide);
  $("guideBox").innerHTML = A.guide ? `<h3>단계별 안내</h3><ol class="gsteps">${GUIDES[S.st].map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol>` : "";
  renderHelp();
  const key = `${S.phase}:${S.st}:${A.demo}:${A.design}`;
  if (key === S.mountKey) return;
  unmount();
  S.mountKey = key;
  const box = $("stBox");
  if (!A.demo) {
    box.innerHTML = `<div class="manual"><h3>${esc(STATIONS.find(s => s.id === S.st).ko)} — 설명서</h3>${MANUALS[S.st].map(p => `<p>${esc(p)}</p>`).join("")}
      </div>`;
    return;
  }
  const rd = round();
  if (S.st === "emo") S.mounted = mountEmo(box, { onFeedback: match => {
    const e = mine().emo || {};
    savePerson({ emo: { [match ? "match" : "mismatch"]: (e[match ? "match" : "mismatch"] || 0) + 1 } });
  } });
  if (S.st === "home") S.mounted = mountHome(box, { team: S.team, name: S.name, design: A.design, onEvent: () => {
    const h = mine().homeEv || {};
    savePerson({ homeEv: { [rd]: (h[rd] || 0) + 1 } });
  } });
  if (S.st === "agent") S.mounted = mountAgent(box, { onRecord: rec => savePerson({ agent: { [rd]: rec } }) });
}
function unmount() { S.mounted?.stop?.(); S.mounted = null; S.mountKey = ""; }

$("helpBtn").onclick = () => {
  const rd = round(), h = mine().help || {};
  savePerson({ help: { [rd]: (h[rd] || 0) + 1 } });
};
function renderHelp() {
  const h = mine().help || {};
  $("helpCount").textContent = `이번 체험 ${h[round()] || 0}회`;
}

/* 체험 시간 — 보고 있는 탭에 15초마다 더한다 */
let tick = { at: Date.now(), acc: {} };
function flushTime() {
  const rd = S.phase === "r1" || S.phase === "r2" ? S.phase : null;
  const now = Date.now();
  if (rd && document.visibilityState === "visible") {
    const k = access(rd, type()).demo ? S.st : "manual";
    tick.acc[rd] ||= {};
    tick.acc[rd][k] = (tick.acc[rd][k] || 0) + Math.min(60, (now - tick.at) / 1000);
  }
  tick.at = now;
}
setInterval(() => {
  flushTime();
  const rd = S.phase;
  if ((rd === "r1" || rd === "r2") && tick.acc[rd]) {
    const prev = mine().t?.[rd] || {};
    const merged = { ...prev };
    for (const [k, v] of Object.entries(tick.acc[rd])) merged[k] = Math.round((prev[k] || 0) + v);
    tick.acc[rd] = {};
    savePerson({ t: { [rd]: merged } }).catch(() => { });
  }
}, 15000);
document.addEventListener("visibilitychange", flushTime);

/* ── 확인 과제 ───────────────────────────────────────── */
function renderCheck(force) {
  if (S.phase !== "check") return;
  const done = !!mine().quiz;
  $("quizForm").hidden = done;
  $("quizDone").hidden = !done;
  if (done || (!force && $("quizItems").childElementCount)) return;
  $("quizItems").innerHTML = QUIZ.map((q, i) => `<fieldset class="qitem"><legend><span class="qno">${i + 1}</span> ${esc(q.q)}</legend>
    ${q.opts.map((o, j) => `<label><input type="radio" name="${q.id}" value="${j}" required> ${esc(o)}</label>`).join("")}</fieldset>`).join("");
  $("effItems").innerHTML = EFFICACY.map(e => `<fieldset class="likert"><legend>${esc(e.q)}</legend>
    ${LIKERT.map((l, j) => `<label><input type="radio" name="eff_${e.id}" value="${j + 1}" required><span>${j + 1}</span><small>${l}</small></label>`).join("")}</fieldset>`).join("");
}
$("quizForm").onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData($("quizForm"));
  const answers = Object.fromEntries(QUIZ.map(q => [q.id, Number(fd.get(q.id))]));
  const eff = Object.fromEntries(EFFICACY.map(x => [x.id, Number(fd.get("eff_" + x.id))]));
  $("quizSubmit").disabled = true;
  $("quizMsg").textContent = "제출하는 중…";
  try {
    await savePerson({ quiz: { answers, eff, free: String(fd.get("free") || "").slice(0, 400), at: Date.now() } });
    $("quizMsg").textContent = "";
  } catch (err) {
    console.error(err);
    $("quizSubmit").disabled = false;
    $("quizMsg").textContent = "제출 실패 — 확인 과제 단계인지 확인 후 다시";
  }
};

/* ── 결과 공개 ───────────────────────────────────────── */
function renderReveal() {
  if (S.phase !== "reveal") return;
  const t = tallyTypes(S.people);
  const my = TYPES[type()];
  const q = mine().quiz;
  const sc = q ? score(q.answers) : null;
  const emoN = t.emo.match + t.emo.mismatch;
  $("revealBox").innerHTML = `
    <h2>1차 체험의 조건</h2>
    <div class="typecards">${Object.entries(TYPES).map(([k, v]) => `<div class="typecard${k === type() ? " mine" : ""}" style="--tc:${v.color}">
      <b>${v.ko} · ${esc(v.name)}</b><span>${esc(v.desc)}</span><em>${esc(v.level)}</em>${k === type() ? `<i>우리 조</i>` : ""}</div>`).join("")}</div>
    <p class="lead">우리 조: <b>${my.ko} · ${esc(my.name)}</b>${sc ? ` · 내 점수 ${sc.total} / ${QUIZ.length} (개념 ${sc.개념}/${sc.n개념} · 체험 ${sc.체험}/${sc.n체험})` : ""}</p>
    <div class="revgrid">
      <div><h3>유형별 결과 <small>반 전체</small></h3>${barsHTML(t, RESULT_ROWS)}</div>
      <div>
        <h3>세 단계로 읽기</h3>
        <ol class="levels">
          <li><b>1단계 · 접근</b> 다 유형 — 기기가 없으면 체험 문항을 풀 수 없음</li>
          <li><b>2단계 · 활용</b> 나 유형 — 기기가 있어도 안내가 없으면 놓치는 것이 생김</li>
          <li><b>3단계 · 결과</b> 같은 수업 · 같은 시간인데 확인 과제 점수와 「설명할 수 있다」가 달라짐</li>
          <li><b>따뜻한 전문가</b> 도움 요청이 차이를 얼마나 줄였는가</li>
        </ol>
        <h3>표정 판정과 실제 기분</h3>
        <p>반 전체 ${emoN}회 비교 중 <b>「다름」 ${emoN ? Math.round(t.emo.mismatch / emoN * 100) : 0}%</b> — 표정과 감정의 대응 문제 (Barrett et al., 2019)</p>
        <h3>국내 디지털정보격차 <small>취약계층 수준 · 일반 국민 = 100 · 2025 실태조사</small></h3>
        ${NATIONAL.map(n => `<div class="nb"><span>${n.ko}</span><i><u style="width:${n.v}%"></u></i><em>${n.v}</em></div>`).join("")}
        <p class="small">AI 서비스 이용 경험률 — 일반 국민 ${NATIONAL_AI.all}% · 취약계층 ${NATIONAL_AI.vuln}%</p>
      </div>
    </div>`;
}

/* ── 조별 의견 ───────────────────────────────────────── */
let opTimer = null, opDirty = false;
function renderOpinion(force) {
  if (S.phase !== "opinion") return;
  const op = S.opinions[teamId(S.team)] || {};
  if (force || !$("opItems").childElementCount) {
    $("opItems").innerHTML = OPINION.map((o, i) => `<label class="field"><span><b>${i + 1}.</b> ${esc(o.q)}</span><textarea name="${o.id}" rows="4" maxlength="800">${esc(op[o.id] || "")}</textarea></label>`).join("");
    return;
  }
  if (opDirty) return;
  OPINION.forEach(o => { const ta = $("opItems").querySelector(`[name="${o.id}"]`); if (ta && document.activeElement !== ta && ta.value !== (op[o.id] || "")) ta.value = op[o.id] || ""; });
}
$("opForm").oninput = e => {
  if (!e.target.name) return;
  opDirty = true;
  $("opSaved").textContent = "저장하는 중…";
  clearTimeout(opTimer);
  const name = e.target.name, val = e.target.value.slice(0, 800);
  opTimer = setTimeout(async () => {
    try { await saveOpinion(S.team, { [name]: val }); $("opSaved").textContent = "저장됨"; }
    catch (err) { console.error(err); $("opSaved").textContent = "저장 실패 — 조별 의견 단계인지 확인"; }
    opDirty = false;
  }, 700);
};

/* ── 실습보고서 ───────────────────────────────────────── */
$("reportBtn").onclick = () => {
  try { downloadReport({ team: S.team, name: S.name, me: mine(), people: S.people, homes: S.homes, opinions: S.opinions }); }
  catch (e) { console.error(e); alert("보고서를 만들지 못했습니다 — 새로고침 후 다시"); }
};

start();
