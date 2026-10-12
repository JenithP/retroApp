// 신기술 인터페이스 체험 실습 현황판 — 교수가 단계를 넘기고(버셀 함수 · 교수용 암호), 유형별 결과와 조별 진행을 본다.
import { PHASES, TEAM_COUNT, TYPES, TYPE_KEYS, QUIZ, OPINION, WHEN, teamId, teamLabel, typeOf, evKo, actKo } from "./data.js";
import { ready, watchState, watchPeople, watchHomes, watchOpinions, adminCall } from "./fb.js";
import { tallyTypes, barsHTML, RESULT_ROWS } from "./stats.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("newtech.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("newtech.code", v); } catch { /* 이 탭에서만 */ } },
};
const B = { state: {}, people: {}, homes: {}, opinions: {}, code: ss.get() };

/* ── 잠금과 단계 ─────────────────────────────────────── */
async function unlock(code) {
  try { await adminCall(code, "check"); B.code = code; ss.set(code); $("lock").hidden = true; $("steps").hidden = false; }
  catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
if (B.code) unlock(B.code);

const CONFIRM = {
  r1: "1차 체험 시작 (조 유형별 조건 적용)",
  check: "체험 종료 및 확인 과제 시작",
  r2: "2차 체험 · 설계 시작 (모든 조 같은 조건)",
  reveal: "결과 공개 (학생 화면에 유형 이름과 결과 표시)",
  opinion: "조별 의견 단계 시작",
  end: "실습 종료 (학생 화면 실습보고서 내려받기 공개)",
};
document.querySelectorAll(".step[data-phase]").forEach(b => b.onclick = async () => {
  const p = b.dataset.phase;
  if (CONFIRM[p] && !confirm(CONFIRM[p])) return;
  $("stepMsg").textContent = "단계 변경 중";
  try { await adminCall(B.code, "phase", { phase: p }); $("stepMsg").textContent = `현재 단계: ${PHASES[p]}`; }
  catch (e) { $("stepMsg").textContent = e.message; }
});
$("reset").onclick = async () => {
  if (!confirm("7주차 기록 전체 삭제 (리허설 후 전용)")) return;
  if (prompt("확인 문구 입력: 초기화") !== "초기화") return;
  try { await adminCall(B.code, "reset"); $("stepMsg").textContent = "초기화 완료"; }
  catch (e) { $("stepMsg").textContent = e.message; }
};
$("dClose").onclick = () => $("detail").close();

/* ── 그리기 ─────────────────────────────────────────── */
function renderAll() { renderKpis(); renderResults(); renderTeams(); renderOpinions(); }

function renderKpis() {
  const ps = Object.values(B.people);
  const by = k => ps.filter(p => p.type === k).length;
  const k = [[ps.length, "접속 인원"], ...TYPE_KEYS.map(t => [by(t), `${TYPES[t].ko} 유형 인원`]), [ps.filter(p => p.quiz).length, "확인 과제 제출"]];
  $("kpis").innerHTML = k.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
}
function renderResults() {
  const t = tallyTypes(B.people);
  const emoN = t.emo.match + t.emo.mismatch;
  $("results").innerHTML = barsHTML(t, RESULT_ROWS)
    + `<p class="small">표정 판정 비교 ${emoN}회 중 「다름」 <b>${emoN ? Math.round(t.emo.mismatch / emoN * 100) : 0}%</b></p>`;
  $("items").innerHTML = QUIZ.map((q, i) => `<div class="trow"><h4>${i + 1}. ${esc(q.q)} <small>${q.kind}</small></h4>${TYPE_KEYS.map(k => {
    const v = t.types[k].items[q.id];
    return `<div class="tb"><span class="tl" style="color:${TYPES[k].color}">${TYPES[k].ko}</span><i><u style="width:${v || 0}%;background:${TYPES[k].color}"></u></i><em>${v == null ? "—" : Math.round(v) + "%"}</em></div>`;
  }).join("")}</div>`).join("");
}
function renderTeams() {
  $("teams").innerHTML = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(t => {
    const ps = Object.values(B.people).filter(p => p.team === t);
    const h = B.homes[teamId(t)], op = B.opinions[teamId(t)];
    const ty = TYPES[typeOf(t)];
    return `<button type="button" class="tcard" data-t="${t}" style="border-left:5px solid ${ty.color}">
      <span class="tn"><b>${teamLabel(t)}</b><span style="color:${ty.color}">${ty.ko} · ${esc(ty.name)}</span></span>
      <span class="tm">접속 ${ps.length}명 · 과제 제출 ${ps.filter(p => p.quiz).length}</span>
      <span class="tm">도움 요청 ${ps.reduce((a, p) => a + (p.help?.r1 || 0), 0)}회 (1차)</span>
      <span class="tm">규칙 ${(h?.rules || []).length}개${h?.purpose ? " · 목적 기재" : ""}</span>
      <span class="tm">${op && OPINION.some(o => op[o.id]) ? "의견 작성 중" : ""}</span></button>`;
  }).join("");
  $("teams").querySelectorAll(".tcard").forEach(b => b.onclick = () => openTeam(Number(b.dataset.t)));
}
function openTeam(t) {
  const h = B.homes[teamId(t)] || {}, op = B.opinions[teamId(t)] || {};
  $("dTitle").textContent = `${teamLabel(t)} · ${TYPES[typeOf(t)].ko} 유형`;
  $("dBody").innerHTML = `<h4>우리 집 규칙</h4><p>${esc(h.purpose || "(설계 목적 없음)")}</p>
    <ol>${(h.rules || []).map(r => `<li>${esc(evKo(r.ev))}${r.when !== "any" ? ` (${WHEN[r.when]})` : ""} → ${(r.acts || []).map(actKo).join(", ")} ${r.note ? `「${esc(r.note)}」` : ""}</li>`).join("") || "<li>규칙 없음</li>"}</ol>
    <h4>조별 의견</h4>${OPINION.map(o => `<p><b>${esc(o.q)}</b><br>${esc(op[o.id] || "—")}</p>`).join("")}`;
  $("detail").showModal();
}
function renderOpinions() {
  const rows = Object.entries(B.opinions).filter(([, o]) => OPINION.some(q => o[q.id])).sort();
  $("opinions").innerHTML = rows.length ? rows.map(([id, o]) => `<div class="opcard"><b>${Number(id.slice(1))}조</b> <small>${TYPES[typeOf(Number(id.slice(1)))].ko}</small>
    ${OPINION.map((q, i) => o[q.id] ? `<p><small>${i + 1}</small> ${esc(o[q.id])}</p>` : "").join("")}</div>`).join("") : `<p class="muted">아직 없음</p>`;
}

await ready();
watchState(st => {
  B.state = st;
  $("phaseChip").textContent = PHASES[st.phase] || st.phase || "안내";
  $("phaseChip").dataset.p = st.phase;
  document.querySelectorAll(".step[data-phase]").forEach(b => b.classList.toggle("on", b.dataset.phase === st.phase));
});
watchPeople(all => { B.people = all; renderAll(); });
watchHomes(all => { B.homes = all; renderTeams(); });
watchOpinions(all => { B.opinions = all; renderTeams(); renderOpinions(); });
renderAll();
