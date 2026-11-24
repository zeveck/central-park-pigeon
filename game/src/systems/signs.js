// Thread 1, the Sign War: the 30 "DON'T FEED THE BIRDS" signs.
//   flip      peck the loose "DON'T" plate off (S, M1/M3/M4/M7, N1/N2), or paint it out with the pen
//   feeders   within 10 s, 2–4 people wander over and toss a pile (12; 20 at Afternoon; 8 at Dusk;
//             nobody feeds at Night) that waits until eaten; +3 crumbs a minute while the sign stays live;
//             a sign within 10 m of a spiked perch pays nothing
//   rangers   3 game minutes after a flip (Morning to Dusk) the region's cart comes and flips it back
//   permanent a region whose cart is sabotaged keeps its flips for good; city signs are permanent at once
//   income    each permanent sign pays +3 crumbs on waking from a nap; Bread Power counts them
// The visuals are five InstancedMeshes (posts, backs, the two faces, the strip and the stamp).

import * as THREE from 'three';
import { SIGNS, SIGN_RULES, SPIKE_SITES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { rngFor } from '../core/rng.js';
import { derived } from '../state/gamestate.js';   // fix-38

const POST_H = 0.9, PLATE = { w: 0.62, h: 0.44, y: 0.68 };
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function textTexture(draw, w = 512, h = 364) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // the world is drawn through a mirrored root: flip the text back
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1;
  return t;
}
const FONT = (px, w = 700) => `${w} ${px}px Fredoka, Nunito, sans-serif`;

function faceDont(g, w, h) {
  g.fillStyle = '#f4eedf'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2d4a2a'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#2d4a2a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = FONT(72); g.fillText('FEED', w / 2, h * 0.6);
  g.font = FONT(60); g.fillText('THE BIRDS', w / 2, h * 0.82);
}
function faceFeed(g, w, h) {
  g.fillStyle = '#f6c84a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b85e25'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#7a3a12'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = FONT(92); g.fillText('FEED', w / 2, h * 0.33);
  g.font = FONT(74); g.fillText('THE BIRDS', w / 2, h * 0.62);
  const r = rngFor('crumbs-face');
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#c98a3a' : '#e6b060'; g.beginPath(); g.arc(40 + r() * (w - 80), h * 0.8 + r() * h * 0.1, 5 + r() * 5, 0, 6.3); g.fill(); }
}
function stripDont(g, w, h) {
  g.fillStyle = '#c4302b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = FONT(100); g.fillText("DON'T", w / 2, h * 0.55);
}
function stamp(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.translate(w / 2, h / 2); g.rotate(-0.25);
  g.strokeStyle = '#c4302b'; g.lineWidth = 14; g.beginPath(); g.arc(0, 0, w * 0.42, 0, 6.3); g.stroke();
  g.fillStyle = '#c4302b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(44); g.fillText('PERMANENT', 0, 4);
}

export class Signs {
  constructor(G) {
    this.G = G;
    this.list = SIGNS.map((s) => ({ ...s, y: 0, pending: false, feedAt: null, flyT: 0 }));
    this.byId = Object.fromEntries(this.list.map((s) => [s.id, s]));
    this.group = new THREE.Group();
    this.group.name = 'signs';
    this.flying = [];   // plates popping off
  }

  get st() { return this.G.state.signs; }

