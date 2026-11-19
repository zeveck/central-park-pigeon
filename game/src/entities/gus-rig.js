// Rig data for Gus's two meshgen models, in each model's own space as baked
// by loadBakedModel (metres, +Y up, +Z front, feet at y = 0). Measured from the
// accepted GLBs (gus-stand 0.32 m tall; gus-fly 0.32 m tall with wings up).
// If a model is remade, re-measure these: slice the GLB's vertices by height
// for the neck profile and pivots, and check them in game/test/gus.html.

export const GUS_STAND = {
  url: 'gus-stand.glb',
  neck: {
    pivot: { x: 0, y: 0.17, z: 0.07 },  // neck base, just above the breast
    head: { x: 0, y: 0.265, z: 0.105 },  // middle of the head
    neckY: [0.165, 0.225],
    neckZ: [-0.04, 0.02],                // the tail feather (z < -0.1) never moves
    headY: [0.212, 0.24],
  },
  scarf: {
    neck: { x: 0, y: 0.204, z: 0.101 },  // the neck is 0.10 deep (z 0.05-0.15) and 0.095 wide here
    radius: [0.052, 0.054],
    tube: 0.012,
    tilt: 0.18,
    knot: { x: 0.014, y: 0.198, z: 0.046 },
    tails: [{ x: -0.25, y: -1, z: -0.7 }, { x: 0.3, y: -1, z: -0.6 }],
    body: { x: 0, y: 0.09, z: 0.03, r: 0.088 },
  },
};

export const GUS_FLY = {
  url: 'gus-fly.glb',
  // gus-fly comes out with a smaller body than gus-stand (its wings set the
  // 0.32 m height); this scale makes the two heads match.
  scale: 1.15,
  bodyCenter: { x: 0, y: 0.16, z: 0 },
  flightPitch: 0.7,                      // the model is upright (as its picture); lean it forward to fly
  wings: {
    shoulder: { x: 0.062, y: 0.175, z: -0.01 },
    rootX: [0.058, 0.1],
    rootY: [0.085, 0.125],
    span: 0.22,
  },
  scarf: {
    neck: { x: 0, y: 0.19, z: 0.04 },
    radius: [0.047, 0.05],
    tube: 0.012,
    tilt: 0.1,
    knot: { x: 0.012, y: 0.186, z: -0.008 },
    tails: [{ x: -0.35, y: -1, z: -0.5 }, { x: 0.35, y: -1, z: -0.45 }], // down his back: ~25 deg below level in flight
    body: { x: 0, y: 0.13, z: 0.03, r: 0.07 },
  },
};
