// The Prologue, "Crumbs" (the first minute, scripted):
//   0 s   Gus dozes on a lamppost by the Pond; a ranger below shoos him ("Hey! Shoo!"); the lamppost wobbles
//   5 s   in-world prompt: Flap to fly
//   15 s  Gus lands by a "DON'T FEED THE BIRDS" sign; the camera eases toward it; "FEED the birds…?"
//   25 s  prompt: Peck the sign; the loose "DON'T" plate pops off and spins away
//   ~40 s two picnickers wander over and toss crumbs; gulp; the Duchess's gang watches from the
//         fountain and the Prologue card appears
// Step 2: flip S2 and S3 while S1 is live → the Duchess flies in to judge the feeding frenzy; the
// Swells join (+6 flock, Coo; Dove introduces herself).
// Step 3 (auto): a ranger reverts S1 on camera; Prickett's van pulls up and spikes P1–P4; the
// Board opens with its first three lanes.

import { PROLOGUE } from '../world/layout.js';
import { PROLOGUE_LINES } from '../data/dialogue.js';

// guidance (the user: "'Land by the sign' is way too vague"): the sign by its look and where it stands (east of the lamppost)
const FIND_SIGN = 'Fly east to the sign with the red DON\'T strip, by the Pond\'s east path.';

export function installPrologue(G) {
  const E = G.schemes;
  const S1 = () => G.signs.byId.S1;

  /** New Game: Gus asleep on the Pond lamppost, the ranger walking up underneath. */
  G.startPrologue = () => {
    const lamp = G.prologueLamp;
    G.gus.place({ x: lamp.x, y: lamp.y, z: lamp.z, yaw: Math.atan2(S1().x - lamp.x, S1().z - lamp.z), mode: 'perch' });
    G.rig.yaw = G.gus.yaw + 0.5;
    G.rig.pitch = 0.02;   // polish (P5): was 0.15 (render only: the rig's pitch never steers); looked down the lamppost at a speck
    G.flock.place(G.leader());
    const zzz = G.bubbles.add('Zzz…', { kind: 'thought', at: () => ({ x: G.gus.position.x, y: G.gus.position.y + 0.45, z: G.gus.position.z }), ttl: 0 });
    const cart = G.rangers.cart('south');
    const ranger = cart.ranger;
    const below = { x: lamp.x + 1.6, z: lamp.z - 1.2 };
    G.intro = { stage: 'shoo', t: 0 };
    G.cutscene.run('prologue-intro', [
      { do: () => { ranger.seated = false; ranger.script = false; ranger.x = lamp.x + 9; ranger.z = lamp.z - 6; ranger.y = undefined; G.humans.goTo(ranger, below, 1.6, () => { ranger.yaw = Math.atan2(lamp.x - ranger.x, lamp.z - ranger.z); }); } },
      // polish (P5): the old single shot looked up the lamppost from its foot (the post filled the frame, Gus was a
      // speck on top, the ranger's head poked in at the bottom). Now: a close-up of Gus dozing at his own height
      // while the ranger walks up, then (camera beats take no game time) a wide side-on shot with the ranger and the
      // whole lamppost, Gus on top, for the "Hey! Shoo!".
      { cam: { ...G.shot({ x: lamp.x, y: lamp.y, z: lamp.z }, { dist: 1.9, height: -0.2, yaw: Math.atan2(below.x - lamp.x, below.z - lamp.z) + 0.9, lookY: -0.1 }), fov: 45, secs: 0.01 } },
      { until: () => ranger.mode !== 'goto' },
      { get cam() {
        const ground = lamp.y - 3.94, side = Math.atan2(below.x - lamp.x, below.z - lamp.z) + Math.PI / 2;
        return { ...G.shot({ x: (lamp.x * 2 + below.x) / 3, y: ground, z: (lamp.z * 2 + below.z) / 3 }, { dist: 6.3, height: 0.6, yaw: side, lookY: 2.3 }), fov: 52, secs: 0.8 };
      } },
      { do: () => {
        G.bubbles.remove(zzz);
        G.audio.voice('ranger-hey-shoo', { at: ranger });
        G.bubbles.add(PROLOGUE_LINES.shoo, { at: () => ({ x: ranger.x, y: (ranger.y || 0) + 2.05, z: ranger.z }), ttl: 2.2 });
        G.humans.play(ranger, 'scold', 1.8);
        G.wobble = 0.9;   // the lamppost wobbles (Gus sways with it)
      } },
      { wait: 2.2 },
      { follow: true },
      { do: () => {
        // the ranger walks back to his cart
        G.humans.goTo(ranger, { x: cart.x + Math.cos(cart.yaw) * 1.1, z: cart.z - Math.sin(cart.yaw) * 1.1 }, 1.4, () => { ranger.script = true; cart.state = 'parked'; G.rangers.setPhase(G.state.phase); });
        G.tutor('flap', 'hold to fly');   // Batch-2 (#5): a tap is a hop
        G.intro.stage = 'flap';
      } },
    ]);
  };

  /** Fixes-1 (bughunter #3): Continue (or the graphics reload) in the first minute. The intro's runtime (G.intro,
   *  the tutor, the "!" over the sign) isn't saved and the Prologue's card only shows once the feeders come, so a
   *  save from before the card left a new player with no goal at all. Rebuild the guidance from the save. */
  G.resumePrologue = () => {
    const st = G.state;
    if (st.flags.prologue || st.flags['prologue.card'] || (st.steps.prologue || 0) > 0) return;
    // the feeders' scene was cut short (its event, the flip, is spent): put the plate back so the peck counts again
    if (G.signs.live('S1')) G.signs.revert('S1', { quiet: true });
    const lamp = G.prologueLamp, g = G.gus;
    if (st.time < 1) { G.startPrologue(); return; }   // saved by New Game itself: the opening, from the top
    G.intro = { stage: 'flap', t: 0 };
    if (g.mode === 'perch' && Math.hypot(g.position.x - lamp.x, g.position.z - lamp.z) < 1.5) { G.tutor('flap', 'hold to fly'); return; }
    // already off the lamppost: point at the sign (prologueTick runs the rest, as in the first minute)
    G.intro.stage = 'find'; G.intro.findT = 0;
    const s = S1();
    G.bubbles.add('!', { id: 'S1-clue', kind: 'clue', at: { x: s.x, y: s.y + 1.25, z: s.z }, ttl: 0, range: 120 });
    G.toast(FIND_SIGN, { seconds: 5 });   // guidance: names what to look for, and where
  };

  /** Fixes-3 (R1): where Gus reads S1 from: 1 m in front of its face, on dry ground (else a little to one side). */
  const signSpot = (s) => {
    for (const [d, off] of [[1.0, 0], [1.3, 0.35], [1.3, -0.35], [1.6, 0.7], [1.6, -0.7]]) {
      const a = s.yaw + off, x = s.x + Math.sin(a) * d, z = s.z + Math.cos(a) * d;
      if (!G.collision.waterAt(x, z) && !G.collision.solidAt(x, G.terrain.heightAt(x, z) + 0.3, z)) return { x, z };
    }
    return { x: s.x + Math.sin(s.yaw), z: s.z + Math.cos(s.yaw) };
  };

  /** The first minute's prompts, every update until the Prologue card shows. */
  G.prologueTick = (dt) => {
    const I = G.intro;
    if (!I || G.state.flags['prologue.card']) return;
    I.t += dt;
    const g = G.gus, s = S1();
    if (I.stage === 'flap' && g.mode === 'fly') { G.tutor(null); I.stage = 'find'; I.findT = 0; G.bubbles.add('!', { id: 'S1-clue', kind: 'clue', at: { x: s.x, y: s.y + 1.25, z: s.z }, ttl: 0, range: 120 }); }
    if (I.stage === 'find') {
      I.findT += dt;
      const d = Math.hypot(g.position.x - s.x, g.position.z - s.z);
      if (g.grounded && d < 5) {
        I.stage = 'look';
        G.bubbles.remove('S1-clue');
        // Fixes-3 (R1): he lands up to 5 m off, often past the sign with the camera facing away, and "Peck the sign" did
        // nothing until he turned and walked back. He now hops up to it (1 m in front of its face, facing it) while the
        // camera looks over his shoulder at it, and the follow camera takes over from right behind him.
        const spot = signSpot(s), face = Math.atan2(s.x - spot.x, s.z - spot.z);
        const from = { x: g.position.x, z: g.position.z };
        const back = Math.atan2(spot.x - s.x, spot.z - s.z);
        G.cutscene.run('prologue-sign', [
          { do: () => G.sfTween(0.7, (k) => { const e = k * k * (3 - 2 * k), x = from.x + (spot.x - from.x) * e, z = from.z + (spot.z - from.z) * e; g.place({ x, z, y: G.surfaceY(x, z, g.position.y + 1), yaw: face, mode: 'walk' }); }) },
          { cam: { ...G.shot({ x: (spot.x + s.x) / 2, y: g.position.y, z: (spot.z + s.z) / 2 }, { dist: 2.6, height: 0.55, yaw: back + 0.35, lookY: 0.45 }), secs: 1.0 } },
          { do: () => G.bubbles.add(PROLOGUE_LINES.thought, { kind: 'thought', at: () => ({ x: g.position.x, y: g.position.y + 0.6, z: g.position.z }), ttl: 2.6 }) },
          { wait: 2.4 },
          { do: () => { G.rig.yaw = face; G.rig.pitch = 0.12; } },
          { follow: true },
          { do: () => { G.tutor('peck', 'the sign'); I.stage = 'peck'; } },
        ]);
      } else if (I.findT > 8 && !I.hinted) { I.hinted = true; G.toast(FIND_SIGN, { seconds: 5 }); }
    }
    if (I.stage === 'peck' && G.signs.live('S1')) { G.tutor(null); I.stage = 'crumbs'; }
  };

  // ---------------------------------------------------------------- step 1 → the feeders and the card
  E.registerScript('prologue.feeders', (ctx, done) => {
    G.tutor(null);
    if (G.intro) G.intro.stage = 'crumbs';
    // Fixes-2 (P3): the first "eat" was easy to miss (small crumbs a metre off, often behind the sign or the camera).
    // Now the picnickers' toss lands right in front of Gus (wherever he waited), bigger and glowing (food.js), and the
    // camera takes a quick look at it: a render-only glance (camera-rig.js), so he keeps control the whole time.
    const g = G.gus;
    G.cutscene.run('prologue-crumbs', [
      { control: true },
      { until: () => !!G.food.pileFor('S1') },
      { do: () => {
        const p = G.food.pileFor('S1');
        // on dry ground (S1's path runs by the Pond), in front of him, and as clear of the picnickers' feet as can be
        const legs = G.humans.agents.filter((h) => h.out && Math.hypot(h.x - g.position.x, h.z - g.position.z) < 6);
        let fx = g.position.x, fz = g.position.z, best = -1;
        for (const off of [0.8, -0.8, 0.3, -0.3, 1.4, -1.4]) {
          const a = g.yaw + off, x = g.position.x + Math.sin(a) * 1.1, z = g.position.z + Math.cos(a) * 1.1;
          if (G.collision.waterAt(x, z)) continue;
          const clear = Math.min(3, ...legs.map((h) => Math.hypot(h.x - x, h.z - z))) - Math.abs(off) * 0.3;
          if (clear > best) { best = clear; fx = x; fz = z; }
        }
        p.x = fx; p.z = fz; p.y = G.surfaceY(fx, fz, G.terrain.heightAt(fx, fz) + 0.4);
        G.food.dirty = true; G.food.bounce.set(p.id, 0);
        G.particles.burst('crumbs', fx, p.y + 0.3, fz, 16, { spread: 0.4 });
        G.particles.burst('sparkle', fx, p.y + 0.1, fz, 12, { spread: 0.6 });
        // a look down at Gus and the glowing pile, from his side away from the sign and clear of the picnickers' legs
        const gp = g.position, mx = (gp.x + fx) / 2, mz = (gp.z + fz) / 2, s1 = S1();
        // away from the picnickers (their middle), else away from the sign
        const cx0 = legs.length ? legs.reduce((q, h) => q + h.x, 0) / legs.length : s1.x, cz0 = legs.length ? legs.reduce((q, h) => q + h.z, 0) / legs.length : s1.z;
        const base = Math.atan2(mx - cx0, mz - cz0);
        const blocked = (cx, cz) => legs.some((h) => { const dx = mx - cx, dz = mz - cz, L2 = dx * dx + dz * dz, u = Math.max(0, Math.min(1, ((h.x - cx) * dx + (h.z - cz) * dz) / L2)); return Math.hypot(h.x - (cx + dx * u), h.z - (cz + dz * u)) < 0.6; });
        let yaw = base;
        for (const off of [0.5, -0.5, 0, 1.1, -1.1, 1.7, -1.7, Math.PI]) { const a = base + off; if (!blocked(mx + Math.sin(a) * 2.0, mz + Math.cos(a) * 2.0)) { yaw = a; break; } }
        const gy = G.surfaceY(mx, mz, gp.y + 0.5);
        if (g.mode !== 'fly') G.rig.glance({ pos: [mx + Math.sin(yaw) * 2.0, gy + 1.9, mz + Math.cos(yaw) * 2.0], look: [mx, gy + 0.1, mz], secs: 2.2 });
      } },
      { wait: 0.6 },
      { do: () => { if (!G.state.crumbs) G.tutor('move', 'over the crumbs to eat'); } },
      { until: () => G.state.crumbs >= 4 || G.cutscene.t > 14 },
      { do: () => G.tutor(null) },
      { wait: 0.6 },
      { cam: { ...G.shot({ x: PROLOGUE.duchessPerch.x, y: 0.9, z: PROLOGUE.duchessPerch.z }, { dist: 5, height: 1.4, yaw: 0.3, lookY: 0.2 }), secs: 1.4 } },
      { do: () => { const d = G.chars.find('duchess'); G.bubbles.add('Hmm. Interesting.', { at: () => ({ x: d.x, y: d.y + 0.55, z: d.z }), ttl: 2.4, range: 60 }); G.audio.play('gang-coo-murmur', { vol: 0.6 }); } },
      { wait: 2.6 },
      { follow: true },
      { do: () => {
        G.state.flags['prologue.card'] = true;
        G.toast('New scheme on your Board: Crumbs', { kind: 'stamp', seconds: 4 });
        G.intro = null;
        done();
      } },
    ]);
  });

  // fun pass (P7): a sign the ranger puts back while the player hunts the others is called out (it read as a silent reset)
  G.bus.on('revert', (t, e) => {
    if (!['S1', 'S2', 'S3'].includes(e.sign) || !E.isOpen('prologue') || E.stepIndex('prologue') !== 1 || G.cutscene.running) return;
    const name = { S1: 'your first sign', S2: 'the Gapstow sign', S3: 'the south shore sign' }[e.sign];
    G.toast(`The ranger fixed ${name}. Flip it again!`, { kind: 'bad', seconds: 4 });
    G.bus.emit('fail', { kind: 'revert', sign: e.sign });
  });

  // ---------------------------------------------------------------- step 2 → the frenzy, the Swells join
  E.registerScript('prologue.frenzy', (ctx, done) => {
    const d = G.chars.find('duchess');
    const g = G.gus;
    const spot = { x: g.position.x + Math.sin(g.yaw) * 1.4, z: g.position.z + Math.cos(g.yaw) * 1.4 };
    spot.y = G.surfaceY(spot.x, spot.z, g.position.y + 0.4);
    G.cutscene.run('prologue-frenzy', [
      { do: () => { G.chars.arrive(d, spot, 'swoop', 2.6); d.here = { x: spot.x, z: spot.z, scripted: true }; G.audio.play('gang-coo-murmur', { at: spot }); G.flock.setRoster({ swells: 6 }); G.flock.place(G.leader()); G.flock.coo(); } },
      { cam: { ...G.shot({ x: (g.position.x + spot.x) / 2, y: g.position.y, z: (g.position.z + spot.z) / 2 }, { dist: 3, height: 1.1, yaw: g.yaw + Math.PI + 0.7, lookY: 0.25 }), secs: 1.2 } },
      { wait: 2.7 },
      { do: () => { G.food.addPile(spot.x - 0.8, spot.z + 0.5, 8, { kind: 'bread' }); G.particles.burst('feathers', spot.x, spot.y + 0.3, spot.z, 16); } },
      { say: PROLOGUE_LINES.frenzy },
      { follow: true },
      { do: () => done() },
    ]);
  });

  // ---------------------------------------------------------------- step 3 → the ranger, the van, the spikes
  E.registerScript('prologue.end', (ctx, done) => {
    const s = S1();
    let reverted = false;
    const off = G.bus.on('revert', (t, e) => { if (e.sign === 'S1') reverted = true; });
    const van = G.van;
    G.cutscene.run('prologue-end', [
      { wait: 1.5 },
      { do: () => { G.tutor(null); G.rangers.revertNow('S1'); } },
      { cam: { ...G.shot(s, { dist: 9, height: 3.5, yaw: s.yaw, lookY: 0.8 }), secs: 1.5 } },
      { until: () => reverted },
      { say: [PROLOGUE_LINES.ranger] },
      { do: () => { off(); van.drive(PROLOGUE.vanFrom, PROLOGUE.vanStop, 6); } },
      { cam: { ...G.shot({ x: PROLOGUE.vanStop.x, y: 0.15, z: PROLOGUE.vanStop.z }, { dist: 12, height: 4, yaw: -0.9, lookY: 1.4 }), secs: 1.6 } },
      { until: () => van.arrived },
      { do: () => van.prickettOut() },
      { wait: 1.5 },
      { say: [PROLOGUE_LINES.prickett[0], PROLOGUE_LINES.prickett[1]] },
      { do: () => { G.spikes.install(['P1', 'P2', 'P3', 'P4']); G.audio.play('spray-hiss', { at: van.pos }); G.particles.burst('dust', 97, 4.5, -34, 20, { spread: 6, color: [0.85, 0.85, 0.9] }); } },
      { cam: { ...G.shot({ x: 97, y: 0.15, z: -34 }, { dist: 13, height: 5, yaw: -0.4, lookY: 3 }), secs: 1.2 } },
      { wait: 1.6 },
      { say: [PROLOGUE_LINES.prickett[2]] },
      { follow: true },
      // fun pass (P2): the Board tracks Sue first, so the swarm (just taught) is learnt cleanly on her slice before the ducks twist it
      { do: () => { const d = G.chars.find('duchess'); G.chars.goHome(d); done(); if (G.schemes.isOpen('den-rats')) G.state.tracked = 'den-rats'; G.later(0.4, () => G.openMenu('board', { intro: 'pending' })); G.later(4, () => { G.tutor('coo', 'to gather your flock, hold it to swarm'); G.cooTutor = true; G.cooTutorT = 0; }); } },
    ]);
  });
}
