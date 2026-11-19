// den-meermob, "Show Me Your Crew" (Feuds & Truces). With Rhoda quiet, Big
// Sal will deal, but only with a crew: fly a flypast of 30 or more through
// the Blockhouse arch while Sister Feathers counts heads out loud ("…twenty-
// nine, THIRTY. Huh."). Then a feast: 60 crumbs, or Peck him three slices.
// The Meer Mob joins (+14 flock, Muscle: the flock hauls huge things).
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine, face } from './_sf-common.js';
import { FLYPAST } from '../world/layout.js';
import { derived } from '../state/gamestate.js';

const WORDS = ['One', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const say = (n) => (n <= 20 ? WORDS[n - 1] : n < 30 ? 'twenty-' + WORDS[n - 21].toLowerCase() : n === 30 ? 'THIRTY' : n < 40 ? 'thirty-' + WORDS[n - 31].toLowerCase() : String(n));

export function installDenMeerMob(G) {
  const E = G.schemes;
  let cool = 0;
  const flypast = () => {
    const n = derived(G.state).flock;
    const fe = G.chars.find('feathers'), sal = G.chars.find('bigsal');
    const ok = n >= FLYPAST.flock;
    const gy = G.terrain.heightAt(FLYPAST.x, FLYPAST.z);
    const shown = Math.min(n, 30);
    G.cutscene.run('meer-flypast', [
      { do: () => { G.audio.play('gang-coo-murmur', { at: FLYPAST }); if (fe) { fe.script = true; face(fe, FLYPAST); } } },
      { cam: { pos: [FLYPAST.x - 9, gy + 3.2, FLYPAST.z - 7], look: [FLYPAST.x, gy + 2.2, FLYPAST.z], secs: 0.4 } },
      { do: () => {
        // Sister Feathers counts heads, fast, as the flock streams through the arch
        for (let k = 1; k <= shown; k++) G.later(k * 0.11, () => { if (k % 3 === 0 || k === shown) bubbleOver(G, fe, say(k) + '…', 0.5); G.audio.synth('tick'); });
      } },
      { wait: shown * 0.11 + 0.6 },
      { say: ok
        ? [L('feathers', `…twenty-nine, THIRTY. ${n > 30 ? `…${say(n)}. ` : ''}Huh.`), L('bigsal', 'Huh.'), L('knuckles', 'Huh.')]
        : [L('feathers', `…${say(n)}. That's IT?`), L('bigsal', 'Thirty, kid. Through the arch. Come back when you got a CREW.')] },
      { follow: true },
      { do: () => { if (fe) fe.script = false; if (ok) G.state.flags[FLYPAST.flag] = true; else cool = 8; } },
    ]);
  };
  E.registerScript('meer.flypast', (ctx, done) => {
    G.later(0.2, () => G.say([
      L('bigsal', 'Okay. OKAY. You got a crew. Now we eat, like gentlemen.'),
      L('feathers', 'A feast, kid. Sixty crumbs. Or slices. Sal ain\'t fussy about slices.'),
    ], done));
  });
  E.registerScript('meer.join', (ctx, done) => {
    const g = G.gus.position;
    let list = [];
    G.cutscene.run('meer-join', [
      { do: () => { list = gather(G, ['bigsal', 'knuckles', 'tiny', 'feathers'], { kind: 'swoop', d: 1.7 }); G.particles.burst('crumbs', g.x, g.y + 0.5, g.z, 26, { spread: 1.6 }); G.flock.coo(); } },
      { cam: shotAt(G, g, { dist: 5, height: 1.8 }) },
      { wait: 1.6 },
      { do: () => { cheer(G, list); G.audio.play('gang-coo-murmur', { at: g }); } },
      { say: [
        L('bigsal', 'That\'s a feast. The Meer Mob\'s with you, kid. All fourteen.', 'bigsal-join'),
        L('bigsal', 'Something too big to carry? Peck it and say the word. The Mob LIFTS it. Muscle.'),
        L('tiny', 'I\'m Tiny.'),
        L('feathers', 'That\'s forty-four of us in your swirl now, give or take. I\'ll keep counting.'),
      ] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
  G.bus.on('talk', (t, e) => {
    if (e.who === 'bigsal' && onStep(G, 'den-meermob', 1)) G.later(0, () => { if (!G.dialogue.open) G.say([L('bigsal', 'Show me your crew, kid. Thirty birds. Through the arch.'), L('feathers', `You've got ${derived(G.state).flock}. I counted.`)]); });
  });
  mechaLine(G, 'bigsal', 'meermob', 'A pigeon the size of a building? Kid. Now THAT\'S a crew.');
  return {
    update(dt) {
      if (cool > 0) cool -= dt;
      if (cool > 0 || G.cutscene.running || !onStep(G, 'den-meermob', 1) || G.state.phase === 'night') return;
      const p = G.gus.position;
      if (Math.hypot(p.x - FLYPAST.x, p.z - FLYPAST.z) > FLYPAST.r) return;
      const h = p.y - G.terrain.heightAt(p.x, p.z);
      if (h < FLYPAST.yMin || h > FLYPAST.yMax || G.gus.mode !== 'fly') return;
      cool = 3;
      flypast();
    },
  };
}
