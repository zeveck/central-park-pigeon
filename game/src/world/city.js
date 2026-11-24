// The city ring: one block on every side of the park (Central Park South,
// Fifth Avenue, Central Park West and 110th Street). Avenues are asphalt
// (painted into the terrain) with raised paver sidewalks and kerbs. Buildings
// are boxes with the facade tiles at 14 m per tile (4 floors × 4 bays),
// storefront ground floors at the slice joints and bodegas, cornices,
// setbacks, water towers and fire escapes; the six hero buildings are
// hand-built shapes. Every roof rim and cornice ledge is a perch.

import * as THREE from 'three';
import { PARK, AVENUE, BLOCK_DEPTH, CITY, TRANSVERSES, STEAM_STACKS, Z, X } from './layout.js';
import { rngFor } from '../core/rng.js';
import { rimPerches, archSlab } from './landmarks.js';
import { boxGeometry } from '../gfx/batch.js';   // Fixes-3 (R4)

const FLOOR = 3.5;
const SIDEWALK = 4, KERB = 0.15;
const zN = PARK.zMax;
const FACE = { east: PARK.xMax + AVENUE, west: PARK.xMin - AVENUE, south: -AVENUE, north: zN + AVENUE };
const STYLE_MAT = { brick: 'facadeBrick', limestone: 'facadeLimestone', glass: 'facadeGlass', deco: 'facadeDeco' };

/** Side frame: (along, depth-from-face) → world; `out` is the yaw facing the park. */
const FRAME = {
  east: { at: (a, t) => ({ x: FACE.east + t, z: a }), out: -Math.PI / 2, alongZ: true },
  west: { at: (a, t) => ({ x: FACE.west - t, z: a }), out: Math.PI / 2, alongZ: true },
  south: { at: (a, t) => ({ x: a, z: FACE.south - t }), out: 0, alongZ: false },
  north: { at: (a, t) => ({ x: a, z: FACE.north + t }), out: Math.PI, alongZ: false },
};

function sizeFor(side, frontage, depth) {
  return FRAME[side].alongZ ? { w: depth, d: frontage } : { w: frontage, d: depth };
}

// ------------------------------------------------------------------ blocks and side streets
/** Side streets meeting each side of the park: { side: [along positions] } with their half widths. */
export function sideStreets() {
  const out = {};
  for (const side of ['south', 'east', 'west', 'north']) out[side] = { at: blocksFor(side).streets, half: side === 'east' || side === 'west' ? 4 : 6 };
  return out;
}

function blocksFor(side) {
  const heroes = CITY.heroes.filter((h) => h.side === side);
  const cons = CITY.construction.side === side ? [CITY.construction] : [];
  if (side === 'east' || side === 'west') {
    let streets = [];
    for (let st = 61; st <= 109; st += 2) streets.push(Z(st));
    for (const t of TRANSVERSES) { streets = streets.filter((z) => Math.abs(z - t.z) > 14); streets.push(t.z); }
    streets = streets.filter((z) => !heroes.some((h) => z > h.z0 - 4 && z < h.z1 + 4) && !cons.some((h) => z > h.z0 - 4 && z < h.z1 + 4));
    streets.sort((a, b) => a - b);
    const gaps = streets.map((z) => [z - 4, z + 4]);
    return { spans: spansBetween(-AVENUE - BLOCK_DEPTH, zN + AVENUE + BLOCK_DEPTH, gaps, [[-AVENUE, 0], [zN, zN + AVENUE]]), streets };
  }
  const xs = CITY.crossAvenuesX;
  const gaps = xs.map((x) => [x - 6, x + 6]);
  return { spans: spansBetween(-180, 180, gaps, [[PARK.xMin - AVENUE, PARK.xMin], [PARK.xMax, PARK.xMax + AVENUE]]), streets: xs };
}

function spansBetween(a0, a1, gaps, avenueGaps) {
  const cuts = [...gaps, ...avenueGaps].sort((p, q) => p[0] - q[0]);
  const out = [];
  let s = a0;
  for (const [g0, g1] of cuts) { if (g0 > s + 1) out.push([s, Math.min(g0, a1)]); s = Math.max(s, g1); }
  if (s < a1 - 1) out.push([s, a1]);
  return out;
}

// ------------------------------------------------------------------ build
export function buildCity(ctx) {
  const rnd = rngFor('city');
  const masses = [];       // for the far layer: {x, z, w, d, h, style}
  const towers = [];       // water towers (for summits)
  const stacks = [];       // steam stacks (for fx)
  ctx.cityStreets = {};

  for (const side of ['south', 'east', 'west', 'north']) {
    const spec = CITY.sides[side];
    const { spans, streets } = blocksFor(side);
    ctx.cityStreets[side] = streets;
    const F = FRAME[side];
    for (const [a0, a1] of spans) {
      // corner blocks on the E/W sides belong to the S/N sides' rows
      if ((side === 'east' || side === 'west') && (a1 <= -AVENUE + 0.5 || a0 >= zN + AVENUE - 0.5)) continue;
      // lots of whole bays (3.5 m) along the frontage
      let a = a0;
      while (a < a1 - 3) {
        let w = Math.round((14 + rnd() * 18) / FLOOR) * FLOOR;
        if (a1 - (a + w) < 10) w = a1 - a;
        const mid = a + w / 2;
        if (heroAt(side, mid) || consAt(side, mid) || plazaAt(side, mid)) { a += w; continue; }
        const [h0, h1] = spec.heights;
        const h = Math.max(4, Math.round((h0 + rnd() * (h1 - h0)) / FLOOR) * FLOOR);
        const style = spec.styles[Math.floor(rnd() * spec.styles.length)];
        const depth = side === 'north' ? 18 + Math.floor(rnd() * 3) * 4 : BLOCK_DEPTH - (rnd() < 0.3 ? 8 : 0);
        building(ctx, { side, a0: a, a1: a + w, depth, h, style, rnd, masses, towers });
        a += w;
      }
    }
    sidewalks(ctx, side, spans);
  }
  for (const H of CITY.heroes) HERO[H.id](ctx, H, masses);
  construction(ctx, CITY.construction, masses);
  for (const sf of CITY.storefronts) storefront(ctx, sf);
  for (const s of STEAM_STACKS) stacks.push(steamStack(ctx, s));
  grandArmyPlaza(ctx);
  // summits: the tallest roof on Central Park South, and the third water tower on 110th
  const south = masses.filter((m) => m.side === 'south' && !m.hero).sort((p, q) => q.h - p.h)[0];
  if (south) {
    ctx.summits['tallest:south'] = { x: south.x, y: south.h, z: south.z };
    ctx.collision.addPerch({ x: south.x, y: south.h, z: south.z, r: 3, id: 'summit-cps', kind: 'summit' });
  }
  const nt = towers.filter((t) => t.side === 'north');
  if (nt[2]) ctx.summits['water-tower:north-3'] = nt[2];
  return { masses, towers, stacks };
}

