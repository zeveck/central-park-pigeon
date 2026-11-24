// Small repeated props: lampposts and benches (one InstancedMesh per 128 m
// cell per kind, so each cell culls on its own), the park's low stone wall
// with its gates, the six Nests and the subway grates. Every one is a perch.
//
// Lamppost and bench GLBs replace the code stand-ins when they exist.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PARK, GATES, NESTS, GRATES, TRANSVERSES, AVENUE } from './layout.js';
import { samplePolyline, pointInPoly } from '../core/geo.js';
import { rngFor } from '../core/rng.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { RULE, U } from '../gfx/materials.js';
import { CELL } from '../gfx/batch.js';

const PROP_CELL = CELL * 2;   // perf pass: 256 m prop cells (lamps and benches are cheap; half the draw calls)
import { inPark } from './terrain.js';

/** fix-26: distance from (x, z) to a polyline. */
function nearLine(line, x, z) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L));
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.z + dz * t - z));
  }
  return best;
}

export const LAMP_H = 3.9;     // the cap Gus perches on
export const BENCH = { w: 1.8, back: 0.86, seat: 0.45, d: 0.6 };

// ------------------------------------------------------------------ geometry (vertex colours; aGlow marks the lantern)
function colored(g, color, glow = 0) {
  g = g.index ? g : g;
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(n * 3), gl = new Float32Array(n);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; gl[i] = glow; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aGlow'].includes(k)) g.deleteAttribute(k);
  return g.index ? g : g;
}
const cyl = (r0, r1, h, y, seg = 8) => new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, y + h / 2, 0);
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

export function lamppostGeometry() {
  const iron = 0x2a3328;
  // a cheap stand-in (the lamppost GLB is drawn for the nearest few)
  const parts = [
    colored(cyl(0.16, 0.13, 0.35, 0, 6), iron),
    colored(cyl(0.065, 0.05, 3.27, 0.35, 5), iron),
    colored(cyl(0.11, 0.17, 0.3, 3.57, 6), 0xfff0c0, 1),
    colored(cyl(0.2, 0.06, 0.08, 3.86, 6), iron),
  ];
  return mergeGeometries(parts, false);
}

export function benchGeometry() {
  const wood = 0x4a6b40, iron = 0x2a2e2a;
  // a cheap stand-in (the bench GLB is drawn for the nearest few)
  const parts = [
    colored(box(BENCH.w, 0.05, 0.44, 0, BENCH.seat, -0.06), wood),
    colored(box(BENCH.w, 0.28, 0.03, 0, 0.56, -0.3), wood),
  ];
  for (const x of [-0.8, 0.8]) parts.push(colored(box(0.06, BENCH.back, 0.5, x, 0, -0.06), iron));
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
}

function propMaterial(noise) {
  const m = new THREE.MeshStandardMaterial({ ...RULE, vertexColors: true, map: noise });
  addShaderPatch(m, {
    key: 'propglow',
    uniforms: { uLampGlow: U.uLampGlow },
    vertexHeader: 'attribute float aGlow; varying float vGlow;',
    vertex: 'vGlow = aGlow;',
    fragmentHeader: 'uniform float uLampGlow; varying float vGlow;',
    fragmentReplace: [['#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * vGlow * (0.25 + 1.6 * uLampGlow);']],
  });
  return m;
}

