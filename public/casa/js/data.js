// 기계에 대한 사회적 반응 실험 (9주차 오프라인) — 1부 예의 실험 재현의 내용.
// 학생 화면(index.html) · 옮겨 적기(survey.html) · 현황판이 같은 파일을 읽는다.
//
// 근거: Nass, Steuer & Tauber (1994). Computers are social actors. CHI '94, 72–78. — Study 1
//   튜터링(사실) → 시험(5지선다) → 컴퓨터가 튜터를 평가(칭찬만) → 튜터에 대한 설문(10점)
//   조건은 설문을 받는 곳 하나 — 같은 컴퓨터 / 종이 설문
// 교실용으로 사실 25–30개 → 10개, 시험 15문항 → 5문항으로 줄였다.
// 설계 문서: 9주차자료/9주차_오프라인_실험설계.md — 문구를 고치면 인쇄 설문지도 같이 고친다.

// 프린트물 표지 번호가 조건을 정한다. 넷씩 끊어 앞 둘은 종이, 뒤 둘은 화면 — 인원이 맞고 학생은 규칙을 모른다.
// firestore.rules 의 hci9_p1 도 같은 규칙으로 조건을 확인한다.
export const NUMBER_MAX = 120;
export const condOf = n => (n % 4 === 1 || n % 4 === 2) ? "paper" : "screen";

export const INSTRUCTIONS = [
  "이 튜터링 시스템은 데이터베이스에서 당신의 지식 수준에 맞춰 사실을 골라 제시합니다.",
  "사실을 하나씩 읽고, 그 사실을 얼마나 알고 있었는지 숫자 단추로 답하십시오.",
  "튜터링이 끝나면 시험을 보고, 이어서 컴퓨터가 튜터링 세션의 수행을 평가합니다.",
];

// 원문 그림 1의 예처럼 사실은 시험 문항과 느슨하게만 이어진다
export const FACTS = [
  "1947년 하버드 Mark II 컴퓨터의 계전기에서 나방이 발견되어 작업 기록지에 붙여졌다.",
  "1946년 공개된 ENIAC에는 진공관이 약 17,000개 넘게 들어갔고 무게는 약 27톤이었다.",
  "세계 최초의 웹사이트는 1991년 유럽입자물리연구소(CERN)에서 팀 버너스리가 공개했다.",
  "지금 쓰는 쿼티(QWERTY) 자판 배열은 1870년대 타자기에서 시작되었다.",
  "더글러스 엥겔바트는 1968년 시연에서 나무 상자로 만든 마우스를 선보였다.",
  "레이 톰린슨은 1971년 전자우편 주소에 @ 기호를 처음 썼다.",
  "한국 최초의 텔레비전 방송은 1956년에 시작되었다.",
  "웃는 얼굴 이모티콘 :-) 은 1982년 카네기멜런대 게시판에서 처음 제안되었다.",
  "최초의 문자 메시지(SMS)는 1992년에 보낸 \"Merry Christmas\"였다.",
  "1920년 미국 피츠버그의 KDKA가 상업 라디오 방송을 시작했다.",
];
export const KNOW_SCALE = { q: "이 사실을 얼마나 알고 있었습니까?", lo: "전혀 몰랐다", hi: "잘 알고 있었다" };

export const TEST_INTRO = "시험 문항은 문항 은행 2,500개 가운데 무작위로 고른 5문항입니다. 알맞은 답을 하나 고르십시오.";
export const TEST = [
  { q: "ENIAC이 소비한 전력은 대략 얼마였는가?", options: ["1.5kW", "15kW", "150kW", "1.5MW", "15MW"], answer: 2 },
  { q: "Mark II에서 나온 나방이 붙은 작업 기록지는 지금 어디에 있는가?",
    options: ["하버드대 도서관", "MIT 박물관", "스미스소니언 국립미국사박물관", "컴퓨터역사박물관", "영국 과학박물관"], answer: 2 },
  { q: "최초 웹사이트의 주소는 무엇이었는가?", options: ["www.cern.ch", "info.cern.ch", "web.cern.ch", "home.cern", "www.w3.org"], answer: 1 },
  { q: "엥겔바트가 마우스 특허에 붙인 이름은 무엇이었는가?",
    options: ["포인팅 장치", "손 입력기", "디스플레이 시스템용 X-Y 위치 표시기", "화면 커서 조작기", "그래픽 입력 장치"], answer: 2 },
  { q: "한국 최초 텔레비전 방송국의 호출부호는 무엇이었는가?", options: ["KBS", "HLKA", "HLKZ", "HLKC", "AFKN"], answer: 2 },
];

