// 노만의 공방 — 포인트가 오가는 모든 일이 여기를 지난다.
//
// 왜 서버로 옮겼나. 과제 점수가 걸린 판에서 포인트가 학생 브라우저 안에만
// 있으면 개발자도구로 고칠 수 있다. 그래서 **클라이언트는 아무것도 정하지
// 않는다.** 재료 값도, 무엇과 무엇이 합쳐지는지도, 퀴즈 정답도, 화면 값도
// 전부 이 파일이 센다. 클라이언트가 보내는 것은 「무엇을 하겠다」는 말뿐이다.
//
// 포인트만 서버가 쥐어서는 모자란다. 「이 단서를 붙였다」는 말까지 믿어
// 버리면 사지도 만들지도 않은 단서로 값을 받을 수 있다. 그래서
// 재료·만든 단서·붙인 것을 모두 지갑 안에 둔다. 클라이언트는 비춰 볼 뿐이다.
//
// 지갑과 장부는 Firestore 에 있고, 보안 규칙이 학생 쓰기를 막아 두었다.
// Admin SDK 는 규칙을 통과하므로 이 파일만 쓸 수 있다.
//
// 버셀 프로젝트 설정 → Environment Variables 에 넣을 것
//   FIREBASE_SERVICE_ACCOUNT   서비스 계정 JSON 통째로 (필수)
//   HCI4_ADMIN                 교수용 암호 (지갑을 되돌릴 때만 쓴다)

import { MATERIALS, combine, recipeById } from "../public/norman/js/parts.js";
import { JOBS } from "../public/norman/js/jobs.js";
import { bucketOf } from "../public/norman/js/kit.js";
import { appraise } from "../public/norman/js/score.js";
import { ANSWERS, REWARD } from "./_answers.js";

const ALLOW = [
  "https://gccrc-crae.web.app",
  "https://gccrc-crae.firebaseapp.com",
];

const START = 1000;
const TEAMS = 20;
const MAX_TOOLS = 60;

/* ── 파이어베이스 ─────────────────────────────────────────── */

let db = null;
async function store() {
  if (db) return db;
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("no-key");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  db = getFirestore();
  return db;
}

/* ── 값과 셈 — 전부 여기서만 ──────────────────────────────── */

const priceOf = id => {
  const m = MATERIALS.find(x => x.id === id);
  return m ? m.price : null;
};
const jobOf = id => JOBS.find(j => j.id === id);
const partOf = (job, id) => job.parts.find(p => p.id === id);

/* 값 매기는 셈은 public/norman/js/score.js 한 곳에만 둔다.
   여기에 같은 셈을 한 벌 더 두었더니, 화면은 「170포인트」라 미리 보여
   주고 서버는 1150을 지불했다. 값을 고칠 때 한쪽만 고쳐졌기 때문이다.
   진짜 셈은 언제나 이 파일이 돌린 것이고, 화면은 같은 파일을 불러 미리
   보여 줄 뿐이다. */

/* ── 지갑 ─────────────────────────────────────────────────── */

const SESSION = "_session";

/** 활동이 끝났는가. 끝난 뒤에는 포인트가 움직이지 않는다. */
async function sessionOf(fs, t) {
  const ref = fs.collection("hci4_wallets").doc(SESSION);
  const snap = t ? await t.get(ref) : await ref.get();
  return snap.exists ? snap.data() : { ended: false };
}

const MONEY = ["buy", "craft", "attach", "detach", "quiz", "sell", "take", "arg"];

const fresh = team => ({
  team, point: START, mats: {}, tools: [], attached: {},
  job: null, quiz: {}, done: [], sold: [], runs: [],
});

const clean = w => ({
  point: w.point, mats: w.mats || {}, tools: w.tools || [],
  attached: w.attached || {}, job: w.job || null,
  quiz: w.quiz || {}, done: w.done || [], sold: w.sold || [], runs: w.runs || [],
});

