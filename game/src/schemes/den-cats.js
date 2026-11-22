// den-cats, "The Hot Anchovy" (Slice Run). Queenie wants a HOT anchovy slice
// from CPW & 72nd: 820 m is too far to fly hot, so relay it through the grates
// or warm it on the halal griddle. Fun pass (P4): the slice comes off the bodega
// window sill, where the counterman left one cooling right next to Pickles, who
// is asleep, and who is a CAT. Grabbing it gets "not with Pickles RIGHT there";
// wake him (peck him, or Coo under the window) and he stares at you and slowly
// pushes it off the sill. The anchovy fan on the bench is the red herring (a
// swarm gets "Mob me all you like"). Step 3 says when the slice has gone cold,
// Queenie's refusal points at the problem, and a fresh slice is on the sill a
// minute later (no nap and no flight back needed). When the cats join, Pickles
// clears the Racers' roost (P5: the old Racers strips step).
import * as THREE from 'three';
import { L, joinScene, mechaLine, onStep, bubbleOver } from './_ssf-common.js';
import { PLACES } from '../world/layout.js';
import { KEEP } from '../data/item-sources.js';
import { ruleMaterial } from '../gfx/load-model.js';

// the bodega window sill (the storefront's face is at x -129.8; data/crews.js has Pickles at -129.5, 247.2 on the pavement)
const SILL = { x: -129.55, z: 247.25, y: 0.78, w: 0.42, d: 1.7 };
const PICKLES_AT = { x: -129.55, z: 246.85 };
const SLICE_AT = { x: -129.55, z: 247.75 };
const WAKE_R = 4;          // a Coo this close wakes him
const AGAIN = 60;          // a fresh slice on the sill a minute after a cold one is refused

