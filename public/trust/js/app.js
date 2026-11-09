// 아바타 신뢰 게임 — 학생 화면.
// 화면은 단계 · 판 · 역할로 정해지는 「틀」을 바꿀 때만 다시 그리고, 그 밖에는 바뀐 칸만 고친다 (입력 중인 글이 지워지지 않게).
import * as F from "./fb.js";
import { CONDS, CUE_GROUPS, cueById, MISSIONS, RATINGS, ENDOW, MULT, PHASE_LABEL, payoff, cleanNick, NICK_MAX } from "./game.js";
import { makeAvatar, LOOKS } from "./avatar.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const view = $("#view"), status = $("#status");

const S = { state: null, person: undefined, seat: undefined, pair: null, msgs: [], key: "" };
let unSeat = null, unPair = null, unMsgs = null, seatRound = null, pairOf = null;
let avP = null, avM = null, seen = 0;           // 아바타와 이미 그린 메시지 수
// 3D 아바타는 판마다 한 번만 불러오고, 단계가 바뀌어 화면을 다시 그릴 때는 같은 상자를 옮겨 붙인다
let stage3d = null;                             // { pid, boxP, boxM, avP, avM, seen, dead }
const forceSvg = new URLSearchParams(location.search).has("svg");
const draft = {};                               // 결정 입력 — 판마다 따로
let sent = {};                                  // 함수로 보낸 마지막 결정

/* ── 구독 ── */
F.ready().then(() => {
  F.watchState(st => { S.state = st; follow(); render(); });
  F.watchPerson(p => { S.person = p; render(); });
});
setInterval(() => { if (S.person) F.ping().catch(() => {}); }, 30000);
setInterval(tick, 500);

function follow() {
  const r = S.state?.round || 0;
  if (r !== seatRound) {
    unSeat?.(); unSeat = null; seatRound = r; S.seat = undefined;
    if (r > 0) unSeat = F.watchSeat(r, seat => { S.seat = seat; followPair(); render(); });
  }
}
function followPair() {
  const id = S.seat?.pairId || null;
  if (id === pairOf) return;
  unPair?.(); unMsgs?.(); unPair = unMsgs = null; pairOf = id; S.pair = null; S.msgs = [];
  if (!id) return;
  unPair = F.watchPair(id, p => { S.pair = p; render(); });
  unMsgs = F.watchMsgs(id, ms => { S.msgs = ms; drawMsgs(); });
}

/* ── 틀 고르기 ── */
function screen() {
  const st = S.state;
  if (!st || S.person === undefined) return "loading";
  if (!S.person) return "join";
  if (st.phase === "end") return "end";
  if (st.phase === "lobby" || !st.round) return "lobby";
  if (S.seat === undefined) return "loading";
  if (!S.seat) return "late";
  if (S.seat.role === "rest") return "rest";
  return "play";
}

function render() {
  const sc = screen(), st = S.state || {};
  drawStatus(sc);
  const phaseKey = st.phase === "revealing" ? "decide" : st.phase;
  const key = sc === "play" ? `play|${st.round}|${phaseKey}|${S.seat.role}|${!!S.pair?.result}` : sc + "|" + (st.round || 0);
  if (key !== S.key) {
    S.key = key;
    // 다른 판이나 단서 없는 판으로 넘어가면 3D 아바타를 내려 놓는다 (그래픽 메모리)
    if (sc !== "play" || !CONDS[S.seat.cond]?.cue || stage3d?.pid !== S.seat.pairId) dropStage();
    ({ loading, join, lobby, late, rest, play, end })[sc]();
  }
  refreshScore();
}

