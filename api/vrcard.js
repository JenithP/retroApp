// VR · AR 적용 판단 실습 (6주차) — 단계 넘기기와 비우기. 버셀 서버리스 함수.
//
// 버셀 Environment Variables (4 · 5주차가 이미 넣어 둔 것을 그대로 쓴다)
//   FIREBASE_SERVICE_ACCOUNT   서비스 계정 JSON 전체
//   HCI4_ADMIN                 현황판 교수용 암호 — 6주차만 다른 암호를 쓰려면 VRCARD_ADMIN_CODE
//
// 학생 브라우저는 단계(hci6_state)를 쓸 수 없다. 분류판 · 설계안 · 부작용은 학생이 직접 쓰되,
// 언제 쓸 수 있는지는 firestore.rules 가 hci6_state 의 단계를 보고 정한다.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PHASE_ORDER } from "../public/vrcard/js/data.js";

const ALLOW = ["https://gccrc-crae.web.app", "https://gccrc-crae.firebaseapp.com"];

// 앱 공방(api/appshop.js)과 같은 방식으로 서비스 계정을 찾는다
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

async function adminOp(store, body) {
  const code = process.env.VRCARD_ADMIN_CODE || process.env.HCI4_ADMIN;
  if (!code) return [503, { error: "버셀에 HCI4_ADMIN(또는 VRCARD_ADMIN_CODE) 이 없습니다" }];
  if (body.code !== code) return [403, { error: "교수용 암호가 맞지 않습니다" }];
  const stateRef = store.doc("hci6_state/current");

  if (body.op === "check") return [200, { ok: true }];

  if (body.op === "phase") {
    if (!PHASE_ORDER.includes(body.phase)) return [400, { error: "없는 단계입니다" }];
    await stateRef.set({ phase: body.phase, updatedAt: Date.now(), [`at_${body.phase}`]: Date.now() }, { merge: true });
    return [200, { ok: true, phase: body.phase }];
  }

  if (body.op === "reset") {
    // 리허설 뒤 비우기 — 분류판 · 설계안 · 부작용 전부
    for (const name of ["hci6_boards", "hci6_designs", "hci6_sides"]) {
      const snap = await store.collection(name).get();
      await Promise.all(snap.docs.map(d => d.ref.delete()));
    }
    await stateRef.set({ phase: "ready", updatedAt: Date.now() });
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
    if (body.action !== "admin") return res.status(400).json({ error: "모르는 요청입니다" });
    const [s, out] = await adminOp(db(), body);
    return res.status(s).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
