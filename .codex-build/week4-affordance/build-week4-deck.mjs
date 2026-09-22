import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "F:/성신여자대학교/수업/2026_02/HCI와 커뮤니케이션/retroApp";
const templatePath = "F:/성신여자대학교/수업/2025_02/HCI와 커뮤니케이션/템플릿.pptx";
const skillDir = "C:/Users/User/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.61513/skills/presentations";
const runtimePython = "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
process.env.RUNTIME_NODE_MODULES = "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
process.env.RUNTIME_BIN_DIR = "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override";
const buildDir = path.join(workspaceDir, ".codex-build/week4-affordance");
const outDir = path.join(workspaceDir, "outputs");
const finalPath = path.join(outDir, "HCI_4주차_어포던스와_시그니파이어_노만의공방_20260922_v2.pptx");
const stagingDir = path.join(workspaceDir, ".codex-finalizer/week4-affordance");
const benchPng = path.join(buildDir, "bench.png");

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(stagingDir, { recursive: true });

const FONT = "맑은 고딕";
const TITLE_BLUE = "#1E76BB";
const BODY_BLUE = "#174A7A";
const DARK = "#1F2B35";
const SOFT = "#586879";
const LIGHT = "#EFF3F7";
const LINE = "#B9C3CC";
const GREEN = "#4F8738";
const ORANGE = "#D9A441";

const presentation = await PresentationFile.importPptx(await FileBlob.load(templatePath));
const cover = presentation.slides.getItem(0);
const bodyTemplate = presentation.slides.getItem(1);
while (presentation.slides.items.length < 14) bodyTemplate.duplicate();
const slides = presentation.slides.items;

function setText(shape, text, style = {}) {
  shape.text = text;
  shape.text.style = Object.assign({ typeface: FONT, fontSize: 22, color: BODY_BLUE, autoFit: "shrinkText" }, style);
}
function addText(slide, text, pos, style = {}) {
  const sh = slide.shapes.add({ geometry: "textbox", position: pos, fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  setText(sh, text, style);
  return sh;
}
function addTitle(slide, idx, title, subtitle = "") {
  addText(slide, `${String(idx).padStart(2, "0")}`, { left: 96, top: 84, width: 64, height: 34 }, { fontSize: 18, bold: true, color: "#7E8790" });
  addText(slide, title, { left: 148, top: 86, width: 990, height: 50 }, { fontSize: 31, bold: true, color: TITLE_BLUE });
  if (subtitle) addText(slide, subtitle, { left: 150, top: 127, width: 980, height: 30 }, { fontSize: 15, color: SOFT });
}
function bulletText(items) {
  return items.map(x => `• ${x}`).join("\n");
}
function addBullets(slide, items, pos = { left: 100, top: 170, width: 560, height: 430 }, size = 22) {
  return addText(slide, bulletText(items), pos, { fontSize: size, color: BODY_BLUE });
}
function addNote(slide, text, pos, fill = "#F7FAFC") {
  const box = slide.shapes.add({ geometry: "roundRect", position: pos, fill, line: { style: "solid", fill: "#D5DCE3", width: 1 }, borderRadius: 16 });
  setText(box, text, { fontSize: 18, color: DARK, autoFit: "shrinkText" });
  return box;
}
function addSnapshot(slide, label, detail, pos = { left: 745, top: 178, width: 420, height: 330 }) {
  const box = slide.shapes.add({ geometry: "roundRect", position: pos, fill: "#F0F3F6", line: { style: "dashed", fill: LINE, width: 2 }, borderRadius: 18 });
  setText(box, `${label}\n\n${detail}\n\n촬영 후 이 자리의 회색 박스를 실제 스냅샷으로 교체`, { fontSize: 20, bold: true, color: "#415160", autoFit: "shrinkText" });
  return box;
}
function clearBody(slide) {
  for (const im of [...slide.images.items]) im.delete();
  for (const tb of [...(slide.tables?.items || [])]) tb.delete?.();
  for (const ch of [...(slide.charts?.items || [])]) ch.delete?.();
  for (const sh of [...slide.shapes.items]) sh.delete();
}
function addTable(slide, values, pos, opts = {}) {
  const table = slide.tables.add({ rows: values.length, columns: values[0].length, left: pos.left, top: pos.top, width: pos.width, height: pos.height, values });
  table.styleOptions = { headerRow: true, bandedRows: true };
  table.borders.assign({ style: "solid", fill: "#D3DAE2", width: 1 });
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[0].length; c++) {
      const cell = table.getCell(r, c);
      cell.text.style = { typeface: FONT, fontSize: opts.fontSize || 15, color: r === 0 ? "#FFFFFF" : DARK, bold: r === 0 };
      if (r === 0) cell.fill = opts.headerFill || TITLE_BLUE;
      else if (r % 2 === 0) cell.fill = "#F7FAFC";
    }
  }
  return table;
}

