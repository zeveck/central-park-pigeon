// Perf pass: a per-object breakdown of one rendered frame (debug only; never
// imported by the game). It wraps renderer.renderBufferDirect for one
// G.render() and buckets every draw call and its triangles by pass (far layer,
// main, shadow) and by what drew it: the top-level group under the mirrored
// world root ("trees", "static", "humans", …), refined one level for the
// groups where that matters (trees: full / LOD / blob pools; static: the
// batched material; terrain; dynamic: the streamed landmarks).
//
//   const { profile } = await import('/src/debug/perf.js'); profile(window.__G)
//   → { total, passes: {far, main, shadow}, rows: [{ pass, cat, sub, calls, tris }] }

export function profile(G, { shadow = true } = {}) {
  const r = G.renderer;
  const orig = r.renderBufferDirect;
  const rows = new Map();
  const add = (pass, cat, sub, calls, tris, inst) => {
    const k = pass + '|' + cat + '|' + sub;
    const row = rows.get(k) || { pass, cat, sub, calls: 0, tris: 0, inst: 0 };
    row.calls += calls; row.tris += tris; row.inst += inst;
    rows.set(k, row);
  };
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const t0 = r.info.render.triangles, c0 = r.info.render.calls;
    orig.call(this, camera, scene, geometry, material, object, group);
    const pass = scene === null || camera.isOrthographicCamera ? 'shadow' : scene === G.far?.scene ? 'far' : 'main';
    const [cat, sub] = classify(G, object);
    add(pass, cat, sub, r.info.render.calls - c0, r.info.render.triangles - t0, object.isInstancedMesh ? object.count : 1);
  };
  const auto = r.shadowMap.autoUpdate;
  if (!shadow) r.shadowMap.autoUpdate = false;
  else r.shadowMap.needsUpdate = true;
  try { G.render(); } finally { r.renderBufferDirect = orig; r.shadowMap.autoUpdate = auto; }
  const list = [...rows.values()].sort((a, b) => b.tris - a.tris);
  const passes = {};
  for (const row of list) { const p = passes[row.pass] || (passes[row.pass] = { calls: 0, tris: 0 }); p.calls += row.calls; p.tris += row.tris; }
  return { total: { ...G.lastStats }, budgetScale: G.budgetScale ?? 1, passes, rows: list };
}

/** [category, sub-category] for a drawn object. */
function classify(G, o) {
  const chain = [];
  for (let q = o; q; q = q.parent) chain.push(q);
  chain.reverse();   // scene, root, top, …, o
  const root = chain[1];
  if (!root) return [o.name || o.type, ''];
  if (chain[0] === G.far?.scene) {
    const top = chain[2];
    return ['far:' + (top?.name || '?'), (chain[3]?.name || o.name || o.type)];
  }
  if (root !== G.world) return [root.name || root.type, o.name || ''];   // the finale's own scenes
  const top = chain[2] || o;
  const cat = top.name || top.type;
  let sub = '';
  if (cat === 'trees' || cat === 'terrain' || cat === 'water' || cat === 'props' || cat === 'crowds' || cat === 'signs') sub = (chain[3]?.name || o.name || '').replace(/[-_ ]?\d+(,\d+)?$/, '');
  else if (cat === 'static') sub = (o.name.split(':')[1] || '').split('@')[0];
  else if (cat === 'dynamic') sub = chain[3]?.name || o.name || '';
  else if (cat === 'humans' || cat === 'characters') sub = '';
  else sub = chain[3]?.name || '';
  return [cat, sub];
}

/**
 * Turn the GL draw calls into no-ops (true) or back (false). three.js still
 * walks the scene, culls, uploads and counts every call in renderer.info, so
 * the counts are exact; SwiftShader just doesn't rasterise. The headless perf
 * probe settles the pools this way and only really draws its screenshots.
 */
export function drawsOff(G, off) {
  const gl = G.renderer.getContext();
  const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
  if (off && !gl.__perfSaved) {
    gl.__perfSaved = {};
    for (const k of names) { gl.__perfSaved[k] = gl[k]; gl[k] = () => {}; }
  } else if (!off && gl.__perfSaved) {
    for (const k of names) gl[k] = gl.__perfSaved[k];
    gl.__perfSaved = null;
  }
}
