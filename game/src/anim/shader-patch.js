// Compose several vertex/fragment patches on one built-in three.js material
// (MeshStandardMaterial etc.) without them overwriting each other.
//
// A patch is { key, uniforms, vertexHeader, vertex, normal, fragmentHeader, fragmentAfterMap,
//              vertexReplace, fragmentReplace }:
//   vertex   GLSL run right after <begin_vertex>   (edit `transformed`, model space)
//   normal   GLSL run right after <beginnormal_vertex> (edit `objectNormal`)
//   fragmentAfterMap GLSL run right after <map_fragment> (edit `diffuseColor`)
//   vertexReplace / fragmentReplace  [[searchString, replacement], ...] applied last
// Patches run in the order they were added. Uniform objects are shared by
// reference, so updating `patch.uniforms.uX.value` updates every material using it.

export function addShaderPatch(material, patch) {
  const patches = material.userData.shaderPatches || (material.userData.shaderPatches = []);
  patches.push(patch);
  const key = patches.map((p) => p.key).join('+');
  material.customProgramCacheKey = () => key;
  material.onBeforeCompile = (shader) => {
    let vHead = '';
    let fHead = '';
    let vBody = '';
    let nBody = '';
    let fBody = '';
    for (const p of patches) {
      Object.assign(shader.uniforms, p.uniforms || {});
      vHead += (p.vertexHeader || '') + '\n';
      fHead += (p.fragmentHeader || '') + '\n';
      if (p.vertex) vBody += `{\n${p.vertex}\n}\n`;
      if (p.normal) nBody += `{\n${p.normal}\n}\n`;
      if (p.fragmentAfterMap) fBody += `{\n${p.fragmentAfterMap}\n}\n`;
    }
    // Normals are computed before positions in three's vertex shaders, so each
    // patch's `normal` code sees the undeformed `position` (which is what we want:
    // masks are defined on the rest pose).
    shader.vertexShader = vHead + shader.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${nBody}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vBody}`);
    shader.fragmentShader = fHead + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>\n${fBody}`);
    for (const p of patches) {
      for (const [a, b] of p.vertexReplace || []) shader.vertexShader = shader.vertexShader.replace(a, b);
      for (const [a, b] of p.fragmentReplace || []) shader.fragmentShader = shader.fragmentShader.replace(a, b);
    }
  };
  material.needsUpdate = true;
  return patch;
}

/** GLSL helpers shared by the deformers. */
export const GLSL_ROT = /* glsl */ `
#ifndef GG_ROT
#define GG_ROT
vec3 rotAxisX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c); }
vec3 rotAxisZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z); }
#endif
`;
