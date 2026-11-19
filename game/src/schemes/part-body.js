// part-body, "Vinnie's Cart" (Slice Run). Make Vinnie fed up (two Mall signs
// live so the pigeons swarm his cart, or a hot slice on his counter in front
// of his customers); at Dusk he storms round the cart instead of wheeling it
// home, the raccoons rig it while Gus keeps him busy, and Gus drives it to the
// Workshop.
import { L } from './_ssf-common.js';

export function installPartBody(G) {
  const E = G.schemes;
  E.registerScript('body.fedup', (ctx, done) => G.later(0.4, () => G.say([
    L('vinnie', 'PIGEONS! At MY cart! Twenty-two years on this Mall and now it\'s PIGEONS and PIZZA!'),
    L('vinnie', 'That\'s it. I\'ve had it with this cart. Tonight I\'m not even wheeling it home.'),
  ], done)));
  E.registerScript('body.rigged', (ctx, done) => G.say([L('rigby', 'She\'s rigged, boss. Hop on. Mind the mustard.')], done));
  E.registerScript('body.home', (ctx, done) => G.say([
    L('rigby', 'A hot dog cart. In a cave. For a pigeon. Best night of my life.'),
    L('vesper', 'That\'s a body, kid. Now it just needs everything else.'),
  ], done));
}
