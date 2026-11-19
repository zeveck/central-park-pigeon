// The Wedding (part-power, "Showpieces"): a photo shoot packs Bow Bridge and
// its landing, the flash keeps scaring the ducks off the sunken rowboat with
// something glowing in it, and the party won't leave without its dove
// release (the doves never showed).
//   step 1  the shoot, the flash, the ducks, the glow; the wedding quartet plays.
//   step 2  Peck the planner's empty wicker basket with Dove in the flock: she
//           settles in, the lid opens, she rises in a perfect white spiral,
//           the photographer weeps: "Now EVERYONE in for the group shot!"
//           (from now on the party poses across the bridge every day phase).
//   step 3  Call the geese and Ask them (setpiece.wedding): Gertrude honks the
//           order, Lieutenant Gander lowers his neck and leads the honk wedge,
//           the music cuts with a needle scratch, the guests scatter in every
//           direction arms up, the bride's bouquet spins up in an arc, Dove
//           catches it at the top in her beak (slow motion), the photographer
//           backpedals into the rail and the flash fires: the shot of the
//           century, a freeze-frame polaroid that slides onto the Scheme Board.
//   order   geese before the release: the party digs in ("NOBODY moves till we
//           get the DOVE SHOT!", the geese bounce off a wall of tulle); the
//           songbirds' Mimic: "Phones OFF, people!" and the guests shuffle back.
//           Fixes-2: inside the same scene Bubbles surfaces the battery and Rhoda carries it off, and the geese's
//           second pass flattens the photographer: the photo is the last beat (no step 4 chore after the payoff).
// Afterwards Dove's Bow Bridge postcard waits at Afternoon ("Two doves! Stunning!").
import * as THREE from 'three';
import { ruleMaterial } from '../gfx/load-model.js';
import { L, bubbleOver, bubbleHuman, onStep, face, birds } from '../schemes/_sf-common.js';

const BATTERY = { x: -28, z: 312 };
// Fixes-3 (R9): at the planner's side, at her hand (it floated a metre off her hand: she stands at (-26, 295))
const BASKET = { x: -26.15, z: 295.38 };
// the group shot: the whole party in a row across the foot of the bridge (its south landing), so nobody gets on
// or off it; the photographer a few steps back down the path, facing them.
// Polish-1: the row stood inside the bridge's stone abutment (its south face is at z ≈ 304.9), so it was never
// seen; it is now on the path just south of it, bride and groom in the middle, the extra guests (Humans.extras
// 'wguest', scenery only) on the flanks and in a back row.
const GROUP = {
  bride: [{ x: -34.9, z: 302.9, yaw: Math.PI }], groom: [{ x: -34.0, z: 302.9, yaw: Math.PI }],
  planner: [{ x: -37.6, z: 302.7, yaw: Math.PI - 0.3 }],
  guest: [{ x: -33.0, z: 302.8, yaw: Math.PI + 0.1 }, { x: -35.9, z: 302.8, yaw: Math.PI - 0.1 }, { x: -32.1, z: 302.6, yaw: Math.PI + 0.25 }, { x: -36.8, z: 302.7, yaw: Math.PI - 0.2 }],
  wguest: [{ x: -38.5, z: 302.4, yaw: Math.PI - 0.4 }, { x: -31.2, z: 302.4, yaw: Math.PI + 0.4 }, { x: -35.9, z: 304.0, yaw: Math.PI }, { x: -34.9, z: 304.1, yaw: Math.PI }, { x: -33.9, z: 304.1, yaw: Math.PI }, { x: -32.9, z: 304.0, yaw: Math.PI }],
  photographer: [{ x: -34.0, z: 298.2, yaw: 0 }],
};
const ROW = { x: -34.5, z: 302.9 };

