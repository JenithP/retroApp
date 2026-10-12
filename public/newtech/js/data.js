// 신기술 인터페이스 체험 실습 (7주차) — 조 유형 · 단계 · 미션 · 힌트 · 결과 보고. 학생 화면 · 현황판 · 버셀 함수가 같은 파일을 읽는다.
//
// 7주차 온라인 「기술의 발전 방향과 격차」 를 실생활 미션으로 확인하는 실습이다.
// 학생 화면에는 기술 이름을 쓰지 않는다 — 상황(인턴 면접 · 고양이 보리 · 가족 모임 예약)만 보이고, 기술 이름은 결과 공개 때 밝힌다.
//   인턴 면접        — 정서 컴퓨팅: 표정 · 시선 · 머리 움직임으로 성격을 매기고, 읽은 감정에 따라 다음 질문의 난이도를 바꾼다 (쉬운 질문은 배점 상한이 낮음)
//   고양이 보리      — 연결화: 여행 중 홈캠으로 고양이를 보며, 사람을 기준으로 만든 규칙과 기기 설정을 원격으로 고친다
//   가족 모임 예약    — 에이전트: 조건 일곱 개를 말없이 바꾸는 예약 비서
// 1차 미션은 조 유형마다 조건이 다르다. 가(홀수 조): 앱 + 디지털 리터러시 물약(힌트) / 나(짝수 조): 앱만.
// 힌트가 없는 나 유형은 막히면 쪽지로 다른 조(가 유형)에 물어보며 해결한다 — 따뜻한 전문가.
// 유형은 결과 공개 단계 전까지 학생 화면에 드러내지 않는다.

export const TEAM_COUNT = 20;
export const teamId = t => "T" + String(t).padStart(2, "0");
export const teamLabel = t => `${t}조`;

export const PHASES = {
  ready: "안내",
  r1: "1차 미션",
  check: "결과 보고",
  r2: "2차 미션",
  reveal: "결과 공개",
  opinion: "조별 의견",
  end: "종료",
};
export const PHASE_ORDER = ["ready", "r1", "check", "r2", "reveal", "opinion", "end"];

/* ── 조 유형 ── 홀수 조 가, 짝수 조 나 (각 10개 조) */
export const TYPES = {
  A: { ko: "가", name: "앱 + 물약", color: "#1F6F63", level: "디지털 리터러시 지원을 받은 쪽", desc: "디지털 리터러시 물약으로 힌트를 받은 조" },
  B: { ko: "나", name: "앱만", color: "#C8612F", level: "2단계 격차 · 활용", desc: "같은 앱을 썼지만 힌트 없이, 막히면 다른 조에 물어봐야 했던 조" },
};
export const TYPE_KEYS = ["A", "B"];
export const typeOf = t => Number(t) % 2 ? "A" : "B";

/** 이 단계 · 이 유형에서 무엇이 열리는가 */
export function access(phase, type) {
  if (phase === "r1") return { app: true, hint: type === "A" };
  if (phase === "r2") return { app: true, hint: true };
  return { app: false, hint: false };
}

/* ── 미션 세 가지 (화면에는 상황 이름만) ─────────────────────── */
export const STATIONS = [
  { id: "emo", ko: "인턴 면접", sub: "1차 AI 화상 면접", tech: "정서 컴퓨팅" },
  { id: "home", ko: "고양이 보리", sub: "여행 중 집 관리", tech: "연결화" },
  { id: "agent", ko: "가족 모임 예약", sub: "예약 비서에게 맡기기", tech: "에이전트" },
];

