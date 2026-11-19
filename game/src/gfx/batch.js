// Static batching: code-built scenery is merged into one mesh per
// (128 m grid cell × material), so the city ring and the landmarks cost a few
// draw calls per visible cell and each cell is frustum-culled on its own.
//
//   const b = new Batcher(materials);
//   b.box('stone', {x, y, z}, {w, h, d}, {yaw, uv: 'metres'});
//   b.add('iron', geometry, matrix);       // any indexed geometry with position/normal/uv
//   scene.add(b.build());                  // a Group of merged meshes

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shadowOnly } from './shadow-only.js';

export const CELL = 128;
const PROXY_CELL = 256;   // perf pass: shadow proxies per 256 m (the shadow frustum is long: finer cells cost more draws)

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Matrix3();

export class Batcher {
  constructor(materials, { cell = CELL, castShadow = true, receiveShadow = true, name = 'batch', flatten = null } = {}) {
    this.flatten = flatten;   // perf pass: { material: colour } baked onto `coded` (Low)
    this.M = materials;
    this.cell = cell;
    this.cast = castShadow;
    this.receive = receiveShadow;
    this.name = name;
    this.buckets = new Map(); // `${cx},${cz},${mat}` → { mat, geos: [] }
    this.proxies = new Map(); // perf pass: `${px},${pz}` (128 m) → position-only caster geometries
    this.triangles = 0;
  }

