// Terrain: one height grid (2 m) for the whole world, the park's hills, rocks,
// lake basins, lawns and sunken transverse cuts; paths, drives and plazas are
// painted into two mask textures (0.5 m per pixel) that the terrain material
// blends: grass, leaf litter, shore mud, bridle dirt, gravel paths, asphalt,
// hex pavers and, on steep slopes, schist.
//
//   const terrain = buildTerrain({ textures });   // CPU data + masks
//   terrain.heightAt(x, z)                         // matches the rendered triangles exactly
//   scene.add(terrain.mesh)                        // chunked (128 m), frustum-culled

import * as THREE from 'three';
import { WORLD, PARK, HILLS, FLATS, TRANSVERSES, TRANSVERSE_RAMP, AVENUE, CITY, GATES } from './layout.js';
import { shapes } from './shapes.js';
import { fbm } from '../core/rng.js';
import { pointInPoly, smoothstep, lerp, clamp } from '../core/geo.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { sideStreets } from './city.js';
import { RULE, TEX } from '../gfx/materials.js';

export const STEP = 2;                 // metres between height samples (and terrain vertices)
export const MASK_RES = 2;             // mask pixels per metre
const CHUNK = 64;                      // cells per chunk side (128 m)

const W = WORLD.xMax - WORLD.xMin;
const NX = Math.round(W / STEP) + 1;
const NZ = Math.ceil((WORLD.zMax - WORLD.zMin) / STEP) + 1;
const H_WORLD = (NZ - 1) * STEP;

export function inPark(x, z, margin = 0) {
  return x > PARK.xMin + margin && x < PARK.xMax - margin && z > PARK.zMin + margin && z < PARK.zMax - margin;
}

// ------------------------------------------------------------------ masks
function makeMaskCanvases() {
  const w = Math.round(W * MASK_RES), h = Math.round(H_WORLD * MASK_RES);
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    g.setTransform(MASK_RES, 0, 0, MASK_RES, -WORLD.xMin * MASK_RES, -WORLD.zMin * MASK_RES);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    return { c, g };
  };
  return { A: mk(), B: mk(), w, h };
}

const CH = { r: 'rgb(255,0,0)', g: 'rgb(0,255,0)', b: 'rgb(0,0,255)' };

function strokeLine(g, line, width, color, closed = false, blur = 0.8) {
  g.filter = blur ? `blur(${blur}px)` : 'none';
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  line.forEach((p, i) => (i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z)));
  if (closed) g.closePath();
  g.stroke();
}
function fillPoly(g, poly, color, blur = 0.8) {
  g.filter = blur ? `blur(${blur}px)` : 'none';
  g.fillStyle = color;
  g.beginPath();
  poly.forEach((p, i) => (i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z)));
  g.closePath();
  g.fill();
}
function fillRect(g, x0, z0, x1, z1, color, blur = 0.6) {
  g.filter = blur ? `blur(${blur}px)` : 'none';
  g.fillStyle = color;
  g.fillRect(x0, z0, x1 - x0, z1 - z0);
}

