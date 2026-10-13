// 조별 발표 — 학생 화면. 문헌 신청 → (신청 마감 후 사다리로 주차 배정) → 10~14주차 탭마다 그 주 4개 조:
//   우리 조는 자료 올리기, 다른 조는 공개 후 열기 · 내려받기 · 질문 하나, 발표 날 채택된 질문
import { TEAM_COUNT, MAX_TEAMS_PER_PAPER, UPLOAD_DEADLINE, MAX_FILE_MB, WEEKS, PAPERS, teamId, teamLabel, paperOf, weekName, weekDate, openAt, questionCloseAt, fmt } from "./data.js";
import { me, ready, watchState, watchPicks, watchFiles, watchSelect, watchMyQuestions, savePerson, addQuestion, pickPaper, fileUrl, uploadChunk } from "./fb.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem("present." + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("present." + k, v); } catch { /* 저장 못 해도 진행 */ } },
};
const S = { team: Number(store.get("team")) || null, sid: store.get("sid") || "", name: store.get("name") || "",
            state: { locked: false, slots: {} }, picks: {}, files: {}, select: {}, myQ: {}, view: store.get("view") || "papers" };
const person = () => ({ team: S.team, sid: S.sid, name: S.name });

/* ── 미리보기 (?demo) — 실제 데이터는 그대로 두고, 10주차에 우리 조 + 다른 3개 조가 배정되어 질문 칸이 열린 화면을 보여 준다.
      올리기 · 열기 · 질문 등록은 하지 않는다 */
const DEMO = new URLSearchParams(location.search).has("demo");
const demoTeams = () => [S.team, ...[1, 2, 3, 4, 5].filter(t => t !== S.team)].slice(0, 4);
function demoState(st) {
  const now = Date.now(), slots = {};
  demoTeams().forEach((t, i) => slots[teamId(t)] = { week: 0, order: i + 1, open: new Date(now - 3600e3), close: new Date(now + 7 * 864e5) });
  return { ...st, slots };
}
const demoPicks = () => Object.fromEntries(demoTeams().map((t, i) => [teamId(t), { team: t, paper: ["p01", "p03", "p06", "p08"][i] }]));
const demoFiles = () => Object.fromEntries(demoTeams().slice(1).map(t => [teamId(t), { team: t, name: `${t}조_발표자료.pdf`, size: 4.2 * 1024 * 1024, at: Date.now() - 864e5 }]));
const demoNo = () => { alert("미리보기 화면 — 실제로 열리거나 등록되지 않습니다"); return true; };

/* ── 입장 ─────────────────────────────────────────── */
const sidOf = v => v.replace(/[^0-9]/g, "");   // 공백 · 하이픈은 빼고 숫자만
function renderJoin(first = true) {
  $("teamPick").innerHTML = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(t => `<button type="button" class="tp${S.team === t ? " on" : ""}" data-t="${t}"><b>${t}조</b></button>`).join("");
  $("teamPick").querySelectorAll(".tp").forEach(b => b.onclick = () => { S.team = Number(b.dataset.t); renderJoin(false); });
  if (first) { $("mySid").value = S.sid; $("myName").value = S.name; }   // 조를 고를 때 이미 쓴 학번 · 이름을 지우지 않는다
  const check = () => {
    const miss = [!S.team && "조 선택", !/^\d{6,12}$/.test(sidOf($("mySid").value)) && "학번(숫자 6~12자리)", !$("myName").value.trim() && "이름"].filter(Boolean);
    $("joinBtn").disabled = miss.length > 0;
    $("joinHint").textContent = miss.length ? `남은 항목: ${miss.join(" · ")}` : "";
  };
  $("mySid").oninput = $("myName").oninput = $("myName").oncompositionend = check;
  check();
}
$("joinBtn").onclick = async () => {
  S.sid = sidOf($("mySid").value); S.name = $("myName").value.trim();
  store.set("team", S.team); store.set("sid", S.sid); store.set("name", S.name);
  start();
};

