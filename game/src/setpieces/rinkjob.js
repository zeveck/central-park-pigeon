// The Rink Job (part-talons step 3): the chain reaction, beat by beat
// ("Showpieces"). Physics-lite: fixed arcs and tweens on the 1/60 s game
// clock, every number derived from layout.js RINK, so a recorded solution
// replays it exactly.
//   0. Lift-off (vehicles.js flies the fixed arc, slow in its middle 0.6 s):
//      a side camera, Ringo clinging to the back, the rink's PA waltz.
//   1. Pancake: the Zamboni lands square on the South ranger cart, which
//      flattens like a soda can; its hubcap pings off and rolls a long,
//      wobbling circle (the camera follows it); its horn jams into one long honk.
//   2. Door: the bounce rolls the Zamboni into the shed's steel roll-up door,
//      which folds in the middle and drops. Gus tumbles out onto the ice.
//   3. Avalanche: Prickett's pallets of spike strips burst out through the
//      now-clear north gate and skate across the ice in a long glittering fan.
//   4. Strike: the lead strips bowl into the rink's stack of orange training
//      cones: STRIKE! (the PA). The last strip spins slowly to a stop at Gus's feet.
//   5. Tag: the rest slide into a heap against the south boards. Rigby strolls
//      up: "Union'll handle it." The Night Crew loads the heap onto the
//      flattened cart and sleds it out of the north gate in a conga line, Mama
//      Mask steering ("Mind the paintwork."): the Talons go to the Workshop. A
//      light in the Dairy, a ranger peers out, sees nothing, switches it off.
//      Prickett's clipboard flutters down onto the ice. The stamps. The Zamboni
//      is left parked on the ice by the north gate.
// Next Morning: Prickett in front of the folded door: "This park is IMPOSSIBLE!" He leaves for good.
// A dozen stray strips stay glittering on the ice afterwards (decoration).
import * as THREE from 'three';
import { RINK } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { L, bubbleOver, bubbleHuman, face } from '../schemes/_sf-common.js';
import { addShaderPatch } from '../anim/shader-patch.js';

const N = 92, LEAD = 6, STRAYS = 12;   // Fixes-3 (R8): twice the strips in the avalanche (46 read thin)
const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = (k) => 1 - (1 - k) * (1 - k);
const DAIRY = { x: 12.2, z: 103 };

