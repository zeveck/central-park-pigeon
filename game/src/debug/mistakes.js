// The mistake sweep's cases, injections, recovery driver, checks and oracle (debug only; design/changes/mistake-sweep.md).
// Driven by tools/mistake-sweep.mjs through `node game/tools/sf-run.mjs serve` jobs: `mistake <case> <code>`.
//
// One run: load the case's fixture; play the step (the recovery planner below, from the start) until the case's mark
// (carrying the item, in the vehicle, mid-race or mid-fight); inject ONE mistake (real inputs, or the one poke G.hurt);
// then recover with the scheme's own goal script, planned from wherever things are, until the step's flag is set.
// Everything Gus does goes through the autopilot (inputs only), as a player would do it.
//
// Codes: W drop / lose the item · C go cold (wait) · F fail the race or fight · R Ruffled · N nap to the wrong phase ·
//        A wander 2+ min · O wrong order · V vehicle lost or stuck · Q save, quit, Continue (driven from node: real
//        keys and clicks). A digit after the letter is a second variant of the same kind (V2, F2, W2).
//
// This module is plain data + functions; install() (in the page) puts the driver on window.__ms. tools/mistake-sweep.mjs
// also imports it in node for the case list (nothing at the top level touches the page).
import { SCHEMES, SCHEME } from '../data/schemes.js';
import { NESTS, PLACES, FIGHTS, RINK, PEDICAB_RACE, SLICE, PARK, RACE } from '../world/layout.js';
import { CHARACTERS, phaseList } from '../data/crews.js';
import { ITEM_SOURCES, RENEWING } from '../data/item-sources.js';
import { PEOPLE } from '../data/people.js';

const PH = ['morning', 'afternoon', 'dusk', 'night'];
const fitsItem = (want, id) => !!id && (want === id || (want === 'slice' && id.startsWith('slice')));

// ------------------------------------------------------------------ in-page geometry helpers (all read-only)
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** A point well out on the water near (x, z): wet there and 3 m round it. */
function waterNear(G, x0, z0) {
  for (let r = 0; r < 70; r += 1.5) for (let a = 0; a < 6.283; a += r ? 0.3 / Math.max(1, r / 6) : 7) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (!G.collision.waterAt(x, z)) continue;
    if ([0, 1.57, 3.14, 4.71].every((b) => G.collision.waterAt(x + Math.cos(b) * 3, z + Math.sin(b) * 3))) return { x, z };
  }
  throw new Error(`no water near ${x0}, ${z0}`);
}
/** The highest roof-like surface within R m of (x, z) (2.5 m or more above the ground). */
function roofNear(G, x0, z0, R = 12) {
  let best = null;
  for (let dx = -R; dx <= R; dx += 1) for (let dz = -R; dz <= R; dz += 1) {
    const x = x0 + dx, z = z0 + dz, s = G.collision.surface(x, z, 400);
    const h = s.y - G.terrain.heightAt(x, z);
    if (s.kind !== 'water' && h >= 2.5 && (!best || s.y > best.y + 0.3 || (Math.abs(s.y - best.y) < 0.3 && Math.hypot(dx, dz) < best.d))) best = { x, y: s.y, z, d: Math.hypot(dx, dz) };
  }
  if (!best) throw new Error(`no roof near ${x0}, ${z0}`);
  return best;
}
/** Dry ground about d m from `from` (Gus by default), inside the park. */
function offPoint(G, d, from = G.gus.position) {
  for (let k = 0; k < 24; k++) {
    const a = 0.4 + k * 0.785 + (k >= 8 ? 0.39 : 0);
    const dd = k >= 16 ? d * 1.25 : d;
    const x = from.x + Math.cos(a) * dd, z = from.z + Math.sin(a) * dd;
    if (x < PARK.xMin + 8 || x > PARK.xMax - 8 || z < PARK.zMin + 8 || z > PARK.zMax - 8) continue;
    if (G.collision.waterAt(x, z)) continue;
    const s = G.collision.surface(x, z, 400);
    if (s.y - G.terrain.heightAt(x, z) > 1.5) continue;   // not a roof
    return { x, z };
  }
  const p = G.dryNear(from.x + d * 0.7, from.z + d * 0.7); return { x: p.x, z: p.z };
}
const nearestNest = (G, p = G.gus.position) => [...NESTS].sort((a, b) => dist(a, p) - dist(b, p))[0];
/** Nap at the nearest Nest until `phase` (done at once if it already is). Gets out of a vehicle first. */
const napTo = (G, phase) => [...(G.vehicles.driving ? [{ exit: true, timeout: 20 }] : []), { napNest: nearestNest(G).id, phase, timeout: 220 }, { wait: 0.5 }];
// fightOk: a running fight is its scheme's script, so that scheme stays busy until the fight ends; it doesn't count here
// (without it every mistake and recovery that starts mid-fight waited out the 120 s timeout pressing nothing)
const idle = (frames = 20) => ({ sfIdle: true, frames, timeout: 120, fightOk: true });
const nextPhase = (p, not = []) => { for (let k = 1; k <= 4; k++) { const q = PH[(PH.indexOf(p) + k) % 4]; if (!not.includes(q)) return q; } return PH[(PH.indexOf(p) + 1) % 4]; };

// ------------------------------------------------------------------ marks (when to inject)
const M = {
  start: null,
  carry: (item) => (G) => fitsItem(item, G.state.carried?.id),
  fight: (name) => (G) => G.fights.f?.name === name && G.fights.f.state !== 'intro' && G.fights.f.t > 2 && !G.dialogue.open,
  race: (kind) => (G) => G.race.run?.kind === kind && G.race.run.t > 3,
  driving: (id, moved = 10) => (G) => { const v = G.vehicles.driving; return v?.id === id && Math.hypot(v.x - v.def.home.x, v.z - v.def.home.z) > moved; },
  flag: (f) => (G) => !!G.state.flags[f] && !G.schemes.busy.size && !G.cutscene.running,
  and: (...fs) => (G) => fs.every((f) => f(G)),
};

