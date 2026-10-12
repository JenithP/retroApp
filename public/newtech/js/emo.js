// 정서 컴퓨팅 체험 — 카메라 영상에서 얼굴을 찾고 일곱 가지 표정 점수를 낸다.
// 영상은 이 기기 브라우저 안에서만 처리하고, 어디에도 보내거나 저장하지 않는다. 기록하는 것은 「맞음 / 다름」 횟수뿐이다.
import { EXPR, exprKo } from "./data.js";

const FACEAPI = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js";
const MODELS = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/";
let faceapi = null, loading = null;

async function load() {
  if (faceapi) return faceapi;
  loading ||= (async () => {
    const m = await import(FACEAPI);
    const api = m.default || m;
    await api.tf?.ready?.();
    await api.nets.tinyFaceDetector.loadFromUri(MODELS);
    await api.nets.faceExpressionNet.loadFromUri(MODELS);
    faceapi = api;
    return api;
  })();
  return loading;
}

/** 판정 한 번. 그래픽(WebGL) 가속이 멈추는 기기가 있어, 8초 안에 답이 없으면 CPU 로 바꿔 다시 한다 */
let cpu = false;
async function detect(input, size) {
  const run = () => faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: .4 })).withFaceExpressions();
  if (cpu) return run();
  const r = await Promise.race([run().then(d => ({ d })), new Promise(res => setTimeout(() => res(null), 8000))]);
  if (r) return r.d;
  cpu = true;
  await faceapi.tf.setBackend("cpu");
  await faceapi.tf.ready();
  return run();
}

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** box 안에 체험 화면을 그린다. onFeedback(match, judged) — 「맞음 / 다름」 누를 때 */
export function mountEmo(box, { onFeedback }) {
  box.innerHTML = `
    <div class="emo">
      <div class="emocam">
        <div class="camwrap"><video playsinline muted></video><canvas></canvas>
          <div class="camcover"><button class="btn primary big" data-a="start" type="button">카메라 켜기</button>
            <label class="btn ghost">사진으로 하기<input type="file" accept="image/*" hidden></label>
            <p class="muted small">영상은 이 기기 안에서만 처리 · 저장 · 전송 없음</p></div>
        </div>
        <p class="emomsg muted small"></p>
      </div>
      <div class="emoside">
        <h3>판정 <b class="judged">—</b></h3>
        <div class="bars">${EXPR.map(e => `<div class="ebar" data-e="${e.id}"><span>${e.ko}</span><i><u></u></i><em>0</em></div>`).join("")}</div>
        <div class="feedback">
          <p>지금 실제 기분과 판정이</p>
          <button class="btn" data-a="match" type="button" disabled>맞음</button>
          <button class="btn" data-a="mismatch" type="button" disabled>다름</button>
          <span class="fbcount muted small"></span>
        </div>
        <div class="bot"><b>비서</b><p class="reply">${esc(EXPR[0].reply)}</p></div>
      </div>
    </div>`;
  const $ = s => box.querySelector(s);
  const video = $("video"), canvas = $("canvas"), msg = $(".emomsg");
  let stream = null, timer = null, judged = null, alive = true, counts = { match: 0, mismatch: 0 };

  function paint(det, w, h) {
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, w, h);
    if (!det) {
      judged = null;
      $(".judged").textContent = "얼굴 없음";
      box.querySelectorAll(".ebar").forEach(b => { b.querySelector("u").style.width = "0%"; b.querySelector("em").textContent = "0"; b.classList.remove("top"); });
      box.querySelectorAll(".feedback button").forEach(b => b.disabled = true);
      return;
    }
    const { x, y, width, height } = det.detection.box;
    g.strokeStyle = "#1F6F63"; g.lineWidth = Math.max(2, w / 200);
    g.strokeRect(x, y, width, height);
    const ex = det.expressions;
    const top = Object.keys(ex).sort((a, b) => ex[b] - ex[a])[0];
    judged = top;
    g.fillStyle = "#1F6F63"; g.font = `bold ${Math.max(14, w / 28)}px sans-serif`;
    g.fillText(`${exprKo(top)} ${Math.round(ex[top] * 100)}`, x, Math.max(18, y - 6));
    $(".judged").textContent = exprKo(top);
    box.querySelectorAll(".ebar").forEach(b => {
      const v = ex[b.dataset.e] || 0;
      b.querySelector("u").style.width = (v * 100).toFixed(0) + "%";
      b.querySelector("em").textContent = Math.round(v * 100);
      b.classList.toggle("top", b.dataset.e === top);
    });
    $(".reply").textContent = EXPR.find(e => e.id === top)?.reply || "";
    box.querySelectorAll(".feedback button").forEach(b => b.disabled = false);
  }

  async function loop() {
    if (!alive || !stream) return;
    try {
      const det = await detect(video, cpu ? 160 : 256);
      paint(det, video.videoWidth, video.videoHeight);
    } catch (e) { console.error(e); }
    timer = setTimeout(loop, 250);
  }

  async function start() {
    msg.textContent = "표정 인식 모델 불러오는 중…";
    try {
      const [api, s] = await Promise.all([load(), navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false })]);
      if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; video.srcObject = s; await video.play();
      $(".camcover").hidden = true;
      msg.textContent = "";
      loop();
    } catch (e) {
      console.error(e);
      msg.textContent = e.name === "NotAllowedError" ? "카메라 권한 거부됨 — 주소창의 카메라 권한 허용 또는 「사진으로 하기」 사용"
        : "카메라 또는 모델을 불러오지 못함 — 「사진으로 하기」 사용 또는 새로고침";
    }
  }
  async function fromImage(file) {
    msg.textContent = "표정 인식 모델 불러오는 중…";
    try {
      await load();
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = URL.createObjectURL(file); });
      // 큰 사진은 줄여서 판정한다 — 휴대폰 사진(4000px)을 그대로 넣으면 기기가 멈출 수 있다
      const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
      const small = document.createElement("canvas");
      small.width = Math.round(img.naturalWidth * k); small.height = Math.round(img.naturalHeight * k);
      small.getContext("2d").drawImage(img, 0, 0, small.width, small.height);
      msg.textContent = "판정 중…";
      const det0 = await detect(small, 416);
      const det = det0 && faceapi.resizeResults(det0, { width: img.naturalWidth, height: img.naturalHeight });
      const wrap = $(".camwrap");
      wrap.style.backgroundImage = `url(${img.src})`;
      wrap.classList.add("still");
      $(".camcover").hidden = true;
      paint(det, img.naturalWidth, img.naturalHeight);
      msg.textContent = det ? "사진 판정 완료 — 다른 사진은 새로고침 후 선택" : "사진에서 얼굴을 찾지 못함";
    } catch (e) { console.error(e); msg.textContent = "사진을 처리하지 못함"; }
  }

  box.querySelector('[data-a="start"]').onclick = start;
  box.querySelector('input[type="file"]').onchange = e => e.target.files[0] && fromImage(e.target.files[0]);
  box.querySelectorAll(".feedback button").forEach(b => b.onclick = () => {
    if (!judged) return;
    const match = b.dataset.a === "match";
    counts[match ? "match" : "mismatch"]++;
    $(".fbcount").textContent = `맞음 ${counts.match} · 다름 ${counts.mismatch}`;
    onFeedback?.(match, judged);
  });

  return {
    stop() {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
    },
  };
}
