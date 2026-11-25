// Fights ("Fights, and why flying away doesn't win them"): four short
// "outwit it" encounters, each started by a scheme step's script and ended by
// a win (done()) or a reset (ctx.abort(), so the step can start again):
//
//   fight.biscuit  Cedar Hill, day. Gus carries Biscuit's heavy ball (so he stays below 2 m)
//                  to the blanket while Biscuit charges (a 1 s crouch-and-wiggle first).
//                  Hide behind or under the benches. Drop the ball and he guards it.
//   stealth.strix  the Night Ramble. A ~100 m walk to her branch with a noise meter: moss is
//                  silent, leaf piles crunch, any flap fills it. Full: she swoops (a feather) and
//                  Gus is back on the last of 3 moss islands. After the 2nd catch: the flock decoy.
//   fight.vinnie   the Mall, Dusk. Rigby rigs the hot dog cart (30 s) while Vinnie swings his
//                  broom at Gus. He chases only within 10 m of his cart: fly off and he walks
//                  back, spots Rigby, and the step resets.
//   fight.rhoda    Harlem Meer, Afternoon. She circles, screeches, then dives (a shadow and a
//                  whistle) only when Gus is over the water and below 5 m. Mob her (Coo) while
//                  she skims after a dive: three mobs win. Pip practises dives as a telegraph.
//
// A hit costs one feather (Ruffled at 0: the attempt ends). After two hits in a fight
// its assist comes on for good (a slower Biscuit, the owl decoy, a lazier broom,
// Rhoda's dives telegraphed a second longer). Everything runs on the fixed clock.

import * as THREE from 'three';
import { FIGHTS, RAMBLE_STEALTH } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TITLES = { biscuit: 'Biscuit', strix: 'Professor Strix', vinnie: 'Vinnie', rhoda: 'Rhoda' };

function segDist(px, pz, a, b) {
  const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - a.x) * ex + (pz - a.z) * ez) / l2));
  return Math.hypot(px - (a.x + ex * t), pz - (a.z + ez * t));
}
export function pathDist(x, z, path = RAMBLE_STEALTH.path) {
  let d = Infinity;
  for (let i = 1; i < path.length; i++) d = Math.min(d, segDist(x, z, path[i - 1], path[i]));
  return d;
}
const inR = (p, c) => Math.hypot(p.x - c.x, p.z - c.z) <= c.r;