function paintMasks(S) {
  const m = makeMaskCanvases();
  const A = m.A.g, B = m.B.g;
  // A: r = gravel path, g = hex pavers, b = asphalt.  B: r = leaf litter, g = shore mud, b = bridle dirt.
  for (const w of S.woods) { B.globalAlpha = 0.55 * w.density; fillPoly(B, w.poly, CH.r, 6); }
  B.globalAlpha = 1;
  for (const wb of S.water) {
    if (wb.stone) continue;
    strokeLine(B, wb.poly, wb.stream ? 2.4 : 3.2, CH.g, true, 2.5);
  }
  for (const p of S.paths) {
    const kind = p.kind || 'path';
    if (kind === 'bridle') strokeLine(B, p.line, p.width, CH.b, p.closed, 1.2);
    else strokeLine(A, p.line, p.width, kind === 'pavers' ? CH.g : CH.r, p.closed, 1.0);
  }
  for (const pl of S.plazas) {
    const kind = pl.kind || 'pavers';
    fillPoly(A, pl.poly, kind === 'path' || kind === 'garden' ? CH.r : kind === 'asphalt' ? CH.b : CH.g, 1.0);
  }
  for (const d of S.drives) strokeLine(A, d.line, d.width, CH.b, false, 0.8);
  // transverse road beds
  for (const t of TRANSVERSES) fillRect(A, PARK.xMin - 1, t.z - 4.2, PARK.xMax + 1, t.z + 4.2, CH.b, 0.8);
  // the city ring: avenues and side streets are asphalt (sidewalks are raised slabs built by city.js)
  const zN = PARK.zMax;
  fillRect(A, WORLD.xMin, -AVENUE, WORLD.xMax, 0, CH.b);                     // Central Park South
  fillRect(A, WORLD.xMin, zN, WORLD.xMax, zN + AVENUE, CH.b);                // 110th Street
  fillRect(A, PARK.xMin - AVENUE, WORLD.zMin, PARK.xMin, WORLD.zMax, CH.b);  // Central Park West
  fillRect(A, PARK.xMax, WORLD.zMin, PARK.xMax + AVENUE, WORLD.zMax, CH.b);  // Fifth Avenue
  // the outer street behind the ring's buildings (the rest of Manhattan starts here)
  fillRect(A, WORLD.xMin, WORLD.zMin, WORLD.xMax, -AVENUE - 50, CH.b);
  fillRect(A, WORLD.xMin, zN + AVENUE + 50, WORLD.xMax, WORLD.zMax, CH.b);
  fillRect(A, WORLD.xMin, WORLD.zMin, PARK.xMin - AVENUE - 50, WORLD.zMax, CH.b);
  fillRect(A, PARK.xMax + AVENUE + 50, WORLD.zMin, WORLD.xMax, WORLD.zMax, CH.b);
  // the side streets between the ring's blocks
  const ss = sideStreets();
  for (const z of ss.east.at) fillRect(A, PARK.xMax + AVENUE - 1, z - ss.east.half, WORLD.xMax, z + ss.east.half, CH.b);
  for (const z of ss.west.at) fillRect(A, WORLD.xMin, z - ss.west.half, PARK.xMin - AVENUE + 1, z + ss.west.half, CH.b);
  for (const x of ss.south.at) fillRect(A, x - ss.south.half, WORLD.zMin, x + ss.south.half, -AVENUE + 1, CH.b);
  for (const x of ss.north.at) fillRect(A, x - ss.north.half, zN + AVENUE - 1, x + ss.north.half, WORLD.zMax, CH.b);
  const cc = CITY.columbusCircle;
  A.filter = 'none'; A.fillStyle = CH.b; A.beginPath(); A.arc(cc.x, cc.z, cc.r, 0, Math.PI * 2); A.fill();
  const gp = CITY.plaza;
  fillRect(A, gp.x0, gp.z0, gp.x1, gp.z1, CH.g);
  // gates: a paved apron through each gap in the park wall
  for (const g of GATES) {
    if (g.side === 'south') fillRect(A, g.x - g.w / 2, -1, g.x + g.w / 2, 4, CH.g);
    if (g.side === 'north') fillRect(A, g.x - g.w / 2, zN - 4, g.x + g.w / 2, zN + 1, CH.g);
    if (g.side === 'west') fillRect(A, PARK.xMin - 1, g.z - g.w / 2, PARK.xMin + 4, g.z + g.w / 2, CH.g);
    if (g.side === 'east') fillRect(A, PARK.xMax - 4, g.z - g.w / 2, PARK.xMax + 1, g.z + g.w / 2, CH.g);
  }
  A.filter = B.filter = 'none';
  return m;
}

