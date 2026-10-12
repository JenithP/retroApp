// 조별 발표 — 문헌 · 일정 · 마감. 학생 화면 · 현황판 · 버셀 함수(api/present.js)가 같은 파일을 읽는다.
//
// 7주차 오프라인에서 교수가 문헌을 소개하고, 조가 논의해 문헌을 신청한다 (문헌 하나에 최대 3개 조).
// 조는 발표 자료(PDF)를 업로드 마감까지 올린다. 발표 1주일 전 정오에 그 주 4개 조의 자료가 열리고,
// 학생은 열린 발표마다 질문을 하나씩 등록한다. 발표 날 「질문 생성」을 누르면 AI가 발표 자료를 읽고
// 이해에 가장 날카롭고 도움이 되는 질문 3개를 골라 하나씩 보여준다. 채택된 질문자는 보너스 1점.

export const TEAM_COUNT = 20;
export const MAX_TEAMS_PER_PAPER = 3;
export const teamId = t => "T" + String(t).padStart(2, "0");
export const teamLabel = t => `${t}조`;

/** 한국 시각 날짜 · 시각 → Date */
export const kst = (date, hm = "00:00") => new Date(`${date}T${hm}:00+09:00`);

export const UPLOAD_DEADLINE = kst("2026-10-27", "11:59");   // 발표 자료 업로드 마감
export const WEEKS = ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24", "2026-12-01"];   // 매주 화요일
export const SLOTS_PER_WEEK = 4;
export const QUESTION_CLOSE_HM = "09:00";   // 발표 당일 이 시각까지 질문 등록
export const MAX_FILE_MB = 20;   // AI가 PDF를 통째로 읽으므로 20MB 이하

/** 발표 주차(0~4)의 자료 공개 시각 — 발표 1주일 전 정오 */
export const openAt = w => { const d = kst(WEEKS[w], "12:00"); d.setDate(d.getDate() - 7); return d; };
/** 질문 마감 — 발표 당일 아침 */
export const questionCloseAt = w => kst(WEEKS[w], QUESTION_CLOSE_HM);
export const WEEK_NO = [10, 11, 12, 13, 14];   // 수업 주차 — WEEKS 와 같은 순서
export const weekName = w => `${WEEK_NO[w]}주차`;
export const weekDate = w => { const d = kst(WEEKS[w], "12:00"); return `${d.getMonth() + 1}월 ${d.getDate()}일 (화)`; };
export const weekLabel = w => `${weekName(w)} · ${weekDate(w)}`;
export const fmt = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/* ── 문헌 목록 ─────────────────────────────────────────
   교수가 7주차 오프라인에서 소개하는 문헌. 설명은 학생이 고를 때 보는 요약이다.
   필드: id(바꾸지 말 것 — 신청 기록이 이 값으로 남음) · tag(발전 방향 · 해결 과제) · ko(우리말 제목) · authors · year ·
         title · venue · summary(무엇을 다루나) · method(어떻게) · finding(무엇을 발견했나) · link(강의 연결) ·
         angles(발표에서 다뤄 볼 만한 방향) · url(원문) */
