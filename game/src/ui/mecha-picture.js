// Fixes-1: the Workshop panel's picture of the Mecha-Pigeon, rendered with the game's own renderer from the real
// 3D Mecha (entities/mecha.js, the one standing in the Workshop), so it shows exactly the parts you have. Missing
// parts are drawn as faint ghosts so the gaps read. One render per part set (cached as a data URL); the panel opens
// over a paused game, so the cost (one 440 x 440 render) is never felt in play.

import * as THREE from 'three';
import { PARTS_ORDER, MECHA_HEIGHT } from '../entities/mecha.js';

const SIZE = 440;
const cache = new Map();   // parts key → data URL
let kit = null;

function makeKit() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a5048, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.2);
  rim.position.set(-5, 4, -6);
  scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const ghost = new THREE.MeshBasicMaterial({ color: 0x7a6a58, transparent: true, opacity: 0.16, depthWrite: false });
  return { scene, cam, rt, ghost, pixels: new Uint8Array(SIZE * SIZE * 4) };
}

/** A data URL of the Mecha with these parts, or null if the Workshop's Mecha isn't built (the panel keeps its sketch). */
export function mechaPicture(G, parts) {
  const mecha = G.workshop?.mecha;
  const renderer = G.renderer;
  if (!mecha?.root || !renderer) return null;
  const k = PARTS_ORDER.filter((p) => parts.includes(p)).join(',') || 'none';
  if (cache.has(k)) return cache.get(k);
  kit ||= makeKit();
  // a copy of the Workshop's Mecha as it stands (shares geometry and materials): every part shown, the missing
  // ones swapped to the ghost material. Its root is counter-mirrored for the mirrored world: undo that here.
  const copy = mecha.root.clone(true);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0.5, 0);
  copy.scale.set(Math.abs(copy.scale.x), copy.scale.y, copy.scale.z);
  for (const p of PARTS_ORDER) {
    const have = parts.includes(p);
    for (const n of mecha.nodes(p)) {
      const c = findCopy(mecha.root, copy, n);
      if (!c) continue;
      c.visible = true;
      if (!have) c.traverse((o) => { if (o.isMesh) { o.material = kit.ghost; o.castShadow = false; } });
    }
  }
  // render-only culling (gfx/detail-cull.js) takes sub-pixel meshes off layer 0 while the Workshop is far away: the copy
  // is drawn up close, so every mesh goes back on the layer the camera sees
  copy.traverse((o) => { if (o.isMesh || o.isSprite) o.layers.enable(0); });
  copy.updateMatrixWorld(true);
  kit.scene.add(copy);
  // frame it: the whole Mecha, slightly from below and to the side, like a poster
  const box = new THREE.Box3().setFromObject(copy);
  const c = box.getCenter(new THREE.Vector3());
  const h = Math.max(box.max.y - box.min.y, box.max.x - box.min.x, box.max.z - box.min.z, MECHA_HEIGHT * 0.8);   // wings spread wide
  const dist = (h * 0.6) / Math.tan(THREE.MathUtils.degToRad(kit.cam.fov / 2));
  kit.cam.position.set(c.x + dist * 0.18, c.y + h * 0.06, c.z + dist);
  kit.cam.lookAt(c.x, c.y, c.z);
  kit.cam.updateProjectionMatrix();

  const prev = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), shadows: renderer.shadowMap.enabled };
  let url = null;
  try {
    renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(kit.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(kit.scene, kit.cam);
    renderer.readRenderTargetPixels(kit.rt, 0, 0, SIZE, SIZE, kit.pixels);
    const cv = document.createElement('canvas');
    cv.width = cv.height = SIZE;
    const g = cv.getContext('2d');
    const img = g.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) img.data.set(kit.pixels.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);   // GL rows run bottom-up
    g.putImageData(img, 0, 0);
    url = cv.toDataURL('image/png');
  } catch (e) {
    console.warn('mecha picture', e);
  } finally {
    renderer.setRenderTarget(prev.target);
    renderer.setClearColor(prev.color, prev.alpha);
    renderer.shadowMap.enabled = prev.shadows;
    kit.scene.remove(copy);
  }
  if (url) cache.set(k, url);
  return url;
}

/** The node in `copy` at the same place in the tree as `node` in `root` (names repeat: walk the child indices). */
function findCopy(root, copy, node) {
  const path = [];
  for (let o = node; o && o !== root; o = o.parent) path.unshift(o.parent ? o.parent.children.indexOf(o) : -1);
  let c = copy;
  for (const i of path) { c = c?.children[i]; if (!c) return null; }
  return c;
}
