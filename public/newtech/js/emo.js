// 인턴 1차 AI 화상 면접 (정서 컴퓨팅) — 표정 · 시선 · 머리 움직임으로 「호감도 · 진실성 · 성실성 · 정서 안정성」을 매기고,
// 질문 사이마다 읽은 감정에 따라 다음 질문의 난이도를 바꾼다(적응형). 쉬운 질문은 배점 상한이 낮아 종합 점수가 떨어진다.
// 종합 = 질문마다 (배점 상한 × 표정 점수) 의 평균. 답변 내용은 점수에 쓰지 않는다 — 학생이 알아내야 하는 숨은 규칙.
//   호감도      웃는 표정이 많을수록 높음 (가중치가 가장 큼)
//   진실성      머리를 덜 움직이고 화면에서 눈을 덜 뗄수록 높음
//   성실성      화면을 보고 있던 비율 · 답변을 10초 전에 끝내면 감점 (자판을 보느라 고개를 숙여도 감점)
//   정서 안정성  두려움 · 슬픔 · 화남 표정이 적을수록 높음
//   난이도       긴장 · 불쾌 표정 → 한 단계 쉽게 (상한 60) / 웃으며 화면 응시 → 한 단계 어렵게 (상한 100) / 그 밖 → 유지 (첫 질문 보통 · 상한 80)
// 영상은 이 기기 브라우저 안에서만 처리하고 어디에도 보내거나 저장하지 않는다. 기록하는 것은 점수와 판단 기록뿐이다.
import { INTERVIEW, exprKo } from "./data.js";

const FACEAPI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js";
const MODELS = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/";
let faceapi = null, loading = null, cpu = false;

async function load() {
  if (faceapi) return faceapi;
  loading ||= (async () => {
    const api = await import(FACEAPI);
    await api.tf?.ready?.();
    await api.nets.tinyFaceDetector.loadFromUri(MODELS);
    await api.nets.faceExpressionNet.loadFromUri(MODELS);
    await api.nets.faceLandmark68TinyNet.loadFromUri(MODELS);
    faceapi = api;
    return api;
  })();
  return loading;
}
/** 판정 한 번. 그래픽(WebGL) 가속이 멈추는 기기가 있어, 8초 안에 답이 없으면 CPU 로 바꿔 다시 한다 */
async function detect(input) {
  const run = () => faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: cpu ? 160 : 224, scoreThreshold: .4 }))
    .withFaceLandmarks(true).withFaceExpressions();
  if (cpu) return run();
  const r = await Promise.race([run().then(d => ({ d })), new Promise(res => setTimeout(() => res(null), 8000))]);
  if (r) return r.d;
  cpu = true;
  await faceapi.tf.setBackend("cpu");
  await faceapi.tf.ready();
  return run();
}

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const avgPt = pts => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });

/** 얼굴 하나에서 고개 방향 근사 — 코끝이 두 눈 가운데에서 얼마나 벗어났는가 */
function pose(det) {
  const P = det.landmarks.positions;
  const le = avgPt(P.slice(36, 42)), re = avgPt(P.slice(42, 48)), nose = P[30], mouth = avgPt(P.slice(48, 68));
  const mid = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };
  const eyeD = Math.hypot(re.x - le.x, re.y - le.y) || 1;
  return { yaw: (nose.x - mid.x) / eyeD, pitch: (nose.y - mid.y) / ((mouth.y - mid.y) || 1) };
}

