// Resolves layout.js outlines (smoothed outlines, ellipses, stream ribbons and
// polylines) into plain polygons, once. Shared by terrain, water, trees, props
// and the far layer, so everything agrees on where the water and paths are.

import { WATER, LAWNS, PATHS, DRIVES, PLAZAS, WOODS, TRANSVERSES, TRANSVERSE_RAMP, PARK } from './layout.js';
import { smoothClosed, smoothOpen, ellipsePoly, ribbon, polyBounds } from '../core/geo.js';

let cache = null;

function outlineOf(d, perSeg = 6) {
  if (d.ellipse) {
    const e = d.ellipse;
    return ellipsePoly(e.cx ?? e.x, e.cz ?? e.z, e.rx, e.rz, e.n || 48, e.exp || 2, e.rot || 0);
  }
  if (d.stream) return ribbon(smoothOpen(d.stream.pts, 6), d.stream.width);
  return d.smooth === false ? d.outline.map((p) => ({ ...p })) : smoothClosed(d.outline, perSeg);
}

export function shapes() {
  if (cache) return cache;
  const water = WATER.map((w) => {
    const poly = outlineOf(w, 6);
    return { ...w, poly, b: polyBounds(poly), centre: w.stream ? w.stream.pts[Math.floor(w.stream.pts.length / 2)] : null };
  });
  const lawns = LAWNS.map((l) => ({ ...l, poly: outlineOf(l, 5), b: null })).map((l) => ({ ...l, b: polyBounds(l.poly) }));
  const line = (p) => (p.ellipse ? outlineOf(p) : p.closed ? smoothClosed(p.points, 5) : smoothOpen(p.points, 5));
  // fix-26: genLine (from genPoints): the line a re-routed path had, which tree, lamp and bench placement still use
  const paths = PATHS.map((p) => ({ ...p, line: line(p), genLine: p.genPoints ? line({ ...p, points: p.genPoints }) : null, closed: !!(p.closed || p.ellipse) }));
  const drives = DRIVES.map((d) => ({ ...d, line: smoothOpen(d.points, 6), closed: false }));
  // #50: every path and drive runs straight onto its bridge over a transverse cut (they crossed at an angle, so the
  // bridge, built straight across, stood to one side of the path). The old line stays as genLine, which tree, lamp and
  // bench placement use, so nothing else in the park moves. The bridle path no longer dips into the 86th St cut.
  for (const p of paths) {
    if (p.kind === 'bridle') {
      const out = trimBridle(p.line);
      if (out) { p.genLine = p.genLine || p.line; p.line = out; p.closed = false; }
      continue;
    }
    const out = straightenAtCuts(p.line, p.closed, 8);
    if (out) { p.genLine = p.genLine || p.line; p.line = out.line; p.closed = out.closed; }
  }
  for (const d of drives) {
    const out = straightenAtCuts(d.line, false, 16);
    if (out) { d.genLine = d.line; d.line = out.line; }
  }
  const plazas = PLAZAS.map((p) => ({ ...p, poly: p.outline.map((q) => ({ ...q })) }));
  const woods = WOODS.map((w) => ({ ...w, poly: smoothClosed(w.outline, 4) })).map((w) => ({ ...w, b: polyBounds(w.poly) }));
  cache = { water, lawns, paths, drives, plazas, woods };
  return cache;
}

// ------------------------------------------------------------------ #50: straight across the cuts
/** How deep a transverse cut is at x (a crossing shallower than 1.5 m has no bridge: landmarks.js leaves a gap). */
export function cutDepthAt(t, x) {
  const e = Math.min(x - PARK.xMin, PARK.xMax - x);
  const u = Math.min(1, Math.max(0, e / TRANSVERSE_RAMP));
  return t.depth * u * u * (3 - 2 * u);
}
// Where a straightened line runs: from each deck end (halfWidth + 2.5 m from the cut's centre) STRAIGHT m more, then it
// eases back into its old line over BLEND m (drives: their own, wider).
export const CUT_STRAIGHT = 3;
const deckHalf = (t) => t.halfWidth + 2.5;