export const PAPERS = [
  {
    id: "p01", tag: "지능화", ko: "넷플릭스 추천 시스템 — 알고리즘, 사업적 가치, 혁신",
    authors: "Gomez-Uribe, C. A. & Hunt, N.", year: 2015,
    title: "The Netflix Recommender System: Algorithms, Business Value, and Innovation",
    venue: "ACM Transactions on Management Information Systems, 6(4), Article 13",
    summary: "넷플릭스 홈 화면을 만드는 추천 알고리즘들(장르 행 순위, Top Picks, 인기 급상승, 이어보기, '시청하신 작품과 비슷한', 페이지 구성, 검색)이 각각 무슨 일을 하는지, 그리고 추천이 회사에 주는 가치를 넷플릭스 내부 연구자가 설명한 글입니다.",
    method: "실험 논문이 아니라 사례 보고입니다. 회원 시청 데이터, 2~6개월씩 진행하는 대규모 A/B 테스트, 과거 데이터로 하는 오프라인 실험을 근거로 듭니다.",
    finding: "회원은 60~90초 안에 볼 것을 찾지 못하면 흥미를 잃고, 시청 시간의 약 80%가 추천에서 나옵니다. 개인화로 해지가 줄어 연간 10억 달러 이상을 아낀다고 추정합니다. 어떤 추천이 좋은지는 직원의 직관이 아니라 회원 유지율로 판단합니다.",
    link: "지능화 — 데이터와 머신러닝이 사용자의 선택지를 미리 좁혀 주는 미디어. 저자들 스스로 인기작이 더 추천되는 순환 구조와 계정 공유 문제를 한계로 꼽습니다.",
    angles: ["추천이 선택을 돕는가, 선택 폭을 좁히는가 (다양성 지표와 피드백 루프 비교)", "회사가 쓰는 '좋은 추천'의 기준(유지율 · 시청 시간)과 이용자의 이익 비교", "조원들의 넷플릭스 홈 화면을 캡처해 논문 설명과 맞춰 보기"],
    url: "https://doi.org/10.1145/2843948",
  },
  {
    id: "p02", tag: "지능화 · 몰입화", ko: "멀티모달 인터랙션 리뷰",
    authors: "Turk, M.", year: 2014,
    title: "Multimodal interaction: A review",
    venue: "Pattern Recognition Letters, 36, 189–195",
    summary: "말 · 몸짓 · 터치 · 시선처럼 여러 감각 통로를 함께 쓰는 멀티모달 인터랙션의 역사, 장점, 설계 원칙, 기술 과제를 정리한 리뷰입니다.",
    method: "실험 없는 문헌 리뷰입니다. 'Put That There'(1980), QuickSet 같은 대표 시스템, Oviatt의 '멀티모달에 대한 10가지 오해', 뇌의 감각 통합 연구를 묶어 논의합니다.",
    finding: "여러 입력을 함께 쓰는 장점은 속도보다 오류 감소와 다양한 사용자(장애 · 노인 · 아동) 수용에 있습니다. 입력을 따로 인식해 마지막에 합치는 방식이 흔하지만, 사람의 뇌처럼 감각을 일찍부터 엮는 방식이 더 유망하다고 봅니다.",
    link: "지능화와 몰입화 — 사람끼리 대화하듯 말과 몸짓으로 기계와 소통하는 방향. 카메라와 마이크가 늘 켜져 있어야 한다는 점에서 프라이버시와도 이어집니다.",
    angles: ["2013년 논문이 꼽은 과제를 지금의 멀티모달 AI · 스마트 글라스 · VR 기기와 비교", "'사용자는 생각만큼 여러 입력을 섞어 쓰지 않는다'는 주장을 직접 관찰로 확인", "여러 입력 방식이 주는 접근성과 상시 감지가 낳는 프라이버시 부담 사이의 긴장"],
    url: "https://doi.org/10.1016/j.patrec.2013.07.003",
  },
  {
    id: "p03", tag: "몰입화", ko: "몰입형 가상현실로 삶을 풍요롭게",
    authors: "Slater, M. & Sanchez-Vives, M. V.", year: 2016,
    title: "Enhancing Our Lives with Immersive Virtual Reality",
    venue: "Frontiers in Robotics and AI, 3, Article 74",
    summary: "몰입과 프레즌스라는 개념 틀을 세우고, 과학 · 교육 · 훈련 · 운동 · 사회심리 · 도덕 판단 · 원격 협업 · 저널리즘에서 몰입형 VR이 어떻게 쓰였는지 검토한 글입니다.",
    method: "새 실험이 아니라 동료심사 연구들을 분야별로 검토합니다. 가상 밀그램 실험(34명), 방관자 실험(40명), 도덕 딜레마 실험(293명) 같은 연구를 근거로 듭니다.",
    finding: "몰입은 시스템의 성능, 프레즌스는 사람의 경험입니다. 프레즌스는 '거기 있다'는 장소 착시와 '일어나는 일이 진짜 같다'는 개연성 착시로 나뉩니다. 가짜인 줄 알면서도 실제처럼 반응하기 때문에, 가상 신체를 바꾸면 태도까지 바뀔 수 있다는 결과(인종 편향 감소)도 나옵니다.",
    link: "몰입화 — 같은 공간에 있는 듯한 경험을 만드는 미디어의 기본 개념(몰입 · 장소 착시 · 개연성 착시 · 신체 소유감)을 제공합니다.",
    angles: ["장소 착시와 개연성 착시로 요즘 VR 게임 · 공연 · 360° 영상 분석하기 — 어디서 착시가 깨지는가", "가상 신체로 태도를 바꾸는 연구와 반대 결과(편향이 커진 연구) 비교", "사람의 마음을 움직이는 몰입형 저널리즘의 윤리"],
    url: "https://doi.org/10.3389/frobt.2016.00074",
  },
  {
    id: "p04", tag: "몰입화 · 감성화", ko: "HapMotion — VR 공연을 위한 동작-촉각 변환",
    authors: "Jung, K., Kim, S., Oh, S. & Yoon, S. H.", year: 2024,
    title: "HapMotion: motion-to-tactile framework with wearable haptic devices for immersive VR performance experience",
    venue: "Virtual Reality, 28, Article 13",
    summary: "VR 공연에서 공연자의 상체 움직임을 관객이 입은 햅틱 조끼와 어깨 슬리브의 진동으로 실시간 전달하는 시스템을 만들고 평가한 연구입니다 (KAIST 등 국내 연구팀).",
    method: "손 · 반대쪽 어깨 · 몸통 중심을 잇는 삼각형으로 진동 위치와 세기를 계산합니다. 24명이 참여해, 실험 1에서 기존 방식과 비교하고 실험 2에서 소리→진동, 동작→진동, 두 방식 결합을 비교했습니다 (7점 척도 설문).",
    finding: "새 방식이 기존 방식보다 자연스러움(5.74 대 3.55) · 몰입(5.77 대 3.38) 점수가 높았습니다. 선호도는 동작→진동 58.4%, 결합 30.5%, 소리→진동 11.1% 순이었습니다.",
    link: "몰입화와 감성화 — 보고 듣는 데 촉각을 더해, 멀리 있는 공연자의 몸짓을 관객이 몸으로 느끼게 합니다.",
    angles: ["촉각이 왜 몰입을 높이는가 — 감각 통합 · 고무손 착시와 연결", "원격 공연에서 공연자와 관객 사이의 교감을 기술이 어떻게 메우는가", "표본 24명, 주관 설문 의존, 표의 통계 수치 불일치 등 연구 방법 비판적으로 읽기"],
    url: "https://doi.org/10.1007/s10055-023-00910-z",
  },
  {
    id: "p05", tag: "해결 과제 · 프라이버시", ko: "인간 중심 디자인으로 사용 가능한 보안과 프라이버시 만들기",
    authors: "Groen, E. C., Feth, D., Polst, S., Tolsdorf, J., Wiefling, S., Lo Iacono, L. & Schmitt, H.", year: 2023,
    title: "Achieving Usable Security and Privacy Through Human-Centered Design",
    venue: "In Gerber, Stöver & Marky (Eds.), Human Factors in Privacy Research (pp. 83–113), Springer",
    summary: "보안 · 개인정보 보호 기능을 사람들이 실제로 이해하고 쓸 수 있게 만들려면, 인간 중심 디자인(ISO 9241-210) 과정 안에 프라이버시를 어떻게 넣어야 하는지 다룬 책의 한 장입니다.",
    method: "기존 연구와 저자들의 프로젝트 경험을 정리한 방법론입니다. 정신 모델 조사, 사용자 요구 도출 워크숍(색깔 카드 · 문장 틀), 사용자 유형과 프라이버시 페르소나 세 가지 도구를 소개하고 네덜란드 방송사 사례에 적용해 봅니다.",
    finding: "사람들은 인터넷과 보안을 단순하고 불완전하게 이해합니다. 정보를 내주는 쪽은 투명성 · 자기결정 · 보안을, 정보를 쓰는 쪽은 처리 · 처리 정보를 요구합니다. 이를 설계 초기부터 반영해야 GDPR 제25조의 '설계 단계부터 · 기본 설정부터 보호' 원칙을 지킬 수 있다고 봅니다.",
    link: "해결 과제(프라이버시) — 지능화 · 연결화로 개인정보 처리가 늘어날수록, 보호 장치를 사용자가 이해하고 쓸 수 있게 설계하는 일이 중요해집니다.",
    angles: ["자주 쓰는 앱 하나의 개인정보 설정 화면을 다섯 가지 요구로 진단", "수강생 6명 이상으로 요구 도출 워크숍을 직접 해 보고 우선순위 정하기", "한국 대학생 프라이버시 페르소나 만들기 — '내 데이터가 어디로 가는지' 그림으로 그려 비교"],
    url: "https://doi.org/10.1007/978-3-031-28643-8_5",
  },
  {
    id: "p06", tag: "해결 과제 · 디지털 격차", ko: "디지털 격차 — 연구 리뷰와 향후 과제",
    authors: "Lythreatis, S., Singh, S. K. & El-Kassar, A.-N.", year: 2022,
    title: "The digital divide: A review and future research agenda",
    venue: "Technological Forecasting and Social Change, 175, 121359",
    summary: "2017~2021년 연구를 체계적으로 검토해 디지털 격차(접근 · 활용 · 결과의 불평등)에 영향을 주는 요인을 정리하고, 새로운 형태의 격차가 나타났는지 살핀 리뷰입니다.",
    method: "체계적 문헌 리뷰입니다. 두 데이터베이스에서 찾은 441편을 학술지 등급 등으로 걸러 최종 50편(24개국)을 내용분석했습니다.",
    finding: "영향 요인은 인구학 · 사회경제 · 개인 요소 · 사회적 지원 · 기술 유형 · 디지털 교육 · 권리 · 인프라 · 대형 사건(코로나19) 9개 범주로 묶이고, 가장 자주 등장한 요인은 교육(15회)과 나이(14회)입니다. 스마트폰으로만 접속하는 격차, 그리고 알고리즘을 아는지에 따른 격차와 데이터 불평등을 새로운 단계로 제안합니다.",
    link: "해결 과제(디지털 격차) — 기술이 지능화 · 연결화될수록 접속뿐 아니라 활용 능력, 얻는 결과, 알고리즘 이해에서도 격차가 생깁니다.",
    angles: ["알고리즘 인식 격차 — 주변 사람들이 추천 알고리즘을 어떻게 이해하는지 인터뷰해 유형 분류", "스마트폰만으로 과제 · 행정 · 금융을 처리할 때의 제약 사례", "키오스크 · 모바일 뱅킹 등 세대 간 격차와 같은 세대 안의 차이"],
    url: "https://doi.org/10.1016/j.techfore.2021.121359",
  },
  {
    id: "p07", tag: "해결 과제 · AI 위험", ko: "언어모델이 낳는 윤리적 · 사회적 위험",
    authors: "Weidinger, L. 외 22명 (DeepMind)", year: 2021,
    title: "Ethical and social risks of harm from Language Models",
    venue: "arXiv:2112.04359",
    summary: "대규모 언어모델이 일으킬 수 있는 위험을 6개 영역 21개 항목으로 정리한 분류 보고서입니다. 차별 · 배제 · 유해 표현, 정보 위해(개인정보 유출), 오정보, 악의적 사용, 인간-컴퓨터 상호작용 피해, 자동화 · 접근 · 환경 피해를 다룹니다.",
    method: "새 실험이 아니라 AI 윤리 · 언어학 · 사회과학 문헌, 시민단체 분석, 뉴스 보도를 폭넓게 검토했습니다. 위험마다 가상의 대화 예시를 붙이고, 이미 관찰된 위험인지 앞으로 예상되는 위험인지 표시했습니다.",
    finding: "언어모델은 학습 데이터의 편향을 그대로 반영하고, 그럴듯한 것과 사실을 구별하지 못하는 구조적 한계가 있어 모델을 키우는 것만으로는 해결되지 않는다고 봅니다. 한 위험을 줄이려다 다른 위험이 커질 수 있어 함께 관리해야 하며, 대화형 AI에 대한 HCI 연구가 부족하다고 지적합니다. 국내 챗봇 '이루다'의 개인정보 노출 사례도 실려 있습니다.",
    link: "해결 과제(AI 위험) — 지능화의 그늘을 체계적으로 정리했습니다. 프라이버시, 디지털 격차, 사람 같은 챗봇에 대한 과신까지 다룹니다.",
    angles: ["2021년에 '예상'으로 표시된 위험이 지금의 생성형 AI 서비스에서 실제로 나타났는지 사례로 확인", "인간-컴퓨터 상호작용 피해(의인화 · 과신 · 챗봇에 털어놓는 개인정보)에 집중한 설계 대안", "이루다 사건과 국내 음성 비서의 여성화 사례 분석"],
    url: "https://arxiv.org/abs/2112.04359",
  },
  {
    id: "p08", tag: "해결 과제 · FoMO", ko: "고립공포감(FoMO), 문제적 스마트폰 사용, SNS 피로의 관계",
    authors: "Tugtekin, U., Barut Tugtekin, E., Kurt, A. A. & Demir, K.", year: 2020,
    title: "Associations Between Fear of Missing Out, Problematic Smartphone Use, and Social Networking Services Fatigue Among Young Adults",
    venue: "Social Media + Society, 6(4), 1–17",
    summary: "튀르키예 대학생을 대상으로 고립공포감(FoMO), SNS 피로, 문제적 스마트폰 사용이 서로 어떻게 관련되는지 살펴본 설문 연구입니다.",
    method: "먼저 SNS 피로 척도(32문항 · 8요인)를 튀르키예어로 옮겨 225명으로 검증하고, 이어 교육학부생 469명 중 448명의 응답을 상관분석 · 회귀분석 · 성별 비교로 분석했습니다.",
    finding: "FoMO와 SNS 피로가 함께 문제적 스마트폰 사용의 약 33%를 설명했고, FoMO의 영향이 더 컸습니다. SNS 피로는 메시지가 쏟아지는 소통 과부하, 기능이 계속 늘어나는 기능 과부하와 가장 강하게 관련됐습니다. 여학생이 피로와 과사용 점수가 높았지만 FoMO는 성별 차이가 없었습니다.",
    link: "해결 과제(FoMO) — 연결화로 늘 접속된 환경이 놓칠까 봐 불안한 마음과 피로를 낳고, 그것이 스마트폰 과사용으로 이어지는 경로를 보여 줍니다.",
    angles: ["같은 문항으로 수강생 간이 설문을 해 튀르키예 결과와 비교", "알림 · 잦은 업데이트 · 읽음 표시 같은 앱 설계를 소통 · 기능 과부하와 연결하고 개선안 제안", "편의표본 · 한 번 측정 · 상관을 인과처럼 읽는 서술 등 연구 방법의 한계 짚기"],
    url: "https://doi.org/10.1177/2056305120963760",
  },
];
export const paperOf = id => PAPERS.find(p => p.id === id);
