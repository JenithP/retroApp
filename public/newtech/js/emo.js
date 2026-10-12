// 인턴 1차 AI 화상 면접 (정서 컴퓨팅) — 질문마다 생각 시간 뒤 답변 시간. 답변은 음성 인식(또는 입력)으로 글자가 되고,
// 서버(api/newtech.js)의 AI가 내용을 채점하고 답변을 이어받는 다음 질문을 만든다. 다음 질문의 난이도는 표정이 정한다(적응형).
// 질문 점수 = 배점 상한 × (표정 60% + 내용 40%) · 종합 = 질문 점수의 평균 · 70점 합격.
//   표정 점수   호감도(웃음, 가중치 큼) · 진실성(머리 움직임 · 시선 이탈이 적을수록) · 성실성(화면 응시 비율 · 일찍 끝내면 감점)
//               · 정서 안정성(두려움 · 슬픔 · 화남이 적을수록)
//   난이도      긴장 · 불쾌 표정 → 한 단계 쉽게 (상한 60) / 웃으며 화면 응시 → 한 단계 어렵게 (상한 100) / 그 밖 → 유지 (첫 질문 보통 · 상한 80)
// 학생에게는 합격 여부와 종합 점수만 보인다. 항목별 점수와 면접관 판단 기록은 결과 공개 화면과 실습보고서에서 공개한다.
// 영상은 이 기기 브라우저 안에서만 처리하고 어디에도 보내지 않는다. 서버로 가는 것은 답변 글자뿐이다.
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

/* 음성 인식 — 크롬 · 엣지 · 사파리의 Web Speech API. 없으면 입력만 쓴다 */
const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
function listen(onText) {
  if (!SR) return null;
  const r = new SR();
  r.lang = "ko-KR"; r.continuous = true; r.interimResults = true;
  let done = "", on = true;
  r.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) done += t + " "; else interim += t;
    }
    onText(done + interim);
  };
  r.onend = () => { if (on) try { r.start(); } catch { } };   // 말이 끊겨 멈추면 다시 켠다
  r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") on = false; };
  try { r.start(); } catch { return null; }
  return { stop() { on = false; try { r.stop(); } catch { } }, text: () => done };
}

