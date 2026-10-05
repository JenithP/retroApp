// VR · AR 적용 판단 실습 — 파이어베이스 연결과 버셀 함수 호출. 2~5주차와 같은 프로젝트(gccrc-crae)를 쓴다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { CARDS, QUAD_KEYS, THEORIES, SIDES, CHECKS, TEAM_COUNT, teamId, sideTargetOf, sideDocId } from "./data.js";

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

// 버셀에 올린 판에서는 같은 곳의 함수를, 다른 곳(로컬 등)에서는 버셀 주소를 부른다
const API = location.hostname.endsWith(".vercel.app") ? "/api/vrcard" : "https://retro-app-six.vercel.app/api/vrcard";

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

const coll = (name, cb) => onSnapshot(collection(db, name), s => { const out = {}; s.forEach(d => out[d.id] = d.data()); cb(out); });

export let watchState = cb => onSnapshot(doc(db, "hci6_state", "current"), s => cb(s.data() || { phase: "ready" }));
export let watchBoards = cb => coll("hci6_boards", cb);
export let watchDesigns = cb => coll("hci6_designs", cb);
export let watchSides = cb => coll("hci6_sides", cb);

// 카드 한 장만 합쳐 쓴다 — 조원이 서로 다른 카드를 동시에 고쳐도 덮어쓰지 않게
export let saveCard = (team, key, card) =>
  setDoc(doc(db, "hci6_boards", teamId(team)), { cards: { [key]: card }, updatedAt: Date.now(), by: me.uid }, { merge: true });
export let saveDesign = (team, patch) =>
  setDoc(doc(db, "hci6_designs", teamId(team)), { ...patch, updatedAt: Date.now(), by: me.uid }, { merge: true });
export let saveSide = (target, from, items) =>
  setDoc(doc(db, "hci6_sides", sideDocId(target, from)), { target: Number(target), from: Number(from), items, updatedAt: Date.now(), by: me.uid }, { merge: true });
export let saveReply = (target, from, replies) =>
  setDoc(doc(db, "hci6_sides", sideDocId(target, from)), { replies, replyBy: me.uid, repliedAt: Date.now() }, { merge: true });

export let adminCall = async (code, op, extra = {}) => {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", code, op, ...extra }) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
};

/* ── 미리보기 (?demo=sort 처럼 붙이면) ──────────────────
   파이어베이스와 버셀을 건드리지 않고, 이 브라우저 안의 가짜 자료로 모든 화면을 돌려 본다.
   리허설과 화면 확인용. 단계 이름을 붙이면 그 단계에서 시작한다. */
const DEMO = new URLSearchParams(location.search).get("demo");
export const isDemoMode = DEMO !== null;
if (isDemoMode) {
  const phase = ["ready", "sort", "share", "design", "side", "reply", "end"].includes(DEMO) ? DEMO : "sort";
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const on = f => { subs.add(f); f(); return () => subs.delete(f); };
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = a => a[Math.floor(rnd() * a.length)];
  // 카드마다 그럴듯한 쏠림 — 실제 수업에서 갈릴 만한 카드는 고르게 섞는다
  const LEAN = { 1: "vr", 2: "vr", 3: "guide", 4: "guide", 5: "train", 6: "guide", 7: "guide", 8: null, 9: null, 10: "keep",
                 11: null, 12: "vr", 13: "guide", 14: "vr", 15: "keep", 16: "keep", 17: "guide", 18: "guide" };
  const D = { state: { phase }, boards: {}, designs: {}, sides: {} };
  const later = ["share", "design", "side", "reply", "end"].includes(phase);
  for (let t = 1; t <= TEAM_COUNT; t++) {
    if (t === 1 && phase === "sort") continue;   // 1조는 빈 채로 — 직접 해 보는 자리
    const cards = {};
    CARDS.forEach(c => {
      if (!later && rnd() < 0.3) return;
      const q = LEAN[c.id] && rnd() < 0.7 ? LEAN[c.id] : pick(QUAD_KEYS);
      cards[c.id] = { q, warn: [c.id === "17" || c.id === "18" ? 1 : 0, ["8", "9", "10", "11"].includes(c.id) && rnd() < .6 ? 2 : 0].filter(Boolean),
        theory: pick(THEORIES).id, why: "미리보기용 근거 문장입니다 — 실제로는 조가 적습니다" };
    });
    D.boards[teamId(t)] = { cards, updatedAt: Date.now() - t * 30000, by: "demo" };
    if (["side", "reply", "end"].includes(phase) || (phase === "design" && t % 2)) {
      D.designs[teamId(t)] = { card: pick(["1", "3", "5", "12", "14"]), kind: rnd() < .5 ? "VR" : "AR",
        who: "미리보기 — 누가 언제 어디서", pain: "지금 방식의 불편", change: "VR · AR로 바꾸면 달라지는 점", theory: pick(THEORIES).id,
        checks: Object.fromEntries(CHECKS.map(c => [c.id, "미리보기 답"])), sketch: "", updatedAt: Date.now(), by: "demo" };
    }
    if (["reply", "end"].includes(phase)) {
      const target = sideTargetOf(t);
      D.sides[sideDocId(target, t)] = { target, from: t, items: [{ kind: pick(SIDES).id, note: "미리보기 부작용" }, { kind: pick(SIDES).id, note: "하나 더" }], by: "demo", updatedAt: Date.now(),
        ...(phase === "end" ? { replies: ["대응책 예시", ""] } : {}) };
    }
  }
  me.uid = "demo";
  ready = () => Promise.resolve();
  watchState = cb => on(() => cb({ ...D.state }));
  watchBoards = cb => on(() => cb(JSON.parse(JSON.stringify(D.boards))));
  watchDesigns = cb => on(() => cb(JSON.parse(JSON.stringify(D.designs))));
  watchSides = cb => on(() => cb(JSON.parse(JSON.stringify(D.sides))));
  saveCard = async (team, key, card) => { const b = D.boards[teamId(team)] ||= { cards: {} }; b.cards[key] = card; b.updatedAt = Date.now(); b.by = "demo"; emit(); };
  saveDesign = async (team, patch) => { D.designs[teamId(team)] = { ...(D.designs[teamId(team)] || {}), ...patch, updatedAt: Date.now(), by: "demo" }; emit(); };
  saveSide = async (target, from, items) => { const id = sideDocId(target, from); D.sides[id] = { ...(D.sides[id] || {}), target, from, items, by: "demo", updatedAt: Date.now() }; emit(); };
  saveReply = async (target, from, replies) => { const id = sideDocId(target, from); D.sides[id] = { ...(D.sides[id] || {}), replies, replyBy: "demo", repliedAt: Date.now() }; emit(); };
  adminCall = async (code, op, extra = {}) => {
    if (op === "phase") { D.state = { ...D.state, phase: extra.phase }; emit(); }
    if (op === "reset") { D.boards = {}; D.designs = {}; D.sides = {}; D.state = { phase: "ready" }; emit(); }
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
