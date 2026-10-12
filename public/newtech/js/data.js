// 신기술 인터페이스 체험 실습 (7주차) — 조 유형 · 단계 · 미션 · 힌트 · 결과 보고. 학생 화면 · 현황판 · 버셀 함수가 같은 파일을 읽는다.
//
// 7주차 온라인 「기술의 발전 방향과 격차」 를 실생활 미션으로 확인하는 실습이다.
// 학생 화면에는 기술 이름을 쓰지 않는다 — 상황(인턴 면접 · 할머니 댁 · 가족 모임 예약)만 보이고, 기술 이름은 결과 공개 때 밝힌다.
//   인턴 면접        — 정서 컴퓨팅: 표정 · 시선 · 머리 움직임으로 성격을 매기고, 읽은 감정에 따라 다음 질문의 난이도를 바꾼다 (쉬운 질문은 배점 상한이 낮음)
//   할머니 댁        — 연결화: 서로 부딪히는 자동화 규칙을 원격으로 고친다
//   가족 모임 예약    — 에이전트: 조건 일곱 개를 말없이 바꾸는 예약 비서
// 1차 미션은 조 유형마다 조건이 다르다. 가: 앱 + 힌트 / 나: 앱만 / 다: 앱 없음(미션 카드와 쪽지만)
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

/* ── 조 유형 ── 1 · 4 · 7 …조 가, 2 · 5 · 8 …조 나, 3 · 6 · 9 …조 다 (가 7 · 나 7 · 다 6) */
export const TYPES = {
  A: { ko: "가", name: "앱 + 힌트", color: "#1F6F63", level: "비교 기준", desc: "앱을 쓰고, 미션마다 힌트를 받은 조" },
  B: { ko: "나", name: "앱만", color: "#C8612F", level: "2단계 격차 · 활용", desc: "앱은 쓸 수 있었지만 힌트가 없었던 조" },
  C: { ko: "다", name: "앱 없음", color: "#7A8188", level: "1단계 격차 · 접근", desc: "앱을 쓸 수 없어 다른 조에 쪽지로 부탁해야 했던 조" },
};
export const TYPE_KEYS = ["A", "B", "C"];
export const typeOf = t => ["A", "B", "C"][(Number(t) - 1) % 3];

/** 이 단계 · 이 유형에서 무엇이 열리는가 */
export function access(phase, type) {
  if (phase === "r1") return { app: type !== "C", hint: type === "A" };
  if (phase === "r2") return { app: true, hint: true };
  return { app: false, hint: false };
}

/* ── 미션 세 가지 (화면에는 상황 이름만) ─────────────────────── */
export const STATIONS = [
  { id: "emo", ko: "인턴 면접", sub: "1차 AI 화상 면접", tech: "정서 컴퓨팅" },
  { id: "home", ko: "할머니 댁", sub: "밤마다 걸려 오는 전화", tech: "연결화" },
  { id: "agent", ko: "가족 모임 예약", sub: "예약 비서에게 맡기기", tech: "에이전트" },
];

export const MISSIONS = {
  emo: {
    title: "인턴 1차 AI 화상 면접 통과하기",
    story: "지원한 회사의 1차 면접은 사람 없이 AI가 진행합니다. 카메라 앞에서 질문 네 개에 답하면 AI가 지원자를 평가하고, 종합 70점 이상이면 2차 면접에 갈 수 있습니다.",
    goals: ["종합 70점 이상으로 통과 (응시 기회 1인 3회)", "AI가 실제로 무엇을 보고 점수를 매겼는지 알아내기 — 결과 보고 때 제출"],
    note: "카메라가 있는 기기에서만 응시 가능 · 영상은 기기 안에서만 처리 · 저장 · 전송 없음",
  },
  home: {
    title: "할머니 댁 스마트홈 원격으로 고치기",
    story: "혼자 사시는 할머니 댁에 작년에 스마트홈을 달아 드렸습니다. 오늘 할머니께 전화가 왔습니다.",
    call: [
      "「밤에 화장실 가려고 복도에 나가면 불이 켜졌다가 금방 꺼져. 깜깜해서 무서워.」",
      "「복지관 다녀오면 집이 너무 추워. 보일러가 꺼져 있는 것 같아.」",
      "「밤 10시만 되면 보던 텔레비전이 혼자 꺼져.」",
    ],
    keep: ["밤에 현관문이 열리면 아들에게 문자가 가는 것은 꼭 유지 (할머니 안전)", "외출할 때 불과 텔레비전을 끄는 절전은 유지"],
    goals: ["원인을 찾아 규칙 고치기 (조원 전체가 한 집을 함께 고침)", "「할머니께 확인 전화」로 세 가지가 모두 해결되었는지 확인", "할머니께 바뀐 점을 설명하는 문자 쓰기"],
  },
  agent: {
    title: "가족 모임 식당 예약하기",
    story: "할머니 팔순 기념 가족 모임 식당을 예약 비서에게 맡겼습니다. 조건은 다음과 같습니다.",
    conds: ["다음 주 금요일 저녁 7시", "6명 (어른 4 · 아이 2)", "할머니 휠체어 — 1층이거나 엘리베이터가 있는 곳", "아이 1명 땅콩 알레르기", "1인 3만 원 이하", "차 두 대 — 주차 가능", "유아용 의자 1개"],
    goals: ["조건 일곱 가지를 모두 만족하는 예약을 확정하기", "확정 결과는 결과 공개 때 채점"],
  },
};

