// 로블록스식 블록 인형. Tripo GLB가 도착하기 전까지 이 인형이 모든 배역을 맡는다.
// 몸짓이 곧 대사인 장이라, 갸웃·끄덕·기뻐 뛰기·가슴 치기·비비기·기침을 넣었다.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const box = (w, h, d, color) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
};

/**
 * @param o.skin .shirt .pants .hair .scale  빛깔과 크기
 * @param o.beard  수염 빛깔 (없으면 생략)
 * @param o.extra  (group) => void  소품을 몸에 붙이는 함수
 */
export function makeAvatar(o = {}) {
  const C = { skin: "#e3b48c", shirt: "#3b5b8c", pants: "#2d2d3a", hair: "#2a1c12", scale: 1, ...o };
  const root = new THREE.Group();
  const body = new THREE.Group();            // 걸음과 몸짓에 따라 흔들리는 몸
  root.add(body);

  const LEG = 0.78, TORSO = 0.86, HEAD = 0.64;
  const hip = LEG, shoulder = LEG + TORSO - 0.05;

  const legs = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(0.2 * s, hip, 0);
    const m = box(0.32, LEG, 0.34, C.pants); m.position.y = -LEG / 2;
    piv.add(m); body.add(piv); return piv;
  });
  const torso = box(0.86, TORSO, 0.46, C.shirt);
  torso.position.y = LEG + TORSO / 2;
  body.add(torso);
  const arms = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(0.57 * s, shoulder, 0);
    const m = box(0.27, 0.8, 0.3, C.shirt); m.position.y = -0.36;
    const hand = box(0.25, 0.18, 0.28, C.skin); hand.position.y = -0.84;
    piv.add(m, hand); body.add(piv); return piv;
  });

  const head = new THREE.Group();
  head.position.y = LEG + TORSO + HEAD / 2 + 0.02;
  body.add(head);
  head.add(box(HEAD, HEAD, HEAD, C.skin));
  const eyeM = new THREE.MeshStandardMaterial({ color: "#1b140f", roughness: 0.4 });
  const eyes = [-1, 1].map(s => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.02), eyeM);
    e.position.set(0.14 * s, 0.04, HEAD / 2 + 0.006); head.add(e); return e;
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), eyeM);
  mouth.position.set(0, -0.15, HEAD / 2 + 0.006);
  head.add(mouth);
  const hair = box(HEAD * 1.06, 0.18, HEAD * 1.06, C.hair);
  hair.position.y = HEAD / 2 + 0.04;
  head.add(hair);
  const back = box(HEAD * 1.06, HEAD * 0.55, 0.12, C.hair);   // 뒷머리
  back.position.set(0, 0.12, -HEAD / 2 - 0.02);
  head.add(back);
  if (C.beard) {
    const b = box(HEAD * 0.8, 0.26, 0.1, C.beard);
    b.position.set(0, -0.23, HEAD / 2 + 0.03); head.add(b);
  }
  if (C.extra) C.extra({ body, torso, head, arms, legs, box });

  root.scale.setScalar(C.scale);

  /* ── 움직임 ─────────────────────────────────────── */
  let phase = 0, idleT = Math.random() * 10, blinkT = 2 + Math.random() * 3;
  let lookYaw = 0, lookTarget = null;
  let gest = null;                           // { name, t, dur }

  const A = {
    root, body, head, arms, legs, color: C,
    height: (LEG + TORSO + HEAD) * C.scale,
    speed: 0,
    glb: null,

    /** 이 지점을 바라본다 (머리만, 너무 뒤면 몸도 돌린다). null이면 앞을 본다. */
    lookAt(p) { lookTarget = p; },

    /** 몸짓. 끝날 때까지 기다리려면 await */
    play(name, dur = 1.2) {
      gest = { name, t: 0, dur };
      return new Promise(r => setTimeout(r, dur * 1000));
    },

    update(dt) {
      idleT += dt;
      const walking = A.speed > 0.15;
      if (walking) phase += dt * (3.2 + A.speed * 0.9);
      const sw = walking ? Math.sin(phase) * Math.min(1, A.speed / 3) * 0.75 : 0;

      let gNow = null;                         // 이번 프레임의 몸짓 — GLB 모델도 이걸 보고 따라 한다
      // 기본 자세 — 걷거나 숨 쉬거나
      legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
      arms[0].rotation.set(-sw * 0.85, 0, 0.06); arms[1].rotation.set(sw * 0.85, 0, -0.06);
      body.position.y = walking ? Math.abs(Math.sin(phase)) * 0.06 : Math.sin(idleT * 1.8) * 0.012;
      body.rotation.set(0, 0, 0);
      head.rotation.x = 0; head.rotation.z = 0;

      // 몸짓이 있으면 그 위에 얹는다
      if (gest) {
        gest.t += dt;
        const k = gest.t / gest.dur, e = Math.sin(Math.min(1, k) * Math.PI);
        gNow = { name: gest.name, t: gest.t, e };
        switch (gest.name) {
          case "tilt":     // 갸웃 — 못 알아들었다
            head.rotation.z = 0.42 * e; arms[1].rotation.set(-1.9 * e, 0, -0.5 * e); break;
          case "nod":      // 끄덕 — 알아들었다
            head.rotation.x = 0.35 * Math.abs(Math.sin(gest.t * 9)) * e; break;
          case "joy":      // 기뻐서 뛴다
            body.position.y = Math.abs(Math.sin(gest.t * 9)) * 0.38 * e;
            arms[0].rotation.set(-2.7 * e, 0, 0.3); arms[1].rotation.set(-2.7 * e, 0, -0.3); break;
          case "thump":    // 가슴을 두드리며 제 이름을 댄다
            arms[1].rotation.set(-1.25 - 0.3 * Math.abs(Math.sin(gest.t * 10)), 0, -0.9); break;
          case "rub":      // 막대를 손바닥 사이에 끼우고 비빈다
            arms[0].rotation.set(-1.1, 0, 0.55 + 0.25 * Math.sin(gest.t * 22));
            arms[1].rotation.set(-1.1, 0, -0.55 - 0.25 * Math.sin(gest.t * 22));
            body.rotation.x = 0.28 * e; head.rotation.x = 0.3 * e; break;
          case "cough":    // 기침
            body.rotation.x = 0.35 * Math.abs(Math.sin(gest.t * 7)) * e;
            arms[0].rotation.set(-1.4 * e, 0, 0.5 * e); break;
          case "point":    // 저쪽을 가리킨다
            arms[0].rotation.set(-1.55 * e, 0, 0.1); break;
          case "blow":     // 입김을 분다
            body.rotation.x = 0.5 * e; head.rotation.x = 0.35 * e; break;
          case "forget":   // 머리를 긁적인다 — 잊어버렸다
            arms[1].rotation.set(-2.6 * e, 0, -0.6 * e); head.rotation.z = -0.25 * e; break;
        }
        if (gest.t >= gest.dur) gest = null;
      }

      // 바라보기 — 머리는 ±70도까지만, 그 너머는 몸이 따라 돈다
      let want = 0;
      if (lookTarget) {
        const wp = new THREE.Vector3(); root.getWorldPosition(wp);
        const yaw = Math.atan2(lookTarget.x - wp.x, lookTarget.z - wp.z) - root.rotation.y;
        want = Math.atan2(Math.sin(yaw), Math.cos(yaw));
        if (Math.abs(want) > 1.2 && !walking) root.rotation.y += Math.sign(want) * Math.min(Math.abs(want) - 1.2, dt * 2.4);
        want = Math.max(-1.2, Math.min(1.2, want));
      }
      lookYaw += (want - lookYaw) * (1 - Math.exp(-dt * 7));
      head.rotation.y = lookYaw;

      // 눈 깜빡임
      blinkT -= dt;
      const shut = blinkT < 0.09;
      eyes.forEach(e => (e.scale.y = shut ? 0.15 : 1));
      if (blinkT < 0) blinkT = 2.5 + Math.random() * 3.5;

      if (A.glb) A.glb.update(dt, A.speed, lookYaw, gNow, walking ? phase : null);
    },
  };
  return A;
}

