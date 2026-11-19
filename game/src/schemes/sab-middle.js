// sab-middle, "The Middle Cart" (Sign War). At Night the cats knock the lot
// key off the booth's hook; Gus unlocks the gate; the raccoons pull the spark
// plug and pop a hubcap. Middle signs stay flipped for good.
import { L } from './_ssf-common.js';

export function installSabMiddle(G) {
  const E = G.schemes;
  E.registerScript('sab.middle.gate', (ctx, done) => G.say([L('queenie', 'A key on a hook. Honestly, darling, they make it too easy.')], done));
  E.registerScript('sab.middle.done', (ctx, done) => G.later(1.6, () => G.say([
    L('rigby', 'Spark plug\'s in my pocket. Hubcap\'s under my arm. That cart\'s going nowhere, boss.'),
    L('rigby', 'Every sign in the middle of the park stays flipped now. Let \'em tut.'),
  ], done)));
}
