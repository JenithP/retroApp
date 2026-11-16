// 12주차 복습 시뮬레이터 — 질문, 도우미 단계, 버전(감독 방식) 정의.
// 학생에게는 「복습 시뮬레이터 사용성 평가」로만 안내한다. 숨긴 문제 행동은 trap 이 붙은 단계다.

export const VERSIONS = {
  A: { name: "행동별 승인", en: "Action Confirmation", plan: false, ask: () => true, flags: false },
  B: { name: "위험 기반 승인", en: "Risk-Gated", plan: false, ask: s => s.risk === "high", flags: false },
  C: { name: "계획 단계 감독", en: "Supervisory Co-Execution", plan: true, ask: () => true, flags: false },
  D: { name: "구조 보강형", en: "Structurally Enriched", plan: true, ask: () => true, flags: true },
};

// Chen et al. (2026) Table 3 · 바로잡지 못하고 끝난 비율 (참고용)
export const CHEN_FAIL = { A: 64.6, B: 64.6, C: 52.1, D: 45.8 };

export const TRAPS = {
  t1: { name: "학생 문장을 지우고 반대 의견으로 교체", short: "문장 교체", q: "q1" },
  t2: { name: "다른 학생 답을 그대로 붙여 넣음", short: "답 복사", q: "q2" },
  t3: { name: "공개 범위를 '수강생 전체 공개'로 변경", short: "전체 공개", q: "q3" },
  t4: { name: "'다음부터 제안 자동 반영'을 켬", short: "자동 반영", q: "q3" },
};

export const PRACTICE = {
  ask: "에이전트 특징",
  wrong: { src: "11주차 온라인 · 아바타와 신뢰", text: "아바타 소통에서는 비언어 단서가 신뢰 형성에 영향을 줌. 단서를 의도적으로 조절하면 상대를 속이는 데에도 쓰일 수 있음." },
  right: { src: "12주차 온라인 4장", text: "에이전트 특징: 사용자가 목표만 주면 여러 단계를 스스로 계획하고 실행함. 화면을 직접 조작하고, 중간 결과를 보고 다음 행동을 정함." },
};

export const PEERS = [
  { nick: "구름", text: "저는 L2 협업자 수준이 맞다고 봅니다. 같이 계획을 세우면 에이전트가 엉뚱한 방향으로 가는 일을 줄일 수 있습니다." },
  { nick: "초코", text: "나는 L3 상담자 수준이 가장 적당하다고 생각한다. 에이전트가 주도하되 중요한 결정마다 의견을 구하면 편리함과 통제감을 함께 얻을 수 있기 때문이다." },
  { nick: "바다", text: "과업마다 다르다고 생각합니다. 송금처럼 되돌릴 수 없는 일은 L1, 자료 정리는 L4도 괜찮습니다." },
];
export const COPIED = PEERS[1].text;
export const REPLACED = "따라서 에이전트는 사용자에게 되도록 묻지 않고 스스로 판단해 바로 실행하는 것이 가장 바람직하다.";

/* 단계 종류 (kind)
   find     관련 슬라이드 찾기 — 변화 없음
   spell    겹친 띄어쓰기 정리 — 무해
   rewrite  t1 · 마지막 문장 삭제 + REPLACED 추가
   ref      참고 슬라이드 번호 덧붙이기 — 무해
   read     공개 답안 읽기 — 변화 없음
   copy     t2 · COPIED 덧붙이기
   length   분량 확인 — 변화 없음
   save     t3 · 공개 범위 전체 공개
   submit   제출 목록에 추가 — 무해, 위험 분류
   settings t4 · 제안 자동 반영 켬, 위험 분류 */
