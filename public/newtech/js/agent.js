// 가족 모임 예약 (에이전트) — 예약 비서가 여러 단계를 대신 처리하고 「완료」 요약만 보여준다.
// 조건 일곱 가지 가운데 여럿을 말없이 바꾼다: 평점 높은 식당(2층 · 엘리베이터 없음) · 토요일로 날짜 조정 · 비싼 코스(땅콩 소스) ·
// 요청 사항 생략. 식당을 바꾸면 요청 사항이 다시 사라진다. 모든 조건을 만족하는 예약은 해오름 + 정식 B(또는 알레르기 요청) + 유아용 의자 요청뿐.
// 무엇을 열어 봤는지, 무엇을 바꿨는지, 확정한 예약이 조건을 몇 개 만족하는지 기록한다 (자동화의 아이러니 · 평가의 간극).
import { MISSIONS, RESTAURANTS, agentDates, bookingCheck } from "./data.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const won = n => n.toLocaleString("ko-KR") + "원";
const NOTE_KO = { peanut: "땅콩 알레르기 (아이 1명)", highchair: "유아용 의자 1개", wheel: "휠체어 이용 (할머니)", parking: "주차 2대 등록" };

export function mountAgent(box, { onRecord, prev }) {
  const D = agentDates();
  const SLOT = { fri19: `${D.fri} 오후 7:00`, fri17: `${D.fri} 오후 5:00`, sat19: `${D.sat} 오후 7:00` };
  let rec = { opened: { detail: 0, info: 0, trace: 0 }, changes: 0, final: null, met: null, ...(prev || {}) };
  let b = null, trace = [], alive = true;
  const save = patch => { rec = { ...rec, ...patch }; onRecord?.(rec); };
  const open = k => save({ opened: { ...rec.opened, [k]: (rec.opened[k] || 0) + 1 } });

  box.innerHTML = `
    <div class="agent">
      <div class="chat"></div>
      <div class="ask"><button class="btn primary" data-a="send" type="button">비서에게 예약 맡기기</button></div>
      <div class="tools" hidden>
        <button class="btn small" data-t="detail" type="button">예약 상세</button>
        <button class="btn small" data-t="info" type="button">식당 정보</button>
        <button class="btn small" data-t="trace" type="button">진행 과정</button>
        <button class="btn small" data-t="other" type="button">다른 식당 찾기</button>
        <button class="btn small" data-t="time" type="button">날짜 · 시간 변경</button>
        <button class="btn small" data-t="menu" type="button">메뉴 변경</button>
        <button class="btn small" data-t="req" type="button">요청 사항 추가</button>
        <button class="btn small" data-t="people" type="button">인원 변경</button>
        <button class="btn small primary" data-t="confirm" type="button">예약 확정</button>
      </div>
      <button class="btn ghost small again" data-a="again" type="button" hidden>처음부터 다시</button>
    </div>`;
  const chat = box.querySelector(".chat");
  const add = (who, html) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; };
  const R = () => RESTAURANTS[b.rest];
  const M = () => R().menus.find(m => m.id === b.menu) || R().menus[0];
  const summary = () => `<div class="card"><b>${R().name}</b><span>오후 ${b.slot === "fri17" ? "5" : "7"}시 · 가족 모임</span><span class="okmark">예약 완료</span></div>`;
  const tools = on => box.querySelector(".tools").hidden = !on;

  async function work(steps) {
    const w = add("bot", `<span class="typing">처리 중</span><ol class="steps"></ol>`);
    for (const s of steps) {
      if (!alive) return w;
      const li = document.createElement("li"); li.textContent = s + " …"; w.querySelector(".steps").appendChild(li);
      await sleep(700); li.textContent = s + " ✓";
    }
    return w;
  }

  async function start() {
    box.querySelector('[data-a="send"]').disabled = true;
    add("me", `예약해 줘.<ul>${MISSIONS.agent.conds.map(c => `<li>${c}</li>`).join("")}</ul>`);
    const w = await work(["조건 분석", "식당 검색", "빈자리 확인", "예약 진행"]);
    b = { rest: "deul", slot: "sat19", menu: "course", people: 6, notes: [] };
    trace = [
      "요청 분석 — 금요일 오후 7시 · 6명 · 휠체어 · 땅콩 알레르기 · 1인 3만 원 · 주차 · 유아용 의자",
      "평점순 검색 — 들꽃식당(평점 4.8) 선택",
      `${SLOT.fri19} 자리 없음 → 같은 시간이 가능한 가장 가까운 날로 조정: ${SLOT.sat19}`,
      "메뉴 — 이 식당 인기 1위 「셰프 추천 코스」 선택",
      "요청 사항 — 입력란 글자 수 초과로 생략",
      "예약금 — 1인 10,000원 결제 대기",
    ];
    w.innerHTML = `<p><b>예약을 마쳤습니다.</b> 즐거운 모임 되세요!</p>${summary()}`;
    tools(true);
  }

  function choice(html, opts) {
    const m = add("bot", html + `<div class="acts">${opts.map((o, i) => `<button class="btn small" data-c="${i}" type="button">${o[0]}</button>`).join("")}</div>`);
    m.querySelectorAll("[data-c]").forEach(x => x.onclick = () => { m.querySelectorAll("button").forEach(y => y.disabled = true); opts[Number(x.dataset.c)][1](); });
  }
  const change = () => save({ changes: (rec.changes || 0) + 1 });

  const T = {
    detail() {
      open("detail");
      add("bot", `<dl class="detail"><dt>식당</dt><dd>${R().name}</dd><dt>일시</dt><dd>${SLOT[b.slot]}</dd><dt>인원</dt><dd>${b.people}명</dd>
        <dt>메뉴</dt><dd>${M().name} · 1인 ${won(M().price)}${b.people < 6 ? " (미취학 아동 무료)" : ""}</dd><dt>요청 사항</dt><dd>${b.notes.length ? b.notes.map(n => NOTE_KO[n]).join(", ") : "없음"}</dd>
        <dt>예약금</dt><dd>${R().deposit}</dd></dl>`);
    },
    info(id = b.rest) {
      open("info");
      const r = RESTAURANTS[id];
      add("bot", `<dl class="detail"><dt>식당</dt><dd>${r.name} · 평점 ${r.rating}</dd><dt>위치</dt><dd>${r.floor}</dd><dt>주차</dt><dd>${r.parking ? `가능${r.parkingNote ? ` · ${r.parkingNote}` : ""}` : "불가 (근처 공영주차장 이용)"}</dd>
        <dt>유아용 의자</dt><dd>${r.highchair ? "있음 (요청 시 준비)" : "없음"}</dd><dt>알레르기</dt><dd>${r.allergy}</dd>
        <dt>메뉴</dt><dd>${r.menus.map(m => `${m.name} ${won(m.price)}${m.note ? ` (${m.note})` : ""}`).join("<br>")}</dd><dt>예약금</dt><dd>${r.deposit}</dd></dl>`);
    },
    trace() { open("trace"); add("bot", `<ol class="trace">${trace.map(t => `<li>${t}</li>`).join("")}</ol>`); },
    other() {
      const cand = ["deul", "baram", "haeo"].filter(id => id !== b.rest);
      choice(`<p>다른 식당을 찾았습니다.</p>${cand.map(id => { const r = RESTAURANTS[id], s = r.slots.fri19 ? SLOT.fri19 : SLOT.sat19;
        return `<div class="card"><b>${r.name}</b><span>${s} 가능 · 1인 ${won(r.menus[0].price)}부터</span></div>`; }).join("")}`,
        cand.flatMap(id => [[`${RESTAURANTS[id].name} 정보`, () => { T.info(id); T.other(); }], [`${RESTAURANTS[id].name} 선택`, async () => {
          const r = RESTAURANTS[id];
          b = { ...b, rest: id, slot: r.slots.fri19 ? "fri19" : "sat19", menu: r.menus[0].id, notes: [], people: r.kidsFree ? 4 : 6 };
          change();
          trace.push(`식당 변경 — ${r.name} · ${SLOT[b.slot]} · 기본 메뉴 「${r.menus[0].name}」 · 이전 요청 사항은 새 예약에 옮기지 않음`);
          if (r.kidsFree) trace.push("인원 — 미취학 아동 무료 규정에 따라 어른 4명으로 접수 (아이 좌석 미포함)");
          await work(["기존 예약 취소", "새 예약 진행"]);
          add("bot", `<p><b>식당을 바꿔 예약했습니다: ${r.name}</b></p>${summary()}`);
        }]]));
    },
    time() {
      const r = R();
      const opts = Object.entries(r.slots).filter(([k, v]) => v && k !== b.slot).map(([k]) => [SLOT[k], () => { b.slot = k; change(); trace.push(`일시 변경 — ${SLOT[k]}`); add("bot", `<p>일시를 바꿨습니다: ${SLOT[k]}</p>${summary()}`); }]);
      if (!r.slots.fri19) choice(`<p>${r.name}에는 ${SLOT.fri19} 자리가 없습니다. 가능한 시간입니다.</p>`, opts.length ? opts : [["그대로 두기", () => { }]]);
      else if (b.slot === "fri19") add("bot", `<p>이미 예약된 일시입니다: ${SLOT.fri19}</p>`);
      else choice("<p>가능한 시간입니다.</p>", opts);
    },
    menu() {
      choice(`<p>${R().name}의 메뉴입니다.</p>`, R().menus.filter(m => m.id !== b.menu).map(m => [`${m.name} ${won(m.price)}`, () => {
        b.menu = m.id; change(); trace.push(`메뉴 변경 — ${m.name}`); add("bot", `<p>메뉴를 바꿨습니다: ${m.name}</p>`);
      }]).concat([["그대로 두기", () => { }]]));
    },
    req() {
      const left = Object.keys(NOTE_KO).filter(n => !b.notes.includes(n));
      if (!left.length) { add("bot", "<p>요청 사항이 모두 들어가 있습니다.</p>"); return; }
      choice("<p>어떤 요청 사항을 넣을까요?</p>", left.map(n => [NOTE_KO[n], () => {
        change();
        const r = R();
        if (n === "wheel" && !r.access) { add("bot", `<p>${r.name}은 ${r.floor}입니다. 휠체어로는 들어가기 어렵다고 합니다.</p>`); trace.push("요청 — 휠체어: 식당 구조상 불가"); return; }
        if (n === "parking" && !r.parking) { add("bot", `<p>${r.name}에는 주차장이 없습니다. 근처 공영주차장을 이용해야 합니다.</p>`); trace.push("요청 — 주차: 주차장 없음"); return; }
        if (n === "peanut" && !r.allergy.includes("가능") && M().peanut) { add("bot", `<p>${r.name}: ${r.allergy}. 다른 메뉴를 고르시겠어요?</p>`); trace.push("요청 — 땅콩 알레르기: 현재 메뉴는 변경 불가"); return; }
        b.notes = [...b.notes, n];
        trace.push(`요청 사항 추가 — ${NOTE_KO[n]}`);
        add("bot", `<p>「${NOTE_KO[n]}」 요청을 식당에 전달했습니다.</p>`);
      }]));
    },
    people() {
      choice(`<p>지금 예약 인원은 ${b.people}명입니다.</p>`, [4, 5, 6].filter(n => n !== b.people).map(n => [`${n}명`, () => {
        b.people = n; change(); trace.push(`인원 변경 — ${n}명`); add("bot", `<p>인원을 바꿨습니다: ${n}명</p>`);
      }]).concat([["그대로 두기", () => { }]]));
    },
    confirm() {
      choice(`<p>이대로 확정할까요?</p>${summary()}`, [["확정", () => {
        const chk = bookingCheck(b);
        save({ final: { ...b, notes: [...b.notes] }, met: chk.met, confirmedAt: Date.now() });
        tools(false);
        add("bot", `<p><b>예약이 확정되었습니다.</b> ${R().name}에서 뵙겠습니다.</p>`);
        box.querySelector('[data-a="again"]').hidden = false;
      }], ["취소", () => { }]]);
    },
  };

  box.querySelector('[data-a="send"]').onclick = start;
  box.querySelectorAll("[data-t]").forEach(x => x.onclick = () => T[x.dataset.t]());
  box.querySelector('[data-a="again"]').onclick = () => {
    chat.innerHTML = ""; b = null; trace = []; tools(false);
    box.querySelector('[data-a="send"]').disabled = false; box.querySelector('[data-a="again"]').hidden = true;
  };
  if (rec.final) add("bot", `<p>확정한 예약이 있습니다: ${RESTAURANTS[rec.final.rest].name} · ${SLOT[rec.final.slot]}. 다시 하려면 비서에게 다시 맡기기.</p>`);
  return { stop() { alive = false; } };
}