/** The line with each bridged crossing made straight along z at the crossing's x (null: nothing to change). */
function straightenAtCuts(line, closed, blend) {
  let pts = closed ? [...line, line[0]] : line.slice();
  let changed = false;
  for (const t of TRANSVERSES) {
    for (let guard = 0; guard < 8; guard++) {
      // the first crossing of this cut still at an angle
      let hit = -1, xc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if ((a.z - t.z) * (b.z - t.z) > 0 || a.z === b.z) continue;
        const x = a.x + (b.x - a.x) * (t.z - a.z) / (b.z - a.z);
        if (x < PARK.xMin + 3 || x > PARK.xMax - 3 || cutDepthAt(t, x) < 1.5) continue;
        if (pts[i - 1].straight && pts[i].straight) continue;   // done already
        hit = i; xc = x; break;
      }
      if (hit < 0) break;
      const s = Math.sign(pts[hit].z - pts[hit - 1].z) || 1;
      const H = deckHalf(t) + CUT_STRAIGHT, W = H + blend;
      // the run of points around the crossing inside the window (|z - t.z| < W, contiguous)
      let i0 = hit - 1, i1 = hit;
      while (i0 > 0 && Math.abs(pts[i0].z - t.z) < W) i0--;
      while (i1 < pts.length - 1 && Math.abs(pts[i1].z - t.z) < W) i1++;
      const A = pts[i0], C = pts[i1];
      const P = { x: xc, z: t.z - s * H, straight: true }, Q = { x: xc, z: t.z + s * H, straight: true }, up = { x: 0, z: s };
      const seg = [], E = deckHalf(t) + 0.5;   // E: just past the deck's end
      // ease from A into the straight run. A line that ends (here: starts) on the run keeps its own points beyond the
      // deck's end (or where it turns off the bridge's line) and goes straight only to there (review: ramble-1's
      // hand-routed last leg along Belvedere's front)
      let head = i0;
      if ((A.z - t.z) * -s > H) seg.push(...hermite(A, dirAt(pts, i0), P, up, 6));
      else {
        let k = hit - 1; while (k > 0 && (pts[k].z - t.z) * -s <= E && Math.abs(pts[k].x - xc) < 2.5) k--;
        if ((pts[k].z - t.z) * -s > E || Math.abs(pts[k].x - xc) >= 2.5) { head = k + 1; seg.push({ x: xc, z: Math.abs(pts[k].x - xc) >= 2.5 ? pts[k].z : t.z - s * E, straight: true }); }
        else seg.push({ x: xc, z: A.z, straight: true });
      }
      seg.push({ x: xc, z: t.z, straight: true });
      // and back out of it into C (likewise for a line that ends on the run)
      let tail = i1;
      if ((C.z - t.z) * s > H) seg.push(...hermite(Q, up, C, dirAt(pts, i1), 6));
      else {
        let k = hit; while (k < pts.length - 1 && (pts[k].z - t.z) * s <= E && Math.abs(pts[k].x - xc) < 2.5) k++;
        if ((pts[k].z - t.z) * s > E || Math.abs(pts[k].x - xc) >= 2.5) { tail = k - 1; seg.push({ x: xc, z: Math.abs(pts[k].x - xc) >= 2.5 ? pts[k].z : t.z + s * E, straight: true }); }
        else seg.push({ x: xc, z: C.z, straight: true });
      }
      pts = [...pts.slice(0, head === i0 ? i0 : head), ...seg, ...pts.slice(tail + 1)];
      changed = true;
    }
  }
  if (!changed) return null;
  if (closed) pts.pop();
  return { line: pts.map((q) => ({ x: q.x, z: q.z })), closed };
}

/** The unit travel direction of the line at point i (from the point before it to the point after it). */
function dirAt(pts, i) {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l };
}

/** Points from A to B (both included) on a cubic Hermite curve with unit tangents ta, tb (scaled by the chord). */
function hermite(A, ta, B, tb, n) {
  const L = Math.hypot(B.x - A.x, B.z - A.z);
  const out = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    out.push({ x: h00 * A.x + h10 * ta.x * L + h01 * B.x + h11 * tb.x * L, z: h00 * A.z + h10 * ta.z * L + h01 * B.z + h11 * tb.z * L, straight: (k === 0 && !!A.straight) || (k === n && !!B.straight) });
  }
  return out;
}

/** #50: the bridle path's south end ran along inside the 86th St cut (the loop's bottom is 2 m south of the cut's centre,
 *  and the running track leaves no room between the track and the cut's wall). It now stops where it meets the cut's edge
 *  on each side, and the riders share the track along the south end: an open line, starting and ending there. */
function trimBridle(line) {
  const t = TRANSVERSES.find((q) => q.id === 't86');
  if (!t) return null;
  const limit = t.z + t.halfWidth + 1.5;
  const keep = line.map((q) => q.z >= limit);
  if (keep.every(Boolean)) return null;
  // rotate the closed loop so it starts at the first kept point after the dropped run
  const n = line.length;
  let start = -1;
  for (let i = 0; i < n; i++) if (keep[i] && !keep[(i - 1 + n) % n]) { start = i; break; }
  const out = [];
  for (let k = 0; k < n; k++) { const i = (start + k) % n; if (!keep[i]) break; out.push({ ...line[i] }); }
  return out.length > 2 ? out : null;
}
