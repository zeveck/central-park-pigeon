// Giving ("Pizza slices: Giving"): Peck a taker while carrying what they want.
// Named characters and a few humans (by role) are takers (data/crews.js
// TAKERS). A hot-only taker refuses a cold slice ("It's COLD, pal.") and Gus
// keeps it. A taker whose entry sets flags (the stage-door guard, Walter,
// Vinnie, the raccoons' union slice) takes it as a world effect; any other
// give is offered to the scheme engine (a 'give' event), and the item is
// taken only if a step wanted it. Nobody else wants it: "Not for me, Gus."

import { TAKERS, CHARACTERS, phaseList } from '../data/crews.js';
import { ITEM_DEFS } from './items.js';
import { isBagel, BAGEL_EAT } from '../data/bagels.js';   // #44

const isSlice = (id) => !!id && id.startsWith('slice');
const isFood = (id) => isSlice(id) || isBagel(id);   // #44: a bagel is eaten like a slice
// fix-19: who eats a slice Gus gives away (characters by crew; humans: anyone seated, or a dog walker's dog)
const EATER_CREWS = ['rats', 'raccoons', 'biscuit'];
const EAT_LINES = {
  rats: ['Don\'t mind if I do. Mmm, crust.', 'A whole slice? You\'re a pal, Gus.'],
  raccoons: ['Ooh, dinner. No union fee on gifts.', 'Into the drain kitchen it goes.'],
  biscuit: ['PIZZA! Best day EVER!', 'For ME? Gone. All gone.'],
  dog: ['The dog wolfs it down. Tail going like a propeller.', 'Gulp. The dog looks round for more.'],
  person: ['Ooh, pizza! Thanks, little guy.', 'For me? Well, don\'t mind if I do.'],
};
const fits = (want, id) => want === id || (want === 'slice' && isSlice(id) && id !== 'slice-anchovy') || (want === 'slice' && id === 'slice-anchovy') || (want === 'bagel*' && isBagel(id));   // #44: 'bagel*' = any bagel

export class Takers {
  constructor(G) { this.G = G; this.humanTargets = []; }

