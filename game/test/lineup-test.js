// Accessory lineup (#29, #41): every human model in its poses with the accessories the game gives it, the named animals
// that wear code accessories, and Gus carrying every item walking and flying. Each cell is drawn twice (front | side)
// with its own orthographic camera, so one screenshot shows the lot. Uses the game's own code (humans.js,
// characters.js, items.js, gus.js): what it shows is what the game draws.
//
//   ?set=humans|animals|gus   which lineup (default humans)
//   &zoom=body|head           whole figure or a head close-up (humans, animals)
//   &page=0&per=24            paging
//   &only=wedding             cells whose label contains this
//   &t=0.8                    seconds into each clip
//   &cw=150&ch=240            the size of one view (px)

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBakedModel, ruleMaterial } from '../src/gfx/load-model.js';
import { makeHumanClone, dressClone, poseHeld, makeAccessories, accList } from '../src/entities/humans.js';
import { accessoryGeometry } from '../src/entities/characters.js';
import { headPoint } from '../src/entities/crowds.js';
import { LOOKS, SPECIES } from '../src/data/looks.js';
import { PEOPLE, AMBIENT } from '../src/data/people.js';
import { simplifiedGeometry, simplifierReady } from '../src/gfx/simplify.js';
import { Items, ITEM_DEFS, attachCarried, poseCarried } from '../src/systems/items.js';
import { Gus } from '../src/entities/gus.js';
import { GUS_FLY, GUS_STAND } from '../src/entities/gus-rig.js';

const MODELS = '../assets/models/';
const q = new URLSearchParams(location.search);
const SET = q.get('set') || 'humans';
const ZOOM = q.get('zoom') || 'body';
const PAGE = +(q.get('page') || 0), PER = +(q.get('per') || 24);
const ONLY = q.get('only');
const T = +(q.get('t') ?? 0.8);
const LOD = q.has('lod');   // the far LOD meshes (humans: as drawn past lodDist)
const ELEV = +(q.get('elev') || 0);   // camera elevation (radians; < 0 looks up from below, as Gus does)
const CW = +(q.get('cw') || (ZOOM === 'head' || SET === 'gus' ? 150 : 130)), CH = +(q.get('ch') || (ZOOM === 'head' || SET === 'gus' ? 150 : 240));
const LABEL = 16;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xdfe6ea);
document.body.appendChild(renderer.domElement);
const overlay = document.createElement('canvas');
overlay.width = innerWidth; overlay.height = innerHeight;
overlay.style.pointerEvents = 'none';
document.body.appendChild(overlay);
const ctx = overlay.getContext('2d');

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(2, 4, 5);
scene.add(sun);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);

/** cells: { label, obj, frame() → { c: Vector3 (look-at), size: m (frame height), yaw: the figure's facing } } */
const cells = [];