// ------------------------------------------------------------------ injections
// Each: { name, route: 'input' | 'poke', build(G, c) → goals, poke?(G), took(G, c, mon) → true | string (why not) }
const carriedNot = (item) => (G) => (!fitsItem(item, G.state.carried?.id) ? true : `still carrying ${item}`);
const I = {
  /** W: fly out over the water there and Drop. */
  water: (label, x, z, item) => ({
    name: `drop the ${item} over ${label}`, route: 'input',
    build: (G) => { const w = waterNear(G, x, z), heavy = G.items.def(G.state.carried?.id || item)?.cls === 'heavy'; return [{ msFlyOver: w, alt: heavy ? 1.0 : 2.5, r: 2.5, timeout: 200 }, { press: 'drop', frames: 3 }, { wait: 2 }]; },
    took: carriedNot(item),
  }),
  /** W: land on a roof there and Drop. */
  roof: (label, x, z, item, R = 12) => ({
    name: `drop the ${item} on ${label}`, route: 'input',
    build: (G) => { const r = roofNear(G, x, z, R); return [{ climbTo: 6, timeout: 30 }, { flyTo3: { x: r.x, y: r.y, z: r.z }, r: 1.0, timeout: 150 }, { press: 'drop', frames: 3 }, { wait: 1.5 }]; },
    took: carriedNot(item),
  }),
  /** W: just put it down (here, too early). */
  dropHere: (item) => ({ name: `drop the ${item} early`, route: 'input', build: () => [{ press: 'drop', frames: 3 }, { wait: 1 }], took: carriedNot(item) }),
  /** C: stand about until the slice is cold. */
  cold: () => ({
    name: 'wait until the slice is cold', route: 'input',
    build: () => [{ msUntil: (G) => G.state.carried?.id?.startsWith('slice') && !G.items.isHot(G.state.carried), timeout: 150 }, { wait: 2 }],
    took: (G) => (G.state.carried?.id?.startsWith('slice') ? (!G.items.isHot(G.state.carried) ? true : 'still hot') : 'no slice carried'),
  }),
  /** N: nap at the nearest Nest to a phase (explicit, or the first one the step can't use). */
  nap: (phase = null, why = '') => ({
    name: `nap to ${phase || 'a wrong phase'}${why ? ' (' + why + ')' : ''}`, route: 'input',
    build: (G, c) => { const p = phase || wrongPhase(G, c); window.__msNapWant = p; return [idle(), ...napTo(G, p), idle()]; },
    took: (G) => (G.state.phase === window.__msNapWant ? true : `phase is ${G.state.phase}, wanted ${window.__msNapWant}`),
  }),
  /** N (blocked): try to nap now (racing / a fight blocks or ends it). */
  napTry: (why) => ({
    name: `try to nap (${why})`, route: 'input',
    build: (G) => { window.__msPhase0 = G.state.phase; return [{ napNest: nearestNest(G).id, phase: nextPhase(G.state.phase), timeout: 90 }, idle()]; },
    took: (G) => (G.state.phase === window.__msPhase0 ? true : `the nap went through (${G.state.phase})`),
  }),
  /** A: wander 120 m off and hang about for 125 s. */
  wander: () => ({
    name: 'wander 120 m off for 2 min', route: 'input',
    build: (G) => [{ landNear: offPoint(G, 120), alt: 10, r: 5, timeout: 200 }, { wait: 125 }],
    took: () => true,
  }),
  /** R: three hits outside a fight (the real G.hurt path: the only one a poke can reach). */
  ruffle: (where = '') => ({
    name: `Ruffled${where ? ' ' + where : ''} (G.hurt x3)`, route: 'poke',
    build: () => [{ wait: 5 }, idle()],
    poke: () => { window.__game.dev.hurt(3); },
    took: (G, c, mon) => (mon.ruffled.length ? true : 'never Ruffled'),
  }),
  /** R in a fight: hold still (hovering over `at` if given, below `alt`) until Ruffled. */
  ruffleFight: (at = null, alt = 2.2) => ({
    name: 'take hits until Ruffled' + (at ? ' (over the water)' : ''), route: 'input',
    build: () => (at ? [{ msHover: at, alt, until: () => window.__ms.mon.ruffled.length > 0, timeout: 300 }] : [{ msUntil: () => window.__ms.mon.ruffled.length > 0, timeout: 300 }]).concat([{ wait: 4 }, idle()]),
    took: (G, c, mon) => (mon.ruffled.length ? true : 'never Ruffled'),
  }),
  /** F: leave the fight's arena (land d m from its centre). */
  leaveFight: (name, centre, d, label) => ({
    name: label, route: 'input',
    build: (G) => [{ landNear: offPoint(G, d, centre), alt: 3, r: 6, timeout: 200 }, { msUntil: (G) => !G.fights.f, timeout: 30 }, idle()],
    took: (G) => (!G.fights.f && !G.state.flags[{ biscuit: 'biscuit.fightWon', rhoda: 'rhoda.beaten', vinnie: 'vinnie.cartRigged' }[name]] ? true : 'the fight is still on (or won)'),
  }),
  /** F: lose the flight race (hover off the line until Coach wins), `times` times. */
  loseRace: (times = 1) => ({
    name: times > 1 ? 'lose the race twice' : 'lose the race', route: 'input',
    build: () => {
      const one = [{ msHover: { x: RACE.start.x - 20, z: RACE.start.z - 25 }, alt: 6, until: (G) => !G.race.run, timeout: 300 }, idle()];
      const again = [{ sfLandNear: { x: 4, z: 563.6 }, alt: 6, r: 1.8, timeout: 90 }, { peck: 'race-start' }, { msUntil: (G) => G.race.run?.t > 0, timeout: 20 }, ...one];
      return times > 1 ? [...one, ...again] : one;
    },
    took: (G, c, mon) => (mon.raceLost >= times ? true : `races lost: ${mon.raceLost}`),
  }),
  /** F: the wheeled race: stop and let Coach's time run out. */
  loseWheels: () => ({
    name: 'stop mid-race (lose the wheels race)', route: 'input',
    build: () => [{ msUntil: (G) => !G.race.run, timeout: 260 }, idle()],
    took: (G, c, mon) => (mon.raceLost >= 1 ? true : 'never lost'),
  }),
  /** F: Vinnie: fly up off his cart until he walks back and spots Rigby (the step resets). */
  vinnieOff: () => ({
    name: 'fly off mid-fight (Vinnie spots Rigby)', route: 'input',
    build: () => [{ msHover: { x: FIGHTS.vinnie.cart.x + 4, z: FIGHTS.vinnie.cart.z + 4 }, alt: 7, until: (G) => !G.fights.f, timeout: 120 }, idle()],
    took: (G) => (!G.fights.f && !G.state.flags['vinnie.cartRigged'] ? true : 'not reset'),
  }),
  /** F: the Night Ramble: flap until Strix spots him. */
  spotted: () => ({
    name: 'flap in the stealth until spotted', route: 'input',
    build: () => { window.__msCatch0 = 0; return [{ msUntil: (G) => (G.fights.f?.catches || 0) >= 1 || !G.fights.f, mash: 'flap', every: 12, hold: 3, timeout: 120 }, { wait: 3 }, idle()]; },
    took: (G, c, mon) => ((G.fights.f?.catches || 0) >= 1 || mon.fails.some((f) => f.fight === 'strix') ? true : 'never spotted'),
  }),
  /** V: drive flat out at a point until stuck, get out, fly `off` m away. */
  wedge: (label, target, off = 60) => ({
    name: label, route: 'input',
    build: (G) => { const t = target(G); return [{ msWedge: t, secs: 3, timeout: 45 }, { exit: true, timeout: 20 }, idle(), { landNear: offPoint(G, off), alt: 8, r: 5, timeout: 200 }]; },
    took: (G) => (!G.vehicles.driving ? true : 'still driving'),
  }),
  /** V: get out now (mid-tow) and fly off. */
  exitNow: (label, off = 30) => ({
    name: label, route: 'input',
    build: (G) => [{ exit: true, timeout: 20 }, idle(), { landNear: offPoint(G, off), alt: 6, r: 5, timeout: 150 }],
    took: (G) => (!G.vehicles.driving ? true : 'still driving'),
  }),
  /** O: a fragment of goals out of order. */
  order: (label, build, took) => ({ name: label, route: 'input', build, took }),
};

/** A phase the case's step can't be done in (for a plain N). */
function wrongPhase(G, c) {
  const step = SCHEME[c.id].steps[G.schemes.stepIndex(c.id)] || SCHEME[c.id].steps[c.n - 1];
  const ok = new Set();
  for (const o of step.alts || [step]) for (const p of phaseList(o.needs?.phase || 'any')) ok.add(p);
  return nextPhase(G.state.phase, [...ok, G.state.phase]);
}

