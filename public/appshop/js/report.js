// 실습보고서 — 조와 내가 한 일을 적어 넣은 워드 문서(.docx)를 만들어 내려 준다.
//
// 4주차 노만의 공방과 같은 틀이다. 숫자와 기록은 이미 적혀 있고, 학생이 쓸 것은 생각뿐이다.
//   1부 — 우리 조 설계서 · 우리 앱이 받은 평가 · 내가 준 평가 (자동)
//   2부 — 온라인 강의와 잇기 (쪽 번호 옆에 실습 장면을 적는다)
//   3부 — 생각 (문항마다 1부의 어느 숫자를 근거로 쓸지 적어 둔다)
// 문서는 HTML 로 짠 뒤 공용 변환기(../../js/docx.js)로 진짜 워드 문서(.docx)로 옮긴다.

import { HEURISTICS, SEVERITY, FIELDS, missionOf, teamLabel, isDemo } from "./data.js";
import { htmlToDocx, saveBlob } from "../../js/docx.js";

/* ── 온라인 강의와 잇는 표 ────────────────────────────────────
   쪽 번호는 「5주차_온라인_신규_보완_스크립트_수정버전」 의 슬라이드 번호다.
   강의 파일을 고치면 여기도 같이 고쳐야 한다. */
const LINKS = [
  ["UI 디자인의 기본 기준 — 일관성 · 명확성 · 심미성", "6 · 7"],
  ["중요한 정보가 눈에 띄지 않는 화면", "8"],
  ["개럿의 사용자 경험 5단계 — 전략에서 표면까지", "10"],
  ["제품을 통해 전달되는 설계 의도 — 디자이너 모델 · 시스템 이미지 · 사용자 모델", "13"],
  ["사용성의 세 가지 기준 — 효과성 · 효율성 · 만족도", "14"],
  ["실용적 품질과 쾌락적 품질", "15"],
  ["시간에 따라 달라지는 사용자 경험", "16"],
  ["휴리스틱 평가 — 여러 평가자가 따로 점검한 뒤 모은다", "24"],
  ["닐슨의 10가지 사용성 원칙", "25 · 26"],
  ["피드백 · 통제감 · 인지 부하와 사용성 원칙의 연결", "28"],
  ["휴리스틱 평가의 활용과 한계", "29"],
];

