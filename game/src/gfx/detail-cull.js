// Small-detail culling (perf pass, render only). three.js only culls by the
// frustum and the camera's far plane, so a door's latch rope, a market price
// tag or a clue's glint 300 m away still costs a draw call (and a shadow
// draw). Every few frames this walks the registered groups and takes any
// ordinary mesh whose bounding sphere is under about a pixel and a half off
// the main camera's layer (layer 0); it goes back on when it grows again.
// It uses layers, not `visible`, so it never fights the game code that shows
// and hides those meshes (and nothing in gameplay reads layers).
//
//   const dc = new DetailCull({ k }); dc.add(group, …); dc.update(renderCam) each render

import * as THREE from 'three';

const _s = new THREE.Sphere();

export class DetailCull {
  /** k: radius / distance below which a mesh is skipped (0.0015 ≈ 1.4 px radius at 1080p, fov 60). */
  constructor({ k = 0.0015, every = 8 } = {}) {
    this.roots = [];
    this.k = k;
    this.every = every;
    this.tick = 0;
    this.culled = 0;
  }

  add(...roots) { for (const r of roots) if (r) this.roots.push(r); }

  update(camera, force = false) {
    if (!force && this.tick++ % this.every !== 0) return;
    const c = camera.position, k = this.k;
    let n = 0;
    for (const root of this.roots) {
      root.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh || !o.frustumCulled) return;
        let bs;
        if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); bs = o.boundingSphere; }
        else { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); bs = o.geometry.boundingSphere; }
        _s.copy(bs).applyMatrix4(o.matrixWorld);
        const small = _s.radius < k * c.distanceTo(_s.center);
        if (small) { if (o.layers.isEnabled(0)) { o.layers.disable(0); } n++; }
        else if (!o.layers.isEnabled(0)) o.layers.enable(0);
      });
    }
    this.culled = n;
  }
}
