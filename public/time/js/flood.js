// 1장 ② 홍수 — 말만 있던 시대.
//
// 사냥꾼 아빠가 원시 말투로 경고를 딱 한 번 외친다. 글자로는 보여 주지 않는다 — 소리는 나오는 순간 사라진다.
// 조가 의논해 그 뜻을 우리 말로 풀어 적는다(상황 의존적인 말을 풀어내기).
// 뜻을 풀면 3분 안에 마을로 달려가 엄마에게 「들은 말 그대로」 전해야 한다.
// 엄마는 「홍수」 같은 말을 모른다 — 뜻만 알고 제 말로 바꾸면 통하지 않는다. 구술 문화의 정형구와 되풀이.
// 시간 안에 못 전하면 물이 마을을 삼키고, 경고 듣기부터 다시 한다.
import { audio } from "./audio.js";
import { VILLAGE } from "./world.js";
import { judge } from "./ch1.js";
import * as THREE from "three";

const PAPA = "사냥꾼", MAMA = "엄마", NU = "빠른 발 누", WE = "나";
export const WARNING = "하늘이 울고, 또 운다. 그리고 산의 물이 배고프다.\n배고픈 물이 내려온다. 해가 눕기 전에.\n붉은 흙 등으로 올라라. 늙은 발 먼저, 작은 발 먼저.";
const LIMIT = 180;              // 「전하세요」부터 3분
const SAME = 0.9;               // 들은 말과 이만큼 같아야 엄마가 알아듣는다

