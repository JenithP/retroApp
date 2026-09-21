// 대화창 — 공방 아래쪽에 한 줄씩 뜨는 말.
//
// 3주차 활자의 문과 같은 자리, 같은 조작이다. 말이 한 줄씩 흐르고,
// 아무 데나 터치하면 다음으로 넘어간다.
//
// 시연 중에는 손님이 사건에 맞춰 말하므로 기다리지 않고 바로 갈아 끼운다.
// 노만 영감이 설명할 때만 사람이 읽을 틈을 준다.

import { CAST, faceSVG, hasArt, probeAll } from "./cast.js";

let box, port, name, line, next;
let queue = [], busy = false, typer = 0, resting = null, onWho = null;

export function mount(el, opts = {}) {
  onWho = opts.onWho || onWho;
  if (box === el) return;                 // 조를 바꿔 다시 들어와도 한 번만 건다
  box = el;
  box.innerHTML =
    `<div class="port" id="tport"></div>
     <div class="say"><p class="tname" id="tname"></p><p class="tline" id="tline"></p></div>
     <div class="tnext" id="tnext" hidden>▼</div>`;
  port = box.querySelector("#tport");
  name = box.querySelector("#tname");
  line = box.querySelector("#tline");
  next = box.querySelector("#tnext");
  box.addEventListener("click", skip);
  probeAll(() => { if (cur) face(cur.who); });
}

function face(who) {
  const c = CAST[who];
  port.className = "port p-" + who;
  port.innerHTML = faceSVG(who) +
    (hasArt(who) ? `<img src="img/${who}.webp" alt="">` : "");
  name.textContent = c?.name || "";
  onWho?.(who);
}

/** 한 마디. hold 를 주면 그만큼 머물렀다 다음으로 간다. */
export function say(who, text, hold = 0) {
  queue.push({ who, text: String(text), hold });
  if (!busy) run();
}

/** 지금 하던 말을 지우고 이것부터 — 손님이 움직이는 속도를 따라갈 때. */
export function cut(who, text) {
  queue.length = 0;
  clearTimeout(resting);
  clearInterval(typer);
  busy = false;
  say(who, text);
}

let cur = null;

function run() {
  const it = queue.shift();
  cur = it;
  if (!it) { busy = false; next.hidden = true; onWho?.(null); return; }
  busy = true;
  box.hidden = false;
  face(it.who);
  next.hidden = true;

  // 한 글자씩 — 읽는 속도를 맞추고, 말이 살아 있게 보인다
  let i = 0;
  line.textContent = "";
  clearInterval(typer);
  typer = setInterval(() => {
    line.textContent = it.text.slice(0, ++i);
    if (i < it.text.length) return;
    clearInterval(typer);
    typer = 0;
    if (it.hold) resting = setTimeout(run, it.hold);
    else if (queue.length) resting = setTimeout(run, 420);
    else { busy = false; next.hidden = false; }      // 읽고 터치해서 넘기게 둔다
  }, 18);
}

/** 터치해서 건너뛰기 — 아직 다 안 쓰였으면 마저 쓰고, 다 쓰였으면 다음으로. */
function skip() {
  if (!cur) return;
  if (line.textContent.length < cur.text.length) {
    clearInterval(typer);
    typer = 0;
    line.textContent = cur.text;
    next.hidden = false;
    return;
  }
  clearTimeout(resting);
  run();
}

export function hush() {
  queue.length = 0;
  clearTimeout(resting);
  clearInterval(typer);
  busy = false;
}
