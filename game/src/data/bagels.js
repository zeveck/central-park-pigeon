// #44 Super Jumbo Bagels (110th Street) and "The Jumbo Order"; #45 bagels as bribes. Pure data (no imports): the shop
// module (schemes/bagel-shop.js), items.js, takers.js, crowds.js, item-sources.js and tools/check-schemes.mjs read it.
// Design: design/changes/batch-g-bagels.md.

export const BASES = [
  { id: 'plain', name: 'Plain', sub: 'golden and plain' },
  { id: 'sesame', name: 'Sesame', sub: 'toasty pale seeds' },
  { id: 'poppy', name: 'Poppy', sub: 'tiny black seeds' },
  { id: 'everything', name: 'Everything', sub: 'seeds, garlic, onion, salt' },
];
export const SCHMEARS = [
  { id: 'none', name: 'None', sub: 'just the bagel' },
  { id: 'plain', name: 'Plain', sub: 'cool and plain' },
  { id: 'scallion', name: 'Scallion', sub: 'green and oniony' },
  { id: 'strawberry', name: 'Strawberry', sub: 'pink and sweet' },
  { id: 'jalapeno', name: 'Jalapeño', sub: 'green, with a kick' },
];
// schmear disc colours (sampled from the menu tubs) and their flecks
export const SCHMEAR_LOOK = {
  plain: { color: 0xf3eee2, fleck: null },
  scallion: { color: 0xe4ead0, fleck: 0x3f7a2a },
  strawberry: { color: 0xf2c7cf, fleck: 0xc0303a },
  jalapeno: { color: 0xdfe8c4, fleck: 0x4c8a2c, fleck2: 0xd2452c },
};
export const PRICE = { bare: 2, schmear: 4 };
export const priceOf = (schmear) => (schmear && schmear !== 'none' ? PRICE.schmear : PRICE.bare);

/** The item id for a bagel: the plain one with no schmear is 'bagel', the others 'bagel-<base>-<schmear>'. */
export const bagelId = (base, schmear) => (base === 'plain' && schmear === 'none' ? 'bagel' : `bagel-${base}-${schmear}`);
export const isBagel = (id) => !!id && (id === 'bagel' || id.startsWith('bagel-'));
/** [base, schmear] of a bagel id. */
export function bagelParts(id) {
  if (id === 'bagel') return ['plain', 'none'];
  const m = /^bagel-([a-z]+)-([a-z]+)$/.exec(id || '');
  return m ? [m[1], m[2]] : null;
}
export const QUEST_BAGEL = 'bagel-sesame-jalapeno';

const SCHMEAR_WORD = { none: '', plain: 'plain schmear', scallion: 'scallion schmear', strawberry: 'strawberry schmear', jalapeno: 'jalapeño schmear' };
/** Every bagel item: { id, name, base, schmear }. */
export const BAGELS = BASES.flatMap((b) => SCHMEARS.map((s) => ({ id: bagelId(b.id, s.id), base: b.id, schmear: s.id, name: `${b.name} bagel${s.id === 'none' ? '' : ', ' + SCHMEAR_WORD[s.id]}` })));
/** The bagels that renew (Manny always makes another): every one but the quest bagel, which has a keeper rule. */
export const BAGEL_RENEWING = BAGELS.map((b) => b.id).filter((id) => id !== QUEST_BAGEL);

// ------------------------------------------------------------------ where things are (110th St, across from the north gate)
export const SHOP = {
  x: -64, face: 1070.6,            // the centre of the shopfront; the north building face (city.js FACE.north)
  w: 6.4,                          // the shopfront (x −67.2…−60.8)
  out: 1.4,                        // the walk-up window sticks out this far onto the 4 m pavement
  counterY: 1.05, windowTop: 2.4,
};
// the counter's shelf sticks out in front of the window (z 1068.85…1069.25, top 1.05 m) under open sky, so an order (or the
// item keeper's spawn, which finds the top surface) lands on it; the window above it has an invisible pane (z 1069.2…1069.3)
export const SHELF = { z0: 1068.85, z1: 1069.25, y: 1.05, x0: -66.7, x1: -62.0 };
export const COUNTER = { x: -63.2, y: 1.05, z: 1069.05 };   // where an order is put down (on the shelf, by the bell)
export const BELL = { x: -62.5, y: 1.05, z: 1069.05 };
export const MANNY_AT = { x: -64.0, y: 0.15, z: 1069.95 };   // behind his counter, facing the park
export const AFRAME = { x: -59.5, z: 1067.6 };

