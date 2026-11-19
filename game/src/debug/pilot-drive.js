// Autopilot goals for driving (debug only). Real inputs only: the stick (x
// steers, y is gas / brake-then-reverse), Peck to get in and out, F for the
// horn / Dump (tap) / Spray (hold). Goals:
//   { enter: vehicleId }                  walk to it (or the RC tug's shore spot) and Peck
//   { exit: true }                        Peck out
//   { drive: { to: {x,z}, r, speed, stop } }   steer there (stop: brake to a halt, default true)
//   { drivePath: [{x,z}…], r, speed }     through the points, stopping at the last
//   { dump: true } · { spray: true, secs, until: 'ramp' | 'slush' }
//   { zamboniLaunch: true }               the Rink Job's run: fill the hopper with laps, dump in the
//                                         launch lane, spray it to a ramp (Night), back off and run up north
//   { zamboniHop: { x, z } }              (a test) dump + freeze a ramp somewhere else and hit it
import { PILOT_EXT, wrap } from './pilot-ext.js';
import { RINK } from '../world/layout.js';

const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

/** Steer the current vehicle toward (tx, tz). Returns the distance. */
function steer(G, out, tx, tz, { speed = null, r = 1, stop = true } = {}) {
  const v = G.vehicles.driving;
  const dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
  const diff = wrap(Math.atan2(dx, dz) - v.yaw);
  out.stick.x = clamp(diff * 2.4);
  let tgt = speed ?? v.def.top;
  if (stop) tgt = Math.min(tgt, Math.sqrt(Math.max(0, 2 * 1.0 * (d - r * 0.4))));
  tgt *= Math.max(0.35, Math.cos(Math.min(Math.PI / 2, Math.abs(diff))));
  if (v.speed > tgt + 0.25 && v.speed > 0.1) out.stick.y = -1;
  else if (v.speed < tgt - 0.05) out.stick.y = 1;
  // stuck nose-first against the boards (or a wall)? back off, steering the other way, then try again
  const st = steer.mem || (steer.mem = { stuck: 0, rev: 0 });
  if (st.rev > 0) { st.rev -= G.DT; out.stick.y = -1; out.stick.x = -Math.sign(diff || 1); return d; }
  if (out.stick.y > 0 && Math.abs(v.speed) < 0.25 && d > r) st.stuck += G.DT; else st.stuck = Math.max(0, st.stuck - G.DT);
  if (st.stuck > 1.2) { st.stuck = 0; st.rev = 1.6; }
  return d;
}

const rinkLoop = () => {
  const I = RINK.ice, m = 5;
  return [{ x: I.x0 + m, z: I.z0 + m }, { x: I.x1 - m, z: I.z0 + m }, { x: I.x1 - m, z: I.z1 - m - 2 }, { x: I.x0 + m, z: I.z1 - m - 2 }];
};

