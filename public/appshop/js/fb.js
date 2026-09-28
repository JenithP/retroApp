// 앱 공방 — 파이어베이스 연결과 버셀 함수 호출. 2주차 거실 · 3주차 활자의 문과 같은 프로젝트를 쓴다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, addDoc, collection, onSnapshot, serverTimestamp, query, where }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyBC3M89Z6YTnpc7x6S5JvKhmB5BUIdIVlE",
  authDomain: "gccrc-crae.firebaseapp.com",
  projectId: "gccrc-crae",
  storageBucket: "gccrc-crae.firebasestorage.app",
  messagingSenderId: "578166929555",
  appId: "1:578166929555:web:08387d90f2326fe51a3566",
});
const auth = getAuth(app);
export const db = getFirestore(app);

// 버셀에 올린 판에서는 같은 곳의 함수를, 파이어베이스 호스팅에서는 버셀 주소를 부른다
const API = location.hostname.endsWith(".vercel.app") ? "/api/appshop" : "https://retro-app-six.vercel.app/api/appshop";

export const me = { uid: null };
const waiters = [];
onAuthStateChanged(auth, u => {
  if (!u) return;
  me.uid = u.uid;
  waiters.splice(0).forEach(f => f());
  net("ok", "연결됨");
});
signInAnonymously(auth).catch(e => { console.error(e); net("bad", "연결 실패 — 새로고침해 주십시오"); });
export const ready = () => me.uid ? Promise.resolve() : new Promise(r => waiters.push(r));

function net(cls, msg) {
  const d = document.getElementById("netdot"), m = document.getElementById("netmsg");
  if (d) d.className = "dot " + cls;
  if (m) m.textContent = msg;
}

export const teamId = t => "T" + String(t).padStart(2, "0");

export let watchState = function watchState(cb) {
  return onSnapshot(doc(db, "hci5_state", "current"), s => cb(s.data() || { phase: "ready" }));
}
export let watchTeam = function watchTeam(team, cb) {
  return onSnapshot(doc(db, "hci5_teams", teamId(team)), s => cb(s.data() || {}));
}
export let watchTeams = function watchTeams(cb) {
  return onSnapshot(collection(db, "hci5_teams"), s => {
    const out = {}; s.forEach(d => out[d.id] = d.data()); cb(out);
  });
}
export let watchSpec = function watchSpec(team, cb) {
  return onSnapshot(doc(db, "hci5_specs", teamId(team)), s => cb(s.data() || null));
}
export let watchSpecs = function watchSpecs(cb) {
  return onSnapshot(collection(db, "hci5_specs"), s => {
    const out = {}; s.forEach(d => out[d.id] = d.data()); cb(out);
  });
}
export let saveSpec = function saveSpec(team, spec) {
  return setDoc(doc(db, "hci5_specs", teamId(team)), { spec, updatedAt: Date.now(), by: me.uid });
}
export let watchEvals = function watchEvals(cb, target = null) {
  const q = target ? query(collection(db, "hci5_evals"), where("target", "==", Number(target))) : collection(db, "hci5_evals");
  return onSnapshot(q, s => { const out = []; s.forEach(d => out.push({ id: d.id, ...d.data() })); cb(out); });
}
export let addEval = function addEval(row) {
  return addDoc(collection(db, "hci5_evals"), { ...row, uid: me.uid, at: serverTimestamp(), atMs: Date.now() });
}

async function call(body, withToken) {
  const headers = { "Content-Type": "application/json" };
  if (withToken) headers.Authorization = "Bearer " + await auth.currentUser.getIdToken();
  const r = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}
export let generate = (team, spec) => call({ action: "generate", team, spec }, true);
export let adminCall = (code, op, extra = {}) => call({ action: "admin", code, op, ...extra }, false);

// 생성된 앱은 믿을 수 없는 코드다 — 부모 창에 닿지 못하는 샌드박스 iframe 에서만 돌린다.
// 바깥으로 나가는 요청은 CSP 로 막고, 탭 수만 부모에게 알린다.
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:">`;
const TAP = `<script>document.addEventListener("pointerdown",function(){parent.postMessage({appshop:"tap"},"*")},true)<\/script>`;
export function wrapApp(html) {
  if (!html) return "<!doctype html><html><body style='margin:0;display:grid;place-items:center;height:100vh;font-family:sans-serif;color:#999'>아직 앱이 없습니다</body></html>";
  const inject = CSP + TAP;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + inject) : inject + html;
}

/* ── 미리보기 (?demo=build 처럼 붙이면) ──────────────────
   파이어베이스와 버셀을 건드리지 않고, 이 브라우저 안의 가짜 자료로 모든 화면을 돌려 본다.
   리허설과 화면 확인용. 생성은 AI 대신 설계서를 그대로 늘어놓은 흉내 앱이다. */
