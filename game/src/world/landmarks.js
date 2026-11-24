// Landmarks: every place in the map table, built in code from layout.js
// numbers, with code collision proxies and perch points. A ★ landmark whose
// meshgen GLB exists uses the GLB as its visual instead (streamed by zone);
// its collision and perches stay code.
//
// Also here: rocks, the transverse cuts' retaining walls and stone bridges.

import * as THREE from 'three';
import { LANDMARKS, ROCKS, TRANSVERSES, TRANSVERSE_RAMP, PARK, RINK, SUMMIT_PERCHES, BLOCK } from './layout.js';
import { boxGeometry, scaleUV } from '../gfx/batch.js';
import { fbm, rngFor } from '../core/rng.js';
import { ellipsePoly, samplePolyline, smoothstep } from '../core/geo.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { simplifiedGeometry, simplifierReady } from '../gfx/simplify.js';
import { reservoirPanel, backstop, conservatoryGate } from './fences.js';

// ------------------------------------------------------------------ shape helpers
/** An arch plate: span along local z, thickness along local x, from y0 up to y1 with an arch opening. */
export function archSlab({ span, y0, y1, thickness, openW, springY, crownY }) {
  const s = new THREE.Shape();
  s.moveTo(-span / 2, y0); s.lineTo(span / 2, y0); s.lineTo(span / 2, y1); s.lineTo(-span / 2, y1); s.lineTo(-span / 2, y0);
  const hole = new THREE.Path();
  const hw = openW / 2, rise = crownY - springY;
  hole.moveTo(-hw, y0 - 0.01);
  hole.lineTo(-hw, springY);
  for (let i = 1; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; hole.lineTo(Math.cos(a) * hw, springY + Math.sin(a) * rise); }
  hole.lineTo(hw, y0 - 0.01);
  hole.lineTo(-hw, y0 - 0.01);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(Math.PI / 2);
  g.translate(-thickness / 2, 0, 0);
  return g;
}

