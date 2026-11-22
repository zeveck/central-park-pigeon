// Goal scripts for the Spikes and Feuds & Truces schemes (debug only; 3b,
// builder 2). Each GOALS_SF entry returns the goal list for one solution,
// built from layout data, never from positions read off the screen. Like
// every goal they only press inputs; Gus is never moved directly.
// Record with: node game/tools/sf-run.mjs record <id>  (writes design/solutions/<id>.json)
//
// Extra goals (this file's PILOT_EXT handler):
//   { sfIdle: true }                   wait until no cutscene, dialogue or busy scheme script
//   { sfTalk: charId }                 go to a named character and Peck them (talk, give)
//   { sfNap: phase }                   fly to the nearest lamppost, perch, nap until that phase
//   { sfPick: itemId, r }              walk to the nearest such item lying in the world and Peck it
//   { sfLandNear: {x,z}, r }           fly there and land on whatever's under it
//   { sfFlyThrough: {x,y,z}, from }    fly low through a point (the Blockhouse arch) from a side
//   { sfFollow: role, d }              walk up to the nearest out human with that role
import { PILOT_EXT, wrap } from './pilot-ext.js';
import { CHARACTERS } from '../data/crews.js';
import { ask } from './pilot-3a.js';
import { NESTS, RINK, PLACES, SPIKE_SITES, SIGNS, FLYPAST, PEDICAB_RACE, PROLOGUE, CLUES } from '../world/layout.js';

const sign = (id) => SIGNS.find((s) => s.id === id);
const front = (s, d = 1.2) => ({ x: s.x + Math.sin(s.yaw) * d, z: s.z + Math.cos(s.yaw) * d });
const clue = (id) => CLUES.find((c) => c.id === id);
const P = (id) => PLACES[id];
const d0 = (f) => 1;