// ------------------------------------------------------------------ distance fields (chamfer, on the height grid)
function chamfer(inside, nx, nz, step) {
  // distance (m) from each cell to the nearest cell where inside == 1 (0 for inside cells)
  const INF = 1e9;
  const d = new Float32Array(nx * nz);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? 0 : INF;
  const a = step, b = step * Math.SQRT2;
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const i = z * nx + x;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + a);
    if (z > 0) {
      v = Math.min(v, d[i - nx] + a);
      if (x > 0) v = Math.min(v, d[i - nx - 1] + b);
      if (x < nx - 1) v = Math.min(v, d[i - nx + 1] + b);
    }
    d[i] = v;
  }
  for (let z = nz - 1; z >= 0; z--) for (let x = nx - 1; x >= 0; x--) {
    const i = z * nx + x;
    let v = d[i];
    if (x < nx - 1) v = Math.min(v, d[i + 1] + a);
    if (z < nz - 1) {
      v = Math.min(v, d[i + nx] + a);
      if (x < nx - 1) v = Math.min(v, d[i + nx + 1] + b);
      if (x > 0) v = Math.min(v, d[i + nx - 1] + b);
    }
    d[i] = v;
  }
  return d;
}

function rasterPolys(polys, nx, nz) {
  // per cell: index+1 of the polygon containing it (0 = none)
  const id = new Int16Array(nx * nz);
  polys.forEach((poly, k) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const i0 = Math.max(0, Math.floor((x0 - WORLD.xMin) / STEP)), i1 = Math.min(nx - 1, Math.ceil((x1 - WORLD.xMin) / STEP));
    const j0 = Math.max(0, Math.floor((z0 - WORLD.zMin) / STEP)), j1 = Math.min(nz - 1, Math.ceil((z1 - WORLD.zMin) / STEP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (pointInPoly(WORLD.xMin + i * STEP, WORLD.zMin + j * STEP, poly)) id[j * nx + i] = k + 1;
    }
  });
  return id;
}

