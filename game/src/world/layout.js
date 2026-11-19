// DATA: where everything in the park and the city ring is.
//
// Coordinates are game metres. +z is north from 59th Street (z = 0) to 110th
// Street (z = 1050.6); x runs west (−) to east (+). The park spans x −110 to
// +110; each side then has a 20 m avenue and a 50 m deep block of buildings.
// A street maps at 20.6 m, so z = (street − 59) × 20.6.
//
// Most places are written in park terms: u = 0 at Central Park West, 1 at
// Fifth Avenue, and a street number. P(u, street) turns that into metres.
// The real park was traced by eye at this squeeze (about 1:3.8); people,
// benches and trees stay life-size.
//
// Gameplay positions (collision proxies, perches, nests, grates, views) live
// here. Visual detail is built from these numbers in the world/*.js builders.

export const BLOCK = 20.6;
export const X = (u) => -110 + u * 220;
export const Z = (street) => (street - 59) * BLOCK;
export const P = (u, street) => ({ x: X(u), z: Z(street) });
const pts = (list) => list.map(([u, st]) => P(u, st));

export const PARK = { xMin: -110, xMax: 110, zMin: 0, zMax: Z(110) };
export const AVENUE = 20;          // avenue / CPS / 110th St width
export const BLOCK_DEPTH = 50;     // depth of the city ring's buildings
export const WORLD = { xMin: -200, xMax: 200, zMin: -100, zMax: Z(110) + 100 };

// ------------------------------------------------------------------ zones
export const ZONES = [
  { id: 'south', name: 'The Pond', z: [-80, 140] },
  { id: 'middle', name: 'The Mall', z: [140, 330] },
  { id: 'ramble', name: 'The Woods', z: [330, 440] },
  { id: 'greatlawn', name: 'Great Lawn', z: [440, 540] },
  { id: 'reservoir', name: 'Reservoir', z: [540, 770] },
  { id: 'north', name: 'The Woods Up North', z: [770, 1130] },
];
export function zoneAt(x, z) {
  if (x < PARK.xMin - 2 || x > PARK.xMax + 2 || z < -2 || z > PARK.zMax + 2) return 'city';
  for (const zn of ZONES) if (z >= zn.z[0] && z < zn.z[1]) return zn.id;
  return 'north';
}

// ------------------------------------------------------------------ water
// Each body: a closed outline (smoothed with a Catmull-Rom spline at build
// time) and a water level in metres. Terrain is carved into a basin below.
export const WATER = [
  {
    id: 'pond', name: 'The Pond', level: -0.9, depth: 2.2,
    // a hook: a wide body by 59th, a neck under Gapstow Bridge, a thin arm north-east
    outline: pts([[0.62, 59.65], [0.70, 59.5], [0.80, 59.5], [0.88, 59.75], [0.89, 60.25], [0.84, 60.55], [0.795, 60.85],
      [0.80, 61.35], [0.84, 61.75], [0.855, 62.15], [0.82, 62.35], [0.775, 62.0], [0.755, 61.4], [0.745, 60.95],
      [0.70, 60.75], [0.645, 60.6], [0.605, 60.2]]),
  },
  {
    id: 'lake', name: 'The Lake', level: -1.0, depth: 2.8,
    // From Bethesda's water stairs east, up the boathouse arm, back round the
    // Point, through Bow Bridge's channel and round the west body and its
    // north-west arm, then back along Cherry Hill's shore.
    outline: pts([
      [0.50, 73.38], [0.565, 73.4], [0.61, 73.6], [0.635, 74.1], [0.63, 74.7], [0.62, 75.4], [0.61, 76.1], [0.59, 76.7],
      [0.565, 76.5], [0.56, 75.7], [0.555, 75.0], [0.53, 74.6], [0.495, 74.45], [0.475, 74.25],
      [0.45, 74.5], [0.41, 74.8], [0.365, 75.05], [0.33, 75.25], [0.30, 75.5], [0.27, 75.85], [0.24, 76.4],
      [0.21, 77.0], [0.17, 77.45], [0.14, 77.3], [0.155, 76.7], [0.17, 76.0], [0.13, 75.45], [0.15, 74.8],
      [0.20, 74.35], [0.25, 73.95], [0.30, 73.8], [0.345, 73.95], [0.38, 73.7], [0.43, 73.5], [0.47, 73.4],
    ]),
  },
  {
    id: 'turtle', name: 'Turtle Pond', level: -0.6, depth: 1.8,
    outline: pts([[0.42, 79.95], [0.47, 79.62], [0.56, 79.58], [0.64, 79.66], [0.67, 79.95], [0.645, 80.4], [0.57, 80.5],
      [0.51, 80.32], [0.46, 80.45], [0.42, 80.3]]),
  },
  {
    id: 'conservatory', name: 'Conservatory Water', level: -0.25, depth: 0.8, stone: true,
    // a formal stone-edged basin
    outline: pts([[0.80, 73.3], [0.90, 73.3], [0.905, 73.45], [0.905, 74.55], [0.90, 74.7], [0.80, 74.7], [0.795, 74.55], [0.795, 73.45]]),
    smooth: false,
  },
  {
    id: 'reservoir', name: 'The Reservoir', level: -1.2, depth: 3.5,
    ellipse: { cx: 0, cz: 662, rx: 90, rz: 93, exp: 2.25, n: 64 },
  },
  {
    id: 'pool', name: 'The Pool', level: 2.2, depth: 1.6,
    outline: pts([[0.10, 101.1], [0.14, 100.75], [0.20, 100.8], [0.245, 101.15], [0.25, 101.6], [0.21, 101.85], [0.15, 101.8], [0.11, 101.55]]),
  },
  // The Loch: a stream in four stepped reaches from the Pool to the Meer.
  { id: 'loch-1', name: 'The Loch', level: 1.2, depth: 0.8, stream: { width: 6.5, pts: pts([[0.245, 101.72], [0.27, 102.2], [0.30, 102.85]]) } },
  { id: 'loch-2', name: 'The Loch', level: 0.6, depth: 0.8, stream: { width: 6, pts: pts([[0.30, 102.85], [0.335, 103.45], [0.375, 103.95]]) } },
  { id: 'loch-3', name: 'The Loch', level: 0.0, depth: 0.8, stream: { width: 6, pts: pts([[0.375, 103.95], [0.425, 104.4], [0.475, 104.9]]) } },
  { id: 'loch-4', name: 'The Loch', level: -0.5, depth: 0.8, stream: { width: 7, pts: pts([[0.475, 104.9], [0.525, 105.4], [0.57, 105.9], [0.625, 106.55]]) } },
  {
    id: 'meer', name: 'Harlem Meer', level: -0.8, depth: 2.4,
    outline: pts([[0.62, 106.6], [0.70, 106.25], [0.80, 106.3], [0.90, 106.55], [0.955, 107.3], [0.965, 108.4], [0.93, 109.2],
      [0.85, 109.45], [0.74, 109.35], [0.665, 109.0], [0.625, 108.3], [0.60, 107.4]]),
  },
];

/** The Loch's waterfall at Glen Span (Pool → first reach). */
export const WATERFALLS = [{ id: 'glen-span', ...P(0.245, 101.72), yaw: 0.6, top: 2.2, bottom: 1.2, width: 3.5 }];

// ------------------------------------------------------------------ terrain
// Hills and rises: Gaussian bumps (h metres, r = radius in metres).
export const HILLS = [
  { id: 'umpire-rock', ...P(0.37, 62.4), h: 3.5, r: 9 },
  { id: 'rat-rock', ...P(0.25, 61.6), h: 2.5, r: 8 },
  { id: 'hallett', ...P(0.70, 61.7), h: 3, r: 14 },
  { id: 'cherry-hill', ...P(0.32, 72.9), h: 3, r: 14 },
  { id: 'strawberry', ...P(0.10, 72.3), h: 2.5, r: 16 },
  { id: 'pilgrim-hill', ...P(0.84, 72.4), h: 3, r: 14 },
  { id: 'cat-hill', ...P(0.86, 75.6), h: 3, r: 12 },
  { id: 'ramble-a', ...P(0.42, 76.7), h: 4.5, r: 26 },
  { id: 'ramble-b', ...P(0.30, 77.6), h: 3.5, r: 20 },
  { id: 'ramble-c', ...P(0.52, 78.0), h: 4, r: 16 },
  { id: 'cedar-hill', ...P(0.70, 77.6), h: 6, r: 28 },
  { id: 'vista-rock', ...P(0.45, 79.35), h: 9, r: 11 },
  { id: 'summit-rock', ...P(0.06, 82.8), h: 8, r: 15 },
  { id: 'great-hill', ...P(0.16, 105.2), h: 9, r: 34 },
  { id: 'north-ridge', ...P(0.42, 102.6), h: 5, r: 26 },
  { id: 'north-woods', ...P(0.30, 107.4), h: 6, r: 26 },
  { id: 'pool-banks', ...P(0.17, 100.2), h: 4.5, r: 22 },
  { id: 'fort-clinton', ...P(0.57, 107.9), h: 7, r: 16 },
  { id: 'nutters', ...P(0.48, 108.8), h: 6, r: 14 },
  { id: 'blockhouse', ...P(0.13, 109.0), h: 10, r: 18 },
  { id: 'east-green', ...P(0.88, 70.5), h: 2, r: 14 },
];

// Flat lawns: terrain eases to `level` inside (softened at the edge).
export const LAWNS = [
  { id: 'sheep-meadow', name: 'Sheep Meadow', level: 0.6, outline: pts([[0.13, 66.3], [0.40, 66.2], [0.43, 67.4], [0.42, 69.4], [0.30, 69.75], [0.15, 69.5], [0.12, 68.0]]) },
  { id: 'great-lawn', name: 'Great Lawn', level: 0.4, ellipse: { ...P(0.47, 82.8), rx: 37, rz: 40, n: 48 } },
  { id: 'north-meadow', name: 'North Meadow', level: 1.0, outline: pts([[0.26, 97.9], [0.70, 97.9], [0.72, 99.8], [0.66, 101.3], [0.33, 101.3], [0.25, 100.2]]) },
  { id: 'east-meadow', name: 'East Meadow', level: 0.6, outline: pts([[0.80, 97.6], [0.95, 97.6], [0.95, 100.2], [0.80, 100.2]]) },
  { id: 'heckscher-fields', name: 'Heckscher Ballfields', level: 0.3, outline: pts([[0.06, 62.6], [0.30, 62.9], [0.31, 64.7], [0.06, 64.7]]) },
  { id: 'cedar-lawn', name: 'Cedar Hill', level: null, outline: pts([[0.64, 76.6], [0.77, 76.5], [0.77, 78.4], [0.64, 78.4]]) },
  { id: 'cherry-lawn', name: 'Cherry Hill', level: null, ellipse: { ...P(0.32, 72.9), rx: 10, rz: 9, n: 24 } },
];

// Transverse roads: sunken cuts straight across, rising to street level at the
// park walls; stone bridges carry every drive and path over them.
export const TRANSVERSES = [
  { id: 't65', name: '65th Street Transverse', z: Z(65.05), halfWidth: 6.5, depth: 6 },
  { id: 't79', name: '79th Street Transverse', z: Z(78.6), halfWidth: 6.5, depth: 6.5 },
  { id: 't86', name: '86th Street Transverse', z: Z(86.0), halfWidth: 6.5, depth: 6 },
  { id: 't97', name: '97th Street Transverse', z: Z(97.15), halfWidth: 6.5, depth: 6 },
];
export const TRANSVERSE_RAMP = 24; // metres from each park wall over which the cut rises to street level

// ------------------------------------------------------------------ drives and paths
// Drives are asphalt (painted into the terrain), paths gravel, the Mall and
// plazas hex pavers. Widths in metres.
export const DRIVES = [
  {
    id: 'park-drive', name: 'East, West and Center Drives', width: 7.5,
    // one loop: in at 7th Ave, up the west side, across the north end, down the east side, out at 6th Ave
    points: pts([[0.33, 59.0], [0.30, 60.6], [0.22, 62.6], [0.14, 64.7], [0.11, 66.8], [0.10, 69.8], [0.115, 72.8], [0.12, 75.6],
      [0.16, 78.6], [0.13, 81.6], [0.065, 84.6], [0.06, 88.4], [0.075, 92.6], [0.10, 96.6], [0.13, 99.6], [0.17, 102.4],
      [0.22, 104.7], [0.30, 105.95], [0.42, 106.2], [0.52, 106.05], [0.60, 106.05], [0.70, 105.85], [0.765, 105.0], [0.79, 103.0],
      [0.82, 100.0], [0.875, 96.4], [0.885, 92.4], [0.865, 88.6], [0.835, 85.4], [0.80, 82.2], [0.785, 79.2], [0.80, 76.2],
      [0.76, 73.2], [0.725, 70.2], [0.70, 67.6], [0.655, 66.0], [0.60, 64.6], [0.58, 62.6], [0.615, 60.6], [0.66, 59.0]]),
  },
  { id: 'terrace-drive', name: 'Terrace Drive (72nd St)', width: 7, points: pts([[0.10, 71.6], [0.30, 71.85], [0.53, 71.9], [0.73, 71.6]]) },
];

