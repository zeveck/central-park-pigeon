// Driving ("Controls → Driving"): Vinnie's hot dog cart, the pedicab, the RC
// tug on Conservatory Water and the Wollman Rink Zamboni. Peck a rigged
// vehicle to get in (the RC tug needs the remote: Gus stays on the shore and
// the camera follows the boat); E gets out. Steer A/D (or the stick), gas W /
// Flap, brake then reverse S / Dive, F is the horn (a coo).
//
// The Zamboni slides on the ice (4 m/s, 1.3 m/s², a lazy drift, a ~3 m braking
// slide, a padded bump off the boards that keeps half the speed) and crawls at
// 1.5 m/s off it. Driving on the ice fills its snow hopper in ~25 s. Tap F when
// it's full to Dump a 2 m snow pile; hold F 0.3 s to Spray a fan 3 m ahead: at
// Night a pile in reach freezes into a glassy ramp in 3 s, at Dusk it slumps to
// slush, by day it just splashes. A ramp hit at ≥ 3.5 m/s throws a short fixed
// hop (aimed back toward the rink's centre); a frozen ramp whose centre is in
// the launch-lane box, hit within ±30° of north, snaps the arc due north and
// lands it on the ranger cart's spot over the boards (the Rink Job's trigger).
// Everything runs on the fixed game clock, so recorded runs replay exactly.

import * as THREE from 'three';
import { VEHICLES, RINK, RC_TOW } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { glyph } from '../ui/glyphs.js';
import { TouchControls } from '../ui/touch.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (v, t, rate) => (v < t ? Math.min(t, v + rate) : Math.max(t, v - rate));
const Z = RINK.zamboni;
const LANE_ARC = 1.4;          // s, the launch over the boards (slow motion in its middle 0.6 s)
const HOP_SECS = 0.9, HOP_LEN = 4.5;

/** polish (P14): a pile's shape, unit size (x, z in -1..1, y 0..1), as a heightfield with vertex colours. 'mound': a lumpy
 *  snow heap; 'kicker': a snow ramp that rises toward +z (north) to a lip, then drops steeply, its face glazed with ice. */
