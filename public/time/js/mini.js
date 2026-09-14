// 말로 안 되면 몸으로 — 비비기, 입김 불기, 함께 부르기.
// 모두 마우스와 손가락, 키보드 어느 쪽으로도 된다.
import { audio } from "./audio.js";

const $ = s => document.querySelector(s);
const mini = () => $("#mini");
// 다음 프레임. 시험 모드(?debug)에서는 미리보기 창이 프레임을 멈추므로 시계로 대신 돈다.
const next = f => (window.__G ? setTimeout(() => f(performance.now()), 33) : requestAnimationFrame(f));

function open(html) {
  const m = mini(); m.innerHTML = `<div class="mcard">${html}</div>`; m.hidden = false; return m;
}
function close() { const m = mini(); m.hidden = true; m.innerHTML = ""; }

/** 막대를 판에 세우고 좌우로 빠르게 비빈다. 멈추면 식는다. */
export function rub() {
  const m = open(`
    <h3>막대를 비벼 보이기</h3>
    <p class="how">판 위를 <b>좌우로 빠르게 끌어</b> 막대를 비비십시오. 멈추면 식습니다.
      키보드는 <kbd>←</kbd><kbd>→</kbd> 를 번갈아.</p>
    <div class="pad" id="rubpad"><canvas id="rubcv"></canvas></div>
    <div class="meter"><i id="rubm"></i></div>
    <p class="mstate" id="rubst">차가운 나무</p>`);
  const pad = m.querySelector("#rubpad"), cv = m.querySelector("#rubcv"), bar = m.querySelector("#rubm");
  const st = m.querySelector("#rubst"), g = cv.getContext("2d");
  const fit = () => { cv.width = pad.clientWidth * devicePixelRatio; cv.height = pad.clientHeight * devicePixelRatio; };
  fit();

  let heat = 0, strokes = 0, dir = 0, run = 0, lastX = null, spin = 0, t0 = performance.now();
  let lit = false;           // 한 번이라도 끝까지 달아오르면 성공 — 식는 계산이 먼저 돌아 99%에 멈추는 일을 막는다
  const smoke = [];
  const stroke = () => {
    strokes++; heat = Math.min(1, heat + 0.055); audio.rub(heat);
    if (heat >= 1) lit = true;
    if (heat > 0.45) smoke.push({ x: 0.5 + (Math.random() - 0.5) * 0.08, y: 0.66, a: 0.7, r: 6 });
  };
  if (window.__G) window.__finishMini = () => { heat = 1; lit = true; };   // 시험 주소에서만
  const moveTo = x => {
    if (lastX === null) { lastX = x; return; }
    const dx = x - lastX; lastX = x;
    spin += dx * 0.02;
    const d = Math.sign(dx);
    if (!d) return;
    if (d === dir) run += Math.abs(dx);
    else { if (run > 14) stroke(); dir = d; run = Math.abs(dx); }
  };
  pad.addEventListener("pointerdown", e => { pad.setPointerCapture(e.pointerId); lastX = e.clientX; });
  pad.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") moveTo(e.clientX); });
  let lastKey = "";
  const onKey = e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    if (e.key !== lastKey) { stroke(); spin += e.key === "ArrowLeft" ? -0.6 : 0.6; }
    lastKey = e.key;
  };
  addEventListener("keydown", onKey);

  return new Promise(res => {
    let prev = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      if (!lit) heat = Math.max(0, heat - dt * 0.085);
      bar.style.width = (heat * 100) + "%";
      st.textContent = heat < 0.2 ? "차가운 나무" : heat < 0.45 ? "따뜻해진다…" : heat < 0.8 ? "연기가 오른다!" : "거의 다 됐다 — 조금만 더!";

      // 그리기 — 받침 판, 세운 막대, 연기
      const W = cv.width, H = cv.height, s = devicePixelRatio;
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#8a6440"; g.fillRect(W * 0.2, H * 0.72, W * 0.6, H * 0.1);
      g.fillStyle = "#6e4e31"; g.fillRect(W * 0.2, H * 0.82, W * 0.6, H * 0.03);
      const glow = Math.max(0, (heat - 0.5) * 2);
      if (glow) {
        const r = g.createRadialGradient(W / 2, H * 0.72, 0, W / 2, H * 0.72, 40 * s);
        r.addColorStop(0, `rgba(255,${160 + 60 * glow},60,${0.9 * glow})`); r.addColorStop(1, "rgba(255,120,40,0)");
        g.fillStyle = r; g.fillRect(0, 0, W, H);
      }
      g.save(); g.translate(W / 2, H * 0.72); g.rotate(Math.sin(spin) * 0.12);
      g.fillStyle = "#b58a58"; g.fillRect(-7 * s, -H * 0.55, 14 * s, H * 0.55);
      g.fillStyle = "#9a7446"; for (let i = 0; i < 5; i++) g.fillRect(-7 * s, -H * 0.55 + ((spin * 40 + i * 30) % (H * 0.55) + H * 0.55) % (H * 0.55), 14 * s, 3 * s);
      g.restore();
      for (const p of smoke) { p.y -= dt * 0.18; p.r += dt * 22; p.a -= dt * 0.35; }
      while (smoke.length && smoke[0].a <= 0) smoke.shift();
      for (const p of smoke) { g.fillStyle = `rgba(210,205,196,${Math.max(0, p.a)})`; g.beginPath(); g.arc(p.x * W, p.y * H, p.r * s, 0, 7); g.fill(); }

      if (lit) {
        removeEventListener("keydown", onKey);
        st.textContent = "불씨가 생겼다!";
        audio.chime();
        setTimeout(() => { close(); res({ strokes, sec: (performance.now() - t0) / 1000 }); }, 900);
        return;
      }
      next(frame);
    };
    next(frame);
  });
}

