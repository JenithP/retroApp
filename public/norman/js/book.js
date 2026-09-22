// 단서 조합표 — 무엇과 무엇을 합치면 무엇이 되는지 적힌 표.
//
// 조합을 맞히게 하지 않는다. 이 수업에서 맞혀야 할 것은
// 「어떤 단서가 필요한가」지 「어떤 조합이 있는가」가 아니다.
// 그래서 열넷을 다 펼쳐 두되, **무엇을 알리는가**로 묶어 둔다 —
// 돌려 보기가 적어 주는 「멈춘 곳」과 같은 말로 묶여 있어서
// 무엇이 모자란지 읽고 여기서 바로 찾을 수 있다.

import { RECIPES, mat } from "./parts.js";
import { givesOf, GAPNAME } from "./kit.js";

/** 돌려 보기가 쓰는 말과 똑같이 묶는다 — 이름은 kit.js 에 한 벌만 둔다 */
const GROUPS = ["name", "type", "push", "feed", "state", "move"]
  .map(k => [k, GAPNAME[k]]);

const WHEN = { idle: "처음부터 보임", touch: "손댈 때 보임", after: "조작 후 보임" };
const ON = { input: "입력칸", button: "버튼·선택 항목", list: "목록·막대" };

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
      <summary>단서 조합표 <small>재료 두 개로 만들 수 있는 단서</small></summary>
      <p class="bhead">테스트 결과에 나온 <b>사용자가 막힌 이유</b>와 같은 기준으로 묶었습니다.
        부족한 단서를 찾고, 그 줄에 적힌 재료를 상점에서 사 오세요.</p>
      ${rows}
    </details>`;
}
