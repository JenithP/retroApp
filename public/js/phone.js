// 전화 스테이션. 인지 부하를 재는 자리다.
// 안내원이 불러준 번호는 3초 뒤 사라지고 적을 수 없다. 로터리 다이얼은 한 자리를
// 잘못 돌리면 되돌릴 수 없어 처음부터 다시 걸어야 한다. 잊으면 114에 다시 걸어야 하고,
// 그 횟수가 곧 머리에서 새어 나간 양이다.

const DIR = [
  { name:"신신제과",   num:"7324108", close:"20", line:"저희는 저녁 여덟시까지 합니다." },
  { name:"동방서림",   num:"7762350", close:"21", line:"밤 아홉시에 닫습니다." },
  { name:"한성사진관", num:"2679014", close:"19", line:"일곱시면 문을 닫습니다." },
];
const INFO = "114";

const STEPS = [
  { t:"수화기를 들고 114에 걸어 세 곳의 번호를 물으십시오. 번호는 3초 뒤 사라지고 적을 수 없습니다." },
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
      <div class="brandline"><b>Telephone</b><span>ROTARY · 7 DIGIT</span></div>
      <div class="phonebody">
        <div class="handsetcol">
          <button class="handset" id="hook" aria-pressed="false">
            <span class="hs"></span><span class="hslabel">수화기 들기</span>
          </button>
          <div class="readout" id="readout">수화기를 드십시오</div>
          <div class="dialed" id="dialed"></div>
        </div>
        <div class="dialcol">
          <div class="dialplate" id="plate">
            <div class="stop"></div>
            <div class="ring" id="ring"></div>
            <div class="center"></div>
          </div>
          <div class="klabel" style="text-align:center;margin-top:8px">숫자를 끝까지 돌린 뒤 놓으십시오</div>
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
  const S = { mode:"phone", off:true, digits:"", calling:null,
              running:false, t0:0, step:0, marks:[0,0,0,0],
              pulses:0, misdials:0, infoCalls:0, taps:0, known:new Set() };

  /* ── 소리 ───────────────────────────────────────── */
  let AC = null, master = null, tone = null;
  const audio = () => { if (!AC) { AC = new (window.AudioContext||window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .35; master.connect(AC.destination); } };
  function stopTone() { if (tone) { tone.forEach(o => { try{o.stop();}catch(e){} }); tone = null; } }
  function twoTone(a, b, pattern) {          // pattern: null이면 계속, [on,off]면 끊어서
    audio(); AC.resume?.(); stopTone();
    const g = AC.createGain(); g.gain.value = .14; g.connect(master);
    const os = [a, b].map(f => { const o = AC.createOscillator();
      o.type = "sine"; o.frequency.value = f; o.connect(g); o.start(); return o; });
    if (pattern) {
      let t = AC.currentTime;
      for (let i = 0; i < 40; i++) {
        g.gain.setValueAtTime(.14, t); g.gain.setValueAtTime(0, t + pattern[0]);
        t += pattern[0] + pattern[1];
      }
    }
    tone = os;
  }
  function click() {                          // 다이얼이 되돌아갈 때 나는 딸깍 소리
    audio(); AC.resume?.();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "square"; o.frequency.value = 90;
    g.gain.setValueAtTime(.16, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .045);
    o.connect(g).connect(master); o.start(); o.stop(AC.currentTime + .05);
  }

  /* ── 다이얼판 ───────────────────────────────────── */
  // 실제 다이얼 배치 : 5가 맨 위, 1은 4시 방향으로 스토퍼에 가장 가깝고, 0이 가장 멀다.
  // 그래서 1은 조금만 돌리면 되고 0은 거의 한 바퀴를 돌려야 한다.
  const ORDER = [1,2,3,4,5,6,7,8,9,0];
  const STEP_DEG = 30;
  const holeAngle = i => 120 - STEP_DEG * i;   // 위쪽을 0도로 두고 시계 방향이 양수
  const ring = $("#ring");
  ring.innerHTML = ORDER.map((d, i) => {
    const a = holeAngle(i) * Math.PI / 180;
    const x = 50 + 36 * Math.sin(a), y = 50 - 36 * Math.cos(a);
    return `<button class="hole" data-d="${d}" style="left:${x}%;top:${y}%">${d}</button>`;
  }).join("");

  const angleFor = d => STEP_DEG * (ORDER.indexOf(d) + 1);   // 1은 30도, 0은 300도
  let dragging = null, rot = 0, busy = false;

  function setRot(v) { rot = v; ring.style.transform = `rotate(${v}deg)`; }

  ring.querySelectorAll(".hole").forEach(h => {
    h.addEventListener("pointerdown", e => {
      if (S.off || busy) return;
      e.preventDefault(); h.setPointerCapture(e.pointerId);
      dragging = { d: parseInt(h.dataset.d), target: angleFor(parseInt(h.dataset.d)), from: ang(e) };
    });
    h.addEventListener("pointermove", e => {
      if (!dragging) return;
      const d = norm(ang(e) - dragging.from);
      setRot(Math.max(0, Math.min(dragging.target, d)));
    });
    const up = e => {
      if (!dragging) return;
      const { d, target } = dragging; dragging = null;
      try { h.releasePointerCapture(e.pointerId); } catch (_) {}
      if (rot < target * .8) { setRot(0); return; }        // 끝까지 안 돌리면 무효
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
  const ang = e => {
    const r = $("#plate").getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height/2), e.clientX - (r.left + r.width/2)) * 180 / Math.PI;
  };
  const norm = a => { while (a < -180) a += 360; while (a > 180) a -= 360; return a; };

  /** 손을 떼면 다이얼이 제자리로 돌아가며 숫자만큼 딸깍거린다. 숫자가 클수록 오래 걸린다. */
  function spring(d, from) {
    busy = true; stopTone();
    const pulses = d === 0 ? 10 : d;
    const dur = pulses * 95;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      setRot(from * (1 - p));
      if (p < 1) requestAnimationFrame(step);
      else { setRot(0); busy = false; register(d); }
    })(t0);
    let i = 0;
    const iv = setInterval(() => { click(); S.pulses++; if (++i >= pulses) clearInterval(iv); }, 95);
  }

  function register(d) {
    S.digits += String(d);
    $("#dialed").textContent = S.digits.replace(/(\d{3})(\d+)/, "$1-$2");
    if (S.digits.length === 3 && S.digits === INFO) return connect(INFO);
    if (S.digits.length === 7) connect(S.digits);
  }

  /* ── 통화 ───────────────────────────────────────── */
  function say(html, cls) { $("#readout").innerHTML = html; $("#readout").className = "readout " + (cls||""); }

  function connect(num) {
    if (num === INFO) {
      S.infoCalls++;
      twoTone(440, 480, null);
      say(`<b>114 안내</b><br>세 곳의 번호를 불러 드립니다.`, "on");
      setTimeout(() => {
        stopTone();
        DIR.forEach((p, i) => setTimeout(() => {
          say(`<b>${p.name}</b><br><span class="bignum">${fmt(p.num)}</span>`, "on");
          setTimeout(() => {                               // 3초 뒤 사라진다
            say(`<b>${p.name}</b><br><span class="gone">번호가 지나갔습니다</span>`, "on");
          }, 3000);
        }, i * 4200));
        setTimeout(() => { hangup(true); if (S.step === 0) advance(); }, DIR.length * 4200 + 600);
      }, 1400);
      return;
    }
    const p = DIR.find(x => x.num === num);
    if (!p) {
      S.misdials++;
      twoTone(480, 620, [.5, .5]);
      say(`없는 번호입니다.<br><span class="small">처음부터 다시 거십시오.</span>`, "bad");
      setTimeout(() => hangup(true), 2200);
      return;
    }
    if (Math.random() < .22) {                             // 통화중은 그 시절의 일상이었다
      twoTone(480, 620, [.5, .5]);
      say(`<b>${p.name}</b><br>통화 중입니다.`, "bad");
      setTimeout(() => hangup(true), 2400);
      return;
    }
    twoTone(440, 480, [1, 2]);
    say(`<b>${p.name}</b><br>신호가 갑니다…`, "on");
    setTimeout(() => {
      stopTone(); S.known.add(p.name);
      say(`<b>${p.name}</b><br>${p.line}`, "on");
      if (S.step === 1 && S.known.size === DIR.length) advance();
    }, 2600);
  }
  const fmt = n => n.replace(/(\d{3})(\d{4})/, "$1-$2");

  function hangup(auto) {
    stopTone(); S.digits = ""; $("#dialed").textContent = "";
    if (auto) { say("수화기를 내렸다 다시 드십시오"); S.off = true;
                $("#hook").setAttribute("aria-pressed", "false");
                $("#hook").querySelector(".hslabel").textContent = "수화기 들기"; }
  }
  $("#hook").addEventListener("click", () => {
    S.off = !S.off;
    $("#hook").setAttribute("aria-pressed", String(!S.off));
    $("#hook").querySelector(".hslabel").textContent = S.off ? "수화기 들기" : "수화기 내리기";
    S.digits = ""; $("#dialed").textContent = "";
    if (S.off) { stopTone(); say("수화기를 드십시오"); }
    else { audio(); AC.resume?.(); twoTone(350, 440, null); say("번호를 돌리십시오", "on"); }
  });

  /* ── 앱 ─────────────────────────────────────────── */
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
        <div class="pmeta">${p.line}</div></div>`;
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
      ? "수화기를 들고 숫자 구멍을 끝까지 돌린 뒤 놓으십시오. 한 자리를 잘못 돌리면 되돌릴 수 없어 처음부터 다시 걸어야 합니다. 번호를 잊으면 114에 다시 걸어야 합니다."
      : "이름으로 검색해 누르면 걸립니다. 번호를 외울 필요도, 다시 물을 일도 없습니다.";
    stopTone(); S.off = true; S.digits = ""; S.known.clear();
    $("#hook").setAttribute("aria-pressed", "false");
    $("#hook").querySelector(".hslabel").textContent = "수화기 들기";
    $("#dialed").textContent = ""; say("수화기를 드십시오");
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
    const raw = (ui.steps.querySelector("#ans"+i)?.value || "");
    const got = raw.match(/\d+/g) || [];
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
      ["번호 받기", r.askSec, "114에 물어 외우기까지"],
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

  return () => { clearInterval(timer); stopTone(); try { AC && AC.close(); } catch(e) {} };
}