/** box 안에 면접 화면을 그린다. onRecord(rec) — 응시가 끝날 때마다. ai(body) — 답변 채점 · 다음 질문 서버 호출 */
export function mountEmo(box, { onRecord, prev, ai }) {
  let rec = { attempts: [], passed: false, ...(prev || {}) };
  let stream = null, alive = true, busy = false, mic = null;
  box.innerHTML = `
    <div class="iv">
      <div class="ivstage">
        <div class="ivhead"><span class="ivlogo">AI</span><div><b>AI 면접관</b><p class="ivsay">카메라를 켜고 면접을 시작하십시오.</p></div></div>
        <div class="ivq" hidden><p class="ivqno"></p><h3 class="ivqtext"></h3>
          <div class="ivtime"><i><u></u></i><span></span></div><p class="ivphase small"></p>
          <textarea class="ivans" rows="4" maxlength="800" placeholder="말로 답하면 글자로 바뀜 · 직접 입력도 가능"></textarea>
          <button class="btn" data-a="next" type="button">답변 마치기</button></div>
        <div class="ivresult" hidden></div>
        <div class="ivstart"><button class="btn primary big" data-a="start" type="button">카메라 켜고 면접 시작</button><span class="ivleft muted small"></span></div>
      </div>
      <div class="ivcam"><div class="camwrap"><video playsinline muted></video><span class="rec" hidden>● 녹화 중</span></div>
        <p class="muted small">영상은 이 기기 안에서만 처리 · 답변 글자만 채점 서버로 전송${SR ? "" : " · 이 브라우저는 음성 인식 미지원 — 입력으로 답변"}</p><p class="ivmsg small"></p></div>
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

  function countdown(seconds, t0, label) {
    const el = (Date.now() - t0) / 1000;
    $(".ivtime u").style.width = Math.max(0, 100 - el / seconds * 100) + "%";
    $(".ivtime span").textContent = Math.max(0, Math.ceil(seconds - el)) + "초";
    $(".ivphase").textContent = label;
  }

  /** 생각 시간 — 재지 않고 기다리기만 한다 */
  async function think() {
    const t0 = Date.now();
    $(".ivans").disabled = true; $('[data-a="next"]').disabled = true;
    while (alive && Date.now() - t0 < INTERVIEW.think * 1000) { countdown(INTERVIEW.think, t0, "생각 시간 — 답변 준비"); await sleep(200); }
    $(".ivans").disabled = false; $('[data-a="next"]').disabled = false;
  }

  /** 답변 시간 — 얼굴을 계속 재고, 말은 글자로 받는다 */
  async function measure(base) {
    const m = { frames: 0, present: 0, away: 0, move: 0, moveN: 0, ex: {}, last: [], early: false, t0: Date.now() };
    let stop = false, prevC = null;
    $('[data-a="next"]').onclick = () => { if (Date.now() - m.t0 < INTERVIEW.early * 1000) m.early = true; stop = true; };
    mic = listen(txt => { $(".ivans").value = txt; });
    while (!stop && alive && Date.now() - m.t0 < INTERVIEW.seconds * 1000) {
      countdown(INTERVIEW.seconds, m.t0, mic ? "답변 중 — 말로 답하기 (글자로 바뀜)" : "답변 중 — 입력으로 답하기");
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
    mic?.stop(); mic = null;
    return m;
  }

  /** 서버 채점 — 늦거나 실패하면 답변 길이로 대신하고 준비된 질문을 쓴다 */
  async function judge(body) {
    try {
      return await Promise.race([ai(body), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
    } catch (e) {
      console.error("interview ai", e);
      const n = String(body.answer || "").trim().length;
      return { score: Math.min(60, n), reason: "자동 채점 지연 — 답변 길이로 대신 채점", next: "", fallback: true };
    }
  }

  async function run() {
    if (busy || left() <= 0) return;
    busy = true; showLeft();
    if (!(await camera())) { busy = false; showLeft(); return; }
    $(".ivresult").hidden = true; $(".ivstart").hidden = true; $(".rec").hidden = false;
    say("화면 가운데를 보고 잠시 기다려 주십시오.");
    const cal = [];
    for (let i = 0; i < 8 && alive; i++) { try { const d = await detect(video); if (d) cal.push(pose(d)); } catch { } await sleep(120); }
    const base = cal.length ? { yaw: cal.reduce((s, p) => s + p.yaw, 0) / cal.length, pitch: cal.reduce((s, p) => s + p.pitch, 0) / cal.length } : { yaw: 0, pitch: .55 };
    const all = { frames: 0, present: 0, away: 0, move: 0, moveN: 0, ex: {} };
    const events = [], per = [], history = [];
    let typed = 0, early = 0, level = 2, q = INTERVIEW.levels[2].qs[Math.floor(Math.random() * 2)];
    const used = new Set([q]);
    const bank = lv => { const qs = INTERVIEW.levels[lv].qs.filter(x => !used.has(x)); const x = qs[0] || INTERVIEW.levels[lv].qs[0]; used.add(x); return x; };
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
    const face = d => d.likable * .35 + (d.honest + d.diligent + d.stable) * .65 / 3;
    for (let i = 0; i < INTERVIEW.count && alive; i++) {
      const L = INTERVIEW.levels[level];
      $(".ivq").hidden = false;
      $(".ivqno").textContent = `질문 ${i + 1} / ${INTERVIEW.count}`;
      $(".ivqtext").textContent = q;
      $(".ivans").value = "";
      if (i === 0) say("면접을 시작하겠습니다.");
      await think();
      const m = await measure(base);
      const answer = $(".ivans").value.trim();
      typed += answer.length;
      const adj = {};
      if (m.early) { early++; adj.diligent = -15; events.push(`질문 ${i + 1}: 답변을 ${INTERVIEW.early}초 안에 마침 → 성실성 −15`); }
      for (const k of ["frames", "present", "away", "move", "moveN"]) all[k] += m[k];
      for (const [k, v] of Object.entries(m.ex)) all.ex[k] = (all.ex[k] || 0) + v;
      // 마지막 몇 초의 표정으로 다음 질문의 난이도를 정한다 (정서 컴퓨팅)
      const r = {}; m.last.forEach(e => Object.entries(e).forEach(([k, v]) => r[k] = (r[k] || 0) + v / m.last.length));
      const nerv = (r.fearful || 0) + (r.sad || 0), neg = (r.angry || 0) + (r.disgusted || 0);
      const awayQ = m.away / Math.max(1, m.frames);
      if (neg > .25) adj.likable = (adj.likable || 0) - 10;
      if (nerv > .25) adj.stable = (adj.stable || 0) - 5;
      let nl = level, line = "다음 질문입니다.", why = null;
      if (nerv > .25 || neg > .25) {
        nl = Math.max(1, level - 1);
        line = nerv > .25 ? "긴장하신 것 같네요. 조금 쉬운 질문으로 바꾸겠습니다." : "불편하신 점이 있으신가요? 편한 질문으로 넘어가겠습니다.";
        why = `${nerv > .25 ? exprKo(r.fearful > r.sad ? "fearful" : "sad") : "부정"} 표정 감지`;
      } else if ((r.happy || 0) > .35 && awayQ < .3) {
        nl = Math.min(3, level + 1); line = "좋습니다. 조금 더 깊이 여쭙겠습니다."; why = "웃는 표정 · 화면 응시 감지";
      } else if ((r.neutral || 0) > .8) { line = "표정이 조금 굳어 보이네요. 다음 질문입니다."; why = "무표정 감지"; }
      const last = i === INTERVIEW.count - 1;
      say("답변을 검토하고 있습니다…");
      $(".ivphase").textContent = "검토 중";
      const j = await judge({ q, answer, level, nextLevel: last ? null : nl, history });
      history.push({ q, a: answer });
      const d = dimsOf(m, adj), f = face(d), content = j.score;
      const perf = f * .6 + content * .4;
      per.push({ level, cap: L.cap, face: Math.round(f), content, perf: Math.round(perf), score: Math.round(L.cap * perf / 100) });
      events.push(`질문 ${i + 1} (${L.ko} · 배점 상한 ${L.cap}점): 「${q}」 표정 ${Math.round(f)}점 · 답변 내용 ${content}점 (${j.reason}) → ${Math.round(L.cap * perf / 100)}점`);
      if (!last) {
        if (why) events.push(`질문 ${i + 1} 뒤: ${why} → 다음 질문 ${INTERVIEW.levels[nl].ko}(배점 상한 ${INTERVIEW.levels[nl].cap}점)`);
        level = nl;
        q = j.next && !j.fallback ? j.next : bank(level);
        used.add(q);
        say(line);
        await sleep(1500);
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

  // 결과는 합격 여부와 종합 점수만 — 항목별 점수와 면접관 판단 기록은 결과 공개 때까지 보여주지 않는다
  function showResult(at) {
    const r = $(".ivresult");
    r.hidden = false;
    r.innerHTML = `<div class="ivverdict ${at.pass ? "ok" : "no"}"><b>${at.pass ? "합격" : "불합격"}</b><span>종합 ${at.total}점 · 기준 ${INTERVIEW.pass}점</span></div>
      <p class="muted small">${at.pass ? "2차 면접 대상자로 선정되었습니다." : "아쉽지만 이번 전형에서는 함께하기 어렵습니다. 세부 평가 내용은 공개하지 않습니다."}</p>`;
  }

  box.querySelector('[data-a="start"]').onclick = run;
  return {
    stop() { alive = false; mic?.stop(); stream?.getTracks().forEach(t => t.stop()); stream = null; },
  };
}
