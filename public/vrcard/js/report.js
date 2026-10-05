// 실습보고서 — 조가 한 일을 적어 넣은 워드 문서(.doc)를 만들어 내려 준다. 5주차 앱 공방과 같은 틀.
//   1부 — 우리 조 분류와 반 전체 비교 (자동)
//   2부 — 재설계안 (자동)
//   3부 — 받은 부작용과 대응책 · 우리가 붙인 부작용 (자동)
//   4부 — 온라인 강의와 잇기 (쪽 번호 옆에 실습 장면을 적는다)
//   5부 — 생각
import { CARDS, QUADS, WARNS, CHECKS, teamId, teamLabel, cardOf, theoryName, sideName, sideTargetOf, sideFromOf, sideDocId, pairOf } from "./data.js";
import { tally } from "./compare.js";

/* 쪽 번호는 「6주차_온라인_신규」 (26쪽) 의 슬라이드 번호다. 강의 파일을 고치면 여기도 같이 고친다. */
const LINKS = [
  ["현실–가상 연속체 · 현실감과 몰입감 두 축", "4 · 5"],
  ["장소 착각 — 그래픽보다 반응", "7"],
  ["개연성 착각과 구덩이 방", "8"],
  ["몸의 착각 — 고무손에서 아바타까지", "9"],
  ["사이버 멀미 — 감각 갈등", "10"],
  ["증강현실의 세 조건 · 분할 주의", "11 · 12"],
  ["주의의 대가 — 주의 터널링", "14"],
  ["뇌의 원리가 곧 설계 지침", "15"],
  ["실재 기반 인터랙션 · 자연스러움과 마법 사이", "16 · 17"],
  ["효과 ① 훈련과 치료 · 효과 ② 학습", "18 · 20"],
  ["왜 수술은 되고, 과학은 안 됐나", "21"],
  ["미래 방향 — 지각의 틈 · 보이지 않는 입력과 AI", "22 · 25"],
];

const esc = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const blank = n => "&nbsp;".repeat(n || 30);
const qName = q => q ? QUADS[q].ko : "&mdash;";
const warnText = w => (w || []).map(n => n === 1 ? "⚠①" : "⚠②").join(" ") || "";

