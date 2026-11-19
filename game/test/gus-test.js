// Throwaway Gus test scene: proves the head-bob, peck, stand→fly swap,
// wingbeat, scarf and flock read before any other model is bought.
// Everything reusable lives in ../src; this file only builds a tiny world.

import * as THREE from 'three';
import { loadBakedModel, ruleMaterial } from '../src/gfx/load-model.js';
import { createInput } from '../src/input.js';
import { Gus } from '../src/entities/gus.js';
import { Scarf, KNIT_TILE_TINT } from '../src/entities/scarf.js';
import { GUS_FLY, GUS_STAND } from '../src/entities/gus-rig.js';
import { CameraRig } from '../src/camera-rig.js';
import { Flock, patchInstanceTint } from '../src/entities/flock.js';
import { Wingbeat } from '../src/anim/wingbeat.js';

const MODELS = '../assets/models/';
const DT = 1 / 60;
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color(0x9fd0f0);
scene.background = SKY;
scene.fog = new THREE.Fog(0xb9d7e6, 25, 140);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 400);

// Lights: warm late-autumn sun + hemisphere fill (fixed set, never added/removed later).
const hemi = new THREE.HemisphereLight(0xbfe0f5, 0x6f9a4a, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd29a, 2.4);
sun.position.set(-6, 9, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.01;
scene.add(sun, sun.target);

// ------------------------------------------------------------------ world
function noiseTexture(base, spread, size = 128, blades = 1400) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const col = new THREE.Color(base);
  for (let i = 0; i < blades; i++) {
    const k = 1 + (Math.random() - 0.5) * spread;
    g.fillStyle = `rgb(${(col.r * 255 * k) | 0},${(col.g * 255 * k) | 0},${(col.b * 255 * k) | 0})`;
    g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 2 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const grassTex = noiseTexture('#6F9A4A', 0.18, 128, 900);
grassTex.anisotropy = 8;
grassTex.repeat.set(160, 160);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), ruleMaterial({ map: grassTex }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const boxes = [];
const boxMat = ruleMaterial({ map: noiseTexture('#A65E46', 0.12, 64, 200) });
const stoneMat = ruleMaterial({ map: noiseTexture('#8a8682', 0.12, 64, 200) });
function addBox(x, z, w, h, d, mat = boxMat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, h / 2, z);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  boxes.push({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h, z + d / 2) });
}
addBox(-2.2, 3, 1.2, 0.5, 0.6);
addBox(2.5, 5, 0.8, 1.0, 0.8, stoneMat);
addBox(-4, 9, 2.5, 1.6, 1.5, stoneMat);
addBox(5, -3, 1.5, 0.45, 0.45);
addBox(0.8, 14, 3, 3, 3, boxMat);
addBox(-7, -6, 2, 2.2, 2, stoneMat);

// Lamppost-like post with a flat cap Gus can perch on.
const POST = { x: 1.6, z: 8, h: 3.4 };
const postMat = ruleMaterial({ color: 0x2f3b2c });
const post = new THREE.Group();
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, POST.h, 14), postMat);
pole.position.y = POST.h / 2;
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.35, 14), postMat);
base.position.y = 0.175;
const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.28, 8), ruleMaterial({ color: 0xf4e4b0, emissive: 0x6b5a2a }));
lamp.position.y = POST.h + 0.14;
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 12), postMat);
cap.position.y = POST.h + 0.31;
for (const m of [pole, base, lamp, cap]) { m.castShadow = m.receiveShadow = true; post.add(m); }
post.position.set(POST.x, 0, POST.z);
scene.add(post);
const perches = [{ x: POST.x, y: POST.h + 0.34, z: POST.z, r: 0.16 }];
boxes.push({ min: new THREE.Vector3(POST.x - 0.1, 0, POST.z - 0.1), max: new THREE.Vector3(POST.x + 0.1, POST.h + 0.34, POST.z + 0.1) });

const world = {
  boxes,
  perches,
  groundAt(x, z, y) {
    let h = 0;
    for (const b of boxes) if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y <= y) h = Math.max(h, b.max.y);
    for (const p of perches) if (Math.hypot(x - p.x, z - p.z) <= p.r && p.y <= y) h = Math.max(h, p.y);
    return h;
  },
};

// Scatter a few distant blobs so flight has parallax.
const treeMat = ruleMaterial({ color: 0xc4702d });
const trunkMat = ruleMaterial({ color: 0x5a4632 });
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2, r = 22 + (i * 7.3) % 18;
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), trunkMat);
  trunk.position.y = 1.5;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 + (i % 3) * 0.5, 1), i % 3 ? treeMat : ruleMaterial({ color: 0xe8a33d }));
  crown.position.y = 4.4;
  t.add(trunk, crown);
  t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  for (const m of [trunk, crown]) m.castShadow = true;
  scene.add(t);
}

// ------------------------------------------------------------------ actors
const input = createInput(window);
const rig = new CameraRig(camera);
let gus, flock;
let simTime = 0;

