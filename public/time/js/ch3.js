// 3장 — 찍어 내던 시대. 그리고 박물관으로 돌아오는 끝.
//
// 1517년 가을, 독일의 한 인쇄소. 비텐베르크의 한 교수가 쓴 글을 널리 퍼뜨려야 한다.
// 조판은 거울 글자를 오른쪽부터 짜고, 교정지를 찍어 틀린 글자를 찾는다 — 틀린 채 돌리면 수백 장이 똑같이 틀린다.
// 인쇄기로는 한 장에 몇 초. 2장에서 한 부를 베끼는 데 걸린 시간과 나란히 놓는 것이 아이젠슈타인이다.
// 끝에는 누와 똑같은 얼굴의 해설사가 묻는다 — 금속활자는 고려가 먼저였는데 왜 종교개혁은 거기서 일어나지 않았을까.
import { compose, press } from "./mini.js";
import { audio } from "./audio.js";

const PRINTER = "인쇄소 주인", BOY = "도제 소년", GUIDE = "해설사", WE = "우리";
const LINE = "모든 사람이 읽을 수 있게";
const DECOYS = ["잃", "랍", "계", "묘", "는", "샤", "잇"];      // 뒤집어 놓으면 헷갈리는 활자
const PRESS_SECS = 40;

export async function chapter3(G) {
  const { talk, npc } = G;
  const printer = npc.printer, boy = npc.apprentice;
  const S = { composeSecs: 0, firstTypos: 0, proofs: 0, sheets: 0, pressSecs: PRESS_SECS, secsPerSheet: 0, secs: 0 };
  const t0 = performance.now();

  G.chapter("3장 · 찍어 내던 시대");
  G.missLabel = "틀린 활자";
  G.backdrop("printshop");
  G.objective("어딘가에서 쿵, 쿵 나무 기계 소리가 난다.");
  await talk.say("", "(쇠 글자의 빛이 걷히자 쿵— 쿵— 나무 기계가 내리누르는 소리와 잉크 냄새가 밀려왔다.)");
  await talk.say("", "(1517년 가을, 독일의 한 인쇄소.)");
  talk.close();
  await G.enterPrintshop();
  G.backdrop(null);

  await G.faceEachOther(printer);
  await talk.say(PRINTER, "마침 일손이 왔군! 비텐베르크의 한 교수가 쓴 글이오. 교회 문에 붙인 것을 사람들이 서로 베껴 달라고 난리요.");
  await talk.say(PRINTER, "손으로 베껴서는 한 달에 몇 부나 되겠소? 우리는 찍어 낸다오. 오늘 안에 수백 장.");
  await G.faceEachOther(boy);
  await talk.say(BOY, "(누를 똑 닮은 소년이 활자 상자 앞에서 손을 흔든다) 활자는 제가 알려 드릴게요! 이리 오세요.");
  talk.close();

  /* ── 조판 ─────────────────────────────────────────── */
  G.objective("활자 상자 앞의 도제 소년에게 가십시오.");
  await G.interact(boy, "조판 배우기", 3.2);
  await talk.say(BOY, "활자는 거울처럼 뒤집혀 있어요. 종이에 찍으면 바로 보이거든요.");
  await talk.say(BOY, "그리고 한 줄은 막대 오른쪽 끝부터 끼워요! 첫 글자가 맨 오른쪽이에요.");
  await talk.say(BOY, "비슷하게 생긴 활자가 섞여 있으니 조심하세요. 한 글자만 틀려도 수백 장이 다 틀려요.");
  talk.close();
  G.backdrop("compose");
  G.lock(true);
  const c = await compose(LINE, DECOYS);
  G.lock(false);
  G.backdrop(null);
  Object.assign(S, { composeSecs: c.secs, firstTypos: c.firstTypos, proofs: c.proofs });
  G.log({ kind: "compose", chapter: "3-print", secs: c.secs, firstTypos: c.firstTypos, proofs: c.proofs });
  if (c.firstTypos) G.miss(`처음 교정지에 틀린 활자 ${c.firstTypos}개`, "교정지로 찾아 고쳤다");
  else G.hit("한 번에 바로 짰다");

  await G.faceEachOther(printer);
  await talk.say(PRINTER, c.firstTypos
    ? `처음 찍은 교정지에 틀린 글자가 ${c.firstTypos}개 있었소. 그대로 돌렸으면 수백 장이 모두 똑같이 틀렸을 거요.`
    : "한 글자도 안 틀렸군! 이제 수백 장이 모두 이대로, 한 글자도 다르지 않게 나온다오.");
  await talk.say(PRINTER, "판을 인쇄기에 걸었소. 이제 돌려 봅시다.");
  talk.close();

  /* ── 인쇄 ─────────────────────────────────────────── */
  G.objective("인쇄기 앞의 주인에게 가십시오.");
  await G.interact(printer, "인쇄기 돌리기", 3.4);
  await talk.say(PRINTER, `잉크를 바르고, 종이를 얹고, 레버를 당기시오. ${PRESS_SECS}초 동안 몇 장이나 찍는지 봅시다!`);
  talk.close();
  G.backdrop("printshop");
  G.lock(true);
  const p = await press(PRESS_SECS);
  G.lock(false);
  G.backdrop(null);
  S.sheets = p.sheets;
  S.secsPerSheet = Math.round(PRESS_SECS / Math.max(1, p.sheets) * 10) / 10;
  G.log({ kind: "press", chapter: "3-print", sheets: p.sheets, secs: PRESS_SECS, secsPerSheet: S.secsPerSheet });
  G.toast(`${p.sheets}장을 찍었다`, "good", `한 장에 ${S.secsPerSheet}초`);

  await G.faceEachOther(printer);
  await talk.say(PRINTER, `혼자서 ${PRESS_SECS}초에 ${p.sheets}장이라! 우리 인쇄소엔 이런 인쇄기가 여섯 대 있고, 밤낮으로 돌린다오.`);
  if (G.copyAvg) {
    const n = Math.round(G.copyAvg / Math.max(1, S.secsPerSheet));
    await talk.say("", `(수도원에서 편지 한 부를 베끼는 데 ${Math.floor(G.copyAvg / 60)}분 ${G.copyAvg % 60}초가 걸렸다. 그 시간이면 이 인쇄기로 ${n}장을 찍는다.)`);
  }
  talk.close();

  /* ── 퍼져 나감 ─────────────────────────────────────── */
  G.backdrop("spread");
  G.objective("찍어 낸 글이 퍼져 나간다.");
  await talk.say("", "(몇 주 만에 같은 글이 수천 장 찍혀 수레에 실려 나갔다. 도시마다 교회 문에, 시장에, 술집 벽에 붙었다.)");
  await talk.say("", "(한 글자도 다르지 않은 같은 글을, 멀리 떨어진 도시의 사람들이 같은 무렵에 읽고 따졌다. 훗날 사람들은 이 일을 「종교개혁」이라고 불렀다.)");
  talk.close();
  G.backdrop(null);
  await G.pressGlow();

  S.secs = Math.round((performance.now() - t0) / 1000);
  G.log({ kind: "chapter", chapter: "3-print", ...S });
  return S;
}

