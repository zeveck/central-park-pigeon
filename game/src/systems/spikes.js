// Thread 3, Spikes: the Spike Man's sites (P1–P10). A spiked perch can't be
// landed on: Gus bounces off with a "boing" (no damage). Nearby signs pay
// nothing (signs.js asks spikedNear). Strips are knocked off by cats; nets and
// bolts by raccoons or Rhoda (milestone 3 wires the Asks to clear()).
// Prickett spikes P1–P4 when the Prologue ends; more follow other schemes.

import * as THREE from 'three';
import { SPIKE_SITES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

const PER_PERCH = 7;

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
        const top = G.collision.surface(p.x, p.z, 400).y;
        let y = top;
        if (s.perches && top < 1.5) {
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
    this.cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.09, 4).translate(0, 0.045, 0), steel, total);
    this.bases = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.015, 0.06).translate(0, 0.008, 0), red, total / PER_PERCH);
    for (const m of [this.cones, this.bases]) { m.frustumCulled = false; m.castShadow = this.G.preset?.id !== 'low'; this.group.add(m); }   // perf pass: no shadows on Low
    this.refresh();
  }

  refresh() {
    const M = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    let ci = 0, bi = 0;
    for (const s of this.sites) {
      const on = this.st[s.id] === 'installed';
      for (const p of s.points) {
        for (let k = 0; k < PER_PERCH; k++) {
          const ox = (k - (PER_PERCH - 1) / 2) * 0.045;
          this.cones.setMatrixAt(ci++, on ? M.makeTranslation(p.x + ox, p.y + 0.012, p.z + (k % 2) * 0.02) : Z);
        }
        this.bases.setMatrixAt(bi++, on ? M.makeTranslation(p.x, p.y, p.z) : Z);
      }
    }
    this.cones.instanceMatrix.needsUpdate = true;
    this.bases.instanceMatrix.needsUpdate = true;
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
