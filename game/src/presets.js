// Quality presets (Tech plan, "Rendering budget"). High and Medium are the
// desktop targets; Low is for phones and weak laptops. Auto picks Low on touch
// devices, Medium on integrated GPUs, otherwise High, then probes the first
// 3 s (below 40 fps → Low) and steps down one level if play stays below
// 50 fps for 5 s. Land/perf: both are judged on whole windows (the 3 s after a
// 2 s warm-up; then 1 s windows), not frame by frame: at 45 fps on a 60 Hz
// screen every other frame is a fast one, which used to reset the 5 s count,
// so the step-down never happened in play. A forced preset (?preset=low|medium|high) turns Auto off,
// so headless replays never change what they draw.

export const PRESETS = {
  high: {
    id: 'high', label: 'High', caps: { triangles: 1_200_000, calls: 300 }, far: 400, fog: [260, 2300],
    trees: { full: 36, mid: 84, lod: 320 }, crowd: { full: 90, lod: 250, songbirds: 80, horses: 10, range: 120 },
    shadowMap: 2048, shadowBox: 60, pixelRatio: 1.5,   // Land/perf: was 2 (a high-DPI monitor drew 4x the pixels)
    textureScale: 1, facadeMax: 2048, humans: 16, blobDetail: 1,
    casters: { trees: 40, static: true }, propPool: { lamppost: 24, bench: 16 }, farDetail: 'full', fullTreeModel: 'full',
  },
  medium: {
    id: 'medium', label: 'Medium', caps: { triangles: 800_000, calls: 220 }, far: 300, fog: [220, 2100],
    trees: { full: 24, mid: 40, lod: 160 }, crowd: { full: 70, lod: 200, songbirds: 60, horses: 8, range: 100 },
    shadowMap: 1024, shadowBox: 40, pixelRatio: 1, textureScale: 1, facadeMax: 2048, humans: 12, blobDetail: 0,
    casters: { trees: 18, static: true }, propPool: { lamppost: 12, bench: 8 }, farDetail: 'medium', fullTreeModel: 'full',
  },
  low: {
    id: 'low', label: 'Low', caps: { triangles: 300_000, calls: 150 }, far: 150, fog: [140, 1700],
    trees: { full: 30, lod: 150 }, crowd: { full: 30, lod: 80, songbirds: 20, horses: 4, range: 50 },
    shadowMap: 1024, shadowBox: 30, pixelRatio: 1.25, textureScale: 0.5, facadeMax: 1024, humans: 6, blobDetail: 0,
    // Low: shadows from Gus and near props only; the nearest trees use the 600-tri LOD model
    casters: { trees: 0, static: false }, propPool: { lamppost: 4, bench: 3 }, farDetail: 'low', fullTreeModel: 'lod', lodTreeModel: 'standin',
  },
};

const KEY = 'cpp-preset';

/** Decide the preset at start-up. Returns { preset, auto, reason }. */
export function choosePreset() {
  const q = new URLSearchParams(location.search).get('preset');
  if (q && PRESETS[q]) return { preset: PRESETS[q], auto: false, reason: 'forced by ?preset' };
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (saved && saved !== 'auto' && PRESETS[saved]) return { preset: PRESETS[saved], auto: false, reason: 'chosen in settings' };
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch) return { preset: PRESETS.low, auto: true, reason: 'touch device' };
  if (saved === 'auto-low') return { preset: PRESETS.low, auto: true, reason: 'auto stepped down' };
  if (saved === 'auto-medium') return { preset: PRESETS.medium, auto: true, reason: 'auto stepped down' };
  const gpu = gpuName();
  if (/intel|uhd|iris|integrated|mali|adreno|apple gpu|swiftshader|llvmpipe/i.test(gpu)) return { preset: PRESETS.medium, auto: true, reason: 'integrated GPU: ' + gpu };
  return { preset: PRESETS.high, auto: true, reason: 'desktop GPU: ' + gpu };
}

function gpuName() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  } catch { return 'unknown'; }
}

export function savePreset(id) { try { localStorage.setItem(KEY, id); } catch { /* ignore */ } }

/** Auto probe: feed it real frame times; it calls onDrop(nextPresetId) when it decides to step down. */
export class AutoProbe {
  constructor(preset, onDrop) {
    this.preset = preset;
    this.onDrop = onDrop;
    this.t = 0; this.frames = 0; this.slowFor = 0; this.done = false;
    this.winT = 0; this.winN = 0;
  }
  /** dt: one rendered frame's real duration (s), only while playing (not paused, not mid-scene). */
  frame(dt) {
    if (this.done || dt <= 0 || dt > 0.5) return;
    const next = this.preset.id === 'high' ? 'medium' : this.preset.id === 'medium' ? 'low' : null;
    if (!next) { this.done = true; return; }
    this.t += dt;
    if (this.t <= 2) return;   // warm-up: the first frames of play stream models and upload textures
    this.frames++;
    if (this.t >= 5 && this.t - dt < 5) {
      const fps = this.frames / (this.t - 2);
      if (fps < 40) { this.done = true; this.onDrop(fps < 25 ? 'low' : next, fps); return; }
    }
    if (this.t > 5) {
      this.winT += dt; this.winN++;
      if (this.winT >= 1) {
        const fps = this.winN / this.winT;
        this.slowFor = fps < 50 ? this.slowFor + this.winT : 0;
        this.lastFps = fps;
        this.winT = 0; this.winN = 0;
        if (this.slowFor >= 5) { this.done = true; this.onDrop(next, fps); }
      }
    }
  }
  /** A pause, a menu or a scene breaks the run: the slow count starts again (the warm-up doesn't). */
  interrupt() { this.winT = 0; this.winN = 0; this.slowFor = 0; }
}