PILOT_EXT.push((P, g, s, out) => {
  const G = P.G;
  const V = G.vehicles;
  if (g.enter) {
    if (V.driving?.id === g.enter) return true;
    const T = G.interact.get('vehicle:' + g.enter);
    if (!T) throw new Error('no vehicle ' + g.enter);
    if (G.gus.mode === 'fly') { out.held.add('dive'); return false; }
    if (s.pressed) { s.pressed++; if (s.pressed <= 3) out.held.add('peck'); if (s.pressed > 8) s.pressed = 0; return false; }
    if (G.interact.current?.t.id === T.id) { s.pressed = 1; out.held.add('peck'); return false; }
    const d = P.stickToward(T.x, T.z, out, 1);
    if (d > 3) out.held.add('sprint');
    if (d < 0.4) out.stick.x = out.stick.y = 0;
    return false;
  }
  if (g.exit) {
    if (!V.driving) return true;
    s.n = (s.n || 0) + 1;
    if (s.n % 8 < 3) out.held.add('peck');
    return false;
  }
  if (g.drive || g.drivePath) {
    if (!V.driving && g.thenOut && s.i != null) return true;   // fun pass: a scene got him out (the Racers' feast after the pedicab win)
    if (!V.driving) throw new Error('not driving');
    const pts = g.drivePath || [g.drive.to];
    const o = g.drive || g;
    s.i = s.i || 0;
    const last = s.i === pts.length - 1;
    const p = pts[s.i];
    const r = o.r ?? 1.2;
    const stop = last && (o.stop ?? true);
    const d = steer(G, out, p.x, p.z, { speed: o.speed ?? null, r, stop });
    if (d < r) {
      if (!last) { s.i++; return false; }
      if (!stop || Math.abs(V.driving.speed) < 0.3) { out.stick.x = out.stick.y = 0; return true; }
    }
    return false;
  }
  if (g.dump) {
    s.n = (s.n || 0) + 1;
    if (s.n <= 3) out.held.add('coo');
    return s.n > 6;
  }
  if (g.spray) {
    s.n = (s.n || 0) + 1;
    const ramps = V.debug().ramps;
    const doneUntil = g.until && ramps.some((q) => q.state === g.until);
    if (!doneUntil && s.n <= (g.secs ?? 4) * 60) { out.held.add('coo'); return false; }
    return true;
  }
  if (g.zamboniLaunch || g.zamboniHop) {
    const v = V.driving;
    if (!v || v.id !== 'zamboni') { if (G.state.flags['rink.launched'] && g.zamboniLaunch) return true; throw new Error('not on the Zamboni'); }
    const lane = RINK.lane;
    const tx = g.zamboniHop ? g.zamboniHop.x : (lane.x0 + lane.x1) / 2;
    const tz = g.zamboniHop ? g.zamboniHop.z : lane.z1 - 5.2;   // where the Zamboni stops to dump into the lane
    s.ph = s.ph || 'fill';
    if (s.ph === 'fill') {
      if (v.hopper >= 1) { s.ph = 'toDump'; s.i = 0; return false; }
      if (!V.onIce(v.x, v.z)) {
        // out through the garage apron and the south gate first
        const gx = RINK.x, gz = RINK.ice.z0;
        const p = v.z < gz - 1.5 && Math.abs(v.x - gx) > 0.8 ? { x: gx, z: Math.max(v.z + 1, gz - 2.5) } : { x: gx, z: gz + 3.5 };
        steer(G, out, p.x, p.z, { stop: false, speed: 1.5 });
        return false;
      }
      const loop = rinkLoop();
      s.w = s.w ?? 0;
      const p = loop[s.w % loop.length];
      if (steer(G, out, p.x, p.z, { stop: false }) < 3) s.w++;
      return false;
    }
    if (s.ph === 'toDump') {
      const z0 = RINK.ice.z0 + 3.5;
      const pts = [{ x: tx, z: Math.max(z0, tz - 9) }, { x: tx, z: Math.max(z0, tz - 4) }, { x: tx, z: tz }];
      const p = pts[s.i];
      const last = s.i === pts.length - 1;
      const d = steer(G, out, p.x, p.z, { r: last ? 0.5 : 1.5, stop: last, speed: last ? 1.5 : 2.5 });
      if (d < (last ? 0.6 : 1.5)) { if (!last) s.i++; else if (Math.abs(v.speed) < 0.15) { s.ph = 'dump'; s.n = 0; } }
      return false;
    }
    if (s.ph === 'dump') { s.n++; if (s.n <= 3) out.held.add('coo'); if (s.n > 8) { s.ph = 'spray'; s.n = 0; } return false; }
    if (s.ph === 'spray') {
      s.n++;
      const r = V.debug().ramps.find((q) => q.state === 'ramp' && Math.hypot(q.x - v.x, q.z - v.z) < 6);
      if (r || s.n > 60 * 6) { s.ph = 'back'; return false; }
      out.held.add('coo');
      return false;
    }
    if (s.ph === 'back') {
      // straight back, square to north, lined up behind the ramp (reversing steers the other way)
      const ramp = V.piles.find((q) => q.state === 'ramp' || q.state === 'slush' || q.state === 'snow');
      const wantYaw = ramp ? Math.atan2(ramp.x - v.x, ramp.z - v.z) * 0.6 : 0;
      out.stick.x = clamp(wrap(wantYaw - v.yaw) * -1.5);
      out.stick.y = -1;
      if (v.z < (g.zamboniHop ? Math.max(tz - 12, RINK.ice.z0 + 3.5) : RINK.ice.z0 + 4)) s.ph = 'halt';
      return false;
    }
    if (s.ph === 'halt') { out.stick.y = 1; if (v.speed > -0.05) s.ph = 'run'; return false; }
    if (s.ph === 'run') {
      if (v.hop) { s.ph = 'air'; return false; }
      s.r = (s.r || 0) + 1;
      if (s.r > 60 * 12) return true;   // nothing launched (slush, or too slow): give up
      // aim at the ramp itself (the dump lands a little off-line if the Zamboni wasn't square)
      const ramp = V.piles.filter((q) => q.state === 'ramp').sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z))[0];
      steer(G, out, ramp ? ramp.x : tx, ramp ? ramp.z + 1 : tz + 4, { stop: false });
      out.stick.y = 1;
      return false;
    }
    if (s.ph === 'air') return !v.hop || !V.driving;
  }
  return undefined;
});

export default PILOT_EXT;
