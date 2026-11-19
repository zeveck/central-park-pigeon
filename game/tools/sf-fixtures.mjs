#!/usr/bin/env node
// Builds the scheme fixtures for the Spikes and Feuds & Truces schemes
// (game/data/fixtures/<id>.json): what a player has when that scheme opens.
// It starts from the state the Prologue solution ends in (sf-base.json, replayed
// from it) and applies, in order, each prerequisite scheme's
// results exactly as the engine would (step flags, gives, setFlags, crews and
// their flock, talents, parts, lines, truces, gear, spikes and carts), plus a
// little play history (strays found, crumbs saved), then pins the phase of the
// scheme's first step and Gus at its start Nest.
//
//   node game/tools/sf-fixtures.mjs            (writes the fixtures listed in PLAN)
//
// Per-step fixtures (<id>.s<n>.json) are written by sf-run.mjs while a
// solution records (the state at the start of each step).

import fs from 'fs';
import path from 'path';
import { SCHEME } from '../src/data/schemes.js';
import { CREW } from '../src/data/crews.js';
import { NESTS, STRAY_SPOTS } from '../src/world/layout.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fixtures/sf-base.json'), 'utf8')).state;   // the post-Prologue state (the Prologue solution's end)

// scheme → [prerequisites in a playable order], phase, crumbs, strays, note
const PLAN = {
  'den-songbirds': { done: ['den-cats'], phase: 'morning', crumbs: 40 },
  'den-racers': { done: ['den-cats'], phase: 'morning', crumbs: 45 },
  'den-horses': { done: ['den-cats', 'den-songbirds', 'den-ducks', 'den-squirrels', 'den-biscuit', 'den-turtles', 'den-geese'], phase: 'morning', crumbs: 50 },
  'part-talons': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-cats', 'den-raccoons', 'sab-middle', 'den-songbirds', 'den-horses'], phase: 'morning', crumbs: 60 },
  // the wheeled division needs the raccoons (they rig the pedicab): a player who has them when the Racers open
  'den-racers.alt': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-cats', 'den-raccoons'], phase: 'morning', crumbs: 45 },
  'den-turtles': { done: ['den-ducks', 'den-squirrels', 'den-biscuit'], phase: 'morning', crumbs: 40 },
  'den-geese': { done: ['den-ducks', 'den-squirrels', 'den-biscuit', 'den-turtles'], phase: 'morning', crumbs: 45 },
  'truce-dogs-squirrels': { done: ['den-ducks', 'den-squirrels', 'den-biscuit', 'den-turtles'], phase: 'morning', crumbs: 45 },
  'part-legs': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-cats', 'den-biscuit', 'gear-headlamp', 'den-strix', 'den-turtles', 'truce-dogs-squirrels', 'den-songbirds', 'den-horses'], phase: 'night', crumbs: 60 },
  'den-rhoda': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-raccoons'], phase: 'morning', crumbs: 50 },
  'part-power': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-biscuit', 'den-turtles', 'den-geese', 'den-raccoons', 'den-rhoda'], phase: 'morning', crumbs: 60 },
  'den-meermob': { done: ['den-ducks', 'den-squirrels', 'den-crows', 'den-cats', 'den-racers', 'den-biscuit', 'den-turtles', 'den-geese', 'den-raccoons', 'den-rhoda'], phase: 'morning', crumbs: 75, strays: 14 },
};

// spike sites each scheme installs or clears
const SPIKES = { 'den-horses': { install: ['P5', 'P6'] }, 'sab-middle': { install: ['P7', 'P8'] }, 'sab-north': { install: ['P9', 'P10'] }, 'den-songbirds': { clear: ['P3'] }, 'den-cats': { clear: ['P2'] }, 'den-rhoda': { clear: ['P4'] } };   // fun pass (P5): the cats clear P2 as they join