// ------------------------------------------------------------------ humans
async function buildHumans() {
  const loader = new GLTFLoader();
  const outfits = new Map();
  const add = (model, acc, holds, act, label) => {
    const list = accList(model, acc, holds, holds);
    const key = model + '|' + list.join(',') + '|' + (holds || '');
    if (!outfits.has(key)) outfits.set(key, { model, list, holds, act, label });
  };
  for (const spec of [...PEOPLE, ...AMBIENT]) {
    const ms = spec.models || (Array.isArray(spec.model) ? spec.model : [spec.model]);
    for (const m of ms) add(m, spec.acc, spec.holds, spec.act, spec.role);
  }
  add('human-prickett', ['spraytank', 'wand', 'clipboard'], null, 'stand', 'prickett');
  const all = ['human-park', 'human-ranger', 'human-vendor', 'human-prickett', 'human-walter', 'human-wedding', 'human-dolores', 'human-chess-player', 'human-jogger', 'human-tourist', 'human-child', 'human-teen-skater', 'human-birder', 'human-businessperson', 'human-halal-cart-man', 'human-pizza-counterman', 'human-dog-walker', 'human-carriage-driver'];
  for (const m of all) if (![...outfits.values()].some((o) => o.model === m)) add(m, [], null, 'stand', '(none)');
  const gl = {};
  await Promise.all(all.map(async (m) => { try { gl[m] = await loader.loadAsync(MODELS + m + '.glb'); } catch { /* missing */ } }));
  const items = await makeItems();
  const acc = makeAccessories();
  let lodGeo = null;
  if (LOD) {   // as Humans.load builds them
    await simplifierReady;
    lodGeo = new Map();
    for (const g of Object.values(gl)) g.scene.traverse((o) => { if (o.isSkinnedMesh && !lodGeo.has(o.geometry)) lodGeo.set(o.geometry, simplifiedGeometry(o.geometry, 0.35, 0.03, 5)); });
  }
  // (a model's bare outfit only when it has no other: the bride's dress is checked on her own outfit)
  const shown = [...outfits.values()].filter((o) => o.list.length || ![...outfits.values()].some((p) => p.model === o.model && p.list.length));
  for (const o of shown.sort((a, b) => a.model.localeCompare(b.model))) {
    const g = gl[o.model];
    if (!g) continue;
    const names = g.animations.map((a) => a.name);
    const home = o.act === 'sit' && names.includes('sit') ? 'sit' : names.includes('phone') ? 'phone' : names.includes('cook') ? 'cook' : names.includes('look') && o.act !== 'work' ? 'look' : 'idle';
    const poses = ['idle'];
    if (home !== 'idle' && home !== 'sit') poses.push(home);
    if (names.includes('sit')) poses.push('sit');
    poses.push('walk');
    for (const pose of poses) {
      const label = `${o.model.replace('human-', '')} ${o.label}: ${o.list.join(' ') || '-'} [${pose}]`;
      if (ONLY && !label.includes(ONLY)) continue;
      cells.push({ label, make: () => {
        const c = makeHumanClone(g, o.model, lodGeo);
        if (LOD) for (const [m0, lm] of c.lods) { m0.visible = false; lm.visible = true; }
        c.holder.scale.x = 1;   // (no mirrored world here)
        c.holder.visible = true;
        dressClone(c, o.list, acc, { holds: o.holds, items });
        const a = c.actions[pose];
        if (a) { a.reset(); a.play(); c.current = pose; }
        c.mixer.update(T);
        poseHeld(c);
        if (pose === 'sit') c.holder.position.y = 0.08;   // humans.js SEAT.bench
        const grp = new THREE.Group();
        grp.add(c.holder);
        if (pose === 'sit') {   // a bench seat for scale (the game's bench sits 0.22 m behind the sitter)
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.45), ruleMaterial({ color: 0x6a5238 }));
          b.position.set(0, 0.45, -0.22 - 0.05);
          grp.add(b);
        }
        grp.updateMatrixWorld(true);
        const head = new THREE.Vector3();
        c.root.getObjectByName('Head')?.getWorldPosition(head);
        const hh = c.fit?.head ? c.fit.head.top - c.fit.head.chin : 0.4;
        return { obj: grp, frame: () => (ZOOM === 'head' ? { c: head.clone().add(new THREE.Vector3(0, hh * 0.5, 0)), size: hh * 2 } : { c: new THREE.Vector3(0, 1.0, 0), size: 2.25 }) };
      } });
    }
  }
}

// ------------------------------------------------------------------ animals
async function buildAnimals() {
  const cache = {};
  const baked = (id) => (cache[id] ||= loadBakedModel(MODELS + id + '.glb').catch(() => null));
  for (const [id, look] of Object.entries(LOOKS)) {
    if (look.species === 'human' || !(look.acc || []).length) continue;
    const sp = SPECIES[look.species];
    const label = `${id} (${look.model || sp.model}): ${look.acc.join(' ')}`;
    if (ONLY && !label.includes(ONLY)) continue;
    const b = await baked(look.model || sp.model);
    if (!b) continue;
    const ref = (look.model || sp.model) === sp.model ? b : await baked(sp.model);
    cells.push({ label, make: () => {
      const grp = new THREE.Group();
      const t = look.tint || [1, 1, 1];
      grp.add(new THREE.Mesh(b.geometry, b.makeMaterial({ color: new THREE.Color(t[0], t[1], t[2]) })));
      const ag = accessoryGeometry(look, b, ref, look.model || sp.model);
      if (ag) grp.add(new THREE.Mesh(ag, ruleMaterial({ vertexColors: true })));
      grp.scale.setScalar(look.scale || 1);
      grp.updateMatrixWorld(true);
      const bb = b.bounds, s = look.scale || 1;
      const H = headPoint(b).multiplyScalar(s);
      const size = Math.max(bb.max.y - bb.min.y, bb.max.z - bb.min.z) * s;
      return { obj: grp, frame: () => (ZOOM === 'head' ? { c: H.clone().add(new THREE.Vector3(0, -0.05 * size, -0.08 * size)), size: size * 0.42 } : { c: bb.getCenter(new THREE.Vector3()).multiplyScalar(s), size: size * 1.15 }) };
    } });
  }
}

