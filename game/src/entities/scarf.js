// Gus's short knitted scarf (slice orange #E07B39): a code-built wrap and knot
// on the neck plus two tails simulated with verlet points. Wind comes from
// the wearer's velocity, so the tails stream behind in flight and flop with
// each head-bob on the ground.
//
// Everything lives in the wearer's model space (a child of the model):
// - the wrap and knot use the wearer's NeckBend shader patch (if any), so they
//   bend with the neck; on a skinned wearer (Gus rig: entities/gus-skin.js) the
//   rig's makeMesh() skins them to the same bones and deformPoint() is CPU skinning;
// - the tails are verlet chains simulated in the wearer's own frame, pinned to
//   the knot (moved through NeckBend.deformPoint). Gravity, the wearer's
//   acceleration and the relative wind are turned into that frame each update.
//   Simulating in world space instead is fragile: in flight the knot moves
//   five segment lengths per update.
// - Polish-2: the tails stay outside the body and the folded wings. cfg.hull builds a "radial hull" from the wearer's
//   own rest geometry (the vertices in a box round the body, binned by direction from a centre: the farthest one per
//   bin), and every tail point inside it is pushed out along its direction to the surface plus a margin. On a skinned
//   wearer the hull rides the named bone (the body: its roll, bob and peck lean). Without a hull, the old body sphere.
//
// Usage:
//   const scarf = new Scarf({ texture: knitTile });   // scarf-slice-orange.jpg (makeKnitTexture() as a fallback)
//   scarf.attach(modelObject3D, rig.scarf, neckBendOrNull);   // on a model swap, attach again
//   each update: scarf.update(dt, wearerVelocityWorld);

import * as THREE from 'three';
import { ruleMaterial } from '../gfx/load-model.js';

export const SLICE_ORANGE = 0xe07b39;
// Linear multiplier that makes scarf-slice-orange.jpg (average sRGB 205,122,56) average
// to slice orange at a distance, where mipmaps blend its dark grooves in.
export const KNIT_TILE_TINT = [1.22, 1.02, 1.035];

/** A small seamless knit texture drawn in code (V stitches in columns). */
export function makeKnitTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#E07B39';
  g.fillRect(0, 0, size, size);
  const cols = 4, rows = 8;
  const cw = size / cols, rh = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw, y = j * rh;
      // two leaning loops make a V stitch
      for (const [dx, lean] of [[0.27, 1], [0.73, -1]]) {
        const grd = g.createLinearGradient(x + cw * dx - cw * 0.2, y, x + cw * dx + cw * 0.2, y + rh);
        grd.addColorStop(0, '#f39a5a');
        grd.addColorStop(1, '#b85a26');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x + cw * dx, y + rh * 0.5, cw * 0.2, rh * 0.62, lean * 0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(90,40,15,0.35)';
      g.fillRect(x + cw * 0.48, y, cw * 0.04, rh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _grav = new THREE.Vector3();
const _wind = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _bodyC = new THREE.Vector3();
const _rest = new THREE.Vector3();
const _side = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const _w = new THREE.Vector3();
const _prevSide = new THREE.Vector3();
const _hm = new THREE.Matrix4();
const _e = new THREE.Vector3();
const _hmi = new THREE.Matrix4();
const HULL_AZ = 48, HULL_EL = 24;   // direction bins: azimuth round +y, elevation (Flight hint / scarf: finer, was 32 x 16)
const hulls = new WeakMap();          // geometry → Map(config key → hull) (built once per model and config)

/**
 * The radial hull of a geometry's rest positions: the farthest vertex from `c` in each direction bin, among the vertices
 * inside the box h.x (|x| max), h.y [lo, hi], h.z [lo, hi]. Flight hint / scarf: finer bins, and the grid is dilated (a bin
 * takes the largest of itself and its 8 neighbours), so the smooth lookup never dips inside the surface. It rides one bone
 * rigidly (h.bone), so keep it to a part that is round from its centre and doesn't bend: a radial hull bulges wherever the
 * shape isn't (up the neck, out to a raised tail feather) and threw tail points there. The posed surface does the rest.
 */
function buildHull(geometry, h) {
  const key = JSON.stringify(h);
  let byKey = hulls.get(geometry);
  if (!byKey) hulls.set(geometry, (byKey = new Map()));
  const got = byKey.get(key);
  if (got) return got;
  const pos = geometry.attributes.position;
  const R = new Float32Array(HULL_AZ * HULL_EL), c0 = new THREE.Vector3(...h.c);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(x) > h.x || y < h.y[0] || y > h.y[1] || z < h.z[0] || z > h.z[1]) continue;
    const dx = x - c0.x, dy = y - c0.y, dz = z - c0.z, r = Math.hypot(dx, dy, dz);
    if (r < 1e-6) continue;
    const b = hullBin(dx, dy, dz, r);
    if (r > R[b]) R[b] = r;
  }
  const F = new Float32Array(HULL_AZ * HULL_EL);
  for (let e = 0; e < HULL_EL; e++) for (let a = 0; a < HULL_AZ; a++) {
    let m = 0;
    for (let de = -1; de <= 1; de++) {
      const ee = e + de; if (ee < 0 || ee >= HULL_EL) continue;
      for (let da = -1; da <= 1; da++) m = Math.max(m, R[ee * HULL_AZ + ((a + da + HULL_AZ) % HULL_AZ)]);
    }
    F[e * HULL_AZ + a] = m;
  }
  const out = { key, R: F, c0, ytop: h.y[1], margin: h.margin ?? 0.004, bone: h.bone || null, face: !!h.face, corridor: h.corridor || 0 };
  byKey.set(key, out);
  return out;
}
const _bm = [];
/**
 * Flight hint / scarf: the wearer's own surface as a collider. The vertices in a box (deduplicated, normals averaged) are
 * skinned every update (posedSurface) into a dense grid of 1.5 cm cells; a point closer than `margin` to the surface (signed
 * along the normals of its nearest vertices) is pushed out along them. It catches what a radial hull can't: the tail
 * feather and wing tips (a flat fan, which the radial hull turned into a bulge), the creases between the wings, the nape.
 * s: { x: |x| max, y: [lo, hi], z: [lo, hi], margin }.
 */
