// Batch-3 (#12): real 3D fences, code-built and merged into the static batch (no new draw calls for the iron: it is
// a code colour, so it rides the shared vertex-coloured `coded` material of its cell; the backstops' chain-link is
// one alpha-tested material). They replace the flat textured planes, which the owner saw "twice, one floating above
// the other, neither touching the ground": the rail texture tiled every 1.5 m on a 1.25 m plane, so the fence
// repeated up the plane over a transparent band at its foot.
//
// Every piece stands on the ground where it is: each picket and post goes down to its own heightAt (and a little
// into it); rails run straight between the ground heights at the two posts. Collision boxes and perches are NOT
// built here: landmarks.js keeps adding exactly the ones it always did.
//
//   reservoirPanel(ctx, a, b, { post })  the Reservoir's cast-iron picket fence (1.25 m), a band of hoops under the top rail
//   backstop(ctx, { x, z, yaw, y })       galvanised pipe frame + chain-link, 8 m × 3 m, top rail at y + 3 (the perch line)
//   conservatoryGate(ctx, { x, z })       the Vanderbilt Gate on Fifth: two iron leaves under an arched overthrow on the posts
//
// Low (ctx.batch.flatten is set only on Low): fewer pickets and no hoops (Low has no static shadow pass either).
// The Reservoir's pickets and hoops stay out of the static shadow proxy (perf: they'd be drawn twice for no visible shadow).

import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();