// ------------------------------------------------------------------ Gus carrying
async function makeItems() {
  const items = new Items({ state: {} });
  await items.load({ baked: (id) => loadBakedModel(MODELS + id + '.glb').catch(() => null) });
  return items;
}

async function buildGus() {
  const [stand, fly, items] = await Promise.all([loadBakedModel(MODELS + GUS_STAND.url), loadBakedModel(MODELS + GUS_FLY.url), makeItems()]);
  const world = { boxes: [], perches: [], groundAt: () => 0 };
  const seen = new Set();
  for (const [id, d] of Object.entries(ITEM_DEFS)) {
    if (d.cls === 'huge') continue;
    const look = (d.model || '') + '|' + (d.code || '') + '|' + !!d.anchovy;
    if (seen.has(look)) continue;
    seen.add(look);
    for (const mode of ['walk', 'fly']) {
      const label = `${id} (${d.cls}) [${mode}]`;
      if (ONLY && !label.includes(ONLY)) continue;
      cells.push({ label, make: () => {
        const input = { move: () => ({ x: 0, y: mode === 'walk' ? 1 : 0, edge: false }), held: () => false, pressed: () => false, axis: () => 0, scripted: false, endUpdate() {} };
        const gus = new Gus({ stand, fly, world, input });
        gus.place({ x: 0, z: 0, y: mode === 'fly' ? 4 : 0, yaw: 0, mode });
        const mesh = items.makeMesh(id);
        attachCarried(gus, mesh, d);
        const steps = Math.round(T * 60);
        for (let k = 0; k < steps; k++) { gus.update(1 / 60, 0); poseCarried(gus, mesh, d, 1); }
        const grp = new THREE.Group();
        grp.add(gus.root);
        if (gus.scarf?.tails) grp.add(gus.scarf.tails);
        grp.updateMatrixWorld(true);
        const p = gus.position.clone();
        return { obj: grp, yaw: gus.yaw, frame: () => ({ c: p.clone().add(new THREE.Vector3(0, mode === 'fly' ? 0.17 : 0.16, 0.08)), size: 0.55 }) };
      } });
    }
  }
}

// ------------------------------------------------------------------ draw
function draw() {
  const W = innerWidth, cellW = CW * 2 + 6, cellH = CH + LABEL + 6;
  const cols = Math.max(1, Math.floor(W / cellW));
  const page = cells.slice(PAGE * PER, PAGE * PER + PER);
  const built = page.map((c) => ({ ...c, ...c.make() }));
  for (const b of built) { b.obj.visible = false; scene.add(b.obj); }
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, W, innerHeight); renderer.clear();
  ctx.clearRect(0, 0, W, innerHeight);
  ctx.font = '11px system-ui, sans-serif';
  built.forEach((b, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x0 = col * cellW, y0 = row * cellH;
    b.obj.visible = true;
    const f = b.frame();
    const yaw = b.yaw || 0;
    for (let v = 0; v < 2; v++) {
      const ang = yaw + (v ? Math.PI / 2 : 0);   // front, then from his left (+x when facing +z)
      cam.position.set(f.c.x + Math.sin(ang) * 10 * Math.cos(ELEV), f.c.y + Math.sin(ELEV) * 10, f.c.z + Math.cos(ang) * 10 * Math.cos(ELEV));
      cam.lookAt(f.c);
      const asp = CW / CH;
      cam.top = f.size / 2; cam.bottom = -f.size / 2; cam.left = -f.size * asp / 2; cam.right = f.size * asp / 2;
      cam.updateProjectionMatrix();
      const vx = x0 + v * (CW + 2), vy = innerHeight - (y0 + LABEL + CH);
      renderer.setViewport(vx, vy, CW, CH);
      renderer.setScissor(vx, vy, CW, CH);
      renderer.setClearColor(v ? 0xd4dce2 : 0xe6ecef);
      renderer.clear();
      renderer.render(scene, cam);
    }
    b.obj.visible = false;
    ctx.fillStyle = '#1d2a1b';
    ctx.fillText(b.label.slice(0, 48), x0 + 2, y0 + 12, cellW - 4);
  });
  window.__lineup = { cells: cells.length, page: PAGE, per: PER, shown: built.length, pages: Math.ceil(cells.length / PER), labels: built.map((b) => b.label) };
}

