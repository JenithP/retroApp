// 고양이 보리 (연결화) — 여행 중 빈집에 고양이 보리가 혼자 있다. 홈캠으로 보리를 보면서 스마트홈의 규칙과 기기 설정을 원격으로 고친다.
// 미리 들어 있는 규칙과 기기 기본 설정이 사람을 기준으로 만들어져 있어 보리에게 문제가 생긴다(더위 · 배고픔 · 사이렌 · 엎어진 물그릇).
// 원인은 규칙 목록과 기기 설정(그 기기를 크게 본 화면에서만 보임)에 나뉘어 있다. 「하루 지켜보기」가 외출한 하루를 처음부터 돌려 보고
// 홈캠 기록(증상만)을 보여준다. 현관문 알림을 지우면 「집의 안전」이 실패한다.
// 상태 · 규칙 · 기기 설정 · 실행 기록 · 확인 결과는 조마다 문서 하나(hci7_homes/T01)에 있고, 모든 조원 화면이 같은 문서를 지켜본다.
import { DEVICES, EVENTS, ACTIONS, WHEN, MAX_RULES, PRESET_RULES, SETTINGS, PRESET_SETTINGS, PRESET_STATE, evKo, actKo, homeCheck } from "./data.js";
import { watchHome, homeEvent, saveHome, clearHome, ensureHome } from "./fb.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
const store = { get: k => { try { return localStorage.getItem("newtech." + k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("newtech." + k, v); } catch { } } };
const TIME_KO = { morning: "아침 7시", noon: "낮 12시", evening: "저녁 6시", night: "밤 10시" };

/** 홈캠 — 집 상태에서 보리의 모습을 정한다 (증상만, 원인은 말하지 않음) */
function catView(s) {
  if (s.siren) return { face: "🙀", say: "소파 밑으로 숨었어요", cls: "scared" };
  if (s.vacuum) return { face: "😾", say: "청소기를 피해 책장 위로 올라갔어요", cls: "scared" };
  if ((s.temp || 0) >= 28) return { face: "🥵", say: "바닥에 배를 깔고 헐떡여요", cls: "hot" };
  if ((s.hunger || 0) >= 2) return { face: "😿", say: "밥그릇 앞에서 울어요", cls: "hungry" };
  if (!s.water) return { face: "😼", say: "엎어진 물그릇 주변을 맴돌아요", cls: "thirsty" };
  return { face: s.time === "night" ? "😴" : "😺", say: s.time === "night" ? "쿠션 위에서 자요" : "창가에서 꼬리를 흔들어요", cls: "ok" };
}

/** box 안에 보리네 집을 그린다. onCheck(pass) — 하루 지켜보기 결과 기록용 */
export function mountHome(box, { team, name, onCheck }) {
  let role = store.get("role") || "all";
  if (!DEVICES.some(d => d.id === role)) role = "all";
  let home = null, rulesDraft = null, dirty = false, unsub = null, alive = true, savedMsg = "";
  ensureHome(team).catch(e => console.error(e));

  box.innerHTML = `
    <div class="home">
      <div class="camview"></div>
      <div class="roles"><span class="muted small">이 기기의 역할</span>
        <button type="button" class="rb" data-r="all">집 전체</button>
        ${DEVICES.filter(d => d.id !== "cam").map(d => `<button type="button" class="rb" data-r="${d.id}">${d.ko}</button>`).join("")}
      </div>
      <div class="homegrid">
        <div class="stage"></div>
        <aside class="logbox"><h3>실행 기록 <button class="btn ghost small" data-a="clear" type="button">처음 상태로</button></h3><ol class="log"></ol></aside>
      </div>
      <details class="rulesview"><summary>자동화 규칙 (조 전체 공유)</summary><div class="rules"></div></details>
      <div class="callbox">
        <button class="btn primary" data-a="call" type="button">하루 지켜보기 (홈캠 기록)</button>
        <div class="callres"></div>
        <label class="field">집 관리 메모 <small>무엇을 왜 바꿨는지 — 함께 사는 가족이 알아들을 수 있게</small><textarea class="sms" rows="3" maxlength="300"></textarea></label>
        <button class="btn small" data-a="sms" type="button">메모 저장</button><span class="muted small smsmsg"></span>
      </div>
    </div>`;
  const $ = s => box.querySelector(s);
  box.querySelectorAll(".rb").forEach(b => b.onclick = () => { role = b.dataset.r; store.set("role", role); draw(); });
  $('[data-a="clear"]').onclick = () => confirm("조 전체의 기기 상태와 실행 기록을 처음으로 되돌립니다. (규칙과 기기 설정은 그대로)") && clearHome(team);
  $('[data-a="call"]').onclick = async () => {
    const res = homeCheck(home?.rules || PRESET_RULES, { ...PRESET_SETTINGS, ...(home?.settings || {}) });
    try { await saveHome(team, { check: { pass: res.pass, ok: res.tests.filter(t => t.ok).length, at: Date.now(), by: name } }); } catch (e) { console.error(e); }
    onCheck?.(res.pass);
    $(".callres").innerHTML = `<p class="muted small">외출한 하루(아침 7시 → 밤 10시)를 지금 규칙과 기기 설정으로 다시 돌려 본 홈캠 기록</p>
      <ul class="calllist">${res.tests.map(t => `<li class="${t.ok ? "ok" : "no"}">${esc(t.ok ? t.yes : t.no)}</li>`).join("")}</ul>${res.pass ? `<p class="ok">하루를 무사히 보냄 — 미션 성공</p>` : ""}`;
  };
  $('[data-a="sms"]').onclick = async () => {
    try { await saveHome(team, { sms: $(".sms").value.trim().slice(0, 300) }); $(".smsmsg").textContent = "저장됨"; }
    catch (e) { console.error(e); $(".smsmsg").textContent = "저장 실패"; }
  };

  const fire = ev => homeEvent(team, ev, name).catch(e => { console.error(e); alert("전송 실패 — 잠시 후 다시"); });

  function deviceHTML(id, big) {
    const s = { ...PRESET_STATE, ...(home?.state || {}) };
    const btns = EVENTS.filter(e => e.dev === id).map(e => `<button type="button" class="btn ${big ? "primary" : "small"}" data-ev="${e.id}">${e.btn}</button>`).join("");
    const body = {
      aircon: `<div class="icon">❄️</div><b>${s.ac ? "켜짐" : "꺼짐"} · 실내 ${s.temp}°C</b>`,
      feeder: `<div class="icon">🍽️</div><b>오늘 급식 ${s.fed || 0}회</b>`,
      vacuum: `<div class="icon">🤖</div><b>${s.vacuum ? "청소 중" : "대기"}</b>`,
      curtain: `<div class="icon">${s.curtain ? "🪟" : "🟫"}</div><b>${s.curtain ? "열림" : "닫힘"}</b>`,
      light: `<div class="bulb ${s.light ? "on" : ""}"></div><b>${s.light ? "켜짐" : "꺼짐"}</b>`,
      sensor: `<div class="icon">📡</div><b>거실 움직임 센서</b>`,
      siren: `<div class="icon">${s.siren ? "🚨" : "🔕"}</div><b>${s.siren ? "울리는 중" : "조용함"} · 오늘 ${s.sirens || 0}번</b>`,
      door: `<div class="icon">🚪</div><b>현관</b>`,
      clock: `<div class="icon">🕖</div><b>${TIME_KO[s.time] || ""}</b>`,
      phone: `<div class="icon">📱</div><b>${s.away ? "외출 모드" : "집에 있음"} · 알림 ${s.alerts || 0}개</b>`,
    }[id];
    const set = { ...PRESET_SETTINGS, ...(home?.settings || {}) };
    // 기기 기본 설정은 그 기기를 크게 볼 때(역할 선택)만 보인다 — 규칙 목록에는 없다
    const sets = big ? SETTINGS.filter(x => x.dev === id).map(x => `<label class="devset"><input type="checkbox" data-set="${x.id}"${set[x.id] ? " checked" : ""}> <b>${x.ko}</b><small>${x.desc}</small></label>`).join("") : "";
    return `<div class="dev ${big ? "big" : ""}" data-d="${id}"><h4>${DEVICES.find(d => d.id === id).ko}</h4>${body}<div class="evbtns">${btns}</div>${sets ? `<div class="devsets"><small>기기 설정</small>${sets}</div>` : ""}</div>`;
  }

  function draw() {
    if (!alive) return;
    const s = { ...PRESET_STATE, ...(home?.state || {}) }, c = catView(s);
    $(".camview").className = "camview " + c.cls + (s.time === "night" ? " night" : "");
    $(".camview").innerHTML = `<span class="camtag">● 홈캠 · ${TIME_KO[s.time] || ""}</span>
      <div class="cat">${c.face}</div><p class="catsay">보리: ${c.say}</p>
      <div class="cammeta"><span>🌡 ${s.temp}°C</span><span>🍽 ${(s.hunger || 0) >= 2 ? "빈 그릇" : "사료 있음"}</span><span>💧 ${s.water ? "물 있음" : "엎어짐"}</span></div>`;
    box.querySelectorAll(".rb").forEach(b => b.classList.toggle("on", b.dataset.r === role));
    const st = $(".stage");
    st.className = "stage" + (s.light ? " lit" : "") + (s.time === "night" ? " night" : "");
    const devs = DEVICES.filter(d => d.id !== "cam");
    st.innerHTML = role === "all"
      ? `<div class="devgrid">${devs.map(d => deviceHTML(d.id, false)).join("")}</div>`
      : `${deviceHTML(role, true)}<div class="mini">${devs.filter(d => d.id !== role).map(d => deviceHTML(d.id, false)).join("")}</div>`;
    st.querySelectorAll("[data-ev]").forEach(b => b.onclick = () => fire(b.dataset.ev));
    st.querySelectorAll("[data-set]").forEach(cb => cb.onchange = () => {
      const settings = { ...PRESET_SETTINGS, ...(home?.settings || {}), [cb.dataset.set]: cb.checked };
      saveHome(team, { settings }).catch(e => { console.error(e); alert("설정 저장 실패"); });
    });
    const log = home?.log || [];
    $(".log").innerHTML = log.length ? [...log].reverse().map(l => `<li><span class="t">${hm(l.at)}</span> <b>${esc(evKo(l.ev))}</b> <small>${esc(l.who)}</small>
      ${(l.fired || []).length ? `<ul>${l.fired.map(f => `<li>「${esc(f.note || "이름 없는 규칙")}」 → ${esc(f.act === "feed_blocked" ? "급식 안 함" : f.act === "water_spill" ? "물그릇에 부딪힘" : actKo(f.act))}</li>`).join("")}</ul>` : `<ul><li class="muted">작동한 것 없음</li></ul>`}</li>`).join("")
      : `<li class="muted">기록 없음 — 시계 · 센서 버튼으로 시작</li>`;
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
      <p class="muted small">위에서부터 차례로 실행 · 같은 기기는 나중 규칙이 이김</p>`;
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
    wrap.querySelector('[data-a="add"]').onclick = () => { collect(); rulesDraft.push({ id: "u" + Date.now().toString(36), ev: "morning", when: "any", acts: [], note: "" }); redo(); };
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
