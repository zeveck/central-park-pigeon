// den-racers, "No Roost, No Training" (Spikes). Coach Wingate's Reservoir
// Racers won't train with their gatehouse roost spiked (P2). The cats Knock
// the strips off (fun pass P5: Pickles does it when the cats join, so there's no
// strips step here); Gus has to win a race: the flight race round the ten
// rings (Lapcount holds the stopwatch; after two losses Sprint flies ahead to
// show the line, systems/race.js), or at Dusk the wheeled division in the
// pedicab the raccoons rig (one lap of the track inside Coach's posted time).
// The winner throws a 30-crumb feast: with the crumbs in hand it happens right
// there in the win scene (no chore after the payoff); without, it's step 3.
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine } from './_sf-common.js';
import { SPIKE_SITES, RACE } from '../world/layout.js';

const P2 = SPIKE_SITES.find((s) => s.id === 'P2');

export function installDenRacers(G) {
  const E = G.schemes;
  E.registerScript('racers.coach', (ctx, done) => {
    const y = G.surfaceY(P2.x, P2.z, 40);
    G.cutscene.run('racers-coach', [
      { say: [
        L('wingate', 'Coach Wingate. Reservoir Racers. Drop and give me twenty, rookie. …Wing-beats. Twenty wing-beats.', 'wingate-greeting'),
        L('wingate', 'Somebody cleared our roost. A CAT, Sprint says. No excuses now.'),
      ] },
      { cam: { ...G.shot({ x: P2.x, y, z: P2.z }, { dist: 9, height: 4, yaw: Math.PI + 0.7, lookY: 0.4 }), secs: 1.3 } },
      { wait: 1.0 },
      { say: [
        L('sprint', 'Strips, gone. One orange cat, one shove each. I\'d have done it faster.'),
        L('wingate', 'So. Prove you\'re worth training. Race me.'),
        L('lapcount', 'I hold the watch. Peck me at the start line. Ten rings, in ORDER.'),
        L('wingate', 'Or come at Dusk with a crew who can rig wheels. The wheeled division. I\'ve posted a time.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  // the win: with 30 crumbs the team feast happens right here (racers.feasted completes step 3 at once); without, step 3
  E.registerScript('racers.won', (ctx, done) => {
    const lap = G.chars.find('lapcount');
    G.later(0.4, () => { bubbleOver(G, lap, '*click*', 1.5); G.audio.synth('tick'); });
    if (G.state.crumbs < 30) {
      G.later(1.2, () => G.say([
        L('sprint', 'Beginner\'s luck. …Okay. It was quite good.'),
        L('wingate', 'Hmph. Team tradition, rookie: the winner throws a feast. Thirty crumbs. Coo on the track.'),
      ], done));
      return;
    }
    G.later(1.2, () => G.say([
      L('sprint', 'Beginner\'s luck. …Okay. It was quite good.'),
      L('wingate', 'Hmph. Team tradition, rookie: the winner throws a feast. …You\'ve got thirty crumbs on you? Then CHOW TIME.'),
    ], () => feast(() => { G.state.flags['racers.feasted'] = true; done(); }, true)));
  });
  /** The feast on the track (take: the win scene pays the 30 crumbs itself; step 3's coo alt has the engine take them). */
  function feast(then, take = false) {
    let list = [];
    const g = G.gus.position;
    G.cutscene.run('racers-feast', [
      { do: () => { if (G.vehicles.driving) G.vehicles.exit(); if (take) G.state.crumbs = Math.max(0, G.state.crumbs - 30); G.audio.play('crumb-scatter', { at: g }); G.particles.burst('crumbs', g.x, g.y + 0.5, g.z, 30, { spread: 1.6 }); list = gather(G, ['wingate', 'sprint', 'lapcount', 'wheezy'], { kind: 'swoop', d: 1.8 }); G.flock.coo(); } },
      { cam: shotAt(G, g, { dist: 5, height: 1.8 }) },
      { wait: 1.6 },
      { do: () => { cheer(G, list); G.audio.play('gang-coo-murmur', { at: g }); G.particles.burst('crumbs', g.x, g.y + 0.3, g.z, 16, { spread: 1.2 }); } },
      { say: [
        L('wingate', 'A FEAST. Now THAT\'S a cool-down. The Racers fly with you, Gus.', 'wingate-join'),
        L('wingate', 'Fly with the team and your boost lasts twice as long. Draft, rookie. Draft!'),
        L('wheezy', 'I… finished… a FEAST. That\'s… a first.'),
      ] },
      { follow: true },
      { do: () => { disperse(G, list); then(); } },
    ]);
  }
  E.registerScript('racers.feast', (ctx, done) => feast(done));
  // Lapcount clicks the watch at the start; the Racers heckle a loss
  G.bus.on('raceStart', (t, e) => { if (onStep(G, 'den-racers', 2)) G.later(3, () => bubbleOver(G, 'lapcount', '*click* GO!', 1.6)); });
  G.bus.on('raceEnd', (t, e) => { if (!e.won && onStep(G, 'den-racers', 2)) G.later(2.5, () => bubbleOver(G, 'sprint', e.kind === 'wings' ? 'Rings in ORDER, rookie!' : 'Pedal, pigeon, PEDAL!', 2.5)); });
  mechaLine(G, 'wingate', 'racers', 'A metal pigeon? Can it fly a ring? No? Then it\'s not a pigeon, rookie. It\'s a STATUE.');
  return {};
}
