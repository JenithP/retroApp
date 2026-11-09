// 아바타 신뢰 게임 (11주차) — 버셀 서버리스 함수.
//
// 버셀 Environment Variables (앞 주차가 이미 넣어 둔 것을 그대로 쓴다)
//   FIREBASE_SERVICE_ACCOUNT   서비스 계정 JSON 전체
//   HCI4_ADMIN                 현황판 교수용 암호 — 11주차만 다른 암호를 쓰려면 TRUST_ADMIN_CODE
//
// 모음 (학생 쓰기는 채팅 · 단서 메시지뿐. 나머지는 전부 이 함수가 쓴다)
//   hci11_state/current        단계 · 판 · 조건 · 대화 마감 시각
//   hci11_people/{uid}         학번 · 이름 · 닉네임 · 점수 · 수탁자 횟수 · 쉰 횟수 · 만난 상대 — 자기 것만 읽음
//   hci11_seats/{uid}_{판}     이번 판의 내 자리 (역할 · 별명 · 비밀 역할 · 결과) — 자기 것만 읽음
//   hci11_pairs/{짝}           짝 (두 사람 · 조건 · 공개 후 결과) — 두 사람만 읽음
//   hci11_pairs/{짝}/msgs      채팅 · 단서 — 두 사람만, 대화 단계에서만 씀
//   hci11_moves/{짝}           결정과 비밀 역할 — 이 함수만 읽고 씀
//
// 학생  join · ping · move
// 교수  admin: check · list · next · decide · reveal · end · reset
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { CONDS, TALK_SEC, SEEN_MS, matchRound, nicks, pairId, seatId, cleanMove, settle, cleanNick, nickKey } from "../public/trust/js/game.js";

const ALLOW = ["https://gccrc-crae.web.app", "https://gccrc-crae.firebaseapp.com"];
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
function admin() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  return { db: getFirestore(), auth: getAuth() };
}

const stateRef = db => db.doc("hci11_state/current");
async function getState(db) {
  return (await stateRef(db).get()).data() || { phase: "lobby", round: 0 };
}

/* ── 학생 ── */

async function join(db, uid, body) {
  const sid = clip(body.sid, 12).replace(/\s/g, "");
  const name = clip(body.name, 20);
  if (!/^[0-9A-Za-z]{4,12}$/.test(sid)) return [400, { error: "학번을 확인해 주세요" }];
  if (!name) return [400, { error: "이름을 적어 주세요" }];
  const nick = cleanNick(body.nick), key = nickKey(nick);
  if (!key) return [400, { error: "닉네임을 정해 주세요" }];
  // 같은 닉네임은 한 사람만 (상대가 누구인지 헷갈리지 않게)
  const same = await db.collection("hci11_people").where("nickKey", "==", key).get();
  if (same.docs.some(d => d.id !== uid)) return [409, { error: "이미 다른 사람이 쓰는 닉네임입니다" }];
  const ref = db.doc(`hci11_people/${uid}`);
  const now = Date.now();
  const old = (await ref.get()).data();
  if (old) await ref.update({ sid, name, nick, nickKey: key, seen: now });
  else await ref.set({ uid, sid, name, nick, nickKey: key, at: now, seen: now, score: 0, trusteeN: 0, restN: 0, partners: [] });
  return [200, { ok: true }];
}

async function ping(db, uid) {
  const ref = db.doc(`hci11_people/${uid}`);
  if (!(await ref.get()).exists) return [404, { error: "접속 정보가 없습니다 — 다시 입장해 주세요" }];
  await ref.update({ seen: Date.now() });
  return [200, { ok: true }];
}

async function move(db, uid, body) {
  const st = await getState(db);
  const seat = (await db.doc(`hci11_seats/${seatId(uid, st.round)}`).get()).data();
  if (!seat || !seat.pairId) return [403, { error: "이번 판의 자리가 없습니다" }];
  const role = seat.role;
  const v = cleanMove(role, body);
  if (!v || !Object.keys(v).length) return [400, { error: "값을 확인해 주세요" }];
  // 수탁자는 대화 중에도 반환율을 정해 둘 수 있다. 나머지는 결정 단계에서만
  const onlyRet = role === "trustee" && Object.keys(v).every(k => k === "ret");
  const okPhase = st.phase === "decide" || (onlyRet && st.phase === "talk");
  if (!okPhase) return [409, { error: st.phase === "talk" ? "결정 단계에서 정할 수 있습니다" : "결정이 마감되었습니다" }];
  const key = role === "investor" ? "inv" : "tru";
  await db.doc(`hci11_moves/${seat.pairId}`).set({ [key]: { ...v, at: Date.now() } }, { merge: true });
  return [200, { ok: true }];
}