/** 불씨에 입김을 분다. 약하면 꺼지고, 세면 날아간다. 알맞은 세기로 버틴다. */
export function blow() {
  const m = open(`
    <h3>입김 불어 넣기</h3>
    <p class="how">단추를 <b>누르고 있으면</b> 입김이 세지고, 떼면 약해집니다.
      초록 칸 안에서 버티십시오. 너무 세면 불씨가 날아갑니다. 키보드는 <kbd>스페이스</kbd>.</p>
    <div class="meter" style="height:26px"><div class="zone" style="left:45%;width:33%"></div><i id="blm"></i></div>
    <div class="meter" style="height:8px;margin-top:8px"><i id="blok" style="background:#4d7f3f"></i></div>
    <p class="mstate" id="blst">불씨가 희미하게 빛난다</p>
    <button class="big" id="blbtn" style="margin-top:6px">후우 — 누르고 있기</button>`);
  const bar = m.querySelector("#blm"), ok = m.querySelector("#blok"), st = m.querySelector("#blst"), btn = m.querySelector("#blbtn");
  let held = false, lvl = 0, good = 0, fails = 0, t0 = performance.now();
  const on = e => { e.preventDefault(); held = true; }, off = () => { held = false; };
  btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off);
  btn.addEventListener("pointerleave", off); btn.addEventListener("pointercancel", off);
  const kd = e => { if (e.key === " ") { e.preventDefault(); held = true; } };
  const ku = e => { if (e.key === " ") held = false; };
  if (window.__G) window.__finishMini = () => { good = 2.2; };   // 시험 주소에서만
  addEventListener("keydown", kd); addEventListener("keyup", ku);

  return new Promise(res => {
    let prev = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      lvl = Math.max(0, Math.min(1, lvl + (held ? 0.5 : -0.7) * dt));
      const inZone = lvl >= 0.45 && lvl <= 0.78;
      if (inZone) good += dt;
      if (lvl > 0.97) {
        fails++; lvl = 0; good = Math.max(0, good - 0.8); audio.huh();
        st.textContent = "너무 세게 불었다 — 불씨가 흩어졌다. 다시.";
      } else if (inZone) st.textContent = "좋다… 불씨가 붉어진다";
      else if (lvl > 0.78) st.textContent = "너무 세다!";
      else st.textContent = "불씨가 희미하게 빛난다";
      bar.style.width = (lvl * 100) + "%";
      ok.style.width = Math.min(100, good / 2.2 * 100) + "%";
      if (good >= 2.2) {
        removeEventListener("keydown", kd); removeEventListener("keyup", ku);
        st.textContent = "마른 풀에 불이 옮겨붙었다!";
        audio.chime();
        setTimeout(() => { close(); res({ fails, sec: (performance.now() - t0) / 1000 }); }, 900);
        return;
      }
      next(frame);
    };
    next(frame);
  });
}

