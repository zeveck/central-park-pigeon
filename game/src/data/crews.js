// DATA: the park's crews ("The park's crews"), their bosses and regulars, the
// humans with names, who can come when ("Calling allies"), the feuds, and
// where every crowd lives. Pure data: no three.js, so tools/check-schemes.mjs
// can import it in Node.
//
// Positions are game metres (+x east, +z north). `on` says how a position is
// resolved at build time: 'ground' (terrain or pavement), 'water:<id>' (the
// nearest point inside that water body, at its level), 'roof' (the top of the
// structure under the point), or a height in metres above the ground (`y`).

// ------------------------------------------------------------------ phases
export const PHASES = ['morning', 'afternoon', 'dusk', 'night'];
export const PHASE_SETS = {
  any: ['morning', 'afternoon', 'dusk', 'night'],
  day: ['morning', 'afternoon', 'dusk'],
  'dusk-night': ['dusk', 'night'],
  night: ['night'],
  dusk: ['dusk'],
};
export const phaseList = (p) => (Array.isArray(p) ? p : PHASE_SETS[p] || [p]);
export const PHASE_LABEL = { morning: 'Morning', afternoon: 'Afternoon', dusk: 'Dusk', night: 'Night' };

// ------------------------------------------------------------------ talents
export const TALENTS = {
  coo: { name: 'Coo', verb: 'swarm', clue: 'a human with something to drop' },
  dig: { name: 'Dig', verb: 'dig', clue: 'a dust plume with acorn sparkles' },
  dive: { name: 'Dive', verb: 'dive', clue: 'bubble rings and a white splash' },
  trade: { name: 'Trade', verb: 'trade', clue: 'a human holding something you want' },
  hints: { name: 'Hints', verb: 'advise', clue: 'the Scheme Board' },
  fetch: { name: 'Fetch', verb: 'haul', clue: 'a huge object' },
  nighteyes: { name: 'Night Eyes', verb: 'spot', clue: 'the dark' },
  rig: { name: 'Rig', verb: 'rig', clue: 'a vehicle or a locked latch' },
  sabotage: { name: 'Sabotage', verb: 'sabotage', clue: 'a parked ranger cart' },
  voice: { name: 'Voice', verb: 'sing', clue: '' },
  draft: { name: 'Draft', verb: 'draft', clue: '' },
  travel: { name: 'Fast travel', verb: 'travel', clue: 'a subway grate' },
  gratefetch: { name: 'Grate Fetch', verb: 'fetch', clue: 'a grate with something glinting below' },
  lift: { name: 'Lift', verb: 'lift', clue: 'a huge object' },
  muscle: { name: 'Muscle', verb: 'haul', clue: 'a huge object' },
  knock: { name: 'Knock', verb: 'knock', clue: 'something teetering on a high edge' },
  kick: { name: 'Kick', verb: 'kick', clue: 'something stuck that puffs dust' },
  pull: { name: 'Pull', verb: 'pull', clue: 'a huge object by a road' },
  mimic: { name: 'Mimic', verb: 'mimic', clue: 'a human in the way' },
  bully: { name: 'Bully', verb: 'bully', clue: 'a human in the way' },
};
// Haul = Biscuit (day) or Rhoda (day) or Muscle (any) or horses' Pull (day, roadside only).
export const HAULERS = [
  { crew: 'biscuit', talent: 'fetch' }, { crew: 'rhoda', talent: 'lift', flier: true },
  { crew: 'meermob', talent: 'muscle', flier: true }, { crew: 'horses', talent: 'pull', roadside: true },
];

