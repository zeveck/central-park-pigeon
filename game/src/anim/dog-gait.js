// Batch-3 (#11, the walk half of #7): a coded trot for the dogs. The dog GLBs are baked static meshes (no skin, no
// clips), so the legs swing in the vertex shader. Visual only: nothing in the game reads a leg.
//
// At load, prepare(geometry) sorts the vertices once (aGait = group, weight, pivot y, pivot z):
//   - the legs: vertices below ~35% of the height, split front / back at the empty gap between the paws and left /
//     right about the middle; the diagonal pairs (front-left + back-right, front-right + back-left) swing in opposite
//     phase, a trot. Each leg turns about its hip / shoulder (pitch), more towards the paw, and the swinging paw lifts.
//   - the head (front, upper) nods twice a stride; the tail (back, upper) wags, faster when trotting.
// A model whose paws don't separate (the mastiff lies down) gets no legs (gait.legs false); it still stops bouncing.
//
// The body itself never bobs or rolls: the back stays level and the legs do the walking.
//
// Driving it, per dog: DogGait.step(dt, speed) advances the phase by distance (one stride ≈ 0.9 × the dog's drawn
// height) and eases the amplitude in and out with speed (standing still: legs straight, a slow wag).
//   - a plain Mesh (leash dogs): patch(material, geometry) gives the material its own uniforms; gait.apply(uniforms).
//   - an InstancedMesh (crowd dogs, named dogs): patch(material, geometry, { instanced: true }) and an instanced
//     vec3 attribute aGaitI (phase, amplitude, wag phase) per instance: instanceAttr(geometry, n), then set it.

import * as THREE from 'three';
import { addShaderPatch } from './shader-patch.js';

const INFO = new WeakMap();   // position attribute → { legs, height, lift }

/** Sort the vertices of a dog geometry into legs / head / tail (once per position buffer). Returns the info. */
export function prepare(geometry) {
  const pos = geometry.attributes.position;
  if (INFO.has(pos)) { const inf = INFO.get(pos); if (!geometry.attributes.aGait) geometry.setAttribute('aGait', inf.attr); return inf; }
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox, H = bb.max.y - bb.min.y, L = bb.max.z - bb.min.z, y0 = bb.min.y;
  const n = pos.count;
  const legTop = y0 + H * 0.35;
  // front / back: the emptiest z column between 30% and 70% of the length, among the paws (the lowest 15%)
  const BINS = 40, hist = new Array(BINS).fill(0);
  let cx = 0, cn = 0;
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    if (y > y0 + H * 0.15) continue;
    hist[Math.min(BINS - 1, Math.floor(((pos.getZ(i) - bb.min.z) / L) * BINS))]++;
    cx += pos.getX(i); cn++;
  }
  let gap = -1, best = Infinity;
  for (let b = Math.floor(BINS * 0.3); b <= Math.ceil(BINS * 0.7); b++) { const v = hist[b] + (hist[b - 1] + hist[b + 1]) * 0.5; if (v < best) { best = v; gap = b; } }
  const paws = cn;
  const legs = paws > 20 && best <= paws * 0.004;   // a clear gap: four standing legs
  const splitZ = bb.min.z + ((gap + 0.5) / BINS) * L;
  const midX = cn ? cx / cn : 0;
  // each pair's centre and reach along z (from the paws)
  const pair = [{ s: 0, n: 0, min: Infinity, max: -Infinity }, { s: 0, n: 0, min: Infinity, max: -Infinity }];   // back, front
  for (let i = 0; i < n; i++) {
    if (pos.getY(i) > y0 + H * 0.15) continue;
    const z = pos.getZ(i), p = pair[z > splitZ ? 1 : 0];
    p.s += z; p.n++; p.min = Math.min(p.min, z); p.max = Math.max(p.max, z);
  }
  for (const p of pair) { p.c = p.n ? p.s / p.n : 0; p.r = Math.max(0.02 * L, (p.max - p.min) / 2); }
  const pivotY = y0 + H * 0.42;   // hips and shoulders sit a little above the leg zone
  const a = new Float32Array(n * 4);
  const headZ = bb.min.z + L * 0.72, tailZ = bb.min.z + L * 0.25;
  // the back line: the highest point of the middle of the body; the tail is what rises above it at the rear
  let backTop = y0;
  for (let i = 0; i < n; i++) { const z = pos.getZ(i); if (z > bb.min.z + L * 0.3 && z < bb.min.z + L * 0.52) backTop = Math.max(backTop, pos.getY(i)); }
  const tailY = backTop - H * 0.02;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let g = 0, w = 0, py = 0, pz = 0;
    if (legs && y < legTop) {
      const front = z > splitZ, p = pair[front ? 1 : 0];
      // fades out between the legs (belly, chest) and towards the top of the leg zone
      const along = 1 - THREE.MathUtils.smoothstep(Math.abs(z - p.c), p.r * 1.3, p.r * 2.2);
      const down = THREE.MathUtils.smoothstep(legTop - y, 0, H * 0.22);
      w = along * down;
      if (w > 0.001) {
        const left = x > midX;
        g = (front === left) ? 1 : 2;   // diagonal pairs: front-left + back-right, front-right + back-left
        py = pivotY; pz = p.c;
      }
    }
    if (!g && z > headZ && y > y0 + H * 0.5) { g = 3; w = THREE.MathUtils.smoothstep(z, headZ, headZ + L * 0.1); py = y0 + H * 0.55; pz = headZ; }
    else if (!g && z < tailZ && y > tailY) { g = 4; w = THREE.MathUtils.smoothstep(y - tailY, 0, H * 0.08); py = y; pz = tailZ; }
    a[i * 4] = g; a[i * 4 + 1] = w; a[i * 4 + 2] = py; a[i * 4 + 3] = pz;
  }
  const attr = new THREE.BufferAttribute(a, 4);
  geometry.setAttribute('aGait', attr);
  const inf = { legs, height: H, length: L, lift: H * 0.055, attr };
  INFO.set(pos, inf);
  return inf;
}

