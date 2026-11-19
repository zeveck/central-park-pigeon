// The far layer: a cheap backdrop drawn first, in its own pass (near 100 m,
// far 2 km), then the depth buffer is cleared and the main scene drawn over
// it. It holds the sky, the skyline ring (the 4:1 skyline band, day and
// night, with the Empire State Building's spire turned to face the real ESB
// to the south), and a low-poly copy of everything: the park's ground,
// water and canopy blobs, the city ring's masses and the rest of Manhattan as
// filler blocks, so the whole park's shape reads from any perch.

import * as THREE from 'three';
import { PARK, WORLD, ESB } from './layout.js';
import { rngFor } from '../core/rng.js';
import { RULE, U } from '../gfx/materials.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { buildSky, skyUniforms } from './sky.js';
import { MASK_RES } from './terrain.js';

export const FAR = { near: 100, far: 2000 };
const RING_R = 1500, TILES = 6, SPIRE_U = 0.4456, SPIRE_V = 1 - 29 / 1024;

export const farUniforms = { uNight: { value: 0 }, uRingTint: { value: new THREE.Color(1, 1, 1) } };

export function buildFarLayer({ terrain, trees, masses, waterBodies, textures, detail = 'full' }) {
  const low = detail === 'low';
  const scene = new THREE.Scene();
  scene.name = 'far';
  const followers = new THREE.Group();   // things centred on the camera
  followers.name = 'far-followers';
  FAR_CULL.cam = followers.position;
  scene.add(followers);
  followers.add(buildSky(textures.clouds));
  const ring = skylineRing(textures.skylineDay, textures.skylineNight);
  followers.add(ring.mesh, ring.glow);

  const world = new THREE.Group();
  world.name = 'far-world';
  scene.add(world);
  world.add(farGround(terrain, low));
  world.add(farWater(waterBodies));
  world.add(farCanopy(trees, low, detail));
  world.add(farCity(masses, low, detail));
  return { scene, followers, ring };
}

// ------------------------------------------------------------------ skyline ring
function skylineRing(day, night) {
  const H = (2 * Math.PI * RING_R) / TILES / 4;
  const yBot = -0.12 * H;
  const geo = new THREE.CylinderGeometry(RING_R, RING_R, H, 96, 1, true).translate(0, yBot + H / 2, 0);
  for (const t of [day, night]) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; }
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { tDay: { value: day }, tNight: { value: night }, uNight: farUniforms.uNight, uTint: farUniforms.uRingTint, uHaze: skyUniforms.uHorizon },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDay, tNight; uniform float uNight; uniform vec3 uTint, uHaze;
      varying vec2 vUv;
      void main() {
        float ur = vUv.x * ${TILES.toFixed(1)};
        float tile = floor(ur);
        float u = fract(ur);
        // only the first tile keeps the Empire State Building; the others borrow a spire-free stretch
        if (tile > 0.5 && u > 0.405 && u < 0.49) u -= 0.255;
        vec2 uv = vec2(u, vUv.y);
        vec4 d = texture2D(tDay, uv), n = texture2D(tNight, uv);
        vec4 c = mix(d, n, uNight);
        vec3 col = mix(c.rgb * uTint, uHaze, 0.32 * (1.0 - uNight * 0.6));
        gl_FragColor = vec4(col, c.a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'skyline-ring';
  mesh.frustumCulled = false;
  mesh.renderOrder = -8;
  // turn the ring so tile 0's spire faces the real ESB, as seen from the park's centre
  const bearing = Math.atan2(ESB.x - 0, ESB.z - (PARK.zMax / 2));
  const theta = (SPIRE_U / TILES) * Math.PI * 2;
  mesh.rotation.y = bearing - theta;
  // a code-lit glow on the ESB's crown at night
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(0.3, 'rgba(255,200,120,0.6)'); grd.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
  const yTop = yBot + H * SPIRE_V - 0.04 * H;
  glow.position.set(Math.sin(bearing) * RING_R * 0.98, yTop, Math.cos(bearing) * RING_R * 0.98);
  glow.scale.setScalar(90);
  glow.renderOrder = -7;
  glow.name = 'esb-glow';
  return { mesh, glow, bearing };
}

// ------------------------------------------------------------------ the park and the city, low poly
function vcolMat() { return new THREE.MeshStandardMaterial({ ...RULE, vertexColors: true }); }

function farGround(terrain, low = false) {
  // a coarse copy of the height grid (8 m) coloured from the masks, plus a city plain out to 2 km
  const g = terrain.grid, md = terrain.maskData;
  const step = low ? 8 : 4; // grid samples (8 m; perf pass: 16 m on Low)
  const nx = Math.floor((g.NX - 1) / step) + 1, nz = Math.floor((g.NZ - 1) / step) + 1;
  const pos = [], col = [], idx = [];
  const grass = new THREE.Color(0x6f9a4a), path = new THREE.Color(0xd9c8a0), asphalt = new THREE.Color(0x56575a), pavers = new THREE.Color(0x8d8a86), woods = new THREE.Color(0x8a6a3a);
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const gi = Math.min(g.NX - 1, i * step), gj = Math.min(g.NZ - 1, j * step);
    const x = g.x0 + gi * g.STEP, z = g.z0 + gj * g.STEP;
    pos.push(x, g.h[gj * g.NX + gi] - 0.3, z);
    const px = Math.min(md.w - 1, Math.round((x - WORLD.xMin) * MASK_RES)), pz = Math.min(md.h - 1, Math.round((z - WORLD.zMin) * MASK_RES));
    const o = (pz * md.w + px) * 4;
    c.copy(terrain.woodsId[gj * g.NX + gi] ? woods.clone().lerp(grass, 0.4) : grass);
    c.lerp(path, md.A[o] / 255).lerp(asphalt, md.A[o + 2] / 255).lerp(pavers, md.A[o + 1] / 255);
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, cc = a + nx + 1, d = a + nx;
    idx.push(a, cc, b, a, d, cc);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const group = new THREE.Group();
  group.name = 'far-ground';
  group.add(new THREE.Mesh(geo, vcolMat()));
  // Manhattan's streets beyond the ring, and the rivers either side
  const plain = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ ...RULE, color: 0x5f5e5c }));
  plain.position.set(0, -0.6, 500);
  group.add(plain);
  const river = new THREE.MeshStandardMaterial({ ...RULE, color: 0x4f7f95, roughness: 0.5 });
  for (const [x, w] of [[-1150, 900], [1250, 900]]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, 4000).rotateX(-Math.PI / 2), river);
    r.position.set(x, -0.4, 500);
    group.add(r);
  }
  return group;
}

