// The fixed light set: sun (directional, the only shadow caster), hemisphere
// fill and Gus's headlamp (a SpotLight, no shadows). They exist from start-up
// and are never added, removed or hidden; phases change only intensity and
// colour, so shaders never recompile mid-game.

import * as THREE from 'three';

export function createLights(scene, preset) {
  const hemi = new THREE.HemisphereLight(0xbfe0f5, 0x6f9a4a, 1.2);
  hemi.name = 'hemi';
  const sun = new THREE.DirectionalLight(0xffd29a, 2.6);
  sun.name = 'sun';
  sun.castShadow = true;
  sun.shadow.mapSize.set(preset.shadowMap, preset.shadowMap);
  const b = preset.shadowBox / 2;
  Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 1, far: 260 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  const headlamp = new THREE.SpotLight(0xfff0d0, 0, 28, 0.5, 0.45, 1.2);
  headlamp.name = 'headlamp';
  headlamp.castShadow = false;
  scene.add(hemi, sun, sun.target);
  return { hemi, sun, headlamp, sunOffset: new THREE.Vector3(0, 1, 0) };
}

/** Keep the shadow box centred on Gus (snapped to texels so shadows don't swim). */
export function followShadow(lights, focus, preset) {
  const { sun } = lights;
  const d = lights.sunOffset;
  const texel = preset.shadowBox / preset.shadowMap;
  const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
  sun.target.position.set(fx, focus.y, fz);
  sun.position.set(fx + d.x * 120, focus.y + d.y * 120, fz + d.z * 120);
  sun.target.updateMatrixWorld();
}
