// Batch-3 (#1, #7, #17): the scripted grounding audit (debug only; nothing in the game imports it).
// Samples every walker's feet against the walkable surface for `secs` of game time, across the four phases, with Gus (and
// so the camera, which decides who is drawn and gets a height) moved round the park's water and hills:
//   named characters (G.chars), humans (agents and the scenery people), their leash dogs, and the crowd animals.
// Flags: `water` standing or walking on (or under) water that isn't theirs, `under` feet below the surface, `float` feet
// above it, `solid` inside a box or cylinder. Plus every bridge deck end's step to the terrain.
//   const m = await import('/src/debug/ground-audit.js'); await m.runGroundAudit(window.__sfG, window.__game)
// (sf-run.mjs serve: an `eval` job). Humans not drawn have no height (humans.js only grounds the drawn ones): for them only
// water and solids by position count.

import { LANDMARKS, TRANSVERSES, TRANSVERSE_RAMP, PARK } from '../world/layout.js';
import { findCrossings } from '../world/landmarks.js';

const SPOTS = [
  { id: 'pond', x: 56, z: 30 }, { id: 'lake', x: -24, z: 300 }, { id: 'turtle', x: 10, z: 424 }, { id: 'reservoir', x: -40, z: 575 },
  { id: 'meer', x: 60, z: 962 }, { id: 'pool', x: -64, z: 862 }, { id: 'conservatory', x: 75, z: 322 }, { id: 'gapstow', x: 60, z: 46 },
  { id: 'ramble', x: -18, z: 362 }, { id: 'great-lawn', x: -6, z: 489 }, { id: 'loch', x: -33, z: 925 }, { id: 'mall', x: -6, z: 120 },
  { id: 'dogs-east', x: 48, z: 368 }, { id: 'dogs-west', x: -84, z: 146 }, { id: 'dogs-lawn', x: -47, z: 489 }, { id: 'dog-hill', x: 66, z: 380 },
];
const smooth = (t) => t * t * (3 - 2 * t);

function ground(G, x, z, yRef) {
  const C = G.collision;
  const s = C.surface(x, z, yRef, { y: 0, kind: 'terrain', item: null });
  const w = C.waterAt(x, z);
  if (w && w.level > s.y) return { y: w.level, kind: 'water', level: w.level, water: w.id };
  return { y: s.y, kind: s.kind, level: w ? w.level : null, water: w ? w.id : null };
}
const r2 = (v) => Math.round(v * 100) / 100;

export function bridgeGaps(G) {
  const out = [];
  const H = G.terrain.heightAt, C = G.collision;
  const deck = (x, z) => C.surface(x, z, 400, { y: 0, kind: 'terrain', item: null });
  for (const L of LANDMARKS.filter((l) => l.kind === 'stone-bridge' || l.kind === 'bow-bridge')) {
    const c = Math.cos(L.yaw || 0), s = Math.sin(L.yaw || 0);
    const W = (lx, lz) => ({ x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c });
    const half = L.kind === 'stone-bridge' ? L.span / 2 + 1.5 : L.span / 2;
    for (const e of [-1, 1]) {
      const inn = W(0, e * (half - 0.3)), outp = W(0, e * (half + 0.4));
      const d = deck(inn.x, inn.z);
      out.push({ id: L.id, end: e < 0 ? 'A' : 'B', x: r2(inn.x), z: r2(inn.z), deck: r2(d.y), deckKind: d.kind, terrain: r2(H(outp.x, outp.z)), gap: r2(d.y - H(outp.x, outp.z)) });
    }
  }
  for (const cr of findCrossings(G.terrain.shapes)) {
    const t = cr.t;
    const bed = -t.depth * smooth(Math.min(1, Math.max(0, Math.min(cr.x - PARK.xMin, PARK.xMax - cr.x) / TRANSVERSE_RAMP)));
    const id = `${t.id}@x${Math.round(cr.x)}${cr.drive ? ' drive' : ''}`;
    if (-bed < 1.5) {
      // no bridge here: does a cut wall stand across the path?
      const walls = [-1, 1].map((sd) => { const wz = t.z + sd * (t.halfWidth + 0.35); const y = H(cr.x, wz + sd * 1.5); return C.solidAt(cr.x, y + 0.4, wz); });
      out.push({ id, end: 'none', x: r2(cr.x), z: r2(t.z), depth: r2(-bed), noBridge: true, wallAcross: walls.some(Boolean) });
      continue;
    }
    const half = t.halfWidth + 2.5;
    for (const e of [-1, 1]) {
      const zi = t.z + e * (half - 0.3), zo = t.z + e * (half + 0.4);
      const d = deck(cr.x, zi);
      out.push({ id, end: e < 0 ? 'S' : 'N', x: r2(cr.x), z: r2(zi), deck: r2(d.y), deckKind: d.kind, terrain: r2(H(cr.x, zo)), gap: r2(d.y - H(cr.x, zo)) });
    }
  }
  return out;
}

