// The park's crowds ("The park's crews"): about 660 animals, every one
// simulated cheaply with a seeded state machine (idle, wander, scatter, greet),
// decisions round-robin (a quarter per update) so replays repeat and every
// preset simulates the same animals. Only the nearest are drawn, up to the
// preset's caps (full / LOD / songbirds / horses): each model has a
// full-detail and an LOD InstancedMesh refilled every update. Pigeons and
// squirrels carry a per-instance morph layer (texture array); everything has a
// per-instance tint. Gang pigeons wear their gang's hat.
//
// Before a crew joins its members are wary: they scatter, chitter, hiss or honk
// when Gus comes close. Once it joins they greet him: hop over, chatter hello.

import * as THREE from 'three';
import { CROWD_HAUNTS, CREW, BARKS, CHARACTERS, GREETS } from '../data/crews.js';
import { LEAD_HINTS } from '../data/lead-hints.js';   // #24
import { GANG_MIX, PIGEON_LAYERS, SONGBIRD_TINTS, LOOKS, SPECIES } from '../data/looks.js';
import { rngFor } from '../core/rng.js';
import { pointInPoly } from '../core/geo.js';
import { loadMorphArray, patchMorphArray } from '../gfx/morphs.js';
import { addShaderPatch } from '../anim/shader-patch.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { patch as dogGait, instanceAttr as dogGaitAttr, DogGait } from '../anim/dog-gait.js';   // batch-3 (#11)

// crowd group → crew, models, behaviour
const GROUPS = {
  squirrels: { crew: 'squirrels', models: ['squirrel'], lod: 'squirrel-lod', phases: ['morning', 'afternoon', 'dusk'], speed: 2.2, hop: 0.12, morph: 'squirrel', sound: 'squirrel-chatter', bark: 'squirrels' },
  ducks: { crew: 'ducks', models: ['duck', 'duck-hen', 'duck-wood', 'duck-shoveler', 'duck-bufflehead'], weights: [30, 25, 15, 12, 12], phases: ['morning', 'afternoon', 'dusk'], rare: ['duck-white', 'duck-stranger'], lodOf: (m) => m + '-lod', speed: 0.9, swim: true, sound: 'duck-quack-mallard', bark: 'ducks' },
  crows: { crew: 'crows', models: ['crow'], lod: 'crow-lod', phases: ['morning', 'afternoon', 'dusk'], speed: 1.4, hop: 0.2, fly: true, sound: 'crow-caw', bark: 'crows' },
  raccoons: { crew: 'raccoons', models: ['raccoon-scurry'], lod: 'raccoon-scurry-lod', speed: 2, phases: ['dusk', 'night'], sound: 'raccoon-chitter', bark: 'raccoons' },
  rats: { crew: 'rats', models: ['rat'], lod: 'rat-lod', speed: 2.4, sound: 'rat-squeak', bark: 'rats' },
  turtles: { crew: 'turtles', models: ['turtle'], lod: 'turtle-lod', speed: 0.15, bark: 'turtles' },
  swells: { crew: 'swells', models: ['pigeon-plain'], lod: 'pigeon-plain-lod', speed: 1.1, hop: 0.15, fly: true, morph: 'pigeon-plain', gang: 'swells', hat: 'tophat', sound: 'coo', bark: 'swells' },
  choir: { crew: 'choir', models: ['pigeon-plain'], lod: 'pigeon-plain-lod', speed: 1.1, hop: 0.15, fly: true, morph: 'pigeon-plain', gang: 'choir', hat: 'beret', sound: 'coo', bark: 'pigeon' },
  racers: { crew: 'racers', models: ['pigeon-plain'], lod: 'pigeon-plain-lod', speed: 1.4, hop: 0.15, fly: true, morph: 'pigeon-plain', gang: 'racers', hat: 'sweatband', sound: 'coo', bark: 'pigeon' },
  meermob: { crew: 'meermob', models: ['pigeon-plain'], lod: 'pigeon-plain-lod', speed: 1.1, hop: 0.15, fly: true, morph: 'pigeon-plain', gang: 'meermob', hat: 'bandana', sound: 'coo', bark: 'pigeon' },
  dogs: { crew: 'biscuit', models: ['dog', 'dog-poodle', 'dog-dachshund'], weights: [3, 3, 3], lod: 'dog-lod', speed: 2.5, phases: ['morning', 'afternoon', 'dusk'], sound: 'dog-bark', bark: 'dogs', scaleRange: [0.55, 0.75] },
  owls: { crew: 'strix', models: ['owl'], speed: 0, phases: ['night'], sound: 'owl-hoot' },
  hawks: { crew: 'rhoda', models: ['hawk-perch'], speed: 0, phases: ['morning', 'afternoon', 'dusk'], sound: 'hawk-screech' },
  cats: { crew: 'cats', models: ['cat-sit', 'cat'], weights: [3, 2], speed: 1.3, sound: 'cat-hiss', bark: 'cats', tints: [[0.9, 0.88, 0.85], [1.3, 0.85, 0.5], [0.45, 0.45, 0.48], [1, 1, 1], [0.7, 0.6, 0.5]] },
  horses: { crew: 'horses', models: ['horse'], speed: 0, phases: ['morning', 'afternoon', 'dusk'], sound: 'horse-whinny', bark: 'horses', tints: [[1.05, 1.05, 1.05], [0.7, 0.5, 0.35], [0.95, 0.6, 0.4], [0.5, 0.42, 0.38]] },
  songbirds: { crew: 'songbirds', models: ['songbird'], speed: 1.2, hop: 0.1, fly: true, phases: ['morning', 'afternoon', 'dusk'], sound: 'songbird-chatter', bark: 'songbirds', songbird: true },
  geese: { crew: 'geese', models: ['goose'], lod: 'goose-lod', speed: 0.8, swim: 'maybe', phases: ['morning', 'afternoon', 'dusk'], sound: 'goose-honk', bark: 'geese' },
  herons: { crew: 'geese', models: ['heron', 'night-heron'], weights: [1, 2], speed: 0.4, phases: ['morning', 'afternoon', 'dusk'], sound: 'heron-croak' },
};
const DAY = ['morning', 'afternoon', 'dusk'];
const WARY_R = 2.6, GREET_R = 6;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere();
const _cs = { y: 0, kind: 'terrain', item: null };   // batch-3

