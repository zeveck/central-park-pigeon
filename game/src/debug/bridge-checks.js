// Batch-3 (#17): bridge and ramp checks (debug only; nothing in the game imports it).
//   const m = await import('/src/debug/bridge-checks.js'); await m.runBridgeChecks(window.__sfG, window.__game)
// 1. every deck end's step to the ground (ground-audit.js bridgeGaps)
// 2. a walk across every bridge, both ways: Gus on foot (stick held along the deck) and a person (humans.goTo, the same step
//    rules a walker uses), each from 4 m before one end to 4 m past the other
// 3. no ground lowered by the approaches inside a FLAT or round a landmark; Belvedere Castle's footing
// 4. what a scheme needs near the changed ground (nests, clues, places, signs, named characters): the ground there before and
//    after, and whether it is still standable

import { LANDMARKS, FLATS, NESTS, CLUES, PLACES, SIGNS, WORLD } from '../world/layout.js';
import { bridgeGaps } from './ground-audit.js';

const r2 = (v) => Math.round(v * 100) / 100;

function crossings(G) {
  const out = [];
  for (const d of G.terrain.decks) {
    const [a, b] = d.ends;
    out.push({ id: d.key, a, b, top: d.top });
  }
  for (const L of LANDMARKS.filter((l) => l.kind === 'bow-bridge')) {
    const c = Math.cos(L.yaw || 0), s = Math.sin(L.yaw || 0);
    const W = (lz) => ({ x: L.x + lz * s, z: L.z + lz * c });
    out.push({ id: L.id, a: { ...W(-L.span / 2), dx: -s, dz: -c }, b: { ...W(L.span / 2), dx: s, dz: c } });
  }
  return out;
}

export function gusWalk(G, from, to) {
  const C = G.collision, gus = G.gus;
  const yaw = Math.atan2(to.x - from.x, to.z - from.z), len = Math.hypot(to.x - from.x, to.z - from.z);
  gus.place({ x: from.x, z: from.z, y: C.floorAt(from.x, from.z), yaw, mode: 'walk' });
  G.rig.setFree?.(null);
  let flew = false, best = Infinity;
  const frames = Math.ceil((len / 2.0) * 60 * 1.6) + 60;
  for (let i = 0; i < frames; i++) {
    G.rig.yaw = yaw;
    G.input.setAuto({ held: ['sprint'], stick: { x: 0, y: 1 } });
    G.update(G.DT);
    if (gus.mode !== 'walk' && gus.mode !== 'perch') flew = true;
    best = Math.min(best, Math.hypot(gus.position.x - to.x, gus.position.z - to.z));
    if (best < 1) break;
  }
  G.input.setAuto({});
  const p = gus.position;
  return { ok: best < 1.5 && !flew, left: r2(best), flew, at: [r2(p.x), r2(p.y), r2(p.z)] };
}

export function personWalk(G, from, to) {
  const H = G.humans;
  const ag = H.addAgent({ role: 'b3c-walk-check', at: { x: from.x, z: from.z, yaw: 0 }, act: 'stand' });
  let done = false;
  H.goTo(ag, { x: to.x, z: to.z }, 1.25, () => { done = true; });
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  for (let i = 0; i < Math.ceil((len / 1.25) * 60 * 1.5) + 120 && !done; i++) G.update(G.DT);
  const left = Math.hypot(ag.x - to.x, ag.z - to.z);
  H.removeAgent(ag);
  return { ok: done && left < 0.5, left: r2(left), done };
}

