// Shadow-only objects (perf pass): meshes that draw into the sun's shadow map
// but never in colour, so they cost no main-pass draw call. three.js tests the
// same `visible` flag (and the viewer's layers) in both passes, so these stay
// hidden and are switched on only while the shadow map renders: the renderer
// builds its main draw list first, then calls shadowMap.render, then draws
// the list. Used for the near tree casters and the static cells' merged
// shadow proxies.
//
//   installShadowOnly(renderer)          once, at start-up (main.js)
//   shadowOnly(mesh)                     mark a mesh; mesh.userData.shadowOn = false skips it

const objs = new Set();

export function shadowOnly(mesh) {
  mesh.visible = false;
  if (mesh.userData.shadowOn === undefined) mesh.userData.shadowOn = true;
  objs.add(mesh);
  return mesh;
}

export function installShadowOnly(renderer) {
  const sm = renderer.shadowMap;
  if (sm.__shadowOnly) return;
  sm.__shadowOnly = true;
  const render = sm.render;
  sm.render = function (...args) {
    for (const o of objs) o.visible = o.userData.shadowOn !== false;
    try { return render.apply(this, args); } finally { for (const o of objs) o.visible = false; }
  };
}