const SF_EXT = (A, g, s, out) => {
  const G = A.G, gus = G.gus, p = gus.position;
  if (g.sfIdle) {
    const busy = G.cutscene.running || G.dialogue.open || G.schemes.busy.size > 0 || G.menus.open;
    s.calm = busy ? 0 : (s.calm || 0) + 1;
    return s.calm > (g.frames ?? 20);
  }
  if (g.sfTalk) {
    const c = G.chars.find(g.sfTalk);
    if (!c) throw new Error('no character ' + g.sfTalk);
    const id = 'char:' + g.sfTalk;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (s.pressed) { s.pressed++; if (s.pressed <= 3) out.held.add('peck'); return s.pressed > 6; }
    if (gus.mode === 'fly') {
      if (d > 6) { A.stickToward(c.x, c.z, out, 1); if (p.y - G.terrain.heightAt(p.x, p.z) < 5) out.held.add('flap'); }
      else { A.stickToward(c.x, c.z, out, 0.5); out.held.add('dive'); }
      return false;
    }
    if (d > 14) { s.k = (s.k || 0) + 1; if (s.k % 20 < 4) out.held.add('flap'); return false; }
    if (G.interact.current?.t.id === id) { s.pressed = 1; out.held.add('peck'); return false; }
    A.stickToward(c.x, c.z, out, d > 2 ? 1 : 0.45);
    if (d > 3) out.held.add('sprint');
    return false;
  }
  if (g.sfPick) {
    const its = G.items.world.filter((w) => w.id === g.sfPick || (g.sfPick === 'slice' && w.id.startsWith('slice')));
    if (G.state.carried && (G.state.carried.id === g.sfPick || (g.sfPick === 'slice' && G.state.carried.id.startsWith('slice')))) return true;
    if (!its.length) { s.wait = (s.wait || 0) + 1; if (s.wait > 600) throw new Error('no item ' + g.sfPick); return false; }
    const it = its.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (gus.mode === 'fly') { out.held.add('dive'); A.stickToward(it.x, it.z, out, 0.5); return false; }
    if (s.pressed) { s.pressed++; if (s.pressed <= 3) out.held.add('peck'); if (s.pressed > 8) s.pressed = 0; return false; }
    if (G.interact.current?.t.id === 'item:' + it.uid) { s.pressed = 1; out.held.add('peck'); return false; }
    const d = A.stickToward(it.x, it.z, out, 1);
    if (d < 0.6) A.stickToward(it.x, it.z, out, 0.3);
    if (d > 3) out.held.add('sprint');
    return false;
  }
  if (g.sfNapPick) {
    // in the nap menu: move to the phase and pick it (done once the nap has begun)
    if (G.napping || G.state.phase === g.sfNapPick) return true;
    if (!G.menus.is('nap')) return false;
    const order = ['morning', 'afternoon', 'dusk', 'night'].filter((q) => q !== G.state.phase);
    const want = order.indexOf(g.sfNapPick);
    const cur = [...document.querySelectorAll('#nap .list button')].indexOf(document.activeElement);
    s.m = (s.m || 0) + 1;
    if (s.m % 4) return false;
    if (cur < want) out.held.add('uiDown'); else if (cur > want) out.held.add('uiUp'); else out.held.add('uiOk');
    return false;
  }
  if (g.sfMenu) {
    // in the open menu, move the focus to the button with data-act and press OK
    if (s.picked) return ++s.after > 6;
    if (!G.menus.open) return false;
    const root = G.menus.top?.el || document;
    const btns = [...root.querySelectorAll('button')].filter((b) => b.offsetParent);
    const want = btns.findIndex((b) => b.dataset.act === g.sfMenu);
    if (want < 0) throw new Error('no menu button ' + g.sfMenu);
    const cur = btns.indexOf(document.activeElement);
    s.m = (s.m || 0) + 1;
    if (s.m % 4) return false;
    if (cur < want) out.held.add('uiDown'); else if (cur > want) out.held.add('uiUp'); else { out.held.add('uiOk'); s.picked = true; s.after = 0; }
    return false;
  }
  if (g.sfLandNear) {
    // like flyTo3, with the target height read from the world: cruise high, then a slow final approach
    const t = g.sfLandNear, r = g.r ?? 1.5;
    const dist = Math.hypot(t.x - p.x, t.z - p.z);
    if (gus.grounded && dist < r) return true;
    if (gus.grounded) { s.ph = 'out'; s.k = (s.k || 0) + 1; if (s.k % 30 < 4) out.held.add('flap'); else if (!g.from) A.stickToward(t.x, t.z, out, 0.3); return false; }
    if (gus.mode !== 'fly') return false;
    const ty = G.surfaceY(t.x, t.z, Math.max(p.y, G.terrain.heightAt(t.x, t.z)) + 2);
    if (g.from) {
      // a straight, low run-in from `from` (small targets: a rock in a pond)
      s.ph = s.ph || 'out';
      if (s.ph === 'out') { const d = A.stickToward(g.from.x, g.from.z, out, 1); if (p.y < ty + 3.5) out.held.add('flap'); if (d < 2) s.ph = 'in'; return false; }
      A.stickToward(t.x, t.z, out, 1);
      if (dist > 2.4) { if (p.y < ty + 1.0) out.held.add('flap'); }
      else out.held.add('dive');
      if (dist > 16) s.ph = 'out';
      return false;
    }
    if (dist > 3.5) { A.stickToward(t.x, t.z, out, 1); if (p.y < Math.max(ty + 2.5, G.terrain.heightAt(p.x, p.z) + (g.alt ?? 6))) out.held.add('flap'); }
    else { A.stickToward(t.x, t.z, out, Math.max(0.15, dist / 6)); if (p.y > ty + 0.1) out.held.add('dive'); else out.held.add('flap'); }
    return false;
  }
  if (g.sfFlyThrough) {
    // over the walls high, then down low through the point (the roofless Blockhouse: its "arch")
    const t = g.sfFlyThrough, f = g.from;
    s.ph = s.ph || 'up';
    const gy = G.terrain.heightAt(t.x, t.z);
    if (G.cutscene.running && s.ph === 'through') return true;
    if (s.ph === 'up') { if (gus.grounded) { s.k = (s.k || 0) + 1; if (s.k % 30 < 4) out.held.add('flap'); return false; } s.ph = 'approach'; }
    if (s.ph === 'approach') {
      const d = A.stickToward(f.x, f.z, out, d0(f));
      const want = gy + (g.high ?? 7);
      if (p.y < want - 0.3) out.held.add('flap'); else if (p.y > want + 1.4) out.held.add('dive');
      if (d < 2.5 && p.y > want - 0.6) s.ph = 'through';
      return false;
    }
    if (s.ph === 'through') {
      const d = A.stickToward(t.x, t.z, out, 0.7);
      const want = d > 5.2 ? gy + (g.high ?? 7) : gy + t.y;   // over the wall, then down inside
      if (p.y > want + 0.4) out.held.add('dive'); else if (p.y < want - 0.4) out.held.add('flap');
      s.n = (s.n || 0) + 1;
      if (s.n > 600) throw new Error('flypast: never got through');
      return d < 0.5 && Math.abs(p.y - want) < 0.6;
    }
  }
  if (g.sfFollow) {
    const a = G.humans.nearest(g.sfFollow, p, 400);
    if (!a) return false;
    if (gus.mode === 'fly') { out.held.add('dive'); return false; }
    const d = A.stickToward(a.x, a.z, out, 1);
    if (d > 3) out.held.add('sprint');
    return d < (g.d ?? 2.5);
  }
  return undefined;
};
// (re-importing this file for a new recording replaces its handler instead of adding another)
if (typeof window !== 'undefined' && window.__sfExt != null) PILOT_EXT[window.__sfExt] = SF_EXT;
else { PILOT_EXT.push(SF_EXT); if (typeof window !== 'undefined') window.__sfExt = PILOT_EXT.length - 1; }