export const PATHS = [
  // the south end
  { id: 'merchants', width: 3.5, points: pts([[0.01, 59.15], [0.08, 60.0], [0.17, 61.2], [0.30, 61.9], [0.38, 63.0], [0.42, 64.6], [0.50, 66.25]]) },
  { id: 'scholars', width: 3.5, points: pts([[0.99, 59.2], [0.92, 60.3], [0.88, 61.6], [0.84, 62.9], [0.72, 63.5], [0.60, 63.9], [0.53, 64.4]]) },
  { id: 'artists', width: 3.2, points: pts([[0.70, 59.1], [0.66, 59.9], [0.60, 61.0], [0.53, 62.4], [0.47, 63.1], [0.53, 64.4], [0.53, 66.3]]) },
  { id: 'chess-dairy', width: 3, points: pts([[0.30, 61.9], [0.40, 62.6], [0.47, 63.1]]) },
  { id: 'heckscher-sheep', width: 3.2, points: pts([[0.20, 61.4], [0.14, 63.0], [0.06, 64.8], [0.08, 66.0], [0.12, 66.2]]) },
  { id: 'zoo-walk', width: 3.2, points: pts([[0.97, 63.6], [0.92, 65.4], [0.86, 66.2], [0.75, 66.6], [0.62, 66.4], [0.53, 66.3]]) },
  // the Mall and round Sheep Meadow
  { id: 'sheep-loop', width: 3, closed: true, points: pts([[0.115, 66.05], [0.41, 65.95], [0.455, 67.4], [0.445, 69.6], [0.30, 70.0], [0.13, 69.75], [0.095, 68.0]]) },
  { id: 'mall-west-walk', width: 3, points: pts([[0.455, 66.6], [0.455, 71.3], [0.45, 71.6]]) },
  { id: 'mall-east-walk', width: 3, points: pts([[0.61, 66.6], [0.61, 71.3], [0.62, 71.6]]) },
  { id: 'cherry-west', width: 3.2, points: pts([[0.45, 71.6], [0.40, 72.1], [0.32, 72.5], [0.22, 72.6], [0.12, 72.2], [0.03, 71.9], [0.0, 71.9]]) },
  { id: 'lake-south', width: 3.2, points: pts([[0.50, 72.9], [0.44, 73.1], [0.38, 73.35], [0.345, 73.6], [0.345, 73.95]]) },
  { id: 'cherry-hill-loop', width: 3, closed: true, points: pts([[0.27, 72.55], [0.36, 72.6], [0.38, 73.1], [0.30, 73.35], [0.25, 73.0]]) },
  { id: 'bow-bridge', width: 3, points: pts([[0.345, 73.95], [0.355, 74.5], [0.365, 75.05]]), bridge: 'bow-bridge' },
  { id: 'pilgrim-walk', width: 3.2, points: pts([[0.62, 71.6], [0.70, 72.5], [0.76, 73.0], [0.79, 73.2], [0.85, 73.15], [0.95, 72.4], [1.0, 72.0]]) },
  { id: 'boathouse-walk', width: 3.2, points: pts([[0.565, 73.35], [0.64, 73.5], [0.67, 74.2], [0.70, 74.8], [0.78, 74.9], [0.80, 74.85]]) },
  { id: 'conservatory-ring', width: 4, kind: 'pavers', closed: true, points: pts([[0.785, 73.2], [0.915, 73.2], [0.915, 74.8], [0.785, 74.8]]) },
  { id: 'conservatory-5th', width: 3.5, kind: 'pavers', points: pts([[0.915, 74.0], [1.0, 74.0]]) },
  { id: 'cedar-walk', width: 3.2, points: pts([[0.80, 74.85], [0.82, 75.8], [0.79, 76.4], [0.74, 76.4], [0.66, 76.5], [0.62, 77.4], [0.63, 78.2], [0.66, 79.6], [0.70, 80.6], [0.72, 81.2]]) },
  // the Ramble's winding paths
  { id: 'ramble-1', width: 2.6, points: pts([[0.365, 75.05], [0.39, 75.5], [0.45, 75.75], [0.50, 75.6], [0.54, 75.8], [0.545, 76.6], [0.52, 77.3], [0.47, 77.6], [0.43, 78.1], [0.45, 78.5], [0.455, 78.95]]) },
  { id: 'ramble-2', width: 2.4, points: pts([[0.45, 75.75], [0.42, 76.3], [0.36, 76.6], [0.30, 76.8], [0.26, 77.4], [0.30, 78.0], [0.37, 78.2], [0.43, 78.1]]) },
  { id: 'ramble-3', width: 2.4, points: pts([[0.42, 76.3], [0.46, 76.9], [0.52, 77.3]]) },
  { id: 'ramble-4', width: 2.4, points: pts([[0.545, 76.6], [0.59, 77.1], [0.62, 77.4]]) },
  { id: 'ramble-5', width: 2.4, points: pts([[0.26, 77.4], [0.20, 77.9], [0.16, 78.5], [0.17, 79.0]]) },
  { id: 'ramble-point', width: 2.2, points: pts([[0.50, 75.6], [0.49, 75.0], [0.48, 74.55]]) },
  // Vista Rock, Turtle Pond, the Delacorte and the Great Lawn
  { id: 'belvedere-walk', width: 3, points: pts([[0.455, 78.95], [0.45, 79.2], [0.42, 79.45], [0.36, 79.5], [0.30, 79.6], [0.22, 79.7], [0.16, 79.6]]) },
  { id: 'turtle-north', width: 3, points: pts([[0.36, 79.5], [0.38, 80.4], [0.44, 80.75], [0.55, 80.75], [0.66, 80.65], [0.70, 80.2], [0.69, 79.6], [0.66, 79.4], [0.56, 79.35], [0.47, 79.4]]) },
  { id: 'great-lawn-loop', width: 3.4, closed: true, ellipse: { ...P(0.47, 82.8), rx: 41.5, rz: 44.5, n: 48 } },
  { id: 'needle-walk', width: 3, points: pts([[0.66, 80.65], [0.69, 81.3], [0.70, 81.6], [0.69, 82.4], [0.67, 83.0]]) },
  { id: 'west-lawn-walk', width: 3, points: pts([[0.255, 82.8], [0.17, 82.6], [0.10, 82.0], [0.03, 81.9], [0.0, 81.9]]) },
  { id: 'great-lawn-south', width: 3, points: pts([[0.47, 80.75], [0.47, 81.0]]) },
  { id: 'great-lawn-north', width: 3, points: pts([[0.47, 84.95], [0.47, 85.5], [0.55, 86.3], [0.60, 86.6]]) },
  { id: 'museum-walk', width: 3, points: pts([[0.72, 81.2], [0.80, 80.0], [0.84, 79.7], [0.98, 79.3], [1.0, 79.3]]) },
  { id: 'east-promenade', width: 3, points: pts([[0.94, 66.4], [0.95, 69.0], [0.96, 71.6], [0.96, 76.0], [0.95, 78.6], [0.84, 79.7]]) },
  { id: 'west-promenade', width: 3, points: pts([[0.035, 72.8], [0.04, 76.0], [0.05, 78.5], [0.03, 81.9], [0.025, 85.4], [0.02, 88.0]]) },
  // the Reservoir: the running track, then the bridle path outside it
  { id: 'reservoir-track', width: 3, kind: 'track', closed: true, ellipse: { cx: 0, cz: 662, rx: 94.5, rz: 97.5, exp: 2.25, n: 64 } },
  { id: 'bridle-path', width: 3.5, kind: 'bridle', closed: true, ellipse: { cx: 0, cz: 662, rx: 103.5, rz: 108, exp: 2.4, n: 64 } },
  { id: 'reservoir-south', width: 3, points: pts([[0.60, 86.6], [0.62, 86.25], [0.75, 86.4], [0.90, 86.7], [1.0, 86.9]]) },
  { id: 'engineers-gate', width: 3.5, points: pts([[1.0, 90.0], [0.95, 90.0], [0.93, 89.6]]) },
  // the north end
  { id: 'north-meadow-loop', width: 3, closed: true, points: pts([[0.24, 97.7], [0.72, 97.7], [0.745, 99.8], [0.68, 101.5], [0.32, 101.5], [0.23, 100.2]]) },
  { id: 'east-meadow-walk', width: 3, points: pts([[0.72, 99.0], [0.79, 99.0], [0.80, 100.4], [0.95, 100.4], [1.0, 100.4]]) },
  { id: 'pool-loop', width: 2.6, closed: true, points: pts([[0.085, 101.05], [0.14, 100.55], [0.21, 100.6], [0.27, 101.1], [0.265, 101.75], [0.21, 102.05], [0.14, 102.0], [0.09, 101.7]]) },
  { id: 'loch-walk', width: 2.6, points: pts([[0.265, 101.75], [0.29, 102.4], [0.32, 103.2], [0.36, 103.75], [0.41, 104.15], [0.46, 104.6], [0.51, 105.05], [0.56, 105.55], [0.60, 106.0]]) },
  { id: 'great-hill-loop', width: 2.8, closed: true, ellipse: { ...P(0.16, 105.2), rx: 16, rz: 16, n: 24 } },
  { id: 'blockhouse-walk', width: 2.6, points: pts([[0.16, 106.0], [0.14, 107.3], [0.12, 108.3], [0.13, 108.95]]) },
  { id: 'north-woods-walk', width: 2.6, points: pts([[0.30, 105.95], [0.33, 104.8], [0.38, 104.0], [0.44, 103.2], [0.50, 102.9], [0.58, 103.1], [0.66, 103.7], [0.765, 104.6]]) },
  { id: 'meer-loop', width: 3, closed: true, points: pts([[0.60, 106.35], [0.70, 106.0], [0.80, 106.05], [0.92, 106.3], [0.985, 107.2], [0.99, 108.5], [0.95, 109.55], [0.85, 109.75], [0.73, 109.65], [0.645, 109.3], [0.60, 108.4], [0.575, 107.4]]) },
  { id: 'conservatory-garden', width: 3.5, kind: 'pavers', points: pts([[1.0, 104.7], [0.83, 104.7]]) },
  { id: 'garden-cross', width: 2.6, points: pts([[0.90, 103.6], [0.90, 105.8]]) },
];

// Paved plazas (hex pavers), as outlines.
export const PLAZAS = [
  { id: 'mall', name: 'The Mall', outline: pts([[0.505, 66.3], [0.555, 66.3], [0.555, 71.55], [0.505, 71.55]]) },
  { id: 'bethesda-terrace', name: 'Bethesda Terrace', outline: pts([[0.465, 71.5], [0.595, 71.5], [0.605, 72.2], [0.585, 73.38], [0.475, 73.38], [0.455, 72.2]]) },
  { id: 'dairy', name: 'The Dairy forecourt', outline: pts([[0.49, 63.65], [0.57, 63.65], [0.57, 64.4], [0.49, 64.4]]) },
  { id: 'carousel', outline: pts([[0.38, 63.85], [0.46, 63.85], [0.46, 64.55], [0.38, 64.55]]) },
  { id: 'chess', outline: pts([[0.44, 62.75], [0.50, 62.75], [0.50, 63.35], [0.44, 63.35]]) },
  { id: 'strawberry-fields', outline: pts([[0.065, 71.95], [0.135, 71.95], [0.135, 72.55], [0.065, 72.55]]), kind: 'path' },
  { id: 'belvedere-court', outline: pts([[0.42, 78.85], [0.49, 78.85], [0.49, 79.55], [0.42, 79.55]]) },
  { id: 'delacorte-court', outline: pts([[0.30, 79.9], [0.37, 79.9], [0.37, 80.25], [0.30, 80.25]]) },
  { id: 'conservatory-garden', name: 'Conservatory Garden', outline: pts([[0.82, 103.45], [0.985, 103.45], [0.985, 105.95], [0.82, 105.95]]), kind: 'garden' },
  { id: 'heckscher-playground', outline: pts([[0.24, 61.25], [0.33, 61.25], [0.33, 61.95], [0.24, 61.95]]) },
  { id: 'wollman', outline: pts([[0.64, 62.45], [0.83, 62.45], [0.83, 64.15], [0.64, 64.15]]) },
  { id: 'zoo', outline: pts([[0.84, 62.9], [0.995, 62.9], [0.995, 64.75], [0.84, 64.75]]) },
  { id: 'maintenance-yard', outline: pts([[0.53, 78.0], [0.63, 78.0], [0.63, 78.3], [0.53, 78.3]]), kind: 'asphalt' },
];

// Where the woods are thick (tree density 0..1; elsewhere the park is about 0.2).
export const WOODS = [
  { id: 'ramble', density: 1.0, outline: pts([[0.18, 77.2], [0.27, 75.9], [0.37, 75.2], [0.47, 74.4], [0.55, 74.7], [0.57, 76.7], [0.63, 77.3], [0.62, 78.3], [0.52, 78.35], [0.40, 78.35], [0.25, 78.5], [0.17, 78.3]]) },
  { id: 'north-woods', density: 1.0, outline: pts([[0.03, 100.3], [0.30, 101.6], [0.40, 101.7], [0.62, 102.0], [0.70, 103.0], [0.74, 105.4], [0.60, 106.6], [0.58, 109.6], [0.03, 109.6]]) },
  { id: 'hallett', density: 0.9, outline: pts([[0.62, 60.8], [0.74, 60.9], [0.77, 62.0], [0.70, 62.35], [0.62, 62.0]]) },
  { id: 'cedar-belt', density: 0.6, outline: pts([[0.62, 78.4], [0.80, 78.5], [0.80, 79.6], [0.64, 79.5]]) },
  { id: 'summit-belt', density: 0.7, outline: pts([[0.02, 80.0], [0.12, 80.0], [0.12, 85.0], [0.02, 85.0]]) },
  { id: 'west-belt-n', density: 0.5, outline: pts([[0.01, 86.5], [0.07, 86.5], [0.07, 96.5], [0.01, 96.5]]) },
  { id: 'east-belt-n', density: 0.5, outline: pts([[0.93, 86.8], [0.995, 86.8], [0.995, 96.5], [0.93, 96.5]]) },
];

