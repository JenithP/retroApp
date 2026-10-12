// 에이전트 체험 — 예약 비서가 여러 단계를 대신 처리하고 요약만 보여준다.
// 요청은 금요일인데, 금요일 창가석이 없자 비서가 스스로 토요일로 바꿔 예약한다. 요약에는 요일이 없다.
// 상세 보기 · 진행 과정을 열었는지, 확정했는지 수정했는지를 기록한다 (자동화의 아이러니 · 평가의 간극).
import { PLACE, agentDates } from "./data.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function mountAgent(box, { onRecord }) {
  const D = agentDates();
  const REQ = `다음 주 금요일 오후 2시, 2명, 창가 자리로 ${PLACE} 예약해 줘`;
  let rec = { detail: false, steps: false, decision: null }, alive = true;
  const save = patch => { rec = { ...rec, ...patch }; onRecord?.(rec); };

  box.innerHTML = `
    <div class="agent">
      <div class="chat"></div>
      <div class="ask"><input value="${REQ}" readonly><button class="btn primary" data-a="send" type="button">보내기</button></div>
      <button class="btn ghost small again" data-a="again" type="button" hidden>처음부터 다시</button>
    </div>`;
  const chat = box.querySelector(".chat");
  const add = (who, html) => { const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = html; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; };

  async function run() {
    box.querySelector('[data-a="send"]').disabled = true;
    add("me", REQ);
    const w = add("bot", `<span class="typing">처리 중</span><ol class="steps"></ol>`);
    const ol = w.querySelector(".steps");
    for (const s of ["식당 검색", "빈자리 확인", "예약 진행"]) {
      if (!alive) return;
      const li = document.createElement("li"); li.textContent = s + " …"; ol.appendChild(li);
      await sleep(900);
      li.textContent = s + " ✓";
    }
    w.innerHTML = `<p><b>예약을 마쳤습니다.</b></p>
      <div class="card"><b>${PLACE}</b><span>2명 · 창가석 · 오후 2시</span><span class="okmark">예약 완료</span></div>
      <div class="acts"><button class="btn small" data-a="detail" type="button">상세 보기</button>
        <button class="btn small" data-a="steps" type="button">진행 과정</button>
        <button class="btn small primary" data-a="confirm" type="button">확정</button>
        <button class="btn small" data-a="fix" type="button">수정 요청</button></div>
      <div class="more"></div>`;
    const more = w.querySelector(".more");
    w.querySelector('[data-a="detail"]').onclick = () => {
      save({ detail: true });
      more.innerHTML = `<dl class="detail"><dt>식당</dt><dd>${PLACE}</dd><dt>날짜</dt><dd>${D.sat}</dd><dt>시간</dt><dd>오후 2:00</dd><dt>인원</dt><dd>2명</dd><dt>자리</dt><dd>창가석</dd><dt>예약번호</dt><dd>DK-2614</dd></dl>`;
    };
    w.querySelector('[data-a="steps"]').onclick = () => {
      save({ steps: true });
      more.innerHTML = `<ol class="trace"><li>${PLACE} 검색 — 1곳 찾음</li><li>${D.fri} 오후 2:00 창가석 — 자리 없음</li>
        <li>조건 자동 조정 — 같은 시간 · 같은 자리가 가능한 가장 가까운 날짜 선택: ${D.sat}</li><li>${D.sat} 오후 2:00 창가석 2명 예약 완료</li></ol>`;
    };
    w.querySelector('[data-a="confirm"]').onclick = () => {
      save({ decision: "confirm" });
      w.querySelectorAll(".acts button").forEach(b => b.disabled = true);
      add("bot", `<p>예약을 확정했습니다. ${PLACE}에서 뵙겠습니다.</p>`);
      done();
    };
    w.querySelector('[data-a="fix"]').onclick = () => {
      save({ decision: "fix" });
      w.querySelectorAll(".acts button").forEach(b => b.disabled = true);
      const m = add("bot", `<p>${D.fri} 오후 2시 창가석은 자리가 없습니다. 가능한 예약은 다음과 같습니다.</p>
        <div class="acts"><button class="btn small" data-c="a" type="button">${D.fri} 오후 2시 · 일반석</button>
        <button class="btn small" data-c="b" type="button">${D.fri} 오후 6시 · 창가석</button></div>`);
      m.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
        m.querySelectorAll("button").forEach(x => x.disabled = true);
        add("bot", `<p>${b.textContent}으로 바꿔 예약했습니다.</p>`);
        done();
      });
    };
  }
  function done() { box.querySelector('[data-a="again"]').hidden = false; }
  box.querySelector('[data-a="send"]').onclick = run;
  box.querySelector('[data-a="again"]').onclick = () => { chat.innerHTML = ""; box.querySelector('[data-a="send"]').disabled = false; box.querySelector('[data-a="again"]').hidden = true; };
  return { stop() { alive = false; } };
}