/** A flat annulus sector (r0..r1, angles a0..a1, radians from +x toward +z), h tall, standing on y = 0. */
export function annulusSector(r0, r1, a0, a1, h, seg = 16) {
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
  for (let i = 1; i <= seg; i++) { const a = a0 + ((a1 - a0) * i) / seg; s.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
  for (let i = seg; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / seg; s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  // rotateX(+90°): shape (x, y, extrude e) → (x, -e, y): the extrusion goes down, the angle runs +x → +z
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  return g;
}

function rockGeometry(seed) {
  let g = new THREE.IcosahedronGeometry(1, 2);
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.22 * fbm(x * 1.3 + seed, z * 1.3 + y, { octaves: 3, seed }) + (y < 0 ? 0 : 0.08 * Math.sin(x * 4 + seed));
    p.setXYZ(i, x * n, y * n, z * n);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ the context
// ctx: { batch, collision, heightAt, registry, dynamic (Group for GLBs), blockers [], summits {}, streams [] }

function solid(ctx, mat, { x, z, y = 0, w, h, d, yaw = 0 }, { perch = true, walkable = true, tag = 'building', skip, v0, out = null } = {}) {
  ctx.batch.box(mat, { x, y, z }, { w, h, d }, { yaw, skip, v0 });
  ctx.collision.addBox({ x, z, y0: y, h, w, d, yaw, walkable, tag });
  if (perch) rimPerches(ctx, { x, z, y: y + h, w, d, yaw, tag, out });
}

/** Perch edges round a rectangle's top. */
export function rimPerches(ctx, { x, z, y, w, d, yaw = 0, tag = 'rim', inset = 0.12, sides = [0, 1, 2, 3] }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const W = (lx, lz) => ({ x: x + lx * c + lz * s, y, z: z - lx * s + lz * c });
  const hx = w / 2 - inset, hz = d / 2 - inset;
  const edges = [
    [W(-hx, hz), W(hx, hz), yaw],               // +z side
    [W(hx, -hz), W(-hx, -hz), yaw + Math.PI],   // -z side
    [W(hx, hz), W(hx, -hz), yaw + Math.PI / 2], // +x side
    [W(-hx, -hz), W(-hx, hz), yaw - Math.PI / 2],
  ];
  for (const k of sides) ctx.collision.addPerchEdge({ a: edges[k][0], b: edges[k][1], id: `${tag}-${Math.round(x)}-${Math.round(z)}-${k}`, kind: tag, out: edges[k][2] });
}

function block(ctx, x0, x1, z0, z1) { ctx.blockers.push({ x0, x1, z0, z1 }); }
function blockAround(ctx, x, z, r) { block(ctx, x - r, x + r, z - r, z + r); }
function summit(ctx, id, p) { ctx.summits[id] = p; }

const local = (L) => {
  const c = Math.cos(L.yaw || 0), s = Math.sin(L.yaw || 0);
  return (lx, lz) => ({ x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c });
};

// ------------------------------------------------------------------ builders by kind
const B = {};

B['stone-bridge'] = (L, ctx) => {
  const W = local(L);
  const endA = W(0, -L.span / 2 - 1.5), endB = W(0, L.span / 2 + 1.5);
  // batch-3 (#17): the deck height terrain.js worked out (from the ends before it ramped the ground up to it)
  const top = ctx.deckTops?.[L.id] ?? Math.max(ctx.heightAt(endA.x, endA.z), ctx.heightAt(endB.x, endB.z)) + 0.35;
  const water = ctx.collision.waterAt(L.x, L.z);
  const base = water ? water.level - 0.6 : ctx.heightAt(L.x, L.z) - 0.5;
  const g = archSlab({ span: L.span + 3, y0: base, y1: top, thickness: L.width, openW: L.span * 0.62, springY: base + 0.6, crownY: top - 0.9 });
  ctx.batch.mesh('stone', g, { x: L.x, z: L.z, yaw: L.yaw });
  for (const side of [-1, 1]) {
    const p = W(side * (L.width / 2 - 0.2), 0);
    solid(ctx, 'stoneDark', { x: p.x, z: p.z, y: top, w: 0.4, h: 0.85, d: L.span + 3, yaw: L.yaw }, { tag: 'parapet', walkable: true });
  }
  ctx.collision.addBox({ x: L.x, z: L.z, y0: top - 1.0, h: 1.0, w: L.width, d: L.span + 3, yaw: L.yaw, tag: 'bridge' });
  if (L.road) ctx.batch.box('asphalt', { x: L.x, y: top, z: L.z }, { w: L.width - 1, h: 0.03, d: L.span + 3 }, { yaw: L.yaw });
};

B['rink'] = (L, ctx) => {
  const { x, z, w, d } = L;
  const y = ctx.heightAt(x, z);
  RINK.groundY = y;
  // the ice
  ctx.batch.box('ice', { x, y, z }, { w, h: RINK.iceY, d });
  ctx.collision.addBox({ x, z, y0: y, h: RINK.iceY, w, d, tag: 'ice' });
  // low boards, with a gate at each end (north: the yard; south: the Zamboni garage's apron)
  const bh = RINK.boardH, t = 0.14;
  const ng = RINK.northGate.w / 2, sg = RINK.southGate.w / 2, hw = w / 2;
  const boards = [
    { x: x - (hw + sg) / 2, z: z - d / 2, w: hw - sg, d: t }, { x: x + (hw + sg) / 2, z: z - d / 2, w: hw - sg, d: t },
    { x: x - w / 2, z, w: t, d }, { x: x + w / 2, z, w: t, d },
    { x: x - (hw + ng) / 2, z: z + d / 2, w: hw - ng, d: t }, { x: x + (hw + ng) / 2, z: z + d / 2, w: hw - ng, d: t },
  ];
  for (const b of boards) {
    ctx.batch.box('boards', { x: b.x, y, z: b.z }, { w: b.w, h: bh, d: b.d });
    ctx.batch.box('red', { x: b.x, y: y + bh - 0.06, z: b.z }, { w: b.w + 0.02, h: 0.07, d: b.d + 0.04 });
    ctx.collision.addBox({ x: b.x, z: b.z, y0: y, h: bh, w: b.w, d: b.d, tag: 'boards' });
    rimPerches(ctx, { x: b.x, z: b.z, y: y + bh, w: b.w, d: b.d, tag: 'boards', inset: 0, sides: b.w > b.d ? [0] : [2] });
  }
  // the launch lane: KEEP CLEAR chevrons painted on the ice against the north boards
  const Ln = RINK.lane;
  for (let k = 0; k < 5; k++) {
    const cx = Ln.x0 + 1.4 + k * 2.3, cz = (Ln.z0 + Ln.z1) / 2;
    for (const sd of [-1, 1]) ctx.batch.box('red', { x: cx + sd * 0.42, y: y + RINK.iceY, z: cz }, { w: 1.2, h: 0.012, d: 0.22 }, { yaw: sd * 0.7 });
  }
  ctx.batch.box('gold', { x: (Ln.x0 + Ln.x1) / 2, y: y + RINK.iceY, z: Ln.z0 + 0.1 }, { w: Ln.x1 - Ln.x0, h: 0.012, d: 0.12 });
  // the kids' little ice bump by the boards (a hint for the Rink Job)
  const bp = RINK.bump;
  ctx.batch.mesh('ice', new THREE.SphereGeometry(bp.r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, bp.h / bp.r, 1), { x: bp.x, y: y + RINK.iceY - 0.02, z: bp.z });
  // Zamboni garage (south): three walls and a roof, open to the rink (its buckled door is a door in DOORS)
  const G = RINK.garage;
  const gw = G.w, gd = G.d, gt = 0.3;
  for (const [lx, lz, ww, dd] of [[-gw / 2 + gt / 2, 0, gt, gd], [gw / 2 - gt / 2, 0, gt, gd], [0, -gd / 2 + gt / 2, gw, gt]]) solid(ctx, 'brickPlain', { x: G.x + lx, z: G.z + lz, y, w: ww, h: G.h, d: dd }, { tag: 'garage' });
  solid(ctx, 'brickPlain', { x: G.x, z: G.z + gd / 2 - 0.15, y: y + G.h - 0.6, w: gw, h: 0.6, d: 0.3 }, { tag: 'garage', perch: false });
  ctx.batch.box('roof', { x: G.x, y: y + G.h, z: G.z }, { w: gw + 0.4, h: 0.25, d: gd + 0.4 });
  ctx.collision.addBox({ x: G.x, z: G.z, y0: y + G.h, h: 0.25, w: gw + 0.4, d: gd + 0.4, tag: 'roof' });
  ctx.batch.box('asphalt', { x: G.x, y: y + 0.02, z: G.z + gd / 2 + 1.1 }, { w: RINK.southGate.w, h: 0.02, d: 2.4 });
  // the service yard and Prickett's equipment shed (north, by the drive); its steel roll-up door faces the rink
  const S = RINK.shed;
  solid(ctx, 'plywood', { x: S.x, z: S.z, y, w: S.w, h: S.h, d: S.d }, { tag: 'shed' });
  ctx.batch.box('tar', { x: S.x, y: y + S.h, z: S.z }, { w: S.w + 0.3, h: 0.18, d: S.d + 0.3 });
  ctx.batch.box('asphalt', { x: RINK.yard.x, y: y + 0.015, z: RINK.yard.z }, { w: RINK.yard.w, h: 0.02, d: RINK.yard.d });
  block(ctx, x - w / 2 - 6, x + w / 2 + 6, z - d / 2 - 12, z + d / 2 + 12);
};

B['zoo'] = (L, ctx) => {
  const { x, z, w, d } = L;
  const y = ctx.heightAt(x, z);
  const h = 2.6, t = 0.5;
  // fix-26: a gate in the north wall where the zoo walk leaves over the 65th St transverse bridge (x ≈ 95.1): the
  // bridge's south end ran straight into the wall
  const gx = 95.1, gw = 3.6, nl = gx - gw / 2 - (x - w / 2), nr = (x + w / 2) - (gx + gw / 2);
  const walls = [
    { x, z: z - d / 2, w, d: t },
    { x: x - w / 2 + nl / 2, z: z + d / 2, w: nl, d: t }, { x: x + w / 2 - nr / 2, z: z + d / 2, w: nr, d: t },
    { x: x + w / 2, z, w: t, d },
    { x: x - w / 2, z: z - d / 4 - 2.5, w: t, d: d / 2 - 5 }, { x: x - w / 2, z: z + d / 4 + 2.5, w: t, d: d / 2 - 5 },
  ];
  for (const b of walls) solid(ctx, 'brickPlain', { x: b.x, z: b.z, y, w: b.w, h, d: b.d }, { tag: 'zoo-wall' });
  for (const sx of [-1, 1]) solid(ctx, 'brickPlain', { x: gx + sx * (gw / 2 + 0.3), z: z + d / 2, y, w: 0.6, h: h + 0.6, d: 0.7 }, { tag: 'zoo-wall' });   // the gate's piers
  // pavilions with copper roofs, and the sea lion pool in the middle
  for (const [dx, dz, pw, pd] of [[-6, -10, 10, 7], [8, 9, 9, 8], [9, -11, 7, 6]]) {
    solid(ctx, 'brickPlain', { x: x + dx, z: z + dz, y, w: pw, h: 4, d: pd }, { tag: 'zoo', perch: false });
    ctx.batch.box('copper', { x: x + dx, y: y + 4, z: z + dz }, { w: pw + 0.6, h: 0.5, d: pd + 0.6 });
    ctx.collision.addBox({ x: x + dx, z: z + dz, y0: y + 4, h: 0.5, w: pw + 0.6, d: pd + 0.6, tag: 'roof' });   // fix-25: the copper roof
    rimPerches(ctx, { x: x + dx, z: z + dz, y: y + 4.5, w: pw + 0.6, d: pd + 0.6, tag: 'zoo' });
  }
  ctx.batch.mesh('stone', new THREE.CylinderGeometry(6, 6, 0.6, 24), { x: x - 3, y: y + 0.3, z: z + 3 });
  ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(5.5, 5.5, 0.05, 24), { x: x - 3, y: y + 0.6, z: z + 3 });
  block(ctx, x - w / 2, x + w / 2, z - d / 2, z + d / 2);
};

B['playground'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  const cols = ['red', 'gold', 'copper', 'canvas'];
  for (let k = 0; k < 5; k++) {
    const px = L.x - 8 + (k % 3) * 7, pz = L.z - 4 + Math.floor(k / 3) * 7;
    solid(ctx, cols[k % cols.length], { x: px, z: pz, y, w: 2.2, h: 1.6 + (k % 2), d: 2.2 }, { tag: 'play' });
    ctx.batch.box('scaffold', { x: px + 1.6, y, z: pz }, { w: 0.6, h: 0.8, d: 3 }, { pitch: 0.4 });
  }
  // swings frame
  ctx.batch.box('iron', { x: L.x + 9, y: y + 2.4, z: L.z }, { w: 0.12, h: 0.12, d: 6 });
  for (const dz of [-3, 3]) ctx.batch.box('iron', { x: L.x + 9, y, z: L.z + dz }, { w: 0.1, h: 2.5, d: 0.1 });
  block(ctx, L.x - 12, L.x + 12, L.z - 8, L.z + 8);
};

B['carousel'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  if (glb(ctx, L, y)) { ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 5, r: L.r, tag: 'carousel' }); blockAround(ctx, L.x, L.z, L.r + 3); return; }
  // octagonal brick building with a striped tent roof
  ctx.batch.mesh('brickPlain', new THREE.CylinderGeometry(L.r, L.r, 3.4, 8, 1, false), { x: L.x, y: y + 1.7, z: L.z, yaw: Math.PI / 8 });
  ctx.batch.mesh('cream', new THREE.CylinderGeometry(L.r + 0.3, L.r + 0.3, 0.4, 8), { x: L.x, y: y + 3.6, z: L.z, yaw: Math.PI / 8 });
  ctx.batch.mesh('canvas', scaleUV(new THREE.ConeGeometry(L.r + 1, 3.6, 16), 4, 1), { x: L.x, y: y + 5.6, z: L.z });
  ctx.batch.mesh('gold', new THREE.SphereGeometry(0.35, 8, 6), { x: L.x, y: y + 7.6, z: L.z });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 3.8, r: L.r, tag: 'carousel' });
  ctx.collision.addPerch({ x: L.x, y: y + 7.95, z: L.z, r: 0.25, id: 'carousel-top', kind: 'finial' });
  blockAround(ctx, L.x, L.z, L.r + 3);
};

