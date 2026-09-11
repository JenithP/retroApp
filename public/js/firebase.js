// 파이어베이스 연결 — 익명 로그인과 기록 저장만 담당한다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp,
         onSnapshot, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyBC3M89Z6YTnpc7x6S5JvKhmB5BUIdIVlE",
  authDomain: "gccrc-crae.firebaseapp.com",
  projectId: "gccrc-crae",
  storageBucket: "gccrc-crae.firebasestorage.app",
  messagingSenderId: "578166929555",
  appId: "1:578166929555:web:08387d90f2326fe51a3566",
};

const app  = initializeApp(config);
const auth = getAuth(app);
const db   = getFirestore(app);

export const state = { uid: null, ready: false };
const waiters = [];

onAuthStateChanged(auth, u => {
  if (!u) return;
  state.uid = u.uid;
  state.ready = true;
  waiters.splice(0).forEach(fn => fn());
  net("ok", "연결됨");
});

signInAnonymously(auth).catch(e => {
  console.error(e);
  net("bad", "연결 실패 — 기록은 이 기기에만 남습니다");
});

export function whenReady() {
  return state.ready ? Promise.resolve() : new Promise(r => waiters.push(r));
}

function net(cls, msg) {
  const d = document.getElementById("netdot");
  const m = document.getElementById("netmsg");
  if (d) d.className = "dot " + cls;
  if (m) m.textContent = msg;
}

/* ── 회차 저장 ────────────────────────────────────────
   교실 무선망은 자주 끊긴다. 끊겼다고 학생의 기록이 사라지면 안 되므로,
   못 보낸 것은 담아 두었다가 연결되면 스스로 다시 보낸다. */

const PEND = "pending_runs";
const pend = () => { try { return JSON.parse(localStorage.getItem(PEND)) || []; } catch (e) { return []; } };
const setPend = a => { try { localStorage.setItem(PEND, JSON.stringify(a.slice(-80))); } catch (e) {} };
export const pendingCount = () => pend().length;

/** 회차마다 이름표를 하나 만든다. 다시 보내도 같은 이름표라 겹쳐 쌓이지 않는다. */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

/** 인증을 무한정 기다리지 않는다. 기다리기만 하면 학생은 멈춘 화면만 본다. */
function ready(ms) {
  return Promise.race([
    whenReady(),
    new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("연결이 늦습니다"),
      { code: "auth-timeout" })), ms)),
  ]);
}

async function write(id, row, coll = "runs") {
  await ready(9000);
  await setDoc(doc(db, coll, id), { ...row, uid: state.uid, createdAt: serverTimestamp() });
}

/** 한 회차를 남긴다. 돌려주는 값 — "ok" 보냄 · "queued" 담아 둠 · "denied" 규칙이 거절함
 *  coll 은 모음 이름 — 2주차 거실은 runs, 3주차 활자의 문은 time */
export async function saveRun(row, coll = "runs") {
  const id = newId();
  try {
    await write(id, row, coll);
    flush();                                  // 밀린 것이 있으면 이참에 같이 보낸다
    return "ok";
  } catch (e) {
    console.error("saveRun", e.code || e.message, e);
    if (e.code === "permission-denied") return "denied";   // 다시 해도 소용없다
    setPend([...pend(), { id, row, coll }]);
    return "queued";
  }
}

let flushing = false;
/** 담아 둔 회차를 다시 보낸다. 이미 들어간 것은 규칙이 막아 주므로 그대로 버린다. */
export async function flush() {
  if (flushing) return;
  const q = pend();
  if (!q.length) return;
  flushing = true;
  const left = [];
  for (const it of q) {
    try { await write(it.id, it.row, it.coll || "runs"); }
    catch (e) { if (e.code !== "permission-denied") left.push(it); }
  }
  setPend(left);
  flushing = false;
}

addEventListener("online", flush);
setInterval(flush, 30000);
whenReady().then(flush);

/** 지금 어느 스테이션에 있는지 — 교수용 현황판이 읽는다. */
export async function ping(team, name, where) {
  try {
    await whenReady();
    await setDoc(doc(db, "presence", state.uid),
      { team, name, where, at: serverTimestamp() }, { merge: true });
  } catch (e) { /* 현황판용이라 실패해도 무시한다 */ }
}

/* ── 교수용 현황판이 읽는 통로 ─────────────────────────
   학생 화면은 쓰기만 하고, 읽기는 현황판에서만 한다. */

/** 제출된 회차를 들어온 순서대로 지켜본다. */
export async function watchRuns(cb) {
  await whenReady();
  return onSnapshot(query(collection(db, "runs"), orderBy("createdAt")),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error(e));
}

/** 지금 누가 어느 자리에 있는지 지켜본다. */
export async function watchPresence(cb) {
  await whenReady();
  return onSnapshot(collection(db, "presence"),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error(e));
}