// ------------------------------------------------------------------ crews
// awake: when the ally can come. entrance: how they arrive on a Call.
// callable: false for the gangs (they join the flock) and the Elders (they don't travel).
export const CREWS = [
  { id: 'swells', name: 'The Plaza Swells', short: 'Swells', species: 'pigeon', boss: 'duchess', regulars: ['monty', 'bunting', 'tuppence', 'dove'], talents: ['coo'], flock: 6, count: 20, thread: 'sign', recruit: 'prologue', awake: 'any', callable: false, blip: 'coo', haunt: 'grand-army-plaza', entrance: 'swoop' },
  { id: 'squirrels', name: 'The Acorn Syndicate', short: 'Squirrels', species: 'squirrel', boss: 'hazel', regulars: ['nutmeg', 'twitch', 'pecan'], talents: ['dig'], count: 120, thread: 'lost', recruit: 'den-squirrels', awake: 'day', callable: true, blip: 'squirrel-chatter', haunt: 'sheep-meadow', entrance: 'drop' },
  { id: 'ducks', name: 'The Lake Mallards', short: 'Ducks', species: 'duck', boss: 'puddles', regulars: ['mrspuddles', 'bubbles', 'ensign'], talents: ['dive'], count: 60, thread: 'sign', recruit: 'den-ducks', awake: 'day', callable: true, blip: 'duck-quack-mallard', haunt: 'lake', entrance: 'popup' },
  { id: 'crows', name: 'The Ramble Exchange', short: 'Crows', species: 'crow', boss: 'vesper', regulars: ['ledger', 'glint', 'cawdry'], talents: ['trade'], count: 50, thread: 'lost', recruit: 'den-crows', awake: 'day', callable: true, blip: 'crow-caw', haunt: 'ramble', entrance: 'swoop' },
  { id: 'turtles', name: 'The Turtle Elders', short: 'Elders', species: 'turtle', boss: 'eldest', regulars: ['moss', 'shelly', 'slowpoke'], talents: ['hints'], count: 20, thread: 'feuds', recruit: 'den-turtles', awake: 'any', callable: false, blip: 'turtle-grumble', haunt: 'turtle-pond', entrance: 'none' },
  { id: 'biscuit', name: 'The Cedar Hill Pack', short: 'Dogs', species: 'dog', boss: 'biscuit', regulars: ['pretzel', 'fifi', 'moose'], talents: ['fetch'], count: 17, thread: 'lost', recruit: 'den-biscuit', awake: 'day', callable: true, blip: 'dog-bark', haunt: 'cedar-hill', entrance: 'bound' },
  { id: 'strix', name: "Strix's Parliament", short: 'Owls', species: 'owl', boss: 'strix', regulars: ['hoot', 'nanny'], talents: ['nighteyes'], count: 3, thread: 'lost', recruit: 'den-strix', awake: 'night', callable: true, blip: 'owl-hoot', haunt: 'ramble', entrance: 'swoop' },
  { id: 'raccoons', name: 'The Night Crew', short: 'Raccoons', species: 'raccoon', boss: 'rigby', regulars: ['socket', 'ringo', 'mamamask'], talents: ['rig', 'sabotage'], count: 25, thread: 'sign', recruit: 'den-raccoons', awake: 'dusk-night', callable: true, blip: 'raccoon-chitter', haunt: 'north-woods', entrance: 'drain' },
  { id: 'choir', name: 'The Bethesda Choir', short: 'Choir', species: 'pigeon', boss: 'vibrato', regulars: ['bella', 'lou', 'encore'], talents: ['voice'], flock: 12, count: 20, thread: 'sign', recruit: 'den-choir', awake: 'any', callable: false, blip: 'coo', haunt: 'bethesda', entrance: 'swoop' },
  { id: 'racers', name: 'The Reservoir Racers', short: 'Racers', species: 'pigeon', boss: 'wingate', regulars: ['sprint', 'lapcount', 'wheezy'], talents: ['draft'], flock: 10, count: 20, thread: 'spikes', recruit: 'den-racers', awake: 'any', callable: false, blip: 'coo', haunt: 'reservoir-track', entrance: 'swoop' },
  { id: 'rats', name: 'The Grate Rats', short: 'Rats', species: 'rat', boss: 'sue', regulars: ['express', 'pinstripe', 'crumbsy'], talents: ['travel', 'gratefetch'], count: 40, thread: 'slice', recruit: 'den-rats', awake: 'any', callable: true, blip: 'rat-squeak', haunt: 'columbus-grate', entrance: 'grate' },
  { id: 'rhoda', name: "Rhoda's Family", short: 'Hawks', species: 'hawk', boss: 'rhoda', regulars: ['rex', 'pip'], talents: ['lift'], count: 3, thread: 'feuds', recruit: 'den-rhoda', awake: 'day', callable: true, blip: 'hawk-screech', haunt: 'fifth-74', entrance: 'dive' },
  { id: 'meermob', name: 'The Meer Mob', short: 'Meer Mob', species: 'pigeon', boss: 'bigsal', regulars: ['knuckles', 'tiny', 'feathers'], talents: ['muscle'], flock: 14, count: 20, thread: 'feuds', recruit: 'den-meermob', awake: 'any', callable: true, blip: 'coo', haunt: 'meer', entrance: 'swoop' },
  { id: 'cats', name: 'The Bodega Cats', short: 'Cats', species: 'cat', boss: 'queenie', regulars: ['pickles', 'tux', 'whiskerton'], talents: ['knock'], count: 30, thread: 'slice', recruit: 'den-cats', awake: 'any', callable: true, blip: 'cat-meow', haunt: 'bodega-110', entrance: 'slink' },
  { id: 'horses', name: 'The Carriage Horses', short: 'Horses', species: 'horse', boss: 'clementine', regulars: ['duke', 'dapple', 'bigben'], talents: ['kick', 'pull'], count: 14, thread: 'spikes', recruit: 'den-horses', awake: 'day', callable: true, blip: 'horse-whinny', haunt: 'cps-carriage-line', entrance: 'road' },
  { id: 'songbirds', name: 'The Racket', short: 'Songbirds', species: 'songbird', boss: 'mimi', regulars: ['jay', 'ruby', 'chip'], talents: ['mimic'], count: 150, thread: 'spikes', recruit: 'den-songbirds', awake: 'day', callable: true, blip: 'songbird-chatter', haunt: 'museum-79', entrance: 'flutter' },
  { id: 'geese', name: 'The Honk', short: 'Geese', species: 'goose', boss: 'gertrude', regulars: ['gander', 'stilts', 'nightcap'], talents: ['bully'], count: 48, thread: 'feuds', recruit: 'den-geese', awake: 'day', callable: true, blip: 'goose-honk', haunt: 'great-lawn', entrance: 'waddle' },
];
export const CREW = Object.fromEntries(CREWS.map((c) => [c.id, c]));
export const CREW_COUNT = CREWS.length;   // 17
export const STRAYS = 40;
export const MAX_FLOCK = 82;              // 6 + 12 + 10 + 14 + 40

