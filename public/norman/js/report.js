// 워크북 — 조가 한 일을 적어 넣은 실습보고서를 만들어 내려 준다.
//
// 3주차까지는 학생이 화면에 뜬 결과 카드를 보고 워크북의 빈칸에 숫자를 옮겨
// 적었다. 옮겨 적는 동안 숫자가 틀리고, 틀린 숫자 위에 생각을 쓰게 된다.
// 그래서 4주차는 **숫자가 이미 적힌 워크북**을 내려 준다. 학생이 쓸 것은
// 생각뿐이다.
//
// 만드는 것은 워드와 한글이 여는 문서(.doc)다. 별도 라이브러리 없이
// 브라우저에서 바로 만들 수 있는 편집 가능한 형식은 이것뿐이다.

import { jobById } from "./jobs.js";
import { recipeById } from "./parts.js";
import { REWARD, QUESTIONS } from "./quizdata.js";
import { START } from "./wallet.js";

/* ── 온라인 강의와 잇는 표 ────────────────────────────────────
   쪽 번호는 4주차_온라인.pdf 의 실제 쪽이다. 강의 파일을 고치면 여기도
   같이 고쳐야 한다. */

const LINKS = [
  ["어포던스는 사물과 사람 사이의 행동 가능성이다", "5 · 6 · 9"],
  ["어포던스는 알아차리지 못해도 이미 거기 있다", "11"],
  ["지각된 어포던스 — 노먼이 1988년에 들여온 말", "12 · 13"],
  ["시그니파이어 — 디자이너가 더하는 것은 이쪽이다", "14 · 15"],
  ["세 낱말은 서로 다른 것을 가리킨다", "16"],
  ["개버의 세 경우 — 숨은 어포던스와 거짓 어포던스", "17"],
  ["하트슨의 네 가지 — 물리 · 감각 · 인지 · 기능", "18 · 19"],
  ["제약 — 할 수 없는 쪽을 막아 알리는 길", "20"],
  ["관습은 배우는 것이다", "21"],
  ["실행의 간극 — 무엇을 해야 할지 모른다", "22"],
  ["평가의 간극 — 무슨 일이 일어났는지 모른다", "22 · 23"],
  ["스키우모피즘과 플랫 — 단서를 얼마나 덜어 낼 것인가", "25"],
];

/* ── 조가 한 일을 추려 낸다 ──────────────────────────────── */

const esc = t => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const nameOf = r => (recipeById(r) || {}).name || r;
const gulfOf = r => (recipeById(r) || {}).gulf || "";

/** 한 의뢰에서 처음 돌려 본 것과 마지막으로 돌려 본 것. */
function bookend(runs, jobId) {
  const mine = (runs || []).filter(r => r.job === jobId);
  if (!mine.length) return null;
  return { first: mine[0], last: mine[mine.length - 1], n: mine.length };
}

export function gather(team, purse) {
  const sold = purse.sold || [];
  const runs = purse.runs || [];

  const jobs = sold.map(function (s) {
    const j = jobById(s.job) || {};
    return {
      id: s.job, app: j.app || "", screen: j.screen || "", task: j.task || "",
      say: j.say || "", price: s.price || 0,
      worn: (s.worn || []).map(w => ({
        name: nameOf(w.recipe), gulf: gulfOf(w.recipe), arg: w.arg || "",
      })),
      runs: bookend(runs, s.job),
    };
  });

  // 지금 붙들고 있는 의뢰 — 팔지 못했어도 한 일은 한 일이다
  if (purse.job) {
    const j = jobById(purse.job) || {};
    const worn = [];
    Object.keys(purse.attached || {}).forEach(function (pid) {
      (purse.attached[pid] || []).forEach(function (t) {
        worn.push({ name: nameOf(t.recipe), gulf: gulfOf(t.recipe), arg: t.arg || "" });
      });
    });
    jobs.push({
      id: purse.job, app: j.app || "", screen: j.screen || "", task: j.task || "",
      say: j.say || "", price: null, worn: worn, runs: bookend(runs, purse.job),
    });
  }

  const solved = Object.values(purse.quiz || {}).filter(v => v === true).length;
  const earnedQuiz = solved * REWARD;
  const earnedSell = sold.reduce((a, s) => a + (s.price || 0), 0);
  // 재료에 쓴 값은 나머지로 정확히 떨어진다 — 들어온 돈에서 남은 돈을 뺀 것
  const spent = START + earnedQuiz + earnedSell - (purse.point || 0);

  const words = [];
  jobs.forEach(j => j.worn.forEach(function (w) {
    if (w.arg) words.push({ job: j.screen || j.id, name: w.name, arg: w.arg });
  }));

  return {
    team: team, jobs: jobs, solved: solved, ofQuiz: QUESTIONS.length,
    earnedQuiz: earnedQuiz, earnedSell: earnedSell, spent: spent,
    point: purse.point || 0, words: words,
    totalWorn: jobs.reduce((a, j) => a + j.worn.length, 0),
  };
}

