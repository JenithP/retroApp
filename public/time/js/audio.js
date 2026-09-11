// 소리 — 녹음 파일 없이 모두 합성한다.
// 누의 말은 동물의 숲처럼 글자마다 짧게 튀는 옹알이로. 낱말은 못 알아들어도 기분은 전해진다.
export const audio = {
  ctx: null, out: null, muted: false, fireGain: null,

  /** 첫 클릭 때 부른다 — 브라우저는 사용자가 한 번 눌러야 소리를 허락한다 */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.8;
    this.out.connect(this.ctx.destination);
  },

  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.8; },

  /** 옹알이 한 톨. base 는 목소리의 높낮이 (아이 520, 노인 190) */
  blip(base = 440, kind = "triangle") {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = kind;
    const fr = base * (0.82 + Math.random() * 0.42);
    o.frequency.setValueAtTime(fr, t);
    o.frequency.exponentialRampToValueAtTime(fr * (0.9 + Math.random() * 0.25), t + 0.07);
    f.type = "bandpass"; f.frequency.value = base * 2.2; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    o.connect(f).connect(g).connect(this.out);
    o.start(t); o.stop(t + 0.09);
  },

  /** 알아들었을 때 — 짧은 두 음 */
  chime() {
    const c = this.ctx; if (!c) return;
    [660, 990].forEach((fr, i) => {
      const t = c.currentTime + i * 0.12;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.55);
    });
  },

  /** 못 알아들었을 때 — 낮게 한 번 */
  huh() {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(250, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.35);
  },

  /** 나무 비비는 소리 — 세기(0~1)에 따라 */
  rub(level) {
    const c = this.ctx; if (!c || this.muted) return;
    const t = c.currentTime, n = Math.floor(c.sampleRate * 0.06);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = 700 + level * 900; f.Q.value = 2;
    g.gain.value = 0.05 + level * 0.12;
    s.connect(f).connect(g).connect(this.out); s.start(t);
  },

  /** 모닥불 — 켜 두면 계속 탁탁거린다 */
  fire(on) {
    const c = this.ctx; if (!c) return;
    if (on && !this.fireGain) {
      const n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;      // 낮게 웅웅거리는 바탕
        d[i] = last * 3 + (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0);  // 탁 튀는 소리
      }
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400;
      this.fireGain = c.createGain(); this.fireGain.gain.value = 0;
      s.connect(f).connect(this.fireGain).connect(this.out); s.start();
      this.fireGain.gain.setTargetAtTime(0.5, c.currentTime, 0.8);
    } else if (!on && this.fireGain) {
      this.fireGain.gain.setTargetAtTime(0, c.currentTime, 0.4);
    }
  },

  /** 활자가 빛날 때 — 반짝이며 올라가는 소리 */
  shimmer() {
    const c = this.ctx; if (!c) return;
    [523, 659, 784, 1047, 1319].forEach((fr, i) => {
      const t = c.currentTime + i * 0.09;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + 1.3);
    });
  },
};
