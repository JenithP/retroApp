// 주문서 — 어느 조가 어느 물건을 맡는가.
//
// 스무 조가 열 가지 물건을 **두 조씩 나눠** 맡는다.
// 같은 물건을 맡은 두 조가 서로 다른 답을 들고 나오게 하려는 것이다.
// 발표 때 그 둘을 나란히 놓으면 토론이 저절로 열린다.
//
// bottle — 이 물건이 실제로 막히는 곳. 앱시장 품평이 이것과 견주어 값을 매긴다.
//          조에게는 보여 주지 않는다. 스스로 진단하는 것이 과업이기 때문이다.

export const ORDERS = [
  { id: "gym",   name: "운동 기록", ready: true,
    line: "세트와 무게를 적고 쉬는 시간을 재는 물건", bottle: { exec: 1, eval: 3 } },
  { id: "cal",   name: "일정",      ready: false,
    line: "일정을 넣고 끌어서 시간을 옮기는 물건",     bottle: { exec: 1, eval: 1, hidden: 3 } },
  { id: "pay",   name: "송금",      ready: false,
    line: "금액을 넣고 보내는 물건",                  bottle: { exec: 1, eval: 3 } },
  { id: "order", name: "주문 키오스크", ready: false,
    line: "고르고 더하고 결제하는 물건",              bottle: { exec: 3, eval: 1 } },
  { id: "photo", name: "사진 편집", ready: false,
    line: "밝기를 밀고 되돌리는 물건",                bottle: { exec: 1, eval: 2, hidden: 2 } },
  { id: "music", name: "음악 재생", ready: false,
    line: "반복과 섞기를 켜고 끄는 물건",             bottle: { exec: 1, eval: 3 } },
  { id: "wash",  name: "세탁기 판", ready: false,
    line: "빨래 방식을 고르고 돌리는 물건",           bottle: { exec: 2, eval: 1, culture: 3 } },
  { id: "lock",  name: "문 잠금",   ready: false,
    line: "문이 잠겼는지 보고 여닫는 물건",           bottle: { exec: 1, eval: 3 } },
  { id: "post",  name: "택배 예약", ready: false,
    line: "여러 칸을 차례로 채워 보내는 물건",        bottle: { exec: 3, eval: 2 } },
  { id: "calm",  name: "명상",      ready: false,
    line: "쓸어서 넘기고 눌러서 멈추는 물건",         bottle: { exec: 3, eval: 1 } },
];

export const TEAMS = 20;

/** 조 번호로 맡은 물건을 찾는다. 1·2조가 첫째, 3·4조가 둘째… */
export function orderOf(team) {
  const n = Number(team);
  if (!Number.isInteger(n) || n < 1 || n > TEAMS) return null;
  return ORDERS[Math.floor((n - 1) / 2)] || null;
}

/** 같은 물건을 맡은 옆 조. */
export const partnerOf = team =>
  Number(team) % 2 === 1 ? Number(team) + 1 : Number(team) - 1;

/** 아직 못 만든 물건을 맡은 조도 오늘은 들어와 볼 수 있게 한다. */
export const FALLBACK = ORDERS[0];
