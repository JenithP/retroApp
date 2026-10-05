// 사례 18개의 미리 만든 장면. vrkit 의 start({ case: "3" }) 이 불러 W.obj 에 이름 붙은 물체를 넣는다.
// objects 목록은 버셀 함수가 AI 지시문에 넣는다 — AI는 이 이름으로 물체를 가리켜 안내를 얹는다.
// 장면은 「지금 방식」 의 공간만 만든다. VR · AR 안내 요소(강조 · 화살표 · 패널)는 넣지 않는다 — 그건 학생 설계안의 몫.
// three.js 를 직접 부르지 않고 vrkit 의 W 만 쓴다 (서버에서도 이 파일을 읽기 때문).

export const CASES = {
  "1": {
    title: "소방 대피 훈련", place: "none",
    objects: { corridor: "연기 찬 사무실 복도 (바닥 · 양쪽 벽)", exitSign: "복도 끝 비상구 표시등", exitDoor: "복도 끝 비상구 문", doorLeft: "왼쪽 사무실 문", doorRight: "오른쪽 사무실 문", extinguisher: "벽 앞 소화기", smoke: "천장 쪽 연기 층" },
    build(W) {
      W.view({ eye: [0, 1.55, 1], pitch: -4 });
      const floor = W.box({ size: [2.6, 0.02, 16], pos: [0, 0, -6], color: "#8e8a82" });
      W.box({ size: [0.1, 3, 16], pos: [-1.3, 0, -6], color: "#d9d6cf" }); W.box({ size: [0.1, 3, 16], pos: [1.3, 0, -6], color: "#d9d6cf" });
      W.box({ size: [2.6, 0.05, 16], pos: [0, 3, -6], color: "#cfccc5" });
      const exitDoor = W.box({ size: [1.1, 2.1, 0.08], pos: [0, 0, -13.8], color: "#5a6f62" });
      const exitSign = W.sign({ text: "EXIT", w: 0.7, h: 0.25, pos: [0, 2.5, -13.75], bg: "#1f8a4c", fg: "#ffffff", emissive: true });
      const doorLeft = W.box({ size: [0.06, 2.1, 0.95], pos: [-1.24, 0, -3.5], color: "#8a6a4a" });
      const doorRight = W.box({ size: [0.06, 2.1, 0.95], pos: [1.24, 0, -6.5], color: "#8a6a4a" });
      const extinguisher = W.cylinder({ radius: 0.09, height: 0.55, pos: [1.1, 0, -2.2], color: "#c0392b" });
      const smoke = W.box({ size: [2.5, 0.9, 15.5], pos: [0, 2.05, -6], color: "#6e6e6e", opacity: 0.45 });
      W.every(t => { smoke.position.y = 2.5 + 0.06 * Math.sin(t * 0.8); smoke.material.opacity = 0.4 + 0.08 * Math.sin(t * 1.3); });
      return { corridor: floor, exitSign, exitDoor, doorLeft, doorRight, extinguisher, smoke };
    },
  },
  "2": {
    title: "고소공포증 치료", place: "none",
    objects: { glassFloor: "발밑 유리 바닥 전망대", railing: "앞쪽 난간", city: "40m 아래 도시 건물들", therapist: "뒤쪽 옆에 선 치료사" },
    build(W) {
      W.view({ eye: [0, 1.6, 0.4], pitch: -48 }); W.scene.fog.near = 60; W.scene.fog.far = 220;
      const glassFloor = W.box({ size: [3, 0.04, 3], pos: [0, 0, -1], color: "#bfe3f2", opacity: 0.35 });
      const railing = W.box({ size: [3, 0.05, 0.05], pos: [0, 1.05, -2.45], color: "#c8ccd0" });
      for (const x of [-1.4, -0.7, 0, 0.7, 1.4]) W.box({ size: [0.04, 1.05, 0.04], pos: [x, 0, -2.45], color: "#c8ccd0" });
      const city = [];
      for (let i = 0; i < 40; i++) { const x = ((i * 37) % 40) - 20, z = -4 - ((i * 53) % 30), h = 6 + ((i * 7) % 18);
        city.push(W.box({ size: [2.2, h, 2.2], pos: [x, -40, z], color: ["#9fb0c2", "#c7beb1", "#b2c2b0"][i % 3] })); }
      W.box({ size: [80, 0.1, 80], pos: [0, -40.1, -15], color: "#7d8a7a" });
      const therapist = W.person({ pos: [1.1, 0, 0.6], color: "#5b7fa6" });
      return { glassFloor, railing, city: W.group(city), therapist };
    },
  },
  "3": {
    title: "가구 조립 설명서", place: "room",
    objects: { sidePanel1: "책장 옆판 1", sidePanel2: "책장 옆판 2", shelf1: "선반 1", shelf2: "선반 2", shelf3: "선반 3", screwBag: "나사 봉지", allenKey: "육각 렌치", booklet: "종이 설명서" },
    build(W) {
      W.view({ eye: [0, 1.5, 0.1], pitch: -52 });
      const wood = "#d9bf96";
      const sidePanel1 = W.box({ size: [1.3, 0.025, 0.32], pos: [-0.75, 0, -1.25], color: wood });
      const sidePanel2 = W.box({ size: [1.3, 0.025, 0.32], pos: [-0.75, 0, -1.75], color: wood });
      const shelf1 = W.box({ size: [0.75, 0.025, 0.3], pos: [0.55, 0, -1.05], color: "#cfb48a" });
      const shelf2 = W.box({ size: [0.75, 0.025, 0.3], pos: [0.55, 0, -1.5], color: "#cfb48a" });
      const shelf3 = W.box({ size: [0.75, 0.025, 0.3], pos: [0.55, 0, -1.95], color: "#cfb48a" });
      const screwBag = W.box({ size: [0.14, 0.03, 0.1], pos: [1.15, 0, -1.25], color: "#e8eef2", opacity: 0.85 });
      const allenKey = W.box({ size: [0.09, 0.012, 0.012], pos: [1.15, 0, -1.45], color: "#555b61" });
      const booklet = W.box({ size: [0.22, 0.01, 0.3], pos: [0.05, 0, -0.75], color: "#f7f5ef" });
      return { sidePanel1, sidePanel2, shelf1, shelf2, shelf3, screwBag, allenKey, booklet };
    },
  },
  "4": {
    title: "비행기 정비 매뉴얼", place: "hangar",
    objects: { engine: "덮개가 열린 제트 엔진", fanDisk: "엔진 앞쪽 팬", partA: "엔진 옆면 부품 A (센서)", partB: "엔진 옆면 부품 B (배관 연결부)", partC: "엔진 옆면 부품 C (필터 덮개)", toolCart: "공구 카트", manual: "카트 위 종이 정비 매뉴얼" },
    build(W) {
      W.view({ eye: [0, 1.65, 0.8], pitch: -12 });
      const engine = W.cylinder({ radius: 0.9, height: 2.6, pos: [0, 1.2, -2.6], color: "#9aa3ab" });
      engine.rotation.z = Math.PI / 2; engine.position.set(0, 1.25, -2.6);
      const fanDisk = W.cylinder({ radius: 0.82, height: 0.05, pos: [1.33, 1.2, -2.6], color: "#4b5258" });
      fanDisk.rotation.z = Math.PI / 2; fanDisk.position.set(1.33, 1.25, -2.6);
      W.box({ size: [0.3, 0.5, 0.3], pos: [-0.9, 0, -2.6], color: "#7b8288" }); W.box({ size: [0.3, 0.5, 0.3], pos: [0.9, 0, -2.6], color: "#7b8288" });
      const partA = W.box({ size: [0.18, 0.12, 0.08], pos: [-0.5, 1.15, -1.72], color: "#d4a017" });
      const partB = W.cylinder({ radius: 0.06, height: 0.16, pos: [0.05, 1.1, -1.72], color: "#b0623a" });
      const partC = W.box({ size: [0.22, 0.16, 0.06], pos: [0.55, 1.1, -1.72], color: "#5d7fa3" });
      const toolCart = W.box({ size: [0.7, 0.85, 0.45], pos: [-1.5, 0, -1.3], color: "#c0392b" });
      const manual = W.box({ size: [0.24, 0.05, 0.32], pos: [-1.5, 0.85, -1.3], color: "#f2f0ea" });
      return { engine, fanDisk, partA, partB, partC, toolCart, manual };
    },
  },
  "5": {
    title: "수술 실습", place: "none",
    objects: { table: "수술 실습대", trainingBox: "복강경 훈련 상자", target: "상자 안 연습 대상 (작은 구)", instrumentLeft: "왼손 복강경 도구", instrumentRight: "오른손 복강경 도구", monitor: "앞쪽 내시경 모니터", instructor: "옆에 선 지도 교수" },
    build(W) {
      W.view({ eye: [0, 1.6, 0.5], pitch: -24 });
      W.box({ size: [10, 0.02, 10], pos: [0, 0, -2], color: "#cfd8dc" }); W.box({ size: [10, 3.5, 0.1], pos: [0, 0, -4], color: "#e3eef0" });
      const table = W.box({ size: [1.6, 0.9, 0.8], pos: [0, 0, -1.4], color: "#b9c4ca" });
      const trainingBox = W.box({ size: [0.6, 0.3, 0.45], pos: [0, 0.9, -1.4], color: "#3f4a52", opacity: 0.85 });
      const target = W.sphere({ radius: 0.05, pos: [0, 0.95, -1.4], color: "#e57373" });
      const instrumentLeft = W.cylinder({ radius: 0.01, height: 0.7, pos: [-0.25, 1.05, -1.25], color: "#cfd3d6" }); instrumentLeft.rotation.set(0.9, 0, 0.5);
      const instrumentRight = W.cylinder({ radius: 0.01, height: 0.7, pos: [0.25, 1.05, -1.25], color: "#cfd3d6" }); instrumentRight.rotation.set(0.9, 0, -0.5);
      const monitor = W.sign({ text: "내시경 화면", w: 0.8, h: 0.5, pos: [0, 1.75, -2.2], bg: "#1d2a33", fg: "#9fd3e6", emissive: true });
      const instructor = W.person({ pos: [1.3, 0, -1.9], color: "#2e7d6b" });
      return { table, trainingBox, target, instrumentLeft, instrumentRight, monitor, instructor };
    },
  },
  "6": {
    title: "외국어 메뉴판", place: "room",
    objects: { table: "식당 테이블", menu: "테이블 위 펼친 메뉴판 (외국어)", menuItem1: "메뉴 1줄 (Bouillabaisse)", menuItem2: "메뉴 2줄 (Confit de canard)", menuItem3: "메뉴 3줄 (Tarte Tatin)", waiter: "옆에 선 종업원", glass: "물컵" },
    build(W) {
      W.view({ eye: [0, 1.22, -0.2], pitch: -58 });
      const table = W.box({ size: [1.2, 0.74, 0.8], pos: [0, 0, -0.9], color: "#f3efe6" });
      const menu = W.box({ size: [0.44, 0.008, 0.56], pos: [0, 0.74, -0.75], color: "#2f3b46" });
      const line = (txt, z) => W.sign({ text: txt, w: 0.4, h: 0.07, pos: [0, 0.752, z], rotX: -90, bg: "#2f3b46", fg: "#f1e6c8" });
      const menuItem1 = line("Bouillabaisse  28€", -0.88), menuItem2 = line("Confit de canard  24€", -0.76), menuItem3 = line("Tarte Tatin  9€", -0.64);
      const glass = W.cylinder({ radius: 0.035, height: 0.12, pos: [0.35, 0.74, -0.85], color: "#d6eef7" });
      const waiter = W.person({ pos: [0.95, 0, -1.4], color: "#222222" });
      return { table, menu, menuItem1, menuItem2, menuItem3, waiter, glass };
    },
  },
  "7": {
    title: "박물관 전시 해설", place: "museum",
    objects: { vase: "유리 진열장 안 고대 도자기", glassCase: "유리 진열장", pedestal: "받침대", wallLabel: "벽의 작은 설명판", visitor: "옆의 다른 관람객" },
    build(W) {
      W.view({ eye: [0, 1.6, 0.4], pitch: -10 });
      const pedestal = W.box({ size: [0.7, 0.9, 0.7], pos: [0, 0, -1.8], color: "#f4f2ee" });
      const vase = W.cylinder({ radius: 0.16, height: 0.45, pos: [0, 0.9, -1.8], color: "#b5653a" });
      const glassCase = W.box({ size: [0.6, 0.6, 0.6], pos: [0, 0.9, -1.8], color: "#d8eef5", opacity: 0.22 });
      const wallLabel = W.sign({ text: "청자 상감 운학문 매병", w: 0.5, h: 0.14, pos: [1.2, 1.3, -4.95], bg: "#ffffff", fg: "#333333" });
      const visitor = W.person({ pos: [-1.3, 0, -2.4], color: "#7a5c8a" });
      return { vase, glassCase, pedestal, wallLabel, visitor };
    },
  },
  "8": {
    title: "영어 단어 암기", place: "room",
    objects: { desk: "책상", flashcards: "단어 카드 더미", cardTop: "맨 위 단어 카드 (abandon)", lamp: "책상 스탠드", notebook: "공책" },
    build(W) {
      W.view({ eye: [0, 1.2, -0.15], pitch: -62 });
      const desk = W.box({ size: [1.4, 0.74, 0.7], pos: [0, 0, -0.75], color: "#a9845e" });
      const flashcards = W.box({ size: [0.12, 0.05, 0.08], pos: [-0.15, 0.74, -0.65], color: "#fbfaf6" });
      const cardTop = W.sign({ text: "abandon", w: 0.12, h: 0.08, pos: [-0.15, 0.792, -0.65], rotX: -90, bg: "#fbfaf6", fg: "#333" });
      const notebook = W.box({ size: [0.25, 0.015, 0.32], pos: [0.25, 0.74, -0.7], color: "#4a6fa5" });
      const lamp = W.cylinder({ radius: 0.07, height: 0.45, pos: [0.55, 0.74, -0.95], color: "#2f3a45" });
      return { desk, flashcards, cardTop, lamp, notebook };
    },
  },
  "9": {
    title: "해부학 수업", place: "classroom",
    objects: { table: "실습 테이블", torso: "인체 몸통 모형", heart: "모형의 심장", lungLeft: "왼쪽 폐", lungRight: "오른쪽 폐", stomach: "위", liver: "간", textbook: "펼친 해부학 교과서" },
    build(W) {
      W.view({ eye: [0, 1.55, 0.4], pitch: -26 });
      const table = W.box({ size: [1.4, 0.8, 0.8], pos: [0, 0, -1.2], color: "#c9a77a" });
      const torso = W.box({ size: [0.36, 0.55, 0.2], pos: [0, 0.8, -1.25], color: "#e8c3a4", opacity: 0.55 });
      const heart = W.sphere({ radius: 0.04, pos: [0.03, 1.12, -1.2], color: "#c0392b" });
      const lungLeft = W.sphere({ radius: 0.07, pos: [-0.09, 1.08, -1.22], color: "#e39aa0" });
      const lungRight = W.sphere({ radius: 0.07, pos: [0.11, 1.08, -1.22], color: "#e39aa0" });
      const liver = W.sphere({ radius: 0.06, pos: [0.08, 0.98, -1.2], color: "#8e3b2f" });
      const stomach = W.sphere({ radius: 0.05, pos: [-0.06, 0.97, -1.2], color: "#d9a066" });
      const textbook = W.box({ size: [0.4, 0.02, 0.28], pos: [-0.45, 0.8, -1.0], color: "#f4f1ea" });
      return { table, torso, heart, lungLeft, lungRight, stomach, liver, textbook };
    },
  },
  "10": {
    title: "화학 반응 원리", place: "lab",
    objects: { bench: "실험대", beaker: "기포가 오르는 비커", liquid: "비커 속 용액", flask: "옆의 삼각 플라스크", burner: "가열기", notebook: "실험 노트" },
    build(W) {
      W.view({ eye: [0, 1.35, -0.4], pitch: -40 });
      const bench = W.box({ size: [3.4, 0.9, 0.8], pos: [0, 0, -1.4], color: "#e8ecef" });
      const burner = W.cylinder({ radius: 0.08, height: 0.08, pos: [0, 0.9, -1.3], color: "#3d4349" });
      const beaker = W.cylinder({ radius: 0.07, height: 0.16, pos: [0, 0.98, -1.3], color: "#dff3fb" }); beaker.material.transparent = true; beaker.material.opacity = 0.4;
      const liquid = W.cylinder({ radius: 0.065, height: 0.09, pos: [0, 0.98, -1.3], color: "#3fa7d6" });
      const bubbles = []; for (let i = 0; i < 6; i++) bubbles.push(W.sphere({ radius: 0.008, pos: [(i % 3 - 1) * 0.02, 1.0, -1.3 + (i % 2) * 0.02], color: "#ffffff" }));
      W.every(t => bubbles.forEach((b, i) => { b.position.y = 1.0 + ((t * 0.08 + i * 0.015) % 0.08); }));
      const flask = W.cone({ radius: 0.07, height: 0.18, pos: [0.35, 0.9, -1.35], color: "#cfe9f2" });
      const notebook = W.box({ size: [0.24, 0.015, 0.3], pos: [-0.45, 0.9, -1.15], color: "#f6f4ee" });
      return { bench, beaker, liquid, flask, burner, notebook };
    },
  },
  "11": {
    title: "조선 궁궐 역사 수업", place: "outdoor",
    objects: { hall: "정면의 궁궐 전각 (근정전 모양)", roof: "전각 기와지붕", stairs: "전각 앞 돌계단", courtyard: "박석 깔린 마당", teacher: "설명하는 선생님", students: "함께 걷는 학생들" },
    build(W) {
      W.view({ eye: [0, 1.6, 2], pitch: -2 });
      const courtyard = W.box({ size: [16, 0.03, 16], pos: [0, 0, -6], color: "#c9c2b4" });
      const stairs = W.box({ size: [6, 0.6, 1.4], pos: [0, 0, -9], color: "#b9b2a4" });
      W.box({ size: [7.5, 0.8, 4], pos: [0, 0, -11.5], color: "#b9b2a4" });
      const hall = W.box({ size: [6.4, 2.6, 3.2], pos: [0, 0.8, -11.5], color: "#a83a2c" });
      const roofA = W.box({ size: [7.6, 0.18, 2.4], pos: [0, 3.55, -10.6], color: "#4a4f55" }); roofA.rotation.x = -0.45;
      const roofB = W.box({ size: [7.6, 0.18, 2.4], pos: [0, 3.55, -12.4], color: "#4a4f55" }); roofB.rotation.x = 0.45;
      const roof = W.group([roofA, roofB]);
      const teacher = W.person({ pos: [-1.2, 0, -3.5], color: "#556b2f" });
      const students = W.group([W.person({ pos: [0.4, 0, -2.6], color: "#2c3e66", height: 1.65 }), W.person({ pos: [1.2, 0, -3.0], color: "#2c3e66", height: 1.6 }), W.person({ pos: [0.9, 0, -2.2], color: "#2c3e66", height: 1.62 })]);
      return { hall, roof, stairs, courtyard, teacher, students };
    },
  },
  "12": {
    title: "면접 연습", place: "room",
    objects: { table: "면접 테이블", interviewer1: "왼쪽 면접관", interviewer2: "가운데 면접관", interviewer3: "오른쪽 면접관", nameplate: "가운데 면접관 앞 명패", waterGlass: "내 앞 물컵" },
    build(W) {
      W.view({ eye: [0, 1.2, 0.6], pitch: -6 });
      const table = W.box({ size: [2.4, 0.74, 0.8], pos: [0, 0, -2.0], color: "#cdb89a" });
      const interviewer1 = W.person({ pos: [-0.8, 0, -2.7], color: "#2f3a4a", height: 1.3 });
      const interviewer2 = W.person({ pos: [0, 0, -2.7], color: "#3a3a3a", height: 1.3 });
      const interviewer3 = W.person({ pos: [0.8, 0, -2.7], color: "#4a3a2f", height: 1.3 });
      const nameplate = W.sign({ text: "면접위원", w: 0.3, h: 0.08, pos: [0, 0.8, -1.65], rotX: -15, bg: "#ffffff", fg: "#333" });
      const waterGlass = W.cylinder({ radius: 0.035, height: 0.11, pos: [0.3, 0.74, -1.65], color: "#d6eef7" });
      return { table, interviewer1, interviewer2, interviewer3, nameplate, waterGlass };
    },
  },
  "13": {
    title: "옷 입어 보기", place: "room",
    objects: { mirror: "앞쪽 전신 거울", reflection: "거울에 비친 내 모습", shirt: "고른 셔츠 (거울 속 내 몸 위치)", sofa: "옆 소파", phone: "소파 위 스마트폰" },
    build(W) {
      W.view({ eye: [0, 1.6, 0.6], pitch: -8 });
      const mirror = W.box({ size: [0.9, 1.9, 0.04], pos: [0, 0.05, -2.2], color: "#dfeaf0", opacity: 0.3 });
      W.box({ size: [1.0, 2.0, 0.03], pos: [0, 0, -2.25], color: "#8a6a4a", opacity: 0.0 });
      const reflection = W.person({ pos: [0, 0, -2.6], color: "#7f8c8d" });
      const shirt = W.box({ size: [0.46, 0.5, 0.12], pos: [0, 0.95, -2.55], color: "#4a90c2" });
      const sofa = W.box({ size: [1.6, 0.45, 0.8], pos: [-1.9, 0, -1.6], color: "#5b6b7a" });
      const phone = W.box({ size: [0.08, 0.01, 0.16], pos: [-1.6, 0.45, -1.5], color: "#1f2328" });
      return { mirror, reflection, shirt, sofa, phone };
    },
  },
  "14": {
    title: "집 구하기", place: "room",
    objects: { livingRoom: "매물의 거실 바닥", window: "큰 창문", sofa: "소파", kitchen: "주방 조리대", door: "현관 쪽 문", balcony: "창밖 발코니" },
    build(W) {
      W.view({ eye: [0, 1.6, 1.2], pitch: -10 });
      const livingRoom = W.box({ size: [7, 0.02, 7], pos: [0, 0, -1.5], color: "#c9ad86" });
      const window = W.sign({ text: "", w: 2.2, h: 1.4, pos: [0.4, 1.5, -4.44], bg: "#bfe1f5" });
      const balcony = W.box({ size: [2.4, 1.0, 0.05], pos: [0.4, 0, -4.4], color: "#e9edf0" });
      const sofa = W.box({ size: [1.9, 0.45, 0.85], pos: [-0.3, 0, -2.4], color: "#8a9aa8" });
      const kitchen = W.box({ size: [0.65, 0.9, 2.2], pos: [2.6, 0, -2.2], color: "#f1efe9" });
      const door = W.box({ size: [0.05, 2.1, 0.95], pos: [-3.45, 0, -1.2], color: "#8a6a4a" });
      return { livingRoom, window, sofa, kitchen, door, balcony };
    },
  },
  "15": {
    title: "은행 앱 송금", place: "room",
    objects: { phone: "손에 든 스마트폰", phoneScreen: "송금 앱 화면 (받는 사람 · 금액 · 보내기)", table: "카페 테이블", coffee: "커피잔" },
    build(W) {
      W.view({ eye: [0, 1.25, 0.3], pitch: -22 });
      const table = W.box({ size: [1.0, 0.74, 0.7], pos: [0, 0, -0.75], color: "#b88f62" });
      const coffee = W.cylinder({ radius: 0.045, height: 0.09, pos: [0.3, 0.74, -0.8], color: "#f5f1ea" });
      const phone = W.box({ size: [0.085, 0.17, 0.008], pos: [0, 0.98, -0.2], color: "#1f2328", rot: [-20, 0, 0] });
      const phoneScreen = W.sign({ text: "받는 사람  김민지\n금액  30,000원\n[ 보내기 ]", w: 0.075, h: 0.15, pos: [0, 1.063, -0.195], rotX: -20, bg: "#ffffff", fg: "#1b5fb8", emissive: true });
      return { phone, phoneScreen, table, coffee };
    },
  },
  "16": {
    title: "수강 신청", place: "room",
    objects: { desk: "기숙사 책상", laptop: "노트북", laptopScreen: "수강 신청 화면 (과목 목록 · 담기 버튼)", wallClock: "벽시계 (곧 10시)", mouse: "마우스" },
    build(W) {
      W.view({ eye: [0, 1.2, 0.3], pitch: -18 });
      const desk = W.box({ size: [1.4, 0.74, 0.7], pos: [0, 0, -0.8], color: "#a9845e" });
      const laptop = W.box({ size: [0.36, 0.015, 0.24], pos: [0, 0.74, -0.75], color: "#b9bec4" });
      const laptopScreen = W.sign({ text: "수강 신청\nHCI와 커뮤니케이션  [담기]\n인지심리학  [담기]\n데이터 시각화  [담기]", w: 0.34, h: 0.22, pos: [0, 0.87, -0.88], rotX: -10, bg: "#ffffff", fg: "#2b3a55", emissive: true });
      const mouse = W.box({ size: [0.06, 0.03, 0.1], pos: [0.3, 0.74, -0.7], color: "#e1e4e8" });
      const wallClock = W.sign({ text: "9:59", w: 0.35, h: 0.35, pos: [0.6, 1.75, -4.44], bg: "#ffffff", fg: "#c0392b" });
      return { desk, laptop, laptopScreen, wallClock, mouse };
    },
  },
  "17": {
    title: "자전거 길 안내", place: "street",
    objects: { bikeLane: "앞쪽 자전거 도로", handlebar: "내 자전거 핸들", phoneMount: "핸들 위 거치대의 스마트폰", crosswalk: "앞쪽 횡단보도", pedestrian1: "횡단보도를 건너는 보행자", pedestrian2: "인도의 보행자", car: "옆 차로의 자동차" },
    build(W) {
      W.view({ eye: [-2.6, 1.45, 0.5], pitch: -12 });
      const bikeLane = W.box({ size: [1.6, 0.02, 40], pos: [-2.6, 0.012, -18], color: "#5f8f6a" });
      const crosswalk = W.group([0, 1, 2, 3, 4, 5].map(i => W.box({ size: [0.5, 0.02, 3], pos: [-4.5 + i * 1.2, 0.015, -9], color: "#f2f2f2" })));
      const handlebar = W.box({ size: [0.6, 0.03, 0.03], pos: [-2.6, 1.0, -0.15], color: "#2b2f35" });
      const phoneMount = W.box({ size: [0.08, 0.15, 0.01], pos: [-2.6, 1.08, -0.2], color: "#1f2328", rot: [-30, 0, 0] });
      const pedestrian1 = W.person({ pos: [-2.2, 0, -9], color: "#a0522d" });
      const pedestrian2 = W.person({ pos: [-4.2, 0, -5], color: "#4b6584" });
      const car = W.box({ size: [1.8, 1.4, 4], pos: [1.6, 0, -12], color: "#d0d4d8" });
      W.every(t => { pedestrian1.position.x = -3.6 + ((t * 0.35) % 3.2); });
      return { bikeLane, handlebar, phoneMount, crosswalk, pedestrian1, pedestrian2, car };
    },
  },
  "18": {
    title: "운전 중 내비게이션", place: "car",
    objects: { dashboard: "운전석 대시보드", navScreen: "가운데 내비게이션 화면", windshield: "앞 유리 (운전자 시야)", intersection: "앞쪽 갈림길 교차로", trafficLight: "신호등", carAhead: "앞차", pedestrian: "건널목의 보행자" },
    build(W) {
      W.view({ pitch: -6 });
      const navScreen = W.sign({ text: "▲ 300m 앞 우회전", w: 0.24, h: 0.14, pos: [0.42, 1.2, -0.5], rotX: -20, bg: "#1d2a33", fg: "#8fd3ff", emissive: true });
      const intersection = W.box({ size: [30, 0.02, 8], pos: [0, 0.011, -20], color: "#6a6e73" });
      const trafficLight = W.group([W.box({ size: [0.12, 4.5, 0.12], pos: [2.8, 0, -16], color: "#3a3f45" }), W.sign({ text: "●", w: 0.35, h: 0.35, pos: [2.8, 4.3, -15.9], bg: "#222", fg: "#2ecc71", emissive: true })]);
      const carAhead = W.box({ size: [1.8, 1.4, 4], pos: [0, 0, -11], color: "#7d8fa3" });
      const pedestrian = W.person({ pos: [-3.5, 0, -17], color: "#8e44ad" });
      const dashboard = W.box({ size: [2.2, 0.04, 0.6], pos: [0, 1.12, -0.35], color: "#2b2f35" });
      const windshield = W.box({ size: [2.1, 0.9, 0.01], pos: [0, 1.15, -0.62], color: "#cfe6f5", opacity: 0.08 });
      return { dashboard, navScreen, windshield, intersection, trafficLight, carAhead, pedestrian };
    },
  },
};

// AI 지시문에 넣을 물체 목록
export const caseObjectsText = id => {
  const c = CASES[String(id)];
  if (!c) return null;
  return Object.entries(c.objects).map(([k, v]) => `- W.obj.${k}: ${v}`).join("\n");
};