  build() {
    const G = this.G, self = this;
    // humans who take things: an interact target that follows the agent
    for (const key of Object.keys(TAKERS)) {
      if (!key.startsWith('human:')) continue;
      const role = key.slice(6);
      const agentOf = () => G.humans.agents.find((a) => a.role === role && a.out);
      G.interact.register({
        id: 'taker:' + role, kind: 'human',
        get x() { return agentOf()?.x ?? 1e6; }, get y() { const a = agentOf(); return a ? (a.y ?? a.gy ?? G.collision.floorAt(a.x, a.z)) + 0.2 : -1e6; }   /* batch-3: an undrawn person has no a.y; surfaceY(…, 5) found an awning over Walter's door (3.35 m) and his Give was out of reach */, get z() { return agentOf()?.z ?? 1e6; },
        r: 1.6, dy: 2.2, priority: 6,
        label: () => (agentOf() && this.entryFor(key) ? `Give the ${this.itemName()} to the ${role === 'walter' ? 'doorman' : role === 'guard' ? 'stage-door guard' : 'vendor'}` : null),
        act: () => this.give(key),
      });
    }
    // fix-19: one Give target that follows the nearest seated person or dog walker while Gus carries a slice
    let cur = null;
    G.interact.register({
      id: 'eater:human', kind: 'eater',
      get x() { cur = self.#eaterHuman(); return cur?.x ?? 1e6; }, get y() { return cur ? (cur.y ?? cur.gy ?? G.collision.floorAt(cur.x, cur.z)) + 0.2 : -1e6; }, get z() { return cur?.z ?? 1e6; },
      r: 1.8, dy: 2.2, priority: 0,
      label: () => (cur && self.#eaterHuman() === cur ? (cur.role === 'dogwalker' ? `Give the ${self.itemName()} to the dog` : `Give the ${self.itemName()} away`) : null),
      act: () => { const a = cur; if (!a) return; self.eat({ kind: a.role === 'dogwalker' ? 'dog' : 'person', id: 'human:' + a.role, at: () => ({ x: a.x, y: (a.y ?? 0) + 2.1, z: a.z }) }); if (a.role === 'dogwalker') G.humans.play?.(a, 'pulled', 1.2); },
    });
  }

  // ------------------------------------------------------------ fix-19: Give (slices only, to someone who'd eat it)
  // Peck a rat, a raccoon, a dog or a seated person while carrying a slice nobody's scheme wants from them: they eat it (a
  // bubble, never dialogue). Takers and scheme hand-ins always win (entryFor / #stepWants first), the prompt scores like
  // small talk so grate travel and real hand-ins keep the Peck, and there's no Give within 8 m of Queenie with the anchovy.
  /** Would this character eat the slice Gus carries? */
  eaterGive(charId) {
    const G = this.G, c = G.state.carried;
    if (!c || !isFood(c.id) || !EATER_CREWS.includes(CHARACTERS[charId]?.crew)) return false;
    if (G.chars?.find(charId)?.here) return false;   // a Called ally keeps its Ask
    // review: never the anchovy while den-cats is open (Express sits on the 72nd W grate mid-relay); never someone a step
    // wants to talk to, or who gives a step's nudge (Biscuit on den-biscuit step 1, Pretzel, Crumbsy, Mama Mask…): they talk
    if (c.id === 'slice-anchovy' && G.schemes.isOpen('den-cats')) return false;
    // #44: Socket eats any bagel even while he has a nudge to give (Mama Mask sends Gus to him with the wrong ones); a talk step still wins
    if (this.#wantsTalk(charId, { nudges: !(isBagel(c.id) && charId === 'socket') })) return false;
    if (this.entryFor(charId) || this.#stepWants(charId, c.id)) return false;
    return !this.#byQueenie();
  }
  #wantsTalk(charId, { nudges = true } = {}) {
    const E = this.G.schemes;
    for (const id of E.openList()) {
      const st = E.step(id);
      if (!st) continue;
      if ([st, ...(st.alts || [])].some((o) => o.on?.type === 'talk' && o.on.who === charId)) return true;
      if (nudges && st.nudge?.by === charId) return true;   // (shown or still to come: a player goes back to them for the hint)
    }
    return false;
  }
  #byQueenie() {
    const G = this.G, q = G.chars?.find('queenie'), p = G.gus.position;
    return G.state.carried?.id === 'slice-anchovy' && !!q && Math.hypot(q.x - p.x, q.z - p.z) < 8;
  }
  /** The nearest seated person or dog walker within reach who'd take a slice (no taker role, not busy), or null. */
  #eaterHuman() {
    const G = this.G, c = G.state.carried, p = G.gus.position;
    if (!c || !isFood(c.id) || this.#byQueenie()) return null;
    let best = null, bd = 1.8;
    for (const a of G.humans.agents) {
      if (!a.out || a.busy || a.script || a.holds || TAKERS['human:' + a.role] || !(a.spec?.act === 'sit' || a.role === 'dogwalker')) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
  /** They eat it: the slice is gone (den-cats puts the next anchovy out on the sill early). */
  eat(who, name) {
    const G = this.G, c = G.state.carried;
    if (!c) return;
    G.items.take();
    G.audio.play('slice-handover', { at: G.gus.position, rate: 0.9 });
    G.particles.burst('crumbs', G.gus.position.x, G.gus.position.y + 0.3, G.gus.position.z, 8);
    // #44: a bagel has its own thank-yous (Socket and Ringo their own)
    const bagel = isBagel(c.id), own = bagel && BAGEL_EAT[who.id];
    const lines = own ? [].concat(own) : bagel ? [].concat(BAGEL_EAT[who.kind] || BAGEL_EAT.person) : EAT_LINES[who.kind] || EAT_LINES.person;
    const text = (name ? name + ': ' : '') + lines[Math.floor(G.state.time * 3) % lines.length];
    if (bagel) G.audio.play('bagel-munch', { at: G.gus.position, vol: 0.8 });
    G.bubbles.add(text, { at: who.at, ttl: 3, range: 60 });
    G.bus.emit('eaten', { item: c.id, by: who.id });
  }

  itemName() { const c = this.G.state.carried; return c ? (ITEM_DEFS[c.id]?.name || c.id).toLowerCase() : ''; }

  /** The taker's entry for what Gus carries, or null. */
  entryFor(who) {
    const c = this.G.state.carried;
    if (!c) return null;
    const list = TAKERS[who];
    if (!list) return null;
    for (const e of list) {
      if (!fits(e.wants, c.id) || (e.phase && !phaseList(e.phase).includes(this.G.state.phase))) continue;
      // #44: an entry with `when` applies only when it gives a line (Gus keeps the item); null lets a talk or a step's give win
      if (e.when) { const r = e.when(this.G, c.id); if (r == null) continue; return { ...e, keep: r }; }
      return e;
    }
    return null;
  }

  /** The prompt for a named character when Gus carries something (characters.js asks). */
  labelFor(charId) {
    const c = this.G.state.carried;
    if (!c) return null;
    const e = this.entryFor(charId);
    if (e?.keep) return `Offer the ${this.itemName()}`;
    if (e || this.#stepWants(charId, c.id)) return `Give the ${this.itemName()}`;
    if (this.eaterGive(charId)) return `Give the ${this.itemName()} to ${CHARACTERS[charId].name}`;   // fix-19
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
    if (e?.keep) {
      // #44: a `when` entry may answer with several voiced lines ({ text, voice })
      if (Array.isArray(e.keep)) G.say(e.keep.map((l) => (typeof l === 'string' ? { who: name, text: l } : { who: name, ...l })));
      else if (typeof e.keep === 'object') G.say([{ who: name, ...e.keep }]);
      else say(e.keep);
      G.bus.emit('offered', { item: c.id, to: who });
      return true;
    }
    const hot = G.items.isHot(c);
    if (e?.hot && !hot) { say(e.cold || "It's COLD, pal."); G.audio.synth('uiBack'); G.bus.emit('fail', { kind: 'cold', to: who, item: c.id }); return true; }   // fun pass (P7, P10)
    if (!e && !this.#stepWants(who, c.id)) {
      if (who.startsWith('human:')) return false;
      if (this.eaterGive(who)) { const ch = G.chars.find(who); this.eat({ kind: CHARACTERS[who].crew, id: who, at: () => ({ x: ch.x, y: ch.y + 0.7, z: ch.z }) }, CHARACTERS[who].name); return true; }   // fix-19
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
