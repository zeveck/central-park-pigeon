// DATA: "Who wears what". Every named character's model, coat or morph layer,
// scale and code accessories, read off their character cards. Accessories are
// small code meshes parented to the head, neck or body point of the species
// model (entities/accessories.js builds them). Crowd members of a gang wear a
// simpler version (crowdHat).
//
// layer: index into the model's morph array (textures/morphs/manifest.json;
// pigeons 0 blue bar … 8 pure white … 12 mealy; squirrels 0 grey, 1 cinnamon,
// 2 black, 3 near-white). tint: a multiply colour for one-texture models.
// neck (batch-2 #6): [dx, dy, dz, ring scale, collar tilt] in head units: moves the neck anchor (collars, tokens, pearls)
// where a model's neck isn't where entities/characters.js guesses it (62% of the way from the body centre to the head
// point); the tilt defaults to π/2.3 (π/2 lies flat). lift: raises head-top pieces (head units).

export const PIGEON_LAYERS = {
  'blue-bar': 0, 'blue-checker': 1, 'dark-checker': 2, melanistic: 3, 'mostly-white': 4, 'ash-red': 5, 'red-checker': 6,
  pied: 7, 'pure-white': 8, 'silver-dun': 9, grizzle: 10, 'brown-pied': 11, mealy: 12,
};
export const DOVE_LAYER = 8;
export const BLUE_BAR = 0;

// Gang morph mixes (weights per layer). Dove's pure white is never in a mix.
export const GANG_MIX = {
  swells: { 'mostly-white': 3, pied: 3, 'ash-red': 3, 'silver-dun': 3, 'blue-bar': 1 },
  choir: { 'blue-bar': 2, 'blue-checker': 2, 'dark-checker': 1, melanistic: 1, 'mostly-white': 1, 'ash-red': 1, 'red-checker': 2, pied: 1, 'silver-dun': 1, grizzle: 1, 'brown-pied': 1, mealy: 1 },
  racers: { 'ash-red': 3, grizzle: 3, 'brown-pied': 3, 'blue-checker': 2, 'dark-checker': 1 },
  meermob: { 'dark-checker': 4, melanistic: 4, mealy: 3, 'blue-bar': 1 },
  strays: { 'blue-bar': 6, 'blue-checker': 3, 'dark-checker': 2, melanistic: 1, 'mostly-white': 1, 'ash-red': 1, 'red-checker': 1, pied: 1, 'silver-dun': 1, grizzle: 1, 'brown-pied': 1, mealy: 1 },
};
// neck sheen hues (iridescence tints)
export const SHEENS = { 'teal-magenta': [0.18, 0.64, 0.6], 'green-purple': [0.35, 0.6, 0.3], 'bronze-pink': [0.75, 0.5, 0.45], faint: [0.85, 0.85, 0.85] };

// Species model table: full model, crowd LOD, pose models, real size (m), morph array.
export const SPECIES = {
  pigeon: { model: 'pigeon-plain', lod: 'pigeon-plain-lod', fly: 'pigeon-plain-fly', morphs: 'pigeon-plain', height: 0.32 },
  squirrel: { model: 'squirrel', lod: 'squirrel-lod', morphs: 'squirrel', height: 0.25 },
  duck: { model: 'duck', lod: 'duck-lod', height: 0.5, swims: true, variants: ['duck', 'duck-hen', 'duck-wood', 'duck-shoveler', 'duck-bufflehead'], rare: ['duck-white', 'duck-stranger'] },
  crow: { model: 'crow', lod: 'crow-lod', fly: 'crow-fly', height: 0.45 },
  raccoon: { model: 'raccoon-scurry', lod: 'raccoon-scurry-lod', stand: 'raccoon-stand', height: 0.6 },
  rat: { model: 'rat', lod: 'rat-lod', stand: 'rat-stand', height: 0.2 },
  turtle: { model: 'turtle', lod: 'turtle-lod', height: 0.18 },
  dog: { model: 'dog', lod: 'dog-lod', height: 1.38, variants: ['dog', 'dog-poodle', 'dog-dachshund'] },
  owl: { model: 'owl', fly: 'owl-fly', height: 0.55 },
  hawk: { model: 'hawk-perch', fly: 'hawk-fly', height: 0.55 },
  cat: { model: 'cat', sit: 'cat-sit', height: 0.5 },
  horse: { model: 'horse', height: 2.4 },
  songbird: { model: 'songbird', height: 0.15 },
  goose: { model: 'goose', lod: 'goose-lod', bully: 'goose-bully', height: 0.8, swims: true },
  heron: { model: 'heron', height: 1.1 },
};