/** An instanced (phase, amplitude, wag) attribute for n instances. */
export function instanceAttr(geometry, n) {
  const at = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  at.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aGaitI', at);
  return at;
}

/** The leg's pitch for this vertex (0 off the legs): shared by the position, the normal and the shadow pass. */
const GLSL_HEAD = (instanced) => /* glsl */ `
  uniform vec3 uGait; uniform float uGaitLift; uniform float uGaitLegs;
  attribute vec4 aGait;
  ${instanced ? 'attribute vec3 aGaitI;' : ''}
  vec3 dogGs() { return ${instanced ? 'aGaitI' : 'uGait'}; }   // phase, amplitude 0..1, wag phase
  float dogLegPh(vec3 gs) { return gs.x + (aGait.x > 1.5 ? 3.14159265 : 0.0); }
  float dogLegAng(vec3 gs) {
    if (aGait.x < 0.5 || aGait.x > 2.5 || uGaitLegs < 0.5) return 0.0;
    float sw = sin(dogLegPh(gs));
    // forward when positive (+z); the back-swing is shallower (further back, the paw's dark sole turned to the camera)
    return 0.32 * gs.y * (sw > 0.0 ? sw : 0.55 * sw) * aGait.y;
  }`;

const GLSL_VERTEX = /* glsl */ `
  vec3 gs = dogGs();
  float grp = aGait.x;
  if (grp > 0.5 && grp < 2.5 && uGaitLegs > 0.5) {
    float ang = dogLegAng(gs);
    vec2 d = vec2(transformed.z - aGait.w, transformed.y - aGait.z);
    float c = cos(ang), s = sin(ang);
    transformed.z = aGait.w + d.x * c - d.y * s;
    transformed.y = aGait.z + d.x * s + d.y * c;
    transformed.y += uGaitLift * gs.y * max(0.0, cos(dogLegPh(gs))) * aGait.y;   // the paw lifts as it swings forward
  } else if (grp > 2.5 && grp < 3.5) {
    transformed.y += uGaitLift * 0.35 * gs.y * sin(gs.x * 2.0 + 0.6) * aGait.y;   // the head nods twice a stride
  } else if (grp > 3.5) {
    float wag = sin(gs.z) * (0.25 + 0.2 * gs.y) * aGait.y;  // a wag about the tail's root
    transformed.x += (aGait.w - transformed.z) * wag;
  }`;

// the leg's normals turn with it (same pitch about x); cheap, and the lit side follows the swing
const GLSL_NORMAL = /* glsl */ `
  float na = dogLegAng(dogGs());
  if (na != 0.0) { float c = cos(na), s = sin(na); objectNormal = vec3(objectNormal.x, objectNormal.z * s + objectNormal.y * c, objectNormal.z * c - objectNormal.y * s); }`;

/**
 * Patch a dog material. Returns its uniforms (plain meshes set uGait per dog; instanced meshes read aGaitI).
 * The shadow pass gets the same gait: material.userData.gaitDepth is a depth material sharing these uniforms; the
 * hooks set it as the mesh's customDepthMaterial (the sun is the only shadow-casting light: no distance material).
 */
export function patch(material, geometry, { instanced = false } = {}) {
  const inf = prepare(geometry);
  const uniforms = { uGait: { value: new THREE.Vector3() }, uGaitLift: { value: inf.lift }, uGaitLegs: { value: inf.legs ? 1 : 0 } };
  const key = 'doggait' + (instanced ? 'I' : '');
  addShaderPatch(material, { key, uniforms, vertexHeader: GLSL_HEAD(instanced), vertex: GLSL_VERTEX, normal: GLSL_NORMAL });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  addShaderPatch(depth, { key, uniforms, vertexHeader: GLSL_HEAD(instanced), vertex: GLSL_VERTEX });
  material.userData.gaitDepth = depth;
  return uniforms;
}

/** One dog's gait state. height: the dog's drawn height in metres (the stride scales with it). */
export class DogGait {
  constructor(height = 0.6, seed = 0) {
    this.h = Math.max(0.15, height);
    this.phase = seed * 1.7;
    this.amp = 0;
    this.wag = seed * 2.3;
  }
  /** Advance by a step of `speed` m/s over dt (the stride is tied to the ground covered). */
  step(dt, speed) {
    const stride = this.h * 0.9;
    const moving = speed > 0.08;
    this.phase = (this.phase + (Math.PI * 2 * speed * dt) / stride) % (Math.PI * 2000);
    const want = moving ? Math.min(1, 0.35 + speed / 1.4) : 0;
    this.amp += (want - this.amp) * Math.min(1, dt * 8);
    if (!moving && this.amp < 0.02) this.amp = 0;
    this.wag += dt * (moving ? 11 : 5);
    return this;
  }
  /** Write into a plain mesh's uniforms. */
  apply(u) { u.uGait.value.set(this.phase, this.amp, this.wag); }
  /** Write into an instanced attribute at index i. */
  write(attr, i) { attr.array[i * 3] = this.phase; attr.array[i * 3 + 1] = this.amp; attr.array[i * 3 + 2] = this.wag; }
}
