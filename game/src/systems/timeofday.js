// Time of day: Morning, Afternoon, Dusk, Night. Time never ticks by itself;
// Gus changes it by napping (a later milestone). Each phase sets the light
// set's colours and intensities, the sky, fog and water colours, the city's
// window glow and lampposts, the headlamp, stars and the moon.

import * as THREE from 'three';
import { U } from '../gfx/materials.js';
import { skyUniforms } from '../world/sky.js';
import { farUniforms } from '../world/farlayer.js';
import { waterUniforms } from '../world/water.js';

export const PHASE_ORDER = ['morning', 'afternoon', 'dusk', 'night'];

const dir = (azDeg, elDeg) => {
  // azimuth from north (+z) toward east (+x)
  const a = THREE.MathUtils.degToRad(azDeg), e = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
};

export const PHASES = {
  morning: {
    label: 'Morning', sun: { dir: dir(118, 22), color: 0xffe2b5, i: 2.5 }, hemi: { sky: 0xcfe6f5, ground: 0x7d9a56, i: 1.25 },
    sky: { top: 0x7cbbe8, horizon: 0xf6e2c4, ground: 0x8f9596, sunGlow: 0.45 }, fog: 0xdfe3dc, clouds: [1.02, 1.0, 0.98], cloudA: 1,
    windows: 0.0, lamps: 0, headlamp: 0, stars: 0, moon: 0, night: 0, ring: 0xffffff,
    water: { sky: 0xbfdcec, deep: 0x2f6c7d, shallow: 0x74a898 }, exposure: 1.0,
  },
  afternoon: {
    label: 'Afternoon', sun: { dir: dir(215, 30), color: 0xffd49a, i: 2.7 }, hemi: { sky: 0xbfe0f5, ground: 0x7a9450, i: 1.15 },
    sky: { top: 0x6fb2e6, horizon: 0xf1d9b4, ground: 0x969890, sunGlow: 0.4 }, fog: 0xe6dccb, clouds: [1.04, 0.98, 0.92], cloudA: 1,
    windows: 0.0, lamps: 0, headlamp: 0, stars: 0, moon: 0, night: 0, ring: 0xfff4e6,
    water: { sky: 0xc4dceb, deep: 0x2c6a7c, shallow: 0x6ea596 }, exposure: 1.0,
  },
  dusk: {
    label: 'Dusk', sun: { dir: dir(250, 4), color: 0xff9a5a, i: 1.6 }, hemi: { sky: 0x9a7fb8, ground: 0x5a5a48, i: 0.95 },
    sky: { top: 0x4b4f96, horizon: 0xf2a070, ground: 0x5f5866, sunGlow: 0.9 }, fog: 0xb88a8a, clouds: [1.15, 0.72, 0.62], cloudA: 0.95,
    windows: 0.55, lamps: 0.6, headlamp: 0, stars: 0.15, moon: 0.4, night: 0.35, ring: 0xf0b8a0,
    water: { sky: 0xd9a08e, deep: 0x2d4f68, shallow: 0x5f7f88 }, exposure: 1.0,
  },
  night: {
    label: 'Night', sun: { dir: dir(150, 38), color: 0x9fb0e8, i: 0.55 }, hemi: { sky: 0x4a4a8a, ground: 0x2a2a3a, i: 0.62 },
    sky: { top: 0x0d1030, horizon: 0x3a3266, ground: 0x1c1a28, sunGlow: 0.0 }, fog: 0x2c2848, clouds: [0.32, 0.3, 0.45], cloudA: 0.55,
    windows: 1.0, lamps: 1.0, headlamp: 2.2, stars: 1.0, moon: 1.0, night: 1, ring: 0xffffff,
    water: { sky: 0x3a3a6a, deep: 0x141c38, shallow: 0x283a58 }, exposure: 1.0,
  },
};

export class TimeOfDay {
  constructor({ lights, scene, farScene }) {
    this.lights = lights;
    this.scene = scene;
    this.farScene = farScene;
    this.phase = 'morning';
  }

  set(phase) {
    const P = PHASES[phase];
    if (!P) throw new Error('unknown phase ' + phase);
    this.phase = phase;
    const { sun, hemi, headlamp } = this.lights;
    sun.color.set(P.sun.color);
    sun.intensity = P.sun.i;
    this.lights.sunOffset.copy(P.sun.dir);
    hemi.color.set(P.hemi.sky);
    hemi.groundColor.set(P.hemi.ground);
    hemi.intensity = P.hemi.i;
    headlamp.intensity = P.headlamp;
    skyUniforms.uTop.value.set(P.sky.top);
    skyUniforms.uHorizon.value.set(P.sky.horizon);
    skyUniforms.uGround.value.set(P.sky.ground);
    skyUniforms.uSunGlow.value = P.sky.sunGlow;
    skyUniforms.uSunDir.value.copy(phase === 'night' ? dir(250, -20) : P.sun.dir);
    skyUniforms.uSunColor.value.set(P.sun.color);
    skyUniforms.uMoonDir.value.copy(phase === 'night' ? P.sun.dir : dir(150, 30));
    skyUniforms.uMoon.value = P.moon;
    skyUniforms.uStars.value = P.stars;
    skyUniforms.uCloudTint.value.setRGB(...P.clouds);
    skyUniforms.uCloudAlpha.value = P.cloudA;
    farUniforms.uNight.value = P.night;
    farUniforms.uRingTint.value.set(P.ring);
    waterUniforms.uSkyTint.value.set(P.water.sky);
    waterUniforms.uWaterDeep.value.set(P.water.deep);
    waterUniforms.uWaterShallow.value.set(P.water.shallow);
    U.uWindowGlow.value = P.windows;
    U.uLampGlow.value = P.lamps;
    for (const s of [this.scene, this.farScene]) if (s.fog) s.fog.color.set(P.fog);
    return P;
  }

  next() { return this.set(PHASE_ORDER[(PHASE_ORDER.indexOf(this.phase) + 1) % PHASE_ORDER.length]); }
}
