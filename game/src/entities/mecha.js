// The Mecha-Pigeon, assembled in code from the real part models ("The
// Mecha-Pigeon: 8 parts" and the Tech plan's "Mecha-Pigeon, assembled in code"):
//
//   body    hotdog-cart.glb (umbrella cropped off and folded on its back) over a riveted slate belly
//   legs    rusty iron drainpipes with hip, knee and ankle pivots
//   talons  Prickett's spike strips bundled into three claw-toes (and a hind toe) per foot
//   wings   two canvas sails on wooden spars, lashed with rope, on shoulder pivots
//   eyes    two chrome hubcaps with orange painted rims
//   beak    traffic-cone.glb
//   voice   megaphone.glb, on the chest
//   power   battery.glb in a chest cage, glowing teal through the vent
//   (always) the slate-painted cowl head with its teal/magenta neck stripe and plate collar, the tail fan
//
// Code parts use palette-matched, painted canvas-noise textures (rust, slate,
// canvas, wood, leather, brass). Everything is built at Workshop scale: the
// Mecha stands about 3.5 m tall on y = 0 and faces +z; BIGGIFY scales the root
// (18 m). Pose with pose(kind, phase, opts): 'stand', 'walk', 'climb', 'shout'.
//
// The root is counter-mirrored (scale.x = -1) because it lives under the
// mirrored world root (main.js); it's symmetric, so only the GLB textures care.
// API: new Mecha(G) → await build() · root · setParts(list) · nodes(part) → [Object3D]
//      pose(kind, t, opts) · seat (an Object3D on top of the head: Gus stands there) · ventGlow(t)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MECHA_HEIGHT = 3.5;
export const PARTS_ORDER = ['body', 'talons', 'legs', 'wings', 'eyes', 'beak', 'voice', 'power'];

// ------------------------------------------------------------------ painted textures
function hash2(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function valueNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 4) { let a = 0, f = 1, w = 0.5, n = 0; for (let i = 0; i < oct; i++) { a += valueNoise(x * f, y * f, s + i * 13) * w; n += w; f *= 2; w *= 0.5; } return a / n; }
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