/** box 안에 면접 화면을 그린다. onRecord(rec) — 응시가 끝날 때마다 / 평가 근거를 열 때 */
export function mountEmo(box, { onRecord, prev }) {
  let rec = { attempts: [], passed: false, opened: false, ...(prev || {}) };
  let stream = null, alive = true, busy = false;
  box.innerHTML = `
    <div class="iv">
      <div class="ivstage">
        <div class="ivhead"><span class="ivlogo">AI</span><div><b>AI 면접관</b><p class="ivsay">카메라를 켜고 면접을 시작하십시오.</p></div></div>
        <div class="ivq" hidden><p class="ivqno"></p><h3 class="ivqtext"></h3>
          <div class="ivtime"><i><u></u></i><span></span></div>
          <textarea class="ivans" rows="3" maxlength="400" placeholder="답변 (말로 해도 되고 입력해도 됨)"></textarea>
          <button class="btn" data-a="next" type="button">답변 마치기</button></div>
        <div class="ivresult" hidden></div>
        <div class="ivstart"><button class="btn primary big" data-a="start" type="button">카메라 켜고 면접 시작</button><span class="ivleft muted small"></span></div>
      </div>
      <div class="ivcam"><div class="camwrap"><video playsinline muted></video><span class="rec" hidden>● 녹화 중</span></div>
        <p class="muted small">영상은 이 기기 안에서만 처리 · 저장 · 전송 없음</p><p class="ivmsg small"></p></div>
    </div>`;
  const $ = s => box.querySelector(s);
  const video = $("video");
  const say = t => $(".ivsay").textContent = t;
  const left = () => INTERVIEW.attempts - rec.attempts.length;
  const showLeft = () => { $(".ivleft").textContent = `남은 응시 ${left()}회`; $('[data-a="start"]').disabled = left() <= 0 || busy; };
  showLeft();
  if (rec.attempts.length) showResult(rec.attempts[rec.attempts.length - 1]);

  async function camera() {
    if (stream) return true;
    $(".ivmsg").textContent = "카메라와 판정 모델 준비 중…";
    try {
      const [, s] = await Promise.all([load(), navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false })]);
      if (!alive) { s.getTracks().forEach(t => t.stop()); return false; }
      stream = s; video.srcObject = s; await video.play();
      $(".ivmsg").textContent = "";
      return true;
    } catch (e) {
      console.error(e);
      $(".ivmsg").textContent = e.name === "NotAllowedError" ? "카메라 권한 거부됨 — 주소창의 카메라 권한 허용 후 다시" : "카메라를 쓸 수 없는 기기 — 응시 불가";
      return false;
    }
  }

  /** 한 질문 동안 얼굴을 계속 잰다 */
  async function measure(seconds, base, nextBtn) {
    const m = { frames: 0, present: 0, away: 0, move: 0, moveN: 0, ex: {}, last: [], early: false, t0: Date.now() };
    let stop = false, prevC = null;
    nextBtn.onclick = () => { if (Date.now() - m.t0 < 10000) m.early = true; stop = true; };
    while (!stop && alive && Date.now() - m.t0 < seconds * 1000) {
      const el = (Date.now() - m.t0) / 1000;
      $(".ivtime u").style.width = (100 - el / seconds * 100) + "%";
      $(".ivtime span").textContent = Math.ceil(seconds - el) + "초";
      let det = null;
      try { det = await detect(video); } catch (e) { console.error(e); }
      m.frames++;
      if (det) {
        m.present++;
        const ps = pose(det);
        if (Math.abs(ps.yaw - base.yaw) > .2 || Math.abs(ps.pitch - base.pitch) > .14) m.away++;
        const b = det.detection.box, c = { x: (b.x + b.width / 2) / b.width, y: (b.y + b.height / 2) / b.width };
        if (prevC) { m.move += Math.hypot(c.x - prevC.x, c.y - prevC.y); m.moveN++; }
        prevC = c;
        for (const [k, v] of Object.entries(det.expressions)) m.ex[k] = (m.ex[k] || 0) + v;
        m.last.push(det.expressions); if (m.last.length > 8) m.last.shift();
      } else { m.away++; prevC = null; }
      await sleep(150);
    }
    return m;
  }

  async function run() {
    if (busy || left() <= 0) return;
    busy = true; showLeft();
    if (!(await camera())) { busy = false; showLeft(); return; }
    $(".ivresult").hidden = true; $(".ivstart").hidden = true; $(".rec").hidden = false;
    // 정면 기준 잡기
    say("화면 가운데를 보고 잠시 기다려 주십시오.");
    const cal = [];
    for (let i = 0; i < 8 && alive; i++) { try { const d = await detect(video); if (d) cal.push(pose(d)); } catch { } await sleep(120); }
    const base = cal.length ? { yaw: cal.reduce((s, p) => s + p.yaw, 0) / cal.length, pitch: cal.reduce((s, p) => s + p.pitch, 0) / cal.length } : { yaw: 0, pitch: .55 };
    const all = { frames: 0, present: 0, away: 0, move: 0, moveN: 0, ex: {} };
    const events = [], per = [];
    let typed = 0, early = 0, level = 2;
    const used = { 1: 0, 2: 0, 3: 0 };
    const dimsOf = (m, adj) => {
      const F = Math.max(1, m.present), av = k => (m.ex[k] || 0) / F;
      const happy = av("happy"), negA = av("sad") + av("angry") + av("fearful") + av("disgusted"), surp = av("surprised");
      const presentR = m.present / Math.max(1, m.frames), awayR = m.away / Math.max(1, m.frames), moveA = m.move / Math.max(1, m.moveN);
      return {
        likable: clamp(25 + 75 * Math.sqrt(happy) - 30 * negA + (adj.likable || 0)),
        honest: clamp(100 - 900 * moveA - 60 * awayR - 40 * surp + (adj.honest || 0)),
        diligent: clamp(100 * presentR * (1 - awayR) + (adj.diligent || 0)),
        stable: clamp(95 - 120 * negA + (adj.stable || 0)),
      };
    };
    const perf = d => d.likable * .35 + (d.honest + d.diligent + d.stable) * .65 / 3;
    for (let i = 0; i < INTERVIEW.count && alive; i++) {
      const L = INTERVIEW.levels[level];
      const q = L.qs[used[level]++ % L.qs.length];
      $(".ivq").hidden = false;
      $(".ivqno").textContent = `질문 ${i + 1} / ${INTERVIEW.count}`;
      $(".ivqtext").textContent = q;
      $(".ivans").value = "";
      if (i === 0) say("면접을 시작하겠습니다.");
      const m = await measure(INTERVIEW.seconds, base, box.querySelector('[data-a="next"]'));
      typed += $(".ivans").value.trim().length;
      const adj = {};
      if (m.early) { early++; adj.diligent = -15; events.push(`질문 ${i + 1}: 답변을 일찍 마침 → 성실성 −15`); }
      for (const k of ["frames", "present", "away", "move", "moveN"]) all[k] += m[k];
      for (const [k, v] of Object.entries(m.ex)) all.ex[k] = (all.ex[k] || 0) + v;
      // 마지막 몇 초의 표정으로 다음 질문의 난이도를 정한다
      const r = {}; m.last.forEach(e => Object.entries(e).forEach(([k, v]) => r[k] = (r[k] || 0) + v / m.last.length));
      const nerv = (r.fearful || 0) + (r.sad || 0), neg = (r.angry || 0) + (r.disgusted || 0);
      const awayQ = m.away / Math.max(1, m.frames);
      if (neg > .25) adj.likable = (adj.likable || 0) - 10;
      if (nerv > .25) adj.stable = (adj.stable || 0) - 5;
      const d = dimsOf(m, adj), p = perf(d);
      per.push({ level, cap: L.cap, perf: Math.round(p), score: Math.round(L.cap * p / 100) });
      events.push(`질문 ${i + 1} (${L.ko} · 배점 상한 ${L.cap}점): ${Math.round(L.cap * p / 100)}점`);
      if (i < INTERVIEW.count - 1) {
        let nl = level, line = "다음 질문입니다.";
        if (nerv > .25 || neg > .25) {
          nl = Math.max(1, level - 1);
          line = nerv > .25 ? "긴장하신 것 같네요. 조금 쉬운 질문으로 바꾸겠습니다." : "불편하신 점이 있으신가요? 편한 질문으로 넘어가겠습니다.";
          events.push(`질문 ${i + 1} 뒤: ${nerv > .25 ? exprKo(r.fearful > r.sad ? "fearful" : "sad") : "부정"} 표정 감지 → 다음 질문 ${INTERVIEW.levels[nl].ko}(배점 상한 ${INTERVIEW.levels[nl].cap}점)`);
        } else if ((r.happy || 0) > .35 && awayQ < .3) {
          nl = Math.min(3, level + 1);
          line = "좋습니다. 조금 더 깊이 여쭙겠습니다.";
          events.push(`질문 ${i + 1} 뒤: 웃는 표정 · 화면 응시 감지 → 다음 질문 ${INTERVIEW.levels[nl].ko}(배점 상한 ${INTERVIEW.levels[nl].cap}점)`);
        } else if ((r.neutral || 0) > .8) {
          line = "표정이 조금 굳어 보이네요. 다음 질문입니다.";
          events.push(`질문 ${i + 1} 뒤: 무표정 감지 → 난이도 유지`);
        }
        level = nl;
        say(line);
        await sleep(1800);
      }
    }
    $(".rec").hidden = true;
    $(".ivq").hidden = true;
    if (!alive) return;
    const dims = dimsOf(all, { diligent: -15 * early / INTERVIEW.count });
    const total = Math.round(per.reduce((s, x) => s + x.score, 0) / Math.max(1, per.length));
    const at = { total, dims, per, pass: total >= INTERVIEW.pass, events, typed, early, at: Date.now() };
    rec = { ...rec, attempts: [...rec.attempts, at], passed: rec.passed || at.pass };
    onRecord?.(rec);
    say("수고하셨습니다. 결과를 안내해 드립니다.");
    showResult(at);
    busy = false;
    $(".ivstart").hidden = false;
    showLeft();
  }

  function showResult(at) {
    const r = $(".ivresult");
    r.hidden = false;
    r.innerHTML = `<div class="ivverdict ${at.pass ? "ok" : "no"}"><b>${at.pass ? "합격" : "불합격"}</b><span>종합 ${at.total}점 · 기준 ${INTERVIEW.pass}점</span></div>
      <p class="muted small">${at.pass ? "2차 면접 대상자로 선정되었습니다." : "아쉽지만 이번 전형에서는 함께하기 어렵습니다."}</p>
      <button class="btn ghost small" data-a="why" type="button">평가 근거 보기</button><div class="ivwhy" hidden></div>`;
    r.querySelector('[data-a="why"]').onclick = () => {
      const w = r.querySelector(".ivwhy");
      w.hidden = !w.hidden;
      w.innerHTML = INTERVIEW.dims.map(d => `<div class="ebar"><span>${d.ko}</span><i><u style="width:${at.dims[d.id]}%"></u></i><em>${at.dims[d.id]}</em></div>`).join("")
        + `<h4>면접관 판단 기록</h4><ul>${at.events.length ? at.events.map(e => `<li>${esc(e)}</li>`).join("") : "<li>특이 사항 없음</li>"}</ul>`;
      if (!rec.opened) { rec = { ...rec, opened: true }; onRecord?.(rec); }
    };
  }

  box.querySelector('[data-a="start"]').onclick = run;
  return {
    stop() { alive = false; stream?.getTracks().forEach(t => t.stop()); stream = null; },
  };
}