B['dairy'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'stone', { x: L.x, z: L.z, y, w: 11, h: 4.5, d: 7 }, { perch: false });
  roofPrism(ctx, 'slate', { x: L.x, z: L.z, y: y + 4.5, w: 11.6, d: 7.6, h: 3.6 });
  solid(ctx, 'stone', { x: L.x + 4, z: L.z + 2, y, w: 3, h: 9, d: 3 }, { tag: 'dairy-tower', perch: false });
  ctx.batch.mesh('slate', new THREE.ConeGeometry(2.3, 3.2, 4), { x: L.x + 4, y: y + 10.6, z: L.z + 2, yaw: Math.PI / 4 });
  ctx.collision.addPyramid({ x: L.x + 4, z: L.z + 2, y0: y + 9, h: 3.2, half: 2.3 / Math.SQRT2 });   // fix-25 review: the spire
  ctx.collision.addPerch({ x: L.x + 4, y: y + 12.2, z: L.z + 2, r: 0.2, id: 'dairy-spire', kind: 'finial' });
  // the open porch with green posts
  for (let k = 0; k < 5; k++) ctx.batch.box('green', { x: L.x - 4.5 + k * 2.2, y, z: L.z - 5 }, { w: 0.25, h: 3.2, d: 0.25 });
  ctx.batch.box('slate', { x: L.x, y: y + 3.2, z: L.z - 4.5 }, { w: 11, h: 0.25, d: 3 }, { pitch: -0.25 });
  block(ctx, L.x - 8, L.x + 8, L.z - 8, L.z + 6);
};

B['chess'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  ctx.batch.mesh('stone', new THREE.CylinderGeometry(4, 4, 3, 8), { x: L.x, y: y + 1.5, z: L.z, yaw: Math.PI / 8 });
  ctx.batch.mesh('roof', new THREE.CylinderGeometry(4.6, 4.6, 0.3, 8), { x: L.x, y: y + 3.15, z: L.z, yaw: Math.PI / 8 });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 3.3, r: 4, tag: 'chess' });
  ctx.collision.addPerch({ x: L.x, y: y + 3.3, z: L.z, r: 3.6, id: 'chess-roof', kind: 'roof' });
  // tables outside
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, r = 7.5;
    const tx = L.x + Math.cos(a) * r, tz = L.z + Math.sin(a) * r;
    const ty = ctx.heightAt(tx, tz);
    ctx.batch.box('stone', { x: tx, y: ty, z: tz }, { w: 0.25, h: 0.7, d: 0.25 });
    ctx.batch.box('tile', { x: tx, y: ty + 0.7, z: tz }, { w: 0.8, h: 0.06, d: 0.8 });
    ctx.collision.addBox({ x: tx, z: tz, y0: ty, h: 0.76, w: 0.8, d: 0.8, tag: 'table' });
  }
  blockAround(ctx, L.x, L.z, 9);
};

B['column-monument'] = (L, ctx) => {
  const y = L.x < PARK.xMin || L.z < 0 ? 0.15 : ctx.heightAt(L.x, L.z);
  solid(ctx, 'stone', { x: L.x, z: L.z, y, w: 4.5, h: 1.4, d: 4.5 }, { tag: 'plinth' });
  ctx.batch.mesh('cream', new THREE.CylinderGeometry(0.75, 0.9, L.h, 12), { x: L.x, y: y + 1.4 + L.h / 2, z: L.z });
  ctx.batch.mesh('gold', new THREE.CylinderGeometry(0.5, 0.4, 1.4, 8), { x: L.x, y: y + 1.4 + L.h + 0.7, z: L.z });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: L.h + 1.4, r: 0.9, tag: 'column', walkable: false });
  ctx.collision.addPerch({ x: L.x, y: y + L.h + 2.85, z: L.z, r: 0.35, id: L.id + '-top', kind: 'statue' });
};

B['statue'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  const [w, h, d] = L.size;
  ctx.batch.box('schist', { x: L.x, y: y - 0.2, z: L.z }, { w: w + 1.2, h: 0.9, d: d + 1.2 }, { yaw: L.yaw || 0 });
  if (!glb(ctx, L, y + 0.7)) {
    // a bronze stand-in of the right size
    ctx.batch.mesh('bronze', new THREE.CapsuleGeometry(Math.min(w, d) * 0.35, Math.max(0.1, h - Math.min(w, d) * 0.7), 4, 8), { x: L.x, y: y + 0.7 + h / 2, z: L.z, yaw: L.yaw || 0, scale: { x: 1, y: 1, z: d / w } });
  }
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y - 0.2, h: 0.9, w: w + 1.2, d: d + 1.2, yaw: L.yaw || 0, tag: 'plinth' });
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y + 0.7, h, w: w * 0.7, d: d * 0.7, yaw: L.yaw || 0, tag: 'statue' });
  ctx.collision.addPerch({ x: L.x, y: y + 0.7 + h, z: L.z, r: 0.3, id: L.id + '-top', kind: 'statue' });
  blockAround(ctx, L.x, L.z, Math.max(w, d) + 1.5);
};

B['tavern'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'brickPlain', { x: L.x, z: L.z, y, w: 12, h: 4.2, d: 18 }, { perch: false });
  roofPrism(ctx, 'slate', { x: L.x, z: L.z, y: y + 4.2, w: 12.6, d: 18.6, h: 3, alongZ: true });
  solid(ctx, 'glassDark', { x: L.x + 8, z: L.z, y, w: 4, h: 3, d: 14 }, { tag: 'tavern' });
  // strings of lights over the terrace
  for (let k = 0; k < 6; k++) ctx.batch.box('lamp', { x: L.x + 8.2, y: y + 3.05, z: L.z - 6 + k * 2.4 }, { w: 4.2, h: 0.08, d: 0.08 });
  block(ctx, L.x - 8, L.x + 12, L.z - 11, L.z + 11);
};

B['mall-statues'] = (L, ctx) => {
  for (let k = 0; k < 6; k++) {
    const side = k % 2 ? 1 : -1;
    const x = L.x + side * 4.6, z = L.z + 4 + Math.floor(k / 2) * 9;
    const y = ctx.heightAt(x, z);
    ctx.batch.box('stone', { x, y, z }, { w: 1.4, h: 1.8, d: 1.4 });
    ctx.batch.mesh('bronze', new THREE.CapsuleGeometry(0.32, 1.1, 4, 8), { x, y: y + 2.55, z });
    ctx.batch.mesh('bronze', new THREE.SphereGeometry(0.22, 8, 6), { x, y: y + 3.45, z });
    ctx.collision.addBox({ x, z, y0: y, h: 1.8, w: 1.4, d: 1.4, tag: 'plinth' });
    ctx.collision.addCylinder({ x, z, y0: y + 1.8, h: 1.65, r: 0.35, tag: 'statue' });
    ctx.collision.addPerch({ x, y: y + 3.67, z, r: 0.18, id: `mall-statue-${k}`, kind: 'statue' });
  }
};

B['bethesda'] = (L, ctx) => {
  const upper = 1.6, lower = -0.45;
  const x0 = -5.5, x1 = 18.7, zEdge = 272;     // the lower terrace starts at zEdge
  const cx = L.x;
  // the arcade face under Terrace Drive, with its arches, between the two staircases
  const faceW = 11;
  ctx.batch.box('stone', { x: cx, y: lower, z: zEdge - 1.2 }, { w: faceW, h: upper - lower + 0.05, d: 2.4 });
  for (let k = 0; k < 3; k++) ctx.batch.box('glassDark', { x: cx - 3.4 + k * 3.4, y: lower, z: zEdge + 0.02 }, { w: 2.2, h: 1.7, d: 0.05 });
  ctx.collision.addBox({ x: cx, z: zEdge - 1.2, y0: lower, h: upper - lower, w: faceW, d: 2.4, tag: 'terrace' });
  // the two grand staircases, descending north on either side of the arcade
  for (const side of [-1, 1]) {
    const sx = cx + side * (faceW / 2 + 2.2);
    const steps = 8, run = 0.85;
    for (let k = 0; k < steps; k++) {
      const top = upper - ((k + 1) * (upper - lower)) / (steps + 1);
      const z = zEdge - 2.4 + k * run + run / 2;
      ctx.batch.box('pavers', { x: sx, y: lower - 0.05, z }, { w: 4.2, h: top - lower + 0.05, d: run });
      ctx.collision.addBox({ x: sx, z, y0: lower - 0.05, h: top - lower + 0.05, w: 4.2, d: run, tag: 'steps' });
    }
    // stair walls
    solid(ctx, 'stoneDark', { x: sx + side * 2.4, z: zEdge + 1, y: lower, w: 0.6, h: upper - lower + 0.9, d: 7 }, { tag: 'balustrade' });
  }
  // balustrades: along the upper terrace's edge and round the lower terrace
  const bal = (x, z, w, d, y) => solid(ctx, 'cream', { x, z, y, w, h: 0.95, d }, { tag: 'balustrade' });
  bal(cx - faceW / 2 - 9, zEdge - 0.4, 9.5, 0.5, upper);
  bal(cx + faceW / 2 + 9, zEdge - 0.4, 9.5, 0.5, upper);
  bal(cx, zEdge - 0.2, faceW, 0.5, upper);
  bal(x0 - 0.3, 284, 0.5, 24, lower);
  bal(x1 + 0.3, 284, 0.5, 24, lower);
  // retaining walls under the side balustrades (the lower terrace is sunk below the slope)
  ctx.batch.box('stone', { x: x0 - 1.0, y: lower, z: 284 }, { w: 1.4, h: 2.4, d: 24 });
  ctx.batch.box('stone', { x: x1 + 1.0, y: lower, z: 284 }, { w: 1.4, h: 2.4, d: 24 });
  // water steps at the Lake
  for (let k = 0; k < 3; k++) ctx.batch.box('pavers', { x: cx, y: lower - 0.25 * (k + 1), z: 296.6 + k * 0.6 }, { w: 22, h: 0.25, d: 0.6 });
  block(ctx, x0 - 12, x1 + 12, 252, 300);
};

