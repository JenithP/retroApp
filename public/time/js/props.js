// 교수님이 Tripo 로 만든 건물과 소품을 세운다. 그리고 3장 인쇄소 방.
//   placeProp(부모, "abbey", { height: 10, x, z, y, rotY, colliders })
// 모델마다 크기가 제각각이라 「키」로 맞춘다. 바닥 한가운데가 (x, z) 에 오고 밑면이 y 에 닿는다.
import * as THREE from "three";
import { loader } from "./avatar.js";

const cache = new Map();
function load(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`models/${name}.glb`).then(g => g.scene).catch(e => {
    console.warn("소품을 불러오지 못했습니다", name, e); return null;
  }));
  return cache.get(name);
}

export async function placeProp(parent, name, { height, x = 0, z = 0, y = 0, rotY = 0, colliders = null, maxR = 6 } = {}) {
  const src = await load(name);
  if (!src) return null;
  const m = src.clone(true);
  m.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    // Tripo 재질은 금속으로 잡히는 일이 많다 — 비출 주변 환경이 없어 새까맣게 보이므로 낮춘다
    for (const mt of [].concat(o.material)) {
      if (!mt) continue;
      mt.metalness = Math.min(mt.metalness ?? 0, 0.15);
      mt.roughness = Math.max(0.55, mt.roughness ?? 0.8);
      mt.metalnessMap = null;
      mt.needsUpdate = true;
    }
  });
  m.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(m), size = bb.getSize(new THREE.Vector3());
  const s = height / (size.y || 1);
  m.scale.setScalar(s);
  m.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
  const g = new THREE.Group();
  g.add(m);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  const r = Math.min(maxR, Math.max(size.x, size.z) * s * 0.45);
  if (colliders) colliders.push({ x, z, r });
  g.userData.size = size.clone().multiplyScalar(s);
  return g;
}

/* ── 3장 인쇄소 방 ─────────────────────────────────────
   벽·바닥·들보·널어 둔 종이만 코드로 짓고, 인쇄기·활자 상자 같은 큰 소품은 Tripo 모델을 세운다. */
const W = 18, D = 14, H = 5.6;

function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function buildPrintshop() {
  const group = new THREE.Group(), colliders = [];

  // 바닥 — 잉크가 스민 널판
  const planks = canvasTex(512, 512, (g, w, h) => {
    const rows = 8, rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const l = 30 + rnd() * 12;
      g.fillStyle = `hsl(28, 38%, ${l}%)`; g.fillRect(0, i * rh, w, rh);
      g.fillStyle = "rgba(20,12,6,.55)"; g.fillRect(0, i * rh, w, 3);
      const cut = rnd() * w; g.fillRect(cut, i * rh, 3, rh);
      for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(30,18,8,${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * w, i * rh + rnd() * rh, 40 + rnd() * 120, 2); }
    }
    for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(10,8,8,.18)"; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 22, 0, 7); g.fill(); }
  }, [3, 2.4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  group.add(floor);

  // 벽 — 회반죽이 떨어진 돌벽
  const stone = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#b8ad9c"; g.fillRect(0, 0, w, h);
    const rows = 7, rh = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = (i % 2) * -40;
      while (x < w) {
        const bw = 60 + rnd() * 50, l = 58 + rnd() * 14;
        g.fillStyle = `hsl(35, 12%, ${l}%)`; g.fillRect(x + 3, i * rh + 3, bw - 6, rh - 6);
        x += bw;
      }
    }
    g.fillStyle = "rgba(60,45,30,.18)"; g.fillRect(0, h * 0.82, w, h * 0.18);
  }, [4, 1.4]);
  const wallMat = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95 });
  const wall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, 0.5), wallMat);
    m.position.set(x, H / 2, z); m.rotation.y = ry; m.receiveShadow = true;
    group.add(m);
  };
  wall(W, 0, -D / 2, 0); wall(W, 0, D / 2, 0);
  wall(D, -W / 2, 0, Math.PI / 2); wall(D, W / 2, 0, Math.PI / 2);

  // 뒷벽의 높은 창 — 따뜻한 빛
  const glow = new THREE.MeshBasicMaterial({ color: "#ffe2a8" });
  const frame = new THREE.MeshStandardMaterial({ color: "#3a2718", roughness: 0.8 });
  for (const x of [-5.5, 0, 5.5]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), glow);
    win.position.set(x, 3.4, -D / 2 + 0.27); group.add(win);
    for (const dx of [-0.82, 0, 0.82]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.08), frame);
      bar.position.set(x + dx, 3.4, -D / 2 + 0.3); group.add(bar);
    }
  }

  // 들보
  const beamMat = new THREE.MeshStandardMaterial({ color: "#3b2a1c", roughness: 0.85 });
  for (const z of [-4.5, -1, 2.5, 6]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, 0.4), beamMat);
    b.position.set(0, H - 0.2, z); group.add(b);
  }

  // 널어 둔 종이 — 방금 찍은 낱장
  const sheetTex = canvasTex(128, 176, (g, w, h) => {
    g.fillStyle = "#f4ecd9"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a2018";
    g.fillRect(14, 14, w - 28, 12);
    for (let y = 36; y < h - 12; y += 7) g.fillRect(14, y, (w - 28) * (0.7 + rnd() * 0.3), 3);
  });
  const sheetMat = new THREE.MeshStandardMaterial({ map: sheetTex, side: THREE.DoubleSide, roughness: 0.9 });
  const ropeMat = new THREE.MeshBasicMaterial({ color: "#5a4632" });
  for (const [z, y] of [[-3.2, 4.2], [-0.2, 4.4]]) {
    const rope = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.03, 0.03), ropeMat);
    rope.position.set(0, y, z); group.add(rope);
    for (let x = -W / 2 + 1.2; x < W / 2 - 1; x += 0.78) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.76), sheetMat);
      s.position.set(x, y - 0.4, z); s.rotation.y = (rnd() - 0.5) * 0.3; group.add(s);
    }
  }

  // 불빛 — 창과 등잔
  const warm1 = new THREE.PointLight("#ffc98a", 40, 22, 1.4); warm1.position.set(-4, 4.2, 1);
  const warm2 = new THREE.PointLight("#ffd9a0", 34, 22, 1.4); warm2.position.set(4.5, 4.2, -2);
  group.add(warm1, warm2);

  const bounds = { x0: -W / 2 + 0.8, x1: W / 2 - 0.8, z0: -D / 2 + 0.8, z1: D / 2 - 0.8 };
  return { group, colliders, bounds };
}