// ------------------------------------------------------------------ heights
function computeHeights(S, masks) {
  const n = NX * NZ;
  const h = new Float32Array(n);
  const woodsId = rasterPolys(S.woods.map((w) => w.poly), NX, NZ);
  const lawnId = rasterPolys(S.lawns.map((l) => l.poly), NX, NZ);
  const lawnIn = chamfer(Uint8Array.from(lawnId, (v) => (v ? 0 : 1)), NX, NZ, STEP); // distance inside a lawn to its edge
  const waterId = rasterPolys(S.water.map((w) => w.poly), NX, NZ);
  const waterIn = chamfer(Uint8Array.from(waterId, (v) => (v ? 0 : 1)), NX, NZ, STEP);
  const waterOut = chamfer(Uint8Array.from(waterId, (v) => (v ? 1 : 0)), NX, NZ, STEP);

  // road weight from the painted mask (asphalt full, paths half)
  const md = masks.A.g.getImageData(0, 0, masks.w, masks.h).data;
  const roadAt = (x, z) => {
    const px = Math.min(masks.w - 1, Math.max(0, Math.round((x - WORLD.xMin) * MASK_RES)));
    const pz = Math.min(masks.h - 1, Math.max(0, Math.round((z - WORLD.zMin) * MASK_RES)));
    const o = (pz * masks.w + px) * 4;
    return Math.min(1, md[o + 2] / 255 + md[o] / 510 + md[o + 1] / 510);
  };

  // 1. base rolling ground, hills, rougher woods, lawns
  for (let j = 0; j < NZ; j++) {
    const z = WORLD.zMin + j * STEP;
    for (let i = 0; i < NX; i++) {
      const x = WORLD.xMin + i * STEP;
      const k = j * NX + i;
      if (!inPark(x, z)) { h[k] = 0; continue; }
      let y = 1.1 + fbm(x / 70, z / 70, { octaves: 3 }) * 1.7 + fbm(x / 19, z / 19, { octaves: 2, seed: 77 }) * 0.45;
      for (const hl of HILLS) {
        const d2 = (x - hl.x) ** 2 + (z - hl.z) ** 2;
        const s = hl.r * 0.55;
        if (d2 < 9 * s * s) y += hl.h * Math.exp(-d2 / (2 * s * s));
      }
      if (woodsId[k]) y += (fbm(x / 23, z / 23, { octaves: 3, seed: 31 }) * 0.5 + 0.25) * 2.4;
      if (lawnId[k]) {
        const L = S.lawns[lawnId[k] - 1];
        const wgt = smoothstep(0, 10, lawnIn[k]);
        const target = L.level ?? y;
        y = lerp(y, target + fbm(x / 40, z / 40, { seed: 5 }) * 0.25, wgt);
      }
      h[k] = y;
    }
  }

  // 2. roads and paths: blend toward a blurred copy (smooth grades)
  const blur = boxBlur(h, NX, NZ, 3);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    const x = WORLD.xMin + i * STEP, z = WORLD.zMin + j * STEP;
    if (!inPark(x, z)) continue;
    h[k] = lerp(h[k], blur[k], roadAt(x, z) * 0.9);
  }

  // 3. flats under built places
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = WORLD.xMin + i * STEP, z = WORLD.zMin + j * STEP;
    if (!inPark(x, z, -0.1)) continue;
    const k = j * NX + i;
    for (const f of FLATS) {
      let d;
      if (f.rect) {
        const r = f.rect;
        const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
        d = Math.hypot(dx, dz);
      } else d = Math.max(0, Math.hypot(x - f.circle.x, z - f.circle.z) - f.circle.r);
      if (d < f.edge) h[k] = lerp(f.level, h[k], smoothstep(0, f.edge, d));
    }
  }

  // 4. water: shores ease down to the water, basins below it
  const levelOf = (id) => S.water[id - 1];
  const nearest = nearestWater(waterId, NX, NZ, 12);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    const x = WORLD.xMin + i * STEP, z = WORLD.zMin + j * STEP;
    if (waterId[k]) {
      const wb = levelOf(waterId[k]);
      const depth = Math.min(wb.depth, 0.35 + (waterIn[k] + STEP * 0.5) * (wb.stone ? 2 : 0.32));
      h[k] = wb.level - depth;
    } else if (nearest[k] && waterOut[k] < 12) {
      const wb = levelOf(nearest[k]);
      const shore = wb.level + (wb.stone ? 0.55 : 0.3);
      const t = smoothstep(0, wb.stone ? 3 : 10, waterOut[k] - STEP * 0.5);
      h[k] = lerp(shore, Math.max(h[k], shore), t);
      if (waterOut[k] <= STEP * 1.01 && !wb.stone) h[k] = Math.min(h[k], wb.level + 0.25);
    }
  }

  // 5. park edge: meet the street at the low wall
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = WORLD.xMin + i * STEP, z = WORLD.zMin + j * STEP;
    if (!inPark(x, z, -0.1)) continue;
    const k = j * NX + i;
    const edge = Math.min(x - PARK.xMin, PARK.xMax - x, z - PARK.zMin, PARK.zMax - z);
    h[k] = lerp(0.45, h[k], smoothstep(0, 10, edge));
  }

  // 6. transverse cuts (after everything, so they stay crisp)
  for (const t of TRANSVERSES) {
    for (let j = 0; j < NZ; j++) {
      const z = WORLD.zMin + j * STEP;
      const dz = Math.abs(z - t.z);
      if (dz > t.halfWidth + STEP) continue;
      for (let i = 0; i < NX; i++) {
        const x = WORLD.xMin + i * STEP;
        if (x < PARK.xMin - 0.1 || x > PARK.xMax + 0.1) continue;
        const k = j * NX + i;
        const ramp = smoothstep(0, TRANSVERSE_RAMP, Math.min(x - PARK.xMin, PARK.xMax - x));
        const bed = -t.depth * ramp;
        if (dz <= t.halfWidth) h[k] = bed;
        else h[k] = lerp(bed, h[k], (dz - t.halfWidth) / STEP);
      }
    }
  }
  return { h, woodsId, waterId, waterOut };
}

