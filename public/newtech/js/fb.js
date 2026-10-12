// 신기술 인터페이스 체험 실습 — 파이어베이스 연결과 버셀 함수 호출. 2~6주차와 같은 프로젝트(gccrc-crae), 모음은 hci7_ 로 시작한다.
//   hci7_state/current   단계 (버셀 함수만 씀)
//   hci7_people/{uid}    학생 한 사람의 기록 — 체험 시간 · 도움 요청 · 표정 판정 비교 · 예약 결정 · 확인 과제
//   hci7_homes/{T01}     조의 스마트홈 — 기기 상태 · 규칙 · 실행 기록 · 설계 목적
//   hci7_opinions/{T01}  조별 의견
//   hci7_notes/{id}      다른 조에 보내는 쪽지와 답
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, updateDoc, collection, onSnapshot, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { TEAM_COUNT, PHASE_ORDER, PRESET_RULES, PRESET_STATE, PRESET_SETTINGS, LOG_MAX, QUIZ, STATIONS, OPINION, teamId, typeOf, applyEvent, homeCheck } from "./data.js";
// 미리보기용 홈캠 기록 — 성공한 조는 모두 고친 설정, 아니면 처음 설정으로 돌린 결과
const homeCheckSummary = solved => {
  const r = solved ? homeCheck([], { acPresence: false, feederPause: false, vacuumBump: false }) : homeCheck(PRESET_RULES, PRESET_SETTINGS);
  const tests = solved ? r.tests.map(x => ({ id: x.id, ok: true, text: x.yes })) : r.tests.map(x => ({ id: x.id, ok: x.ok, text: x.ok ? x.yes : x.no }));
  return { pass: !!solved, ok: tests.filter(x => x.ok).length, tests };
};

const app = initializeApp({
  apiKey: "AIzaSyBC3M89Z6YTnpc7x6S5JvKhmB5BUIdIVlE",
  authDomain: "gccrc-crae.firebaseapp.com",
  projectId: "gccrc-crae",
  storageBucket: "gccrc-crae.firebasestorage.app",
  messagingSenderId: "578166929555",
  appId: "1:578166929555:web:08387d90f2326fe51a3566",
});
const auth = getAuth(app);
const db = getFirestore(app);
const API = location.hostname.endsWith(".vercel.app") ? "/api/newtech" : "https://retro-app-six.vercel.app/api/newtech";

export const me = { uid: null };
const waiters = [];
onAuthStateChanged(auth, u => {
  if (!u) return;
  me.uid = u.uid;
  waiters.splice(0).forEach(f => f());
  net("ok", "연결됨");
});
function net(cls, msg) {
  const d = document.getElementById("netdot"), m = document.getElementById("netmsg");
  if (d) d.className = "dot " + cls;
  if (m) m.textContent = msg;
}
export let ready = () => me.uid ? Promise.resolve() : new Promise(r => waiters.push(r));

const coll = (name, cb) => onSnapshot(collection(db, name), s => { const out = {}; s.forEach(d => out[d.id] = d.data()); cb(out); }, e => console.error(name, e));

export let watchState = cb => onSnapshot(doc(db, "hci7_state", "current"), s => cb(s.data() || { phase: "ready" }), e => console.error(e));
export let watchPeople = cb => coll("hci7_people", cb);
export let watchHomes = cb => coll("hci7_homes", cb);
export let watchOpinions = cb => coll("hci7_opinions", cb);
export let watchHome = (team, cb) => onSnapshot(doc(db, "hci7_homes", teamId(team)), s => cb(s.data() || null), e => console.error(e));

/** 내 기록 — 필드 단위로 합쳐 쓴다 */
export let savePerson = patch => setDoc(doc(db, "hci7_people", me.uid), { ...patch, updatedAt: Date.now() }, { merge: true });

const freshHome = () => ({ state: { ...PRESET_STATE }, rules: PRESET_RULES.map(r => ({ ...r, acts: [...r.acts] })), settings: { ...PRESET_SETTINGS }, log: [] });