B['fountain'] = (L, ctx) => {
  const y = -0.45;
  ctx.batch.mesh('stone', new THREE.CylinderGeometry(L.r, L.r + 0.2, 0.7, 32, 1, true), { x: L.x, y: y + 0.35, z: L.z });
  ctx.batch.mesh('cream', new THREE.TorusGeometry(L.r, 0.22, 6, 32).rotateX(Math.PI / 2), { x: L.x, y: y + 0.7, z: L.z });
  ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(L.r - 0.1, L.r - 0.1, 0.05, 32), { x: L.x, y: y + 0.45, z: L.z });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 0.8, r: L.r + 0.2, tag: 'fountain-rim' });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    ctx.collision.addPerch({ x: L.x + Math.cos(a) * L.r, y: y + 0.92, z: L.z + Math.sin(a) * L.r, r: 0.3, id: `bethesda-rim-${k}`, kind: 'rim' });
  }
  if (!glb(ctx, L, y)) {
    // tiered pedestal and the angel (stand-in)
    ctx.batch.mesh('stone', new THREE.CylinderGeometry(1.4, 1.9, 1.6, 12), { x: L.x, y: y + 1.2, z: L.z });
    ctx.batch.mesh('cream', new THREE.CylinderGeometry(2.6, 1.0, 0.5, 16), { x: L.x, y: y + 2.2, z: L.z });
    ctx.batch.mesh('stone', new THREE.CylinderGeometry(0.6, 0.8, 1.6, 10), { x: L.x, y: y + 3.2, z: L.z });
    ctx.batch.mesh('cream', new THREE.CylinderGeometry(1.5, 0.6, 0.35, 14), { x: L.x, y: y + 4.1, z: L.z });
    ctx.batch.mesh('bronze', new THREE.CapsuleGeometry(0.42, 1.3, 4, 8), { x: L.x, y: y + 5.2, z: L.z });
    for (const s of [-1, 1]) ctx.batch.box('bronze', { x: L.x + s * 0.9, y: y + 5.3, z: L.z - 0.2 }, { w: 1.4, h: 1.3, d: 0.12 }, { roll: s * 0.5 });
  }
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 6.4, r: 0.6, tag: 'angel', walkable: false });
  ctx.collision.addPerch({ x: L.x, y: y + 6.45, z: L.z, r: 0.25, id: 'bethesda-angel', kind: 'statue' });
};

B['mosaic'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z) + 0.03;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 24; k++) {
    g.fillStyle = k % 2 ? '#2d2b28' : '#e9e3d6';
    g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 126, (k / 24) * Math.PI * 2, ((k + 1) / 24) * Math.PI * 2); g.fill();
  }
  g.fillStyle = '#e9e3d6'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2d2b28'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 36, 0, Math.PI * 2); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(L.r, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, map: tex }));
  m.position.set(L.x, y, L.z);
  m.receiveShadow = true;
  ctx.dynamic.add(m);
};

const COARSE_BOW = false;   // batch-3: the old 14-box collision (see below)
B['bow-bridge'] = (L, ctx) => {
  const W = local(L);
  const endA = W(0, -L.span / 2), endB = W(0, L.span / 2);
  const yA = ctx.heightAt(endA.x, endA.z), yB = ctx.heightAt(endB.x, endB.z);
  const n = 14;
  const deckY = (t) => yA + (yB - yA) * t + Math.sin(t * Math.PI) * L.rise + 0.15;
  const usingGlb = glb(ctx, { ...L, y: Math.min(yA, yB) }, Math.min(yA, yB));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
    const p = W(0, -L.span / 2 + L.span * tm);
    const y = deckY(tm);
    const seg = L.span / n + 0.05;
    const pitch = -Math.atan2(deckY(t1) - deckY(t0), L.span / n);
    if (!usingGlb) {
      ctx.batch.box('cream', { x: p.x, y: y - 0.25, z: p.z }, { w: L.width, h: 0.25, d: seg }, { yaw: L.yaw, pitch });
      // the cast-iron arch girders below
      for (const s of [-1, 1]) {
        const q = W(s * (L.width / 2 - 0.1), -L.span / 2 + L.span * tm);
        ctx.batch.box('cream', { x: q.x, y: y - 0.25 - 0.55 * (1 - Math.sin(tm * Math.PI)), z: q.z }, { w: 0.15, h: 0.55 * (1 - Math.sin(tm * Math.PI)) + 0.05, d: seg }, { yaw: L.yaw, pitch });
      }
    }
    if (!COARSE_BOW) continue;
    ctx.collision.addBox({ x: p.x, z: p.z, y0: y - 0.6, h: 0.6, w: L.width, d: seg, yaw: L.yaw, tag: 'bridge' });
  }
  // batch-3 (#17): the walkable deck in finer steps (14 flat boxes rose up to 0.34 m each near the ends, more than a step:
  // nobody could walk onto Bow Bridge); 48 boxes rise at most ~0.1 m, and the first sits within a step of the ground
  const nc = 48;
  for (let i = 0; i < nc; i++) {
    const tm = (i + 0.5) / nc, p = W(0, -L.span / 2 + L.span * tm);
    ctx.collision.addBox({ x: p.x, z: p.z, y0: deckY(tm) - 0.6, h: 0.6, w: L.width, d: L.span / nc + 0.05, yaw: L.yaw, tag: 'bridge' });
  }
  // railings (the rail texture, cream) and their perch edges
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const a = W(s * (L.width / 2), -L.span / 2 + L.span * t0), b = W(s * (L.width / 2), -L.span / 2 + L.span * t1);
      const ya = deckY(t0), yb = deckY(t1);
      if (!usingGlb) {
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const g = new THREE.PlaneGeometry(len, 1.05);
        const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len, uv.getY(k) * 1.05);
        g.translate(0, 0.52, 0);
        ctx.batch.mesh('railCream', g, { x: (a.x + b.x) / 2, y: (ya + yb) / 2, z: (a.z + b.z) / 2, yaw: L.yaw + Math.PI / 2, roll: 0, pitch: 0 });
        ctx.batch.box('cream', { x: (a.x + b.x) / 2, y: (ya + yb) / 2 + 1.0, z: (a.z + b.z) / 2 }, { w: 0.12, h: 0.08, d: len + 0.05 }, { yaw: L.yaw, pitch: -Math.atan2(yb - ya, len) });
      }
      ctx.collision.addBox({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y0: (ya + yb) / 2, h: 1.05, w: 0.1, d: L.span / n, yaw: L.yaw, tag: 'rail', walkable: false });
      ctx.collision.addPerchEdge({ a: { x: a.x, y: ya + 1.08, z: a.z }, b: { x: b.x, y: yb + 1.08, z: b.z }, id: `bow-rail-${s}-${i}`, kind: 'rail', out: L.yaw + (s > 0 ? -Math.PI / 2 : Math.PI / 2) });
    }
  }
};