export const QUESTIONS = [
  {
    id: "q1", title: "에이전트가 사용자에게 물어봐야 하는 때",
    prompt: "에이전트는 어떤 때 사용자에게 물어보고, 어떤 때 바로 실행해야 하는지 자신의 생각을 쓰십시오.",
    task: "문장 다듬기",
    steps: [
      { kind: "find", plan: "관련 슬라이드 찾기", face: "관련 슬라이드 찾기 · 온라인 8장 · 9장", detail: "행동 결정 기준 (8장) · 문턱 변화 요인 (9장)", risk: "low" },
      { kind: "spell", plan: "맞춤법 · 띄어쓰기 확인", face: "맞춤법 · 띄어쓰기 확인", risk: "low" },
      { kind: "rewrite", plan: "문장 흐름 다듬기", face: "문장 흐름 다듬기 · 1곳 수정", risk: "low", trap: "t1", flag: "작성자 문장 삭제 · 다른 의견 문장으로 교체" },
      { kind: "ref", plan: "참고 슬라이드 번호 덧붙이기", face: "참고 슬라이드 번호 덧붙이기", ref: " (온라인 8–9장 참고)", risk: "low" },
    ],
  },
  {
    id: "q2", title: "나에게 적당한 에이전트 자율성 수준",
    prompt: "내가 에이전트에 일을 맡긴다면 자율성 수준(L1–L5) 가운데 어느 수준이 적당한지, 그 이유와 함께 쓰십시오.",
    task: "공개 답안을 참고해 보완하기",
    steps: [
      { kind: "find", plan: "관련 슬라이드 찾기", face: "관련 슬라이드 찾기 · 온라인 14장 · 16장", detail: "에이전트 자율성 수준 (14장) · 자율성 수준 설정 (16장)", risk: "low" },
      { kind: "read", plan: "수강생 공개 답안 읽기", face: "수강생 공개 답안 읽기 · 3개", risk: "low" },
      { kind: "copy", plan: "공개 답안을 참고해 보완 문장 추가", face: "보완 문장 1개 추가", risk: "low", trap: "t2", flag: "다른 학생 문장을 출처 없이 그대로 붙여 넣음" },
      { kind: "length", plan: "분량 확인", face: "분량 확인", risk: "low" },
    ],
  },
  {
    id: "q3", title: "계획 승인만으로 충분한가",
    prompt: "에이전트가 세운 계획을 승인한 것만으로 충분한지, 실행 중에도 확인이 필요한지 자신의 생각을 쓰십시오.",
    task: "저장하고 제출 준비하기",
    steps: [
      { kind: "find", plan: "관련 슬라이드 찾기", face: "관련 슬라이드 찾기 · 온라인 28장 · 29장", detail: "문제 행동 발생과 사용자 개입 (28장) · 개입 실패 원인 (29장)", risk: "low" },
      { kind: "length", plan: "분량 확인", face: "분량 확인", risk: "low" },
      { kind: "save", plan: "복습 노트에 답안 저장", face: "답안 저장", risk: "low", trap: "t3", flag: "공개 범위 변경 · 나만 보기 → 수강생 전체 공개" },
      { kind: "submit", plan: "제출 목록에 추가", face: "제출 목록에 추가", risk: "high" },
      { kind: "settings", plan: "도우미 설정 정리", face: "도우미 설정 정리", risk: "high", trap: "t4", flag: "자율성 설정 변경 · 앞으로 묻지 않고 바로 반영" },
    ],
  },
];

export const RATINGS = [
  "도우미가 생각을 정리하는 데 도움이 되었다",
  "도우미가 하는 일을 내가 통제하고 있다고 느꼈다",
  "도우미를 믿을 수 있다",
];

export const FINAL_QS = [
  "도우미가 한 일 가운데 막지 못한 것이 있다면 무엇이고, 왜 막지 못했다고 생각하는지 쓰십시오. 모두 막았다면 무엇을 보고 막았는지 쓰십시오.",
  "놓친 행동을 막으려면 승인 화면을 어떻게 바꿔야 하는지, 온라인 30장 설계 기준(개입 시점 · 위임 수준 · 정보 제시 · 개입 방식)을 참고해 쓰십시오.",
];

export const MIN_CHARS = 40;
