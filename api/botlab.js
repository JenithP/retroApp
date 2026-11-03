// 챗봇 전환 실습 (10주차) — 답변 저장 · 현황판 조회. 버셀 서버리스 함수.
//
// 버셀 Environment Variables (앞 주차가 이미 넣어 둔 것을 그대로 쓴다)
//   FIREBASE_SERVICE_ACCOUNT   서비스 계정 JSON 전체
//   HCI4_ADMIN                 현황판 교수용 암호 — 10주차만 다른 암호를 쓰려면 BOTLAB_ADMIN_CODE
//
// 학생이 답변 파일을 내려받을 때 한 번 저장한다. 다시 내려받으면 덮어쓴다. 키워드와 예시 문장은 보내지 않는다.
// 모음 hci10_bot 은 이 함수만 읽고 쓴다.
//   submit  cid · id · name · team · a1 · a2 · rule · learn
//   admin   check · list · reset

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ALLOW = ["https://gccrc-crae.web.app", "https://gccrc-crae.firebaseapp.com"];
const TEAMS = 40, TESTS = 16, CATS = 4;
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

const count = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
function score(r) {
  if (!r || !count(r.pass, TESTS)) return null;
  if (!Array.isArray(r.byCat) || r.byCat.length !== CATS || !r.byCat.every(n => count(n, TESTS))) return null;
  return { pass: r.pass, byCat: r.byCat };
}

/** 학생이 보낸 값에서 저장할 칸만 남긴다. cid 가 틀리거나 필수 칸이 비면 null. */
export function clean(body) {
  if (!/^[a-z0-9]{8,32}$/.test(String(body?.cid))) return null;
  const out = { id: clip(body.id, 20), name: clip(body.name, 30), a1: clip(body.a1, 5000), a2: clip(body.a2, 5000) };
  if (!out.id || !out.name || !out.a1 || !out.a2) return null;
  const team = Number(clip(body.team, 10).replace(/조/g, ""));
  out.team = Number.isInteger(team) && team >= 1 && team <= TEAMS ? team : null;
  out.rule = score(body.rule);
  out.learn = score(body.learn);
  return out;
}

async function adminOp(store, body) {
  const code = process.env.BOTLAB_ADMIN_CODE || process.env.HCI4_ADMIN;
  if (!code) return [503, { error: "버셀에 HCI4_ADMIN(또는 BOTLAB_ADMIN_CODE) 이 없습니다" }];
  if (body.code !== code) return [403, { error: "교수용 암호가 맞지 않습니다" }];
  if (body.op === "check") return [200, { ok: true }];
  if (body.op === "list") {
    const snap = await store.collection("hci10_bot").get();
    return [200, { people: snap.docs.map(d => d.data()) }];
  }
  if (body.op === "reset") {
    const snap = await store.collection("hci10_bot").get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
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
    if (body.action === "admin") {
      const [s, out] = await adminOp(db(), body);
      return res.status(s).json(out);
    }
    if (body.action === "submit") {
      const data = clean(body);
      if (!data) return res.status(400).json({ error: "형식 오류" });
      await db().doc(`hci10_bot/${body.cid}`).set({ ...data, at: Date.now() });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "모르는 요청입니다" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
