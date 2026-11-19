// Goal scripts for the autopilot (debug only). Each returns the goal list for
// one scheme's solution, built from layout data, never from positions read
// off the screen. Run with __game.autopilot('prologue'); the recorded raw
// inputs are the solution file (design/solutions/prologue.json).

import { SIGNS } from '../world/layout.js';

const sign = (id) => SIGNS.find((s) => s.id === id);
const front = (s, d = 1.2) => ({ x: s.x + Math.sin(s.yaw) * d, z: s.z + Math.cos(s.yaw) * d });

import './pilot-ssf.js';   // Fixes-2: eatPile

export const GOALS = {
  /** The Prologue, from New Game to the Swells joining (and the Board after it). */
  prologue: (G) => [
    { waitFor: (G) => G.tutorState?.action === 'flap', timeout: 30 },
    { flyTo: front(sign('S1'), 2.2), alt: 5, r: 2.5 },
    { walkTo: front(sign('S1'), 0.9), r: 0.35 },
    { waitFor: (G) => G.tutorState?.action === 'peck', timeout: 20 },
    { peck: 'sign:S1' },
    { waitFor: (G) => !!G.food.pileFor('S1') && !G.cutscene.locked, timeout: 40 },
    { eatPile: 'S1' },   // Fixes-2: the pile lands in front of Gus now (prologue.js), wherever he stands
    { waitFor: 'prologue.s1', timeout: 60 },   // (Fixes-3: a string, so a run can pick up at step 2)
    { flyTo: front(sign('S2'), 2.2), alt: 6, r: 2.5 },
    { walkTo: front(sign('S2'), 0.9), r: 0.35 },
    { peck: 'sign:S2' },
    { flyTo: front(sign('S3'), 2.2), alt: 6, r: 2.5 },
    { walkTo: front(sign('S3'), 0.9), r: 0.35 },
    { peck: 'sign:S3' },
    { waitFor: 'prologue.s2', timeout: 90 },
    { waitFor: 'prologue', timeout: 120 },
    { waitFor: (G) => G.menus.is('board'), timeout: 10 },
    { wait: 2 },
    { closeMenus: true },
  ],
};
