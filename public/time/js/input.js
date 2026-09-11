// 조작 — 노트북은 키보드와 마우스, 태블릿은 조이스틱과 손가락. 둘 다 같은 값을 낸다.
export class Input {
  constructor(canvas, stick, knob, actBtn) {
    this.keys = new Set();
    this.stickV = { x: 0, y: 0 };   // 조이스틱 — 오른쪽 +x, 앞 +y
    this.yaw = 0; this.pitch = 0.42; this.dist = 8;
    this.enabled = true;
    this._act = false;
    this.touchy = matchMedia("(pointer: coarse)").matches;

    addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === "e") this._act = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    });
    addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    addEventListener("blur", () => this.keys.clear());

    // 화면 끌기 — 둘러보기
    const drags = new Map();
    canvas.addEventListener("pointerdown", e => {
      canvas.setPointerCapture(e.pointerId);
      drags.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (e.pointerType === "touch") this.showStick(stick);
    });
    canvas.addEventListener("pointermove", e => {
      const d = drags.get(e.pointerId);
      if (!d) return;
      const k = e.pointerType === "touch" ? 0.008 : 0.0055;
      this.yaw -= (e.clientX - d.x) * k;
      this.pitch = Math.min(1.15, Math.max(0.08, this.pitch + (e.clientY - d.y) * k * 0.7));
      d.x = e.clientX; d.y = e.clientY;
    });
    const up = e => drags.delete(e.pointerId);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", e => {
      this.dist = Math.min(13, Math.max(4, this.dist + Math.sign(e.deltaY) * 0.7));
      e.preventDefault();
    }, { passive: false });

    // 조이스틱
    let sid = null, cx = 0, cy = 0;
    const R = 50;
    stick.addEventListener("pointerdown", e => {
      sid = e.pointerId; stick.setPointerCapture(sid);
      const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    });
    const move = e => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.stickV.x = dx / R; this.stickV.y = -dy / R;
    };
    stick.addEventListener("pointermove", move);
    const end = e => {
      if (e.pointerId !== sid) return;
      sid = null; knob.style.transform = ""; this.stickV.x = this.stickV.y = 0;
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);

    actBtn.addEventListener("click", () => { this._act = true; });
    if (this.touchy) this.showStick(stick);
  }

  showStick(stick) { stick.hidden = false; this.touchy = true; }

  /** 이번 프레임의 걷기 입력 — {x: 오른쪽, y: 앞}, 길이 0~1 */
  get move() {
    if (!this.enabled) return { x: 0, y: 0 };
    const k = this.keys;
    let x = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    let y = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    x += this.stickV.x; y += this.stickV.y;
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }

  /** 행동 단추가 눌렸는지 — 한 번 읽으면 지워진다 */
  takeAction() { const a = this._act; this._act = false; return a && this.enabled; }
}
