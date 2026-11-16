// 12주차 복습 시뮬레이터 — 학생에게는 사용성 평가로 안내하고, 실제로는 AI 도우미 감독 방식을 비교한다.
// 시작 → 연습 → 질문 1 · 2 · 3 → 설문 → (교수가 공개하면) 사후 설명 · 마지막 질문 · .docx
// 진행 상태는 이 기기의 localStorage 에 남긴다. 서버(api/review.js)에는 입장 · 평가 제출 · 마지막 답만 보낸다.
import { VERSIONS, TRAPS, PRACTICE, PEERS, COPIED, REPLACED, QUESTIONS, RATINGS, FINAL_QS, MIN_CHARS } from "./data.js";
import { htmlToDocx, saveBlob } from "../../js/docx.js";

const KEY = "hci12_review";
const STEPS = ["시작", "연습", "질문 1", "질문 2", "질문 3", "설문", "마무리"];
const STEP_MS = 650, POLL_MS = 5000;

const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newCid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(36).padStart(2, "0")).join("");

const blankQ = () => ({ draft: "", text: "", phase: "write", removed: [], results: [], rating: [0, 0, 0], ms: 0, t0: 0 });
const fresh = () => ({
  step: 0, id: "", name: "", cid: newCid(), version: "",
  practice: { shown: "", caught: null },
  q: Object.fromEntries(QUESTIONS.map(q => [q.id, blankQ()])),
  visibility: "private", autoApply: false, submitList: false,
  approvals: [], approveAll: {}, traps: {},
  reuse: 0, odd: "", logged: false, revealed: false,
  final: FINAL_QS.map(() => ""), finalSent: false,
});
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const S = Object.assign(fresh(), load() || {});
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장이 막혀도 진행 */ } };
// 도우미 작업 도중 새로고침했다면 그 질문은 처음 상태(쓴 글 유지)로 되돌린다
for (const q of Object.values(S.q)) if (q.phase === "plan" || q.phase === "run") Object.assign(q, { phase: "write", text: "", removed: [], results: [] });

const V = () => VERSIONS[S.version] || VERSIONS.A;
const api = body => fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(async r => { const out = await r.json().catch(() => ({})); if (!r.ok) throw new Error(out.error || `서버 오류 ${r.status}`); return out; });

/* ── 공통 ─────────────────────────────────────────────── */
function renderTop() {
  $("steps").innerHTML = STEPS.map((s, i) => `<span class="step${i === S.step ? " on" : i < S.step ? " done" : ""}">${s}</span>`).join("");
  $("ver").textContent = S.version ? `인터페이스 버전 ${S.version}` : "";
}
function go(n) { S.step = n; save(); render(); window.scrollTo(0, 0); }

/* ── 0. 시작 ─────────────────────────────────────────── */
function viewStart() {
  $("view").innerHTML = `
    <div class="narrow">
      <h2>복습 시뮬레이터 사용성 평가</h2>
      <p class="lead">새로 만든 복습 시뮬레이터를 미리 써 보는 평가입니다. 과제를 할 때 도움이 되도록 AI 도우미를 넣었습니다. 온라인 강의에서 중요한 내용에 대해 자기 생각을 쓰면, 도우미가 슬라이드를 찾고 문장을 다듬고 저장까지 대신 처리합니다.</p>
      <div class="card">
        <h3>평가 내용</h3>
        <ul class="plain">
          <li>도우미가 생각 정리를 자연스럽게 돕는지 평가</li>
          <li>인터페이스 버전을 여러 개 만들어 비교하므로 사람마다 화면이 조금씩 다름</li>
          <li>질문 3개 · 약 12분 · 질문마다 짧은 평가 문항</li>
        </ul>
      </div>
      <div class="card">
        <div class="who">
          <label class="field">학번<input id="sid" value="${esc(S.id)}" autocomplete="off" inputmode="numeric"></label>
          <label class="field">이름<input id="sname" value="${esc(S.name)}" autocomplete="off"></label>
        </div>
        <div class="actions"><button class="btn primary" id="join">시작</button><span class="hint" id="joinHint"></span></div>
      </div>
    </div>`;
  const ready = () => { $("join").disabled = !(S.id.trim() && S.name.trim()); };
  $("sid").oninput = () => { S.id = $("sid").value; save(); ready(); };
  $("sname").oninput = () => { S.name = $("sname").value; save(); ready(); };
  $("join").onclick = async () => {
    $("join").disabled = true; $("joinHint").textContent = "접속 중";
    try {
      const out = await api({ action: "join", cid: S.cid, id: S.id, name: S.name });
      S.version = out.version;
    } catch (e) {
      // 서버가 없어도(로컬 미리보기) 진행은 되게 한다
      S.version = S.version || "ABCD"[Math.floor(Math.random() * 4)];
      console.warn("join 실패", e);
    }
    go(1);
  };
  ready();
}

