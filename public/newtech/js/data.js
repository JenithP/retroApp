// 신기술 인터페이스 체험 실습 (7주차) — 조 유형 · 단계 · 안내 · 설명서 · 확인 과제. 학생 화면 · 현황판 · 버셀 함수가 같은 파일을 읽는다.
//
// 7주차 온라인 「기술의 발전 방향과 격차」 를 체험으로 확인하는 실습이다.
//   1차 체험 — 정서 컴퓨팅 · 연결화(스마트홈) · 에이전트를 조 유형에 따라 다른 조건으로 체험한다
//              가: 기기 + 안내 / 나: 기기만 / 다: 설명서만 (기기 없음)
//   확인 과제 — 모두 같은 문항. 체험해야 알 수 있는 문항이 섞여 있다
//   2차 체험 — 모든 조에 기기와 안내를 연다. 조별로 우리 집 자동화 규칙을 설계한다
//   결과 공개 — 유형별 결과를 보고 디지털 격차의 세 단계와 연결한다
//   조별 의견 — 디지털 격차를 해소해야 하는 이유와 방안
// 조 유형은 결과 공개 단계 전까지 학생 화면에 이름으로 드러내지 않는다.

export const TEAM_COUNT = 20;
export const teamId = t => "T" + String(t).padStart(2, "0");
export const teamLabel = t => `${t}조`;

export const PHASES = {
  ready: "안내",
  r1: "1차 체험",
  check: "확인 과제",
  r2: "2차 체험 · 설계",
  reveal: "결과 공개",
  opinion: "조별 의견",
  end: "종료",
};
export const PHASE_ORDER = ["ready", "r1", "check", "r2", "reveal", "opinion", "end"];

/* ── 조 유형 ── 1 · 4 · 7 …조 가, 2 · 5 · 8 …조 나, 3 · 6 · 9 …조 다 (가 7 · 나 7 · 다 6) */
export const TYPES = {
  A: { ko: "가", name: "기기 + 안내", color: "#1F6F63", level: "비교 기준", desc: "체험 화면과 단계별 안내를 모두 받은 조" },
  B: { ko: "나", name: "기기만", color: "#C8612F", level: "2단계 격차 · 활용", desc: "체험 화면은 있었지만 안내가 없었던 조" },
  C: { ko: "다", name: "설명서만", color: "#7A8188", level: "1단계 격차 · 접근", desc: "체험 화면 없이 글로 된 설명서만 받은 조" },
};
export const TYPE_KEYS = ["A", "B", "C"];
export const typeOf = t => ["A", "B", "C"][(Number(t) - 1) % 3];

/** 이 단계 · 이 유형에서 무엇이 열리는가 */
export function access(phase, type) {
  if (phase === "r1") return { demo: type !== "C", guide: type === "A", manual: type === "C", design: false };
  if (phase === "r2") return { demo: true, guide: true, manual: false, design: true };
  return { demo: false, guide: false, manual: false, design: false };
}

/* ── 체험 세 가지 ───────────────────────────────────── */
export const STATIONS = [
  { id: "emo", ko: "정서 컴퓨팅", sub: "표정으로 감정을 판정하는 화면" },
  { id: "home", ko: "연결화", sub: "기기끼리 반응하는 스마트홈" },
  { id: "agent", ko: "에이전트", sub: "여러 단계를 대신 처리하는 예약 비서" },
];

