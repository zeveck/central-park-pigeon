// DATA: the park's people ("Central Park and NYC life") and where they are in
// each phase. Each entry makes `n` agents. act: wander (around `at` within r),
// sit, stand, jog (round a loop), path (walk a polyline back and forth),
// skate (glide round the rink), work (stand at a post, facing yaw).
// phases: when they're out (PHASE_SETS key or a list). acc: role accessories.
// Pure data (no three.js).
// Fixes-3 (R5): every 'sit' agent sits ON something: spec.seat 'bench' | 'stool' | 'carriage' (humans.js draws the
// furniture); a sitter with no seat gets a park bench behind it.

const P = (x, z, yaw = 0) => ({ x, z, yaw });

// Polish-1: the rigged humans to mix into a crowd (picked by index, `mix` shifts the start, so a spec is
// varied and gender-mixed without touching any random stream). Models with a 'sit' clip: park, chess-player,
// dolores, carriage-driver.
// #46: 15 more people mixed in (the most-cloned slots first); a list's order spreads them so neighbours differ.
// Sitters need a 'sit' clip: park, chess-player, dolores, carriage-driver, old-man, student, newspaper-man, shopper, painter.
const MIX = {
  walkers: ['human-taichi-elder', 'human-businessperson', 'human-tourist', 'human-old-man', 'human-birder', 'human-student', 'human-dog-walker', 'human-jogger', 'human-shopper', 'human-newspaper-man', 'human-park', 'human-dog-sitter', 'human-nanny', 'human-street-musician'],
  tourists: ['human-tourist', 'human-photographer', 'human-cyclist', 'human-old-man', 'human-nanny', 'human-tourist', 'human-taichi-elder', 'human-businessperson'],
  mall: ['human-tourist', 'human-student', 'human-businessperson', 'human-scooter-kid', 'human-old-man', 'human-shopper', 'human-birder', 'human-child'],
  city: ['human-businessperson', 'human-delivery', 'human-tourist', 'human-shopper', 'human-newspaper-man', 'human-construction', 'human-chess-player'],
  sitters: ['human-newspaper-man', 'human-painter', 'human-park', 'human-student', 'human-old-man', 'human-chess-player', 'human-shopper'],
  guests: ['human-businessperson', 'human-shopper', 'human-chess-player', 'human-dolores'],
};
const SKATE_TINTS = [null, [0.62, 0.78, 1.25], [1.2, 0.72, 0.68], [0.72, 1.12, 0.75], [1.15, 1.08, 0.62]];

