// The Workshop (the Ramble's sealed cave): the Mecha-Pigeon's scaffold, with
// every part bolted on at true part scale as it arrives ("The Mecha-Pigeon: 8
// parts"). The cave is sealed until the finale, so the room is a small set of
// its own, built under the cave (out of sight of the park), and each arrival
// is a short cutaway on the game clock: the part drops onto the scaffold with
// sparks and a clank, a "+ PART" polaroid of the scene, and back to Gus.
//
//   body    Vinnie's hot dog cart (the body, umbrella folded on its back)
//   legs    two old iron drainpipes, with hip pivots
//   talons  Prickett's spike strips, bundled into three claw-toes per foot
//   wings   two sails on wooden spars
//   eyes    two ranger-cart hubcaps          beak   the orange traffic cone
//   voice   the megaphone, on the chest      power  the battery, glowing through a chest vent
//
// The Mecha itself is entities/mecha.js (the real part models, assembled in code; finale builder).
// It watches state.parts: any scheme that adds a part (whoever builds it) gets
// the moment for free. Parts already there on a load are mounted quietly.
// API: G.workshop.mounted(part) · G.workshop.queue (pending cutaways) · G.workshop.room (for the finale)
// A Spikes + Feuds (3b) mod.

import * as THREE from 'three';
import { PLACES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { Mecha } from '../entities/mecha.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PART_NAMES = { body: 'Body', talons: 'Talons', legs: 'Legs', wings: 'Wings', eyes: 'Eyes', beak: 'Beak', voice: 'Voice', power: 'Power core' };
const W = PLACES.workshop;
const DEPTH = 46;              // the set sits this far under the cave floor
const ROOM = { w: 12, h: 6.5, d: 10 };

export class Workshop {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'workshop';
    this.parts = {};           // part → THREE.Group (hidden until mounted)
    this.mountedSet = new Set();
    this.queue = [];
    this.anim = null;
    this.t = 0;
  }
  get st() { return this.G.state; }
  mounted(p) { return this.mountedSet.has(p); }

  async build() {
    const G = this.G;
    const gy = G.terrain.heightAt(W.x, W.z) - DEPTH;
    this.floorY = gy;
    const at = this.room = { x: W.x, y: gy, z: W.z };
    const root = this.root = new THREE.Group();
    root.position.set(at.x, gy, at.z);
    this.group.add(root);
    const m = (c, o = {}) => ruleMaterial({ color: c, ...o });
    const mats = this.mats = {
      rock: m(0x6f6a62, { side: THREE.BackSide }), floor: m(0x5b5148), pole: m(0x9aa3a8, { metalness: 0.4, roughness: 0.5 }), plank: m(0x8a6a44),
      iron: m(0x4a4d50, { metalness: 0.5, roughness: 0.55 }), strip: m(0xc4302b), spike: m(0xd8dde2, { metalness: 0.6, roughness: 0.3 }),
      canvas: m(0xf3eee2, { side: THREE.DoubleSide }), spar: m(0x7a5a36), hub: m(0xcfd5da, { metalness: 0.7, roughness: 0.25 }), head: m(0x7d858a, { metalness: 0.3 }),
      glow: new THREE.MeshBasicMaterial({ color: 0x7fe0ff }), bulb: new THREE.MeshBasicMaterial({ color: 0xffe2a0 }),
    };
    // the room: a rough rock box seen from inside, a plank floor, work lamps
    const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, ROOM.h, ROOM.d).translate(0, ROOM.h / 2, 0), mats.rock);
    root.add(room);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w - 0.2, 0.1, ROOM.d - 0.2), mats.floor);
    floor.position.y = 0.05; floor.receiveShadow = true; root.add(floor);
    for (let k = -2; k <= 2; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, ROOM.d - 0.4), mats.plank); pl.position.set(k * 2.2, 0.11, 0); root.add(pl); }
    const lamp = new THREE.PointLight(0xffd59a, 40, 16, 1.6);
    lamp.position.set(0, ROOM.h - 0.8, 1.5); root.add(lamp);
    const lamp2 = new THREE.PointLight(0x9fd8ff, 14, 12, 1.8);
    lamp2.position.set(-3.5, 2.5, 3.5); root.add(lamp2);
    for (const [x, z] of [[0, 1.5], [3.5, -2]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.bulb); b.position.set(x, ROOM.h - 0.75, z); root.add(b); }
    // the scaffold: four poles round the Mecha, crossbars under its belly, a top deck behind its head
    const sc = this.scaffold = new THREE.Group();
    sc.position.set(0, 0.1, -1.2); root.add(sc);
    const PX = 2.55, PZ = 1.7;
    const pole = (x, z, h) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6).translate(0, h / 2, 0), mats.pole); p.position.set(x, 0, z); sc.add(p); };
    for (const x of [-PX, PX]) for (const z of [-PZ, PZ]) pole(x, z, 4.6);
    for (const y of [0.78, 3.3]) for (const z of [-PZ, PZ]) { const r = new THREE.Mesh(new THREE.BoxGeometry(PX * 2 + 0.1, 0.08, 0.08), mats.pole); r.position.set(0, y, z); sc.add(r); }
    for (const x of [-PX, PX]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, PZ * 2), mats.pole); r.position.set(x, 3.3, 0); sc.add(r); const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 0.06), mats.pole); br.position.set(x, 1.7, 0); br.rotation.x = 0.82; sc.add(br); }
    // the cradle: one beam between the legs, under the belly, crossbar to crossbar (so a body with no legs yet still sits on something)
    { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, PZ * 2), mats.plank); beam.position.set(0, 0.79, 0); sc.add(beam); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(PX * 2, 0.06, 0.7), mats.plank); deck.position.set(0, 3.33, -PZ + 0.35); sc.add(deck);
    // the Mecha (entities/mecha.js), at true part scale, facing the camera (+z)
    const mecha = this.mecha = new Mecha(G);
    await mecha.build();
    sc.add(mecha.root);
    this.mech = mecha.root;
    // the parts: each is one or more nodes on the Mecha's pivots (hidden until mounted)
    for (const k of Object.keys(PART_NAMES)) this.parts[k] = mecha.nodes(k);
    // dressing: a workbench, the spare hubcap on the wall, the BIGGIFY lever (the finale pulls it)
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.8), mats.plank); bench.position.set(-4.2, 0.9, -3.4); root.add(bench);
    for (const [x, z] of [[-5.2, -3.7], [-3.2, -3.7], [-5.2, -3.1], [-3.2, -3.1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 0.08), mats.plank); l.position.set(x, 0.45, z); root.add(l); }
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), mats.hub); spare.position.set(-4.0, 2.4, -ROOM.d / 2 + 0.12); root.add(spare);
    const lever = this.lever = new THREE.Group();
    lever.position.set(3.6, 0.1, 0.6); root.add(lever);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mats.iron); lb.position.y = 0.25; lever.add(lb);
    const arm = this.leverArm = new THREE.Group(); arm.position.y = 0.5; arm.rotation.x = -0.6; lever.add(arm);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 8).translate(0, 0.65, 0), mats.spar); arm.add(stick);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), m(0xd23a2a)); knob.position.y = 1.32; arm.add(knob);
    // the sign: text drawn on a canvas under a counter-mirrored group, so it reads in the mirrored world
    {
      const c = document.createElement('canvas'); c.width = 512; c.height = 160;
      const g = c.getContext('2d');
      g.fillStyle = '#f2c230'; g.fillRect(0, 0, 512, 160);
      g.strokeStyle = '#1d1f22'; g.lineWidth = 14; g.strokeRect(7, 7, 498, 146);
      for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#1d1f22' : '#f2c230'; g.fillRect(i * 44, 136, 44, 24); }
      g.fillStyle = '#c4302b'; g.font = '700 92px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BIGGIFY', 256, 74);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const sg = new THREE.Group(); sg.scale.x = -1; sg.position.set(0, 1.25, 0.05); lever.add(sg);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.375), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 })); sign.position.z = 0.3; sg.add(sign);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), mats.spar); post.position.set(0.5, -0.5, 0.27); sg.add(post);
    }
    await this.#dress(root, mats);   // polish (P15)
    // hidden again in restore() (the shader warm-up shows everything once)
    for (const list of Object.values(this.parts)) for (const g of list) g.visible = false;
    this.restore();
  }

  /** polish (P15): the room looked unfinished (flat brown walls, a scaffold, a bench). Dressing, all static and only drawn
   *  while the camera is down here: schist rock walls, pipes along the walls and ceiling with a valve wheel, a string of
   *  festoon bulbs, crates, Prickett's spare spike-strip stock, a painted "Night Crew Engineering" board, the blueprints
   *  pinned to the wall (assets/ui/workshop-blueprints.jpg) and the Night Crew watching from the crates and the bench. */
  async #dress(root, mats) {
    const G = this.G, H = ROOM.h, D = ROOM.d / 2, X = ROOM.w / 2;
    // the walls: the park's own schist
    const rockTex = G.worldTex?.schist;
    if (rockTex) { const t = rockTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.6); t.needsUpdate = true; mats.rock.map = t; mats.rock.color.setHex(0xb5aea4); mats.rock.needsUpdate = true; }
    const merged = (list, mat) => { const g = mergeGeometries(list.map((q) => q.toNonIndexed ? (q.index ? q.toNonIndexed() : q) : q)); const mesh = new THREE.Mesh(g, mat); root.add(mesh); return mesh; };
    const cyl = (r, len, axis, x, y, z) => { const g = new THREE.CylinderGeometry(r, r, len, 10, 1); if (axis === 'x') g.rotateZ(Math.PI / 2); if (axis === 'z') g.rotateX(Math.PI / 2); return g.translate(x, y, z); };
    // pipes: two runs along the back wall, one along the left wall, a downpipe in the corner with a valve wheel
    const pipes = [
      cyl(0.09, ROOM.w - 0.3, 'x', 0, H - 0.6, -D + 0.25), cyl(0.06, ROOM.w - 0.3, 'x', 0, H - 0.95, -D + 0.22),
      cyl(0.08, ROOM.d - 0.3, 'z', -X + 0.25, H - 0.75, 0), cyl(0.09, H - 0.6, 'y', -X + 0.3, (H - 0.6) / 2, -D + 0.3),
      cyl(0.07, H - 0.95, 'y', X - 0.35, (H - 0.95) / 2, -D + 0.22),
      new THREE.TorusGeometry(0.22, 0.035, 6, 16).rotateY(Math.PI / 2).translate(-X + 0.42, 1.5, -D + 0.3),
    ];
    for (const x of [-4, -1, 2, 5]) pipes.push(new THREE.BoxGeometry(0.08, 0.32, 0.12).translate(x, H - 0.6, -D + 0.12));   // brackets
    for (const x of [-4, 0, 4]) pipes.push(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10).rotateZ(Math.PI / 2).translate(x, H - 0.6, -D + 0.25));   // joints
    merged(pipes, mats.iron);
    // festoon lights: three sagging strings under the ceiling, warm bulbs (unlit material: no new lights)
    const wire = [], bulbs = [], cols = [];
    const warm = [0xffd27a, 0xffb36b, 0xfff1c4, 0xff9c6b];
    [[-X + 0.4, -D + 0.6, X - 0.4, -D + 0.6], [-X + 0.4, -D + 0.6, X - 0.6, D - 1.2], [-X + 0.5, D - 1.5, X - 0.5, -1]].forEach(([x0, z0, x1, z1], si) => {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector3(x0 + (x1 - x0) * k, H - 0.35 - Math.sin(Math.PI * k) * 0.7, z0 + (z1 - z0) * k)); }
      wire.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.012, 4));
      for (let i = 1; i < 16; i++) {
        const b = new THREE.SphereGeometry(0.07, 8, 6).translate(pts[i].x, pts[i].y - 0.1, pts[i].z);
        const c = new THREE.Color(warm[(i + si) % warm.length]);
        const n = b.attributes.position.count; const arr = new Float32Array(n * 3); for (let j = 0; j < n; j++) arr.set([c.r, c.g, c.b], j * 3);
        b.setAttribute('color', new THREE.BufferAttribute(arr, 3)); bulbs.push(b);
      }
    });
    merged(wire, mats.iron);
    merged(bulbs, new THREE.MeshBasicMaterial({ vertexColors: true }));
    // crates: a stack at the back right, one by the left wall (slats as a darker frame)
    const crateMat = ruleMaterial({ color: 0xa7804f }), slatMat = ruleMaterial({ color: 0x6e5132 });
    const crates = [], slats = [];
    const crate = (x, y, z, s, rot = 0) => {
      crates.push(new THREE.BoxGeometry(s, s, s).rotateY(rot).translate(x, y + s / 2, z));
      for (const dy of [0.12, 0.88]) slats.push(new THREE.BoxGeometry(s + 0.03, s * 0.08, s + 0.03).rotateY(rot).translate(x, y + s * dy, z));
      slats.push(new THREE.BoxGeometry(s * 0.08, s * 0.98, s + 0.04).rotateZ(0.78).rotateY(rot).translate(x, y + s / 2, z));
    };
    crate(4.5, 0, -3.9, 0.9, 0.1); crate(3.5, 0, -4.0, 0.8, -0.15); crate(4.4, 0.9, -3.9, 0.7, 0.4); crate(-5.2, 0, 2.6, 0.8, 0.3);
    merged(crates, crateMat); merged(slats, slatMat);
    // Prickett's spike strips, a heap of spare stock by the crates
    const strips = [], spikes = [];
    for (let i = 0; i < 7; i++) {
      const a = (i * 2.4) % Math.PI, y = 0.04 + i * 0.05, cx = 3.2 + Math.sin(i * 1.7) * 0.3, cz = -2.4 + Math.cos(i * 2.1) * 0.25;
      strips.push(new THREE.BoxGeometry(1.7, 0.05, 0.22).rotateY(a).translate(cx, y, cz));
      if (i >= 4) for (let k = -3; k <= 3; k++) spikes.push(new THREE.ConeGeometry(0.035, 0.12, 5).translate(cx + Math.cos(a) * k * 0.22, y + 0.08, cz - Math.sin(a) * k * 0.22));
    }
    merged(strips, mats.strip); merged(spikes, mats.spike);
    // a painted board over the bench, and the blueprints on the left wall (counter-mirrored, so they read)
    const painted = () => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 300;
      const g = c.getContext('2d');
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#6b4a2c', '#755233', '#68472a', '#714f30'][i]; g.fillRect(0, i * 75, 1024, 75); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, i * 75 + 72, 1024, 3); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#f2c230'; g.font = '700 118px Fredoka, sans-serif'; g.fillText('THE WORKSHOP', 512, 118);
      g.fillStyle = '#f6efe2'; g.font = '600 50px Fredoka, sans-serif'; g.fillText('Night Crew Engineering · No humans', 512, 228);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    };
    const wallPic = (tex, w, h, pos, rotY) => {
      const holder = new THREE.Group(); holder.position.set(...pos); holder.rotation.y = rotY; root.add(holder);
      const flip = new THREE.Group(); flip.scale.x = -1; holder.add(flip);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.05), mats.spar); flip.add(frame);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide })); pic.position.z = 0.03; flip.add(pic);
    };
    wallPic(painted(), 2.6, 0.76, [3.1, 3.75, -D + 0.08], 0);   // above the crates (behind the scaffold it was hidden by the Mecha's head)
    try {
      const bp = await new THREE.TextureLoader().loadAsync('assets/ui/workshop-blueprints.jpg');
      bp.colorSpace = THREE.SRGBColorSpace;
      wallPic(bp, 2.7, 1.8, [-X + 0.08, 2.5, -0.6], Math.PI / 2);
    } catch { /* the room still works without it */ }
    // a traffic cone, a trash can of offcuts, a pizza box
    const prop = async (id, h, x, y, z, yaw = 0) => {
      const b = await G.registry.baked(id); if (!b) return null;
      const s = h / Math.max(0.001, b.bounds.max.y - b.bounds.min.y);
      const mesh = new THREE.Mesh(b.geometry, b.makeMaterial());
      mesh.scale.setScalar(s); mesh.position.set(x, y - b.bounds.min.y * s, z); mesh.rotation.y = yaw; root.add(mesh); return mesh;
    };
    // the Night Crew, watching the build: two on the crates, one on the bench, one on the floor; a rat on the bench
    const face = (x, z) => Math.atan2(0 - x, -1.2 - z);
    await Promise.all([
      prop('traffic-cone', 0.7, -2.6, 0, -4.3, 0.4), prop('trash-can', 0.85, -5.3, 0, 1.3), prop('pizza-box', 0.06, -4.0, 0.95, -3.3, 0.3),
      prop('raccoon-stand', 0.7, 4.5, 1.6, -3.9, face(4.5, -3.9)), prop('raccoon-stand', 0.62, 3.5, 0.8, -4.0, face(3.5, -4.0) + 0.2),
      prop('raccoon-stand', 0.66, -4.7, 0.94, -3.3, face(-4.7, -3.3)), prop('raccoon-stand', 0.7, -2.4, 0.1, 1.6, face(-2.4, 1.6)),
      prop('rat-stand', 0.3, -3.6, 0.94, -3.5, face(-3.6, -3.5)),
    ]);
  }

  restore() {
    for (const [k, list] of Object.entries(this.parts)) { const on = this.st.parts.includes(k); for (const g of list) { g.visible = on; g.position.copy(g.userData.home); } if (on) this.mountedSet.add(k); else this.mountedSet.delete(k); }
    this.queue = []; this.anim = null;
  }

  update(dt) {
    const G = this.G;
    this.t += dt;
    // perf pass (render only): the room is 46 m under the cave and only ever seen from inside, but frustum culling
    // can't tell, so its ~38 draws went into every frame above. Hide its meshes unless the camera is down there
    // (never the lamps: hiding a light would recompile every shader).
    const cam = G.dataCam?.position;
    if (cam && this.root) {
      const near = Math.hypot(cam.x - this.room.x, cam.y - this.room.y, cam.z - this.room.z) < 40;
      if (near !== this.shown) { this.shown = near; for (const o of this.root.children) if (!o.isLight) o.visible = near; }
    }
    if (!this.offStage) { this.mecha?.ventGlow(this.t, this.mounted('power') ? 1 : 0); this.mecha?.pose('stand', this.t); }
    for (const p of this.st.parts) if (this.parts[p] && !this.mountedSet.has(p) && !this.queue.includes(p) && this.anim?.part !== p) this.queue.push(p);
    // a cutaway when the park is calm (no cutscene, dialogue, menu, race, fight or drive)
    if (!this.anim && this.queue.length && !G.cutscene.running && !G.dialogue.open && !G.menus.open && !G.napping && !G.race?.run && !G.fights?.active && !G.vehicles.driving && !G.vehicles.byId?.zamboni?.hop) this.#arrive(this.queue.shift());
    const a = this.anim;
    if (a && a.drop != null) {
      a.drop += dt;
      const k = Math.min(1, a.drop / 0.75), e = 1 - (1 - k) * (1 - k);
      for (const g of this.parts[a.part]) { g.position.copy(g.userData.home); g.position.y += (1 - e) * 2.4; }
      if (k >= 1 && !a.landed) { a.landed = true; this.#clank(a.part); }
    }
  }

  #clank(part) {
    const G = this.G, g = this.parts[part][0];
    const w = new THREE.Vector3(); g.getWorldPosition(w); w.x = -w.x;   // the world is drawn through a mirrored root: back to game coordinates
    G.audio.play('part-bolted-on', { vol: 0.9 });
    G.particles.burst('sparkle', w.x, w.y + 0.3, w.z, 26, { spread: 1.2, color: [1, 0.75, 0.3] });
    G.particles.burst('sparkle', w.x, w.y + 0.2, w.z, 14, { spread: 0.5, color: [1, 1, 0.8] });
    G.shake?.(0.08, 0.35);
  }

  /** The cutaway: inside the Workshop, the part bolts on, a polaroid of it, back to the park. */
  #arrive(part) {
    const G = this.G, R = this.room, name = PART_NAMES[part] || part;
    this.anim = { part, drop: null };
    const sc = new THREE.Vector3(); this.scaffold.getWorldPosition(sc); sc.x = -sc.x;   // (mirrored root → game coordinates)
    const cam = { pos: [R.x + 3.6, R.y + 3.0, R.z + 4.4], look: [sc.x, R.y + 2.2, sc.z] };
    G.cutscene.run('workshop-' + part, [
      { do: () => { G.rig.setFree(cam); } },
      { wait: 0.5 },
      { do: () => { for (const g of this.parts[part]) g.visible = true; this.anim.drop = 0; } },
      { wait: 1.0 },
      { do: () => {
        let url = null;
        try { G.render(); url = G.renderer.domElement.toDataURL('image/jpeg', 0.6); } catch { /* the polaroid is a nicety */ }
        G.audio.play('camera-shutter', { vol: 0.6 });
        const el = document.getElementById('polaroid');
        if (el) { el.innerHTML = `${url ? `<img alt="" src="${url}">` : ''}<b>+ PART</b><span>${name}</span>`; el.className = 'on postcard'; G.later(3.2, () => { el.className = ''; }); }
        G.toast(`${name} bolted on in the Workshop. Parts ${this.st.parts.length}/8`, { kind: 'stamp', seconds: 4, now: true });   // polish (P3): the scene's own note
      } },
      { wait: 1.8 },
      { follow: true },
    ], () => { this.mountedSet.add(part); for (const g of this.parts[part]) { g.position.copy(g.userData.home); g.visible = true; } this.anim = null; G.bus.emit('partMounted', { part }); });
  }

  debug() { return { mounted: [...this.mountedSet], queue: [...this.queue], busy: this.anim?.part || null }; }
}
