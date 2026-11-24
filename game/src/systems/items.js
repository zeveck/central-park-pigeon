// Items ("Items: light, heavy, huge" and "Pizza slices"):
//   light  Gus carries one with no flight limit (shinies, keys, peas, slices…)
//   heavy  one, but only up to 2 m above the ground and at most 6 m/s (a box, a ball, a sail)
//   huge   Gus can't move it; a hauler can (drainpipes, the cone, the battery, the cart)
// Carry, drop (Q), pick up and give (Peck). A slice is hot for 60 s of game
// time after it leaves an oven, a box or a griddle: steam thins as it cools,
// the HUD slot shows a ring that empties, cold slices droop. The halal cart's
// griddle warms a slice dropped on it for 3 s. A pizza box pecked open gives 3
// slices. Naps: a carried slice goes cold; slices and boxes on the ground are
// gone ("A rat took your slice while you napped."). Grate travel takes whatever Gus holds.

import * as THREE from 'three';
import { SLICE, GRATES, CLUES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { GUS_STAND, GUS_FLY } from '../entities/gus-rig.js';

export const ITEM_DEFS = {
  slice: { name: 'Pizza slice', cls: 'light', model: 'pizza-slice', slice: true },
  'slice-anchovy': { name: 'Anchovy slice', cls: 'light', model: 'pizza-slice', slice: true, anchovy: true },
  box: { name: 'Pizza box', cls: 'heavy', model: 'pizza-box' },
  shiny: { name: 'Shiny', cls: 'light', code: 'shiny' },
  key: { name: 'Lost key', cls: 'light', code: 'key' },
  'gate-key': { name: 'Gate key', cls: 'light', code: 'key' },
  cufflink: { name: 'Cufflink', cls: 'light', code: 'shiny' },
  earring: { name: 'Earring', cls: 'light', code: 'shiny' },
  wrench: { name: 'Wrench', cls: 'light', code: 'wrench' },
  sticker: { name: 'Lucky sticker', cls: 'light', code: 'disc' },
  peas: { name: 'Peas', cls: 'light', code: 'peas' },
  spectacles: { name: 'Spectacles', cls: 'light', code: 'specs' },
  remote: { name: 'RC remote', cls: 'light', code: 'box-small', gear: 'remote' },
  falafel: { name: 'Falafel ball', cls: 'light', code: 'falafel' },
  sprat: { name: 'Sprat', cls: 'light', code: 'sprat' },
  ball: { name: "Biscuit's tennis ball", cls: 'heavy', code: 'ball' },   // fix-40: a tennis ball (model, name and icon agree)
  sail: { name: 'Sail', cls: 'heavy', code: 'sail' },
  'tennis-sack': { name: 'Sack of tennis balls', cls: 'heavy', code: 'sack' },
  pipe: { name: 'Drainpipe', cls: 'huge', code: 'pipe' },
  cone: { name: 'Traffic cone', cls: 'huge', model: 'traffic-cone' },
  battery: { name: 'Battery', cls: 'huge', model: 'battery' },
  camera: { name: 'Old film camera', cls: 'light', model: 'tourist-camera', code: 'camera' },   // photo mode (#9): Say Cheese
  cart: { name: 'Shopping cart', cls: 'huge', code: 'cart' },
};
export const HEAVY_LIMITS = { maxAlt: 2, maxSpeed: 6 };

const HOT = SLICE.hotFor;

// #41: the carried item is held in Gus's beak: on the ground it rides his head bone (the walk's head thrust, the peck, the
// idle look-arounds), in the air the flight model (its pitch, bank and wingbeat lean), at the beak tip either way. Each
// item is gripped by the near top edge of its bounding box (a slice by its crust, the camera by its top), so it hangs from
// the beak instead of floating ahead of it. A heavy item is dragged: gripped the same way, its far end down to the ground
// (walking) or hanging (flying). Visual only: drop, give and pick-up use Gus's position, never this mesh.
const HOLD_TILT = { light: 0.15, flyLight: 0.35, flyHeavy: 1.25 };
const _hm = new THREE.Matrix4(), _hm2 = new THREE.Matrix4(), _hx = new THREE.Vector3(1, 0, 0);

/** The beak tips of Gus's two models (model space): the most forward vertex above the shoulders near the centre line. */
function beakTips(gus) {
  if (gus.beakTips) return gus.beakTips;
  const tip = (geo, y0) => {
    const p = geo.attributes.position, v = new THREE.Vector3(0, y0, 0);
    let best = -Infinity;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > y0 && Math.abs(p.getX(i)) < 0.03 && p.getZ(i) > best) { best = p.getZ(i); v.set(p.getX(i), p.getY(i), p.getZ(i)); }
    return v;
  };
  gus.beakTips = { stand: tip(gus.standMesh.geometry, GUS_STAND.skin.neck[1]), fly: tip(gus.flyMesh.geometry, GUS_FLY.bodyCenter.y + 0.03) };
  return gus.beakTips;
}