const SURF_CELL = 0.015;
const surfaces = new WeakMap();
function buildSurface(geometry, sp, skip = null) {
  const key = JSON.stringify([sp, skip]);
  let byKey = surfaces.get(geometry);
  if (!byKey) surfaces.set(geometry, (byKey = new Map()));
  if (byKey.has(key)) return byKey.get(key);
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight;
  const at = new Map(), P = [], N = [], SI = [], SW = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(x) > sp.x || y < sp.y[0] || y > sp.y[1] || z < sp.z[0] || z > sp.z[1]) continue;
    if (sp.near && Math.hypot(x - sp.near[0], y - sp.near[1], z - sp.near[2]) > sp.near[3]) continue;   // only what the tails can reach
    // skip: what the torso hull already covers exactly (wholly on its bone, inside its box, a little in from its edges)
    if (skip && si && [0, 1, 2, 3].some((c) => sw.getComponent(i, c) > 0.999 && si.getComponent(i, c) === skip.bone) && Math.abs(x) <= skip.x && y >= skip.y[0] && y <= skip.y[1] - 0.035 && z >= skip.z[0] + 0.015 && z <= skip.z[1]) continue;
    const k = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let j = at.get(k);
    if (j === undefined) {
      j = P.length / 3; at.set(k, j);
      P.push(x, y, z); N.push(0, 0, 0);
      for (let c = 0; c < 4; c++) { SI.push(si ? si.getComponent(i, c) : 0); SW.push(sw ? sw.getComponent(i, c) : c ? 0 : 1); }
    }
    if (nor) { N[j * 3] += nor.getX(i); N[j * 3 + 1] += nor.getY(i); N[j * 3 + 2] += nor.getZ(i); }
  }
  const n = P.length / 3;
  for (let j = 0; j < n; j++) { const l = Math.hypot(N[j * 3], N[j * 3 + 1], N[j * 3 + 2]) || 1; N[j * 3] /= l; N[j * 3 + 1] /= l; N[j * 3 + 2] /= l; }
  // the grid spans the box plus a margin for posing (a turned head, a raised tail)
  const lo = [-sp.x - 0.05, sp.y[0] - 0.05, sp.z[0] - 0.05], hi = [sp.x + 0.05, sp.y[1] + 0.05, sp.z[1] + 0.05];
  const dims = lo.map((l, k) => Math.ceil((hi[k] - l) / SURF_CELL));
  const out = { n, P: new Float32Array(P), N: new Float32Array(N), SI: new Uint16Array(SI), SW: new Float32Array(SW), skinned: !!si,
    Q: new Float32Array(P), M: new Float32Array(N), NS: new Uint32Array(n), lo, dims, head: new Int32Array(dims[0] * dims[1] * dims[2]), next: new Int32Array(n), margin: sp.margin ?? 0.006 };
  gridSurface(out);
  byKey.set(key, out);
  return out;
}
function gridSurface(S) {
  const { Q, lo, dims, head, next } = S;
  head.fill(-1);
  for (let j = 0; j < S.n; j++) {
    const ix = Math.floor((Q[j * 3] - lo[0]) / SURF_CELL), iy = Math.floor((Q[j * 3 + 1] - lo[1]) / SURF_CELL), iz = Math.floor((Q[j * 3 + 2] - lo[2]) / SURF_CELL);
    if (ix < 0 || iy < 0 || iz < 0 || ix >= dims[0] || iy >= dims[1] || iz >= dims[2]) { next[j] = -2; continue; }
    const c = ix + dims[0] * (iy + dims[1] * iz);
    next[j] = head[c]; head[c] = j;
  }
}
function posedSurface(S, mesh) {
  const sk = mesh.skeleton;
  if (!sk || !S.skinned) return;
  const nb = sk.bones.length, BM = (S.BM ||= new Float32Array(nb * 16));
  if (!S.used) { S.used = new Uint8Array(nb); for (let i = 0; i < S.SI.length; i++) if (S.SW[i]) S.used[S.SI[i]] = 1; }
  let moved = !S.posed;
  for (let b = 0; b < nb; b++) {
    if (!S.used[b]) continue;
    (_bm[b] ||= new THREE.Matrix4()).multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b]);
    if (mesh.bindMatrix) _bm[b].premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix);
    const e = _bm[b].elements, o = b * 16;
    for (let i = 0; i < 16; i++) if (BM[o + i] !== e[i]) { moved = true; BM[o + i] = e[i]; }
  }
  // none of the bones it hangs on moved (in flight: the body between the wings is all on the root): last update's pose stands
  if (!moved) return;
  S.posed = true;
  // positions only (the grid needs them all); a normal is skinned when surfacePush first asks for it this update
  S.stamp = (S.stamp || 0) + 1;
  const { P, SI, SW, Q } = S;
  for (let j = 0; j < S.n; j++) {
    const j3 = j * 3, j4 = j * 4, x = P[j3], y = P[j3 + 1], z = P[j3 + 2];
    let ox = 0, oy = 0, oz = 0;
    if (SW[j4] === 1) {   // one bone (most of them)
      const e = SI[j4] * 16;
      Q[j3] = BM[e] * x + BM[e + 4] * y + BM[e + 8] * z + BM[e + 12]; Q[j3 + 1] = BM[e + 1] * x + BM[e + 5] * y + BM[e + 9] * z + BM[e + 13]; Q[j3 + 2] = BM[e + 2] * x + BM[e + 6] * y + BM[e + 10] * z + BM[e + 14];
      continue;
    }
    for (let k = 0; k < 4; k++) {
      const w = SW[j4 + k]; if (!w) continue;
      const e = SI[j4 + k] * 16;
      ox += w * (BM[e] * x + BM[e + 4] * y + BM[e + 8] * z + BM[e + 12]); oy += w * (BM[e + 1] * x + BM[e + 5] * y + BM[e + 9] * z + BM[e + 13]); oz += w * (BM[e + 2] * x + BM[e + 6] * y + BM[e + 10] * z + BM[e + 14]);
    }
    Q[j3] = ox; Q[j3 + 1] = oy; Q[j3 + 2] = oz;
  }
  gridSurface(S);
}
/** The posed normal of surface vertex j (into S.M), skinned on first use this update. */
function surfaceNormal(S, j) {
  if (!S.BM) return;   // not skinned: the rest normals in M stand
  if (S.NS[j] === S.stamp) return;
  S.NS[j] = S.stamp;
  const j3 = j * 3, j4 = j * 4, N = S.N, BM = S.BM, nx = N[j3], ny = N[j3 + 1], nz = N[j3 + 2];
  let mx = 0, my = 0, mz = 0;
  for (let k = 0; k < 4; k++) {
    const w = S.SW[j4 + k]; if (!w) continue;
    const e = S.SI[j4 + k] * 16;
    mx += w * (BM[e] * nx + BM[e + 4] * ny + BM[e + 8] * nz); my += w * (BM[e + 1] * nx + BM[e + 5] * ny + BM[e + 9] * nz); mz += w * (BM[e + 2] * nx + BM[e + 6] * ny + BM[e + 10] * nz);
  }
  const l = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
  S.M[j3] = mx / l; S.M[j3 + 1] = my / l; S.M[j3 + 2] = mz / l;
}
const _sp = { j0: -1, j1: -1, j2: -1, d0: 0, d1: 0, d2: 0 };
/** The 3 nearest posed surface vertices to (px, py, pz) in the cells [b + r0, b + r1] on each axis (into _sp). */
function surfaceNearest(S, px, py, pz, bx, by, bz, r0, r1) {
  const Q = S.Q, dims = S.dims, head = S.head, next = S.next, D0 = dims[0], D1 = dims[1];
  let j0 = -1, j1 = -1, j2 = -1, d0 = 1e9, d1 = 1e9, d2 = 1e9;
  for (let z = Math.max(0, bz + r0); z <= Math.min(dims[2] - 1, bz + r1); z++) for (let y = Math.max(0, by + r0); y <= Math.min(D1 - 1, by + r1); y++) for (let x = Math.max(0, bx + r0); x <= Math.min(D0 - 1, bx + r1); x++) {
    for (let j = head[x + D0 * (y + D1 * z)]; j >= 0; j = next[j]) {
      const j3 = j * 3, ex = Q[j3] - px, ey = Q[j3 + 1] - py, ez = Q[j3 + 2] - pz, d = ex * ex + ey * ey + ez * ez;
      if (d >= d2) continue;
      if (d < d0) { d2 = d1; j2 = j1; d1 = d0; j1 = j0; d0 = d; j0 = j; }
      else if (d < d1) { d2 = d1; j2 = j1; d1 = d; j1 = j; }
      else { d2 = d; j2 = j; }
    }
  }
  _sp.j0 = j0; _sp.j1 = j1; _sp.j2 = j2; _sp.d0 = d0; _sp.d1 = d1; _sp.d2 = d2;
}
const _sn = { x: 0, y: 0, z: 0, sd: 0 };
/** Signed distance of (px, py, pz) from the surface at _sp's vertices (normal into _sn). */
function surfaceSigned(S, px, py, pz) {
  const Q = S.Q, M = S.M, { j0, j1, j2, d0, d1, d2 } = _sp;
  surfaceNormal(S, j0); if (j1 >= 0) surfaceNormal(S, j1); if (j2 >= 0) surfaceNormal(S, j2);
  let w = 1 / (Math.sqrt(d0) + 0.002), W = w, a = j0 * 3;
  let nx = M[a] * w, ny = M[a + 1] * w, nz = M[a + 2] * w, sx = Q[a] * w, sy = Q[a + 1] * w, sz = Q[a + 2] * w;
  if (j1 >= 0) { w = 1 / (Math.sqrt(d1) + 0.002); a = j1 * 3; W += w; nx += M[a] * w; ny += M[a + 1] * w; nz += M[a + 2] * w; sx += Q[a] * w; sy += Q[a + 1] * w; sz += Q[a + 2] * w; }
  if (j2 >= 0) { w = 1 / (Math.sqrt(d2) + 0.002); a = j2 * 3; W += w; nx += M[a] * w; ny += M[a + 1] * w; nz += M[a + 2] * w; sx += Q[a] * w; sy += Q[a + 1] * w; sz += Q[a + 2] * w; }
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz); if (l < 1e-6) return false;
  _sn.x = nx / l; _sn.y = ny / l; _sn.z = nz / l;
  _sn.sd = (px - sx / W) * _sn.x + (py - sy / W) * _sn.y + (pz - sz / W) * _sn.z;
  return true;
}
/** Push p out to `margin` above the surface: the 3 nearest posed vertices in the 3 x 3 x 3 cells round p (everything
 *  within a cell, 1.5 cm; a 1 cm search missed points that had swung into the neck's flare in a fast turn), their normals
 *  and positions weighted by distance. Allocation-free. Returns whether it pushed. */
