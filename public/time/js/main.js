// 활자의 문 — 본체. 그리기, 걷기, 카메라, 그리고 퀘스트 대본이 쓰는 도우미들.
import * as THREE from "three";
import { buildWorld, heightAt, VILLAGE, SPAWN } from "./world.js";
import { makeAvatar, trySwapGLB } from "./avatar.js";
import { Input } from "./input.js";
import { Talk } from "./talk.js";
import { audio } from "./audio.js";
import { makeFire, makeSparkle } from "./fx.js";
import { chapter1 } from "./ch1.js";
import { chapter2 } from "./ch2.js";
import { saveRun } from "../../js/firebase.js";   // 2주차 거실과 같은 저장 통로 — 끊겨도 담아 두었다 다시 보낸다

const $ = s => document.querySelector(s);

/* ── 그리기 ─────────────────────────────────────────── */
const canvas = $("#view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const touchy = matchMedia("(pointer: coarse)").matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, touchy ? 1.4 : 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#dfe3cb", 38, 135);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 700);

scene.add(new THREE.HemisphereLight("#dcecff", "#6f5a3c", 1.15));
const sun = new THREE.DirectionalLight("#fff0d4", 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(touchy ? 1024 : 2048, touchy ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 140 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

/* ── 세상과 사람들 ──────────────────────────────────── */
const world = buildWorld(scene);
const colliders = world.colliders;

function spawnActor(opts, x, z, faceYaw = 0) {
  const a = makeAvatar(opts);
  a.root.position.set(x, heightAt(x, z), z);
  a.root.rotation.y = faceYaw;
  scene.add(a.root);
  return { avatar: a, get pos() { return a.root.position; }, path: null };
}

// 우리 넷 — 박물관에서 함께 빨려 들어온 조원들. 그중 하나를 조종한다.
const CREW = [
  { name: "남색",  shirt: "#2f4a78", pants: "#3a3f4a", hair: "#1f1712" },
  { name: "빨강",  shirt: "#b0503a", pants: "#3a3f4a", hair: "#3a2616" },
  { name: "노랑",  shirt: "#e0c35a", pants: "#444444", hair: "#140f0b" },
  { name: "초록",  shirt: "#4f8a6a", pants: "#2e3540", hair: "#5a3a22" },
];
const SPOTS = [[0, -2], [-2.3, -1.5], [2.3, -1.5], [-3.4, -0.1]];
const crew = CREW.map((c, i) =>
  spawnActor(c, SPAWN.x + SPOTS[i][0], SPAWN.z + SPOTS[i][1], Math.PI));
// 고를 수 있는 넷. student1~4.glb 가 있으면 각각, 없으면 student.glb 하나로, 그것도 없으면 블록 인형.
crew.forEach((a, i) =>
  trySwapGLB(a.avatar, `models/student${i + 1}.glb`)
    .then(ok => ok || trySwapGLB(a.avatar, "models/student.glb")));

let player = crew[0];
const mates = [];                 // 조원은 한 조에 한 화면이라 실제로 들어가는 사람은 하나다
let talkingNow = false;           // 매 프레임 tick() 이 채운다

/** 누가 들어갈지 정한다. 고른 사람만 숲에 서고 나머지는 보이지 않는다. */
function pickCrew(i) {
  player = crew[i];
  crew.forEach((a, k) => {
    a.avatar.root.visible = k === i;
    if (k !== i) a.pos.set(SPAWN.x, -50, SPAWN.z);        // 멀리 치워 부딪히지 않게
  });
  player.pos.set(SPAWN.x, heightAt(SPAWN.x, SPAWN.z - 2), SPAWN.z - 2);
  player.avatar.root.rotation.y = Math.PI;
}
pickCrew(0);

// 마을 사람들 — 가죽옷 빛깔. 키 순서는 아빠 > 할아버지 > 엄마 = 학생 > 누
const hide = "#8a6a45", hide2 = "#7a5536";
const npc = {
  nu: spawnActor({ skin: "#c89067", shirt: hide, pants: hide2, hair: "#241710", scale: 0.84,
    extra: ({ torso, box }) => { const p = box(0.22, 0.2, 0.12, "#5a3d25"); p.position.set(0.3, -0.35, 0.26); torso.add(p); } },
    4.2, 23.3, Math.PI * 0.9),
  elder: spawnActor({ skin: "#b98a66", shirt: "#6e5a44", pants: "#5c4a37", hair: "#cfcac2", beard: "#d8d3ca", scale: 1.05 },
    VILLAGE.x - 4.2, VILLAGE.z - 2.2, 0.9),
  woman: spawnActor({ skin: "#c4906a", shirt: "#9a7650", pants: "#7a5a3a", hair: "#2a1a10", scale: 1.0 },
    VILLAGE.x + 5, VILLAGE.z - 3.5, -1.0),
  hunter: spawnActor({ skin: "#b9835c", shirt: "#6d5a3e", pants: "#5a4530", hair: "#1d140d", beard: "#2a1d12", scale: 1.12 },
    VILLAGE.x + 3.5, VILLAGE.z + 4.5, -2.4),
  kid: spawnActor({ skin: "#c89067", shirt: "#a0805a", pants: hide2, hair: "#2e1d12", scale: 0.62 },
    VILLAGE.x - 3, VILLAGE.z + 4, 2.4),
  // 2장 숲길의 후드 쓴 자 — 1장 동안에는 지도 밖에서 기다린다
  villain: spawnActor({ skin: "#c9a080", shirt: "#1d1a1a", pants: "#1a1716", hair: "#111111", scale: 1.1 },
    58, 58, 0),
};

// Tripo 모델이 폴더에 있으면 갈아 끼운다. 없으면 블록 인형 그대로.
// 교수님이 믹사모로 만든 모델 — 할아버지는 granpa, 엄마는 mama, 아빠(사냥꾼)는 papa, 후드 쓴 자는 villain
const GLB = { nu: "nu", elder: "granpa", woman: "mama", hunter: "papa", kid: "kid", villain: "villain" };
for (const [k, f] of Object.entries(GLB)) if (npc[k]) trySwapGLB(npc[k].avatar, `models/${f}.glb`);

const fire = makeFire(scene, world.firePit.position.clone().add(new THREE.Vector3(0, 0.1, 0)));

/* ── 도우미 — 퀘스트 대본이 부르는 것들 ─────────────────── */
const input = new Input(canvas, $("#stick"), $("#knob"), $("#act"));
const talk = new Talk();
talk.voices = { "빠른 발 누": 560, "할아버지": 200, "후드 쓴 자": 150, "수도원장": 230, "옆 수도원 문지기": 280 };

const waits = [];            // until() 대기열 — 매 프레임 조건을 본다
const reach = [];            // interact() 대기열 — 가까이 가서 행동 단추를 누르면 풀린다
let locked = false;
let focus = null, wasTalking = false;      // 대화 상대 — 이 사람과 우리를 어깨너머로 함께 잡는다
let shot = null;                           // 연출 카메라 — { pos, at } 가 있으면 그 자리에서 그곳을 본다

const G = {
  scene, world, talk, input, npc, fire, stats: {},
  get player() { return player; },
  pathToVillage: [],
  objective(t) { $("#objective").textContent = t; },
  misses: 0,
  missLabel: "말이 안 통한 횟수",             // 장마다 다르게 센다 — 2장은 빼앗긴 편지
  /** 말이 통하지 않았다 — 몇 번째인지 화면에 남긴다 */
  miss(why = "말이 통하지 않았다", sub = "누가 알아듣지 못했습니다") {
    G.misses++;
    const m = $("#misses");
    m.hidden = false;
    m.textContent = `${G.missLabel} ${G.misses}`;
    G.toast(why, "bad", sub || "누가 알아듣지 못했습니다");
  },
  hit(msg = "통했다") { G.toast(msg, "good"); },
  toast(text, kind, sub = "") {
    const t = $("#toast");
    t.className = kind;
    t.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
    t.hidden = false;
    clearTimeout(G._toast);
    G._toast = setTimeout(() => { t.hidden = true; }, 1600);
  },
  lock(v) { locked = v; },
  wait: s => new Promise(r => setTimeout(r, s * 1000)),
  until: pred => new Promise(res => waits.push({ pred, res })),
  near: (a, p, r) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r,
  interact(target, label, radius = 2.9) {
    return new Promise(res => reach.push({ target, label, radius, res }));
  },
  /** 사람을 길을 따라 걷게 한다. follow 가 멀리 처지면 서서 기다린다. */
  walkTo(a, points, speed = 3, follow = null) {
    return new Promise(res => { a.path = { pts: points.map(p => p.clone()), i: 0, speed, follow, res }; });
  },
  /** 말하는 두 사람이 마주 본다 */
  async faceEachOther(a) {
    focus = a;
    const p = player.pos;
    const yaw = Math.atan2(a.pos.x - p.x, a.pos.z - p.z);
    player.avatar.root.rotation.y = yaw;
    a.avatar.lookAt(p);
    await G.wait(0.15);
  },
  /** 연출 카메라. null 이면 평소대로 돌아온다 */
  shot(pos, at) { shot = pos ? { pos: pos.clone(), at: at.clone() } : null; },
  besideFire(r) {
    const d = new THREE.Vector3(player.pos.x - VILLAGE.x, 0, player.pos.z - VILLAGE.z).normalize();
    return new THREE.Vector3(VILLAGE.x + d.x * r, 0, VILLAGE.z + d.z * r);
  },
  /** 마른 막대 가운데 하나를 주울 때까지 */
  async pickStick() {
    world.sticks.forEach(s => (s.material.emissive.set("#6b4a10")));
    const hit = await Promise.race(world.sticks.map(s => G.interact({ pos: s.position }, "막대 줍기", 2.4).then(() => s)));
    reach.length = 0;
    world.sticks.forEach(s => s.material.emissive.set("#000000"));
    hit.visible = false;
    audio.chime();
  },
  /** 불이 붙으면 마을 사람들이 불가로 둘러앉는다 — 한자리에서 함께 듣는 부족 */
  async gather() {
    const ring = ["elder", "woman", "hunter", "kid"];
    await Promise.all(ring.map((k, i) => {
      const a = (i / ring.length) * Math.PI * 2 + 1.48;     // 연출 카메라 쪽(약 0.7 라디안)은 비워 둔다
      const p = new THREE.Vector3(VILLAGE.x + Math.sin(a) * 2.6, 0, VILLAGE.z + Math.cos(a) * 2.6);
      return G.walkTo(npc[k], [p], 2.2).then(() => npc[k].avatar.lookAt(world.firePit.position));
    }));
  },
  /** 불 속에서 활자가 떠올라 빛난다 */
  async typeGlow() {
    const stone = world.typeStone;
    stone.position.copy(world.firePit.position).add(new THREE.Vector3(0, 1.8, 0));
    const sp = makeSparkle(scene, stone.position.clone().add(new THREE.Vector3(0, -0.6, 0)));
    sp.level = 1; sparkles.push(sp);
    audio.shimmer();
    for (let i = 0; i < 60; i++) { stone.position.y += 0.02; await G.wait(0.03); }
    await G.wait(1.2);
  },

  /* ── 현황판으로 보내기 · 2장 연출 ─────────────────────── */
  team: "",
  /** 한 사건을 현황판으로 — 끊겨도 담아 두었다 다시 보낸다 */
  log(row) { if (G.team) saveRun({ team: G.team, ...row }, "time"); },
  chapter(t) { $("#chapname").textContent = t; $("#misses").hidden = true; G.misses = 0; },
  /** 원시 마을을 치운다 — 2장은 중세 숲길 */
  enterMedieval() {
    for (const [k, o] of Object.entries(npc)) if (k !== "villain") { o.path = null; o.pos.set(60 + Math.random() * 2, 0, -60); }
    for (const h of world.huts || []) if (h && h.isObject3D) h.visible = false;
    world.firePit.visible = false;
    world.sticks.forEach(s => (s.visible = false));
    fire.setLevel(0); audio.fire?.(false);
    world.typeStone.position.set(0, -50, 0);
    sparkles.forEach(s => (s.level = 0));
    G.fireLit = true;                          // 마을 사람들이 우리를 돌아보는 버릇을 끈다
  },
  /** 편지를 품고 숲길 들머리에 선다. 후드 쓴 자는 길 한가운데 나무 사이에 */
  placeForest() {
    player.pos.set(SPAWN.x, 0, SPAWN.z - 2);
    player.avatar.root.rotation.y = Math.PI;
    player.avatar.root.visible = true;
    input.yaw = 0;
    const h = npc.villain;
    h.path = null;
    h.pos.set(2.4, 0, 10);
    h.avatar.root.rotation.y = 0;
    h.avatar.glb?.action(null);
  },
  /** 편지를 빼앗겼다 — 후드 쓴 자는 숲 밖으로 사라진다 */
  backToAbbey() { npc.villain.pos.set(58, 0, 58); G.shot(null); player.avatar.root.visible = true; },
  faceTo(a, p) { a.avatar.root.rotation.y = Math.atan2(p.x - a.pos.x, p.z - a.pos.z); a.avatar.lookAt(p); },
  /** 말하는 사람을 화면 가득 — null 이면 평소 카메라 */
  closeUp(a) {
    if (!a) { G.shot(null); player.avatar.root.visible = true; return; }
    const f = a.avatar.root.rotation.y, h = a.avatar.height;
    const base = a.pos.clone();
    G.shot(base.clone().add(new THREE.Vector3(Math.sin(f) * 2.3 + Math.cos(f) * 0.5, h * 0.82, Math.cos(f) * 2.3 - Math.sin(f) * 0.5)),
           base.clone().add(new THREE.Vector3(0, h * 0.74, 0)));
    player.avatar.root.visible = false;        // 우리 머리가 화면을 가리지 않게
  },
  aside: new THREE.Vector3(4.5, 0, -1.5),
  gatePos: new THREE.Vector3(-0.9, 0, -2.5),
  gateSpark: null,
  showGate() {
    const p = G.gatePos, stone = world.typeStone;
    stone.position.set(p.x, heightAt(p.x, p.z) + 1.1, p.z);
    if (!G.gateSpark) { G.gateSpark = makeSparkle(scene, stone.position.clone()); sparkles.push(G.gateSpark); }
    G.gateSpark.level = 0.5;
  },
  async gateGlow() {
    const stone = world.typeStone;
    if (G.gateSpark) G.gateSpark.level = 1;
    audio.shimmer();
    G.shot(stone.position.clone().add(new THREE.Vector3(3.2, 1.6, 4.2)), stone.position.clone());
    for (let i = 0; i < 60; i++) { stone.position.y += 0.02; await G.wait(0.03); }
    await G.wait(1.2);
    G.shot(null);
  },
};
const sparkles = [];

// 누가 마을로 가는 오솔길
for (let z = 21; z >= -3; z -= 3) G.pathToVillage.push(new THREE.Vector3(2.6 * Math.sin(z * 0.12), 0, z));
G.pathToVillage.push(new THREE.Vector3(VILLAGE.x + 1.8, 0, VILLAGE.z + 3.8));

/* ── 한 프레임 ─────────────────────────────────────── */
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), camLook = new THREE.Vector3(0, 1, 30);
let camInit = false;

function collide(p, r, self) {
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z, m = c.r + r, d2 = dx * dx + dz * dz;
    if (d2 < m * m && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
  }
  const isMate = mates.includes(self);
  for (const o of [player, ...mates, ...Object.values(npc)]) {
    if (o === self) continue;
    if (isMate && (o === player || mates.includes(o))) continue;   // 조원끼리는 비켜 준다 — 서로 밀면 가운데서 멈춘다
    const dx = p.x - o.pos.x, dz = p.z - o.pos.z, m = 0.75, d2 = dx * dx + dz * dz;
    if (d2 < m * m && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = o.pos.x + dx / d * m; p.z = o.pos.z + dz / d * m; }
  }
  p.x = Math.max(-62, Math.min(62, p.x)); p.z = Math.max(-62, Math.min(62, p.z));
}

const turn = (a, want, k) => { const d = Math.atan2(Math.sin(want - a), Math.cos(want - a)); return a + d * k; };

/** 한 사람을 목표 쪽으로 한 걸음 옮긴다. 도착하면 true */
function stepToward(o, tx, tz, speed, dt, stopAt = 0.25) {
  const dx = tx - o.pos.x, dz = tz - o.pos.z, d = Math.hypot(dx, dz);
  if (d < stopAt) { o.avatar.speed = 0; return true; }
  const v = Math.min(speed, d / dt);
  const n = new THREE.Vector3(o.pos.x + dx / d * v * dt, 0, o.pos.z + dz / d * v * dt);
  collide(n, 0.42, o);
  o.pos.x = n.x; o.pos.z = n.z;
  o.avatar.root.rotation.y = turn(o.avatar.root.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 9));
  o.avatar.speed = speed;
  return false;
}