/* ── 1. 연습 ─────────────────────────────────────────── */
function viewPractice() {
  const p = S.practice, card = k => `
    <div class="sum"><small>출처 · ${esc(PRACTICE[k].src)}</small><p>${esc(PRACTICE[k].text)}</p></div>`;
  $("view").innerHTML = `
    <h2>도우미 사용해 보기</h2>
    <p class="lead">본 질문에 앞서 도우미에게 슬라이드 요약을 한 번 요청해 봅니다.</p>
    <div class="layout">
      <div class="card">
        <h3>요청</h3>
        <p>'${esc(PRACTICE.ask)}' 슬라이드 요약</p>
        <div class="actions"><button class="btn primary" id="ask"${p.shown ? " disabled" : ""}>요약 요청</button></div>
      </div>
      <aside class="agent">
        <div class="agenthead"><span class="bot" aria-hidden="true"></span>AI 도우미</div>
        <div class="agentbody" id="pbody">
          ${!p.shown ? `<p class="idle">요청을 기다리는 중</p>` : ""}
          ${p.shown ? card(p.caught ? "right" : "wrong") : ""}
          ${p.shown && p.caught === null ? `<div class="actions"><button class="btn primary" id="use">이 요약으로 메모</button><button class="btn" id="again">다시 찾기</button></div>` : ""}
          ${p.caught !== null ? `<p class="okline">메모에 추가됨</p>` : ""}
        </div>
      </aside>
    </div>
    <div class="actions end"><button class="btn primary" id="next"${p.caught === null ? " disabled" : ""}>질문 1로</button></div>`;
  if ($("ask")) $("ask").onclick = async () => {
    $("ask").disabled = true;
    $("pbody").innerHTML = `<p class="working">슬라이드 찾는 중</p>`;
    await sleep(900);
    p.shown = "wrong"; save(); viewPractice();
  };
  if ($("use")) $("use").onclick = () => { p.caught = false; save(); viewPractice(); };
  if ($("again")) $("again").onclick = async () => {
    $("pbody").innerHTML = `<p class="working">다시 찾는 중</p>`;
    await sleep(700);
    p.caught = true; save(); viewPractice();
  };
  $("next").onclick = () => go(2);
}

/* ── 2–4. 질문 ───────────────────────────────────────── */
const sentences = t => (t.match(/[^.!?。\n]+[.!?。]*/g) || []).map(s => s.trim()).filter(Boolean);

function preview(step, Q) {
  const t = Q.text;
  switch (step.kind) {
    case "find": return esc(step.detail);
    case "spell": { const n = (t.match(/ {2,}|\s+(?=[.,!?])/g) || []).length; return n ? `겹친 띄어쓰기 · 문장부호 앞 공백 ${n}곳 정리` : "고칠 곳 없음"; }
    case "rewrite": {
      const ss = sentences(t), last = ss[ss.length - 1] || t;
      return `<span class="lab">바꾸기 전</span><del>${esc(last)}</del><span class="lab">바꾼 뒤</span><ins>${esc(REPLACED)}</ins>`;
    }
    case "ref": return `답안 끝에 '${esc(step.ref.trim())}' 추가`;
    case "read": return PEERS.map((p, i) => `<span class="lab">공개 답안 ${i + 1} · ${esc(p.nick)}</span>${esc(p.text.slice(0, 34))}…`).join("");
    case "copy": return `<span class="lab">추가할 문장</span><ins>${esc(COPIED)}</ins><span class="lab">출처</span>공개 답안 2 (닉네임 ${esc(PEERS[1].nick)}) · 원문 그대로`;
    case "length": return `현재 ${t.replace(/\s/g, "").length}자`;
    case "save": return `<span class="lab">저장 위치</span>12주차 복습 노트<span class="lab">공개 범위</span>나만 보기 → 수강생 전체 공개`;
    case "submit": return "12주차 복습 제출 목록에 이 답안 추가";
    case "settings": return `<span class="lab">작업 알림</span>단계마다 → 작업이 끝난 뒤 한 번<span class="lab">다음부터 제안 자동 반영</span>꺼짐 → 켜짐`;
  }
  return "";
}

