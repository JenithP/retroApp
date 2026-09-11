// 1장의 세상 — 원시림과 작은 마을, 동쪽의 개울.
// 모두 코드로 만든다. 받아야 할 파일이 없으니 교실 무선망에서도 곧바로 열린다.
import * as THREE from "three";

/** 늘 같은 숲이 나오도록 씨앗을 고정한 난수 */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const VILLAGE = new THREE.Vector3(0, 0, -12);   // 마을 한가운데 — 불 자리
export const SPAWN   = new THREE.Vector3(0, 0, 30);    // 넷이 눈을 뜨는 자리
export const RIVER_X = 34;                              // 개울이 흐르는 줄기

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pathX  = z => 2.6 * Math.sin(z * 0.12);          // 깨어난 자리에서 마을까지 이어진 오솔길

/** 땅의 높이. 마을과 깨어난 자리는 평평하게, 개울은 파이게, 가장자리는 언덕으로 막는다. */
export function heightAt(x, z) {
  let h = 0.75 * Math.sin(x * 0.045) * Math.cos(z * 0.05)
        + 0.35 * Math.sin(x * 0.12 + z * 0.08)
        + 0.2  * Math.cos(z * 0.15 - x * 0.03);
  const flat = (c, r0, r1) => smooth(r0, r1, Math.hypot(x - c.x, z - c.z));
  h *= Math.min(flat(VILLAGE, 13, 24), flat(SPAWN, 6, 14));
  const dx = x - RIVER_X;
  h -= 1.7 * Math.exp(-(dx * dx) / 20);
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h += Math.max(0, edge - 66) * 0.45;
  return h;
}

