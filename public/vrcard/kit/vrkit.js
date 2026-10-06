// vrkit — 6주차 화면 목업용 작은 3D 도구 (three.js 0.160).
// AI가 매번 three.js 를 처음부터 쓰지 않도록, 장면 · 조명 · 둘러보기 · 붙는 안내를 여기서 맡는다.
// 목업 HTML 은 importmap 으로 "three" 와 "vrkit" 을 받아 아래처럼 쓴다.
//
//   import * as K from "vrkit";
//   const W = K.start({ mode: "AR", place: "room" });
//   const side = W.box({ size: [1.2, 0.04, 0.35], pos: [-0.6, 0, -1.2], color: "#d8c09a" });
//   W.highlight(side, { color: "#2f80ed" });
//   W.tag(side, "1", { color: "#2f80ed" });                 // 물건 위에 붙는 안내 (공간 고정)
//   W.panel("3단계 중 1단계", { corner: "bottom-center" });   // 화면에 붙는 안내 (화면 고정)
//
// 단위는 미터. 바닥은 y = 0, 눈높이 1.6. 기본 시야에 잘 들어오는 범위: x -2~2, z -3.5~-0.5.
import * as THREE from "three";
import { CASES } from "./cases.js";

const DEG = Math.PI / 180;
const css = `
.vk-ui{position:fixed;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif}
.vk-tag{position:absolute;transform:translate(-50%,-100%);padding:5px 10px;border-radius:8px;color:#fff;font-size:15px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none}
.vk-tag.ar{background:rgba(20,110,220,.82);backdrop-filter:blur(2px);border:1px solid rgba(255,255,255,.6)}
.vk-c{position:absolute;display:flex;flex-direction:column;gap:8px;max-width:40%}
.vk-c.top-left{left:16px;top:16px}.vk-c.top-right{right:16px;top:16px;align-items:flex-end}
.vk-c.bottom-left{left:16px;bottom:16px}.vk-c.bottom-right{right:16px;bottom:16px;align-items:flex-end}
.vk-c.top-center{left:50%;top:16px;transform:translateX(-50%);align-items:center}
.vk-c.bottom-center{left:50%;bottom:16px;transform:translateX(-50%);align-items:center}
.vk-c.center{left:50%;top:50%;transform:translate(-50%,-50%);align-items:center}
.vk-panel{background:rgba(15,25,45,.62);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:9px 14px;font-size:15px;line-height:1.45;backdrop-filter:blur(4px);pointer-events:auto}
.vk-btn{background:rgba(30,120,230,.9);color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:12px;padding:10px 18px;font-size:16px;font-weight:700;cursor:pointer;pointer-events:auto}
.vk-bar{width:240px;height:8px;border-radius:99px;background:rgba(255,255,255,.35);overflow:hidden}
.vk-bar>i{display:block;height:100%;background:#4aa3ff}
.vk-hint{position:fixed;right:10px;bottom:6px;font:11px system-ui;color:rgba(255,255,255,.65);pointer-events:none}`;