// ------------------------------------------------------------------ rocks (exposed Manhattan schist)
export const ROCKS = [
  { id: 'umpire-rock', ...P(0.37, 62.4), y: 3.5, rx: 6, ry: 3, rz: 4.5, yaw: 0.4 },
  { id: 'rat-rock', ...P(0.25, 61.6), y: 2.5, rx: 4, ry: 2, rz: 3, yaw: -0.3 },
  { id: 'vista-rock', ...P(0.455, 79.6), rx: 9, ry: 5, rz: 4.5, yaw: 0.1 },
  { id: 'vista-rock-w', ...P(0.405, 79.45), rx: 5, ry: 4, rz: 4, yaw: 0.8 },
  { id: 'summit-rock', ...P(0.06, 82.8), y: 7, rx: 6, ry: 2.6, rz: 5, yaw: 0.9 },
  { id: 'hernshead', ...P(0.13, 75.45), y: -0.2, rx: 4, ry: 2, rz: 3, yaw: 0.1 },
  { id: 'cedar-rock', ...P(0.72, 77.2), y: 5.2, rx: 4, ry: 1.6, rz: 3, yaw: 1.1 },
  { id: 'turtle-rock', ...P(0.54, 80.0), y: -0.7, rx: 2.4, ry: 1.0, rz: 1.8, yaw: 0.6, note: 'the Turtle Elders\' rock' },
  { id: 'pond-rock-1', ...P(0.66, 60.7), y: -0.3, rx: 3, ry: 1.6, rz: 2.2, yaw: 0.2 },
  { id: 'pond-rock-2', ...P(0.85, 60.55), y: -0.3, rx: 2.2, ry: 1.3, rz: 1.8, yaw: -0.5 },
  { id: 'ramble-cave', ...P(0.38, 77.7), y: 3.4, rx: 5.5, ry: 3.4, rz: 4.5, yaw: 0.5, note: 'the sealed cave: the Workshop' },
  { id: 'ramble-r1', ...P(0.30, 76.5), y: 2.6, rx: 3, ry: 1.6, rz: 2.4, yaw: 0 },
  { id: 'ramble-r2', ...P(0.50, 77.9), y: 3.6, rx: 3.5, ry: 1.8, rz: 2.6, yaw: 1.4 },
  { id: 'ramble-r3', ...P(0.55, 75.4), y: 0.6, rx: 2.4, ry: 1.4, rz: 2, yaw: 0.7 },
  { id: 'great-hill-rock', ...P(0.13, 104.6), y: 8, rx: 5, ry: 2.2, rz: 4, yaw: 0.3 },
  { id: 'blockhouse-bluff', ...P(0.13, 108.7), y: 8.5, rx: 8, ry: 3.5, rz: 6, yaw: 0.2 },
  { id: 'north-r1', ...P(0.33, 102.2), y: 3.5, rx: 3.5, ry: 2, rz: 2.8, yaw: 0.8 },
  { id: 'north-r2', ...P(0.46, 103.6), y: 3.6, rx: 3, ry: 1.8, rz: 2.4, yaw: 1.9 },
  { id: 'north-r3', ...P(0.26, 106.6), y: 5.5, rx: 4, ry: 2.2, rz: 3, yaw: 0.4 },
  { id: 'north-r4', ...P(0.55, 104.8), y: 1.6, rx: 3, ry: 1.8, rz: 2.4, yaw: 2.5 },
  { id: 'fort-clinton-rock', ...P(0.57, 107.9), y: 6.2, rx: 5, ry: 2.2, rz: 3.6, yaw: 0.5 },
  { id: 'pool-rock', ...P(0.25, 101.55), y: 2.6, rx: 2.4, ry: 1.6, rz: 2, yaw: 0.6 },
];

// ------------------------------------------------------------------ landmarks
// kind selects the code builder in landmarks.js. model (★) names a meshgen GLB
// that replaces the code visual when it exists; collision and perches are
// always built in code from these numbers.
export const LANDMARKS = [
  // South: the Pond
  { id: 'gapstow-bridge', name: 'Gapstow Bridge', kind: 'stone-bridge', ...P(0.775, 61.1), yaw: 1.45, span: 15, width: 4, rise: 2.4 },
  { id: 'wollman-rink', name: 'Wollman Rink', kind: 'rink', ...P(0.735, 63.3), yaw: 0, w: 34, d: 24, model: null },
  { id: 'zoo', name: 'The Zoo', kind: 'zoo', ...P(0.915, 63.85), w: 32, d: 36 },
  { id: 'heckscher', name: 'Heckscher Playground', kind: 'playground', ...P(0.285, 61.6) },
  { id: 'carousel', name: 'The Carousel', kind: 'carousel', ...P(0.42, 64.2), r: 7, model: 'carousel' },
  { id: 'dairy', name: 'The Dairy', kind: 'dairy', ...P(0.53, 64.0), yaw: 0 },
  { id: 'chess-house', name: 'Chess & Checkers House', kind: 'chess', ...P(0.47, 63.05) },
  { id: 'merchants-gate', name: "Merchants' Gate", kind: 'column-monument', x: -103, z: 6, h: 14 },
  { id: 'sled-dog', name: 'Sled Dog Statue', kind: 'statue', ...P(0.67, 67.4), model: 'statue-sled-dog', size: [1.2, 2, 2], yaw: -0.6 },
  // Middle: the Mall
  { id: 'tavern', name: 'Tavern on the Green', kind: 'tavern', ...P(0.035, 66.9), yaw: 0 },
  { id: 'mall-statues', name: 'The Mall statues', kind: 'mall-statues', ...P(0.53, 66.6) },
  { id: 'bethesda-terrace', name: 'Bethesda Terrace', kind: 'bethesda', ...P(0.53, 72.0) },
  { id: 'bethesda-fountain', name: 'Bethesda Fountain', kind: 'fountain', ...P(0.53, 72.85), r: 6, model: 'bethesda-fountain' },
  { id: 'strawberry-fields', name: 'Strawberry Fields', kind: 'mosaic', ...P(0.10, 72.25), r: 3.2 },
  { id: 'bow-bridge', name: 'Bow Bridge', kind: 'bow-bridge', ...P(0.355, 74.5), yaw: 0.19, span: 27, width: 3.6, rise: 1.5, model: 'bow-bridge' },
  { id: 'boathouse', name: 'Loeb Boathouse', kind: 'boathouse', ...P(0.655, 74.4), yaw: 0 },
  { id: 'mushroom-statue', name: 'Girl-on-a-mushroom statue', kind: 'statue', ...P(0.85, 74.95), model: 'statue-mushroom', size: [3, 3, 3] },
  { id: 'conservatory-boathouse', name: 'Kerbs Boathouse', kind: 'kiosk', ...P(0.85, 73.1), w: 8, d: 4, h: 4 },
  // Ramble
  { id: 'belvedere', name: 'Belvedere Castle', kind: 'belvedere', ...P(0.45, 79.3), model: 'belvedere-castle' },
  { id: 'delacorte', name: 'Delacorte Theater', kind: 'delacorte', ...P(0.325, 80.55), r: 13, yaw: 0.7 },
  { id: 'shakespeare-garden', name: 'Shakespeare Garden', kind: 'garden-beds', ...P(0.33, 79.25), w: 16, d: 8 },
  { id: 'maintenance-yard', name: 'Maintenance Yard', kind: 'yard', ...P(0.58, 78.15), w: 20, d: 7 },
  { id: 'workshop-cave', name: 'The sealed cave', kind: 'cave', ...P(0.38, 77.55), yaw: Math.PI },
  // Great Lawn
  { id: 'cleopatras-needle', name: "Cleopatra's Needle", kind: 'obelisk', ...P(0.70, 81.6), h: 21 },
  { id: 'met', name: 'The museum', kind: 'met', x: 94, z: Z(82.2), w: 28, d: 92 },
  { id: 'ballfields', name: 'Great Lawn ball fields', kind: 'ballfields', ...P(0.47, 82.8) },
  // Reservoir
  { id: 'south-gatehouse', name: 'South Gatehouse', kind: 'gatehouse', x: 14, z: 566, yaw: 0 },
  { id: 'north-gatehouse', name: 'North Gatehouse', kind: 'gatehouse', x: -12, z: 758, yaw: Math.PI },
  { id: 'reservoir-fence', name: 'Reservoir fence', kind: 'fence-ring', ellipse: { cx: 0, cz: 662, rx: 92.6, rz: 95.6, exp: 2.25, n: 96 } },
  { id: 'engineers-gate', name: "Engineers' Gate", kind: 'gate-posts', x: 108, z: Z(90), yaw: Math.PI / 2 },
  // North
  { id: 'conservatory-garden', name: 'Conservatory Garden', kind: 'formal-garden', ...P(0.9025, 104.7), w: 36, d: 52 },
  { id: 'blockhouse', name: 'The Blockhouse', kind: 'blockhouse', ...P(0.13, 109.05), yaw: 0.25 },
  { id: 'huddlestone', name: 'Huddlestone Arch', kind: 'stone-bridge', ...P(0.585, 106.05), yaw: 0.05, span: 12, width: 8.5, rise: 1.6, road: true },
  { id: 'dana-center', name: 'The Meer boathouse', kind: 'kiosk', ...P(0.76, 109.55), w: 14, d: 6, h: 5 },
  { id: 'north-meadow-fields', name: 'North Meadow fields', kind: 'ballfields', ...P(0.48, 99.6), small: true },
  // City side
  { id: 'grand-army-fountain', name: 'Grand Army Plaza fountain', kind: 'plaza-fountain', x: 97, z: -40, r: 5 },
  { id: 'columbus-column', name: 'Columbus Circle', kind: 'column-monument', x: -122, z: -12, h: 22 },
];

// The rink (data the Rink Job builds on): the ice rectangle (34 × 24 m), the
// 1.1 m boards with a gate at each end, the Zamboni garage (south, on the
// service road), the yard and Prickett's equipment shed (north, by East
// Drive), the ranger cart's spot across the shed door, the launch-lane box
// (12 × 4 m against the north boards, painted KEEP CLEAR chevrons), the kids'
// little ice bump, the scrap bin and the post-job parking spot.
export const RINK = (() => {
  const L = LANDMARKS.find((l) => l.id === 'wollman-rink');
  const x = L.x, z = L.z, w = L.w, d = L.d;
  const north = z + d / 2, south = z - d / 2;
  return {
    x, z, w, d, iceY: 0.15, boardH: 1.1,
    ice: { x0: x - w / 2, x1: x + w / 2, z0: south, z1: north },
    southGate: { x, w: 4.6 },                          // to the garage apron
    northGate: { x, w: 8 },                             // shut until cart.south
    garage: { x, z: south - 7, w: 6, d: 6, h: 3.5 },    // open to the north; the buckled door is a door (DOORS)
    zamboniHome: { x, z: south - 7.4, yaw: 0 },
    shed: { x: x + 10.3, z: north + 6, w: 7, d: 5, h: 3.2 },   // its steel roll-up door faces the rink (south)
    yard: { x: x - 2, z: north + 6, w: 26, d: 8 },
    cartSpot: { x: x + 10.3, z: north + 2.05, yaw: Math.PI / 2 },
    lane: { x0: x + 4.3, x1: x + 16.3, z0: north - 4, z1: north },
    bump: { x: x - 12, z: south + 5, r: 1.3, h: 0.28 },
    scrapBin: { x: x - 7, z: north + 5 },
    parking: { x, z: north - 3, yaw: 0 },
    cones: { x: x - 10, z: south + 2.5 },               // the training cones' stack (the strike)
    zamboni: { top: 4, accel: 1.3, offIce: 1.5, brake: 2.7, hopperSecs: 25, sprayHold: 0.3, sprayReach: 3, pileH: 2, pileR: 1.6, freezeSecs: 3, launchSpeed: 3.5, launchAngle: Math.PI / 6, hop: 1.5 },
  };
})();

