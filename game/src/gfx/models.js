// Model registry: every meshgen GLB the game may use, with its real size and a
// stand-in. If the GLB exists in assets/models/ it is loaded (and fitted to
// the size); otherwise the stand-in is used: a code builder if the entry has
// one, else a clearly coloured box or capsule at the right size. So models
// drop in later with no code changes.
//
// Which GLBs exist: assets/models/manifest.json (written by
// tools/list-models.mjs); on a local dev server with ?dev the folder listing
// is read instead, so a new GLB is picked up on reload.
//
// Gameplay never comes from GLBs: collision and perches are code (layout.js).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBakedModel, ruleMaterial } from './load-model.js';

const BASE = './assets/models/';

// id → { size: [w, h, d] metres (the fit box), fit: 'height' | 'width' | 'max', shape: 'box' | 'capsule', color, zone }
export const MODEL_TABLE = {
  'gus-stand': { size: [0.2, 0.32, 0.35], shape: 'capsule', color: 0x7a8597, core: true },
  'gus-fly': { size: [0.6, 0.32, 0.35], shape: 'capsule', color: 0x7a8597, core: true },
  'pigeon-plain': { size: [0.2, 0.32, 0.35], shape: 'capsule', color: 0x8a95a7, core: true },
  'pigeon-plain-fly': { size: [0.6, 0.32, 0.35], shape: 'capsule', color: 0x8a95a7, core: true },
  'bench': { size: [1.8, 0.85, 0.65], fit: 'width', shape: 'box', color: 0x3e5b3a, core: true },
  'lamppost': { size: [0.4, 4, 0.4], fit: 'height', shape: 'capsule', color: 0x2c3229, core: true },
  'trash-can': { size: [0.6, 0.8, 0.6], fit: 'height', shape: 'capsule', color: 0x3a3a3a },
  'tree-elm': { size: [9, 13, 9], fit: 'height', shape: 'capsule', color: 0xe8a33d, core: true },
  'tree-maple': { size: [7, 9, 7], fit: 'height', shape: 'capsule', color: 0xc4492d, core: true },
  'tree-oak': { size: [9, 11, 9], fit: 'height', shape: 'capsule', color: 0xb8862e, core: true },
  'tree-elm-lod': { size: [9, 13, 9], fit: 'height', shape: 'capsule', color: 0xe8a33d },
  'tree-maple-lod': { size: [7, 9, 7], fit: 'height', shape: 'capsule', color: 0xc4492d },
  'tree-oak-lod': { size: [9, 11, 9], fit: 'height', shape: 'capsule', color: 0xb8862e },
  'bethesda-fountain': { size: [8, 8, 8], fit: 'width', shape: 'box', color: 0xb9b2a4, zone: 'middle' },
  'belvedere-castle': { size: [16, 20, 12], fit: 'height', shape: 'box', color: 0x8d877e, zone: 'ramble' },
  'bow-bridge': { size: [4.5, 4, 27], fit: 'length', shape: 'box', color: 0xf0e8d4, zone: 'middle' },
  'carousel': { size: [14, 9, 14], fit: 'max', shape: 'capsule', color: 0xd9c8a0, zone: 'south' },
  'statue-sled-dog': { size: [1.2, 2, 2], fit: 'height', shape: 'box', color: 0x5a5a40, zone: 'south' },
  'statue-mushroom': { size: [3, 3, 3], fit: 'height', shape: 'capsule', color: 0x5a5a40, zone: 'middle' },
  'hotdog-cart': { size: [2, 2.4, 1.2], fit: 'max', shape: 'box', color: 0xb8bcc0 },
  'taxi': { size: [1.9, 1.5, 4.5], fit: 'max', shape: 'box', color: 0xf2c230 },
  'zamboni': { size: [2, 2.2, 3.6], fit: 'max', shape: 'box', color: 0xd9dde0, zone: 'south' },
};

const loader = new GLTFLoader();

export class ModelRegistry {
  constructor({ progress = null } = {}) {
    this.available = new Set();
    this.cache = new Map();     // id → Promise<{ scene | baked }>
    this.progress = progress;
    this.pending = new Set();
  }

