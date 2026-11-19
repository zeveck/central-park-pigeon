// Collectibles and the Completionist stamp:
//   40 stray pigeons   (layout.js STRAY_SPOTS) lone birds on ledges, under bridges, on water towers and
//                      in the Blockhouse; Peck one and it joins the flock (each its own colour morph).
//                      A spiked site nearby drives them off until it's cleared.
//   20 golden pretzels (PRETZELS) touch one to take it: each trims the climb's stamina drain a little, for good
//   12 Summit Perches  the first landing on each reveals the map round it with a sweeping camera pan
//                      (fog pushed out); after the Spikes thread (Prickett quits) each visit pays 5 crumbs
//   16 Park Postcards  (POSTCARDS) one-minute moments; each pays 10 crumbs and pins a postcard (a snapshot
//                      of the moment) on the Scheme Board
// Completionist: pretzels, strays, Summit Perches, postcards, favours, full thread meters, scarves.

import * as THREE from 'three';
import { STRAY_SPOTS, PRETZELS, POSTCARDS, WATERFALLS, SUMMIT_PERCHES } from '../world/layout.js';
import { GANG_MIX, PIGEON_LAYERS } from '../data/looks.js';
import { patchMorphArray } from '../gfx/morphs.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { rngFor } from '../core/rng.js';
import { derived } from '../state/gamestate.js';
import { THREADS } from '../data/threads.js';

const STRAY_LINES = ["Coo? You got a crew? I'm in.", "Excuse me, I'm WALKING here. …With you, apparently.", 'Is that pigeon carrying a SLICE? Count me in.', 'Took you long enough.', 'A flock? With snacks? Fine.', 'Finally, somebody with a plan.'];
const SHEENS = [[0.6, 1.2, 1.15], [1.0, 1.25, 0.8], [1.25, 0.95, 0.9], [1, 1, 1]];