/* ── Tripo GLB로 갈아 끼우기 ─────────────────────────────
   파일이 없으면 조용히 블록 인형으로 남는다. 파일이 있으면 키를 맞추고,
   걷기·서 있기 동작이 들어 있으면 속도에 따라 섞어 튼다. */
const loader = new GLTFLoader();

export async function trySwapGLB(A, url) {
  let gltf;
  try {
    const head = await fetch(url, { method: "HEAD" });
    const type = head.headers.get("content-type") || "";
    if (!head.ok || type.includes("text/html")) return false;     // 없는 파일
    gltf = await loader.loadAsync(url);
  } catch (e) { return false; }

  const model = gltf.scene;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const bb = new THREE.Box3().setFromObject(model);
  const h = bb.max.y - bb.min.y || 1;
  const s = A.height / A.root.scale.y / h;
  const waist = A.height / A.root.scale.y * 0.42;
  model.scale.setScalar(s);
  model.position.y = -bb.min.y * s - waist;
  const holder = new THREE.Group();          // 허리 높이 받침 — 여기서 기울이고 뛴다
  holder.position.y = waist;
  holder.add(model);
  A.body.visible = false;
  A.root.add(holder);

  let headBone = null;
  model.traverse(o => { if (!headBone && o.isBone && /head/i.test(o.name)) headBone = o; });

  let mixer = null, walk = null, idle = null;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(model);
    const find = re => gltf.animations.find(c => re.test(c.name));
    const w = find(/walk|run/i), i = find(/idle|stand|breath/i) || gltf.animations[0];
    if (w) { walk = mixer.clipAction(w); walk.play(); walk.weight = 0; }
    if (i) { idle = mixer.clipAction(i); idle.play(); idle.weight = 1; }
  }
  let breathe = Math.random() * 10;
  A.glb = {
    update(dt, speed, yaw, g, phase) {
      breathe += dt;
      if (mixer) {
        const k = Math.min(1, speed / 2.5);
        if (walk) walk.weight = k;
        if (idle) idle.weight = 1 - k;
        mixer.update(dt);
      }
      // 뼈대가 없는 모델도 몸 전체로 몸짓을 한다 — 갸웃·끄덕·뛰기가 곧 이 장의 대사다
      let rx = 0, ry = 0, rz = 0, y = waist, sq = 1;
      if (phase !== null && !mixer) {          // 걸음 — 좌우로 뒤뚱이며 통통 튄다
        rz = 0.07 * Math.sin(phase); y += Math.abs(Math.sin(phase)) * 0.06;
      } else if (!mixer) {                     // 서 있을 때 — 숨 쉬듯 살짝
        sq = 1 + 0.012 * Math.sin(breathe * 1.8);
      }
      if (g) {
        const { name, t, e } = g;
        if (name === "tilt")   { rz += 0.24 * e; ry += 0.12 * e; }
        if (name === "nod")    { rx += 0.14 * Math.abs(Math.sin(t * 9)) * e; }
        if (name === "joy")    { y += Math.abs(Math.sin(t * 9)) * 0.3 * e; sq = 1 + 0.06 * Math.sin(t * 18) * e; }
        if (name === "thump")  { y += Math.abs(Math.sin(t * 10)) * 0.05 * e; rx -= 0.08 * e; }
        if (name === "rub")    { rx += 0.2 * e; rz += 0.05 * Math.sin(t * 22) * e; }
        if (name === "blow")   { rx += 0.3 * e; }
        if (name === "cough")  { rx += 0.22 * Math.abs(Math.sin(t * 7)) * e; }
        if (name === "point")  { ry += 0.35 * e; }
        if (name === "forget") { rz -= 0.2 * e; ry += 0.08 * Math.sin(t * 5) * e; }
      }
      holder.position.y = y;
      holder.rotation.set(rx, ry + (headBone ? 0 : yaw * 0.7), rz);   // 머리 뼈가 없으면 몸째로 돌아본다
      holder.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      if (headBone) headBone.rotation.y = yaw;
    },
  };
  return true;
}