  async init() {
    // Fixes-1 (#10): manifest.json first. The bare folder request 404s on servers without listings (and was cached
    // by the service worker); the listing is only read with ?dev, to pick up a new GLB without re-running the tool.
    const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('dev');
    let names = null;
    if (dev) names = await listFolder(BASE);
    if (!names) {
      try {
        const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
        if (r.ok) names = await r.json();
      } catch { /* no manifest: stand-ins everywhere */ }
    }
    for (const n of names || []) if (n.endsWith('.glb')) this.available.add(n.replace(/\.glb$/, ''));
    return this;
  }

  has(id) { return this.available.has(id); }

  /** Baked single geometry (for instancing and shader rigs): {geometry, map, makeMaterial, bounds} or null. */
  baked(id) {
    if (!this.has(id)) return Promise.resolve(null);
    const key = 'baked:' + id;
    if (!this.cache.has(key)) this.cache.set(key, this.#track(loadBakedModel(BASE + id + '.glb')));
    return this.cache.get(key);
  }

  /**
   * An Object3D for the model, fitted to its table size, standing on y = 0 and facing +Z:
   * the GLB if it exists, else standIn() (a code builder) or a coloured box/capsule.
   */
  async instance(id, { standIn = null, size = null } = {}) {
    const spec = MODEL_TABLE[id] || { size: size || [1, 1, 1], shape: 'box', color: 0xff00ff };
    const fit = size || spec.size;
    if (this.has(id)) {
      const key = 'scene:' + id;
      if (!this.cache.has(key)) this.cache.set(key, this.#track(loader.loadAsync(BASE + id + '.glb').then((g) => prepareScene(g.scene))));
      const proto = await this.cache.get(key);
      const obj = proto.clone(true);
      fitObject(obj, fit, spec.fit || 'max');
      obj.userData.model = id;
      return obj;
    }
    const obj = standIn ? standIn() : standInShape(spec, fit);
    obj.userData.model = id;
    obj.userData.standIn = true;
    return obj;
  }

  #track(p) {
    this.pending.add(p);
    this.progress?.add(1);
    return p.finally(() => { this.pending.delete(p); this.progress?.finish(1); });
  }

  /** Resolves when every model load started so far has finished. */
  async idle() { while (this.pending.size) await Promise.allSettled([...this.pending]); }
}

async function listFolder(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return null;
    const html = await r.text();
    return [...html.matchAll(/href="([^"?#]+\.glb)"/g)].map((m) => decodeURIComponent(m[1]).split('/').pop());
  } catch { return null; }
}

function prepareScene(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    o.material = ruleMaterial({ map: src.map || null, color: src.map ? 0xffffff : (src.color || new THREE.Color(0xcccccc)) });
    if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return scene;
}

/** Scale an object so its bounds fit `size` ([w, h, d]) by the chosen rule, then stand it on y = 0, centred. */
export function fitObject(obj, size, rule = 'max') {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3());
  let s = 1, turn = false;
  if (rule === 'length') {
    // the model's long horizontal axis becomes the span (+z), scaled to size[2]
    turn = dim.x > dim.z;
    s = size[2] / Math.max(dim.x, dim.z, 1e-6);
  } else if (rule === 'height') s = size[1] / Math.max(dim.y, 1e-6);
  else if (rule === 'width') s = size[0] / Math.max(dim.x, 1e-6);
  else s = Math.min(size[0] / Math.max(dim.x, 1e-6), size[1] / Math.max(dim.y, 1e-6), size[2] / Math.max(dim.z, 1e-6));
  const c = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group();
  while (obj.children.length) wrap.add(obj.children[0]);
  wrap.scale.setScalar(s);
  wrap.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  if (turn) { const t = new THREE.Group(); t.rotation.y = Math.PI / 2; t.add(wrap); obj.add(t); } else obj.add(wrap);
  return obj;
}

const standInMats = new Map();
function standInShape(spec, size) {
  const [w, h, d] = size;
  const color = spec.color ?? 0xff00ff;
  if (!standInMats.has(color)) standInMats.set(color, ruleMaterial({ color }));
  const mat = standInMats.get(color);
  let geo;
  if (spec.shape === 'capsule') {
    const r = Math.min(w, d) / 2;
    geo = new THREE.CapsuleGeometry(r, Math.max(0.01, h - 2 * r), 4, 10);
    geo.translate(0, h / 2, 0);
    geo.scale(1, 1, d / w);
  } else {
    geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
  }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}
