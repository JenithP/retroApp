// 조별 발표 — 학생 화면. 문헌 신청 → 발표 일정 → 우리 조 발표 자료 올리기 → 열린 발표마다 질문 하나 → 채택된 질문
import { TEAM_COUNT, MAX_TEAMS_PER_PAPER, UPLOAD_DEADLINE, MAX_FILE_MB, WEEKS, PAPERS, teamId, teamLabel, paperOf, weekLabel, fmt } from "./data.js";
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

/* ── 입장 ─────────────────────────────────────────── */
function renderJoin() {
  $("teamPick").innerHTML = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(t => `<button type="button" class="tp${S.team === t ? " on" : ""}" data-t="${t}"><b>${t}조</b></button>`).join("");
  $("teamPick").querySelectorAll(".tp").forEach(b => b.onclick = () => { S.team = Number(b.dataset.t); renderJoin(); });
  $("mySid").value = S.sid; $("myName").value = S.name;
  const check = () => $("joinBtn").disabled = !(S.team && /^\d{6,12}$/.test($("mySid").value.trim()) && $("myName").value.trim());
  $("mySid").oninput = $("myName").oninput = check;
  check();
}
$("joinBtn").onclick = async () => {
  S.sid = $("mySid").value.trim(); S.name = $("myName").value.trim();
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
  $("meChip").textContent = `${teamLabel(S.team)} · ${S.name}`;
  $("meChip").onclick = () => { if (confirm("조 · 학번 · 이름을 다시 입력하시겠습니까?")) { store.set("team", ""); location.reload(); } };
  document.querySelectorAll(".ptab").forEach(b => b.onclick = () => { S.view = b.dataset.v; store.set("view", S.view); tab(); });
  tab();
  renderAll();   // 문헌 목록은 데이터 없이도 바로 보이게
  watchState(st => { S.state = st; renderAll(); });
  watchPicks(p => { S.picks = p; renderAll(); });
  watchFiles(f => { S.files = f; renderAll(); });
  watchSelect(s => { S.select = s; renderPicked(); });
  watchMyQuestions(q => { S.myQ = q; renderAsk(); });
  setInterval(renderAll, 30000);   // 열람 시각 · 마감이 지나면 화면이 바뀌도록
}
function show(id) { ["vJoin", "vMain"].forEach(v => $(v).hidden = v !== id); }
function tab() {
  document.querySelectorAll(".ptab").forEach(b => b.classList.toggle("on", b.dataset.v === S.view));
  document.querySelectorAll(".pv").forEach(v => v.hidden = v.id !== "pv-" + S.view);
}
function renderAll() { renderPapers(); renderSchedule(); renderUpload(); renderAsk(); renderPicked(); }

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

/* ── 발표 일정 ───────────────────────────────────────── */
function renderSchedule() {
  const slots = S.state.slots || {};
  if (!Object.keys(slots).length) { $("schedule").innerHTML = `<p class="muted">아직 발표 순서가 정해지지 않음</p>`; return; }
  $("schedule").innerHTML = WEEKS.map((_, w) => {
    const rows = Object.entries(slots).filter(([, s]) => s.week === w).sort((a, b) => a[1].order - b[1].order);
    if (!rows.length) return "";
    const open = rows[0][1].open;
    return `<div class="week"><h3>${weekLabel(w)} <small>자료 공개 ${open ? fmt(open) : ""}</small></h3>
      <ol>${rows.map(([id, s]) => { const t = Number(id.slice(1)), p = paperOf(S.picks[id]?.paper);
        return `<li class="${t === S.team ? "me" : ""}"><b>${s.order}. ${t}조</b> <span>${p ? esc(p.title) : "문헌 미신청"}</span> ${S.files[id] ? `<em class="okmark">자료 있음</em>` : `<em class="muted">자료 없음</em>`}</li>`; }).join("")}</ol></div>`;
  }).join("");
}

/* ── 우리 조 발표 자료 ─────────────────────────────────── */
function renderUpload() {
  const f = S.files[teamId(S.team)], closed = Date.now() > UPLOAD_DEADLINE.getTime();
  const slot = S.state.slots?.[teamId(S.team)];
  $("upLead").textContent = `PDF만 · ${MAX_FILE_MB}MB 이하 · 마감 ${fmt(UPLOAD_DEADLINE)} · 다시 올리면 바뀜${slot ? ` · 우리 조 발표 ${weekLabel(slot.week)} ${slot.order}번째` : ""}`;
  if ($("upBox").dataset.busy) return;
  $("upBox").innerHTML = `
    <div class="upstat">${f ? `<b>올라온 자료</b> ${esc(f.name)} · ${(f.size / 1024 / 1024).toFixed(1)}MB · ${fmt(new Date(f.at))} <button class="btn small" id="upView" type="button">열어 보기</button>` : `<span class="muted">아직 올라온 자료 없음</span>`}</div>
    ${closed ? `<p class="note">업로드 마감</p>` : `<label class="btn primary">PDF 고르기<input type="file" id="upFile" accept="application/pdf,.pdf" hidden></label><p class="muted small">PPT는 「다른 이름으로 저장 → PDF」로 바꿔서 올리기 · AI가 이 PDF를 읽고 질문을 고름</p>`}
    <div class="upprog" id="upProg"></div>`;
  $("upView")?.addEventListener("click", () => openDeck(S.team));
  $("upFile")?.addEventListener("change", e => e.target.files[0] && doUpload(e.target.files[0]));
}
async function doUpload(file) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`${MAX_FILE_MB}MB 이하만 올릴 수 있습니다`); return; }
  if (!/\.pdf$/i.test(file.name)) { alert("PDF 파일만 올릴 수 있습니다"); return; }
  const CH = 3 * 1024 * 1024, total = Math.ceil(file.size / CH), id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const box = $("upBox"); box.dataset.busy = "1";
  const prog = t => $("upProg").textContent = t;
  try {
    for (let i = 0; i < total; i++) {
      prog(`올리는 중 ${i + 1} / ${total}`);
      const buf = new Uint8Array(await file.slice(i * CH, (i + 1) * CH).arrayBuffer());
      let bin = ""; for (let k = 0; k < buf.length; k += 0x8000) bin += String.fromCharCode(...buf.subarray(k, k + 0x8000));
      await uploadChunk({ team: S.team, uploadId: id, idx: i, total, data: btoa(bin), name: file.name });
    }
    prog("올리기 완료");
  } catch (e) { console.error(e); prog("실패 — " + e.message); }
  delete box.dataset.busy;
  setTimeout(renderUpload, 1500);
}
async function openDeck(team) {
  const w = window.open("", "_blank");
  try { const { url } = await fileUrl(team); if (w) w.location = url; else location.href = url; }
  catch (e) { if (w) w.close(); alert(e.message); }
}

