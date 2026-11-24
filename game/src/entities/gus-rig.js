// Rig data for Gus's two meshgen models, in each model's own space as baked
// by loadBakedModel (metres, +Y up, +Z front, feet at y = 0). Measured from the
// accepted GLBs (gus-stand 0.32 m tall; gus-fly 0.32 m tall with wings up, remade for #28).
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
    // Flight hint / scarf: rebuilt from the posed vertices each update, the torso only (a radial hull bulges wherever the
    // shape isn't round from its centre: up the neck, out to the raised tail feather); the rest is the surface below
    hull: [
      { c: [0, 0.11, 0], x: 0.13, y: [0.05, 0.178], z: [-0.09, 0.15], margin: 0.006, bone: 'body', face: true },   // the torso (the raised tail feather made a bulge)
    ],
    // Flight hint / scarf: and the posed surface itself (scarf.js buildSurface): the neck and nape (which the head thrust
    // moves; the tails' roots sank into it), the back, the wing tips
    surface: { x: 0.14, y: [0.07, 0.245], z: [-0.26, 0.2], margin: 0.008, near: [0.014, 0.198, 0.046, 0.145] },   // near: within reach of the knot
    swing: 0.6,                          // Polish-2: radians either way of its rest direction (they had swung round his chest)
    keep: { back: -0.055, rampY: 0.158, ramp: 1.0 },   // Flight hint / scarf: up and over the rump / raised-tail crease (scarf.js #keepOut)
  },
};

// The flock (main.js: pigeon-plain-fly, a different model) keeps the numbers it was fitted with when it borrowed
// Gus's old flight rig; #28 remade gus-fly, so they are frozen here and GUS_FLY is free to follow the new mesh.
export const FLOCK_FLY = {
  scale: 1.15,
  bodyCenter: { x: 0, y: 0.16, z: 0 },
  wings: {
    shoulder: { x: 0.062, y: 0.175, z: -0.01 },
    rootX: [0.058, 0.1],
    rootY: [0.085, 0.125],
    span: 0.22,
  },
};

export const GUS_FLY = {
  url: 'gus-fly.glb',
  // #28: gus-fly remade symmetric (one pair of eyes, the tail fan on the centre line), 0.32 m tall with the wings up.
  // Its head is bigger than the old model's (which ×1.15 left ~15% bigger than gus-stand's); at ×1.0 it matches
  // gus-stand's head in a front render (eyes 0.057 apart, the same width), so the take-off / landing swap doesn't jump.
  scale: 1.0,
  bodyCenter: { x: 0, y: 0.17, z: 0 },   // the torso (y 0.1-0.25, z -0.07..0.085); the pitch / bank pivot
  flightPitch: 0.76,                     // the model is upright (as its picture), leaning back 68.7°; lean it forward to fly
  // Gus rig: leg bones only (the wings stay on anim/wingbeat.js). Feet are the pink clumps under the belly
  // (pink texels at x ±0.005-0.035, y 0.06-0.095, z -0.04..0.016); the belly is at y ~0.097 over them.
  skin: {
    legs: [
      { hip: [-0.021, 0.095, -0.008], foot: [-0.021, 0.064, 0] },
      { hip: [0.021, 0.095, -0.008], foot: [0.021, 0.064, 0] },
    ],
    box: [0.016, 0.028],                   // |x - hip.x| full weight inside, none outside
    top: [0.086, 0.099],                   // leg weight fades out up into the belly
    tailZ: [-0.056, -0.044],               // the tail fan's root (z < -0.05 at the feet's height) is never leg
  },
  // The wings are one sheet in the plane z -0.03..-0.055, out of the flanks (the body is |x| < 0.067 in front of
  // it, the back bulges behind it to z -0.066); the wing's lower edge is y 0.11-0.12 at the root, the tail fan
  // below it tops out at y 0.104 (|x| < 0.12). rootX starts outside the body so the body never moves.
  wings: {
    shoulder: { x: 0.062, y: 0.175, z: -0.035 },
    rootX: [0.064, 0.11],
    rootY: [0.092, 0.114],
    span: 0.2,
  },
  scarf: {
    neck: { x: 0, y: 0.222, z: 0.018 },  // the neck's narrowest: y 0.22-0.23, z -0.044..0.074, |x| < 0.052
    radius: [0.049, 0.056],
    tube: 0.012,
    tilt: 0.1,
    knot: { x: 0.012, y: 0.217, z: -0.042 },
    tails: [{ x: -0.35, y: -1, z: -0.5 }, { x: 0.35, y: -1, z: -0.45 }], // down his back: ~25 deg below level in flight
    body: { x: 0, y: 0.16, z: 0.01, r: 0.07 },
    // the torso only (below the wrap, above the feet), the rest by the surface; corridor: the tails' centre lines stay
    // within |x| 0.03 (edges 0.047); see keep below
    hull: [
      { c: [0, 0.15, 0], x: 0.065, y: [0.06, 0.2], z: [-0.075, 0.09], margin: 0.006, corridor: 0.03 },
    ],
    // the posed surface: the body between the wings (|x| inside rootX, so the wingbeat never moves it), above the legs,
    // the nape and the back of the head
    surface: { x: 0.062, y: [0.1, 0.28], z: [-0.22, 0.16], margin: 0.005, near: [0.012, 0.217, -0.042, 0.145] },
    // on a deep downstroke the wings' roots sweep in under the shoulders to |x| 0.01, from y 0.04 to 0.14 but only
    // in their own plane (z -0.034..-0.054); below y 0.14 the tails trail off the back behind it (the back itself is
    // at z -0.066), never lower than y 0.105 (the tail fan)
    keep: { y0: 0.14, z0: -0.062, slope: 1.0, floorY: 0.105 },
  },
};
