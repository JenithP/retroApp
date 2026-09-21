// 의뢰 목록 — 앱시장 중개인이 물어 오는 일감 마흔 가지.
//
// 앱을 마흔 개 손으로 짓지 않는다. 부품은 kit.js 에 진짜로 작동하는 위젯으로
// 만들어 두고, 여기서는 **무엇을 몇 개 놓을지만** 적는다. 조립은 app.js 가 한다.
//
// parts — 화면에 놓을 부품. kind 는 kit.js 가 아는 종류.
//   need  이 부품이 쓰이려면 무엇을 알려야 하는가. 적지 않으면 종류의 기본값.
//         name 무엇인지 · type 쓸 수 있다는 것 · push 터치할 수 있다는 것
//         feed 하고 난 뒤 어찌 됐는지 · state 지금 어떤 상태인지 · move 밀거나 끌 수 있다는 것
//   decoy 터치할 수 없는 것. 여기에 단서를 붙이면 거짓 어포던스가 된다.
//
// steps — 테스트 사용자가 밟는 차례. 이 차례대로 막히는 곳이 불편으로 나온다.

const J = (id, app, screen, task, parts, steps, say) =>
  ({ id, app, screen, task, parts, steps, say });

export const JOBS = [
  J("bank-next", "은행", "이체 확인",
    "김서연 님에게 45,000원을 보내 보세요.",
    [{ id: "amount", kind: "input", visual: "amount", label: "금액", value: "",
       unitHint: "원" },
     { id: "next",   kind: "button", label: "다음", look: "dead" }],
    [{ part: "amount", do: "type", val: "45000" }, { part: "next", do: "press" }],
    "회색이라 못 터치하는 줄 알았는데 터치되더라고요."),

  J("bank-account", "은행", "송금",
    "계좌번호 110-234-567890을 적어 보세요.",
    [{ id: "guide", kind: "text", text: "받는 분 계좌를 확인해 주세요" },
     { id: "acct",  kind: "input", visual: "code", label: "계좌번호" },
     { id: "send",  kind: "button", label: "보내기" }],
    [{ part: "acct", do: "type", val: "110234567890" }, { part: "send", do: "press" }],
    "어디가 적는 칸이고 어디가 그냥 설명인지 모르겠어요."),

  J("shop-card", "쇼핑", "겨울 아우터",
    "두 번째 상품인 패딩 하프 점퍼를 골라 들어가 보세요.",
    [{ id: "c1", kind: "card", visual: "product", label: "울 더블 코트",
       sub: "차콜 · 울 70%", price: "128,000원" },
     { id: "c2", kind: "card", visual: "product", label: "패딩 하프 점퍼",
       sub: "블랙 · 경량 충전재", price: "96,000원",
       stuck: { push: "사진과 상품명, 가격은 잘 보입니다. 다만 카드 전체를 터치해 " +
         "상세로 들어갈 수 있는지, 사진만 터치되는지 알기 어렵습니다." } }],
    [{ part: "c2", do: "press" }],
    "사진만 터치해야 하는지 카드 전체가 터치되는지 모르겠어요."),

  J("shop-cart", "쇼핑", "상품 상세",
    "이 코트를 장바구니에 담고, 담겼는지 확인해 보세요.",
    [{ id: "add",  kind: "button", label: "장바구니에 담기", dim: "128,000원" },
     { id: "cart", kind: "icon", label: "장바구니", icon: "bag", counts: "add", need: ["state"],
       stuck: { state: "오른쪽 위 장바구니 그림은 담기 전과 담은 뒤가 똑같습니다. " +
         "방금 터치한 것이 담긴 건지, 몇 개가 들어 있는지 알 수 없습니다." } }],
    [{ part: "add", do: "press" }, { part: "cart", do: "read" }],
    "담긴 건지 아닌지 아이콘만 봐서는 모르겠어요."),

  J("food-swipe", "배달", "가게 목록",
    "두 번째 가게를 옆으로 밀어 숨겨 보세요.",
    [{ id: "s1", kind: "list", visual: "store", label: "한그릇 찌개집",
       sub: "찌개 · 28분" },
     { id: "s2", kind: "list", visual: "store", label: "담백한 분식",
       sub: "분식 · 35분",
       stuck: { move: "가게 이름과 배달 시간은 보이지만, 이 줄을 옆으로 밀어 " +
         "숨길 수 있다는 표시가 아무 데도 없습니다." } }],
    [{ part: "s2", do: "swipe" }],
    "밀 수 있는 줄 몰랐어요. 아무 표시가 없어서."),

  J("food-option", "배달", "옵션 선택",
    "매운맛을 고르고 주문해 보세요. 하나는 반드시 골라야 합니다.",
    [{ id: "spicy", kind: "check", label: "매운맛" },
     { id: "extra", kind: "check", label: "곱빼기" },
     { id: "order", kind: "button", label: "주문", dim: "8,500원" }],
    [{ part: "spicy", do: "press" }, { part: "order", do: "press" }],
    "뭐가 꼭 골라야 하는 거고 뭐가 안 골라도 되는 건가요?"),

  J("map-pin", "지도", "주변 지도",
    "가운데 핀을 터치해 가게 정보를 열어 보세요.",
    [{ id: "p1", kind: "pin", label: "카페" },
     { id: "p2", kind: "pin", label: "약국" },
     { id: "p3", kind: "pin", label: "편의점", decoy: true }],
    [{ part: "p2", do: "press" }],
    "이게 터치되는 건가요 그냥 표시인가요?"),

  J("taxi-start", "택시", "출발지",
    "출발지를 정해 보세요.",
    // 「지금 위치」는 터치해도 아무 일이 없는 미끼인데, 맡은 일이 「지금
    // 위치로 정해 보세요」였다. 글월을 그대로 따른 조가 미끼에 단서를
    // 붙이고 거짓 단서로 값을 깎였다. 이름을 갈라 놓았다.
    //
    // 두 가지가 닮아서 헷갈리는 것이 아니다 — 하나는 작은 아이콘이고
    // 하나는 넓은 띠라 생김새는 다르다. 문제는 **주소만 적혀 있을 뿐,
    // 그 띠가 무엇을 하는 것인지 아무 데도 적혀 있지 않다**는 것이다.
    [{ id: "here", kind: "icon", icon: "aim", label: "지도 가운데로", decoy: true },
     { id: "pick", kind: "button", label: "출발지 정하기", dim: "성북로 12길 4",
       stuck: { name: "아래 띠에 주소만 적혀 있습니다. 그 주소를 보여 주기만 " +
         "하는 것인지, 터치하면 출발지로 정해지는 것인지 알 수 없습니다.",
         push: "글자만 놓여 있어 터치되는 것인지 그냥 바탕인지 구별되지 않습니다.",
         feed: "터치해도 화면이 그대로여서 출발지가 정해졌는지 알 수 없습니다." } }],
    [{ part: "pick", do: "press" }],
    "주소만 떠 있어서 저걸 터치하는 건지 그냥 보여 주는 건지 모르겠어요."),

  J("stay-date", "숙박", "숙소 정보",
    "들어가는 날을 고르고 방을 찾아보세요.",
    [{ id: "room", kind: "card", visual: "hotel", label: "디럭스 더블룸",
       sub: "4.7 · 서울 종로구", price: "1박 142,000원", decoy: true },
     { id: "inday",  kind: "button", label: "들어가는 날", look: "flat" },
     { id: "outday", kind: "button", label: "나오는 날",   look: "flat" },
     { id: "find",   kind: "button", label: "찾기" }],
    [{ part: "inday", do: "press" }, { part: "find", do: "press" }],
    "그냥 글씨 같아서 터치해도 되는 줄 몰랐어요."),

  J("air-trip", "항공권", "여정",
    "편도를 고르고 검색해 보세요.",
    [{ id: "trip", kind: "tab", label: "왕복 · 편도", opts: ["왕복", "편도"] },
     { id: "go",   kind: "button", label: "검색", dim: "서울 → 제주" }],
    [{ part: "trip", do: "press" }, { part: "go", do: "press" }],
    "지금 어느 쪽이 골라져 있는 건지 잘 안 보여요."),

  J("music-cover", "음악", "앨범 정보",
    "앨범을 재생해 보세요.",
    [{ id: "cover", kind: "thumb", label: "밤의 공방 · 윤하린" }],
    [{ part: "cover", do: "press" }],
    "커버를 터치하면 재생되는 건지 상세로 가는 건지 모르겠어요."),

  J("video-play", "영상", "요리 영상",
    "두 번째 영상을 재생해 보세요.",
    [{ id: "v1", kind: "thumb", label: "집밥 김치볶음밥" },
     { id: "v2", kind: "thumb", label: "따뜻한 수프 만들기" }],
    [{ part: "v2", do: "press" }],
    "재생 버튼이 너무 작고 흐려서 안 보여요."),

  J("book-page", "전자책", "마지막 등불",
    "다음 쪽으로 넘겨 보세요.",
    [{ id: "page", kind: "card", visual: "page", label: "본문", need: ["push", "move"],
       stuck: { move: "글은 잘 읽힙니다. 다만 다음 쪽으로 넘기려면 화면을 " +
         "터치해야 하는지 옆으로 밀어야 하는지 알 수 없습니다." } },
     { id: "bar",  kind: "progress", label: "쪽 표시" }],
    [{ part: "page", do: "swipe" }],
    "탭을 해야 하는지 밀어야 하는지 아무 말이 없네요."),

  J("photo-slider", "사진 편집", "사진 보정",
    "필터 세기를 절반쯤으로 맞춰 보세요.",
    [{ id: "filter", kind: "card", visual: "frame", label: "따뜻하게" },
     { id: "amount", kind: "slider", label: "세기" }],
    [{ part: "amount", do: "drag" }],
    "세기를 바꿀 수 있는 줄 몰랐어요. 손잡이가 없어서."),

  J("camera-lock", "카메라", "촬영",
    "초점을 고정하고 찍어 보세요.",
    [{ id: "focus", kind: "card", visual: "frame", label: "미리보기 화면",
       need: ["push", "state"],
       stuck: { state: "화면에 무엇이 비치는지는 보입니다. 다만 초점이 지금 " +
         "고정된 상태인지 아닌지 화면만 봐서는 알 수 없습니다." } },
     { id: "shot",  kind: "button", label: "찍기" }],
    [{ part: "focus", do: "press" }, { part: "shot", do: "press" }],
    "초점이 잠긴 건지 아닌지 화면만 봐서는 몰라요."),

  J("msg-status", "메신저", "민지",
    "보낸 쪽지가 읽혔는지 확인해 보세요.",
    [{ id: "input", kind: "input", visual: "chat", label: "보낼 말" },
     { id: "send",  kind: "button", label: "보내기" },
     { id: "state", kind: "status", label: "상태", need: ["name", "state"] }],
    [{ part: "input", do: "type", val: "도착했어" }, { part: "send", do: "press" },
     { part: "state", do: "read" }],
    "읽음인지 보내는 중인지 실패인지 아이콘이 다 비슷해요."),

  J("mail-archive", "이메일", "받은 편지",
    "첫 번째 편지를 보관해 보세요. 지우면 안 됩니다.",
    [{ id: "mail", kind: "list", visual: "mail", label: "성신 도서관",
       sub: "예약 도서가 준비되었습니다", at: "오전 9:12" },
     { id: "arch", kind: "icon",   label: "보관", need: ["name", "push"] },
     { id: "del",  kind: "icon",   label: "삭제", need: ["name", "push"] }],
    [{ part: "arch", do: "press" }],
    "어느 쪽이 보관이고 어느 쪽이 삭제인지 그림만 봐서는 몰라요."),

  J("cal-drag", "캘린더", "주간 달력",
    "회의를 두 시간 뒤로 옮겨 보세요.",
    [{ id: "ev1", kind: "card", visual: "event", at: "10:00", label: "팀 회의",
       need: ["move"],
       stuck: { move: "일정 블록과 시간은 잘 보입니다. 다만 이 블록을 끌어서 " +
         "다른 시간으로 옮길 수 있다는 표시가 없습니다." } },
     { id: "ev2", kind: "card", visual: "event", at: "14:00", label: "점심 약속" }],
    [{ part: "ev1", do: "drag" }],
    "끌어서 옮길 수 있는 줄 몰랐어요."),

  J("todo-check", "할 일", "오늘",
    "첫 번째 할 일을 마쳤다고 표시해 보세요.",
    [{ id: "t1", kind: "check", label: "우유 사기" },
     { id: "t2", kind: "check", label: "책 반납" },
     { id: "t3", kind: "text",  text: "· 내일 할 일 3개" }],
    [{ part: "t1", do: "press" }],
    "네모가 터치해서 체크하는 건지 그냥 점인지 모르겠어요."),

  J("memo-title", "메모", "새 메모",
    "제목에 「장보기」, 본문에 「우유」를 적어 보세요.",
    [{ id: "title", kind: "input", visual: "code", label: "제목" },
     { id: "body",  kind: "input", visual: "note", label: "본문", big: true }],
    [{ part: "title", do: "type", val: "장보기" },
     { part: "body",  do: "type", val: "우유" }],
    "어디가 제목 칸이고 어디가 본문인지 구분이 안 가요."),

  J("fit-start", "피트니스", "이번 주 운동",
    "운동을 시작해 보세요.",
    [{ id: "ad", kind: "card", visual: "article", label: "지금 가입하면 3개월 무료!",
       sub: "프리미엄 안내 · 광고", decoy: true },
     { id: "start", kind: "button", label: "운동 시작", look: "flat" }],
    [{ part: "start", do: "press" }],
    "광고가 제일 커서 그것부터 터치했어요."),

  J("health-dot", "건강", "걸음 수",
    "수요일 걸음 수를 확인해 보세요.",
    [{ id: "chart", kind: "card", visual: "chart", label: "요일별 걸음 수",
       bars: [52, 61, 88, 47, 73, 35, 44], need: ["push", "name"],
       stuck: { push: "요일별 막대는 잘 보입니다. 다만 막대 하나를 터치해 " +
         "그날의 자세한 수치를 볼 수 있다는 표시가 없습니다." } }],
    [{ part: "chart", do: "press" }],
    "점을 터치하면 자세한 게 나오는 줄 몰랐어요."),

  J("calm-play", "명상", "호수 명상",
    "명상을 멈춰 보세요.",
    [{ id: "play", kind: "button", label: "재생/멈춤", dim: "호수 명상", need: ["push", "state"] },
     { id: "time", kind: "text",   text: "12:00" }],
    [{ part: "play", do: "press" }, { part: "play", do: "read" }],
    "지금 도는 중인지 멈춘 건지 버튼이 안 변해요."),

  J("learn-choice", "학습", "퀴즈",
    "두 번째 보기를 골라 보세요.",
    [{ id: "a1", kind: "button", label: "어포던스",     look: "flat" },
     { id: "a2", kind: "button", label: "시그니파이어", look: "flat" },
     { id: "a3", kind: "button", label: "제약",         look: "flat" }],
    [{ part: "a2", do: "press" }],
    "보기가 그냥 글씨 같아서 터치해도 되는지 몰랐어요."),

  J("lang-record", "언어 학습", "발음",
    "발음을 녹음해 보세요.",
    [{ id: "mic",  kind: "icon", label: "녹음", need: ["name", "push", "feed"] }],
    [{ part: "mic", do: "press" }],
    "그림이라 장식인 줄 알았어요. 터치하는 건지 몰랐네요."),

  J("news-tag", "뉴스", "오늘의 기사",
    "첫 번째 기사를 열어 보세요.",
    [{ id: "tag",  kind: "text", text: "경제" },
     { id: "head", kind: "card", visual: "article",
       label: "오래된 시장에 새 조명이 켜졌다",
       sub: "서울일보 · 사회 · 오전 8:20" },
     { id: "tag2", kind: "text", text: "사회" }],
    [{ part: "head", do: "press" }],
    "제목이랑 분류 딱지 중에 뭐가 터치되는 건지 모르겠어요."),

  J("comm-like", "커뮤니티", "동네 게시판",
    "이 글에 좋아요를 터치해 보세요.",
    [{ id: "post", kind: "card", visual: "post", label: "오늘 본 노을",
       sub: "나무늘보 · 혜화동", decoy: true },
     { id: "like", kind: "icon", label: "좋아요", need: ["name", "push", "state"] },
     { id: "cnt",  kind: "text", text: "12" }],
    [{ part: "like", do: "press" }],
    "숫자랑 버튼이 따로 떨어져 있어서 어디를 터치해야 할지."),

  J("sns-profile", "SNS", "피드",
    "글쓴이의 프로필로 들어가 보세요.",
    [{ id: "face", kind: "icon", label: "프로필 사진", need: ["name", "push"] },
     { id: "post", kind: "card", visual: "post", label: "늦은 오후의 산책",
       sub: "소연 · 2시간 전" }],
    [{ part: "face", do: "press" }],
    "사진을 터치하면 크게 보는 건지 프로필로 가는 건지 몰라요."),

  J("sns-comment", "SNS", "댓글",
    "댓글을 적어 보내 보세요.",
    [{ id: "cmt",  kind: "input", visual: "chat", label: "댓글", look: "dead" },
     { id: "send", kind: "button", label: "올리기" }],
    [{ part: "cmt", do: "type", val: "좋네요" }, { part: "send", do: "press" }],
    "흐려서 못 쓰는 줄 알았는데 써지더라고요."),

  J("story-tap", "스토리", "여행 기록",
    "다음 이야기로 넘겨 보세요.",
    [{ id: "story", kind: "card", visual: "post", label: "부산 바닷길",
       sub: "여행 기록 · 1 / 5", need: ["push", "move"],
       stuck: { push: "사진은 꽉 차게 보입니다. 다만 좌우를 터치해 넘기는 것인지, " +
         "옆으로 밀어 넘기는 것인지 아무 표시가 없습니다." } },
     { id: "bar",   kind: "progress", label: "1 / 5" }],
    [{ part: "story", do: "press" }],
    "좌우를 터치해 넘기는 건지 밀어야 하는 건지 아무 표시가 없어요."),

  J("set-toggle", "설정", "알림 설정",
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

  J("sub-trial", "구독", "구독 안내",
    "무료 체험만 시작해 보세요. 결제하면 안 됩니다.",
    [{ id: "trial", kind: "button", label: "무료 체험", dim: "7일 0원" },
     { id: "pay",   kind: "button", label: "바로 결제", dim: "월 12,900원" }],
    [{ part: "trial", do: "press" }],
    "둘이 비슷해서 결제를 터치할 뻔했어요."),

  J("sub-cancel", "구독", "구독 관리",
    "해지를 끝내 보세요.",
    [{ id: "btn",  kind: "button",   label: "해지하기", dim: "프로 월간" },
     { id: "step", kind: "progress", label: "단계", need: ["name", "state"] }],
    [{ part: "btn", do: "press" }, { part: "step", do: "read" }],
    "해지가 끝난 건지 다음 단계가 남은 건지 모르겠어요."),

  J("login-error", "로그인", "로그인",
    "비밀번호를 다시 적고 들어가 보세요.",
    [{ id: "id",  kind: "input", visual: "code", label: "아이디", value: "younjeong", need: [] },
     { id: "pw",  kind: "input", visual: "code", label: "비밀번호", need: ["name", "type", "state"] },
     { id: "go",  kind: "button", label: "들어가기" }],
    [{ part: "pw", do: "type", val: "1234" }, { part: "go", do: "press" }],
    "어느 칸이 틀렸다는 건지 표시가 없어요."),

  J("join-rule", "회원가입", "회원가입 2단계",
    "조건에 맞는 비밀번호를 적어 보세요.",
    [{ id: "rule", kind: "text",  text: "영문과 숫자를 섞어 8자 이상" },
     { id: "pw",   kind: "input", visual: "code", label: "비밀번호", need: ["name", "type", "state"] },
     { id: "next", kind: "button", label: "다음" }],
    [{ part: "pw", do: "type", val: "abcd1234" }, { part: "next", do: "press" }],
    "조건을 채웠는지 다 적고 터치해 봐야만 알겠어요."),

  J("file-upload", "파일", "최근 항목",
    "파일을 올리고 끝났는지 확인해 보세요.",
    [{ id: "pick", kind: "button",   label: "파일 고르기", dim: "회의기록.txt" },
     { id: "bar",  kind: "progress", label: "진행", need: ["name", "state", "feed"] }],
    [{ part: "pick", do: "press" }, { part: "bar", do: "read" }],
    "올라가는 중인지 멈춘 건지 알 수가 없어요."),

  J("cloud-sync", "클라우드", "저장공간",
    "동기화가 끝났는지 확인해 보세요.",
    [{ id: "f1", kind: "list", visual: "file", label: "보고서.docx", sub: "2.4MB" },
     { id: "f2", kind: "list", visual: "file", label: "사진 모음", sub: "18.1MB" },
     { id: "ic", kind: "status", label: "동기화 상태", need: ["name", "state"] }],
    [{ part: "ic", do: "read" }],
    "이 아이콘들이 무슨 뜻인지 설명이 없어요."),

  J("coupon-apply", "예약", "결제",
    "쿠폰을 적용해 보세요.",
    [{ id: "coupon", kind: "input", visual: "code", label: "쿠폰 번호" },
     { id: "apply",  kind: "button", label: "적용", need: ["name", "push", "feed"] }],
    [{ part: "coupon", do: "type", val: "WELCOME" }, { part: "apply", do: "press" }],
    "적용된 건지 값만 보고 짐작해야 하네요."),

  J("pay-final", "쇼핑", "결제",
    "결제를 끝내 보세요.",
    [{ id: "addr", kind: "input", visual: "code", label: "받는 곳" },
     { id: "memo", kind: "input", visual: "note", label: "요청 사항" },
     { id: "pay",  kind: "button", label: "결제하기", need: ["name", "push", "feed", "state"] }],
    [{ part: "addr", do: "type", val: "성북구" }, { part: "pay", do: "press" }],
    "결제 버튼이 한참 아래에 있는 줄 몰랐어요."),
];

export const TEAMS = 20;

/* ── 조마다 어느 의뢰부터 맡는가 ─────────────────────────────
   **두 조씩 짝을 지어 같은 의뢰로 시작한다.** 1·2조가 첫째 의뢰,
   3·4조가 셋째 의뢰… 이렇게 열 쌍이 된다. 같은 화면을 맡은 두 조가
   서로 다른 답을 들고 나와야 발표 때 나란히 놓고 볼 수 있다.
   짝이 아닌 조끼리는 시작이 다르므로 옆자리를 베낄 수 없다. */

export function queueFor(team) {
  const n = JOBS.length;
  const start = (Math.floor(((Number(team) || 1) - 1) / 2) * 2) % n;
  return Array.from({ length: n }, (_, i) => JOBS[(start + i) % n]);
}

/** 같은 의뢰로 시작하는 짝꿍 조 */
export const partnerOf = team =>
  Number(team) % 2 === 1 ? Number(team) + 1 : Number(team) - 1;

export const jobById = id => JOBS.find(j => j.id === id);