const inRange = (v, a, b) => v > a && v < b;
function heroAt(side, a) { return CITY.heroes.some((h) => h.side === side && (side === 'east' || side === 'west' ? inRange(a, h.z0 - 1, h.z1 + 1) : inRange(a, h.x0 - 1, h.x1 + 1))); }
function consAt(side, a) { const c = CITY.construction; return c.side === side && inRange(a, c.z0 - 1, c.z1 + 1); }
function plazaAt(side, a) { const p = CITY.plaza; return side === 'south' && inRange(a, p.x0 - 1, p.x1 + 1); }

function building(ctx, { side, a0, a1, depth, h, style, rnd, masses, towers }) {
  const F = FRAME[side];
  const w = a1 - a0;
  const c = F.at((a0 + a1) / 2, depth / 2);
  const sz = sizeFor(side, w, depth);
  const mat = STYLE_MAT[style];
  const setback = h > 45 && rnd() < 0.8;
  const h1 = setback ? Math.round((h * (0.55 + rnd() * 0.2)) / FLOOR) * FLOOR : h;
  ctx.batch.box(mat, { x: c.x, y: 0, z: c.z }, { w: sz.w, h: h1, d: sz.d });
  ctx.collision.addBox({ x: c.x, z: c.z, y0: 0, h: h1, w: sz.w, d: sz.d, tag: 'building' });
  cornice(ctx, c, sz, h1, style);
  rimPerches(ctx, { x: c.x, z: c.z, y: h1 + 0.5, w: sz.w + 0.5, d: sz.d + 0.5, tag: 'roof', inset: 0.05 });
  masses.push({ x: c.x, z: c.z, w: sz.w, d: sz.d, h: h1, style, side });
  // a ledge over the ground floor on the street face (a perch)
  const lp = F.at((a0 + a1) / 2, -0.25);
  const lsz = sizeFor(side, w - 0.4, 0.5);
  ctx.batch.box('cream', { x: lp.x, y: FLOOR * 1 - 0.1, z: lp.z }, { w: lsz.w, h: 0.22, d: lsz.d });
  const ledgeY = FLOOR + 0.12;
  const e0 = F.at(a0 + 0.4, -0.3), e1 = F.at(a1 - 0.4, -0.3);
  ctx.collision.addPerchEdge({ a: { x: e0.x, y: ledgeY, z: e0.z }, b: { x: e1.x, y: ledgeY, z: e1.z }, id: `ledge-${side}-${Math.round(a0)}`, kind: 'ledge', out: F.out });
  ctx.collision.addBox({ x: lp.x, z: lp.z, y0: FLOOR - 0.1, h: 0.22, w: lsz.w, d: lsz.d, tag: 'ledge' });
  let top = h1, topC = c, topSz = sz;
  if (setback) {
    const inset = 4;
    const uc = F.at((a0 + a1) / 2, inset + (depth - inset - 2) / 2);
    const usz = sizeFor(side, w - 4, depth - inset - 2);
    ctx.batch.box(mat, { x: uc.x, y: h1, z: uc.z }, { w: usz.w, h: h - h1, d: usz.d }, { v0: h1 });
    ctx.collision.addBox({ x: uc.x, z: uc.z, y0: h1, h: h - h1, w: usz.w, d: usz.d, tag: 'building' });
    cornice(ctx, uc, usz, h, style);
    rimPerches(ctx, { x: uc.x, z: uc.z, y: h + 0.5, w: usz.w + 0.5, d: usz.d + 0.5, tag: 'roof', inset: 0.05 });
    masses.push({ x: uc.x, z: uc.z, w: usz.w, d: usz.d, h, style, side, upper: true });
    top = h; topC = uc; topSz = usz;
  }
  // roof furniture: water towers (most on brick and the 110th brownstones), bulkheads
  if (style === 'brick' || side === 'north' ? rnd() < 0.75 : rnd() < 0.35) {
    const tp = { x: topC.x + (rnd() - 0.5) * topSz.w * 0.4, z: topC.z + (rnd() - 0.5) * topSz.d * 0.4 };
    towers.push(waterTower(ctx, tp.x, top + 0.5, tp.z, side));
  } else {
    const bw = Math.min(5, topSz.w * 0.3), bd = Math.min(5, topSz.d * 0.3);
    ctx.batch.box('roof', { x: topC.x, y: top + 0.5, z: topC.z }, { w: bw, h: 2.6, d: bd });
    ctx.collision.addBox({ x: topC.x, z: topC.z, y0: top + 0.5, h: 2.6, w: bw, d: bd, tag: 'roof' });   // fix-25: the stair bulkhead is solid
  }
  if (side === 'north') fireEscape(ctx, side, a0, a1, top);
}

