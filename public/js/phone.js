// 전화 스테이션. 인지 부하를 재는 자리다.
//
// 1988년 전화기에는 화면이 없었다. 그래서 여기에도 없다. 안내원이 불러 주는 번호는
// 소리로 한 번 지나갈 뿐이고, 돌린 숫자도 눈에 보이지 않는다. 잊으면 114에 다시
// 걸어야 하고, 그 횟수가 곧 머리에서 새어 나간 양이다.
//
// 귀가 불편하거나 소리를 못 쓰는 환경을 위해 자막 단추를 두었다. 기본은 꺼둔다.

const DIR = [
  { name:"신신제과",   num:"7324108", close:"20",
    file:"media/phone/shop1.mp3", say:"네, 신신제과입니다. 저희는 저녁 여덟시까지 합니다." },
  { name:"동방서림",   num:"7762350", close:"21",
    file:"media/phone/shop2.mp3", say:"동방서림입니다. 밤 아홉시에 닫습니다." },
  { name:"한성사진관", num:"2679014", close:"19",
    file:"media/phone/shop3.mp3", say:"한성사진관입니다. 일곱시면 문을 닫습니다." },
];
const INFO = "114";
const INFO_FILE = "media/phone/114.mp3";
const INFO_SAY  = "안내입니다. 신신제과 칠삼이의 사일공팔. 동방서림 칠칠육의 이삼오공. "
                + "한성사진관 이육칠의 구공일사입니다.";
const NONUM_FILE = "media/phone/nonumber.mp3";
const NONUM_SAY  = "지금 거신 번호는 없는 번호입니다.";

const STEPS = [
  { t:"수화기를 들고 114에 걸어 세 곳의 번호를 들으십시오. 화면에 뜨지 않으니 귀로 외워야 합니다." },
  { t:"세 곳에 차례로 걸어 각각 몇 시에 닫는지 물으십시오." },
  { t:"세 곳이 닫는 시각을 순서대로 적으십시오.", ask:"신신제과, 동방서림, 한성사진관 (예: 20 21 19)" },
];