export function buildWorld(scene) {
  const R = rng(1988);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  /* ── 하늘 — 위는 푸르고 지평선은 옅은 볕 ───────────────── */
  {
    const g = new THREE.SphereGeometry(420, 24, 16);
    const top = new THREE.Color("#7fb2df"), mid = new THREE.Color("#cfe0e4"), low = new THREE.Color("#e9e0c4");
    const c = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      const y = g.attributes.position.getY(i) / 420;
      const col = y > 0.12 ? mid.clone().lerp(top, Math.min(1, (y - 0.12) / 0.6))
                           : low.clone().lerp(mid, Math.max(0, (y + 0.1) / 0.22));
      c.push(col.r, col.g, col.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -1;
    group.add(sky);
  }

  /* ── 땅 — 면마다 빛깔을 조금씩 달리한 낮은 다각형 ───────── */
  {
    const SIZE = 170, SEG = 110;
    let g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    g = g.toNonIndexed();
    const pos = g.attributes.position, col = [];
    const grass = ["#6f9a4a", "#78a352", "#66903f", "#80a95a"].map(s => new THREE.Color(s));
    const dirt = new THREE.Color("#a58a5c"), sand = new THREE.Color("#c9b98b"), moss = new THREE.Color("#5b8440");
    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      let c = grass[Math.floor(R() * grass.length)].clone();
      const dv = Math.hypot(cx - VILLAGE.x, cz - VILLAGE.z);
      if (dv < 11) c.lerp(dirt, 0.75 * (1 - dv / 11) + 0.2);
      if (cz > -4 && cz < 29 && Math.abs(cx - pathX(cz)) < 1.4) c.lerp(dirt, 0.7);
      if (cy < -0.45) c.lerp(sand, 0.8);
      if (Math.hypot(cx - SPAWN.x, cz - SPAWN.z) < 5) c.lerp(moss, 0.4);
      c.offsetHSL(0, 0, (R() - 0.5) * 0.04);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    group.add(ground);
  }

  /* ── 개울 ─────────────────────────────────────────── */
  const waterMat = new THREE.MeshStandardMaterial({
    color: "#3f86a8", roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.86, flatShading: true });
  const waterGeo = new THREE.PlaneGeometry(13, 170, 12, 90);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(RIVER_X, -0.95, 0);
  water.receiveShadow = true;
  group.add(water);
  const wBase = Float32Array.from(waterGeo.attributes.position.array);

  /* ── 나무 — 뾰족한 침엽수와 둥근 활엽수 두 가지 ─────────── */
  const trees = [];
  const okTree = (x, z) => {
    if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 17) return false;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 8) return false;
    if (z > -6 && z < 31 && Math.abs(x - pathX(z)) < 3.4) return false;
    if (Math.abs(x - RIVER_X) < 8.5) return false;
    for (const t of trees) if ((t.x - x) ** 2 + (t.z - z) ** 2 < 6.5) return false;
    return true;
  };
  for (let n = 0; n < 1600 && trees.length < 300; n++) {
    const x = (R() - 0.5) * 150, z = (R() - 0.5) * 150;
    if (okTree(x, z)) trees.push({ x, z, s: 0.8 + R() * 0.7, pine: R() < 0.55, r: R() * 6.28 });
  }
  const pines = trees.filter(t => t.pine), rounds = trees.filter(t => !t.pine);
  const mk = (geo, color, n) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }), n);
    m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  };
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6); trunkGeo.translate(0, 0.9, 0);
  const pineGeo  = new THREE.ConeGeometry(1.5, 3.4, 7); pineGeo.translate(0, 3.3, 0);
  const pineGeo2 = new THREE.ConeGeometry(1.1, 2.4, 7); pineGeo2.translate(0, 4.7, 0);
  const roundGeo = new THREE.IcosahedronGeometry(1.7, 0); roundGeo.translate(0, 3.2, 0);
  const trunks = mk(trunkGeo, "#6d4c33", trees.length);
  const pineA = mk(pineGeo, "#3f6f3b", pines.length), pineB = mk(pineGeo2, "#4a7d43", pines.length);
  const roundM = mk(roundGeo, "#5f9a45", rounds.length);
  const dummy = new THREE.Object3D();
  const place = (m, i, t) => {
    dummy.position.set(t.x, heightAt(t.x, t.z) - 0.1, t.z);
    dummy.rotation.set(0, t.r, 0); dummy.scale.setScalar(t.s); dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
  };
  trees.forEach((t, i) => { place(trunks, i, t); colliders.push({ x: t.x, z: t.z, r: 0.45 * t.s }); });
  pines.forEach((t, i) => { place(pineA, i, t); place(pineB, i, t); });
  rounds.forEach((t, i) => {
    place(roundM, i, t);
    const c = new THREE.Color("#5f9a45").offsetHSL((R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.08);
    roundM.setColorAt(i, c);
  });

  /* ── 바위 ─────────────────────────────────────────── */
  {
    const n = 70, geo = new THREE.DodecahedronGeometry(0.7, 0);
    const m = mk(geo, "#8d8a80", n);
    for (let i = 0; i < n; i++) {
      let x, z, tries = 0;
      do { x = (R() - 0.5) * 140; z = (R() - 0.5) * 140; tries++; }
      while (tries < 30 && (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 14 || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6
             || (z > -6 && z < 31 && Math.abs(x - pathX(z)) < 2.5)));
      const s = 0.5 + R() * 1.3;
      dummy.position.set(x, heightAt(x, z) + 0.1 * s, z);
      dummy.rotation.set(R() * 3, R() * 3, R() * 3);
      dummy.scale.set(s * (0.8 + R() * 0.5), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.5));
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      colliders.push({ x, z, r: 0.55 * s });
    }
  }

  /* ── 덤불 — 누가 처음 숨어서 쳐다보는 자리 ──────────────── */
  const bushAt = [[4.5, 25.5], [6.3, 24.2], [3.2, 23.6], [-6, 26], [-4.8, 34], [5.5, 35]];
  {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const m = mk(geo, "#4f8a3c", bushAt.length);
    bushAt.forEach(([x, z], i) => {
      dummy.position.set(x, heightAt(x, z) + 0.5, z);
      dummy.rotation.set(0, R() * 6, 0); dummy.scale.set(1.3, 0.9, 1.2); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
  }

  /* ── 움집 — 마을을 둥글게 두른 다섯 채 (움집 GLB가 오면 갈아 끼운다) ─ */
  const huts = [];
  {
    const wallM = new THREE.MeshStandardMaterial({ color: "#7b5a3b", flatShading: true, roughness: 1 });
    const roofM = new THREE.MeshStandardMaterial({ color: "#c7a15c", flatShading: true, roughness: 1 });
    const doorM = new THREE.MeshStandardMaterial({ color: "#2e2016", roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const a = 0.9 + i * 1.12;           // 남쪽(+z, 오솔길이 들어오는 쪽)만 비우고 둥글게
      const x = VILLAGE.x + Math.sin(a) * 10.5, z = VILLAGE.z + Math.cos(a) * 10.5;
      const hut = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 1.5, 9), wallM);
      wall.position.y = 0.75;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.6, 9), roofM);
      roof.position.y = 2.7;
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.3), doorM);
      door.position.set(0, 0.6, 2.2);
      [wall, roof, door].forEach(o => { o.castShadow = true; o.receiveShadow = true; hut.add(o); });
      hut.position.set(x, heightAt(x, z), z);
      hut.lookAt(VILLAGE.x, hut.position.y, VILLAGE.z);
      group.add(hut);
      huts.push(hut);
      colliders.push({ x, z, r: 2.5 });
    }
  }

  /* ── 불 자리 — 돌을 둥글게 두르고 장작을 엇갈려 올린다 ──────── */
  const firePit = new THREE.Group();
  {
    const stoneM = new THREE.MeshStandardMaterial({ color: "#7d786e", flatShading: true });
    const logM = new THREE.MeshStandardMaterial({ color: "#5a3d25", flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), stoneM);
      s.position.set(Math.sin(a) * 0.95, 0.15, Math.cos(a) * 0.95);
      s.castShadow = true; firePit.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3, 6), logM);
      l.rotation.set(Math.PI / 2 - 0.35, i * 2.1, 0);
      l.position.y = 0.32; l.castShadow = true; firePit.add(l);
    }
    firePit.position.set(VILLAGE.x, heightAt(VILLAGE.x, VILLAGE.z), VILLAGE.z);
    group.add(firePit);
    colliders.push({ x: VILLAGE.x, z: VILLAGE.z, r: 1.3 });
  }

  /* ── 딱 소리 나는 마른 막대 — 시범을 보이려면 직접 주워 와야 한다 ── */
  const sticks = [];
  {
    const m = new THREE.MeshStandardMaterial({ color: "#9b7547", flatShading: true, emissive: "#000000" });
    for (const [x, z, r] of [[-5.5, 21.5, 0.4], [7.5, 19, 1.9], [-8.2, 12, 2.8]]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 5), m.clone());
      s.rotation.set(Math.PI / 2, 0, r);
      s.position.set(x, heightAt(x, z) + 0.08, z);
      s.castShadow = true;
      group.add(s);
      sticks.push(s);
    }
  }

  /* ── 넷이 따라 들어온 활자 — 깨어난 자리에 떨어져 은은히 빛난다 ─── */
  const typeStone = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34),
    new THREE.MeshStandardMaterial({ color: "#b08a3a", emissive: "#d8a63f", emissiveIntensity: 0.9,
      metalness: 0.6, roughness: 0.35 }));
  typeStone.position.set(SPAWN.x - 1.4, heightAt(SPAWN.x - 1.4, SPAWN.z + 1) + 0.28, SPAWN.z + 1);
  typeStone.castShadow = true;
  group.add(typeStone);

  let t = 0;
  function update(dt) {
    t += dt;
    // 물결 — 꼭짓점을 조금씩 들썩인다
    const a = waterGeo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = wBase[i * 3], z = wBase[i * 3 + 2];
      a.setY(i, 0.07 * Math.sin(z * 0.35 + t * 1.6) + 0.05 * Math.cos(x * 1.1 + t * 2.1));
    }
    a.needsUpdate = true;
    waterGeo.computeVertexNormals();
    typeStone.rotation.y += dt * 0.6;
    typeStone.material.emissiveIntensity = 0.7 + 0.35 * Math.sin(t * 2.4);
  }

  return { group, colliders, huts, firePit, sticks, typeStone, water, update, heightAt };
}
