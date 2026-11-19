// Street scenery that moves with the story and the phase: Prickett's van
// (and Prickett) on Central Park South, the halal cart (its griddle warms
// slices: Grand Army Plaza at Afternoon, 110th & Fifth at Dusk), the
// ice-cream truck (Afternoon) and the carriages on the carriage line (day).
// Meshes are the meshgen models, counter-mirrored like every model.

import * as THREE from 'three';
import { PROLOGUE, SLICE } from '../world/layout.js';

export class Street {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'street';
  }

  async build() {
    const G = this.G, reg = G.registry;
    const make = async (id, tint = null) => {
      const b = await reg.baked(id);
      if (!b) return null;
      const mat = b.makeMaterial(tint ? { color: tint } : {});
      const m = new THREE.Mesh(b.geometry, mat);
      m.castShadow = true; m.receiveShadow = true;
      const h = new THREE.Group();
      h.add(m);
      h.scale.x = -1;
      h.visible = false;
      this.group.add(h);
      return h;
    };
    this.vanMesh = await make('van');
    this.halal = await make('hotdog-cart', 0xd8e0e6);
    this.icecream = await make('ice-cream-truck');
    this.carriages = [];
    for (let i = 0; i < 3; i++) { const c = await make('carriage'); if (c) this.carriages.push(c); }
    this.prickett = G.humans.addAgent({ role: 'prickett', model: 'human-prickett', at: { x: PROLOGUE.vanStop.x, z: PROLOGUE.vanStop.z + 2.4, yaw: 0 }, script: true });
    this.prickett.spec.acc = ['spraytank', 'wand', 'clipboard'];
    this.van = { pos: { ...PROLOGUE.vanStop }, arrived: true, drive: null, mesh: this.vanMesh };
    const self = this;
    G.van = {
      get pos() { return self.van.pos; },
      get arrived() { return self.van.arrived; },
      drive(from, to, secs) { self.van.drive = { from, to, t: 0, secs }; self.van.arrived = false; self.vanMesh && (self.vanMesh.visible = true); },
      prickettOut() { const p = self.prickett; p.out = true; p.x = self.van.pos.x - 1.6; p.z = self.van.pos.z + 2.2; p.y = undefined; p.yaw = Math.PI; G.humans.play(p, 'taunt', 2); },
    };
    this.setPhase(G.state.phase);
  }

  /** Who and what is parked where this phase (also after a load). */
  setPhase(phase) {
    const G = this.G, st = G.state;
    const day = phase !== 'night';
    // the van sits on the horses' trough from the end of the Prologue until den-horses
    const vanHere = st.flags.prologue && !st.flags['den-horses'];
    if (this.vanMesh) {
      this.vanMesh.visible = !!vanHere;   // (perf: `undefined` draws)
      const s = PROLOGUE.vanStop;
      this.van.pos = { ...s }; this.van.arrived = true; this.van.drive = null;
      this.#place(this.vanMesh, s.x, s.z, s.yaw);
    }
    if (this.prickett) {
      this.prickett.out = vanHere && phase === 'morning';
      this.prickett.x = PROLOGUE.vanStop.x - 1.6; this.prickett.z = PROLOGUE.vanStop.z + 2.2; this.prickett.y = undefined; this.prickett.yaw = Math.PI;
      // Fixes-3: back in his own hands (a Mimic/Bully at the trough, or a scene cut off by a load, left him walking free)
      Object.assign(this.prickett, { script: true, busy: false, mode: 'home', target: null, oneShot: null });
    }
    const gr = SLICE.griddle[phase];
    if (this.halal) { this.halal.visible = !!gr; if (gr) this.#place(this.halal, gr.x, gr.z, gr.yaw); }
    if (this.icecream) { this.icecream.visible = phase === 'afternoon'; this.#place(this.icecream, 78, -13, Math.PI / 2); }   // 3b: by its vendor, at the Plaza (den-songbirds)
    this.carriages.forEach((c, i) => { c.visible = day; this.#place(c, -40 + i * 24, -6.5, Math.PI / 2); });
  }

  #place(h, x, z, yaw) {
    const y = this.G.surfaceY(x, z, 2);
    h.position.set(x, y, z);
    h.rotation.y = yaw;
  }

  update(dt) {
    const v = this.van;
    if (v.drive) {
      const d = v.drive;
      d.t += dt;
      const k = Math.min(1, d.t / d.secs), e = 1 - (1 - k) ** 2;
      v.pos = { x: d.from.x + (d.to.x - d.from.x) * e, z: d.from.z + (d.to.z - d.from.z) * e, yaw: d.to.yaw };
      this.#place(this.vanMesh, v.pos.x, v.pos.z, Math.atan2(d.to.x - d.from.x, d.to.z - d.from.z));
      if (k >= 1) { v.drive = null; v.arrived = true; this.#place(this.vanMesh, d.to.x, d.to.z, d.to.yaw ?? 1.57); }
    }
  }
}
