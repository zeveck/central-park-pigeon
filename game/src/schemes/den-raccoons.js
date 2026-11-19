// den-raccoons, "A Wrench for Rigby" (Sign War). Rigby can't fix anything
// without a wrench: trade the stagehand's lost earring (Night Eyes) for it, or
// bribe the Delacorte stage-door guard with a hot slice and walk in backstage.
import { L, joinScene, mechaLine } from './_ssf-common.js';

export function installDenRaccoons(G) {
  const E = G.schemes;
  E.registerScript('raccoons.meet', (ctx, done) => G.say([
    L('rigby', 'Night Crew. We fix things. Carts, latches, other people\'s problems.'),
    L('rigby', 'Can\'t fix nothin\' without a wrench, though. Mine went in the Harlem Meer. Long story. Ringo\'s fault.'),
    L('ringo', 'It was a GREAT story.'),
    L('rigby', 'Stagehand at the Delacorte\'s got a beauty. Get me that wrench, pigeon, and the Crew\'s yours.'),
  ], done));
  E.registerScript('raccoons.wrench', (ctx, done) => G.say([L(null, 'A proper stagehand\'s wrench. Heavy for its size. Rigby will cry.')], done));
  E.registerScript('raccoons.join', (ctx, done) => joinScene(G, 'raccoons-join', {
    members: ['rigby', 'socket', 'ringo', 'mamamask'], kind: 'walk', sfx: 'raccoon-chitter',
    lines: [
      L('rigby', '*turns it over* Chrome-vanadium. Balanced. Oh, she\'s beautiful.'),
      L('socket', 'With that and my torch, boss, we could weld a whole pigeon.'),
      L('mamamask', 'Union rules, sweetie: you feed us, we work. But for you, the first job\'s free.'),
      L('rigby', 'The Night Crew\'s yours. Wheels, latches, ranger carts. Point me at it, boss.', 'rigby-join'),
    ],
  }, done));
  mechaLine(G, 'rigby', 'raccoons', 'Saw the iron bird in the cave. Socket wants to weld it. I want to drive it. Ringo wants to race it.');
}
