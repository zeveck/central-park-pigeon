// Autopilot goals for the milestone 3a mechanics (debug only): talents at clue
// spots, trades, collectibles, the race. Like every goal they only press inputs
// (out.held, out.stick); Gus is never moved directly, so a recorded run replays.
//
//   { holdCoo: seconds }                       hold Coo (a swarm, a photobomb, the 103rd St rope)
//   { flyTo3: {x, y, z}, r, land }              fly to a point in 3D (a roof, a ledge, a water tower) and land on it
//   { waitEvent: type, match: {k: v} }          wait for a bus event (e.g. 'talent' with { clue: 'ball-lake' })
//   { flyRings: true }                          fly the Reservoir race's rings in order until the race ends
//   { faceTo: {x, z} }                          turn on the spot (walk a step) toward a point
// Helpers (they return goal lists; the autopilot flattens them):
//   ask(crew, at)        go to `at`, Call the ally, wait for the arrival, Ask, wait for their talent
//   callAndAsk(crew)     the same, from where Gus stands

import { PILOT_EXT } from './pilot-ext.js';
import { RACE_RINGS } from '../world/layout.js';

const flat = (p) => Math.hypot(p.x, p.z);

PILOT_EXT.push((P, g, s, out, dt) => {
  const G = P.G, gus = G.gus, p = gus.position;
  if (g.holdCoo != null) {
    s.n = (s.n || 0) + 1;
    if (s.n <= Math.round(g.holdCoo * 60)) { out.held.add('coo'); return false; }
    return s.n > Math.round(g.holdCoo * 60) + 2;
  }
  if (g.waitEvent) {
    if (!s.off) { s.hit = false; s.off = G.bus.on(g.waitEvent, (t, e) => { if (!g.match || Object.entries(g.match).every(([k, v]) => e[k] === v)) s.hit = true; }); }
    if (s.hit) { s.off(); return true; }
    return false;
  }
  if (g.faceTo) {
    s.n = (s.n || 0) + 1;
    P.stickToward(g.faceTo.x, g.faceTo.z, out, 0.3);
    const want = Math.atan2(g.faceTo.x - p.x, g.faceTo.z - p.z);
    const d = Math.abs(Math.atan2(Math.sin(want - gus.yaw), Math.cos(want - gus.yaw)));
    if (d < 0.15 || s.n > 40) { out.stick.x = out.stick.y = 0; return true; }
    return false;
  }
  if (g.flyTo3) {
    const t = g.flyTo3, r = g.r ?? 0.7;
    const dx = t.x - p.x, dz = t.z - p.z, dist = Math.hypot(dx, dz);
    if (gus.grounded && dist < r && Math.abs(p.y - t.y) < 1.2) return true;
    if (gus.grounded) { s.k = (s.k || 0) + 1; if (s.k % 30 < 4) out.held.add('flap'); return false; }
    if (gus.mode !== 'fly') return false;
    // like landOn: cruise in a little above, then a slow, low final approach so the perch snap catches him
    // high and fast until close, then dive onto it (a roof or a ledge round the point catches him)
    if (dist > 3.5) { P.stickToward(t.x, t.z, out, 1); if (p.y < t.y + 2.5) out.held.add('flap'); }
    else { P.stickToward(t.x, t.z, out, 0.25); if (p.y > t.y + 0.1) out.held.add('dive'); else out.held.add('flap'); }
    return false;
  }
  if (g.flyRings) {
    const run = G.race.run;
    if (!run) return s.started ? true : false;
    s.started = true;
    if (run.t < 0) return false;
    if (gus.grounded) { s.k = (s.k || 0) + 1; if (s.k % 20 < 4) out.held.add('flap'); return false; }
    const ring = RACE_RINGS[Math.min(run.ring, RACE_RINGS.length - 1)];
    const nx = RACE_RINGS[Math.min(run.ring + 1, RACE_RINGS.length - 1)];
    const d = Math.hypot(ring.x - p.x, ring.z - p.z);
    // aim a little through the ring toward the next, so the turn is smooth
    const k = d < 12 ? 0.35 : 0;
    P.stickToward(ring.x + (nx.x - ring.x) * k * 0.1, ring.z + (nx.z - ring.z) * k * 0.1, out, 1);
    if (p.y < ring.y - 0.4) out.held.add('flap');
    else if (p.y > ring.y + 1.2) out.held.add('dive');
    return false;
  }
  return undefined;
});

/** Go to a spot, Call an ally, wait for the arrival, Ask, and wait for the talent to land. */
export function ask(crew, at, { fly = true, r = 0.5, clue = null } = {}) {
  const go = at ? (fly ? [{ flyTo: at, alt: 6, r: 3 }, { walkTo: at, r }] : [{ walkTo: at, r }]) : [];
  return [...go, { call: crew }, { wait: 3.6 }, { ask: crew }, clue ? { waitEvent: 'talent', match: { clue } } : { wait: 3 }];
}
export function callAndAsk(crew, clue = null) { return ask(crew, null, { clue }); }
export { flat };