/** A geometry accumulator in world coordinates (positions, flat normals, metre UVs). */
class Geo {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
  get empty() { return this.idx.length === 0; }
  /** A quad p0..p3 (any winding); `out` is a point it should face away from (or a normal via outN). */
  quad(p0, p1, p2, p3, centre) {
    _a.subVectors(p1, p0); _b.subVectors(p3, p0); _n.crossVectors(_a, _b).normalize();
    _c.copy(p0).add(p1).add(p2).add(p3).multiplyScalar(0.25).sub(centre);
    let q = [p0, p1, p2, p3];
    if (_n.dot(_c) < 0) { _n.negate(); q = [p0, p3, p2, p1]; }
    const base = this.pos.length / 3;
    const u = Math.hypot(p1.x - p0.x, p1.z - p0.z) || Math.abs(p1.y - p0.y), v = Math.hypot(p3.x - p0.x, p3.y - p0.y, p3.z - p0.z);
    const uvs = [[0, 0], [u, 0], [u, v], [0, v]];
    for (let i = 0; i < 4; i++) { this.pos.push(q[i].x, q[i].y, q[i].z); this.nor.push(_n.x, _n.y, _n.z); }
    for (const t of uvs) this.uv.push(t[0], t[1]);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /** A bar between two end rings (each 4 corners, same order): its 4 sides, and caps if asked. */
  hexa(A, B, { caps = false, sides = [0, 1, 2, 3] } = {}) {
    const c = new THREE.Vector3();
    for (const p of [...A, ...B]) c.add(p);
    c.multiplyScalar(1 / 8);
    for (const k of sides) this.quad(A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k], c);
    if (caps) { this.quad(A[0], A[1], A[2], A[3], c); this.quad(B[0], B[1], B[2], B[3], c); }
  }
  /** A round tube (n sides) from point a to point b. */
  tube(a, b, r, n = 6) {
    const ax = new THREE.Vector3().subVectors(b, a).normalize();
    const t1 = Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(ax, t1).normalize(), v = new THREE.Vector3().crossVectors(ax, u);
    const base = this.pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2, cx = Math.cos(ang), sx = Math.sin(ang);
      const nx = u.x * cx + v.x * sx, ny = u.y * cx + v.y * sx, nz = u.z * cx + v.z * sx;
      for (const [p, w] of [[a, 0], [b, 1]]) {
        this.pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
        this.nor.push(nx, ny, nz);
        this.uv.push(i / n * 0.3, w * a.distanceTo(b));
      }
    }
    for (let i = 0; i < n; i++) {
      const k = base + i * 2;
      this.idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

/** A frame along a fence line: origin o, unit along (ux, uz), across = its perpendicular. P(s, y, t) → world point. */
function frame(o, ux, uz) {
  return (s, y, t = 0) => new THREE.Vector3(o.x + ux * s - uz * t, y, o.z + uz * s + ux * t);
}

/** A square vertical bar of width w (along) × d (across) from y0 to y1 at distance s along the frame. */
function postBar(G, P, s, y0, y1, w, d, { caps = false, y1b = null } = {}) {
  const hw = w / 2, hd = d / 2;
  const ring = (y, yb) => [P(s - hw, y, -hd), P(s + hw, yb ?? y, -hd), P(s + hw, yb ?? y, hd), P(s - hw, y, hd)];
  G.hexa(ring(y0), ring(y1, y1b), { caps });
}

/** A triangular bar (3 sides, reads as a round bar from every side) from y0 to y1. */
function picket(G, P, s, y0, y1, r) {
  const a = [P(s, y0, -r), P(s + r * 0.87, y0, r * 0.5), P(s - r * 0.87, y0, r * 0.5)];
  const b = [P(s, y1, -r), P(s + r * 0.87, y1, r * 0.5), P(s - r * 0.87, y1, r * 0.5)];
  const c = P(s, (y0 + y1) / 2, 0);
  for (let k = 0; k < 3; k++) G.quad(a[k], a[(k + 1) % 3], b[(k + 1) % 3], b[k], c);
}

/** A horizontal rail from s0 (height y0) to s1 (height y1), h tall, d deep, its bottom at the given heights. */
function rail(G, P, s0, y0, s1, y1, h, d) {
  const hd = d / 2;
  const A = [P(s0, y0, -hd), P(s0, y0, hd), P(s0, y0 + h, hd), P(s0, y0 + h, -hd)];
  const B = [P(s1, y1, -hd), P(s1, y1, hd), P(s1, y1 + h, hd), P(s1, y1 + h, -hd)];
  G.hexa(A, B);
}

/** A flat iron strap bent into a ring (or an arc a0..a1) in the fence plane: front and back faces only. */
function strap(G, P, s, y, r, { w = 0.014, t = 0.008, seg = 6, a0 = 0, a1 = Math.PI * 2, rx = 1 } = {}) {
  for (let i = 0; i < seg; i++) {
    const p = a0 + ((a1 - a0) * i) / seg, q = a0 + ((a1 - a0) * (i + 1)) / seg;
    const pt = (ang, rr, tt) => P(s + Math.cos(ang) * rr * rx, y + Math.sin(ang) * rr, tt);
    for (const tt of [-t, t]) {
      const c = P(s, y, tt * -10);   // faces away from the middle of the strap's thickness
      G.quad(pt(p, r - w / 2, tt), pt(q, r - w / 2, tt), pt(q, r + w / 2, tt), pt(p, r + w / 2, tt), c);
    }
  }
}

/** What the fences added to the static batch (debug: perf notes). */
export const fenceStats = { tris: 0, shadowTris: 0 };
function add(ctx, mat, G, opts) {
  if (G.empty) return;
  ctx.batch.add(mat, G.build(), null, opts);
  const t = G.idx.length / 3;
  fenceStats.tris += t;
  if (opts?.shadow !== false && !ctx.M[mat].alphaTest) fenceStats.shadowTris += t;
}

// ------------------------------------------------------------------ the Reservoir
const RES_H = 1.25;

/**
 * One panel of the Reservoir fence from a to b (the ring's 3 m samples), with a post at a when `post` (its cap top
 * at postTop, where landmarks.js puts the post's perch).
 */
export function reservoirPanel(ctx, a, b, { post = false, postTop = null } = {}) {
  const low = !!ctx.batch.flatten;
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  if (len < 0.05) return;
  const ga = ctx.heightAt(a.x, a.z), gb = ctx.heightAt(b.x, b.z);
  const P = frame(a, (b.x - a.x) / len, (b.z - a.z) / len);
  const gl = (s) => ga + (gb - ga) * (s / len);   // the straight line between the two feet
  const G = new Geo(), S = new Geo();   // S: the pieces that cast shadows (rails, posts); pickets and hoops don't
  // pickets: each down into its own ground
  const n = Math.max(2, Math.round(len / (low ? 0.35 : 0.2)));
  for (let i = 0; i < n; i++) {
    const s = ((i + 0.5) / n) * len;
    const p = P(s, 0);
    const foot = Math.min(gl(s), ctx.heightAt(p.x, p.z)) - 0.12;
    picket(G, P, s, foot, gl(s) + RES_H - 0.04, 0.014);
  }
  // rails: a low one, one under the hoop band, the top rail
  rail(S, P, 0, ga + 0.1, len, gb + 0.1, 0.035, 0.03);
  rail(S, P, 0, ga + 0.93, len, gb + 0.93, 0.03, 0.03);
  rail(S, P, 0, ga + RES_H - 0.06, len, gb + RES_H - 0.06, 0.05, 0.05);
  // the hoop band: a ring in every other gap between the rails
  if (!low) {
    for (let i = 0; i < n - 1; i += 2) {
      const s = ((i + 1) / n) * len;
      strap(G, P, s, gl(s) + 1.065, 0.095, { seg: 8, rx: Math.min(1, (len / n) / 0.19) });
    }
  }
  // the post: a square iron post with a flat cap (the perch sits on the cap)
  if (post) {
    const top = postTop ?? ga + 1.33;
    postBar(S, P, 0, Math.min(ga, ctx.heightAt(a.x, a.z)) - 0.2, top - 0.03, 0.09, 0.09);
    postBar(S, P, 0, top - 0.03, top, 0.13, 0.13, { caps: true });
  }
  // perf (batch-3): ~70k triangles round the whole ring on High; thin pickets' shadows are invisible, so they stay out of
  // the static shadow proxy (it would draw them all a second time)
  add(ctx, 'iron', G, { shadow: false });
  add(ctx, 'iron', S);
}

// ------------------------------------------------------------------ ballfield backstops (chain-link)
let chainTex = null;
function chainLinkMaterial(ctx) {
  if (ctx.M.chainLink) return 'chainLink';
  if (!chainTex) {
    // one diamond of galvanised wire per tile; drawn with thick enough wire that the mip levels keep it (alpha test)
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    g.strokeStyle = '#d6dadc';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(S / 2, 0); g.lineTo(S, S / 2); g.lineTo(S / 2, S); g.lineTo(0, S / 2); g.closePath();
    g.stroke();
    chainTex = new THREE.CanvasTexture(c);
    chainTex.colorSpace = THREE.SRGBColorSpace;
    chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
    chainTex.repeat.set(1 / 0.12, 1 / 0.12);   // a 6 cm mesh (one tile = 12 cm, two half-diamonds)
    chainTex.anisotropy = 4;
  }
  const m = new THREE.MeshStandardMaterial({ map: chainTex, color: 0xb9bec2, roughness: 0.6, metalness: 0, alphaTest: 0.35, side: THREE.DoubleSide });
  m.userData.rule = true;
  ctx.M.chainLink = m;
  return 'chainLink';
}

/** The backstop behind home plate: centre (x, z), facing yaw, top rail at y + 3 (the collision box's top). */
export function backstop(ctx, { x, z, yaw, y }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // the collision box's local x is (c, -s) in (x, z)
  const o = { x: x - c * 4, z: z + s * 4 };
  const P = frame(o, c, -s);
  const top = y + 3;
  const posts = [0, 8 / 3, 16 / 3, 8];
  const ground = posts.map((d) => { const p = P(d, 0); return ctx.heightAt(p.x, p.z); });
  const pipe = new Geo(), mesh = new Geo();
  posts.forEach((d, i) => {
    pipe.tube(P(d, ground[i] - 0.15), P(d, top + 0.04), i === 0 || i === 3 ? 0.05 : 0.04, 6);
  });
  pipe.tube(P(-0.05, top - 0.02), P(8.05, top - 0.02), 0.035, 6);    // the top rail (Gus perches on it)
  pipe.tube(P(0, y + 1.6), P(8, y + 1.6), 0.025, 5);                 // a middle rail
  for (let i = 0; i < 3; i++) {
    // the mesh between two posts, from just under the ground at each post to the top rail
    const s0 = posts[i] + 0.04, s1 = posts[i + 1] - 0.04;
    const g0 = ground[i] - 0.06, g1 = ground[i + 1] - 0.06;
    const base = mesh.pos.length / 3;
    const pts = [P(s0, g0), P(s1, g1), P(s1, top - 0.03), P(s0, top - 0.03)];
    const nx = s, nz = c;   // across the fence
    for (const p of pts) { mesh.pos.push(p.x, p.y, p.z); mesh.nor.push(nx, 0, nz); }
    // UVs in metres: u along, v up from a fixed datum so neighbouring panels line up
    mesh.uv.push(s0, g0 - y, s1, g1 - y, s1, top - 0.03 - y, s0, top - 0.03 - y);
    mesh.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  add(ctx, 'scaffold', pipe);   // galvanised grey (a code colour)
  add(ctx, chainLinkMaterial(ctx), mesh);
}

// ------------------------------------------------------------------ the Conservatory Garden's Vanderbilt Gate
/**
 * Two wrought-iron leaves between the stone posts at (x, z ± 4) (each 1.4 m wide, 3.4 m tall), under an arched
 * overthrow that rests on the posts' tops and carries the gate's perch edge (y 4.1, built by landmarks.js).
 */
export function conservatoryGate(ctx, { x, z }) {
  const W = 6.6;
  const P = frame({ x, z: z - W / 2 }, 0, 1);    // along +z; across = -x / +x
  const ground = (s) => Math.min(0, ctx.heightAt(x, z - W / 2 + s));
  const archTop = (s) => 2.75 + 0.3 * Math.sin(Math.PI * s / W);   // the leaves' top rail rises to the middle
  const G = new Geo(), gold = new Geo();
  // stiles: the outer edges (hinged to the posts) and the meeting stiles in the middle
  for (const s of [0.04, W / 2 - 0.035, W / 2 + 0.035, W - 0.04]) postBar(G, P, s, ground(s) - 0.05, archTop(s) + 0.04, 0.07, 0.07);
  for (const [s0, s1] of [[0, W / 2 - 0.01], [W / 2 + 0.01, W]]) {
    rail(G, P, s0, 0.12, s1, 0.12, 0.07, 0.06);     // bottom rail
    rail(G, P, s0, 0.95, s1, 0.95, 0.05, 0.05);     // lock rail
    rail(G, P, s0, 2.45, s1, 2.45, 0.04, 0.04);     // under the ring band
    // the arched top rail, in short straight pieces
    const N = 6;
    for (let k = 0; k < N; k++) {
      const a = s0 + ((s1 - s0) * k) / N, b = s0 + ((s1 - s0) * (k + 1)) / N;
      rail(G, P, a, archTop(a) - 0.03, b, archTop(b) - 0.03, 0.06, 0.05);
    }
  }
  // bars every 0.15 m, through the top rail, each with a gilded spear tip
  const gap = 0.15;
  for (let s = 0.04 + gap; s < W - 0.1; s += gap) {
    if (Math.abs(s - W / 2) < 0.08) continue;
    const t = archTop(s) + 0.16;
    picket(G, P, s, ground(s) - 0.05, t, 0.013);
    const r = 0.028, a = [P(s, t, -r), P(s + r * 0.87, t, r * 0.5), P(s - r * 0.87, t, r * 0.5)], tip = P(s, t + 0.13, 0);
    const c = P(s, t + 0.03, 0);
    for (let k = 0; k < 3; k++) gold.quad(a[k], a[(k + 1) % 3], tip, tip, c);
  }
  // a band of rings between 2.49 and the arch, and a ring band low down between the bottom and lock rails
  for (let s = 0.04 + gap * 1.5; s < W - 0.1; s += gap) {
    if (Math.abs(s - W / 2) < 0.1) continue;
    strap(G, P, s, 2.62, 0.065, { seg: 8 });
    strap(G, P, s, 0.55, 0.065, { seg: 8 });
  }
  // the overthrow, on the posts' tops (3.4): a bottom bar, a top bar (its top is the perch edge at 4.1), scrolls
  // between them and a gilded medallion in the middle
  const o0 = -0.95, o1 = W + 0.95;   // over the posts (centred 0.7 m outside the leaves)
  rail(G, P, o0, 3.4, o1, 3.4, 0.08, 0.1);
  rail(G, P, o0, 4.02, o1, 4.02, 0.08, 0.1);
  for (const s of [o0 + 0.05, -0.35, W + 0.35, o1 - 0.05]) postBar(G, P, s, 3.48, 4.02, 0.06, 0.06);
  for (let k = 0; k < 10; k++) {
    const s = 0.33 + k * ((W - 0.66) / 9);
    if (Math.abs(s - W / 2) < 0.4) continue;
    strap(G, P, s, 3.71, 0.22, { seg: 8, a0: 0, a1: Math.PI, rx: 1.4 });   // arches springing from the bottom bar
    strap(G, P, s, 3.71, 0.1, { seg: 6 });
  }
  strap(gold, P, W / 2, 3.72, 0.26, { seg: 12, w: 0.05, t: 0.02 });
  strap(gold, P, W / 2, 3.72, 0.12, { seg: 8, w: 0.04, t: 0.02 });
  add(ctx, 'iron', G);
  add(ctx, 'gold', gold);
}