export class Fights {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'fights';
    this.f = null;          // the running fight
  }

  get st() { const s = this.G.state; if (!s.fights) s.fights = {}; return s.fights; }
  rec(name) { return this.st[name] || (this.st[name] = { losses: 0, assist: false, wins: 0 }); }

  async build() {
    const G = this.G;
    const E = G.schemes;
    E.registerScript('fight.biscuit', (ctx, done) => this.start('biscuit', ctx, done));
    E.registerScript('stealth.strix', (ctx, done) => this.start('strix', ctx, done));
    E.registerScript('fight.vinnie', (ctx, done) => this.start('vinnie', ctx, done));
    E.registerScript('fight.rhoda', (ctx, done) => this.start('rhoda', ctx, done));
    G.bus.on('ruffled', () => { if (this.f) this.#lose('ruffled'); });
    G.bus.on('coo', (t, e) => this.#onCoo(e));
    G.bus.on('drop', (t, e) => { if (this.f?.name === 'biscuit' && e.item === 'ball') this.f.guard = { x: e.x, z: e.z, t: 0 }; });
    G.bus.on('pickup', (t, e) => { if (this.f?.name === 'biscuit' && e.item === 'ball') { this.f.guard = null; this.f.state = 'rest'; this.f.t = 0; } });
    // Vinnie's broom (a role accessory on his right hand)
    if (G.humans.acc) {
      const pole = ruleMaterial({ color: 0x8a5a3a }), straw = ruleMaterial({ color: 0xd8b25a });
      G.humans.acc.broom = { bone: 'RightHand', make: () => { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.25, 6), pole); a.position.set(0, 0.05, 0.05); const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.06), straw); b.position.set(0, -0.6, 0.05); a.castShadow = b.castShadow = true; g.add(a, b); return g; } };
    }
    await this.#buildBiscuit();
    this.#buildStealth();
    // Rhoda's shadow on the water (the dive telegraph)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x101018, transparent: true, opacity: 0.5, depthWrite: false }));
    this.shadow.visible = false;
    this.group.add(this.shadow);
  }

  async #buildBiscuit() {
    const G = this.G, B = FIGHTS.biscuit;
    const baked = await G.registry.baked('bench');
    this.benches = [];
    for (const b of B.benches) {
      const y = G.terrain.heightAt(b.x, b.z);
      if (baked) {
        const m = new THREE.Mesh(baked.geometry, baked.makeMaterial());
        m.castShadow = true; m.receiveShadow = true;
        const h = new THREE.Group(); h.add(m); h.scale.x = -1; h.position.set(b.x, y, b.z); h.rotation.y = b.yaw;
        this.group.add(h);
      }
      // only the seat is solid: Gus fits underneath; Biscuit doesn't
      G.collision.addBox({ x: b.x, z: b.z, y0: y + 0.38, h: 0.12, w: 1.8, d: 0.5, yaw: b.yaw, tag: 'bench' });
      G.collision.addPerchEdge({ a: { x: b.x - Math.cos(b.yaw) * 0.8, y: y + 0.5, z: b.z + Math.sin(b.yaw) * 0.8 }, b: { x: b.x + Math.cos(b.yaw) * 0.8, y: y + 0.5, z: b.z - Math.sin(b.yaw) * 0.8 }, id: 'fight-bench', kind: 'bench' });
      this.benches.push({ ...b, y, c: Math.cos(b.yaw), s: Math.sin(b.yaw) });
    }
    // the blanket: a red-and-white check
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#c4302b' : '#f4eee0'; g.fillRect(i * 8, j * 8, 8, 8); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4).rotateX(-Math.PI / 2), ruleMaterial({ map: tex }));
    bl.position.set(B.blanket.x, G.terrain.heightAt(B.blanket.x, B.blanket.z) + 0.03, B.blanket.z);
    bl.rotation.y = 0.3; bl.receiveShadow = true;
    this.group.add(bl);
  }

  #buildStealth() {
    // three merged meshes (moss, islands with their stones, leaf piles): three draw calls for the whole route
    const G = this.G, R = RAMBLE_STEALTH;
    const y = (x, z) => G.surfaceY(x, z, G.terrain.heightAt(x, z) + 0.4) + 0.025;
    const at = (geo, x, yy, z, ry = 0) => geo.rotateY(ry).translate(x, yy, z);
    const moss = [], isle = [], stones = [], leaves = [];
    for (const m of R.moss) moss.push(at(new THREE.CircleGeometry(m.r, 18).rotateX(-Math.PI / 2), m.x, y(m.x, m.z), m.z));
    for (const m of R.islands) {
      isle.push(at(new THREE.CircleGeometry(m.r, 24).rotateX(-Math.PI / 2), m.x, y(m.x, m.z) + 0.01, m.z));
      for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; stones.push(at(new THREE.DodecahedronGeometry(0.12, 0), m.x + Math.cos(a) * m.r, y(m.x, m.z) + 0.04, m.z + Math.sin(a) * m.r)); }
    }
    for (const l of R.leaves) for (let k = 0; k < 9; k++) { const a = k * 2.4, rr = (k / 9) * l.r; leaves.push(at(new THREE.IcosahedronGeometry(0.22 + (k % 3) * 0.05, 0).scale(1.3, 0.35, 1), l.x + Math.cos(a) * rr, y(l.x, l.z) + 0.05 + (k % 2) * 0.04, l.z + Math.sin(a) * rr, a)); }
    const add = (list, mat) => { const g = mergeGeometries(list.map((q) => { const n = q.index ? q.toNonIndexed() : q; n.deleteAttribute('uv'); return n; }), false); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; this.group.add(m); };
    add(moss, ruleMaterial({ color: 0x6faa44, emissive: 0x2f6e1c, emissiveIntensity: 0.55 }));
    add(isle, ruleMaterial({ color: 0x5f9a3c, emissive: 0x2f6e1c, emissiveIntensity: 0.45 }));
    add(stones, ruleMaterial({ color: 0x8d877e }));
    add(leaves, ruleMaterial({ color: 0xf07a22, emissive: 0x5a2400, emissiveIntensity: 0.6 }));
  }

  // ------------------------------------------------------------ start, win, lose
  start(name, ctx, done) {
    const G = this.G;
    if (this.f) { ctx.abort(); return; }
    const r = this.rec(name);
    this.f = { name, ctx, done, t: 0, state: 'intro', hits: 0, assist: r.assist };
    const f = this.f;
    G.later(0, () => { for (const c of [f.dog, f.owl, f.rig, f.hawk, f.pip]) if (c) c.always = true; });
    G.audio.play(name === 'strix' ? 'owl-hoot' : name === 'rhoda' ? 'hawk-screech' : name === 'biscuit' ? 'dog-bark' : 'broom-swish', { at: G.gus.position });
    if (name === 'biscuit') {
      const c = G.chars.find('biscuit');
      f.dog = c; c.script = true; c.tween = null; c.act = null;
      f.state = 'rest'; f.t = 0.6;
      G.toast('Get the ball to his blanket!', { seconds: 3 });
    } else if (name === 'strix') {
      const R = RAMBLE_STEALTH;
      f.meter = 0; f.island = 0; f.catches = r.losses; f.decoy = 0; f.inLeaf = -1; f.flutter = false; f.state = 'walk'; f.coo = 0; f.risen = false;
      f.owl = G.chars.find('strix');
      if (f.owl) { f.owl.script = true; f.owl.tween = null; }
      G.toast('Quiet now. Flapping is the loudest sound in the woods.', { seconds: 4 });
      if (r.assist) G.toast('Stuck? Hold Coo on a moss island: your flock flies off the other way.', { seconds: 5 });
      void R;
    } else if (name === 'vinnie') {
      const V = FIGHTS.vinnie;
      f.vin = G.humans.byRole('vinnie')[0];
      f.rig = G.chars.find('rigby');
      f.progress = 0; f.state = 'chase'; f.cool = 0.8; f.away = 0;
      const a = f.vin;
      if (a) { a.script = true; a.mode = 'idle'; a.out = true; a.busy = true; a.spec.acc = a.spec.acc || []; if (!a.spec.acc.includes('broom')) a.spec.acc = [...(a.spec.acc || []), 'broom']; G.humans.redress(a); }
      if (f.rig) { f.rig.script = true; G.chars.moveTo(f.rig, { x: V.cart.x - 1.3, z: V.cart.z + 0.4 }, { kind: 'walk', secs: 1.5 }); }
      G.bubbles.add('Hey! That\'s MY cart!', { at: () => ({ x: a.x, y: (a.y || 0) + 2.05, z: a.z }), ttl: 2.4 });
      G.toast('Keep Vinnie busy while Rigby rigs the cart. Stay close!', { seconds: 4 });
    } else if (name === 'rhoda') {
      const H = FIGHTS.rhoda;
      f.hawk = G.chars.find('rhoda'); f.pip = G.chars.find('pip');
      f.mobs = 0; f.state = 'circle'; f.t = 0; f.ang = 0; f.rest = 2;
      const h = f.hawk;
      if (h) { h.script = true; h.tween = null; h.here = { x: H.centre.x, z: H.centre.z, scripted: true }; h.x = H.centre.x + H.circleR; h.z = H.centre.z; h.y = this.#water() + H.circleY; }
      if (f.pip) { f.pip.script = true; f.pip.here = { x: H.centre.x, z: H.centre.z, scripted: true }; f.pipHome = { x: H.centre.x - 8, z: H.centre.z + 6, y: this.#water() + 18 }; Object.assign(f.pip, { x: f.pipHome.x, y: f.pipHome.y, z: f.pipHome.z }); }
      G.toast('Over the water, low: she\'ll dive. Coo when she skims!', { seconds: 4 });
    }
  }

  #release() {
    const G = this.G, f = this.f;
    for (const c of [f.dog, f.owl, f.rig, f.hawk, f.pip]) if (c) { c.script = false; c.always = false; c.act = null; if (c === f.hawk || c === f.pip) G.chars.goHome(c); }
    if (f.vin) { const a = f.vin; a.script = false; a.busy = false; a.spec.acc = (a.spec.acc || []).filter((q) => q !== 'broom'); G.humans.redress(a); G.humans.goTo(a, a.home, 1.25, () => { a.mode = 'home'; a.yaw = a.home.yaw ?? a.yaw; }); }
    this.shadow.visible = false;
    this.f = null;
  }

  #win() {
    const G = this.G, f = this.f;
    const r = this.rec(f.name);
    r.wins++;
    G.audio.play('race-finish', { vol: 0.8 });
    const done = f.done;
    const name = f.name;
    if (name === 'biscuit') {
      G.items.take();
      G.chars.animate(f.dog, 'cheer', 2.4);
      G.audio.play('dog-happy-bark', { at: f.dog });
      G.say([{ who: 'biscuit', text: 'Best friends! Best friends FOREVER! You found my BALL!', voice: 'biscuit-join' }]);   // #43: the join bark, with its words
    } else if (name === 'strix') {
      G.items.take();
      G.say([{ who: 'strix', text: 'Very well. Class is in session, Gus. My spectacles! I barely heard you.', voice: 'strix-join' }]);   // #43
    } else if (name === 'vinnie') {
      G.chars.animate(f.rig, 'cheer', 2);
      G.audio.play('rig-start', { at: f.rig });
      G.bubbles.add('Ya flying RAT!', { at: () => ({ x: f.vin.x, y: (f.vin.y || 0) + 2.05, z: f.vin.z }), ttl: 2.5 });
      G.audio.voice('vinnie-flying-rat', { at: f.vin });   // #43: the shipped bark, now heard with its bubble
      G.say([{ who: 'rigby', text: 'She\'s rigged, boss. Hop in. Mind the mustard.' }]);
    } else if (name === 'rhoda') {
      G.audio.play('hawk-screech', { at: f.hawk });
      G.say([{ who: 'rhoda', text: 'Alright, ALRIGHT. Enough. You want to know why I raid the Meer? They spiked my ledge.' }]);
    }
    this.#release();
    done();
  }

  /** A hit (a feather) or the attempt ending. */
  #hit(why) {
    const G = this.G, f = this.f, r = this.rec(f.name);
    f.hits++;
    r.losses++;
    if (r.losses === 2 && !r.assist) {
      r.assist = true; f.assist = true;
      const msg = { biscuit: 'Biscuit\'s tiring. He\'s slower now.', strix: 'hold Coo on a moss island for a flock decoy.', vinnie: 'Vinnie\'s arm is getting tired. Lazier swings now.', rhoda: 'Watch Pip: Rhoda\'s dives come a second slower now.' }[f.name];
      G.later(1.2, () => G.toast('Assist on: ' + msg, { seconds: 6 }));
    }
    G.hurt(1);
    void why;
  }

  #lose(why) {
    const G = this.G, f = this.f;
    if (!f) return;
    const ctx = f.ctx;
    if (why === 'reset' && f.name === 'vinnie') G.toast('Vinnie spotted Rigby! He scurries off. Try again.', { kind: 'bad', seconds: 4 });
    else if (why === 'left') G.toast(f.name === 'biscuit' ? 'You left Cedar Hill. Biscuit goes back to moping.' : 'You left. Come back to try again.', { seconds: 3 });
    if (f.name === 'vinnie' && f.rig) { G.chars.moveTo(f.rig, { x: f.rig.x - 6, z: f.rig.z + 4 }, { kind: 'walk', secs: 1.2 }); }
    this.#release();
    ctx.abort();
    G.bus.emit('fail', { kind: 'fight', fight: f.name, why });   // fun pass (P7): the nudge comes sooner
  }

  // ------------------------------------------------------------ the fixed update
  update(dt) {
    const f = this.f;
    if (!f) return;
    const G = this.G;
    if (G.cutscene.locked || G.dialogue.open || G.ruffling) return;
    f.t += dt;
    if (f.name === 'biscuit') this.#biscuit(dt);
    else if (f.name === 'strix') this.#strix(dt);
    else if (f.name === 'vinnie') this.#vinnie(dt);
    else if (f.name === 'rhoda') this.#rhoda(dt);
  }

  // ---- Biscuit
  #hidden(p, from) {
    // under a bench, or a bench between him and Gus
    for (const b of this.benches) {
      const dx = p.x - b.x, dz = p.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) < 0.95 && Math.abs(lz) < 0.5) return 'under';
    }
    if (from) for (const b of this.benches) {
      for (let i = 1; i < 10; i++) {
        const t = i / 10, x = from.x + (p.x - from.x) * t, z = from.z + (p.z - from.z) * t;
        const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
        if (Math.abs(lx) < 0.95 && Math.abs(lz) < 0.45) return 'behind';
      }
    }
    return null;
  }
  #benchAt(x, z) {
    for (const b of this.benches) { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < 1.05 && Math.abs(lz) < 0.6) return b; }
    return null;
  }

  #biscuit(dt) {
    const G = this.G, f = this.f, B = FIGHTS.biscuit, d = f.dog, g = G.gus.position;
    if (Math.hypot(g.x - B.arena.x, g.z - B.arena.z) > B.arena.r + 6) { this.#lose('left'); return; }
    // delivered?
    if (G.state.carried?.id === 'ball' && Math.hypot(g.x - B.blanket.x, g.z - B.blanket.z) < 1.3 && g.y < G.terrain.heightAt(g.x, g.z) + 1.5) { this.#win(); return; }
    const place = (x, z) => { d.x = x; d.z = z; d.y = G.surfaceY(x, z, G.terrain.heightAt(x, z) + 0.5); };
    const speed = f.assist ? B.speedAssist : B.speed;
    // the ball on the ground: he guards it
    if (f.guard) {
      const gd = f.guard;
      const dist = Math.hypot(gd.x - d.x, gd.z - d.z);
      if (dist > 0.7 && gd.t === 0) { const k = Math.min(1, (4 * dt) / dist); place(d.x + (gd.x - d.x) * k, d.z + (gd.z - d.z) * k); d.yaw = Math.atan2(gd.x - d.x, gd.z - d.z); f.state = 'guard'; return; }
      gd.t += dt;
      if (gd.t > 0.2 && !d.act) G.chars.animate(d, 'sniff', 1.5);
      if (gd.t > B.guardSecs) { f.guard = null; f.state = 'rest'; f.t = 0; G.bubbles.add('…mine?', { at: () => ({ x: d.x, y: d.y + 1.5, z: d.z }), ttl: 1.5 }); }
      return;
    }
    if (f.state === 'rest') {
      // trot toward Gus (stopping ~9 m off, on the blanket's side), then pick a moment
      const gl = Math.hypot(g.x - d.x, g.z - d.z) || 1;
      const hx = g.x + ((B.blanket.x - g.x) / (Math.hypot(B.blanket.x - g.x, B.blanket.z - g.z) || 1)) * 9, hz = g.z + ((B.blanket.z - g.z) / (Math.hypot(B.blanket.x - g.x, B.blanket.z - g.z) || 1)) * 9;
      const dd = Math.hypot(hx - d.x, hz - d.z);
      if (dd > 0.5) { const k = Math.min(1, (2.4 * dt) / dd); place(d.x + (hx - d.x) * k, d.z + (hz - d.z) * k); }
      d.yaw = Math.atan2(g.x - d.x, g.z - d.z);
      if (f.t > B.rest && gl < 13) {
        const hid = this.#hidden(g, d);
        if (hid) { if (!d.act) G.chars.animate(d, 'sniff', 1.2); if (f.t > B.rest + 1.5 && !f.huffed) { f.huffed = true; G.bubbles.add(hid === 'under' ? 'Where\'d he GO?' : 'Hrrmf.', { at: () => ({ x: d.x, y: d.y + 1.5, z: d.z }), ttl: 1.6 }); } return; }
        f.huffed = false;
        f.state = 'wiggle'; f.t = 0; f.t0 = G.state.time;
        G.chars.animate(d, 'crouch', B.wiggle);
        G.audio.play('dog-bark', { at: d });
        G.bubbles.add('!', { kind: 'clue', at: () => ({ x: d.x, y: d.y + 1.6, z: d.z }), ttl: B.wiggle });
      }
      return;
    }
    if (f.state === 'wiggle') {
      d.yaw = Math.atan2(g.x - d.x, g.z - d.z);
      if (f.t >= B.wiggle) {
        // lock onto where Gus is now, and go
        const dx = g.x - d.x, dz = g.z - d.z, l = Math.hypot(dx, dz) || 1;
        f.dir = { x: dx / l, z: dz / l }; f.run = Math.min(l + 3, 16); f.state = 'charge'; f.t = 0;
        G.chars.animate(d, 'charge', f.run / speed);
      }
      return;
    }
    if (f.state === 'charge') {
      const step = speed * dt;
      const nx = d.x + f.dir.x * step, nz = d.z + f.dir.z * step;
      const bench = this.#benchAt(nx, nz);
      if (bench) { f.state = 'rest'; f.t = 0; d.act = null; G.audio.play('drop-thud', { at: d }); G.bubbles.add('BONK.', { at: () => ({ x: d.x, y: d.y + 1.5, z: d.z }), ttl: 1.4 }); G.particles.burst('dust', d.x, d.y + 0.2, d.z, 8); return; }
      place(nx, nz); d.yaw = Math.atan2(f.dir.x, f.dir.z);
      f.run -= step;
      if (Math.hypot(g.x - d.x, g.z - d.z) < B.hitR && g.y < d.y + 1.3 && !this.#hidden(g, null)) {
        G.audio.play('biscuit-tackle', { at: g });
        g.x += f.dir.x * 1.4; g.z += f.dir.z * 1.4;
        f.state = 'rest'; f.t = 0; d.act = null;
        this.#hit('tackle');
        return;
      }
      if (f.run <= 0 || Math.hypot(d.x - B.arena.x, d.z - B.arena.z) > B.arena.r) { f.state = 'rest'; f.t = 0; d.act = null; }
    }
  }

  // ---- Strix
  #strix(dt) {
    const G = this.G, f = this.f, R = RAMBLE_STEALTH, M = R.meter, gus = G.gus, g = gus.position, inp = G.input;
    const br = R.branch;
    if (Math.hypot(g.x - br.x, g.z - br.z) < 2.6 && gus.grounded) { this.#win(); return; }
    const off = pathDist(g.x, g.z);
    if (off > 22) { this.#lose('left'); return; }
    // checkpoints
    R.islands.forEach((is, i) => { if (i > f.island && inR(g, is)) { f.island = i; G.toast('Moss island: safe spot.', { seconds: 2 }); } });
    const onMoss = R.moss.some((m) => inR(g, m)) || R.islands.some((m) => inR(g, m));
    const rising = f.decoy <= 0;
    let dm = 0;
    if (inp.pressed('flap') || gus.mode === 'takeoff') { dm = M.flap; }
    else if (gus.mode === 'fly') { if (!f.flutter) { f.flutter = true; dm = 25; } }
    else {
      f.flutter = false;
      const moving = gus.speed > 0.1;
      if (!moving || onMoss) dm = -M.calm * dt;
      else if (off > R.width) dm = M.offPath * dt;
      else dm = (gus.sprinting ? M.sprint : M.walk) * dt;
      // leaf piles crunch once per entry
      const li = R.leaves.findIndex((l) => inR(g, l));
      if (li >= 0 && li !== f.inLeaf) { dm += M.leaf; G.audio.play('leaves-crunch', { at: g, vol: 0.9 }); G.particles.leafBurst(g.x, g.y + 0.1, g.z, 10); }
      f.inLeaf = li;
      if (onMoss && moving) { f.mossT = (f.mossT || 0) - dt; if (f.mossT <= 0) { G.audio.play('moss-step', { at: g, vol: 0.25 }); f.mossT = 0.4; } }
    }
    if (dm > 0 && !rising) dm = 0;
    f.meter = Math.max(0, Math.min(100, f.meter + dm));
    if (f.decoy > 0) {
      f.decoy -= dt;
      if (f.owl) f.owl.yaw += (Math.atan2(f.decoyDir.x, f.decoyDir.z) - f.owl.yaw) * Math.min(1, dt * 4);
    } else if (f.owl && !f.owl.tween) f.owl.yaw = Math.atan2(g.x - f.owl.x, g.z - f.owl.z);
    // the decoy: hold Coo on a moss island (offered after the 2nd catch)
    if (f.assist && R.islands.some((m) => inR(g, m)) && inp.held('coo')) {
      f.coo += dt;
      if (f.coo > 0.35 && f.decoy <= 0) {
        const flock = G.flock;
        f.decoyDir = { x: -(br.x - g.x), z: -(br.z - g.z) };
        const l = Math.hypot(f.decoyDir.x, f.decoyDir.z) || 1; f.decoyDir.x /= l; f.decoyDir.z /= l;
        flock.swarmAt(new THREE.Vector3(g.x + f.decoyDir.x * 14, g.y + 6, g.z + f.decoyDir.z * 14), R.decoySecs * 0.6);
        f.decoy = R.decoySecs;
        G.audio.play('flock-swarm', { at: g });
        G.toast('Decoy! She\'s looking the other way.', { seconds: 3 });
      }
    } else f.coo = 0;
    if (f.meter > 70 && !f.risen) { f.risen = true; G.audio.play('owl-danger-riser', { vol: 0.7 }); }
    if (f.meter < 40) f.risen = false;
    if (f.meter >= 100) {
      // she swoops
      f.catches++;
      G.audio.play('owl-spotted-sting');
      if (f.owl) { const o = f.owl, home = { x: o.x, y: o.y, z: o.z }; G.chars.moveTo(o, { x: g.x, z: g.z, y: g.y + 0.4 }, { kind: 'fly', secs: 0.6, done: () => G.chars.moveTo(o, home, { kind: 'fly', secs: 1.2 }) }); }
      G.particles.burst('feathers', g.x, g.y + 0.3, g.z, 16);
      f.meter = 0; f.inLeaf = -1;
      const lastFeather = G.state.feathers <= 1;
      this.#hit('caught');
      if (!lastFeather && this.f) {
        const is = R.islands[f.island];
        gus.place({ x: is.x, z: is.z, y: G.surfaceY(is.x, is.z, G.terrain.heightAt(is.x, is.z) + 0.5), yaw: Math.atan2(br.x - is.x, br.z - is.z), mode: 'walk' });
        G.flock.place(G.leader());
        G.rig.yaw = gus.yaw;
        G.bubbles.add('Hoo. I HEARD that.', { at: () => ({ x: f.owl?.x ?? g.x, y: (f.owl?.y ?? g.y) + 0.8, z: f.owl?.z ?? g.z }), ttl: 2.2, range: 80 });
      }
    }
  }

  // ---- Vinnie
  #vinnie(dt) {
    const G = this.G, f = this.f, V = FIGHTS.vinnie, a = f.vin, g = G.gus.position;
    if (!a) { this.#win(); return; }
    const cart = V.cart;
    const gy = G.terrain.heightAt(g.x, g.z);
    const away = Math.hypot(g.x - cart.x, g.z - cart.z) > V.leash || g.y > gy + V.flyHigh;
    f.away = away ? f.away + dt : 0;
    if (f.rig && !f.rig.tween && !f.rig.act && f.state !== 'return') G.chars.animate(f.rig, 'rig', 2);
    const walk = f.assist ? V.walkAssist : V.walk;
    const step = (tx, tz, sp) => {
      const dx = tx - a.x, dz = tz - a.z, l = Math.hypot(dx, dz);
      if (l < 0.05) { a.speed = 0; return l; }
      const m = Math.min(l, sp * dt);
      a.x += (dx / l) * m; a.z += (dz / l) * m; a.yaw = Math.atan2(dx, dz); a.speed = sp;
      return l;
    };
    if (f.state === 'return' || f.away > 1.2) {
      if (f.state !== 'return') { f.state = 'return'; G.bubbles.add('Hmph. Where\'d it go…', { at: () => ({ x: a.x, y: (a.y || 0) + 2.05, z: a.z }), ttl: 2 }); }
      if (!away && Math.hypot(g.x - a.x, g.z - a.z) < 6) { f.state = 'chase'; f.away = 0; return; }
      const l = step(cart.x + 1.2, cart.z, walk);
      if (l < 1.6) { G.bubbles.add('HEY! Get away from my CART!', { at: () => ({ x: a.x, y: (a.y || 0) + 2.05, z: a.z }), ttl: 2.5 }); this.#lose('reset'); }
      return;
    }
    // Rigby rigs while Vinnie's busy with Gus
    f.progress += dt;
    if (f.progress >= V.rigSecs) { this.#win(); return; }
    const d = Math.hypot(g.x - a.x, g.z - a.z);
    const windup = f.assist ? V.windupAssist : V.windup;
    if (f.state === 'chase') {
      f.cool -= dt;
      if (d > V.reach * 0.85) step(g.x, g.z, walk);
      else { a.speed = 0; a.yaw = Math.atan2(g.x - a.x, g.z - a.z); }
      if (d < V.reach + 0.35 && f.cool <= 0) {
        f.state = 'windup'; f.t = 0; a.speed = 0;
        G.humans.play(a, 'scold', windup + 0.3);
        G.bubbles.add('!', { kind: 'clue', at: () => ({ x: a.x, y: (a.y || 0) + 2.15, z: a.z }), ttl: windup });
      }
    } else if (f.state === 'windup') {
      a.yaw = Math.atan2(g.x - a.x, g.z - a.z);
      if (f.t >= windup) {
        G.audio.play('broom-swish', { at: a });
        const from = new THREE.Vector3(a.x, (a.y ?? gy) + 0.5, a.z), to = new THREE.Vector3(g.x, g.y + 0.15, g.z);
        const blocked = G.collision.raySolid(from, to, 8) < 1;
        if (d < V.reach + 0.2 && !blocked && g.y < gy + 1.8) {
          const l = d || 1; g.x += ((g.x - a.x) / l) * 1.0; g.z += ((g.z - a.z) / l) * 1.0;
          G.audio.play('biscuit-tackle', { at: g, vol: 0.6, rate: 1.3 });
          this.#hit('broom');
        } else if (blocked) G.bubbles.add('Ow! Who PUT that there?!', { at: () => ({ x: a.x, y: (a.y || 0) + 2.05, z: a.z }), ttl: 1.6 });
        f.state = 'chase'; f.cool = V.cooldown * (f.assist ? 1.6 : 1); f.t = 0;
      }
    }
  }

  // ---- Rhoda
  #water() { const H = FIGHTS.rhoda; const w = this.G.collision.waterAt(H.centre.x, H.centre.z); return w ? w.level : -0.8; }

  #rhoda(dt) {
    const G = this.G, f = this.f, H = FIGHTS.rhoda, h = f.hawk, g = G.gus.position;
    if (!h) { this.#win(); return; }
    if (Math.hypot(g.x - H.centre.x, g.z - H.centre.z) > 75) { this.#lose('left'); return; }
    const wl = this.#water();
    const overWater = !!G.collision.waterAt(g.x, g.z) && g.y < wl + H.below;
    const tele = f.assist ? H.telegraphAssist : H.telegraph;
    const circle = () => {
      f.ang += dt * 0.45;
      const tx = H.centre.x + Math.cos(f.ang) * H.circleR, tz = H.centre.z + Math.sin(f.ang) * H.circleR, ty = wl + H.circleY;
      h.x += (tx - h.x) * Math.min(1, dt * 1.5); h.z += (tz - h.z) * Math.min(1, dt * 1.5); h.y += (ty - h.y) * Math.min(1, dt * 1.2);
      h.yaw = Math.atan2(-Math.sin(f.ang), Math.cos(f.ang));
    };
    if (f.pipDive) {   // Pip's practice dive (a free telegraph)
      const p = f.pip, k = Math.min(1, (f.t - f.pipDive) / 1.2), e = Math.sin(Math.PI * k);
      if (p) { p.x = f.pipHome.x + 6 * k; p.z = f.pipHome.z; p.y = f.pipHome.y - e * 14; p.yaw = 1.57; }
      if (k >= 1) f.pipDive = 0;
    }
    if (f.state === 'circle') {
      circle();
      this.shadow.visible = false;
      f.rest -= dt;
      if (f.rest <= 0 && overWater) {
        f.state = 'tele'; f.t = 0;
        G.audio.play('hawk-screech', { at: h });
        G.audio.play('hawk-dive-whistle', { at: g });
        f.pipDive = 0.001;
      }
    } else if (f.state === 'tele') {
      circle();
      this.shadow.visible = true;
      const k = f.t / tele;
      this.shadow.position.set(g.x, wl + 0.03, g.z);
      this.shadow.scale.setScalar(1.6 - 0.8 * k);
      this.shadow.material.opacity = 0.25 + 0.4 * k;
      if (!overWater) { f.state = 'circle'; f.rest = 0.6; return; }
      if (f.t >= tele) { f.state = 'dive'; f.t = 0; f.from = { x: h.x, y: h.y, z: h.z }; f.to = { x: g.x, y: Math.max(wl + 0.6, g.y), z: g.z }; }
    } else if (f.state === 'dive') {
      const k = Math.min(1, f.t / H.diveSecs), e = k * k;
      h.x = f.from.x + (f.to.x - f.from.x) * k; h.z = f.from.z + (f.to.z - f.from.z) * k; h.y = f.from.y + (f.to.y - f.from.y) * e;
      h.yaw = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
      if (!h.act) G.chars.animate(h, 'swoop', H.diveSecs);
      if (k >= 1) {
        this.shadow.visible = false;
        G.particles.splash(h.x, wl, h.z, 16);
        if (Math.hypot(g.x - h.x, g.z - h.z) < H.hitR && Math.abs(g.y - h.y) < 1.6) { G.audio.play('biscuit-tackle', { at: g, rate: 1.4 }); this.#hit('talons'); }
        if (!this.f) return;
        f.state = 'skim'; f.t = 0;
        f.skimDir = { x: Math.sin(h.yaw), z: Math.cos(h.yaw) };
        G.bubbles.add('Now! Coo!', { kind: 'clue', at: () => ({ x: h.x, y: h.y + 0.8, z: h.z }), ttl: H.skimSecs, range: 80 });
      }
    } else if (f.state === 'skim') {
      h.x += f.skimDir.x * 1.6 * dt; h.z += f.skimDir.z * 1.6 * dt; h.y += (wl + 1.2 - h.y) * Math.min(1, dt * 4);
      if (f.t >= H.skimSecs) { f.state = 'climb'; f.t = 0; }
    } else if (f.state === 'climb') {
      circle();
      if (f.t > 1.5) { f.state = 'circle'; f.rest = H.rest; }
    }
  }

  #onCoo(e) {
    const f = this.f;
    if (f) e.handled = true;   // Fixes-3 (R2): a swarm in a fight is never "nobody to mob"
    if (!f || f.name !== 'rhoda' || f.state !== 'skim') return;
    const G = this.G, h = f.hawk, g = G.gus.position, H = FIGHTS.rhoda;
    if (Math.hypot(g.x - h.x, g.z - h.z) > H.mobR || Math.abs(g.y - h.y) > 3) return;
    f.mobs++;
    G.flock.swarmAt(new THREE.Vector3(h.x, h.y + 0.5, h.z), 1.6);
    G.audio.play('flock-swarm', { at: h });
    G.audio.play('hawk-screech', { at: h, rate: 1.2 });
    G.particles.burst('feathers', h.x, h.y + 0.3, h.z, 18, { color: [0.62, 0.42, 0.3] });
    G.toast(`Mobbed! ${f.mobs} of ${H.mobs}`, { kind: 'stamp' });
    f.state = 'climb'; f.t = 0;
    if (f.mobs >= H.mobs) this.#win();
  }

  // ------------------------------------------------------------ HUD, music, naps
  panel() {
    const f = this.f;
    if (!f) return '';
    const row = (inner) => `<div class="row">${inner}</div>`;
    const meter = (v, calm) => `<span class="meter${calm ? ' calm' : ''}" style="width:150px"><i style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></i></span>`;
    const hint = (t, warn) => `<span class="${warn ? 'warn' : 'sub'}">${t}</span>`;
    if (f.name === 'biscuit') {
      const h = f.state === 'wiggle' ? hint('He\'s about to charge!', true) : f.guard ? hint('He\'s guarding the ball. Wait him out.') : hint('Ball to his blanket. Benches hide you.');
      return row(`<b>Biscuit</b>${h}`);
    }
    if (f.name === 'strix') {
      const m = f.meter;
      return row(`<b>Noise</b>${meter(m, m < 40)}${f.decoy > 0 ? hint('Decoy! She\'s looking away.') : m > 70 ? hint('Too loud! Stand still.', true) : hint('Walk. Moss is silent.')}`);
    }
    if (f.name === 'vinnie') {
      const h = f.state === 'return' ? hint('Too far! Back to the cart!', true) : f.state === 'windup' ? hint('Broom!', true) : hint('Keep Vinnie busy near his cart.');
      return row(`<b>Rigging</b>${meter((f.progress / FIGHTS.vinnie.rigSecs) * 100, true)}${h}`);
    }
    if (f.name === 'rhoda') {
      const pips = Array.from({ length: FIGHTS.rhoda.mobs }, (_, i) => `<i class="${i < f.mobs ? 'on' : ''}"></i>`).join('');
      const h = f.state === 'tele' ? hint('Her shadow! Move!', true) : f.state === 'skim' ? hint('She\'s low: Coo!', true) : hint('Low over the water. Coo when she skims.');
      return row(`<b>Rhoda</b><span class="pips">${pips}</span>${h}`);
    }
    return '';
  }

  music() { return this.f ? (this.f.name === 'strix' ? 'stealth' : 'encounter') : null; }
  napBlock() { return this.f ? 'Not during a fight' : null; }
  get active() { return this.f?.name || null; }

  onNap() { if (this.f) this.#lose('left'); return []; }
  restore() { if (this.f) { const f = this.f; this.#release(); void f; } }

  debug() {
    const f = this.f;
    const rec = this.G.state?.fights || {};
    if (!f) return { active: null, record: rec };
    const o = { active: f.name, state: f.state, t: +f.t.toFixed(2), hits: f.hits, assist: !!f.assist, record: rec };
    if (f.name === 'strix') Object.assign(o, { meter: +f.meter.toFixed(1), island: f.island, decoy: +f.decoy.toFixed(1) });
    if (f.name === 'vinnie') Object.assign(o, { progress: +f.progress.toFixed(1), vin: f.vin ? { x: +f.vin.x.toFixed(1), z: +f.vin.z.toFixed(1) } : null });
    if (f.name === 'rhoda') Object.assign(o, { mobs: f.mobs, hawk: f.hawk ? { x: +f.hawk.x.toFixed(1), y: +f.hawk.y.toFixed(1), z: +f.hawk.z.toFixed(1) } : null });
    if (f.name === 'biscuit') Object.assign(o, { dog: { x: +f.dog.x.toFixed(1), z: +f.dog.z.toFixed(1) }, guard: !!f.guard });
    return o;
  }
}
