// 12주차 복습 시뮬레이터 — 입장(버전 배정) · 평가 기록 · 마지막 답 · 사후 설명 공개. 버셀 서버리스 함수.
//
// 버셀 Environment Variables (앞 주차가 이미 넣어 둔 것을 그대로 쓴다)
//   FIREBASE_SERVICE_ACCOUNT   서비스 계정 JSON 전체
//   HCI4_ADMIN                 현황판 교수용 암호 — 12주차만 다른 암호를 쓰려면 REVIEW_ADMIN_CODE
//
// 모음 hci12_review/{cid}  학생 한 명의 기록
//      hci12_meta/state     { n: 입장 순번, reveal: 사후 설명 공개 여부 }
//   join    cid · id · name           → { version }  입장 순서대로 A → B → C → D
//   log     평가 제출 (traps · approvals · ratings · answers …)
//   final   마지막 질문 답
//   status  → { reveal }
//   admin   check · list · reveal · hide · reset

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ALLOW = ["https://gccrc-crae.web.app", "https://gccrc-crae.firebaseapp.com"];
const COL = "hci12_review", META = "hci12_meta/state";
const VERS = ["A", "B", "C", "D"], TRAP_IDS = ["t1", "t2", "t3", "t4"], QIDS = ["q1", "q2", "q3"];
const OUTS = ["blocked", "undone", "missed"], HOWS = ["plan", "step", "undo", "edit", "approved", "approveAll", "auto", "none"];
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

const SA_NAMES = ["FIREBASE_SERVICE_ACCOUNT", "FIREBASE_SERVICE_ACCOUNT_KEY", "GOOGLE_SERVICE_ACCOUNT",
                  "GOOGLE_APPLICATION_CREDENTIALS_JSON", "FIREBASE_ADMIN_SDK"];
function serviceAccount() {
  for (const name of SA_NAMES) {
    const raw = (process.env[name] || "").trim();
    if (!raw) continue;
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  }
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (projectId && clientEmail && key) return { projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") };
  throw new Error(`버셀에 파이어베이스 서비스 계정이 없습니다 — ${SA_NAMES[0]} 등에 JSON 을 넣어 주십시오`);
}
function db() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  return getFirestore();
}

const okCid = c => /^[a-z0-9]{8,32}$/.test(String(c));
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;

/** 평가 기록에서 저장할 칸만 남긴다. */
export function cleanLog(b) {
  const traps = {};
  for (const t of TRAP_IDS) {
    const o = b.traps?.[t];
    if (o && OUTS.includes(o.out)) traps[t] = { out: o.out, how: HOWS.includes(o.how) ? o.how : "none" };
  }
  const approvals = (Array.isArray(b.approvals) ? b.approvals : []).slice(0, 60).map(a => ({
    q: QIDS.includes(a?.q) ? a.q : "", i: int(a?.i, -1, 9) ?? -1, kind: clip(a?.kind, 12),
    decision: ["approve", "skip", "all"].includes(a?.decision) ? a.decision : "",
    ms: int(a?.ms, 0, 3_600_000), opened: a?.opened === true, trap: TRAP_IDS.includes(a?.trap) ? a.trap : "",
    removed: Array.isArray(a?.removed) ? a.removed.filter(x => int(x, 0, 9) !== null).slice(0, 10) : undefined,
  })).map(a => { if (a.removed === undefined) delete a.removed; if (a.ms === null) delete a.ms; return a; });
  const ratings = {}, answers = {}, ms = {}, approveAll = {};
  for (const q of QIDS) {
    const r = b.ratings?.[q];
    ratings[q] = Array.isArray(r) ? r.slice(0, 3).map(x => int(x, 0, 7) ?? 0) : [0, 0, 0];
    answers[q] = clip(b.answers?.[q], 4000);
    ms[q] = int(b.ms?.[q], 0, 7_200_000) ?? 0;
    approveAll[q] = b.approveAll?.[q] === true;
  }
  return {
    id: clip(b.id, 20), name: clip(b.name, 30), version: VERS.includes(b.version) ? b.version : "",
    practice: b.practice === true ? true : b.practice === false ? false : null,
    traps, approvals, ratings, answers, ms, approveAll,
    reuse: int(b.reuse, 0, 7) ?? 0, odd: clip(b.odd, 2000),
  };
}

async function adminOp(store, body) {
  const code = process.env.REVIEW_ADMIN_CODE || process.env.HCI4_ADMIN;
  if (!code) return [503, { error: "버셀에 HCI4_ADMIN(또는 REVIEW_ADMIN_CODE) 이 없습니다" }];
  if (body.code !== code) return [403, { error: "교수용 암호가 맞지 않습니다" }];
  const meta = store.doc(META);
  if (body.op === "check") return [200, { ok: true }];
  if (body.op === "list") {
    const [snap, m] = await Promise.all([store.collection(COL).get(), meta.get()]);
    return [200, { people: snap.docs.map(d => d.data()), reveal: m.exists && m.data().reveal === true }];
  }
  if (body.op === "reveal" || body.op === "hide") {
    await meta.set({ reveal: body.op === "reveal" }, { merge: true });
    return [200, { ok: true }];
  }
  if (body.op === "reset") {
    const snap = await store.collection(COL).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
    await meta.set({ n: 0, reveal: false });
    return [200, { ok: true }];
  }
  return [400, { error: "모르는 요청입니다" }];
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const ok = ALLOW.includes(origin) || /\.vercel\.app$/.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", ok ? origin : ALLOW[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST 로만 부를 수 있습니다" });

  const body = req.body || {};
  try {
    const store = db();
    if (body.action === "admin") {
      const [s, out] = await adminOp(store, body);
      return res.status(s).json(out);
    }
    if (body.action === "status") {
      const m = await store.doc(META).get();
      return res.status(200).json({ reveal: m.exists && m.data().reveal === true });
    }
    if (!okCid(body.cid)) return res.status(400).json({ error: "형식 오류" });
    const ref = store.doc(`${COL}/${body.cid}`);

    if (body.action === "join") {
      const id = clip(body.id, 20), name = clip(body.name, 30);
      if (!id || !name) return res.status(400).json({ error: "학번과 이름을 입력하십시오" });
      const version = await store.runTransaction(async tx => {
        const [me, m] = await Promise.all([tx.get(ref), tx.get(store.doc(META))]);
        if (me.exists && VERS.includes(me.data().version)) return me.data().version;
        const n = m.exists ? m.data().n || 0 : 0;
        const v = VERS[n % 4];
        tx.set(store.doc(META), { n: n + 1 }, { merge: true });
        tx.set(ref, { id, name, version: v, joinedAt: Date.now() }, { merge: true });
        return v;
      });
      return res.status(200).json({ version });
    }
    if (body.action === "log") {
      const data = cleanLog(body);
      if (!data.id || !data.version) return res.status(400).json({ error: "형식 오류" });
      await ref.set({ ...data, loggedAt: Date.now() }, { merge: true });
      return res.status(200).json({ ok: true });
    }
    if (body.action === "final") {
      const final = (Array.isArray(body.final) ? body.final : []).slice(0, 2).map(t => clip(t, 4000));
      await ref.set({ id: clip(body.id, 20), name: clip(body.name, 30), final, finalAt: Date.now() }, { merge: true });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "모르는 요청입니다" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