function cornice(ctx, c, sz, h, style) {
  ctx.batch.box(style === 'brick' ? 'cream' : 'stoneDark', { x: c.x, y: h, z: c.z }, { w: sz.w + 0.5, h: 0.5, d: sz.d + 0.5 });
  ctx.batch.box('tar', { x: c.x, y: h + 0.02, z: c.z }, { w: sz.w - 0.3, h: 0.5, d: sz.d - 0.3 }, { skip: ['bottom', 'front', 'back', 'left', 'right'] });
  ctx.collision.addBox({ x: c.x, z: c.z, y0: h, h: 0.5, w: sz.w + 0.5, d: sz.d + 0.5, tag: 'roof' });
}

function waterTower(ctx, x, y, z, side) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.batch.box('iron', { x: x + dx * 1.1, y, z: z + dz * 1.1 }, { w: 0.15, h: 3, d: 0.15 });
  ctx.batch.box('iron', { x, y: y + 3, z }, { w: 2.8, h: 0.2, d: 2.8 });
  ctx.batch.mesh('wood', new THREE.CylinderGeometry(1.5, 1.6, 3.6, 12), { x, y: y + 5.0, z });
  ctx.batch.mesh('woodDark', new THREE.ConeGeometry(1.75, 1.3, 12), { x, y: y + 7.45, z });
  ctx.collision.addPyramid({ x, z, y0: y + 6.8, h: 1.3, half: 1.5, tag: 'water-tower' });   // fix-25 review: its conical lid
  ctx.collision.addCylinder({ x, z, y0: y, h: 6.8, r: 1.6, tag: 'water-tower' });
  const top = { x, y: y + 8.1, z, side };
  ctx.collision.addPerch({ x, y: y + 8.1, z, r: 0.25, id: `water-tower-${Math.round(x)}-${Math.round(z)}`, kind: 'water-tower' });
  return top;
}

function fireEscape(ctx, side, a0, a1, h) {
  const F = FRAME[side];
  const mid = (a0 + a1) / 2;
  for (let y = FLOOR * 2; y < h - 2; y += FLOOR) {
    const p = F.at(mid, -0.55);
    const sz = sizeFor(side, 4, 1.1);
    ctx.batch.box('iron', { x: p.x, y, z: p.z }, { w: sz.w, h: 0.07, d: sz.d });
    const r = F.at(mid, -1.08);
    const rsz = sizeFor(side, 4, 0.05);
    ctx.batch.box('iron', { x: r.x, y: y + 0.9, z: r.z }, { w: rsz.w, h: 0.05, d: rsz.d });
    for (const s of [-1, 1]) {
      const q = F.at(mid + s * 1.95, -1.08);
      ctx.batch.box('iron', { x: q.x, y, z: q.z }, { w: 0.05, h: 0.95, d: 0.05 });
    }
    const e0 = F.at(mid - 1.9, -1.08), e1 = F.at(mid + 1.9, -1.08);
    ctx.collision.addPerchEdge({ a: { x: e0.x, y: y + 0.96, z: e0.z }, b: { x: e1.x, y: y + 0.96, z: e1.z }, id: `fire-escape-${Math.round(mid)}-${y}`, kind: 'fire-escape', out: F.out });
    ctx.collision.addBox({ x: p.x, z: p.z, y0: y, h: 0.07, w: sz.w, d: sz.d, tag: 'fire-escape' });
    // the ladder between landings
    const l = F.at(mid + 1.2, -0.9);
    ctx.batch.box('iron', { x: l.x, y: y - FLOOR + 0.07, z: l.z }, { w: 0.4, h: FLOOR, d: 0.04 }, { pitch: 0.25 });
  }
}

// ------------------------------------------------------------------ sidewalks and kerbs
function sidewalks(ctx, side, spans) {
  const slab = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0;
    if (w <= 0.2 || d <= 0.2) return;
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    ctx.batch.box('pavers', { x, y: 0, z }, { w, h: KERB, d }, { skip: ['bottom'] });
    ctx.collision.addBox({ x, z, y0: 0, h: KERB, w, d, tag: 'sidewalk' });
  };
  const kerb = (x0, x1, z0, z1) => ctx.batch.box('kerb', { x: (x0 + x1) / 2, y: 0, z: (z0 + z1) / 2 }, { w: x1 - x0, h: KERB + 0.01, d: z1 - z0 });
  if (side === 'east' || side === 'west') {
    const s = side === 'east' ? 1 : -1;
    const park = side === 'east' ? [PARK.xMax, PARK.xMax + SIDEWALK] : [PARK.xMin - SIDEWALK, PARK.xMin];
    slab(park[0], park[1], 0, zN);
    kerb(side === 'east' ? park[1] - 0.25 : park[0], side === 'east' ? park[1] : park[0] + 0.25, 0, zN);
    const bx = side === 'east' ? [FACE.east - SIDEWALK, FACE.east] : [FACE.west, FACE.west + SIDEWALK];
    for (const [a0, a1] of spans) {
      const z0 = Math.max(a0, -AVENUE), z1 = Math.min(a1, zN + AVENUE);
      if (z1 - z0 < 1) continue;
      slab(bx[0], bx[1], z0, z1);
      kerb(side === 'east' ? bx[0] : bx[1] - 0.25, side === 'east' ? bx[0] + 0.25 : bx[1], z0, z1);
    }
    // corner sidewalks across the side streets are left open (crossings)
    void s;
  } else {
    const north = side === 'north';
    const pz = north ? [zN, zN + SIDEWALK] : [-SIDEWALK, 0];
    slab(PARK.xMin - SIDEWALK, PARK.xMax + SIDEWALK, pz[0], pz[1]);
    kerb(PARK.xMin - SIDEWALK, PARK.xMax + SIDEWALK, north ? pz[1] - 0.25 : pz[0], north ? pz[1] : pz[0] + 0.25);
    const bz = north ? [FACE.north - SIDEWALK, FACE.north] : [FACE.south, FACE.south + SIDEWALK];
    for (const [a0, a1] of spans) {
      slab(a0, a1, bz[0], bz[1]);
      kerb(a0, a1, north ? bz[0] : bz[1] - 0.25, north ? bz[0] + 0.25 : bz[1]);
    }
  }
}

