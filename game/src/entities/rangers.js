// The rangers fight back: each park region has a cart (the South cart patrols
// from the Dairy, the Middle cart parks in the Boathouse lot, the North cart
// in the 103rd Street shed). A revert request sends the cart along the park
// drive to the sign; the ranger gets out, walks over, tuts ("scold" clip) and
// puts the "DON'T" plate back, then drives home. At Night the carts sit
// parked (sabotage time). A sabotaged cart never drives again.

import * as THREE from 'three';
import { RANGER_CARTS } from '../world/layout.js';

const CART_SPEED = 7, WALK = 1.7;

export class Rangers {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'ranger-carts';
    this.carts = [];
    this.queue = [];
  }

  async build() {
    const G = this.G;
    const baked = await G.registry.baked('ranger-cart');
    const drive = G.terrain.shapes.drives.find((d) => d.id === 'park-drive');
    this.drive = drive ? resample(drive.line, 4) : [];
    for (const def of RANGER_CARTS) {
      let mesh;
      if (baked) {
        mesh = new THREE.Mesh(baked.geometry, baked.makeMaterial());
        mesh.castShadow = true; mesh.receiveShadow = true;
      } else mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 2.8).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: 0x3e5b3a }));
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.scale.x = -1;    // counter-mirror
      this.group.add(holder);
      const ranger = G.humans.addAgent({ role: 'ranger', model: 'human-ranger', at: { ...def.base }, script: true });
      const cart = { def, id: def.id, holder, x: def.base.x, z: def.base.z, yaw: def.base.yaw, state: 'parked', route: null, ri: 0, job: null, ranger, wait: 0 };
      this.#seat(cart);
      this.carts.push(cart);
    }
    this.setPhase(G.state.phase);
  }

  cart(id) { return this.carts.find((c) => c.id === id); }

  #seat(c) {
    const r = c.ranger;
    r.seated = true;
    r.x = c.x - Math.cos(c.yaw) * 0.3; r.z = c.z + Math.sin(c.yaw) * 0.3; r.yaw = c.yaw;
    r.y = (c.y ?? this.G.surfaceY(c.x, c.z, 50)) + 0.35;
    r.seatY = 0;
  }

  /** Signs ask for a revert when their 3 minutes are up. */
  requestRevert(signId, onDone = null) {
    const s = this.G.signs.byId[signId];
    const cart = this.cart(s.region);
    if (!cart || this.G.state.carts[s.region]) return;
    if (cart.job?.sign === signId || this.queue.some((q) => q.sign === signId)) return;
    this.queue.push({ sign: signId, cart: cart.id, onDone });
  }

  /** Drive there right now (the Prologue's "on camera" revert). */
  revertNow(signId, onDone) {
    this.queue = this.queue.filter((q) => q.sign !== signId);
    const s = this.G.signs.byId[signId];
    const cart = this.cart(s.region);
    this.#start(cart, { sign: signId, onDone, fast: true });
  }

  setPhase(phase) {
    for (const c of this.carts) {
      const spot = phase === 'night' ? c.def.night : c.def.base;
      c.x = spot.x; c.z = spot.z; c.yaw = spot.yaw;
      c.state = 'parked'; c.job = null; c.route = null;
      c.ranger.mode = 'idle'; c.ranger.oneShot = null; c.ranger.busy = false; c.ranger.target = null;   // Fixes-3: a load leaves no ranger mid-walk
      this.#seat(c);
      c.ranger.out = phase !== 'night';   // he goes home at Night; the cart stays
    }
    this.queue = [];
  }

  #start(cart, job) {
    const G = this.G;
    const s = G.signs.byId[job.sign];
    cart.job = job;
    cart.state = 'driving';
    const stop = this.#nearestDrive(s.x, s.z);
    const startIdx = this.#nearestIdx(cart.x, cart.z);
    const endIdx = this.#nearestIdx(stop.x, stop.z);
    const pts = [{ x: cart.x, z: cart.z }];
    if (Math.hypot(stop.x - s.x, stop.z - s.z) > 30 || this.drive.length === 0) {
      // far from the drive: go across the lawn
      pts.push({ x: s.x - Math.sin(s.yaw) * 4, z: s.z - Math.cos(s.yaw) * 4 });
    } else {
      const step = endIdx >= startIdx ? 1 : -1;
      for (let i = startIdx; i !== endIdx; i += step) pts.push(this.drive[i]);
      pts.push(this.drive[endIdx]);
    }
    cart.route = pts; cart.ri = 1;
    cart.ranger.out = true;
  }

  #nearestIdx(x, z) {
    let bi = 0, bd = Infinity;
    this.drive.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi;
  }
  #nearestDrive(x, z) { return this.drive.length ? this.drive[this.#nearestIdx(x, z)] : { x, z }; }

  update(dt) {
    const G = this.G;
    if (G.state.phase !== 'night') {
      for (const q of [...this.queue]) {
        const cart = this.cart(q.cart);
        if (cart.state === 'parked' && !G.state.carts[cart.id]) { this.queue = this.queue.filter((x) => x !== q); this.#start(cart, q); }
      }
    }
    for (const c of this.carts) this.#step(c, dt);
  }

  #step(c, dt) {
    const G = this.G, r = c.ranger;
    if (c.state === 'driving' || c.state === 'returning') {
      const tgt = c.route[c.ri];
      if (!tgt) { this.#arrive(c); return; }
      const dx = tgt.x - c.x, dz = tgt.z - c.z, d = Math.hypot(dx, dz);
      const v = CART_SPEED * (c.job?.fast ? 2.6 : 1) * dt;
      if (d <= v) { c.x = tgt.x; c.z = tgt.z; c.ri++; }
      else {
        c.x += (dx / d) * v; c.z += (dz / d) * v;
        const want = Math.atan2(dx, dz);
        const df = Math.atan2(Math.sin(want - c.yaw), Math.cos(want - c.yaw));
        c.yaw += Math.sign(df) * Math.min(Math.abs(df), 3 * dt);
      }
      this.#seat(c);
    } else if (c.state === 'walking') {
      // the ranger walks to the sign (his human agent does the walking)
    }
    c.y = G.surfaceY(c.x, c.z, G.terrain.heightAt(c.x, c.z) + 0.4);
    c.holder.position.set(c.x, c.y, c.z);
    c.holder.rotation.y = c.yaw;
  }

  #arrive(c) {
    const G = this.G, r = c.ranger;
    if (c.state === 'returning') {
      c.state = 'parked'; c.route = null;
      const base = G.state.phase === 'night' ? c.def.night : c.def.base;
      c.yaw = base.yaw;
      this.#seat(c);
      return;
    }
    // out of the cart, over to the sign
    const s = G.signs.byId[c.job.sign];
    c.state = 'walking';
    r.seated = false;
    r.x = c.x + Math.cos(c.yaw) * 1.1; r.z = c.z - Math.sin(c.yaw) * 1.1;
    r.y = undefined;
    const stand = { x: s.x + Math.sin(s.yaw) * 0.9, z: s.z + Math.cos(s.yaw) * 0.9 };
    G.humans.goTo(r, stand, c.job.fast ? WALK * 1.6 : WALK, () => {
      r.yaw = Math.atan2(s.x - r.x, s.z - r.z);
      G.bubbles.add('Tsk.', { at: () => ({ x: r.x, y: (r.y || 0) + 2.05, z: r.z }), ttl: 1.8 });
      G.humans.play(r, 'scold', 1.8, () => {
        G.signs.revert(c.job.sign);
        const done = c.job.onDone;
        G.humans.goTo(r, { x: c.x + Math.cos(c.yaw) * 1.1, z: c.z - Math.sin(c.yaw) * 1.1 }, WALK, () => {
          // drive home
          r.script = true;
          const base = c.def.base;
          c.state = 'returning';
          const startIdx = this.#nearestIdx(c.x, c.z), endIdx = this.#nearestIdx(base.x, base.z);
          const pts = [{ x: c.x, z: c.z }];
          if (Math.hypot(c.x - this.drive[startIdx]?.x, c.z - this.drive[startIdx]?.z) < 30) {
            const step = endIdx >= startIdx ? 1 : -1;
            for (let i = startIdx; i !== endIdx; i += step) pts.push(this.drive[i]);
          }
          pts.push({ x: base.x, z: base.z });
          c.route = pts; c.ri = 1;
          c.job = null;
          this.#seat(c);
        });
        done?.();
      });
    });
    r.script = false;   // let the human sim walk him
    r.mode = 'goto';
    r.busy = true;   // the human sim walks him until he's back in his seat
  }

  summary() { return Object.fromEntries(this.carts.map((c) => [c.id, { state: this.G.state.carts[c.id] ? 'sabotaged' : c.state, x: +c.x.toFixed(1), z: +c.z.toFixed(1) }])); }
}

function resample(line, step) {
  const out = [{ ...line[0] }];
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    acc += d;
    if (acc >= step) { out.push({ x: b.x, z: b.z }); acc = 0; }
  }
  return out;
}
