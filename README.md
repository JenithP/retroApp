# 1988년 거실

HCI와 커뮤니케이션 2주차 오프라인 실습. 거실 화면에서 라디오·텔레비전·전화기로 들어가
같은 과업을 1988년 기기와 지금의 앱으로 수행하고, 통제감과 인지 부하를 비교한다.

핵심은 **전원을 켜는 순간부터 방송이 흐른다**는 것이다. 채널이나 주파수를 옮겼다
돌아오면 그 사이에 지나간 부분은 다시 들을 수 없다. 지금의 앱은 언제 눌러도
처음부터 나온다. 그 차이가 이 실습에서 재려는 것이다.

## 집에서 이어서 작업하기

    git clone https://github.com/JenithP/retroApp.git
    cd retroApp

원본 영상과 음원을 `media_src/` 에 넣는다. 길이는 얼마든 상관없다.

    media_src/tv/ch7_3.mp4
    media_src/radio/95.1.wav

그다음 한 줄만 돌리면 길이를 재서 알맞은 화질로 줄여 `public/media/` 에 넣는다.

    python tools/encode_media.py

확인하고 올린다.

    npx serve public
    git add -A && git commit -m "영상 추가" && git push

## 배포

    firebase login
    firebase deploy

## 넣어야 할 매체

원본은 `media_src/` 에, 결과는 `public/media/` 에 들어간다.
파일이 없으면 합성음과 화면으로 대체되므로 없는 채로도 실습은 돌아간다.

| 파일 | 길이 | 내용 |
|---|---|---|
| tv/ch7_1 | 자유 | 주말 연속극 — 기다리는 동안 볼 것 |
| tv/ch7_2 | 자유 | 가요 무대 — 기다리는 동안 볼 것 |
| tv/ch7_3 | 90초 이상 | **올림픽 D-7 특집 — 중간에 "선수촌 24시"를 또렷이** |
| tv/ch7_4 | 자유 | 스포츠 하이라이트 |
| tv/ch9 | 자유 | 뉴스 데스크 |
| tv/ch11 | 자유 | 세계의 선수들 |
| radio/95.1 | 2~3분 | **올림픽 특별 생방송 — 중간에 "스물세 개 나라"** |
| radio/91.9 | 1~2분 | **뉴스와 날씨 — 중간에 "최고기온 24도"** |
| radio/98.7 | 2~3분 | 밤을 잊은 그대에게 |
| radio/103.5 | 1분 | 영어 방송 |

정답이 되는 말은 **중간쯤에 한 번만** 넣는다. 앞이나 끝에 있으면 너무 쉽게 잡히고,
중간에 있어야 다른 데 갔다 온 학생이 놓친다.

## 파이어베이스 콘솔에서 켜둘 것

1. Authentication → Sign-in method → **익명** 사용 설정
2. Firestore Database → 데이터베이스 만들기 → 프로덕션 모드 → **asia-northeast3 (서울)**

---

# 5주차 앱 공방 (`/appshop/`)

조가 **장면 카드**로 앱 설계서를 쓰면, 버셀 함수가 Claude로 **적힌 것만** 폰 앱 한 장을 만든다.
30분 뒤 교수가 출판하면 설계서 · 앱이 잠기고, 다른 조 앱 두 개를 닐슨의 열 가지 + 두 품질(쓸 만한가 · 즐거운가)로 평가한다.

- 학생: `https://retro-app-six.vercel.app/appshop/`
- 현황판(교수): `https://retro-app-six.vercel.app/appshop/board.html` — 암호는 4주차와 같은 `HCI4_ADMIN`
- 미리보기(가짜 자료, 기록 안 남음): 주소 끝에 `?demo=build` · `?demo=eval` · `?demo=feedback`

## 수업 전에 한 번 — 설정

1. **버셀 → Settings → Environment Variables** 에 `ANTHROPIC_API_KEY` 하나만 더 넣는다.
   `FIREBASE_SERVICE_ACCOUNT` 와 `HCI4_ADMIN` 은 4주차 노만의 공방이 이미 넣어 두었으므로 그대로 쓴다.
   (선택) `APPSHOP_ADMIN_CODE` 로 5주차만 다른 암호를 쓸 수 있다. `APPSHOP_MODEL` 기본 `claude-opus-5`, `APPSHOP_EFFORT` 기본 `medium`.
2. **규칙 올리기** — 호스팅은 버셀이 맡으므로 파이어베이스에는 규칙만 올린다 (맨 `firebase deploy` 금지)

       firebase deploy --only firestore:rules

   화면과 함수는 `git push` 하면 버셀이 올린다.
3. **AI가 적힌 것만 만드는지 시험** (한 번, 몇 분)

       npm install
       ANTHROPIC_API_KEY=... node tools/appshop_try.mjs

   `tools/appshop_try_out/` 의 HTML을 열어 눌러 보고, 「설계서에 없는 말」 이 「없음」 인지 본다.

