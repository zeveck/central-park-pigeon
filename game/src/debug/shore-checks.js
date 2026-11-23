// fix-27: the water's edge everywhere, as state checks (debug only; nothing in the game imports it).
//   const m = await import('/src/debug/shore-checks.js'); m.runShoreChecks(window.__sfG)
// walk   from 6 m out on the bank, Gus walks straight at the water at 16 spots round every body: on foot he must never be
//        below the water's surface (the bug: a strip outside the old outline where the ground was under the drawn water
//        but counted as dry, so he walked on the lake bed, up to ~1.6 m under)
// moved  what the wider water now covers that the old outline didn't: named characters' homes, item sources, clues on
//        land, signs and places (each one is something to look at, not necessarily wrong)

import { pointInPoly, offsetClosed } from '../core/geo.js';
import { waterMargin } from '../world/water.js';
import { CHARACTERS } from '../data/crews.js';
import { ITEM_SOURCES } from '../data/item-sources.js';
import { CLUES, SIGNS, PLACES } from '../world/layout.js';

const ext = (G, n, auto = {}) => { G.input.setAuto(auto); for (let i = 0; i < n; i++) G.update(G.DT); };
const r2 = (v) => Math.round(v * 100) / 100;

export function runShoreChecks(G, { perBody = 16 } = {}) {
  const C = G.collision, T = G.terrain;
  const res = { walk: [], worst: null, moved: [] };
  for (const wb of G.terrain.shapes.water) {
    const n = wb.poly.length;
    const drawn = offsetClosed(wb.poly, waterMargin(wb));   // where the water is drawn (only there can he be 'under' it)
    for (let k = 0; k < perBody; k++) {
      const a = wb.poly[Math.floor((k / perBody) * n)], b = wb.poly[(Math.floor((k / perBody) * n) + 1) % n];
      // the outward normal of this edge (the outline's winding decides the side: test which side is inside)
      let nx = b.z - a.z, nz = -(b.x - a.x);
      const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      if (pointInPoly(mx + nx * 0.5, mz + nz * 0.5, wb.poly)) { nx = -nx; nz = -nz; }
      const sx = mx + nx * 6, sz = mz + nz * 6;
      if (C.waterAt(sx, sz) || C.standable(sx, sz, { r: 0.15, h: 0.3 }) == null || C.deckAt(sx, sz) !== -Infinity) continue;   // no bank to start from
      const yaw = Math.atan2(-nx, -nz);
      G.gus.place({ x: sx, z: sz, y: C.floorAt(sx, sz), yaw, mode: 'walk' });
      G.rig.yaw = yaw;
      ext(G, 2);
      let minDy = Infinity, floated = false;
      for (let i = 0; i < 200; i++) {
        ext(G, 1, { stick: { x: 0, y: 1 } });
        const g = G.gus.position;
        if (G.gus.floating) { floated = true; break; }
        if (G.gus.mode !== 'walk' || C.deckAt(g.x, g.z) !== -Infinity) continue;
        if (pointInPoly(g.x, g.z, drawn)) minDy = Math.min(minDy, g.y - wb.level);
      }
      ext(G, 1);
      const g = G.gus.position;
      const r = { body: wb.id, from: { x: r2(sx), z: r2(sz) }, stop: { x: r2(g.x), z: r2(g.z) }, minAbove: r2(minDy), floated, ok: !floated && minDy > -0.05 };
      res.walk.push(r);
      if (!res.worst || minDy < res.worst.minAbove) res.worst = r;
    }
  }
  res.walkFails = res.walk.filter((r) => !r.ok);
  // what the wider water now covers (the old test: inside the outline, any ground height)
  const oldWater = (x, z) => G.terrain.shapes.water.some((wb) => pointInPoly(x, z, wb.poly));
  const look = (what, id, x, z, onWater) => { if (x == null || z == null || onWater) return; const now = !!C.waterAt(x, z); if (now && !oldWater(x, z)) res.moved.push({ what, id, x: r2(x), z: r2(z), ground: r2(T.heightAt(x, z)), level: C.waterAt(x, z).level }); };
  for (const [id, c] of Object.entries(CHARACTERS)) look('character home', id, c.at?.x, c.at?.z, c.at?.on?.startsWith?.('water'));
  for (const c of G.chars?.list || []) look('character now', c.id, c.x, c.z, c.def?.at?.on?.startsWith?.('water'));
  for (const r of ITEM_SOURCES) look('item source', r.item + '@' + r.scheme, r.at.x, r.at.z, false);
  for (const c of CLUES) look('clue', c.id, c.x, c.z, c.on?.startsWith?.('water'));
  for (const s of SIGNS) look('sign', s.id, s.x, s.z, false);
  for (const [id, p] of Object.entries(PLACES)) look('place', id, p.x, p.z, false);
  for (const h of G.humans?.agents || []) look('human', h.id || h.role, h.x, h.z, false);
  return res;
}
