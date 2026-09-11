// 불과 연기, 활자의 반짝임. 작은 알갱이를 올려 보내는 것만으로 충분히 불처럼 보인다.
import * as THREE from "three";

function dotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.7)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const DOT = dotTexture();

/** 알갱이 한 무리 — 아래서 태어나 위로 떠오르며 흐려진다 */
function puffs(n, { color, size, blending, rise, spread, life, opacity }) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: DOT, vertexColors: true, transparent: true,
    depthWrite: false, blending, opacity, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const age = new Float32Array(n).map(() => Math.random() * life);
  const vel = Array.from({ length: n }, () => new THREE.Vector3());
  const cA = new THREE.Color(color[0]), cB = new THREE.Color(color[1]), tmp = new THREE.Color();
  const born = i => {
    age[i] = 0;
    pos[i * 3] = (Math.random() - 0.5) * spread; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    vel[i].set((Math.random() - 0.5) * 0.3, rise * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * 0.3);
  };
  for (let i = 0; i < n; i++) born(i);
  return {
    pts, level: 0,
    update(dt) {
      for (let i = 0; i < n; i++) {
        age[i] += dt;
        if (age[i] > life) { if (Math.random() < this.level) born(i); else { pos[i * 3 + 1] = -99; continue; } }
        pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt;
        pos[i * 3] *= 0.985; pos[i * 3 + 2] *= 0.985;            // 위로 갈수록 가운데로 모인다
        const k = age[i] / life;
        tmp.copy(cA).lerp(cB, k).multiplyScalar(1 - k * 0.85);
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/** 모닥불. setLevel(0~1)로 연기만 나다가 활활 타오르게까지 */
export function makeFire(parent, at) {
  const g = new THREE.Group(); g.position.copy(at); parent.add(g);
  const flame = puffs(90, { color: ["#fff1a8", "#e0431c"], size: 0.55, blending: THREE.AdditiveBlending,
    rise: 1.6, spread: 0.55, life: 0.9, opacity: 0.95 });
  const smoke = puffs(40, { color: ["#9a9288", "#4c4843"], size: 1.1, blending: THREE.NormalBlending,
    rise: 1.1, spread: 0.4, life: 2.6, opacity: 0.35 });
  flame.pts.position.y = 0.35; smoke.pts.position.y = 0.9;
  g.add(flame.pts, smoke.pts);
  const light = new THREE.PointLight("#ff9a3c", 0, 16, 1.6);
  light.position.y = 1.1; light.castShadow = false;
  g.add(light);
  let lvl = 0, want = 0, t = 0;
  return {
    group: g,
    setLevel(v) { want = v; },
    update(dt) {
      t += dt;
      lvl += (want - lvl) * (1 - Math.exp(-dt * 1.5));
      flame.level = Math.max(0, (lvl - 0.25) / 0.75);
      smoke.level = Math.min(1, lvl * 1.8) * 0.8;
      flame.update(dt); smoke.update(dt);
      light.intensity = flame.level * (26 + 6 * Math.sin(t * 17) + 4 * Math.sin(t * 31));
    },
  };
}

/** 활자가 빛날 때 둘레로 솟는 금빛 알갱이 */
export function makeSparkle(parent, at) {
  const s = puffs(70, { color: ["#fff3c4", "#d8a63f"], size: 0.28, blending: THREE.AdditiveBlending,
    rise: 1.8, spread: 1.4, life: 1.6, opacity: 1 });
  s.pts.position.copy(at); parent.add(s.pts);
  return s;
}
