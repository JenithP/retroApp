// 활자의 문 — 본체. 그리기, 걷기, 카메라, 그리고 퀘스트 대본이 쓰는 도우미들.
import * as THREE from "three";
import { buildWorld, heightAt, VILLAGE, SPAWN, RIVER_X } from "./world.js";
import { flood } from "./flood.js";
import { makeAvatar, trySwapGLB } from "./avatar.js";
import { Input } from "./input.js";
import { Talk } from "./talk.js";
import { audio } from "./audio.js";
import { makeFire, makeSparkle } from "./fx.js";
import { chapter1 } from "./ch1.js";
import { chapter2 } from "./ch2.js";
import { chapter3, ending } from "./ch3.js";
import { placeProp, buildPrintshop } from "./props.js";
import { saveRun } from "../../js/firebase.js";   // 2주차 거실과 같은 저장 통로 — 끊겨도 담아 두었다 다시 보낸다

const $ = s => document.querySelector(s);

/* ── 그리기 ─────────────────────────────────────────── */
const canvas = $("#view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setClearColor(0x000000, 0);          // 박물관 끝 장면에서는 뒤에 깐 사진 위에 사람만 그린다
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
let colliders = world.colliders;              // 3장 인쇄소에 들어가면 방의 것으로 바뀐다

function spawnActor(opts, x, z, faceYaw = 0) {
  const a = makeAvatar(opts);
  a.body.visible = false;                     // 블록 인형은 쓰지 않는다 — 믹사모 모델이 들어와야 보인다
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
  // 2장 숲길의 후드 쓴 자 — 1장 동안에는 지도 밖에서 기다린다
  villain: spawnActor({ skin: "#c9a080", shirt: "#1d1a1a", pants: "#1a1716", hair: "#111111", scale: 1.1 },
    58, 58, 0),
  // 2장 수도원 — 누를 닮은 견습 수도사, 수도원장, 옆 수도원 문지기
  abbot:      spawnActor({ skin: "#d9b08c", shirt: "#4a3526", pants: "#4a3526", hair: "#dddddd", beard: "#e0e0e0", scale: 1.02 }, 60, 52, 0),
  monk:       spawnActor({ skin: "#c89067", shirt: "#3d3a36", pants: "#3d3a36", hair: "#241710", scale: 0.84 }, 62, 52, 0),
  gatekeeper: spawnActor({ skin: "#d4a482", shirt: "#6f6a62", pants: "#6f6a62", hair: "#3a2a1c", scale: 1.0 }, 58, 50, 0),
  // 3장 인쇄소 — 주인과 누를 닮은 도제 소년
  printer:    spawnActor({ skin: "#d0a07a", shirt: "#e8dcc4", pants: "#4b3a2a", hair: "#2a1d14", beard: "#2a1d14", scale: 1.08 }, 56, 52, 0),
  apprentice: spawnActor({ skin: "#c89067", shirt: "#e4d7bd", pants: "#5a4430", hair: "#3a2414", scale: 0.84 }, 54, 52, 0),
  // 끝 — 박물관 해설사, 누와 똑같은 얼굴
  guide:      spawnActor({ skin: "#c89067", shirt: "#2d3a4a", pants: "#2a2a2a", hair: "#241710", scale: 0.95 }, 52, 52, 0),
};

// Tripo 모델이 폴더에 있으면 갈아 끼운다. 없으면 블록 인형 그대로.
// 교수님이 믹사모로 만든 모델 — 할아버지는 granpa, 엄마는 mama, 아빠(사냥꾼)는 papa, 후드 쓴 자는 villain
const GLB = { nu: "nu", elder: "granpa", woman: "mama", hunter: "papa", villain: "villain",
              abbot: "abbot", monk: "nu_monk", gatekeeper: "gatekeeper", printer: "printer", apprentice: "nu_print", guide: "nu_modern" };
for (const [k, f] of Object.entries(GLB)) if (npc[k]) trySwapGLB(npc[k].avatar, `models/${f}.glb`);

const fire = makeFire(scene, world.firePit.position.clone().add(new THREE.Vector3(0, 0.1, 0)));

/* ── 도우미 — 퀘스트 대본이 부르는 것들 ─────────────────── */
const input = new Input(canvas, $("#stick"), $("#knob"), $("#act"));
const talk = new Talk();
talk.voices = { "빠른 발 누": 560, "할아버지": 200, "후드 쓴 자": 150, "수도원장": 230, "옆 수도원 문지기": 280,
                "견습 수도사": 520, "인쇄소 주인": 210, "도제 소년": 540, "해설사": 470, "사냥꾼": 170, "엄마": 400 };
// 대사창에 이름이 뜬 사람이 말하는 동작을 한다
const SPEAKERS = { "빠른 발 누": "nu", "할아버지": "elder", "사냥꾼": "hunter", "엄마": "woman", "후드 쓴 자": "villain", "수도원장": "abbot", "견습 수도사": "monk",
                   "옆 수도원 문지기": "gatekeeper", "인쇄소 주인": "printer", "도제 소년": "apprentice", "해설사": "guide" };
talk.onSpeak = who => {
  for (const o of [player, ...Object.values(npc)]) o.avatar.talking = false;
  if (who === "우리") player.avatar.talking = true;
  else if (SPEAKERS[who]) npc[SPEAKERS[who]].avatar.talking = true;
};
const ABBEY = new THREE.Vector3(0, 0, 39.5);    // 2장 수도원 — 숲길 들머리, 문이 숲길 쪽을 본다
const MEDIEVAL = new Set(["villain", "abbot", "monk", "gatekeeper"]);

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
    const ring = ["elder", "woman", "hunter"];
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
  /* ── 1장 ② 홍수 ───────────────────────────────────── */
  /** 개울가에 우리, 산 쪽에서 달려올 사냥꾼, 마을 불가에 엄마·할아버지·누 */
  floodSetup() {
    G.floodStop();
    $("#floodover").hidden = true;
    world.water.position.y = -0.95;
    fire.setLevel(1); G.fireLit = true;
    world.sticks.forEach(s => (s.visible = false));
    world.typeStone.position.set(0, -50, 0);
    reach.length = 0;
    G.shot(null); focus = null;
    player.pos.set(RIVER_X - 8, 0, -4);
    player.avatar.root.rotation.y = Math.PI / 2;
    player.avatar.root.visible = true;
    input.yaw = -Math.PI / 2;
    const at = { hunter: [RIVER_X - 6, -24], woman: [VILLAGE.x + 2.6, VILLAGE.z + 2], elder: [VILLAGE.x - 2.4, VILLAGE.z - 1.2], nu: [VILLAGE.x - 0.8, VILLAGE.z + 2.8] };
    for (const [k, [x, z]] of Object.entries(at)) {
      const o = npc[k]; o.path = null; o.pos.set(x, 0, z); o.avatar.speed = 0;
      if (k !== "hunter") G.faceTo(o, world.firePit.position);
    }
  },
  floodLeft: 0,
  /** 제한 시간 과제 — 물이 차오르는 막대를 띄우고, 시간이 다 되면 대화와 행동 단추를 거두고 false */
  timed(limit, fn) {
    const bar = $("#floodbar"), fill = bar.querySelector("i"), tx = bar.querySelector("span");
    bar.hidden = false;
    const t0 = performance.now();
    let alive = true;
    return new Promise(res => {
      const tickBar = () => {
        const l = Math.max(0, limit - (performance.now() - t0) / 1000);
        G.floodLeft = Math.round(l);
        fill.style.width = `${(1 - l / limit) * 100}%`;
        tx.textContent = `물이 차오른다 · ${Math.floor(l / 60)}:${String(Math.floor(l % 60)).padStart(2, "0")}`;
        bar.classList.toggle("urgent", l < 30);
        world.water.position.y = -0.95 + (1 - l / limit) * 0.65;
        if (l <= 0 && alive) { alive = false; clearInterval(G._floodIv); talk.close(); reach.length = 0; res(false); }
      };
      tickBar();
      G._floodIv = setInterval(tickBar, 200);
      fn(() => alive).then(ok => { if (!alive) return; alive = false; clearInterval(G._floodIv); res(ok); });
    });
  },
  floodStop() { clearInterval(G._floodIv); $("#floodbar").hidden = true; },
  /** 시간 안에 못 전했다 — 파란 물이 화면을 덮는다 */
  floodOver() {
    G.floodStop();
    const o = $("#floodover");
    o.hidden = false; o.classList.remove("up"); void o.offsetWidth; o.classList.add("up");
    audio.huh();
    return new Promise(res => { $("#floodretry").onclick = () => { o.hidden = true; o.classList.remove("up"); res(); }; });
  },
  /** 마을 사람들이 붉은 흙 언덕으로 올라가고, 개울이 불어난다 */
  async toHill() {
    const hill = new THREE.Vector3(VILLAGE.x - 14, 0, VILLAGE.z - 20);
    G.shot(new THREE.Vector3(VILLAGE.x + 9, 8, VILLAGE.z + 11), new THREE.Vector3(VILLAGE.x - 7, 1, VILLAGE.z - 9));
    const who = ["elder", "nu", "woman"];
    const walks = who.map((k, i) => G.walkTo(npc[k], [hill.clone().add(new THREE.Vector3(i * 1.5 - 1.5, 0, (i % 2) * 1.2))], 3.4));
    player.pos.set(hill.x + 3, 0, hill.z + 2.5);
    for (let i = 0; i < 40; i++) { world.water.position.y = Math.min(0.1, world.water.position.y + 0.02); await G.wait(0.08); }
    await Promise.race([Promise.all(walks), G.wait(7)]);
    G.shot(null);
  },
  /** 온 화면을 덮는 그림 — 실내 장면. under 면 3D 사람을 그림 앞에 세운다 */
  backdrop(name, { under = false } = {}) {
    const b = $("#backdrop");
    if (!name) { b.hidden = true; b.classList.remove("under"); return; }
    b.style.backgroundImage = `url(img/${name}.webp)`;
    b.classList.toggle("under", under);
    b.hidden = false;
  },
  /** 원시 마을을 치우고 수도원·옆 수도원 문·이정표를 세운다 — 2장은 중세 숲길 */
  async enterMedieval() {
    for (const [k, o] of Object.entries(npc)) if (!MEDIEVAL.has(k)) { o.path = null; o.pos.set(58 + Math.random() * 3, 0, -58); }
    for (const h of world.huts || []) if (h && h.isObject3D) h.visible = false;
    world.firePit.visible = false;
    world.sticks.forEach(s => (s.visible = false));
    fire.setLevel(0); audio.fire?.(false);
    world.typeStone.position.set(0, -50, 0);
    sparkles.forEach(s => (s.level = 0));
    G.fireLit = true;                          // 마을 사람들이 우리를 돌아보는 버릇을 끈다
    if (G.medieval) return;
    G.medieval = true;
    const at = (x, z) => heightAt(x, z) - 0.25;
    const gz = G.gatePos.z - 0.9;
    await Promise.all([
      placeProp(world.group, "abbey", { height: 10, x: ABBEY.x, z: ABBEY.z, y: at(ABBEY.x, ABBEY.z), rotY: Math.PI, colliders: world.colliders, maxR: 5 }),
      placeProp(world.group, "abbey_gate", { height: 5.4, x: G.gatePos.x, z: gz, y: at(G.gatePos.x, gz), rotY: 0 }),
      placeProp(world.group, "signpost", { height: 3, x: 3.8, z: 19, y: at(3.8, 19), rotY: -0.5, colliders: world.colliders, maxR: 0.35 }),
    ]);
  },
  /** 수도원 문 앞 — 수도원장과 견습 수도사가 맞는다 */
  atAbbey() {
    player.pos.set(ABBEY.x, 0, ABBEY.z - 11.5);
    player.avatar.root.rotation.y = 0;
    player.avatar.root.visible = true;
    input.yaw = Math.PI;
    npc.abbot.pos.set(ABBEY.x - 1.8, 0, ABBEY.z - 8.4);
    npc.monk.pos.set(ABBEY.x + 2.1, 0, ABBEY.z - 8.8);
    G.faceTo(npc.abbot, player.pos); G.faceTo(npc.monk, player.pos);
    npc.villain.pos.set(58, 0, 58);
    npc.gatekeeper.pos.set(58, 0, 50);
  },
  /** 편지를 품고 수도원 문을 나선다. 후드 쓴 자는 길 한가운데 나무 사이에, 문지기는 길 끝 문 옆에 */
  placeForest() {
    player.pos.set(ABBEY.x, 0, ABBEY.z - 9.5);
    player.avatar.root.visible = true;
    input.yaw = 0;
    const h = npc.villain;
    h.path = null;
    h.pos.set(2.4, 0, 10);
    h.avatar.root.rotation.y = 0;
    h.avatar.glb?.action(null);
    const k = npc.gatekeeper;
    k.pos.set(G.gatePos.x + 2.1, 0, G.gatePos.z + 1.2);
    k.avatar.root.rotation.y = 0.2;
  },
  /** 편지를 빼앗겼다 — 후드 쓴 자는 숲 밖으로 사라지고, 우리는 수도원 문 앞으로 */
  backToAbbey() {
    npc.villain.pos.set(58, 0, 58);
    G.shot(null);
    player.avatar.root.visible = true;
    player.pos.set(ABBEY.x, 0, ABBEY.z - 9);
    player.avatar.root.rotation.y = 0;
    input.yaw = Math.PI;
  },
  /** 3장 — 숲을 감추고 인쇄소 방에 들어선다 */
  async enterPrintshop() {
    for (const [k, o] of Object.entries(npc)) if (k !== "printer" && k !== "apprentice") { o.path = null; o.pos.set(58, 0, -58); }
    world.group.visible = false;
    scene.background = new THREE.Color("#1d140c");
    scene.fog = null;
    if (!G.shop) {
      G.shop = buildPrintshop();
      scene.add(G.shop.group);
      const C = G.shop.colliders;
      await Promise.all([
        placeProp(G.shop.group, "press", { height: 4.6, x: G.pressPos.x, z: G.pressPos.z, rotY: 0, colliders: C, maxR: 1.6 }),
        placeProp(G.shop.group, "typecase", { height: 2.4, x: -6.2, z: -3.2, rotY: 0.55, colliders: C, maxR: 1.2 }),
        placeProp(G.shop.group, "ink_table", { height: 1.5, x: 4.2, z: -3.6, rotY: -0.3, colliders: C, maxR: 1.0 }),
        placeProp(G.shop.group, "drying_rack", { height: 3.4, x: 6.6, z: -5.2, rotY: -0.5, colliders: C, maxR: 1.2 }),
        placeProp(G.shop.group, "pamphlets", { height: 1.5, x: 6.4, z: 3.4, rotY: 0.8, colliders: C, maxR: 0.9 }),
      ]);
    }
    G.shop.group.visible = true;
    colliders = G.shop.colliders;
    G.floorY = 0;
    G.bounds = G.shop.bounds;
    player.pos.set(0, 0, 5);
    player.avatar.root.rotation.y = Math.PI;
    player.avatar.root.visible = true;
    input.yaw = 0;
    npc.printer.pos.set(2.2, 0, -1.6); G.faceTo(npc.printer, player.pos);
    npc.apprentice.pos.set(-5.0, 0, -1.2); G.faceTo(npc.apprentice, player.pos);
  },
  pressPos: new THREE.Vector3(0, 0, -4),
  async pressGlow() {
    const p = G.pressPos.clone().add(new THREE.Vector3(0, 3.4, 0));
    const sp = makeSparkle(scene, p); sp.level = 1; sparkles.push(sp);
    audio.shimmer();
    G.shot(p.clone().add(new THREE.Vector3(3.2, 0.4, 6.5)), p);
    await G.wait(2.6);
    sp.level = 0;
    G.shot(null);
  },
  /** 끝 — 박물관 사진 앞에 해설사만 세운다 */
  enterMuseum() {
    G.backdrop("museum", { under: true });
    world.group.visible = false;
    if (G.shop) G.shop.group.visible = false;
    scene.background = null;
    scene.fog = null;
    colliders = []; G.bounds = null; G.floorY = 0;
    const guide = npc.guide;
    guide.path = null;
    guide.pos.set(0.7, 0, 0);
    guide.avatar.root.rotation.y = -0.2;
    G.only = new Set([guide]);
    player.avatar.root.visible = false;
    G.shot(new THREE.Vector3(-0.3, 1.9, 5.4), new THREE.Vector3(0.4, 1.5, 0));
  },
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
  if (G.bounds) {                              // 방 안에서는 벽 너머로 나가지 않는다
    const B = G.bounds;
    p.x = Math.max(B.x0, Math.min(B.x1, p.x)); p.z = Math.max(B.z0, Math.min(B.z1, p.z));
  }
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
    if (G.floorY != null || heightAt(n.x, n.z) > -0.7) { player.pos.x = n.x; player.pos.z = n.z; }   // 물에는 들어가지 않는다
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
    o.pos.y = G.floorY ?? heightAt(o.pos.x, o.pos.z);
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
  want.y = Math.max(want.y, (G.floorY ?? heightAt(want.x, want.z)) + 0.8);
  if (G.bounds) {                              // 방 안에서는 카메라도 벽 안쪽에
    const B = G.bounds;
    want.x = Math.max(B.x0, Math.min(B.x1, want.x)); want.z = Math.max(B.z0, Math.min(B.z1, want.z));
    want.y = Math.min(want.y, 5);
  }
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
    o.avatar.root.visible = !hide && !(G.only && !G.only.has(o));
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

  // ?ch=2 · ?ch=3 — 앞 장을 건너뛴다 (수업 시간이 모자랄 때, 시험할 때)
  const params = new URLSearchParams(location.search);
  const chp = params.get("ch");               // ?ch=flood — 홍수부터
  const from = chp === "flood" ? 1.5 : Math.max(1, Math.min(3, parseInt(chp || "1", 10) || 1));
  G.log({ kind: "start", crew: picked + 1, from });
  if (!params.has("skipintro")) await intro(from);
  $("#hud").hidden = false;
  const all = {};

  if (from <= 1) {
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
      next: "계속",
    });
    all.ch1 = s;
  }

  if (from <= 1.5) {
    const f = await flood(G);
    all.flood = f;
    await showCard({
      eyebrow: "1장 ② 완료", title: "들은 말 그대로 전해 마을을 살렸다",
      rows: [
        ["뜻 풀이", "조가 의논해 적어 낸 횟수", `${f.meaningTries}번`],
        ["엄마에게 전하기", "들은 말 그대로 전해지기까지", `${f.relayTries}번`],
        ["홍수에 마을을 잃은 횟수", "3분 안에 못 전했을 때", `${f.fails}번`],
        ["남은 시간", "", mmss(f.secsLeft)],
      ],
      tip: "글자가 없는 시대에 말은 들은 그대로 되풀이해야 살아남았습니다. 뜻을 알아도 제 말로 바꾸면 듣는 사람이 알아듣지 못했습니다. "
         + "옹이 말한 구술 문화의 정형구와 반복입니다.",
      next: "2장으로",
    });
  }

  if (from <= 2) {
    const s2 = await chapter2(G);
    const avg = avgOf(s2.copySecs);
    G.copyAvg = avg;
    all.ch2 = s2;
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
      next: "3장으로",
    });
  }

  const s3 = await chapter3(G);
  all.ch3 = s3;
  await showCard({
    eyebrow: "3장 완료", title: "같은 글이 수백 곳에 닿았다",
    rows: [
      ["처음 교정지의 틀린 활자", "그대로 돌렸으면 수백 장이 똑같이 틀렸다", `${s3.firstTypos}개`],
      ["교정지를 찍은 횟수", "틀린 곳을 모두 고치기까지", `${s3.proofs}번`],
      ["인쇄기로 찍은 장", `${s3.pressSecs}초 동안`, `${s3.sheets}장`],
      ["한 장을 찍는 데", "평균", `${s3.secsPerSheet}초`],
    ],
    tip: "조판에서 한 글자가 틀리면 수백 장이 모두 똑같이 틀립니다. 한 번 바로 짜면 수백 장이 모두 똑같이 옳습니다. "
       + "아이젠슈타인이 말한 인쇄의 「표준화」입니다.",
    next: "눈을 뜬다",
  });

  await ending(G);
  const copyAvg = G.copyAvg || null;
  G.log({ kind: "chapter", chapter: "end", copyAvg, secsPerSheet: s3.secsPerSheet });
  await showCard({
    eyebrow: "활자의 문 · 끝", title: "우리 조가 지나온 세 시대",
    rows: [
      ["말만 있던 시대", "누에게 건넨 말", all.ch1 ? `${all.ch1.tries}번` : "–"],
      ["손으로 베끼던 시대", "편지 한 부를 베끼는 데", copyAvg ? mmss(copyAvg) : "–"],
      ["찍어 내던 시대", "한 장을 찍는 데", `${s3.secsPerSheet}초`],
      ["한 부 베낄 시간에 찍는 장", "필사 한 부 ÷ 인쇄 한 장", copyAvg ? `${Math.round(copyAvg / Math.max(0.1, s3.secsPerSheet))}장` : "–"],
    ],
    tip: "해설사의 질문을 들고 디브리핑으로 갑니다 — 기술이 사회를 바꾸는가, 사회가 기술을 고르는가.",
    next: "닫기",
  });
  G.objective("강의실 디브리핑으로 돌아갑니다.");
});

