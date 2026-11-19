// One pooled Points system for small effects: leaf bursts (canopies), splashes
// (water), and steam rising from the stacks and subway grates. Simulated on the
// fixed update with seeded randomness; drawn as soft round sprites.

import * as THREE from 'three';
import { rngFor } from '../core/rng.js';

const MAX = 900;

export class Particles {
  constructor() {
    this.rnd = rngFor('particles');
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.life = new Float32Array(MAX);      // remaining seconds (0 = dead)
    this.maxLife = new Float32Array(MAX);
    this.kind = new Uint8Array(MAX);        // 1 leaf, 2 splash, 3 steam
    this.alpha = new Float32Array(MAX);
    this.next = 0;
    this.emitters = [];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true, fog: true,
      uniforms: { ...THREE.UniformsLib.fog, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aAlpha; varying vec3 vCol; varying float vA;
        uniform float uScale;
        #include <fog_pars_vertex>
        void main() {
          vCol = color; vA = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vA;
        #include <fog_pars_fragment>
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.2, r));
          #include <fog_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.name = 'particles';
    this.points.renderOrder = 5;
    this.active = 0;
  }

  setPixelScale(h) { this.points.material.uniforms.uScale.value = h * 0.9; }

  #spawn(kind, x, y, z, vx, vy, vz, life, size, r, g, b) {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set([r, g, b], i * 3);
    this.size[i] = size;
    this.life[i] = this.maxLife[i] = life;
    this.kind[i] = kind;
  }

  leafBurst(x, y, z, n = 18) {
    const R = this.rnd;
    const pal = [[0.91, 0.64, 0.24], [0.77, 0.29, 0.18], [0.88, 0.48, 0.22], [0.72, 0.55, 0.2]];
    for (let k = 0; k < n; k++) {
      const c = pal[Math.floor(R() * pal.length)];
      this.#spawn(1, x, y, z, (R() - 0.5) * 3, R() * 1.5, (R() - 0.5) * 3, 1.4 + R(), 0.09 + R() * 0.05, ...c);
    }
  }

  splash(x, y, z, n = 22) {
    const R = this.rnd;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, s = 0.6 + R() * 1.6;
      this.#spawn(2, x, y + 0.05, z, Math.cos(a) * s, 2 + R() * 2.2, Math.sin(a) * s, 0.7 + R() * 0.3, 0.07 + R() * 0.05, 0.92, 0.96, 1.0);
    }
  }

  /** One-off effects. kind: 'steam' | 'crumbs' | 'feathers' | 'sparkle' | 'dust' | 'notes'. */
  burst(kind, x, y, z, n = 10, { spread = 0.3, color = null, up = 1 } = {}) {
    const R = this.rnd;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, s = R();
      if (kind === 'steam') this.#spawn(3, x + (R() - 0.5) * spread, y, z + (R() - 0.5) * spread, (R() - 0.5) * 0.08, 0.35 + R() * 0.25, (R() - 0.5) * 0.08, 0.9 + R() * 0.6, 0.05 + R() * 0.04, 0.97, 0.97, 0.98);
      else if (kind === 'crumbs') this.#spawn(2, x + (R() - 0.5) * spread, y, z + (R() - 0.5) * spread, Math.cos(a) * s * 1.2, (1.5 + R() * 1.5) * up, Math.sin(a) * s * 1.2, 0.6 + R() * 0.3, 0.035 + R() * 0.02, ...(color || [0.86, 0.68, 0.38]));
      else if (kind === 'feathers') this.#spawn(1, x, y, z, Math.cos(a) * (0.6 + s), 0.6 + R() * 1.4, Math.sin(a) * (0.6 + s), 1.3 + R() * 0.8, 0.06 + R() * 0.04, ...(color || [0.62, 0.66, 0.74]));
      else if (kind === 'sparkle') this.#spawn(3, x + (R() - 0.5) * spread, y + R() * spread, z + (R() - 0.5) * spread, 0, 0.3 + R() * 0.4, 0, 0.6 + R() * 0.4, 0.04 + R() * 0.04, ...(color || [1, 0.92, 0.55]));
      else if (kind === 'dust') this.#spawn(3, x + (R() - 0.5) * spread, y, z + (R() - 0.5) * spread, Math.cos(a) * s * 0.8, 0.2 + R() * 0.4, Math.sin(a) * s * 0.8, 1.2 + R() * 0.6, 0.18 + R() * 0.14, ...(color || [0.78, 0.7, 0.58]));
      else if (kind === 'notes') this.#spawn(3, x + (R() - 0.5) * spread, y, z + (R() - 0.5) * spread, (R() - 0.5) * 0.4, 0.5 + R() * 0.4, (R() - 0.5) * 0.4, 1.2 + R() * 0.5, 0.06, ...(color || [0.95, 0.85, 0.3]));
    }
  }

  /** Continuous steam: {x, y, z, rate (per second), spread} */
  addEmitter(e) { this.emitters.push({ acc: 0, rate: 6, spread: 0.3, ...e }); }

  update(dt, focus) {
    const R = this.rnd;
    for (const e of this.emitters) {
      if (focus && Math.hypot(e.x - focus.x, e.z - focus.z) > 140) continue;
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        this.#spawn(3, e.x + (R() - 0.5) * e.spread, e.y, e.z + (R() - 0.5) * e.spread, (R() - 0.5) * 0.25, 0.9 + R() * 0.6, (R() - 0.5) * 0.25, 2.6 + R() * 1.4, 0.5 + R() * 0.4, 0.95, 0.95, 0.97);
      }
    }
    let active = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      active++;
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      const k = this.kind[i];
      const o = i * 3;
      if (k === 1) { this.vel[o + 1] -= 1.6 * dt; this.vel[o] *= 1 - dt; this.vel[o + 2] *= 1 - dt; this.vel[o] += Math.sin(t * 12 + i) * 0.04; }
      else if (k === 2) this.vel[o + 1] -= 9.8 * dt;
      else if (k === 3) { this.size[i] += dt * 0.55; this.vel[o] += 0.05 * dt; }
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      this.alpha[i] = k === 3 ? 0.42 * Math.sin(Math.PI * t) : Math.min(1, (1 - t) * 2);
      if (this.life[i] <= 0) this.alpha[i] = 0;
    }
    this.active = active;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}
