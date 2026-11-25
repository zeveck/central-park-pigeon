// den-turtles, "Something on Our Rock" (Feuds & Truces). The Turtle Elders'
// rock in Turtle Pond is blocked by a sunken shopping cart. The ducks dive the
// bubbles and surface its handle against the bank (Bubbles shows off); a
// hauler tugs it out; the turtles climb back on and join (Hints: "Ask the
// Elders" on the Scheme Board). Slowpoke arrives as the scene ends.
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine, face } from './_sf-common.js';
import { PLACES } from '../world/layout.js';

export function installDenTurtles(G) {
  const E = G.schemes;
  const rock = PLACES['elders-rock'];
  const rockY = () => G.surfaceY(rock.x, rock.z, 40);
  E.registerScript('turtles.rock', (ctx, done) => {
    G.cutscene.run('turtles-rock', [
      { cam: { ...G.shot({ x: rock.x, y: rockY(), z: rock.z }, { dist: 6, height: 1.8, yaw: G.gus.yaw + Math.PI + 0.5, lookY: 0.2 }), secs: 1.2 } },
      { say: [
        L('eldest', 'Mmm… a pigeon. On our pond.', 'eldest-greeting'),
        L('eldest', 'Something… is on our rock. Under it. Against it. It has… WHEELS.'),
        L('shelly', 'A shopping cart, dear. Somebody rolled it in. Tuesday. I heard all about it.'),
        L('moss', 'Zzz… hm? Oh. A cart. Zzz.'),
        L('eldest', 'Find what is… under the water… and we will… remember you.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  E.registerScript('turtles.surfaced', (ctx, done) => {
    G.later(0.3, () => G.say([
      L('bubbles', 'Did you SEE that? Triple tuck! …Also it\'s a shopping cart. A HUGE one.'),
      L('shelly', 'Wedged on the bank, dear. Now it needs something big to drag it off.'),
    ], done));
  });
  E.registerScript('turtles.join', (ctx, done) => {
    let list = [];
    const ry = rockY();
    G.cutscene.run('turtles-join', [
      { do: () => { G.crowds?.setFriendly?.('turtles', true); list = gather(G, ['eldest', 'shelly', 'moss'], { kind: 'swim', at: { x: rock.x, y: ry, z: rock.z }, d: 0.7, secs: 1.6 }); G.audio.play('turtle-grumble', { at: rock }); G.particles.splash(rock.x, ry - 0.3, rock.z, 18); } },
      { cam: { ...G.shot({ x: rock.x, y: ry, z: rock.z }, { dist: 5.5, height: 1.6, yaw: Math.PI + 0.4, lookY: 0.2 }), secs: 1.2 } },
      { wait: 1.8 },
      { do: () => cheer(G, list, 1.2) },
      { say: [
        L('eldest', 'The Elders… remember you. Our rock… a rock again. Mmm.', 'eldest-join'),
        L('eldest', 'When you are stuck… ask the Elders. On your Scheme Board. We see… everything. Slowly.'),
        L('shelly', 'And every truce in this park gets sealed on THIS rock. Bring them here, dear.'),
      ] },
      { do: () => {
        // Slowpoke arrives as the scene ends
        const s = G.chars.find('slowpoke');
        if (s) { s.script = true; const p = { x: rock.x + 1.2, z: rock.z - 1.0 }; G.chars.moveTo(s, { ...p, y: G.surfaceY(p.x, p.z, ry + 1) }, { kind: 'walk', secs: 2.6 }); list.push(s); }
      } },
      { wait: 2.6 },
      { say: [L('slowpoke', 'Did… I… miss… it?')] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
  G.bus.on('talk', (t, e) => {
    if (e.who === 'eldest' && onStep(G, 'den-turtles', 3)) G.later(0, () => { if (!G.dialogue.open) G.say([L('eldest', 'A cart… that size… needs a hauler. Something… with legs. Big legs.')]); });
  });
  mechaLine(G, 'eldest', 'turtles', 'A pigeon… of iron. Mmm. We have seen… stranger. In 1911.');
  return {};
}
