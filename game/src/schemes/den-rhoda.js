// den-rhoda, "Rhoda Raids the Meer" (Feuds & Truces). Big Sal points at the
// sky: Rhoda the Fifth Avenue hawk raids the Meer every afternoon, and the
// Meer Mob won't talk to anyone till she stops. The fight over the water
// (fights.js; Pip practises dives overhead, a free telegraph) ends with "They
// spiked my ledge." Walter the doorman never lets pigeons up, but a hot slice
// props his service door, and Tux shows the raccoons the back stairs: the
// bolts come off (P4), Rhoda and Rex move home, and the hawks join (Lift).
import { L, gather, disperse, cheer, bubbleOver, onStep, mechaLine, face } from './_sf-common.js';
import { SPIKE_SITES, PLACES } from '../world/layout.js';

const P4 = SPIKE_SITES.find((s) => s.id === 'P4');

export function installDenRhoda(G) {
  const E = G.schemes;
  E.registerScript('rhoda.sal', (ctx, done) => {
    const sal = G.chars.find('bigsal');
    G.cutscene.run('rhoda-sal', [
      { say: [L('bigsal', 'Big Sal. The Meer Mob. You want something, kid? Get in line. Behind HER.', 'bigsal-greeting')] },
      { do: () => { if (sal) G.chars.animate(sal, 'cheer', 0.8); G.audio.play('hawk-screech', { vol: 0.8 }); } },
      { cam: { pos: [sal ? sal.x + 6 : -73, (sal?.y ?? 2) + 2, sal ? sal.z - 6 : 1020], look: [64, 24, 1000], secs: 1.4 } },
      { wait: 1.2 },
      { say: [
        L('bigsal', 'Rhoda. Fifth Avenue hawk. Every afternoon she comes up here and raids the Meer.'),
        L('feathers', 'Seventeen raids this month. I count.'),
        L('bigsal', 'Nobody talks to nobody up here till she stops. Make her stop, kid.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  E.registerScript('rhoda.home', (ctx, done) => {
    const rhoda = G.chars.find('rhoda'), rex = G.chars.find('rex'), pip = G.chars.find('pip');
    const ly = G.surfaceY(P4.x, P4.z, 400);
    const ledge = (dx, dz) => ({ x: P4.x + dx, z: P4.z + dz, y: G.surfaceY(P4.x + dx, P4.z + dz, 400) });
    const list = [rhoda, rex, pip].filter(Boolean);
    G.cutscene.run('rhoda-home', [
      { cam: { pos: [P4.x - 14, ly + 3, P4.z - 9], look: [P4.x, ly + 0.3, P4.z], secs: 1.4 } },
      { do: () => { G.audio.play('hawk-dive-whistle', { at: P4 }); [[rhoda, -1, 0], [rex, 1, 0.6], [pip, 0, -0.9]].forEach(([c, dx, dz], i) => { if (!c) return; c.script = true; c.here = { x: P4.x + dx, z: P4.z + dz, scripted: true }; G.chars.arrive(c, ledge(dx, dz), 'dive', 1.6 + i * 0.4); }); } },
      { wait: 2.4 },
      { do: () => { G.audio.play('hawk-screech', { at: P4 }); cheer(G, list, 1.2); } },
      { say: [
        L('rhoda', 'Home. No bolts, no spikes. Hm.'),
        L('rex', 'Did you see that landing? Rhoda didn\'t. Tell her.'),
        L('rhoda', 'I don\'t forget a favour, snack. Pigeon. Gus. Need something lifted? I LIFT.', 'rhoda-join'),
        L('pip', 'And I\'ll stop practising over the Meer. Mostly. A little.'),
      ] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
  G.bus.on('talk', (t, e) => {
    if (e.who === 'bigsal' && onStep(G, 'den-rhoda', 3)) G.later(0, () => { if (!G.dialogue.open) G.say([L('bigsal', 'She ain\'t raiding today. Get her ledge back and the Mob\'ll talk. Maybe.')]); });
  });
  mechaLine(G, 'rhoda', 'rhoda', 'A metal pigeon. Heavy? I could lift its head. Probably. Don\'t make it heavier.');
  return {};
}
