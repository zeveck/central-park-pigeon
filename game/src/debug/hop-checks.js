// Batch-2 (#5): the hop checks (debug only). Each one puts Gus on open, ordinary ground (the Great Lawn), feeds raw
// inputs through the same replay path the solutions use (version 2: the hop take-off), steps the fixed clock, and
// reports what happened frame by frame.
//   hop-tap   a 4-frame tap of Flap: a hop (about 1 m up, a little forward) that ends walking on the same ground
//   hop-fly   the same tap, then Flap pressed again and held during the hop: a normal take-off
//   hold-fly  Flap held 12 frames from the ground: a take-off with no hop on the way (the pilots' ground press)
//   legacy    the 4-frame tap replayed as an OLD recording (no version): the old take-off, never a hop
// Run: node game/tools/sf-run.mjs check hop-tap   (or all four: check hop)
// or in the page: (await import('/src/debug/hop-checks.js')).runHopCheck(__game, 'hop-tap')

import { P } from '../world/layout.js';

const SPOT = P(0.47, 82.0);   // the Great Lawn, south of its centre: flat grass, nothing near

const INPUTS = {
  'hop-tap': [[4, 'flap', 0, 0], [110, '', 0, 0]],
  'hop-fly': [[4, 'flap', 0, 0], [14, '', 0, 0], [40, 'flap', 0, 0], [30, '', 0, 0]],
  'hold-fly': [[12, 'flap', 0, 0], [60, '', 0, 0]],
  legacy: [[4, 'flap', 0, 0], [60, '', 0, 0]],
};

export async function runHopCheck(api, name) {
  const G = window.__sfG;
  const frames = INPUTS[name].map(([n, h, x, y]) => ({ n, h, x, y }));
  const y0 = G.terrain.heightAt(SPOT.x, SPOT.z);
  G.gus.place({ x: SPOT.x, z: SPOT.z, y: y0, yaw: 0, mode: 'walk' });
  G.flock.place(G.leader());
  G.input.consumeLook();
  G.state.carried = null;
  await api.replay(frames, { version: name === 'legacy' ? 0 : 2 });
  const total = frames.reduce((a, f) => a + f.n, 0);
  const modes = [];
  let maxUp = 0, flew = false, hopped = false;
  for (let i = 0; i < total + 2; i++) {
    api.step(1, { render: 'none' });
    const g = G.gus;
    if (!modes.length || modes[modes.length - 1][0] !== g.mode) modes.push([g.mode, i]);
    maxUp = Math.max(maxUp, g.position.y - y0);
    if (g.mode === 'fly') flew = true;
    if (g.mode === 'hop') hopped = true;
  }
  const g = G.gus, p = g.position;
  const r = { name, modes: modes.map(([m, i]) => `${m}@${i}`).join(' '), maxUp: +maxUp.toFixed(2), endMode: g.mode, endDy: +(p.y - y0).toFixed(3), moved: +Math.hypot(p.x - SPOT.x, p.z - SPOT.z).toFixed(2), legacy: !!G.legacyTakeoff };
  const want = {
    'hop-tap': () => hopped && !flew && g.mode === 'walk' && Math.abs(r.endDy) < 0.05 && r.maxUp > 0.7 && r.maxUp < 1.4 && r.moved > 1 && r.moved < 3.5,
    'hop-fly': () => hopped && flew && g.mode === 'fly' && r.maxUp > 1.5,
    'hold-fly': () => !hopped && flew && g.mode === 'fly',
    legacy: () => !hopped && flew,
  }[name];
  r.ok = !!want();
  G.legacyTakeoff = false;
  return r;
}
