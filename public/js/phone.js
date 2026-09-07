// 전화 스테이션 — 인지 부하를 재는 자리. 로터리 다이얼과 번호 암기가 들어간다.
export function mountPhone(ui) {
  ui.stage.innerHTML = `
    <div class="building">
      <b>전화 스테이션은 준비 중입니다</b>
      안내원에게 번호를 물어 받아 적지 못한 채 외우고, 로터리 다이얼로 거는 과업이 들어갑니다.
      한 자리를 잘못 돌리면 처음부터 다시 걸어야 합니다.
    </div>`;
  ui.note.textContent = "라디오와 텔레비전을 먼저 해 보십시오.";
  ui.steps.innerHTML = `<div class="step"><div class="mark">—</div>
    <div><p>준비되면 이 자리에 과업이 들어갑니다.</p></div></div>`;
  ui.startBtn.disabled = true; ui.resetBtn.disabled = true; ui.saveBtn.disabled = true;
  return () => {};
}