// Cover: preserve template cover, replace main image with bench and update text.
const benchBytes = await fs.readFile(benchPng);
if (cover.images.items[0]) {
  const im = cover.images.items[0];
  const frame = im.frame;
  await im.replace({ blob: benchBytes, contentType: "image/png", alt: "노만의 공방 작업대 배경", fit: "cover" });
  im.frame = frame;
}
const coverTitle = cover.shapes.items.find(s => s.name === "TextBox 8");
const coverProf = cover.shapes.items.find(s => s.name === "TextBox 9");
if (coverTitle) setText(coverTitle, "HCI와 커뮤니케이션 4주차\n어포던스와 시그니파이어", { fontSize: 34, bold: true, color: "#FFFFFF" });
if (coverProf) setText(coverProf, "온라인 요약 · 오프라인 실습\n「노만의 공방」\n박윤정 교수", { fontSize: 20, color: "#FFFFFF" });
cover.speakerNotes.textFrame.setText("표지 배경: retroApp/public/norman/img/bench.webp를 PNG로 변환해 삽입.");

const slideData = [
  {
    idx: 2,
    title: "이번 주의 질문",
    bullets: [
      "처음 보는 문 앞에서 밀지 당길지를 어떻게 아는가",
      "가로 손잡이는 내려서 열기, 동그란 손잡이는 돌리기로 읽힌다",
      "문을 잘못 미는 일은 사용자의 실수보다 문의 설계 문제에 가깝다",
      "오늘의 세 개념: 어포던스, 시그니파이어, 두 개의 간극",
    ],
    note: "온라인 3~4쪽 요약",
  },
  {
    idx: 3,
    title: "어포던스",
    bullets: [
      "깁슨(1977): 환경이 행위자에게 제공하는 행동 가능성",
      "사물의 속성이 아니라 사물과 행위자의 관계 속에 있다",
      "의자는 앉기, 밟고 올라서기, 문 고정, 던지기까지 허용할 수 있다",
      "같은 창문도 도둑에겐 기어오를 가능성이지만 아이에겐 아닐 수 있다",
      "알아차리지 못해도 어포던스는 이미 있다. 다만 쓰이지 못한다",
    ],
    note: "온라인 5~11쪽 요약",
  },
  {
    idx: 4,
    title: "시그니파이어",
    bullets: [
      "노먼(1988)은 ‘지각된 어포던스’를 HCI에 들여왔다",
      "노먼(2008)의 2쪽짜리 글 제목: Signifiers, not affordances",
      "“이 버튼에 어포던스를 추가했다”는 말은 정확하지 않다",
      "대부분의 문은 밀기와 당기기를 모두 허용한다. 차이는 시그니파이어에서 난다",
    ],
    table: {
      values: [
        ["구분", "어포던스", "시그니파이어"],
        ["어디에", "사물과 행위자의 관계", "디자이너가 보이게 만든 단서"],
        ["더할 수 있나", "아니오", "예"],
      ],
      pos: { left: 705, top: 224, width: 475, height: 170 },
    },
    note: "온라인 12~16쪽 요약",
  },
  {
    idx: 5,
    title: "갈라 보기",
    bullets: [
      "개버(1991): 지각 가능한 어포던스, 숨은 어포던스, 거짓 어포던스",
      "하트슨(2003): 물리적, 감각적, 인지적, 기능적 어포던스",
      "‘밀어서 잠금해제’는 손잡이, 문구와 화살표, 밝은 대비, 실제 해제가 함께 작동한다",
      "제약은 할 수 없는 쪽을 막아서 알린다",
      "관습은 배운다. 파란 밑줄은 링크, 세 줄 아이콘은 차림표로 읽힌다",
    ],
    noteBox: "제약의 네 갈래\n물리적 · 의미적 · 문화적 · 논리적",
    note: "온라인 17~21쪽 요약",
  },
  {
    idx: 6,
    title: "두 개의 간극",
    table: {
      values: [
        ["구분", "실행의 간극", "평가의 간극"],
        ["무엇을 모르나", "무엇을 해야 할지", "무슨 일이 일어났는지"],
        ["해결", "시그니파이어", "피드백"],
        ["예", "처음 보는 문", "엘리베이터 닫힘 버튼 연타"],
      ],
      pos: { left: 100, top: 180, width: 665, height: 235 },
    },
    bulletsRight: [
      "스키우모피즘과 플랫 디자인의 논쟁은 단서를 얼마나 덜어 낼 수 있는가의 문제였다",
      "정리: 어포던스는 더하거나 뺄 수 없다",
      "디자이너가 더하는 것은 시그니파이어다",
    ],
    note: "온라인 22~26쪽 요약",
  },
  {
    idx: 7,
    title: "오늘 할 일: 노만의 공방",
    bullets: [
      "주소: retro-app-six.vercel.app/norman/",
      "조별로 들어간다. PC 여러 대로 들어와도 같은 공방을 본다",
      "여러분은 앱 화면을 고쳐 파는 장인이다",
      "주문으로 들어온 화면은 이미 다 작동한다",
      "기능은 손대지 못한다. 붙일 수 있는 것은 단서뿐이다",
    ],
    snapshot: ["스냅샷 ①", "조 고르는 첫 화면\n20개 조 격자 + ‘공방 문을 연다’"],
    notes: "촬영: /norman/ 접속 직후. 실서버에서 Firebase 초기화 후 팀 격자가 보이는 상태로 촬영.",
  },
  {
    idx: 8,
    title: "한 바퀴 돌아보기",
    process: "주문서 받기 → 상점에서 재료 사기 → 제작대에서 합치기\n→ 화면에 끌어다 붙이기 → 테스트해 보기 → 앱시장에 내놓기",
    bullets: ["밑천 1,000 포인트로 시작", "하나 팔면 다음 의뢰가 들어온다", "의뢰는 모두 40가지"],
    snapshot: ["스냅샷 ②", "공방 작업대 전체\n왼쪽 선반 · 가운데 주문서와 앱 화면 · 오른쪽 제작대"],
    notes: "촬영: 조 선택 후 입장. 창 너비 1400px 이상 권장.",
  },
  {
    idx: 9,
    title: "상점: 재료를 삽니다",
    bullets: ["시그니파이어가 될 재료를 파는 곳", "재료를 합쳐서 하나의 시그니파이어를 만든다"],
    table: {
      values: [
        ["재료", "값", "재료", "값"],
        ["글자 · 그림", "40P", "테두리 · 진한 색", "30P"],
        ["깜박임", "40P", "큰 크기 · 화살표", "30P"],
        ["쪽지", "50P", "홈 · 그늘 · 떨림", "30P"],
        ["체크 표시 · 소리", "40P", "밑줄", "20P"],
      ],
      pos: { left: 94, top: 270, width: 555, height: 245 },
    },
    snapshot: ["스냅샷 ③", "상점 화면"],
    notes: "촬영: 상단 ‘상점’ 클릭.",
  },
  {
    idx: 10,
    title: "제작대: 둘을 합쳐 단서 만들기",
    bullets: [
      "테두리 + 깜박임 → 깜박이는 입력칸",
      "글자 + 테두리 → 라벨 붙은 요소",
      "그늘 + 테두리 → 눌림 반응",
      "글자 + 쪽지 → 알림 쪽지",
      "만든 단서를 끌어다 화면 위에 놓으면 붙는다",
    ],
    snapshot: ["스냅샷 ④", "제작대\n재료 두 칸 + 만들기 + 만든 단서"],
    notes: "촬영: 공방 화면 오른쪽 제작대 패널.",
  },
  {
    idx: 11,
    title: "막히면: 단서 조합표",
    bullets: [
      "테스트를 돌리면 ‘사용자가 막힌 이유’가 나온다",
      "굵은 글씨가 모자란 단서의 이름이다",
      "예: 조작한 뒤 결과 알려주기",
      "제작대 맨 아래 조합표에서 같은 묶음을 찾는다",
      "그 줄의 재료를 상점에서 사 오면 된다",
    ],
    snapshot: ["스냅샷 ⑤", "테스트 결과 카드 + 단서 조합표\n두 장을 나란히 배치"],
    notes: "촬영: 테스트해 보기 누른 뒤 결과 카드와 제작대 하단 단서 조합표가 함께 보이게 촬영.",
  },
  {
    idx: 12,
    title: "앱시장: 팔러 갑니다",
    bullets: [
      "테스트에서 막히는 데가 없어야 내놓을 수 있다",
      "화면 하나에 100~200 포인트",
      "과제 경로 밖까지 챙기면 가격이 오른다",
      "군더더기 없이 적은 단서로 해결하면 가격이 오른다",
      "터치되지 않는 곳에 터치돼 보이는 단서를 붙이면 감점된다",
      "팔면 다음 의뢰가 들어온다",
    ],
    snapshot: ["스냅샷 ⑥", "앱시장 출품 심사 화면"],
    notes: "촬영: 테스트 통과 후 ‘앱시장에 내놓기’ 클릭.",
  },
  {
    idx: 13,
    title: "돈이 떨어지면: 문제 풀기",
    bullets: [
      "재료 값이 버는 것보다 크다. 반드시 쪼들린다",
      "초상화가 빛나면 노만 영감이 말을 거는 것",
      "초상화를 클릭하면 퀴즈가 시작된다",
      "온라인 강의 내용 16문제. 맞히면 40 포인트",
      "한 문제는 한 번만 답할 수 있다",
    ],
    snapshot: ["스냅샷 ⑦", "문제 풀기 화면"],
    notes: "촬영: 상단 ‘문제 풀기’ 또는 빛나는 노만 초상화 클릭.",
  },
  {
    idx: 14,
    title: "마무리: 실습보고서 내려받기",
    bullets: [
      "‘조별 활동 종료’가 되면 모든 조의 포인트 적립이 중지된다",
      "각자 화면에 ‘실습보고서 내려받기’가 뜬다",
      "한 사람씩 각자 내려받는다. 워드와 한글에서 열린다",
      "숫자는 이미 기록된다. 학번, 이름, 나머지 문항을 채우면 된다",
    ],
    snapshot: ["스냅샷 ⑧", "종료 화면 + 워크북 1쪽"],
    notes: "촬영: /norman/board.html에서 조별 활동 종료 후 학생 화면. 워크북 1쪽도 함께 캡처. 촬영은 연습용 조로 하고 수업 전 /norman/admin.html에서 되돌리기.",
  },
];

