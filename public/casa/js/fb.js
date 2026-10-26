// 기계에 대한 사회적 반응 실험 — 파이어베이스 연결과 버셀 함수 호출. 2~7주차와 같은 프로젝트(gccrc-crae)를 쓴다.
//
// 1부 기록(hci9_p1/N번호) — 학생은 읽을 수 없고 쓰기만 한다. 이름 · 학번은 받지 않는다.
//   번호 입력 때 문서를 만들어 번호를 잡아 두고(같은 번호를 두 사람이 못 쓰게),
//   평가 세션이 끝나면 지식 점수 · 시험 답을, 화면 조건은 설문까지 같은 사람이 채운다.
//   종이 조건의 설문은 휴대전화 옮겨 적기(survey.html)가 나중에 한 번만 채운다.
// 2부 — 단계(hci9_state)와 장치(hci9_devices)는 버셀 함수만 쓴다.
//   조(hci9_people) · 명세서(hci9_specs) · 평가(hci9_ratings)는 학생이 쓰고, 언제 쓸 수 있는지는 firestore.rules 가 정한다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { condOf, teamId, TEAM_COUNT, GEN_LIMIT } from "./data.js";

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
const API = location.hostname.endsWith(".vercel.app") ? "/api/casa" : "https://retro-app-six.vercel.app/api/casa";

export const me = { uid: null };
const waiters = [];
onAuthStateChanged(auth, u => {
  if (!u) return;
  me.uid = u.uid;
  waiters.splice(0).forEach(f => f());
});
export let ready = () => me.uid ? Promise.resolve() : new Promise(r => waiters.push(r));

/* ── 1부 ── */
const p1Doc = n => doc(db, "hci9_p1", "N" + n);
// 규칙이 막으면(이미 쓰인 번호) permission-denied 가 난다
export let claimNumber = async n => {
  await setDoc(p1Doc(n), { n, cond: condOf(n), by: me.uid, startedAt: Date.now() });
};
export let saveSession = (n, data) => updateDoc(p1Doc(n), { ...data, doneAt: Date.now() });
export let savePaperSurvey = (n, survey) => updateDoc(p1Doc(n), { survey, surveyAt: Date.now() });

/* ── 2부 ── */
export let watchState = cb => onSnapshot(doc(db, "hci9_state", "current"), s => cb(s.data() || { phase: "p1" }));
export let setTeam = team => setDoc(doc(db, "hci9_people", me.uid), { team, at: Date.now() });
export let watchSpec = (team, cb) => onSnapshot(doc(db, "hci9_specs", teamId(team)), s => cb(s.data() || null), () => cb(null));
export let saveSpec = (team, cues) => setDoc(doc(db, "hci9_specs", teamId(team)), { cues, updatedAt: Date.now(), by: me.uid });
export let watchDevice = (team, cb) => onSnapshot(doc(db, "hci9_devices", teamId(team)), s => cb(s.data() || null));
export let watchDeviceList = cb => onSnapshot(doc(db, "hci9_state", "devices"), s => cb(s.data()?.teams || []));
export let saveRating = (target, from, scores) =>
  setDoc(doc(db, "hci9_ratings", `${teamId(target)}_${me.uid}`), { target, target_id: teamId(target), from, scores, by: me.uid, at: Date.now() });

async function call(body) {
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + await auth.currentUser.getIdToken() };
  const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}
export let generateDevice = team => call({ action: "generate", team });

// 생성된 장치는 믿을 수 없는 코드 — 부모 창에 닿지 못하는 샌드박스 iframe 에서만 돌린다.
// 스크립트는 우리 단서 도구(kit/)만 받을 수 있고, 그 밖의 요청은 CSP 로 막는다.
const KIT = new URL("../kit/cues.js", import.meta.url).href;
const HEAD = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${location.origin}; style-src 'unsafe-inline' ${location.origin}; img-src data: blob:; font-src data:; media-src data: blob:">`
  + `<script type="importmap">{"imports":{"x9":"${KIT}"}}<\/script>`;