function surfacePush(S, p, lift = 0, deep = false) {
  const lo = S.lo, dims = S.dims, px = p.x, py = p.y, pz = p.z, want = S.margin + lift;
  const bx = Math.floor((px - lo[0]) / SURF_CELL), by = Math.floor((py - lo[1]) / SURF_CELL), bz = Math.floor((pz - lo[2]) / SURF_CELL);
  if (bx < -1 || by < -1 || bz < -1 || bx > dims[0] || by > dims[1] || bz > dims[2]) return false;
  surfaceNearest(S, px, py, pz, bx, by, bz, -1, 1);
  if (_sp.j0 < 0 || !surfaceSigned(S, px, py, pz) || _sn.sd >= want) return false;
  const k = want - _sn.sd;
  p.x = px + _sn.x * k; p.y = py + _sn.y * k; p.z = pz + _sn.z * k;
  return true;
}
function hullBin(dx, dy, dz, r) {
  const az = Math.floor(((Math.atan2(dx, dz) / (2 * Math.PI)) + 1) * HULL_AZ) % HULL_AZ;
  const el = Math.min(HULL_EL - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, dy / r))) / Math.PI + 0.5) * HULL_EL));
  return el * HULL_AZ + az;
}
/** The hull's radius in a direction: bilinear between the four nearest bin centres (smooth, so a tail slides). */
function hullRadius(R, dx, dy, dz, r) {
  const fa = ((Math.atan2(dx, dz) / (2 * Math.PI)) + 1) * HULL_AZ - 0.5;
  const fe = (Math.asin(Math.max(-1, Math.min(1, dy / r))) / Math.PI + 0.5) * HULL_EL - 0.5;
  const a0 = Math.floor(fa), e0 = Math.floor(fe), ta = fa - a0, te = fe - e0;
  const A0 = ((a0 % HULL_AZ) + HULL_AZ) % HULL_AZ, A1 = (A0 + 1) % HULL_AZ;
  const E0 = Math.max(0, Math.min(HULL_EL - 1, e0)), E1 = Math.max(0, Math.min(HULL_EL - 1, e0 + 1));
  const r00 = R[E0 * HULL_AZ + A0], r01 = R[E0 * HULL_AZ + A1], r10 = R[E1 * HULL_AZ + A0], r11 = R[E1 * HULL_AZ + A1];
  return (r00 * (1 - ta) + r01 * ta) * (1 - te) + (r10 * (1 - ta) + r11 * ta) * te;
}

