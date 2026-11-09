// 아바타 신뢰 게임 — 파이어베이스 연결과 버셀 함수 호출. 앞 주차와 같은 프로젝트(gccrc-crae)를 쓴다.
//
// 학생이 직접 쓰는 것은 채팅 · 단서 메시지뿐이다. 입장 · 신호 · 결정은 함수(api/trust.js)로 보낸다.
// ?fresh  — 탭마다 새 익명 사용자 (한 컴퓨터에서 여러 명을 시험할 때)
// ?demo   — 파이어베이스 없이 이 브라우저 안에서 봇 상대와 한 판씩 돌려 본다
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, query, orderBy, getDoc }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { matchRound, nicks, pairId, seatId, cleanMove, settle, cleanNick, CUE_IDS, TALK_SEC } from "./game.js";

const params = new URLSearchParams(location.search);
export const isDemo = params.has("demo");
const fresh = params.has("fresh");

const API = location.hostname.endsWith(".vercel.app") ? "/api/trust" : "https://retro-app-six.vercel.app/api/trust";

export const me = { uid: null };
const waiters = [];
const gotUid = uid => { me.uid = uid; waiters.splice(0).forEach(f => f()); };
export let ready = () => me.uid ? Promise.resolve() : new Promise(r => waiters.push(r));

export let watchState, watchPerson, watchSeat, watchPair, watchMsgs, sendMsg, join, ping, move, reflect, myRounds, botTurn;
export let demoTools = null;