const esc = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const blank = n => "&nbsp;".repeat(n || 30);
const hName = n => (HEURISTICS.find(h => h.n === n) || {}).ko || "";
const sevName = v => (SEVERITY.find(s => s.v === v) || {}).ko || "";
const avg = a => { const v = a.filter(x => typeof x === "number"); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const f1 = v => v == null ? "&mdash;" : v.toFixed(1);
const secs = ms => ms ? Math.round(ms / 1000) + "초" : "&mdash;";
const kinds = list => new Set(list.flatMap(e => (e.tags || []).map(t => t.h)));

/* ── 모으기 ─────────────────────────────────────────────── */
export function gather({ team, name, uid, teamDoc, received, allEvals }) {
  const spec = teamDoc.publishedSpec || teamDoc.spec || null;
  const got = received || [];
  const mine = (allEvals || []).filter(e => e.uid === uid);
  const myTeam = (allEvals || []).filter(e => e.team === team);

  // 내가 평가한 앱마다 — 나 혼자 · 우리 조 · 모든 평가자가 찾은 원칙 종류
  const targets = [...new Set(mine.map(e => e.target))].sort((a, b) => a - b);
  const compare = targets.map(tg => ({
    target: tg,
    me: kinds(mine.filter(e => e.target === tg)).size,
    team: kinds(myTeam.filter(e => e.target === tg)).size,
    all: kinds((allEvals || []).filter(e => e.target === tg)).size,
  }));

  const tags = got.flatMap(e => (e.tags || []).map(t => ({ ...t, by: e.team })));
  const byH = HEURISTICS.map(h => {
    const ts = tags.filter(t => t.h === h.n);
    return { n: h.n, ko: h.ko, count: ts.length, sev: avg(ts.map(t => t.sev)) };
  });

  return {
    team, name, mission: missionOf(team), spec,
    gens: teamDoc.gens || 0, version: teamDoc.publishedVersion || teamDoc.version || 0,
    published: !!teamDoc.publishedHtml,
    got: {
      people: got.length, teams: new Set(got.map(e => e.team)).size,
      done: got.filter(e => e.taskDone === true).length,
      ms: avg(got.map(e => e.ms)), taps: avg(got.map(e => e.taps)),
      pq: avg(got.map(e => e.pq)), hq: avg(got.map(e => e.hq)),
      byH, tags: tags.sort((a, b) => b.sev - a.sev),
      comments: got.map(e => e.comment).filter(Boolean),
      kinds: kinds(got).size,
    },
    mine, compare,
  };
}

/* ── 문서 ─────────────────────────────────────────────────── */
function specTable(spec) {
  if (!spec) return "<p><i>출판된 설계서가 없습니다.</i></p>";
  const rows = (spec.scenes || []).map((s, i) => (s.see || s.do || s.react)
    ? `<tr><th>장면 ${i + 1}</th><td>${esc(s.see) || "<i>적지 않음</i>"}</td><td>${esc(s.do) || "<i>적지 않음</i>"}</td><td>${esc(s.react) || "<i>적지 않음</i>"}</td></tr>` : "").join("");
  return `<table class=g><tr><th style="width:52pt"></th><th>${FIELDS.see}</th><th>${FIELDS.do}</th><th>${FIELDS.react}</th></tr>${rows}</table>` +
    `<table class=t><tr><th>앱 이름</th><td class=fill>${esc(spec.appName)}</td></tr><tr><th>${FIELDS.style}</th><td class=fill>${esc(spec.style) || "<i>적지 않음</i>"}</td></tr></table>`;
}

function tagRows(tags, withBy) {
  if (!tags.length) return "<p><i>기록된 문제가 없습니다.</i></p>";
  return `<table class=g><tr><th style="width:150pt">어긴 원칙</th><th style="width:70pt">심각도</th><th style="width:90pt">어느 화면에서</th><th>무엇이 문제인가</th>${withBy ? "<th style='width:40pt'>평가 조</th>" : ""}</tr>` +
    tags.map(t => `<tr><td>${t.h}. ${esc(hName(t.h))}</td><td class=fill>${t.sev} · ${esc(sevName(t.sev))}</td><td>${esc(t.where) || "&mdash;"}</td><td>${esc(t.note)}</td>${withBy ? `<td>${esc(teamLabel(t.by))}</td>` : ""}</tr>`).join("") + "</table>";
}

function myEvalBlock(e) {
  const m = missionOf(e.target);
  return `<h3>${esc(teamLabel(e.target))}의 앱 &mdash; ${esc(m.name)}</h3>` +
    `<table class=t>
      <tr><th>평가 과업</th><td>${esc(m.task)}</td></tr>
      <tr><th>과업 결과</th><td class=fill>${e.taskDone ? "끝냄" : "포기"} · 걸린 시간 <b>${secs(e.ms)}</b> · 앱 안에서 누른 횟수 <b>${e.taps ?? 0}</b></td></tr>
      <tr><th>실용적 품질</th><td class=fill><b>${e.pq ?? "&mdash;"}</b> / 7</td></tr>
      <tr><th>쾌락적 품질</th><td class=fill><b>${e.hq ?? "&mdash;"}</b> / 7</td></tr>
      <tr><th>한 줄 소감</th><td class=fill>${esc(e.comment) || "<i>적지 않음</i>"}</td></tr>
    </table>` + tagRows(e.tags || [], false);
}

export function reportHTML(g, opts = {}) {
  const d = new Date();
  const day = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const m = g.mission;
  const G = g.got;

  const ask = (no, pt, title, lead) =>
    `<h3>${no}. <span class=pt>${pt}점</span>${title}</h3><p class="lead">${lead}</p><table class=ask><tr><td>&nbsp;</td></tr></table>`;

  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
    `<title>5주차 실습보고서 — ${esc(teamLabel(g.team))}</title><style>` +
    "body{font-family:'맑은 고딕',Malgun Gothic,sans-serif;font-size:10.5pt;line-height:1.75;color:#111}" +
    "h1{font-size:16pt;margin:0 0 2pt}h2{font-size:12.5pt;margin:26pt 0 6pt;border-bottom:1.5pt solid #333;padding-bottom:3pt}" +
    "h3{font-size:11pt;margin:16pt 0 4pt;color:#1a3a5c}.sub{color:#555;font-size:9.5pt;margin:0 0 14pt}" +
    "table{border-collapse:collapse;width:100%;margin:4pt 0 10pt}" +
    "th,td{border:0.75pt solid #999;padding:5pt 8pt;vertical-align:top;font-size:10pt;text-align:left}" +
    "table.t th{width:130pt;background:#F2F4F6;font-weight:normal;color:#444}" +
    "table.g th{background:#F2F4F6;font-weight:normal;color:#444}.fill{background:#FFFDF0}" +
    "table.ask{margin:4pt 0 14pt}table.ask td{height:90pt}table.link td.write{height:26pt}" +
    ".pt{float:right;color:#777;font-size:9pt;font-weight:normal}small{color:#666}i{color:#888}" +
    "p.lead{color:#444;font-size:9.5pt;margin:2pt 0 10pt}" +
    "p.bridge{border:0.75pt solid #999;background:#F7F9FB;padding:7pt 9pt;font-size:9.5pt;line-height:1.7;margin:14pt 0 0}" +
    "</style></head><body>" +

    "<h1>HCI와 커뮤니케이션 · 5주차 실습보고서</h1>" +
    "<p class=sub>UI · UX와 사용성 평가 &middot; 앱 공방</p>" +

    "<table class=g><tr>" +
    `<th>학번</th><td>${blank(18)}</td><th>이름</th><td class=fill>${esc(g.name) || blank(14)}</td>` +
    `<th>조</th><td class=fill><b>${esc(teamLabel(g.team))}</b></td><th>제출일</th><td class=fill>${day}</td></tr></table>` +

    '<p class="bridge"><b>말 맞추기.</b> 공방에서 조가 쓴 <b>설계서</b>는 강의의 <b>디자이너 모델</b>을 적은 것입니다. ' +
    "출판된 앱은 사용자가 만나는 <b>시스템 이미지</b>이고, 다른 조가 앱을 써 보며 이해한 방식이 <b>사용자 모델</b>입니다(13쪽). " +
    "문제를 원칙과 심각도로 기록한 것이 <b>휴리스틱 평가</b>(24~26쪽)이고, 마지막에 매긴 두 점수가 <b>실용적 품질</b>과 <b>쾌락적 품질</b>(15쪽)입니다.</p>" +

    /* ── 1부 ── */
    "<h2>1부. 우리 조와 내가 한 일</h2>" +
    '<p class="lead">아래 기록은 공방에서 실제로 한 것을 그대로 옮긴 것입니다. 고쳐 쓰지 마시고, 이 기록을 근거로 2부와 3부를 쓰십시오.</p>' +

    "<h3>① 우리 조의 미션</h3><table class=t>" +
    `<tr><th>앱</th><td class=fill><b>${esc(m.name)}</b></td></tr>` +
    `<tr><th>사용자</th><td>${esc(m.who)}</td></tr><tr><th>시간 · 장소</th><td>${esc(m.when)}</td></tr>` +
    `<tr><th>해야 할 일</th><td>${esc(m.goal)}</td></tr><tr><th>사용자 특징</th><td>${m.facts.map(esc).join("<br>")}</td></tr></table>` +

    `<h3>② 우리 조가 출판한 설계서 <small>(생성 ${g.gens}번 · ${g.version}번째로 만든 앱을 출판)</small></h3>` +
    specTable(g.spec) +

    "<h3>③ 우리 앱이 받은 평가</h3>" +
    `<table class=g><tr><th>평가한 사람</th><td class=fill><b>${G.teams}</b>개 조 · <b>${G.people}</b>명</td>` +
    `<th>과업을 끝낸 사람</th><td class=fill><b>${G.done} / ${G.people}</b>명</td>` +
    `<th>짚인 원칙 종류</th><td class=fill><b>${G.kinds}</b>가지</td></tr>` +
    `<tr><th>평균 걸린 시간</th><td class=fill>${G.ms ? Math.round(G.ms / 1000) + "초" : "&mdash;"}</td>` +
    `<th>평균 누른 횟수</th><td class=fill>${G.taps == null ? "&mdash;" : Math.round(G.taps) + "번"}</td>` +
    `<th>실용적 · 쾌락적 품질</th><td class=fill><b>${f1(G.pq)}</b> · <b>${f1(G.hq)}</b> <small>/ 7</small></td></tr></table>` +
    "<table class=g><tr><th>닐슨의 10가지 사용성 원칙</th><th style='width:70pt'>지적 횟수</th><th style='width:80pt'>평균 심각도</th></tr>" +
    G.byH.map(h => `<tr><td>${h.n}. ${esc(h.ko)}</td><td class=fill>${h.count || ""}</td><td class=fill>${h.count ? f1(h.sev) : ""}</td></tr>`).join("") + "</table>" +
    "<p class=lead>받은 지적 (심각한 순)</p>" + tagRows(G.tags, true) +
    `<table class=t><tr><th>평가자 소감</th><td>${G.comments.length ? G.comments.map(esc).join("<br>") : "<i>없음</i>"}</td></tr></table>` +

    "<h3>④ 내가 다른 조의 앱에 준 평가</h3>" +
    (g.mine.length ? g.mine.map(myEvalBlock).join("") : "<p><i>보낸 평가가 없습니다.</i></p>") +

    "<h3>⑤ 평가자가 많아질수록</h3>" +
    '<p class="lead">내가 평가한 앱마다, 나 혼자 · 우리 조를 모았을 때 · 모든 평가자를 모았을 때 찾은 원칙 종류 수입니다.</p>' +
    (g.compare.length
      ? "<table class=g><tr><th>평가한 앱</th><th>나 혼자</th><th>우리 조를 모았을 때</th><th>모든 평가자를 모았을 때</th></tr>" +
        g.compare.map(c => `<tr><td>${esc(teamLabel(c.target))}의 앱</td><td class=fill>${c.me}가지</td><td class=fill>${c.team}가지</td><td class=fill>${c.all}가지</td></tr>`).join("") + "</table>"
      : "<p><i>평가한 앱이 없습니다.</i></p>") +

    /* ── 2부 ── */
    "<h2>2부. 온라인 강의와 잇기</h2>" +
    '<p class="lead">왼쪽은 이번 주 온라인 강의에서 다룬 내용입니다. 오른쪽 칸에, 공방에서 <b>그것을 겪은 장면</b>을 한 줄로 적으십시오. ' +
    "설계서 · 만든 앱 · 받은 평가 · 내가 준 평가 가운데 무엇이든 근거로 드십시오. 강의 문장을 그대로 옮기지 말고 자기 말로 바꾸어 쓰십시오.</p>" +
    "<table class='g link'><tr><th>강의에서 다룬 것</th><th style='width:44pt'>쪽</th><th style='width:46%'>공방에서 이에 해당한 장면</th></tr>" +
    LINKS.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td class=write>&nbsp;</td></tr>`).join("") + "</table>" +

    /* ── 3부 ── */
    "<h2>3부. 생각</h2>" +
    ask(1, 20, "설계 의도와 사용자의 이해는 어디서 어긋났습니까?",
      "1부 ②의 설계서(디자이너 모델)와 ③의 받은 지적을 견주어, 평가자가 우리 의도와 <b>다르게 이해한 곳</b>(사용자 모델)을 하나 고르십시오. " +
      "설계서의 어느 장면이, 앱 화면(시스템 이미지)에서 무엇 때문에 제대로 전해지지 않았는지 쓰십시오(13쪽).") +
    ask(2, 20, "적지 않아서 만들어지지 않은 것은 무엇입니까?",
      "AI는 설계서에 적은 것만 만들었습니다. 1부 ③의 지적 가운데 <b>설계서에 적지 않아서 생긴 문제</b>를 하나 고르고, 어긴 원칙의 번호를 밝히십시오. " +
      `다시 설계한다면 몇 번 장면에 무엇을 적겠는지 「${FIELDS.see} / ${FIELDS.do} / ${FIELDS.react}」 형식으로 쓰십시오(25 · 26쪽).`) +
    ask(3, 20, "내가 매긴 심각도의 근거는 무엇입니까?",
      "1부 ④에서 내가 다른 조 앱에 적은 문제 가운데 <b>심각도를 가장 높게 매긴 것</b>을 고르십시오. " +
      "그 원칙을 고른 까닭과, 그 앱의 사용자(미션 카드의 사용자 · 사용 상황)를 생각할 때 왜 그 심각도가 맞는지 쓰십시오.") +
    ask(4, 20, "평가자가 많아지면 무엇이 달라졌습니까?",
      "1부 ⑤의 숫자(나 혼자 · 우리 조 · 모든 평가자)를 근거로, 한 사람의 평가만으로는 무엇을 놓치는지 쓰십시오. " +
      "다른 사람이 찾았는데 나는 못 찾은 문제가 있었다면, 왜 못 보았는지도 쓰십시오(24쪽).") +
    ask(5, 20, "휴리스틱 평가로 보이지 않는 것은 무엇입니까?",
      "1부 ③의 <b>실용적 · 쾌락적 품질 점수</b>와 <b>받은 지적</b>이 같은 방향을 가리키는지 견주어 보십시오. " +
      "지적은 적은데 점수가 낮거나, 지적은 많은데 점수가 높은 경우처럼 어긋나는 곳이 있다면 그 까닭을 쓰십시오. " +
      "그리고 휴리스틱 평가만으로는 알 수 없어 실제 사용자에게 물어봐야 할 것을 하나 드십시오(15 · 16 · 29쪽).") +

    (opts.practice
      ? '<p style="color:#A33;font-size:9pt;margin-top:20pt">※ 이 기록은 미리보기(가짜 자료)에서 만들어졌습니다. 실제 수업 기록이 아닙니다.</p>'
      : isDemo(g.team) ? '<p style="color:#A33;font-size:9pt;margin-top:20pt">※ 시연용 앱의 보고서입니다.</p>' : "") +
    "</body></html>";
}

/** 문서를 만들어 내려 준다. */
export function download(input, opts) {
  const g = gather(input);
  saveBlob(htmlToDocx(reportHTML(g, opts)), `5주차_실습보고서_${teamLabel(g.team)}_${(g.name || "").replace(/[\\/:*?"<>|]/g, "")}.docx`);
  return g;
}