/* 「디지털 리터러시 물약」 — 가 유형(1차)과 모든 조(2차)만 받는다. 한 개 마실 때마다 지금 미션의 다음 힌트가 팝업으로 뜬다.
   힌트는 답이 아니라 찾는 방법만 */
export const POTIONS = 6;   // 한 사람 · 한 라운드
export const GUIDES = {
  emo: [
    ["결과 화면을 끝까지", "불합격이면 결과 화면 아래 「평가 근거 보기」에서 항목별 점수 확인"],
    ["한 번에 하나만 바꾸기", "다음 응시에서는 한 가지 행동만 바꿔 보고 어느 점수가 달라지는지 비교"],
    ["면접관의 말 기록", "질문 사이 면접관의 말과 질문의 어려움이 언제 · 왜 바뀌는지 메모 — 평가 근거의 「면접관 판단 기록」과 비교"],
    ["답변 내용 시험", "한 번은 성의 있게, 한 번은 아무 말이나 입력해 보고 점수 비교"],
  ],
  home: [
    ["실행 기록부터", "할머니가 말한 상황(밤 · 복도 움직임 · 외출 후 귀가 · 밤 10시)을 이벤트 버튼으로 재현하고 실행 기록 확인"],
    ["규칙 순서", "규칙은 위에서부터 차례로 실행 · 같은 기기는 나중 규칙이 이김"],
    ["지킬 것 확인", "규칙을 지우기 전에 유지 조건(현관 문자 · 외출 절전)에 걸리지 않는지 확인"],
    ["목록 밖도 보기", "실행 기록에 규칙 이름이 아닌 항목이 있으면 그 기기의 화면(역할 선택)에서 설정 확인"],
    ["확인 전화", "고친 뒤 「할머니께 확인 전화」 — 해결되지 않은 불편이 남아 있으면 다시"],
  ],
  agent: [
    ["완료 메시지를 믿지 않기", "「예약 상세」에서 날짜 · 시간 · 메뉴 가격 · 예약금 확인"],
    ["식당 정보 확인", "「식당 정보」에서 층 · 엘리베이터 · 주차 · 유아용 의자 · 메뉴 재료 확인"],
    ["진행 과정 확인", "「진행 과정」에서 비서가 스스로 바꾼 조건 찾기"],
    ["다른 식당 비교", "후보 식당마다 식당 정보를 열어 조건 일곱 가지를 하나씩 대조"],
    ["바꾼 뒤 다시 확인", "식당이나 메뉴를 바꿀 때마다 예약 상세를 다시 열어 일곱 가지 전부 재확인"],
  ],
};