for (let i = 1; i < slides.length; i++) clearBody(slides[i]);

for (const item of slideData) {
  const slide = slides[item.idx - 1];
  addTitle(slide, item.idx, item.title, item.note || "");
  if (item.process) {
    addNote(slide, item.process, { left: 100, top: 180, width: 605, height: 135 }, "#F7FBFF");
    addBullets(slide, item.bullets || [], { left: 110, top: 345, width: 560, height: 160 }, 22);
  } else if (item.table && item.idx === 6) {
    addTable(slide, item.table.values, item.table.pos, { fontSize: 14 });
    addBullets(slide, item.bulletsRight, { left: 800, top: 186, width: 350, height: 250 }, 19);
  } else if (item.table && item.idx === 4) {
    addBullets(slide, item.bullets, { left: 100, top: 180, width: 555, height: 330 }, 20);
    addTable(slide, item.table.values, item.table.pos, { fontSize: 13 });
  } else if (item.table && item.idx === 9) {
    addBullets(slide, item.bullets, { left: 100, top: 180, width: 555, height: 85 }, 20);
    addTable(slide, item.table.values, item.table.pos, { fontSize: 13, headerFill: GREEN });
  } else {
    addBullets(slide, item.bullets, { left: 100, top: 176, width: item.snapshot ? 570 : 980, height: 390 }, item.idx >= 12 ? 19 : 21);
  }
  if (item.noteBox) addNote(slide, item.noteBox, { left: 780, top: 220, width: 350, height: 175 }, "#FFF7E6");
  if (item.snapshot) addSnapshot(slide, item.snapshot[0], item.snapshot[1], { left: 745, top: item.idx === 11 ? 176 : 184, width: 420, height: item.idx === 11 ? 360 : 320 });
  slide.speakerNotes.textFrame.setText(item.notes || item.note || "내용: 사용자 제공 요청 기준.");
}