const norm = s => s.replace(/[\s.,!?…·'"「」()\-~]/g, "");
function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

/** 경고를 한 번 들려준다 — 녹음 파일, 없으면 브라우저 한국어 목소리, 그것도 없으면 잠깐 글자로 */
async function playWarning(G) {
  const url = "media/flood_warning.mp3";
  try {
    const h = await fetch(url, { method: "HEAD" });
    const type = h.headers.get("content-type") || "";
    if (h.ok && !type.includes("text/html")) {
      const a = new Audio(url);
      await new Promise(res => { a.onended = res; a.onerror = res; a.play().catch(res); });
      return "file";
    }
  } catch (e) {}
  if ("speechSynthesis" in window) {
    let voices = speechSynthesis.getVoices();
    if (!voices.length) await new Promise(r => { speechSynthesis.onvoiceschanged = r; setTimeout(r, 1500); });
    const ko = speechSynthesis.getVoices().find(v => /^ko/i.test(v.lang));
    if (ko) {
      await new Promise(res => {
        const u = new SpeechSynthesisUtterance(WARNING.replace(/\n/g, " "));
        u.voice = ko; u.lang = "ko-KR"; u.rate = 0.88; u.pitch = 0.7;
        u.onend = res; u.onerror = res;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        setTimeout(res, 20000);
      });
      return "voice";
    }
  }
  G.talk.wait(PAPA, WARNING);                     // 소리를 낼 수 없는 기기 — 8초만 보여 준다
  await G.wait(8);
  G.talk.close();
  return "text";
}

export async function flood(G) {
  const { talk, npc } = G;
  const papa = npc.hunter, mama = npc.woman, nu = npc.nu;
  const S = { meaningTries: 0, relayTries: 0, fails: 0, replays: 0, secsLeft: 0, secs: 0 };
  const t0 = performance.now();
  const limit = (window.__G && window.__floodLimit) || LIMIT;     // 시험 주소에서만 줄일 수 있다

  G.chapter("1장 · 말만 있던 시대");
  G.missLabel = "말이 안 통한 횟수";

  for (let round = 1; ; round++) {
    /* ── 경고 듣기 ───────────────────────────────────── */
    G.floodSetup();
    G.objective("개울가. 비가 며칠째 그치지 않는다.");
    if (round === 1) await talk.say("", "(불이 붙고 며칠이 지났다. 그날부터 비가 그치지 않았다. 개울 소리가 점점 거칠어진다.)");
    else await talk.say("", "(…정신을 차려 보니 다시 개울가였다. 사냥꾼이 산 쪽에서 달려오고 있다.)");
    talk.close();
    await G.walkTo(papa, [G.player.pos.clone().add(new THREE.Vector3(1.6, 0, -1.4))], 4.6);
    await G.faceEachOther(papa);
    await talk.say(PAPA, "(숨을 헐떡이며 산 쪽을 가리킨다) 들어라! 잘 들어라! 한 번만 말한다!");
    talk.close();
    G.objective("사냥꾼의 말을 잘 들으십시오. 글자로 적을 수 없는 시대입니다.");
    papa.avatar.talking = true;
    await playWarning(G);
    papa.avatar.talking = false;

    /* ── 뜻 풀기 ─────────────────────────────────────── */
    G.objective("사냥꾼의 말은 무슨 뜻일까? 조원과 의논해 적으십시오.");
    let replay = 1, misses = 0;
    for (;;) {
      const text = await talk.ask(WE, "사냥꾼의 말은 무슨 뜻일까? 조원과 의논해 오늘날 말로 풀어 적어 보자.",
        { placeholder: "사냥꾼의 말은 … 라는 뜻이다", button: "뜻 풀이 내기", extra: replay ? "한 번 더 듣기" : null });
      if (text === null) {                        // 한 번 더 듣기 — 딱 한 번
        replay--; S.replays++;
        talk.close();
        papa.avatar.talking = true; await playWarning(G); papa.avatar.talking = false;
        continue;
      }
      S.meaningTries++;
      talk.wait("", "(조원들의 풀이를 곰곰이 따져 본다…)");
      const r = await judge("floodMeaning", text);
      G.log({ kind: "answer", chapter: "1-flood", step: "floodMeaning", text: text.slice(0, 300), ok: r.understood, offline: r.offline });
      if (r.understood) { audio.chime(); G.hit("뜻을 풀었다"); break; }
      misses++;
      G.miss("뜻을 아직 풀지 못했다", r.offline ? "판정 서버에 닿지 않아 간단히 판정했습니다" : "무엇이 오고, 어디로 가라는 말일까");
      await talk.say("", misses >= 2
        ? "(실마리) 하늘이 계속 울면 산의 물은 어떻게 될까요? 그 물이 내려오면 사람들은 어디로 가야 할까요?"
        : "(아직 뜻이 분명하지 않다. 무엇이 오고, 어디로 가라는 말인지 다시 의논해 보십시오.)");
    }
    await G.faceEachOther(papa);
    await talk.say(WE, "물이 넘쳐 내려온다는 말이야! 해 지기 전에 높은 데로 피하래. 마을에 알리자!");
    await talk.say(PAPA, "(마을 쪽을 가리킨다) 뛰어라! 사냥꾼은 산 사람들에게 간다!");
    talk.close();
    G.walkTo(papa, [new THREE.Vector3(G.player.pos.x + 12, 0, G.player.pos.z - 20)], 5);

    /* ── 3분 안에 들은 말 그대로 ─────────────────────── */
    G.objective("마을로 달려가 엄마에게 사냥꾼의 말을 전하십시오!");
    const ok = await G.timed(limit, async alive => {
      await G.interact(mama, "말 전하기", 3.2);
      for (;;) {
        if (!alive()) return false;
        const t = await talk.ask(WE, "엄마에게 사냥꾼의 말을 전하자. 들은 말 그대로!",
          { placeholder: "사냥꾼이 한 말 그대로", button: "엄마에게 말하기" });
        if (!alive()) return false;
        S.relayTries++;
        const sim = similarity(norm(t), norm(WARNING));
        const pass = sim >= SAME;
        G.log({ kind: "relay", chapter: "1-flood", text: t.slice(0, 300), sim: Math.round(sim * 100), ok: pass });
        if (pass) return true;
        audio.huh(); mama.avatar.play("tilt", 1.4);
        G.miss("엄마가 알아듣지 못했다", `들은 말과 ${Math.round(sim * 100)}% 같다 — 그대로 전해야 한다`);
        await talk.say(MAMA, "(고개를 갸웃한다) …? 엄마는 모른다. 사냥꾼이 한 말, 그 말 그대로 해라!");
      }
    });

    if (ok) { S.secsLeft = G.floodLeft; break; }

    /* ── 물이 마을을 삼켰다 — 경고 듣기부터 다시 ─────── */
    S.fails++;
    G.log({ kind: "flood", chapter: "1-flood", pass: false, round });
    await G.floodOver();
  }

  /* ── 전해졌다 ───────────────────────────────────────── */
  G.floodStop();
  audio.chime();
  mama.avatar.play("joy", 1.2);
  await talk.say(MAMA, "(눈이 커진다) 배고픈 물! 해가 눕기 전에! 붉은 흙 등으로 올라라! 늙은 발 먼저, 작은 발 먼저!");
  await talk.say(NU, "붉은 흙 등으로! 할아버지 먼저! 그리고 누도 간다! 그리고 또 간다!");
  talk.close();
  G.objective("마을 사람들이 붉은 흙 언덕으로 피한다.");
  await G.toHill();
  await talk.say("", "(해가 눕자 개울이 넘쳐 마을까지 차올랐다. 그러나 사람들은 모두 붉은 흙 언덕 위에 있었다. 들은 그대로 전해진 말이 마을을 살렸다.)");
  talk.close();

  S.secs = Math.round((performance.now() - t0) / 1000);
  G.log({ kind: "flood", chapter: "1-flood", pass: true, ...S });

  G.objective("물 위에서 무언가 반짝인다.");
  const pit = G.world.firePit.position;
  G.shot(pit.clone().add(new THREE.Vector3(4.5, 3.2, 6)), pit.clone().add(new THREE.Vector3(0, 2.2, 0)));
  await G.typeGlow();
  G.shot(null);
  return S;
}