// ================================================================== milestone 3a: driving
// Drivable vehicles. surface: land (paths, drives, lawns), ice (the Zamboni:
// grip and drift on the rink, a crawl off it) or water (the RC tug on its
// pond). cam: the driving camera (back, up, look height). seat: where Gus sits
// (model space, metres). rigged: the flag that makes it drivable (raccoons
// Rig it); remote: driven from the shore with the RC remote (gear).
export const VEHICLES = [
  { id: 'hotdog-cart', name: "Vinnie's hot dog cart", model: 'hotdog-cart', home: { x: 8.7, z: 206, yaw: 0 }, surface: 'land', top: 5, accel: 2.2, turn: 1.5, radius: 0.85, cam: { dist: 4.2, height: 2.2, look: 1.1 }, seat: { y: 1.0, z: -0.72 }, rigged: 'vinnie.cartRigged', sound: 'cart-squeak' },
  { id: 'pedicab', name: 'The pedicab', model: 'pedicab', home: { x: 21.2, z: 566.4, yaw: 1.66 }, surface: 'land', top: 8, accel: 2.6, turn: 1.4, radius: 0.55, cam: { dist: 4, height: 1.8, look: 1.0 }, seat: { y: 0.95, z: -0.55 }, rigged: 'pedicab.rigged', sound: 'pedicab-pedal' },
  { id: 'rc-boat', name: 'The RC tug', model: 'rc-boat', home: { x: 67, z: 301, yaw: 1.57 }, surface: 'water', water: 'conservatory', top: 4, accel: 2.4, turn: 2.2, radius: 0.35, cam: { dist: 1.5, height: 1, look: 0.25 }, remote: true, shore: { x: 63.2, z: 301 }, sound: 'rc-boat-whine' },
  { id: 'zamboni', name: 'The Zamboni', model: 'zamboni', home: { x: 51.7, z: 69.2, yaw: 0 }, surface: 'ice', top: 4, accel: 1.3, turn: 0.9, radius: 1.3, cam: { dist: 5, height: 2.4, look: 1.4 }, seat: { y: 1.38, z: 0.72 }, rigged: 'zamboni.rigged', sound: 'zamboni-hum' },
];
// The RC tug's job (part-wings step 3): the second sunk boat jammed under the pond's spout; tow it to the shore.
export const RC_TOW = { spout: { x: 77, z: 320.5 }, boat: { x: 77, z: 319.2 }, hookR: 1.6, drop: { x: 67.6, z: 302, r: 2.6 } };
// The wheeled division: one lap of the running track against Coach's posted time. Both
// gatehouses stand on the track (and the bridle path's bridge over the 86th Street cut
// humps it just west of the south one): the lap starts on the south gatehouse's east side,
// finishes short of that bridge, and swings outside the north gatehouse. route: the checkpoints
// in order (anticlockwise, east first), r metres each.
export const PEDICAB_RACE = {
  // 3b: posted 115 s (was 100: an autopilot lap took 102 s). The wheeled division is the easier route: a casual lap with a wobble or two still wins
  posted: 115, checkpoints: 8, start: { x: 21.2, z: 566.4, yaw: 1.66 }, finish: { x: -5, z: 565.3, r: 3 }, r: 6,
  route: [{ x: 51, z: 576.2 }, { x: 74.6, z: 596.2 }, { x: 89.4, z: 624.4 }, { x: 94.5, z: 662 }, { x: 89.4, z: 699.6 }, { x: 74.6, z: 727.8 }, { x: 51, z: 747.8 },
    { x: 19.9, z: 758.2 }, { x: -5, z: 762.8 }, { x: -18.5, z: 762.6 }, { x: -51, z: 747.8 }, { x: -74.6, z: 727.8 }, { x: -89.4, z: 699.6 }, { x: -94.5, z: 662 },
    { x: -89.4, z: 624.4 }, { x: -74.6, z: 596.2 }, { x: -51, z: 576.2 }, { x: -19.9, z: 565.6 }, { x: -5, z: 565.3 }],
};

// ================================================================== milestone 3a: fights ("Fights")
export const FIGHTS = {
  // Cedar Hill, day, ~60 s: deliver his ball (heavy, so Gus stays low) to the blanket while he charges.
  biscuit: {
    arena: { x: 44, z: 382, r: 28 }, blanket: { x: 50, z: 394 }, home: { x: 44, z: 386 },
    benches: [{ x: 41.5, z: 372, yaw: 0.35 }, { x: 49.5, z: 380.5, yaw: -0.45 }, { x: 43.5, z: 388.5, yaw: 0.15 }],
    wiggle: 1.0, speed: 6.2, speedAssist: 4.2, rest: 1.8, hitR: 0.75, guardSecs: 5,
  },
  // The Mall, Dusk, ~45 s: keep Vinnie busy while Rigby rigs the cart (30 s).
  vinnie: { cart: { x: 8.7, z: 206 }, leash: 10, rigSecs: 30, walk: 2.3, walkAssist: 1.6, windup: 0.6, windupAssist: 1.1, reach: 1.25, cooldown: 1.3, flyHigh: 3 },
  // Harlem Meer, Afternoon, ~60 s: she only dives when Gus is over the water and below 5 m; three mobs win.
  rhoda: { water: 'meer', centre: { x: 64, z: 1007 }, circleR: 20, circleY: 24, below: 5, telegraph: 1.5, telegraphAssist: 2.5, diveSecs: 1.1, skimSecs: 2.6, mobR: 5.5, mobs: 3, hitR: 1.3, rest: 2.5 },
};

// Professor Strix's night crossing (den-strix): a ~100 m woodland walk with a noise meter.
// Moss is silent; dry leaves are bright orange crunch piles; plain path is quiet at a walk.
// The meter fills slowly and fades fast when still. If it fills she swoops: one feather, and
// back to the last of the 3 moss islands. Any flap fills it at once (the canopy is too low to glide).
const SP = (u, st) => P(u, st);
export const RAMBLE_STEALTH = {
  path: [SP(0.365, 75.05), SP(0.39, 75.5), SP(0.45, 75.75), SP(0.42, 76.3), SP(0.36, 76.6), SP(0.30, 76.8), SP(0.26, 77.4), SP(0.30, 78.0)],
  width: 2.2,
  islands: [{ x: -29.4, z: 330.6, r: 1.8 }, { x: -17.6, z: 355.4, r: 1.8 }, { x: -52.6, z: 378.4, r: 1.8 }],
  moss: [{ x: -26.4, z: 336, r: 1.1 }, { x: -18, z: 341.8, r: 1.1 }, { x: -11.8, z: 345.6, r: 1.0 }, { x: -13.6, z: 351.2, r: 1.0 },
    { x: -24.5, z: 359, r: 1.0 }, { x: -36.2, z: 363.2, r: 1.1 }, { x: -46.4, z: 368.4, r: 1.0 }, { x: -50.4, z: 384, r: 1.0 }, { x: -47.6, z: 388.6, r: 1.0 }],
  leaves: [{ x: -22.6, z: 339.4, r: 0.9 }, { x: -14.4, z: 343.4, r: 0.9 }, { x: -15.2, z: 349, r: 0.8 }, { x: -21, z: 357.8, r: 0.9 }, { x: -29.6, z: 361, r: 0.9 },
    { x: -40.5, z: 364.6, r: 0.9 }, { x: -50.5, z: 373.8, r: 0.9 }, { x: -52.6, z: 381.3, r: 0.8 }, { x: -46.4, z: 386.4, r: 0.8 }],
  branch: { x: -44, z: 391.4, y: 4.5 },
  meter: { walk: 4, sprint: 15, leaf: 30, flap: 100, calm: 20, offPath: 9 },
  decoySecs: 10,
};

// The race (den-racers): 10 rings round the Reservoir (about a 600 m loop, 3 to 12 m up),
// two of them low past the gatehouses. Coach flies a fixed line at 9 m/s.
export const RACE_RINGS = (() => {
  const out = [];
  const alt = [6, 9, 12, 9, 4, 6, 10, 12, 8, 4];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + 0.12 + (i / 10) * Math.PI * 2;   // from the south gatehouse, anticlockwise (east first)
    const c = Math.cos(a), sn = Math.sin(a);
    const k = 2 / 2.25;
    const x = 0 + 91 * Math.sign(c) * Math.abs(c) ** k, z = 662 + 94 * Math.sign(sn) * Math.abs(sn) ** k;
    out.push({ i, x: +x.toFixed(1), z: +z.toFixed(1), y: alt[i], r: 3.2 });
  }
  out[0] = { ...out[0], x: 22.5, z: 566.5, y: 3.5 };        // past the south gatehouse
  out[5] = { ...out[5], x: -18.5, z: 757.5, y: 3.5 };       // past the north gatehouse
  return out;
})();
export const RACE = { start: { x: 4, z: 565, y: 1.5 }, coachSpeed: 9, missBehind: 45, startNpc: 'lapcount' };

// ------------------------------------------------------------------ nests, grates, perches
export const NESTS = [
  { id: 'nest-pond', name: 'Pond Nest', ...P(0.64, 61.35), zone: 'south' },
  { id: 'nest-mall', name: 'Mall Nest', ...P(0.62, 68.6), zone: 'middle' },
  { id: 'nest-ramble', name: 'Ramble Nest', ...P(0.40, 76.9), zone: 'ramble' },
  { id: 'nest-greatlawn', name: 'Great Lawn Nest', ...P(0.70, 84.4), zone: 'greatlawn' },
  { id: 'nest-reservoir', name: 'Reservoir Nest', ...P(0.93, 93.6), zone: 'reservoir' },
  { id: 'nest-north', name: 'North Woods Nest', ...P(0.34, 104.6), zone: 'north' },
];

// Subway grates on the city sidewalks (rats' fast travel).
const SW = { w: -128, e: 128 }; // outer sidewalks, by the buildings
export const GRATES = [
  { id: 'grate-59-columbus', name: '59th / Columbus Circle', x: -100, z: -18 },
  { id: 'grate-59-5th', name: '59th / 5th', x: 104, z: -18 },
  { id: 'grate-72w', name: '72nd W', x: SW.w, z: Z(71.6) },
  { id: 'grate-77e', name: '77th E', x: SW.e, z: Z(77.3) },
  { id: 'grate-86w', name: '86th W', x: SW.w, z: Z(85.6) },
  { id: 'grate-96e', name: '96th E', x: SW.e, z: Z(96.3) },
  { id: 'grate-110-lenox', name: '110th / Lenox', x: X(0.66) + 8, z: PARK.zMax + AVENUE - 2 },
];

// Orange-and-white steam stacks: warm updrafts on Fifth and Central Park South.
export const STEAM_STACKS = [
  { id: 'stack-cps-1', x: -46, z: -10 },
  { id: 'stack-cps-2', x: 58, z: -10 },
  { id: 'stack-5th-1', x: 120, z: Z(66.5) },
  { id: 'stack-5th-2', x: 120, z: Z(81.5) },
  { id: 'stack-5th-3', x: 120, z: Z(93.5) },
];

// Twelve Summit Perches: the city's tallest roofs and the park's high points.
// Their heights are resolved at build time from the structure they sit on.
export const SUMMIT_PERCHES = [
  { id: 'summit-belvedere', name: "Belvedere's tower", on: 'belvedere' },
  { id: 'summit-needle', name: "Cleopatra's Needle", on: 'cleopatras-needle' },
  { id: 'summit-twin-south', name: 'The twin towers (south)', on: 'hero:twin-towers', tower: 0 },
  { id: 'summit-twin-north', name: 'The twin towers (north)', on: 'hero:twin-towers', tower: 1 },
  { id: 'summit-spiral', name: 'The spiral museum', on: 'hero:spiral-museum' },
  { id: 'summit-water-tower', name: '110th Street water tower', on: 'water-tower:north-3' },
  { id: 'summit-plaza', name: 'The Plaza-style hotel', on: 'hero:plaza-hotel' },
  { id: 'summit-dakota', name: 'The gabled apartment house', on: 'hero:gabled-apartments' },
  { id: 'summit-museum', name: 'The natural history museum', on: 'hero:natural-history' },
  { id: 'summit-walter', name: "Walter's building", on: 'hero:walters-building' },
  { id: 'summit-cps', name: 'Central Park South tower', on: 'tallest:south' },
  { id: 'summit-great-hill', name: 'The Great Hill', on: 'ground', ...P(0.16, 105.2) },
];

// ------------------------------------------------------------------ city ring
// Side streets every two blocks; hero buildings named; storefront corners for
// the slice joints and bodegas.
export const CITY = {
  sides: {
    south: { name: 'Central Park South', heights: [48, 118], styles: ['limestone', 'deco', 'glass', 'brick', 'limestone'] },
    east: { name: 'Fifth Avenue', heights: [34, 72], styles: ['limestone', 'limestone', 'deco', 'brick', 'limestone'] },
    west: { name: 'Central Park West', heights: [36, 86], styles: ['brick', 'deco', 'limestone', 'brick', 'deco'] },
    north: { name: '110th Street', heights: [15, 26], styles: ['brick', 'brick', 'brick', 'limestone'] },
  },
  // cross streets meeting the park (x for the south and north sides; z for east and west)
  crossAvenuesX: [X(1 / 3), X(2 / 3)],   // 7th Ave and 6th Ave / Lenox
  heroes: [
    { id: 'plaza-hotel', name: 'The Plaza-style hotel', side: 'south', x0: 44, x1: 86, z0: -72, z1: -24, h: 76 },
    { id: 'gabled-apartments', name: 'The gabled apartment house (72nd)', side: 'west', z0: Z(72.05), z1: Z(73.1), h: 40 },
    { id: 'twin-towers', name: 'The twin-towered apartments (74th)', side: 'west', z0: Z(74.05), z1: Z(75.4), h: 62, towerH: 118 },
    { id: 'natural-history', name: 'The natural history museum (79th)', side: 'west', z0: Z(77.05), z1: Z(81.0), h: 28 },
    { id: 'spiral-museum', name: 'The spiral museum (89th)', side: 'east', z0: Z(88.6), z1: Z(89.95), h: 26 },
    { id: 'walters-building', name: "Walter's building (Fifth & 74th)", side: 'east', z0: Z(74.05), z1: Z(75.0), h: 58 },
  ],
  construction: { id: 'construction-76', name: 'Construction site (Fifth & 76th)', side: 'east', z0: Z(76.05), z1: Z(76.95) },
  storefronts: [
    { id: 'slice-columbus', name: 'Columbus Circle slice joint', kind: 'slice', side: 'south', x: -150, z: -24 },
    { id: 'slice-cpw72', name: 'CPW & 72nd slice joint', kind: 'slice', side: 'west', x: -131, z: Z(71.5) },
    { id: 'bodega-cpw72', name: 'CPW & 72nd bodega', kind: 'bodega', side: 'west', x: -131, z: Z(71.0) },
    { id: 'slice-110-lenox', name: '110th & Lenox slice joint', kind: 'slice', side: 'north', x: X(0.66) + 18, z: PARK.zMax + AVENUE + 1 },
    { id: 'bodega-110-lenox', name: '110th & Lenox bodega', kind: 'bodega', side: 'north', x: X(0.66) + 26, z: PARK.zMax + AVENUE + 1 },
  ],
  plaza: { id: 'grand-army-plaza', name: 'Grand Army Plaza', x0: 86, x1: 110, z0: -72, z1: -20 },
  columbusCircle: { x: -122, z: -12, r: 14 },
};