// ------------------------------------------------------------------ hero buildings
const HERO = {};

/** fix-25: a slab drawn on a roof (a cornice cap, a rim) is the roof: it collides, and the rim perches are on its top. */
function slab(ctx, { x, z, y, w, h, d, tag = 'roof', perch = 'hero' }) {
  ctx.collision.addBox({ x, z, y0: y, h, w, d, tag });
  if (perch) rimPerches(ctx, { x, z, y: y + h, w, d, tag: perch });
}

function heroBox(ctx, mat, { x, z, y = 0, w, h, d, perch = true, tag = 'hero', v0 }) {
  ctx.batch.box(mat, { x, y, z }, { w, h, d }, { v0 });
  ctx.collision.addBox({ x, z, y0: y, h, w, d, tag });
  if (perch) rimPerches(ctx, { x, z, y: y + h, w, d, tag });
}

HERO['plaza-hotel'] = (ctx, H, masses) => {
  const x = (H.x0 + H.x1) / 2, z = (H.z0 + H.z1) / 2, w = H.x1 - H.x0, d = H.z1 - H.z0;
  heroBox(ctx, 'facadeLimestone', { x, z, w, h: H.h, d, perch: false });
  ctx.batch.box('cream', { x, y: H.h, z }, { w: w + 0.8, h: 0.8, d: d + 0.8 });
  slab(ctx, { x, z, y: H.h, w: w + 0.8, h: 0.8, d: d + 0.8 });   // fix-25: the cream rim round the mansard
  // the green mansard roof and corner turrets
  ctx.batch.box('copper', { x, y: H.h + 0.8, z }, { w: w - 2, h: 6, d: d - 2 });
  ctx.collision.addBox({ x, z, y0: H.h, h: 6.8, w: w - 2, d: d - 2, tag: 'roof' });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const tx = x + dx * (w / 2 - 3), tz = z + dz * (d / 2 - 3);
    ctx.batch.mesh('copper', new THREE.ConeGeometry(3.2, 7, 8), { x: tx, y: H.h + 6.8 + 3.5, z: tz });
    ctx.collision.addPerch({ x: tx, y: H.h + 14.3, z: tz, r: 0.3, id: `plaza-turret-${dx}-${dz}`, kind: 'finial' });
    ctx.collision.addPyramid({ x: tx, z: tz, y0: H.h + 6.8, h: 7, half: 2.6, tag: 'roof' });   // fix-25 review: the turret cones
    if (dx === 1 && dz === 1) {
      // fix-25: the hotel's flagpole, on the tip of its Grand Army Plaza turret (gear-sunglasses' shiny is on top of it;
      // it used to lie on the roof inside this turret's cone, which is solid now)
      const top = H.h + 13.8;
      ctx.batch.mesh('iron', new THREE.CylinderGeometry(0.045, 0.06, 2.2, 6), { x: tx, y: top + 1.1, z: tz });
      ctx.batch.box('red', { x: tx, y: top + 1.55, z: tz + 0.42 }, { w: 0.02, h: 0.5, d: 0.8 });
      ctx.collision.addCylinder({ x: tx, z: tz, y0: top, h: 2.2, r: 0.06, tag: 'flagpole', walkable: false });
      ctx.collision.addPerch({ x: tx, y: top + 2.22, z: tz, r: 0.3, id: 'plaza-roof-flagpole', kind: 'flagpole' });
    }
  }
  rimPerches(ctx, { x, z, y: H.h + 6.8, w: w - 2, d: d - 2, tag: 'mansard' });
  ctx.collision.addPerch({ x, y: H.h + 6.8, z, r: 6, id: 'summit-plaza', kind: 'summit' });
  ctx.summits['hero:plaza-hotel'] = { x, y: H.h + 6.8, z };
  // the entrance canopy and three flagpoles over it (on Central Park South)
  ctx.batch.box('red', { x, y: 3.6, z: H.z1 + 2 }, { w: 6, h: 0.3, d: 4 });
  for (let k = -1; k <= 1; k++) {
    ctx.batch.box('iron', { x: x + k * 4, y: 8, z: H.z1 + 1.6 }, { w: 0.1, h: 0.1, d: 3.4 }, { pitch: -0.5 });
    ctx.batch.box(k ? 'gold' : 'red', { x: x + k * 4, y: 8.8, z: H.z1 + 2.8 }, { w: 0.03, h: 1.0, d: 1.6 });
    ctx.collision.addPerch({ x: x + k * 4, y: 9.9, z: H.z1 + 3.2, r: 0.12, id: `plaza-flagpole-${k + 1}`, kind: 'flagpole' });
  }
  masses.push({ x, z, w, d, h: H.h + 6, style: 'limestone', side: 'south', hero: true });
};

