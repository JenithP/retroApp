// 아바타 — SVG 한 장. 단서 하나를 받으면 상태(표정 · 시선 · 몸 자세)를 바꾸거나 한 번 움직인다.
import { cueById } from "./game.js";

const SKIN = "#F2C9A5";

function svg(look) {
  const { shirt, hair, glasses } = look;
  return `
<svg viewBox="0 0 200 230" class="av-svg" role="img" aria-hidden="true">
  <ellipse cx="100" cy="222" rx="58" ry="7" fill="rgba(0,0,0,.08)" class="av-shadow"/>
  <g class="av-all">
    <g class="av-lean">
      <g class="av-arm av-armL"><rect x="40" y="118" width="22" height="70" rx="11" fill="${shirt}"/><circle cx="51" cy="190" r="10" fill="${SKIN}"/></g>
      <g class="av-arm av-armR"><rect x="138" y="118" width="22" height="70" rx="11" fill="${shirt}"/><circle cx="149" cy="190" r="10" fill="${SKIN}"/></g>
      <path d="M52 132 Q52 112 74 108 L126 108 Q148 112 148 132 L150 214 L50 214 Z" fill="${shirt}"/>
      <path d="M86 108 L100 124 L114 108" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="3" stroke-linecap="round"/>
      <rect x="90" y="94" width="20" height="18" rx="6" fill="${SKIN}"/>
      <g class="av-head">
        <circle cx="100" cy="62" r="38" fill="${SKIN}"/>
        ${hair}
        <g class="av-brows">
          <path class="br-n" d="M79 50 L91 50 M109 50 L121 50" stroke="#3B2F2A" stroke-width="3" stroke-linecap="round"/>
          <path class="br-f" d="M79 47 L92 52 M108 52 L121 47" stroke="#3B2F2A" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g class="av-eyes">
          <ellipse cx="86" cy="62" rx="6.5" ry="7.5" fill="#fff"/><ellipse cx="114" cy="62" rx="6.5" ry="7.5" fill="#fff"/>
          <g class="av-pupils"><circle cx="86" cy="63" r="3.8" fill="#2A211D"/><circle cx="114" cy="63" r="3.8" fill="#2A211D"/></g>
        </g>
        ${glasses ? `<g fill="none" stroke="#2A211D" stroke-width="2.2"><circle cx="86" cy="62" r="11"/><circle cx="114" cy="62" r="11"/><path d="M97 62 L103 62"/></g>` : ""}
        <g class="av-mouth">
          <path class="m-n" d="M90 82 L110 82" stroke="#7A3B32" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path class="m-s" d="M86 78 Q100 94 114 78 Z" fill="#7A3B32"/>
          <path class="m-f" d="M88 87 Q100 77 112 87" stroke="#7A3B32" stroke-width="3" stroke-linecap="round" fill="none"/>
        </g>
        <g class="av-cheeks"><circle cx="76" cy="76" r="5" fill="#F09A8A" opacity=".5"/><circle cx="124" cy="76" r="5" fill="#F09A8A" opacity=".5"/></g>
      </g>
    </g>
  </g>
</svg>`;
}

export const LOOKS = {
  me: {
    shirt: "#2F6FB5",
    hair: `<path d="M62 62 Q60 22 100 22 Q140 22 138 62 L138 74 Q132 52 120 42 Q100 50 74 44 Q66 54 62 74 Z" fill="#3B2F2A"/>`,
    glasses: false,
  },
  partner: {
    shirt: "#4E8A3E",
    hair: `<path d="M64 56 Q62 24 100 24 Q138 24 136 56 Q126 38 100 38 Q74 38 64 56 Z" fill="#4A3A30"/>`,
    glasses: true,
  },
};

const MOVES = { nod: 1200, shake: 1200, look: 1700, wave: 1600, clap: 1400, heart: 2000, promise: 2000, jump: 1100 };

export function makeAvatar(el, look) {
  el.classList.add("av");
  el.innerHTML = svg(look);
  const st = { face: "neutral", gaze: "gaze_on", body: "stand" };
  const paint = () => {
    el.dataset.face = st.face;
    el.dataset.gaze = st.gaze === "gaze_off" ? "off" : "on";
    el.dataset.body = st.body;
  };
  paint();
  const timers = {};
  return {
    apply(cueId) {
      const c = cueById[cueId];
      if (!c) return;
      if (c.keep === "face") st.face = cueId;
      else if (c.keep === "gaze") st.gaze = cueId;
      else if (c.keep === "body") st.body = cueId;
      if (c.keep) return paint();
      // 같은 움직임을 다시 누르면 처음부터
      const cls = "do-" + cueId;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      clearTimeout(timers[cls]);
      timers[cls] = setTimeout(() => el.classList.remove(cls), MOVES[cueId] || 1200);
    },
    reset() { Object.assign(st, { face: "neutral", gaze: "gaze_on", body: "stand" }); paint(); },
  };
}
