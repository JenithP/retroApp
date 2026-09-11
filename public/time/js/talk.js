// 대화창. 대사는 await 로 한 줄씩 부른다 — 퀘스트 대본을 위에서 아래로 읽히게 쓰려고.
//   await talk.say("누", "빠른 발 누!  (가슴을 두드린다)")
//   const i = await talk.choose("우리", "뭐라고 말할까?", ["…", "…"])
// 괄호 안은 몸짓이라 흐리게 보이고, 옹알이 소리도 내지 않는다.
import { audio } from "./audio.js";

const $ = s => document.querySelector(s);

export class Talk {
  constructor() {
    this.box = $("#talk"); this.who = $("#talkwho"); this.line = $("#talkline");
    this.choicesEl = $("#talkchoices"); this.nextEl = $("#talknext");
    this.voices = {};          // 이름 → 목소리 높이
    this._click = null;
    this.box.addEventListener("click", e => { if (!e.target.closest("button")) this._click?.(); });
    addEventListener("keydown", e => {
      if (this.box.hidden) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); this._click?.(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) this._pick?.(n - 1);
    });
  }

  get open() { return !this.box.hidden; }

  /** 괄호 몸짓을 흐리게 칠해 k 글자까지만 보여 준다 */
  _render(text, k) {
    let out = "", n = 0, inG = false;
    for (const ch of text) {
      if (n >= k) break;
      if (ch === "(") { inG = true; out += "<i>("; n++; continue; }
      if (ch === ")") { inG = false; out += ")</i>"; n++; continue; }
      out += ch === "<" ? "&lt;" : ch === "\n" ? "<br>" : ch;
      n++;
    }
    if (inG) out += "</i>";
    return out;
  }

  /** 한 글자씩 찍는다. 누르면 한 번에 다 보인다. */
  _type(who, text) {
    this.box.hidden = false;
    this.who.textContent = who || "";
    this.choicesEl.innerHTML = "";
    this.nextEl.hidden = true;
    const chars = [...text], pitch = this.voices[who];
    return new Promise(res => {
      let k = 0, done = false, inG = false;
      const finish = () => {
        if (done) return; done = true; clearInterval(iv);
        this.line.innerHTML = this._render(text, chars.length); res();
      };
      this._click = finish;
      const iv = setInterval(() => {
        const ch = chars[k];
        if (ch === "(") inG = true;
        if (ch === ")") inG = false;
        k++;
        if (pitch && !inG && ch && ch.trim() && k % 2 === 0) audio.blip(pitch);
        this.line.innerHTML = this._render(text, k);
        if (k >= chars.length) finish();
      }, 34);
    });
  }

  /** 한 줄을 보여 주고, 읽은 사람이 누를 때까지 기다린다 */
  async say(who, text) {
    await this._type(who, text);
    this.nextEl.hidden = false;
    await new Promise(res => { this._click = res; });
    this._click = null;
  }

  /** 물음과 고를 것들. 고른 번호를 돌려준다. used 에 든 번호는 흐리게 둔다. */
  async choose(who, text, options, used = []) {
    await this._type(who, text);
    this._click = null;
    return new Promise(res => {
      const pick = i => { this._pick = null; this.choicesEl.innerHTML = ""; res(i); };
      this._pick = pick;
      options.forEach((t, i) => {
        const b = document.createElement("button");
        b.innerHTML = `<span class="n">${i + 1}</span>${t}`;
        if (used.includes(i)) b.classList.add("used");
        b.addEventListener("click", () => pick(i));
        this.choicesEl.appendChild(b);
      });
    });
  }

  close() { this.box.hidden = true; this._click = null; this._pick = null; }
}