function farWater(bodies) {
  const geos = bodies.map((b) => {
    const shape = new THREE.Shape(b.poly.map((p) => new THREE.Vector2(p.x, -p.z)));
    const g = new THREE.ShapeGeometry(shape, 2).rotateX(-Math.PI / 2);
    g.translate(0, b.level + 0.05, 0);
    return g;
  });
  const m = new THREE.Mesh(mergeSimple(geos), new THREE.MeshStandardMaterial({ ...RULE, color: 0x4c8496, roughness: 0.45 }));
  m.name = 'far-water';
  return m;
}

function farCanopy(trees, low, detail) {
  const base = low ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0);
  const bp = base.attributes.position, bn = base.attributes.normal;
  // perf pass: one mesh per 320 m tile (frustum- and distance-culled), not one for the whole park
  return chunked('far-canopy', trees, { low: 1200, medium: 640 }[detail] ?? 320, bp.count, vcolMat(), (t, pos, nor, col, o) => {
    const cy = t.y + t.h * 0.66;
    for (let i = 0; i < bp.count; i++) {
      pos[o] = t.x + bp.getX(i) * t.crown; pos[o + 1] = cy + bp.getY(i) * t.crown * 0.85; pos[o + 2] = t.z + bp.getZ(i) * t.crown;
      nor[o] = bn.getX(i); nor[o + 1] = bn.getY(i); nor[o + 2] = bn.getZ(i);
      col[o] = t.tint.r * 0.9; col[o + 1] = t.tint.g * 0.9; col[o + 2] = t.tint.b * 0.9;
      o += 3;
    }
    return o;
  });
}

/**
 * Perf pass: a far tile is drawn only if part of it lies past the main camera's far plane (everything nearer is
 * drawn again by the main pass, over a cleared depth buffer). FAR_CULL.cam is the camera in data metres (the
 * followers group), FAR_CULL.main the main render camera (main.js sets it).
 */
export const FAR_CULL = { cam: null, main: null };
const _fs = new THREE.Sphere();
function farChunkVisible(frustum) {
  if (!frustum.intersectsObject(this)) return false;
  const { cam, main } = FAR_CULL;
  if (!cam || !main) return true;
  _fs.copy(this.geometry.boundingSphere);
  return cam.distanceTo(_fs.center) + _fs.radius > main.far * 0.97;
}

