// Boot fix: GPU work at load without blocking the main thread.
//
// Chrome runs WebGL in the GPU process. Any synchronous GL query (a program's link status or uniform list on first use,
// readPixels, a full transfer buffer) makes the page wait until the GPU process has worked through everything queued
// before it: in software GL, or on Windows/ANGLE where shaders are compiled to HLSL and pipelines are built at the first
// draw, that was 10–70 s in one task ("Page Unresponsive"). So: queue a batch of GPU work, wait for it with a fence that
// is polled from timers (the page stays responsive and keeps painting), then do the next batch.

/** Resolves once the GPU has finished everything queued so far. Never blocks: polls a fence every few ms. */
export function gpuIdle(renderer, { maxMs = 120000 } = {}) {
  const gl = renderer.getContext();
  if (!gl.fenceSync) return new Promise((r) => setTimeout(r, 0));
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const t0 = performance.now();
  return new Promise((resolve) => {
    const poll = () => {
      const st = gl.clientWaitSync(sync, 0, 0);
      if (st === gl.TIMEOUT_EXPIRED && performance.now() - t0 < maxMs) { setTimeout(poll, 8); return; }
      gl.deleteSync(sync);
      resolve();
    };
    setTimeout(poll, 0);
  });
}

/** renderer.compileAsync where the browser has KHR_parallel_shader_compile (links run off the main thread and are polled),
 *  else compile() (which only queues the links; three.js would also warn on every compileAsync). Wait with gpuIdle after. */
export function compileQuiet(renderer, scene, camera) {
  if (renderer.extensions.has('KHR_parallel_shader_compile')) return renderer.compileAsync(scene, camera).catch((e) => console.warn('compileAsync', e));
  try { renderer.compile(scene, camera); } catch (e) { console.warn('compile', e); }
  return Promise.resolve();
}

/** After compileAsync: fetch every program's uniforms and attributes now, while the GPU is idle (cheap), so the first
 *  render never stops on them behind a queue of draws. */
export function primePrograms(renderer) {
  for (const p of renderer.info.programs || []) {
    try { p.getUniforms(); p.getAttributes(); } catch { /* a failed program logs on its own */ }
  }
}

/** Every texture the materials under these roots use (maps, uniforms, arrays). */
export function sceneTextures(...roots) {
  const out = new Set();
  const add = (v) => {
    if (!v) return;
    if (v.isTexture) { if (!v.isRenderTargetTexture && !v.isDepthTexture) out.add(v); return; }
    if (Array.isArray(v)) { for (const x of v) add(x); return; }
  };
  const seen = new Set();
  const mat = (m) => {
    if (!m || seen.has(m)) return;
    seen.add(m);
    for (const k in m) { const v = m[k]; if (v && (v.isTexture || Array.isArray(v))) add(v); }
    if (m.uniforms) for (const k in m.uniforms) add(m.uniforms[k]?.value);
  };
  for (const root of roots) root?.traverse((o) => { if (Array.isArray(o.material)) o.material.forEach(mat); else mat(o.material); });
  return [...out];
}

/** Upload textures a few at a time, letting the GPU catch up (and the page paint) between batches. */
export async function uploadTextures(renderer, textures, { perBatch = 6, onProgress } = {}) {
  for (let i = 0; i < textures.length; i += perBatch) {
    for (const t of textures.slice(i, i + perBatch)) {
      try { if (t.image || t.isCompressedTexture || t.isDataTexture || t.isDataArrayTexture) renderer.initTexture(t); } catch { /* uploaded at first use instead */ }
    }
    await gpuIdle(renderer);
    onProgress?.(Math.min(1, (i + perBatch) / textures.length));
  }
}