/** The carried item goes into Gus's beak (visual only): its grip point, from its bounding box. */
export function attachCarried(gus, mesh, def) {
  const k = def.cls === 'heavy' ? 0.8 : 1;
  const bb = new THREE.Box3().setFromObject(mesh);
  const h = bb.max.y - bb.min.y, d = bb.max.z - bb.min.z;
  mesh.userData.hold = {
    k, heavy: def.cls === 'heavy',
    grip: new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y + 0.75 * h, bb.min.z + Math.min(0.015, 0.25 * d)),
    depth: d * k,
  };
  mesh.matrixAutoUpdate = false;
  gus.standMesh.add(mesh);
}

/** Each update (after Gus's): the carried item at his beak tip, on whichever model is showing (visual only). */
export function poseCarried(gus, mesh, def, heat = null) {
  const H = mesh.userData.hold || (attachCarried(gus, mesh, def), mesh.userData.hold);
  const tips = beakTips(gus), flying = gus.flyPose.visible;
  const parent = flying ? gus.flyMesh : gus.standMesh;
  if (mesh.parent !== parent) parent.add(mesh);
  let tilt;
  if (flying) {
    // the flight model is upright in its own space and pitched forward by flyPose: undo the cruise pitch
    tilt = (H.heavy ? HOLD_TILT.flyHeavy : HOLD_TILT.flyLight) - GUS_FLY.flightPitch;
    _hm.makeTranslation(tips.fly.x, tips.fly.y, tips.fly.z - 0.004);
  } else {
    // the head bone (model space; its rest is GUS_STAND.skin.head), then the beak tip from there
    const hb = gus.skin.stand.bones.head, h0 = GUS_STAND.skin.head;
    _hm.copy(hb.matrixWorld).multiply(_hm2.makeTranslation(tips.stand.x - h0[0], tips.stand.y - h0[1], tips.stand.z - h0[2] - 0.004));
    // a heavy one is dragged: its far end on the ground (the beak is ~0.24 m up)
    tilt = H.heavy ? Math.asin(Math.min(0.95, tips.stand.y / Math.max(0.05, H.depth))) : HOLD_TILT.light;
  }
  _hm.multiply(_hm2.makeRotationAxis(_hx, tilt)).multiply(_hm2.makeScale(H.k, H.k, H.k)).multiply(_hm2.makeTranslation(-H.grip.x, -H.grip.y, -H.grip.z));
  mesh.matrix.copy(_hm);
  mesh.matrixWorldNeedsUpdate = true;
  const sl = mesh.userData.slice;
  if (sl) sl.rotation.x = heat > 0 ? 0 : 0.35;   // a cold slice droops
}

const COOLING = 0.4;      // fix-19: below this much heat the label says "Cooling, still counts"
const HOVER_WARM_R = 3;   // fix-19: the griddle warms a carried slice within this many metres