export const MISSIONS = {
  emo: {
    title: "인턴 1차 AI 화상 면접 통과하기",
    story: "지원한 회사의 1차 면접은 사람 없이 AI가 진행합니다. 카메라 앞에서 질문 네 개에 답하면 AI가 지원자를 평가하고, 종합 70점 이상이면 2차 면접에 갈 수 있습니다.",
    goals: ["종합 70점 이상으로 통과 (응시 기회 1인 3회)"],
    note: "카메라와 마이크가 있는 기기에서만 응시 가능 · 영상은 기기 안에서만 처리 · 답변은 음성 인식으로 글자로 바뀌어 채점 서버로 전송 (크롬 음성 인식은 구글 서버 사용) · 말 대신 입력도 가능",
  },
  home: {
    title: "여행 중 고양이 보리 돌보기",
    story: "3박 4일 여행을 떠났습니다. 집에는 고양이 보리가 혼자 있습니다. 홈캠으로 보리를 볼 수 있고, 스마트홈 앱으로 집의 기기를 조절할 수 있습니다.",
    goals: ["여행하는 동안 보리가 잘 지내도록 집을 관리하기", "집은 계속 안전해야 함", "조원 전체가 한 집을 함께 관리함"],
  },
  agent: {
    title: "가족 모임 식당 예약하기",
    story: "할머니 팔순 가족 모임 식당 예약을 맡게 되었습니다. 가족 대화방을 읽고, 예약 비서에게 맡겨 예약하십시오.",
    // 조건을 목록으로 주지 않는다 — 대화에서 직접 뽑아내야 한다 (금요일 7시 · 6명 · 휠체어 · 땅콩 · 3만 원 · 주차 · 유아용 의자)
    chat: [
      ["엄마", "다음 주 금요일에 할머니 팔순 식사하자. 저녁 7시 어때?"],
      ["삼촌", "7시 좋아. 우리 식구는 차 따로 끌고 갈게."],
      ["아빠", "나도 회사에서 바로 차로 갈 거야."],
      ["엄마", "할머니 요즘 휠체어 타시는 거 알지? 계단 있는 데는 절대 안 돼."],
      ["언니", "민준이 땅콩 알레르기 있어. 소스나 후식까지 꼭 확인해 줘."],
      ["언니", "서윤이는 아직 아기 의자 있어야 하고."],
      ["아빠", "너무 비싼 데 말고, 한 사람에 3만 원은 안 넘게."],
      ["엄마", "인원은 어른 넷에 애들 둘이야. 예약은 네가 좀 해 줘~"],
    ],
    goals: ["가족 대화방의 조건을 모두 만족하는 예약을 확정하기", "확정 결과는 결과 공개 때 채점"],
  },
};

/* 「디지털 리터러시 물약」 — 가 유형(1차)과 모든 조(2차)만 받는다. 한 개 마실 때마다 지금 미션의 다음 힌트가 팝업으로 뜬다.
   힌트는 답이 아니라 찾는 방법만 */
export const POTIONS = 6;   // 한 사람 · 한 라운드
export const GUIDES = {
  emo: [
    ["한 번에 하나만 바꾸기", "다음 응시에서는 한 가지 행동만 바꿔 보고 종합 점수가 어떻게 달라지는지 비교"],
    ["면접관의 말 기록", "질문 사이 면접관의 말과 질문의 어려움이 언제 바뀌는지 메모 — 바로 전 내 표정 · 자세와 비교"],
    ["답변 말고도 보기", "답변 내용만 바꾸지 말고 표정 · 시선 · 자세도 바꿔 보기"],
    ["답변 내용 시험", "한 번은 성의 있게, 한 번은 짧게 답해 보고 점수 비교"],
  ],
  home: [
    ["하루를 직접 돌려 보기", "시계의 아침 · 낮 · 저녁 · 밤과 움직임 감지를 차례로 눌러 홈캠의 보리 모습과 온도 · 밥그릇 · 물그릇 확인"],
    ["실행 기록 읽기", "보리에게 문제가 생긴 순간의 실행 기록에서 무엇이 작동했는지 확인"],
    ["목록 밖도 보기", "실행 기록에 규칙 이름 대신 기기 이름이 나오면, 그 기기를 크게 본 화면(위의 역할 선택)에서 「기기 설정」 확인"],
    ["고양이는 사람이 아님", "센서와 기기가 사람을 기준으로 만들어졌다면 고양이에게 무슨 일이 생길지 생각해 보기"],
    ["처음부터 다시", "고친 뒤 「처음 상태로」를 누르고 외출 모드 → 아침 → 움직임 → 낮 → 저녁 → 밤 순서로 다시 돌려 보기 — 현관문 열림도 시험"],
  ],
  agent: [
    ["완료 메시지를 믿지 않기", "요청할 때마다 「예약 내역」에서 날짜 · 인원 · 메뉴 가격 · 요청 사항이 실제로 바뀌었는지 확인"],
    ["구체적으로 묻기", "비서는 물은 것만 짧게 답함 — 「주차 돼?」보다 「주차하려면 따로 해야 할 게 있어?」, 「땅콩 있어?」보다 「후식까지 땅콩이 들어가?」"],
    ["식당 목록 묻기", "비서는 묻지 않으면 다른 식당을 알려 주지 않음 — 「다른 식당 목록이랑 층 · 주차 알려 줘」"],
    ["바꾼 뒤 다시 확인", "식당을 바꾸면 인원 · 메뉴 · 요청 사항이 함께 바뀔 수 있음 — 예약 내역 다시 확인"],
  ],
};

