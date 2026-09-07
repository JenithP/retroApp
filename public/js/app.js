// 거실과 스테이션 사이를 오가는 라우터. 학생 정보와 진행 상태를 들고 있는다.
import { saveRun, ping } from "./firebase.js";
import { mountRadio } from "./radio.js";
import { mountTv } from "./tv.js";
import { mountPhone } from "./phone.js";

export const me = {
  team: localStorage.getItem("team") || "",
  name: localStorage.getItem("name") || "",
};

const view = document.getElementById("view");
const homeBtn = document.getElementById("home");
const tpl = id => document.getElementById(id).content.cloneNode(true);

const STATIONS = {
  radio: { title: "라디오", mount: mountRadio },
  tv:    { title: "텔레비전", mount: mountTv },
  phone: { title: "전화기", mount: mountPhone },
};

let leave = null;                     // 스테이션을 떠날 때 정리하는 함수

// 자리를 옮길 때만 알리면, 한 스테이션에 오래 앉은 학생은 현황판에서 사라져 보인다.
// 그래서 머무는 동안에도 일 분에 한 번씩 지금 자리를 알린다.
let heart = null;
function beat(where) {
  clearInterval(heart);
  ping(me.team, me.name, where);
  heart = setInterval(() => ping(me.team, me.name, where), 60000);
}

function showWho() {
  document.getElementById("whoami").textContent =
    me.team || me.name ? `${me.team} ${me.name}`.trim() : "";
}

function go(where) {
  if (leave) { try { leave(); } catch (e) {} leave = null; }
  location.hash = where === "room" ? "" : where;
}

function render() {
  const where = (location.hash || "").replace("#", "") || "room";
  view.innerHTML = "";
  homeBtn.hidden = where === "room";

  if (where === "room" || !STATIONS[where]) { renderRoom(); beat("거실"); return; }

  const st = STATIONS[where];
  view.appendChild(tpl("t-station"));
  document.getElementById("task-title").textContent = `${st.title} 과업`;
  leave = st.mount({
    stage: document.getElementById("stage"),
    note:  document.getElementById("stagenote"),
    steps: document.getElementById("steps"),
    log:   document.getElementById("log").querySelector("tbody"),
    elapsed: document.getElementById("elapsed"),
    startBtn: document.getElementById("start"),
    resetBtn: document.getElementById("reset"),
    saveBtn:  document.getElementById("save"),
    saveMsg:  document.getElementById("savemsg"),
    submit,
  }) || null;
  beat(st.title);
}

/** 스테이션이 회차를 끝내면 이걸 부른다. */
async function submit(row, msgEl) {
  if (!me.team || !me.name) {
    msgEl.textContent = "거실에서 조와 이름을 먼저 적어 주십시오.";
    msgEl.className = "savemsg bad";
    return;
  }
  msgEl.textContent = "보내는 중…";
  msgEl.className = "savemsg";
  const full = { team: me.team, name: me.name, ...row, at: new Date().toLocaleString("ko-KR") };
  const ok = await saveRun({ team: me.team, name: me.name, ...row });
  keep(full);
  msgEl.textContent = ok ? "제출되었습니다" : "저장 실패 — 다시 눌러 보십시오";
  msgEl.className = "savemsg " + (ok ? "ok" : "bad");
}

/* ── 내 기록 ──────────────────────────────────────────
   보고서에 자기 숫자를 옮겨 적어야 하므로, 제출한 회차를
   이 기기에도 쌓아 두었다가 CSV 한 장으로 내보낸다. */
const MINE = "myruns";
const mine = () => { try { return JSON.parse(localStorage.getItem(MINE)) || []; } catch (e) { return []; } };

function keep(row) {
  try {
    const all = mine();
    all.push(row);
    localStorage.setItem(MINE, JSON.stringify(all.slice(-40)));
  } catch (e) { /* 저장 공간이 없어도 실습은 계속된다 */ }
}

const COLS = [
  ["team", "조"], ["name", "이름"], ["station", "스테이션"], ["mode", "기기"],
  ["totalSec", "총 시간(초)"], ["ops", "조작 수"],
  ["findSec", "찾기(초)"], ["moveSec", "이동(초)"], ["waitSec", "기다림(초)"],
  ["returnSec", "복귀(초)"], ["askSec", "번호 듣기(초)"], ["callSec", "통화(초)"],
  ["answerSec", "답 적기(초)"], ["waitOps", "기다리다 돌린 채널"],
  ["misdials", "헛걸기"], ["infoCalls", "114 재통화"], ["at", "제출 시각"],
];
const KO = { radio: "라디오", tv: "텔레비전", phone: "전화기" };

function downloadMine(tipEl) {
  const rows = mine();
  if (!rows.length) {
    tipEl.textContent = "아직 제출한 회차가 없습니다. 과업을 마치고 제출하면 쌓입니다.";
    tipEl.className = "tip bad"; return;
  }
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map(r => COLS.map(([c]) =>
    q(c === "station" ? (KO[r.station] || r.station)
      : c === "mode" ? (r.mode === "1988" ? "1988" : "지금") : r[c])).join(","));
  // 엑셀이 한글을 깨뜨리지 않도록 표식을 앞에 붙인다
  const blob = new Blob(["﻿" + [COLS.map(c => c[1]).join(","), ...body].join("\r\n")],
    { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `내기록_${(me.team || "조").replace(/\s/g, "")}_${(me.name || "이름").replace(/\s/g, "")}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  tipEl.textContent = `${rows.length}개 회차를 내려받았습니다.`;
  tipEl.className = "tip ok";
}

function renderRoom() {
  view.appendChild(tpl("t-room"));
  const t = document.getElementById("f-team");
  const n = document.getElementById("f-name");
  const tip = document.getElementById("idtip");
  t.value = me.team; n.value = me.name;
  if (me.team && me.name) {
    tip.textContent = `${me.team} ${me.name} 으로 기록됩니다. 고치려면 다시 저장하십시오.`;
    tip.className = "tip ok";
  }
  document.getElementById("f-save").addEventListener("click", () => {
    me.team = t.value.trim(); me.name = n.value.trim();
    localStorage.setItem("team", me.team);
    localStorage.setItem("name", me.name);
    showWho();
    tip.textContent = me.team && me.name
      ? `${me.team} ${me.name} 으로 기록됩니다.`
      : "조와 이름을 모두 적어 주십시오.";
    tip.className = "tip " + (me.team && me.name ? "ok" : "");
    beat("거실");
  });
  const mtip = document.getElementById("minetip");
  const kept = mine().length;
  if (kept) mtip.textContent = `제출한 회차 ${kept}개가 쌓여 있습니다. 보고서를 쓸 때 내려받으십시오.`;
  document.getElementById("f-csv").addEventListener("click", () => downloadMine(mtip));

  view.querySelectorAll(".spot").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));
}

homeBtn.addEventListener("click", () => go("room"));
addEventListener("hashchange", render);
showWho();
render();