export async function runGroundAudit(G, api, { secs = 60, phases = ['morning', 'afternoon', 'dusk', 'night'] } = {}) {
  const C = G.collision;
  const bad = new Map();   // key → { who, kind, flags:Set, n, worst, at }
  const note = (key, who, flag, x, z, d) => {
    let b = bad.get(key);
    if (!b) bad.set(key, (b = { who, flags: {}, at: { x: r2(x), z: r2(z) } }));
    const f = b.flags[flag] || (b.flags[flag] = { n: 0, worst: 0, at: null });
    f.n++;
    if (Math.abs(d) >= Math.abs(f.worst)) { f.worst = r2(d); f.at = { x: r2(x), z: r2(z) }; }
  };
  const seen = { chars: new Set(), humans: new Set(), dogs: new Set(), crowd: new Set() };
  const per = Math.max(1, Math.round(secs / phases.length));
  let spotI = 0, samples = 0;
  for (const ph of phases) {
    api.dev.setPhase(ph);
    for (let s = 0; s < per; s++) {
      const sp = SPOTS[spotI++ % SPOTS.length];
      const gy = ground(G, sp.x, sp.z, 400);
      G.gus.place({ x: sp.x, z: sp.z, y: gy.y + 6, yaw: 0, mode: 'fly', speed: 0 });
      G.gus.vy = 0;
      for (let i = 0; i < 60; i++) { G.gus.place({ x: sp.x, z: sp.z, y: gy.y + 6, yaw: 0, mode: 'fly', speed: 0 }); G.update(G.DT); }
      G.syncCameras(); G.humans.pose(); G.crowds.draw();   // the leash dogs are placed in pose() (once per drawn frame)
      samples++;
      // named characters
      for (const c of G.chars.list) {
        if (!G.chars.out(c)) continue;
        seen.chars.add(c.id);
        const at = c.def.at || {};
        if (at.y || c.tween) continue;   // perched up high (Rhoda) or mid-entrance
        const key = 'char:' + c.id;
        const onW = at.on?.startsWith('water:');
        if (at.on === 'roof') { const s = C.surface(c.x, c.z, 400); if (Math.abs(c.y - s.y) > 0.15) note(key, c.id, c.y > s.y ? 'float' : 'under', c.x, c.z, c.y - s.y); continue; }
        const g = ground(G, c.x, c.z, c.y + 0.35);
        if (onW) { if (g.kind !== 'water') note(key, c.id, 'offWater', c.x, c.z, c.y - g.y); continue; }
        if (g.kind === 'water') note(key, c.id, 'water', c.x, c.z, c.y - g.level);
        const d = c.y - g.y;
        if (d > 0.15) note(key, c.id, 'float', c.x, c.z, d);
        if (d < -0.1) note(key, c.id, 'under', c.x, c.z, d);
        if (C.solidAt(c.x, c.y + 0.25, c.z) && c.y + 0.25 > G.terrain.heightAt(c.x, c.z)) note(key, c.id, 'solid', c.x, c.z, 0);
      }
      // humans and their dogs
      for (const [list, tag] of [[G.humans.agents, 'h'], [G.humans.extras, 'a']]) for (const a of list) {
        if (!a.out) continue;
        const who = `${tag}:${a.role}#${a.id}`;
        seen.humans.add(who);
        const g = ground(G, a.x, a.z, a.y != null ? a.y + 0.35 : 400);
        if (g.kind === 'water') note(who, who, 'water', a.x, a.z, a.y != null ? a.y - g.level : 0);
        if (a.y != null && a.clone && !a.seated) {   // (only the drawn have a fresh height)
          const d = a.y - g.y;
          if (d > 0.12) note(who, who, 'float', a.x, a.z, d);
          if (d < -0.1) note(who, who, 'under', a.x, a.z, d);
        }
        const fy = a.clone && a.y != null ? a.y : g.y;
        if (C.solidAt(a.x, fy + 0.5, a.z) && fy + 0.5 > G.terrain.heightAt(a.x, a.z)) note(who, who, 'solid', a.x, a.z, 0);
        if (a.dogs) a.dogs.forEach((d, j) => {
          if (!d.h.visible) return;
          const dw = `${who}/dog${j}`, p = d.h.position;
          seen.dogs.add(dw);
          const dg = ground(G, p.x, p.z, p.y + 0.35);
          const dd = p.y - dg.y;
          if (dg.kind === 'water') note(dw, dw, 'water', p.x, p.z, p.y - dg.level);
          if (dd > 0.08) note(dw, dw, 'float', p.x, p.z, dd);
          if (dd < -0.08) note(dw, dw, 'under', p.x, p.z, dd);
          if (C.solidAt(p.x, p.y + 0.2, p.z) && p.y + 0.2 > G.terrain.heightAt(p.x, p.z)) note(dw, dw, 'solid', p.x, p.z, 0);
        });
      }
      // crowd animals
      for (const a of G.crowds.animals) {
        if (a.state === 'away') continue;
        const who = `crowd:${a.group}#${a.i}`;
        seen.crowd.add(who);
        if (a.water || a.yOff > 0) continue;   // the swimmers (they stay inside their water) and the perched (the owl up a tree)
        if (a.kind === 'roof') { const s = C.surface(a.x, a.z, a.yBase + 0.3); const d = a.yBase - s.y; if (d > 0.15) note(who, who, 'float', a.x, a.z, d); continue; }
        const g = ground(G, a.x, a.z, a.yBase + 0.35);
        const d = a.yBase - g.y;
        if (g.kind === 'water') note(who, who, 'water', a.x, a.z, a.yBase - g.level);
        if (d > 0.12) note(who, who, 'float', a.x, a.z, d);
        if (d < -0.1) note(who, who, 'under', a.x, a.z, d);
        if (C.solidAt(a.x, a.yBase + 0.15, a.z) && a.yBase + 0.15 > G.terrain.heightAt(a.x, a.z)) note(who, who, 'solid', a.x, a.z, 0);
      }
    }
  }
  const rows = [...bad.values()];
  const byFlag = {};
  for (const r of rows) for (const f of Object.keys(r.flags)) {
    const grp = r.who.startsWith('char:') || !/[:#]/.test(r.who) ? 'chars' : r.who.startsWith('crowd:') ? 'crowd' : r.who.includes('/dog') ? 'dogs' : 'humans';
    byFlag[grp + '.' + f] = (byFlag[grp + '.' + f] || 0) + 1;
  }
  return {
    samples, gameSecs: samples, seen: { chars: seen.chars.size, humans: seen.humans.size, dogs: seen.dogs.size, crowd: seen.crowd.size },
    byFlag, offenders: rows.map((r) => ({ who: r.who, at: r.at, flags: r.flags })), bridges: bridgeGaps(G),
  };
}
