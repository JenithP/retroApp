// 라디오 스테이션.
// 핵심 : 전원을 켠 순간 네 방송이 동시에 흐르기 시작한다. 다이얼을 돌렸다 오면
// 그 사이에 지나간 부분은 다시 들을 수 없다. 방송과 주문형의 차이가 여기서 갈린다.
const FMIN = 88, FMAX = 108, LOCK = 0.25;

const STATIONS = [
  { f: 91.9,  id: "KBS 제1라디오", prog: "뉴스와 날씨",
    file: "media/radio/91.9.mp3",  kind: "talk",
    ticker: "…내일 서울 낮 최고기온 24도, 대체로 맑음…", answer: "24" },
  { f: 95.1,  id: "MBC 라디오", prog: "올림픽 특별 생방송",
    file: "media/radio/95.1.mp3",  kind: "crowd",
    ticker: "…선수촌에는 오늘까지 스물세 개 나라가 들어왔습니다…", answer: "23" },
  { f: 98.7,  id: "KBS 제2라디오", prog: "밤을 잊은 그대에게",
    file: "media/radio/98.7.mp3",  kind: "music", ticker: "…신청 엽서 읽어 드립니다…" },
  { f: 103.5, id: "AFKN", prog: "영어 방송",
    file: "media/radio/103.5.mp3", kind: "talk2", ticker: "…English service…" },
];

const STEPS = [
  { t: "올림픽 특별 생방송을 찾으십시오." },
  { t: "다른 방송에서 내일 서울의 낮 최고기온을 확인하십시오.", ask: "최고기온 (숫자만)", want: "24" },
  { t: "다시 특별 생방송으로 돌아와, 선수촌에 들어온 나라가 몇 개국인지 적으십시오.",
    ask: "개국 수 (숫자만)", want: "23" },
];

