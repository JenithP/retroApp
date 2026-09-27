// 하센잘 2×2 — 가로 실용적 품질, 세로 쾌락적 품질 (1~7, 가운데 4). 학생 피드백과 현황판이 함께 쓴다.
export function quad(points, pq, hq, labels = []) {
  const P = v => 10 + (v - 1) / 6 * 180;
  const dots = points.filter(p => p[0] && p[1]).map(([x, y], i) =>
    `<circle cx="${P(x)}" cy="${200 - P(y)}" r="4" class="pt"/>${labels[i] ? `<text x="${P(x) + 6}" y="${200 - P(y) + 3}" class="plabel">${labels[i]}</text>` : ""}`).join("");
  const mean = pq && hq ? `<circle cx="${P(pq)}" cy="${200 - P(hq)}" r="8" class="mean"/>` : "";
  return `<svg viewBox="0 0 200 200" class="quadsvg" role="img" aria-label="실용적 품질과 쾌락적 품질">
    <rect x="10" y="10" width="90" height="90" class="q self"/><rect x="100" y="10" width="90" height="90" class="q desired"/>
    <rect x="10" y="100" width="90" height="90" class="q super"/><rect x="100" y="100" width="90" height="90" class="q act"/>
    <text x="55" y="22" class="ql">자기표현 중심</text><text x="55" y="32" class="ql en">SELF</text>
    <text x="145" y="22" class="ql">두 품질 모두 높음</text><text x="145" y="32" class="ql en">desired</text>
    <text x="55" y="176" class="ql">두 품질 모두 낮음</text><text x="55" y="186" class="ql en">unwanted</text>
    <text x="145" y="176" class="ql">과업 수행 중심</text><text x="145" y="186" class="ql en">ACT</text>
    ${dots}${mean}</svg><p class="axes">→ 실용적 품질 pragmatic · ↑ 쾌락적 품질 hedonic${pq ? ` · 평균 ${pq.toFixed(1)} / ${hq.toFixed(1)}` : ""}</p>`;
}

export const avg = a => { const v = a.filter(x => typeof x === "number"); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