B['boathouse'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'cream', { x: L.x + 2, z: L.z, y, w: 9, h: 4.6, d: 18 }, { perch: false });
  roofPrism(ctx, 'copper', { x: L.x + 2, z: L.z, y: y + 4.6, w: 10.2, d: 19.2, h: 2.4, alongZ: true });
  // the lakeside terrace on piles, with a green awning
  const tx = L.x - 4.5;
  ctx.batch.box('wood', { x: tx, y: -1.2, z: L.z }, { w: 5, h: 0.9 + y, d: 16 });   // fix-27: drawn at its collider (it was 0.6 m above it, so Gus walked at the water's level beside the boards)
  ctx.collision.addBox({ x: tx, z: L.z, y0: -1.2, h: 0.3 + y + 0.6, w: 5, d: 16, tag: 'deck' });
  ctx.batch.box('green', { x: tx, y: y + 3, z: L.z }, { w: 5, h: 0.15, d: 16 });
  for (const dz of [-7.5, -2.5, 2.5, 7.5]) ctx.batch.box('green', { x: tx - 2.3, y: y - 0.3, z: L.z + dz }, { w: 0.2, h: 3.3, d: 0.2 });   // (fix-27 review: down to the lowered boards)
  ctx.collision.addBox({ x: tx, z: L.z, y0: y + 3, h: 0.15, w: 5, d: 16, tag: 'awning' });
  rimPerches(ctx, { x: tx, z: L.z, y: y + 3.15, w: 5, d: 16, tag: 'awning' });
  // rowboats moored along the shore
  const water = ctx.collision.waterAt(L.x - 10, L.z) || { level: -1 };
  for (let k = 0; k < 7; k++) {
    const bx = L.x - 9.5 - (k % 2) * 0.4, bz = L.z - 9 + k * 2.6;
    ctx.batch.mesh('wood', new THREE.CapsuleGeometry(0.55, 2.0, 3, 8).rotateX(Math.PI / 2).scale(1, 0.4, 1), { x: bx, y: water.level + 0.1, z: bz, yaw: 1.4 });
    ctx.collision.addPerch({ x: bx, y: water.level + 0.32, z: bz, r: 0.6, id: `rowboat-${k}`, kind: 'boat' });
  }
  // fix-25: the roof collides as its prism (roofPrism); the ridge perch is on the ridge (it was 1 m down, inside the roof)
  rimPerches(ctx, { x: L.x + 2, z: L.z, y: y + 7.0, w: 0.3, d: 18, tag: 'ridge', sides: [2] });
  block(ctx, L.x - 9, L.x + 9, L.z - 11, L.z + 11);
};

B['kiosk'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'cream', { x: L.x, z: L.z, y, w: L.w, h: L.h, d: L.d }, { perch: false });
  ctx.batch.box('copper', { x: L.x, y: y + L.h, z: L.z }, { w: L.w + 0.6, h: 0.35, d: L.d + 0.6 });
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y + L.h, h: 0.35, w: L.w + 0.6, d: L.d + 0.6, tag: 'roof' });
  rimPerches(ctx, { x: L.x, z: L.z, y: y + L.h + 0.35, w: L.w + 0.6, d: L.d + 0.6, tag: 'roof' });
  block(ctx, L.x - L.w / 2 - 2, L.x + L.w / 2 + 2, L.z - L.d / 2 - 2, L.z + L.d / 2 + 2);
};

B['belvedere'] = (L, ctx) => {
  const y = 8.6;
  const towerTop = y + 15;
  if (!glb(ctx, L, y)) {
    solid(ctx, 'schist', { x: L.x - 2, z: L.z, y, w: 11, h: 6.5, d: 8 }, { perch: false });
    crenels(ctx, { x: L.x - 2, z: L.z, y: y + 6.5, w: 11, d: 8 });
    solid(ctx, 'schist', { x: L.x + 5, z: L.z + 1.5, y, w: 5, h: 15, d: 5 }, { perch: false });
    crenels(ctx, { x: L.x + 5, z: L.z + 1.5, y: towerTop, w: 5, d: 5 });
    ctx.batch.mesh('schist', new THREE.CylinderGeometry(1.4, 1.4, 10.5, 10), { x: L.x - 7.2, y: y + 5.25, z: L.z - 3.6 });
    ctx.batch.mesh('slate', new THREE.ConeGeometry(1.8, 3, 10), { x: L.x - 7.2, y: y + 12, z: L.z - 3.6 });
    ctx.batch.box('iron', { x: L.x + 5, y: towerTop, z: L.z + 1.5 }, { w: 0.08, h: 4, d: 0.08 });
    ctx.batch.box('red', { x: L.x + 5.6, y: towerTop + 3, z: L.z + 1.5 }, { w: 1.2, h: 0.7, d: 0.03 });
    // roofs: slate pavilion over the hall
    roofPrism(ctx, 'slate', { x: L.x - 2, z: L.z, y: y + 6.5, w: 8, d: 5, h: 2.2 });
  } else {
    ctx.collision.addBox({ x: L.x, z: L.z, y0: y, h: 6.5, w: 16, d: 10, tag: 'castle' });
    // Fixes-1: the model's slate finial stands 0.8 m from the summit perch, up to ~24.8 m, with no collision; from the
    // east or west the follow camera sat behind it and lost Gus. Camera-only: it pushes the camera in, nothing else.
    ctx.collision.addCamBlocker?.({ x: L.x + 4.26, z: L.z + 1.14, y0: y + 13.9, h: 2.4, r: 0.45 });
  }
  ctx.collision.addBox({ x: L.x - 2, z: L.z, y0: y, h: 6.5, w: 11, d: 8, tag: 'castle' });
  ctx.collision.addBox({ x: L.x + 5, z: L.z + 1.5, y0: y, h: 15, w: 5, d: 5, tag: 'castle' });
  ctx.collision.addCylinder({ x: L.x - 7.2, z: L.z - 3.6, y0: y, h: 13.5, r: 1.4, tag: 'castle' });
  rimPerches(ctx, { x: L.x - 2, z: L.z, y: y + 6.5, w: 11, d: 8, tag: 'battlement' });
  rimPerches(ctx, { x: L.x + 5, z: L.z + 1.5, y: towerTop, w: 5, d: 5, tag: 'tower' });
  ctx.collision.addPerch({ x: L.x + 5, y: towerTop, z: L.z + 1.5, r: 2.2, id: 'belvedere-tower', kind: 'summit' });
  summit(ctx, 'belvedere', { x: L.x + 5, y: towerTop, z: L.z + 1.5 });
  // the terrace wall overlooking Turtle Pond
  solid(ctx, 'stoneDark', { x: L.x, z: L.z + 6.8, y: y - 0.4, w: 20, h: 1.4, d: 0.6 }, { tag: 'terrace-wall' });
  block(ctx, L.x - 11, L.x + 10, L.z - 8, L.z + 8);
};

B['delacorte'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  const a0 = (L.yaw || 0) + Math.PI * 0.15, a1 = (L.yaw || 0) + Math.PI * 1.85;
  for (let k = 0; k < 5; k++) {
    const r0 = 4.5 + k * 1.7, r1 = r0 + 1.75;
    ctx.batch.mesh(k === 4 ? 'woodDark' : 'wood', annulusSector(r0, r1, a0, a1, 0.45 + k * 0.5, 20), { x: L.x, y, z: L.z });
  }
  // outer wall
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / segs;
    const r = L.r + 0.2;
    const len = (r * (a1 - a0)) / segs + 0.1;
    const x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r;
    solid(ctx, 'woodDark', { x, z, y, w: 0.6, h: 3.6, d: len, yaw: -a }, { tag: 'theatre-wall' });
  }
  // stage and stage house
  const sa = (L.yaw || 0);
  const sx = L.x + Math.cos(sa) * 2.2, sz = L.z + Math.sin(sa) * 2.2;
  solid(ctx, 'woodDark', { x: sx, z: sz, y, w: 6, h: 0.9, d: 7, yaw: -sa }, { tag: 'stage' });
  const hx = L.x + Math.cos(sa) * -1.2, hz = L.z + Math.sin(sa) * -1.2;
  for (const s of [-1, 1]) {
    const tx = hx - Math.sin(sa) * s * 4, tz = hz + Math.cos(sa) * s * 4;
    solid(ctx, 'scaffold', { x: tx, z: tz, y, w: 1.2, h: 9, d: 1.2 }, { tag: 'light-tower' });
  }
  blockAround(ctx, L.x, L.z, L.r + 3);
};