HERO['gabled-apartments'] = (ctx, H, masses) => {
  const w = 44, x = FACE.west - w / 2, z = (H.z0 + H.z1) / 2, d = H.z1 - H.z0;
  heroBox(ctx, 'facadeLimestone', { x, z, w, h: H.h, d, perch: false });
  ctx.batch.box('cream', { x, y: H.h, z }, { w: w + 0.6, h: 0.5, d: d + 0.6 });
  ctx.collision.addBox({ x, z, y0: H.h, h: 0.5, w: w + 0.6, d: d + 0.6, tag: 'roof' });
  // steep slate roof with gables and corner pyramids
  const roofH = 9;
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, roofH); s.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w - 6, bevelEnabled: false }).translate(0, 0, -(w - 6) / 2).rotateY(Math.PI / 2);
  ctx.batch.mesh('slate', g, { x, y: H.h + 0.5, z });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.batch.mesh('slate', new THREE.ConeGeometry(4.2, 11, 4), { x: x + dx * (w / 2 - 3), y: H.h + 6, z: z + dz * (d / 2 - 3), yaw: Math.PI / 4 });
    ctx.collision.addPyramid({ x: x + dx * (w / 2 - 3), z: z + dz * (d / 2 - 3), y0: H.h + 0.5, h: 11, half: 4.2 / Math.SQRT2 });   // fix-25
    ctx.collision.addPerch({ x: x + dx * (w / 2 - 3), y: H.h + 11.5, z: z + dz * (d / 2 - 3), r: 0.25, id: `dakota-peak-${dx}-${dz}`, kind: 'finial' });
  }
  for (let k = 0; k < 6; k++) {   // dormers on the park side (fix-25 review: solid)
    const dz2 = z - d / 2 + 3 + k * ((d - 6) / 5);
    ctx.batch.box('cream', { x: x + w / 2 - 0.5, y: H.h + 1, z: dz2 }, { w: 1.6, h: 2.4, d: 1.6 });
    ctx.collision.addBox({ x: x + w / 2 - 0.5, z: dz2, y0: H.h + 1, h: 2.4, w: 1.6, d: 1.6, tag: 'roof' });
  }
  ctx.collision.addBox({ x, z, y0: 0, h: H.h, w, d, tag: 'hero' });
  rimPerches(ctx, { x, z, y: H.h + 0.5, w: w + 0.6, d: d + 0.6, tag: 'cornice' });
  ctx.collision.addPerchEdge({ a: { x: x - w / 2 + 3, y: H.h + roofH + 0.5, z }, b: { x: x + w / 2 - 3, y: H.h + roofH + 0.5, z }, id: 'summit-dakota', kind: 'ridge', out: Math.PI / 2 });
  ctx.collision.addPrism({ x, z, y0: H.h + 0.5, h: roofH, w: w - 6, d, tag: 'roof' });   // fix-25: the roof as drawn (a 5.4 m unwalkable box sat inside it)
  ctx.summits['hero:gabled-apartments'] = { x: x + 4, y: H.h + roofH + 0.5, z };
  masses.push({ x, z, w, d, h: H.h + 6, style: 'limestone', side: 'west', hero: true });
};

HERO['twin-towers'] = (ctx, H, masses) => {
  const w = 46, x = FACE.west - w / 2, z = (H.z0 + H.z1) / 2, d = H.z1 - H.z0;
  heroBox(ctx, 'facadeDeco', { x, z, w, h: H.h, d, perch: false });
  ctx.batch.box('cream', { x, y: H.h, z }, { w: w + 0.5, h: 0.5, d: d + 0.5 });
  slab(ctx, { x, z, y: H.h, w: w + 0.5, h: 0.5, d: d + 0.5 });   // fix-25
  heroBox(ctx, 'facadeDeco', { x: x - 6, z, w: w - 16, h: 7, d: d - 8, y: H.h + 0.5, v0: H.h });
  const tw = 10;
  const tops = [];
  [-1, 1].forEach((s, i) => {
    const tx = x + w / 2 - tw / 2 - 1.5, tz = z + s * (d / 2 - tw / 2 - 0.5);
    heroBox(ctx, 'facadeDeco', { x: tx, z: tz, w: tw, h: H.towerH - 12 - H.h, d: tw, y: H.h + 0.5, v0: H.h });
    const ty = H.towerH - 11.5;
    // the temple top: a colonnade, a cornice and a lantern
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.batch.mesh('cream', new THREE.CylinderGeometry(0.35, 0.35, 5, 8), { x: tx + Math.cos(a) * 3.6, y: ty + 2.5, z: tz + Math.sin(a) * 3.6 });
    }
    ctx.batch.mesh('cream', new THREE.CylinderGeometry(4.6, 4.6, 0.8, 16), { x: tx, y: ty + 5.4, z: tz });
    ctx.batch.mesh('cream', new THREE.CylinderGeometry(1.4, 2.6, 3.2, 12), { x: tx, y: ty + 7.4, z: tz });
    ctx.batch.mesh('gold', new THREE.ConeGeometry(0.6, 2.4, 8), { x: tx, y: ty + 10.2, z: tz });
    ctx.collision.addCylinder({ x: tx, z: tz, y0: ty, h: 9, r: 4.6, tag: 'tower-top' });
    ctx.collision.addPerch({ x: tx, y: ty + 11.4, z: tz, r: 0.25, id: `summit-twin-${i ? 'north' : 'south'}`, kind: 'summit' });
    tops.push({ x: tx, y: ty + 11.4, z: tz });
    masses.push({ x: tx, z: tz, w: tw, d: tw, h: H.towerH, style: 'deco', side: 'west', hero: true });
  });
  ctx.summits['hero:twin-towers'] = tops;
  masses.push({ x, z, w, d, h: H.h, style: 'deco', side: 'west', hero: true });
};

