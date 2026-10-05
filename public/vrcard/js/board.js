// VR로 갈까, AR로 갈까 현황판 — 교수가 단계를 넘기고(버셀 함수 · 교수용 암호), 반 전체 비교와 조별 진행을 본다.
import { CARDS, QUADS, AXES, CHECKS, PHASES, TEAM_COUNT, teamId, teamLabel, cardOf, cardDone, theoryName, sideName,
         sideFromOf, sideTargetOf, sideDocId } from "./data.js";
import { ready, watchState, watchBoards, watchDesigns, watchSides, adminCall } from "./fb.js";
import { renderCompare } from "./compare.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ss = {
  get() { try { return sessionStorage.getItem("vrcard.code") || ""; } catch { return ""; } },
  set(v) { try { sessionStorage.setItem("vrcard.code", v); } catch { /* 이 탭에서만 */ } },
};
const B = { state: {}, boards: {}, designs: {}, sides: {}, code: ss.get(), open: null, order: "split" };
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
  sort: "분류를 시작합니다. 학생 화면에 카드가 열립니다.",
  share: "분류를 잠그고 반 전체 비교를 공개합니다. 이 뒤로는 분류를 고칠 수 없습니다.",
  design: "재설계를 시작합니다.",
  side: "설계안을 잠그고 부작용 찾기를 시작합니다. 조마다 다음 번호 조의 설계안을 받습니다.",
  reply: "부작용 찾기를 닫고 대응책 쓰기를 시작합니다.",
  end: "실습을 마칩니다. 학생 화면에 실습보고서 내려받기가 열립니다.",
};
document.querySelectorAll(".step[data-phase]").forEach(b => b.onclick = async () => {
  const p = b.dataset.phase;
  if (CONFIRM[p] && !confirm(CONFIRM[p])) return;
  $("stepMsg").textContent = "넘기는 중…";
  try { await adminCall(B.code, "phase", { phase: p }); $("stepMsg").textContent = `${PHASES[p]} 단계로 넘겼습니다`; }
  catch (e) { $("stepMsg").textContent = e.message; }
});
$("reset").onclick = async () => {
  if (!confirm("모든 조의 분류 · 설계안 · 부작용을 지웁니다. 리허설 뒤에만 쓰세요.")) return;
  if (prompt("정말 지우려면 「비우기」 라고 적으세요") !== "비우기") return;
  try { await adminCall(B.code, "reset"); $("stepMsg").textContent = "비웠습니다"; }
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
  const k = [[st.filter(s => s.placed).length, "분류를 시작한 조"], [st.reduce((a, s) => a + s.done, 0), "근거를 채운 카드"],
             [st.filter(s => s.design?.card).length, "설계안을 쓴 조"], [st.reduce((a, s) => a + (s.gave?.items?.length || 0), 0), "붙인 부작용"],
             [st.reduce((a, s) => a + (s.got?.replies || []).filter(x => x).length, 0), "쓴 대응책"]];
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
      <div class="tm">놓음 ${s.placed} / ${s.total} · 근거 ${s.done}</div>
      <div class="vbar"><span style="width:${s.total ? s.done / s.total * 100 : 0}%"></span></div>
      <span class="st ${s.design?.card ? "pub" : "none"}">${s.design?.card ? `설계안: ${esc(cardOf(s.design.card, B.boards[teamId(t)]).title)}` : "설계안 없음"}</span>
      <span class="st ${s.gave?.items?.length ? "" : "none"}">붙인 부작용 ${s.gave?.items?.length || 0} · 대응 ${(s.got?.replies || []).filter(x => x).length}</span>
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
  $("dPlane").innerHTML = `<div class="axis-y"><b>${esc(AXES.y.ko)}</b></div><div class="axis-x-top"><span>현실에 붙을 필요 낮음</span><span>높음</span></div>
    <div class="quads">${cell("vr")}${cell("train")}${cell("keep")}${cell("guide")}</div><div class="axis-x"><b>→ ${esc(AXES.x.ko)}</b></div>`;
  const d = B.designs[teamId(t)];
  $("dDesign").innerHTML = d?.card ? `<p class="eno">${esc(d.kind || "")}로 바꾸기</p><h3>${esc(cardOf(d.card, board).title)}</h3>
    <dl class="dl"><dt>누가 · 언제 · 어디서</dt><dd>${esc(d.who || "—")}</dd><dt>지금 방식의 문제</dt><dd>${esc(d.pain || "—")}</dd>
    <dt>바꾸면 달라지는 것</dt><dd>${esc(d.change || "—")}</dd><dt>근거 이론</dt><dd>${esc(theoryName(d.theory) || "—")}</dd></dl>
    ${d.sketch ? `<img class="sk" src="${d.sketch}" alt="화면 스케치">` : ""}
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
renderAll();
