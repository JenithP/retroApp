// 1부 결과 현황판 — 교수가 암호로 열고, 5초마다 버셀 함수에서 1부 기록을 다시 읽는다.
//
// 학생들이 실험하는 동안 교실 화면에 결과가 보이면 안 되므로, 처음에는 응답 수만 보이고
// 「결과 보기」를 눌러야 그림이 나온다.
//
// 지수 — 원문처럼 친근함 5문항 · 유능함 4문항 평균을 튜터링 세션 · 평가 세션 각각에 대해 낸다.
// 편차 비교 — 원문은 같은 컴퓨터 조건의 응답이 덜 퍼졌다고 했다(p < .001). 여기서는 18문항 평균(전체 평가 점수)으로 본다.
//
// 2부 탭 — 단계 넘기기(학생 화면이 따라 바뀜), 장치별 점수 순위, 단서 개수 · 분류와 의인화, 1위 장치 시연.
import { ADJ, condOf, PHASES, PHASE_ORDER, SCALES, GODSPEED, MIND, CUE_CATS, TEAM_COUNT, teamId } from "./data.js";
import { compare, mean, fmtP } from "./stats.js";

const API = location.hostname.endsWith(".vercel.app") ? "/api/casa" : "https://retro-app-six.vercel.app/api/casa";
const DEMO = new URLSearchParams(location.search).has("demo");
const KEY = "hci9_board_code";
const $ = id => document.getElementById(id);

const MEASURES = [
  { key: "tf", part: "t", idx: "friendly",  label: "튜터링 세션 · 친근함", items: 5, p94: "p < .01" },
  { key: "tc", part: "t", idx: "competent", label: "튜터링 세션 · 유능함", items: 4, p94: "p < .02" },
  { key: "ef", part: "e", idx: "friendly",  label: "평가 세션 · 친근함",   items: 5, p94: "p < .001" },
  { key: "ec", part: "e", idx: "competent", label: "평가 세션 · 유능함",   items: 4, p94: "p < .01" },
];
const COND = { screen: { ko: "같은 컴퓨터", var: "--series-1", tint: "--series-1-tint" },
               paper:  { ko: "종이 설문",   var: "--series-2", tint: "--series-2-tint" } };

let code = "";
let showResults = false;
let timer = 0;
let rows = [];
let tab = "p1";
let phase = "p1";
let P2 = null;          // { devices, specs, ratings }
let demoTeam = null;    // 시연 칸에 띄운 조 (없으면 1위)
let demoShown = null;

try { code = sessionStorage.getItem(KEY) || ""; } catch { /* 저장 못 해도 매번 입력하면 된다 */ }

async function call(op, extra = {}) {
  if (DEMO) return demoCall(op, extra);
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin", code, op, ...extra }) });
  let data = {};
  try { data = await r.json(); } catch { /* 빈 답 */ }
  if (!r.ok) throw new Error(data.error || `서버 응답 ${r.status}`);
  return data;
}

async function unlock() {
  code = $("code").value.trim() || code;
  $("lockErr").textContent = "";
  try {
    const chk = await call("check");
    phase = chk.phase || "p1";
    try { sessionStorage.setItem(KEY, code); } catch { /* 무시 */ }
    $("lock").hidden = true; $("tools").hidden = false; $("main").hidden = false; $("bar").hidden = false;
    renderPhases();
    applyHidden();
    await load();
    clearInterval(timer);
    timer = setInterval(load, 5000);
  } catch (e) {
    $("lockErr").textContent = e.message;
  }
}

async function load() {
  try {
    if (tab === "p1") {
      const d = await call("p1");
      rows = d.rows || [];
      $("stamp").textContent = `${new Date(d.at || Date.now()).toLocaleTimeString("ko-KR")} 기준`;
      render();
    } else {
      const d = await call("p2");
      P2 = d; phase = d.phase || phase;
      $("stamp").textContent = `${new Date(d.at || Date.now()).toLocaleTimeString("ko-KR")} 기준`;
      renderPhases(); render2();
    }
  } catch (e) {
    $("stamp").textContent = `불러오지 못함 — ${e.message}`;
  }
}

