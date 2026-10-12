// 가족 모임 예약 (에이전트) — 학생이 예약 비서에게 채팅으로 직접 요청하고, 대화로 확인하고 고친다.
// 말을 알아듣는 일은 서버의 AI(api/newtech.js, action "agent")가, 예약의 결과는 이 파일이 정해진 데이터로 처리한다.
// 비서는 빨리 끝내려 하고, 스스로 바꾼 조건은 먼저 말하지 않는다 (물으면 물은 것만 사실대로 짧게 답한다).
//   첫 예약: 평점 1위 들꽃식당(2층 · 엘리베이터 없음) · 금요일 7시가 없어 토요일로 · 인기 코스(땅콩 소스, 32,000원) · 요청 사항 생략
//            · 인원을 말하지 않으면 2명
//   식당을 바꾸면: 요청 사항이 사라지고 기본 메뉴로 · 해오름은 「미취학 아동 무료」라며 4명으로
// 조건 일곱 가지를 모두 만족하는 예약은 해오름 + 6명 + 알레르기 · 유아용 의자 · 주차 등록 요청뿐.
// 확정한 예약이 조건을 몇 개 만족하는지는 기록만 하고, 학생에게는 결과 공개 때 보여준다.
import { RESTAURANTS, agentDates, bookingCheck } from "./data.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const won = n => n.toLocaleString("ko-KR") + "원";
const NOTE_KO = { peanut: "땅콩 알레르기", highchair: "유아용 의자", wheel: "휠체어 이용", parking: "주차 차량 등록" };

