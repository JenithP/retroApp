// 챗봇의 두 두뇌 — 규칙 기반과 학습 기반. 화면과 무관한 순수 함수만 둔다.
//   규칙 기반: 사람이 적은 키워드가 입력에 들어 있는지 본다.
//   학습 기반: 예시 문장의 글자 조각으로 소프트맥스 분류기를 학습하고, 준비된 기능 중 하나를 고른다. 답을 만들어 내지는 않는다.

export const THRESHOLD = 0.5;   // 학습 기반 확신도가 이보다 낮으면 「모르겠다」고 답한다

export const normalize = s => String(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

export const splitKeywords = s => String(s || "").split(/[,\n]/).map(k => normalize(k)).filter(Boolean);
export const splitExamples = s => String(s || "").split("\n").map(k => k.trim()).filter(k => normalize(k));

/* ── 규칙 기반 ─────────────────────────────────────────── */
// 가장 긴 키워드가 맞은 기능을 고르고, 길이가 같으면 먼저 적힌 기능을 고른다.
export function ruleMatch(rules, ids, text) {
  const t = normalize(text);
  let best = null;
  for (const id of ids) {
    for (const k of splitKeywords(rules[id])) {
      if (t.includes(k) && (!best || k.length > best.keyword.length)) best = { id, keyword: k };
    }
  }
  return best || { id: null, keyword: null };
}

/* ── 학습 기반 ─────────────────────────────────────────── */
function grams(text) {
  const t = normalize(text), out = [];
  for (const n of [2, 3]) for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n));
  if (t.length === 1) out.push(t);
  return out;
}

function vectorize(text, vocab) {
  const counts = new Map();
  for (const g of grams(text)) if (vocab.has(g)) counts.set(vocab.get(g), (counts.get(vocab.get(g)) || 0) + 1);
  const norm = Math.sqrt([...counts.values()].reduce((s, v) => s + v * v, 0)) || 1;
  return [...counts].map(([i, v]) => [i, v / norm]);
}

function softmax(scores) {
  const m = Math.max(...scores), e = scores.map(s => Math.exp(s - m)), sum = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / sum);
}

// examples: { 기능id: [문장, …] }
export function train(examples, ids, { epochs = 300, rate = 1.5, decay = 0.002 } = {}) {
  const vocab = new Map();
  for (const id of ids) for (const s of examples[id] || []) for (const g of grams(s)) if (!vocab.has(g)) vocab.set(g, vocab.size);
  const data = [];
  ids.forEach((id, y) => { for (const s of examples[id] || []) data.push({ x: vectorize(s, vocab), y }); });
  const w = ids.map(() => new Float64Array(vocab.size));
  for (let e = 0; e < epochs; e++) {
    const grad = ids.map(() => new Float64Array(vocab.size));
    for (const { x, y } of data) {
      const p = softmax(w.map(wc => x.reduce((s, [i, v]) => s + wc[i] * v, 0)));
      p.forEach((pc, c) => { const err = pc - (c === y ? 1 : 0); for (const [i, v] of x) grad[c][i] += err * v; });
    }
    const n = data.length || 1;
    w.forEach((wc, c) => { for (let i = 0; i < wc.length; i++) wc[i] -= rate * (grad[c][i] / n + decay * wc[i]); });
  }
  const model = { ids, vocab, w, size: data.length };
  model.accuracy = data.length ? data.filter(({ x, y }) => scoreIndex(model, x) === y).length / data.length : 0;
  return model;
}

function scoreIndex(model, x) {
  const p = softmax(model.w.map(wc => x.reduce((s, [i, v]) => s + wc[i] * v, 0)));
  return p.indexOf(Math.max(...p));
}

export function classify(model, text) {
  const x = vectorize(text, model.vocab);
  const p = softmax(model.w.map(wc => x.reduce((s, [i, v]) => s + wc[i] * v, 0)));
  const top = p.indexOf(Math.max(...p));
  const conf = p[top];
  const names = [...model.vocab.keys()];
  const evidence = x.map(([i, v]) => ({ g: names[i], s: model.w[top][i] * v }))
    .filter(e => e.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(e => e.g);
  return { id: conf >= THRESHOLD ? model.ids[top] : null, guess: model.ids[top], conf, evidence };
}
