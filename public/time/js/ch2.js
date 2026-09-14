// 2장 — 손으로 베끼던 시대.
//
// 숲 속 돌 수도원. 누를 쏙 빼닮은 견습 수도사가 맞고, 수도원장이 편지 한 부를 베껴 옆 수도원에 전해 달라고 한다.
// 조종하는 한 사람이 처음부터 끝까지 따라 쓰고, 숲길에서 후드 쓴 자를 만난다.
// 3주차 온라인 내용으로 세 문제를 내고, 하나라도 틀리면 편지를 빼앗긴다 — 그러면 처음부터 다시 베껴야 한다.
// 다시 베끼는 수고가 곧 이 장의 메시지다. 필사본은 잃으면 그 시간이 통째로 사라진다(아이젠슈타인 — 고정성).
import { trace } from "./mini.js";
import { audio } from "./audio.js";
import { QUIZ } from "./quiz.js";

const ABBOT = "수도원장", MONK = "견습 수도사", HOOD = "후드 쓴 자", GATE = "옆 수도원 문지기";
const LETTER = ["형제들에게 평화를 전하노라", "겨울이 오기 전에", "양피지 스무 장을 보내 주오"];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => `${Math.floor(s / 60)}분 ${s % 60}초`;

export async function chapter2(G) {
  const { talk, npc } = G;
  const hood = npc.villain, abbot = npc.abbot, monk = npc.monk, keeper = npc.gatekeeper;
  const S = { copies: 0, copySecs: [], quizTries: 0, wrong: [], secs: 0 };
  const t0 = performance.now();

  G.chapter("2장 · 손으로 베끼던 시대");
  G.missLabel = "빼앗긴 편지";
  await G.enterMedieval();
  G.atAbbey();
  G.objective("숲 속 수도원. 견습 수도사와 수도원장의 부탁을 들으십시오.");
  await talk.say("", "(활자의 빛이 걷히자 숲 한가운데 돌로 지은 수도원이 보였다. 종탑에서 종이 한 번 울렸다.)");
  await G.faceEachOther(monk);
  await talk.say(MONK, "(누를 쏙 빼닮은 견습 수도사가 문간에서 손을 흔든다) 오셨군요! 원장님이 한참 기다리셨어요.");
  await G.faceEachOther(abbot);
  await talk.say(ABBOT, "잘 왔다, 낯선 이여. 부탁이 하나 있다.");
  G.backdrop("abbot_letter");
  await talk.say(ABBOT, "옆 수도원에 이 편지가 닿아야 한다. 겨울을 나려면 양피지가 스무 장은 필요하거든.");
  await talk.say(ABBOT, "하지만 원본은 도서실에 남겨 두어야 한다. 네 손으로 한 부 베껴서 가져가거라. 글자가 흐트러지면 저쪽에서 읽지 못한다.");
  G.backdrop("scriptorium");
  await talk.say(MONK, "필사실은 이쪽이에요. 촛불이 다 타기 전에 부지런히 쓰셔야 해요.");
  await talk.say("", "(조종하는 한 사람이 처음부터 끝까지 따라 쓰십시오. 나머지 조원은 옆에서 틀린 곳을 짚어 주십시오.)");
  talk.close();

  for (let attempt = 1; ; attempt++) {
    /* ── 베끼기 ─────────────────────────────────────── */
    G.backdrop("scriptorium");
    G.objective(attempt === 1 ? "편지를 한 부 베끼십시오." : `편지를 처음부터 다시 베끼십시오 · ${attempt}번째`);
    G.lock(true);
    const c = await trace(LETTER, { title: attempt === 1 ? "편지 베끼기" : `편지 다시 베끼기 · ${attempt}번째` });
    G.lock(false);
    G.backdrop(null);
    S.copies++; S.copySecs.push(c.secs);
    G.log({ kind: "copy", chapter: "2-copy", n: attempt, secs: c.secs, acc: c.acc, redoLines: c.redoLines });
    G.toast(`한 부를 베꼈다 · ${mmss(c.secs)}`, "good", `다시 쓴 줄 ${c.redoLines}번`);

    /* ── 숲길 ───────────────────────────────────────── */
    G.placeForest();
    await G.faceEachOther(abbot);
    await talk.say(ABBOT, attempt === 1
      ? "숲길을 따라 곧장 가면 옆 수도원 문이 나온다. 요즘 숲에 수상한 자가 드나든다니 조심하거라."
      : `이번엔 빼앗기지 말거라. 그 한 부를 쓰는 데 ${mmss(c.secs)}이 들었다.`);
    talk.close();
    G.player.avatar.root.rotation.y = Math.PI;
    G.objective("편지를 품고 숲길을 따라 옆 수도원으로 가십시오.");
    await G.until(() => G.near(G.player, hood.pos, 11));

    // 나무 사이에 서 있다가, 우리를 보자 주먹을 휘두르며 길을 막는다
    G.faceTo(hood, G.player.pos);
    hood.avatar.glb?.action("punch");
    audio.huh();
    await talk.say(HOOD, "(주먹을 휘두르며 길을 막는다) 거기 서라! 품에 든 그 편지, 내놔라!");
    talk.close();
    G.objective("후드 쓴 자가 길을 막았다. 다가가 말을 거십시오.");
    await G.interact(hood, "대화하기", 3.6);
    hood.avatar.glb?.action(null);
    G.faceTo(hood, G.player.pos);
    G.closeUp(hood);

    /* ── 세 문제 ─────────────────────────────────────── */
    await talk.say(HOOD, "…그 편지를 지나가게 할지는, 네가 무엇을 아는지에 달렸다.");
    await talk.say(HOOD, "문제는 셋. 넷이 머리를 맞대도 좋다. 하나라도 틀리면 그 편지는 내 것이다.");
    G.objective("후드 쓴 자의 문제 — 조원과 의논해 고르십시오.");
    S.quizTries++;
    const picks = [];
    for (const [i, q] of shuffle(QUIZ.slice()).slice(0, 3).entries()) {
      const order = shuffle(q.opts.map((_, k) => k));
      const j = await talk.choose(HOOD, `${i + 1} / 3 — ${q.q}`, order.map(k => q.opts[k]));
      picks.push({ q, pick: order[j], ok: order[j] === q.a });
      if (i < 2) await talk.say(HOOD, "(후드 속 눈이 가늘어진다) …다음.");
    }
    const wrong = picks.filter(p => !p.ok);
    G.log({ kind: "quiz", chapter: "2-copy", attempt: S.quizTries,
            qs: picks.map(p => p.q.id), picks: picks.map(p => p.pick), ok: picks.map(p => p.ok), pass: !wrong.length });
    await talk.say(HOOD, `맞힌 것은 ${3 - wrong.length} / 3.\n`
      + picks.map((p, i) => `${p.ok ? "○" : "✕"} ${i + 1}번 — 정답 「${p.q.opts[p.q.a]}」`).join("\n"));

    if (!wrong.length) break;

    /* ── 빼앗김 — 수도원으로 돌아가 처음부터 ───────────── */
    S.wrong.push(...wrong.map(p => p.q.id));
    hood.avatar.glb?.once("punch");
    audio.huh();
    G.miss("편지를 빼앗겼다", "한 부뿐인 필사본이었다");
    await talk.say(HOOD, "(편지를 낚아채 품에 넣는다) 모르는 자에게는 편지도 필요 없지.");
    talk.close();
    G.closeUp(null);
    await talk.say("", "(편지는 한 부뿐이었다. 수도원으로 돌아가는 수밖에 없다.)");
    talk.close();
    G.backToAbbey();
    await G.faceEachOther(monk);
    await talk.say(MONK, "(돌아온 나를 보고 눈이 동그래진다) 편지를… 빼앗기셨어요? 원본은 여기 있으니, 처음부터 다시 베끼는 수밖에 없어요.");
    talk.close();
  }

  /* ── 통과 ─────────────────────────────────────────── */
  audio.chime();
  G.hit("세 문제를 모두 맞혔다");
  await talk.say(HOOD, "(후드를 조금 들어 올린다) …아는 자로군. 지나가라. 그 편지가 제대로 닿기를.");
  talk.close();
  G.closeUp(null);
  G.walkTo(hood, [hood.pos.clone().add(G.aside)], 2.2);
  G.showGate();
  G.objective("길 끝 옆 수도원 문지기에게 편지를 전하십시오.");
  await G.interact(keeper, "편지 전하기", 3.2);
  audio.chime();
  await talk.say(GATE, "먼 길 오셨소. 이 편지 한 부를 베끼는 데 꽤 걸렸겠구려.");
  await talk.say(GATE, "…우리도 답장을 베껴 보내려면 한참이겠군. 한 번 쓰면 여러 장이 나오는 방법이 있으면 좋으련만.");
  await talk.say("", "(편지를 건네는 순간, 문고리에 박힌 쇠 글자 하나가 빛나기 시작했다.)");
  talk.close();
  await G.gateGlow();

  S.secs = Math.round((performance.now() - t0) / 1000);
  G.log({ kind: "chapter", chapter: "2-copy", ...S });
  return S;
}
