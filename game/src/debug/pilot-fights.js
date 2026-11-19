// Autopilot goals for the four fights (debug only). They press inputs only.
//   { fight: 'biscuit' }   carry the ball to the blanket, sidestepping each charge
//   { fight: 'vinnie' }    (after Asking the raccoons at the cart) kite Vinnie round his cart until it's rigged
//   { fight: 'rhoda' }     fly low tight circles over the Meer; when she skims, close in and Coo; three times
//   { stealthCross: true } walk the owl's route on foot: round the leaf piles, stopping when the meter climbs
import { PILOT_EXT, wrap } from './pilot-ext.js';
import { FIGHTS, RAMBLE_STEALTH } from '../world/layout.js';

function stealthRoute() {
  const R = RAMBLE_STEALTH, pts = [];
  for (let i = 1; i < R.path.length; i++) {
    const a = R.path[i - 1], b = R.path[i], l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(l / 0.8);
    for (let k = 0; k < n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n, nx: -(b.z - a.z) / l, nz: (b.x - a.x) / l });
  }
  const last = R.path[R.path.length - 1];
  pts.push({ x: last.x, z: last.z, nx: 0, nz: 0 });
  for (const p of pts) for (const lf of R.leaves) {
    const d = Math.hypot(p.x - lf.x, p.z - lf.z), clear = lf.r + 0.55;
    if (d < clear) { const side = ((p.x - lf.x) * p.nx + (p.z - lf.z) * p.nz) >= 0 ? 1 : -1; const push = clear - Math.abs((p.x - lf.x) * p.nx + (p.z - lf.z) * p.nz); p.x += p.nx * side * push; p.z += p.nz * side * push; }
  }
  pts.push({ x: R.branch.x, z: R.branch.z });
  return pts;
}

function tapCoo(s, out, key = 'cooN') {
  s[key] = (s[key] || 0) + 1;
  if (s[key] <= 3) out.held.add('coo');
  if (s[key] > 8) s[key] = 0;
}

PILOT_EXT.push((pilot, g, s, out) => {
  const G = pilot.G, gus = G.gus, p = gus.position, F = G.fights.f;
  if (g.fight === 'biscuit') {
    const B = FIGHTS.biscuit;
    if (!F) {
      if (G.state.flags['biscuit.fightWon']) return true;
      if (gus.mode === 'fly') out.held.add('dive');
      pilot.stickToward(B.blanket.x, B.blanket.z, out, 1);
      return false;
    }
    if (F.name !== 'biscuit') return false;
    if (G.dialogue.open) return false;
    const d = F.dog;
    if (F.state === 'wiggle' || F.state === 'charge') {
      // sidestep across his line, leaning toward the blanket
      const dx = p.x - d.x, dz = p.z - d.z, l = Math.hypot(dx, dz) || 1;
      if (!s.side || s.charge !== F.t0) { s.charge = F.t0; let nx0 = -dz / l, nz0 = dx / l; if (nx0 * (B.blanket.x - p.x) + nz0 * (B.blanket.z - p.z) < 0) { nx0 = -nx0; nz0 = -nz0; } s.side = { x: nx0, z: nz0 }; }
      const nx = s.side.x, nz = s.side.z;
      pilot.stickToward(p.x + nx * 4, p.z + nz * 4, out, 1);
    } else { s.side = null; pilot.stickToward(B.blanket.x, B.blanket.z, out, 1); }
    out.held.add('sprint');
    return false;
  }
  if (g.fight === 'vinnie') {
    if (!F) return !!G.state.flags['vinnie.cartRigged'];
    if (F.name !== 'vinnie' || G.dialogue.open) return false;
    if (gus.mode === 'fly') { out.held.add('dive'); return false; }
    const c = FIGHTS.vinnie.cart, v = F.vin, R = 6.5;
    const aG = Math.atan2(p.z - c.z, p.x - c.x), aV = Math.atan2(v.z - c.z, v.x - c.x);
    const dir = Math.sign(wrap(aG - aV)) || 1;
    const close = Math.hypot(p.x - v.x, p.z - v.z) < 3.2;
    const a = aG + dir * (close ? 0.9 : 0.35);
    pilot.stickToward(c.x + Math.cos(a) * R, c.z + Math.sin(a) * R, out, 1);
    if (close || F.state === 'windup') out.held.add('sprint');
    return false;
  }
  if (g.fight === 'rhoda') {
    const H = FIGHTS.rhoda;
    if (!F && G.state.flags['rhoda.beaten']) return true;
    if (G.dialogue.open) return false;
    const w = G.collision.waterAt(H.centre.x, H.centre.z);
    const wl = w ? w.level : -0.8;
    if (gus.grounded) { s.k = (s.k || 0) + 1; if (s.k % 30 < 4) out.held.add('flap'); return false; }
    const want = wl + 2.6;
    if (p.y < want) out.held.add('flap');
    else if (p.y > want + 4) out.held.add('dive');
    const dc = Math.hypot(p.x - H.centre.x, p.z - H.centre.z);
    if (F && F.name === 'rhoda' && F.state === 'skim') {
      const h = F.hawk;
      pilot.stickToward(h.x, h.z, out, 1);
      if (Math.hypot(p.x - h.x, p.z - h.z) < H.mobR - 0.4) tapCoo(s, out);
      return false;
    }
    if (dc > 14) { pilot.stickToward(H.centre.x, H.centre.z, out, 1); return false; }
    // a tight circle: steer ~70° off the current heading
    const yw = gus.yaw + 1.2;
    pilot.stickToward(p.x + Math.sin(yw) * 5, p.z + Math.cos(yw) * 5, out, 1);
    return false;
  }
  if (g.stealthCross) {
    if (!s.route) { s.route = stealthRoute(); s.i = 0; }
    if (!F) {
      if (G.state.flags['den-strix'] || G.state.flags['den-strix.s2']) return true;
      // walk onto the first island so the crossing starts
      const st = RAMBLE_STEALTH.islands[0];
      if (gus.mode === 'fly') { out.held.add('dive'); return false; }
      pilot.stickToward(st.x, st.z, out, 0.8);
      return false;
    }
    if (F.name !== 'strix' || G.dialogue.open) return false;
    if (gus.mode === 'fly') return false;
    // after a catch Gus is back on an island: rejoin the route at the nearest point ahead of it
    if (s.lastCatch !== F.catches) { s.lastCatch = F.catches; let bi = 0, bd = Infinity; s.route.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; bi = i; } }); s.i = bi; }
    if (s.wait || F.meter > 55) { s.wait = F.meter > 6; if (s.wait) return false; }
    while (s.i < s.route.length - 1 && Math.hypot(s.route[s.i].x - p.x, s.route[s.i].z - p.z) < 0.6) s.i++;
    const q = s.route[s.i];
    pilot.stickToward(q.x, q.z, out, 1);
    return false;
  }
  return undefined;
});

export default PILOT_EXT;
