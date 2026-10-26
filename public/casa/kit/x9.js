// 장치 X-9 — 9주차 오프라인 2부 「장치 의인화」의 기본 장치.
//
// 모든 조가 같은 장치에서 출발한다. 기능은 집중 타이머 하나로 잠겨 있다.
//   다이얼 — 1–10분 선택 (끌기 · 휠 · 방향키)
//   버튼   — 대기 → 시작 → 일시정지 → 다시 시작, 끝난 뒤 누르면 대기로
//   표시창 — 남은 시간, 램프 — 끝나면 켜짐
//
// 조별 단서는 기능을 건드리지 않고 아래 두 가지로만 붙인다.
//   dev.on(이름, fn)  ready · dial · start · pause · resume · tick · end · clear
//   dev.layer        장치 위에 겹친 빈 층 (얼굴 · 말풍선 등을 여기에 그린다)
//   dev.parts        move · plate · body · window · display · lamp · button · grille · dial — 모양만 바꿀 때
//   단서를 쉽게 붙이는 도구는 cues.js (말풍선 · 목소리 · 얼굴 · 움직임 · 소리 · 기다림)
//
// 일부러 얼굴처럼 보이지 않게 배치했다. 넓은 창 하나를 위에 두고, 아래 줄은 네모 버튼 · 격자 · 둥근 다이얼로
// 모양을 다르게 해서 두 눈 · 입 배열이 생기지 않게 했다. 기본형에서 의인화가 느껴지면 비교가 흐려진다.

const W = 560, H = 400;
const MIN = 1, MAX = 10, SWEEP = 270;

// 7분절 표시 — 켜진 분절 목록
const SEG = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
const hSeg = (x1, x2, y) => `${x1},${y} ${x1 + 5},${y - 5} ${x2 - 5},${y - 5} ${x2},${y} ${x2 - 5},${y + 5} ${x1 + 5},${y + 5}`;
const vSeg = (x, y1, y2) => `${x},${y1} ${x + 5},${y1 + 5} ${x + 5},${y2 - 5} ${x},${y2} ${x - 5},${y2 - 5} ${x - 5},${y1 + 5}`;
const SEG_PTS = {
  a: hSeg(12, 48, 8), g: hSeg(12, 48, 50), d: hSeg(12, 48, 92),
  f: vSeg(8, 12, 48), b: vSeg(52, 12, 48), e: vSeg(8, 52, 88), c: vSeg(52, 52, 88),
};

function digitSvg() {
  const polys = Object.entries(SEG_PTS).map(([k, p]) => `<polygon data-s="${k}" points="${p}"/>`).join("");
  return `<svg class="x9-digit" viewBox="0 0 60 100" aria-hidden="true"><g transform="skewX(-6) translate(6 0)">${polys}</g></svg>`;
}

function ticksSvg() {
  // 다이얼 바깥 눈금과 숫자 — 다이얼 중심 기준
  const r1 = 78, r2 = 86, rn = 100, out = [];
  for (let v = MIN; v <= MAX; v++) {
    const a = angleOf(v) * Math.PI / 180;
    const sx = Math.sin(a), cy = -Math.cos(a);
    out.push(`<line x1="${(sx * r1).toFixed(1)}" y1="${(cy * r1).toFixed(1)}" x2="${(sx * r2).toFixed(1)}" y2="${(cy * r2).toFixed(1)}"/>`);
    out.push(`<text x="${(sx * rn).toFixed(1)}" y="${(cy * rn + 4).toFixed(1)}">${v}</text>`);
  }
  return `<svg class="x9-ticks" viewBox="-115 -115 230 230" aria-hidden="true">${out.join("")}</svg>`;
}

const angleOf = v => -SWEEP / 2 + (v - MIN) * SWEEP / (MAX - MIN);

