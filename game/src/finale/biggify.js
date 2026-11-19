// BIGGIFY (≈ 11 s): inside the Workshop the raccoons throw the big lever; the
// battery hums, the vent blazes, a flash and a burst of feathers; then out in
// the Ramble the ground heaves and the same assembly, now 18 m tall, bursts up
// out of the sealed cave in a spray of schist and dust, spreads its sails and
// turns east, towards Fifth Avenue.
import * as THREE from 'three';
import { GIANT, Debris, hash, ease, clamp01 } from './finale.js';

const CAVE = { x: -26.4, z: 381.0 };

export class Biggify {
  constructor(F) { this.F = F; this.G = F.G; }

  async build() {
    const G = this.G, W = G.workshop;
    // the Night Crew at the lever: Rigby and two of his raccoons (the real model, counter-mirrored)
    const b = await G.registry.baked('raccoon-stand');
    this.crew = [];
    if (b) {
      const mat = b.makeMaterial();
      for (const [x, z, yaw, s] of [[3.0, 1.2, 2.4, 1.05], [4.2, 1.35, -2.6, 0.95], [3.65, 0.05, Math.PI, 0.9]]) {
        const g = new THREE.Group(); g.position.set(x, 0.1, z); g.rotation.y = yaw;
        const inner = new THREE.Group(); inner.scale.set(-s, s, s); g.add(inner);
        const m = new THREE.Mesh(b.geometry, mat); m.castShadow = true; inner.add(m);
        g.visible = false; W.root.add(g);
        this.crew.push(g);
      }
    }
    // chunks of schist thrown out when the Mecha bursts up
    const rock = new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.9 });
    this.rocks = new Debris(new THREE.DodecahedronGeometry(0.7, 0), rock, 90, { ground: (x, z) => G.terrain.heightAt(x, z) + 0.3, life: 9, spin: 5 });
    this.F.group.add(this.rocks.mesh);
  }

  start() {
    const F = this.F, G = this.G, W = G.workshop, m = F.mecha;
    this.t = 0; this.phase = 0; this.ev = {};
    // the Workshop: every part on, Gus up on the head
    W.offStage = true;
    W.scaffold.add(m.root);
    m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0);
    F.setScale(1);
    m.setParts(['body', 'talons', 'legs', 'wings', 'eyes', 'beak', 'voice', 'power']);
    m.pose('stand', 0);
    if (F.gusMesh) F.gusMesh.visible = true;
    for (const c of this.crew) c.visible = true;
    W.leverArm.rotation.x = -0.6;
    this.lever();
  }

  /** Workshop shots, in game coordinates (the room's root is in the mirrored world). */
  #room(x, y, z) { const R = this.G.workshop.room; return [R.x + x, R.y + y, R.z + z]; }
  lever() { this.F.cam(this.#room(1.4, 1.9, 4.2), this.#room(3.7, 1.0, 0.6), 55); }

  update(dt) {
    const F = this.F, G = this.G, W = G.workshop, m = F.mecha;
    const t = (this.t += dt);
    const once = (k, fn) => { if (!this.ev[k]) { this.ev[k] = true; fn(); } };
    if (t < 4.0) {
      // ---- inside: the lever
      m.pose('stand', t * (1 + t * 2));
      m.ventGlow(t * (1 + t), 1 + clamp01((t - 1.6) / 2) * 2.5);
      once('say', () => { G.bubbles.add('Rigby: "One lever. Union rules: NOBODY else touches it."', { at: this.#bub(3.0, 1.0), ttl: 1.8 }); G.audio.play('raccoon-chitter', { vol: 0.8 }); });
      if (t < 1.6) this.lever();
      const k = ease(clamp01((t - 1.0) / 0.45));
      W.leverArm.rotation.x = -0.6 + k * 1.35;
      for (const [i, c] of this.crew.entries()) c.position.y = 0.1 + (t > 1.45 ? Math.abs(Math.sin((t + i) * 9)) * 0.12 : 0);
      once('clunk', () => G.later(1.4, () => { G.audio.play('hubcap-clang', { vol: 0.8, rate: 0.7 }); G.audio.play('mecha-servo', { vol: 0.9 }); G.bubbles.add('BIGGIFY!', { at: this.#bub(3.6, 1.6), ttl: 1.6 }); }));
      if (t >= 1.6) {
        // on the Mecha: it hums and shakes, the vent blazes
        const p = clamp01((t - 1.6) / 2.4);
        F.cam(this.#room(-2.6 + p * 0.8, 1.6 + p * 0.5, 4.6 - p * 0.8), this.#room(0, 2.0, -1.2), 55 + p * 6);
        m.root.position.set((hash(Math.floor(t * 30), 1) - 0.5) * 0.04 * p, 0, (hash(Math.floor(t * 30), 2) - 0.5) * 0.04 * p);
        G.shake(0.03 * p, 0.2);
        if (Math.floor(t * 8) !== this.sparkT) { this.sparkT = Math.floor(t * 8); const w = F.wpos(m.J.body); G.particles.burst('sparkle', w.x + (hash(this.sparkT, 3) - 0.5) * 2, w.y + hash(this.sparkT, 4) * 1.6, w.z, 10, { spread: 0.6, color: [0.6, 1, 1] }); }
      }
      if (t > 3.75) once('flash', () => {
        F.flash(0.2);
        G.audio.play('spark-plug-pop', { vol: 1 }); G.audio.play('whoosh', { vol: 1, rate: 0.6 });
        const w = F.wpos(m.J.body);
        G.particles.burst('feathers', w.x, w.y + 0.5, w.z, 80, { color: [0.62, 0.66, 0.74] });
        G.particles.burst('feathers', w.x, w.y + 0.5, w.z, 40, { color: [0.95, 0.95, 0.96] });
      });
      return false;
    }
    // ---- outside: the Ramble heaves and the 18 m Mecha bursts up out of the cave
    once('out', () => {
      for (const c of this.crew) c.visible = false;
      W.leverArm.rotation.x = -0.6;
      F.takeMecha();
      F.setScale(GIANT);
      this.gy = G.terrain.heightAt(CAVE.x, CAVE.z);
      m.root.position.set(CAVE.x, this.gy - 19, CAVE.z);
      m.root.rotation.set(0, Math.PI, 0);   // out of the cave's mouth, facing south (and the camera)
      G.audio.play('mecha-step-boom', { vol: 1, rate: 0.7 });
      G.audio.play('subway-rumble', { vol: 1 });
      G.shake(0.5, 1.2);
    });
    const u = t - 4.0;
    const rise = ease(clamp01((u - 0.6) / 2.2));
    m.root.position.y = this.gy - 19 * (1 - rise) + 2.6 * rise;   // it climbs up onto the cave's rock
    m.pose('shout', clamp01((u - 2.4) / 1.2) * 0.85);
    m.ventGlow(t, 2);
    if (u > 0.6 && u < 3.0) {
      // rock and dust spray out of the hillside while it rises
      const n = Math.floor(u * 30);
      if (n !== this.rockN) {
        this.rockN = n;
        for (let i = 0; i < 2; i++) {
          const a = hash(n, i * 2) * Math.PI * 2, r = 2 + hash(n, i * 2 + 1) * 4, sp = 6 + hash(n, 9 + i) * 10;
          this.rocks.spawn(CAVE.x + Math.cos(a) * r, this.gy + 1, CAVE.z + Math.sin(a) * r, Math.cos(a) * sp * 0.6, 8 + hash(n, 12 + i) * 10, Math.sin(a) * sp * 0.6, 0.6 + hash(n, 20 + i) * 1.6, n * 7 + i);
        }
        G.particles.burst('dust', CAVE.x + (hash(n, 5) - 0.5) * 10, this.gy + 0.5, CAVE.z + (hash(n, 6) - 0.5) * 10, 10, { spread: 6, color: [0.62, 0.56, 0.48] });
        G.shake(0.35, 0.3);
      }
    }
    once('land', () => G.later(3.0, () => { G.audio.play('mecha-step-boom', { vol: 1 }); G.audio.play('mecha-servo', { vol: 0.8, rate: 0.9 }); G.shake(0.6, 0.5); G.sfStamp?.('BIGGIFY!', 1.6); }));
    this.rocks.update(dt);
    // the camera: low in the Ramble, looking up at the cave, rising with it
    // the camera: over the Ramble's canopy, looking at the cave, rising with it
    // (high over the canopy: the Ramble's trees are as tall as the Mecha's shoulders)
    const cx = CAVE.x + 18 - u * 1.0, cz = CAVE.z - 30 + u * 0.6;
    const cy = this.gy + 22 + rise * 2;
    F.cam([cx, cy, cz], [CAVE.x, this.gy + 11 + rise * 4, CAVE.z], 62);
    // at the end it turns east, towards Fifth Avenue
    if (u > 5.0) { const k = ease(clamp01((u - 5.0) / 1.6)); m.root.rotation.y = Math.PI - k * Math.PI * 0.5; }
    return u > 7.0;
  }

  #bub(x, y) { const R = this.G.workshop.room; return { x: R.x + x, y: R.y + y + 0.4, z: R.z + 0.6 }; }

  end() { this.rocks.clear(); }
  cleanup() { this.rocks.clear(); for (const c of this.crew) c.visible = false; this.G.workshop.leverArm.rotation.x = -0.6; }
  debug() { return { t: +(this.t || 0).toFixed(2) }; }
}
