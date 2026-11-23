// DATA: the 30 schemes ("Scheme steps"), exactly as the design's table, in
// the Tech plan's schema:
//
//   { id, title, thread, gives, opensWhen: { flags, anyOf, atLeast, flock }, start,
//     steps: [{ id, goal, obstacle, nudge, answer, needs, alts: [{ needs, does, on }], on, does }] }
//
// needs (all optional):
//   phase   'morning' | 'afternoon' | 'dusk' | 'night' | 'day' | 'any' | 'dusk-night' | [phases]
//   place   a PLACES id (layout.js)                 ally  a crew id, or 'haul' / 'haul-water' / 'haul-road'
//   allies  several crew ids                        item  an item id ('slice', 'peas', 'wrench', …)
//   hot     the slice must be hot (< 60 s)          gear  'pen' | 'sunglasses' | 'headlamp' | …
//   crumbs  crumbs to spend                         flock flock size
//   flags   flags that must be set                  signs signs that must all be live at once
//   dove    Dove must be in the flock               human a phase-locked human who must be out
// on: what completes the step once its needs hold:
//   { type: 'flip', sign } · { type: 'signsLive', signs } · { type: 'talk', who } · { type: 'give', item, to }
//   { type: 'ask', ally, place } · { type: 'peck', target } · { type: 'coo', hold, place } · { type: 'auto' }
//   { type: 'flag', flag } (a scripted step sets it) · { type: 'reach', place, alt }
// does: { setFlags, give: { crew, flock, talent, gear, item, part, line, truce, crumbs, deal }, take: { item, crumbs },
//         script, dialogue }
// Every step also sets `<scheme>.s<n>` when it completes, and the last step sets `<scheme>`.
//
// The Prologue is complete (its scripts live in src/schemes/prologue.js). The
// other schemes carry their full needs and goals so the Board, the compass and
// tools/check-schemes.mjs can read them; their step scripts arrive in
// milestone 3 (`script` names that aren't registered yet are reported as stubs).

const S = (n, o) => ({ n, ...o });