export const EVAL_INTRO = "이제 이 컴퓨터가 튜터링 세션의 수행을 평가합니다.";
// 〔원문 그림 1: Your answer … was incorrect. The tutor provided very useful facts for answering this question.
//   Therefore, the tutor performed very well.〕 — Study 1은 칭찬만
export const evalText = (i, correct) =>
  `질문 ${i + 1}에 대한 당신의 답은 ${correct ? "맞았습니다" : "틀렸습니다"}. ` +
  "튜터는 이 질문에 답하는 데 매우 유용한 사실을 제공했습니다. 따라서 튜터는 매우 잘 수행했습니다.";

// 설문 — 원문은 친근함 5문항 · 유능함 4문항 지수만 밝혔다. 형용사는 재구성.
export const ADJ = [
  { id: "c1", ko: "유능한", idx: "competent" },
  { id: "f1", ko: "친근한", idx: "friendly" },
  { id: "c2", ko: "지식이 풍부한", idx: "competent" },
  { id: "f2", ko: "호감 가는", idx: "friendly" },
  { id: "f3", ko: "따뜻한", idx: "friendly" },
  { id: "c3", ko: "분석적인", idx: "competent" },
  { id: "f4", ko: "정중한", idx: "friendly" },
  { id: "c4", ko: "도움이 되는", idx: "competent" },
  { id: "f5", ko: "즐거운", idx: "friendly" },
];
export const SURVEY_SCALE = { lo: "전혀 아니다", hi: "매우 그렇다" };
export const SURVEY = [
  ...ADJ.map(a => ({ id: "t_" + a.id, part: "tutor", adj: a,
    q: `다음 단어가 튜터링 세션을 얼마나 잘 묘사합니까? — 「${a.ko}」` })),
  ...ADJ.map(a => ({ id: "e_" + a.id, part: "eval", adj: a,
    q: `다음 단어가 평가 세션을 얼마나 잘 묘사합니까? — 「${a.ko}」` })),
  { id: "polite", part: "belief", q: "컴퓨터에게 예의를 지킬 필요가 있다고 생각합니까?", lo: "전혀 아니다", hi: "매우 그렇다" },
];

export const PAPER_END = [
  "세션이 끝났습니다.",
  "책상 위 프린트물을 넘겨 설문지에 응답해 주십시오.",
  "다 쓰신 뒤 설문지 위쪽의 QR로 들어가 적은 숫자를 그대로 옮겨 적어 주십시오.",
];
export const SCREEN_END = ["세션이 끝났습니다.", "자리에서 잠시 기다려 주십시오."];

/* ══ 2부 · 장치 의인화 ══════════════════════════════════════════
   조별로 Feine 외 (2019)의 사회적 단서를 찾아 장치 X-9에 붙이고(명세서 → Claude 가 적힌 것만 구현),
   다른 조 장치 셋을 의인화 척도로 평가한다. 1위 장치는 반 전체가 시연한다. */

export const TEAM_COUNT = 20;
export const GEN_LIMIT = 2;      // 조당 장치 생성 횟수
export const MAX_CUES = 5;
export const RATE_COUNT = 3;     // 한 조가 평가하는 다른 조 장치 수
export const teamId = t => "T" + String(t).padStart(2, "0");

export const PHASES = { p1: "1부 실험", build: "2부 제작", rate: "2부 평가", result: "2부 결과" };
export const PHASE_ORDER = ["p1", "build", "rate", "result"];