const TEX_CACHE = new Map();
/** A painted, tileable-enough canvas texture. kind: rust | slate | canvas | wood | leather | brass | steel | stripe | umbrella | belly */
export function paintTexture(kind, size = 256) {
  if (TEX_CACHE.has(kind)) return TEX_CACHE.get(kind);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data;
  const P = {
    rust: { base: 0xa4572f, dark: 0x5b2c18, light: 0xd08043, spot: 0x3f3a36, sc: 5, seed: 1 },
    slate: { base: 0x66707c, dark: 0x48505b, light: 0x8f99a4, spot: 0x9a5a34, sc: 4, seed: 2 },
    belly: { base: 0x5c6470, dark: 0x3e444d, light: 0x7d8792, spot: 0x8a5532, sc: 3, seed: 7 },
    canvas: { base: 0xefe5cf, dark: 0xcdb994, light: 0xfbf5e6, spot: 0xb39a74, sc: 3, seed: 3 },
    wood: { base: 0x8a5a32, dark: 0x5a361b, light: 0xb07a46, spot: 0x4a2c16, sc: 6, seed: 4 },
    leather: { base: 0x6e4428, dark: 0x45281a, light: 0x93603a, spot: 0x2f1d12, sc: 6, seed: 5 },
    brass: { base: 0xb48a3e, dark: 0x7a5a24, light: 0xe2c070, spot: 0x4f6b5a, sc: 5, seed: 6 },
    steel: { base: 0xa3aab0, dark: 0x6c7379, light: 0xd2d7db, spot: 0x8a5a3a, sc: 5, seed: 8 },
    stripe: { base: 0x66707c, dark: 0x48505b, light: 0x8f99a4, spot: 0x9a5a34, sc: 4, seed: 9 },
    umbrella: { base: 0xe0a83a, dark: 0xb07a20, light: 0xf2c868, spot: 0x8a6a3a, sc: 4, seed: 10 },
  }[kind];
  const base = rgb(P.base), dark = rgb(P.dark), light = rgb(P.light), spot = rgb(P.spot);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let n = fbm(u * P.sc, v * P.sc, P.seed);
    let col = n < 0.5 ? mix(dark, base, n * 2) : mix(base, light, (n - 0.5) * 2);
    const fine = valueNoise(u * 64, v * 64, P.seed + 40);
    col = col.map((q) => q * (0.9 + fine * 0.2));
    if (kind === 'wood') { const gr = Math.sin((v * 34 + fbm(u * 3, v * 3, 4) * 6) * Math.PI); col = mix(col, dark, Math.max(0, gr) * 0.35); }
    if (kind === 'canvas') { const w = (x % 4 < 1 ? 0.06 : 0) + (y % 4 < 1 ? 0.06 : 0); col = col.map((q) => q * (1 - w)); }
    if (kind === 'leather') { if ((y % 64) === 6 || (y % 64) === 57) { if (x % 8 < 4) col = mix(col, light, 0.6); } }
    if (kind === 'rust' || kind === 'slate' || kind === 'belly' || kind === 'stripe' || kind === 'steel') {
      // blotches of the other colour (rust on paint, scale on rust)
      const b = fbm(u * 9 + 3, v * 9 + 1, P.seed + 20, 3);
      if (b > 0.64) col = mix(col, spot, Math.min(1, (b - 0.64) * 4) * 0.7);
    }
    if (kind === 'slate' || kind === 'belly' || kind === 'stripe') {
      // drips and streaks running down
      const s = valueNoise(u * 40, 0.5, P.seed + 30);
      if (s > 0.8) col = mix(col, dark, (s - 0.8) * 2.2 * (0.5 + v * 0.5));
    }
    if (kind === 'stripe') {
      // the pigeon's iridescent neck, painted: teal over magenta bands (v runs top → bottom of the cowl)
      const teal = [38, 168, 156], mag = [196, 58, 140];
      const wob = (fbm(u * 6, 0.3, 11) - 0.5) * 0.03;
      // on the back and sides of the head only (u = 0.25 faces forward on a SphereGeometry)
      const du = Math.abs(((u - 0.25 + 1.5) % 1) - 0.5);
      const side = Math.min(1, Math.max(0, (du - 0.12) / 0.1));
      if (v > 0.3 + wob && v < 0.4 + wob) col = mix(col, teal, 0.85 * side * (0.85 + fine * 0.15));
      else if (v >= 0.4 + wob && v < 0.5 + wob) col = mix(col, mag, 0.85 * side * (0.85 + fine * 0.15));
    }
    if (kind === 'umbrella') { const band = Math.floor(u * 8) % 2; if (band) col = mix([47, 79, 154], [70, 100, 170], n); }
    const i = (y * size + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // scratches and seams on top
  g.globalAlpha = 0.35;
  let r = P.seed * 9.7;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  if (kind === 'slate' || kind === 'belly' || kind === 'stripe' || kind === 'steel') {
    g.strokeStyle = '#c8d0d6'; g.lineWidth = 1;
    for (let k = 0; k < 40; k++) { const x0 = rnd() * size, y0 = rnd() * size, l = 6 + rnd() * 22, a = rnd() * Math.PI; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); g.stroke(); }
  }
  if (kind === 'canvas') {
    g.globalAlpha = 0.22; g.strokeStyle = '#8a7350'; g.lineWidth = 2;
    for (const y0 of [size * 0.33, size * 0.66]) { g.beginPath(); g.moveTo(0, y0); g.lineTo(size, y0 + 4); g.stroke(); }
    g.globalAlpha = 0.18; g.fillStyle = '#9a7a4a';
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(rnd() * size, rnd() * size, 6 + rnd() * 18, 4 + rnd() * 12, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    // a patch, stitched on
    g.globalAlpha = 0.5; g.fillStyle = '#e2d2ae'; g.fillRect(size * 0.58, size * 0.12, size * 0.2, size * 0.16);
    g.globalAlpha = 0.6; g.setLineDash([3, 3]); g.strokeStyle = '#6a5434'; g.lineWidth = 1; g.strokeRect(size * 0.58 + 2, size * 0.12 + 2, size * 0.2 - 4, size * 0.16 - 4); g.setLineDash([]);
  }
  if (kind === 'rust') {
    g.globalAlpha = 0.25; g.strokeStyle = '#2e1a10'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const y0 = size * (0.2 + k * 0.3); g.beginPath(); g.moveTo(0, y0); g.lineTo(size, y0); g.stroke(); }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  TEX_CACHE.set(kind, t);
  return t;
}

let ENV = null;
/** A small studio environment for the metal parts (chrome needs something to reflect). */
function envMap(renderer) {
  if (ENV || !renderer) return ENV;
  const pm = new THREE.PMREMGenerator(renderer);
  // a warm room with a sky window and two lamps: enough for chrome and brass to read
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  const p = room.geometry.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = y > 0 ? new THREE.Color(0x9ab8d8).lerp(new THREE.Color(0xe8f0ff), y) : new THREE.Color(0x6a5a48).lerp(new THREE.Color(0x2e2a26), -y); col.push(c.r, c.g, c.b); }
  room.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sc.add(room);
  for (const [x, y, z, w, h, c] of [[0, 9, 0, 8, 8, 0xffffff], [8, 3, 5, 4, 3, 0xffe2b0], [-8, 2, -4, 3, 3, 0xbfe0ff]]) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    q.position.set(x, y, z); q.lookAt(0, 0, 0); sc.add(q);
  }
  ENV = pm.fromScene(sc, 0.04).texture;
  pm.dispose();
  return ENV;
}