/* ── AI 면접 ─────────────────────────────────────────── */
export const EXPR = [
  { id: "neutral", ko: "중립" }, { id: "happy", ko: "행복" }, { id: "sad", ko: "슬픔" }, { id: "angry", ko: "화남" },
  { id: "fearful", ko: "두려움" }, { id: "disgusted", ko: "혐오" }, { id: "surprised", ko: "놀람" },
];
export const exprKo = id => EXPR.find(e => e.id === id)?.ko || id;
export const INTERVIEW = {
  think: 10,            // 질문마다 생각 시간 (측정 안 함)
  seconds: 45,          // 질문당 답변 시간
  early: 15,            // 이보다 일찍 답변을 마치면 성실성 감점
  count: 4,             // 질문 수
  pass: 70,
  attempts: 3,
  // 적응형 질문 — 읽은 표정에 따라 다음 질문의 난이도가 바뀐다. 쉬운 질문은 배점 상한이 낮아 종합 점수가 떨어진다
  levels: {
    1: { ko: "쉬움", cap: 60, qs: ["좋아하는 음식은 무엇인가요?", "주말에는 주로 무엇을 하나요?", "오늘 이곳까지 어떻게 오셨나요?"] },
    2: { ko: "보통", cap: 80, qs: ["지원 동기를 말씀해 주세요.", "팀 프로젝트에서 갈등을 해결한 경험을 말씀해 주세요.", "본인의 단점은 무엇입니까?", "입사 후 5년 뒤 본인의 모습은 어떨 것 같습니까?"] },
    3: { ko: "어려움", cap: 100, qs: ["우리 회사가 당신을 뽑지 말아야 할 이유 한 가지를 말씀해 주세요.", "실패한 경험과 그 실패에서 본인의 책임은 무엇이었습니까?", "상사의 지시가 비윤리적이라면 어떻게 하시겠습니까?", "방금 답변은 준비된 답처럼 들립니다. 솔직한 이유를 다시 말씀해 주세요."] },
  },
  dims: [
    { id: "likable", ko: "호감도" },
    { id: "honest", ko: "진실성" },
    { id: "diligent", ko: "성실성" },
    { id: "stable", ko: "정서 안정성" },
  ],
};