export class Scarf {
  /**
   * texture: the knit tile (game/assets/textures/scarf-slice-orange.jpg, with tint KNIT_TILE_TINT;
   * makeKnitTexture() is a code fallback). wrapRepeat / tailRepeat: tile repeats [u, v] on the wrap (u round the neck,
   * v round the tube) and on each tail (u across, v along), so a stitch is ~1.7 cm everywhere.
   * tailLength and tailWidth are in the wearer's model units (metres at scale 1).
   */
  constructor({ texture = makeKnitTexture(), tint = [1, 1, 1], wrapRepeat = [2, 0.4], tailRepeat = [0.25, 0.77], segments = 7, tailLength = 0.105, tailWidth = 0.034 } = {}) {   // Flight hint / scarf: tails 0.15 → 0.105 (longer ones reached the crease where the raised tail feather meets the rump, and lay stiffly over it)
    this.tint = new THREE.Color(...tint);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.texture = texture;
    this.wrapRepeat = wrapRepeat;
    this.segments = segments;
    this.segLen = tailLength / segments;
    this.tailWidth = tailWidth;
    this.tails = new THREE.Group();
    this.tails.name = 'scarf-tails';
    const tailTex = texture.clone();
    tailTex.repeat.set(tailRepeat[0], tailRepeat[1]);
    tailTex.needsUpdate = true;
    this.tailMaterial = ruleMaterial({ map: tailTex, color: this.tint, side: THREE.DoubleSide });
    this.strands = [0, 1].map((k) => this.#makeStrand(k));
    this.anchorLocal = [new THREE.Vector3(), new THREE.Vector3()];
    this.restDir = [new THREE.Vector3(), new THREE.Vector3()];
    this.prevVel = new THREE.Vector3();
    this.time = 0;
    // Flight hint / scarf: level of detail, set by the game from the camera distance: 0 full; 1 (far: the tails a few
    // pixels) no surface pushes; 2 (very far or unseen) the tails aren't simulated at all
    this.lod = 0;
  }

  #makeStrand(k) {
    const n = this.segments + 1;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3);
    const uv = new Float32Array(n * 2 * 2);
    const idx = [];
    for (let i = 0; i < n; i++) {
      uv.set([0, i / (n - 1), 1, i / (n - 1)], i * 4);
      if (i < n - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, this.tailMaterial);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    this.tails.add(mesh);
    return {
      mesh,
      p: Array.from({ length: n }, () => new THREE.Vector3()),
      prev: Array.from({ length: n }, () => new THREE.Vector3()),
      phase: k * 1.7,
      k,
    };
  }

