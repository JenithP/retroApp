// 1장 ① 불 — 말만 있던 시대.
//
// 누는 사물을 이름이 아니라 쓰임으로 부른다(옹 ④ 상황 의존적). 그래서 「나무」, 「불」, 「마찰」 같은
// 추상어는 통하지 않고, 겪어 본 일이나 쓰임에 빗대어 말해야 통한다.
// 보기를 고르거나 몸으로 보여 주는 길은 없다 — 조가 머리를 맞대 「말」을 지어 직접 써야 한다.
// 쓴 말은 버셀의 판정 함수(api/judge.js)가 누가 되어 알아들었는지 가린다.
// 누의 말투에도 구술 문화가 묻어 있다 — 「그리고」로 잇고(① 첨가적), 이름에 늘 수식어가 붙고
// (② 집합적 — 빠른 발 누, 하늘 뱀), 같은 말을 되풀이한다(③ 반복적).
// 적어 둘 곳이 없으니 기억은 오직 되풀이한 노래 속에 남는다 — 기억이 곧 저장 장치.
import { chant } from "./mini.js";
import { audio } from "./audio.js";
import { VILLAGE } from "./world.js";
import * as THREE from "three";

const NU = "빠른 발 누", WE = "나";        // 화면 속 인물은 한 사람 — 조원 넷이 의논하되 말하는 건 「나」

// 게임이 버셀에 있으면 같은 주소로, 파이어베이스나 내 컴퓨터에서 열었으면 버셀 주소로 묻는다
const JUDGE = location.hostname.endsWith(".vercel.app") ? "/api/judge" : "https://retro-app-six.vercel.app/api/judge";

// 두 번, 세 번 막히면 조금씩 길을 보여 준다
const HINTS = {
  intro:    ["누가 겪어 본 적 없는 이름은 통하지 않습니다. 누가 방금 본 것으로 말해 보십시오.",
             "누는 내가 어디에서 나오는 것을 봤을까요?"],
  fireName: ["누는 「불」이라는 이름을 모릅니다. 만지면 어떤지, 곁에 있으면 어떤지, 무엇을 할 수 있는지로 말해 보십시오.",
             "밤에 빨갛게 일렁이고, 가까이 가면 뜨겁고, 고기를 올리면 부드러워지는 것 — 이런 식으로 말해 보십시오."],
  material: ["누는 「나무」라는 묶음 이름을 모릅니다. 만지거나 밟았을 때 어떤지로 말해 보십시오.",
             "마른 막대를 밟으면 어떤 소리가 나나요?"],
  method:   ["마찰·열 같은 말은 통하지 않습니다. 몸으로 겪은 일에 빗대어 보십시오.",
             "추운 날 손이 시리면 두 손을 어떻게 하나요?"],
  ember:    ["산소·공기 같은 말은 통하지 않습니다. 여리고 작은 것을 살살 다룰 때를 떠올려 보십시오.",
             "작고 여린 것에 입김을 불어 준 적이 있나요?"],
  remember: ["이 시대에는 적어 둘 곳이 없습니다. 머릿속에 오래 남기려면 어떻게 할까요?",
             "어릴 때 오래 기억한 것은 긴 설명이었나요, 여러 번 부른 노래였나요?"],
};

// 판정 서버에 닿지 않을 때만 쓰는 간단한 판정 — 수업이 멈추지 않게
const OFFLINE = {
  intro:    { no: /서울|대학|학생|한국|미래|학교|과거|시대/ },
  fireName: { no: /불|번개|벼락|연소|화재/ },
  material: { no: /나무|목재|재료|가연/ },
  method:   { no: /마찰|열|온도|발화/ },
  ember:    { no: /산소|공기|연소/ },
  remember: { yes: /노래|부르|불러|구호|따라|되풀이|반복|외치|외우/ },
  floodMeaning: { yes: /(홍수|물.{0,6}(넘|불어|차|내려|밀려)|범람).*(높|언덕|올라|피|대피)|(높|언덕|올라|피|대피).*(홍수|물.{0,6}(넘|불어|차|내려|밀려)|범람)/ },
};

export async function judge(step, text) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(JUDGE, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, text }), signal: ctl.signal,
    });
    const j = await r.json();
    if (!r.ok || typeof j.understood !== "boolean") throw new Error(j.error || r.status);
    return { ...j, offline: false };
  } catch (e) {
    console.warn("판정 서버에 닿지 않았습니다 — 간단히 판정합니다", e);
    const rule = OFFLINE[step];
    const understood = rule.yes ? rule.yes.test(text) : (!rule.no.test(text) && text.length >= 8);
    return { understood, offline: true,
      reply: understood ? "(눈이 동그래진다) 누가 안다! 누가 안다!" : "(고개를 갸웃한다) …? 누는 모른다." };
  } finally { clearTimeout(timer); }
}

