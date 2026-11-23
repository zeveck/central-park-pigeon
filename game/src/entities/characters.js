// The named animals (17 bosses and 50 regulars), placed in their haunts as
// entities: their species model in their coat or morph layer, wearing their
// code accessories from data/looks.js ("Who wears what"). Each is an
// InstancedMesh of one (so pigeons and squirrels can use the morph arrays and
// everyone a tint) plus one merged, vertex-coloured accessory mesh. Drawn in
// full within ~90 m; turned to face Gus when he's close. Peck one to talk.
// (The named humans live in humans.js.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHARACTERS, CREW, phaseList } from '../data/crews.js';
import { LOOKS, SPECIES, SONGBIRD_TINTS } from '../data/looks.js';
import { TALK } from '../data/dialogue.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { patchMorphArray } from '../gfx/morphs.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { headPoint, crownPoint, seatY } from './crowds.js';
import { pointInPoly } from '../core/geo.js';
import { patch as dogGait, instanceAttr as dogGaitAttr, DogGait } from '../anim/dog-gait.js';   // batch-3 (#11)

const DRAW_DIST = { high: 70, medium: 50, low: 22 };
const MAX_DRAWN = { high: 24, medium: 14, low: 5 };
const SHADOW_CASTERS = 6;   // perf pass (High only)
const FOLLOW = new Set(['walk', 'hop', 'waddle', 'slink', 'road', 'bound']);   // batch-3: tweens that keep to the ground
const _tg = { y: 0, kind: 'terrain', item: null };
const ACC_DIST = { high: 40, medium: 26, low: 14 };   // perf pass
// head units (m) for each species' own model (SPECIES[sp].model); another model of that species (the poodle, the sitting
// cat, the owlet, the standing raccoon) scales it by its bounds (batch-2 #6: Fifi wore the 1.38 m dog's 11 cm unit)
const HEAD_UNIT = { pigeon: 0.04, squirrel: 0.035, duck: 0.05, crow: 0.05, raccoon: 0.07, rat: 0.03, turtle: 0.035, dog: 0.11, owl: 0.07, hawk: 0.06, cat: 0.06, horse: 0.17, songbird: 0.022, goose: 0.06, heron: 0.055 };

export class Characters {
  constructor(G) {
    this.G = G;
    this.drawDist = DRAW_DIST[G.preset?.id] || 50;
    this.shadows = G.preset?.id === 'high';
    this.group = new THREE.Group();
    this.group.name = 'characters';
    this.list = [];
    this.byId = {};
    this.mats = {};
    this.talkIdx = {};
  }

  async build(crowds) {
    const G = this.G;
    const morphs = crowds?.morphs || {};
    for (const [id, def] of Object.entries(CHARACTERS)) {
      if (def.role === 'human' || def.role === 'player') continue;
      const look = LOOKS[id];
      if (!look) continue;
      const sp = SPECIES[look.species];
      const model = look.model || sp.model;
      const baked = await G.registry.baked(model);
      if (!baked) continue;
      const pos = this.#resolve(def.at);
      const c = { id, def, look, model, baked, x: pos.x, y: pos.y, z: pos.z, yaw: def.at.yaw ?? (Math.atan2(-pos.x, 300 - pos.z) % 6.28), home: { ...pos, yaw: def.at.yaw }, here: null, tween: null, bobT: id.length };
      c.mesh = this.#body(c, morphs);
      c.ref = model === sp.model ? baked : await G.registry.baked(sp.model);   // batch-2: the species model the head unit is for
      c.acc = this.#accessories(c);
      c.root = new THREE.Group();
      c.root.add(c.mesh);
      if (c.acc) c.root.add(c.acc);
      c.root.scale.setScalar(look.scale || 1);
      this.group.add(c.root);
      this.list.push(c);
      this.byId[id] = c;
      // Fixes-2 (P5): someone sitting on the water (Puddles, the ducks, the geese) is talked to from the shore or while
      // hovering over the water: a 3.4 m reach (it was ~1.4 m: a 0.3 m window between the bank and the splash) and
      // `air`, so the prompt also shows in flight (interact.js)
      // batch-3 (#1): and from the water: floating, Gus reaches 4.5 m (Mrs Puddles, Gertrude and Gander sit well out). The
      // shore birds (def.at.shore: Nightcap, Stilts, Slowpoke at the water's edge) have the same reach.
      const onWater = !!def.at.on?.startsWith('water:') || !!def.at.shore;
      const near = Math.max(1.4, sp.height * 1.2);
      G.interact.register({
        id: 'char:' + id, kind: 'character', get x() { return c.x; }, get y() { return c.y; }, get z() { return c.z; }, get r() { return G.gus.floating ? (onWater ? 4.5 : Math.max(near, 2.2)) : onWater ? 3.4 : near; }, dy: onWater ? 4 : 3, priority: 3, air: onWater,
        label: () => (this.out(c) ? (G.takers?.labelFor(id) || (c.here ? `Ask ${def.name}` : `Talk to ${def.name}`)) : null),
        eaterGive: () => !!G.takers?.eaterGive(id),   // fix-19: a slice given away scores like small talk (interact.js)
        act: () => { if (onWater) this.#toShore(c); if (G.state.carried && G.takers?.labelFor(id)) { G.takers.give(id); return; } if (c.here) G.allies.ask(c); else this.talk(id); },
      });
    }
    this.update(0);
  }

  /** Fixes-2 (P5): pecked while hovering over the water, Gus flutters down on the nearest bank, facing them. */
  #toShore(c) {
    const G = this.G, g = G.gus;
    if (g.mode !== 'fly') return;
    const p = g.position;
    let best = null, bd = Infinity;
    for (let r = 0.5; r <= 6; r += 0.5) for (let a = 0; a < 6.28; a += 0.25) {
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (G.collision.waterAt(x, z)) continue;
      const d = Math.hypot(x - c.x, z - c.z) + r * 0.6;
      if (d < bd) { bd = d; best = { x, z }; }
    }
    if (!best) return;   // far out over open water: talk from the air
    const y = G.surfaceY(best.x, best.z, G.terrain.heightAt(best.x, best.z) + 0.6);   // the bank, never a canopy above it
    g.place({ x: best.x, y, z: best.z, yaw: Math.atan2(c.x - best.x, c.z - best.z), mode: 'walk' });
    G.particles?.burst('feathers', best.x, y + 0.3, best.z, 4);
  }