/** Why an ally can't come right now, or null. */
export function awakeReason(crewId, phase) {
  const c = CREW[crewId];
  if (!c) return 'Unknown';
  if (phaseList(c.awake).includes(phase)) return null;
  if (c.awake === 'day') return c.species === 'horse' ? 'Back in the stable until Morning' : 'Sleeps until Morning';
  if (c.awake === 'dusk-night') return 'Raccoons sleep until Dusk';
  if (c.awake === 'night') return 'Sleeps until Night';
  return 'Not now';
}

// ------------------------------------------------------------------ feuds (until their truce)
// A feud only stops an ally coming to certain places. The wheel says why.
export const FEUDS = [
  { id: 'dogs-squirrels', crew: 'squirrels', places: ['cedar-hill', 'great-lawn'], until: 'truce-dogs-squirrels', why: 'Not with THEM around' },
  { id: 'cats-rats', crew: 'rats', places: ['grate-110'], until: 'truce-cats-rats', why: "Cats' block. No way, pal." },
  { id: 'geese-ducks', crew: 'ducks', places: ['bow-bridge'], until: 'den-geese', why: 'Geese turf, Gus. GEESE.' },
];

// ------------------------------------------------------------------ named characters
// role: boss | regular | human. at: haunt position. out: phases they're around.
export const CHARACTERS = {
  // Plaza Swells
  duchess: { name: 'Duchess Pidgeley', crew: 'swells', role: 'boss', bio: 'Runs the Plaza. Judges every feeding frenzy.', at: { x: 97.0, z: -34.95, on: 'roof' }, out: 'any', voice: 'duchess' },
  monty: { name: 'Monty', crew: 'swells', role: 'regular', bio: 'Monocle, gossip, more gossip.', at: { x: 99.37, z: -35.54, on: 'roof' }, out: 'any' },
  bunting: { name: 'Lady Bunting', crew: 'swells', role: 'regular', bio: 'Opera gloves. Never eats off the ground.', at: { x: 94.47, z: -35.63, on: 'roof' }, out: 'any' },
  tuppence: { name: 'Tuppence', crew: 'swells', role: 'regular', bio: 'The youngest. Hates hats.', at: { x: 101.14, z: -37.1, on: 'roof' }, out: 'any' },
  dove: { name: 'Dove', crew: 'swells', role: 'regular', bio: 'Pure white. Everyone assumes she is a dove.', at: { x: 92.72, z: -37.32, on: 'roof' }, out: 'any', voice: 'dove' },
  // Acorn Syndicate
  hazel: { name: 'Hazel', crew: 'squirrels', role: 'boss', bio: 'Boss of the Syndicate. Forgets where she put things.', at: { x: -45, z: 160 }, out: 'day', voice: 'hazel' },
  nutmeg: { name: 'Nutmeg', crew: 'squirrels', role: 'regular', bio: 'The accountant. Counts everything.', at: { x: -34, z: 282 }, out: 'day' },
  twitch: { name: 'Twitch', crew: 'squirrels', role: 'regular', bio: 'Too fast to finish sentences.', at: { x: -60, z: 172 }, out: 'day' },
  pecan: { name: 'Old Pecan', crew: 'squirrels', role: 'regular', bio: 'Remembers caches from 1974.', at: { x: -44, z: 291 }, out: 'day' },
  // Lake Mallards
  puddles: { name: 'Commodore Puddles', crew: 'ducks', role: 'boss', bio: 'Commands the Lake. Will not eat bread.', at: { x: -20, z: 300.9, on: 'water:lake' }, out: 'day', voice: 'puddles' },
  mrspuddles: { name: 'Mrs. Puddles', crew: 'ducks', role: 'regular', bio: 'The real boss.', at: { x: -16, z: 305, on: 'water:lake' }, out: 'day' },
  bubbles: { name: 'Bubbles', crew: 'ducks', role: 'regular', bio: 'Dives for fun. Shows off every time.', at: { x: -26, z: 306, on: 'water:lake' }, out: 'day' },
  ensign: { name: 'Ensign Drake', crew: 'ducks', role: 'regular', bio: 'Salutes everything.', at: { x: -12, z: 300, on: 'water:lake' }, out: 'day' },
  // Ramble Exchange
  vesper: { name: 'Vesper', crew: 'crows', role: 'boss', bio: 'Runs the Lost & Found market from the big oak.', at: { x: -10, z: 365 }, out: 'day', voice: 'vesper' },
  ledger: { name: 'Ledger', crew: 'crows', role: 'regular', bio: 'Keeps the trade book. A snob about knitwear.', at: { x: -7, z: 363 }, out: 'day' },
  glint: { name: 'Glint', crew: 'crows', role: 'regular', bio: 'Collects only blue things.', at: { x: -14, z: 368 }, out: 'day' },
  cawdry: { name: 'Cawdry', crew: 'crows', role: 'regular', bio: 'The lookout.', at: { x: -4, z: 371 }, out: 'day' },
  flicker: { name: 'Flicker', crew: 'crows', role: 'regular', bio: 'Hoards film canisters. Wants a portrait.', at: { x: 8, z: 392 }, out: 'any' },   // photo mode (#9): Say Cheese; out in every phase, on no recorded route
  // Turtle Elders
  eldest: { name: 'The Eldest', crew: 'turtles', role: 'boss', bio: 'Older than the park. Seals every truce.', at: { x: 8.8, z: 432.6, on: 'roof' }, out: 'any', voice: 'eldest' },
  moss: { name: 'Moss', crew: 'turtles', role: 'regular', bio: 'Mostly asleep.', at: { x: 7.6, z: 433.4, on: 'roof' }, out: 'any' },
  shelly: { name: 'Shelly', crew: 'turtles', role: 'regular', bio: "Knows all the park's gossip.", at: { x: 10, z: 431.8, on: 'roof' }, out: 'any' },
  slowpoke: { name: 'Slowpoke', crew: 'turtles', role: 'regular', bio: 'Always arriving.', at: { x: 12.8, z: 422.6, shore: true }, out: 'any' },   // batch-3 (#1): on the bank (was 4 m out in the pond, on its bed)
  // Cedar Hill Pack
  biscuit: { name: 'Biscuit', crew: 'biscuit', role: 'boss', bio: 'A huge fluffy off-leash dog. Lost his ball.', at: { x: 44, z: 380 }, out: 'day', voice: 'biscuit' },
  pretzel: { name: 'Pretzel', crew: 'biscuit', role: 'regular', bio: 'A dachshund. First to chase anything.', at: { x: 48, z: 377 }, out: 'day' },
  fifi: { name: 'Fifi', crew: 'biscuit', role: 'regular', bio: 'A poodle with standards.', at: { x: 40, z: 384 }, out: 'day' },
  moose: { name: 'Moose', crew: 'biscuit', role: 'regular', bio: 'A sleepy mastiff.', at: { x: 50, z: 384 }, out: 'day' },
  // Strix's parliament
  strix: { name: 'Professor Strix', crew: 'strix', role: 'boss', bio: 'Flew out of the zoo years ago. Lost her spectacles.', at: { x: -44, z: 391.4, y: 4.5 }, out: 'night', voice: 'strix' },
  hoot: { name: 'Hoot', crew: 'strix', role: 'regular', bio: 'An owlet who asks riddles.', at: { x: -42.2, z: 393, y: 4.2 }, out: 'night' },
  nanny: { name: 'Nanny', crew: 'strix', role: 'regular', bio: 'An owlet who asks harder riddles.', at: { x: -46, z: 393.2, y: 4.2 }, out: 'night' },
  // Night Crew
  rigby: { name: 'Rigby', crew: 'raccoons', role: 'boss', bio: 'The Night Crew\'s mechanic. Needs a wrench.', at: { x: -33, z: 930 }, out: 'dusk-night', voice: 'rigby' },
  socket: { name: 'Socket', crew: 'raccoons', role: 'regular', bio: 'The welder.', at: { x: -29, z: 934 }, out: 'dusk-night' },
  ringo: { name: 'Ringo', crew: 'raccoons', role: 'regular', bio: 'The driver. Wants to race.', at: { x: -37, z: 927 }, out: 'dusk-night' },
  mamamask: { name: 'Mama Mask', crew: 'raccoons', role: 'regular', bio: 'Runs the drain kitchen. Strict about union rules.', at: { x: -32, z: 927.3 }, out: 'dusk-night' },   // batch-3 (#1): on the Loch's bank (was in it)
  // Bethesda Choir
  vibrato: { name: 'Maestro Vibrato', crew: 'choir', role: 'boss', bio: 'Conducts the Choir. Needs an audience that stays.', at: { x: 6.6, z: 279, on: 'ground' }, out: 'any', voice: 'vibrato' },
  bella: { name: 'Soprano Bella', crew: 'choir', role: 'regular', bio: 'Hits the high coo.', at: { x: 9, z: 277, on: 'ground' }, out: 'any' },
  lou: { name: 'Basso Lou', crew: 'choir', role: 'regular', bio: 'Hits the low coo.', at: { x: 4, z: 277, on: 'ground' }, out: 'any' },
  encore: { name: 'Encore', crew: 'choir', role: 'regular', bio: 'Always wants one more song.', at: { x: 8, z: 282, on: 'ground' }, out: 'any' },
  // Reservoir Racers
  wingate: { name: 'Coach Wingate', crew: 'racers', role: 'boss', bio: 'No roost, no training.', at: { x: 4, z: 563, on: 'roof' }, out: 'any', voice: 'wingate' },
  sprint: { name: 'Sprint', crew: 'racers', role: 'regular', bio: 'Fastest in the park, says Sprint.', at: { x: 7, z: 562, on: 'roof' }, out: 'any' },
  lapcount: { name: 'Lapcount', crew: 'racers', role: 'regular', bio: 'Holds the stopwatch.', at: { x: 1, z: 562, on: 'roof' }, out: 'any' },
  wheezy: { name: 'Wheezy', crew: 'racers', role: 'regular', bio: 'Never finishes a lap.', at: { x: -3, z: 563, on: 'roof' }, out: 'any' },
  // Grate Rats
  sue: { name: 'Subway Sue', crew: 'rats', role: 'boss', bio: 'Runs the grates. Wants a whole hot slice.', at: { x: -99, z: -17 }, out: 'any', voice: 'sue' },
  express: { name: 'Express', crew: 'rats', role: 'regular', bio: 'The fast-travel conductor.', at: { x: -127, z: 260.6 }, out: 'any' },
  pinstripe: { name: 'Pinstripe', crew: 'rats', role: 'regular', bio: 'A rat in a tiny tie.', at: { x: 103, z: -17 }, out: 'any' },
  crumbsy: { name: 'Crumbsy', crew: 'rats', role: 'regular', bio: 'Slice-crust connoisseur.', at: { x: -155, z: -19.5 }, out: 'any' },
  // Rhoda's family
  rhoda: { name: 'Rhoda', crew: 'rhoda', role: 'boss', bio: 'The Fifth Avenue hawk. Raids the Meer.', at: { x: 72, z: 1000, y: 14 }, out: 'day', voice: 'rhoda' },
  rex: { name: 'Rex', crew: 'rhoda', role: 'regular', bio: 'Her mate. A show-off.', at: { x: 132, z: 316, on: 'roof' }, out: 'day' },
  pip: { name: 'Pip', crew: 'rhoda', role: 'regular', bio: 'A nervous fledgling learning to dive.', at: { x: 132, z: 322, on: 'roof' }, out: 'day' },
  // Meer Mob
  bigsal: { name: 'Big Sal', crew: 'meermob', role: 'boss', bio: 'Runs the Meer. Show him your crew.', at: { x: -79, z: 1027 }, out: 'any', voice: 'bigsal' },
  knuckles: { name: 'Knuckles', crew: 'meermob', role: 'regular', bio: 'Tough. Bandana on his head.', at: { x: -76, z: 1029 }, out: 'any' },
  tiny: { name: 'Tiny', crew: 'meermob', role: 'regular', bio: 'Huge.', at: { x: -82.4, z: 1027.4 }, out: 'any' },   // batch-3: out of the Blockhouse's wall
  feathers: { name: 'Sister Feathers', crew: 'meermob', role: 'regular', bio: 'The brains. Counts heads.', at: { x: -80, z: 1023 }, out: 'any' },
  // Bodega Cats
  queenie: { name: 'Queenie', crew: 'cats', role: 'boss', bio: 'A regal tabby. Wants a hot anchovy slice.', at: { x: 61, z: 1066.3 }, out: 'any', voice: 'queenie' },
  pickles: { name: 'Pickles', crew: 'cats', role: 'regular', bio: 'Sleeps on the bread at the CPW & 72nd bodega.', at: { x: -129.5, z: 247.2 }, out: 'any' },
  tux: { name: 'Tux', crew: 'cats', role: 'regular', bio: "Walter's lobby cat. Very posh.", at: { x: 129.3, z: 321 }, out: 'any' },
  whiskerton: { name: 'Mrs. Whiskerton', crew: 'cats', role: 'regular', bio: 'Ancient. Has seen every mayor.', at: { x: 30, z: 1069.5 }, out: 'any' },
  // Carriage Horses
  clementine: { name: 'Clementine', crew: 'horses', role: 'boss', bio: 'An old grey carriage mare.', at: { x: -12, z: -6.5, yaw: 1.57 }, out: 'day', voice: 'clementine' },
  duke: { name: 'Duke', crew: 'horses', role: 'regular', bio: 'The mounted-unit horse. By the book.', at: { x: -60, z: 60, yaw: 0.6 }, out: 'day' },
  dapple: { name: 'Dapple', crew: 'horses', role: 'regular', bio: 'Young. Dreams of seeing the Ramble.', at: { x: -24, z: -6.5, yaw: 1.57 }, out: 'day' },
  bigben: { name: 'Big Ben', crew: 'horses', role: 'regular', bio: 'A gentle giant. Only says "Hup."', at: { x: 0, z: -6.5, yaw: 1.57 }, out: 'day' },
  // The Racket
  mimi: { name: 'Mimi', crew: 'songbirds', role: 'boss', bio: 'A starling impressionist. Wants a new sound.', at: { x: -126, z: 409 }, out: 'day', voice: 'mimi' },
  jay: { name: 'Jay', crew: 'songbirds', role: 'regular', bio: 'A loud blue jay who heckles the crows.', at: { x: -2, z: 352 }, out: 'day' },
  ruby: { name: 'Ruby', crew: 'songbirds', role: 'regular', bio: 'A cardinal who quotes Shakespeare.', at: { x: -36, z: 415 }, out: 'day' },
  chip: { name: 'Chip', crew: 'songbirds', role: 'regular', bio: "A house sparrow who works the slice joints' tables.", at: { x: -141, z: -18 }, out: 'day' },
  // The Honk
  gertrude: { name: 'Gertrude', crew: 'geese', role: 'boss', bio: 'A Canada goose. LOUD.', at: { x: -33, z: 316, on: 'water:lake' }, out: 'day', voice: 'gertrude' },
  gander: { name: 'Lieutenant Gander', crew: 'geese', role: 'regular', bio: 'Her enforcer.', at: { x: -37, z: 318, on: 'water:lake' }, out: 'day' },
  stilts: { name: 'Stilts', crew: 'geese', role: 'regular', bio: 'A great blue heron. Very Zen.', at: { x: -64.9, z: 860.1, shore: true }, out: 'day' },   // batch-3 (#1): wading at the Pool's edge (was under it)
  nightcap: { name: 'Nightcap', crew: 'geese', role: 'regular', bio: 'A black-crowned night heron.', at: { x: -70.5, z: 317.9, shore: true }, out: 'dusk' },   // batch-3 (#1): at the Lake's edge (was 15 m out, under it)
  // humans with names
  walter: { name: 'Walter', role: 'human', bio: 'The Fifth Avenue doorman. Takes hot slices.', at: { x: 129, z: 318.6 }, out: 'any' },
  prickett: { name: 'Del Prickett', role: 'human', bio: 'Prickett Pest-Pro. Cheerful, relentless, on contract.', at: { x: 88, z: -14 }, out: 'any' },
  vinnie: { name: 'Vinnie', role: 'human', bio: 'The hot dog man on the Mall.', at: { x: 10, z: 205 }, out: 'day' },
  dolores: { name: 'Dolores', role: 'human', bio: 'The Pigeon Lady. Feeds pigeons whatever the signs say.', at: { x: 1.4, z: 214 }, out: 'morning' },
  ranger: { name: 'The ranger', role: 'human', bio: 'Keeps the signs straight.', at: { x: 22, z: 104 }, out: 'day' },
  gus: { name: 'Gus', role: 'player', bio: 'A scruffy Central Park pigeon with a plan.', out: 'any' },
};
for (const [id, c] of Object.entries(CHARACTERS)) { c.id = id; c.portrait = id; }
CHARACTERS.ranger.portrait = 'ranger';

