// say-cheese, "Say Cheese" (photo mode, issue #9). The owner: "a little quest" to get a camera, "on a balcony of a
// building outside the park as a way to get you out there for a minute", "film from a crow maybe".
//
//   1  A tourist on a little iron balcony over Central Park West (71st–72nd) snaps the park with his big camera; his
//      old film camera sits on the ledge beside him (the existing ground-floor ledge of that building: a perch edge
//      already, so no new collider and no recorded route changes). While he's watching it, a Peck gets "He's watching
//      his camera". Get IN his shot (stand on the ledge beside him, or in front of his lens, a moment) or Coo near him: he lowers the
//      camera, laughs, and turns to fetch his good lens. Then Peck the old camera (a light carried item; the keeper,
//      data/item-sources.js, floats it back to the ledge if it's lost on step 2).
//   2  Flicker (a crow who hoards film; data/crews.js) loads it for a portrait: give it to Flicker. Gus gets the camera
//      as gear (photo mode opens: ui/photo.js), flag photo.film.
//   3  The first photo is of Flicker: ui/photo.js sets photo.flicker on a snap with Flicker in the picture.
// Everything here is visual or on the bus; the tourist is this file's own clone of the human-tourist model (not a
// humans.js agent), so no swarm, lure, feeder or replay sees him.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { L, onStep, bubbleOver } from './_ssf-common.js';
import { ruleMaterial } from '../gfx/load-model.js';

export const FACE_X = -130;                                   // the CPW building face (city.js FACE.west)
export const CAMERA_AT = { x: -129.6, y: 3.62, z: 262.35 };    // on the ledge (ledge-west-251: x -129.7, y 3.62, z 251.6–271.8)
export const TOURIST = { x: -129.42, y: 3.66, z: 263.75, yaw: Math.PI / 2 };   // on his balcony, facing the park (+x)
const BALCONY = { z0: 262.75, z1: 264.75, out: 1.05, y: 3.62 };
const EYE = 1.55;                     // his eye (and lens) above his feet
const SHOT = { near: 1.2, far: 16, half: 0.55, up: 5, hold: 1.1 };   // his frame: metres in front, half-angle, seconds
const COO_R = 9;                      // a Coo this close (in plan) makes him look

