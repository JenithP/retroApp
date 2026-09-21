// 연장 책 — 무엇과 무엇을 합치면 무엇이 되는지 적힌 책.
//
// 조합을 맞혀 보게 하지 않는다. 이 수업에서 맞혀야 할 것은
// 「어떤 단서가 필요한가」지 「어떤 조합이 있는가」가 아니다.
// 그래서 열넷을 다 펼쳐 두되, **무엇을 알리는가**로 묶어 둔다 —
// 돌려 보기가 적어 주는 「멈춘 곳」과 같은 말로 묶여 있어서
// 무엇이 모자란지 읽고 여기서 바로 찾을 수 있다.

import { RECIPES, mat } from "./parts.js";
import { givesOf } from "./kit.js";

/** 돌려 보기가 쓰는 말과 똑같이 묶는다 */
const GROUPS = [
  ["name",  "무엇을 하는 곳인지 알린다"],
  ["type",  "여기에 쓸 수 있다고 알린다"],
  ["push",  "눌러도 되는 곳이라고 알린다"],
  ["feed",  "하고 난 뒤에 어찌 됐는지 알린다"],
  ["state", "지금 어떤 상태인지 알린다"],
  ["move",  "밀거나 끌 수 있다고 알린다"],
];

const WHEN = { idle: "늘 보임", touch: "닿을 때", after: "하고 난 뒤" };
const ON = { input: "쓰는 칸", button: "누르는 곳", list: "목록·막대" };

export function bookHTML(open) {
  const rows = GROUPS.map(g => {
    const list = RECIPES.filter(r => givesOf(r.id).indexOf(g[0]) >= 0);
    if (!list.length) return "";
    return `<div class="bgroup">
      <p class="bwhat">${g[1]}</p>
      ${list.map(r => `<div class="brow w-${r.when}">
          <span class="bmix">${mat(r.a).name} <i>+</i> ${mat(r.b).name}</span>
          <span class="barrow">→</span>
          <span class="bname">${r.name}</span>
          <span class="bwhere">${ON[r.on[0]]}${r.on.length > 1 ? " 따위" : ""} · ${WHEN[r.when]}</span>
        </div>`).join("")}
    </div>`;
  }).join("");

  return `<details class="book"${open ? " open" : ""}>
      <summary>연장 책 <small>무엇과 무엇을 합치면 무엇이 되는지</small></summary>
      <p class="bhead">돌려 보기가 적어 준 <b>멈춘 곳</b>과 같은 말로 묶여 있습니다.
        모자란 것을 찾아 그 줄의 재료를 사 오십시오.</p>
      ${rows}
    </details>`;
}
