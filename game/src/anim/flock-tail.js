// #49: the flock's flight model (pigeon-plain-fly) has its tail off to one side, as Gus's old flight model did (#28
// remade his). Its 13 colour layers are painted in this mesh's UV layout, so instead of a new model the tail is put back
// on the centre line here, once, at load: vertex positions move, UVs don't, so every layer still fits.
//
// Model space (the model is upright, as its picture, leaning back; main.js pitches it forward to fly; +y up, -z its back):
//   - the fan hangs below the belly to the right of the feet (y < 0.105, x > 0.025; its lowest vertices average x 0.074):
//     it slides to x 0, blended out over y 0.075-0.105 and x 0.025-0.04 so it stays joined to the body;
//   - a flat tail piece sticks out sideways off the back (z < -0.035, y 0.085-0.135, x 0.07-0.18; seen from above in
//     flight it is the tail, off to the bird's side, and it sat inside the wingbeat's ramp, so it flapped a little): it
//     folds down a quarter turn about its root (0.05, 0.11) and slides to x 0, so in flight it trails straight back.
// Debug: window.__G.flockTail = { fan, flap } (vertex counts moved).

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export const FLOCK_TAIL = {
  fan: { yTop: 0.105, yFull: 0.075, xMin: 0.025, xFull: 0.04, lowY: 0.05 },
  flap: { z: -0.035, y0: 0.085, y1: 0.135, x0: 0.07, x1: 0.09, pivot: [0.05, 0.11], turn: -Math.PI / 2 },
};

/** Moves the tail onto the centre line, in place. Returns the vertex counts moved. */
export function straightenFlockTail(geometry, T = FLOCK_TAIL) {
  const a = geometry.attributes.position, n = a.count;
  const { fan, flap } = T;
  const isFlap = (x, y, z) => z < flap.z && y > flap.y0 && y < flap.y1 && x > flap.x0;
  // the fan's centre: the mean x of its lowest vertices
  let sx = 0, c = 0;
  for (let i = 0; i < n; i++) { const x = a.getX(i); if (a.getY(i) < fan.lowY && x > fan.xMin) { sx += x; c++; } }
  const cx = c ? sx / c : 0;
  const [px, py] = flap.pivot;
  let nFan = 0, nFlap = 0;
  const moved = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    if (isFlap(x, y, z)) {
      const w = smooth(flap.x0, flap.x1, x), t = flap.turn * w, dx = x - px, dy = y - py;
      a.setX(i, px + dx * Math.cos(t) - dy * Math.sin(t) - px * w);
      a.setY(i, py + dx * Math.sin(t) + dy * Math.cos(t));
      moved[i] = 1; nFlap++;
    } else {
      const w = smooth(fan.yTop, fan.yFull, y) * smooth(fan.xMin, fan.xFull, x);
      if (w > 0) { a.setX(i, x - cx * w); moved[i] = 1; nFan++; }
    }
  }
  a.needsUpdate = true;
  // fresh normals where the tail moved; the model's own everywhere else (the body looks exactly as before)
  const nrm = geometry.attributes.normal, keep = nrm ? Float32Array.from(nrm.array) : null;
  geometry.computeVertexNormals();
  if (keep) { const out = geometry.attributes.normal; for (let i = 0; i < n; i++) if (!moved[i]) out.setXYZ(i, keep[i * 3], keep[i * 3 + 1], keep[i * 3 + 2]); out.needsUpdate = true; }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { fan: nFan, flap: nFlap, cx: +cx.toFixed(4) };
}
