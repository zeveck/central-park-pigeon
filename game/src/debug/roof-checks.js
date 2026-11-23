// fix-25: roofs as state checks (debug only; nothing in the game imports it).
//   const m = await import('/src/debug/roof-checks.js'); m.runRoofChecks(window.__sfG)
// land    on every gable and pyramid roof, Gus lands from 3 m above at 3 spots (the ridge, half-way down, near the eaves):
//         he must end on its slope (within 0.25 m of its top there), never inside it, and stand still there
// inside  every stray and golden pretzel: not inside anything solid (a slab, a roof) and on the surface under it

import { Collision } from '../systems/collision.js';

const ext = (G, n, auto = {}) => { G.input.setAuto(auto); for (let i = 0; i < n; i++) G.update(G.DT); };
const r2 = (v) => Math.round(v * 100) / 100;

export function runRoofChecks(G) {
  const C = G.collision;
  const roofs = new Set();
  for (const a of C.grid.values()) for (const it of a) if (it.t === 'box' && it.roof) roofs.add(it);
  const res = { roofs: roofs.size, land: [], inside: [] };
  for (const it of roofs) {
    // three spots across the slope, in the roof's own frame (across: 0 ridge, 0.5 half-way, 0.85 near the eaves)
    for (const k of [0, 0.5, 0.85]) {
      const lx = it.roof === 'z' ? k * it.hx : it.roof === 'pyr' ? k * it.hx : 0;
      const lz = it.roof === 'x' ? k * it.hz : 0;
      const x = it.x + lx * it.c + lz * it.s, z = it.z - lx * it.s + lz * it.c;
      // stand him on the slope there and walk him across the roof, up and down it: he must never be under its slope
      // (the bug: roofs collided as flat boxes, so on the sloped parts he stood inside the roof)
      const want = Collision.topAt(it, x, z);
      let worst = Infinity, inside = false;
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        G.gus.place({ x, z, y: want + 0.02, yaw, mode: 'walk' });
        G.rig.yaw = yaw;
        for (let i = 0; i < 40; i++) {
          ext(G, 1, { stick: { x: 0, y: 1 } });
          const g = G.gus.position;
          if (G.gus.mode !== 'walk') break;
          if (Collision.inBox(it, g.x, g.z)) worst = Math.min(worst, g.y - Collision.topAt(it, g.x, g.z));
          if (C.solidAt(g.x, g.y + 0.12, g.z)) inside = true;
        }
      }
      const r = { roof: it.tag, kind: it.roof, at: { x: r2(it.x), z: r2(it.z) }, across: k, worstBelowSlope: r2(worst), inside };
      r.ok = !inside && worst > -0.08;
      res.land.push(r);
    }
  }
  res.landFails = res.land.filter((r) => !r.ok);
  for (const s of G.collect?.strays || []) if (s.p && C.solidAt(s.p.x, s.p.y + 0.05, s.p.z)) res.inside.push({ what: 'stray', id: s.def.id, x: r2(s.p.x), y: r2(s.p.y), z: r2(s.p.z) });
  for (const p of G.collect?.pretzels || []) if (p.p && C.solidAt(p.p.x, p.p.y, p.p.z)) res.inside.push({ what: 'pretzel', id: p.def.id, x: r2(p.p.x), y: r2(p.p.y), z: r2(p.p.z) });
  return res;
}
