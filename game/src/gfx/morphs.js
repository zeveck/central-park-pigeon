// Colour-morph texture arrays (Art direction, "Pigeon colour morphs"): each
// model's hand-painted layers (assets/textures/morphs/manifest.json) are
// decoded and copied into one DataArrayTexture, so a single InstancedMesh draws
// every morph with a per-instance layer index (one draw call per pose).
// Layer size follows the preset (1024² on High, 512² on Medium and Low).
//
//   const arr = await loadMorphArray('pigeon-plain', 512)   // { texture, layers, averages }
//   patchMorphArray(material, arr.texture)                   // + an `aLayer` instanced attribute

import * as THREE from 'three';
import { addShaderPatch } from '../anim/shader-patch.js';

let manifest = null;
async function getManifest() {
  if (!manifest) manifest = fetch('./assets/textures/morphs/manifest.json').then((r) => r.json());
  return manifest;
}

export async function loadMorphArray(name, size = 512) {
  const m = await getManifest();
  const list = m.arrays[name];
  if (!list) return null;
  const imgs = await Promise.all(list.map((l) => loadImage('./assets/textures/morphs/' + l.file)));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const data = new Uint8Array(size * size * 4 * imgs.length);
  const averages = [];
  imgs.forEach((img, i) => {
    g.clearRect(0, 0, size, size);
    // three's DataArrayTexture isn't flipped on upload: draw upside down to match glTF UVs (flipY = false)
    g.drawImage(img, 0, 0, size, size);
    const px = g.getImageData(0, 0, size, size).data;
    data.set(px, i * size * size * 4);
    let r = 0, gg = 0, b = 0, n = 0;
    for (let k = 0; k < px.length; k += 4 * 97) { r += px[k]; gg += px[k + 1]; b += px[k + 2]; n++; }
    averages.push([r / n / 255, gg / n / 255, b / n / 255]);
  });
  const tex = new THREE.DataArrayTexture(data, size, size, imgs.length);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { texture: tex, layers: list.map((l) => l.morph), averages, size };
}

function loadImage(url) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('morph ' + url)); i.src = url; });
}

/** Sample the material's colour from the array at the instance's layer (needs a map so vMapUv exists). */
export function patchMorphArray(material, texture, { sheen = false } = {}) {
  return addShaderPatch(material, {
    key: 'morpharr' + (sheen ? 's' : ''),
    uniforms: { uMorph: { value: texture } },
    vertexHeader: 'attribute float aLayer; varying float vLayer;' + (sheen ? ' attribute vec3 aSheen; varying vec3 vSheen; varying float vNeck;' : ''),
    vertex: 'vLayer = aLayer;' + (sheen ? ' vSheen = aSheen; vNeck = smoothstep(0.17, 0.2, position.y) * (1.0 - smoothstep(0.235, 0.26, position.y)) * step(0.0, position.z);' : ''),
    fragmentHeader: 'uniform highp sampler2DArray uMorph; varying float vLayer;' + (sheen ? ' varying vec3 vSheen; varying float vNeck;' : ''),
    fragmentReplace: [['#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture(uMorph, vec3(vMapUv, floor(vLayer + 0.5)));
        diffuseColor *= sampledDiffuseColor;
      #endif
      ${sheen ? 'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vSheen * 1.6, vNeck * 0.45);' : ''}`]],
  });
}