/** 이벤트 하나 — 조원 여럿이 동시에 눌러도 꼬이지 않게 트랜잭션으로 */
export let homeEvent = (team, evId, who) => runTransaction(db, async tx => {
  const ref = doc(db, "hci7_homes", teamId(team));
  const snap = await tx.get(ref);
  const home = snap.exists() ? { ...freshHome(), ...snap.data() } : freshHome();
  const { state, fired } = applyEvent(home, evId);
  const entry = { at: Date.now(), ev: evId, who: String(who || "").slice(0, 20), fired };
  tx.set(ref, { state, log: [...(home.log || []), entry].slice(-LOG_MAX), updatedAt: Date.now(), by: me.uid, ...(snap.exists() ? {} : { rules: home.rules, settings: home.settings }) }, { merge: true });
});
/** 규칙 · 설계 목적 저장 (2차) */
export let saveHome = (team, patch) => setDoc(doc(db, "hci7_homes", teamId(team)), { ...patch, updatedAt: Date.now(), by: me.uid }, { merge: true });
/** 집을 처음 상태로 — 상태와 기록만 비우고 규칙은 둔다 */
export let clearHome = team => setDoc(doc(db, "hci7_homes", teamId(team)), { state: { ...PRESET_STATE }, log: [], updatedAt: Date.now(), by: me.uid }, { merge: true });
export let ensureHome = async team => {
  const ref = doc(db, "hci7_homes", teamId(team));
  await runTransaction(db, async tx => { const s = await tx.get(ref); if (!s.exists()) tx.set(ref, { ...freshHome(), updatedAt: Date.now(), by: me.uid }); });
};

export let saveOpinion = (team, patch) => setDoc(doc(db, "hci7_opinions", teamId(team)), { ...patch, updatedAt: Date.now(), by: me.uid }, { merge: true });

/* 쪽지 — 보낸 사람이 만들고, 받는 조의 조원만 답을 단다 (규칙이 hci7_people 의 조 번호로 확인) */
export let watchNotes = cb => coll("hci7_notes", cb);
export let sendNote = row => addDoc(collection(db, "hci7_notes"), { ...row, fromUid: me.uid, at: Date.now() });
export let replyNote = (id, reply) => updateDoc(doc(db, "hci7_notes", id), { ...reply, replyUid: me.uid, repliedAt: Date.now() });

async function call(body, withToken) {
  const headers = { "Content-Type": "application/json" };
  if (withToken) headers.Authorization = "Bearer " + await auth.currentUser.getIdToken();
  const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}
export let adminCall = (code, op, extra = {}) => call({ action: "admin", code, op, ...extra });
/** AI 면접 — 답변 내용 채점과 다음 질문 { score, reason, next } */
export let interviewAI = body => call({ action: "interview", ...body }, true);
/** 예약 비서 — 학생의 말을 예약 조작과 짧은 답으로 { ops, answer } */
export let agentAI = body => call({ action: "agent", ...body }, true);

/* ── 미리보기 (?demo=r1 처럼 붙이면) ──────────────────
   파이어베이스와 버셀을 건드리지 않고, 이 브라우저 안의 가짜 자료로 모든 화면을 돌려 본다.
   단계 이름을 붙이면 그 단계에서 시작한다. ?team=3 으로 조(유형)를 고를 수 있다. */
