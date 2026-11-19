// sab-north, "The North Cart" (Sign War). The 103rd Street shed's latch rope
// is high: hold Coo with a flock of 15 and they yank it; then the raccoons.
import { L } from './_ssf-common.js';

export function installSabNorth(G) {
  const E = G.schemes;
  E.registerScript('sab.north.done', (ctx, done) => G.later(1.6, () => G.say([
    L('rigby', 'North cart: retired. Hubcap: liberated.'),
    L('socket', 'Nice shine on this one. Could be an EYE, if you squint.'),
  ], done)));
}