export function mountRadio(ui) {
  ui.stage.innerHTML = `
    <div class="modes" role="group" aria-label="기기 선택">
      <button id="m88" aria-pressed="true">1988 라디오</button>
      <button id="mapp" aria-pressed="false">지금의 라디오 앱</button>
    </div>
    <div class="radio" id="radio">
      <div class="brandline"><b>Golden Star</b><span>FM / AM 2-BAND</span></div>
      <div class="dial off" id="dial">
        <div class="band">FM MHz</div>
        <div class="ticks" id="ticks"></div>
        <div class="needle" id="needle"></div>
        <div class="nowplaying" id="np">전원을 켜십시오</div>
      </div>
      <div class="rcontrols">
        <div class="knobwrap">
          <div class="knob" id="vol" tabindex="0" role="slider" aria-label="음량"
               aria-valuemin="0" aria-valuemax="10" aria-valuenow="5"></div>
          <div class="klabel">Volume</div>
        </div>
        <div class="grille"></div>
        <div class="knobwrap">
          <div class="knob big" id="tune" tabindex="0" role="slider" aria-label="주파수"
               aria-valuemin="88" aria-valuemax="108" aria-valuenow="90.4"></div>
          <div class="klabel">Tuning</div>
        </div>
      </div>
      <div class="rcontrols" style="margin-top:14px">
        <div class="power">
          <button class="pwbtn" id="pw" aria-pressed="false" aria-label="전원"></button>
          <span class="lamp" id="lamp"></span><span class="klabel">Power</span>
        </div>
        <div class="klabel" id="freq">—</div>
      </div>
    </div>
    <div class="app" id="app" hidden>
      <h3>라디오 앱</h3>
      <p class="apphint">방송을 목록에서 고르십시오.</p>
      <div class="applist" id="applist"></div>
      <div class="player" id="player"><div class="pmeta">선택된 방송이 없습니다</div></div>
    </div>`;

  const $ = s => ui.stage.querySelector(s);
  const S = { mode:"radio", on:false, freq:90.4, vol:5, turns:0, taps:0,
              running:false, t0:0, step:0, marks:[0,0,0,0], returnAt:0,
              appPlaying:null, loading:false, lockAt:0, lastLock:null };

  /* ── 소리 : 파일이 있으면 파일, 없으면 합성 ─────────── */
  let AC=null, master=null, noiseG=null, whG=null, wh=null;
  const media = new Map(), synth = new Map();
  let usingFiles = false;

  function initAudio() {
    if (AC) return;
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);

    const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    const n = AC.createBufferSource(); n.buffer = buf; n.loop = true;
    const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    noiseG = AC.createGain(); noiseG.gain.value = 0;
    n.connect(hp).connect(noiseG).connect(master); n.start();

    wh = AC.createOscillator(); wh.type = "sine"; wh.frequency.value = 900;
    whG = AC.createGain(); whG.gain.value = 0;
    wh.connect(whG).connect(master); wh.start();

    STATIONS.forEach(st => {
      const el = new Audio(st.file);
      el.loop = true; el.crossOrigin = "anonymous"; el.preload = "auto";
      el.addEventListener("canplay", () => { usingFiles = true; }, { once:true });
      el.addEventListener("error", () => { if (!synth.has(st.f)) synth.set(st.f, buildSynth(st, buf)); });
      const g = AC.createGain(); g.gain.value = 0;
      try { AC.createMediaElementSource(el).connect(g).connect(master); } catch(e) {}
      media.set(st.f, { el, g });
      synth.set(st.f, buildSynth(st, buf));      // 파일이 없을 때를 대비해 미리 만든다
    });
  }

  function buildSynth(st, noiseBuf) {
    const g = AC.createGain(); g.gain.value = 0; g.connect(master);
    if (st.kind === "music") {
      const notes = [392,494,587,494], o = AC.createOscillator(), gg = AC.createGain();
      o.type = "triangle"; gg.gain.value = .11; o.connect(gg).connect(g); o.start();
      let i = 0;
      const iv = setInterval(() => o.frequency.setTargetAtTime(notes[i++ % 4], AC.currentTime, .04), 620);
      g._stop = () => { clearInterval(iv); try{o.stop();}catch(e){} };
    } else {
      const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const bp = AC.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.value = st.kind === "crowd" ? 520 : st.kind === "talk2" ? 1250 : 780;
      bp.Q.value = st.kind === "crowd" ? 1.1 : 3.4;
      const mod = AC.createGain(); mod.gain.value = .3;
      const lfo = AC.createOscillator();
      lfo.type = st.kind === "crowd" ? "sine" : "square";
      lfo.frequency.value = st.kind === "crowd" ? .17 : 3.1;
      const lg = AC.createGain(); lg.gain.value = st.kind === "crowd" ? .35 : .26;
      lfo.connect(lg).connect(mod.gain); lfo.start();
      s.connect(bp).connect(mod).connect(g); s.start();
      g._stop = () => { try{s.stop();lfo.stop();}catch(e){} };
    }
    return g;
  }

  /** 전원을 켜면 네 방송이 한꺼번에 재생을 시작한다 — 이후로는 멈추지 않는다. */
  function startAll() {
    media.forEach(({ el }) => { el.currentTime = 0; el.play().catch(()=>{}); });
  }
  function stopAll() { media.forEach(({ el }) => el.pause()); }

  function mix() {
    if (!AC) return;
    master.gain.setTargetAtTime(S.on ? (S.vol/10)*.6 : 0, AC.currentTime, .04);
    let best = 0;
    STATIONS.forEach(st => {
      const sig = Math.max(0, 1 - Math.abs(st.f - S.freq) / LOCK);
      best = Math.max(best, sig);
      const m = media.get(st.f), sy = synth.get(st.f);
      const on = S.on ? sig * .9 : 0;
      if (usingFiles) { m.g.gain.setTargetAtTime(on, AC.currentTime, .05);
                        sy.gain.setTargetAtTime(0, AC.currentTime, .05); }
      else            { sy.gain.setTargetAtTime(on, AC.currentTime, .05); }
    });
    noiseG.gain.setTargetAtTime(S.on ? (1-best)*.16 : 0, AC.currentTime, .05);
    const off = Math.abs(nearest().f - S.freq);
    const whi = S.on && off > LOCK*.55 && off < LOCK*2.6;
    whG.gain.setTargetAtTime(whi ? .035 : 0, AC.currentTime, .05);
    wh.frequency.setTargetAtTime(500 + off*2200, AC.currentTime, .05);
  }

  const nearest = () => STATIONS.reduce((a,b) =>
    Math.abs(b.f - S.freq) < Math.abs(a.f - S.freq) ? b : a);
  const locked = () => { const s = nearest();
    return Math.abs(s.f - S.freq) <= LOCK ? s : null; };

  /* ── 눈금판 ─────────────────────────────────────── */
  (function ticks(){
    let h = "";
    for (let f = FMIN; f <= FMAX + .001; f += .5) {
      const pct = (f-FMIN)/(FMAX-FMIN)*100, maj = Math.abs(f % 2) < .01;
      h += `<div class="tick ${maj?'maj':'min'}" style="left:${pct}%"></div>`;
      if (maj) h += `<div class="num" style="left:${pct}%">${f}</div>`;
    }
    $("#ticks").innerHTML = h;
  })();

  function paint() {
    const pad = 26, w = $("#dial").clientWidth || 600;
    $("#needle").style.left = (pad + (S.freq-FMIN)/(FMAX-FMIN)*(w-pad*2)) + "px";
    $("#freq").textContent = S.on ? S.freq.toFixed(1) + " MHz" : "—";
    const st = locked();
    $("#np").innerHTML = !S.on ? "전원을 켜십시오"
      : st ? `<b>${st.id}</b> · ${st.prog}  ${usingFiles ? "" : st.ticker}` : "잡음";
    $("#dial").classList.toggle("off", !S.on);
    $("#lamp").classList.toggle("on", S.on);
    mix();
  }

  /* ── 손잡이 : 마우스와 터치를 같은 코드로 ──────────── */
  function knob(el, onTurn, onKey) {
    let last = null, acc = 0;
    const ang = e => { const r = el.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top+r.height/2), e.clientX - (r.left+r.width/2)); };
    el.addEventListener("pointerdown", e => { el.setPointerCapture(e.pointerId); last = ang(e); e.preventDefault(); });
    el.addEventListener("pointermove", e => {
      if (last === null) return;
      let a = ang(e), d = a - last;
      if (d > Math.PI) d -= 2*Math.PI; if (d < -Math.PI) d += 2*Math.PI;
      last = a; acc += Math.abs(d);
      if (acc > .5) { S.turns++; acc = 0; }
      onTurn(d / (2*Math.PI));
    });
    const up = e => { if (last !== null) { last = null; try{el.releasePointerCapture(e.pointerId);}catch(_){} } };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", e => {
      const k = {ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];
      if (k === undefined) return; e.preventDefault(); S.turns++; onKey(k);
    });
  }
  knob($("#tune"), t => {                       // 한 바퀴가 약 6MHz
    S.freq = Math.min(FMAX, Math.max(FMIN, S.freq + t*6));
    $("#tune").style.transform = `rotate(${S.freq*60}deg)`;
    $("#tune").setAttribute("aria-valuenow", S.freq.toFixed(1));
    paint(); check();
  }, d => { S.freq = Math.min(FMAX, Math.max(FMIN, S.freq + d*.1)); paint(); check(); });
  knob($("#vol"), t => { S.vol = Math.min(10, Math.max(0, S.vol + t*14));
    $("#vol").style.transform = `rotate(${S.vol*27}deg)`; mix(); },
    d => { S.vol = Math.min(10, Math.max(0, S.vol + d)); mix(); });

  $("#pw").addEventListener("click", () => {
    S.on = !S.on; $("#pw").setAttribute("aria-pressed", String(S.on));
    initAudio(); AC.resume?.();
    if (S.on) startAll(); else stopAll();
    paint();
  });

  /* ── 앱 : 목록에서 고르면 처음부터 나온다 ──────────── */
  $("#applist").innerHTML = STATIONS.map(s =>
    `<button data-f="${s.f}">${s.id} — ${s.prog}<small>${s.f.toFixed(1)}</small></button>`).join("");
  $("#applist").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => appPlay(parseFloat(b.dataset.f))));

  function appPlay(f) {
    if (S.loading) return;
    S.taps++; S.loading = true; S.appPlaying = null;
    $("#player").innerHTML = `<div class="spinner"></div><div class="pmeta">불러오는 중…</div>`;
    initAudio(); AC.resume?.();
    stopAll(); mix();
    setTimeout(() => {                                  // 버퍼링 3.5초 — 그동안은 무음
      S.loading = false; S.appPlaying = f;
      const st = STATIONS.find(x => x.f === f);
      const m = media.get(f);
      m.el.currentTime = 0; m.el.play().catch(()=>{});   // 앱은 늘 처음부터
      master.gain.setTargetAtTime(.5, AC.currentTime, .05);
      m.g.gain.setTargetAtTime(.9, AC.currentTime, .05);
      if (!usingFiles) synth.get(f).gain.setTargetAtTime(.9, AC.currentTime, .05);
      $("#player").innerHTML =
        `<div class="pbig">${st.id}</div><div class="pmeta">${st.prog}</div>
         <div class="pmeta">${st.ticker}</div>`;
      check();
    }, 3500);
  }

  function setMode(m) {
    S.mode = m;
    $("#m88").setAttribute("aria-pressed", String(m === "radio"));
    $("#mapp").setAttribute("aria-pressed", String(m === "app"));
    $("#radio").hidden = m !== "radio"; $("#app").hidden = m !== "app";
    ui.note.textContent = m === "radio"
      ? "튜닝 손잡이를 잡고 좌우로 끄십시오. 한 바퀴가 약 6MHz입니다. 켜는 순간 네 방송이 함께 흐르기 시작하므로, 다른 방송에 갔다 오면 그 사이는 지나가 있습니다."
      : "방송을 목록에서 고르면 재생됩니다. 언제 고르든 처음부터 나옵니다.";
    stopAll(); S.appPlaying = null; S.loading = false; S.on = false;
    $("#pw").setAttribute("aria-pressed", "false");
    $("#player").innerHTML = `<div class="pmeta">선택된 방송이 없습니다</div>`;
    reset(); paint();
  }
  $("#m88").addEventListener("click", () => setMode("radio"));
  $("#mapp").addEventListener("click", () => setMode("app"));

  /* ── 과업 ───────────────────────────────────────── */
  function renderSteps() {
    ui.steps.innerHTML = STEPS.map((s, i) => {
      const cls = S.step > i ? "done" : (S.step === i && S.running) ? "on" : "";
      const t = S.marks[i+1] ? ((S.marks[i+1]-S.marks[i])/1000).toFixed(1) + "초" : "";
      return `<div class="step ${cls}"><div class="mark">${S.step>i?"✓":i+1}</div>
        <div><p>${s.t}</p>${t ? `<div class="t">${t}</div>` : ""}
        ${s.ask && S.step === i && S.running
          ? `<div class="answer"><input id="ans${i}" placeholder="${s.ask}" inputmode="numeric">
             <button class="btn" data-ok="${i}">확인</button></div>` : ""}</div></div>`;
    }).join("");
    ui.steps.querySelectorAll("[data-ok]").forEach(b =>
      b.addEventListener("click", () => answer(parseInt(b.dataset.ok))));
  }
  const current = () => S.mode === "radio"
    ? (S.on ? locked() : null)
    : (S.appPlaying ? STATIONS.find(x => x.f === S.appPlaying) : null);

  function check() {
    if (!S.running || S.step !== 0) return;
    const c = current(); const now = performance.now();
    if (!c) { S.lockAt = 0; S.lastLock = null; return; }
    if (S.lastLock !== c.f) { S.lastLock = c.f; S.lockAt = now; return; }
    if (now - S.lockAt < 2000) return;
    if (c.f === 95.1) advance();
  }
  function answer(i) {
    const v = (ui.steps.querySelector("#ans"+i)?.value || "").trim().replace(/\D/g, "");
    const need = i === 1 ? 91.9 : 95.1;
    const c = current();
    if (!c || c.f !== need) { flash("그 방송에 맞춘 상태에서 답하십시오."); return; }
    if (v !== STEPS[i].want) { flash("방송을 다시 들어 보십시오."); return; }
    advance();
  }
  function advance() {
    S.marks[S.step+1] = performance.now(); S.step++;
    if (S.step === 2) S.returnAt = performance.now();
    if (S.step >= STEPS.length) { S.running = false; renderLog(); }
    renderSteps();
  }
  function flash(m) {
    ui.elapsed.textContent = m; ui.elapsed.style.color = "var(--warn)";
    setTimeout(() => { ui.elapsed.style.color = ""; }, 1800);
  }
  ui.startBtn.addEventListener("click", () => {
    S.running = true; S.t0 = performance.now(); S.marks = [S.t0,0,0,0];
    S.step = 0; S.turns = 0; S.taps = 0; renderSteps();
  });
  ui.resetBtn.addEventListener("click", reset);
  function reset() {
    S.running = false; S.step = 0; S.marks = [0,0,0,0]; S.turns = 0; S.taps = 0;
    renderSteps(); renderLog();
  }

  /* ── 기록 ───────────────────────────────────────── */
  const dur = (a,b) => a && b ? ((b-a)/1000).toFixed(1) : "—";
  const row = () => ({
    station: "radio", mode: S.mode === "radio" ? "1988" : "앱",
    findSec: dur(S.marks[0], S.marks[1]), moveSec: dur(S.marks[1], S.marks[2]),
    returnSec: dur(S.returnAt, S.marks[3]), totalSec: dur(S.marks[0], S.marks[3]),
    ops: S.mode === "radio" ? S.turns : S.taps,
  });
  function renderLog() {
    const r = row();
    ui.log.innerHTML = [
      ["찾기", r.findSec, "특별 생방송을 잡기까지"],
      ["이동", r.moveSec, "날씨 방송으로 옮겨 확인"],
      ["복귀", r.returnSec, "다시 돌아와 답을 듣기까지"],
      ["총 시간", r.totalSec, ""],
      [S.mode === "radio" ? "손잡이 회전" : "화면 조작", r.ops, ""],
    ].map(([k,v,d]) => `<tr class="${k==='복귀'?'hi':''}">
        <td class="key">${k}${d?`<br><span class="sub">${d}</span>`:""}</td>
        <td class="n">${v}</td></tr>`).join("");
  }
  ui.saveBtn.addEventListener("click", () => {
    const r = row();
    if (r.totalSec === "—") {
      ui.saveMsg.textContent = "과업을 끝까지 마친 뒤 제출하십시오.";
      ui.saveMsg.className = "savemsg bad"; return;
    }
    ui.submit(r, ui.saveMsg);
  });

  const timer = setInterval(() => {
    if (S.running) ui.elapsed.textContent = ((performance.now()-S.t0)/1000).toFixed(1) + "초";
    check();
  }, 120);
  const onResize = () => paint();
  addEventListener("resize", onResize);

  setMode("radio"); renderSteps(); renderLog(); paint();

  return () => {                       // 거실로 나갈 때 소리를 끊는다
    clearInterval(timer); removeEventListener("resize", onResize);
    stopAll(); try { AC && AC.close(); } catch(e) {}
  };
}