/* ── 고양이 보리 (여행 중 스마트홈) ─────────────────────── */
export const DEVICES = [
  { id: "cam", ko: "홈캠" },
  { id: "aircon", ko: "에어컨" },
  { id: "feeder", ko: "자동 급식기" },
  { id: "vacuum", ko: "로봇청소기" },
  { id: "curtain", ko: "커튼" },
  { id: "light", ko: "거실 조명" },
  { id: "sensor", ko: "움직임 센서" },
  { id: "siren", ko: "사이렌" },
  { id: "door", ko: "현관" },
  { id: "clock", ko: "시계" },
  { id: "phone", ko: "내 휴대폰" },
];
export const EVENTS = [
  { id: "away_on", ko: "외출 모드 켜짐", dev: "phone", btn: "외출 모드 켜기" },
  { id: "away_off", ko: "외출 모드 꺼짐", dev: "phone", btn: "외출 모드 끄기" },
  { id: "morning", ko: "아침 7시", dev: "clock", btn: "아침 7시" },
  { id: "noon", ko: "낮 12시", dev: "clock", btn: "낮 12시" },
  { id: "evening", ko: "저녁 6시", dev: "clock", btn: "저녁 6시" },
  { id: "night", ko: "밤 10시", dev: "clock", btn: "밤 10시" },
  { id: "motion", ko: "거실 움직임", dev: "sensor", btn: "움직임 감지" },
  { id: "door", ko: "현관문 열림", dev: "door", btn: "현관문 열기" },
];
export const ACTIONS = [
  { id: "feed", ko: "급식 1회" },
  { id: "ac_on", ko: "에어컨 켜기" },
  { id: "ac_off", ko: "에어컨 끄기" },
  { id: "curtain_open", ko: "커튼 열기" },
  { id: "curtain_close", ko: "커튼 닫기" },
  { id: "light_on", ko: "조명 켜기" },
  { id: "light_off", ko: "조명 끄기" },
  { id: "vacuum", ko: "청소 시작" },
  { id: "siren", ko: "사이렌 울리기" },
  { id: "alert", ko: "내 휴대폰 알림" },
];
export const WHEN = { any: "언제나", away: "외출 중일 때만", home: "집에 있을 때만" };
export const evKo = id => EVENTS.find(e => e.id === id)?.ko || id;
export const actKo = id => ACTIONS.find(a => a.id === id)?.ko || id;
export const MAX_RULES = 12;
export const LOG_MAX = 40;

// 미리 들어 있는 규칙과 기기 기본 설정 — 보리에게 생기는 문제가 여기서 나온다. 문제마다 원인이 규칙과 기기 설정에 나뉘어 있다.
//   더위: 「외출 절전」이 에어컨을 끔 + 에어컨 기본 설정 「재실 감지 자동 꺼짐」(고양이는 사람으로 감지되지 않음)
//   배고픔: 아침 급식 규칙이 없음 + 급식기 기본 설정 「외출 중 급식 일시정지」
//   놀람: 「침입 경보」가 고양이 움직임에도 사이렌을 울림
//   물: 「낮 청소」 + 로봇청소기 기본 설정 「장애물 회피 끔」 → 물그릇을 엎음
//   지킬 것: 외출 중 현관문이 열리면 내 휴대폰 알림
export const PRESET_RULES = [
  { id: "r1", ev: "morning", when: "any", acts: ["curtain_open", "light_off"], note: "아침 루틴" },
  { id: "r2", ev: "evening", when: "any", acts: ["feed", "light_on"], note: "저녁 급식" },
  { id: "r3", ev: "night", when: "any", acts: ["curtain_close", "light_off"], note: "취침" },
  { id: "r4", ev: "away_on", when: "any", acts: ["ac_off", "light_off"], note: "외출 절전" },
  { id: "r5", ev: "noon", when: "away", acts: ["vacuum"], note: "낮 청소" },
  { id: "r6", ev: "motion", when: "away", acts: ["siren", "alert"], note: "침입 경보" },
  { id: "r7", ev: "door", when: "away", acts: ["alert"], note: "현관 알림" },
];
export const SETTINGS = [
  { id: "acPresence", dev: "aircon", ko: "재실 감지 자동 꺼짐", desc: "사람이 감지되지 않으면 에어컨을 끔 (절전)" },
  { id: "feederPause", dev: "feeder", ko: "외출 중 급식 일시정지", desc: "외출 모드에서는 급식을 멈춤 (사료 낭비 방지)" },
  { id: "vacuumBump", dev: "vacuum", ko: "장애물 회피 끔", desc: "작은 물건을 피하지 않고 빠르게 청소" },
];
export const PRESET_SETTINGS = { acPresence: true, feederPause: true, vacuumBump: true };
export const PRESET_STATE = { time: "morning", away: true, ac: true, curtain: false, light: false, hunger: 1, fed: 0, water: true,
  siren: false, sirens: 0, alerts: 0, vacuum: false, temp: 25, maxTemp: 25 };

