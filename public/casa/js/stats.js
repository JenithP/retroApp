// 현황판 통계 — 평균 · 표준편차 · 웰치 t 검정 · 분산비 F 검정 · 효과크기.
// 수업 자리에서 방향과 크기를 보려는 것이므로 양측 검정 p 만 낸다.

export const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export function sd(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// 정규화된 불완전 베타 함수 — 연분수 전개 (Numerical Recipes 6.4)
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5, s = 1.000000000190015;
  t -= (x + 0.5) * Math.log(t);
  for (const k of c) s += k / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  const EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
const tTwoSided = (t, df) => ibeta(df / 2, 0.5, df / (df + t * t));
const fUpper = (f, d1, d2) => ibeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));

// a 와 b 를 비교한다 — diff 는 a − b
export function compare(a, b) {
  const out = { na: a.length, nb: b.length, ma: mean(a), mb: mean(b), sa: sd(a), sb: sd(b) };
  out.diff = out.ma - out.mb;
  if (a.length < 2 || b.length < 2) return out;
  const va = out.sa ** 2 / a.length, vb = out.sb ** 2 / b.length;
  const se = Math.sqrt(va + vb);
  if (se > 0) {
    out.t = out.diff / se;
    out.df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
    out.p = tTwoSided(out.t, out.df);
  }
  const pooled = Math.sqrt(((a.length - 1) * out.sa ** 2 + (b.length - 1) * out.sb ** 2) / (a.length + b.length - 2));
  if (pooled > 0) out.d = out.diff / pooled;
  // 분산비 — 큰 쪽을 분자로, 양측
  if (out.sa > 0 && out.sb > 0) {
    const big = out.sa >= out.sb;
    const f = big ? out.sa ** 2 / out.sb ** 2 : out.sb ** 2 / out.sa ** 2;
    const d1 = (big ? a.length : b.length) - 1, d2 = (big ? b.length : a.length) - 1;
    out.F = f;
    out.pF = Math.min(1, 2 * fUpper(f, d1, d2));
  }
  return out;
}

export const fmtP = p => p === undefined || Number.isNaN(p) ? "—" : p < .001 ? "p < .001" : `p = ${p.toFixed(3).replace(/^0/, "")}`;