// 단계를 실제로 적용하고, 되돌릴 때 쓸 값을 돌려준다 (없으면 되돌리기 버튼 없음)
function apply(step, Q) {
  switch (step.kind) {
    case "spell": Q.text = Q.text.replace(/ {2,}/g, " ").replace(/\s+(?=[.,!?])/g, ""); return null;
    case "rewrite": {
      const ss = sentences(Q.text), last = ss[ss.length - 1];
      if (!last) { Q.text = REPLACED; return { removed: "", added: REPLACED }; }
      const at = Q.text.lastIndexOf(last);
      Q.text = (Q.text.slice(0, at).trimEnd() + " " + REPLACED + Q.text.slice(at + last.length)).trim();
      return { removed: last, added: REPLACED };
    }
    case "ref": Q.text = Q.text.trimEnd() + step.ref; return { removed: "", added: step.ref };
    case "copy": Q.text = Q.text.trimEnd() + " " + COPIED; return { removed: "", added: " " + COPIED };
    case "save": S.visibility = "public"; return { flag: "visibility" };
    case "submit": S.submitList = true; return { flag: "submitList" };
    case "settings": S.autoApply = true; return { flag: "autoApply" };
  }
  return null;
}
function undo(r, Q) {
  const u = r.undo;
  if (u.flag === "visibility") S.visibility = "private";
  else if (u.flag) S[u.flag] = false;
  else if (Q.text.includes(u.added)) Q.text = Q.text.replace(u.added, u.removed).replace(/ {2,}/g, " ").trim();
  r.status = "undone";
}

function trapOutcome(t) {
  const qi = QUESTIONS.findIndex(q => q.id === TRAPS[t].q), qd = QUESTIONS[qi];
  const si = qd.steps.findIndex(s => s.trap === t), Q = S.q[qd.id];
  const r = Q.results.find(x => x.i === si);
  if (!r) return { out: "missed", how: "none" };
  if (r.status === "plan") return { out: "blocked", how: "plan" };
  if (r.status === "skipped") return { out: "blocked", how: "step" };
  const fixed = t === "t1" ? !Q.text.includes(REPLACED)
    : t === "t2" ? !Q.text.includes(COPIED.slice(0, 24))
    : t === "t3" ? S.visibility === "private" : !S.autoApply;
  if (fixed) return { out: "undone", how: r.status === "undone" ? "undo" : "edit" };
  return { out: "missed", how: r.asked ? "approved" : r.all ? "approveAll" : "auto" };
}

function metaBar(busy) {
  const d = busy ? " disabled" : "";
  return `<div class="meta">
    <span>공개 범위 <b class="${S.visibility === "public" ? "hot" : ""}">${S.visibility === "public" ? "수강생 전체 공개" : "나만 보기"}</b>
      <button class="link" id="visT"${d}>${S.visibility === "public" ? "나만 보기로 변경" : "전체 공개로 변경"}</button></span>
    <span>제안 자동 반영 <b>${S.autoApply ? "켜짐" : "꺼짐"}</b>
      <button class="link" id="autoT"${d}>${S.autoApply ? "끄기" : "켜기"}</button></span>
  </div>`;
}

function logLine(r, qd) {
  const st = qd.steps[r.i];
  const tag = { done: "완료", skipped: "건너뜀", plan: "계획에서 뺌", undone: "되돌림" }[r.status];
  return `<li class="ln ${r.status}"><span class="tick" aria-hidden="true"></span><span class="tx">${esc(st.face)}</span>
    <span class="tg">${tag}</span>${r.status === "done" && r.undo ? `<button class="link" data-undo="${r.i}">되돌리기</button>` : ""}</li>`;
}