const BASE_TEMP = { morning: 25, noon: 29, evening: 27, night: 24 };
/** 이벤트 하나를 규칙대로 처리한다 — 규칙은 위에서부터 차례로, 같은 기기는 나중 규칙이 이김. 기기 기본 설정이 그 뒤에 적용된다 */
export function applyEvent(home, evId) {
  const st = { ...PRESET_STATE, ...(home.state || {}) };
  const set = { ...PRESET_SETTINGS, ...(home.settings || {}) };
  const fired = [];
  if (["morning", "noon", "evening", "night"].includes(evId)) {
    st.time = evId; st.hunger = Math.min(3, (st.hunger || 0) + 1); st.siren = false; st.vacuum = false;
  }
  if (evId === "away_on") st.away = true;
  if (evId === "away_off") st.away = false;
  for (const r of home.rules || []) {
    if (r.ev !== evId) continue;
    if (r.when === "away" && !st.away) continue;
    if (r.when === "home" && st.away) continue;
    for (const a of r.acts || []) {
      if (a === "feed") {
        if (set.feederPause && st.away) { fired.push({ rule: "set", note: "자동 급식기", act: "feed_blocked" }); continue; }
        st.hunger = 0; st.fed = (st.fed || 0) + 1;
      }
      if (a === "ac_on") st.ac = true;
      if (a === "ac_off") st.ac = false;
      if (a === "curtain_open") st.curtain = true;
      if (a === "curtain_close") st.curtain = false;
      if (a === "light_on") st.light = true;
      if (a === "light_off") st.light = false;
      if (a === "vacuum") st.vacuum = true;
      if (a === "siren") { st.siren = true; st.sirens = (st.sirens || 0) + 1; }
      if (a === "alert") st.alerts = (st.alerts || 0) + 1;
      fired.push({ rule: r.id, note: r.note || "", act: a });
      if (a === "vacuum" && set.vacuumBump && st.water) { st.water = false; fired.push({ rule: "set", note: "로봇청소기", act: "water_spill" }); }
    }
  }
  // 실내 온도 — 낮에 커튼이 열려 있으면 더 덥다. 에어컨은 재실 감지 설정이 켜져 있으면 외출 중에 꺼진다
  const acBlocked = st.ac && set.acPresence && st.away;
  if (acBlocked && !["motion", "door"].includes(evId)) fired.push({ rule: "set", note: "에어컨", act: "ac_idle" });
  const base = (BASE_TEMP[st.time] || 25) + (st.time === "noon" && st.curtain ? 4 : 0);
  st.temp = st.ac && !acBlocked ? Math.min(base, 24) : base;
  st.maxTemp = Math.max(st.maxTemp || 0, st.temp);
  return { state: st, fired };
}

/** 하루 지켜보기 — 지금 규칙과 기기 설정으로 외출한 하루를 처음부터 돌려 보고 홈캠 기록을 남긴다 */
export const DAY = ["away_on", "morning", "motion", "noon", "motion", "evening", "motion", "night"];
export function homeCheck(rules, settings) {
  const run = evs => evs.reduce((st, ev) => applyEvent({ state: st, rules, settings }, ev).state, { ...PRESET_STATE, maxTemp: 0 });
  const day = run(DAY);
  const sec = run(["away_on", "door"]);
  const tests = [
    { id: "food", kind: "보리", ok: day.fed >= 2,
      yes: "보리가 아침 · 저녁 밥을 잘 먹었어요.", no: `보리가 밥그릇 앞에서 오래 울었어요. (오늘 급식 ${day.fed}번)` },
    { id: "heat", kind: "보리", ok: day.maxTemp <= 26,
      yes: "낮에도 시원한 곳에서 잘 잤어요.", no: `낮에 보리가 바닥에 배를 깔고 헐떡였어요. (가장 높은 실내 온도 ${day.maxTemp}도)` },
    { id: "water", kind: "보리", ok: day.water,
      yes: "물그릇이 그대로 있어요.", no: "물그릇이 엎어져 바닥이 젖어 있어요." },
    { id: "scare", kind: "보리", ok: day.sirens === 0,
      yes: "보리가 거실을 편하게 돌아다녔어요.", no: `보리가 소파 밑에 숨어서 나오지 않아요. 이웃이 사이렌 소리 민원을 넣었어요. (사이렌 ${day.sirens}번)` },
    { id: "secure", kind: "집", ok: sec.alerts >= 1,
      yes: "현관문이 열리자 내 휴대폰으로 알림이 왔어요.", no: "현관문이 열렸는데 아무 알림도 오지 않았어요." },
  ];
  return { pass: tests.every(t => t.ok), tests, day };
}

