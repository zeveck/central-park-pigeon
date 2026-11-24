// The run's state: everything the save holds ("Win, lose and progress"):
// flags for every scheme step, crews, parts, gear, the scarf stash and the
// scarf worn, items carried and dropped (with positions; a slice with its age),
// signs (flipped and permanent), carts sabotaged, spike sites, truces, Slice
// Lines, collectibles, postcards, favours, crumbs, flock, time of day, last
// Nest. Settings live in save.js (they're saved alongside).
//
// Systems own their own runtime objects and write their persistent part here,
// so serialize() is just JSON.

import { SIGNS, SPIKE_SITES } from '../world/layout.js';
import { CREW } from '../data/crews.js';

export const SAVE_VERSION = 1;

export function freshState() {
  return {
    v: SAVE_VERSION,
    phase: 'morning',
    time: 0,                // game seconds played (the fixed-step clock all timers use)
    crumbs: 0,
    feathers: 3,
    flags: {},              // 'prologue.s1': true, 'prologue': true, 'walter.doorOpen': true …
    steps: {},              // scheme id → index of the current step (0-based); missing = not started
    tracked: 'prologue',
    crews: [],              // crew ids joined
    parts: [],
    gear: [],
    talents: [],            // talents taught (first-use icons shown once)
    seenTalents: [],
    scarves: ['slice-orange'],
    scarf: 'slice-orange',
    flockFrom: {},          // gang id → birds (strays: 'stray:<id>' → 1)
    carried: null,          // { id, kind, born (game time a slice left the oven), uid, origin }
    items: [],              // { uid, id, x, y, z, born?, origin? }  dropped and world items
    signs: Object.fromEntries(SIGNS.map((s) => [s.id, { flipped: false, permanent: false, at: 0, revertAt: 0 }])),
    piles: [],              // { id, x, z, amount, sign, trickle }
    carts: { south: false, middle: false, north: false },
    spikes: Object.fromEntries(SPIKE_SITES.map((p) => [p.id, null])),   // null | 'installed' | 'cleared'
    truces: [],
    lines: [],
    deals: 0,
    collectibles: { pretzels: [], strays: [], summits: [] },
    postcards: [],
    favours: [],
    lanes: [],              // thread lanes that have appeared on the Board
    lastNest: 'nest-pond',
    gus: null,              // { x, y, z, yaw, mode }
    fog: '',                // map fog of war (base64 bits)
    waypoint: null,
    called: [],             // allies Called this phase ({ crew, x, z })
    stats: { flips: 0, naps: 0, eaten: 0 },
  };
}

/** Totals the HUD and the Board show. */
export function derived(st) {
  // fix-38 (the person's call): every flipped sign counts toward Bread Power, the moment it's flipped; a ranger flipping
  // one back takes it off again. permanentSigns is what can't be taken back (the bread-print scarf counts those)
  const breadPower = Object.values(st.signs).filter((s) => s.flipped || s.permanent).length;
  const permanentSigns = Object.values(st.signs).filter((s) => s.permanent).length;
  const carts = Object.values(st.carts).filter(Boolean).length;
  const spikesCleared = Object.values(st.spikes).filter((v) => v === 'cleared').length + (st.flags['prickett.quit'] ? Object.values(st.spikes).filter((v) => v === null).length : 0);
  const flock = Object.values(st.flockFrom).reduce((a, b) => a + b, 0);
  let support = flock;
  for (const c of st.crews) support += (CREW[c]?.count || 0) + 1 + (CREW[c]?.regulars.length || 0);
  support += st.favours.length * 2;
  return { breadPower, permanentSigns, carts, spikesCleared, flock, support, crews: st.crews.length, parts: st.parts.length, lines: st.lines.length, truces: st.truces.length, deals: Math.min(6, st.deals) };
}

export function cloneState(st) { return JSON.parse(JSON.stringify(st)); }
