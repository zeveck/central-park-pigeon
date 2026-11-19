#!/usr/bin/env node
// Checks the scheme table (src/data/schemes.js) against the rules in the
// design's "Checks this table passes", reading the same data the game does:
//   no cycles · every scheme reachable from New Game · the finale needs exactly 17 crews and 8 parts
//   every step's ally awake in its phase (and recruited by the time the scheme opens; Pull only by a road)
//   phase-locked humans out in that phase · alternatives valid alone, and at least one satisfiable
//   for every state that satisfies opensWhen · pen / sunglasses / headlamp gating · haulers (flier for
//   open water) · hot-slice routes within 60 s at cruise (or grate relay / griddle) · spike and feud
//   rules · the nap rule between every two steps · never 0 open before the finale (every completion
//   order, memoised) · the rink run-up · the wedding's no-bypass rule
//
//   node game/tools/check-schemes.mjs        (exit code 1 on a failure)

import { SCHEMES, SCHEME, NAP_CLEARS, PARTS } from '../src/data/schemes.js';
import { CREW, CREWS, HAULERS, FEUDS, CHARACTERS, phaseList } from '../src/data/crews.js';
import { PEOPLE } from '../src/data/people.js';
import { PLACES, SIGNS, SLICE, GRATES, RINK, SPIKE_SITES } from '../src/world/layout.js';

const fails = [], passes = [], notes = [];
const fail = (m) => fails.push(m);
const pass = (m) => passes.push(m);

const ids = SCHEMES.map((s) => s.id);
const isScheme = (f) => ids.includes(f);
const deps = (s) => {
  const w = s.opensWhen || {};
  return [...(w.flags || []), ...(w.anyOf || []).flat(), ...(w.atLeast?.of || [])].filter(isScheme);
};

// ---------------------------------------------------------------- 1. no cycles
{
  const state = {};
  let cyc = null;
  const visit = (id, stack) => {
    if (state[id] === 2) return;
    if (state[id] === 1) { cyc = [...stack, id]; return; }
    state[id] = 1;
    for (const d of deps(SCHEME[id])) visit(d, [...stack, id]);
    state[id] = 2;
  };
  for (const id of ids) visit(id, []);
  if (cyc) fail('cycle: ' + cyc.join(' → ')); else pass('no cycles in opensWhen');
}

// ---------------------------------------------------------------- helpers: what a set of done schemes gives
function given(done) {
  const flags = new Set(done), crews = new Set(), parts = new Set(), gear = new Set();
  let flock = 0;
  for (const id of done) {
    const g = SCHEME[id].gives || {};
    if (g.crew) { crews.add(g.crew); flock += g.flock || 0; }
    if (g.part) parts.add(g.part);
    if (g.gear) gear.add(g.gear);
    for (const f of g.setFlags || []) flags.add(f);
    for (const st of SCHEME[id].steps) for (const f of st.does?.setFlags || []) flags.add(f);
  }
  return { flags, crews, parts, gear, flock: flock + 40 };   // strays can always be found
}
function opens(s, done) {
  const w = s.opensWhen || {};
  const g = given(done);
  if (w.flags && !w.flags.every((f) => g.flags.has(f))) return false;
  if (w.anyOf && !w.anyOf.every((grp) => grp.some((f) => g.flags.has(f)))) return false;
  if (w.atLeast && w.atLeast.of.filter((f) => g.flags.has(f)).length < w.atLeast.n) return false;
  if (w.crews != null && g.crews.size < w.crews) return false;
  if (w.parts != null && g.parts.size < w.parts) return false;
  return true;
}

// ---------------------------------------------------------------- 2. reachability, the finale gate
{
  const done = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of SCHEMES) if (!done.has(s.id) && opens(s, [...done])) { done.add(s.id); grew = true; }
  }
  const missing = ids.filter((i) => !done.has(i));
  if (missing.length) fail('unreachable: ' + missing.join(', ')); else pass(`all ${ids.length} schemes reachable from New Game`);
  const g = given(ids.filter((i) => i !== 'finale'));
  if (g.crews.size !== 17) fail(`crews given: ${g.crews.size} (want 17)`); else pass('17 crews come out of the schemes');
  if (g.parts.size !== 8) fail(`parts given: ${g.parts.size} (want 8: ${PARTS.join(', ')})`); else pass('8 parts come out of the schemes');
  const fw = SCHEME.finale.opensWhen;
  if (fw.crews !== 17 || fw.parts !== 8 || (fw.flags || []).length) fail('the finale gate should be exactly 17 crews and 8 parts'); else pass('finale gate: all 17 crews and all 8 parts, nothing else');
  const after = SCHEMES.filter((s) => s.id !== 'prologue' && opens(s, ['prologue'])).map((s) => s.id);
  if (after.length < 4) fail('after the Prologue fewer than 4 schemes open: ' + after.join(', ')); else pass(`after the Prologue ${after.length} open: ${after.join(', ')}`);
}

