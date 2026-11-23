// Fix-23 ("puzzles must stay solvable"): where each one-time quest item comes back to. Every item a step needs that
// can only be had once (a clue that fires once, a trade, a dive) has a rule here. The item keeper (systems/schemes.js
// #keep) puts it back at `at` when the scheme is on one of `steps` (and `flag` is set: the item has been had) and the
// item is nowhere (not carried, not lying about): lost in water, eaten, taken by Ruffled, dropped and forgotten. An
// item left lying more than KEEP.awaySecs with Gus more than KEEP.awayR away, or out of reach (in water), floats back
// too. `dry`: the source is on the water, so the keeper uses the nearest dry ground. tools/check-schemes.mjs checks
// that every needed one-time item has a rule (slices, boxes, shinies and gear renew by themselves; huge items can't
// be carried off).
// Pure data (no imports): check-schemes reads it in node.

export const KEEP = { awaySecs: 90, awayR: 40 };

export const ITEM_SOURCES = [
  { item: 'peas', scheme: 'den-ducks', steps: [3], at: { x: 45.5, z: 292.5 }, label: 'the Boathouse picnic table' },
  { item: 'wrench', scheme: 'den-raccoons', steps: [3], at: { x: -41.6, z: 429.4 }, label: 'the Delacorte stage door' },
  { item: 'gate-key', scheme: 'sab-middle', steps: [1], flag: 'lot.keyDown', at: { x: 45, z: 309.4 }, label: 'the Boathouse lot booth' },
  { item: 'tennis-sack', scheme: 'truce-dogs-squirrels', steps: [3], at: { x: -42, z: 283 }, label: 'the squirrels\' pecan cache' },
  { item: 'ball', scheme: 'den-biscuit', steps: [3], at: { x: 23.5, z: 314 }, dry: true, label: 'the Lake shore by the Boathouse' },
  { item: 'spectacles', scheme: 'den-strix', steps: [2], at: { x: -12.6, z: 363.4 }, label: 'Ledger\'s stall at the Exchange' },
  { item: 'cufflink', scheme: 'gear-pen', steps: [2], at: { x: -99.6, z: 151.3 }, label: 'the Tavern patio' },
  { item: 'key', scheme: 'gear-headlamp', steps: [2], at: { x: -127.2, z: 548.6 }, label: 'the 86th Street W grate' },
  { item: 'sail', scheme: 'part-wings', steps: [1], flag: 'wings.sail1', at: { x: 72, z: 305 }, dry: true, label: 'the Conservatory Water shore' },
  { item: 'sail', scheme: 'part-wings', steps: [3], flag: 'wings.sail2', at: { x: 63.6, z: 302.3 }, label: 'the Conservatory Water shore' },
  { item: 'camera', scheme: 'say-cheese', steps: [2], at: { x: -129.6, z: 261.5 }, label: 'the tourist\'s window ledge on CPW' },   // photo mode (#9)
  { item: 'sticker', scheme: 'part-beak', steps: [2], at: { x: 128, z: 377 }, label: 'the 77th Street E grate' },
];

/** Items that renew by themselves (no rule needed): every slice source renews each phase; boxes (the shelf, the cyclist);
 *  shinies (the stall, Afternoons); gear becomes gear on pickup; huge items can't be carried off. */
export const RENEWING = ['slice', 'slice-anchovy', 'box', 'shiny', 'remote', 'falafel'];
