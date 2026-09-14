// 로블록스식 블록 인형. Tripo GLB가 도착하기 전까지 이 인형이 모든 배역을 맡는다.
// 몸짓이 곧 대사인 장이라, 갸웃·끄덕·기뻐 뛰기·가슴 치기·비비기·기침을 넣었다.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeRig } from "./rig.js";

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
export const loader = new GLTFLoader();

export async function trySwapGLB(A, url) {
  let gltf;
  try {
    const head = await fetch(url, { method: "HEAD" });
    const type = head.headers.get("content-type") || "";
    if (!head.ok || type.includes("text/html")) return false;     // 없는 파일
    gltf = await loader.loadAsync(url);
  } catch (e) { return false; }

  const model = gltf.scene;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    // 믹사모 FBX 를 거쳐 오면 재질이 「금속 100% · 반투명」으로 잡힌다. 비출 주변 환경이 없는
    // 이 화면에서 금속은 새까맣게 보이고, 반투명은 몸이 겹쳐 비친다. 천·피부로 되돌린다.
    for (const m of [].concat(o.material)) {
      if (!m) continue;
      m.metalness = 0;
      m.roughness = Math.max(0.7, m.roughness ?? 0.8);
      m.metalnessMap = null;
      if ("specularIntensity" in m) m.specularIntensity = 0.3;
      m.transparent = false; m.opacity = 1; m.depthWrite = true;
      m.needsUpdate = true;
    }
  });
  // 키는 뼈대가 움직인 뒤의 실제 몸으로 잰다. 뼈대 전 원본으로 재면 믹사모(센티미터 단위) 모델은
  // 엉뚱하게 작게 잡혀, 목표 키에 맞추느라 거인이 된다.
  model.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(model, true);
  const h = bb.max.y - bb.min.y || 1;
  const s = A.height / A.root.scale.y / h;
  const waist = A.height / A.root.scale.y * 0.42;
  model.scale.setScalar(s);
  model.position.y = -bb.min.y * s - waist;
  const holder = new THREE.Group();          // 허리 높이 받침 — 뼈대가 없는 모델은 여기서 기울이고 뛴다
  holder.position.y = waist;
  holder.add(model);
  A.body.visible = false;
  A.root.add(holder);

  const rig = makeRig(model);                  // 뼈대가 있으면 팔다리를 직접 움직일 수 있다

  /* ── 동작 클립 (믹사모에서 받은 것) ─────────────────── */
  const clips = {};
  for (const c of gltf.animations || []) {
    const n = c.name.toLowerCase();
    const k = /idle|breath/.test(n) ? "idle" : /walk/.test(n) ? "walk" : /talk|argu/.test(n) ? "talk"
            : /cheer/.test(n) ? "cheer" : /victor/.test(n) ? "victory" : /jump/.test(n) ? "jump"
            : /danc/.test(n) ? "dance" : /punch/.test(n) ? "punch" : null;
    if (k && !clips[k]) clips[k] = c;
  }
  if (clips.walk) stripRootMotion(clips.walk);   // 앞으로 나아가는 이동은 게임이 맡는다
  const mixer = Object.keys(clips).length ? new THREE.AnimationMixer(model) : null;
  const act = {};
  if (mixer) for (const [k, c] of Object.entries(clips)) act[k] = mixer.clipAction(c);
  if (act.idle) act.idle.play();
  if (act.walk) { act.walk.play(); act.walk.setEffectiveWeight(0); }
  if (act.talk) { act.talk.play(); act.talk.setEffectiveWeight(0); }   // 이 사람이 말하는 동안만 켠다
  const joy = act.cheer || act.victory || act.jump || act.dance || null;   // 알아들었을 때 한 번
  if (joy) { joy.setLoop(THREE.LoopOnce, 1); joy.clampWhenFinished = false; }

  // 믹사모 동작은 뼈 위치까지 움직여 몸 크기가 달라진다. 동작을 한 번 걸어 본 자세로 키를 다시 잰다.
  if (mixer) {
    mixer.update(0);
    holder.remove(model);
    model.scale.setScalar(1); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(model, true);
    const s2 = A.height / A.root.scale.y / ((b2.max.y - b2.min.y) || 1);
    model.scale.setScalar(s2);
    model.position.y = -b2.min.y * s2 - waist;
    holder.add(model);

    // 옷자락이 땅에 끌리는 모델(수도원장·문지기·수도승)은 겉모습 맨 아래가 옷단이라 발이 떠 보인다.
    // 발가락 뼈 높이로 한 번 더 맞춘다 — 보통 캐릭터는 발가락 뼈가 키의 0.7% 쯤에 있다.
    const toes = [];
    model.traverse(o => { if (o.isBone && /(toebase|toe_end|foot)$/i.test(o.name)) toes.push(o); });
    if (toes.length) {
      A.root.updateMatrixWorld(true);
      const v = new THREE.Vector3(), baseY = A.root.getWorldPosition(v).y;
      const low = Math.min(...toes.map(b => b.getWorldPosition(v).y)) - baseY;
      const want = A.height * 0.007;
      if (Math.abs(low - want) > A.height * 0.006) model.position.y -= (low - want) / (A.root.scale.y || 1);
    }
  }

  // 클립이 없을 때만 — 가만히 선 자세의 발목 높이를 재어 두고 걸을 때 발을 땅에 붙인다
  const feet = (!mixer && rig) ? ["lFoot", "rFoot", "lShin", "rShin"].map(k => rig.bones[k]).filter(Boolean) : [];
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  let restAnkle = 0;
  if (feet.length) {
    A.root.updateMatrixWorld(true);
    const rootY = A.root.getWorldPosition(vA).y;
    restAnkle = Math.min(...feet.map(b => b.getWorldPosition(vB).y)) - rootY;
  }

  let breathe = Math.random() * 10, prevG = null;
  // 대본이 켜고 끄는 동작 — 후드 쓴 자의 주먹질처럼 서 있기·걷기 대신 되풀이한다
  let special = null, spAct = null, spW = 0, tW = 0;
  A.glb = {
    rigged: !!rig, clips: Object.keys(clips),
    /** 이름 붙은 동작을 되풀이한다. null 이면 서 있기로 돌아온다 */
    action(name) {
      const a = name ? act[name] || null : null;
      if (a === special) return;
      if (a) {
        if (spAct && spAct !== a) spAct.stop();
        a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(spW); a.play();
        spAct = a;
      }
      special = a;
    },
    /** 이름 붙은 동작을 한 번만 — 끝나면 풀린다 */
    once(name) {
      const a = act[name];
      if (!a) return Promise.resolve();
      A.glb.action(name);
      return new Promise(r => setTimeout(() => { A.glb.action(null); r(); }, a.getClip().duration * 1000));
    },
    update(dt, speed, yaw, g, phase) {
      breathe += dt;
      const gName = g ? g.name : null;

      if (mixer) {
        // 알아들었을 때 — 기뻐하는 클립을 처음부터 한 번
        if (gName === "joy" && prevG !== "joy" && joy) joy.reset().setEffectiveWeight(1).fadeIn(0.15).play();
        const joyOn = !!(joy && joy.isRunning());
        spW += ((special ? 1 : 0) - spW) * Math.min(1, dt * 8);
        if (spAct) {
          spAct.setEffectiveWeight(spW);
          if (!special && spW < 0.01) { spAct.stop(); spAct = null; }
        }
        yaw *= 1 - spW;                          // 주먹질하는 동안엔 고개를 따로 돌리지 않는다
        const k = Math.min(1, speed / 2.2), base = (joyOn ? 0.1 : 1) * (1 - spW);
        // 대사창에 이 사람 이름이 뜨면 말하는 동작으로 — A.talking 은 main.js 가 켜고 끈다
        tW += ((A.talking && act.talk && speed < 0.3 ? 1 : 0) - tW) * Math.min(1, dt * 5);
        if (act.walk) act.walk.setEffectiveWeight(k * base);
        if (act.talk) act.talk.setEffectiveWeight((1 - k) * base * tW);
        if (act.idle) act.idle.setEffectiveWeight((act.walk ? 1 - k : 1) * base * (act.talk ? 1 - tW : 1));
        if (act.walk) act.walk.timeScale = speed > 0.15 ? Math.max(0.7, Math.min(1.6, speed / 2.6)) : 1;
        if (rig) rig.reset();
        mixer.update(dt);
        if (rig) {                             // 클립 위에 고개 돌리기와 몸짓을 얹는다
          rig.begin();
          rig.look(yaw * 0.8);
          if (g && !(gName === "joy" && joy)) rig.gesture(g.name, g.t, g.e);
          rig.applyAdditive();
        }
        holder.position.y = waist; holder.rotation.set(0, 0, 0); holder.scale.set(1, 1, 1);
        prevG = gName;
        return;
      }

      if (rig) {                               // 뼈만 있으면 뼈로 걷고 몸짓한다
        rig.begin();
        if (phase !== null) rig.walk(phase, Math.min(1, speed / 3));
        else rig.idle(breathe);
        rig.look(yaw);
        if (g) rig.gesture(g.name, g.t, g.e);
        rig.apply();
      }

      // 뼈대도 클립도 없는 조각상 — 몸 전체로 몸짓한다
      let rx = 0, ry = 0, rz = 0, y = waist, sq = 1;
      if (!rig) {
        if (phase !== null) { rz = 0.07 * Math.sin(phase); y += Math.abs(Math.sin(phase)) * 0.06; }
        else sq = 1 + 0.012 * Math.sin(breathe * 1.8);
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
      }
      holder.position.y = y;
      holder.rotation.set(rx, ry + (rig ? 0 : yaw * 0.7), rz);
      holder.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

      if (feet.length) {                       // 다리를 접은 만큼 몸을 낮춘다 — 허공을 걷지 않게
        A.root.updateMatrixWorld(true);
        const rootY = A.root.getWorldPosition(vA).y;
        const low = Math.min(...feet.map(b => b.getWorldPosition(vB).y)) - rootY;
        holder.position.y += (restAnkle - low) / (A.root.scale.y || 1);
      }
      if (rig && gName === "joy") holder.position.y += Math.abs(Math.sin(g.t * 9)) * 0.3 * g.e;
      prevG = gName;
    },
  };
  return true;
}

/** 믹사모 걷기에는 앞으로 나아가는 이동이 들어 있다. 가장 크게 움직이는 축을 첫 값에 묶는다. */
function stripRootMotion(clip) {
  const t = clip.tracks.find(tr => /hips/i.test(tr.name) && tr.name.endsWith(".position"));
  if (!t) return;
  const v = t.values, n = v.length / 3;
  const span = c => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { const x = v[i * 3 + c]; if (x < lo) lo = x; if (x > hi) hi = x; }
    return hi - lo;
  };
  const spans = [0, 1, 2].map(span);
  const best = spans.indexOf(Math.max(...spans));
  const other = Math.max(...spans.filter((_, c) => c !== best));
  if (spans[best] < other * 4) return;         // 제자리 걷기라면 건드리지 않는다
  const first = v[best];
  for (let i = 0; i < n; i++) v[i * 3 + best] = first;
}