/** Fly to a Nest, open it, Nap until `phase` (the Nest's "Nap until…"). */
const napAt = (nestId, phase) => {
  const n = NESTS.find((q) => q.id === nestId);
  return [
    { flyTo: { x: n.x, z: n.z + 2.5 }, alt: 8, r: 2.5, timeout: 200 }, { walkTo: { x: n.x, z: n.z + 0.6 }, r: 0.3 }, { peck: 'nest:' + nestId },
    { waitFor: (G) => G.menus.is('nest'), timeout: 5 }, { sfMenu: 'nap', timeout: 10 }, { sfNapPick: phase, timeout: 30 },
    { waitFor: (G) => !G.napping && !G.menus.open && G.state.phase === phase, timeout: 30 }, { wait: 0.5 },
  ];
};
/** Fly to a named character's haunt, land beside them and Peck (talk). */
const talk = (id, off = { x: 1.6, z: -1.6 }) => { const c = CHARACTERS[id].at; return [{ flyTo: { x: c.x + off.x, z: c.z + off.z }, alt: 7, r: 2.5, timeout: 200 }, { sfTalk: id, timeout: 40 }]; };
const idle = (frames = 20) => ({ sfIdle: true, frames, timeout: 240 });
const flag = (f, timeout = 120) => ({ waitFor: f, timeout });
const go = (at, alt = 6, r = 3) => [{ flyTo: at, alt, r }, { walkTo: at, r: 0.6 }];
const P3 = SPIKE_SITES.find((q) => q.id === 'P3'), P2 = SPIKE_SITES.find((q) => q.id === 'P2');