async function boot() {
  const [stand, fly, knit] = await Promise.all([
    loadBakedModel(MODELS + GUS_STAND.url),
    loadBakedModel(MODELS + GUS_FLY.url),
    new THREE.TextureLoader().loadAsync('../assets/textures/scarf-slice-orange.jpg'),
  ]);
  knit.anisotropy = 4;
  gus = new Gus({ stand, fly, world, input, scarf: new Scarf({ texture: knit, tint: KNIT_TILE_TINT }) });
  scene.add(gus.root);

  // Flock stand-in: gus-fly geometry tinted grey (pigeon-plain-fly isn't made yet).
  const flockWings = new Wingbeat(GUS_FLY.wings);
  flockWings.setStroke(0.8, -0.5);
  const flockMat = fly.makeMaterial();
  flockWings.patch(flockMat, { instanced: true });
  patchInstanceTint(flockMat, 0.8);
  flock = new Flock({
    geometry: fly.geometry, material: flockMat, wingbeat: flockWings, count: 24, seed: 11,
    scale: GUS_FLY.scale, pitch: GUS_FLY.flightPitch,
    bodyCenter: new THREE.Vector3(GUS_FLY.bodyCenter.x, GUS_FLY.bodyCenter.y, GUS_FLY.bodyCenter.z),
  });
  scene.add(flock.mesh);
  flock.mesh.visible = params.get('flock') !== '0';

  gus.place({ x: 0, z: 0, yaw: 0, mode: 'walk' });
  rig.yaw = gus.yaw;
  flock.place(leader());
  rig.update(DT, gus, { snap: true });
  renderer.compile(scene, camera);
  document.getElementById('loading').remove();
  requestAnimationFrame(frame);
}

const leader = () => ({ position: gus.position, velocity: gus.velocity, yaw: gus.yaw, grounded: gus.grounded });

function update(dt) {
  simTime += dt;
  gus.update(dt, rig.yaw);
  if (flock.mesh.visible) flock.update(dt, leader(), camera.position);
  rig.update(dt, gus);
  // keep the shadow box around Gus
  sun.target.position.copy(gus.position);
  sun.position.copy(gus.position).add(_sunOffset);
  input.endUpdate();
}
const _sunOffset = new THREE.Vector3(-6, 9, -4);

function render() {
  renderer.render(scene, camera);
}

// Fixed-step loop; frozen while __game.step drives time.
let frozen = false;
let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!frozen) {
    acc += elapsed;
    while (acc >= DT) { update(DT); acc -= DT; }
  }
  render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; });

// ------------------------------------------------------------------ debug hook
const _box = new THREE.Box3();
const _c = new THREE.Vector3();
function screenSize() {
  const mesh = gus.activeMesh;
  mesh.updateWorldMatrix(true, false);
  _box.copy(mesh.geometry.boundingBox);
  let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
  for (let i = 0; i < 8; i++) {
    _c.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z)
      .applyMatrix4(mesh.matrixWorld).project(camera);
    x0 = Math.min(x0, _c.x); x1 = Math.max(x1, _c.x); y0 = Math.min(y0, _c.y); y1 = Math.max(y1, _c.y);
  }
  return { height: +((y1 - y0) / 2).toFixed(3), width: +((x1 - x0) / 2).toFixed(3) };
}

const round = (v) => +v.toFixed(3);
window.__game = {
  state() {
    if (!gus) return { loading: true };
    const p = gus.position;
    return {
      mode: gus.mode,
      model: gus.activeMesh.name,
      position: { x: round(p.x), y: round(p.y), z: round(p.z) },
      yaw: round(gus.yaw),
      speed: round(gus.speed),
      headShift: round(gus.headShift()),
      neckBend: round(gus.neck.uniforms.uNeckBend.value),
      wingPhase: round(gus.wings.uniforms.uWingPhase.value % 1),
      onScreen: screenSize(),
      viewport: { w: innerWidth, h: innerHeight },
      renderer: { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls },
      flock: flock.mesh.visible ? flock.count : 0,
      time: round(simTime),
    };
  },
  ready: () => new Promise((res) => { const t = () => (gus ? res(true) : setTimeout(t, 50)); t(); }),
  /** Freeze real time and advance `seconds` in fixed 1/60 s updates, then render once. */
  step(seconds = 0) {
    frozen = true;
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n; i++) update(DT);
    render();
    return this.state();
  },
  resume() { frozen = false; last = performance.now(); acc = 0; },
  // screenshot helpers (never used by gameplay)
  debug: {
    actor: () => gus,
    render: () => render(),
    place: (opts) => { gus.place(opts); rig.yaw = gus.yaw; flock.place(leader()); rig.update(DT, gus, { snap: true }); render(); return window.__game.state(); },
    view: (v) => { rig.setView(v); rig.update(0, gus); render(); return window.__game.state(); },
    flock: (on) => { flock.mesh.visible = !!on; if (on) flock.place(leader()); render(); },
    /** Side-by-side match check: both models at rest, hidden Gus, camera at a given yaw/distance. */
    compare(on = true, { yaw = 0, dist = 1.4, height = 0.25 } = {}) {
      if (this._cmp) { scene.remove(this._cmp); this._cmp = null; }
      gus.root.visible = !on;
      gus.scarf.tails.visible = !on;
      if (!on) return;
      const g = new THREE.Group();
      const s = new THREE.Mesh(gus.standMesh.geometry, ruleMaterial({ map: gus.standMesh.material.map }));
      const f = new THREE.Mesh(gus.flyMesh.geometry, ruleMaterial({ map: gus.flyMesh.material.map }));
      f.scale.setScalar(GUS_FLY.scale);
      // side by side across the view direction
      s.position.set(Math.cos(yaw) * 0.22, 0, -Math.sin(yaw) * 0.22);
      f.position.set(-Math.cos(yaw) * 0.25, 0, Math.sin(yaw) * 0.25);
      for (const m of [s, f]) { m.castShadow = true; g.add(m); }
      g.position.copy(gus.position);
      g.rotation.y = gus.yaw;
      scene.add(g);
      this._cmp = g;
      rig.setView({ yawOffset: yaw, dist, height, look: 0.16 });
      rig.update(0, gus);
      render();
    },
  },
};

boot().catch((e) => {
  document.getElementById('loading').textContent = 'Failed to load: ' + e.message;
  console.error(e);
});