// ------------------------------------------------------------------ crowds: where everyone lives
// kind: lawn (ground in a circle), water (on a water body), pavement (city
// sidewalk), roof (on the roofs under the circle), trees (ground under the
// woods), line (along a line a→b). n animals each.
export const CROWD_HAUNTS = {
  squirrels: [
    { kind: 'lawn', x: -50, z: 165, r: 32, n: 26 }, { kind: 'lawn', x: -40, z: 286, r: 14, n: 18 }, { kind: 'lawn', x: -6.6, z: 489, r: 36, n: 22 },
    { kind: 'lawn', x: 44, z: 380, r: 20, n: 8 }, { kind: 'trees', x: -18, z: 360, r: 40, n: 14 }, { kind: 'lawn', x: -10, z: 80, r: 50, n: 12 },
    { kind: 'lawn', x: 0, z: 835, r: 45, n: 10 }, { kind: 'trees', x: -30, z: 930, r: 40, n: 10 },
  ],
  ducks: [
    { kind: 'water', water: 'pond', x: 60, z: 30, r: 30, n: 10 }, { kind: 'water', water: 'lake', x: -20, z: 310, r: 50, n: 22 },
    { kind: 'water', water: 'turtle', x: 8, z: 430, r: 20, n: 6 }, { kind: 'water', water: 'pool', x: -72, z: 870, r: 15, n: 6 },
    { kind: 'water', water: 'meer', x: 64, z: 1000, r: 30, n: 10 }, { kind: 'water', water: 'reservoir', x: 0, z: 662, r: 70, n: 6 },
  ],
  crows: [{ kind: 'trees', x: -18, z: 362, r: 42, n: 38 }, { kind: 'roof', x: -150, z: 330, r: 40, n: 6 }, { kind: 'roof', x: 150, z: 420, r: 40, n: 6 }],
  raccoons: [{ kind: 'trees', x: -33, z: 930, r: 45, n: 17 }, { kind: 'trees', x: -18, z: 362, r: 35, n: 8 }],
  rats: [
    { kind: 'pavement', x: -100, z: -18, r: 6, n: 7 }, { kind: 'pavement', x: -152, z: -22, r: 5, n: 5 }, { kind: 'pavement', x: 104, z: -18, r: 6, n: 5 },
    { kind: 'pavement', x: -128, z: 259.6, r: 5, n: 5 }, { kind: 'pavement', x: 128, z: 377, r: 5, n: 4 }, { kind: 'pavement', x: -128, z: 548, r: 5, n: 4 },
    { kind: 'pavement', x: 128, z: 768.4, r: 5, n: 4 }, { kind: 'pavement', x: 46, z: 1068.6, r: 6, n: 6 },
  ],
  turtles: [{ kind: 'roof', x: 8.8, z: 432.6, r: 2, n: 12 }, { kind: 'water', water: 'turtle', x: 8, z: 430, r: 14, n: 4 }, { kind: 'water', water: 'lake', x: -40, z: 330, r: 20, n: 4 }],
  swells: [{ kind: 'ring', x: 97, z: -40, rMin: 6, rMax: 10.5, n: 20 }],
  choir: [{ kind: 'lawn', x: 6.6, z: 270, r: 10, n: 20 }],
  racers: [{ kind: 'line', a: { x: -40, z: 563 }, b: { x: 40, z: 563 }, n: 20 }],   // batch-3 (#1): z 572 ran through the Reservoir
  meermob: [{ kind: 'lawn', x: -76, z: 1024, r: 12, n: 10 }, { kind: 'lawn', x: 64, z: 958, r: 12, n: 10 }],
  dogs: [{ kind: 'lawn', x: 44, z: 380, r: 18, n: 9 }, { kind: 'line', a: { x: 70, z: 320 }, b: { x: 72, z: 440 }, n: 8 }],
  owls: [{ kind: 'trees', x: -44, z: 391, r: 15, n: 1, y: 4 }],
  hawks: [{ kind: 'roof', x: 150, z: 319, r: 6, n: 1 }],
  cats: [
    { kind: 'pavement', x: 61, z: 1068, r: 8, n: 8 }, { kind: 'pavement', x: -129, z: 247, r: 6, n: 6 }, { kind: 'pavement', x: 30, z: 1069, r: 16, n: 6 },
    { kind: 'pavement', x: 129, z: 319, r: 4, n: 2 }, { kind: 'pavement', x: -131, z: 257, r: 5, n: 4 }, { kind: 'trees', x: -18, z: 362, r: 40, n: 4, night: true },
  ],
  horses: [{ kind: 'line', a: { x: -70, z: -6.5 }, b: { x: 60, z: -6.5 }, n: 12, yaw: 1.57 }, { kind: 'line', a: { x: -62, z: 40 }, b: { x: -55, z: 120 }, n: 2 }],
  songbirds: [
    { kind: 'lawn', x: -50, z: 165, r: 35, n: 22 }, { kind: 'lawn', x: 6.6, z: 200, r: 30, n: 16 }, { kind: 'trees', x: -18, z: 362, r: 40, n: 30 },
    { kind: 'pavement', x: -143, z: -18, r: 8, n: 10 }, { kind: 'roof', x: -150, z: 412, r: 18, n: 24 }, { kind: 'lawn', x: -6.6, z: 489, r: 36, n: 18 },
    { kind: 'lawn', x: 60, z: 30, r: 40, n: 14 }, { kind: 'pavement', x: -129, z: 257, r: 8, n: 8 }, { kind: 'lawn', x: 0, z: 835, r: 40, n: 8 },
  ],
  geese: [
    { kind: 'water', water: 'lake', x: -35, z: 318, r: 25, n: 10 }, { kind: 'lawn', x: -6.6, z: 489, r: 36, n: 14 },
    { kind: 'water', water: 'reservoir', x: 0, z: 662, r: 70, n: 8 }, { kind: 'water', water: 'meer', x: 64, z: 1000, r: 25, n: 8 },
  ],
  // batch-3 (#1): on the shore (they stood in the Pool and the Lake)
  herons: [{ kind: 'lawn', x: -65.3, z: 858, r: 3, n: 1 }, { kind: 'lawn', x: -46, z: 349, r: 3, n: 1 }, { kind: 'lawn', x: -78.5, z: 351.7, r: 6, n: 6, night: true }],
};

