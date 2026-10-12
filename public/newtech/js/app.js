// 신기술 인터페이스 체험 실습 — 학생 화면. 단계(교수 현황판이 넘김)에 따라 보이는 화면이 바뀐다.
//   안내 → 1차 체험(조 유형별 조건) → 확인 과제 → 2차 체험 · 설계 → 결과 공개 → 조별 의견 → 종료
import { TEAM_COUNT, PHASES, TYPES, STATIONS, GUIDES, MISSIONS, POTIONS, QUIZ, EFFICACY, LIKERT, OPINION, NATIONAL, NATIONAL_AI, INTERVIEW, bookingCheck, familyReact,
         teamId, teamLabel, typeOf, access, score } from "./data.js";
import { me, ready, watchState, watchPeople, watchHomes, watchOpinions, watchNotes, savePerson, saveOpinion, sendNote, replyNote, interviewAI, agentAI } from "./fb.js";
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
            people: {}, homes: {}, opinions: {}, notes: {}, st: store.get("st") || "emo", mounted: null, mountKey: "" };
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
  watchPeople(all => { S.people = all; renderHelp(); renderCheck(); if (S.phase === "r1" || S.phase === "r2") renderPotion(); if (S.phase === "reveal") renderReveal(); });
  watchHomes(all => { S.homes = all; if (S.phase === "reveal") renderReveal(); });
  watchOpinions(all => { S.opinions = all; renderOpinion(); });
  watchNotes(all => { const first = !notesLoaded; notesLoaded = true; S.notes = all; renderNotes(first); if (S.phase === "reveal") renderReveal(); });
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