function moundGeometry(kind) {
  const N = 28, pos = [], col = [], idx = [];
  const lump = (x, z) => 0.06 * Math.sin(x * 7.1 + z * 3.3) + 0.045 * Math.sin(x * 3.7 - z * 8.9 + 1.3) + 0.03 * Math.sin((x + z) * 13.1);
  const snow = new THREE.Color(0xf4f8fb), shade = new THREE.Color(0xdde8f0), ice = new THREE.Color(0xa9d4f2), glaze = new THREE.Color(0xd8efff);
  const c = new THREE.Color();
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = -1 + (2 * i) / N, z = -1 + (2 * j) / N;
      let h;
      if (kind === 'kicker') {
        const side = Math.max(0, 1 - Math.max(0, Math.abs(x) - 0.78) / 0.22);
        const sideK = Math.sqrt(side * side * (3 - 2 * side));
        const face = z < 0.62 ? Math.pow((z + 1) / 1.62, 1.5) : Math.max(0, 1 - ((z - 0.62) / 0.38) ** 1.6);
        h = Math.max(0, face * sideK * (1 + lump(x, z) * 0.4));
        const icy = z < 0.62 && Math.abs(x) < 0.72 ? Math.min(1, ((z + 1) / 1.62) * 1.2) : 0;
        c.copy(snow).lerp(shade, Math.min(1, Math.abs(x) * 0.6)).lerp(icy > 0.5 ? glaze : ice, icy * 0.75);
      } else {
        const r = Math.hypot(x, z) * (1 + lump(z, x) * 0.6);
        h = r >= 1 ? 0 : Math.pow(1 - r * r, 0.75) * (1 + lump(x, z));
        c.copy(snow).lerp(shade, Math.min(1, r * 0.7));
      }
      pos.push(x, Math.max(0, h), z);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, d = a + N + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Vehicles {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'vehicles';
    this.list = [];
    this.byId = {};
    this.cur = null;
    this.prompt = '';
    this.piles = [];            // runtime: { id, x, z, state: snow|slush|ramp, freeze, spray, mesh }
    this.cooT = 0;
    this.auto = null;           // a scripted drive (Ringo's demo): { v, pts, i, speed, done }
    // polish (P14): the piles were perfect hemispheres and the frozen ramp a glossy see-through blue dome (it read as a debug
    // sphere). Now a lumpy snow mound, a flattened grey slush heap, and the ramp a packed-snow kicker rising to the north
    // (the lane's launch direction) with a glazed icy face. Render only: the collision radius and height are unchanged.
    this.mats = {
      snow: ruleMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true }),
      slush: ruleMaterial({ color: 0xb8c6cf, roughness: 0.6, vertexColors: true }),
      ramp: ruleMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0, vertexColors: true, emissive: 0x0d1c2a }),
    };
    this.pileGeo = moundGeometry('mound');
    this.rampGeo = moundGeometry('kicker');
  }

  get st() { return this.G.state; }
  get driving() { return this.cur; }

  // ------------------------------------------------------------ build
  async build() {
    const G = this.G;
    for (const def of VEHICLES) {
      const b = await G.registry.baked(def.model);
      const holder = new THREE.Group();
      holder.name = 'vehicle:' + def.id;
      const body = new THREE.Group();      // drift/tilt pivot
      holder.add(body);
      if (b) {
        const m = new THREE.Mesh(b.geometry, b.makeMaterial());
        m.castShadow = true; m.receiveShadow = true;
        body.add(m);
      } else body.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.4).translate(0, 0.6, 0), ruleMaterial({ color: 0xd9dde0 })));
      holder.scale.x = -1;
      this.group.add(holder);
      const v = { id: def.id, def, holder, body, x: def.home.x, z: def.home.z, y: null, yaw: def.home.yaw, moveYaw: def.home.yaw, speed: 0, hopper: 0, hop: null, tilt: 0, loop: null, bumpT: 0, chug: null };
      this.list.push(v);
      this.byId[def.id] = v;
      this.#place(v);
      const self = this;
      G.interact.register({
        id: 'vehicle:' + def.id, kind: 'vehicle', priority: 4,
        get x() { return def.remote ? def.shore.x : v.x; }, get y() { return def.remote ? G.surfaceY(def.shore.x, def.shore.z, 5) : v.y; }, get z() { return def.remote ? def.shore.z : v.z; },
        r: def.remote ? 2.2 : (def.radius || 1) + 1.4, dy: 2.2,
        label: () => (self.cur || v.hop || self.auto || !self.canDrive(v) ? null : def.remote ? `Steer the ${def.name.replace(/^The /, '')}` : `Drive the ${def.name.replace(/^The /, '').replace(/^Vinnie's /, '')}`),
        act: () => self.enter(v),
      });
    }
    // the RC tug's job: the second sailboat, half sunk under the spout
    const sb = await G.registry.baked('sailboat');
    this.tow = { x: RC_TOW.boat.x, z: RC_TOW.boat.z, yaw: 0.4, hooked: false, done: false, holder: new THREE.Group() };
    if (sb) { const m = new THREE.Mesh(sb.geometry, sb.makeMaterial()); m.castShadow = true; this.tow.holder.add(m); }
    this.tow.holder.scale.x = -1;
    // the pond's spout (a fountain the ducks won't dive under): a plume of spray
    const sp = RC_TOW.spout, wl = G.collision.waterAt(sp.x, sp.z)?.level ?? -0.25;
    G.particles.addEmitter({ x: sp.x, y: wl + 0.1, z: sp.z, rate: 14, spread: 0.35 });
    this.group.add(this.tow.holder);
    this.restore();
  }

  canDrive(v) {
    const st = this.st;
    if (v.def.remote) return st.gear.includes('remote');
    return !!st.flags[v.def.rigged];
  }

  // ------------------------------------------------------------ persistence
  /** Fixes-3 (B2, B3): a load or quitting to the title: Gus gets out silently (no 'drive' event, the touch labels back),
   *  no vehicle stays scripted (the Rink Job sets zamboni.scripted; cancelled mid-scene the Zamboni never moved again),
   *  Ringo's demo drive stops, and no engine loop keeps running. */
  abandon() {
    if (this.cur) this.#exit(true);
    this.auto = null;
    for (const v of this.list) { v.scripted = false; this.#stopLoop(v); }
  }

  restore() {
    const st = this.st;
    const loaded = JSON.parse(JSON.stringify(st.vehicles || {}));   // (getting out below would save where the old run parked)
    this.abandon();   // Fixes-3 (B2)
    st.vehicles = loaded;
    st.rink = st.rink || { piles: [] };
    for (const v of this.list) {
      const s = st.vehicles[v.id];
      const p = s || v.def.home;
      v.x = p.x; v.z = p.z; v.yaw = v.moveYaw = p.yaw ?? v.def.home.yaw;
      v.speed = 0; v.hop = null; v.hopper = s?.hopper || 0; v.chug = null; v.y = null; v.tilt = 0; v.scripted = false;
      this.#place(v);
    }
    for (const p of this.piles) p.mesh.removeFromParent();
    this.piles = [];
    for (const p of st.rink.piles) this.#addPile(p, false);
    const t = this.tow;
    if (t) {
      t.done = !!st.flags['wings.sail2']; t.hooked = false;
      const at = t.done ? RC_TOW.drop : RC_TOW.boat;
      t.x = at.x; t.z = at.z;
      this.#placeTow();
    }
  }

  #save(v) { this.st.vehicles = this.st.vehicles || {}; this.st.vehicles[v.id] = { x: +v.x.toFixed(3), z: +v.z.toFixed(3), yaw: +v.yaw.toFixed(4), hopper: +v.hopper.toFixed(3) }; }
  #savePiles() { this.st.rink = this.st.rink || {}; this.st.rink.piles = this.piles.map((p) => ({ id: p.id, x: p.x, z: p.z, state: p.state })); }

  setPhase() {}
  onNap() {
    const notes = [];
    if (this.piles.length) { for (const p of this.piles) p.mesh.removeFromParent(); this.piles = []; this.#savePiles(); notes.push('The rink crew resurfaced.'); }
    return notes;
  }
  napBlock() { return this.cur ? 'Not while driving' : this.auto ? 'Not now' : null; }
  music() { return this.cur?.id === 'zamboni' ? 'rink' : null; }

  // ------------------------------------------------------------ rigging (the raccoons)
  /** Make a vehicle drivable. The Zamboni gets Ringo's demo run (it slumps to slush). Returns true. */
  rig(id, by = 'raccoons') {
    const G = this.G, v = this.byId[id];
    if (!v) return false;
    G.state.flags[v.def.rigged] = true;
    G.audio.play('rig-start', { at: v });
    G.particles.burst('sparkle', v.x, v.y + 1, v.z, 16, { spread: 1 });
    if (id !== 'zamboni') {
      G.bubbles.add('👍', { at: () => ({ x: v.x, y: v.y + 2.2, z: v.z }), ttl: 2 });
      G.toast(`${v.def.name}: rigged!`, { kind: 'stamp' });
      G.bus.emit('rigged', { vehicle: id, by });
      return true;
    }
    // Ringo takes it for a spin: out of the garage, a pile by the kids' bump, spray: slush
    const ringo = G.chars.find('ringo');
    const bump = RINK.bump;
    const stop = { x: bump.x + 4.8, z: bump.z + 0.4 };
    let piled = null;
    if (ringo) { ringo.script = true; ringo.here = { x: v.x, z: v.z, scripted: true }; }
    const seatRingo = () => { if (!ringo) return; const s = this.#seatPos(v); ringo.x = s.x; ringo.y = s.y; ringo.z = s.z; ringo.yaw = v.yaw; ringo.tween = null; };
    G.cutscene.run('ringo-demo', [
      { do: () => { G.audio.play('rig-start', { at: v }); this.#startLoop(v, 0.6); this.auto = { v, pts: [{ x: RINK.x, z: RINK.ice.z0 - 2.5 }, { x: RINK.x, z: RINK.ice.z0 + 3 }, { x: stop.x + 3, z: stop.z }, stop], i: 0, speed: 2.2, seat: seatRingo }; } },
      { cam: { ...G.shot({ x: RINK.x - 4, y: 0.4, z: RINK.ice.z0 + 4 }, { dist: 13, height: 6, yaw: Math.PI + 0.5, lookY: 0.8 }), secs: 1.5 } },
      { until: () => !this.auto },
      { do: () => { v.yaw = v.moveYaw = Math.atan2(bump.x - v.x, bump.z - v.z); this.#place(v); seatRingo(); } },
      { wait: 0.4 },
      { do: () => { piled = this.#dump(v, true); } },
      { wait: 1.2 },
      { do: () => { this.sprayFx(v); } },
      { wait: 0.6 },
      { do: () => { this.sprayFx(v); if (piled) this.#setPile(piled, 'slush'); } },
      { wait: 0.8 },
      { say: [{ who: 'ringo', text: 'Bah. Needs to be colder. Bet she\'d FLY off a big enough bump, though.' }] },
      { follow: true },
      { do: () => { this.#stopLoop(v); if (ringo) { ringo.script = false; G.chars.moveTo(ringo, { x: v.x + 1.6, z: v.z - 1.2 }, { kind: 'hop' }); } this.#save(v); G.toast('The Zamboni: rigged! Peck it to drive.', { kind: 'stamp' }); G.bus.emit('rigged', { vehicle: id, by }); } },
    ]);
    return true;
  }

  // ------------------------------------------------------------ getting in and out
  enter(v) {
    const G = this.G;
    if (!this.canDrive(v) || this.cur) return false;
    this.cur = v;
    v.speed = 0;
    G.gus.sit(v.def.cam);
    if (v.def.remote) {
      const s = v.def.shore;
      G.gus.place({ x: s.x, z: s.z, y: G.surfaceY(s.x, s.z, 5), yaw: Math.atan2(v.x - s.x, v.z - s.z), mode: 'walk' });
      G.gus.sit(v.def.cam);
      G.gus.camTarget = new THREE.Vector3(v.x, v.y, v.z);
      G.gus.camYaw = v.yaw;
    }
    G.flock.place?.(G.leader());
    this.#startLoop(v, 0.2);
    G.audio.play(v.id === 'zamboni' ? 'rig-start' : 'pick-up', { at: v, vol: 0.6 });
    G.rig.yaw = v.yaw;
    TouchControls.current?.setLabels({ flap: 'Gas', dive: 'Brake', peck: 'Out', coo: v.id === 'zamboni' ? 'Dump' : 'Horn' });
    G.bus.emit('drive', { vehicle: v.id, on: true });
    return true;
  }

  #exit(silent = false) {
    const G = this.G, v = this.cur;
    if (!v) return;
    this.cur = null;
    this.#stopLoop(v);
    this.#save(v);
    const g = G.gus;
    g.camTarget = null; g.camYaw = null;
    if (!v.def.remote) {
      // step down on the left side (or the right, if that's blocked)
      for (const side of [-1, 1]) {
        const a = v.yaw + side * Math.PI / 2;
        const d = (v.def.radius || 1) + 0.6;
        const x = v.x + Math.sin(a) * d, z = v.z + Math.cos(a) * d;
        const y = G.surfaceY(x, z, v.y + 0.5);
        if (Math.abs(y - v.y) < 1 && !G.collision.waterAt(x, z) && !G.collision.solidAt(x, y + 0.2, z)) { g.place({ x, z, y, yaw: v.yaw, mode: 'walk' }); break; }
        if (side === 1) g.place({ x: v.x, z: v.z, y: v.y + 1.6, yaw: v.yaw, mode: 'walk' });
      }
    } else g.stand();
    if (g.mode === 'drive') g.stand();
    G.flock.place?.(G.leader());
    TouchControls.current?.setLabels(null);
    if (!silent) G.bus.emit('drive', { vehicle: v.id, on: false });
  }
  exit() { this.#exit(false); }

  // ------------------------------------------------------------ the fixed update (all vehicles)
  update(dt) {
    const G = this.G;
    if (this.auto) this.#autoStep(dt);
    for (const v of this.list) {
      if (v.hop) this.#hopStep(v, dt);
      else if (v !== this.cur && !(this.auto && this.auto.v === v)) v.speed = 0;
    }
    // piles: freezing progress decays when nobody sprays; frost sparkles on ramps
    let ringOn = null;
    for (const p of this.piles) {
      if (p.state === 'ramp' && (G.updates % 40 === 0)) G.particles.burst('sparkle', p.x, p.y + Z.pileH * 0.6, p.z, 1, { spread: 1.2, color: [0.85, 0.95, 1] });
      if (p.sprayT > 0) { p.sprayT -= dt; if (p.state === 'snow' && G.state.phase === 'night') ringOn = p; }
    }
    // Fixes-3 (R8): while a pile is sprayed at Night, a ring over it fills as it freezes (3 s), so you know to keep at it
    if (!this.freezeRing) {
      const mk = (color, opacity) => new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 48, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      const bg = mk(0x1d2a3a, 0.45), fg = mk(0x9fe0ff, 0.95);
      fg.position.z = 0.01; bg.renderOrder = 6; fg.renderOrder = 7;
      this.freezeRing = new THREE.Group(); this.freezeRing.add(bg, fg); this.freezeRing.fg = fg; this.freezeRing.visible = false; this.freezeRing.name = 'freeze-ring';
      this.group.add(this.freezeRing);
    }
    const fr = this.freezeRing;
    fr.visible = !!ringOn;
    if (ringOn) {
      const k = Math.min(1, ringOn.spray / Z.freezeSecs), cam = G.dataCam.position;
      fr.position.set(ringOn.x, ringOn.y + Z.pileH + 0.8, ringOn.z);
      fr.rotation.set(0, Math.atan2(cam.x - ringOn.x, cam.z - ringOn.z), 0);
      fr.fg.geometry.setDrawRange(0, Math.round(48 * k) * 6);
    }
    // the tow follows the tug
    const t = this.tow;
    if (t?.hooked) {
      const v = this.byId['rc-boat'];
      const bx = v.x - Math.sin(v.yaw) * 0.9, bz = v.z - Math.cos(v.yaw) * 0.9;
      t.x += (bx - t.x) * Math.min(1, dt * 3); t.z += (bz - t.z) * Math.min(1, dt * 3);
      t.yaw = Math.atan2(v.x - t.x, v.z - t.z);
      this.#placeTow();
      const d = RC_TOW.drop;
      if (Math.hypot(t.x - d.x, t.z - d.z) < d.r) {
        t.hooked = false; t.done = true;
        const s = VEHICLES.find((q) => q.id === 'rc-boat').shore;
        G.items.spawn('sail', s.x + 0.4, s.z + 1.3);
        G.state.flags['wings.sail2'] = true;
        G.audio.play('item-splash', { at: t });
        G.particles.splash(t.x, t.y, t.z, 14);
        G.toast('The second sail! Carry it to the Workshop.', { kind: 'stamp' });
        G.bus.emit('towed', { item: 'sail' });
      }
    }
    // the driving prompt
    const v = this.cur;
    if (v) {
      const dev = G.input.device, fam = G.input.gamepad.family;
      // the RC tug: Gus is off on the shore, so "Out" goes on the driving HUD instead of beside him
      this.prompt = v.def.remote ? '' : `${glyph('peck', dev, fam)}<span>Out</span>`;
    } else this.prompt = '';
  }

  /** Each fixed update while Gus drives (instead of gus.update). */
  drive(dt, input, camYaw) {
    const G = this.G, v = this.cur;
    if (!v) return;
    if (input.pressed('peck') && !v.hop) { this.#exit(); return; }
    const def = v.def;
    if (v.scripted) { this.#seatGus(v, dt); return; }   // 3b: a showpiece moves the vehicle itself (the Rink Job)
    if (!v.hop) {
      const mv = input.move();
      const steer = Math.max(-1, Math.min(1, mv.x));
      const gas = Math.max(mv.y > 0.1 ? mv.y : 0, input.held('flap') ? 1 : 0);
      const brake = Math.max(mv.y < -0.1 ? -mv.y : 0, input.held('dive') ? 1 : 0);
      if (v.id === 'zamboni') this.#zamboniPhysics(v, dt, steer, gas, brake);
      else this.#cartPhysics(v, dt, steer, gas, brake);
      this.#horn(v, dt, input);
    }
    this.#seatGus(v, dt);
    // engine loop volume follows the speed
    v.loop?.setVolume(0.25 + Math.min(1, Math.abs(v.speed) / def.top) * 0.6);
    if (G.updates % 30 === 0) this.#save(v);
  }

  // ------------------------------------------------------------ physics
  #cartPhysics(v, dt, steer, gas, brake) {
    const def = v.def;
    const top = def.top;
    if (gas > 0) v.speed = approach(v.speed, top * gas, (v.speed < 0 ? def.accel * 2.5 : def.accel) * dt);
    else if (brake > 0) v.speed = approach(v.speed, -top * 0.4 * brake, (v.speed > 0 ? def.accel * 2.5 : def.accel * 0.8) * dt);
    else v.speed = approach(v.speed, 0, def.accel * 0.7 * dt);
    const turnK = Math.min(1, Math.abs(v.speed) / 1.2) * Math.sign(v.speed || 1) + (def.remote && Math.abs(v.speed) < 0.3 ? 0.4 : 0);
    v.yaw = wrap(v.yaw + steer * def.turn * turnK * dt);
    v.moveYaw = v.yaw;
    this.#move(v, dt);
  }

  #zamboniPhysics(v, dt, steer, gas, brake) {
    const onIce = this.onIce(v.x, v.z);
    const top = onIce ? Z.top : Z.offIce;
    if (v.chug) {
      // too slow up a ramp: teeter at the top, then slide back down ("wheee…")
      const c = v.chug;
      c.t += dt;
      v.tilt = Math.sin(Math.min(1, c.t / 1.2) * Math.PI) * 0.32;
      if (c.t > 0.7) { v.speed = -1.4 * Math.min(1, (c.t - 0.7) * 2); this.#move(v, dt); }
      if (c.t > 1.6) { v.chug = null; v.tilt = 0; v.speed = -0.6; }
      return;
    }
    if (gas > 0) v.speed = approach(v.speed, top * gas, (v.speed < 0 ? Z.brake : Z.accel) * dt);
    else if (brake > 0) v.speed = approach(v.speed, v.speed > 0.05 ? 0 : -1.5 * brake, (v.speed > 0.05 ? Z.brake : 0.8) * dt);
    else v.speed = approach(v.speed, 0, (onIce ? 0.35 : 2) * dt);
    if (!onIce && Math.abs(v.speed) > Z.offIce) v.speed = Math.sign(v.speed) * Z.offIce;
    // turning: the body turns; the travel direction lags behind it (the rear swings out ~15°)
    const turnK = Math.min(1, Math.abs(v.speed) / 1.5) * Math.sign(v.speed || 1);
    v.yaw = wrap(v.yaw + steer * v.def.turn * turnK * dt);
    const grip = onIce ? 1.6 : 8;
    v.moveYaw = wrap(v.moveYaw + wrap(v.yaw - v.moveYaw) * Math.min(1, grip * dt));
    const lag = wrap(v.yaw - v.moveYaw);
    if (Math.abs(lag) > 0.27) v.moveYaw = wrap(v.yaw - Math.sign(lag) * 0.27);
    // the hopper fills while it shaves the ice
    if (onIce && Math.abs(v.speed) > 0.5 && v.hopper < 1) {
      v.hopper = Math.min(1, v.hopper + dt / Z.hopperSecs);
      if (this.G.updates % 9 === 0) { const r = this.#rear(v, -1.6); this.G.particles.burst('dust', r.x, v.y + 0.3, r.z, 1, { spread: 0.6, color: [0.95, 0.97, 1] }); }
      if (v.hopper >= 1) { this.G.toast('Hopper full! Tap F to Dump.'); this.G.audio.synth('meterTick'); }
    }
    this.#move(v, dt);
    this.#piles(v);
    this.#skaters(v);
  }

  /** Move along moveYaw with collisions (three circles along the body), water and steps. */
  #move(v, dt) {
    const G = this.G, def = v.def;
    const ox = v.x, oz = v.z, oy = v.y;
    v.x += Math.sin(v.moveYaw) * v.speed * dt;
    v.z += Math.cos(v.moveYaw) * v.speed * dt;
    let hit = null;
    const half = v.id === 'zamboni' ? 1.25 : v.id === 'pedicab' ? 0.7 : 0;
    const r = v.id === 'zamboni' ? 0.95 : (def.radius || 0.8);
    if (def.surface !== 'water') {
      for (const off of half ? [-half, 0, half] : [0]) {
        // wheels climb kerbs and bridge decks (a cart can mount ~1 m: the transverse bridges sit above the cut's dip); the Zamboni can't climb its boards
        const climb = v.id === 'zamboni' ? 0.25 : 0.75;
        const p = new THREE.Vector3(v.x + Math.sin(v.yaw) * off, v.y + climb, v.z + Math.cos(v.yaw) * off);
        const qx = p.x, qz = p.z;
        const n = G.collision.pushOut(p, r, 1.1);
        if (n) { v.x += p.x - qx; v.z += p.z - qz; hit = { x: n.x, z: n.z, tag: n.tag }; }
      }
    }
    // surfaces: land vehicles keep out of the water and off steep steps; the tug keeps to its pond
    if (def.surface === 'water') {
      const w = G.collision.waterAt(v.x, v.z);
      const fx = v.x + Math.sin(v.yaw) * 0.45 * Math.sign(v.speed || 1), fz = v.z + Math.cos(v.yaw) * 0.45 * Math.sign(v.speed || 1);
      const wf = G.collision.waterAt(fx, fz);
      if (!w || w.id !== def.water || !wf || wf.id !== def.water) { v.x = ox; v.z = oz; v.speed *= -0.3; hit = { tag: 'bank' }; }
      v.y = (w?.level ?? oy) ;
    } else {
      const step = v.id === 'zamboni' ? 0.45 : 1.05;
      const y = G.surfaceY(v.x, v.z, v.y + step);
      if (G.collision.waterAt(v.x, v.z) && y < oy - 0.3 || y > oy + step) { v.x = ox; v.z = oz; v.speed *= -0.3; hit = hit || { tag: 'edge' }; }
      else v.y = y > oy ? Math.min(y, oy + 5 * dt + 0.02) : y;   // ease up onto a step (a bump), drop straight down off one
    }
    // Fixes-3 (R8): the Zamboni glances off the rink's boards: a hit at an angle turns its travel along them and keeps
    // about half its speed (it used to stick and grind there, or bounce into reverse and be driven straight back in)
    if (hit && hit.x != null && v.id === 'zamboni' && Math.abs(v.speed) > 0.25 && v.bumpT <= 0) {
      const dir = Math.sign(v.speed), dx = Math.sin(v.moveYaw) * dir, dz = Math.cos(v.moveYaw) * dir;
      const into = -(dx * hit.x + dz * hit.z);
      if (into > 0.04 && into < 0.85) {
        // the tangent, with a little of the reflection: off the boards and on along them
        let rx = dx + into * hit.x * 1.35, rz = dz + into * hit.z * 1.35;
        const l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
        const ny = Math.atan2(rx * dir, rz * dir);
        v.moveYaw = ny; v.yaw = wrap(v.yaw + wrap(ny - v.yaw) * 0.7);
        v.speed *= 0.55;
        v.bumpT = 0.25; v.tilt = 0.05;
        G.audio.play('ice-bump', { at: v, vol: 0.5, rate: 1.15 });
        G.rumble?.(0.2, 0.15, 70);
      }
    }
    if (hit && Math.abs(v.speed) > 0.25 && v.bumpT <= 0) {
      // a soft bounce back; the Zamboni's padded "ice bump" keeps half its speed
      const into = hit.x != null ? -(Math.sin(v.moveYaw) * hit.x + Math.cos(v.moveYaw) * hit.z) : 1;
      if (into > 0.2) {
        v.speed = -v.speed * (v.id === 'zamboni' ? 0.5 : 0.3);
        v.bumpT = 0.35;
        v.tilt = 0.08;
        G.audio.play(v.id === 'zamboni' ? 'ice-bump' : 'drop-thud', { at: v, vol: 0.7 });
        G.rumble?.(0.3, 0.2, 90);
      }
    }
    if (v.bumpT > 0) { v.bumpT -= dt; v.tilt *= 0.9; }
    this.#place(v);
  }

  #horn(v, dt, input) {
    const G = this.G;
    if (v.id !== 'zamboni') {
      if (input.pressed('coo')) { if (v.def.remote) G.audio.synth('whistle', { vol: 0.6 }); else G.audio.play(v.id === 'pedicab' ? 'coo' : 'cab-horn', { at: v, vol: 0.8 }); }
      return;
    }
    // the Zamboni: tap F = Dump (full hopper), hold F 0.3 s = Spray
    if (input.held('coo')) {
      this.cooT += dt;
      if (this.cooT >= Z.sprayHold) this.#spray(v, dt);
    } else if (this.cooT > 0) {
      if (this.cooT < Z.sprayHold) {
        if (v.hopper >= 1) this.#dump(v);
        else { G.toast(`Hopper ${Math.round(v.hopper * 100)}%. Drive on the ice to fill it.`); G.audio.synth('uiBack'); }
      }
      this.cooT = 0;
    }
    TouchControls.current?.setLabels({ coo: v.hopper >= 1 ? 'Dump' : 'Spray' });
  }

  // ------------------------------------------------------------ Zamboni jobs
  onIce(x, z) { const I = RINK.ice; return x > I.x0 && x < I.x1 && z > I.z0 && z < I.z1; }
  #front(v, d = 1.8) { return { x: v.x + Math.sin(v.yaw) * d, z: v.z + Math.cos(v.yaw) * d }; }
  #rear(v, d) { return { x: v.x + Math.sin(v.yaw) * d, z: v.z + Math.cos(v.yaw) * d }; }

  #dump(v, scripted = false) {
    const G = this.G;
    const f = this.#front(v, 1.8 + Z.pileR * 0.85);
    if (!this.onIce(f.x, f.z) && !scripted) { G.toast('Dump it on the ice.'); return null; }
    const p = this.#addPile({ id: 'pile' + G.state.time.toFixed(2), x: f.x, z: f.z, state: 'snow' }, true);
    v.hopper = 0;
    G.audio.play('hopper-dump', { at: p });
    G.particles.burst('dust', p.x, p.y + 0.8, p.z, 22, { spread: 1.6, color: [0.96, 0.98, 1] });
    G.bus.emit('dump', { x: p.x, z: p.z, inLane: this.inLane(p) });
    return p;
  }

  sprayFx(v) {
    const G = this.G;
    for (let k = -2; k <= 2; k++) {
      const a = v.yaw + k * 0.22, d = 1.8 + Z.sprayReach * 0.7;
      G.particles.burst('crumbs', v.x + Math.sin(a) * d, v.y + 0.5, v.z + Math.cos(a) * d, 2, { spread: 0.4, color: [0.75, 0.88, 1] });
    }
    if (G.updates % 12 === 0) G.audio.play('splash-hop', { at: v, vol: 0.4 });
  }

  #spray(v, dt) {
    const G = this.G;
    this.sprayFx(v);
    const ph = G.state.phase;
    const f = this.#front(v, 1.8);
    for (const p of this.piles) {
      if (p.state === 'ramp' || p.state === 'slush') continue;
      const d = Math.hypot(p.x - f.x, p.z - f.z);
      const ahead = Math.sin(v.yaw) * (p.x - v.x) + Math.cos(v.yaw) * (p.z - v.z) > 0;
      if (!ahead || d > Z.sprayReach + Z.pileR) continue;
      p.spray = (p.spray || 0) + dt;
      p.sprayT = 0.3;
      if (ph === 'night') {
        if (G.updates % 6 === 0) G.particles.burst('sparkle', p.x, p.y + 1, p.z, 2, { spread: 1.4, color: [0.85, 0.95, 1] });
        if (p.spray >= Z.freezeSecs) { this.#setPile(p, 'ramp'); G.audio.play('freeze-crackle', { at: p }); G.particles.burst('sparkle', p.x, p.y + 1, p.z, 30, { spread: 2, color: [0.9, 0.97, 1] }); G.toast('A glassy ice ramp!', { kind: 'stamp' }); G.bus.emit('ramp', { x: p.x, z: p.z, inLane: this.inLane(p) }); }
      } else if (ph === 'dusk') {
        if (p.spray >= 1.2) { this.#setPile(p, 'slush'); G.toast('Slush. Needs to be colder.'); G.bus.emit('slush', { x: p.x, z: p.z }); }
      } else if (p.spray >= 0.8 && !p.splashed) { p.splashed = true; G.toast('Splash! It just runs off. (Ice freezes at Night.)'); }
    }
    // by day it splashes whoever's in front (skaters, pigeons, Gus)
    if (ph !== 'night') for (const a of G.humans.byRole('skater')) if (a.out && Math.hypot(a.x - f.x, a.z - f.z) < Z.sprayReach && !(a.wetT > G.state.time)) { a.wetT = G.state.time + 4; G.bubbles.add('Hey! I\'m SOAKED!', { at: () => ({ x: a.x, y: (a.y || 0) + 2, z: a.z }), ttl: 1.8 }); }
  }

  inLane(p) { const L = RINK.lane; return p.x > L.x0 && p.x < L.x1 && p.z > L.z0 && p.z < L.z1; }

  #addPile(p, save) {
    const G = this.G;
    const y = G.surfaceY(p.x, p.z, 1);
    const mesh = new THREE.Mesh(this.pileGeo, this.mats.snow);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const q = { ...p, y, mesh, spray: 0 };
    this.group.add(mesh);
    this.piles.push(q);
    this.#setPile(q, p.state, save);
    return q;
  }

  #setPile(p, state, save = true) {
    p.state = state;
    const h = state === 'slush' ? 0.55 : Z.pileH;
    const r = state === 'slush' ? Z.pileR * 1.25 : Z.pileR;
    p.mesh.material = this.mats[state] || this.mats.snow;
    p.mesh.geometry = state === 'ramp' ? this.rampGeo : this.pileGeo;
    p.mesh.scale.set(r, h, r);
    p.mesh.position.set(p.x, p.y - 0.02, p.z);
    if (save) this.#savePiles();
  }

  /** The Zamboni meets the piles: snow and slush are soft walls; a ramp launches it (or it chugs back). */
  #piles(v) {
    const G = this.G;
    const f = this.#front(v, 1.6);
    for (const p of this.piles) {
      const d = Math.hypot(p.x - f.x, p.z - f.z);
      const toward = Math.sin(v.moveYaw) * (p.x - v.x) + Math.cos(v.moveYaw) * (p.z - v.z) > 0;
      if (!toward || v.speed <= 0.05) continue;
      if (p.state === 'ramp') {
        if (d > Z.pileR * 0.75) continue;
        if (v.speed >= Z.launchSpeed - 1e-6) this.#launch(v, p);
        else { v.chug = { t: 0 }; G.bubbles.add('wheee…', { at: () => ({ x: v.x, y: v.y + 2.6, z: v.z }), ttl: 1.8 }); G.bus.emit('rampTooSlow', { speed: v.speed }); }
        return;
      }
      if (d < Z.pileR * (p.state === 'slush' ? 0.6 : 0.9)) {
        v.x -= Math.sin(v.moveYaw) * v.speed * G.DT; v.z -= Math.cos(v.moveYaw) * v.speed * G.DT;
        if (v.speed > 0.8) { G.audio.play('hopper-dump', { at: p, vol: 0.4, rate: 1.4 }); G.particles.burst('dust', p.x, p.y + 0.6, p.z, 6, { spread: 1, color: [0.96, 0.98, 1] }); }
        v.speed = 0;
        this.#place(v);
      }
    }
  }

  /** A ramp hit fast enough: the lane launch (snapped north, onto the cart's spot) or a short hop back toward the centre. */
  #launch(v, p) {
    const G = this.G;
    const heading = wrap(v.yaw);
    const lane = this.inLane(p) && Math.abs(heading) <= Z.launchAngle;
    const from = { x: v.x, y: v.y, z: v.z };
    if (lane) {
      const c = RINK.cartSpot;
      const top = G.terrain.heightAt(c.x, c.z) + 2.15;
      v.hop = { t: 0, secs: LANE_ARC, from, to: { x: c.x, y: top, z: c.z }, apex: Math.max(from.y, top) + 2.4, lane: true, yaw: 0 };
      v.yaw = v.moveYaw = 0;
      G.audio.play('whoosh', { at: v, rate: 0.7 });
      G.bubbles.add('BEST. NIGHT. EVER!', { at: () => ({ x: v.x, y: v.y + 3, z: v.z }), ttl: 2 });
      G.bus.emit('zamboniLaunchStart', { lane: true });
    } else {
      // reflect the hop's direction toward the rink's centre
      let dx = Math.sin(v.yaw), dz = Math.cos(v.yaw);
      let nx = RINK.x - v.x, nz = RINK.z - v.z;
      const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      const dot = dx * nx + dz * nz;
      if (dot < 0) { dx -= 2 * dot * nx; dz -= 2 * dot * nz; }
      const I = RINK.ice;
      const tx = Math.max(I.x0 + 2.5, Math.min(I.x1 - 2.5, v.x + dx * HOP_LEN)), tz = Math.max(I.z0 + 2.5, Math.min(I.z1 - 2.5, v.z + dz * HOP_LEN));
      const yaw = Math.atan2(dx, dz);
      v.hop = { t: 0, secs: HOP_SECS, from, to: { x: tx, y: G.surfaceY(tx, tz, 1), z: tz }, apex: from.y + Z.hop, lane: false, yaw };
      v.yaw = v.moveYaw = yaw;
      G.audio.play('whoosh', { at: v, rate: 1.1 });
    }
    v.speed = 0;
  }

  #hopStep(v, dt) {
    const G = this.G, h = v.hop;
    // the lane arc's middle 0.6 s plays in slow motion (the progress slows; the clock doesn't)
    const rate = h.lane && h.t > 0.4 && h.t < 1.0 ? 0.45 : 1;
    h.t += dt;
    h.u = Math.min(1, (h.u || 0) + (dt * rate) / (h.lane ? LANE_ARC * 0.78 : h.secs));
    const u = h.u;
    v.x = h.from.x + (h.to.x - h.from.x) * u;
    v.z = h.from.z + (h.to.z - h.from.z) * u;
    // a parabola through from.y → apex → to.y
    const a = h.from.y, b = h.apex, c = h.to.y;
    v.y = (1 - u) * (1 - u) * a + 2 * (1 - u) * u * (2 * b - (a + c) / 2) + u * u * c;
    v.tilt = (0.5 - u) * 0.5;
    if (v === this.cur && G.updates % 4 === 0) G.particles.burst('feathers', G.gus.position.x, G.gus.position.y + 0.2, G.gus.position.z, 1);
    this.#place(v, true);
    if (u >= 1) {
      v.hop = null; v.tilt = 0;
      v.y = h.to.y;
      G.audio.play(h.lane ? 'launch-crunch' : 'ice-bump', { at: v });
      G.rumble?.(0.8, 0.5, 220);
      G.particles.burst('dust', v.x, v.y + 0.2, v.z, 14, { spread: 1.5, color: [0.95, 0.97, 1] });
      if (h.lane) {
        G.state.flags['rink.launched'] = true;
        G.bus.emit('zamboniLaunch', { lane: true, x: v.x, z: v.z });
        if (!G.schemes.scripts['setpiece.rinkjob']) G.later(1.2, () => this.park(v, RINK.parking, true));
      } else G.bus.emit('zamboniHop', { x: v.x, z: v.z });
      this.#save(v);
    }
  }

  /** 3b: draw a vehicle where a showpiece put it (x, y, z, yaw, tilt set by the caller). */
  pose(v) { if (typeof v === 'string') v = this.byId[v]; if (v) this.#place(v, true); }

  /** Put a vehicle somewhere (a showpiece's aftermath, the post-job parking). getOut: Gus steps out. */
  park(v, at, getOut = false) {
    if (typeof v === 'string') v = this.byId[v];
    if (!v) return;
    if (getOut && this.cur === v) this.#exit();
    v.x = at.x; v.z = at.z; v.yaw = v.moveYaw = at.yaw ?? v.yaw; v.speed = 0; v.hop = null; v.tilt = 0; v.scripted = false;
    v.y = null;
    this.#place(v);
    this.#save(v);
  }

  #skaters(v) {
    const G = this.G;
    if (G.state.phase === 'night' || Math.abs(v.speed) < 0.4) return;
    for (const a of G.humans.byRole('skater')) {
      if (!a.out || Math.hypot(a.x - v.x, a.z - v.z) > 2.8) continue;
      a.loopT = (a.loopT + 0.004) % 1;   // they glide aside
      if (!(a.heyT > G.state.time)) { a.heyT = G.state.time + 3; G.bubbles.add('HEY!', { at: () => ({ x: a.x, y: (a.y || 0) + 2, z: a.z }), ttl: 1.4 }); }
    }
  }

  // ------------------------------------------------------------ the RC tug's tow
  #placeTow() {
    const t = this.tow, G = this.G;
    const w = G.collision.waterAt(t.x, t.z);
    t.y = (w?.level ?? 0) - (t.done ? 0.05 : 0.38);
    t.holder.position.set(t.x, t.y, t.z);
    t.holder.rotation.set(t.done ? 0 : 0.35, t.yaw, t.done ? 0 : 0.25, 'YXZ');
  }

  #tugHook(v) {
    const t = this.tow, G = this.G;
    if (t.hooked || t.done) return;
    if (Math.hypot(v.x - t.x, v.z - t.z) < RC_TOW.hookR + 0.4) {
      t.hooked = true;
      G.audio.play('pick-up', { at: v, rate: 0.7 });
      G.toast('Hooked! Tow it to the shore.', { kind: 'stamp' });
    }
  }

  // ------------------------------------------------------------ seating, placement, sounds
  #seatPos(v) {
    const s = v.def.seat || { y: 0.9, z: 0 };
    return { x: v.x + Math.sin(v.yaw) * s.z, y: v.y + s.y, z: v.z + Math.cos(v.yaw) * s.z };
  }

  #seatGus(v, dt) {
    const g = this.G.gus;
    if (v.def.remote) {
      g.camTarget = g.camTarget || new THREE.Vector3();
      g.camTarget.set(v.x, v.y, v.z);
      g.camYaw = v.yaw;
      g.root.rotation.set(0, Math.atan2(v.x - g.position.x, v.z - g.position.z), 0);
      this.#tugHook(v);
      return;
    }
    const s = this.#seatPos(v);
    g.position.set(s.x, s.y, s.z);
    g.yaw = v.yaw;
    g.root.rotation.set(0, v.yaw, 0);
    g.speed = Math.abs(v.speed);
    g.velocity.set(Math.sin(v.moveYaw) * v.speed, 0, Math.cos(v.moveYaw) * v.speed);
    g.scarf?.update(dt, g.velocity);
  }

  #place(v, inAir = false) {
    if (!inAir) {
      if (v.def.surface === 'water') { const w = this.G.collision.waterAt(v.x, v.z); v.y = w?.level ?? v.y; }
      else if (!v.def || v.id === 'zamboni' || v.y == null) v.y = this.G.surfaceY(v.x, v.z, (v.y || 0) + 0.45);
    }
    v.holder.position.set(v.x, v.y, v.z);
    v.holder.rotation.y = v.yaw;
    // the drift: the body leads the travel direction a little; tilt for bumps, chugs and the arc
    v.body.rotation.set(v.tilt || 0, 0, (v.id === 'zamboni' ? wrap(v.yaw - v.moveYaw) * 0.25 : 0), 'YXZ');
    if (this.cur === v || (this.auto && this.auto.v === v)) { /* sound position */ }
  }

  #startLoop(v, vol) {
    if (v.loop) return;
    const name = v.def.sound;
    if (name) v.loop = this.G.audio.loop(name, { vol });
    if (v.id === 'zamboni') v.loop2 = this.G.audio.loop('engine-loop', { vol: 0.15 });
  }
  #stopLoop(v) { v.loop?.stop(); v.loop = null; v.loop2?.stop(); v.loop2 = null; }

  /** A scripted drive (Ringo's demo): straight legs at a steady speed, on the game clock. */
  #autoStep(dt) {
    const a = this.auto, v = a.v;
    const tgt = a.pts[a.i];
    if (!tgt) { this.auto = null; v.speed = 0; a.done?.(); return; }
    const dx = tgt.x - v.x, dz = tgt.z - v.z, d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    v.yaw = wrap(v.yaw + Math.max(-1.5 * dt, Math.min(1.5 * dt, wrap(want - v.yaw))));
    v.moveYaw = v.yaw;
    const step = a.speed * dt;
    if (d <= step + 0.05) { v.x = tgt.x; v.z = tgt.z; a.i++; }
    else { v.x += Math.sin(v.yaw) * step; v.z += Math.cos(v.yaw) * step; }
    v.speed = a.speed;
    this.#place(v);
    a.seat?.();
  }

  // ------------------------------------------------------------ HUD and debug
  hud() {
    const v = this.cur;
    if (!v) return null;
    const G = this.G, dev = G.input.device, fam = G.input.gamepad.family;
    let prompt = '';
    if (v.id === 'zamboni') {
      const lines = [];
      if (v.hopper >= 1) lines.push(`<span class="k">${glyph('coo', dev, fam)} Dump</span>`);
      lines.push(`<span class="k">${dev === 'touch' ? glyph('coo', dev, fam) + ' Hold' : 'Hold ' + glyph('coo', dev, fam)} Spray</span>`);
      prompt = lines.join('');
    } else if (v.def.remote) {
      if (this.tow && !this.tow.done) prompt = `<span class="k">${this.tow.hooked ? 'Tow it to the shore' : 'Hook the sunk boat under the spout'}</span>`;
      prompt += `<span class="k">${glyph('peck', dev, fam)} Put the remote down</span>`;
    }
    return { speed: v.speed, top: v.def.top, name: v.def.name, hopper: v.id === 'zamboni' ? v.hopper : null, prompt };
  }

  debug() {
    const v = this.cur, z = this.byId?.zamboni;
    return {
      driving: v ? v.id : null, vehicle: v ? { id: v.id, x: +v.x.toFixed(2), z: +v.z.toFixed(2), yaw: +v.yaw.toFixed(3), speed: +v.speed.toFixed(2), hop: v.hop ? (v.hop.lane ? 'lane' : 'hop') : null } : null,
      onIce: z ? this.onIce(z.x, z.z) : null, hopper: z ? +z.hopper.toFixed(3) : null,
      ramps: this.piles.map((p) => ({ x: +p.x.toFixed(1), z: +p.z.toFixed(1), state: p.state, inLane: this.inLane(p) })),
      zamboni: z ? { x: +z.x.toFixed(2), z: +z.z.toFixed(2), y: +z.y.toFixed(2), yaw: +z.yaw.toFixed(3), hop: z.hop ? (z.hop.lane ? 'lane' : 'hop') : null } : null,
      tow: this.tow ? { hooked: this.tow.hooked, done: this.tow.done, x: +this.tow.x.toFixed(1), z: +this.tow.z.toFixed(1) } : null,
    };
  }
}