// ------------------------------------------------------------------ lines
// Wrong-place lines (2 per crew) and ambient barks (wary before, friendly after).
export const WRONG_PLACE = {
  squirrels: ['Hazel digs... it\'s WET, Gus.', 'Nothing buried here. I\'d remember. Probably.'],
  ducks: ['Puddles dives... a bottle cap. Not ours.', 'Nothing down there but weeds, Gus.'],
  crows: ['Vesper looks around. "Nobody to trade with, kid."', '"No deal here. Come back with a customer."'],
  biscuit: ['Biscuit sniffs everything. Twice. "Nothing to fetch!"', '"I\'m a DOG, Gus. I don\'t do deep."'],
  strix: ['Strix blinks. "Nothing hidden here. I would SEE it."', '"Even my eyes need something to look at, dear."'],
  raccoons: ['Rigby taps his wrench. "Nothing to rig, boss."', '"No wheels, no latch, no job."'],
  rats: ['Sue sniffs the kerb. "No grate, no game."', '"We\'re GRATE rats, Gus. Find me a grate."'],
  rhoda: ['Rhoda circles once. "Nothing worth lifting."', '"Call me when it\'s HEAVY."'],
  meermob: ['Big Sal cracks his neck. "Nothing to haul here, kid."', '"The Mob don\'t lift air."'],
  cats: ['Queenie looks up. "Nothing up there to knock down. Tragic."', '"Bring me an edge, darling. A LEDGE."'],
  horses: ['"I\'m a HORSE, Gus. I don\'t do stairs."', 'Clementine snorts. "Nothing stuck here, kid."'],
  songbirds: ['Mimi trills. "Nobody here to fool, sweetie."', '"No audience, no act."'],
  geese: ['Gertrude honks at nothing. Satisfying, but no.', '"NOBODY here to chase! Disappointing!"'],
};
export const BARKS = {
  wary: {
    squirrels: ['That\'s HIM. The pigeon.', 'Don\'t look at my acorn.'], ducks: ['Bread-pusher.', 'Paddle away, pigeon.'],
    crows: ['Caw. Move along.', 'We see you, pigeon.'], pigeon: ['Who invited HIM?', 'Coo... no.'], swells: ['Members only, darling.', 'Is that a STREET pigeon?'],
    cats: ['Hssst.', 'Mine.'], geese: ['HONK. Off the lawn.', 'HONK.'], songbirds: ['Tweet. Pigeon.', 'Chirp! Shoo!'],
    rats: ['Squeak. Not our guy.', 'No crumbs, no chat.'], dogs: ['Woof?', 'Squirrel? No. Pigeon.'], horses: ['Hrrm.', 'Mind the hooves.'],
    raccoons: ['Union members only.', 'Psst. Scram.'], turtles: ['...', 'Mm.'],
  },
  friendly: {
    squirrels: ['Gus! Hey Gus!', 'That\'s HIM! Our pigeon!'], ducks: ['Quack-quack, Commodore\'s friend!', 'Ahoy, Gus!'],
    crows: ['Caw! Good doing business.', 'The pigeon! Respect.'], pigeon: ['Coo! It\'s Gus!', 'FEED the birds!'], swells: ['Gus, darling!', 'Simply divine to see you.'],
    cats: ['Mrrp. Hello, pigeon.', 'Purr.'], geese: ['HONK! (friendly)', 'HONK honk!'], songbirds: ['Coo! (tweet)', 'Chirp-coo!'],
    rats: ['Gus! Big fan!', 'Got any crusts?'], dogs: ['Woof! Gus!', 'Friend! FRIEND!'], horses: ['Mornin\', kid.', 'Hup.'],
    raccoons: ['Boss pigeon!', 'Union\'s with you.'], turtles: ['Mm. Good bird.', 'Hello... Gus...'],
  },
};

