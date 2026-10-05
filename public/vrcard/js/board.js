// VR · AR 적용 판단 실습 현황판 — 교수가 단계를 넘기고(버셀 함수 · 교수용 암호), 반 전체 비교와 조별 진행을 본다.
import { CARDS, QUADS, AXES, CHECKS, PHASES, TEAM_COUNT, teamId, teamLabel, cardOf, cardDone, theoryName, sideName,
         sideFromOf, sideTargetOf, sideDocId } from "./data.js";
import { ready, watchState, watchBoards, watchDesigns, watchSides, watchMockups, adminCall, wrapMock } from "./fb.js";
import { renderCompare } from "./compare.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("vrcard.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("vrcard.code", v); } catch { /* 이 탭에서만 */ } },
};
const B = { state: {}, boards: {}, designs: {}, sides: {}, mockups: {}, code: ss.get(), open: null, order: "split" };
const live = cards => Object.fromEntries(Object.entries(cards || {}).filter(([, c]) => !c.removed));
const boardsLive = () => Object.fromEntries(Object.entries(B.boards).map(([k, b]) => [k, { ...b, cards: live(b.cards) }]));

/* ── 잠금과 단계 ─────────────────────────────────────── */
async function unlock(code) {
  try { await adminCall(code, "check"); B.code = code; ss.set(code); $("lock").hidden = true; $("steps").hidden = false; }
  catch (e) { $("lockMsg").textContent = e.message; }
}
$("unlock").onclick = () => unlock($("code").value.trim());
$("code").onkeydown = e => { if (e.key === "Enter") $("unlock").click(); };
if (B.code) unlock(B.code);

const CONFIRM = {
  sort: "분류 단계 시작 (학생 화면 카드 공개)",
  share: "분류 잠금 및 반 전체 결과 공개 (이후 분류 수정 불가)",
  design: "재설계 단계 시작",
  side: "설계안 잠금 및 부작용 검토 시작 (검토 대상: 짝 조 설계안 · 1·2조, 3·4조 …)",
  reply: "부작용 검토 종료 및 대응책 단계 시작",
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
  if (!confirm("전체 조의 분류 · 설계안 · 부작용 삭제 (리허설 후 전용)")) return;
  if (prompt("확인 문구 입력: 초기화") !== "초기화") return;
  try { await adminCall(B.code, "reset"); $("stepMsg").textContent = "초기화 완료"; }
  catch (e) { $("stepMsg").textContent = e.message; }
};
document.querySelectorAll(".seg2 button").forEach(b => b.onclick = () => {
  B.order = b.dataset.o;
  document.querySelectorAll(".seg2 button").forEach(x => x.classList.toggle("on", x === b));
  renderCmp();
});

/* ── 그리기 ─────────────────────────────────────────── */
const ago = ms => { if (!ms) return ""; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "방금" : `${m}분 전`; };
setInterval(renderTeams, 15000);
function renderAll() { renderKpis(); renderCmp(); renderTeams(); }
const renderCmp = () => renderCompare($("compare"), boardsLive(), { order: B.order, open: B.open, onToggle: id => { B.open = id; renderCmp(); } });

function teamStat(t) {
  const cards = live(B.boards[teamId(t)]?.cards);
  const ids = Object.keys(cards);
  return { placed: ids.filter(k => cards[k].q).length, done: ids.filter(k => cardDone(cards[k])).length,
           total: CARDS.length + ids.filter(k => k.startsWith("c")).length,
           design: B.designs[teamId(t)], gave: B.sides[sideDocId(sideTargetOf(t), t)], got: B.sides[sideDocId(t, sideFromOf(t))] };
}
function renderKpis() {
  const st = Array.from({ length: TEAM_COUNT }, (_, i) => teamStat(i + 1));
  const k = [[st.filter(s => s.placed).length, "분류 시작 조"], [st.reduce((a, s) => a + s.done, 0), "근거 완료 카드"],
             [st.filter(s => s.design?.card).length, "설계안 제출 조"], [st.reduce((a, s) => a + (s.gave?.items?.length || 0), 0), "입력 부작용"],
             [st.reduce((a, s) => a + (s.got?.replies || []).filter(x => x).length, 0), "입력 대응책"]];
  $("kpis").innerHTML = k.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
}
function renderTeams() {
  const box = $("teams");
  box.innerHTML = "";
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const s = teamStat(t), last = B.boards[teamId(t)]?.updatedAt;
    const quiet = B.state.phase === "sort" && (!last || Date.now() - last > 5 * 60000);
    const b = document.createElement("button");
    b.className = "tcard" + (quiet ? " quiet" : "");
    b.innerHTML = `<div class="tn"><b>${teamLabel(t)}</b><span>${s.design?.card ? esc(s.design.kind || "") : ""}</span></div>
      <div class="tm">배치 ${s.placed} / ${s.total} · 근거 ${s.done}</div>
      <div class="vbar"><span style="width:${s.total ? s.done / s.total * 100 : 0}%"></span></div>
      <span class="st ${s.design?.card ? "pub" : "none"}">${s.design?.card ? `설계안: ${esc(cardOf(s.design.card, B.boards[teamId(t)]).title)}` : "설계안 미제출"}${B.mockups[teamId(t)]?.generating ? " · 목업 생성 중" : B.mockups[teamId(t)]?.version ? ` · 목업 ${B.mockups[teamId(t)].version}` : ""}</span>
      <span class="st ${s.gave?.items?.length ? "" : "none"}">부작용 ${s.gave?.items?.length || 0} · 대응 ${(s.got?.replies || []).filter(x => x).length}</span>
      <span class="st none">${ago(last)}</span>`;
    b.onclick = () => openDetail(t);
    box.appendChild(b);
  }
}

