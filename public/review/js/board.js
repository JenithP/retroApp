// 복습 시뮬레이터 현황판 — 교수용 암호로 열고 5초마다 다시 읽는다. '사후 설명 공개'를 누르면 학생 화면이 바뀐다.
import { VERSIONS, CHEN_FAIL, TRAPS, FINAL_QS, RATINGS } from "./data.js";

const POLL_MS = 5000;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("review.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("review.code", v); } catch { /* 이 탭에서만 */ } },
};
let code = ss.get(), timer = null, lastData = "", reveal = false;

async function adminCall(op) {
  const r = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", code, op }) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || `서버 오류 ${r.status}`);
  return out;
}
function net(cls, msg) { $("netdot").className = "dot " + cls; $("netmsg").textContent = msg; }

const pct = (a, b) => b ? Math.round(a / b * 100) : null;
const P = v => v == null ? "—" : `${v}%`;
const bar = (v, cls = "") => v == null ? "" : `<span class="bar ${cls}" style="width:${Math.max(2, v * 0.9)}px"></span>`;
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const V = Object.keys(VERSIONS), T = Object.keys(TRAPS);

function render(people) {
  const done = people.filter(p => p.loggedAt), fin = people.filter(p => p.finalAt);
  $("kpis").innerHTML = [
    [people.length, "입장"], [done.length, "평가 완료"], [fin.length, "마지막 답 제출"],
    [reveal ? "공개됨" : "숨김", "사후 설명"],
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");

  // 버전별 놓친 비율
  const missRate = (rows, t) => { const has = rows.filter(p => p.traps?.[t]); return pct(has.filter(p => p.traps[t].out === "missed").length, has.length); };
  const allMiss = rows => { let m = 0, n = 0; rows.forEach(p => T.forEach(t => { if (p.traps?.[t]) { n++; if (p.traps[t].out === "missed") m++; } })); return pct(m, n); };
  $("verPanel").innerHTML = `<h2>버전(감독 방식)별 문제 행동을 놓친 비율 <small>평가 완료 ${done.length}명</small></h2>
    <div class="tablewrap"><table class="t"><thead><tr><th>버전 · 감독 방식</th><th>인원</th>${T.map(t => `<th title="${esc(TRAPS[t].name)}">${esc(TRAPS[t].short)}</th>`).join("")}<th>전체</th><th class="ref">Chen (2026)<br>바로잡지 못하고 끝남</th></tr></thead><tbody>
    ${V.map(v => { const rows = done.filter(p => p.version === v), all = allMiss(rows);
      return `<tr><td><b>${v}</b> · ${esc(VERSIONS[v].name)}</td><td>${rows.length}</td>${T.map(t => `<td>${P(missRate(rows, t))}</td>`).join("")}<td class="hi">${P(all)}${bar(all)}</td><td class="ref">${CHEN_FAIL[v]}%</td></tr>`; }).join("")}
    <tr><td><b>전체</b></td><td>${done.length}</td>${T.map(t => `<td>${P(missRate(done, t))}</td>`).join("")}<td class="hi">${P(allMiss(done))}</td><td class="ref">—</td></tr>
    </tbody></table></div>
    <p class="note">열 순서 · ${T.map(t => esc(TRAPS[t].name)).join(" / ")}. Chen 수치는 다른 과업 · 다른 기준이므로 참고용.</p>`;

  // 문제 행동별 결과
  const trapRow = (name, rows, get) => {
    const has = rows.filter(p => get(p)), n = has.length;
    const c = k => has.filter(p => get(p).out === k).length;
    const b = pct(c("blocked"), n), u = pct(c("undone"), n), m = pct(c("missed"), n);
    return `<tr><td>${esc(name)}</td><td>${P(b)}</td><td>${P(u)}</td><td class="hi">${P(m)}${bar(m)}</td></tr>`;
  };
  const prac = done.filter(p => p.practice !== null && p.practice !== undefined);
  $("trapPanel").innerHTML = `<h2>문제 행동별 결과</h2>
    <table class="t"><thead><tr><th>숨긴 문제 행동</th><th>막음</th><th>되돌림</th><th>놓침</th></tr></thead><tbody>
    <tr><td>연습 · 다른 주차 슬라이드 요약 (미끼)</td><td>${P(pct(prac.filter(p => p.practice).length, prac.length))}</td><td>—</td><td class="hi">${P(pct(prac.filter(p => !p.practice).length, prac.length))}</td></tr>
    ${T.map(t => trapRow(TRAPS[t].name, done, p => p.traps?.[t])).join("")}
    </tbody></table>
    <p class="note">막음 · 계획에서 빼거나 승인 단계에서 건너뜀 / 되돌림 · 실행 뒤 되돌리기 또는 직접 수정</p>`;

  // 승인 행동
  const actRow = v => {
    const rows = v ? done.filter(p => p.version === v) : done;
    const cards = rows.flatMap(p => (p.approvals || []).filter(a => a.decision === "approve" || a.decision === "skip"));
    const trapCards = cards.filter(a => a.trap);
    const openedApproved = trapCards.filter(a => a.opened && a.decision === "approve").length;
    const all = pct(rows.filter(p => Object.values(p.approveAll || {}).some(Boolean)).length, rows.length);
    const sec = avg(cards.filter(a => a.ms != null).map(a => a.ms / 1000));
    return `<tr><td>${v ? `<b>${v}</b>` : "<b>전체</b>"}</td><td>${rows.length ? (cards.length / rows.length).toFixed(1) : "—"}</td>
      <td>${P(pct(cards.filter(a => a.opened).length, cards.length))}</td><td>${P(all)}</td>
      <td>${sec == null ? "—" : sec.toFixed(1) + "초"}</td><td>${openedApproved}</td></tr>`;
  };
  const rate = (rows, k) => { const v = avg(rows.flatMap(p => ["q1", "q2", "q3"].map(q => p.ratings?.[q]?.[k]).filter(x => x > 0))); return v == null ? "—" : v.toFixed(1); };
  $("actPanel").innerHTML = `<h2>승인 행동</h2>
    <table class="t"><thead><tr><th>버전</th><th>1인당 승인 카드</th><th>세부 내용 열어 봄</th><th>'모두 승인' 사용</th><th>평균 결정 시간</th><th>세부 내용 보고도 함정 승인</th></tr></thead>
    <tbody>${V.map(actRow).join("")}${actRow("")}</tbody></table>
    <h2 style="margin-top:16px">평가 점수 평균 <small>1–7</small></h2>
    <table class="t"><thead><tr><th>버전</th>${RATINGS.map(r => `<th title="${esc(r)}">${esc(r.replace("도우미가 ", "").replace("도우미를 ", "").slice(0, 10))}…</th>`).join("")}<th>다시 쓰고 싶음</th></tr></thead>
    <tbody>${V.map(v => { const rows = done.filter(p => p.version === v); const ru = avg(rows.map(p => p.reuse).filter(Boolean));
      return `<tr><td><b>${v}</b></td>${RATINGS.map((_, k) => `<td>${rate(rows, k)}</td>`).join("")}<td>${ru == null ? "—" : ru.toFixed(1)}</td></tr>`; }).join("")}</tbody></table>`;

  // 이상한 점
  const odd = done.filter(p => p.odd);
  $("oddPanel").innerHTML = `<h2>'불편했거나 이상했던 점' 응답 <small>${odd.length}명 · 놓친 문제 행동 수와 함께</small></h2>
    ${odd.length ? `<div class="tablewrap"><table class="subs"><thead><tr><th>학번</th><th>이름</th><th>버전</th><th>놓침</th><th>응답</th></tr></thead><tbody>
    ${odd.sort((a, b) => String(a.id).localeCompare(String(b.id))).map(p => `<tr><td class="n">${esc(p.id)}</td><td class="n">${esc(p.name)}</td><td class="n">${esc(p.version)}</td>
      <td class="n">${T.filter(t => p.traps?.[t]?.out === "missed").length}</td><td class="a">${esc(p.odd)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">아직 없음</p>`}`;

  $("finalPanel").innerHTML = `<h2>마지막 질문 답 <small>${fin.length}명</small></h2>
    ${fin.length ? `<div class="tablewrap"><table class="subs"><thead><tr><th>학번</th><th>이름</th><th>버전</th>${FINAL_QS.map((q, i) => `<th title="${esc(q)}">질문 ${i + 1}</th>`).join("")}</tr></thead><tbody>
    ${fin.sort((a, b) => String(a.id).localeCompare(String(b.id))).map(p => `<tr><td class="n">${esc(p.id)}</td><td class="n">${esc(p.name)}</td><td class="n">${esc(p.version)}</td>${FINAL_QS.map((_, i) => `<td class="a">${esc(p.final?.[i])}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>` : `<p class="empty">아직 없음</p>`}`;
}

function paintReveal() {
  $("reveal").textContent = reveal ? "사후 설명 공개 중 · 누르면 숨김" : "사후 설명 공개";
  $("reveal").classList.toggle("reveal-on", reveal);
}

async function refresh() {
  try {
    const out = await adminCall("list");
    reveal = out.reveal; paintReveal();
    const data = JSON.stringify(out);
    if (data !== lastData) { lastData = data; render(out.people); }
    net("ok", `${new Date().toLocaleTimeString("ko-KR")} 기준`);
  } catch (e) { net("bad", e.message); }
}

async function unlock(v) {
  code = v;
  try {
    await adminCall("check");
    ss.set(v);
    $("lock").hidden = true; $("tools").hidden = false;
    await refresh();
    clearInterval(timer); timer = setInterval(refresh, POLL_MS);
  } catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
$("reveal").onclick = async () => {
  if (!reveal && !confirm("학생 화면을 사후 설명으로 바꿉니다")) return;
  try { await adminCall(reveal ? "hide" : "reveal"); lastData = ""; await refresh(); }
  catch (e) { $("toolMsg").textContent = e.message; }
};
$("reset").onclick = async () => {
  if (!confirm("12주차 기록 전체 삭제 · 버전 배정 순번과 공개 상태도 처음으로 (리허설 후 전용)")) return;
  if (prompt("확인 문구 입력: 초기화") !== "초기화") return;
  try { await adminCall("reset"); $("toolMsg").textContent = "초기화 완료"; lastData = ""; await refresh(); }
  catch (e) { $("toolMsg").textContent = e.message; }
};
if (code) unlock(code);