let lastTick = 0;
function frame() { tick(); requestAnimationFrame(frame); }

function tick() {
  lastTick = performance.now();
  const dt = Math.min(clock.getDelta(), 0.05);

  // 조종하는 사람
  const mv = (locked || talk.open) ? { x: 0, y: 0 } : input.move;
  const ml = Math.hypot(mv.x, mv.y);
  if (ml > 0.05) {
    const yaw = input.yaw;
    const dx = -Math.sin(yaw) * mv.y + Math.cos(yaw) * mv.x;
    const dz = -Math.cos(yaw) * mv.y - Math.sin(yaw) * mv.x;
    const sp = 4.6 * ml;
    const n = new THREE.Vector3(player.pos.x + dx * sp * dt, 0, player.pos.z + dz * sp * dt);
    collide(n, 0.45, player);
    if (heightAt(n.x, n.z) > -0.7) { player.pos.x = n.x; player.pos.z = n.z; }   // 물에는 들어가지 않는다
    player.avatar.root.rotation.y = turn(player.avatar.root.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 12));
    player.avatar.speed = sp;
  } else player.avatar.speed = 0;

  // 마을 사람 — 길을 걷거나, 가까이 온 우리를 돌아본다
  for (const [k, o] of Object.entries(npc)) {
    if (o.path) {
      const P = o.path, t = P.pts[P.i];
      const waiting = P.follow && Math.hypot(P.follow.pos.x - o.pos.x, P.follow.pos.z - o.pos.z) > 9;
      if (waiting) { o.avatar.speed = 0; o.avatar.lookAt(P.follow.pos); }
      else {
        o.avatar.lookAt(null);
        const before = Math.hypot(t.x - o.pos.x, t.z - o.pos.z);
        let arrived = stepToward(o, t.x, t.z, P.speed, dt, 0.4);
        // 어딘가 걸려 1.5초 넘게 다가가지 못하면 그 지점은 건너뛴다 — 수업 중에 멈춰 서면 안 된다
        const gain = before - Math.hypot(t.x - o.pos.x, t.z - o.pos.z);
        P.stuck = gain < P.speed * dt * 0.2 ? (P.stuck || 0) + dt : 0;
        if (P.stuck > 1.5) { arrived = true; P.stuck = 0; }
        if (arrived) { P.i++; if (P.i >= P.pts.length) { o.path = null; o.avatar.speed = 0; P.res(); } }
      }
    } else if (!talk.open && !G.fireLit) o.avatar.lookAt(G.near(o, player.pos, 6) ? player.pos : null);
    if (k === "elder" && !G.fireLit && Math.random() < dt * 0.25) o.avatar.play("cough", 1.8);
  }

  // 모두 땅 높이에 발을 붙인다
  for (const o of [player, ...mates, ...Object.values(npc)]) {
    o.pos.y = heightAt(o.pos.x, o.pos.z);
    o.avatar.update(dt);
  }

  // 가까이 가면 뜨는 행동 단추
  let best = null, bd = 1e9;
  for (const r of reach) {
    const d = Math.hypot(r.target.pos.x - player.pos.x, r.target.pos.z - player.pos.z);
    if (d < r.radius && d < bd) { best = r; bd = d; }
  }
  const act = $("#act");
  if (best && !talk.open && !locked) {
    act.hidden = false;
    const html = `${best.label}${input.touchy ? "" : " <kbd>E</kbd>"}`;
    if (act.dataset.h !== html) { act.innerHTML = html; act.dataset.h = html; }
    if (input.takeAction()) {
      reach.splice(reach.indexOf(best), 1);
      act.hidden = true;
      if (best.target.avatar) G.faceEachOther(best.target);
      best.res();
    }
  } else { act.hidden = true; input.takeAction(); }

  for (let i = waits.length - 1; i >= 0; i--) if (waits[i].pred()) { waits[i].res(); waits.splice(i, 1); }

  world.update(dt);
  fire.update(dt);
  sparkles.forEach(s => s.update(dt));

  // 카메라 — 평소엔 조종하는 사람 뒤에서, 대화 중엔 어깨너머로 상대와 함께
  if (wasTalking && !talk.open) focus = null;
  wasTalking = talk.open;
  const talking = talk.open && focus;
  talkingNow = !!talking;
  if (talking) {
    const back = Math.atan2(player.pos.x - focus.pos.x, player.pos.z - focus.pos.z);
    input.yaw = turn(input.yaw, back + 0.5, 1 - Math.exp(-dt * 3));
  }
  const yaw = input.yaw, pitch = talking ? 0.24 : input.pitch, dist = talking ? 5.6 : input.dist;
  if (talking) camTarget.set((player.pos.x + focus.pos.x) / 2, player.pos.y + 1.3, (player.pos.z + focus.pos.z) / 2);
  else camTarget.set(player.pos.x, player.pos.y + 1.5, player.pos.z);
  const want = new THREE.Vector3(
    camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    camTarget.y + Math.sin(pitch) * dist,
    camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  want.y = Math.max(want.y, heightAt(want.x, want.z) + 0.8);
  // 움집처럼 큰 것 뒤로 카메라가 들어가면 그 앞까지 당겨 온다 — 지붕 속이 화면을 가리지 않게
  if (want.y < 4.6) {
    const vx = want.x - camTarget.x, vz = want.z - camTarget.z, L = Math.hypot(vx, vz) || 1;
    let tMin = 1;
    for (const c of colliders) {
      if (c.r < 1.2) continue;
      const r = c.r + 0.45, fx = camTarget.x - c.x, fz = camTarget.z - c.z;
      const b = (fx * vx + fz * vz) / (L * L), cc = (fx * fx + fz * fz - r * r) / (L * L);
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < tMin) tMin = t;
    }
    if (tMin < 1) { const k = Math.max(0.35, tMin * 0.9); want.x = camTarget.x + vx * k; want.z = camTarget.z + vz * k; }
  }
  if (shot) { want.copy(shot.pos); camTarget.copy(shot.at); }
  if (!camInit) { camPos.copy(want); camInit = true; }
  camPos.lerp(want, 1 - Math.exp(-dt * (shot ? 2.2 : 7)));
  camera.position.copy(camPos);
  camLook.lerp(camTarget, 1 - Math.exp(-dt * (shot ? 2.2 : 12)));
  camera.lookAt(camLook);

  // 대화 중엔 카메라와 말하는 사람 사이에 낀 사람을 잠시 감춘다 — 머리 하나가 화면을 다 가리지 않게
  const sx = camLook.x - camPos.x, sz = camLook.z - camPos.z, sl = Math.hypot(sx, sz) || 1;
  for (const o of [...mates, ...Object.values(npc)]) {
    let hide = false;
    if (talkingNow && o !== focus) {
      const px = o.pos.x - camPos.x, pz = o.pos.z - camPos.z;
      const along = (px * sx + pz * sz) / sl;                 // 카메라에서 얼마나 앞에 있나
      const off = Math.abs(px * sz - pz * sx) / sl;           // 시선에서 옆으로 얼마나 비켜 있나
      hide = along > 0.3 && along < sl + 0.8 && off < 1.1;
    }
    o.avatar.root.visible = !hide;
  }

  // 해는 우리를 따라다닌다 — 그림자 상자를 좁게 쓰려고
  sun.position.set(player.pos.x + 26, 44, player.pos.z + 16);
  sun.target.position.set(player.pos.x, 0, player.pos.z);

  renderer.render(scene, camera);
}