export class Collect {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'collect';
    this.t = 0;
    this.pc = {};          // postcard runtime timers
    this.shots = {};       // postcard id → dataURL (this session)
  }
  get st() { return this.G.state; }
  get C() { return this.st.collectibles; }

  async build() {
    const G = this.G;
    await this.#buildStrays();
    this.#buildPretzels();
    this.#buildPostcards();
    G.bus.on('summit', (t, e) => this.#summit(e));
    G.bus.on('coo', (t, e) => { if (!e.hold) this.#cooPostcards(); });
    G.bus.on('land', (t, e) => this.#landPostcards(e));
    G.bus.on('perch', (t, e) => this.#landPostcards(e));
    G.bus.on('pickup', (t, e) => { if (e.item === 'sprat' && this.st.carried?.id === 'sprat') { G.items.take(); this.st.crumbs += 2; G.audio.play('gulp', { at: G.gus.position }); this.award('zoo'); } });
    this.restore();
  }

  #resolve(s) {
    const G = this.G;
    if (s.on?.startsWith('tower:')) {
      const t = G.city?.towers?.[+s.on.slice(6) % Math.max(1, G.city.towers.length)];
      if (!t) return null;
      return { x: t.x + 1.25, y: t.y - 8.1 + 3.12, z: t.z, top: { x: t.x, y: t.y + 0.45, z: t.z } };
    }
    if (s.on?.startsWith('summit:')) { const m = G.summits[s.on.slice(7)]; return m ? { x: m.x, y: m.y, z: m.z } : null; }
    const p = s.on === 'roof' ? { x: s.x, y: G.collision.surface(s.x, s.z, 400).y, z: s.z }
      : { x: s.x, y: G.surfaceY(s.x, s.z, G.terrain.heightAt(s.x, s.z) + 1.2), z: s.z };
    // playtest: a spot inside a solid (the Merchants' Gate and Columbus Circle columns, a city block) put the stray
    // out of sight and out of reach; lift it onto the top of whatever it is in
    for (let k = 0; k < 400 && G.collision.solidAt(p.x, p.y + 0.15, p.z); k++) p.y += 0.25;
    return p;
  }

  // ------------------------------------------------------------ strays
  async #buildStrays() {
    const G = this.G;
    const b = await G.registry.baked('pigeon-plain');
    if (!b) return;
    const n = STRAY_SPOTS.length;
    const mat = b.makeMaterial();
    const morph = G.crowds.morphs?.['pigeon-plain'];
    const geo = b.geometry.clone();
    const rnd = rngFor('strays');
    const layers = new Float32Array(n), sheen = new Float32Array(n * 3);
    const mix = Object.entries(GANG_MIX.strays), tot = mix.reduce((p, [, w]) => p + w, 0);
    for (let i = 0; i < n; i++) {
      let r = rnd() * tot, L = 0;
      for (const [k, w] of mix) { r -= w; if (r <= 0) { L = PIGEON_LAYERS[k]; break; } }
      layers[i] = L;
      sheen.set(SHEENS[Math.floor(rnd() * SHEENS.length)], i * 3);
    }
    if (morph) {
      patchMorphArray(mat, morph.texture, { sheen: true });
      geo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(layers, 1));
      geo.setAttribute('aSheen', new THREE.InstancedBufferAttribute(sheen, 3));
    }
    this.strayMesh = new THREE.InstancedMesh(geo, mat, n);
    this.strayMesh.name = 'strays';
    this.strayMesh.frustumCulled = false;
    this.strayMesh.castShadow = G.preset?.id === 'high';
    this.strayLayers = layers.slice(); this.straySheen = sheen.slice();   // per stray; the drawn instances are the nearest few
    const pid = G.preset?.id || 'medium';
    this.strayCap = { high: 12, medium: 8, low: 4 }[pid] || 8;
    this.strayRange = { high: 80, medium: 60, low: 35 }[pid] || 60;
    this.group.add(this.strayMesh);
    this.strays = STRAY_SPOTS.map((s, i) => {
      const p = this.#resolve(s);
      const st = { def: s, i, p, yaw: rnd() * 6.28, bob: rnd() * 6 };
      if (p) G.interact.register({ id: 'stray:' + s.id, kind: 'stray', x: p.x, y: p.y, z: p.z, r: 1.3, dy: 1.4, priority: 4,
        label: () => (this.#strayHere(st) ? 'Talk to the stray' : null), act: () => this.#joinStray(st) });
      return st;
    });
  }

  #strayHere(s) {
    if (!s.p || this.C.strays.includes(s.def.id)) return false;
    if (s.def.spike && this.st.spikes[s.def.spike] === 'installed') return false;   // a spiked roost: they left
    return true;
  }

  #joinStray(s) {
    const G = this.G, st = this.st;
    if (!this.#strayHere(s)) return;
    this.C.strays.push(s.def.id);
    st.flockFrom['stray:' + s.def.id] = 1;
    G.flock.setRoster(st.flockFrom);
    G.audio.play('coo-gather', { at: s.p });
    G.particles.burst('feathers', s.p.x, s.p.y + 0.2, s.p.z, 8);
    G.bubbles.add(STRAY_LINES[this.C.strays.length % STRAY_LINES.length], { at: { x: s.p.x, y: s.p.y + 0.6, z: s.p.z }, ttl: 2.6 });
    G.toast(`A stray joins your flock (${this.C.strays.length}/40)`, { kind: 'stamp' });
    G.bus.emit('stray', { id: s.def.id });
    this.#drawStrays();
    G.autosave('stray');
  }

  #drawStrays() {
    if (!this.strayMesh) return;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const g = this.G.gus.position, R = this.strayRange;
    // only the nearest few are drawn (each is a full 6k-triangle pigeon)
    const near = this.strays.filter((s) => this.#strayHere(s) && Math.abs(s.p.x - g.x) < R && Math.abs(s.p.z - g.z) < R)
      .map((s) => [Math.hypot(s.p.x - g.x, s.p.z - g.z), s]).filter(([d]) => d < R).sort((a, b) => a[0] - b[0]).slice(0, this.strayCap);
    const geo = this.strayMesh.geometry, la = geo.getAttribute('aLayer'), sh = geo.getAttribute('aSheen');
    near.forEach(([, s], k) => {
      const bob = Math.abs(Math.sin(this.t * 1.7 + s.bob)) * 0.006;
      M.compose(P.set(s.p.x, s.p.y + bob, s.p.z), Q.setFromAxisAngle(up, s.yaw + Math.sin(this.t * 0.4 + s.bob) * 0.6), S);
      this.strayMesh.setMatrixAt(k, M);
      if (la) { la.array[k] = this.strayLayers[s.i]; sh.array.set(this.straySheen.subarray(s.i * 3, s.i * 3 + 3), k * 3); }
    });
    this.strayMesh.count = near.length;
    if (la) { la.needsUpdate = true; sh.needsUpdate = true; }
    this.strayMesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------ golden pretzels
  #buildPretzels() {
    const G = this.G;
    const parts = [];
    for (const [x, y, r, s] of [[-0.05, 0.02, 0.055, 0], [0.05, 0.02, 0.055, 0], [0, -0.035, 0.07, 1]]) {
      const t = new THREE.TorusGeometry(r, 0.018, 6, s ? 8 : 14, s ? Math.PI : Math.PI * 2);   // perf pass: was 8 × 18 (864 tris a pretzel)
      if (s) t.rotateZ(Math.PI);
      t.translate(x, y, 0);
      parts.push(t);
    }
    const geo = mergeAll(parts);
    const mat = ruleMaterial({ color: 0xf2b630, emissive: 0x6a4a00, metalness: 0.35, roughness: 0.35 });
    this.pretzelMesh = new THREE.InstancedMesh(geo, mat, PRETZELS.length);
    this.pretzelMesh.name = 'golden-pretzels';
    this.pretzelMesh.frustumCulled = false;
    this.pretzelRange = { high: 220, medium: 160, low: 80 }[G.preset?.id] || 160;
    this.group.add(this.pretzelMesh);
    this.pretzels = PRETZELS.map((d, i) => {
      const p = this.#resolve(d);
      if (p?.top) Object.assign(p, p.top);
      if (p) p.y += d.dy ?? 0.5;
      return { def: d, i, p };
    });
  }

  #drawPretzels(dt) {
    const G = this.G, g = G.gus.position;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(2.4, 2.4, 2.4), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    // perf pass (render only): the drawn instances are packed and counted, and pretzels past a few pixels' worth
    // from the camera aren't drawn (zero-scaled instances still cost their triangles)
    const cam = G.dataCam?.position;
    let n = 0;
    for (const p of this.pretzels) {
      const got = !p.p || this.C.pretzels.includes(p.def.id);
      if (got) continue;
      if (!cam || Math.hypot(cam.x - p.p.x, cam.y - p.p.y, cam.z - p.p.z) < this.pretzelRange) {
        M.compose(P.set(p.p.x, p.p.y + Math.sin(this.t * 2 + p.i) * 0.06, p.p.z), Q.setFromAxisAngle(up, this.t * 1.8 + p.i), S);
        this.pretzelMesh.setMatrixAt(n++, M);
      }
      const d = Math.hypot(g.x - p.p.x, g.y + 0.15 - p.p.y, g.z - p.p.z);
      if (d < 60 && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) G.particles.burst('sparkle', p.p.x, p.p.y, p.p.z, 1, { spread: 0.3 });
      if (d < 0.75) this.#takePretzel(p);
    }
    this.pretzelMesh.count = n;
    this.pretzelMesh.instanceMatrix.needsUpdate = true;
  }

  #takePretzel(p) {
    const G = this.G;
    this.C.pretzels.push(p.def.id);
    G.gus.staminaBonus = Math.min(0.35, this.C.pretzels.length * 0.0175);
    G.audio.play('pretzel-chime', { at: p.p });
    G.particles.burst('sparkle', p.p.x, p.p.y, p.p.z, 24, { spread: 0.6 });
    G.gus.stamina = 1;
    G.toast(`Golden pretzel ${this.C.pretzels.length}/20: a little more stamina, for good`, { kind: 'stamp' });
    G.bus.emit('pretzel', { id: p.def.id });
    G.autosave('pretzel');
  }

  // ------------------------------------------------------------ Summit Perches
  #summit(e) {
    const G = this.G, st = this.st;
    if (e.first) {
      // the reveal pan: the camera sweeps out wide round Gus; the fog is pushed back for it
      const fog = G.scene.fog, near = fog.near, far = fog.far;
      fog.near = near * 2; fog.far = far * 2.2;
      G.rig.sweep({ secs: 5.5, dist: 26, height: 12, done: () => { fog.near = near; fog.far = far; } });
      G.blockNapFor = 5.5;
      if (e.id === 'summit-needle') G.later(2, () => this.award('needle'));
    }
    if (st.flags['prickett.quit']) {
      const k = 'summit.' + e.id;
      if (!st.phaseUsed?.[k]) { (st.phaseUsed || (st.phaseUsed = {}))[k] = true; st.crumbs += 5; G.toast('+5 crumbs: the view pays'); }
    }
  }

  // ------------------------------------------------------------ postcards
  #buildPostcards() {
    const G = this.G;
    const P = Object.fromEntries(POSTCARDS.map((p) => [p.id, p]));
    this.P = P;
    // the carousel: hop on a horse (Afternoon)
    const car = P.carousel.at;
    G.interact.register({ id: 'pc:carousel', kind: 'postcard', x: car.x, y: G.terrain.heightAt(car.x, car.z) + 0.2, z: car.z - car.r - 0.3, r: 2.2, dy: 2.5, priority: 3,
      label: () => (this.st.phase === 'afternoon' && !this.ride ? 'Ride a carousel horse' : null), act: () => this.#rideCarousel() });
    // the chess players' board
    const ch = P.chess.at;
    G.interact.register({ id: 'pc:chess', kind: 'postcard', x: ch.x, y: G.surfaceY(ch.x, ch.z, 3), z: ch.z, r: 1.8, dy: 2, priority: 3,
      label: () => (G.humans.isOut('chess') ? 'Peck a chess piece' : null), act: () => this.#chess() });
    // a spare towel by the Sheep Meadow sunbathers
    const tw = P['sheep-meadow'].at;
    this.towel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6).rotateX(-Math.PI / 2), ruleMaterial({ map: stripes(['#e8462f', '#fdf2dc', '#3aa0d8', '#fdf2dc']) }));
    this.towel.position.set(tw.x, G.terrain.heightAt(tw.x, tw.z) + 0.02, tw.z); this.towel.rotation.y = 0.4;
    this.group.add(this.towel);
    // the Pigeon Lady's hat (a perch while she's out)
    const hat = P.mall.at;
    this.hatPerch = G.collision.addPerch({ x: hat.x, y: G.surfaceY(hat.x, hat.z, 3) + 1.36, z: hat.z, r: 0.2, id: 'dolores-hat', kind: 'hat' });
    // the coyote: a grey-tan dog trotting across the North Woods clearing, seen from the Blockhouse at Night
    G.registry.baked('dog').then((b) => {
      if (!b) return;
      const m = new THREE.Mesh(b.geometry, b.makeMaterial({ color: 0x9a8a72 }));
      m.scale.set(-0.8, 0.8, 0.7);
      this.coyote = new THREE.Group(); this.coyote.add(m); this.coyote.visible = false;
      this.group.add(this.coyote);
    });
  }

  /** Award a postcard: 10 crumbs, a snapshot polaroid, the Board. */
  award(id) {
    const G = this.G, st = this.st, p = this.P[id];
    if (!p || st.postcards.includes(id)) return false;
    st.postcards.push(id);
    st.crumbs += 10;
    G.audio.play('camera-shutter');
    G.toast(`Park Postcard ${st.postcards.length}/16: ${p.name}`, { kind: 'stamp', seconds: 4 });
    G.later(0.15, () => {
      if (p.line) G.bubbles.add(p.line, { at: { x: G.gus.position.x, y: G.gus.position.y + 0.9, z: G.gus.position.z }, ttl: 3.5, range: 80 });
      try {
        G.render();
        const url = G.renderer.domElement.toDataURL('image/jpeg', 0.6);
        this.shots[id] = url;
        const el = document.getElementById('polaroid');
        el.innerHTML = `<img alt="" src="${url}"><b>POSTCARD</b><span>${p.name}</span>`;
        el.className = 'on postcard';
        G.later(3.5, () => { el.className = ''; });
      } catch { /* a snapshot is a nicety */ }
    });
    G.bus.emit('postcard', { id });
    G.autosave('postcard');
    return true;
  }

  #phaseOk(p) { return !p.phase || (p.phase === 'day' ? this.st.phase !== 'night' : [].concat(p.phase).includes(this.st.phase)); }
  #near(p, r = p.at.r) { const g = this.G.gus.position; return Math.hypot(g.x - p.at.x, g.z - p.at.z) <= r; }
  #ok(p) { return !this.st.postcards.includes(p.id) && this.#phaseOk(p) && (!p.flags || p.flags.every((f) => this.st.flags[f])) && (!p.spike || this.st.spikes[p.spike] !== 'installed'); }

  #cooPostcards() {
    const G = this.G;
    for (const id of ['strawberry', 'gapstow']) {
      const p = this.P[id];
      if (!this.#ok(p) || !this.#near(p) || !G.humans.isOut(p.human)) continue;
      if (id === 'strawberry') {
        this.musicT = 15;
        const a = p.at;
        G.later(1.5, () => G.food.addPile(a.x + 0.8, a.z + 0.4, 10, { kind: 'crumbs' }));
      }
      if (id === 'gapstow') G.particles.burst('sparkle', p.at.x, G.gus.position.y + 1.4, p.at.z, 20, { spread: 0.4, color: [1, 1, 1] });
      G.later(id === 'strawberry' ? 2 : 0.4, () => this.award(id));
    }
    const d = this.P.delacorte;
    if (this.cue > 0 && this.#ok(d) && this.#near(d)) { this.cue = 0; this.award('delacorte'); G.audio.play('crowd-cheer', { at: d.at }); }
  }

  #landPostcards(e) {
    const G = this.G;
    const b = this.P.ramble;
    if (this.#ok(b) && this.#near(b)) {
      const birder = G.humans.agents.find((a) => a.out && a.role === 'birder' && Math.hypot(a.x - e.x, a.z - e.z) < 3.5);
      if (birder) { G.bubbles.add('Oh! A…', { at: () => ({ x: birder.x, y: (birder.y ?? 0) + 2.1, z: birder.z }), ttl: 1.6 }); G.later(1.8, () => { G.bubbles.add('…just a pigeon.', { at: () => ({ x: birder.x, y: (birder.y ?? 0) + 2.1, z: birder.z }), ttl: 2 }); this.award('ramble'); }); }
    }
    const m = this.P.mall;
    if (e.type === 'perch' && this.#ok(m) && G.gus.perch?.id === 'dolores-hat') { G.later(0.6, () => this.award('mall')); }
  }

  #chess() {
    const G = this.G, p = this.P.chess;
    G.audio.play('peck', { at: p.at });
    const players = G.humans.agents.filter((a) => a.out && a.role === 'chess');
    const say = (a, t, d) => a && G.later(d, () => G.bubbles.add(t, { at: () => ({ x: a.x, y: (a.y ?? 0) + 1.7, z: a.z }), ttl: 2.2 }));
    say(players[0], 'Hey! That was MY rook!', 0.3);
    say(players[1], 'YOU moved it!', 1.4);
    say(players[0], 'I did NOT!', 2.6);
    if (this.#ok(p)) G.later(3.2, () => this.award('chess'));
  }

  #rideCarousel() {
    const G = this.G, p = this.P.carousel, a = p.at;
    if (this.ride || G.vehicles.driving) return;
    const y0 = G.terrain.heightAt(a.x, a.z);
    this.ride = { kind: 'carousel', t: 0, secs: p.secs, ang: -Math.PI / 2, y0 };
    G.gus.sit({ dist: 3.2, height: 1.4, look: 0.5 });
    G.blockNapFor = p.secs;
  }

  #rideWaterfall() {
    const G = this.G, w = WATERFALLS[0];
    this.ride = { kind: 'waterfall', t: 0, secs: 1.4, from: { x: w.x, y: w.top + 0.05, z: w.z }, to: { x: w.x + Math.sin(w.yaw) * 3, y: w.bottom + 0.02, z: w.z + Math.cos(w.yaw) * 3 }, yaw: w.yaw };
    G.gus.sit({ dist: 2.4, height: 1.2, look: 0.3 });
    G.audio.play('whoosh', { at: G.gus.position });
  }

  #rideTick(dt) {
    const G = this.G, R = this.ride, g = G.gus;
    R.t += dt;
    const k = Math.min(1, R.t / R.secs);
    if (R.kind === 'carousel') {
      const a = this.P.carousel.at;
      R.ang -= (Math.PI * 2 / R.secs) * dt;
      const r = a.r - 1.2;
      g.position.set(a.x + Math.cos(R.ang) * r, R.y0 + 1.15 + Math.sin(R.t * 4) * 0.18, a.z + Math.sin(R.ang) * r);
      g.yaw = R.ang - Math.PI / 2 + Math.PI;
      if (k >= 1) {
        this.ride = null;
        g.stand();
        g.place({ x: a.x, z: a.z - a.r - 1.2, yaw: Math.PI, mode: 'walk' });
        this.award('carousel');
      }
    } else {
      const e = k * k;
      g.position.set(R.from.x + (R.to.x - R.from.x) * k, R.from.y + (R.to.y - R.from.y) * e, R.from.z + (R.to.z - R.from.z) * k);
      g.yaw = R.yaw;
      if (k >= 1) {
        this.ride = null;
        g.stand();
        G.particles.splash(R.to.x, R.to.y, R.to.z, 26); G.audio.play('splash-hop', { at: R.to });
        g.place({ x: R.to.x, z: R.to.z, y: R.to.y + 0.1, yaw: R.yaw, mode: 'fly', speed: 3 });
        g.launch(3, 3);
        this.award('loch');
      }
    }
  }

  #postcardTick(dt) {
    const G = this.G, g = G.gus, P = this.P, st = this.st;
    if (this.musicT > 0) this.musicT -= dt;
    // perches held for a moment (Bow Bridge, the sled dog, the mushroom)
    for (const id of ['bow-bridge', 'sled-dog', 'mushroom']) {
      const p = P[id];
      const ground = G.terrain.heightAt(g.position.x, g.position.z);
      const on = this.#ok(p) && this.#near(p) && g.grounded && g.position.y - ground >= (p.minY ?? 0.5) && (id !== 'bow-bridge' || g.mode === 'perch');
      this.pc[id] = on ? (this.pc[id] || 0) + dt : 0;
      if (on && this.pc[id] >= (p.secs ?? 1)) { this.pc[id] = -99; if (id === 'bow-bridge') { G.particles.burst('sparkle', g.position.x, g.position.y + 0.5, g.position.z, 30, { spread: 1, color: [1, 1, 1] }); G.audio.play('camera-shutter'); } this.award(id); }
    }
    // sunbathing on the towel
    const sm = P['sheep-meadow'];
    this.towel.visible = st.phase === 'afternoon';
    const still = this.#ok(sm) && this.#near(sm) && g.mode === 'walk' && g.speed < 0.05;
    this.pc.towel = still ? (this.pc.towel || 0) + dt : 0;
    if (still && this.pc.towel >= sm.secs) { this.pc.towel = -99; this.award('sheep-meadow'); }
    // the Delacorte rehearsal's cue (Dusk, from the rafters)
    const dl = P.delacorte;
    if (this.#ok(dl) && this.#near(dl) && g.position.y - G.terrain.heightAt(g.position.x, g.position.z) >= dl.minY) {
      this.cueT = (this.cueT || 0) + dt;
      if (this.cueT > 7) { this.cueT = 0; this.cue = 2.5; G.bubbles.add('"…and ENTER, a bird!"', { at: { x: dl.at.x, y: G.terrain.heightAt(dl.at.x, dl.at.z) + 2.6, z: dl.at.z }, ttl: 2.5, range: 50 }); }
    }
    if (this.cue > 0) this.cue -= dt;
    // the belly-slide on the rink
    const wr = P.wollman;
    if (this.#ok(wr) && this.#near(wr) && g.slideDist >= wr.dist && G.humans.isOut('skater')) { g.slideDist = 0; this.award('wollman'); }
    // the Loch's little waterfall
    const lo = P.loch, w = WATERFALLS[0];
    if (!this.ride && !st.postcards.includes('loch') && Math.hypot(g.position.x - w.x, g.position.z - w.z) < lo.at.r && g.position.y < w.top + 0.5 && g.position.y > w.top - 0.6) this.#rideWaterfall();
    // the sea lions' feeding: a flung sprat
    const zo = P.zoo;
    const onWall = this.#ok(zo) && this.#near(zo) && g.grounded && g.position.y - G.terrain.heightAt(g.position.x, g.position.z) >= zo.minY;
    this.pc.zoo = onWall ? (this.pc.zoo || 0) + dt : 0;
    if (onWall && this.pc.zoo > 3 && !this.spratOut) {
      this.spratOut = true;
      G.audio.play('sea-lion-bark', { at: zo.at });
      const from = { x: 88.3, y: G.terrain.heightAt(88.3, 115.6) + 1.5, z: 115.6 }, to = { x: g.position.x + Math.sin(g.yaw) * 0.5, z: g.position.z + Math.cos(g.yaw) * 0.5 };
      to.y = G.surfaceY(to.x, to.z, g.position.y + 0.3);
      const it = G.items.spawn('sprat', from.x, from.z, { y: from.y });
      G.clues.anims.push({ t: 0, secs: 1.1, step: (k) => { it.x = from.x + (to.x - from.x) * k; it.z = from.z + (to.z - from.z) * k; it.y = from.y + (to.y - from.y) * k + Math.sin(Math.PI * k) * 4; it.mesh.position.set(it.x, it.y, it.z); it.mesh.rotation.z = k * 9; }, done: () => { const sv = st.items.find((q) => q.uid === it.uid); if (sv) { sv.x = it.x; sv.y = it.y; sv.z = it.z; } } });
    }
    // the coyote from the Blockhouse wall at Night
    const nw = P['north-woods'];
    const onBlock = this.#ok(nw) && this.#near(nw) && g.grounded && g.position.y - G.terrain.heightAt(g.position.x, g.position.z) >= nw.minY;
    if (onBlock && !this.coyoteRun && this.coyote) this.coyoteRun = { t: 0 };
    if (this.coyoteRun) {
      const R = this.coyoteRun, c = nw.coyote;
      R.t += dt;
      const k = Math.min(1, R.t / 7);
      const x = c.from.x + (c.to.x - c.from.x) * k, z = c.from.z + (c.to.z - c.from.z) * k;
      this.coyote.visible = k < 1;
      this.coyote.position.set(x, G.terrain.heightAt(x, z), z);
      this.coyote.rotation.y = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
      if (R.t > 3 && !R.done && onBlock) { R.done = true; this.award('north-woods'); }
      if (k >= 1) this.coyoteRun = null;
    }
    // the hat perch only while Dolores is on her bench
    if (this.hatPerch) this.hatPerch.off = !G.humans.isOut('dolores');
  }

  // ------------------------------------------------------------ the fixed update
  update(dt) {
    this.t += dt;
    if (this.ride) this.#rideTick(dt);
    if (this.G.blockNapFor > 0) this.G.blockNapFor -= dt;
    this.#drawStrays();
    if (this.pretzelMesh) this.#drawPretzels(dt);
    this.#postcardTick(dt);
  }

  music() { return this.musicT > 0 ? 'busker' : null; }
  napBlock() { return this.ride || this.G.blockNapFor > 0 ? 'Not now' : null; }
  onNap() { this.spratOut = false; this.pc = {}; return []; }
  restore() { this.G.gus.staminaBonus = Math.min(0.35, this.C.pretzels.length * 0.0175); this.ride = null; }

  /** Completionist: what's collected of what (the Board shows it). */
  completion() {
    const st = this.st, d = derived(st);
    const meters = THREADS.filter((t) => d[t.meter.of] >= t.meter.max).length;
    const rows = [
      { id: 'pretzels', label: 'Golden pretzels', have: st.collectibles.pretzels.length, of: 20 },
      { id: 'strays', label: 'Strays', have: st.collectibles.strays.length, of: 40 },
      { id: 'summits', label: 'Summit Perches', have: st.collectibles.summits.length, of: 12 },
      { id: 'postcards', label: 'Postcards', have: st.postcards.length, of: 16 },
      { id: 'favours', label: 'Favours', have: st.favours.length, of: 50 },
      { id: 'meters', label: 'Full thread meters', have: meters, of: 5 },
      { id: 'scarves', label: 'Scarves', have: st.scarves.length, of: 10 },
    ];
    return { rows, complete: rows.every((r) => r.have >= r.of) };
  }

  debug() { return { strays: this.C.strays.length, pretzels: this.C.pretzels.length, summits: this.C.summits.length, postcards: [...this.st.postcards], ride: this.ride?.kind || null }; }
}

function mergeAll(geos) {
  const pos = [], nor = [], idx = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
    const I = g.index;
    for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

function stripes(cols) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * 64) / cols.length, 64, 64 / cols.length); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