export function mountPhone(ui) {
  ui.stage.innerHTML = `
    <div class="modes" role="group" aria-label="기기 선택">
      <button id="m88" aria-pressed="true">1988 전화기</button>
      <button id="mapp" aria-pressed="false">지금의 스마트폰</button>
    </div>

    <div class="phoneset" id="phoneset">
      <div class="brandline"><b>Telephone</b><span>ROTARY · 화면 없음</span></div>
      <div class="phonebody">
        <div class="handsetcol">
          <button class="handset" id="hook" aria-pressed="false">
            <span class="hs"></span><span class="hslabel">수화기 들기</span>
          </button>
          <div class="line" id="line">수화기를 드십시오</div>
          <button class="cc" id="cc" aria-pressed="false">자막 켜기</button>
          <div class="caption" id="caption" hidden></div>
        </div>
        <div class="dialcol">
          <div class="dialplate" id="plate">
            <div class="stop"></div>
            <div class="ring" id="ring"></div>
            <div class="center"></div>
          </div>
          <div class="klabel dialhint">숫자를 끝까지 돌린 뒤 놓으십시오</div>
        </div>
      </div>
    </div>

    <div class="app" id="app" hidden>
      <h3>전화 앱</h3>
      <p class="apphint">이름을 검색해 걸면 됩니다. 번호를 외울 필요가 없습니다.</p>
      <input class="search" id="q" placeholder="가게 이름 검색" autocomplete="off">
      <div class="applist" id="applist"></div>
      <div class="player" id="callbox"><div class="pmeta">통화 중이 아닙니다</div></div>
    </div>`;

  const $ = s => ui.stage.querySelector(s);
  const S = { mode:"phone", off:true, digits:"", cc:false,
              running:false, t0:0, step:0, marks:[0,0,0,0],
              pulses:0, misdials:0, infoCalls:0, taps:0, known:new Set() };

  /* ── 소리 ───────────────────────────────────────── */
  let AC = null, master = null, tone = null, voice = null;
  const audio = () => { if (!AC) { AC = new (window.AudioContext||window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .32; master.connect(AC.destination); } };
  function stopTone() { if (tone) { tone.forEach(o => { try{o.stop();}catch(e){} }); tone = null; } }
  function stopVoice() {
    if (voice) { try { voice.pause(); } catch(e) {} voice = null; }
    try { speechSynthesis.cancel(); } catch(e) {}
  }
  function twoTone(a, b, pattern) {
    audio(); AC.resume?.(); stopTone();
    const g = AC.createGain(); g.gain.value = .12; g.connect(master);
    const os = [a, b].map(f => { const o = AC.createOscillator();
      o.type = "sine"; o.frequency.value = f; o.connect(g); o.start(); return o; });
    if (pattern) {
      let t = AC.currentTime;
      for (let i = 0; i < 40; i++) {
        g.gain.setValueAtTime(.12, t); g.gain.setValueAtTime(0, t + pattern[0]);
        t += pattern[0] + pattern[1];
      }
    }
    tone = os;
  }
  function click() {
    audio(); AC.resume?.();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "square"; o.frequency.value = 90;
    g.gain.setValueAtTime(.16, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .045);
    o.connect(g).connect(master); o.start(); o.stop(AC.currentTime + .05);
  }

  /** 녹음 파일이 있으면 그걸 틀고, 없으면 브라우저 음성으로 읽는다. */
  function speak(file, text, onEnd) {
    stopVoice();
    caption(text);
    const el = new Audio(file);
    let fell = false;
    const fallback = () => {
      if (fell) return; fell = true;
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR"; u.rate = .92;
        u.onend = () => onEnd && onEnd();
        speechSynthesis.speak(u);
      } catch (e) { setTimeout(() => onEnd && onEnd(), text.length * 90); }
    };
    el.addEventListener("error", fallback, { once:true });
    el.addEventListener("ended", () => onEnd && onEnd(), { once:true });
    el.play().catch(fallback);
    voice = el;
    setTimeout(() => { if (el.readyState === 0) fallback(); }, 900);
  }

  /* ── 화면에는 들리는 것만 ───────────────────────── */
  const line = t => { $("#line").textContent = t; };
  function caption(t) {
    const el = $("#caption");
    el.textContent = t; el.hidden = !S.cc || !t;
  }
  $("#cc").addEventListener("click", () => {
    S.cc = !S.cc;
    $("#cc").setAttribute("aria-pressed", String(S.cc));
    $("#cc").textContent = S.cc ? "자막 끄기" : "자막 켜기";
    $("#caption").hidden = !S.cc || !$("#caption").textContent;
  });

  /* ── 다이얼판 ───────────────────────────────────── */
  // 실제 배치 : 5가 12시, 1은 4시로 스토퍼에 가장 가깝고 0이 가장 멀다.
  const ORDER = [1,2,3,4,5,6,7,8,9,0];
  const STEP_DEG = 30;
  const holeAngle = i => 120 - STEP_DEG * i;
  const ring = $("#ring");
  ring.innerHTML = ORDER.map((d, i) => {
    const a = holeAngle(i) * Math.PI / 180;
    const x = 50 + 36 * Math.sin(a), y = 50 - 36 * Math.cos(a);
    return `<button class="hole" data-d="${d}" style="left:${x}%;top:${y}%">${d}</button>`;
  }).join("");
  const angleFor = d => STEP_DEG * (ORDER.indexOf(d) + 1);

  let dragging = null, rot = 0, busy = false;
  const setRot = v => { rot = v; ring.style.transform = `rotate(${v}deg)`; };
  const ang = e => {
    const r = $("#plate").getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height/2), e.clientX - (r.left + r.width/2)) * 180 / Math.PI;
  };
  const norm = a => { while (a < -180) a += 360; while (a > 180) a -= 360; return a; };

  ring.querySelectorAll(".hole").forEach(h => {
    h.addEventListener("pointerdown", e => {
      if (S.off || busy) return;
      e.preventDefault(); h.setPointerCapture(e.pointerId);
      dragging = { d: parseInt(h.dataset.d), target: angleFor(parseInt(h.dataset.d)), from: ang(e) };
    });
    h.addEventListener("pointermove", e => {
      if (!dragging) return;
      setRot(Math.max(0, Math.min(dragging.target, norm(ang(e) - dragging.from))));
    });
    const up = e => {
      if (!dragging) return;
      const { d, target } = dragging; dragging = null;
      try { h.releasePointerCapture(e.pointerId); } catch (_) {}
      if (rot < target * .8) { setRot(0); return; }
      spring(d, target);
    };
    h.addEventListener("pointerup", up);
    h.addEventListener("pointercancel", up);
    h.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); if (S.off || busy) return;
      const d = parseInt(h.dataset.d); spring(d, angleFor(d));
    });
  });

  /** 놓으면 다이얼이 제자리로 돌아가며 숫자만큼 딸깍거린다. 눈에 보이는 기록은 남지 않는다. */
  function spring(d, from) {
    busy = true; stopTone();
    const pulses = d === 0 ? 10 : d, ms = pulses * 95, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      setRot(from * (1 - p));
      if (p < 1) requestAnimationFrame(step);
      else { setRot(0); busy = false; register(d); }
    })(t0);
    let i = 0;
    const iv = setInterval(() => { click(); S.pulses++; if (++i >= pulses) clearInterval(iv); }, 95);
  }

  function register(d) {
    S.digits += String(d);
    if (S.digits === INFO) return connect(INFO);
    if (S.digits.length === 7) connect(S.digits);
    if (S.digits.length > 7) { S.digits = ""; }
  }

  /* ── 통화 ───────────────────────────────────────── */
  function connect(num) {
    stopTone();
    if (num === INFO) {
      S.infoCalls++;
      line("안내가 받았습니다");
      speak(INFO_FILE, INFO_SAY, () => {
        hangup(true);
        if (S.step === 0) advance();
      });
      return;
    }
    const p = DIR.find(x => x.num === num);
    if (!p) {
      S.misdials++;
      line("없는 번호입니다");
      speak(NONUM_FILE, NONUM_SAY, () => hangup(true));
      return;
    }
    if (Math.random() < .22) {                     // 통화중은 그 시절의 일상이었다
      twoTone(480, 620, [.5, .5]);
      line("통화 중입니다"); caption("");
      setTimeout(() => hangup(true), 2400);
      return;
    }
    twoTone(440, 480, [1, 2]);
    line("신호가 갑니다"); caption("");
    setTimeout(() => {
      stopTone(); S.known.add(p.name);
      line("상대가 받았습니다");
      speak(p.file, p.say, () => {
        if (S.step === 1 && S.known.size === DIR.length) advance();
      });
    }, 2600);
  }

  function hangup(auto) {
    stopTone(); stopVoice(); S.digits = ""; caption("");
    if (auto) {
      S.off = true;
      $("#hook").setAttribute("aria-pressed", "false");
      $("#hook").querySelector(".hslabel").textContent = "수화기 들기";
      line("전화가 끊어졌습니다. 수화기를 들면 다시 걸 수 있습니다");
    }
  }
  $("#hook").addEventListener("click", () => {
    S.off = !S.off;
    $("#hook").setAttribute("aria-pressed", String(!S.off));
    $("#hook").querySelector(".hslabel").textContent = S.off ? "수화기 들기" : "수화기 내리기";
    S.digits = ""; stopVoice(); caption("");
    if (S.off) { stopTone(); line("수화기를 드십시오"); }
    else { audio(); AC.resume?.(); twoTone(350, 440, null); line("발신음이 들립니다"); }
  });

  /* ── 앱 ─────────────────────────────────────────── */
  const fmt = n => n.replace(/(\d{3})(\d{4})/, "$1-$2");
  function renderApp(filter) {
    const list = DIR.filter(p => !filter || p.name.includes(filter));
    $("#applist").innerHTML = list.length
      ? list.map(p => `<button data-n="${p.num}">${p.name}<small>${fmt(p.num)}</small></button>`).join("")
      : `<button disabled>검색 결과가 없습니다</button>`;
    $("#applist").querySelectorAll("[data-n]").forEach(b =>
      b.addEventListener("click", () => appCall(b.dataset.n)));
  }
  function appCall(num) {
    const p = DIR.find(x => x.num === num);
    S.taps++; S.known.add(p.name);
    audio(); AC.resume?.(); twoTone(440, 480, [1, 2]);
    $("#callbox").innerHTML = `<div><div class="pbig">${p.name}</div>
      <div class="pmeta">${fmt(p.num)} · 신호가 갑니다…</div></div>`;
    setTimeout(() => {
      stopTone();
      $("#callbox").innerHTML = `<div><div class="pbig">${p.name}</div>
        <div class="pmeta">${p.say}</div></div>`;      // 앱에는 화면이 있으니 글로도 남는다
      speak(p.file, p.say, null);
      if (S.step === 0) advance();
      if (S.step === 1 && S.known.size === DIR.length) advance();
    }, 1600);
  }
  $("#q").addEventListener("input", e => { S.taps++; renderApp(e.target.value.trim()); });

  function setMode(m) {
    S.mode = m;
    $("#m88").setAttribute("aria-pressed", String(m === "phone"));
    $("#mapp").setAttribute("aria-pressed", String(m === "app"));
    $("#phoneset").hidden = m !== "phone"; $("#app").hidden = m !== "app";
    ui.note.textContent = m === "phone"
      ? "이 전화기에는 화면이 없습니다. 안내원이 불러 주는 번호는 소리로 한 번 지나갈 뿐이고, 돌린 숫자도 보이지 않습니다. 한 자리를 잘못 돌리면 처음부터 다시 걸어야 합니다."
      : "이름으로 검색해 누르면 걸립니다. 번호를 외울 필요도, 다시 물을 일도 없습니다.";
    stopTone(); stopVoice();
    S.off = true; S.digits = ""; S.known.clear();
    $("#hook").setAttribute("aria-pressed", "false");
    $("#hook").querySelector(".hslabel").textContent = "수화기 들기";
    line("수화기를 드십시오"); caption("");
    $("#callbox").innerHTML = `<div class="pmeta">통화 중이 아닙니다</div>`;
    $("#q").value = ""; renderApp("");
    reset();
  }
  $("#m88").addEventListener("click", () => setMode("phone"));
  $("#mapp").addEventListener("click", () => setMode("app"));

  /* ── 과업 ───────────────────────────────────────── */
  function renderSteps() {
    ui.steps.innerHTML = STEPS.map((s, i) => {
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
  function answer(i) {
    const got = ((ui.steps.querySelector("#ans"+i)?.value || "").match(/\d+/g) || []);
    const want = DIR.map(p => p.close);
    if (got.length !== 3 || got.some((v, k) => v !== want[k])) {
      flash("세 곳의 마감 시각을 순서대로 적으십시오."); return;
    }
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
    S.step = 0; S.pulses = 0; S.misdials = 0; S.infoCalls = 0; S.taps = 0;
    S.known.clear(); renderSteps();
  });
  ui.resetBtn.addEventListener("click", reset);
  function reset() {
    S.running = false; S.step = 0; S.marks = [0,0,0,0];
    S.pulses = 0; S.misdials = 0; S.infoCalls = 0; S.taps = 0; S.known.clear();
    renderSteps(); renderLog();
  }

  const dur = (a,b) => a && b ? ((b-a)/1000).toFixed(1) : "—";
  const row = () => ({
    station:"phone", mode: S.mode === "phone" ? "1988" : "앱",
    askSec: dur(S.marks[0], S.marks[1]), callSec: dur(S.marks[1], S.marks[2]),
    answerSec: dur(S.marks[2], S.marks[3]), totalSec: dur(S.marks[0], S.marks[3]),
    ops: S.mode === "phone" ? S.pulses : S.taps,
    misdials: S.misdials, infoCalls: S.infoCalls,
  });
  function renderLog() {
    const r = row();
    ui.log.innerHTML = [
      ["번호 듣기", r.askSec, "114에 걸어 외우기까지"],
      ["세 곳에 걸기", r.callSec, "마감 시각을 다 듣기까지"],
      ["답 적기", r.answerSec, ""],
      ["총 시간", r.totalSec, ""],
      [S.mode === "phone" ? "다이얼 돌린 칸 수" : "화면 조작", r.ops, ""],
      ["잘못 건 횟수", r.misdials, ""],
      ["114에 다시 건 횟수", r.infoCalls, "잊어버려 다시 물은 것"],
    ].map(([k,v,d]) => `<tr class="${k.startsWith('114')?'hi':''}">
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
  }, 120);

  setMode("phone"); renderSteps(); renderLog();

  return () => { clearInterval(timer); stopTone(); stopVoice();
                 try { AC && AC.close(); } catch(e) {} };
}