/* ── 교수 ── */

async function next(db, body) {
  const st = await getState(db);
  if (st.phase === "talk" || st.phase === "decide") return [409, { error: "지금 판을 먼저 공개해 주세요" }];
  const cond = body.cond in CONDS ? body.cond : "both";
  const talkSec = Number.isInteger(body.talkSec) && body.talkSec >= 30 && body.talkSec <= 600 ? body.talkSec : TALK_SEC;
  const missions = body.missions !== false;
  const now = Date.now();
  const snap = await db.collection("hci11_people").get();
  const people = snap.docs.map(d => d.data()).filter(p => now - (p.seen || 0) < SEEN_MS);
  if (people.length < 2) return [409, { error: `접속 중인 사람이 ${people.length}명입니다 — 두 명 이상 필요` }];

  const round = (st.round || 0) + 1;
  const { pairs, rest } = matchRound(people, { missions });
  const names = nicks(pairs.length * 2);
  const nickOf = Object.fromEntries(people.map(p => [p.uid, p.nick]));
  const batch = db.batch();
  pairs.forEach((p, i) => {
    const id = pairId(round, i);
    const invNick = nickOf[p.inv] || names[i * 2], truNick = nickOf[p.tru] || names[i * 2 + 1];
    batch.set(db.doc(`hci11_pairs/${id}`), { round, cond, uids: [p.inv, p.tru], inv: p.inv, tru: p.tru, invNick, truNick, at: now });
    batch.set(db.doc(`hci11_moves/${id}`), { round, cond, mission: p.mission });
    batch.set(db.doc(`hci11_seats/${seatId(p.inv, round)}`), { uid: p.inv, round, cond, pairId: id, role: "investor", nick: invNick, partnerNick: truNick, missions });
    batch.set(db.doc(`hci11_seats/${seatId(p.tru, round)}`), { uid: p.tru, round, cond, pairId: id, role: "trustee", nick: truNick, partnerNick: invNick, mission: p.mission, missions });
    batch.update(db.doc(`hci11_people/${p.inv}`), { partners: FieldValue.arrayUnion(p.tru) });
    batch.update(db.doc(`hci11_people/${p.tru}`), { partners: FieldValue.arrayUnion(p.inv), trusteeN: FieldValue.increment(1) });
  });
  if (rest) {
    batch.set(db.doc(`hci11_seats/${seatId(rest, round)}`), { uid: rest, round, cond, pairId: null, role: "rest" });
    batch.update(db.doc(`hci11_people/${rest}`), { restN: FieldValue.increment(1) });
  }
  batch.set(stateRef(db), { phase: "talk", round, cond, talkSec, missions, endsAt: now + talkSec * 1000, startedAt: now });
  await batch.commit();
  return [200, { ok: true, round, pairs: pairs.length, rest: !!rest }];
}

async function decide(db) {
  const st = await getState(db);
  if (st.phase !== "talk") return [409, { error: "대화 단계가 아닙니다" }];
  await stateRef(db).update({ phase: "decide", decideAt: Date.now() });
  return [200, { ok: true }];
}

async function reveal(db) {
  const st = await getState(db);
  if (st.phase !== "decide") return [409, { error: "결정 단계가 아닙니다" }];
  await stateRef(db).update({ phase: "revealing" });
  const pairs = await db.collection("hci11_pairs").where("round", "==", st.round).get();
  for (const d of pairs.docs) {
    const pair = d.data();
    if (pair.result) continue;
    const mv = (await db.doc(`hci11_moves/${d.id}`).get()).data() || {};
    const msgs = (await d.ref.collection("msgs").get()).docs.map(m => m.data());
    const result = settle({ ...pair, mission: mv.mission }, mv, msgs);
    const batch = db.batch();
    batch.update(d.ref, { result, mission: mv.mission || null });
    batch.update(db.doc(`hci11_seats/${seatId(pair.inv, st.round)}`), { result });
    batch.update(db.doc(`hci11_seats/${seatId(pair.tru, st.round)}`), { result });
    batch.update(db.doc(`hci11_people/${pair.inv}`), { score: FieldValue.increment(result.inv) });
    batch.update(db.doc(`hci11_people/${pair.tru}`), { score: FieldValue.increment(result.tru) });
    await batch.commit();
  }
  await stateRef(db).update({ phase: "reveal", revealAt: Date.now() });
  return [200, { ok: true }];
}