export function build({ team, name, boards, designs, sides }) {
  const my = boards[teamId(team)]?.cards || {};
  const pc = boards[teamId(pairOf(team))]?.cards || {};
  const T = tally(boards);
  const top = r => { const k = Object.keys(r.n).sort((a, b) => r.n[b] - r.n[a])[0]; return r.total ? `${QUADS[k].ko} (${r.n[k]}/${r.total}조)` : "&mdash;"; };

  const rows = CARDS.map(c => {
    const x = my[c.id] || {}, r = T.find(t => t.card.id === c.id);
    const same = x.q && r.total && r.n[x.q] === Math.max(...Object.values(r.n));
    return `<tr><td>${c.id}</td><td>${esc(c.title)}</td><td>${qName(x.q)}</td><td>${warnText(x.warn)}</td>
      <td>${esc(theoryName(x.theory) || x.theoryOther || "")}</td><td>${esc(x.why || "")}</td><td>${qName(pc[c.id]?.q)}${(pc[c.id]?.q || null) !== (x.q || null) ? " ◀" : ""}</td><td>${top(r)}${x.q && !same ? " ◀ 불일치" : ""}</td></tr>`;
  }).join("");
  const custom = Object.entries(my).filter(([k, x]) => k.startsWith("c") && !x.removed && x.title).map(([, x]) =>
    `<tr><td>+</td><td>${esc(x.title)}<br><small>${esc(x.desc)}</small></td><td>${qName(x.q)}</td><td>${warnText(x.warn)}</td><td>${esc(theoryName(x.theory) || x.theoryOther || "")}</td><td>${esc(x.why || "")}</td><td>&mdash;</td><td>우리 조 사례</td></tr>`).join("");

  const d = designs[teamId(team)] || {};
  const dcard = d.card ? (my[d.card]?.title || cardOf(d.card).title) : "";
  const design = d.card ? `<table><tr><th>선택 사례</th><td>${esc(dcard)} &rarr; ${esc(d.kind || "")}</td></tr>
      <tr><th>사용자 · 시점 · 장소</th><td>${esc(d.who)}</td></tr><tr><th>현행 방식의 문제</th><td>${esc(d.pain)}</td></tr>
      <tr><th>적용 화면 설명</th><td>${esc(d.change)}</td></tr><tr><th>근거 이론</th><td>${esc(theoryName(d.theory))}</td></tr>
      ${CHECKS.map(k => `<tr><th>${esc(k.ko)}<br><small>${esc(k.q)}</small></th><td>${esc(d.checks?.[k.id] || "")}</td></tr>`).join("")}</table>
      <p>화면 목업: 웹 화면(재설계 · 부작용 검토 단계)에서 확인</p>` : `<p>제출 설계안 없음</p>`;

  const from = sideFromOf(team), target = sideTargetOf(team);
  const got = sides[sideDocId(team, from)], gave = sides[sideDocId(target, team)];
  const gotT = got?.items?.length ? `<table><tr><th>부작용</th><th>내용</th><th>우리 조 대응책</th></tr>${got.items.map((x, i) =>
    `<tr><td>${esc(sideName(x.kind))}</td><td>${esc(x.note)}</td><td>${esc(got.replies?.[i] || "")}</td></tr>`).join("")}</table>` : `<p>받은 부작용 없음</p>`;
  const gaveT = gave?.items?.length ? `<table><tr><th>부작용</th><th>내용</th></tr>${gave.items.map(x =>
    `<tr><td>${esc(sideName(x.kind))}</td><td>${esc(x.note)}</td></tr>`).join("")}</table>` : `<p>입력한 부작용 없음</p>`;

  const links = LINKS.map(([t, p]) => `<tr><td>${esc(t)}</td><td style="text-align:center">${p}</td><td>${blank(40)}</td></tr>`).join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">
<style>body{font-family:'맑은 고딕',sans-serif;font-size:10.5pt;line-height:1.5}h1{font-size:18pt}h2{font-size:13pt;border-bottom:1px solid #999;margin-top:18pt}
table{border-collapse:collapse;width:100%;margin:6pt 0}td,th{border:1px solid #888;padding:3pt 5pt;vertical-align:top;font-size:9.5pt}th{background:#EEF1F4;text-align:left}
.q{margin:10pt 0 2pt;font-weight:bold}.box{border:1px solid #888;height:90pt}</style></head><body>
<h1>6주차 오프라인 실습보고서 — VR · AR 적용 판단 실습</h1>
<p>${teamLabel(team)} · 이름 ${esc(name)} · 학번 ${blank(20)}</p>
<p>분류 기준 — 세로: 신체 반응 필요 여부(실재감 · 체화) / 가로: 현실 사물과의 정보 결합 필요 여부(분할 주의 · 정합)<br>
경고 기준 — ⚠① ${esc(WARNS[0].ko)} (${esc(WARNS[0].ref)}) · ⚠② ${esc(WARNS[1].ko)} (${esc(WARNS[1].ref)})</p>

<h2>1부. 우리 조 분류 · 반 전체 비교</h2>
<table><tr><th>번호</th><th>사례</th><th>우리 조 배치</th><th>경고 기준</th><th>근거 이론</th><th>이유</th><th>짝 조(${teamLabel(pairOf(team))}) 배치</th><th>반 전체 최다 배치</th></tr>${rows}${custom}</table>

<h2>2부. 재설계안</h2>${design}

<h2>3부. 부작용 · 대응책</h2>
<p class="q">받은 부작용 (입력: ${teamLabel(from)})</p>${gotT}
<p class="q">입력한 부작용 (대상: ${teamLabel(target)} 설계안)</p>${gaveT}

<h2>4부. 온라인 강의 연결</h2>
<p>작성 방법: 개념별 해당 실습 장면 1줄 (해당 없음 시 공란)</p>
<table><tr><th>온라인 강의 개념</th><th>쪽</th><th>해당 실습 장면</th></tr>${links}</table>

<h2>5부. 개인 의견</h2>
<p class="q">1. 반 전체와 판단이 가장 다른 사례 및 우리 조의 판단 근거 (참고: 1부 「불일치」 표시)</p><div class="box"></div>
<p class="q">2. 재설계안의 몰입 요소 사용 범위 및 근거 (참고: 온라인 20쪽 학습 효과 연구)</p><div class="box"></div>
<p class="q">3. 받은 부작용 1개와 우리 설계안 장점의 공통 원인 (해당 지각 · 인지 원리)</p><div class="box"></div>
</body></html>`;
}

export function download(data) {
  const html = build(data);
  const blob = new Blob(["﻿" + html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `6주차_실습보고서_${teamLabel(data.team)}_${(data.name || "").replace(/[\\/:*?"<>|]/g, "")}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