// Park wall gates (gaps in the low stone wall), by side and position.
export const GATES = [
  { side: 'south', x: X(0.01), w: 12, name: "Merchants' Gate" }, { side: 'south', x: X(1 / 3), w: 10, name: 'Artisans\' Gate' },
  { side: 'south', x: X(0.66), w: 10, name: "Artists' Gate" }, { side: 'south', x: X(0.99), w: 10, name: "Scholars' Gate" },
  { side: 'west', z: Z(66), w: 6 }, { side: 'west', z: Z(71.9), w: 8 }, { side: 'west', z: Z(78.6), w: 14 }, { side: 'west', z: Z(81.9), w: 6 },
  { side: 'west', z: Z(86), w: 14 }, { side: 'west', z: Z(88), w: 6 }, { side: 'west', z: Z(97.15), w: 14 }, { side: 'west', z: Z(100.5), w: 6 },
  { side: 'east', z: Z(64.6), w: 6 }, { side: 'east', z: Z(65.05), w: 14 }, { side: 'east', z: Z(72), w: 8 }, { side: 'east', z: Z(74), w: 6 },
  { side: 'east', z: Z(78.6), w: 14 }, { side: 'east', z: Z(79.3), w: 6 }, { side: 'east', z: Z(86), w: 14 }, { side: 'east', z: Z(86.9), w: 6 },
  { side: 'east', z: Z(90), w: 8 }, { side: 'east', z: Z(97.15), w: 14 }, { side: 'east', z: Z(100.4), w: 6 }, { side: 'east', z: Z(104.7), w: 8 },
  { side: 'north', x: X(0.66) - 2, w: 10 }, { side: 'north', x: X(0.95), w: 10 }, { side: 'north', x: X(0.2), w: 8 },
];

// The Empire State Building, far to the south (5th Ave & 34th): the far layer points its spire here.
export const ESB = { x: 120, z: Z(34) };

// ------------------------------------------------------------------ views (screenshots and goTo)
// gus: where to put Gus; cam: an optional free camera {pos:[x,y,z], look:[x,y,z]} that
// overrides the follow camera until the next move (screenshots only).
export const VIEWS = {
  'start': { name: 'By the Pond', gus: { ...P(0.80, 59.2), yaw: -0.2, mode: 'walk' } },
  'aerial-south': { name: 'Over the south end, looking north', cam: { pos: [10, 150, -120], look: [0, 0, 170] } },
  'aerial-middle': { name: 'Over the Mall and the Lake', cam: { pos: [-20, 170, 120], look: [0, 0, 360] } },
  'aerial-ramble': { name: 'Over the Ramble to the Great Lawn', cam: { pos: [0, 170, 300], look: [0, 0, 520] } },
  'aerial-reservoir': { name: 'Over the Reservoir', cam: { pos: [0, 200, 470], look: [0, 0, 720] } },
  'aerial-north': { name: 'Over the north woods to the Meer', cam: { pos: [20, 170, 750], look: [0, 0, 990] } },
  'aerial-whole': { name: 'The whole park from the south', cam: { pos: [0, 420, -330], look: [0, 0, 420] } },
  'aerial-top': { name: 'The whole park from above', cam: { pos: [0, 1250, 520], look: [0, 0, 521], up: [0, 0, 1], fov: 45 } },
  'belvedere-tower': { name: "From Belvedere's tower", gus: { on: 'summit-belvedere', yaw: Math.PI, mode: 'perch' }, look: { yaw: Math.PI, pitch: -0.05 } },
  'belvedere-north': { name: "From Belvedere's tower, north", gus: { on: 'summit-belvedere', yaw: 0, mode: 'perch' }, look: { yaw: 0, pitch: -0.05 } },
  'fifth-rooftop': { name: 'From a Fifth Avenue rooftop, looking west', gus: { on: 'summit-walter', yaw: -Math.PI / 2, mode: 'perch' }, look: { yaw: -Math.PI / 2, pitch: 0.5 } },
  'bow-bridge': { name: 'The Lake and Bow Bridge', gus: { ...P(0.30, 73.6), y: 4, yaw: 0.35, mode: 'fly', speed: 0 }, cam: { pos: [-58, 9, 282], look: [-30, 2, 318] } },
  'mall': { name: 'The Mall', gus: { x: 6.6, z: 175, yaw: 0, mode: 'walk' } },
  'mall-air': { name: 'Over the Mall', gus: { x: 6.6, z: 140, y: 16, yaw: 0, mode: 'fly' } },
  'reservoir': { name: 'The Reservoir', gus: { x: 0, z: 548, y: 18, yaw: 0, mode: 'fly' } },
  'city-street': { name: 'Fifth Avenue at street level', gus: { x: 127.5, z: Z(73), yaw: 0, mode: 'walk' } },
  'cps-street': { name: 'Central Park South at street level', gus: { x: -20, z: -18, yaw: Math.PI / 2, mode: 'walk' } },
  'ramble': { name: 'The Ramble', gus: { ...P(0.45, 75.8), yaw: 0.3, mode: 'walk' } },
  'wollman': { name: 'Wollman Rink', gus: { ...P(0.735, 62.3), y: 7, yaw: 0, mode: 'fly' } },
  'gus-flying': { name: 'Gus flying over the Pond', gus: { ...P(0.6, 59.6), y: 14, yaw: 0.4, mode: 'fly' } },
  'busiest-cps': { name: 'Central Park South (busiest)', gus: { x: 20, z: -10, y: 25, yaw: 0, mode: 'fly' } },
  'busiest-ramble': { name: 'The Ramble (densest trees)', gus: { ...P(0.42, 76.3), y: 14, yaw: 0, mode: 'fly' } },
};

// Level ground under built places: rect {x0, x1, z0, z1} or circle {x, z, r}; terrain eases to `level`.
export const FLATS = [
  { id: 'mall', rect: { x0: -14, x1: 27, z0: 146, z1: 253 }, level: 1.4, edge: 6 },
  { id: 'bethesda-upper', rect: { x0: -16, x1: 29, z0: 252, z1: 271 }, level: 1.6, edge: 4 },
  { id: 'bethesda-lower', rect: { x0: -5.5, x1: 18.7, z0: 272, z1: 296.5 }, level: -0.45, edge: 0.6 },
  { id: 'rink', rect: { x0: RINK.x - 24, x1: RINK.x + 24, z0: RINK.z - 21, z1: RINK.z + 21 }, level: 0.0, edge: 5 },
  { id: 'zoo', rect: { x0: 74, x1: 109, z0: 80, z1: 120 }, level: 0.4, edge: 4 },
  { id: 'dairy', circle: { ...P(0.5, 63.7), r: 26 }, level: 0.8, edge: 8 },
  { id: 'conservatory-water', rect: { x0: 63, x1: 92, z0: 286, z1: 333 }, level: 0.25, edge: 4 },
  { id: 'boathouse', rect: { x0: 30, x1: 44, z0: 308, z1: 326 }, level: 0.1, edge: 3 },
  { id: 'belvedere-court', rect: { x0: -18, x1: 3, z0: 409, z1: 427 }, level: 8.6, edge: 4 },
  { id: 'delacorte', circle: { ...P(0.325, 80.55), r: 17 }, level: 1.0, edge: 5 },
  { id: 'met', rect: { x0: 70, x1: 112, z0: 425, z1: 535 }, level: 0.5, edge: 5 },
  { id: 'needle', circle: { ...P(0.70, 81.6), r: 9 }, level: 1.6, edge: 5 },
  { id: 'strawberry', circle: { ...P(0.10, 72.25), r: 9 }, level: 2.0, edge: 6 },
  { id: 'tavern', rect: { x0: -110, x1: -86, z0: 148, z1: 172 }, level: 0.5, edge: 5 },
  { id: 'conservatory-garden', rect: { x0: 69, x1: 110, z0: 914, z1: 973 }, level: 0.6, edge: 5 },
  { id: 'heckscher', rect: { x0: -60, x1: -35, z0: 46, z1: 64 }, level: 0.5, edge: 4 },
  { id: 'gatehouse-s', circle: { x: 14, z: 566, r: 8 }, level: 0.4, edge: 4 },
  { id: 'gatehouse-n', circle: { x: -12, z: 758, r: 8 }, level: 0.4, edge: 4 },
  { id: 'meer-boathouse', rect: { x0: 53, x1: 75, z0: 1043, z1: 1050 }, level: 0.2, edge: 3 },
];

// ================================================================== milestone 2: game systems data
// Everything below is gameplay data (positions in game metres, +x east, +z
// north). Heights are resolved at build time from the terrain or the
// structure underneath (collision.surface from above).

// ------------------------------------------------------------------ signs (Thread 1: the Sign War)
// region: which ranger cart reverts it ('city' signs are permanent at once).
// flip: 'peck' (a loose "DON'T" plate) or 'pen' (enamel; needs the paint pen).
export const SIGNS = [
  { id: 'S1', name: 'Pond east path', region: 'south', flip: 'peck', x: 92, z: 18, yaw: -1.2 },
  { id: 'S2', name: 'Gapstow Bridge', region: 'south', flip: 'peck', x: 71, z: 47, yaw: -2.2 },
  { id: 'S3', name: 'Pond south shore', region: 'south', flip: 'peck', x: 50, z: 4.6, yaw: 0.2 },
  { id: 'S4', name: 'Wollman Rink entrance', region: 'south', flip: 'peck', x: 40, z: 72, yaw: 0.6 },
  { id: 'S5', name: 'Heckscher Playground', region: 'south', flip: 'peck', x: -38, z: 49, yaw: -0.4 },
  { id: 'S6', name: 'The Carousel', region: 'south', flip: 'peck', x: -9, z: 98, yaw: 0.3 },
  { id: 'S7', name: 'Umpire Rock', region: 'south', flip: 'peck', x: -20, z: 62, yaw: 0.9 },
  { id: 'S8', name: "Merchants' Gate", region: 'south', flip: 'peck', x: -95, z: 12, yaw: 0.8 },
  { id: 'M1', name: 'Sheep Meadow', region: 'middle', flip: 'peck', x: -48, z: 141, yaw: 0 },
  { id: 'M2', name: 'Tavern on the Green', region: 'middle', flip: 'pen', x: -91, z: 167, yaw: 1.4 },
  { id: 'M3', name: 'Cherry Hill', region: 'middle', flip: 'peck', x: -29, z: 279, yaw: 0.5 },
  { id: 'M4', name: 'The Mall, south (by Vinnie)', region: 'middle', flip: 'peck', x: 12, z: 161, yaw: -1.57 },
  { id: 'M5', name: 'The Mall, north (by Vinnie)', region: 'middle', flip: 'pen', x: 12, z: 239, yaw: -1.57 },
  { id: 'M6', name: 'Bethesda upper terrace', region: 'middle', flip: 'pen', needs: 'sunglasses', x: -1, z: 262, yaw: 0 },
  { id: 'M7', name: 'Boathouse path', region: 'middle', flip: 'peck', x: 43, z: 305, yaw: 0.4 },
  { id: 'M8', name: 'Conservatory Water', region: 'middle', flip: 'pen', x: 60, z: 301, yaw: 1.5 },
  { id: 'N1', name: 'Great Lawn, west', region: 'north', flip: 'peck', x: -52, z: 489, yaw: 1.57 },
  { id: 'N2', name: 'Great Lawn, east', region: 'north', flip: 'peck', x: 39, z: 489, yaw: -1.57 },
  { id: 'N3', name: "Cleopatra's Needle", region: 'north', flip: 'pen', x: 39, z: 459, yaw: 0.6 },
  { id: 'N4', name: 'Reservoir south gatehouse', region: 'north', flip: 'pen', x: 23, z: 559, yaw: 0.2 },
  { id: 'N5', name: 'Reservoir north gatehouse', region: 'north', flip: 'pen', x: -21, z: 765, yaw: 3.0 },
  { id: 'N6', name: 'Conservatory Garden gate', region: 'north', flip: 'pen', x: 104, z: 946, yaw: -1.57 },
  { id: 'N7', name: 'Harlem Meer', region: 'north', flip: 'pen', x: 58, z: 966, yaw: 0.3 },
  { id: 'N8', name: 'North Meadow', region: 'north', flip: 'pen', x: -4, z: 791, yaw: 0 },
  { id: 'C1', name: 'Columbus Circle', region: 'city', flip: 'pen', x: -107, z: -17.5, yaw: 0.3 },
  { id: 'C2', name: 'Grand Army Plaza fountain', region: 'city', flip: 'pen', x: 91, z: -33, yaw: 2.6 },
  { id: 'C3', name: 'Fifth Ave & 76th, sidewalk shed', region: 'city', flip: 'pen', x: 126.5, z: 357, yaw: -1.57 },
  { id: 'C4', name: 'CPW & 79th, museum steps', region: 'city', flip: 'pen', x: -126.5, z: 412, yaw: 1.57 },
  { id: 'C5', name: 'Fifth Ave & 89th, spiral museum', region: 'city', flip: 'pen', x: 126.5, z: 624, yaw: -1.57 },
  { id: 'C6', name: '110th Street', region: 'city', flip: 'pen', x: 24, z: 1068.5, yaw: 3.14 },
];
export const SIGN_RULES = {
  revertAfter: 180,            // game seconds after a flip (Morning to Dusk)
  feedDelay: [4, 10],          // feeders arrive within 10 s
  pile: { morning: 12, afternoon: 20, dusk: 8, night: 0 },
  trickle: 3,                  // crumbs a minute while the sign stays live
  spikeRadius: 10,             // a sign within 10 m of a spiked perch pays nothing
  napIncome: 3,                // per permanent sign, on waking
};