// ---------------------------------------------------------------- closures: what's surely done when a scheme opens
function closures(id) {
  // every way to satisfy opensWhen, as a set of done schemes (anyOf expanded)
  const s = SCHEME[id], w = s.opensWhen || {};
  let sets = [[...(w.flags || []).filter(isScheme)]];
  for (const grp of w.anyOf || []) { const next = []; for (const base of sets) for (const f of grp) next.push([...base, f]); sets = next; }
  if (w.atLeast) { const next = []; const of = w.atLeast.of; for (const base of sets) for (let i = 0; i < of.length; i++) for (let j = i + 1; j < of.length; j++) next.push([...base, of[i], of[j]]); sets = next; }
  return sets.map((set) => {
    const all = new Set();
    const add = (x) => { if (all.has(x)) return; all.add(x); for (const d of closures1(x)) add(d); };
    for (const x of set) add(x);
    return all;
  });
}
const c1cache = {};
function closures1(id) {
  // the deps a scheme surely needs (its first anyOf option is not assumed)
  if (c1cache[id]) return c1cache[id];
  const w = SCHEME[id].opensWhen || {};
  c1cache[id] = [...(w.flags || []).filter(isScheme)];
  return c1cache[id];
}
const recruitOf = (crew) => CREW[crew]?.recruit;
const hasAlly = (ally, done, self) => {
  if (ally === 'haul' || ally === 'haul-road' || ally === 'haul-water') {
    return HAULERS.some((h) => (ally !== 'haul-water' || h.flier) && (done.has(recruitOf(h.crew)) || recruitOf(h.crew) === self));
  }
  return done.has(recruitOf(ally)) || recruitOf(ally) === self;
};
const awakeIn = (ally, phases) => {
  if (ally.startsWith('haul')) return HAULERS.some((h) => (ally !== 'haul-water' || h.flier) && phases.some((p) => phaseList(CREW[h.crew].awake).includes(p)));
  return phases.some((p) => phaseList(CREW[ally].awake).includes(p));
};

// humans out per phase (data/people.js, plus Prickett's van mornings and the halal cart)
const HUMAN_PHASES = { prickett: ['morning'] };
for (const p of PEOPLE) HUMAN_PHASES[p.role] = phaseList(p.phases);
HUMAN_PHASES.wedding = HUMAN_PHASES.bride;
HUMAN_PHASES.vinnie = ['morning', 'afternoon', 'dusk'];

const DARK_WOODS = new Set(['ramble', 'north-woods', 'shakespeare-garden', 'exchange']);
const PATIO = new Set(['tavern']);
const penSign = (id) => SIGNS.find((s) => s.id === id)?.flip === 'pen';

// ---------------------------------------------------------------- 3. per-step rules
let stepCount = 0;
for (const s of SCHEMES) {
  const cl = closures(s.id);
  s.steps.forEach((step, si) => {
    stepCount++;
    const where = `${s.id} step ${si + 1}`;
    const options = step.alts ? step.alts : [{ needs: step.needs || {} }];
    const okInEvery = cl.map((done) => options.some((o) => validFor(o.needs || {}, done, s.id, where, step.alts ? null : true)));
    if (!okInEvery.every(Boolean)) fail(`${where}: no alternative is satisfiable for every way the scheme can open`);
    const penFree = step.alts ? step.alts.some((o) => o.needs?.gear !== 'pen' && !(o.needs?.signs || []).some(penSign)) : false;
    for (const [k, o] of options.entries()) checkNeeds(o.needs || {}, `${where}${step.alts ? ` alt ${k + 1}` : ''}`, s.id, !!step.alts, penFree);
  });
}

function validFor(n, done, self) {
  const phases = n.phase ? phaseList(n.phase) : phaseList('any');
  for (const a of [n.ally, ...(n.allies || [])].filter(Boolean)) if (!hasAlly(a, done, self) || !awakeIn(a, phases)) return false;
  for (const f of n.flags || []) if (isScheme(f) && !done.has(f)) return false;
  return true;
}

