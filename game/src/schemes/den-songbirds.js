// den-songbirds, "A New Sound" (Spikes). Prickett spiked the starlings' roost
// on the natural history museum's cornice (P3): the starlings circle it. The
// cats Knock the glued strips off the edge. Then Mimi wants a new sound for
// her act, one nobody else does: at Afternoon Gus perches on the ice-cream
// truck by Grand Army Plaza and pecks its chime while she watches. She learns
// the jingle on the spot, lures every kid on the Plaza with it, and the
// Racket joins (Mimic).
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine, face, birds } from './_sf-common.js';
import { SPIKE_SITES } from '../world/layout.js';

export const TRUCK = { x: 78, z: -13, yaw: Math.PI / 2 };   // where street.js parks the ice-cream truck at Afternoon
const P3 = SPIKE_SITES.find((s) => s.id === 'P3');

export async function installDenSongbirds(G) {
  const E = G.schemes;
  const ring = await birds(G, 'songbird', 16, 0.32, { tint: 0x2f2b3a });
  const top = () => G.surfaceY(P3.x + 6, P3.z, 400);
  let t = 0;
  // the truck gets a roof to perch on (it parks here only at Afternoon)
  let col = null;
  const tr = G.street.icecream;
  if (tr?.children[0]?.geometry) {
    const geo = tr.children[0].geometry; geo.computeBoundingBox();
    const bb = geo.boundingBox, len = bb.max.z - bb.min.z, wid = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
    const y0 = G.surfaceY(TRUCK.x, TRUCK.z, 3);
    col = G.collision.addBox({ x: TRUCK.x, z: TRUCK.z, y0, h: h * 0.94, w: len * 0.96, d: wid * 0.92, tag: 'truck' });
    G.sfTruckTop = y0 + h * 0.94;
    col.off = !tr.visible;
  }
  // ---------------------------------------------------------------- step 1: the starlings circle their spiked cornice
  E.registerScript('songbirds.roost', (ctx, done) => {
    const y = top();
    G.cutscene.run('songbirds-roost', [
      { do: () => { G.audio.play('starling-chatter', { at: { x: P3.x, y, z: P3.z } }); } },
      { cam: { ...G.shot({ x: P3.x + 10, y, z: P3.z }, { dist: 18, height: 7, yaw: -1.25, lookY: 2 }), secs: 1.4 } },
      { wait: 1.6 },
      { say: [
        L('mimi', '*a perfect car alarm* …Ha! Gotcha. Oh, it\'s the pigeon with the scarf.', 'mimi-greeting'),
        L('mimi', 'Look at my cornice, sweetie. SPIKES. Where is a starling supposed to rehearse? On a BUS?'),
        L('jay', 'CAW CAW! …Sorry. Doing my crow. It was Prickett. Glued strips, right along the edge.'),
        L('ruby', '"Something is rotten in the state of… the cornice."'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  // ---------------------------------------------------------------- step 2: the cats knock the strips off; the starlings land
  E.registerScript('songbirds.cornice', (ctx, done) => {
    G.audio.play('starling-chatter', { at: G.gus.position });
    G.later(0.6, () => G.say([
      L('mimi', 'Ooh. The acoustics are BACK. Thank you, darling. Thank your terrifying friends.'),
      L('mimi', 'Now. My act needs a NEW sound. Something nobody in this park can do. Bring me one and the Racket is yours.'),
      L('chip', 'Psst. Afternoons, the ice-cream truck by the Plaza. That tune? Nobody can do that tune.'),
    ], done));
  });
  // ---------------------------------------------------------------- step 3: the chime, the jingle, every kid on the Plaza
  E.registerScript('songbirds.jingle', (ctx, done) => {
    const mimi = G.chars.find('mimi');
    let list = [];
    G.cutscene.run('songbirds-jingle', [
      { do: () => { G.audio.synth('jingle'); } },
      { cam: shotAt(G, G.gus.position, { dist: 6, height: 2.2, side: 0.9, lookY: -0.6 }) },
      { wait: 2.6 },
      { do: () => { if (mimi) G.chars.animate(mimi, 'sing', 3); bubbleOver(G, mimi, '♪ ♫ ♪', 3); } },
      { say: [L('mimi', 'Oh. Oh, that\'s DIVINE. Again! …No. Don\'t. I\'ve got it.')] },
      { do: () => {
        G.audio.synth('jingle', { wobble: true });
        for (const k of [0, 0.5, 1, 1.5, 2]) G.later(k, () => mimi && G.particles.burst('notes', mimi.x, mimi.y + 0.3, mimi.z, 4, { spread: 0.4 }));
        // every kid on the Plaza comes running
        const to = { x: TRUCK.x + 3, z: TRUCK.z - 6 };
        const kids = G.humans.agents.filter((a) => a.out && !a.script && (a.role === 'kid' || a.role === 'rckid' || a.spec?.kid || a.role === 'tourist' || a.role === 'parkgoer') && Math.hypot(a.x - to.x, a.z - to.z) < 45);
        kids.forEach((a, i) => { a.busy = true; G.humans.goTo(a, { x: to.x + Math.cos(i * 1.3) * 1.6, z: to.z + Math.sin(i * 1.3) * 1.6 }, 3.2, () => { a.mode = 'linger'; a.t = 20; }); G.later(0.3 + i * 0.2, () => G.bubbles.add('ICE CREAM!', { at: () => ({ x: a.x, y: (a.y ?? 0) + 2.05, z: a.z }), ttl: 1.8 })); });
      } },
      { cam: { ...G.shot({ x: TRUCK.x + 3, y: G.surfaceY(TRUCK.x + 3, TRUCK.z - 6, 5), z: TRUCK.z - 6 }, { dist: 9, height: 3, yaw: Math.PI - 0.4, lookY: 1 }), secs: 1.2 } },
      { wait: 2.4 },
      { do: () => { list = gather(G, ['mimi', 'jay', 'ruby', 'chip'], { kind: 'flutter', d: 1.3 }); } },
      { cam: shotAt(G, G.gus.position, { dist: 2.5, height: 0.65, side: 0.7, lookY: 0.1 }) },   // Polish-1: close in: songbirds are small
      { wait: 1.4 },
      { do: () => { cheer(G, list); G.audio.play('songbird-chatter', { at: G.gus.position }); } },
      { say: [
        L('mimi', 'Every kid on the Plaza. With ONE tune. Sweetie, you\'re a genius. The Racket is yours.', 'mimi-join'),
        L('jay', 'Phone rings, car alarms, ranger whistles, ice cream. Point us at a human and they WANDER OFF.'),
        L('ruby', '"All the world\'s a stage." And we just stole it.'),
      ] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
  // the ice-cream truck's chime button (any Afternoon: it plays the jingle; in step 3 Mimi learns it)
  const chime = { x: TRUCK.x, z: TRUCK.z + 0.6 };
  G.interact.register({
    id: 'icecream-chime', kind: 'clue', priority: 6, r: 1.5, dy: 1.4,
    get x() { return chime.x; }, get z() { return chime.z; }, get y() { return G.sfTruckTop ?? 2.6; },
    label: () => (G.state.phase === 'afternoon' && G.street.icecream?.visible ? 'Peck the chime button' : null),
    act: () => { if (!onStep(G, 'den-songbirds', 3)) { G.audio.synth('jingle'); G.toast('The truck plays its tune. Somewhere, a child gasps.'); } },
  });
  // talking to the Racket during the scheme
  G.bus.on('talk', (tp, e) => {
    if (e.who === 'mimi' && onStep(G, 'den-songbirds', 3)) G.later(0, () => { if (!G.dialogue.open) G.say([L('mimi', 'Something NOBODY does, sweetie. I\'ll be by the ice-cream truck all afternoon. Watching.')]); });
  });
  mechaLine(G, 'mimi', 'songbirds', 'A giant pigeon made of junk? Darling, I can do its VOICE already. Listen: *CLANK*.');

  return {
    update(dt) {
      t += dt;
      if (col) col.off = !G.street.icecream.visible;
      // the starlings circle their spiked cornice while P3 is up and Gus is near
      const g = G.gus.position;
      const on = G.state.spikes.P3 === 'installed' && Math.hypot(g.x - P3.x, g.z - P3.z) < 160;
      ring.mesh.visible = on;
      if (on) { const y = top() + 4; for (let i = 0; i < ring.n; i++) { const a = t * 0.9 + (i / ring.n) * Math.PI * 2, r = 9 + 2.5 * Math.sin(i * 1.7 + t); ring.set(i, P3.x + 6 + Math.cos(a) * r, y + Math.sin(a * 2 + i) * 1.2, P3.z + Math.sin(a) * r, a + Math.PI / 2, t * 14 + i); } ring.commit(); }
      // Mimi waits by the ice-cream truck at Afternoon in step 3
      const mimi = G.chars.find('mimi');
      if (mimi && !mimi.script && !mimi.here) {
        if (onStep(G, 'den-songbirds', 3) && G.state.phase === 'afternoon') { const p = { x: TRUCK.x + 2.6, z: TRUCK.z - 2.2 }; mimi.x = p.x; mimi.z = p.z; mimi.y = G.surfaceY(p.x, p.z, 4); face(mimi, G.gus.position); mimi.sfMoved = true; }
        else if (mimi.sfMoved) { mimi.sfMoved = false; G.chars.goHome(mimi); }
      }
    },
    group: ring.mesh,
  };
}