export class Crowds {
  constructor(G, preset) {
    this.G = G;
    this.caps = preset.crowd;
    this.fullDist = { high: 32, medium: 26, low: 16 }[preset.id] || 28;
    // a triangle budget for full-detail animals (they cast shadows on High, doubling them)
    this.fullBudget = { high: 110000, medium: 70000, low: 20000 }[preset.id] || 70000;
    this.shadows = preset.id === 'high';
    this.group = new THREE.Group();
    this.group.name = 'crowds';
    this.animals = [];
    this.meshes = {};     // model → { full, lod, cap, lodCap }
    this.rr = 0;
    this.barkT = 4;
    this.soundT = {};
    this.drawn = { full: 0, lod: 0, songbirds: 0, horses: 0, byModel: {} };
    this.textureSize = preset.id === 'high' ? 1024 : 512;
  }

  // ------------------------------------------------------------ build
  async build() {
    const G = this.G;
    this.#populate();
    // models
    const want = new Set();
    for (const a of this.animals) { want.add(a.model); if (a.lod) want.add(a.lod); }
    const baked = {};
    await Promise.all([...want].map(async (id) => { baked[id] = await G.registry.baked(id); }));
    this.morphs = {};
    for (const name of ['pigeon-plain', 'squirrel']) this.morphs[name] = await loadMorphArray(name, this.textureSize);
    // per-model counts
    const count = {}, lodCount = {};
    for (const a of this.animals) { count[a.model] = (count[a.model] || 0) + 1; if (a.lod) lodCount[a.lod] = (lodCount[a.lod] || 0) + 1; }
    const capFor = (a) => (a.group === 'songbirds' ? this.caps.songbirds : a.group === 'horses' ? this.caps.horses : this.caps.full);
    for (const id of Object.keys(count)) {
      const b = baked[id];
      if (!b) continue;
      const sample = this.animals.find((a) => a.model === id);
      const cap = Math.min(count[id], capFor(sample));
      this.meshes[id] = { full: this.#mesh(id, b, cap, true, sample), cap };
    }
    for (const id of Object.keys(lodCount)) {
      const b = baked[id];
      if (!b) continue;
      const cap = Math.min(lodCount[id], this.caps.lod);
      this.meshes[id] = { full: this.#mesh(id, b, cap, false, null), cap };
    }
    this.#hats(baked['pigeon-plain']);
    this.#lodTints();
  }

  #lodTints() {
    // pigeon LOD tints from the morph averages
    const avg = this.morphs?.['pigeon-plain']?.averages;
    for (const a of this.animals) {
      if (a.layer != null && avg && a.morph === 'pigeon-plain') {
        const base = avg[0], c = avg[a.layer];
        a.lodTint = [c[0] / base[0], c[1] / base[1], c[2] / base[2]].map((v) => Math.min(2, v));
      }
    }
  }

  /** Start every animal again from its seed (fixtures and replays start identical). */
  reseed() {
    this.animals = [];
    this.#populate();
    this.#lodTints();
    this.rr = 0; this.barkT = 4; this.soundT = {};
  }

  #mesh(id, b, cap, full, sample) {
    const mat = b.makeMaterial();
    let geo = b.geometry;
    const morph = full && sample?.morph ? this.morphs[sample.morph] : null;
    // batch-3 (#11): full-detail dogs trot (a per-instance phase); their own copy of the geometry
    if (full && GROUPS.dogs.models.includes(id)) { geo = geo.clone(); dogGait(mat, geo, { instanced: true }); dogGaitAttr(geo, cap); }
    if (morph) {
      geo = geo.clone();
      geo.setAttribute('aLayer', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
      if (sample.morph === 'pigeon-plain') geo.setAttribute('aSheen', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage));
      patchMorphArray(mat, morph.texture, { sheen: sample.morph === 'pigeon-plain' });
    }
    if (full && sample?.group === 'songbirds') {
      geo = geo.clone();
      geo.setAttribute('aHead', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aBreast', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage));
      const bb = b.bounds;
      addShaderPatch(mat, {
        key: 'songbird',
        uniforms: { uHeadY: { value: bb.min.y + (bb.max.y - bb.min.y) * 0.68 }, uFrontZ: { value: bb.min.z + (bb.max.z - bb.min.z) * 0.55 } },
        vertexHeader: 'attribute vec3 aHead; attribute vec3 aBreast; varying vec3 vHead; varying vec3 vBreast; varying vec3 vLocal;',
        vertex: 'vHead = aHead; vBreast = aBreast; vLocal = position;',
        fragmentHeader: 'uniform float uHeadY; uniform float uFrontZ; varying vec3 vHead; varying vec3 vBreast; varying vec3 vLocal;',
        fragmentAfterMap: `
          float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          vec3 g = vec3(lum) * 1.25;
          float head = smoothstep(uHeadY - 0.01, uHeadY + 0.005, vLocal.y);
          float breast = (1.0 - head) * smoothstep(uFrontZ - 0.01, uFrontZ + 0.01, vLocal.z);
          vec3 tint = mix(vec3(1.0), vHead, head);
          tint = mix(tint, vBreast, breast);
          diffuseColor.rgb = g * tint;`,
      });
    }
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    if (mat.userData.gaitDepth) mesh.customDepthMaterial = mat.userData.gaitDepth;   // batch-3 (#11): the shadow trots too
    mesh.name = (full ? 'crowd:' : 'crowd-lod:') + id;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = full && this.shadows;
    mesh.userData.tris = (b.geometry.index ? b.geometry.index.count : b.geometry.attributes.position.count) / 3;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.userData.headPoint = headPoint(b);
    this.group.add(mesh);
    return mesh;
  }

  #hats(baked) {
    const mk = (geo, color) => {
      const m = new THREE.InstancedMesh(geo, ruleMaterial({ color }), 40);
      m.count = 0; m.frustumCulled = false; m.castShadow = true;
      this.group.add(m);
      return m;
    };
    this.hats = {
      tophat: mk(mergeHat([new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10).translate(0, 0.022, 0), new THREE.CylinderGeometry(0.034, 0.034, 0.004, 12)]), 0x161616),
      beret: mk(new THREE.CylinderGeometry(0.03, 0.026, 0.012, 12).translate(0, 0.006, 0), 0xc4302b),
      sweatband: mk(new THREE.TorusGeometry(0.026, 0.006, 5, 12).rotateX(Math.PI / 2), 0x2fa39a),
      bandana: mk(new THREE.TorusGeometry(0.034, 0.008, 5, 12).rotateX(Math.PI / 2), 0xc4302b),
    };
    this.hatPoint = baked ? headPoint(baked) : new THREE.Vector3(0, 0.29, 0.1);
    // batch-2 (#14): hats that sit ON the head (top hat, beret) go on the crown, the highest point over the head point;
    // headPoint is an average of the top-front vertices, ~2 cm under the crown on the pigeon, so the hats sat inside the head
    const K = baked ? crownPoint(baked, this.hatPoint) : this.hatPoint;
    this.crown = K;
    // each hat rests where the head is as wide as the hat (top hat crown r 2 cm, beret 2.6 cm)
    this.seat = baked ? { tophat: seatY(baked, K, 0.02), beret: seatY(baked, K, 0.026) } : { tophat: K.y, beret: K.y };
  }

  #populate() {
    const G = this.G;
    const water = {};
    for (const w of G.terrain.shapes.water) water[w.id] = w;
    let idx = 0;
    for (const [group, haunts] of Object.entries(CROWD_HAUNTS)) {
      const gdef = GROUPS[group];
      if (!gdef) continue;
      let k = 0;
      for (const h of haunts) {
        if (h.kind !== 'water' && h.kind !== 'roof') { const hx = h.x ?? (h.a.x + h.b.x) / 2, hz = h.z ?? (h.a.z + h.b.z) / 2, hr = (h.r ?? h.rMax ?? Math.hypot(h.b.x - h.a.x, h.b.z - h.a.z) / 2) + 6; G.collision.warmWalk(hx, hz, hr); }   // batch-3 (review)
        for (let i = 0; i < h.n; i++) {
          const rnd = rngFor(`crowd:${group}:${k++}`);
          let x, z, y, onWater = null;
          if (h.kind === 'line') {
            const t = h.n > 1 ? i / (h.n - 1) : 0.5;
            x = h.a.x + (h.b.x - h.a.x) * t; z = h.a.z + (h.b.z - h.a.z) * t;
            ({ x, z } = landSpot(G, x, z));   // batch-3 (#1)
          } else if (h.kind === 'ring') {
            const a = rnd() * 6.28, r = h.rMin + rnd() * (h.rMax - h.rMin);
            x = h.x + Math.cos(a) * r; z = h.z + Math.sin(a) * r;
            ({ x, z } = landSpot(G, x, z));
          } else if (h.kind === 'water') {
            const w = water[h.water];
            let tries = 0;
            do { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * h.r; x = h.x + Math.cos(a) * r; z = h.z + Math.sin(a) * r; tries++; } while (w && !pointInPoly(x, z, w.poly) && tries < 40);
            if (w && pointInPoly(x, z, w.poly)) onWater = w;
          } else if (h.kind === 'roof' && h.a) {
            // fix-36: a row along a ledge (the starlings on the museum's ledge, facing the park)
            const t = h.n > 1 ? i / (h.n - 1) : 0.5;
            x = h.a.x + (h.b.x - h.a.x) * t + (rnd() - 0.5) * 0.15; z = h.a.z + (h.b.z - h.a.z) * t + (rnd() - 0.5) * 0.6;
          } else {
            const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (h.r || 1);
            x = h.x + Math.cos(a) * r; z = h.z + Math.sin(a) * r;
            // ground animals keep out of the water, walls, trunks and rocks (batch-3 #1, #7: the nearest clear spot to where it
            // was drawn; it used to go back to the haunt's centre, which could be in the water too). No random draw.
            if (h.kind !== 'roof') ({ x, z } = landSpot(G, x, z));
          }
          // geese and herons on a lawn by the water may still be swimming
          if (gdef.swim === true && !onWater) continue;
          // batch-2 (#22): no standing look-alike within ~4 m of a named animal of the same species (a crowd horse stood
          // 1.3 m from Dapple, inside her talk radius, and read as a second Dapple; Clementine and Big Ben had one each).
          // Only crowds that never move (horses, owls, hawks): the others wander off, and skipping theirs emptied the
          // Elders' rock and half the Plaza. Each animal's random stream is keyed by its own slot (k), so skipping a slot
          // moves nobody else; crowds feed no gameplay.
          if (gdef.speed === 0 && nearNamed(gdef.models[0], x, z)) { this.skipped = (this.skipped || 0) + 1; continue; }
          // model
          let model = gdef.models[0];
          if (gdef.weights) {
            const tot = gdef.weights.reduce((p, q) => p + q, 0);
            let r = rnd() * tot;
            for (let j = 0; j < gdef.models.length; j++) { r -= gdef.weights[j]; if (r <= 0) { model = gdef.models[j]; break; } }
          }
          if (gdef.rare && group === 'ducks' && k === 3) model = gdef.rare[0];
          if (gdef.rare && group === 'ducks' && k === 17) model = gdef.rare[1];
          if (group === 'herons' && h.night) model = 'night-heron';
          if (group === 'herons' && !h.night) model = 'heron';
          const lod = gdef.lodOf ? gdef.lodOf(model) : gdef.lod || null;
          if (h.kind === 'roof') y = G.collision.surface(x, z, 400).y;
          else if (onWater) y = onWater.level - (group === 'geese' ? 0.18 : 0.12);   // swimmers sit in the water
          else y = G.collision.walkFloor(x, z) + (h.y || 0);   // batch-3: the same floor every step uses (terrain, kerb, deck)
          const a = {
            unlessSpike: h.unlessSpike || null,   // fix-36: away while that site is spiked
            i: idx++, group, crew: gdef.crew, model, lod, x, z, y, home: { x: h.kind === 'line' || h.kind === 'ring' || h.a ? x : h.x, z: h.kind === 'line' || h.kind === 'ring' || h.a ? z : h.z, r: h.kind === 'line' ? 1.5 : h.kind === 'ring' ? 1.2 : h.a ? 0.8 : (h.r || 2) }, kind: h.kind, water: onWater,
            yaw: h.yaw ?? rnd() * 6.28, state: 'idle', t: rnd() * 4, tx: x, tz: z, speed: 0, hopT: 0, phase: rnd() * 6.28, rnd,
            phases: h.night ? ['night', 'dusk'] : gdef.phases || null, scale: 1, layer: null, sheen: [1, 1, 1], tint: [1, 1, 1], yBase: y, air: 0,
            yOff: h.kind === 'roof' || onWater ? 0 : h.y || 0,   // batch-3: perched this far above its ground (the owl)
          };
          // looks
          if (gdef.morph === 'pigeon-plain') {
            a.morph = 'pigeon-plain';
            a.layer = pickLayer(GANG_MIX[gdef.gang] || GANG_MIX.strays, rnd);
            a.sheen = [[0.6, 1.2, 1.15], [1.0, 1.25, 0.8], [1.25, 0.95, 0.9], [1, 1, 1]][Math.floor(rnd() * 4)];
          } else if (gdef.morph === 'squirrel') {
            a.morph = 'squirrel';
            const r = rnd();
            a.layer = r < 0.62 ? 0 : r < 0.93 ? 1 : 2;
          }
          if (group === 'squirrels' && k === 40) a.layer = 3;   // the one rare white squirrel
          if (gdef.tints) a.tint = gdef.tints[Math.floor(rnd() * gdef.tints.length)];
          if (gdef.songbird) {
            const kinds = Object.keys(SONGBIRD_TINTS);
            const sk = h.kind === 'roof' ? 'starling' : h.kind === 'trees' ? ['bluejay', 'cardinal', 'warbler', 'sparrow', 'robin'][Math.floor(rnd() * 5)] : ['sparrow', 'sparrow', 'robin', 'starling'][Math.floor(rnd() * 4)];
            const T = SONGBIRD_TINTS[sk] || SONGBIRD_TINTS[kinds[0]];
            // fix-35: the instance colour (the back) multiplies the whole bird after the shader paints the head and breast, so
            // those are given divided by it (a blue jay's white breast came out blue)
            a.tint = T.back; a.head = T.head.map((v, i) => v / T.back[i]); a.breast = T.breast.map((v, i) => v / T.back[i]);
          }
          if (gdef.scaleRange) a.scale = gdef.scaleRange[0] + rnd() * (gdef.scaleRange[1] - gdef.scaleRange[0]);
          else a.scale = 0.92 + rnd() * 0.16;
          this.animals.push(a);
        }
      }
    }
  }

  // ------------------------------------------------------------ queries
  friendly(crew) { return this.G.state.crews.includes(crew); }
  setFriendly(crew) {
    // the crowd of that species cheers across the park
    for (const a of this.animals) if (a.crew === crew && a.state !== 'away') { a.state = 'cheer'; a.t = 1.5 + a.rnd() * 1.5; }
  }
  active(a) { return (!a.phases || a.phases.includes(this.G.state.phase)) && !(a.unlessSpike && (this.G.state.spikes?.[a.unlessSpike] === 'installed' || this.G.holdSitters?.[a.unlessSpike])); }

  counts() {
    const out = {};
    for (const a of this.animals) out[a.group] = (out[a.group] || 0) + 1;
    return out;
  }

  // ------------------------------------------------------------ the fixed update
  update(dt, camera) {
    const G = this.G, g = G.gus.position;
    const n = this.animals.length;
    const quarter = Math.ceil(n / 4);
    const gusLow = G.gus.mode !== 'fly' || g.y - G.terrain.heightAt(g.x, g.z) < 1.5;
    // decisions: a quarter a frame
    for (let k = 0; k < quarter; k++) {
      const a = this.animals[(this.rr + k) % n];
      this.#decide(a, dt * 4, g, gusLow);
    }
    this.rr = (this.rr + quarter) % n;
    // motion: every animal, every frame
    for (const a of this.animals) this.#move(a, dt);
    this.G.collision.warmStep(2);   // batch-3 (review): the walk tiles round the haunts, built a couple per update
    // ambient barks and sounds
    this.barkT -= dt;
    if (this.barkT <= 0) { this.barkT = 5 + ((G.state.time * 7) % 5); this.#bark(g); }
    this.#greet(g);
    // Land/perf: drawing (nearest-N, instance matrices) is visual only: once per drawn frame (draw(), from main.js
    // render()), not once per update (two or three updates a frame when the frame rate drops)
    this.drawCam = camera; this.drawDirty = true;
  }

  /** Land/perf: refill the instanced meshes if anything moved since the last drawn frame. */
  draw() {
    if (!this.drawDirty || !this.drawCam) return;
    this.drawDirty = false;
    this.#draw(this.drawCam);
  }

  #decide(a, dt, g, gusLow) {
    if (!this.active(a)) { a.state = 'away'; return; }
    if (a.state === 'away') a.state = 'idle';
    // batch-3: standing on the water or inside something built after it spawned (a scheme's table, a stall): to clear ground
    if (!a.water && a.kind !== 'roof' && this.G.collision.walkBlocked(a.x, a.z)) {
      const q = landSpot(this.G, a.x, a.z);
      a.x = a.tx = q.x; a.z = a.tz = q.z; a.yBase = this.G.collision.walkFloor(q.x, q.z) + a.yOff;
    }
    const dx = a.x - g.x, dz = a.z - g.z, d = Math.hypot(dx, dz);
    const friendly = this.friendly(a.crew);
    const gdef = GROUPS[a.group];
    a.t -= dt;
    if (a.state === 'cheer') { if (a.t <= 0) a.state = 'idle'; return; }
    if (gdef.speed === 0) { a.state = 'idle'; return; }
    if (!friendly && gusLow && d < WARY_R && a.state !== 'scatter') {
      a.state = 'scatter';
      const l = d || 1;
      const run = 3 + a.rnd() * 3;
      a.tx = a.x + (dx / l) * run; a.tz = a.z + (dz / l) * run;
      this.#keepTarget(a);   // batch-3 (#1, #7): not onto the water, into a wall or off a roof
      this.#leadHint(a);   // #24: now and then, who runs this crew and where
      a.t = 1.2 + a.rnd() * 1.4;
      if (gdef.fly) a.air = 1;
      this.#sound(a, gdef.sound);
      return;
    }
    if (friendly && gusLow && d < GREET_R && d > 1.2 && a.state !== 'greet' && a.rnd() < 0.15 && this.G.gus.speed < 3) {
      a.state = 'greet';
      a.tx = g.x + (dx / d) * 1.1; a.tz = g.z + (dz / d) * 1.1;
      this.#keepTarget(a);
      a.t = 3;
      return;
    }
    if (a.t > 0) return;
    if (a.state === 'scatter' || a.state === 'greet') { a.state = 'idle'; a.t = 1 + a.rnd() * 3; return; }
    // idle ↔ wander inside the haunt
    if (a.state === 'idle' && a.rnd() < 0.55) {
      const ang = a.rnd() * 6.28, r = Math.sqrt(a.rnd()) * a.home.r;
      a.tx = a.home.x + Math.cos(ang) * r; a.tz = a.home.z + Math.sin(ang) * r;
      this.#keepTarget(a);
      a.state = 'wander';
      a.t = 3 + a.rnd() * 5;
    } else { a.state = 'idle'; a.t = 1.5 + a.rnd() * 4; }
  }

  #move(a, dt) {
    if (a.state === 'away') return;
    const gdef = GROUPS[a.group];
    a.phase += dt * 6;
    a.gait?.step(dt, a.speed);   // batch-3 (#11): visual only (made when a dog is first drawn)
    let sp = 0;
    if (a.state === 'wander') sp = gdef.speed * 0.5;
    else if (a.state === 'scatter') sp = gdef.speed * (gdef.fly ? 2.6 : 1.8);
    else if (a.state === 'greet') sp = gdef.speed * 0.9;
    if (sp > 0) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if (d > 0.08) {
        const step = Math.min(d, sp * dt);
        const nx = a.x + (dx / d) * step, nz = a.z + (dz / d) * step;
        if (a.water) { if (pointInPoly(nx, nz, a.water.poly)) { a.x = nx; a.z = nz; } }
        else if (this.#walkable(a, nx, nz)) {
          a.x = nx; a.z = nz;
          // batch-3 (#7): the height every step (the terrain and the bridge decks; it was fixed where it spawned)
          if (a.kind !== 'roof') a.yBase = this.G.collision.walkFloor(nx, nz, a.yBase - a.yOff) + a.yOff;
        } else { a.tx = a.x; a.tz = a.z; }   // the water's edge, a wall, a rock, a roof's edge: stop there
        const want = Math.atan2(dx, dz);
        a.yaw += Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)) * Math.min(1, dt * 8);
        a.speed = sp;
      } else a.speed = 0;
    } else a.speed = 0;
    if (a.air > 0) a.air = Math.max(0, a.air - dt * 0.9);
  }

  /** Batch-3: may a land animal step onto (x, z)? Off the water and out of solids (collision.walkBlocked's cached cells);
   *  a roof animal stays on its roof (the surface under it within a step of where it stands). */
  #walkable(a, x, z) {
    const C = this.G.collision;
    if (a.kind === 'roof') return Math.abs(C.surface(x, z, a.yBase + 0.3, _cs).y - a.yBase) < 0.3;
    return !C.walkBlocked(x, z);
  }

  /** Batch-3: a target that can't be walked to (the water, a solid, off a roof) is pulled back toward the animal (halves,
   *  three tries) or dropped. No random draw. */
  #keepTarget(a) {
    if (a.water) return;
    let tx = a.tx, tz = a.tz;
    for (let k = 0; k < 4; k++) {
      if (this.#walkable(a, tx, tz)) { a.tx = tx; a.tz = tz; return; }
      tx = (tx + a.x) / 2; tz = (tz + a.z) / 2;
    }
    a.tx = a.x; a.tz = a.z;
  }

  #sound(a, name) {
    if (!name) return;
    const t = this.G.state.time;
    if ((this.soundT[a.group] || -9) > t - 2.5) return;
    this.soundT[a.group] = t;
    this.G.audio.play(name, { at: { x: a.x, y: a.yBase, z: a.z }, vol: 0.7, range: 30 });
  }

  /** batch-2 (#14): a gang says hello once, the first time Gus comes by its haunt (data/crews.js GREETS). Bubbles only. */
  #greet(g) {
    const G = this.G;
    if ((this.greetT = (this.greetT || 0) + 1) % 15) return;   // four checks a second
    for (const [group, gr] of Object.entries(GREETS)) {
      const key = 'seen.greet.' + group;
      if (G.state.flags[key] || Math.hypot(g.x - gr.at.x, g.z - gr.at.z) > gr.r) continue;
      if (G.cutscene?.locked || G.dialogue?.open || G.midScene?.() || g.y - G.terrain.heightAt(g.x, g.z) > 8) continue;
      const near = this.animals.filter((a) => a.group === group && a.state !== 'away' && Math.hypot(a.x - g.x, a.z - g.z) < 14)
        .sort((p, q) => Math.hypot(p.x - g.x, p.z - g.z) - Math.hypot(q.x - g.x, q.z - g.z));
      if (!near.length) continue;
      G.state.flags[key] = true;
      const lines = this.friendly(GROUPS[group].crew) ? gr.friendly : gr.wary;
      const say = (a, text) => G.bubbles.add(text, { at: () => ({ x: a.x, y: a.yBase + 0.6, z: a.z }), ttl: 2.6, range: 30 });
      say(near[0], lines[0]);
      G.audio.play('gang-coo-murmur', { at: { x: near[0].x, y: near[0].yBase, z: near[0].z }, vol: 0.6 });
      // the reply comes from another Swell once the first bubble has gone (two at once overlapped on screen)
      const b = near.slice(1).sort((p, q) => Math.hypot(q.x - near[0].x, q.z - near[0].z) - Math.hypot(p.x - near[0].x, p.z - near[0].z))[0] || near[0];
      if (lines[1]) G.later(2.7, () => { if (!G.cutscene?.locked && !G.dialogue?.open && !G.midScene?.()) say(b, lines[1]); });   // not over a scene that started meanwhile
      this.barkT = Math.max(this.barkT, 8);   // no generic bark on top of the hello
    }
  }

  #bark(g) {
    let best = null, bd = 9;
    for (const a of this.animals) {
      if (a.state === 'away' || !GROUPS[a.group].bark) continue;
      const d = Math.hypot(a.x - g.x, a.z - g.z);
      if (d < bd && d > 1.5) { bd = d; best = a; }
    }
    if (!best) return;
    const pool = (this.friendly(best.crew) ? BARKS.friendly : BARKS.wary)[GROUPS[best.group].bark];
    if (!pool) return;
    let line = pool[Math.floor(best.rnd() * pool.length)];
    const a = best;
    // #24: a wary crew that never flees (horses, owls, hawks) lets its lead hint slip in a bark instead (no extra random draw)
    if (GROUPS[a.group].speed === 0) { const h = this.#leadHintLine(a.crew); if (h) line = h; }
    this.G.bubbles.add(line, { at: () => ({ x: a.x, y: a.yBase + 0.6 + (a.model === 'horse' ? 2 : 0), z: a.z }), ttl: 2.4, range: 14 });
  }

  /** #24: the line a wary animal of this crew lets slip, or null: its first chance, then every third, at most once every
   *  25 s of game time per crew; never for a crew already joined. Hearing one marks the crew's region on the map. No
   *  random draws (crowd decisions are seeded, and replays must repeat). */
  #leadHintLine(crew) {
    const G = this.G, H = crew && LEAD_HINTS[crew];
    if (!H || this.friendly(crew) || G.dialogue?.open || G.cutscene?.locked) return null;
    const n = (this.hintN ||= {})[crew] = (this.hintN[crew] || 0) + 1;
    const t = G.state.time, last = (this.hintAt ||= {})[crew];
    if (n % 3 !== 1 || (last != null && t - last < 25)) return null;
    this.hintAt[crew] = t;
    const st = G.state.leadHints || (G.state.leadHints = {});
    if (!st[crew]) {
      st[crew] = 1;
      const c = CREW[crew], P = c?.haunt;
      if (P) G.later(2.6, () => G.toast(`${c.name.replace(/^The /, '')}: marked on your map`, { seconds: 3 }));
    }
    return H.lines[Math.floor(n / 3) % H.lines.length];
  }

  #leadHint(a) {
    const line = this.#leadHintLine(a.crew);
    if (line) this.G.bubbles.add(line, { at: () => ({ x: a.x, y: a.yBase + 0.6, z: a.z }), ttl: 3.6, range: 30 });
  }

  // ------------------------------------------------------------ drawing: nearest-N per model
  #draw(camera) {
    const G = this.G;
    const cam = camera.position;
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pm);
    const range = this.caps.range;
    const cand = [];
    for (const a of this.animals) {
      if (a.state === 'away') continue;
      const d = Math.hypot(a.x - cam.x, a.z - cam.z, a.yBase - cam.y);
      if (d > range) continue;
      _sp.center.set(a.x, a.yBase + 0.3, a.z); _sp.radius = a.model === 'horse' ? 2 : 0.6;
      if (!_fr.intersectsSphere(_sp)) continue;
      a.dist = d;
      cand.push(a);
    }
    cand.sort((p, q) => p.dist - q.dist);
    for (const m of Object.values(this.meshes)) m.n = 0;
    for (const h of Object.values(this.hats || {})) h.count = 0;
    let full = 0, lod = 0, songs = 0, horses = 0, tris = 0;
    const k = G.budgetScale ?? 1;
    const budget = this.fullBudget * k;
    const lodCap = Math.floor(this.caps.lod * k);
    const byModel = {};
    for (const a of cand) {
      let mesh = null;
      const fm = this.meshes[a.model];
      const fits = fm && tris + fm.full.userData.tris <= budget;
      if (a.group === 'songbirds') { if (songs < this.caps.songbirds && a.dist < this.fullDist * 1.4 && fits) { mesh = fm; songs++; tris += fm.full.userData.tris; } }
      else if (a.group === 'horses') { if (horses < this.caps.horses && fits) { mesh = fm; horses++; tris += fm.full.userData.tris; } }
      else if (a.dist < this.fullDist && full < this.caps.full && fits && fm.n < fm.cap) { mesh = fm; full++; a.lodDraw = false; tris += fm.full.userData.tris; }
      else if (a.lod && lod < lodCap && this.meshes[a.lod] && this.meshes[a.lod].n < this.meshes[a.lod].cap) { mesh = this.meshes[a.lod]; lod++; a.lodDraw = true; }
      else if (!a.lod && a.dist < this.fullDist * 1.6 && full < this.caps.full && fits && fm.n < fm.cap) { mesh = fm; full++; a.lodDraw = false; tris += fm.full.userData.tris; }
      if (!mesh || mesh.n >= mesh.cap) continue;
      const i = mesh.n++;
      const im = mesh.full;
      // pose: hop, waddle, bob on water, a flutter when scattering
      const moving = a.speed > 0.05;
      const hop = moving && GROUPS[a.group].hop ? Math.abs(Math.sin(a.phase * 1.4)) * GROUPS[a.group].hop * (a.state === 'greet' ? 1.6 : 1) : 0;
      const bob = a.water ? Math.sin(a.phase * 0.4) * 0.02 : 0;
      const fl = a.air > 0 ? Math.sin(a.air * Math.PI) * 1.4 : 0;
      const cheer = a.state === 'cheer' ? Math.abs(Math.sin(a.phase * 2)) * 0.15 : 0;
      const nod = a.model === 'horse' ? Math.sin(a.phase * 0.15 + a.i) * 0.02 : 0;
      _p.set(a.x, a.yBase + hop + bob + fl + cheer, a.z);
      const gaitA = im.geometry.attributes.aGaitI;   // batch-3 (#11): a dog trots with a level back (no roll, no bounce)
      if (gaitA) (a.gait ||= new DogGait((im.geometry.boundingBox?.max.y ?? 1) * a.scale, a.i)).write(gaitA, i);
      _e.set(gaitA ? 0 : nod + (moving ? 0.05 : 0), a.yaw, moving && !gaitA ? Math.sin(a.phase * 1.4) * 0.06 : 0);
      _q.setFromEuler(_e);
      _s.setScalar(a.scale);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      const t = a.lodDraw && a.lodTint ? a.lodTint : a.tint;
      im.setColorAt(i, _c.setRGB(t[0], t[1], t[2]));
      if (!a.lodDraw && a.layer != null && im.geometry.attributes.aLayer) im.geometry.attributes.aLayer.array[i] = a.layer;
      if (!a.lodDraw && im.geometry.attributes.aSheen) im.geometry.attributes.aSheen.array.set(a.sheen, i * 3);
      if (im.geometry.attributes.aHead && a.head) { im.geometry.attributes.aHead.array.set(a.head, i * 3); im.geometry.attributes.aBreast.array.set(a.breast, i * 3); }
      // a gang hat on full-detail gang pigeons
      const hatName = GROUPS[a.group].hat;
      if (hatName && !a.lodDraw && this.hats) {
        const h = this.hats[hatName];
        if (h.count < 40) {
          const hp = this.hatPoint;
          // batch-2 (#14): a top hat or beret sits on the crown, where the head is as wide as the hat (it was at headPoint,
          // 2 cm down inside the head)
          if (hatName === 'tophat' || hatName === 'beret') _v.set(this.crown.x, this.seat[hatName], this.crown.z);
          else _v.set(hp.x, hp.y + (hatName === 'bandana' ? -0.07 : 0), hp.z);
          _v.multiplyScalar(a.scale).applyQuaternion(_q).add(_p);
          h.setMatrixAt(h.count++, _m.compose(_v, _q, _s));
        }
      }
      byModel[a.model] = (byModel[a.model] || 0) + 1;
    }
    for (const m of Object.values(this.meshes)) {
      const im = m.full;
      im.count = m.n;
      im.visible = m.n > 0;
      if (m.n) {
        im.instanceMatrix.needsUpdate = true;
        im.instanceColor.needsUpdate = true;
        for (const k of ['aLayer', 'aSheen', 'aHead', 'aBreast', 'aGaitI']) if (im.geometry.attributes[k]) im.geometry.attributes[k].needsUpdate = true;
      }
    }
    for (const h of Object.values(this.hats || {})) { h.visible = h.count > 0; h.instanceMatrix.needsUpdate = true; }
    this.drawn = { full, lod, songbirds: songs, horses, fullTris: tris, byModel, meshes: Object.values(this.meshes).filter((m) => m.n > 0).length + Object.values(this.hats || {}).filter((h) => h.count > 0).length };
  }

  /** A nap: animals go back to their haunts. */
  onNap() {
    for (const a of this.animals) { a.state = 'idle'; a.air = 0; a.t = a.rnd() * 3; }
  }

  stats() {
    const total = this.animals.length;
    const active = this.animals.filter((a) => a.state !== 'away').length;
    return { total, active, drawn: this.drawn, caps: this.caps, groups: this.counts() };
  }
}