/* ── 질문하기 ───────────────────────────────────────── */
function renderAsk() {
  const now = Date.now(), slots = S.state.slots || {};
  const open = Object.entries(slots).filter(([id, s]) => Number(id.slice(1)) !== S.team && s.open && s.open.getTime() <= now)
    .sort((a, b) => a[1].week - b[1].week || a[1].order - b[1].order);
  const pending = open.filter(([id, s]) => s.close.getTime() > now && !S.myQ[`${id}_${me.uid}`]).length;
  $("askBadge").hidden = !pending; $("askBadge").textContent = pending;
  if (!open.length) { $("asks").innerHTML = `<p class="muted">아직 열린 발표 자료 없음 — 발표 1주일 전 정오에 열림</p>`; return; }
  const typing = $("asks").contains(document.activeElement) ? document.activeElement : null;
  if (typing && typing.tagName === "TEXTAREA") return;   // 쓰는 중에는 다시 그리지 않는다
  $("asks").innerHTML = open.map(([id, s]) => {
    const t = Number(id.slice(1)), p = paperOf(S.picks[id]?.paper), q = S.myQ[`${id}_${me.uid}`], closed = s.close.getTime() <= now;
    return `<article class="ask"><div class="ahead"><div><b>${t}조</b> <span class="muted small">${weekLabel(s.week)} ${s.order}번째 발표</span><h3>${p ? esc(p.title) : "문헌 미신청"}</h3></div>
      ${S.files[id] ? `<button class="btn small" data-open="${t}" type="button">발표 자료 열기</button>` : `<span class="muted small">자료 없음</span>`}</div>
      ${q ? `<div class="myq"><small>내 질문 · ${fmt(new Date(q.at))}</small><p>${esc(q.text)}</p></div>`
        : closed ? `<p class="muted small">질문 마감 (${fmt(s.close)})</p>`
        : `<div class="qform"><textarea rows="3" maxlength="300" data-q="${t}" placeholder="발표 자료를 읽고 질문 하나 — 핵심 주장 · 방법 · 한계 · 우리 실습과의 연결"></textarea>
           <div class="qfoot"><span class="muted small">마감 ${fmt(s.close)} · 등록 후 수정 불가</span><button class="btn primary small" data-send="${t}" type="button">질문 등록</button></div></div>`}
    </article>`;
  }).join("");
  $("asks").querySelectorAll("[data-open]").forEach(b => b.onclick = () => openDeck(Number(b.dataset.open)));
  $("asks").querySelectorAll("[data-send]").forEach(b => b.onclick = async () => {
    const t = Number(b.dataset.send), ta = $("asks").querySelector(`textarea[data-q="${t}"]`), text = ta.value.trim();
    if (text.length < 10) { alert("질문을 10자 이상 써 주십시오"); return; }
    if (!confirm(`${t}조 발표에 이 질문을 등록합니다. 등록 후에는 고칠 수 없습니다.\n\n${text}`)) return;
    b.disabled = true;
    try { await addQuestion(t, person(), text); ta.blur(); }
    catch (e) { console.error(e); alert("등록 실패 — 질문 기간인지 확인 후 다시"); b.disabled = false; }
  });
}

/* ── 채택된 질문 ─────────────────────────────────────── */
function renderPicked() {
  const rows = Object.entries(S.select).filter(([, s]) => s.revealed > 0).sort();
  $("picked").innerHTML = rows.length ? rows.map(([id, s]) => {
    const p = paperOf(S.picks[id]?.paper);
    return `<div class="week"><h3>${Number(id.slice(1))}조 발표 <small>${p ? esc(p.title) : ""} · 등록 질문 ${s.total || ""}개 중</small></h3>
      <ol>${s.picks.slice(0, s.revealed).map(q => `<li class="${q.sid === S.sid ? "me" : ""}"><p>${esc(q.text)}</p><small>${esc(q.reason)}${q.sid === S.sid ? " · <b>내 질문 채택 — 보너스 1점</b>" : ""}</small></li>`).join("")}</ol></div>`;
  }).join("") : `<p class="muted">아직 없음 — 발표 날 공개</p>`;
}

const QP = new URLSearchParams(location.search);
if (Number(QP.get("team")) >= 1 && Number(QP.get("team")) <= TEAM_COUNT) S.team = Number(QP.get("team"));
start();
