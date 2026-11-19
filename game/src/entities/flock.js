// Gus's flock: up to 24 visible pigeons in one InstancedMesh (one draw call),
// with the wingbeat shader, a per-instance beat phase, a per-instance morph
// layer and neck sheen, steered by simple boids (separation, alignment,
// cohesion to a seeded slot around the leader). The rest of the flock is a
// number on the HUD.
//
// The roster comes from the gangs that joined (Swells light, Choir motley,
// Racers ash-red/grizzle, Meer Mob dark) and the strays. Dove (pure white) is
// always drawn when the Swells are in; no blue-bar bird ever sits in the 8
// slots nearest Gus, so he (and his orange scarf) reads as the leader.
//
// Coo: a tap bursts the flock out and lets it regather; a hold sends it to
// swarm a point ahead of Gus.

import * as THREE from 'three';
import { addWingPhaseAttribute } from '../anim/wingbeat.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { GANG_MIX, PIGEON_LAYERS, DOVE_LAYER, BLUE_BAR } from '../data/looks.js';
import { rngFor } from '../core/rng.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Desaturate the texture and multiply by the per-instance colour (stand-in morphs). */
export function patchInstanceTint(material, desaturate = 0.85) {
  return addShaderPatch(material, {
    key: 'insttint',
    uniforms: { uDesat: { value: desaturate } },
    fragmentHeader: 'uniform float uDesat;',
    fragmentAfterMap: `
      float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum), uDesat);`,
  });
}

export const VISIBLE_MAX = 24;
const SHEENS = [[0.6, 1.2, 1.15], [1.0, 1.25, 0.8], [1.25, 0.95, 0.9], [1, 1, 1]];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _steer = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _target = new THREE.Vector3();