const _c = new THREE.Color();
const _v = new THREE.Vector3();

/** Batch-3: a ground animal's spawn spot, moved to the nearest clear cell if it is on the water or inside a solid. */
function landSpot(G, x, z) {
  const C = G.collision;
  if (!C.walkBlocked(x, z)) return { x, z };
  for (let d = 0.5; d <= 45; d += 0.5) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (!C.walkBlocked(px, pz)) return { x: px, z: pz };
  }
  return { x, z };
}

function pickLayer(mix, rnd) {
  const entries = Object.entries(mix);
  const tot = entries.reduce((p, [, w]) => p + w, 0);
  let r = rnd() * tot;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return PIGEON_LAYERS[k]; }
  return 0;
}

/** batch-2 (#14, #6): the crown, the highest vertex near the head point (within r, default 14% of the model's height),
 *  as far back as it really is (headPoint leans to the front, so a hat over it floated above the forehead), on the
 *  head point's centre line. */
export function crownPoint(b, H = headPoint(b), r = 0.14 * (b.bounds.max.y - b.bounds.min.y)) {
  const pos = b.geometry.attributes.position;
  let top = -Infinity, k = -1;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - H.x, dz = pos.getZ(i) - H.z;
    if (dx * dx + dz * dz < r * r && pos.getY(i) > top) { top = pos.getY(i); k = i; }
  }
  return k >= 0 ? new THREE.Vector3(H.x, top, pos.getZ(k)) : H.clone();   // on the head's centre line (a top vertex may be an ear)
}

