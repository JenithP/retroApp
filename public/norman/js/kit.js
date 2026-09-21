// 부품 라이브러리 — 의뢰마다 조립해 쓰는 진짜 위젯들.
//
// 전부 **처음부터 작동한다.** 칸에는 글자가 써지고, 버튼은 눌리고,
// 목록은 밀리고, 막대는 끌린다. 다만 그렇다고 알려 주지 않을 뿐이다.
// 무엇이 빠졌는지는 need 가 적어 두고, 테스트 사용자가 그걸로 불평한다.

import { ICONS, svgOf } from "./icons.js";

/* ── 부품 종류마다 무엇을 알려야 쓰이는가 ─────────────────────
   name  무엇인지 · type 쓸 수 있다는 것 · push 누를 수 있다는 것
   feed  하고 난 뒤 어찌 됐는지 · state 지금 어떤 상태인지 · move 밀거나 끌 수 있다는 것 */

const NEED = {
  input:    p => p.look === "dead" ? ["type"] : ["name", "type"],
  button:   p => p.look ? ["push"] : ["name", "push", "feed"],
  toggle:   () => ["state"],
  card:     () => ["push"],
  icon:     () => ["name", "push"],
  list:     () => ["move"],
  slider:   () => ["move", "state"],
  check:    () => ["push", "state"],
  tab:      () => ["state"],
  pin:      () => ["push"],
  thumb:    () => ["push"],
  status:   () => ["name", "state"],
  progress: () => ["state"],
  text:     () => [],
};

export const needOf = p => p.need || (NEED[p.kind] || (() => []))(p);

/** 어떤 단서가 무엇을 알려 주는가 */
const GIVES = {
  label: ["name"], guide: ["name"], unit: ["name"],
  bold: ["name", "push"], iconbtn: ["name", "push"],
  bigbtn: ["push"], press: ["push"],
  caret: ["type"], hot: ["type", "push"],
  toast: ["feed"], done: ["feed"], feel: ["feed"],
  state: ["state", "feed"], grip: ["move"],
};
export const givesOf = rid => GIVES[rid] || [];

/** 단서가 붙을 수 있는 자리인가 — 조합표의 on 과 맞춘다 */
const BUCKET = {
  input: "input",
  button: "button", card: "button", icon: "button", pin: "button",
  thumb: "button", check: "button", toggle: "button", tab: "button",
  list: "list", slider: "list", progress: "list", status: "list",
  text: "none",
};
export const bucketOf = kind => BUCKET[kind] || "none";

/* ── 그리기 ───────────────────────────────────────────────── */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** 부품 하나를 짓는다. st 는 이 화면의 상태. */
export function build(p, st) {
  const v = st.vals[p.id];
  switch (p.kind) {
    case "input": {
      const n = el("input", "box inbox" + (p.look === "dead" ? " faded" : ""));
      n.value = v == null ? (p.value || "") : v;
      n.dataset.act = "type:" + p.id;
      n.setAttribute("aria-label", p.label || "칸");
      if (p.big) n.classList.add("tall");
      return n;
    }
    case "button": {
      const n = el("button", "box btnstrip" +
        (p.look === "dead" ? " faded" : p.look === "flat" ? " asplain" : ""),
        p.look ? (p.label || "") : "");
      n.dataset.act = "press:" + p.id;
      n.setAttribute("aria-label", p.label || "버튼");
      return n;
    }
    case "toggle": {
      const on = v == null ? !!p.on : !!v;
      const n = el("button", "box toggle" + (on ? " on" : ""));
      n.dataset.act = "press:" + p.id;
      n.append(el("span", "tglname", p.label || ""), el("span", "tglknob"));
      return n;
    }
    case "card": {
      const n = el("button", "box cardbox", p.label || "");
      n.dataset.act = "press:" + p.id;
      if (p.decoy) n.classList.add("decoy");
      return n;
    }
    case "icon": {
      const n = el("button", "box iconbox");
      n.dataset.act = "press:" + p.id;
      n.setAttribute("aria-label", p.label || "그림");
      n.appendChild(svgOf(ICONS.list));
      if (p.decoy) n.classList.add("decoy");
      return n;
    }
    case "list": {
      const n = el("div", "box listrow", p.label || "");
      n.dataset.act = "swipe:" + p.id;
      if (v === "gone") n.classList.add("gone");
      return n;
    }
    case "slider": {
      const n = el("div", "box slidertrack");
      n.dataset.act = "drag:" + p.id;
      const f = el("span", "sliderfill");
      f.style.width = ((v == null ? 0 : v) * 100) + "%";
      n.appendChild(f);
      return n;
    }
    case "check": {
      const n = el("button", "box checkrow");
      n.dataset.act = "press:" + p.id;
      n.append(el("span", "cbox" + (v ? " on" : "")), el("span", "clabel", p.label || ""));
      return n;
    }
    case "tab": {
      const n = el("div", "box tabrow");
      (p.opts || ["하나", "둘"]).forEach((t, i) => {
        const b = el("button", "tabseg" + ((v == null ? 0 : v) === i ? " on" : ""), t);
        b.dataset.act = "press:" + p.id;
        n.appendChild(b);
      });
      return n;
    }
    case "pin": {
      const n = el("button", "pindot");
      n.dataset.act = "press:" + p.id;
      n.setAttribute("aria-label", p.label || "핀");
      if (p.decoy) n.classList.add("decoy");
      return n;
    }
    case "thumb": {
      const n = el("button", "box thumbbox");
      n.dataset.act = "press:" + p.id;
      n.append(el("span", "thumbplay", "▶"), el("span", "thumbname", p.label || ""));
      return n;
    }
    case "status": {
      const n = el("div", "box statusbox");
      n.dataset.act = "read:" + p.id;
      n.append(el("span", "stdot"), el("span", "stdot"), el("span", "stdot"));
      return n;
    }
    case "progress": {
      const n = el("div", "box progbox");
      n.dataset.act = "read:" + p.id;
      const f = el("span", "progfill");
      f.style.width = ((v == null ? 0.35 : v) * 100) + "%";
      n.appendChild(f);
      return n;
    }
    default:
      return el("p", "plaintext", p.text || p.label || "");
  }
}

/** 핀은 지도 위에 흩어 놓는다 — 한 줄로 세우면 지도로 안 보인다. */
export const isPin = p => p.kind === "pin";
