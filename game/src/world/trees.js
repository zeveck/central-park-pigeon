// Trees: about 2,500, seeded, densest in the Ramble and the North Woods, the
// Mall's four rows of elms and street trees along the park's sidewalks.
//
// Drawing (Tech plan, "nearest-N tree pools"): every 8 updates the nearest N
// trees in view go into the full-tree InstancedMesh of their species, the next
// M into the LOD pool, and everything else is drawn as a canopy blob in its
// 128 m cell's InstancedMesh (pooled trees are hidden there). Until the Meshy
// trees exist (tree-elm, tree-maple, tree-oak + -lod), the pools use code
// stand-ins: low-poly trunks and lumpy canopies in autumn colours, with a sway shader.

import * as THREE from 'three';
import { shadowOnly } from '../gfx/shadow-only.js';
import { simplifiedGeometry, simplifierReady } from '../gfx/simplify.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from '../core/rng.js';
import { pointInPoly, clamp } from '../core/geo.js';
import { PARK, TRANSVERSES, FLATS, WORLD, AVENUE, NESTS, SIGNS, CLUES } from './layout.js';
import { CHARACTERS } from '../data/crews.js';

/** fix-31 (debug): the trees the clear-of-spots rule removed, for working out which routes the change can reach. */
export const TREES_DROPPED = [];
import { addShaderPatch } from '../anim/shader-patch.js';
import { RULE, U } from '../gfx/materials.js';
import { CELL } from '../gfx/batch.js';

export const SPECIES = ['elm', 'maple', 'oak'];
const PALETTE = {
  elm: ['#E8A33D', '#EDB84A', '#D99A2B', '#C9A23A', '#E3B347'],
  maple: ['#C4492D', '#D9582B', '#E07B39', '#B83A2A', '#E8893A'],
  oak: ['#B8862E', '#A86A2C', '#9A7B3A', '#C77B30', '#8A8A3E'],
};
const TARGET = 2500;

// ------------------------------------------------------------------ placement
/**
 * blockers: [{x0, x1, z0, z1}] rectangles kept clear (landmark footprints).
 * Returns [{x, y, z, h, crown, species, tint: Color, id}].
 */