function drawStatus(sc) {
  const st = S.state;
  if (!st || sc === "join" || sc === "loading") { status.innerHTML = ""; return; }
  const chips = [];
  if (st.round) chips.push(`<span class="chip">${st.round}판 · ${esc(CONDS[st.cond]?.label || "")}</span>`);
  const ph = st.phase === "revealing" ? "decide" : st.phase;
  chips.push(`<span class="chip on">${PHASE_LABEL[ph] || ""}</span>`);
  if (st.phase === "talk") chips.push(`<span class="timer" id="timer"></span>`);
  if (S.person) chips.push(`<span class="chip">${esc(S.person.name)} · ${S.person.score || 0}점</span>`);
  status.innerHTML = chips.join("");
  tick();
}

function tick() {
  const el = $("#timer");
  if (!el || S.state?.phase !== "talk") return;
  const left = Math.max(0, Math.round((S.state.endsAt - Date.now()) / 1000));
  el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  el.classList.toggle("low", left <= 15);
  const note = $("#timeup");
  if (note) note.hidden = left > 0;
}

/* ── 틀들 ── */
function loading() { view.innerHTML = `<div class="card narrow center"><p class="hint">연결하는 중…</p></div>`; }

function join() {
  view.innerHTML = `
  <div class="card narrow">
    <h2>입장</h2>
    <p class="lead">학번과 이름은 교수 현황판에만 보입니다. 게임 상대에게는 닉네임만 보입니다.</p>
    <form id="joinf">
      <label class="field">학번<input id="sid" inputmode="numeric" autocomplete="off" maxlength="12" required></label>
      <label class="field">이름<input id="name" autocomplete="off" maxlength="20" required></label>
      <label class="field">닉네임<small>상대에게 보이는 이름 · ${NICK_MAX}자까지 · 실명이나 학번이 드러나지 않게</small><input id="nick" autocomplete="off" maxlength="${NICK_MAX}" required></label>
      <div class="actions"><button class="btn primary" type="submit">입장</button><span class="hint" id="jmsg"></span></div>
    </form>
  </div>`;
  $("#joinf").onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter || $("#joinf button");
    b.disabled = true; $("#jmsg").textContent = "입장하는 중…"; $("#jmsg").className = "hint";
    const nick = cleanNick($("#nick").value);
    if (!nick) { $("#jmsg").textContent = "닉네임을 정해 주세요"; $("#jmsg").className = "hint warn"; b.disabled = false; return; }
    try { await F.join($("#sid").value.trim(), $("#name").value.trim(), nick); }
    catch (err) { $("#jmsg").textContent = err.message; $("#jmsg").className = "hint warn"; b.disabled = false; }
  };
}

function lobby() {
  view.innerHTML = `
  <div class="card narrow center">
    <h2>대기실</h2>
    <p class="lead">교수님이 판을 시작하면 무작위로 짝이 정해집니다. 이 화면을 켜 둔 채로 기다려 주세요.</p>
    <p class="hint">닉네임 <b>${esc(S.person.nick || "")}</b> · ${esc(S.person.name)} (${esc(S.person.sid)}) · 지금까지 <b id="score">${S.person.score || 0}</b>점</p>
  </div>
  ${rulesCard()}`;
}

function late() {
  view.innerHTML = `<div class="card narrow center"><h2>다음 판부터 참여</h2>
  <p class="lead">이번 판은 이미 짝이 정해졌습니다. 다음 판이 시작되면 자동으로 짝이 정해집니다.</p></div>`;
}
function rest() {
  view.innerHTML = `<div class="card narrow center"><h2>이번 판은 쉬는 차례</h2>
  <p class="lead">인원이 홀수라 이번 판은 한 명이 쉽니다. 다음 판에서는 반드시 짝이 정해집니다.</p></div>`;
}

function end() {
  view.innerHTML = `<div class="card narrow center"><h2>게임 끝</h2>
  <p class="lead">${esc(S.person.name)} 님의 최종 점수</p>
  <p class="score"><span id="score">${S.person.score || 0}</span>점</p>
  <p class="hint">결과는 앞 화면의 현황판에서 함께 봅니다.</p></div>`;
}
function refreshScore() { const el = $("#score"); if (el && S.person) el.textContent = S.person.score || 0; }