/* ── 시작 · 끝 ──────────────────────────────────────── */
const teamIn = $("#teamin");
try { teamIn.value = localStorage.getItem("team") || ""; } catch (e) {}

$("#mute").addEventListener("click", e => {
  const m = !audio.muted; audio.setMuted(m);
  e.target.setAttribute("aria-pressed", String(m));
  e.target.textContent = m ? "소리 꺼짐" : "소리 켜짐";
});
$("#helpbtn").addEventListener("click", () => { $("#help").hidden = false; });
$("#helpclose").addEventListener("click", () => { $("#help").hidden = true; });

// 주인공 고르기 — 고른 사람이 조종하고 나머지 셋은 뒤따른다
let picked = 0;
try { picked = Math.min(3, Math.max(0, parseInt(localStorage.getItem("crew") || "0", 10) || 0)); } catch (e) {}
const pickEl = $("#crewpick");
pickEl.innerHTML = CREW.map((c, i) =>
  `<button data-i="${i}" aria-pressed="${i === picked}" aria-label="${i + 1}번 학생">
     <img src="img/student${i + 1}.webp" alt="" width="240" height="360"></button>`).join("");
pickEl.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  picked = +b.dataset.i;
  try { localStorage.setItem("crew", String(picked)); } catch (err) {}
  pickEl.querySelectorAll("button").forEach((x, i) => x.setAttribute("aria-pressed", String(i === picked)));
  pickCrew(picked);
});
pickCrew(picked);