function openDetail(t) {
  const board = B.boards[teamId(t)], cards = live(board?.cards);
  $("dTitle").textContent = teamLabel(t);
  const cell = k => `<div class="quad" style="--qc:${QUADS[k].color}"><div class="qhead"><b>${esc(QUADS[k].ko)}</b></div><div class="qcards">${
    Object.entries(cards).filter(([, c]) => c.q === k).map(([id, c]) => `<span class="vchip${cardDone(c) ? " done" : ""}" title="${esc(theoryName(c.theory))} — ${esc(c.why || "")}"><span class="no">${/^\d+$/.test(id) ? id : "+"}</span><span class="tt">${esc(c.title || cardOf(id).title)}</span>${(c.warn || []).map(w => `<span class="wchip">⚠${w === 1 ? "①" : "②"}</span>`).join("")}</span>`).join("")}</div></div>`;
  $("dPlane").innerHTML = `<div class="axis-y"><b>${esc(AXES.y.ko)}</b></div><div class="axis-x-top"><span>정보 결합 필요 낮음</span><span>정보 결합 필요 높음</span></div>
    <div class="quads">${cell("vr")}${cell("train")}${cell("keep")}${cell("guide")}</div><div class="axis-x"><b>→ ${esc(AXES.x.ko)}</b></div>`;
  const d = B.designs[teamId(t)];
  $("dDesign").innerHTML = d?.card ? `<p class="eno">적용 방향: ${esc(d.kind || "")}</p><h3>${esc(cardOf(d.card, board).title)}</h3>
    <dl class="dl"><dt>사용자 · 시점 · 장소</dt><dd>${esc(d.who || "—")}</dd><dt>현행 방식의 문제</dt><dd>${esc(d.pain || "—")}</dd>
    <dt>적용 화면 설명</dt><dd>${esc(d.change || "—")}</dd><dt>근거 이론</dt><dd>${esc(theoryName(d.theory) || "—")}</dd></dl>
    ${B.mockups[teamId(t)]?.html ? `<div class="mockwrap"><iframe sandbox="allow-scripts" title="화면 목업" srcdoc="${String(wrapMock(B.mockups[teamId(t)].html)).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe></div>` : `<p class="muted">목업 없음</p>`}
    <dl class="dl ck">${CHECKS.map(k => `<dt>${esc(k.ko)}</dt><dd>${esc(d.checks?.[k.id] || "—")}</dd>`).join("")}</dl>` : `<p class="muted">없음</p>`;
  const got = B.sides[sideDocId(t, sideFromOf(t))];
  $("dSides").innerHTML = got?.items?.length ? `<ol class="sidelist">${got.items.map((x, i) => `<li><span class="kchip">${esc(sideName(x.kind))}</span><span>${esc(x.note)}${got.replies?.[i] ? `<br><small>대응 — ${esc(got.replies[i])}</small>` : ""}</span></li>`).join("")}</ol>`
    : `<p class="muted">없음</p>`;
  $("detail").showModal();
}
$("dClose").onclick = () => $("detail").close();

/* ── 연결 ───────────────────────────────────────────── */
await ready();
watchState(st => {
  B.state = st;
  $("phaseChip").textContent = PHASES[st.phase] || "안내";
  $("phaseChip").dataset.p = st.phase || "ready";
  document.querySelectorAll(".step[data-phase]").forEach(b => b.classList.toggle("on", b.dataset.phase === (st.phase || "ready")));
  renderTeams();
});
watchBoards(all => { B.boards = all; renderAll(); });
watchDesigns(all => { B.designs = all; renderAll(); });
watchSides(all => { B.sides = all; renderAll(); });
watchMockups(all => { B.mockups = all; renderAll(); });
renderAll();