async function list(db) {
  const [st, people, pairs, moves] = await Promise.all([
    getState(db), db.collection("hci11_people").get(), db.collection("hci11_pairs").get(), db.collection("hci11_moves").get(),
  ]);
  const mv = Object.fromEntries(moves.docs.map(d => [d.id, d.data()]));
  const now = Date.now();
  return [200, {
    state: st, now,
    people: people.docs.map(d => {
      const p = d.data();
      return { uid: p.uid, sid: p.sid, name: p.name, nick: p.nick || "", score: p.score || 0, online: now - (p.seen || 0) < SEEN_MS, trusteeN: p.trusteeN || 0, restN: p.restN || 0 };
    }),
    // 이번 판은 누가 결정을 냈는지만, 지난 판은 결과까지. 결정 값 자체는 공개 전에 보내지 않는다
    pairs: pairs.docs.map(d => {
      const p = d.data(), m = mv[d.id] || {};
      return {
        id: d.id, round: p.round, cond: p.cond, inv: p.inv, tru: p.tru, invNick: p.invNick, truNick: p.truNick,
        mission: p.result ? p.mission : m.mission || null,
        invDone: m.inv?.send !== undefined, truDone: m.tru?.ret !== undefined,
        invRated: m.inv?.trust !== undefined, truRated: m.tru?.trust !== undefined,
        result: p.result || null,
      };
    }),
  }];
}

async function wipe(db, name, sub) {
  const snap = await db.collection(name).get();
  for (const d of snap.docs) {
    if (sub) { const vs = await d.ref.collection(sub).get(); await Promise.all(vs.docs.map(v => v.ref.delete())); }
    await d.ref.delete();
  }
  return snap.size;
}

async function adminOp({ db }, body) {
  const code = process.env.TRUST_ADMIN_CODE || process.env.HCI4_ADMIN;
  if (!code) return [503, { error: "버셀에 HCI4_ADMIN(또는 TRUST_ADMIN_CODE) 이 없습니다" }];
  if (body.code !== code) return [403, { error: "교수용 암호가 맞지 않습니다" }];
  switch (body.op) {
    case "check": return [200, { ok: true }];
    case "list": return list(db);
    case "next": return next(db, body);
    case "decide": return decide(db);
    case "reveal": return reveal(db);
    case "end": {
      const st = await getState(db);
      if (st.phase === "talk" || st.phase === "decide") return [409, { error: "지금 판을 먼저 공개해 주세요" }];
      await stateRef(db).set({ ...st, phase: "end", endAt: Date.now() });
      return [200, { ok: true }];
    }
    case "reset": {
      // 사람은 남기고(다시 입장하지 않아도 되게) 판 기록과 점수만 지운다. all 이면 사람까지
      const n = { pairs: await wipe(db, "hci11_pairs", "msgs"), seats: await wipe(db, "hci11_seats"), moves: await wipe(db, "hci11_moves") };
      if (body.all) n.people = await wipe(db, "hci11_people");
      else {
        const snap = await db.collection("hci11_people").get();
        await Promise.all(snap.docs.map(d => d.ref.update({ score: 0, trusteeN: 0, restN: 0, partners: [] })));
      }
      await stateRef(db).set({ phase: "lobby", round: 0, at: Date.now() });
      return [200, { ok: true, ...n }];
    }
  }
  return [400, { error: "모르는 요청입니다" }];
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const ok = ALLOW.includes(origin) || /\.vercel\.app$/.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", ok ? origin : ALLOW[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST 로만 부를 수 있습니다" });

  const body = req.body || {};
  try {
    const fb = admin();
    if (body.action === "admin") {
      const [s, out] = await adminOp(fb, body);
      return res.status(s).json(out);
    }
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let uid;
    try { uid = (await fb.auth.verifyIdToken(token)).uid; }
    catch { return res.status(401).json({ error: "접속 확인 실패 — 새로고침해 주세요" }); }
    const fn = { join, ping, move }[body.action];
    if (!fn) return res.status(400).json({ error: "모르는 요청입니다" });
    const [s, out] = await fn(fb.db, uid, body);
    return res.status(s).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