function rulesCard() {
  return `<div class="card narrow">
    <h3>규칙</h3>
    <p class="hint">• 투자자는 판마다 ${ENDOW}점을 받고, 그중 얼마를 수탁자에게 보낼지 정합니다.<br>
    • 보낸 돈은 ${MULT}배가 되어 수탁자에게 갑니다.<br>
    • 수탁자는 받은 돈 가운데 몇 %를 돌려줄지 대화하는 동안 미리 정해 둡니다.<br>
    • 대화가 끝나면 투자자가 보낼 돈을 정하고, 결과가 공개됩니다.<br>
    • 판마다 짝과 역할이 바뀝니다. 상대에게는 닉네임만 보입니다.</p>
  </div>`;
}

/* ── 게임 화면 ── */
function play() {
  const st = S.state, seat = S.seat, cond = CONDS[seat.cond] || CONDS.both;
  const inv = seat.role === "investor";
  const phase = st.phase === "revealing" ? "decide" : st.phase;
  const d = draft[st.round] ||= { send: null, predict: 50, guess: null, presence: null, trust: null, ret: 50, retSaved: null };

  if (phase === "reveal" && S.pair?.result) { view.innerHTML = roleCard(seat, inv) + resultCard(seat, S.pair.result, inv); return; }

  const talking = phase === "talk";
  // 상대 화면과 내 화면을 창 두 개로 나눈다. 단서 버튼은 내 화면 안에 — 내가 누르면 상대 화면 쪽 사람에게 보인다
  const stage = cond.cue ? `
    <div class="wins">
      <section class="win you" aria-label="상대 화면">
        <header class="win-head"><span class="dot"></span>상대 화면<b>${esc(seat.partnerNick)}</b><span class="ticker" id="tick"></span></header>
        <div class="win-body"><div id="avP" class="slot big"></div></div>
      </section>
      <section class="win me" aria-label="내 화면">
        <header class="win-head"><span class="dot"></span>내 화면<b>${esc(seat.nick)}</b><span class="win-note">${talking ? "누르면 상대에게 보입니다" : "단서가 잠겼습니다"}</span></header>
        <div class="win-body me-body">
          <div class="me-av"><div id="avM" class="slot small"></div></div>
          <div class="ctrl" id="cues">${CUE_GROUPS.map(g => `
            <div class="cuegrp"><h4>${g.label}</h4><div class="row">${g.cues.map(c => `<button class="cue" data-cue="${c.id}" ${talking ? "" : "disabled"}>${c.label}</button>`).join("")}</div></div>`).join("")}
          </div>
        </div>
      </section>
    </div>` : "";
  const chat = cond.text ? `
    <div class="card chat ${cond.cue ? "" : "tall"}">
      <h3>채팅</h3>
      <div class="msgs" id="msgs"><p class="empty">${talking ? "먼저 인사해 보세요" : "대화가 끝났습니다"}</p></div>
      <form class="send" id="sendf"><input id="txt" maxlength="200" autocomplete="off" placeholder="${talking ? "메시지" : "대화가 끝났습니다"}" ${talking ? "" : "disabled"}><button class="btn primary" ${talking ? "" : "disabled"}>보내기</button></form>
    </div>` : "";

  view.innerHTML = `
    ${roleCard(seat, inv)}
    ${stage}
    <div class="play ${chat ? "" : "solo"}">
      ${chat ? `<div>${chat}</div>` : ""}
      <div>${decisionCard(seat, inv, phase, d)}</div>
    </div>`;

  if (cond.cue) {
    mountStage(seat);
    let last = 0;
    view.querySelectorAll(".cue").forEach(b => b.onclick = async () => {
      if (Date.now() - last < 500) return;         // 연타 막기
      last = Date.now();
      try { await F.sendMsg(seat.pairId, { kind: "cue", cue: b.dataset.cue }); }
      catch { flash("지금은 단서를 보낼 수 없습니다"); }
    });
  }
  if (cond.text && $("#sendf")) $("#sendf").onsubmit = async e => {
    e.preventDefault();
    const t = $("#txt").value.trim();
    if (!t) return;
    $("#txt").value = "";
    try { await F.sendMsg(seat.pairId, { kind: "text", text: t }); }
    catch { $("#txt").value = t; flash("지금은 보낼 수 없습니다"); }
  };
  wireDecision(seat, inv, phase, d);
  drawMsgs();
  tick();
}

