// Finale: Feed the Birds ("Finale gate", the act list's "Finale: Feed the Birds").
// Gated on all 17 crews and all 8 parts (data/schemes.js `finale`, opensWhen
// { crews: 17, parts: 8 }): reaching the Workshop cave runs script 'finale'.
//
//   doors     the cave's doors swing open; inside, Gus hops onto the Mecha's head
//   biggify   (finale/biggify.js) the raccoons pull BIGGIFY: hum, flash, feathers; the Mecha grows to
//             18 m and bursts out of the Ramble
//   stomp     (finale/stomp.js) on rails down Fifth Avenue, ~55 s: steer between 3 lanes, Flap to step
//             over cabs; every crew turns out along the route; the flock swirls overhead
//   climb     (finale/climb.js) the Empire State Building (a code-built Art Deco hero model in its own
//             scene), ~50 s: alternate Flap and Peck (left claw, right claw), sidestep the window-washer
//             cradles, three crew beats (Rhoda and Rex, the chopper and the flock, the Grate Rats' banner)
//   shout     (finale/shout.js) "Press ✕ to SHOUT", the camera swings out, Gus on the Mecha's head:
//             "FEED THE BIRDS!", the brass stinger, bread (and one slice) raining from every window
//   credits   over the celebrating park (the Mecha stands on the Great Lawn from now on), then the
//             post-credits sting (assets/bg/sting.jpg), then free roam: sunny, every sign flipped, a huge
//             flock; the "won" state is saved (flags finale + won)
//
// Everything runs on the fixed 1/60 s clock with seeded (hashed) randomness, so a recorded run replays
// exactly (design/solutions/finale.json). Input: G.input actions only (keyboard, gamepad and touch all
// write them); nothing here can fail: missed rhythm only slows the climb, cabs only make you stumble.
// The whole finale holds one cutscene (so Gus, the map and the board are locked) and drives the camera
// with G.rig.setFree. The climb's scene is drawn through G.altView (a small hook in main.js's render()).
// Debug: G.finale.goTo('biggify' | 'stomp' | 'climb' | 'shout' | 'credits' | 'sting') (window.__game.goTo).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLACES } from '../world/layout.js';
import { glyph } from '../ui/glyphs.js';
import { Biggify } from './biggify.js';
import { Stomp } from './stomp.js';
import { Climb } from './climb.js';
import { Shout } from './shout.js';

export const GIANT = 18 / 3.5;                 // BIGGIFY: Workshop scale → 18 m
export const STAGES = ['doors', 'biggify', 'stomp', 'climb', 'shout', 'credits', 'sting'];
export const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x); };
export const ease = (k) => k * k * (3 - 2 * k);
export const clamp01 = (k) => Math.max(0, Math.min(1, k));

