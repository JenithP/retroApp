// 조별 결과 — 조 번호를 고르면 명세서와 받은 평가 집계를 보여 주고 워드 파일(.doc)로 내려받게 한다.
// 서버(api/casa · report)는 집계만 돌려준다.
import * as D from "./data.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const API = location.hostname.endsWith(".vercel.app") ? "/api/casa" : "https://retro-app-six.vercel.app/api/casa";
const f2 = v => v == null ? "—" : v.toFixed(2);
const catKo = id => D.CUE_CATS.find(c => c.id === id)?.ko || "—";
const ITEM = Object.fromEntries([
  ...D.GODSPEED.map(it => [it.id, `${it.lo} – ${it.hi}`]),
  ...D.MIND.map(it => [it.id, it.ko]),
]);
let R = null;

$("teams").innerHTML = Array.from({ length: D.TEAM_COUNT }, (_, i) => `<button class="btn" type="button" data-t="${i + 1}">${i + 1}조</button>`).join("");
$("teams").onclick = async e => {
  const t = Number(e.target.dataset.t);
  if (!t) return;
  $("msg").className = "msg"; $("msg").textContent = "불러오는 중…";
  try {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report", team: t }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
    R = data; $("msg").textContent = ""; show();
  } catch (err) { $("msg").className = "msg err"; $("msg").textContent = err.message; }
};

function tables() {
  const scores = `<table class="rep"><thead><tr><th>척도</th><th class="num">우리 조</th><th class="num">반 평균</th><th class="num">순위</th></tr></thead><tbody>${
    D.SCALES.map(s => `<tr><td>${s.ko} (1–${s.max})</td><td class="num">${f2(R.scores[s.id])}</td><td class="num">${f2(R.classAvg[s.id])}</td><td class="num">${
      R.rank[s.id] ? `${R.rank[s.id].rank} / ${R.rank[s.id].of}` : "—"}</td></tr>`).join("")}</tbody></table>`;
  const group = (list, scale) => list.filter(it => it.scale === scale).map(it =>
    `<tr><td>${D.SCALES.find(s => s.id === scale).ko}</td><td>${esc(ITEM[it.id])}</td><td class="num">${f2(R.items[it.id])}</td></tr>`).join("");
  const items = `<table class="rep"><thead><tr><th>척도</th><th>문항</th><th class="num">평균</th></tr></thead><tbody>${
    group(D.GODSPEED, "anthro") + group(D.GODSPEED, "animacy") + group(D.MIND, "agency") + group(D.MIND, "experience")}</tbody></table>`;
  const cues = R.cues.filter(c => c.name || c.detail);
  const spec = cues.length ? `<table class="rep"><thead><tr><th>#</th><th>단서 이름</th><th>분류</th><th>넣을 시점</th><th>구체적 내용</th><th>출처</th><th>예상 효과</th></tr></thead><tbody>${
    cues.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${catKo(c.cat)}</td><td>${esc(c.when) || "—"}</td><td>${esc(c.detail)}</td><td>${esc(c.source) || "—"}</td><td>${esc(c.effect) || "—"}</td></tr>`).join("")}</tbody></table>`
    : `<p class="note">저장된 명세서가 없습니다.</p>`;
  return { scores, items, spec };
}

function metaText() {
  const parts = [`평가한 사람 ${R.n}명`, `장치를 만든 조 ${R.devices}개`];
  if (!R.hasDevice) parts.push("우리 조 장치 없음");
  if (R.phase !== "result") parts.push(`지금 단계: ${D.PHASES[R.phase] || R.phase} — 평가가 끝나기 전이면 점수가 바뀔 수 있음`);
  return parts.join(" · ") + ` · ${new Date(R.at).toLocaleString("ko-KR")} 기준`;
}

function show() {
  const t = tables();
  $("out").hidden = false;
  $("title").textContent = `${R.team}조`;
  $("meta").textContent = metaText();
  $("scores").innerHTML = t.scores; $("items").innerHTML = t.items; $("spec").innerHTML = t.spec;
}

// 워드가 여는 HTML 문서(.doc)로 내려받는다
$("dl").onclick = () => {
  if (!R) return;
  const t = tables();
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">
<style>body{font-family:"맑은 고딕";font-size:10.5pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;vertical-align:top;font-size:10pt}th{background:#eef1f5}.num{text-align:right}h1{font-size:16pt}h2{font-size:13pt;margin-top:18pt}p{color:#555;font-size:9.5pt}</style></head><body>
<p>HCI와 커뮤니케이션 · 9주차 오프라인 2부 장치 의인화</p>
<h1>${R.team}조 결과</h1><p>${esc(metaText())}</p>
<h2>받은 평가</h2>${t.scores}<h2>문항별 평균</h2>${t.items}
<p>평가 한 건마다 하위 척도의 평균을 내고, 그 평균을 다시 평균함. 순위는 장치를 만든 조 가운데 순위.<br>Godspeed: Bartneck, Kulić, Croft &amp; Zoghbi (2009) · 마음 지각: Gray, Gray &amp; Wegner (2007), 7점 척도로 변형</p>
<h2>우리 조 명세서</h2>${t.spec}</body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" }));
  a.download = `9주차_2부_${R.team}조_결과.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