  #bucket(mat, x, z) {
    // perf pass: cells start half a cell west of x = 0, so the park's centre line doesn't split every material in two
    const cx = Math.floor(x / this.cell + 0.5), cz = Math.floor((z + 100) / this.cell);   // (and 100 m south, so Central Park South shares the first row)
    const key = `${cx},${cz},${mat}`;
    let b = this.buckets.get(key);
    if (!b) { b = { mat, geos: [], cx, cz }; this.buckets.set(key, b); }
    return b;
  }

  /** Add a geometry (cloned and transformed). The cell is picked by the transformed centre. */
  add(mat, geometry, matrix) {
    if (!this.M[mat]) throw new Error(`no material ${mat}`);
    const g = geometry.index ? geometry.clone() : withIndex(geometry.clone());
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    // code-coloured materials (same noise tile, only the colour differs) share one
    // vertex-coloured material, so they cost one draw call per cell between them
    const tint = this.M[mat].userData.coded || (this.flatten?.[mat] != null ? new THREE.Color(this.flatten[mat]) : null);
    if (tint && this.M.coded) {
      const n = g.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = tint.r; c[i * 3 + 1] = tint.g; c[i * 3 + 2] = tint.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      mat = 'coded';
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (matrix) g.applyMatrix4(matrix);
    g.computeBoundingBox();
    g.boundingBox.getCenter(_v);
    this.#bucket(mat, _v.x, _v.z).geos.push(g);
    // perf pass: opaque, single-sided casters also go into a shadow-proxy cell (position only; see build())
    const mo = this.M[mat];
    if (this.cast && !mo.userData.noShadow && !mo.alphaTest && mo.side === THREE.FrontSide) {
      const k = `${Math.floor(_v.x / PROXY_CELL)},${Math.floor(_v.z / PROXY_CELL)}`;
      if (!this.proxies.has(k)) this.proxies.set(k, []);
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', g.attributes.position);
      pg.setIndex(g.index);
      this.proxies.get(k).push(pg);
    }
    this.triangles += g.index.count / 3;
    return g;
  }

  /**
   * A box with world-metre UVs on every face (so textures keep their scale).
   * pos is the centre of the bottom face. opts: yaw, faces (skip list e.g. ['bottom']),
   * uvOffset {u, v}: v starts at `v0` metres at the bottom (for facades above a storefront).
   */
  box(mat, pos, size, { yaw = 0, skip = ['bottom'], v0 = 0, pitch = 0, roll = 0 } = {}) {
    const g = boxGeometry(size.w, size.h, size.d, { skip, v0 });
    _e.set(pitch, yaw, roll, 'YXZ');
    _m.compose(_v.set(pos.x, pos.y, pos.z), _q.setFromEuler(_e), _s.set(1, 1, 1));
    return this.add(mat, g, _m);
  }

  /** Any three.js geometry with a transform. */
  mesh(mat, geometry, { x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0, scale = 1 } = {}) {
    _e.set(pitch, yaw, roll, 'YXZ');
    const sc = typeof scale === 'number' ? _s.set(scale, scale, scale) : _s.set(scale.x, scale.y, scale.z);
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e), sc);
    return this.add(mat, geometry, _m);
  }

  build() {
    const group = new THREE.Group();
    group.name = this.name;
    // perf pass: opaque, single-sided casters draw into the shadow map as ONE merged, position-only proxy per
    // PROXY_CELL (shadow-only), instead of one shadow draw per material and cell; alpha-tested or double-sided
    // materials (rails, canvas) still cast from their own mesh, so their shadows keep their shape
    const proxies = this.proxies;
    for (const b of this.buckets.values()) {
      const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mat = this.M[b.mat];
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}:${b.mat}@${b.cx},${b.cz}`;
      const casts = this.cast && !mat.userData.noShadow;
      const proxied = casts && !mat.alphaTest && mat.side === THREE.FrontSide;
      mesh.castShadow = casts && !proxied;
      mesh.receiveShadow = this.receive;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    if (proxies.size) {
      const mat = new THREE.MeshBasicMaterial({ colorWrite: false });
      for (const [k, geos] of proxies) {
        const g = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, mat);
        mesh.name = `${this.name}:shadow@${k}`;
        mesh.castShadow = true;
        mesh.matrixAutoUpdate = false;
        group.add(shadowOnly(mesh));
      }
    }
    this.buckets.clear();
    this.proxies = new Map();
    return group;
  }
}

function withIndex(g) {
  const n = g.attributes.position.count;
  const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Box centred on x/z, standing on y = 0, with UVs in metres: side faces run u
 * along the face and v up from v0; top and bottom faces use x/z.
 */
export function boxGeometry(w, h, d, { skip = [], v0 = 0 } = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  const hx = w / 2, hz = d / 2;
  const face = (name, corners, n, uvs) => {
    if (skip.includes(name)) return;
    const base = pos.length / 3;
    for (let i = 0; i < 4; i++) { pos.push(...corners[i]); nor.push(...n); uv.push(...uvs[i]); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // +z (front)
  face('front', [[-hx, 0, hz], [hx, 0, hz], [hx, h, hz], [-hx, h, hz]], [0, 0, 1], [[0, v0], [w, v0], [w, v0 + h], [0, v0 + h]]);
  face('back', [[hx, 0, -hz], [-hx, 0, -hz], [-hx, h, -hz], [hx, h, -hz]], [0, 0, -1], [[0, v0], [w, v0], [w, v0 + h], [0, v0 + h]]);
  face('right', [[hx, 0, hz], [hx, 0, -hz], [hx, h, -hz], [hx, h, hz]], [1, 0, 0], [[0, v0], [d, v0], [d, v0 + h], [0, v0 + h]]);
  face('left', [[-hx, 0, -hz], [-hx, 0, hz], [-hx, h, hz], [-hx, h, -hz]], [-1, 0, 0], [[0, v0], [d, v0], [d, v0 + h], [0, v0 + h]]);
  face('top', [[-hx, h, hz], [hx, h, hz], [hx, h, -hz], [-hx, h, -hz]], [0, 1, 0], [[-hx, hz], [hx, hz], [hx, -hz], [-hx, -hz]]);
  face('bottom', [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]], [0, -1, 0], [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Scale a geometry's UVs so standard three.js shapes get roughly metre UVs. */
export function scaleUV(geometry, su, sv = su) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}
