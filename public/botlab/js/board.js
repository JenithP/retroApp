// 챗봇 전환 실습 현황판 — 교수용 암호로 열고, 학생이 저장한 답변과 시험 점수를 5초마다 다시 읽는다.
import { CATEGORIES, TESTS, QUESTIONS, FUNCS } from "./data.js";

const POLL_MS = 5000;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("botlab.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("botlab.code", v); } catch { /* 이 탭에서만 */ } },
};
let code = ss.get(), timer = null, lastData = "";

async function adminCall(op) {
  const r = await fetch("/api/botlab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", code, op }) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || `서버 오류 ${r.status}`);
  return out;
}
function net(cls, msg) { $("netdot").className = "dot " + cls; $("netmsg").textContent = msg; }

/* ── 그리기 ─────────────────────────────────────────── */
const mean = (rows, f) => rows.length ? rows.reduce((a, p) => a + f(p), 0) / rows.length : null;
const fmt = v => v == null ? "—" : v.toFixed(1);
const total = TESTS.length;
const inCat = CATEGORIES.map((_, c) => TESTS.filter(t => t.cat === c).length);

const byId = (a, b) => String(a.id).localeCompare(String(b.id));
const lines = s => String(s || "").split("\n").map(l => l.trim()).filter(Boolean);
const who = p => `<b>${esc(p.name)}</b><small>${esc(p.id)}</small>`;

function inputOf(key, p) {
  if (key === "rule") return FUNCS.map(f => `<p><i>${f.name}</i>${esc(p.rules?.[f.id]) || "—"}</p>`).join("");
  const n = FUNCS.reduce((a, f) => a + lines(p.examples?.[f.id]).length, 0);
  return `<details><summary>예시 ${n}문장</summary>${FUNCS.map(f => `<p><i>${f.name}</i></p><pre>${esc(lines(p.examples?.[f.id]).join("\n")) || "—"}</pre>`).join("")}</details>`;
}

function panel(key, title, people) {
  const done = people.filter(p => p[key]), withOks = done.filter(p => p[key].oks);
  const rate = i => withOks.length ? `${Math.round(withOks.filter(p => p[key].oks[i]).length / withOks.length * 100)}%` : "—";
  const rows = CATEGORIES.map((c, ci) => `<tr class="cat"><td>${c}</td><td>${fmt(mean(done, p => p[key].byCat[ci]))} / ${inCat[ci]}</td></tr>
    ${TESTS.map((t, i) => t.cat === ci ? `<tr><td>${esc(t.text)}</td><td>${rate(i)}</td></tr>` : "").join("")}`).join("");
  return `<h2>${title}</h2>
    <p class="big">${fmt(mean(done, p => p[key].pass))} / ${total}<small>평균 · ${done.length}명</small></p>
    <table class="avg"><thead><tr><th>시험 문장</th><th>통과율</th></tr></thead><tbody>${rows}</tbody></table>
    <h2 style="margin-top:18px">학생별 입력</h2>
    ${[...done].sort(byId).map(p => `<div class="who"><span class="pt">${p[key].pass} / ${total}</span>${who(p)}${inputOf(key, p)}</div>`).join("") || `<p class="empty">아직 없음</p>`}`;
}

function render(people) {
  const rule = people.filter(p => p.rule), learn = people.filter(p => p.learn);
  $("kpis").innerHTML = [
    [people.length, "완료 인원"],
    [`${fmt(mean(rule, p => p.rule.pass))} / ${total}`, "규칙 기반 평균"],
    [`${fmt(mean(learn, p => p.learn.pass))} / ${total}`, "학습 기반 평균"],
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
  $("rulePanel").innerHTML = panel("rule", "규칙 기반 챗봇", people);
  $("learnPanel").innerHTML = panel("learn", "학습 기반 챗봇", people);

  $("subs").innerHTML = people.length ? `<table class="subs"><thead><tr><th>학번</th><th>이름</th>${QUESTIONS.map((q, i) => `<th title="${esc(q)}">질문 ${i + 1}</th>`).join("")}</tr></thead><tbody>
    ${[...people].sort(byId).map(p => `<tr><td class="n">${esc(p.id)}</td><td class="n">${esc(p.name)}</td><td class="a">${esc(p.a1)}</td><td class="a">${esc(p.a2)}</td></tr>`).join("")}
    </tbody></table>` : `<p class="empty">아직 없음</p>`;
}

async function refresh() {
  try {
    const { people } = await adminCall("list");
    // 펼쳐 둔 예시 문장이 닫히지 않도록 내용이 바뀔 때만 다시 그린다
    const data = JSON.stringify(people);
    if (data !== lastData) { lastData = data; render(people); }
    net("ok", `${new Date().toLocaleTimeString("ko-KR")} 기준`);
  } catch (e) { net("bad", e.message); }
}

/* ── 잠금 ───────────────────────────────────────────── */
async function unlock(v) {
  code = v;
  try {
    await adminCall("check");
    ss.set(v);
    $("lock").hidden = true;
    $("tools").hidden = false;
    await refresh();
    clearInterval(timer);
    timer = setInterval(refresh, POLL_MS);
  } catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
$("reset").onclick = async () => {
  if (!confirm("10주차 기록 전체 삭제 (리허설 후 전용)")) return;
  if (prompt("확인 문구 입력: 초기화") !== "초기화") return;
  try { await adminCall("reset"); $("toolMsg").textContent = "초기화 완료"; await refresh(); }
  catch (e) { $("toolMsg").textContent = e.message; }
};
if (code) unlock(code);
