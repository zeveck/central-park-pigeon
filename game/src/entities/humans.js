// The park's people: rigged meshgen humans (SkeletonUtils clones, one
// AnimationMixer each), pooled. Every agent is simulated (cheap, seeded);
// only the nearest are drawn: up to the preset's animated cap (16 / 12 / 6),
// then a few more frozen, the rest culled. Clips crossfade by speed (idle,
// walk, run) with one-shots (throw, scold, wave, cheer, pickup).
//
// Behaviours other systems use:
//   summonFeeders(sign, n, onToss)  2–4 nearby people wander over and toss crumbs
//   flee(point, radius)             a Coo swarm or a Bully: run off, drop what they hold
//   lure(point, radius, to)         a Mimic: "?" and wander off patting pockets
//   scripted agents (rangers, Prickett): agent.script = true; the owner moves them
//
// Who's out changes with the phase (data/people.js); a nap moves everyone to
// their new phase spots.
//
// Polish-1: the 12 new rigged humans (design/humans-wiring.md) are in the role
// specs and the mixed crowds (a spec's model may be a list, picked by index:
// no random stream changes). AMBIENT people (data/people.js) are scenery: they
// live in this.extras, simulated and drawn like the rest but invisible to
// every gameplay query (agents, byRole, nearest, flee, lure, feeders), so the
// recorded solutions replay unchanged. Per-model clip variants (jog, phone-walk,
// scan-walk, balance, cook, sit…) and idle flavour one-shots are visual only
// (the clone's own timer, never a.oneShot or a random stream). Pools grow
// lazily per model up to the preset's caps; vip agents (the wedding party) are
// drawn past the caps near the camera. Carriage drivers are drawn up on their
// carriage box, Dolores on her bench, chess players on stools; dog walkers
// lead leashed dogs.

import * as THREE from 'three';
import { patch as dogGait, DogGait } from '../anim/dog-gait.js';   // batch-3 (#11): the dogs' coded trot
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PEOPLE, FLEES, AMBIENT } from '../data/people.js';
import { phaseList } from '../data/crews.js';
import { rngFor } from '../core/rng.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { simplifiedGeometry, simplifierReady } from '../gfx/simplify.js';

const MODELS = ['human-park', 'human-ranger', 'human-vendor', 'human-prickett', 'human-walter', 'human-wedding',
  'human-dolores', 'human-chess-player', 'human-jogger', 'human-tourist', 'human-child', 'human-teen-skater', 'human-birder',
  'human-businessperson', 'human-halal-cart-man', 'human-pizza-counterman', 'human-dog-walker', 'human-carriage-driver'];
// accessories a model already wears (modelled), so a role's code accessory is skipped on it
const MODEL_HAS = { 'human-tourist': ['camera'], 'human-birder': ['binoculars'], 'human-businessperson': ['phone'], 'human-halal-cart-man': ['paperhat'], 'human-pizza-counterman': ['paperhat'] };
// a missing one-shot clip → the nearest this model has
const CLIP_ALT = { throw: ['pickup', 'wave', 'call', 'cheer'], pickup: ['throw', 'wave'], cheer: ['wave', 'jump', 'argue', 'call'], scold: ['argue', 'shrug', 'call'], taunt: ['wave', 'gawk', 'call', 'shrug'], wave: ['call', 'cheer', 'bow'], attack: ['scold', 'argue'], stomp: ['scold', 'argue'] };
const LOOPS = new Set(['idle', 'walk', 'run', 'sit', 'jog', 'balance', 'scan-walk', 'phone-walk', 'phone', 'cook', 'look', 'think', 'catch-breath']);
// seats (visual): where a seated agent's model is drawn
const SEAT = { stool: 0.12, bench: 0.08, carriage: 0 };
const WALK = 1.25, RUN = 3.6, JOG = 2.8;
const BENCH_DIST = 70;   // perf: sitter benches drawn within this of the camera (people are drawn out to ~60 m)
const FADE = 0.2;

const _v = new THREE.Vector3();
const _wp = { x: 0, y: 0, z: 0 }, _wn = { x: 0, z: 0, tag: null }, _wg = { y: 0, kind: 'terrain', item: null };   // batch-3 (#1)
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere();

class Agent {
  constructor(id, spec, home, rnd, k = 0) {
    this.id = id;
    this.spec = spec;
    this.role = spec.role;
    const list = spec.models || (Array.isArray(spec.model) ? spec.model : null);
    this.model = list ? list[(k + (spec.mix || 0)) % list.length] : spec.model;
    this.k = k;
    this.tint = spec.tints ? spec.tints[k % spec.tints.length] : spec.tint || null;
    this.home = home;              // { x, z, yaw }
    this.x = home.x; this.z = home.z; this.y = undefined; this.yaw = home.yaw ?? 0;
    this.speed = 0;
    this.mode = 'home';
    this.t = rnd() * 4;            // timers
    this.target = null;
    this.rnd = rnd;
    this.oneShot = null;           // { clip, t }
    this.loopT = rnd();            // jog / skate position
    this.holds = spec.holds || null;
    this.busy = false;
    this.clone = null;
    this.out = true;
    this.script = false;
    this.seated = false;
    this.scale = spec.kid ? (this.model === 'human-child' ? 0.88 : 0.62) : 1;
  }
}

export class Humans {
  constructor(G) {
    this.G = G;
    this.clings = [];   // fun pass: (agent, by) => line | null (see flee)
    this.group = new THREE.Group();
    this.group.name = 'humans';
    this.gltf = {};
    this.pools = {};          // model → [clone]
    this.agents = [];
    this.extras = [];          // Polish-1: AMBIENT scenery people (never in this.agents)
    this.tick = 0;
    this.drawn = { animated: 0, frozen: 0 };
    this.rnd = rngFor('humans');
    this.acc = makeAccessories();
  }