B['garden-beds'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  for (let k = 0; k < 4; k++) {
    const x = L.x - L.w / 2 + 2 + k * (L.w - 4) / 3;
    ctx.batch.box('hedge', { x, y, z: L.z }, { w: 2.4, h: 0.55, d: L.d - 2 });
    ctx.batch.box(k % 2 ? 'red' : 'gold', { x, y: y + 0.55, z: L.z }, { w: 1.8, h: 0.12, d: L.d - 2.6 });
    ctx.collision.addBox({ x, z: L.z, y0: y, h: 0.6, w: 2.4, d: L.d - 2, tag: 'hedge' });
  }
};

B['yard'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'brickPlain', { x: L.x + L.w / 2 - 4, z: L.z, y, w: 7, h: 4, d: L.d - 1 }, { tag: 'yard-shed' });
  ctx.batch.box('roof', { x: L.x + L.w / 2 - 4, y: y + 4, z: L.z }, { w: 7.4, h: 0.2, d: L.d - 0.6 });
  for (let k = 0; k < 3; k++) {
    const x = L.x - L.w / 2 + 2.5 + k * 3.4;
    ctx.batch.box('green', { x, y, z: L.z }, { w: 1.4, h: 1.4, d: 2.6 });
    ctx.collision.addBox({ x, z: L.z, y0: y, h: 1.4, w: 1.4, d: 2.6, tag: 'cart' });
  }
};

B['cave'] = (L, ctx) => {
  const rock = ROCKS.find((r) => r.id === 'ramble-cave');
  const y = ctx.heightAt(rock.x, rock.z);
  const c = Math.cos(L.yaw), s = Math.sin(L.yaw);
  const fx = rock.x + s * (rock.rz * 0.82), fz = rock.z + c * (rock.rz * 0.82);
  ctx.batch.box('rubber', { x: fx, y: y - 0.1, z: fz }, { w: 2.2, h: 2.0, d: 0.4 }, { yaw: L.yaw });
  for (let k = 0; k < 4; k++) ctx.batch.mesh('schist', rockGeometry(40 + k), { x: fx + (k - 1.5) * 0.6, y: y + 0.25 + (k % 2) * 0.35, z: fz + c * 0.25, scale: 0.45 });
};

B['obelisk'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  for (let k = 0; k < 3; k++) ctx.batch.box('stone', { x: L.x, y: y + k * 0.45, z: L.z }, { w: 6 - k * 1.2, h: 0.45, d: 6 - k * 1.2 });
  const shaft = new THREE.CylinderGeometry(0.95, 1.45, L.h, 4, 1, false, Math.PI / 4).translate(0, L.h / 2, 0);
  ctx.batch.mesh('brickPlain', shaft, { x: L.x, y: y + 1.35, z: L.z });
  ctx.batch.mesh('gold', new THREE.ConeGeometry(0.95, 1.4, 4, 1, false, Math.PI / 4), { x: L.x, y: y + 1.35 + L.h + 0.7, z: L.z });
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y, h: 1.35, w: 6, d: 6, tag: 'plinth' });
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y + 1.35, h: L.h, w: 2.2, d: 2.2, tag: 'obelisk', walkable: false });
  const tip = y + 1.35 + L.h + 1.42;
  ctx.collision.addPerch({ x: L.x, y: tip, z: L.z, r: 0.2, id: 'needle-tip', kind: 'summit' });
  summit(ctx, 'cleopatras-needle', { x: L.x, y: tip, z: L.z });
  blockAround(ctx, L.x, L.z, 5);
};

B['met'] = (L, ctx) => {
  const y = 0.5;
  // fix-25: the roof slab and the glass wing's top collide, and their rims are the perches (they were drawn on top of
  // perches and collision 0.5 m and 2.4 m lower, hiding a stray and a golden pretzel)
  solid(ctx, 'facadeLimestone', { x: L.x, z: L.z, y, w: L.w, h: 22, d: L.d }, { perch: false });
  ctx.batch.box('roof', { x: L.x, y: y + 22, z: L.z }, { w: L.w + 0.6, h: 0.5, d: L.d + 0.6 }, { skip: ['bottom'] });
  ctx.collision.addBox({ x: L.x, z: L.z, y0: y + 22, h: 0.5, w: L.w + 0.6, d: L.d + 0.6, tag: 'roof' });
  rimPerches(ctx, { x: L.x, z: L.z, y: y + 22.5, w: L.w + 0.6, d: L.d + 0.6, tag: 'building' });
  // the glass back wing facing the park (scenery)
  solid(ctx, 'facadeGlass', { x: L.x - L.w / 2 - 5, z: L.z + 4, y, w: 10, h: 13, d: 52 }, { perch: false });
  ctx.batch.box('glassDark', { x: L.x - L.w / 2 - 5, y: y + 13, z: L.z + 4 }, { w: 10.4, h: 2.4, d: 52.4 }, { pitch: 0, roll: 0.0 });
  ctx.collision.addBox({ x: L.x - L.w / 2 - 5, z: L.z + 4, y0: y + 13, h: 2.4, w: 10.4, d: 52.4, tag: 'roof' });
  rimPerches(ctx, { x: L.x - L.w / 2 - 5, z: L.z + 4, y: y + 15.4, w: 10.4, d: 52.4, tag: 'building' });
  block(ctx, L.x - L.w / 2 - 12, L.x + L.w / 2 + 2, L.z - L.d / 2 - 2, L.z + L.d / 2 + 2);
};

B['ballfields'] = (L, ctx) => {
  const fields = L.small ? [[-12, 0, 0.6], [14, 2, 2.2]] : [[-22, -24, 0.7], [20, -26, 2.4], [-26, 22, -0.7], [24, 24, -2.4], [0, -32, 1.57], [0, 30, -1.57]];
  for (const [dx, dz, yaw] of fields) {
    const x = L.x + dx, z = L.z + dz;
    const y = ctx.heightAt(x, z);
    const dia = new THREE.CircleGeometry(7, 4, Math.PI / 4).rotateX(-Math.PI / 2);
    ctx.batch.mesh('dirt', scaleUV(dia, 7), { x, y: y + 0.03, z, yaw });
    // backstop fence (batch-3 #12: a pipe frame and chain-link, fences.js; collision and perches as before)
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const bx = x - s * 8.5, bz = z - c * 8.5;
    backstop(ctx, { x: bx, z: bz, yaw, y });
    ctx.collision.addBox({ x: bx, z: bz, y0: y, h: 3, w: 8, d: 0.1, yaw, tag: 'fence', walkable: false });
    rimPerches(ctx, { x: bx, z: bz, y: y + 3, w: 8, d: 0.1, yaw, tag: 'fence', inset: 0, sides: [0] });
  }
};

B['gatehouse'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  solid(ctx, 'schist', { x: L.x, z: L.z, y, w: 7, h: 4.5, d: 5.5, yaw: L.yaw }, { perch: false });
  roofPrism(ctx, 'slate', { x: L.x, z: L.z, y: y + 4.5, w: 7.6, d: 6, h: 2.4, yaw: L.yaw });
  rimPerches(ctx, { x: L.x, z: L.z, y: y + 6.9, w: 7.0, d: 0.3, yaw: L.yaw, tag: 'ridge', sides: [0] });   // (fix-25: the roof collides as its prism)
  blockAround(ctx, L.x, L.z, 6);
};

B['fence-ring'] = (L, ctx) => {
  const e = L.ellipse;
  const poly = ellipsePoly(e.cx, e.cz, e.rx, e.rz, e.n, e.exp);
  const pts = samplePolyline(poly, 3, { closed: true });
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.5) continue;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const y = ctx.heightAt(mx, mz);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    // batch-3 (#12): a 3D iron picket fence on the ground at each picket and post (fences.js); collision and perches as before
    reservoirPanel(ctx, a, b, { post: i % 2 === 0, postTop: y + 1.33 });
    ctx.collision.addBox({ x: mx, z: mz, y0: y, h: 1.25, w: len, d: 0.08, yaw, tag: 'fence', walkable: false });
    if (i % 2 === 0) {
      ctx.collision.addPerch({ x: a.x, y: y + 1.33, z: a.z, r: 0.12, id: `res-post-${i}`, kind: 'post' });
    }
  }
};

B['gate-posts'] = (L, ctx) => {
  for (const s of [-1, 1]) {
    const x = L.x, z = L.z + s * 4.5;
    solid(ctx, 'stone', { x, z, y: 0, w: 1.4, h: 3.2, d: 1.4 }, { tag: 'gate-post' });
    ctx.batch.mesh('stoneDark', new THREE.SphereGeometry(0.5, 10, 8), { x, y: 3.6, z });
    ctx.collision.addPerch({ x, y: 4.1, z, r: 0.25, id: `engineers-post-${s}`, kind: 'finial' });
  }
};