// ------------------------------------------------------------------ lines (voice: the clip in assets/audio/voice/)
export const MANNY = {
  welcome: { text: 'Welcome to Super Jumbo! A pigeon. Sure. Why not. What\'ll it be?', voice: 'manny-welcome' },
  hello: { text: 'Ding ding. What\'ll it be, pal?', voice: 'manny-hello' },
  night: { text: 'Twenty-four hours, pal. Bagels don\'t sleep.', voice: 'manny-night' },
  orderUp: { text: 'Order up! One jumbo. Don\'t eat it all at once.', voice: 'manny-order-up' },
  hot: { text: 'Hot outta the oven, pal.', voice: 'manny-hot' },
  plain: { text: 'One plain. A classic. Like me.', voice: 'manny-plain' },
  tip: { text: 'Word of advice, pal: drop that near a squirrel and watch it sing.', voice: 'manny-tip' },
  takeBack: { text: 'I\'ll toss that one to the pigeons out back. No refunds, pal.', voice: 'manny-takeback' },
  keep: { text: 'Hang on to that one, pal. Somebody\'s waiting on it.', voice: 'manny-keep' },
  waiting: { text: 'Your order\'s right there, pal.', voice: 'manny-waiting' },
  free: { text: 'Short? Eh. You\'re good for it. Make it a good one, pal.', voice: 'manny-free' },
  two: { text: 'Lost it? I made two. I ALWAYS make two.', voice: 'manny-two' },
};

export const MAMA = {
  greeting: { text: 'Sweetie! Come here. You eat yet?', voice: 'mamamask-greeting' },
  riddle1: { text: 'Sweetie. I been on my feet all night, and I want a JUMBO from that bagel place on 110th.', voice: 'mamamask-riddle-1' },
  riddle2: { text: 'The one dressed for the beach. Little seeds, like sand. Just the one kind, mind.', voice: 'mamamask-riddle-2' },
  riddle3: { text: 'And the schmear with the green fire in it. Ringo calls it "the spicy grass". Go on, sweetie.', voice: 'mamamask-riddle-3' },
  done1: { text: 'Sesame. Jalapeño. Jumbo. …Sweetie, you LISTENED.', voice: 'mamamask-done-1' },
  done2: { text: 'THAT\'S the stuff. Whoo! Somebody get me a milk.', voice: 'mamamask-done-2' },
  done3: { text: 'Knitted it on my break. Everything stitch. Keeps your neck warm and smells like Sunday.', voice: 'mamamask-done-3' },
  // the bagel answers (takers.js asks jumboAnswer in schemes/bagel-shop.js)
  union: { text: 'A BAGEL? Union rules say SLICE, sweetie.', voice: 'mamamask-union' },
  holdThat: { text: 'Ooh, sesame and jalapeño! You got taste, sweetie. Hold that thought.', voice: 'mamamask-hold' },
  another: { text: 'Another one? Sweetie, you spoil me. Save it for the squirrels.', voice: 'mamamask-another' },
  notMine: { text: 'That\'s a nice bagel, sweetie. Not my order, though.', voice: 'mamamask-not-mine' },
  seedsRight: { text: 'The seeds are right, sweetie.', voice: 'mamamask-seeds-right' },
  fireYes: { text: 'The green fire, YES.', voice: 'mamamask-fire-yes' },
  poppy: { text: 'But these seeds are BLACK. I said sand, not pepper.', voice: 'mamamask-poppy' },
  everything: { text: 'EVERYTHING? I asked for one kind of seed, not the whole spice rack.', voice: 'mamamask-everything' },
  bald: { text: 'Where are the SEEDS? This one\'s bald.', voice: 'mamamask-bald' },
  scallion: { text: 'Green, yes. Fire, no. That\'s an onion with ambitions.', voice: 'mamamask-scallion' },
  strawberry: { text: 'Pink? Do I look like I\'m having DESSERT?', voice: 'mamamask-strawberry' },
  plainSchmear: { text: 'Plain schmear. Where\'s the FIRE, sweetie?', voice: 'mamamask-plain-schmear' },
  naked: { text: 'Naked? A bagel with no schmear is a hockey puck.', voice: 'mamamask-naked' },
  bothWrong: { text: '…and the schmear\'s wrong too. Back you go, sweetie.', voice: 'mamamask-both-wrong' },
  plainPlain: { text: 'A plain bagel. PLAIN. That\'s what they throw to the pigeons, sweetie. No offence.', voice: 'mamamask-plain-plain' },
  socket: { text: 'Give that one to Socket. He\'ll eat anything.', voice: 'mamamask-socket' },
};
export const RIDDLE = 'Mama Mask wants: "Little seeds, like sand. Just the one kind. And the schmear with the green fire in it."';

