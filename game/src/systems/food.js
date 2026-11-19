// Food ("Food"): crumb piles that wait until eaten. Gus eats crumbs, peas,
// nuts and bits by walking over them (sucked up with a gulp; the HUD counter
// ticks). Piles come from flipped signs, the Prologue's frenzy and the Pigeon
// Lady's bench; a nap clears uneaten piles ("The pigeons got 'em").

import * as THREE from 'three';
import { ruleMaterial } from '../gfx/load-model.js';
import { rngFor } from '../core/rng.js';

const MAX_BITS = 900;
const BITS_PER_PILE = 34;   // Fixes-2 (P3): fuller piles (was 26)
const EAT_RATE = 24;     // crumbs a second while standing in a pile
const EAT_R = 0.6;

const COLORS = { crumbs: [0.86, 0.7, 0.42], nuts: [0.55, 0.36, 0.2], peas: [0.48, 0.74, 0.24], bread: [0.92, 0.8, 0.55] };

export class Food {
  constructor(G) {
    this.G = G;
    const geo = new THREE.IcosahedronGeometry(0.028, 0);   // Fixes-2 (P3): bigger bits (0.018 m vanished in the grass)
    const mat = ruleMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_BITS);
    this.mesh.name = 'crumbs';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.seq = 1;
    this.eatAcc = 0;
    this.gulpT = 0;
    this.dirty = true;
    this.bounce = new Map();   // pile id → seconds since it landed (bounce animation)
    // Fixes-2 (P3): a soft warm glow under every pile and a twinkle over the nearest ones, so food reads from the
    // follow camera (render only: the particles have their own random stream)
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const gg = gc.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,170,0.9)'); gr.addColorStop(0.45, 'rgba(255,214,120,0.35)'); gr.addColorStop(1, 'rgba(255,200,100,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    this.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 }), 64);
    this.glow.name = 'crumb-glow'; this.glow.count = 0; this.glow.frustumCulled = false; this.glow.renderOrder = 1;
    this.mesh.add(this.glow);
    this.twinkleT = 0;
  }

  get piles() { return this.G.state.piles; }

  /** Add crumbs at a spot (merging into a pile within 0.8 m). Returns the pile. */
  addPile(x, z, amount, { sign = null, kind = 'crumbs' } = {}) {
    if (amount <= 0) return null;
    let p = this.piles.find((q) => Math.hypot(q.x - x, q.z - z) < 0.8);
    if (p) p.amount += amount;
    else {
      p = { id: 'p' + this.seq++ + '_' + Math.round(this.G.state.time), x, z, y: this.G.surfaceY(x, z, this.G.terrain.heightAt(x, z) + 0.4), amount, sign, kind };
      this.piles.push(p);
    }
    this.bounce.set(p.id, 0);
    this.G.particles.burst('crumbs', x, p.y + 0.3, z, 14, { spread: 0.4 });
    this.G.audio.play('crumb-scatter', { at: p, vol: 0.8 });
    this.dirty = true;
    return p;
  }

  pileFor(sign) { return this.piles.find((p) => p.sign === sign) || null; }

  /** Nearest uneaten piles (the Board marks three on the compass). */
  nearest(p, n = 3) {
    return [...this.piles].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, n);
  }

  update(dt) {
    const G = this.G, g = G.gus;
    // Gus eats what he walks over
    if (g && (g.mode === 'walk' || g.mode === 'takeoff')) {
      for (const p of this.piles) {
        if (Math.hypot(p.x - g.position.x, p.z - g.position.z) > EAT_R || Math.abs(p.y - g.position.y) > 0.5) continue;
        const bite = Math.min(p.amount, EAT_RATE * dt);
        p.amount -= bite;
        this.eatAcc += bite;
        this.dirty = true;
        break;
      }
    }
    if (this.eatAcc >= 1) {
      const whole = Math.floor(this.eatAcc);
      this.eatAcc -= whole;
      G.state.crumbs += whole;
      G.state.stats.eaten += whole;
      G.bus.emit('eat', { amount: whole });
      this.gulpT -= whole;
      if (this.gulpT <= 0) { G.audio.play('gulp', { at: g.position, vol: 0.8 }); this.gulpT = 4; }
    }
    const before = this.piles.length;
    this.G.state.piles = this.piles.filter((p) => p.amount >= 0.5);
    if (this.piles.length !== before) this.dirty = true;
    for (const [id, t] of this.bounce) { const n = t + dt; if (n > 0.8) this.bounce.delete(id); else this.bounce.set(id, n); this.dirty = true; }
    if (this.dirty) this.#rebuild();
    this.#shine(dt);
  }

  /** Fixes-2 (P3): the glow pulses; the three piles nearest Gus twinkle now and then. Render only. */
  #shine(dt) {
    const G = this.G, gl = this.glow, piles = this.piles;
    const k = 0.34 + 0.1 * Math.sin((G.state.time || 0) * 3);
    gl.material.opacity = G.state.phase === 'night' ? k * 0.7 : k;
    if ((this.twinkleT -= dt) > 0 || !piles.length || !G.gus) return;
    this.twinkleT = 0.7;
    for (const p of this.nearest(G.gus.position, 3)) if (Math.hypot(p.x - G.gus.position.x, p.z - G.gus.position.z) < 30) G.particles.burst('sparkle', p.x, p.y + 0.06, p.z, 2, { spread: 0.5 });
  }

  #rebuild() {
    this.dirty = false;
    const m = this.mesh;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), C = new THREE.Color();
    let n = 0;
    for (const p of this.piles) {
      const rnd = rngFor('pile:' + p.id);
      const bits = Math.min(BITS_PER_PILE, Math.max(3, Math.ceil(p.amount * 1.3)));
      const b = this.bounce.get(p.id);
      const hop = b != null ? Math.abs(Math.sin(b * 9)) * 0.12 * (1 - b / 0.8) : 0;
      const col = COLORS[p.kind] || COLORS.crumbs;
      for (let i = 0; i < bits && n < MAX_BITS; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.36;
        P.set(p.x + Math.cos(a) * r, p.y + 0.012 + hop * rnd(), p.z + Math.sin(a) * r);
        Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
        const s = 0.7 + rnd() * 0.9;
        S.set(s, s * 0.7, s);
        m.setMatrixAt(n, M.compose(P, Q, S));
        const k = 0.85 + rnd() * 0.3;
        m.setColorAt(n, C.setRGB(col[0] * k, col[1] * k, col[2] * k));
        n++;
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // the glow discs (Fixes-2): one per pile, sized by how much is left
    const gl = this.glow; let gn = 0;
    for (const p of this.piles) {
      if (gn >= 64) break;
      const s = 0.75 + Math.min(1, p.amount / 15) * 0.4;
      gl.setMatrixAt(gn++, M.compose(P.set(p.x, p.y + 0.02, p.z), Q.identity(), S.set(s, 1, s)));
    }
    gl.count = gn; gl.instanceMatrix.needsUpdate = true;
  }

  /** Nap: uneaten piles are gone. */
  onNap() {
    const had = this.piles.length > 0;
    this.G.state.piles = [];
    this.dirty = true;
    return had ? ["The pigeons got 'em."] : [];
  }

  restore() { this.dirty = true; }
}