  async load(preset) {
    const loader = new GLTFLoader();
    await Promise.all(MODELS.map(async (m) => {
      if (!this.G.registry.has(m)) return;
      this.gltf[m] = await loader.loadAsync('./assets/models/' + m + '.glb');
      this.G.progress?.finish(0);
    }));
    // perf pass: a distance LOD per model (about a third of the triangles, same skeleton), so the presets draw their
    // design counts (16 / 12 / 6) inside the triangle caps
    await simplifierReady;
    this.lodGeo = new Map();
    for (const g of Object.values(this.gltf)) g.scene.traverse((o) => { if (o.isSkinnedMesh && !this.lodGeo.has(o.geometry)) this.lodGeo.set(o.geometry, simplifiedGeometry(o.geometry, 0.35, 0.03, 5)); });
    this.lodDist = { high: 24, medium: 16, low: 9 }[preset.id] ?? 16;
    const cap = preset.humans;
    this.shadowCasters = { high: 4, medium: 2, low: 0 }[preset.id] ?? 2;
    this.capAnimated = cap;
    this.floorA = Math.min(cap, PEOPLE_FLOOR[preset.id] ?? 4);
    this.capFrozen = preset.id === 'low' ? 0 : Math.ceil(cap / 2);
    this.range = { high: 120, medium: 90, low: 35 }[preset.id] || 90;
    const total = cap + this.capFrozen;
    this.lowVip = preset.id === 'low';
    const per = { 'human-park': total, 'human-ranger': 3, 'human-vendor': Math.min(8, total), 'human-prickett': 1, 'human-walter': 3, 'human-wedding': 1, 'human-dolores': 2, 'human-carriage-driver': 3, 'human-halal-cart-man': 1, 'human-pizza-counterman': 2 };
    this.#buildAgents();
    // Polish-1: each pool starts with a clone or two and grows on demand (#assign) up to its cap; the
    // wedding party's models always have room for every vip agent
    this.poolMax = {};
    const vipNeed = {};
    for (const a of [...this.agents, ...this.extras]) if (a.spec.vip && !(this.lowVip && a.spec.vip > 1)) vipNeed[a.model] = (vipNeed[a.model] || 0) + 1;
    for (const m of MODELS) {
      this.pools[m] = [];
      if (!this.gltf[m]) continue;
      this.poolMax[m] = Math.max(per[m] ?? Math.min(total, 8), (per[m] ?? 0) + (vipNeed[m] || 0));
      const start = m === 'human-park' ? per[m] : Math.min(this.poolMax[m], 2);
      for (let i = 0; i < start; i++) this.pools[m].push(this.#makeClone(m));
    }
    this.#buildProps();
    this.setPhase(this.G.state?.phase || 'morning');
  }

  #makeClone(model) {
    const g = this.gltf[model];
    const root = SkeletonUtils.clone(g.scene);
    root.name = model;
    const holder = new THREE.Group();
    holder.add(root);
    holder.scale.x = -1;   // counter-mirror (the world root is mirrored)
    const mats = [];
    root.traverse((o) => {
      if (o.isMesh) {
        const src = o.material;
        o.material = ruleMaterial({ map: src.map || null });
        if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
        o.castShadow = true; o.receiveShadow = true;
        o.frustumCulled = false;
        mats.push(o.material);
      }
    });
    const bones = {};
    root.traverse((o) => { if (o.isBone && ['Head', 'RightHand', 'LeftHand', 'Spine02'].includes(o.name)) bones[o.name] = o; });
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const clip of g.animations) {
      const a = mixer.clipAction(clip);
      if (LOOPS.has(clip.name)) a.setLoop(THREE.LoopRepeat);
      else { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      actions[clip.name] = a;
    }
    // bone holders that undo the rig's scale, so accessories are in metres
    root.updateMatrixWorld(true);
    const hold = {};
    for (const [n, b] of Object.entries(bones)) {
      const s = b.getWorldScale(_v).x / Math.abs(root.getWorldScale(new THREE.Vector3()).x || 1);
      const h = new THREE.Group();
      h.scale.setScalar(1 / (s || 1));
      b.add(h);
      hold[n] = h;
    }
    // perf pass: the LOD meshes, bound to the clone's own skeleton and sharing its materials (tints apply to both)
    const lods = [];
    root.traverse((o) => {
      const lg = o.isSkinnedMesh && this.lodGeo?.get(o.geometry);
      if (!lg) return;
      const lm = new THREE.SkinnedMesh(lg, o.material);
      lm.name = o.name + ':lod';
      lm.position.copy(o.position); lm.quaternion.copy(o.quaternion); lm.scale.copy(o.scale);
      lm.bind(o.skeleton, o.bindMatrix);
      lm.frustumCulled = false; lm.castShadow = o.castShadow; lm.receiveShadow = o.receiveShadow;
      lm.visible = false;
      lods.push([o, lm]);
    });
    for (const [o, lm] of lods) o.parent.add(lm);
    holder.visible = false;
    this.group.add(holder);
    return { model, holder, root, mats, mixer, actions, hold, lods, far: false, agent: null, current: null, accKey: '', flav: null, flavT: 3 };
  }

