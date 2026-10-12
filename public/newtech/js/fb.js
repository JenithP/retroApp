// 신기술 인터페이스 체험 실습 — 파이어베이스 연결과 버셀 함수 호출. 2~6주차와 같은 프로젝트(gccrc-crae), 모음은 hci7_ 로 시작한다.
//   hci7_state/current   단계 (버셀 함수만 씀)
//   hci7_people/{uid}    학생 한 사람의 기록 — 체험 시간 · 도움 요청 · 표정 판정 비교 · 예약 결정 · 확인 과제
//   hci7_homes/{T01}     조의 스마트홈 — 기기 상태 · 규칙 · 실행 기록 · 설계 목적
//   hci7_opinions/{T01}  조별 의견
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { TEAM_COUNT, PHASE_ORDER, PRESET_RULES, PRESET_STATE, LOG_MAX, QUIZ, STATIONS, OPINION, teamId, typeOf, applyEvent } from "./data.js";

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

const freshHome = () => ({ state: { ...PRESET_STATE }, rules: PRESET_RULES.map(r => ({ ...r, acts: [...r.acts] })), log: [] });

/** 이벤트 하나 — 조원 여럿이 동시에 눌러도 꼬이지 않게 트랜잭션으로 */
export let homeEvent = (team, evId, who) => runTransaction(db, async tx => {
  const ref = doc(db, "hci7_homes", teamId(team));
  const snap = await tx.get(ref);
  const home = snap.exists() ? { ...freshHome(), ...snap.data() } : freshHome();
  const { state, fired } = applyEvent(home, evId);
  const entry = { at: Date.now(), ev: evId, who: String(who || "").slice(0, 20), fired };
  tx.set(ref, { state, rules: home.rules, log: [...(home.log || []), entry].slice(-LOG_MAX), updatedAt: Date.now(), by: me.uid }, { merge: true });
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

async function call(body) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}
export let adminCall = (code, op, extra = {}) => call({ action: "admin", code, op, ...extra });

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
  const D = { state: { phase }, people: {}, homes: {}, opinions: {} };
  const later = PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf("reveal");
  const afterCheck = PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf("check");
  // 반 전체 가짜 기록 — 유형별로 그럴듯하게 차이를 둔다
  for (let t = 1; t <= TEAM_COUNT; t++) {
    const type = typeOf(t);
    const pOk = { A: { 개념: .85, 체험: .8 }, B: { 개념: .7, 체험: .55 }, C: { 개념: .65, 체험: .3 } }[type];
    for (let k = 0; k < 4 + (t % 2); k++) {
      const uid = `demo_${t}_${k}`;
      const answers = Object.fromEntries(QUIZ.map(q => [q.id, rnd() < pOk[q.kind] ? q.a : (q.a + 1 + Math.floor(rnd() * 3)) % q.opts.length]));
      const eff = Object.fromEntries(STATIONS.map(s => [s.id, Math.max(1, Math.min(5, Math.round({ A: 4, B: 3.3, C: 2.2 }[type] + (rnd() - .5) * 2)))]));
      const sec = type === "C" ? { manual: 300 + rnd() * 200 } : { emo: 400 + rnd() * 200, home: 400 + rnd() * 200, agent: 200 + rnd() * 100 };
      D.people[uid] = { team: t, name: `${t}조 ${k + 1}`, type, help: { r1: type === "C" ? Math.round(rnd() * 4) : Math.round(rnd() * 2) },
        t: { r1: sec },
        emo: type === "C" ? {} : { match: Math.round(rnd() * 4), mismatch: Math.round(rnd() * 5) },
        agent: type === "C" ? {} : { r1: { detail: rnd() < (type === "A" ? .9 : .35), steps: rnd() < (type === "A" ? .7 : .2), decision: rnd() < (type === "A" ? .8 : .3) ? "fix" : "confirm" } },
        ...(afterCheck ? { quiz: { answers, eff, at: Date.now() } } : {}) };
    }
    if (afterCheck) D.homes[teamId(t)] = { ...freshHome(), purpose: rnd() < .5 ? "미리보기 — 밤에 화장실 갈 때 눈부심 줄이기" : "", rules: PRESET_RULES.slice(0, 3 + (t % 3)) };
    if (later && phase !== "reveal" && rnd() < .7) D.opinions[teamId(t)] = Object.fromEntries(OPINION.map(o => [o.id, `미리보기 의견 (${t}조) — 실제로는 조가 씁니다`]));
  }
  me.uid = "demo";
  ready = () => Promise.resolve();
  const copy = o => JSON.parse(JSON.stringify(o));
  watchState = cb => on(() => cb({ ...D.state }));
  watchPeople = cb => on(() => cb(copy(D.people)));
  watchHomes = cb => on(() => cb(copy(D.homes)));
  watchOpinions = cb => on(() => cb(copy(D.opinions)));
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
  adminCall = async (code, op, extra = {}) => {
    if (op === "phase") { D.state = { ...D.state, phase: extra.phase }; emit(); }
    if (op === "reset") { D.people = {}; D.homes = {}; D.opinions = {}; D.state = { phase: "ready" }; emit(); }
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
