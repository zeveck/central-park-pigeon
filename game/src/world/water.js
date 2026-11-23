// Stylized water for all eight bodies (the Pond, the Lake, Turtle Pond,
// Conservatory Water, the Reservoir, the Pool, the Loch and Harlem Meer).
// Each body is a flat grid mesh at its level, a little wider than its outline
// so the shore hides the edge. A vertex attribute carries the distance to the
// shore: the shader shades shallow to deep, draws a lapping foam line and
// floating autumn leaves, ripples the normal and mixes in the sky by fresnel.

import * as THREE from 'three';
import { distToPolyline, offsetClosed, pointInPoly, polyBounds } from '../core/geo.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { U } from '../gfx/materials.js';
import { WATERFALLS } from './layout.js';

export const waterUniforms = {
  uSkyTint: { value: new THREE.Color(0x9fd0f0) },
  uWaterDeep: { value: new THREE.Color(0x2c6a7c) },
  uWaterShallow: { value: new THREE.Color(0x6ea596) },
};

export function createWaterMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0 });
  addShaderPatch(mat, {
    key: 'water',
    uniforms: { uTime: U.uTime, ...waterUniforms },
    vertexHeader: 'attribute float aShore; varying float vShore; varying vec3 vWWPos;',
    vertex: 'vShore = aShore; vWWPos = transformed;',
    fragmentHeader: /* glsl */ `
      uniform float uTime; uniform vec3 uSkyTint, uWaterDeep, uWaterShallow;
      varying float vShore; varying vec3 vWWPos;
      float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float wNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y);
      }`,
    fragmentAfterMap: /* glsl */ `
      vec2 wp = vWWPos.xz;
      float t = uTime;
      float depthK = smoothstep(0.0, 9.0, vShore);
      vec3 wcol = mix(uWaterShallow, uWaterDeep, depthK);
      // soft painted bands of light on the surface
      float band = wNoise(wp * 0.11 + vec2(t * 0.03, t * 0.02)) * 0.6 + wNoise(wp * 0.37 - vec2(t * 0.05, 0.0)) * 0.4;
      wcol *= 0.9 + 0.22 * smoothstep(0.45, 0.8, band);
      // lapping foam at the shore
      float lap = 0.5 + 0.5 * sin(t * 1.4 - vShore * 3.0 + wNoise(wp * 0.6) * 4.0);
      float foam = (1.0 - smoothstep(0.15, 0.9 + 0.35 * lap, vShore)) * step(0.0, vShore);
      wcol = mix(wcol, vec3(0.93, 0.95, 0.9), foam * 0.75);
      // floating leaves (late autumn)
      vec2 lc = floor(wp * 1.6 + vec2(t * 0.05, t * 0.02));
      float lh = wHash(lc);
      vec2 lf = fract(wp * 1.6 + vec2(t * 0.05, t * 0.02)) - 0.5;
      float leaf = step(0.985, lh) * (1.0 - smoothstep(0.08, 0.16, length(lf * vec2(1.0, 1.7))));
      wcol = mix(wcol, mix(vec3(0.91, 0.64, 0.24), vec3(0.77, 0.29, 0.18), fract(lh * 37.0)), leaf);
      diffuseColor.rgb = wcol;`,
    fragmentReplace: [
      ['#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 q = vWWPos.xz;
          float e = 0.35;
          float n0 = wNoise(q * 0.9 + vec2(uTime * 0.35, uTime * 0.21)) + 0.5 * wNoise(q * 2.3 - vec2(uTime * 0.5, uTime * 0.12));
          float nx = wNoise((q + vec2(e, 0.0)) * 0.9 + vec2(uTime * 0.35, uTime * 0.21)) + 0.5 * wNoise((q + vec2(e, 0.0)) * 2.3 - vec2(uTime * 0.5, uTime * 0.12));
          float nz = wNoise((q + vec2(0.0, e)) * 0.9 + vec2(uTime * 0.35, uTime * 0.21)) + 0.5 * wNoise((q + vec2(0.0, e)) * 2.3 - vec2(uTime * 0.5, uTime * 0.12));
          vec3 pert = vec3(n0 - nx, 0.0, n0 - nz) * 0.55;
          normal = normalize(normal + (viewMatrix * vec4(pert, 0.0)).xyz);
        }`],
      ['#include <lights_fragment_begin>', /* glsl */ `
        {
          float fres = pow(1.0 - clamp(dot(normalize(-vViewPosition), normal), 0.0, 1.0), 3.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSkyTint, clamp(fres, 0.0, 0.65));
        }
        #include <lights_fragment_begin>`],
    ],
  });
  return mat;
}

