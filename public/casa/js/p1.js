// 1부 튜터링 화면 — Nass, Steuer & Tauber (1994) Study 1 재현.
//
// 원 절차대로 마우스로 화면 단추만 누른다(번호 입력 한 번만 예외).
// 화면마다 무엇을 내보내는지 짧게 적고(「Fact #7」, 「Evaluation 3」), REPEAT 는 같은 내용을 다시 내보내며,
// CONTINUE 는 내용을 다 받고 답했으면 넘어간다.
//
// 진행 중 새로고침해도 이어서 할 수 있게 이 탭(sessionStorage)에 위치와 답을 둔다.
// 번호는 처음 입력할 때 서버에 잡아 두므로, 같은 번호로 처음부터 다시 시작할 수는 없다.
import * as D from "./data.js";
import { ready, claimNumber, saveSession, watchState, isDemoMode } from "./fb.js";

const $body = document.getElementById("body");
const $title = document.getElementById("title");
const $win = document.getElementById("win");
const KEY = "hci9_p1" + (isDemoMode ? "_demo" : "");
const TYPE_MS = 22;

// 창을 노트북 화면에 맞춘다 — 독(64px)과 메뉴를 가리지 않는 만큼만
const fit = () => $win.style.setProperty("--s", Math.min(1.25, (innerWidth - 160) / 760, (innerHeight - 40) / 540).toFixed(3));
addEventListener("resize", fit); fit();

if (isDemoMode) {
  const b = document.createElement("div");
  b.className = "demo";
  b.textContent = "미리보기 — 기록이 남지 않습니다 (3번은 이미 쓰인 번호로 처리)";
  document.body.appendChild(b);
}

let S = load() || { n: null, cond: null, step: 0, know: [], test: [], survey: {}, saved: false };
function load() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } }
function keep() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 못 해도 진행은 된다 */ } }

