// 아바타 신뢰 게임 — 교수 현황판. 암호를 붙여 함수(api/trust.js)를 2.5초마다 읽는다.
// ?demo — 가짜 학생 24명으로 판을 돌려 본다 (파이어베이스를 건드리지 않음)
import { CONDS, CUE_GROUPS, MISSIONS, PHASE_LABEL, summarize, matchRound, pairId, settle, CUE_IDS, REFLECT } from "./game.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const f1 = v => (v === null || v === undefined ? "–" : v.toFixed(1));
const pct = v => (v === null || v === undefined ? "–" : Math.round(v * 100) + "%");
const API = location.hostname.endsWith(".vercel.app") ? "/api/trust" : "https://retro-app-six.vercel.app/api/trust";
const isDemo = new URLSearchParams(location.search).has("demo");
const PLAN = { 1: "text", 2: "both", 3: "cue" };     // 판마다 기본 조건

let code = "";
try { code = sessionStorage.getItem("hci11code") || ""; } catch { /* 저장 불가 */ }
let data = null, lastRound = -1, autoFired = 0, busy = false;

$("#cond").innerHTML = Object.entries(CONDS).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join("");

/* ── 함수 호출 ── */
let call = async (op, extra = {}) => {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", code, op, ...extra }) });
  let d = {};
  try { d = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(d.error || `서버 응답 ${r.status}`);
  return d;
};
if (isDemo) call = demoCall();

async function unlock() {
  code = $("#code").value || code;
  $("#lockMsg").textContent = "확인하는 중…";
  try {
    await call("check");
    try { sessionStorage.setItem("hci11code", code); } catch { /* 저장 불가 */ }
    $("#lock").hidden = true; $("#tools").hidden = false;
    poll(); setInterval(poll, 2500);
  } catch (e) { $("#lockMsg").textContent = e.message; }
}
$("#unlock").onclick = unlock;
$("#code").onkeydown = e => { if (e.key === "Enter") unlock(); };
if (code || isDemo) unlock();

async function poll() {
  try { data = await call("list"); render(); }
  catch (e) { $("#toolMsg").textContent = "읽기 실패 — " + e.message; }
}

async function act(op, extra, confirmText) {
  if (busy) return;
  if (confirmText && !confirm(confirmText)) return;
  busy = true; $("#toolMsg").textContent = "처리하는 중…";
  try {
    const r = await call(op, extra);
    $("#toolMsg").textContent = op === "next" ? `${r.round}판 시작 · 짝 ${r.pairs}개${r.rest ? " · 한 명 쉼" : ""}` : "완료";
    await poll();
  } catch (e) { $("#toolMsg").textContent = e.message; }
  busy = false;
}
$("#next").onclick = () => act("next", { cond: $("#cond").value, talkSec: Number($("#talkSec").value) || 120, missions: $("#missions").checked });
$("#decide").onclick = () => act("decide");
$("#reveal").onclick = () => act("reveal");
$("#end").onclick = () => act("end");
$("#reset").onclick = () => act("reset", {}, "판 기록과 점수를 모두 지웁니다. 입장한 학생은 그대로 남습니다. 계속할까요?");
$("#wipe").onclick = () => act("reset", { all: true }, "입장한 학생까지 모두 지웁니다. 학생들이 다시 입장해야 합니다. 계속할까요?");
$("#detail").onchange = () => render();

setInterval(() => {
  const st = data?.state;
  if (!st) return;
  const el = $("#timer");
  if (el && st.phase === "talk") {
    const left = Math.max(0, Math.round((st.endsAt - Date.now()) / 1000));
    el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    el.classList.toggle("low", left <= 15);
    if (left === 0 && $("#auto").checked && autoFired !== st.round) { autoFired = st.round; act("decide"); }
  }
}, 500);

/* ── 그리기 ── */
function render() {
  const { state: st, people, pairs } = data;
  const detail = $("#detail").checked;
  const byUid = Object.fromEntries(people.map(p => [p.uid, p]));
  const who = uid => detail ? esc(byUid[uid]?.name || "?") : "";
  if (st.round !== lastRound) {
    lastRound = st.round;
    $("#cond").value = PLAN[(st.round || 0) + 1] || "both";
  }
  const ph = st.phase === "revealing" ? "decide" : st.phase;
  $("#status").innerHTML = (st.round ? `<span class="chip">${st.round}판 · ${esc(CONDS[st.cond]?.label || "")}</span>` : "")
    + `<span class="chip on">${PHASE_LABEL[ph] || "대기"}</span>` + (st.phase === "talk" ? `<span class="timer" id="timer"></span>` : "");

  const online = people.filter(p => p.online).length;
  const cur = pairs.filter(p => p.round === st.round);
  const invDone = cur.filter(p => p.invDone).length, truDone = cur.filter(p => p.truDone).length;
  $("#kpis").innerHTML = [
    [online, `접속 중 (입장 ${people.length}명)`],
    [st.round || 0, "진행한 판"],
    [cur.length ? `${invDone}/${cur.length}` : "–", "투자자 결정"],
    [cur.length ? `${truDone}/${cur.length}` : "–", "수탁자 비율"],
  ].map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join("");

  // 이번 판 짝
  $("#now").innerHTML = `<h3>이번 판 짝 <span class="muted">${cur.length ? "" : "아직 판을 시작하지 않았습니다"}</span></h3>
    <div class="pairs">${cur.map(p => `<div class="pc">
      <b>${p.id.split("_")[1]}${detail && p.mission ? ` · ${MISSIONS[p.mission].label}` : ""}</b>
      투자 ${esc(p.invNick)} ${who(p.inv)}<br>수탁 ${esc(p.truNick)} ${who(p.tru)}
      <div class="st"><span class="${p.invDone ? "done" : "wait"}">투자 ${p.invDone ? "✓" : "…"}</span><span class="${p.truDone ? "done" : "wait"}">비율 ${p.truDone ? "✓" : "…"}</span>
      <span class="${p.invRated && p.truRated ? "done" : "wait"}">문항 ${(p.invRated ? 1 : 0) + (p.truRated ? 1 : 0)}/2</span></div>
    </div>`).join("")}</div>`;

  const S = summarize(pairs);
  const conds = Object.keys(CONDS).filter(c => S.byCond[c]);
  $("#cond-panel").innerHTML = `<h3>조건별 평균</h3>${conds.length ? `<div class="tablewrap"><table class="t">
    <tr><th>조건</th><th>짝</th><th>보낸 돈</th><th>반환율</th><th>함께 있음</th><th>신뢰</th></tr>
    ${conds.map(c => { const v = S.byCond[c]; return `<tr><td>${CONDS[c].label}</td><td>${v.n}</td><td>${f1(v.send)}</td><td>${v.retPct === null ? "–" : Math.round(v.retPct) + "%"}</td><td>${f1(v.presence)}</td><td>${f1(v.trust)}</td></tr>`; }).join("")}
    </table></div>
    <div class="bars">${conds.map(c => bar(CONDS[c].label, S.byCond[c].send, 10, f1(S.byCond[c].send))).join("")}</div>
    <p class="hint">보낸 돈 0~10점 · 함께 있음과 신뢰 1~7점. 함께 있음은 두 사람 평균, 신뢰는 투자자의 답. 막대는 평균 보낸 돈.</p>` : `<p class="muted">공개한 판이 아직 없습니다.</p>`}`;

  $("#hit-panel").innerHTML = `<h3>상대의 비밀 역할을 맞힌 비율</h3>${conds.some(c => S.byCond[c].guessedN) ? `
    <div class="bars">${conds.filter(c => S.byCond[c].guessedN).map(c => bar(CONDS[c].label, S.byCond[c].hit, 1, pct(S.byCond[c].hit), "warm") + `<p class="hint" style="margin:-4px 0 0 138px">${S.byCond[c].guessedN}명이 짐작</p>`).join("")}</div>
    <p class="hint">50%면 동전 던지기와 같습니다.</p>` : `<p class="muted">비밀 역할을 켠 판을 공개하면 나타납니다.</p>`}`;

  const ms = Object.keys(MISSIONS).filter(m => S.byMission[m]);
  $("#mission-panel").innerHTML = `<h3>비밀 역할별</h3>${ms.length ? `<table class="t">
    <tr><th></th>${ms.map(m => `<th>${MISSIONS[m].label} (${S.byMission[m].n})</th>`).join("")}</tr>
    <tr><td>상대가 보낸 돈</td>${ms.map(m => `<td>${f1(S.byMission[m].send)}</td>`).join("")}</tr>
    <tr><td>실제 반환율</td>${ms.map(m => `<td>${S.byMission[m].retPct === null ? "–" : Math.round(S.byMission[m].retPct) + "%"}</td>`).join("")}</tr>
    <tr><td>상대가 느낀 신뢰</td>${ms.map(m => `<td>${f1(S.byMission[m].trust)}</td>`).join("")}</tr>
    <tr><td>단서 총 횟수 (단서 판)</td>${ms.map(m => `<td>${f1(S.byMission[m].cueTotal)}</td>`).join("")}</tr>
    <tr><td>채팅 수 (채팅 판)</td>${ms.map(m => `<td>${f1(S.byMission[m].textTotal)}</td>`).join("")}</tr>
  </table><p class="hint">수탁자 기준. 배신 역할이 더 많이 받고도 신뢰를 얻었다면 제안 1이 말하는 상황입니다.</p>` : `<p class="muted">공개한 판이 아직 없습니다.</p>`}`;

  const cueMs = ms.filter(m => S.byMission[m].cueN);
  $("#cue-panel").innerHTML = `<h3>수탁자가 쓴 단서 <span class="muted">한 판 평균 횟수</span></h3>${cueMs.length ? `<div class="tablewrap"><table class="t">
    <tr><th>단서</th>${cueMs.map(m => `<th>${MISSIONS[m].label}</th>`).join("")}</tr>
    ${CUE_GROUPS.map(g => g.cues.map((c, i) => `<tr><td>${i ? "" : `<span class="muted">${g.label}</span> `}${c.label}</td>${cueMs.map(m => {
      const v = S.byMission[m].cues[c.id], other = cueMs.find(x => x !== m), o = other ? S.byMission[other].cues[c.id] : null;
      return `<td class="${o !== null && v > o + 0.3 ? "ok" : ""}">${f1(v)}</td>`;
    }).join("")}</tr>`).join("")).join("")}
  </table></div>` : `<p class="muted">아바타 단서가 있는 판을 공개하면 나타납니다.</p>`}`;

  drawReflect(people, detail);
  const ranked = people.slice().sort((a, b) => b.score - a.score);
  $("#rank-panel").innerHTML = `<h3>점수 ${detail ? "" : `<span class="muted">이름은 「이름 · 비밀 역할 보기」를 켜면 보입니다</span>`}</h3>
    ${detail ? `<div class="tablewrap"><table class="t"><tr><th>순위</th><th>학번</th><th>이름</th><th>닉네임</th><th>점수</th><th>수탁자</th><th>쉼</th><th>접속</th></tr>
    ${ranked.map((p, i) => `<tr><td>${i + 1}</td><td class="l">${esc(p.sid)}</td><td class="l">${esc(p.name)}</td><td class="l">${esc(p.nick)}</td><td>${p.score}</td><td>${p.trusteeN}</td><td>${p.restN}</td><td>${p.online ? `<span class="ok">●</span>` : `<span class="no">○</span>`}</td></tr>`).join("")}</table></div>`
    : `<p class="muted">최고 점수 ${ranked[0]?.score ?? 0}점 · 평균 ${people.length ? f1(people.reduce((s, p) => s + p.score, 0) / people.length) : "–"}점</p>`}`;
}

function drawReflect(people, detail) {
  const done = people.filter(p => p.reflect).sort((a, b) => (b.reflect.at || 0) - (a.reflect.at || 0));
  $("#reflect-panel").innerHTML = `<h3>나의 생각 <span class="muted">${done.length}/${people.length}명 저장 · 이름은 「이름 · 비밀 역할 보기」를 켜면 보입니다</span></h3>
    ${done.length ? done.map(p => `<div class="rf"><b>${esc(p.nick || "")}${detail ? ` · ${esc(p.name)} (${esc(p.sid)})` : ""}</b>
      ${REFLECT.map((r, i) => `<p><i>문제</i>${esc(p.reflect[r.id])}</p>`.replace("<i>문제</i>", `<i>${i ? "해결" : "문제"}</i>`)).join("")}</div>`).join("")
      : `<p class="muted">게임이 끝나면 학생들이 적은 생각이 여기에 나타납니다.</p>`}`;
}

function bar(label, v, max, text, cls = "") {
  const w = v === null || v === undefined ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="bar"><span>${esc(label)}</span><div class="track"><div class="fill ${cls}" style="width:${w}%"></div></div><b>${text}</b></div>`;
}

/* ── 미리보기: 가짜 학생 24명. 배신 역할은 웃기 · 끄덕이기를 더 많이 쓰게 해 둔다 ── */
function demoCall() {
  const people = Array.from({ length: 24 }, (_, i) => ({ uid: "u" + i, sid: "2026" + String(10000 + i), name: "학생" + (i + 1), nick: "닉" + (i + 1), reflect: i < 3 ? { a1: "웃기 버튼만 누르면 믿을 만해 보여서 속기 쉽다.", a2: "단서를 직접 눌렀는지 표정 추적인지 표시해 준다.", at: Date.now() - i * 1000 } : null, score: 0, trusteeN: 0, restN: 0, partners: [], online: true }));
  let st = { phase: "lobby", round: 0 };
  const pairs = [], moves = {};
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  return async (op, x = {}) => {
    const byUid = Object.fromEntries(people.map(p => [p.uid, p]));
    if (op === "check") return { ok: true };
    if (op === "next") {
      if (st.phase === "talk" || st.phase === "decide") throw new Error("지금 판을 먼저 공개해 주세요");
      const round = st.round + 1, m = matchRound(people, { missions: x.missions !== false }), nk = m.pairs.flatMap(p => [byUid[p.inv].nick, byUid[p.tru].nick]);
      m.pairs.forEach((p, i) => {
        const id = pairId(round, i);
        pairs.push({ id, round, cond: x.cond, inv: p.inv, tru: p.tru, invNick: nk[i * 2], truNick: nk[i * 2 + 1], mission: p.mission, result: null });
        const bad = p.mission === "betray";
        moves[id] = { inv: { send: R(3, 10), predict: R(30, 70), guess: Math.random() < 0.55 ? (bad ? "betray" : "honest") : (bad ? "honest" : "betray"), presence: R(x.cond === "text" ? 2 : 4, x.cond === "text" ? 5 : 7), trust: R(3, 7) },
                      tru: { ret: bad ? R(0, 20) : R(40, 70), presence: R(3, 6), trust: R(3, 6) } };
        byUid[p.tru].trusteeN++; byUid[p.inv].partners.push(p.tru); byUid[p.tru].partners.push(p.inv);
      });
      if (m.rest) byUid[m.rest].restN++;
      st = { phase: "talk", round, cond: x.cond, talkSec: x.talkSec, endsAt: Date.now() + x.talkSec * 1000 };
      return { ok: true, round, pairs: m.pairs.length, rest: !!m.rest };
    }
    if (op === "decide") { if (st.phase !== "talk") throw new Error("대화 단계가 아닙니다"); st = { ...st, phase: "decide" }; return { ok: true }; }
    if (op === "reveal") {
      if (st.phase !== "decide") throw new Error("결정 단계가 아닙니다");
      for (const p of pairs.filter(p => p.round === st.round)) {
        const cue = CONDS[p.cond].cue, text = CONDS[p.cond].text, bad = p.mission === "betray", msgs = [];
        if (cue) for (const id of CUE_IDS) for (let k = R(0, (bad && ["smile", "nod", "gaze_on", "wave"].includes(id)) ? 5 : 2); k > 0; k--) msgs.push({ by: p.tru, kind: "cue", cue: id });
        if (text) for (let k = R(2, bad ? 9 : 6); k > 0; k--) msgs.push({ by: p.tru, kind: "text" });
        p.result = settle(p, moves[p.id], msgs);
        byUid[p.inv].score += p.result.inv; byUid[p.tru].score += p.result.tru;
      }
      st = { ...st, phase: "reveal" }; return { ok: true };
    }
    if (op === "end") { st = { ...st, phase: "end" }; return { ok: true }; }
    if (op === "reset") { pairs.length = 0; people.forEach(p => Object.assign(p, { score: 0, trusteeN: 0, restN: 0, partners: [] })); st = { phase: "lobby", round: 0 }; return { ok: true }; }
    if (op === "list") {
      const cur = st.round;
      return {
        state: st, now: Date.now(), people: people.map(p => ({ ...p })),
        pairs: pairs.map(p => ({ ...p, invDone: p.round < cur || st.phase !== "talk" || Math.random() < 0.5, truDone: true, invRated: p.round < cur || st.phase === "reveal", truRated: p.round < cur || st.phase === "reveal" })),
      };
    }
    throw new Error("모르는 요청");
  };
}