export function placeTrees(terrain, blockers = []) {
  const rnd = rngFor('trees');
  const S = terrain.shapes;
  const out = [];
  const lawnBlock = S.lawns.filter((l) => l.level !== null);
  const lawnSoft = S.lawns.filter((l) => l.level === null);
  const g = terrain.grid;
  const cellIdx = (x, z) => Math.round((z - g.z0) / g.STEP) * g.NX + Math.round((x - g.x0) / g.STEP);
  // fix-26: against the paths as they were (terrain.genKindAt: a re-routed path at its old line), so moving a path
  // doesn't shift the draws below; trees on a re-routed path's new paint go after the last draw (onNewPaint)
  const clearOfPaths = (x, z, r, kindAt = terrain.genKindAt || terrain.groundKindAt) => {
    for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const k = kindAt(x + dx, z + dz);
      if (k.path > 0.08 || k.pavers > 0.08 || k.asphalt > 0.08) return false;
    }
    return true;
  };
  const blocked = (x, z, pad = 0) => blockers.some((b) => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);
  const flatBlocked = (x, z) => FLATS.some((f) => {
    if (['mall', 'bethesda-upper', 'strawberry', 'delacorte', 'needle'].includes(f.id)) return false; // these keep their trees (or get explicit ones)
    if (f.rect) return x > f.rect.x0 && x < f.rect.x1 && z > f.rect.z0 && z < f.rect.z1;
    return Math.hypot(x - f.circle.x, z - f.circle.z) < f.circle.r;
  });

  const spacing = 3.7;
  for (let z = PARK.zMin + 2; z < PARK.zMax - 2; z += spacing) {
    for (let x = PARK.xMin + 2; x < PARK.xMax - 2; x += spacing) {
      const px = x + (rnd() - 0.5) * spacing * 0.9, pz = z + (rnd() - 0.5) * spacing * 0.9;
      const k = cellIdx(px, pz);
      let dens = 0.2 + 0.08 * fbm(px / 40, pz / 40, { seed: 9 });
      const wid = terrain.woodsId[k];
      if (wid) dens = Math.max(dens, S.woods[wid - 1].density);
      const edge = Math.min(px - PARK.xMin, PARK.xMax - px, pz - PARK.zMin, PARK.zMax - pz);
      if (edge < 14) dens = Math.max(dens, 0.55);
      if (rnd() > dens) continue;
      if (terrain.waterId[k] || g.h[k] < -0.2) continue;
      if (lawnBlock.some((l) => pointInPoly(px, pz, l.poly))) continue;
      if (lawnSoft.some((l) => pointInPoly(px, pz, l.poly)) && rnd() < 0.75) continue;
      if (TRANSVERSES.some((t) => Math.abs(pz - t.z) < t.halfWidth + 3)) continue;
      if (flatBlocked(px, pz) || blocked(px, pz, 2)) continue;
      if (!clearOfPaths(px, pz, 2.2)) continue;
      // keep off the shores
      const nearWater = [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dz]) => terrain.waterId[cellIdx(px + dx, pz + dz)]);
      if (nearWater && rnd() < 0.7) continue;
      const woods = wid ? S.woods[wid - 1].density : 0;
      const r = rnd();
      const species = woods > 0.8 ? (r < 0.45 ? 'oak' : r < 0.8 ? 'maple' : 'elm') : r < 0.34 ? 'elm' : r < 0.67 ? 'maple' : 'oak';
      out.push(makeTree(px, pz, species, rnd, woods > 0.8 ? 1.12 : 1));
    }
  }
  // thin evenly to the target (leaving room for the Mall and street trees)
  const fixedCount = 48 + 220;
  while (out.length > TARGET - fixedCount) out.splice(Math.floor(rnd() * out.length), 1);

  // the Mall: four rows of elms
  for (const dx of [-12.2, -7.2, 7.2, 12.2]) {
    for (let z = 152; z <= 250; z += 8.6) out.push(makeTree(6.6 + dx + (rnd() - 0.5) * 0.4, z + (rnd() - 0.5) * 0.6, 'elm', rnd, 1.15, true));
  }
  // street trees in the park-side sidewalks
  const st = [];
  for (let z = 8; z < PARK.zMax - 6; z += 11) { st.push([PARK.xMin - 2.6, z], [PARK.xMax + 2.6, z]); }
  for (let x = PARK.xMin + 6; x < PARK.xMax - 4; x += 11) { st.push([x, -2.6], [x, PARK.zMax + 2.6]); }
  for (const [x, z] of st) {
    if (blocked(x, z, 1) || TRANSVERSES.some((t) => Math.abs(z - t.z) < 9)) continue;
    const t = makeTree(x, z, rnd() < 0.6 ? 'elm' : 'oak', rnd, 0.72);
    t.street = true;
    out.push(t);
  }
  // playtest: two trees grew right beside a Nest (Pond 1.2 m, Ramble 1.2 m away), so Gus stood inside the trunk's
  // root flare there and the camera saw only bark. Drop any tree that close to a Nest (after every random draw,
  // so no other tree moves).
  // Fixes-2 (P4): the first flight, from the Prologue's lamppost (main.js picks the one at 43.1, 8.4) to sign S1, flew
  // into a canopy: keep a clear corridor (each crown plus 4 m either side of the line). Also after every random draw.
  const S1 = SIGNS.find((q) => q.id === 'S1'), LAMP = { x: 43.1, z: 8.4 };
  const inFirstFlight = (t) => {
    const dx = S1.x - LAMP.x, dz = S1.z - LAMP.z, L2 = dx * dx + dz * dz;
    const u = ((t.x - LAMP.x) * dx + (t.z - LAMP.z) * dz) / L2;
    if (u < 0.08 || u > 0.92) return false;
    return Math.hypot(t.x - (LAMP.x + dx * u), t.z - (LAMP.z + dz * u)) < t.crown + 4;
  };
  // fix-31: no trunk on or right by where someone stands or something happens: named characters' homes on the ground,
  // clue spots on the ground and the crows' market (Ledger stood inside a Ramble trunk, the canopy hiding him as the
  // camera came close)
  const spots = [
    ...Object.values(CHARACTERS).filter((c) => c.at && c.at.x != null && !c.at.on).map((c) => c.at),
    ...CLUES.filter((c) => c.x != null && !c.on).map((c) => ({ x: c.x, z: c.z })),
    { x: -12.6, z: 363.4 }, { x: -10, z: 365 },   // Ledger's stall at the Exchange oak (item-sources.js), the oak's spot
  ];
  const clearOf = (t) => !spots.some((p) => Math.hypot(t.x - p.x, t.z - p.z) < 2.5);
  TREES_DROPPED.length = 0;
  const onNewPaint = (t) => terrain.genMaskData && clearOfPaths(t.x, t.z, 2.2) && !clearOfPaths(t.x, t.z, 2.2, terrain.groundKindAt);
  for (const t of out) if (!clearOf(t) || onNewPaint(t)) TREES_DROPPED.push({ x: +t.x.toFixed(1), z: +t.z.toFixed(1) });   // (debug: what fix-31 removed)
  const kept = out.filter((t) => !NESTS.some((n) => Math.hypot(t.x - n.x, t.z - n.z) < 1.8) && !inFirstFlight(t) && clearOf(t) && !onNewPaint(t));
  terrain.genMaskData = null;   // (fix-26: only tree placement reads it)
  kept.forEach((t, i) => { t.id = i; t.y = terrain.heightAt(t.x, t.z) - 0.1; });
  return kept;
}