/** fix-27: how far the drawn water reaches past a body's outline (its shore is drawn by the terrain rising through it).
 *  Collision uses the same reach (main.js addWater), so the water you see is the water you're in. */
export const waterMargin = (wb) => (wb.stone ? 0.6 : 2.5);

/** Build every water body mesh; returns { group, bodies: [{id, name, level, poly}] }. */
export function buildWater(shapes, material) {
  const group = new THREE.Group();
  group.name = 'water';
  const bodies = [];
  for (const wb of shapes.water) {
    const geo = waterGeometry(wb.poly, wb.level, waterMargin(wb));
    const m = new THREE.Mesh(geo, material);
    m.name = 'water:' + wb.id;
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    group.add(m);
    bodies.push({ id: wb.id, name: wb.name, level: wb.level, poly: wb.poly });
  }
  for (const f of WATERFALLS) group.add(waterfall(f));
  return { group, bodies };
}

function waterGeometry(poly, level, margin, step = 2) {
  const outer = offsetClosed(poly, margin);
  const b = polyBounds(outer);
  const x0 = Math.floor(b.x0 / step) * step, z0 = Math.floor(b.z0 / step) * step;
  const nx = Math.ceil((b.x1 - x0) / step) + 1, nz = Math.ceil((b.z1 - z0) / step) + 1;
  const inside = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) inside[j * nx + i] = pointInPoly(x0 + i * step, z0 + j * step, outer) ? 1 : 0;
  const map = new Int32Array(nx * nz).fill(-1);
  const pos = [], shore = [], idx = [];
  const vert = (i, j) => {
    const k = j * nx + i;
    if (map[k] >= 0) return map[k];
    const x = x0 + i * step, z = z0 + j * step;
    map[k] = pos.length / 3;
    pos.push(x, level, z);
    const d = distToPolyline(x, z, poly, true);
    shore.push(pointInPoly(x, z, poly) ? d : -d);
    return map[k];
  };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const k = j * nx + i;
    if (!(inside[k] || inside[k + 1] || inside[k + nx] || inside[k + nx + 1])) continue;
    const a = vert(i, j), bq = vert(i + 1, j), c = vert(i + 1, j + 1), d = vert(i, j + 1);
    idx.push(a, c, bq, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aShore', new THREE.Float32BufferAttribute(shore, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

function waterfall(f) {
  const h = f.top - f.bottom + 0.4;
  const geo = new THREE.PlaneGeometry(f.width, h, 1, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, depthWrite: false });
  addShaderPatch(mat, {
    key: 'waterfall',
    uniforms: { uTime: U.uTime },
    fragmentHeader: 'uniform float uTime; varying vec2 vFall;',
    fragmentAfterMap: /* glsl */ `
      vec2 fu = vFall;
      float streak = fract(sin(floor(fu.x * 18.0) * 91.7) * 4375.5);
      float flow = fract(fu.y * 2.0 + uTime * (1.2 + streak));
      diffuseColor.rgb = mix(vec3(0.55, 0.75, 0.78), vec3(0.97), smoothstep(0.55, 1.0, flow) * 0.8);
      diffuseColor.a = 0.82;`,
    vertexHeader: 'varying vec2 vFall;',
    vertex: `vFall = vec2(position.x / ${f.width.toFixed(2)} + 0.5, position.y / ${h.toFixed(2)} + 0.5);`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(f.x, (f.top + f.bottom) / 2, f.z);
  m.rotation.set(-0.25, f.yaw, 0, 'YXZ');
  m.name = 'waterfall:' + f.id;
  return m;
}
