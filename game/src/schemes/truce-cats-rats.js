// truce-cats-rats, "Enough for Everyone" (Feuds & Truces, my Slice Run
// thread's truce). The cats chase the rats off the 110th bodega bins; a whole
// pizza box, opened on the kerb, is enough for everyone. Queenie and Sue shake
// on the Elders' rock (and, as with every truce, they wait for Slowpoke).
import { L, gather, disperse, cheer, groupShot } from './_ssf-common.js';
import { PLACES } from '../world/layout.js';

export function installTruceCatsRats(G) {
  const E = G.schemes;
  E.registerScript('catsrats.bins', (ctx, done) => {
    const g = G.gus.position;
    G.audio.play('cat-hiss', { at: g }); G.later(0.4, () => G.audio.play('rat-squeak', { at: g }));
    G.say([
      L(null, 'Hssss! Squeak! The cats chase the rats off the bodega bins. Again.'),
      L('queenie', 'Our bins, darling. Our street. Our ANCHOVIES.'),
      L('sue', 'Your bins? We were here before the bodega. We were here before the STREET.'),
      L('whiskerton', 'They\'d share, you know. If there were ever enough for everyone. There never is.'),
    ], done);
  });
  E.registerScript('catsrats.truce', (ctx, done) => {
    let list = [];
    const rock = PLACES['elders-rock'];
    G.cutscene.run('catsrats-truce', [
      { do: () => { list = gather(G, ['queenie', 'sue', 'whiskerton', 'crumbsy'], { kind: 'slink' }); } },
      { cam: groupShot(G) },
      { wait: 1.4 },
      { say: [
        L('crumbsy', 'Three slices. Six crusts. Do you know what that MEANS?'),
        L('queenie', '…One each. Fine. FINE. A whole box changes things.'),
        L('sue', 'A slice for us, a slice for you. Deal. On the Elders\' rock, so it sticks.'),
      ] },
      { cam: { ...G.shot({ x: rock.x, y: G.terrain.heightAt(rock.x, rock.z) + 0.6, z: rock.z }, { dist: 5, height: 1.6, yaw: 0.6, lookY: 0.2 }), secs: 1.4 } },
      { say: [
        L('eldest', 'Mm. A truce… is sealed… when everyone… is here.'),
        L('slowpoke', 'Wait… for… me…'),
        L('eldest', '…Now. Paws, please.'),
      ] },
      { do: () => { cheer(G, list); G.audio.play('crowd-cheer', { at: G.gus.position, vol: 0.6 }); } },
      { say: [L('express', 'Slice Relay\'s open, Gus! Any grate, once a phase: a hot one pops right up. And the cats send slices to the Meer now.')] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
}
