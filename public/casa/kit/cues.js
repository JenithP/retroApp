// 장치 X-9 단서 도구 — 2부에서 조별 명세서를 장치에 붙일 때 생성 코드가 쓰는 도구.
//
// 생성된 장치 페이지는 이렇게 시작한다 (버셀 함수의 SYSTEM 프롬프트에 같은 설명이 있다):
//   import { start } from "x9";
//   const { dev, C } = start();
//   dev.on("start", () => C.say("시작할게요"));
//
// 도구는 Feine 외 (2019) 분류에 맞춰 묶었다.
//   언어   C.say · C.bubble · C.name
//   시각   C.face · C.move · C.lamp · C.color
//   청각   C.voice · C.sound
//   시간   C.wait · C.typing · C.idle
// 타이머 기능은 x9.js 가 잠그고 있어 여기서는 바꿀 수 없다.
import { mount } from "./x9.js";

const KIT = new URL(".", import.meta.url).href;

export function start(opts = {}) {
  for (const href of [KIT + "x9.css", KIT + "cues.css"]) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href;
    document.head.appendChild(l);
  }
  document.body.classList.add("x9-page");
  const host = document.createElement("div");
  host.className = "x9-host";
  document.body.appendChild(host);
  const dev = mount(host, opts);
  return { dev, C: cues(dev) };
}

export function cues(dev) {
  const P = dev.parts, layer = dev.layer;
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
  let audio = null;
  const ac = () => (audio ||= new (window.AudioContext || window.webkitAudioContext)());

  // 말풍선 — 장치 오른쪽 위에 하나만 띄운다
  let bubbleEl = null, bubbleTimer = 0;
  function bubble(text, { ms = 2600 } = {}) {
    if (!bubbleEl) { bubbleEl = document.createElement("div"); bubbleEl.className = "cue-bubble"; layer.appendChild(bubbleEl); }
    clearTimeout(bubbleTimer);
    bubbleEl.textContent = String(text);
    bubbleEl.classList.remove("typing");
    bubbleEl.classList.add("show");
    if (ms > 0) bubbleTimer = setTimeout(() => bubbleEl.classList.remove("show"), ms);
    return bubbleEl;
  }

  function voice(text, { pitch = 1, rate = 1 } = {}) {
    try {
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = "ko-KR"; u.pitch = pitch; u.rate = rate;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { /* 음성이 없는 브라우저 */ }
  }

  // 합성 소리 — 파일 없이 짧게
  function sound(kind = "beep") {
    try {
      const a = ac(), t = a.currentTime, g = a.createGain();
      g.connect(a.destination);
      const tone = (f1, f2, dur, type = "sine", vol = 0.18, at = 0) => {
        const o = a.createOscillator(), gg = a.createGain();
        o.type = type; o.frequency.setValueAtTime(f1, t + at); o.frequency.exponentialRampToValueAtTime(f2, t + at + dur);
        gg.gain.setValueAtTime(0.0001, t + at); gg.gain.exponentialRampToValueAtTime(vol, t + at + 0.02);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(gg); gg.connect(g); o.start(t + at); o.stop(t + at + dur + 0.05);
      };
      if (kind === "beep") tone(880, 880, 0.18, "square", 0.08);
      else if (kind === "chirp") { tone(900, 1600, 0.09); tone(1200, 2000, 0.09, "sine", 0.18, 0.11); }
      else if (kind === "sigh") tone(420, 180, 0.9, "triangle", 0.12);
      else if (kind === "hum") tone(220, 240, 1.2, "sine", 0.1);
      else if (kind === "laugh") [0, .14, .28].forEach(d => tone(700, 520, 0.1, "triangle", 0.14, d));
      else if (kind === "alarm") [0, .25, .5].forEach(d => tone(1040, 1040, 0.15, "square", 0.08, d));
    } catch { /* 소리를 못 내는 환경 */ }
  }

  // 얼굴 — 표시창 왼쪽 빈 곳(window) 또는 몸체 위 작은 화면(top)
  function face({ where = "window", eyes = "round", mouth = "smile", blink = true } = {}) {
    const el = document.createElement("div");
    el.className = `cue-face at-${where} eyes-${eyes} mouth-${mouth}${blink ? " blink" : ""}`;
    el.innerHTML = `<i class="eye l"></i><i class="eye r"></i><i class="mouth"></i>`;
    (where === "window" ? P.window : layer).appendChild(el);
    const f = {
      el,
      mood(m) { el.dataset.mood = m; return f; },     // happy · neutral · sleepy · surprised · sad
      look(dx = 0, dy = 0) { el.style.setProperty("--lx", dx + "px"); el.style.setProperty("--ly", dy + "px"); return f; },
      hide() { el.hidden = true; return f; }, show() { el.hidden = false; return f; },
    };
    return f.mood("neutral");
  }

  // 몸 움직임 — 한 번(tilt · nod · shake · bounce) 또는 계속(breathe)
  function move(kind = "nod") {
    const m = P.move;
    if (kind === "breathe") { m.classList.add("cue-breathe"); return; }
    if (kind === "still") { m.classList.remove("cue-breathe"); return; }
    m.classList.remove("cue-" + kind); void m.offsetWidth; m.classList.add("cue-" + kind);
    m.addEventListener("animationend", () => m.classList.remove("cue-" + kind), { once: true });
  }

  function lamp(mode = "on") {
    P.lamp.classList.remove("cue-lamp-on", "cue-lamp-blink", "cue-lamp-pulse", "cue-lamp-breathe");
    if (mode !== "off") P.lamp.classList.add("cue-lamp-" + mode);
  }

  function color(part, value) {
    const el = { body: P.body, button: P.button, display: P.display }[part];
    if (!el) return;
    if (part === "display") el.style.setProperty("--vfd", value), P.window.closest(".x9").style.setProperty("--vfd", value);
    else if (part === "button") P.window.closest(".x9").style.setProperty("--accent", value);
    else el.style.background = value;
  }

  // 일정 시간 아무 조작이 없으면
  function idle(ms, fn) {
    let t = 0;
    const reset = () => { clearTimeout(t); t = setTimeout(() => { fn(); reset(); }, ms); };
    ["dial", "start", "pause", "resume", "end", "clear"].forEach(n => dev.on(n, reset));
    reset();
  }

  const C = {
    say(text, { voice: v = false, ms, pitch, rate } = {}) { bubble(text, { ms }); if (v) voice(text, { pitch, rate }); },
    bubble, voice, sound, face, move, lamp, color, idle, wait,
    name(text) { P.plate.textContent = String(text); },
    async typing(ms = 900) {
      bubble("", { ms: 0 });
      bubbleEl.classList.add("typing");
      await wait(ms);
      bubbleEl.classList.remove("typing", "show");
    },
    uses: 0,                                   // 이번 접속에서 시작 버튼을 누른 횟수 (기억 단서용)
  };
  dev.on("start", () => { C.uses += 1; });
  return C;
}
