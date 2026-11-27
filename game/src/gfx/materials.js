// The shared material set. One material rule for everything built in code
// (and every Meshy GLB): MeshStandardMaterial, roughness 0.85, metalness 0, no
// environment map, the same sun, hemisphere fill and fog. Code-coloured
// materials multiply a grey canvas-noise tile so no surface is flat.
//
// Every UV in the code-built world is in metres; each material's texture
// repeat converts metres to tiles (facades: one tile = 4 floors × 4 bays = 14 m).
//
// Shared uniforms (`U`) are driven by the time of day: uTime (sway, water),
// uWindowGlow (city windows), uLampGlow (lampposts and lit signs).

import * as THREE from 'three';
import { addShaderPatch } from '../anim/shader-patch.js';
import { makeNoiseTexture, makeStripeTexture } from './textures.js';

export const RULE = { roughness: 0.85, metalness: 0 };

export const U = {
  uTime: { value: 0 },
  uWindowGlow: { value: 0 },
  uLampGlow: { value: 0 },
};

export const FACADE_TILE = 14;
export const TEX = {
  grass: { url: 'textures/tex-grass.jpg', tile: 2.5 },
  path: { url: 'textures/tex-path.jpg', tile: 2.5 },
  pavers: { url: 'textures/tex-pavers.jpg', tile: 1.5 },
  schist: { url: 'textures/tex-schist.jpg', tile: 5 },
  leaves: { url: 'textures/tex-leaves.jpg', tile: 1.5 },
  ice: { url: 'textures/tex-ice.jpg', tile: 4 },
  stone: { url: 'textures/tex-stone-arch.jpg', tile: 2.4 },
  rail: { url: 'textures/tex-iron-rail.png', tile: 1.5 },
  brick: { url: 'textures/tex-facade-brick.jpg', tile: FACADE_TILE, mask: 'textures/win-mask-brick.png' },
  limestone: { url: 'textures/tex-facade-limestone.jpg', tile: FACADE_TILE, mask: 'textures/win-mask-limestone.png' },
  glass: { url: 'textures/tex-facade-glass.jpg', tile: FACADE_TILE, mask: 'textures/win-mask-glass.png' },
  deco: { url: 'textures/tex-facade-deco.jpg', tile: FACADE_TILE, mask: 'textures/win-mask-deco.png' },
  storefront: { url: 'textures/tex-facade-storefront.jpg', tile: 3.5, mask: 'textures/win-mask-storefront.png' },
};

/** Load every world texture (in parallel). Returns { name: THREE.Texture }. */
export async function loadWorldTextures(store, { facadeMax = 2048 } = {}) {
  const jobs = [];
  const out = {};
  for (const [k, d] of Object.entries(TEX)) {
    const isFacade = !!d.mask;
    jobs.push(store.load(d.url, { maxSize: isFacade ? facadeMax : 2048 }).then((t) => { out[k] = t; }));
    if (d.mask) jobs.push(store.load(d.mask, { srgb: false, maxSize: isFacade ? Math.min(1024, facadeMax) : 1024 }).then((t) => { out[k + 'Mask'] = t; }));
  }
  await Promise.all(jobs);
  return out;
}

function tiled(tex, tile, tileV = tile) {
  const t = tex.clone();
  t.repeat.set(1 / tile, 1 / tileV);
  t.needsUpdate = true;
  return t;
}

/** Lit windows: each pane of the facade tile's 4×4 grid is on or off by a hash. */
function patchWindows(mat, { grid = 4, lit = 0.42, seed = 0 }) {
  addShaderPatch(mat, {
    key: `windows-${grid}-${lit}-${seed}`,
    uniforms: { uWindowGlow: U.uWindowGlow },
    fragmentHeader: 'uniform float uWindowGlow;',
    fragmentReplace: [['#include <emissivemap_fragment>', /* glsl */ `
      #ifdef USE_EMISSIVEMAP
        vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
        vec2 wcell = floor( vEmissiveMapUv * ${grid.toFixed(1)} );
        float wh = fract( sin( dot( wcell, vec2( 12.9898, 78.233 ) ) + ${seed.toFixed(1)} ) * 43758.5453 );
        float wlit = step( wh, ${lit.toFixed(3)} );
        totalEmissiveRadiance *= emissiveColor.r * wlit * uWindowGlow * ( 0.7 + 0.6 * fract( wh * 7.13 ) );
      #endif`]],
  });
}

/**
 * Perf pass, Low only: these textured static materials are baked to a colour on the shared vertex-coloured
 * `coded` material by the Batcher (one draw per cell for all of them; the noise tile keeps them from looking flat).
 */
export const LOW_FLATTEN = {
  stone: 0xb3aa9c, stoneDark: 0x958f86, schist: 0x77716a, pavers: 0x928d86, gravel: 0xcdb994, hedge: 0x4f7a3a, brickPlain: 0xb7705a, ice: 0xdfeef4,
};