function roleCard(seat, inv) {
  const m = !inv && seat.mission ? MISSIONS[seat.mission] : null;
  return `<div class="card">
    <div class="role">
      <span class="tag ${inv ? "" : "tru"}">${inv ? "투자자" : "수탁자"}</span>
      <div>
        <p>${inv
          ? `당신은 ${ENDOW}점을 가지고 있습니다. 대화가 끝나면 상대에게 얼마를 보낼지 정합니다. 보낸 돈은 ${MULT}배가 되어 상대에게 갑니다.`
          : `상대(투자자)가 보내는 돈은 ${MULT}배가 되어 당신에게 옵니다. 그중 몇 %를 돌려줄지 대화하는 동안 미리 정해 두세요.`}</p>
        <p class="names">나 <b>${esc(seat.nick)}</b> · 상대 <b>${esc(seat.partnerNick)}</b></p>
      </div>
    </div>
    ${m ? `<div class="mission"><b>이번 판 비밀 역할 · ${m.label}</b> — ${m.text}<small>게임 속 역할입니다. 상대는 이 역할을 모릅니다. 실제로 돌려줄 비율은 직접 정합니다.</small></div>` : ""}
    ${!inv ? "" : seat.missions ? `<p class="hint">상대 수탁자는 비밀 역할(정직 또는 배신)을 받았습니다. 대화로 짐작해 보세요.</p>` : ""}
  </div>`;
}

const picks = (name, from, to, val, dis) =>
  `<div class="picks" data-name="${name}">${Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .map(v => `<button type="button" class="pick ${val === v ? "on" : ""}" data-v="${v}" ${dis ? "disabled" : ""}>${v}</button>`).join("")}</div>`;
const scale = (id, text, val, dis) => `<div class="q"><b>${text}</b>${picks(id, 1, 7, val, dis)}<div class="scale"><span>전혀 아니다</span><span>매우 그렇다</span></div></div>`;

function decisionCard(seat, inv, phase, d) {
  const deciding = phase === "decide";
  const closed = S.state.phase === "revealing";
  if (inv) {
    if (!deciding) return `<div class="card"><h3>결정</h3><p class="hint">대화가 끝나면 여기서 보낼 돈을 정합니다.</p>
      <p class="hint" id="timeup" hidden>시간이 다 되었습니다. 곧 결정 단계로 넘어갑니다.</p></div>`;
    return `<div class="card ${closed ? "locked" : ""}" id="dec">
      <h3>결정</h3>
      <div class="q"><b>상대에게 보낼 돈</b><small>0~${ENDOW}점</small>${picks("send", 0, ENDOW, d.send)}</div>
      <div class="calc" id="calc"></div>
      <div class="q"><b>상대가 몇 %를 돌려줄 것 같나요</b>
        <div class="range"><input type="range" id="predict" min="0" max="100" step="5" value="${d.predict}"><output id="predictv">${d.predict}%</output></div></div>
      ${seat.missions ? `<div class="q"><b>상대의 비밀 역할은 무엇이었을까요</b>
        <div class="picks" data-name="guess">${Object.entries(MISSIONS).map(([k, m]) => `<button type="button" class="pick ${d.guess === k ? "on" : ""}" data-v="${k}">${m.label}</button>`).join("")}</div></div>` : ""}
      ${RATINGS.map(r => scale(r.id, r.text, d[r.id])).join("")}
      <div class="actions"><button class="btn primary" id="submit">제출</button><span class="hint" id="dmsg"></span></div>
    </div>`;
  }
  return `<div class="card ${closed ? "locked" : ""}" id="dec">
    <h3>돌려줄 비율</h3>
    <div class="range"><input type="range" id="ret" min="0" max="100" step="5" value="${d.ret}"><output id="retv">${d.ret}%</output></div>
    <div class="calc" id="calc"></div>
    ${deciding ? RATINGS.map(r => scale(r.id, r.text, d[r.id])).join("") : `<p class="hint">대화하는 동안 언제든 바꿀 수 있습니다. 결정 단계가 끝나면 잠깁니다.</p>`}
    <div class="actions"><button class="btn primary" id="submit">${deciding ? "제출" : "비율 저장"}</button><span class="hint" id="dmsg"></span></div>
  </div>`;
}