function apply(st, id) {
  const s = SCHEME[id];
  if (!s) throw new Error('no scheme ' + id);
  s.steps.forEach((step, i) => {
    st.flags[`${id}.s${i + 1}`] = true;
    for (const f of step.does?.setFlags || []) st.flags[f] = true;
    for (const a of step.alts || []) for (const f of a.does?.setFlags || []) st.flags[f] = true;
  });
  st.steps[id] = s.steps.length;
  st.flags[id] = true;
  const g = s.gives || {};
  for (const f of g.setFlags || []) st.flags[f] = true;
  if (g.crew && !st.crews.includes(g.crew)) {
    st.crews.push(g.crew);
    if (g.flock) st.flockFrom[g.crew] = g.flock;
    if (g.talent && !st.talents.includes(g.talent)) st.talents.push(g.talent);
    for (const t of CREW[g.crew].talents) if (!st.seenTalents.includes(t)) st.seenTalents.push(t);
  }
  if (g.part && !st.parts.includes(g.part)) st.parts.push(g.part);
  if (g.gear && !st.gear.includes(g.gear)) st.gear.push(g.gear);
  if (g.line && !st.lines.includes(g.line)) st.lines.push(g.line);
  if (g.truce && !st.truces.includes(g.truce)) st.truces.push(g.truce);
  if (g.scarf && !st.scarves.includes(g.scarf)) st.scarves.push(g.scarf);
  if (g.deal) st.deals += g.deal;
  const sp = SPIKES[id] || {};
  for (const p of sp.install || []) { if (st.spikes[p] == null) st.spikes[p] = 'installed'; st.flags['spikes.' + p] = true; }
  for (const p of sp.clear || []) { st.spikes[p] = 'cleared'; st.flags[`spike.${p}.cleared`] = true; }
  if (id === 'sab-middle') st.carts.middle = true;
  if (id === 'sab-north') st.carts.north = true;
  if (id === 'den-crows') st.flags.workshop = true;
  if (id === 'den-raccoons') st.flags['door.rink-garage'] = false;
  const lane = s.thread;
  if (lane && !st.lanes.includes(lane)) st.lanes.push(lane);
}

for (const [key, P] of Object.entries(PLAN)) {
  const id = key.replace(/\.alt$/, '');
  const st = JSON.parse(JSON.stringify(base));
  st.flags['prologue.card'] = true;
  for (const d of P.done) apply(st, d);
  // a little play history: crumbs saved up, the time played, strays found along the way
  st.crumbs = P.crumbs;
  st.time = 1800 + P.done.length * 420;
  st.phase = P.phase;
  st.feathers = 3;
  st.signs = Object.fromEntries(Object.entries(st.signs).map(([k, v]) => [k, { ...v, flipped: v.permanent, revertAt: 0 }]));
  st.piles = []; st.items = []; st.carried = null; st.called = []; st.phaseUsed = {}; st.vehicles = {}; st.rink = { piles: [] };
  for (const sp of STRAY_SPOTS.slice(0, P.strays || 0)) { st.flockFrom['stray:' + sp.id] = 1; st.collectibles.strays.push(sp.id); }
  st.lanes = [...new Set([...st.lanes, SCHEME[id].thread])];
  st.tracked = id;
  delete st.flags['door.rink-garage'];
  const nest = NESTS.find((n) => n.id === SCHEME[id].start) || NESTS[0];
  st.lastNest = nest.id;
  st.gus = null;   // goToScheme puts Gus at the scheme's start Nest
  const fx = { scheme: id, note: `Built by game/tools/sf-fixtures.mjs: the post-Prologue state (sf-base.json) with ${P.done.join(', ')} done, ${P.crumbs} crumbs, ${P.phase}, Gus at ${nest.name}.`, state: st };
  fs.writeFileSync(path.join(ROOT, 'data/fixtures', key + '.json'), JSON.stringify(fx));
  console.log('wrote', key, '· crews', st.crews.join(','), '· flock', Object.values(st.flockFrom).reduce((a, b) => a + b, 0));
}