  #resolve(at) {
    const G = this.G;
    let { x, z } = at;
    let y;
    if (at.on && at.on.startsWith('water:')) {
      const w = G.terrain.shapes.water.find((q) => q.id === at.on.slice(6));
      if (w && pointInPoly(x, z, w.poly)) y = w.level - 0.12;   // sitting in the water
      else y = G.collision.groundFor(x, z, G.collision.floorAt(x, z) + 0.5).y;
    } else if (at.on === 'roof') y = G.collision.surface(x, z, 400).y;
    else y = G.collision.groundFor(x, z, G.collision.floorAt(x, z) + 0.5).y + (at.y || 0);   // batch-3 (#1): never on a lake bed
    return { x, y, z };
  }

  #body(c, morphs) {
    const { look, model, baked } = c;
    const sp = look.species;
    const morph = (sp === 'pigeon' && model === 'pigeon-plain') ? morphs['pigeon-plain'] : sp === 'squirrel' ? morphs.squirrel : null;
    const key = model + (morph ? ':m' : '') + (sp === 'songbird' ? ':s' : '');
    if (!this.mats[key]) {
      const mat = baked.makeMaterial();
      if (sp === 'dog') dogGait(mat, baked.geometry, { instanced: true });   // batch-3 (#11): the trot (before geo copies the attributes)
      if (morph) patchMorphArray(mat, morph.texture, { sheen: sp === 'pigeon' });
      if (sp === 'songbird') {
        const bb = baked.bounds;
        addShaderPatch(mat, {
          key: 'songbird',
          uniforms: { uHeadY: { value: bb.min.y + (bb.max.y - bb.min.y) * 0.68 }, uFrontZ: { value: bb.min.z + (bb.max.z - bb.min.z) * 0.55 } },
          vertexHeader: 'attribute vec3 aHead; attribute vec3 aBreast; varying vec3 vHead; varying vec3 vBreast; varying vec3 vLocal;',
          vertex: 'vHead = aHead; vBreast = aBreast; vLocal = position;',
          fragmentHeader: 'uniform float uHeadY; uniform float uFrontZ; varying vec3 vHead; varying vec3 vBreast; varying vec3 vLocal;',
          fragmentAfterMap: `float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); vec3 g = vec3(lum) * 1.25;
            float head = smoothstep(uHeadY - 0.01, uHeadY + 0.005, vLocal.y); float breast = (1.0 - head) * smoothstep(uFrontZ - 0.01, uFrontZ + 0.01, vLocal.z);
            vec3 tint = mix(vec3(1.0), vHead, head); tint = mix(tint, vBreast, breast); diffuseColor.rgb = g * tint;`,
        });
      }
      this.mats[key] = mat;
    }
    const geo = new THREE.BufferGeometry();
    for (const [k, v] of Object.entries(baked.geometry.attributes)) geo.setAttribute(k, v);
    geo.setIndex(baked.geometry.index);
    geo.boundingSphere = baked.geometry.boundingSphere;
    if (morph) {
      geo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(new Float32Array([look.layer || 0]), 1));
      if (sp === 'pigeon') {
        const sh = { 'teal-magenta': [0.6, 1.2, 1.15], 'green-purple': [1.0, 1.25, 0.8], 'bronze-pink': [1.25, 0.95, 0.9], faint: [1, 1, 1] }[look.sheen] || [1, 1, 1];
        geo.setAttribute('aSheen', new THREE.InstancedBufferAttribute(new Float32Array(sh), 3));
      }
    }
    if (sp === 'songbird') {
      const T = SONGBIRD_TINTS[look.bird] || SONGBIRD_TINTS.sparrow;
      geo.setAttribute('aHead', new THREE.InstancedBufferAttribute(new Float32Array(T.head), 3));
      geo.setAttribute('aBreast', new THREE.InstancedBufferAttribute(new Float32Array(T.breast), 3));
    }
    if (sp === 'dog') { c.gaitAttr = dogGaitAttr(geo, 1); c.gait = new DogGait((baked.bounds.max.y - baked.bounds.min.y) * (look.scale || 1), c.id.length); }
    const m = new THREE.InstancedMesh(geo, this.mats[key], 1);
    if (sp === 'dog') m.customDepthMaterial = this.mats[key].userData.gaitDepth;   // batch-3 (#11): the shadow trots too
    m.name = 'char:' + c.id;
    m.setMatrixAt(0, new THREE.Matrix4());
    const t = sp === 'songbird' ? (SONGBIRD_TINTS[look.bird] || SONGBIRD_TINTS.sparrow).back : look.tint || [1, 1, 1];
    m.setColorAt(0, new THREE.Color(t[0], t[1], t[2]));
    m.castShadow = this.shadows; m.receiveShadow = true;
    m.frustumCulled = false;
    return m;
  }

  #accessories(c) {
    const codes = c.look.acc || [];
    if (!codes.length) return null;
    const H = headPoint(c.baked);
    const B = c.baked.bounds.getCenter(new THREE.Vector3());
    const N = B.clone().lerp(H, 0.62);
    const u = headUnit(c);
    // batch-2 (#6): a character's own neck anchor (data/looks.js `neck`: [dx, dy, dz, ring scale] in head units), for
    // models whose neck isn't where the guess puts it (Fifi's mane, a standing rat)
    const NK = c.look.neck || null;
    if (NK) N.add(new THREE.Vector3(NK[0], NK[1], NK[2]).multiplyScalar(u));
    const K = crownPoint(c.baked, H);   // batch-2 (#6, #14): hats, bows and caps sit on the crown, not at the head point
    // a hat of inner radius ri (head units) rests this far under the crown (≤ 0, in head units)
    const sink = (ri) => (seatY(c.baked, K, ri * u) - K.y) / u;
    // on a model the sizes weren't drawn for, a waistcoat is fitted to the body (fitRing); neck rings take the look's scale
    const fit = c.ref && c.ref !== c.baked ? (p, R, half) => fitRing(c.baked, p, R, half) : null;
    const ringK = NK?.[3] || 1, ringTilt = NK?.[4] ?? Math.PI / 2.3, lift = c.look.lift || 0;
    const parts = [];
    for (const code of codes) {
      const [name, col] = code.split(':');
      for (const p of accessory(name, col, u, H, N, B, c.baked.bounds, K, sink, fit, ringK, ringTilt, lift)) parts.push(p);
    }
    if (!parts.length) return null;
    const geos = parts.map(({ geo, color }) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      g.deleteAttribute('uv');
      const n = g.attributes.position.count;
      const cc = new THREE.Color(color);
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!this.accMat) this.accMat = ruleMaterial({ vertexColors: true });
    const m = new THREE.Mesh(merged, this.accMat);
    m.castShadow = this.shadows;
    m.name = 'acc:' + c.id;
    return m;
  }

  // ------------------------------------------------------------ queries
  find(id) { return this.byId[id] || null; }
  out(c) { return phaseList(c.def.out).includes(this.G.state.phase) || !!c.here; }

  talk(id) {
    const G = this.G;
    const c = this.byId[id];
    const def = CHARACTERS[id];
    const T = TALK[id];
    let lines;
    if (T && !Array.isArray(T)) {
      const joined = G.state.crews.includes(def.crew);
      const pool = joined ? T.after : T.before;
      const i = (this.talkIdx[id] = ((this.talkIdx[id] ?? -1) + 1)) % pool.length;
      lines = pool[i].map((text, k) => ({ who: id, text, voice: k === 0 && (this.talkIdx[id] === 0) ? T.voice : null }));
    } else if (Array.isArray(T)) {
      const i = (this.talkIdx[id] = ((this.talkIdx[id] ?? -1) + 1)) % T.length;
      lines = T[i].map((text) => ({ who: id, text }));
    } else lines = [{ who: id, text: '…' }];
    if (c) c.yaw = Math.atan2(G.gus.position.x - c.x, G.gus.position.z - c.z);
    const ev = { who: id };
    G.bus.emit('talk', ev);
    if (ev.quiet) return;   // fix-19: a listener answered with a bubble of its own (Pickles giving way on a retry)
    // a scheme may have its own lines for this talk (the engine's step does): show the generic ones only if nothing else spoke
    G.later(0, () => { if (!G.dialogue.open) G.say(lines); });
  }

  /** Move a character to a spot with an entrance (Calls). kind: drop | popup | swoop | drain | grate | slink | road | flutter | waddle | bound | dive */
  arrive(c, to, kind, secs = 3) {
    const from = entranceStart(this.G, kind, to, c);
    c.tween = { from, to: { ...to }, t: 0, secs, kind };
    c.x = from.x; c.y = from.y; c.z = from.z;
  }
  goHome(c) { c.here = null; c.tween = null; c.act = null; c.script = false; c.busyTalent = false;   /* Fixes-3: a talent cut off by a load left the ally refusing every Ask */ c.x = c.home.x; c.y = c.home.y; c.z = c.home.z; c.yaw = c.home.yaw ?? c.yaw; }

  /** Walk, hop, swim or fly a character to a spot (talents, fights). kind: walk | hop | fly | swim | popup | drop. */
  moveTo(c, to, { secs = null, kind = 'walk', done = null } = {}) {
    const d = Math.hypot(to.x - c.x, to.z - c.z);
    const y = to.y ?? this.G.surfaceY(to.x, to.z, (to.yRef ?? c.y) + 0.6);
    const speed = { walk: 1.6, hop: 2.4, fly: 7, swim: 1.2, popup: 2, drop: 3, slink: 1.8, road: 2.2, bound: 4 }[kind] || 1.8;
    const t = secs ?? Math.max(0.6, Math.min(4, d / speed));
    c.tween = { from: { x: c.x, y: c.y, z: c.z }, to: { x: to.x, y, z: to.z }, t: 0, secs: t, kind: kind === 'fly' ? 'swoop' : kind, done };
    return t;
  }

  /** A talent or fight pose for `secs`: dig | dive | knock | kick | hiss | sing | lift | rig | cheer | sniff | crouch | charge | swoop. */
  animate(c, kind, secs = 1.5, done = null) { c.act = { kind, t: 0, secs, done }; }

  update(dt) {
    const G = this.G;
    const cam = G.dataCam?.position || G.gus.position;
    const g = G.gus.position;
    // nearest first, up to the preset's count
    const cap = Math.max(1, Math.round((MAX_DRAWN[G.preset?.id] || 14) * (G.budgetScale ?? 1)));
    const near = this.list.filter((c) => this.out(c) && Math.hypot(c.x - cam.x, c.z - cam.z) < this.drawDist).sort((a, b) => Math.hypot(a.x - cam.x, a.z - cam.z) - Math.hypot(b.x - cam.x, b.z - cam.z)).slice(0, cap);
    const allow = new Set(near);
    // perf pass: on High only the nearest few cast shadows (each caster is two more draw calls)
    const casters = new Set(this.shadows ? near.slice(0, SHADOW_CASTERS) : []);
    for (const c of this.list) {
      const cast = casters.has(c);
      if (c.cast !== cast) { c.cast = cast; c.mesh.castShadow = cast; if (c.acc) c.acc.castShadow = cast; }
      const out = this.out(c);
      const d = Math.hypot(c.x - cam.x, c.z - cam.z);
      const vis = !!(out && ((d < this.drawDist && allow.has(c)) || (c.always && d < 140)));   // c.always: a fight's opponent
      // (perf pass: this was `undefined` for everyone out but not near, and three.js only skips `visible === false`,
      // so every named animal that was out drew everywhere, shadows too: ~350k triangles and ~130 draws)
      c.root.visible = vis;
      if (c.tween) {
        const tw = c.tween;
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.secs);
        const e = k * k * (3 - 2 * k);
        c.x = tw.from.x + (tw.to.x - tw.from.x) * e;
        c.z = tw.from.z + (tw.to.z - tw.from.z) * e;
        const arc = tw.kind === 'drop' || tw.kind === 'swoop' || tw.kind === 'dive' || tw.kind === 'flutter' ? Math.sin(k * Math.PI) * 0.3 : 0;
        c.y = tw.from.y + (tw.to.y - tw.from.y) * (tw.kind === 'popup' || tw.kind === 'grate' || tw.kind === 'drain' ? Math.sqrt(k) : e) + arc;
        // batch-3 (#7): on foot they follow the ground (the walkers' rule: water is a floor), not a straight line through a
        // hill; the last stretch eases onto the spot they were sent to (a rock top, a step)
        if (FOLLOW.has(tw.kind) && k < 1) {
          const g = G.collision.groundFor(c.x, c.z, (tw.lastY ?? tw.from.y) + 0.5, _tg).y;
          tw.lastY = g;
          c.y = k > 0.85 ? g + (c.y - g) * ((k - 0.85) / 0.15) : g;
        }
        c.yaw = Math.atan2(tw.to.x - tw.from.x, tw.to.z - tw.from.z) || c.yaw;
        if (k >= 1) { c.tween = null; c.y = tw.to.y; tw.done?.(); }
      } else if (vis && !c.script && !c.act && Math.hypot(c.x - g.x, c.z - g.z) < 5) {
        const want = Math.atan2(g.x - c.x, g.z - c.z);
        c.yaw += Math.atan2(Math.sin(want - c.yaw), Math.cos(want - c.yaw)) * Math.min(1, dt * 3);
      }
      // a talent pose (runs on the game clock even off screen, so its done() always fires)
      let ox = 0, oy = 0, rx = 0, rz = 0, sx = 1, sy = 1;
      if (c.act) {
        const a = c.act;
        a.t += dt;
        const k = Math.min(1, a.t / a.secs), s = Math.sin(Math.PI * k), w = a.t;
        switch (a.kind) {
          case 'dig': oy = -0.02 * Math.abs(Math.sin(w * 16)); rx = 0.55 * s; break;
          case 'dive': oy = -0.7 * Math.sin(Math.PI * Math.min(1, k * 1.15)); rx = 1.7 * Math.min(1, k * 4) * (k < 0.85 ? 1 : (1 - k) / 0.15); break;
          case 'knock': rx = k < 0.7 ? 0.25 * (k / 0.7) : 0.25 + 0.5 * Math.sin(Math.PI * (k - 0.7) / 0.3); break;
          case 'kick': rx = -0.55 * Math.max(0, Math.sin(w * 7)) * s; oy = 0.05 * s; break;
          case 'hiss': rx = 0.35 * s; sx = 1 + 0.25 * s * (0.6 + 0.4 * Math.sin(w * 18)); break;
          case 'sing': oy = 0.02 * Math.abs(Math.sin(w * 9)); rz = 0.12 * Math.sin(w * 6); break;
          case 'lift': oy = 0.15 * Math.abs(Math.sin(w * 8)); break;
          case 'rig': rx = 0.4 * s; rz = 0.08 * Math.sin(w * 22) * s; break;
          case 'cheer': oy = 0.12 * Math.abs(Math.sin(w * 8)); break;
          case 'sniff': rx = 0.3 * s; rz = 0.1 * Math.sin(w * 5); break;
          case 'crouch': sy = 1 - 0.18 * s; rz = 0.1 * Math.sin(w * 30) * s; break;   // the wiggle before a charge
          case 'charge': rx = 0.2; oy = 0.04 * Math.abs(Math.sin(w * 14)); break;
          case 'swoop': rx = 0.5 * s; break;
          default: break;
        }
        if (k >= 1 && a.secs > 0) { c.act = null; a.done?.(); }
      }
      if (c.gait) {   // batch-3 (#11): the dogs trot at the speed they cover ground (their tweens), and stand when still
        const sp = dt > 0 ? Math.hypot(c.x - (c.gpx ?? c.x), c.z - (c.gpz ?? c.z)) / dt : 0;
        c.gpx = c.x; c.gpz = c.z;
        c.gait.step(dt, sp).write(c.gaitAttr, 0); c.gaitAttr.needsUpdate = true;
      }
      if (!vis) continue;
      // perf pass (render only): no accessories past ACC_DIST (a draw call each, a few pixels at that range)
      if (c.acc) { const near = d < ACC_DIST[G.preset?.id ?? 'medium']; if (c.acc.visible !== near) c.acc.visible = near; }
      c.bobT += dt;
      c.root.position.set(c.x + ox, c.y + oy + (c.gait ? 0 : Math.abs(Math.sin(c.bobT * 1.3)) * 0.004), c.z);   // batch-3 (#11): a dog's back stays level
      c.root.rotation.set(rx, c.yaw, rz, 'YXZ');
      if (sx !== 1 || sy !== 1) c.root.scale.set((c.look.scale || 1) * sx, (c.look.scale || 1) * sy, (c.look.scale || 1) * sx);
      else if (c.root.scale.y !== (c.look.scale || 1)) c.root.scale.setScalar(c.look.scale || 1);
    }
  }

  drawnCount() { return this.list.filter((c) => c.root.visible).length; }
}