  build() {
    const G = this.G;
    for (const s of this.list) s.y = G.surfaceY(s.x, s.z, G.terrain.heightAt(s.x, s.z) + 0.5);
    const n = this.list.length;
    const green = ruleMaterial({ color: 0x2d4a2a });
    const mk = (geo, mat, name) => { const m = new THREE.InstancedMesh(geo, mat, n); m.name = name; m.castShadow = (name === 'sign-posts' || name === 'sign-backs') && this.G.preset?.id !== 'low'; /* perf pass: no sign shadows on Low */ m.receiveShadow = true; m.frustumCulled = false; this.group.add(m); return m; };
    const plane = (w, h) => new THREE.PlaneGeometry(w, h);
    // Fixes-2 (P9): the post stands BEHIND the board (it ran up the middle of the face, through the lettering); render only,
    // the collision cylinder below is unchanged
    this.posts = mk(new THREE.CylinderGeometry(0.035, 0.04, POST_H, 8).translate(0, POST_H / 2, -0.058), green, 'sign-posts');
    this.backs = mk(new THREE.BoxGeometry(PLATE.w, PLATE.h, 0.03).translate(0, PLATE.y, 0), green, 'sign-backs');
    this.texDont = textTexture(faceDont); this.texFeed = textTexture(faceFeed);
    this.texStrip = textTexture(stripDont, 512, 128); this.texStamp = textTexture(stamp, 256, 256);
    this.faceA = mk(plane(PLATE.w - 0.04, PLATE.h - 0.04).translate(0, PLATE.y, 0.016), ruleMaterial({ map: this.texDont }), 'sign-face-dont');
    this.faceB = mk(plane(PLATE.w - 0.04, PLATE.h - 0.04).translate(0, PLATE.y, 0.016), ruleMaterial({ map: this.texFeed, emissive: 0x332200 }), 'sign-face-feed');
    this.stripGeo = plane(PLATE.w - 0.04, 0.13).translate(0, PLATE.y + 0.12, 0.022);
    this.stripMat = ruleMaterial({ map: this.texStrip });
    this.strips = mk(this.stripGeo, this.stripMat, 'sign-strips');
    this.stamps = mk(plane(0.2, 0.2).translate(0.19, PLATE.y - 0.13, 0.026), ruleMaterial({ map: this.texStamp, transparent: true }), 'sign-stamps');
    for (const s of this.list) {
      G.collision.addCylinder({ x: s.x, z: s.z, y0: s.y, h: POST_H, r: 0.05, tag: 'sign', walkable: false });
      G.collision.addPerchEdge({ a: { x: s.x - Math.cos(s.yaw) * 0.25, y: s.y + PLATE.y + PLATE.h / 2 + 0.01, z: s.z + Math.sin(s.yaw) * 0.25 }, b: { x: s.x + Math.cos(s.yaw) * 0.25, y: s.y + PLATE.y + PLATE.h / 2 + 0.01, z: s.z - Math.sin(s.yaw) * 0.25 }, id: 'sign-' + s.id, kind: 'sign', out: s.yaw });
      G.interact.register({
        id: 'sign:' + s.id, kind: 'sign', x: s.x + Math.sin(s.yaw) * 0.35, y: s.y, z: s.z + Math.cos(s.yaw) * 0.35, r: 1.5, priority: 4,
        label: () => this.#label(s), act: () => this.#peck(s),
      });
    }
    this.refresh();
  }

