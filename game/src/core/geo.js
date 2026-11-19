// 2D geometry helpers on the ground plane ({x, z} points, metres).

/** Closed Catmull-Rom spline through the points → a denser closed polygon. */
export function smoothClosed(pts, perSeg = 6) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < perSeg; s++) out.push(catmull(p0, p1, p2, p3, s / perSeg));
  }
  return out;
}

/** Open Catmull-Rom spline (end points repeated). */
export function smoothOpen(pts, perSeg = 6) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < perSeg; s++) out.push(catmull(p0, p1, p2, p3, s / perSeg));
  }
  out.push({ ...pts[n - 1] });
  return out;
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function polyBounds(poly) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  return { x0, x1, z0, z1 };
}

export function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].z - poly[i].z);
  return a / 2;
}

/** Distance from (x, z) to segment ab; also writes the param t to out.t if given. */
export function distToSegment(x, z, a, b, out) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const l2 = dx * dx + dz * dz || 1e-9;
  let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  if (out) out.t = t;
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

export function distToPolyline(x, z, pts, closed = false) {
  let d = Infinity;
  const n = pts.length;
  for (let i = 0; i < n - (closed ? 0 : 1); i++) d = Math.min(d, distToSegment(x, z, pts[i], pts[(i + 1) % n]));
  return d;
}

export function polylineLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return l;
}

/** Points every `spacing` metres along a polyline, with unit tangents: [{x, z, tx, tz, s}]. */
export function samplePolyline(pts, spacing, { closed = false, offset = 0 } = {}) {
  const seq = closed ? [...pts, pts[0]] : pts;
  const out = [];
  let carry = offset;
  let s = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    const tx = (b.x - a.x) / len, tz = (b.z - a.z) / len;
    let d = carry;
    while (d <= len) {
      out.push({ x: a.x + tx * d, z: a.z + tz * d, tx, tz, s: s + d });
      d += spacing;
    }
    carry = d - len;
    s += len;
  }
  return out;
}

/** Superellipse polygon (exp 2 = ellipse; larger = squarer). */
export function ellipsePoly(cx, cz, rx, rz, n = 48, exp = 2, rot = 0) {
  const out = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const x = rx * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / exp);
    const z = rz * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / exp);
    out.push({ x: cx + x * c - z * s, z: cz + x * s + z * c });
  }
  return out;
}

/** Offset a closed polygon outward by d (approximate, per-vertex normals). */
export function offsetClosed(poly, d) {
  const n = poly.length;
  const sign = polyArea(poly) > 0 ? 1 : -1;
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    let tx = b.x - a.x, tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    // outward normal for a CCW-in-(x,z) polygon
    return { x: p.x - tz * d * sign, z: p.z + tx * d * sign };
  });
}

/** A ribbon polygon around an open polyline (for streams). widths: number or fn(t 0..1). */
export function ribbon(pts, width) {
  const left = [], right = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    const w = (typeof width === 'function' ? width(i / (n - 1)) : width) / 2;
    left.push({ x: pts[i].x - tz * w, z: pts[i].z + tx * w });
    right.push({ x: pts[i].x + tz * w, z: pts[i].z - tx * w });
  }
  return [...left, ...right.reverse()];
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