// ------------------------------------------------------------------ measuring (set=measure&model=crow&size=0.2): a model's
// head, front and side, on a 1 cm grid (labelled every 5 cm, model space), to read eyes and necks off; window.__ray(x, y)
// gives the front surface's z there, window.__rayX(z, y, side) the side surface's x
async function measure() {
  const id = q.get('model'), S = +(q.get('size') || 0.2), P = 520;
  const b = await loadBakedModel(MODELS + id + '.glb');
  const mesh = new THREE.Mesh(b.geometry, b.makeMaterial());
  scene.add(mesh);
  const H = headPoint(b);
  const c = new THREE.Vector3(+(q.get('cx') ?? H.x), +(q.get('cy') ?? H.y), +(q.get('cz') ?? H.z));
  renderer.setScissorTest(true);
  ctx.font = '10px system-ui'; ctx.clearRect(0, 0, overlay.width, overlay.height);
  for (let v = 0; v < 2; v++) {
    const ang = v ? Math.PI / 2 : 0;
    cam.position.set(c.x + Math.sin(ang) * 10, c.y, c.z + Math.cos(ang) * 10); cam.lookAt(c);
    cam.top = S / 2; cam.bottom = -S / 2; cam.left = -S / 2; cam.right = S / 2; cam.updateProjectionMatrix();
    const x0 = v * (P + 10);
    renderer.setViewport(x0, innerHeight - P, P, P); renderer.setScissor(x0, innerHeight - P, P, P);
    renderer.setClearColor(0xffffff); renderer.clear(); renderer.render(scene, cam);
    // grid: screen x is model x (front) or -z (side, +z to the left); screen y is model y
    const h0 = v ? -c.z : c.x;
    for (let k = Math.ceil((h0 - S / 2) * 100); k <= (h0 + S / 2) * 100; k++) {
      const px = x0 + ((k / 100 - h0) / S + 0.5) * P; ctx.strokeStyle = k % 5 ? 'rgba(255,0,0,0.25)' : 'rgba(255,0,0,0.7)';
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, P); ctx.stroke(); if (!(k % 5)) { ctx.fillStyle = '#c00'; ctx.fillText(String(v ? -k : k), px + 2, P + 12); }
    }
    for (let k = Math.ceil((c.y - S / 2) * 100); k <= (c.y + S / 2) * 100; k++) {
      const py = (0.5 - (k / 100 - c.y) / S) * P; ctx.strokeStyle = k % 5 ? 'rgba(0,0,255,0.25)' : 'rgba(0,0,255,0.7)';
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0 + P, py); ctx.stroke(); if (!(k % 5)) { ctx.fillStyle = '#00c'; ctx.fillText(String(k), x0 + 2, py - 2); }
    }
    ctx.fillStyle = '#000'; ctx.fillText(`${id} ${v ? 'side (x: -z cm)' : 'front (x cm)'}  y cm`, x0 + 4, P + 24);
  }
  const rc = new THREE.Raycaster();
  window.__ray = (x, y) => { rc.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1)); const h = rc.intersectObject(mesh)[0]; return h ? { z: +h.point.z.toFixed(4), n: h.face.normal.toArray().map((v) => +v.toFixed(3)) } : null; };
  window.__rayX = (z, y, side = -1) => { rc.set(new THREE.Vector3(side * 5, y, z), new THREE.Vector3(-side, 0, 0)); const h = rc.intersectObject(mesh)[0]; return h ? +h.point.x.toFixed(4) : null; };
  window.__lineup = { cells: 0, head: H.toArray(), bounds: [b.bounds.min.toArray(), b.bounds.max.toArray()] };
}

(SET === 'measure' ? measure().then(() => { throw null; }) : SET === 'animals' ? buildAnimals() : SET === 'gus' ? buildGus() : buildHumans())
  .then(() => { document.getElementById('loading').remove(); draw(); })
  .catch((e) => { if (e === null) { document.getElementById('loading').remove(); return; } document.getElementById('loading').textContent = 'Failed: ' + e.message; console.error(e); window.__lineup = { error: e.message }; });
