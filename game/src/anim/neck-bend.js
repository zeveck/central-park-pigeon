// Neck-masked vertex deformer for a standing bird (or any creature with a neck).
//
// The neck region (masked by height and by depth, so the tail is left alone) is
// *turned* about a pivot at the base of the neck, never stretched: each vertex
// rotates by `bend * w`, where w ramps 0 → 1 up the neck, so the neck curves
// like a bent tube. The head region is then counter-rotated about its own
// pivot by `bend * level`, so with level = 1 the head stays level and simply
// moves forward/back (the pigeon head-bob), and with level = 0 it tips with
// the neck (a peck).
//
// The same maths runs on the CPU in deformPoint(), so attachments (the scarf
// wrap's knot, a beak item) can follow the head exactly.
//
// Rig (all in the model's own space, metres, +Y up, +Z forward):
//   pivot      neck base            {x,y,z}
//   head       head pivot           {x,y,z}
//   neckY      [y0, y1]  neck weight ramps 0→1 between these heights
//   neckZ      [z0, z1]  and 0→1 between these depths (excludes the tail)
//   headY      [y0, y1]  head weight ramp (for the level counter-rotation)

import * as THREE from 'three';
import { addShaderPatch, GLSL_ROT } from './shader-patch.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class NeckBend {
  constructor(rig) {
    this.rig = rig;
    this.uniforms = {
      uNeckBend: { value: 0 },
      uNeckLevel: { value: 1 },
      uNeckPivot: { value: new THREE.Vector3(rig.pivot.x, rig.pivot.y, rig.pivot.z) },
      uHeadPivot: { value: new THREE.Vector3(rig.head.x, rig.head.y, rig.head.z) },
      uNeckMask: { value: new THREE.Vector4(rig.neckY[0], rig.neckY[1], rig.neckZ[0], rig.neckZ[1]) },
      uHeadMask: { value: new THREE.Vector2(rig.headY[0], rig.headY[1]) },
    };
  }

  /** bend: radians, + tips the head forward/down. level: 0 tips the head, 1 keeps it level. */
  setPose(bend, level = 1) {
    this.uniforms.uNeckBend.value = bend;
    this.uniforms.uNeckLevel.value = level;
  }

  /** Bend that moves a level head forward by `dz` metres (approximately, small angles). */
  bendForHeadShift(dz) {
    const r = this.rig;
    const arm = Math.hypot(r.head.y - r.pivot.y, r.head.z - r.pivot.z);
    return Math.asin(Math.max(-0.9, Math.min(0.9, dz / arm)));
  }

  /** Install the deformation on a material whose geometry is in this rig's model space. */
  patch(material) {
    return addShaderPatch(material, {
      key: 'neckbend',
      uniforms: this.uniforms,
      vertexHeader: /* glsl */ `
        ${GLSL_ROT}
        uniform float uNeckBend, uNeckLevel;
        uniform vec3 uNeckPivot, uHeadPivot;
        uniform vec4 uNeckMask;
        uniform vec2 uHeadMask;
        float neckW(vec3 p) { return smoothstep(uNeckMask.x, uNeckMask.y, p.y) * smoothstep(uNeckMask.z, uNeckMask.w, p.z); }
        float headW(vec3 p) { return smoothstep(uHeadMask.x, uHeadMask.y, p.y) * smoothstep(uNeckMask.z, uNeckMask.w, p.z); }
        vec3 neckDeform(vec3 p) {
          float w = neckW(p);
          vec3 q = rotAxisX(p - uNeckPivot, uNeckBend * w) + uNeckPivot;
          vec3 h1 = rotAxisX(uHeadPivot - uNeckPivot, uNeckBend) + uNeckPivot;
          return rotAxisX(q - h1, -uNeckBend * uNeckLevel * headW(p)) + h1;
        }`,
      normal: /* glsl */ `
        float nb = uNeckBend * (neckW(position) - uNeckLevel * headW(position));
        objectNormal = rotAxisX(objectNormal, nb);`,
      vertex: /* glsl */ `transformed = neckDeform(transformed);`,
    });
  }

  /** CPU twin of the shader: deform a model-space point in place. */
  deformPoint(p, maskPoint = p) {
    const u = this.uniforms;
    const m = u.uNeckMask.value;
    const hm = u.uHeadMask.value;
    const bend = u.uNeckBend.value;
    const zw = smoothstep(m.z, m.w, maskPoint.z);
    const w = smoothstep(m.x, m.y, maskPoint.y) * zw;
    const hw = smoothstep(hm.x, hm.y, maskPoint.y) * zw;
    const P = u.uNeckPivot.value;
    const H = u.uHeadPivot.value;
    rotX(p, P, bend * w);
    const h1 = _h1.copy(H);
    rotX(h1, P, bend);
    rotX(p, h1, -bend * u.uNeckLevel.value * hw);
    return p;
  }
}

const _h1 = new THREE.Vector3();
function rotX(p, o, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const y = p.y - o.y, z = p.z - o.z;
  p.y = o.y + y * c - z * s;
  p.z = o.z + y * s + z * c;
  return p;
}