  /**
   * Put the scarf on a model. `cfg` (model space): neck {x,y,z}, radius [rx, rz],
   * tube, tilt (radians, front dips), knot {x,y,z}, tails [{x,y,z},{x,y,z}] (rest
   * direction of each tail), body {x,y,z,r} (sphere the tails must stay out of, when there's no hull),
   * hull { c: [x,y,z], x: max |x|, y: [lo,hi], z: [lo,hi], margin, bone, face } (Polish-2: the radial hull, see buildHull;
   * face: the ribbons lie flat on it rather than across the wearer's right),
   * swing (Polish-2, radians): how far a tail may swing from its rest direction (0: free).
   */
  attach(model, cfg, neckBend = null) {
    // carry the tails' current shape across a model swap (world → new model space)
    const carried = this.model && this.model !== model ? this.#tailsInWorld() : null;
    if (this.wrap) this.wrap.removeFromParent();
    this.model = model;
    this.cfg = cfg;
    this.neckBend = neckBend;

    // an elliptical ring round the neck, a little taller than it is thick (a folded knit band)
    const r = (cfg.radius[0] + cfg.radius[1]) / 2;
    const wrapGeo = new THREE.TorusGeometry(r, cfg.tube, 10, 28);
    wrapGeo.rotateX(Math.PI / 2);
    wrapGeo.scale(cfg.radius[0] / r, 1.3, cfg.radius[1] / r);
    wrapGeo.rotateX(cfg.tilt);
    wrapGeo.translate(cfg.neck.x, cfg.neck.y, cfg.neck.z);
    const knotGeo = new THREE.SphereGeometry(cfg.tube * 1.5, 10, 8);
    knotGeo.scale(1.1, 0.9, 0.8);
    knotGeo.translate(cfg.knot.x, cfg.knot.y, cfg.knot.z);
    const tex = this.texture.clone();
    tex.repeat.set(this.wrapRepeat[0], this.wrapRepeat[1]);
    tex.needsUpdate = true;
    const mat = ruleMaterial({ map: tex, color: this.tint });
    if (neckBend) neckBend.patch(mat);
    this.wrap = new THREE.Group();
    this.wrap.name = 'scarf-wrap';
    for (const g of [wrapGeo, knotGeo]) {
      // Gus rig: on a skinned wearer the wrap and knot are skinned to the same neck/head bones (makeMesh)
      const m = neckBend?.makeMesh ? neckBend.makeMesh(g, mat) : new THREE.Mesh(g, mat);
      m.castShadow = true;
      this.wrap.add(m);
    }
    model.add(this.wrap, this.tails);

    // Flight hint / scarf: the tails leave from the back of the knot (it sits on the back of the neck), not from its middle,
    // which is at the neck's surface: their roots started inside the nape
    this.anchorLocal[0].set(cfg.knot.x - cfg.tube * 0.6, cfg.knot.y - cfg.tube * 0.2, cfg.knot.z - cfg.tube * 0.8);
    this.anchorLocal[1].set(cfg.knot.x + cfg.tube * 0.6, cfg.knot.y - cfg.tube * 0.2, cfg.knot.z - cfg.tube * 0.8);
    cfg.tails.forEach((d, i) => this.restDir[i].set(d.x, d.y, d.z).normalize());
    // Flight hint / scarf: cfg.hull may be a list (the body, and the neck with its own centre: one radial hull from the
    // body's middle pushed points behind the neck up along it instead of back out of it)
    this.hullList = cfg.hull && model.geometry ? [].concat(cfg.hull).map((h) => buildHull(model.geometry, h)) : [];
    this.hull = this.hullList[0] || null;
    const skipBone = this.hull?.bone && neckBend?.index ? neckBend.index[this.hull.bone] : null;
    const hs = [].concat(cfg.hull || [])[0];
    this.surface = cfg.surface && model.geometry ? buildSurface(model.geometry, cfg.surface, skipBone != null && hs ? { bone: skipBone, x: hs.x, y: hs.y, z: hs.z } : null) : null;   // Flight hint / scarf
    this.hullC = this.hull ? this.hull.c0.clone() : null;   // the hull's centre as posed (for the ribbon's facing)
    if (carried) this.#tailsFromWorld(carried);
    else this.reset();
  }