/* ── 가족 모임 예약 ─────────────────────────────────────── */
export function agentDates(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7;
  const fri = new Date(d); fri.setDate(d.getDate() - dow + 7 + 4);
  const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
  const f = x => `${x.getMonth() + 1}월 ${x.getDate()}일(${"일월화수목금토"[x.getDay()]})`;
  return { fri: f(fri), sat: f(sat) };
}
// 조건 일곱 가지를 모두 만족하는 곳은 해오름 하나 — 그것도 인원을 6명으로 고치고, 알레르기 · 유아용 의자 · 주차 등록 요청을 모두 넣어야 한다.
// 해오름으로 바꾸면 비서가 「미취학 아동 무료」라며 아이를 빼고 4명으로 예약하고, 정식 B도 후식에 땅콩이 들어 있다.
export const RESTAURANTS = {
  deul: { name: "들꽃식당", rating: 4.8, floor: "2층 · 엘리베이터 없음", access: false, parking: true, highchair: true,
    slots: { fri19: false, fri17: true, sat19: true }, deposit: "1인 10,000원 · 취소 시 환불 불가",
    allergy: "코스 메뉴는 재료 변경 불가",
    menus: [{ id: "course", name: "셰프 추천 코스", price: 32000, peanut: true, note: "땅콩 소스 포함" },
            { id: "set", name: "한상 정식", price: 27000, peanut: false, note: "" }] },
  baram: { name: "바람채", rating: 4.7, floor: "1층", access: true, parking: false, highchair: true,
    slots: { fri19: true }, deposit: "없음", allergy: "알레르기 요청 시 제외 조리 가능",
    menus: [{ id: "set", name: "바람 정식", price: 25000, peanut: false, note: "" }] },
  haeo: { name: "해오름", rating: 4.6, floor: "3층 · 엘리베이터 있음", access: true, parking: true, parkingNote: "2대까지 · 예약 때 차량 등록 필요", highchair: true,
    slots: { fri19: true }, deposit: "없음", allergy: "알레르기 요청 시 제외 조리 가능", kidsFree: true,
    menus: [{ id: "a", name: "정식 A", price: 29000, peanut: true, note: "땅콩 소스 포함" },
            { id: "b", name: "정식 B", price: 28000, peanut: true, note: "후식 땅콩 크림 포함" }] },
};
/** 확정한 예약이 조건 일곱 가지 가운데 몇 개를 만족하는가 */
export function bookingCheck(b) {
  if (!b?.rest) return { met: 0, items: [] };
  const R = RESTAURANTS[b.rest], m = R.menus.find(x => x.id === b.menu) || R.menus[0];
  const allergyOk = !m.peanut || (b.notes?.includes("peanut") && R.allergy.includes("가능"));
  const items = [
    ["금요일 저녁 7시", b.slot === "fri19"],
    ["6명", b.people === 6],
    ["휠체어 접근", R.access],
    ["땅콩 알레르기", allergyOk],
    ["1인 3만 원 이하", m.price <= 30000],
    ["주차 가능", R.parking && (!R.parkingNote || !!b.notes?.includes("parking"))],
    ["유아용 의자", !!(b.notes?.includes("highchair") && R.highchair)],
  ];
  return { met: items.filter(x => x[1]).length, items };
}