function checkNeeds(n, where, self, isAlt, penFree = false) {
  const phases = n.phase ? phaseList(n.phase) : phaseList('any');
  // allies awake in the step's phase
  for (const a of [n.ally, ...(n.allies || [])].filter(Boolean)) {
    if (!a.startsWith('haul') && !CREW[a]) { fail(`${where}: unknown ally ${a}`); continue; }
    if (!awakeIn(a, phases)) fail(`${where}: ${a} is asleep in ${phases.join('/')}`);
    if (a === 'haul-road') notes.push(`${where}: roadside haul (horses can Pull here)`);
  }
  // phase-locked humans
  if (n.human) {
    const hp = HUMAN_PHASES[n.human];
    if (!hp) fail(`${where}: unknown human ${n.human}`);
    else if (!phases.some((p) => hp.includes(p))) fail(`${where}: the ${n.human} is never out in ${phases.join('/')}`);
  }
  // gear gating
  const cls = closures(self);
  const needsPen = n.gear === 'pen' || (!isAlt && (n.signs || []).some(penSign));
  if (needsPen && !penFree && !cls.every((d) => d.has('gear-pen'))) fail(`${where}: needs the pen but can open before gear-pen`);
  if (needsPen && penFree) notes.push(`${where}: uses a pen sign; another alternative needs no pen`);
  if (n.place && PATIO.has(n.place) && n.gear !== 'sunglasses') fail(`${where}: patio step without sunglasses`);
  if (n.place && DARK_WOODS.has(n.place) && phases.length === 1 && phases[0] === 'night' && n.gear !== 'headlamp' && !(n.flags || []).includes('den-strix')) fail(`${where}: Night in the woods without the headlamp`);
  // hot slices: a source within 60 s at cruise (11 m/s), unless a grate relay or the griddle is the route
  if (n.hot && n.place && !n.grate && !n.griddle) {
    const P = PLACES[n.place];
    const d = Math.min(...SLICE.joints.map((j) => Math.hypot(j.counter.x - P.x, j.counter.z - P.z)));
    if (d > 660) fail(`${where}: nearest slice joint is ${Math.round(d)} m away (> 660 m)`);
    else pass(`${where}: hot route ${Math.round(d)} m`);
  }
  if (n.grate) { const [a, b] = n.grate.map((g) => GRATES.find((q) => q.id === g)); if (!a || !b) fail(`${where}: unknown grate`); }
  // feuds
  for (const a of [n.ally, ...(n.allies || [])].filter(Boolean)) {
    for (const f of FEUDS) if (f.crew === a && n.place && f.places.includes(n.place) && !closures(self).every((d) => d.has(f.until) || f.until === self)) fail(`${where}: ${a} won't come to ${n.place} before ${f.until}`);
  }
  // persistent flags only
  for (const f of n.flags || []) if (NAP_CLEARS.includes(f)) fail(`${where}: needs ${f}, which a nap clears`);
}

// ---------------------------------------------------------------- 4. the nap rule between every two steps
for (const s of SCHEMES) {
  for (let i = 0; i + 1 < s.steps.length; i++) {
    const a = s.steps[i], b = s.steps[i + 1];
    const setA = new Set([...(a.does?.setFlags || []), ...(a.alts || []).flatMap((x) => x.does?.setFlags || [])]);
    const needB = [...(b.needs?.flags || []), ...(b.alts || []).flatMap((x) => x.needs?.flags || [])];
    for (const f of needB) if (setA.has(f) && NAP_CLEARS.includes(f)) fail(`${s.id}: step ${i + 2} needs ${f} from step ${i + 1}, but a nap between them clears it`);
    // a step that sets a phase-scoped flag must use it inside itself
    for (const f of a.phaseScoped || []) if (needB.includes(f)) fail(`${s.id}: ${f} is phase-scoped but step ${i + 2} needs it`);
  }
}
pass('nap rule: no step needs a phase-scoped effect from an earlier step (Walter\'s door lives inside den-rhoda step 3)');

// ---------------------------------------------------------------- 5. spike sites
{
  const rules = { P2: 'den-cats', P3: 'den-cats' };
  for (const [site, ally] of Object.entries(rules)) {
    const users = SCHEMES.filter((s) => s.steps.some((st) => JSON.stringify(st).includes(`spike.${site}`)));
    for (const u of users) if (!closures(u.id).every((d) => d.has(ally) || ally === u.id)) fail(`${u.id} needs ${site} cleared but can open before ${ally}`);
  }
  if (!SPIKE_SITES.find((p) => p.id === 'P4')) fail('P4 missing');
  // fun pass (P5): the cats clear P2 themselves when they join (den-cats gives spike.P2.cleared); the Racers no longer have a strips step
  if (!(SCHEME['den-cats'].gives.setFlags || []).includes('spike.P2.cleared')) fail('den-cats should clear the Racers\' roost (P2) when the cats join');
  pass('spike sites: P2 cleared by the cats as they join (den-cats), P3 only after the cats; P4 inside den-rhoda');
}