let started = false;
async function start() {
  await ready();
  if (!S.team || !S.sid || !S.name) { show("vJoin"); renderJoin(); return; }
  try { await savePerson(person()); } catch (e) { console.error(e); }
  if (started) return;
  started = true;
  show("vMain");
  $("meChip").hidden = false;
  $("meChip").textContent = `${teamLabel(S.team)} · ${S.name}${DEMO ? " · 미리보기" : ""}`;
  if (DEMO) { S.view = "w0"; S.state = demoState(S.state); S.picks = { ...S.picks, ...demoPicks() }; S.files = { ...S.files, ...demoFiles() }; }
  $("meChip").onclick = () => { if (confirm("조 · 학번 · 이름을 다시 입력하시겠습니까?")) { store.set("team", ""); location.reload(); } };
  renderTabs();
  renderAll();   // 문헌 목록은 데이터 없이도 바로 보이게
  watchState(st => { S.state = DEMO ? demoState(st) : st; renderAll(); });
  watchPicks(p => { S.picks = DEMO ? { ...p, ...demoPicks() } : p; renderAll(); });
  watchFiles(f => { S.files = DEMO ? { ...f, ...demoFiles() } : f; renderAll(); });
  watchSelect(s => { S.select = s; if (S.view !== "papers") renderWeek(); });
  watchMyQuestions(q => { S.myQ = q; renderTabs(); });
  if (DEMO) setInterval(() => { S.state = demoState(S.state); }, 25000);
  setInterval(renderAll, 30000);   // 열람 시각 · 마감이 지나면 화면이 바뀌도록
}
function show(id) { ["vJoin", "vMain"].forEach(v => $(v).hidden = v !== id); }
function tab() {
  if (!/^(papers|w[0-4])$/.test(S.view)) S.view = "papers";
  document.querySelectorAll(".ptab").forEach(b => b.classList.toggle("on", b.dataset.v === S.view));
  $("pv-papers").hidden = S.view !== "papers";
  $("pv-week").hidden = S.view === "papers";
  if (S.view !== "papers") renderWeek();
}
const slotOf = id => S.state.slots?.[id];
const weekRows = w => Object.entries(S.state.slots || {}).filter(([, s]) => s.week === w).sort((a, b) => a[1].order - b[1].order);
/** 아직 질문하지 않은, 질문 기간인 발표 수 */
const pendingIn = w => { const now = Date.now(); return weekRows(w).filter(([id, s]) => Number(id.slice(1)) !== S.team && s.open?.getTime() <= now && s.close?.getTime() > now && !S.myQ[`${id}_${me.uid}`]).length; };
function renderTabs() {
  const mine = slotOf(teamId(S.team));
  $("ptabs").innerHTML = `<button type="button" class="ptab" data-v="papers">문헌 신청</button>` + WEEKS.map((_, w) => {
    const n = pendingIn(w), my = mine?.week === w;
    return `<button type="button" class="ptab${my ? " mine" : ""}" data-v="w${w}">${weekName(w)}${my ? " · 우리 조" : ""}${n ? ` <span class="badge">${n}</span>` : ""}</button>`;
  }).join("");
  $("ptabs").querySelectorAll(".ptab").forEach(b => b.onclick = () => { S.view = b.dataset.v; store.set("view", S.view); tab(); });
  tab();
}
function renderAll() { renderPapers(); renderTabs(); }