function entranceStart(G, kind, to, c) {
  const yaw = G.gus.yaw;
  switch (kind) {
    case 'drop': return { x: to.x + 0.6, y: to.y + 5, z: to.z + 0.4 };
    case 'swoop': case 'dive': return { x: to.x - Math.sin(yaw) * 20, y: to.y + 14, z: to.z - Math.cos(yaw) * 20 };
    case 'flutter': return { x: to.x + 3, y: to.y + 6, z: to.z + 2 };
    case 'popup': return { x: to.x + 0.8, y: to.y - 0.8, z: to.z + 0.8 };
    case 'grate': case 'drain': return { x: to.x + 0.5, y: to.y - 0.5, z: to.z };
    case 'road': case 'bound': case 'waddle': case 'slink': return { x: to.x + Math.sin(yaw + 1.6) * 14, y: to.y, z: to.z + Math.cos(yaw + 1.6) * 14 };
    default: return { ...to };
  }
}

/** batch-2 (#6): the head unit for this character's model: the species' unit, scaled by the cube root of the model's
 *  bounding-box volume against the species model's (robust to pose: a sitting cat or a standing raccoon keeps its size). */
function headUnit(c) {
  const u = HEAD_UNIT[c.look.species] || 0.04;
  if (!c.ref || c.ref === c.baked) return u;
  const vol = (b) => { const s = b.bounds.getSize(new THREE.Vector3()); return Math.cbrt(s.x * s.y * s.z); };
  return u * vol(c.baked) / vol(c.ref);
}