export function mount(host, opts = {}) {
  const speed = opts.speed || 1;          // 미리보기에서 시간을 빨리 돌릴 때
  const handlers = {};
  const emit = (n, d) => (handlers[n] || []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });

  host.innerHTML = `
    <div class="x9-stage">
      <div class="x9" role="group" aria-label="장치 X-9 — 집중 타이머">
       <div class="x9-move">
        <div class="x9-body">
          <i class="x9-screw" style="left:18px;top:18px"></i><i class="x9-screw" style="right:18px;top:18px"></i>
          <i class="x9-screw" style="left:18px;bottom:18px"></i><i class="x9-screw" style="right:18px;bottom:18px"></i>
          <div class="x9-window">
            <div class="x9-display" aria-live="off">
              ${digitSvg()}${digitSvg()}<span class="x9-colon"><i></i><i></i></span>${digitSvg()}${digitSvg()}
            </div>
            <span class="x9-lamp" aria-hidden="true"></span>
          </div>
          <div class="x9-plate"><b>X-9</b><span>MODEL 0927 · S/N 00413</span></div>
          <div class="x9-row">
            <div class="x9-btnwell">
              <button class="x9-button" type="button" aria-label="시작"><span class="x9-glyph">▶︎❚❚</span></button>
              <span class="x9-label">작동</span>
            </div>
            <div class="x9-grille" aria-hidden="true"></div>
            <div class="x9-dialwell">
              ${ticksSvg()}
              <div class="x9-knob" role="slider" tabindex="0" aria-label="시간(분)"
                   aria-valuemin="${MIN}" aria-valuemax="${MAX}"><span class="x9-pointer"></span></div>
              <span class="x9-label x9-label-dial">분</span>
            </div>
          </div>
        </div>
        <div class="x9-layer"></div>
       </div>
      </div>
    </div>`;

  const $ = s => host.querySelector(s);
  const root = $(".x9"), stage = $(".x9-stage");
  const parts = {
    move: $(".x9-move"), plate: $(".x9-plate b"),
    body: $(".x9-body"), window: $(".x9-window"), display: $(".x9-display"), lamp: $(".x9-lamp"),
    button: $(".x9-button"), grille: $(".x9-grille"), dial: $(".x9-knob"),
  };
  const digits = [...host.querySelectorAll(".x9-digit")];

  // 화면 크기에 맞춰 장치 전체를 줄이고 늘린다
  const fit = () => {
    const s = Math.min(stage.clientWidth / W, 1.4);
    root.style.transform = `scale(${s})`;
    stage.style.height = `${H * s}px`;
  };
  new ResizeObserver(fit).observe(stage);

  let value = Math.min(MAX, Math.max(MIN, opts.minutes || 5));
  let state = "idle", remaining = value * 60000, last = 0, timer = 0;

  function show(ms) {
    const sec = Math.ceil(ms / 1000), m = Math.floor(sec / 60), s = sec % 60;
    const txt = String(m).padStart(2, "0") + String(s).padStart(2, "0");
    digits.forEach((svg, i) => {
      const on = SEG[txt[i]];
      svg.querySelectorAll("polygon").forEach(p => p.classList.toggle("on", on.includes(p.dataset.s)));
    });
  }

  function setDial(v, quiet) {
    v = Math.min(MAX, Math.max(MIN, Math.round(v)));
    if (state === "running" || state === "paused") return;
    const changed = v !== value;
    value = v;
    parts.dial.style.setProperty("--a", `${angleOf(v)}deg`);
    parts.dial.setAttribute("aria-valuenow", v);
    parts.dial.setAttribute("aria-valuetext", `${v}분`);
    if (state === "done") clear();
    remaining = value * 60000;
    show(remaining);
    if (changed && !quiet) emit("dial", value);
  }

  function setState(s) {
    state = s;
    root.dataset.state = s;
    parts.button.setAttribute("aria-label", { idle: "시작", running: "일시정지", paused: "다시 시작", done: "확인" }[s]);
  }

  function loop() {
    const now = performance.now();
    remaining -= (now - last) * speed;
    last = now;
    if (remaining <= 0) {
      remaining = 0; show(0);
      clearInterval(timer);
      setState("done");
      emit("end");
      return;
    }
    show(remaining);
    emit("tick", Math.ceil(remaining / 1000));
  }

  function clear() {
    setState("idle");
    remaining = value * 60000;
    show(remaining);
    emit("clear");
  }

  parts.button.addEventListener("click", () => {
    if (state === "idle") { setState("running"); last = performance.now(); timer = setInterval(loop, 100); emit("start", value); }
    else if (state === "running") { clearInterval(timer); setState("paused"); emit("pause", Math.ceil(remaining / 1000)); }
    else if (state === "paused") { setState("running"); last = performance.now(); timer = setInterval(loop, 100); emit("resume", Math.ceil(remaining / 1000)); }
    else clear();
  });

  // 다이얼 — 끌기는 중심에서 잰 각도를 눈금에 맞춘다
  const dialAt = e => {
    const r = parts.dial.getBoundingClientRect();
    const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
    const clamped = Math.max(-SWEEP / 2, Math.min(SWEEP / 2, a));
    setDial(MIN + (clamped + SWEEP / 2) / SWEEP * (MAX - MIN));
  };
  parts.dial.addEventListener("pointerdown", e => {
    parts.dial.setPointerCapture(e.pointerId);
    root.classList.add("turning");
    dialAt(e);
  });
  parts.dial.addEventListener("pointermove", e => { if (parts.dial.hasPointerCapture(e.pointerId)) dialAt(e); });
  parts.dial.addEventListener("pointerup", () => root.classList.remove("turning"));
  parts.dial.addEventListener("wheel", e => { e.preventDefault(); setDial(value + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
  parts.dial.addEventListener("keydown", e => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); setDial(value + d); }
  });

  setState("idle");
  setDial(value, true);
  fit();

  const dev = {
    parts, layer: $(".x9-layer"),
    get state() { return state; },
    get minutes() { return value; },
    on(name, fn) { (handlers[name] ||= []).push(fn); return dev; },
  };
  queueMicrotask(() => emit("ready"));
  return dev;
}