HERO['natural-history'] = (ctx, H, masses) => {
  const w = 40, x = FACE.west - w / 2 - 2, z = (H.z0 + H.z1) / 2, d = H.z1 - H.z0;
  heroBox(ctx, 'brickPlain', { x, z, w, h: H.h, d, perch: false });
  ctx.batch.box('cream', { x, y: H.h, z }, { w: w + 0.6, h: 0.7, d: d + 0.6 });
  slab(ctx, { x, z, y: H.h, w: w + 0.6, h: 0.7, d: d + 0.6 });   // fix-25: the cream cap is the roof (it hid the spikes and starlings)
  // the starlings' cornice along the park front
  ctx.batch.box('cream', { x: x + w / 2 + 0.4, y: H.h - 6, z }, { w: 0.8, h: 0.5, d: d });
  ctx.collision.addBox({ x: x + w / 2 + 0.4, z, y0: H.h - 6, h: 0.5, w: 0.8, d, tag: 'ledge' });   // fix-36: the starlings' stage is solid
  ctx.collision.addPerchEdge({ a: { x: x + w / 2 + 0.5, y: H.h - 5.5, z: z - d / 2 + 1 }, b: { x: x + w / 2 + 0.5, y: H.h - 5.5, z: z + d / 2 - 1 }, id: 'museum-cornice', kind: 'cornice', out: Math.PI / 2 });
  // the central portico: columns and a pediment facing the park
  const px = x + w / 2 + 3;
  for (let k = 0; k < 6; k++) ctx.batch.mesh('cream', new THREE.CylinderGeometry(0.7, 0.8, 16, 10), { x: px, y: 8, z: z - 9 + k * 3.6 });
  ctx.batch.box('cream', { x: px - 1, y: 16, z }, { w: 6, h: 2, d: 22 });
  const s = new THREE.Shape(); s.moveTo(-11, 0); s.lineTo(11, 0); s.lineTo(0, 5); s.lineTo(-11, 0);
  ctx.batch.mesh('cream', new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false }).translate(0, 0, -3).rotateY(Math.PI / 2), { x: px - 1, y: 18, z });
  ctx.collision.addBox({ x: px - 1, z, y0: 0, h: 18, w: 6, d: 22, tag: 'portico' });
  ctx.collision.addPrism({ x: px - 1, z, y0: 18, h: 5, w: 6, d: 22, tag: 'portico' });   // fix-25 review: the pediment (Gus landed inside it at 18)
  ctx.collision.addPerchEdge({ a: { x: px - 1, y: 23, z: z - 0.5 }, b: { x: px - 1, y: 23, z: z + 0.5 }, id: 'museum-pediment', kind: 'finial', out: Math.PI / 2 });
  // corner towers
  for (const s2 of [-1, 1]) {
    const tz = z + s2 * (d / 2 - 5);
    heroBox(ctx, 'brickPlain', { x: x + w / 2 - 5, z: tz, w: 10, h: 36, d: 10, perch: false });   // (fix-25 review: its rim is under the cap now)
    ctx.batch.mesh('slate', new THREE.ConeGeometry(7.4, 7, 4), { x: x + w / 2 - 5, y: 39.5, z: tz, yaw: Math.PI / 4 });
    ctx.collision.addPyramid({ x: x + w / 2 - 5, z: tz, y0: 36, h: 7, half: 7.4 / Math.SQRT2 });   // fix-25
  }
  ctx.collision.addPerch({ x: x + w / 2 - 5, y: 43.1, z: z - d / 2 + 5, r: 0.3, id: 'summit-museum', kind: 'summit' });
  ctx.summits['hero:natural-history'] = { x: x + w / 2 - 5, y: 43.1, z: z - d / 2 + 5 };
  masses.push({ x, z, w, d, h: H.h, style: 'brick', side: 'west', hero: true });
};

HERO['spiral-museum'] = (ctx, H, masses) => {
  const x = FACE.east + 18, z = (H.z0 + H.z1) / 2;
  ctx.batch.box('white', { x, y: 0, z }, { w: 34, h: 3.5, d: 26 });
  ctx.collision.addBox({ x, z, y0: 0, h: 3.5, w: 34, d: 26, tag: 'hero' });
  // the inverted spiral: wider as it rises
  let y = 3.5;
  for (let k = 0; k < 5; k++) {
    const r = 9 + k * 1.1, h = 4.2;
    ctx.batch.mesh('white', new THREE.CylinderGeometry(r + 0.6, r, h, 40), { x: x - 3, y: y + h / 2, z });
    ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.6, 40, 1, true), { x: x - 3, y: y + h - 0.3, z });
    y += h;
  }
  const r = 9 + 4 * 1.1 + 0.6;
  ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(r - 2, r - 2, 0.6, 32), { x: x - 3, y: y + 0.3, z });
  ctx.collision.addCylinder({ x: x - 3, z, y0: 3.5, h: y - 3.5, r, tag: 'spiral' });
  ctx.collision.addCylinder({ x: x - 3, z, y0: y, h: 0.6, r: r - 2, tag: 'roof' });   // fix-25: the skylight disc is solid
  ctx.collision.addPerch({ x: x - 3, y: y + 0.6, z, r: r - 2.3, id: 'summit-spiral', kind: 'summit' });
  ctx.summits['hero:spiral-museum'] = { x: x - 3, y: y + 0.6, z };
  // the tall annex behind
  heroBox(ctx, 'facadeLimestone', { x: x + 14, z, w: 12, h: 34, d: 22 });
  masses.push({ x: x - 3, z, w: 2 * r, d: 2 * r, h: y, style: 'white', side: 'east', hero: true });
  masses.push({ x: x + 14, z, w: 12, d: 22, h: 34, style: 'limestone', side: 'east', hero: true });
};