function nearestWater(waterId, nx, nz, maxDist) {
  // propagate the nearest water body's id outward (simple BFS-like sweeps)
  const near = Int16Array.from(waterId);
  const passes = Math.ceil(maxDist / STEP);
  for (let p = 0; p < passes; p++) {
    const prev = Int16Array.from(near);
    for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i;
      if (prev[k]) continue;
      near[k] = prev[k - 1] || prev[k + 1] || prev[k - nx] || prev[k + nx] || 0;
    }
  }
  return near;
}

function boxBlur(src, nx, nz, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let s = 0, c = 0;
    for (let d = -r; d <= r; d++) { const ii = i + d; if (ii >= 0 && ii < nx) { s += src[j * nx + ii]; c++; } }
    tmp[j * nx + i] = s / c;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let s = 0, c = 0;
    for (let d = -r; d <= r; d++) { const jj = j + d; if (jj >= 0 && jj < nz) { s += tmp[jj * nx + i]; c++; } }
    out[j * nx + i] = s / c;
  }
  return out;
}

// ------------------------------------------------------------------ material
export function createTerrainMaterial(tex, maskTexA, maskTexB) {
  const mat = new THREE.MeshStandardMaterial({ ...RULE, color: 0xffffff });
  const T = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const uniforms = {
    tGrass: { value: T(tex.grass) }, tPath: { value: T(tex.path) }, tPavers: { value: T(tex.pavers) },
    tSchist: { value: T(tex.schist) }, tLeaves: { value: T(tex.leaves) },
    tMaskA: { value: maskTexA }, tMaskB: { value: maskTexB },
    uWorld: { value: new THREE.Vector4(WORLD.xMin, WORLD.zMin, 1 / W, 1 / H_WORLD) },
    uTiles: { value: new THREE.Vector4(TEX.grass.tile, TEX.path.tile, TEX.pavers.tile, TEX.leaves.tile) },
  };
  addShaderPatch(mat, {
    key: 'terrain',
    uniforms,
    vertexHeader: 'varying vec3 vTWPos; varying vec3 vTWNorm;',
    // data-space position: the terrain's chunks sit at the origin of the (mirrored) world root
    vertex: 'vTWPos = transformed; vTWNorm = normalize(objectNormal);',
    fragmentHeader: /* glsl */ `
      uniform sampler2D tGrass, tPath, tPavers, tSchist, tLeaves, tMaskA, tMaskB;
      uniform vec4 uWorld, uTiles;
      varying vec3 vTWPos; varying vec3 vTWNorm;`,
    fragmentAfterMap: /* glsl */ `
      vec2 wp = vTWPos.xz;
      vec2 muv = (wp - uWorld.xy) * uWorld.zw;
      vec3 mA = texture2D(tMaskA, muv).rgb;   // r path, g pavers, b asphalt
      vec3 mB = texture2D(tMaskB, muv).rgb;   // r leaves, g shore mud, b bridle dirt
      vec3 grass = texture2D(tGrass, wp / uTiles.x).rgb;
      // break up the tiling: two slow macro washes (autumn-dry patches, deeper green)
      float macroA = texture2D(tGrass, wp / 47.0 + 0.31).g;
      float macroB = texture2D(tLeaves, wp / 83.0).r;
      grass *= mix(0.86, 1.1, macroA);
      grass = mix(grass, grass * vec3(1.12, 1.04, 0.8), smoothstep(0.55, 0.85, macroB) * 0.25);
      vec3 path = texture2D(tPath, wp / uTiles.y).rgb;
      vec3 pav = texture2D(tPavers, wp / uTiles.z).rgb;
      vec3 leaves = texture2D(tLeaves, wp / uTiles.w).rgb;
      vec3 rockX = texture2D(tSchist, vTWPos.zy / 5.0).rgb;
      vec3 rockZ = texture2D(tSchist, vTWPos.xy / 5.0).rgb;
      vec3 rockY = texture2D(tSchist, wp / 5.0).rgb;
      vec3 an = abs(vTWNorm);
      vec3 rock = (rockX * an.x + rockY * an.y + rockZ * an.z) / (an.x + an.y + an.z);
      float pl = dot(path, vec3(0.333));
      vec3 asphalt = vec3(0.30, 0.30, 0.31) * (0.75 + 0.5 * pl);
      vec3 mud = path * vec3(0.62, 0.52, 0.42);
      vec3 dirt = path * vec3(0.78, 0.66, 0.52);
      vec3 col = grass;
      col = mix(col, leaves, clamp(mB.r * 1.15, 0.0, 0.92));
      col = mix(col, mud, mB.g * 0.85);
      col = mix(col, dirt, mB.b);
      col = mix(col, path, mA.r);
      col = mix(col, asphalt, mA.b);
      col = mix(col, pav, mA.g);
      float slope = 1.0 - vTWNorm.y;
      col = mix(col, rock, smoothstep(0.28, 0.48, slope) * (1.0 - mA.b) * (1.0 - mA.g));
      diffuseColor.rgb *= col;`,
  });
  return mat;
}