/* ── 미션 ───────────────────────────────────────────── */
function missionHTML(id) {
  const M = MISSIONS[id];
  const list = (h, a) => a?.length ? `<h4>${h}</h4><ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const chat = M.chat ? `<h4>가족 대화방 「할머니 팔순」</h4><div class="famchat" oncopy="return false" oncut="return false" oncontextmenu="return false">${M.chat.map(([w, t]) => `<div class="fc"><b>${esc(w)}</b><span>${esc(t)}</span></div>`).join("")}</div>` : "";
  return `<div class="mcard"><h3>${esc(M.title)}</h3><p>${esc(M.story)}</p>${chat}${list("조건", M.conds)}${list("꼭 지킬 것", M.keep)}${list("미션", M.goals)}${M.note ? `<p class="muted small">${esc(M.note)}</p>` : ""}</div>`;
}
function renderExp() {
  const A = access(S.phase, type());
  $("expTitle").textContent = S.phase === "r2" ? "2차 미션" : "1차 미션";
  // 1차에서는 조건을 글로 알려 주지 않는다 — 유형은 결과 공개 때 밝힌다
  $("expCond").innerHTML = S.phase === "r2" ? "모든 조 같은 조건 · 1차에서 못 한 미션부터" : "미션 세 가지 · 순서 자유";
  $("tabs").innerHTML = STATIONS.map(s => `<button type="button" class="tab${S.st === s.id ? " on" : ""}" data-st="${s.id}"><b>${esc(s.ko)}</b><small>${esc(s.sub)}</small></button>`).join("");
  $("tabs").querySelectorAll(".tab").forEach(b => b.onclick = () => { S.st = b.dataset.st; store.set("st", S.st); renderExp(); });
  $("expGrid").classList.toggle("noguide", !A.hint);
  renderPotion();
  renderHelp();
  const key = `${S.phase}:${S.st}:${A.app}`;
  if (key === S.mountKey) return;
  unmount();
  S.mountKey = key;
  const box = $("stBox");
  if (!A.app) {
    box.innerHTML = missionHTML(S.st) + `<div class="noapp"><b>이 기기에서는 앱을 열 수 없음</b>
      <p>오른쪽 위 「쪽지함」으로 다른 조에 대신 해 달라고 부탁하거나 결과를 물어볼 수 있음. 결과 보고는 모두 같은 문항으로 진행.</p></div>`;
    return;
  }
  box.innerHTML = missionHTML(S.st) + `<div class="mbox"></div>`;
  const mb = box.querySelector(".mbox");
  const rd = round();
  if (S.st === "emo") S.mounted = mountEmo(mb, { prev: mine().emo?.[rd], ai: interviewAI, onRecord: rec => savePerson({ emo: { [rd]: rec } }) });
  if (S.st === "home") S.mounted = mountHome(mb, { team: S.team, name: S.name, onCheck: pass => {
    const h = mine().homeEv?.[rd] || {};
    savePerson({ homeEv: { [rd]: { calls: (h.calls || 0) + 1, pass: !!(h.pass || pass) } } });
  } });
  if (S.st === "agent") S.mounted = mountAgent(mb, { prev: mine().agent?.[rd], ai: agentAI, onRecord: rec => savePerson({ agent: { [rd]: rec } }) });
}
/* 디지털 리터러시 물약 — 마시면 지금 미션의 다음 힌트가 팝업으로 뜬다 */
function potionState() {
  const rd = round(), p = mine().potion?.[rd] || {};
  return { rd, used: p.used || 0, got: p.got || {} };
}
function renderPotion() {
  const A = access(S.phase, type());
  if (!A.hint) { $("guideBox").innerHTML = ""; return; }
  const { used, got } = potionState(), mine_ = got[S.st] || [], left = POTIONS - used;
  const allGot = mine_.length >= GUIDES[S.st].length;
  $("guideBox").innerHTML = `<div class="potion"><div class="flask">🧪</div><b>디지털 리터러시 물약</b><span>남은 물약 ${"●".repeat(left)}${"○".repeat(used)} ${left}개</span>
      <button class="btn primary" id="drink" type="button"${left <= 0 || allGot ? " disabled" : ""}>${allGot ? "이 미션 힌트 모두 받음" : "물약 마시기"}</button>
      <small class="muted">막혔을 때 한 개씩 · 지금 미션의 힌트가 하나씩 열림</small></div>
    ${mine_.length ? `<h3>받은 힌트</h3><ol class="gsteps">${mine_.map(i => GUIDES[S.st][i]).map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol>` : ""}`;
  const btn = $("drink");
  if (btn) btn.onclick = async () => {
    const st = potionState();
    const have = st.got[S.st] || [];
    const next = GUIDES[S.st].findIndex((_, i) => !have.includes(i));
    if (next < 0 || st.used >= POTIONS) return;
    btn.disabled = true;
    try { await savePerson({ potion: { [st.rd]: { used: st.used + 1, got: { ...st.got, [S.st]: [...have, next] } } } }); }
    catch (e) { console.error(e); btn.disabled = false; return; }
    const [t, d] = GUIDES[S.st][next];
    const pop = $("potionPop");
    pop.innerHTML = `<div class="pp"><div class="flask big">🧪</div><p class="muted small">디지털 리터러시 충전!</p><h3>${esc(t)}</h3><p>${esc(d)}</p><button class="btn primary" type="button">알겠음</button></div>`;
    pop.hidden = false;
    pop.querySelector("button").onclick = () => pop.hidden = true;
  };
}

function unmount() { S.mounted?.stop?.(); S.mounted = null; S.mountKey = ""; }

$("helpBtn").onclick = () => {
  const rd = round(), h = mine().help || {};
  savePerson({ help: { [rd]: (h[rd] || 0) + 1 } });
};
function renderHelp() {
  const h = mine().help || {};
  $("helpCount").textContent = `${h[round()] || 0}회`;
}

/* ── 쪽지 — 다른 조에 묻고, 받은 쪽지에 답한다 ─────────────── */
const NOTE_MAX = 20;
let notesLoaded = false;
const seen = new Set((store.get("seen") || "").split(",").filter(Boolean));
const hm = ts => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const stKo = id => STATIONS.find(s => s.id === id)?.ko || "";
const myNotes = () => Object.entries(S.notes).filter(([, n]) => n.fromUid === me.uid).sort((a, b) => b[1].at - a[1].at);
const inbox = () => Object.entries(S.notes).filter(([, n]) => n.toTeam === S.team).sort((a, b) => b[1].at - a[1].at);

$("noteTo").innerHTML = `<option value="">조 선택</option>` + Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).filter(t => t !== S.team).map(t => `<option value="${t}">${t}조</option>`).join("");
$("noteSt").innerHTML = STATIONS.map(s => `<option value="${s.id}">${esc(s.ko)}</option>`).join("");
$("noteBtn").onclick = () => {
  $("noteTo").innerHTML = `<option value="">조 선택</option>` + Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).filter(t => t !== S.team).map(t => `<option value="${t}">${t}조</option>`).join("");
  $("noteSt").value = S.st;
  $("notes").showModal();
  inbox().forEach(([id]) => seen.add(id));
  store.set("seen", [...seen].slice(-200).join(","));
  renderNotes();
};
$("notesClose").onclick = () => $("notes").close();
$("toast").onclick = () => { $("toast").hidden = true; $("noteBtn").click(); };

$("noteForm").onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData($("noteForm"));
  const to = Number(fd.get("to")), text = String(fd.get("text") || "").trim().slice(0, 200);
  if (!to || !text) return;
  if (myNotes().length >= NOTE_MAX) { $("noteMsg").textContent = `한 사람당 ${NOTE_MAX}개까지`; return; }
  $("noteSend").disabled = true;
  try {
    await sendNote({ fromTeam: S.team, fromName: S.name, toTeam: to, st: fd.get("st"), text, phase: S.phase });
    $("noteForm").querySelector("textarea").value = "";
    $("noteMsg").textContent = `${to}조에 보냄`;
  } catch (err) { console.error(err); $("noteMsg").textContent = "보내기 실패 — 체험 단계에서만 보낼 수 있음"; }
  $("noteSend").disabled = false;
};

function renderNotes(first) {
  const sent = myNotes(), box = inbox();
  $("noteSent").innerHTML = sent.length ? sent.map(([, n]) => `<li><div class="meta">${hm(n.at)} · ${n.toTeam}조에게 · ${esc(stKo(n.st))}</div>${esc(n.text)}
    ${n.reply ? `<div class="ans"><b>${n.replyTeam}조 ${esc(n.replyName || "")}</b> ${esc(n.reply)}</div>` : `<div class="pending">답 기다리는 중</div>`}</li>`).join("")
    : `<li class="muted">보낸 쪽지 없음</li>`;
  // 답을 쓰는 중인 칸은 다시 그리지 않는다
  const typing = $("noteInbox").contains(document.activeElement) ? document.activeElement.dataset.id : null;
  const draft = typing ? document.activeElement.value : "";
  $("noteInbox").innerHTML = box.length ? box.map(([id, n]) => `<li class="${seen.has(id) || n.reply ? "" : "new"}"><div class="meta">${hm(n.at)} · ${n.fromTeam}조 ${esc(n.fromName)} · ${esc(stKo(n.st))}</div>${esc(n.text)}
    ${n.reply ? `<div class="ans"><b>${n.replyTeam}조 ${esc(n.replyName || "")}</b> ${esc(n.reply)}</div>`
      : `<textarea data-id="${id}" rows="2" maxlength="300" placeholder="답 쓰기"></textarea><button class="btn small primary" type="button" data-reply="${id}">답 보내기</button>`}</li>`).join("")
    : `<li class="muted">받은 쪽지 없음</li>`;
  if (typing) { const ta = $("noteInbox").querySelector(`textarea[data-id="${typing}"]`); if (ta) { ta.value = draft; ta.focus(); } }
  $("noteInbox").querySelectorAll("[data-reply]").forEach(b => b.onclick = async () => {
    const ta = $("noteInbox").querySelector(`textarea[data-id="${b.dataset.reply}"]`);
    const v = ta.value.trim().slice(0, 300);
    if (!v) return;
    b.disabled = true;
    try { await replyNote(b.dataset.reply, { reply: v, replyName: S.name, replyTeam: S.team }); }
    catch (err) { console.error(err); b.disabled = false; alert("답 보내기 실패 — 체험 단계에서만 가능"); }
  });
  const unanswered = box.filter(([, n]) => !n.reply).length;
  $("noteBadge").hidden = !unanswered;
  $("noteBadge").textContent = unanswered;
  // 새로 온 쪽지 · 새로 달린 답 알림 (처음 불러올 때는 알리지 않음)
  if (!first) {
    const fresh = box.find(([id, n]) => !n.reply && !seen.has(id) && !toasted.has(id));
    const answered = sent.find(([id, n]) => n.reply && !toasted.has(id + "r"));
    if (fresh) { toasted.add(fresh[0]); toast(`${fresh[1].fromTeam}조에서 쪽지 — ${fresh[1].text.slice(0, 40)}`); }
    else if (answered) { toasted.add(answered[0] + "r"); toast(`${answered[1].replyTeam}조의 답 — ${answered[1].reply.slice(0, 40)}`); }
  } else sent.filter(([, n]) => n.reply).forEach(([id]) => toasted.add(id + "r"));
}
const toasted = new Set();
let toastTimer = null;
function toast(msg) {
  if (S.phase !== "r1" && S.phase !== "r2") return;
  $("toast").textContent = msg + "  (눌러서 쪽지함 열기)";
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").hidden = true, 7000);
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
  $("quizItems").innerHTML = QUIZ.map((q, i) => `<fieldset class="qitem"><legend><span class="qno">${i + 1}</span> ${esc(q.q)}${q.multi ? " <small>여러 개</small>" : ""}</legend>
    ${q.opts.map((o, j) => `<label><input type="${q.multi ? "checkbox" : "radio"}" name="${q.id}" value="${j}"${q.multi ? "" : " required"}> ${esc(o)}</label>`).join("")}</fieldset>`).join("");
  $("effItems").innerHTML = EFFICACY.map(e => `<fieldset class="likert"><legend>${esc(e.q)}</legend>
    ${LIKERT.map((l, j) => `<label><input type="radio" name="eff_${e.id}" value="${j + 1}" required><span>${j + 1}</span><small>${l}</small></label>`).join("")}</fieldset>`).join("");
}
$("quizForm").onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData($("quizForm"));
  const answers = Object.fromEntries(QUIZ.map(q => [q.id, q.multi ? fd.getAll(q.id).map(Number) : Number(fd.get(q.id))]));
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
/* 결과 공개 때 처음 보여주는 내 면접 평가 근거 */
function ivHTML() {
  const all = ["r1", "r2"].flatMap(r => (mine().emo?.[r]?.attempts || []).map(a => ({ ...a, r })));
  if (!all.length) return "";
  const a = all.sort((x, y) => y.at - x.at)[0];
  const D = { likable: "호감도", honest: "진실성", diligent: "성실성", stable: "정서 안정성" };
  return `<h3>내 AI 면접 평가 근거 <small>마지막 응시 · ${a.r === "r1" ? "1차" : "2차"} · 종합 ${a.total}점 ${a.pass ? "합격" : "불합격"}</small></h3>
    <div class="ivwhy">${Object.entries(D).map(([k, v]) => `<div class="ebar"><span>${v}</span><i><u style="width:${a.dims?.[k] || 0}%"></u></i><em>${a.dims?.[k] ?? "—"}</em></div>`).join("")}
    <h4>면접관 판단 기록</h4><ul>${(a.events || []).map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
}
/* 결과 공개 때 처음 보여주는 모임 당일 가족 대화방 — 2차 확정이 있으면 2차, 없으면 1차 */
function famHTML() {
  const a = mine().agent?.r2?.final ? { r: "2차", b: mine().agent.r2.final } : mine().agent?.r1?.final ? { r: "1차", b: mine().agent.r1.final } : null;
  return `<h3>가족 모임 당일 — 가족 대화방 <small>${a ? `${a.r}에 확정한 예약` : "확정한 예약 없음"}</small></h3>
    <div class="famchat after">${familyReact(a?.b).map(([w, t]) => `<div class="fc"><b>${esc(w)}</b><span>${esc(t)}</span></div>`).join("")}</div>`;
}
function renderReveal() {
  if (S.phase !== "reveal") return;
  const t = tallyTypes(S.people, S.notes, S.homes);
  const my = TYPES[type()];
  $("revealBox").innerHTML = `
    <h2>1차 미션의 조건</h2>
    <div class="typecards">${Object.entries(TYPES).map(([k, v]) => `<div class="typecard${k === type() ? " mine" : ""}" style="--tc:${v.color}">
      <b>${v.ko} · ${esc(v.name)}</b><span>${esc(v.desc)}</span><em>${esc(v.level)}</em>${k === type() ? `<i>우리 조</i>` : ""}</div>`).join("")}</div>
    ${ivHTML()}
    ${famHTML()}
    <h3>미션에 쓰인 기술</h3>
    <div class="techcards">${STATIONS.map(s => `<div><b>${esc(s.ko)}</b> → ${esc(s.tech)}</div>`).join("")}</div>
    <div class="revgrid">
      <div><h3>유형별 결과 <small>반 전체 · 1차</small></h3>${barsHTML(t, RESULT_ROWS)}</div>
      <div>
        <h3>세 단계로 읽기</h3>
        <ol class="levels">
          <li><b>1단계 · 접근</b> 다 유형 — 앱이 없으면 미션 자체를 할 수 없고, 남에게 부탁해야 함</li>
          <li><b>2단계 · 활용</b> 나 유형 — 앱이 있어도 숨은 원인을 찾는 방법을 모르면 실패</li>
          <li><b>3단계 · 결과</b> 같은 수업 · 같은 시간인데 합격 · 해결 · 예약 결과가 달라짐</li>
          <li><b>따뜻한 전문가</b> 쪽지로 물어본 조는 답을 얼마나 받았고, 그 답이 결과를 얼마나 바꿨는가</li>
        </ol>
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
  try { downloadReport({ team: S.team, name: S.name, me: mine(), people: S.people, homes: S.homes, opinions: S.opinions, notes: S.notes, uid: me.uid }); }
  catch (e) { console.error(e); alert("보고서를 만들지 못했습니다 — 새로고침 후 다시"); }
};

start();