export class Flock {
  constructor({ geometry, material, wingbeat, count = VISIBLE_MAX, seed = 1, scale = 1, pitch = 0, bodyCenter = new THREE.Vector3(), morph = false } = {}) {
    const rand = mulberry32(seed);
    this.time = 0;
    this.centerOffset = new THREE.Matrix4().makeTranslation(-bodyCenter.x, -bodyCenter.y, -bodyCenter.z);
    this.capacity = count;
    this.count = 0;
    this.scale = scale;
    this.pitch = pitch;
    this.wingbeat = wingbeat;
    const geo = geometry.clone();
    addWingPhaseAttribute(geo, count, rand);
    if (morph) {
      geo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
      geo.setAttribute('aSheen', new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3));
    }
    this.mesh = new THREE.InstancedMesh(geo, material, count);
    this.mesh.name = 'flock';
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false; // the flock surrounds the camera's subject
    this.mesh.count = 0;
    this.birds = [];
    for (let i = 0; i < count; i++) {
      // A loose cloud of slots beside, above and ahead of the leader (leader frame: x left, y up,
      // z forward), never in the lane between him and a camera behind him.
      const side = i % 2 ? 1 : -1;
      const slot = new THREE.Vector3(side * (0.7 + rand() * 2.8), (rand() - 0.35) * 1.8, -1.2 + rand() * 4.2);
      if (Math.abs(slot.x) < 1.2 && slot.z < 0.3) slot.z = 0.3 + rand();
      this.birds.push({
        pos: new THREE.Vector3(slot.x, 3 + slot.y, slot.z), vel: new THREE.Vector3(0, 0, 4), slot,
        orbit: { r: 1.6 + rand() * 1.6, h: 1.6 + rand() * 1.4, phase: rand() * Math.PI * 2, dir: rand() < 0.5 ? -1 : 1 },
        bank: 0, yaw: 0, speedJitter: 0.9 + rand() * 0.2, swarmOff: new THREE.Vector3((rand() - 0.5) * 2.4, rand() * 1.6, (rand() - 0.5) * 2.4),
      });
      this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }
    this.mesh.instanceColor.needsUpdate = true;
    // slot order by distance from the leader: the first 8 are "nearest Gus"
    this.slotOrder = this.birds.map((b, i) => [b.slot.length(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    this.burstT = 0;
    this.swarm = null;    // { point, t }
    this.roster = [];
  }

  /**
   * Set who flies: flockFrom = { swells: 6, choir: 12, …, 'stray:<id>': 1 }.
   * Visible birds = min(24, total), mixed by gang, Dove always in, no blue bar in the 8 nearest slots.
   */
  setRoster(flockFrom) {
    const total = Object.values(flockFrom).reduce((a, b) => a + b, 0);
    const n = Math.min(this.capacity, total);
    const rnd = rngFor('flock-roster:' + total);
    const members = [];
    const hasDove = (flockFrom.swells || 0) > 0;
    // proportional picks per gang
    const pools = [];
    for (const [k, v] of Object.entries(flockFrom)) {
      const gang = k.startsWith('stray') ? 'strays' : k;
      for (let i = 0; i < v; i++) pools.push(gang);
    }
    // a seeded shuffle, then take n
    for (let i = pools.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pools[i], pools[j]] = [pools[j], pools[i]]; }
    const chosen = pools.slice(0, n);
    for (const gang of chosen) members.push({ gang, layer: pickLayer(GANG_MIX[gang] || GANG_MIX.strays, rnd), sheen: SHEENS[Math.floor(rnd() * SHEENS.length)] });
    if (hasDove) {
      const di = members.findIndex((m) => m.gang === 'swells');
      if (di >= 0) members[di] = { gang: 'swells', layer: DOVE_LAYER, sheen: SHEENS[3], dove: true };
    }
    // seat them: the 8 slots nearest Gus get no blue bar
    const seats = new Array(n);
    const order = this.slotOrder.filter((i) => i < this.capacity);
    const near = order.slice(0, Math.min(8, n));
    const blue = members.filter((m) => m.layer === BLUE_BAR);
    const other = members.filter((m) => m.layer !== BLUE_BAR);
    const seatList = order.filter((i) => i < this.capacity).slice(0, n);
    for (const slotIdx of seatList) {
      const isNear = near.includes(slotIdx);
      let m = isNear ? other.shift() : (blue.shift() || other.shift());
      if (!m) m = other.shift() || blue.shift();
      if (isNear && m && m.layer === BLUE_BAR) m = { ...m, layer: PIGEON_LAYERS['blue-checker'] };   // never blue bar up front
      seats[slotIdx] = m;
    }
    // compact: the InstancedMesh draws instances 0..n-1, so remap slots onto them
    this.active = seatList;
    this.roster = seatList.map((s) => seats[s]);
    this.count = n;
    this.mesh.count = n;
    const L = this.mesh.geometry.attributes.aLayer, S = this.mesh.geometry.attributes.aSheen;
    this.roster.forEach((m, i) => {
      if (L) L.array[i] = m.layer;
      if (S) S.array.set(m.sheen, i * 3);
    });
    if (L) L.needsUpdate = true;
    if (S) S.needsUpdate = true;
    this.total = total;
  }

  /** Put every bird at its slot around the leader right now (after a teleport). */
  place(leader) {
    for (const b of this.birds) {
      this.#slotWorld(b, leader, b.pos);
      b.vel.set(Math.sin(leader.yaw), 0, Math.cos(leader.yaw)).multiplyScalar(Math.max(4, leader.velocity.length()));
    }
  }

  coo() { this.burstT = 0.7; }
  swarmAt(point, secs = 2.5) { this.swarm = { point: point.clone ? point.clone() : new THREE.Vector3(point.x, point.y, point.z), t: secs }; }

  #slotWorld(b, leader, out) {
    if (this.swarm) return out.copy(this.swarm.point).add(b.swarmOff);
    if (leader.grounded) {
      const o = b.orbit;
      const a = o.phase + o.dir * this.time * 0.45;
      const k = this.burstT > 0 ? 2.6 : 1;
      return out.set(Math.cos(a) * o.r * k, o.h * (this.burstT > 0 ? 1.8 : 1), Math.sin(a) * o.r * k).add(leader.position);
    }
    const c = Math.cos(leader.yaw), s = Math.sin(leader.yaw);
    const k = this.burstT > 0 ? 2.4 : 1;
    return out.set((b.slot.x * c + b.slot.z * s) * k, b.slot.y * k, (-b.slot.x * s + b.slot.z * c) * k).add(leader.position);
  }

