// Load a meshgen GLB as one baked geometry + one material that follows the
// game's material rule (MeshStandardMaterial, roughness 0.85, metalness 0,
// no environment map). Baking the node transforms into the geometry puts
// vertices in the model's own space in metres (+Y up, +Z front), which is
// what the shader deformers' rigs are written in (animating.md, step 1).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();

export const MATERIAL_RULE = { roughness: 0.85, metalness: 0 };

export function ruleMaterial(params = {}) {
  return new THREE.MeshStandardMaterial({ ...MATERIAL_RULE, ...params });
}

/**
 * @returns {Promise<{geometry: THREE.BufferGeometry, map: THREE.Texture|null, makeMaterial: () => THREE.MeshStandardMaterial, bounds: THREE.Box3}>}
 */
export async function loadBakedModel(url, { onProgress } = {}) {
  const gltf = await loader.loadAsync(url, onProgress);
  gltf.scene.updateMatrixWorld(true);
  const geos = [];
  let map = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    geos.push(g);
    if (!map && o.material && o.material.map) map = o.material.map;
  });
  const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }
  return {
    geometry,
    map,
    bounds: geometry.boundingBox.clone(),
    // A fresh material per use, so each can carry its own shader patches.
    makeMaterial: (extra = {}) => ruleMaterial({ map, ...extra }),
  };
}