function viewQuestion(n) {
  const qd = QUESTIONS[n], Q = S.q[qd.id], v = V();
  if (!Q.t0) { Q.t0 = Date.now(); save(); }
  const ratingHtml = RATINGS.map((r, ri) => `
    <fieldset class="rate"><legend>${esc(r)}</legend>
      <div class="scale"><span>전혀 아님</span>${[1, 2, 3, 4, 5, 6, 7].map(k => `<label><input type="radio" name="r${ri}" value="${k}"${Q.rating[ri] === k ? " checked" : ""}><i>${k}</i></label>`).join("")}<span>매우 그럼</span></div>
    </fieldset>`).join("");

  $("view").innerHTML = `
    <h2>질문 ${n + 1}. ${esc(qd.title)}</h2>
    <p class="lead">${esc(qd.prompt)}</p>
    <div class="layout">
      <div>
        <div class="card">
          ${Q.phase === "write" ? `
            <label class="field">나의 생각 <small>${MIN_CHARS}자 이상 · 두 문장 이상 권장</small><textarea id="draft" rows="8">${esc(Q.draft)}</textarea></label>
            <div class="actions"><button class="btn primary" id="go">도우미에게 맡기기 · ${esc(qd.task)}</button><span class="hint" id="goHint"></span></div>` : `
            <label class="field">${Q.phase === "done" ? "도우미 작업 뒤 답안 <small>직접 고칠 수 있음</small>" : "답안 <small>도우미 작업 중</small>"}
              <textarea id="final" rows="9"${Q.phase === "done" ? "" : " readonly"}>${esc(Q.text)}</textarea></label>`}
          ${metaBar(Q.phase === "plan" || Q.phase === "run")}
        </div>
        ${Q.phase === "done" ? `<div class="card"><h3>이 질문에 대한 평가</h3>${ratingHtml}
          <div class="actions"><button class="btn primary" id="next">${n < 2 ? `질문 ${n + 2}로` : "설문으로"}</button><span class="hint" id="nextHint"></span></div></div>` : ""}
      </div>
      <aside class="agent">
        <div class="agenthead"><span class="bot" aria-hidden="true"></span>AI 도우미<small>${esc(qd.task)}</small></div>
        <div class="agentbody">
          ${Q.phase === "write" ? `<p class="idle">글을 쓴 뒤 '도우미에게 맡기기'를 누르면 작업을 시작함</p>` : ""}
          <ol class="log" id="log">${Q.results.map(r => logLine(r, qd)).join("")}</ol>
          <div id="slot"></div>
          ${Q.phase === "done" ? `<p class="okline">작업 완료</p>` : ""}
        </div>
      </aside>
    </div>`;

  // 공개 범위 · 자동 반영은 학생이 언제든 직접 바꿀 수 있다
  $("visT").onclick = () => { S.visibility = S.visibility === "public" ? "private" : "public"; save(); viewQuestion(n); };
  $("autoT").onclick = () => { S.autoApply = !S.autoApply; save(); viewQuestion(n); };

  if (Q.phase === "write") {
    const ready = () => {
      const len = Q.draft.trim().length;
      $("go").disabled = len < MIN_CHARS;
      $("goHint").textContent = len < MIN_CHARS ? `${len} / ${MIN_CHARS}자` : "";
    };
    $("draft").oninput = () => { Q.draft = $("draft").value; save(); ready(); };
    $("go").onclick = () => {
      Q.text = Q.draft.trim(); Q.results = []; Q.removed = [];
      if (v.plan) { Q.phase = "plan"; save(); viewQuestion(n); showPlan(n); }
      else { Q.phase = "run"; save(); viewQuestion(n); run(n); }
    };
    ready();
  }
  if (Q.phase === "done") {
    $("final").oninput = () => { Q.text = $("final").value; save(); };
    document.querySelectorAll("[data-undo]").forEach(b => b.onclick = () => {
      const r = Q.results.find(x => x.i === +b.dataset.undo);
      undo(r, Q); save(); viewQuestion(n);
    });
    document.querySelectorAll(".rate input").forEach(inp => inp.onchange = () => {
      Q.rating[+inp.name.slice(1)] = +inp.value; save(); check();
    });
    const check = () => {
      const miss = Q.rating.filter(x => !x).length;
      $("next").disabled = miss > 0;
      $("nextHint").textContent = miss ? `평가 문항 ${miss}개 남음` : "";
    };
    $("next").onclick = () => {
      Q.ms = Date.now() - Q.t0;
      for (const [t, d] of Object.entries(TRAPS)) if (d.q === qd.id) S.traps[t] = trapOutcome(t);
      go(n + 3);
    };
    check();
  }
}

