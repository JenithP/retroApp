// 텔레비전 스테이션.
// 핵심 : 편성표가 시간을 쥐고 있다. 내가 보고 싶을 때가 아니라 방송국이 정한 때 봐야 한다.
// 시계는 실제 1초에 방송 1분씩 간다. 19시 40분에서 시작해 20시 30분에 목표 프로그램이 열린다.
const START_MIN = 19*60 + 40;
const CH = [7, 9, 11];

// [시작 분, 이름, 성격, 영상 파일, 부제]
const SCHEDULE = {
  7:  [[1140,"주말 연속극","drama","media/tv/ch7_1.mp4"],
       [1200,"가요 무대","music","media/tv/ch7_2.mp4"],
       [1230,"올림픽 D-7 특집","crowd","media/tv/ch7_3.mp4","선수촌 24시"],
       [1320,"스포츠 하이라이트","crowd","media/tv/ch7_4.mp4"]],
  9:  [[1140,"뉴스 데스크","news","media/tv/ch9.mp4"],
       [1200,"주말 극장","drama","media/tv/ch9.mp4"],
       [1320,"밤의 음악회","music","media/tv/ch9.mp4"]],
  11: [[1140,"올림픽 특집","crowd","media/tv/ch11.mp4"],
       [1200,"세계의 선수들","talk","media/tv/ch11.mp4"],
       [1230,"교양 특집","talk","media/tv/ch11.mp4"],
       [1320,"방송 종료","off",null]],
};
const TINT = { drama:"#C98A8A", music:"#9BC49B", news:"#E0DAD0",
               crowd:"#E5C07B", talk:"#8FA9C4", off:"#6B6B6B" };
const TARGET = { ch:7, name:"올림픽 D-7 특집", answer:"선수촌 24시" };

const APP_LIST = [
  { name:"주말 연속극", meta:"오늘 19:00", file:"media/tv/ch7_1.mp4" },
  { name:"뉴스 데스크", meta:"오늘 19:00", file:"media/tv/ch9.mp4" },
  { name:"올림픽 D-7 특집", meta:"선수촌 24시", file:"media/tv/ch7_3.mp4", target:true },
  { name:"가요 무대", meta:"오늘 20:00", file:"media/tv/ch7_2.mp4" },
  { name:"세계의 선수들", meta:"오늘 20:00", file:"media/tv/ch11.mp4" },
];

const STEPS = [
  { t:"신문 편성표에서 「올림픽 D-7 특집」이 몇 시 몇 채널인지 찾아, 그 채널에 맞추십시오." },
  { t:"방송이 시작될 때까지 기다렸다가, 특집의 부제를 적으십시오.", ask:"부제" },
  { t:"전원을 껐다가 다시 켜고, 화면에 무엇이 나오는지 적으십시오.", ask:"프로그램 이름" },
];