const CSS = `
#finale-ui { position: fixed; inset: 0; z-index: 25; pointer-events: none; font-family: 'Fredoka', sans-serif; color: #fffaf0; }
#finale-ui .prompt { position: absolute; left: 50%; bottom: 15%; transform: translateX(-50%) scale(.9); opacity: 0; transition: opacity .2s, transform .2s;
  background: rgba(29, 31, 34, .78); border: 3px solid #fffaf0; border-radius: 999px; padding: 10px 26px; font-size: clamp(20px, 3vw, 34px); font-weight: 700; display: flex; gap: 12px; align-items: center; white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,.35); }
#finale-ui .prompt.on { opacity: 1; transform: translateX(-50%) scale(1); }
#finale-ui .prompt.pulse { animation: fpulse .6s ease-in-out infinite alternate; }
@keyframes fpulse { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.08); } }
#finale-ui .prompt svg { width: 1.3em; height: 1.3em; }
#finale-ui .prompt .key, #finale-ui .prompt .padpill, #finale-ui .prompt .padtxt { font-size: .8em; }
#finale-ui .caption { position: absolute; left: 50%; top: 9%; transform: translateX(-50%); opacity: 0; transition: opacity .35s; text-align: center;
  font-size: clamp(18px, 2.4vw, 28px); font-weight: 600; text-shadow: 0 2px 0 #3a2a1a; max-width: 80vw;
  background: rgba(29, 31, 34, .72); border-radius: 999px; padding: 8px 24px; box-shadow: 0 6px 18px rgba(0,0,0,.3); }   /* polish (P16): a backing pill (it was bare text over the sky and towers) */
#finale-ui .caption.on { opacity: 1; }
#finale-ui .meter { position: absolute; right: calc(24px + env(safe-area-inset-right)); top: 50%; transform: translateY(-50%); width: 16px; height: 46vh; border-radius: 10px; background: rgba(29,31,34,.55); border: 2px solid #fffaf0; opacity: 0; transition: opacity .3s; }
#finale-ui .meter.on { opacity: 1; }
#finale-ui .meter i { position: absolute; left: 2px; right: 2px; bottom: 2px; border-radius: 7px; background: linear-gradient(#ffd34a, #ff7a2a); }
#finale-ui .meter b { position: absolute; right: 24px; transform: translateY(50%); font-size: 14px; white-space: nowrap; text-shadow: 0 1px 3px #000; }
#finale-ui .flash { position: absolute; inset: 0; background: #fff; opacity: 0; transition: opacity .15s; }
#finale-ui .flash.on { opacity: .92; transition: opacity .04s; }
#finale-ui .black { position: absolute; inset: 0; background: #14110e; opacity: 0; transition: opacity .6s; display: flex; align-items: center; justify-content: center; font-size: clamp(22px, 3vw, 36px); font-weight: 600; color: #f2e6cf; }
#finale-ui .black.on { opacity: 1; }
#finale-ui .shout { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%) rotate(-5deg) scale(.4); opacity: 0; white-space: nowrap;
  font: 700 clamp(56px, 10vw, 150px) 'Fredoka', sans-serif; color: #ffd34a; -webkit-text-stroke: 4px #6b3a1a; text-shadow: 0 8px 0 #6b3a1a, 0 18px 40px rgba(0,0,0,.45); transition: opacity .2s, transform .45s cubic-bezier(.2,1.7,.4,1); }
#finale-ui .shout.on { opacity: 1; transform: translate(-50%, -50%) rotate(-5deg) scale(1); }
#finale-ui .credits { position: absolute; left: 0; right: 0; top: 0; bottom: 0; overflow: hidden; opacity: 0; transition: opacity .8s;
  -webkit-mask-image: linear-gradient(transparent 0, #000 16%, #000 84%, transparent 100%); mask-image: linear-gradient(transparent 0, #000 16%, #000 84%, transparent 100%); }
#finale-ui .credits.on { opacity: 1; }
#finale-ui .credits::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: min(780px, 94vw); transform: translateX(-50%);
  background: linear-gradient(90deg, rgba(18,14,10,0) 0%, rgba(18,14,10,.58) 16%, rgba(18,14,10,.62) 50%, rgba(18,14,10,.58) 84%, rgba(18,14,10,0) 100%); }
#finale-ui .credits .roll { position: absolute; left: 50%; transform: translate(-50%, 0); width: min(640px, 86vw); text-align: center; text-shadow: 0 2px 0 #3a2a1a, 0 3px 12px rgba(0,0,0,.7); }
#finale-ui .credits h1 { font-size: clamp(40px, 6vw, 72px); margin: 0 0 6px; color: #ffd34a; -webkit-text-stroke: 2px #6b3a1a; }
#finale-ui .credits h2 { font-size: clamp(20px, 2.6vw, 30px); margin: 46px 0 8px; color: #ffd34a; }
#finale-ui .credits p { font-size: clamp(16px, 2vw, 22px); margin: 4px 0; font-weight: 500; }
#finale-ui .credits p.big { font-size: clamp(22px, 3vw, 34px); font-weight: 700; }
#finale-ui .credits p.small { font-size: clamp(13px, 1.5vw, 16px); opacity: .9; }
#finale-ui .sting { position: absolute; inset: 0; background: #000 center / cover no-repeat; opacity: 0; transition: opacity 1s; }
#finale-ui .sting.on { opacity: 1; }
#finale-ui .sting span { position: absolute; left: 50%; bottom: 10%; transform: translateX(-50%); font-size: clamp(30px, 4.6vw, 60px); font-weight: 700; color: #fffaf0; text-shadow: 0 3px 0 #3a2a1a, 0 6px 22px rgba(0,0,0,.6); opacity: 0; transition: opacity 1.2s; white-space: nowrap; }
#finale-ui .sting.words span { opacity: 1; }
#finale-ui .skip { position: absolute; right: 22px; bottom: 18px; font-size: 16px; opacity: 0; transition: opacity .4s; display: flex; gap: 8px; align-items: center; text-shadow: 0 1px 3px #000; }
#finale-ui .skip.on { opacity: .85; }
#finale-ui .skip svg { width: 1.2em; height: 1.2em; }
body.finale #hud { display: none; }
/* polish (P17): after the sting, the HUD waits for the sting picture to fade before it fades in */
body.after-finale #hud { animation: hudAfterFinale 0.9s ease 1.1s both; }
@keyframes hudAfterFinale { from { opacity: 0; } to { opacity: 1; } }
`;