/** batch-2 (#6): a waistcoat round the body at p, on a model the sizes weren't drawn for: the centre and radius of the
 *  model's cross-section there (vertices within `half` of p's height and 2.4 R of it; their centroid, then the
 *  75th-percentile distance), so it hugs a standing rat's chest instead of jutting out behind it (the bounding-box
 *  centre includes the tail). Neck rings don't use it: a dog's head and ears fall in the slab. Returns { p, k }
 *  (k = fitted radius / R, kept within 0.6..2). */
function fitRing(b, p, R, half) {
  const pos = b.geometry.attributes.position;
  const pts = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(y - p.y) < half && Math.hypot(x - p.x, z - p.z) < 2.4 * R) pts.push(x, z);
  }
  if (pts.length < 24) return { p, k: 1 };
  let cx = 0, cz = 0;
  for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cz += pts[i + 1]; }
  cx /= pts.length / 2; cz /= pts.length / 2;
  const d = [];
  for (let i = 0; i < pts.length; i += 2) d.push(Math.hypot(pts[i] - cx, pts[i + 1] - cz));
  d.sort((a, q) => a - q);
  const k = Math.max(0.6, Math.min(2, (d[Math.floor(d.length * 0.75)] * 1.08) / R));
  return { p: new THREE.Vector3(cx, p.y, cz), k };
}

