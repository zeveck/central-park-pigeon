// Peck: the one interact button. Systems register targets (signs, items,
// characters, humans who take something, grates, bins, nests); each update
// the best one near Gus becomes the context prompt ("□ Peck the sign") and a
// Peck acts on it. With nothing to peck on a perch, the prompt is "Nap" (on
// a Nest, "Nest").
//
// target: { id, kind, x, y, z, r, priority, label() → string | null, enabled() → bool, act() }

import { glyph } from '../ui/glyphs.js';

export class Interact {
  constructor(G) {
    this.G = G;
    this.targets = new Map();
    this.current = null;
    this.prompt = '';
  }

  register(t) { this.targets.set(t.id, t); return t; }
  unregister(id) { this.targets.delete(id); }
  get(id) { return this.targets.get(id); }

  /** The best target for Gus right now, or null. */
  pick({ air = false } = {}) {
    const g = this.G.gus;
    const p = g.position;
    const carrying = !!this.G.state.carried;
    let best = null, bs = Infinity;
    let pickup = null, ps = Infinity;   // #23: the best plain pick-up within reach
    for (const t of this.targets.values()) {
      if (air && !t.air) continue;   // Fixes-2: in flight only `air` targets (characters out on the water)
      const dx = t.x - p.x, dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > (t.r ?? 1)) continue;
      if (Math.abs((t.y ?? p.y) - p.y) > (t.dy ?? 1.6)) continue;
      if (t.enabled && !t.enabled()) continue;
      const label = t.label ? t.label() : null;
      if (!label) continue;
      // prefer what's in front of him
      const facing = d > 0.05 ? (dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw)) / d : 1;
      // Fixes-3 (R6): carrying something, the world's actions (grate travel, a give, a pick-up, a sign) win the prompt over
      // small talk ("Talk to Express" sat on the 72nd W grate during the hot-slice run; Chip at the slice joint)
      // fix-19: a Give to an eater (a slice given away, systems/takers.js) scores like small talk too: it never takes the Peck
      // from grate travel, a pick-up or a real hand-in
      const chat = carrying && ((t.kind === 'character' && (!/^(Give|Offer)/.test(label) || t.eaterGive?.())) || t.kind === 'eater');
      const score = d * (1.4 - 0.4 * facing) - (t.priority || 0) * 0.5 + (chat ? 3 : 0);
      if (score < bs) { bs = score; best = { t, label }; }
      if (t.kind === 'item' && (t.priority || 0) >= 5 && label.startsWith('Pick up') && score < ps) { ps = score; pickup = { t, label }; }
    }
    // #23: an item within reach beats a character's Ask or Talk (Hazel standing by the dug-up sack, Commodore Puddles by a
    // shiny), so a pick-up never turns into small talk. A guarded item (priority below 5) and a Give or Offer still win.
    if (pickup && best?.t.kind === 'character' && /^(Ask|Talk)/.test(best.label)) return pickup;
    return best;
  }

  /** Each fixed update (when Gus has control). Returns true if a Peck was used. */
  update() {
    const G = this.G, g = G.gus, inp = G.input;
    let used = false;
    const best = g.mode === 'fly' ? this.pick({ air: true }) : this.pick();
    this.current = best;
    let label = best?.label || null;
    let act = best ? () => best.t.act() : null;
    if (!best && g.mode === 'perch') {
      const nest = g.perch?.kind === 'nest' ? g.perch.id : null;
      if (nest) { label = 'Nest'; act = () => G.openNest(nest); }
      else if (G.state.flags.prologue && !G.napBlocked()) { label = 'Nap'; act = () => G.openMenu('nap'); }   // Fixes-3 (R1): not in the Prologue ("E Nap" under "Space to fly" on the first frame)
    }
    this.label = label;
    if (act && inp.pressed('peck')) { act(); used = true; G.bus.emit('peck', { target: best?.t.id || label }); }
    const dev = inp.device, fam = inp.gamepad.family;
    this.prompt = label ? `${glyph('peck', dev, fam)}<span>${label}</span>` : '';
    return used;
  }
}
