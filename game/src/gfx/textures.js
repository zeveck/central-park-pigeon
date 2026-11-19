// Texture loading with progress, sized per quality preset (Low halves them).
// Images are decoded off the main thread into ImageBitmaps.

import * as THREE from 'three';

export class Progress {
  constructor(onChange) { this.total = 0; this.done = 0; this.label = ''; this.onChange = onChange; }
  add(w = 1) { this.total += w; this.#emit(); }
  finish(w = 1, label) { this.done += w; if (label) this.label = label; this.#emit(); }
  set(label) { this.label = label; this.#emit(); }
  get fraction() { return this.total ? Math.min(1, this.done / this.total) : 0; }
  #emit() { this.onChange?.(this.fraction, this.label); }
}

export class TextureStore {
  /** scale: 1 or 0.5 (Low); anisotropy from the renderer. */
  constructor({ base = './assets/', scale = 1, anisotropy = 4, progress = null } = {}) {
    this.base = base;
    this.scale = scale;
    this.anisotropy = anisotropy;
    this.progress = progress;
    this.cache = new Map();
  }

  /**
   * opts: srgb (colour data, default true), maxSize (cap before the preset scale),
   * wrap ('repeat' | 'mirror' | 'clamp'), repeat [u, v] (applies to texture.repeat).
   */
  load(url, opts = {}) {
    const key = url + JSON.stringify(opts);
    if (this.cache.has(key)) return this.cache.get(key);
    this.progress?.add(1);
    const p = this.#load(url, opts).then((t) => { this.progress?.finish(1, url.split('/').pop()); return t; });
    this.cache.set(key, p);
    return p;
  }

  async #load(url, { srgb = true, maxSize = 2048, wrap = 'repeat', repeat = null, mipmaps = true } = {}) {
    const res = await fetch(this.base + url);
    if (!res.ok) throw new Error(`texture ${url}: HTTP ${res.status}`);
    const blob = await res.blob();
    // read the natural size first, then resize while decoding
    const probe = await createImageBitmap(blob);
    const s = Math.min(1, maxSize / Math.max(probe.width, probe.height)) * this.scale;
    const w = Math.max(1, Math.round(probe.width * s)), h = Math.max(1, Math.round(probe.height * s));
    let bmp = probe;
    if (w !== probe.width || h !== probe.height) {
      probe.close?.();
      bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high', imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    } else {
      probe.close?.();
      bmp = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    }
    const t = new THREE.Texture(bmp);
    t.flipY = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    const w8 = wrap === 'mirror' ? THREE.MirroredRepeatWrapping : wrap === 'clamp' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.wrapS = t.wrapT = w8;
    t.anisotropy = this.anisotropy;
    t.generateMipmaps = mipmaps;
    t.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    t.userData.size = [w, h];
    return t;
  }
}

/** A small seamless grey canvas-noise texture: code-coloured materials multiply it by their colour. */
export function makeNoiseTexture(size = 128, { spread = 0.16, strokes = 900, seed = 7 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, size, size);
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  for (let i = 0; i < strokes; i++) {
    const k = Math.round(216 * (1 + (rnd() - 0.5) * spread * 2));
    g.fillStyle = `rgba(${k},${k},${k},0.55)`;
    const x = rnd() * size, y = rnd() * size, w = 2 + rnd() * 6, h = 1 + rnd() * 3;
    // draw wrapped so the tile is seamless
    for (const dx of [0, -size]) for (const dy of [0, -size]) g.fillRect(x + dx, y + dy, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Horizontal stripes (steam stacks, awnings): colours top to bottom. */
export function makeStripeTexture(colors, { size = 64, vertical = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const n = colors.length;
  colors.forEach((col, i) => {
    g.fillStyle = col;
    if (vertical) g.fillRect((i * size) / n, 0, size / n + 1, size);
    else g.fillRect(0, (i * size) / n, size, size / n + 1);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
