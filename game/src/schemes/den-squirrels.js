// den-squirrels, "Hazel Forgot" (Lost & Found). Hazel buried three caches and
// forgot where; the plumes only show from above 10 m.
import { L, joinScene, mechaLine } from './_ssf-common.js';

export function installDenSquirrels(G) {
  const E = G.schemes;
  E.registerScript('squirrels.meet', (ctx, done) => G.say([
    L('hazel', 'Gus! It\'s Gus, right? Gus. I buried three caches on this meadow. Important ones. VERY important.'),
    L('hazel', 'And now I can\'t… it\'s… you know when a thing is right there and then it isn\'t?'),
    L('nutmeg', 'Three caches, two hundred and twelve acorns. I have the numbers. I do not have the PLACES.'),
    L('hazel', 'You fly, right? From up high you\'d see the dust. Squirrel dust. Unmistakable.'),
  ], done));
  E.registerScript('squirrels.join', (ctx, done) => joinScene(G, 'squirrels-join', {
    members: ['hazel', 'nutmeg', 'twitch', 'pecan'], kind: 'drop', sfx: 'squirrel-chatter',
    lines: [
      L('hazel', 'All three! Wait. Did I bury those? I did! I\'m brilliant. YOU\'RE brilliant.'),
      L('nutmeg', 'Two hundred and twelve. Two hundred and thirteen? Recount. Later.'),
      L('twitch', 'Gus-you\'re-in-we\'re-in-everyone\'s-in-'),
      L('hazel', 'Syndicate\'s in! Now where\'d I put my acorn? Dig? Call us.', 'hazel-join'),
    ],
  }, done));
  mechaLine(G, 'hazel', 'squirrels', 'There\'s a giant pigeon in the Ramble! Did I bury that? …I didn\'t bury that.');
}