export class Items {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'items';
    this.world = [];        // runtime: { uid, id, x, y, z, born, origin, mesh, onGriddle }
    this.carriedMesh = null;
    this.models = {};       // id → baked
    this.seq = 1;
    this.steamT = 0;
    this.guards = [];       // fun pass: (it, peek) => a reason (string) or true when a scheme stops this pick-up; fix-16: peek = only asking (the prompt), no side effects
    this.mats = {
      gold: ruleMaterial({ color: 0xd4a02a, roughness: 0.4, metalness: 0.4 }),
      shiny: ruleMaterial({ color: 0xcfe7ff, roughness: 0.25, metalness: 0.6, emissive: 0x334455 }),
      green: ruleMaterial({ color: 0x7fbf3a }),
      red: ruleMaterial({ color: 0xe8462f }),
      steel: ruleMaterial({ color: 0x8a9098, roughness: 0.5, metalness: 0.5 }),
      cream: ruleMaterial({ color: 0xf2ead8, side: THREE.DoubleSide }),   // #41: the sail (a sheet: dragged, its underside shows)
      tan: ruleMaterial({ color: 0xb08a5a }),
      dark: ruleMaterial({ color: 0x333338 }),
      rust: ruleMaterial({ color: 0x7a4a30 }),
      tennis: ruleMaterial({ map: tennisMap(), roughness: 0.95 }),   // fix-40: Biscuit's ball, optic yellow with its white seam
    };
  }

  async load(registry) {
    for (const id of ['pizza-slice', 'pizza-box', 'traffic-cone', 'battery', 'tourist-camera']) this.models[id] = await registry.baked(id);
    // fix-19: the anchovy slice's own texture (the slice's atlas repainted with anchovies, same UV islands: nanogen)
    const base = this.models['pizza-slice']?.map;
    if (base) {
      try {
        const t = await new THREE.TextureLoader().loadAsync('assets/textures/pizza-slice-anchovy.webp');
        for (const k of ['flipY', 'colorSpace', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'channel']) t[k] = base[k];
        t.needsUpdate = true;
        this.anchovyMap = t;
      } catch { this.anchovyMap = null; }   // (then the code anchovies below)
    }
  }

  get state() { return this.G.state; }
  def(id) { return ITEM_DEFS[id] || { name: id, cls: 'light', code: 'disc' }; }
  get carried() { return this.state.carried; }

  // ------------------------------------------------------------ meshes
  makeMesh(id) {
    const d = this.def(id);
    const g = new THREE.Group();
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    if (d.model && this.models[d.model]) {
      const b = this.models[d.model];
      const mat = b.makeMaterial(d.anchovy && this.anchovyMap ? { map: this.anchovyMap } : {});
      const m = add(b.geometry, mat);
      m.position.y = -b.bounds.min.y;
      if (d.slice) { g.userData.slice = m; g.userData.sliceMat = mat; }
      if (d.anchovy && !this.anchovyMap) for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.012, 0.004, 0.05), this.mats.dark, (k - 1.5) * 0.03, -b.bounds.min.y + 0.022, 0.02 + (k % 2) * 0.03, 0, k * 0.5, 0);
      return g;
    }
    switch (d.code) {
      case 'shiny': add(new THREE.OctahedronGeometry(0.035), this.mats.shiny, 0, 0.035); break;
      case 'key': add(new THREE.TorusGeometry(0.02, 0.007, 6, 12), this.mats.gold, -0.03, 0.01, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.06, 0.008, 0.012), this.mats.gold, 0.015, 0.01, 0); break;
      case 'wrench': add(new THREE.BoxGeometry(0.16, 0.012, 0.022), this.mats.steel, 0, 0.01, 0); add(new THREE.TorusGeometry(0.02, 0.008, 5, 10, 4.5), this.mats.steel, 0.09, 0.01, 0, Math.PI / 2); break;
      case 'peas': for (let k = 0; k < 5; k++) add(new THREE.SphereGeometry(0.014, 8, 6), this.mats.green, (k - 2) * 0.016, 0.014, (k % 2) * 0.012); break;
      case 'specs': add(new THREE.TorusGeometry(0.018, 0.004, 5, 12), this.mats.dark, -0.022, 0.02, 0); add(new THREE.TorusGeometry(0.018, 0.004, 5, 12), this.mats.dark, 0.022, 0.02, 0); break;
      case 'falafel': add(new THREE.IcosahedronGeometry(0.025, 1), this.mats.rust, 0, 0.025); break;
      case 'ball': add(new THREE.SphereGeometry(0.06, 18, 12), this.mats.tennis, 0, 0.06, 0, 0.5, 0, 0.3); break;
      case 'sail': add(new THREE.PlaneGeometry(0.4, 0.5), this.mats.cream, 0, 0.02, 0, -Math.PI / 2); break;
      case 'sack': add(new THREE.SphereGeometry(0.16, 12, 10), this.mats.tan, 0, 0.14); break;
      case 'pipe': add(new THREE.CylinderGeometry(0.15, 0.15, 3, 10), this.mats.rust, 0, 0.15, 0, 0, 0, Math.PI / 2); break;
      case 'cart': add(new THREE.BoxGeometry(0.6, 0.5, 0.9), this.mats.steel, 0, 0.5); break;
      case 'box-small': add(new THREE.BoxGeometry(0.08, 0.03, 0.12), this.mats.dark, 0, 0.015); break;
      case 'camera': add(new THREE.BoxGeometry(0.13, 0.08, 0.06), this.mats.tan, 0, 0.04); add(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12), this.mats.dark, 0, 0.04, 0.04, Math.PI / 2); break;   // (if the GLB is missing)
      case 'sprat': add(new THREE.ConeGeometry(0.018, 0.11, 6), this.mats.shiny, 0, 0.02, 0, 0, 0, Math.PI / 2); break;
      default: add(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 12), this.mats.gold, 0, 0.003); break;
    }
    return g;
  }

  // ------------------------------------------------------------ world items
  /** Put an item in the world. opts: { born (slices: game time it left the oven), origin, y } */
  spawn(id, x, z, { born = null, origin = null, y = null, uid = null, placed = false, extra = null } = {}) {
    const yy = y ?? this.G.surfaceY(x, z, 50);
    const it = { uid: uid || 'i' + this.seq++, id, x, y: yy, z, born, origin: origin || { x, z }, placed, ...(extra || {}) };
    this.state.items.push({ uid: it.uid, id, x, y: yy, z, born, origin: it.origin, placed, ...(extra || {}) });
    this.#addRuntime(it);
    return it;
  }

  #addRuntime(it) {
    it.mesh = this.makeMesh(it.id);
    it.mesh.position.set(it.x, it.y, it.z);
    it.mesh.rotation.y = (it.uid.length * 1.7) % 6.28;
    this.group.add(it.mesh);
    this.world.push(it);
    this.G.interact.register({
      id: 'item:' + it.uid, kind: 'item', get x() { return it.x; }, get y() { return it.y; }, get z() { return it.z; }, r: 0.9,
      // fix-16: a guarded item says so in the prompt ("Guarded: the peas"), so a refused Peck is never a mystery
      label: () => (this.def(it.id).cls === 'huge' || (it.id === 'box' && it.placed) ? null : this.guardReason(it, true) ? `Guarded: ${theItem(this.def(it.id).name)}` : `Pick up ${theItem(this.def(it.id).name)}`),
      enabled: () => this.world.includes(it),
      priority: it.low ? 2 : 5,   // fun pass: a guarded item (the anchovy on Pickles' sill) gives way to the character beside it
      act: () => this.pickUp(it),
    });
    if (it.id === 'box') {
      this.G.interact.register({
        id: 'boxopen:' + it.uid, kind: 'box', get x() { return it.x; }, get y() { return it.y; }, get z() { return it.z; }, r: 0.9,
        // a box Gus has set down opens on a Peck; one that arrived in the world is picked up
        label: () => (it.placed ? 'Peck the box open' : null), enabled: () => this.world.includes(it) && it.placed, priority: 6,
        act: () => this.openBox(it),
      });
    }
  }

  remove(it) {
    this.world = this.world.filter((w) => w !== it);
    this.state.items = this.state.items.filter((s) => s.uid !== it.uid);
    it.mesh?.removeFromParent();
    this.G.interact.unregister('item:' + it.uid);
    this.G.interact.unregister('boxopen:' + it.uid);
  }

  /** Rebuild meshes from the saved state (after a load). */
  restore() {
    this.carryWarm = 0;   // fix-19
    for (const it of [...this.world]) { it.mesh?.removeFromParent(); this.G.interact.unregister('item:' + it.uid); this.G.interact.unregister('boxopen:' + it.uid); }
    this.world = [];
    // fix-25: a save made after a glint spawned its item keeps the item where the clue used to put it; two of those spots
    // are now inside solid turrets (roofs collide as drawn), so the item moves to the clue's new spot
    for (const s of this.state.items) for (const m of MOVED_ITEMS) {
      if (s.id !== m.item || Math.hypot(s.x - m.from.x, s.z - m.from.z) > 0.6) continue;
      const d = CLUES.find((q) => q.id === m.clue);
      if (d) { s.x = d.x; s.z = d.z; s.y = this.G.collision.surface(d.x, d.z, 400).y + (d.y || 0); s.origin = { x: d.x, z: d.z }; }   // (review: the origin too: the clue finds its item by it, for its light shaft and its flag)
    }
    const cc = this.state.carried;
    if (cc?.origin) for (const m of MOVED_ITEMS) { if (cc.id === m.item && Math.hypot(cc.origin.x - m.from.x, cc.origin.z - m.from.z) <= 0.6) { const d = CLUES.find((q) => q.id === m.clue); if (d) cc.origin = { x: d.x, z: d.z }; } }
    for (const s of this.state.items) this.#addRuntime({ ...s });
    const maxSeq = Math.max(0, ...this.state.items.map((s) => +String(s.uid).slice(1) || 0));
    this.seq = maxSeq + 1;
    this.#syncCarried();
  }

  // ------------------------------------------------------------ carrying
  pickUp(it) {
    const d = this.def(it.id);
    const G = this.G;
    if (d.cls === 'huge') { G.toast('Too big. That needs a hauler.'); return false; }
    // fun pass: the picnic's tub, Pickles' sill. fix-16: the reason is a toast at Gus every time (it was a bubble over
    // a picnicker, then only a blip: the owner pressed Peck by the table and could not tell what had happened)
    const why = this.guardReason(it);
    if (why) { G.toast(typeof why === 'string' ? why : `Something's stopping you taking ${theItem(d.name)}.`, { seconds: 3.5 }); G.bus.emit('fail', { kind: 'guard', item: it.id }); return false; }
    if (this.state.carried) {
      // swap: drop what we hold first
      this.drop();
    }
    this.remove(it);
    this.state.carried = { uid: it.uid, id: it.id, born: it.born, origin: it.origin };
    this.#syncCarried();
    G.audio.play(d.slice ? 'slice-pick-up' : 'pick-up', { at: G.gus.position });
    if (d.gear && !this.state.gear.includes(d.gear)) { this.state.gear.push(d.gear); this.take(); G.toast(`New gear: ${d.name}`, { kind: 'stamp' }); }
    G.bus.emit('pickup', { item: it.id, uid: it.uid });
    return true;
  }

  /** fix-16: the first guard's reason for refusing this pick-up (a string, or true), or null. peek: the prompt asking. */
  guardReason(it, peek = false) {
    for (const g of this.guards) { const r = g(it, peek); if (r) return r; }
    return null;
  }

  /** Q: drop what Gus carries in front of him. */
  drop() {
    const c = this.state.carried;
    if (!c) return null;
    const g = this.G.gus;
    const x = g.position.x + Math.sin(g.yaw) * 0.25, z = g.position.z + Math.cos(g.yaw) * 0.25;
    this.state.carried = null;
    this.#syncCarried();
    // fix-23: dropped over water it would lie where Gus can't stand to peck it (a dead end for one-time items): a slice
    // sinks (there are always more; den-cats puts the next anchovy out on the sill), anything else floats back to its
    // source (systems/schemes.js keeper), or where it was found, or the nearest dry ground
    if (this.G.wetAt(x, z, g.position.y) && this.def(c.id).cls !== 'huge') {   // (the surface it would land on: a bridge deck is dry)
      const d = this.def(c.id), name = theItem(d.name, true);
      this.G.audio.play('duck-dive-bloop', { vol: 0.6, at: g.position });
      this.G.particles.splash?.(x, g.position.y, z, 8);
      this.G.bus.emit('drop', { item: c.id, x, z, water: true });
      if (d.slice) { this.G.toast(`${name} sank. There are always more.`); return null; }
      const to = this.homeFor(c);
      this.G.toast(`${name} floated back to ${to.label}.`, { seconds: 4 });
      return this.spawn(c.id, to.x, to.z, { origin: c.origin, uid: c.uid });
    }
    const y = Math.min(g.position.y, this.G.surfaceY(x, z, g.position.y + 0.1));
    const it = this.spawn(c.id, x, z, { born: c.born, origin: c.origin, uid: c.uid, y, placed: true });
    this.G.audio.play(this.def(c.id).cls === 'heavy' ? 'drop-thud' : 'drop-thud', { vol: 0.6, at: g.position });
    this.G.bus.emit('drop', { item: c.id, x, z });
    return it;
  }

  /** fix-23: where a lost item goes back to: its keeper source, else where it was found (if dry), else dry ground by Gus. */
  homeFor(c) {
    const G = this.G, r = G.schemes?.keeperRule(c.id);
    if (r) return G.schemes.keeperSpot(r);
    if (c.origin && !G.collision.waterAt(c.origin.x, c.origin.z)) return { x: c.origin.x, z: c.origin.z, label: 'where you found it' };
    const p = G.dryNear(G.gus.position.x, G.gus.position.z);
    return { x: p.x, z: p.z, label: 'the shore' };
  }

  /** Take the carried item away (it was given). */
  take() { const c = this.state.carried; this.state.carried = null; this.#syncCarried(); return c; }

  /** fix-40: an ally hands Gus an item (the ducks with Biscuit's ball): it goes straight to his beak, with the pick-up sound
   *  and the pickup event a peck would give (the fight and the item keeper listen for it). */
  handOver(id) {
    this.give(id);
    const c = this.state.carried;
    this.G.audio.play('pick-up', { at: this.G.gus.position });
    this.G.bus.emit('pickup', { item: id, uid: c.uid, handed: true });
  }

  /** Give Gus an item directly (scheme rewards, dev). */
  give(id, { born = null } = {}) {
    if (this.state.carried) this.drop();
    // (fix-23: origin = where Gus got it, so Ruffled / a water drop can float it back to somewhere dry and reachable)
    const gp = this.G.gus?.position, home = gp ? this.G.dryNear(gp.x, gp.z) : null;
    this.state.carried = { uid: 'i' + this.seq++, id, born: this.def(id).slice ? (born ?? this.G.state.time) : born, origin: home ? { x: home.x, z: home.z } : null };
    this.#syncCarried();
  }

  #syncCarried() {
    this.carriedMesh?.removeFromParent();
    this.carriedMesh = null;
    const c = this.state.carried;
    const G = this.G;
    if (c) {
      this.carriedMesh = this.makeMesh(c.id);
      attachCarried(G.gus, this.carriedMesh, this.def(c.id));
    }
    G.gus.carryLimits = c && this.def(c.id).cls === 'heavy' ? HEAVY_LIMITS : null;
  }

  /** 0..1 heat of a slice (1 just out of the oven, 0 cold), or null for other items. */
  heat(c = this.state.carried) {
    if (!c || !this.def(c.id).slice) return null;
    if (c.born == null) return 0;
    return Math.max(0, 1 - (this.G.state.time - c.born) / HOT);
  }
  isHot(c = this.state.carried) { const h = this.heat(c); return h != null && h > 0; }
  /** fix-19: the carried label's word: 'Hot', 'Cooling, still counts' (still hot by every taker's rule) or 'Cold' (exactly !isHot). */
  heatWord(c = this.state.carried) { const h = this.heat(c); return h == null ? null : !(h > 0) ? 'Cold' : h > COOLING ? 'Hot' : 'Cooling, still counts'; }

  // ------------------------------------------------------------ the box, the griddle
  openBox(it) {
    const G = this.G;
    const hot = it.born != null && G.state.time - it.born < HOT;
    this.remove(it);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1;
      this.spawn('slice', it.x + Math.cos(a) * 0.35, it.z + Math.sin(a) * 0.35, { born: hot ? it.born : null });
    }
    G.audio.play('pizza-box-open', { at: it });
    G.particles.burst('steam', it.x, it.y + 0.1, it.z, 10);
    G.bus.emit('boxOpened', { x: it.x, z: it.z });
  }

  griddleSpot() {
    const g = SLICE.griddle[this.G.state.phase];
    return g ? { x: g.x, z: g.z, y: 1.0 } : null;
  }

  // ------------------------------------------------------------ the fixed update
  update(dt) {
    const G = this.G, t = G.state.time;
    // pose the carried item in Gus's beak (Gus's model space; he faces +Z)
    if (this.carriedMesh) poseCarried(G.gus, this.carriedMesh, this.def(this.state.carried.id), this.heat());
    // steam over hot slices
    this.steamT += dt;
    if (this.steamT > 0.12) {
      this.steamT = 0;
      const c = this.state.carried;
      if (c && this.heat(c) > 0 && G.gus) {
        const p = G.gus.position;
        if (Math.random() < this.heat(c) + 0.15) G.particles.burst('steam', p.x + Math.sin(G.gus.yaw) * 0.22, p.y + 0.3, p.z + Math.cos(G.gus.yaw) * 0.22, 1, { spread: 0.05 });
      }
      for (const it of this.world) {
        if (!this.def(it.id).slice || it.born == null) continue;
        const h = Math.max(0, 1 - (t - it.born) / HOT);
        if (h > 0 && Math.random() < h) G.particles.burst('steam', it.x, it.y + 0.05, it.z, 1, { spread: 0.08 });
      }
    }
    // the griddle: a slice lying on it for 3 s comes back hot
    const gs = this.griddleSpot();
    for (const it of this.world) {
      if (!this.def(it.id).slice) continue;
      const on = gs && Math.hypot(it.x - gs.x, it.z - gs.z) < 0.9;
      if (on) {
        it.onGriddle = (it.onGriddle || 0) + dt;
        if (it.onGriddle >= SLICE.griddle.warm && (it.born == null || t - it.born > 1)) {
          it.born = t;
          const s = this.state.items.find((q) => q.uid === it.uid); if (s) s.born = t;
          G.audio.play('griddle-sizzle', { at: it });
          G.particles.burst('steam', it.x, it.y + 0.1, it.z, 14);
          G.bus.emit('sliceWarmed', { uid: it.uid });
          it.onGriddle = -99;
        }
      } else it.onGriddle = 0;
    }
    // fix-19: hovering or perching within about 3 m of the griddle warms a CARRIED slice by the same 3 s rule (no landing
    // on the cart needed: the owner found the carts hard to land on). Only the halal griddle: not Vinnie's cart, not the
    // ice-cream truck (a cart within 3 m of Queenie would remove the puzzle; the 820 m is the clever part).
    const c = this.state.carried, gp = G.gus?.position;
    if (gs && c && this.def(c.id).slice && gp && Math.hypot(gp.x - gs.x, gp.z - gs.z) < HOVER_WARM_R && gp.y - G.surfaceY(gs.x, gs.z, 2) < 4) {
      this.carryWarm = (this.carryWarm || 0) + dt;
      if (this.carryWarm >= SLICE.griddle.warm && (c.born == null || t - c.born > 1)) {
        c.born = t;
        G.audio.play('griddle-sizzle', { at: gp });
        G.particles.burst('steam', gp.x + Math.sin(G.gus.yaw) * 0.25, gp.y + 0.25, gp.z + Math.cos(G.gus.yaw) * 0.25, 14);
        G.toast('Warm again! Hot off the griddle.', { seconds: 2.6 });
        G.bus.emit('sliceWarmed', { uid: c.uid, carried: true });
        this.carryWarm = -99;
      }
    } else this.carryWarm = 0;
  }

  // ------------------------------------------------------------ naps and Ruffled
  /** The nap rule for items. Returns notes for the wake-up toast. */
  onNap() {
    const notes = [];
    const c = this.state.carried;
    if (c && this.def(c.id).slice) c.born = null;   // a carried slice goes cold
    const gone = {};
    let others = false;   // something Gus never had (the anchovy on the sill, a slice a human dropped): "the", not "your"
    for (const it of [...this.world]) if (this.def(it.id).slice || it.id === 'box') { this.remove(it); gone[it.id] = (gone[it.id] || 0) + 1; if (!it.placed) others = true; }
    // batch-2 (#20): say what went ("A rat took your slice while you napped."; it was "A rat got it.")
    const ids = Object.keys(gone);
    if (ids.length) {
      const word = (id) => { const w = { slice: 'slice', 'slice-anchovy': 'anchovy slice', box: 'pizza box' }[id] || this.def(id).name.toLowerCase(); return gone[id] > 1 ? w + 'es'.slice(w.endsWith('x') ? 0 : 1) : w; };
      const what = ids.map(word).join(' and ');
      const many = ids.length > 1 || gone[ids[0]] > 1;
      notes.push(`${many ? 'Rats' : 'A rat'} took ${others ? 'the' : 'your'} ${what} while you napped.`);
    }
    return notes;
  }

  /** Ruffled: a carried light item floats back to where it was found (slices excepted). Returns the note. */
  onRuffled() {
    const c = this.state.carried;
    if (!c) return '';
    const d = this.def(c.id);
    this.take();
    if (d.slice) return `The ${d.name.toLowerCase()} is gone. There are always more.`;
    // fix-23: never onto the water (a heavy item dropped in the Rhoda fight over the Meer was out of reach for good)
    if (d.cls === 'heavy' && !this.G.wetAt(this.G.gus.position.x, this.G.gus.position.z, this.G.gus.position.y)) { const g = this.G.gus.position; this.spawn(c.id, g.x, g.z, { origin: c.origin }); return `You dropped ${theItem(d.name)}. It's marked on the compass.`; }
    const to = this.homeFor(c);
    this.spawn(c.id, to.x, to.z, { origin: c.origin });
    return `${theItem(d.name, true)} floated back to ${to.label}.`;
  }
}

