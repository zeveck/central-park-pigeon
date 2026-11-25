// Clue spots and talents ("Calling allies"). Every spot shows only its world
// clue, big enough to read from 10 to 60 m (a translucent dust column with
// acorn sparkles, bubble rings and a white splash, a glint shaft, a wobbling
// thing on a high edge, a stuck door that puffs dust, a "…" over a human in the
// way, a "!" over a human with something to trade, a pulsing ring under a huge
// item). The first time a talent is taught the clue also shows the crew's icon.
//
// Ask (from the Ally wheel, or by Pecking a Called ally): ask(c, crew) finds the
// best active spot near the ally that fits one of its talents (crews.js
// TALENT_CLUES), the ally walks, hops, swims or flies to it and does its pose,
// and the effect happens (an item comes up, a human is lured or chased, a door
// opens, a huge item is hauled, a cart is sabotaged, spikes come off). Then the
// bus gets 'talent' { ally, talent, clue } and 'ask' { ally, x, z, clue } (scheme
// steps listen for either), plus 'haul' and 'trade' for those. Nothing fits:
// ask() returns false and allies.js plays the wrong-place line.
//
// Data: layout.js CLUES, DOORS, BLOCKERS, TRADES, SPIKE_SITES; crews.js
// TALENT_CLUES, TALENT_ACT, HAULERS. Persistent: flags (`clue.<id>`, door flags,
// counts in state.clueCounts); per phase: state.phaseUsed (a nap clears it).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLUES, DOORS, BLOCKERS, TRADES, SPIKE_SITES, PLACES, TRANSVERSES, PARK, NESTS } from '../world/layout.js';
import { CREW, CHARACTERS, HAULERS, TALENT_CLUES, TALENT_ACT, phaseList } from '../data/crews.js';
import { ITEM_DEFS } from './items.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { derived } from '../state/gamestate.js';
import { GEAR_NAMES } from '../data/schemes.js';

const ASK_R = 9;           // how far from the ally a spot can be
const SEEN_R = 60;         // clue pings on the compass within this range
const WORKSHOP = PLACES.workshop;
const basic = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, fog: true, ...extra });

