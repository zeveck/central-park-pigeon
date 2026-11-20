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
  // Gus rig: the procedural skeleton (anim/skin-rig.js, entities/gus-skin.js). Pivots measured from the
  // GLB's vertex slices and its pink leg texels (legs y 0.02-0.045, columns ~0.012 m round; toes y < 0.02).
  skin: {
    body: [0, 0.06, 0.03],                 // pivot low, near the feet: the waddle roll and the peck lean
    neck: [0, 0.17, 0.07],
    head: [0, 0.232, 0.1],                 // base of the skull
    tail: [0, 0.1, -0.085],
    legs: [                                // [0] is the x < 0 side, [1] x > 0 (the model's left/right as modelled)
      { hip: [-0.046, 0.1, 0.034], ankle: [-0.046, 0.014, 0.034] },
      { hip: [0.0495, 0.1, 0.021], ankle: [0.0495, 0.014, 0.021] },
    ],
    legCol: [0.02, 0.034],                 // leg column radius: full weight inside, none outside
    legTop: [0.04, 0.062],                 // leg weight fades out up into the belly feathers
    toesY: [0.024, 0.034],                 // below this every vertex on that side is foot
    footY: [0.008, 0.02],                  // toe (foot bone) weight below this, blending into the shank
    neckY: [0.16, 0.21],
    neckZ: [-0.04, 0.02],                  // the back and tail (z < -0.04) stay on the body
    headY: [0.203, 0.228],
    tailZ: [-0.095, -0.13],              // the tail and the wing tips over it
    tailY: [0.05, 0.08],
  },
  scarf: {
    neck: { x: 0, y: 0.204, z: 0.101 },  // the neck is 0.10 deep (z 0.05-0.15) and 0.095 wide here
    radius: [0.052, 0.054],
    tube: 0.012,
    tilt: 0.18,
    knot: { x: 0.014, y: 0.198, z: 0.046 },
    tails: [{ x: -0.25, y: -1, z: -0.7 }, { x: 0.3, y: -1, z: -0.6 }],
    body: { x: 0, y: 0.09, z: 0.03, r: 0.088 },
    // Polish-2: the tails stay outside this (scarf.js buildHull): the body and folded wings below the wrap, the legs and
    // the tail feather left out; it rides the body bone. The old sphere above sat ~1 cm inside the folded wings.
    hull: { c: [0, 0.11, 0], x: 0.13, y: [0.05, 0.178], z: [-0.135, 0.15], margin: 0.005, bone: 'body', face: true },
    swing: 0.6,                          // Polish-2: radians either way of its rest direction (they had swung round his chest)
  },
};

export const GUS_FLY = {
  url: 'gus-fly.glb',
  // gus-fly comes out with a smaller body than gus-stand (its wings set the
  // 0.32 m height); this scale makes the two heads match.
  scale: 1.15,
  bodyCenter: { x: 0, y: 0.16, z: 0 },
  flightPitch: 0.7,                      // the model is upright (as its picture); lean it forward to fly
  // Gus rig: leg bones only (the wings stay on anim/wingbeat.js). Feet are the pink clumps under the belly.
  skin: {
    legs: [
      { hip: [-0.026, 0.078, -0.016], foot: [-0.026, 0.046, -0.02] },
      { hip: [0.034, 0.078, -0.012], foot: [0.034, 0.046, -0.01] },
    ],
    box: [0.022, 0.036],                   // |x - hip.x| full weight inside, none outside
    top: [0.062, 0.078],                   // leg weight fades out up into the belly
    tailZ: [-0.075, -0.06],                // the tail tips (z < -0.07) are never leg
  },
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
    hull: { c: [0, 0.11, -0.02], x: 0.06, y: [0.03, 0.17], z: [-0.12, 0.08], margin: 0.005 },   // Polish-2: the body, not the wings
  },
};