// ------------------------------------------------------------------ build
export function buildTerrain({ textures, onStage = () => {} }) {
  const S = shapes();
  onStage('Painting paths');
  const masks = paintMasks(S);
  onStage('Raising hills');
  const { h, woodsId, waterId } = computeHeights(S, masks);

  const heightAt = (x, z) => {
    let fx = (x - WORLD.xMin) / STEP, fz = (z - WORLD.zMin) / STEP;
    if (fx < 0 || fz < 0 || fx >= NX - 1 || fz >= NZ - 1) return 0;
    const i = Math.floor(fx), j = Math.floor(fz);
    fx -= i; fz -= j;
    const k = j * NX + i;
    const ha = h[k], hb = h[k + 1], hc = h[k + NX + 1], hd = h[k + NX];
    // the same diagonal as the mesh (a→c)
    return fx >= fz ? ha + (hb - ha) * fx + (hc - hb) * fz : ha + (hc - hd) * fx + (hd - ha) * fz;
  };
  const normalAt = (x, z, out = new THREE.Vector3()) => {
    const e = STEP;
    return out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
  };

  const terrain = {
    heightAt, normalAt, masks, grid: { h, NX, NZ, STEP, x0: WORLD.xMin, z0: WORLD.zMin }, woodsId, waterId, shapes: S,
    /** Read the painted masks at a point: { path, pavers, asphalt, leaves, mud, dirt } (0..1). */
    maskAt(x, z) {
      const px = clamp(Math.round((x - WORLD.xMin) * MASK_RES), 0, masks.w - 1);
      const pz = clamp(Math.round((z - WORLD.zMin) * MASK_RES), 0, masks.h - 1);
      const a = masks.A.g.getImageData(px, pz, 1, 1).data, b = masks.B.g.getImageData(px, pz, 1, 1).data;
      return { path: a[0] / 255, pavers: a[1] / 255, asphalt: a[2] / 255, leaves: b[0] / 255, mud: b[1] / 255, dirt: b[2] / 255 };
    },
    mesh: null, material: null,
  };
  // fast whole-mask readback for bulk queries (tree placement)
  terrain.maskData = { A: masks.A.g.getImageData(0, 0, masks.w, masks.h).data, w: masks.w, h: masks.h };
  terrain.groundKindAt = (x, z) => {
    const md = terrain.maskData;
    const px = clamp(Math.round((x - WORLD.xMin) * MASK_RES), 0, md.w - 1);
    const pz = clamp(Math.round((z - WORLD.zMin) * MASK_RES), 0, md.h - 1);
    const o = (pz * md.w + px) * 4;
    return { path: md.A[o] / 255, pavers: md.A[o + 1] / 255, asphalt: md.A[o + 2] / 255 };
  };

  /** Called once trees are placed: leaf litter under every canopy, then upload the masks. */
  terrain.finish = (trees = []) => {
    const B = masks.B.g;
    B.filter = 'blur(3px)';
    B.fillStyle = 'rgba(255,0,0,0.28)';
    for (const t of trees) { B.beginPath(); B.arc(t.x, t.z, t.crown * 1.1, 0, Math.PI * 2); B.fill(); }
    B.filter = 'none';
    const texA = new THREE.CanvasTexture(masks.A.c), texB = new THREE.CanvasTexture(masks.B.c);
    for (const t of [texA, texB]) {
      t.flipY = false;
      t.colorSpace = THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = 4;
    }
    terrain.maskTextures = { A: texA, B: texB };
    terrain.material = createTerrainMaterial(textures, texA, texB);
    terrain.mesh = buildChunks(h, terrain.material);
    // distance LOD: chunks beyond lodDistance draw at 4 m (the far layer's ground sits just
    // underneath, so a seam between levels never shows the sky)
    terrain.updateLod = (cam) => {
      const d0 = terrain.lodDistance ?? 1e9;
      for (const c of terrain.mesh.children) {
        if (!c.userData.lod) continue;
        const b = c.userData.box;
        const dx = Math.max(b.min.x - cam.x, 0, cam.x - b.max.x), dz = Math.max(b.min.z - cam.z, 0, cam.z - b.max.z);
        const far = Math.hypot(dx, dz) > d0;
        c.visible = !far;
        c.userData.lod.visible = far;
      }
    };
    return terrain;
  };
  return terrain;
}

