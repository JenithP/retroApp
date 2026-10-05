// VR · AR 적용 판단 실습 — 카드 · 칸 · 이론 · 단계. 학생 화면 · 현황판 · 버셀 함수가 같은 파일을 읽는다.
//
// 6주차 온라인 「가상현실 · 증강현실과 뇌」 의 이론을 판단 기준으로 쓰는 실습이다.
//   분류 — 지금 쓰이는 사례 18장을 두 질문으로 나눈 네 칸에 놓고, 카드마다 근거 이론과 이유를 적는다
//   공유 — 반 전체가 카드마다 어디에 놓았는지 보고, 갈린 카드로 토론한다
//   재설계 — 우리 조 VR · AR 칸 카드 하나를 골라 다시 설계한다 (스케치 포함)
//   부작용 검토 — 짝 조(1·2조, 3·4조 …)끼리 서로의 설계안에 부작용을 입력한다
//   대응책 — 받은 부작용마다 대응책을 적는다
// 카드 문구는 인쇄용 카드(6주차자료/6주차_오프라인_사례카드_워크시트)와 같다. 고치면 둘 다 고친다.

export const TEAM_COUNT = 20;
export const MAX_CUSTOM = 4;
export const GEN_LIMIT = 2;   // 조당 화면 목업 생성 횟수 (토큰 절약)

export const PHASES = {
  ready:  "안내",
  sort:   "분류",
  share:  "공유",
  design: "재설계",
  side:   "부작용 검토",
  reply:  "대응책",
  end:    "종료",
};
export const PHASE_ORDER = ["ready", "sort", "share", "design", "side", "reply", "end"];

// 두 질문으로 나눈 네 칸 — 세로: 몸이 진짜처럼 반응해야 하는가 / 가로: 정보가 현실의 물건에 붙어야 하는가
// 화면에서는 위 줄이 「몸 반응 필요 높음」, 오른쪽 열이 「현실에 붙을 필요 높음」
export const QUADS = {
  vr:    { ko: "VR",             sub: "위험 · 고비용 · 재현 불가능 상황",  row: 0, col: 0, color: "#335593" },
  train: { ko: "AR · MR 훈련",   sub: "실물 조작 연습", row: 0, col: 1, color: "#548235" },
  keep:  { ko: "현행 유지",       sub: "개념 이해 · 정보 처리",     row: 1, col: 0, color: "#7A8188" },
  guide: { ko: "AR 안내",        sub: "대상 위 정보 표시",     row: 1, col: 1, color: "#0070C0" },
};
export const QUAD_KEYS = ["vr", "train", "keep", "guide"];
export const AXES = {
  y: { ko: "신체 반응 필요 여부", why: "실재감 · 체화" },
  x: { ko: "현실 사물과의 정보 결합 필요 여부", why: "분할 주의 · 정합" },
};

export const WARNS = [
  { n: 1, ko: "주의 분산 위험 상황", hint: "보행 · 운전 · 작업 중 사용", ref: "주의 터널링 (Wickens & Alexander, 2009)" },
  { n: 2, ko: "개념 이해 목적", hint: "원리 · 이론 · 개념 학습", ref: "외재적 인지 부하 (Makransky et al., 2019)" },
];

// 근거로 쓸 수 있는 이론 — 온라인 강의 슬라이드와 같은 이름
export const THEORIES = [
  { id: "place",   ko: "장소 · 개연성 착각", line: "예상과 일치하는 반응 시 현장감 발생",       ref: "Slater, 2009 · Meehan et al., 2002" },
  { id: "body",    ko: "몸의 착각",          line: "시각 · 촉각 일치 시 신체 소유감 발생", ref: "Botvinick & Cohen, 1998" },
  { id: "sick",    ko: "감각 갈등",          line: "시각 · 전정 감각 불일치에 따른 멀미",          ref: "Reason & Brand, 1975" },
  { id: "split",   ko: "분할 주의",          line: "분리된 정보 통합에 따른 작업 기억 소모",   ref: "Chandler & Sweller, 1991 · Tang et al., 2003" },
  { id: "tunnel",  ko: "주의 터널링",        line: "중첩 정보에 따른 주변 인식 저하",                ref: "Wickens & Alexander, 2009" },
  { id: "load",    ko: "외재적 부하",        line: "과제 무관 몰입 요소에 따른 학습 저하",        ref: "Makransky et al., 2019" },
  { id: "rbi",     ko: "실재 기반 인터랙션",  line: "현실 세계 지식 · 기술의 활용",        ref: "Jacob et al., 2008" },
  { id: "gap",     ko: "지각의 틈",          line: "감지 한계 내 감각 조정",    ref: "Steinicke et al., 2010 · Azmandian et al., 2016" },
];
export const theoryName = id => (THEORIES.find(t => t.id === id) || {}).ko || "";