const DEMO = new URLSearchParams(location.search).get("demo");
export const isDemoMode = DEMO !== null;
if (isDemoMode) {
  const phase = PHASE_ORDER.includes(DEMO) ? DEMO : "r1";
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const on = f => { subs.add(f); f(); return () => subs.delete(f); };
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const D = { state: { phase }, people: {}, homes: {}, opinions: {}, notes: {} };
  const later = PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("reveal");
  const afterCheck = PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf("check");
  // 반 전체 가짜 기록 — 유형별로 그럴듯하게 차이를 둔다
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const type = typeOf(t);
    const pOk = { A: .8, B: .5, C: .3 }[type];
    const solved = type === "A" ? rnd() < .7 : type === "B" ? rnd() < .3 : false;
    for (let k = 0; k < 4 + (t % 2); k++) {
      const uid = `demo_${t}_${k}`;
      const answers = Object.fromEntries(QUIZ.map(q => [q.id, q.multi ? q.a.filter(() => rnd() < pOk).concat(rnd() < .3 ? [q.opts.length - 1] : []) : (rnd() < pOk ? q.a : (q.a + 1) % q.opts.length)]));
      const eff = Object.fromEntries(STATIONS.map(s => [s.id, Math.max(1, Math.min(5, Math.round({ A: 4, B: 3.2, C: 2.2 }[type] + (rnd() - .5) * 2)))]));
      const app = type !== "C";
      D.people[uid] = { team: t, name: `${t}조 ${k + 1}`, type, help: { r1: Math.round(rnd() * 2) },
        ...(app ? {
          emo: { r1: { attempts: [{ total: 50 + Math.round(rnd() * 30), at: Date.now() }], passed: rnd() < (type === "A" ? .55 : .2), opened: rnd() < .6 } },
          homeEv: { r1: { calls: 1 + Math.round(rnd() * 3), pass: solved } },
          agent: { r1: { met: type === "A" ? 4 + Math.round(rnd() * 3) : 2 + Math.round(rnd() * 3), final: { rest: "haeo" } } },
          potion: type === "A" ? { r1: { used: Math.round(rnd() * 6) } } : undefined,
        } : {}),
        ...(afterCheck ? { quiz: { answers, eff, at: Date.now() } } : {}) };
      if (!D.people[uid].potion) delete D.people[uid].potion;
    }
    if (afterCheck) D.homes[teamId(t)] = { ...freshHome(), checks: typeOf(t) === "C" ? {} : { r1: { ...homeCheckSummary(solved), at: Date.now() } } };
    // 다 유형 조원은 쪽지를 많이, 나머지는 가끔 — 답은 대부분 달린다
    for (let k = 0; k < (type === "C" ? 6 : 1); k++) {
      if (phase === "ready") break;
      const to = 1 + Math.floor(rnd() * TEAM_COUNT);
      if (to === t) continue;
      const nid = `n_${t}_${k}`, ans = rnd() < .75;
      D.notes[nid] = { fromTeam: t, fromName: `${t}조 ${k % 4 + 1}`, fromUid: `demo_${t}_${k % 4}`, fromType: type, toTeam: to, st: ["emo", "home", "agent"][k % 3],
        text: ["표정 인식 화면에서 판정이 바뀌는 조건이 뭐예요?", "밤에 문 열면 조명이 어떻게 돼요?", "예약 비서 결과에서 이상한 점 있었어요?"][k % 3], at: Date.now() - (6 - k) * 60000, phase: "r1",
        ...(ans ? { reply: "미리보기 답 — 실제로는 받은 조가 씁니다", replyName: `${to}조`, replyTeam: to, repliedAt: Date.now() - k * 30000 } : {}) };
    }
    if (later && phase !== "reveal" && rnd() < .7) D.opinions[teamId(t)] = Object.fromEntries(OPINION.map(o => [o.id, `미리보기 의견 (${t}조) — 실제로는 조가 씁니다`]));
  }
  me.uid = "demo";
  ready = () => Promise.resolve();
  const copy = o => JSON.parse(JSON.stringify(o));
  watchState = cb => on(() => cb({ ...D.state }));
  watchPeople = cb => on(() => cb(copy(D.people)));
  watchHomes = cb => on(() => cb(copy(D.homes)));
  watchOpinions = cb => on(() => cb(copy(D.opinions)));
  watchNotes = cb => on(() => cb(copy(D.notes)));
  sendNote = async row => { D.notes["n" + Date.now()] = { ...copy(row), fromUid: "demo", at: Date.now() }; emit(); };
  replyNote = async (id, reply) => { D.notes[id] = { ...D.notes[id], ...copy(reply), replyUid: "demo", repliedAt: Date.now() }; emit(); };
  watchHome = (team, cb) => on(() => cb(D.homes[teamId(team)] ? copy(D.homes[teamId(team)]) : null));
  const deep = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) ? deep(a[k] && typeof a[k] === "object" ? a[k] : {}, v) : v; return a; };
  savePerson = async patch => { D.people.demo = deep(D.people.demo || {}, copy(patch)); emit(); };
  homeEvent = async (team, evId, who) => {
    const id = teamId(team), home = D.homes[id] || freshHome();
    const { state, fired } = applyEvent(home, evId);
    D.homes[id] = { ...home, state, log: [...(home.log || []), { at: Date.now(), ev: evId, who, fired }].slice(-LOG_MAX) };
    emit();
  };
  saveHome = async (team, patch) => { const id = teamId(team); D.homes[id] = { ...(D.homes[id] || freshHome()), ...copy(patch) }; emit(); };
  clearHome = async team => { const id = teamId(team); D.homes[id] = { ...(D.homes[id] || freshHome()), state: { ...PRESET_STATE }, log: [] }; emit(); };
  ensureHome = async team => { const id = teamId(team); if (!D.homes[id]) { D.homes[id] = freshHome(); emit(); } };
  saveOpinion = async (team, patch) => { const id = teamId(team); D.opinions[id] = { ...(D.opinions[id] || {}), ...patch }; emit(); };
  interviewAI = async body => {
    await new Promise(r => setTimeout(r, 900));
    const n = String(body.answer || "").trim().length;
    const next = body.nextLevel ? `(미리보기) 방금 말씀하신 내용에 대해 조금 더 말씀해 주세요. [난이도 ${body.nextLevel}]` : "";
    return { score: Math.min(90, 10 + n), reason: n ? "미리보기 채점 — 실제로는 AI가 내용을 봄" : "답변 없음", next };
  };
  // 미리보기용 아주 단순한 알아듣기 — 실제 수업에서는 AI가 한다
  agentAI = async ({ message, booking }) => {
    await new Promise(r => setTimeout(r, 600));
    const m = String(message), ops = [], has = w => m.includes(w);
    const num = (m.match(/(\d+)\s*(명|인)/) || [])[1];
    if (!booking && (has("예약") || has("잡아"))) ops.push({ op: "book", value: num || "0" });
    else if (booking) {
      if (has("해오름")) ops.push({ op: "rest", value: "haeo" }); else if (has("바람채")) ops.push({ op: "rest", value: "baram" }); else if (has("다른")) ops.push({ op: "rest", value: "baram" });
      if (num) ops.push({ op: "people", value: num });
      if (has("금요일")) ops.push({ op: "slot", value: "fri19" });
      if (has("땅콩")) ops.push({ op: "note", value: "peanut" });
      if (has("유아") || has("아기 의자")) ops.push({ op: "note", value: "highchair" });
      if (has("주차") && has("등록")) ops.push({ op: "note", value: "parking" });
      if (has("휠체어") && has("요청")) ops.push({ op: "note", value: "wheel" });
    }
    const q = m.includes("?") || has("돼") || has("어때") || has("뭐");
    return { ops, answer: q ? "(미리보기) 실제 수업에서는 AI가 식당 정보로 답합니다." : "" };
  };
  adminCall = async (code, op, extra = {}) => {
    if (op === "phase") { D.state = { ...D.state, phase: extra.phase }; emit(); }
    if (op === "reset") { D.people = {}; D.homes = {}; D.opinions = {}; D.notes = {}; D.state = { phase: "ready" }; emit(); }
    return { ok: true };
  };
  document.title = "[미리보기] " + document.title;
  addEventListener("DOMContentLoaded", () => {
    net("ok", "미리보기");
    const b = document.createElement("div");
    b.textContent = "미리보기 — 가짜 자료입니다. 실제 수업 기록에 남지 않습니다.";
    b.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#C8612F;color:#fff;text-align:center;padding:4px;font-size:13px;z-index:99";
    document.body.appendChild(b);
  });
} else {
  signInAnonymously(auth).catch(e => { console.error(e); net("bad", "연결 실패 — 새로고침해 주십시오"); });
}
