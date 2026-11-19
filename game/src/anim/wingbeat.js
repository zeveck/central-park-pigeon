// Wingbeat vertex deformer for a bird model with spread wings (animating.md §2):
// each wing is *turned* about its shoulder (an axis along the body, +Z),
// never sheared or stretched. A quick strong downstroke and a slower
// upstroke; the tips trail the root a little.
//
// Rig (model space, metres, +Y up, +Z forward):
//   shoulder   {x, y, z}    right shoulder; the left is mirrored (-x)
//   rootX      [x0, x1]     wing weight ramps 0→1 over |x| between these
//   rootY      [y0, y1]     ...and over y (keeps tail and feet out of the wing)
//   span       wing length from the shoulder (for the tip lag)
//
// One material can be a single bird (phase from uWingPhase) or an
// InstancedMesh with a per-instance `aWingPhase` attribute (instanced: true).

import * as THREE from 'three';
import { addShaderPatch, GLSL_ROT } from './shader-patch.js';

export class Wingbeat {
  constructor(rig) {
    this.rig = rig;
    this.uniforms = {
      uWingPhase: { value: 0 },        // cycles (0..1 = one beat), integrated on the CPU
      uWingAmp: { value: 0.75 },       // radians either side of the mid angle
      uWingOffset: { value: -0.45 },   // radians added to the model's rest wing angle (mid of stroke)
      uWingDown: { value: 0.42 },      // fraction of the cycle spent on the downstroke
      uWingLag: { value: 0.12 },       // tip trails the root by this many cycles
      uWingSweep: { value: 0.25 },     // wings sweep back a little on the upstroke (radians)
      uShoulder: { value: new THREE.Vector3(rig.shoulder.x, rig.shoulder.y, rig.shoulder.z) },
      uWingMask: { value: new THREE.Vector4(rig.rootX[0], rig.rootX[1], rig.rootY[0], rig.rootY[1]) },
      uWingSpan: { value: rig.span },
    };
    this.freq = 4;
  }

  /** Advance the beat. freq in beats per second. */
  advance(dt, freq = this.freq) {
    this.freq = freq;
    this.uniforms.uWingPhase.value = (this.uniforms.uWingPhase.value + dt * freq) % 1000;
  }

  /** Set the stroke shape (all radians): amp either side of mid, offset of mid from the rest pose. */
  setStroke(amp, offset) {
    this.uniforms.uWingAmp.value = amp;
    this.uniforms.uWingOffset.value = offset;
  }

  patch(material, { instanced = false } = {}) {
    return addShaderPatch(material, {
      key: instanced ? 'wingbeat-inst' : 'wingbeat',
      uniforms: this.uniforms,
      vertexHeader: /* glsl */ `
        ${GLSL_ROT}
        uniform float uWingPhase, uWingAmp, uWingOffset, uWingDown, uWingLag, uWingSweep, uWingSpan;
        uniform vec3 uShoulder;
        uniform vec4 uWingMask;
        ${instanced ? 'attribute float aWingPhase;' : ''}
        // 1 at the top of the stroke, -1 at the bottom; fast down, slow up.
        float beatShape(float p) {
          p = fract(p);
          return p < uWingDown ? cos(3.14159265 * p / uWingDown)
                               : -cos(3.14159265 * (p - uWingDown) / (1.0 - uWingDown));
        }
        float wingW(vec3 p) {
          return smoothstep(uWingMask.x, uWingMask.y, abs(p.x)) * smoothstep(uWingMask.z, uWingMask.w, p.y);
        }
        // Angle (radians, + = up) and sweep for a vertex, plus its weight.
        vec3 wingAngle(vec3 p) {
          float side = sign(p.x);
          float r = clamp((abs(p.x) - uShoulder.x) / uWingSpan, 0.0, 1.0);
          float ph = uWingPhase ${instanced ? '+ aWingPhase' : ''} - uWingLag * r;
          float s = beatShape(ph);
          // upstroke = derivative sign; sweep the wing back while it rises
          float rising = step(uWingDown, fract(ph));
          float a = uWingOffset + uWingAmp * s;
          return vec3(a, uWingSweep * rising * r, side);
        }
        vec3 wingDeform(vec3 p, vec3 ang, float w) {
          vec3 piv = vec3(uShoulder.x * ang.z, uShoulder.y, uShoulder.z);
          vec3 q = p - piv;
          q = rotAxisZ(q, ang.x * ang.z * w);                       // flap about the body axis
          float sw = ang.y * w; float c = cos(sw), s = sin(sw);      // sweep back about the vertical
          q = vec3(q.x * c + q.z * s * ang.z, q.y, -q.x * s * ang.z + q.z * c);
          return q + piv;
        }`,
      normal: /* glsl */ `
        vec3 angN = wingAngle(position);
        float wN = wingW(position);
        objectNormal = wingDeform(objectNormal + vec3(uShoulder.x * angN.z, uShoulder.y, uShoulder.z), angN, wN)
                     - vec3(uShoulder.x * angN.z, uShoulder.y, uShoulder.z);`,
      vertex: /* glsl */ `
        transformed = wingDeform(transformed, wingAngle(position), wingW(position));`,
    });
  }
}

/** Per-instance phase attribute for an InstancedMesh using an instanced Wingbeat material. */
export function addWingPhaseAttribute(geometry, count, rand = Math.random) {
  const a = new Float32Array(count);
  for (let i = 0; i < count; i++) a[i] = rand();
  geometry.setAttribute('aWingPhase', new THREE.InstancedBufferAttribute(a, 1));
  return geometry.getAttribute('aWingPhase');
}