function buildChunks(h, material) {
  const group = new THREE.Group();
  group.name = 'terrain';
  for (let cj = 0; cj * CHUNK < NZ - 1; cj++) {
    for (let ci = 0; ci * CHUNK < NX - 1; ci++) {
      const i0 = ci * CHUNK, j0 = cj * CHUNK;
      const i1 = Math.min(NX - 1, i0 + CHUNK), j1 = Math.min(NZ - 1, j0 + CHUNK);
      // flat chunks (the city ring) get big quads
      let flat = true;
      for (let j = j0; j <= j1 && flat; j++) for (let i = i0; i <= i1; i++) if (Math.abs(h[j * NX + i]) > 1e-4) { flat = false; break; }
      const stride = flat ? 8 : 1;
      const m = chunkMesh(h, i0, j0, i1, j1, stride, material);
      group.add(m);
      m.userData.box = m.geometry.boundingBox;
      if (!flat) {
        const lod = chunkMesh(h, i0, j0, i1, j1, 2, material);
        lod.visible = false;
        lod.name += ':lod';
        m.userData.lod = lod;
        group.add(lod);
      }
    }
  }
  return group;
}

function chunkMesh(h, i0, j0, i1, j1, stride, material) {
  const cols = [], rows = [];
  for (let i = i0; i < i1; i += stride) cols.push(i);
  cols.push(i1);
  for (let j = j0; j < j1; j += stride) rows.push(j);
  rows.push(j1);
  const nx = cols.length, nz = rows.length;
  const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3);
  const H = (i, j) => h[Math.max(0, Math.min(NZ - 1, j)) * NX + Math.max(0, Math.min(NX - 1, i))];
  let o = 0;
  for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) {
    const i = cols[a], j = rows[b];
    pos[o] = WORLD.xMin + i * STEP; pos[o + 1] = H(i, j); pos[o + 2] = WORLD.zMin + j * STEP;
    const nxv = H(i - 1, j) - H(i + 1, j), nzv = H(i, j - 1) - H(i, j + 1), ny = 2 * STEP;
    const l = Math.hypot(nxv, ny, nzv);
    nor[o] = nxv / l; nor[o + 1] = ny / l; nor[o + 2] = nzv / l;
    o += 3;
  }
  const idx = [];
  for (let b = 0; b < nz - 1; b++) for (let a = 0; a < nx - 1; a++) {
    const A = b * nx + a, B = A + 1, C = A + nx + 1, D = A + nx;
    // diagonal A→C, counter-clockwise seen from above (+y)
    idx.push(A, C, B, A, D, C);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  m.matrixAutoUpdate = false;
  m.name = `terrain@${i0},${j0}`;
  return m;
}
