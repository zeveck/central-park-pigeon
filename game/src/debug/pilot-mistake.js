// Autopilot goals for the mistake sweep (debug only; tools/mistake-sweep.mjs, src/debug/mistakes.js). Like every goal
// they only press inputs (out.held, out.stick); Gus is never moved. Kept in their own file so the goal scripts and
// pilot-ssf.js stay as they are. Several hand over to the existing goals (pilot-ssf, pilot-fights, pilot-drive) with
// their own sub-state, the way napNest does.
//
//   { msTalk: charId }              talk to a character; a walk that makes no headway for 1.5 s (the water's edge,
//                                   a fence, a rim) takes off and lands beside them (then right next to them, on the
//                                   water if they sit on it: Gus floats and their reach is wider there)
//   { msFight: name }               the fight goal (biscuit / vinnie / rhoda; strix = the stealth crossing), but it FAILS
//                                   as soon as a fight it saw running ends without the win (the stock goals wait out
//                                   their timeout, or fly circles for good), so the recovery driver can plan again
//   { msAssert: fn, why }           done if fn(G), else fail with `why` (flyRings returns true after a lost race)
//   { msUntil: fn, mash, every }    wait until fn(G); optionally tap an action every `every` frames (Flap in the stealth)
//   { msFlyOver: {x,z}, alt, r }    take off and fly to a point, `alt` m over the water / ground there; done over it
//   { msHover: {x,z}, alt, until }  stay airborne round a point until until(G)
//   { msWhile: goal, until: fn }    run another goal until fn(G) (the Zamboni's launch run, up to the ramp)
//   { msWedge: {x,z} | fn, secs, slow }  drive at a point (flat out, or stick `slow`) until stuck (speed < 0.1) for `secs`, or there
//   { msDrivePath: pts, fromNearest, r, speed }   drivePath, starting at the waypoint nearest the vehicle
//   { msWarm: true }                stand by this phase's halal griddle until the carried slice is hot again
//   { msWiggle: secs }              (the oracle) reverse and steer side to side; window.__msWiggle = metres moved
import { PILOT_EXT, wrap } from './pilot-ext.js';
import { SLICE } from '../world/layout.js';

const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const WIN = { biscuit: 'biscuit.fightWon', vinnie: 'vinnie.cartRigged', rhoda: 'rhoda.beaten', strix: 'den-strix' };

/** Hand a goal to the other handlers (never back to this one). */
function ext(P, g, s, out, dt) {
  for (const h of PILOT_EXT) { if (h._tag === 'mistake') continue; const r = h(P, g, s, out, dt); if (r !== undefined) return r; }
  throw new Error('no handler for ' + JSON.stringify(g).slice(0, 60));
}

/** The dry spot nearest a point, searching outwards (null if none within 30 m). */
function dryNear(G, x0, z0, from = 0.6) {
  for (let r = from; r < 30; r += 0.3) {
    let best = null;
    for (let a = 0; a < 6.283; a += 0.15) { const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (!G.collision.waterAt(x, z)) { const d = Math.hypot(x - G.gus.position.x, z - G.gus.position.z); if (!best || d < best.d) best = { x, z, d }; } }
    if (best) return best;
  }
  return null;
}