function applyHidden() {
  $("results").hidden = !showResults;
  $("results2").hidden = !showResults;
  $("hide").textContent = showResults ? "결과 가리기" : "결과 보기";
}

// 학생 화면 단계 — 누르면 바로 바뀐다
function renderPhases() {
  $("phases").innerHTML = `<span class="lab">학생 화면</span>` + PHASE_ORDER.map(p =>
    `<button class="btn${p === phase ? " on" : ""}" type="button" data-phase="${p}" aria-pressed="${p === phase}">${PHASES[p]}</button>`).join("");
}
$("phases").onclick = async e => {
  const p = e.target.dataset.phase;
  if (!p || p === phase) return;
  try { await call("phase", { phase: p }); phase = p; renderPhases(); }
  catch (err) { $("stamp").textContent = err.message; }
};
$("tabs").onclick = e => {
  const t = e.target.dataset.tab;
  if (!t || t === tab) return;
  tab = t;
  $("tabs").querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  $("tab-p1").hidden = t !== "p1"; $("tab-p2").hidden = t !== "p2";
  load();
};

// 사람마다 지수를 계산한다. 설문이 없는 기록(진행 중 · 옮겨 적기 전)은 빠진다.
function people() {
  return rows.filter(r => r.survey && Object.keys(r.survey).length >= 19 && (r.cond === "screen" || r.cond === "paper"))
    .map(r => {
      const p = { n: r.n, cond: r.cond, polite: r.survey.polite };
      MEASURES.forEach(m => {
        const ids = ADJ.filter(a => a.idx === m.idx).map(a => `${m.part}_${a.id}`);
        p[m.key] = mean(ids.map(id => r.survey[id]));
      });
      p.all = mean(ADJ.flatMap(a => [r.survey["t_" + a.id], r.survey["e_" + a.id]]));
      return p;
    });
}

const by = (ps, cond, key) => ps.filter(p => p.cond === cond).map(p => p[key]).filter(v => Number.isFinite(v));
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : "—";
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : "—";
const sgn = v => Number.isFinite(v) ? (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1) : "—";

