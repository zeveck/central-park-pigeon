// Giving ("Pizza slices: Giving"): Peck a taker while carrying what they want.
// Named characters and a few humans (by role) are takers (data/crews.js
// TAKERS). A hot-only taker refuses a cold slice ("It's COLD, pal.") and Gus
// keeps it. A taker whose entry sets flags (the stage-door guard, Walter,
// Vinnie, the raccoons' union slice) takes it as a world effect; any other
// give is offered to the scheme engine (a 'give' event), and the item is
// taken only if a step wanted it. Nobody else wants it: "Not for me, Gus."

import { TAKERS, CHARACTERS, phaseList } from '../data/crews.js';
import { ITEM_DEFS } from './items.js';

const isSlice = (id) => !!id && id.startsWith('slice');
const fits = (want, id) => want === id || (want === 'slice' && isSlice(id) && id !== 'slice-anchovy') || (want === 'slice' && id === 'slice-anchovy');

export class Takers {
  constructor(G) { this.G = G; this.humanTargets = []; }

  build() {
    const G = this.G;
    // humans who take things: an interact target that follows the agent
    for (const key of Object.keys(TAKERS)) {
      if (!key.startsWith('human:')) continue;
      const role = key.slice(6);
      const agentOf = () => G.humans.agents.find((a) => a.role === role && a.out);
      G.interact.register({
        id: 'taker:' + role, kind: 'human',
        get x() { return agentOf()?.x ?? 1e6; }, get y() { const a = agentOf(); return a ? (a.y ?? G.surfaceY(a.x, a.z, 5)) + 0.2 : -1e6; }, get z() { return agentOf()?.z ?? 1e6; },
        r: 1.6, dy: 2.2, priority: 6,
        label: () => (agentOf() && this.entryFor(key) ? `Give the ${this.itemName()} to the ${role === 'walter' ? 'doorman' : role === 'guard' ? 'stage-door guard' : 'vendor'}` : null),
        act: () => this.give(key),
      });
    }
  }

  itemName() { const c = this.G.state.carried; return c ? (ITEM_DEFS[c.id]?.name || c.id).toLowerCase() : ''; }

  /** The taker's entry for what Gus carries, or null. */
  entryFor(who) {
    const c = this.G.state.carried;
    if (!c) return null;
    const list = TAKERS[who];
    if (!list) return null;
    return list.find((e) => fits(e.wants, c.id) && (!e.phase || phaseList(e.phase).includes(this.G.state.phase))) || null;
  }

  /** The prompt for a named character when Gus carries something (characters.js asks). */
  labelFor(charId) {
    const c = this.G.state.carried;
    if (!c) return null;
    const e = this.entryFor(charId);
    if (e?.keep) return `Offer the ${this.itemName()}`;
    if (e || this.#stepWants(charId, c.id)) return `Give the ${this.itemName()}`;
    return null;
  }

  #stepWants(to, item) {
    const E = this.G.schemes;
    for (const id of E.activeList()) {
      const st = E.step(id);
      if (!st) continue;
      for (const o of st.alts || [st]) if (o.on?.type === 'give' && o.on.to === to && fits(o.on.item, item)) return true;
    }
    return false;
  }

  /** Peck a taker while carrying something. Returns true if it was handled as a give. */
  give(who) {
    const G = this.G, st = G.state, c = st.carried;
    if (!c) return false;
    const e = this.entryFor(who);
    const name = who.startsWith('human:') ? null : who;
    const say = (text) => G.say([{ who: name, text }]);
    if (e?.keep) { say(e.keep); return true; }
    const hot = G.items.isHot(c);
    if (e?.hot && !hot) { say(e.cold || "It's COLD, pal."); G.audio.synth('uiBack'); G.bus.emit('fail', { kind: 'cold', to: who, item: c.id }); return true; }   // fun pass (P7, P10)
    if (!e && !this.#stepWants(who, c.id)) {
      if (who.startsWith('human:')) return false;
      say('Not for me, Gus. Somebody else might want that.');
      return true;
    }
    const ev = { item: c.id, to: who.startsWith('human:') ? who.slice(6) : who, hot, x: G.gus.position.x, z: G.gus.position.z };
    G.bus.emit('give', ev);
    const wanted = !!(e?.flags || e?.any) || ev.completed || ev.counted;
    if (wanted && st.carried === c) G.items.take();
    if (wanted) {
      for (const f of e?.flags || []) st.flags[f] = true;
      G.audio.play(isSlice(c.id) ? 'slice-handover' : 'pick-up', { at: G.gus.position, rate: 0.9 });
      G.particles.burst('crumbs', G.gus.position.x, G.gus.position.y + 0.3, G.gus.position.z, 8);
      if (e?.line) G.later(0.05, () => { if (!G.dialogue.open) say(e.line); });
      G.bus.emit('given', ev);
      G.autosave('give');
    } else say('Not right now, Gus.');
    return true;
  }
}