## 수업 중 — 현황판 버튼

| 버튼 | 일어나는 일 |
|---|---|
| ① 준비 | 학생은 미션 카드만 본다 |
| ② 제작 시작 · 30분 | 설계서가 열리고 타이머가 돈다. 조당 생성 5번 (실패하면 돌려받음) |
| +5분 | 제작 시간 연장 |
| ③ 출판 → 평가 | 조마다 **마지막으로 만든 앱**이 시장에 올라간다. 이후 생성 · 설계서 수정은 서버에서 거절 |
| ④ 피드백 공개 | 평가가 닫히고, 각 조가 받은 평가 · 2×2 위치 · 소감을 본다 |
| ⑤ 마침 | 끝 |
| 전부 비우기 | 리허설 뒤 조 · 설계서 · 평가를 지운다 |

- 미션 10개를 두 조씩 (1·2조 → 미션 1 …). 평가는 조마다 +2 · +4 번째 조의 앱 (다른 미션).
- 생성된 앱은 `sandbox="allow-scripts"` iframe + CSP 안에서만 돈다 (부모 창 · 네트워크 접근 불가).
- 생성 한 번에 1~2분 걸릴 수 있다. 버셀 함수 제한 시간은 `vercel.json` 에서 300초.

---

# 6주차 VR · AR 적용 판단 실습 (`/vrcard/`)

지금 쓰이는 사례 18장을 **두 질문(몸이 진짜처럼 반응해야 하는가 · 정보가 현실의 물건에 붙어야 하는가)** 으로 나눈 네 칸에 놓고,
카드마다 온라인에서 배운 이론으로 근거를 적는다. 반 전체 비교 → 재설계(스케치) → 다음 조 설계안에 부작용 붙이기 → 대응책 순서.
종이 카드(6주차자료/6주차_오프라인_사례카드_워크시트.pdf)로 조 토론을 하고, 정한 것을 이 화면에 입력해도 된다.

- 학생: `https://retro-app-six.vercel.app/vrcard/` — 주소 끝에 `?team=3` 을 붙이면 그 조로 바로 열린다
- 현황판(교수): `https://retro-app-six.vercel.app/vrcard/board.html` — 암호는 4 · 5주차와 같은 `HCI4_ADMIN` (6주차만 바꾸려면 `VRCARD_ADMIN_CODE`)
- 미리보기(가짜 자료, 기록 안 남음): 주소 끝에 `?demo=sort` · `?demo=share` · `?demo=design` · `?demo=side` · `?demo=reply` · `?demo=end`

## 수업 전에 한 번

1. 버셀 환경 변수는 새로 넣을 것이 없다 (`FIREBASE_SERVICE_ACCOUNT` · `HCI4_ADMIN` 을 그대로 쓴다).
2. 규칙 올리기 — `firebase deploy --only firestore:rules` (맨 `firebase deploy` 금지)
3. 현황판에서 ② 분류 시작을 한 번 눌러 보고, 학생 화면 하나로 카드를 놓아 저장되는지 본 뒤 「전부 비우기」.

## 수업 중 — 현황판 버튼

| 버튼 | 학생 화면 | 쓸 수 있는 것 |
|---|---|---|
| ① 안내 | 두 질문 · 경고 카드 · 이론 목록 | 없음 |
| ② 분류 시작 | 카드를 네 칸에 끌어 놓고, 칸 · 경고 · 근거 이론 · 이유 입력 | 조의 분류판 |
| ③ 공유 | 반 전체 비교 (갈린 카드 순) · 줄을 누르면 조마다 근거 | 없음 (분류 잠김) |
| ④ 재설계 | VR · AR 칸 카드 하나 골라 설계안 + 체크리스트 6개 + 스케치 | 조의 설계안 |
| ⑤ 부작용 찾기 | 다음 번호 조(20조 → 1조)의 설계안에 부작용 붙이기 | 부작용 |
| ⑥ 대응책 | 앞 번호 조가 붙인 부작용마다 대응책 | 대응책 |
| ⑦ 마침 | 실습보고서(.doc) 내려받기 | 없음 |

- 모음: `hci6_state` (단계 · 버셀 함수만) · `hci6_boards` · `hci6_designs` · `hci6_sides` (`받는조_붙이는조`)
- 카드 문구를 고치면 `public/vrcard/js/data.js` 와 인쇄용 카드를 같이 고친다.
- 카드 그림(선택): 번호로 시작하는 원본(01_….png)을 한 폴더에 모아 `python tools/vrcard_images.py "<폴더>"` → `public/vrcard/img/cards/01.webp …`.
  그림이 없는 카드는 글자만 보인다. 그림에는 「지금 방식」 장면만 — 헤드셋이나 AR 화면이 들어가면 답을 알려 주는 셈이다.
