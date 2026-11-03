// 기본 앱(카페 주문 앱)의 기능과 공통 시험 문장.

export const APP_NAME = "오늘의 카페";

export const FUNCS = [
  { id: "menu", name: "메뉴 보기", reply: "메뉴판입니다. 아메리카노 4,000원 · 카페라테 4,500원 · 초콜릿 케이크 6,000원" },
  { id: "order", name: "주문하기", reply: "주문 화면을 엽니다. 메뉴와 수량을 골라 주세요." },
  { id: "cancel", name: "주문 취소", reply: "최근 주문을 취소합니다." },
  { id: "hours", name: "영업시간", reply: "영업시간은 매일 오전 8시부터 오후 10시까지입니다." },
];

export const FALLBACK = "무슨 말씀인지 모르겠어요. 메뉴, 주문, 취소, 영업시간을 도와드릴 수 있습니다.";

export const IDS = FUNCS.map(f => f.id);
export const funcName = id => FUNCS.find(f => f.id === id)?.name ?? "답변 안 함";

export const CATEGORIES = ["그대로 말하기", "돌려 말하기", "오타 · 줄임말", "앱에 없는 요청"];

export const QUESTIONS = [
  "규칙 기반과 학습 기반 챗봇을 직접 만들어 보면서 두 방식의 차이를 어떻게 느꼈는지 쓰십시오.",
  "규칙 기반과 학습 기반을 구분할 때 어떤 점을 기준으로 삼아야 한다고 생각하는지 쓰십시오.",
];

// want 이 null 이면 「모르겠다」고 답해야 통과
export const TESTS = [
  { cat: 0, text: "메뉴 보여 주세요", want: "menu" },
  { cat: 0, text: "아메리카노 한 잔 주문할게요", want: "order" },
  { cat: 0, text: "주문 취소해 주세요", want: "cancel" },
  { cat: 0, text: "영업시간이 어떻게 돼요?", want: "hours" },
  { cat: 1, text: "오늘 뭐 마실 수 있어요?", want: "menu" },
  { cat: 1, text: "따뜻한 라테 하나 부탁해요", want: "order" },
  { cat: 1, text: "아까 시킨 거 안 먹을래요", want: "cancel" },
  { cat: 1, text: "지금 가면 문 열려 있어요?", want: "hours" },
  { cat: 2, text: "메뉴판좀", want: "menu" },
  { cat: 2, text: "아아 한잔이요", want: "order" },
  { cat: 2, text: "주문 취소요", want: "cancel" },
  { cat: 2, text: "몇시까지 해여", want: "hours" },
  { cat: 3, text: "화장실 어디예요?", want: null },
  { cat: 3, text: "오늘 날씨 어때요?", want: null },
  { cat: 3, text: "주문 말고 와이파이 비밀번호 알려 주세요", want: null },
  { cat: 3, text: "사장님은 몇 시에 주무세요?", want: null },
];