const ICON = {
  same: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  opp: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v7M8 13v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  none: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
function badge(kind) {
  const label = { same: "같은 방향", opp: "반대 방향", none: "차이 거의 없음" }[kind];
  return `<span class="badge ${kind}">${ICON[kind]}${label}</span>`;
}

function render() {
  const all = rows.length;
  const done = rows.filter(r => r.doneAt);
  const screenDone = rows.filter(r => r.cond === "screen" && r.survey).length;
  const paperDone = done.filter(r => r.cond === "paper").length;
  const paperTyped = rows.filter(r => r.cond === "paper" && r.survey).length;
  $("counts").innerHTML = [
    ["번호 입력", all, "명"],
    ["세션 진행 중", all - done.length, "명"],
    ["같은 컴퓨터 · 설문 완료", screenDone, "명"],
    ["종이 설문 · 옮겨 적기", paperTyped, `/ ${paperDone}명`],
  ].map(([k, v, u]) => `<div class="card stat"><div class="k">${k}</div><div class="v">${v}<small>${u}</small></div></div>`).join("");

  if (!showResults) return;
  const ps = people();

  // 1994년과 비교
  const cmpRows = MEASURES.map(m => {
    const c = compare(by(ps, "screen", m.key), by(ps, "paper", m.key));
    const kind = !Number.isFinite(c.d) ? "none" : Math.abs(c.d) < 0.2 ? "none" : c.diff > 0 ? "same" : "opp";
    return `<tr><td>${m.label}</td><td>같은 컴퓨터가 더 높음 <span class="muted">(${m.p94})</span></td>
      <td class="num">${sgn(c.diff)}점 <span class="muted">· d = ${f2(c.d)} · ${fmtP(c.p)}</span></td><td>${badge(kind)}</td></tr>`;
  });
  const v = compare(by(ps, "screen", "all"), by(ps, "paper", "all"));
  const vKind = !Number.isFinite(v.F) ? "none" : v.F < 1.25 ? "none" : v.sa < v.sb ? "same" : "opp";
  cmpRows.push(`<tr><td>응답 편차 <span class="muted">(18문항 평균의 표준편차)</span></td><td>같은 컴퓨터가 더 작음 <span class="muted">(p &lt; .001)</span></td>
    <td class="num">${f2(v.sa)} vs ${f2(v.sb)} <span class="muted">· ${fmtP(v.pF)}</span></td><td>${badge(vKind)}</td></tr>`);
  $("cmp").innerHTML = `<thead><tr><th>측정</th><th>1994년 결과</th><th>우리 반 (같은 컴퓨터 − 종이)</th><th>방향</th></tr></thead><tbody>${cmpRows.join("")}</tbody>`;

  // 점 분포
  $("plots").innerHTML = MEASURES.map(m => {
    const a = by(ps, "screen", m.key), b = by(ps, "paper", m.key);
    const c = compare(a, b);
    return `<div class="card">
      <h2>${m.label}</h2>
      <div class="legend"><span><i style="background:var(--series-1)"></i>같은 컴퓨터 (${a.length}명)</span><span><i style="background:var(--series-2)"></i>종이 설문 (${b.length}명)</span></div>
      <div class="plot">${dotPlot({ screen: a, paper: b }, m.label)}</div>
      <p class="plotnote">평균 차이 <b>${sgn(c.diff)}점</b> (d = ${f2(c.d)}, ${fmtP(c.p)}) · 표준편차 <b>${f2(c.sa)}</b> vs <b>${f2(c.sb)}</b> (${fmtP(c.pF)}) · ${m.items}문항 평균, 10점 척도</p>
    </div>`;
  }).join("");
  bindTips();

  // 예의 문항
  const pa = by(ps, "screen", "polite"), pb = by(ps, "paper", "polite");
  const low = ps.filter(p => p.polite <= 3);
  const lc = compare(by(low, "screen", "tf"), by(low, "paper", "tf"));
  $("belief").innerHTML = `<table class="cmp">
    <thead><tr><th></th><th>같은 컴퓨터</th><th>종이 설문</th></tr></thead>
    <tbody>
      <tr><td>「예의가 필요하다」 평균 (10점)</td><td class="num">${f1(mean(pa))} <span class="muted">(${pa.length}명)</span></td><td class="num">${f1(mean(pb))} <span class="muted">(${pb.length}명)</span></td></tr>
      <tr><td>3점 이하로 답한 사람(${low.length}명)의 튜터 친근함</td><td class="num">${f1(lc.ma)} <span class="muted">(${lc.na}명)</span></td><td class="num">${f1(lc.mb)} <span class="muted">(${lc.nb}명)</span></td></tr>
    </tbody></table>
    <p class="plotnote">예의가 필요 없다고 답했는데도 같은 컴퓨터 조건에서 튜터를 더 친근하게 평가했다면, 생각과 행동이 어긋난 것이다. 차이 ${sgn(lc.diff)}점 (${fmtP(lc.p)})</p>`;

  // 표
  $("table").innerHTML = `<table class="data"><thead><tr><th>측정</th><th>같은 컴퓨터 n</th><th>평균</th><th>표준편차</th><th>종이 설문 n</th><th>평균</th><th>표준편차</th></tr></thead><tbody>${
    [...MEASURES, { key: "all", label: "전체 평가 점수 (18문항)" }, { key: "polite", label: "예의가 필요하다" }].map(m => {
      const c = compare(by(ps, "screen", m.key), by(ps, "paper", m.key));
      return `<tr><td>${m.label}</td><td>${c.na}</td><td>${f2(c.ma)}</td><td>${f2(c.sa)}</td><td>${c.nb}</td><td>${f2(c.mb)}</td><td>${f2(c.sb)}</td></tr>`;
    }).join("")}</tbody></table>`;
}

// 두 줄 점 그림 — 가로축 1–10, 줄마다 사람 하나가 점 하나. 평균은 세로 막대, 표준편차는 옅은 띠.
function dotPlot(data, title) {
  const W = 560, H = 168, L = 92, R = 18, T = 14;
  const x = v => L + (v - 1) / 9 * (W - L - R);
  const rowY = { screen: T + 36, paper: T + 96 };
  const parts = [];
  for (let v = 1; v <= 10; v++) {
    parts.push(`<line class="gridline" x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - 26}"/>`);
    parts.push(`<text x="${x(v)}" y="${H - 8}" text-anchor="middle">${v}</text>`);
  }
  parts.push(`<line class="base" x1="${L}" x2="${W - R}" y1="${H - 26}" y2="${H - 26}"/>`);
  for (const cond of ["screen", "paper"]) {
    const vals = data[cond], y = rowY[cond], c = COND[cond];
    parts.push(`<text class="rowlab" x="${L - 12}" y="${y + 4}" text-anchor="end">${c.ko}</text>`);
    if (!vals.length) continue;
    const m = mean(vals), s = compare(vals, vals).sa;
    if (Number.isFinite(s)) {
      const x1 = x(Math.max(1, m - s)), x2 = x(Math.min(10, m + s));
      parts.push(`<rect x="${x1}" y="${y - 17}" width="${Math.max(0, x2 - x1)}" height="34" rx="4" style="fill:var(${c.tint})"/>`);
    }
    // 같은 값이 겹치지 않게 세로로 흩는다 — 번호로 정해 두어 새로고침해도 자리가 같다
    const seen = {};
    vals.forEach(v => {
      const k = v.toFixed(2);
      const i = seen[k] = (seen[k] || 0) + 1;
      const dy = ((i % 2 ? 1 : -1) * Math.ceil((i - 1) / 2) * 6) % 16;
      parts.push(`<circle class="dot" cx="${x(v)}" cy="${y + dy}" r="4.5" style="fill:var(${c.var})"/>`);
      parts.push(`<circle class="hit" cx="${x(v)}" cy="${y + dy}" r="9" data-tip="${c.ko} · ${v.toFixed(1)}점"/>`);
    });
    parts.push(`<line class="meanbar" x1="${x(m)}" x2="${x(m)}" y1="${y - 20}" y2="${y + 20}" style="stroke:var(${c.var})"/>`);
    parts.push(`<text class="meanlab" x="${x(m)}" y="${y - 24}" text-anchor="middle">평균 ${m.toFixed(1)}</text>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title} — 조건별 점 분포">${parts.join("")}</svg>`;
}

function bindTips() {
  const tip = $("tip");
  document.querySelectorAll(".hit").forEach(h => {
    h.addEventListener("pointerenter", e => { tip.textContent = h.dataset.tip; tip.hidden = false; move(e); });
    h.addEventListener("pointermove", move);
    h.addEventListener("pointerleave", () => { tip.hidden = true; });
  });
  function move(e) { tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px"; }
}

$("unlock").onclick = unlock;
$("code").onkeydown = e => { if (e.key === "Enter") unlock(); };
$("refresh").onclick = load;
$("hide").onclick = () => { showResults = !showResults; applyHidden(); tab === "p1" ? render() : render2(); };
$("purge").onclick = async () => {
  if ($("purgeWord").value.trim() !== "폐기") { $("purgeMsg").textContent = "확인 칸에 「폐기」라고 입력해 주십시오."; return; }
  try {
    const d = await call("purge");
    $("purgeMsg").textContent = `${d.deleted}건을 지웠습니다.`;
    $("purgeWord").value = "";
    await load();
  } catch (e) { $("purgeMsg").textContent = e.message; }
};

/* ══ 2부 ══════════════════════════════════════════════════════ */

// 장치는 믿을 수 없는 코드 — 학생 화면과 같은 방식으로 샌드박스 iframe 에서만 돌린다
const KIT = new URL("../kit/cues.js", import.meta.url).href;
const HEAD = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${location.origin}; style-src 'unsafe-inline' ${location.origin}; img-src data: blob:; font-src data:; media-src data: blob:">`
  + `<script type="importmap">{"imports":{"x9":"${KIT}"}}<\/script>`;
const wrap = html => /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + HEAD) : HEAD + html;
const catKo = id => CUE_CATS.find(c => c.id === id)?.ko || "—";

// 장치별 점수 — 평가 한 건마다 하위 척도 평균을 내고, 장치마다 그 평균을 다시 평균한다
function deviceScores() {
  const items = { anthro: [], animacy: [], agency: [], experience: [] };
  [...GODSPEED, ...MIND].forEach(it => items[it.scale].push(it.id));
  const by = {};
  (P2?.ratings || []).forEach(r => {
    const o = by[r.target] ||= { team: r.target, n: 0, sums: { anthro: [], animacy: [], agency: [], experience: [] } };
    o.n += 1;
    for (const s of Object.keys(items)) {
      const vals = items[s].map(id => r.scores?.[id]).filter(Number.isFinite);
      if (vals.length) o.sums[s].push(mean(vals));
    }
  });
  return (P2?.devices || []).filter(d => d.html).map(d => {
    const o = by[d.team] || { n: 0, sums: { anthro: [], animacy: [], agency: [], experience: [] } };
    const cues = (P2.specs?.[teamId(d.team)] || d.cues || []).filter(c => c.name || c.detail);
    const sc = Object.fromEntries(Object.entries(o.sums).map(([k, v]) => [k, v.length ? mean(v) : NaN]));
    return { team: d.team, n: o.n, cues, cats: [...new Set(cues.map(c => c.cat).filter(Boolean))], ...sc, html: d.html };
  }).sort((a, b) => (Number.isFinite(b.anthro) ? b.anthro : -1) - (Number.isFinite(a.anthro) ? a.anthro : -1) || (b.animacy || 0) - (a.animacy || 0));
}

function render2() {
  const devs = (P2?.devices || []).filter(d => d.html);
  const ratings = P2?.ratings || [];
  const raters = new Set(ratings.map(r => `${r.from}`));
  $("counts2").innerHTML = [
    ["만든 장치", devs.length, `/ ${TEAM_COUNT}조`],
    ["만드는 중", (P2?.devices || []).filter(d => d.generating).length, "조"],
    ["평가", ratings.length, "건"],
    ["평가에 참여한 조", raters.size, "조"],
  ].map(([k, v, u]) => `<div class="card stat"><div class="k">${k}</div><div class="v">${v}<small>${u}</small></div></div>`).join("");
  if (!showResults) return;

  const S = deviceScores();
  const max = { anthro: 5, animacy: 5, agency: 7, experience: 7 };
  const cell = (v, k) => Number.isFinite(v)
    ? (k === "anthro" ? `<div class="mbar"><i style="width:${(v - 1) / (max[k] - 1) * 110 + 2}px"></i><span>${v.toFixed(2)}</span></div>` : v.toFixed(2))
    : "—";
  $("rank").innerHTML = S.length ? `<table class="rank"><thead><tr><th>순위</th><th>조</th><th>단서</th><th>분류</th>${
    SCALES.map(s => `<th${s.id === "anthro" ? "" : ' class="num"'}>${s.ko}</th>`).join("")}<th class="num">평가</th></tr></thead><tbody>${
    S.map((d, i) => `<tr data-t="${d.team}"${d.team === (demoTeam ?? S[0]?.team) ? ' class="sel"' : ""}><td>${Number.isFinite(d.anthro) ? i + 1 : "—"}</td><td>${d.team}조</td><td>${d.cues.length}개</td>
      <td><div class="cats">${d.cats.map(c => `<span>${catKo(c)}</span>`).join("")}</div></td>
      ${SCALES.map(s => `<td${s.id === "anthro" ? "" : ' class="num"'}>${cell(d[s.id], s.id)}</td>`).join("")}<td class="num">${d.n}건</td></tr>`).join("")}</tbody></table>`
    : '<p class="muted">아직 만든 장치가 없습니다.</p>';

  // 단서 개수와 의인화
  $("scatter").innerHTML = scatter(S.filter(d => Number.isFinite(d.anthro)));
  bindTips();

  // 분류별
  const rated = S.filter(d => Number.isFinite(d.anthro));
  $("catTable").innerHTML = `<table class="cmp"><thead><tr><th>분류</th><th>넣은 장치</th><th>안 넣은 장치</th><th>차이</th></tr></thead><tbody>${
    CUE_CATS.map(c => {
      const yes = rated.filter(d => d.cats.includes(c.id)).map(d => d.anthro), no = rated.filter(d => !d.cats.includes(c.id)).map(d => d.anthro);
      const m1 = yes.length ? mean(yes) : NaN, m0 = no.length ? mean(no) : NaN;
      return `<tr><td>${c.ko}</td><td class="num">${f2(m1)} <span class="muted">(${yes.length})</span></td><td class="num">${f2(m0)} <span class="muted">(${no.length})</span></td><td class="num">${sgn2(m1 - m0)}</td></tr>`;
    }).join("")}</tbody></table>
    <p class="plotnote">장치 수가 적어 검정은 하지 않는다. 방향만 보고 시연에서 확인한다.</p>`;

  // 시연 — 기본은 1위, 줄을 누르면 그 장치
  const pick = S.find(d => d.team === demoTeam) || S.find(d => Number.isFinite(d.anthro)) || S[0];
  if (pick) {
    const rank = S.indexOf(pick) + 1;
    $("demoTitle").textContent = `${pick === S[0] && Number.isFinite(pick.anthro) ? "1위 장치 시연" : `${rank}위 장치`} — ${pick.team}조`;
    if (demoShown !== pick.html) { demoShown = pick.html; $("demoFrame").srcdoc = wrap(pick.html); }
    $("demoSpec").innerHTML = `<div class="specv">${pick.cues.map((c, i) => `<div class="c"><b>단서 ${i + 1} · ${esc(c.name)}</b><dl>
      <dt>분류</dt><dd>${esc(catKo(c.cat))}</dd><dt>넣을 시점</dt><dd>${esc(c.when || "—")}</dd>
      <dt>구체적 내용</dt><dd>${esc(c.detail)}</dd><dt>출처</dt><dd>${esc(c.source)}</dd><dt>예상 효과</dt><dd>${esc(c.effect)}</dd></dl></div>`).join("") || '<p class="muted">명세서 없음</p>'}</div>`;
  }
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sgn2 = v => Number.isFinite(v) ? (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2) : "—";

function scatter(S) {
  const W = 560, H = 260, L = 46, R = 16, T = 14, B = 34;
  const x = n => L + (n / 5) * (W - L - R), y = v => T + (1 - (v - 1) / 4) * (H - T - B);
  const parts = [];
  for (let v = 1; v <= 5; v++) {
    parts.push(`<line class="gridline" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`);
    parts.push(`<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="rowlab">${v}</text>`);
  }
  for (let n = 0; n <= 5; n++) parts.push(`<text x="${x(n)}" y="${H - 12}" text-anchor="middle" class="rowlab">${n}개</text>`);
  parts.push(`<line class="base" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`);
  const seen = {};
  S.forEach(d => {
    const k = d.cues.length, i = seen[k] = (seen[k] || 0) + 1;
    const cx = x(k) + ((i % 2 ? 1 : -1) * Math.floor(i / 2) * 9), cy = y(d.anthro);
    parts.push(`<circle class="dot2" cx="${cx}" cy="${cy}" r="5.5"/>`);
    parts.push(`<circle class="hit" cx="${cx}" cy="${cy}" r="11" data-tip="${d.team}조 · 단서 ${k}개 · 의인화 ${d.anthro.toFixed(2)}"/>`);
    if (d === S[0]) parts.push(`<text class="meanlab" x="${cx + 9}" y="${cy - 8}">1위 ${d.team}조</text>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="단서 개수(가로)와 의인화 평균(세로)">${parts.join("")}</svg>
    <p class="plotnote">가로: 명세서의 단서 개수 · 세로: Godspeed 의인화 평균 (1–5)</p>`;
}

$("rank").onclick = e => {
  const t = Number(e.target.closest("tr[data-t]")?.dataset.t);
  if (!t) return;
  demoTeam = t; render2();
  $("demoFrame").scrollIntoView({ behavior: "smooth", block: "center" });
};
$("demoReload").onclick = () => { const f = $("demoFrame"); f.srcdoc = f.srcdoc; };
$("refund").onclick = async () => {
  const team = Number($("refundTeam").value);
  if (!(team >= 1 && team <= TEAM_COUNT)) { $("refundMsg").textContent = "조 번호를 입력해 주십시오."; return; }
  try {
    const d = await call("refund", { team });
    $("refundMsg").textContent = `${d.team}조 — 남은 생성 ${d.left}회`;
    $("refundTeam").value = "";
  } catch (e) { $("refundMsg").textContent = e.message; }
};
$("reset").onclick = async () => {
  if ($("resetWord").value.trim() !== "초기화") { $("resetMsg").textContent = "확인 칸에 「초기화」라고 입력해 주십시오."; return; }
  try {
    const d = await call("reset");
    $("resetMsg").textContent = `${d.deleted}건을 지웠습니다. 단계는 1부로 돌아갔습니다.`;
    $("resetWord").value = ""; phase = "p1"; demoTeam = null; demoShown = null;
    await load();
  } catch (e) { $("resetMsg").textContent = e.message; }
};

/* ── 미리보기 (?demo) — 가짜 응답 72건. 같은 컴퓨터 쪽이 조금 높고 덜 퍼지게 만들어 두었다 ── */
let demoRows = null, demoP2 = null, demoPhase = "p1";
function demoCall(op, extra) {
  if (op === "check") return Promise.resolve({ ok: true, phase: demoPhase });
  if (op === "phase") { demoPhase = extra.phase; return Promise.resolve({ ok: true, phase: demoPhase }); }
  if (op === "p2") return Promise.resolve({ phase: demoPhase, ...(demoP2 ||= fakeP2()), at: Date.now() });
  if (op === "reset") { const k = demoP2 ? demoP2.ratings.length : 0; demoP2 = { devices: [], specs: {}, ratings: [] }; demoPhase = "p1"; return Promise.resolve({ ok: true, deleted: k }); }
  if (op === "refund") return Promise.resolve({ ok: true, team: extra.team, left: 1 });
  if (op === "purge") { const k = demoRows.length; demoRows = []; return Promise.resolve({ ok: true, deleted: k }); }
  if (!demoRows) {
    let seed = 11;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const norm = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const clamp = v => Math.max(1, Math.min(10, Math.round(v)));
    demoRows = [];
    for (let n = 1; n <= 76; n++) {
      const cond = condOf(n);
      const r = { n, cond, startedAt: Date.now(), know: [], test: [], correct: 2 };
      if (n > 72) { demoRows.push(r); continue; }          // 진행 중 넷
      r.doneAt = Date.now();
      if (cond === "paper" && n > 64) { demoRows.push(r); continue; }   // 옮겨 적기 전
      const base = cond === "screen" ? 7.1 + norm() * 0.9 : 6.0 + norm() * 1.7;
      const survey = {};
      ADJ.forEach(a => {
        survey["t_" + a.id] = clamp(base + norm() * 0.8);
        survey["e_" + a.id] = clamp(base - 0.3 + norm() * 0.9);
      });
      survey.polite = clamp(3 + norm() * 2);
      r.survey = survey;
      demoRows.push(r);
    }
  }
  return Promise.resolve({ rows: JSON.parse(JSON.stringify(demoRows)), at: Date.now() });
}

// 2부 가짜 자료 — 18개 조가 장치를 만들고, 조마다 4명이 다른 조 장치 셋을 평가했다고 친다.
// 단서가 많고 얼굴 · 목소리가 있을수록 점수가 조금 높게 만들어 두었다.
function fakeP2() {
  let seed = 5;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pool = [
    { name: "이름을 말하며 인사함", cat: "verbal", when: "처음", detail: "\"안녕, 나는 토리야\"라고 말풍선", source: "Feine 외 (2019)", effect: "이름이 있으면 상대로 느낌" },
    { name: "표시창에 눈과 입", cat: "visual", when: "항상", detail: "표시창 왼쪽에 눈 둘과 웃는 입", source: "Epley 외 (2007)", effect: "얼굴을 보면 사람처럼 느낌" },
    { name: "끝나면 목소리로 칭찬", cat: "auditory", when: "끝날 때", detail: "\"수고했어요\"를 목소리로", source: "Nass & Brave (2005)", effect: "목소리는 강한 단서" },
    { name: "대답 전 망설임", cat: "invisible", when: "시작 버튼", detail: "1초 동안 … 표시 후 대답", source: "Feine 외 (2019)", effect: "생각하는 것처럼 보임" },
    { name: "가만히 두면 졸려함", cat: "visual", when: "가만히 있을 때", detail: "눈을 반쯤 감고 \"졸려요\"", source: "기사 검색", effect: "감정이 있어 보임" },
    { name: "한숨 소리", cat: "auditory", when: "일시정지", detail: "멈추면 한숨 소리", source: "기사 검색", effect: "아쉬워하는 것처럼" },
  ];
  const devices = [], specs = {}, ratings = [];
  const teams = Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).filter(t => t !== 7 && t !== 13);
  teams.forEach(t => {
    const k = 1 + Math.floor(rnd() * 5);
    const cues = [...pool].sort(() => rnd() - .5).slice(0, k);
    specs[teamId(t)] = cues;
    const face = cues.some(c => c.cat === "visual"), voice = cues.some(c => c.cat === "auditory");
    devices.push({ team: t, version: 1, gens: 1, cues, html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script type="module">
import { start } from "x9";
const { dev, C } = start({ speed: 30 });
${cues.some(c => c.cat === "verbal") ? `C.name("토리"); dev.on("ready", () => C.say("안녕, 나는 토리야"));` : ""}
${face ? `const f = C.face({ where: "window" }); dev.on("end", () => f.mood("happy"));` : ""}
${voice ? `dev.on("end", () => C.say("수고했어요", { voice: true }));` : ""}
${cues.some(c => c.cat === "invisible") ? `dev.on("start", async () => { await C.typing(1000); C.say("시작할게요"); });` : ""}
<\/script></body></html>` });
    const base = 1.6 + k * 0.32 + (face ? 0.5 : 0) + (voice ? 0.3 : 0);
    for (let r = 0; r < 12; r++) {
      const scores = {};
      [...GODSPEED, ...MIND].forEach(it => {
        const top = it.scale === "agency" || it.scale === "experience" ? 7 : 5;
        const b = it.scale === "experience" ? base * 0.8 : it.scale === "agency" ? base * 1.1 : base;
        scores[it.id] = Math.max(1, Math.min(top, Math.round(b + (rnd() - .5) * 2)));
      });
      ratings.push({ target: t, from: ((t + 17 + (r % 3)) % TEAM_COUNT) + 1, scores, at: Date.now() });
    }
  });
  return { devices, specs, ratings };
}
if (DEMO) {
  document.title = "[미리보기] " + document.title;
  document.body.insertAdjacentHTML("beforeend", '<div class="demo">미리보기 — 가짜 응답입니다. 암호 없이 「열기」를 누르십시오.</div>');
}

if (code || DEMO) unlock();
