// 1장 ① 불 — 말만 있던 시대.
//
// 누는 사물을 이름이 아니라 쓰임으로 부른다(옹 ④ 상황 의존적). 그래서 「나무」, 「불」, 「마찰」 같은
// 추상어는 통하지 않고, 겪어 본 일이나 쓰임으로 말하거나 직접 보여 줘야 통한다.
// 누의 말투에도 구술 문화가 묻어 있다 — 「그리고」로 잇고(① 첨가적), 이름에 늘 수식어가 붙고
// (② 집합적 — 빠른 발 누, 하늘 뱀), 같은 말을 되풀이한다(③ 반복적).
// 적어 둘 곳이 없으니 기억은 오직 되풀이한 노래 속에 남는다 — 기억이 곧 저장 장치.
import { rub, blow, chant } from "./mini.js";
import { audio } from "./audio.js";
import { VILLAGE } from "./world.js";
import * as THREE from "three";

const NU = "빠른 발 누", WE = "우리";

export async function chapter1(G) {
  const { talk, npc, player } = G;
  const nu = npc.nu, elder = npc.elder;
  const S = G.stats;                 // 조의 기록 — 끝나고 현황판으로 간다
  Object.assign(S, { abstract: 0, situ: 0, demo: 0, paper: 0, explain: 0,
                     rubStrokes: 0, blowFails: 0, chantTaps: 0 });
  const t0 = performance.now();

  /** 고를 것 가운데 「통하는 것」을 고를 때까지 되묻는다.
   *  opts: [{ t: 보기, kind: "abstract"|"situ"|"demo"|..., then: async () => 통했으면 true }] */
  async function untilUnderstood(prompt, opts) {
    const used = [];
    for (;;) {
      const i = await talk.choose(WE, prompt, opts.map(o => o.t), used);
      const o = opts[i];
      if (o.kind === "abstract") S.abstract++;
      if (o.kind === "situ") S.situ++;
      if (o.kind === "demo") S.demo++;
      const ok = await o.then();
      if (ok) return o.kind;
      if (!used.includes(i)) used.push(i);
    }
  }
  const huh = async (line) => {
    audio.huh(); nu.avatar.play("tilt", 1.4);
    await talk.say(NU, line);
    return false;
  };
  const got = async (line, g = "nod") => {
    audio.chime(); nu.avatar.play(g, 1.3);
    await talk.say(NU, line);
    return true;
  };

  /* ── 0. 깨어남 ─────────────────────────────────────── */
  G.objective("덤불 사이에서 누군가 쳐다보고 있다. 가까이 가 보십시오.");
  await G.interact(nu, "말 걸기");

  /* ── 1. 만남 ───────────────────────────────────────── */
  nu.avatar.play("joy", 1.2);
  await talk.say(NU, "(덤불에서 뛰쳐나와 한 바퀴 빙 돈다)\n반짝이는 돌에서 사람이 나왔다. 그리고 넷이 나왔다. 그리고 누가 봤다!");
  nu.avatar.play("thump", 1.6);
  await talk.say(NU, "(제 가슴을 두드린다) 빠른 발 누! 빠른 발 누는 마을에서 제일 빠르다.");
  await untilUnderstood("누가 우리를 빤히 본다. 우리를 뭐라고 소개할까?", [
    { t: "「안녕, 우리는 서울에서 온 대학생이야.」", kind: "abstract",
      then: () => huh("(고개를 갸웃한다) 서…울? 대…학…? 누는 모른다.") },
    { t: "(누처럼 가슴을 두드리며) 「우리는… 반짝이는 돌에서 온 사람!」", kind: "situ",
      then: () => got("(펄쩍 뛴다) 반짝이는 돌 사람! 반짝이는 돌 사람! 누가 안다!", "joy") },
  ]);
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
  await untilUnderstood("불이 있으면 고기를 익히고 몸을 데울 텐데. 뭐라고 말할까?", [
    { t: "「불을 피우면 돼. 불로 고기를 익히는 거야.」", kind: "abstract",
      then: () => huh("(갸웃) 불…? 불이 뭐다? 누는 모른다.") },
    { t: "「연소 반응을 일으키면 열이 나서 따뜻해져.」", kind: "abstract",
      then: () => huh("(더 크게 갸웃) 연…소…? 반짝이는 돌 사람 말은 어렵다.") },
    { t: "「번개가 나무에 떨어진 날 본 적 있지? 뜨겁고 빨갛게 빛나던 것.」", kind: "situ",
      then: () => got("(눈이 동그래진다) 하늘 뱀이 먹은 나무! 뜨거운 빨간 것! 누가 봤다!\n그리고 무서웠다. 그리고… 따뜻했다!", "joy") },
  ]);
  await talk.say(NU, "하늘 뱀의 빨간 것을… 반짝이는 돌 사람이 부를 수 있다?");
  await talk.say(WE, "응. 같이 불러 보자. 한 걸음씩 알려 줄게.");

  /* ── 4. 세 걸음 — 무엇으로, 어떻게, 그다음 ────────────── */
  // ① 무엇으로
  G.objective("불 피우는 법 알려 주기 · 1/3 무엇으로");
  await untilUnderstood("먼저 무엇이 필요하다고 할까?", [
    { t: "「마른 나무를 구해 와.」", kind: "abstract",
      then: () => huh("(갸웃) 나무…? 그늘 주는 것? 열매 주는 것? 집 기둥? 어느 것이다?") },
    { t: "「밟으면 딱 소리가 나는 마른 막대 있지? 그걸 가져와.」", kind: "situ",
      then: () => got("딱 소리 막대! 겨울에 밟으면 딱! 한다. 누가 안다!") },
    { t: "(말 대신 직접 마른 막대를 주워 와 보여 준다)", kind: "demo",
      then: async () => {
        talk.close();
        G.objective("숲 가장자리에서 마른 막대를 하나 주워 오십시오.");
        await G.pickStick();
        G.objective("막대를 누에게 보여 주십시오.");
        await G.interact(nu, "막대 보여 주기");
        G.objective("불 피우는 법 알려 주기 · 1/3 무엇으로");
        return got("(막대를 받아 들고 깡충 뛴다) 딱 소리 막대! 이것! 누가 안다!", "joy");
      } },
  ]);

  // ② 어떻게
  G.objective("불 피우는 법 알려 주기 · 2/3 어떻게");
  await untilUnderstood("막대로 어떻게 하라고 할까?", [
    { t: "「마찰열로 온도를 발화점까지 올려.」", kind: "abstract",
      then: () => huh("(머리를 감싼다) 마…찰…? 발…화…? 누 머리가 아프다.") },
    { t: "「추운 날 손바닥 비비듯이, 막대를 판에 세우고 빠르게 비벼.」", kind: "situ",
      then: async () => {
        nu.avatar.play("rub", 2.2); G.fire.setLevel(0.2);
        return got("(손바닥을 비벼 본다) 추운 날 손 비비기! 손이 따뜻해진다… 막대도! 하늘 뱀의 숨이 나온다!");
      } },
    { t: "(말 대신 막대를 받아 직접 비벼 보인다)", kind: "demo",
      then: async () => {
        talk.close(); G.lock(true);
        const r = await rub(); S.rubStrokes = r.strokes;
        G.lock(false); G.fire.setLevel(0.25);
        return got("(연기를 보고 펄쩍 뛴다) 하늘 뱀의 숨! 연기다! 누도 한다!", "joy");
      } },
  ]);

  // ③ 그다음
  G.objective("불 피우는 법 알려 주기 · 3/3 그다음");
  await untilUnderstood("연기가 나고 불씨가 생겼다. 이제 어떻게 하라고 할까?", [
    { t: "「산소를 공급해서 불씨를 키워.」", kind: "abstract",
      then: () => huh("(갸웃) 산…소…? 누는 모른다. 누는 그런 것 본 적 없다.") },
    { t: "「둥지에서 떨어진 아기 새한테 하듯, 살살 입김을 불어 줘.」", kind: "situ",
      then: async () => {
        nu.avatar.play("blow", 2); G.fire.setLevel(0.45);
        return got("(몸을 숙여 살살 분다) 아기 새한테 하듯… 후우… 빨간 것이 커진다!");
      } },
    { t: "(말 대신 마른 풀에 불씨를 올리고 직접 불어 보인다)", kind: "demo",
      then: async () => {
        talk.close(); G.lock(true);
        const r = await blow(); S.blowFails = r.fails;
        G.lock(false); G.fire.setLevel(0.5);
        return got("(마른 풀에서 불꽃이 인다) 빨간 것이 커진다! 반짝이는 돌 사람이 불렀다!", "joy");
      } },
  ]);

  /* ── 5. 잊어버림 — 적을 곳이 없다 ───────────────────── */
  G.fire.setLevel(0);
  await talk.say("", "(바람이 불어 불씨가 꺼졌다. 누가 혼자 다시 해 보려 한다.)");
  nu.avatar.play("forget", 2);
  await talk.say(NU, "딱 소리 막대… 그리고… 그리고…? (머리를 긁적인다) 누는 잊었다.");
  G.objective("누가 순서를 잊지 않게 해 주십시오.");
  await untilUnderstood("누가 순서를 잊지 않게 하려면?", [
    { t: "「잊지 않게 종이에 적어 줄게.」", kind: "paper",
      then: async () => {
        S.paper++;
        audio.huh(); nu.avatar.play("tilt", 1.4);
        await talk.say(NU, "(갸웃) 종…이? 적…어?");
        await talk.say("", "(이 시대에는 글자가 없다. 적어 둘 곳도, 읽을 사람도 없다.)");
        return false;
      } },
    { t: "「처음부터 다시 한 번, 자세히 설명해 줄게.」", kind: "explain",
      then: async () => {
        S.explain++;
        await talk.say(WE, "막대를 판에 세우고, 손바닥 사이에 끼워서, 빠르게 비비다가, 연기가 나면 불씨를 풀에 옮기고, 살살…");
        nu.avatar.play("forget", 2);
        await talk.say(NU, "딱 소리 막대… 손바닥… 그리고…? (다시 머리를 긁적인다) 또 잊었다. 말이 길다.");
        return false;
      } },
    { t: "「노래로 만들어서, 같이 여러 번 부르자.」", kind: "repeat",
      then: async () => {
        talk.close(); G.lock(true);
        const r = await chant(["딱 소리 막대 세우고", "추운 날 손 비비듯", "아기 새 숨결 후우"], 3, 520);
        S.chantTaps = r.taps;
        G.lock(false);
        return got("(신이 나서 혼자 부른다) 딱 소리 막대 세우고! 추운 날 손 비비듯! 아기 새 숨결 후우!\n누가 안다! 누는 안 잊는다!", "joy");
      } },
  ]);
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

  // 활자가 다시 빛난다
  G.objective("불 속에서 무언가 반짝인다.");
  G.shot(pit.clone().add(new THREE.Vector3(4.5, 3.2, 6)), pit.clone().add(new THREE.Vector3(0, 2.2, 0)));
  await G.typeGlow();
  G.shot(null);

  S.secs = Math.round((performance.now() - t0) / 1000);
  return S;
}