export const GOALS_SF = {
  // ---------------------------------------------------------------- Spikes
  'den-songbirds': () => [
    ...go({ x: -127, z: 410 }), flag('den-songbirds.s1', 30), idle(),
    { call: 'cats' }, { wait: 3.6 }, { ask: 'cats' }, flag('den-songbirds.s2', 40), idle(),
    ...napAt('nest-ramble', 'afternoon'), idle(),
    { sfLandNear: { x: 78.6, z: -13 }, from: { x: 62, z: -13 }, alt: 8, r: 2.0, timeout: 200 },
    { peck: 'icecream-chime' }, flag('den-songbirds', 120), idle(),
  ],
  'den-racers': () => [
    ...talk('wingate', { x: 0, z: -3 }), flag('den-racers.s1', 30), idle(),
    // fun pass (P5): no strips step (the cats cleared the roost as they joined); with 30 crumbs the feast is in the win scene
    { sfLandNear: { x: 4, z: 563.6 }, alt: 6, r: 1.8, timeout: 60 }, { peck: 'race-start' }, { flyRings: true, timeout: 200 }, flag('den-racers.s2', 30), idle(),
    ...((window.__sfG?.state.crumbs ?? 0) >= 30 ? [] : [{ sfLandNear: { x: 6, z: 562 }, r: 2.5 }, { coo: { hold: false } }]), flag('den-racers', 60), idle(),
  ],
  'den-racers.alt': () => [
    // batch-3: come in from the east bank, over the Reservoir, as the main route does (from the south the dive onto Wingate's narrow 86th St bridge deck
    // dropped Gus into the cut beside it; the Reservoir fence blocks walking up from the north bank)
    { flyTo: { x: 92, z: 716 }, alt: 7, r: 4, timeout: 200 }, ...talk('wingate', { x: 0, z: -3 }), flag('den-racers.s1', 30), idle(),
    ...napAt('nest-reservoir', 'dusk'), idle(),
    { sfLandNear: { x: 18.6, z: 563.2 }, alt: 6, r: 2.5, timeout: 60 }, { call: 'raccoons' }, { wait: 3.6 }, { ask: 'raccoons' }, flag('pedicab.rigged', 60), idle(),
    { enter: 'pedicab' }, { drive: { to: { x: PEDICAB_RACE.start.x, z: PEDICAB_RACE.start.z }, r: 1, speed: 1 } },
    { waitFor: (G) => G.race.run && G.race.run.t >= 0, timeout: 20 },
    { drivePath: PEDICAB_RACE.route, r: 3.5, timeout: 200, thenOut: true }, flag('den-racers.s2', 30), idle(),
    ...((window.__sfG?.state.crumbs ?? 0) >= 30 ? [] : [{ exit: true }, { coo: { hold: false } }]), flag('den-racers', 60), idle(),   // (the feast scene gets him out of the pedicab)
  ],
  'den-horses': () => [
    ...talk('clementine'), flag('den-horses.s1', 30), idle(),
    ...go({ x: PROLOGUE.vanStop.x - 4, z: PROLOGUE.vanStop.z + 4 }, 6, 2), { call: 'songbirds' }, { wait: 3.8 }, { ask: 'songbirds' },
    flag('den-horses.s2', 60), idle(), flag('den-horses', 90), idle(),
  ],
  'den-horses.alt': () => [
    ...talk('clementine'), flag('den-horses.s1', 30), idle(),
    ...go({ x: PROLOGUE.vanStop.x - 4, z: PROLOGUE.vanStop.z + 4 }, 6, 2), { call: 'geese' }, { wait: 3.8 }, { ask: 'geese' },
    flag('den-horses.s2', 60), idle(), flag('den-horses', 90), idle(),
  ],
  'part-talons': () => [
    { flyTo: { x: RINK.x, z: RINK.z + 4 }, alt: 7, r: 4 }, flag('part-talons.s1', 30), idle(),
    ...napAt('nest-pond', 'dusk'), idle(),
    // the Carriage Line's slice (Clementine saves the driver's lunch at the Pond carriage stop)
    ...go({ x: 30, z: -6.6 }, 6, 1), { peck: 'line:carriage' }, { waitFor: (G) => G.state.carried?.id?.startsWith('slice'), timeout: 10 },
    { flyTo: { x: RINK.x + 1.4, z: RINK.ice.z0 - 1.6 }, alt: 6, r: 2 }, { walkTo: { x: RINK.x + 1.4, z: RINK.ice.z0 - 2.0 }, r: 0.5 }, { call: 'horses' }, { wait: 3.8 }, { ask: 'horses' }, flag('door.rink-garage', 30), idle(),
    { call: 'raccoons' }, { wait: 4.2 }, { sfTalk: 'rigby', timeout: 30 }, flag('union.paid', 20), idle(),
    { ask: 'raccoons' }, flag('zamboni.rigged', 60), idle(), flag('part-talons.s2', 30), idle(),
    ...napAt('nest-pond', 'night'), idle(),
    { flyTo: { x: RINK.bump.x + 4.8, z: RINK.bump.z + 2.6 }, alt: 6, r: 2.5, timeout: 120 }, { enter: 'zamboni', timeout: 60 }, { zamboniLaunch: true, timeout: 300 }, flag('part-talons', 120), idle(60),
  ],
  // ---------------------------------------------------------------- Feuds & Truces
  'den-turtles': () => [
    { sfLandNear: { x: 8.8, z: 432.5 }, from: { x: 8.8, z: 418 }, r: 1.6, alt: 6, timeout: 200 }, { sfTalk: 'eldest', timeout: 30 }, flag('den-turtles.s1', 30), idle(),
    { call: 'ducks' }, { wait: 3.8 }, { ask: 'ducks' }, flag('den-turtles.s2', 40), idle(),
    ...go({ x: 7.5, z: 423.4 }, 5, 1.5), { call: 'biscuit' }, { wait: 3.8 }, { ask: 'biscuit' }, flag('den-turtles.s3', 60), flag('den-turtles', 60), idle(),
  ],
  'den-geese': () => [
    ...talk('gertrude'), flag('den-geese.s1', 30), idle(),
    ...napAt('nest-greatlawn', 'afternoon'), idle(),
    // batch-3: a lower approach (alt 4) to the Great Lawn signs: at 6 m the autopilot circled N1 without landing after the re-shaped
    // bridge approaches changed where it took off from
    ...go(front(sign('N1'), 2.2), 4), { walkTo: front(sign('N1'), 0.9), r: 0.35 }, { peck: 'sign:N1' },
    ...go(front(sign('N2'), 2.2), 4), { walkTo: front(sign('N2'), 0.9), r: 0.35 }, { peck: 'sign:N2' }, flag('den-geese.s2', 30), idle(),
    { sfLandNear: { x: 8.8, z: 432.5 }, from: { x: 8.8, z: 418 }, r: 1.6, alt: 6, timeout: 200 }, flag('den-geese.s3', 60), flag('den-geese', 60), idle(),
  ],
  'truce-dogs-squirrels': () => [
    ...go({ x: 50, z: 385 }), flag('truce-dogs-squirrels.s1', 30), idle(),
    ...go({ x: -40, z: 280 }), { call: 'squirrels' }, { wait: 3.6 }, { ask: 'squirrels' }, flag('truce-dogs-squirrels.s2', 40), idle(),
    { sfPick: 'tennis-sack', timeout: 60 },
    { walkTo: { x: -20, z: 300 }, r: 2, timeout: 60 }, { flyTo: { x: 44, z: 380 }, alt: 1.4, r: 3, timeout: 200 },
    { sfFollow: 'dogwalker', d: 2.5, timeout: 120 }, { press: 'drop', frames: 3 }, flag('truce-dogs-squirrels', 120), idle(),
  ],
  'part-legs': () => [
    ...go({ x: -7, z: 536 }), { call: 'strix' }, { wait: 3.8 }, { ask: 'strix' }, flag('part-legs.s1', 40), idle(),
    ...napAt('nest-greatlawn', 'morning'), idle(),
    ...go({ x: -20, z: 537 }, 6, 1.5), { call: 'squirrels' }, { wait: 3.6 }, { ask: 'squirrels' }, { waitFor: 'legs.pipe1', timeout: 40 }, idle(),
    ...go({ x: 6, z: 538 }, 6, 1.5), { call: 'squirrels' }, { wait: 3.6 }, { ask: 'squirrels' }, flag('legs.dug', 40), flag('part-legs.s2', 30), idle(),
    { call: 'horses' }, { wait: 3.8 }, { ask: 'horses' }, { waitEvent: 'haul', match: { item: 'pipe' }, timeout: 40 }, idle(),
    ...go({ x: -20, z: 537 }, 6, 1.5), { call: 'horses' }, { wait: 3.8 }, { ask: 'horses' }, flag('part-legs', 60), idle(120),
  ],
  'part-power': () => [
    // batch-3: land a few metres inland of the spot and walk to it (go()'s flyTo overshot over the Lake and came down on the far bank, where the water's edge
    // now stops a walk back; it used to splash-launch him)
    // (the wedding's opening scene puts Gus across the Bow Bridge channel: fly back over it, don't walk into it)
    { flyTo: { x: -21, z: 293 }, alt: 4, r: 4, timeout: 120 }, idle(), { flyTo: { x: -21, z: 293 }, alt: 4, r: 4, timeout: 120 }, { walkTo: { x: -24.5, z: 298.5 }, r: 0.6 }, flag('part-power.s1', 30), idle(),
    { walkTo: { x: -25.6, z: 296.6 }, r: 0.5 }, { peck: 'wedding-basket' }, flag('part-power.s2', 60), idle(),
    { walkTo: { x: -31.4, z: 300.6 }, r: 0.8 }, { call: 'geese' }, { wait: 3.8 }, { ask: 'geese' }, flag('battery.up', 90), flag('part-power', 90), idle(120),   // Fixes-2: the battery comes up in the stampede
  ],
  'den-rhoda': () => [
    ...talk('bigsal'), flag('den-rhoda.s1', 30), idle(),
    ...napAt('nest-north', 'afternoon'), idle(),
    { fight: 'rhoda', timeout: 300 }, flag('den-rhoda.s2', 60), idle(),
    ...napAt('nest-north', 'dusk'), idle(),
    // a hot slice: swarm the tourist eating on the CPW & 72nd bench, then fly it straight to Walter
    ...go({ x: -124, z: 259.2 }, 8, 1.5), { faceTo: { x: -125.5, z: 262 } }, { holdCoo: 0.8 }, { sfPick: 'slice', timeout: 30 },
    { flyTo: { x: 128.4, z: 316.4 }, alt: 14, r: 2, timeout: 120 }, { sfFollow: 'walter', d: 1.0, timeout: 20 }, { peck: 'taker:walter' }, flag('walter.doorOpen', 10), idle(),
    { walkTo: { x: 129.0, z: 315.0 }, r: 0.6 }, { call: 'raccoons' }, { wait: 4.0 }, { ask: 'raccoons' }, flag('den-rhoda.s3', 60), flag('den-rhoda', 60), idle(),
  ],
  'den-meermob.alt': () => {
    // the slices route: three slices from the tourist on the 110th & Lenox bench (a Coo swarm makes him drop it), one a phase
    const slice = () => [{ flyTo: { x: 49, z: 1062.6 }, alt: 8, r: 1.5, timeout: 200 }, { walkTo: { x: 49, z: 1063.2 }, r: 0.4 }, { faceTo: { x: 49, z: 1066 } }, { holdCoo: 0.8 }, { sfPick: 'slice', timeout: 30 },
      { flyTo: { x: -79, z: 1024.5 }, alt: 8, r: 2.5, timeout: 200 }, { sfTalk: 'bigsal', timeout: 40 }, idle()];
    return [
      ...talk('bigsal'), idle(),
      { sfFlyThrough: { x: FLYPAST.x, y: 5.0, z: FLYPAST.z }, from: { x: FLYPAST.x + 24, z: FLYPAST.z + 2 }, high: 5.4, timeout: 120 },
      flag('meer.flypast', 30), idle(), flag('den-meermob.s1', 20), idle(),
      ...slice(), ...napAt('nest-north', 'afternoon'), idle(), ...slice(), ...napAt('nest-north', 'dusk'), idle(), ...slice(),
      flag('den-meermob', 60), idle(),
    ];
  },
  'den-meermob': () => [
    ...talk('bigsal'), idle(),
    { sfFlyThrough: { x: FLYPAST.x, y: 5.0, z: FLYPAST.z }, from: { x: FLYPAST.x + 24, z: FLYPAST.z + 2 }, high: 5.4, timeout: 120 },
    flag('meer.flypast', 30), idle(), flag('den-meermob.s1', 20), idle(),
    { sfLandNear: { x: -79, z: 1022 }, r: 2.5, timeout: 120 }, { coo: { hold: false } }, flag('den-meermob', 60), idle(),
  ],
};