B['formal-garden'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  // hedged parterres either side of a central lawn, a fountain at each end, and the iron gate on Fifth
  for (const [dz, r] of [[-L.d / 2 + 9, 3.2], [L.d / 2 - 9, 3.2]]) {
    ctx.batch.mesh('stone', new THREE.CylinderGeometry(r, r + 0.2, 0.6, 24), { x: L.x, y: y + 0.3, z: L.z + dz });
    ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(r - 0.25, r - 0.25, 0.05, 24), { x: L.x, y: y + 0.62, z: L.z + dz });
    ctx.batch.mesh('bronze', new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), { x: L.x, y: y + 1.4, z: L.z + dz });
    ctx.collision.addCylinder({ x: L.x, z: L.z + dz, y0: y, h: 0.65, r: r + 0.2, tag: 'fountain' });
    ctx.collision.addPerch({ x: L.x, y: y + 2.2, z: L.z + dz, r: 0.2, id: `garden-statue-${dz > 0 ? 'n' : 's'}`, kind: 'statue' });
  }
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = L.x + s * (L.w / 2 - 6), z = L.z - L.d / 2 + 8 + k * ((L.d - 16) / 3);
    ctx.batch.box('hedge', { x, y, z }, { w: 7, h: 0.9, d: 5 });
    ctx.batch.box(k % 2 ? 'gold' : 'red', { x, y: y + 0.9, z }, { w: 5.6, h: 0.15, d: 3.6 });
    ctx.collision.addBox({ x, z, y0: y, h: 1.0, w: 7, d: 5, tag: 'hedge' });
  }
  // pergola
  for (let k = 0; k < 6; k++) ctx.batch.box('cream', { x: L.x - 6 + k * 2.4, y, z: L.z + L.d / 2 - 2 }, { w: 0.3, h: 3, d: 0.3 });
  ctx.batch.box('green', { x: L.x, y: y + 3, z: L.z + L.d / 2 - 2 }, { w: 14, h: 0.25, d: 2.4 });
  // the Fifth Avenue gates
  for (const dz of [-4, 4]) solid(ctx, 'stone', { x: 109.2, z: L.z + dz, y: 0, w: 1.4, h: 3.4, d: 1.4 }, { tag: 'gate-post' });
  conservatoryGate(ctx, { x: 109.3, z: L.z });   // batch-3 (#12): wrought-iron leaves and an overthrow on the posts (fences.js)
  ctx.collision.addPerchEdge({ a: { x: 109.3, y: 4.1, z: L.z - 3 }, b: { x: 109.3, y: 4.1, z: L.z + 3 }, id: 'garden-gate-top', kind: 'gate', out: -Math.PI / 2 });
  block(ctx, L.x - L.w / 2, L.x + L.w / 2, L.z - L.d / 2, L.z + L.d / 2);
};

B['blockhouse'] = (L, ctx) => {
  const y = ctx.heightAt(L.x, L.z);
  const s = 10, t = 1.1, h = 4.6;
  const W = local(L);
  const walls = [[0, -s / 2, s, t], [0, s / 2, s, t], [-s / 2, 0, t, s], [s / 2, 0, t, s - 3.2]];
  for (const [lx, lz, w, d] of walls) {
    const p = W(lx, lz);
    solid(ctx, 'schist', { x: p.x, z: p.z, y: y - 0.5, w, h: h + 0.5, d, yaw: L.yaw }, { tag: 'blockhouse' });
  }
  block(ctx, L.x - 8, L.x + 8, L.z - 8, L.z + 8);
};

B['plaza-fountain'] = (L, ctx) => {
  const y = 0.15;
  ctx.batch.mesh('stone', new THREE.CylinderGeometry(L.r, L.r + 0.3, 0.7, 28), { x: L.x, y: y + 0.35, z: L.z });
  ctx.batch.mesh('glassDark', new THREE.CylinderGeometry(L.r - 0.25, L.r - 0.25, 0.05, 28), { x: L.x, y: y + 0.72, z: L.z });
  for (let k = 0; k < 3; k++) ctx.batch.mesh('stone', new THREE.CylinderGeometry(2.2 - k * 0.6, 1.2 - k * 0.3, 0.5, 16), { x: L.x, y: y + 1.2 + k * 1.1, z: L.z });
  ctx.batch.mesh('bronze', new THREE.CapsuleGeometry(0.35, 1.2, 4, 8), { x: L.x, y: y + 5.0, z: L.z });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y, h: 0.75, r: L.r + 0.3, tag: 'fountain' });
  ctx.collision.addCylinder({ x: L.x, z: L.z, y0: y + 0.75, h: 4.9, r: 0.8, tag: 'statue', walkable: false });
  ctx.collision.addPerch({ x: L.x, y: y + 6.0, z: L.z, r: 0.25, id: 'plaza-fountain-top', kind: 'statue' });
};

// ------------------------------------------------------------------ shared pieces
function roofPrism(ctx, mat, { x, z, y, w, d, h, alongZ = false, yaw = 0 }) {
  // a gable roof; the ridge runs along x (or z). fix-25: it collides as drawn (Gus landed on its eaves' level, inside it)
  ctx.collision.addPrism({ x, z, y0: y, h, w, d, yaw, alongZ, tag: 'roof' });
  const s = new THREE.Shape();
  const half = (alongZ ? w : d) / 2;
  s.moveTo(-half, 0); s.lineTo(half, 0); s.lineTo(0, h); s.lineTo(-half, 0);
  const len = alongZ ? d : w;
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  if (!alongZ) g.rotateY(Math.PI / 2);
  ctx.batch.mesh(mat, g, { x, y, z, yaw });
}

function crenels(ctx, { x, z, y, w, d }) {
  const n = Math.max(2, Math.round(w / 1.4)), m = Math.max(2, Math.round(d / 1.4));
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) ctx.batch.box('schist', { x: x - w / 2 + (i + 0.5) * (w / n), y, z: z + s * (d / 2 - 0.3) }, { w: w / n * 0.55, h: 0.8, d: 0.6 });
  for (let i = 0; i < m; i++) for (const s of [-1, 1]) ctx.batch.box('schist', { x: x + s * (w / 2 - 0.3), y, z: z - d / 2 + (i + 0.5) * (d / m) }, { w: 0.6, h: 0.8, d: d / m * 0.55 });
}

/** If the landmark's GLB exists, queue it for streaming and return true (the caller skips its code visual). */
function glb(ctx, L, y) {
  if (!L.model || !ctx.registry?.has(L.model)) return false;
  ctx.streams.push({ id: L.id, model: L.model, x: L.x, y, z: L.z, yaw: L.yaw || 0, size: L.size || null, zone: L.zone });
  return true;
}

// ------------------------------------------------------------------ rocks
export function buildRocks(ctx) {
  ROCKS.forEach((r, i) => {
    const water = ctx.collision.waterAt(r.x, r.z);
    const ground = ctx.heightAt(r.x, r.z);
    const y = water ? Math.max(ground, water.level - r.ry * 0.35) : ground - r.ry * 0.38;
    ctx.batch.mesh('schist', rockGeometry(i * 7 + 1), { x: r.x, y, z: r.z, yaw: r.yaw || 0, scale: { x: r.rx, y: r.ry, z: r.rz } });
    ctx.collision.addRock({ x: r.x, y, z: r.z, rx: r.rx * 0.95, ry: r.ry * 0.95, rz: r.rz * 0.95, yaw: r.yaw || 0, id: r.id });
    ctx.collision.addPerch({ x: r.x, y: y + r.ry * 0.97, z: r.z, r: Math.min(r.rx, r.rz) * 0.5, id: r.id, kind: 'rock' });
    block(ctx, r.x - r.rx, r.x + r.rx, r.z - r.rz, r.z + r.rz);
  });
}

