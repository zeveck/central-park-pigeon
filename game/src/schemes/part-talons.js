// part-talons, "The Rink Job" (Spikes × Sign War): the set-up steps. The
// chain reaction itself is src/setpieces/rinkjob.js (script 'setpiece.rinkjob').
//   1. Morning: Prickett wheels his pallets of spike strips into the rink's
//      equipment shed and rolls the steel door down; a ranger's notice on it
//      shows a cart in a "parking" box (the South cart sleeps across that door).
//      The horses can try the door: BONK. "That's steel, kid."
//   2. Dusk: the horses Kick the buckled Zamboni-garage door; Mama Mask wants a
//      slice first ("union rules"); the raccoons Rig the Zamboni and Ringo
//      demos it (vehicles.js: the pile by the kids' bump slumps to slush).
//   3. Night: Ringo rides on the back while Gus drives. Ramp, launch: the setpiece.
// Ringo's comments on the fun failure modes (too slow, wrong spot, slush) are here too.
import * as THREE from 'three';
import { L, bubbleOver, onStep, face } from './_sf-common.js';
import { RINK } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

export function installPartTalons(G) {
  const E = G.schemes;
  const group = new THREE.Group();
  const door = () => G.clues.doors.find((d) => d.def.id === 'rink-shed');
  const S = RINK.shed, gy = () => G.terrain.heightAt(S.x, S.z - S.d / 2);
  // the ranger's notice on the shed door: a cart in a "parking" box (canvas text is flipped: the world is mirrored)
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
  const cx = cv.getContext('2d');
  cx.translate(256, 0); cx.scale(-1, 1);
  cx.fillStyle = '#f6f1e2'; cx.fillRect(0, 0, 256, 192);
  cx.strokeStyle = '#2f5d34'; cx.lineWidth = 8; cx.strokeRect(8, 8, 240, 176);
  cx.fillStyle = '#2f5d34'; cx.font = 'bold 30px sans-serif'; cx.textAlign = 'center'; cx.fillText('RANGER CART', 128, 46); cx.font = 'bold 22px sans-serif'; cx.fillText('PARKING: NIGHTS', 128, 74);
  cx.strokeStyle = '#2f5d34'; cx.setLineDash([10, 7]); cx.lineWidth = 4; cx.strokeRect(48, 88, 160, 84); cx.setLineDash([]);
  cx.fillRect(78, 112, 92, 34); cx.fillRect(150, 100, 24, 18); cx.fillStyle = '#f6f1e2'; for (const wx of [96, 152]) { cx.beginPath(); cx.arc(wx, 150, 12, 0, 7); cx.fill(); }
  cx.fillStyle = '#2f5d34'; for (const wx of [96, 152]) { cx.beginPath(); cx.arc(wx, 150, 8, 0, 7); cx.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const notice = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.68), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  notice.rotation.y = Math.PI;   // faces the rink (south)
  notice.position.set(S.x, gy() + 1.45, S.z - S.d / 2 - 0.09);
  group.add(notice);
  // a pallet of strips Prickett wheels in (step 1)
  const pallet = new THREE.Group();
  const wood = ruleMaterial({ color: 0x9a7448 }), red = ruleMaterial({ color: 0xc4302b });
  pallet.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.8).translate(0, 0.07, 0), wood));
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.12), red); s.position.set(0, 0.17 + Math.floor(k / 2) * 0.07, (k % 2 ? 0.16 : -0.16)); pallet.add(s); }
  pallet.visible = false; group.add(pallet);
  G.sfPalletProto = pallet;
  let showOpen = false;

  E.registerScript('rink.stock', (ctx, done) => {
    const p = G.street.prickett;
    const y = gy();
    const from = { x: S.x - 7, z: S.z + 1.5 }, at = { x: S.x, z: S.z - S.d / 2 - 1.1 };
    let pushing = false;
    G.cutscene.run('rink-stock', [
      { do: () => {
        if (p) { p.out = true; p.script = false; p.busy = true; p.x = from.x; p.z = from.z; p.y = undefined; G.humans.goTo(p, at, 1.3, () => { p.mode = 'linger'; p.t = 30; }); }
        pallet.visible = true; pushing = true;
        const dd = door(); if (dd) { dd.open = true; dd.t = 1; } showOpen = true;
      } },
      { cam: { ...G.shot({ x: S.x - 2, y, z: S.z - S.d / 2 }, { dist: 10, height: 3.6, yaw: Math.PI + 0.55, lookY: 1 }), secs: 1.4 } },
      { until: () => { if (pushing && p) { pallet.position.set(p.x + Math.sin(p.yaw) * 0.9, G.surfaceY(p.x, p.z, 3), p.z + Math.cos(p.yaw) * 0.9); pallet.rotation.y = p.yaw; } return !p || p.mode !== 'goto'; } },
      { do: () => { pushing = false; G.audio.play('heavy-drag-scrape', { at: S }); } },
      { wait: 0.2 },
      { do: () => { const s0 = pallet.position.clone(); G.sfTween(0.9, (k) => { pallet.position.set(s0.x, s0.y, s0.z + k * 2.6); }, () => { pallet.visible = false; }); } },
      { wait: 1.0 },
      { do: () => { showOpen = false; G.audio.play('shed-door-fold', { at: S, vol: 0.5, rate: 1.3 }); if (p) { p.yaw = Math.PI; } } },
      { wait: 1.3 },
      { say: [
        L('prickett', 'In you go, my beauties. Every strip I own, safe and sound in the rink shed.'),
        L('prickett', 'And the rangers park their last cart right across this door, every night. Nobody\'s getting in THERE.'),
        L('prickett', 'Morning, birds! Nothing personal!'),
      ] },
      { cam: { ...G.shot({ x: S.x, y: y + 1.4, z: S.z - S.d / 2 }, { dist: 3.2, height: 0.3, yaw: Math.PI, lookY: 0 }), secs: 1.2 } },
      { wait: 1.6 },
      { say: [L(null, 'A ranger\'s notice on the steel door: a cart, in a parking box. The South cart sleeps right here.'), L(null, 'His stock inside, and the last ranger cart parked across the door. Nothing with paws opens that.')] },
      { follow: true },
      { do: () => { if (p) { G.humans.goTo(p, { x: S.x - 18, z: S.z + 6 }, 1.4, () => { p.out = false; p.busy = false; }); } done(); } },
    ], null, () => { pushing = false; showOpen = false; pallet.visible = false; if (p) { p.busy = false; p.mode = 'linger'; } G.street.setPhase?.(G.state.phase); });   // Fixes-3 (B2)
  });

  // step 2: Mama Mask (and Ringo) come with the raccoons; she takes the union slice
  G.bus.on('call', (t, e) => {
    if (e.ally !== 'raccoons' || !onStep(G, 'part-talons', 2) || Math.hypot(e.x - RINK.x, e.z - RINK.z) > 40) return;
    const mm = G.chars.find('mamamask'), ringo = G.chars.find('ringo');
    [[mm, 0.9, -0.9], [ringo, -1.0, -0.8]].forEach(([c, dx, dz], i) => {
      if (!c) return;
      const p = { x: e.x + dx, z: e.z + dz }; p.y = G.surfaceY(p.x, p.z, G.gus.position.y + 1);
      c.script = true; G.chars.arrive(c, p, 'drain', 3 + i * 0.3);
      G.later(3.4 + i * 0.3, () => { c.script = false; c.sfHere = true; });
    });
    if (!G.state.flags['union.paid']) G.later(3.6, () => bubbleOver(G, mm, 'Union rules, sweetie. One slice first.', 3));
  });
  G.bus.on('given', (t, e) => { if ((e.to === 'rigby' || e.to === 'mamamask') && G.state.flags['union.paid']) G.later(1.4, () => bubbleOver(G, 'ringo', 'Ooh, she\'s fed. NOW we\'re cooking.', 2.4)); });
  G.bus.on('talk', (t, e) => {
    if (e.who === 'mamamask' && onStep(G, 'part-talons', 2) && !G.state.flags['union.paid']) G.later(0, () => { if (!G.dialogue.open) G.say([L('mamamask', 'Nobody touches that machine on an empty stomach, sweetie. One slice. Any slice. Union rules.')]); });
    if (e.who === 'ringo' && onStep(G, 'part-talons', 3)) G.later(0, () => { if (!G.dialogue.open) G.say([L('ringo', 'She\'d FLY off a big enough bump, boss. Frozen. In the KEEP CLEAR bit. Then floor it, straight north!')]); });
  });

  // step 3: Ringo rides on the back; his comments on the misses
  const quip = (text) => { const r = G.chars.find('ringo'); if (r && G.state.phase !== 'day') bubbleOver(G, r, text, 2.4, 0.5); };
  G.bus.on('rampTooSlow', () => quip('More SPEED, boss! Floor it!'));
  G.bus.on('zamboniHop', () => quip('Wrong spot! The KEEP CLEAR bit, boss! North!'));
  G.bus.on('slush', () => { if (G.state.flags['zamboni.rigged']) quip('Told ya. Needs to be COLDER. Night, boss.'); });
  G.bus.on('dump', (t, e) => { if (onStep(G, 'part-talons', 3) && !e.inLane) quip('That\'s not the KEEP CLEAR bit, boss.'); });

  let riding = false;
  return {
    group,
    update() {
      // the shed door shows open while Prickett wheels his pallet in
      const dd = door();
      if (dd && showOpen) { dd.open = true; dd.t = 1; }
      // Ringo clings to the back of the Zamboni at Night in step 3 (and through the launch)
      const z = G.vehicles.byId.zamboni, ringo = G.chars.find('ringo');
      const ride = ringo && z && ((G.vehicles.driving === z && onStep(G, 'part-talons', 3)) || z.hop?.lane);
      if (ride) {
        riding = true; ringo.script = true; ringo.tween = null; ringo.here = { x: z.x, z: z.z, scripted: true };
        ringo.x = z.x - Math.sin(z.yaw) * 1.45; ringo.z = z.z - Math.cos(z.yaw) * 1.45; ringo.y = z.y + 0.95; ringo.yaw = z.yaw;
      } else if (riding && ringo) {
        riding = false;
        if (!G.cutscene.running) { ringo.script = false; const p = { x: z.x - Math.sin(z.yaw) * 2 + 1, z: z.z - Math.cos(z.yaw) * 2 }; G.chars.moveTo(ringo, p, { kind: 'hop' }); }
      }
    },
  };
}