// batch-2 (#14): a gang's greeting, said once (state flag seen.greet.<group>) the first time Gus comes within r of its
// haunt: two bubbles over two crowd members, one after the other, in the gang's voice (crowds.js). Not a scene:
// nothing waits on it. The gang's barks (BARKS swells) are in the same voice.
export const GREETS = {
  swells: {
    at: { x: 97, z: -40 }, r: 16,
    friendly: ['Gus, darling! Welcome to the Plaza.', 'Do mind the hats. They\'re vintage.'],
    wary: ['Ahem. The Plaza Swells, darling.', 'We do NOT eat off the ground.'],
  },
};

// ------------------------------------------------------------------ milestone 3a: talents at clues, takers
// Which clue types each talent works on (layout.js CLUES, BLOCKERS, TRADES and huge items).
export const TALENT_CLUES = {
  dig: ['dig'], dive: ['dive'], gratefetch: ['grate'], knock: ['teeter'], kick: ['stuck'], rig: ['rig', 'net', 'stuck-latch'], sabotage: ['rig'],
  lift: ['net', 'haul'], fetch: ['haul'], muscle: ['haul'], pull: ['haul'], nighteyes: ['nighteyes'], trade: ['trade'], mimic: ['blocker'], bully: ['blocker'],
};
// The ally's action pose and how they get to the spot.
export const TALENT_ACT = {
  dig: { pose: 'dig', move: 'hop', secs: 2.2, sound: 'dig' }, dive: { pose: 'dive', move: 'swim', secs: 2.0, sound: 'duck-dive-bloop' },
  gratefetch: { pose: 'sniff', move: 'walk', secs: 2.0, sound: 'grate-whoosh' }, knock: { pose: 'knock', move: 'slink', secs: 2.6, sound: 'knock-clatter' },
  kick: { pose: 'kick', move: 'road', secs: 1.6, sound: 'horse-kick-bang' }, rig: { pose: 'rig', move: 'walk', secs: 3.0, sound: 'rig-start' },
  sabotage: { pose: 'rig', move: 'walk', secs: 3.0, sound: 'spark-plug-pop' }, lift: { pose: 'lift', move: 'fly', secs: 2.0, sound: 'hawk-screech' },
  fetch: { pose: 'sniff', move: 'bound', secs: 1.2, sound: 'dog-happy-bark' }, muscle: { pose: 'lift', move: 'fly', secs: 1.6, sound: 'flock-swarm' },
  pull: { pose: 'kick', move: 'road', secs: 1.2, sound: 'horse-whinny' }, nighteyes: { pose: 'sing', move: 'fly', secs: 2.0, sound: 'owl-hoot' },
  trade: { pose: 'cheer', move: 'fly', secs: 1.6, sound: 'trade-ka-ching' }, mimic: { pose: 'sing', move: 'flutter', secs: 2.4, sound: null },
  bully: { pose: 'hiss', move: 'waddle', secs: 1.8, sound: 'goose-hiss' },
};
// Who takes what when Gus Pecks them carrying it ("Pizza slices": the takers). Named characters
// and humans (by role). hot: only hot slices. flags: what giving it sets (a world effect).
// keep: the taker refuses and Gus keeps the item (a joke, not a use).
export const TAKERS = {
  sue: [{ wants: 'slice', hot: true, cold: "It's COLD, pal. Down here we got standards." }],
  queenie: [{ wants: 'slice-anchovy', hot: true, cold: 'Cold? How DARE you.' }, { wants: 'slice', keep: 'Anchovy, darling. From CPW and 72nd. I said ANCHOVY.' }],
  puddles: [{ wants: 'peas' }, { wants: 'slice', keep: 'Pizza? Do you KNOW what cheese does to a duck?' }],
  vesper: [{ wants: 'shiny', line: 'Vesper turns it in the light. "Acceptable."' }],
  rigby: [{ wants: 'wrench' }, { wants: 'slice', any: true, flags: ['union.paid'], line: 'Mama Mask takes it. "Union rules. NOW we work."' }],
  strix: [{ wants: 'spectacles' }],
  bigsal: [{ wants: 'slice', any: true, line: 'Big Sal takes it. "That\'s one."' }],
  ledger: [{ wants: 'falafel', any: true, line: "Crows can't resist a falafel. It's documented." }],
  clementine: [{ wants: 'slice', keep: "I'm a herbivore, kid. And that's pepperoni." }],
  duke: [{ wants: 'slice', keep: "I'm a herbivore, kid. And that's pepperoni." }],
  'human:guard': [{ wants: 'slice', hot: true, flags: ['delacorte.backstage'], cold: 'Cold? Nah, I\'m good.', line: 'The guard waves you backstage. "Go on, little guy."' }],
  'human:walter': [{ wants: 'slice', hot: true, flags: ['walter.doorOpen'], cold: "It's COLD, pal.", line: 'Walter props the service door with his foot and eats. "Them? Fine. They tip better than the residents."' }],
  'human:vinnie': [{ wants: 'slice', any: true, phase: 'afternoon', flags: ['vinnie.fedup'], line: '"PIZZA? At MY cart?!" Vinnie has had it.' }],
};