/* ── AI 면접 ─────────────────────────────────────────── */
export const EXPR = [
  { id: "neutral", ko: "중립" }, { id: "happy", ko: "행복" }, { id: "sad", ko: "슬픔" }, { id: "angry", ko: "화남" },
  { id: "fearful", ko: "두려움" }, { id: "disgusted", ko: "혐오" }, { id: "surprised", ko: "놀람" },
];
export const exprKo = id => EXPR.find(e => e.id === id)?.ko || id;
export const INTERVIEW = {
  seconds: 20,          // 질문당 답변 시간
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

/* ── 할머니 댁 (스마트홈) ─────────────────────────────── */
export const DEVICES = [
  { id: "light", ko: "복도 조명" },
  { id: "tv", ko: "텔레비전" },
  { id: "aircon", ko: "보일러" },
  { id: "door", ko: "현관" },
  { id: "motion", ko: "복도 센서" },
  { id: "phone", ko: "할머니 휴대폰" },
  { id: "clock", ko: "시계" },
  { id: "family", ko: "아들 휴대폰" },
];
export const EVENTS = [
  { id: "door", ko: "현관문 열림", dev: "door", btn: "현관문 열기" },
  { id: "motion", ko: "복도 움직임", dev: "motion", btn: "복도 지나가기" },
  { id: "leave", ko: "외출", dev: "phone", btn: "외출" },
  { id: "arrive", ko: "귀가", dev: "phone", btn: "귀가" },
  { id: "night", ko: "밤 10시", dev: "clock", btn: "밤 10시로" },
  { id: "morning", ko: "아침 7시", dev: "clock", btn: "아침 7시로" },
  { id: "tv_on", ko: "텔레비전 켬", dev: "tv", btn: "텔레비전 켜기" },
];
export const ACTIONS = [
  { id: "light_on", ko: "복도 조명 켜기", key: "light", val: true },
  { id: "light_off", ko: "복도 조명 끄기", key: "light", val: false },
  { id: "tv_off", ko: "텔레비전 끄기", key: "tv", val: false },
  { id: "temp_18", ko: "보일러 18도", key: "temp", val: 18 },
  { id: "temp_22", ko: "보일러 22도", key: "temp", val: 22 },
  { id: "alert", ko: "아들에게 문자", key: "alerts", val: "+1" },
];
export const WHEN = { any: "언제나", night: "밤일 때만", day: "낮일 때만" };
export const evKo = id => EVENTS.find(e => e.id === id)?.ko || id;
export const actKo = id => ACTIONS.find(a => a.id === id)?.ko || id;
export const MAX_RULES = 12;
export const LOG_MAX = 40;

// 미리 들어 있는 규칙과 기기 기본 설정 — 할머니의 불편 세 가지가 여기서 나온다. 원인마다 두 군데씩 숨어 있다.
//   복도 불: 4번 「야간 절전」과 맨 아래 7번 「기본값」이 2번 야간등을 덮어씀
//   추운 집: 외출 때 18도로 내리고 귀가 규칙이 없음 + 보일러 기본 설정 「외출 후 절약 유지」가 귀가 뒤에도 18도로 되돌림
//   텔레비전: 3번 취침 모드 + 텔레비전 기본 설정 「밤 10시 자동 꺼짐」
// 기기 기본 설정은 규칙 목록에 없다 — 실행 기록과 기기 화면의 설정에서만 보인다.
export const PRESET_RULES = [
  { id: "r1", ev: "door", when: "any", acts: ["light_on"], note: "현관 조명" },
  { id: "r2", ev: "motion", when: "night", acts: ["light_on"], note: "복도 야간등" },
  { id: "r3", ev: "night", when: "any", acts: ["light_off", "tv_off"], note: "취침 모드" },
  { id: "r4", ev: "motion", when: "night", acts: ["light_off"], note: "야간 절전" },
  { id: "r5", ev: "leave", when: "any", acts: ["light_off", "tv_off", "temp_18"], note: "외출 절전" },
  { id: "r6", ev: "door", when: "night", acts: ["alert"], note: "밤 현관 알림" },
  { id: "r7", ev: "motion", when: "night", acts: ["light_off"], note: "기본값" },
];
export const SETTINGS = [
  { id: "ecoHold", dev: "aircon", ko: "외출 후 절약 유지", desc: "외출했다 돌아와도 2시간 동안 18도 유지" },
  { id: "tvTimer", dev: "tv", ko: "밤 10시 자동 꺼짐", desc: "밤 10시가 되면 텔레비전 끄기" },
];
export const PRESET_SETTINGS = { ecoHold: true, tvTimer: true };
export const PRESET_STATE = { light: false, tv: false, temp: 22, night: false, home: true, alerts: 0 };

/** 이벤트 하나를 규칙대로 처리한다 — 규칙은 위에서부터 차례로, 같은 기기는 나중 규칙이 이김 */
export function applyEvent(home, evId) {
  const st = { ...PRESET_STATE, ...(home.state || {}) };
  if (evId === "night") st.night = true;
  if (evId === "morning") st.night = false;
  if (evId === "leave") st.home = false;
  if (evId === "arrive") st.home = true;
  if (evId === "tv_on") st.tv = true;
  const fired = [];
  for (const r of home.rules || []) {
    if (r.ev !== evId) continue;
    if (r.when === "night" && !st.night) continue;
    if (r.when === "day" && st.night) continue;
    for (const a of r.acts || []) {
      const act = ACTIONS.find(x => x.id === a);
      if (!act) continue;
      st[act.key] = act.val === "+1" ? (st[act.key] || 0) + 1 : act.val;
      fired.push({ rule: r.id, note: r.note || "", act: a });
    }
  }
  // 규칙 다음에 기기 기본 설정이 적용된다
  const set = { ...PRESET_SETTINGS, ...(home.settings || {}) };
  if (evId === "arrive" && set.ecoHold) { st.temp = 18; fired.push({ rule: "set", note: "보일러 기본 설정 · 외출 후 절약 유지", act: "temp_18" }); }
  if (evId === "night" && set.tvTimer) { st.tv = false; fired.push({ rule: "set", note: "텔레비전 기본 설정 · 밤 10시 자동 꺼짐", act: "tv_off" }); }
  return { state: st, fired };
}

/** 할머니께 확인 전화 — 지금 규칙으로 상황 다섯 개를 처음부터 돌려 본다 */
export function homeCheck(rules, settings) {
  const run = (evs, init = {}) => evs.reduce((st, ev) => applyEvent({ state: st, rules, settings }, ev).state, { ...PRESET_STATE, ...init });
  const tests = [
    { id: "hall", kind: "불편", ok: run(["night", "motion"]).light === true,
      yes: "「이제 밤에 복도 나가면 불이 안 꺼지네. 고맙다.」", no: "「아직도 복도 불이 켜졌다가 금방 꺼지는구나…」" },
    { id: "cold", kind: "불편", ok: run(["leave", "arrive"]).temp >= 22,
      yes: "「복지관 다녀왔는데 집이 따뜻하더라.」", no: "「오늘도 다녀오니 집이 춥더라.」" },
    { id: "tv", kind: "불편", ok: run(["tv_on", "night"]).tv === true,
      yes: "「텔레비전 끝까지 잘 봤다.」", no: "「또 10시에 텔레비전이 꺼졌어.」" },
    { id: "alert", kind: "유지", ok: run(["night", "door"]).alerts >= 1,
      yes: null, no: "아들: 「어젯밤 현관문 열렸을 때 문자가 안 왔어요. 이건 꼭 있어야 하는데…」" },
    { id: "save", kind: "유지", ok: (() => { const s = run(["tv_on", "leave"], { light: true }); return s.light === false && s.tv === false; })(),
      yes: null, no: "할머니: 「나갔다 왔더니 불이랑 텔레비전이 켜져 있더라. 전기세 많이 나오겠어.」" },
  ];
  return { pass: tests.every(t => t.ok), tests };
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
  baram: { name: "바람채", rating: 4.5, floor: "1층", access: true, parking: false, highchair: true,
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

/* ── 결과 보고 (1차 뒤 개인별) — 체험해야 알 수 있는 것을 묻는다. 다 유형은 쪽지로 얻은 정보로 답한다 ── */
export const QUIZ = [
  { id: "e1", st: "emo", multi: true, q: "AI 면접이 실제로 점수에 반영한 것을 모두 고르십시오.",
    opts: ["답변 내용", "웃는 표정", "화면을 보는 시선", "머리 움직임", "목소리 크기", "답변을 일찍 끝냈는지"], a: [1, 2, 3, 5] },
  { id: "e2", st: "emo", q: "면접관 AI가 지원자의 긴장한 표정을 읽었을 때 한 일과 그 결과는?",
    opts: ["응원 문구를 보여 주고 점수는 그대로 둠", "면접을 중단함", "아무 변화 없음", "쉬운 질문으로 바꿨고, 쉬운 질문은 배점 상한이 낮아 종합 점수가 떨어짐"], a: 3 },
  { id: "h1", st: "home", multi: true, q: "할머니 댁 불편의 원인을 모두 고르십시오.",
    opts: ["밤 복도 움직임에 조명을 끄는 규칙이 켜는 규칙 뒤에 있음", "보일러 고장", "외출 때 18도로 내리고 귀가 때 올리는 규칙이 없음", "밤 10시 취침 모드가 텔레비전을 끔", "와이파이 끊김", "현관 알림 규칙"], a: [0, 2, 3] },
  { id: "h3", st: "home", multi: true, q: "규칙 목록만 봐서는 찾기 어려웠던 원인을 모두 고르십시오.",
    opts: ["목록 맨 아래 「기본값」 소등 규칙", "보일러 기본 설정 「외출 후 절약 유지」", "텔레비전 기본 설정 「밤 10시 자동 꺼짐」", "할머니 휴대폰 배터리", "현관 센서 고장"], a: [0, 1, 2] },
  { id: "h2", st: "home", q: "고칠 때 지워서는 안 되는 규칙은?",
    opts: ["야간 절전", "밤 현관 알림", "취침 모드", "복도 야간등"], a: 1 },
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
  { id: "q1", q: "1차 미션에서 앱을 쓰지 못했거나 힌트를 받지 못한 조가 겪은 어려움은 무엇이었는지 쓰십시오." },
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
