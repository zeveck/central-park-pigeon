// den-geese, "Geese Need Bread" (Feuds & Truces). The Honk holds Bow Bridge's
// arm of the Lake and boxes the ducks out. Geese need BREAD: at Afternoon
// Gus flips the Great Lawn's signs N1 and N2 while Gertrude watches, the
// picnickers toss bread, and the geese march off to their new lawn. Gertrude
// and Commodore Puddles shake on the Elders' rock (waiting for Slowpoke):
// the geese-and-ducks truce, and the Honk joins (Bully).
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine, face, truceScene, birds } from './_sf-common.js';
import { PLACES, SIGNS } from '../world/layout.js';

export async function installDenGeese(G) {
  const E = G.schemes;
  const lawn = PLACES['great-lawn'];
  const march = await birds(G, 'goose', 9, 0.85);
  let marchT = null;
  E.registerScript('geese.arm', (ctx, done) => {
    const pud = G.chars.find('puddles');
    G.cutscene.run('geese-arm', [
      { say: [L('gertrude', 'HONK. This arm of the Lake is GOOSE TERRITORY.', 'gertrude-greeting')] },
      // Polish-1: from out on the water west of the bridge, to Gertrude with Bow Bridge behind (the old shot,
      // set off Gus, ended up under the bridge deck)
      { get cam() { const ger = G.chars.find('gertrude') || { x: -33, y: 0, z: 316 }; return { pos: [ger.x - 9.5, ger.y + 2.4, ger.z - 4.5], look: [ger.x + 1.2, ger.y + 0.7, ger.z], secs: 1.0 }; } },
      { do: () => { if (pud) bubbleOver(G, pud, 'Ahem. Some of us LIVE here.', 2.6); G.audio.play('goose-honk', { at: G.gus.position }); } },
      { wait: 1.4 },
      { say: [
        L('puddles', 'Boxed out of our own arm of the Lake, pigeon. The Commodore protests. LOUDLY.'),
        L('gander', 'Lieutenant Gander. The Honk\'s enforcer. Move along, duck.'),
        L('gertrude', 'We\'d move. For BREAD. Lots of it. On a lawn. A lawn of our OWN.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  E.registerScript('geese.lawn', (ctx, done) => {
    const ger = G.chars.find('gertrude');
    G.cutscene.run('geese-lawn', [
      { do: () => { marchT = 0; G.audio.play('goose-honk', { at: lawn }); } },
      { cam: { ...G.shot({ x: lawn.x, y: G.surfaceY(lawn.x, lawn.z, 30), z: lawn.z - 18 }, { dist: 16, height: 6, yaw: Math.PI - 0.6, lookY: 0.5 }), secs: 1.4 } },
      { wait: 3.2 },
      { do: () => { if (ger) { G.chars.animate(ger, 'cheer', 1.4); } G.audio.play('goose-honk', { at: lawn, rate: 0.9 }); } },
      { say: [
        L('gertrude', 'BREAD! On a LAWN! Squad, we are MOVING!'),
        L('gander', 'The Great Lawn is goose territory now. The Lake\'s arm is… negotiable.'),
        L('gertrude', 'Fine. FINE. We\'ll shake on it. On the Elders\' rock, where it STICKS.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  E.registerScript('geese.truce', (ctx, done) => {
    truceScene(G, 'geese-truce', {
      a: 'gertrude', b: 'puddles', title: 'TRUCE', caption: 'Geese & ducks',
      lines: [L('gertrude', 'The Lake\'s arm is YOURS, duck. The Great Lawn is OURS.'), L('puddles', 'The Commodore accepts. Mrs. Puddles accepts. Which is what really matters.')],
      after: [
        L('gertrude', 'And YOU, pigeon. The Honk chases anything you point at. ANYTHING.', 'gertrude-join'),
        L('gander', 'A human in your way? We hiss. They run. They drop things. It\'s beautiful.'),
        L('puddles', 'And the ducks work the whole Lake now. Bow Bridge included. Ducks to stations!'),
      ],
    }, done);
  });
  // Gertrude watches the Great Lawn from the north path at Afternoon in step 2
  G.bus.on('talk', (t, e) => {
    if (e.who === 'gertrude' && onStep(G, 'den-geese', 2)) G.later(0, () => { if (!G.dialogue.open) G.say([L('gertrude', 'Those picnickers on the Great Lawn eat SANDWICHES. If the signs let them share… HONK.')]); });
  });
  mechaLine(G, 'gertrude', 'geese', 'A giant pigeon? Does it HONK? It should honk. Put a honk in it.');
  const N1 = SIGNS.find((s) => s.id === 'N1');
  return {
    group: march.mesh,
    update(dt) {
      const ger = G.chars.find('gertrude');
      if (ger && !ger.script && !ger.here) {
        if (onStep(G, 'den-geese', 2) && G.state.phase === 'afternoon') { const p = { x: N1.x - 4, z: N1.z - 3 }; ger.x = p.x; ger.z = p.z; ger.y = G.surfaceY(p.x, p.z, 30); ger.sfMoved = true; }
        else if (ger.sfMoved) { ger.sfMoved = false; G.chars.goHome(ger); }
      }
      // the march to the new lawn (a column of geese from the Lake end of the lawn)
      if (marchT != null) {
        marchT += dt;
        march.mesh.visible = true;
        for (let i = 0; i < march.n; i++) {
          const k = Math.max(0, Math.min(1, (marchT - i * 0.25) / 5));
          const x = lawn.x - 22 + (i % 3) * 1.4 + k * 20, z = lawn.z - 30 + Math.floor(i / 3) * 1.6 + k * 26;
          march.set(i, x, G.surfaceY(x, z, 30), z, Math.atan2(20, 26), marchT * 8 + i);
        }
        march.commit();
        if (marchT > 8) { marchT = null; march.mesh.visible = false; }
      }
    },
    // Fixes-3 (B2): a load (or quitting) mid-march left the column of geese frozen on the lawn
    restore() { marchT = null; march.mesh.visible = false; },
    abandon() { marchT = null; march.mesh.visible = false; },
  };
}