function showPlan(n) {
  const qd = QUESTIONS[n], Q = S.q[qd.id];
  $("slot").innerHTML = `
    <div class="ask plan">
      <p class="askhead">작업 계획 · 확인 요청</p>
      <p class="hint">필요 없는 단계는 체크를 풀어 뺄 수 있음</p>
      <ul class="planlist">${qd.steps.map((s, i) => `<li><label><input type="checkbox" data-i="${i}" checked> ${esc(s.plan)}</label></li>`).join("")}</ul>
      <div class="actions"><button class="btn primary" id="planOk">계획 승인</button></div>
    </div>`;
  const t0 = performance.now();
  $("planOk").onclick = () => {
    Q.removed = [...document.querySelectorAll(".planlist input")].filter(c => !c.checked).map(c => +c.dataset.i);
    S.approvals.push({ q: qd.id, i: -1, kind: "plan", decision: "approve", ms: Math.round(performance.now() - t0), removed: Q.removed });
    Q.phase = "run"; save(); viewQuestion(n); run(n);
  };
}

function askCard(step, Q, v) {
  return new Promise(resolve => {
    const t0 = performance.now(); let opened = false;
    $("slot").innerHTML = `
      <div class="ask">
        <p class="askhead">${v.ask === VERSIONS.B.ask ? "위험 행동으로 분류된 단계 · 확인 요청" : "도우미 확인 요청"}</p>
        <p class="face">${esc(step.face)}</p>
        ${v.flags && step.flag ? `<p class="flag">주의 · ${esc(step.flag)}</p>` : ""}
        <details id="det"><summary>세부 내용 보기</summary><div class="detail">${preview(step, Q)}</div></details>
        <label class="all"><input type="checkbox" id="all"> 이 질문에서 남은 단계 모두 승인</label>
        <div class="actions"><button class="btn primary" id="yes">승인</button><button class="btn" id="no">건너뛰기</button></div>
      </div>`;
    $("det").ontoggle = () => { if ($("det").open) opened = true; };
    const done = decision => { const all = $("all").checked; $("slot").innerHTML = ""; resolve({ decision, all, opened, ms: Math.round(performance.now() - t0) }); };
    $("yes").onclick = () => done("approve");
    $("no").onclick = () => done("skip");
    $("yes").focus({ preventScroll: true });
  });
}

async function run(n) {
  const qd = QUESTIONS[n], Q = S.q[qd.id], v = V();
  const log = () => { $("log").innerHTML = Q.results.map(r => logLine(r, qd)).join(""); const f = $("final"); if (f) f.value = Q.text; };
  for (let i = 0; i < qd.steps.length; i++) {
    const st = qd.steps[i];
    if (Q.removed.includes(i)) { Q.results.push({ i, status: "plan" }); save(); log(); continue; }
    $("slot").innerHTML = `<p class="working">${esc(st.face)}</p>`;
    await sleep(STEP_MS);
    const r = { i, status: "done", asked: false, all: false };
    if (v.ask(st)) {
      if (S.approveAll[qd.id]) {
        r.all = true;
        S.approvals.push({ q: qd.id, i, kind: st.kind, decision: "all", trap: st.trap || "" });
      } else {
        const a = await askCard(st, Q, v);
        S.approvals.push({ q: qd.id, i, kind: st.kind, decision: a.decision, ms: a.ms, opened: a.opened, trap: st.trap || "" });
        if (a.all) S.approveAll[qd.id] = true;
        if (a.decision === "skip") { r.status = "skipped"; Q.results.push(r); save(); log(); continue; }
        r.asked = true;
      }
    }
    r.undo = apply(st, Q);
    Q.results.push(r); save(); log();
    $("slot").innerHTML = "";
    await sleep(250);
  }
  Q.phase = "done"; save(); viewQuestion(n);
}

