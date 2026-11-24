// Resolves layout.js outlines (smoothed outlines, ellipses, stream ribbons and
// polylines) into plain polygons, once. Shared by terrain, water, trees, props
// and the far layer, so everything agrees on where the water and paths are.

import { WATER, LAWNS, PATHS, DRIVES, PLAZAS, WOODS } from './layout.js';
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
  const plazas = PLAZAS.map((p) => ({ ...p, poly: p.outline.map((q) => ({ ...q })) }));
  const woods = WOODS.map((w) => ({ ...w, poly: smoothClosed(w.outline, 4) })).map((w) => ({ ...w, b: polyBounds(w.poly) }));
  cache = { water, lawns, paths, drives, plazas, woods };
  return cache;
}