export function start({ mode = "AR", place = "room", sky, case: caseId } = {}) {
  const preset = caseId != null ? CASES[String(caseId)] : null;
  if (preset) place = preset.place;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.body.style.margin = "0"; document.body.style.overflow = "hidden";

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const ui = document.createElement("div"); ui.className = "vk-ui"; document.body.appendChild(ui);
  const hint = document.createElement("div"); hint.className = "vk-hint"; hint.textContent = "끌어서 둘러보기"; document.body.appendChild(hint);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 300);
  const eye = new THREE.Vector3(0, 1.6, 0.6);
  let yaw = 0, pitch = place === "car" || place === "street" || place === "outdoor" ? -6 * DEG : -32 * DEG;
  const base = { yaw, pitch };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2.5, 5, 2); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(sun);

  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...o });
  const add = (geo, color, pos, o = {}) => {
    const m = new THREE.Mesh(geo, mat(color, o)); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  const plane = (w, d, color, y = 0) => { const m = add(new THREE.PlaneGeometry(w, d), color, [0, y, -d / 2 + 2]); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
  const wall = (w, h, color, pos, ry = 0) => { const m = add(new THREE.PlaneGeometry(w, h), color, pos); m.rotation.y = ry; m.castShadow = false; return m; };

  // 기본 공간 — 단순한 상자와 면으로
  const PLACES = {
    room() { scene.background = new THREE.Color(sky || "#e9e4dc"); plane(10, 10, "#b8946a"); wall(10, 4, "#efe9df", [0, 2, -4.5]); wall(10, 4, "#e6dfd3", [-3.5, 2, -1], 90 * DEG); },
    classroom() { PLACES.room(); for (const x of [-1.6, 0, 1.6]) { add(new THREE.BoxGeometry(1.1, 0.05, 0.6), "#c9a77a", [x, 0.74, -2.6]); } add(new THREE.BoxGeometry(3, 1.1, 0.05), "#2f4a3a", [0, 1.7, -4.45]); },
    lab() { PLACES.room(); add(new THREE.BoxGeometry(3.4, 0.9, 0.8), "#e8ecef", [0, 0.45, -1.4]); },
    museum() { scene.background = new THREE.Color(sky || "#f3f1ec"); plane(12, 12, "#d9d4ca"); wall(12, 5, "#fbfaf7", [0, 2.5, -5]); add(new THREE.BoxGeometry(0.7, 0.9, 0.7), "#f4f2ee", [0, 0.45, -1.8]); },
    hangar() { scene.background = new THREE.Color(sky || "#c9ced3"); plane(20, 20, "#8d9196"); wall(20, 8, "#aab0b6", [0, 4, -8]); },
    street() { scene.background = new THREE.Color(sky || "#cfe2f3"); plane(30, 40, "#6f7378"); add(new THREE.BoxGeometry(3, 0.02, 40), "#9aa0a6", [-4, 0.01, -18]); add(new THREE.BoxGeometry(3, 0.02, 40), "#9aa0a6", [4, 0.01, -18]);
      for (let i = 0; i < 6; i++) { add(new THREE.BoxGeometry(3, 4 + (i % 3) * 3, 4), ["#c8b8a6", "#b7c4cf", "#d6cbbd"][i % 3], [i % 2 ? 7 : -7, (4 + (i % 3) * 3) / 2, -4 - i * 6]); } },
    none() { scene.background = new THREE.Color(sky || "#dfe6ec"); },
    car() { PLACES.street(); eye.set(0, 1.25, 0.2); add(new THREE.BoxGeometry(2.2, 0.35, 0.6), "#2b2f35", [0, 0.95, -0.35]); add(new THREE.BoxGeometry(0.05, 0.9, 0.05), "#2b2f35", [-1.05, 1.5, -0.6]); add(new THREE.BoxGeometry(0.05, 0.9, 0.05), "#2b2f35", [1.05, 1.5, -0.6]); },
    outdoor() { scene.background = new THREE.Color(sky || "#cfe7f5"); plane(40, 40, "#8fb36d"); },
  };
  (PLACES[place] || PLACES.room)();
  scene.fog = new THREE.Fog(scene.background, 12, 45);

  const items = [];
  const tags = [];
  const anims = [];
  const clicks = [];
  const corners = {};
  const corner = c => {
    const k = corners[c] ? c : (["top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center", "center"].includes(c) ? c : "top-left");
    if (!corners[k]) { const d = document.createElement("div"); d.className = "vk-c " + k; ui.appendChild(d); corners[k] = d; }
    return corners[k];
  };
  const posOf = t => t?.isObject3D ? t.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(...t);
  const topOf = t => { if (!t?.isObject3D) return new THREE.Vector3(...t); const b = new THREE.Box3().setFromObject(t); return new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); };

  const W = {
    THREE, scene, camera,
    // 바닥에 놓이는 상자 — pos 는 밑면 가운데
    box({ size = [0.5, 0.5, 0.5], pos = [0, 0, -1.5], color = "#c8a878", rot = [0, 0, 0], opacity = 1 } = {}) {
      const m = add(new THREE.BoxGeometry(...size), color, [pos[0], pos[1] + size[1] / 2, pos[2]], opacity < 1 ? { transparent: true, opacity } : {});
      m.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG); items.push(m); return m;
    },
    cylinder({ radius = 0.2, height = 0.5, pos = [0, 0, -1.5], color = "#9aa4ae" } = {}) {
      const m = add(new THREE.CylinderGeometry(radius, radius, height, 28), color, [pos[0], pos[1] + height / 2, pos[2]]); items.push(m); return m;
    },
    sphere({ radius = 0.2, pos = [0, 0, -1.5], color = "#d0a060" } = {}) {
      const m = add(new THREE.SphereGeometry(radius, 28, 18), color, [pos[0], pos[1] + radius, pos[2]]); items.push(m); return m;
    },
    person({ pos = [0, 0, -3], color = "#4a5a70", height = 1.7 } = {}) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, height * 0.5, 6, 16), mat(color)); body.position.y = height * 0.45;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), mat("#e3b896")); head.position.y = height * 0.88;
      for (const m of [body, head]) { m.castShadow = true; g.add(m); }
      g.position.set(...pos); scene.add(g); items.push(g); return g;
    },
    // 물체를 감싸는 빛나는 테두리
    highlight(target, { color = "#2f80ed", pulse = true } = {}) {
      const b = new THREE.Box3().setFromObject(target), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const geo = new THREE.BoxGeometry(s.x + 0.04, s.y + 0.04, s.z + 0.04);
      const glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color }));
      glow.position.copy(c); edge.position.copy(c); scene.add(glow, edge);
      if (pulse) anims.push(t => { glow.material.opacity = 0.12 + 0.12 * (1 + Math.sin(t * 4)) / 2; });
      const h = { glow, edge, remove() { scene.remove(glow, edge); } }; return h;
    },
    // 물체 위를 가리키는 3D 화살표 (위아래로 움직임)
    arrow(target, { color = "#2f80ed", label } = {}) {
      const top = topOf(target), g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 20), mat(color, { emissive: color, emissiveIntensity: 0.4 })); cone.rotation.x = Math.PI;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 12), mat(color, { emissive: color, emissiveIntensity: 0.4 })); stem.position.y = 0.13;
      g.add(cone, stem); g.position.set(top.x, top.y + 0.12, top.z); scene.add(g);
      const y0 = g.position.y; anims.push(t => { g.position.y = y0 + 0.03 * Math.sin(t * 3); });
      if (label) W.tag([top.x, top.y + 0.32, top.z], label, { color });
      return g;
    },
    // 공간에 붙는 글자 — 둘러봐도 그 물체에 붙어 있다
    tag(target, text, { color = "#1e6fd9", offset = 0.12 } = {}) {
      const el = document.createElement("div"); el.className = "vk-tag" + (mode === "AR" ? " ar" : ""); el.style.background = color; el.textContent = text; ui.appendChild(el);
      const t = { el, target, offset, set(text) { el.textContent = text; }, hide() { el.style.display = "none"; }, show() { el.style.display = ""; } };
      tags.push(t); return t;
    },
    // 화면에 붙는 패널 — 둘러봐도 화면 그 자리에 있다
    panel(html, { corner: c = "top-left", color } = {}) {
      const el = document.createElement("div"); el.className = "vk-panel"; el.innerHTML = html; if (color) el.style.background = color; corner(c).appendChild(el);
      return { el, set(h) { el.innerHTML = h; }, hide() { el.style.display = "none"; }, show() { el.style.display = ""; } };
    },
    button(text, { corner: c = "bottom-right", onClick } = {}) {
      const el = document.createElement("button"); el.className = "vk-btn"; el.textContent = text; if (onClick) el.onclick = onClick; corner(c).appendChild(el);
      return { el, set(t) { el.textContent = t; }, hide() { el.style.display = "none"; }, show() { el.style.display = ""; } };
    },
    progress({ value = 1, max = 3, label, corner: c = "bottom-center" } = {}) {
      const wrap = document.createElement("div"); wrap.className = "vk-panel"; wrap.style.textAlign = "center";
      const lab = document.createElement("div"); const bar = document.createElement("div"); bar.className = "vk-bar"; const fill = document.createElement("i"); bar.appendChild(fill);
      wrap.append(lab, bar); corner(c).appendChild(wrap);
      const p = { el: wrap, set(v) { value = v; lab.textContent = label ? label.replace("{v}", v).replace("{max}", max) : `${v} / ${max}`; fill.style.width = `${Math.min(100, (v / max) * 100)}%`; } };
      p.set(value); return p;
    },
    // 사용자 손 — 화면 아래에 붙어 따라다닌다
    hands({ color = "#e2b08c" } = {}) {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) {
        const h = new THREE.Group();
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.1), mat(color)); h.add(palm);
        for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 4, 8), mat(color)); f.rotation.x = Math.PI / 2; f.position.set(-0.033 + i * 0.022, 0, -0.08); h.add(f); }
        const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.04, 4, 8), mat(color)); th.rotation.set(Math.PI / 2, 0, sx * 0.9); th.position.set(-sx * 0.06, 0, -0.02); h.add(th);
        h.position.set(sx * 0.24, -0.17, -0.42); h.rotation.set(0.35, -sx * 0.35, sx * 0.15); g.add(h);
      }
      camera.add(g); scene.add(camera); return g;
    },
    // 글자가 그려진 판 (표지판 · 화면 · 메뉴판) — pos 는 판의 가운데
    sign({ text = "", w = 0.6, h = 0.3, pos = [0, 1.5, -2], rotY = 0, rotX = 0, bg = "#ffffff", fg = "#222222", size = 0, emissive = false } = {}) {
      const cv = document.createElement("canvas"), k = 512 / Math.max(w, h); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      const g = cv.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = fg;
      const lines = String(text).split("\n"), fs = size ? size * k : Math.min(cv.height / (lines.length * 1.5), cv.width / Math.max(4, Math.max(...lines.map(l => l.length)) * 0.9));
      g.font = `700 ${fs}px system-ui, "Noto Sans KR", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, cv.width / 2, cv.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.35));
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emissive ? new THREE.MeshBasicMaterial({ map: tex }) : mat("#ffffff", { map: tex }));
      m.position.set(...pos); m.rotation.set(rotX * DEG, rotY * DEG, 0); scene.add(m); items.push(m); return m;
    },
    cone({ radius = 0.3, height = 0.5, pos = [0, 0, -2], color = "#7a5a40", segments = 24, rotY = 0 } = {}) {
      const m = add(new THREE.ConeGeometry(radius, height, segments), color, [pos[0], pos[1] + height / 2, pos[2]]); m.rotation.y = rotY * DEG; items.push(m); return m;
    },
    // 시점 바꾸기 — eye: 눈 위치, yaw · pitch: 도 단위 (pitch 음수 = 아래를 봄)
    view({ eye: e, yaw: y, pitch: p } = {}) { if (e) eye.set(...e); if (y != null) yaw = base.yaw = y * DEG; if (p != null) pitch = base.pitch = p * DEG; },
    group(list, pos) { const g = new THREE.Group(); for (const o of list) g.add(o); if (pos) g.position.set(...pos); scene.add(g); return g; },
    obj: {},
    show(o, on = true) { if (o?.el) o.el.style.display = on ? "" : "none"; else if (o?.isObject3D) o.visible = on; else if (o?.glow) { o.glow.visible = on; o.edge.visible = on; } },
    // 물체를 누르면
    onClick(obj, fn) { clicks.push([obj, fn]); },
    // 물체 옮기기 (ms 동안)
    moveTo(obj, pos, ms = 800) {
      const from = obj.position.clone(), to = new THREE.Vector3(pos[0], obj.position.y - (obj.userData.baseY ?? 0) + pos[1], pos[2]); const t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); obj.position.lerpVectors(from, to, k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(step); }; step();
    },
    every(fn) { anims.push(fn); },
  };

  if (preset) { const o = preset.build(W) || {}; Object.assign(W.obj, o); }

  // 둘러보기 — 끌면 고개를 돌리듯, 가만히 있어도 아주 조금 흔들린다 (머리 움직임)
  let drag = null;
  renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; });
  addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; yaw = Math.max(-70 * DEG, Math.min(70 * DEG, drag.yaw - dx * 0.004)); pitch = Math.max(-75 * DEG, Math.min(20 * DEG, drag.pitch - dy * 0.004)); });
  addEventListener("pointerup", e => {
    const was = drag; drag = null; if (!was || was.moved) return;
    const r = renderer.domElement.getBoundingClientRect(); const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    for (const [obj, fn] of clicks) if (ray.intersectObject(obj, true).length) { fn(); break; }
  });
  addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

  const v = new THREE.Vector3();
  const loop = t => {
    t /= 1000;
    const sway = drag ? 0 : 1;
    camera.position.set(eye.x + sway * 0.015 * Math.sin(t * 0.7), eye.y + sway * 0.01 * Math.sin(t * 1.3), eye.z);
    camera.rotation.set(pitch + sway * 0.006 * Math.sin(t * 0.9), yaw + sway * 0.01 * Math.sin(t * 0.5), 0, "YXZ");
    for (const a of anims) a(t);
    renderer.render(scene, camera);
    for (const tg of tags) {
      const p = topOf(tg.target); p.y += tg.offset; v.copy(p).project(camera);
      const behind = v.z > 1;
      tg.el.style.visibility = behind ? "hidden" : "";
      tg.el.style.left = ((v.x + 1) / 2) * innerWidth + "px"; tg.el.style.top = ((1 - v.y) / 2) * innerHeight + "px";
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return W;
}
