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

/** 한 회차 기록을 남긴다. 실패해도 실습은 계속되어야 하므로 던지지 않는다. */
export async function saveRun(row) {
  try {
    await whenReady();
    await addDoc(collection(db, "runs"), {
      ...row, uid: state.uid, createdAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

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