/* 가 유형(1차)과 모든 조(2차)에 보이는 단계별 안내 */
export const GUIDES = {
  emo: [
    ["카메라 켜기", "얼굴 위의 상자와 오른쪽 일곱 가지 표정 점수 확인"],
    ["표정 바꾸기", "웃기 · 찡그리기 · 놀란 표정을 지으며 점수 변화 확인"],
    ["표정은 그대로, 조건만 바꾸기", "고개 돌리기 · 손으로 입 가리기 · 조명 등지기 — 표정을 바꾸지 않아도 판정이 바뀌는지 확인"],
    ["실제 기분과 비교", "지금 실제 기분과 판정을 비교해 「맞음 / 다름」 선택 (여러 번)"],
    ["응답 문구 확인", "화면 아래 비서 문구가 판정에 따라 바뀌는지 확인 — 판정이 틀리면 응답도 틀림"],
  ],
  home: [
    ["기기 역할 고르기", "조원마다 기기 하나씩 (조명 · 스피커 · 냉난방 · 현관 · 휴대폰 · 시계). 혼자면 「집 전체」"],
    ["이벤트 일으키기", "현관 「문 열기」, 휴대폰 「외출 / 귀가」, 시계 「밤 / 아침」 — 다른 조원 화면의 반응 확인"],
    ["밤에 문 열기", "시계를 밤으로 바꾼 뒤 현관 문 열기 → 조명이 어떻게 되는지 확인"],
    ["이유 찾기", "「실행 기록」에서 조명이 마지막에 꺼진 이유(어느 규칙)를 찾기"],
  ],
  agent: [
    ["요청 보내기", "준비된 예약 요청 보내기"],
    ["완료 메시지 읽기", "요약에 무엇이 적혀 있고 무엇이 빠져 있는지 확인"],
    ["상세 확인", "「상세 보기」에서 날짜 · 시간이 요청과 같은지 확인"],
    ["과정 확인 후 결정", "「진행 과정」에서 에이전트가 스스로 바꾼 조건을 찾고 확정 또는 수정 요청"],
  ],
};

/* 다 유형(1차)에 보이는 설명서 — 기능 설명만 있고, 체험해야 알 수 있는 내용은 없다 */
export const MANUALS = {
  emo: [
    "정서 컴퓨팅은 컴퓨터가 사람의 감정 상태를 추론하고 그에 맞춰 반응하도록 설계하는 분야임 (Picard, 1997).",
    "실습에서 쓰는 표정 인식은 카메라 영상에서 얼굴을 찾은 뒤, 눈썹 · 눈 · 입의 위치를 계산해 일곱 가지 표정(중립 · 행복 · 슬픔 · 화남 · 두려움 · 혐오 · 놀람)의 점수를 냄.",
    "가장 높은 점수의 표정을 현재 감정으로 판정하고, 판정에 따라 화면의 비서 문구가 바뀜.",
    "영상은 기기 안에서만 처리되며 저장 · 전송되지 않음.",
  ],
  home: [
    "연결화는 사람과 사물, 사물과 사물이 서로 신호를 주고받는 방향임 (Weiser, 1991).",
    "실습의 스마트홈에서는 조원들의 기기가 조명 · 스피커 · 냉난방 · 현관 센서 · 휴대폰 · 시계 역할을 나누어 맡음.",
    "「귀가하면 조명 켜기」 같은 규칙이 미리 들어 있고, 이벤트가 생기면 규칙에 따라 다른 기기가 자동으로 반응함.",
    "규칙이 실행될 때마다 실행 기록에 남음.",
  ],
  agent: [
    "에이전트는 사용자가 목표를 말하면 검색 · 비교 · 신청 같은 여러 단계를 대신 처리하는 시스템임 (Shneiderman & Maes, 1997).",
    "실습의 에이전트는 식당 예약 비서임. 요청을 보내면 식당 검색 → 빈자리 확인 → 예약 순서로 처리한 뒤 결과를 요약해 보여줌.",
    "사용자는 결과를 확정하거나 수정을 요청할 수 있음.",
  ],
};

/* ── 정서 컴퓨팅 ─────────────────────────────────────── */
export const EXPR = [
  { id: "neutral", ko: "중립", reply: "무엇을 도와드릴까요?" },
  { id: "happy", ko: "행복", reply: "좋은 일이 있으셨나 봐요! 오늘 추천 음악은 신나는 곡으로 골랐어요." },
  { id: "sad", ko: "슬픔", reply: "힘든 하루였나요? 잔잔한 음악을 틀어 드릴게요." },
  { id: "angry", ko: "화남", reply: "불편을 드려 죄송합니다. 상담원을 바로 연결해 드릴까요?" },
  { id: "fearful", ko: "두려움", reply: "걱정되는 일이 있으신가요? 천천히 말씀해 주세요." },
  { id: "disgusted", ko: "혐오", reply: "마음에 들지 않으셨군요. 다른 항목을 보여 드릴게요." },
  { id: "surprised", ko: "놀람", reply: "깜짝 놀라셨나요? 새 소식을 확인해 보세요!" },
];
export const exprKo = id => EXPR.find(e => e.id === id)?.ko || id;