/* ── 5. 설문 ─────────────────────────────────────────── */
function viewSurvey() {
  $("view").innerHTML = `
    <div class="narrow">
      <h2>설문</h2>
      <p class="lead">마지막으로 버전 전체에 대한 평가입니다.</p>
      <div class="card">
        <fieldset class="rate"><legend>과제를 할 때 이 버전을 다시 쓰고 싶다</legend>
          <div class="scale"><span>전혀 아님</span>${[1, 2, 3, 4, 5, 6, 7].map(k => `<label><input type="radio" name="reuse" value="${k}"${S.reuse === k ? " checked" : ""}><i>${k}</i></label>`).join("")}<span>매우 그럼</span></div>
        </fieldset>
        <label class="field q">도우미를 쓰면서 불편했거나 이상했던 점 <small>선택</small><textarea id="odd" rows="4">${esc(S.odd)}</textarea></label>
        <div class="actions"><button class="btn primary" id="send">평가 제출</button><span class="hint" id="sendHint"></span></div>
      </div>
    </div>`;
  document.querySelectorAll("[name=reuse]").forEach(r => r.onchange = () => { S.reuse = +r.value; save(); $("send").disabled = false; });
  $("odd").oninput = () => { S.odd = $("odd").value; save(); };
  $("send").disabled = !S.reuse;
  $("send").onclick = async () => {
    $("send").disabled = true; $("sendHint").textContent = "제출 중";
    const ok = await api(logPayload()).then(() => true).catch(() => false);
    S.logged = ok; save();
    if (!ok) { $("sendHint").textContent = "저장 실패 · 다시 눌러 주십시오"; $("send").disabled = false; return; }
    go(6);
  };
}

function logPayload() {
  return {
    action: "log", cid: S.cid, id: S.id, name: S.name, version: S.version,
    practice: S.practice.caught, traps: S.traps, approvals: S.approvals.slice(0, 60),
    approveAll: S.approveAll, reuse: S.reuse, odd: S.odd,
    ratings: Object.fromEntries(QUESTIONS.map(q => [q.id, S.q[q.id].rating])),
    answers: Object.fromEntries(QUESTIONS.map(q => [q.id, S.q[q.id].text])),
    ms: Object.fromEntries(QUESTIONS.map(q => [q.id, S.q[q.id].ms])),
  };
}

/* ── 6. 마무리 (교수가 공개하면 사후 설명) ───────────── */
let pollTimer = null;
function viewWrap() {
  clearTimeout(pollTimer);
  if (!S.revealed) {
    $("view").innerHTML = `
      <div class="narrow center">
        <h2>평가가 저장되었습니다</h2>
        <p class="lead">교수님 안내가 있을 때까지 이 화면을 그대로 두십시오.</p>
        <p class="working">안내 기다리는 중</p>
      </div>`;
    const poll = async () => {
      const st = await api({ action: "status" }).catch(() => null);
      if (st?.reveal) { S.revealed = true; save(); viewWrap(); return; }
      pollTimer = setTimeout(poll, POLL_MS);
    };
    poll();
    return;
  }
  viewDebrief();
}

const OUT = {
  blocked: { plan: "막음 · 계획에서 뺌", step: "막음 · 승인 단계에서 건너뜀" },
  undone: { undo: "되돌림 · 실행 뒤 되돌리기", edit: "되돌림 · 직접 수정" },
  missed: { approved: "놓침 · 직접 승인함", approveAll: "놓침 · '모두 승인'으로 넘어감", auto: "놓침 · 묻지 않고 실행됨", none: "놓침" },
};
const outText = o => o ? (OUT[o.out]?.[o.how] || o.out) : "기록 없음";