const DEMO = new URLSearchParams(location.search).get("demo");
if (DEMO !== null) {
  const phase = ["ready", "build", "eval", "feedback", "end"].includes(DEMO) ? DEMO : "build";
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const on = f => { subs.add(f); f(); return () => subs.delete(f); };
  const fake = spec => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;margin:0;padding:24px}button{padding:10px 14px;margin:6px 0;border:1px solid #999;background:#eee}</style></head><body>
    <h3>${(spec.appName || "").replace(/</g, "&lt;")}</h3>${(spec.scenes || []).filter(s => s.see).map((s, i) =>
      `<p>${s.see.replace(/</g, "&lt;")}</p>${s.do ? `<button>${s.do.replace(/</g, "&lt;").slice(0, 20)}</button>` : ""}`).join("<hr>")}
    <p style="color:#999;font-size:12px">미리보기 흉내 앱 — 실제 수업에서는 AI가 설계서대로 만듭니다</p></body></html>`;
  const sampleSpec = t => ({ appName: `${t}조 앱`, style: "", scenes: [
    { see: "가운데에 「오늘」, 아래에 버튼 세 개", do: "버튼을 누른다", react: "버튼 색이 바뀐다" },
    { see: "기록 목록", do: "", react: "" }] });
  const D = { state: { phase, buildEndsAt: Date.now() + 30 * 60000 }, teams: {}, specs: {}, evals: [] };
  for (let t = 1; t <= 20; t++) {
    const id = teamId(t), sp = sampleSpec(t), pub = phase !== "ready" && phase !== "build";
    if (t % 3) D.specs[id] = { spec: sp, updatedAt: Date.now() - t * 40000, by: "demo" };
    if (t % 4) D.teams[id] = { team: t, gens: t % 5, version: t % 5, html: fake(sp), spec: sp, genAt: Date.now() - t * 60000,
      ...(pub ? { published: true, publishedHtml: fake(sp), publishedSpec: sp, publishedVersion: t % 5 } : {}) };
  }
  if (phase === "feedback" || phase === "eval") {
    const hs = [1, 3, 3, 5, 6, 9, 1, 2, 8, 3];
    for (let t = 1; t <= 20; t++) for (let k = 0; k < 3; k++) {
      const target = ((t - 1 + 2 + (k % 2) * 2) % 20) + 1;
      D.evals.push({ id: `e${t}${k}`, uid: "demo", team: t, name: `학생${k + 1}`, target, pq: 2 + (t + k) % 5, hq: 1 + (t * k) % 6,
        comment: k ? "되돌릴 수가 없어서 당황했다" : "", taskDone: k !== 2, ms: 60000 + t * 1000, taps: 10 + t,
        tags: [{ where: "첫 화면", h: hs[(t + k) % 10], sev: (t + k) % 5, note: "눌러도 아무 반응이 없음" },
               { where: "", h: hs[(t + 2 * k) % 10], sev: (t * 2 + k) % 5, note: "잘못 누른 것을 되돌릴 수 없음" }] });
    }
  }
  watchState = cb => on(() => cb({ ...D.state }));
  watchTeam = (team, cb) => on(() => cb({ ...(D.teams[teamId(team)] || {}) }));
  watchTeams = cb => on(() => cb({ ...D.teams }));
  watchSpec = (team, cb) => on(() => cb(D.specs[teamId(team)] || null));
  watchSpecs = cb => on(() => cb({ ...D.specs }));
  watchEvals = (cb, target = null) => on(() => cb(D.evals.filter(e => target === null || e.target === Number(target))));
  saveSpec = async (team, spec) => { D.specs[teamId(team)] = { spec, updatedAt: Date.now(), by: me.uid }; };
  addEval = async row => { D.evals.push({ ...row, id: "e" + Date.now(), uid: me.uid, atMs: Date.now() }); emit(); };
  generate = async (team, spec) => {
    const id = teamId(team), t = D.teams[id] || { team, gens: 0 };
    const demoSeat = Number(team) === 21, limit = demoSeat ? 20 : 5;
    if (!(D.state.phase === "build" || (demoSeat && D.state.phase === "ready"))) throw new Error("지금은 만들 수 없는 단계입니다");
    if ((t.gens || 0) >= limit) throw new Error(`생성 횟수 ${limit}번을 모두 썼습니다`);
    D.teams[id] = { ...t, gens: (t.gens || 0) + 1, generating: true, generatingAt: Date.now() }; emit();
    await new Promise(r => setTimeout(r, 1500));
    D.teams[id] = { ...D.teams[id], generating: false, html: fake(spec), spec, version: D.teams[id].gens, genAt: Date.now() }; emit();
    return { ok: true, ms: 1500, left: limit - D.teams[id].gens };
  };
  adminCall = async (code, op, extra = {}) => {
    if (op === "phase") {
      D.state = { ...D.state, phase: extra.phase, ...(extra.phase === "build" ? { buildEndsAt: Date.now() + 30 * 60000 } : {}) };
      if (extra.phase === "eval") Object.values(D.teams).forEach(t => Object.assign(t, { published: true, publishedHtml: t.html, publishedSpec: t.spec, publishedVersion: t.version }));
      emit();
    }
    if (op === "extend") { D.state.buildEndsAt += 5 * 60000; emit(); }
    return { ok: true };
  };
  document.title = "[미리보기] " + document.title;
  addEventListener("DOMContentLoaded", () => {
    const b = document.createElement("div");
    b.textContent = "미리보기 — 가짜 자료입니다. 실제 수업 기록에 남지 않습니다.";
    b.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#C8612F;color:#fff;text-align:center;padding:4px;font-size:13px;z-index:99";
    document.body.appendChild(b);
  });
}
