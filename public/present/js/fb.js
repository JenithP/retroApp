// 조별 발표 — 파이어베이스 연결과 버셀 함수 호출. 2~7주차와 같은 프로젝트(gccrc-crae), 모음은 hcipres_ 로 시작한다.
//   hcipres_state/current   신청 잠금 · 발표 일정(조마다 주차 · 순서 · 열람 시각 · 질문 마감) — 버셀 함수만 씀
//   hcipres_people/{uid}    학생 — 조 · 학번 · 이름 (자기 것만)
//   hcipres_picks/{T01}     조가 신청한 문헌 — 버셀 함수만 씀 (문헌당 3개 조 제한)
//   hcipres_files/{T01}     올린 발표 자료 정보 — 버셀 함수만 씀 (파일은 Storage present/T01/deck.pdf)
//   hcipres_questions/{T01_uid}  발표마다 학생 한 명이 질문 하나 — 학생이 직접, 열람 시각부터 질문 마감까지, 고칠 수 없음
//   hcipres_select/{T01}    AI가 고른 질문 3개와 공개한 수 — 버셀 함수만 씀
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { teamId } from "./data.js";

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
const API = location.hostname.endsWith(".vercel.app") ? "/api/present" : "https://retro-app-six.vercel.app/api/present";

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
export const ready = () => me.uid ? Promise.resolve() : new Promise(r => waiters.push(r));
signInAnonymously(auth).catch(e => { console.error(e); net("bad", "연결 실패 — 새로고침해 주십시오"); });

const coll = (q, cb) => onSnapshot(q, s => { const out = {}; s.forEach(d => out[d.id] = d.data()); cb(out); }, e => console.error(e));
const toDate = v => v?.toDate ? v.toDate() : v ? new Date(v) : null;

export const watchState = cb => onSnapshot(doc(db, "hcipres_state", "current"), s => {
  const d = s.data() || {};
  const slots = Object.fromEntries(Object.entries(d.slots || {}).map(([k, v]) => [k, { ...v, open: toDate(v.open), close: toDate(v.close) }]));
  cb({ locked: !!d.locked, slots });
}, e => console.error(e));
export const watchPicks = cb => coll(collection(db, "hcipres_picks"), cb);
export const watchFiles = cb => coll(collection(db, "hcipres_files"), cb);
export const watchSelect = cb => coll(collection(db, "hcipres_select"), cb);
export const watchPeople = cb => coll(collection(db, "hcipres_people"), cb);
export const watchMyQuestions = cb => coll(query(collection(db, "hcipres_questions"), where("uid", "==", me.uid)), cb);

export const savePerson = p => setDoc(doc(db, "hcipres_people", me.uid), { ...p, at: Date.now() });
/** 질문 하나 — 문서 이름이 「발표 조_학생」이라 같은 발표에 두 번 등록할 수 없다 */
export const addQuestion = (target, person, text) => setDoc(doc(db, "hcipres_questions", `${teamId(target)}_${me.uid}`), {
  target: teamId(target), uid: me.uid, sid: person.sid, name: person.name, team: person.team, text, at: Date.now(),
});

async function call(body, withToken) {
  const headers = { "Content-Type": "application/json" };
  if (withToken) headers.Authorization = "Bearer " + await auth.currentUser.getIdToken();
  const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}
export const pickPaper = (team, paper) => call({ action: "pick", team, paper }, true);
export const fileUrl = team => call({ action: "file", team }, true);
export const uploadChunk = body => call({ action: "upload", ...body }, true);
export const adminCall = (code, op, extra = {}) => call({ action: "admin", code, op, ...extra });