export async function runBridgeChecks(G, api) {
  const out = {};
  // 1. deck ends
  const gaps = bridgeGaps(G).filter((b) => !b.noBridge);
  out.gaps = { max: r2(Math.max(...gaps.map((b) => Math.abs(b.gap)))), over: gaps.filter((b) => Math.abs(b.gap) > 0.3) };
  // 2. walks
  out.walks = [];
  for (const c of crossings(G)) {
    // a spot to stand 1.5–6 m out along the axis from each end (not water, not inside the castle wall the 79th St bridge
    // leads to): the walk's start and goal
    const spot = (e) => { for (let d = 1; d <= 6; d += 0.5) { const x = e.x + e.dx * d, z = e.z + e.dz * d; if (G.collision.standable(x, z, { r: 0.2, h: 1.5 }) != null && G.collision.walkBlocked(x, z) !== 1) return { x, z, d }; } return null; };
    const A = spot(c.a), B = spot(c.b);
    if (!A || !B) { out.walks.push({ id: c.id, skipped: `no standable ground beyond ${!A ? 'end A' : 'end B'} (within 6 m)` }); continue; }
    out.walks.push({ id: c.id, from: [r2(A.x), r2(A.z)], to: [r2(B.x), r2(B.z)], gusAB: gusWalk(G, A, B), gusBA: gusWalk(G, B, A), personAB: personWalk(G, A, B), personBA: personWalk(G, B, A) });
  }
  // 3. no lowering inside FLATS / round landmarks; Belvedere's footing
  const T = G.terrain, { NX, STEP } = T.grid, E = T.rampEdits || [];
  const cell = (k) => ({ x: WORLD.xMin + (k % NX) * STEP, z: WORLD.zMin + Math.floor(k / NX) * STEP });
  const inFlat = (x, z) => FLATS.some((f) => f.rect ? x > f.rect.x0 - f.edge && x < f.rect.x1 + f.edge && z > f.rect.z0 - f.edge && z < f.rect.z1 + f.edge : Math.hypot(x - f.circle.x, z - f.circle.z) < f.circle.r + f.edge);
  const nearLandmark = (x, z) => LANDMARKS.some((L) => !/bridge/.test(L.kind) && Math.hypot(x - L.x, z - L.z) < 12);
  const changed = [];
  let lowered = 0;
  for (let i = 0; i < E.length; i += 3) {
    const k = E[i], before = E[i + 1], after = E[i + 2], p = cell(k);
    changed.push({ ...p, before, after });
    if (after < before - 0.01 && (inFlat(p.x, p.z) || nearLandmark(p.x, p.z))) lowered++;
  }
  const court = FLATS.find((f) => f.id === 'belvedere-court');
  const foot = [];
  if (court) for (let x = court.rect.x0; x <= court.rect.x1; x += 3) for (let z = court.rect.z0; z <= court.rect.z1; z += 3) {
    const g = T.heightAt(x, z), edit = changed.find((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.z - z) <= 1);
    foot.push({ x, z, ground: r2(g), changed: edit ? r2(edit.after - edit.before) : 0 });
  }
  out.flats = { changedCells: changed.length, loweredInsideFlatOrLandmark: lowered, belvedereCourtChangedCells: foot.filter((f) => f.changed).length, belvedereMinGround: r2(Math.min(...foot.filter((f) => f.ground > 5).map((f) => f.ground))) };
  // 4. what schemes need near the changed ground
  const things = [
    ...NESTS.map((n) => ({ kind: 'nest', id: n.id, x: n.x, z: n.z })),
    ...CLUES.filter((c) => c.x != null).map((c) => ({ kind: 'clue', id: c.id, x: c.x, z: c.z })),
    ...Object.entries(PLACES).map(([id, p]) => ({ kind: 'place', id, x: p.x, z: p.z })),
    ...SIGNS.map((s) => ({ kind: 'sign', id: s.id, x: s.x, z: s.z })),
    ...G.chars.list.map((c) => ({ kind: 'char', id: c.id, x: c.home.x, z: c.home.z, y: c.home.y })),
  ];
  const C = G.collision;
  out.near = things.flatMap((t) => {
    const near = changed.filter((c) => Math.abs(c.after - c.before) > 0.3 && Math.hypot(c.x - t.x, c.z - t.z) < 4);
    if (!near.length) return [];
    const g = C.floorAt(t.x, t.z);
    return [{ ...t, rise: r2(Math.max(...near.map((c) => c.after - c.before))), drop: r2(Math.min(...near.map((c) => c.after - c.before))), ground: r2(g), standable: C.standable(t.x, t.z, { r: 0.15, h: 0.3 }) != null, charOnGround: t.y != null ? Math.abs(t.y - C.groundFor(t.x, t.z, t.y + 0.35).y) < 0.2 : undefined }];
  });
  out.trees = { removedFromWalkways: G.treesOffWalkways ?? null, total: G.trees?.trees?.length ?? null };
  out.ok = !out.gaps.over.length && out.walks.every((w) => w.skipped || (w.gusAB.ok && w.gusBA.ok && w.personAB.ok && w.personBA.ok)) && lowered === 0;
  return out;
}