$("#go").addEventListener("click", async () => {
  const team = teamIn.value.trim();
  if (!team) { teamIn.focus(); teamIn.placeholder = "조 이름을 먼저 적어 주십시오"; return; }
  try { localStorage.setItem("team", team); } catch (e) {}
  G.team = team;
  audio.init();
  $("#start").hidden = true;
  $("#teamtag").textContent = team;

  // ?ch=2 — 1장을 건너뛰고 2장부터 (수업 시간이 모자랄 때, 시험할 때)
  const params = new URLSearchParams(location.search);
  const from = params.get("ch") === "2" ? 2 : 1;
  G.log({ kind: "start", crew: picked + 1, from });
  if (!params.has("skipintro")) await intro(from);
  $("#hud").hidden = false;

  if (from === 1) {
    const s = await chapter1(G);
    G.log({ kind: "chapter", chapter: "1-fire", ...s });
    await showCard({
      eyebrow: "1장 ① 완료", title: "마을에 첫 불이 붙었다",
      rows: [
        ["누에게 건넨 말", "조가 직접 써서 보낸 횟수", s.tries],
        ["통하지 않은 말", "불 · 나무 · 마찰처럼 이름이나 개념어로 말했을 때", s.misses],
        ["여섯 장면 모두 통하기까지", "한 장면에 평균", `${(s.tries / 6).toFixed(1)}번`],
        ["종이에 적어 주려 한 횟수", "글자가 없는 시대", s.paper],
        ["걸린 시간", "", mmss(s.secs)],
      ],
      tip: "누는 사물을 이름이 아니라 쓰임으로 불렀습니다. 옹이 말한 구술 문화의 「상황 의존적」 사고입니다. "
         + "그리고 적어 둘 곳이 없으니, 여러 번 되풀이한 노래만 기억에 남았습니다.",
      next: "2장으로",
    });
  }

  const s2 = await chapter2(G);
  const avg = Math.round(s2.copySecs.reduce((a, b) => a + b, 0) / s2.copySecs.length);
  await showCard({
    eyebrow: "2장 완료", title: "편지가 옆 수도원에 닿았다",
    rows: [
      ["베낀 편지", "빼앗길 때마다 처음부터 다시", `${s2.copies}부`],
      ["한 부를 베끼는 데", "평균", mmss(avg)],
      ["후드 쓴 자의 문제", "통과하기까지", `${s2.quizTries}번`],
      ["걸린 시간", "", mmss(s2.secs)],
    ],
    tip: "필사본은 한 부뿐이라, 빼앗기면 그 시간이 통째로 사라졌습니다. "
       + "같은 판본을 한꺼번에 여러 부 만드는 인쇄의 「표준화」와 「고정성」이 아직 없던 시대입니다.",
    next: "계속",
  });
  G.objective("3장 인쇄는 곧 이어집니다.");
});

