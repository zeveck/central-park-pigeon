// Fun pass (P10): small "almost" and affordance touches that belong to no one scheme.
//   - the second time any hot-only taker refuses a cold slice, Express names the problem (never the answer);
//   - the first time a tracked step needs an ally, an in-world prompt teaches the Ally wheel (hold R / the portrait),
//     until the player Calls someone.
// Text only (bubbles, the tutor line): nothing here changes the game state a replay checks.
import { SCHEME } from '../data/schemes.js';

export function installFunPolish(G) {
  let colds = 0;
  G.bus.on('fail', (t, e) => {
    if (e.kind !== 'cold' || e.to === 'queenie') return;   // (Queenie has her own line: den-cats.js)
    if (++colds !== 2) return;
    G.later(2.4, () => G.bubbles.add('Express (from a grate somewhere): Sixty seconds, kid. That\'s all a slice has.', { at: () => ({ x: G.gus.position.x, y: G.gus.position.y + 0.9, z: G.gus.position.z }), ttl: 4.5, range: 200 }));
  });
  let shown = false, shownT = 0;
  G.bus.on('call', () => { if (shown) G.tutor(null); shown = false; G.state.flags['tutor.wheel'] = true; });
  G.mods.push({
    update(dt) {
      const st = G.state;
      if (shown && (shownT += dt) > 25 && G.tutorState?.action === 'wheel') { G.tutor(null); st.flags['tutor.wheel'] = true; }   // (it doesn't nag)
      if (st.flags['tutor.wheel'] || shown || G.cutscene.running || G.menus.open || G.tutorState) return;
      const id = st.tracked, s = SCHEME[id], step = id && G.schemes.isOpen(id) ? G.schemes.step(id) : null;
      if (!step || !s) return;
      const needs = [step.needs, ...(step.alts || []).map((a) => a.needs)].filter(Boolean);
      if (!needs.some((n) => (n.ally && !n.ally.startsWith('haul')) || n.allies?.length) || !st.crews.some((c) => c !== 'swells')) return;
      if (st.seenTalents.some((t) => t !== 'coo') || st.called?.length) { st.flags['tutor.wheel'] = true; return; }   // (he's Called a friend before: no lesson needed)
      shown = true;
      G.tutor('wheel', 'to call a friend (hold it, pick a crew)');
    },
  });
}