// Add a compact capture checklist to slide 14 notes and bottom text.
addText(slides[13], "촬영 메모: 연습용 조(예: 20조)로 촬영하고, 수업 전 admin에서 해당 조를 되돌립니다.", { left: 100, top: 615, width: 1040, height: 40 }, { fontSize: 16, color: SOFT });
slides[13].speakerNotes.textFrame.setText(`스냅샷 촬영 목록\n① 조 고르기: /norman/ 접속 직후\n② 공방 작업대 전체: 조 선택 후 입장, 창 1400px 이상 권장\n③ 상점: 상단 상점\n④ 제작대: 공방 화면 오른쪽 패널\n⑤ 테스트 결과 + 조합표: 테스트해 보기 누른 뒤\n⑥ 앱시장: 테스트 통과 후 앱시장에 내놓기\n⑦ 문제 풀기: 상단 문제 풀기\n⑧ 종료 + 워크북: /norman/board.html에서 종료 후 학생 화면\n촬영은 연습용 조로 하고, 수업 전 /norman/admin.html에서 그 조를 되돌리기.`);

const draftPath = path.join(buildDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(draftPath);

// Render draft previews.
const previewDir = path.join(buildDir, "draft-preview");
await fs.mkdir(previewDir, { recursive: true });
const montage = await presentation.export({ format: "webp", montage: { columns: 4, slideWidth: 320, padding: 16, gap: 12, background: "#F2F4F7" }, scale: 1 });
await fs.writeFile(path.join(previewDir, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
for (let i = 0; i < slides.length; i++) {
  const png = await slides[i].export({ format: "png", scale: 1 });
  await fs.writeFile(path.join(previewDir, `slide-${String(i+1).padStart(2,"0")}.png`), new Uint8Array(await png.arrayBuffer()));
}

const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
const referenceSha256 = crypto.createHash("sha256").update(await fs.readFile(templatePath)).digest("hex");
const requirements = {
  explicitTotalSlideCount: 14,
  requiredNativeTableOwnerSlides: [4, 6, 9],
};
const fontPolicy = {
  basis: "design",
  families: ["맑은 고딕"],
  scriptFonts: { ea: "맑은 고딕" },
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath: draftPath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide", "4",
    "--require-native-table-slide", "6",
    "--require-native-table-slide", "9",
  ],
  requiredNativeTableOwnerSlides: [4, 6, 9],
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(finalPath)}.validation.json`),
});
console.log(JSON.stringify({ draftPath, finalPath, previewDir, validation: result }, null, 2));
