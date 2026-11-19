// The Stomp (≈ 55 s): on rails down Fifth Avenue, from 79th Street to Grand
// Army Plaza. Steer between 3 lanes (the stick, or A/D, ←/→) and Flap to
// high-step over the yellow cabs; a cab you walk into just spins away honking
// and the Mecha stumbles (it can't go wrong). Walk and step poses on the
// pivots, a boom and a camera shake at every footfall, dust where the feet land.
// Every crew turns out along the route (the design's "In the finale, every
// member of every crew turns out"): squirrels on the lampposts and the wall,
// rats on the kerbs, cats in every doorway, songbirds and crows on the ledges,
// dogs, raccoons, geese, ducks and turtles on the park side, the carriage horses
// rearing at the Plaza, and the whole flock swirling overhead. Bread flies.
import * as THREE from 'three';
import { Z } from '../world/layout.js';
import { Debris, BigFlock, hash, ease, clamp01, loafGeometry, loafMaterial } from './finale.js';

const Z0 = Z(79) + 6, Z1 = 10;                 // start (Fifth & 79th) → end (Grand Army Plaza)
const LANES = [123.6, 120.0, 116.4];           // screen left → right, facing south (east → west)
const SPEED = 7.4, STRIDE = 5.2;              // m/s; metres per step
const CABS = 14;
const TURNOUT = { high: 1, medium: 0.6, low: 0.2 };   // perf pass: the share of the turnout and the big flock drawn per preset

// the turnout: model, scale, where (park side 'P' / building side 'B' / lamp tops 'L' / ledges 'E' / the Plaza 'Z'), cheer hop height
const SPECIES = [
  { id: 'squirrel-lod', s: 1.6, where: 'L', hop: 0.25 }, { id: 'squirrel-lod', s: 1.5, where: 'W', hop: 0.3 },
  { id: 'rat-lod', s: 1.6, where: 'K', hop: 0.25 }, { id: 'cat', s: 1.25, where: 'D', hop: 0.3 }, { id: 'cat-sit', s: 2.2, where: 'D', hop: 0.12 },
  { id: 'pigeon-plain-lod', s: 1.4, where: 'PB', hop: 0.35 }, { id: 'crow-lod', s: 1.3, where: 'WE', hop: 0.3 }, { id: 'songbird', s: 2.4, where: 'E', hop: 0.2 },
  { id: 'dog-lod', s: 0.7, where: 'P', hop: 0.35 }, { id: 'raccoon-scurry-lod', s: 1.1, where: 'W', hop: 0.25 }, { id: 'goose-lod', s: 1.15, where: 'PZ', hop: 0.3 },
  { id: 'duck-lod', s: 1.3, where: 'PZ', hop: 0.25 }, { id: 'turtle-lod', s: 1.5, where: 'W', hop: 0.1 }, { id: 'horse', s: 1.0, where: 'H', hop: 0 },
];

export class Stomp {
  constructor(F) { this.F = F; this.G = F.G; }