// 단계 목록 — 조건이 정해진 뒤에 뒷부분이 갈린다
function steps() {
  const out = [{ kind: "setup" }, { kind: "intro" }, { kind: "practice" }];
  D.FACTS.forEach((_, i) => out.push({ kind: "fact", i }));
  out.push({ kind: "testIntro" });
  D.TEST.forEach((_, i) => out.push({ kind: "test", i }));
  out.push({ kind: "evalIntro" });
  D.TEST.forEach((_, i) => out.push({ kind: "eval", i }));
  if (S.cond === "screen") D.SURVEY.forEach((_, i) => out.push({ kind: "survey", i }));
  out.push({ kind: "save" }, { kind: "end" });
  return out;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// 출력 칸에 글자를 차례로 내보낸다. 다 내보내면 done() 을 부른다.
let typing = 0;
function type(el, paras, done) {
  clearInterval(typing);
  const text = paras.join("\n");
  let k = 0;
  const draw = () => {
    const shown = text.slice(0, k).split("\n").map(p => `<p>${esc(p)}</p>`).join("");
    el.innerHTML = shown.replace(/<\/p>$/, k < text.length ? '<span class="caret"></span></p>' : "</p>");
  };
  draw();
  typing = setInterval(() => {
    k += 1;
    if (k >= text.length) { k = text.length; clearInterval(typing); draw(); done && done(); return; }
    draw();
  }, TYPE_MS);
}

// 화면 하나: 제목줄, 설명 칸, 출력 칸, 응답 칸, REPEAT · CONTINUE
function screen({ title, label, paras, resp, canGo, onGo }) {
  $title.textContent = title;
  $body.innerHTML = `
    <div class="label">${esc(label)}</div>
    <div class="out" id="out" aria-live="polite"></div>
    <div class="resp" id="resp"></div>
    <div class="foot">
      <button class="btn" id="rep" type="button">REPEAT</button>
      <button class="btn go" id="go" type="button" disabled>CONTINUE</button>
    </div>`;
  const out = $body.querySelector("#out"), go = $body.querySelector("#go"), rep = $body.querySelector("#rep");
  let shown = false;
  const update = () => { go.disabled = !(shown && (!canGo || canGo())); };
  const play = () => { shown = false; update(); type(out, paras, () => { shown = true; update(); }); };
  if (resp) resp($body.querySelector("#resp"), update);
  rep.onclick = play;
  go.onclick = () => { if (!go.disabled) onGo(); };
  play();
}

// 숫자 단추 줄 (1–10)
function matrix(host, { q, lo, hi, value, onPick }) {
  host.innerHTML = `${q ? `<div class="q">${esc(q)}</div>` : ""}
    <div class="matrix" role="radiogroup">${Array.from({ length: 10 }, (_, i) =>
      `<button class="btn${value === i + 1 ? " sel" : ""}" type="button" role="radio" aria-checked="${value === i + 1}" data-v="${i + 1}">${i + 1}</button>`).join("")}</div>
    <div class="ends"><span>1 ${esc(lo)}</span><span>${esc(hi)} 10</span></div>`;
  host.querySelectorAll("[data-v]").forEach(b => b.onclick = () => {
    host.querySelectorAll("[data-v]").forEach(x => { x.classList.toggle("sel", x === b); x.setAttribute("aria-checked", x === b); });
    onPick(Number(b.dataset.v));
  });
}

function next() { S.step += 1; keep(); render(); }

function render() {
  const all = steps();
  const st = all[Math.min(S.step, all.length - 1)];
  ({ setup, intro, practice, fact, testIntro, test, evalIntro, eval: evaluation, survey, save, end })[st.kind](st);
}

function setup() {
  $title.textContent = "Session Setup";
  $body.innerHTML = `
    <div class="label">Session Number</div>
    <div class="out" style="font-size:18px">
      <p>책상 위 프린트물 표지에 적힌 번호를 입력하십시오.</p>
      <p>프린트물은 화면이 안내할 때까지 넘기지 마십시오.</p>
      <p style="margin-top:22px"><input class="field" id="num" inputmode="numeric" autocomplete="off" maxlength="3" aria-label="번호"></p>
      <div class="err" id="err" role="alert"></div>
    </div>
    <div class="foot"><button class="btn go" id="go" type="button">CONTINUE</button></div>`;
  const num = $body.querySelector("#num"), err = $body.querySelector("#err"), go = $body.querySelector("#go");
  num.focus();
  const submit = async () => {
    const n = Number(num.value.trim());
    if (!Number.isInteger(n) || n < 1 || n > D.NUMBER_MAX) { err.textContent = `1부터 ${D.NUMBER_MAX} 사이의 번호를 입력하십시오.`; return; }
    go.disabled = true; err.textContent = "확인 중…";
    try {
      await ready();
      await claimNumber(n);
      S = { n, cond: D.condOf(n), step: 1, know: [], test: [], survey: {}, saved: false };
      keep(); render();
    } catch (e) {
      go.disabled = false;
      err.textContent = e.code === "permission-denied"
        ? "이미 사용된 번호입니다. 번호를 다시 확인하고, 맞다면 조교에게 알려 주십시오."
        : "연결에 실패했습니다. 잠시 후 다시 눌러 주십시오.";
    }
  };
  go.onclick = submit;
  num.onkeydown = e => { if (e.key === "Enter") submit(); };
}

function intro() {
  screen({ title: "Tutoring Session", label: "Instructions", paras: D.INSTRUCTIONS, onGo: next });
}

function practice() {
  let v = null;
  screen({
    title: "Tutoring Session", label: "Practice",
    paras: ["단추 사용 연습입니다.", "아래 숫자 단추 가운데 하나를 누른 뒤 CONTINUE를 누르십시오. REPEAT를 누르면 같은 내용을 다시 내보냅니다."],
    resp: (h, upd) => matrix(h, { lo: "낮음", hi: "높음", value: v, onPick: x => { v = x; upd(); } }),
    canGo: () => v !== null, onGo: next,
  });
}

function fact({ i }) {
  let v = S.know[i] ?? null;
  screen({
    title: "Tutoring Session", label: `Fact #${i + 1}`, paras: [D.FACTS[i]],
    resp: (h, upd) => matrix(h, { q: D.KNOW_SCALE.q, lo: D.KNOW_SCALE.lo, hi: D.KNOW_SCALE.hi, value: v, onPick: x => { v = x; upd(); } }),
    canGo: () => v !== null,
    onGo: () => { S.know[i] = v; next(); },
  });
}

function testIntro() {
  screen({ title: "Testing Session", label: "Instructions", paras: [D.TEST_INTRO], onGo: next });
}

function test({ i }) {
  let v = S.test[i] ?? null;
  const t = D.TEST[i];
  screen({
    title: "Testing Session", label: `Question ${i + 1}`, paras: [t.q],
    resp: (h, upd) => {
      h.innerHTML = `<div class="opts" role="radiogroup">${t.options.map((o, k) =>
        `<button class="btn${v === k ? " sel" : ""}" type="button" role="radio" aria-checked="${v === k}" data-k="${k}"><b>${"ABCDE"[k]}</b>${esc(o)}</button>`).join("")}</div>`;
      h.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
        v = Number(b.dataset.k);
        h.querySelectorAll("[data-k]").forEach(x => { x.classList.toggle("sel", x === b); x.setAttribute("aria-checked", x === b); });
        upd();
      });
    },
    canGo: () => v !== null,
    onGo: () => { S.test[i] = v; next(); },
  });
}