// ------------------------------------------------------------------ ranger carts
// base: where the cart waits by day; night: where it sleeps (sabotage spot).
export const RANGER_CARTS = [
  { id: 'south', name: 'South cart', base: { x: 22, z: 104, yaw: 0 }, night: { x: 62, z: 102.63, yaw: Math.PI / 2 }, note: 'patrols from the Dairy; sleeps in Wollman Rink\'s yard, across the shed door' },
  { id: 'middle', name: 'Middle cart', base: { x: 46, z: 318, yaw: 3.14 }, night: { x: 46, z: 318, yaw: 3.14 }, note: 'parks in the Boathouse lot' },
  { id: 'north', name: 'North cart', base: { x: 62, z: 862, yaw: 1.57 }, night: { x: 62, z: 862, yaw: 1.57 }, note: 'parks in the 103rd Street shed' },
];

// ------------------------------------------------------------------ spike sites (Thread 3)
// on: 'top' = the roof or cap under (x, z); kind strips | net | bolts.
export const SPIKE_SITES = [
  { id: 'P1', name: 'Grand Army Plaza lampposts', kind: 'strips', when: 'prologue', x: 97, z: -34, r: 9, perches: [{ x: 92, z: -28 }, { x: 102, z: -28 }, { x: 92, z: -46 }, { x: 102, z: -46 }], blocks: 'sign C2 pays nothing' },
  { id: 'P2', name: 'Reservoir south gatehouse roof', kind: 'strips', when: 'prologue', x: 14, z: 566, r: 5, blocks: "the Racers' scheme" },
  { id: 'P3', name: 'Natural history museum cornice', kind: 'strips', when: 'prologue', x: -150, z: Z(79), r: 14, blocks: "the Racket's scheme; a Summit Perch" },
  { id: 'P4', name: 'Fifth & 74th ledge', kind: 'bolts', when: 'prologue', x: 150, z: Z(74.5), r: 10, blocks: "Rhoda's scheme", needs: { flags: ['walter.doorOpen'] }, refuse: 'Rigby looks up. "Twelve floors, boss. We need the back stairs. Walter lets raccoons up… for a price."' },   // 3b: only by Walter's stairs (den-rhoda step 3)
  { id: 'P5', name: 'Gapstow Bridge rail', kind: 'strips', when: 'den-horses', x: 60.5, z: 43, r: 8, blocks: 'the selfie postcard' },
  { id: 'P6', name: 'Plaza Hotel cornice', kind: 'net', when: 'den-horses', x: 65, z: -48, r: 22, blocks: 'a Summit Perch' },
  { id: 'P7', name: 'Bow Bridge rail', kind: 'strips', when: 'sab-middle', x: -32, z: 297, r: 13, blocks: "Dove's wedding postcard" },
  { id: 'P8', name: 'Bethesda arcade ledges', kind: 'net', when: 'sab-middle', x: 6.6, z: 270, r: 12, blocks: '3 strays' },
  { id: 'P9', name: "Cleopatra's Needle tip", kind: 'bolts', when: 'sab-north', x: 44, z: 465.6, r: 3, blocks: 'a Summit Perch and postcard' },
  { id: 'P10', name: 'Conservatory Garden gate tops', kind: 'net', when: 'sab-north', x: 106, z: 941, r: 6, blocks: 'sign N6' },
];

// ------------------------------------------------------------------ named places (scheme needs, compass, map)
export const PLACES = {
  pond: { name: 'The Pond', x: 62, z: 30, r: 45 },
  'grand-army-plaza': { name: 'Grand Army Plaza', x: 97, z: -40, r: 22 },
  'cps-carriage-line': { name: 'The carriage line (CPS)', x: -20, z: -8, r: 40 },
  lake: { name: 'The Lake', x: -20, z: 300, r: 60 },
  boathouse: { name: 'Loeb Boathouse', x: 38, z: 312, r: 14 },
  'bow-bridge': { name: 'Bow Bridge', x: -32, z: 310, r: 18 },
  'sheep-meadow': { name: 'Sheep Meadow', x: -50, z: 165, r: 35 },
  'cherry-hill': { name: 'Cherry Hill', x: -40, z: 286, r: 14 },
  mall: { name: 'The Mall', x: 6.6, z: 200, r: 50 },
  bethesda: { name: 'Bethesda Terrace', x: 6.6, z: 268, r: 18 },
  tavern: { name: 'Tavern on the Green', x: -100, z: 162, r: 14 },
  conservatory: { name: 'Conservatory Water', x: 77, z: 310, r: 20 },
  ramble: { name: 'The Ramble', x: -18, z: 360, r: 45 },
  exchange: { name: 'The Exchange oak', x: -10, z: 365, r: 8 },
  workshop: { name: 'The Workshop cave', x: -26.4, z: 381, r: 8 },
  'turtle-pond': { name: 'Turtle Pond', x: 8, z: 430, r: 25 },
  'elders-rock': { name: "The Elders' rock", x: 8.8, z: 432.6, r: 4 },
  'cedar-hill': { name: 'Cedar Hill', x: 44, z: 380, r: 24 },
  delacorte: { name: 'The Delacorte', x: -38.5, z: 443, r: 16 },
  'shakespeare-garden': { name: 'Shakespeare Garden', x: -37.4, z: 417, r: 10 },
  'great-lawn': { name: 'Great Lawn', x: -6.6, z: 489, r: 42 },
  reservoir: { name: 'The Reservoir', x: 0, z: 662, r: 100 },
  'reservoir-track': { name: 'Reservoir track', x: 0, z: 662, r: 105 },
  'north-woods': { name: 'North Woods', x: -33, z: 930, r: 50 },
  meer: { name: 'Harlem Meer', x: 64, z: 1000, r: 40 },
  blockhouse: { name: 'The Blockhouse', x: -81.4, z: 1031, r: 14 },
  'columbus-grate': { name: 'Columbus Circle grate', x: -100, z: -18, r: 6 },
  'slice-columbus': { name: 'Columbus Circle slice joint', x: -150, z: -24, r: 10 },
  'slice-cpw72': { name: 'CPW & 72nd slice joint', x: -131, z: 257.5, r: 10 },
  'bodega-110': { name: '110th & Lenox bodega', x: 61, z: 1071, r: 10 },
  'fifth-74': { name: "Walter's building, Fifth & 74th", x: 128, z: Z(74.5), r: 10 },
  'fifth-76': { name: 'Construction site, Fifth & 76th', x: 128, z: Z(76.5), r: 12 },
  'museum-79': { name: 'Natural history museum, CPW & 79th', x: -130, z: Z(79), r: 16 },
  'grate-86w': { name: '86th Street W grate', x: -128, z: Z(85.6), r: 6 },   // fun pass (P9): the jogger's key
  'north-gatehouse': { name: 'Reservoir north gatehouse', x: -12, z: 758, r: 8 },
  'south-gatehouse': { name: 'Reservoir south gatehouse', x: 14, z: 566, r: 8 },
  'wollman-rink': { name: 'Wollman Rink', x: 51.7, z: 88.6, r: 22 },
  'shed-103': { name: 'The 103rd Street shed', x: 62, z: 862, r: 8 },
  'grate-110': { name: '110th & Lenox grate', x: 43.2, z: 1068.6, r: 5 },
  'east-drive-90': { name: "East Drive by the Engineers' Gate", x: 100, z: 680, r: 60 },
  'ramble-stealth': { name: 'The edge of the night woods', x: -29.4, z: 330.6, r: 2.5 },
  'great-lawn-pipes': { name: 'Great Lawn, north edge', x: -7, z: 541, r: 20 },
};

// ------------------------------------------------------------------ slices (Pizza slices)
export const SLICE = {
  hotFor: 60,
  joints: [
    { id: 'slice-columbus', name: 'Columbus Circle joint', counter: { x: -150, z: -22.5 }, bench: { x: -143, z: -17.5, yaw: 3.14 }, bin: { x: -156, z: -21 } },
    { id: 'slice-cpw72', name: 'CPW & 72nd joint', counter: { x: -129.5, z: 257.5 }, bench: { x: -125.5, z: 262, yaw: 1.57 }, bin: { x: -129.5, z: 266 }, anchovy: true },
    { id: 'slice-110-lenox', name: '110th & Lenox joint', counter: { x: 53.2, z: 1070 }, bench: { x: 49, z: 1066, yaw: 0 }, bin: { x: 47, z: 1071 } },
  ],
  drops: [
    { id: 'line-columbus', name: "Merchants' Gate", x: -98, z: 8 },
    { id: 'line-carriage', name: 'The Pond carriage stop', x: 30, z: -8 },
    { id: 'line-harlem', name: 'Harlem Meer', x: 50, z: 965 },
  ],
  // the halal cart's griddle: Afternoon at Grand Army Plaza, Dusk at 110th & Fifth
  griddle: { afternoon: { x: 104, z: -22, yaw: 3.14 }, dusk: { x: 112, z: 1062, yaw: 3.14 }, warm: 3 },
};

// ------------------------------------------------------------------ the Prologue (the first minute)
export const PROLOGUE = {
  lampNear: { x: 62, z: 12 },            // Gus dozes on the lamppost nearest this
  rangerFrom: { x: 58, z: 20 },          // the ranger who shoos him
  duchessPerch: { x: 97, z: -34.95 },    // the Swells watch from the Plaza fountain's rim
  frenzy: { x: 70, z: 22 },              // where the Duchess judges the feeding frenzy
  vanStop: { x: 88, z: -12, yaw: 1.57 }, // Prickett's van pulls up on Central Park South
  vanFrom: { x: -40, z: -12 },
};