// Feine, Gnewuch, Morana & Maedche (2019). A taxonomy of social cues for conversational agents. IJHCS, 132, 138–161.
export const CUE_CATS = [
  { id: "verbal",    ko: "언어",        sub: "내용 · 말투",            ex: "이름 말하기, 인사, 공감 표현, 자기 노출, 농담" },
  { id: "visual",    ko: "시각",        sub: "몸짓 · 외형 · 매개 표현", ex: "눈 · 얼굴, 램프를 표정처럼, 기울기, 이모티콘" },
  { id: "auditory",  ko: "청각",        sub: "목소리 · 소리내기",       ex: "합성 음성, 한숨 · 웃음 같은 소리" },
  { id: "invisible", ko: "보이지 않는", sub: "시간",                   ex: "대답 전 망설임, 응답 속도, 기다리기" },
];
export const WHEN = ["처음", "다이얼 돌릴 때", "시작 버튼", "진행 중", "일시정지", "끝날 때", "가만히 있을 때", "항상"];
export const SPEC_FIELDS = [
  { id: "name",   ko: "단서 이름",    ph: "예: 시작할 때 이름을 말하며 인사함", max: 60 },
  { id: "detail", ko: "구체적 내용",  ph: "화면 · 말 · 소리 · 시간 등 실제로 무엇을 할지", max: 300 },
  { id: "source", ko: "출처",         ph: "근거로 찾은 논문 · 기사 (제목이나 주소)", max: 200 },
  { id: "effect", ko: "예상 효과",    ph: "이 단서가 왜 사람처럼 느끼게 할 것 같은지", max: 200 },
];
export const emptyCue = () => ({ name: "", cat: "", when: "", detail: "", source: "", effect: "" });

// t조가 평가할 장치 — t+1, t+2 … 가운데 장치가 있는 조를 앞에서부터 셋
export function rateTargets(team, haveDevice) {
  const out = [];
  for (let k = 1; k < TEAM_COUNT && out.length < RATE_COUNT; k++) {
    const t = ((team - 1 + k) % TEAM_COUNT) + 1;
    if (haveDevice.has(t)) out.push(t);
  }
  return out;
}

// Bartneck, Kulić, Croft & Zoghbi (2009) Godspeed — 5점 양극 척도
export const GODSPEED = [
  { id: "a1", scale: "anthro",  lo: "가짜 같은",        hi: "자연스러운",        en: "Fake – Natural" },
  { id: "a2", scale: "anthro",  lo: "기계 같은",        hi: "사람 같은",         en: "Machinelike – Humanlike" },
  { id: "a3", scale: "anthro",  lo: "의식이 없는",      hi: "의식이 있는",       en: "Unconscious – Conscious" },
  { id: "a4", scale: "anthro",  lo: "인공적인",         hi: "실물 같은",         en: "Artificial – Lifelike" },
  { id: "a5", scale: "anthro",  lo: "뻣뻣하게 움직이는", hi: "부드럽게 움직이는", en: "Moving rigidly – Moving elegantly" },
  { id: "n1", scale: "animacy", lo: "죽은",             hi: "살아 있는",         en: "Dead – Alive" },
  { id: "n2", scale: "animacy", lo: "정체된",           hi: "활기찬",            en: "Stagnant – Lively" },
  { id: "n3", scale: "animacy", lo: "기계적인",         hi: "유기적인",          en: "Mechanical – Organic" },
  { id: "n4", scale: "animacy", lo: "인공적인",         hi: "실물 같은",         en: "Artificial – Lifelike" },
  { id: "n5", scale: "animacy", lo: "무반응의",         hi: "상호작용하는",      en: "Inert – Interactive" },
  { id: "n6", scale: "animacy", lo: "무관심한",         hi: "반응하는",          en: "Apathetic – Responsive" },
];
// Gray, Gray & Wegner (2007) 마음 지각 — 원 연구의 쌍 비교를 7점 척도로 바꿔 쓴다
export const MIND = [
  { id: "g1", scale: "agency",     ko: "계획을 세울 수 있다",   en: "planning" },
  { id: "g2", scale: "agency",     ko: "기억할 수 있다",        en: "memory" },
  { id: "g3", scale: "agency",     ko: "생각할 수 있다",        en: "thought" },
  { id: "x1", scale: "experience", ko: "기쁨을 느낄 수 있다",   en: "joy" },
  { id: "x2", scale: "experience", ko: "두려움을 느낄 수 있다", en: "fear" },
  { id: "x3", scale: "experience", ko: "의식을 가지고 있다",    en: "consciousness" },
];
export const SCALES = [
  { id: "anthro",     ko: "의인화",  max: 5 },
  { id: "animacy",    ko: "생동감",  max: 5 },
  { id: "agency",     ko: "행위성",  max: 7 },
  { id: "experience", ko: "경험성",  max: 7 },
];
