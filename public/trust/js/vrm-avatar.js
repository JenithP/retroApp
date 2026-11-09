// VRM 3D 아바타 — three.js + three-vrm. 단서 하나를 받으면 표정 · 시선 · 몸 자세를 바꾸거나 한 번 움직인다.
// 움직임은 애니메이션 파일 없이 관절 회전으로 만든다 (모델이 바뀌어도 그대로 쓰도록).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { CUE_GROUPS, cueById } from "./game.js";

export const SAMPLE_VRM = "https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm";

// 두 손 동작 — 손목을 어디에 둘지(어깨 기준, 모델 키에 비례)로 정하고 팔은 2관절 IK 로 푼다.
// 모델마다 어깨 너비 · 팔 길이가 달라도 손끝이 가운데서 만나도록, 불러올 때 손목 간격을 맞춘다.
//   y · z: 어깨에서 손목까지 (키 대비), roll: 손바닥 방향(손목 축 회전), bend: 손목을 손바닥 쪽으로 꺾기, meet: 손끝 사이 절반 간격(m)
//   finger: 손가락이 향할 방향, palm: 손바닥이 향할 방향 (왼손 기준, 오른손은 x 를 뒤집는다)
export const GEST = {
  clap:    { y: -0.10, z: 0.20, finger: [-0.15, 0.55, 1], palm: [-1, 0, 0], meet: 0.012, open: 0.07 },
  heart:   { y: 0.19, z: 0.04, finger: [-1, -0.5, 0.1], palm: [0, -1, 0.3], meet: 0.006 },
  promise: { y: 0.04, z: 0.10, finger: [0, 1, 0.15], palm: [0, 0, 1] },
  hip:     { finger: [0.2, -0.7, 0.8], palm: [-1, 0, 0] },
};
const MOVES = { nod: 1.2, shake: 1.2, look: 2.0, wave: 2.0, clap: 1.8, heart: 2.4, promise: 2.4, jump: 1.1 };
const FINGERS = ["Index", "Middle", "Ring", "Little"];
const JOINTS = ["Proximal", "Intermediate", "Distal"];
const env = p => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));        // 0 → 1 → 0
const ease = (a, b, k) => a + (b - a) * k;

// 게임에서 쓸 모델 — models/a.vrm(투자자) · models/b.vrm(수탁자). 없으면 공개 샘플을 쓴다
const MODEL_FILES = { investor: "models/a.vrm", trustee: "models/b.vrm" };
const found = {};
// 압축본(.vrm.gz)이 있고 브라우저가 풀 수 있으면 그것을 받는다 (절반 크기)
const canGunzip = typeof DecompressionStream === "function";
export async function modelFor(role) {
  const file = MODEL_FILES[role] || MODEL_FILES.investor;
  if (!(file in found)) {
    const url = new URL("../" + file, import.meta.url).href;
    const ok = u => fetch(u, { method: "HEAD" }).then(r => r.ok).catch(() => false);
    found[file] = (async () => (canGunzip && await ok(url + ".gz")) ? url + ".gz" : (await ok(url)) ? url : SAMPLE_VRM)();
  }
  return found[file];
}

async function loadGz(loader, url, onProgress) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`모델 응답 ${r.status}`);
  const total = Number(r.headers.get("content-length")) || 0;
  let got = 0;
  const counted = r.body.pipeThrough(new TransformStream({ transform(c, ctl) { got += c.length; if (total) onProgress?.(got / total); ctl.enqueue(c); } }));
  // 서버가 이미 풀어서 보냈으면(gzip 인코딩) 그대로, 아니면 여기서 푼다
  const raw = await new Response(counted).arrayBuffer();
  const head = new Uint8Array(raw, 0, 2);
  const buf = head[0] === 0x1f && head[1] === 0x8b
    ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
    : raw;
  return loader.parseAsync(buf, url.slice(0, url.lastIndexOf("/") + 1));
}

