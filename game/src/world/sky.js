// The sky, drawn in the far pass: a gradient dome per phase with the sun and
// moon discs and code stars, and the cloud band (from sky-clouds.jpg, its
// painted sky removed by tools/make-cloud-band.py) mirrored round a cylinder.
// Both follow the camera, like a skybox.

import * as THREE from 'three';

export const skyUniforms = {
  uTop: { value: new THREE.Color(0x6fb4e6) },
  uHorizon: { value: new THREE.Color(0xf3d6b0) },
  uGround: { value: new THREE.Color(0xb7a58a) },
  uSunDir: { value: new THREE.Vector3(0, 0.4, -1).normalize() },
  uSunColor: { value: new THREE.Color(0xfff1d0) },
  uSunSize: { value: 0.9995 },
  uSunGlow: { value: 0.35 },
  uMoonDir: { value: new THREE.Vector3(0.4, 0.6, -0.6).normalize() },
  uMoon: { value: 0 },
  uStars: { value: 0 },
  uCloudTint: { value: new THREE.Color(1, 1, 1) },
  uCloudAlpha: { value: 1 },
  uTime: { value: 0 },
};

export function buildSky(cloudTex) {
  const group = new THREE.Group();
  group.name = 'sky';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: skyUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uGround, uSunDir, uSunColor, uMoonDir;
        uniform float uSunSize, uSunGlow, uMoon, uStars;
        varying vec3 vDir;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float e = d.y;
          vec3 col = e > 0.0 ? mix(uHorizon, uTop, pow(clamp(e, 0.0, 1.0), 0.55)) : mix(uHorizon, uGround, clamp(-e * 6.0, 0.0, 1.0));
          float sd = dot(d, uSunDir);
          col += uSunColor * uSunGlow * pow(max(sd, 0.0), 12.0);
          col = mix(col, uSunColor * 1.6, smoothstep(uSunSize, uSunSize + 0.0004, sd));
          float md = dot(d, uMoonDir);
          col = mix(col, vec3(0.95, 0.93, 0.85) * 1.2, uMoon * smoothstep(0.99955, 0.9997, md));
          col += vec3(0.6, 0.62, 0.8) * uMoon * 0.12 * pow(max(md, 0.0), 40.0);
          if (uStars > 0.0 && e > 0.03) {
            vec2 g = vec2(atan(d.x, d.z) * 180.0, e * 260.0);
            vec2 c = floor(g);
            float h = h21(c);
            vec2 f = fract(g) - 0.5 - (vec2(h21(c + 3.1), h21(c + 7.7)) - 0.5) * 0.6;
            float s = step(0.985, h) * smoothstep(0.18, 0.0, length(f)) * (0.5 + 0.5 * h21(c + 1.3));
            col += vec3(s) * uStars * smoothstep(0.03, 0.25, e);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.name = 'sky-dome';
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  group.add(dome);

  // the cloud band: 4 mirrored repeats round a cylinder from the horizon up to ~34°
  const R = 1650, H = (2 * Math.PI * R) / (4 * (cloudTex.userData.size ? cloudTex.userData.size[0] / cloudTex.userData.size[1] : 2.36));
  cloudTex.wrapS = THREE.MirroredRepeatWrapping;
  cloudTex.wrapT = THREE.ClampToEdgeWrapping;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 64, 1, true).translate(0, H / 2 - 40, 0),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { tClouds: { value: cloudTex }, uCloudTint: skyUniforms.uCloudTint, uCloudAlpha: skyUniforms.uCloudAlpha, uTime: skyUniforms.uTime },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tClouds; uniform vec3 uCloudTint; uniform float uCloudAlpha, uTime;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tClouds, vec2(vUv.x * 4.0 + uTime * 0.0006, vUv.y));
          gl_FragColor = vec4(c.rgb * uCloudTint, c.a * uCloudAlpha);
          #include <colorspace_fragment>
        }`,
    }),
  );
  band.name = 'cloud-band';
  band.frustumCulled = false;
  band.renderOrder = -9;
  group.add(band);
  return group;
}