// ================================================================== milestone 3a: clue spots ("Calling allies")
// Every spot shows only its world clue (never the ally's icon, except `icon` the
// first time that talent is taught). type → the tell, and who fits it:
//   dig      a dust plume with acorn sparkles                 squirrels (Dig)
//   dive     bubble rings and a white splash                  ducks (Dive)
//   grate    a grate with something glinting below            rats (Grate Fetch)
//   teeter   something teetering on a high edge (it wobbles)  cats (Knock)
//   stuck    something stuck that puffs dust when pecked      horses (Kick)
//   rig      a vehicle or a locked latch                      raccoons (Rig)
//   net      a stapled net or bolted spikes                   raccoons (Rig, D/N) or Rhoda (Lift, day)
//   glint    a shiny thing Gus can just peck
//   hidden   only Night Eyes shows it (then it glints)        Strix reveals; Gus pecks
// Huge items (haul), "…" humans in the way (Mimic / Bully) and "!" humans with
// something to trade are their own lists below (BLOCKERS, TRADES); haulers work
// on any huge item lying in the world.
//
// active: { scheme, step } (that step is current), plus optional flags / not / phase.
// does (on success): item (spawn it: at 'ally' | 'spot' | {x,z}; huge items get haulTo),
//   flags, count ({ id, of, flag }), spike (clear a site), sabotage (a cart region),
//   rig (a vehicle id), door (open a door), reveal (Night Eyes: clue ids), say, toast.
// needs (checked when Asked): item, hot, crumbs, flags; `refuse` is the line when they don't hold.
export const CLUES = [
  // den-squirrels: Hazel's three caches on Sheep Meadow (the plumes only show from above 10 m; Gus pecks them)
  ...[[-62, 152], [-38, 177], [-56, 186]].map(([x, z], i) => ({ id: 'hazel-cache-' + (i + 1), type: 'dig', x, z, peck: true, aboveOnly: 10, icon: 'squirrels', active: { scheme: 'den-squirrels', step: 2 }, does: { count: { id: 'hazel', of: 3, flag: 'hazel.caches3' }, toast: 'A cache!' } })),
  // den-crows: three shinies (one on a CPW ledge, one under a plume, one under the Lake)
  { id: 'shiny-cpw72', type: 'glint', x: -131.6, z: 276, on: 'roof', item: 'shiny', active: { scheme: 'den-crows', step: 2, not: ['shiny.cpw72'] }, does: { flags: ['shiny.cpw72'] } },
  { id: 'shiny-ramble-plume', type: 'dig', x: -4, z: 352, icon: 'squirrels', active: { scheme: 'den-crows', step: 2, not: ['shiny.plume'] }, does: { item: 'shiny', at: 'ally', flags: ['shiny.plume'] } },
  { id: 'shiny-lake', type: 'dive', x: -10, z: 305, on: 'water:lake', icon: 'ducks', active: { scheme: 'den-crows', step: 2, not: ['shiny.lake'] }, does: { item: 'shiny', at: 'ally', flags: ['shiny.lake'], say: [{ who: 'bubbles', text: 'Watch THIS, Gus! Triple tuck!' }] } },
  // den-biscuit: his ball, out in the Lake's east arm
  { id: 'ball-lake', type: 'dive', x: 23.5, z: 314, on: 'water:lake', active: { scheme: 'den-biscuit', step: 2 }, does: { item: 'ball', at: 'ally' } },
  // den-turtles: something on the Elders' rock
  { id: 'turtle-cart', type: 'dive', x: 11.5, z: 430.5, on: 'water:turtle', active: { scheme: 'den-turtles', step: 2 }, does: { item: 'cart', at: { x: 9.5, z: 425.2 }, haulTo: { x: 6, z: 419.5 }, flags: ['turtle.cartSurfaced'] } },
  // gear-headlamp: the jogger's lost key, down the 86th W grate mid-lap (fun pass P9: the rats' Grate Fetch in Act 1; it was a Turtle Pond dive)
  { id: 'key-grate', type: 'grate', x: -128, z: Z(85.6), active: { scheme: 'gear-headlamp', step: 1 }, does: { item: 'key', at: 'ally' } },
  // gear-sunglasses: the shiny on the Plaza Hotel's flagpole
  { id: 'shiny-flagpole', type: 'glint', x: 84, z: -26.5, on: 'roof', item: 'shiny', active: { scheme: 'gear-sunglasses', step: 1 } },
  // part-wings: the first sunk sailboat (the second is under the spout, where ducks won't dive)
  { id: 'sail-1', type: 'dive', x: 72, z: 305, on: 'water:conservatory', active: { scheme: 'part-wings', step: 1, not: ['wings.sail1'] }, does: { item: 'sail', at: 'ally', flags: ['wings.sail1'] } },
  { id: 'sail-spout', type: 'dive', x: 77, z: 319.5, on: 'water:conservatory', fake: true, active: { scheme: 'part-wings', step: 3 }, refuseLine: { ducks: "That's a SHOWER, Gus. We don't do showers." } },
  // truce-dogs-squirrels: Old Pecan's 1974 cache on Cherry Hill
  { id: 'pecan-cache', type: 'dig', x: -42, z: 283, active: { scheme: 'truce-dogs-squirrels', step: 2 }, does: { item: 'tennis-sack', at: 'ally', say: [{ who: 'pecan', text: 'Nineteen seventy-four! I KNEW it was here!' }] } },
  // part-legs: Night Eyes marks two pipe spots on the Great Lawn's north edge; squirrels dig them by day
  ...[[-22, 541], [8, 542]].map(([x, z], i) => ({ id: 'pipe-' + (i + 1), type: 'dig', x, z, hidden: 'legs.marked', active: { scheme: 'part-legs', step: 2, not: ['legs.pipe' + (i + 1)] }, does: { item: 'pipe', at: 'spot', haulTo: 'workshop', flags: ['legs.pipe' + (i + 1)], count: { id: 'pipes', of: 2, flag: 'legs.dug' } } })),
  { id: 'pipe-marks', type: 'nighteyes', x: -7, z: 541, r: 30, active: { scheme: 'part-legs', step: 1 }, does: { flags: ['legs.marked'], toast: 'Two old drainpipes, under the lawn.' } },
  // (Fixes-3, B5: the old part-power step-4 battery dive is gone: the battery comes up inside setpiece.wedding)
  // den-raccoons alt 1: the stagehand's lost earring in Shakespeare Garden (Night Eyes shows it)
  { id: 'earring-eyes', type: 'nighteyes', x: -37, z: 418, r: 30, active: { scheme: 'den-raccoons', step: 2, flags: ['den-strix'] }, does: { flags: ['earring.seen'] } },
  { id: 'earring', type: 'hidden', x: -35.2, z: 420.6, item: 'earring', hidden: 'earring.seen', active: { scheme: 'den-raccoons', step: 2 } },
  // den-raccoons alt 2: the wrench on the Delacorte's prop table, once the guard has waved Gus backstage
  { id: 'wrench', type: 'glint', x: -41.6, z: 429.4, item: 'wrench', active: { scheme: 'den-raccoons', step: 2, flags: ['delacorte.backstage'] } },
  // part-beak: the foreman's lucky sticker, down the 77th E grate
  { id: 'sticker-grate', type: 'grate', x: 128, z: 377, active: { scheme: 'part-beak', step: 1 }, does: { item: 'sticker', at: 'ally' } },
  // sab-middle: the Boathouse lot's gate key, teetering on the booth's hook
  { id: 'lot-key', type: 'teeter', x: 45.4, z: 310.4, y: 2.1, active: { scheme: 'sab-middle', step: 1, not: ['lot.keyDown'] }, does: { item: 'gate-key', at: { x: 45, z: 309.4 }, flags: ['lot.keyDown'] } },
  // the ranger carts (sabotage at Night once the way in is open)
  { id: 'cart-middle', type: 'rig', x: 46, z: 318, r: 7, active: { scheme: 'sab-middle', step: 2, flags: ['boathouse.gateOpen'] }, does: { sabotage: 'middle' } },
  { id: 'cart-north', type: 'rig', x: 62, z: 862, r: 7, active: { scheme: 'sab-north', step: 2, flags: ['shed103.open'] }, does: { sabotage: 'north' } },
  // part-beak: the sidewalk shed's jammed gate (horses Kick it by day, raccoons Rig its latch at D/N)
  { id: 'shed-gate', type: 'stuck', x: 126.6, z: 361.5, talents: ['kick', 'rig'], active: { scheme: 'part-beak', step: 3 }, does: { door: 'shed-gate', item: 'cone', at: { x: 123.6, z: 362.5 }, haulTo: 'workshop' } },
  // part-talons: the Zamboni garage's buckled door (Kick), then the Zamboni itself (Rig, with a slice for Mama Mask)
  // part-talons (3b): Prickett's steel shed door. The horses can try (BONK), but nothing with paws opens that
  { id: 'rink-shed-steel', type: 'stuck', x: 62, z: 103.3, perPhase: true, talents: ['kick'], active: { flags: ['part-talons.s1'], not: ['rink.launched'] }, does: { say: [{ who: 'clementine', text: 'BONK. …That\'s steel, kid. I\'d need a running start.' }] } },
  { id: 'garage-door', type: 'stuck', x: 51.7, z: 73.2, active: { scheme: 'part-talons', step: 2, not: ['door.rink-garage'] }, does: { door: 'rink-garage' } },
  { id: 'zamboni', type: 'rig', x: 51.7, z: 70.5, r: 6, active: { scheme: 'part-talons', step: 2, flags: ['door.rink-garage'] }, needs: { flags: ['union.paid'] }, refuse: 'Mama Mask folds her arms. "Union rules, Gus. One slice first."', does: { rig: 'zamboni' } },
  // den-racers alt 2: the pedicab by the Reservoir (raccoons, Dusk)
  { id: 'pedicab', type: 'rig', x: 21.2, z: 566.4, r: 6, active: { scheme: 'den-racers', step: 2, phase: 'dusk', not: ['pedicab.rigged'] }, does: { rig: 'pedicab' } },
  // den-rhoda step 3: Walter's propped service door; Tux shows the raccoons the back stairs to the ledge (P4)
  { id: 'walter-stairs', type: 'rig', x: 130.4, z: 316.4, r: 6, active: { scheme: 'den-rhoda', step: 3, flags: ['walter.doorOpen'] }, talents: ['rig'], does: { spike: 'P4', say: [{ who: 'tux', text: 'This way, gentlemen. Mind the carpet.' }] } },
  // the slice joints: a slice teetering on the counter's edge while the counterman's back is turned (cats Knock)
  ...[['slice-columbus', -150, -20.35], ['slice-cpw72', -129.6, 257.5], ['slice-110-lenox', 53.2, 1070.25]].map(([id, x, z]) => ({ id: 'counter-' + id, type: 'teeter', x, z, y: 1.05, free: true, active: { flags: ['den-cats'] }, perPhase: true, does: { item: id === 'slice-cpw72' ? 'slice-anchovy' : 'slice', born: 'now', at: 'spot-ground' } })),
  // fun pass (P8): a wine glass on the Tavern patio table's edge (the cats knock it; the waiter rushes over with a dustpan and
  // steps off the cufflink: src/schemes/gear-pen.js). The table is TAVERN_TABLE (built by gear-pen.js); `prop` draws the glass.
  { id: 'tavern-glass', type: 'teeter', prop: 'glass', x: -100.05, z: 152.1, y: 0.78, active: { scheme: 'gear-pen', step: 1, not: ['waiter.moved'], phase: 'afternoon' }, does: { flags: ['waiter.moved'], smash: true } },
  // the CPW & 72nd joint's pickup shelf: a whole box (truce-cats-rats)
  { id: 'pickup-shelf', type: 'teeter', x: -129.6, z: 254.8, y: 1.7, free: true, active: { flags: ['den-cats'], phase: 'day' }, perPhase: true, does: { item: 'box', born: 'now', at: 'spot-ground' } },
];

export const TAVERN_TABLE = { x: -100.5, z: 151.8, r: 0.55, h: 0.76 };   // fun pass (P8): on the open terrace south of the Tavern (the key-moment shot found it inside the building)

// Doors and gates that open (and stay open: the flag persists through naps).
// A closed door is a collision box; the mesh swings or rolls up when it opens.
export const DOORS = [
  { id: 'rink-garage', name: 'Zamboni garage door', kind: 'rollup', x: 51.7, z: 72.5, w: 4.6, h: 3, yaw: 0, buckled: true },
  { id: 'rink-north-gate', name: 'Rink north gate', kind: 'gate', x: 51.7, z: 100.6, w: 8, h: 1.1, yaw: 0, flag: 'cart.south' },
  { id: 'rink-shed', name: "Prickett's shed door", kind: 'rollup', x: 62, z: 104.05, w: 3, h: 2.5, yaw: 0, flag: 'shed.open' },
  { id: 'boathouse-gate', name: 'Boathouse lot gate', kind: 'gate', x: 44.6, z: 312.2, w: 3.2, h: 1.6, yaw: Math.PI / 2, key: 'gate-key', flag: 'boathouse.gateOpen' },
  { id: 'shed-103', name: 'The 103rd Street shed', kind: 'rollup', x: 58.4, z: 862, w: 3, h: 2.6, yaw: Math.PI / 2, rope: { y: 2.9, flock: 15 }, flag: 'shed103.open', shed: { x: 62, z: 862, w: 6.5, d: 5, h: 3.2 } },
  { id: 'shed-gate', name: 'Sidewalk-shed gate', kind: 'gate', x: 126.6, z: 361.5, w: 2.4, h: 2.2, yaw: Math.PI / 2 },
  { id: 'walter-door', name: "Walter's service door", kind: 'swing', x: 130.4, z: 316.4, w: 1.2, h: 2.2, yaw: Math.PI / 2, flag: 'walter.doorOpen' },
];

// Humans in the way: a "…" bubble over them. mimic / bully / swarm (hold Coo with a flock) each
// either works (does) or gets a funny refusal. by: what moving them sets.
export const BLOCKERS = [
  { id: 'selfie', human: 'selfie', active: { scheme: 'gear-sunglasses', step: 2, not: ['selfie.attention'] },
    // fun pass (P6): a swarm gets the "almost" line; getting IN his shot (the rim behind him) works: src/schemes/gear-sunglasses.js
    swarm: { flock: 6, on: { x: 93, z: -36, r: 4.5 }, refuse: 'Ugh. Pigeons. *turns his back and keeps posing*' },
    mimic: { refuse: "He's already ON his phone, Gus." }, bully: { refuse: 'Gertrude honks. He films it. "This is going in my STORY."' } },
  { id: 'waiter', human: 'waiter', active: { scheme: 'gear-pen', step: 1, not: ['waiter.moved'] }, reveal: { item: 'cufflink', at: 'feet' },
    // fun pass (P8): a flock at the bread basket gets shooed and he stays put; the cats knock the glass (gear-pen.js)
    swarm: { flock: 6, on: { x: -99, z: 151, r: 4 }, refuse: '"Shoo! SHOO!" He flaps a napkin and plants his foot right back down.' },
    mimic: { flags: ['waiter.moved'], to: { x: -104, z: 166 }, line: 'Coming! Coming!', sound: 'phoneRing' },
    bully: { refuse: '"No geese on the patio!" He doesn\'t budge.' } },
  { id: 'jogger', human: 'jogger', near: 15, active: { scheme: 'gear-headlamp', step: 2, not: ['jogger.stopped'] },
    mimic: { flags: ['jogger.stopped'], stop: 12, line: 'Huh? Who\'s calling?', sound: 'phoneRing' }, bully: { refuse: 'He speeds up. Cardio!' } },
  { id: 'rckid', human: 'rckid', active: { scheme: 'part-wings', step: 2, not: ['remote.left'] },
    mimic: { needs: ['den-songbirds'], flags: ['remote.left'], kids: true, to: { x: 96, z: -30 }, item: 'remote', line: 'ICE CREAM!', sound: 'jingle' },
    bully: { refuse: 'He hugs the remote tighter. "MINE."' } },
  { id: 'prickett', human: 'prickett', active: { scheme: 'den-horses', step: 2 },
    mimic: { flags: ['prickett.moved'], to: { x: 76, z: -9 }, line: 'Prickett Pest-Pro, Del speaking!', sound: 'phoneRing' },
    bully: { flags: ['prickett.moved'], to: { x: 80, z: -5 }, line: 'Whoa! Easy, birds!' } },   // 3b: den-horses' script drives the van off (src/schemes/den-horses.js)
  { id: 'cyclist', human: 'cyclist', near: 16, active: { scheme: 'truce-cats-rats', step: 2 },
    mimic: { stop: 10, drop: true, line: 'Is that my phone?', sound: 'phoneRing' }, bully: { flee: true } },
  // part-power (3b, the Wedding: src/setpieces/wedding.js). Before the dove release the party digs in; after it, the geese clear the group shot
  { id: 'wedding-early', human: 'photographer', active: { flags: ['part-power.s1'], not: ['wedding.doveReleased'] }, mimic: { refuse: '"Phones OFF, people! We\'re WORKING!" The guests shuffle straight back.' }, bully: { refuse: '"NOBODY moves till we get the DOVE SHOT!" The geese bounce off a wall of tulle.' } },
  { id: 'wedding', human: 'photographer', active: { scheme: 'part-power', step: 3 }, mimic: { refuse: '"Phones OFF, people! We\'re WORKING!" The guests shuffle straight back.' }, bully: {} },
];