/* ── 문서 ─────────────────────────────────────────────────── */

const blank = n => "&nbsp;".repeat(n || 30);

function runCell(r) {
  if (!r) return "<i>테스트해 보지 않음</i>";
  return "막힌 횟수 <b>" + r.exec + "</b> · 헛누름 <b>" + r.stray + "</b> · " +
    "과제 완료 <b>" + r.done + " / " + r.of + "</b> · 걸린 시간 " +
    Number(r.secs).toFixed(1) + "초";
}

function jobBlock(j, i) {
  const none = "<i>테스트해 보지 않음</i>";
  const rows = [
    ["맡은 일", esc(j.task)],
    ["사용자 말", "「" + esc(j.say) + "」"],
    ["화면에 붙인 단서", j.worn.length
      ? j.worn.map(w => esc(w.name) + (w.gulf ? " <small>(" + esc(w.gulf) +
          "의 간극을 메우는 단서)</small>" : "") + (w.arg ? " &mdash; 넣을 글자 「" +
          esc(w.arg) + "」" : "")).join("<br>")
      : "<i>붙인 단서 없음</i>"],
    ["처음 테스트 결과", j.runs ? runCell(j.runs.first) : none],
    ["마지막 테스트 결과", j.runs ? runCell(j.runs.last) : none],
    ["줄어든 막힌 횟수", j.runs
      ? "<b>" + (j.runs.first.exec - j.runs.last.exec) + "</b> " +
        "<small>(테스트 " + j.runs.n + "번)</small>"
      : "&mdash;"],
    ["앱시장 출품", j.price == null
      ? "<i>아직 내놓지 않음</i>" : "받은 값 <b>" + j.price + "</b>포인트"],
  ];
  return "<h3>주문서 " + (i + 1) + "번째 &mdash; " + esc(j.app) + " " +
    esc(j.screen || j.id) + "</h3>" +
    "<table class=t>" + rows.map(r =>
      "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>").join("") + "</table>";
}