export async function createVrmAvatar(box, url = SAMPLE_VRM, { onProgress, maxPixelRatio = 2 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(maxPixelRatio, window.devicePixelRatio || 1));
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  camera.position.set(0, 1.3, 2.0);
  camera.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d0, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1, 2, 2.5);
  scene.add(key);
  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box);
  fit();
  let alive = true, raf = 0;
  const kill = () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };

  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  let gltf;
  try { gltf = url.endsWith(".gz") ? await loadGz(loader, url, onProgress) : await loader.loadAsync(url, e => onProgress?.(e.total ? e.loaded / e.total : null)); }
  catch (e) { kill(); throw e; }
  if (!alive) return null;
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons?.(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse(o => { o.frustumCulled = false; });
  scene.add(vrm.scene);

  // 키가 모델마다 달라서 머리 높이에 맞춰 카메라를 둔다
  vrm.scene.updateMatrixWorld(true);
  const headY = vrm.humanoid.getRawBoneNode("head")?.getWorldPosition(new THREE.Vector3()).y || 1.39;
  camera.position.set(0, headY - 0.09, 2.0);
  camera.lookAt(0, headY - 0.19, 0);

  const bone = n => vrm.humanoid.getNormalizedBoneNode(n);
  const names = ["hips", "spine", "chest", "upperChest", "neck", "head",
    "leftUpperLeg", "leftLowerLeg", "rightUpperLeg", "rightLowerLeg",
    "leftUpperArm", "leftLowerArm", "leftHand", "rightUpperArm", "rightLowerArm", "rightHand"];
  for (const side of ["left", "right"]) {
    for (const f of FINGERS) for (const j of JOINTS) names.push(side + f + j);
    names.push(side + "ThumbMetacarpal", side + "ThumbProximal", side + "ThumbDistal");
  }
  const B = Object.fromEntries(names.map(n => [n, bone(n)]));
  const raw = n => vrm.humanoid.getRawBoneNode(n);
  const wpos = n => raw(n)?.getWorldPosition(new THREE.Vector3());
  // 차렷이 아닌 T 자세(불러온 그대로)에서 어깨 위치와 팔 길이를 잰다
  const REST = {};
  for (const side of ["left", "right"]) {
    const S = wpos(side + "UpperArm"), E = wpos(side + "LowerArm"), H = wpos(side + "Hand");
    REST[side] = { S, a: S.distanceTo(E), b: E.distanceTo(H) };
  }
  const height = headY;                    // 키 대신 머리 높이로 비례를 잡는다
  const target = new THREE.Object3D();
  scene.add(target);
  if (vrm.lookAt) vrm.lookAt.target = target;
  const has = n => !!vrm.expressionManager?.getExpression(n);
  const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
  // 위팔은 몸 기준 방향, 아래팔은 몸 기준 방향을 위팔 기준으로 바꿔서. 지금 자세에서 그 방향까지 e 만큼 돌린다
  function aimArm(side, upperDir, lowerDir, e) {
    const rest = V(side === "left" ? 1 : -1, 0, 0);
    const qU = new THREE.Quaternion().setFromUnitVectors(rest, upperDir);
    const qL = new THREE.Quaternion().setFromUnitVectors(rest, lowerDir.clone().applyQuaternion(qU.clone().invert()));
    B[side + "UpperArm"]?.quaternion.slerp(qU, e);
    B[side + "LowerArm"]?.quaternion.slerp(qL, e);
  }

  // 2관절 IK — 어깨 S 에서 손목 T 까지, 팔꿈치는 pole 쪽으로
  function reach(side, T, pole, e) {
    const { S, a, b } = REST[side];
    const d = T.clone().sub(S);
    const dist = Math.min(Math.max(d.length(), 0.05), a + b - 0.002);
    const dir = d.normalize();
    const along = (a * a + dist * dist - b * b) / (2 * dist);
    const h = Math.sqrt(Math.max(0, a * a - along * along));
    const pd = pole.clone().sub(S); pd.sub(dir.clone().multiplyScalar(pd.dot(dir))).normalize();
    const E = S.clone().add(dir.clone().multiplyScalar(along)).add(pd.multiplyScalar(h));
    const Tt = S.clone().add(dir.clone().multiplyScalar(dist));
    aimArm(side, E.clone().sub(S).normalize(), Tt.sub(E).normalize(), e);
  }
  const s1 = side => (side === "left" ? 1 : -1);
  // 손 방향 — 손가락(rest 에서 ±X)과 손등(rest 에서 +Y)을 원하는 방향으로 돌리는 회전을, 아래팔 기준으로 바꿔 넣는다
  function handPose(side, g, e) {
    const s = s1(side), hand = B[side + "Hand"], fore = B[side + "LowerArm"];
    if (!hand || !fore) return;
    const F = V(g.finger[0] * s, g.finger[1], g.finger[2]);
    const N = V(g.palm[0] * s, g.palm[1], g.palm[2]);
    const up = N.clone().negate().sub(F.clone().multiplyScalar(-N.dot(F))).normalize();   // 손등 방향, 손가락과 직각
    const m0 = new THREE.Matrix4().makeBasis(V(s, 0, 0), V(0, 1, 0), V(s, 0, 0).cross(V(0, 1, 0)));
    const m1 = new THREE.Matrix4().makeBasis(F, up, F.clone().cross(up));
    const qWorld = new THREE.Quaternion().setFromRotationMatrix(m1.multiply(m0.invert()));
    fore.updateWorldMatrix(true, false);
    const qParent = fore.getWorldQuaternion(new THREE.Quaternion());
    const qRoot = vrm.scene.getWorldQuaternion(new THREE.Quaternion());
    const local = qParent.invert().multiply(qRoot).multiply(qWorld);
    hand.quaternion.slerp(local, e);
  }
  function curl(side, amount, keepLittle) {
    const s = s1(side);
    for (const f of FINGERS) {
      if (keepLittle && f === "Little") continue;
      for (const j of JOINTS) B[side + f + j]?.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.45 * s), amount);
    }
    B[side + "ThumbProximal"]?.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.9 * s), amount);
    B[side + "ThumbDistal"]?.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6 * s), amount);
  }
  // 손목 목표 — w 는 손목의 좌우 위치(절반 간격)
  const wrist = (side, g, w) => {
    const S = REST[side].S;
    return new THREE.Vector3(s1(side) * w, S.y + g.y * height, S.z + g.z * height);
  };
  const POLE = {
    clap: side => new THREE.Vector3(s1(side) * 0.6, REST[side].S.y - 0.6, -0.1),
    heart: side => new THREE.Vector3(s1(side) * 0.8, REST[side].S.y + 0.1, -0.3),
    promise: side => new THREE.Vector3(s1(side) * 0.6, REST[side].S.y - 0.5, -0.1),
    hip: side => new THREE.Vector3(s1(side) * 0.9, REST[side].S.y - 0.2, -0.5),
  };
  function twoHands(id, w, e) {
    const g = GEST[id];
    for (const side of ["left", "right"]) {
      reach(side, wrist(side, g, w), POLE[id](side), e);
      handPose(side, g, e);
    }
  }
  // 불러올 때 한 번 — 손끝(가운데 손가락 끝)이 가운데서 meet 만큼 떨어지도록 손목 간격을 찾는다
  const tip = side => wpos(side + "MiddleDistal") || wpos(side + "Hand");
  const WRIST = {};
  for (const id of ["clap", "heart"]) {
    let w = 0.08;
    for (let it = 0; it < 6; it++) {
      for (const n of names) B[n]?.quaternion.identity();
      twoHands(id, w, 1);
      vrm.humanoid.update(); vrm.scene.updateMatrixWorld(true);
      const gap = (tip("left").x - tip("right").x) / 2;
      w += GEST[id].meet - gap;
    }
    WRIST[id] = w;
  }
  for (const n of names) B[n]?.quaternion.identity();

  // 기대기용 기둥 — 왼쪽 어깨 옆(보는 사람의 오른쪽)에, 기댈 때만 나타난다
  const hipsY = wpos("hips")?.y || height * 0.6;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.6, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.9, transparent: true, opacity: 0 }));
  pillar.position.set(REST.left.S.x + 0.32, 1.3, -0.06);
  scene.add(pillar);
  // 앉기용 의자 — 등받이가 몸 뒤로 보여야 앉은 줄 안다
  const sitDrop = hipsY * 0.46;
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4f, roughness: 0.8, transparent: true, opacity: 0 });
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.5), wood);
  seat.position.set(0, hipsY - sitDrop - 0.07, 0.08);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.06), wood);
  back.position.set(0, hipsY - sitDrop + 0.27, -0.2);
  chair.add(seat, back);
  scene.add(chair);
  const cam0 = { y: camera.position.y, look: headY - 0.19 };

  // 남는 상태
  const st = { face: "neutral", gaze: "gaze_on", body: "stand" };
  const cur = { sit: 0, wall: 0, happy: 0, angry: 0, sad: 0, relaxed: 0, gazeOff: 0 };
  const moves = [];                        // { id, t0 }
  let blinkAt = 2, blinkT = -1;
  const clock = new THREE.Clock();
  let t = 0;

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    const k = 1 - Math.pow(0.002, dt);      // 부드럽게 따라가기
    const kb = 1 - Math.pow(0.02, dt);      // 앉고 기대는 것은 조금 천천히
    cur.sit = ease(cur.sit, st.body === "sit" ? 1 : 0, kb);
    cur.wall = ease(cur.wall, st.body === "wall" ? 1 : 0, kb);
    cur.gazeOff = ease(cur.gazeOff, st.gaze === "gaze_off" ? 1 : 0, k);
    const faceT = { smile: { happy: 1 }, frown: { angry: 1 }, neutral: {} }[st.face];
    for (const e of ["happy", "angry", "sad", "relaxed"]) cur[e] = ease(cur[e], faceT[e] || 0, k);

    // 기본 자세 — 팔을 내리고, 숨쉬기
    const breath = Math.sin(t * 1.6);
    const pose = {
      leftUpperArm: [0, 0, -1.22], rightUpperArm: [0, 0, 1.22],
      leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0],
      spine: [0.02 * breath + cur.sit * 0.06, 0, cur.wall * -0.05], chest: [0.015 * breath, 0, 0],
      neck: [0, 0, 0], head: [0, cur.gazeOff * 0.35, cur.gazeOff * 0.05 + cur.wall * 0.16],
      hips: [0, Math.sin(t * 0.5) * 0.02 * (1 - cur.sit), cur.wall * -0.13],
      // 앉기 — 허벅지를 앞으로, 무릎을 굽히고, 손은 무릎 위에
      leftUpperLeg: [-1.5 * cur.sit, 0, cur.wall * 0.13], rightUpperLeg: [-1.5 * cur.sit, 0, cur.wall * 0.13],
      leftLowerLeg: [1.5 * cur.sit, 0, 0], rightLowerLeg: [1.5 * cur.sit, 0, 0],
    };
    pose.leftUpperArm[0] -= 0.55 * cur.sit; pose.rightUpperArm[0] -= 0.55 * cur.sit;
    pose.leftLowerArm[0] -= 0.5 * cur.sit; pose.rightLowerArm[0] -= 0.5 * cur.sit;
    let lookX = cur.gazeOff * 1.6, lookY = 0, rootY = -cur.sit * sitDrop, rootZ = 0, rootX = cur.wall * 0.06, hands = null;
    const add = (n, x = 0, y = 0, z = 0) => { const p = pose[n] ||= [0, 0, 0]; p[0] += x; p[1] += y; p[2] += z; };

    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i], p = (t - m.t0) / MOVES[m.id];
      if (p >= 1) { moves.splice(i, 1); continue; }
      const e = env(p);
      if (m.id === "nod") { add("head", Math.sin(p * Math.PI * 4) ** 2 * 0.32 * e); add("neck", Math.sin(p * Math.PI * 4) ** 2 * 0.12 * e); }
      if (m.id === "shake") add("head", 0, Math.sin(p * Math.PI * 4) * 0.42 * e);
      if (m.id === "look") { const s = Math.sin(p * Math.PI * 2); add("head", 0, s * 0.5 * e); add("neck", 0, s * 0.2 * e); lookX += s * 2.5 * e; }
      if (m.id === "wave") {
        add("rightUpperArm", 0, 0.25 * e, -1.85 * e);
        add("rightLowerArm", 0, 0, (-1.0 + Math.sin(p * Math.PI * 8) * 0.4) * e);
        add("head", 0, 0, -0.06 * e);
      }
      if (m.id === "clap") hands = { id: "clap", e: Math.min(1, e * 1.6), w: WRIST.clap + Math.max(0, Math.sin(p * Math.PI * 10)) * GEST.clap.open };
      if (m.id === "heart") { hands = { id: "heart", e: Math.min(1, e * 1.8), w: WRIST.heart }; add("head", 0, 0, Math.sin(p * Math.PI * 2) * 0.08 * e); }
      if (m.id === "promise") hands = { id: "promise", e: Math.min(1, e * 1.8) };
      if (m.id === "jump") { rootY += Math.abs(Math.sin(p * Math.PI * 2)) * 0.22; add("leftUpperArm", 0, 0, 0.5 * e); add("rightUpperArm", 0, 0, -0.5 * e); }
    }
    for (const [n, r] of Object.entries(pose)) B[n]?.rotation.set(r[0], r[1], r[2]);
    // 손가락은 매 프레임 펴 둔다 (약속 동작에서만 접는다)
    for (const side of ["left", "right"]) for (const f of FINGERS) for (const j of JOINTS) B[side + f + j]?.quaternion.identity();
    for (const side of ["left", "right"]) for (const j of ["Metacarpal", "Proximal", "Distal"]) B[side + "Thumb" + j]?.quaternion.identity();
    // 두 손 동작 (모델은 +Z 를 보고, 왼팔은 +X 쪽)
    if (hands?.id === "clap" || hands?.id === "heart") twoHands(hands.id, hands.w, hands.e);
    if (hands?.id === "promise") {
      // 오른손을 얼굴 옆으로 들고 새끼손가락만 세운다
      const g = GEST.promise, S = REST.right.S;
      reach("right", new THREE.Vector3(S.x * 0.8, S.y + g.y * height, S.z + g.z * height), POLE.promise("right"), hands.e);
      handPose("right", g, hands.e);
      curl("right", hands.e, true);
    }
    // 기대기 — 오른손은 허리에
    if (cur.wall > 0.01 && !hands) {
      const S = REST.right.S;
      reach("right", new THREE.Vector3(S.x * 0.95, hipsY + 0.06 * height, S.z + 0.04), POLE.hip("right"), cur.wall);
      handPose("right", GEST.hip, cur.wall);
    }
    pillar.material.opacity = cur.wall;
    pillar.visible = cur.wall > 0.01;
    // 앉으면 카메라도 따라 내려간다 (얼굴이 화면 안에 있게)
    wood.opacity = cur.sit;
    chair.visible = cur.sit > 0.01;
    const dropY = cur.sit * hipsY * 0.24;
    camera.position.y = cam0.y - dropY;
    camera.lookAt(0, cam0.look - dropY, 0);
    vrm.scene.position.set(rootX, rootY, rootZ);
    target.position.set(camera.position.x + lookX, camera.position.y + lookY, camera.position.z);

    // 표정 · 눈 깜빡임
    if (vrm.expressionManager) {
      for (const e of ["happy", "angry", "sad", "relaxed"]) if (has(e)) vrm.expressionManager.setValue(e, cur[e]);
      if (t > blinkAt && blinkT < 0) blinkT = 0;
      let blink = 0;
      if (blinkT >= 0) { blinkT += dt; blink = env(blinkT / 0.16); if (blinkT > 0.16) { blinkT = -1; blinkAt = t + 2 + Math.random() * 3; } }
      if (has("blink")) vrm.expressionManager.setValue("blink", cur.happy > 0.5 ? 0 : blink);
    }
    vrm.update(dt);
    renderer.render(scene, camera);
    if (alive) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    vrm,
    dispose() { kill(); VRMUtils.deepDispose(vrm.scene); },
    // 시험용 — 움직임 중간을 멈춰 볼 수 있게 시간을 옮긴다
    _wrist: WRIST,
    _seek(id, p) { moves.length = 0; moves.push({ id, t0: t - MOVES[id] * p }); },
    apply(cueId) {
      const c = cueById[cueId];
      if (!c) return;
      if (c.keep === "face") st.face = cueId;
      else if (c.keep === "gaze") st.gaze = cueId;
      else if (c.keep === "body") st.body = cueId;
      else { for (let i = moves.length - 1; i >= 0; i--) if (moves[i].id === cueId) moves.splice(i, 1); moves.push({ id: cueId, t0: t }); }
    },
    state: st,
  };
}

/* ── 시제품 페이지(vrm.html) ── */
const stage = document.getElementById("stage3d");
if (stage && document.getElementById("cues")) {
  const load = document.getElementById("load");
  const cues = document.getElementById("cues");
  cues.innerHTML = CUE_GROUPS.map(g => `<div class="cuegrp"><h4>${g.label}</h4><div class="row">${g.cues.map(c => `<button class="cue" data-cue="${c.id}">${c.label}</button>`).join("")}</div></div>`).join("");
  createVrmAvatar(stage, SAMPLE_VRM, { onProgress: p => { if (p !== null) load.textContent = `아바타 불러오는 중… ${Math.round(p * 100)}%`; } })
    .then(av => {
      load.remove();
      window.__av = av;
      cues.onclick = e => {
        const b = e.target.closest(".cue");
        if (!b) return;
        av.apply(b.dataset.cue);
        const k = cueById[b.dataset.cue].keep;
        if (k) cues.querySelectorAll(".cue").forEach(x => { if (cueById[x.dataset.cue].keep === k) x.classList.toggle("on", x === b); });
      };
    })
    .catch(e => { load.textContent = "불러오기 실패 — " + e.message; console.error(e); });
}