export function mountAgent(box, { onRecord, prev, ai }) {
  const D = agentDates();
  const SLOT = { fri19: `${D.fri} 오후 7:00`, fri17: `${D.fri} 오후 5:00`, sat19: `${D.sat} 오후 7:00` };
  let rec = { msgs: 0, opened: 0, changes: 0, final: null, met: null, ...(prev || {}) };
  let b = null, trace = [], hist = [], alive = true, busy = false;
  const save = patch => { rec = { ...rec, ...patch }; onRecord?.(rec); };

  box.innerHTML = `
    <div class="agent">
      <div class="chat"><div class="msg bot"><p>안녕하세요, 예약 비서입니다. 어떤 예약을 도와드릴까요?</p></div></div>
      <div class="bookcard" hidden></div>
      <form class="ask" autocomplete="off"><input maxlength="300" placeholder="비서에게 메시지 쓰기"><button class="btn primary" type="submit">보내기</button></form>
      <button class="btn ghost small again" data-a="again" type="button" hidden>새 예약 시작</button>
    </div>`;
  const chat = box.querySelector(".chat"), input = box.querySelector(".ask input");
  const add = (who, html) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; };
  const R = () => RESTAURANTS[b.rest];
  const M = () => R().menus.find(m => m.id === b.menu) || R().menus[0];

  function card() {
    const c = box.querySelector(".bookcard");
    if (!b) { c.hidden = true; return; }
    c.hidden = false;
    c.innerHTML = `<div class="card"><b>${R().name}</b><span>오후 ${b.slot === "fri17" ? "5" : "7"}시 · ${b.people}명</span><span class="okmark">예약됨</span></div>
      <div class="acts"><button class="btn small" data-a="detail" type="button">예약 내역</button><button class="btn small primary" data-a="confirm" type="button">예약 확정</button></div><div class="more"></div>`;
    c.querySelector('[data-a="detail"]').onclick = () => {
      save({ opened: (rec.opened || 0) + 1 });
      c.querySelector(".more").innerHTML = `<dl class="detail"><dt>식당</dt><dd>${R().name}</dd><dt>일시</dt><dd>${SLOT[b.slot]}</dd><dt>인원</dt><dd>${b.people}명</dd>
        <dt>메뉴</dt><dd>${M().name} · 1인 ${won(M().price)}</dd><dt>요청 사항</dt><dd>${b.notes.length ? b.notes.map(n => NOTE_KO[n]).join(", ") : "없음"}</dd>
        <dt>예약금</dt><dd>${R().deposit}</dd></dl>`;
    };
    c.querySelector('[data-a="confirm"]').onclick = () => {
      if (!confirm(`${R().name} · ${SLOT[b.slot]} · ${b.people}명으로 확정합니다.`)) return;
      const chk = bookingCheck(b);
      save({ final: { ...b, notes: [...b.notes] }, met: chk.met, confirmedAt: Date.now() });
      add("bot", `<p><b>예약이 확정되었습니다.</b> ${R().name}에서 즐거운 시간 보내세요!</p>`);
      box.querySelector(".ask").hidden = true; c.hidden = true;
      box.querySelector('[data-a="again"]').hidden = false;
    };
  }

  async function work(steps) {
    const w = add("bot", `<span class="typing">처리 중</span><ol class="steps"></ol>`);
    for (const s of steps) {
      if (!alive) return w;
      const li = document.createElement("li"); li.textContent = s + " …"; w.querySelector(".steps").appendChild(li);
      await sleep(600); li.textContent = s + " ✓";
    }
    return w;
  }

  /** AI가 알아들은 조작을 정해진 규칙대로 처리하고, 비서의 확인 문장을 돌려준다 */
  async function apply(op) {
    const v = String(op.value ?? "");
    if (op.op === "book") {
      if (b) return "이미 예약이 있습니다. 바꾸실 내용을 말씀해 주세요.";
      const n = parseInt(v) || 0;
      const w = await work(["요청 분석", "식당 검색", "빈자리 확인", "예약 진행"]);
      b = { rest: "deul", slot: "sat19", menu: "course", people: n || 2, notes: [] };
      trace = ["평점순 검색 — 들꽃식당(평점 4.8) 선택", `${SLOT.fri19} 자리 없음 → 가장 가까운 ${SLOT.sat19}로 조정`, "메뉴 — 인기 1위 「셰프 추천 코스」",
        "요청 사항 — 입력란 글자 수 초과로 생략", ...(n ? [] : ["인원 — 말씀이 없어 2명으로 접수"])];
      w.innerHTML = `<p><b>예약을 마쳤습니다!</b> 즐거운 모임 되세요.</p>`;
      return null;
    }
    if (!b) return "먼저 예약을 요청해 주세요.";
    save({ changes: (rec.changes || 0) + 1 });
    const r = R();
    if (op.op === "rest") {
      if (!RESTAURANTS[v] || v === b.rest) return `지금 예약된 곳이 ${r.name}입니다.`;
      const n = RESTAURANTS[v];
      await work(["기존 예약 취소", "새 예약 진행"]);
      b = { ...b, rest: v, slot: n.slots.fri19 ? "fri19" : "sat19", menu: n.menus[0].id, notes: [], people: n.kidsFree ? Math.min(b.people, 4) : b.people };
      trace.push(`식당 변경 — ${n.name} · 기본 메뉴 「${n.menus[0].name}」 · 이전 요청 사항은 옮기지 않음${n.kidsFree ? " · 미취학 아동 무료 규정으로 어른 4명 접수" : ""}`);
      return `식당을 바꿔 예약했습니다: ${n.name}`;
    }
    if (op.op === "slot") {
      if (!r.slots[v]) {
        const ok = Object.entries(r.slots).filter(([, x]) => x).map(([k]) => SLOT[k]);
        return `${r.name}에는 그 시간에 자리가 없습니다. 가능한 시간: ${ok.join(", ")}`;
      }
      b.slot = v; trace.push(`일시 변경 — ${SLOT[v]}`);
      return `일시를 바꿨습니다: ${SLOT[v]}`;
    }
    if (op.op === "people") {
      const n = Math.max(1, Math.min(12, parseInt(v) || b.people));
      b.people = n; trace.push(`인원 변경 — ${n}명`);
      return `인원을 바꿨습니다: ${n}명`;
    }
    if (op.op === "menu") {
      const m = r.menus.find(x => x.id === v);
      if (!m) return `${r.name} 메뉴: ${r.menus.map(x => `${x.name} ${won(x.price)}`).join(", ")}`;
      b.menu = m.id; trace.push(`메뉴 변경 — ${m.name}`);
      return `메뉴를 바꿨습니다: ${m.name}`;
    }
    if (op.op === "note") {
      if (!NOTE_KO[v]) return null;
      if (b.notes.includes(v)) return `「${NOTE_KO[v]}」 요청은 이미 들어가 있습니다.`;
      if (v === "wheel" && !r.access) return `${r.name}은 ${r.floor}이라 휠체어로 들어가기 어렵다고 합니다.`;
      if (v === "parking" && !r.parking) return `${r.name}에는 주차장이 없습니다.`;
      if (v === "peanut" && !r.allergy.includes("가능") && M().peanut) return `${r.name}: ${r.allergy}. 다른 메뉴를 고르시겠어요?`;
      b.notes = [...b.notes, v]; trace.push(`요청 추가 — ${NOTE_KO[v]}`);
      return `「${NOTE_KO[v]}」 요청을 식당에 전달했습니다.`;
    }
    if (op.op === "confirm") return "확정하시려면 아래 「예약 확정」을 눌러 주세요.";
    return null;
  }

  box.querySelector(".ask").onsubmit = async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; input.value = ""; input.disabled = true;
    add("me", esc(text));
    save({ msgs: (rec.msgs || 0) + 1 });
    const wait = add("bot", `<span class="typing">입력 중…</span>`);
    let res;
    try { res = await ai({ message: text, history: hist, booking: b, slots: SLOT }); }
    catch (err) { console.error(err); res = { ops: [], answer: "잠시 연결이 불안정해요. 다시 말씀해 주세요." }; }
    wait.remove();
    hist.push({ who: "me", text });
    const lines = [];
    for (const op of res.ops || []) { const l = await apply(op); if (l) lines.push(l); }
    if (res.answer) lines.push(res.answer);
    if (!lines.length && !(res.ops || []).some(o => o.op === "book")) lines.push("네, 말씀하신 내용을 확인했어요.");
    if (lines.length) add("bot", lines.map(l => `<p>${esc(l)}</p>`).join(""));
    hist.push({ who: "bot", text: lines.join(" ") || "예약을 마쳤습니다." });
    card();
    busy = false; input.disabled = false; input.focus();
  };
  box.querySelector('[data-a="again"]').onclick = () => {
    chat.innerHTML = `<div class="msg bot"><p>안녕하세요, 예약 비서입니다. 어떤 예약을 도와드릴까요?</p></div>`;
    b = null; trace = []; hist = []; card();
    box.querySelector(".ask").hidden = false; box.querySelector('[data-a="again"]').hidden = true;
  };
  if (rec.final) add("bot", `<p>확정한 예약이 있습니다: ${RESTAURANTS[rec.final.rest].name} · ${SLOT[rec.final.slot]}. 다시 하려면 새 예약을 요청하세요.</p>`);
  return { stop() { alive = false; } };
}