  /** leader: {position, velocity, yaw, grounded}; avoid: optional point to keep clear of (the camera). */
  update(dt, leader, avoid = null) {
    if (this.burstT > 0) this.burstT -= dt;
    if (this.swarm) { this.swarm.t -= dt; if (this.swarm.t <= 0) this.swarm = null; }
    const act = this.active || [];
    const birds = act.map((i) => this.birds[i]);
    const leaderSpeed = leader.velocity.length();
    const minSpeed = 2.5;
    const maxSpeed = Math.max(this.swarm || this.burstT > 0 ? 8 : 5, leaderSpeed * 1.6);
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      this.#slotWorld(b, leader, _target);
      _tmp.subVectors(_target, b.pos);
      _steer.copy(_tmp).multiplyScalar(this.swarm ? 2.2 : 1.2).clampLength(0, this.swarm ? 7 : 4);
      if (this.swarm) {
        const a = this.time * 3 + i;
        _steer.x += Math.cos(a) * 2; _steer.z += Math.sin(a) * 2;
      } else if (leader.grounded) {
        const o = b.orbit;
        const a = o.phase + o.dir * this.time * 0.45;
        _steer.x += -Math.sin(a) * o.dir * o.r * 0.45 * 2.2;
        _steer.z += Math.cos(a) * o.dir * o.r * 0.45 * 2.2;
      } else {
        _steer.add(leader.velocity);
      }
      let nAlign = 0;
      _p.set(0, 0, 0);
      for (let j = 0; j < birds.length; j++) {
        if (j === i) continue;
        const o = birds[j];
        _tmp.subVectors(b.pos, o.pos);
        const d2 = _tmp.lengthSq();
        if (d2 < 0.5) _steer.addScaledVector(_tmp, 0.8 / Math.max(d2, 0.03));
        if (d2 < 3) { _p.add(o.vel); nAlign++; }
      }
      if (nAlign) _steer.lerp(_p.divideScalar(nAlign), 0.15);
      for (const [pt, r] of [[leader.position, 0.8], [avoid, 1.2]]) {
        if (!pt) continue;
        _tmp.subVectors(b.pos, pt);
        const d = _tmp.length();
        if (d < r) _steer.addScaledVector(_tmp, ((r - d) * 8) / Math.max(d, 0.05));
      }
      if (b.pos.y < 0.8) _steer.y += (0.8 - b.pos.y) * 6;
      b.vel.lerp(_steer, Math.min(1, dt * 2.5 * b.speedJitter));
      const sp = b.vel.length();
      if (sp < minSpeed) b.vel.multiplyScalar(minSpeed / Math.max(sp, 1e-3));
      else if (sp > maxSpeed) b.vel.multiplyScalar(maxSpeed / sp);
      b.pos.addScaledVector(b.vel, dt);
      const prevYaw = b.yaw;
      const horiz = Math.hypot(b.vel.x, b.vel.z);
      b.yaw = Math.atan2(b.vel.x, b.vel.z);
      const dy = Math.atan2(Math.sin(b.yaw - prevYaw), Math.cos(b.yaw - prevYaw));
      b.bank = THREE.MathUtils.lerp(b.bank, THREE.MathUtils.clamp(-dy / dt * 0.35, -0.9, 0.9), Math.min(1, dt * 4));
      const climb = Math.atan2(b.vel.y, horiz);
      _e.set(this.pitch - climb * 0.6, b.yaw, b.bank);
      _q.setFromEuler(_e);
      _s.setScalar(this.scale);
      _m.compose(b.pos, _q, _s).multiply(this.centerOffset);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.time += dt;
    if (this.wingbeat) this.wingbeat.advance(dt, this.swarm ? 7 : leader.grounded ? 4.5 : 5);
  }

  /** The birds as drawn (debug): index → { layer, gang, dove, nearSlot }. */
  describe() {
    const near = new Set(this.slotOrder.slice(0, 8));
    return this.roster.map((m, i) => ({ gang: m.gang, layer: m.layer, dove: !!m.dove, near: near.has(this.active[i]) }));
  }
}

function pickLayer(mix, rnd) {
  const entries = Object.entries(mix);
  const tot = entries.reduce((p, [, w]) => p + w, 0);
  let r = rnd() * tot;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return PIGEON_LAYERS[k]; }
  return 0;
}