  // ------------------------------------------------------------ agents
  #buildAgents() {
    let id = 0;
    for (const spec of PEOPLE) {
      for (let k = 0; k < spec.n; k++) {
        const rnd = rngFor('human:' + spec.role + ':' + id);   // (the same key reseed() uses)
        let home;
        if (spec.act === 'sit' && !spec.seat) spec.seat = 'bench';   // Fixes-3 (R5): nobody sits on thin air
        if (spec.act === 'jog' || spec.act === 'path' || spec.act === 'skate') home = { ...(spec.at || spec.path[0]) };
        else if (spec.r > 0) {
          const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spec.r;
          home = { x: spec.at.x + Math.cos(a) * d, z: spec.at.z + Math.sin(a) * d, yaw: rnd() * 6.28 };
          if (spec.role === 'driver') home = { x: spec.at.x + (k - 1) * 24, z: spec.at.z, yaw: 1.57 };
          if (spec.role === 'doorman') home = { x: spec.at.x, z: spec.at.z + (k ? 260 : -120), yaw: -1.57 };
        } else home = { ...spec.at };
        this.#dryHome(home, spec);
        const ag = new Agent('h' + id, spec, home, rnd, k);
        ag.seedKey = 'human:' + spec.role + ':' + id; id++;
        ag.loopT = (k / spec.n) + rnd() * 0.1;
        ag.loopT0 = ag.loopT;
        this.agents.push(ag);
      }
    }
    // Polish-1: the scenery people, on their own seeds ('amb:…'), in this.extras only
    let e = 0;
    for (const spec of AMBIENT) {
      const n = spec.spots ? spec.spots.length : spec.n || 1;
      for (let k = 0; k < n; k++) {
        const key = 'amb:' + spec.role + ':' + e;
        const rnd = rngFor(key);
        let home;
        if (spec.spots) home = { ...spec.spots[k] };
        else if (spec.act === 'wander') { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spec.r; home = { x: spec.at.x + Math.cos(a) * d, z: spec.at.z + Math.sin(a) * d, yaw: rnd() * 6.28 }; }
        else home = { ...(spec.at || spec.path[0]) };
        this.#dryHome(home, spec);
        const ag = new Agent('a' + e, spec, home, rnd, k);
        ag.seedKey = key; e++;
        ag.ambient = true;
        ag.loopT = spec.act === 'route' ? (k / n) * 2 + rnd() * 0.05 : (k / n) + (spec.loopOff || 0) + rnd() * 0.05;
        ag.loopT0 = ag.loopT;
        this.extras.push(ag);
      }
    }
  }

  /** Batch-3 (#1): a home on the water or inside a solid moves to the nearest spot a person can stand (no random draw, so
   *  nobody else's stream moves). Loops (jog, path, route, skate) keep their data: only where the loop starts. */
  #dryHome(home, spec) {
    const C = this.G.collision;
    if (!C || spec.seat === 'carriage' || (C.standable(home.x, home.z, { r: 0.3, h: 1.5 }) != null && C.walkBlocked(home.x, home.z) !== 1)) return;
    const q = C.clearNear(home.x, home.z, { r: 0.3, h: 1.5, maxR: 30 });
    if (q) { home.x = q.x; home.z = q.z; }
  }

  /** Batch-3 (#1, #7): a free walker's step (wander, goto): never onto the water, pushed out of walls and trunks, its
   *  height on the walkers' ground. Returns false when the way is blocked (the caller gives up on the target). */
  #stepTo(a, nx, nz) {
    const C = this.G.collision;
    if (C.walkBlocked(nx, nz) === 1 && C.walkBlocked(a.x, a.z) !== 1) return false;   // the water's edge (from a shore cell, any step is fine)
    // the sim's own height (a.gy), never the drawn one (a.y: only people the camera draws have it, and how many are drawn
    // depends on the preset): positions must not depend on what is drawn
    const p = _wp;
    p.x = nx; p.z = nz; p.y = a.gy ?? C.floorAt(nx, nz);
    const hit = C.pushOut(p, 0.28, 1.5, _wn);
    const moved = Math.hypot(p.x - a.x, p.z - a.z);
    a.x = p.x; a.z = p.z;
    a.gy = C.groundFor(a.x, a.z, p.y + 0.35, _wg).y;
    // pushed back where it stood: a wall across the way
    return !(hit && moved < 0.002);
  }

  /** Perf (render only): the sitter benches within BENCH_DIST of the camera, packed at the front of the instance list. */
  #nearBenches(camera) {
    const B = this.benches, cp = camera?.position;
    if (!B || !cp) return;
    const near = B.all.filter((b) => (b.x - cp.x) ** 2 + (b.z - cp.z) ** 2 < BENCH_DIST * BENCH_DIST);
    const key = near.map((b) => B.all.indexOf(b)).join(',');
    if (key === B.key) return;
    B.key = key;
    near.forEach((b, i) => B.m.setMatrixAt(i, b.mat));
    B.m.count = near.length; B.m.visible = near.length > 0;
    B.m.instanceMatrix.needsUpdate = true;
    if (near.length) B.m.computeBoundingSphere();
  }

  /** Visual furniture and companions: stools under the seated chess players, dogs on leashes. */
  #buildProps() {
    const G = this.G;
    const stoolSpots = [...this.agents, ...this.extras].filter((a) => a.spec.seat === 'stool').map((a) => a.home);   // Fixes-3: agents too
    if (stoolSpots.length) {
      const geo = new THREE.CylinderGeometry(0.2, 0.17, 0.42, 10).translate(0, 0.21, 0);
      const m = new THREE.InstancedMesh(geo, ruleMaterial({ color: 0x6a6e72, roughness: 0.8 }), stoolSpots.length);
      const mm = new THREE.Matrix4();
      stoolSpots.forEach((p, i) => { const back = 0.16; const x = p.x - Math.sin(p.yaw) * back, z = p.z - Math.cos(p.yaw) * back; mm.makeTranslation(x, G.terrain.heightAt(x, z), z); m.setMatrixAt(i, mm); });
      m.castShadow = true; m.receiveShadow = true;
      m.name = 'chess-stools';
      this.group.add(m);
    }
    // Dolores's own bench, and (Fixes-3, R5) a bench behind every other sitter who had none: the slice eaters, the
    // sunbathers, the picnickers sat on thin air. Visual only, no collision; one instanced draw.
    G.registry.baked('bench').then((b) => {
      if (!b) return;
      const bb = b.bounds, k = 1.8 / Math.max(0.01, bb.max.x - bb.min.x);
      const list = this.agents.filter((a) => a.spec.seat === 'bench');
      if (!list.length) return;
      const cg = b.geometry.clone().translate(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);   // centred under the sitter
      const m = new THREE.InstancedMesh(cg, b.makeMaterial(), list.length);
      // perf (batch-3 probe): one bounding sphere over the whole park drew all of them, and their shadows, at every spot (~23k
      // triangles twice on Low). Now only the benches near the camera are in the instance list (#nearBenches), and they cast
      // shadows on Medium and High only. Render only: nothing reads a bench.
      m.castShadow = G.preset?.id !== 'low'; m.receiveShadow = true; m.name = 'sitter-benches';
      const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(-k, k, k), pos = new THREE.Vector3();
      list.forEach((a, i) => {
        const back = 0.22, p = a.home;
        const x = p.x - Math.sin(p.yaw ?? 0) * back, z = p.z - Math.cos(p.yaw ?? 0) * back;
        pos.set(x, G.terrain.heightAt(x, z) - bb.min.y * k, z);
        mm.compose(pos, q.setFromAxisAngle(up, p.yaw ?? 0), sc);
        m.setMatrixAt(i, mm);
      });
      this.benches = { m, all: list.map((a, i) => { const t = new THREE.Matrix4(); m.getMatrixAt(i, t); return { x: a.home.x, z: a.home.z, mat: t }; }), key: '' };
      m.count = 0; m.visible = false;
      this.group.add(m);
    });
    // dogs: baked crowd models, one mesh each, led on a leash line from the walker's hand
    this.dogKinds = [];
    const leashMat = new THREE.LineBasicMaterial({ color: 0xc4302b });
    const kinds = ['dog', 'dog-poodle', 'dog-dachshund'];
    Promise.all(kinds.map((k) => G.registry.baked(k))).then((baked) => {
      let n = 0;
      for (const a of [...this.agents, ...this.extras]) {
        if (!a.spec.dogs) continue;
        a.dogs = [];
        for (let j = 0; j < a.spec.dogs; j++) {
          const b = baked[(n + j) % kinds.length] || baked.find(Boolean);
          if (!b) break;
          const mesh = new THREE.Mesh(b.geometry, b.makeMaterial(DOG_TINTS[(n + j) % DOG_TINTS.length]));
          const gu = dogGait(mesh.material, b.geometry), gait = new DogGait((b.bounds.max.y - b.bounds.min.y) * 0.62, n + j);   // batch-3 (#11)
          mesh.customDepthMaterial = mesh.material.userData.gaitDepth;   // batch-3 (#11): the shadow trots too
          mesh.castShadow = G.preset?.id === 'high';   // perf pass: High only
          const h = new THREE.Group(); h.add(mesh); h.scale.set(-0.62, 0.62, 0.62);
          const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
          const leash = new THREE.Line(geo, leashMat); leash.frustumCulled = false;
          h.visible = true; leash.visible = false;   // batch-3 (#11): drawn in the shader warm-up (the trot is its own program); pose() hides it
          h.position.set(a.x, a.y ?? 0, a.z);
          this.group.add(h, leash);
          a.dogs.push({ h, leash, side: j - (a.spec.dogs - 1) / 2, x: a.x, z: a.z, yaw: a.yaw, bob: j * 1.7, gu, gait });
        }
        n += a.spec.dogs;
      }
    });
  }

  /** Fresh random streams and home positions for every agent (fixtures and replays start identical). */
  reseed() {
    for (const a of [...this.agents]) if (a.temp) this.removeAgent(a);
    for (const a of [...this.agents, ...this.extras]) {
      if (!a.seedKey) continue;
      a.rnd = rngFor(a.seedKey);
      a.rnd(); a.rnd(); a.rnd();
      a.t = a.rnd() * 4;
      a.loopT = a.loopT0;
      a.stopT = 0; a.stopped = false; a.lastStop = undefined;   // 3b: the jogger's fountain stop no longer leaks from an earlier run into a replay
    }
    this.tick = 0;
    this.setPhase(this.G.state.phase);
  }

  /** A temporary or scripted agent (feeders, the ranger, Prickett). */
  addAgent({ role, model = 'human-park', at, act = 'stand', acc = [], script = false, tint = null }) {
    // batch-3 (review): never onto the water (summonFeeders' walk-ins); a scene's own extras move only off water
    const C = this.G.collision;
    if (C && (C.walkBlocked(at.x, at.z) === 1 || (!script && C.standable(at.x, at.z) == null))) { const q = C.clearNear(at.x, at.z, { maxR: 20 }); if (q) at = { ...at, x: q.x, z: q.z }; }
    const spec = { role, model, act, at, r: 0, acc, tint, phases: 'any' };
    const ag = new Agent('x' + this.agents.length, spec, { ...at }, rngFor('agent:' + role + this.agents.length));
    ag.script = script;
    this.agents.push(ag);
    return ag;
  }

  removeAgent(ag) {
    this.#release(ag);
    this.agents = this.agents.filter((a) => a !== ag);
  }

  setPhase(phase) {
    for (const a of [...this.agents, ...this.extras]) {
      if (a.script || a.temp) continue;
      const spec = a.spec;
      a.out = phaseList(spec.phases).includes(phase) && !(spec.until && this.G.state?.flags[spec.until]);
      a.x = a.home.x; a.z = a.home.z; a.yaw = a.home.yaw ?? 0; a.y = undefined; a.gy = undefined;
      a.mode = 'home'; a.target = null; a.busy = false; a.oneShot = null; a.speed = 0;
      a.holds = spec.holds || null;
      if (!a.out) this.#release(a);
    }
    for (const a of this.agents.filter((q) => q.temp)) this.removeAgent(a);
  }

  // ------------------------------------------------------------ behaviours
  /** Send 2–4 nearby people to toss crumbs under a sign. onToss() runs once, at the first throw. */
  summonFeeders(sign, n, onToss) {
    const cands = this.agents.filter((a) => a.out && !a.busy && !a.script && a.spec.feeder)
      .map((a) => ({ a, d: Math.hypot(a.x - sign.x, a.z - sign.z) })).filter((c) => c.d < 16).sort((p, q) => p.d - q.d);
    const chosen = cands.slice(0, n).map((c) => c.a);
    // fun pass (P3): a group (the Boathouse picnic) gets up together: one of them feeding the birds brings the rest
    for (const c of [...chosen]) if (c.spec.group) for (const a of this.agents) if (a.spec.group === c.spec.group && a.out && !a.busy && !a.script && !chosen.includes(a)) chosen.push(a);
    // not enough people nearby: picnickers walk in from the nearest path
    for (let k = chosen.length; k < Math.max(2, n); k++) {
      const a0 = (k * 2.3 + sign.x) % 6.28;
      const ag = this.addAgent({ role: 'picnicker', at: { x: sign.x + Math.cos(a0) * 11, z: sign.z + Math.sin(a0) * 11, yaw: 0 }, act: 'stand' });
      ag.temp = true; ag.spec.feeder = true;
      chosen.push(ag);
    }
    let tossed = false;
    chosen.forEach((a, i) => {
      a.busy = true;
      const ang = (i / chosen.length) * Math.PI * 1.2 + 2.2 + (sign.yaw || 0);
      const stand = { x: sign.x + Math.cos(ang) * 1.6, z: sign.z + Math.sin(ang) * 1.6 };
      this.goTo(a, stand, WALK * 1.3, () => {
        a.yaw = Math.atan2(sign.x - a.x, sign.z - a.z);
        this.play(a, a.model === 'human-park' ? 'throw' : 'pickup', 1.6, () => {
          if (!tossed) { tossed = true; onToss?.(); }
          a.t = 4;
          a.mode = 'linger';
        });
      });
    });
    return chosen;
  }

  /** Walk (or run) an agent to a point, then call done(). */
  goTo(a, p, speed = WALK, done = null) {
    a.mode = 'goto';
    a.target = { x: p.x, z: p.z, speed, done };
  }

  play(a, clip, secs, done = null) { a.oneShot = { clip, t: secs, done }; a.speed = 0; }

  /** A Coo swarm or a Bully at `point`: people within radius run off and drop what they hold.
   *  Fun pass: a scheme may make someone cling (this.clings: (agent, by) => a line, or null): they stay put, keep what they
   *  hold and say the line (the "almost" feedback: the picnic's peas, the anchovy fan), and the bus gets 'fail'. */
  flee(point, radius = 3.5, { by = 'swarm' } = {}) {
    const hit = [];
    let clung = false;
    for (const a of this.agents) {
      if (!a.out || a.script || !FLEES.includes(a.role)) continue;
      const d = Math.hypot(a.x - point.x, a.z - point.z);
      if (d > radius) continue;
      hit.push(a);
      const line = this.clings.map((f) => f(a, by)).find(Boolean);
      if (line) {
        if (!clung) this.G.bubbles.add(line, { at: () => ({ x: a.x, y: (a.y ?? 0) + 2.15, z: a.z }), ttl: 3.2, range: 60 });
        clung = true;
        continue;
      }
      if (a.holds) {
        this.G.items.spawn(a.holds, a.x + Math.sin(a.yaw) * 0.4, a.z + Math.cos(a.yaw) * 0.4, { born: this.G.state.time });
        this.G.bus.emit('dropped', { by: a.role, item: a.holds });
        a.holds = null;
      }
      const ax = a.x - point.x, az = a.z - point.z, l = Math.hypot(ax, az) || 1;
      a.busy = true;
      this.G.bubbles.add(by === 'bully' ? 'AAH!' : 'Whoa!', { at: () => ({ x: a.x, y: a.y + 2.05, z: a.z }), ttl: 1.6 });
      const fx = a.x + (ax / l) * 9, fz = a.z + (az / l) * 9, fq = this.G.collision.clearNear(fx, fz, { maxR: 8 }) || { x: fx, z: fz };   // batch-3: not into the water
      this.goTo(a, fq, RUN, () => { a.mode = 'linger'; a.t = 10; });
    }
    if (clung) this.G.bus.emit('fail', { kind: 'cling', by });
    return hit;
  }

  /** A Mimic at `point`: people within radius look round "?" and wander toward `to`. */
  lure(point, radius = 6, to = null) {
    const hit = [];
    for (const a of this.agents) {
      if (!a.out || a.script || Math.hypot(a.x - point.x, a.z - point.z) > radius) continue;
      hit.push(a);
      a.busy = true;
      this.G.bubbles.add('?', { kind: 'clue', at: () => ({ x: a.x, y: a.y + 2.1, z: a.z }), ttl: 3 });
      const tp = to || { x: a.x + 10, z: a.z };
      this.goTo(a, tp, WALK, () => { a.mode = 'linger'; a.t = 20; });
    }
    return hit;
  }

  nearest(role, p, maxD = 1e9) {
    let best = null, bd = maxD;
    for (const a of this.agents) {
      if (!a.out || (role && a.role !== role)) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  byRole(role) { return this.agents.filter((a) => a.role === role); }

  /** Is someone in this role out right now? (needs.human in the scheme table) */
  isOut(role) {
    if (role === 'wedding') role = 'bride';
    if (role === 'prickett') return !!this.G.street?.prickett?.out;
    return this.agents.some((a) => a.role === role && a.out);
  }

  // ------------------------------------------------------------ the fixed update
  update(dt, camera) {
    const G = this.G;
    for (const a of this.agents) {
      if (!a.out) continue;
      if (a.script) { this.#oneShot(a, dt); continue; }
      this.#sim(a, dt);
    }
    for (const a of this.extras) if (a.out && !a.script) this.#sim(a, dt);
    if (this.tick++ % 8 === 0) { this.#assign(camera); this.#nearBenches(camera); }
    // pose and animate the drawn ones
    let anim = 0, frozen = 0;
    for (const list of [this.agents, this.extras]) for (const a of list) {
      const c = a.clone;
      if (!c) { if (a.dogs?.[0]?.h.visible) for (const d of a.dogs) d.h.visible = d.leash.visible = false; continue; }
      if (!a.seated) a.y = G.collision.groundFor(a.x, a.z, (a.y ?? G.collision.floorAt(a.x, a.z)) + 0.35, _wg).y;   // batch-3 (#1): water is a floor
      const seat = this.#seat(a);
      if (seat) { c.holder.position.set(seat.x, seat.y, seat.z); c.holder.rotation.y = seat.yaw; }
      else { c.holder.position.set(a.x, a.y + (a.seatY || 0), a.z); c.holder.rotation.y = a.yaw; }
      // Fixes-2: a.lie (0..1) tips someone over backwards, flat on their back (the Wedding's photographer). Visual only.
      if (a.lie || c.holder.rotation.x) { c.holder.rotation.order = 'YXZ'; c.holder.rotation.x = -(a.lie || 0) * 1.48; c.holder.position.y += (a.lie || 0) * 0.14; }
      c.holder.scale.set(-a.scale, a.scale, a.scale);
      // perf pass (render only): the LOD past lodDist from the camera
      const cp = camera?.position, dc = cp ? Math.hypot(a.x - cp.x, (a.y || 0) - cp.y, a.z - cp.z) : 0, far = dc > this.lodDist;
      if (far !== c.far) { c.far = far; for (const [o, lm] of c.lods) { o.visible = !far; lm.visible = far; } }
      const bare = dc > this.lodDist * 2;   // and no accessories past twice that (each is a draw call)
      if (bare !== c.bare) { c.bare = bare; for (const h of Object.values(c.hold)) h.visible = !bare; }
      // Land/perf: the clip choice, the mixer and the dogs are visual only: they run once per DRAWN frame (pose(), from
      // main.js render()), with the game time since, and less often for people far from the camera
      c.dc = dc;
      if (c.animated) { c.animDt = (c.animDt || 0) + dt; anim++; } else frozen++;
      if (a.dogs) c.dogDt = (c.dogDt || 0) + dt;
    }
    this.drawn = { animated: anim, frozen };
  }

  /** Land/perf: pose and animate the drawn people (visual only; nothing in the sim reads a clip, a bone or a dog). Mixers
   *  run every drawn frame within 14 m of the camera, every 2nd frame to 30 m, every 3rd beyond (with the time since). */
  pose() {
    this.poseN = (this.poseN || 0) + 1;
    for (const list of [this.agents, this.extras]) for (const a of list) {
      const c = a.clone;
      if (!c) continue;
      if (c.animated && c.animDt > 0) {
        const every = c.dc < 14 ? 1 : c.dc < 30 ? 2 : 3;
        if (c.current == null || (this.poseN + (a.k | 0)) % every === 0 || c.animDt > 0.25) {
          this.#clipFor(a, c, c.animDt);
          c.mixer.update(c.animDt);
          c.animDt = 0;
        }
      }
      if (a.dogs && c.dogDt > 0) { this.#walkDogs(a, c, c.dogDt); c.dogDt = 0; }
    }
  }

  /** Where a seated agent's model is drawn (visual only: the agent's own x/z stay where the sim has them). */
  #seat(a) {
    const s = a.spec.seat;
    if (!s || a.mode !== 'home' || a.busy) return null;
    if (s === 'carriage') {
      const car = this.G.street?.carriages?.[a.k];
      if (!car?.visible) return null;
      const yaw = car.rotation.y, f = CARRIAGE_BOX.fwd;
      return { x: car.position.x + Math.sin(yaw) * f, y: car.position.y + CARRIAGE_BOX.up, z: car.position.z + Math.cos(yaw) * f, yaw };
    }
    return { x: a.x, y: (a.y ?? 0) + SEAT[s], z: a.z, yaw: a.home.yaw ?? a.yaw };
  }

  #walkDogs(a, c, dt) {
    const yaw = c.holder.rotation.y, px = c.holder.position.x, pz = c.holder.position.z;
    const moving = a.speed > 0.15;
    // the hand (RightHand bone), for the leash
    const hand = c.hold.RightHand;
    if (hand) { hand.getWorldPosition(_v); this.group.worldToLocal(_v); } else _v.set(px, (a.y || 0) + 0.9, pz);
    a.dogs.forEach((d, j) => {
      const lead = moving ? 1.9 : 1.2;
      const tx = px + Math.sin(yaw) * lead + Math.cos(yaw) * d.side * 0.7, tz = pz + Math.cos(yaw) * lead - Math.sin(yaw) * d.side * 0.7;
      const k = Math.min(1, dt * 4);
      // batch-3 (#7): a dog never steps onto the water or into a wall or a rock (it waits at the walker's heel)
      const nx = d.x + (tx - d.x) * k, nz = d.z + (tz - d.z) * k, ox = d.x, oz = d.z;
      if (!this.G.collision.walkBlocked(nx, nz)) { d.x = nx; d.z = nz; }
      else if (Math.hypot(d.x - px, d.z - pz) > 2.5) { d.x = px; d.z = pz; }
      d.yaw = moving ? yaw : d.yaw + Math.sin(this.tick * 0.02 + d.bob) * 0.01;
      d.bob += dt * (moving ? 9 : 1.5);
      d.gy = this.G.collision.groundFor(d.x, d.z, (d.gy ?? this.G.collision.floorAt(d.x, d.z)) + 0.35, _wg).y;   // batch-3 (#7): the ground rule
      const y = d.gy;   // batch-3 (#11): no bounce; the legs trot at the speed it covers ground (anim/dog-gait.js)
      d.gait.step(dt, Math.hypot(d.x - ox, d.z - oz) / Math.max(dt, 1e-4)).apply(d.gu);
      d.h.position.set(d.x, y, d.z); d.h.rotation.y = d.yaw;
      d.h.visible = d.leash.visible = true;
      const pa = d.leash.geometry.attributes.position;
      pa.setXYZ(0, _v.x, _v.y, _v.z); pa.setXYZ(1, d.x + Math.sin(d.yaw) * 0.18, y + 0.32, d.z + Math.cos(d.yaw) * 0.18);
      pa.needsUpdate = true;
    });
  }

  #sim(a, dt) {
    const s = a.spec;
    if (this.#oneShot(a, dt)) return;
    if (a.mode === 'goto') {
      const t = a.target;
      const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.15) {
        a.speed = 0; a.mode = 'idle';
        const f = t.done; a.target = null; f?.();
        return;
      }
      a.speed = Math.min(t.speed, d * 3 + 0.3);
      const turn = Math.atan2(dx, dz);
      a.yaw = turnTo(a.yaw, turn, 6 * dt);
      // batch-3 (#1): blocked (the water's edge, a wall) for a second: as far as they can get counts as there
      if (this.#stepTo(a, a.x + (dx / d) * a.speed * dt, a.z + (dz / d) * a.speed * dt)) t.stuck = 0;
      else if ((t.stuck = (t.stuck || 0) + dt) > 1) { a.speed = 0; a.mode = 'idle'; const f = t.done; a.target = null; f?.(); }
      return;
    }
    if (a.mode === 'linger') {
      a.speed = 0;
      a.t -= dt;
      if (a.t <= 0) {
        if (a.temp) { a.mode = 'goto'; a.target = { x: a.home.x, z: a.home.z, speed: WALK, done: () => { a.out = false; this.#release(a); a.dead = true; } }; return; }
        this.goTo(a, a.home, WALK, () => { a.mode = 'home'; a.busy = false; a.yaw = a.home.yaw ?? a.yaw; });
      }
      return;
    }
    if (a.mode === 'idle') { a.speed = 0; return; }
    // home behaviour
    switch (s.act) {
      case 'wander': {
        if (a.target) {
          const dx = a.target.x - a.x, dz = a.target.z - a.z, d = Math.hypot(dx, dz);
          if (d < 0.2) { a.target = null; a.t = 2 + a.rnd() * 5; a.speed = 0; break; }
          a.speed = WALK * 0.85;
          a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), 4 * dt);
          if (!this.#stepTo(a, a.x + (dx / d) * a.speed * dt, a.z + (dz / d) * a.speed * dt)) { a.target = null; a.t = 1; a.speed = 0; }   // batch-3: blocked: pick again
        } else {
          a.speed = 0;
          a.t -= dt;
          if (a.t <= 0) {
            const ang = a.rnd() * Math.PI * 2, r = Math.sqrt(a.rnd()) * (s.r || 6);
            const tx = s.at.x + Math.cos(ang) * r, tz = s.at.z + Math.sin(ang) * r;
            // batch-3 (#1): never a target on the water or inside a solid (the same two draws either way)
            if (this.G.collision.standable(tx, tz, { r: 0.3, h: 1.5 }) != null && this.G.collision.walkBlocked(tx, tz) !== 1) a.target = { x: tx, z: tz };
            else a.t = 1;
          }
        }
        break;
      }
      case 'jog': {
        const L = s.loop;
        if (a.stopT > 0) { a.stopT -= dt; a.speed = 0; a.stopped = true; break; }
        a.stopped = false;
        if (s.stop && Math.hypot(a.x - s.stop.x, a.z - s.stop.z) < 1.2 && (a.lastStop ?? -99) < this.G.state.time - 20) { a.stopT = s.stop.secs; a.lastStop = this.G.state.time; this.G.bubbles.add('*gulp*', { at: () => ({ x: a.x, y: (a.y || 0) + 2.05, z: a.z }), ttl: 1.5 }); break; }
        a.loopT = (a.loopT + (JOG * dt) / (2 * Math.PI * ((L.rx + L.rz) / 2))) % 1;
        const p = superEllipse(s.at.x, s.at.z, L.rx, L.rz, L.exp, a.loopT);
        const q = superEllipse(s.at.x, s.at.z, L.rx, L.rz, L.exp, a.loopT + 0.002);
        a.x = p.x; a.z = p.z; a.yaw = Math.atan2(q.x - p.x, q.z - p.z); a.speed = JOG;
        break;
      }
      case 'skate': {
        const rx = s.rx ?? 13, rz = s.rz ?? 8, w = s.speed ?? 0.035;   // (Polish-1: the ambient skaters' ovals; the role's are unchanged)
        a.loopT = (a.loopT + dt * w + 1) % 1;
        const ang = a.loopT * Math.PI * 2, dir = Math.sign(w) || 1;
        a.x = s.at.x + Math.cos(ang) * rx; a.z = s.at.z + Math.sin(ang) * rz;
        a.yaw = Math.atan2(-Math.sin(ang) * rx * dir, Math.cos(ang) * rz * dir);
        a.speed = 0.9;   // the walk clip, slowed: a glide
        break;
      }
      case 'route': {   // Polish-1 (ambient only): a polyline walked or jogged back and forth at spec.speed m/s
        const pts = s.path;
        if (!s.len) { s.cum = [0]; for (let i = 1; i < pts.length; i++) s.cum.push(s.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)); s.len = s.cum[s.cum.length - 1]; }
        a.loopT = (a.loopT + (dt * s.speed) / s.len) % 2;
        const d = (a.loopT < 1 ? a.loopT : 2 - a.loopT) * s.len;
        let i = 0; while (i < pts.length - 2 && s.cum[i + 1] < d) i++;
        const k = (d - s.cum[i]) / Math.max(1e-6, s.cum[i + 1] - s.cum[i]);
        const nx = pts[i].x + (pts[i + 1].x - pts[i].x) * k, nz = pts[i].z + (pts[i + 1].z - pts[i].z) * k;
        if (Math.hypot(nx - a.x, nz - a.z) > 1e-4) a.yaw = Math.atan2(nx - a.x, nz - a.z);
        a.speed = s.speed; a.x = nx; a.z = nz;
        break;
      }
      case 'path': {
        const pts = s.path;
        a.loopT = (a.loopT + dt * 0.012) % 2;
        const u = a.loopT < 1 ? a.loopT : 2 - a.loopT;
        const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i;
        const nx = pts[i].x + (pts[i + 1].x - pts[i].x) * k, nz = pts[i].z + (pts[i + 1].z - pts[i].z) * k;
        if (Math.hypot(nx - a.x, nz - a.z) > 1e-3) a.yaw = Math.atan2(nx - a.x, nz - a.z);
        a.speed = Math.hypot(nx - a.x, nz - a.z) / dt;
        a.x = nx; a.z = nz;
        break;
      }
      default: a.speed = 0; a.yaw = a.home.yaw ?? a.yaw; break;
    }
  }

  #oneShot(a, dt) {
    if (!a.oneShot) return false;
    a.oneShot.t -= dt;
    a.speed = 0;
    if (a.oneShot.t <= 0) { const f = a.oneShot.done; a.oneShot = null; f?.(); }
    return true;
  }

  #clipFor(a, c, dt = 0) {
    const A = c.actions, sp = a.spec;
    let want;
    if (a.oneShot) want = a.oneShot.clip;
    else if (a.seated) want = 'idle';
    else if (sp.act === 'sit' && a.mode === 'home' && A.sit) want = 'sit';
    else if (sp.seat === 'carriage' && a.mode === 'home' && A.sit && this.#seat(a)) want = 'sit';
    else if (sp.act === 'skate' && A.balance) want = 'balance';
    else if (a.speed > 2.2) want = A.jog ? 'jog' : 'run';
    else if (a.speed > 0.15) want = A['phone-walk'] ? 'phone-walk' : (A['scan-walk'] && (a.k + Math.floor(this.tick / 600)) % 2) ? 'scan-walk' : 'walk';
    else if (a.stopped && A['catch-breath']) want = 'catch-breath';
    else want = (sp.look && A[sp.look]) ? sp.look : A.phone ? 'phone' : A.cook ? 'cook' : (A.look && sp.act !== 'work') ? 'look' : 'idle';
    // Polish-1: idle flavour (visual only: the clone's own timer, so it never touches the sim)
    if (!a.oneShot && dt) {
      if (c.flav) { c.flav.t -= dt; if (c.flav.t <= 0) { c.flav = null; c.flavT = 5 + ((a.k * 7 + this.tick) % 9); } }
      else if ((c.flavT -= dt) <= 0) {
        const list = sp.flavour || DEFAULT_FLAVOUR[a.model];
        const ok = list && (a.speed < 0.15 || sp.act === 'skate');
        if (ok) { const clip = list[(a.k + Math.floor(this.tick / 97)) % list.length]; if (A[clip]) c.flav = { clip, t: Math.min(4, A[clip].getClip().duration || 2) }; }
        c.flavT = 6 + ((a.k * 5 + this.tick) % 11);
      }
      if (c.flav) want = c.flav.clip;
    }
    if (!A[want]) want = (CLIP_ALT[want] || []).find((q) => A[q]) || (A.idle ? 'idle' : Object.keys(A)[0]);
    if (c.current !== want) {
      const next = c.actions[want];
      const prev = c.actions[c.current];
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.play();
      if (prev) prev.crossFadeTo(next, FADE, false);
      c.current = want;
    }
    const act = c.actions[want];
    if (want === 'walk' || want === 'phone-walk' || want === 'scan-walk') act.timeScale = a.spec.act === 'skate' ? 0.6 : Math.max(0.6, a.speed / WALK);
    else if (want === 'run') act.timeScale = Math.max(0.7, a.speed / RUN);
    else if (want === 'jog') act.timeScale = Math.max(0.7, a.speed / JOG);
    else act.timeScale = 1;
  }

  // ------------------------------------------------------------ pooling
  #assign(camera) {
    const G = this.G;
    const cam = camera.position;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pm);
    this.agents = this.agents.filter((a) => !a.dead);
    const cand = [];
    for (const list of [this.agents, this.extras]) for (const a of list) {
      if (!a.out || !this.gltf[a.model]) continue;
      const d = Math.hypot(a.x - cam.x, a.z - cam.z);
      const vip = a.spec.vip && !(this.lowVip && a.spec.vip > 1) && d < 75;
      if (d > this.range && !vip) continue;
      _sp.center.set(a.x, (a.y || 0) + 0.9, a.z); _sp.radius = 1.4;
      if (d > 4 && !_fr.intersectsSphere(_sp)) continue;
      // the scripted come first, then everyone in the game's roles, then the scenery (Polish-1)
      cand.push({ a, vip, d: d - (a.script ? 30 : 0) + (a.ambient ? 6 : 0) });
    }
    cand.sort((p, q) => p.d - q.d);
    const want = new Set();
    let animated = 0, frozen = 0;
    const per = {};
    // The triangle governor (main.js render) scales the people down when a frame nears the preset's cap. Since the
    // perf pass the world fits with room to spare, so it sits at 1 almost everywhere; PEOPLE_FLOOR is the few that
    // stay even at its 0.2 floor (people past lodDist are ~3k triangles, so it's 1–3% of the cap), without shadows
    // while the budget is squeezed.
    const bs = G.budgetScale ?? 1;
    const capA = Math.max(this.floorA, Math.round(this.capAnimated * bs)), capF = Math.floor(this.capFrozen * bs ** 2);
    const casters = bs < 0.6 ? Math.min(1, this.shadowCasters) : this.shadowCasters;
    for (const { a, vip } of cand) {
      per[a.model] = (per[a.model] || 0) + 1;
      if (per[a.model] > (this.poolMax[a.model] ?? this.pools[a.model].length)) continue;
      if (vip) { want.add(a); a.wantAnim = true; continue; }   // a showpiece's people: past the caps (Polish-1)
      if (animated < capA) { want.add(a); a.wantAnim = true; animated++; }
      else if (frozen < capF) { want.add(a); a.wantAnim = false; frozen++; }
    }
    for (const list of [this.agents, this.extras]) for (const a of list) if (a.clone && !want.has(a)) this.#release(a);
    let near = 0;
    for (const { a } of cand) {
      if (!want.has(a)) continue;
      if (!a.clone) {
        let c = this.pools[a.model].find((k) => !k.agent);
        if (!c && this.pools[a.model].length < (this.poolMax[a.model] ?? 0)) { c = this.#makeClone(a.model); this.pools[a.model].push(c); }
        if (!c) continue;
        c.agent = a; a.clone = c;
        c.holder.visible = true;
        c.current = null;
        for (const act of Object.values(c.actions)) act.stop();
        const t = a.tint;
        for (const m of c.mats) t ? m.color.setRGB(t[0], t[1], t[2]) : m.color.setRGB(1, 1, 1);
        c.flav = null; c.flavT = 2 + (a.k % 5);
        c.animDt = 0; c.dogDt = 0;   // Land/perf (pose())
        this.#dress(c, a);
      }
      a.clone.animated = a.wantAnim;
      const cast = near++ < casters;
      if (a.clone.cast !== cast) { a.clone.cast = cast; a.clone.root.traverse((o) => { if (o.isMesh) o.castShadow = cast; }); }
    }
  }

  #release(a) {
    const c = a.clone;
    if (!c) return;
    c.agent = null; a.clone = null;
    c.holder.visible = false;
  }

  #dress(c, a) {
    const has = MODEL_HAS[a.model] || [];
    const list = (a.spec.acc || []).filter((q) => !has.includes(q) && !(q === 'slice' && a.spec.holds && !a.holds));   // Fixes-3: a dropped slice leaves his hand
    if (a.holds && !list.includes('slice')) list.push('slice');
    const key = list.join(',');
    if (c.accKey === key) return;
    c.accKey = key;
    for (const h of Object.values(c.hold)) while (h.children.length) h.remove(h.children[0]);
    for (const name of list) {
      const spec = this.acc[name];
      if (!spec) continue;
      const h = c.hold[spec.bone];
      if (!h) continue;
      let m = spec.make();
      // fix-19: the anchovy fan holds the real slice model in its anchovy texture (it was a plain yellow cone)
      if (name === 'slice' && a.holds === 'slice-anchovy' && this.G.items?.anchovyMap) { m = this.G.items.makeMesh('slice-anchovy'); m.scale.setScalar(ANCHOVY_PROP.scale); m.position.set(...ANCHOVY_PROP.at); m.rotation.set(...ANCHOVY_PROP.rot); }
      h.add(m);
    }
  }

  /** Show or hide a held item on an agent (slice eaten, dropped). */
  redress(a) { if (a.clone) { a.clone.accKey = ''; this.#dress(a.clone, a); } }

  stats() { return { agents: this.agents.length, out: this.agents.filter((a) => a.out).length, extras: this.extras.filter((a) => a.out).length, clones: Object.values(this.pools).reduce((n, p) => n + p.length, 0), ...this.drawn }; }
}

// Polish-1: idle flavour clips per model (when a spec gives none), the carriage box (from the carriage's origin,
// along its facing), dog coats
const DEFAULT_FLAVOUR = {
  'human-tourist': ['gawk', 'wave'], 'human-child': ['cheer', 'jump', 'skip'], 'human-chess-player': ['think', 'argue'],
  'human-halal-cart-man': ['call', 'wave', 'cook'], 'human-pizza-counterman': ['shrug', 'scold'], 'human-dog-walker': ['pulled', 'pickup'],
  'human-carriage-driver': ['bow'], 'human-dolores': ['throw'], 'human-jogger': ['warmup'], 'human-teen-skater': ['wobble'],
  'human-birder': ['look'], 'human-businessperson': ['phone'],
};
const CARRIAGE_BOX = { fwd: 0.9, up: 1.25 };
const ANCHOVY_PROP = { scale: 1, at: [0, 0.06, 0.06], rot: [1.2, 0, 0] };   // fix-19: in the right hand's bone space
const PEOPLE_FLOOR = { high: 4, medium: 3, low: 2 };   // perf pass: was 8 / 6 / 3, set while the world alone was over the caps
const DOG_TINTS = [{}, { color: 0xd8c8b0 }, { color: 0x8a6a4a }, {}, { color: 0x404048 }];

function turnTo(a, b, rate) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + Math.sign(d) * Math.min(Math.abs(d), rate);
}