  async build() {
    const G = this.G, F = this.F;
    // everything model-shaped lives under a counter-mirrored group: local x = −(game x), yaw = −(game yaw)
    const cm = this.cm = new THREE.Group(); cm.scale.x = -1; cm.name = 'stomp (counter-mirrored)'; cm.visible = false;
    F.group.add(cm);
    const taxi = await G.registry.baked('taxi');
    this.cabMesh = new THREE.InstancedMesh(taxi ? taxi.geometry : new THREE.BoxGeometry(1.9, 1.5, 4.5).translate(0, 0.75, 0), taxi ? taxi.makeMaterial() : new THREE.MeshStandardMaterial({ color: 0xf2c230 }), CABS);
    this.cabMesh.frustumCulled = false; this.cabMesh.castShadow = G.preset?.id === 'high';   // perf pass: 14 cabs are ~55k shadow triangles
    cm.add(this.cabMesh);
    // the cabs: in lanes, idling, facing north (towards the Mecha)
    this.cabs = [];
    let lastLane = 1;
    for (let i = 0; i < CABS; i++) {
      const z = Z0 - 38 - i * 25 - hash(i, 1) * 6;
      let lane = Math.floor(hash(i, 2) * 3);
      if (i < 2) lane = 1;                       // the first two sit right in front of you (learn to steer / to step)
      if (lane === lastLane && hash(i, 3) < 0.5) lane = (lane + 1) % 3;
      lastLane = lane;
      this.cabs.push({ lane, x: LANES[lane], z, y: 0, yaw: 0, roll: 0, state: 'idle', t: 0, dir: 1 });
    }
    // the turnout (perf pass: Medium and Low draw a share of it: see TURNOUT)
    const share = TURNOUT[G.preset?.id] ?? 1;
    this.kinds = [];
    const geo = {};
    for (const sp of SPECIES) {
      if (!geo[sp.id]) { const b = await G.registry.baked(sp.id); geo[sp.id] = b ? { geometry: b.geometry, material: b.makeMaterial() } : null; }
      if (!geo[sp.id]) continue;
      const max = Math.ceil((sp.where === 'H' ? 8 : sp.id.startsWith('cat') ? 10 : sp.id === 'songbird' ? 24 : 60) * share);
      const mesh = new THREE.InstancedMesh(geo[sp.id].geometry, geo[sp.id].material, max);
      mesh.frustumCulled = false; mesh.count = 0;
      cm.add(mesh);
      this.kinds.push({ ...sp, mesh, max, spots: [] });
    }
    const byWhere = (w) => this.kinds.filter((k) => k.where.includes(w));
    const add = (list, i, spot) => { if (!list.length) return; const k = list[Math.floor(hash(i, 40) * list.length) % list.length]; k.spots.push({ ...spot, ph: hash(i, 41) * 6.28 }); };
    let i = 0;
    for (let z = Z0 + 30; z > -6; z -= 2.6, i++) {
      add(byWhere('P'), i, { x: 111.2 + hash(i, 1) * 2.2, z: z + hash(i, 2), y: 0.15, yaw: Math.PI / 2 + (hash(i, 3) - 0.5) * 0.8 });                // park sidewalk
      if (i % 2 === 0) add(byWhere('W'), i + 500, { x: 110.0, z: z + 1.3, y: 0.95, yaw: Math.PI / 2 + (hash(i, 4) - 0.5) * 0.6 });                  // on the wall
      add(byWhere('B').concat(byWhere('K')), i + 1000, { x: 126.8 + hash(i, 5) * 1.6, z: z + hash(i, 6), y: 0.15, yaw: -Math.PI / 2 + (hash(i, 7) - 0.5) * 0.8 });   // kerb, building side
      if (i % 3 === 0) add(byWhere('D'), i + 1500, { x: 130.25, z: z + 0.6, y: 0.15, yaw: -Math.PI / 2 });                                            // doorways
      if (i % 2 === 1) add(byWhere('E'), i + 2000, { x: 130.5, z: z + hash(i, 8), y: 4.2 + Math.floor(hash(i, 9) * 4) * 3.4, yaw: -Math.PI / 2 });   // ledges
    }
    for (const l of G.propsData.lamps) if (l.x > 112 && l.x < 115 && l.z > -6 && l.z < Z0 + 30) for (const k of byWhere('L')) k.spots.push({ x: l.x, z: l.z, y: (l.y ?? 0.15) + 4.05, yaw: Math.PI / 2, ph: l.z });
    // the Plaza at the end: horses rearing by the carriage line, geese and ducks round the fountain
    for (const k of byWhere('H')) for (let j = 0; j < 6; j++) k.spots.push({ x: 101 - j * 3.2, z: 2.5 + (j % 2) * 3.5, y: 0.15, yaw: Math.PI / 2 + 0.3, ph: j, rear: true });
    for (const k of byWhere('Z')) for (let j = 0; j < 12; j++) k.spots.push({ x: 104 + hash(j, 50) * 8, z: -4 + hash(j, 51) * 14, y: 0.15, yaw: hash(j, 52) * 6.28, ph: j });
    for (const k of this.kinds) for (const s of k.spots) s.y = Math.max(s.y, G.terrain.heightAt(s.x, s.z) + (s.y < 0.5 ? 0.02 : 0));
    if (share < 1) for (const k of this.kinds) k.spots = k.spots.filter((sp, j) => hash(j, 77) < share);   // perf pass: a seeded share of the spots
    // bread tossed into the avenue
    const bread = loafGeometry().scale(0.45, 0.45, 0.45);   // Fixes-3 (R9): loaves
    this.bread = new Debris(bread, loafMaterial(), 160, { ground: () => 0.2, life: 5, spin: 8 });
    F.group.add(this.bread.mesh);
    this.flock = new BigFlock(G, Math.round(56 * share), 5);
    this.flock.mesh.visible = false;
    F.group.add(this.flock.mesh);
  }

