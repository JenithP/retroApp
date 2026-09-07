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

  if (where === "room" || !STATIONS[where]) { renderRoom(); ping(me.team, me.name, "거실"); return; }

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
  ping(me.team, me.name, st.title);
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
  const ok = await saveRun({ team: me.team, name: me.name, ...row });
  msgEl.textContent = ok ? "제출되었습니다" : "저장 실패 — 다시 눌러 보십시오";
  msgEl.className = "savemsg " + (ok ? "ok" : "bad");
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
    ping(me.team, me.name, "거실");
  });
  view.querySelectorAll(".spot").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));
}

homeBtn.addEventListener("click", () => go("room"));
addEventListener("hashchange", render);
showWho();
render();