/** batch-2 (#14, #6): where a hat of inner radius ri rests on the head under the crown K: the highest vertex in the ring
 *  ri..1.8 ri round K's vertical (the head is wider than the hat there), never above the crown itself. */
export function seatY(b, K, ri) {
  const pos = b.geometry.attributes.position;
  let top = -Infinity;
  const r0 = ri * ri, r1 = 3.24 * ri * ri;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - K.x, dz = pos.getZ(i) - K.z, d = dx * dx + dz * dz;
    if (d >= r0 && d <= r1 && pos.getY(i) > top && pos.getY(i) <= K.y) top = pos.getY(i);
  }
  return top > -Infinity ? top : K.y;
}

/** batch-2 (#22): the species of a crowd model (pigeon-plain → pigeon, night-heron → heron, dog-poodle → dog). */
function speciesOf(model) { return Object.keys(SPECIES).find((k) => model.includes(k)) || model; }
let NAMED = null;
/** Is (x, z) within 4 m of a named animal of the same species as `model`? */
function nearNamed(model, x, z) {
  NAMED ||= Object.entries(CHARACTERS).filter(([id, c]) => LOOKS[id] && SPECIES[LOOKS[id].species] && typeof c.at?.x === 'number').map(([id, c]) => ({ sp: LOOKS[id].species, x: c.at.x, z: c.at.z }));
  const sp = speciesOf(model);
  return NAMED.some((n) => n.sp === sp && Math.hypot(n.x - x, n.z - z) < 4);
}

