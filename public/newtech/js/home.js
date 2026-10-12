// 연결화 체험 — 조원들의 기기가 한 집의 기기 역할을 나누어 맡고, 규칙에 따라 서로 반응한다.
// 상태 · 규칙 · 실행 기록은 조마다 문서 하나(hci7_homes/T01)에 있고, 모든 조원 화면이 같은 문서를 지켜본다.
import { DEVICES, EVENTS, ACTIONS, WHEN, MAX_RULES, PRESET_RULES, evKo, actKo } from "./data.js";
import { watchHome, homeEvent, saveHome, clearHome, ensureHome } from "./fb.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
const store = { get: k => { try { return localStorage.getItem("newtech." + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("newtech." + k, v); } catch { } } };

/** box 안에 스마트홈을 그린다. design 이 참이면 규칙 편집(2차 설계)이 열린다. onEvent(evId) — 기록용 */
export function mountHome(box, { team, name, design, onEvent }) {
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
      <details class="rulesview"${design ? " open" : ""}><summary>${design ? "우리 집 규칙 설계" : "들어 있는 규칙 보기"}</summary><div class="rules"></div></details>
    </div>`;
  const $ = s => box.querySelector(s);
  box.querySelectorAll(".rb").forEach(b => b.onclick = () => { role = b.dataset.r; store.set("role", role); draw(); });
  $('[data-a="clear"]').onclick = () => confirm("조 전체의 기기 상태와 실행 기록을 처음으로 되돌립니다.") && clearHome(team);

  function fire(ev) {
    homeEvent(team, ev, name).catch(e => { console.error(e); alert("전송 실패 — 잠시 후 다시"); });
    onEvent?.(ev);
  }

  function deviceHTML(id, big) {
    const s = home?.state || {};
    const ev = EVENTS.filter(e => e.dev === id);
    const btns = ev.map(e => `<button type="button" class="btn ${big ? "big primary" : "small"}" data-ev="${e.id}">${e.btn}</button>`).join("");
    const body = {
      light: `<div class="bulb ${s.light ? "on" : ""}"></div><b>${s.light ? "켜짐" : "꺼짐"}</b>`,
      speaker: `<div class="spk ${s.music ? "on" : ""}">${s.music ? "♪ ♫ ♪" : "—"}</div><b>${s.music ? "음악 재생 중" : "정지"}</b>`,
      aircon: `<div class="temp">${s.temp ?? 24}<small>°C</small></div><b>설정 온도</b>`,
      door: `<div class="icon">🚪</div><b>현관 센서</b>`,
      phone: `<div class="icon">📱</div><b>${s.home === false ? "외출 중" : "집에 있음"}</b>`,
      clock: `<div class="icon">${s.night ? "🌙" : "☀️"}</div><b>${s.night ? "밤" : "낮"}</b>`,
    }[id];
    return `<div class="dev ${big ? "big" : ""}" data-d="${id}"><h4>${DEVICES.find(d => d.id === id).ko}</h4>${body}<div class="evbtns">${btns}</div></div>`;
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
    const log = home?.log || [];
    $(".log").innerHTML = log.length ? [...log].reverse().map(l => `<li><span class="t">${hm(l.at)}</span> <b>${esc(evKo(l.ev))}</b> <small>${esc(l.who)}</small>
      ${(l.fired || []).length ? `<ul>${l.fired.map(f => `<li>규칙 ${esc(ruleNo(f.rule))} ${f.note ? `「${esc(f.note)}」` : ""} → ${esc(actKo(f.act))}</li>`).join("")}</ul>` : `<ul><li class="muted">걸린 규칙 없음</li></ul>`}</li>`).join("")
      : `<li class="muted">기록 없음 — 이벤트 버튼으로 시작</li>`;
    drawRules();
  }
  const ruleNo = id => { const i = (home?.rules || []).findIndex(r => r.id === id); return i < 0 ? "?" : String(i + 1); };

  function drawRules() {
    const wrap = $(".rules");
    const rules = design ? (rulesDraft ||= JSON.parse(JSON.stringify(home?.rules || PRESET_RULES))) : (home?.rules || []);
    if (!design) {
      wrap.innerHTML = `<ol class="rulelist">${rules.map(r => `<li><b>${esc(evKo(r.ev))}</b>${r.when !== "any" ? ` (${WHEN[r.when]})` : ""} → ${r.acts.map(actKo).join(", ")} ${r.note ? `<small>「${esc(r.note)}」</small>` : ""}</li>`).join("")}</ol>
        <p class="muted small">위에서부터 차례로 실행 · 같은 기기는 나중 규칙이 이김</p>`;
      return;
    }
    if (wrap.contains(document.activeElement) && dirty) return;   // 입력 중에는 다시 그리지 않는다
    wrap.innerHTML = `
      <label class="field">설계 목적 <small>누구의 어떤 불편을 줄이는 규칙인가</small><input class="purpose" maxlength="120" value="${esc(home?.purpose || "")}"></label>
      <ol class="ruleedit">${rules.map((r, i) => `<li data-i="${i}">
        <select data-k="ev">${EVENTS.map(e => `<option value="${e.id}"${e.id === r.ev ? " selected" : ""}>${e.ko}</option>`).join("")}</select>
        <select data-k="when">${Object.entries(WHEN).map(([k, v]) => `<option value="${k}"${k === r.when ? " selected" : ""}>${v}</option>`).join("")}</select>
        <span>→</span>
        <span class="acts">${ACTIONS.map(a => `<label><input type="checkbox" value="${a.id}"${r.acts.includes(a.id) ? " checked" : ""}>${a.ko}</label>`).join("")}</span>
        <input data-k="note" maxlength="30" placeholder="규칙 이름" value="${esc(r.note || "")}">
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
    wrap.oninput = wrap.onchange = () => { dirty = true; collect(); savedMsg = "저장 안 됨"; wrap.querySelector(".saved").textContent = savedMsg; };
    wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { collect(); rulesDraft.splice(Number(b.dataset.del), 1); dirty = true; wrap.blur?.(); document.activeElement?.blur(); drawRules(); });
    wrap.querySelector('[data-a="add"]').onclick = () => { collect(); rulesDraft.push({ id: "u" + Date.now().toString(36), ev: "door", when: "any", acts: [], note: "" }); dirty = true; document.activeElement?.blur(); drawRules(); };
    wrap.querySelector('[data-a="save"]').onclick = async () => {
      collect();
      const purpose = wrap.querySelector(".purpose").value.trim().slice(0, 120);
      try {
        await saveHome(team, { rules: rulesDraft.filter(r => r.acts.length), purpose });
        dirty = false;
        rulesDraft = null;
        savedMsg = "저장됨";
        document.activeElement?.blur();
        drawRules();
      } catch (e) { console.error(e); savedMsg = "저장 실패 — 2차 체험 단계인지 확인 후 다시"; wrap.querySelector(".saved").textContent = savedMsg; }
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
