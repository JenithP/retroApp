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

import { MATERIALS, combine, recipeById } from "../public/norman/js/parts.js";
import { JOBS } from "../public/norman/js/jobs.js";
import { needOf, givesOf, bucketOf } from "../public/norman/js/kit.js";
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

/** 돌려 보기와 같은 셈. 의뢰와 붙인 단서만 있으면 결과가 정해진다. */
function judge(job, attached) {
  const at = attached || {};
  let missing = 0, worn = 0, astray = 0;
  const gaps = [];

  for (const p of job.parts) {
    const given = {};
    for (const x of (at[p.id] || []))
      for (const g of givesOf(x.recipe)) given[g] = true;
    const lack = needOf(p).filter(n => !given[n]);
    if (lack.length) gaps.push({ part: p.id, lack });
    missing += lack.length;
  }

  const onPath = {};
  job.steps.forEach(s => { onPath[s.part] = true; });
  const blocked = gaps.filter(g => onPath[g.part]).length;

  for (const id of Object.keys(at)) {
    const p = partOf(job, id);
    for (const x of (at[id] || [])) {
      worn++;
      // 눌리지도 않는 것을 누를 수 있게 꾸며 두면 그것이 거짓 단서다
      if (p && p.decoy && givesOf(x.recipe).indexOf("push") >= 0) astray++;
    }
  }
  return { gaps, missing, blocked, worn, astray, passed: blocked === 0 };
}

/** 화면 값. 통과하지 못한 화면은 받지 않는다. */
function appraise(job, attached) {
  const v = judge(job, attached);
  const notes = [];
  let price = 300;

  if (v.passed) { price += 700; notes.push(["good", "사용자가 과제를 처음부터 끝까지 해냈습니다."]); }
  else notes.push(["bad", `아직 ${v.blocked}군데에서 사용자가 막힙니다.`]);

  if (v.missing === 0) { price += 350; notes.push(["good", "화면 전체에 필요한 단서가 잘 붙어 있습니다."]); }
  else notes.push(["warn", `과제 진행에 바로 걸리지 않는 곳까지 보면 ${v.missing}가지 단서가 더 필요합니다.`]);

  if (v.astray) {
    price -= v.astray * 120;
    notes.push(["bad", `눌리지 않는 곳을 누를 수 있게 보이도록 꾸몄습니다 — 거짓 단서 ${v.astray}개입니다.`]);
  }
  if (v.worn > 12) {
    price -= (v.worn - 12) * 40;
    notes.push(["warn", `단서가 ${v.worn}개라 조금 복잡합니다. 꼭 필요한 것만 남겨 보세요.`]);
  } else if (v.passed && v.worn <= 6) {
    price += 150;
    notes.push(["good", `${v.worn}개의 단서로 해결했습니다. 군더더기가 적습니다.`]);
  }

  price = Math.max(120, Math.min(1800, Math.round(price / 10) * 10));
  return { price, notes, passed: v.passed, blocked: v.blocked, worn: v.worn,
           missing: v.missing, astray: v.astray };
}

/* ── 지갑 ─────────────────────────────────────────────────── */

const fresh = team => ({
  team, point: START, mats: {}, tools: [], attached: {},
  job: null, quiz: {}, done: [], sold: [],
});

const clean = w => ({
  point: w.point, mats: w.mats || {}, tools: w.tools || [],
  attached: w.attached || {}, job: w.job || null,
  quiz: w.quiz || {}, done: w.done || [], sold: w.sold || [],
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
          w.sold.push({ job: job.id, price: a.price, at: Date.now() });
          w.attached = {};                       // 붙인 것은 화면과 함께 갔다
          w.job = null;
          save();
          log({ kind: "sell", job: job.id, price: a.price, worn: a.worn });
          return Object.assign(clean(w), { appraisal: a });
        }

        default: throw new Error("무엇을 할지 모르겠습니다");
      }
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
