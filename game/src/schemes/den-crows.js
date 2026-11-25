// den-crows, "Three Shinies" (Lost & Found). Vesper's entry fee: three
// shinies, one needing the squirrels and one the ducks. Then she shows Gus
// the sealed cave: the Workshop. Star turn: Ledger, who writes every trade in
// his book and reads the Wanted board aloud.
import { L, joinScene, mechaLine, bubbleOver } from './_ssf-common.js';
import { PLACES, MARKET } from '../world/layout.js';

export function installDenCrows(G) {
  const E = G.schemes;
  E.registerScript('crows.meet', (ctx, done) => G.say([
    L('vesper', 'The Exchange doesn\'t talk to walk-ins, kid. But you\'ve got friends. I hear things.'),
    L('vesper', 'Entry fee\'s three shinies. One\'s on a ledge on Central Park West. One\'s under a dust plume by the Ramble. One\'s under the Lake.'),
    L('cawdry', 'Plume just east of this oak. Bubbles out on the Lake. Ledge on CPW by 72nd. Go on.'),
    L('ledger', 'I\'ll open a page for you. "Gus. Pigeon. Owes three shinies." Don\'t make me cross it out.'),
  ], done));
  // each shiny handed over: a line from Vesper (the taker's line), and Ledger keeps count
  G.bus.on('given', (t, e) => { if (e.to === 'vesper' && e.item === 'shiny') G.later(1.2, () => bubbleOver(G, 'ledger', `Ledger: Shiny, received. ${Math.min(3, G.state.counts?.['den-crows.s2'] || 3)} of 3.`, 3)); });
  E.registerScript('crows.join', (ctx, done) => {
    const W = PLACES.workshop, y = G.terrain.heightAt(W.x, W.z);
    joinScene(G, 'crows-join', {
      members: ['vesper', 'ledger', 'glint', 'cawdry'], kind: 'fly', sfx: 'crow-caw',
      lines: [
        L('vesper', 'Pleasure doing business, pigeon. Three shinies. Welcome to the Exchange, kid.', 'vesper-join'),
        L('ledger', 'Entered. Trades are ten crumbs, Vesper\'s fee. Every one goes in the book.'),
        L('glint', 'Next time, something BLUE. Just saying.'),
        L('vesper', 'Now. You\'ve been building something in your head since the Pond. Come and see where to build it for real.'),
      ],
    }, () => {
      G.cutscene.run('crows-cave', [
        // Polish-1: a no-op first beat. This scene starts from inside the join scene's last beat, and the
        // cutscene runner steps past beat 0 of a scene started that way, which was the cave shot (the
        // camera stayed on Gus). Same frames, same timing; now the cave shot plays.
        { do: () => {} },
        { cam: { ...G.shot({ x: W.x, y: y + 1.5, z: W.z }, { dist: 9, height: 3, yaw: Math.PI + 0.3, lookY: 0.4 }), secs: 1.6 } },
        { do: () => { G.particles.burst('dust', W.x, y + 1.2, W.z + 1, 40, { spread: 2.5 }); G.audio.play('shed-door-fold', { at: W }); G.audio.play('crow-caw-2', { at: W }); } },
        { wait: 1.2 },
        { say: [
          L('vesper', 'The sealed cave. Nobody\'s been in since the seventies. The rangers think it\'s a rock.'),
          L('vesper', 'Big enough for whatever you\'re planning. Bring the parts here. The crows will keep an eye on it.'),
        ] },
        { follow: true },
        { do: () => { G.toast('The Workshop is open. Parts 0/8', { kind: 'stamp', seconds: 4 }); done(); } },
      ]);
    });
  });
  mechaLine(G, 'vesper', 'crows', 'Every crow in the Ramble has flown past the cave to look at it. Twice. It\'s good for business.');
  // Ledger writes every trade in his book, and reads the Wanted board aloud the first time Gus comes by
  G.bus.on('trade', (t, e) => G.later(2.2, () => bubbleOver(G, 'ledger', `Ledger: Entered in the book. One ${e.id === 'cone' ? 'traffic cone' : e.id === 'pen' ? 'paint pen' : e.id}.`, 3.5)));
  G.mods.push({ update: () => {
    const g = G.gus.position, b = MARKET.board;
    if (G.state.crews.includes('crows') && !G.state.flags['ledger.readBoard'] && Math.hypot(g.x - b.x, g.z - b.z) < 7 && !G.cutscene.running && !G.dialogue.open) {
      G.state.flags['ledger.readBoard'] = true;
      const w = G.market?.wanted?.() || [];
      const names = w.map((q) => q.wanted || q.id).slice(0, 3).join(', ');
      G.say([L('ledger', names ? `The Wanted board, today: ${names}. Bring the right thing to the right human, and the crows do the rest.` : 'Nobody\'s lost anything this phase. Check back after a nap. People are careless.')]);
    }
  } });
}