  /** Swap the knit (the Scarf Stash). */
  setTexture(texture, tint = [1, 1, 1]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.texture = texture;
    this.tint.setRGB(...tint);
    const tt = texture.clone();
    tt.repeat.copy(this.tailMaterial.map.repeat);
    tt.needsUpdate = true;
    this.tailMaterial.map = tt;
    this.tailMaterial.color.copy(this.tint);
    if (this.wrap) for (const m of this.wrap.children) {
      const w = texture.clone();
      w.repeat.set(this.wrapRepeat[0], this.wrapRepeat[1]);
      w.needsUpdate = true;
      m.material.map = w;
      m.material.color.copy(this.tint);
    }
  }

  #tailsInWorld() {
    this.model.updateWorldMatrix(true, false);
    return this.strands.map((s) => s.p.map((p) => p.clone().applyMatrix4(this.model.matrixWorld)));
  }

  #tailsFromWorld(world) {
    this.model.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(this.model.matrixWorld).invert();
    this.strands.forEach((s, k) => {
      s.p.forEach((p, i) => p.copy(world[k][i]).applyMatrix4(inv));
      s.prev.forEach((p, i) => p.copy(s.p[i]));
      this.#anchor(k, _a);
      const shift = _v.subVectors(_a, s.p[0]);           // re-pin to the new knot
      s.p.forEach((p, i) => { p.add(shift); s.prev[i].add(shift); });
      this.#writeRibbon(s);
    });
    this.hasPrevVel = false;
  }

  /** Lay the tails out along their rest directions (after a swap or a teleport). */
  reset() {
    if (this.hull) this.#hullPose();   // Flight hint / scarf: laid out outside the body too (the rest direction can point into it)
    this.strands.forEach((s, k) => {
      this.#anchor(k, _a);
      s.p.forEach((p, i) => { p.copy(_a).addScaledVector(this.restDir[k], i * this.segLen); if (i && this.hull) this.#collide(p, false, k); });
      s.prev.forEach((p, i) => p.copy(s.p[i]));
      this.#writeRibbon(s);
    });
    this.prevVel.set(0, 0, 0);
    this.hasPrevVel = false;
  }

  #anchor(k, out) {
    out.copy(this.anchorLocal[k]);
    if (this.neckBend) this.neckBend.deformPoint(out, _v.copy(this.anchorLocal[k]));
    return out;
  }

  /** velocity: the wearer's world velocity (m/s). */
  update(dt, velocity) {
    if (!this.model || dt <= 0) return;
    if (this.lod >= 2) { this.hasPrevVel = false; return; }   // Flight hint / scarf: frozen while far / unseen
    this.time += dt;
    this.model.updateMatrixWorld(true);
    this.model.matrixWorld.decompose(_pos, _q, _scl);
    _qi.copy(_q).invert();
    const ws = _scl.x;
    // the wearer's acceleration (a fictitious force in its frame), clamped against teleports
    if (this.hasPrevVel) _acc.subVectors(velocity, this.prevVel).divideScalar(dt).clampLength(0, 40);
    else _acc.set(0, 0, 0);
    this.prevVel.copy(velocity);
    this.hasPrevVel = true;
    // accelerations in the wearer's frame and units
    _grav.set(0, -9.8, 0).sub(_acc).applyQuaternion(_qi).divideScalar(ws);
    // air drag towards "behind": weak enough that a cruising tail still sags ~25-30 deg below
    // the horizontal, above his back (pitched ~40 deg), so it reads from behind (a level tail is end-on)
    _wind.copy(velocity).multiplyScalar(-3).applyQuaternion(_qi).divideScalar(ws);
    const speed = velocity.length();
    const flutterAmp = Math.min(1, speed / 3);
    const body = this.cfg.body;
    _bodyC.set(body.x, body.y, body.z);
    this.#hullPose();
    const segLen = this.segLen;
    const damp = 0.92;
    const dt2 = dt * dt;

    const swing = this.cfg.swing || 0, cosSw = Math.cos(swing), sinSw = Math.sin(swing);
    this.strands.forEach((s, k) => {
      const anchor = this.#anchor(k, _a);
      const rest = _rest.copy(this.restDir[k]);
      if (this.hullPosed) rest.transformDirection(_hm);   // the rest direction leans and rolls with the body
      const flutter = Math.sin(this.time * (9 + speed * 2.2) + s.phase) * flutterAmp;
      const side = k ? 1 : -1;
      for (let i = 1; i < s.p.length; i++) {
        const p = s.p[i], pv = s.prev[i];
        const t = i / (s.p.length - 1);
        _v.subVectors(p, pv).multiplyScalar(damp);
        _v.addScaledVector(_grav, dt2);
        _v.addScaledVector(_wind, dt2 * (0.6 + 0.6 * t));
        _v.addScaledVector(rest, dt2 * 6);                      // a knit tail has a little stiffness
        _v.y += flutter * dt2 * 10 * t;
        _v.x += flutter * dt2 * 26 * t * side;                  // side-to-side flap
        pv.copy(p);
        p.add(_v);
      }
      // constraints: pinned root, segment lengths, stay outside the body
      s.p[0].copy(anchor);
      s.prev[0].copy(anchor);
      for (let it = 0; it < 3; it++) {
        for (let i = 1; i < s.p.length; i++) {
          const a = s.p[i - 1], p = s.p[i];
          _v.subVectors(p, a);
          const d = _v.length() || 1e-6;
          const corr = (d - segLen) / d;
          if (i === 1) p.addScaledVector(_v, -corr);
          else { p.addScaledVector(_v, -corr * 0.5); a.addScaledVector(_v, corr * 0.5); }
          if (swing) this.#cone(p, anchor, rest, cosSw, sinSw);
          if (this.hull) this.#collide(p, false, k, false, false);   // (the surface in the final pass: it costs)
          else {
            _v.subVectors(p, _bodyC);
            const bd = _v.length();
            if (bd < body.r) p.addScaledVector(_v, (body.r - bd) / (bd || 1));
          }
        }
        s.p[0].copy(anchor);
      }
      // knit doesn't stretch: a last follow-the-leader pass makes every segment exactly segLen
      // (Polish-2: each point pushed out of the hull again as it goes, so the last word is "outside")
      for (let i = 1; i < s.p.length; i++) {
        _v.subVectors(s.p[i], s.p[i - 1]);
        const d = _v.length();
        if (d > 1e-6) s.p[i].copy(s.p[i - 1]).addScaledVector(_v, segLen / d);
        if (swing) this.#cone(s.p[i], anchor, rest, cosSw, sinSw);
        if (this.hull) this.#collide(s.p[i], false, k);
      }
      this.#writeRibbon(s);
    });
  }

  /** Polish-2: the hull's pose this update (its bone's skinning matrix, or none). */
  #hullPose() {
    const h = this.hull, rig = this.neckBend;
    this.hullPosed = false;
    if (!h) return;
    if (h.bone && rig?.bones?.[h.bone] && rig.skeleton) {
      const i = rig.index[h.bone];
      _hm.multiplyMatrices(rig.bones[h.bone].matrixWorld, rig.skeleton.boneInverses[i]);
      _hmi.copy(_hm).invert();
      this.hullPosed = true;
    }
    this.hullC.copy(h.c0);
    if (this.hullPosed) this.hullC.applyMatrix4(_hm);
    // Flight hint / scarf: the torso hull rides the body bone rigidly (as Polish-2 had it); everything that bends (the
    // neck thrust, the tail, the wing tips) is the posed surface's job, rebuilt here from the skinned vertices
    if (this.surface && this.lod < 1 && this.model.isSkinnedMesh) posedSurface(this.surface, this.model);
  }

  /** Polish-2: keep a tail point within `swing` of its rest direction, seen from the knot (cfg.swing; same distance). */
  #cone(p, anchor, rest, cosSw, sinSw) {
    _w.subVectors(p, anchor);
    const d = _w.length();
    if (d < 1e-6) return;
    const along = _w.dot(rest);
    if (along >= d * cosSw) return;
    _w.addScaledVector(rest, -along);          // the part across the rest direction
    const across = _w.length();
    if (across < 1e-6) _w.set(rest.y, -rest.x, 0).normalize(); else _w.divideScalar(across);
    p.copy(anchor).addScaledVector(rest, d * cosSw).addScaledVector(_w, d * sinSw);
  }

  /** Polish-2: push a model-space point out of the radial hull (to its surface plus the margin, along its direction). */
  /** k: the tail (Flight hint / scarf: the second rides 2 mm higher, so where they overlap one lies on the other, no
   *  flicker); surfaceOnly: the root's edges (in the knot), which a radial hull would throw. */
  #collide(p, edge = false, k = 0, surfaceOnly = false, withSurface = true) {
    const lift = k * 0.002;
    const H = this.hullList;
    if (!surfaceOnly) for (let i = 0; i < H.length; i++) this.#collideOne(H[i], p, edge, lift);
    if (this.cfg.keep) this.#keepOut(p);
    // Flight hint / scarf: then the surface itself (twice: a push off one face can land near another in a crease)
    if (this.surface && withSurface && this.lod < 1) for (let pass = 0; pass < 2 && surfacePush(this.surface, p, lift, surfaceOnly); pass++) {
      if (!surfaceOnly) for (let i = 0; i < H.length; i++) if (H[i].corridor) this.#collideOne(H[i], p, edge, lift);
      if (this.cfg.keep) this.#keepOut(p);
    }
  }
  /** Flight hint / scarf: cfg.keep (model space; the body's roll and lean are small next to its clearance): back, rampY, ramp — behind z
   *  `back` a point must be above a ramp rising rampY + ramp * (back - z), so a tail lifts clear of the crease where the
   *  raised tail feather and crossed wing tips meet the rump (no collider is reliable there; pushing it forward instead
   *  pushed it into the rump);
   *  y0, z0, slope — below y0 a point must be at least z0 - slope * (y0 - y) back (in flight: clear of everything the
   *  wingbeat sweeps through under the shoulders, so the tails trail off the back); floorY — and never below this (the
   *  tail fan and the wings' trailing edges meet down there). */
  #keepOut(p) {
    const K = this.cfg.keep;
    if (!K) return;
    // (each pushes along its plane's normal, so gravity can slide a tail down the plane rather than prop it up)
    if (K.back != null && p.z < K.back) {   // behind `back`, above the ramp y >= rampY + ramp * (back - z)
      const f = p.y - K.rampY - K.ramp * (K.back - p.z);
      if (f < 0) { const k = -f / (1 + K.ramp * K.ramp); p.y += k; p.z += k * K.ramp; }
    }
    if (K.floorY != null && p.y < K.floorY) p.y = K.floorY;
    if (K.y0 != null && p.y < K.y0) {        // below y0, behind the plane z <= z0 - slope * (y0 - y)
      const g = K.z0 - K.slope * (K.y0 - p.y) - p.z;
      if (g < 0) { const k = -g / (1 + K.slope * K.slope); p.y += k * K.slope; p.z -= k; }
    }
  }
  #collideOne(h, p, edge, lift = 0) {
    if (h.corridor) {   // Flight hint / scarf: the tails stay between the wings (a ribbon edge may be half a width further out)
      const cx = h.corridor + (edge ? this.tailWidth * 0.5 : 0);
      p.x = Math.max(-cx, Math.min(cx, p.x));
    }
    const posed = this.hullPosed && h === this.hull;
    if (posed) p.applyMatrix4(_hmi);
    const dx = p.x - h.c0.x, dy = p.y - h.c0.y, dz = p.z - h.c0.z, r = Math.hypot(dx, dy, dz);
    // (above the box it was built from, the hull is only its cut-off top: the neck's flare is the surface's job; pushing
    // out along the ray there sent tails up into the neck)
    if (r > 1e-6 && p.y <= h.ytop) {
      const R = hullRadius(h.R, dx, dy, dz, r) + h.margin + lift;
      if (r < R && R > h.margin) p.set(h.c0.x + (dx * R) / r, h.c0.y + (dy * R) / r, h.c0.z + (dz * R) / r);
    }
    if (posed) p.applyMatrix4(_hm);
  }

  #writeRibbon(s) {
    const pos = s.mesh.geometry.attributes.position;
    const n = s.p.length;
    // ribbon width across the wearer's right (keeps the tail flat, like knit); Polish-2: with a hull, across the body's
    // surface instead (lying flat on the wings and back, not edge-on to them), kept from flipping along the strand
    const hc = this.hull?.face ? this.hullC : null;
    for (let i = 0; i < n; i++) {
      const a = s.p[Math.max(0, i - 1)], c = s.p[Math.min(n - 1, i + 1)];
      _v.subVectors(c, a).normalize();
      if (hc) {
        _w.subVectors(s.p[i], hc);
        _side.crossVectors(_v, _w);
        const l = _side.length();
        if (l > 1e-6 * _w.length()) {
          _side.divideScalar(l);
          if (i ? _side.dot(_prevSide) < 0 : _side.x < 0) _side.negate();
        } else _side.copy(X).addScaledVector(_v, -X.dot(_v)).normalize();
        _prevSide.copy(_side);
      } else _side.copy(X).addScaledVector(_v, -X.dot(_v)).normalize();
      // Flight hint / scarf: gathered to half width into the knot (the root's edges stayed outside the knot and the neck)
      const w = this.tailWidth * (i === n - 1 ? 0.8 : i === 0 ? 0.5 : 1) * 0.5;
      const p = s.p[i];
      if (this.hull) {   // Flight hint / scarf: the ribbon's edges stay outside too (the centre line alone let them dip in)
        for (let sg = -1; sg <= 1; sg += 2) {
          _e.copy(p).addScaledVector(_side, sg * w);
          this.#collide(_e, true, s.k, i === 0);
          pos.setXYZ(i * 2 + (sg > 0 ? 1 : 0), _e.x, _e.y, _e.z);
        }
        continue;
      }
      pos.setXYZ(i * 2, p.x - _side.x * w, p.y - _side.y * w, p.z - _side.z * w);
      pos.setXYZ(i * 2 + 1, p.x + _side.x * w, p.y + _side.y * w, p.z + _side.z * w);
    }
    pos.needsUpdate = true;
    s.mesh.geometry.computeVertexNormals();
  }
}