// ------------------------------------------------------------------ the cases (design/changes/mistake-sweep.md §1)
// key: <scheme>.s<n>[.alt]; goal: the goal script; fixture; mark: when to inject; vehicle / fight: what the step uses;
// m: the mistakes (the first listed is round 1's); alt: which alternative of step n the goal script takes.
const C = [];
const add = (key, o) => C.push({ key, id: key.split('.s')[0], n: +key.match(/\.s(\d+)/)[1], goal: key.split('.s')[0], fixture: key.replace(/\.alt$/, '').replace(/\.s1$/, ''), mark: null, ...o });

add('den-ducks.s3', { mark: M.carry('peas'), item: 'peas', m: { W: I.water('the Lake', 0, 300, 'peas'), R: I.ruffle(), A: I.wander() } });
add('den-rats.s3', { mark: M.carry('slice'), item: 'slice', m: { C: I.cold(), N: I.nap(null, 'it cools'), W: I.roof('a roof by Columbus Circle', -122, -32, 'slice', 22) } });
add('den-cats.s3', { mark: M.carry('slice-anchovy'), item: 'slice-anchovy', m: { C: I.cold(), W: I.water('the Lake', -40, 290, 'slice-anchovy'), N: I.nap('night') } });
add('den-raccoons.s2', { mark: M.carry('slice'), item: 'slice', alt: 2, m: {
  C: I.cold(), N: I.nap('night'),
  O: I.order('peck the guard empty-beaked', () => [{ landNear: { x: -44, z: 429 }, alt: 10, r: 2.5, timeout: 150 }, { nearHuman: 'guard', d: 1.6, timeout: 30 }, { press: 'peck', frames: 3 }, { wait: 2 }, idle()], (G) => (!G.state.flags['delacorte.backstage'] ? true : 'backstage open')),
}, oMark: M.start });
add('den-raccoons.s3', { mark: M.carry('wrench'), item: 'wrench', m: { W: I.water('Turtle Pond', 8, 436, 'wrench'), A: I.wander(), R: I.ruffle() } });
add('sab-middle.s1', { fixture: 'sab-middle', mark: M.carry('gate-key'), item: 'gate-key', m: { W: I.water('the Lake', 25, 300, 'gate-key'), N: I.nap('morning'), R: I.ruffle() } });
add('part-body.s2', { mark: M.fight('vinnie'), fight: 'vinnie', m: {
  F: I.vinnieOff(), N: I.nap('night'),
  O: I.order('Ask the raccoons away from the cart', (G) => [...napTo(G, 'dusk'), { landNear: { x: -55, z: 205 }, alt: 6, r: 3, timeout: 150 }, { call: 'raccoons' }, { wait: 3.6 }, { ask: 'raccoons' }, { wait: 3 }, idle()], (G) => (!G.state.flags['vinnie.cartRigged'] ? true : 'rigged anyway')),
}, nMark: M.start, oMark: M.start });
add('part-body.s3', { mark: M.driving('hotdog-cart', 12), vehicle: 'hotdog-cart', m: {
  V: I.wedge('wedge the cart off the route and leave it', (G) => { const v = G.vehicles.driving; return { x: v.x - 30, z: v.z + 8 }; }),
  V2: I.wedge('drive the cart into the Lake edge and leave it', (G) => { const v = G.vehicles.driving; return waterNear(G, v.x - 10, v.z + 25); }),
  N: I.nap('night'),
}, nMark: M.start });
add('den-racers.s2', { mark: M.race('wings'), alt: 1, m: { F: I.loseRace(1), F2: I.loseRace(2), N: I.napTry('mid-race') } });
add('den-racers.s2.alt', { goal: 'den-racers.alt', fixture: 'den-racers.alt', mark: M.race('wheels'), alt: 2, vehicle: 'pedicab', m: {
  F: I.loseWheels(),
  V: I.wedge('drive the pedicab 100 m off and leave it', (G) => { const v = G.vehicles.driving; const o = offPoint(G, 100, v); return o; }, 25),
  N: I.nap('night'),
}, vMark: M.driving('pedicab', 3), nMark: M.flag('den-racers.s1') });
add('part-talons.s2', { mark: M.start, item: 'slice', m: {
  O: I.order('pay Rigby before the garage door', (G) => [...napTo(G, 'dusk'), { landNear: { x: 30, z: -6.6 }, alt: 6, r: 1.5, timeout: 150 }, { walkTo: { x: 30, z: -6.6 }, r: 0.6 }, { peck: 'line:carriage' }, { waitFor: (G) => G.state.carried?.id?.startsWith('slice'), timeout: 10 },
    { landNear: { x: 0, z: 70 }, alt: 6, r: 3, timeout: 150 }, { call: 'raccoons' }, { wait: 4.2 }, { sfTalk: 'rigby', timeout: 30 }, { waitFor: 'union.paid', timeout: 20 }, idle()], (G) => (G.state.flags['union.paid'] && !G.state.flags['door.rink-garage'] ? true : 'not out of order')),
  C: I.cold(), N: I.nap('night'),
}, cMark: M.carry('slice'), nMark: M.carry('slice') });
add('part-talons.s3', { mark: M.driving('zamboni', 2), vehicle: 'zamboni', m: {
  V: I.wedge('wedge the Zamboni in a rink corner and leave it', () => ({ x: RINK.ice.x1 - 0.8, z: RINK.ice.z1 - 0.8 })),
  F: I.order('a failed launch (creep into the ramp)', () => [{ msWhile: { zamboniLaunch: true }, until: (G) => G.vehicles.piles?.some((q) => q.state === 'ramp'), timeout: 300 }, { msWedge: (G) => { const r = G.vehicles.piles.find((q) => q.state === 'ramp'); return r ? { x: r.x, z: r.z + 2 } : { x: RINK.x, z: RINK.lane.z1 }; }, secs: 2, slow: 0.3, timeout: 40 }, { wait: 2 }], (G) => (!G.state.flags['rink.launched'] ? true : 'launched anyway')),
  N: I.nap('morning'),
}, fMark: M.driving('zamboni', 2) });
add('part-wings.s1', { fixture: 'part-wings', mark: M.carry('sail'), item: 'sail', m: { W: I.water('Conservatory Water', 72, 312, 'sail'), A: I.wander(), R: I.ruffle() } });
add('part-wings.s2', { mark: M.carry('shiny'), item: 'shiny', alt: 1, m: {
  W: I.water('the Lake', -5, 335, 'shiny'), N: I.nap('dusk'),
  O: I.order('Ask the crows by the kid with nothing to trade', (G) => [...napTo(G, 'afternoon'), { landNear: { x: 64, z: 298 }, alt: 6, r: 2, timeout: 150 }, { nearHuman: 'rckid', d: 2.5, timeout: 20 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' }, { wait: 3 }, idle()], (G) => (!G.state.flags['trade.remote'] ? true : 'traded anyway')),
}, oMark: M.start });
add('part-wings.s3', { mark: M.driving('rc-boat', 4), vehicle: 'rc-boat', item: 'sail', m: {
  V: I.wedge('leave the RC tug on the far side', (G) => farSide(G), 20),
  V2: I.exitNow('get out mid-tow'),
  W: I.water('Conservatory Water', 72, 312, 'sail'),
}, v2Mark: (G) => !!G.vehicles.tow?.hooked && !!G.vehicles.driving, wMark: M.carry('sail') });
add('den-biscuit.s3', { mark: M.fight('biscuit'), fight: 'biscuit', item: 'ball', m: {
  F: I.leaveFight('biscuit', FIGHTS.biscuit.arena, FIGHTS.biscuit.arena.r + 22, 'leave Cedar Hill mid-fight'),
  R: I.ruffle('on the shore'), W: I.water('the Lake', 15, 320, 'ball'),
}, rMark: M.carry('ball'), wMark: M.carry('ball') });
add('den-strix.s2', { mark: M.fight('strix'), fight: 'strix', item: 'spectacles', m: {
  F: I.spotted(), N: I.nap('morning'), A: I.wander(),
}, nMark: M.and(M.carry('spectacles'), (G) => G.state.phase === 'night' && !G.fights.f), aMark: M.and(M.carry('spectacles'), (G) => G.state.phase === 'night' && !G.fights.f) });
add('gear-pen.s2', { mark: M.carry('cufflink'), item: 'cufflink', m: { A: I.wander(), N: I.nap('dusk'), R: I.ruffle() } });
add('gear-headlamp.s2', { mark: M.carry('key'), item: 'key', alt: 2, m: { W: I.water('the Reservoir', -60, 640, 'key'), N: I.nap('afternoon'), A: I.wander() },
  nMark: M.and(M.carry('key'), (G) => G.state.phase === 'morning'), aMark: M.and(M.carry('key'), (G) => G.state.phase === 'morning') });
add('part-beak.s2', { mark: M.carry('sticker'), item: 'sticker', m: { W: I.roof('the shed roof', 125, 364, 'sticker', 10), N: I.nap('night'), R: I.ruffle() } });
add('truce-dogs-squirrels.s3', { mark: M.carry('tennis-sack'), item: 'tennis-sack', m: {
  W: I.water('the Lake', -25, 300, 'tennis-sack'), N: I.nap('afternoon'), O: I.dropHere('tennis-sack'),
}, oMark: M.and(M.carry('tennis-sack'), (G) => Math.hypot(G.gus.position.x - 0, G.gus.position.z - 330) < 40 || G.gus.position.z > 320) });
add('truce-cats-rats.s3', { mark: M.and(M.carry('box'), (G) => G.gus.position.z > 820), item: 'box', m: {
  W: I.water('Harlem Meer', 60, 1005, 'box'),
  N: I.order('put the box down and nap', (G) => [{ press: 'drop', frames: 3 }, { wait: 1 }, ...napTo(G, nextPhase(G.state.phase)), idle()], (G) => (!G.items.world.some((w) => w.id === 'box') && G.state.carried?.id !== 'box' ? true : 'the box is still about')),
  A: I.wander(),
}, nMark: M.carry('box'), aMark: M.carry('box') });
add('den-rhoda.s2', { mark: M.fight('rhoda'), fight: 'rhoda', m: {
  F: I.leaveFight('rhoda', FIGHTS.rhoda.centre, 85, 'leave the Meer 75 m+ mid-fight'),
  R: I.ruffleFight(FIGHTS.rhoda.centre, 2.0), N: I.napTry('mid-fight'),
} });
add('den-rhoda.s3', { mark: M.carry('slice'), item: 'slice', m: {
  C: I.cold(), N: I.nap('night', 'after the door opened'),
  O: I.order('Ask the raccoons at the stairs before the door', (G) => [{ landNear: { x: 129, z: 312 }, alt: 10, r: 2.5, timeout: 200 }, { walkTo: { x: 129.0, z: 315.0 }, r: 0.6 }, { call: 'raccoons' }, { wait: 4.0 }, { ask: 'raccoons' }, { wait: 3 }, idle()], (G) => (!G.state.flags['den-rhoda.s3'] ? true : 'done anyway')),
}, nMark: M.flag('walter.doorOpen'), oMark: (G) => G.state.phase === 'dusk' && !G.state.carried && !G.schemes.busy.size });
add('part-power.s3', { mark: M.start, m: {
  O: I.order('Ask the geese before the dove is out', (G) => [{ landNear: { x: -31.4, z: 300.6 }, alt: 4, r: 1.5, timeout: 120 }, { call: 'geese' }, { wait: 3.8 }, { ask: 'geese' }, { wait: 3 }, idle()], (G) => (!G.state.flags['wedding.cleared'] ? true : 'cleared anyway')),
  N: I.nap('night'), A: I.wander(),
}, oFixture: 'part-power.s2' });
add('den-meermob.s2.alt', { goal: 'den-meermob.alt', fixture: 'den-meermob.s2', mark: M.carry('slice'), item: 'slice', alt: 2, m: {
  C: I.cold(), N: I.nap('night', 'between slices'),
}, nMark: (G) => (G.state.counts?.['den-meermob.s2'] || 0) >= 1 && !G.state.carried, qMark: (G) => (G.state.counts?.['den-meermob.s2'] || 0) >= 2 && !G.state.carried });

/** The far side of Conservatory Water from the RC tug's landing (open water, 2 m off the bank). */
function farSide(G) {
  const c = PLACES.conservatory, land = { x: 63.2, z: 301 };
  let best = null;
  for (let dx = -22; dx <= 22; dx += 1) for (let dz = -22; dz <= 22; dz += 1) {
    const x = c.x + dx, z = c.z + dz;
    if (![[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].every(([a, b]) => G.collision.waterAt(x + a, z + b))) continue;
    const d = Math.hypot(x - land.x, z - land.z);
    if (!best || d > best.d) best = { x, z, d };
  }
  return best || { x: c.x + 10, z: c.z + 10 };
}

// Q (save, quit, Continue) for every scheme. Rows above: at their mark (the riskiest row of the scheme); the rest: mid-way
// through the middle step (half its recorded time); part-eyes: at the end of sab-middle step 2.
const Q_ROW = { 'den-ducks': 'den-ducks.s3', 'den-rats': 'den-rats.s3', 'den-cats': 'den-cats.s3', 'den-raccoons': 'den-raccoons.s3', 'sab-middle': 'sab-middle.s1',
  'part-body': 'part-body.s3', 'den-racers': 'den-racers.s2', 'part-talons': 'part-talons.s3', 'part-wings': 'part-wings.s3', 'den-biscuit': 'den-biscuit.s3',
  'den-strix': 'den-strix.s2', 'gear-pen': 'gear-pen.s2', 'gear-headlamp': 'gear-headlamp.s2', 'part-beak': 'part-beak.s2', 'truce-dogs-squirrels': 'truce-dogs-squirrels.s3',
  'truce-cats-rats': 'truce-cats-rats.s3', 'den-rhoda': 'den-rhoda.s2', 'part-power': 'part-power.s3', 'den-meermob': 'den-meermob.s2.alt' };
for (const s of SCHEMES) {
  if (s.id === 'finale' || Q_ROW[s.id]) continue;
  if (s.id === 'part-eyes') { C.push({ key: 'part-eyes.s1', id: 'part-eyes', n: 1, goal: 'part-eyes', fixture: 'sab-middle.s2', markGoal: 'sab-middle', mark: M.flag('sab-middle'), qOnly: true, m: {} }); continue; }
  const mid = Math.ceil(s.steps.length / 2);
  C.push({ key: `${s.id}.s${mid}`, id: s.id, n: mid, goal: s.id, fixture: mid > 1 ? `${s.id}.s${mid}` : s.id, mark: 'half', qOnly: true, m: {} });
}
for (const c of C) c.qKey = Q_ROW[c.id] === c.key || c.qOnly;

export const CASES = Object.fromEntries(C.map((c) => [c.key, c]));
/** Round 1: the first-listed mistake of each of the 26 rows, plus Q for every scheme but the finale. */
export function roundOne() {
  const out = [];
  for (const c of C) if (!c.qOnly) out.push({ key: c.key, code: Object.keys(c.m)[0] });
  for (const c of C) if (c.qKey) out.push({ key: c.key, code: 'Q' });
  return out;
}
/** Every (case, code) pair the plan lists. */
export function allJobs() {
  const out = [];
  for (const c of C) { for (const code of Object.keys(c.m)) out.push({ key: c.key, code }); if (c.qKey) out.push({ key: c.key, code: 'Q' }); }
  return out;
}
/** The mark for a case and code (a code may have its own: nMark, v2Mark, ...). */
function markFor(c, code) {
  const k = code === 'Q' ? 'qMark' : code[0].toLowerCase() + (code.length > 1 ? code.slice(1) : '') + 'Mark';
  return c[k] !== undefined ? c[k] : c.mark;
}
export function fixtureFor(c, code) { return (code && c[code[0].toLowerCase() + 'Fixture']) || c.fixture; }
export function stepFlag(c) { return c.n === SCHEME[c.id].steps.length ? c.id : `${c.id}.s${c.n}`; }

// ------------------------------------------------------------------ the recovery planner
/** Goal-script fixes for a run that may pick up anywhere (inputs only, as ever). */
function fix(goals) {
  const out = [];
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    // goals-sf napAt (fly to the Nest, Peck it, menus) → napNest, which is a no-op when it already is that phase
    if (goals[i + 5]?.sfNapPick && typeof goals[i + 2]?.peck === 'string' && goals[i + 2].peck.startsWith('nest:')) {
      out.push({ napNest: goals[i + 2].peck.slice(5), phase: goals[i + 5].sfNapPick, timeout: 220 }, { wait: 0.5 });
      i += 7; continue;
    }
    if (g.flyTo && !g.alt3) { out.push({ landNear: g.flyTo, alt: g.alt ?? 6, r: g.r ?? 3, timeout: 200 }); continue; }
    if (g.talk) { out.push({ msTalk: g.talk, timeout: g.timeout ?? 90 }); continue; }
    if (g.fight) { out.push({ msFight: g.fight, timeout: g.timeout ?? 300 }); continue; }
    if (g.stealthCross) { out.push({ msFight: 'strix', timeout: g.timeout ?? 400 }); continue; }
    if (g.flyRings) { out.push(g, { msAssert: (G) => !!G.state.flags['race.won'], why: 'race lost' }); continue; }
    if (g.drivePath && g.drivePath !== PEDICAB_RACE.route) { out.push({ msDrivePath: g.drivePath, fromNearest: true, r: g.r, speed: g.speed, thenOut: g.thenOut, timeout: g.timeout ?? 300 }); continue; }
    out.push(g);
  }
  return out;
}
/** Does goal g pick up `item`? (pickItem / sfPick, or a waitFor on carrying it: the stall's shiny, the Carriage Line's slice) */
function picks(g, item) {
  if (g.pickItem && fitsItem(item, g.pickItem)) return true;
  if (g.sfPick && (fitsItem(item, g.sfPick) || (g.sfPick === 'slice' && item.startsWith('slice')))) return true;
  if (typeof g.waitFor === 'function') { const m = String(g.waitFor).match(/carried\?\.id(?: === '([\w-]+)'|\?\.startsWith\('([\w-]+)'\))/); if (m && fitsItem(item, m[1] || m[2])) return true; }
  return false;
}

export async function install() {
  const PM = await import('./pilot-mistake.js?v=' + Date.now());
  const sw = await (await import('./sweep-lib.js')).install();
  const G = window.__sfG;
  const st = () => G.state;

  /** The goals between step k-1's flag and step k's (k = 1: from the start), fixed. */
  const segmentOf = (c, k) => {
    const all = sw.goalsFor(c.goal)(G);
    const flagAt = (f) => all.findIndex((g) => g.waitFor === f);
    const a = k > 1 ? flagAt(`${c.id}.s${k - 1}`) : -1;
    let b = flagAt(k === SCHEME[c.id].steps.length ? c.id : `${c.id}.s${k}`);
    if (b < 0) b = all.length - 1;
    return fix(all.slice(a + 1, b + 1));
  };
  const optionsOf = (c, idx) => {
    const step = SCHEME[c.id].steps[idx];
    if (!step) return [];
    const alts = step.alts ? step.alts.map((a) => ({ ...a, does: { ...(step.does || {}), ...(a.does || {}) } })) : [step];
    return idx === c.n - 1 && c.alt ? [alts[c.alt - 1]] : alts;
  };

  const ms = {
    c: null, code: null, mon: null, lastPlan: [],
    /** Start watching: wrap G.toast, listen on the bus, count the step script's starts. `resume`: counters kept across a reload. */
    begin(key, code, resume = null) {
      const c = CASES[key];
      if (!c) throw new Error('no case ' + key);
      this.c = c; this.code = code;
      const mon = this.mon = resume || { toasts: [], ruffled: [], fails: [], naps: 0, starts: 0, raceLost: 0, injectEnd: null, nudge: [], keeper: [], pendingFail: false, notes: [] };
      if (!window.__msToastOrig) window.__msToastOrig = G.toast;
      const orig = window.__msToastOrig;
      G.toast = (text, opts) => { this.onToast(String(text)); return orig(text, opts); };
      for (const off of window.__msOffs || []) off?.();
      window.__msOffs = [
        G.bus.on('ruffled', () => mon.ruffled.push(+st().time.toFixed(1))),
        G.bus.on('fail', (t, e) => { mon.fails.push({ t: +st().time.toFixed(1), kind: e?.kind, fight: e?.fight, why: e?.why }); mon.pendingFail = true; }),
        G.bus.on('refused', () => { mon.pendingFail = true; }),
        G.bus.on('raceEnd', (t, e) => { if (!e.won) { mon.raceLost++; mon.pendingFail = true; } }),
        G.bus.on('nap', () => { mon.naps++; }),
      ];
      const busy = G.schemes.busy;
      if (!busy.__msAdd) { busy.__msAdd = busy.add.bind(busy); busy.add = (x) => { if (window.__ms?.c && x === window.__ms.c.id && !busy.has(x)) window.__ms.mon.starts++; return busy.__msAdd(x); }; }
      return { key, code, fixtureStep: G.schemes.stepIndex(c.id) + 1, phase: st().phase };
    },
    onToast(text) {
      const mon = this.mon; if (!mon) return;
      mon.toasts.push({ t: +st().time.toFixed(1), text: text.slice(0, 140) });
      const m = text.match(/^The (.+?) (?:is|are) back at (.+)\.$/) || text.match(/^The (.+?) floated back to (.+)\.$/);
      if (m) {
        const r = ITEM_SOURCES.find((q) => q.label === m[2]);
        mon.keeper.push({ t: +st().time.toFixed(1), what: m[1], label: m[2], item: r?.item || null, checked: false });
      }
    },
    /** The checks made while the run steps (every few seconds): nudge consistency, keeper toasts. */
    sample() {
      const c = this.c, mon = this.mon, s = st();
      const note = (k, msg) => { if (!mon.nudge.some((q) => q.k === k)) mon.nudge.push({ k, t: +s.time.toFixed(1), msg }); };
      const idx = G.schemes.stepIndex(c.id);
      if (!s.flags[c.id] && G.schemes.isOpen(c.id) && s.tracked !== c.id) note('tracked', `tracked scheme changed to ${s.tracked}`);
      if (mon.idx0 == null) mon.idx0 = idx; else if (idx < mon.idx0) note('stepBack', `step index went back ${mon.idx0 + 1} → ${idx + 1}`);
      // keeper toasts name where the item lies
      for (const k of mon.keeper) {
        if (k.checked || !k.item) continue;
        k.checked = true;
        const r = G.schemes.keeperRule(k.item) || ITEM_SOURCES.find((q) => q.item === k.item && q.label === k.label);
        const at = r ? G.schemes.keeperSpot(r) : null;
        const it = G.items.world.find((w) => w.id === k.item);
        if (at && it && Math.hypot(it.x - at.x, it.z - at.z) > 3) note('keeper:' + k.item, `NUDGE-WRONG keeper: "${k.label}" but the ${k.item} lies ${Math.hypot(it.x - at.x, it.z - at.z).toFixed(1)} m from it`);
      }
      if (s.flags[c.id] || G.schemes.busy.size || G.cutscene.running) return this.brief();
      const step = SCHEME[c.id].steps[idx];
      // the cold card
      const carried = s.carried;
      if (carried?.id?.startsWith('slice') && !G.items.isHot(carried) && G.schemes.coldSlice(step) && s.tracked === c.id && !(G.schemes.goal()?.key || '').includes('.cold.')) note('coldcard', 'cold slice carried, but the goal card has no cold line');
      // the compass points within 10 m of the item, or of whoever it is for
      const opts = optionsOf(c, idx);
      const item = opts.map((o) => o.needs?.item || o.does?.take?.item).find(Boolean) || (idx === c.n - 1 ? c.item : null);
      const to = opts.map((o) => (o.on?.type === 'give' ? o.on.to : null)).find(Boolean);
      if (item && s.tracked === c.id) {
        const tg = G.schemes.targets(c.id);
        const lying = G.items.world.filter((w) => fitsItem(item, w.id) && !w.sill);
        const rec = to && G.chars.find(to);
        if (!fitsItem(item, carried?.id) && lying.length === 1 && tg.length) {
          const it = lying[0];
          if (!tg.some((t) => Math.hypot(t.x - it.x, t.z - it.z) < 10)) {
            if (rec && tg.some((t) => Math.hypot(t.x - rec.x, t.z - rec.z) < 10)) note('nudge:' + item, `NUDGE-WRONG: the compass points at ${to}, the ${item} lies at ${it.x.toFixed(0)}, ${it.z.toFixed(0)}`);
            else note('nudge2:' + item, `compass not at the ${item} (lies at ${it.x.toFixed(0)}, ${it.z.toFixed(0)})`);
          }
        }
      }
      // after a failure the nudge comes within a minute
      if (mon.pendingFail && s.tracked === c.id && G.schemes.isOpen(c.id)) { mon.pendingFail = false; if ((G.schemes.stepTime[c.id] || 0) < 120) note('failnudge', `stepTime ${(G.schemes.stepTime[c.id] || 0).toFixed(0)} < 120 after a fail event`); }
      return this.brief();
    },
    brief() { const s = st(), p = G.gus.position; return { t: +s.time.toFixed(1), phase: s.phase, step: G.schemes.stepIndex(this.c.id) + 1, carried: s.carried?.id || null, at: [+p.x.toFixed(1), +p.z.toFixed(1)], mode: G.gus.mode, driving: G.vehicles.driving?.id || null, fight: G.fights.f?.name || null, race: G.race.run ? G.race.run.kind : null }; },

    // ---------------------------------------------------------- conditions the node loop steps toward
    cond(name) {
      const c = this.c;
      if (name === 'stepDone') return !!st().flags[stepFlag(c)];
      if (name === 'mark') {
        const mk = markFor(c, this.code);
        if (mk === 'half') return st().time - this.t0 >= this.halfSecs;
        return !mk || !!mk(G);
      }
      if (name === 'pilotEnd') return !G.pilot?.active;
      if (name === 'idle') return !G.schemes.busy.size && !G.cutscene.running && !G.dialogue.open && !G.finale?.running;
      return false;
    },
    /** Step the fixed clock up to `secs` game seconds (render once at the end); stop early when `until` holds or the pilot ends. */
    run(until, secs, stopOnPilotEnd = true) {
      const api = window.__game;
      const n = Math.round(secs * 60);
      let k = 0, hit = false;
      while (k < n) {
        api.step(30, { render: 'none' }); k += 30;
        if (this.cond(until)) { hit = true; break; }
        if (stopOnPilotEnd && !G.pilot?.active) break;
      }
      api.step(1, { render: 'last' });
      const p = api.pilot();
      return { hit: hit || this.cond(until), pilot: p.running ? 'running' : p.result ? (p.result.ok ? 'ok' : 'failed: ' + (p.result.failed || '').slice(0, 200)) : 'none', failedAt: +((p.result?.failed || '').match(/goal (\d+)/)?.[1] ?? -1), sample: this.sample() };
    },
    async start(goals, timeout = 300) { await window.__game.autopilot(goals, { timeout, record: false }); return goals.length; },
    stop() { sw.stopPilot(); },

    // ---------------------------------------------------------- the mistake
    beginMark(halfSecs) { this.t0 = st().time; this.halfSecs = halfSecs; },
    markGoals() { const c = this.c; return c.markGoal ? fix(sw.slice(c.markGoal)) : this.plan(0).goals; },
    injectGoals() {
      const spec = this.c.m[this.code];
      if (!spec) throw new Error(`no mistake ${this.code} for ${this.c.key}`);
      this.mon.inject0 = +st().time.toFixed(1);
      if (spec.poke) spec.poke(G);
      return [idle(10), ...spec.build(G, this.c)];
    },
    took() {
      const spec = this.c.m[this.code];
      const r = spec ? spec.took(G, this.c, this.mon) : true;
      this.mon.injectEnd = +st().time.toFixed(1);
      this.mon.ruffledAtInject = this.mon.ruffled.length;
      return { took: r === true, why: r === true ? null : r, name: spec?.name || 'save, quit, Continue', route: spec?.route || 'input' };
    },

    /** The recovery plan, from wherever things are now. attempt 1 picks the last plan up at the goal that stuck; 3+ naps
     *  round first (a nap tows a rigged vehicle home, renews slices and boxes, resets a fight). */
    plan(attempt = 0, failedAt = -1) {
      const c = this.c, s = st();
      const pre = [];
      if (G.menus.open && !G.menus.is('nap')) pre.push({ closeMenus: true });
      pre.push(idle());
      if (attempt === 1 && failedAt >= 0 && this.lastPlan.length) {
        // pick the last plan up at the last move-to goal before the one that stuck (whole-game.mjs's retry)
        const all = this.lastPlan;
        let j = Math.min(failedAt, all.length - 1);
        while (j > 0 && !['landNear', 'sfLandNear', 'napNest', 'sfTalk', 'msTalk', 'flyTo3', 'msFlyOver', 'enter'].some((k) => all[j][k] != null)) j--;
        const g = all[failedAt] || {};
        let t = null;
        if (g.peck) { const q = G.interact.get(g.peck); if (q) t = { x: q.x, z: q.z }; }
        else if (g.walkTo) t = g.walkTo;
        else if (g.pickItem || g.sfPick) { const q = G.items.world.find((w) => fitsItem(g.pickItem || g.sfPick, w.id)); if (q) t = { x: q.x, z: q.z }; }
        const hop = t ? [{ climbTo: 4, timeout: 20 }, { landNear: { x: t.x + 0.9, z: t.z }, alt: 4, r: 1.2, timeout: 90 }] : [];
        const goals = [...pre, ...(G.vehicles.driving && !all.slice(j).some((q) => q.msDrivePath || q.drivePath || q.drive || q.zamboniLaunch || q.exit) ? [{ exit: true, timeout: 20 }] : []), ...hop, ...all.slice(t ? failedAt : j)];
        this.lastPlan = goals;
        return { goals, how: `resume at goal ${failedAt}${t ? ' (hop)' : ''}` };
      }
      const how = [];
      if (attempt >= 3) {
        // escalation: nap round (a tow, fresh slices/boxes, a reset fight), then plan as usual
        const want = this.phasesNow();
        const other = nextPhase(s.phase, []);
        pre.push(...napTo(G, other), idle());
        if (want && !want.includes(other)) pre.push(...napTo(G, want.includes(s.phase) ? s.phase : want[0]), idle());
        how.push('nap round');
      }
      const r = this.planCore(how);
      if (r.replan) { this.lastPlan = [...pre, ...r.goals]; return { goals: this.lastPlan, how: how.join(', '), replan: true }; }
      const goals = [...pre, ...r.goals];
      this.lastPlan = goals;
      return { goals, how: how.join(', ') };
    },
    phasesNow() {
      const c = this.c, idx = G.schemes.stepIndex(c.id);
      const set = new Set();
      for (const o of optionsOf(c, idx)) for (const p of phaseList(o.needs?.phase || 'any')) set.add(p);
      return set.size && set.size < 4 ? [...set] : null;
    },
    planCore(how) {
      const c = this.c, s = st();
      const idx = G.schemes.stepIndex(c.id);
      const goals = [];
      const veh = c.vehicle, driving = G.vehicles.driving;
      if (driving && driving.id !== veh) goals.push({ exit: true, timeout: 20 }, idle());
      let seg = fix(sw.slice(c.goal));
      // a fight / a race / the step's vehicle already under way: pick the segment up there
      const F = G.fights.f;
      if (F) { const k = seg.findIndex((g) => g.msFight === F.name); if (k >= 0) { seg = seg.slice(k); how.push('fight on'); } }
      if (G.race.run?.kind === 'wings') { const k = seg.findIndex((g) => g.flyRings); if (k >= 0) seg = seg.slice(k); }
      if (veh) {
        const k = seg.findIndex((g) => g.enter === veh);
        if (driving?.id === veh && k >= 0) { seg = seg.slice(k + 1); how.push('in the ' + veh); }
        else if (k >= 0) {
          const T = G.interact.get('vehicle:' + veh), v = G.vehicles.list.find((q) => q.id === veh);
          const at = T ? { x: T.x, z: T.z } : v ? { x: v.x, z: v.z } : null;
          if (at && Math.hypot(at.x - G.gus.position.x, at.z - G.gus.position.z) > 4) seg.splice(k, 0, { landNear: { x: at.x + 1.5, z: at.z }, alt: 6, r: 2.5, timeout: 150 });
          if (v && v.def.home && Math.hypot(v.x - v.def.home.x, v.z - v.def.home.z) > 3) how.push(`${veh} away (${v.x.toFixed(0)}, ${v.z.toFixed(0)})`);
        }
      }
      // the item the step needs
      const opts = optionsOf(c, idx);
      const o = opts.find((q) => q.needs?.item || q.does?.take?.item) || opts[0] || {};
      const item = o.needs?.item || o.does?.take?.item || (idx === c.n - 1 ? c.item : null);
      if (item) {
        const hot = !!o.needs?.hot;
        const carried = s.carried, has = carried && fitsItem(item, carried.id);
        let pickK = -1; seg.forEach((g, i) => { if (picks(g, item)) pickK = i; });
        if (has && hot && !G.items.isHot(carried)) {
          // (put it down well away from where the segment picks one up, or it would pick the cold one up again)
          if (pickK >= 0) { goals.push({ landNear: offPoint(G, 25), alt: 6, r: 4, timeout: 150 }, { press: 'drop', frames: 3 }, { wait: 0.6 }); how.push('drop the cold slice, get another'); }
          else return { goals: [...goals, ...this.warmPlan(opts, seg, pickK, how)] };
        } else if (has) {
          if (pickK >= 0) seg = seg.slice(pickK + 1);
        } else {
          if (carried && !fitsItem(item, carried.id)) { goals.push({ press: 'drop', frames: 3 }, { wait: 0.5 }); how.push(`put the ${carried.id} down`); }
          const lying = G.items.world.filter((w) => fitsItem(item, w.id) && !w.sill && !G.wetAt(w.x, w.z, w.y ?? 400) && (!hot || G.items.isHot(w))).sort((a, b) => dist(a, G.gus.position) - dist(b, G.gus.position));
          const rule = G.schemes.keeperRule(item);
          if (lying.length) {
            const it = lying[0], gy = G.terrain.heightAt(it.x, it.z), y = it.y ?? gy;
            goals.push(...(y - gy > 1.2 ? [{ climbTo: Math.min(12, y - gy + 4), timeout: 30 }, { flyTo3: { x: it.x, y, z: it.z }, r: 1.0, timeout: 150 }] : [{ landNear: { x: it.x + 0.8, z: it.z }, alt: 6, r: 1.6, timeout: 150 }]), { pickItem: it.id, near: { x: it.x, z: it.z }, timeout: 40 });
            how.push(`fetch the ${item} at ${it.x.toFixed(0)}, ${it.z.toFixed(0)}`);
            if (pickK >= 0) seg = seg.slice(pickK + 1);
          } else if (rule) {   // (missing, or lying in water: the keeper puts it back within a couple of seconds)
            how.push('wait for the keeper');
            return { goals: [...goals, { msUntil: (G) => G.items.world.some((w) => w.id === item) || fitsItem(item, G.state.carried?.id), timeout: 12 }], replan: true };
          } else if (pickK < 0) {
            // made by an earlier step: run that step's goals first (whatever is spent there, the oracle will say)
            for (let k = idx; k >= 1; k--) {
              const sg = segmentOf(c, k);
              const pk = sg.reduce((a, g, i) => (picks(g, item) ? i : a), -1);
              if (pk >= 0) { goals.push(...sg.slice(0, pk + 1)); how.push(`get the ${item} again (step ${k}'s goals)`); break; }
            }
          }
        }
      }
      // the phase the step wants (unless what is left of the segment naps on its own): nap first, then plan again (a nap
      // cools a carried slice and clears slices and boxes off the ground)
      const phases = this.phasesNow();
      if (phases && !phases.includes(s.phase) && !seg.some((g) => g.napNest)) {
        how.push('nap to ' + phases[0]);
        return { goals: [...(driving ? [{ exit: true, timeout: 20 }] : []), ...napTo(G, phases.includes(nextPhase(s.phase)) ? nextPhase(s.phase) : phases[0]), idle()], replan: true };
      }
      return { goals: [...goals, ...seg] };
    },
    /** A cold slice where a hot one is wanted, and the segment doesn't make a new one: warm it on the halal griddle (the
     *  goal card's own advice), napping to its phase if need be, then straight to whoever wants it. */
    warmPlan(opts, seg, pickK, how) {
      const s = st();
      let best = null;
      for (const o of opts) {
        if (!o.needs?.hot || o.needs.grate) continue;
        const to = o.on?.type === 'give' ? G.chars.find(o.on.to) : null;
        for (const p of phaseList(o.needs.phase || 'any')) {
          const gr = SLICE.griddle[p];
          if (!gr || (o.needs.griddle && o.needs.griddle !== p)) continue;
          const cost = (p === s.phase ? 0 : 300) + (to ? dist(gr, to) : 0);
          if (!best || cost < best.cost) best = { o, p, gr, to, cost };
        }
      }
      if (!best) { how.push('no griddle fits: run the segment'); return seg; }
      how.push(`warm it on the ${best.p} griddle`);
      const goals = [...(best.p !== s.phase ? napTo(G, best.p) : []), { landNear: { x: best.gr.x - 1.4, z: best.gr.z }, alt: 9, r: 1.5, timeout: 200 }, { msWarm: true, timeout: 30 }];
      if (best.to) { const b = window.__msDry(G, best.to.x, best.to.z) || best.to; goals.push({ landNear: { x: b.x, z: b.z }, alt: 9, r: 3, timeout: 200 }, { msTalk: best.o.on.to, timeout: 90 }); }
      else goals.push(...seg.slice(pickK + 1));
      return goals;
    },

    // ---------------------------------------------------------- the oracle: could the step still be done?
    satisfiable() {
      const c = this.c, s = st();
      const idx = G.schemes.stepIndex(c.id);
      const out = { checks: {}, fails: [] };
      if (s.flags[stepFlag(c)]) { out.checks.done = true; out.ok = true; return out; }
      const opts = optionsOf(c, idx);
      const bad = (k, why) => { out.checks[k] = why; out.fails.push(`${k}: ${why}`); };
      // the item
      const o = opts.find((q) => q.needs?.item || q.does?.take?.item) || opts[0] || {};
      const item = o.needs?.item || o.does?.take?.item || (idx === c.n - 1 ? c.item : null);
      if (item) {
        const carried = fitsItem(item, s.carried?.id);
        const lying = G.items.world.filter((w) => fitsItem(item, w.id));
        const dry = lying.filter((w) => !G.wetAt(w.x, w.z, w.y ?? 400));
        const renew = RENEWING.includes(item) || item === 'slice';
        const keeper = !!G.schemes.keeperRule(item);
        out.checks.item = carried ? 'carried' : dry.length ? 'lying on dry ground' : keeper ? 'keeper rule' : renew ? 'renews' : null;
        if (!out.checks.item) bad('item', `${item}: not carried, not on dry ground, no keeper rule, does not renew`);
      }
      // the phase: reachable by a nap?
      const phases = this.phasesNow();
      if (phases && !phases.includes(s.phase)) {
        const blk = G.mods.map((m) => m.napBlock?.()).find(Boolean);
        if (blk) bad('phase', `needs ${phases.join('/')}, nap blocked: ${blk}`); else out.checks.phase = `nap to ${phases[0]}`;
      } else out.checks.phase = 'ok';
      // the human the step needs: out in one of its phases?
      for (const op of opts) {
        const role = op.needs?.human;
        if (!role) continue;
        const specs = PEOPLE.filter((p) => p.role === role);
        const want = phaseList(op.needs.phase || 'any');
        const ok = specs.some((p) => phaseList(p.phases || 'any').some((q) => want.includes(q)) && !(p.until && s.flags[p.until]));
        if (ok) out.checks['human:' + role] = 'out'; else bad('human:' + role, `${role} never out in ${want.join('/')}`);
      }
      // the vehicle (node ran msWiggle when it was away from home)
      if (c.vehicle && window.__msWiggle != null) { if (window.__msWiggle >= 1) out.checks.vehicle = `moves (${window.__msWiggle.toFixed(1)} m)`; else bad('vehicle', `${c.vehicle} moved ${window.__msWiggle.toFixed(2)} m in 10 s`); }
      // the trigger
      const av = sw.avail(c.id, idx + 1);
      out.checks.trigger = av;
      if (/SPENT|NOT at hand|not haulable/.test(av) && !/(unspent|open|at hand|haulable|re-fires|redo|nothing spent)/.test(av.replace(/SPENT|NOT at hand|not haulable/g, ''))) bad('trigger', av);
      out.ok = !out.fails.length;
      return out;
    },
    vehicleAway() { const c = this.c; if (!c.vehicle) return null; const v = G.vehicles.list.find((q) => q.id === c.vehicle); if (!v) return null; return { id: v.id, x: +v.x.toFixed(1), z: +v.z.toFixed(1), home: Math.hypot(v.x - v.def.home.x, v.z - v.def.home.z) < 3, driving: G.vehicles.driving?.id === v.id }; },
    wiggleGoals() { const c = this.c, v = G.vehicles.list.find((q) => q.id === c.vehicle); const T = G.interact.get('vehicle:' + c.vehicle); const at = T ? { x: T.x, z: T.z } : { x: v.x, z: v.z }; window.__msWiggle = null; return [idle(), ...(G.vehicles.driving?.id === c.vehicle ? [] : [{ landNear: { x: at.x + 1.5, z: at.z }, alt: 6, r: 2.5, timeout: 150 }, { enter: c.vehicle, timeout: 60 }]), { msWiggle: 10, timeout: 20 }]; },
    repairGoals() { const want = this.phasesNow(); const s = st(); const other = nextPhase(s.phase); return [idle(), ...napTo(G, other), idle(), ...(want && !want.includes(other) ? napTo(G, want.includes(s.phase) ? s.phase : want[0]) : []), idle()]; },

    /** The end: loops and leftovers (and what helped). */
    finish() {
      const mon = this.mon, out = { loops: [] };
      const byText = {};
      for (const t of mon.toasts) (byText[t.text] = byText[t.text] || []).push(t.t);
      for (const [text, ts] of Object.entries(byText)) for (let i = 0; i + 3 < ts.length; i++) if (ts[i + 3] - ts[i] <= 60) { out.loops.push(`toast x4 in 60 s: "${text.slice(0, 70)}"`); break; }
      const back = {}; for (const k of mon.keeper) back[k.item || k.what] = (back[k.item || k.what] || 0) + 1;
      for (const [k, n] of Object.entries(back)) if (n > 2) out.loops.push(`keeper put the ${k} back ${n} times`);
      if (mon.starts > 3) out.loops.push(`step script started ${mon.starts} times`);
      const rAfter = mon.ruffled.filter((t) => mon.injectEnd != null && t > mon.injectEnd + 0.5);
      if (rAfter.length) out.loops.push(`Ruffled ${rAfter.length}x after the injection`);
      out.leftovers = sw.leftovers();
      delete out.leftovers.soundLoops;   // the ambient loops of wherever Gus stands
      const T = (re) => mon.toasts.filter((t) => re.test(t.text)).length;
      out.recovery = { keeper: mon.keeper.length, refill: T(/anchovy slice is cooling|puts the next one on Pickles/), tow: T(/towed back|back at its stand|put the Zamboni back|RC tug is back|is back where it started/), naps: mon.naps, fails: mon.fails.length, raceLost: mon.raceLost, starts: mon.starts, repaired: G.repaired || null };
      out.nudge = mon.nudge.map((q) => q.msg);
      return out;
    },
    snapshotMon() { return JSON.parse(JSON.stringify(this.mon)); },
    t0: 0, halfSecs: 0,
  };
  window.__msDry = PM.dryNear;
  window.__ms = ms;
  return ms;
}