export function superEllipse(cx, cz, rx, rz, exp, t) {
  const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  const k = 2 / exp;
  return { x: cx + rx * Math.sign(c) * Math.abs(c) ** k, z: cz + rz * Math.sign(s) * Math.abs(s) ** k };
}

// role accessories: small code meshes on a bone holder (metres; the bone's local axes)
function makeAccessories() {
  const M = (c, extra = {}) => ruleMaterial({ color: c, ...extra });
  const dark = M(0x2a2a30), black = M(0x161616), white = M(0xf4f0e6), red = M(0xc4302b), tan = M(0xc8a070), gold = M(0xd4a02a);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; return m; };
  // perf pass: a two-part accessory is one vertex-coloured mesh (one draw call, not two)
  const vcol = ruleMaterial({ vertexColors: true });
  const grp = (...ms) => {
    const geos = ms.map((m) => {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      g.deleteAttribute('uv');
      const c = m.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    const out = new THREE.Mesh(mergeGeometries(geos, false), vcol);
    out.castShadow = true;
    return out;
  };
  return {
    phone: { bone: 'RightHand', make: () => mesh(new THREE.BoxGeometry(0.07, 0.14, 0.012), dark, 0, 0.08, 0.03) },
    selfie: { bone: 'RightHand', make: () => grp(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6), dark, 0, 0.3, 0), mesh(new THREE.BoxGeometry(0.07, 0.14, 0.012), dark, 0, 0.6, 0)) },
    camera: { bone: 'RightHand', make: () => grp(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), black, 0, 0.06, 0.04), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), dark, 0, 0.06, 0.09, Math.PI / 2)) },
    binoculars: { bone: 'Spine02', make: () => grp(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), black, -0.03, 0.05, 0.14, Math.PI / 2), mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), black, 0.03, 0.05, 0.14, Math.PI / 2)) },
    tophat: { bone: 'Head', make: () => grp(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 14), black, 0, 0.27, 0), mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 16), black, 0, 0.19, 0)) },
    headband: { bone: 'Head', make: () => mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), red, 0, 0.13, 0, Math.PI / 2) },
    paperhat: { bone: 'Head', make: () => mesh(new THREE.BoxGeometry(0.2, 0.07, 0.12), white, 0, 0.22, 0) },
    hardhat: { bone: 'Head', make: () => mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf2c230), 0, 0.17, 0) },
    cap: { bone: 'Head', make: () => grp(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), M(0x2a3a5a), 0, 0.2, 0), mesh(new THREE.BoxGeometry(0.14, 0.01, 0.08), M(0x1a2440), 0, 0.18, 0.1)) },
    helmet: { bone: 'Head', make: () => mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x3aa0d8), 0, 0.16, 0) },
    headset: { bone: 'Head', make: () => mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), black, 0, 0.12, 0, 0, Math.PI / 2, 0) },
    beret: { bone: 'Head', make: () => mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.04, 14), M(0x8e1c2c), 0.02, 0.21, 0, 0, 0, 0.2) },
    felthat: { bone: 'Head', make: () => grp(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 14), M(0x6a3c5a), 0, 0.22, 0), mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 16), M(0x6a3c5a), 0, 0.17, 0)) },
    shawl: { bone: 'Spine02', make: () => mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14), M(0xb07ab0), 0, 0.12, 0, Math.PI / 2) },
    veil: { bone: 'Head', make: () => mesh(new THREE.ConeGeometry(0.16, 0.42, 12, 1, true), M(0xffffff, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }), 0, 0.02, -0.06, 0.25) },
    bouquet: { bone: 'RightHand', make: () => grp(mesh(new THREE.SphereGeometry(0.07, 10, 8), M(0xf2a0b8), 0, 0.1, 0.03), mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.12, 6), M(0x4a7a3a), 0, 0.02, 0.03)) },
    basket: { bone: 'LeftHand', make: () => mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.16, 14), tan, 0, -0.06, 0.06) },
    sax: { bone: 'RightHand', make: () => mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.4, 10), gold, 0, 0.12, 0.08, 0.3) },
    guitar: { bone: 'Spine02', make: () => grp(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), M(0x8a5a2a), 0.05, -0.08, 0.16, Math.PI / 2), mesh(new THREE.BoxGeometry(0.05, 0.45, 0.03), M(0x5a3a1a), 0.05, 0.25, 0.16)) },
    apron: { bone: 'Spine02', make: () => mesh(new THREE.BoxGeometry(0.3, 0.45, 0.02), white, 0, -0.3, 0.13) },
    remote: { bone: 'RightHand', make: () => mesh(new THREE.BoxGeometry(0.1, 0.03, 0.14), M(0x3a5ab0), 0, 0.05, 0.04) },
    leashes: { bone: 'RightHand', make: () => mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.4, 4), M(0xc4302b), 0, -0.6, 0.35, 0.6) },
    box: { bone: 'Spine02', make: () => mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), M(0xd9b07a), 0, 0.05, 0.3) },
    slice: { bone: 'RightHand', make: () => mesh(new THREE.ConeGeometry(0.08, 0.22, 3), M(0xf2c230), 0, 0.12, 0.04, 0, 0, 0) },
    capbraid: { bone: 'Head', make: () => mesh(new THREE.TorusGeometry(0.105, 0.012, 6, 18), gold, 0, 0.19, 0, Math.PI / 2) },
    clipboard: { bone: 'LeftHand', make: () => grp(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.015), M(0x8a5e30), 0, 0.12, 0.06), mesh(new THREE.BoxGeometry(0.18, 0.24, 0.005), white, 0, 0.12, 0.07)) },
    spraytank: { bone: 'Spine02', make: () => grp(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.45, 12), M(0xd8dde2), 0, 0, -0.22), mesh(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xd8dde2), 0, 0.22, -0.22)) },
    wand: { bone: 'RightHand', make: () => mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), M(0x3a3a3a), 0, 0.1, 0.25, Math.PI / 2) },
    // Polish-1: the wedding's buttonhole (the groom) and corsages (the guests)
    buttonhole: { bone: 'Spine02', make: () => grp(mesh(new THREE.SphereGeometry(0.035, 8, 6), white, -0.09, 0.12, 0.14), mesh(new THREE.SphereGeometry(0.02, 6, 4), M(0x4a7a3a), -0.07, 0.1, 0.14)) },
    tails: { bone: 'Spine02', make: () => mesh(new THREE.BoxGeometry(0.34, 0.5, 0.03), M(0x1c1c22), 0, -0.42, -0.12, 0.12) },
    corsage: { bone: 'Spine02', make: () => mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0xf2a0b8), 0.09, 0.12, 0.13) },
    'sunglasses-up': { bone: 'Head', make: () => mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), black, 0, 0.17, 0.08) },
  };
}