// ------------------------------------------------------------------ placement
export function placeProps(terrain, { blockers = [] } = {}) {
  const S = terrain.shapes;
  const rnd = rngFor('props');
  const lamps = [], benches = [];
  const ok = (x, z) => inPark(x, z, 1) && !S.water.some((w) => pointInPoly(x, z, w.poly))
    && !TRANSVERSES.some((t) => Math.abs(z - t.z) < t.halfWidth + 1.5)
    && !blockers.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const clearOfRoad = (x, z) => { const k = terrain.groundKindAt(x, z); return k.asphalt < 0.1; };
  for (const p of S.paths) {
    if (p.kind === 'bridle' || p.bridge) continue;
    const off = p.width / 2 + 0.55;
    // fix-26: a re-routed path is sampled along its old line (genLine), so the bench draws below stay where they were for
    // every later path; only the samples that still lie on the new line place anything
    const pts = samplePolyline(p.genLine || p.line, 24, { closed: p.closed, offset: 6 });
    const onLine = (s) => !p.genLine || nearLine(p.line, s.x, s.z) < 0.75;
    pts.forEach((s, i) => {
      const here = onLine(s);
      const side = i % 2 ? 1 : -1;
      const x = s.x - s.tz * off * side, z = s.z + s.tx * off * side;
      if (here && ok(x, z) && clearOfRoad(x, z)) lamps.push({ x, z });
      // a bench across the path, facing it
      if (rnd() < 0.55) {
        const along = 8;
        const bx = s.x + s.tx * along + s.tz * (off + 0.2) * side, bz = s.z + s.tz * along - s.tx * (off + 0.2) * side;
        const yaw = Math.atan2(-s.tz * side, s.tx * side);
        if (here && ok(bx, bz) && clearOfRoad(bx, bz)) benches.push({ x: bx, z: bz, yaw });
      }
    });
  }
  // the Mall: lamps and benches between the elms, facing the promenade
  for (let z = 156; z <= 248; z += 8.6) {
    for (const side of [-1, 1]) {
      benches.push({ x: 6.6 + side * 5.2, z, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
      if (Math.round((z - 156) / 8.6) % 2 === 0) lamps.push({ x: 6.6 + side * 9.7, z: z + 4.3 });
    }
  }
  // the park-side sidewalks: lamps every 26 m, a bench by every other one (backs to the wall)
  const lampSide = (x, z, yaw) => { lamps.push({ x, z }); if (rnd() < 0.5) benches.push({ x: x + Math.sin(yaw + Math.PI / 2) * 3, z: z + Math.cos(yaw + Math.PI / 2) * 3, yaw }); };
  for (let z = 10; z < PARK.zMax - 8; z += 26) { lampSide(PARK.xMin - 3.4, z, -Math.PI / 2); lampSide(PARK.xMax + 3.4, z, Math.PI / 2); }
  for (let x = PARK.xMin + 10; x < PARK.xMax - 8; x += 26) { lampSide(x, -3.4, Math.PI); lampSide(x, PARK.zMax + 3.4, 0); }
  const yOf = (p) => (inPark(p.x, p.z) ? terrain.heightAt(p.x, p.z) : 0.15);
  for (const l of lamps) l.y = yOf(l);
  for (const b of benches) b.y = yOf(b);
  return { lamps, benches };
}

// ------------------------------------------------------------------ instanced cells
function cellInstances(name, items, geometry, material, { yawOf = () => 0, shadow = false } = {}) {
  const group = new THREE.Group();
  group.name = name;
  const cells = new Map();
  for (const it of items) {
    const k = `${Math.floor(it.x / PROP_CELL)},${Math.floor(it.z / PROP_CELL)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(it);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const where = new Map();
  const index = new Map(items.map((it, i) => [it, i]));
  for (const [k, list] of cells) {
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.userData.items = list.map((it) => index.get(it));   // perf pass: NearPool packs each cell's drawn instances
    list.forEach((it, i) => { mesh.setMatrixAt(i, m.compose(p.set(it.x, it.y, it.z), q.setFromAxisAngle(up, yawOf(it)), one)); where.set(it, { mesh, slot: i }); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.name = `${name}@${k}`;
    group.add(mesh);
  }
  return { group, where: items.map((it) => where.get(it)), meshes: group.children };
}

/**
 * Build lamps and benches, their collision and perches. Code stand-ins are drawn
 * per 128 m cell; when a GLB exists, the nearest N items in view swap to it
 * (a pool refilled every 8 updates, like the trees) and their cell instance hides.
 */
export function buildProps({ lamps, benches }, { noise, collision, glb = {}, pools = { lamppost: 24, bench: 16 }, range = 300 }) {
  const group = new THREE.Group();
  group.name = 'props';
  const mat = propMaterial(noise);
  const lampCells = cellInstances('lampposts', lamps, lamppostGeometry(), mat);
  const benchCells = cellInstances('benches', benches, benchGeometry(), mat, { yawOf: (b) => b.yaw });
  group.add(lampCells.group, benchCells.group);
  const nearPools = [];
  if (glb.lamppost) nearPools.push(new NearPool('lampposts:glb', lamps, fitBaked(glb.lamppost, LAMP_H, 'height'), glb.lamppost.makeMaterial(), pools.lamppost, lampCells, () => 0, range));
  if (glb.bench) nearPools.push(new NearPool('benches:glb', benches, fitBaked(glb.bench, BENCH.w, 'width'), glb.bench.makeMaterial(), pools.bench, benchCells, (b) => b.yaw, range * 0.6));
  for (const p of nearPools) group.add(p.mesh);
  group.userData.update = (camera, force) => { for (const p of nearPools) p.update(camera, force); };
  group.userData.pools = nearPools;
  lamps.forEach((l, i) => {
    collision.addCylinder({ x: l.x, z: l.z, y0: l.y, h: LAMP_H - 0.02, r: 0.09, tag: 'lamppost', walkable: false });
    collision.addPerch({ x: l.x, y: l.y + LAMP_H + 0.04, z: l.z, r: 0.16, id: 'lamp-' + i, kind: 'lamppost' });
  });
  benches.forEach((b, i) => {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    collision.addBox({ x: b.x, z: b.z, y0: b.y, h: BENCH.seat, w: BENCH.w, d: 0.5, yaw: b.yaw, tag: 'bench' });
    // the backrest top is a perch edge; Gus faces the way the bench faces
    const bx = b.x - s * 0.3, bz = b.z - c * 0.3;
    collision.addPerchEdge({
      a: { x: bx - c * 0.85, y: b.y + BENCH.back, z: bz + s * 0.85 }, b: { x: bx + c * 0.85, y: b.y + BENCH.back, z: bz - s * 0.85 },
      id: 'bench-' + i, kind: 'bench', out: b.yaw,
    });
  });
  return group;
}

const _pm = new THREE.Matrix4(), _fr = new THREE.Frustum(), _sp = new THREE.Sphere();
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _P = new THREE.Vector3(), _ONE = new THREE.Vector3(1, 1, 1), _UP = new THREE.Vector3(0, 1, 0);
const _ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
class NearPool {
  constructor(name, items, geo, mat, cap, cells, yawOf, range = 300) {
    this.items = items; this.cap = cap; this.cells = cells; this.yawOf = yawOf; this.tick = 0; this.range = range;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.name = name; this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.inPool = new Uint8Array(items.length);
  }
  update(camera, force = false) {
    if (!force && this.tick++ % 8 !== 0) return;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pm);
    const c = camera.position, cand = [];
    this.items.forEach((it, i) => {
      const d2 = (it.x - c.x) ** 2 + (it.y - c.y) ** 2 + (it.z - c.z) ** 2;
      if (d2 > 70 * 70) return;
      _sp.center.set(it.x, it.y + 1.5, it.z); _sp.radius = 2.5;
      if (d2 > 25 && !_fr.intersectsSphere(_sp)) return;
      cand.push([d2, i]);
    });
    cand.sort((a, b) => a[0] - b[0]);
    const want = new Uint8Array(this.items.length);
    let n = 0;
    for (const [, i] of cand) { if (n >= this.cap) break; want[i] = 1; const it = this.items[i]; this.mesh.setMatrixAt(n++, _M.compose(_P.set(it.x, it.y, it.z), _Q.setFromAxisAngle(_UP, this.yawOf(it)), _ONE)); }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    // perf pass: the cells' stand-ins are packed: only those not in the pool and within range are drawn
    // (a zero-scaled instance still costs its triangles, and past `range` a lamp is a few pixels)
    const R2 = this.range * this.range;
    for (const mesh of this.cells.meshes) {
      let k = 0;
      for (const i of mesh.userData.items) {
        const it = this.items[i];
        if (want[i] || (it.x - c.x) ** 2 + (it.z - c.z) ** 2 > R2) continue;
        mesh.setMatrixAt(k++, _M.compose(_P.set(it.x, it.y, it.z), _Q.setFromAxisAngle(_UP, this.yawOf(it)), _ONE));
      }
      if (k !== mesh.count || k) { mesh.count = k; mesh.instanceMatrix.needsUpdate = true; }
    }
    this.drawn = n;
  }
}

function fitBaked(baked, size, rule) {
  const g = baked.geometry.clone();
  const b = baked.bounds;
  const dim = rule === 'height' ? b.max.y - b.min.y : b.max.x - b.min.x;
  const s = size / Math.max(dim, 1e-6);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  return g;
}

// ------------------------------------------------------------------ the park wall, nests, grates
export const WALL = { h: 0.95, t: 0.5 };

/** Wall segments along the park's edge, broken at the gates and the transverse openings. */
export function wallSegments() {
  const segs = [];
  const run = (side, from, to, gaps) => {
    const cuts = gaps.map((g) => [g.at - g.w / 2, g.at + g.w / 2]).sort((a, b) => a[0] - b[0]);
    let s = from;
    for (const [a, b] of cuts) { if (a > s) segs.push({ side, a: s, b: Math.min(a, to) }); s = Math.max(s, b); }
    if (s < to) segs.push({ side, a: s, b: to });
  };
  const gap = (side) => GATES.filter((g) => g.side === side).map((g) => ({ at: g.x ?? g.z, w: g.w }));
  run('south', PARK.xMin, PARK.xMax, gap('south'));
  run('north', PARK.xMin, PARK.xMax, gap('north'));
  run('west', PARK.zMin, PARK.zMax, gap('west'));
  run('east', PARK.zMin, PARK.zMax, gap('east'));
  return segs;
}

export function buildWall(batch, collision) {
  for (const s of wallSegments()) {
    const len = s.b - s.a;
    if (len < 0.5) continue;
    const mid = (s.a + s.b) / 2;
    const horiz = s.side === 'south' || s.side === 'north';
    const x = horiz ? mid : s.side === 'west' ? PARK.xMin : PARK.xMax;
    const z = horiz ? (s.side === 'south' ? PARK.zMin : PARK.zMax) : mid;
    const w = horiz ? len : WALL.t, d = horiz ? WALL.t : len;
    batch.box('stone', { x, y: 0, z }, { w, h: WALL.h, d });
    batch.box('stoneDark', { x, y: WALL.h, z }, { w: w + (horiz ? 0 : 0.12), h: 0.08, d: d + (horiz ? 0.12 : 0) });
    collision.addBox({ x, z, y0: 0, h: WALL.h + 0.08, w, d, tag: 'wall' });
    const y = WALL.h + 0.08;
    const out = { south: Math.PI, north: 0, west: -Math.PI / 2, east: Math.PI / 2 }[s.side];
    const a = horiz ? { x: s.a + 0.3, y, z } : { x, y, z: s.a + 0.3 };
    const b = horiz ? { x: s.b - 0.3, y, z } : { x, y, z: s.b - 0.3 };
    collision.addPerchEdge({ a, b, id: `wall-${s.side}-${Math.round(s.a)}`, kind: 'wall', out });
  }
}

export function buildNests(batch, collision, heightAt) {
  const twig = new THREE.TorusGeometry(0.32, 0.11, 6, 14).rotateX(Math.PI / 2);
  const straw = new THREE.CylinderGeometry(0.3, 0.26, 0.08, 12);
  for (const n of NESTS) {
    const y = heightAt(n.x, n.z);
    batch.mesh('woodDark', twig, { x: n.x, y: y + 0.09, z: n.z });
    batch.mesh('tile', straw, { x: n.x, y: y + 0.06, z: n.z });
    batch.mesh('wood', new THREE.TorusGeometry(0.36, 0.06, 5, 12).rotateX(Math.PI / 2), { x: n.x, y: y + 0.16, z: n.z, yaw: 0.6 });
    collision.addPerch({ x: n.x, y: y + 0.1, z: n.z, r: 0.25, id: n.id, kind: 'nest' });
  }
}

export function buildGrates(batch) {
  const out = [];
  for (const g of GRATES) {
    const y = 0.152;
    batch.box('iron', { x: g.x, y: y - 0.01, z: g.z }, { w: 1.8, h: 0.012, d: 1.1 });
    for (let k = -3; k <= 3; k++) batch.box('rubber', { x: g.x + k * 0.24, y, z: g.z }, { w: 0.06, h: 0.014, d: 1.0 });
    out.push({ ...g, y });
  }
  return out;
}
export { AVENUE };
