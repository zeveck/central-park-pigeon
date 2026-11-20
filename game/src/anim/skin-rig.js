// A small procedural skeleton for a static (baked) model: turns its geometry
// into a THREE.SkinnedMesh at load, with skin weights computed in code from
// each vertex's rest position (smooth falloffs, at most 4 bones a vertex).
//
// Bones live in a hierarchy of their own that is never added to the scene:
// the meshes bind in DetachedBindMode with an identity bind matrix, so a
// bone's matrixWorld IS its matrix in the model's own space (metres, +Y up,
// +Z front, as loadBakedModel bakes it). Call `update()` after posing.
// Attachments (the scarf's wrap) can share the skeleton through makeMesh(),
// and deformPoint() runs the same skinning on the CPU for a single point.
//
//   const rig = new SkinRig(joints, weightsFn);
//     joints: [{ name, parent (name|null), at: [x, y, z] }]   (rest pivots, model space)
//     weightsFn(x, y, z, out) → fills `out` (a Float32Array, one slot per joint) with raw
//     weights; they are normalised and the 4 largest kept.
//   const mesh = rig.makeMesh(geometry, material);   // a SkinnedMesh on a clone of geometry
//   rig.bones.neck.quaternion... ; rig.update();
//   rig.deformPoint(p, maskPoint = p)                  // model space, in place

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _acc = new THREE.Matrix4();
const _v = new THREE.Vector3();

export class SkinRig {
  constructor(joints, weightsFn) {
    this.joints = joints;
    this.weightsFn = weightsFn;
    this.bones = {};
    this.list = [];
    this.index = {};
    for (const j of joints) {
      const b = new THREE.Bone();
      b.name = j.name;
      const p = j.parent ? this.bones[j.parent] : null;
      const pa = p ? joints.find((q) => q.name === j.parent).at : [0, 0, 0];
      b.position.set(j.at[0] - pa[0], j.at[1] - pa[1], j.at[2] - pa[2]);
      b.userData.rest = b.position.clone();
      if (p) p.add(b);
      this.index[j.name] = this.list.length;
      this.bones[j.name] = b;
      this.list.push(b);
    }
    this.root = this.list[0];
    this.root.updateMatrixWorld(true);
    // bind pose: every bone unrotated at its pivot, so its inverse is a plain translation
    const inverses = joints.map((j) => new THREE.Matrix4().makeTranslation(-j.at[0], -j.at[1], -j.at[2]));
    this.skeleton = new THREE.Skeleton(this.list, inverses);
    this._w = new Float32Array(joints.length);
    this._top = { i: [0, 0, 0, 0], w: [0, 0, 0, 0] };
  }

  /** Bones back to the rest pose. */
  reset() {
    for (const b of this.list) { b.position.copy(b.userData.rest); b.quaternion.identity(); b.scale.set(1, 1, 1); }
  }

  /** Recompute bone matrices after posing (model space). */
  update() { this.root.updateMatrixWorld(true); }

  /** The 4 strongest normalised weights at a rest-pose point. */
  weightsAt(x, y, z) {
    const w = this._w;
    w.fill(0);
    this.weightsFn(x, y, z, w);
    const t = this._top;
    for (let k = 0; k < 4; k++) { t.i[k] = 0; t.w[k] = 0; }
    for (let j = 0; j < w.length; j++) {
      const v = w[j];
      if (v <= 1e-4) continue;
      let k = 3;
      if (v <= t.w[3]) continue;
      while (k > 0 && t.w[k - 1] < v) { t.w[k] = t.w[k - 1]; t.i[k] = t.i[k - 1]; k--; }
      t.w[k] = v; t.i[k] = j;
    }
    const s = t.w[0] + t.w[1] + t.w[2] + t.w[3];
    if (s <= 1e-6) { t.i[0] = 0; t.w[0] = 1; t.w[1] = t.w[2] = t.w[3] = 0; }
    else for (let k = 0; k < 4; k++) t.w[k] /= s;
    return t;
  }

  /** A SkinnedMesh bound to this skeleton, on a clone of `geometry` with skin attributes added. */
  makeMesh(geometry, material) {
    const geo = geometry.clone();
    const pos = geo.attributes.position;
    const n = pos.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const t = this.weightsAt(pos.getX(i), pos.getY(i), pos.getZ(i));
      for (let k = 0; k < 4; k++) { si[i * 4 + k] = t.i[k]; sw[i * 4 + k] = t.w[k]; }
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.bindMode = THREE.DetachedBindMode;
    mesh.bind(this.skeleton, new THREE.Matrix4());
    // the rest pose's bounds with a margin for the pose (cheap and stable for culling)
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    mesh.boundingSphere = geo.boundingSphere.clone();
    mesh.boundingSphere.radius += 0.06;
    if (!geo.boundingBox) geo.computeBoundingBox();
    mesh.boundingBox = geo.boundingBox.clone().expandByScalar(0.06);
    return mesh;
  }

  /** CPU skinning of one model-space point (weights taken at maskPoint, its rest position). */
  deformPoint(p, maskPoint = p) {
    const t = this.weightsAt(maskPoint.x, maskPoint.y, maskPoint.z);
    _acc.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (let k = 0; k < 4; k++) {
      if (!t.w[k]) continue;
      const b = this.list[t.i[k]];
      _m.multiplyMatrices(b.matrixWorld, this.skeleton.boneInverses[t.i[k]]);
      const e = _acc.elements, f = _m.elements;
      for (let q = 0; q < 16; q++) e[q] += f[q] * t.w[k];
    }
    return p.applyMatrix4(_acc);
  }

  /** Model-space position of a bone's pivot (after update()). */
  pivot(name, out = _v) { return out.setFromMatrixPosition(this.bones[name].matrixWorld); }
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