function makeTree(x, z, species, rnd, scale = 1, mall = false) {
  const base = { elm: [11.5, 4.8], maple: [8.2, 3.5], oak: [10, 4.6] }[species];
  const s = scale * (0.82 + rnd() * 0.36);
  const pal = PALETTE[species];
  const tint = new THREE.Color(pal[Math.floor(rnd() * pal.length)]);
  if (rnd() < 0.08 && !mall) tint.set('#8E9A44'); // a few still hanging on to green
  tint.offsetHSL((rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.06);
  return { x, z, y: 0, h: base[0] * s, crown: base[1] * s * (0.9 + rnd() * 0.2), species, tint, yaw: rnd() * Math.PI * 2, mall };
}

/** Collision: trunks are cylinders, canopies soft spheres. */
export function addTreeCollision(trees, collision) {
  for (const t of trees) {
    collision.addCylinder({ x: t.x, z: t.z, y0: t.y, h: t.h * 0.55, r: 0.22 * (t.h / 10) + 0.08, tag: 'trunk', walkable: false });
    collision.addSoft({ x: t.x, y: t.y + t.h * 0.66, z: t.z, r: t.crown * 0.95, tag: 'canopy', id: t.id });
  }
}

// ------------------------------------------------------------------ stand-in geometry (unit tree: height REF_H)
const REF_H = 10, REF_CROWN = 4.5;

function blob(r, detail, seed, squash = 1) {
  let g = new THREE.IcosahedronGeometry(r, detail);
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.16 * fbm(x * 0.9 + seed, z * 0.9 + y * 0.7, { octaves: 2, seed: 3 + seed });
    p.setXYZ(i, x * n, y * n * squash, z * n);
  }
  g.computeVertexNormals();
  scaleUv(g, 3);
  return g;
}
function scaleUv(g, s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); }
function limb(r0, r1, len, x, y, z, tilt, yaw, radial = 6) {
  const g = new THREE.CylinderGeometry(r1, r0, len, radial, 1, true);
  g.translate(0, len / 2, 0);
  g.rotateZ(tilt);
  g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

function standInGeometry(species, lod) {
  const C = REF_CROWN, H = REF_H;
  const trunk = [], crown = [];
  const det = lod ? 1 : 2;
  if (species === 'elm') {
    trunk.push(limb(0.34, 0.24, H * 0.36, 0, 0, 0, 0, 0, lod ? 5 : 7));
    if (!lod) for (let k = 0; k < 3; k++) trunk.push(limb(0.2, 0.08, H * 0.38, 0, H * 0.33, 0, 0.42, (k * Math.PI * 2) / 3, 5));
    const n = lod ? 2 : 5;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3, rr = lod ? C * 0.35 : C * 0.55;
      crown.push(blob(C * (lod ? 0.75 : 0.58), det, k, 0.62).translate(Math.cos(a) * rr, H * 0.74 + (k % 2) * 0.5, Math.sin(a) * rr));
    }
    if (!lod) crown.push(blob(C * 0.62, det, 9, 0.6).translate(0, H * 0.82, 0));
  } else if (species === 'maple') {
    trunk.push(limb(0.28, 0.18, H * 0.5, 0, 0, 0, 0, 0, lod ? 5 : 7));
    const n = lod ? 1 : 4;
    if (lod) crown.push(blob(C * 0.95, det, 1, 1.05).translate(0, H * 0.64, 0));
    else for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      crown.push(blob(C * 0.62, det, k, 1).translate(Math.cos(a) * C * 0.38, H * 0.6 + (k % 2) * 0.6, Math.sin(a) * C * 0.38));
    }
    if (!lod) crown.push(blob(C * 0.66, det, 7, 1).translate(0, H * 0.78, 0));
  } else {
    trunk.push(limb(0.4, 0.26, H * 0.42, 0, 0, 0, 0, 0, lod ? 5 : 7));
    if (!lod) for (let k = 0; k < 4; k++) trunk.push(limb(0.18, 0.07, H * 0.32, 0, H * 0.36, 0, 0.75, k * 1.6 + 0.4, 5));
    const n = lod ? 2 : 6;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.7, rr = C * (lod ? 0.3 : 0.62);
      crown.push(blob(C * (lod ? 0.82 : 0.52), det, k + 3, 0.72).translate(Math.cos(a) * rr, H * 0.6 + ((k * 7) % 3) * 0.45, Math.sin(a) * rr));
    }
    if (!lod) crown.push(blob(C * 0.6, det, 11, 0.7).translate(0, H * 0.78, 0));
  }
  const t = mergeGeometries(trunk.map((g) => (g.index ? g : mergeVertices(g))), false);
  scaleUv(t, 1);
  return { trunk: t, crown: mergeGeometries(crown, false) };
}

