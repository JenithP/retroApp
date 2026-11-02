// 챗봇 전환 실습 — 기본 앱 → 규칙 기반 → 학습 기반 → 결과 비교 → 개인 답변(.docx).
// 서버 없이 브라우저에서만 돈다. 입력 내용은 이 기기의 localStorage 에 남긴다.
import { APP_NAME, FUNCS, FALLBACK, IDS, CATEGORIES, TESTS, funcName } from "./data.js";
import { ruleMatch, train, classify, splitKeywords, splitExamples } from "./engine.js";
import { htmlToDocx, saveBlob } from "../../js/docx.js";

const KEY = "hci10_botlab";
const STEPS = ["기본 앱", "규칙 기반", "학습 기반", "결과 비교", "개인 답변"];
const MIN_EXAMPLES = 3;

const QUESTIONS = [
  "규칙 기반과 학습 기반 챗봇을 직접 만들어 보면서 두 방식의 차이를 어떻게 느꼈는지 쓰십시오.",
  "규칙 기반과 학습 기반을 구분할 때 어떤 점을 기준으로 삼아야 한다고 생각하는지 쓰십시오.",
];

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saved = load();
const S = {
  step: saved.step || 0,
  rules: saved.rules || {},
  examples: saved.examples || {},
  id: saved.id || "", name: saved.name || "", team: saved.team || "",
  a1: saved.a1 || "", a2: saved.a2 || "",
};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장이 막혀도 실습은 계속된다 */ } };

// 새로고침하면 다시 만드는 값
let model = null, modelStale = true, trainProgress = 0;
const logs = { rule: [], learn: [] };
let appPick = null;

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const replyOf = id => FUNCS.find(f => f.id === id)?.reply ?? FALLBACK;

/* ── 두 챗봇 ───────────────────────────────────────────── */
function askRule(text) {
  const r = ruleMatch(S.rules, IDS, text);
  return { id: r.id, why: r.id ? `일치한 키워드: ${r.keyword}` : "일치한 키워드 없음" };
}
function askLearn(text) {
  const r = classify(model, text);
  const pct = Math.round(r.conf * 100);
  const why = r.id
    ? `확신도 ${pct}%${r.evidence.length ? ` · 근거 글자 조각: ${r.evidence.join(", ")}` : ""}`
    : `확신도 ${pct}%로 낮음 · 가장 가까운 기능: ${funcName(r.guess)}`;
  return { id: r.id, why };
}

function runTests(ask) {
  const rows = TESTS.map(t => { const a = ask(t.text); return { ...t, got: a.id, ok: a.id === t.want }; });
  const byCat = CATEGORIES.map((_, c) => {
    const inCat = rows.filter(r => r.cat === c);
    return { pass: inCat.filter(r => r.ok).length, all: inCat.length };
  });
  return { rows, byCat, pass: rows.filter(r => r.ok).length, all: rows.length };
}
const parsedExamples = () => Object.fromEntries(IDS.map(id => [id, splitExamples(S.examples[id])]));
const ruleReady = () => IDS.every(id => splitKeywords(S.rules[id]).length > 0);
const examplesReady = () => IDS.every(id => splitExamples(S.examples[id]).length >= MIN_EXAMPLES);

/* ── 공통 조각 ─────────────────────────────────────────── */
function renderSteps() {
  $("steps").innerHTML = STEPS.map((s, i) =>
    `<button class="step${i === S.step ? " on" : ""}" data-step="${i}"${i === S.step ? ' aria-current="step"' : ""}>${i + 1}. ${s}</button>`).join("");
  $("steps").querySelectorAll("button").forEach(b => { b.onclick = () => go(+b.dataset.step); });
}
function go(n) { S.step = n; save(); render(); window.scrollTo(0, 0); }

const scoresHtml = res => res ? `
  <div class="scores">${res.byCat.map((c, i) => `<div class="score"><b>${c.pass} / ${c.all}</b><span>${CATEGORIES[i]}</span></div>`).join("")}</div>
  <p class="total">합계 ${res.pass} / ${res.all}</p>` : "";

function phoneChat(kind, title) {
  return `<div class="phone"><div class="screen">
    <div class="appbar">${APP_NAME}<small>${title}</small></div>
    <div class="log" id="log" aria-live="polite">${logs[kind].map(msgHtml).join("") || `<div class="msg bot">안녕하세요. 무엇을 도와드릴까요?</div>`}</div>
    <form class="chatin" id="chatForm"><input id="chatText" autocomplete="off" placeholder="입력 내용" aria-label="챗봇에게 보낼 말"><button class="btn primary" id="chatSend">보내기</button></form>
  </div></div>`;
}
const msgHtml = m => m.me
  ? `<div class="msg me">${esc(m.text)}</div>`
  : `<div class="msg bot">${esc(m.text)}<span class="why">${esc(m.why)}</span></div>`;