export const PEOPLE = [
  // ---------------------------------------------------------------- the south end
  { role: 'parkgoer', model: MIX.walkers, n: 3, phases: 'day', act: 'wander', at: P(96, 22), r: 10, acc: ['phone'], feeder: true },   // batch-3 (#1): the Pond's east bank (was (60, 18) r 18: mid-Pond)
  { role: 'picnicker', model: MIX.sitters, n: 2, phases: ['afternoon'], act: 'sit', at: P(52, 5), r: 4, feeder: true },   // batch-3 (#1): on the bank by 59th, benches too (was (52, 22): in the Pond)
  { role: 'tourist', model: MIX.tourists, n: 3, phases: 'day', act: 'wander', at: P(-10, 70), r: 30, acc: ['camera'], feeder: true },
  { role: 'parkgoer', model: MIX.walkers, mix: 3, n: 2, phases: 'day', act: 'wander', at: P(-40, 50), r: 15, feeder: true },
  { role: 'chess', model: 'human-chess-player', n: 2, phases: ['morning', 'afternoon'], act: 'sit', at: P(-6.6, 64), r: 1.5, seat: 'stool' },   // Fixes-3 (R5)
  { role: 'skater', model: 'human-teen-skater', n: 5, phases: 'day', act: 'skate', at: P(51.7, 88.6), r: 10, tints: SKATE_TINTS },
  { role: 'tourist', model: MIX.tourists, mix: 1, n: 4, phases: 'day', act: 'wander', at: P(-10, -10), r: 40, acc: ['camera'], street: true },
  { role: 'driver', model: 'human-carriage-driver', n: 3, phases: 'day', act: 'stand', at: P(-18, -9.5), r: 30, acc: [], seat: 'carriage' },   // Polish-1: drawn up on the carriage box (street.js carriages); the sim spot is unchanged
  { role: 'selfie', model: 'human-runner', n: 1, phases: 'day', act: 'stand', at: P(93, -36, -0.74), r: 0, acc: ['selfie', 'sunglasses-up'] },   // fun pass (P6): his back to the fountain (was yaw 2.4, facing it): the rim behind him is in his shot
  { role: 'halal', model: 'human-halal-cart-man', n: 1, phases: ['afternoon'], act: 'work', at: P(104, -23.5, 0), r: 0, acc: [] },
  { role: 'icecream', model: 'human-vendor', n: 1, phases: ['afternoon'], act: 'work', at: P(80.6, -15.8, 3.14), r: 0, acc: ['paperhat'] },   // 3b: beside his truck
  // ---------------------------------------------------------------- the Mall, Sheep Meadow, Bethesda
  { role: 'tourist', model: MIX.mall, n: 5, phases: 'day', act: 'wander', at: P(6.6, 200), r: 45, acc: ['phone'], feeder: true },
  { role: 'vinnie', model: 'human-vendor', n: 1, phases: 'day', act: 'work', at: P(10, 206, -1.57), r: 0, named: 'vinnie' },
  { role: 'dolores', model: 'human-dolores', n: 1, phases: ['morning'], act: 'sit', at: P(1.4, 214, 1.57), r: 0, named: 'dolores', acc: [], seat: 'bench', feeds: true },
  { role: 'artist', model: 'human-painter', n: 1, phases: ['afternoon'], act: 'stand', at: P(13, 228, -1.57), r: 0, acc: ['beret'] },
  { role: 'sunbather', model: MIX.sitters, n: 4, phases: ['afternoon'], act: 'sit', at: P(-50, 165), r: 18, feeder: true },
  { role: 'parkgoer', model: MIX.walkers, mix: 2, n: 3, phases: ['morning', 'dusk'], act: 'wander', at: P(-50, 165), r: 25, feeder: true },
  { role: 'tourist', model: MIX.tourists, mix: 2, n: 4, phases: 'day', act: 'wander', at: P(6.6, 268), r: 14, acc: ['camera'], feeder: true },
  { role: 'busker', model: 'human-street-musician', n: 1, phases: ['afternoon'], act: 'stand', at: P(10, 286, 3.14), r: 0, acc: ['sax'] },
  { role: 'busker', model: 'human-old-man', n: 1, phases: ['afternoon'], act: 'stand', at: P(-86, 276, 0), r: 0, acc: ['guitar'] },
  // fun pass (P3): the Boathouse picnic sits round its own little table (the tub of peas on it) ~12 m down the slope from
  // sign M7 (and clearly nearer it than the enamel M8: first-15 check), so a FEED sign there gets the whole group up (spec.group: summonFeeders brings the rest) and the tub reads
  // as left alone. Was one spec (n 3, r 5 round P(42, 302), right under M7); the same three agents, ids and models.
  { role: 'picnicker', model: 'human-chess-player', n: 1, phases: ['afternoon'], act: 'sit', at: P(45.5, 294.0, 3.14), r: 0, feeder: true, group: 'boathouse' },
  { role: 'picnicker', model: 'human-painter', n: 1, phases: ['afternoon'], act: 'sit', at: P(44.2, 291.75, 1.05), r: 0, feeder: true, group: 'boathouse' },
  { role: 'picnicker', model: 'human-chess-player', n: 1, phases: ['afternoon'], act: 'sit', at: P(46.8, 291.75, -1.05), r: 0, feeder: true, group: 'boathouse' },
  { role: 'waiter', model: 'human-park', n: 1, phases: ['afternoon'], act: 'wander', at: P(-98.5, 150.2), r: 3.5, acc: ['apron'], tint: [1.1, 1.1, 1.1] },
  { role: 'rckid', model: 'human-child', n: 1, phases: ['afternoon'], act: 'stand', at: P(62, 296, 1.57), r: 0, kid: true, acc: ['remote'] },
  // the wedding shoot on Bow Bridge (M–D until it's cleared)
  { role: 'bride', model: 'human-wedding', n: 1, phases: 'day', act: 'stand', at: P(-31, 297.5, 1.76), r: 0, acc: ['veil', 'bouquet'], until: 'wedding.cleared', vip: 1 },
  { role: 'groom', model: 'human-carriage-driver', n: 1, phases: 'day', act: 'stand', at: P(-32.5, 296.8, 1.76), r: 0, acc: ['buttonhole'], until: 'wedding.cleared', vip: 1 },
  { role: 'planner', model: 'human-businessperson', n: 1, phases: 'day', act: 'stand', at: P(-26, 295, -1.4), r: 0, acc: ['headset'], until: 'wedding.cleared', vip: 1 },   // 3b: her wicker basket is a mesh of its own (src/setpieces/wedding.js)
  { role: 'photographer', model: 'human-photographer', n: 1, phases: 'day', act: 'stand', at: P(-22, 293, -1.4), r: 0, acc: ['camera', 'beret'], until: 'wedding.cleared', vip: 1 },
  { role: 'guest', model: MIX.guests, n: 4, phases: 'day', act: 'stand', at: P(-36, 300), r: 3, until: 'wedding.cleared', vip: 1, acc: ['corsage'] },
  // ---------------------------------------------------------------- the Ramble, Turtle Pond, the Delacorte, the Great Lawn
  { role: 'birder', model: 'human-birder', n: 3, phases: ['morning'], act: 'wander', at: P(-18, 360), r: 25, acc: ['binoculars'] },
  { role: 'guard', model: 'human-vendor', n: 1, phases: ['dusk'], act: 'work', at: P(-44, 432, 0.7), r: 0, acc: ['cap'] },
  { role: 'stagehand', model: 'human-vendor', n: 1, phases: ['dusk'], act: 'wander', at: P(-40, 438), r: 4, acc: ['headset'] },
  { role: 'picnicker', model: MIX.sitters, mix: 1, n: 4, phases: ['afternoon'], act: 'sit', at: P(-6.6, 489), r: 25, feeder: true },
  { role: 'parkgoer', model: MIX.walkers, mix: 4, n: 2, phases: ['morning', 'dusk'], act: 'wander', at: P(-6.6, 489), r: 35, feeder: true },
  // the loop stays on Cedar Hill, south of the 79th St cut (z 397–410): it used to cross the cut in two places, down to the road
  // and up its walls, and a pigeon following her with the heavy sack was pinned at the rim (the mistake sweep, 2026-11-24)
  { role: 'dogwalker', model: 'human-dog-walker', n: 1, phases: ['morning'], act: 'path', path: [P(48, 368), P(52, 390), P(66, 391), P(72, 380)], acc: [], dogs: 2 },
  // ---------------------------------------------------------------- the Reservoir and the north
  // the jogger who never stops… except at the north gatehouse's water fountain, once a lap
  { role: 'jogger', model: ['human-runner', 'human-jogger'], n: 4, phases: ['morning', 'dusk'], act: 'jog', at: P(0, 662), loop: { rx: 94.5, rz: 97.5, exp: 2.25 }, acc: ['headband'], stop: { x: -4, z: 759.4, secs: 6 } },
  { role: 'cyclist', model: 'human-delivery', n: 1, phases: ['afternoon'], act: 'path', path: [P(100, 622), P(100.5, 680), P(97, 738)], acc: ['helmet', 'box'], holds: 'box' },
  { role: 'halal', model: 'human-halal-cart-man', n: 1, phases: ['dusk'], act: 'work', at: P(108, 1051.6, 0), r: 0, acc: [] },   // fix-19: on the pavement (was in the road)
  // the Gapstow Bridge selfie (a postcard), the chess players' audience, kids at the statues (postcards)
  { role: 'gapstow-selfie', model: 'human-student', n: 1, phases: 'day', act: 'stand', at: P(61, 43.2, 0.1), r: 0, acc: ['selfie'] },
  { role: 'kid', model: ['human-child', 'human-scooter-kid'], n: 2, phases: 'day', act: 'wander', at: P(37.4, 171.2), r: 2.2, kid: true },
  { role: 'kid', model: ['human-scooter-kid', 'human-child'], n: 2, phases: ['afternoon'], act: 'wander', at: P(77.4, 326.4), r: 3, kid: true },   // batch-3 (#1): clear of Conservatory Water
  { role: 'parkgoer', model: MIX.walkers, mix: 5, n: 3, phases: 'day', act: 'wander', at: P(0, 830), r: 40, feeder: true },
  { role: 'parkgoer', model: MIX.walkers, mix: 1, n: 2, phases: 'day', act: 'wander', at: P(58.3, 956.9), r: 22, feeder: true },   // batch-3 (#1): off the Meer (was (60, 960) r 25)
  // ---------------------------------------------------------------- the city ring
  { role: 'walter', model: 'human-walter', n: 1, phases: 'any', act: 'work', at: P(129, 318.6, -1.57), r: 0, named: 'walter', acc: ['capbraid'] },
  { role: 'doorman', model: 'human-walter', n: 2, phases: 'day', act: 'work', at: P(129, 230, -1.57), r: 120, street: true, tint: [0.75, 0.8, 1.0] },
  { role: 'foreman', model: 'human-construction', n: 1, phases: ['morning', 'afternoon'], act: 'work', at: P(129, 359, -1.57), r: 0, acc: ['hardhat'] },
  { role: 'worker', model: ['human-construction', 'human-vendor'], n: 2, phases: ['morning'], act: 'wander', at: P(131, 359), r: 5, acc: ['hardhat'] },
  { role: 'counterman', model: 'human-pizza-counterman', n: 1, phases: 'any', act: 'work', at: P(-150, -26, 0), r: 0, acc: ['paperhat'] },
  { role: 'counterman', model: 'human-pizza-counterman', n: 1, phases: 'any', act: 'work', at: P(-133, 257.5, 1.57), r: 0, acc: ['paperhat'] },
  { role: 'counterman', model: 'human-pizza-counterman', n: 1, phases: 'any', act: 'work', at: P(53.2, 1073, 3.14), r: 0, acc: ['paperhat'] },
  { role: 'sliceeater', model: 'human-newspaper-man', n: 1, phases: 'day', act: 'sit', at: P(-143, -17.5, 3.14), r: 0, acc: ['slice'], holds: 'slice' },
  { role: 'sliceeater', model: 'human-student', n: 1, phases: 'day', act: 'sit', at: P(-125.5, 262, 1.57), r: 0, acc: ['slice'], holds: 'slice-anchovy' },
  { role: 'sliceeater', model: 'human-old-man', n: 1, phases: 'day', act: 'sit', at: P(49, 1066, 0), r: 0, acc: ['slice'], holds: 'slice' },
  { role: 'tourist', model: MIX.city, n: 3, phases: 'day', act: 'wander', at: P(-128, 400), r: 30, street: true, acc: ['phone'] },
  { role: 'tourist', model: MIX.tourists, mix: 1, n: 3, phases: 'day', act: 'wander', at: P(128, 500), r: 40, street: true, acc: ['camera'] },
  { role: 'parkgoer', model: MIX.city, mix: 2, n: 2, phases: 'day', act: 'wander', at: P(40, 1068), r: 30, street: true },
];

