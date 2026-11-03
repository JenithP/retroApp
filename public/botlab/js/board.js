// 챗봇 전환 실습 현황판 — 교수용 암호로 열고, 학생이 저장한 답변과 시험 점수를 5초마다 다시 읽는다.
import { CATEGORIES, TESTS, QUESTIONS } from "./data.js";

const POLL_MS = 5000;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("botlab.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("botlab.code", v); } catch { /* 이 탭에서만 */ } },
};
let code = ss.get(), timer = null;

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

function render(people) {
  const rule = people.filter(p => p.rule), learn = people.filter(p => p.learn);
  $("kpis").innerHTML = [
    [people.length, "답변 저장 인원"],
    [new Set(people.map(p => p.team).filter(Boolean)).size, "저장한 조"],
    [`${fmt(mean(rule, p => p.rule.pass))} / ${total}`, "규칙 기반 평균"],
    [`${fmt(mean(learn, p => p.learn.pass))} / ${total}`, "학습 기반 평균"],
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");

  const row = (label, of, all) => `<tr><td>${label}</td><td>${fmt(mean(rule, p => of(p.rule)))} / ${all}</td><td>${fmt(mean(learn, p => of(p.learn)))} / ${all}</td></tr>`;
  $("avg").innerHTML = `<table class="avg"><thead><tr><th>유형</th><th>규칙 기반 (${rule.length}명)</th><th>학습 기반 (${learn.length}명)</th></tr></thead><tbody>
    ${CATEGORIES.map((c, i) => row(c, r => r.byCat[i], inCat[i])).join("")}
    ${row("합계", r => r.pass, total)}</tbody></table>`;

  const sorted = [...people].sort((a, b) => (a.team ?? 99) - (b.team ?? 99) || String(a.id).localeCompare(String(b.id)));
  const pts = r => r ? `${r.pass} / ${total}` : "미실시";
  $("subs").innerHTML = sorted.length ? `<table class="subs"><thead><tr><th>조</th><th>학번</th><th>이름</th><th>규칙</th><th>학습</th>${QUESTIONS.map((q, i) => `<th title="${esc(q)}">질문 ${i + 1}</th>`).join("")}</tr></thead><tbody>
    ${sorted.map(p => `<tr><td class="n">${p.team ? `${p.team}조` : "—"}</td><td class="n">${esc(p.id)}</td><td class="n">${esc(p.name)}</td><td class="n">${pts(p.rule)}</td><td class="n">${pts(p.learn)}</td><td class="a">${esc(p.a1)}</td><td class="a">${esc(p.a2)}</td></tr>`).join("")}
    </tbody></table>` : `<p class="empty">아직 없음</p>`;
}

async function refresh() {
  try {
    const { people } = await adminCall("list");
    render(people);
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
