// 교수용 실시간 현황판.
// 학생 화면이 남긴 것을 읽기만 한다. 여기서는 아무것도 쓰지 않는다.
import { watchRuns, watchPresence } from "./firebase.js";

const $ = s => document.querySelector(s);

const STATIONS = [["radio", "라디오"], ["tv", "텔레비전"], ["phone", "전화기"]];
const PLACES   = ["거실", "라디오", "텔레비전", "전화기"];
const LIVE_MS  = 3 * 60 * 1000;         // 일 분마다 알리므로 삼 분이면 넉넉하다
const TODAY_MS = 4 * 60 * 60 * 1000;    // 지난 시간에 남은 접속 기록은 조원으로 세지 않는다

// 연결을 확인하려고 남긴 줄. 규칙상 기록은 지울 수 없어 화면에서만 뺀다.
const PROBE = "연결확인";

let runs = [], present = [];

/* ── 수업 시계 ─────────────────────────────────────────
   100분을 어떻게 쓰는지 그대로 담았다. 1단계는 8분마다 자리를 넘긴다. */
const PHASES = [
  [0,  10, "접속"],
  [10, 45, "1단계 · 옛 기계"],
  [45, 60, "2단계 · 지금 기기"],
  [60, 70, "휴식"],
  [70, 90, "디브리핑"],
  [90, 100, "정리"],
];
const ROT_FROM = 10, ROT_LEN = 8, ROT_N = 4;

const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function tickClock() {
  const t0 = +(localStorage.getItem("boardT0") || 0);
  if (!t0) { $("#phase").textContent = "시작 전"; $("#elapsed").textContent = "—"; return; }
  const sec = (Date.now() - t0) / 1000, min = sec / 60;
  const ph = PHASES.find(p => min >= p[0] && min < p[1]);

  let label = ph ? ph[2] : "수업 끝";
  let tail  = ph ? `${Math.ceil(ph[1] - min)}분 남음` : "";

  // 1단계 동안은 몇 번째 자리인지, 넘기기까지 얼마 남았는지 같이 보여 준다
  let flag = false;
  if (ph && ph[2].startsWith("1단계")) {
    const into = min - ROT_FROM, slot = Math.floor(into / ROT_LEN);
    if (slot < ROT_N) {
      const left = (ROT_FROM + (slot + 1) * ROT_LEN - min) * 60;
      label = `1단계 · ${slot + 1}번째 자리`;
      tail = `넘기기까지 ${mmss(left)}`;
      flag = left <= 10;               // 마지막 10초는 띠를 띄운다
    }
  }
  $("#phase").textContent = label;
  $("#elapsed").textContent = `${mmss(sec)} 경과 · ${tail}`;
  $("#callout").hidden = !flag;
}

$("#clockbtn").addEventListener("click", () => {
  if (localStorage.getItem("boardT0")) {
    if (!confirm("수업 시계를 처음으로 되돌립니다.")) return;
    localStorage.removeItem("boardT0");
    $("#clockbtn").textContent = "수업 시작";
  } else {
    localStorage.setItem("boardT0", String(Date.now()));
    $("#clockbtn").textContent = "시계 되돌리기";
  }
  tickClock();
});
if (localStorage.getItem("boardT0")) $("#clockbtn").textContent = "시계 되돌리기";
setInterval(tickClock, 1000);
tickClock();

/* ── 값 다듬기 ───────────────────────────────────────── */
const ms = v => (v && typeof v.toMillis === "function") ? v.toMillis() : 0;
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const one = n => n === null ? "—" : n.toFixed(1);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isOld = r => r.mode === "1988";

/* ── 지금 어디에 있는가 ──────────────────────────────── */
function paintLive() {
  const now = Date.now();
  const live = present.filter(p => p.at && now - ms(p.at) < LIVE_MS);
  const at = Object.fromEntries(PLACES.map(p => [p, []]));
  live.forEach(p => (at[p.where] || (at[p.where] = [])).push(p));

  // 자리가 고르면 아무 표시도 하지 않는다. 한쪽으로 쏠릴 때만 주황으로 알린다.
  const spots = PLACES.filter(p => p !== "거실");
  const mean = spots.reduce((n, p) => n + at[p].length, 0) / spots.length;
  $("#tiles").innerHTML = PLACES.map(p => {
    const list = at[p], hot = p !== "거실" && list.length >= 5 && list.length > mean * 1.6;
    const who = list.map(x => `${x.team} ${x.name}`.trim()).filter(Boolean).join(", ");
    return `<div class="tile${hot ? " hot" : ""}">
      <span class="n">${list.length}</span>
      <span class="lab">${p}</span>
      <span class="who2" title="${esc(who)}">${esc(who) || "비어 있음"}</span>
    </div>`;
  }).join("");

  const teams = new Set(live.map(p => p.team).filter(Boolean));
  $("#livesum").textContent = live.length
    ? `지금 ${live.length}명 · ${teams.size}개 조가 들어와 있습니다.`
    : "아직 아무도 들어오지 않았습니다. 학생이 조와 이름을 저장하면 여기에 나타납니다.";
}