// ------------------------------------------------------------------ shared pieces
/** Simple instanced "things that fly and fall" (rock chunks, bread, feathers) with a fixed-step physics. */
/** Fixes-3 (R9): a slice of bread (the toast shape: square shoulders, a domed top; a pale crumb face, a brown crust round
 *  the edge), ~1 m: the bread raining in the stomp and the shout read as flat yellow cubes. Vertex colours, one geometry
 *  for an InstancedMesh. (Named loaf for history; it's the slice every pigeon knows.) */
export function loafGeometry() {
  const sh = new THREE.Shape();
  sh.moveTo(-0.42, -0.5); sh.lineTo(0.42, -0.5); sh.quadraticCurveTo(0.5, -0.5, 0.5, -0.42); sh.lineTo(0.5, 0.18);
  sh.bezierCurveTo(0.66, 0.26, 0.62, 0.62, 0.3, 0.6); sh.bezierCurveTo(0.12, 0.66, -0.12, 0.66, -0.3, 0.6);
  sh.bezierCurveTo(-0.62, 0.62, -0.66, 0.26, -0.5, 0.18); sh.lineTo(-0.5, -0.42); sh.quadraticCurveTo(-0.5, -0.5, -0.42, -0.5);
  const body = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.06);
  // the crumb faces: the same outline, a little smaller, just proud of each side
  const face = new THREE.ShapeGeometry(sh, 6).scale(0.84, 0.84, 1).translate(0, 0.01, 0);
  const front = face.clone().translate(0, 0, 0.0865), back = face.clone().rotateY(Math.PI).translate(0, 0, -0.0865);
  const crust = new THREE.Color(0x9a5a24), crumb = new THREE.Color(0xf4e2bc);
  const tint = (geo, c) => { const g2 = geo.index ? geo.toNonIndexed() : geo; const n = g2.attributes.position.count, col = new Float32Array(n * 3); for (let k = 0; k < n; k++) { col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } g2.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g2; };
  const m = mergeGeometries([tint(body, crust), tint(front, crumb), tint(back, crumb)], false);
  m.computeVertexNormals();
  return m;
}
export const loafMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: 0x24140a });