function handler(P, g, s, out, dt) {
  const G = P.G, gus = G.gus, p = gus.position;
  if (g.msTalk) {
    const c = G.chars.find(g.msTalk);
    if (!c) throw new Error('no character ' + g.msTalk);
    s.sub = s.sub || {};
    if (s.hop) {
      const r = ext(P, { landNear: s.hop, alt: 5, r: 0.9 }, s.hopS, out, dt);
      if (r) { s.hop = null; s.best = Infinity; s.stall = 0; }
      return false;
    }
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    const pressed = s.sub.pressed;
    if (!pressed && gus.mode === 'fly' && d > 3.2) {
      // in the air and not by them: come down beside them (ext's talk would dive wherever it is)
      const b = dryNear(G, c.x, c.z) || { x: c.x, z: c.z };
      s.hop = Math.hypot(b.x - c.x, b.z - c.z) < 4 ? b : { x: c.x + 0.8, z: c.z }; s.hopS = {}; s.hops = (s.hops || 0) + 1;
      return false;
    }
    if (!pressed) {
      if (d < (s.best ?? Infinity) - 0.05) { s.best = d; s.stall = 0; }
      else if ((s.stall = (s.stall || 0) + dt) > 1.5 && gus.mode !== 'fly' && !G.dialogue.open && G.interact.current?.t.id !== 'char:' + g.msTalk) {
        // no headway on foot: fly over. First beside them on dry ground, then right next to them (afloat if need be)
        s.hops = (s.hops || 0) + 1;
        const b = s.hops === 1 ? dryNear(G, c.x, c.z) : null;
        s.hop = b && Math.hypot(b.x - p.x, b.z - p.z) > 1.2 ? b : { x: c.x + (p.x - c.x) / Math.max(d, 0.01) * 0.9, z: c.z + (p.z - c.z) / Math.max(d, 0.01) * 0.9 };
        s.hopS = {}; s.stall = 0;
        if (s.hops > 6) throw new Error('msTalk: cannot reach ' + g.msTalk);
        return false;
      }
    }
    return ext(P, { talk: g.msTalk }, s.sub, out, dt);
  }
  if (g.msFight) {
    const name = g.msFight, F = G.fights.f;
    if (G.state.flags[WIN[name]]) return true;
    if (F && F.name === name) s.seen = true;
    else if (s.seen && !G.dialogue.open && !G.cutscene.running && !G.schemes.busy.size) throw new Error('fight lost: ' + name);
    s.t2 = (s.t2 || 0) + dt;
    if (!s.seen && s.t2 > (g.startWithin ?? 120)) throw new Error('fight never started: ' + name);
    s.sub = s.sub || {};
    return ext(P, name === 'strix' ? { stealthCross: true } : { fight: name }, s.sub, out, dt);
  }
  if (g.msAssert) {
    if (g.msAssert(G)) return true;
    throw new Error('assert: ' + (g.why || 'failed'));
  }
  if (g.msUntil) {
    s.n = (s.n || 0) + 1;
    if (g.mash && s.n % (g.every ?? 20) < (g.hold ?? 3)) out.held.add(g.mash);
    return !!g.msUntil(G);
  }
  if (g.msFlyOver || g.msHover) {
    const t = g.msFlyOver || g.msHover;
    const dist = Math.hypot(t.x - p.x, t.z - p.z);
    if (gus.mode !== 'fly') { s.k = (s.k || 0) + 1; if (s.k % 24 < 14) out.held.add('flap'); if (gus.floating || s.k > 30) P.stickToward(t.x, t.z, out, 0.4); return g.msHover && g.until ? !!g.until(G) : false; }
    const w = G.collision.waterAt(t.x, t.z);
    const base = Math.max(w ? w.level : -1e9, G.terrain.heightAt(p.x, p.z), G.terrain.heightAt(t.x, t.z));
    const want = base + (g.alt ?? 3);
    if (g.msHover && dist < 6) { const yw = gus.yaw + 1.1; P.stickToward(p.x + Math.sin(yw) * 5, p.z + Math.cos(yw) * 5, out, 0.8); }
    else P.stickToward(t.x, t.z, out, dist > 6 ? 1 : 0.6);
    if (p.y < want) out.held.add('flap'); else if (p.y > want + 3) out.held.add('dive');
    if (g.msHover) return g.until ? !!g.until(G) : false;
    return dist < (g.r ?? 2.5);
  }
  if (g.msWhile) {
    // another goal, until a condition (or until it finishes)
    s.sub = s.sub || {};
    if (g.until(G)) return true;
    return ext(P, g.msWhile, s.sub, out, dt);
  }
  if (g.msWedge) {
    const v = G.vehicles.driving;
    if (!v) return true;
    if (!s.tgt) s.tgt = typeof g.msWedge === 'function' ? g.msWedge(G) : g.msWedge;
    const t = s.tgt, dx = t.x - v.x, dz = t.z - v.z;
    out.stick.x = clamp(wrap(Math.atan2(dx, dz) - v.yaw) * 2.4);
    out.stick.y = g.slow ?? 1;
    // stuck = moved < 0.3 m over the last 2 s (round 2: against the rink boards the speed jitters ±0.3 with the stick held, so a
    // speed test never fired, the goal timed out and the mistake's exit never ran)
    s.hist = s.hist || []; s.hist.push({ t: s.t, x: v.x, z: v.z }); while (s.hist.length && s.hist[0].t < s.t - 2) s.hist.shift();
    const h0 = s.hist[0], moved = h0 ? Math.hypot(v.x - h0.x, v.z - h0.z) : Infinity;
    if (s.t > 2.5 && moved < 0.3) s.stuck = (s.stuck || 0) + dt; else s.stuck = 0;
    return s.stuck >= Math.max(0.5, (g.secs ?? 3) - 2) || Math.hypot(dx, dz) < 1.5;
  }
  if (g.msDrivePath) {
    if (!s.pts) {
      const v = G.vehicles.driving, pts = g.msDrivePath;
      let i0 = 0;
      if (g.fromNearest && v) {
        let bd = Infinity;
        pts.forEach((q, i) => { const d = Math.hypot(q.x - v.x, q.z - v.z); if (d < bd) { bd = d; i0 = i; } });
        // already at (or past) the nearest point: head for the next
        if (bd < (g.r ?? 1.2) * 1.5 && i0 < pts.length - 1) i0++;
      }
      s.pts = pts.slice(i0); s.sub = {};
    }
    return ext(P, { drivePath: s.pts, r: g.r, speed: g.speed, thenOut: g.thenOut }, s.sub, out, dt);
  }
  if (g.msWarm) {
    const gr = SLICE.griddle[G.state.phase], c = G.state.carried;
    if (!gr) throw new Error('msWarm: no griddle this phase');
    if (!c || !c.id.startsWith('slice')) throw new Error('msWarm: no slice carried');
    if (G.items.isHot(c) && c.born != null && G.state.time - c.born < 3) { out.stick.x = out.stick.y = 0; return true; }
    if (gus.mode === 'fly') { out.held.add('dive'); P.stickToward(gr.x, gr.z, out, 0.5); return false; }
    const d = P.stickToward(gr.x, gr.z, out, 0.5);
    if (d < 1.4) out.stick.x = out.stick.y = 0;
    return false;
  }
  if (g.msWiggle) {
    const v = G.vehicles.driving;
    if (!v) throw new Error('msWiggle: not driving');
    if (!s.o) { s.o = { x: v.x, z: v.z }; s.max = 0; }
    out.stick.y = -1; out.stick.x = Math.sin((s.t || 0) * 1.4) > 0 ? 1 : -1;
    s.max = Math.max(s.max, Math.hypot(v.x - s.o.x, v.z - s.o.z));
    window.__msWiggle = s.max;
    return (s.t || 0) > (g.msWiggle || 10);
  }
  return undefined;
}
handler._tag = 'mistake';
// (re-importing with a cache-busting query replaces the handler instead of adding a second one)
{ const i = PILOT_EXT.findIndex((h) => h._tag === 'mistake'); if (i >= 0) PILOT_EXT.splice(i, 1, handler); else PILOT_EXT.push(handler); }

export { dryNear };