/* ── 조별 진행 ───────────────────────────────────────── */
function paintTeams() {
  const now = Date.now();
  const T = new Map();
  const of = t => {
    if (!T.has(t)) T.set(t, { members: new Set(), here: [], live: false,
      cnt: Object.fromEntries(STATIONS.map(([k]) => [k, { old: 0, now: 0 }])) });
    return T.get(t);
  };

  present.forEach(p => {
    if (!p.team || !p.at || now - ms(p.at) > TODAY_MS) return;
    const t = of(p.team);
    if (p.name) t.members.add(p.name);
    if (p.at && now - ms(p.at) < LIVE_MS) { t.live = true; t.here.push(p.where); }
  });
  runs.forEach(r => {
    if (!r.team) return;
    const t = of(r.team);
    if (r.name) t.members.add(r.name);
    const c = t.cnt[r.station];
    if (c) c[isOld(r) ? "old" : "now"]++;
  });

  if (!T.size) {
    $("#teams").innerHTML = `<p class="empty">제출이 들어오면 여기에 조가 나타납니다.</p>`;
    return;
  }

  const names = [...T.keys()].sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
  $("#teams").innerHTML = names.map(name => {
    const t = T.get(name), n = Math.max(t.members.size, 1);
    const spots = [...new Set(t.here)].join(" · ") || "자리 비움";
    const cell = (v, kind) => {
      const cls = v === 0 ? "" : v >= n ? " full" : ` part${kind === "now" ? " now" : ""}`;
      return `<span class="cell${cls}">${v}</span>`;
    };
    return `<article class="team${t.live ? "" : " away"}">
      <div class="thead">
        <span class="tname">${esc(name)}</span>
        <span class="tmeta">${t.members.size}명<br>${esc(spots)}</span>
      </div>
      <div class="tkey"><span></span><span>1988</span><span>지금</span></div>
      ${STATIONS.map(([k, ko]) => `<div class="trow">
          <span class="st">${ko}</span>${cell(t.cnt[k].old, "old")}${cell(t.cnt[k].now, "now")}
        </div>`).join("")}
    </article>`;
  }).join("");
}

/* ── 1988년과 지금 ───────────────────────────────────── */
function paintCompare() {
  $("#cmpbody").innerHTML = STATIONS.map(([k, ko]) => {
    const rs = runs.filter(r => r.station === k);
    const side = old => {
      const g = rs.filter(r => isOld(r) === old);
      return { n: g.length,
               sec: avg(g.map(r => num(r.totalSec)).filter(v => v !== null)),
               ops: avg(g.map(r => num(r.ops)).filter(v => v !== null)) };
    };
    const o = side(true), w = side(false);
    const ratio = (o.sec && w.sec) ? (o.sec / w.sec).toFixed(1) + "배" : "—";
    const c = (v, dim) => `<td class="${dim ? "dim" : ""}">${v}</td>`;
    return `<tr>
      <td class="lead">${ko}</td>
      ${c(o.n, true)}${c(one(o.sec))}${c(one(o.ops))}
      ${c(w.n, true)}${c(one(w.sec))}${c(one(w.ops))}
      <td class="ratio">${ratio}</td>
    </tr>`;
  }).join("");

  // 시간만 보면 놓치는 것들. 인지 부하가 숫자로 드러나는 자리다.
  const old = runs.filter(isOld);
  const pick = (station, field) =>
    avg(old.filter(r => r.station === station).map(r => num(r[field])).filter(v => v !== null));
  const info = pick("phone", "infoCalls"), mis = pick("phone", "misdials");
  const wz = pick("tv", "waitOps");
  $("#loadnotes").innerHTML = [
    ["114에 다시 건 횟수", info, "번호를 외우지 못해 되돌아간 횟수입니다. 기억의 짐이 그대로 드러납니다."],
    ["없는 번호로 건 횟수", mis, "한 자리만 틀려도 처음부터 다시 돌려야 했습니다."],
    ["기다리다 돌린 채널", wz, "방송을 기다리는 동안 참지 못하고 돌린 횟수입니다."],
  ].map(([lab, v, why]) =>
    `<div class="note"><b>${one(v)}</b> ${lab}<br><span style="color:var(--ui-soft)">${why}</span></div>`
  ).join("");
}