/* ── 창구 ─────────────────────────────────────────────────── */

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const ok = ALLOW.includes(origin) || /\.vercel\.app$/.test(origin) ||
             /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", ok ? origin : ALLOW[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST 로만 부릅니다" });

  const body = req.body || {};

  /* ── 교수용 — 지갑 되돌리기 ─────────────────────────────────
     수업 전에 스무 조를 새 지갑으로 돌리거나, 수업 중에 꼬인 한 조만
     돌릴 때 쓴다. 암호는 버셀 환경변수에만 두므로 학생은 부를 수 없다.
     지운 지갑은 다음에 들어올 때 새로 만들어진다. 장부는 남긴다 —
     무슨 일이 있었는지는 지워지면 안 된다. */
  if (body.op === "reset") {
    const key = process.env.HCI4_ADMIN;
    if (!key) return res.status(503).json({ error: "버셀에 HCI4_ADMIN 이 없습니다" });
    if (body.key !== key) return res.status(403).json({ error: "암호가 틀렸습니다" });

    let fsA;
    try { fsA = await store(); }
    catch (e) { return res.status(503).json({ error: "server-off" }); }

    const only = Number(body.team);
    const nums = Number.isInteger(only) && only >= 1 && only <= TEAMS
      ? [only]
      : Array.from({ length: TEAMS }, (_, i) => i + 1);

    const batch = fsA.batch();
    for (const n of nums) batch.delete(fsA.collection("hci4_wallets").doc("team" + n));
    batch.set(fsA.collection("hci4_ledger").doc(),
      { kind: "reset", teams: nums, at: new Date() });
    await batch.commit();
    return res.status(200).json({ ok: true, 되돌린조: nums });
  }

  /* ── 교수용 — 활동을 닫고 열기, 조별 한눈에 보기 ───────────── */
  if (body.op === "end" || body.op === "open" || body.op === "board") {
    const key = process.env.HCI4_ADMIN;
    if (!key) return res.status(503).json({ error: "버셀에 HCI4_ADMIN 이 없습니다" });
    if (body.key !== key) return res.status(403).json({ error: "암호가 틀렸습니다" });

    let fsB;
    try { fsB = await store(); }
    catch (e) { return res.status(503).json({ error: "server-off" }); }

    if (body.op !== "board") {
      const ended = body.op === "end";
      await fsB.collection("hci4_wallets").doc(SESSION)
        .set({ ended: ended, at: new Date() });
      await fsB.collection("hci4_ledger").doc()
        .set({ kind: ended ? "end" : "open", at: new Date() });
      return res.status(200).json({ ok: true, ended: ended });
    }

    // 조별 한눈에 — 지갑을 그대로 훑어 요약만 돌려준다
    const snap = await fsB.collection("hci4_wallets").get();
    const rows = [];
    let session = { ended: false };
    snap.forEach(d => {
      if (d.id === SESSION) { session = d.data(); return; }
      const w = d.data();
      const runs = w.runs || [];
      rows.push({
        team: w.team,
        point: w.point,
        job: w.job || null,
        done: (w.done || []).length,
        sold: (w.sold || []).reduce((a, x) => a + (x.price || 0), 0),
        mats: Object.values(w.mats || {}).reduce((a, n) => a + n, 0),
        tools: (w.tools || []).length,
        worn: Object.values(w.attached || {}).reduce((a, l) => a + l.length, 0),
        quiz: Object.values(w.quiz || {}).filter(v => v === true).length,
        runs: runs.length,
        first: runs.length ? runs[0] : null,
        last: runs.length ? runs[runs.length - 1] : null,
      });
    });
    rows.sort((a, b) => a.team - b.team);
    return res.status(200).json({ session: session, rows: rows });
  }

  const team = Number(body.team);
  if (!Number.isInteger(team) || team < 1 || team > TEAMS)
    return res.status(400).json({ error: "조 번호가 잘못되었습니다" });

  let fs;
  try { fs = await store(); }
  catch (e) {
    return res.status(503).json({ error: "server-off",
      hint: "버셀에 FIREBASE_SERVICE_ACCOUNT 가 없습니다" });
  }

  const ref = fs.collection("hci4_wallets").doc("team" + team);
  const ledger = fs.collection("hci4_ledger");

  try {
    const out = await fs.runTransaction(async t => {
      if (MONEY.indexOf(body.op) >= 0) {
        const ses = await sessionOf(fs, t);
        if (ses.ended) throw new Error("활동이 끝났습니다. 기록은 내려받을 수 있습니다.");
      }
      const snap = await t.get(ref);
      const w = snap.exists ? Object.assign(fresh(team), snap.data()) : fresh(team);
      const log = row => t.set(ledger.doc(), Object.assign({ team, at: new Date() }, row));
      const save = () => t.set(ref, w);

      switch (body.op) {

        /* 들어올 때 — 없으면 만들어 준다 */
        case "init": {
          if (!snap.exists) { save(); log({ kind: "open", point: START }); }
          return clean(w);
        }

        /* 의뢰를 집어 든다 — 앞 의뢰에 붙였던 것은 그 화면과 함께 갔다 */
        case "take": {
          const job = jobOf(body.job);
          if (!job) throw new Error("그런 의뢰가 없습니다");
          if (w.job !== job.id) { w.job = job.id; w.attached = {}; save(); }
          return clean(w);
        }

        /* 재료 사기 — 값은 서버 표로만 센다 */
        case "buy": {
          const cart = body.cart && typeof body.cart === "object" ? body.cart : {};
          let bill = 0, n = 0;
          for (const [id, num] of Object.entries(cart)) {
            const q = Math.floor(Number(num));
            const p = priceOf(id);
            if (p == null) throw new Error("그런 재료는 없습니다");
            if (!(q > 0) || q > 40) throw new Error("개수가 잘못되었습니다");
            bill += p * q; n += q;
          }
          if (!n) throw new Error("담은 것이 없습니다");
          if (bill > w.point) throw new Error("포인트가 모자랍니다");
          w.point -= bill;
          for (const [id, num] of Object.entries(cart))
            w.mats[id] = (w.mats[id] || 0) + Math.floor(Number(num));
          save();
          log({ kind: "buy", bill, n, cart });
          return Object.assign(clean(w), { bill, n });
        }

        /* 합치기 — 무엇과 무엇이 되는지도 서버가 안다 */
        case "craft": {
          const a = String(body.a || ""), b = String(body.b || "");
          const r = combine(a, b);
          if (!r) throw new Error("그 둘은 합쳐지지 않습니다");
          if (!(w.mats[a] > 0) || !(w.mats[b] > 0)) throw new Error("재료가 없습니다");
          if (a === b && w.mats[a] < 2) throw new Error("재료가 없습니다");
          if (w.tools.length >= MAX_TOOLS) throw new Error("만든 단서가 너무 많습니다");
          w.mats[a]--; w.mats[b]--;
          w.tools.push({ recipe: r.id, arg: "" });
          save();
          log({ kind: "craft", made: r.id, from: [a, b] });
          return Object.assign(clean(w), { made: r.id });
        }

        /* 단서에 적는 글자·그림 — 돈과는 무관하다 */
        case "arg": {
          const i = Number(body.i);
          if (!w.tools[i]) throw new Error("그런 단서가 없습니다");
          w.tools[i].arg = String(body.arg || "").slice(0, 20);
          save();
          return clean(w);
        }

        /* 화면에 붙이기 — 가진 단서만, 붙는 자리에만 */
        case "attach": {
          const i = Number(body.i), partId = String(body.part || "");
          const job = jobOf(w.job);
          const tool = w.tools[i];
          if (!job) throw new Error("맡은 의뢰가 없습니다");
          if (!tool) throw new Error("그런 단서가 없습니다");
          const p = partOf(job, partId), r = recipeById(tool.recipe);
          if (!p || !r) throw new Error("그 자리에는 못 붙입니다");
          if (r.on.indexOf(bucketOf(p.kind)) < 0) throw new Error("그 자리에는 못 붙입니다");
          w.tools.splice(i, 1);
          (w.attached[partId] = w.attached[partId] || []).push(tool);
          save();
          return clean(w);
        }

        /* 떼어 내기 — 도로 만든 단서 목록으로 돌아온다 */
        case "detach": {
          const partId = String(body.part || ""), j = Number(body.j);
          const list = w.attached[partId] || [];
          if (!list[j]) throw new Error("그런 것이 붙어 있지 않습니다");
          w.tools.push(list.splice(j, 1)[0]);
          if (!list.length) delete w.attached[partId];
          save();
          return clean(w);
        }

        /* 문제 풀기 — 정답은 서버에만 있다 */
        case "quiz": {
          const i = Number(body.q), pick = Number(body.pick);
          const key = ANSWERS[i];
          if (!key) throw new Error("그런 문제가 없습니다");
          if (w.quiz[i] !== undefined) throw new Error("이미 답한 문제입니다");
          const right = pick === key.c;
          w.quiz[i] = right;
          if (right) w.point += REWARD;
          save();
          log({ kind: "quiz", q: i, right, got: right ? REWARD : 0 });
          return Object.assign(clean(w), { right, why: key.why, got: right ? REWARD : 0 });
        }

        /* 값을 매겨만 본다 */
        case "look": {
          const job = jobOf(w.job);
          if (!job) throw new Error("맡은 의뢰가 없습니다");
          return { appraisal: appraise(job, w.attached), wallet: clean(w) };
        }

        /* 화면 팔기 — 값도 통과 여부도 서버가 다시 센다 */
        case "sell": {
          const job = jobOf(w.job);
          if (!job) throw new Error("맡은 의뢰가 없습니다");
          if (w.done.includes(job.id)) throw new Error("이미 판 의뢰입니다");
          const a = appraise(job, w.attached);
          if (!a.passed) return { refused: true, appraisal: a, wallet: clean(w) };
          w.point += a.price;
          w.done.push(job.id);
          // 붙인 단서는 화면과 함께 팔려 나가므로, 무엇을 붙였는지 여기 남긴다.
          // 워크북에 「무엇으로 고쳤는가」를 적으려면 이 기록이 있어야 한다.
          const worn = [];
          for (const [pid, list] of Object.entries(w.attached || {}))
            for (const tl of list) worn.push({ part: pid, recipe: tl.recipe, arg: tl.arg || "" });
          w.sold.push({ job: job.id, price: a.price, worn: worn, at: Date.now() });
          w.attached = {};                       // 붙인 것은 화면과 함께 갔다
          w.job = null;
          save();
          log({ kind: "sell", job: job.id, price: a.price, worn: a.worn });
          return Object.assign(clean(w), { appraisal: a });
        }

        /* 돌려 본 결과 — 처음과 마지막을 견주려면 남겨야 한다 */
        case "run": {
          const job = jobOf(w.job);
          if (!job) throw new Error("맡은 의뢰가 없습니다");
          const r = body.run || {};
          const row = {
            job: job.id,
            exec: Number(r.exec) || 0,
            stray: Number(r.evalGap) || 0,
            secs: Math.round((Number(r.secs) || 0) * 10) / 10,
            done: Number(r.right) || 0,
            of: Number(r.of) || 0,
            worn: Object.values(w.attached || {}).reduce((a, l) => a + l.length, 0),
            at: Date.now(),
          };
          w.runs = (w.runs || []).concat([row]).slice(-80);
          save();
          return clean(w);
        }

        /* 내려받을 기록 — 활동이 끝난 뒤 학생이 워크북에 옮겨 적는다 */
        case "report": {
          const ses = await sessionOf(fs, t);
          return { wallet: clean(w), ended: !!ses.ended };
        }

        default: throw new Error("무엇을 할지 모르겠습니다");
      }
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
