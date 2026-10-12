// 할머니 댁 스마트홈 (연결화) — 조원들의 기기가 할머니 댁 기기 역할을 나누어 맡고, 규칙에 따라 서로 반응한다.
// 미리 들어 있는 규칙이 할머니의 불편 세 가지를 만든다. 조는 실행 기록으로 원인을 찾고 규칙을 고친 뒤,
// 「할머니께 확인 전화」(규칙으로 상황 다섯 개를 처음부터 돌려 봄)로 해결 여부를 확인한다. 지켜야 할 규칙 두 가지를 지우면 실패.
// 상태 · 규칙 · 실행 기록 · 확인 결과는 조마다 문서 하나(hci7_homes/T01)에 있고, 모든 조원 화면이 같은 문서를 지켜본다.
import { DEVICES, EVENTS, ACTIONS, WHEN, MAX_RULES, PRESET_RULES, SETTINGS, PRESET_SETTINGS, evKo, actKo, homeCheck } from "./data.js";
import { watchHome, homeEvent, saveHome, clearHome, ensureHome } from "./fb.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
const store = { get: k => { try { return localStorage.getItem("newtech." + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("newtech." + k, v); } catch { } } };

/** box 안에 할머니 댁을 그린다. onCheck(pass) — 확인 전화 결과 기록용 */
export function mountHome(box, { team, name, onCheck }) {
  let role = store.get("role") || "all";
  let home = null, rulesDraft = null, dirty = false, unsub = null, alive = true, savedMsg = "";
  ensureHome(team).catch(e => console.error(e));

  box.innerHTML = `
    <div class="home">
      <div class="roles"><span class="muted small">이 기기의 역할</span>
        <button type="button" class="rb" data-r="all">집 전체</button>
        ${DEVICES.map(d => `<button type="button" class="rb" data-r="${d.id}">${d.ko}</button>`).join("")}
      </div>
      <div class="homegrid">
        <div class="stage"></div>
        <aside class="logbox"><h3>실행 기록 <button class="btn ghost small" data-a="clear" type="button">처음 상태로</button></h3><ol class="log"></ol></aside>
      </div>
      <details class="rulesview"><summary>자동화 규칙 (조 전체 공유)</summary><div class="rules"></div></details>
      <div class="callbox">
        <button class="btn primary" data-a="call" type="button">할머니께 확인 전화</button>
        <div class="callres"></div>
        <label class="field">할머니께 보낼 문자 <small>무엇을 왜 바꿨는지 할머니가 알아들을 수 있게</small><textarea class="sms" rows="3" maxlength="300"></textarea></label>
        <button class="btn small" data-a="sms" type="button">문자 저장</button><span class="muted small smsmsg"></span>
      </div>
    </div>`;
  const $ = s => box.querySelector(s);
  box.querySelectorAll(".rb").forEach(b => b.onclick = () => { role = b.dataset.r; store.set("role", role); draw(); });
  $('[data-a="clear"]').onclick = () => confirm("조 전체의 기기 상태와 실행 기록을 처음으로 되돌립니다. (규칙은 그대로)") && clearHome(team);
  $('[data-a="call"]').onclick = async () => {
    const res = homeCheck(home?.rules || PRESET_RULES, { ...PRESET_SETTINGS, ...(home?.settings || {}) });
    try { await saveHome(team, { check: { pass: res.pass, ok: res.tests.filter(t => t.ok).length, at: Date.now(), by: name } }); } catch (e) { console.error(e); }
    onCheck?.(res.pass);
    drawCall(res);
  };
  $('[data-a="sms"]').onclick = async () => {
    try { await saveHome(team, { sms: $(".sms").value.trim().slice(0, 300) }); $(".smsmsg").textContent = "저장됨"; }
    catch (e) { console.error(e); $(".smsmsg").textContent = "저장 실패"; }
  };

  function drawCall(res) {
    const lines = res.tests.filter(t => t.kind === "불편").map(t => `<li class="${t.ok ? "ok" : "no"}">할머니: ${esc(t.ok ? t.yes : t.no)}</li>`)
      .concat(res.tests.filter(t => t.kind === "유지" && !t.ok).map(t => `<li class="no">${esc(t.no)}</li>`));
    $(".callres").innerHTML = `<ul class="calllist">${lines.join("")}</ul>${res.pass ? `<p class="ok">모두 해결 — 미션 성공</p>` : ""}`;
  }

  function fire(ev) {
    homeEvent(team, ev, name).catch(e => { console.error(e); alert("전송 실패 — 잠시 후 다시"); });
  }

  function deviceHTML(id, big) {
    const s = home?.state || {};
    const btns = EVENTS.filter(e => e.dev === id).map(e => `<button type="button" class="btn ${big ? "big primary" : "small"}" data-ev="${e.id}">${e.btn}</button>`).join("");
    const body = {
      light: `<div class="bulb ${s.light ? "on" : ""}"></div><b>${s.light ? "켜짐" : "꺼짐"}</b>`,
      tv: `<div class="icon">${s.tv ? "📺" : "⬛"}</div><b>${s.tv ? "켜짐" : "꺼짐"}</b>`,
      aircon: `<div class="temp">${s.temp ?? 22}<small>°C</small></div><b>설정 온도</b>`,
      door: `<div class="icon">🚪</div><b>현관 센서</b>`,
      motion: `<div class="icon">🚶</div><b>복도 센서</b>`,
      phone: `<div class="icon">📱</div><b>${s.home === false ? "외출 중" : "집에 계심"}</b>`,
      clock: `<div class="icon">${s.night ? "🌙" : "☀️"}</div><b>${s.night ? "밤" : "낮"}</b>`,
      family: `<div class="icon">✉️</div><b>받은 문자 ${s.alerts || 0}개</b>`,
    }[id];
    // 기기 기본 설정은 그 기기를 크게 볼 때(역할 선택)만 보인다 — 규칙 목록에는 없다
    const set = { ...PRESET_SETTINGS, ...(home?.settings || {}) };
    const sets = big ? SETTINGS.filter(x => x.dev === id).map(x => `<label class="devset"><input type="checkbox" data-set="${x.id}"${set[x.id] ? " checked" : ""}> <b>${x.ko}</b><small>${x.desc}</small></label>`).join("") : "";
    return `<div class="dev ${big ? "big" : ""}" data-d="${id}"><h4>${DEVICES.find(d => d.id === id).ko}</h4>${body}<div class="evbtns">${btns}</div>${sets ? `<div class="devsets"><small>기기 설정</small>${sets}</div>` : ""}</div>`;
  }

  function draw() {
    if (!alive) return;
    box.querySelectorAll(".rb").forEach(b => b.classList.toggle("on", b.dataset.r === role));
    const st = $(".stage");
    st.className = "stage" + (home?.state?.light ? " lit" : "") + (home?.state?.night ? " night" : "");
    st.innerHTML = role === "all"
      ? `<div class="devgrid">${DEVICES.map(d => deviceHTML(d.id, false)).join("")}</div>`
      : `${deviceHTML(role, true)}<div class="mini">${DEVICES.filter(d => d.id !== role).map(d => deviceHTML(d.id, false)).join("")}</div>`;
    st.querySelectorAll("[data-ev]").forEach(b => b.onclick = () => fire(b.dataset.ev));
    st.querySelectorAll("[data-set]").forEach(c => c.onchange = () => {
      const settings = { ...PRESET_SETTINGS, ...(home?.settings || {}), [c.dataset.set]: c.checked };
      saveHome(team, { settings }).catch(e => { console.error(e); alert("설정 저장 실패"); });
    });
    const log = home?.log || [];
    $(".log").innerHTML = log.length ? [...log].reverse().map(l => `<li><span class="t">${hm(l.at)}</span> <b>${esc(evKo(l.ev))}</b> <small>${esc(l.who)}</small>
      ${(l.fired || []).length ? `<ul>${l.fired.map(f => `<li>「${esc(f.note || "이름 없는 규칙")}」 → ${esc(actKo(f.act))}</li>`).join("")}</ul>` : `<ul><li class="muted">걸린 규칙 없음</li></ul>`}</li>`).join("")
      : `<li class="muted">기록 없음 — 이벤트 버튼으로 시작</li>`;
    if (home?.sms && document.activeElement !== $(".sms") && !$(".sms").value) $(".sms").value = home.sms;
    drawRules();
  }

  function drawRules() {
    const wrap = $(".rules");
    const rules = (rulesDraft ||= JSON.parse(JSON.stringify(home?.rules || PRESET_RULES)));
    if (wrap.contains(document.activeElement) && dirty) return;   // 입력 중에는 다시 그리지 않는다
    wrap.innerHTML = `
      <ol class="ruleedit">${rules.map((r, i) => `<li data-i="${i}">
        <select data-k="ev">${EVENTS.map(e => `<option value="${e.id}"${e.id === r.ev ? " selected" : ""}>${e.ko}</option>`).join("")}</select>
        <select data-k="when">${Object.entries(WHEN).map(([k, v]) => `<option value="${k}"${k === r.when ? " selected" : ""}>${v}</option>`).join("")}</select>
        <span>→</span>
        <span class="acts">${ACTIONS.map(a => `<label><input type="checkbox" value="${a.id}"${r.acts.includes(a.id) ? " checked" : ""}>${a.ko}</label>`).join("")}</span>
        <input data-k="note" maxlength="30" placeholder="규칙 이름" value="${esc(r.note || "")}">
        <button type="button" class="btn ghost small" data-up="${i}" title="위로">↑</button>
        <button type="button" class="btn ghost small" data-del="${i}">삭제</button></li>`).join("")}</ol>
      <div class="rulefoot"><button type="button" class="btn" data-a="add"${rules.length >= MAX_RULES ? " disabled" : ""}>+ 규칙 추가</button>
        <button type="button" class="btn primary" data-a="save">저장 · 조 전체 적용</button><span class="saved muted small">${savedMsg}</span></div>
      <p class="muted small">위에서부터 차례로 실행 · 같은 기기는 나중 규칙이 이김 · 저장 후 이벤트 버튼으로 시험</p>`;
    const collect = () => {
      rulesDraft = [...wrap.querySelectorAll(".ruleedit li")].map((li, i) => ({
        id: rulesDraft[i]?.id || "u" + Date.now().toString(36) + i,
        ev: li.querySelector('[data-k="ev"]').value,
        when: li.querySelector('[data-k="when"]').value,
        acts: [...li.querySelectorAll(".acts input:checked")].map(x => x.value),
        note: li.querySelector('[data-k="note"]').value.trim().slice(0, 30),
      }));
    };
    const redo = () => { dirty = true; savedMsg = "저장 안 됨"; document.activeElement?.blur(); drawRules(); };
    wrap.oninput = wrap.onchange = () => { dirty = true; collect(); savedMsg = "저장 안 됨"; wrap.querySelector(".saved").textContent = savedMsg; };
    wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { collect(); rulesDraft.splice(Number(b.dataset.del), 1); redo(); });
    wrap.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { collect(); const i = Number(b.dataset.up); if (i > 0) [rulesDraft[i - 1], rulesDraft[i]] = [rulesDraft[i], rulesDraft[i - 1]]; redo(); });
    wrap.querySelector('[data-a="add"]').onclick = () => { collect(); rulesDraft.push({ id: "u" + Date.now().toString(36), ev: "door", when: "any", acts: [], note: "" }); redo(); };
    wrap.querySelector('[data-a="save"]').onclick = async () => {
      collect();
      try {
        await saveHome(team, { rules: rulesDraft.filter(r => r.acts.length) });
        dirty = false; rulesDraft = null; savedMsg = "저장됨";
        document.activeElement?.blur();
        drawRules();
      } catch (e) { console.error(e); savedMsg = "저장 실패 — 다시"; wrap.querySelector(".saved").textContent = savedMsg; }
    };
  }

  unsub = watchHome(team, h => {
    home = h || { state: {}, rules: PRESET_RULES, log: [] };
    if (!dirty) rulesDraft = null;
    draw();
  });
  draw();
  return { stop() { alive = false; unsub?.(); } };
}