function blobGeometry(detail) {
  const g = blob(REF_CROWN * 0.95, detail, 21, 0.85);
  g.translate(0, REF_H * 0.68, 0);
  return g;
}

// ------------------------------------------------------------------ materials
function canopyMaterial(leavesTex, { sway = true } = {}) {
  const map = leavesTex.clone();
  map.repeat.set(1, 1);
  map.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ ...RULE, map });
  addShaderPatch(m, {
    key: 'canopy' + (sway ? '-sway' : ''),
    uniforms: { uTime: U.uTime },
    vertexHeader: 'uniform float uTime;',
    vertex: sway ? /* glsl */ `
      #ifdef USE_INSTANCING
        float swPh = dot(instanceMatrix[3].xz, vec2(0.13, 0.17));
      #else
        float swPh = 0.0;
      #endif
      float swK = smoothstep(2.0, 9.0, position.y);
      transformed.x += sin(uTime * 1.1 + swPh) * 0.16 * swK;
      transformed.z += cos(uTime * 0.83 + swPh * 1.3) * 0.12 * swK;` : '',
    fragmentAfterMap: /* glsl */ `
      float lLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = vec3(0.5 + 1.0 * lLum);
      // canopies are see-through near the camera (a dithered fade inside ~3.5 m)
      {
        float camD = length(vViewPosition);
        float dth = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        if (camD < 3.6 && dth > smoothstep(1.2, 3.6, camD)) discard;
      }`,
  });
  return m;
}

// ------------------------------------------------------------------ the system
const _f = new THREE.Frustum();
const _pm = new THREE.Matrix4();
const _sph = new THREE.Sphere();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);

