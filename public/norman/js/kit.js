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
  label: ["name"], guide: ["name", "push"], unit: ["name"],
  cardedge: ["push"], chevron: ["push"],
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


/* ── 목록 한 줄 ───────────────────────────────────────────────
   가게 줄과 편지 줄과 파일 줄은 다르게 생겼다. 전부 같은 회색 띠로 그리면
   무슨 목록인지 알 수 없다. 다만 **밀 수 있다는 것은 알리지 않는다.** */

function rowOf(p, v) {
  const n = el("div", "box listrow v-" + (p.visual || "plain"));
  n.dataset.act = "swipe:" + p.id;
  if (v === "gone") n.classList.add("gone");

  switch (p.visual) {
    case "store":                         // 배달 가게 — 사진·이름·걸리는 시간
      n.append(el("span", "rshot"),
               wrapText(p.label, p.sub));
      return n;
    case "mail":                          // 편지 — 보낸 이·제목·시각
      n.append(el("span", "rdot"),
               wrapText(p.label, p.sub),
               el("span", "rat", p.at || ""));
      return n;
    case "file":                          // 파일 — 아이콘·이름·크기
      n.append(el("span", "rfile"),
               el("span", "rname", p.label || ""),
               el("span", "rsize", p.sub || ""));
      return n;
    default:
      n.textContent = p.label || "";
      return n;
  }
}

function wrapText(name, sub) {
  const t = el("span", "rtext");
  t.append(el("span", "rname", name || ""), el("span", "rsub", sub || ""));
  return t;
}

/* ── 카드 ─────────────────────────────────────────────────────
   카드는 의뢰마다 다르게 생겨야 한다. 쇼핑은 상품 카드, 숙박은 객실 카드,
   SNS 는 게시물 카드… 전부 같은 회색 네모로 그리면 「회색 버튼 퍼즐」이 된다.

   그러면서도 **누를 수 있다는 것은 알리지 않는다.** 사진도 이름도 값도 다
   보이는데, 이 덩어리 전체가 하나의 누를 거리인지 사진만 눌리는지는 알 수 없다.
   문제는 「조작할 것이 없음」이 아니라 「있는데 그 사실이 애매함」이다. */

function cardOf(p) {
  const n = el("button", "box cardbox v-" + (p.visual || "plain"));
  n.dataset.act = "press:" + p.id;
  if (p.decoy) n.classList.add("decoy");

  switch (p.visual) {
    case "product": {                       // 사진 · 상품명 · 값
      n.append(
        el("span", "cshot"),
        (function () {
          const t = el("span", "ctext");
          t.append(el("span", "cname", p.label || ""),
                   el("span", "csub", p.sub || ""),
                   el("span", "cprice", p.price || ""));
          return t;
        })());
      return n;
    }
    case "hotel": {                         // 사진 · 이름 · 별점 · 1박 값
      n.append(
        el("span", "cshot wide"),
        (function () {
          const t = el("span", "ctext");
          t.append(el("span", "cname", p.label || ""),
                   el("span", "cstar", p.sub || ""),
                   el("span", "cprice", p.price || ""));
          return t;
        })());
      return n;
    }
    case "post": {                          // 게시물 — 사진 위, 글 아래
      n.classList.add("col");
      n.append(el("span", "cshot tall"),
               el("span", "cname", p.label || ""),
               el("span", "cby", p.sub || ""));
      return n;
    }
    case "event": {                         // 캘린더 일정 블록
      n.append(el("span", "cwhen", p.at || ""),
               el("span", "cname", p.label || ""));
      return n;
    }
    case "file": {                          // 파일 한 줄
      n.append(el("span", "cfile"),
               el("span", "cname", p.label || ""),
               el("span", "csize", p.sub || ""));
      return n;
    }
    case "article": {                       // 기사 — 제목과 요약
      n.classList.add("col");
      n.append(el("span", "cname", p.label || ""),
               el("span", "csub", p.sub || ""));
      return n;
    }
    case "chart": {                         // 막대 그래프
      const bars = el("span", "cbars");
      (p.bars || [40, 62, 88, 55, 70, 34, 48]).forEach(function (h) {
        const b = el("i");
        b.style.height = h + "%";
        bars.appendChild(b);
      });
      n.classList.add("col");
      n.append(el("span", "cname", p.label || ""), bars);
      return n;
    }
    case "page": {                          // 전자책 본문
      n.classList.add("col", "paper");
      (p.lines || ["", "", "", "", ""]).forEach(function () {
        n.appendChild(el("span", "cline"));
      });
      return n;
    }
    case "frame": {                         // 카메라 미리보기 따위
      n.classList.add("col", "viewer");
      n.appendChild(el("span", "cshot tall"));
      return n;
    }
    default:
      n.textContent = p.label || "";
      return n;
  }
}

/** 부품 하나를 짓는다. st 는 이 화면의 상태. */
export function build(p, st) {
  const v = st.vals[p.id];
  switch (p.kind) {
    case "input": {
      // 칸도 의뢰마다 다르게 생겼다. 금액 칸은 크고 오른쪽으로 붙고,
      // 메모 본문은 넓고, 대화 입력은 낮고 둥글다.
      // 다만 **여기에 쓸 수 있다는 것은 어느 모습도 알리지 않는다** —
      // 커서가 보이지 않고 테두리도 없다.
      const n = el("input", "box inbox v-" + (p.visual || "plain") +
        (p.look === "dead" ? " faded" : ""));
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
    case "card": return cardOf(p);
    case "icon": {
      const n = el("button", "box iconbox");
      n.dataset.act = "press:" + p.id;
      n.setAttribute("aria-label", p.label || "그림");
      n.appendChild(svgOf(ICONS[p.icon] || ICONS.list));
      n.appendChild(el("span", "ibadge", String(st.hits[p.counts] || 0)));
      if (p.decoy) n.classList.add("decoy");
      return n;
    }
    case "list": return rowOf(p, v);
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