function evalIntro() {
  screen({ title: "Evaluation Session", label: "Instructions", paras: [D.EVAL_INTRO], onGo: next });
}

function evaluation({ i }) {
  const correct = S.test[i] === D.TEST[i].answer;
  screen({ title: "Evaluation Session", label: `Evaluation ${i + 1}`, paras: [D.evalText(i, correct)], onGo: next });
}

function survey({ i }) {
  const it = D.SURVEY[i];
  let v = S.survey[it.id] ?? null;
  screen({
    title: "Questionnaire", label: `Item ${i + 1} / ${D.SURVEY.length}`, paras: [it.q],
    resp: (h, upd) => matrix(h, { lo: it.lo || D.SURVEY_SCALE.lo, hi: it.hi || D.SURVEY_SCALE.hi, value: v, onPick: x => { v = x; upd(); } }),
    canGo: () => v !== null,
    onGo: () => { S.survey[it.id] = v; next(); },
  });
}

// 기록 — 실패하면 같은 화면에서 다시 시도한다
async function save() {
  if (S.saved) return next();
  $title.textContent = "Tutor";
  $body.innerHTML = `<div class="label">Saving</div><div class="out" style="font-size:18px"><p>기록 중입니다…</p><div class="err" id="err"></div></div>
    <div class="foot"><button class="btn go" id="go" type="button" hidden>RETRY</button></div>`;
  const err = $body.querySelector("#err"), go = $body.querySelector("#go");
  const correct = S.test.filter((a, i) => a === D.TEST[i].answer).length;
  const data = { know: S.know, test: S.test, correct };
  if (S.cond === "screen") data.survey = S.survey;
  try {
    await ready();
    await saveSession(S.n, data);
    S.saved = true; next();
  } catch (e) {
    console.error(e);
    err.textContent = "기록하지 못했습니다. RETRY를 눌러 주십시오. 계속되면 조교에게 알려 주십시오.";
    go.hidden = false; go.onclick = save;
  }
}

function end() {
  clearInterval(typing);
  $title.textContent = "Tutor";
  const paras = S.cond === "paper" ? D.PAPER_END : D.SCREEN_END;
  $body.innerHTML = `<div class="label">Session Complete</div><div class="out" id="out"></div>
    <div class="foot"><button class="btn go" id="go" type="button" hidden>PART 2</button></div>`;
  type($body.querySelector("#out"), paras);
  // 현황판이 2부로 넘기면 2부 화면으로 가는 단추를 띄운다
  const go = $body.querySelector("#go");
  go.onclick = () => { location.href = "p2.html" + location.search; };
  ready().then(() => watchState(st => { go.hidden = (st.phase || "p1") === "p1"; }));
}

render();