  start() {
    const F = this.F, G = this.G, m = F.mecha;
    this.t = 0; this.z = Z0; this.x = LANES[1]; this.lane = 1; this.v = SPEED; this.phase = 0; this.hopT = 0; this.stumble = 0;
    this.steerHeld = 0; this.dodged = 0; this.bumped = 0; this.lastFoot = 0; this.ev = {};
    if (m.root.parent !== F.group) F.takeMecha();
    F.setScale(18 / 3.5);
    if (F.gusMesh) F.gusMesh.visible = true;
    this.cm.visible = true;
    this.flock.mesh.visible = true;
    for (const c of this.cabs) { c.state = 'idle'; c.x = LANES[c.lane]; c.y = 0; c.yaw = 0; c.roll = 0; c.t = 0; }
    // the real flock follows a point above the Mecha's head
    this.leaderPos = new THREE.Vector3();
    G.leader = () => ({ position: this.leaderPos, velocity: new THREE.Vector3(0, 0, -this.v), yaw: Math.PI, grounded: false });
    G.flock.place(G.leader());
    this.#place();
    this.lighten(true);
    F.caption('Fifth Avenue. Every crew in the park came out.', 3.5);
  }

  #place() {
    const m = this.F.mecha;
    const gy = this.G.terrain.heightAt(this.x, this.z);
    m.root.position.set(this.x, gy, this.z);
    m.root.rotation.set(0, Math.PI, 0);   // facing south
  }

  update(dt) {
    const F = this.F, G = this.G, m = F.mecha, inp = G.input;
    const t = (this.t += dt);
    // ---- steering: a lane at a time (hold to keep moving over)
    const sx = inp.move().x;
    if (Math.abs(sx) > 0.5) {
      if (this.steerHeld <= 0) { this.lane = Math.max(0, Math.min(2, this.lane + Math.sign(sx))); this.steerHeld = 0.45; G.audio.play('mecha-servo', { vol: 0.35, rate: 1.3 }); }
      else this.steerHeld -= dt;
    } else this.steerHeld = 0;
    this.x += (LANES[this.lane] - this.x) * Math.min(1, dt * 4.5);
    // ---- the high step
    if (inp.pressed('flap') && this.hopT <= 0.2) { this.hopT = 1.1; G.audio.play('mecha-servo', { vol: 0.6, rate: 0.85 }); }
    this.hopT = Math.max(0, this.hopT - dt);
    // ---- walking
    this.stumble = Math.max(0, this.stumble - dt);
    const target = SPEED * (this.stumble > 0 ? 0.55 : 1) * clamp01(t / 1.2 + 0.15);
    this.v += (target - this.v) * Math.min(1, dt * 3);
    this.z -= this.v * dt;
    const prevPhase = this.phase;
    this.phase += (this.v * dt) / (STRIDE * 2);
    const hop = Math.sin(clamp01(this.hopT / 1.1) * Math.PI);
    m.pose('walk', this.phase, { stride: 1 + hop * 0.7, flap: hop });
    m.J.body.position.y += hop * 0.35;
    if (this.stumble > 0) m.J.body.rotation.z += Math.sin(this.stumble * 18) * 0.08;
    this.#place();
    m.root.rotation.y = Math.PI + (LANES[this.lane] - this.x) * 0.05;
    // (hidden) Gus rides along, so the shadow box, streaming and the crowds follow the Mecha
    G.gus.root.position.set(this.x, m.root.position.y, this.z - 8);
    m.ventGlow(t, 1.5);
    // footfalls: a boom, a shake, dust
    const foot = Math.floor(prevPhase * 2 + 0.5) !== Math.floor(this.phase * 2 + 0.5);
    if (foot) {
      const side = Math.floor(this.phase * 2 + 0.5) % 2 ? 1 : -1;
      G.audio.play('mecha-step-boom', { vol: 0.75, rate: 0.95 + hash(Math.floor(this.phase * 2), 1) * 0.1 });
      G.shake(0.22, 0.28);
      G.rumble?.(0.5, 0.3, 120);
      G.particles.burst('dust', this.x + side * 2.1, 0.4, this.z - 1.5, 14, { spread: 2.5, color: [0.72, 0.68, 0.62] });
    }
    // ---- cabs
    let nextCab = null;
    for (const c of this.cabs) {
      if (c.state === 'idle') {
        const ahead = this.z - c.z;
        if (ahead > 0 && ahead < 34 && Math.abs(c.x - this.x) < 2.6 && (!nextCab || ahead < this.z - nextCab.z)) nextCab = c;
        if (ahead <= 1.5 && ahead > -3 && Math.abs(c.x - this.x) < 2.4) {
          if (this.hopT > 0) { c.state = 'over'; this.dodged++; G.audio.play('cab-horn', { vol: 0.7, rate: 1.1, at: { x: c.x, y: 1, z: c.z } }); G.bubbles.add('HONK!', { at: { x: c.x, y: 3, z: c.z }, ttl: 1 }); }
          else { c.state = 'kicked'; c.t = 0; c.dir = c.x > this.x ? 1 : c.x < this.x ? -1 : (hash(c.z, 3) < 0.5 ? -1 : 1); this.bumped++; this.stumble = 0.9; G.audio.play('cab-horn', { vol: 1, rate: 0.9 }); G.audio.play('knock-clatter', { vol: 0.8 }); G.shake(0.35, 0.4); G.bubbles.add('HONK! HONK!', { at: { x: c.x, y: 3, z: c.z }, ttl: 1.2 }); }
        } else if (ahead < -3 && Math.abs(c.x - this.x) >= 2.4) c.state = 'passed';
      } else if (c.state === 'kicked') {
        c.t += dt;
        const k = clamp01(c.t / 0.8);
        c.x = LANES[c.lane] + c.dir * ease(k) * 5.5; c.z -= dt * 4 * (1 - k); c.yaw += dt * 9 * (1 - k) * c.dir; c.y = Math.sin(k * Math.PI) * 1.4;
        if (k >= 1) c.state = 'parked';
      }
    }
    // ---- prompts
    // Fixes-3 (R9): the "step over" prompt stays up (pulsing when a cab is close), so it's known before the first cab
    if (nextCab && this.hopT <= 0) F.prompt('flap', this.dodged ? 'Step over the cab!' : 'Step over the cab! (or steer round it)');
    else if (t < 4) F.prompt('move', 'Steer between the lanes');
    else F.prompt('flap', 'Step over cabs', { pulse: false });
    // ---- cabs and the turnout, drawn
    this.#drawCabs();
    this.#drawTurnout(t);
    // ---- bread from the sidewalks, the flock overhead
    if (Math.floor(t * 9) !== this.breadN) {
      this.breadN = Math.floor(t * 9);
      const n = this.breadN, side = n % 2 ? 1 : -1;
      const bx = side > 0 ? 128 : 112, bz = this.z - 6 - hash(n, 1) * 30;
      this.bread.spawn(bx, 1.5, bz, -side * (3 + hash(n, 2) * 4), 5 + hash(n, 3) * 3, (hash(n, 4) - 0.5) * 2, 1, n);
    }
    this.bread.update(dt);
    const head = F.wpos(m.seat);
    this.leaderPos.set(head.x, head.y + 3, head.z - 4);
    this.flock.center.set(this.x, head.y + 8, this.z - 4); this.flock.radius = 16; this.flock.height = 12;
    this.flock.update(dt);
    if (Math.floor(t / 2.2) !== this.cooN) { this.cooN = Math.floor(t / 2.2); G.audio.play(this.cooN % 3 ? 'gang-coo-murmur' : 'crowd-cheer', { vol: 0.5 }); }
    // ---- the camera
    const gy = m.root.position.y;
    if (t < 3.6) {
      const k = ease(t / 3.6);
      F.cam([124 - k * 2, gy + 1.6 + k * 3, this.z - 46 + k * 10], [this.x, gy + 10 + k * 2, this.z], 62);
    } else if (this.z > 70) {
      const k = ease(clamp01((t - 3.6) / 2.4));
      // Fixes-3 (R9): centred on the avenue (it swayed 5 m and hugged the east-side buildings)
      const behind = [120 + (this.x - 120) * 0.35, gy + 9 + 3 * k, this.z + 24 + 8 * k];
      F.cam(behind, [this.x, gy + 12, this.z - 30], 64);
    } else {
      // the last stretch: round to the front, the Plaza and the horses rearing
      const k = ease(clamp01((70 - this.z) / 45));
      F.cam([this.x - 14 * k + 4 * (1 - k), gy + 22 - 16 * k, this.z + 30 - 72 * k], [this.x, gy + 10, this.z - 20 + 20 * k], 64);
    }
    if (this.z < 70 && !this.ev.plaza) { this.ev.plaza = true; G.audio.play('horse-whinny', { vol: 0.9 }); F.caption('Grand Army Plaza. The carriage horses salute.', 3); }
    if (this.z <= Z1) {
      if (!this.ev.end) { this.ev.end = true; this.endT = t; F.black(true, 'Twenty-five blocks south…'); this.F.prompt(null); }
      return t - this.endT > 1.8;
    }
    return false;
  }

  #drawCabs() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (const [i, c] of this.cabs.entries()) {
      const gy = this.G.terrain.heightAt(c.x, c.z) + 0.05;
      m.compose(p.set(-c.x, gy + c.y, c.z), q.setFromEuler(e.set(0, -c.yaw, c.roll)), s);
      this.cabMesh.setMatrixAt(i, m);
    }
    this.cabMesh.instanceMatrix.needsUpdate = true;
  }

  #drawTurnout(t, range = 0) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const z0 = this.z - (range || 120), z1 = this.z + (range || 25);
    for (const k of this.kinds) {
      let n = 0;
      for (const sp of k.spots) {
        if (sp.z < z0 || sp.z > z1 || n >= k.max) continue;
        const near = range ? true : Math.abs(sp.z - this.z) < 55;
        const cheer = near ? Math.abs(Math.sin(t * 7 + sp.ph)) * k.hop : 0;
        let pitch = 0;
        if (sp.rear) pitch = near ? -0.55 - 0.15 * Math.sin(t * 4 + sp.ph) : 0;
        // they look up at the Mecha as it passes
        const yaw = near ? Math.atan2(this.x - sp.x, this.z - sp.z) : sp.yaw;
        m.compose(p.set(-sp.x, sp.y + cheer, sp.z), q.setFromEuler(e.set(pitch, -yaw, 0, 'YXZ')), s.setScalar(k.s));
        k.mesh.setMatrixAt(n++, m);
      }
      k.mesh.count = n;
      k.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** The credits' party: every crew round the Mecha on the Great Lawn (the same instanced turnout). */
  partyAt(c) {
    this.cm.visible = true;
    this.flock.mesh.visible = true;
    this.party = c;
    for (const k of this.kinds) {
      k.saved = k.saved || k.spots;
      const list = [];
      const n = k.where === 'H' ? 6 : k.id === 'cat' || k.id === 'cat-sit' ? 10 : 22;
      for (let i = 0; i < n; i++) {
        const a = hash(i, k.id.length * 7 + 1) * Math.PI * 2, r = 16 + hash(i, k.id.length * 7 + 2) * 30;
        const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
        list.push({ x, z, y: this.G.terrain.heightAt(x, z) + 0.02, yaw: Math.atan2(c.x - x, c.z - z), ph: i * 1.7, rear: k.where === 'H' });
      }
      k.spots = list;
    }
  }
  partyUpdate(t, dt) {
    const c = this.party;
    this.x = c.x; this.z = c.z;
    this.#drawTurnout(t, 400);
    this.flock.center.set(c.x, c.y + 26, c.z); this.flock.radius = 30; this.flock.height = 14;
    this.flock.update(dt);
    if (Math.floor(t * 6) !== this.breadN) {
      this.breadN = Math.floor(t * 6); const n = this.breadN;
      const a = hash(n, 1) * 6.28, r = 20 + hash(n, 2) * 20;
      this.bread.spawn(c.x + Math.cos(a) * r, c.y + 1.5, c.z + Math.sin(a) * r, -Math.cos(a) * 3, 6 + hash(n, 3) * 3, -Math.sin(a) * 3, 1, n);
    }
    this.bread.update(dt);
  }

  /** Keep the preset's caps on Fifth: fewer full-detail park trees and a nearer far plane while the Mecha walks. */
  lighten(on) {
    const G = this.G, T = G.trees.caps, cam = G.renderCam;
    if (on && !this.saved) { this.saved = { full: T.full, mid: T.mid, lod: T.lod, far: cam.far, chars: G.chars.group.visible }; G.chars.group.visible = false; T.full = Math.min(T.full, 30); T.mid = Math.min(T.mid || 0, 20); T.lod = Math.min(T.lod, 220); cam.far = Math.min(cam.far, 300); cam.updateProjectionMatrix(); }
    if (!on && this.saved) { T.full = this.saved.full; T.mid = this.saved.mid; T.lod = this.saved.lod; cam.far = this.saved.far; cam.updateProjectionMatrix(); G.chars.group.visible = this.saved.chars; this.saved = null; }
  }

  end() { this.F.black(false); this.lighten(false); }
  cleanup() {
    this.lighten(false);
    for (const k of this.kinds) if (k.saved) { k.spots = k.saved; k.saved = null; }
    this.party = null;
    this.cm.visible = false; this.flock.mesh.visible = false; this.bread.clear();
    for (const k of this.kinds) k.mesh.count = 0;
  }
  debug() { return { z: +(this.z ?? 0).toFixed(1), x: +(this.x ?? 0).toFixed(2), lane: this.lane, v: +(this.v ?? 0).toFixed(2), dodged: this.dodged, bumped: this.bumped, hop: +(this.hopT ?? 0).toFixed(2) }; }
}