/** 같은 노래를 여러 번 함께 부른다 — 적을 곳이 없으니 되풀이가 곧 기억이다 */
export function chant(lines, reps, voice) {
  const m = open(`
    <h3>함께 부르기</h3>
    <p class="how">한 줄씩 누르며 누와 함께 부르십시오. <b>${reps}번</b> 되풀이하면 누가 외웁니다.</p>
    <div class="chant" id="chl">${lines.map(l => `<span>${l}</span>`).join("")}</div>
    <p class="mstate" id="chst">1번째</p>
    <button class="big" id="chbtn">부르기</button>`);
  const spans = [...m.querySelectorAll(".chant span")], st = m.querySelector("#chst"), btn = m.querySelector("#chbtn");
  let i = 0, rep = 0, taps = 0;
  return new Promise(res => {
    const sing = () => {
      taps++;
      spans.forEach((s, k) => s.classList.toggle("on", k === i));
      [...lines[i]].forEach((ch, k) => { if (ch.trim() && k % 2 === 0) setTimeout(() => audio.blip(voice), k * 45); });
      i++;
      if (i >= lines.length) {
        i = 0; rep++;
        st.textContent = rep >= reps ? "누가 외웠다!" : `${rep + 1}번째`;
        if (rep >= reps) {
          btn.disabled = true; removeEventListener("keydown", kd); audio.chime();
          setTimeout(() => { close(); res({ taps }); }, 1100);
        }
      }
    };
    btn.addEventListener("click", sing);
    const kd = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); sing(); } };
    addEventListener("keydown", kd);
  });
}

/** 편지를 한 줄씩 손으로 따라 쓴다. 흐린 글자를 need 만큼 덮어야 다음 줄로 넘어간다.
 *  복사기가 없던 시대 — 조종하는 한 사람이 처음부터 끝까지 쓴다. */
export async function trace(lines, { title = "편지 베끼기", need = 0.75 } = {}) {
  try { await document.fonts.load('700 64px "Gowun Batang"'); } catch (e) {}
  const t0 = performance.now();
  const passed = [];
  let redo = 0;
  for (let li = 0; li < lines.length; li++) {
    let note = "";
    for (;;) {
      const r = await traceLine(lines[li], li, lines.length, title, need, t0, note);
      if (r.ok) { passed.push(r.acc); break; }
      redo++; note = r.note;
    }
  }
  close();
  return { secs: Math.round((performance.now() - t0) / 1000), redoLines: redo,
           acc: Math.round(passed.reduce((a, b) => a + b, 0) / passed.length * 100) };
}