if (!isDemo) {
  const app = initializeApp({
    apiKey: "AIzaSyBC3M89Z6YTnpc7x6S5JvKhmB5BUIdIVlE",
    authDomain: "gccrc-crae.firebaseapp.com",
    projectId: "gccrc-crae",
    storageBucket: "gccrc-crae.firebasestorage.app",
    messagingSenderId: "578166929555",
    appId: "1:578166929555:web:08387d90f2326fe51a3566",
  });
  const auth = initializeAuth(app, { persistence: fresh ? inMemoryPersistence : browserLocalPersistence });
  const db = getFirestore(app);
  onAuthStateChanged(auth, u => { if (u) gotUid(u.uid); });
  // 저장된 로그인을 먼저 되살린다 — 바로 새로 로그인하면 새로고침마다 다른 사람이 된다
  auth.authStateReady().then(() => auth.currentUser || signInAnonymously(auth)).catch(e => console.error(e));

  const call = async body => {
    const headers = { "Content-Type": "application/json", Authorization: "Bearer " + await auth.currentUser.getIdToken() };
    const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch { /* 빈 답 */ }
    if (!r.ok) throw Object.assign(new Error(data.error || `서버 응답 ${r.status}`), { status: r.status });
    return data;
  };
  const quiet = (cb, empty) => () => cb(empty);

  watchState = cb => onSnapshot(doc(db, "hci11_state", "current"), s => cb(s.data() || { phase: "lobby", round: 0 }), quiet(cb, { phase: "lobby", round: 0 }));
  watchPerson = cb => onSnapshot(doc(db, "hci11_people", me.uid), s => cb(s.data() || null), quiet(cb, null));
  watchSeat = (round, cb) => onSnapshot(doc(db, "hci11_seats", seatId(me.uid, round)), s => cb(s.data() || null), quiet(cb, null));
  watchPair = (id, cb) => onSnapshot(doc(db, "hci11_pairs", id), s => cb(s.data() || null), quiet(cb, null));
  watchMsgs = (id, cb) => onSnapshot(query(collection(db, "hci11_pairs", id, "msgs"), orderBy("at")),
    s => cb(s.docs.map(d => d.data())), quiet(cb, []));
  sendMsg = (id, m) => addDoc(collection(db, "hci11_pairs", id, "msgs"), { ...m, by: me.uid, at: Date.now() });
  join = (sid, name, nick) => call({ action: "join", sid, name, nick });
  ping = () => call({ action: "ping" });
  move = v => call({ action: "move", ...v });
  reflect = v => call({ action: "reflect", ...v });
  botTurn = (pairId, nudge = false) => call({ action: "bot", pairId, nudge });
  // 1판부터 n판까지 내 자리 (결과가 붙은 것) — .docx 에 넣는다
  myRounds = async n => (await Promise.all(Array.from({ length: n }, (_, i) =>
    getDoc(doc(db, "hci11_seats", seatId(me.uid, i + 1))).then(s => s.data() || null).catch(() => null)))).filter(Boolean);
} else {
  /* ── 미리보기: 나 + 봇 셋. 아래 도구 막대로 단계를 넘긴다 ── */
  gotUid("me");
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const on = f => { subs.add(f); f(); return () => subs.delete(f); };
  const clone = v => JSON.parse(JSON.stringify(v ?? null));
  const D = {
    state: { phase: "lobby", round: 0 },
    people: {}, seats: {}, pairs: {}, moves: {}, msgs: {},
  };
  ["bot1", "bot2", "bot3"].forEach((uid, i) => {
    D.people[uid] = { uid, sid: "20260000" + i, name: "봇" + (i + 1), nick: ["달빛곰", "코코", "민트초코"][i], score: 0, trusteeN: 0, restN: 0, partners: [] };
  });
  let timers = [];
  const clearBots = () => { timers.forEach(clearInterval); timers = []; };
  const botTalk = (pid, uid) => {
    const lines = ["안녕하세요!", "많이 보내 주시면 꼭 많이 돌려드릴게요", "저 믿으셔도 돼요 ㅎㅎ", "반반 어때요?", "음..."];
    timers.push(setInterval(() => {
      if (D.state.phase !== "talk") return;
      const cond = D.pairs[pid].cond;
      const useText = cond !== "cue" && (cond === "text" || Math.random() < 0.3);
      const m = useText ? { kind: "text", text: lines[Math.floor(Math.random() * lines.length)] }
        : { kind: "cue", cue: CUE_IDS[Math.floor(Math.random() * CUE_IDS.length)] };
      (D.msgs[pid] ||= []).push({ ...m, by: uid, at: Date.now() });
      emit();
    }, 3500 + Math.random() * 2500));
  };

  watchState = cb => on(() => cb(clone(D.state)));
  watchPerson = cb => on(() => cb(clone(D.people.me)));
  watchSeat = (round, cb) => on(() => cb(clone(D.seats[seatId("me", round)])));
  watchPair = (id, cb) => on(() => cb(clone(D.pairs[id])));
  watchMsgs = (id, cb) => on(() => cb(clone(D.msgs[id] || [])));
  sendMsg = async (id, m) => {
    if (D.state.phase !== "talk") throw new Error("대화 단계가 아님");
    (D.msgs[id] ||= []).push({ ...m, by: "me", at: Date.now() }); emit();
  };
  join = async (sid, name, nick) => {
    nick = cleanNick(nick);
    if (!nick) throw new Error("닉네임을 정해 주세요");
    if (Object.values(D.people).some(p => p.uid !== "me" && p.nick === nick)) throw new Error("이미 다른 사람이 쓰는 닉네임입니다");
    D.people.me = { ...(D.people.me || { score: 0, trusteeN: 0, restN: 0, partners: [] }), uid: "me", sid, name, nick }; emit();
  };
  ping = async () => ({ ok: true });
  botTurn = async () => ({ ok: true });            // 미리보기의 상대는 이미 봇이다
  reflect = async v => { D.people.me.reflect = { ...v, at: Date.now() }; console.info("[미리보기] 생각", v); };
  myRounds = async n => Array.from({ length: n }, (_, i) => clone(D.seats[seatId("me", i + 1)])).filter(Boolean);
  move = async v => {
    const seat = D.seats[seatId("me", D.state.round)];
    const c = cleanMove(seat?.role, v);
    if (!c) throw new Error("값을 확인해 주세요");
    const onlyRet = seat.role === "trustee" && Object.keys(c).every(k => k === "ret");
    if (!(D.state.phase === "decide" || (onlyRet && D.state.phase === "talk"))) throw new Error("결정 단계에서 정할 수 있습니다");
    const key = seat.role === "investor" ? "inv" : "tru";
    D.moves[seat.pairId][key] = { ...(D.moves[seat.pairId][key] || {}), ...c };
  };

  demoTools = {
    next(cond = "both") {
      clearBots();
      const round = D.state.round + 1;
      const people = Object.values(D.people);
      const { pairs, rest } = matchRound(people, { missions: true });
      const nk = nicks(pairs.length * 2);
      pairs.forEach((p, i) => {
        const id = pairId(round, i);
        const names = []; names[i * 2] = D.people[p.inv].nick || nk[i * 2]; names[i * 2 + 1] = D.people[p.tru].nick || nk[i * 2 + 1];
        D.pairs[id] = { round, cond, uids: [p.inv, p.tru], inv: p.inv, tru: p.tru, invNick: names[i * 2], truNick: names[i * 2 + 1] };
        D.moves[id] = { mission: p.mission };
        D.seats[seatId(p.inv, round)] = { uid: p.inv, round, cond, pairId: id, role: "investor", nick: names[i * 2], partnerNick: names[i * 2 + 1], missions: true };
        D.seats[seatId(p.tru, round)] = { uid: p.tru, round, cond, pairId: id, role: "trustee", nick: names[i * 2 + 1], partnerNick: names[i * 2], mission: p.mission, missions: true };
        D.people[p.inv].partners.push(p.tru); D.people[p.tru].partners.push(p.inv); D.people[p.tru].trusteeN++;
        for (const u of [p.inv, p.tru]) if (u !== "me" && [p.inv, p.tru].includes("me")) botTalk(id, u);
      });
      if (rest) { D.seats[seatId(rest, round)] = { uid: rest, round, cond, pairId: null, role: "rest" }; D.people[rest].restN++; }
      D.state = { phase: "talk", round, cond, talkSec: TALK_SEC, missions: true, endsAt: Date.now() + TALK_SEC * 1000 };
      emit();
    },
    decide() { if (D.state.phase === "talk") { D.state = { ...D.state, phase: "decide" }; emit(); } },
    reveal() {
      if (D.state.phase !== "decide") return;
      clearBots();
      for (const [id, pair] of Object.entries(D.pairs)) {
        if (pair.round !== D.state.round || pair.result) continue;
        const mv = D.moves[id];
        if (pair.inv !== "me") mv.inv ||= { send: 6, predict: 50, guess: "honest", presence: 5, trust: 5 };
        if (pair.tru !== "me") mv.tru ||= { ret: mv.mission === "betray" ? 10 : 55, presence: 4, trust: 4 };
        const result = settle({ ...pair, mission: mv.mission }, mv, D.msgs[id] || []);
        pair.result = result; pair.mission = mv.mission;
        D.seats[seatId(pair.inv, pair.round)].result = result;
        D.seats[seatId(pair.tru, pair.round)].result = result;
        D.people[pair.inv].score += result.inv; D.people[pair.tru].score += result.tru;
      }
      D.state = { ...D.state, phase: "reveal" }; emit();
    },
    end() { D.state = { ...D.state, phase: "end" }; emit(); },
  };
  document.title = "[미리보기] " + document.title;
}