export function mountTv(ui) {
  ui.stage.innerHTML = `
    <div class="modes" role="group" aria-label="기기 선택">
      <button id="m88" aria-pressed="true">1988 텔레비전</button>
      <button id="mapp" aria-pressed="false">지금의 스트리밍 앱</button>
    </div>
    <div class="clockbar">
      <div><div class="cdate">1988년 9월 10일 토요일</div>
           <div class="ctime" id="clock">19:40</div></div>
      <div class="crate">1초가 방송 시각으로 1분입니다</div>
    </div>
    <div class="tvset" id="tvset">
      <div class="brandline"><b>Samsung Electronic</b><span>COLOR TV · 12CH</span></div>
      <div class="screenwrap"><div class="screen off" id="screen">
        <video id="vid" playsinline muted></video>
        <div class="noise" id="noise"></div>
        <div class="prog" id="prog"></div>
      </div></div>
      <div class="rcontrols">
        <div class="power">
          <button class="pwbtn" id="pw" aria-pressed="false" aria-label="전원"></button>
          <span class="lamp" id="lamp"></span><span class="klabel">Power</span>
        </div>
        <div class="grille" style="height:52px"></div>
        <div>
          <div class="chbox">
            <button class="chbtn" id="chdn" aria-label="채널 내림">▼</button>
            <div class="chnum" id="chnum">—</div>
            <button class="chbtn" id="chup" aria-label="채널 올림">▲</button>
          </div>
          <div class="klabel" style="text-align:center;margin-top:5px">Channel</div>
        </div>
      </div>
    </div>
    <div class="app" id="app" hidden>
      <h3>다시보기 앱</h3>
      <p class="apphint">보고 싶은 것을 고르십시오. 언제든 바로 재생됩니다.</p>
      <div class="applist" id="applist"></div>
      <div class="player wide" id="player"><div class="pmeta">선택된 프로그램이 없습니다</div></div>
      <div class="autonext" id="autonext" hidden></div>
    </div>`;

  const $ = s => ui.stage.querySelector(s);
  const S = { mode:"tv", on:false, ch:7, min:START_MIN, running:false, t0:0, step:0,
              marks:[0,0,0,0], zaps:0, waitZaps:0, appIdx:null };

  const slotOf = (ch, min) => {
    const l = SCHEDULE[ch]; let c = l[0];
    for (const p of l) if (min >= p[0]) c = p;
    const i = l.indexOf(c), end = i+1 < l.length ? l[i+1][0] : 1440;
    return { start:c[0], end, name:c[1], kind:c[2], file:c[3], note:c[4] || "" };
  };
  const hhmm = m => String(Math.floor(m/60)%24).padStart(2,"0") + ":" + String(m%60).padStart(2,"0");

  /* ── 소리 : 영상이 없을 때만 합성음을 쓴다 ─────────── */
  let AC=null, master=null, cur=null;
  const audio = () => { if (!AC) { AC = new (window.AudioContext||window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination); } };
  const stopSynth = () => { if (cur) { try{cur.stop();}catch(e){} cur = null; } };
  function synth(kind) {
    audio(); AC.resume?.(); stopSynth();
    const g = AC.createGain(); g.gain.value = .45; g.connect(master);
    const nodes = [];
    const buf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate), d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    if (kind === "music") {
      const o = AC.createOscillator(), gg = AC.createGain();
      o.type = "triangle"; gg.gain.value = .1; o.connect(gg).connect(g); o.start(); nodes.push(o);
      let i = 0; const seq = [392,494,587,494];
      const iv = setInterval(() => { if (cur !== h) return clearInterval(iv);
        o.frequency.setTargetAtTime(seq[i++%4], AC.currentTime, .04); }, 560);
    } else {
      const s = AC.createBufferSource(); s.buffer = buf; s.loop = true;
      const bp = AC.createBiquadFilter(); bp.type = kind === "off" ? "highpass" : "bandpass";
      bp.frequency.value = kind === "off" ? 1200 : kind === "crowd" ? 520 : kind === "news" ? 820 : 700;
      if (kind !== "off") bp.Q.value = kind === "crowd" ? 1.1 : 3.2;
      const mod = AC.createGain(); mod.gain.value = kind === "off" ? 1 : .3;
      if (kind !== "off") {
        const lfo = AC.createOscillator();
        lfo.type = kind === "crowd" ? "sine" : "square";
        lfo.frequency.value = kind === "crowd" ? .2 : 3.0;
        const lg = AC.createGain(); lg.gain.value = .27;
        lfo.connect(lg).connect(mod.gain); lfo.start(); nodes.push(lfo);
      }
      s.connect(bp).connect(mod).connect(g); s.start(); nodes.push(s);
    }
    const h = { stop(){ nodes.forEach(n => { try{n.stop();}catch(e){} }); } };
    cur = h;
  }

  /* ── 화면 ───────────────────────────────────────── */
  const vid = $("#vid");
  let hasVideo = false, lastKey = null;
  vid.addEventListener("loadeddata", () => { hasVideo = true; vid.hidden = false; });
  vid.addEventListener("error", () => { hasVideo = false; vid.hidden = true; });

  function paint() {
    $("#clock").textContent = hhmm(S.min);
    $("#chnum").textContent = S.on ? S.ch : "—";
    $("#lamp").classList.toggle("on", S.on);
    $("#screen").classList.toggle("off", !S.on);
    if (!S.on) { $("#prog").innerHTML = ""; $("#screen").style.background = "";
                 vid.pause(); vid.hidden = true; return; }
    const p = slotOf(S.ch, S.min), tint = TINT[p.kind];
    $("#screen").style.background = `radial-gradient(120% 90% at 50% 35%, ${tint}33 0%, #0C110D 70%)`;
    $("#prog").innerHTML =
      `<div class="pch" style="color:${tint}">채널 ${S.ch} · ${hhmm(p.start)} 시작</div>
       <div class="pname" style="color:${tint}">${p.name}</div>
       ${p.note ? `<div class="pnote">${p.note}</div>` : ""}
       <div class="plive" style="color:${tint}">${p.kind === "off" ? "방송 종료" : "생방송"}</div>`;
    $("#prog").classList.toggle("overlay", hasVideo);
  }

  /** 편성 슬롯이 바뀌면 그 프로그램을 튼다. 채널을 돌렸다 와도 방송은 그동안 흘러갔다. */
  function syncMedia() {
    if (S.mode !== "tv" || !S.on) { vid.pause(); vid.hidden = true; stopSynth(); lastKey = null; return; }
    const p = slotOf(S.ch, S.min), key = S.ch + "@" + p.start;
    if (key === lastKey) return;
    lastKey = key;
    stopSynth();
    if (p.file) {
      const into = (S.min - p.start);                  // 이미 지나간 만큼 건너뛴다
      if (!vid.src.endsWith(p.file)) vid.src = p.file;
      vid.muted = false; vid.loop = true;
      vid.play().then(() => {
        if (isFinite(vid.duration) && vid.duration > 0)
          vid.currentTime = (into % vid.duration + vid.duration) % vid.duration;
      }).catch(() => { hasVideo = false; vid.hidden = true; synth(p.kind); });
    } else { vid.pause(); vid.hidden = true; }
    if (!hasVideo) synth(p.kind);
  }

  function zap(dir) {
    if (!S.on) return;
    S.zaps++; if (S.step === 1) S.waitZaps++;
    const i = (CH.indexOf(S.ch) + dir + CH.length) % CH.length;
    $("#noise").classList.add("on"); stopSynth(); vid.pause(); lastKey = null;
    setTimeout(() => { S.ch = CH[i]; $("#noise").classList.remove("on"); paint(); syncMedia(); }, 800);
  }
  $("#chup").addEventListener("click", () => zap(1));
  $("#chdn").addEventListener("click", () => zap(-1));
  $("#pw").addEventListener("click", () => {
    S.on = !S.on; $("#pw").setAttribute("aria-pressed", String(S.on));
    audio(); AC.resume?.(); lastKey = null;
    if (!S.on) { vid.pause(); stopSynth(); }
    paint(); syncMedia(); check();
  });

  /* ── 앱 ─────────────────────────────────────────── */
  $("#applist").innerHTML = APP_LIST.map((p,i) =>
    `<button data-i="${i}">${p.name}<small>${p.meta}</small></button>`).join("");
  $("#applist").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => appPlay(parseInt(b.dataset.i))));

  let nextTimer = null, countdown = null;
  function appPlay(i) {
    const p = APP_LIST[i];
    S.zaps++; S.appIdx = i;
    audio(); AC.resume?.();
    vid.src = p.file; vid.hidden = false; vid.muted = false; vid.loop = false;
    vid.currentTime = 0;                                  // 앱은 언제 눌러도 처음부터
    vid.play().catch(() => { vid.hidden = true; synth(p.target ? "crowd" : "drama"); });
    $("#player").innerHTML = `<div><div class="pbig">${p.name}</div>
      <div class="pmeta">${p.meta}</div><div class="pmeta">재생 중</div></div>`;
    $("#autonext").hidden = true;
    clearTimeout(nextTimer); clearInterval(countdown);
    nextTimer = setTimeout(() => autoNext(i), 9000);
    check();
  }
  function autoNext(i) {
    const nx = APP_LIST[(i+1) % APP_LIST.length];
    let left = 3; const el = $("#autonext"); el.hidden = false;
    const tick = () => {
      el.innerHTML = `${left}초 뒤 「${nx.name}」이 자동으로 시작됩니다
        <button id="cancelnext" class="btn">그만 보기</button>`;
      el.querySelector("#cancelnext").addEventListener("click", () => {
        clearInterval(countdown); el.hidden = true; });
      if (left-- <= 0) { clearInterval(countdown); el.hidden = true;
                         appPlay((i+1) % APP_LIST.length); }
    };
    tick(); countdown = setInterval(tick, 1000);
  }

  function setMode(m) {
    S.mode = m;
    $("#m88").setAttribute("aria-pressed", String(m === "tv"));
    $("#mapp").setAttribute("aria-pressed", String(m === "app"));
    $("#tvset").hidden = m !== "tv"; $("#app").hidden = m !== "app";
    ui.note.textContent = m === "tv"
      ? "채널은 위아래 단추로 한 칸씩만 움직입니다. 지금 무엇을 하는지는 화면을 봐야 알고, 앞으로 무엇을 하는지는 신문 편성표에 있습니다."
      : "목록에서 고르면 바로 재생됩니다. 다 보고 나면 다음 것이 알아서 시작됩니다.";
    vid.pause(); vid.hidden = true; stopSynth(); lastKey = null;
    S.on = false; S.appIdx = null; $("#pw").setAttribute("aria-pressed", "false");
    clearTimeout(nextTimer); clearInterval(countdown);
    $("#autonext").hidden = true;
    $("#player").innerHTML = `<div class="pmeta">선택된 프로그램이 없습니다</div>`;
    reset(); paint();
  }
  $("#m88").addEventListener("click", () => setMode("tv"));
  $("#mapp").addEventListener("click", () => setMode("app"));

  /* ── 과업 ───────────────────────────────────────── */
  function renderSteps() {
    ui.steps.innerHTML = STEPS.map((s,i) => {
      const cls = S.step > i ? "done" : (S.step === i && S.running) ? "on" : "";
      const t = S.marks[i+1] ? ((S.marks[i+1]-S.marks[i])/1000).toFixed(1) + "초" : "";
      return `<div class="step ${cls}"><div class="mark">${S.step>i?"✓":i+1}</div>
        <div><p>${s.t}</p>${t?`<div class="t">${t}</div>`:""}
        ${s.ask && S.step === i && S.running
          ? `<div class="answer"><input id="ans${i}" placeholder="${s.ask}">
             <button class="btn" data-ok="${i}">확인</button></div>` : ""}</div></div>`;
    }).join("");
    ui.steps.querySelectorAll("[data-ok]").forEach(b =>
      b.addEventListener("click", () => answer(parseInt(b.dataset.ok))));
  }
  function check() {
    if (!S.running || S.step !== 0) return;
    const okTv = S.mode === "tv" && S.on && S.ch === TARGET.ch;
    const okApp = S.mode === "app" && S.appIdx !== null && APP_LIST[S.appIdx].target;
    if (okTv || okApp) advance();
  }
  function answer(i) {
    const v = (ui.steps.querySelector("#ans"+i)?.value || "").trim().replace(/\s/g,"");
    if (i === 1) {
      if (S.mode === "tv" && slotOf(S.ch, S.min).name !== TARGET.name) {
        flash("아직 그 방송이 나오지 않았습니다."); return; }
      if (S.mode === "app" && !(S.appIdx !== null && APP_LIST[S.appIdx].target)) {
        flash("그 프로그램을 재생한 상태에서 답하십시오."); return; }
      if (v !== TARGET.answer.replace(/\s/g,"")) { flash("화면을 다시 보십시오."); return; }
    }
    if (i === 2 && !v) { flash("화면에 나온 것을 적으십시오."); return; }
    advance();
  }
  function advance() {
    S.marks[S.step+1] = performance.now(); S.step++;
    if (S.step >= STEPS.length) { S.running = false; renderLog(); }
    renderSteps();
  }
  function flash(m) {
    ui.elapsed.textContent = m; ui.elapsed.style.color = "var(--warn)";
    setTimeout(() => { ui.elapsed.style.color = ""; }, 1800);
  }
  ui.startBtn.addEventListener("click", () => {
    S.running = true; S.t0 = performance.now(); S.marks = [S.t0,0,0,0];
    S.step = 0; S.zaps = 0; S.waitZaps = 0; S.min = START_MIN;
    lastKey = null; renderSteps(); paint(); syncMedia();
  });
  ui.resetBtn.addEventListener("click", reset);
  function reset() {
    S.running = false; S.step = 0; S.marks = [0,0,0,0]; S.zaps = 0; S.waitZaps = 0;
    S.min = START_MIN; lastKey = null; renderSteps(); renderLog(); paint();
  }

  const dur = (a,b) => a && b ? ((b-a)/1000).toFixed(1) : "—";
  const row = () => ({
    station:"tv", mode: S.mode === "tv" ? "1988" : "앱",
    findSec: dur(S.marks[0], S.marks[1]), waitSec: dur(S.marks[1], S.marks[2]),
    returnSec: dur(S.marks[2], S.marks[3]), totalSec: dur(S.marks[0], S.marks[3]),
    ops: S.zaps, waitOps: S.waitZaps,
  });
  function renderLog() {
    const r = row();
    ui.log.innerHTML = [
      ["맞추기", r.findSec, "채널을 찾기까지"],
      ["기다림", r.waitSec, "방송이 시작될 때까지"],
      ["복귀", r.returnSec, "껐다 켠 뒤 다시 보기까지"],
      ["총 시간", r.totalSec, ""],
      ["채널 전환", r.ops, ""],
      ["기다리는 동안 돌린 횟수", r.waitOps, ""],
    ].map(([k,v,d]) => `<tr class="${k==='기다림'?'hi':''}">
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
    if (!S.running) return;
    S.min = Math.min(1439, S.min + 1);
    ui.elapsed.textContent = ((performance.now()-S.t0)/1000).toFixed(1) + "초";
    if (S.mode === "tv") { paint(); syncMedia(); } else $("#clock").textContent = hhmm(S.min);
  }, 1000);

  setMode("tv"); renderSteps(); renderLog(); paint();

  return () => {
    clearInterval(timer); clearTimeout(nextTimer); clearInterval(countdown);
    vid.pause(); vid.removeAttribute("src"); stopSynth();
    try { AC && AC.close(); } catch(e) {}
  };
}