function bindChat(kind, ask, ready) {
  const log = $("log");
  log.scrollTop = log.scrollHeight;
  $("chatSend").disabled = !ready;
  $("chatText").disabled = !ready;
  if (!ready) $("chatText").placeholder = kind === "rule" ? "기능마다 키워드 입력 후 사용" : "학습 실행 후 사용";
  $("chatForm").onsubmit = e => {
    e.preventDefault();
    const text = $("chatText").value.trim();
    if (!text) return;
    const a = ask(text);
    logs[kind].push({ me: true, text }, { text: replyOf(a.id), why: a.why });
    log.innerHTML = logs[kind].map(msgHtml).join("");
    log.scrollTop = log.scrollHeight;
    $("chatText").value = "";
    $("chatText").focus();
  };
}

/* ── 1. 기본 앱 ────────────────────────────────────────── */
function viewApp() {
  $("view").innerHTML = `
  <div class="layout"><div>
    <h2>기본 앱</h2>
    <p class="lead">카페 주문 앱의 기본형입니다. 버튼 네 개로 기능을 씁니다. 이 앱의 인터페이스를 챗봇으로 바꾸면, 사용자의 말을 듣고 네 기능 중 하나로 연결해야 합니다.</p>
    <div class="card"><h3>실습 순서</h3>
      <p>같은 네 기능을 두 방식으로 연결합니다.</p>
      <ul>
        <li><b>규칙 기반</b>: 사람이 기능별 키워드를 직접 적음</li>
        <li><b>학습 기반</b>: 기능별 예시 문장을 주면 프로그램이 분류 방법을 학습함. 답을 새로 만들지 않고 준비된 기능 중에서 고름</li>
        <li><b>공통 시험</b>: 두 방식 모두 같은 시험 문장 ${TESTS.length}개로 확인함</li>
      </ul>
    </div>
    <div class="actions"><button class="btn primary" id="next">규칙 기반으로</button></div>
  </div>
  <div class="phone"><div class="screen">
    <div class="appbar">${APP_NAME}<small>기본 앱</small></div>
    <div class="fnlist">${FUNCS.map(f => `<button class="fn${appPick === f.id ? " on" : ""}" data-f="${f.id}">${f.name}</button>`).join("")}</div>
    <div class="apparea">${appPick ? esc(replyOf(appPick)) : "버튼을 눌러 기능 확인"}</div>
  </div></div></div>`;
  document.querySelectorAll(".fn").forEach(b => { b.onclick = () => { appPick = b.dataset.f; viewApp(); }; });
  $("next").onclick = () => go(1);
}

/* ── 2. 규칙 기반 ──────────────────────────────────────── */
function viewRule() {
  $("view").innerHTML = `
  <div class="layout"><div>
    <h2>규칙 기반</h2>
    <p class="lead">기능마다 키워드를 쉼표로 나누어 적습니다. 입력에 키워드가 있으면 그 기능으로 연결합니다. 여러 키워드가 맞으면 가장 긴 키워드를 따릅니다. ELIZA가 쓴 방식과 같은 원리입니다.</p>
    <div class="card"><div class="fields">${FUNCS.map(f => `
      <label class="field">${f.name}<small>예: 단어, 단어, 짧은 표현</small>
        <input data-rule="${f.id}" value="${esc(S.rules[f.id] || "")}" autocomplete="off"></label>`).join("")}</div>
      <div class="actions"><button class="btn primary" id="test">공통 시험 실행</button>
        <span class="hint" id="ruleHint"></span></div>
      <div id="ruleScores">${scoresHtml(S.ruleResult)}</div>
    </div>
    <p class="hint">시험 문장은 결과 비교 단계에서 공개합니다. 지금은 유형별 통과 수만 표시합니다.</p>
    <div class="actions"><button class="btn" id="next">학습 기반으로</button></div>
  </div>${phoneChat("rule", "챗봇 · 규칙 기반")}</div>`;

  const refresh = () => {
    const ready = ruleReady();
    $("test").disabled = !ready;
    $("ruleHint").textContent = ready ? "" : "네 기능 모두 키워드 필요";
    $("chatSend").disabled = !ready;
    $("chatText").disabled = !ready;
    $("chatText").placeholder = ready ? "입력 내용" : "기능마다 키워드 입력 후 사용";
  };
  document.querySelectorAll("[data-rule]").forEach(i => {
    i.oninput = () => { S.rules[i.dataset.rule] = i.value; S.ruleResult = null; $("ruleScores").innerHTML = ""; save(); refresh(); };
  });
  $("test").onclick = () => { S.ruleResult = runTests(askRule); save(); $("ruleScores").innerHTML = scoresHtml(S.ruleResult); };
  $("next").onclick = () => go(2);
  bindChat("rule", askRule, ruleReady());
  refresh();
}