function wireDecision(seat, inv, phase, d) {
  const box = $("#dec");
  if (!box) return;
  const calc = () => {
    const el = $("#calc");
    if (!el) return;
    if (inv) {
      if (d.send === null) { el.innerHTML = "보낼 돈을 고르세요."; return; }
      el.innerHTML = `보내면 상대는 <b>${d.send * MULT}점</b>을 받습니다. 내 손에는 <b>${ENDOW - d.send}점</b>이 남고, 상대가 돌려주는 만큼 더해집니다.`;
    } else {
      const p = payoff(ENDOW, d.ret), q = payoff(5, d.ret);
      el.innerHTML = `상대가 10점을 모두 보내면 30점 중 <b>${p.ret}점</b>을, 5점을 보내면 15점 중 <b>${q.ret}점</b>을 돌려줍니다.`;
    }
  };
  calc();
  box.querySelectorAll(".picks").forEach(row => row.onclick = e => {
    const b = e.target.closest(".pick");
    if (!b || b.disabled) return;
    const name = row.dataset.name, v = name === "guess" ? b.dataset.v : Number(b.dataset.v);
    d[name] = v;
    row.querySelectorAll(".pick").forEach(x => x.classList.toggle("on", x === b));
    calc();
  });
  const rng = (id, key) => { const el = $("#" + id); if (el) el.oninput = () => { d[key] = Number(el.value); $("#" + id + "v").textContent = el.value + "%"; calc(); }; };
  rng("predict", "predict"); rng("ret", "ret");

  const msg = (t, cls = "hint") => { const el = $("#dmsg"); if (el) { el.textContent = t; el.className = cls; } };
  const was = sent[S.state.round];
  if (was) msg(phase === "decide" && was.full ? "제출했습니다. 공개 전까지 바꿀 수 있습니다." : "저장했습니다", "hint ok");

  $("#submit").onclick = async () => {
    const deciding = phase === "decide";
    const body = {};
    if (inv) {
      if (d.send === null) return msg("보낼 돈을 고르세요", "hint warn");
      if (seat.missions && !d.guess) return msg("상대의 역할을 짐작해 고르세요", "hint warn");
      Object.assign(body, { send: d.send, predict: d.predict });
      if (seat.missions) body.guess = d.guess;
    } else body.ret = d.ret;
    if (deciding) {
      if (RATINGS.some(r => !d[r.id])) return msg("두 문항에 모두 답해 주세요", "hint warn");
      RATINGS.forEach(r => body[r.id] = d[r.id]);
    }
    $("#submit").disabled = true; msg("보내는 중…");
    try {
      await F.move(body);
      sent[S.state.round] = { full: deciding };
      msg(deciding ? "제출했습니다. 공개 전까지 바꿀 수 있습니다." : "저장했습니다", "hint ok");
    } catch (e) { msg(e.message, "hint warn"); }
    $("#submit").disabled = false;
  };
}