// Humans react to these roles' clues: who can be lured (Mimic) or chased (Bully, a Coo swarm).
export const FLEES = ['gapstow-selfie', 'kid', 'tourist', 'parkgoer', 'picnicker', 'sunbather', 'sliceeater', 'cyclist', 'guest', 'waiter', 'jogger', 'birder', 'rckid', 'artist'];

// ---------------------------------------------------------------------------------------------------------
// Polish-1: AMBIENT people. Scenery only: simulated and drawn like PEOPLE (seeded per agent), but kept OUT of
// Humans.agents, so no scheme, clue, Mimic, Bully, swarm, feeder call or replay ever sees them (they live
// in Humans.extras). Extra acts: 'route' (walk/jog a polyline back and forth at `speed` m/s), 'stand'/'sit'
// with `spots` (one agent per spot). seat: 'stool' (a stool is drawn under a sitter), 'bench'.
// look: an idle variant clip loop (e.g. 'gawk', 'think', 'look', 'phone', 'cook'); flavour: one-shot clips
// played now and then while idle. vip: drawn past the crowd caps near a showpiece (1 always, 2 not on Low).
const S = (x, z, yaw = 0) => ({ x, z, yaw });
const CHESS = { x: -6.6, z: 83.43 };
const chessSeat = (k, side) => {   // table k of 10 round the Chess & Checkers House (landmarks.js), a player each side
  const a = (k / 10) * Math.PI * 2, r = 7.5 + side * 0.72;
  const x = CHESS.x + Math.cos(a) * r, z = CHESS.z + Math.sin(a) * r;
  return S(x, z, Math.atan2(CHESS.x + Math.cos(a) * 7.5 - x, CHESS.z + Math.sin(a) * 7.5 - z));
};
const WEST_DRIVE = [S(-37.4 - 3, 0), S(-44 - 3, 33), S(-61.6 - 3, 74.2), S(-79.2 - 3, 117.4), S(-85.8 - 3, 160.7), S(-88 - 3, 222.5)];
const EAST_DRIVE = [S(17.6 + 3, 74.2), S(22 + 3, 115.4), S(34.1 + 3, 144.2), S(44 + 3, 177.2), S(49.5 + 3, 230.7), S(57.2 + 3, 292.5)];
const ring = (c, r, n, a0 = 0, face = 'in') => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; return S(x, z, face === 'in' ? Math.atan2(c.x - x, c.z - z) : Math.atan2(x - c.x, z - c.z)); });

