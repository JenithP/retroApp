// 주머니 — 포인트, 사 둔 재료, 만든 연장, 물건에 붙인 것.
//
// 이 파일은 **아무것도 정하지 않는다.** 서버(api/deal.js)에 「무엇을 하겠다」고
// 말하고, 돌아온 지갑을 그대로 비춰 놓을 뿐이다. 값도 조합도 정답도 서버가 센다.
// 그래서 개발자도구로 이 파일의 숫자를 고쳐 봐야 다음 요청에 도로 덮인다.
//
// 다만 서버가 없을 때도(집에서 python tools/serve.py 로 열어 볼 때) 실습이
// 돌아야 하므로, 서버에 닿지 못하면 같은 셈을 이 안에서 한다.
// 그때는 머리에 「연습 모드」라고 적어 둔다 — 점수로 세지 않는다는 뜻이다.

import { MATERIALS, mat, combine, recipeById } from "./parts.js";
import { bucketOf } from "./kit.js";
import { jobById } from "./jobs.js";
import { appraise } from "./score.js";
import { QUESTIONS, REWARD } from "./quizdata.js";

export const START = 1000;
const MAX_TOOLS = 60;

export const purse = {
  point: START, mats: {}, tools: [], attached: {},
  job: null, quiz: {}, done: [], sold: [],
};

export const mode = { server: false, team: null, ready: false, why: "" };

export const priceOf = id => (mat(id) || {}).price || 40;
export const countMat = id => purse.mats[id] || 0;

function soak(w) {
  if (!w || typeof w !== "object") return purse;
  if (Number.isFinite(w.point)) purse.point = w.point;
  purse.mats = w.mats || {};
  purse.tools = w.tools || [];
  purse.attached = w.attached || {};
  purse.job = w.job || null;
  purse.quiz = w.quiz || {};
  purse.done = w.done || [];
  purse.sold = w.sold || [];
  return purse;
}

/* ── 서버에 말 걸기 ───────────────────────────────────────── */

async function ask(op, more) {
  const r = await fetch("/api/deal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ team: mode.team, op: op }, more || {})),
  });
  const j = await r.json().catch(function () { return { error: "응답을 읽지 못했습니다" }; });
  if (!r.ok) throw Object.assign(new Error(j.error || "거래에 실패했습니다"), j);
  return j;
}

/* ── 연습 모드 — 서버가 없을 때 같은 셈을 여기서 ──────────── */

const KEY = () => "hci4_local_" + mode.team;
const local = {
  load() {
    try {
      const raw = localStorage.getItem(KEY());
      if (raw) soak(JSON.parse(raw));
    } catch (e) {}
  },
  save() {
    try { localStorage.setItem(KEY(), JSON.stringify(purse)); } catch (e) {}
  },
};

/** 공방에 들어설 때 한 번. 서버가 없으면 연습 모드로 떨어진다. */
export async function connect(team) {
  mode.team = Number(team);
  try {
    soak(await ask("init"));
    mode.server = true; mode.ready = true; mode.why = "";
  } catch (e) {
    mode.server = false; mode.ready = true;
    mode.why = (e && e.error === "server-off")
      ? "서버에 열쇠가 없어 연습 모드입니다"
      : "서버에 닿지 못해 연습 모드입니다";
    local.load();
  }
  return purse;
}

/* ── 하는 일 ──────────────────────────────────────────────── */

export async function takeJob(jobId) {
  if (mode.server) return soak(await ask("take", { job: jobId }));
  if (purse.job !== jobId) { purse.job = jobId; purse.attached = {}; local.save(); }
  return purse;
}

