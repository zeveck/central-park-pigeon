// den-choir, "An Audience That Stays" (Sign War). The sax busker keeps
// stealing the Choir's audience. Make every Middle sign permanent, then throw
// a feast on the terrace: Encore shouts "One more!", the busker joins in
// instead of competing, and the Choir carries the megaphone to the Workshop.
import { L, joinScene, mechaLine } from './_ssf-common.js';

export function installDenChoir(G) {
  const E = G.schemes;
  E.registerScript('choir.meet', (ctx, done) => G.say([
    L('vibrato', 'Maestro Vibrato, Bethesda Choir. We sing for an audience, pigeon. An audience that STAYS.'),
    L('vibrato', 'That saxophone fellow by the fountain plays one riff and every tourist wanders off to him.'),
    L('encore', 'They never stay for the second song. Never. Not ONCE.'),
    L('vibrato', 'Make this whole middle of the park a place where people feed birds. For GOOD. Then we\'ll have a crowd.'),
  ], done));
  E.registerScript('choir.signs', (ctx, done) => G.say([L('bella', 'Coo-OOO-ooo! Every sign from the Mall to Cherry Hill! The Maestro is weeping. Happy weeping.')], done));
  E.registerScript('choir.join', (ctx, done) => joinScene(G, 'choir-join', {
    members: ['vibrato', 'bella', 'lou', 'encore'], kind: 'hop', sfx: 'crowd-cheer',
    extra: () => { G.saxUntil = G.state.time + 16; G.audio.play('choir-coo-chorus', { at: G.gus.position });   // #43: the sax joins in (collect.js music)
      G.later(2.5, () => G.audio.play('brass-stinger', { at: G.gus.position, vol: 0.7 })); G.humans.summonFeeders?.({ x: 6.6, z: 266 }, 4, () => {}); },
    lines: [
      L('vibrato', 'A feast! A crowd! And they are… staying. They are STAYING.'),
      L('encore', 'ONE MORE! ONE MORE!'),
      L(null, 'By the fountain, the sax busker joins in instead of competing. It sounds amazing.'),
      L('lou', '*the lowest, happiest coo in New York*'),
      L('vibrato', 'Magnifico! Now we sing for YOU! And take this megaphone, a gift: every bird in the park will hear you.', 'vibrato-join'),
    ],
  }, done));
  mechaLine(G, 'vibrato', 'choir', 'Our megaphone, in a mechanical pigeon\'s chest. It is opera, Gus. It is OPERA.');
}