/* ── 문헌 신청 ───────────────────────────────────────── */
const teamsOf = pid => Object.values(S.picks).filter(p => p.paper === pid).map(p => p.team).sort((a, b) => a - b);
function renderPapers() {
  const mine = S.picks[teamId(S.team)]?.paper;
  $("pickLead").textContent = S.state.locked ? "신청 마감 — 변경은 교수에게 문의" : `조원과 논의 후 문헌 하나 신청 · 문헌 하나에 최대 ${MAX_TEAMS_PER_PAPER}개 조 · 마감 전까지 변경 가능`;
  const mp = mine && paperOf(mine);
  $("myPick").innerHTML = mp ? `<b>우리 조 신청</b><span>${esc(mp.title)}</span>` : `<b>우리 조 신청</b><span class="muted">아직 없음</span>`;
  $("papers").innerHTML = PAPERS.map((p, i) => {
    const ts = teamsOf(p.id), full = ts.length >= MAX_TEAMS_PER_PAPER, isMine = mine === p.id;
    return `<article class="paper${isMine ? " mine" : ""}${full && !isMine ? " full" : ""}">
      <div class="pno">${i + 1}</div>
      <div class="pbody">
        ${p.tag ? `<span class="ptag">${esc(p.tag)}</span>` : ""}
        <h3>${esc(p.ko || p.title)}</h3>
        ${p.ko ? `<p class="pen">${esc(p.title)}</p>` : ""}
        <p class="pmeta">${esc(p.authors)}${p.year ? ` (${p.year})` : ""}${p.venue ? ` · ${esc(p.venue)}` : ""}${p.url ? ` · <a href="${esc(p.url)}" target="_blank" rel="noopener">원문</a>` : ""}</p>
        ${p.summary ? `<dl><dt>무엇을</dt><dd>${esc(p.summary)}</dd>${p.method ? `<dt>어떻게</dt><dd>${esc(p.method)}</dd>` : ""}${p.finding ? `<dt>결과</dt><dd>${esc(p.finding)}</dd>` : ""}${p.link ? `<dt>연결</dt><dd>${esc(p.link)}</dd>` : ""}${p.angles?.length ? `<dt>발표 방향</dt><dd><ul class="angles">${p.angles.map(a => `<li>${esc(a)}</li>`).join("")}</ul></dd>` : ""}</dl>` : ""}
      </div>
      <div class="pside">
        <div class="slots">${Array.from({ length: MAX_TEAMS_PER_PAPER }, (_, k) => `<span class="${ts[k] ? (ts[k] === S.team ? "me" : "on") : ""}">${ts[k] ? ts[k] + "조" : ""}</span>`).join("")}</div>
        ${S.state.locked ? "" : isMine ? `<button class="btn ghost small" data-un="${p.id}" type="button">신청 취소</button>`
          : `<button class="btn primary small" data-pick="${p.id}" type="button"${full ? " disabled" : ""}>${full ? "마감" : mine ? "이 문헌으로 변경" : "신청"}</button>`}
      </div></article>`;
  }).join("");
  const act = async (paper, btn) => {
    btn.disabled = true;
    try { await pickPaper(S.team, paper); }
    catch (e) { alert(e.message); btn.disabled = false; }
  };
  $("papers").querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
    const p = paperOf(b.dataset.pick);
    if (confirm(`${teamLabel(S.team)} — 「${p.title}」 신청`)) act(b.dataset.pick, b);
  });
  $("papers").querySelectorAll("[data-un]").forEach(b => b.onclick = () => confirm("우리 조 신청을 취소합니다") && act(null, b));
}