// eaters' thank-yous for a bagel (takers.js EAT_LINES; bubbles)
export const BAGEL_EAT = {
  socket: 'Mama\'s leftovers? Don\'t mind if I do.',
  ringo: 'Fuel! Thanks, boss.',
  rats: ['A whole bagel? That\'s a week of crust, Gus.', 'Bagel! You\'re a pal.'],
  raccoons: ['A jumbo! Into the drain kitchen.', 'Mmf. Union thanks ya.'],
  biscuit: ['BAGEL! Best day EVER!', 'For ME? Gone. All gone.'],
  dog: ['The dog wolfs the bagel down. Tail going like a propeller.'],
  person: ['Ooh, a bagel! Thanks, little guy.', 'A bagel? Well, don\'t mind if I do.'],
};

// ------------------------------------------------------------------ #45: what each crew says when a bagel lands near it
// react: 'scamper' (grab it and run 4–6 m), 'eat' (walk over, eat it there), 'spot' (it comes to them: slow or still
// groups), 'sit' (the cats sit on it), 'refuse' (it stays live; they still talk). Voice clips: bribe-<crew>-<key>
// (excited, thanks, lead, tip, hint1, hint2 = LEAD_HINTS lines 1 and 2; refuse; closer).
export const BRIBES = {
  squirrels: { react: 'scamper', sound: 'squirrel-chatter', excited: 'Is that… a BAGEL?! Dibs! DIBS!', thanks: 'A bagel! For ME? You\'re the best, Gus!', lead: 'You know where Hazel is. Here\'s what you DON\'T know:', tip: 'Hazel lost her caches. Three of \'em, on Sheep Meadow. She can\'t find a THING.' },
  ducks: { react: 'refuse', sound: 'duck-quack-mallard', excited: 'BREAD? Do you KNOW what bread does to a duck?!', thanks: 'Still bread, Gus. Still NO. Thank you, sailor.', lead: 'Still no. But since you asked:', tip: 'The Commodore\'s mad for peas. The picnickers south of the Boathouse have a tub.' },
  crows: { react: 'scamper', sound: 'crow-caw', excited: 'A bagel. Not shiny. Still taking it.', thanks: 'Noted in the book. Much obliged.', lead: 'Already paid you, pigeon. Here\'s interest:', tip: 'Vesper trades in shinies. Bring her three and she\'ll talk business.' },
  raccoons: { react: 'scamper', sound: 'raccoon-chitter', excited: 'Is that a JUMBO? From 110th? Ohhh, ya shouldn\'t have.', thanks: 'Union thanks ya, boss. Mmf.', lead: 'I told ya where. Now here\'s what:', tip: 'Rigby\'s lost his good wrench. The stagehand at the Delacorte\'s got one. Just sayin\'.' },
  rats: { react: 'scamper', sound: 'rat-squeak', excited: 'A WHOLE bagel?! That\'s a week of crust!', thanks: 'Ya spoil us, pal.', lead: 'Ya know where Sue is. Here\'s the inside track:', tip: 'Sue wants a slice. HOT. The tourist by the $1 joint never finishes his.' },
  turtles: { react: 'spot', slow: true, sound: null, excited: 'A… bagel… for… me…? How… kind…', thanks: 'Thank… you… young… one…', lead: 'We… told you… where… But…', tip: 'Something\'s… under the water… by our rock… Look… down…' },
  choir: { react: 'eat', sound: 'coo', excited: 'A BAGEL! Bravo! Bravissimo!', thanks: 'Grazie, Gus! Mi-mi-MMF!', lead: 'You know the stage, darling. Now the plot:', tip: 'The Maestro needs a CROWD. Flip the signs on their way to the Terrace!' },
  racers: { react: 'eat', fast: true, sound: 'coo', excited: 'Carbs! CARB-LOADING! Yes!', thanks: 'Fuel for lap four! Thanks, Gus!', lead: 'You know where Coach is! Here\'s the play:', tip: 'Coach respects a winner. Beat us round the Reservoir. Bet you can\'t!' },
  meermob: { react: 'eat', sound: 'coo', excited: 'A bagel? For the Mob? …Respect.', thanks: 'You\'re good people, kid.', lead: 'Ya know the place. Here\'s the etiquette:', tip: 'Big Sal likes an entrance. Fly in through the Blockhouse gap. With STYLE.' },
  biscuit: { react: 'scamper', sound: 'dog-happy-bark', excited: 'BAGEL! BAGEL! Is it for ME? It\'s for ME!', thanks: 'Best friend! Best BAGEL!', lead: 'You KNOW where! But GUESS WHAT:', tip: 'Biscuit\'s BALL went in the LAKE! He\'s SO sad! The LAKE!' },
  cats: { react: 'sit', sound: 'cat-meow', soundRate: 0.8, excited: 'A bagel. Warm. …I\'m going to sit on it.', thanks: 'Tribute accepted, sugar.', lead: 'You know where Queenie sits. Here\'s what she likes:', tip: 'Queenie takes her slice with anchovies. From 72nd. Hot. Don\'t ask why.' },
  horses: { react: 'spot', reach: 2.5, sound: 'horse-whinny', excited: 'Now THAT\'S a herbivore\'s breakfast, sugar.', thanks: 'Why, thank you, little fella.', lead: 'You know where we stand, sugar. Here\'s our trouble:', tip: 'Somebody\'s hogging our trough. Prickett. Move him and Clementine\'s all ears.', closer: 'Closer, sugar. I\'m in harness.' },
  songbirds: { react: 'spot', mob: 3, sound: 'songbird-chatter', excited: 'BAGEL! Not a crumb! A WHOLE ONE!', thanks: 'Tweet-tweet! That\'s my thank-you sound.', lead: 'You know where Mimi is! But LISTEN:', tip: 'Spikes on the museum ledge! Mimi can\'t even SIT! Get \'em off!' },
  geese: { react: 'spot', sound: 'goose-honk', excited: 'HONK! BREAD! Finally, some RESPECT!', thanks: 'HONK. Thank you. HONK.', lead: 'HONK! YOU KNOW WHERE! HONK! BUT:', tip: 'Gertrude wants a LAWN. A whole LAWN. Geese ONLY. HONK.' },
  strix: { react: 'refuse', noHint: true, sound: 'owl-hoot', refuse: 'Who brings an OWL a bagel? Do your reading.', tip: 'The Professor can\'t see a THING without her spectacles. The Exchange oak sells everything.' },
  rhoda: { react: 'refuse', noHint: true, sound: 'hawk-screech', refuse: 'I eat things that RUN, kid. Bagels don\'t.', tip: 'Rhoda\'s sore about her ledge on Fifth. Big Sal knows the story.' },
  herons: { react: 'refuse', noHint: true, noVoice: true, sound: 'heron-croak', refuse: 'Bread is not the way.' },
  swells: { react: 'spot', sound: 'coo', thanks: 'A plain bagel? How… rustic. Thank you, darling.' },
};
/** The crowd group a bribe entry is keyed by (crowds.js GROUPS: the dogs are Biscuit's, owls Strix's, hawks Rhoda's). */
export const BRIBE_KEY = { dogs: 'biscuit', owls: 'strix', hawks: 'rhoda', herons: 'herons' };