/** 끝 — 박물관으로 돌아와 해설사의 질문을 받는다. 조의 생각을 적어 현황판으로 보낸다. */
export async function ending(G) {
  const { talk, npc } = G;
  G.chapter("돌아와서 · 인쇄 박물관");
  G.enterMuseum();
  G.objective("박물관으로 돌아왔다.");
  await talk.say("", "(눈을 뜨니 박물관 진열장 앞이었다. 손끝이 아직 따뜻했다.)");
  await talk.say(GUIDE, "(누와 똑같은 얼굴의 해설사가 웃는다) 괜찮으세요? 인쇄기 앞에서 한참 멍하니 서 계셨어요.");
  await talk.say(GUIDE, "이 금속활자요, 『직지』라는 책을 찍은 활자예요. 1377년 고려에서 만들었으니 구텐베르크보다 70여 년 먼저죠.");
  await talk.say(GUIDE, "그런데 이상하지 않아요? 금속활자는 고려가 먼저였는데, 왜 고려에서는 종교개혁 같은 일이 일어나지 않았을까요?");
  G.objective("해설사의 질문 — 조원과 의논해 조의 생각을 적으십시오.");
  const text = await talk.ask(WE, "조의 생각을 한두 문장으로 적어 보자.", { placeholder: "우리 조는 … 때문이라고 생각한다", button: "해설사에게 말하기" });
  G.log({ kind: "reflect", text: text.slice(0, 300) });
  await talk.say(GUIDE, "그렇게 볼 수도 있겠네요. 기술이 사회를 바꾸는 걸까요, 사회가 기술을 고르는 걸까요? 강의실에서 같이 이야기해 봐요.");
  talk.close();
  npc.guide.avatar.play("nod", 1.2);
  audio.chime();
}