export class Clues {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'clues';
    this.list = [];          // runtime spots
    this.fetching = new Map();   // item id → game time an ally set off to bring it back (#perform → #bringBack; the keeper waits)
    this.doors = [];
    this.pollT = 0;
    this.t = 0;
    this.haulRings = new Map();
    this.anims = [];         // item tweens (hauls, falls)
  }

  get st() { return this.G.state; }

  // ------------------------------------------------------------ build
  build() {
    const G = this.G;
    this.mats = {
      plume: basic(0xc99a52, 0.6, { side: THREE.DoubleSide }), ring: basic(0xffffff, 0.8, { side: THREE.DoubleSide }), shaft: basic(0xffe58a, 0.42, { side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
      glint: basic(0xfff6c8), strip: ruleMaterial({ color: 0xc4302b }), net: basic(0x2a2a2a, 0.7, { side: THREE.DoubleSide }), bolt: ruleMaterial({ color: 0x8a9098, metalness: 0.5, roughness: 0.4 }),
      door: ruleMaterial({ color: 0x8e949a, metalness: 0.3, roughness: 0.6 }), gate: ruleMaterial({ color: 0x2c3229 }), wood: ruleMaterial({ color: 0x6b4a2a }), shed: ruleMaterial({ color: 0x4d6b45 }), roof: ruleMaterial({ color: 0x47423f }),
      hugeRing: basic(0xf2c230, 0.55, { side: THREE.DoubleSide }),
    };
    this.geo = {
      plume: new THREE.CylinderGeometry(0.4, 1.15, 3.4, 14, 1, true).translate(0, 1.7, 0),
      ring: new THREE.RingGeometry(0.38, 0.66, 32).rotateX(-Math.PI / 2),
      shaft: new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6, 1, true).translate(0, 0.9, 0),
      glint: new THREE.OctahedronGeometry(0.06),
      strip: new THREE.BoxGeometry(0.34, 0.02, 0.06),
      hugeRing: new THREE.RingGeometry(1.15, 1.35, 32).rotateX(-Math.PI / 2),
      spout: new THREE.ConeGeometry(0.5, 1.8, 12, 1, true).translate(0, 0.9, 0),
      bubble: new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    };
    this.mats.spout = basic(0xffffff, 0.8, { side: THREE.DoubleSide });
    // the scheme spots
    for (const def of CLUES) this.#add(def);
    // spike sites: strips teeter on the edge (cats Knock them); nets and bolts (raccoons Rig, Rhoda Lifts)
    for (const s of SPIKE_SITES) {
      const pts = s.perches || [{ x: s.x, z: s.z }];
      const at = s.ledge ? { x: s.x, z: s.z } : pts[0];   // fix-36: a ledge's spot is its middle (the strips line both runs)
      this.#add({ id: 'spike-' + s.id, type: s.kind === 'strips' ? 'teeter' : 'net', spikeSite: s.id, x: at.x, z: at.z, on: 'roof', r: s.perches ? Math.max(8, (s.r || 4) + 4) : (s.r || 4) + 12, free: true, points: pts, does: { spike: s.id }, needs: s.needs, refuse: s.refuse });
    }
    for (const d of DOORS) this.#door(d);
    // blockers ("…") and trades ("!") hang their bubbles on the humans themselves (update)
    this.blockers = BLOCKERS.map((b) => ({ def: b, bubble: null }));
    this.trades = TRADES.map((t) => ({ def: t, bubble: null }));
    // Hold Coo: photobombs, the waiter's bread basket, the 103rd Street shed's latch rope
    G.bus.on('coo', (t, e) => { if (e.hold) this.#holdCoo(e); });
    G.bus.on('pickup', (t, e) => { for (const c of this.list) if (c.itemUid === e.uid) { this.st.flags[`clue.${c.def.id}`] = true; this.#seen(c.def.icon); } });
    this.refresh();
  }

  #add(def) {
    const G = this.G;
    const c = { def, x: def.x, z: def.z, y: 0, active: false, mesh: null, seenT: 0, wob: def.id.length };
    c.y = this.#resolveY(def);
    c.mesh = this.#tell(c);
    if (c.mesh) { c.mesh.visible = false; this.group.add(c.mesh); }
    this.list.push(c);
    if (def.peck) {
      G.interact.register({ id: 'clue:' + def.id, kind: 'clue', get x() { return c.x; }, get y() { return c.y; }, get z() { return c.z; }, r: 1.6, dy: 3, priority: 4,
        label: () => (c.active && this.#visibleNow(c) ? 'Peck the plume' : null), act: () => this.#gusPecks(c) });
    }
    if (def.type === 'stuck') {
      G.interact.register({ id: 'stuck:' + def.id, kind: 'clue', get x() { return c.x; }, get y() { return c.y; }, get z() { return c.z; }, r: 1.8, dy: 3, priority: 1,
        label: () => (c.active ? 'Peck the door' : null), act: () => { G.particles.burst('dust', c.x, c.y + 0.6, c.z, 14, { spread: 0.8 }); G.audio.play('peck', { at: c }); G.toast("It's stuck fast. Something strong could shift it."); } });
    }
  }

  #resolveY(def) {
    const G = this.G;
    if (def.y != null) return (def.on === 'roof' ? G.collision.surface(def.x, def.z, 400).y : G.terrain.heightAt(def.x, def.z)) + def.y;
    if (def.on?.startsWith('water:')) { const w = G.collision.waterAt(def.x, def.z); return w ? w.level : G.surfaceY(def.x, def.z, 50); }
    if (def.on === 'roof') return G.collision.surface(def.x, def.z, 400).y;
    return G.surfaceY(def.x, def.z, G.terrain.heightAt(def.x, def.z) + 1.5);
  }

  /** The big world tell for a spot (a group in game coordinates). */
  #tell(c) {
    const d = c.def, g = new THREE.Group();
    g.position.set(c.x, c.y, c.z);
    const add = (geo, mat, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; if (mat.transparent) m.renderOrder = 3; g.add(m); return m; };
    switch (d.type) {
      case 'dig': g.userData.plume = add(this.geo.plume, this.mats.plume); g.userData.plume2 = add(this.geo.plume, this.mats.plume); g.userData.plume2.scale.set(0.6, 0.8, 0.6); break;
      case 'dive':
        g.userData.rings = [0, 1, 2].map(() => { const m = add(this.geo.ring, this.mats.ring.clone(), 0.1); m.renderOrder = 3; return m; });
        g.userData.spout = add(this.geo.spout, this.mats.spout, 0.05);   // the white splash (reads from the shore too)
        g.userData.bubbles = [0, 1, 2, 3, 4].map((i) => { const m = add(this.geo.bubble, this.mats.ring, 0.1); m.position.set(Math.cos(i * 2.4) * 0.45, 0.1, Math.sin(i * 2.4) * 0.45); return m; });
        break;
      case 'grate': g.userData.glint = add(this.geo.glint, this.mats.glint, -0.18); g.userData.shaft = add(this.geo.shaft, this.mats.shaft, -0.2); break;
      case 'glint': case 'hidden': g.userData.shaft = add(this.geo.shaft, this.mats.shaft, 0); g.userData.shaft.scale.set(1.4, 1.1, 1.4); break;
      case 'teeter': {
        const pts = d.points || [{ x: d.x, z: d.z }];
        // fix-36: big strips (the museum ledge) are themselves the tell (spikes.js draws them tipped over the lip); no
        // separate rocking strip (it swung through the real ones)
        if (SPIKE_SITES.find((q) => q.id === d.spikeSite)?.big) { g.userData.wobblers = []; break; }
        g.userData.wobblers = pts.map((p) => {
          let obj;
          if (d.spikeSite) obj = new THREE.Mesh(this.geo.strip, this.mats.strip);
          else if (d.prop === 'glass') obj = this.#wineGlass();   // fun pass (P8)
          else obj = this.G.items.makeMesh(d.does?.item === 'gate-key' ? 'gate-key' : d.does?.item === 'box' ? 'box' : d.does?.item || 'slice');
          const top = d.spikeSite ? this.G.collision.surface(p.x, p.z, 400).y - c.y + 0.03 : 0;
          obj.position.set(p.x - c.x, top, p.z - c.z);
          g.add(obj);
          return obj;
        });
        // #43: the lot's gate key hangs on a hook by the gate ("Locked. The key hangs on a hook by the gate."): an iron post
        // from the ground, a short arm and a hook, at the key (it used to hang in mid-air). Always there (not in g, which hides).
        if (d.id === 'lot-key') {
          const iron = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.6, metalness: 0.5 }), H = c.y - this.G.terrain.heightAt(d.x, d.z);
          const post = new THREE.Group(); post.position.set(d.x, c.y - H, d.z);
          const bx = (w, h, dd, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), iron); m.position.set(x, y, z); m.castShadow = true; post.add(m); };
          bx(0.06, H + 0.25, 0.06, 0, (H + 0.25) / 2, 0.32); bx(0.035, 0.035, 0.34, 0, H + 0.22, 0.16); bx(0.02, 0.12, 0.02, 0, H + 0.16, 0);
          this.group.add(post);
        }
        break;
      }
      case 'net': {
        const pts = d.points || [{ x: d.x, z: d.z }];
        const site = SPIKE_SITES.find((s) => s.id === d.spikeSite);
        for (const p of pts) {
          const top = this.G.collision.surface(p.x, p.z, 400).y - c.y;
          if (site?.kind === 'bolts') for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), this.mats.bolt); b.position.set(p.x - c.x + (k - 1.5) * 0.12, top + 0.03, p.z - c.z); g.add(b); }
          else { const n = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9, 6, 4), this.mats.net); n.material.wireframe = false; n.rotation.x = -Math.PI / 2.4; n.position.set(p.x - c.x, top + 0.25, p.z - c.z); g.add(n); const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9, 6, 4), basic(0x111111, 0.9, { wireframe: true })); w.rotation.copy(n.rotation); w.position.copy(n.position); g.add(w); }
        }
        break;
      }
      default: return null;
    }
    return g;
  }

  /** Fun pass (P8): a wine glass (code: foot, stem, bowl, a little red wine), right on the edge of the table. */
  #wineGlass() {
    const g = new THREE.Group();
    const glass = basic(0xdff2ff, 0.45, { side: THREE.DoubleSide }), wine = ruleMaterial({ color: 0x7a1020, roughness: 0.3 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.006, 14), glass);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 6).translate(0, 0.045, 0), glass);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65).translate(0, 0.13, 0), glass);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 6, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4).translate(0, 0.128, 0), wine);
    for (const m of [foot, stem, bowl, w]) { m.renderOrder = 3; g.add(m); }
    g.scale.setScalar(1.6);
    return g;
  }

  // ------------------------------------------------------------ doors
  #door(d) {
    const G = this.G;
    const y = G.surfaceY(d.x, d.z, G.terrain.heightAt(d.x, d.z) + 0.5);
    const g = new THREE.Group();
    g.position.set(d.x, y, d.z);
    g.rotation.y = d.yaw || 0;
    const pivot = new THREE.Group();
    g.add(pivot);
    if (d.kind === 'rollup') {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, 0.08).translate(0, d.h / 2, 0), this.mats.door);
      panel.castShadow = true;
      pivot.add(panel);
      for (let k = 1; k < 6; k++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.03, 0.1), this.mats.gate); rib.position.y = (k / 6) * d.h; pivot.add(rib); }
      if (d.buckled) { panel.rotation.x = 0.06; pivot.rotation.z = 0.04; }
    } else if (d.kind === 'gate') {
      for (let k = 0; k <= 8; k++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, d.h, 5).translate(0, d.h / 2, 0), this.mats.gate); bar.position.x = -d.w / 2 + (k / 8) * d.w; pivot.add(bar); }
      for (const hy of [0.15, d.h - 0.1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.05, 0.05), this.mats.gate); rail.position.y = hy; pivot.add(rail); }
      pivot.position.x = -d.w / 2; for (const ch of pivot.children) ch.position.x += d.w / 2;
    } else {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, 0.06).translate(d.w / 2, d.h / 2, 0), this.mats.wood);
      pivot.add(panel); pivot.position.x = -d.w / 2;
    }
    if (d.shed) {
      // a small shed round the parked cart (the 103rd Street shed): three walls and a roof, the door in the fourth
      const S = d.shed, sy = G.terrain.heightAt(S.x, S.z);
      const walls = [[S.x + S.w / 2, S.z, 0.2, S.d], [S.x, S.z - S.d / 2, S.w, 0.2], [S.x, S.z + S.d / 2, S.w, 0.2], [S.x - S.w / 2, S.z - S.d / 2 + 0.6, 0.2, 1.2], [S.x - S.w / 2, S.z + S.d / 2 - 0.6, 0.2, 1.2]];
      for (const [wx, wz, ww, wd] of walls) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(ww, S.h, wd).translate(0, S.h / 2, 0), this.mats.shed);
        m.position.set(wx, sy, wz); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
        G.collision.addBox({ x: wx, z: wz, y0: sy, h: S.h, w: ww, d: wd, tag: 'shed' });
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(S.w + 0.4, 0.2, S.d + 0.4), this.mats.roof);
      roof.position.set(S.x, sy + S.h + 0.1, S.z); this.group.add(roof);
      G.collision.addBox({ x: S.x, z: S.z, y0: sy + S.h, h: 0.2, w: S.w + 0.4, d: S.d + 0.4, tag: 'roof' });
      // the latch rope, high on the door
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5).translate(0, -0.55, 0), this.mats.wood);
      rope.position.set(0.9, d.rope.y + 0.5, 0.08); g.add(rope);
    }
    // one draw call per door: merge its bars and ribs
    const geos = [], mat = pivot.children[0]?.material;
    pivot.updateMatrixWorld(true);
    for (const ch of pivot.children) { const gg = ch.geometry.clone(); ch.updateMatrix(); gg.applyMatrix4(ch.matrix); geos.push(gg.index ? gg.toNonIndexed() : gg); }
    if (geos.length > 1) { const merged = mergeGeometries(geos.map((q) => { q.deleteAttribute('uv'); return q; }), false); while (pivot.children.length) pivot.remove(pivot.children[0]); const mm = new THREE.Mesh(merged, mat); mm.castShadow = true; pivot.add(mm); }
    const yawC = Math.cos(d.yaw || 0), yawS = Math.sin(d.yaw || 0);
    const col = d.kind === 'swing' ? null : G.collision.addBox({ x: d.x, z: d.z, y0: y, h: d.h, w: Math.abs(d.w * yawC) + Math.abs(0.25 * yawS), d: Math.abs(d.w * yawS) + Math.abs(0.25 * yawC), tag: 'door', walkable: false });
    const door = { def: d, g, pivot, col, open: false, t: 1, y };
    this.group.add(g);
    this.doors.push(door);
    if (d.key) {
      G.interact.register({ id: 'door:' + d.id, kind: 'door', x: d.x, y: y + 0.3, z: d.z, r: 2, dy: 2.5, priority: 5,
        label: () => (!door.open ? (this.st.carried?.id === d.key ? 'Unlock the gate' : 'Locked gate') : null),
        act: () => { if (this.st.carried?.id === d.key) { this.G.items.take(); this.openDoor(d.id); } else { G.audio.play('peck', { at: d }); G.toast('Locked. The key hangs on a hook by the gate.'); } } });
    }
  }

  isOpen(id) { const d = DOORS.find((q) => q.id === id); return !!(this.st.flags['door.' + id] || (d?.flag && this.st.flags[d.flag])); }

  /** Open a door for good (its flag persists through naps). */
  openDoor(id, { quiet = false } = {}) {
    const door = this.doors.find((q) => q.def.id === id);
    if (!door) return;
    this.st.flags['door.' + id] = true;
    if (door.def.flag && door.def.flag !== 'walter.doorOpen') this.st.flags[door.def.flag] = true;
    if (!door.open) { door.open = true; door.t = 0; }
    if (door.col) door.col.off = true;
    if (!quiet) {
      const G = this.G;
      G.audio.play(door.def.kind === 'rollup' ? 'shed-door-fold' : 'cart-squeak', { at: door.def });
      G.particles.burst('dust', door.def.x, door.y + 0.5, door.def.z, 16, { spread: 1 });
      G.toast(`${door.def.name}: open`, { kind: 'stamp' });
      G.bus.emit('door', { id });
    }
  }

  #animDoors(dt) {
    for (const d of this.doors) {
      const want = this.isOpen(d.def.id) || (d.def.flag === 'walter.doorOpen' && this.st.flags['walter.doorOpen']);
      if (want !== d.open) { d.open = want; d.t = 0; if (d.col) d.col.off = want; }
      if (d.t < 1) d.t = Math.min(1, d.t + dt / 1.2);
      const k = d.open ? d.t : 1 - d.t, e = k * k * (3 - 2 * k);
      if (d.def.kind === 'rollup') { d.pivot.scale.y = 1 - 0.88 * e; d.pivot.position.y = d.def.h * 0.88 * e; }
      else d.pivot.rotation.y = -1.75 * e;
    }
  }

  // ------------------------------------------------------------ which spots are live
  #activeFor(def) {
    const G = this.G, st = this.st, E = G.schemes;
    const a = def.active || {};
    if (def.spikeSite) return st.spikes[def.spikeSite] === 'installed';
    if (!def.perPhase && st.flags[`clue.${def.id}`]) return false;
    if (def.perPhase && st.phaseUsed?.[def.id]) return false;
    if (a.scheme && !(E.isOpen(a.scheme) && E.stepIndex(a.scheme) === a.step - 1)) return false;
    if (a.flags && !a.flags.every((f) => st.flags[f])) return false;
    if (a.not && a.not.some((f) => st.flags[f])) return false;
    if (a.phase && !phaseList(a.phase).includes(st.phase)) return false;
    if (def.hidden && !st.flags[def.hidden]) return false;
    return true;
  }

  #visibleNow(c) {
    const d = c.def;
    if (!d.aboveOnly) return true;
    if (this.st.flags[`clue.${d.id}.seen`]) return true;
    const g = this.G.gus.position;
    if (g.y - this.G.terrain.heightAt(g.x, g.z) >= d.aboveOnly && Math.hypot(g.x - c.x, g.z - c.z) < 90) { this.st.flags[`clue.${d.id}.seen`] = true; return true; }
    return false;
  }

  refresh() {
    for (const c of this.list) {
      const was = c.active;
      c.active = this.#activeFor(c.def);
      // glints and hidden things are items lying in the world: spawn once
      if (c.active && c.def.item && (c.def.type === 'glint' || c.def.type === 'hidden') && !this.st.flags[`clue.${c.def.id}.spawned`]) {
        this.st.flags[`clue.${c.def.id}.spawned`] = true;
        const it = this.G.items.spawn(c.def.item, c.x, c.z, { y: c.y, origin: { x: c.x, z: c.z } });
        c.itemUid = it.uid;
      }
      if (c.def.item && c.itemUid == null) c.itemUid = this.G.items.world.find((w) => w.origin && Math.hypot(w.origin.x - c.x, w.origin.z - c.z) < 0.5 && w.id === c.def.item)?.uid ?? null;
      if (was && !c.active && c.iconBubble) { this.G.bubbles.remove(c.iconBubble); c.iconBubble = null; }
    }
  }

  // ------------------------------------------------------------ the fixed update
  update(dt) {
    const G = this.G, st = this.st;
    this.t += dt;
    if ((this.pollT += dt) > 0.25) { this.pollT = 0; this.refresh(); this.#humanBubbles(); this.#hugeRings(); }
    const g = G.gus.position;
    for (const c of this.list) {
      const m = c.mesh;
      const near = Math.hypot(c.x - g.x, c.z - g.z) < 140;
      const show = c.active && near && this.#visibleNow(c) && !(c.def.item && (c.def.type === 'glint' || c.def.type === 'hidden') && !G.items.world.some((w) => w.uid === c.itemUid));
      if (m) m.visible = !!show;   // (perf: `undefined` draws)
      if (!show) { if (c.iconBubble) { G.bubbles.remove(c.iconBubble); c.iconBubble = null; } continue; }
      if (m) this.#animate(c, dt);
      // first-time talent icon
      const ic = c.def.icon;
      if (ic && !st.seenTalents.includes(CREW[ic].talents[0]) && !c.iconBubble) {
        c.iconBubble = G.bubbles.add('', { kind: 'icon', html: `<img alt="" src="assets/portraits/${CREW[ic].boss}.webp">`, at: { x: c.x, y: c.y + (c.def.type === 'dig' ? 3.1 : 1.6), z: c.z }, ttl: 0, range: 90 });
      }
      // a clue on screen for 2 s gets a "?" ping on the compass
      if (!st.cluePings) st.cluePings = {};
      if (!st.cluePings[c.def.id] && Math.hypot(c.x - g.x, c.z - g.z) < SEEN_R) {
        const p = G.project(c.x, c.y + 1, c.z);
        if (p.visible) { c.seenT += dt; if (c.seenT > 2) st.cluePings[c.def.id] = true; }
      }
    }
    this.#animDoors(dt);
    // item tweens (hauls, things falling off edges)
    for (const a of [...this.anims]) {
      a.t += dt;
      const k = Math.min(1, a.t / a.secs);
      a.step(k);
      if (k >= 1) { this.anims = this.anims.filter((q) => q !== a); a.done?.(); }
    }
  }

  #animate(c, dt) {
    const G = this.G, u = c.mesh.userData, T = this.t + c.wob;
    switch (c.def.type) {
      case 'dig':
        u.plume.rotation.y = T * 0.6; u.plume.scale.set(1 + 0.08 * Math.sin(T * 2.2), 1 + 0.1 * Math.sin(T * 1.7), 1 + 0.08 * Math.sin(T * 2.2));
        u.plume2.rotation.y = -T * 0.9;
        if (Math.floor(T * 3) !== Math.floor((T - dt) * 3)) G.particles.burst('dust', c.x, c.y + 0.1, c.z, 2, { spread: 0.6 });
        if (Math.floor(T * 1.6) !== Math.floor((T - dt) * 1.6)) G.particles.burst('sparkle', c.x, c.y + 0.4, c.z, 3, { spread: 1.0, color: [0.86, 0.6, 0.25] });
        break;
      case 'dive':
        u.rings.forEach((r, i) => { const k = ((T * 0.45 + i / 3) % 1); r.scale.setScalar(0.4 + k * 3.2); r.material.opacity = 0.85 * (1 - k); });
        { const k = (T / 1.6) % 1; const h = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0; u.spout.scale.set(0.6 + h * 0.6, Math.max(0.01, h), 0.6 + h * 0.6); u.spout.visible = h > 0.02; }
        u.bubbles.forEach((b, i) => { const k = (T * 0.9 + i * 0.37) % 1; b.scale.setScalar(k < 0.8 ? 0.4 + k : 0.01); });
        if (Math.floor(T / 1.8) !== Math.floor((T - dt) / 1.8)) { G.particles.splash(c.x, c.y + 0.1, c.z, 16); }
        if (Math.floor(T * 4) !== Math.floor((T - dt) * 4)) G.particles.burst('steam', c.x + Math.sin(T * 3) * 0.3, c.y + 0.02, c.z + Math.cos(T * 2) * 0.3, 1, { spread: 0.2 });
        break;
      case 'grate': case 'glint': case 'hidden':
        if (u.glint) u.glint.rotation.y = T * 2.5;
        u.shaft.material.opacity = 0.25 + 0.2 * Math.sin(T * 3);
        if (Math.floor(T * 1.4) !== Math.floor((T - dt) * 1.4)) G.particles.burst('sparkle', c.x, c.y + 0.2, c.z, 2, { spread: 0.25 });
        break;
      case 'teeter':
        for (const w of u.wobblers) { w.rotation.z = Math.sin(T * 5.5) * 0.28; w.rotation.x = Math.sin(T * 3.1) * 0.08; }
        if (u.wobblers.length && Math.floor(T * 1.2) !== Math.floor((T - dt) * 1.2)) { const w = u.wobblers[0]; G.particles.burst('dust', c.x + w.position.x, c.y + w.position.y - 0.05, c.z + w.position.z, 1, { spread: 0.1 }); }
        break;
      default: break;
    }
  }

  /** "…" over humans in the way, "!" over humans with something to trade. */
  #humanBubbles() {
    const G = this.G;
    for (const b of this.blockers) {
      const ag = this.#human(b.def.human);
      const on = !!ag && this.#activeFor({ ...b.def, id: 'blocker-' + b.def.id });
      if (on && !b.bubble) b.bubble = G.bubbles.add('…', { kind: 'clue', at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.2, z: ag.z }), ttl: 0, range: 70 });
      else if (!on && b.bubble) { G.bubbles.remove(b.bubble); b.bubble = null; }
    }
    for (const t of this.trades) {
      const ag = this.#human(t.def.human);
      const on = !!ag && G.schemes.isOpen(t.def.scheme) && this.#tradeStepActive(t.def) && !this.st.flags[`trade.${t.def.id}`];
      if (on && !t.bubble) t.bubble = G.bubbles.add('!', { kind: 'clue', at: () => ({ x: ag.x, y: (ag.y ?? 0) + (this.blockers.some((b) => b.bubble && b.def.human === t.def.human) ? 2.75 : 2.2), z: ag.z }), ttl: 0, range: 70 });
      else if (!on && t.bubble) { G.bubbles.remove(t.bubble); t.bubble = null; }
    }
  }

  #tradeStepActive(def) {
    const E = this.G.schemes, step = E.step(def.scheme);
    if (!step) return false;
    return (step.alts || [step]).some((o) => o.on?.type === 'trade' && o.on.id === def.id);
  }

  #human(role) {
    if (role === 'prickett') { const p = this.G.street.prickett; return p?.out ? p : null; }
    let best = null, bd = 1e9;
    const g = this.G.gus.position;
    for (const a of this.G.humans.agents) {
      if (a.role !== role || !a.out) continue;
      const d = Math.hypot(a.x - g.x, a.z - g.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  /** A pulsing ring under each huge item (the "huge object" tell) and a "Flock, lift it!" Peck with Muscle. */
  #hugeRings() {
    const G = this.G;
    const live = new Set();
    for (const it of G.items.world) {
      if (G.items.def(it.id).cls !== 'huge' || it.parked) continue;
      live.add(it.uid);
      if (!this.haulRings.has(it.uid)) {
        const m = new THREE.Mesh(this.geo.hugeRing, this.mats.hugeRing);
        this.group.add(m);
        this.haulRings.set(it.uid, m);
        G.interact.register({ id: 'flocklift:' + it.uid, kind: 'huge', get x() { return it.x; }, get y() { return it.y; }, get z() { return it.z; }, r: 2.2, dy: 3, priority: 3,
          label: () => (this.st.crews.includes('meermob') && G.items.world.includes(it) ? 'Flock, lift it!' : null),
          act: () => this.#haul(it, 'meermob', null) });
      }
      const m = this.haulRings.get(it.uid);
      m.position.set(it.x, it.y + 0.03, it.z);
      m.scale.setScalar(1 + 0.12 * Math.sin(this.t * 3));
    }
    for (const [uid, m] of this.haulRings) if (!live.has(uid)) { m.removeFromParent(); this.haulRings.delete(uid); G.interact.unregister('flocklift:' + uid); }
  }

  // ------------------------------------------------------------ Ask
  /** An ally who is here was Asked. Returns true if something happened (a talent or a refusal line). */
  ask(c, crew) {
    const G = this.G;
    if (c.busyTalent) return true;
    const talents = CREW[crew].talents;
    const why = G.allies.reason(crew, { x: c.x, z: c.z });
    if (why) { G.say([{ who: CREW[crew].boss, text: why }]); return true; }
    const near = (x, z, r = ASK_R) => Math.hypot(x - c.x, z - c.z) < r || Math.hypot(x - G.gus.position.x, z - G.gus.position.z) < r;
    // 1. scheme and spike spots
    let best = null, bd = 1e9;
    for (const s of this.list) {
      if (!s.active || !this.#visibleNow(s)) continue;
      const tl = s.def.talents || talents.filter((t) => (TALENT_CLUES[t] || []).includes(s.def.type));
      const fit = tl.find((t) => talents.includes(t));
      if (!fit) {
        if (s.def.refuseLine?.[crew] && near(s.x, s.z, s.def.r || ASK_R)) { G.say([{ who: CREW[crew].boss, text: s.def.refuseLine[crew] }]); return true; }
        continue;
      }
      // nets and bolts: raccoons only at Dusk or Night, Rhoda only by day (their own hours already apply)
      const d = Math.min(...(s.def.points || [s]).map((p) => Math.hypot(p.x - c.x, p.z - c.z)), Math.hypot(s.x - G.gus.position.x, s.z - G.gus.position.z));
      if (d < (s.def.r || (s.def.type === 'dive' ? 13 : ASK_R)) && d < bd) { bd = d; best = { s, talent: fit }; }
    }
    if (best) {
      if (best.s.def.fake) { G.say([{ who: CREW[crew].boss, text: best.s.def.refuseLine?.[crew] || 'Not here, Gus.' }]); return true; }
      const n = best.s.def.needs;
      if (n && !this.#needsOk(n)) { G.say([{ who: CREW[crew].boss, text: best.s.def.refuse || 'Not yet, Gus.' }]); return true; }
      this.#perform(c, crew, best.talent, best.s);
      return true;
    }
    // 2. huge items: haulers
    if (talents.some((t) => ['fetch', 'lift', 'muscle', 'pull'].includes(t))) {
      const it = G.items.world.filter((w) => G.items.def(w.id).cls === 'huge' && !w.parked && near(w.x, w.z, 10)).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
      if (it) { this.#haul(it, crew, c); return true; }
    }
    // 3. trades (crows next to a human with something you want)
    if (talents.includes('trade')) {
      for (const t of this.trades) {
        const ag = this.#human(t.def.human);
        if (ag && t.bubble && near(ag.x, ag.z, 8)) { this.#trade(c, crew, t.def, ag); return true; }
      }
    }
    // 4. humans in the way (Mimic, Bully)
    const tal = talents.find((t) => t === 'mimic' || t === 'bully');
    if (tal) {
      for (const b of this.blockers) {
        const ag = this.#human(b.def.human);
        if (ag && b.bubble && near(ag.x, ag.z, b.def.near || 10)) { this.#block(c, crew, tal, b.def, ag); return true; }
      }
      if (this.#genericBlock(c, crew, tal)) return true;
    }
    // 5. the Slice Relay (rats at any grate, once the cats and rats have made peace)
    if (crew === 'rats' && G.slices?.relay?.(c)) return true;
    return false;
  }

  #needsOk(n) {
    const st = this.st, c = st.carried;
    if (n.flags && !n.flags.every((f) => st.flags[f])) return false;
    if (n.crumbs && st.crumbs < n.crumbs) return false;
    if (n.item && !(c && (c.id === n.item || (n.item === 'slice' && c.id.startsWith('slice'))))) return false;
    if (n.hot && !this.G.items.isHot(c)) return false;
    return true;
  }

  #seen(crewOrTalent) {
    const st = this.st;
    if (!crewOrTalent) return;
    const t = CREW[crewOrTalent] ? CREW[crewOrTalent].talents[0] : crewOrTalent;
    if (!st.seenTalents.includes(t)) st.seenTalents.push(t);
  }

  /** Go to the spot, do the pose, then the effect. */
  #perform(c, crew, talent, s) {
    const G = this.G, d = s.def, A = TALENT_ACT[talent] || TALENT_ACT.dig;
    c.busyTalent = true;
    c.script = true;
    // an item the ally brings back is 'on its way' until #bringBack: the item keeper mustn't put another one out meanwhile (the
    // sail-1 dive set wings.sail1 at the dive and the duck swam back for seconds: the keeper spawned a second sail at the shore)
    if (d.does?.item && d.does.at === 'ally') this.fetching.set(d.does.item, G.state.time);
    const home = { x: c.x, y: c.y, z: c.z };
    const p = d.points ? d.points[0] : s;
    // where the ally stands to act: the spot itself (a plume, the water, the ledge), or beside it for doors and vehicles
    let to = { x: p.x, z: p.z, y: s.y };
    if (d.type === 'teeter' && d.spikeSite) to.y = G.collision.surface(p.x, p.z, 400).y;
    if (d.type === 'teeter' && !d.spikeSite) to.y = s.y;   // up on the counter, the shelf, the hook
    if (d.type === 'stuck' || d.type === 'rig' || d.type === 'grate') { const a = Math.atan2(c.x - p.x, c.z - p.z); to = { x: p.x + Math.sin(a) * 1.4, z: p.z + Math.cos(a) * 1.4 }; to.y = G.surfaceY(to.x, to.z, s.y + 1); }
    if (d.type === 'net') to.y = G.collision.surface(p.x, p.z, 400).y;
    if (talent === 'nighteyes') to = { x: c.x + (p.x - c.x) * 0.5, z: c.z + (p.z - c.z) * 0.5, y: s.y + 5 };
    // fix-36: a ledge of strips (the museum): the cat walks the ledge and bats each strip over the edge in turn
    const site = d.type === 'teeter' && d.spikeSite ? SPIKE_SITES.find((q) => q.id === d.spikeSite) : null;
    if (site?.ledge) { this.#knockLedge(c, crew, talent, s, site, home); return; }
    const secs = G.chars.moveTo(c, to, { kind: A.move });
    c.yaw = Math.atan2(p.x - c.x, p.z - c.z);
    G.later(secs, () => {
      c.yaw = Math.atan2(p.x - c.x, p.z - c.z);
      if (A.sound) G.audio.play(A.sound, { at: c });
      if (talent === 'nighteyes') G.particles.burst('sparkle', p.x, s.y + 0.5, p.z, 30, { spread: 6, color: [0.75, 0.95, 1] });
      G.chars.animate(c, A.pose, A.secs, () => {
        this.#effect(s, talent, crew, c, home);
        // back beside Gus (items brought up "at the ally" appear there)
        const back = { x: home.x, z: home.z, y: home.y };
        const t2 = d.type === 'teeter' || d.type === 'net' || d.type === 'dive' || d.type === 'dig' ? G.chars.moveTo(c, back, { kind: A.move === 'swim' ? 'swim' : A.move }) : 0.01;
        G.later(t2, () => {
          c.busyTalent = false; c.script = false;
          if (d.does?.item && d.does.at === 'ally') this.#bringBack(d, c, s);
          this.#done(s, talent, crew, c);
        });
      });
      if (talent === 'dive') G.later(0.15, () => G.particles.splash(c.x, c.y, c.z, 16));
      if (talent === 'dig') { const iv = [0.3, 0.8, 1.3, 1.8]; for (const t of iv) G.later(t, () => G.particles.burst('dust', c.x, c.y + 0.1, c.z, 6, { spread: 0.5 })); }
      if (talent === 'kick') G.later(0.5, () => { G.particles.burst('dust', p.x, s.y + 0.6, p.z, 20, { spread: 1.2 }); G.rumble?.(0.5, 0.3, 120); });
    });
  }

  /** An ally comes back with what it fetched: handed straight to Gus (`hand`, fix-40) when he's close, else put down beside
   *  the ally (on standable ground: never on the water or a roof). */
  #bringBack(d, c, s) {
    const G = this.G, g = G.gus.position;
    this.fetching.delete(d.does.item);
    if (d.does.hand && Math.hypot(g.x - c.x, g.z - c.z) < 8) {
      G.items.handOver(d.does.item);
      G.particles.burst('sparkle', g.x, g.y + 0.3, g.z, 10, { spread: 0.4 });
      G.toast(`You've got ${G.items.def(d.does.item).name}.`, { seconds: 3 });
      return;
    }
    let at = { x: c.x + Math.sin(c.yaw) * 0.5, z: c.z + Math.cos(c.yaw) * 0.5 };
    // (fix-27: a duck comes back on the water, which now reaches the waterline: what it fetched goes on the nearest ground
    // Gus can stand on, never on the water beside it, out of his reach)
    if (d.does.hand || G.wetAt(at.x, at.z)) at = G.collision.clearNear(at.x, at.z, { maxR: 20 }) || G.dryNear(at.x, at.z);
    this.#spawn(d, at, s);
  }

  /** fix-36: nearest strip first, run by run; each: bound to it, a knock pose facing the lip, the strip falls (spikes.knock).
   *  The last one runs the clue's effect (spikes.clear, the flag that finishes the step), then the cat comes back. */
  #knockLedge(c, crew, talent, s, site, home) {
    const G = this.G, pts = G.spikes.sites.find((q) => q.id === site.id)?.points || [];
    // (review) one walk down the ledge, from the end nearer the cat to the other (no zigzag)
    const zs = pts.map((p) => p.z), fromLow = Math.abs(c.z - Math.min(...zs)) <= Math.abs(c.z - Math.max(...zs));
    const seq = pts.map((p, i) => ({ p, i })).sort((a, b) => (fromLow ? a.p.z - b.p.z : b.p.z - a.p.z));
    const next = (k) => {
      if (!c.busyTalent) return;   // (review: a nap sent the cat home mid-ledge; the strips left stay for another Ask)
      if (k >= seq.length) {
        this.#effect(s, talent, crew, c, home);
        const t2 = G.chars.moveTo(c, home, { kind: 'bound' });
        G.later(t2, () => { c.busyTalent = false; c.script = false; this.#done(s, talent, crew, c); });
        return;
      }
      const { p, i } = seq[k];
      const secs = G.chars.moveTo(c, { x: p.x - 0.25, y: p.y, z: p.z }, { kind: 'bound' });
      G.later(secs, () => {
        c.yaw = Math.PI / 2;   // facing the lip (the park)
        G.chars.animate(c, 'knock', 0.45, () => { G.spikes.knock(site.id, i); next(k + 1); });
      });
    };
    next(0);
  }

  #spawn(d, at, s) {
    const G = this.G, D = d.does;
    const born = D.born === 'now' ? G.state.time : null;
    const extra = {};
    if (D.haulTo) extra.haulTo = D.haulTo;
    if (D.openWater) extra.openWater = true;
    let y = null;
    if (D.at === 'spot' && d.on?.startsWith('water:')) y = s.y + 0.05;
    const it = G.items.spawn(D.item, at.x, at.z, { born, y, extra: Object.keys(extra).length ? extra : null });
    G.particles.burst('sparkle', at.x, (y ?? G.surfaceY(at.x, at.z, 50)) + 0.2, at.z, 10, { spread: 0.4 });
    if (D.at === 'spot-ground') {
      // knocked off a counter or a shelf: it falls with a clatter
      const y0 = s.y, y1 = G.surfaceY(at.x, at.z, s.y - 0.2);
      it.mesh.position.y = y0;
      this.anims.push({ t: 0, secs: 0.45, step: (k) => { it.y = y0 + (y1 - y0) * k * k; it.mesh.position.y = it.y; it.mesh.rotation.z = k * 2.5; }, done: () => { G.audio.play('knock-clatter', { at }); const sv = G.state.items.find((q) => q.uid === it.uid); if (sv) sv.y = y1; } });
    }
    return it;
  }

  #effect(s, talent, crew, c, home) {
    const G = this.G, st = this.st, d = s.def, D = d.does || {};
    if (D.item && D.at !== 'ally') {
      const at = D.at === 'spot' || D.at === 'spot-ground' || !D.at ? { x: s.x, z: s.z } : D.at;
      if (D.at === 'spot-ground') {
        // falls to the pavement in front of the counter
        const a = Math.atan2(G.gus.position.x - s.x, G.gus.position.z - s.z);
        this.#spawn(d, { x: s.x + Math.sin(a) * 0.8, z: s.z + Math.cos(a) * 0.8 }, s);
      } else this.#spawn(d, at, s);
    }
    if (D.spike) { G.spikes.clear(D.spike); st.flags[`spike.${D.spike}.cleared`] = true; G.audio.play(d.type === 'net' ? 'net-snip' : 'knock-clatter', { at: s }); G.bus.emit('spikeCleared', { site: D.spike, by: crew }); }
    if (D.sabotage) {
      G.signs.sabotage(D.sabotage);
      st.flags['cart.' + D.sabotage] = true;
      G.audio.play('spark-plug-pop', { at: s }); G.later(0.4, () => G.audio.play('hubcap-clang', { at: s }));
      G.toast(`The ${D.sabotage[0].toUpperCase() + D.sabotage.slice(1)} cart is out of action`, { kind: 'stamp' });
      G.later(1.2, () => G.toast('Signs there are PERMANENT now', { kind: 'stamp' }));
    }
    if (D.rig) G.vehicles.rig(D.rig, crew);
    if (D.door) this.openDoor(D.door);
    if (D.smash) { G.audio.play('glass-smash', { at: s }); G.particles.burst('sparkle', s.x, s.y + 0.1, s.z, 18, { spread: 0.5, color: [0.85, 0.95, 1] }); G.particles.burst('crumbs', s.x, s.y, s.z, 8, { spread: 0.4, color: [0.5, 0.05, 0.1] }); }   // fun pass (P8): the glass
    for (const f of D.flags || []) st.flags[f] = true;
    if (D.count) {
      const cc = st.clueCounts || (st.clueCounts = {});
      cc[D.count.id] = (cc[D.count.id] || 0) + 1;
      if (cc[D.count.id] >= D.count.of) st.flags[D.count.flag] = true;
      else G.toast(`${cc[D.count.id]} of ${D.count.of}`);
    }
    if (D.toast) G.toast(D.toast, { kind: 'stamp' });
    if (D.say) G.later(0.2, () => G.say(D.say));
  }

  #done(s, talent, crew, c) {
    const G = this.G, st = this.st, d = s.def;
    if (d.perPhase) { (st.phaseUsed || (st.phaseUsed = {}))[d.id] = true; }
    else if (!d.spikeSite) st.flags[`clue.${d.id}`] = true;
    this.#seen(talent);
    G.bus.emit('talent', { ally: crew, talent, clue: d.id, x: s.x, z: s.z });
    G.bus.emit('ask', { ally: crew, x: c.x, z: c.z, clue: d.id });
    G.autosave('talent');
    this.refresh();
  }

  /** Gus pecks a plume himself (den-squirrels): the squirrels come and dig it. */
  #gusPecks(c) {
    const G = this.G;
    if (c.busy) return;
    c.busy = true;
    G.audio.play('peck', { at: c });
    G.particles.burst('dust', c.x, c.y + 0.2, c.z, 10, { spread: 0.5 });
    const h = G.chars.find('hazel');
    const run = () => {
      this.#effect(c, 'dig', 'squirrels', h, null);
      st().flags[`clue.${c.def.id}`] = true;
      this.#seen('dig');
      G.bus.emit('talent', { ally: 'squirrels', talent: 'dig', clue: c.def.id, x: c.x, z: c.z, by: 'gus' });
      c.busy = false;
      this.refresh();
    };
    const st = () => this.st;
    G.audio.play('squirrel-chatter', { at: c });
    G.later(0.6, () => { G.audio.play('dig', { at: c }); for (const t of [0, 0.4, 0.8, 1.2]) G.later(t, () => G.particles.burst('dust', c.x, c.y + 0.1, c.z, 8, { spread: 0.7 })); });
    G.later(1.8, run);
  }

  // ------------------------------------------------------------ hauls
  /** Fetch (Biscuit), Lift (Rhoda), Muscle (the Meer Mob's flock) or Pull (the horses, by a road). */
  #haul(it, crew, c) {
    const G = this.G, st = this.st;
    const boss = CREW[crew].boss;
    if (it.hauling) return;
    if (it.openWater && !HAULERS.find((h) => h.crew === crew)?.flier) { G.say([{ who: boss, text: crew === 'horses' ? "I'm a HORSE, Gus. I don't swim." : "I'm a DOG, Gus. I don't do deep." }]); return; }
    if (crew === 'horses' && this.#roadDist(it.x, it.z) > 15) { G.say([{ who: boss, text: "I'm harnessed to a carriage, kid. Needs a road within 15 metres." }]); return; }
    const to = it.haulTo === 'workshop' || !it.haulTo ? { x: WORKSHOP.x, z: WORKSHOP.z, workshop: true } : { ...it.haulTo };
    it.hauling = true;
    const talent = { biscuit: 'fetch', rhoda: 'lift', meermob: 'muscle', horses: 'pull' }[crew];
    const A = TALENT_ACT[talent];
    const go = () => {
      G.audio.play(A.sound, { at: it });
      if (crew === 'meermob') { G.flock.swarmAt(new THREE.Vector3(it.x, it.y + 0.8, it.z), 4); G.audio.play('flock-swarm', { at: it }); }
      const from = { x: it.x, y: it.y, z: it.z };
      const fly = crew === 'rhoda' || crew === 'meermob';
      const dist = Math.hypot(to.x - from.x, to.z - from.z);
      const secs = to.workshop ? 3.2 : Math.max(1.5, dist / 2);
      const toY = to.workshop ? from.y + (fly ? 22 : 0) : G.surfaceY(to.x, to.z, 50);
      if (!fly) G.audio.play('heavy-drag-scrape', { at: it });
      if (c) G.chars.animate(c, A.pose, secs);
      this.anims.push({
        t: 0, secs,
        step: (k) => {
          const e = k * k * (3 - 2 * k);
          // to the Workshop: carried off out of sight (a third of the way, rising if flown)
          const kk = to.workshop ? e * 0.35 : e;
          it.x = from.x + (to.x - from.x) * kk; it.z = from.z + (to.z - from.z) * kk;
          it.y = fly ? from.y + (toY - from.y) * e + Math.sin(Math.PI * e) * 2 : G.surfaceY(it.x, it.z, it.y + 1);
          it.mesh.position.set(it.x, it.y, it.z);
          if (c) { c.x = it.x - 0.8; c.z = it.z - 0.8; c.y = fly ? it.y + 0.6 : G.surfaceY(c.x, c.z, it.y + 1); }
        },
        done: () => {
          it.hauling = false;
          const sv = st.items.find((q) => q.uid === it.uid);
          if (to.workshop) {
            G.items.remove(it);
            G.toast(`${G.items.def(it.id).name}: hauled to the Workshop`, { kind: 'stamp' });
            if (c) G.chars.goHome(c), st.called = st.called.filter((q) => q.crew !== crew);
          } else if (sv) { sv.x = it.x; sv.z = it.z; sv.y = it.y; sv.parked = true; it.parked = true; }
          if (crew === 'horses' && to.workshop) G.later(0.3, () => G.bubbles.add('Hup.', { at: { x: G.gus.position.x, y: G.gus.position.y + 0.8, z: G.gus.position.z }, ttl: 1.8 }));
          this.#seen(talent);
          G.bus.emit('haul', { item: it.id, ally: crew, workshop: !!to.workshop });
          G.bus.emit('talent', { ally: crew, talent, clue: 'haul:' + it.id, x: it.x, z: it.z });
          G.autosave('haul');
        },
      });
    };
    if (c) { c.script = true; const secs = G.chars.moveTo(c, { x: it.x - 0.8, z: it.z - 0.8, y: crew === 'rhoda' ? it.y + 0.6 : undefined }, { kind: A.move }); G.later(secs, () => G.chars.animate(c, A.pose, A.secs, go)); }
    else go();
  }

  /** Fun pass (P12): haul a huge item now (a scene's own haul: Big Ben pulls the cone home right after his kick). */
  haulNow(it, crew, c = null) { if (!it || it.hauling || it.parked) return false; this.#haul(it, crew, c); return true; }

  /** Metres from (x, z) to the nearest road: the park drives, the transverses or the city streets. */
  #roadDist(x, z) {
    if (x < PARK.xMin || x > PARK.xMax || z < PARK.zMin || z > PARK.zMax) return 0;
    let best = Infinity;
    for (const t of TRANSVERSES) best = Math.min(best, Math.abs(z - t.z) - t.halfWidth);
    for (const d of this.G.terrain.shapes.drives || []) {
      const L = d.line || [];
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], b = L[i], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
        const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / l2));
        best = Math.min(best, Math.hypot(x - a.x - ex * t, z - a.z - ez * t) - (d.width || 7) / 2);
      }
    }
    return Math.max(0, best);
  }

  // ------------------------------------------------------------ trades
  #trade(c, crew, def, ag) {
    const G = this.G, st = this.st;
    const boss = CREW[crew].boss, carried = st.carried;
    const say = (text) => G.say([{ who: boss, text }]);
    if (!carried || carried.id !== def.wants) { say(`He'd swap, kid. For a ${(ITEM_DEFS[def.wants]?.name || def.wants).toLowerCase()}. Bring one.`); return; }
    if (def.attention && !st.flags[def.attention] && !(def.stoppedOk && ag.stopped)) { say(def.notYet || "He's not looking, kid."); return; }
    if (st.crumbs < (def.crumbs || 0)) { say(`Ten crumbs, kid. Vesper's fee. You've got ${st.crumbs}.`); G.hud.flashCrumbs(); return; }
    c.script = true;
    const secs = G.chars.moveTo(c, { x: ag.x + 0.7, z: ag.z + 0.5, y: (ag.y ?? 0) + 1.7 }, { kind: 'fly' });
    G.later(secs, () => {
      G.audio.play('crow-caw', { at: c });
      G.chars.animate(c, 'cheer', 1.4, () => {
        G.audio.play('trade-ka-ching', { at: c });
        st.flags[`trade.${def.id}`] = true;
        G.bus.emit('trade', { id: def.id, ally: crew });
        // the swap (after the engine has seen the step's needs)
        if (st.carried?.id === def.wants) G.items.take();
        st.crumbs = Math.max(0, st.crumbs - (def.crumbs || 0));
        const gv = def.gives || {};
        if (gv.gear && !st.gear.includes(gv.gear)) { st.gear.push(gv.gear); G.toast(`New gear: ${GEAR_NAMES[gv.gear] || gv.gear}`, { kind: 'stamp' }); }
        if (gv.item) G.items.give(gv.item);
        for (const f of gv.flags || []) st.flags[f] = true;
        G.market?.recordDeal(def);
        if (def.after) G.later(0.3, () => G.say([{ who: null, text: def.after }]));
        G.chars.moveTo(c, { x: G.gus.position.x + 1, z: G.gus.position.z + 1 }, { kind: 'fly', done: () => { c.script = false; } });
        G.bus.emit('talent', { ally: crew, talent: 'trade', clue: 'trade:' + def.id, x: ag.x, z: ag.z });
        this.#seen('trade');
        G.autosave('trade');
      });
    });
  }

  // ------------------------------------------------------------ humans in the way
  #block(c, crew, talent, def, ag) {
    const G = this.G, st = this.st;
    const B = def[talent];
    const boss = CREW[crew].boss;
    if (!B || B.refuse) { this.#actAt(c, ag, talent, () => { G.say([{ who: talent === 'mimic' ? boss : boss, text: B?.refuse || 'Nothing doing, Gus.' }]); G.bus.emit('refused', { blocker: def.id, talent, ally: crew, x: ag.x, z: ag.z }); }); return; }   // 3b: 'refused' (the Wedding's wall of tulle)
    if (B.needs && !B.needs.every((f) => st.flags[f])) { G.say([{ who: boss, text: 'I don\'t know that one yet, sweetie.' }]); return; }
    this.#actAt(c, ag, talent, () => this.#move(ag, B, def, talent, crew));
  }

  /** The ally goes over and does its bit at a human. */
  #actAt(c, ag, talent, then) {
    const G = this.G, A = TALENT_ACT[talent];
    c.script = true;
    const a = Math.atan2(c.x - ag.x, c.z - ag.z);
    const to = talent === 'mimic' ? { x: ag.x + Math.sin(a) * 1.6, z: ag.z + Math.cos(a) * 1.6, y: (ag.y ?? 0) + 2.4 } : { x: ag.x + Math.sin(a) * 1.4, z: ag.z + Math.cos(a) * 1.4 };
    const secs = G.chars.moveTo(c, to, { kind: A.move });
    G.later(secs, () => {
      c.yaw = Math.atan2(ag.x - c.x, ag.z - c.z);
      if (A.sound) G.audio.play(A.sound, { at: c });
      if (talent === 'mimic') { for (const t of [0, 0.5, 1, 1.5]) G.later(t, () => G.particles.burst('notes', c.x, c.y + 0.2, c.z, 3, { spread: 0.3 })); }
      if (talent === 'bully') G.audio.play('goose-honk', { at: c });
      G.chars.animate(c, A.pose, A.secs, () => { c.script = false; then(); });
    });
  }

  #move(ag, B, def, talent, crew) {
    const G = this.G, st = this.st;
    if (B.sound) G.audio.synth(B.sound, { wobble: true });
    const at = { x: ag.x, z: ag.z };
    // Fixes-1 (#4): the flag is set with the spawn, 0.8 s later (set at once, a save in between kept the flag and lost
    // the cufflink: gear-pen step 1 could never finish). `revealing` stops a second ask in that window.
    const rk = `clue.reveal.${def.id}`;
    if (def.reveal && !st.flags[rk] && !this.revealing?.has(rk)) {
      (this.revealing ||= new Set()).add(rk);
      G.later(0.8, () => { this.revealing.delete(rk); if (G.state !== st || st.flags[rk]) return; st.flags[rk] = true; G.items.spawn(def.reveal.item, at.x, at.z, { origin: { x: at.x, z: at.z } }); });
    }
    if (B.line) G.bubbles.add(B.line, { at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.1, z: ag.z }), ttl: 2.6 });
    if (B.flee) G.humans.flee({ x: ag.x - 0.5, z: ag.z - 0.5 }, 3, { by: 'bully' });
    else if (B.stop) { ag.stopT = B.stop; ag.stopped = true; G.bubbles.add('?', { kind: 'clue', at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.6, z: ag.z }), ttl: 2.5 }); }
    else if (B.to) {
      G.bubbles.add('?', { kind: 'clue', at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.6, z: ag.z }), ttl: 2.5 });
      if (ag === G.street.prickett) { ag.script = false; }
      ag.busy = true; G.humans.goTo(ag, B.to, 1.3, () => { ag.mode = 'linger'; ag.t = 30; });
      if (B.kids) for (const k of G.humans.agents.filter((q) => q.out && (q.role === 'kid' || q.spec?.kid) && q !== ag && Math.hypot(q.x - ag.x, q.z - ag.z) < 40)) { k.busy = true; G.humans.goTo(k, { x: B.to.x + (k.x % 2), z: B.to.z + (k.z % 2) }, 3.2, () => { k.mode = 'linger'; k.t = 30; }); }
    }
    if (B.drop && ag.holds) { G.items.spawn(ag.holds, ag.x + 0.5, ag.z, { born: G.state.time }); ag.holds = null; G.humans.redress(ag); }
    if (B.item) { G.items.spawn(B.item, at.x + 0.6, at.z + 0.3, { origin: at }); if (ag.spec?.acc) { ag.spec = { ...ag.spec, acc: ag.spec.acc.filter((q) => q !== B.item) }; G.humans.redress(ag); } }
    if (B.van) {
      // Prickett gives up the trough: he climbs in and drives off grumbling (Duke's officer writes a ticket)
      G.later(2.2, () => { const p = G.street.prickett; if (p) p.out = false; G.van.drive({ ...G.van.pos }, { x: -150, z: -12, yaw: -1.57 }, 7); G.bubbles.add('Grumble grumble…', { at: () => ({ x: G.van.pos.x, y: 2.6, z: G.van.pos.z }), ttl: 2.5 }); });
    }
    for (const f of B.flags || []) st.flags[f] = true;
    this.#seen(talent);
    G.bus.emit('talent', { ally: crew, talent, clue: def.id, x: at.x, z: at.z });
    G.bus.emit('ask', { ally: crew, x: at.x, z: at.z, clue: def.id });
    G.autosave('talent');
  }

  /** Any human nearby, no scheme behind it: Bully chases them off (dropping what they hold), Mimic lures them a few steps.
   *  Also the Sign War helpers: a ranger on his way to revert a sign is delayed 3 game minutes. */
  #genericBlock(c, crew, talent) {
    const G = this.G, st = this.st;
    const g = G.gus.position;
    let delayed = 0;
    for (const s of G.signs.list) {
      const ss = st.signs[s.id];
      if (!ss.flipped || ss.permanent || Math.hypot(s.x - g.x, s.z - g.z) > 25) continue;
      ss.revertAt = Math.max(ss.revertAt, st.time) + 180; s.pending = false; delayed++;
    }
    const near = G.humans.agents.filter((a) => a.out && !a.script && Math.hypot(a.x - c.x, a.z - c.z) < 6);
    if (!near.length && !delayed) return false;
    const ag = near[0] || { x: g.x + 2, z: g.z + 2, y: g.y };
    this.#actAt(c, ag, talent, () => {
      if (near.length) {
        if (talent === 'bully') G.humans.flee({ x: c.x, z: c.z }, 5, { by: 'bully' });
        else { const k = Math.floor(st.time) % 3; if (k === 2) G.audio.play('ranger-whistle', { rate: 1.04 }); else G.audio.synth(k ? 'carChirp' : 'phoneRing', { wobble: true });   // #43: phone ring, car chirp, the real ranger whistle (what she says she does)
          G.humans.lure({ x: c.x, z: c.z }, 6); }
      }
      if (delayed) G.toast(`The rangers are distracted: ${delayed} sign${delayed > 1 ? 's' : ''} stay${delayed > 1 ? '' : 's'} up 3 minutes longer`);
      G.bus.emit('talent', { ally: crew, talent, clue: 'generic', x: ag.x, z: ag.z });
    });
    return true;
  }

  /** Hold Coo with a flock: the photobomb, the waiter's bread basket, the 103rd Street shed's rope. */
  #holdCoo(e) {
    const G = this.G, st = this.st, g = G.gus.position, n = derived(st).flock;
    for (const b of this.blockers) {
      const S = b.def.swarm;
      if (!S || !b.bubble) continue;
      if (Math.hypot(g.x - S.on.x, g.z - S.on.z) > S.on.r) continue;
      e.handled = true;   // Fixes-3 (R2): no "Nobody close enough to mob" over a photobomb
      if (n < S.flock) { G.toast(`Flock ${S.flock} needed: you have ${n}`); return; }
      const ag = this.#human(b.def.human);
      if (!ag) continue;
      // fun pass (P6, P8): a swarm that doesn't work here says so (and brings the nudge closer)
      if (S.refuse) { G.later(0.6, () => G.bubbles.add(S.refuse, { at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.15, z: ag.z }), ttl: 3, range: 60 })); G.bus.emit('fail', { kind: 'swarm', blocker: b.def.id }); return; }
      G.later(0.8, () => this.#move(ag, { ...S, sound: null }, b.def, 'swarm', 'swells'));
      if (S.say) G.later(1.4, () => G.say(S.say));
      return;
    }
    for (const d of this.doors) {
      const R = d.def.rope;
      if (!R || d.open || Math.hypot(g.x - d.def.x, g.z - d.def.z) > 4) continue;
      e.handled = true;   // Fixes-3 (R2): the 103rd Street rope
      if (st.phase !== 'night') { G.toast('Somebody would see. Wait for Night.'); return; }
      if (n < R.flock) { G.toast(`Flock ${R.flock} needed: you have ${n}`); G.flock.swarmAt(new THREE.Vector3(d.def.x, d.y + R.y, d.def.z), 2); return; }
      G.flock.swarmAt(new THREE.Vector3(d.def.x, d.y + R.y, d.def.z), 3);
      G.later(1.6, () => { G.toast('The flock yanks the rope!'); this.openDoor(d.def.id); });
      return;
    }
  }

  // ------------------------------------------------------------ naps, loads, the compass
  onNap() { this.st.phaseUsed = {}; return []; }
  restore() {
    this.revealing?.clear();   // Fixes-1: timers were cleared with the load
    this.fetching.clear();     // (a fetch cut off by a load never brings its item back: the keeper may put it out again)
    this.anims.length = 0;     // Fixes-3: a haul or a fall cut off by a load
    for (const c of this.list) c.busy = false;
    for (const [uid, m] of this.haulRings) { m.removeFromParent(); this.G.interact.unregister('flocklift:' + uid); }   // (rebuilt for the loaded items)
    this.haulRings.clear();
    this.#hugeRings?.();
    for (const d of this.doors) { const o = this.isOpen(d.def.id); d.open = o; d.t = 1; if (d.col) d.col.off = o; }
    for (const c of this.list) c.itemUid = null;
    this.refresh();
  }
  setPhase() { this.refresh(); }

  /** "?" pings for clues seen on screen for 2 s (the HUD compass). */
  compass() {
    const out = [], pings = this.st.cluePings || {};
    for (const c of this.list) if (c.active && pings[c.def.id] && this.#visibleNow(c)) out.push({ x: c.x, z: c.z, icon: 'question' });
    return out;
  }

  debug() {
    return {
      active: this.list.filter((c) => c.active).map((c) => c.def.id),
      blockers: this.blockers.filter((b) => b.bubble).map((b) => b.def.id),
      trades: this.trades.filter((t) => t.bubble).map((t) => t.def.id),
      doors: this.doors.filter((d) => d.open).map((d) => d.def.id),
      huge: this.G.items.world.filter((w) => this.G.items.def(w.id).cls === 'huge').map((w) => w.id),
    };
  }
}