/* ── 최근 제출 ───────────────────────────────────────── */
function paintFeed() {
  const last = runs.slice(-14).reverse();
  if (!last.length) { $("#feed").innerHTML = `<li class="empty">아직 제출이 없습니다.</li>`; return; }
  const ko = Object.fromEntries(STATIONS);
  $("#feed").innerHTML = last.map(r => {
    const t = ms(r.createdAt);
    const hhmm = t ? new Date(t).toLocaleTimeString("ko-KR",
      { hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
    return `<li>
      <span class="t">${hhmm}</span>
      <span class="w">${esc(r.team)} ${esc(r.name)}</span>
      <span class="w">${ko[r.station] || r.station}</span>
      <span class="m ${isOld(r) ? "old" : "now"}">${isOld(r) ? "1988" : "지금"}</span>
      <span class="num">${esc(r.totalSec)}초</span>
    </li>`;
  }).join("");
}

/* ── CSV ─────────────────────────────────────────────
   조별로 나눠 정리할 수 있게 회차 하나가 한 줄이다. */
const COLS = [
  ["team", "조"], ["name", "이름"], ["station", "스테이션"], ["mode", "기기"],
  ["totalSec", "총 시간(초)"], ["ops", "조작 수"],
  ["findSec", "찾기(초)"], ["moveSec", "이동(초)"], ["waitSec", "기다림(초)"],
  ["returnSec", "복귀(초)"], ["askSec", "번호 듣기(초)"], ["callSec", "통화(초)"],
  ["answerSec", "답 적기(초)"], ["waitOps", "기다리다 돌린 채널"],
  ["misdials", "헛걸기"], ["infoCalls", "114 재통화"],
  ["submittedAt", "제출 시각"], ["uid", "기기 식별"],
];

$("#csv").addEventListener("click", () => {
  if (!runs.length) { alert("아직 제출된 기록이 없습니다."); return; }
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const ko = Object.fromEntries(STATIONS);
  const body = runs.map(r => {
    const t = ms(r.createdAt);
    const o = { ...r,
      station: ko[r.station] || r.station,
      mode: isOld(r) ? "1988" : "지금",
      submittedAt: t ? new Date(t).toLocaleString("ko-KR") : "" };
    return COLS.map(([c]) => q(o[c])).join(",");
  });
  // 엑셀이 한글을 깨뜨리지 않도록 표식을 앞에 붙인다
  const blob = new Blob(["﻿" + [COLS.map(c => c[1]).join(","), ...body].join("\r\n")],
    { type: "text/csv;charset=utf-8" });
  const d = new Date(), p = n => String(n).padStart(2, "0");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `실습기록_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

/* ── 잇기 ────────────────────────────────────────────── */
function paintAll() { paintLive(); paintTeams(); paintCompare(); paintFeed(); }

/** 주소 끝에 ?demo 를 붙이면 예시 자료로 화면을 채워 본다.
    파이어베이스에는 아무것도 쓰지 않는다. 수업 전에 눈에 익히는 용도다. */
function demo() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const now = Date.now();
  const stamp = t => ({ toMillis: () => t });
  const P = [], R = [];
  const WHERE = ["라디오", "텔레비전", "전화기", "거실"];
  for (let g = 1; g <= 20; g++) {
    const team = `${g}조`, spot = WHERE[g % 4];
    for (let m = 1; m <= 4; m++) {
      const name = `학생${g}-${m}`;
      P.push({ id: `${g}_${m}`, team, name, where: spot, at: stamp(now - rnd(0, 90e3)) });
      STATIONS.forEach(([k], si) => {
        // 조마다 진도가 다르다. 뒤처진 조가 눈에 띄어야 쓸모가 있다.
        const done = (g + si) % 4;
        if (done === 0) return;
        const push = (mode, sec, ops, extra) => R.push({
          id: `${g}${m}${k}${mode}`, team, name, station: k, mode,
          totalSec: sec.toFixed(1), ops: Math.round(ops), ...extra,
          createdAt: stamp(now - rnd(0, 25 * 60e3)),
        });
        push("1988", rnd(95, 210), rnd(14, 46), k === "phone"
          ? { misdials: Math.round(rnd(0, 2)), infoCalls: Math.round(rnd(1, 3)) }
          : k === "tv" ? { waitOps: Math.round(rnd(0, 5)) } : {});
        if (done >= 2) push("앱", rnd(11, 34), rnd(2, 7), {});
      });
    }
  }
  present = P; runs = R;
  const b = document.createElement("div");
  b.className = "callout"; b.style.background = "var(--bad)"; b.style.color = "#FFF3EF";
  b.textContent = "연습용 예시 자료입니다 — 실제 학생 기록이 아닙니다";
  document.querySelector("main").prepend(b);
  paintAll();
}

if (new URLSearchParams(location.search).has("demo")) {
  demo();
} else {
  watchRuns(rows => { runs = rows.filter(r => r.team !== PROBE); paintAll(); });
  watchPresence(rows => { present = rows.filter(p => p.team !== PROBE); paintAll(); });
  setInterval(paintLive, 15000);      // 자리를 뜬 사람은 시간이 지나야 사라진다
  paintAll();
}