export const AMBIENT = [
  // the chess tables round the Chess & Checkers House: four games on, two kibitzers
  { role: 'amb-chess', model: 'human-chess-player', phases: 'day', act: 'sit', seat: 'stool', spots: [chessSeat(1, 1), chessSeat(1, -1), chessSeat(4, 1), chessSeat(4, -1), chessSeat(6, 1), chessSeat(6, -1), chessSeat(8, 1), chessSeat(8, -1)], models: ['human-chess-player', 'human-newspaper-man', 'human-chess-player', 'human-dolores', 'human-chess-player', 'human-businessperson', 'human-old-man', 'human-chess-player'], look: 'think', flavour: ['argue', 'think'] },
  { role: 'amb-kibitz', model: 'human-tourist', phases: 'day', act: 'stand', spots: [S(-6.6 + 9.4, 83.43 + 2.4, -1.9), S(-6.6 - 2.6, 83.43 - 9.6, 0.3)], models: ['human-tourist', 'human-taichi-elder'], look: 'gawk' },
  // the Reservoir: more runners round the track, and runners on the loop road
  { role: 'amb-jogger', model: 'human-jogger', n: 4, phases: 'day', act: 'jog', at: S(0, 662), loop: { rx: 94.5, rz: 97.5, exp: 2.25 }, models: ['human-jogger', 'human-runner', 'human-jogger', 'human-businessperson'], acc: ['headband'], loopOff: 0.13 },
  { role: 'amb-runner', model: 'human-jogger', n: 2, phases: ['morning', 'afternoon', 'dusk'], act: 'route', path: WEST_DRIVE, speed: 2.8, models: ['human-jogger', 'human-runner'] },
  { role: 'amb-runner', model: 'human-jogger', n: 2, phases: ['morning', 'afternoon', 'dusk'], act: 'route', path: EAST_DRIVE, speed: 2.7, models: ['human-runner', 'human-cyclist'] },
  // tourists: Bethesda (the terrace and round the fountain), Bow Bridge's north landing, Strawberry Fields
  { role: 'amb-tourist', model: 'human-tourist', phases: 'day', act: 'stand', spots: ring({ x: 6.6, z: 285.3 }, 8.6, 7, 0.4), models: ['human-tourist', 'human-photographer', 'human-shopper', 'human-scooter-kid', 'human-businessperson', 'human-tourist', 'human-dog-sitter'], look: 'gawk', flavour: ['wave', 'gawk', 'cheer', 'jump'] },
  { role: 'amb-tourist', model: 'human-tourist', n: 4, phases: 'day', act: 'wander', at: S(6.6, 264), r: 8, models: ['human-tourist', 'human-shopper', 'human-student', 'human-birder'], flavour: ['gawk', 'wave'] },
  { role: 'amb-tourist', model: 'human-tourist', phases: 'day', act: 'stand', spots: [S(-28.6, 334.5, Math.PI + 0.3), S(-30.2, 335.2, Math.PI + 0.1), S(-26.8, 336.0, Math.PI + 0.6)], models: ['human-tourist', 'human-photographer', 'human-taichi-elder'], look: 'gawk', flavour: ['wave'] },
  { role: 'amb-tourist', model: 'human-tourist', phases: 'day', act: 'stand', spots: ring({ x: -88, z: 272.95 }, 4.6, 6, 0.9), models: ['human-tourist', 'human-street-musician', 'human-shopper', 'human-businessperson', 'human-tourist', 'human-scooter-kid'], look: 'gawk', flavour: ['wave', 'gawk'] },
  // Wollman Rink: more skaters on a wider and a tighter oval
  { role: 'amb-skater', model: 'human-teen-skater', n: 3, phases: 'day', act: 'skate', at: S(51.7, 88.6), rx: 9, rz: 5.5, speed: 0.05, models: ['human-child', 'human-teen-skater', 'human-jogger'], tints: [null, [0.85, 0.7, 1.2], null] },
  { role: 'amb-skater', model: 'human-teen-skater', n: 2, phases: 'day', act: 'skate', at: S(51.7, 88.6), rx: 15, rz: 9.5, speed: -0.03, models: ['human-tourist', 'human-teen-skater'], tints: [null, [0.7, 0.72, 0.8]] },
  // birders: the Ramble and Hallett Sanctuary
  { role: 'amb-birder', model: 'human-birder', n: 2, phases: ['morning', 'afternoon'], act: 'wander', at: S(4, 380), r: 18, look: 'look' },
  { role: 'amb-birder', model: 'human-birder', phases: ['morning', 'afternoon', 'dusk'], act: 'stand', spots: [S(41, 67, 0.6), S(48.5, 64.5, -0.4)], look: 'look' },
  // businesspeople: the Midtown edge (Central Park South's far sidewalk) and Columbus Circle
  { role: 'amb-commuter', model: 'human-businessperson', n: 3, phases: ['morning', 'afternoon', 'dusk'], act: 'route', path: [S(-96, -17.2), S(-40, -17.2), S(30, -17.2), S(96, -17.2)], speed: 1.35, models: ['human-businessperson', 'human-delivery', 'human-shopper'] },
  { role: 'amb-commuter', model: 'human-businessperson', n: 2, phases: ['morning', 'afternoon', 'dusk'], act: 'route', path: [S(-80, -2.4), S(0, -2.4), S(80, -2.4)], speed: 1.25, models: ['human-newspaper-man', 'human-businessperson'] },
  { role: 'amb-commuter', model: 'human-businessperson', phases: ['morning', 'afternoon', 'dusk'], act: 'stand', spots: [S(-146, -17.0, 0.2), S(-139, -17.4, -0.4), S(-104, -17.0, 2.9), S(-98, -17.3, 3.3), S(-106, 1.5, -2.2)], models: ['human-businessperson', 'human-newspaper-man', 'human-shopper', 'human-tourist', 'human-businessperson'], look: 'phone' },
  { role: 'amb-commuter', model: 'human-businessperson', n: 3, phases: ['morning', 'afternoon', 'dusk'], act: 'wander', at: S(-104, 3), r: 5, models: ['human-businessperson', 'human-tourist', 'human-construction'] },
  // the halal cart's line (Afternoon at the Plaza), customers at the pizza counters
  { role: 'amb-customer', model: 'human-tourist', phases: ['afternoon'], act: 'stand', spots: [S(106.3, -22.9, -1.4), S(107.5, -23.8, -1.2)], models: ['human-tourist', 'human-shopper'], look: 'phone' },
  // dog walkers with leashed dogs: the Sheep Meadow loop and the Great Lawn
  { role: 'amb-dogwalker', model: 'human-dog-walker', phases: 'day', act: 'route', path: [S(-84.7, 145.2), S(-19.8, 143.2), S(-9.9, 173), S(-12.1, 218.4)], speed: 1.2, dogs: 2 },
  { role: 'amb-dogwalker', model: 'human-dog-walker', phases: ['morning', 'dusk'], act: 'route', path: [S(-6.6 - 41, 489), S(-6.6, 489 - 44), S(-6.6 + 41, 489)], speed: 1.15, dogs: 3, models: ['human-dog-sitter'] },
  // kids: the Carousel and the Zoo gate
  { role: 'amb-kid', model: 'human-child', phases: 'day', act: 'stand', spots: ring({ x: -17.6, z: 107.1 }, 9.2, 4, 0.7), models: ['human-child', 'human-nanny', 'human-scooter-kid', 'human-tourist'], look: null, flavour: ['cheer', 'jump', 'skip', 'wave'] },
  { role: 'amb-kid', model: 'human-child', n: 3, phases: 'day', act: 'wander', at: S(88, 77), r: 6, models: ['human-scooter-kid', 'human-dog-sitter', 'human-child'], flavour: ['skip', 'jump', 'cheer'] },
  // the Mall's strollers
  { role: 'amb-walker', model: 'human-park', n: 4, phases: 'day', act: 'route', path: [S(4, 152), S(4, 255)], speed: 1.1, models: ['human-birder', 'human-nanny', 'human-businessperson', 'human-street-musician'] },
  { role: 'amb-walker', model: 'human-park', n: 3, phases: 'day', act: 'route', path: [S(9.2, 255), S(9.2, 152)], speed: 1.2, models: ['human-chess-player', 'human-jogger', 'human-dog-sitter'] },
  // the wedding: more guests (Bow Bridge's south landing, until the bridge is cleared; wedding.js poses them)
  { role: 'wguest', model: 'human-park', phases: 'day', act: 'stand', until: 'wedding.cleared', vip: 2, acc: ['corsage'], spots: [S(-38.2, 299.2, 0.9), S(-37.4, 301.6, 1.2), S(-34.2, 301.9, 2.6), S(-39.0, 301.0, 1.4), S(-35.4, 298.0, 0.6), S(-33.4, 299.6, 2.2)], models: ['human-chess-player', 'human-birder', 'human-newspaper-man', 'human-dog-walker', 'human-businessperson', 'human-nanny'], tints: [[0.75, 0.75, 0.85], [1, 0.9, 0.95], [0.5, 0.5, 0.6], null, [1.05, 0.9, 1.05], [0.75, 0.68, 0.62]] },
];