/* ── 3. 학습 기반 ──────────────────────────────────────── */
function viewLearn() {
  $("view").innerHTML = `
  <div class="layout"><div>
    <h2>학습 기반</h2>
    <p class="lead">기능마다 사용자가 할 법한 말을 한 줄에 하나씩 적습니다(기능별 ${MIN_EXAMPLES}문장 이상). 학습을 실행하면 프로그램이 문장의 글자 조각과 기능의 관계를 스스로 찾습니다. 답을 새로 만들지 않고 준비된 기능 중 하나를 고르며, 확신도가 50%보다 낮으면 모른다고 답합니다.</p>
    <div class="card"><div class="fields">${FUNCS.map(f => `
      <label class="field">${f.name}<small>한 줄에 한 문장</small>
        <textarea rows="5" data-ex="${f.id}">${esc(S.examples[f.id] || "")}</textarea></label>`).join("")}</div>
      <div class="actions"><button class="btn primary" id="trainBtn">학습 실행</button>
        <button class="btn" id="test">공통 시험 실행</button>
        <span class="hint" id="learnHint"></span></div>
      <div class="bar" aria-hidden="true"><i id="barFill"></i></div>
      <div id="learnScores">${scoresHtml(S.learnResult)}</div>
    </div>
    <div class="actions"><button class="btn" id="next">결과 비교로</button></div>
  </div>${phoneChat("learn", "챗봇 · 학습 기반")}</div>`;

  const refresh = () => {
    const ready = examplesReady(), trained = !!model && !modelStale;
    $("trainBtn").disabled = !ready;
    $("test").disabled = !trained;
    $("chatSend").disabled = !trained;
    $("chatText").disabled = !trained;
    $("chatText").placeholder = trained ? "입력 내용" : "학습 실행 후 사용";
    const hint = $("learnHint");
    hint.className = "hint";
    if (!ready) hint.textContent = `기능별 ${MIN_EXAMPLES}문장 이상 필요`;
    else if (modelStale && model) { hint.textContent = "예시가 바뀜 · 학습을 다시 실행"; hint.className = "hint warn"; }
    else if (trained) hint.textContent = `학습 완료 · 예시 ${model.size}문장 · 예시 문장 정답률 ${Math.round(model.accuracy * 100)}%`;
    else hint.textContent = "";
    $("barFill").style.width = trained ? "100%" : `${trainProgress}%`;
  };
  document.querySelectorAll("[data-ex]").forEach(t => {
    t.oninput = () => { S.examples[t.dataset.ex] = t.value; modelStale = true; trainProgress = 0; S.learnResult = null; $("learnScores").innerHTML = ""; save(); refresh(); };
  });
  $("trainBtn").onclick = async () => {
    $("trainBtn").disabled = true;
    // 학습은 금방 끝나지만, 반복해서 고쳐 간다는 것이 보이도록 막대를 천천히 채운다
    for (trainProgress = 0; trainProgress < 100; trainProgress += 10) {
      $("barFill").style.width = `${trainProgress}%`;
      await new Promise(r => setTimeout(r, 70));
    }
    model = train(parsedExamples(), IDS);
    modelStale = false;
    logs.learn.length = 0;
    S.learnResult = null;
    save();
    $("learnScores").innerHTML = "";
    refresh();
  };
  $("test").onclick = () => { S.learnResult = runTests(askLearn); save(); $("learnScores").innerHTML = scoresHtml(S.learnResult); };
  $("next").onclick = () => go(3);
  bindChat("learn", askLearn, !!model && !modelStale);
  refresh();
}