// The crows' trades ("Thread 5"): bring the item, get the human's attention (the catch),
// Call the crows next to them, pay Vesper's 10 crumbs. Ledger writes each deal in his book.
// wanted: drawn on the Wanted board while the human is out.
export const TRADES = [
  { id: 'sunglasses', human: 'selfie', wants: 'shiny', gives: { gear: 'sunglasses' }, crumbs: 10, attention: 'selfie.attention', notYet: "He won't look up from his selfies, kid.", scheme: 'gear-sunglasses', wanted: 'sunglasses' },
  { id: 'pen', human: 'artist', wants: 'cufflink', gives: { gear: 'pen' }, crumbs: 10, scheme: 'gear-pen', wanted: 'pen', after: 'The artist dashes off a portrait of Gus in thanks.' },
  { id: 'headlamp', human: 'jogger', wants: 'key', gives: { gear: 'headlamp' }, crumbs: 10, attention: 'jogger.stopped', stoppedOk: true, notYet: 'He never stops, kid. Not for crows.', scheme: 'gear-headlamp', wanted: 'headlamp' },
  { id: 'remote', human: 'rckid', wants: 'shiny', gives: { gear: 'remote' }, crumbs: 10, scheme: 'part-wings', wanted: 'remote' },
  { id: 'wrench', human: 'stagehand', wants: 'earring', gives: { item: 'wrench' }, crumbs: 10, scheme: 'den-raccoons', wanted: 'wrench' },
  { id: 'cone', human: 'foreman', wants: 'sticker', gives: { flags: ['foreman.deal'] }, crumbs: 10, scheme: 'part-beak', wanted: 'cone', after: '"Take a cone, kid. It\'s behind the shed gate."' },
];

// The Exchange oak (the crows' market): its Wanted board and stall.
export const MARKET = {
  oak: { x: -10, z: 365 },
  board: { x: -8.2, z: 362.4, yaw: 0.5, w: 1.6, h: 1.1, y: 1.0 },
  stall: { x: -12.6, z: 362.2, yaw: -0.4 },
  stallItems: [
    { id: 'spectacles', item: 'spectacles', price: 10, active: { flags: ['den-crows', 'gear-headlamp'], not: ['strix.specsBought'] }, flag: 'strix.specsBought' },
    { id: 'shiny', item: 'shiny', price: 15, phase: 'afternoon', perPhase: true },
  ],
  ledger: { pricesFalafel: { 'taxi-checker': 2, 'subway-blue': 2, 'maple-stripes': 3, 'ramble-cable': 3, 'cream-mohair': 4 } },
};

// The 103rd Street shed and the flypast arch are triggers on the flock.
// 3b: the Blockhouse is a roofless stone box (walls 4.6 m): the flypast is a low pass through it, no higher than 6 m over its floor
export const FLYPAST = { x: -81.4, z: 1031, r: 5.5, yMin: 0, yMax: 6, flock: 30, flag: 'meer.flypast' };

// ------------------------------------------------------------------ collectibles
// 40 stray pigeons (ledges, under bridges, water towers, the Blockhouse). on: 'roof' (top of what's
// under the point), 'ground', or 'tower:<n>' (a 110th Street water tower). spike: a site that drives them off.
export const STRAY_SPOTS = [
  { id: 'st01', x: 60.5, z: 41.2, on: 'ground', note: 'under Gapstow Bridge' }, { id: 'st02', x: -103, z: 6, on: 'roof', note: "Merchants' Gate column" },
  { id: 'st03', x: 97, z: -44.6, on: 'ground' }, { id: 'st04', x: -122, z: -12, on: 'roof', note: 'Columbus Circle column' },
  { id: 'st05', x: -150, z: -26, on: 'roof' }, { id: 'st06', x: 30, z: -32, on: 'roof' },
  { id: 'st07', x: -40, z: 106, on: 'ground' }, { id: 'st08', x: 23, z: 102, on: 'roof', note: 'the Dairy' },
  { id: 'st09', x: -6.6, z: 64, on: 'roof', note: 'Chess & Checkers House' }, { id: 'st10', x: -98, z: 166, on: 'roof', note: 'Tavern on the Green' },
  { id: 'st11', x: 1.5, z: 268.5, on: 'roof', spike: 'P8', note: 'Bethesda arcade' }, { id: 'st12', x: 11.7, z: 268.5, on: 'roof', spike: 'P8' }, { id: 'st13', x: 6.6, z: 272.4, on: 'roof', spike: 'P8' },
  { id: 'st14', x: -31.9, z: 307, on: 'ground', note: 'under Bow Bridge' }, { id: 'st15', x: 38, z: 316, on: 'roof', note: 'the Boathouse' },
  { id: 'st16', x: 77, z: 294.8, on: 'roof', note: 'Kerbs Boathouse' }, { id: 'st17', x: -133, z: 282, on: 'roof' },
  { id: 'st18', x: -132, z: 340, on: 'roof' }, { id: 'st19', x: 132, z: 300, on: 'roof' },
  { id: 'st20', x: -24, z: 380, on: 'ground', note: 'the cave mouth' }, { id: 'st21', x: -3, z: 420, on: 'roof', note: 'Belvedere' },
  { id: 'st22', x: -36, z: 450, on: 'roof', note: 'the Delacorte' }, { id: 'st23', x: 44, z: 456, on: 'roof', note: "the Needle's plinth" },
  { id: 'st24', x: 94, z: 470, on: 'roof', note: 'the museum roof' }, { id: 'st25', x: 14, z: 566, on: 'roof', note: 'south gatehouse' },
  { id: 'st26', x: -12, z: 758, on: 'roof', note: 'north gatehouse' }, { id: 'st27', x: 108, z: 762, on: 'roof', note: "Engineers' Gate" },
  { id: 'st28', x: 132, z: 640, on: 'roof' }, { id: 'st29', x: -133, z: 600, on: 'roof' },
  { id: 'st30', x: -133, z: 820, on: 'roof' }, { id: 'st31', x: 133, z: 880, on: 'roof' },
  { id: 'st32', x: -60.4, z: 875, on: 'ground', note: 'by the waterfall' }, { id: 'st33', x: 97, z: 944, on: 'roof', note: 'Conservatory Garden' },
  { id: 'st34', x: 57, z: 1047, on: 'roof', note: 'the Meer boathouse' }, { id: 'st35', x: -81.4, z: 1031, on: 'ground', note: 'in the Blockhouse' },
  { id: 'st36', x: -84, z: 1028, on: 'ground', note: 'in the Blockhouse' }, { id: 'st37', on: 'tower:0' },
  { id: 'st38', on: 'tower:7' }, { id: 'st39', on: 'tower:14' }, { id: 'st40', on: 'tower:21' },
];

// 20 golden pretzels (rooftops, water towers, the Ramble cave, under Bow Bridge, the Needle's tip…). Each adds a little stamina for good.
export const PRETZELS = [
  { id: 'gp01', x: -6, z: 419.7, on: 'summit:summit-belvedere', dy: 0.5 }, { id: 'gp02', x: 44, z: 465.6, on: 'summit:summit-needle', dy: 0.5 },
  { id: 'gp03', x: -26.4, z: 379.6, on: 'ground', dy: 0.4, note: 'the Ramble cave' }, { id: 'gp04', x: -31, z: 305, on: 'ground', dy: 0.4, note: 'under Bow Bridge' },
  { id: 'gp05', on: 'tower:3', dy: 0.5 }, { id: 'gp06', on: 'tower:11', dy: 0.5 }, { id: 'gp07', on: 'tower:30', dy: 0.5 },
  { id: 'gp08', x: 145, z: 623.7, on: 'roof', dy: 0.6, note: 'the spiral museum' }, { id: 'gp09', x: -148, z: 279.6, on: 'roof', dy: 0.6, note: 'the gabled apartment house' },
  { id: 'gp10', x: 65, z: -40, on: 'roof', dy: 0.6, note: 'the Plaza hotel' }, { id: 'gp11', x: 130, z: 319.8, on: 'roof', dy: 0.6, note: "Walter's building" },
  { id: 'gp12', x: -136.5, z: 315.5, on: 'roof', dy: 0.6, note: 'twin towers' }, { id: 'gp13', x: 174.3, z: -41, on: 'roof', dy: 0.6 },
  { id: 'gp14', x: -74.8, z: 951.7, on: 'ground', dy: 0.6, note: 'the Great Hill' }, { id: 'gp15', x: 60.5, z: 42.2, on: 'roof', dy: 0.4, note: 'Gapstow Bridge' },
  { id: 'gp16', x: 97, z: -40, on: 'roof', dy: 0.6, note: 'the Plaza fountain' }, { id: 'gp17', x: 6.6, z: 283.5, on: 'roof', dy: 0.6, note: 'Bethesda fountain' },
  { id: 'gp18', x: -60.6, z: 873.6, on: 'ground', dy: 0.5, note: 'the Loch' }, { id: 'gp19', x: 94, z: 440, on: 'roof', dy: 0.6, note: 'the museum' },
  { id: 'gp20', x: 22, z: 1062, on: 'roof', dy: 0.6, note: '110th Street' },
];

// 16 Park Postcards: small one-minute moments (10 crumbs each, a polaroid on the Board).
// at: where it happens (r metres). phase: when. kind: how it's triggered (collect.js).
export const POSTCARDS = [
  { id: 'carousel', name: 'Carousel', at: { x: -17.6, z: 106.1, r: 6.2 }, phase: 'afternoon', kind: 'ride', secs: 12.5, line: 'Round and round. The organ plays your song.' },
  { id: 'strawberry', name: 'Strawberry Fields', at: { x: -86, z: 276, r: 2.4 }, phase: 'afternoon', kind: 'coo', human: 'busker', line: 'He plays a riff for you. Crumbs land in the case.' },
  { id: 'bow-bridge', name: 'Bow Bridge', at: { x: -31.6, z: 312, r: 6 }, phase: 'afternoon', kind: 'perch', flags: ['wedding.cleared'], spike: 'P7', line: '"Two doves! Stunning!"' },
  { id: 'gapstow', name: 'Gapstow Bridge', at: { x: 61, z: 43.2, r: 2.2 }, phase: 'day', kind: 'coo', human: 'gapstow-selfie', spike: 'P5', line: 'A selfie with the skyline. And a pigeon.' },
  { id: 'chess', name: 'Chess & Checkers House', at: { x: -6.6, z: 64, r: 1.6 }, phase: ['morning', 'afternoon'], kind: 'peck', human: 'chess', line: '"That was MY rook!" "YOU moved it!"' },
  { id: 'sheep-meadow', name: 'Sheep Meadow', at: { x: -46, z: 160, r: 0.8 }, phase: 'afternoon', kind: 'still', secs: 4, towel: true, line: 'Sunbathing. Like the humans. Exactly like the humans.' },
  { id: 'delacorte', name: 'The Delacorte', at: { x: -38.5, z: 443.3, r: 13 }, phase: 'dusk', kind: 'cue', flags: ['delacorte.backstage'], minY: 3, line: '"…and ENTER, a bird!" Coo. A standing ovation.' },
  { id: 'needle', name: "Cleopatra's Needle", at: { x: 44, z: 465.6, r: 1.2 }, kind: 'summit', summit: 'summit-needle', line: 'The very tip. The whole park at your feet.' },
  { id: 'wollman', name: 'Wollman Rink', at: { x: 51.7, z: 88.6, r: 16 }, phase: 'day', kind: 'slide', dist: 8, line: 'A belly-slide between the skaters. Wheee!' },
  { id: 'loch', name: 'The Loch', at: { x: -56.1, z: 875.4, r: 2.6 }, kind: 'waterfall', line: 'Down the little waterfall. Splash!' },
  { id: 'sled-dog', name: 'Sled Dog Statue', at: { x: 37.4, z: 173, r: 1.4 }, phase: 'day', kind: 'perch', minY: 1.2, secs: 2.5, line: 'The kids pat the bronze dog. And you.' },
  { id: 'mushroom', name: 'Mushroom Statue', at: { x: 77, z: 327.3, r: 1.8 }, phase: 'afternoon', kind: 'perch', minY: 2, secs: 2.5, line: 'On top of the giant mushroom, with the climbing kids.' },
  { id: 'zoo', name: 'Zoo Wall', at: { x: 91.3, z: 112.6, r: 21 }, phase: 'afternoon', kind: 'sprat', minY: 2, line: 'Feeding time! A flung sprat. Caught it!' },
  { id: 'ramble', name: 'The Ramble', at: { x: -18, z: 360, r: 25 }, phase: 'morning', kind: 'birders', line: 'The birders gasp… then sigh. "Just a pigeon."' },
  { id: 'north-woods', name: 'North Woods', at: { x: -81.4, z: 1031, r: 9 }, phase: 'night', kind: 'coyote', minY: 2.5, coyote: { from: { x: -64, z: 1000 }, to: { x: -40, z: 992 } }, line: 'There, in the clearing. The coyote. It\'s REAL.' },
  { id: 'mall', name: 'The Mall', at: { x: 1.4, z: 214, r: 0.6 }, phase: 'morning', kind: 'hat', human: 'dolores', line: 'On the Pigeon Lady\'s hat. She doesn\'t mind.' },
];