function materials() {
  const std = (kind, o = {}) => new THREE.MeshStandardMaterial({ map: paintTexture(kind), roughness: 0.75, metalness: 0.1, ...o });
  return {
    rust: std('rust', { roughness: 0.85, metalness: 0.25 }),
    slate: std('slate', { roughness: 0.6, metalness: 0.3 }),
    belly: std('belly', { roughness: 0.62, metalness: 0.3 }),
    stripe: std('stripe', { roughness: 0.5, metalness: 0.35 }),
    canvas: std('canvas', { side: THREE.DoubleSide, roughness: 0.95, metalness: 0 }),
    wood: std('wood', { roughness: 0.8, metalness: 0 }),
    leather: std('leather', { roughness: 0.7, metalness: 0 }),
    brass: std('brass', { roughness: 0.38, metalness: 0.75 }),
    steel: std('steel', { roughness: 0.32, metalness: 0.8 }),
    umbrella: std('umbrella', { roughness: 0.8, metalness: 0 }),
    strip: new THREE.MeshStandardMaterial({ color: 0xc4302b, roughness: 0.55, metalness: 0.15 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.95, metalness: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6, metalness: 0.3 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.45, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.12, metalness: 1.0, envMapIntensity: 1 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x7ff0ff, toneMapped: false }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.2, metalness: 0.4 }),
  };
}

// ------------------------------------------------------------------ geometry helpers
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function xf(geo, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], s = 1) {
  const sv = Array.isArray(s) ? _s.set(...s) : _s.set(s, s, s);
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), sv);
  return geo.applyMatrix4(_m);
}
/** A cylinder from a to b (Vector3-like arrays). */
function rod(a, b, r, seg = 10, r2 = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r2, r, len, seg, 1);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z);
  return g;
}
function nonIndexed(g) { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }

/** Collects code geometry per material, then merges into one mesh per material under a node. */
class Kit {
  constructor(mats) { this.mats = mats; this.bins = new Map(); }
  add(mat, geo) { if (!this.bins.has(mat)) this.bins.set(mat, []); this.bins.get(mat).push(nonIndexed(geo)); return this; }
  into(node, { shadow = true } = {}) {
    for (const [mat, list] of this.bins) {
      const g = mergeGeometries(list, false);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, this.mats[mat]);
      m.castShadow = shadow; m.receiveShadow = false;
      m.name = mat;
      node.add(m);
    }
    this.bins.clear();
    return node;
  }
}

function bolts(kit, pts, r = 0.028, axis = [0, 0, 0]) {
  for (const p of pts) kit.add('brass', xf(new THREE.CylinderGeometry(r, r, r * 1.1, 6), p, axis));
}

// ------------------------------------------------------------------ the model
const HIP_Y = 1.14;      // body pivot height (stand pose)

export class Mecha {
  constructor(G) {
    this.G = G;
    this.root = new THREE.Group();
    this.root.name = 'mecha';
    this.inner = new THREE.Group();          // counter-mirrored (see header)
    this.inner.scale.x = -1;
    this.root.add(this.inner);
    this.partNodes = Object.fromEntries(PARTS_ORDER.map((p) => [p, []]));
    this.mats = materials();
    this.J = {};                              // joints (pivots)
    this.t = 0;
  }

  /** Register a node as (part of) a part; returns it. */
  #part(name, node) { node.userData.home = node.position.clone(); node.name = 'part:' + name; this.partNodes[name].push(node); return node; }
  nodes(part) { return this.partNodes[part] || []; }