export async function installRinkJob(G) {
  const E = G.schemes, V = G.vehicles;
  const group = new THREE.Group();
  group.name = 'rinkjob';
  const ICE = () => (RINK.groundY ?? G.terrain.heightAt(RINK.x, RINK.z)) + RINK.iceY;
  const S = RINK.shed, C = RINK.cartSpot;
  const doorZ = S.z - S.d / 2;
  const mats = {
    strip: ruleMaterial({ color: 0xc4302b }), spike: ruleMaterial({ color: 0xdfe4e8, metalness: 0.6, roughness: 0.3 }),
    hub: ruleMaterial({ color: 0xd4dadf, metalness: 0.75, roughness: 0.22 }), steel: ruleMaterial({ color: 0x8e949a, metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide }),
    rib: ruleMaterial({ color: 0x2c3229 }), board: ruleMaterial({ color: 0x8a6a44 }), paper: ruleMaterial({ color: 0xf2efe6 }),
    window: new THREE.MeshBasicMaterial({ color: 0x2a2a30 }),
  };
  // ---------------------------------------------------------------- the pieces
  // the strips: one instanced red strip + one instanced row of steel spikes
  const stripGeo = new THREE.BoxGeometry(0.95, 0.035, 0.15).translate(0, 0.02, 0);
  const spikeGeo = new THREE.BoxGeometry(0.9, 0.06, 0.04).translate(0, 0.07, 0);
  const strips = new THREE.InstancedMesh(stripGeo, mats.strip, N), spikes = new THREE.InstancedMesh(spikeGeo, mats.spike, N);
  for (const m of [strips, spikes]) { m.frustumCulled = false; m.castShadow = true; m.visible = false; group.add(m); }
  const st = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, yaw: 0, on: false }));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _zero = new THREE.Vector3(0, 0, 0);
  const commitStrips = () => {
    for (let i = 0; i < N; i++) {
      const s = st[i];
      _m.compose(_v.set(s.x, s.y, s.z), _q.setFromEuler(_e.set(0, s.yaw, 0)), s.on ? _one : _zero);
      strips.setMatrixAt(i, _m); spikes.setMatrixAt(i, _m);
    }
    strips.instanceMatrix.needsUpdate = true; spikes.instanceMatrix.needsUpdate = true;
  };
  // the training cones (a 4-3-2-1 stack, pointing toward the north gate)
  const coneB = await G.registry.baked('traffic-cone');
  const cones = [];
  {
    const bb = coneB?.bounds, s = coneB ? 0.55 / (bb.max.y - bb.min.y) : 1;
    let k = 0;
    for (let row = 0; row < 4; row++) for (let j = 0; j <= row; j++) {
      const holder = new THREE.Group(), inner = new THREE.Group();
      const mesh = coneB ? new THREE.Mesh(coneB.geometry, coneB.makeMaterial()) : new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 10).translate(0, 0.27, 0), ruleMaterial({ color: 0xff7a2a }));
      if (coneB) { mesh.scale.setScalar(s); mesh.position.y = -bb.min.y * s; }
      mesh.castShadow = true; inner.add(mesh); inner.scale.x = -1; holder.add(inner); group.add(holder);
      const home = { x: RINK.cones.x + (j - row / 2) * 0.42, z: RINK.cones.z - row * 0.38 };
      cones.push({ holder, home, k: k++ });
    }
  }
  const placeCones = (struck) => {
    for (const c of cones) {
      if (!struck) { c.holder.position.set(c.home.x, ICE(), c.home.z); c.holder.rotation.set(0, 0, 0); continue; }
      const a = -2.2 + hash(c.k, 3) * 2.6, d = 1.6 + hash(c.k, 4) * 3.2;   // where each one lies after the strike
      c.holder.position.set(c.home.x + Math.sin(a) * d, ICE() + 0.12, c.home.z - 1 + Math.cos(a) * d * 0.5);
      c.holder.rotation.set(Math.PI / 2, hash(c.k, 5) * 6.28, 0, 'YXZ');
    }
  };
  // the hubcap, the folded door, the Dairy's window, Prickett's clipboard
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 22).rotateZ(Math.PI / 2), mats.hub);
  hub.castShadow = true; hub.visible = false; group.add(hub);
  const fold = new THREE.Group(); fold.visible = false; group.add(fold);
  const panelGeo = new THREE.BoxGeometry(3, 1.25, 0.08);
  const lower = new THREE.Group(), upper = new THREE.Group();
  const lp = new THREE.Mesh(panelGeo.clone().translate(0, 0.625, 0), mats.steel), upm = new THREE.Mesh(panelGeo.clone().translate(0, -0.625, 0), mats.steel);
  lp.castShadow = upm.castShadow = true; lower.add(lp); upper.add(upm);
  for (let k = 1; k < 3; k++) { const r1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.03, 0.1), mats.rib); r1.position.y = k * 0.42; lower.add(r1); const r2 = r1.clone(); r2.position.y = -k * 0.42; upper.add(r2); }
  fold.add(lower, upper);
  const poseFold = (a, drop = 0) => {
    // hinge lines: bottom (lower panel) and top (upper panel); the middle buckles inward (+z: into the shed)
    const gy = G.terrain.heightAt(S.x, doorZ);
    lower.position.set(0, 0, 0); lower.rotation.x = a;
    upper.position.set(0, 2.5, 0); upper.rotation.x = -a;
    const mid = 1.25 * Math.cos(a);
    upper.position.y = 2.5 - (1.25 - mid) * 2 * (1 - drop) - 2.5 * drop * 0.98;
    fold.position.set(S.x, gy - drop * 0.02, doorZ + drop * 0.9);
    fold.rotation.x = drop * Math.PI / 2 * 0.97;
  };
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), mats.window);
  win.rotation.y = -Math.PI / 2; win.position.set(DAIRY.x + 0.04, G.terrain.heightAt(6.6, 103) + 2.3, DAIRY.z - 1.2); group.add(win);
  const lamp = new THREE.PointLight(0xffd27a, 0, 12, 1.6); lamp.position.set(DAIRY.x + 1.2, win.position.y, win.position.z); group.add(lamp);
  const clip = new THREE.Group();
  const cb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.018, 0.36), mats.board), pp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.28), mats.paper);
  pp.position.y = 0.006; clip.add(cb, pp); clip.visible = false; group.add(clip);

  // ---------------------------------------------------------------- Polish-1: the rink lit for the Night (visual only)
  // Four floodlight masts outside the corners (no collision), glowing heads with soft additive beams, a pool of
  // light on the ice (an additive overlay, so the ice reads bright and the strips stand out on it), and a cool
  // fresnel rim on the Zamboni, the cart and the frozen ramps so their shapes read against the dark.
  const lit = new THREE.Group(); lit.name = 'rink-floodlights'; group.add(lit);
  {
    const poleMat = ruleMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.4 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const H = 10;
    const corners = [[RINK.ice.x0 - 1.6, RINK.ice.z0 - 1.6], [RINK.ice.x1 + 1.6, RINK.ice.z0 - 1.6], [RINK.ice.x0 - 1.6, RINK.ice.z1 + 1.6], [RINK.ice.x1 + 1.6, RINK.ice.z1 + 1.6]];
    for (const [x, z] of corners) {
      const gy = G.terrain.heightAt(x, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, H, 8).translate(0, H / 2, 0), poleMat);
      pole.position.set(x, gy, z); pole.castShadow = true; lit.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.35), headMat);
      head.position.set(x, gy + H + 0.2, z);
      head.rotation.y = Math.atan2(RINK.x - x, RINK.z - z); head.rotation.x = 0.5; lit.add(head);
      // the beam: a cone from the head down to a spot a third of the way to the rink's centre
      const tx = x + (RINK.x - x) * 0.38, tz = z + (RINK.z - z) * 0.38, ty = ICE();
      const len = Math.hypot(tx - x, ty - (gy + H), tz - z);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(5.2, len, 20, 1, true).translate(0, -len / 2, 0), beamMat);
      beam.position.copy(head.position);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(tx - x, ty - (gy + H), tz - z).normalize());
      beam.renderOrder = 2; lit.add(beam);
    }
    // the light on the ice: four soft pools and a gentle lift everywhere
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 180;
    const g2 = cv.getContext('2d');
    g2.fillStyle = 'rgb(70,78,92)'; g2.fillRect(0, 0, 256, 180);
    g2.globalCompositeOperation = 'lighter';
    for (const [u, v] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7], [0.5, 0.5]]) {
      const gr = g2.createRadialGradient(u * 256, v * 180, 0, u * 256, v * 180, 120);
      gr.addColorStop(0, 'rgba(150,160,175,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 256, 180);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(RINK.w, RINK.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 }));
    pool.position.set(RINK.x, ICE() + 0.004, RINK.z); pool.renderOrder = 1;
    lit.add(pool);
    // and the shed yard north of the boards (the pancake, the hubcap and the door all happen out there)
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(30, 12).rotateX(-Math.PI / 2), pool.material);
    yard.position.set(RINK.x + 1, G.terrain.heightAt(RINK.x + 1, RINK.ice.z1 + 6.5) + 0.03, RINK.ice.z1 + 6.5); yard.renderOrder = 1;
    lit.add(yard);
  }
  const rim = { uRim: { value: new THREE.Color(0, 0, 0) } }, rimRamp = { uRim: { value: new THREE.Color(0, 0, 0) } };
  const rimPatch = (u, key) => ({
    key, uniforms: u, fragmentHeader: 'uniform vec3 uRim;',
    fragmentReplace: [['#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  { float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))); totalEmissiveRadiance += uRim * pow(fr, 2.2); }']],
  });
  for (const id of ['zamboni']) V.byId[id]?.body.traverse((o) => { if (o.isMesh) addShaderPatch(o.material, rimPatch(rim, 'rim')); });
  G.rangers.cart?.('south')?.holder.traverse((o) => { if (o.isMesh && !o.material.userData.shaderPatches) addShaderPatch(o.material, rimPatch(rim, 'rim')); });
  if (V.mats?.ramp) addShaderPatch(V.mats.ramp, rimPatch(rimRamp, 'rim'));
  // Fixes-2: the raccoons (the Night Crew's named members and their crowd) were near-black shapes on the dark ice at
  // Night: a warm rim and a little lift so they read (everywhere at Dusk and Night: it's their hours)
  const rimRac = { uRim: { value: new THREE.Color(0, 0, 0) } };
  {
    const mats = new Set();
    for (const c of G.chars.list || []) if (c.look?.species === 'raccoon') c.root?.traverse((o) => { if (o.isMesh && o.material) mats.add(o.material); });
    G.crowds?.group?.traverse((o) => { if (o.isMesh && /raccoon/.test(o.name) && o.material) mats.add(o.material); });
    for (const m of mats) if (!(m.userData.shaderPatches || []).some((p) => p.key === 'rim-rac')) addShaderPatch(m, rimPatch(rimRac, 'rim-rac'));
  }
  const lightFor = (phase) => {
    const night = phase === 'night' ? 1 : phase === 'dusk' ? 0.45 : 0;
    lit.visible = night > 0;
    lit.children.forEach((o) => { if (o.material?.blending === THREE.AdditiveBlending && o.material.map) o.material.opacity = 0.36 * night; });
    rim.uRim.value.setRGB(0.26, 0.4, 0.65).multiplyScalar(night);
    rimRamp.uRim.value.setRGB(0.35, 0.6, 0.85).multiplyScalar(night);
    rimRac.uRim.value.setRGB(0.3, 0.33, 0.42).multiplyScalar(night);
  };

  // ---------------------------------------------------------------- the strips' routes (fixed, from the layout)
  const routes = Array.from({ length: N }, (_, i) => {
    const s = { x: S.x - 1.2 + hash(i, 1) * 2.4, z: doorZ + 0.8 + hash(i, 2) * 1.6 };
    const g = { x: RINK.northGate.x - 2.6 + hash(i, 6) * 5.2, z: RINK.ice.z1 - 0.3 };
    let e, kind = 'heap';
    if (i < LEAD) { e = { x: RINK.cones.x - 0.5 + hash(i, 7) * 1.0, z: RINK.cones.z + 0.6 + hash(i, 8) * 0.6 }; kind = 'lead'; }
    else if (i === N - 1) { e = { x: RINK.x + 2.3, z: RINK.ice.z1 - 3.1 }; kind = 'last'; }
    else if (i >= N - 1 - STRAYS) { e = { x: RINK.ice.x0 + 3 + hash(i, 9) * (RINK.w - 6), z: RINK.ice.z0 + 5 + hash(i, 10) * (RINK.d - 11) }; kind = 'stray'; }
    else { e = { x: RINK.x + 2 + hash(i, 11) * 7, z: RINK.ice.z0 + 0.7 + hash(i, 12) * 1.6 }; }
    const t0 = kind === 'lead' ? i * 0.05 : kind === 'last' ? 2.1 : 0.25 + hash(i, 13) * 1.6;
    const len = Math.hypot(g.x - s.x, g.z - s.z) + Math.hypot(e.x - g.x, e.z - g.z);
    const dur = kind === 'last' ? 3.4 : kind === 'lead' ? len / 11.5 : len / (8 + hash(i, 14) * 4);
    return { s, g, e, kind, t0, dur, spin: (hash(i, 15) - 0.5) * 14 + (kind === 'last' ? 6 : 0) };
  });
  const strikeAt = Math.min(...routes.filter((r) => r.kind === 'lead').map((r) => r.t0 + r.dur));
  const strayPose = () => { for (let i = 0; i < N; i++) { const r = routes[i]; st[i].on = r.kind === 'stray' || r.kind === 'last'; st[i].x = r.e.x; st[i].z = r.e.z; st[i].y = ICE(); st[i].yaw = r.spin; } commitStrips(); strips.visible = spikes.visible = true; };

  // ---------------------------------------------------------------- the runner (game clock)
  const R = { t: 0, on: false, follow: null, aval: null, convoy: null, hub: null, clipT: null };
  const bez = (a, b, c, k) => ({ x: (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * b.x + k * k * c.x, z: (1 - k) * (1 - k) * a.z + 2 * (1 - k) * k * b.z + k * k * c.z });

  // lift-off: a side camera along the arc
  G.bus.on('zamboniLaunchStart', (t, e) => { if (e.lane) R.liftCam = true; });

  E.registerScript('setpiece.rinkjob', (ctx, done) => {
    const v = V.byId.zamboni, cart = G.rangers.cart('south');
    const ice = ICE();
    const gy = G.terrain.heightAt(C.x, C.z);
    const top0 = v.y;
    R.on = true; R.liftCam = false;
    v.scripted = true;
    const ringo = G.chars.find('ringo');
    const crew = ['rigby', 'socket', 'ringo', 'mamamask'].map((id) => G.chars.find(id)).filter(Boolean);
    const hornLoop = { h: null };
    const gusAt = { x: RINK.x + 2.3, z: RINK.ice.z1 - 2.4 };
    G.cutscene.run('rinkjob', [
      // ---- 1. pancake
      { do: () => {
        G.shake(0.32, 0.7); G.hitPause(0.1);
        G.sfTween(0.22, (k) => { cart.holder.scale.set(-(1 + 0.12 * k), 1 - 0.72 * k, 1 + 0.1 * k); v.y = top0 - (top0 - (gy + 0.62)) * k; V.pose(v); });
        G.particles.burst('dust', C.x, gy + 0.6, C.z, 30, { spread: 2.2 });
        G.audio.play('launch-crunch', { at: C, rate: 0.85 });
        if (ringo) { ringo.script = true; G.chars.moveTo(ringo, { x: C.x - 2.2, z: C.z - 1.8, y: ice }, { kind: 'hop', secs: 0.8 }); }
      } },
      { cam: { pos: [C.x - 6.5, gy + 3.2, C.z - 6], look: [C.x, gy + 0.8, C.z], secs: 0.3 } },
      { wait: 0.6 },
      { do: () => {
        // the hubcap pings off and rolls a long, wobbling circle; the horn jams
        G.audio.play('hubcap-clang', { at: C });
        hornLoop.h = G.audio.loop('cab-horn', { vol: 0.45 });
        hub.visible = true;
        R.hub = { t: 0, c: { x: C.x - 5.2, z: C.z + 4.6 }, r: 2.6 };
      } },
      // polish (P14): this shot looked at the hubcap's circle alone (an empty plaza, the Zamboni cut off at the edge for
      // 2.6 s); it now stands back far enough for the pancaked cart, the Zamboni and the rolling hubcap together
      { get cam() {
        const mid = { x: C.x - 2.6, y: gy, z: C.z + 2.3 };
        return { ...G.shot(mid, { dist: 10.5, height: 3.6, yaw: Math.atan2(-0.66, -0.75), lookY: 0.5 }), secs: 0.5 };
      } },
      { wait: 2.6 },
      // ---- 2. the door folds
      { do: () => {
        const from = { x: v.x, y: v.y, z: v.z }, to = { x: C.x, y: gy, z: doorZ - 1.15 };
        G.sfTween(0.55, (k) => { v.x = from.x + (to.x - from.x) * k; v.z = from.z + (to.z - from.z) * k; v.y = from.y + (to.y - from.y) * k + Math.sin(Math.PI * k) * 0.7; v.tilt = -0.18 * Math.sin(Math.PI * k); V.pose(v); });
        const d = G.clues.doors.find((q) => q.def.id === 'rink-shed');
        G.later(0.45, () => {
          if (d) d.g.visible = false;
          fold.visible = true;
          G.audio.play('shed-door-fold', { at: S }); G.shake(0.25, 0.5);
          G.particles.burst('dust', S.x, gy + 1.2, doorZ, 30, { spread: 2.5 });
          G.sfTween(0.5, (k) => poseFold(ease(k) * 1.15, 0), () => G.sfTween(0.45, (k) => poseFold(1.15 + 0.4 * k, k * k)));
          G.clues.openDoor('rink-shed', { quiet: true });
        });
      } },
      { cam: { pos: [S.x - 4.5, gy + 2.6, doorZ - 6.5], look: [S.x, gy + 1.2, doorZ], secs: 0.5 } },
      { wait: 1.5 },
      { do: () => {
        // Gus tumbles out onto the ice by the north gate
        hornLoop.h?.setVolume(0.2);
        V.exit();
        G.gus.place({ x: gusAt.x, z: gusAt.z, y: ice + 0.02, yaw: Math.PI, mode: 'walk' });
        G.flock.place?.(G.leader());
        G.particles.burst('feathers', gusAt.x, ice + 0.3, gusAt.z, 12);
        G.audio.play('landing', { at: gusAt });
      } },
      // ---- 3. the avalanche
      { do: () => {
        G.state.flags['cart.south'] = true;   // the north gate swings open (DOORS rink-north-gate)
        G.audio.play('strip-avalanche', { at: { x: RINK.x, z: RINK.ice.z1 } });
        R.aval = { t: 0, struck: false };
        strips.visible = spikes.visible = true;
      } },
      { cam: { pos: [RINK.ice.x1 + 6, ice + 11, RINK.ice.z0 + 4], look: [RINK.x + 2, ice, RINK.z + 4], secs: 0.9 } },
      { until: () => R.aval?.t > strikeAt - 0.6 },
      // ---- 4. the strike
      { cam: { pos: [RINK.cones.x + 4.6, ice + 2.4, RINK.cones.z - 1.9], look: [RINK.cones.x - 0.4, ice + 0.3, RINK.cones.z + 0.6], secs: 0.5 } },   // Polish-1: from the south boards, so the kids' ice bump isn't in front of the cones
      { until: () => R.aval?.struck },
      { wait: 2.0 },
      { cam: { pos: [gusAt.x + 1.6, ice + 1.1, gusAt.z - 2.4], look: [gusAt.x, ice + 0.15, gusAt.z - 0.8], secs: 0.8 } },
      { until: () => R.aval?.t > routes[N - 1].t0 + routes[N - 1].dur + 0.6 },
      // ---- 5. the tag
      { do: () => {
        hornLoop.h?.stop(); hornLoop.h = null;
        crew.forEach((c, i) => { c.script = true; c.here = { x: c.x, z: c.z, scripted: true }; const p = { x: RINK.x + 4 + i * 0.9, z: RINK.ice.z0 + 3.4, y: ice }; G.chars.arrive(c, p, 'drain', 1.6 + i * 0.2); });
      } },
      { cam: { pos: [RINK.x + 6, ice + 2.6, RINK.ice.z0 + 9], look: [RINK.x + 5, ice + 0.3, RINK.ice.z0 + 1.5], secs: 0.8 } },
      { wait: 2.0 },
      { do: () => { const r = G.chars.find('rigby'); if (r) { face(r, { x: RINK.x + 5, z: RINK.ice.z0 + 1 }); G.chars.animate(r, 'cheer', 1); } } },
      { say: [L('rigby', 'Well, well. Prickett\'s whole stock. On OUR ice.'), L('rigby', 'Union\'ll handle it.')] },
      { do: () => {
        // the flattened cart sleds over to the heap; the crew loads it
        const path = [{ x: C.x, z: C.z }, { x: RINK.northGate.x, z: RINK.ice.z1 + 1 }, { x: RINK.northGate.x, z: RINK.ice.z1 - 3 }, { x: RINK.x + 5.5, z: RINK.ice.z0 + 4 }];
        R.convoy = { path, i: 0, x: C.x, z: C.z, speed: 9, phase: 'fetch', crew };
        G.audio.play('heavy-drag-scrape', { at: C });
      } },
      { cam: { pos: [RINK.ice.x1 + 4, ice + 9, RINK.z - 4], look: [RINK.x + 3, ice, RINK.z + 2], secs: 0.8 } },
      { until: () => R.convoy?.phase === 'loaded' },
      { do: () => {
        // and out of the north gate in a conga line, Mama Mask steering
        R.convoy.path = [{ x: RINK.x + 5.5, z: RINK.ice.z0 + 4 }, { x: RINK.northGate.x, z: RINK.ice.z1 - 3 }, { x: RINK.northGate.x, z: RINK.ice.z1 + 3 }, { x: RINK.northGate.x - 16, z: RINK.ice.z1 + 9 }];
        R.convoy.i = 0; R.convoy.phase = 'out'; R.convoy.speed = 5.2;
        const mm = G.chars.find('mamamask');
        G.later(0.6, () => bubbleOver(G, mm, 'Mind the paintwork.', 2.6, 0.6));
        G.audio.play('raccoon-chitter', { at: { x: RINK.x, z: RINK.z } });
      } },
      { cam: { pos: [RINK.x - 9, ice + 3.5, RINK.z + 2], look: [RINK.northGate.x + 2, ice + 0.4, RINK.ice.z1 - 2], secs: 0.8 } },
      { wait: 3.2 },
      { say: [L('mamamask', 'Mind the paintwork.'), L('ringo', 'BEST. NIGHT. EVER.')] },
      { do: () => { lamp.intensity = 9; mats.window.color.setHex(0xffd98a); G.audio.play('ranger-tut', { at: DAIRY, vol: 0.5 }); } },
      { cam: { pos: [DAIRY.x + 9, G.terrain.heightAt(6.6, 103) + 3, DAIRY.z - 6], look: [DAIRY.x, G.terrain.heightAt(6.6, 103) + 2.2, DAIRY.z - 1.2], secs: 0.7 } },
      { do: () => G.bubbles.add('…?', { kind: 'clue', at: { x: DAIRY.x + 0.4, y: win.position.y + 0.6, z: win.position.z }, ttl: 1.8, range: 80 }) },
      { wait: 1.9 },
      { do: () => { lamp.intensity = 0; mats.window.color.setHex(0x2a2a30); } },
      { wait: 0.6 },
      { do: () => { clip.visible = true; R.clipT = 0; } },
      { cam: { pos: [gusAt.x + 2.4, ice + 1.6, gusAt.z - 3.2], look: [gusAt.x - 0.4, ice + 0.8, gusAt.z - 1.2], secs: 0.6 } },
      { wait: 2.6 },
      { do: () => {
        G.signs.sabotage('south');
        G.audio.play('permanent-stamp');
        G.toast('+ Spikes: Prickett\'s stock busted', { kind: 'stamp', seconds: 4 });
        G.later(1.0, () => { G.audio.play('permanent-stamp'); G.toast('South signs PERMANENT', { kind: 'stamp', seconds: 4 }); });
        G.later(2.0, () => { G.audio.play('part-fanfare'); });   // polish (P3): the Workshop cutaway names the part
      } },
      { wait: 2.8 },
      { do: () => {
        V.park(v, RINK.parking);
        cart.holder.visible = false;
        for (const c of crew) G.chars.goHome(c);
        R.convoy = null; R.on = false;
        strayPose();
      } },
      { follow: true },
    ], () => { G.state.flags['rink.done'] = true; hornLoop.h?.stop(); done(); },
    // Fixes-3 (B2): dropped mid-job (Save & quit, a load): the jammed horn stops, the Zamboni is drivable again, the
    // crew and the cart are let go; restore() (on the load) puts the rink back as the save has it
    () => { hornLoop.h?.stop(); hornLoop.h = null; v.scripted = false; v.tilt = 0; R.on = false; R.liftCam = false; R.aval = null; R.convoy = null; R.hub = null; R.clipT = null; for (const c of [...crew, ringo]) if (c) c.script = false; cart.holder.scale.set(-1, 1, 1); });
  });

  // ---------------------------------------------------------------- the per-update animation
  let litPhase = null;
  const update = (dt) => {
    const st0 = G.state;
    if (litPhase !== st0.phase) { litPhase = st0.phase; lightFor(litPhase); }
    // lift-off camera: alongside the arc, a little behind (slow motion is the arc's own)
    const z = V.byId.zamboni;
    if (R.liftCam && z?.hop?.lane) G.rig.setFree({ pos: [z.x + 8.5, z.y + 1.6, z.z - 5], look: [z.x, z.y + 1, z.z + 1] });
    if (R.hub) {
      const h = R.hub; h.t += dt;
      const k = Math.min(1, h.t / 3.0), a = h.t * 2.6, wob = 0.15 + 0.9 * k * k;
      const x = h.c.x + Math.cos(a) * h.r * (1 - 0.35 * k), zz = h.c.z + Math.sin(a) * h.r * (1 - 0.35 * k);
      const y0 = G.surfaceY(x, zz, 3);
      const jump = h.t < 0.5 ? Math.sin(Math.PI * h.t / 0.5) * 1.4 : 0;
      hub.position.set(x, y0 + 0.21 * Math.cos(Math.min(1.5, wob)) + jump, zz);
      hub.rotation.set(0, -a, Math.min(1.5, wob) * Math.sin(h.t * 9 * (1 + k)), 'YXZ');
      if (h.t > 3.6) { R.hub = null; hub.position.y = y0 + 0.03; hub.rotation.set(0, 0, Math.PI / 2); }
    }
    if (R.aval) {
      const A = R.aval; A.t += dt;
      const ice = ICE();
      for (let i = 0; i < N; i++) {
        const r = routes[i], s = st[i];
        const k = Math.max(0, Math.min(1, (A.t - r.t0) / r.dur));
        s.on = A.t >= r.t0;
        if (!s.on) continue;
        const e = r.kind === 'last' ? 1 - (1 - k) ** 3 : ease(k);
        const p = bez(r.s, r.g, r.e, e);
        s.x = p.x; s.z = p.z;
        s.y = (G.vehicles.onIce(p.x, p.z) ? ice : G.terrain.heightAt(p.x, p.z) + 0.02) + 0.01 + (k < 0.15 ? Math.sin(k / 0.15 * Math.PI) * 0.4 : 0);
        s.yaw = r.spin * (1 - (1 - e) ** 2) + Math.atan2(r.e.x - r.s.x, r.e.z - r.s.z);
      }
      commitStrips();
      if (G.updates % 6 === 0) { const j = Math.floor(A.t * 10) % N; if (st[j].on) G.particles.burst('sparkle', st[j].x, st[j].y + 0.1, st[j].z, 2, { spread: 0.5, color: [1, 0.85, 0.85] }); }
      if (!A.struck && A.t >= strikeAt) {
        A.struck = true; A.coneT = 0;
        G.audio.play('cone-strike', { at: RINK.cones });
        G.later(0.35, () => G.audio.play('crowd-cheer', { vol: 0.7 }));
        G.shake(0.12, 0.35);
        G.sfStamp?.('STRIKE!');
        G.particles.burst('sparkle', RINK.cones.x, ice + 0.5, RINK.cones.z, 30, { spread: 1.5, color: [1, 0.6, 0.2] });
      }
      if (A.struck && A.coneT < 1.4) {
        A.coneT += dt;
        const k = Math.min(1, A.coneT / 1.2);
        for (const c of cones) {
          const a = -2.2 + hash(c.k, 3) * 2.6, d = 1.6 + hash(c.k, 4) * 3.2;
          c.holder.position.set(c.home.x + Math.sin(a) * d * ease(k), ice + 0.12 * k + Math.sin(Math.PI * k) * (0.8 + hash(c.k, 6) * 1.4), c.home.z + (Math.cos(a) * d * 0.5 - 1) * ease(k));
          c.holder.rotation.set(Math.PI / 2 * ease(k) + (1 - k) * k * 8 * hash(c.k, 7), hash(c.k, 5) * 6.28 * k, 0, 'YXZ');
        }
      }
    }
    if (R.convoy) {
      const c = R.convoy, cart = G.rangers.cart('south');
      const tgt = c.path[c.i];
      if (tgt) {
        const dx = tgt.x - c.x, dz = tgt.z - c.z, d = Math.hypot(dx, dz), step = c.speed * dt;
        const yaw = Math.atan2(dx, dz);
        if (d <= step) { c.x = tgt.x; c.z = tgt.z; c.i++; } else { c.x += (dx / d) * step; c.z += (dz / d) * step; }
        c.yaw = yaw;
      } else if (c.phase === 'fetch') {
        c.phase = 'loading'; c.lt = 0;
      }
      const y = G.vehicles.onIce(c.x, c.z) ? ICE() : G.surfaceY(c.x, c.z, 3);
      cart.holder.position.set(c.x, y, c.z); cart.holder.rotation.y = (c.yaw ?? 0) + Math.PI / 2;
      if (c.phase === 'loading') {
        // the heap jumps onto the flattened cart, strip by strip
        c.lt += dt;
        let left = 0;
        for (let i = 0; i < N; i++) {
          const r = routes[i]; if (r.kind !== 'heap' && r.kind !== 'lead') continue;
          const k = Math.max(0, Math.min(1, (c.lt - (i % 20) * 0.06) / 0.4));
          if (k < 1) left++;
          const s = st[i];
          s.x = r.e.x + (c.x - r.e.x) * k + (hash(i, 20) - 0.5) * 0.8 * k; s.z = r.e.z + (c.z - r.e.z) * k + (hash(i, 21) - 0.5) * 1.4 * k; s.y = ICE() + Math.sin(Math.PI * k) * 0.8 + k * (0.5 + (i % 5) * 0.035);
        }
        commitStrips();
        if (!left && c.lt > 1.5) c.phase = 'loaded';
      }
      if (c.phase === 'out') {
        for (let i = 0; i < N; i++) { const r = routes[i]; if (r.kind !== 'heap' && r.kind !== 'lead') continue; const s = st[i]; s.x = c.x + (hash(i, 20) - 0.5) * 0.8; s.z = c.z + (hash(i, 21) - 0.5) * 1.4; s.y = y + 0.5 + (i % 5) * 0.035; }
        commitStrips();
      }
      // the crew: Mama Mask on top steering, the others in a conga line ahead
      const yawc = c.yaw ?? 0;
      c.crew.forEach((ch, i) => {
        if (ch.tween) return;
        if (ch.def.id === 'mamamask') { ch.x = c.x; ch.z = c.z; ch.y = y + 0.75; ch.yaw = yawc; return; }
        const k = i + 1;
        ch.x = c.x + Math.sin(yawc) * (1.6 + k * 0.85); ch.z = c.z + Math.cos(yawc) * (1.6 + k * 0.85); ch.y = (G.vehicles.onIce(ch.x, ch.z) ? ICE() : G.surfaceY(ch.x, ch.z, 3)); ch.yaw = yawc + Math.sin(G.updates * 0.3 + i) * 0.25;
      });
    }
    if (R.clipT != null) {
      R.clipT += dt;
      const k = Math.min(1, R.clipT / 2.4), ice = ICE();
      clip.position.set(RINK.x + 1.6 + Math.sin(R.clipT * 3.2) * 0.7 * (1 - k), ice + 6.5 * (1 - k) + 0.02, RINK.ice.z1 - 3.4);
      clip.rotation.set(Math.sin(R.clipT * 4) * 0.5 * (1 - k), R.clipT * 0.6, Math.cos(R.clipT * 3.3) * 0.4 * (1 - k));
      if (k >= 1) { R.clipT = null; G.audio.play('paper-rustle', { at: clip.position }); }
    }
    // after the job: the cart's gone, the door lies folded, the cones lie where they fell, stray strips glitter
    if (!R.on && st0.flags['rink.done']) {
      const cart = G.rangers.cart('south');
      if (cart?.holder.visible) cart.holder.visible = false;
      const d = G.clues.doors.find((q) => q.def.id === 'rink-shed');
      if (d?.g.visible) d.g.visible = false;
    }
  };

  const restore = () => {
    const done = !!G.state.flags['rink.done'];
    placeCones(done);
    fold.visible = done; if (done) poseFold(1.55, 1);
    hub.visible = done; if (done) { hub.position.set(C.x - 5.2, G.surfaceY(C.x - 5.2, C.z + 4.6 - 2.6, 3) + 0.03, C.z + 4.6 - 2.6); hub.rotation.set(0, 0, Math.PI / 2); }
    clip.visible = done; if (done) clip.position.set(RINK.x + 1.6, ICE() + 0.02, RINK.ice.z1 - 3.4);
    if (done) strayPose(); else { for (const s of st) s.on = false; commitStrips(); strips.visible = spikes.visible = false; }
    const cart = G.rangers.cart('south');
    if (cart) { cart.holder.visible = !done; cart.holder.scale.set(-1, 1, 1); }
    const d = G.clues.doors.find((q) => q.def.id === 'rink-shed'); if (d) d.g.visible = !done;
    lamp.intensity = 0;
    Object.assign(R, { on: false, aval: null, convoy: null, hub: null, clipT: null, liftCam: false });
  };
  restore();

  // ---------------------------------------------------------------- next Morning: Prickett quits
  let prickettT = 0;
  const onNap = (phase) => {
    const s = G.state;
    if (phase === 'morning' && s.flags['rink.done'] && !s.flags['prickett.gone']) {
      if (s.flags['prickett.lastMorning']) { s.flags['prickett.gone'] = true; return []; }
      s.flags['prickett.lastMorning'] = true;
      const p = G.street.prickett;
      if (p) { p.out = true; p.script = true; p.x = S.x - 0.6; p.z = doorZ - 1.6; p.y = undefined; p.yaw = 0; }
      prickettT = 0;
      return ['Somebody is standing in front of the rink shed\'s door.'];
    }
    return [];
  };
  const tickPrickett = (dt) => {
    const s = G.state, p = G.street.prickett;
    if (!s.flags['prickett.lastMorning'] || s.flags['prickett.gone'] || !p || s.phase !== 'morning') return;
    if (!p.out) { p.out = true; p.script = true; p.x = S.x - 0.6; p.z = doorZ - 1.6; p.yaw = 0; }
    const g = G.gus.position;
    if (prickettT === 0 && Math.hypot(g.x - p.x, g.z - p.z) < 28 && !G.cutscene.running) {
      prickettT = 0.001;
      G.cutscene.run('prickett-quits', [
        { cam: { ...G.shot({ x: p.x, y: G.surfaceY(p.x, p.z, 3) + 1, z: p.z }, { dist: 5.5, height: 1.2, yaw: Math.PI + 0.5, lookY: 0.6 }), secs: 1.0 } },
        { do: () => { G.humans.play(p, 'scold', 2); G.audio.voice('prickett-impossible', { at: p }); bubbleHuman(G, p, 'This park is IMPOSSIBLE!', 2.6); } },
        { wait: 2.6 },
        { say: [L('prickett', 'My whole stock. My DOOR. A ZAMBONI?'), L('prickett', 'That\'s it. I quit. Find yourselves another pest man, birds. Nothing personal.')] },
        { follow: true },
        { do: () => { p.script = false; p.busy = true; G.humans.goTo(p, { x: S.x - 30, z: S.z + 14 }, 1.6, () => { p.out = false; p.busy = false; s.flags['prickett.gone'] = true; }); } },
      ]);
    }
  };

  return {
    group,
    update: (dt) => { update(dt); tickPrickett(dt); },
    restore, onNap,
    setPhase: () => { const d = G.clues.doors.find((q) => q.def.id === 'rink-shed'); if (d && G.state.flags['rink.done']) d.g.visible = false; },
    music: () => (R.on || (G.cutscene.name === 'rinkjob') ? 'rink' : null),
    debug: () => ({ on: R.on, aval: R.aval ? +R.aval.t.toFixed(2) : null, convoy: R.convoy?.phase || null }),
  };
}
