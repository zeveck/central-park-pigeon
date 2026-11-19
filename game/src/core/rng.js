// Seeded randomness and noise. Nothing in the game calls Math.random():
// every stream is derived from the world seed and a name, so a replay (or a
// screenshot) sees exactly the same park every time.

export const WORLD_SEED = 1959;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** A named random stream: rngFor('trees')() → [0, 1). */
export function rngFor(name, seed = WORLD_SEED) {
  return mulberry32(hashString(name) ^ seed);
}

/** Integer lattice hash → [0, 1). */
export function hash2(ix, iz, seed = WORLD_SEED) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Smooth value noise in [-1, 1]. */
export function valueNoise(x, z, seed = WORLD_SEED) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
}

export function fbm(x, z, { octaves = 4, lacunarity = 2, gain = 0.5, seed = WORLD_SEED } = {}) {
  let amp = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x, z, seed + o * 101) * amp;
    norm += amp;
    amp *= gain;
    x *= lacunarity; z *= lacunarity;
  }
  return sum / norm;
}