export class Debris {
  constructor(geometry, material, max, { gravity = 9.8, ground = () => 0, spin = 4, life = 6, mirrorSafe = true } = {}) {
    this.mesh = new THREE.InstancedMesh(geometry, material, max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.max = max; this.g = gravity; this.ground = ground; this.spinK = spin; this.lifeK = life;
    this.list = [];
    this.i = 0;
    void mirrorSafe;
  }
  spawn(x, y, z, vx, vy, vz, size = 1, seed = 0) {
    const p = { x, y, z, vx, vy, vz, s: size, rx: hash(seed, 1) * 6, ry: hash(seed, 2) * 6, wx: (hash(seed, 3) - 0.5) * this.spinK, wy: (hash(seed, 4) - 0.5) * this.spinK, t: 0, life: this.lifeK * (0.8 + hash(seed, 5) * 0.4), rest: false };
    if (this.list.length < this.max) this.list.push(p); else { this.list[this.i] = p; this.i = (this.i + 1) % this.max; }
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
  update(dt, drag = 0) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    let n = 0;
    for (const p of this.list) {
      p.t += dt;
      if (p.t > p.life) continue;
      if (!p.rest) {
        p.vy -= this.g * dt;
        if (drag) { p.vx *= 1 - drag * dt; p.vz *= 1 - drag * dt; p.vy = Math.max(p.vy, -6); }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.rx += p.wx * dt; p.ry += p.wy * dt;
        const gy = this.ground(p.x, p.z);
        if (p.y < gy) { p.y = gy; if (Math.abs(p.vy) > 2.5) { p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; } else p.rest = true; }
      }
      const k = Math.min(1, (p.life - p.t) / 0.6);
      m.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx, p.ry, 0)), s.setScalar(p.s * Math.max(0.001, k)));
      this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A big flock of pigeons (the flock's own geometry and wingbeat material), swirling round a point. */
export class BigFlock {
  constructor(G, n = 140, seed = 3) {
    const src = G.flock.mesh;
    const geo = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) if (src.geometry.attributes[k]) geo.setAttribute(k, src.geometry.attributes[k]);
    if (src.geometry.index) geo.setIndex(src.geometry.index);
    // per-instance attributes the wingbeat and morph shaders read, sized for n
    for (const [k, a] of Object.entries(src.geometry.attributes)) {
      if (!a.isInstancedBufferAttribute) continue;
      const arr = new Float32Array(n * a.itemSize);
      for (let i = 0; i < n; i++) for (let j = 0; j < a.itemSize; j++) {
        const from = a.array[(i % a.count) * a.itemSize + j];
        arr[i * a.itemSize + j] = k === 'aLayer' ? Math.floor(hash(i, seed) * 12.99) : k === 'aSheen' ? 0.7 + hash(i, seed + j) * 0.6 : from + (k.toLowerCase().includes('phase') ? hash(i, seed + 7) * 6.283 : 0);
      }
      geo.setAttribute(k, new THREE.InstancedBufferAttribute(arr, a.itemSize));
    }
    this.mesh = new THREE.InstancedMesh(geo, src.material, n);
    this.mesh.frustumCulled = false;
    this.mesh.count = n;
    this.n = n;
    this.scale = G.flock.scale * 1.05;
    this.offset = G.flock.centerOffset.clone();
    this.pitch = G.flock.pitch;
    this.birds = Array.from({ length: n }, (_, i) => ({ r: 0.5 + hash(i, 11) * 0.7, h: (hash(i, 12) - 0.5), ph: hash(i, 13) * Math.PI * 2, sp: (0.6 + hash(i, 14) * 0.5) * (hash(i, 15) < 0.82 ? 1 : -1), tilt: (hash(i, 16) - 0.5) * 0.7 }));
    this.t = 0;
    this.center = new THREE.Vector3();
    this.radius = 20; this.height = 8; this.speed = 1;
    this.toward = null;   // { point, k } pulls the flock into a tight swirl in front of something
  }
  update(dt) {
    this.t += dt;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3().setScalar(this.scale), p = new THREE.Vector3(), tmp = new THREE.Matrix4();
    for (let i = 0; i < this.n; i++) {
      const b = this.birds[i];
      const a = b.ph + this.t * b.sp * this.speed * (14 / Math.max(6, this.radius));
      const r = this.radius * b.r;
      let x = this.center.x + Math.cos(a) * r, z = this.center.z + Math.sin(a) * r;
      let y = this.center.y + this.height * b.h + Math.sin(a * 2 + b.ph) * this.height * 0.15 + Math.sin(a + b.tilt) * r * b.tilt * 0.4;
      if (this.toward) {
        const k = this.toward.k, T = this.toward.point, rr = 3 + b.r * 5;
        x += (T.x + Math.cos(a * 2.4) * rr - x) * k; y += (T.y + b.h * 6 + Math.sin(a * 3) * 1.5 - y) * k; z += (T.z + Math.sin(a * 2.4) * rr - z) * k;
      }
      const yaw = Math.atan2(-Math.sin(a) * b.sp, Math.cos(a) * b.sp);   // tangent of the orbit
      p.set(x, y, z);
      q.setFromEuler(e.set(this.pitch * 0.2, yaw, -0.5 * Math.sign(b.sp)));
      m.compose(p, q, s).multiply(tmp.copy(this.offset));
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the orchestrator (a mod in G.mods)
export class Finale {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'finale';
    this.stage = null;     // one of STAGES, or null when not running; 'done' at the end
    this.t = 0;            // seconds in the current stage
    this.T = 0;            // seconds since the finale began
    this.running = false;
  }

  get mecha() { return this.G.workshop.mecha; }
  get st() { return this.G.state; }

  async build() {
    const G = this.G;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const ui = this.uiEl = document.createElement('div');
    ui.id = 'finale-ui';
    ui.innerHTML = '<div class="flash"></div><div class="black"></div><div class="caption"></div><div class="prompt"></div><div class="meter"><i></i><b></b></div><div class="shout">FEED THE BIRDS!</div><div class="credits"><div class="roll"></div></div><div class="sting"><span>Next: the world?</span></div><div class="skip"></div>';
    document.body.appendChild(ui);
    this.$ = Object.fromEntries(['flash', 'black', 'caption', 'prompt', 'meter', 'shout', 'credits', 'sting', 'skip'].map((k) => [k, ui.querySelector('.' + k)]));
    this.$.roll = ui.querySelector('.roll');
    // the cave's doors (the park side of the sealed Workshop)
    this.#buildDoors();
    // Gus, standing on the Mecha's head (his own size: 0.32 m, whatever the Mecha's scale)
    const stand = await G.registry.baked('gus-stand');
    if (stand) {
      this.gusMesh = new THREE.Mesh(stand.geometry, stand.makeMaterial());
      this.gusMesh.castShadow = true;
      this.gusMesh.visible = false;
      this.mecha.seat.add(this.gusMesh);
    }
    // the stages
    this.parts = { biggify: new Biggify(this), stomp: new Stomp(this), climb: new Climb(this), shout: new Shout(this) };
    for (const p of Object.values(this.parts)) await p.build?.();
    // the script the finale scheme's one step runs
    G.schemes.registerScript('finale', (ctx, done) => this.start(done));
  }

  #buildDoors() {
    const G = this.G;
    const W = PLACES.workshop;
    // the cave mouth (world/landmarks.js B.cave): 3.7 m south of the rock's centre, facing south
    const rock = { x: -26.4, z: 385.2 };
    const y = G.terrain.heightAt(rock.x, rock.z);
    const doors = this.doors = new THREE.Group();
    doors.position.set(rock.x, y - 0.1, rock.z - 3.69 - 0.25);
    doors.rotation.y = Math.PI;
    this.group.add(doors);
    const wood = new THREE.MeshStandardMaterial({ map: null, color: 0x7a5434, roughness: 0.85 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x3d3f42, roughness: 0.5, metalness: 0.5 });
    this.doorLeaves = [];
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(sx * 1.15, 0, 0); doors.add(hinge);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.1, 0.08).translate(-sx * 0.575, 1.05, 0), wood); leaf.castShadow = true; hinge.add(leaf);
      // perf pass: both iron bands of a leaf in one mesh (one draw)
      const bands = new THREE.BoxGeometry(1.1, 0.1, 0.1).translate(-sx * 0.575, 0.4, 0.02);
      const b2 = new THREE.BoxGeometry(1.1, 0.1, 0.1).translate(-sx * 0.575, 1.7, 0.02);
      hinge.add(new THREE.Mesh(mergeGeometries([bands, b2], false), iron));
      this.doorLeaves.push({ hinge, sx });
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0 }));
    glow.position.set(0, 1.0, -0.15); glow.rotation.y = Math.PI; doors.add(glow);
    this.doorGlow = glow;
    glow.visible = false;   // perf pass: hidden while its opacity is 0 (#glow)
    void W;
  }

  /** The doors' glow (perf pass: not drawn at all while it's transparent). */
  #glow(o) { this.doorGlow.material.opacity = o; this.doorGlow.visible = o > 0.004; }

  // ---------------------------------------------------------------- helpers the stages use
  /** The camera, in game coordinates (applied now and kept by the rig). */
  cam(pos, look, fov = 60) {
    const G = this.G;
    G.rig.setFree({ pos, look, fov });
    const c = G.dataCam;
    c.position.set(pos[0], pos[1], pos[2]); c.up.set(0, 1, 0); c.lookAt(look[0], look[1], look[2]);
    if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
  }
  /** World position of an Object3D in game coordinates (the world root is mirrored). */
  wpos(o, out = new THREE.Vector3()) { o.getWorldPosition(out); if (!this.altScene || !this.inAlt) out.x = -out.x; else out.x = -out.x; return out; }
  prompt(action, text, { pulse = true } = {}) {
    const el = this.$.prompt, inp = this.G.input;
    if (!action) { el.className = 'prompt'; this.promptKey = null; return; }
    const key = action + '|' + text + '|' + inp.device + '|' + inp.gamepad.family;
    if (this.promptKey !== key) {
      this.promptKey = key;
      const acts = Array.isArray(action) ? action : [action];
      el.innerHTML = acts.map((a) => glyph(a, inp.device, inp.gamepad.family)).join('<span style="opacity:.7">+</span>') + `<span>${text}</span>`;
    }
    el.className = 'prompt on' + (pulse ? ' pulse' : '');
  }
  caption(text, secs = 3) {
    const el = this.$.caption;
    if (!text) { el.className = 'caption'; return; }
    el.textContent = text; el.className = 'caption on';
    this.captionT = secs;
  }
  flash(secs = 0.25) { this.$.flash.className = 'flash on'; this.flashT = secs; }
  black(on, text = '') { this.$.black.textContent = text; this.$.black.className = 'black' + (on ? ' on' : ''); }
  pressed(a) { return this.G.input.pressed(a); }
  /** Sets the Mecha's scale (and keeps Gus his own size on its head). */
  setScale(s) { this.mecha.root.scale.setScalar(s); if (this.gusMesh) this.gusMesh.scale.setScalar(1.5 / s); }   // Gus a touch larger than life up there, so he reads
  /** Moves the Mecha out of the Workshop scaffold and into the park (or another parent). */
  takeMecha(parent = this.group) {
    const m = this.mecha;
    this.G.workshop.offStage = true;
    parent.add(m.root);
    m.setParts(['body', 'talons', 'legs', 'wings', 'eyes', 'beak', 'voice', 'power']);
    for (const list of Object.values(this.G.workshop.parts)) for (const g of list) g.position.copy(g.userData.home);
  }
  /** Back where it belongs: the Workshop's scaffold (before the finale) or the Great Lawn (after it). */
  homeMecha() {
    const G = this.G, m = this.mecha;
    if (this.st.flags.finale) {
      this.group.add(m.root);
      const p = this.monument();
      m.root.position.set(p.x, p.y, p.z); m.root.rotation.set(0, p.yaw, 0);
      this.setScale(GIANT);
      m.setParts(['body', 'talons', 'legs', 'wings', 'eyes', 'beak', 'voice', 'power']);
      m.pose('stand', 0);
      G.workshop.offStage = true;
      this.monumentOn = true;
    } else {
      G.workshop.scaffold.add(m.root);
      m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0);
      this.setScale(1);
      G.workshop.offStage = false;
      G.workshop.restore();
      this.monumentOn = false;
    }
    if (this.gusMesh) this.gusMesh.visible = false;
  }
  /** Where the Mecha stands after the finale: the Great Lawn, facing south. */
  monument() { const x = -8, z = 472; return { x, z, y: this.G.terrain.heightAt(x, z), yaw: Math.PI * 0.92 }; }

  // ---------------------------------------------------------------- run
  start(done) {
    const G = this.G;
    if (this.running) return;
    this.running = true;
    this.done = done;
    this.T = 0;
    document.body.classList.add('finale');
    G.closeMenus?.();
    G.dialogue.clear?.();
    G.tutor(null);
    this.gusWasVisible = G.gus.root.visible;
    if (G.gus.mode !== 'walk') G.gus.place({ x: G.gus.position.x, z: G.gus.position.z, yaw: G.gus.yaw, mode: 'walk' });
    this.savedLeader = G.leader;
    G.cutscene.run('finale', [{ until: () => this.stage === 'done' }], () => { if (this.stage !== 'done') this.abort(); });
    this.go('doors');
  }

  go(stage) {
    const G = this.G;
    const prev = this.stage;
    if (prev && this.parts[prev]?.end) this.parts[prev].end();
    this.stage = stage;
    this.t = 0;
    this.prompt(null);
    this.caption(null);   // polish (P16): a caption never carries over into the next stage
    if (stage === 'doors') this.#doorsStart();
    else if (stage === 'biggify') this.parts.biggify.start();
    else if (stage === 'stomp') this.parts.stomp.start();
    else if (stage === 'climb') this.parts.climb.start();
    else if (stage === 'shout' || stage === 'credits' || stage === 'sting') this.parts.shout.start(stage);
    else if (stage === 'done') this.#finish();
    G.bus.emit('finale', { stage });
  }

  update(dt) {
    const G = this.G;
    if (this.monumentOn && !this.running) { this.mecha.ventGlow(G.state.time); this.mecha.pose('stand', G.state.time * 0.6); }
    if (!this.running) return;
    this.t += dt; this.T += dt;
    if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.$.flash.className = 'flash';
    if (this.captionT > 0 && (this.captionT -= dt) <= 0) this.$.caption.className = 'caption';
    if (G.gus.root.visible && this.stage !== 'doors') G.gus.root.visible = false;
    const s = this.stage;
    let next = null;
    if (s === 'doors') next = this.#doorsUpdate(dt) ? 'biggify' : null;
    else if (s === 'biggify') next = this.parts.biggify.update(dt) ? 'stomp' : null;
    else if (s === 'stomp') next = this.parts.stomp.update(dt) ? 'climb' : null;
    else if (s === 'climb') next = this.parts.climb.update(dt) ? 'shout' : null;
    else if (s === 'shout') next = this.parts.shout.update(dt) ? 'credits' : null;
    else if (s === 'credits') next = this.parts.shout.update(dt) ? 'sting' : null;
    else if (s === 'sting') next = this.parts.shout.update(dt) ? 'done' : null;
    if (next) this.go(next);
  }

  music() {
    if (!this.running) return null;
    const s = this.stage;
    if (s === 'doors' || s === 'biggify' || s === 'stomp' || s === 'climb') return 'finale';
    if (s === 'credits') return 'title';
    return null;
  }
  napBlock() { return this.running ? 'Not now' : null; }

  // ---------------------------------------------------------------- doors (≈ 5 s)
  #doorsStart() {
    const G = this.G, d = this.doors.position;
    G.audio.play('heavy-drag-scrape', { vol: 0.8 });
    // playtest: the fixed spot (5.5 m west, 7.5 m south) sat in the Ramble's trees, so the shot was trunks and
    // dithered roots and no doors; pick a clear spot round that direction (G.shot tries angles until nothing's in the way)
    const s = G.shot({ x: d.x, y: d.y + 1.3, z: d.z }, { dist: 9.3, height: 1.8, yaw: Math.atan2(-5.5, -7.5), lookY: 0 });
    this.doorCam = { from: s.pos, look: [d.x, d.y + 1.3, d.z] };
    this.cam([s.pos[0], s.pos[1] + 0.6, s.pos[2]], [d.x, d.y + 1.3, d.z]);
    G.gus.root.visible = true;
  }
  #doorsUpdate() {
    const G = this.G, t = this.t, d = this.doors.position;
    const k = ease(Math.min(1, Math.max(0, (t - 0.6) / 1.6)));
    for (const L of this.doorLeaves) L.hinge.rotation.y = L.sx * k * 1.9;
    this.#glow(k * 0.9);
    if (t > 0.6 && t < 0.62) G.particles.burst('dust', d.x, d.y + 0.3, d.z - 0.6, 18, { spread: 2.2 });
    // a slow push in towards the warm light
    const p = Math.min(1, t / 4.5);
    const f = this.doorCam?.from || [d.x - 5.5, d.y + 2.4, d.z - 7.5];
    this.cam([f[0] + (d.x - f[0]) * p * 0.42, f[1] + 0.6 - p * 0.5, f[2] + (d.z - f[2]) * p * 0.42], [d.x, d.y + 1.3, d.z]);
    if (t > 2.6 && !this.saidDoors) { this.saidDoors = true; G.bubbles.add('Rigby: "Get in here, boss. She\'s ready."', { at: { x: d.x, y: d.y + 2.6, z: d.z }, ttl: 2.2 }); G.audio.voice('rigby-greeting', { vol: 0.9 }); }
    return t > 4.6;
  }

  // ---------------------------------------------------------------- the end: free roam, won
  #finish() {
    const G = this.G, st = this.st;
    this.running = false;
    this.prompt(null); this.caption(null);
    document.body.classList.remove('finale');
    document.body.classList.add('after-finale'); setTimeout(() => document.body.classList.remove('after-finale'), 2600);   // polish (P17)
    for (const k of ['flash', 'black', 'shout', 'credits', 'sting', 'skip']) this.$[k].className = k;
    G.altView = null;
    G.leader = this.savedLeader || G.leader;
    for (const p of Object.values(this.parts)) p.cleanup?.();
    // the won state: sunny, every sign flipped for good, a huge flock
    st.flags.won = true;
    st.flags.finale = true;   // (the scheme engine sets it too, when done() runs below)
    st.phase = 'afternoon';
    G.setPhase('afternoon'); G.humans.setPhase('afternoon'); G.rangers.setPhase('afternoon'); G.street.setPhase('afternoon');
    for (const m of G.mods) m.setPhase?.('afternoon');
    for (const id of Object.keys(st.signs)) Object.assign(st.signs[id], { flipped: true, permanent: true, revertAt: 0 });
    for (const r of Object.keys(st.carts || {})) st.carts[r] = true;
    G.signs.refresh();
    st.flockFrom.everyone = 120;
    G.flock.setRoster(st.flockFrom);
    this.homeMecha();
    // Gus by the Mecha on the Great Lawn
    const p = this.monument();
    G.gus.root.visible = true;
    G.gus.place({ x: p.x + 9, z: p.z - 14, yaw: Math.PI, mode: 'walk' });
    G.flock.place(G.leader());
    G.rig.setFree(null); G.rig.yaw = Math.PI * 0.85; G.rig.pitch = 0.1;
    G.rig.update(G.DT, G.gus, { snap: true, collision: G.collision });
    G.toast('The park is yours. Free roam: every sign flipped, every crew home.', { kind: 'stamp', seconds: 6 });
    G.hud.show(true);
    const d = this.done; this.done = null;
    d?.();
    G.saveNow();
    this.stage = 'done';
  }

  /** The finale was interrupted (quit to title, a fixture load): put everything back. */
  abort() {
    const G = this.G;
    if (!this.running) return;
    this.running = false;
    this.stage = null;
    for (const p of Object.values(this.parts)) p.cleanup?.();
    G.altView = null;
    G.leader = this.savedLeader || G.leader;
    document.body.classList.remove('finale');
    this.prompt(null); this.caption(null);
    for (const k of ['flash', 'black', 'shout', 'credits', 'sting', 'skip']) this.$[k].className = k;
    for (const L of this.doorLeaves) L.hinge.rotation.y = 0;
    this.#glow(0);
    G.gus.root.visible = true;
    this.homeMecha();
    G.schemes.busy.delete('finale');
    this.done = null;
  }

  restore() {
    if (this.running) this.abort();
    for (const L of this.doorLeaves) L.hinge.rotation.y = this.st.flags.finale ? 1.9 : 0;
    this.#glow(this.st.flags.finale ? 0.6 : 0);
    this.homeMecha();
  }

  /** Debug and screenshots (never inside a solution): jump straight into a stage. */
  goTo(stage) {
    const G = this.G;
    if (!STAGES.includes(stage)) throw new Error('no finale stage ' + stage);
    if (!this.running) {
      G.cutscene.skip();
      this.start(null);
    }
    if (stage !== 'doors' && stage !== 'biggify') { this.takeMecha(); this.setScale(GIANT); }
    if (stage === 'shout') { this.parts.climb.enterScene(); this.parts.climb.atTop(); }
    if (stage === 'credits' || stage === 'sting') this.parts.climb.cleanup();
    this.go(stage);
    G.update(0);
    G.render();
    return stage;
  }

  debug() { return { stage: this.stage, t: +this.t.toFixed(2), T: +this.T.toFixed(2), running: this.running, ...(this.parts[this.stage]?.debug?.() || {}) }; }
}

export async function installFinale(G) {
  const F = new Finale(G);
  G.finale = F;
  await F.build();
  G.mods.push(F);
  G.world.add(F.group);
  return F;
}