function viewDebrief() {
  const v = V();
  const rows = Object.entries(TRAPS).map(([t, d]) => {
    const o = S.traps[t];
    return `<tr><td>${esc(d.name)}</td><td class="${o?.out === "missed" ? "fail" : "pass"}">${esc(outText(o))}</td></tr>`;
  }).join("");
  $("view").innerHTML = `
    <div class="narrow">
      <h2>사후 설명</h2>
      <div class="card reveal">
        <p>이 실습의 실제 목적은 사용성 평가가 아니라, 온라인 27~29장에서 본 감독 방식 비교 실험(Chen et al., 2026)을 직접 겪어 보는 것이었습니다. 도우미는 작업 중에 문제 행동을 몰래 섞어 두었고, 인터페이스 버전은 곧 감독 방식이었습니다.</p>
        <p>공개 범위가 바뀐 답안은 실제로 다른 학생에게 공개되지 않았고, 다른 학생 답안은 미리 만든 문장입니다. 기록은 수업 결과 정리에만 사용합니다.</p>
      </div>
      <div class="card">
        <h3>나의 버전 · ${esc(S.version)} = ${esc(v.name)} <small>${esc(v.en)}</small></h3>
        <table><thead><tr><th>숨긴 문제 행동</th><th>나의 결과</th></tr></thead><tbody>
          <tr><td>연습 · 다른 주차 슬라이드 요약</td><td class="${S.practice.caught ? "pass" : "fail"}">${S.practice.caught ? "잡음 · 다시 찾기" : "놓침 · 그대로 메모"}</td></tr>
          ${rows}</tbody></table>
      </div>
      <div class="card">
        <h3>마지막 질문</h3>
        ${FINAL_QS.map((q, i) => `<label class="field q">${i + 1}. ${esc(q)}<textarea id="f${i}" rows="5">${esc(S.final[i])}</textarea></label>`).join("")}
        <div class="actions"><button class="btn primary" id="down">답변 파일 내려받기 (.docx)</button><span class="hint" id="downHint"></span></div>
      </div>
    </div>`;
  const ready = () => {
    const miss = S.final.filter(x => !x.trim()).length;
    $("down").disabled = miss > 0;
    $("downHint").textContent = miss ? `입력 필요 · ${miss}문항` : "";
  };
  FINAL_QS.forEach((_, i) => { $(`f${i}`).oninput = () => { S.final[i] = $(`f${i}`).value; save(); ready(); }; });
  $("down").onclick = async () => {
    saveBlob(htmlToDocx(reportHtml()), `12주차_${S.id.trim()}_${S.name.trim()}.docx`.replace(/[\\/:*?"<>|]/g, "_"));
    $("downHint").textContent = "내려받기 완료 · 현황판 저장 중";
    if (!S.logged) S.logged = await api(logPayload()).then(() => true).catch(() => false);
    const ok = await api({ action: "final", cid: S.cid, id: S.id, name: S.name, final: S.final }).then(() => true).catch(() => false);
    S.finalSent = ok; save();
    $("downHint").textContent = ok ? "내려받기 완료 · 현황판 저장 완료 · 파일을 제출하십시오" : "내려받기 완료 · 현황판 저장 실패 · 파일을 제출하십시오";
  };
  ready();
}

function reportHtml() {
  const para = t => esc(String(t).trim()).replace(/\n/g, "<br>");
  const v = V();
  return `<h1>12주차 복습 시뮬레이터 실습</h1>
    <p class="sub">학번 ${esc(S.id.trim())} · 이름 ${esc(S.name.trim())} · 버전 ${esc(S.version)} (${esc(v.name)})</p>
    <h2>복습 답안</h2>
    ${QUESTIONS.map((q, i) => `<h3>질문 ${i + 1}. ${esc(q.title)}</h3><table class="ask"><tr><td>${para(S.q[q.id].text)}</td></tr></table>`).join("")}
    <h2>숨긴 문제 행동과 나의 결과</h2>
    <table class="t"><tr><th>문제 행동</th><th>결과</th></tr>
      <tr><td>연습 · 다른 주차 슬라이드 요약</td><td>${S.practice.caught ? "잡음" : "놓침"}</td></tr>
      ${Object.entries(TRAPS).map(([t, d]) => `<tr><td>${esc(d.name)}</td><td>${esc(outText(S.traps[t]))}</td></tr>`).join("")}</table>
    <h2>마지막 질문</h2>
    ${FINAL_QS.map((q, i) => `<h3>${i + 1}. ${esc(q)}</h3><table class="ask"><tr><td>${para(S.final[i])}</td></tr></table>`).join("")}`;
}

/* ── 시작 ────────────────────────────────────────────── */
function render() {
  renderTop();
  if (S.step >= 1 && !S.version) S.step = 0;
  [viewStart, viewPractice, () => viewQuestion(0), () => viewQuestion(1), () => viewQuestion(2), viewSurvey, viewWrap][S.step]();
}
// 리허설용: 주소 끝에 ?reset 을 붙이면 이 기기의 기록을 지우고 처음부터
if (new URLSearchParams(location.search).has("reset")) { try { localStorage.removeItem(KEY); } catch { /* 무시 */ } location.replace(location.pathname); }
else render();
