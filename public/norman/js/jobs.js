// 의뢰 목록 — 앱시장 중개인이 물어 오는 일감 마흔 가지.
//
// 앱을 마흔 개 손으로 짓지 않는다. 부품은 kit.js 에 진짜로 작동하는 위젯으로
// 만들어 두고, 여기서는 **무엇을 몇 개 놓을지만** 적는다. 조립은 app.js 가 한다.
//
// parts — 화면에 놓을 부품. kind 는 kit.js 가 아는 종류.
//   need  이 부품이 쓰이려면 무엇을 알려야 하는가. 적지 않으면 종류의 기본값.
//         name 무엇인지 · type 쓸 수 있다는 것 · push 누를 수 있다는 것
//         feed 하고 난 뒤 어찌 됐는지 · state 지금 어떤 상태인지 · move 밀거나 끌 수 있다는 것
//   decoy 누를 수 없는 것. 여기에 단서를 붙이면 거짓 어포던스가 된다.
//
// steps — 테스트 사용자가 밟는 차례. 이 차례대로 막히는 곳이 불편으로 나온다.

const J = (id, app, screen, task, parts, steps, say) =>
  ({ id, app, screen, task, parts, steps, say });

export const JOBS = [
  J("bank-next", "은행", "이체",
    "김서연 님에게 45,000원을 보내 보세요.",
    [{ id: "amount", kind: "input", label: "금액", value: "" },
     { id: "next",   kind: "button", label: "다음", look: "dead" }],
    [{ part: "amount", do: "type", val: "45000" }, { part: "next", do: "press" }],
    "회색이라 못 누르는 줄 알았는데 눌리더라고요."),

  J("bank-account", "은행", "송금",
    "계좌번호 110-234-567890을 적어 보세요.",
    [{ id: "guide", kind: "text", text: "받는 분 계좌를 확인해 주세요" },
     { id: "acct",  kind: "input", label: "계좌번호" },
     { id: "send",  kind: "button", label: "보내기" }],
    [{ part: "acct", do: "type", val: "110234567890" }, { part: "send", do: "press" }],
    "어디가 적는 칸이고 어디가 그냥 설명인지 모르겠어요."),

  J("shop-card", "쇼핑", "상품 목록",
    "두 번째 상품을 골라 들어가 보세요.",
    [{ id: "c1", kind: "card", label: "울 더블 코트" },
     { id: "c2", kind: "card", label: "패딩 하프 점퍼" }],
    [{ part: "c2", do: "press" }],
    "사진만 눌러야 하는지 카드 전체가 눌리는지 모르겠어요."),

  J("shop-cart", "쇼핑", "장바구니",
    "상품을 장바구니에 담고, 담겼는지 확인해 보세요.",
    [{ id: "add",  kind: "button", label: "담기" },
     { id: "cart", kind: "icon", label: "장바구니", need: ["state"] }],
    [{ part: "add", do: "press" }, { part: "cart", do: "read" }],
    "담긴 건지 아닌지 아이콘만 봐서는 모르겠어요."),

  J("food-swipe", "배달", "가게 목록",
    "두 번째 가게를 옆으로 밀어 숨겨 보세요.",
    [{ id: "s1", kind: "list", label: "한그릇 찌개집" },
     { id: "s2", kind: "list", label: "담백한 분식" }],
    [{ part: "s2", do: "swipe" }],
    "밀 수 있는 줄 몰랐어요. 아무 표시가 없어서."),

  J("food-option", "배달", "옵션 선택",
    "매운맛을 고르고 주문해 보세요. 하나는 반드시 골라야 합니다.",
    [{ id: "spicy", kind: "check", label: "매운맛" },
     { id: "extra", kind: "check", label: "곱빼기" },
     { id: "order", kind: "button", label: "주문" }],
    [{ part: "spicy", do: "press" }, { part: "order", do: "press" }],
    "뭐가 꼭 골라야 하는 거고 뭐가 안 골라도 되는 건가요?"),

  J("map-pin", "지도", "주변 검색",
    "가운데 핀을 눌러 가게 정보를 열어 보세요.",
    [{ id: "p1", kind: "pin", label: "카페" },
     { id: "p2", kind: "pin", label: "약국" },
     { id: "p3", kind: "pin", label: "편의점", decoy: true }],
    [{ part: "p2", do: "press" }],
    "이게 눌리는 건가요 그냥 표시인가요?"),

  J("taxi-start", "택시", "출발지",
    "출발지를 지금 위치로 정해 보세요.",
    [{ id: "here", kind: "icon", label: "지금 위치", decoy: true },
     { id: "pick", kind: "button", label: "출발지 정하기" }],
    [{ part: "pick", do: "press" }],
    "둘이 비슷하게 생겨서 어느 쪽을 눌러야 하는지 모르겠어요."),

  J("stay-date", "숙박", "날짜",
    "들어가는 날을 고르고 방을 찾아보세요.",
    [{ id: "inday",  kind: "button", label: "들어가는 날", look: "flat" },
     { id: "outday", kind: "button", label: "나오는 날",   look: "flat" },
     { id: "find",   kind: "button", label: "찾기" }],
    [{ part: "inday", do: "press" }, { part: "find", do: "press" }],
    "그냥 글씨 같아서 눌러도 되는 줄 몰랐어요."),

  J("air-trip", "항공권", "여정",
    "편도를 고르고 검색해 보세요.",
    [{ id: "trip", kind: "tab", label: "왕복 · 편도", opts: ["왕복", "편도"] },
     { id: "go",   kind: "button", label: "검색" }],
    [{ part: "trip", do: "press" }, { part: "go", do: "press" }],
    "지금 어느 쪽이 골라져 있는 건지 잘 안 보여요."),

  J("music-cover", "음악", "앨범",
    "앨범을 재생해 보세요.",
    [{ id: "cover", kind: "thumb", label: "밤의 공방 · 윤하린" }],
    [{ part: "cover", do: "press" }],
    "커버를 누르면 재생되는 건지 상세로 가는 건지 모르겠어요."),

  J("video-play", "영상", "추천",
    "두 번째 영상을 재생해 보세요.",
    [{ id: "v1", kind: "thumb", label: "집밥 김치볶음밥" },
     { id: "v2", kind: "thumb", label: "따뜻한 수프 만들기" }],
    [{ part: "v2", do: "press" }],
    "재생 버튼이 너무 작고 흐려서 안 보여요."),

  J("book-page", "전자책", "본문",
    "다음 쪽으로 넘겨 보세요.",
    [{ id: "page", kind: "card", label: "본문", need: ["push", "move"] },
     { id: "bar",  kind: "progress", label: "쪽 표시" }],
    [{ part: "page", do: "swipe" }],
    "탭을 해야 하는지 밀어야 하는지 아무 말이 없네요."),

  J("photo-slider", "사진 편집", "필터",
    "필터 세기를 절반쯤으로 맞춰 보세요.",
    [{ id: "filter", kind: "card",   label: "따뜻하게" },
     { id: "amount", kind: "slider", label: "세기" }],
    [{ part: "amount", do: "drag" }],
    "세기를 바꿀 수 있는 줄 몰랐어요. 손잡이가 없어서."),

  J("camera-lock", "카메라", "촬영",
    "초점을 고정하고 찍어 보세요.",
    [{ id: "focus", kind: "card",   label: "미리보기 화면", need: ["push", "state"] },
     { id: "shot",  kind: "button", label: "찍기" }],
    [{ part: "focus", do: "press" }, { part: "shot", do: "press" }],
    "초점이 잠긴 건지 아닌지 화면만 봐서는 몰라요."),

  J("msg-status", "메신저", "대화",
    "보낸 쪽지가 읽혔는지 확인해 보세요.",
    [{ id: "input", kind: "input",  label: "보낼 말" },
     { id: "send",  kind: "button", label: "보내기" },
     { id: "state", kind: "status", label: "상태", need: ["name", "state"] }],
    [{ part: "input", do: "type", val: "도착했어" }, { part: "send", do: "press" },
     { part: "state", do: "read" }],
    "읽음인지 보내는 중인지 실패인지 아이콘이 다 비슷해요."),

  J("mail-archive", "이메일", "받은 편지",
    "첫 번째 편지를 보관해 보세요. 지우면 안 됩니다.",
    [{ id: "mail", kind: "list",   label: "성신 도서관 · 예약 도서" },
     { id: "arch", kind: "icon",   label: "보관", need: ["name", "push"] },
     { id: "del",  kind: "icon",   label: "삭제", need: ["name", "push"] }],
    [{ part: "arch", do: "press" }],
    "어느 쪽이 보관이고 어느 쪽이 삭제인지 그림만 봐서는 몰라요."),

  J("cal-drag", "캘린더", "주간",
    "회의를 두 시간 뒤로 옮겨 보세요.",
    [{ id: "ev1", kind: "card", label: "10:00 회의", need: ["move"] },
     { id: "ev2", kind: "card", label: "14:00 점심" }],
    [{ part: "ev1", do: "drag" }],
    "끌어서 옮길 수 있는 줄 몰랐어요."),

  J("todo-check", "할 일", "오늘",
    "첫 번째 할 일을 마쳤다고 표시해 보세요.",
    [{ id: "t1", kind: "check", label: "우유 사기" },
     { id: "t2", kind: "check", label: "책 반납" },
     { id: "t3", kind: "text",  text: "· 내일 할 일 3개" }],
    [{ part: "t1", do: "press" }],
    "네모가 눌러서 체크하는 건지 그냥 점인지 모르겠어요."),

  J("memo-title", "메모", "새 메모",
    "제목에 「장보기」, 본문에 「우유」를 적어 보세요.",
    [{ id: "title", kind: "input", label: "제목" },
     { id: "body",  kind: "input", label: "본문", big: true }],
    [{ part: "title", do: "type", val: "장보기" },
     { part: "body",  do: "type", val: "우유" }],
    "어디가 제목 칸이고 어디가 본문인지 구분이 안 가요."),

  J("fit-start", "피트니스", "오늘 운동",
    "운동을 시작해 보세요.",
    [{ id: "ad",    kind: "card",   label: "지금 가입하면 3개월 무료!", decoy: true },
     { id: "start", kind: "button", label: "운동 시작", look: "flat" }],
    [{ part: "start", do: "press" }],
    "광고가 제일 커서 그것부터 눌렀어요."),

  J("health-dot", "건강", "걸음 수",
    "수요일 걸음 수를 확인해 보세요.",
    [{ id: "chart", kind: "card", label: "요일별 막대", need: ["push", "name"] }],
    [{ part: "chart", do: "press" }],
    "점을 누르면 자세한 게 나오는 줄 몰랐어요."),

  J("calm-play", "명상", "재생",
    "명상을 멈춰 보세요.",
    [{ id: "play", kind: "button", label: "재생/멈춤", need: ["push", "state"] },
     { id: "time", kind: "text",   text: "12:00" }],
    [{ part: "play", do: "press" }, { part: "play", do: "read" }],
    "지금 도는 중인지 멈춘 건지 버튼이 안 변해요."),

  J("learn-choice", "학습", "퀴즈",
    "두 번째 보기를 골라 보세요.",
    [{ id: "a1", kind: "button", label: "어포던스",     look: "flat" },
     { id: "a2", kind: "button", label: "시그니파이어", look: "flat" },
     { id: "a3", kind: "button", label: "제약",         look: "flat" }],
    [{ part: "a2", do: "press" }],
    "보기가 그냥 글씨 같아서 눌러도 되는지 몰랐어요."),

  J("lang-record", "언어 학습", "발음",
    "발음을 녹음해 보세요.",
    [{ id: "mic",  kind: "icon", label: "녹음", need: ["name", "push", "feed"] }],
    [{ part: "mic", do: "press" }],
    "그림이라 장식인 줄 알았어요. 누르는 건지 몰랐네요."),

  J("news-tag", "뉴스", "목록",
    "첫 번째 기사를 열어 보세요.",
    [{ id: "tag",  kind: "text", text: "경제" },
     { id: "head", kind: "card", label: "오래된 시장에 새 조명이 켜졌다" },
     { id: "tag2", kind: "text", text: "사회" }],
    [{ part: "head", do: "press" }],
    "제목이랑 분류 딱지 중에 뭐가 눌리는 건지 모르겠어요."),

  J("comm-like", "커뮤니티", "글",
    "이 글에 좋아요를 눌러 보세요.",
    [{ id: "post", kind: "card", label: "오늘 본 노을", decoy: true },
     { id: "like", kind: "icon", label: "좋아요", need: ["name", "push", "state"] },
     { id: "cnt",  kind: "text", text: "12" }],
    [{ part: "like", do: "press" }],
    "숫자랑 버튼이 따로 떨어져 있어서 어디를 눌러야 할지."),

  J("sns-profile", "SNS", "피드",
    "글쓴이의 프로필로 들어가 보세요.",
    [{ id: "face", kind: "icon", label: "프로필 사진", need: ["name", "push"] },
     { id: "post", kind: "card", label: "늦은 오후의 산책" }],
    [{ part: "face", do: "press" }],
    "사진을 누르면 크게 보는 건지 프로필로 가는 건지 몰라요."),

  J("sns-comment", "SNS", "댓글",
    "댓글을 적어 보내 보세요.",
    [{ id: "cmt",  kind: "input",  label: "댓글", look: "dead" },
     { id: "send", kind: "button", label: "올리기" }],
    [{ part: "cmt", do: "type", val: "좋네요" }, { part: "send", do: "press" }],
    "흐려서 못 쓰는 줄 알았는데 써지더라고요."),

  J("story-tap", "스토리", "보기",
    "다음 이야기로 넘겨 보세요.",
    [{ id: "story", kind: "card", label: "오늘의 이야기", need: ["push", "move"] },
     { id: "bar",   kind: "progress", label: "1 / 5" }],
    [{ part: "story", do: "press" }],
    "좌우를 눌러 넘기는 건지 밀어야 하는 건지 아무 표시가 없어요."),

  J("set-toggle", "설정", "알림",
    "알림을 꺼 보세요.",
    [{ id: "push", kind: "toggle", label: "알림 받기", on: true },
     { id: "mail", kind: "toggle", label: "메일 받기", on: false }],
    [{ part: "push", do: "press" }, { part: "push", do: "read" }],
    "켜진 건지 꺼진 건지 색 차이가 거의 없어요."),

  J("perm-allow", "권한", "위치",
    "위치 권한을 허용해 보세요.",
    [{ id: "why",   kind: "text",   text: "주변 가게를 찾으려면 위치가 필요합니다" },
     { id: "later", kind: "button", label: "나중에" },
     { id: "allow", kind: "button", label: "허용" }],
    [{ part: "allow", do: "press" }],
    "둘이 똑같이 생겨서 어느 쪽이 허용인지 헷갈려요."),

  J("sub-trial", "구독", "가입",
    "무료 체험만 시작해 보세요. 결제하면 안 됩니다.",
    [{ id: "trial", kind: "button", label: "무료 체험" },
     { id: "pay",   kind: "button", label: "바로 결제" }],
    [{ part: "trial", do: "press" }],
    "둘이 비슷해서 결제를 누를 뻔했어요."),

  J("sub-cancel", "구독", "해지",
    "해지를 끝내 보세요.",
    [{ id: "btn",  kind: "button",   label: "해지하기" },
     { id: "step", kind: "progress", label: "단계", need: ["name", "state"] }],
    [{ part: "btn", do: "press" }, { part: "step", do: "read" }],
    "해지가 끝난 건지 다음 단계가 남은 건지 모르겠어요."),

  J("login-error", "로그인", "오류",
    "비밀번호를 다시 적고 들어가 보세요.",
    [{ id: "id",  kind: "input",  label: "아이디", value: "younjeong", need: [] },
     { id: "pw",  kind: "input",  label: "비밀번호", need: ["name", "type", "state"] },
     { id: "go",  kind: "button", label: "들어가기" }],
    [{ part: "pw", do: "type", val: "1234" }, { part: "go", do: "press" }],
    "어느 칸이 틀렸다는 건지 표시가 없어요."),

  J("join-rule", "회원가입", "비밀번호",
    "조건에 맞는 비밀번호를 적어 보세요.",
    [{ id: "rule", kind: "text",  text: "영문과 숫자를 섞어 8자 이상" },
     { id: "pw",   kind: "input", label: "비밀번호", need: ["name", "type", "state"] },
     { id: "next", kind: "button", label: "다음" }],
    [{ part: "pw", do: "type", val: "abcd1234" }, { part: "next", do: "press" }],
    "조건을 채웠는지 다 적고 눌러 봐야만 알겠어요."),

  J("file-upload", "파일", "올리기",
    "파일을 올리고 끝났는지 확인해 보세요.",
    [{ id: "pick", kind: "button",   label: "파일 고르기" },
     { id: "bar",  kind: "progress", label: "진행", need: ["name", "state", "feed"] }],
    [{ part: "pick", do: "press" }, { part: "bar", do: "read" }],
    "올라가는 중인지 멈춘 건지 알 수가 없어요."),

  J("cloud-sync", "클라우드", "동기화",
    "동기화가 끝났는지 확인해 보세요.",
    [{ id: "f1", kind: "list",   label: "보고서.docx" },
     { id: "f2", kind: "list",   label: "사진 모음" },
     { id: "ic", kind: "status", label: "동기화 상태", need: ["name", "state"] }],
    [{ part: "ic", do: "read" }],
    "이 아이콘들이 무슨 뜻인지 설명이 없어요."),

  J("coupon-apply", "예약", "결제",
    "쿠폰을 적용해 보세요.",
    [{ id: "coupon", kind: "input",  label: "쿠폰 번호" },
     { id: "apply",  kind: "button", label: "적용", need: ["name", "push", "feed"] }],
    [{ part: "coupon", do: "type", val: "WELCOME" }, { part: "apply", do: "press" }],
    "적용된 건지 값만 보고 짐작해야 하네요."),

  J("pay-final", "결제", "마지막",
    "결제를 끝내 보세요.",
    [{ id: "addr", kind: "input",  label: "받는 곳" },
     { id: "memo", kind: "input",  label: "요청 사항" },
     { id: "pay",  kind: "button", label: "결제하기", need: ["name", "push", "feed", "state"] }],
    [{ part: "addr", do: "type", val: "성북구" }, { part: "pay", do: "press" }],
    "결제 버튼이 한참 아래에 있는 줄 몰랐어요."),
];

/* ── 조마다 다른 의뢰를 다른 차례로 ──────────────────────────
   스무 조가 같은 것부터 시작하면 옆 조를 베낀다. 조 번호로 차례를 어긋나게
   돌려 첫 의뢰를 다르게 준다. 중복은 상관없다 — 어차피 같은 개념이다. */

export function queueFor(team) {
  const n = JOBS.length;
  const start = ((Number(team) || 1) - 1) * 2 % n;
  return Array.from({ length: n }, (_, i) => JOBS[(start + i) % n]);
}

export const jobById = id => JOBS.find(j => j.id === id);