// ------------------------------------------------------------------ transverse walls and bridges
export function buildTransverses(ctx, crossings) {
  for (const t of TRANSVERSES) {
    const bed = (x) => -t.depth * smoothstep(0, TRANSVERSE_RAMP, Math.min(x - PARK.xMin, PARK.xMax - x));
    // batch-3 (#17): where the paths cross. A bridge's deck (terrain.js fixed its height and ramped the ground to it) caps
    // the walls under it (they poked up through the deck at its ends); a shallow crossing (no bridge) leaves a gap in them
    const mine = crossings.filter((q) => q.t === t).map((c) => {
      const deep = -bed(c.x) >= 1.5, w = c.width + 1.6;
      return { c, deep, w, top: deep ? ctx.deckTops?.[`${t.id}:${Math.round(c.x * 10)}`] : null, x0: c.x - (deep ? w / 2 : c.width / 2 + 0.6), x1: c.x + (deep ? w / 2 : c.width / 2 + 0.6) };
    });
    // retaining walls, stepped to follow the ground above
    for (const side of [-1, 1]) {
      const wz = t.z + side * (t.halfWidth + 0.35);
      for (let xs = PARK.xMin + 1; xs < PARK.xMax - 1; xs += 6) {
        const xe = Math.min(PARK.xMax - 1, xs + 6);
        // the segment, less any shallow crossing's gap; the pieces under a deck end just below it
        let pieces = [[xs, xe, Infinity]];
        for (const m of mine) {
          const next = [];
          for (const [a, b, cap] of pieces) {
            if (m.x1 <= a || m.x0 >= b) { next.push([a, b, cap]); continue; }
            if (m.x0 > a) next.push([a, m.x0, cap]);
            if (m.deep && m.top != null) next.push([Math.max(a, m.x0), Math.min(b, m.x1), Math.min(cap, m.top - 0.02)]);
            if (m.x1 < b) next.push([m.x1, b, cap]);
          }
          pieces = next;
        }
        for (const [x, x1, cap] of pieces) {
          if (x1 - x < 0.05) continue;
          const mx = (x + x1) / 2;
          const top = Math.min(cap, Math.max(ctx.heightAt(x, wz + side * 2.2), ctx.heightAt(x1, wz + side * 2.2), ctx.heightAt(mx, wz + side * 2.2)) + 0.3);
          const b = Math.min(bed(x), bed(x1)) - 0.3;
          if (top - b < 0.5) continue;
          ctx.batch.box('stone', { x: mx, y: b, z: wz }, { w: x1 - x + 0.02, h: top - b, d: 0.7 });
          ctx.collision.addBox({ x: mx, z: wz, y0: b, h: top - b, w: x1 - x, d: 0.7, tag: 'cut-wall' });
        }
      }
    }
    // a stone bridge wherever a drive or path crosses
    for (const c of crossings.filter((q) => q.t === t)) {
      const depth = -bed(c.x);
      if (depth < 1.5) continue;
      const L = t.halfWidth * 2 + 5;
      const w = c.width + 1.6;
      const yS = ctx.heightAt(c.x, t.z - t.halfWidth - 2.5), yN = ctx.heightAt(c.x, t.z + t.halfWidth + 2.5);
      const top = ctx.deckTops?.[`${t.id}:${Math.round(c.x * 10)}`] ?? Math.max(yS, yN) + 0.15;   // batch-3 (#17): terrain.js's deck height
      const g = archSlab({ span: L, y0: bed(c.x) - 0.2, y1: top, thickness: w, openW: t.halfWidth * 2 - 0.6, springY: bed(c.x) + 2.6, crownY: top - 1.1 });
      ctx.batch.mesh('stone', g, { x: c.x, z: t.z });
      ctx.batch.box(c.drive ? 'asphalt' : 'gravel', { x: c.x, y: top, z: t.z }, { w: w - 0.9, h: 0.02, d: L });
      ctx.collision.addBox({ x: c.x, z: t.z, y0: top - 1.1, h: 1.1, w, d: L, tag: 'bridge' });
      for (const s of [-1, 1]) {
        const px = c.x + s * (w / 2 - 0.2);
        solid(ctx, 'stoneDark', { x: px, z: t.z, y: top, w: 0.4, h: 0.8, d: L }, { tag: 'parapet' });
      }
    }
  }
}

/** Batch-3 (the owner: no trees on a ramp or a roadway): is (x, z) on a bridge approach's walking surface? Inside an
 *  approach's footprint (terrain.js deckRamps: out to R from the deck's end, the deck's width plus its side slopes), a point
 *  is walkway if it is in the path band (the deck's width + 0.5 m) or the painted path / road / paver masks say so. Grass
 *  on the side slopes is not. Outside every footprint: false (so no tree elsewhere in the park changes). */
export function onWalkway(ramps, terrain, x, z) {
  for (const e of ramps || []) {
    const ox = x - e.x, oz = z - e.z, u = ox * e.dx + oz * e.dz, v = Math.abs(-ox * e.dz + oz * e.dx);
    if (u < -2 || u > e.ramp.R || v > e.ramp.hw + e.ramp.side) continue;
    if (v < e.ramp.hw + 0.5) return true;
    const m = terrain.groundKindAt(x, z);
    if (m.path > 0.5 || m.asphalt > 0.5 || m.pavers > 0.5) return true;
  }
  return false;
}

/** Where drives and paths cross the transverse cuts: [{t, x, width, drive}]. */
export function findCrossings(shapes) {
  const out = [];
  const lines = [...shapes.drives.map((d) => ({ line: d.line, width: d.width, drive: true })), ...shapes.paths.map((p) => ({ line: p.closed ? [...p.line, p.line[0]] : p.line, width: p.width, drive: false }))];
  for (const t of TRANSVERSES) {
    for (const l of lines) {
      for (let i = 1; i < l.line.length; i++) {
        const a = l.line[i - 1], b = l.line[i];
        if ((a.z - t.z) * (b.z - t.z) > 0 || a.z === b.z) continue;
        const k = (t.z - a.z) / (b.z - a.z);
        const x = a.x + (b.x - a.x) * k;
        if (x < PARK.xMin + 3 || x > PARK.xMax - 3) continue;
        if (out.some((o) => o.t === t && Math.abs(o.x - x) < 6)) continue;
        out.push({ t, x, width: l.width, drive: l.drive });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ build everything
export function buildLandmarks(ctx) {
  for (const L of LANDMARKS) {
    const fn = B[L.kind];
    if (!fn) { console.warn('no builder for', L.kind); continue; }
    fn(L, ctx);
  }
  buildRocks(ctx);
}

/** Streams landmark GLBs: load within 200 m of Gus, unload beyond 400 m. */
export class Streamer {
  constructor(registry, parent, list, { shadows = true, lodDist = Infinity } = {}) {
    this.shadows = shadows;
    this.lodDist = lodDist;   // perf pass: past this (from the camera) a landmark draws its simplified geometry
    this.registry = registry;
    this.parent = parent;
    this.list = list.map((s) => ({ ...s, obj: null, loading: null }));
  }
  /** p: Gus; cam: the camera (a free screenshot camera can be far from Gus). */
  update(p, cam = null) {
    for (const s of this.list) {
      const d = Math.min(Math.hypot(p.x - s.x, p.z - s.z), cam ? Math.hypot(cam.x - s.x, cam.z - s.z) : Infinity);
      if (d < 200 && !s.obj && !s.loading) {
        s.loading = this.registry.instance(s.model, { size: s.size }).then(async (obj) => {
          await simplifierReady;
          obj.position.set(s.x, s.y, s.z);
          obj.rotation.y = s.yaw;
          obj.scale.x = -1;   // counter-mirror (see main.js): the model reads as modelled
          if (!this.shadows) obj.traverse((o) => { if (o.isMesh) o.castShadow = false; });
          // perf pass: a distance LOD per mesh (a third of the triangles, UV-aware; see gfx/simplify.js)
          s.lods = [];
          if (Number.isFinite(this.lodDist)) obj.traverse((o) => { if (o.isMesh && o.geometry.index && o.geometry.index.count > 3000) s.lods.push([o, o.geometry, landmarkLod(o.geometry)]); });
          s.far = false;
          this.parent.add(obj);
          s.obj = obj;
          s.loading = null;
        });
      } else if (d > 400 && s.obj) {
        s.obj.removeFromParent();
        s.obj = null;
      }
      if (s.obj && s.lods.length) {
        const far = (cam ? Math.hypot(cam.x - s.x, cam.z - s.z) : d) > this.lodDist;
        if (far !== s.far) { s.far = far; for (const [o, full, lod] of s.lods) o.geometry = far ? lod : full; }
      }
    }
  }
  async ready() { await Promise.all(this.list.map((s) => s.loading).filter(Boolean)); }
  get loaded() { return this.list.filter((s) => s.obj).length; }
}

const LODS = new WeakMap();
function landmarkLod(geo) {
  if (!LODS.has(geo)) LODS.set(geo, simplifiedGeometry(geo, 0.35, 0.03, 2));
  return LODS.get(geo);
}

export { SUMMIT_PERCHES, BLOCK, rngFor, boxGeometry };