/* ── 주차 ─────────────────────────────────────────── */
function renderWeek() {
  const w = Number(S.view.slice(1)), rows = weekRows(w), now = Date.now();
  $("wTitle").textContent = `${weekName(w)} 발표 · ${weekDate(w)}`;
  $("wLead").textContent = `자료 공개 ${fmt(openAt(w))} · 질문 마감 ${fmt(questionCloseAt(w))} · 업로드 마감 ${fmt(UPLOAD_DEADLINE)}`;
  if (!rows.length) { $("wBody").innerHTML = `<p class="muted">아직 배정 전 — 문헌 신청 마감 후 사다리로 발표 주차를 정함</p>`; return; }
  const act = document.activeElement;
  if ($("wBody").dataset.busy || ($("wBody").contains(act) && act.tagName === "TEXTAREA")) return;   // 올리는 중 · 쓰는 중에는 다시 그리지 않는다
  $("wBody").innerHTML = rows.map(([id, s]) => {
    const t = Number(id.slice(1)), p = paperOf(S.picks[id]?.paper), f = S.files[id], own = t === S.team;
    const opened = own || s.open.getTime() <= now, closed = s.close.getTime() <= now, q = S.myQ[`${id}_${me.uid}`];
    const fileLine = f ? `<span class="okmark">자료 있음</span> <span class="muted small">${esc(f.name)} · ${(f.size / 1024 / 1024).toFixed(1)}MB · ${fmt(new Date(f.at))}</span>` : `<span class="muted small">자료 없음</span>`;
    const fileBtns = f && opened ? `<button class="btn small" data-open="${t}" type="button">열기</button><button class="btn small" data-down="${t}" type="button">내려받기</button>` : "";
    let part = "";
    if (own) {
      part = now > UPLOAD_DEADLINE.getTime() ? `<p class="note">업로드 마감</p>`
        : `<div class="uprow"><label class="btn primary small">${f ? "다시 올리기" : "PDF 올리기"}<input type="file" data-up="${t}" accept="application/pdf,.pdf" hidden></label>
           <span class="muted small">PDF만 · ${MAX_FILE_MB}MB 이하 · 마감 ${fmt(UPLOAD_DEADLINE)} · 다시 올리면 바뀜 · AI가 이 PDF를 읽고 질문을 고름</span></div><div class="upprog" id="prog${t}"></div>`;
    } else if (!opened) part = `<p class="muted small">자료 공개 전 — ${fmt(s.open)}에 열림</p>`;
    else if (q) part = `<div class="myq"><small>내 질문 · ${fmt(new Date(q.at))}</small><p>${esc(q.text)}</p></div>`;
    else if (closed) part = `<p class="muted small">질문 마감 (${fmt(s.close)})</p>`;
    else part = `<div class="qform"><textarea rows="3" maxlength="300" data-q="${t}" placeholder="발표 자료를 읽고 질문 하나 — 핵심 주장 · 방법 · 한계 · 수업 개념과의 연결"></textarea>
        <div class="qfoot"><span class="muted small">마감 ${fmt(s.close)} · 등록 후 수정 불가</span><button class="btn primary small" data-send="${t}" type="button">질문 등록</button></div></div>`;
    const sel = S.select[id], shown = sel ? sel.picks.slice(0, sel.revealed || 0) : [];
    const picked = shown.length ? `<div class="picked"><b>채택된 질문</b><ol>${shown.map(x => `<li class="${x.sid === S.sid ? "me" : ""}"><p>${esc(x.text)}</p><small>${esc(x.reason)}${x.sid === S.sid ? " · <b>내 질문 채택 — 보너스 1점</b>" : ""}</small></li>`).join("")}</ol></div>` : "";
    return `<article class="ask${own ? " own" : ""}"><div class="ahead"><div><b>${s.order}. ${t}조</b>${own ? ` <span class="ptag">우리 조</span>` : ""}
        <h3>${p ? esc(p.ko || p.title) : "문헌 미신청"}</h3><div>${fileLine}</div></div><div class="dacts">${fileBtns}</div></div>${part}${picked}</article>`;
  }).join("");
  $("wBody").querySelectorAll("[data-open]").forEach(b => b.onclick = () => openDeck(Number(b.dataset.open)));
  $("wBody").querySelectorAll("[data-down]").forEach(b => b.onclick = () => downDeck(Number(b.dataset.down)));
  $("wBody").querySelectorAll("[data-up]").forEach(i => i.onchange = e => e.target.files[0] && doUpload(e.target.files[0], Number(i.dataset.up)));
  $("wBody").querySelectorAll("[data-send]").forEach(b => b.onclick = async () => {
    const t = Number(b.dataset.send), ta = $("wBody").querySelector(`textarea[data-q="${t}"]`), text = ta.value.trim();
    if (text.length < 10) { alert("질문을 10자 이상 써 주십시오"); return; }
    if (DEMO) return demoNo();
    if (!confirm(`${t}조 발표에 이 질문을 등록합니다. 등록 후에는 고칠 수 없습니다.\n\n${text}`)) return;
    b.disabled = true;
    try { await addQuestion(t, person(), text); ta.blur(); renderWeek(); }
    catch (e) { console.error(e); alert("등록 실패 — 질문 기간인지 확인 후 다시"); b.disabled = false; }
  });
}
async function doUpload(file, team) {
  if (DEMO) return demoNo();
  if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`${MAX_FILE_MB}MB 이하만 올릴 수 있습니다`); return; }
  if (!/\.pdf$/i.test(file.name)) { alert("PDF 파일만 올릴 수 있습니다"); return; }
  const CH = 3 * 1024 * 1024, total = Math.ceil(file.size / CH), id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const box = $("wBody"); box.dataset.busy = "1";
  const prog = t => { const el = $("prog" + team); if (el) el.textContent = t; };
  try {
    for (let i = 0; i < total; i++) {
      prog(`올리는 중 ${i + 1} / ${total}`);
      const buf = new Uint8Array(await file.slice(i * CH, (i + 1) * CH).arrayBuffer());
      let bin = ""; for (let k = 0; k < buf.length; k += 0x8000) bin += String.fromCharCode(...buf.subarray(k, k + 0x8000));
      await uploadChunk({ team, uploadId: id, idx: i, total, data: btoa(bin), name: file.name });
    }
    prog("올리기 완료");
  } catch (e) { console.error(e); prog("실패 — " + e.message); }
  setTimeout(() => { delete box.dataset.busy; renderWeek(); }, 1500);
}
async function openDeck(team) {
  if (DEMO) return demoNo();
  const w = window.open("", "_blank");
  try { const { url } = await fileUrl(team); if (w) w.location = url; else location.href = url; }
  catch (e) { if (w) w.close(); alert(e.message); }
}
async function downDeck(team) {
  if (DEMO) return demoNo();
  try { const { url } = await fileUrl(team, true); const a = document.createElement("a"); a.href = url; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { alert(e.message); }
}

const QP = new URLSearchParams(location.search);
if (Number(QP.get("team")) >= 1 && Number(QP.get("team")) <= TEAM_COUNT) S.team = Number(QP.get("team"));
start();