export async function buy(cart) {
  if (mode.server) {
    const w = await ask("buy", { cart: cart });
    soak(w);
    return { bill: w.bill, n: w.n };
  }
  let bill = 0, n = 0;
  for (const id of Object.keys(cart)) {
    const q = cart[id];
    if (!(q > 0)) continue;
    bill += priceOf(id) * q; n += q;
  }
  if (!n) throw new Error("담은 것이 없습니다");
  if (bill > purse.point) throw new Error("포인트가 모자랍니다");
  purse.point -= bill;
  for (const id of Object.keys(cart))
    if (cart[id] > 0) purse.mats[id] = countMat(id) + cart[id];
  local.save();
  return { bill: bill, n: n };
}

export async function craft(a, b) {
  if (mode.server) {
    const w = await ask("craft", { a: a, b: b });
    soak(w);
    return recipeById(w.made);
  }
  const r = combine(a, b);
  if (!r) throw new Error("그 둘은 합쳐지지 않습니다");
  if (!(countMat(a) > 0) || !(countMat(b) > 0)) throw new Error("재료가 없습니다");
  if (a === b && countMat(a) < 2) throw new Error("재료가 없습니다");
  if (purse.tools.length >= MAX_TOOLS) throw new Error("연장이 너무 많습니다");
  purse.mats[a]--; purse.mats[b]--;
  purse.tools.push({ recipe: r.id, arg: "" });
  local.save();
  return r;
}

export async function setArg(i, arg) {
  if (mode.server) return soak(await ask("arg", { i: i, arg: arg }));
  if (purse.tools[i]) purse.tools[i].arg = String(arg).slice(0, 20);
  local.save();
  return purse;
}

export async function attach(i, part) {
  if (mode.server) return soak(await ask("attach", { i: i, part: part }));
  const job = jobById(purse.job), tool = purse.tools[i];
  if (!job || !tool) throw new Error("붙일 수 없습니다");
  const p = job.parts.find(function (x) { return x.id === part; });
  const r = recipeById(tool.recipe);
  if (!p || !r || r.on.indexOf(bucketOf(p.kind)) < 0)
    throw new Error("그 자리에는 못 붙입니다");
  purse.tools.splice(i, 1);
  (purse.attached[part] = purse.attached[part] || []).push(tool);
  local.save();
  return purse;
}

export async function detach(part, j) {
  if (mode.server) return soak(await ask("detach", { part: part, j: j }));
  const list = purse.attached[part] || [];
  if (!list[j]) return purse;
  purse.tools.push(list.splice(j, 1)[0]);
  if (!list.length) delete purse.attached[part];
  local.save();
  return purse;
}

export async function answer(q, pick) {
  if (mode.server) {
    const w = await ask("quiz", { q: q, pick: pick });
    soak(w);
    return { right: w.right, why: w.why, got: w.got };
  }
  // 연습 모드에는 정답이 없다. 서버에만 두었기 때문이다.
  purse.quiz[q] = null;
  local.save();
  return { right: null, got: 0,
    why: "연습 모드에서는 채점하지 않습니다. 서버를 붙이면 그 자리에서 채점됩니다." };
}

export async function look() {
  if (mode.server) return (await ask("look")).appraisal;
  const job = jobById(purse.job);
  return job ? appraise(job, purse.attached) : null;
}

export async function sell() {
  if (mode.server) {
    const w = await ask("sell");
    if (w.refused) return { refused: true, appraisal: w.appraisal };
    soak(w);
    return { appraisal: w.appraisal };
  }
  const job = jobById(purse.job);
  if (!job) throw new Error("맡은 의뢰가 없습니다");
  const a = appraise(job, purse.attached);
  if (!a.passed) return { refused: true, appraisal: a };
  purse.point += a.price;
  purse.done.push(job.id);
  purse.sold.push({ job: job.id, price: a.price, at: Date.now() });
  purse.attached = {}; purse.job = null;
  local.save();
  return { appraisal: a };
}

/* ── 세어 보는 것들 ───────────────────────────────────────── */

export const solvedCount = () =>
  Object.keys(purse.quiz).filter(k => purse.quiz[k] === true).length;
export const quizLeft = () => QUESTIONS.length - Object.keys(purse.quiz).length;

export { MATERIALS as CATALOG, REWARD };