/* ── 4. 결과 비교 ──────────────────────────────────────── */
function viewCompare() {
  const r = S.ruleResult, l = S.learnResult;
  const cell = (res, i) => {
    if (!res) return `<td class="hint">미실시</td>`;
    const row = res.rows[i];
    return `<td><span class="${row.ok ? "pass" : "fail"}">${row.ok ? "통과" : "실패"}</span> · ${esc(funcName(row.got))}</td>`;
  };
  let lastCat = -1, body = "";
  TESTS.forEach((t, i) => {
    if (t.cat !== lastCat) { lastCat = t.cat; body += `<tr class="cat"><td colspan="4">${CATEGORIES[t.cat]}</td></tr>`; }
    body += `<tr><td>${esc(t.text)}</td><td>${esc(t.want ? funcName(t.want) : "모른다고 답함")}</td>${cell(r, i)}${cell(l, i)}</tr>`;
  });
  $("view").innerHTML = `
    <h2>결과 비교</h2>
    <p class="lead">같은 시험 문장을 두 챗봇에 넣은 결과입니다. 어떤 문장에서 어느 쪽이 실패했는지, 실패하는 방식이 어떻게 다른지 조원과 살펴봅니다. 앞 단계로 돌아가 다시 고치면 점수는 달라질 수 있습니다.</p>
    <div class="compare">
      <div class="card"><h3>규칙 기반</h3><div class="big">${r ? `${r.pass} / ${r.all}` : "미실시"}</div></div>
      <div class="card"><h3>학습 기반</h3><div class="big">${l ? `${l.pass} / ${l.all}` : "미실시"}</div></div>
    </div>
    <div class="card tablewrap"><table>
      <thead><tr><th>시험 문장</th><th>정답</th><th>규칙 기반</th><th>학습 기반</th></tr></thead>
      <tbody>${body}</tbody></table></div>
    <div class="actions"><button class="btn primary" id="next">개인 답변으로</button></div>`;
  $("next").onclick = () => go(4);
}

/* ── 5. 개인 답변 ──────────────────────────────────────── */
function viewAnswer() {
  $("view").innerHTML = `
    <h2>개인 답변</h2>
    <p class="lead">조별 활동이 끝나면 각자 답을 적고 파일을 내려받아 제출합니다.</p>
    <div class="card">
      <div class="who">
        <label class="field">학번<input id="sid" value="${esc(S.id)}" autocomplete="off"></label>
        <label class="field">이름<input id="sname" value="${esc(S.name)}" autocomplete="off"></label>
        <label class="field">조<input id="steam" value="${esc(S.team)}" autocomplete="off"></label>
      </div>
      ${QUESTIONS.map((q, i) => `<label class="field q">질문 ${i + 1}. ${q}<textarea id="a${i + 1}">${esc(S[`a${i + 1}`])}</textarea></label>`).join("")}
      <div class="actions"><button class="btn primary" id="down">답변 파일 내려받기 (.docx)</button><span class="hint" id="downHint"></span></div>
    </div>`;
  const refresh = () => {
    const missing = [!S.id.trim() && "학번", !S.name.trim() && "이름", !S.a1.trim() && "질문 1", !S.a2.trim() && "질문 2"].filter(Boolean);
    $("down").disabled = missing.length > 0;
    $("downHint").textContent = missing.length ? `입력 필요: ${missing.join(", ")}` : "";
  };
  for (const [el, key] of [["sid", "id"], ["sname", "name"], ["steam", "team"], ["a1", "a1"], ["a2", "a2"]]) {
    $(el).oninput = () => { S[key] = $(el).value; save(); refresh(); };
  }
  $("down").onclick = () => {
    saveBlob(htmlToDocx(reportHtml()), `10주차_${S.id.trim()}_${S.name.trim()}.docx`.replace(/[\\/:*?"<>|]/g, "_"));
    $("downHint").textContent = "내려받기 완료 · 파일을 제출하십시오";
  };
  refresh();
}

function reportHtml() {
  const para = t => esc(t.trim()).replace(/\n/g, "<br>");
  const num = res => res ? `${res.pass} / ${res.all}` : "미실시";
  const cat = (res, i) => res ? `${res.byCat[i].pass} / ${res.byCat[i].all}` : "미실시";
  return `<h1>10주차 챗봇 전환 실습 답변</h1>
    <p class="sub">학번 ${esc(S.id.trim())} · 이름 ${esc(S.name.trim())}${S.team.trim() ? ` · ${esc(S.team.trim())}조` : ""}</p>
    <h2>시험 결과</h2>
    <table class="t"><tr><th>유형</th><th>규칙 기반</th><th>학습 기반</th></tr>
      ${CATEGORIES.map((c, i) => `<tr><td>${c}</td><td>${cat(S.ruleResult, i)}</td><td>${cat(S.learnResult, i)}</td></tr>`).join("")}
      <tr><td><b>합계</b></td><td><b>${num(S.ruleResult)}</b></td><td><b>${num(S.learnResult)}</b></td></tr></table>
    <h2>답변</h2>
    ${QUESTIONS.map((q, i) => `<h3>질문 ${i + 1}. ${q}</h3><table class="ask"><tr><td>${para(S[`a${i + 1}`])}</td></tr></table>`).join("")}`;
}

/* ── 시작 ──────────────────────────────────────────────── */
function render() {
  renderSteps();
  [viewApp, viewRule, viewLearn, viewCompare, viewAnswer][S.step]();
}
render();