/** Perf pass: items bucketed into square tiles, one non-indexed mesh each (so each tile is frustum-culled). */
function chunked(name, items, tile, vertsPer, mat, write) {
  const tiles = new Map();
  for (const it of items) {
    const k = `${Math.floor(it.x / tile)},${Math.floor(it.z / tile)}`;
    if (!tiles.has(k)) tiles.set(k, []);
    tiles.get(k).push(it);
  }
  const group = new THREE.Group();
  group.name = name;
  for (const [k, list] of tiles) {
    const pos = new Float32Array(list.length * vertsPer * 3), nor = new Float32Array(pos.length), col = new Float32Array(pos.length);
    let o = 0;
    for (const it of list) o = write(it, pos, nor, col, o);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor.subarray(0, o), 3));
    g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, o), 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.name = `${name}@${k}`;
    m.matrixAutoUpdate = false;
    m.intersectsFrustum = farChunkVisible;
    group.add(m);
  }
  return group;
}

const STYLE_COL = { brick: 0xa65e46, limestone: 0xd8c9a8, glass: 0x7f97aa, deco: 0xc9b48e, white: 0xf1eee6, frame: 0x55585a };

function farCity(masses, low, detail) {
  const rnd = rngFor('far-city');
  const boxes = masses.map((m) => ({ ...m }));
  // the rest of Manhattan: filler blocks out to ~700 m, avoiding the park and its ring
  const inRing = (x, z) => x > -190 && x < 190 && z > -80 && z < PARK.zMax + 80;
  const reach = { low: 340, medium: 540 }[detail] ?? 720;   // perf pass: Low was 420, Medium 720
  for (let z = -reach; z < PARK.zMax + reach; z += 24) {
    for (let x = -reach + 40; x < reach - 40; x += 30) {
      if (inRing(x + 15, z + 12)) continue;
      const far = Math.max(Math.abs(x) - 190, z < 0 ? -z : z - PARK.zMax, 0);
      const midtown = z < -200 ? 1.6 : 1;
      const h = (14 + rnd() * 40 + (rnd() < 0.12 ? rnd() * 70 : 0)) * midtown * (1 - Math.min(0.4, far / 1800));
      const st = ['brick', 'limestone', 'glass', 'deco', 'brick'][Math.floor(rnd() * 5)];
      boxes.push({ x: x + 15, z: z + 12, w: 24 - rnd() * 4, d: 18 - rnd() * 3, h, style: st });
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed();
  const bp = box.attributes.position, bn = box.attributes.normal;
  const sides = [];   // perf pass: no bottom faces (never seen)
  for (let i = 0; i < bp.count; i++) if (bn.getY(i) > -0.5) sides.push(i);
  const c = new THREE.Color(), roof = new THREE.Color(0x4a4744);
  const mat = vcolMat();
  // lit windows at night: a world-space window grid on the walls, ~40% on
  addShaderPatch(mat, {
    key: 'farwindows',
    uniforms: { uWindowGlow: U.uWindowGlow },
    vertexHeader: 'varying vec3 vFW; varying vec3 vFN;',
    vertex: 'vFW = (modelMatrix * vec4(transformed, 1.0)).xyz; vFN = objectNormal;',
    fragmentHeader: 'uniform float uWindowGlow; varying vec3 vFW; varying vec3 vFN;',
    fragmentReplace: [['#include <emissivemap_fragment>', /* glsl */ `
      {
        float side = 1.0 - step(0.5, abs(vFN.y));
        vec2 g = vec2(abs(vFN.x) > 0.5 ? vFW.z : vFW.x, vFW.y) / vec2(3.5, 3.5);
        vec2 cell = floor(g);
        vec2 f = fract(g);
        float pane = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.8);
        float h = fract(sin(dot(cell + floor(vFW.xz / 40.0), vec2(12.9898, 78.233))) * 43758.5453);
        totalEmissiveRadiance += vec3(1.0, 0.8, 0.5) * pane * step(h, 0.42) * side * uWindowGlow * 0.9;
      }`]],
  });
  // perf pass: one mesh per 800 m tile (frustum- and distance-culled), not one for all of Manhattan
  return chunked('far-city', boxes, { low: 1600, medium: 1600 }[detail] ?? 800, sides.length, mat, (b, pos, nor, col, o) => {
    c.set(STYLE_COL[b.style] || 0xb0a090);
    for (const i of sides) {
      pos[o] = b.x + bp.getX(i) * b.w; pos[o + 1] = bp.getY(i) * b.h; pos[o + 2] = b.z + bp.getZ(i) * b.d;
      nor[o] = bn.getX(i); nor[o + 1] = bn.getY(i); nor[o + 2] = bn.getZ(i);
      const cc = bn.getY(i) > 0.5 ? roof : c;
      col[o] = cc.r; col[o + 1] = cc.g; col[o + 2] = cc.b;
      o += 3;
    }
    return o;
  });
}

function mergeSimple(geos) {
  let pos = [], nor = [], idx = [], base = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
