// 화면을 훑어 값을 매기는 셈.
//
// 서버(api/deal.js)와 화면이 **같은 파일**을 쓴다. 둘이 따로 세면
// 「여기서는 1200이라더니 팔 때는 900」 같은 일이 생긴다.
// 진짜 셈은 언제나 서버 쪽에서 돈 것이고, 화면은 미리 보여 줄 뿐이다.

import { needOf, givesOf } from "./kit.js";

/** 의뢰와 붙인 단서만 있으면 결과가 정해진다 — 돌려 보기와 같은 셈이다. */
export function judge(job, attached) {
  const at = attached || {};
  let missing = 0, worn = 0, astray = 0;
  const gaps = [];

  for (const p of job.parts) {
    const given = {};
    for (const x of (at[p.id] || []))
      for (const g of givesOf(x.recipe)) given[g] = true;
    const lack = needOf(p).filter(n => !given[n]);
    if (lack.length) gaps.push({ part: p.id, lack });
    missing += lack.length;
  }

  const onPath = {};
  job.steps.forEach(s => { onPath[s.part] = true; });
  const blocked = gaps.filter(g => onPath[g.part]).length;

  for (const id of Object.keys(at)) {
    const p = job.parts.find(x => x.id === id);
    for (const x of (at[id] || [])) {
      worn++;
      // 터치되지도 않는 것을 터치할 수 있게 꾸며 두면 그것이 거짓 단서다
      if (p && p.decoy && givesOf(x.recipe).indexOf("push") >= 0) astray++;
    }
  }
  return { gaps, missing, blocked, worn, astray, passed: blocked === 0 };
}

/** 화면 값. 통과하지 못한 화면은 받지 않는다.
 *
 *  값은 100에서 200 사이다. 이 폭은 일부러 좁다 — 화면 하나를 팔아 밑천이
 *  불어나면 재료를 아낄 까닭이 없어지고, 아무거나 붙여 보는 놀이가 된다.
 *  재료 값과 엇비슷하게 두어야 「무엇이 정말 필요한가」를 따지게 되고,
 *  모자라면 문제를 풀러 간다.                                            */
export function appraise(job, attached) {
  const v = judge(job, attached);
  const notes = [];
  let price = 100;                       // 팔리는 화면의 바닥값

  if (v.passed) notes.push(["good", "사용자가 과제를 처음부터 끝까지 해냈습니다."]);
  else notes.push(["bad", `아직 ${v.blocked}군데에서 사용자가 막힙니다.`]);

  if (v.missing === 0) {
    price += 60;
    notes.push(["good", "화면 전체에 필요한 단서가 잘 붙어 있습니다."]);
  } else {
    notes.push(["warn", `과제 진행에 바로 걸리지 않는 곳까지 보면 ${v.missing}가지 단서가 더 필요합니다.`]);
  }

  if (v.astray) {
    price -= v.astray * 30;
    notes.push(["bad", `터치되지 않는 곳을 터치할 수 있게 보이도록 꾸몄습니다 — 거짓 단서 ${v.astray}개입니다.`]);
  }
  if (v.worn > 12) {
    price -= (v.worn - 12) * 10;
    notes.push(["warn", `단서가 ${v.worn}개라 조금 복잡합니다. 꼭 필요한 것만 남겨 보세요.`]);
  } else if (v.passed && v.worn <= 6) {
    price += 40;
    notes.push(["good", `${v.worn}개의 단서로 해결했습니다. 군더더기가 적습니다.`]);
  }

  price = Math.max(100, Math.min(200, Math.round(price / 10) * 10));
  return { price, notes, passed: v.passed, blocked: v.blocked, worn: v.worn,
           missing: v.missing, astray: v.astray };
}