HERO['walters-building'] = (ctx, H, masses) => {
  const w = 44, x = FACE.east + w / 2, z = (H.z0 + H.z1) / 2, d = H.z1 - H.z0;
  heroBox(ctx, 'facadeLimestone', { x, z, w, h: H.h, d });
  ctx.batch.box('cream', { x, y: H.h, z }, { w: w + 0.8, h: 0.8, d: d + 0.8 });
  ctx.collision.addBox({ x, z, y0: H.h, h: 0.8, w: w + 0.8, d: d + 0.8, tag: 'roof' });
  rimPerches(ctx, { x, z, y: H.h + 0.8, w: w + 0.8, d: d + 0.8, tag: 'cornice' });
  // the summit perch sits on the park-side cornice, looking west over the park
  ctx.collision.addPerch({ x: x - w / 2, y: H.h + 0.8, z, r: 0.6, id: 'summit-walter', kind: 'summit' });
  ctx.summits['hero:walters-building'] = { x: x - w / 2, y: H.h + 0.8, z };
  // the hawks' ledge: a deep stone ledge high on the park front
  ctx.batch.box('cream', { x: FACE.east - 0.5, y: H.h - 9, z }, { w: 1.2, h: 0.4, d: d - 2 });
  ctx.collision.addBox({ x: FACE.east - 0.5, z, y0: H.h - 9, h: 0.4, w: 1.2, d: d - 2, tag: 'ledge' });
  ctx.collision.addPerchEdge({ a: { x: FACE.east - 0.7, y: H.h - 8.6, z: z - d / 2 + 1.5 }, b: { x: FACE.east - 0.7, y: H.h - 8.6, z: z + d / 2 - 1.5 }, id: 'hawks-ledge', kind: 'ledge', out: -Math.PI / 2 });
  // the doorman's green canopy over the sidewalk
  ctx.batch.box('green', { x: FACE.east - 2.1, y: 3.0, z }, { w: 4.2, h: 0.35, d: 3 });
  for (const dz of [-1.4, 1.4]) ctx.batch.box('gold', { x: FACE.east - 4, y: 0.15, z: z + dz }, { w: 0.08, h: 2.9, d: 0.08 });
  ctx.collision.addBox({ x: FACE.east - 2.1, z, y0: 3.0, h: 0.35, w: 4.2, d: 3, tag: 'canopy' });
  rimPerches(ctx, { x: FACE.east - 2.1, z, y: 3.35, w: 4.2, d: 3, tag: 'canopy' });
  masses.push({ x, z, w, d, h: H.h, style: 'limestone', side: 'east', hero: true });
};

// ------------------------------------------------------------------ construction site (Fifth & 76th)
function construction(ctx, C, masses) {
  const z = (C.z0 + C.z1) / 2, d = C.z1 - C.z0;
  const x0 = FACE.east, w = 40, x = x0 + w / 2;
  // the steel frame, six floors up, with two floors decked
  const floors = 6;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 3; j++) {
    const cx = x0 + 3 + i * ((w - 6) / 4), cz = z - d / 2 + 2 + j * ((d - 4) / 3);
    ctx.batch.box('rubber', { x: cx, y: 0, z: cz }, { w: 0.35, h: floors * FLOOR, d: 0.35 });
    ctx.collision.addBox({ x: cx, z: cz, y0: 0, h: floors * FLOOR, w: 0.35, d: 0.35, tag: 'girder', walkable: true });
  }
  for (let f = 1; f <= floors; f++) {
    const y = f * FLOOR;
    for (const s of [-1, 1]) {
      ctx.batch.box('rubber', { x, y: y - 0.3, z: z + s * (d / 2 - 2) }, { w: w - 6, h: 0.3, d: 0.3 });
      ctx.collision.addPerchEdge({ a: { x: x0 + 3, y, z: z + s * (d / 2 - 2) }, b: { x: x0 + w - 3, y, z: z + s * (d / 2 - 2) }, id: `girder-${f}-${s}`, kind: 'girder', out: s > 0 ? 0 : Math.PI });
    }
    if (f <= 2) { ctx.batch.box('scaffold', { x, y: y - 0.05, z }, { w: w - 6, h: 0.1, d: d - 4 }); ctx.collision.addBox({ x, z, y0: y - 0.05, h: 0.1, w: w - 6, d: d - 4, tag: 'deck' }); }
  }
  // scaffolding on the street face
  for (let k = 0; k < 5; k++) for (let f = 0; f < 5; f++) {
    ctx.batch.box('scaffold', { x: x0 + 0.8, y: f * 2.2 + 3.4, z: z - d / 2 + 1 + k * ((d - 2) / 4) }, { w: 0.08, h: 2.2, d: 0.08 });
  }
  for (let f = 1; f <= 5; f++) {
    ctx.batch.box('wood', { x: x0 + 0.8, y: f * 2.2 + 3.4, z }, { w: 1.2, h: 0.06, d: d - 2 });
    ctx.collision.addBox({ x: x0 + 0.8, z, y0: f * 2.2 + 3.4, h: 0.06, w: 1.2, d: d - 2, tag: 'scaffold' });
    ctx.collision.addPerchEdge({ a: { x: x0 + 0.25, y: f * 2.2 + 3.46, z: z - d / 2 + 1.5 }, b: { x: x0 + 0.25, y: f * 2.2 + 3.46, z: z + d / 2 - 1.5 }, id: `scaffold-${f}`, kind: 'scaffold', out: -Math.PI / 2 });
  }
  // the plywood sidewalk shed over the sidewalk, on posts
  const shX = x0 - SIDEWALK / 2;
  ctx.batch.box('plywood', { x: shX, y: 3.0, z }, { w: SIDEWALK + 0.4, h: 0.3, d: d + 6 });
  for (let k = 0; k <= 6; k++) for (const sx of [x0 - SIDEWALK + 0.3, x0 - 0.3]) ctx.batch.box('plywood', { x: sx, y: 0.15, z: z - d / 2 - 3 + k * ((d + 6) / 6) }, { w: 0.2, h: 2.85, d: 0.2 });
  ctx.collision.addBox({ x: shX, z, y0: 3.0, h: 0.3, w: SIDEWALK + 0.4, d: d + 6, tag: 'shed-roof' });
  rimPerches(ctx, { x: shX, z, y: 3.3, w: SIDEWALK + 0.4, d: d + 6, tag: 'shed' });
  // plywood fence round the site
  ctx.batch.box('plywood', { x: x0 + 0.2, y: 0, z }, { w: 0.15, h: 2.6, d: d });
  ctx.collision.addBox({ x: x0 + 0.2, z, y0: 0, h: 2.6, w: 0.15, d, tag: 'fence' });
  masses.push({ x, z, w, d, h: floors * FLOOR, style: 'frame', side: 'east', hero: true });
}

// ------------------------------------------------------------------ storefronts, steam stacks, the plaza
let signMats = null;
function signMaterial(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.fillStyle = fg;
  g.font = 'bold 62px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // Fixes-3 (R4): the world is drawn through a mirrored root (main.js): flip the lettering back ("$1 SLICE" read "ECILS 1$")
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1;
  return new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35 });
}