// ------------------------------------------------------------------ accessories, in head units (u)
// H the head point (top-front of the head), K the crown (the top of the head, crowds.js crownPoint), N the neck, B the
// body centre.
// Head-top pieces are placed from the crown: atTop(dx, dy, dz) is at(K, dx, dy - TOP, dz), TOP being where the crown sat
// above H on the models the sizes were drawn for (0.6 u), so a hat's height above its wearer's head no longer depends on
// how far headPoint lands under the crown.
function accessory(name, col, u, H, N, B, bb, K = H, sink = () => 0, fit = null, ringK = 1, ringTilt = Math.PI / 2.3, lift = 0) {
  const out = [];
  const add = (geo, color, p, rx = 0, ry = 0, rz = 0) => { geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(p.x, p.y, p.z); out.push({ geo, color }); };
  const at = (base, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(base.x + dx * u, base.y + dy * u, base.z + dz * u);
  const TOP = 0.6;
  const atTop = (dx = 0, dy = 0, dz = 0) => at(K, dx, dy - TOP + lift, dz);   // lift: the look's own raise (Fifi's bow)
  // a neck ring round `base` (scaled by the look's ring scale); a body ring (the waistcoat) fitted on other models
  const ring = (base) => ({ p: base.clone(), k: ringK });
  const body = (base, R, dy, half) => { const p = at(base, 0, dy, 0); return fit ? fit(p, R * u, half * u) : { p, k: 1 }; };
  const onRing = (r, dx, dy, dz) => new THREE.Vector3(r.p.x + dx * u * r.k, r.p.y + dy * u, r.p.z + dz * u * r.k);
  const C = (c, d) => (c ? c : d);
  const cyl = (r0, r1, h, s = 12) => new THREE.CylinderGeometry(r0 * u, r1 * u, h * u, s);
  const tor = (R, r, s = 14) => new THREE.TorusGeometry(R * u, r * u, 6, s);
  const box = (x, y, z) => new THREE.BoxGeometry(x * u, y * u, z * u);
  const sph = (r) => new THREE.SphereGeometry(r * u, 10, 8);
  switch (name) {
    case 'tophat-small': { const d = sink(0.5); add(cyl(0.5, 0.5, 0.9), '#161616', atTop(0, 1.05 + d, -0.1)); add(cyl(0.8, 0.8, 0.08, 16), '#161616', atTop(0, 0.62 + d, -0.1)); add(cyl(0.52, 0.52, 0.2), '#7a1a2a', atTop(0, 0.75 + d, -0.1)); break; }
    case 'tophat': { const d = sink(0.55); add(cyl(0.55, 0.55, 1.2), '#161616', atTop(0, 1.2 + d, -0.1)); add(cyl(0.9, 0.9, 0.08, 16), '#161616', atTop(0, 0.62 + d, -0.1)); break; }
    case 'tophat-big': { const d = sink(0.7); add(cyl(0.7, 0.7, 1.6), '#161616', atTop(0.2, 1.4 + d, -0.1), 0, 0, 0.35); add(cyl(1.1, 1.1, 0.1, 16), '#161616', atTop(0.05, 0.65 + d, -0.1), 0, 0, 0.35); break; }
    case 'pearls': { const r = ring(N); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; add(sph(0.16), '#f6f1e6', onRing(r, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.85 + 0.2)); } break; }
    case 'monocle': add(tor(0.32, 0.05), '#d4a02a', at(H, 0.55, 0.05, 0.55), 0, Math.PI / 2.4, 0); break;
    case 'fascinator': add(cyl(0.05, 0.4, 1.2, 6), '#f08ab8', atTop(0.3, 0.9, -0.2), 0, 0, -0.5); add(sph(0.3), '#f08ab8', atTop(0.25, 0.5, -0.1)); break;
    case 'gloves': add(sph(0.45), '#ffffff', at(B, 1.3, 0, -0.4)); add(sph(0.45), '#ffffff', at(B, -1.3, 0, -0.4)); break;
    case 'beret': add(cyl(0.85, 0.7, 0.28, 14), C(col, '#c4302b'), atTop(0.15, 0.62 + sink(0.7), -0.05), 0, 0, 0.25); break;
    case 'waistcoat': { const r = body(B, 1.3, 0.2, 0.7); add(new THREE.CylinderGeometry(1.25 * u * r.k, 1.35 * u * r.k, 1.4 * u, 12), C(col, '#222222'), onRing(r, 0, 0, 0.15)); break; }
    case 'bowtie': add(box(0.9, 0.35, 0.2), C(col, '#111111'), at(N, 0, -0.1, 0.95)); break;
    case 'baton': add(cyl(0.05, 0.05, 2.4, 6), '#f4f0e6', at(B, 1.3, 0.3, 0.6), 0.6, 0, 0.3); break;
    case 'plume': add(cyl(0.05, 0.3, 1.4, 6), col || '#f0f0f0', atTop(0.4, 1.2, -0.2), 0, 0, -0.4); break;
    case 'jabot': add(cyl(0.1, 0.5, 0.6, 8), '#f8f4ea', at(N, 0, -0.35, 0.95)); break;
    case 'sweatband': add(tor(0.62, 0.14), C(col, '#2fa39a'), atTop(0, 0.6 + sink(0.62), -0.05), Math.PI / 2); break;
    case 'whistle': add(cyl(0.12, 0.12, 0.4, 6), '#c0c4c8', at(N, 0, -0.9, 1.0), Math.PI / 2); add(tor(0.9, 0.04), '#c4302b', at(N, 0, -0.2, 0.2), Math.PI / 2.4); break;
    case 'stopwatch': add(cyl(0.3, 0.3, 0.12, 12), '#d4a02a', at(N, 0, -0.9, 1.0), Math.PI / 2); break;
    case 'notepad': add(box(0.7, 0.9, 0.12), '#f4f0e6', at(B, -1.2, 0.1, 0.3)); break;
    case 'bandana-neck': { const r = ring(N); add(tor(0.95 * r.k, 0.24), C(col, '#c4302b'), onRing(r, 0, 0, 0.15), Math.PI / 2.2); add(cyl(0.05, 0.45, 0.6, 3), C(col, '#c4302b'), onRing(r, 0, -0.35, 0.95), Math.PI); break; }
    case 'bandana-head': add(sph(0.62), C(col, '#1d1d1d'), atTop(0, 0.32, -0.05)); break;
    case 'glasses-round': add(tor(0.26, 0.04), '#2a2a2a', at(H, 0.3, 0.05, 0.7)); add(tor(0.26, 0.04), '#2a2a2a', at(H, -0.3, 0.05, 0.7)); break;
    case 'spectacles': add(tor(0.24, 0.035), '#d4a02a', at(H, 0.28, 0.05, 0.65)); add(tor(0.24, 0.035), '#d4a02a', at(H, -0.28, 0.05, 0.65)); break;
    case 'pencil': add(cyl(0.06, 0.06, 1.2, 6), '#e8c23d', at(H, 0.6, 0.4, -0.2), 0, 0, 1.2); break;
    case 'stick': add(cyl(0.08, 0.08, (bb.max.y - bb.min.y) / u * 0.9, 6), '#6b4a2a', new THREE.Vector3(B.x + 1.5 * u, (bb.max.y + bb.min.y) / 2 * 0.9, B.z + 1.2 * u)); break;
    case 'cap-captain': { const d = sink(0.7); add(cyl(0.7, 0.7, 0.4, 14), '#f4f0e6', atTop(0, 0.55 + d, -0.05)); add(box(1.1, 0.06, 0.7), '#1a2440', atTop(0, 0.36 + d, 0.45)); add(cyl(0.72, 0.72, 0.12, 14), '#1a2440', atTop(0, 0.4 + d, -0.05)); break; }
    case 'cap-sailor': add(cyl(0.65, 0.6, 0.35, 14), '#ffffff', atTop(0, 0.55 + sink(0.6), -0.05)); break;
    case 'goggles': add(tor(0.3, 0.08), C(col, '#3aa0d8'), atTop(0.3, 0.45, 0.4)); add(tor(0.3, 0.08), C(col, '#3aa0d8'), atTop(-0.3, 0.45, 0.4)); add(tor(0.75, 0.05), '#333333', atTop(0, 0.45, 0), Math.PI / 2); break;
    case 'pendant': { const r = ring(N); add(tor(0.9 * r.k, 0.03), '#d4a02a', onRing(r, 0, 0, 0.2), Math.PI / 2.3); add(sph(0.25), '#5ad0e8', onRing(r, 0, -0.8, 0.95)); break; }
    case 'scarf-plaid': add(tor(0.95, 0.28), '#8e2c2c', at(N, 0, 0, 0.15), Math.PI / 2.2); add(box(0.4, 1.2, 0.12), '#2a5a3a', at(N, 0.3, -0.8, 0.9)); break;
    case 'book': add(box(0.9, 1.1, 0.25), '#5a3a2a', at(B, -1.4, 0, 0)); break;
    case 'bottlecaps': for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; add(cyl(0.2, 0.2, 0.06, 8), '#2a6ad8', at(N, Math.cos(a) * 1.0, -0.1, Math.sin(a) * 0.9 + 0.2), Math.PI / 2); } break;
    case 'spyglass': add(cyl(0.12, 0.18, 1.4, 8), '#d4a02a', at(B, 1.3, 0.2, 0.3), Math.PI / 2.5); break;
    case 'moss': add(sph(1.6).scale(1, 0.35, 1), '#5a8a3a', at(B, 0, 1.2, -0.3)); break;
    case 'mushroom': add(cyl(0.12, 0.12, 0.4, 6), '#f4f0e6', at(B, 0.6, 1.9, -0.3)); add(sph(0.35).scale(1, 0.5, 1), '#c4302b', at(B, 0.6, 2.15, -0.3)); break;
    case 'daisy': add(cyl(0.6, 0.6, 0.06, 10), '#ffffff', at(B, 0, 1.75, -0.2)); add(sph(0.22), '#e8c23d', at(B, 0, 1.8, -0.2)); break;
    case 'ear-stripe': add(box(0.12, 0.25, 0.6), '#c4302b', at(H, 0.55, 0, -0.1)); add(box(0.12, 0.25, 0.6), '#c4302b', at(H, -0.55, 0, -0.1)); break;
    case 'apron': add(box(1.4, 1.6, 0.1), C(col, '#6b4a2a'), at(B, 0, 0, 1.1)); break;
    case 'wrench': add(box(0.18, 2.0, 0.1), '#8a9098', at(B, 1.3, 0.2, 0.5), 0, 0, 0.5); break;
    case 'aviator': add(sph(0.75).scale(1, 0.75, 1.05), '#6b4a2a', atTop(0, 0.25, -0.1)); add(tor(0.25, 0.07), '#c0c4c8', atTop(0.3, 0.5, 0.45)); add(tor(0.25, 0.07), '#c0c4c8', atTop(-0.3, 0.5, 0.45)); break;
    case 'scarf-long': add(tor(0.95, 0.25), C(col, '#c4302b'), at(N, 0, 0, 0.1), Math.PI / 2.2); add(box(0.4, 0.15, 2.4), C(col, '#c4302b'), at(N, 0.4, -0.2, -1.6), 0.2); break;
    case 'headscarf': add(sph(0.7).scale(1, 0.7, 1.1), C(col, '#c4302b'), atTop(0, 0.3, -0.15)); break;
    case 'spoon': add(cyl(0.06, 0.06, 1.8, 6), '#c8a070', at(B, 1.3, 0.4, 0.5), 0, 0, 0.3); add(sph(0.25).scale(1, 0.4, 1.3), '#c8a070', at(B, 1.55, 1.3, 0.5)); break;
    case 'token': { const r = ring(N); add(tor(0.9 * r.k, 0.03), '#5a3a2a', onRing(r, 0, 0, 0.2), Math.PI / 2.3); add(cyl(0.25, 0.25, 0.05, 12), '#d4a02a', onRing(r, 0, -0.8, 1.0), Math.PI / 2); break; }
    case 'cap-conductor': { const d = sink(0.65); add(cyl(0.7, 0.65, 0.45, 14), '#3a3060', atTop(0, 0.55 + d, -0.05)); add(box(0.9, 0.06, 0.5), '#1a1530', atTop(0, 0.35 + d, 0.45)); break; }
    case 'pocketwatch': add(cyl(0.22, 0.22, 0.08, 12), '#d4a02a', at(B, 0.4, 0.3, 1.05), Math.PI / 2); break;
    case 'tie': add(box(0.3, 1.1, 0.06), C(col, '#c4302b'), at(N, 0, -0.7, 0.95)); break;
    case 'crust': add(box(0.3, 1.0, 0.25), '#c9823e', at(B, 1.1, 0.3, 0.6), 0, 0, 0.4); break;
    case 'collar': { const r = ring(N); add(tor(0.9 * r.k, 0.12), C(col, '#c4302b'), onRing(r, 0, 0, 0.1), ringTilt); add(cyl(0.18, 0.18, 0.05, 10), '#d4a02a', onRing(r, 0, -0.8, 0.85), Math.PI / 2); break; }
    case 'bow': add(box(0.9, 0.4, 0.2), C(col, '#e87aa8'), atTop(0, 0.55, -0.2)); break;
    case 'mortarboard': { const d = 0; /* the board rests on the crown, whatever the head's shape */ add(box(1.5, 0.08, 1.5), '#161616', atTop(0, 0.7 + d, -0.1)); add(cyl(0.55, 0.55, 0.3, 10), '#161616', atTop(0, 0.52 + d, -0.1)); break; }
    case 'collar-bell': { const r = ring(N); add(tor(0.9 * r.k, 0.1), '#c4302b', onRing(r, 0, 0, 0.1), Math.PI / 2.3); add(sph(0.22), '#d4a02a', onRing(r, 0, -0.8, 0.85)); break; }
    case 'bread': add(sph(1.6).scale(1.6, 0.6, 0.9), '#d9a46a', new THREE.Vector3(B.x, bb.min.y - 0.6 * u, B.z)); break;
    case 'shawl': add(tor(1.05, 0.4), '#b07ab0', at(N, 0, -0.2, 0.1), Math.PI / 2.1); break;
    case 'cushion': add(box(4, 0.6, 4), '#8e2c4c', new THREE.Vector3(B.x, bb.min.y - 0.3 * u, B.z)); break;
    case 'saddle': add(box(2.2, 0.5, 2.8), '#5a3a2a', at(B, 0, 1.6, -0.6)); add(box(2.6, 0.12, 3.4), '#1a2440', at(B, 0, 1.35, -0.6)); break;
    case 'crest': add(new THREE.ConeGeometry(0.35 * u, 1.2 * u, 6), C(col, '#3a70d0'), atTop(0, 0.75, -0.3), -0.5); break;
    case 'scroll': add(cyl(0.15, 0.15, 1.2, 8), '#f4ead0', at(B, 1.1, 0, 0.4), 0, 0, Math.PI / 2); break;
    case 'crumb': add(sph(0.3), '#d9b07a', at(H, 0, -0.3, 1.0)); break;
    case 'cap-peaked': { const d = sink(0.7); add(cyl(0.7, 0.7, 0.35, 14), '#161616', atTop(0, 0.5 + d, -0.05)); add(box(1.0, 0.06, 0.6), '#161616', atTop(0, 0.35 + d, 0.5)); break; }
    // photo mode (#9): Flicker's film canister on a red cord (black body, yellow band, grey cap)
    case 'canister': { const r = ring(N); add(tor(0.9 * r.k, 0.035), '#c4302b', onRing(r, 0, 0, 0.2), Math.PI / 2.3); const c = onRing(r, 0, -0.95, 1.0); add(cyl(0.22, 0.22, 0.55, 10), '#1d1d1f', c); add(cyl(0.225, 0.225, 0.2, 10), '#e8c23d', c); add(cyl(0.16, 0.16, 0.12, 8), '#9a9ea4', new THREE.Vector3(c.x, c.y + 0.32 * u, c.z)); break; }
    case 'head-plume': add(cyl(0.04, 0.1, 2.4, 6), '#ffffff', at(H, 0, 0.3, -1.4), 1.25); break;
    default: break;
  }
  return out;
}