export const SCHEMES = [
  // ================================================================ Prologue
  {
    id: 'prologue', title: 'Crumbs', thread: 'sign', act: 'Prologue', start: 'nest-pond',
    gives: { crew: 'swells', flock: 6, talent: 'coo', crumbs: 40 },
    opensWhen: {},
    steps: [
      S(1, {
        goal: 'Peck the sign with the red DON\'T strip, on the Pond\'s east path.', where: 'The sign with the red DON\'T strip, beside the Pond\'s east path', obstacle: 'It says DON\'T FEED THE BIRDS. Rude.',
        nudge: { by: 'duchess', text: 'A loose plate, darling. Give it a PECK.' }, answer: { text: 'Land in front of the sign with the red DON\'T strip on the Pond\'s east path, and peck it.', icon: null },
        needs: { phase: 'morning', place: 'pond' }, on: { type: 'flip', sign: 'S1' },
        does: { script: 'prologue.feeders' }, target: { sign: 'S1' },
      }),
      S(2, {
        goal: 'Flip the Pond\'s three red DON\'T signs: east path, Gapstow Bridge, south shore.', where: 'The red DON\'T signs on the Pond\'s east path, on Gapstow Bridge and on the south shore', obstacle: 'The rangers keep fixing them. Get all three live at once.',
        nudge: { by: 'monty', text: 'Word is there\'s one on Gapstow Bridge and one on the south shore.' },
        answer: { text: 'Peck the signs at Gapstow Bridge and the Pond\'s south shore while the first is still flipped.', icon: null },
        needs: { phase: 'day', signs: ['S1', 'S2', 'S3'] }, on: { type: 'signsLive', signs: ['S1', 'S2', 'S3'] },
        does: { script: 'prologue.frenzy', give: { crew: 'swells', flock: 6, talent: 'coo' } }, target: { signs: ['S1', 'S2', 'S3'] },
      }),
      S(3, {
        goal: 'Uh-oh.', where: 'The Pond', obstacle: 'A ranger. And a van.', auto: true,
        needs: {}, on: { type: 'auto' },
        does: { script: 'prologue.end', setFlags: ['spikes.P1', 'spikes.P2', 'spikes.P3', 'spikes.P4'] },
      }),
    ],
  },

  // ================================================================ Sign War
  {
    id: 'den-ducks', title: 'Ducks Want Peas', thread: 'sign', act: '1', start: 'nest-mall', gives: { crew: 'ducks', talent: 'dive' },
    opensWhen: { flags: ['prologue'] },
    steps: [
      S(1, { goal: 'Talk to Commodore Puddles, out on the Lake by Bow Bridge.', where: 'Commodore Puddles is out on the Lake, just east of Bow Bridge', obstacle: 'Ducks want peas. Who has peas?', needs: { phase: 'day', place: 'lake' }, on: { type: 'talk', who: 'puddles' }, does: { script: 'ducks.meet' }, target: { who: 'puddles' }, nudge: { by: 'mrspuddles', text: 'Commodore\'s on the Lake by Bow Bridge, dear. Land on the bank near him.' } }),
      // Fun pass (P3): the swarm Sue just taught FAILS here, out loud ("mobbed by better pigeons"); the trick is the other
      // thing the Prologue taught, a FEED sign, used for a new purpose: it gets the whole picnic up off its blanket and
      // over to the sign to feed the birds, leaving the tub alone for a few seconds (src/schemes/den-ducks.js).
      S(2, { goal: 'Get the tub of peas from the picnickers south of the Boathouse.', where: 'The picnickers\' little table on the slope just south of the Loeb Boathouse', obstacle: 'They never leave that tub. Well… hardly ever. What gets a picnic up off its benches?', nudge: { by: 'bubbles', text: 'Those picnickers can\'t resist feeding the birds, Gus! What if the sign up the path said FEED?' }, answer: { text: 'At Afternoon, peck sign M7 up the path from the picnic: they all walk over to feed the birds and leave the tub alone. Grab it.', icon: null }, needs: { phase: 'afternoon', place: 'boathouse' }, on: { type: 'pickup', item: 'peas' }, target: { at: { x: 45.5, z: 292.5, label: 'The Boathouse picnic' } } }),
      S(3, { goal: 'Bring the peas to Commodore Puddles on the Lake.', where: 'Commodore Puddles is out on the Lake, just east of Bow Bridge', obstacle: '', needs: { phase: 'day', item: 'peas', place: 'lake' }, on: { type: 'give', item: 'peas', to: 'puddles' }, does: { take: { item: 'peas' }, script: 'ducks.join' }, target: { who: 'puddles' }, nudge: { by: 'ensign', text: '*salutes* Peas go to the Commodore, sir! Peck him with them, sir!' }, answer: { text: 'Carry the peas to Commodore Puddles on the Lake and peck him.', icon: null } }),
    ],
  },
  {
    id: 'den-raccoons', title: 'A Wrench for Rigby', thread: 'sign', act: '2', start: 'nest-north', gives: { crew: 'raccoons', talent: 'rig' },
    opensWhen: { flags: ['den-crows'] },
    steps: [
      S(1, { goal: 'Meet Rigby in the North Woods, from Dusk.', where: 'Rigby paces the North Woods, north of the Reservoir and the North Meadow', obstacle: 'Rigby needs a wrench. The Delacorte stagehand has one.', needs: { phase: 'dusk', place: 'north-woods' }, on: { type: 'talk', who: 'rigby' }, does: { script: 'raccoons.meet' }, target: { who: 'rigby' }, nudge: { by: 'socket', text: 'Rigby\'s in the North Woods from Dusk. Follow the clanking.' } }),
      S(2, {
        goal: 'Get the stagehand\'s wrench at the Delacorte Theater.', where: 'The Delacorte Theater\'s stage door, just west of Turtle Pond', obstacle: 'It\'s backstage at the Delacorte.', nudge: { by: 'ringo', text: 'Guard at the stage door loves a hot slice. Everyone knows.' },
        answer: { text: 'Peck a hot slice to the stage-door guard at Dusk, then peck the wrench off the prop table. Or find the stagehand\'s earring with Night Eyes and trade.', icon: 'crows' },
        alts: [
          // the earring is found at Night (Night Eyes: clues earring-eyes / earring); the trade itself completes the step at Dusk
          { needs: { phase: 'dusk', place: 'delacorte', ally: 'crows', crumbs: 10, human: 'stagehand', flags: ['den-strix'] }, before: { phase: 'night', place: 'shakespeare-garden', ally: 'strix' }, on: { type: 'trade', id: 'wrench' } },
          { needs: { phase: 'dusk', place: 'delacorte', item: 'slice', hot: true, human: 'guard' }, on: { type: 'pickup', item: 'wrench' }, does: { script: 'raccoons.wrench' } },
        ],
      }),
      S(3, { goal: 'Bring the wrench to Rigby in the North Woods.', where: 'Rigby paces the North Woods, north of the Reservoir and the North Meadow', obstacle: '', needs: { phase: 'dusk', place: 'north-woods', item: 'wrench' }, on: { type: 'give', item: 'wrench', to: 'rigby' }, does: { script: 'raccoons.join' }, answer: { text: 'At Dusk, carry the wrench to Rigby in the North Woods and peck him.', icon: null }, nudge: { by: 'mamamask', text: 'Rigby\'s pacing by the North Woods drain, sweetie. Bring him that wrench at Dusk.' } }),
    ],
  },
  {
    id: 'sab-middle', title: 'The Middle Cart', thread: 'sign', act: '2', start: 'nest-mall', gives: { setFlags: ['cart.middle'] },
    opensWhen: { flags: ['den-raccoons', 'den-cats'] },
    steps: [
      S(1, { goal: 'Get into the lot by the Loeb Boathouse.', where: 'The locked gate of the Loeb Boathouse lot, on the Lake\'s east arm', obstacle: 'The gate is locked. The key hangs on the booth\'s hook, teetering.', answer: { text: 'Call the cats to knock the key off the hook, peck it, then peck the gate.', icon: 'cats' }, needs: { phase: 'night', place: 'boathouse', ally: 'cats' }, on: { type: 'flag', flag: 'boathouse.gateOpen' }, does: { script: 'sab.middle.gate' }, nudge: { by: 'pickles', text: 'A key on a hook, wobbling? That\'s a cat job, pigeon. Obviously.' } }),
      S(2, { goal: 'Sabotage the ranger cart in the Boathouse lot.', where: 'The ranger cart parked in the Loeb Boathouse lot', obstacle: 'It\'s parked. Somebody with paws could do something about that.', answer: { text: 'Call the raccoons to the parked cart at Night and Ask them.', icon: 'raccoons' }, needs: { phase: 'night', place: 'boathouse', ally: 'raccoons', flags: ['boathouse.gateOpen'] }, on: { type: 'talent', clue: 'cart-middle' }, does: { script: 'sab.middle.done' }, nudge: { by: 'ringo', text: 'Parked cart, no ranger. Call the Crew, boss. We love a parked cart.' } }),
    ],
  },
  {
    id: 'sab-north', title: 'The North Cart', thread: 'sign', act: '2', start: 'nest-north', gives: { setFlags: ['cart.north'] },
    opensWhen: { flags: ['den-raccoons'] },
    steps: [
      S(1, { goal: 'Open the ranger shed at 103rd Street.', where: 'The ranger shed at 103rd Street, south of Harlem Meer', obstacle: 'The door\'s latch rope is high up.', answer: { text: 'Hold Coo at the rope with a flock of 15 or more.', icon: null }, needs: { phase: 'night', place: 'shed-103', flock: 15 }, on: { type: 'flag', flag: 'shed103.open' }, nudge: { by: 'socket', text: 'That rope\'s too high for one pigeon. Fifteen, though…' } }),
      S(2, { goal: 'Sabotage the ranger cart in the 103rd Street shed.', where: 'The ranger cart inside the 103rd Street shed, south of Harlem Meer', obstacle: 'It\'s parked inside.', answer: { text: 'Call the raccoons to the cart at Night and Ask them.', icon: 'raccoons' }, needs: { phase: 'night', place: 'shed-103', ally: 'raccoons', flags: ['shed103.open'] }, on: { type: 'talent', clue: 'cart-north' }, does: { script: 'sab.north.done' }, nudge: { by: 'ringo', text: 'Shed\'s open, boss! Parked cart in there. Call the Crew. We LOVE a parked cart.' } }),
    ],
  },
  {
    id: 'part-eyes', title: 'Two Hubcaps', thread: 'sign', act: '2', start: 'nest-ramble', gives: { part: 'eyes' },
    opensWhen: { atLeast: { n: 2, of: ['sab-middle', 'sab-north', 'part-talons'] } },
    steps: [S(1, { goal: 'Rigby hands you two hubcaps.', where: 'Rigby, in the North Woods', obstacle: '', auto: true, needs: {}, on: { type: 'auto' }, does: { give: { part: 'eyes' }, script: 'eyes.hubcaps' } })],
  },
  {
    id: 'den-choir', title: 'An Audience That Stays', thread: 'sign', act: '2', start: 'nest-mall', gives: { crew: 'choir', flock: 12, part: 'voice', scarf: 'rainbow-stripe' },
    opensWhen: { flags: ['sab-middle', 'gear-pen', 'gear-sunglasses'] },
    steps: [
      S(1, { goal: 'Talk to Maestro Vibrato by Bethesda Fountain.', where: 'Maestro Vibrato sings by the fountain on Bethesda Terrace, at the top of the Mall', obstacle: 'The sax busker steals our audience. We need one that STAYS.', needs: { phase: 'day', place: 'bethesda' }, on: { type: 'talk', who: 'vibrato' }, does: { script: 'choir.meet' } }),
      // Fun pass (P11): four signs that matter (the crowd's way in: both ends of the Mall, the terrace and Cherry Hill), not all eight
      S(2, { goal: 'Flip the four signs on the crowd\'s way to Bethesda Terrace.', where: 'The signs at both ends of the Mall, on Bethesda\'s upper terrace and on Cherry Hill', obstacle: 'An audience that STAYS needs feeding on the way in: both ends of the Mall, the terrace and Cherry Hill.', needs: { phase: 'day', gear: 'pen', flags: ['cart.middle'], signs: ['M4', 'M5', 'M6', 'M3'] }, on: { type: 'signsLive', signs: ['M4', 'M5', 'M6', 'M3'] }, does: { script: 'choir.signs' }, target: { signs: ['M4', 'M5', 'M6', 'M3'] }, nudge: { by: 'bella', text: 'Four signs, darling! Both ends of the Mall, the terrace and Cherry Hill. The enamel ones want the pen, and the terrace one wants sunglasses.' }, answer: { text: 'By day, flip M4 and M3 with a peck, M5 with the paint pen, and M6 with the pen while wearing sunglasses. The Middle cart is out of action, so they all stay.', icon: null } }),
      S(3, { goal: 'Throw a feast on Bethesda Terrace.', where: 'Bethesda Terrace, by the fountain at the top of the Mall', obstacle: 'Feast: 40 crumbs.', needs: { phase: 'afternoon', place: 'bethesda', crumbs: 40 }, on: { type: 'coo', hold: false, place: 'bethesda' }, does: { take: { crumbs: 40 }, script: 'choir.join' }, answer: { text: 'At Afternoon, with 40 crumbs, tap Coo on Bethesda Terrace.', icon: null }, nudge: { by: 'encore', text: 'Afternoon! Forty crumbs! A Coo on the terrace! And then ONE MORE!' } }),
    ],
  },

  // ================================================================ Slice Run
  {
    id: 'den-rats', title: 'A Whole Hot Slice', thread: 'slice', act: '1', start: 'nest-pond', gives: { crew: 'rats', talent: 'travel', line: 'columbus' },
    opensWhen: { flags: ['prologue'] },
    steps: [
      S(1, { goal: 'Meet Subway Sue on the subway grate at Columbus Circle.', where: 'Subway Sue sits on the subway grate at Columbus Circle, the park\'s south-west corner', obstacle: 'Sue wants a whole slice. Hot. Down the stairs.', needs: { phase: 'any', place: 'columbus-grate' }, on: { type: 'talk', who: 'sue' }, does: { script: 'rats.meet' } }),
      S(2, { goal: 'Get a slice off the tourist on the bench by the $1 SLICE joint.', where: 'The tourist on the bench outside the red $1 SLICE joint, just west of Columbus Circle', obstacle: 'He\'s eating it. Slowly.', nudge: { by: 'chip', text: 'Tourists drop EVERYTHING when a flock comes at them.' }, answer: { text: 'Hold Coo at him with a flock of 6 or more.', icon: null }, needs: { phase: 'day', place: 'slice-columbus' }, on: { type: 'pickup', item: 'slice' }, target: { at: { x: -143, z: -17.5, label: 'The slice tourist' } } }),
      S(3, { goal: 'Get the slice to Subway Sue at Columbus Circle while it\'s hot.', where: 'Subway Sue sits on the subway grate at Columbus Circle', obstacle: 'Slices go cold. Some folks care.', needs: { phase: 'any', place: 'columbus-grate', item: 'slice', hot: true }, on: { type: 'give', item: 'slice', to: 'sue' }, does: { script: 'rats.join' }, nudge: { by: 'express', text: 'Fifteen metres, joint to grate. Fly it straight down, kid. Steam\'s still coming off it.' }, answer: { text: 'Fly the slice straight from the joint to Sue at the Columbus Circle grate inside 60 seconds and peck her.', icon: null } }),
    ],
  },
  {
    id: 'den-cats', title: 'The Hot Anchovy', thread: 'slice', act: '1', start: 'nest-north', gives: { crew: 'cats', talent: 'knock', setFlags: ['spike.P2.cleared'] },
    opensWhen: { flags: ['prologue'] },
    steps: [
      S(1, { goal: 'Meet Queenie outside the DELI GROCERY at 110th & Lenox.', where: 'Queenie lounges outside the blue DELI GROCERY at 110th & Lenox, past the park\'s north end', obstacle: 'Queenie wants an anchovy slice from the CPW & 72nd joint. HOT.', needs: { phase: 'any', place: 'bodega-110' }, on: { type: 'talk', who: 'queenie' }, does: { script: 'cats.meet' } }),
      // Fun pass (P4): the fan on the bench is the red herring (a swarm gets "Mob me all you like"); the slice cooling on the
      // bodega sill beside Pickles is the way: wake a cat beside something on a ledge (src/schemes/den-cats.js)
      S(2, { goal: 'Get an anchovy slice at the $1 SLICE joint on CPW & 72nd.', where: 'Pickles dozes on the window sill of the red $1 SLICE joint at Central Park West & 72nd', obstacle: 'The fan on the bench never lets go. But the counterman\'s left a fresh one cooling on the sill, right next to Pickles. Pickles is asleep. Pickles is a CAT.', nudge: { by: 'whiskerton', text: 'Wake a cat beside something on a ledge, dear, and see what happens. Every time.' }, answer: { text: 'By day, peck Pickles awake (or Coo right under the bodega window): he stares at you and slowly pushes the slice off the sill.', icon: null }, needs: { phase: 'day', place: 'slice-cpw72' }, on: { type: 'pickup', item: 'slice-anchovy' }, target: { who: 'pickles' } }),
      S(3, {
        goal: 'Get the anchovy slice to Queenie at 110th & Lenox, hot.', where: 'Queenie lounges outside the blue DELI GROCERY at 110th & Lenox', obstacle: '820 m. Over the park, it\'ll be cold by 96th Street.', does: { script: 'cats.join' }, nudge: { by: 'whiskerton', text: 'Rats go under the park faster than you go over it, dear. Or there\'s the halal man\'s griddle at Dusk.' }, answer: { text: 'Rats from the 72nd W grate to 96th E, or warm it on the halal griddle at 110th & Fifth at Dusk.', icon: 'rats' },
        alts: [
          { needs: { phase: 'any', flags: ['den-rats'], item: 'slice-anchovy', hot: true, grate: ['grate-72w', 'grate-96e'] }, on: { type: 'give', item: 'slice-anchovy', to: 'queenie' } },
          { needs: { phase: 'dusk', item: 'slice-anchovy', hot: true, griddle: 'dusk' }, on: { type: 'give', item: 'slice-anchovy', to: 'queenie' } },
        ],
      }),
    ],
  },
  {
    id: 'part-body', title: 'Vinnie\'s Cart', thread: 'slice', act: '2', start: 'nest-mall', gives: { part: 'body' },
    opensWhen: { flags: ['den-raccoons'] },
    steps: [
      S(1, {
        goal: 'Make Vinnie fed up with his hot dog cart on the Mall.', where: 'Vinnie\'s hot dog cart, halfway up the Mall', obstacle: 'Vinnie loves that cart.', does: { script: 'body.fedup' }, nudge: { by: 'crumbsy', text: 'Vinnie HATES pizza. Hot pizza on his counter, with people watching? He\'d blow a gasket.' }, answer: { text: 'Flip M4 and M5 at once so the pigeons swarm his cart, or peck a hot slice onto his counter while customers queue.', icon: null },
        alts: [
          { needs: { phase: 'afternoon', place: 'mall', gear: 'pen', signs: ['M4', 'M5'] }, on: { type: 'signsLive', signs: ['M4', 'M5'] }, does: { setFlags: ['vinnie.fedup'] } },
          { needs: { phase: 'afternoon', place: 'mall', item: 'slice', hot: true }, on: { type: 'give', item: 'slice', to: 'vinnie' }, does: { setFlags: ['vinnie.fedup'] } },
        ],
      }),
      S(2, { goal: 'Rig Vinnie\'s hot dog cart on the Mall while he storms round it.', where: 'Vinnie\'s hot dog cart, halfway up the Mall', obstacle: 'Vinnie has a broom.', needs: { phase: 'dusk', place: 'mall', ally: 'raccoons', flags: ['vinnie.fedup'], human: 'vinnie' }, on: { type: 'ask', ally: 'raccoons', place: 'mall' }, does: { script: 'fight.vinnie', setFlags: ['vinnie.cartRigged'] }, nudge: { by: 'socket', text: 'Vinnie storms round and round that cart, boss. Call us in while he\'s busy. Keep him busy. Keep him AWAY from us.' }, answer: { text: 'At Dusk, Call the raccoons to Vinnie\'s cart on the Mall and Ask them; keep Vinnie and his broom away from them until they\'re done.', icon: 'raccoons' } }),
      S(3, { goal: 'Drive the hot dog cart to the Workshop cave in the Ramble.', where: 'The Workshop cave in the Ramble, just north-west of the Exchange oak', obstacle: '', needs: { phase: 'dusk', flags: ['vinnie.cartRigged'] }, on: { type: 'reach', place: 'workshop', vehicle: 'hotdog-cart' }, does: { script: 'body.home' }, nudge: { by: 'ringo', text: 'She rolls, boss! Hop in and drive her to the Workshop. Over Bow Bridge, through the Ramble.' }, answer: { text: 'Peck the rigged hot dog cart to get in, and drive it to the Workshop cave in the Ramble.', icon: null } }),
    ],
  },
  {
    id: 'truce-cats-rats', title: 'Enough for Everyone', thread: 'feuds', act: '2', start: 'nest-north', gives: { truce: 'cats-rats', line: 'harlem' },
    opensWhen: { flags: ['den-turtles', 'den-cats', 'den-rats'] },
    steps: [
      S(1, { goal: 'See the bins outside the DELI GROCERY at 110th & Lenox.', where: 'The bins outside the blue DELI GROCERY at 110th & Lenox', obstacle: 'They\'d share… if there were enough for everyone.', needs: { phase: 'any', place: 'bodega-110' }, on: { type: 'reach', place: 'bodega-110' }, does: { script: 'catsrats.bins' } }),
      S(2, {
        goal: 'Get a whole pizza box.', where: 'Whole boxes sit on the pickup shelf at the CPW & 72nd $1 SLICE, and ride with the East Drive cyclist in the Afternoon', obstacle: 'A box is heavy, and somebody always has hold of it.',
        nudge: { by: 'pinstripe', text: 'A whole box? The cyclist on East Drive carries one every Afternoon. Or that shelf at 72nd is VERY close to the edge.' },
        answer: { text: 'Call the cats to the pickup shelf at the CPW & 72nd joint by day (a box teeters on its edge). Or at Afternoon, have the songbirds ring the East Drive cyclist\'s phone, or the geese chase him, so he drops his box.', icon: 'cats' },
        alts: [
          { needs: { phase: 'afternoon', place: 'east-drive-90', ally: 'songbirds', human: 'cyclist' }, on: { type: 'pickup', item: 'box' } },
          { needs: { phase: 'afternoon', place: 'east-drive-90', ally: 'geese', human: 'cyclist' }, on: { type: 'pickup', item: 'box' } },
          { needs: { phase: 'day', place: 'slice-cpw72', ally: 'cats' }, on: { type: 'pickup', item: 'box' } },
        ],
      }),
      S(3, { goal: 'Open the box on the kerb at 110th & Lenox.', where: 'The kerb outside the blue DELI GROCERY at 110th & Lenox', obstacle: 'Heavy: carry it low, or take the grates to 96th E.', needs: { phase: 'any', place: 'bodega-110' }, on: { type: 'boxOpened', place: 'bodega-110' }, does: { script: 'catsrats.truce' }, nudge: { by: 'express', text: 'Heavy box, kid. Low and slow. Or ride OUR line: in at 72nd, out at 96th, and it\'s a short walk up to 110th.' }, answer: { text: 'Carry the box low to the 110th & Lenox kerb (the grates from 72nd W to 96th E save most of the way), set it down with Drop, then peck it open.', icon: null } }),
    ],
  },

  // ================================================================ Spikes
  // (3b, Spikes + Feuds builder: scripts in src/schemes/<id>.js and src/setpieces/)
  {
    id: 'den-songbirds', title: 'A New Sound', thread: 'spikes', act: '1', start: 'nest-greatlawn', gives: { crew: 'songbirds', talent: 'mimic' },
    opensWhen: { flags: ['den-cats'] },
    steps: [
      S(1, { goal: 'See the starlings at the natural history museum, CPW & 79th.', where: 'The natural history museum on Central Park West at 79th, where the starlings circle', obstacle: 'Prickett spiked the starlings\' roost.', nudge: { by: 'jay', text: 'The starlings are going round and round the museum, Gus. CAW! Sorry. Somebody spiked their cornice.' }, answer: { text: 'By day, fly to the natural history museum on Central Park West at 79th.', icon: null }, needs: { phase: 'day', place: 'museum-79' }, on: { type: 'reach', place: 'museum-79' }, does: { script: 'songbirds.roost' } }),
      S(2, { goal: 'Clear the spike strips off the museum\'s cornice.', where: 'The spiked cornice of the natural history museum, CPW & 79th', obstacle: 'Strips, glued, teetering on the edge.', nudge: { by: 'ruby', text: 'The strips teeter on the very edge, sweet pigeon. Who in this park knocks things off edges FOR FUN?' }, answer: { text: 'Call the cats to the cornice and Ask them.', icon: 'cats' }, needs: { phase: 'any', place: 'museum-79', ally: 'cats' }, on: { type: 'flag', flag: 'spike.P3.cleared' }, does: { script: 'songbirds.cornice' } }),
      S(3, { goal: 'Teach Mimi a new sound.', where: 'Mimi perches by the natural history museum\'s steps, CPW & 79th', obstacle: 'She wants something nobody else does.', nudge: { by: 'chip', text: 'Afternoons, the ice-cream truck by the Plaza plays a tune NOBODY can do. Mimi\'s been dying to hear it up close.' }, answer: { text: 'At Afternoon, perch on the ice-cream truck at Grand Army Plaza and peck its chime button while Mimi watches.', icon: null }, needs: { phase: 'afternoon', place: 'grand-army-plaza', human: 'icecream' }, on: { type: 'peck', target: 'icecream-chime' }, does: { script: 'songbirds.jingle' }, target: { who: 'mimi' } }),
    ],
  },
  {
    id: 'den-racers', title: 'No Roost, No Training', thread: 'spikes', act: '1–2', start: 'nest-reservoir', gives: { crew: 'racers', flock: 10, talent: 'draft' },
    opensWhen: { flags: ['den-cats'] },
    steps: [
      S(1, { goal: 'Talk to Coach Wingate on the Reservoir\'s south gatehouse.', where: 'Coach Wingate stands on the roof of the Reservoir\'s south gatehouse', obstacle: 'Somebody cleared their roost. Now he wants a race.', needs: { phase: 'day', place: 'reservoir-track' }, on: { type: 'talk', who: 'wingate' }, does: { script: 'racers.coach' }, target: { who: 'wingate' } }),
      // Fun pass (P5): no "Call the cats to the strips" step (it was songbirds 2 again): Pickles cleared the roost when the cats
      // joined (den-cats gives spike.P2.cleared). The feast is folded into the win when Gus has 30 crumbs (racers.won sets
      // racers.feasted and plays it); otherwise step 3 is the feast as before.
      S(2, {
        goal: 'Win the Racers\' race round the Reservoir.', where: 'The start line by the Reservoir\'s south gatehouse', obstacle: 'Coach flies a fixed line at 9 m/s. Or: the wheeled division.',
        nudge: { by: 'lapcount', text: 'Peck me at the start line and I start the clock. Ten rings, in ORDER. Or come at Dusk with a crew who can rig wheels: the pedicab division\'s an easier lap.' },
        answer: { text: 'By day, Peck Lapcount at the start line and fly the ten rings in order (lose twice and Sprint flies ahead to show you the line). Or at Dusk, have the raccoons Rig the pedicab and drive one lap of the track inside Coach\'s posted time.', icon: null },
        alts: [
          { needs: { phase: 'day', place: 'reservoir-track' }, on: { type: 'flag', flag: 'race.won' } },
          { needs: { phase: 'dusk', place: 'reservoir-track', ally: 'raccoons', flags: ['den-raccoons'] }, on: { type: 'flag', flag: 'race.won' } },
        ],
        does: { script: 'racers.won' },
      }),
      S(3, {
        goal: 'Throw the Racers a feast on the Reservoir track.', where: 'The running track round the Reservoir', obstacle: 'Feast: 30 crumbs.', nudge: { by: 'wheezy', text: 'Coach… always… celebrates… with a FEAST. Thirty crumbs. Coo on the track.' }, answer: { text: 'By day, with 30 crumbs, Coo on the Reservoir track.', icon: null },
        alts: [
          { needs: { flags: ['racers.feasted'] }, on: { type: 'flag', flag: 'racers.feasted' } },
          { needs: { phase: 'day', place: 'reservoir-track', crumbs: 30 }, on: { type: 'coo', hold: false, place: 'reservoir-track' }, does: { take: { crumbs: 30 }, script: 'racers.feast' } },
        ],
      }),
    ],
  },
  {
    id: 'den-horses', title: 'The Van on the Trough', thread: 'spikes', act: '1–2', start: 'nest-pond', gives: { crew: 'horses', talent: 'kick', line: 'carriage', setFlags: ['spikes.P5', 'spikes.P6'] },
    opensWhen: { flags: ['prologue'], anyOf: [['den-songbirds', 'den-geese']] },
    steps: [
      S(1, { goal: 'Talk to Clementine on the carriage line, Central Park South.', where: 'Clementine stands with the carriages on Central Park South, by the trough', obstacle: 'That van\'s parked on our trough again.', needs: { phase: 'morning', place: 'cps-carriage-line' }, on: { type: 'talk', who: 'clementine' }, does: { script: 'horses.trough' }, target: { who: 'clementine' } }),
      S(2, {
        goal: 'Move Prickett off the horses\' trough on Central Park South.', where: 'Prickett leans on his van by the carriage line, Central Park South', obstacle: 'He\'s leaning on the van, on the phone to nobody.',
        nudge: { by: 'chip', text: 'He\'s ON the phone to nobody, Gus. So make it RING. That\'s my favourite trick. Or send a goose. Nobody argues with a goose.' },
        answer: { text: 'At Morning, Call the songbirds (or the geese) to Prickett by his van on Central Park South and Ask them.', icon: 'songbirds' },
        alts: [
          { needs: { phase: 'morning', place: 'cps-carriage-line', ally: 'songbirds', human: 'prickett' }, on: { type: 'flag', flag: 'prickett.moved' } },
          { needs: { phase: 'morning', place: 'cps-carriage-line', ally: 'geese', human: 'prickett' }, on: { type: 'flag', flag: 'prickett.moved' } },
        ],
        does: { script: 'horses.vanOff' },
      }),
      S(3, { goal: 'Let the horses drink.', where: 'The trough on Central Park South', obstacle: '', auto: true, needs: { phase: 'morning' }, on: { type: 'auto' }, does: { script: 'horses.drink' } }),
    ],
  },
  {
    id: 'part-talons', title: 'The Rink Job', thread: 'spikes', act: '2–3', start: 'nest-pond', gives: { part: 'talons', setFlags: ['cart.south', 'shed.open', 'prickett.quit'], scarf: 'racing-red' },
    opensWhen: { flags: ['den-raccoons', 'den-horses'], anyOf: [['sab-middle', 'sab-north']] },
    steps: [
      S(1, { goal: 'See what Prickett hides in the Wollman Rink shed.', where: 'Wollman Rink\'s yard, by the north boards', obstacle: 'Prickett\'s stock AND the last ranger cart, behind one steel door. Nothing with paws opens that.', answer: { text: 'At Morning, fly to Wollman Rink and watch the yard by the north boards.', icon: null }, needs: { phase: 'morning', place: 'wollman-rink' }, on: { type: 'reach', place: 'wollman-rink' }, does: { script: 'rink.stock' } }),
      S(2, { goal: 'Rig the Zamboni in Wollman Rink\'s garage.', where: 'The Zamboni garage at Wollman Rink\'s south end', obstacle: 'The garage door is buckled. The raccoons want a slice first ("union rules").', nudge: { by: 'ringo', text: 'Garage door\'s buckled, boss. Needs a good KICK. And Mama Mask won\'t lift a paw till she gets her slice. Union rules.' }, answer: { text: 'At Dusk, Call the horses to the Zamboni garage at the rink\'s south end and Ask them. Peck Rigby or Mama Mask with any slice, then Ask the raccoons at the Zamboni.', icon: 'horses' }, needs: { phase: 'dusk', place: 'wollman-rink', allies: ['horses', 'raccoons'], item: 'slice' }, on: { type: 'flag', flag: 'zamboni.rigged' }, does: { setFlags: ['zamboni.rigged'] } }),
      S(3, { goal: 'Launch the Zamboni over Wollman Rink\'s north boards.', where: 'The ice of Wollman Rink, by the north boards', obstacle: 'The boards and the parked cart stand between the ice and the shed.', nudge: { by: 'ringo', text: 'She\'d FLY off a big enough bump, boss. A frozen one. In the KEEP CLEAR bit. Then floor it, straight north!' }, answer: { text: 'At Night, drive laps till the hopper\'s full, Dump the snow in the KEEP CLEAR chevrons by the north boards, hold Spray till it freezes, back off and drive straight at it, north, flat out.', icon: null }, needs: { phase: 'night', place: 'wollman-rink', flags: ['zamboni.rigged'] }, on: { type: 'flag', flag: 'rink.launched' }, does: { script: 'setpiece.rinkjob' } }),
    ],
  },

  // ================================================================ Feuds & Truces
  {
    id: 'den-turtles', title: 'Something on Our Rock', thread: 'feuds', act: '1', start: 'nest-ramble', gives: { crew: 'turtles', talent: 'hints' },
    opensWhen: { flags: ['den-ducks', 'den-biscuit'] },
    steps: [
      S(1, { goal: 'Talk to the Elders on their rock in Turtle Pond.', where: 'The Elders sit on the rock in Turtle Pond, at the south end of the Great Lawn', obstacle: 'Something\'s on our rock.', needs: { phase: 'day', place: 'turtle-pond' }, on: { type: 'talk', who: 'eldest' }, does: { script: 'turtles.rock' }, target: { who: 'eldest' } }),
      S(2, { goal: 'Find out what\'s under the water by the Elders\' rock.', where: 'The bubbles beside the Elders\' rock in Turtle Pond', obstacle: 'Bubbles by the rock.', nudge: { by: 'bubbles', text: 'Bubbles by the Elders\' rock, Gus! I could dive that. I could dive that BEAUTIFULLY.' }, answer: { text: 'By day, Call the ducks to Turtle Pond and Ask them by the bubbles next to the rock.', icon: 'ducks' }, needs: { phase: 'day', place: 'turtle-pond', ally: 'ducks' }, on: { type: 'talent', clue: 'turtle-cart' }, does: { setFlags: ['turtle.cartSurfaced'], script: 'turtles.surfaced' } }),
      S(3, { goal: 'Get the shopping cart off the Turtle Pond bank.', where: 'The huge shopping cart on the bank of Turtle Pond', obstacle: 'It\'s a shopping cart. A huge one.', nudge: { by: 'shelly', text: 'A cart that size, dear? Only something BIG hauls that. A dog, say. A very large, very fluffy dog.' }, answer: { text: 'By day, Call Biscuit (or any hauler) to the cart on the bank and Ask him.', icon: 'biscuit' }, needs: { phase: 'day', place: 'turtle-pond', ally: 'haul', flags: ['turtle.cartSurfaced'] }, on: { type: 'haul', item: 'cart' }, does: { script: 'turtles.join' } }),
    ],
  },
  {
    id: 'den-geese', title: 'Geese Need Bread', thread: 'feuds', act: '1–2', start: 'nest-greatlawn', gives: { crew: 'geese', talent: 'bully', truce: 'geese-ducks' },
    opensWhen: { flags: ['den-turtles'] },
    steps: [
      S(1, { goal: 'See Gertrude\'s geese on the Lake by Bow Bridge.', where: 'Gertrude and the geese float on the Lake by Bow Bridge', obstacle: 'Gertrude won\'t share. Geese need BREAD.', needs: { phase: 'day', place: 'bow-bridge' }, on: { type: 'talk', who: 'gertrude' }, does: { script: 'geese.arm' }, target: { who: 'gertrude' } }),
      S(2, { goal: 'Give the geese a lawn of their own.', where: 'The Great Lawn\'s two signs, on its west and east sides', obstacle: 'The Great Lawn\'s picnickers would toss bread… if the signs let them.', nudge: { by: 'gander', text: 'The Great Lawn. Picnickers. Every Afternoon. If those two signs said FEED instead of DON\'T… the Honk would MOVE.' }, answer: { text: 'At Afternoon, peck signs N1 and N2 on the Great Lawn so both are live at once.', icon: null }, needs: { phase: 'afternoon', place: 'great-lawn', signs: ['N1', 'N2'] }, on: { type: 'signsLive', signs: ['N1', 'N2'] }, does: { script: 'geese.lawn' }, target: { signs: ['N1', 'N2'] } }),
      S(3, { goal: 'Seal it on the Elders\' rock in Turtle Pond.', where: 'The Elders\' rock in Turtle Pond', obstacle: 'Gertrude and Puddles have to shake.', nudge: { by: 'slowpoke', text: 'The… rock… Gus. Everyone… comes… to the rock.' }, answer: { text: 'By day, go to the Elders\' rock in Turtle Pond.', icon: null }, needs: { phase: 'day', place: 'elders-rock' }, on: { type: 'auto' }, does: { script: 'geese.truce' } }),
    ],
  },
  {
    id: 'truce-dogs-squirrels', title: 'No Squirrel Digs Where the Dogs Run', thread: 'feuds', act: '1–2', start: 'nest-ramble', gives: { truce: 'dogs-squirrels' },
    opensWhen: { flags: ['den-turtles', 'den-squirrels'] },
    steps: [
      S(1, { goal: 'See the dog walker on Cedar Hill, in the Morning.', where: 'Cedar Hill, the grassy slope east of the Ramble', obstacle: 'No squirrel digs where the dogs run.', answer: { text: 'At Morning, go to Cedar Hill when the dog walker is out.', icon: null }, needs: { phase: 'morning', place: 'cedar-hill', human: 'dogwalker' }, on: { type: 'reach', place: 'cedar-hill' }, does: { script: 'dogs.chase' } }),
      S(2, { goal: 'Dig up Old Pecan\'s 1974 cache on Cherry Hill.', where: 'The dust plume on Cherry Hill, just west of Bethesda Terrace', obstacle: 'A dust plume on Cherry Hill.', nudge: { by: 'pecan', text: 'Nineteen seventy-four, Gus. Cherry Hill. I buried something BIG there. There\'s a plume. I\'m nearly sure there\'s a plume.' }, answer: { text: 'By day, Call the squirrels to the dust plume on Cherry Hill and Ask them.', icon: 'squirrels' }, needs: { phase: 'day', place: 'cherry-hill', ally: 'squirrels' }, on: { type: 'talent', clue: 'pecan-cache' }, does: { script: 'dogs.cache' } }),
      S(3, { goal: 'Take the sack to the dog walker on Cedar Hill.', where: 'The dog walker on Cedar Hill, east of the Ramble, in the Morning', obstacle: 'Eight dogs. One sack.', nudge: { by: 'pretzel', text: 'A BALL? Where? WHERE? …Bring us balls, Gus. LOTS of balls. Nobody chases a squirrel with a ball in the air.' }, answer: { text: 'At Morning, carry the sack (low and slow) to Cedar Hill and drop it by the dog walker.', icon: null }, needs: { phase: 'morning', place: 'cedar-hill', item: 'tennis-sack', human: 'dogwalker' }, on: { type: 'drop', item: 'tennis-sack', place: 'cedar-hill' }, does: { script: 'dogs.balls' } }),
    ],
  },
  {
    id: 'part-legs', title: 'Two Old Drainpipes', thread: 'feuds', act: '2', start: 'nest-greatlawn', gives: { part: 'legs' },
    opensWhen: { flags: ['den-strix', 'truce-dogs-squirrels'] },
    steps: [
      S(1, { goal: 'Find the old pipes under the Great Lawn\'s north edge.', where: 'The north edge of the Great Lawn, by the transverse road', obstacle: 'Only Night Eyes can see where.', nudge: { by: 'hoot', text: 'What lies under a lawn, is long as a bench, and nobody\'s seen since 1890? …Ask the Professor. At Night.' }, answer: { text: 'At Night, Call Strix to the Great Lawn\'s north edge and Ask her.', icon: 'strix' }, needs: { phase: 'night', place: 'great-lawn-pipes', ally: 'strix' }, on: { type: 'talent', clue: 'pipe-marks' }, does: { setFlags: ['legs.marked'], script: 'legs.marked' } }),
      S(2, { goal: 'Dig the pipes up on the Great Lawn\'s north edge.', where: 'The north edge of the Great Lawn, by the transverse road', obstacle: 'Two plumes on a dog lawn.', nudge: { by: 'pretzel', text: 'We stand guard now! Squirrels dig, dogs guard. That\'s the DEAL. Two plumes on the north edge, Gus!' }, answer: { text: 'By day, Call the squirrels to each plume on the Great Lawn\'s north edge and Ask them (the dogs stand guard now).', icon: 'squirrels' }, needs: { phase: 'day', place: 'great-lawn-pipes', ally: 'squirrels', flags: ['legs.marked', 'truce-dogs-squirrels'] }, on: { type: 'flag', flag: 'legs.dug' }, does: { script: 'legs.dug' } }),
      S(3, { goal: 'Get the two pipes to the Workshop.', where: 'The two pipes beside the transverse road, on the Great Lawn\'s north edge', obstacle: 'Huge, beside the transverse road.', nudge: { by: 'bigben', text: 'Hup.' }, answer: { text: 'By day, Call the horses (the road is right there) or Biscuit to each pipe and Ask them.', icon: 'horses' }, needs: { phase: 'day', place: 'great-lawn-pipes', ally: 'haul-road', flags: ['legs.dug'] }, on: { type: 'haul', item: 'pipe', count: 2 } }),
    ],
  },
  {
    id: 'part-power', title: 'The Wedding', thread: 'feuds', act: '3', start: 'nest-mall', gives: { part: 'power', scarf: 'wedding-white' },
    opensWhen: { flags: ['den-geese', 'den-rhoda'] },
    steps: [
      S(1, { goal: 'See what the ducks spotted on Bow Bridge.', where: 'Bow Bridge on the Lake, where a wedding party waits', obstacle: 'The wedding won\'t leave until they get their dove release. The doves never showed.', answer: { text: 'By day, fly to Bow Bridge on the Lake.', icon: null }, needs: { phase: 'day', place: 'bow-bridge', human: 'wedding' }, on: { type: 'reach', place: 'bow-bridge' }, does: { script: 'wedding.intro' } }),
      S(2, { goal: 'Give the Bow Bridge wedding its dove release.', where: 'The planner with the empty wicker basket on Bow Bridge', obstacle: 'The planner holds an empty wicker basket.', nudge: { by: 'dove', text: 'A dove release, darling? With no doves? I could… no. No. Well. Perhaps. Forty weddings and NOBODY checked.' }, answer: { text: 'By day, with Dove in your flock, Peck the planner\'s empty basket on Bow Bridge.', icon: null }, needs: { phase: 'day', place: 'bow-bridge', dove: true, human: 'wedding' }, on: { type: 'peck', target: 'wedding-basket' }, does: { setFlags: ['wedding.doveReleased'], script: 'wedding.release' } }),
      S(3, { goal: 'Clear the wedding party off Bow Bridge.', where: 'The wedding\'s group shot on Bow Bridge', obstacle: 'The group shot blocks the bridge.', nudge: { by: 'gander', text: 'A crowd that won\'t budge? Nobody moves for a polite pigeon. EVERYBODY moves for a goose.' }, answer: { text: 'By day, while the party poses for the group shot, Call the geese to Bow Bridge and Ask them.', icon: 'geese' }, needs: { phase: 'day', place: 'bow-bridge', ally: 'geese', flags: ['wedding.doveReleased'], human: 'wedding' }, on: { type: 'ask', ally: 'geese', place: 'bow-bridge' }, does: { script: 'setpiece.wedding', setFlags: ['wedding.cleared'] } }),
      // Fixes-2 (P7): no step 4. "Showpieces end on the laugh": inside the stampede Bubbles surfaces the battery and Rhoda
      // carries it off (setpiece.wedding), so the scheme ends on the photo instead of a Call-Ask-Call-Ask chore after it.
    ],
  },
  {
    id: 'den-rhoda', title: 'Rhoda Raids the Meer', thread: 'feuds', act: '2–3', start: 'nest-north', gives: { crew: 'rhoda', talent: 'lift', setFlags: ['spike.P4.cleared'] },
    opensWhen: { flags: ['prologue', 'den-raccoons'] },
    steps: [
      S(1, { goal: 'Ask Big Sal at the Blockhouse what\'s wrong at the Meer.', where: 'Big Sal holds court at the old stone Blockhouse, west of Harlem Meer', obstacle: 'Rhoda raids the Meer.', needs: { phase: 'day', place: 'meer' }, on: { type: 'talk', who: 'bigsal' }, does: { script: 'rhoda.sal' }, target: { who: 'bigsal' } }),
      S(2, { goal: 'Face Rhoda over Harlem Meer.', where: 'Harlem Meer, the lake in the park\'s north-east corner', obstacle: 'She only dives when you\'re over the water and low.', nudge: { by: 'pip', text: 'She only dives over the water, when you\'re low. Then she skims. THEN you get her. Three times! …I\'m not scared. A little.' }, answer: { text: 'At Afternoon, fly low over Harlem Meer. When Rhoda skims after a dive, fly into her: three times.', icon: null }, needs: { phase: 'afternoon', place: 'meer' }, on: { type: 'reach', place: 'meer' }, does: { script: 'fight.rhoda', setFlags: ['rhoda.beaten'] } }),
      S(3, { goal: 'Give Rhoda back her ledge at Fifth & 74th.', where: 'Walter\'s building on Fifth Avenue at 74th, with the spiked ledge', obstacle: 'Bolted spikes at Fifth & 74th. Walter never lets pigeons up.', nudge: { by: 'tux', text: 'Walter lets raccoons up the back stairs, darling. Never pigeons. And he does adore a HOT slice.' }, answer: { text: 'Peck a hot slice to Walter at Dusk, then Call the raccoons there in the same phase.', icon: 'raccoons' }, needs: { phase: 'dusk', place: 'fifth-74', item: 'slice', hot: true, ally: 'raccoons' }, on: { type: 'talent', clue: 'walter-stairs' }, phaseScoped: ['walter.doorOpen'], does: { script: 'rhoda.home' } }),
    ],
  },
  {
    id: 'den-meermob', title: 'Show Me Your Crew', thread: 'feuds', act: '3', start: 'nest-north', gives: { crew: 'meermob', flock: 14, talent: 'muscle' },
    opensWhen: { flags: ['den-rhoda'] },
    steps: [
      S(1, { goal: 'Fly the flypast through the Blockhouse arch.', where: 'The arch of the old stone Blockhouse, west of Harlem Meer', obstacle: 'Big Sal: "Show me your crew." Thirty or more.', nudge: { by: 'feathers', text: 'Thirty, kid. Through the arch, low and in a line. I count every head.' }, answer: { text: 'By day, with a flock of 30 or more, fly low through the Blockhouse arch.', icon: null }, needs: { phase: 'day', place: 'blockhouse', flock: 30 }, on: { type: 'flag', flag: 'meer.flypast' }, does: { script: 'meer.flypast' } }),
      S(2, {
        goal: 'Seal the deal with Big Sal at the Blockhouse.', where: 'Big Sal at the old stone Blockhouse, west of Harlem Meer', obstacle: 'Feast: 60 crumbs. Or three slices.',
        nudge: { by: 'knuckles', text: 'Sal don\'t shake on an empty stomach. Sixty crumbs. Or slices. He ain\'t fussy about slices.' },
        answer: { text: 'By day, Coo at the Blockhouse with 60 crumbs for a feast, or Peck Big Sal three slices (hot or cold).', icon: null },
        alts: [
          { needs: { phase: 'day', place: 'blockhouse', crumbs: 60 }, on: { type: 'coo', hold: false, place: 'blockhouse' }, does: { take: { crumbs: 60 } } },
          { needs: { phase: 'day', place: 'blockhouse', item: 'slice', count: 3 }, on: { type: 'give', item: 'slice', to: 'bigsal', count: 3 } },
        ],
        does: { script: 'meer.join' },
      }),
    ],
  },

  // ================================================================ Lost & Found
  {
    id: 'den-squirrels', title: 'Hazel Forgot', thread: 'lost', act: '1', start: 'nest-mall', gives: { crew: 'squirrels', talent: 'dig' },
    opensWhen: { flags: ['prologue'] },
    steps: [
      S(1, { goal: 'Talk to Hazel on Sheep Meadow.', where: 'Hazel scurries about Sheep Meadow, the big lawn west of the Mall', obstacle: 'Hazel lost 3 caches.', needs: { phase: 'day', place: 'sheep-meadow' }, on: { type: 'talk', who: 'hazel' }, does: { script: 'squirrels.meet' } }),
      S(2, { goal: 'Find Hazel\'s three caches on Sheep Meadow.', where: 'Sheep Meadow, the big lawn west of the Mall', obstacle: 'The plumes only show from above 10 m.', nudge: { by: 'twitch', text: 'Up-up-UP-Gus-dust-you-see-it-from-up-' }, answer: { text: 'Fly more than 10 m above Sheep Meadow: three dust plumes show. Land by each and peck it.', icon: null }, needs: { phase: 'day', place: 'sheep-meadow' }, on: { type: 'flag', flag: 'hazel.caches3' } }),
      S(3, { goal: 'Go back to Hazel on Sheep Meadow.', where: 'Hazel scurries about Sheep Meadow, the big lawn west of the Mall', obstacle: '', needs: { phase: 'day', place: 'sheep-meadow' }, on: { type: 'talk', who: 'hazel' }, does: { script: 'squirrels.join' } }),
    ],
  },
  {
    id: 'den-crows', title: 'Three Shinies', thread: 'lost', act: '1', start: 'nest-ramble', gives: { crew: 'crows', talent: 'trade', setFlags: ['workshop'] },
    opensWhen: { flags: ['den-squirrels', 'den-ducks'] },
    steps: [
      S(1, { goal: 'Talk to Vesper at the Exchange oak in the Ramble.', where: 'Vesper perches at the Exchange, the big oak in the middle of the Ramble', obstacle: 'Entry fee: 3 shinies.', needs: { phase: 'day', place: 'ramble' }, on: { type: 'talk', who: 'vesper' }, does: { script: 'crows.meet' } }),
      S(2, { goal: 'Bring Vesper three shinies.', where: 'Vesper waits at the Exchange oak in the middle of the Ramble', obstacle: 'One on a CPW ledge, one under a plume, one under the Lake.', nudge: { by: 'cawdry', text: 'Ledge on Central Park West, by 72nd. Plume east of the oak. Bubbles out on the Lake. Call your friends.' }, answer: { text: 'Peck the glint on a CPW ledge by 72nd yourself; Call the squirrels to the dust plume east of the Exchange oak; Call the ducks to the bubbles on the Lake. Bring each shiny to Vesper.', icon: null }, needs: { phase: 'day', allies: ['squirrels', 'ducks'] }, on: { type: 'give', item: 'shiny', to: 'vesper', count: 3 } }),
      S(3, { goal: 'Follow Vesper to the cave.', where: 'The Workshop cave in the Ramble', obstacle: '', auto: true, needs: {}, on: { type: 'auto' }, does: { script: 'crows.join' } }),
    ],
  },
  {
    id: 'den-biscuit', title: 'Biscuit\'s Ball', thread: 'lost', act: '1', start: 'nest-ramble', gives: { crew: 'biscuit', talent: 'fetch' },
    opensWhen: { flags: ['den-ducks'] },
    steps: [
      S(1, { goal: 'See why Biscuit is moping on Cedar Hill.', where: 'Biscuit mopes on his blanket on Cedar Hill, the grassy slope east of the Ramble', obstacle: 'His ball is in the Lake.', needs: { phase: 'day', place: 'cedar-hill' }, on: { type: 'talk', who: 'biscuit' } }),
      S(2, { goal: 'Get Biscuit\'s ball out of the Lake.', where: 'The bubbles on the Lake\'s east arm, by the Loeb Boathouse', obstacle: 'Bubble rings out on the Lake\'s east arm.', needs: { phase: 'day', place: 'lake', ally: 'ducks' }, on: { type: 'talent', clue: 'ball-lake' }, nudge: { by: 'pretzel', text: 'The BALL! It went SPLASH! Out by the bubbles! Who swims? Who goes UNDER?' }, answer: { text: 'By day, Call the ducks to the bubbles on the Lake\'s east side and Ask them.', icon: 'ducks' } }),
      S(3, { goal: 'Bring the ball back to Biscuit\'s blanket on Cedar Hill.', where: 'Biscuit\'s blanket on Cedar Hill, east of the Ramble', obstacle: 'He charges. And the ball is heavy.', needs: { phase: 'day', place: 'cedar-hill', item: 'ball' }, on: { type: 'reach', place: 'cedar-hill' }, does: { script: 'fight.biscuit', setFlags: ['biscuit.fightWon'] }, nudge: { by: 'fifi', text: 'He charges at anything near HIS ball. Duck behind the benches, darling, and dash when he\'s puffed out.' }, answer: { text: 'Carry the ball low to his blanket on Cedar Hill. When Biscuit charges, hide behind a bench; drop the ball and he guards it.', icon: null } }),
    ],
  },
  {
    id: 'den-strix', title: 'Spectacles', thread: 'lost', act: '2', start: 'nest-ramble', gives: { crew: 'strix', talent: 'nighteyes' },
    opensWhen: { flags: ['den-crows', 'gear-headlamp'] },
    steps: [
      S(1, { goal: 'Buy Strix\'s spectacles at the Exchange oak.', where: 'The stall under the Exchange oak, in the middle of the Ramble', obstacle: '10 crumbs on the stall.', needs: { phase: 'day', place: 'exchange' }, on: { type: 'pickup', item: 'spectacles' }, nudge: { by: 'ledger', text: 'Spectacles on the stall, ten crumbs. I write it in the book. Peck them.' }, answer: { text: 'By day, with 10 crumbs, peck the spectacles on the Exchange oak\'s stall.', icon: null } }),
      S(2, { goal: 'Take the spectacles to Strix, on foot, through the night woods.', where: 'The path into the night woods, just north of Bow Bridge', obstacle: 'Flapping is the loudest sound in the woods.', needs: { phase: 'night', place: 'ramble-stealth', gear: 'headlamp', item: 'spectacles' }, on: { type: 'reach', place: 'ramble-stealth' }, does: { script: 'stealth.strix' }, nudge: { by: 'hoot', text: 'Walk, little pigeon. Never flap. Stay in the moss, and stop when the owl turns.' }, answer: { text: 'At Night, with the headlamp and the spectacles, walk (never fly) through the night woods to Strix, keeping to the moss and freezing when her eyes sweep.', icon: null } }),
    ],
  },
  {
    id: 'gear-sunglasses', title: 'Photobomb', thread: 'lost', act: '1', start: 'nest-pond', gives: { gear: 'sunglasses' },
    opensWhen: { flags: ['den-crows'] },
    steps: [
      S(1, { goal: 'Get the shiny off the Plaza Hotel\'s flagpole.', where: 'The top of the Plaza Hotel\'s flagpole, on Grand Army Plaza', obstacle: '', needs: { phase: 'any', place: 'grand-army-plaza' }, on: { type: 'pickup', item: 'shiny' }, nudge: { by: 'glint', text: 'Something SHINY on top of the Plaza Hotel\'s flagpole. Up, up, up. It\'s science.' }, answer: { text: 'Fly up to the top of the Plaza Hotel flagpole by Grand Army Plaza and peck the shiny.', icon: null } }),
      // Fun pass (P6): a photobomb by framing, not mobbing (a swarm gets "Ugh. Pigeons."): stand on the rim behind him, in
      // his shot, and he lowers the phone to show his friend (src/schemes/gear-sunglasses.js)
      S(2, { goal: 'Swap it for the selfie tourist\'s sunglasses.', where: 'The selfie tourist by the Grand Army Plaza fountain', obstacle: 'He won\'t look up from his phone. So get IN it.', nudge: { by: 'monty', text: 'A selfie, darling, is a stage. Be IN the shot. Behind him, on the rim. Hold still.' }, answer: { text: 'Stand on the fountain rim right behind him (where his phone points) for a moment; when he shows his friend the shot, Call the crows and Ask them.', icon: 'crows' }, needs: { phase: 'day', place: 'grand-army-plaza', ally: 'crows', crumbs: 10, item: 'shiny', human: 'selfie' }, on: { type: 'trade', id: 'sunglasses' }, target: { at: { x: 93, z: -36, label: 'The selfie tourist' } } }),
    ],
  },
  {
    id: 'gear-pen', title: 'The Cufflink', thread: 'lost', act: '1', start: 'nest-mall', gives: { gear: 'pen' },
    opensWhen: { flags: ['gear-sunglasses', 'den-cats'] },   // Fun pass (P8): the cats knock the glass
    steps: [
      S(1, {
        // Fun pass (P8): no swarm (a flock at the table gets "Shoo!"): a wine glass on the next table's edge is a cat job
        goal: 'Get the cufflink on the Tavern on the Green patio.', where: 'The waiter on the Tavern on the Green patio, west of Sheep Meadow', obstacle: 'The waiter is standing on it. He won\'t move off it… unless something more expensive than a cufflink needs him.', does: { script: 'pen.cufflink' }, nudge: { by: 'pickles', text: 'A glass, right on the edge of a table? Darling. It\'s practically a REQUEST.' }, answer: { text: 'At Afternoon, in sunglasses, Call the cats to the Tavern patio and Ask them by the wine glass teetering on the table edge: the waiter rushes over with a dustpan. Or have the songbirds ring the patio phone.', icon: 'cats' },
        alts: [
          { needs: { phase: 'afternoon', place: 'tavern', gear: 'sunglasses', ally: 'cats', human: 'waiter' }, on: { type: 'pickup', item: 'cufflink' } },
          { needs: { phase: 'afternoon', place: 'tavern', gear: 'sunglasses', ally: 'songbirds', human: 'waiter' }, on: { type: 'pickup', item: 'cufflink' } },
        ],
      }),
      S(2, { goal: 'Trade it with the sidewalk artist on the Mall.', where: 'The sidewalk artist in the beret, at the north end of the Mall', obstacle: '10 crumbs.', needs: { phase: 'afternoon', place: 'mall', ally: 'crows', crumbs: 10, item: 'cufflink', human: 'artist' }, on: { type: 'trade', id: 'pen' }, does: { script: 'pen.portrait' }, nudge: { by: 'ledger', text: 'The sidewalk artist on the Mall, Afternoons. She\'d draw ANYTHING for a gold cufflink. Call us next to her.' }, answer: { text: 'At Afternoon, with the cufflink and 10 crumbs, Call the crows to the sidewalk artist on the Mall and Ask them.', icon: 'crows' } }),
    ],
  },
  {
    id: 'gear-headlamp', title: 'The Jogger Who Never Stops', thread: 'lost', act: '1', start: 'nest-reservoir', gives: { gear: 'headlamp' },
    opensWhen: { flags: ['den-crows', 'den-rats'] },   // Fun pass (P9): the key is down the rats' grate
    steps: [
      // Fun pass (P9): Grate Fetch in Act 1 (it slept until part-beak), and one dive fewer
      S(1, { goal: 'Find the jogger\'s lost key.', where: 'The subway grate on Central Park West at 86th, by the Reservoir', obstacle: 'It went through a grate by the Reservoir, mid-lap.', nudge: { by: 'pinstripe', text: 'Something jingly down OUR grate at 86th. Ask us.' }, answer: { text: 'By day, Call the rats to the 86th Street West grate (Central Park West) and Ask them.', icon: 'rats' }, needs: { phase: 'day', place: 'grate-86w', ally: 'rats' }, on: { type: 'talent', clue: 'key-grate' }, does: { script: 'headlamp.key' }, target: { at: { x: -128, z: 547.96, label: 'The 86th Street grate' } } }),
      S(2, {
        goal: 'Trade the key to the Reservoir jogger.', where: 'The joggers circle the Reservoir track, Mornings and Dusk', obstacle: 'He never stops running.', does: { script: 'headlamp.trade' }, nudge: { by: 'cawdry', text: 'Jogger stops once a lap. Water fountain, north gatehouse. Like clockwork.' }, answer: { text: 'At Morning or Dusk, wait with the crows at the water fountain by the Reservoir\'s north gatehouse: the jogger stops there once a lap. Ask the crows while he drinks. (Or have the songbirds ring his phone.)', icon: 'crows' },
        alts: [
          { needs: { phase: ['morning', 'dusk'], place: 'reservoir-track', allies: ['songbirds', 'crows'], crumbs: 10, item: 'key', human: 'jogger' }, on: { type: 'trade', id: 'headlamp' } },
          { needs: { phase: ['morning', 'dusk'], place: 'north-gatehouse', ally: 'crows', crumbs: 10, item: 'key', human: 'jogger' }, on: { type: 'trade', id: 'headlamp' } },
        ],
      }),
    ],
  },
  {
    id: 'part-wings', title: 'Two Sails', thread: 'lost', act: '1', start: 'nest-mall', gives: { part: 'wings' },
    opensWhen: { flags: ['den-crows'] },
    steps: [
      S(1, { goal: 'Raise the sunken sailboat on Conservatory Water; carry its sail to the Workshop.', where: 'The bubbles on Conservatory Water, the model-boat pond near Fifth Avenue', obstacle: 'Bubbles on Conservatory Water.', needs: { phase: 'day', place: 'conservatory', ally: 'ducks' }, on: { type: 'reach', place: 'workshop' }, reachNeeds: { item: 'sail' }, does: { take: { item: 'sail' }, setFlags: ['wings.sail1in'], script: 'wings.sail1' }, nudge: { by: 'bubbles', text: 'Bubbles on Conservatory Water! I could dive that. I could dive that SO well.' } }),
      S(2, {
        goal: 'Get the RC remote from the kid at Conservatory Water.', where: 'The kid with the remote at Conservatory Water, in the Afternoon', obstacle: 'A kid clutches it.', does: { script: 'wings.remote' }, nudge: { by: 'glint', text: 'That kid would swap the remote for something shiny. Everyone would. It\'s science.' }, answer: { text: 'At Afternoon, buy a shiny at the Exchange stall (15 crumbs) and Call the crows to the RC kid at Conservatory Water. Or have the songbirds play the ice-cream jingle.', icon: 'crows' },
        alts: [
          { needs: { phase: 'afternoon', place: 'conservatory', ally: 'crows', crumbs: 10, item: 'shiny', human: 'rckid' }, on: { type: 'trade', id: 'remote' } },
          { needs: { phase: 'afternoon', place: 'conservatory', ally: 'songbirds', human: 'rckid', flags: ['den-songbirds'] }, on: { type: 'pickup', item: 'remote' } },
        ],
      }),
      S(3, { goal: 'Tow the second boat out from under the spout, and carry its sail in.', where: 'The sailboat under the fountain spout on Conservatory Water', obstacle: 'That\'s a SHOWER, Gus.', needs: { phase: 'any', place: 'conservatory', gear: 'remote' }, on: { type: 'reach', place: 'workshop' }, reachNeeds: { item: 'sail', flags: ['wings.sail2'] }, does: { take: { item: 'sail' }, script: 'wings.sail2' } }),
    ],
  },
  {
    id: 'part-beak', title: 'Take a Cone, Kid', thread: 'lost', act: '2–3', start: 'nest-ramble', gives: { part: 'beak' },
    opensWhen: { flags: ['den-crows', 'den-rats'], anyOf: [['den-horses', 'den-raccoons'], ['den-horses', 'den-biscuit']] },
    steps: [
      S(1, { goal: 'Get the foreman\'s lucky sticker back.', where: 'The grate on Fifth Avenue at 77th, by the construction site', obstacle: 'It went down the 77th E grate.', needs: { phase: ['morning', 'afternoon'], place: 'fifth-76', ally: 'rats', human: 'foreman' }, on: { type: 'talent', clue: 'sticker-grate' }, does: { script: 'beak.sticker' }, answer: { text: 'Morning or Afternoon, Call the rats to the 77th Street East grate by the construction site and Ask them.', icon: 'rats' }, nudge: { by: 'pinstripe', text: 'Something lucky down the 77th Street grate. Our grate. Ask us.' } }),
      S(2, { goal: 'Trade the sticker to the foreman for a cone.', where: 'The foreman in the hard hat at the construction site, Fifth Avenue & 76th', obstacle: '10 crumbs.', needs: { phase: ['morning', 'afternoon'], place: 'fifth-76', ally: 'crows', crumbs: 10, item: 'sticker', human: 'foreman' }, on: { type: 'trade', id: 'cone' }, does: { script: 'beak.deal' }, nudge: { by: 'ledger', text: 'Foreman wants his sticker back. Call us next to him. Ten crumbs, in the book.' }, answer: { text: 'With the sticker and 10 crumbs, Call the crows to the foreman at Fifth & 76th and Ask them.', icon: 'crows' } }),
      S(3, {
        goal: 'Open the jammed sidewalk-shed gate at Fifth & 76th.', where: 'The sidewalk shed\'s gate at the construction site, Fifth Avenue & 76th', obstacle: 'It\'s jammed.', does: { script: 'beak.gate' }, nudge: { by: 'bigben', text: 'Hup.' }, answer: { text: 'By day, Call the horses to the jammed gate and Ask them (Big Ben kicks it AND pulls the cone home). Or at Dusk, have the raccoons Rig its latch, then get a hauler for the cone.', icon: 'horses' },
        alts: [
          { needs: { phase: 'day', place: 'fifth-76', ally: 'horses' }, on: { type: 'talent', clue: 'shed-gate', ally: 'horses' } },
          { needs: { phase: 'dusk-night', place: 'fifth-76', ally: 'raccoons' }, on: { type: 'talent', clue: 'shed-gate', ally: 'raccoons' } },
        ],
      }),
      // Fun pass (P12): with the horses, Big Ben kicks the gate AND pulls the cone home in one scene (beak.gate sets cone.home),
      // so this step completes at once; after the raccoons' route it is the haul (part-beak.js sets cone.home when it arrives)
      S(4, {
        goal: 'Haul the huge cone home.', where: 'The huge cone on the kerb at Fifth Avenue & 76th', obstacle: 'Huge, on the kerb.', nudge: { by: 'biscuit', text: 'A CONE! A big orange one! I could fetch that! I could fetch that SO far!' }, answer: { text: 'By day, Call Biscuit (or the horses) to the cone on the kerb and Ask them.', icon: 'biscuit' },
        alts: [
          { needs: { phase: 'day', place: 'fifth-76', ally: 'horses' }, on: { type: 'flag', flag: 'cone.home' } },
          { needs: { phase: 'day', place: 'fifth-76', ally: 'biscuit' }, on: { type: 'flag', flag: 'cone.home' } },
        ],
      }),
    ],
  },

  // ================================================================ Photo mode (#9): "Say Cheese" (src/schemes/say-cheese.js)
  // Opens after the Prologue and sits last before the finale, so openList()[0] and the Prologue's tracking don't change.
  // The camera: a tourist in a window over CPW (71st–72nd) guards his old film camera on the ledge; get in his shot (or
  // Coo under him) and he forgets it. Flicker (a crow who hoards film) loads it for a portrait; the first photo, of
  // Flicker, finishes the card. Photo mode itself is ui/photo.js (open once Gus has the camera: gear 'camera').
  {
    id: 'say-cheese', title: 'Say Cheese', thread: 'lost', act: '1', start: 'nest-ramble', gives: {},
    opensWhen: { flags: ['prologue'] },
    steps: [
      S(1, {
        goal: 'Borrow the old film camera from the tourist\'s window ledge over CPW.', where: 'A tourist\'s window ledge on Central Park West, between 71st and 72nd', obstacle: 'He\'s guarding it while he snaps the skyline. Get in his shot, or give him a Coo.',
        nudge: { by: 'cawdry', text: 'Tourist in a window over CPW, past 71st. Old camera on the ledge. Stand in his shot and he forgets everything.' },
        answer: { text: 'Fly to the ledge under the tourist\'s window on Central Park West, between 71st and 72nd. Land on the ledge beside his balcony (or stand in front of his lens) and hold still a moment, or Coo below him. When he turns away, Peck the old camera on the ledge.', icon: null },
        needs: { phase: 'any', place: 'cpw-71-window' }, on: { type: 'pickup', item: 'camera' }, target: { at: { x: -129.6, z: 262.35, label: 'The tourist\'s camera' } },
      }),
      S(2, {
        goal: 'Take the camera to Flicker, the crow who hoards film.', where: 'Flicker the crow, on the slope below Belvedere Castle, at the Ramble\'s north-east edge', obstacle: 'An empty camera takes no pictures.',
        nudge: { by: 'glint', text: 'Flicker hoards film. Canisters, rolls, the lot. Bring Flicker a camera and see what happens.' },
        answer: { text: 'Carry the camera to Flicker (the crow with a film canister on a red cord, on the slope below Belvedere Castle, at the Ramble\'s north-east edge) and Peck Flicker to give it.', icon: null },
        needs: {}, on: { type: 'give', item: 'camera', to: 'flicker' },
        does: { take: { item: 'camera' }, give: { gear: 'camera' }, setFlags: ['photo.film'], script: 'photo.film' },
      }),
      S(3, {
        goal: 'Open photo mode and snap Flicker\'s portrait.', where: 'Flicker the crow, on the slope below Belvedere Castle, at the Ramble\'s north-east edge', obstacle: 'Flicker is ready for a close-up.',
        nudge: { by: 'flicker', text: 'Well? Open photo mode and SNAP me. Both sides are my good side.' },
        answer: { text: 'Open photo mode (Pause, then Photo), turn the camera until Flicker is in the picture, and snap.', icon: null },
        needs: {}, on: { type: 'flag', flag: 'photo.flicker' },
      }),
    ],
  },

  // ================================================================ finale
  {
    id: 'finale', title: 'Feed the Birds', thread: null, act: 'Finale', start: 'nest-ramble', gives: {},
    opensWhen: { crews: 17, parts: 8 },
    steps: [S(1, { goal: 'Open the Workshop doors.', where: 'The Workshop cave in the Ramble', obstacle: '', needs: { place: 'workshop' }, on: { type: 'reach', place: 'workshop' }, does: { script: 'finale' } })],
  },
];

export const SCHEME = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
export const PARTS = ['body', 'talons', 'legs', 'wings', 'eyes', 'beak', 'voice', 'power'];
export const PART_NAMES = { body: 'Body', talons: 'Talons', legs: 'Legs', wings: 'Wings', eyes: 'Eyes', beak: 'Beak', voice: 'Voice', power: 'Power core' };
export const GEAR_NAMES = { sunglasses: 'Sunglasses', pen: 'Paint pen', headlamp: 'Headlamp', remote: 'RC remote', camera: 'Film camera' };   // photo mode (#9): camera

/** Flags a nap clears (phase-scoped world effects). Everything else persists. */
export const NAP_CLEARS = ['walter.doorOpen', 'zamboni.ramps', 'relay.used', 'falafel.got'];
