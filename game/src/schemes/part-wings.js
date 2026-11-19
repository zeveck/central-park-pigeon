// part-wings, "Two Sails" (Lost & Found). Bubbles raises the first sunk
// sailboat; the kid's RC remote (trade a shiny, or the ice-cream jingle) drives
// the tug that tows the second out from under the spout.
import { L } from './_ssf-common.js';

export function installPartWings(G) {
  const E = G.schemes;
  E.registerScript('wings.sail1', (ctx, done) => G.say([L('vesper', 'One sail. Lean it by the scaffold, kid. Wings come in pairs.')], done));
  E.registerScript('wings.remote', (ctx, done) => G.say([L(null, 'An RC remote, slightly sticky. The tug on the pond blinks awake.')], done));
  E.registerScript('wings.sail2', (ctx, done) => G.say([L('ledger', 'Two sails. That\'s a wingspan. Write it down. I just did.')], done));
}