function resultCard(seat, r, inv) {
  const partnerCues = inv ? r.truCues : r.invCues;
  const used = Object.entries(partnerCues?.cues || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const mine = inv ? r.inv : r.tru;
  const mission = r.mission ? MISSIONS[r.mission] : null;
  let verdict = "";
  if (inv && mission) {
    verdict = r.guess
      ? `<div class="verdict ${r.correct ? "" : "no"}">상대의 비밀 역할은 <b>${mission.label}</b>이었습니다. 내 짐작은 <b>${MISSIONS[r.guess].label}</b> — ${r.correct ? "맞혔습니다." : "틀렸습니다."}</div>`
      : `<div class="verdict">상대의 비밀 역할은 <b>${mission.label}</b>이었습니다.</div>`;
  }
  return `<div class="card" style="margin-top:14px">
    <h2>${S.state.round}판 결과</h2>
    <div class="flow">
      <div class="box"><b>${r.send}</b><span>보낸 돈</span></div><span class="arr">× ${MULT} →</span>
      <div class="box"><b>${r.pot}</b><span>수탁자가 받은 돈</span></div><span class="arr">→ ${r.retPct}% →</span>
      <div class="box"><b>${r.ret}</b><span>돌려준 돈</span></div>
    </div>
    ${r.missing?.length ? `<p class="hint warn">${r.missing.includes("send") ? "투자자가 결정을 내지 않아 0점을 보낸 것으로 계산했습니다. " : ""}${r.missing.includes("ret") ? "수탁자가 비율을 정하지 않아 0%로 계산했습니다." : ""}</p>` : ""}
    <p>이번 판 내 점수 <span class="score">${mine}</span>점 <span class="hint">(누적 <span id="score">${S.person?.score ?? ""}</span>점)</span></p>
    ${inv && r.predict !== null ? `<p class="hint">나는 ${r.predict}%를 돌려줄 것으로 예상했습니다.</p>` : ""}
    ${verdict}
    ${CONDS[seat.cond]?.cue ? `<h3 style="margin-top:14px">상대가 쓴 단서 (${partnerCues?.total || 0}번)</h3>
      <div class="cuelist">${used.length ? used.map(([id, n]) => `<span>${cueById[id].label} ${n}</span>`).join("") : `<span>없음</span>`}</div>` : ""}
    <p class="hint" style="margin-top:12px">다음 판을 기다려 주세요.</p>
  </div>`;
}

/* ── 메시지 · 아바타 ── */
let tickT = null;
function drawMsgs() {
  const seat = S.seat;
  if (!seat || screen() !== "play") return;
  const box = $("#msgs");
  if (box) {
    const texts = S.msgs.filter(m => m.kind === "text");
    box.innerHTML = texts.length
      ? texts.map((m, i) => {
          // 내 말은 오른쪽 파란 말풍선, 상대 말은 왼쪽 흰 말풍선. 같은 사람이 이어 말하면 이름은 처음에만
          const mine = m.by === F.me.uid, first = i === 0 || texts[i - 1].by !== m.by;
          return `<div class="line ${mine ? "mine" : "you"}">${first ? `<span class="from">${esc(mine ? "나" : seat.partnerNick)}</span>` : ""}<div class="msg">${esc(m.text)}</div></div>`;
        }).join("")
      : `<p class="empty">${S.state.phase === "talk" ? "먼저 인사해 보세요" : "대화가 없었습니다"}</p>`;
    box.scrollTop = box.scrollHeight;
  }
  if (!avP) return;
  // 처음 그릴 때(새로고침 등)는 남는 상태만 되살리고 지난 움직임은 다시 하지 않는다
  const fresh = seen === 0;
  for (const m of S.msgs.slice(seen)) {
    if (m.kind !== "cue") continue;
    const c = cueById[m.cue];
    if (!c || (fresh && !c.keep && Date.now() - m.at > 3000)) continue;
    const mine = m.by === F.me.uid;
    (mine ? avM : avP).apply(m.cue);
    if (mine) view.querySelectorAll(`.cue[data-cue]`).forEach(b => { const k = cueById[b.dataset.cue].keep; if (k && k === c.keep) b.classList.toggle("on", b.dataset.cue === m.cue); });
    else if (!fresh) {
      const t = $("#tick");
      if (t) { t.textContent = c.label; t.style.opacity = 1; clearTimeout(tickT); tickT = setTimeout(() => { t.style.opacity = 0; }, 1800); }
    }
  }
  seen = S.msgs.length;
  if (stage3d) stage3d.seen = seen;
}

/* ── 아바타 무대 ── */
// 불러오는 동안 들어온 단서는 모아 두었다가, 다 불러오면 차례로 보여 준다
function proxy() {
  let real = null;
  const q = [];
  return {
    apply(c) { if (real) real.apply(c); else q.push(c); },
    set(r) { real = r; q.splice(0).forEach(c => r.apply(c)); },
  };
}
function dropStage() {
  if (!stage3d) return;
  stage3d.dead = true;
  stage3d.real.forEach(a => a?.dispose?.());
  stage3d = null;
}
function mountStage(seat) {
  const pid = seat.pairId;
  if (!stage3d || stage3d.pid !== pid) {
    dropStage();
    const box = () => { const el = document.createElement("div"); el.className = "av3d"; el.innerHTML = `<p class="avload">아바타 불러오는 중…</p>`; return el; };
    stage3d = { pid, boxP: box(), boxM: box(), avP: proxy(), avM: proxy(), seen: 0, real: [] };
    loadStage(stage3d, seat);
  }
  $("#avP").replaceWith(stage3d.boxP);
  $("#avM").replaceWith(stage3d.boxM);
  stage3d.boxP.classList.add("big"); stage3d.boxM.classList.add("small");
  avP = stage3d.avP; avM = stage3d.avM; seen = stage3d.seen;
  if (F.isDemo) window.__stage = stage3d;
}
async function loadStage(sg, seat) {
  const partnerRole = seat.role === "investor" ? "trustee" : "investor";
  const svg = () => {
    if (sg.dead) return;
    for (const [box, look, px] of [[sg.boxP, LOOKS.partner, sg.avP], [sg.boxM, LOOKS.me, sg.avM]]) {
      box.innerHTML = ""; box.classList.add("flat");
      px.set(makeAvatar(box, look));
    }
  };
  if (forceSvg) return svg();
  try {
    const V = await import("./vrm-avatar.js");
    const [uP, uM] = await Promise.all([V.modelFor(partnerRole), V.modelFor(seat.role)]);
    const one = async (box, url, px, ratio) => {
      const msg = box.querySelector(".avload");
      const av = await V.createVrmAvatar(box, url, { maxPixelRatio: ratio, onProgress: p => { if (msg && p !== null) msg.textContent = `아바타 불러오는 중… ${Math.round(p * 100)}%`; } });
      if (sg.dead) { av?.dispose(); return; }
      msg?.remove();
      sg.real.push(av);
      px.set(av);
    };
    await one(sg.boxP, uP, sg.avP, 1.5);
    await one(sg.boxM, uM, sg.avM, 1);
  } catch (e) {
    console.warn("3D 아바타를 불러오지 못해 그림 아바타로 바꿉니다", e);
    sg.real.forEach(a => a?.dispose?.()); sg.real = [];
    svg();
  }
}

function flash(t) {
  const el = $("#dmsg") || $("#tick");
  if (el) { el.textContent = t; el.className = "hint warn"; }
}

/* ── 미리보기 도구 ── */
if (F.demoTools) {
  const bar = $("#demo");
  bar.hidden = false;
  bar.innerHTML = `<span>미리보기</span>
    <button data-a="text">다음 판 · 채팅만</button><button data-a="both">다음 판 · 채팅+단서</button><button data-a="cue">다음 판 · 단서만</button>
    <button data-a="decide">결정</button><button data-a="reveal">공개</button><button data-a="end">마침</button>`;
  bar.onclick = e => {
    const a = e.target.dataset?.a;
    if (!a) return;
    if (["text", "both", "cue"].includes(a)) F.demoTools.next(a); else F.demoTools[a]();
  };
}