// Songbird region tints (head, breast, back+wings) by kind.
export const SONGBIRD_TINTS = {
  sparrow: { head: [0.62, 0.48, 0.36], breast: [0.86, 0.8, 0.7], back: [0.56, 0.42, 0.3] },
  starling: { head: [0.16, 0.17, 0.2], breast: [0.2, 0.22, 0.26], back: [0.18, 0.2, 0.22] },
  robin: { head: [0.3, 0.29, 0.3], breast: [0.86, 0.42, 0.2], back: [0.42, 0.4, 0.38] },
  bluejay: { head: [0.36, 0.55, 0.85], breast: [0.9, 0.92, 0.95], back: [0.3, 0.5, 0.85] },
  cardinal: { head: [0.85, 0.12, 0.1], breast: [0.86, 0.16, 0.12], back: [0.75, 0.13, 0.1] },
  warbler: { head: [0.9, 0.82, 0.25], breast: [0.95, 0.85, 0.3], back: [0.55, 0.6, 0.3] },
};

export const LOOKS = {
  // Plaza Swells
  duchess: { species: 'pigeon', layer: 0, sheen: 'teal-magenta', acc: ['tophat-small', 'pearls'] },
  monty: { species: 'pigeon', layer: 5, sheen: 'bronze-pink', acc: ['tophat', 'monocle', 'pearls'] },
  bunting: { species: 'pigeon', layer: 9, sheen: 'faint', acc: ['fascinator', 'pearls', 'gloves'] },
  tuppence: { species: 'pigeon', layer: 7, sheen: 'teal-magenta', acc: ['tophat-big'] },
  dove: { species: 'pigeon', layer: 8, sheen: 'faint', acc: [] },
  // Bethesda Choir
  vibrato: { species: 'pigeon', layer: 0, tint: [0.85, 0.95, 1.25], sheen: 'teal-magenta', acc: ['beret:#c4302b', 'waistcoat:#222222', 'bowtie:#111111', 'baton'] },
  bella: { species: 'pigeon', layer: 1, sheen: 'teal-magenta', acc: ['beret:#b04a8e', 'plume', 'waistcoat:#8e1c2c', 'jabot'] },
  lou: { species: 'pigeon', layer: 3, sheen: 'green-purple', acc: ['beret:#3e6b3a', 'waistcoat:#efe3c8', 'bowtie:#222222'] },
  encore: { species: 'pigeon', layer: 6, sheen: 'bronze-pink', acc: ['beret:#d4a02a', 'waistcoat:#efe3c8', 'bowtie:#222222'] },
  // Reservoir Racers
  wingate: { species: 'pigeon', layer: 0, sheen: 'teal-magenta', acc: ['sweatband:#2fa39a', 'whistle'] },
  sprint: { species: 'pigeon', layer: 0, sheen: 'teal-magenta', acc: ['sweatband:#e07b39'] },
  lapcount: { species: 'pigeon', layer: 10, sheen: 'green-purple', acc: ['sweatband:#6a4c93', 'stopwatch', 'notepad'] },
  wheezy: { species: 'pigeon', layer: 11, sheen: 'bronze-pink', acc: ['sweatband:#2fa39a'] },
  // Meer Mob
  bigsal: { species: 'pigeon', layer: 0, sheen: 'green-purple', acc: ['bandana-neck:#c4302b'] },
  knuckles: { species: 'pigeon', layer: 2, sheen: 'green-purple', acc: ['bandana-head:#1d1d1d'] },
  tiny: { species: 'pigeon', layer: 4, scale: 1.35, sheen: 'faint', acc: ['bandana-neck:#c4302b'] },
  feathers: { species: 'pigeon', layer: 12, sheen: 'bronze-pink', acc: ['bandana-head:#2a5ab0', 'glasses-round'] },
  // Acorn Syndicate
  hazel: { species: 'squirrel', layer: 0, acc: [] },
  nutmeg: { species: 'squirrel', layer: 1, acc: ['glasses-round', 'pencil'] },
  twitch: { species: 'squirrel', layer: 2, acc: [] },
  pecan: { species: 'squirrel', layer: 3, acc: ['stick'] },
  // Lake Mallards
  puddles: { species: 'duck', model: 'duck', acc: ['cap-captain'] },
  mrspuddles: { species: 'duck', model: 'duck-hen', acc: ['pearls'] },
  bubbles: { species: 'duck', model: 'duck-bufflehead', acc: ['goggles:#3aa0d8'] },
  ensign: { species: 'duck', model: 'duck-wood', acc: ['cap-sailor'] },
  // Ramble Exchange
  vesper: { species: 'crow', acc: ['pendant'] },
  ledger: { species: 'crow', acc: ['spectacles', 'scarf-plaid', 'book'] },
  glint: { species: 'crow', acc: ['bottlecaps'] },
  cawdry: { species: 'crow', acc: ['spyglass', 'pendant'] },
  flicker: { species: 'crow', acc: ['canister'] },   // photo mode (#9): the film hoarder
  // Turtle Elders
  eldest: { species: 'turtle', tint: [0.75, 0.82, 0.55], acc: [] },
  moss: { species: 'turtle', tint: [0.55, 0.78, 0.4], acc: ['moss', 'mushroom'] },
  shelly: { species: 'turtle', tint: [0.6, 1.0, 0.55], acc: ['daisy'] },
  slowpoke: { species: 'turtle', tint: [0.95, 0.85, 0.75], acc: ['ear-stripe'] },
  // Night Crew
  rigby: { species: 'raccoon', model: 'raccoon-stand', acc: [] },
  socket: { species: 'raccoon', model: 'raccoon-stand', tint: [0.75, 0.75, 0.75], acc: ['goggles:#5a4a2a', 'apron:#6b4a2a', 'wrench'] },
  ringo: { species: 'raccoon', model: 'raccoon-stand', acc: ['aviator', 'scarf-long:#c4302b'] },
  mamamask: { species: 'raccoon', model: 'raccoon-stand', acc: ['headscarf:#c4302b', 'apron:#d8d0c0', 'spoon'] },
  // Grate Rats
  sue: { species: 'rat', model: 'rat-stand', neck: [-0.5, -1.4, 0.4, 1.3], acc: ['token'] },
  express: { species: 'rat', model: 'rat-stand', acc: ['cap-conductor', 'waistcoat:#3a3060', 'pocketwatch'] },
  pinstripe: { species: 'rat', model: 'rat-stand', tint: [0.85, 0.85, 0.9], acc: ['tie:#c4302b', 'waistcoat:#3a3a3a'] },
  crumbsy: { species: 'rat', model: 'rat-stand', acc: ['crust'] },
  // Cedar Hill Pack
  biscuit: { species: 'dog', model: 'dog', acc: ['collar:#c4302b'] },
  pretzel: { species: 'dog', model: 'dog-dachshund', acc: ['collar:#2a5ab0'] },
  fifi: { species: 'dog', model: 'dog-poodle', neck: [0.1, -1.8, 1.4, 1.7, Math.PI / 2], lift: 0.2, acc: ['bow:#e87aa8', 'collar:#e87aa8'] },
  moose: { species: 'dog', model: 'dog-mastiff', acc: ['collar:#c4302b'] },
  // Strix's parliament
  strix: { species: 'owl', acc: [] },
  hoot: { species: 'owl', model: 'owlet', acc: [] },
  nanny: { species: 'owl', model: 'owlet', acc: ['mortarboard'] },
  // Rhoda's family
  rhoda: { species: 'hawk', model: 'hawk-fly', acc: [] },
  rex: { species: 'hawk', tint: [1.12, 0.95, 0.85], acc: [] },
  pip: { species: 'hawk', scale: 0.75, tint: [1.15, 1.1, 1.05], acc: [] },
  // Bodega Cats
  queenie: { species: 'cat', model: 'cat-sit', tint: [0.9, 0.88, 0.85], acc: ['collar-bell'] },
  pickles: { species: 'cat', model: 'cat-sit', texture: 'cat-sit-pickles', tint: [1.3, 0.85, 0.5], acc: ['bread'] },   // fix-35: his own ginger coat (was a tint)
  tux: { species: 'cat', model: 'cat-sit', texture: 'cat-sit-tux', tint: [0.45, 0.45, 0.48], acc: ['bowtie:#d4a02a'] },   // fix-35: a real tuxedo coat
  whiskerton: { species: 'cat', model: 'cat-sit', tint: [0.95, 0.95, 1.0], acc: ['shawl', 'cushion'] },
  // Carriage Horses
  clementine: { species: 'horse', tint: [1.05, 1.05, 1.05], acc: ['plume:#c4302b'] },
  duke: { species: 'horse', texture: 'horse-duke', tint: [0.7, 0.5, 0.35], acc: ['saddle'] },   // fix-35: bay, black mane and legs
  dapple: { species: 'horse', tint: [1.0, 1.0, 1.02], acc: ['plume:#e8c23d'] },
  bigben: { species: 'horse', scale: 1.15, texture: 'horse-bigben', tint: [0.95, 0.6, 0.4], acc: ['plume:#2a5ab0'] },   // (fix-35: tints are only the fallback if a coat can't load)   // fix-35: bright chestnut, flaxen mane, blaze
  // The Racket
  mimi: { species: 'songbird', bird: 'starling', acc: [] },
  jay: { species: 'songbird', bird: 'bluejay', acc: ['crest:#3a70d0'] },
  ruby: { species: 'songbird', bird: 'cardinal', acc: ['crest:#d01a10', 'scroll'] },
  chip: { species: 'songbird', bird: 'sparrow', acc: ['crumb'] },
  // The Honk
  gertrude: { species: 'goose', acc: [] },
  gander: { species: 'goose', acc: ['cap-peaked'] },
  stilts: { species: 'heron', acc: [] },
  nightcap: { species: 'heron', model: 'night-heron', acc: ['head-plume'] },
  // humans
  walter: { species: 'human', model: 'human-walter', acc: ['cap-braid'] },
  prickett: { species: 'human', model: 'human-prickett', acc: ['spray-tank', 'wand', 'clipboard'] },
  vinnie: { species: 'human', model: 'human-vendor', acc: [] },
  dolores: { species: 'human', model: 'human-park', tint: [0.75, 0.6, 0.7], acc: ['shawl', 'felt-hat'] },
  ranger: { species: 'human', model: 'human-ranger', acc: [] },
};

// What a crowd member of a gang wears (a simpler version).
export const CROWD_HATS = { swells: 'tophat-small', choir: 'beret:#c4302b', racers: 'sweatband:#2fa39a', meermob: 'bandana-neck:#c4302b' };