const mmss = s => `${Math.floor(s / 60)}분 ${s % 60}초`;

/** 장이 끝났을 때의 카드. 다음 단추를 누르면 풀린다 */
function showCard({ eyebrow, title, rows, tip, next = "다음으로" }) {
  $("#doneeyebrow").textContent = eyebrow;
  $("#donetitle").textContent = title;
  $("#donestats").innerHTML = rows.map(([a, b, v]) =>
    `<tr><td>${a}${b ? `<small>${b}</small>` : ""}</td><td>${v}</td></tr>`).join("");
  $("#donetip").textContent = tip;
  $("#donenext").textContent = next;
  $("#done").hidden = false;
  return new Promise(res => { $("#donenext").onclick = () => { $("#done").hidden = true; res(); }; });
}

/* ── 들어가며 — 인쇄 박물관 ─────────────────────────── */
const SLIDES = [
  { img: "museum", text: "인쇄 박물관, 문 닫기 30분 전.\n과제 사진을 찍으러 온 우리 조만 전시실에 남아 있었다." },
  { img: "museum", text: "천장에는 「書 · 印 · 傳」 — 쓰고, 찍고, 퍼뜨린다.\n그 아래 낡은 나무 인쇄기 한 대가 서 있었다." },
  { img: "hand",   text: "판 위에는 쇠로 된 활자가 빼곡했다.\n「만지지 마시오」 팻말을 보지 못한 누군가가, 인쇄기에 손을 댔다." },
  { img: "hand",   glow: true, text: "차가운 쇠가 순간 뜨거워지더니,\n활자 사이로 빛이 새어 나와 손끝을 타고 올라왔다." },
];
function intro(from) {
  const box = $("#intro"), bg = $("#ibg"), tx = $("#itext"), flash = $("#iflash");
  const slides = [...SLIDES, { img: null, flash: true, text: from === 2
    ? "…눈을 뜨니 돌벽과 촛불이 보였다.\n손끝에 아직 쇠 활자의 온기가 남아 있었다."
    : "…눈을 뜨니 낯선 숲이었다.\n발밑에서 활자 하나가 희미하게 빛나고 있었다." }];
  box.hidden = false; box.classList.remove("clear");
  return new Promise(done => {
    let i = -1, typing = null, full = "", img = "";
    const show = () => {
      i++;
      if (i >= slides.length) return finish();
      const s = slides[i];
      if (s.img && s.img !== img) {
        img = s.img;
        bg.style.backgroundImage = `url(img/${s.img}.webp)`;
        bg.style.animation = "none"; void bg.offsetWidth; bg.style.animation = "";
      }
      bg.classList.toggle("glow", !!s.glow);
      if (s.glow) audio.shimmer();
      if (s.flash) {                            // 빛에 삼켜졌다가, 뒤에 그려진 숲이 드러난다
        flash.classList.add("on");
        setTimeout(() => { box.classList.add("clear"); flash.classList.remove("on"); }, 800);
      }
      full = s.text; let k = 0;
      clearInterval(typing);
      tx.textContent = "";
      typing = setInterval(() => {
        tx.textContent = full.slice(0, ++k);
        if (k >= full.length) { clearInterval(typing); typing = null; }
      }, 38);
    };
    const adv = () => {
      if (typing) { clearInterval(typing); typing = null; tx.textContent = full; }
      else show();
    };
    const onClick = e => { if (!e.target.closest("#iskip")) adv(); };
    const onKey = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); adv(); } };
    const finish = () => {
      clearInterval(typing);
      box.removeEventListener("click", onClick); removeEventListener("keydown", onKey);
      box.hidden = true; box.classList.remove("clear"); flash.classList.remove("on");
      done();
    };
    $("#iskip").onclick = finish;
    box.addEventListener("click", onClick); addEventListener("keydown", onKey);
    show();
  });
}

// 시험할 때만 — 미리보기 창은 화면을 안 그릴 때 프레임을 멈추므로 대신 돌려 준다
if (new URLSearchParams(location.search).has("debug")) {
  window.__G = G;
  setInterval(() => { if (performance.now() - lastTick > 60) tick(); }, 33);
}

$("#loading").hidden = true;
requestAnimationFrame(frame);