export function installSayCheese(G) {
  const E = G.schemes;
  const flags = () => G.state.flags;
  const group = new THREE.Group();
  group.name = 'say-cheese';
  G.items.group.add(group);

  // ------------------------------------------------------------ the balcony and window (render only: no collider)
  {
    const iron = ruleMaterial({ color: 0x2c3229, roughness: 0.7, metalness: 0.3 });
    const glass = ruleMaterial({ color: 0x1d2630, roughness: 0.25, metalness: 0.2 });
    const frame = ruleMaterial({ color: 0xe9e2d2, roughness: 0.8 });
    const curtain = ruleMaterial({ color: 0xb24a3a, roughness: 0.9 });
    const box = (mat, x, y, z, w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
    const B = BALCONY, cz = (B.z0 + B.z1) / 2, len = B.z1 - B.z0, ox = FACE_X + B.out;
    box(iron, FACE_X + B.out / 2, B.y + 0.03, cz, B.out, 0.06, len);                       // the floor grating
    box(iron, ox, B.y + 0.95, cz, 0.05, 0.05, len + 0.05);                                  // the rail
    for (const z of [B.z0, B.z1]) box(iron, FACE_X + B.out / 2, B.y + 0.95, z, B.out, 0.05, 0.05);
    for (let k = 0; k <= 8; k++) box(iron, ox, B.y + 0.48, B.z0 + (len * k) / 8, 0.03, 0.9, 0.03);   // balusters
    for (const z of [B.z0, B.z1]) for (let k = 1; k < 4; k++) box(iron, FACE_X + (B.out * k) / 4, B.y + 0.48, z, 0.03, 0.9, 0.03);
    box(iron, FACE_X + B.out * 0.5, B.y - 0.25, B.z0 + 0.1, B.out * 1.1, 0.05, 0.05).rotation.z = 0.5;   // a bracket
    box(iron, FACE_X + B.out * 0.5, B.y - 0.25, B.z1 - 0.1, B.out * 1.1, 0.05, 0.05).rotation.z = 0.5;
    // the open French window behind him (a dark pane, a frame, a curtain blowing out)
    box(frame, FACE_X + 0.03, B.y + 1.15, cz, 0.06, 2.3, 1.5);
    box(glass, FACE_X + 0.07, B.y + 1.12, cz, 0.04, 2.15, 1.32);
    box(curtain, FACE_X + 0.12, B.y + 1.2, cz - 0.55, 0.03, 1.9, 0.3).rotation.y = 0.5;
  }

  // ------------------------------------------------------------ the tourist (visual only)
  const T = { holder: null, mixer: null, actions: {}, cur: null, yaw: TOURIST.yaw, mood: 'snap', moodT: 0, flashT: 0 };
  const play = (name, fade = 0.25) => {
    const a = T.actions[name] || T.actions.idle;
    if (!a || T.cur === a) return;
    a.reset().play();
    if (T.cur) a.crossFadeFrom(T.cur, fade, false);
    T.cur = a;
  };
  (async () => {
    let g = G.humans?.gltf?.['human-tourist'];
    if (!g) { try { g = await new GLTFLoader().loadAsync('assets/models/human-tourist.glb'); } catch { return; } }
    const root = SkeletonUtils.clone(g.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.material;
      o.material = ruleMaterial({ map: src.map || null });
      if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    });
    const holder = new THREE.Group();
    holder.add(root);
    holder.scale.x = -1;   // counter-mirror (the world root is mirrored)
    holder.position.set(TOURIST.x, TOURIST.y, TOURIST.z);
    holder.rotation.y = T.yaw;
    T.mixer = new THREE.AnimationMixer(root);
    for (const clip of g.animations) {
      const a = T.mixer.clipAction(clip);
      if (clip.name === 'idle' || clip.name === 'walk' || clip.name === 'run') a.setLoop(THREE.LoopRepeat);
      else { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      T.actions[clip.name] = a;
    }
    T.holder = holder;
    group.add(holder);
    play('idle', 0);
    G.detailCull?.add?.(holder);
  })();
  const touristAt = () => ({ x: TOURIST.x, y: TOURIST.y + 2.05, z: TOURIST.z });
  const say = (text, ttl = 3.2) => G.bubbles.add(text, { at: touristAt, ttl, range: 60 });

  // ------------------------------------------------------------ the camera on the ledge
  const ledgeCam = () => G.items.world.find((w) => w.id === 'camera');
  const carrying = () => G.state.carried?.id === 'camera';
  const stock = () => {
    if (!onStep(G, 'say-cheese', 1) || carrying() || ledgeCam()) return;
    const it = G.items.spawn('camera', CAMERA_AT.x, CAMERA_AT.z, { y: CAMERA_AT.y, origin: { x: CAMERA_AT.x, z: CAMERA_AT.z } });
    if (it.mesh) it.mesh.rotation.y = Math.PI / 2 + 0.35;   // its lens looks out over the park too
  };
  // review: on step 1 the camera answers a Peck from anywhere on the ledge by the balcony (the item's own reach is 0.9 m, so
  // from beside the balcony the prompt said "Nap")
  G.interact.register({
    id: 'saycheese:camera', kind: 'item', x: CAMERA_AT.x, y: CAMERA_AT.y, z: CAMERA_AT.z, r: 3.4, dy: 1.2, priority: 5,
    enabled: () => onStep(G, 'say-cheese', 1) && !!ledgeCam(),
    label: () => { const it = ledgeCam(); return it ? (G.items.guardReason(it, true) ? 'Guarded: the old film camera' : 'Pick up the old film camera') : null; },
    act: () => { const it = ledgeCam(); if (it) G.items.pickUp(it); },
  });
  // the guard: he's watching it (until he's distracted)
  let refusals = 0;
  G.items.guards.push((it, peek) => {
    if (it.id !== 'camera' || !onStep(G, 'say-cheese', 1) || flags()['photo.distracted']) return null;
    if (!peek) say(['Hey! That\'s my OLD camera, buddy. Shoo.', 'Nope. Mine. Go be in somebody else\'s picture.'][refusals++ % 2], 2.8);
    return 'He\'s watching his camera. Get in his shot, or give him a Coo.';
  });

  // ------------------------------------------------------------ the photobomb (or a Coo)
  let held = 0;
  const inShot = () => {
    const g = G.gus.position;
    // right beside him on the ledge or the balcony: he can't miss a pigeon THAT close
    if (Math.hypot(g.x - TOURIST.x, g.z - TOURIST.z) < 3.4 && Math.abs(g.y - TOURIST.y) < 1.2 && G.gus.mode !== 'fly') return true;
    const fx = Math.sin(T.yaw), fz = Math.cos(T.yaw);
    const dx = g.x - TOURIST.x, dz = g.z - TOURIST.z;
    const f = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
    if (f < SHOT.near || f > SHOT.far) return false;
    if (Math.atan2(side, f) > SHOT.half) return false;
    const eye = TOURIST.y + EYE;
    return g.y > -1 && g.y < eye + SHOT.up;
  };
  const distract = (how) => {
    if (flags()['photo.distracted']) return;
    flags()['photo.distracted'] = true;
    held = 0;
    T.mood = 'laugh'; T.moodT = 0; T.flashT = 0.25;
    G.audio.play('camera-shutter', { at: touristAt(), vol: 0.8 });
    play('wave');
    say(how === 'coo' ? 'Huh? Who said that? …Oh! A pigeon! Hold still, little guy!' : 'Ha! A pigeon right in my shot! That\'s a keeper!', 3.2);
    // review: the hint is in his own bubble, and the toast waits until both bubbles are gone (toasts drew over them)
    G.later(3.4, () => say('Wait right there! I need my good lens. Nobody touch my old camera on the ledge!', 3.4));
    G.later(7.0, () => { if (onStep(G, 'say-cheese', 1)) G.toast('He\'s gone in for his lens. Peck the old camera on the ledge.', { seconds: 5 }); });
    G.bus.emit('photobomb', { scheme: 'say-cheese' });
  };
  G.bus.on('coo', (t, e) => {
    if (!onStep(G, 'say-cheese', 1) || flags()['photo.distracted']) return;
    if (Math.hypot(e.x - TOURIST.x, e.z - TOURIST.z) < COO_R) { e.handled = true; distract('coo'); }
  });
  G.bus.on('pickup', (t, e) => {
    if (e.item !== 'camera') return;
    G.later(0.6, () => say('My old film camera?! …Eh, it never had film in it anyway.', 3));
  });

  // ------------------------------------------------------------ step 2: Flicker loads the film
  E.registerScript('photo.film', (ctx, done) => {
    const f = G.chars.find('flicker');
    if (f) { f.yaw = Math.atan2(G.gus.position.x - f.x, G.gus.position.z - f.z); G.chars.animate(f, 'cheer', 1.6); }
    G.audio.play('crow-caw', { at: G.gus.position, vol: 0.6 });
    G.say([
      L('flicker', 'Ooh. OOH. A real film camera. Heavy. Honest. Empty.'),
      L('flicker', 'Film is my business, pigeon. One roll, from the good stash. Beak-certified.'),
      L('flicker', 'There. Loaded. One condition: the first picture is of ME. Go on. Snap me.'),
    ], () => {
      G.audio.play('camera-shutter', { at: G.gus.position, vol: 0.5, rate: 1.3 });
      G.toast(`New gear: Film camera. Photo mode is open: ${G.photo?.howToOpen?.() || 'Pause, then Photo'}.`, { kind: 'stamp', seconds: 6 });
      done();
    });
  });
  G.bus.on('schemeDone', (t, e) => {
    if (e.scheme !== 'say-cheese') return;
    G.polaroid?.({ title: 'PHOTO MODE', name: 'Say Cheese!', portrait: 'flicker' });
    bubbleOver(G, 'flicker', 'Flicker: Gorgeous. Frame it. Frame ME.', 3);
    G.later(2.5, () => G.toast('Your photos are in the Album (Pause, then Album). Download them to keep them.', { seconds: 6 }));
  });

  G.mods.push({
    update(dt) {
      stock();
      // review: on step 3 Flicker is always drawn (the Low preset's character cap could otherwise hide her, and a snap
      // only counts her when she's drawn). Visual only (c.always is what a fight's opponent uses).
      const fl = G.chars.find('flicker');
      if (fl) { const want = onStep(G, 'say-cheese', 3); if (!!fl.always !== want) fl.always = want; }
      // the photobomb: Gus in his frame for a moment
      if (onStep(G, 'say-cheese', 1) && !flags()['photo.distracted'] && !G.cutscene.running) {
        if (inShot()) { held += dt; if (held >= SHOT.hold) distract('shot'); } else held = Math.max(0, held - dt * 2);
      } else held = 0;
      // the tourist: snapping the park; after the photobomb he turns in for his good lens, then comes back
      if (!T.holder) return;
      const cam = G.dataCam?.position || G.gus.position;
      const near = Math.hypot(cam.x - TOURIST.x, cam.z - TOURIST.z) < 90;
      T.holder.visible = near;
      T.moodT += dt;
      if (T.mood === 'laugh' && T.moodT > 3.2) { T.mood = 'inside'; T.moodT = 0; play('idle'); }
      if (T.mood === 'inside' && T.moodT > 14) { T.mood = 'snap'; T.moodT = 0; }
      if (T.mood === 'snap') {
        if (T.moodT > 6) { T.moodT = 0; play('gawk'); G.later(2.2, () => { if (T.mood === 'snap') play('idle'); }); }
      }
      const want = T.mood === 'inside' ? -Math.PI / 2 : T.mood === 'laugh' ? Math.atan2(G.gus.position.x - TOURIST.x, G.gus.position.z - TOURIST.z) : TOURIST.yaw;
      T.yaw += Math.atan2(Math.sin(want - T.yaw), Math.cos(want - T.yaw)) * Math.min(1, dt * 3);
      T.holder.rotation.y = T.yaw;
      if (near) T.mixer?.update(dt);
    },
    restore() { held = 0; T.mood = 'snap'; T.moodT = 0; T.yaw = TOURIST.yaw; if (T.holder) T.holder.rotation.y = T.yaw; },
  });
}