export function workbookHTML(g, opts) {
  const o = opts || {};
  const today = new Date();
  const day = today.getFullYear() + "년 " + (today.getMonth() + 1) + "월 " +
              today.getDate() + "일";

  const money = [
    ["처음 주머니에 있던 포인트", START],
    ["재료를 사는 데 쓴 포인트", "&minus; " + g.spent],
    ["문제 풀기로 번 포인트", "+ " + g.earnedQuiz + " <small>(" + g.solved + " / " +
      g.ofQuiz + "문제)</small>"],
    ["앱시장에 내놓아 번 포인트", "+ " + g.earnedSell],
    ["지금 주머니에 있는 포인트", "<b>" + g.point + "</b>"],
  ];

  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word"><head>' +
    '<meta charset="utf-8">' +
    "<title>4주차 실습보고서 워크북 — " + g.team + "조</title><style>" +
    "body{font-family:'맑은 고딕',Malgun Gothic,sans-serif;font-size:10.5pt;" +
    "line-height:1.75;color:#111}" +
    "h1{font-size:16pt;margin:0 0 2pt}h2{font-size:12.5pt;margin:26pt 0 6pt;" +
    "border-bottom:1.5pt solid #333;padding-bottom:3pt}" +
    "h3{font-size:11pt;margin:16pt 0 4pt;color:#1a3a5c}" +
    ".sub{color:#555;font-size:9.5pt;margin:0 0 14pt}" +
    "table{border-collapse:collapse;width:100%;margin:4pt 0 10pt}" +
    "th,td{border:0.75pt solid #999;padding:5pt 8pt;vertical-align:top;" +
    "font-size:10pt;text-align:left}" +
    "table.t th{width:130pt;background:#F2F4F6;font-weight:normal;color:#444}" +
    "table.g th{background:#F2F4F6;font-weight:normal;color:#444}" +
    ".fill{background:#FFFDF0}" +
    "table.ask{margin:4pt 0 14pt}table.ask td{height:78pt}" +
    "table.link td.write{height:26pt}" +
    ".pt{float:right;color:#777;font-size:9pt;font-weight:normal}" +
    "small{color:#666}i{color:#888}" +
    "p.lead{color:#444;font-size:9.5pt;margin:2pt 0 10pt}" +
    "p.bridge{border:0.75pt solid #999;background:#F7F9FB;padding:7pt 9pt;" +
    "font-size:9.5pt;line-height:1.7;margin:14pt 0 0}" +
    "</style></head><body>" +

    "<h1>HCI와 커뮤니케이션 · 4주차 실습보고서</h1>" +
    '<p class=sub>어포던스와 시그니파이어 &middot; 노만의 공방</p>' +

    "<table class=g><tr>" +
    "<th>학번</th><td>" + blank(18) + "</td>" +
    "<th>이름</th><td>" + blank(14) + "</td>" +
    "<th>조</th><td class=fill><b>" + g.team + "조</b></td>" +
    "<th>제출일</th><td class=fill>" + day + "</td></tr></table>" +

    '<p class="bridge"><b>말 맞추기.</b> 공방에서 「단서」라고 부른 것이 ' +
    "강의의 <b>시그니파이어</b>입니다. 재료를 사서 제작대에서 합쳐 만든 것, " +
    "화면 위로 끌어다 붙인 것이 모두 시그니파이어입니다. " +
    "<b>어포던스</b>는 사지도 만들지도 않았습니다 &mdash; 화면에 이미 있었습니다.</p>" +

    "<h2>1부. 우리 조가 한 일</h2>" +
    '<p class="lead">아래 숫자는 공방에서 조가 실제로 한 것을 그대로 옮긴 것입니다. ' +
    "고쳐 쓰지 마시고, 이 숫자를 근거로 2부와 3부를 쓰십시오.</p>" +

    "<table class=g>" +
    "<tr><th>앱시장에 내놓은 화면</th><td class=fill><b>" +
      g.jobs.filter(j => j.price != null).length + "</b>개</td>" +
    "<th>화면에 붙인 단서</th><td class=fill><b>" + g.totalWorn + "</b>개</td>" +
    "<th>맞힌 문제</th><td class=fill><b>" + g.solved + " / " + g.ofQuiz +
      "</b></td></tr></table>" +

    (g.jobs.length
      ? g.jobs.map(jobBlock).join("")
      : "<p><i>맡은 의뢰가 없습니다.</i></p>") +

    "<h3>살림</h3><table class=t>" +
    money.map(r => "<tr><th>" + r[0] + "</th><td class=fill>" + r[1] +
      "</td></tr>").join("") + "</table>" +

    (g.words.length
      ? "<h3>조가 단서에 넣은 글자</h3>" +
        '<p class="lead">제작대에서 「넣을 글자」 칸에 무슨 말을 쓸지는 ' +
        "조가 정했습니다. 그 말이 사용자에게 무엇을 알렸는지 3부에서 따져 보십시오.</p>" +
        "<table class=g><tr><th>화면</th><th>단서</th><th>넣을 글자</th></tr>" +
        g.words.map(w => "<tr><td>" + esc(w.job) + "</td><td>" + esc(w.name) +
          '</td><td class=fill>「' + esc(w.arg) + "」</td></tr>").join("") +
        "</table>"
      : "") +

    "<h2>2부. 온라인 강의와 잇기</h2>" +
    '<p class="lead">왼쪽은 이번 주 온라인 강의에서 다룬 내용입니다. ' +
    "오른쪽 칸에, 공방에서 <b>그것을 겪은 장면</b>을 한 줄로 적으십시오. " +
    "주문서 · 재료 · 단서 · 테스트 결과 가운데 무엇이든 근거로 드십시오. " +
    "강의 문장을 그대로 옮기지 말고 자기 말로 바꾸어 쓰십시오.</p>" +
    "<table class='g link'><tr><th>강의에서 다룬 것</th><th style='width:44pt'>쪽</th>" +
    "<th style='width:46%'>공방에서 이에 해당한 장면</th></tr>" +
    LINKS.map(l => "<tr><td>" + l[0] + "</td><td>" + l[1] + "</td>" +
      "<td class=write>&nbsp;</td></tr>").join("") + "</table>" +

    "<h2>3부. 생각</h2>" +

    "<h3>1. <span class=pt>15점</span>어포던스와 시그니파이어를 구분해 쓰십시오.</h3>" +
    '<p class="lead">1부의 주문서 하나를 골라, 그 화면이 <b>이미 지니고 있던 ' +
    "행동 가능성(어포던스)</b>과 조가 <b>화면에 붙인 단서(시그니파이어)</b>를 " +
    "갈라 쓰십시오. 조가 어포던스를 더한 것이 아님이 드러나게 쓰십시오.</p>" +
    "<table class=ask><tr><td>&nbsp;</td></tr></table>" +

    "<h3>2. <span class=pt>20점</span>막힌 곳이 실행의 간극이었는지 평가의 간극이었는지 " +
    "가르십시오.</h3>" +
    '<p class="lead">1부의 「사용자 말」과 「헛누름」 숫자를 ' +
    "근거로 드십시오. 두 간극은 해결 방식이 다릅니다(22쪽). " +
    "조가 붙인 단서가 그 방식에 맞았는지 따져 쓰십시오.</p>" +
    "<table class=ask><tr><td>&nbsp;</td></tr></table>" +

    "<h3>3. <span class=pt>20점</span>숫자가 줄어든 까닭을 대십시오.</h3>" +
    '<p class="lead">1부의 「처음 테스트 결과」와 「마지막 테스트 ' +
    "결과」를 견주어, <b>막힌 횟수</b>와 <b>헛누름</b>이 줄어든(또는 줄지 않은) " +
    "까닭을 쓰십시오. 줄지 않았다면 무엇이 모자랐는지 쓰십시오.</p>" +
    "<table class=ask><tr><td>&nbsp;</td></tr></table>" +

    "<h3>4. <span class=pt>25점</span>하트슨의 네 가지로 조의 단서를 뜯어보십시오.</h3>" +
    '<p class="lead">물리적 &middot; 감각적 &middot; 인지적 &middot; 기능적(18 &middot; ' +
    "19쪽). 1부의 「화면에 붙인 단서」가 이 가운데 어느 것을 채웠고 " +
    "어느 것을 비워 두었는지 쓰십시오.</p>" +
    "<table class=ask><tr><td>&nbsp;</td></tr></table>" +

    "<h3>5. <span class=pt>20점</span>덜어 낼 수 있었겠는가.</h3>" +
    '<p class="lead">단서를 많이 붙일수록 화면은 시끄러워집니다(25쪽). ' +
    "1부의 「화면에 붙인 단서」 가운데 <b>없어도 되었을 것</b>을 하나 " +
    "고르고, 그래도 된다고 보는 까닭을 쓰십시오.</p>" +
    "<table class=ask><tr><td>&nbsp;</td></tr></table>" +

    (o.practice
      ? '<p style="color:#A33;font-size:9pt;margin-top:20pt">' +
        "※ 이 기록은 연습 모드에서 만들어졌습니다. 서버에 남은 조 기록이 아닙니다.</p>"
      : "") +

    "</body></html>";
}

/** 문서를 만들어 내려 준다. */
export function download(team, purse, opts) {
  const g = gather(team, purse);
  const html = workbookHTML(g, opts);
  // 워드와 한글이 글자를 제대로 읽도록 BOM 을 앞에 둔다
  const blob = new Blob(["﻿" + html],
    { type: "application/msword;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "4주차_실습보고서_" + team + "조.doc";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  return g;
}