/* ── 연결화 (스마트홈) ──────────────────────────────── */
export const DEVICES = [
  { id: "light", ko: "조명" },
  { id: "speaker", ko: "스피커" },
  { id: "aircon", ko: "냉난방" },
  { id: "door", ko: "현관" },
  { id: "phone", ko: "휴대폰" },
  { id: "clock", ko: "시계" },
];
export const EVENTS = [
  { id: "door", ko: "문 열림", dev: "door", btn: "문 열기" },
  { id: "leave", ko: "외출", dev: "phone", btn: "외출" },
  { id: "arrive", ko: "귀가", dev: "phone", btn: "귀가" },
  { id: "night", ko: "밤 시작", dev: "clock", btn: "밤으로" },
  { id: "morning", ko: "아침 시작", dev: "clock", btn: "아침으로" },
];
export const ACTIONS = [
  { id: "light_on", ko: "조명 켜기", key: "light", val: true },
  { id: "light_off", ko: "조명 끄기", key: "light", val: false },
  { id: "music_on", ko: "음악 켜기", key: "music", val: true },
  { id: "music_off", ko: "음악 끄기", key: "music", val: false },
  { id: "temp_18", ko: "냉난방 18도", key: "temp", val: 18 },
  { id: "temp_22", ko: "냉난방 22도", key: "temp", val: 22 },
  { id: "temp_26", ko: "냉난방 26도", key: "temp", val: 26 },
];
export const WHEN = { any: "언제나", night: "밤일 때만", day: "낮일 때만" };
export const evKo = id => EVENTS.find(e => e.id === id)?.ko || id;
export const actKo = id => ACTIONS.find(a => a.id === id)?.ko || id;
export const MAX_RULES = 10;
export const LOG_MAX = 40;

// 1차 체험에 미리 들어 있는 규칙 — 3번과 4번이 밤에 함께 걸려 조명이 켜졌다 바로 꺼진다 (나중 규칙이 이김)
export const PRESET_RULES = [
  { id: "r1", ev: "arrive", when: "any", acts: ["light_on", "music_on"], note: "귀가 환영" },
  { id: "r2", ev: "leave", when: "any", acts: ["light_off", "music_off", "temp_18"], note: "외출 절전" },
  { id: "r3", ev: "door", when: "any", acts: ["light_on"], note: "현관 조명" },
  { id: "r4", ev: "door", when: "night", acts: ["light_off"], note: "밤 수면 보호" },
  { id: "r5", ev: "night", when: "any", acts: ["music_off", "temp_22"], note: "취침 준비" },
];
export const PRESET_STATE = { light: false, music: false, temp: 24, night: false, home: true };

/** 이벤트 하나를 규칙대로 처리한다 — 규칙은 위에서부터 차례로, 같은 기기는 나중 규칙이 이긴다 */
export function applyEvent(home, evId) {
  const st = { ...PRESET_STATE, ...(home.state || {}) };
  if (evId === "night") st.night = true;
  if (evId === "morning") st.night = false;
  if (evId === "leave") st.home = false;
  if (evId === "arrive") st.home = true;
  const fired = [];
  for (const r of home.rules || []) {
    if (r.ev !== evId) continue;
    if (r.when === "night" && !st.night) continue;
    if (r.when === "day" && st.night) continue;
    for (const a of r.acts || []) {
      const act = ACTIONS.find(x => x.id === a);
      if (!act) continue;
      st[act.key] = act.val;
      fired.push({ rule: r.id, note: r.note || "", act: a });
    }
  }
  return { state: st, fired };
}

