// The pizza economy ("Pizza slices: where slices come from"), the parts that
// renew every phase:
//   Slice Lines      once a Line is won (state.lines), one hot slice waits at its drop each phase
//                    (two each once all three Lines run: the Slice Run's reward). The Carriage Line
//                    runs Morning to Dusk.
//   the Slice Relay  after the cats-and-rats truce, Ask the rats at any grate: a hot slice pops up,
//                    once a phase
//   back-door bins   the three joints' bins at Night: Peck the lid for a cold slice, once a phase each
// The rest are elsewhere: the tourist on each joint's bench (humans.js flee/holds), the counters and
// the pickup shelf (cats Knock: clues.js), the cyclist's box (a blocker: clues.js), the halal griddle
// (items.js), and boxes pecked open (items.js).

import * as THREE from 'three';
import { SLICE, GRATES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

const LINES = [
  { id: 'columbus', drop: 'line-columbus', crew: 'rats', who: 'Express', phases: null, color: 0x6b5a4a },
  { id: 'carriage', drop: 'line-carriage', crew: 'horses', who: 'Clementine', phases: ['morning', 'afternoon', 'dusk'], color: 0xc4302b },
  { id: 'harlem', drop: 'line-harlem', crew: 'cats', who: 'Queenie', phases: null, color: 0xd9a46a },
];

export class Slices {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'slices';
    this.lines = [];
  }
  get st() { return this.G.state; }
  #used(k) { return !!this.st.phaseUsed?.[k]; }
  #use(k) { (this.st.phaseUsed || (this.st.phaseUsed = {}))[k] = (this.st.phaseUsed[k] || 0) + 1; }

  build() {
    const G = this.G;
    const crate = ruleMaterial({ color: 0x9a7448 }), lid = ruleMaterial({ color: 0x3f5a3f }), bin = ruleMaterial({ color: 0x55605a });
    // the Slice Line drops: a crate with the crew's banner and, when one's waiting, a steaming slice
    for (const L of LINES) {
      const d = SLICE.drops.find((q) => q.id === L.drop);
      const y = G.surfaceY(d.x, d.z, 5);
      const g = new THREE.Group();
      g.position.set(d.x, y, d.z);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.45).translate(0, 0.225, 0), crate);
      box.castShadow = true;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 5).translate(0, 0.7, 0), lid);
      pole.position.set(0.26, 0, 0);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), ruleMaterial({ color: L.color, side: THREE.DoubleSide }));
      flag.position.set(0.46, 1.25, 0);
      const slice = G.items.makeMesh('slice');
      slice.position.set(-0.05, 0.46, 0);
      g.add(box, pole, flag, slice);
      g.visible = false;
      this.group.add(g);
      const line = { ...L, d, y, g, slice };
      this.lines.push(line);
      G.interact.register({ id: 'line:' + L.id, kind: 'line', x: d.x, y: y + 0.4, z: d.z, r: 1.4, dy: 2, priority: 6,
        label: () => (this.#waiting(line) > 0 ? 'Take the hot slice' : null), act: () => this.#take(line) });
    }
    // the back-door bins
    this.bins = SLICE.joints.map((j) => {
      const y = G.surfaceY(j.bin.x, j.bin.z, 5);
      const g = new THREE.Group();
      g.position.set(j.bin.x, y, j.bin.z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.65).translate(0, 0.425, 0), bin);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.69), lid);
      top.position.y = 0.88;
      body.castShadow = true;
      g.add(body, top);
      this.group.add(g);
      const b = { j, y, g, top };
      G.interact.register({ id: 'bin:' + j.id, kind: 'bin', x: j.bin.x, y: y + 0.4, z: j.bin.z, r: 1.3, dy: 2.2, priority: 5,
        label: () => (this.st.phase === 'night' && !this.#used('bin.' + j.id) ? 'Peck the bin lid' : null), act: () => this.#bin(b) });
      G.collision.addBox({ x: j.bin.x, z: j.bin.z, y0: y, h: 0.9, w: 0.9, d: 0.65, tag: 'bin' });
      return b;
    });
    this.setPhase();
  }

  /** Slices waiting at a Line's drop this phase. */
  #waiting(L) {
    const st = this.st;
    if (!st.lines.includes(L.id)) return 0;
    if (L.phases && !L.phases.includes(st.phase)) return 0;
    const per = st.lines.length >= 3 ? 2 : 1;
    return Math.max(0, per - (st.phaseUsed?.['line.' + L.id] || 0));
  }

  #take(L) {
    const G = this.G;
    if (this.#waiting(L) <= 0) return;
    this.#use('line.' + L.id);
    G.items.give('slice', { born: G.state.time });
    G.audio.play('slice-pick-up', { at: L.d });
    G.particles.burst('steam', L.d.x, L.y + 0.5, L.d.z, 8);
    G.toast(`${L.who}'s Slice Line: a hot one`);
    G.bus.emit('pickup', { item: 'slice', line: L.id });
    this.setPhase();
  }

  #bin(b) {
    const G = this.G;
    if (this.st.phase !== 'night' || this.#used('bin.' + b.j.id)) return;
    this.#use('bin.' + b.j.id);
    b.top.rotation.x = -0.8; b.top.position.z = -0.25; b.top.position.y = 1.05;
    G.later(1.2, () => { b.top.rotation.x = 0; b.top.position.z = 0; b.top.position.y = 0.88; });
    G.audio.play('peck', { at: b.j.bin }); G.audio.play('drop-thud', { at: b.j.bin, vol: 0.5 });
    G.items.spawn('slice', b.j.bin.x + 0.7, b.j.bin.z + 0.2, { born: null });
    G.toast('A cold slice. The rats won\'t mind.');
  }

  /** The Slice Relay: rats Asked at a grate (clues.js calls this). Returns true if handled. */
  relay(c) {
    const G = this.G, st = this.st;
    const g = GRATES.find((q) => Math.hypot(q.x - c.x, q.z - c.z) < 5 || Math.hypot(q.x - G.gus.position.x, q.z - G.gus.position.z) < 4);
    if (!g) return false;
    if (!st.flags['truce-cats-rats']) return false;
    if (this.#used('relay')) { G.say([{ who: 'express', text: 'One a phase, Gus. The ovens got feelings.' }]); return true; }
    this.#use('relay');
    G.audio.play('grate-whoosh', { at: g });
    G.later(1.0, () => {
      G.audio.play('rat-squeak', { at: g });
      G.items.spawn('slice', g.x + 0.6, g.z, { born: G.state.time, y: 0.2 });
      G.particles.burst('steam', g.x + 0.6, 0.4, g.z, 12);
      G.say([{ who: 'express', text: 'Slice Relay! Hot from the oven. Next stop: you.' }]);
      G.bus.emit('talent', { ally: 'rats', talent: 'gratefetch', clue: 'relay', x: g.x, z: g.z });
    });
    return true;
  }

  setPhase() { for (const L of this.lines) { L.g.visible = this.st.lines.includes(L.id); L.slice.visible = this.#waiting(L) > 0; } }
  restore() { this.setPhase(); }
  update(dt) {
    this.t = (this.t || 0) + dt;
    for (const L of this.lines) if (L.slice.visible && Math.floor(this.t * 3) !== Math.floor((this.t - dt) * 3) && Math.hypot(L.d.x - this.G.gus.position.x, L.d.z - this.G.gus.position.z) < 60) this.G.particles.burst('steam', L.d.x, L.y + 0.5, L.d.z, 1, { spread: 0.1 });
    if ((this.pollT = (this.pollT || 0) + dt) > 1) { this.pollT = 0; this.setPhase(); }
  }
  debug() { return { lines: this.lines.map((L) => ({ id: L.id, waiting: this.#waiting(L) })), relayUsed: this.#used('relay') }; }
}