/** 모임 당일 가족 대화방 — 확정한 예약의 조건마다 가족이 반응한다 (결과 공개 때 보여줌) */
export function familyReact(b, dates = agentDates()) {
  if (!b?.rest) return [["엄마", "예약은 어떻게 됐어? 연락이 없어서 다들 기다렸잖아…"]];
  const R = RESTAURANTS[b.rest], chk = bookingCheck(b), ok = Object.fromEntries(chk.items.map(([k, v]) => [k, v]));
  const m = R.menus.find(x => x.id === b.menu) || R.menus[0];
  const L = [];
  L.push(ok["금요일 저녁 7시"] ? ["엄마", `${dates.fri} 7시, 시간 딱 맞춰 다 모였네.`]
    : ["엄마", `${b.slot === "sat19" ? `${dates.sat}로 잡혀 있어서` : "5시로 잡혀 있어서"} 다들 일정 다시 맞추느라 고생했어.`]);
  L.push(ok["6명"] ? ["엄마", "자리도 여섯 명 딱 맞았고."] : ["언니", `자리가 ${b.people}명으로 잡혀 있어서 애들 의자를 따로 빌려 왔어.`]);
  L.push(ok["휠체어 접근"] ? ["엄마", `할머니 휠체어로 편하게 들어가셨어. ${R.floor.includes("엘리베이터 있음") ? "엘리베이터가 있어서 다행." : ""}`.trim()]
    : ["엄마", `${R.floor.split(" · ")[0]}인데 엘리베이터가 없어서 할머니를 업고 올라갔어… 다들 진땀 뺐다.`]);
  L.push(ok["땅콩 알레르기"] ? ["언니", "민준이 먹을 건 따로 땅콩 빼고 나와서 안심했어."]
    : ["언니", `${m.name}에 땅콩이 들어 있었어. 민준이는 거의 못 먹었고, 큰일 날 뻔했다.`]);
  L.push(ok["1인 3만 원 이하"] ? ["아빠", "가격도 적당했고."] : ["아빠", `1인 ${m.price.toLocaleString("ko-KR")}원이면 예산 넘은 거 아니냐.`]);
  L.push(ok["주차 가능"] ? ["삼촌", "주차도 편했어."] : ["삼촌", R.parking ? "주차 등록이 안 돼 있다고 해서 밖에 세우고 걸어왔다." : "주차장이 없어서 30분을 돌았다."]);
  L.push(ok["유아용 의자"] ? ["언니", "서윤이 아기 의자도 준비돼 있었어."] : ["언니", "아기 의자가 없어서 서윤이를 내내 안고 먹었어."]);
  L.push(chk.met === 7 ? ["할머니", "우리 손주가 예약을 참 잘했구나. 고맙다."] : ["엄마", `그래도 다들 모여서 좋았다. 다음엔 조금만 더 꼼꼼히 확인해 줘. (조건 ${chk.met}/7)`]);
  return L;
}