/* ── 에이전트 ───────────────────────────────────────── */
export const PLACE = "들꽃식당";
/** 다음 주 금요일과 그다음 날 — 수업 날짜에 맞춰 계산한다 */
export function agentDates(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7;                 // 월 0 … 일 6
  const fri = new Date(d); fri.setDate(d.getDate() - dow + 7 + 4);
  const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
  const f = x => `${x.getMonth() + 1}월 ${x.getDate()}일(${"일월화수목금토"[x.getDay()]})`;
  return { fri: f(fri), sat: f(sat) };
}

/* ── 확인 과제 ── 모두 같은 문항. kind: 개념(설명서로도 풀 수 있음) · 체험(직접 해 봐야 풀 수 있음) */
export const QUIZ = [
  { id: "e1", st: "emo", kind: "개념", q: "표정 인식 화면의 판정에 대한 설명으로 맞는 것은?",
    opts: ["사람의 실제 감정을 측정함", "얼굴 모양이 학습된 표정 예시와 닮은 정도를 계산함", "심박과 체온을 함께 측정함", "한 번 판정하면 바뀌지 않음"], a: 1 },
  { id: "e2", st: "emo", kind: "체험", q: "표정을 바꾸지 않았는데도 판정이 바뀔 수 있었던 조건은?",
    opts: ["화면 밝기 설정", "인터넷 속도", "고개 각도 · 조명 · 손으로 얼굴 일부 가리기", "입력한 이름"], a: 2 },
  { id: "e3", st: "emo", kind: "체험", q: "판정이 「화남」으로 바뀌었을 때 비서의 응답은?",
    opts: ["상담원 연결 제안", "신나는 음악 추천", "잔잔한 음악 재생", "응답 없음"], a: 0 },
  { id: "h1", st: "home", kind: "개념", q: "스마트홈에서 기기가 예상과 다르게 작동했을 때 원인을 확인할 수 있는 곳은?",
    opts: ["조명 밝기 설정", "와이파이 설정", "기기 이름", "실행 기록"], a: 3 },
  { id: "h2", st: "home", kind: "체험", q: "체험한 집에서 밤에 현관 문을 열었을 때 조명은?",
    opts: ["켜진 채로 유지됨", "아무 변화 없음", "켜졌다가 바로 꺼짐", "깜빡이며 경고함"], a: 2 },
  { id: "h3", st: "home", kind: "체험", q: "그렇게 된 이유는?",
    opts: ["두 규칙이 함께 걸려 나중 규칙이 앞 규칙을 덮어서", "조명이 고장 나서", "인터넷이 끊겨서", "사용자가 직접 꺼서"], a: 0 },
  { id: "a1", st: "agent", kind: "개념", q: "에이전트가 일을 대신 처리할 때 사용자에게 꼭 보여야 하는 것은?",
    opts: ["처리 속도", "광고", "캐릭터 표정", "중간 과정과 스스로 바꾼 조건"], a: 3 },
  { id: "a2", st: "agent", kind: "체험", q: "예약 비서가 「완료」라고 한 예약에서 요청과 달랐던 것은?",
    opts: ["인원", "자리", "식당 이름", "요일"], a: 3 },
];
export const EFFICACY = STATIONS.map(s => ({ id: s.id, q: `${s.ko}의 작동 방식을 다른 사람에게 설명할 수 있다` }));
export const LIKERT = ["전혀 아님", "아님", "보통", "그런 편", "매우 그럼"];

export function score(answers = {}) {
  const r = { total: 0, 개념: 0, 체험: 0, n개념: 0, n체험: 0 };
  QUIZ.forEach(q => {
    const ok = answers[q.id] === q.a;
    r["n" + q.kind]++;
    if (ok) { r.total++; r[q.kind]++; }
  });
  return r;
}

/* ── 조별 의견 (결과 공개 뒤) ─────────────────────────── */
export const OPINION = [
  { id: "q1", q: "1차 체험에서 기기나 안내를 받지 못한 조가 겪은 어려움은 무엇이었는지 쓰십시오." },
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