export async function installWedding(G) {
  const E = G.schemes;
  const group = new THREE.Group(); group.name = 'wedding';
  const wedRoles = ['bride', 'groom', 'planner', 'photographer', 'guest'];
  const party = () => G.humans.agents.filter((a) => wedRoles.includes(a.role) && !a.temp);
  // Polish-1: the scenery guests (never in Humans.agents, so no gameplay sees them) pose and scatter with the party
  const agents = () => [...party(), ...(G.humans.extras || []).filter((a) => a.role === 'wguest')];
  const homes = new Map();
  for (const a of agents()) homes.set(a, { ...a.home });
  // ---------------------------------------------------------------- meshes: the basket, the glow, the bouquet, the wedge
  const wicker = ruleMaterial({ color: 0xb98a4e, roughness: 0.95 });
  const basket = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 0.3, 14, 1, true).translate(0, 0.15, 0), new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.95, side: THREE.DoubleSide }));
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14).rotateX(-Math.PI / 2), wicker);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.3, -0.26);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 14).translate(0, 0.02, 0.26), wicker);
  lidPivot.add(lid);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 16, Math.PI), wicker); handle.position.y = 0.3;
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.02, 4, 18).rotateX(Math.PI / 2), ruleMaterial({ color: 0xf6f0f4 })); ribbon.position.y = 0.2;
  basket.add(body, bottom, lidPivot, handle, ribbon);
  basket.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.add(basket);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.visible = false; group.add(glow);
  const bouquet = new THREE.Group();
  bouquet.add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8).rotateX(Math.PI).translate(0, -0.08, 0), ruleMaterial({ color: 0x6f9a52 })));
  for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), ruleMaterial({ color: [0xfff4f6, 0xf7b8c8, 0xffffff, 0xf2d06b][k % 4] })); f.position.set(Math.cos(k) * 0.07 * (k ? 1 : 0), 0.03 + (k % 2) * 0.02, Math.sin(k) * 0.07 * (k ? 1 : 0)); bouquet.add(f); }
  bouquet.visible = false; group.add(bouquet);
  const wedge = await birds(G, 'goose-bully', 7, 0.95);
  group.add(wedge.mesh);
  // Fixes-2 (P7): the veil that comes off in the stampede (a soft white cloth that ripples) and the battery (its own model,
  // counter-mirrored like every model) that Bubbles brings up and Rhoda carries off
  const veilGeo = new THREE.PlaneGeometry(0.9, 1.4, 8, 10);   // Fixes-3: long, not round
  // Fixes-3 (R9): a trailing length of tulle gathered at a little comb (it was a round, glowing, dotted disc that read
  // as a UI marker floating in the photo): soft side edges, sheer and fading towards its hem, a faint net
  const veilTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.62)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(52, 4); g.lineTo(76, 4); g.bezierCurveTo(100, 40, 122, 80, 124, 124); g.lineTo(4, 124); g.bezierCurveTo(6, 80, 28, 40, 52, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)'; for (let y = 10; y < 122; y += 6) for (let x = 6; x < 122; x += 6) g.fillRect(x, y, 1.2, 1.2);   // the net
    g.fillStyle = '#e8dcc8'; g.fillRect(50, 2, 28, 7);   // the comb
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const veil = new THREE.Mesh(veilGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: veilTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false, emissive: 0x1c1c1c }));
  veil.visible = false; group.add(veil);
  const battery = new THREE.Group(); battery.visible = false; group.add(battery);
  {
    const bb = await G.registry.baked('battery'); const inner = new THREE.Group(); inner.scale.set(-1.8, 1.8, 1.8); battery.add(inner);
    if (bb) inner.add(new THREE.Mesh(bb.geometry, bb.makeMaterial()));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.y = 0.35; battery.add(halo);
  }
  const waterY = () => G.collision.waterAt(BATTERY.x, BATTERY.z)?.level ?? 0;
  /** Fixes-2: a point d m along (dx, dz) from (x, z), pulled back until it's on dry land (guests ran out over the Lake). */
  const landward = (x, z, dx, dz, d) => {
    const l = Math.hypot(dx, dz) || 1;
    for (let k = d; k > 0.4; k -= 0.5) { const p = { x: x + (dx / l) * k, z: z + (dz / l) * k }; if (!G.collision.waterAt(p.x, p.z)) return p; }
    return { x, z };
  };

  // ---------------------------------------------------------------- the party's poses
  const pose = (snap = true) => {
    const st = G.state;
    const shot = st.flags['wedding.doveReleased'] && !st.flags['wedding.cleared'];
    const used = {};
    for (const a of agents()) {
      const h = homes.get(a); if (!h) continue;
      const list = GROUP[a.role]; const i = (used[a.role] = (used[a.role] ?? -1) + 1);
      const g = shot && list ? list[Math.min(i, list.length - 1)] : null;
      a.home = g ? { ...g } : { ...h };
      if (snap && a.out && !a.busy) { a.x = a.home.x; a.z = a.home.z; a.yaw = a.home.yaw ?? a.yaw; a.y = undefined; }
    }
  };
  const showBasket = () => {
    const st = G.state;
    const on = G.humans.isOut('planner') && !st.flags['wedding.cleared'] && !st.flags['wedding.doveReleased'];
    basket.visible = on || !!R.release;
    if (on && !R.release) { basket.position.set(BASKET.x, G.surfaceY(BASKET.x, BASKET.z, 5) + 0.62, BASKET.z); basket.rotation.y = -1.4; lidPivot.rotation.x = 0; }
  };

  // ---------------------------------------------------------------- step 1: the shoot, the flash, the ducks, the glow
  const flash = (big = false) => {
    const el = document.getElementById('sf-flash');
    if (el) { el.className = big ? 'on big' : 'on'; G.later(big ? 0.35 : 0.12, () => { el.className = ''; }); }
    G.audio.play('camera-shutter', { vol: 0.8 });
  };
  E.registerScript('wedding.intro', (ctx, done) => {
    const ph = G.humans.byRole('photographer')[0], pl = G.humans.byRole('planner')[0], br = G.humans.byRole('bride')[0];
    const bub = G.chars.find('bubbles');
    G.cutscene.run('wedding-intro', [
      { cam: { pos: [-22, G.surfaceY(-22, 300, 5) + 3.2, 300], look: [-29, 1.2, 304], secs: 1.4 } },
      { wait: 1.0 },
      { do: () => { flash(); if (ph) G.humans.play(ph, 'taunt', 1); } },
      { wait: 0.5 },
      { do: () => { G.particles.splash(BATTERY.x, waterY(), BATTERY.z, 22); G.audio.play('duck-quack-mallard', { at: BATTERY }); G.bubbles.add('QUACK!', { at: { x: BATTERY.x, y: waterY() + 0.8, z: BATTERY.z }, ttl: 1.4, range: 80 }); } },
      { cam: { pos: [BATTERY.x + 6, waterY() + 2.5, BATTERY.z - 6], look: [BATTERY.x, waterY() - 0.3, BATTERY.z], secs: 1.0 } },
      { wait: 1.2 },
      { say: [L('bubbles', 'There\'s a sunken rowboat down there, Gus! Something in it GLOWS! But every time that flash goes off… QUACK!')] },
      { cam: { pos: [-22, G.surfaceY(-22, 300, 5) + 3.2, 300], look: [-28, 1.2, 296], secs: 1.0 } },
      { do: () => flash() },
      { say: [
        L(null, 'The wedding planner, to nobody in particular: "No doves. NO DOVES. The doves never SHOWED."'),
        L(null, 'The photographer: "Nobody leaves this bridge until I get my dove release."'),
        L(null, 'The bride: "I was PROMISED doves."'),
        L('dove', 'Psst. Darling. A dove release… with no doves. Tragic. Unless… no. No. Well. Perhaps.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });

  // ---------------------------------------------------------------- step 2: the dove release
  const R = { release: null, wed: null };
  G.interact.register({
    id: 'wedding-basket', kind: 'clue', priority: 7, r: 1.4, dy: 1.6,
    get x() { return BASKET.x; }, get z() { return BASKET.z; }, get y() { return basket.position.y; },
    label: () => (basket.visible && !R.release && G.state.phase !== 'night' ? 'Peck the basket' : null),
    act: () => { if (!onStep(G, 'part-power', 2)) G.toast('An empty wicker basket. The doves never showed.'); },
  });
  E.registerScript('wedding.release', (ctx, done) => {
    const dove = G.chars.find('dove');
    const ph = G.humans.byRole('photographer')[0], pl = G.humans.byRole('planner')[0];
    const by = basket.position.y;
    G.cutscene.run('wedding-release', [
      { say: [L('gus', 'Coo. (Dove, you\'re on.)'), L('dove', 'I was BORN for this.', 'dove-born-for-this')] },
      { do: () => { if (dove) { dove.script = true; dove.here = { x: BASKET.x, z: BASKET.z, scripted: true }; const g = G.gus.position; dove.x = g.x; dove.y = g.y + 0.4; dove.z = g.z; G.chars.moveTo(dove, { x: BASKET.x, z: BASKET.z, y: by + 0.12 }, { kind: 'fly', secs: 1.2 }); } } },
      { cam: { pos: [BASKET.x - 2.2, by + 0.9, BASKET.z + 2.4], look: [BASKET.x, by + 0.2, BASKET.z], secs: 0.9 } },
      { wait: 1.3 },
      { do: () => { G.sfTween(0.5, (k) => { lidPivot.rotation.x = -0.1 * k; }); bubbleHuman(G, pl, 'Finally! Places, everyone!', 2); } },
      { wait: 0.9 },
      { do: () => { G.sfTween(0.7, (k) => { lidPivot.rotation.x = -1.9 * k; }); G.audio.play('flap', { at: BASKET }); R.release = { t: 0 }; G.particles.burst('feathers', BASKET.x, by + 0.35, BASKET.z, 10, { color: [1, 1, 1] }); } },
      // Fixes-2 (P7): framed on the basket, low and close, so Dove bursts out big in frame and spirals up through it
      // (the old shot sat 9 m back on the sky: she was a speck)
      { cam: { pos: [BASKET.x - 1.7, by + 0.55, BASKET.z + 1.9], look: [BASKET.x, by + 0.75, BASKET.z], secs: 0.5, fov: 40 } },
      { until: () => R.release && R.release.t > 1.0 },
      // then the camera tilts up after her as she spirals out of the basket (wedding update: R.trackDove)
      { do: () => { G.cutscene.shot = null; R.trackDove = { t: 0, from: G.dataCam.position.clone(), look: new THREE.Vector3(BASKET.x, by + 0.75, BASKET.z) }; } },
      { until: () => R.release && R.release.t > 3.4 },
      { do: () => {
        R.trackDove = null; if (ph) { G.humans.play(ph, 'cheer', 1.5); bubbleHuman(G, ph, '*sniff*… Gorgeous. GORGEOUS.', 2.6); } flash(); G.audio.play('crowd-ooh', { at: BASKET }); } },
      { wait: 1.4 },
      { say: [L(null, 'The photographer, wiping his eyes: "Gorgeous! Now EVERYONE in for the group shot!"'), L('dove', 'Forty-one weddings, darling. Still nobody checked.', 'dove-places-darling')] },
      { do: () => {
        R.release = null;
        if (dove) G.chars.goHome(dove);
        G.state.flags['wedding.doveReleased'] = true;
        pose(false);
        for (const a of agents()) if (a.out) { a.busy = true; G.humans.goTo(a, a.home, 1.6, () => { a.busy = false; a.mode = 'home'; a.x = a.home.x; a.z = a.home.z; a.yaw = a.home.yaw; }); }
      } },
      { cam: { pos: [-37.4, G.surfaceY(-37.4, 294.0, 6) + 3.4, 294.0], look: [ROW.x - 0.2, G.surfaceY(ROW.x, ROW.z, 6) + 1.0, ROW.z + 0.4], secs: 1.4 } },   // Polish-1: the whole row, both flanks
      { wait: 3.4 },
      { do: () => G.bubbles.add('…', { kind: 'clue', at: { x: ROW.x, y: G.surfaceY(ROW.x, ROW.z, 6) + 2.5, z: ROW.z }, ttl: 2.5, range: 80 }) },
      { say: [L(null, 'The whole party, arm in arm across the foot of the bridge. Nobody\'s getting past THAT.')] },
      { follow: true },
      { do: () => done() },
    ]);
  });

  // the wrong tools before the release: the party digs in
  G.bus.on('refused', (t, e) => {
    if (e.blocker !== 'wedding-early' && e.blocker !== 'wedding') return;
    if (e.talent === 'bully') {
      const ger = G.chars.find('gertrude');
      if (ger) { const back = { x: ger.x - Math.sin(ger.yaw) * 1.6, z: ger.z - Math.cos(ger.yaw) * 1.6 }; G.chars.moveTo(ger, back, { kind: 'hop', secs: 0.5 }); G.particles.burst('feathers', ger.x, ger.y + 0.5, ger.z, 8); G.particles.burst('sparkle', ger.x, ger.y + 0.8, ger.z, 18, { spread: 0.9, color: [1, 1, 1] }); G.audio.play('goose-honk', { at: ger, rate: 1.3 }); }
    } else {
      for (const a of agents()) if (a.out && Math.hypot(a.x - e.x, a.z - e.z) < 8) { const h = { ...a.home }; G.later(1.8, () => { a.busy = true; G.humans.goTo(a, h, 1.4, () => { a.busy = false; a.mode = 'home'; }); }); }
    }
  });

  // ---------------------------------------------------------------- step 3: the stampede (the showpiece)
  // Fixes-2 (P7): the scheme now ENDS here, on the photo ("Showpieces end on the laugh"). In the middle of the chaos
  // Bubbles, no longer scared by the flash, surfaces the glowing battery and Rhoda swoops in and carries it off to the
  // Workshop (the old step 4, a Call-Ask-Call-Ask chore after the payoff, is gone). Then the geese come back for a
  // second pass, straight at the photographer: he backpedals, goes over flat on his back, and the flash fires: the
  // shot of the century is the stampede itself (him on his back, the wedge, the flying veil, Dove with the bouquet).
  E.registerScript('setpiece.wedding', (ctx, done) => {
    const ger = G.chars.find('gertrude'), gan = G.chars.find('gander'), dove = G.chars.find('dove');
    const bub = G.chars.find('bubbles'), rho = G.chars.find('rhoda');
    const g = G.gus.position;
    const from = { x: -33.9, z: 300.6 };
    const brideA = G.humans.byRole('bride')[0], ph = G.humans.byRole('photographer')[0];
    const bridgeY = () => G.surfaceY(ROW.x, ROW.z, 6);
    const phY = () => G.surfaceY(ph ? ph.x : -34, ph ? ph.z : 297, 6);
    R.wed = { t: 0, phase: 'order' };
    G.cutscene.run('wedding', [
      // Gertrude honks the order
      { do: () => {
        if (ger) { ger.script = true; ger.tween = null; ger.x = from.x - 1.2; ger.z = from.z - 1.6; ger.y = G.surfaceY(ger.x, ger.z, 5); face(ger, ROW); G.chars.animate(ger, 'hiss', 1.2); }
        if (gan) { gan.script = true; gan.here = { x: from.x, z: from.z, scripted: true }; gan.x = from.x; gan.z = from.z - 0.4; gan.y = G.surfaceY(from.x, from.z, 5); face(gan, ROW); }
        G.audio.play('goose-honk', { at: from, vol: 1 });
        bubbleOver(G, ger, 'HONK! Squad: WEDGE!', 1.8);
      } },
      { cam: { pos: [from.x + 3.4, G.surfaceY(from.x, from.z, 5) + 1.1, from.z - 3.2], look: [from.x - 0.5, G.surfaceY(from.x, from.z, 5) + 0.4, from.z], secs: 0.5 } },
      { wait: 1.5 },
      // Lieutenant Gander lowers his neck
      { do: () => { if (gan) G.chars.animate(gan, 'hiss', 1.4); G.audio.play('goose-hiss', { at: from }); bubbleOver(G, gan, 'Lowering neck.', 1.4); } },
      { cam: { pos: [from.x - 2.4, G.surfaceY(from.x, from.z - 3.8, 5) + 1.0, from.z - 3.8], look: [from.x, G.surfaceY(from.x, from.z, 5) + 0.35, from.z], secs: 0.6, fov: 50 } },
      { wait: 1.3 },
      // the honk wedge charges; the needle scratch; the stampede
      { do: () => {
        G.audio.cutMusic(); G.audio.synth('needleScratch');
        G.later(0.25, () => G.audio.play('wedding-stampede', { vol: 1 }));
        R.wed.phase = 'charge'; R.wed.ct = 0; wedge.mesh.visible = true;
        for (const k of [0, 0.4, 0.8, 1.2]) G.later(k, () => G.audio.play('goose-honk', { at: ROW, rate: 0.9 + k * 0.15 }));
        // the guests scatter outward from the wedge, arms up (not far: they stay in the picture). Fixes-3 (R9): water on
        // both sides of the bridge foot turned the old directions into a run along the shore: a neat line. Now each one
        // breaks away from the wedge's path (x ≈ -34.3, charging north) to their own side and back down onto the grass.
        const cries = ['AAH!', 'My SHOES!', 'GEESE!', 'The CAKE!', 'RUN!', 'Not the VEIL!', 'HONK?!', 'Oh no oh no'];
        let said = 0;
        agents().forEach((a, i) => {
          if (!a.out || a.role === 'photographer') return;
          const side = a.x < -34.3 ? -1 : 1;
          const dx = side * (1 + (i % 3) * 0.35), dz = -(0.55 + (i % 4) * 0.22);
          a.busy = true; a.seated = false;
          const cry = said++ < 4 ? cries[i % cries.length] : null;   // (eight bubbles at once were a wall of text)
          G.later(0.45 + (i % 4) * 0.14, () => { G.humans.goTo(a, landward(a.x, a.z, dx, dz, 5.5 + (i % 3)), 3.6, () => { a.mode = 'linger'; a.t = 30; }); if (cry) bubbleHuman(G, a, cry, 1.6); });
        });
        // the veil comes off in the rush
        if (brideA) {
          if (brideA.spec?.acc) { brideA.spec = { ...brideA.spec, acc: brideA.spec.acc.filter((q) => q !== 'veil') }; G.humans.redress(brideA); }
          R.wed.veil = { t: 0, x: brideA.x, y: (brideA.y ?? bridgeY()) + 1.7, z: brideA.z, to: { x: brideA.x + 0.6, y: bridgeY() + 3.4, z: brideA.z - 1.6 } };
          veil.visible = true;
        }
      } },
      { cam: { pos: [-35.0, bridgeY() + 7.5, 293.0], look: [ROW.x, bridgeY() + 0.2, ROW.z + 1.0], secs: 0.7 } },   // Polish-1: high and wide: everyone scattering
      { wait: 1.2 },
      // the bouquet spins up in an arc; Dove catches it at the top (slow motion)
      { do: () => {
        const b0 = brideA ? { x: brideA.x, y: (brideA.y ?? bridgeY()) + 1.3, z: brideA.z } : { x: ROW.x, y: bridgeY() + 1.3, z: ROW.z };
        if (brideA?.spec?.acc) { brideA.spec = { ...brideA.spec, acc: brideA.spec.acc.filter((q) => q !== 'bouquet') }; G.humans.redress(brideA); }
        R.wed.bq = { t: 0, from: b0, apex: { x: b0.x + 0.6, y: b0.y + 3.4, z: b0.z - 1.8 } };
        bouquet.visible = true;
        if (dove) { dove.script = true; dove.here = { x: b0.x, z: b0.z, scripted: true }; dove.x = g.x; dove.y = g.y + 2; dove.z = g.z; G.chars.moveTo(dove, { x: R.wed.bq.apex.x + 0.15, y: R.wed.bq.apex.y + 0.05, z: R.wed.bq.apex.z }, { kind: 'fly', secs: 1.1 }); }
      } },
      { get cam() { const a = R.wed?.bq?.apex || { x: ROW.x, y: bridgeY() + 4.5, z: ROW.z - 1.8 }; return { pos: [a.x + 1.7, a.y - 1.2, a.z - 2.4], look: [a.x, a.y - 0.4, a.z], secs: 0.6, fov: 50 }; } },   // Polish-1: framed on the bouquet's arc
      { wait: 0.75 },
      { do: () => { G.slowmo(0.3, 1.0); } },
      { wait: 0.4 },
      { do: () => { R.wed.caught = true; G.audio.play('crowd-ooh', { vol: 0.8 }); bubbleOver(G, dove, '!', 1.2, 0.4); G.particles.burst('sparkle', dove ? dove.x : -34, dove ? dove.y + 0.2 : 318, dove ? dove.z : 310, 22, { spread: 0.6, color: [1, 1, 1] }); } },
      { wait: 0.9 },
      // no more flash-scares: Bubbles surfaces the glowing battery from the rowboat, and Rhoda swoops in and takes it
      { do: () => {
        const wy = waterY();
        R.wed.batt = { t: 0 };
        battery.visible = true; battery.position.set(BATTERY.x, wy - 0.5, BATTERY.z);
        G.particles.splash(BATTERY.x, wy, BATTERY.z, 26);
        G.audio.play('battery-splash', { at: BATTERY });   // fun pass: its own splash, then the hum of the glow
        G.later(0.35, () => G.audio.play('battery-glow', { at: BATTERY }));
        if (bub) { bub.script = true; bub.tween = null; bub.x = BATTERY.x + 0.9; bub.z = BATTERY.z - 0.5; bub.y = wy - 0.4; G.chars.moveTo(bub, { x: BATTERY.x + 0.9, y: wy - 0.08, z: BATTERY.z - 0.5 }, { kind: 'popup', secs: 0.4 }); face(bub, g); }
        G.later(0.4, () => { G.audio.play('duck-quack-mallard', { at: BATTERY }); bubbleOver(G, bub, 'No flash, no fright: GOT IT!', 2.0); });
        for (const c of [bub, rho, dove]) if (c) c.always = true;   // drawn past the per-preset cap of named animals (the ducks crowd it)
        if (rho) {
          rho.script = true; rho.tween = null; rho.here = { x: BATTERY.x, z: BATTERY.z, scripted: true };
          rho.x = BATTERY.x + 5; rho.y = wy + 11; rho.z = BATTERY.z + 9;
          G.later(0.8, () => { G.audio.play('hawk-screech', { at: BATTERY }); G.chars.moveTo(rho, { x: BATTERY.x, y: wy + 1.3, z: BATTERY.z }, { kind: 'fly', secs: 0.8 }); });
          G.later(1.7, () => { R.wed.carry = true; G.particles.splash(BATTERY.x, wy, BATTERY.z, 14); bubbleOver(G, rho, 'Mine. …For the Workshop.', 1.8); G.chars.moveTo(rho, { x: BATTERY.x + 13, y: wy + 13, z: BATTERY.z + 20 }, { kind: 'fly', secs: 2.6 }); });   // up and away from the bridge (north-east, the Ramble's way)
        } else G.later(1.65, () => { R.wed.carry = true; });
        G.state.flags['battery.up'] = true;
      } },
      // from the water east of the bridge: Bubbles and the glow close up, the bridge behind; then up after Rhoda
      { get cam() { const wy = waterY(); return { pos: [BATTERY.x + 3.4, wy + 1.3, BATTERY.z - 2.9], look: [BATTERY.x, wy + 0.7, BATTERY.z], secs: 0.6, fov: 50 }; } },
      { wait: 1.8 },
      { get cam() { const wy = waterY(); return { pos: [BATTERY.x + 2.0, wy + 1.2, BATTERY.z - 4.8], look: [BATTERY.x + 4.5, wy + 4.8, BATTERY.z + 7], secs: 1.4, fov: 58 }; } },
      { wait: 1.2 },
      // the geese come round for a second pass, straight at the photographer: he backpedals and goes over
      { do: () => {
        R.wed.phase = 'back'; R.wed.bt = 0;
        for (const k of [0, 0.3, 0.6]) G.later(k, () => G.audio.play('goose-honk', { at: ROW, rate: 1.05 + k * 0.2 }));
        bubbleOver(G, gan, 'Squad! ABOUT… FACE!', 1.4);
        // he backpedals (still facing them, camera up), so he goes over on his back with his head downhill
        if (ph) { ph.busy = true; ph.seated = false; ph.mode = 'linger'; ph.t = 30; R.wed.bp = { t: 0, from: { x: -34.2, z: 297.6 }, to: { x: -34.3, z: 296.3 } }; bubbleHuman(G, ph, 'No no no NO—', 1.6); }
      } },
      { cam: { pos: [-35.6, 7.0, 290.8], look: [-34.0, 1.0, 301.5], secs: 0.5, fov: 58 } },   // (heights absolute: the path climbs south from the bridge)
      { until: () => R.wed.lead && R.wed.lead.z < 299.6 },
      { do: () => { R.wed.fall = { t: 0 }; G.audio.play('drop-thud', { at: ph || ROW }); G.audio.voice('photographer-fall', { at: ph || ROW }); } },   // fun pass: his yelp as he goes over
      { wait: 0.35 },
      // the flash: the shot of the century, from down in the grass beside him
      { do: () => { flash(true); G.audio.voice('photographer-thats-the-shot', { at: ph || from }); G.hitPause(0.4); } },
      { get cam() {
        // compose the still (a code-composed photo of the real scene): him flat on his back in front, the wedge charging
        // at him, the guests scattering round the bridge foot, the veil sailing past, Dove with the bouquet above it all
        R.wed.phase = 'frozen'; R.wed.lead = { x: -33.7, z: 298.6 };
        const brideAt = landward(ROW.x, ROW.z, -1.3, -1.7, Math.hypot(1.3, 1.7));
        if (R.wed.veil) R.wed.veil.hold = { x: brideAt.x + 0.7, y: G.surfaceY(brideAt.x, brideAt.z, 6) + 2.0, z: brideAt.z - 0.5 };   // Fixes-3: streaming off the bride's head
        if (dove) { dove.tween = null; dove.x = -33.9; dove.y = 3.15; dove.z = 298.4; dove.yaw = Math.PI * 0.85; }
        const spots = [[-4.4, -0.8], [4.0, -0.6], [-2.6, 1.3], [2.5, 1.1], [-5.8, 0.6], [5.2, 0.3], [-1.0, 1.6], [1.4, -1.4], [-3.4, -2.0], [3.4, -2.1]];
        let k = 0;
        for (const a of agents()) {
          if (!a.out || a.role === 'photographer') continue;
          const [ox, oz] = a.role === 'bride' ? [-1.3, -1.7] : spots[k++ % spots.length];
          // Fixes-3 (R9): at their real offsets (landward(…, 1) put everyone within a metre of ROW: a neat clump), each one
          // running away from the lead goose, so the still catches them mid-stride
          const t = landward(ROW.x, ROW.z, ox, oz, Math.hypot(ox, oz));
          a.x = t.x; a.z = t.z; a.y = undefined;
          const rx = a.x - R.wed.lead.x, rz = a.z - R.wed.lead.z;
          G.humans.goTo(a, landward(a.x, a.z, rx, rz, 5), 3.6, () => { a.mode = 'linger'; a.t = 30; });
          a.yaw = Math.atan2(rx, rz);
        }
        return { pos: [-31.3, 3.8, 293.8], look: [-34.6, 1.8, 298.2], secs: 0.01, fov: 44 };
      } },
      { wait: 0.3 },   // Fixes-3 (R9): long enough for the run to blend in (the still caught them standing)
      { do: () => {
        let url = null;
        try { G.render(); url = G.renderer.domElement.toDataURL('image/jpeg', 0.7); } catch { /* the still is a nicety */ }
        G.boardShots = G.boardShots || {}; if (url) G.boardShots['part-power'] = url;
        G.sfFreeze?.(url, 'The shot of the century', 3.4);
      } },
      { wait: 3.0 },
      // the veil settles over his face
      { do: () => { if (R.wed.veil) { R.wed.veil.hold = null; R.wed.veil.land = true; } } },
      { get cam() { const y = phY(), x = ph ? ph.x : -34.3, z = ph ? ph.z : 296.2; return { pos: [x + 1.6, y + 1.3, z - 2.6], look: [x, y + 0.2, z - 1.1], secs: 0.6, fov: 50 }; } },
      { say: [L(null, 'The photographer, flat on his back, a veil over his face: "…THAT\'S the shot."')] },
      { follow: true },
    ], () => {
      R.wed = null; wedge.mesh.visible = false; bouquet.visible = false; veil.visible = false; battery.visible = false;
      for (const c of [ger, gan, dove, bub, rho]) if (c) { c.script = false; c.always = false; if (c !== ger) G.chars.goHome(c); }
      for (const a of agents()) { a.out = false; a.busy = false; a.lie = 0; }
      G.state.flags['wedding.cleared'] = true;
      G.state.flags['battery.up'] = true;
      G.toast('The shot of the century: pinned to your Scheme Board', { kind: 'stamp', seconds: 4 });
      done();
    });
  });

  // ---------------------------------------------------------------- the per-update animation
  const update = (dt) => {
    const st = G.state;
    showBasket();
    glow.visible = !!st.flags['part-power.s1'] && !st.flags['battery.up'] && st.phase !== 'night';
    if (glow.visible) { glow.position.set(BATTERY.x, waterY() - 0.25, BATTERY.z); glow.material.opacity = 0.35 + 0.2 * Math.sin(st.time * 2.4); }
    // Fixes-2 (P7): the release camera follows Dove up out of the basket (she stays big in frame)
    const TD = R.trackDove, dv = TD && G.chars.find('dove');
    if (TD && dv) {
      TD.t += dt;
      const k = Math.min(1, TD.t / 1.2), e = k * k * (3 - 2 * k), by = basket.position.y;
      const want = new THREE.Vector3(BASKET.x - 2.3, by + 0.8 + Math.max(0, dv.y - by) * 0.45, BASKET.z + 2.6);
      TD.look.lerp(new THREE.Vector3(dv.x, dv.y, dv.z), Math.min(1, dt * 6));
      const p = TD.from.clone().lerp(want, e);
      G.rig.setFree({ pos: [p.x, p.y, p.z], look: [TD.look.x, TD.look.y, TD.look.z], fov: 44 });
    }
    // the dove's spiral out of the basket
    if (R.release) {
      const r = R.release; r.t += dt;
      const dove = G.chars.find('dove');
      const k = Math.min(1, r.t / 3.4), a = k * Math.PI * 4;
      // Fixes-2 (P7): a tight spiral that climbs slowly first (in the basket shot), then soars
      if (dove && r.t > 0.2) { dove.tween = null; dove.x = BASKET.x + Math.cos(a) * (0.35 + 0.8 * k); dove.z = BASKET.z + Math.sin(a) * (0.35 + 0.8 * k); dove.y = basket.position.y + 0.25 + k * k * 6; dove.yaw = a + Math.PI / 2; if (G.updates % 3 === 0) G.particles.burst('sparkle', dove.x, dove.y, dove.z, 3, { spread: 0.2, color: [1, 1, 1] }); }
    }
    const W = R.wed;
    if (W) {
      W.t += dt;
      // the wedge: the charge north through the row and over the bridge, then (Fixes-2) about-face and back south
      // at the photographer; 'frozen' holds it where the photo wants it
      const gan = G.chars.find('gander'), ger = G.chars.find('gertrude');
      let lead = null, yaw = 0.19;
      if (W.phase === 'charge') { W.ct += dt; lead = { x: -33.4, z: 299.0 + Math.min(W.ct, 3.2) * 5.91875 }; }
      else if (W.phase === 'back') { W.bt += dt; yaw = 0.19 + Math.PI; lead = { x: -33.6, z: Math.max(296.8, 317.9 - Math.max(0, W.bt - 0.5) * 6.5) }; }
      else if (W.phase === 'frozen') { yaw = 0.19 + Math.PI; lead = W.lead; }
      if (lead) {
        W.lead = lead;
        if (gan) { gan.tween = null; gan.x = lead.x; gan.z = lead.z; gan.y = G.surfaceY(gan.x, gan.z, gan.y + 1); gan.yaw = yaw; gan.act = gan.act || { kind: 'hiss', t: 0, secs: 0 }; }
        const back = W.phase === 'charge' ? -1 : 1;   // the squad trails behind the lead, whichever way it runs
        if (ger) { ger.tween = null; ger.x = lead.x + 0.4; ger.z = lead.z + back * 4.4; ger.y = G.surfaceY(ger.x, ger.z, ger.y + 1); ger.yaw = yaw; }
        for (let i = 0; i < wedge.n; i++) {
          const row = Math.floor(i / 2) + 1, side = i % 2 ? 1 : -1;
          const x = lead.x + side * row * 0.75, z = lead.z + back * row * 0.95;
          wedge.set(i, x, G.surfaceY(x, z, 6), z, yaw, (W.phase === 'frozen' ? 2.3 : W.t * 16) + i, 0.25);
        }
        wedge.commit();
        if (W.phase !== 'frozen' && G.updates % 5 === 0) G.particles.burst('feathers', lead.x, G.surfaceY(lead.x, lead.z, 6) + 0.3, lead.z + back, 2, { spread: 1 });
      }
      if (W.bq) {
        const b = W.bq; b.t += dt;
        const dove = G.chars.find('dove');
        if (W.caught && dove) { bouquet.position.set(dove.x + Math.sin(dove.yaw) * 0.16, dove.y + 0.02, dove.z + Math.cos(dove.yaw) * 0.16); bouquet.rotation.set(0.4, 0, 0); }
        else {
          const k = Math.min(1, b.t / 1.1), e = 1 - (1 - k) * (1 - k);
          bouquet.position.set(b.from.x + (b.apex.x - b.from.x) * k, b.from.y + (b.apex.y - b.from.y) * e, b.from.z + (b.apex.z - b.from.z) * k);
          bouquet.rotation.set(b.t * 9, b.t * 4, b.t * 6);
        }
      }
      // the veil: up off the bride's head, then drifting south over the crowd; held for the photo; then down on his face
      if (W.veil) {
        const v = W.veil; v.t += dt;
        const ph = G.humans.byRole('photographer')[0];
        let to = v.to;
        if (v.hold) to = v.hold;
        else if (v.land && ph) { const hx = ph.x - Math.sin(ph.yaw) * 1.62, hz = ph.z - Math.cos(ph.yaw) * 1.62; to = { x: hx + 0.05, y: Math.max((ph.y ?? 0) + 0.45, G.surfaceY(hx, hz, (ph.y ?? 0) + 2) + 0.25), z: hz }; }   // over his face (he lies 1.6 m long, pivoted at the feet)
        else if (v.t > 1.4) to = { x: -33.4 + Math.sin(v.t * 0.7) * 0.6, y: G.surfaceY(-33.4, 299, 6) + 2.6 - Math.min(0.8, (v.t - 1.4) * 0.12), z: Math.max(297.8, 301.5 - (v.t - 1.4) * 0.45) };
        const f = v.hold ? 1 : Math.min(1, dt * (v.land ? 4 : 1.6));
        v.x += (to.x - v.x) * f; v.y += (to.y - v.y) * f; v.z += (to.z - v.z) * f;
        veil.position.set(v.x, v.y, v.z);
        if (v.land) veil.rotation.set(-0.75, -0.5, 0.15);   // draped over his face, tilted up to the camera
        else veil.rotation.set(-0.6 + Math.sin(v.t * 3.1) * 0.35, v.t * 0.8, Math.sin(v.t * 2.3) * 0.4);
        const pa = veilGeo.attributes.position;
        for (let i = 0; i < pa.count; i++) pa.setZ(i, v.land ? 0.02 * Math.sin(pa.getX(i) * 6) : Math.sin(pa.getX(i) * 5 + v.t * 7) * 0.08 + Math.cos(pa.getY(i) * 6 + v.t * 5) * 0.05);
        pa.needsUpdate = true;
      }
      // the battery: up out of the water, then under Rhoda's talons all the way off
      if (W.batt) {
        const B = W.batt; B.t += dt;
        const wy = waterY(), rho = G.chars.find('rhoda');
        if (W.carry && rho) battery.position.set(rho.x, rho.y - 0.8, rho.z);
        else battery.position.set(BATTERY.x, wy - 0.6 + Math.min(1, B.t / 0.5) * 0.75 + Math.sin(B.t * 5) * 0.03, BATTERY.z);
        battery.rotation.y = B.t * 0.6;
        if (W.carry && rho && G.updates % 4 === 0) G.particles.burst('sparkle', battery.position.x, battery.position.y, battery.position.z, 2, { spread: 0.3, color: [0.6, 0.9, 1] });
      }
      if (W.bp) { const b = W.bp, ph = G.humans.byRole('photographer')[0]; b.t += dt; const k = Math.min(1, b.t / 1.1); if (ph) { ph.x = b.from.x + (b.to.x - b.from.x) * k; ph.z = b.from.z + (b.to.z - b.from.z) * k; ph.yaw = 0; } }
      // the photographer goes over backwards (humans.js draws a.lie: visual only)
      if (W.fall) { W.fall.t += dt; const ph = G.humans.byRole('photographer')[0]; if (ph) ph.lie = Math.min(1, W.fall.t / 0.35); }
    }
  };
  const restore = () => { for (const id of ['bubbles', 'rhoda', 'dove']) { const c = G.chars.find(id); if (c) c.always = false; } pose(true); R.release = null; R.wed = null; R.trackDove = null; wedge.mesh.visible = false; bouquet.visible = false; veil.visible = false; battery.visible = false; for (const a of agents()) a.lie = 0; showBasket(); };
  restore();

  return {
    group, update, restore,
    setPhase: () => pose(true),
    onNap: () => { G.later(0, () => pose(true)); return []; },
    // the wedding quartet near the bridge while the shoot's on (cut by the needle scratch)
    music: () => {
      if (R.wed && R.wed.phase !== 'order') return 'encounter';
      const st = G.state, p = G.gus.position;
      if (st.flags['wedding.cleared'] || st.phase === 'night' || !st.flags['den-geese'] || !G.humans.isOut('bride')) return null;
      return Math.hypot(p.x + 32, p.z - 305) < 45 ? 'wedding' : null;
    },
    debug: () => ({ release: !!R.release, wed: R.wed ? R.wed.phase : null }),
  };
}
