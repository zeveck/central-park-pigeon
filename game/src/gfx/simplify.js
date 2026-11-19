// Load-time mesh simplification (perf pass), with meshoptimizer's simplifier
// (vendor/meshopt_simplifier.module.js, WebAssembly). The result shares every
// vertex attribute of the source geometry (skin weights included) and only
// gets a new, shorter index, so a LOD costs one index buffer and can be bound
// to the same skeleton.
//
// The models are textured with many UV islands, so a plain simplify stops
// early (every island border is a seam) and a "permissive" one smears the
// texture across islands. Weighting the UVs as attributes in a permissive
// simplify gets both: collapses across seams happen only where the UVs agree.

import * as THREE from 'three';
import { MeshoptSimplifier } from '../../vendor/meshopt_simplifier.module.js';

export const simplifierReady = MeshoptSimplifier.ready;

/**
 * A geometry sharing `geo`'s attributes with a simplified index: about `ratio` of the triangles, within `error`
 * (relative to the mesh's size). uvWeight: how much UV distortion counts (0 = positions only).
 */
export function simplifiedGeometry(geo, ratio = 0.5, error = 0.02, uvWeight = 3) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  const pos = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { pos[i * 3] = p.getX(i); pos[i * 3 + 1] = p.getY(i); pos[i * 3 + 2] = p.getZ(i); }
  const src = geo.index ? Uint32Array.from(geo.index.array) : Uint32Array.from({ length: p.count }, (_, i) => i);
  const target = Math.max(3, Math.floor((src.length * ratio) / 3) * 3);
  let idx;
  if (uv && uvWeight > 0) {
    const a = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { a[i * 2] = uv.getX(i); a[i * 2 + 1] = uv.getY(i); }
    [idx] = MeshoptSimplifier.simplifyWithAttributes(src, pos, 3, a, 2, [uvWeight, uvWeight], null, target, error, ['Permissive']);
  } else [idx] = MeshoptSimplifier.simplify(src, pos, 3, target, error, []);
  const g = new THREE.BufferGeometry();
  for (const [k, v] of Object.entries(geo.attributes)) g.setAttribute(k, v);
  g.setIndex(new THREE.BufferAttribute(p.count < 65536 ? Uint16Array.from(idx) : idx, 1));
  g.boundingSphere = geo.boundingSphere?.clone() || null;
  g.boundingBox = geo.boundingBox?.clone() || null;
  g.name = (geo.name || 'geo') + ':lod';
  return g;
}
