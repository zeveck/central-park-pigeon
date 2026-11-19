// part-eyes, "Two Hubcaps" (Sign War): the 2nd sabotage. Rigby hands Gus two
// hubcaps for the Mecha's eyes (the third, if it comes, hangs on the wall).
import { L } from './_ssf-common.js';

export function installPartEyes(G) {
  G.schemes.registerScript('eyes.hubcaps', (ctx, done) => G.say([
    L('rigby', 'Two carts, two hubcaps. You\'re building that iron bird? Then it needs EYES.'),
    L('socket', 'Polished \'em. Look: you can see your beak in \'em.'),
    L('rigby', 'The Crew\'ll carry \'em to the cave. Go on, it\'s a Night job anyway.'),
  ], done));
}