export function wrapDevice(html) {
  if (!html) return "<!doctype html><html><body style='margin:0;display:grid;place-items:center;height:100vh;font-family:sans-serif;color:#999;background:#f4f1ea'>장치 없음</body></html>";
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + HEAD) : HEAD + html;
}
export const BASE_DEVICE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script type="module">
import { start } from "x9";
start();
<\/script></body></html>`;

/* ── 미리보기 (?demo · ?demo=build · ?demo=rate · ?demo=result) — 파이어베이스를 건드리지 않고 이 브라우저 안에서만 돈다 ── */
const DEMO = new URLSearchParams(location.search).get("demo");
export const isDemoMode = DEMO !== null;
if (isDemoMode) {
  const used = new Set([3]);            // 3번은 이미 쓰인 번호로 — 오류 문구 확인용
  me.uid = "demo";
  ready = () => Promise.resolve();
  claimNumber = async n => {
    if (used.has(n)) throw Object.assign(new Error("used"), { code: "permission-denied" });
    used.add(n);
  };
  saveSession = async (n, data) => console.info("[미리보기] 1부 기록", n, data);
  savePaperSurvey = async (n, survey) => console.info("[미리보기] 옮겨 적기", n, survey);

  const phase = ["build", "rate", "result"].includes(DEMO) ? DEMO : "p1";
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const on = f => { subs.add(f); f(); return () => subs.delete(f); };
  const D = { state: { phase }, specs: {}, devices: {} };
  const sampleCues = t => [
    { name: "시작할 때 이름을 말하며 인사함", cat: "verbal", when: "처음", detail: `"안녕하세요, 저는 ${t}조 장치예요"라고 말풍선으로 말함`, source: "Feine 외 (2019)", effect: "이름이 있으면 상대로 느껴짐" },
    { name: "대답 전 망설임", cat: "invisible", when: "시작 버튼", detail: "버튼을 누르면 1초 동안 … 표시 후 대답", source: "Feine 외 (2019) chronemics", effect: "생각하는 것처럼 보임" },
  ];
  const fakeDevice = t => `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script type="module">
import { start } from "x9";
const { dev, C } = start({ speed: 30 });
C.name("${t}조 장치");
${t % 2 ? 'const f = C.face({ where: "window" });' : ""}
dev.on("ready", () => C.say("안녕하세요, 저는 ${t}조 장치예요"));
dev.on("start", async () => { await C.typing(1000); C.say("시작할게요"); });
<\/script></body></html>`;
  if (phase !== "p1") for (let t = 2; t <= TEAM_COUNT; t++) {
    if (t === 7) continue;               // 7조는 장치가 없는 조 — 평가 배정에서 건너뛰는지 확인
    D.specs[teamId(t)] = { cues: sampleCues(t), updatedAt: Date.now(), by: "demo" };
    D.devices[teamId(t)] = { team: t, gens: 1, version: 1, html: fakeDevice(t), genAt: Date.now() };
  }
  watchState = cb => on(() => cb({ ...D.state }));
  setTeam = async () => {};
  watchSpec = (team, cb) => on(() => cb(phase === "rate" && team !== 1 ? null : JSON.parse(JSON.stringify(D.specs[teamId(team)] || null))));
  saveSpec = async (team, cues) => { D.specs[teamId(team)] = { cues, updatedAt: Date.now(), by: "demo" }; emit(); };
  watchDevice = (team, cb) => on(() => cb(D.devices[teamId(team)] ? { ...D.devices[teamId(team)] } : null));
  watchDeviceList = cb => on(() => cb(Object.values(D.devices).filter(d => d.html).map(d => d.team)));
  saveRating = async (target, from, scores) => console.info("[미리보기] 평가", target, from, scores);
  generateDevice = async team => {
    const id = teamId(team), m = D.devices[id] || { team, gens: 0 };
    if (D.state.phase !== "build") throw new Error("제작 단계가 아님");
    if (!(D.specs[id]?.cues || []).some(c => c.name && c.detail)) throw new Error("단서를 하나 이상 적어 주십시오");
    if ((m.gens || 0) >= GEN_LIMIT) throw new Error(`생성 횟수 ${GEN_LIMIT}회 모두 사용`);
    D.devices[id] = { ...m, gens: (m.gens || 0) + 1, generating: true, generatingAt: Date.now() }; emit();
    await new Promise(r => setTimeout(r, 1200));
    D.devices[id] = { ...D.devices[id], generating: false, html: fakeDevice(team), version: D.devices[id].gens, genAt: Date.now() }; emit();
    return { ok: true, left: GEN_LIMIT - D.devices[id].gens };
  };
  document.title = "[미리보기] " + document.title;
} else {
  signInAnonymously(auth).catch(e => console.error(e));
}
