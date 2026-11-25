// gear-headlamp, "The Jogger Who Never Stops" (Lost & Found). Fun pass (P9):
// the jogger's key went down the 86th Street W grate mid-lap, so the rats fetch
// it (Grate Fetch in Act 1; it was a Turtle Pond dive); the jogger never stops,
// so Mimic his phone or wait at the north gatehouse fountain where he stops each lap.
import { L } from './_ssf-common.js';

export function installGearHeadlamp(G) {
  const E = G.schemes;
  E.registerScript('headlamp.key', (ctx, done) => G.say([L('express', 'A KEY! On a little sneaker keyring! Somebody runs a LOT.'), L('pinstripe', 'Smells of sweat and determination. Jogger\'s, for sure.')], done));
  E.registerScript('headlamp.trade', (ctx, done) => G.later(1.4, () => G.say([
    L(null, 'The jogger jogs on the spot, pockets the key, and tosses the crows an old headlamp. "Keep it! I\'ve got six!"'),
    L('cawdry', 'A light for the night woods. The owl won\'t like it. That\'s the point.'),
  ], done)));
}