export function installDenCats(G) {
  const E = G.schemes;
  E.registerScript('cats.meet', (ctx, done) => G.say([
    L('queenie', 'Queenie. Of 110th Street. And the bodega. And you, if I say so.'),
    L('queenie', 'I fancy an anchovy slice. From CPW and 72nd. The ONLY joint that does them properly.'),
    L('queenie', 'And it must be HOT, darling. I can tell. I can always tell.'),
    L('whiskerton', 'Seventy-second is the other side of the park, dear. Nothing arrives hot from there. I\'ve seen every mayor try.'),
  ], done));

  // the sill: a stone ledge under the bodega window, perchable; Pickles sleeps on it (his loaf of bread is his accessory)
  const ground = G.terrain.heightAt(SILL.x, SILL.z);
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(SILL.w, 0.08, SILL.d), ruleMaterial({ color: 0xb9ae9c, roughness: 0.9 }));
    m.position.set(SILL.x, ground + SILL.y - 0.04, SILL.z);
    m.castShadow = true; m.receiveShadow = true;
    G.items.group.add(m);
    G.collision.addBox({ x: SILL.x, z: SILL.z, y0: ground + SILL.y - 0.08, h: 0.08, w: SILL.w, d: SILL.d, tag: 'sill' });
    const p = G.chars.find('pickles');
    if (p) { p.home = { ...p.home, x: PICKLES_AT.x, z: PICKLES_AT.z, y: ground + SILL.y, yaw: Math.PI / 2 }; if (!p.here) { p.x = p.home.x; p.y = p.home.y; p.z = p.home.z; p.yaw = p.home.yaw; } }
  }

  const sillSlice = () => G.items.world.find((w) => w.sill);
  const hotAnchovy = () => (G.state.carried?.id === 'slice-anchovy' && G.items.isHot(G.state.carried)) || G.items.world.some((w) => w.id === 'slice-anchovy' && !w.sill && G.items.isHot(w));
  const day = () => G.state.phase !== 'night';   // ("day" is Morning to Dusk)
  const onSliceStep = () => (onStep(G, 'den-cats', 2) || onStep(G, 'den-cats', 3)) && day();
  let readyAt = Infinity;   // (step 3) the counterman puts a fresh one out a minute after a cold refusal…
  let tookIn = null;        // …or once the phase has changed since Gus took the last one
  let saidCold = false, refusals = 0, knocking = false;

  // the guard: not with Pickles RIGHT there
  // (fix-16: the guard returns its reason; items.js shows it as the toast, every time; peek = the prompt asking)
  G.items.guards.push((it, peek) => {
    if (!it.sill) return null;
    if (!peek) bubbleOver(G, 'pickles', ['Pickles: *snore*… mmm… anchovy… *snore*', 'Pickles: *one ear twitches*'][refusals++ % 2], 2.6);
    return 'Not with Pickles RIGHT there. He\'s asleep… for now.';
  });
  // the fan on the bench: the red herring
  G.humans.clings.push((a) => (a.role === 'sliceeater' && a.holds === 'slice-anchovy' && onStep(G, 'den-cats', 2) ? 'Mob me all you like, pigeon. This one\'s MINE. Go bother the CAT.' : null));

  const fall = { x: SLICE_AT.x + 0.9, z: SLICE_AT.z + 0.2 };
  /** The slice slides off the sill and lands hot on the pavement. */
  const pushOff = (it) => {
    if (G.items.world.includes(it)) G.items.remove(it);
    const y0 = ground + SILL.y, y1 = G.surfaceY(fall.x, fall.z, y0 - 0.2);
    const s = G.items.spawn('slice-anchovy', fall.x, fall.z, { born: G.state.time, y: y1 });
    s.mesh.position.y = y0;
    G.clues.anims.push({ t: 0, secs: 0.45, step: (k) => { s.mesh.position.set(SLICE_AT.x + (fall.x - SLICE_AT.x) * k, y0 + (y1 - y0) * k * k, SLICE_AT.z + (fall.z - SLICE_AT.z) * k); s.mesh.rotation.z = k * 2.5; }, done: () => { G.audio.play('knock-clatter', { at: fall }); G.particles.burst('steam', fall.x, y1 + 0.1, fall.z, 8); } });
  };
  /** fix-19: after the first push, a retry is quick: Pickles sighs and shoves it off (a bubble, no scene, no dialogue). */
  const quickKnock = (it, p) => {
    knocking = true;
    const g = G.gus.position;
    p.yaw = Math.atan2(g.x - p.x, g.z - p.z);
    G.audio.play('cat-meow', { at: p, rate: 0.8 });
    bubbleOver(G, 'pickles', 'Pickles: Sigh. You AGAIN. …Fine.', 2.6);
    G.later(0.6, () => { p.yaw = Math.atan2(SLICE_AT.x - p.x, SLICE_AT.z - p.z); G.chars.animate(p, 'knock', 1.6); });
    G.later(1.4, () => { if (G.items.world.includes(it)) pushOff(it); knocking = false; });
    G.later(3.2, () => { p.yaw = Math.PI / 2; });
    return true;
  };
  /** Pickles wakes, stares, and slowly pushes the slice off the sill: it lands hot on the pavement. */
  const knock = () => {
    const it = sillSlice(), p = G.chars.find('pickles');
    if (!it || !p || knocking) return false;
    if (G.state.flags['pickles.pushed'] || onStep(G, 'den-cats', 3)) return quickKnock(it, p);   // (on step 3 he has pushed one already: saves from before the flag too)
    G.state.flags['pickles.pushed'] = true;
    knocking = true;
    const g = G.gus.position;
    G.cutscene.run('pickles-knock', [
      { do: () => { p.yaw = Math.atan2(g.x - p.x, g.z - p.z); G.audio.play('cat-meow', { at: p, rate: 0.85 }); } },
      { cam: { ...G.shot({ x: SILL.x, y: ground + SILL.y, z: SILL.z + 0.3 }, { dist: 3.2, height: 0.7, yaw: Math.PI / 2 - 0.5, lookY: 0.1 }), secs: 0.8 } },
      // (a say in the same update as the talk: the usual chat stays quiet, characters.js talk())
      { say: [L('pickles', '*yawn*… Mm? …Oh. It\'s YOU.')] },
      { wait: 0.4 },
      { do: () => { p.yaw = Math.atan2(SLICE_AT.x - p.x, SLICE_AT.z - p.z); G.chars.animate(p, 'knock', 2.4); bubbleOver(G, 'pickles', '*stares at you* …*paw*', 2.2); } },
      { wait: 1.7 },
      { do: () => pushOff(it) },
      { wait: 0.8 },
      { do: () => { p.yaw = Math.atan2(g.x - p.x, g.z - p.z); } },
      { say: [L('pickles', '…I didn\'t do that. You didn\'t see that.')] },
      { follow: true },
      { do: () => { p.yaw = Math.PI / 2; bubbleOver(G, 'pickles', '*snore*', 2); } },
    ], () => { knocking = false; }, () => { knocking = false; });
    return true;
  };
  // peck Pickles while the slice is on the sill: he wakes (instead of the usual chat)
  G.bus.on('talk', (t, e) => { if (e.who === 'pickles' && onSliceStep() && sillSlice()) { if (G.state.flags['pickles.pushed'] || onStep(G, 'den-cats', 3)) e.quiet = true; knock(); } });
  // or Coo right under the window
  G.bus.on('coo', (t, e) => {
    if (!onSliceStep() || !sillSlice()) return;
    if (Math.hypot(e.x - PICKLES_AT.x, e.z - PICKLES_AT.z) < WAKE_R) { e.handled = true; knock(); }
  });
  G.bus.on('pickup', (t, e) => { if (e.item === 'slice-anchovy') { tookIn = G.state.phase; readyAt = Infinity; } });
  // Queenie refuses a cold one: she names the problem (never the answer), and the counterman puts another out
  G.bus.on('fail', (t, e) => {
    if (e.kind !== 'cold' || e.to !== 'queenie' || !onStep(G, 'den-cats', 3)) return;
    readyAt = G.state.time + AGAIN;
    G.later(2.2, () => G.say([L('queenie', G.state.crews.includes('rats') ? 'Over the park takes too long, darling. Under it, perhaps?' : 'The halal man\'s griddle is on 110th at Dusk, darling. I\'m only saying.')]));
  });

  // fix-19: losing the anchovy slice any way at all (given away, a nap's rat, Ruffled, dropped where it can't be reached and
  // floated back: items.js) puts the next one out on the sill early, and a toast names the place (the compass marks it).
  // The sill is only stocked Morning to Dusk, so at Night it says when.
  const SOON = 4;
  let lostSaid = null;   // 'night' | 'day': what the last toast said
  const anchovyAbout = () => G.state.carried?.id === 'slice-anchovy' || G.items.world.some((w) => w.id === 'slice-anchovy' && !w.sill);
  let awayT = 0;
  const watchLost = () => {
    const st = G.state;
    // fix-23: one left lying with Gus far away for 90 s floats back (the next one goes out on the sill)
    const lying = onStep(G, 'den-cats', 3) && G.items.world.find((w) => w.id === 'slice-anchovy' && !w.sill), g = G.gus.position;
    awayT = lying && Math.hypot(lying.x - g.x, lying.z - g.z) > KEEP.awayR ? awayT + 1 / 60 : 0;
    if (lying && awayT > KEEP.awaySecs) { awayT = 0; G.items.remove(lying); }
    if (!onStep(G, 'den-cats', 3) || knocking || anchovyAbout() || sillSlice()) { if (anchovyAbout()) lostSaid = null; return; }
    if (!day()) {
      if (lostSaid !== 'night') { lostSaid = 'night'; G.toast('No anchovy slice now. The counterman puts the next one on Pickles\' sill at CPW & 72nd. Out again in the morning.', { seconds: 5 }); }
      readyAt = Math.min(readyAt, st.time);
      return;
    }
    if (readyAt > st.time + SOON) readyAt = st.time + SOON;
  };
  let sillWasOut = false;

  let pT = 0;
  G.mods.push({
    compass: () => (onStep(G, 'den-cats', 3) && sillSlice() && G.state.carried?.id !== 'slice-anchovy' ? [{ x: SLICE_AT.x, z: SLICE_AT.z, icon: 'target' }] : []),
    update: () => {
      const st = G.state;
      watchLost();
      // the slice cooling on the sill, while the scheme wants one (step 2; step 3 again once a run has failed)
      const want = onSliceStep() && !hotAnchovy() && !knocking && (onStep(G, 'den-cats', 2) || st.time >= readyAt || (tookIn && tookIn !== st.phase));
      const it = sillSlice();
      if (want && !it) {
        G.items.spawn('slice-anchovy', SLICE_AT.x, SLICE_AT.z, { born: st.time, y: ground + SILL.y, extra: { sill: true, low: true } });
        // fix-19: a fresh one for another try (step 3): say where
        if (onStep(G, 'den-cats', 3) && !sillWasOut) G.toast('A fresh anchovy slice is cooling on Pickles\' sill at CPW & 72nd.', { seconds: 4.5 });
        lostSaid = null;
      }
      else if (it && !onSliceStep() && !knocking) G.items.remove(it);
      sillWasOut = !!sillSlice();
      if (it && G.items.heat(it) < 0.4) { it.born = st.time; const sv = st.items.find((q) => q.uid === it.uid); if (sv) sv.born = it.born; }   // (fresh from the oven: it steams)
      // step 3: the first time it goes cold in the beak
      const c = st.carried;
      if (onStep(G, 'den-cats', 3) && c?.id === 'slice-anchovy' && !G.items.isHot(c) && !saidCold && !G.dialogue.open) {
        saidCold = true;
        G.bubbles.add('Mrs. Whiskerton (far off): Cold already. Over the park\'s too slow, dear.', { at: () => ({ x: G.gus.position.x, y: G.gus.position.y + 0.9, z: G.gus.position.z }), ttl: 4, range: 200 });
        G.bus.emit('fail', { kind: 'coldInBeak' });
      }
      // Pickles, by the anchovy fan's bench, while the slice is on the sill: a sleepy line now and then
      if (onStep(G, 'den-cats', 2)) {
        const p = PLACES['slice-cpw72'], g = G.gus.position;
        if (Math.hypot(g.x - p.x, g.z - p.z) < 25 && st.time - pT > 12) { pT = st.time; bubbleOver(G, 'pickles', ['Pickles: *snore*… anchovy…', 'Pickles: zzz… mine… zzz', 'Pickles: *twitch*'][(pT / 12 | 0) % 3], 3.5); }
      }
    },
    restore: () => { awayT = 0; knocking = false; readyAt = Infinity; tookIn = null; saidCold = false; lostSaid = null; sillWasOut = !!sillSlice(); },
  });
  // Express conducts a hot anchovy through the grates
  G.bus.on('grate', () => {
    const c = G.state.carried;
    if (c?.id === 'slice-anchovy' && onStep(G, 'den-cats', 3)) G.later(0.8, () => G.say([L('express', 'Hot anchovy, express service! Ninety-sixth Street, everybody off!')]));
  });
  E.registerScript('cats.join', (ctx, done) => joinScene(G, 'cats-join', {
    members: ['queenie', 'whiskerton', 'pickles'], kind: 'slink', sfx: 'cat-meow',
    lines: [
      L('queenie', '*sniff* …Anchovy. From 72nd. And HOT. Across the whole park?'),
      L('whiskerton', 'Well. That\'s a first, and I\'ve seen every mayor.'),
      L('pickles', 'Is there… any left? Just the crust? No? Fine.'),
      L('queenie', 'The Bodega Cats are yours, darling. Anything on a ledge, we knock it off. It\'s what we live for.', 'queenie-join'),
      // fun pass (P5): the cats' first job is on the house: Pickles knocks the strips off the Racers' gatehouse roost
      L('queenie', 'First job\'s on the house. Pickles. The Reservoir. Those strips on the gatehouse.'),
      L('pickles', 'For SCIENCE.'),
    ],
  }, () => {
    if (G.state.spikes.P2 === 'installed') { G.spikes.clear('P2'); G.state.flags['spike.P2.cleared'] = true; G.bus.emit('spikeCleared', { site: 'P2', by: 'cats' }); }
    G.later(1.2, () => G.toast('Spikes cleared: the Racers\' roost at the Reservoir (Pickles: "For SCIENCE.")', { kind: 'stamp', seconds: 4 }));
    done();
  }));
  mechaLine(G, 'queenie', 'cats', 'A tin pigeon in the Ramble. Tell it if it sits on my bodega, I\'m knocking it off.');
}