/** The top-front of a baked model: where a head (and a hat) sits. */
export function headPoint(b) {
  const pos = b.geometry.attributes.position;
  const bb = b.bounds;
  const h = bb.max.y - bb.min.y, d = bb.max.z - bb.min.z;
  let sx = 0, sy = 0, sz = 0, n = 0, best = -Infinity;
  const scores = [];
  for (let i = 0; i < pos.count; i += 3) {
    const y = pos.getY(i), z = pos.getZ(i);
    const sc = (y - bb.min.y) / h + 0.6 * (z - bb.min.z) / d;
    scores.push(sc);
    if (sc > best) best = sc;
  }
  const cut = best - 0.08;
  for (let i = 0, k = 0; i < pos.count; i += 3, k++) {
    if (scores[k] < cut) continue;
    sx += pos.getX(i); sy += pos.getY(i); sz += pos.getZ(i); n++;
  }
  return n ? new THREE.Vector3(sx / n, sy / n + 0.005, sz / n - d * 0.04) : new THREE.Vector3(0, bb.max.y, 0);
}

function mergeHat(geos) {
  // a tiny merge: brim + crown in one geometry (both non-indexed after toNonIndexed)
  const parts = geos.map((g) => g.toNonIndexed());
  const n = parts.reduce((p, g) => p + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
