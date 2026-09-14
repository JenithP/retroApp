// 뼈대가 있는 모델을 직접 움직인다.
//
// 동작 파일(애니메이션 클립)이 없어도 걷고 갸웃하고 뛰게 하려는 것이다.
// 뼈가 어느 쪽을 보고 누워 있는지는 모델마다 다르므로, 뼈의 방향에 기대지 않고
// 「모델 기준 축」으로 돌린다. 뼈의 원래 자세를 rest 로 재어 두고, 매 프레임
//     새 자세 = P⁻¹ · R · P · rest
// 로 다시 세운다. P 는 그 뼈의 부모가 모델 기준으로 얼마나 돌아가 있는지이고,
// R 은 우리가 주고 싶은 회전이다. 이렇게 하면 Tripo 든 믹사모든 같은 코드로 움직인다.
import * as THREE from "three";

// 이름이 조금씩 달라도 찾아내도록 — Tripo(L_Upperarm)와 믹사모(mixamorig:LeftArm) 둘 다
const WANT = {            // 이름은 밑줄·점·빈칸을 지우고 소문자로 바꾼 뒤 맞춰 본다
  hips:   [/^(hips?|pelvis)$/],
  waist:  [/^(waist|spine|spine01|spine1)$/],
  chest:  [/^(spine02|spine2|chest|upperchest)$/],
  neck:   [/^(neck|necktwist02|necktwist01)$/],
  head:   [/^head$/],
  lArm:   [/^(lupperarm|leftarm|upperarml|arml)$/],
  rArm:   [/^(rupperarm|rightarm|upperarmr|armr)$/],
  lFore:  [/^(lforearm|leftforearm|forearml)$/],
  rFore:  [/^(rforearm|rightforearm|forearmr)$/],
  lHand:  [/^(lhand|lefthand|handl)$/],
  rHand:  [/^(rhand|righthand|handr)$/],
  lLeg:   [/^(lthigh|leftupleg|thighl|uplegl)$/],
  rLeg:   [/^(rthigh|rightupleg|thighr|uplegr)$/],
  lShin:  [/^(lcalf|leftleg|calfl|shinl)$/],
  rShin:  [/^(rcalf|rightleg|calfr|shinr)$/],
  lFoot:  [/^(lfoot|leftfoot|footl)$/],
  rFoot:  [/^(rfoot|rightfoot|footr)$/],
};
const key = s => s.toLowerCase().replace(/^mixamorig:?/, "").replace(/[\s._-]/g, "");

