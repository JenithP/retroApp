// 활자의 문 현황판 — time 모음을 지켜보며 조별 진행, 누에게 건넨 말, 후드 쓴 자의 문제 정답률을 띄운다.
//   ?demo  예시 데이터로 모양만 보기
//   ?all   오늘이 아닌 날의 기록까지
import { QUIZ } from "./quiz.js";

const $ = s => document.querySelector(s);
const P = new URLSearchParams(location.search);
const DEMO = P.has("demo"), ALL = P.has("all");
const PROBE = /^(연결확인|test|테스트)$/i;           // 시험 삼아 넣은 조는 빼고 센다
const STEP = { intro: "소개", fireName: "불 이름", material: "무엇으로", method: "어떻게", ember: "그다음", remember: "잊지 않게",
               reflect: "해설사의 질문" };

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ms = r => r.createdAt?.toMillis ? r.createdAt.toMillis() : (r.at || Date.now());
const ago = t => { const s = (Date.now() - t) / 1000; return s < 50 ? "방금" : s < 3600 ? `${Math.round(s / 60)}분 전` : `${Math.floor(s / 3600)}시간 전`; };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

let rows = [];

/** 사건들을 조별로 모은다 */
function build(all) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const R = all.filter(r => r.team && !PROBE.test(r.team) && (ALL || DEMO || ms(r) >= today.getTime()))
               .sort((a, b) => ms(a) - ms(b));
  const teams = new Map();
  const T = name => {
    if (!teams.has(name)) teams.set(name, { name, last: 0, stage: "시작", cls: "", tries: 0, misses: 0,
      ch1: null, copies: 0, copySecs: [], quizTries: 0, pass: false, ch2: null, typos: null, sheets: null });
    return teams.get(name);
  };
  const feed = [];
  const qs = new Map(QUIZ.map(q => [q.id, { q, asked: 0, right: 0, picks: new Array(q.opts.length).fill(0) }]));

  for (const r of R) {
    const t = T(r.team);
    t.last = Math.max(t.last, ms(r));
    const kind = r.kind || (r.chapter ? "chapter" : "");
    if (kind === "start") { t.stage = r.from === 2 ? "2장 · 필사" : "1장 · 불"; t.cls = r.from === 2 ? "s2" : "s1"; }
    else if (kind === "answer") {
      t.tries++; if (!r.ok) t.misses++;
      t.stage = `1장 · ${STEP[r.step] || r.step}`; t.cls = "s1";
      feed.push(r);
    }
    else if (kind === "chapter" && r.chapter === "1-fire") { t.ch1 = r; t.stage = "2장 · 필사"; t.cls = "s2"; }
    else if (kind === "copy") { t.copies++; t.copySecs.push(r.secs || 0); t.stage = "2장 · 숲길"; t.cls = "s2"; }
    else if (kind === "quiz") {
      t.quizTries++;
      if (r.pass) { t.pass = true; t.stage = "2장 · 문제 통과"; t.cls = "pass"; }
      else { t.stage = "2장 · 다시 베끼기"; t.cls = "redo"; }
      (r.qs || []).forEach((id, i) => {
        const s = qs.get(id); if (!s) return;
        s.asked++; if (r.ok?.[i]) s.right++;
        const p = r.picks?.[i]; if (p != null && p < s.picks.length) s.picks[p]++;
      });
    }
    else if (kind === "chapter" && r.chapter === "2-copy") { t.ch2 = r; t.stage = "3장 · 인쇄소"; t.cls = "s3"; }
    else if (kind === "compose") { t.typos = r.firstTypos; t.stage = "3장 · 인쇄기"; t.cls = "s3"; }
    else if (kind === "press") { t.sheets = r.sheets; t.stage = "3장 · 퍼져 나감"; t.cls = "s3"; }
    else if (kind === "chapter" && r.chapter === "3-print") { t.stage = "박물관 · 해설사의 질문"; t.cls = "done"; }
    else if (kind === "reflect") { feed.push({ ...r, step: "reflect" }); t.stage = "끝"; t.cls = "done"; }
  }
  return { teams: [...teams.values()].sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true })), feed, qs: [...qs.values()] };
}