/** Grates: the rats' fast travel (after `den-rats`; 110th only after the cats-and-rats truce). */
export function grateBlockedReason(state, id) {
  if (!state.crews.includes('rats') && !state.flags['dev.grates']) return 'The rats haven\'t joined';
  if (id === 'grate-110-lenox' && !state.flags['truce-cats-rats']) return "Cats' block";
  return null;
}
export { GRATES };

// fix-25: items that clues used to put somewhere now solid (from: the old spot; clue: the clue whose spot they move to)
const MOVED_ITEMS = [
  { item: 'shiny', from: { x: 84, z: -26.5 }, clue: 'shiny-flagpole' },   // inside the Plaza's Grand Army Plaza turret
  { item: 'shiny', from: { x: 79, z: -30 }, clue: 'shiny-flagpole' },     // (an interim spot one re-recorded fixture caught)
  { item: 'shiny', from: { x: -131.6, z: 276 }, clue: 'shiny-cpw72' },     // inside the gabled apartments' corner turret
];

/** fix-40: an item's name in a sentence: "the pizza slice", but a proper name keeps its capital and takes no article
 *  ("Biscuit's tennis ball"; it read "the biscuit's ball"). cap: at the start of a sentence. */
export function theItem(name, cap = false) {
  if (/^[A-Z][\w-]*'s\s/.test(name)) return name;
  return (cap ? 'The ' : 'the ') + name.toLowerCase();
}

// fix-40: a tennis ball's look, drawn once: optic yellow felt with the white seam (on the sphere's lat-long map the seam is
// a wave crossing the equator twice per half-turn)
function tennisMap() {
  if (typeof document === 'undefined') return null;
  const W = 128, H = 64, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = '#cfe23f'; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 260; k++) { x.fillStyle = k % 2 ? 'rgba(255,255,220,0.18)' : 'rgba(120,140,20,0.14)'; x.fillRect((k * 37) % W, (k * 23) % H, 2, 2); }
  x.strokeStyle = '#f6f6ea'; x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= W; i += 2) { const y = H / 2 + Math.sin((i / W) * Math.PI * 4) * H * 0.28; i ? x.lineTo(i, y) : x.moveTo(i, y); }
  x.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