/** 모델에서 뼈를 찾아 원래 자세를 재어 둔다. 못 찾으면 null */
export function makeRig(model) {
  const found = {};
  model.traverse(o => {
    if (!o.isBone && o.type !== "Bone") return;
    const k = key(o.name);
    for (const [slot, res] of Object.entries(WANT)) {
      if (!found[slot] && res.some(re => re.test(k))) found[slot] = o;
    }
  });
  const n = Object.keys(found).length;
  if (!found.head || !found.lLeg || !found.lArm) {      // 팔다리를 못 찾으면 쓰지 않는다
    console.warn("뼈 이름을 알아보지 못했습니다 — 찾은 것", n, "개:", Object.keys(found).join(","));
    return null;
  }

  model.updateWorldMatrix(true, true);
  const mq = new THREE.Quaternion();
  model.getWorldQuaternion(mq);
  const mqi = mq.clone().invert();
  const pq = new THREE.Quaternion();
  for (const b of Object.values(found)) {
    b.parent.getWorldQuaternion(pq);
    const P = mqi.clone().multiply(pq);                 // 부모가 모델 기준으로 돌아간 정도
    b.userData.rig = { rest: b.quaternion.clone(), P, Pinv: P.clone().invert() };
  }

  const R = new THREE.Quaternion(), E = new THREE.Euler();
  // 걷기·몸짓·바라보기가 같은 뼈를 서로 덮어쓰지 않도록, 한 프레임 동안 모았다가 한 번에 세운다
  const pose = {};
  const begin = () => { for (const k in found) pose[k] = [0, 0, 0]; };
  const set = (slot, x = 0, y = 0, z = 0) => {
    const p = pose[slot]; if (!p) return;
    p[0] += x; p[1] += y; p[2] += z;
  };
  const apply = () => {
    for (const [slot, b] of Object.entries(found)) {
      const g = b.userData.rig, p = pose[slot] || [0, 0, 0];
      R.setFromEuler(E.set(p[0], p[1], p[2]));
      b.quaternion.copy(g.Pinv).multiply(R).multiply(g.P).multiply(g.rest);
    }
  };
  begin();

  /** 동작 클립이 도는 모델용 — 뼈를 원래 자세로 되돌려 둔다 (클립이 안 건드리는 뼈가 누적되지 않게) */
  const reset = () => { for (const b of Object.values(found)) b.quaternion.copy(b.userData.rig.rest); };
  /** 동작 클립 위에 얹는다 — 원래 자세 대신 클립이 만든 지금 자세를 바탕으로 삼는다.
   *  믹사모 GLB 는 원래 자세에서 목이 옆으로 90도쯤 누워 있어, 그때 잰 P 로 돌리면
   *  「고개 돌리기」가 「목 꺾기」가 된다. 그래서 부모가 지금 돌아간 정도를 매 프레임 다시 잰다.
   *  WANT 순서가 부모 → 자식이라, 앞에서 돌린 가슴이 목의 P 에 그대로 반영된다. */
  const Q = new THREE.Quaternion(), Pc = new THREE.Quaternion(), Pci = new THREE.Quaternion();
  const applyAdditive = () => {
    for (const [slot, b] of Object.entries(found)) {
      const p = pose[slot];
      if (!p || (!p[0] && !p[1] && !p[2])) continue;
      Pc.identity();
      for (let o = b.parent; o && o !== model; o = o.parent) Pc.premultiply(o.quaternion);
      Pci.copy(Pc).invert();
      R.setFromEuler(E.set(p[0], p[1], p[2]));
      Q.copy(b.quaternion);
      b.quaternion.copy(Pci).multiply(R).multiply(Pc).multiply(Q);
    }
  };

  return { bones: found, set, begin, apply, reset, applyAdditive,
    has: s => !!found[s],
    /** 걷기 — 다리와 팔이 엇갈려 흔들린다 */
    walk(phase, amt) {
      const s = Math.sin(phase), c = Math.sin(phase - 0.9);
      set("lLeg", -s * 0.52 * amt); set("rLeg", s * 0.52 * amt);
      set("lShin", Math.max(0, c) * 0.85 * amt); set("rShin", Math.max(0, -c) * 0.85 * amt);
      set("lFoot", -Math.max(0, c) * 0.3 * amt); set("rFoot", -Math.max(0, -c) * 0.3 * amt);
      set("lArm", s * 0.42 * amt, 0, 0.06); set("rArm", -s * 0.42 * amt, 0, -0.06);
      set("lFore", -0.25 * amt); set("rFore", -0.25 * amt);
      set("waist", 0, -s * 0.08 * amt);
      set("chest", 0, s * 0.05 * amt);
    },
    /** 가만히 — 숨을 쉬듯 아주 조금 */
    idle(t) {
      const b = Math.sin(t * 1.7);
      set("chest", b * 0.02); set("waist", -b * 0.012);
      set("lArm", 0, 0, 0.05 + b * 0.02); set("rArm", 0, 0, -0.05 - b * 0.02);
      set("lFore", -0.12); set("rFore", -0.12);
    },
    /** 몸짓 — 걷기·가만히 위에 얹는다.
     *  팔은 X 로 돌리면 앞뒤로, Z 로 돌리면 옆으로 들린다. 오른팔은 Z 가 음수일 때 올라간다. */
    gesture(name, t, e) {
      const wob = Math.sin(t * 20), beat = Math.abs(Math.sin(t * 9));
      switch (name) {
        case "tilt":                                   // 갸웃 — 못 알아들었다. 고개를 기울이고 한 손을 살짝
          set("head", 0.08 * e, 0.18 * e, 0.5 * e); set("neck", 0, 0.1 * e, 0.22 * e);
          set("rArm", -0.25 * e, 0, -0.3 * e); set("rFore", -0.7 * e); break;
        case "nod":                                    // 끄덕
          set("head", 0.34 * beat * e); break;
        case "joy":                                    // 두 팔을 번쩍 들고 뛴다
          set("lArm", -0.25 * e, 0, 1.9 * e); set("rArm", -0.25 * e, 0, -1.9 * e);
          set("lFore", -0.35 * e); set("rFore", -0.35 * e);
          set("chest", -0.1 * e); set("head", -0.12 * e); break;
        case "thump":                                  // 제 가슴을 두드린다
          set("rArm", -0.9 * e, -0.5 * e, -0.45 * e);
          set("rFore", -(1.5 + 0.3 * beat) * e); break;
        case "rub":                                    // 두 손 사이에 막대를 끼우고 비빈다
          set("lArm", -1.1 * e, -0.3 * e, 0.45 * e); set("rArm", -1.1 * e, 0.3 * e, -0.45 * e);
          set("lFore", -1.25 * e + 0.12 * wob); set("rFore", -1.25 * e - 0.12 * wob);
          set("chest", 0.2 * e); set("head", 0.22 * e); break;
        case "blow":                                   // 입김을 분다
          set("chest", 0.3 * e); set("waist", 0.14 * e); set("head", 0.18 * e); break;
        case "cough":                                  // 입을 가리고 기침
          set("chest", 0.32 * beat * e); set("head", 0.18 * beat * e);
          set("rArm", -1.0 * e, -0.6 * e, -0.5 * e); set("rFore", -1.7 * e); break;
        case "point":                                  // 저쪽을 가리킨다
          set("rArm", -1.45 * e, -0.15 * e, -0.1 * e); set("rFore", -0.12 * e);
          set("head", 0, 0.18 * e); break;
        case "forget":                                 // 뒤통수를 긁적인다
          set("rArm", -0.55 * e, -0.3 * e, -1.55 * e); set("rFore", -1.95 * e);
          set("head", 0.08 * e, 0, -0.2 * e); break;
      }
    },
    /** 고개를 돌려 바라본다 — 목과 허리가 나눠 돈다 */
    look(yaw) {
      const y = Math.max(-1.1, Math.min(1.1, yaw));
      set("head", 0, y * 0.55, 0); set("neck", 0, y * 0.3, 0); set("chest", 0, y * 0.15, 0);
    },
  };
}