function render() {
  const { teams, feed, qs } = build(rows);
  const answers = feed.filter(r => r.step !== "reflect");
  const said = answers.length, ok = answers.filter(r => r.ok).length;
  const sheets = teams.reduce((a, t) => a + (t.sheets || 0), 0);
  const copies = teams.reduce((a, t) => a + t.copies, 0);
  const passed = teams.filter(t => t.pass).length;

  $("#kpis").innerHTML = [
    [teams.length, "참여한 조"],
    [said, "누에게 건넨 말"],
    [said ? `${Math.round(ok / said * 100)}%` : "–", "그중 통한 말"],
    [copies, "손으로 베낀 편지"],
    [sheets, "인쇄기로 찍은 장"],
    [`${passed}<small style="font-size:.5em;color:var(--dim)"> / ${teams.length}</small>`, "후드 쓴 자를 통과한 조"],
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");

  $("#teams").innerHTML = teams.length ? teams.map(t => {
    const avg = t.copySecs.length ? mmss(t.copySecs.reduce((a, b) => a + b, 0) / t.copySecs.length) : "–";
    return `<article class="team${Date.now() - t.last > 5 * 60e3 ? " stale" : ""}">
      <header><b>${esc(t.name)}</b><time>${ago(t.last)}</time></header>
      <span class="stage ${t.cls}">${esc(t.stage)}</span>
      <dl>
        <dt>건넨 말 · 안 통함</dt><dd>${t.tries} · ${t.misses}</dd>
        <dt>1장 걸린 시간</dt><dd>${t.ch1?.secs ? mmss(t.ch1.secs) : "–"}</dd>
        <dt>베낀 편지 · 한 부 평균</dt><dd>${t.copies}부 · ${avg}</dd>
        <dt>문제 도전</dt><dd>${t.quizTries ? `${t.quizTries}번 ${t.pass ? "· 통과" : ""}` : "–"}</dd>
        <dt>틀린 활자 · 찍은 장</dt><dd>${t.typos ?? "–"} · ${t.sheets ?? "–"}</dd>
      </dl>
    </article>`;
  }).join("") : `<p class="empty">아직 들어온 조가 없습니다. 학생들이 조 이름을 적고 「문을 연다」를 누르면 여기에 나타납니다.</p>`;

  $("#feed").innerHTML = feed.length ? feed.slice(-60).reverse().map(r => `
    <li class="${r.step === "reflect" ? "re" : r.ok ? "ok" : "no"}">
      <div class="meta"><b>${esc(r.team)}</b><span>${esc(STEP[r.step] || r.step)}</span>
        <span class="mark">${r.step === "reflect" ? "조의 생각" : r.ok ? "통함" : "안 통함"}</span><time>${ago(ms(r))}</time></div>
      <p>${esc(r.text)}</p>
    </li>`).join("") : `<li class="empty">누에게 건넨 말이 여기에 차례로 올라옵니다.</li>`;

  const sorted = qs.slice().sort((a, b) =>
    (b.asked > 0) - (a.asked > 0) || (a.right / (a.asked || 1)) - (b.right / (b.asked || 1)) || a.q.id - b.q.id);
  $("#quiz").innerHTML = `<thead><tr><th>문제</th><th>나온 횟수</th><th>정답률</th><th>가장 많이 고른 오답</th></tr></thead><tbody>`
    + sorted.map(s => {
      const rate = s.asked ? s.right / s.asked : 0;
      const wrongIdx = s.picks.map((n, i) => [n, i]).filter(([, i]) => i !== s.q.a).sort((a, b) => b[0] - a[0])[0];
      const wrong = s.asked && wrongIdx && wrongIdx[0] ? `${esc(s.q.opts[wrongIdx[1]])} <span class="page">${wrongIdx[0]}번</span>` : "–";
      return `<tr class="${s.asked ? "" : "unasked"}">
        <td>${esc(s.q.short)}<span class="page">${esc(s.q.page)} · 정답 ${esc(s.q.opts[s.q.a])}</span></td>
        <td class="n">${s.asked}</td>
        <td><div class="rate"><div class="bar ${rate < 0.5 ? "low" : rate < 0.8 ? "mid" : ""}"><i style="width:${Math.round(rate * 100)}%"></i></div>
          <span>${s.asked ? Math.round(rate * 100) + "%" : "–"}</span></div></td>
        <td class="wrongpick">${wrong}</td></tr>`;
    }).join("") + "</tbody>";

  $("#scope").textContent = DEMO ? "예시 데이터입니다" : ALL ? "모든 날짜의 기록" : "오늘 기록만";
}

setInterval(() => { $("#clock").textContent = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }, 1000);
setInterval(render, 20000);                       // 「몇 분 전」과 흐려짐을 새로 칠한다

if (DEMO) {
  rows = demo();
  $("#netdot").className = "dot ok"; $("#netmsg").textContent = "예시 데이터";
  render();
} else {
  render();
  const fb = await import("../../js/firebase.js");
  fb.watchColl("time", all => { rows = all; render(); });
}

/** 모양을 보려고 만든 가짜 기록 — ?demo 에서만 */
function demo() {
  const now = Date.now(), out = [];
  const say = [
    ["intro", "안녕, 우리는 서울에서 온 대학생이야", false], ["intro", "우리는 반짝이는 돌에서 나온 사람이야", true],
    ["fireName", "불을 피우면 돼", false], ["fireName", "번개 맞은 나무에서 나오는 거", false],
    ["fireName", "비 오는 밤 하늘이 번쩍하고 쾅 한 뒤 나무가 뜨겁고 빨갛게 일렁이던 거 기억나?", true],
    ["material", "마른 나무 가져와", false], ["material", "밟으면 딱 소리 나는 가벼운 막대", true],
    ["method", "마찰열로 온도를 올려", false], ["method", "추운 날 손바닥 비비듯이 막대를 빠르게 비벼", true],
    ["ember", "아기 새한테 하듯 살살 입김을 불어", true], ["remember", "종이에 적어 줄게", false],
    ["remember", "노래로 만들어서 같이 여러 번 부르자", true],
  ];
  for (let t = 1; t <= 9; t++) {
    const team = `${t}조`, start = now - (40 - t) * 60e3;
    out.push({ team, kind: "start", from: 1, at: start });
    const n = 4 + ((t * 5) % 9);
    for (let i = 0; i < n; i++) {
      const [step, text, ok] = say[(i + t) % say.length];
      out.push({ team, kind: "answer", step, text, ok, at: start + i * 80e3 });
    }
    if (t % 3 !== 0) {
      out.push({ team, kind: "chapter", chapter: "1-fire", secs: 900 + t * 40, at: start + n * 80e3 + 30e3 });
      out.push({ team, kind: "copy", secs: 260 + t * 17, at: start + n * 80e3 + 300e3 });
      const qsIds = [(t % 13) + 1, ((t + 4) % 13) + 1, ((t + 8) % 13) + 1];
      const oks = qsIds.map((id, i) => (id + i) % 3 !== 0);
      out.push({ team, kind: "quiz", qs: qsIds, ok: oks, pass: oks.every(Boolean),
        picks: qsIds.map((id, i) => oks[i] ? QUIZ[id - 1].a : (QUIZ[id - 1].a + 1) % 4), at: start + n * 80e3 + 420e3 });
      if (t % 2) out.push({ team, kind: "chapter", chapter: "2-copy", copies: 1, at: start + n * 80e3 + 500e3 });
    }
  }
  return out;
}