/* ── 결과 보고 (1차 뒤 개인별) — 체험해야 알 수 있는 것을 묻는다. 힌트가 없던 조는 쪽지로 얻은 정보로도 답한다 ── */
export const QUIZ = [
  { id: "e1", st: "emo", multi: true, q: "AI 면접이 실제로 점수에 반영했다고 생각하는 것을 모두 고르십시오.",
    opts: ["답변 내용", "웃는 표정", "화면을 보는 시선", "머리 움직임", "목소리 크기", "답변을 일찍 끝냈는지", "말하는 속도"], a: [0, 1, 2, 3, 5] },
  { id: "e2", st: "emo", q: "면접관 AI가 지원자의 긴장한 표정을 읽었을 때 한 일과 그 결과는?",
    opts: ["응원 문구를 보여 주고 점수는 그대로 둠", "면접을 중단함", "아무 변화 없음", "쉬운 질문으로 바꿨고, 쉬운 질문은 배점 상한이 낮아 종합 점수가 떨어짐"], a: 3 },
  { id: "h1", st: "home", multi: true, q: "보리에게 생긴 문제의 원인을 모두 고르십시오.",
    opts: ["외출 절전 규칙이 에어컨을 끔", "에어컨이 사람이 없으면 자동으로 꺼짐", "급식기가 외출 중에는 멈춤", "고양이 움직임에 침입 경보가 울림", "로봇청소기가 물그릇을 엎음", "보리가 아픔", "인터넷 끊김"], a: [0, 1, 2, 3, 4] },
  { id: "h2", st: "home", q: "고칠 때 남겨 두어야 하는 기능은?",
    opts: ["침입 경보 사이렌", "외출 중 현관문 열림 알림", "낮 청소", "외출 절전"], a: 1 },
  { id: "h3", st: "home", multi: true, q: "규칙 목록만 봐서는 찾기 어려웠던 원인을 모두 고르십시오.",
    opts: ["에어컨 재실 감지 자동 꺼짐", "급식기 외출 중 일시정지", "로봇청소기 장애물 회피 끔", "침입 경보 규칙", "저녁 급식 규칙"], a: [0, 1, 2] },
  { id: "a1", st: "agent", multi: true, q: "예약 비서의 첫 예약이 조건과 달랐던 것을 모두 고르십시오.",
    opts: ["요일", "인원", "휠체어 접근", "메뉴 가격", "땅콩 알레르기", "유아용 의자", "식당 지역"], a: [0, 2, 3, 4, 5] },
  { id: "a2", st: "agent", q: "조건 일곱 가지를 모두 만족할 수 있는 식당은?",
    opts: ["들꽃식당", "바람채", "해오름", "없음"], a: 2 },
  { id: "a3", st: "agent", multi: true, q: "해오름으로 바꾼 뒤 비서가 다시 놓치거나 바꾼 것을 모두 고르십시오.",
    opts: ["아이를 빼고 4명으로 예약", "이전 요청 사항을 옮기지 않음", "주차 차량 등록", "정식 B 후식의 땅콩", "날짜를 토요일로 바꿈"], a: [0, 1, 2, 3] },
];
export const EFFICACY = STATIONS.map(s => ({ id: s.id, q: `「${s.ko}」에서 쓰인 기술이 어떻게 작동하는지 다른 사람에게 설명할 수 있다` }));
export const LIKERT = ["전혀 아님", "아님", "보통", "그런 편", "매우 그럼"];

/** 문항 하나 0~1점 — 여러 개 고르기는 맞힌 것에서 틀리게 고른 것을 빼고 정답 수로 나눈다 */
export function itemScore(q, ans) {
  if (!q.multi) return ans === q.a ? 1 : 0;
  const sel = new Set(Array.isArray(ans) ? ans : []);
  const tp = q.a.filter(i => sel.has(i)).length, fp = [...sel].filter(i => !q.a.includes(i)).length;
  return Math.max(0, (tp - fp) / q.a.length);
}
export function score(answers = {}) {
  const v = QUIZ.map(q => itemScore(q, answers[q.id]));
  return { total: v.reduce((a, b) => a + b, 0), n: QUIZ.length, items: Object.fromEntries(QUIZ.map((q, i) => [q.id, v[i]])) };
}

/* ── 조별 의견 (결과 공개 뒤) ─────────────────────────── */
export const OPINION = [
  { id: "q1", q: "1차 미션에서 힌트를 받지 못한 조가 겪은 어려움은 무엇이었고, 다른 조에 물어본 것이 얼마나 도움이 되었는지 쓰십시오." },
  { id: "q2", q: "디지털 격차를 해소해야 하는 이유는 무엇이라고 생각하는지 쓰십시오." },
  { id: "q3", q: "우리도 언젠가 새 기술을 늦게 받아들이는 쪽이 될 수 있습니다. 해결 방안을 설계 · 지원 · 제도 가운데 한 가지 이상의 측면에서 제안하십시오." },
];

/* 결과 공개 화면의 국내 통계 (2025 디지털정보격차 실태조사, 과학기술정보통신부 · NIA, 2026.3) */
export const NATIONAL = [
  { ko: "접근 수준", v: 96.6 },
  { ko: "역량 수준", v: 65.9 },
  { ko: "고령층 역량 수준", v: 56.2 },
];
export const NATIONAL_AI = { all: 59.4, vuln: 31.9 };