  async build() {
    const G = this.G, M = this.mats, J = this.J;
    const reg = G?.registry;
    const glb = async (id) => (reg ? reg.baked(id) : null);
    const [cart, cone, mega, batt] = await Promise.all(['hotdog-cart', 'traffic-cone', 'megaphone', 'battery'].map(glb));
    const kit = new Kit(M);
    const env = envMap(G?.renderer);
    if (env) for (const [k, intensity] of [['chrome', 1.0], ['steel', 0.6], ['brass', 0.7], ['slate', 0.25], ['stripe', 0.3]]) { M[k].envMap = env; M[k].envMapIntensity = intensity; }

    // ---------------------------------------------------------- the body pivot (bob, lean)
    const body = J.body = new THREE.Group();
    body.position.set(0, HIP_Y, 0);
    this.inner.add(body);

    // ---------------------------------------------------------- BODY: the cart over a riveted belly
    const bodyNode = this.#part('body', new THREE.Group());
    body.add(bodyNode);
    // the belly: a slate boiler, rounder at the front (a pigeon's breast), tapering to the tail
    {
      const prof = [];
      for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI; prof.push(new THREE.Vector2(Math.sin(a) * 0.62, -Math.cos(a) * 0.5)); }
      const g = new THREE.LatheGeometry(prof, 22);
      g.rotateX(Math.PI / 2);
      // squash into an egg: wider breast, narrower tail
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = z / 0.5;                       // -1 tail … +1 breast
        const w = 1 + 0.12 * k;
        p.setXYZ(i, x * w * 0.98, y * (y > 0 ? 0.7 : 1.0) * w, z * 2.05);
      }
      g.computeVertexNormals();
      kit.add('belly', xf(g, [0, 0.2, 0.02]));
      // plate seams (rings of rivets) and a keel band
      for (const z of [-0.6, -0.15, 0.3, 0.72]) {
        const rr = 0.56 * (1 + 0.12 * (z / 1.02)) * Math.sqrt(Math.max(0.05, 1 - (z / 1.06) ** 2));
        kit.add('steel', xf(new THREE.TorusGeometry(rr, 0.022, 5, 24, Math.PI), [0, 0.2, z], [0, 0, Math.PI]));
        const pts = []; for (let k = 1; k < 9; k++) { const a = Math.PI + (k / 9) * Math.PI; pts.push([Math.cos(a) * rr, 0.2 + Math.sin(a) * rr, z + 0.02]); }
        bolts(kit, pts, 0.022, [Math.PI / 2, 0, 0]);
      }
      // the rim where cart meets belly
      kit.add('rust', xf(new THREE.BoxGeometry(1.24, 0.07, 2.02), [0, 0.22, 0.02]));
    }
    // the cart: umbrella cropped off (it's folded on the back instead), stretched to a 2 m body
    if (cart) {
      const src = cart.geometry;
      const pos = src.attributes.position, idx = src.index;
      const keep = [];
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
        if (Math.max(pos.getY(a), pos.getY(b), pos.getY(c)) < 1.12) keep.push(a, b, c);
      }
      const g = src.clone();
      g.setIndex(keep);
      const mesh = new THREE.Mesh(g, cart.makeMaterial());
      mesh.castShadow = true;
      // long axis (x) → forward (z); tub at model y 0.7–0.95
      mesh.rotation.y = Math.PI / 2;
      mesh.scale.set(1.18, 1.25, 2.3);
      mesh.position.set(0, -0.45, 0.04);
      mesh.name = 'hotdog-cart';
      bodyNode.add(mesh);
    } else {
      kit.add('steel', xf(new THREE.BoxGeometry(1.0, 0.45, 1.9), [0, 0.5, 0]));
    }
    // straps over the body (leather, with brass buckles)
    for (const z of [-0.45, 0.35]) {
      kit.add('leather', xf(new THREE.TorusGeometry(0.66, 0.025, 4, 28, Math.PI * 1.05), [0, 0.28, z], [0, 0, -0.025], [1, 0.95, 2.4]));
      kit.add('brass', xf(new THREE.BoxGeometry(0.1, 0.12, 0.06), [0.55, 0.58, z]));
      kit.add('brass', xf(new THREE.BoxGeometry(0.1, 0.12, 0.06), [-0.55, 0.58, z]));
    }
    // the folded umbrella on its back, tied on with two straps
    {
      const u = new THREE.Group();
      u.position.set(-0.32, 0.7, -0.5); u.rotation.set(-0.55, 0, 0.18);
      const k2 = new Kit(M);
      const furl = new THREE.LatheGeometry([[0, 0], [0.13, 0.08], [0.17, 0.35], [0.14, 0.8], [0.07, 1.15], [0.02, 1.3], [0, 1.31]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
      k2.add('umbrella', furl);
      k2.add('wood', xf(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), [0, -0.15, 0]));
      k2.add('brass', xf(new THREE.SphereGeometry(0.045, 8, 6), [0, 1.33, 0]));
      for (const y of [0.32, 0.78]) k2.add('leather', xf(new THREE.TorusGeometry(y < 0.5 ? 0.18 : 0.15, 0.022, 4, 16), [0, y, 0], [Math.PI / 2, 0, 0]));
      k2.into(u);
      bodyNode.add(u);
    }
    // the tail: a fan of slate plates
    {
      const tail = new THREE.Group();
      tail.position.set(0, 0.42, -1.0); tail.rotation.x = -0.35;
      const k2 = new Kit(M);
      for (let i = -2; i <= 2; i++) {
        const plate = new THREE.BoxGeometry(0.2, 0.025, 0.62);
        plate.translate(0, 0, -0.31);
        // round the end a little
        const p = plate.attributes.position;
        for (let j = 0; j < p.count; j++) if (p.getZ(j) < -0.5) p.setX(j, p.getX(j) * 0.7);
        k2.add(i % 2 ? 'belly' : 'slate', xf(plate, [i * 0.1, Math.abs(i) * 0.012, 0], [0, i * 0.24, 0]));
        bolts(k2, [[i * 0.06, 0.03, -0.06]], 0.02);
      }
      k2.add('rust', xf(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), [0, 0, 0], [0, 0, Math.PI / 2]));
      k2.into(tail);
      bodyNode.add(tail);
    }
    // chest plate under the megaphone, the vent cage behind it (part of the body), rivets along the rim
    kit.add('steel', xf(new THREE.BoxGeometry(0.62, 0.5, 0.06), [0, 0.2, 1.06], [-0.12, 0, 0]));
    bolts(kit, [[-0.27, 0.42, 1.12], [0.27, 0.42, 1.12], [-0.27, -0.02, 1.07], [0.27, -0.02, 1.07]], 0.03, [Math.PI / 2, 0, 0]);
    kit.into(bodyNode);

    // ---------------------------------------------------------- the head (always: the raccoons made it first)
    const neck = J.neck = new THREE.Group();
    neck.position.set(0, 0.62, 0.78);
    body.add(neck);
    const head = J.head = new THREE.Group();
    head.position.set(0, 0.62, 0.12);
    neck.add(head);
    {
      const k2 = new Kit(M);
      // the cowl: a dented dome, deeper at the back of the neck
      const dome = new THREE.SphereGeometry(0.5, 28, 20);
      const p = dome.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const dent = 1 - 0.03 * Math.max(0, Math.sin(x * 9 + y * 7) * Math.cos(z * 8));
        p.setXYZ(i, x * 0.92 * dent, y * (y < 0 ? 1.15 : 0.95) * dent, z * 1.02 * dent + (y < 0 ? -y * 0.12 : 0));
      }
      dome.computeVertexNormals();
      k2.add('stripe', dome);
      // a riveted ridge over the crown, front to back
      k2.add('slate', xf(new THREE.TorusGeometry(0.49, 0.03, 5, 26, Math.PI), [0, 0, 0], [0, Math.PI / 2, 0], [1, 0.97, 1.03]));
      bolts(k2, Array.from({ length: 7 }, (_, k) => { const a = 0.35 + (k / 6) * (Math.PI - 0.7); return [0, Math.sin(a) * 0.5, Math.cos(a) * 0.51]; }), 0.026, [0, 0, 0]);
      // the plate collar: two rows of overlapping feather-plates
      for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + row * 0.26;
        const plate = new THREE.SphereGeometry(0.62 + row * 0.08, 5, 3, a - 0.32, 0.64, 1.75 + row * 0.18, 0.42);
        k2.add(row ? 'belly' : 'slate', xf(plate, [0, 0.1 - row * 0.14, -0.05], [0, 0, 0], [0.9, 0.95, 0.95]));
      }
      bolts(k2, Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2; return [Math.sin(a) * 0.58, -0.38, Math.cos(a) * 0.55 - 0.05]; }), 0.024);
      k2.into(head);
    }
    // where Gus stands: on top of the cowl
    this.seat = new THREE.Object3D();
    this.seat.position.set(0, 0.47, -0.04);
    head.add(this.seat);

    // ---------------------------------------------------------- EYES: hubcaps
    {
      const eyes = this.#part('eyes', new THREE.Group());
      head.add(eyes);
      const k2 = new Kit(M);
      for (const sx of [-1, 1]) {
        const cap = new THREE.LatheGeometry([[0.23, -0.04], [0.215, 0.02], [0.18, 0.045], [0.12, 0.07], [0.06, 0.082], [0, 0.085]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
        const hubnut = new THREE.CylinderGeometry(0.05, 0.06, 0.04, 6).translate(0, 0.1, 0);
        const rim = new THREE.TorusGeometry(0.235, 0.04, 8, 28).rotateX(Math.PI / 2).translate(0, -0.01, 0);
        const back = new THREE.CylinderGeometry(0.23, 0.2, 0.08, 20).translate(0, -0.06, 0);
        const rot = (g) => { g.rotateZ(-sx * Math.PI / 2); g.rotateY(-sx * 0.5); g.translate(sx * 0.4, 0.08, 0.2); return g; };
        k2.add('chrome', rot(cap)); k2.add('orange', rot(rim)); k2.add('pupil', rot(hubnut)); k2.add('rust', rot(back));
      }
      k2.into(eyes);
    }
    // ---------------------------------------------------------- BEAK: the traffic cone
    {
      const beak = this.#part('beak', new THREE.Group());
      head.add(beak);
      if (cone) {
        const m = new THREE.Mesh(cone.geometry, cone.makeMaterial());
        m.castShadow = true;
        const s = 0.82 / 0.7;
        m.scale.setScalar(s);
        m.rotation.x = Math.PI / 2 - 0.12;
        m.position.set(0, -0.06, 0.3);
        beak.add(m);
      }
      const k2 = new Kit(M);
      k2.add('leather', xf(new THREE.TorusGeometry(0.2, 0.025, 4, 18), [0, -0.05, 0.42], [-0.12, 0, 0]));
      k2.into(beak);
    }

    // ---------------------------------------------------------- VOICE: the megaphone on the chest
    {
      const voice = this.#part('voice', new THREE.Group());
      voice.position.set(0.0, 0.34, 1.1);
      body.add(voice);
      if (mega) {
        const m = new THREE.Mesh(mega.geometry, mega.makeMaterial());
        m.castShadow = true;
        m.scale.setScalar(1.6);   // the GLB already points its bell along +z
        m.position.set(0, -0.36, 0.05);
        voice.add(m);
      }
      const k2 = new Kit(M);
      k2.add('steel', xf(new THREE.TorusGeometry(0.13, 0.03, 6, 18), [0, 0, 0.06]));
      k2.add('steel', xf(new THREE.BoxGeometry(0.08, 0.22, 0.12), [0, -0.16, -0.02]));
      bolts(k2, [[0.11, 0, 0.09], [-0.11, 0, 0.09]], 0.026, [Math.PI / 2, 0, 0]);
      k2.into(voice);
    }
    // ---------------------------------------------------------- POWER: the battery in a chest cage, glowing
    {
      const power = this.#part('power', new THREE.Group());
      power.position.set(0, -0.12, 0.92);
      body.add(power);
      if (batt) {
        const m = new THREE.Mesh(batt.geometry, batt.makeMaterial());
        m.scale.setScalar(1.15);
        m.position.set(0, -0.1, 0.02);
        m.castShadow = true;
        power.add(m);
      }
      const k2 = new Kit(M);
      // the cage: a frame and grille slats in front of the battery
      for (const x of [-0.33, 0.33]) k2.add('rust', xf(new THREE.BoxGeometry(0.04, 0.4, 0.04), [x, 0.05, 0.3]));
      for (const y of [-0.15, 0.25]) k2.add('rust', xf(new THREE.BoxGeometry(0.7, 0.04, 0.04), [0, y, 0.3]));
      for (let k = 0; k < 4; k++) k2.add('dark', xf(new THREE.BoxGeometry(0.62, 0.035, 0.05), [0, -0.08 + k * 0.08, 0.31], [0.5, 0, 0]));
      bolts(k2, [[-0.33, 0.25, 0.33], [0.33, 0.25, 0.33], [-0.33, -0.15, 0.33], [0.33, -0.15, 0.33]], 0.024, [Math.PI / 2, 0, 0]);
      k2.into(power);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), M.glow.clone());
      glow.position.set(0, 0.05, 0.27);
      glow.material.transparent = true; glow.material.opacity = 0.9;
      power.add(glow);
      this.glow = glow;
      // a soft halo in front of the vent
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(160,250,255,0.9)'); grd.addColorStop(0.4, 'rgba(90,220,255,0.35)'); grd.addColorStop(1, 'rgba(60,200,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(1.1, 0.8, 1); halo.position.set(0, 0.05, 0.4);
      power.add(halo);
      this.halo = halo;
    }

    // ---------------------------------------------------------- WINGS: canvas sails on spars
    for (const sx of [-1, 1]) {
      const sh = J['wing' + (sx < 0 ? 'R' : 'L')] = new THREE.Group();
      sh.position.set(sx * 0.5, 0.62, 0.05);
      body.add(sh);
      const wing = this.#part('wings', new THREE.Group());
      sh.add(wing);
      const k2 = new Kit(M);
      const tip = [sx * 1.75, 1.15, -0.55], boom = [sx * 1.55, -0.45, -0.95], root = [0, 0, 0];
      k2.add('wood', rod([sx * -0.08, -0.05, 0.08], tip, 0.05, 8, 0.035));
      k2.add('wood', rod([0, -0.02, 0], boom, 0.045, 8, 0.03));
      // the sail: a billowed triangle between the root, the spar tip and the boom tip
      const N = 8, A = new THREE.Vector3(sx * 0.12, 0.05, -0.05), B = new THREE.Vector3(...tip), C = new THREE.Vector3(...boom);
      const nrm = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
      const pos = [], uv = [], ix = [];
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
        const a = i / N, b = j / N, c = 1 - a - b;
        const P = new THREE.Vector3().addScaledVector(A, c).addScaledVector(B, a).addScaledVector(C, b);
        P.addScaledVector(nrm, -sx * 0.22 * Math.sin(Math.PI * Math.min(1, a + b)) * Math.sin(Math.PI * (a / Math.max(0.001, a + b))) * (a + b));
        pos.push(P.x, P.y, P.z); uv.push(a * 1.2, b * 1.2);
      }
      const id = (i, j) => { let k = 0; for (let q = 0; q < i; q++) k += N - q + 1; return k + j; };
      for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
        ix.push(id(i, j), id(i + 1, j), id(i, j + 1));
        if (j < N - i - 1) ix.push(id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
      }
      const sail = new THREE.BufferGeometry();
      sail.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      sail.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      sail.setIndex(ix); sail.computeVertexNormals();
      k2.add('canvas', sail);
      // rope lashings at the tips and along the spar
      for (const [p, k] of [[tip, 1], [boom, 1], [[tip[0] * 0.5, tip[1] * 0.5, tip[2] * 0.5], 0.8], [[boom[0] * 0.5, boom[1] * 0.5, boom[2] * 0.5], 0.8]]) {
        for (let r = 0; r < 3; r++) k2.add('rope', xf(new THREE.TorusGeometry(0.05 * k + 0.012, 0.016, 4, 10), [p[0] * (1 - r * 0.03), p[1] * (1 - r * 0.03), p[2] * (1 - r * 0.03)], [0, 0, sx * 1.0]));
      }
      // the shoulder: an iron bracket bolted to the body
      k2.add('rust', xf(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 10), [0, 0, 0], [0, 0, Math.PI / 2]));
      k2.add('steel', xf(new THREE.BoxGeometry(0.06, 0.32, 0.26), [-sx * 0.06, -0.08, 0]));
      bolts(k2, [[sx * 0.075, 0, 0]], 0.04, [0, 0, Math.PI / 2]);
      k2.into(wing);
    }

    // ---------------------------------------------------------- LEGS (drainpipes) and TALONS (spike strips)
    for (const sx of [-1, 1]) {
      const L = sx < 0 ? 'R' : 'L';
      const hip = J['hip' + L] = new THREE.Group();
      hip.position.set(sx * 0.4, -0.12, -0.02);
      body.add(hip);
      const knee = J['knee' + L] = new THREE.Group();
      knee.position.set(0, -0.5, 0);
      hip.add(knee);
      const ankle = J['ankle' + L] = new THREE.Group();
      ankle.position.set(0, -0.52, 0);
      knee.add(ankle);
      // legs part: three nodes riding the three pivots
      const thigh = this.#part('legs', new THREE.Group()); hip.add(thigh);
      const shin = this.#part('legs', new THREE.Group()); knee.add(shin);
      const foot = this.#part('legs', new THREE.Group()); ankle.add(foot);
      const kt = new Kit(M), ks = new Kit(M), kf = new Kit(M);
      kt.add('rust', xf(new THREE.SphereGeometry(0.19, 14, 10), [0, 0, 0]));
      kt.add('rust', xf(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), [-sx * 0.06, 0, 0], [0, 0, Math.PI / 2]));
      kt.add('rust', xf(new THREE.CylinderGeometry(0.14, 0.14, 0.44, 14), [0, -0.25, 0]));
      for (const y of [-0.09, -0.42]) { kt.add('rust', xf(new THREE.CylinderGeometry(0.175, 0.175, 0.06, 14), [0, y, 0])); bolts(kt, [0, 1, 2, 3].map((k) => [Math.cos(k * 1.57 + 0.78) * 0.135, y + 0.03, Math.sin(k * 1.57 + 0.78) * 0.135]), 0.018); }
      kt.add('leather', xf(new THREE.TorusGeometry(0.15, 0.02, 4, 16), [0, -0.27, 0], [Math.PI / 2, 0, 0]));
      bolts(kt, [[-sx * 0.1, 0.0, 0.14], [-sx * 0.1, 0.0, -0.14], [-sx * 0.1, 0.14, 0], [-sx * 0.1, -0.14, 0]], 0.022, [0, 0, Math.PI / 2]);
      ks.add('rust', xf(new THREE.SphereGeometry(0.165, 12, 8), [0, 0, 0]));                         // the knee: an elbow fitting
      ks.add('rust', xf(new THREE.TorusGeometry(0.16, 0.035, 6, 14), [0, 0, 0], [0, Math.PI / 2, 0]));
      ks.add('rust', xf(new THREE.CylinderGeometry(0.125, 0.125, 0.46, 14), [0, -0.26, 0]));
      for (const y of [-0.12, -0.44]) ks.add('rust', xf(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 14), [0, y, 0]));
      bolts(ks, [[0.0, -0.1, 0.14], [0.0, -0.42, 0.14]], 0.02, [Math.PI / 2, 0, 0]);
      kf.add('rust', xf(new THREE.SphereGeometry(0.14, 12, 8), [0, 0, 0]));                           // ankle
      kf.add('rust', xf(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 16), [0, -0.08, 0.04]));            // the foot flange
      kf.into(foot); kt.into(thigh); ks.into(shin);
      // TALONS: three claw-toes of bundled spike strips, plus a hind toe
      const tal = this.#part('talons', new THREE.Group());
      tal.position.set(0, -0.1, 0.04);
      ankle.add(tal);
      const kk = new Kit(M);
      const toe = (yaw, len, back = false) => {
        const g = [];
        const dir = back ? -1 : 1;
        for (let s = 0; s < 3; s++) {
          const strip = new THREE.BoxGeometry(0.075, 0.03, len);
          strip.translate((s - 1) * 0.055, 0.02 + (s === 1 ? 0.035 : 0), dir * len / 2);
          g.push(['strip', strip]);
          for (let q = 0; q < 5; q++) g.push(['steel', new THREE.ConeGeometry(0.016, 0.07, 4).translate((s - 1) * 0.055, 0.065 + (s === 1 ? 0.035 : 0), dir * (0.06 + q * (len - 0.12) / 4))]);
        }
        g.push(['leather', new THREE.TorusGeometry(0.1, 0.018, 4, 12).scale(1.05, 0.65, 1).translate(0, 0.04, dir * len * 0.3)]);
        g.push(['leather', new THREE.TorusGeometry(0.1, 0.018, 4, 12).scale(1.05, 0.65, 1).translate(0, 0.04, dir * len * 0.72)]);
        g.push(['steel', new THREE.ConeGeometry(0.06, 0.2, 6).rotateX(dir * Math.PI / 2).translate(0, 0.035, dir * (len + 0.08))]);   // the claw tip
        for (const [m, geo] of g) kk.add(m, xf(geo, [0, 0, 0], [back ? 0.15 : 0, yaw, 0]));
      };
      toe(-0.55, 0.5); toe(0, 0.6); toe(0.55, 0.5); toe(0, 0.32, true);
      kk.into(tal);
    }

    this.base = { hip: -0.32, knee: 0.66, ankle: -0.34 };
    this.pose('stand', 0);
    // only the big pieces cast shadows (bolts, straps and rope don't need a shadow pass of their own)
    // (perf pass: Medium and Low keep only the biggest casters; each one is a shadow draw call)
    const minR = { high: 0.35, medium: 0.6, low: Infinity }[this.G?.preset?.id] ?? 0.35;
    this.root.traverse((o) => { if (o.isMesh) { o.frustumCulled = true; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.castShadow = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > minR; } });
    return this;
  }

  /** Show exactly these parts. */
  setParts(list) { for (const p of PARTS_ORDER) for (const n of this.partNodes[p]) n.visible = list.includes(p); }

  /** Light the vent (call every update). */
  ventGlow(t, k = 1) {
    if (!this.glow) return;
    const a = 0.55 + 0.25 * Math.sin(t * 3) + 0.2 * Math.sin(t * 7.3);
    this.glow.material.color.setHSL(0.52, 1, 0.45 + 0.2 * a * k);
    this.halo.material.opacity = (0.45 + 0.4 * a) * k;
  }

  /**
   * Poses on the pivots. kind:
   *   'stand'  idle breathing (t = seconds)
   *   'walk'   t = gait phase in cycles (0..1 per step pair); opts.stride (0..1)
   *   'climb'  t = seconds; opts.reachL / opts.reachR (0..1, a claw reaching up), opts.flap (0..1)
   *   'shout'  t = 0..1 (rear back, head up, beak open wide, wings spread)
   */
  pose(kind, t, o = {}) {
    const J = this.J, B = this.base;
    if (!J.body) return;
    const set = (L, h, k, a) => { J['hip' + L].rotation.set(B.hip + h, 0, 0); J['knee' + L].rotation.set(B.knee + k, 0, 0); J['ankle' + L].rotation.set(B.ankle + a, 0, 0); };
    J.body.position.set(0, HIP_Y, 0); J.body.rotation.set(0, 0, 0);
    J.neck.rotation.set(0, 0, 0); J.head.rotation.set(0, 0, 0);
    if (kind === 'stand') {
      const b = Math.sin(t * 1.6);
      J.body.position.y = HIP_Y + b * 0.012;
      J.neck.rotation.x = b * 0.03;
      set('L', 0, 0, 0); set('R', 0, 0, 0);
      for (const L of ['L', 'R']) J['wing' + L].rotation.set(0, 0, 0);
      return;
    }
    if (kind === 'walk') {
      const s = o.stride ?? 1, ph = t * Math.PI * 2;
      for (const [L, off] of [['L', 0], ['R', Math.PI]]) {
        const p = ph + off;
        const swing = Math.sin(p) * 0.55 * s;                 // + = leg forward
        const lift = Math.max(0, Math.cos(p)) * s;            // the forward-swinging leg lifts
        set(L, -swing - lift * 0.35, lift * 0.9, swing * 0.2 - lift * 0.5 + swing * 0.15);
      }
      // the body rolls onto the planted foot and dips at each plant (pigeon head-bob)
      const plant = Math.abs(Math.sin(ph));
      J.body.position.y = HIP_Y - 0.06 * s + plant * 0.08 * s;
      J.body.rotation.z = Math.sin(ph) * 0.06 * s;
      J.body.rotation.x = 0.05 * s;
      J.neck.rotation.x = -Math.cos(ph * 2) * 0.12 * s;
      J.head.rotation.x = Math.cos(ph * 2) * 0.06 * s;
      const flap = (o.flap ?? 0);
      for (const [L, sx] of [['L', 1], ['R', -1]]) J['wing' + L].rotation.set(Math.sin(ph) * 0.06, 0, sx * (0.12 * Math.sin(ph * 2) * s + flap * 0.6));
      return;
    }
    if (kind === 'climb') {
      // facing the wall (+z): body pitched upright against it, claws up the facade
      J.body.rotation.x = -1.2;
      J.body.position.y = HIP_Y + 0.2;
      J.neck.rotation.x = 0.9 + Math.sin(t * 2) * 0.05;
      J.head.rotation.x = 0.25;
      for (const [L, sx] of [['L', 1], ['R', -1]]) {
        const r = o['reach' + L] ?? 0;
        set(L, -0.9 - r * 0.9, 0.6 + (1 - r) * 0.5, 0.5 - r * 0.3);
        J['hip' + L].rotation.z = sx * -0.15;
        const flap = (o.flap ?? 0);
        J['wing' + L].rotation.set(-0.5 + r * 0.3, sx * 0.1, sx * (0.25 + 0.6 * flap * (0.5 + 0.5 * Math.sin(t * 14))));
      }
      J.body.rotation.z = ((o.reachL ?? 0) - (o.reachR ?? 0)) * 0.12;
      return;
    }
    if (kind === 'shout') {
      const k = Math.min(1, t);
      J.body.rotation.x = -0.25 * k;
      J.neck.rotation.x = -0.5 * k;
      J.head.rotation.x = -0.25 * k;
      set('L', 0.1 * k, 0, -0.1 * k); set('R', 0.1 * k, 0, -0.1 * k);
      for (const [L, sx] of [['L', 1], ['R', -1]]) J['wing' + L].rotation.set(-0.2 * k, 0, sx * 0.85 * k);
    }
  }
}