  #label(s) {
    const st = this.st[s.id];
    if (st.flipped) return null;
    if (s.flip === 'pen') return this.G.state.gear.includes('pen') ? 'Paint the sign' : 'Enamel sign';
    return 'Peck the sign';
  }

  #peck(s) {
    const G = this.G;
    if (s.flip === 'pen' && !G.state.gear.includes('pen')) { G.toast("It's enamel. You'd need a paint pen."); G.audio.play('peck', { at: s }); return; }
    if (s.needs === 'sunglasses' && !G.state.gear.includes('sunglasses')) { G.toast('A waiter shoos you off the terrace. In disguise, maybe?'); return; }
    if (this.flip(s.id)) this.#glance(s);
  }

  /** Fixes-2 (P9, M7): pecked from behind, the camera only saw the green back of the board. Swing the view round to
   *  its face for a moment (render only: camera-rig.js glance never touches the rig's yaw, so input is unchanged). */
  #glance(s) {
    const G = this.G, cam = G.dataCam?.position;
    if (!cam || G.cutscene.running || !G.rig.glance) return;
    const nx = Math.sin(s.yaw), nz = Math.cos(s.yaw);
    if ((cam.x - s.x) * nx + (cam.z - s.z) * nz > 0.2) return;   // already in front of it
    const side = (G.gus.position.x - s.x) * nz - (G.gus.position.z - s.z) * nx > 0 ? 1 : -1;
    const y = s.y + PLATE.y;
    G.rig.glance({ pos: [s.x + nx * 2.3 + nz * side * 0.9, y + 0.45, s.z + nz * 2.3 - nx * side * 0.9], look: [s.x - nz * side * 0.25, y - 0.12, s.z + nx * side * 0.25], secs: 1.9 });
  }

  /** Flip a sign to FEED THE BIRDS. */
  flip(id, { quiet = false } = {}) {
    const G = this.G, s = this.byId[id], st = this.st[id];
    if (!s || st.flipped) return false;
    st.flipped = true;
    st.at = G.state.time;
    st.permanent = this.#permanentRegion(s.region);
    st.revertAt = st.permanent ? 0 : G.state.time + SIGN_RULES.revertAfter;
    G.state.stats.flips++;
    s.pending = false;
    // the plate pops off and spins away
    if (!quiet) {
      const m = new THREE.Mesh(this.stripGeo, this.stripMat);
      m.position.set(s.x, s.y, s.z);
      m.rotation.y = s.yaw;
      const out = 1.5 + rngFor('pop' + id + G.state.stats.flips)() ;
      this.flying.push({ m, t: 0, vx: Math.sin(s.yaw) * out + Math.cos(s.yaw) * 0.6, vz: Math.cos(s.yaw) * out - Math.sin(s.yaw) * 0.6, vy: 3.2, x: s.x, y: s.y, z: s.z, spin: 9 });
      this.group.add(m);
      G.audio.play('sign-plate-pop', { at: s });
      G.audio.play('crowd-ooh', { at: s, vol: 0.5 });
      G.particles.burst('dust', s.x, s.y + PLATE.y + 0.15, s.z, 6, { spread: 0.3 });
      G.toast('FEED THE BIRDS', { kind: 'stamp' });
      if (st.permanent) G.later(0.9, () => { G.toast('This sign is now PERMANENT', { kind: 'stamp' }); G.audio.play('permanent-stamp', { at: s }); });
    }
    // feeders come within 10 s
    const r = rngFor('feed:' + id + ':' + G.state.stats.flips);
    s.feedAt = G.state.time + 1.5 + r() * 1.5;   // they set off at once; walking over takes the rest of the 10 s
    s.feeders = 2 + Math.floor(r() * 3);
    this.refresh();
    G.bus.emit('flip', { sign: id });
    return true;
  }

  /** A ranger (or a nap) puts the "DON'T" plate back. */
  revert(id, { quiet = false } = {}) {
    const st = this.st[id], s = this.byId[id];
    if (!st.flipped || st.permanent) return false;
    st.flipped = false;
    st.revertAt = 0;
    s.pending = false;
    s.feedAt = null;
    this.refresh();
    if (!quiet) {
      this.G.audio.play('ranger-tut', { at: s });
      // fix-38: a flip counts as Bread Power, so a ranger's fix says it takes one off
      this.G.toast(`A ranger flipped a sign back. Bread Power ${derived(this.G.state).breadPower}/30`, { kind: 'bad' });
    }
    this.G.bus.emit('revert', { sign: id });
    return true;
  }

  #permanentRegion(region) { return region === 'city' || !!this.G.state.carts[region]; }

  /** A region's cart is sabotaged: every flipped sign there is permanent from now on. */
  sabotage(region) {
    const G = this.G;
    G.state.carts[region] = true;
    for (const s of this.list) if (s.region === region && this.st[s.id].flipped) { this.st[s.id].permanent = true; this.st[s.id].revertAt = 0; }
    this.refresh();
  }

  live(id) { return !!this.st[id]?.flipped; }

  spikedNear(s) {
    const sp = this.G.state.spikes;
    return SPIKE_SITES.some((p) => sp[p.id] === 'installed' && Math.hypot(p.x - s.x, p.z - s.z) < SIGN_RULES.spikeRadius + (p.r || 0));
  }

  update(dt) {
    const G = this.G, t = G.state.time, phase = G.state.phase;
    for (const s of this.list) {
      const st = this.st[s.id];
      if (!st.flipped) continue;
      if (phase === 'night' && st.revertAt) st.revertAt += dt;   // timers count Morning to Dusk only
      // feeders
      if (s.feedAt != null && t >= s.feedAt) {
        s.feedAt = null;
        const amount = SIGN_RULES.pile[phase] || 0;
        if (amount > 0) {
          const spiked = this.spikedNear(s);
          G.humans.summonFeeders(s, s.feeders || 2, () => {
            if (spiked) { G.toast('Spikes nearby: no pigeon can land here.', { kind: 'bad' }); return; }
            const fx = s.x + Math.sin(s.yaw) * 1.1, fz = s.z + Math.cos(s.yaw) * 1.1;
            G.food.addPile(fx, fz, amount, { sign: s.id, kind: 'crumbs' });   // Fixes-2: M7's picnickers toss crumbs; their peas they keep (den-ducks)
            G.bus.emit('fed', { sign: s.id, amount });
          });
        }
      }
      // the trickle while it stays live
      if (phase !== 'night' && !this.spikedNear(s)) {
        const p = G.food.pileFor(s.id);
        if (p) p.amount += (SIGN_RULES.trickle / 60) * dt;
      }
      // the ranger's revert
      if (!st.permanent && st.revertAt && t >= st.revertAt && !s.pending && phase !== 'night') {
        s.pending = true;
        G.rangers.requestRevert(s.id);
      }
    }
    for (const f of [...this.flying]) {
      f.t += dt;
      f.vy -= 9.8 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.m.position.set(f.x, f.y, f.z);
      f.m.rotation.x += f.spin * dt; f.m.rotation.z += f.spin * 0.6 * dt;
      if (f.t > 1.6) { f.m.removeFromParent(); this.flying = this.flying.filter((q) => q !== f); }
    }
  }

  refresh() {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    this.list.forEach((s, i) => {
      const st = this.st[s.id];
      M.compose(P.set(s.x, s.y, s.z), Q.setFromAxisAngle(up, s.yaw), S1);
      this.posts.setMatrixAt(i, M); this.backs.setMatrixAt(i, M);
      this.faceA.setMatrixAt(i, st.flipped ? ZERO : M);
      this.strips.setMatrixAt(i, st.flipped ? ZERO : M);
      this.faceB.setMatrixAt(i, st.flipped ? M : ZERO);
      this.stamps.setMatrixAt(i, st.permanent ? M : ZERO);
    });
    for (const m of [this.posts, this.backs, this.faceA, this.faceB, this.strips, this.stamps]) m.instanceMatrix.needsUpdate = true;
  }

  /** The nap rule: every non-permanent flip is flipped back; permanent signs pay on waking. */
  onNap() {
    let fixed = 0;
    for (const s of this.list) { if (this.st[s.id].flipped && !this.st[s.id].permanent) { this.revert(s.id, { quiet: true }); fixed++; } s.pending = false; s.feedAt = null; }
    const perm = this.list.filter((s) => this.st[s.id].permanent).length;
    const notes = [];
    if (fixed) notes.push(`Rangers fixed ${fixed} sign${fixed > 1 ? 's' : ''} while you slept (Bread Power ${derived(this.G.state).breadPower}/30).`);
    if (perm) { this.G.state.crumbs += perm * SIGN_RULES.napIncome; notes.push(`Permanent signs paid ${perm * SIGN_RULES.napIncome} crumbs.`); }
    return notes;
  }

  summary() {
    const o = {};
    for (const s of this.list) { const st = this.st[s.id]; o[s.id] = st.permanent ? 'permanent' : st.flipped ? 'flipped' : 'dont'; }
    return o;
  }
}