function traceLine(text, li, n, title, need, t0, note) {
  const m = open(`
    <h3>${title}<span class="tcount">${li + 1} / ${n}줄</span></h3>
    <p class="how">흐린 글자를 <b>마우스나 손가락으로 따라 그리십시오.</b>
      글자를 ${Math.round(need * 100)}% 넘게 덮어야 다음 줄로 넘어갑니다. 이 시대에는 복사기가 없습니다.</p>
    <div class="tpad"><canvas></canvas></div>
    <div class="trow"><span class="mstate" id="tst"></span><span class="ttime" id="ttime"></span></div>
    <div class="tbtns"><button class="tool" id="tclear">지우고 이 줄 다시</button><button class="big" id="tdone">이 줄 다 썼다</button></div>`);
  m.querySelector(".mcard").classList.add("wide");
  const pad = m.querySelector(".tpad"), cv = pad.querySelector("canvas"), g = cv.getContext("2d");
  const st = m.querySelector("#tst"), tm = m.querySelector("#ttime");
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = cv.width = Math.round(pad.clientWidth * dpr), H = cv.height = Math.round(pad.clientHeight * dpr);

  // 따라 쓸 글자 — 보이지 않는 판에 그려 두고, 글자 위의 점들을 과녁으로 삼는다
  const maskCv = document.createElement("canvas"); maskCv.width = W; maskCv.height = H;
  const mg = maskCv.getContext("2d");
  const font = s => `700 ${s}px "Gowun Batang", serif`;
  mg.font = font(100);
  const size = Math.min(H * 0.6, (W * 0.9) / (mg.measureText(text).width / 100));
  for (const c of [mg, g]) { c.font = font(size); c.textAlign = "center"; c.textBaseline = "middle"; }
  mg.fillStyle = "#000"; mg.fillText(text, W / 2, H / 2);
  const mask = mg.getImageData(0, 0, W, H).data;
  const inMask = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 100;

  const step = Math.max(3, Math.round(4 * dpr)), cells = new Map(), targets = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    if (!inMask(x, y)) continue;
    cells.set(`${x / step},${y / step}`, targets.length);
    targets.push(0);
  }
  let covered = 0, drawn = 0, off = 0;
  const R = Math.round(9 * dpr), reach = Math.ceil(R / step);
  const cover = (x, y) => {
    const cx = Math.round(x / step), cy = Math.round(y / step);
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      const i = cells.get(`${cx + dx},${cy + dy}`);
      if (i !== undefined && !targets[i] && (dx * dx + dy * dy) * step * step <= R * R) { targets[i] = 1; covered++; }
    }
  };
  const onTrack = (x, y) => {
    const d = 13 * dpr;
    for (const [ox, oy] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]])
      if (inMask(x + ox, y + oy)) return true;
    return false;
  };

  const paint = () => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(120, 92, 58, 0.26)"; g.fillText(text, W / 2, H / 2);
  };
  paint();
  const pct = () => Math.round(covered / targets.length * 100);
  const say = s => { st.textContent = s; };
  say(note || "따라 쓰는 중 — 덮은 정도 0%");

  let last = null;
  const ink = (x, y) => {
    if (last) {
      const dist = Math.hypot(x - last.x, y - last.y), k = Math.max(1, Math.round(dist / (2 * dpr)));
      for (let i = 1; i <= k; i++) {
        const px = last.x + (x - last.x) * i / k, py = last.y + (y - last.y) * i / k;
        drawn++; if (!onTrack(px, py)) off++;
        cover(px, py);
      }
      g.strokeStyle = "#2B2118"; g.lineWidth = 6 * dpr; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(x, y); g.stroke();
    }
    last = { x, y };
    say(`따라 쓰는 중 — 덮은 정도 ${pct()}%`);
  };
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  pad.addEventListener("pointerdown", e => { pad.setPointerCapture(e.pointerId); last = null; ink(...at(e)); });
  pad.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") ink(...at(e)); });
  pad.addEventListener("pointerup", () => { last = null; });
  pad.addEventListener("pointercancel", () => { last = null; });

  const clock = setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    tm.textContent = `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, "0")}초째`;
  }, 250);

  return new Promise(res => {
    const finish = r => { clearInterval(clock); res(r); };
    m.querySelector("#tclear").addEventListener("click", () => {
      targets.fill(0); covered = 0; drawn = 0; off = 0; last = null; paint();
      say("지웠다 — 이 줄을 처음부터");
    });
    const done = m.querySelector("#tdone");
    done.addEventListener("click", () => {
      const acc = covered / targets.length, offR = drawn ? off / drawn : 1;
      if (acc >= need && offR <= 0.3) { audio.chime(); say(`좋다 — 덮은 정도 ${pct()}%`); setTimeout(() => finish({ ok: true, acc }), 450); return; }
      audio.huh();
      finish({ ok: false, acc, note: offR > 0.3
        ? `글자 밖으로 벗어난 획이 많다 (${Math.round(offR * 100)}%). 이 줄을 다시 쓰십시오.`
        : `덮은 정도 ${pct()}% — ${Math.round(need * 100)}%를 넘어야 한다. 이 줄을 다시 쓰십시오.` });
    });
    if (window.__G) window.__finishMini = () => { targets.fill(1); covered = targets.length; drawn = 1; off = 0; done.click(); };   // 시험 주소에서만
  });
}