export const CARDS = [
  { id: "1",  title: "소방 대피 훈련",     desc: "연기 찬 건물에서 출구를 찾아 대피하는 연습" },
  { id: "2",  title: "고소공포증 치료",     desc: "높은 곳에 조금씩 익숙해지는 치료" },
  { id: "3",  title: "가구 조립 설명서",    desc: "부품 30개짜리 책장을 혼자 조립" },
  { id: "4",  title: "비행기 정비 매뉴얼",  desc: "엔진 부품을 순서대로 점검 · 교체" },
  { id: "5",  title: "수술 실습",          desc: "전공의가 복강경 수술 기술을 익히기" },
  { id: "6",  title: "외국어 메뉴판",       desc: "해외 식당에서 메뉴를 읽고 주문" },
  { id: "7",  title: "박물관 전시 해설",    desc: "유물 앞에서 설명을 들으며 관람" },
  { id: "8",  title: "영어 단어 암기",      desc: "시험 전 단어 300개 외우기" },
  { id: "9",  title: "해부학 수업",        desc: "간호학과 학생이 인체 구조를 배우기" },
  { id: "10", title: "화학 반응 원리",      desc: "반응이 왜 일어나는지 원리를 이해하기" },
  { id: "11", title: "조선 궁궐 역사 수업", desc: "경복궁의 공간과 역사를 배우기" },
  { id: "12", title: "면접 연습",          desc: "면접관 앞에서 떨지 않고 말하기" },
  { id: "13", title: "옷 입어 보기",        desc: "온라인 쇼핑에서 옷이 나에게 맞는지 확인" },
  { id: "14", title: "집 구하기",          desc: "다른 도시의 매물을 둘러보고 고르기" },
  { id: "15", title: "은행 앱 송금",        desc: "친구에게 3만 원 보내기" },
  { id: "16", title: "수강 신청",          desc: "정해진 시간에 과목을 빠르게 담기" },
  { id: "17", title: "자전거 길 안내",      desc: "자전거를 타면서 다음 경로 확인" },
  { id: "18", title: "운전 중 내비게이션",  desc: "낯선 도로에서 다음 갈림길 확인" },
];
// 카드 그림 — img/cards/01.webp … 18.webp. 없으면 그림 없이 글자만 보인다.
// 그림은 「지금 방식」 의 장면만 담는다. 헤드셋이나 AR 화면을 그리면 답을 미리 알려 주는 셈이 된다.
export const cardImg = id => /^\d+$/.test(String(id)) ? `img/cards/${String(id).padStart(2, "0")}.webp` : null;
export const cardOf = (id, board) => CARDS.find(c => c.id === id) || (board?.cards?.[id] ? { id, title: board.cards[id].title || "우리 조 사례", desc: board.cards[id].desc || "", custom: true } : { id, title: id, desc: "" });

// 재설계 체크리스트 — 온라인 15쪽 「뇌의 원리가 곧 설계 지침」 을 질문으로 바꾼 것
export const CHECKS = [
  { id: "move",  ko: "예측 · 감각 갈등", q: "이동 방식 및 멀미 방지 방안" },
  { id: "body",  ko: "몸의 착각",       q: "사용자 손 · 신체 표시 여부 및 동작 반응" },
  { id: "place", ko: "분할 주의",       q: "정보 표시 위치 (화면 구석 / 대상 위)" },
  { id: "show",  ko: "주의 터널링",     q: "정보 표시 · 숨김 시점" },
  { id: "load",  ko: "인지 부하",       q: "몰입 요소 범위 및 제거 가능한 장식" },
  { id: "magic", ko: "현실 동작 유지 범위", q: "현실 동작 유지 범위 및 현실 이탈 지점 (예: 고고 기법)" },
];

// 부작용 — 온라인에서 다룬 것과 이후 주차(7주차 격차 · 14주차 프라이버시와 다크패턴)에서 다룰 것
export const SIDES = [
  { id: "sick",    ko: "멀미",       hint: "감각 갈등" },
  { id: "tunnel",  ko: "주의 터널링", hint: "주변 인식 저하" },
  { id: "load",    ko: "인지 부하",   hint: "몰입 요소에 따른 학습 저하" },
  { id: "privacy", ko: "프라이버시",  hint: "상시 카메라 · 시선 데이터" },
  { id: "gap",     ko: "비용 · 격차", hint: "기기 미보유자 배제" },
  { id: "manip",   ko: "지각 조작",   hint: "사용자 모르게 감각 변경" },
];
export const sideName = id => (SIDES.find(s => s.id === id) || {}).ko || "";

export const teamId = t => "T" + String(t).padStart(2, "0");
export const teamLabel = t => `${Number(t)}조`;
// 짝 조 — 1·2조, 3·4조 … 19·20조. 공유 단계의 짝 조 비교와 부작용 검토(서로 교환)에 쓴다.
export const pairOf = t => Number(t) % 2 ? Number(t) + 1 : Number(t) - 1;
export const sideTargetOf = t => pairOf(t);   // 우리 조가 부작용을 입력하는 설계안
export const sideFromOf = t => pairOf(t);     // 우리 설계안에 부작용을 입력하는 조
export const sideDocId = (target, from) => `${teamId(target)}_${teamId(from)}`;

// 카드 한 장의 근거가 다 찼는가 — 칸 · 이론 · 이유
export const cardDone = c => !!(c && c.q && c.theory && (c.why || "").trim().length >= 5);