export function createMaterials(tex) {
  const noise = makeNoiseTexture(128);
  noise.repeat.set(1 / 1.6, 1 / 1.6);
  const M = {};
  const std = (p) => new THREE.MeshStandardMaterial({ ...RULE, ...p });
  // code colours: each keeps its own material (for meshes outside the batcher), and the
  // batcher bakes the colour into vertex colours on the shared `coded` material
  const coded = (color, extra = {}) => {
    const m = std({ color, map: noise, ...extra });
    if (!Object.keys(extra).length) m.userData.coded = new THREE.Color(color);
    return m;
  };
  M.coded = std({ map: noise, vertexColors: true });

  // textured
  M.stone = std({ map: tiled(tex.stone, TEX.stone.tile) });
  M.stoneDark = std({ map: tiled(tex.stone, TEX.stone.tile), color: 0x9a948c });
  M.schist = std({ map: tiled(tex.schist, TEX.schist.tile) });
  M.pavers = std({ map: tiled(tex.pavers, TEX.pavers.tile) });
  M.gravel = std({ map: tiled(tex.path, TEX.path.tile) });
  M.ice = std({ map: tiled(tex.ice, TEX.ice.tile), roughness: 0.35 });
  M.hedge = std({ map: tiled(tex.leaves, 1.2), color: 0x4f7a3a });
  M.rail = std({ map: tiled(tex.rail, TEX.rail.tile), alphaTest: 0.5, side: THREE.DoubleSide, color: 0x9a9a92 });
  M.railCream = std({ map: tiled(tex.rail, 1.2), alphaTest: 0.5, side: THREE.DoubleSide, color: 0xfff6e2 });
  M.brickPlain = std({ map: tiled(tex.stone, 1.6), color: 0xc8735a });

  // facades with lit windows at night
  const facade = (name, seed, lit = 0.42) => {
    const d = TEX[name];
    const m = std({ map: tiled(tex[name], d.tile), emissive: 0xffd08a, emissiveMap: tiled(tex[name + 'Mask'], d.tile) });
    patchWindows(m, { grid: name === 'storefront' ? 1 : 4, lit, seed });
    return m;
  };
  M.facadeBrick = facade('brick', 1);
  M.facadeLimestone = facade('limestone', 2);
  M.facadeGlass = facade('glass', 3, 0.5);
  M.facadeDeco = facade('deco', 4);
  M.storefront = facade('storefront', 5, 1.01);   // shops are always lit

  // code colours (palette)
  M.iron = coded(0x2c3229);
  M.ironGreen = coded(0x34463a);
  M.roof = coded(0x5e5a56);
  M.tar = coded(0x47423f);
  M.copper = coded(0x7fa693);
  M.slate = coded(0x55606b);
  M.cream = coded(0xe8dcc0);
  M.white = coded(0xf1eee6);
  M.wood = coded(0x8a5a3a);
  M.woodDark = coded(0x5b3b26);
  M.bronze = coded(0x5a5a40);
  M.gold = coded(0xd7a640);
  M.red = coded(0xb3432d);
  M.green = coded(0x3e5b3a);       // ranger green: sheds, benches, kiosks
  M.plywood = coded(0x4d6b45);
  M.scaffold = coded(0x8e949a);
  M.rubber = coded(0x2a2a2a);
  M.asphalt = coded(0x4a4a4c);
  M.kerb = coded(0xb8b2a6);
  M.lineWhite = coded(0xe6e3da);    // #48: road markings in the transverse cuts
  M.lineYellow = coded(0xe2b13c);
  M.tile = coded(0xd9c8a0);
  M.glassDark = coded(0x3a4d5c, { roughness: 0.6 });
  M.boards = coded(0xf4f1ea);
  M.dirt = coded(0x8a6d4b);
  M.trunk = coded(0x5c4633);
  M.canvas = std({ map: makeStripeTexture(['#E07B39', '#F4E6CC', '#E07B39', '#F4E6CC'], { vertical: true }) });
  const stackTex = makeStripeTexture(['#E8682A', '#F4F1EA', '#E8682A', '#F4F1EA']);
  stackTex.repeat.set(1, 1);
  M.stack = std({ map: stackTex });
  M.lamp = std({ color: 0xfff1c8, emissive: 0xffc870, emissiveIntensity: 1 });
  addShaderPatch(M.lamp, {
    key: 'lampglow', uniforms: { uLampGlow: U.uLampGlow }, fragmentHeader: 'uniform float uLampGlow;',
    fragmentReplace: [['#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= (0.15 + uLampGlow);']],
  });
  M.signLit = std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });

  for (const m of Object.values(M)) m.userData.rule = true;
  return { M, noise };
}