export class TreeSystem {
  /** caps: { full, lod } per species pool totals (split across species by demand). */
  constructor({ trees, textures, caps, registry = null, glb = {}, lowDetail = false, fullModel = 'full', lodModel = 'glb' }) {
    this.trees = trees;
    this.caps = caps;
    this.group = new THREE.Group();
    this.group.name = 'trees';
    this.state = new Uint8Array(trees.length);  // 0 blob, 1 full, 2 lod
    this.tick = 0;
    this.drawn = { full: 0, lod: 0, blobs: trees.length };
    const barkMat = new THREE.MeshStandardMaterial({ ...RULE, color: 0x5c4633 });
    const canopy = canopyMaterial(textures.leaves);
    const canopyFar = canopyMaterial(textures.leaves, { sway: false });
    this.pools = {};
    for (const sp of SPECIES) {
      const lodGlb = lodModel === 'standin' ? null : glb[sp + '-lod'];
      const lod = lodGlb ? glbParts(lodGlb) : standInGeometry(sp, true);
      const useLod = fullModel === 'lod';
      const fullGlb = useLod ? glb[sp + '-lod'] : glb[sp];
      const full = fullGlb ? glbParts(fullGlb) : standInGeometry(sp, useLod);
      const fullMat = fullGlb ? glbMaterial(fullGlb) : canopy;
      // perf pass: a "mid" pool between full and LOD (the full GLB at ~60%), and the LOD GLB at ~60%; both are
      // simplified once the simplifier is ready (gfx/simplify.js), drawn as the plain models until then
      const mid = caps.mid && fullGlb ? { trunk: null, crown: full.crown } : null;
      this.pools[sp] = {
        full: this.#pool(full, caps.full, barkMat, fullMat, false, `trees:${sp}:full`),
        mid: mid ? this.#pool(mid, caps.mid, barkMat, fullMat, false, `trees:${sp}:mid`) : null,
        caster: this.#casterPool(lod, caps.casters ?? 40, `trees:${sp}:casters`),
        lod: this.#pool(lod, caps.lod, barkMat, lodGlb ? glbMaterial(lodGlb) : canopy, false, `trees:${sp}:lod`),
      };
      const P = this.pools[sp];
      simplifierReady.then(() => {
        if (P.mid) P.mid.crown.geometry = simplifiedGeometry(full.crown, 0.6, 0.05, 3);
        if (lodGlb && !P.lod.trunk) P.lod.crown.geometry = simplifiedGeometry(lod.crown, 0.6, 0.05, 3);
      });
    }
    // per-cell canopy blobs for everything else
    const blobGeo = blobGeometry(lowDetail ? 0 : 1);
    this.blobGeo = blobGeo;
    this.blobGeoFar = lowDetail ? blobGeo : blobGeometry(0);   // perf pass: cells past blobFar use the 20-tri blob
    this.blobFar = 170;
    this.cells = new Map();
    trees.forEach((t, i) => {
      const key = `${Math.floor(t.x / CELL)},${Math.floor(t.z / CELL)}`;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(i);
    });
    this.cellOf = new Int32Array(trees.length);
    this.slotOf = new Int32Array(trees.length);
    this.cellMeshes = [];
    for (const [key, ids] of this.cells) {
      const mesh = new THREE.InstancedMesh(blobGeo, canopyFar, ids.length);
      mesh.name = 'trees:blobs@' + key;
      mesh.userData.ids = ids;
      ids.forEach((id, slot) => {
        mesh.setMatrixAt(slot, this.#matrix(this.trees[id], _m));
        mesh.setColorAt(slot, this.trees[id].tint);
        this.cellOf[id] = this.cellMeshes.length;
        this.slotOf[id] = slot;
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = false;
      this.cellMeshes.push(mesh);
      this.group.add(mesh);
    }
  }

  #pool(parts, cap, barkMat, canopyMat, shadows, name) {
    const pool = { cap, count: 0 };
    if (parts.trunk) {
      pool.trunk = new THREE.InstancedMesh(parts.trunk, barkMat, cap);
      pool.trunk.name = name + ':trunk';
      pool.trunk.count = 0;
      pool.trunk.frustumCulled = false;
      pool.trunk.castShadow = shadows;
      pool.trunk.receiveShadow = true;
      this.group.add(pool.trunk);
    }
    pool.crown = new THREE.InstancedMesh(parts.crown, canopyMat, cap);
    pool.crown.name = name;
    pool.crown.count = 0;
    pool.crown.frustumCulled = false;
    pool.crown.castShadow = shadows;
    pool.crown.receiveShadow = true;
    pool.crown.setColorAt(0, new THREE.Color(1, 1, 1));
    this.group.add(pool.crown);
    return pool;
  }

  /** Shadow-only near casters (LOD shapes, inside the shadow box): drawn into the shadow map, invisible in colour. */
  #casterPool(parts, cap, name) {
    const geo = parts.trunk ? mergeGeometries([parts.trunk.index ? parts.trunk : mergeVertices(parts.trunk), parts.crown].map((g) => { const c = g.clone(); for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') c.deleteAttribute(k); return c; }), false) : parts.crown;
    const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cap));
    mesh.name = name; mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = false;
    mesh.userData.shadowOn = cap > 0;
    shadowOnly(mesh);   // perf pass: drawn in the shadow pass only (it used to cost a main-pass draw too)
    this.group.add(mesh);
    return { mesh, cap };
  }

  #matrix(t, out) {
    const sxz = t.crown / REF_CROWN, sy = t.h / REF_H;
    _q.setFromAxisAngle(_yAxis, t.yaw);
    return out.compose(_p.set(t.x, t.y, t.z), _q, _s.set(sxz, sy, sxz));
  }

  /** Refill the pools from the camera (every 8 updates, or when forced). */
  update(camera, force = false) {
    if (!force && this.tick++ % 8 !== 0) return;
    camera.updateMatrixWorld();
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _f.setFromProjectionMatrix(_pm);
    const cx = camera.position.x, cz = camera.position.z, cy = camera.position.y;
    const cand = [];
    const maxD2 = 320 * 320;
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      const d2 = (t.x - cx) ** 2 + (t.z - cz) ** 2 + (t.y + t.h * 0.5 - cy) ** 2;
      if (d2 > maxD2) continue;
      _sph.center.set(t.x, t.y + t.h * 0.6, t.z);
      _sph.radius = Math.max(t.crown, t.h * 0.6) + 1;
      if (d2 > 18 * 18 && !_f.intersectsSphere(_sph)) continue;
      cand.push(d2, i);
    }
    // sort pairs by distance
    const idx = [];
    for (let k = 0; k < cand.length; k += 2) idx.push(k);
    idx.sort((a, b) => cand[a] - cand[b]);
    const want = new Uint8Array(this.trees.length);
    const per = {};
    for (const sp of SPECIES) per[sp] = { full: 0, mid: 0, lod: 0 };
    let nFull = 0, nMid = 0, nLod = 0;
    const capMid = this.caps.mid || 0;
    for (const k of idx) {
      const i = cand[k + 1];
      const sp = this.trees[i].species;
      if (nFull < this.caps.full && per[sp].full < this.caps.full) { want[i] = 1; per[sp].full++; nFull++; }
      else if (nMid < capMid && this.pools[sp].mid && per[sp].mid < capMid) { want[i] = 3; per[sp].mid++; nMid++; }
      else if (nLod < this.caps.lod && per[sp].lod < this.caps.lod) { want[i] = 2; per[sp].lod++; nLod++; }
      else break;
    }
    // write the pools
    for (const sp of SPECIES) for (const k of ['full', 'mid', 'lod']) if (this.pools[sp][k]) this.pools[sp][k].count = 0;
    for (const sp of SPECIES) this.pools[sp].caster.mesh.count = 0;
    const sx = this.shadowFocus?.x ?? cx, sz = this.shadowFocus?.z ?? cz, sr = (this.shadowRadius ?? 30) + 6;
    const dirtyCells = new Set();
    for (let i = 0; i < this.trees.length; i++) {
      const w = want[i];
      const t = this.trees[i];
      if (w) {
        const pool = this.pools[t.species][w === 1 ? 'full' : w === 3 ? 'mid' : 'lod'];
        const n = pool.count++;
        this.#matrix(t, _m);
        pool.crown.setMatrixAt(n, _m);
        pool.crown.setColorAt(n, t.tint);
        if (pool.trunk) pool.trunk.setMatrixAt(n, _m);
      }
      if (w && (t.x - sx) ** 2 + (t.z - sz) ** 2 < sr * sr) {
        const cp = this.pools[t.species].caster;
        if (cp.mesh.count < cp.cap) cp.mesh.setMatrixAt(cp.mesh.count++, w ? this.#matrix(t, _m) : _m);
      }
      if ((w === 0) !== (this.state[i] === 0)) dirtyCells.add(this.cellOf[i]);
      this.state[i] = w;
    }
    for (const mesh of this.cellMeshes) {
      const c = mesh.boundingSphere.center, d = Math.hypot(c.x - cx, c.z - cz) - mesh.boundingSphere.radius * 0.5;
      const geo = d > this.blobFar ? this.blobGeoFar : this.blobGeo;
      if (mesh.geometry !== geo) mesh.geometry = geo;
    }
    // perf pass: a cell's blobs are packed and counted (a zero-scaled instance still costs its triangles)
    for (const c of dirtyCells) {
      const mesh = this.cellMeshes[c];
      let n = 0;
      for (const id of mesh.userData.ids) {
        if (this.state[id] !== 0) continue;
        mesh.setMatrixAt(n, this.#matrix(this.trees[id], _m));
        mesh.setColorAt(n, this.trees[id].tint);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
    for (const sp of SPECIES) for (const k of ['full', 'mid', 'lod']) {
      const pool = this.pools[sp][k];
      if (!pool) continue;
      pool.crown.count = pool.count;
      pool.crown.instanceMatrix.needsUpdate = true;
      if (pool.crown.instanceColor) pool.crown.instanceColor.needsUpdate = true;
      if (pool.trunk) { pool.trunk.count = pool.count; pool.trunk.instanceMatrix.needsUpdate = true; }
    }
    for (const sp of SPECIES) this.pools[sp].caster.mesh.instanceMatrix.needsUpdate = true;
    this.drawn = { full: nFull, mid: nMid, lod: nLod, blobs: this.trees.length - nFull - nMid - nLod };
  }
}

function glbParts(baked) {
  // GLB trees: one geometry, normalised to the stand-in's reference height
  const g = baked.geometry.clone();
  const b = baked.bounds;
  const s = REF_H / Math.max(1e-6, b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  // the Meshy trees stand on a wide root flare whose rim floats: sink it into the ground
  g.translate(0, -0.55, 0);
  return { trunk: null, crown: g };
}
function glbMaterial(baked) {
  const m = baked.makeMaterial();
  addShaderPatch(m, {
    key: 'glbtree', uniforms: { uTime: U.uTime }, vertexHeader: 'uniform float uTime;',
    vertex: /* glsl */ `
      #ifdef USE_INSTANCING
        float swPh = dot(instanceMatrix[3].xz, vec2(0.13, 0.17));
      #else
        float swPh = 0.0;
      #endif
      float swK = smoothstep(2.5, 9.0, position.y);
      transformed.x += sin(uTime * 1.1 + swPh) * 0.14 * swK;`,
    // the per-instance autumn tint goes on the leaves only: bright, saturated texels; bark stays bark
    fragmentReplace: [['#include <color_fragment>', /* glsl */ `
      // canopies are see-through near the camera (a dithered fade inside ~3.5 m)
      {
        float camD = length(vViewPosition);
        float dth = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        if (camD < 3.6 && dth > smoothstep(1.2, 3.6, camD)) discard;
      }
      #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        float tLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        float sat = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
        float leafK = smoothstep(0.12, 0.3, tLum) * smoothstep(0.05, 0.18, sat);
        diffuseColor.rgb = mix(diffuseColor.rgb, vColor.rgb * (0.45 + 1.25 * tLum), leafK * 0.85);
      #endif`]],
  });
  return m;
}