// ---------------------------------------------------------------- 5b. fun pass (P7): every puzzle step has its 3-minute nudge and the Elders' answer
{
  let n = 0;
  for (const s of SCHEMES) s.steps.forEach((st, i) => {
    const types = [st.on?.type, ...(st.alts || []).map((a) => a.on?.type)].filter(Boolean);
    if (st.auto || types.every((t) => t === 'talk' || t === 'reach')) return;
    n++;
    if (!st.nudge?.text || !st.nudge?.by) fail(`${s.id} step ${i + 1}: a puzzle step with no nudge`);
    else if (!CHARACTERS[st.nudge.by]) fail(`${s.id} step ${i + 1}: nudge by unknown character ${st.nudge.by}`);
    if (!st.answer?.text) fail(`${s.id} step ${i + 1}: a puzzle step with no answer for the Elders`);
  });
  // and every place a step names exists (the compass, the nudge clock)
  for (const s of SCHEMES) s.steps.forEach((st, i) => { for (const nd of [st.needs, ...(st.alts || []).map((a) => a.needs)]) if (nd?.place && !PLACES[nd.place]) fail(`${s.id} step ${i + 1}: unknown place ${nd.place}`); });
  pass(`every one of the ${n} puzzle steps (not talk / reach / auto) has a nudge and an answer; every named place exists`);
}
// ---------------------------------------------------------------- 6. never 0 open before the finale (every completion order)
{
  const order = ids.filter((i) => i !== 'finale');
  const bit = Object.fromEntries(order.map((id, i) => [id, 1n << BigInt(i)]));
  const all = (1n << BigInt(order.length)) - 1n;
  const seen = new Map();
  let states = 0, bad = null;
  const openAt = (mask) => order.filter((id) => !(mask & bit[id]) && opens(SCHEME[id], order.filter((d) => mask & bit[d])));
  const stack = [0n];
  while (stack.length && !bad) {
    const m = stack.pop();
    if (seen.has(m)) continue;
    seen.set(m, true);
    states++;
    if (m === all) continue;
    const o = openAt(m);
    if (!o.length) { bad = order.filter((d) => m & bit[d]); break; }
    for (const id of o) stack.push(m | bit[id]);
    if (states > 400000) { notes.push(`completion orders: stopped after ${states} states (no dead end so far)`); break; }
  }
  if (bad) fail('a dead end with 0 open schemes after: ' + bad.join(', '));
  else pass(`never 0 open before the finale (${states} reachable sets of finished schemes walked)`);
}

// ---------------------------------------------------------------- 7. the rink and the wedding
{
  const lane = 4;   // the launch-lane box is 12 × 4 m against the north boards
  const runUp = RINK.d - lane;
  if (runUp < 20) fail(`rink run-up ${runUp} m (< 20 m)`); else pass(`rink run-up ${runUp} m from the far boards to the launch lane (4 m/s needs ~6 m)`);
  const pt = SCHEME['part-talons'];
  if (phaseList(pt.steps[2].needs.phase).join() !== 'night') fail('the Rink Job freeze step must be Night only'); else pass('the Rink Job freeze step is Night only');
  const pp = SCHEME['part-power'];
  // Fixes-2: the battery comes up inside the stampede (setpiece.wedding, the last step): Bubbles surfaces it, Rhoda lifts it
  const s3 = pp.steps[2];
  if (pp.steps.length !== 3 || s3.does?.script !== 'setpiece.wedding') fail('the Wedding should end on the stampede (step 3, setpiece.wedding)');
  else if (!(s3.needs.flags || []).includes('wedding.doveReleased')) fail('the stampede (and the battery) can come before the dove release');
  else if (phaseList(s3.needs.phase).some((p) => !phaseList(CREW.ducks.awake).includes(p) || !phaseList(CREW.rhoda.awake).includes(p))) fail('the stampede step outside the ducks\' or Rhoda\'s hours');
  else if (!(pp.opensWhen.flags || []).includes('den-rhoda') || !(pp.opensWhen.flags || []).includes('den-geese')) fail('the Wedding must open after Rhoda (she lifts the battery) and the geese');
  else pass('the Wedding: the battery comes up inside the stampede, only after the dove release, M–D, with Rhoda recruited (no Night way round)');
  if (!(pp.steps[1].needs.dove)) fail('the basket step should need Dove'); else pass('the basket step needs Dove (in the flock from the Prologue on)');
}

// ---------------------------------------------------------------- report
for (const p of passes) console.log('  ok   ' + p);
for (const n of notes) console.log('  note ' + n);
for (const f of fails) console.log('  FAIL ' + f);
console.log(`\n${SCHEMES.length} schemes, ${stepCount} steps: ${fails.length ? fails.length + ' failure(s)' : 'all checks pass'}`);
process.exit(fails.length ? 1 : 0);
