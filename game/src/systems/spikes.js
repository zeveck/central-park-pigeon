// Thread 3, Spikes: the Spike Man's sites (P1–P10). A spiked perch can't be
// landed on: Gus bounces off with a "boing" (no damage). Nearby signs pay
// nothing (signs.js asks spikedNear). Strips are knocked off by cats; nets and
// bolts by raccoons or Rhoda (milestone 3 wires the Asks to clear()).
// Prickett spikes P1–P4 when the Prologue ends; more follow other schemes.

import * as THREE from 'three';
import { SPIKE_SITES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

const PER_PERCH = 7;
const _T = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

export class Spikes {
  constructor(G) {
    this.G = G;
    this.sites = SPIKE_SITES.map((s) => ({ ...s, points: [] }));
    this.group = new THREE.Group();
    this.group.name = 'spikes';
  }

  get st() { return this.G.state.spikes; }

  build() {
    const G = this.G;
    const steel = ruleMaterial({ color: 0x9aa0a8, metalness: 0.5, roughness: 0.4 });
    const red = ruleMaterial({ color: 0xc4302b });
    const iron = ruleMaterial({ color: 0x2c3229 });
    let total = 0;
    for (const s of this.sites) {
      const spots = s.perches || [{ x: s.x, z: s.z }];
      for (const p of spots) {
        const top = p.y ?? G.collision.surface(p.x, p.z, 400).y;   // fix-36: a ledge strip names its height
        let y = top;
        if (s.perches && p.y == null && top < 1.5) {
          // the Plaza's lampposts: a simple code post with a cap to perch on
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4, 8).translate(0, 2, 0), iron);
          post.position.set(p.x, top, p.z);
          post.castShadow = true;
          this.group.add(post);
          G.collision.addCylinder({ x: p.x, z: p.z, y0: top, h: 3.98, r: 0.09, tag: 'lamppost', walkable: false });
          y = top + 4.04;
          G.collision.addPerch({ x: p.x, y, z: p.z, r: 0.16, id: 'spikeperch-' + s.id + '-' + s.points.length, kind: 'lamppost' });
        }
        s.points.push({ x: p.x, y, z: p.z });
        total += PER_PERCH;
      }
    }
    // fix-36: a red line of glue along each ledge run while it's spiked (the strips are 1 m every ~5 m; the run between them
    // bounces too, and this says so)
    this.glue = [];
    for (const s of this.sites) for (const [a, b] of s.ledge?.runs || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, b - a), red);
      m.position.set(s.ledge.x + 0.05, s.ledge.y + 0.006, (a + b) / 2);
      m.userData.site = s.id;
      this.glue.push(m); this.group.add(m);
    }
    this.cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.09, 4).translate(0, 0.045, 0), steel, total);
    this.bases = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.015, 0.06).translate(0, 0.008, 0), red, total / PER_PERCH);
    for (const m of [this.cones, this.bases]) { m.frustumCulled = false; m.castShadow = this.G.preset?.id !== 'low'; this.group.add(m); }   // perf pass: no shadows on Low
    this.refresh();
  }

  refresh() {
    const M = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    let ci = 0, bi = 0;
    if (this.knockFor !== this.G.state) { this.knockFor = this.G.state; for (const s of this.sites) s.knocked?.clear(); for (const f of this.falling || []) f.removeFromParent(); this.falling = []; }   // (a load or New Game: no half-knocked ledge, no strip left mid-fall)
    for (const s of this.sites) {
      const on = this.st[s.id] === 'installed';
      if (!on) s.knocked?.clear();
      s.points.forEach((p, pi) => {
        const show = on && !s.knocked?.has(pi);
        if (s.big) {
          // fix-36: a big strip (×3) along the ledge (local x = the run), tipped out over the lip: glued on in a rush
          const base = this.#bigFrame(p);
          for (let k = 0; k < PER_PERCH; k++) {
            const ox = (k - (PER_PERCH - 1) / 2) * 0.045;
            this.cones.setMatrixAt(ci++, show ? M.copy(base).multiply(_T.makeTranslation(ox, 0.012, (k % 2) * 0.02)) : Z);
          }
          this.bases.setMatrixAt(bi++, show ? base : Z);
          return;
        }
        for (let k = 0; k < PER_PERCH; k++) {
          const ox = (k - (PER_PERCH - 1) / 2) * 0.045;
          this.cones.setMatrixAt(ci++, show ? M.makeTranslation(p.x + ox, p.y + 0.012, p.z + (k % 2) * 0.02) : Z);
        }
        this.bases.setMatrixAt(bi++, show ? M.makeTranslation(p.x, p.y, p.z) : Z);
      });
    }
    this.cones.instanceMatrix.needsUpdate = true;
    this.bases.instanceMatrix.needsUpdate = true;
    for (const m of this.glue || []) m.visible = this.st[m.userData.site] === 'installed';
  }

  /** fix-36: a big ledge strip's frame: on the ledge at p, running along it (z), scaled ×4, tipped 0.14 rad out over the lip
   *  (the ledge faces +x, the park). */
  #bigFrame(p, out = new THREE.Matrix4()) {
    _q.setFromEuler(_e.set(0.14, Math.PI / 2, 0, 'YXZ'));   // (review: the pitch leans its top out to +x; a roll see-sawed it)
    return out.compose(_v.set(p.x + 0.15, p.y, p.z), _q, _s.set(4, 4, 4));   // (×4: they read from over the park)
  }

  /** fix-36: a cat bats strip i of a site over the edge: it tumbles down onto the sidewalk with a clatter and lies there a
   *  while. The last one clears the site (the caller does: clues.js). */
  knock(id, i) {
    const G = this.G, s = this.sites.find((q) => q.id === id);
    if (!s || this.st[id] !== 'installed' || (s.knocked ||= new Set()).has(i)) return;
    s.knocked.add(i);
    this.refresh();
    const p = s.points[i];
    const strip = new THREE.Group();
    strip.add(new THREE.Mesh(this.bases.geometry, this.bases.material));
    for (let k = 0; k < PER_PERCH; k++) { const c = new THREE.Mesh(this.cones.geometry, this.cones.material); c.position.set((k - (PER_PERCH - 1) / 2) * 0.045, 0.012, (k % 2) * 0.02); strip.add(c); }
    this.#bigFrame(p).decompose(strip.position, strip.quaternion, strip.scale);
    this.group.add(strip);
    (this.falling ||= []).push(strip);   // (review: cleared on a load, where the tween is dropped mid-fall)
    const q0 = strip.quaternion.clone(), qs = new THREE.Quaternion(), ax = new THREE.Vector3(0, 0, 1);
    G.audio.play('knock-clatter', { at: p, vol: 0.5 });
    const x1 = p.x + 2.2 + (i % 3) * 0.6, z1 = p.z + ((i * 7) % 5 - 2) * 0.3, y1 = G.collision.surface(x1, z1, p.y - 1).y + 0.01;
    const y0 = p.y, x0 = strip.position.x, z0 = strip.position.z, spin = 3 + (i % 4);
    const secs = Math.sqrt(Math.max(0.5, (y0 - y1)) / 4.9);
    G.clues.anims.push({ t: 0, secs, step: (k) => { strip.position.set(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k * k, z0 + (z1 - z0) * k); strip.quaternion.copy(q0).premultiply(qs.setFromAxisAngle(ax, -k * spin)); },   // tumbling out over the street
      done: () => { strip.quaternion.setFromAxisAngle(_v.set(0, 1, 0), Math.PI / 2 + i); strip.position.y = y1; G.audio.play('knock-clatter', { at: { x: x1, y: y1, z: z1 } }); G.particles.burst('dust', x1, y1 + 0.05, z1, 8, { spread: 0.4 }); G.later(45, () => strip.removeFromParent()); } });
  }

  install(ids) {
    for (const id of ids) if (this.st[id] !== 'cleared' && !this.G.state.flags['prickett.quit']) this.st[id] = 'installed';
    this.refresh();
  }

  clear(id) {
    this.st[id] = 'cleared';
    this.refresh();
    const s = this.sites.find((q) => q.id === id);
    if (s) { for (const p of s.points) this.G.particles.burst('sparkle', p.x, p.y + 0.1, p.z, 12); this.G.toast('Perch back!', { kind: 'stamp' }); }
  }

  /** Is the perch Gus just landed on spiked? */
  spikedAt(x, y, z) {
    for (const s of this.sites) {
      if (this.st[s.id] !== 'installed') continue;
      for (const p of s.points) if (Math.hypot(p.x - x, p.z - z) < 1.2 && Math.abs(p.y - y) < 0.8) return s;
      // fix-36: the whole ledge run is spiked (no gaps to land in between the strips)
      if (s.ledge && Math.abs(x - s.ledge.x) < 1.1 && Math.abs(y - s.ledge.y) < 0.8 && s.ledge.runs.some(([a, b]) => z > a - 1 && z < b + 1)) return s;
      if (!s.perches && Math.hypot(s.x - x, s.z - z) < s.r && y > this.G.terrain.heightAt(x, z) + 2) return s;
    }
    return null;
  }

  /** Gus's landing events: bounce off spikes. */
  onLanding(e) {
    const s = this.spikedAt(e.x, e.y, e.z);
    if (!s) return false;
    const G = this.G;
    G.gus.bounce();
    G.audio.synth('boing');
    G.toast('Spikes! Boing.', { kind: 'bad' });
    G.bus.emit('spikeBounce', { site: s.id });
    return true;
  }

  summary() { return { ...this.st }; }
}