function storefront(ctx, sf) {
  if (!signMats) {
    signMats = {
      slice: signMaterial('$1 SLICE', '#B3432D', '#F4E6CC'),
      bodega: signMaterial('DELI GROCERY', '#2F4F8F', '#F2C230'),
    };
    ctx.M.signSlice = signMats.slice;
    ctx.M.signBodega = signMats.bodega;
  }
  const F = FRAME[sf.side];
  const along = F.alongZ ? sf.z : sf.x;
  const W = 7;
  const p = F.at(along, -0.16);
  const sz = sizeFor(sf.side, W, 0.3);
  ctx.batch.box('storefront', { x: p.x, y: 0, z: p.z }, { w: sz.w, h: FLOOR, d: sz.d });
  // the awning (sloped) and the sign above it
  const a = F.at(along, -1.2);
  const asz = sizeFor(sf.side, W, 2.2);
  const tilt = 0.35;
  const pitchRoll = F.alongZ ? { roll: (sf.side === 'east' ? -1 : 1) * tilt } : { pitch: (sf.side === 'south' ? 1 : -1) * tilt };
  ctx.batch.box('canvas', { x: a.x, y: FLOOR - 0.3, z: a.z }, { w: asz.w, h: 0.06, d: asz.d }, pitchRoll);
  ctx.collision.addBox({ x: a.x, z: a.z, y0: FLOOR - 0.4, h: 0.3, w: asz.w, d: asz.d, tag: 'awning' });
  const e0 = F.at(along - W / 2 + 0.3, -2.2), e1 = F.at(along + W / 2 - 0.3, -2.2);
  ctx.collision.addPerchEdge({ a: { x: e0.x, y: FLOOR - 0.6, z: e0.z }, b: { x: e1.x, y: FLOOR - 0.6, z: e1.z }, id: sf.id + '-awning', kind: 'awning', out: F.out });
  const s = F.at(along, -0.35);
  const ssz = sizeFor(sf.side, W - 0.6, 0.08);
  // Fixes-3 (R4): the sign's lettering spans its face once (box UVs are in metres, so the canvas sat squeezed into the
  // first metre, mirrored, and the rest was its edge colour)
  const sg = boxGeometry(ssz.w, 1.0, ssz.d, { skip: ['bottom'] });
  const suv = sg.attributes.uv, span = Math.max(ssz.w, ssz.d);
  for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) / span, suv.getY(i));
  ctx.batch.mesh(sf.kind === 'slice' ? 'signSlice' : 'signBodega', sg, { x: s.x, y: FLOOR + 0.05, z: s.z });
}

function steamStack(ctx, s) {
  ctx.batch.mesh('stack', new THREE.CylinderGeometry(0.38, 0.42, 2.6, 14).translate(0, 1.3, 0), { x: s.x, y: 0, z: s.z });
  ctx.batch.mesh('stack', new THREE.ConeGeometry(0.6, 0.5, 14, 1, true).translate(0, 0.25, 0), { x: s.x, y: 2.5, z: s.z, pitch: Math.PI });
  ctx.collision.addCylinder({ x: s.x, z: s.z, y0: 0, h: 2.7, r: 0.45, tag: 'steam-stack' });
  return { ...s, y: 2.7 };
}

function grandArmyPlaza(ctx) {
  const P = CITY.plaza;
  // a low stone balustrade round the plaza and lamp standards (the fountain is a landmark)
  for (const [x0, x1, z0, z1] of [[P.x0, P.x1, P.z1 - 0.3, P.z1], [P.x0, P.x0 + 0.3, P.z0, P.z1 - 6]]) {
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    ctx.batch.box('stone', { x, y: 0, z }, { w: x1 - x0, h: 0.7, d: z1 - z0 });
  }
}

/** Static taxis along the avenues (one InstancedMesh): street life for the city ring. */
export function buildTaxis(collision) {
  const rnd = rngFor('taxis');
  const spots = [];
  for (let z = 6; z < zN; z += 28 + rnd() * 30) spots.push({ x: PARK.xMax + 5.6 + (rnd() < 0.5 ? 0 : 4), z, yaw: Math.PI });
  for (let z = 14; z < zN; z += 28 + rnd() * 30) spots.push({ x: PARK.xMin - 5.6 - (rnd() < 0.5 ? 0 : 4), z, yaw: 0 });
  for (let x = -160; x < 160; x += 26 + rnd() * 24) spots.push({ x, z: -6 - (rnd() < 0.5 ? 0 : 4), yaw: Math.PI / 2 });
  for (let x = -160; x < 160; x += 30 + rnd() * 30) spots.push({ x, z: zN + 6 + (rnd() < 0.5 ? 0 : 4), yaw: -Math.PI / 2 });
  const body = new THREE.BoxGeometry(1.8, 0.8, 4.4).translate(0, 0.55, 0);
  const cab = new THREE.BoxGeometry(1.6, 0.6, 2.2).translate(0, 1.25, -0.2);
  const sign = new THREE.BoxGeometry(0.6, 0.18, 0.2).translate(0, 1.64, -0.2);
  const parts = [[body, 0xf2c230], [cab, 0x3a4a55], [sign, 0xf4f1ea]].map(([g, c]) => {
    const col = new THREE.Color(c);
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  const geo = mergeAll(parts);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, vertexColors: true }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  spots.forEach((s, i) => {
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, 0, s.z), q.setFromAxisAngle(up, s.yaw), one));
    collision.addBox({ x: s.x, z: s.z, y0: 0, h: 1.55, w: 1.8, d: 4.4, yaw: s.yaw, tag: 'taxi' });
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'taxis';
  mesh.computeBoundingSphere();
  return mesh;
}

function mergeAll(parts) {
  const pos = [], nor = [], col = [], idx = [];
  let base = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.getX(i), c.getY(i), c.getZ(i)); }
    for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    base += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export { FACE, archSlab, X };