const mmss = s => `${Math.floor(s / 60)}분 ${s % 60}초`;
const avgOf = a => Math.round(a.reduce((x, y) => x + y, 0) / (a.length || 1));

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
const WAKE = {
  1: "…눈을 뜨니 낯선 숲이었다.\n발밑에서 활자 하나가 희미하게 빛나고 있었다.",
  2: "…눈을 뜨니 숲 속 돌 수도원 앞이었다.\n멀리서 종이 한 번 울렸다.",
  3: "…눈을 뜨니 잉크 냄새가 코를 찔렀다.\n어디선가 쿵, 쿵 나무 기계 소리가 났다.",
};

/** 들어가며 — 박물관 영상. 영상이 없거나 못 틀면 사진 넉 장으로 대신한다 */
function intro(from) {
  const box = $("#intro"), vid = $("#ivid"), tx = $("#itext"), flash = $("#iflash");
  box.hidden = false; box.classList.remove("clear");
  const icap = box.querySelector(".icap");
  return new Promise(done => {
    let typing = null, full = "", stage = "video", cap = -1;
    const type = text => {
      full = text; let k = 0;
      clearInterval(typing); tx.textContent = "";
      typing = setInterval(() => { tx.textContent = full.slice(0, ++k); if (k >= full.length) { clearInterval(typing); typing = null; } }, 38);
    };
    const cleanup = () => {
      clearInterval(typing);
      vid.pause(); vid.onended = vid.ontimeupdate = vid.onerror = null;
      box.removeEventListener("click", onClick); removeEventListener("keydown", onKey);
    };
    const finish = () => { cleanup(); box.hidden = true; box.classList.remove("clear"); flash.classList.remove("on"); vid.hidden = false; icap.hidden = false; done(); };
    const wake = () => {                          // 빛에 삼켜졌다가 뒤에 그려진 시대가 드러난다
      stage = "wake"; vid.pause();
      flash.classList.add("on");
      setTimeout(() => { vid.hidden = true; box.classList.add("clear"); flash.classList.remove("on"); }, 800);
      type(WAKE[Math.floor(from)]);
    };
    // 이야기 순서대로 — 박물관 사진 위에 자막 셋(손을 대기까지)을 한 줄씩, 그다음 빨려 드는 영상, 그리고 깨어남.
    // 영상은 10초라 그 위에 자막을 얹으면 읽을 틈이 없어 영상 동안에는 자막을 감춘다.
    const bg = $("#ibg");
    const BEFORE = SLIDES.filter(s => !s.glow);          // 빛이 번지는 마지막 자막은 영상이 대신한다
    const playVideo = () => {
      stage = "video"; icap.hidden = true;
      bg.style.opacity = 0;
      vid.hidden = false;
      vid.currentTime = 0;
      vid.muted = false;
      vid.play().catch(() => { vid.muted = true; vid.play().catch(slides); });
    };
    const caption = () => {
      cap++;
      if (cap >= BEFORE.length) return playVideo();
      const s = BEFORE[cap];
      bg.style.opacity = 1;
      bg.style.backgroundImage = `url(img/${s.img}.webp)`;
      icap.hidden = false;
      type(s.text);
    };
    const adv = () => {
      if (typing) { clearInterval(typing); typing = null; tx.textContent = full; return; }
      if (stage === "story") caption();
      else if (stage === "wake") finish();
    };
    const onClick = e => { if (!e.target.closest("#iskip")) adv(); };
    const onKey = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); adv(); } };
    $("#iskip").onclick = finish;
    box.addEventListener("click", onClick); addEventListener("keydown", onKey);

    const slides = () => { cleanup(); vid.hidden = true; icap.hidden = false; bg.style.opacity = 1; slideIntro(from).then(done); };
    vid.onerror = slides;
    vid.onended = wake;
    vid.hidden = true;
    vid.load();                                   // 자막을 읽는 동안 미리 받아 둔다
    stage = "story";
    caption();
  });
}

/** 영상을 틀 수 없을 때 — 사진 넉 장과 자막 */
function slideIntro(from) {
  const box = $("#intro"), bg = $("#ibg"), tx = $("#itext"), flash = $("#iflash");
  const slides = [...SLIDES, { img: null, flash: true, text: WAKE[Math.floor(from)] }];
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