export async function chapter1(G) {
  const { talk, npc, player } = G;
  const nu = npc.nu, elder = npc.elder;
  const S = G.stats;                 // 조의 기록 — 끝나고 현황판으로 간다
  Object.assign(S, { tries: 0, misses: 0, offline: 0, paper: 0, chantTaps: 0, answers: [] });
  const t0 = performance.now();

  /** 조가 직접 쓴 말을 누가 알아들을 때까지 되묻는다. 알아들었으면 몇 번 만에 통했는지 돌려준다. */
  async function untilUnderstood(step, prompt) {
    let fails = 0, last = "";
    for (;;) {
      const hint = fails >= 2 ? HINTS[step][Math.min(fails - 2, 1)] : "";
      const text = await talk.ask(WE, prompt, { prefill: last });
      last = text;
      S.tries++;

      nu.avatar.lookAt(player.pos);
      talk.wait(NU, "(귀를 기울이고 곰곰이 생각한다…)");
      const r = await judge(step, text);
      if (r.offline) S.offline++;
      S.answers.push({ step, text: text.slice(0, 300), ok: r.understood });
      G.log({ kind: "answer", chapter: "1-fire", step, text: text.slice(0, 300), ok: r.understood, offline: r.offline });

      if (r.understood) {
        audio.chime(); nu.avatar.play("joy", 1.3);
        await talk.say(NU, r.reply);
        G.hit(fails ? `통했다 · ${fails + 1}번 만에` : "통했다 · 한 번에", "누가 알아들었습니다 — 다음으로 넘어갑니다");
        return fails + 1;
      }
      fails++; S.misses++;
      audio.huh(); nu.avatar.play("tilt", 1.4);
      await talk.say(NU, r.reply);
      if (step === "remember" && /종이|적어|적자|써|쓰자|글/.test(text)) {
        S.paper++;
        await talk.say("", "(이 시대에는 글자가 없다. 적어 둘 곳도, 읽을 사람도 없다.)");
      }
      G.miss("말이 통하지 않았다", r.offline ? "판정 서버에 닿지 않아 간단히 판정했습니다" : "");
      const next = fails >= 2 ? HINTS[step][Math.min(fails - 2, 1)] : "";
      if (next && next !== hint) await talk.say("", `(실마리) ${next}`);
    }
  }

  /* ── 0. 깨어남 ─────────────────────────────────────── */
  G.objective("덤불 속에서 한 소년이 나를 쳐다보고 있다. 소년에게 다가가 말을 거십시오.");
  G.toast("소년에게 다가가 보십시오", "good", "머리 위 노란 화살표를 따라가면 됩니다");
  await G.interact(nu, "말 걸기");

  /* ── 1. 만남 ───────────────────────────────────────── */
  nu.avatar.play("joy", 1.2);
  await talk.say(NU, "(덤불에서 뛰쳐나와 한 바퀴 빙 돈다)\n반짝이는 돌에서 사람이 나왔다! 그리고 누가 봤다! 그리고 누가 놀랐다!");
  nu.avatar.play("thump", 1.6);
  await talk.say(NU, "(제 가슴을 두드린다) 빠른 발 누! 빠른 발 누는 마을에서 제일 빠르다.");
  G.objective("누에게 나를 소개하십시오. 조원과 의논해 직접 쓰십시오.");
  await untilUnderstood("intro", "누가 나를 빤히 본다. 나를 뭐라고 소개할까?");
  await talk.say(NU, "반짝이는 돌 사람, 와라. 마을로 와라. 할아버지가 아프다. 그리고 엄마도 아프다. 그리고 모두 아프다.");
  talk.close();

  /* ── 2. 마을로 ─────────────────────────────────────── */
  G.objective("누를 따라 마을로 가십시오.");
  nu.avatar.play("point", 1);
  await G.walkTo(nu, G.pathToVillage, 3.6, player);
  await G.until(() => G.near(player, VILLAGE, 7.5));
  nu.avatar.lookAt(elder.pos);
  elder.avatar.play("cough", 2.4);
  await G.wait(0.8);
  G.objective("누에게 마을 사람들을 도울 방법을 알려 주십시오.");
  await G.faceEachOther(nu);
  await talk.say(NU, "(할아버지를 가리킨다) 고기는 딱딱하다. 그리고 차갑다. 그리고 할아버지는 기침한다.");
  await talk.say(NU, "해가 지면 춥다. 그리고 어둡다. 그리고 무섭다. 그리고 또 무섭다.");

  /* ── 3. 불을 뭐라고 부를까 ───────────────────────────── */
  G.objective("누는 「불」을 모릅니다. 누가 알아듣게 말해 주십시오.");
  await untilUnderstood("fireName", "불이 있으면 고기를 익히고 몸을 데울 텐데. 누에게 뭐라고 말할까?");
  await talk.say(NU, "누의 마을은 그걸 「하늘 뱀의 빨간 것」이라고 부른다. 하늘 뱀이 나무를 먹으면 생긴다!");
  await talk.say(WE, "그래. 나도 그걸 「하늘 뱀의 빨간 것」이라고 부를게.");
  await talk.say(NU, "하늘 뱀의 빨간 것을… 반짝이는 돌 사람이 부를 수 있다?");
  await talk.say(WE, "응. 같이 불러 보자. 한 걸음씩 알려 줄게.");

  /* ── 4. 세 걸음 — 무엇으로, 어떻게, 그다음 ────────────── */
  // ① 무엇으로
  G.objective("불 피우는 법 알려 주기 · 1/3 무엇으로");
  await untilUnderstood("material", "먼저 무엇이 필요하다고 할까?");
  talk.close();
  await G.walkTo(nu, [G.besideFire(3.2)], 3.2);
  nu.avatar.lookAt(player.pos);
  await talk.say(NU, "(마른 막대를 한 아름 안고 온다) 이것! 누가 가져왔다!");

  // ② 어떻게
  G.objective("불 피우는 법 알려 주기 · 2/3 어떻게");
  await untilUnderstood("method", "막대로 어떻게 하라고 할까?");
  nu.avatar.play("rub", 2.4); G.fire.setLevel(0.2);
  await talk.say(NU, "(막대를 판에 세우고 손바닥 사이에서 비빈다) 따뜻해진다… 막대도! 하늘 뱀의 숨이 나온다!");

  // ③ 그다음
  G.objective("불 피우는 법 알려 주기 · 3/3 그다음");
  await untilUnderstood("ember", "연기가 나고 작은 빨간 것이 생겼다. 이제 어떻게 하라고 할까?");
  nu.avatar.play("blow", 2); G.fire.setLevel(0.45);
  await talk.say(NU, "(몸을 숙여 살살 분다) 후우… 빨간 것이 커진다!");

  /* ── 5. 잊어버림 — 적을 곳이 없다 ───────────────────── */
  G.fire.setLevel(0);
  await talk.say("", "(바람이 불어 불씨가 꺼졌다. 누가 혼자 다시 해 보려 한다.)");
  nu.avatar.play("forget", 2);
  await talk.say(NU, "딱 소리 막대… 그리고… 그리고…? (머리를 긁적인다) 누는 잊었다.");
  G.objective("누가 순서를 잊지 않게 해 주십시오.");
  await untilUnderstood("remember", "누가 순서를 잊었다. 잊지 않게 하려면 어떻게 할까?");
  talk.close(); G.lock(true);
  const r = await chant(["딱 소리 막대 세우고", "추운 날 손 비비듯", "아기 새 숨결 후우"], 3, 520);
  S.chantTaps = r.taps;
  G.lock(false);
  audio.chime(); nu.avatar.play("joy", 1.3);
  await talk.say(NU, "(신이 나서 혼자 부른다) 딱 소리 막대 세우고! 추운 날 손 비비듯! 아기 새 숨결 후우!\n누가 안다! 누는 안 잊는다!");
  talk.close();

  /* ── 6. 마을의 첫 불 ───────────────────────────────── */
  G.objective("누가 불을 부른다.");
  const pit = G.world.firePit.position;
  G.shot(pit.clone().add(new THREE.Vector3(7.5, 5.2, 9)), pit.clone().add(new THREE.Vector3(0, 1, 0)));   // 마을 전체를 넓게
  await G.walkTo(nu, [G.besideFire(1.6)], 2.4);
  nu.avatar.lookAt(G.world.firePit.position);
  nu.avatar.play("rub", 2.4); G.fire.setLevel(0.25); await G.wait(2.2);
  nu.avatar.play("blow", 1.8); G.fire.setLevel(0.6); await G.wait(1.6);
  G.fire.setLevel(1); audio.fire(true); G.fireLit = true;
  nu.avatar.play("joy", 1.6);
  await G.gather();                                  // 마을 사람들이 불가로 모여든다
  G.shot(null);
  await G.faceEachOther(elder);
  await talk.say("할아버지", "(기침이 멎고, 불에 손을 쬔다) 하늘 뱀의 빨간 것이… 우리 집에 왔다.");
  await talk.say(NU, "빠른 발 누가 불렀다! 그리고 반짝이는 돌 사람이 가르쳤다. 그리고 모두 따뜻하다. 그리고 고기가 부드럽다!");
  await talk.say("", "(그날 밤, 마을 사람들은 불가에 둘러앉아 누의 노래를 따라 불렀다. 적어 둘 데가 없으니, 노래가 곧 기록이었다.)");
  talk.close();

  // 활자는 아직 빛나지 않는다 — 홍수를 지나고 나서(flood.js)

  S.secs = Math.round((performance.now() - t0) / 1000);
  return S;
}
