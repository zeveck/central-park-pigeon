# Central Park Pigeon

*One pigeon. Seventeen crews. Five schemes on the go. Eight stolen parts. One very large robot.*

## Pitch

You're Gus, a scruffy Central Park pigeon. One day a "Don't Feed the Birds" sign gives you an idea: take over the park, then the city, and maybe the world. Fly and waddle across a big, recognisable 3D Central Park and the city block around it. The park is crowded: hundreds of squirrels, ducks, crows, rats, geese, songbirds, bodega cats and carriage horses. You win over each crew through its boss and a few named regulars, and every member joins with them.

You run **five schemes at once**: the Sign War against the rangers, the Slice Run (pizza is currency), a war on the Spike Man who keeps spiking your perches, a string of animal feuds to settle, and the crows' Lost & Found market. The schemes share places, friends and pizza, so a win in one opens a shortcut in another. Somewhere along the way you'll launch a stolen Zamboni off a ramp you built out of its own snow, and get a white pigeon named Dove booked as a wedding's "dove release". Out of it all come eight parts for the Mecha-Pigeon. It stomps down Fifth Avenue, climbs the Empire State Building and shouts **"FEED THE BIRDS!"** It's a cosy open-world puzzle caper: it's about plans, not reflexes.

## Settings

- Platform: **desktop-first** (keyboard and mouse) plus **controller** (`--gamepad`) is the real target, and the performance budgets are set for desktop. **Phones are best-effort:** they load and play in landscape with touch controls and an automatic Low preset (lower crowd density and draw range). Phone limits don't shape the design; phone testing is a smoke test.
- Target: **web**, plain HTML + JavaScript ES modules, no build step, **three.js r186** vendored from meshgen
- 3D: **yes**. Models from meshgen (Meshy). Concept pictures and portraits from imagegen2. Textures and the sky/skyline bands from nanogen. Music, sound and voice from audiogen.
- Scope: **large**, judged from the request: a big explorable park plus a city ring, 17 recruitable crews (about 700 animals, with named bosses and regulars), 4 pigeon gangs among them, 5 parallel puzzle threads, 30 schemes, 8 Mecha parts and a two-part finale. About 1.5 to 2 hours for a full playthrough.
- Budget: **$100** for all generated models, pictures, music and sound (raised from $50 by the person: "The goal isn't to spend it all, but to keep from compromising."). The plan below spends about $94.10 (≈ $5.80 of it already spent; $48.86 of it is Meshy credits, mostly already in the account) and keeps about $5.90 in reserve; see "Effort and cost estimate". The 15 mock pictures (≈ $1.00) and the 65 character-card pictures (≈ $4.80) are **done and accepted**. The cards are the in-game portraits and the source for most concept pictures; they are never regenerated or replaced.
- In-game **"Report a bug"** button: on (`--feedback`)
- Tools available: imagegen2, nanogen, audiogen (ElevenLabs creator plan), meshgen (3,402 Meshy credits: 1,402 monthly, which reset on 2026-12-01, plus 2,000 permanent; see "Meshy credit plan"), node, python3 + Pillow, playwright-cli
- Credit: **Rich Conlan**
- Decisions made on the player's behalf:
  - **Map scale.** The map is "fairly accurate": every landmark sits in its real order and place, but the park is squeezed to about 1:3.8. The real park is 4 km; ours is about 1,050 m, so it flies end to end in about 95 seconds at cruise. People, benches and trees stay life-size.
  - **City ring.** "Maybe a block of NYC around it" became a ring of **one city block on every side**: Central Park South, Fifth Avenue, Central Park West and 110th Street. It has climbable, perchable buildings, plus slice joints, bodegas, carts, doormen, strays and allies.
  - **Who climbs.** The Empire State Building climber is the **Mecha-Pigeon, piloted by Gus**, with Gus riding on its head for the shout.
  - **Fights.** Every fight is a short "outwit it" encounter: dodge, distract, swarm. There are no health-bar slogs. Each fight has a rule that stops you skipping it by flying away (see "Fights"). Every animal you fight (owl, hawk, dog) **becomes an ally afterwards**: "recruit *all* the denizens."
  - **Crews, not individuals** (request #2). Each species is a big crowd. You talk to a boss and three named regulars; the rest are the crowd that turns friendly when the crew joins.
  - **New species** (request #3). **Bodega cats**, **carriage horses**, **songbirds** (sparrows, starlings, robins, blue jays, cardinals, migrating warblers) and **waterbirds** (Canada geese, with herons as regulars). Rats and turtles stay.
  - **Five threads** (request #6). The sign war is now one of five parallel campaigns. Crews and parts come out of the threads.
  - **Pizza** (request #5). Slices are carried like any light item and handed over as bribes. They cool down; some takers only want them hot.
  - **The Engine part is now the Talons.** The Spike Man's spike strips become the Mecha's claws.
  - **The Zamboni is back** (request #13), as the Spikes thread's showpiece: **the Rink Job** (`part-talons`). Prickett stores his stock in Wollman Rink's equipment shed, and the rangers park their South cart across its door. The raccoons rig the rink's Zamboni; you pile its snow into a ramp, freeze it, and launch over the boards. One landing wins two threads. It replaces the old van heist (the van stays as Prickett's scenery vehicle) and folds in the old South-cart sabotage, so the scheme count drops by one. The Zamboni stays drivable in free roam.
  - **Dove** (request #13 follow-up): a pure-white pigeon in the Plaza Swells whom everyone takes for a dove. She's the "dove release" in the Bow Bridge wedding that the geese then break up (`part-power`).
  - **Pigeon colour morphs.** The park's pigeons come in 13 real morphs (blue bar, blue and dark checker, mostly black, mostly white, ash-red, red checker, pied and splashed, silver-dun, grizzle, brown pied, mealy, and Dove's pure white, with all sorts of neck sheens), mixed through every gang and the strays. The named pigeons' cards set the colours.
  - **The character cards are the portraits.** The accepted card pictures (65 in `design/mockups/cards/`, plus the 7 mocks used as cards: Gus, the ranger, Hazel, Puddles, Vesper, Rigby, Biscuit) are each character's portrait everywhere in the game. The in-game models are dressed to match them (see "Who wears what").
  - **"Maybe the world"** is a post-credits sting (one painted still), not a third map.
  - **Season.** Late autumn: gold and red trees, skaters at Wollman, warblers migrating through the Ramble and geese flying over in V's.
  - **Real places and life, original characters.** Real landmarks and real kinds of park and city life (carriage horses, slice joints, doormen, birders). No real people, brands or famous individual animals. The park's famous birds are *evoked* only: an owl who "flew out of the zoo years ago" and a Fifth Avenue hawk couple that birdwatchers follow.

## The player's fantasy

Being the smallest, most ignored creature in the most famous park on Earth, and quietly becoming its mastermind. You know the skyline from above, the shortcuts through the Ramble, which slice joint has the slowest counterman, which doorman takes a bribe and which squirrel owes you a favour. By the end, eighty pigeons wheel behind you, and the whole park chants your name, which is "coo".

## Keeping it casual (clever cosy puzzle game, not "follow the arrows", not Myst)

- **Easy to read, satisfying to crack.** Every thread reads at a glance: a one-line goal, a visible meter and its open cards. The goal is always clear. The *solution* takes some thought.
- **Two kinds of win.** Each thread has a few **"aha" puzzles** that combine 2–3 friends' talents, with an order to work out or a small twist (a guard who only takes a hot slice, a hot slice that has to go by grate relay, a doorman who lets raccoons in but not pigeons). Around them are **quick one-step wins** (pop a sign, clear a spike strip, hand over a slice).
- **Most steps are one or two clear actions.** A scheme has 1 to 4 steps. No step asks you to remember a chain you can't see: the Board card always shows the current step's goal and obstacle.
- **Threads interlock.** Progress in one gives shortcuts or options in another (see "How the threads feed each other"). One thread can push back on another: making a region's signs permanent draws pigeons, so the Spike Man follows and spikes two perches there. You can plan around it, and it never blocks you.
- **Pizza bribes have small, readable twists.** Different takers want different things (hot, cold, anchovy, a whole box). Slices cool. Cats knock slices off counters. Rats relay them through the grates.
- **Hints are layered and on request.** First the card (goal and obstacle). After about 3 minutes stuck on one step, a regular offers a **nudge** in the world ("Pickles says: that counterman turns his back when the phone rings…"). Then, only if you ask, **the Elders give the answer**. Nothing is handed out up front.
- **Where and who is never a puzzle; how is.** Every goal names a thing you can see and find: a landmark, a coloured sign, a named character and where they are ("Peck the sign with the red DON'T strip, on the Pond's east path"; "Talk to Commodore Puddles, out on the Lake by Bow Bridge"). The soft **guidance** (see "Guidance") points at the place and the person, and suggests something to do when you drift; it never says which friend, item or trick solves the step. The how stays in the nudge and the Elders.
- **Clues are friendly and obvious.** Every clue is a big world tell (see "Calling allies"). Working out *who* fits the clue is the puzzle, not finding it.
- **Anyone can finish.** Nothing is obscure. No step needs pixel-perfect timing. Fights are forgiving, with checkpoints and assists. There are no dead ends, and a wrong guess costs nothing.
- **Cut any rule that doesn't add fun.** Slices are just light items with a temperature. Feuds are just "this ally won't come here yet". Spike sites are perches you can't land on until a friend clears them. No other new systems.
- **The fun test.** Every scheme, trades included, was checked against "is this just go-get-X-bring-to-Y?". If it was, it got a twist, a funny payoff or a clever use of a talent. Otherwise it was cut (the backpack and whistle trades were cut this way). The trades each have a small catch now: a tourist who won't look up from his selfie until you photobomb it, a waiter standing on the cufflink, a jogger who never stops, a kid who won't let go of his remote. The Zamboni came back only once it had a real twist: it can't drive off the ice, so you build it a ramp out of its own snow.
- **Showpieces end on the laugh.** No chore follows a big payoff: the Rink Job ends with the raccoons sledding the spike heap off on the flattened cart, and the Wedding ends on the photo.
- **Few availability rules.** Only the ones that are a joke or a puzzle: day animals sleep at Night, raccoons wake at Dusk, the owl hunts at Night, ice freezes only at Night, horses only Pull along a road. Everything else comes any time it's awake.
- **Showpieces.** Two schemes end in a big scripted slapstick payoff that players will want to tell someone about: the **Rink Job** (a Zamboni launch and a chain reaction) and **the Wedding** (Dove's "release" and the geese stampede). Both are earned by a small, clever plan, never by timing.

## Core loop

- **10 seconds (hands):** waddle with the famous head-bob, hop, take off, glide over the trees, land on a lamppost and look around. Peck something, pick it up, drop it somewhere clever. Coo, and your flock swirls in.
- **1 minute (a scheme step):** spot something odd from the air (a dust plume, bubble rings in the Lake, a key teetering on a counter, a human blocking a gate). Work out who could deal with it, **Call** that ally there or bring the right item (often a slice), and watch it work. Each step ends with a little "click": a sign flips, a doorman pockets a slice, a raccoon gives a thumbs-up.
- **3 to 6 minutes (a scheme):** each crew, each Mecha part, each truce and each gear trade is a **scheme**, a chain of 1 to 4 steps (trades are quicker, about 2 minutes). Finishing one adds a polaroid to the **Scheme Board**, a crew to the roster, gear, or a part to the Workshop, and ticks its thread's meter.
- **Session (10 to 30 minutes):** work two or three threads at once. Flip signs, run slices, clear spikes, settle a feud, trade at the market, collect Park Postcards and fill the Workshop. Every scheme whose needs are met is open on the Board, and there is always at least one (usually three or more), so there's never a dead end.

**The mechanic the game lives or dies by:** *talents combining across threads.* A cat knocks a slice off a counter, the rats relay it hot through the grates, and the doorman lets the raccoons up to the hawk's ledge. If combining friends feels clever and quick, the game works. Flight is the joy; combination is the hook.

### Calling allies (no escort missions, no answer keys)

- Allies never trail behind you. Open the **Ally wheel**, pick an ally, and choose **Call**. They arrive in about 3 seconds from the nearest cover: squirrels drop out of a tree, ducks **pop up from under the water**, crows swoop down, raccoons climb out of a drain, rats pop out of a grate, cats slink out of a doorway or over a wall, horses clop in along the nearest road, songbirds flutter down in a chirping burst, geese waddle up from the nearest lawn or water honking, Biscuit bounds in, Rhoda dives from above.
- **Spots show only the world clue**, never the ally's icon:
  - dust plume and acorn sparkles: dig;
  - bubble rings and a white splash: dive;
  - a human holding something you want: trade;
  - a vehicle or a locked latch: rig;
  - a grate with something glinting below: grate fetch;
  - a huge object: haul;
  - **something teetering on a high edge** (it wobbles: a key on a counter, a slice on a shelf, spike strips on a ledge): knock;
  - **something stuck** (a jammed gate, a dented panel, a buckled garage door; peck it and it puffs dust): kick;
  - **a human in the way** (a "…" bubble over someone sitting or standing where you need to be): lure them off with a sound, or chase them off.
- Working out *who* fits the clue is the puzzle. Some clues fit two allies (a human in the way: songbirds' Mimic *or* geese's Bully), which gives alternative solutions.
- An ally Called to the wrong place does a funny "nothing here" bit ("Hazel digs… it's WET, Gus." "I'm a HORSE, Gus. I don't do stairs.") and stays. Nothing is lost.
- The **first** time a talent is taught (in that ally's own recruit scheme) the clue shows the icon, once. After that the icon appears only if you ask the Elders.
- Several allies can wait at one spot. **Combining = choosing who acts and in what order** (Ask, from the wheel or by pecking them).
- Who can come when:
  - **day animals** (squirrels, ducks, crows, songbirds, geese, Rhoda, Biscuit, horses): Morning to Dusk;
  - **raccoons:** Dusk and Night; **Strix:** Night;
  - **rats, cats** and your **flock:** any time.
  - Horses come anywhere they can walk; only their **Pull** needs a road within 15 m of the item (they're harnessed to a carriage).
  - The wheel greys out an ally who can't come and says why ("Raccoons sleep until Dusk").
- **Feuds** (until their truce): squirrels won't come to Cedar Hill or the Great Lawn ("Not with THEM around"); rats won't come up at the 110th Street grate (cats' block); ducks won't come to Bow Bridge's arm of the Lake (geese turf). That's all a feud does: the wheel says why.
- The Turtle Elders don't travel. Once recruited, "Ask the Elders" on the Scheme Board gives the current step's answer (and its ally icon), from anywhere.
- Your **flock** always follows you (boids). That's the only following.

### Items: light, heavy, huge (slices are light)

- **Light** (shinies, keys, gate key, cufflink, earring, wrench, sticker, peas, spectacles, remote, **pizza slices**): Gus carries 1 with no flight limit.
- **Heavy** (Biscuit's tennis ball, a sail, a sack of tennis balls, a **pizza box**): Gus can carry one, but only up to 2 m above the ground, and slower (6 m/s).
- **Huge** (drainpipes, the cone, the battery, the shopping cart): Gus can't move these. A **hauler** can: Biscuit's **Fetch** (day), Rhoda's **Lift** (day), the Meer Mob's **Muscle** (any), or the horses' **Pull** (day, only if a road is within 15 m). Hauled parts go straight to the Workshop.
  - **One water rule:** an item at the bank (the turtle rock's shopping cart, surfaced against the shore) can be hauled by anyone; an item out in open water (the battery under Bow Bridge) needs a flier: Rhoda or Muscle. ("I'm a DOG, Gus. I don't do deep.")
- **Grate travel** carries whatever Gus holds.
- **Shinies:** 6 are placed: CPW 72nd ledge, a Ramble dust plume and Lake bubbles (Vesper's fee), the Plaza Hotel's roof by its flagpole turret (sunglasses), and 2 spares on Belvedere's tower and the spiral museum's roof (one pays for the RC remote). The crows' stall also sells one for 15 crumbs at Afternoon, so you're never stuck for a shiny.

### Pizza slices (the bribe)

A slice is a light item with one extra property: **it's hot for 60 seconds** of game time after it leaves an oven, a box or a griddle. Steam wisps rise from it and thin out as it cools. The carried-item slot shows a small ring that empties. Cold slices droop.

**Where slices come from** (every source renews each phase, so slices never run out):

| Source | Where and when | How |
|---|---|---|
| A tourist eating on the bench outside each slice joint | The 3 joints (Columbus Circle, CPW & 72nd, 110th & Lenox), M–D | Make him drop it: hold **Coo** to swarm him (flock ≥ 6), songbirds **Mimic** his phone, or geese **Bully** him. Hot. |
| The joint's counter | The 3 joints, any phase | **Cats Knock** one off the counter while the counterman's back is turned. Hot. |
| The back-door bin | The 3 joints, Night | Peck the lid. Cold (raccoons and rats don't mind). |
| A **pizza box** (heavy) | The delivery cyclist on East Drive at Afternoon, or a joint's pickup shelf (cats Knock it) | Peck it open: 3 slices. |
| **Slice Lines** (Slice Run rewards) | Merchants' Gate, the Pond carriage stop, Harlem Meer | One hot slice waits there each phase. |
| **Slice Relay** (cats-and-rats truce) | Any grate, once per phase | Ask the rats: a hot slice pops up. |

- **Warming a cold slice:** drop it on the **halal cart's griddle** for 3 s (the cart man shrugs). The cart stands at Grand Army Plaza at Afternoon and at 110th & Fifth at Dusk.
- **Giving:** Peck the taker while carrying the slice. If the taker wants it hot and it's cold, they say so ("It's COLD, pal.") and you keep it.
- **Naps:** a carried slice goes cold; slices and boxes left on the ground are gone after a nap ("A rat got it.").
- **Who takes slices and what they do for one:**

| Taker | Wants | Does |
|---|---|---|
| Subway Sue (rats) | a hot slice, delivered down her grate | joins (the Grate Rats' recruit) |
| Queenie (cats) | a **hot anchovy** slice from the CPW & 72nd joint | joins (the Bodega Cats' recruit) |
| The Delacorte stage-door guard | hot only | waves you backstage at Dusk (one way to get Rigby's wrench; also the Delacorte postcard) |
| Walter, the Fifth Avenue doorman | hot only | props the service door while he eats it, and lets the raccoons up (Tux the lobby cat shows them the stairs), but never pigeons ("Them? Fine. They tip better than the residents."). The raccoons go up in the same step. |
| Vinnie's hot dog counter | any, with customers watching | "PIZZA? At MY cart?!" Vinnie is fed up (one way into the Body scheme) |
| The Night Crew (raccoons) | any, even cold | "Union rules": one slice before they'll rig the Zamboni |
| Big Sal (Meer Mob) | 3 slices, any temperature | instead of the 60-crumb feast |
| A whole box on 110th Street | cats and rats share it | the cats-and-rats truce |
| Horses | — | "I'm a herbivore, kid. And that's pepperoni." (a joke, not a use) |

- **Hot routes** (all checked against 60 s at 11 m/s cruise, ≈ 660 m): Columbus Circle joint → Sue's grate 15 m; CPW & 72nd joint → the Delacorte 205 m; Columbus Circle → Vinnie on the Mall 245 m; Columbus Circle → Walter at Fifth & 74th 425 m. CPW & 72nd → Queenie at 110th is 820 m: **too far to fly hot**. That's the twist: relay it through the grates (72nd W → 96th E, then 300 m), or warm it on the halal griddle at 110th & Fifth at Dusk.

### The first minute (scripted)

1. **0 s:** Gus dozes on a lamppost by the Pond. A ranger below shoos him ("Hey! Shoo!"). The lamppost wobbles.
2. **5 s:** in-world prompt: "**Flap** to fly". (Prompts are in-world near Gus; the control cards live only in pause.)
3. **15 s:** Gus lands by a "DON'T FEED THE BIRDS" sign. The camera eases toward it. A thought bubble: "FEED the birds…?"
4. **25 s:** prompt "**Peck** the sign". The loose "DON'T" plate pops off and spins away.
5. **~40 s:** two picnickers wander over and toss crumbs. Gulp, gulp. The crumb counter ticks up. The Duchess's gang watches from the fountain: the Prologue scheme card appears.
- The core load for this is small: Gus, pigeon-plain, the human parkgoer and ranger, bench, lamppost, and the South zone.

## Controls

Keyboard + mouse and the controller are the primary schemes; **touch is best-effort** (complete and usable, tested as a smoke test).

The camera is third person, close behind Gus (see "Camera" in Art direction). It turns with the mouse, the right stick or a drag on the right half of the screen. Movement is camera-relative.

**Flight model (arcade, easy to fly):**

- Movement steers in the camera's horizontal plane, as on the ground. Speeds: walk 1.2 m/s, waddle-sprint 2.5 m/s, cruise 11 m/s, boost 17 m/s (2 s), dive up to 20 m/s.
- **Flap** climbs (hold) or takes off (tap from the ground). **Dive** drops fast, with a whoosh.
- With no input, Gus glides forward slowly and sinks gently.
- **In flight the camera eases back behind Gus's travel direction** 1.5 s after the last manual camera move. So the left stick alone steers, and the right thumb can stay on Flap.
- Banking, pitch and wingbeats are all visual and automatic.
- **Stamina** (the wing meter) drains only while climbing or boosting. It refills when Gus perches, lands or glides level. While airborne he can always glide down. Flight never fails cruelly, and falling never costs a feather.
- **Bumping into things:** tree canopies are soft (Gus passes through with a leaf burst and a slight slowdown). Trunks, walls and rocks deflect him into a glancing slide that keeps about 70% of his speed. He never stops dead and never loses a feather to scenery.
- **Spiked perches:** landing on one bounces Gus off with a "boing" (no damage).
- **Carrying a heavy item** caps Gus at 2 m above the ground and slows him (see "Items"). Slices are light: no limit.
- **Steam stacks** (the orange-and-white chimneys on Fifth Avenue and Central Park South) are warm updrafts: fly through one to climb without stamina.

| Action | Keyboard + mouse | Touch (landscape, best-effort) | Gamepad (PlayStation / Xbox) |
|---|---|---|---|
| Move / steer | WASD or arrows | Left virtual stick (bottom-left, 140 px zone) | Left stick |
| Camera | Mouse (pointer lock after first click; drag works too) | Drag anywhere on the right half that isn't a button | Right stick |
| Hop / take off / flap (hold to climb) | Space | **Flap** button, bottom-right, 96 px. Keep holding and slide off it to turn the camera with the same thumb | ✕ / A, or hold R2 / RT (frees the right thumb for the camera) |
| Dive (air) / land / crouch (ground) | C | **Dive** button, left of Flap, 72 px | ○ / B, or hold L2 / LT |
| Interact: peck, talk, pick up, give (a slice too), flip sign, Ask an ally, "Flock, lift it!" at a huge item (with Muscle) | E | **Peck** button, above Flap, 80 px; bright when there's something to do | □ / X |
| Coo: tap to gather the flock; hold to swarm the nearest person ahead (within ~5 m; a ring marks who while it's held) | F | **Coo** button, above-left of Peck, 72 px | △ / Y |
| Drop carried item | Q | Long-press Peck | L1 / LB |
| Waddle-sprint (ground, free) | Hold Shift | Push the stick to its edge | Click L3 (sprint until you stop) |
| Boost (air, 2 s, uses stamina) | Shift | **Double-tap Flap** (the stick edge never boosts) | Click L3 |
| Ally wheel: pick an ally, then Call or Ask | Hold R, choose with the mouse (or 1–9, 0 for the first ten), release; release without choosing (or Esc) calls no one | Ally portrait, top-left: tap to open the wheel, tap an ally (tap outside to close) | Hold R1 / RB, choose with right stick, release; release without choosing, or ○ / B, calls no one (#33) |
| Map | Tab | Map icon, top-right | D-pad down, or Create / View |
| Scheme Board (quests) | J | Board icon, top-right | D-pad up |
| Where to? (shows the goal's marker and names where it is; with a "Something to do" card up, tracks that scheme) | G | Tap the compass | Click R3 / RS |
| Mute | M | Speaker icon, top-right (also in pause) | Pause → speaker toggle |
| Pause / back out of menus | Esc or P (Esc while the pointer is locked releases the lock, which opens pause) | Pause icon, top-right | Options / Menu; ○ / B to go back |
| Nap until… (change time of day) | Pause → Nap, or E on a perch when "Nap" shows | Same | Same |
| Report a bug | **Ctrl+Shift+L**, or Pause → Report a bug | Pause → Report a bug | Pause → Report a bug |

**Driving** (hot dog cart, pedicab, RC boat, the Wollman Rink **Zamboni**). Walk up to a rigged vehicle and Peck to get in; Gus sits on the seat (on the Zamboni he's a tiny pigeon on a huge tractor seat) or holds the RC remote on the shore.

| Action | Keyboard + mouse | Touch (best-effort) | Gamepad |
|---|---|---|---|
| Steer | A / D or ← / → | Left stick (sideways) | Left stick |
| Gas | W or ↑ | **Flap** button (reads "Gas") | R2 / RT (analog), or ✕ / A |
| Brake, then reverse | S or ↓ | **Dive** button (reads "Brake") | L2 / LT (analog), or ○ / B |
| Horn (a coo, of course). **On the Zamboni:** tap to **Dump** the snow hopper when it's full; hold for 0.3 s or more to **Spray** water ahead | F | Coo button (reads "Dump" / "Spray" on the Zamboni) | △ / Y |
| Get out | E | Peck button (reads "Out") | □ / X |

- The driving camera sits higher and farther back, scaled to the vehicle: about 4 m back and 1.8 m up for the carts, 5 m and 2.4 m for the Zamboni, 1.5 m and 1 m for the RC boat. It always auto-follows. Mouse, right stick and right-half drag still look around.
- Top speeds: hot dog cart 5 m/s, pedicab 8 m/s, RC boat 4 m/s, **Zamboni 4 m/s on ice** (true to life: stately). Bumps bounce the vehicle back softly; nothing breaks.
- **The Zamboni on ice** slides. It reaches 4 m/s in about 3 s (1.3 m/s²) and turns slowly with a lazy drift, the rear swinging out about 15° in a hard turn. Braking slides it about 3 m. Hitting the boards gives a padded "ice bump", and it rebounds keeping half its speed. Skaters (day) glide out of its way with a "HEY!". **Off the ice** it crawls at 1.5 m/s, its brushes grinding: it's an ice machine. So it can leave the rink by the gate, but slowly, and it never goes faster than a waddle on paths.
- **The Zamboni's jobs** (only on the Zamboni, all optional in free roam):
  - **Hopper:** driving on ice shaves snow into the hopper. It fills after about 25 s of driving (a gauge on the driving HUD).
  - **Dump** (tap F, when full): tips a snow pile 2 m high in front of the machine.
  - **Spray** (hold F for 0.3 s or more): a fan of water 3 m ahead. On a snow pile at **Night** it freezes in 3 s into a glassy **ice ramp** with a crackle. At Dusk it stays slush and slumps ("Slush. Needs to be colder."). By day it just splashes (skaters, pigeons and Gus included). Ramps and piles last until the next nap.
  - **Ramps launch.** Hit a ramp at 3.5 m/s or more and the Zamboni sails off it on a short, fixed arc: a hop of about 1.5 m that lands back on the ice with a bump. At the one spot that matters (see the Rink Job), it clears the boards.
- Nap and flight are off while driving.

- **No Ctrl in gameplay**, so Ctrl+W can never close the tab. The bug shortcut is **Ctrl+Shift+L**, not the usual Ctrl+Shift+F, because F is Coo (feedback.md: the shortcut's letter is never a game key).
- **Pointer lock:** browsers use Esc to release the lock, so the game opens pause whenever the lock is lost during play (`pointerlockchange`). The lock comes back on the next click on the canvas after Resume, never from the Resume button itself.
- **Each pad button does one thing.** No chords. L1 and R1 are single-purpose.
- **Menus** are fully usable by mouse, touch and controller. The stick and D-pad move focus (repeating after 350 ms, then every 120 ms), ✕ confirms and ○ goes back. The focused button has a bright gold outline.
- **Button prompts** follow whatever was used last: keys, touch or the controller's own symbols. PlayStation shapes (✕ ○ □ △) are drawn in code as SVG, never as font glyphs.
- **Touch layout:** every button sits inside the safe areas. Touch controls are 55% opaque and appear only on touch devices. The bottom-centre 40% of the screen stays clear, so they never cover Gus. All buttons are at least 64 px.
- **Orientation:** landscape, because a 3D third-person game needs width. Portrait shows a friendly "turn your phone" card with Gus tilting his head.
- Settings: camera sensitivity, invert Y, flight camera auto-follow (on/off), vibration, guidance (Subtle / Normal / Off), graphics quality (Auto / Low / Medium / High).

## Structure and difficulty

### The map, south to north

Coordinates are game metres. +z is north from 59th Street (z = 0) to 110th Street (z = 1,050); x runs west (−) to east (+). The park spans x −110 to +110. Each side then has a 20 m avenue and a 50 m deep block of buildings. Real streets map at **20.6 m per block**, so any landmark's z = (street − 59) × 20.6.

| Zone | z range | Landmarks (built in code unless marked ★ meshgen) |
|---|---|---|
| **South: "The Pond"** | 0 to 140 | Grand Army Plaza fountain (SE corner, city side), **The Pond**, **Gapstow Bridge** (code arch), ★**Wollman Rink** (code rink: ice, low boards, skaters; its Zamboni garage at the south end; on the north side a service yard and Prickett's rented **equipment shed**, with a steel roll-up door, by East Drive), the zoo's brick walls (fenced scenery; sea lions heard barking at Afternoon feeding), Heckscher Playground, ★the Carousel, the Dairy, Chess & Checkers House, Umpire Rock, Merchants' Gate at Columbus Circle (SW corner), the bronze ★**sled-dog statue** by East Drive |
| **Middle: "The Mall"** | 140 to 330 | **Sheep Meadow**, Tavern on the Green (west), Cherry Hill, **The Mall** (elm avenue, statues, Vinnie's hot dog cart, the Pigeon Lady's bench), ★**Bethesda Terrace and Fountain** (buskers), Strawberry Fields mosaic (a circle mosaic, no text), **The Lake**, ★**Bow Bridge** (collision and perch rail from code), Loeb Boathouse (rowboats), **Conservatory Water** (model sailboats, the bronze ★**girl-on-a-giant-mushroom statue**), Cedar Hill (east; dog walkers) |
| **Ramble: "The Woods"** | 330 to 440 | **The Ramble** (dense woods, winding paths, birders with binoculars, the crows' market oak, the sealed cave where Gus builds his **Workshop**), ★**Belvedere Castle** on Vista Rock, **Turtle Pond** (the Elders' rock), the **Delacorte Theater** (stage door, Dusk rehearsals), Shakespeare Garden, the **Maintenance Yard** (79th St transverse; rangers' HQ, scenery) |
| **Great Lawn** | 440 to 540 | **Great Lawn** (ball fields; geese), Cleopatra's Needle (obelisk), the museum's back wing on the east edge (glass, scenery) |
| **Reservoir** | 540 to 770 | **The Reservoir** (big water, joggers on the running track, gatehouses; a starling murmuration at Dusk), the 86th Street transverse, the bridle path, the **Engineers' Gate** (Fifth & 90th) |
| **North: "The Woods Up North"** | 770 to 1,050 | North Meadow, **The Pool** (the heron's spot) and **The Loch** (with its little waterfall), **North Woods / Ravine** (raccoon country; a coyote is sometimes seen at Night), Conservatory Garden (formal, iron gates, east), **Harlem Meer**, the Blockhouse (stone fort ruin, NW) |
| **City ring** | outside | see below |

**The city ring, side by side:**

- **Central Park South:** hotels with doormen and flagpoles; the **carriage line** (horses, carriages, a water trough at the kerb); pedicabs; the **ice-cream truck** (Afternoon, a tinkly original jingle); the **halal cart** at Grand Army Plaza (Afternoon); a steam stack; the **Columbus Circle slice joint** and Sue's grate on the SW corner.
- **Fifth Avenue:** mansions and doormen; **Walter's building** at 74th (the hawks' ledge); the **construction site** at 76th with scaffolding and a plywood **sidewalk shed**; the spiral museum at 89th; the Engineers' Gate at 90th; the halal cart at 110th & Fifth (Dusk); yellow cabs all along.
- **Central Park West:** the gabled apartment house at 72nd with the **CPW & 72nd slice joint** and a **bodega** on the corner; the twin-towered apartments at 74th; the natural history museum at 79th (the starlings' stage: the stone ledge over its columns, #36).
- **110th Street:** brownstones with fire escapes and rooftop **water towers** (perches); the **bodega and slice joint at 110th & Lenox** (Queenie's corner; the 110th grate); Prickett's van parks here at Dusk and Night.
- The **Empire State Building** stands on the southern skyline, always visible (far layer), and is the finale's goal.

- **Transverse roads** at 65th, 79th, 86th and 97th run through **sunken cuts with stone bridges**: great swoop-through shortcuts. Drives (East, West and Center) loop the park.
- **Subway grates** (rats' fast travel): 59th/Columbus Circle, 59th/5th, 72nd W, 77th E, 86th W, 96th E, 110th/Lenox. Steam drifts up from them; a train rumbles underneath.
- **Tall perches:** 12 **Summit Perches** sit on the city ring's tallest roofs and the park's high points (Belvedere's tower, the obelisk tip, the twin towers, the spiral museum's roof, a 110th water tower and others). Land on one to reveal that area on the map, with a sweeping camera pan (fog pushed out for the pan). This is the "fly up a building and perch" fantasy, and the map's fog-of-war.
- **Far layer:** the whole park silhouette (water shapes, canopy blobs), the skyline ring and the ESB, drawn in their own pass behind everything (see Tech plan). From any perch you can see the whole park's shape and the ESB.

### Central Park and NYC life (who's out, and what it's for)

Everything here reuses the human, animal and prop assets. It's where most of the "this is New York" feeling comes from.

| Who / what | Where, when | What it's for |
|---|---|---|
| Carriage horses and drivers (top hats), a water trough | CPS carriage line, M–D | The Carriage Horses crew; Prickett's van blocks their trough |
| Mounted-unit officer on Duke (navy, no badges) | the drives, M–D | Duke is a horse regular; ambient patrol |
| Dollar-slice joints ("$1 SLICE" in code text, no brands), countermen | Columbus Circle, CPW & 72nd, 110th & Lenox | Slice sources; cats knock slices off the counters |
| Bodegas ("DELI GROCERY" awning) with cats in the doorway | CPW & 72nd, 110th & Lenox | The Bodega Cats' homes; Prickett buys his coffee at 110th |
| Hot dog cart (Vinnie), halal cart, pretzel cart | the Mall; Grand Army Plaza (A) / 110th & Fifth (D); Bethesda | Body part; the halal griddle warms slices; pretzel crumbs |
| Delivery cyclist with a pizza box | East Drive by the Engineers' Gate, A | Source of a whole box (cats-and-rats truce) |
| Ice-cream truck with a tinkly original jingle | CPS / Grand Army Plaza, A | Mimi the starling learns the jingle; it lures kids |
| Dog walker with eight dogs on leashes | Cedar Hill and East Drive, M | The dogs-and-squirrels feud |
| Reservoir joggers | the running track, M and D | The headlamp trade; the race course |
| Birders with binoculars, feeders on branches | the Ramble, M (the warbler wave) | Postcard; nudge lines; the jays |
| Chess players | Chess & Checkers House, M/A | Postcard |
| Rowboaters | the Lake, M/A (the Boathouse closes at Dusk) | Ambience; the Boathouse sign feeds the ducks |
| Skaters, and the rink's **Zamboni** | Wollman Rink, day (kids hop a little bump of ice by the boards, a hint for the Rink Job); the rink's driver resurfaces at Dusk until the raccoons "borrow" it | Postcard (belly slide between them); the Rink Job; then the Zamboni is yours |
| **Wedding photo shoots** (a couple, a fussy planner with a wicker "dove release" basket, a photographer, ~8 guests) | Bow Bridge, M–D | The Wedding (Power core); afterwards, Dove's postcard |
| Shakespeare rehearsal, a stage-door guard, stagehands | the Delacorte, Dusk | Rigby's wrench; postcard |
| Buskers (sax at Bethesda, guitar at Strawberry Fields) | A | The Choir's rivals for an audience; postcard |
| The Pigeon Lady (Dolores) on her bench, scarf and hat | the Mall, M | Feeds pigeons whatever the signs say (a steady crumb trickle); postcard |
| Doormen | Fifth Avenue, CPS hotels | Walter takes hot slices; the others shoo pigeons |
| Yellow cabs, honking; steam stacks; subway grates | all city streets | Ambience, updrafts, fast travel; cabs to step over in the Stomp |
| Construction site, scaffolding, sidewalk shed | Fifth & 76th | The Beak (the cone); perches on the scaffold |
| Tourists with phones and selfie sticks | everywhere by day | Trades, selfies, dropped slices |
| Sea lions (heard, not seen) | behind the zoo walls, A feeding | Postcard; ambience |
| Famous birds, evoked | Strix (an owl who flew out of the zoo years ago); Rhoda and Rex (the Fifth Avenue hawk couple birders watch from a bench) | Crews |
| A coyote | North Woods clearing, Night, a fixed moment | Postcard; squirrel gossip ("It's REAL, I saw it!") |
| Starling murmuration; geese V's; warblers | Reservoir at Dusk; overhead at Morning; Ramble at Morning | Sky life (code particles and far LODs) |

### Park Postcards (every famous place has something to do)

16 small, one-minute "park moments". Each gives 10 crumbs and a postcard on the Scheme Board (part of Completionist). They reuse existing assets.

| Landmark | The moment |
|---|---|
| Carousel | Ride a carousel horse for one full turn (Afternoon; the organ loop plays). |
| Strawberry Fields | A busker plays an original riff when you coo beside his open guitar case; crumbs land in it for you. |
| Bow Bridge | After the Wedding, Dove works every Afternoon shoot. Land on the rail beside her as the flash goes: "Two doves! Stunning!" (once the rail's spike strip is gone). |
| Gapstow Bridge | Pose in a tourist's selfie with the skyline behind. |
| Chess & Checkers House | Peck a piece off the board and start an argument between two old players. |
| Sheep Meadow | "Sunbathe" on a towel next to real sunbathers (Afternoon). |
| The Delacorte | Coo on cue from the rafters during the Dusk rehearsal (the guard lets you in for a hot slice). |
| Cleopatra's Needle | Perch on the very tip (also a Summit Perch). |
| Wollman Rink | Belly-slide across the ice between the skaters. |
| The Loch | Ride the little waterfall down. |
| Sled-dog statue | Sit on the bronze dog's head while kids pat it. Biscuit is jealous. |
| Mushroom statue | Sit on top of the giant bronze mushroom with the climbing kids (Afternoon). |
| Zoo wall | Watch the sea lions' feeding from the wall (Afternoon) and catch a flung sprat. |
| The Ramble | Land among the birders during the warbler wave (Morning). They gasp… then sigh: "Just a pigeon." |
| North Woods | Spot the coyote from the Blockhouse wall (Night). |
| The Mall | Sit on the Pigeon Lady's hat (Morning). She doesn't mind. |

### Time of day

Time has four phases: **Morning, Afternoon, Dusk, Night.** It does not tick by itself. Gus changes it by **napping**: on any perch (E when "Nap" shows) or from pause (Nap until…, pick the phase). A 3 s fade, then the new phase. Nap is blocked during encounters, races and while driving.

- The Scheme Board shows "Nap until Dusk" beside any step that needs a phase. Pick it to nap straight away.
- **What a nap changes, exactly:** every flipped sign that isn't permanent is flipped back ("Rangers fixed 3 signs while you slept"); uneaten crumb piles are gone; Called allies go home; humans move to their new phase spots; a carried slice goes cold; slices and boxes on the ground are gone; the Zamboni's snow piles and ice ramps melt ("The rink crew resurfaced"); Walter's service door is shut again.
- **What a nap never changes:** scheme-step flags, other items you carry, other dropped and huge items, gear, parts, permanent signs, cleared spikes, sabotaged carts, the Boathouse lot gate (open once you've unlocked it), the 103rd Street shed door (open once the flock yanks it), the rigged Zamboni (where you left it), the wedding party's mood (`wedding.doveReleased`), and leftover spike strips on the rink. So a step you finished stays finished.
- **The rule that keeps naps safe:** any world effect a later step needs is either a persistent flag (listed above) or happens inside that same step. Only Walter's door is phase-scoped, so the raccoons' climb is part of the same step as his slice. `check-schemes.mjs` simulates a nap between every two steps.
- **6 Nests** stay as save points, respawn points and the place to Feather Up. Nests are never spiked.

Each phase changes who is out:

- **Morning:** the dog walker and her eight dogs, joggers, birders in the Ramble, the Pigeon Lady, construction workers on Fifth, Prickett installing spikes, rangers busiest.
- **Afternoon:** picnics, feeders, buskers, tourists, rowboaters, the ice-cream truck, the delivery cyclist. Signs pay out most.
- **Dusk:** raccoons wake up; vendors pack up; the Delacorte rehearses; the halal cart moves to 110th; a starling murmuration over the Reservoir.
- **Night:** the Ramble owl hunts, humans are gone, the rangers' carts sit parked (sabotage time), slice-joint bins are full, and the city lights up.

The sky, light, fog colour and music all change with the phase.

### The park's crews: 17 to win over, about 700 animals ("Crews 0/17")

The park is **crowded** with animals. Each crew below is a whole population. You deal directly with its boss and a few named regulars; when the crew joins, every member is on your side.

**Who lives where (always on screen somewhere):**

| Crew | Roughly how many | Where you see them |
|---|---|---|
| Squirrels (Acorn Syndicate) | ~120 in four colours: mostly grey, plenty of cinnamon-brown, the odd glossy black one (New York really has them), and one very rare white squirrel, a little legend to spot (a postcard-style moment: "You saw HER?") | every lawn, tree and bench, busiest on Sheep Meadow, Cherry Hill and the Great Lawn |
| Ducks (Lake Mallards) | ~60: mallard drakes and hens, wood ducks, northern shovelers (spoon bills, mostly on the Reservoir and the Lake), buffleheads (tiny divers), a white farm duck who acts like he owns the place, and one dazzling mystery stranger (a mandarin-style duck nobody can explain; birders gather whenever he shows up) | the Pond, the Lake, Turtle Pond, the Pool, Harlem Meer |
| Crows (Ramble Exchange) | ~50 | the Ramble's trees, rooftops, wheeling flocks overhead at Dusk |
| Raccoons (Night Crew) | ~25 | Dusk and Night only: drains, bins, the North Woods and the Ramble |
| Rats (Grate Rats) | ~40 | grates, kerbs and slice-joint bins on the city ring, more at Night |
| Turtles (Elders) | ~20 | stacked on logs and rocks at Turtle Pond, a few at the Lake |
| Pigeons (4 gangs + strays) | ~20 per gang on its turf, plus the 40 strays, in every real colour morph | the Plaza, Bethesda, the Reservoir track, Harlem Meer |
| Dogs (Cedar Hill Pack) | Biscuit + ~8 dogs with owners + the walker's 8 (a mix of the big fluffy dog, poodles, dachshunds and mastiffs) | Cedar Hill and the drives, Morning to Dusk |
| Owls (Strix's parliament) | Strix + 2 | the Ramble at Night |
| Hawks (Rhoda's family) | Rhoda + her mate + a fledgling | Fifth Avenue ledges, the sky over the Meer |
| **Cats (Bodega Cats)** | ~30 | bodega doorways, deli windows, fire escapes on 110th, a lobby cat on Fifth; a few prowl the park at Night |
| **Horses (Carriage Horses)** | ~14 | the carriage line on Central Park South and the south drives (M–D); Duke and a partner patrol the drives |
| **Songbirds (the Racket)** | ~150 | house sparrows on every café table and cart, robins on the lawns, starlings on cornices, blue jays and cardinals in the Ramble, migrating warblers on Ramble mornings |
| **Waterbirds (the Honk)** | ~40 geese, 2 great blue herons, ~6 night herons | geese on the Lake, Great Lawn, Reservoir and Meer edges; herons at the Pool and the Lake's edges |

- **Before a crew joins,** its members are wary: they scatter or hiss when Gus lands close. Squirrels chitter from branches, crows mob him if he loiters in the Ramble, cats flatten their ears, geese honk him off their lawn.
- **Once it joins,** they change all over the park: they wave, chitter hello, hop alongside for a few steps, drop the odd crumb. Horses nod as he passes; sparrows sing a little "coo" back.
- **Park Support** is the headcount of every animal on your side ("Park Support 412"). It jumps as crews join and ticks up with favours. **Crews 0/17** is what the finale needs.
- In the finale, **every member** of every crew turns out: squirrels on the Fifth Avenue lampposts, ducks and geese in the fountains, rats on the kerbs, cats in every bodega door, carriage horses rearing, crows, songbirds and the whole flock overhead.

**Named regulars** (three per crew, besides the boss; two for the owls and hawks; the Swells have a fourth, Dove): each has a look of their own (a coat or pigeon morph and accessories on the species model, matched to their card; see "Who wears what"), their accepted **character card** as their portrait, about 4 lines, and one optional one-minute **favour** that adds to Park Support and pays crumbs. Favours reuse the crew's talents and the world clues, never new systems. Regulars also give the **nudge** hints for their crew's steps.

| Crew | Boss | Regulars |
|---|---|---|
| Plaza Swells | Duchess Pidgeley | Monty (monocle, gossip), Lady Bunting (opera gloves), Tuppence (the youngest, hates hats), **Dove** (pure white; everyone assumes she's a dove and she's never corrected anyone: "Forty weddings, darling. Not ONE person checked.") |
| Acorn Syndicate | Hazel | Nutmeg (accountant, counts everything), Twitch (too fast to finish sentences), Old Pecan (remembers caches from 1974) |
| Lake Mallards | Commodore Puddles | Mrs. Puddles (the real boss), Bubbles (dives for fun), Ensign Drake (salutes everything) |
| Ramble Exchange | Vesper | Ledger (keeps the trade book), Glint (collects only blue things), Cawdry (the lookout) |
| Turtle Elders | the Eldest | Moss (mostly asleep), Shelly (knows the park's gossip), Slowpoke (always arriving) |
| Night Crew | Rigby | Socket (welder), Ringo (driver, wants to race), Mama Mask (runs the drain kitchen; strict about "union rules") |
| Grate Rats | Subway Sue | Express (fast-travel conductor), Pinstripe (a rat in a tiny tie), Crumbsy (slice-crust connoisseur) |
| Bethesda Choir | Maestro Vibrato | Soprano Bella, Basso Lou, Encore (always wants one more song) |
| Reservoir Racers | Coach Wingate | Sprint, Lapcount, Wheezy (never finishes a lap) |
| Meer Mob | Big Sal | Knuckles, Tiny (huge), Sister Feathers (the brains) |
| Cedar Hill Pack | Biscuit | Pretzel (a dachshund), Fifi (a poodle), Moose (a sleepy mastiff) |
| Strix's parliament | Professor Strix | Hoot and Nanny, two owlets who ask riddles |
| Rhoda's family | Rhoda | Rex (her mate, a show-off), Pip (a nervous fledgling learning to dive) |
| **Bodega Cats** | **Queenie** (a regal tabby, 110th & Lenox) | Pickles (orange, sleeps on the bread at the CPW & 72nd bodega), Tux (a tuxedo lobby cat in Walter's building, very posh), Mrs. Whiskerton (ancient, "seen every mayor") |
| **Carriage Horses** | **Clementine** (an old grey carriage mare) | Duke (the mounted-unit horse, by the book), Dapple (young, dreams of seeing the Ramble), Big Ben (a gentle giant who only says "Hup") |
| **The Racket** (songbirds) | **Mimi** (a starling impressionist) | Jay (a loud blue jay who heckles the crows), Ruby (a cardinal who quotes Shakespeare), Chip (a house sparrow who works the slice joints' tables) |
| **The Honk** (waterbirds) | **Gertrude** (a Canada goose; loud) | Lieutenant Gander (her enforcer), Stilts (a great blue heron, very Zen, at the Pool), Nightcap (a black-crowned night heron, Lake edge at Dusk) |

**Star turns.** So the regulars aren't wallpaper, each crew has one regular who acts on the main path (staging and lines only; no new systems): Dove (the Wedding), Old Pecan (his 1974 cache ends the dogs-and-squirrels feud), Bubbles (does every Lake dive in Act 1, showing off), Ledger (writes every trade in his book, and reads the Wanted board aloud), Slowpoke (every truce waits for him to arrive), Ringo (demos the rigged Zamboni and rides the launch), Express (conducts Sue's slice relay), Encore (demands "one more!" so the sax busker joins the Choir), Lapcount (times the race), Sister Feathers (counts your flock for Big Sal), Pretzel (first to chase the tennis balls), Hoot and Nanny (their riddle points at the moss route), Pip (practises dives over the Meer during Rhoda's fight, a free telegraph), Pickles (the anchovy fan at CPW & 72nd is his bodega's regular), Tux (shows the raccoons Walter's back stairs), Big Ben (pulls the cone home: "Hup."), Chip (shows you a phone-ring Mimic on Prickett), Lieutenant Gander (leads the Wedding wedge).

**Pigeon bosses each have their own recruit gimmick:** the Duchess judges a feeding frenzy, Vibrato needs an audience that stays, Wingate needs a race won, and Big Sal needs a **flypast**: fly your flock through the Blockhouse arch while Sister Feathers counts heads out loud.

Favour examples: Nutmeg wants the Cherry Hill caches re-counted (fly over, peck the plumes); Glint wants a blue bottle cap from a city grate (Call the rats); Pip wants a "safe" dive demo; Ringo wants a lap of the drive in the pedicab under 40 s; Wheezy needs pacing round the Reservoir; Fifi wants Biscuit's ball, just once; Pickles wants a garlic knot knocked off the counter "for science"; Chip wants Mimi to teach him the cab horn; Dapple wants to see the Ramble, so lead her along the bridle path to its edge; Stilts wants the Pool quiet (geese Bully the fisherman's radio away); Dove wants to learn a proper dove's coo, so get Mimi to teach her one ("Coo-OOH-oo. Like a SAD pigeon, darling.").

| # | Crew | Where | Talent (how they help) | How you win them over (summary) | Thread |
|---|---|---|---|---|---|
| 1 | **The Plaza Swells**, posh pigeons (top hats, a monocle); **Duchess Pidgeley** | Grand Army Plaza / The Pond | +6 flock (Dove among them: the only pure-white bird in your swirl); teach **Coo** | *Prologue.* Flip 3 signs around the Pond. The Duchess flies over to the feeding frenzy. | Sign War |
| 2 | **The Acorn Syndicate**, squirrels; **Hazel** (forgetful) | Sheep Meadow, Cherry Hill | **Dig**: unearth what's under a dust plume | Hazel forgot her caches. The plumes only show from above 10 m: fly up, spot 3, peck each. | Lost & Found |
| 3 | **The Lake Mallards**, ducks; **Commodore Puddles** | The Lake, Turtle Pond, Harlem Meer | **Dive**: fetch what's under bubble rings | They won't eat bread ("Do you KNOW what bread does to us?"). Flip the Boathouse sign at Afternoon; picnickers toss **peas**. | Sign War |
| 4 | **The Ramble Exchange**, crows; **Vesper** | The Ramble (day) | **Trade**: crows swap items with humans for gear (10 crumbs a trade); they run the Lost & Found market | Entry fee: 3 shinies, one needing the squirrels and one the ducks. Vesper then shows you the sealed cave: your **Workshop**. | Lost & Found |
| 5 | **The Turtle Elders**, slow and wise | Turtle Pond | **Hints**: the step's answer, from anywhere; truces are sealed on their rock | Their rock is blocked by a sunken shopping cart. Ducks surface the handle, a hauler tugs it out. | Feuds |
| 6 | **Biscuit**, a huge fluffy off-leash dog (rival → ally), and the Cedar Hill Pack | Cedar Hill, day | **Fetch**: hauls one huge thing | *Fight:* deliver his lost tennis ball (heavy, carried low; the ducks dive for it and hand it to Gus, #40) while he charges. | Lost & Found |
| 7 | **Professor Strix**, the Ramble owl (rival → ally) | The Ramble, Night | **Night Eyes**: at Night, hidden things within 30 m glow | *Stealth encounter* (needs the headlamp). Return her spectacles. | Lost & Found |
| 8 | **The Night Crew**, raccoons; **Rigby** | North Woods / Ravine, D–N | **Rig**: makes vehicles drivable, unbolts and cuts things; **Sabotage**: ranger carts | Rigby needs a wrench from the Delacorte: trade for it, or bribe the stage-door guard with a hot slice. | Sign War |
| 9 | **The Bethesda Choir**, artsy pigeons (berets); **Maestro Vibrato** | Bethesda Terrace | +12 flock; the **megaphone** (Voice) | They need an audience that stays (the sax busker keeps stealing it): make the Middle signs permanent, then a feast. | Sign War |
| 10 | **The Reservoir Racers**, fitness pigeons (sweatbands); **Coach Wingate** | Reservoir track | +10 flock; **Draft**: flying with your flock doubles boost | Clear the spiked gatehouse, win the race (wings or wheels), a feast. | Spikes |
| 11 | **The Grate Rats**; **Subway Sue** | Subway grates | **Fast travel** between the 7 grates; **Grate Fetch**: anything that fell through a grate | Get a whole hot slice down her grate. | Slice Run |
| 12 | **Rhoda**, the Fifth Avenue hawk (rival → ally) | Fifth/74th ledge, raiding the Meer | **Lift**: carries one huge thing straight up or across | *Fight* at the Meer, then give her back her spiked ledge. | Feuds |
| 13 | **The Meer Mob**, tough northern pigeons (bandanas); **Big Sal** | Harlem Meer / the Blockhouse | +14 flock; **Muscle**: the flock hauls huge things | Rhoda's gone quiet; fly a flypast of ≥ 30 through the Blockhouse arch, then a feast (crumbs or slices). | Feuds |
| 14 | **The Bodega Cats**; **Queenie** | 110th & Lenox, CPW & 72nd, Fifth lobbies | **Knock**: knock anything off a high edge (counters, shelves, hooks, ledges, spike strips) | A hot anchovy slice from the far side of the park. | Slice Run |
| 15 | **The Carriage Horses**; **Clementine** | CPS carriage line, the drives | **Kick**: kick open anything stuck; **Pull**: haul a huge thing by a road | Get Prickett's van off their water trough. | Spikes |
| 16 | **The Racket**, songbirds; **Mimi** the starling | Everywhere; starlings on the museum's ledge (their stage: the columns throw their songs down the museum steps; while it's spiked they circle in front of it, cleared they line it) | **Mimic**: lure a human away with a sound (phone ring, car alarm, ranger whistle, ice-cream jingle) | Clear their spiked roost, then teach Mimi the ice-cream jingle. | Spikes |
| 17 | **The Honk**, geese and herons; **Gertrude** | The Lake, Great Lawn, Reservoir, Meer | **Bully**: geese chase humans off a spot in the park (they drop what they're holding) | Settle the geese-and-ducks feud by giving the geese their own lawn. | Feuds |

**Stray pigeons:** 40 lone pigeons hide around the park and city ring, on ledges, under bridges, on water towers and in the Blockhouse. Talk to one and it joins your flock. Each has its own colour morph and neck sheen (see "Pigeon colour morphs" in Art direction), so the flock grows visibly more motley as it grows. The maximum flock is 82 (6 + 12 + 10 + 14 + 40). Up to 24 fly visibly with you; the rest are a number on the HUD, and every one of them shows up in the finale.

**Dialogue targets:** each boss has about 8 lines: 2 before you meet properly, 3 during their scheme, 2 after joining, and 1 reaction to the Mecha's progress, plus 3 **voiced barks** (greeting, arriving on a Call, joining). Each of the 50 named regulars has about 4 (Dove 6) (including their favour and one nudge). Prickett has about 10, Walter, Dolores, Vinnie and the ranger about 4 each. Each crew has 2 "wrong place" lines and a pool of ~6 ambient barks for its unnamed members ("That's HIM. The pigeon.") that change once the crew joins. Strays and humans have a one-liner pool with New York flavour ("Excuse me, I'm WALKING here." "Is that pigeon carrying a slice?").

### The five threads (parallel campaigns)

The **Scheme Board** has five lanes side by side. Each lane has a one-line goal, a meter, and its open and finished cards. Every scheme belongs to one thread, but most need friends or items from another.

| Thread | Goal (one line) | Meter | Antagonist | Crews it wins | Parts | Reward when the meter is full |
|---|---|---|---|---|---|---|
| **The Sign War** | Make the park feed the birds, for good. | Bread Power 0/30 (+ carts 0/3) | the rangers | Swells, Ducks, Raccoons, Choir | Eyes, Voice | A "FEED THE BIRDS" sash for Gus; the finale's bread rain doubles |
| **The Slice Run** | Get pizza flowing into the park. | Slice Lines 0/3 | Vinnie the hot dog man | Rats, Cats | Body | Every Slice Line gives two slices a phase; a pizza-box backpack for Gus |
| **Spikes** | Run the Spike Man out of the park. | Spikes cleared 0/10 (+ his stock) | Del Prickett of Prickett Pest-Pro | Songbirds, Horses, Racers | Talons | His cap as a trophy; all 12 Summit Perches pay 5 crumbs a visit |
| **Feuds & Truces** | Make peace, then make plans. | Truces 0/4 | the feuds | Turtles, Geese, Rhoda, Meer Mob | Legs, Power core | A peace medal; truce combos everywhere |
| **The Lost & Found** | Work the crows' market for gear you can't get alone. | Deals 0/6 | (time and place) | Squirrels, Crows, Biscuit, Strix | Wings, Beak | A crow-feather bow tie; Vesper gives 3 golden pretzels |

**Lanes appear one at a time.** A lane shows up on the Board (and its meter on the HUD) only when its first card opens, with a 5 s intro of its antagonist: no wall of empty counters. After the Prologue the Board has three lanes and four open cards: the Sign War (ducks), the Slice Run (rats, cats) and the Lost & Found (squirrels). **Spikes** arrives when the cats join (the starlings' and Racers' roosts; usually ~15–20 min in), **Feuds & Truces** when the turtle scheme opens (after the ducks and Biscuit). Until then the HUD shows only Crews and Parts. Thread rewards are nice extras; the finale needs only crews and parts.

**How the threads feed each other** (the interlocks):

- **Sign War → Spikes (push-back).** Making a region permanent draws crowds of pigeons, so Prickett follows them and spikes two perches there the next Morning. Do the Rink Job (Talons) first and he never comes back. Either way, it only costs perches.
- **Sign War ↔ Spikes: the Rink Job, where two threads meet.** Once the rangers lose their first cart, they lock the South cart up at Night in Wollman Rink's service yard, parked across the door of the shed where Prickett keeps his stock. One Zamboni launch flattens the cart (South signs permanent, a hubcap) **and** bursts the shed (the Talons). Both antagonists, one door.
- **Slice Run → Sign War, Feuds, Spikes.** Hot slices bribe the Delacorte guard (Rigby's wrench), Walter the doorman (Rhoda's ledge) and the raccoons (the Zamboni), and feed Big Sal's feast.
- **Slice Run ↔ Feuds.** The cats-and-rats truce opens the Slice Relay (a hot slice at any grate) and the Harlem Slice Line. Keeping slices hot is easy from then on.
- **Spikes → Slice Run.** The horses (won in Spikes) open the Carriage Slice Line and pull huge parts along roads.
- **Spikes → Spikes (push-back).** Kicking Prickett's van off the horses' trough (`den-horses`) makes him move his stock into the rink shed, and he spikes two South perches on his way (P5, P6).
- **Spikes → Lost & Found.** Horses kick open the sidewalk-shed gate for the Beak. Songbirds' Mimic stops a jogger long enough to trade.
- **Lost & Found → everything.** Gear (sunglasses, pen, headlamp) opens terraces, enamel signs and the night woods. Rats' Grate Fetch and crows' trades turn up items for every thread.
- **Feuds → Lost & Found and parts.** The dogs-and-squirrels truce lets squirrels dig the Great Lawn (Legs); the geese truce opens the Bow Bridge arm (Power core).
- **Sign War + Feuds: the Wedding.** Dove (from the Prologue's Swells) and the geese (won in Feuds) together clear the Bow Bridge wedding for the Power core.
- **Sign War helpers:** songbirds can Mimic the ranger's radio whistle and geese can Bully a ranger back into his cart, each delaying a revert by 3 game minutes.

### Thread 1: The Sign War

- **30 "Don't Feed the Birds" signs:** 8 South, 8 Middle (Middle + Ramble zones), 8 North (Great Lawn, Reservoir and North zones), 6 on the city ring.
- Flip one and it reads **"FEED THE BIRDS"**. Within 10 seconds, 2 to 4 humans nearby wander over and **toss a pile of crumbs, nuts or peas** under the sign: about **12 crumbs** (20 at Afternoon, 8 at Dusk; nobody feeds at Night). The pile **stays until it's eaten** (a nap clears it: "The pigeons got 'em"), so you can flip and fly on and collect later. While the sign stays live, the feeders add about 3 crumbs a minute to the pile. A sign within 10 m of a spiked perch pays nothing (the pigeons can't land).
- **Rangers fight back.** Each park region has a **ranger cart** on patrol. **3 game minutes** after a flip (Morning to Dusk; game time on the fixed step, so replays repeat), a ranger drives over, gets out, tuts, and flips it back. You can watch it happen. Napping also reverts non-permanent flips.
- **Unless the raccoons sabotage the carts.** Once the Night Crew has joined, go to a region's parked cart at Night and call Rigby (each cart has a small obstacle first). Raccoons pull the spark plug and pop off a **hubcap**. (The South cart is the exception: it sleeps in Wollman Rink's locked yard and is only reachable in the Rink Job, where a landing Zamboni does the job.) From then on, every flipped sign in that region is **permanent**, with a "This sign is now PERMANENT" stamp. Any two hubcaps are the Mecha's **Eyes**.
- **City ring signs** have no rangers: they are permanent as soon as they're flipped. They all need the paint pen.
- **Permanent signs are crumb engines:** each pays **+3 crumbs per nap**.
- **Bread Power** (HUD meter, 0 to 30) counts permanent signs. **It gates nothing.** More Bread Power means more feeders, more crumbs and a fatter, happier flock, and the finale's bread rain gets bigger.

| Signs | Where | Flip with | Made permanent by |
|---|---|---|---|
| S1–S3 | The Pond (east path, Gapstow Bridge, Pond south shore) | peck | South cart (patrols from the Dairy by day; sleeps in Wollman Rink's yard at Night; the Rink Job) |
| S4–S8 | Wollman entrance, Heckscher Playground, Carousel, Umpire Rock, Merchants' Gate | peck | South cart |
| M1, M3, M4, M7 | Sheep Meadow, Cherry Hill, the Mall south (Vinnie's), Boathouse picnic tables | peck | Middle cart (parks in the Boathouse lot) |
| M2, M5, M6, M8 | Tavern on the Green, the Mall north (Vinnie's), Bethesda upper terrace (needs sunglasses), Conservatory Water | paint pen | Middle cart |
| N1, N2 | Great Lawn west and east | peck | North cart (parks in the 103rd Street shed) |
| N3–N8 | Cleopatra's Needle, Reservoir south gatehouse, Reservoir north gatehouse, Conservatory Garden gate, Harlem Meer, North Meadow | paint pen | North cart |
| C1–C6 | Columbus Circle, Grand Army Plaza fountain, Fifth Ave/76th sidewalk shed, CPW/79th museum steps, Fifth Ave/89th spiral museum, 110th Street | paint pen | permanent at once |

### Thread 2: The Slice Run

- The rules are in "Pizza slices" above: slices are light items, hot for 60 s, handed over with Peck.
- **Slice Lines (meter 0/3):** a Line is a crew agreeing to bring one hot slice into the park each phase, to a fixed drop.
  - **Columbus Line**: the rats drag slices through the tunnel to **Merchants' Gate**. Opened by winning the Grate Rats.
  - **Carriage Line**: Clementine "saves" the driver's lunch slice at the **Pond carriage stop** (M–D). Opened by winning the Carriage Horses (Spikes thread).
  - **Harlem Line**: cats knock slices down to the rats, who bring them to **Harlem Meer**. Opened by the cats-and-rats truce (Feuds thread).
- The thread's aha puzzles: Sue's slice (startle a tourist, rush it down the stairs), Queenie's hot anchovy (relay through the grates or use the griddle), and the slice on Vinnie's cart.

### Thread 3: Spikes

**Del Prickett** of Prickett Pest-Pro is a cheerful, relentless pest-control man in grey coveralls with a spray tank and a clipboard. He isn't evil; he's on contract. His white van has a drawn pigeon in a red no-circle on the side and "PRICKETT PEST-PRO" in code text. He bolts spike strips and staples nets onto the perches pigeons love. Once the horses run his van off their trough, he rents a corner of Wollman Rink's equipment shed for his stock ("Rink's paying me to keep you lot off the boards anyway.").

- **A spiked perch** can't be landed on (Gus bounces off, "boing"). Its Summit reveal and nap don't work, nearby signs pay nothing, and strays roosting there leave. Spikes never go on Nests, and never block a step whose clearing ally isn't available yet.
- **Two kinds**, each with an obvious clue:
  - **Strips** (glued, teetering on the edge): **cats Knock** them off. Any time.
  - **Nets and bolts** (stapled or bolted down): **raccoons** cut or unbolt them (D/N), or **Rhoda Lifts** them off (day).
- **Prickett follows the pigeons.** He spikes 4 sites when the Prologue ends. After the Middle or North cart is sabotaged, he spikes 2 more in that region the next Morning. When `den-horses` moves him into the rink, he spikes 2 South sites on the way. Once his stock is gone (the Rink Job), he quits and spikes nothing more: sites he never installed count as cleared.

| Site | Where | Kind | When it goes up | What it blocks |
|---|---|---|---|---|
| P1 | Grand Army Plaza lampposts (the Swells' perch) | strips | Prologue end | sign C2 pays nothing |
| P2 | Reservoir south gatehouse roof (the Racers' roost) | strips | Prologue end | the Racers' scheme |
| P3 | Natural history museum ledge, CPW/79th: the stone ledge over the columns, the starlings' stage (#36: 12 big strips along both runs, glued in a rush, half off the lip; the whole ledge bounces Gus; the cats bat them over the edge one by one, onto the sidewalk) | strips | Prologue end | the Racket's scheme |
| P4 | Fifth/74th ledge (the hawks' home) | bolts | Prologue end | Rhoda's scheme (cleared inside it) |
| P5, P6 | Gapstow Bridge rail; Plaza Hotel roof edge | strips; net | after `den-horses` | the selfie postcard; a Summit Perch |
| P7, P8 | Bow Bridge rail; Bethesda arcade ledges | strips; net | after `sab-middle` | Dove's wedding postcard; 3 strays |
| P9, P10 | Cleopatra's Needle tip; Conservatory Garden gate tops | bolts; net | after `sab-north` | a Summit Perch and postcard; sign N6 |

### Thread 4: Feuds & Truces

Four feuds keep the park divided. Each one only stops an ally coming to certain spots (the wheel says why). Settling one is a **truce**: both bosses shake on the Elders' rock (a 5 s scene) and you get a **combo**.

| Feud | What it blocks | Truce scheme | Combo you get |
|---|---|---|---|
| Dogs vs squirrels | squirrels won't come to Cedar Hill or the Great Lawn | `truce-dogs-squirrels` | **Dig & Fetch**: squirrels dig on dog lawns while the pack stands guard (needed for the Legs) |
| Cats vs rats | rats won't come up at the 110th grate; no fast travel there | `truce-cats-rats` | **Slice Relay**: Ask the rats at any grate for a hot slice, once per phase; the 110th grate opens; the Harlem Line |
| Geese vs ducks | ducks won't come to Bow Bridge's arm of the Lake | `den-geese` | The Honk joins; ducks work the whole Lake (needed for the Power core) |
| Hawks vs pigeons | Rhoda raids the Meer; the Meer Mob won't talk | `den-rhoda` | Rhoda's Lift; the Meer Mob will deal |

### Thread 5: The Lost & Found (the crows' market)

The Exchange is a big oak in the Ramble. Its **Wanted board** (drawings, no text) shows which humans have lost something and are out *this phase*, with the lost item's silhouette, so the board changes as you nap. Its **stall** holds what the crows found: Strix's spectacles, and a spare shiny for 15 crumbs at Afternoon. Each trade is its own small scheme: bring the item, get the human's attention (every trade has a small catch), Call the crows next to them, pay Vesper's 10 crumbs. Ledger writes each deal in his book. **Deals 0/6** counts the trades.

| Gear / item | What it does | Item → who the crows trade with |
|---|---|---|
| **Sunglasses** (face) | **Incognito**: humans don't shoo you on patios, terraces or hotel steps | A **shiny** (the Plaza Hotel's roof, by its flagpole turret) → a selfie-taking tourist at the Grand Army Plaza fountain, once you've photobombed him |
| **Paint pen** (beak) | Flips the **enamel** signs. Early signs have a loose "DON'T" plate you just peck off. | The Tavern on the Green waiter's dropped **cufflink** (on the patio, needs sunglasses, and he's standing on it) → a sidewalk artist on the Mall |
| **Headlamp** (head) | Lights the dark Ramble and North Woods at Night | A **lost key** (ducks dive it at Turtle Pond) → a Reservoir jogger, who never stops running… |
| **Spectacles** | Strix's (returned in her scheme) | 10 crumbs on the stall |
| **RC remote** | Drives the RC boat (Wings) | A spare **shiny** → a kid at Conservatory Water (or Mimic the ice-cream jingle and he leaves it on the bench) |
| **Traffic cone** | The Beak | The foreman's lucky **hard-hat sticker** (down a grate) → the foreman |

Gear shows on Gus's model as small code-built attachments.

### Ledger's Scarf Stash (an optional side collection)

Ledger, the crows' bookkeeper, wears a plaid scarf himself and is a snob about knitwear. The first time Gus lands near him in his slice-orange scarf: "Now THAT is a scarf. Hand-knit? Tell me it's hand-knit." From then on he runs a little scarf trade on the side.

- **Currency: falafel.** The halal cart man tosses a falafel ball to any pigeon who coos at his cart while he works (Afternoon at Grand Army Plaza, Dusk at 110th & Fifth): one per visit per phase. A falafel ball is a light item. Ledger takes them at the Exchange oak ("Crows can't resist a falafel. It's documented.").
- **The stash:** 10 scarves, each a few falafel. Most are bought; a few are earned and can't be bought, which turns them into small bonus goals:
  - bought from Ledger: Gus's slice orange (the starting scarf), taxi checker (yellow and black), deep subway blue, autumn maple stripes, a Ramble-green cable knit, a fluffy cream mohair;
  - earned: the **Choir's rainbow stripe** (Vibrato's gift when the Choir joins), **Ringo's racing red** (after the Rink Job), **Dove's wedding white** (after the Wedding), and the **"FEED THE BIRDS" bread-print** (when Bread Power reaches 30).
- **Wearing one:** at any Nest, "Scarf" opens a small wardrobe of everything in the stash. Pick one and Gus swaps it with a little twirl. Crews comment now and then ("Ooh, the taxi one!"). The scarf shows on Gus in the world, in his portrait frame on the Board, and in the finale.
- **It's purely for fun.** Scarves change nothing in play, cost nothing on the main path, and count toward Completionist. Falafel is only for scarves, so the slice economy and crumbs stay simple.
- **Assets:** one shared code-built scarf mesh (the wrap and two tails Gus already wears) with 10 knit-pattern textures (nanogen seamless tiles, about $0.04 each), a falafel-ball item model (code: a small bumpy sphere with a generated texture), a falafel icon, and Ledger's compliment and trade lines.

### Fights (and why flying away doesn't win them)

| Fight | Where, when | How it plays | The rule that keeps you engaged |
|---|---|---|---|
| **Biscuit** (dog) | Cedar Hill, day, ~60 s | Telegraphed charges (he crouches and wiggles 1 s first). Hide behind or under benches. | You're carrying his heavy ball, so you can't fly above 2 m. Drop it and he guards it; you must deliver it. |
| **Professor Strix** (owl) | Night Ramble, ~90 s | A ~120 m woodland crossing with a noise meter. **Moss** (soft green, glowing in the headlamp) is silent; **dry leaves** are bright orange crunch piles; plain path is quiet at a walk. The meter fills slowly and fades fast when you stand still. If it fills, she swoops: one feather, and back to the last of **3 moss islands** (checkpoints). After a 2nd catch, a nudge and a **flock decoy** are offered: hold Coo on a moss island and your flock flutters off the other way, turning her head for 10 s. | **Flapping is the loudest sound in the woods**: she hears wingbeats instantly, and the canopy is too low to glide. You cross on foot. |
| **Vinnie** (angry vendor) | The Mall, Dusk, ~45 s | While Rigby rigs the hot dog cart (30 s), keep Vinnie busy: dodge broom swings round the Bethesda arcade columns. | He chases only within 10 m of his cart. Fly off and he walks back, spots Rigby, and the step resets. You stay low and close. |
| **Rhoda** (hawk) | Harlem Meer, Afternoon, ~60 s | She circles, screeches, then dives (a shadow and a whistle telegraph it). Three mobs win. | She only dives when you're over the water and below 5 m, and you can only mob her there. |

Fights are 30 to 90 seconds with generous telegraphs. A hit costs one feather. Losing all three means "Ruffled!", never a game over. After two losses in a fight, its assist is offered (a slower Biscuit, the owl decoy, a lazier broom, Rhoda's dives telegraphed 1 s longer).

### Food

**Crumbs** are the currency. Eat crumbs, peas, nuts, pretzel bits and hot-dog ends by walking over them (they're sucked up with a gulp). Income comes in **lumps you pick up on the way**, never by standing still: the Prologue's frenzy gives about 40; every sign flip leaves a pile (12, or 20 at Afternoon) that waits until eaten; postcards give 10 each; favours 10–15; the Pigeon Lady's bench always has a small pile on Mornings; permanent signs add 3 each per nap. Spend them on:

- **crow trades:** 10 crumbs each (7 on the main path, counting Strix's spectacles);
- **gang feasts** to seal a deal: Racers 30, Choir 40, Meer Mob 60 or 3 slices (the Swells' feast is the Prologue frenzy);
- **"Feather Up":** 15 crumbs at any Nest restores all feathers;
- the stall's spare shiny (15), if you ever need one.

The main path costs about 200 crumbs. **Never grind:** a player who flips the signs that lie on their way earns more than the next cost before reaching it. Act 1 costs about 80 (Racers' feast and five trades) against about 40 (Prologue) + 10 incidental flips (~150) + postcards. The autopilot's main-path run checks it: at every trade and feast it must already have the crumbs without a detour. The HUD crumb counter flashes the shortfall on a feast card ("Feast: 60. You have 41."), and the Board marks the three nearest uneaten piles on the compass.

**Slices** are bribes, not Gus's food (he tries one in the Prologue tutorial card: "Too big. Must be for someone important.").

**20 Golden Pretzels** are hidden (rooftops, water towers, the Ramble cave, under Bow Bridge, the top of the obelisk and more). Each adds a little stamina permanently.

### The Mecha-Pigeon: 8 parts, built in the Workshop (the Ramble's sealed cave)

The Mecha is **assembled in code from the real parts** you delivered. Each part bolts onto a scaffold as it arrives, so you watch it grow. In the Workshop it is built **at true part scale** (about 3.5 m tall, the real 2 m hot dog cart as its body). At the start of the finale the raccoons throw a big lever marked **"BIGGIFY"** (the battery hums, a flash, a burst of feathers), and the same assembly stands 18 m tall. The look follows the accepted concept `mecha-pigeon`.

| Part | What it is | Where it sits on the Mecha | Scheme | Thread |
|---|---|---|---|---|
| **Body** | Vinnie's hot dog cart (The Mall) | the body (umbrella folded on its back) | `part-body` | Slice Run |
| **Talons** | Prickett's whole stock of spike strips, from the Wollman Rink shed | bundled into three big claw-toes on each foot | `part-talons` (the Rink Job) | Spikes |
| **Legs** | Two old iron drainpipes under the Great Lawn | the legs, with hip pivots | `part-legs` | Feuds |
| **Wings** | Two sails from sunken model sailboats (Conservatory Water) | the wings, on wooden spars | `part-wings` | Lost & Found |
| **Eyes** | Two ranger-cart hubcaps | the eyes | given by the 2nd cart sabotage (`sab-middle`, `sab-north` or the South cart in the Rink Job) | Sign War |
| **Beak** | An orange traffic cone (★ model) from the Fifth Avenue construction site | the beak | `part-beak` | Lost & Found |
| **Voice** | A megaphone (★ model) | the chest | given by the Choir (`den-choir`) | Sign War |
| **Power core** | A battery (★ model) from a sunken rowboat under Bow Bridge | inside the chest, glowing through a vent | `part-power` (the Wedding) | Feuds |

The cart and sails you delivered stay in the Workshop. Free-roam vehicles: the pedicab stays at the Reservoir, the RC boat on Conservatory Water, and the **Zamboni** in its Wollman Rink garage (any phase; ramps freeze only at Night).

### Scheme steps (the data the builder writes)

**30 schemes:** 17 crews (the Prologue wins the first), 6 parts, 2 cart sabotages (the South cart falls inside the Rink Job), 3 gear trades and 2 truce-only schemes. Eyes and Voice come from other schemes. Each row is one entry in `src/data/schemes.js`; **Opens when** is the scheme's `opensWhen` (all of the listed flags; "any of" is written `anyOf`); each step is `needs (phase · place · ally/item/gear/flock) → does`. Steps marked **either / or** are alternatives (`alts`): any one completes the step. All step flags persist through naps, and so does every world effect a later step needs (see the nap rule in "Time of day"). A flock size a scheme needs is a step need, shown on its card with your count, not a hidden gate.

Notation: phases **M** Morning, **A** Afternoon, **D** Dusk, **N** Night, **day** = M/A/D, **any** = all four. An ally named in *needs* must be Called there and awake in that phase. **Haul** = Biscuit (day) **or** Rhoda (day) **or** Muscle (any) **or** horses' Pull (day, roadside items only): any one that's recruited; items in open water need Rhoda or Muscle. **Hot slice** = a slice under 60 s old; **slice** = any slice. ★ marks the "aha" puzzles.

| ID → gives | Thread | Opens when | Steps: needs → does | Act |
|---|---|---|---|---|
| `prologue` → Swells (+6, Coo), ~40 crumbs | Sign War | New Game | 1. M · Pond · peck S1 → feeders (scripted first minute). 2. any day · peck S2, S3 (all three live at once) → the Duchess flies in to judge the feeding frenzy; Swells join (Dove introduces herself: "Shh. Everyone thinks I'm a dove."). 3. auto → a ranger reverts S1 on camera; Prickett's van pulls up and spikes P1–P4 ("Nothing personal, birds. Contract."); the Board opens with its first three lanes. | Prologue |
| `den-ducks` → Dive | Sign War | `prologue` | 1. day · The Lake · talk to Puddles → card "Ducks want peas. Who has peas?". 2. A · Boathouse · three picnickers round a little table ~12 m down the slope from sign M7, a **tub of peas** on it; card riddle "They never leave that tub. Well… hardly ever. What gets a picnic up off its benches?" A swarm **fails out loud** ("We've been mobbed by better pigeons. The peas STAY."); pecking the tub gets "Hands OFF, pigeon!". **Flip M7 up the path** → the whole picnic walks over to feed the birds, the tub is alone for ~15 s: grab the **peas** ("Hey! HEY! The PEAS!"). While M7 stays live they get up again every ~30 s, so a missed grab is only a wait. (A known lesson, a FEED sign, used for something new: moving people. Fun pass P3; the answer is in Bubbles' 3-minute nudge.) 3. day · give peas to Puddles → join. | 1 |
| `den-squirrels` → Dig | Lost & Found | `prologue` | 1. day · Sheep Meadow · talk to Hazel → card "Hazel lost 3 caches". 2. day · fly above 10 m → 3 dust plumes appear; peck each (icon shown, first use) → crew digs a cache (×3). 3. day · return to Hazel → join. | 1 |
| ★`den-rats` → fast travel, Grate Fetch; **Columbus Line** | Slice Run | `prologue` | 1. any · Columbus Circle grate · Subway Sue → card "Sue wants a whole slice. Hot. Down the stairs." 2. day · the joint's bench · a tourist is eating one: hold **Coo** to swarm him → he drops the **slice** (first-use card: "Slices go cold. Some folks care."). 3. any · Peck it to Sue while hot → the rats haul it down the steps in a slapstick relay → join (6 grates; 110th stays shut until the cats-rats truce). | 1 |
| `den-crows` → Trade, market, Workshop | Lost & Found | `den-squirrels`, `den-ducks` | 1. day · Ramble · talk to Vesper → card "3 shinies". 2. shiny A: CPW 72nd ledge, peck; shiny B: plume by the Ramble, squirrels; shiny C: Lake bubbles, ducks (Bubbles dives, showing off) (icons shown, first combination). Deliver each. 3. auto on the 3rd → join; Ledger opens his trade book; Vesper leads you to the cave → `workshop`. | 1 |
| `den-biscuit` → Fetch | Lost & Found | `den-ducks` | 1. day · Cedar Hill · Biscuit mopes → card "His ball is in the Lake". 2. day · Lake bubbles (east side) · ducks → **ball** (heavy). 3. day · Cedar Hill · carry the ball to the blanket; fight → join. | 1 |
| ★`den-turtles` → Hints, truces | Feuds | `den-ducks`, `den-biscuit` | 1. day · Turtle Pond · talk to the Elders → card "Something's on our rock". 2. day · bubbles · ducks → the cart handle surfaces against the bank (a huge item). 3. day · any hauler tugs the cart off the rock from the bank → join (Slowpoke arrives as the scene ends). | 1 |
| ★`gear-sunglasses` → sunglasses | Lost & Found | `den-crows` | 1. any · the Plaza Hotel's roof, beside the turret with the flagpole (CPS) · peck the **shiny**. 2. day · Grand Army Plaza fountain · the tourist with sunglasses pushed up on his head poses with his back to the fountain and won't look up from his selfies, so the crows can't catch his eye ("…"). Card: "He won't look up from his phone. So get IN it." **Photobomb him by framing:** stand on the fountain rim right behind him (what his phone sees) for a moment → "Wait… a pigeon in my… that's actually a GREAT shot." ("Is that a DOVE back there too?!"); he lowers the phone to show his friend; the crows swap the shiny for the sunglasses, 10 crumbs. A swarm gets "Ugh. Pigeons. *turns his back*"; Mimic: "He's already ON his phone, Gus." (Fun pass P6; Monty's nudge.) | 1 |
| ★`gear-pen` → paint pen | Lost & Found | `gear-sunglasses`, `den-cats` | 1. A · Tavern on the Green patio · in sunglasses the waiter takes you for a regular, but he's standing right on the dropped **cufflink** ("…"; card: "He won't move off it… unless something more expensive than a cufflink needs him."). A flock at the bread basket only gets "Shoo! SHOO!". Move him: **either** the cats knock the wine glass teetering on the patio table's edge (a teeter clue) → it smashes, he rushes over with a dustpan **or** songbirds Mimic the patio phone → he hurries inside; peck the **cufflink**. 2. A · the Mall · crows at the sidewalk artist, 10 crumbs → paint pen (a portrait of Gus in thanks; it hangs in the Workshop). (Fun pass P8; Pickles' nudge: "A glass, right on the edge of a table? It's practically a REQUEST.") | 1 |
| ★`gear-headlamp` → headlamp | Lost & Found | `den-crows`, `den-rats` | 1. day · the 86th Street W grate (CPW) · the jogger's key went down it mid-lap; rats' **Grate Fetch** → **lost key** (Express: "A KEY! On a little sneaker! Somebody runs a LOT."; fun pass P9: the rats' second talent in Act 1, one dive fewer). 2. M or D · Reservoir track · the jogger never stops, so crows can't trade: **either** songbirds Mimic his phone (he stops to check it) **or** wait at the north gatehouse water fountain where he stops each lap; crows at him, 10 crumbs → headlamp. | 1 |
| `part-wings` → Wings | Lost & Found | `den-crows` | 1. day · Conservatory Water bubbles · ducks → **sail 1** (heavy); carry it to the Workshop. 2. A · Conservatory Water · a kid clutches his RC remote ("…"): **either** crows swap him a spare **shiny**, 10 crumbs **or** songbirds Mimic the ice-cream jingle → every kid on the pond runs for the Plaza and the remote is left on the bench → **remote**. 3. any · the second sunk boat is jammed under the pond's spout, where the ducks won't dive ("That's a SHOWER, Gus."): drive the RC tug to it, hook it, tow it back → **sail 2**; carry it in → part. | 1 |
| ★`den-cats` → Knock (and P2 cleared) | Slice Run | `prologue` | 1. any · 110th & Lenox bodega · Queenie → card "Queenie wants an anchovy slice from the CPW & 72nd joint. HOT." 2. day · CPW & 72nd · card "The fan on the bench never lets go. But the counterman's left a fresh one cooling on the sill, right next to Pickles. Pickles is asleep. Pickles is a CAT." The fan is the red herring (a swarm: "Mob me all you like. This one's MINE. Go bother the CAT."); grabbing the sill slice gets "Not with Pickles RIGHT there." **Wake Pickles** (peck him, or Coo under the window) → he stares at you, slowly pushes the slice off the sill (it lands hot) → "…I didn't do that. You didn't see that." → **anchovy slice**. 3. Get it to her hot (card "820 m. Over the park, it'll be cold by 96th Street."): **either** rats from the 72nd W grate to 96th E, then fly 300 m (needs `den-rats`) **or** D · warm it on the halal griddle at 110th & Fifth, then fly the 120 m along 110th; Peck it to Queenie → join; Pickles clears the Racers' roost (P2) as his first job ("For SCIENCE."). Almost-feedback: Mrs. Whiskerton when it goes cold in the beak; Queenie names the problem on a cold one ("Under it, perhaps?" / the griddle) and a fresh slice is on the sill a minute later (no nap). (Fun pass P4, P5.) | 1 |
| ★`den-songbirds` → Mimic | Spikes | `den-cats` | 1. day · CPW/79th museum · starlings circle their spiked cornice (P3) → card "Prickett spiked the starlings' roost". 2. any · cats at the cornice → strips knocked off. 3. A · Grand Army Plaza · Mimi wants a new sound for her act: perch on the ice-cream truck and peck its chime button while she watches → she learns the jingle (and lures every kid on the Plaza with it) → join. | 1 |
| `den-racers` → +10 flock, Draft | Spikes | `den-cats` | 1. day · Reservoir · Coach → card "Somebody cleared their roost. Now he wants a race." (the cats cleared P2 as they joined). 2. day · win the flight race (Lapcount holds the stopwatch; after two losses Coach eases to 8 m/s and Sprint flies ahead to show the line), **or** D · raccoons at the pedicab (needs `den-raccoons`), win the wheeled division. With 30 crumbs, the winner's feast happens in the win scene → join. 3. (only without 30 crumbs) day · 30-crumb feast → join. (Fun pass P5: no duplicate cats-strips step, no chore after the payoff.) | 1–2 |
| ★`den-geese` → Bully (the Honk) | Feuds | `den-turtles` | 1. day · the Lake · the geese hold Bow Bridge's arm; the ducks are boxed out → card "Gertrude won't share. Geese need BREAD." 2. A · Great Lawn · flip N1 and N2 (peck) while Gertrude watches → the picnickers there toss bread → the geese march off to their new lawn. 3. day · Gertrude and Puddles shake on the Elders' rock → truce; the Honk joins. | 1–2 |
| ★`den-horses` → Kick, Pull; **Carriage Line** | Spikes | `prologue`, `anyOf(den-songbirds, den-geese)` | 1. M · CPS carriage line · Clementine → card "That van's parked on our trough again." 2. M · move Prickett: **either** songbirds Mimic his phone (Chip's favourite trick: he wanders off to "answer" it; Duke's officer writes a ticket; he drives off grumbling) **or** geese Bully him off the kerb. 3. M · the horses drink → join. | 1–2 |
| ★`truce-dogs-squirrels` → Dig & Fetch | Feuds | `den-turtles`, `den-squirrels` | 1. M · Cedar Hill · the walker's eight dogs chase the squirrels off → card "No squirrel digs where the dogs run". 2. day · Cherry Hill plume · squirrels → Old Pecan's 1974 cache: a **sack of tennis balls** (heavy). 3. M · Cedar Hill · drop it by the dog walker → balls everywhere, eight dogs and Biscuit's pals chase balls, not squirrels; Hazel and Biscuit shake on the Elders' rock → truce. | 1–2 |
| `den-strix` → Night Eyes | Lost & Found | `den-crows`, `gear-headlamp` | 1. day · the Exchange · Strix's **spectacles** are on the stall: 10 crumbs → spectacles. 2. N · Ramble · wearing the headlamp, stealth crossing to her branch; give spectacles → join. | 2 |
| ★`den-raccoons` → Rig, Sabotage | Sign War | `den-crows` | 1. D · North Woods · meet Rigby → card "Rigby needs a wrench. The Delacorte stagehand has one." 2. **either** N · Shakespeare Garden · Night Eyes shows the stagehand's lost **earring** (needs `den-strix`); peck it; D · Delacorte · crows at the stagehand, 10 crumbs → **wrench**; **or** D · Delacorte stage door · Peck a **hot slice** to the guard → he waves you backstage; peck the **wrench** off the prop table. 3. D · North Woods · give Rigby the wrench → join. | 2 |
| ★`sab-middle` → Middle permanent, hubcap | Sign War | `den-raccoons`, `den-cats` | 1. N · Boathouse lot · the gate is locked; the key hangs on the booth's hook, teetering → cats → it drops; peck it, peck the gate → `boathouse.gateOpen` (stays open through naps). 2. N · raccoons at the cart → sabotaged. | 2 |
| `sab-north` → North permanent, hubcap | Sign War | `den-raccoons` | 1. N · 103rd St shed · the door's latch rope is high: hold Coo at it with a flock of 15 or more (the card shows "Flock 15 needed: you have 11") → the flock yanks it, door opens → `shed103.open` (stays open). 2. N · raccoons at the cart → sabotaged. | 2 |
| (2nd sabotage) → **Eyes** | Sign War | any two of `sab-middle`, `sab-north`, `part-talons` (its South cart) | auto: Rigby hands you two hubcaps → part. The third hangs on the Workshop wall. | 2 |
| `den-choir` → +12 flock, **Voice** | Sign War | `sab-middle`, `gear-pen`, `gear-sunglasses` | 1. day · Bethesda · Vibrato → card "The sax busker steals our audience. We need one that STAYS." 2. any day · "An audience that STAYS needs feeding on the way in": flip the four on the crowd's way to the terrace, M3 (Cherry Hill), M4 and M5 (both ends of the Mall) and M6 (the terrace; M5/M6 with the pen, M6 in sunglasses); permanent now (fun pass P11: was all eight). 3. A · Bethesda terrace · 40-crumb feast, Coo → a crowd gathers; Encore shouts "One more!", the sax busker joins in instead of competing, and the Choir sings → join; the Choir carries the megaphone to the Workshop. | 2 |
| ★`part-body` → Body | Slice Run | `den-raccoons` | 1. A · the Mall · make Vinnie fed up: **either** M4 (peck) and M5 (pen) live at once → pigeons swarm his cart **or** Peck a **hot slice** onto his counter while customers queue → "PIZZA? At MY cart?!" → flag `vinnie.fedup` (kept through naps). 2. D · the Mall · Vinnie storms round his cart instead of wheeling it home; raccoons at the cart, Vinnie fight → rigged. 3. D · drive it to the Workshop → part. | 2 |
| ★`truce-cats-rats` → Slice Relay, **Harlem Line** | Feuds | `den-turtles`, `den-cats`, `den-rats` | 1. any · 110th & Lenox · cats chase the rats from the bodega bins → card "They'd share… if there were enough for everyone." 2. Get a whole **pizza box**: **either** A · East Drive · stop the delivery cyclist (songbirds Mimic his phone, or geese Bully him) **or** day · CPW & 72nd joint · cats Knock one off the pickup shelf. 3. any · bring it (heavy; grate to 96th E, then low) to the 110th kerb and peck it open → cats on one side, rats on the other, a slice each; Queenie and Sue shake on the Elders' rock → truce. | 2 |
| ★`part-legs` → Legs | Feuds | `den-strix`, `truce-dogs-squirrels` | 1. N · Great Lawn · Night Eyes marks 2 pipe spots (plumes now show by day). 2. day · squirrels at each while the pack stands guard → **pipe ×2** (huge, beside the transverse road). 3. haul each (horses can Pull here) → part. | 2 |
| ★`part-power` → Power core (**the Wedding**) | Feuds (with Dove from the Sign War's Swells) | `den-geese`, `den-rhoda` (a flier to lift from open water) | 1. day · Bow Bridge arm · the ducks spot a sunken rowboat with something glowing in it, but a **wedding photo shoot** packs the bridge and the landing, and the flash keeps scaring the ducks off → card "The wedding won't leave until they get their dove release. The doves never showed." 2. ★ day · Bow Bridge · the planner holds an empty wicker basket ("!"): Peck the basket with Dove in your flock ("Dove, you're on.") → she settles in; the lid opens, she rises in a perfect white spiral, the photographer weeps → "Gorgeous! Now EVERYONE in for the group shot!" → flag `wedding.doveReleased` (kept through naps: from now on the party poses for its group shot every day phase). 3. ★ day · Bow Bridge · the group shot blocks the bridge ("…"): Call the geese and Ask them → Lieutenant Gander leads the honk wedge, the whole party stampedes off the bridge, the bouquet flies, Dove catches it mid-air, and the photographer, backpedalling, takes the shot of the century (a polaroid on the Board) → flag `wedding.cleared`. In the same scene (Fixes-2: "Showpieces end on the laugh") Bubbles, no longer scared by the flash, surfaces the glowing **battery** and Rhoda swoops in and carries it off to the Workshop; the geese come round again, the photographer goes over flat on his back, and the flash fires: the shot of the century is the stampede (him, the wedge, the flying veil, Dove with the bouquet). The scheme ends on the photo → part. Wrong tools are funny and harmless: geese before the release and the party digs in ("NOBODY moves till we get the DOVE SHOT!"; the geese bounce off a wall of tulle); songbirds' Mimic gets "Phones OFF, people! We're WORKING!" and the guests shuffle straight back. | 3 |
| ★`part-beak` → Beak | Lost & Found | `den-crows`, `den-rats`, `anyOf(den-horses, den-raccoons)`, `anyOf(den-horses, den-biscuit)` | 1. M or A · Fifth/76th site · the foreman moans about his lucky hard-hat sticker, lost down the 77th E grate → card; rats at the grate → **sticker**. 2. M or A · crows at the foreman, 10 crumbs → "Take a cone, kid." The cone is behind the sidewalk shed's jammed gate. 3. **either** horses Kick the gate (day): Big Ben kicks it **and** pulls the cone home in the same scene ("Hup."; step 4 then completes at once) **or** raccoons Rig the latch (D/N) → the **cone** (huge, on the kerb; it stays there through naps). 4. day · after the raccoons: a hauler (Biscuit or the horses) takes it home (flag `cone.home`) → part. (Fun pass P12.) | 2–3 |
| ★`den-rhoda` → Lift | Feuds | `prologue`, `den-raccoons` | 1. any day · Harlem Meer · Big Sal points at the sky → card "Rhoda raids the Meer". 2. A · Meer · fight (Pip practises dives overhead) → Rhoda: "They spiked my ledge." 3. ★ D · Fifth/74th · Peck a **hot slice** to Walter → he props the service door while he eats; Call the raccoons there in the same phase → Tux leads them up the back stairs → bolts off (P4) → Rhoda and Rex move home → join. (Nap before the raccoons go up and Walter has shut the door again: bring another hot slice.) | 2–3 |
| ★`den-meermob` → +14 flock, Muscle | Feuds | `den-rhoda` | 1. day · Blockhouse · Big Sal: "Show me your crew." With a flock of 30 or more (the card shows the count), fly the **flypast** through the Blockhouse arch while Sister Feathers counts heads ("…twenty-nine, THIRTY. Huh."). 2. day · a 60-crumb feast **or** Peck him 3 **slices** → join. | 3 |
| ★`part-talons` → Talons; the South cart sabotaged (South permanent, a hubcap); Prickett quits (**the Rink Job**) | Spikes × Sign War | `den-raccoons`, `den-horses`, `anyOf(sab-middle, sab-north)` | 1. M · Wollman Rink yard · Prickett wheels pallets of spike strips into the equipment shed and rolls down the steel door; a ranger's notice on it shows a drawn cart in a "parking" box → card "Prickett's stock AND the last ranger cart, behind one steel door. Nothing with paws opens that." (Call the horses to the door and Clementine kicks it: BONK. "That's steel, kid. I'd need a running start.") 2. D · Zamboni garage (rink's south end, on the service road) · the garage door is buckled (it puffs dust): horses **Kick** it open; raccoons at the Zamboni, plus one **slice** for Mama Mask ("union rules") → rigged (`zamboni.rigged`, kept through naps). **Ringo takes it for a spin:** he dumps a pile by the kids' little ice bump and sprays it; it slumps to slush ("Bah. Needs to be colder. Bet she'd FLY off a big enough bump, though."). Drivable from now on. 3. ★ N · the rink · the boards and the parked cart stand between the ice and the shed. Drive laps until the hopper's full, **Dump** the snow in the **launch lane** (the 12 m of north boards marked with painted "KEEP CLEAR" chevrons, visible in every phase and lit by the cart's parking lights at Night), **Spray** the pile → it freezes into a glassy ramp. Run up across the rink at full speed (≥ 3.5 m/s, heading roughly north) and hit it → **LAUNCH** (the chain reaction; see "The Rink Job" below) → flags `cart.south` (South signs permanent, a hubcap) and `shed.open`; the Talons arrive in the Workshop in the showpiece's tag. Next Morning: Prickett in front of the folded shed door: "This park is IMPOSSIBLE!" He leaves for good. | 2–3 |
| `finale` | — | all 17 crews and all 8 parts | Workshop doors open → BIGGIFY → Stomp → Climb → Shout. | Finale |

**Checks this table passes** (and `tools/check-schemes.mjs` re-checks from the data):

- No cycles; every scheme is reachable from New Game; the finale needs exactly 17 crews and 8 parts.
- Every step's ally is awake in that step's phase (horses' Pull only at roadside spots), and every phase-locked human is out in that phase: stagehand and stage-door guard D, foreman M/A, RC kid A, jogger M/D, Vinnie D, dog walker M, the Tavern waiter A, the selfie tourist M–D, Prickett M (CPS trough, Wollman Rink) and D/N (110th, scenery), Walter any, delivery cyclist A, the wedding party M–D (until `wedding.cleared`), ice-cream truck A, halal cart A at the Plaza / D at 110th.
- For every step with alternatives, each alternative is valid on its own needs, and **for every state that satisfies the scheme's `opensWhen`, at least one alternative is satisfiable** (so an `anyOf` in `opensWhen` can be matched by alternatives that each need one of its options, as in `den-horses` and `part-beak`).
- Every step needing a **hot slice** has a slice source and route within 60 s at cruise (or a grate relay or griddle) in that phase; the checker reads the distances from `layout.js`.
- Every step that **must** use a pen sign opens only after `gear-pen` (an alternative may use a pen sign if another alternative needs no pen, as in `part-body` step 1); every patio/terrace step only after `gear-sunglasses`; every Night step in the Ramble or North Woods only after `gear-headlamp`.
- Every haul step's scheme opens only once a valid hauler for that spot and phase is recruited (open-water items: a flier).
- No required step needs a perch on a spike site unless the scheme opens only after that site's clearing ally (P2, P3 after `den-cats`; P4 inside `den-rhoda`).
- No feud blocks a required step before its truce: the Great Lawn digs, the 110th grate and Bow Bridge's arm are used only by schemes that open after their truce.
- **The Rink Job:** from `layout.js` (`rink`), the straight ice run from the far boards to the launch lane is ≥ 20 m (4 m/s needs about 6 m), so ≥ 3.5 m/s is reachable; off the ice the Zamboni is capped at 1.5 m/s and a hop outside the lane is turned back toward the rink's centre, so no route to the shed exists except the launch; the freeze step is Night only; the north gate is impassable until `cart.south`; the whole of step 3 happens inside one Night phase.
- **The Wedding:** the battery comes up only inside the stampede (after the dove release; Fixes-2). The wedding runs M–D, and the ducks are only awake M–D, so there's no Night way round it. Dove is in the flock from `prologue` on, so the basket step needs nothing beyond `opensWhen`.
- No step depends on a non-permanent sign staying flipped across a nap: steps that need flips (prologue 2, ducks 2, `den-geese` 2, Body 1) complete while the flips are live and set their own flag.
- **Nap-safe:** for every scheme and every pair of consecutive steps, the checker applies the nap rule between them and confirms the next step is still completable (this is what caught Walter's door).
- In every reachable state before the finale at least 1 scheme is open (checked by walking every completion order). After the Prologue, 4 are open at once (ducks, squirrels, rats, cats).

### Showpieces (two scripted set pieces)

Both are physics-lite: a fixed arc and tweens, triggered by a game-state check, fully deterministic on the 1/60 step, so the recorded solutions replay them exactly. Each plays in full the first time; replays (after a reload) can be skipped with Peck.

**The Rink Job (`part-talons` step 3).** The trigger (all in `layout.js` `rink`): a frozen ramp whose centre lies inside the **launch-lane box** (12 × 4 m against the north boards), crossed by the Zamboni at 3.5 m/s or more with its heading within ±30° of north. On the trigger the arc's yaw snaps to due north and the arc always lands on the cart's fixed spot, so the replay is exact. Then:

1. **Lift-off** (1.4 s, slow-motion for the middle 0.6 s). The Zamboni leaves the ramp lip on a fixed parabola over the boards. Gus's feathers stream; Ringo, clinging to the back, whoops "BEST. NIGHT. EVER!"; the rink's PA, left on, plays a cheerful organ waltz.
2. **Pancake.** It lands square on the South ranger cart, which flattens like a soda can with an accordion crunch. Its hubcap pings off and rolls a long, wobbling circle (the camera follows it for a beat), and its horn jams into one long honk.
3. **Door.** The bounce rolls the Zamboni into the shed's steel roll-up door, which folds in the middle and drops.
4. **Avalanche.** Pallets of spike strips burst out through the now-clear north gate and skate across the ice in a long glittering fan, clattering.
5. **Strike.** The lead strips bowl into the rink's stack of orange training cones: a perfect strike, with a bowling-alley "STRIKE!" crowd roar (the rink's PA). The last strip spins slowly to a stop at Gus's feet.
6. **Tag.** The rest of the strips slide into a glittering heap against the south boards. Rigby strolls up: "Union'll handle it." The Night Crew loads the heap onto the flattened cart and sleds it out of the north gate in a conga line, Mama Mask steering ("Mind the paintwork."): the **Talons** go to the Workshop. A light comes on in the Dairy, a ranger peers out, sees nothing, and switches it off. Prickett's clipboard flutters down onto the ice. "+ Spikes 'Stock busted'", "South signs PERMANENT" and "+ PART: Talons" stamps. The Zamboni is left parked on the ice by the north gate.

**After the job (optional):** a dozen stray strips stay glittering on the ice (they never clear on a nap). Driving over them hoovers them into the hopper (a clattering vacuum; each fills the hopper gauge by one-twelfth) and Dumping them by the yard's scrap bin pays 2 crumbs each ("scrap value"). Nothing needs it.

A miss is funny too, and costs nothing: too slow, and the Zamboni chugs up the ramp, teeters at the top and slides back down ("wheee…"). A ramp outside the lane, or hit at the wrong angle, just makes a short hop whose direction is turned back toward the rink's centre. A ramp built at Dusk is slush.

**The Wedding (`part-power` step 3).** The trigger is the geese being Asked at the bridge while `wedding.doveReleased` is set. Then: Gertrude honks the order, Lieutenant Gander lowers his neck, and the honk squad charges in a wedge behind him. The guests scatter in every direction, arms up (the humans' run clip, with flee tweens). The bride's bouquet spins up in an arc, and Dove catches it at the top in her beak. Bubbles surfaces the glowing battery from the rowboat and Rhoda carries it off to the Workshop. The wedge comes round for a second pass, the photographer backpedals and goes over flat on his back, and the flash fires: a freeze-frame of the "shot of the century" (a code-composed still of the stampede: him on his back, the geese, the flying veil, Dove with the bouquet; with a polaroid border) slides onto the Scheme Board. The veil settles over his face: "…THAT'S the shot." The scheme ends there (Fixes-2).

### Finale gate (one rule)

**All 17 crews and all 8 parts.** Nothing else (signs, spikes, lines and truces are optional beyond what those need). The Workshop doors then open. The Board lists exactly what's missing.

### Order and difficulty curve

Any open scheme can be done in any order; the acts describe the usual flow. Lanes join the Board as their first card opens (Spikes about 15–20 minutes in, Feuds about 20–25); from then on, every thread has something open in every act.

| Thread | Act 1: Friends in Low Places (day, South + Middle + city ring, ~40 min) | Act 2: The Night Shift (~35 min) | Act 3: Above the Streets (~25 min) |
|---|---|---|---|
| Sign War | Prologue, ducks | raccoons, Middle and North sabotages (Eyes), Choir (Voice) | the South cart (in the Rink Job); finish Bread Power |
| Slice Run | rats, cats | Body | — |
| Spikes | songbirds, Racers, horses | (clear new sites) | the Rink Job (Talons) |
| Feuds & Truces | turtles, geese, dogs & squirrels | cats & rats, Legs, Rhoda | Meer Mob, the Wedding (Power core) |
| Lost & Found | squirrels, crows, Biscuit, sunglasses, pen, headlamp, Wings | Strix, Beak | — |

1. **Prologue: Crumbs** (~8 min). Waddle, hop, fly, perch, eat, peck a sign, coo. The Swells join. A ranger flips your sign back and Prickett spikes the Plaza: two antagonists in one minute.
2. **Act 1** (~40 min). The first friends and talents. The first slice puzzles, the first truces, the first gear. The city ring is open from the start.
3. **Act 2** (~35 min). Night opens up: the owl, the raccoons, sabotage and driving. Prickett pushes back as signs go permanent. Most parts arrive.
4. **Act 3** (~25 min). The hawk, the Meer Mob, the Wedding, and the Rink Job: the Zamboni launch that ends the Spikes thread (it opens in Act 2, but most players reach it here).
5. **Finale: Feed the Birds** (~8 min).
   - **BIGGIFY:** the raccoons pull the lever; the Workshop Mecha grows to 18 m and bursts out of the Ramble (a 10 s cut).
   - **The Stomp:** an on-rails stomp down a stylized Fifth Avenue (about 60 s). Steer between 3 lanes and step over yellow cabs. The flock swirls overhead; doormen salute, carriage horses rear, cats watch from every bodega door, crowds throw bread.
   - **The Climb:** climb the Empire State Building (about 50 s). Alternate Flap and Peck to climb (left claw, right claw) and sidestep left or right. Three **crew beats** break it up, each a quick prompt that always succeeds: a gust hits and Rhoda and Rex grab the Mecha's shoulders and lift it past ("Hold STILL, you big lug!"); a news chopper's spotlight swings in and the whole flock swirls in front of it ("Coo!"); the Grate Rats cheer from every window on the 80th floor and wave a bedsheet banner (a drawn pigeon, no text). Missed rhythm just slows you; nothing knocks you off.
   - **The top:** at the spire, one prompt: **"Press ✕ to SHOUT"**. The camera swings out and Gus, on the Mecha's head, bellows **"FEED THE BIRDS!"** A brass stinger hits, the whole city looks up, and bread (and one slice) rains from every window. Credits roll over the park celebrating with every crew.
   - **Post-credits sting:** a painted still of pigeons in Paris, Tokyo and Cairo looking up and cooing back… "Next: the world?"

**Puzzle tuning:**

- **Race:** 10 rings around the Reservoir (about a 600 m loop, 3 to 12 m up, two rings through the gatehouse arches), data in `layout.js` (`raceRings`). Coach flies a fixed line at 9 m/s (about 70 s); Gus at cruise does it in about 58 s. A missed ring shows a big arrow back. Wheeled division: the pedicab on the running track against Coach's posted 100 s.
- **Owl crossing:** a path polyline with moss and leaf patches and 3 moss islands, data in `layout.js` (`rambleStealth`). Meter: path walk +4%/s, sprint +15%/s, each leaf crunch +30%, any flap 100%; −20%/s when still or on moss.
- **Slices:** hot 60 s; cruise 11 m/s; hot routes as listed in "Pizza slices". Data: `layout.js` (`sliceJoints`, `sliceDrops`, `griddle`).
- **Rink and Zamboni:** data in `layout.js` (`rink`: the ice rectangle about 50 × 30 m, the boards 1.1 m high, the **launch-lane box** 12 × 4 m against the north boards, the garage, the yard, the shed, the cart's spot, the north gate, the scrap bin, the kids' bump and the post-job parking spot). Zamboni: 4 m/s on ice, 1.3 m/s², 1.5 m/s off the ice; the hopper fills after 25 s on ice; **tap F = Dump, hold F for 0.3 s = Spray**; a pile counts as in the lane if its centre is inside the box; the ramp freezes in 3 s at Night; launch at ≥ 3.5 m/s with a heading within ±30° of north (the arc's yaw then snaps north); the hop arc is 1.5 m high and, outside the lane, its direction is reflected toward the rink's centre; the lane arc carries 9 m to the cart's roof. After the showpiece the Zamboni is placed on the ice at the north gate.

**Clues must read at a glance:** every clue is a big, high-contrast tell visible from 10 to 60 m: dust plumes with acorn sparkles, bubble rings with a white splash, a glint, a bobbing "!" over a human with a wanted item, a wobbling teetering object with a little dust trickle, a "…" bubble over a blocker, red spikes on a perch, steam over a hot slice. At 1280×720 each clue is at least about 16 px on screen at 60 m (and still about 12 px at 844×390 on Low). A clue that stays on screen for 2 s gets a "?" ping on the compass.

**Difficulty:**

- The puzzles are the challenge. Every step has a visible world clue; the Board card names the goal and the obstacle ("Rigby needs a wrench. The stagehand has one."), never the action.
- **Layered hints:** card (it names where and who) → after ~3 minutes **stuck** on a step, a regular's nudge in the world → on request, the Elders' answer. Every puzzle step (any step that isn't talk / reach / automatic) has both a nudge and an answer (check-schemes enforces it). The 3-minute clock counts only while Gus is within 80 m of one of the step's places or targets, and a failure (a cling or a shoo, a cold slice, a wrong-place Call, a lost race or fight, a ranger fixing a Prologue sign) brings the nudge to within a minute (fun pass P7).
- Many steps have more than one solution: hauls (four haulers), the wrench (trade or slice), Vinnie (signs or slice), Prickett at the trough (Mimic or Bully), the cyclist (Mimic or Bully), Queenie's slice (grates or griddle), the waiter on the cufflink (swarm or Mimic), the RC kid (shiny or the jingle), the jogger (Mimic or the water fountain), the sidewalk-shed gate (Kick or Rig), Big Sal (crumbs or slices), the race (wings or wheels).
- The hardest skill moments have an easier route or an assist: the race's wheeled division, the owl crossing's checkpoints and flock decoy, the fight assists.

**Avoiding frustration:**

- There is no game over.
- Lose all 3 feathers and you're **"Ruffled!"**: you wake at the last Nest, nothing lost, and any dropped light item floats back to where you found it (slices excepted; there are always more).
- A dropped heavy item or part stays where it fell, marked on the compass.
- Allies come to you; you never escort anyone.

## Win, lose and progress

- **Win the game:** finish the finale. After the credits, the game returns to the park (sunny, signs all flipped, your flock huge) for free roaming and tidying up. A "Completionist" stamp on the Scheme Board marks all pretzels, strays, Summit Perches, Park Postcards, favours and full thread meters.
- **Lose:** only feathers. Hawk dives, dog tackles, a broom, or getting caught by the owl cost one feather. Scenery, spikes and falls never do. At 0 you're Ruffled (above).
- **Saved to localStorage** (one of three slots, below): flags for every scheme step, crews, parts, gear, the scarf stash and the scarf being worn, items carried and dropped (with positions; a slice with its age), signs (flipped and permanent), carts sabotaged, spike sites, truces, Slice Lines, collectibles, postcards, favours, crumbs, flock count, time of day, last Nest and settings (including mute).
  - Autosave on every scheme step, nap and Nest, plus a manual Save in pause.
  - **Three save slots** (`--saves`; src/saves.js, keys `cpp-saves` + `cpp-slot-1..3`). Each slot shows: time of day (Morning to Night), crews won over (of 17), Mecha parts (of 8), time played and when it was last played; a finished game shows "Park won". Settings stay shared by every slot (their own key).
  - Title: Continue (the slot played last), Load, New Game. New Game takes the first empty slot; with all three full it asks which to replace ("Replace Save 1? Afternoon, 3 of 17 crews…"). The Load screen lists every slot (Empty ones start a new game there) with Delete, which asks first; an unreadable slot says "This save can't be read" with Delete. Storage full: a toast, and play goes on.
  - The single save from before slots (`cpp-save-v1`) moves into slot 1 the first time the new build loads. Autosaves still go where they did, into the slot being played.

## Screens

- **Loading:** a still title backdrop with a feather-shaped progress bar. The title stays still until the core models are in and the shaders are compiled.
- **Title:** the logo (HTML text in the game font over the key art, in its open top-left sky). New Game / Continue / Settings / Credits. "Press any key or button", and "Tap to start" on phones.
- **How to play:** four cards (Move and fly, Peck and coo, Calling allies, Driving), with prompts for the device in use. They live in pause; first-time play uses in-world prompts instead.
- **Gameplay HUD:**
  - top-left: feathers (3), the stamina wing arc, the Ally wheel portrait, the carried-item slot (a slice shows a cooling ring), and below them a one-line "Current goal" from the tracked scheme (goal and obstacle; dismissible). A scheme becomes tracked when its first step is done; finishing the tracked scheme tracks the open one most recently moved on (Fixes-3);
  - top-centre: a compass strip with markers for scheme targets, Nests, dropped items and "?" clue pings; the tracked step's target is the character a talk or give step is for (else its signs, a named spot such as "The slice tourist", or its place), so the marker never vanishes on arrival at a place (fun pass first-15 check);
  - top-right: crumbs, flock count, Crews and Parts, the meters of the lanes that have appeared (Bread Power first), the time-of-day icon, and the map, board, speaker (mute) and pause buttons;
  - context prompt near Gus ("□ Give slice");
  - while driving: a speed dial, and on the Zamboni a snow-hopper gauge and the Dump/Spray prompt;
  - a small toast when any thread meter ticks ("Slice Lines 2/3").
- **Guidance** (UI only: it reads the game and never changes a rule, a timer or a random stream; `src/ui/guide.js`):
  - **Goal text** names a visible, findable thing and where it is, short enough for the card. Every step also has a `where` ("Commodore Puddles is out on the Lake, just east of Bow Bridge"): a location, never a method (check-schemes checks each step has one, under 120 characters, and that each goal is under 90).
  - **The soft marker:** a small orange pin, bobbing, over the tracked step's target (exactly the compass's targets: the character a talk or give step is for, its unflipped signs, a named spot, or its place). It fades out over the last few metres as Gus arrives, and never shows in a cutscene, dialogue, a menu, the wheel, a nap or the finale. Over the Prologue's first sign the sign's own "!" does the job.
  - **"Where to?"** (G, R3, or a tap or click on the compass; a mouse glance over the compass shows the marker for 3 s): the marker shows for 6 s with its distance, and a line at the head of the toast column says where: "Commodore Puddles is out on the Lake, just east of Bow Bridge · 110 m north-west".
  - **"Something to do":** after a while with no step done (not while Gus is within 30 m of a tracked step he can do now and whose nudge hasn't come), a small card under the goal card suggests the nearest open step whose needs hold now (phase, allies, gear, crumbs, flock; carrying its item is preferred, not required), as "<scheme>: <where>." plus "<Phase> is the time for it." when the step is limited to a phase or two. If nothing can be done in this phase: "Nothing more to do this Morning. Nap at a Nest until Afternoon: <scheme> is waiting." If only crumbs are short, it says so. Dismiss it with its ✕; "Where to?" (or a click on it) tracks that scheme. The Board's foot always shows the same suggestion with a "Track it" button.
  - **Setting "Guidance"** (saved with the other settings): **Subtle** (default) shows the marker within 60 m of the target or for a few seconds on "Where to?", and suggests after 150 s with no progress, at most once every 5 minutes; **Normal** always shows the marker on the tracked target and suggests after 75 s, at most once every 3 minutes; **Off** shows nothing beyond the goal card ("Where to?" just says that guidance is off).
- **Ally wheel:** a radial of up to 12 recruited ally portraits; greyed ones say why ("Sleeps until Dusk", "Keeps to the roads"). Call / Ask. It opens with nobody chosen, so letting go without choosing (or ○ / Esc) calls no one (#33).
- **Dialogue:** a bottom panel with a speaker portrait, name and typewriter text with species chatter blips. Tap, click or ✕ to advance.
- **Scheme Board** (J): a cork board with **up to five lanes**, one per thread, each appearing (with a 5 s antagonist intro) when its first card opens. Each lane's header has the thread's name, one-line goal, icon (code SVG: sign, slice, spike, paw-and-wing handshake, crow with a key) and meter. Under it, polaroid cards for open and finished schemes. Each card shows its goal and obstacle, the phase it needs ("Nap until Dusk" button), the crumb cost, and small tags for the friends it uses. **The tags never name the ally before the step's nudge has shown** (fun pass P1: working out *who* fits the clue is the puzzle): until then a friend from another thread reads "A friend from the Slice Run" (with that thread's icon) and a friend from the same thread shows nothing; after the nudge (or the Elders' answer) the crew's name shows. The flock tag shows only when the size itself is the obstacle (more than the Swells' 6). No red string between cards (#39: it looked like it tied unrelated cards together; the tags already say which thread a friend comes from). A header strip shows the finale gate: "Crews 9/17 · Parts 3/8". Plus "Ask the Elders" (the current step's answer and its ally icon), the postcards and the tracked-card toggle.
- **Map** (Tab): a top-down view of the park rendered from the real world geometry. Areas you haven't seen stay fogged until you visit or perch. Markers show Nests, grates, signs (red, green or green with a stamp), carts, spike sites (red spikes), slice joints and drops, the griddle, feud spots, crews and scheme targets. You can set a waypoint. It opens zoomed in on the part of the park Gus is in (the whole map's width across the window); a button shows the whole park. Grates show as subway bullets once the rats have joined. On a controller (#34) the map's buttons take no focus: the left stick or D-pad moves the cursor, ✕ sets the waypoint, □ clears it, R1 zooms in round Gus, L1 shows the whole park, the right stick pans, ○ closes; setting or clearing a waypoint says so.
- **Roster / Workshop:** Crews 7/17 and the Park Support headcount; each crew page shows the boss and the regulars as their **character cards** (portrait, name, one-line bio, favour tick), its talents and a crowd count; plus the 8 parts on the Mecha silhouette.
- **Nest menu:** Feather Up (15 crumbs), Save, Nap until…, **Scarf** (the wardrobe of Ledger's Scarf Stash).
- **Pause:** Resume, Nap until…, Scheme Board, Map, Controls, Settings, mute, Report a bug, Save & quit to title.
- **Settings:** music volume, effects volume, mute, camera sensitivity, invert Y, flight camera auto-follow, vibration, show FPS, guidance (Subtle/Normal/Off), graphics (Auto/Low/Medium/High).
- **Ruffled!:** a feather-burst transition, then "Ruffled! Back to your nest." with the lost item noted.
- **Victory / credits:** the shout scene, then scrolling credits over the celebrating park and the post-credits sting, then back to the title (with "Continue" into free roam).
- **"Turn your phone"** overlay in portrait.
- **"Controller disconnected"** on the pause screen.
- **Report a bug** form (see feedback.md).

## Juice

Must-haves:

- **The head-bob** while waddling: Gus's head locks in space, then snaps forward each step.
- Feather puffs on take-off, landing and hits.
- Squash and stretch on hops and landings.
- Gus's slice-orange scarf, its loose ends streaming and fluttering behind him in flight (and flopping with each head-bob on the ground), so he's always the bird you're following.
- Wind streaks and a whoosh on dives.
- Bank and roll in turns.
- Leaf burst when flying through a canopy; a soft "bonk" and glancing slide off walls; a springy "boing" off spikes.
- The flock streaming behind in a boids swirl; at a Coo, it bursts out and regathers.
- A sign flip: the plate pops off and spins away, the sign wobbles, a "FEED THE BIRDS" stamp and a little crowd "ooh".
- Crumbs bounce as they land; a gulp sound and a crumb counter tick when you eat.
- **Slices:** steam wisps that thin as it cools; the slice flops as Gus banks; the tip droops when cold; a sizzle and fresh steam on the griddle.
- **Cat Knock:** the cat stares at you, then slowly, deliberately pushes the thing off the edge. It falls with a clatter.
- **Horse Kick:** a rear-legs buck, a "BONK" and a dust cloud; the gate swings or the garage door buckles back up.
- **Mimic:** musical-note puffs from the starling; the human's head turns with a "?" and they wander off patting their pockets.
- **Bully:** neck out, wings flared, a hiss; humans flee with arms flailing and drop what they hold.
- **Spikes cleared:** strips clatter down, the perch gets a sparkle and a "Perch back!" stamp.
- **Truce:** both bosses shake (paw and wing) on the Elders' rock, a polaroid snaps.
- Allies arriving on a Call with their entrance.
- "+1 CREW" polaroid flash when a crew joins, with the boss's portrait and a jingle; the crowd of that species cheers across the park.
- Each Mecha part bolting onto the scaffold with sparks and a clank.
- Vehicles bounce and smoke a little; raccoons give a thumbs-up on rigging.
- **Zamboni:** a slow, stately fishtail on the ice; a glossy wet ribbon laid behind it that frosts over; snow spraying into the hopper; the hopper tipping with a soft "whumph" of snow; a fan of spray; the pile glazing over in a crackling sweep of frost sparkles; a padded thud and wobble off the boards; skaters gliding aside, arms windmilling. Gus's tiny feet barely reach the pedals.
- **The Rink Job and the Wedding** (see "Showpieces"): slow motion at lift-off, a big landing shake, the wobbling hubcap, the strip avalanche and the cone strike; the geese wedge, the bouquet arc and catch, and the flash freeze-frame.
- **Motley flocks:** every pigeon in the swirl has its own morph and neck sheen; Dove's white flashes in and out of the grey.
- Camera shake on Mecha steps (the Stomp) and on Biscuit's tackle (small).
- Hit pause (80 ms) when a feather is lost.

Nice:

- Leaves swirl in the wake of fast flight.
- Ripples where you land on water.
- Steam drifting up from grates; the steam-stack updraft lifts Gus with a "whoomph".
- Starling murmuration over the Reservoir at Dusk; geese V's honking overhead in the Morning.
- Gus's eye-blink and an idle preen.
- Lampposts sway a touch when perched on.
- Rumble on hits and hard landings (with the setting on).

## Art direction

- **Style line (pasted into every character, prop and portrait prompt):** "chunky stylized 3D toy look, rounded soft forms, hand-painted textures, cartoon proportions with big expressive eyes, warm late-autumn afternoon light, clean readable silhouette, like a premium vinyl toy, no text".
- **Environment line (for every texture and band, instead of the style line):** "hand-painted stylized texture, flat even light, no cast shadows, no perspective, seamless tileable, soft painterly brushwork, palette #6F9A4A #D9C8A0 #6D6A6A #A65E46 #E8A33D, no text". The accepted key art (`design/mockups/key-art.png`) goes in as the nanogen reference image. Each tile is checked 3 × 3 at bird camera height before it's accepted.
- **Style anchor:** the accepted **`gus-stand`** mock picture. Every later imagegen2 picture uses it as a reference. Gus himself:
  - slate-grey with an iridescent teal-to-magenta neck and orange eyes;
  - one bent tail feather, and a slightly too-confident grin-beak.
- **Accepted pictures, never regenerated or replaced:**
  - **Mock pictures** (`design/mockups/`): gus-stand + gus-stand-back, gus-fly + gus-fly-back, pigeon-plain, ranger (A-pose), bethesda-fountain, belvedere-castle, rigby, vesper, hazel, puddles, biscuit, mecha-pigeon (a look reference for the code build), and key-art.
  - **Character cards** (`design/mockups/cards/<name>.png`, 65 pictures): every boss and regular not covered by a mock, plus Vinnie, Prickett and Walter. They are the portraits, and the matching species concept pictures are **edits of the cards** (see the "Concept source" column in the asset list), so the model and the card always agree.
- **Gus's two models must match:** `gus-stand` and `gus-fly` are made with the same polycount (6k) and texture size, each from its mock and back view as multiple `--image`s. Acceptance (in the Gus test scene): side-by-side renders from behind and from the side at game camera distance; colours, neck sheen, eyes and tail must read as the same bird. `pigeon-plain-fly` is an imagegen2 edit of `pigeon-plain` in the gus-fly pose, held to the same check.
- **Gus stands out in his own flock.** Most wild pigeons are blue bar, like Gus. So the 8 flock slots nearest Gus never hold a blue-bar bird, and Gus alone wears a **short knitted scarf in slice orange (#E07B39)**, the person's choice. It's a code-built attachment on his neck (a knotted wrap plus two tails), not part of his Meshy model, so the tails can stream and flutter in flight (a few verlet points per tail, wind from his speed) and flop with each head-bob. Knit texture: a small seamless nanogen tile. It reads from behind at flight distance; checked in the Gus test scene with 24 birds around him. Gus's portrait and card are updated to wear it (an imagegen2 edit of the anchor); the anchor itself, and Gus's Meshy models, stay scarf-free.
- **Every NPC pigeon** (gangs, strays, flock, bosses) uses **`pigeon-plain`** (and `pigeon-plain-fly`): a neutral face and a straight tail, so nobody is a Gus clone. Gang identity comes from code accessories: Swells top hats and pearls, Choir berets and waistcoats, Racers sweatbands, Meer Mob bandanas.
- **Pigeon colour morphs (painted, not tinted).** Real feral-pigeon variety is part of the charm, so each pigeon model gets **13 hand-painted texture layers**, held in one `DataArrayTexture` with a per-instance layer index. That keeps one InstancedMesh and one draw call per pose.
  - **Layers and their colour reference card:** 1 blue bar (the base model; Duchess, Wingate, Sprint, Big Sal), 2 blue checker (Bella), 3 dark checker (Knuckles), 4 mostly black, green-purple sheen (Lou), 5 mostly white with grey bars (Tiny), 6 ash-red (Monty), 7 red checker (Encore), 8 pied and splashed (Tuppence), 9 **pure white: Dove only** (Dove), 10 silver-dun (Lady Bunting), 11 grizzle (Lapcount), 12 brown pied (Wheezy), 13 mealy (Sister Feathers). Vibrato is layer 1 with a per-instance brighter-blue tint. The **cards are the colour references**: no new swatch pictures are needed.
  - **Neck sheen** is a per-instance hue on the shader's iridescence (teal-magenta, green-purple, bronze-pink, faint on whites). It's a lighting effect, so it lives in code.
  - **How they're made, in order of preference:**
    1. **Atlas edit:** a nanogen pro edit of each model's own Meshy UV texture atlas per morph, with the morph's card as the colour reference and the instruction to keep the layout. Proved on one morph on `pigeon-plain` first (four sides at game distance, no seams) before the other 23 edits.
    2. **Painted by region, free** (if atlas edits seam): `tools/bake-posmap.mjs` rasterises each model's triangles into UV space and writes a position map (the model-space position of every texel). A Pillow script then paints each morph onto the base atlas by body region read from that map (head, neck, breast, back, wing shield, wing bars, primaries, tail): bars, checkers, pied patches and mealy wash are patterns laid in model space, so they're seamless by construction. 0 credits.
    3. **Last resort:** Meshy morph models (12 morphs × 2 poses = 24 models, ~720 credits; would need a small Meshy top-up beyond the ~660 spare credits; only for the morphs that fail both methods above).
  - The crowd LODs keep one texture with a per-instance average-colour tint (they're 120 m away).
  - **Mixes:** the Swells run light (white, pied, ash-red, silver-dun, Dove); the Choir is a bit of everything; the Racers run ash-red, grizzle, brown pied and checker; the Meer Mob runs dark checker, melanistic and mealy; strays and the 40 lone pigeons are random (seeded), with blue bar commonest, as in life. The flock you build is visibly motley.
- **Species models come from the cards.** Each species model's concept picture is an edit of a matching card (or a mock) with that character's accessories removed and the pose fixed for Meshy (four feet down, both legs down, no perch, empty hands); the anchor goes in as the second reference. The named character then gets their accessories back as small code attachments (see "Who wears what"). Hazel's acorn and Rigby's tool belt stay on every squirrel and raccoon.
- **Shared models with code tints.** These are shared because the animals really are the same shape; where a named character's card shows a different build, they get their own model (the asset list's priority order says which ones come first).
  - **One `songbird` model** for every small bird, made in plain light-grey plumage from Chip's card. A **region tint** in its shader (head, breast, back and wings, picked by local position) paints sparrow, starling (with code speckles), robin, blue jay, cardinal and warbler. Crests for jays and cardinals are a small code cone. In flight, the perched model gets two flapping code wing quads (they're specks at 0.15 m).
  - **One `cat` model** (standing, tail up) and a **`cat-sit`** pose; coats by tint (tabby Queenie, orange Pickles, tuxedo Tux, long-haired grey Mrs. Whiskerton).
  - **One `horse` model** (carriage horse with a bridle, no blinkers, from Clementine's card without her plume). Coats by tint (dapple grey Clementine and Dapple, bay Duke, chestnut Big Ben at 1.15×). Plumes, harness, carriage shafts, saddle and navy saddle blanket are code attachments.
  - **Dogs:** `dog` (Biscuit's big fluffy build) for Biscuit, the pack and the coyote (tinted grey-tan, slimmed, only seen at 40 m at Night); **`dog-poodle`** (Fifi) and **`dog-dachshund`** (Pretzel) also fill out the pack and the walker's eight dogs; **`dog-mastiff`** (Moose, lying down). Until a dog model exists its character uses `dog` scaled and tinted.
  - **Owls:** `owl` / `owl-fly` from Strix's card without the log; **`owlet`** (one round baby owl from Hoot's card) for Hoot and Nanny; until it exists, `owl` at 0.55× with a pale tint.
  - **One `goose` model** from Gander's card without his cap; Gander gets a code cap. **`goose-bully`** (neck out, wings flared) as a pose model (Tier B, bought now); its stand-in until made: the Bully is done with neck pivots and code wing quads (see Key poses). **One `heron` model** from Stilts's card, standing on both legs. **`night-heron`** from Nightcap's card (a stocky, short-necked bird; until it exists, `heron` tinted grey-and-black and scaled 0.65, with **no** neck change).
  - **Rats:** `rat` on all fours from Sue's card (the crowd, scurrying), and **`rat-stand`** (sitting up on its haunches, the way the named rats stand on their cards) for Sue, Express, Pinstripe and Crumbsy (bought now; its stand-in, if a remake is pending, is a code tilt of `rat`).
  - **`van`**: Prickett's van (white, code decals). The **ice-cream truck** is its own model (pastel, with the cone on the roof and the serving hatch), because Gus perches on it close-up in the Racket's scheme.
  - **`zamboni`**: the Wollman Rink ice resurfacer (a boxy tractor body, a snow hopper on top, a big rear conditioner and brush, a high driver's seat); from a concept picture, one model, with code pivots for the hopper lid and auger.
- **Rigged humans** (A-pose concepts, empty hands, legs apart, per meshgen; held things are code props on `RightHand`, `LeftHand` or the spine):
  - `human-ranger` (from the ranger mock): the rangers.
  - **`human-walter`** (an A-pose edit of Walter's card: peaked cap, moustache, long green doorman's coat cut above the knee, white gloves): Walter. His card doesn't match the ranger's hat and beard, so he gets his own character.
  - `human-vendor` (Vinnie's card, already a clean A-pose, used directly): Vinnie, the slice countermen (white T-shirt, paper hat), the halal cart man, the ice-cream man, the foreman (hard hat), the stagehand (headset), the stage-door guard (cap, vest), the delivery cyclist (helmet, sits on a code bike).
  - **`human-prickett`** (an A-pose edit of Prickett's card with empty hands): Del Prickett; his **spray tank** (spine), **wand** (`RightHand`) and **clipboard** (`LeftHand`) are code props, so the rig stays clean.
  - `human-park` (a new concept): tourists (phone or camera in `RightHand`), joggers (headband), birders (binoculars), chess players, rowboaters, **skaters** (the walk clip at 0.6× with a code root glide and arms-out offset; the library has no skate clip, `meshgen actions skate` returns none), the dog walker (eight code leashes), the Pigeon Lady Dolores (shawl, felt hat, matching her new card), the busker (guitar and case), the sidewalk artist (beret, easel), carriage drivers (top hat), the mounted-unit officer (navy, helmet; sits on Duke), the kids (0.6× clones with the head bone scaled 1.3×), and the wedding's **groom** (dark suit tint), **planner** (code wicker basket) and **photographer** (code camera rig).
  - **`human-wedding`**: the **bride** (a new A-pose concept: a white knee-length dress so the legs rig, veil as a code prop), so the Wedding's close-up reads as a wedding, not a tourist in white.
- **Portraits = the accepted character cards.** Every named character's portrait is their accepted card (or mock): 17 bosses, 50 regulars (Dove included), Gus (gus-stand mock), the ranger (ranger mock), Vinnie, Prickett and Walter (cards), and **Dolores** (the one new card, an imagegen2 high edit in the same card style, the anchor as reference). Nothing is regenerated. In game:
  - **Dialogue portrait:** a 512² head-and-shoulders crop of the card made with Pillow (a crop box per card in `tools/portrait-crops.json`), **keeping the card's own flat warm-grey background** inside a rounded polaroid frame. No cut-out, so no frayed edges.
  - **Ally wheel:** the same crop in a circle. **Roster:** the full card, as shared.
  - Checked first on Fifi, Mrs. Whiskerton and Hoot (fluffy edges, a perch); if a crop box can't frame a head well, the crop is moved, never regenerated.
- **Palette:** pigeon slate #7A8597, neck teal #2FA39A, neck magenta #B04A8E, autumn gold #E8A33D, maple red #C4492D, park green #6F9A4A, path tan #D9C8A0, schist grey #6D6A6A, sky blue #9FD0F0, dusk violet #6A4C93, brick #A65E46, ranger green #3E5B3A, taxi yellow #F2C230, slice orange #E07B39.
- **One material rule** for everything (Meshy GLBs and code-built world): MeshStandardMaterial, roughness 0.85, metalness 0, no environment map; the same sun, hemisphere fill and fog. At asset time, Meshy textures are colour-graded toward the palette with Pillow.
- **Facade scale:** each facade tile is 4 floors × 4 bays, about 14 × 14 m; building UVs repeat from that, so windows are the same size everywhere. Ground floors on the slice-joint and bodega corners use the storefront tile; signs ("$1 SLICE", "DELI GROCERY", "PIZZA") are code text on code awnings.
- **Night:** a fixed light set (see Tech plan), dimmed and tinted dusk-violet, with the moon disc and code stars. City windows glow from **emissive window masks** made from each facade tile with Pillow; a per-window hash lights about 40% of them. Bodega and slice-joint windows are always lit. The far skyline has a **night version**, and the ESB's crown is code-lit. Gus's headlamp is one SpotLight (no shadows), on Low too.
- **Camera** (scaled to a 0.32 m bird):
  - Ground: 1.2 m behind, 0.45 m up, looking at a point 0.15 m above Gus's head. FOV 60°.
  - Flight: 2.4 m behind, 0.6 m up. FOV widens 60° → 70° with speed. Auto-follow eases behind travel after 1.5 s.
  - Driving: see Controls.
  - Perched: eases out to 4 m for a look-out view. Summit Perch pans fly out wider and push the fog back.
  - The camera pushes in against trunks, walls and rooftop rims (canopies are see-through near the camera).
  - **Acceptance:** at 1280×720 (and at 844×390), Gus's on-screen bounding box is at least 12% of the screen height on the ground and at least 6% of the screen width in flight. `state()` reports it.
- **Sky:** a code gradient sphere per phase with a sun/moon disc and code stars at Night. One nanogen **21:9 cloud band** is mirrored round a cylinder; Night reuses it darkened.
- **Far layer:** a cheap backdrop in its own pass: low-poly park silhouette, water shapes, canopy blobs, a skyline ring (code boxes with the nanogen 4:1 skyline band, day and night versions), and the ESB. The finale's ESB is a separate code-built hero model in its own scene.
- **Scale:** Gus is **0.32 m** tall and 0.35 m long. Humans are 1.75 m, squirrels 0.25 m, songbirds 0.15 m, crows 0.45 m, ducks 0.5 m, geese 0.8 m, the heron 1.1 m, cats 0.3 m at the shoulder, raccoons 0.6 m on all fours (0.8 m upright), Biscuit 0.9 m at the shoulder, horses 1.6 m at the shoulder, the owl and the hawk 0.55 m. A slice is 0.25 m long (comically big in Gus's beak). Benches, lampposts and trees are life-size. The Mecha-Pigeon is **3.5 m in the Workshop and 18 m after BIGGIFY**.
- **Mecha-Pigeon, assembled in code from the part models** (look: the `mecha-pigeon` mock): the `hotdog-cart` GLB as the body (2k texture, kept at 2048 px); code canvas sails on wooden spars as wings; code rusty iron pipes with hip pivots as legs, ending in **talons** made from bundled code spike strips (so it really stomps); the `traffic-cone` GLB as the beak, hubcap eyes, the `megaphone` GLB on the chest, the `battery` GLB glowing through a chest vent; a slate-painted code cowl head with a teal/magenta stripe; code bolts and straps. Code parts get palette-matched painted canvas-noise textures. Walk and climb are code poses on those pivots. DoD: a close-up in the shout shot looks finished.
- **Built in code:**
  - terrain (a height map with the park's hills, rocks and lake basins), with paths and drives **painted into the terrain material** (a path mask);
  - water (a stylized shader);
  - far trees (low-poly trunks with clustered blobs in autumn colours; about 2,500 trees in all; the nearest ones draw from per-instance pools as the ★ `tree-elm`, `tree-maple` and `tree-oak` models and their 600-tri LODs, tinted per instance, and the rest as per-cell canopy blobs for autumn variety);
  - buildings (boxes with facade textures, plus hand-built shapes for the spiral museum, the twin towers, the gabled apartment house, the obelisk, the ESB, Wollman Rink, the Boathouse, the Blockhouse, the Delacorte; the ESB's facade uses its own generated art-deco texture for the climb), rooftop water towers, fire escapes, awnings, steam stacks, scaffolding and the sidewalk shed;
  - **Gapstow Bridge** and the transverse bridges; Bow Bridge's collision, deck and perch rail (its visual is a ★ model);
  - Wollman Rink (ice, boards, garage, yard and shed; the shed's door has a code fold animation), the strip pallets and heap, the training cones' stack (instanced `traffic-cone`);
  - signs, spike strips and nets, the Mecha's code frame (spars, pipes, cowl head, bolts), the pipes, gear attachments, the Nests, the Workshop cave, scaffold and BIGGIFY lever, Strix's spectacles, Puddles' cap, Vesper's pendant, the shopping cart (a wire basket, which reads better in code), Biscuit's ball, the tennis-ball sack, the news chopper, Vinnie's broom, the halal and pretzel carts' code signs (on retinted `hotdog-cart` models), the delivery bike, the water trough, role-human accessories, race rings, the golden pretzel, and small quest items: shiny, cufflink, earring, wrench, lost key, gate key, sticker, peas, nuts, hot-dog ends (anchovies on a slice are code strips).
  - **Generated instead of code** ("always prefer a solid graphic"): the **pizza slice** and **pizza box** (in Gus's beak right in front of the camera), the **RC boat** (driven), the **traffic cone**, **megaphone** and **battery** (Mecha parts seen in the shout close-up), both **statues**, **Bow Bridge**, the **Carousel**, and the **near trees** (three Meshy species; code blobs only beyond full-tree range).

### Who wears what (named characters: model, coat and code accessories, read off the cards)

Accessories are small code meshes (palette-matched canvas-noise textures) parented to a head, neck or body point per species, defined once in `src/data/looks.js`. Crowd members of a gang wear a simpler version (a hat or bandana only).

| Character | Model | Coat / morph | Code accessories (from the card) |
|---|---|---|---|
| Duchess Pidgeley | pigeon-plain | 1 blue bar | small black top hat, pearl choker |
| Monty | pigeon-plain | 6 ash-red | top hat, monocle, pearl choker |
| Lady Bunting | pigeon-plain | 10 silver-dun | pink feather fascinator, pearl choker, white opera-glove cuffs on the wing tips |
| Tuppence | pigeon-plain | 8 pied | an oversized tilted top hat |
| Dove | pigeon-plain | 9 pure white | none (she's always drawn in the flock) |
| Maestro Vibrato | pigeon-plain | 1, brighter blue tint | red beret, black waistcoat, bow tie, baton |
| Soprano Bella | pigeon-plain | 2 blue checker | magenta beret with a feather plume, crimson waistcoat, lace jabot |
| Basso Lou | pigeon-plain | 4 mostly black | green beret, cream waistcoat, bow tie |
| Encore | pigeon-plain | 7 red checker | mustard beret, cream waistcoat, bow tie |
| Coach Wingate | pigeon-plain | 1 blue bar | teal sweatband, whistle on a cord |
| Sprint | pigeon-plain | 1 blue bar | orange sweatband |
| Lapcount | pigeon-plain | 11 grizzle | purple sweatband, stopwatch on a cord, notepad |
| Wheezy | pigeon-plain | 12 brown pied | teal sweatband |
| Big Sal | pigeon-plain | 1 blue bar (dark sheen) | red bandana at the neck |
| Knuckles | pigeon-plain | 3 dark checker | black bandana on the head |
| Tiny | pigeon-plain at 1.35× | 5 mostly white | red bandana at the neck |
| Sister Feathers | pigeon-plain | 13 mealy | blue bandana on the head, round glasses |
| Hazel | squirrel | grey | (acorn on the model) |
| Nutmeg | squirrel | cinnamon | round spectacles, pencil behind the ear |
| Twitch | squirrel | black | none |
| Old Pecan | squirrel | grizzled, nearly white | walking stick |
| Commodore Puddles | duck | drake | captain's cap |
| Mrs. Puddles | duck-hen | hen | pearl necklace |
| Bubbles | duck-bufflehead | bufflehead | swim goggles on the head |
| Ensign Drake | duck-wood | wood duck | white sailor cap |
| Vesper | crow | black | pendant |
| Ledger | crow | black | spectacles, plaid scarf, ledger book under the wing (runs the Scarf Stash) |
| Glint | crow | black | necklace of blue bottle caps |
| Cawdry | crow | black | spyglass, pocket-watch pendant |
| the Eldest | turtle | mossy olive | none |
| Moss | turtle | thick moss tint | moss tuft and a tiny mushroom on the shell |
| Shelly | turtle | bright green | a daisy on the shell |
| Slowpoke | turtle | red ear stripe (a slider) | none |
| Rigby | raccoon-stand / -scurry | grey-brown | (tool belt on the model) |
| Socket | raccoon | darker | welding goggles on the head, leather apron, pipe wrench |
| Ringo | raccoon | grey-brown | aviator cap and goggles, long red scarf |
| Mama Mask | raccoon | grey-brown | red-check headscarf, gingham apron, wooden spoon |
| Subway Sue | rat-stand (code-tilted `rat` until it exists) | brown | token on a cord |
| Express | rat-stand | brown | conductor's cap, waistcoat, pocket watch |
| Pinstripe | rat-stand | grey-brown | red tie, waistcoat |
| Crumbsy | rat-stand | brown | a pizza crust in hand |
| Biscuit | dog | golden | red collar and tag |
| Pretzel | dog-dachshund | tan | blue collar |
| Fifi | dog-poodle | cream | pink bow, pink collar |
| Moose | dog-mastiff (`dog` at 1.2×, brindle, lying, until it exists) | brindle | red collar |
| Professor Strix | owl | barred brown | spectacles once returned |
| Hoot | owlet | pale barred | none |
| Nanny | owlet | pale barred | mortarboard |
| Rhoda | hawk-perch / -fly | red-tail | none |
| Rex | hawk | brighter red-tail | none (flexes) |
| Pip | hawk at 0.75× | fluffy, paler | none |
| Queenie | cat-sit / cat | grey tabby | red collar with a bell |
| Pickles | cat-sit | orange tabby | sleeps on a code bread loaf |
| Tux | cat-sit / cat | tuxedo | gold bow tie |
| Mrs. Whiskerton | cat-sit | long-haired grey tabby | crocheted shawl, cushion |
| Clementine | horse | dapple grey | red plume, bridle |
| Duke | horse | bay | saddle, navy saddle blanket (and his officer) |
| Dapple | horse | dappled grey | yellow plume |
| Big Ben | horse at 1.15× | chestnut, pale feathered hooves | blue plume |
| Mimi | songbird | starling, iridescent speckles | none |
| Jay | songbird | blue jay | crest |
| Ruby | songbird | cardinal | crest, a rolled scroll |
| Chip | songbird | house sparrow | a crumb |
| Gertrude | goose | Canada goose | none (she's the loud one) |
| Lieutenant Gander | goose | Canada goose | black peaked cap |
| Stilts | heron | great blue | none |
| Nightcap | night-heron (tinted `heron` until it exists) | black-crowned | long white head plume |
| Walter | human-walter | — | gold cap braid |
| Del Prickett | human-prickett | — | spray tank, wand, clipboard |
| Vinnie | human-vendor | — | broom (in the fight) |
| Dolores | human-park | — | shawl, felt hat |
| the bride | human-wedding | — | veil, bouquet |

### Key poses (animating.md step 1)

| Who | Key poses | How |
|---|---|---|
| Gus walk | Head forward and locked; body passes under it; head snaps forward each step; feet alternate | Neck-masked vertex shader on `gus-stand` (head region turned about the neck pivot); body bob |
| Gus peck | Head dips 40° and back in 0.25 s | Same neck pivot. Fallback: a `gus-peck` pose model swap |
| Gus take-off | Crouch (squash), spring up, swap to `gus-fly` at the top of the squash | Pose swap |
| Pigeon wingbeat | Strong downstroke, slower upstroke, tips trail | Wings turned about the shoulders in a vertex shader on the `-fly` models |
| Crow, owl, hawk | Standing/perched folded; flying spread | Pose swap stand ↔ fly models at take-off and landing; flap shader on the fly model |
| Squirrel | Sit; crouch; leap arc stretched; tail sway | Squash and stretch, arc, tail bend about its root |
| Duck | Float bob; tip-up dive; pop-up arrival | Bob; rotate the whole body 100° about its middle; rise from under the surface with a splash |
| Raccoon | Upright idle and "fixing" hunch; scurry on all fours | Two pose models (`raccoon-stand`, `raccoon-scurry`), swapped on a squash |
| Biscuit | Bound, tail wag, crouch-wiggle before a charge | Squash and stretch along the body, tail turned about its root |
| Rat, turtle | Scurry; slow head bob | Body bob and slide; head region bob |
| Cat | Sit (loaf); slink; the Knock: stare, then a slow front-paw push | Pose swap `cat-sit` ↔ `cat`; slink is a low body bob; the paw push turns the front-leg region (masked by position) about the shoulder; tail sway about its root |
| Horse | Stand with head nods and tail swish; walk; Kick (a buck); Pull | Leg regions (four, masked by position) swing about hip and shoulder pivots in the shader with a diagonal gait; Kick tips the body forward and swings the hind legs back; head nod about the neck. Fallback if the legs read badly: horses only stand, nod and slide-walk slowly (their legs are partly hidden by the carriage and the kerb) |
| Songbird | Hop, peck, flutter | Hop arcs, head dip; code wing quads in flight; instanced |
| Goose | Waddle; swim bob; Bully (neck out low, wings flared) | Waddle roll. The Bully **turns** the neck, never stretches it (animating.md §2): the neck region rotates forward and down about a base pivot, the head region rotates back up about a head pivot, so the head ends low and level; two code wing quads flare out. Once `goose-bully` exists, a pose swap on the hiss replaces this |
| Heron | Stand still; slow step; neck strike | Body slide; the strike turns the neck about the same two pivots (base, head), no stretch. Night herons have short necks: no neck motion, just a body lunge |
| Dogs (poodle, dachshund, mastiff), owlets, rat-stand | As their species | Same code as Biscuit, the owl and the rat; Moose only lies and lifts his head |
| Zamboni | Drive, drift, hopper tip, auger spin, spray | Whole-body yaw lag for the drift; hopper lid and rear brush turned about code pivots; spray and snow are particles; the launch is a fixed parabola with a 0.6 s slow-motion window |
| Wedding party | Pose, scatter, bouquet toss | `human-park` idle/cheer for posing, run for the scatter (flee tweens fanned out from the geese); the bouquet is a code arc; Dove's spiral rise and catch are a spline tween |

**Order of work:** make Gus first. In a throwaway test scene, prove the head-bob, peck, stand→fly swap and wingbeat from behind and the side, and pass the two-model match check, before buying any other model. Prove the horse's leg shader on the first horse model before placing the carriage line. Prove one pigeon morph atlas edit on `pigeon-plain` (seams, four sides) before making the other 23; if it seams, prove the free painted-by-region method on the same morph before anything else. Prove one portrait crop (Fifi) in the dialogue panel.

## Audio direction

- **Music:** jazzy, sunny, a little sneaky. Instrumental, looping with crossfades. Day loops play, then leave a 30–60 s stretch of ambience only before coming back.
  1. **Title, "Pigeon Strut"** (90 s): swing, clarinet, upright bass, finger snaps. Also the credits (with the crowd cheer layered on).
  2. **Park by day A** (South and Middle, 90 s): light jazz trio with pizzicato strings, birdsong-friendly. Plus a **second take** (90 s, same key and tempo, clarinet lead), so the most-heard music alternates instead of repeating.
  3. **Park by day B** (Ramble and North, 90 s): a woodier variation, brushes and vibes. Plus a **second take** (90 s, flute lead).
  4. **Park at dusk** (90 s): golden-hour swing, mellow tenor sax, a little wistful.
  4b. **Park at night** (90 s): cool noir jazz, muted trumpet, brushed drums, sparse.
  5. **City ring** (90 s): Latin-funk-lite, horns, bongos, a little street-corner swagger.
  6. **Scheme/Workshop** (90 s): heist-movie vibraphone, bongos, walking bass.
  7. **Encounter** (fights, chases, 90 s): fast swing, stabbing brass.
  8. **Stealth** (Strix, 60 s): sparse pizzicato and soft vibes.
  9. **Race / drive** (60 s): driving surf-swing.
  10. **The Stomp and the Climb** (150 s, not looped): a big brassy march rising to a choir-like synth swell at the spire.
  11. **Busker riff** (15 s): a bright acoustic-guitar riff for the Strawberry Fields postcard.
  12. **Rink waltz** (60 s): a cheerful old-time rink-organ waltz. It plays from the rink's PA while you drive the Zamboni and under the Rink Job launch.
  13. **Wedding quartet** (20 s): an original, over-sweet string-quartet wedding tune for the Bow Bridge shoots. It cuts off with a needle-scratch when the geese charge.
  14. **Sax busker riff** (15 s): the Bethesda sax busker's smoky, show-off original riff. The Choir scheme hinges on him stealing the audience, and he plays it again when he joins the Choir's song.
- **Ambience loops** (audiogen `--loop`, mono): park day (birdsong, distant city, kids), park night (crickets, distant sirens, wind), water lapping, **city street** (cab horns, a distant siren, a doorman's taxi whistle, a subway rumble under a grate, a cart's sizzle), fountain splash, the Loch waterfall, carousel organ (15 s), **Ramble woods** (warblers, a woodpecker drumming, birders murmuring), **Wollman Rink by day** (skate blades carving, laughter, a tinny PA), **Delacorte rehearsal** (actors declaiming from the stage, words indistinct: no real Shakespeare lines, a director's "From the top!").
- **Sound effects** (short, punchy; 110 generated):
  - Gus and flock: coo, coo-gather, flock swarm, flap, take-off, landing, whoosh (dive and boost, pitched).
  - Surfaces: footstep pat, leaves crunch, moss step, splash-hop.
  - Hands-on: peck, gulp, crumb scatter, pick up (also gear equip, pitched), drop thud, heavy drag scrape, item splash, sign plate pop, "permanent" stamp, pretzel chime, **slice pick-up (a cheesy squelch)**, **slice handover** (a happy chomp and "mmf"), **pizza box open** (cardboard creak and a puff of steam), **griddle sizzle**.
  - Species voices (also the **chatter-blip bases**, pitch-shifted in code; pigeons use the coo): crow caw, duck quack, squirrel chatter, raccoon chitter, rat squeak, turtle grumble, owl hoot, hawk screech, dog bark, dog happy bark, **cat meow**, **cat hiss**, **horse whinny**, **songbird chatter** (sparrows; pitched for others), **blue jay call**, **goose honk** (pitched down for the heron's croak).
  - Ally actions: dig, duck dive bloop, trade "ka-ching", grate whoosh, spark-plug pop, hubcap clang, gang coo murmur (loop), pigeon-choir coo chorus, **knock clatter** (also spike strips falling), **horse kick bang**, **goose hiss** (Bully), **net snip**.
  - Vehicles: rig sputter/start, engine loop, cart squeak, **RC-boat whine** (loop), **pedicab pedal and chain** (loop), **cab horn** (also what Mimi teaches Chip), **hoof clip-clop** ×2 takes (on pavement and on a path), **Zamboni hum** (a low electric drone, loop), **ice bump** (a padded thud against the boards), **hopper dump** (a snow "whumph"), **freeze crackle**, **launch crunch** (the cart pancaking), **shed door fold** (a steel crumple), **strip avalanche** (a long cascade of clattering metal), **cone strike** (bowling pins, plus a PA crowd "STRIKE!").
  - Encounters: owl spotted sting, owl danger riser, hawk dive whistle, Biscuit tackle, broom swish, ranger whistle, ranger "tut", **Prickett's spray hiss**.
  - World: camera shutter, crowd "ooh", **sea lion bark**, **subway rumble**, **wedding stampede** (shrieks dissolving into laughter).
  - **Variants** for the sounds heard thousands of times, so they never machine-gun: coo ×2, flap ×2, peck ×2, footstep pat ×2, gulp, landing, crow caw, squirrel chatter (12 more takes).
  - Progress: feather lost, Ruffled, crew joined jingle, part fanfare, part bolted on, scheme step chime, Summit Perch reveal, race start horn, race finish, paper rustle (map and board).
  - Finale: Mecha step boom, Mecha servo, chopper loop, crowd cheer, bread rain, brass stinger, crowd chant "feed the birds" (one sfx try; else layered voice takes).
  - **Synthesized in code (Web Audio, no cost):** UI move/select/back, dialogue typewriter tick, stamina-low warning, race ring "ding", nap chime, **phone ring**, **car alarm**, **the ice-cream truck's jingle** (an original 8-bar music-box melody written as notes), **bike bell**, **spike "boing"**, thread-meter tick. Mimic plays these same sounds with a little pitch wobble.
- **Voice (short barks via audiogen):**
  - **"FEED THE BIRDS!"**: a giant, booming, delighted pigeon voice (the Mecha shout), picked from `audiogen voices` (a free catalog browse), pitched down a little with a code reverb tail. The crowd chant is 3–4 takes layered if the sfx try fails.
  - Ranger "Hey! Shoo!", Vinnie "Get outta here, ya flying rat!", Prickett "This park is IMPOSSIBLE!", the photographer's "…THAT'S the shot."
  - **Boss barks:** each of the 17 bosses gets **3 short voiced barks**: a greeting (the first line of any conversation), an arrival line on a Call, and a joining line. Each has a distinct voice picked from `audiogen voices` (the Duchess posh, Hazel scatterbrained, Rigby a gravelly mechanic, Gertrude LOUD, Clementine a warm old-timer, Strix a dry professor…), pitched in code to suit the animal. Plus 2 for Dove ("I was BORN for this.", "Places, darling.").
  - Everything else is text, with chatter blips.

## Asset list

Sizes are in metres. "Tris" is the `--polycount` set at generation (same price). "Code anim" means animated in code following meshgen's animating.md. Credits were checked with `meshgen --dry-run` on 2026-11-14: a model is 30 (also with `--texture 2k`), a rigged character is 35 plus 3 for each clip beyond walk and run (so 44 with 3 extra clips, 50 with 5), a remesh is 5. **Nothing is a draft:** at a 0.32 m bird's eye-height every bench, lamppost and cat is a close-up. "Tex" is the size kept after `optimize-assets.mjs`. Every meshgen call is run with `--max-credits` set to its dry-run figure.

**Concept source** says where each model's picture comes from. "Direct" means an accepted mock or card is used as-is; "edit of X" means an imagegen2 high edit of that accepted picture (the card stays untouched; the edit is a new file), with the `gus-stand` anchor as the second reference; "new" means a new imagegen2 picture with the anchor as reference; "text" means meshgen's text route (simple props).

### 3D models (meshgen): Tier A 58 models + 13 LODs (now), Tier B 7 models (priority order)

**Tier A: the must-haves, bought from the credits on hand.**

| ID | What it is | Concept source | Tool | Size, tris, tex | Animation | Credits |
|---|---|---|---|---|---|---|
| gus-stand | Gus, standing, wings folded | direct: gus-stand + gus-stand-back mocks | model `--texture 2k --max-texture 2048` | 0.32 m, 6k, **2048** | code: waddle, head-bob, peck, preen | 30 |
| gus-fly | Gus, wings spread | direct: gus-fly + gus-fly-back mocks | model `--texture 2k --max-texture 2048` | 0.35 m long, 6k, **2048** | code: wingbeat shader, bank | 30 |
| pigeon-plain | Plain pigeon, neutral face, straight tail (blue bar; the morph layers are painted onto its UVs) | direct: pigeon-plain mock | model `--texture 2k` | 0.32 m, 3k, 1024 ×13 layers | code (as Gus); morph layer + code accessories | 30 |
| pigeon-plain-fly | Plain pigeon in flight (flock) | edit of pigeon-plain mock into the gus-fly pose (gus-fly as pose ref) | model | 0.35 m, 1.5k, 1024 ×13 layers | wingbeat shader, instanced | 30 |
| crow | Crow, standing | edit of vesper mock: pendant removed | model | 0.45 m, 3k, 1024 | hop, pose swap | 30 |
| crow-fly | Crow, flying | edit of vesper mock: wings spread, front 3/4 from above | model | 0.45 m, 3k, 1024 | wingbeat | 30 |
| squirrel | Squirrel with acorn | direct: hazel mock | model | 0.25 m, 3k, 1024 | hop arc, tail sway | 30 |
| (squirrel colours) | Grey, cinnamon, black, white: texture variants on the one model, made like the pigeon morphs (nanogen atlas edits using the nutmeg, twitch and pecan cards as colour references; free region-painting fallback) | edits of the squirrel atlas | texture | — | — | 0 (nanogen, see Pictures) |
| duck | Mallard drake | edit of puddles mock: cap removed | model | 0.5 m, 3k, 1024 | bob, dive, pop-up | 30 |
| duck-hen | Mallard hen | edit of mrspuddles card: pearls removed | model | 0.5 m, 3k, 1024 | as duck | 30 |
| duck-wood | Wood duck drake | edit of ensign card: cap removed | model | 0.45 m, 3k, 1024 | as duck | 30 |
| duck-shoveler | Northern shoveler drake (spoon bill) | new concept: edit of the puddles mock as a shoveler | model | 0.5 m, 3k, 1024 | as duck; dabbling sweep of the bill | 30 |
| duck-bufflehead | Bufflehead (tiny diver) | edit of bubbles card: goggles removed | model | 0.35 m, 3k, 1024 | as duck; quick bobbing dives | 30 |
| duck-white | White farm duck (domestic) | new concept: edit of the puddles mock, all white, orange bill | model | 0.55 m, 3k, 1024 | as duck; waddles ashore | 30 |
| duck-stranger | The dazzling mystery duck (a mandarin-style drake) | new concept: edit of the ensign card's art style, no cap | model | 0.45 m, 3k, 1024 | as duck; birders crowd the bank when he appears | 30 |
| raccoon-stand | Raccoon upright, tool belt | direct: rigby mock | model | 0.8 m, 4k, 1024 | lean, bob, fixing hunch | 30 |
| raccoon-scurry | Raccoon on all fours, tool belt | edit of rigby mock: on all fours, side view | model | 0.6 m, 4k, 1024 | body bob; swap | 30 |
| rat | Rat on all fours (the crowd) | edit of sue card: on all fours, token removed, side view | model | 0.2 m, 2k, 1024 | scurry; code sit-up tilt | 30 |
| turtle | Turtle | direct: eldest card | model | 0.3 m, 2k, 1024 | slow bob | 30 |
| owl | Strix perched | edit of strix card: log removed, both feet on flat ground | model | 0.55 m, 3k, 1024 | pose swap | 30 |
| owl-fly | Strix flying | edit of strix card: wings spread, seen from below at 3/4 | model | 0.55 m, 3k, 1024 | wingbeat | 30 |
| hawk-perch | Rhoda perched | direct: rhoda card | model | 0.55 m, 3k, 1024 | pose swap, dive | 30 |
| hawk-fly | Rhoda flying | edit of rhoda card: wings spread, seen from below at 3/4 | model | 0.55 m, 3k, 1024 | wingbeat | 30 |
| dog | Biscuit, fluffy big dog (tinted for the pack and the coyote) | direct: biscuit mock | model | 0.9 m, 4k, 1024 | bound, tail wag | 30 |
| cat | Cat standing, tail up (tinted coats) | edit of queenie card: standing on four feet, tail up, collar removed | model | 0.3 m, 2.5k, 1024 | slink, paw push, tail | 30 |
| cat-sit | Cat sitting (loaf) | edit of queenie card: collar removed | model | 0.25 m, 2.5k, 1024 | swap with cat; tail | 30 |
| horse | Carriage horse, bridle, no blinkers (tinted coats) | edit of clementine card: plume removed | model | 1.6 m shoulder, 5k, 1024 | leg shader, nod, kick | 30 |
| carriage | Open hansom-style park carriage | new | model | 3 m, 4k, 1024 | wheels | 30 |
| songbird | Small songbird, plain light-grey plumage (region tints) | edit of chip card: plain light-grey plumage, crumb removed | model | 0.15 m, 1k, 512 | hop, peck, code wings; instanced | 30 |
| goose | Canada goose | edit of gander card: cap removed (not Gertrude: her beak is open) | model | 0.8 m, 3k, 1024 | waddle, swim, neck-pivot hiss | 30 |
| heron | Great blue heron | edit of stilts card: standing on both legs | model | 1.1 m, 3k, 1024 | still, step, neck-pivot strike | 30 |
| van | Prickett's white step van | new | model | 5 m, 4k, 1024 | wheels, bounce | 30 |
| ice-cream-truck | Pastel ice-cream truck, cone on the roof, serving hatch, chime button | new | model | 5 m, 5k, 1024 | wheels, bounce | 30 |
| **zamboni** | Wollman Rink's ice resurfacer: boxy body, snow hopper, rear conditioner and brush, high seat | new (+ a side view) | model `--texture 2k` | 3.6 m long, 6k, 1024 | drift, hopper lid and auger on code pivots, spray particles, launch arc | 30 |
| human-ranger | Park ranger, A-pose | direct: ranger mock | **character**, `--polycount 9000`, `--actions idle,walk,run,pickup,wave,cheer,scold=311` | 1.75 m, 9k, 1024 | as listed | 50 |
| human-park | Parkgoer (tinted variants and role props, incl. groom, planner, photographer, skaters, Dolores) | new (A-pose, legs apart, empty hands) | character, `--actions idle,walk,run,cheer,sit,wave,throw=389` (fallback `throw=421`, then `pickup`) | 1.75 m, 9k, 1024 | as listed | 50 |
| human-vendor | Vinnie (also countermen, foreman, guard…) | direct: vinnie card (already an A-pose with empty hands) | character, `--actions idle,walk,run,attack,taunt,scold=311,stomp=26` | 1.75 m, 9k, 1024 | as listed | 50 |
| **human-prickett** | Del Prickett: coveralls, cap | edit of prickett card: A-pose, empty hands, legs apart, no tank (tank, wand and clipboard are code props) | character, `--actions idle,walk,run,pickup,taunt,scold=311,stomp=26` | 1.75 m, 9k, 1024 | as listed | 50 |
| **human-walter** | Walter the doorman: peaked cap, moustache, long green coat, gloves | edit of walter card: A-pose, legs apart, coat cut above the knee | character, `--actions idle,walk,wave,scold=311` | 1.75 m, 9k, 1024 | as listed | 44 |
| **human-wedding** | The bride: white knee-length dress (veil and bouquet are code props) | new (A-pose, legs visible) | character, `--actions idle,walk,run,cheer,throw=389` | 1.7 m, 9k, 1024 | as listed | 44 |
| bethesda-fountain | Fountain with angel statue (original sculpture) | direct: bethesda-fountain mock | model `--texture 2k --max-texture 2048` | 8 m wide, 18k, 2048 | — | 30 |
| belvedere-castle | Small stone castle on a rock | direct: belvedere-castle mock | model `--texture 2k --max-texture 2048` | 20 m tall, 18k, 2048 | — | 30 |
| **bow-bridge** | Cast-iron arch footbridge, ornate railings (visual; deck and rail collision in code) | new (3/4 view) | model `--texture 2k --max-texture 2048` | 27 m, 15k, 2048 | — | 30 (fallback: code bridge + nanogen ironwork) |
| **carousel** | Park carousel with painted horses under a round roof | new | model `--texture 2k` | 14 m wide, 12k, 1024 | code spin; horses bob on code pivots | 30 |
| **statue-sled-dog** | Bronze sled-dog statue on a rock | new | model | 2 m, 5k, 1024 | — | 30 |
| **statue-mushroom** | Bronze girl on a giant mushroom with small creatures (original) | new | model | 3 m, 8k, 1024 | — | 30 |
| hotdog-cart | Street hot dog cart with umbrella (retinted for the halal and pretzel carts; the Mecha body) | new | model `--texture 2k --max-texture 2048` | 2 m, 5k, 2048 | wheels, bounce | 30 |
| ranger-cart | Park utility cart (pancakes in the Rink Job: a code squash) | new | model | 2.8 m, 4k, 1024 | wheels, squash | 30 |
| pedicab | Bicycle rickshaw | new | model | 2.5 m, 4k, 1024 | pedals, wheels | 30 |
| **rc-boat** | Toy RC tugboat (driven) | new | model | 0.6 m, 2k, 1024 | bob, wake | 30 |
| bench | Classic park bench | text | model | 1.8 m, 1.5k, 1024 | instanced | 30 |
| lamppost | Classic park lamppost | text | model | 4 m, 1.5k, 1024 | instanced | 30 |
| trash-can | Wire mesh park trash basket | text | model | 0.8 m, 1k, 512 | instanced | 30 |
| rowboat | Rowboat | text | model | 3 m, 2k, 512 | bob | 30 |
| sailboat | Model sailboat | text | model | 0.9 m, 2k, 512 | bob, tilt | 30 |
| taxi | Yellow city taxi | text | model | 4.5 m, 4k, 1024 | wheels (instanced) | 30 |
| **tree-elm, tree-maple, tree-oak** | Autumn park trees, chunky stylized canopies | new ×3 | model ×3 | 6–9 m, 2.5k, 1024 | sway shader; per-instance autumn tint | 90 (fallback: code trees) |
| **pizza-slice** | A big floppy pepperoni slice (anchovy strips added in code) | new | model | 0.25 m, 1.5k, 1024 | droop shader by temperature | 30 |
| **pizza-box** | Closed white pizza box (lid hinge in code) | new | model | 0.4 m, 600, 512 | lid pivot | 30 |
| **traffic-cone** | Orange traffic cone (the Beak; instanced at the rink) | new | model | 0.7 m, 800, 512 | — | 30 |
| **megaphone** | Battered megaphone (the Voice) | new | model | 0.5 m, 1.5k, 1024 | — | 30 |
| **battery** | Chunky marine battery with cables (the Power core) | new | model | 0.5 m, 1.5k, 1024 | emissive glow in code | 30 |
| crowd LODs | ~400-tri `remesh` of pigeon-plain, crow, squirrel, duck, duck-hen, raccoon-scurry, rat, turtle, dog, goose | (from the models) | `remesh` ×10 | 400 tris, 256 | as full model | 50 |
| tree LODs | ~600-tri `remesh` of the three trees (mid-range ring) | (from the models) | `remesh` ×3 | 600 tris, 256 | sway shader | 15 |

**Tier B: extras that make the in-game characters match their cards, in priority order.** Until one exists, its character uses the stand-in named in "Who wears what".

| # | ID | What it is | Concept source | Size, tris, tex | Credits | When |
|---|---|---|---|---|---|---|
| 1 | dog-poodle | Fifi; also poodles in the pack and the walker's dogs | edit of fifi card: bow and collar removed | 0.5 m, 3k, 1024 | 30 | now, if ≥ 170 credits are left after Tier A |
| 2 | dog-dachshund | Pretzel; also dachshunds in the pack | direct: pretzel card | 0.3 m, 3k, 1024 | 30 | now, same rule |
| 3 | owlet | Hoot and Nanny (round baby owls) | edit of hoot card: log removed | 0.3 m, 2k, 1024 | 30 | now, same rule |
| 4 | night-heron | Nightcap and the ~6 night herons | direct: nightcap card | 0.6 m, 3k, 1024 | 30 | now, same rule |
| 5 | rat-stand | The named rats, sitting up as on their cards | edit of sue card: token removed | 0.2 m, 2k, 1024 | 30 | now |
| 6 | dog-mastiff | Moose, lying down | direct: moose card | 0.9 m long, 3k, 1024 | 30 | now |
| 7 | goose-bully | Goose pose: neck out low, wings flared (swapped on the hiss) | edit of the goose concept | 0.8 m, 3k, 1024 | 30 | now |
| — | pigeon morph models | Only for morphs that fail both the atlas edit and the free region painting | edits of pigeon-plain in each failing morph | as pigeon-plain | up to 720 | last resort; needs a small top-up beyond the spare |

Not from Meshy (built in code): everything in "Built in code" above.

### Meshy credit plan

`meshgen balance` (2026-11-14, after the person's top-up): **3,402 credits = 1,402 monthly + 2,000 permanent** (the monthly credits reset on 2026-12-01). Everything is bought now; nothing waits for the reset.

| | Credits |
|---|---|
| Tier A base: 52 models × 30, 4 characters × 50, 2 characters × 44, 13 remeshes × 5 | 1,913 |
| Retry allowance for Tier A (Gus twice, the `gus-peck` fallback pose, horse, Zamboni, Bow Bridge, one character redo, 3 other redos) | 320 |
| Tier B extras 1–7 (poodle, dachshund, owlet, night heron, rat-stand, mastiff, goose-bully) | 210 |
| Duck species (wood duck, shoveler, bufflehead, white farm duck, the mystery stranger) + their 5 LODs (5 × 30 + 5 × 5) and ~60 retries | 235 |
| Retries for Tier B | 60 |
| **Planned over the build** | **2,738** (≈ $54.76) |
| **Spare** | **~660** |
| Last resort, only if both free morph methods fail (the person may be asked; it fits in the spare) | up to 720 |

So: the 3,402 credits on hand cover every must-have model, every extra, a full retry allowance, and still leave about 660 spare (the five duck species were added after the top-up, at the person's request for more squirrel and duck variety). Buy the monthly-credit share before 2026-12-01 (unused monthly credits most likely don't roll over; the 2,000 permanent ones do).

### Pictures

| ID | What it is | Tool | Size and format | Transparent | Priority |
|---|---|---|---|---|---|
| mock set (done) | 15 accepted pictures in `design/mockups/` | imagegen2 high (made) | 1024², key art 1536×1024 | plain bg (key art no) | done |
| **character cards (done)** | 65 accepted cards in `design/mockups/cards/`: the portraits and the colour and shape references. Never regenerated or replaced. | imagegen2 high (made) | 1024² | plain bg | done |
| card-dolores | The Pigeon Lady's card (the one named character without one): an edit in the card style, shawl and felt hat, A-pose-friendly so `human-park`'s look can follow it | imagegen2 high, anchor + a card as style refs | 1024², PNG | plain bg | must |
| concept edits (from cards and mocks) | 18 for Tier A (pigeon-plain-fly, crow, crow-fly, duck, duck-hen, raccoon-scurry, rat, owl, owl-fly, hawk-fly, cat, cat-sit, horse, songbird, goose, heron, human-prickett, human-walter) + 4 for Tier B (dog-poodle, owlet, rat-stand, goose-bully); each as named in the "Concept source" column | imagegen2 high edit, the card first, the anchor second | 1024², PNG | plain bg | must |
| concept-* (new) | carriage, van, ice-cream-truck, zamboni, human-park, human-wedding, bow-bridge, carousel, statue-sled-dog, statue-mushroom, hotdog-cart, ranger-cart, pedicab, rc-boat, tree ×3, pizza-slice, pizza-box, traffic-cone, megaphone, battery (22), plus ~6 extra views (zamboni side, bow-bridge 3/4, pigeon-plain-fly and crow-fly backs, horse side, carousel 3/4) | imagegen2 high, anchor ref | 1024², PNG | plain bg | must |
| portrait crops | 73 in-game portraits: 512² head-and-shoulders crops of the 72 accepted cards and mocks plus Dolores's card, background kept, framed in code | **Pillow, free** (crop boxes in `tools/portrait-crops.json`) | 512², WebP | no (framed) | must |
| title-art | The accepted key art, cover-cropped to 16:9 | (reuse) | JPG | no | must |
| tex-grass, -path, -pavers, -schist, -leaves, -ice | Seamless ground textures (always in close-up at bird height) | **nanogen pro 2K** 1:1 | 2048², JPG (halved on Low) | no | must |
| tex-facade-brick, -limestone, -glass, -deco, -storefront | Seamless facade tiles (storefront: ground-floor shopfronts, awnings, no text) | nanogen flash 2K 1:1 | 2048², JPG | no | must |
| tex-esb-deco | The ESB's art-deco facade for the climb close-up | nanogen pro 2K | 2048², JPG | no | must |
| win-mask-* | Emissive window masks | Pillow, free | 2048², PNG | — | must |
| tex-iron-rail, tex-stone-arch | Ironwork; stone arches | nanogen flash 2K 1:1 | 2048², JPG | no | must |
| **morph atlases** | 12 morphs × 2 pigeon models = 24 nanogen edits of each model's own Meshy UV texture, with the morph's card as colour reference (fallback: free region painting from a baked position map; last resort: morph models) | nanogen pro 2K edit | 1024² each (512² on Medium and Low), PNG into the texture array | no | must |
| sky-clouds | Cloud band | nanogen pro 2K 21:9 | 2K JPG | no | must |
| far-skyline / -night | Manhattan skyline band, day and night | nanogen pro 2K 4:1; night is an edit | 2K PNG | yes | must |
| **sting** | The post-credits painted still: pigeons in Paris, Tokyo and Cairo looking up and cooing back | **nanogen pro 2K 21:9** (style line + key art reference) | JPG | no | must |
| gear, part and item icons | Sunglasses, pen, headlamp; 8 parts; ~16 quest items incl. slice and box | code renders of the code props and GLBs (offscreen, game lights, 256² transparent PNG) | | yes | must |
| thread and HUD icons | 5 thread icons, PlayStation shapes, feather, crumb, flock, bread, sun/moon, speaker | code (SVG) | | | must |
| board-polaroids | Portraits plus in-game screenshots taken in code (incl. the wedding's "shot of the century") | code | | | must |
| app-icon | Gus's head, square, safe margin | imagegen2 high → Pillow sizes | 512/192/180/32 | no | must |
| social-card | 1200×630 from title art + logo text | code (screenshot) | JPG | | must |
| font | "Fredoka" (display) and "Nunito" (body), both OFL | bundled | | | must |

### Audio (audiogen)

| ID | What it is | Length | Priority |
|---|---|---|---|
| music × 17 | The 14 pieces above, counting the two second takes and the dusk/night split | about 21 min total | must |
| amb × 10 | Ambience loops (`--loop`), incl. Wollman by day and the Delacorte rehearsal | 15–30 s | must |
| sfx × 110 | The effects above, incl. the 8 Zamboni and Rink Job sounds, the wedding stampede, the pizza box and handover, the cab horn, two hoof takes, the RC-boat and pedicab loops, and 12 variants | 0.3–3 s | must |
| voice × 58 | "FEED THE BIRDS!", ranger, Vinnie, Prickett, the photographer; 3 barks for each of the 17 bosses; 2 for Dove; plus the crowd-chant takes | 1–3 s | must |

## Tech plan

**Layout** (`game/`, the only folder the play-test serves):

```
index.html                importmap → vendor/three.module.js, vendor/addons/; feedback script first
src/main.js               boot, loading, renderer.compile() behind the loading screen, game loop (fixed 1/60 updates, frozen by __game.step), scene switching
src/input.js              keyboard / mouse / touch / gamepad → actions; "just pressed" edges; double-tap; last-used device; pointer-lock loss → pause
src/audio.js              Web Audio: music crossfades, sfx, ambience, synthesized sounds (incl. the jingle), mute (M), decode policy
src/save.js               localStorage cpp-save-v1, versioned, try/catch
src/world/layout.js       DATA: landmarks, signs, spike sites, nests, grates, clue spots, strays, pretzels, perches, postcards, items, slice joints/drops/griddle, feud spots, roadside flags, collision proxies, triggers, vehicle bodies; raceRings, rambleStealth; rink (ice, boards, launch lane, garage, yard, shed, cart spot), wedding (bridge spots, basket, flee fan)
src/world/terrain.js      height map; path/drive mask painted into the terrain material; transverse cuts
src/world/trees.js        trees: a nearest-N pool of full trees and a pool of 600-tri LOD trees (refilled every 8 updates), per-cell canopy blobs beyond; near shadow casters
src/world/water.js        stylized water material (all 8 water bodies)
src/world/city.js         city ring: merged building geometry per 100 m strip, hero buildings, storefronts, water towers, window emissive
src/world/farlayer.js     far pass: park silhouette, skyline ring (day/night), ESB
src/world/sky.js          gradient sphere, sun/moon, stars, cloud band, murmuration and V particles
src/world/lights.js       the fixed light set; per-phase intensities and colours
src/world/landmarks.js    places GLBs (visual only) and code landmarks
src/entities/gus.js       ground + flight states, stamina, perch (spike bounce), carry classes, glancing collisions, gear, camera rig
src/entities/flock.js     boids for ≤ 24 visible pigeons (one InstancedMesh, wingbeat shader, per-instance morph layer and neck hue; Dove always drawn)
src/entities/animals.js   per-species code animation, region tints and pose swaps
src/entities/crowds.js    the park's crowds: every animal simulated cheaply (seeded, round-robin), only the nearest drawn from per-species pools; pigeons carry a seeded morph layer
src/entities/allies.js    Call/Ask, arrival entrances, phase and roadside availability, feud refusals, wrong-place lines
src/entities/humans.js    SkeletonUtils clones, mixers, path AI, feeders, rangers, role accessories, lure/flee reactions (Mimic, Bully)
src/entities/vehicles.js  arcade controller and camera for drivable vehicles; Zamboni ice grip and drift, hopper, Dump, Spray, snow piles, freezing ramps, launch hop
src/entities/mecha.js     assembles the Mecha from part models; BIGGIFY scale; pivots for stomp and climb
src/data/schemes.js       the scheme table above, as data (with thread, anyOf and alts)
src/data/threads.js       the 5 threads: goal, meter source, reward
src/data/dialogue.js      all lines (incl. nudges)
src/data/looks.js         every named character's model, coat or morph layer, scale and code accessories ("Who wears what")
src/debug/autopilot.js    debug-only bot: turns goals into real inputs (see "Testing"); never loaded in the shipped game
src/systems/schemes.js    scheme graph runtime; thread meters derived from flags
src/systems/signs.js      sign table, feeder spawns, ranger revert timers (game time), cart sabotage, permanence, crumb payouts
src/systems/spikes.js     spike sites: install triggers, blocked perches, clearing
src/systems/items.js      carry classes, drops, slice age (hot/cold), griddle, slice drops and relay, boxes
src/systems/timeofday.js  4 phases, naps (what changes and what doesn't)
src/systems/dialogue.js   portraits; chatter blips; the 3-minute nudge timer
src/systems/collision.js  spatial hash of boxes, capsules and the height map; soft canopies; no physics engine
src/ui/*.js               HUD, ally wheel, menus, map, board (5 lanes), roster, feedback
src/setpieces/rinkjob.js, wedding.js   the two scripted showpieces (fixed arc + tweens, deterministic)
src/finale/biggify.js, stomp.js, climb.js, shout.js
src/debug.js              window.__game
data/fixtures/<scheme>.json        save state at the moment each scheme opens (not in the service-worker cache list)
data/fixtures/<scheme>.s<n>.json   save state at the start of each later step (crumbs, phase, flock, carried item and position pinned)
tools/check-schemes.mjs   reads schemes.js + layout.js: no cycles, all reachable, phase/ally/gear/roadside rules, alternatives, hot-slice routes, spike and feud rules, the rink run-up and the wedding's no-bypass rule, never 0 open before the finale
tools/optimize-assets.mjs texture resize + WebP (gltf-transform), no quantization
tools/render-icons.mjs    offscreen renders of code props and GLBs → 256² icon PNGs
tools/build-morphs.mjs    checks the 13 pigeon morph textures per pose share the base UV size and writes them as WebP; at load they're decoded and copied into one DataArrayTexture per pose (~0.5 MB download each; ~70 MB GPU per pose at 1024² on High, ~17 MB at 512² on Medium and Low)
tools/bake-posmap.mjs     rasterises a GLB's triangles into UV space and writes its position map (the free morph fallback)
tools/paint-morphs.py     Pillow: paints a morph onto the base atlas by body region from the position map
tools/portrait-crops.py   Pillow: the 73 portrait crops from the cards, boxes in portrait-crops.json
```

Solutions stay in `design/solutions/<scheme>.json` and `<scheme>.s<n>.json` (the harness reads them from disk and feeds the inputs).

- **Rendering budget (desktop targets; phones get the Low preset):**
  - **Presets.** Quality **High** and **Medium** are the design targets (desktop, mid-range GPU at 1080p, 60 fps on High). **Low** is the phone and weak-laptop preset. **Auto** picks Low on touch devices or when the first 3 seconds average below 40 fps, Medium on integrated GPUs, otherwise High, and drops one level if play stays below 50 fps for 5 s. Headless test runs force a preset (`?preset=low|medium|high`), so Auto never changes what a replay does.

    | | High (desktop) | Medium (desktop) | Low (phones, best-effort) |
    |---|---|---|---|
    | Triangles in view, incl. shadow pass | ≤ 1.2M | ≤ 800k | ≤ 300k |
    | Draw calls | ≤ 300 | ≤ 220 | ≤ 150 |
    | Fog / camera far | 400 m | 300 m | 150 m |
    | Full / mid / LOD trees (nearest, pooled), blobs beyond (perf pass) | 36 / 84 / 320, to the fog | 24 / 40 / 160, to the fog | 30 / – / 150, to the fog |
    | Crowd caps in view (full / LOD / songbirds / horses) | 90 / 250 / 80 / 10 | 70 / 200 / 60 / 8 | 30 / 80 / 20 / 4 |
    | Crowd LOD range | 120 m | 100 m | 50 m |
    | Shadows | 2048 map, 60 m box | **1024** map, 40 m box | 1024 map, 30 m box, Gus and near props only |
    | Textures | full (512–2048) | full | halved at load |
    | Pixel ratio | ≤ 2 | **1.0** | ≤ 1.25 (phones' small screens) |
    | Pigeon morph layers | 1024² | 512² | 512² |
    | Animated humans near Gus (a 35% LOD past 24 / 16 / 9 m) | 16 | 12 | 6 |

  - **Static instancing that culls.** three r186 frustum-culls an InstancedMesh as one object. So trees, benches, lampposts, signs, trash cans and strays are split into **~128 m grid cells, one InstancedMesh per cell per kind**, and cells outside the view or past the fog are hidden. Trees are the exception (a 128 m cell holds ~180 trees, 300+ in the Ramble, and drawing a whole cell at 2.5k tris blows the budget): the **nearest-N tree pools** pick trees per instance, not per cell. Every 8 updates the nearest trees inside the view fill the pools (one InstancedMesh per species each): on High the nearest 36 the full model, the next 84 a "mid" pool (the same model simplified to ~60% at load), the next 320 the LOD model (also ~60%, ~350 tris), and per-cell canopy-blob meshes (packed and counted, a coarser blob past ~170 m) draw the rest. `state()` reports full, mid, LOD and blob trees drawn. The perf pass (design/perf.md) measured and tuned these against the caps.
  - **Crowds (~700 animals) as nearest-N pools.** Every animal runs a tiny seeded state machine (idle, wander, scatter, greet), updated round-robin (a quarter per frame), so replays repeat and every preset simulates the same animals. Only the nearest are drawn, up to the preset's caps: each species has one full-detail and one LOD InstancedMesh whose instances are refilled each frame, with per-instance tint and phase and vertex-shader animation. Crowd draw calls ≤ 30 (only species in range). Named regulars are ordinary entities, not crowd instances: drawn in full detail within the preset's crowd range and as their species' LOD (with their tint) beyond it. Only full-detail crowd meshes cast shadows. Murmurations and distant geese V's are code particles.
  - **Shadows:** one directional light, sized per preset, around Gus. A "near casters" InstancedMesh (trees inside the box, rebuilt as Gus moves), nearby props, Gus, animals and humans cast shadows; the cell meshes don't.
  - **Fixed lights:** sun (directional), hemisphere fill and the headlamp SpotLight (parented to Gus, no shadows) exist from start-up and are never added, removed or hidden. Phases change only intensity and colour, so shaders never recompile mid-game; city and window lights are emissive. `renderer.compile(scene, camera)` runs behind the loading screen. Changing the preset reloads the scene behind a short fade.
  - **Depth:** paths and drives are in the terrain material. The main camera uses near 0.05 m and far = the preset's fog distance. The far layer renders first in its own pass (near 100 m, far 2 km), then the depth buffer is cleared.
- **Streaming:** the world is in 6 zones. Each zone's landmark and vehicle GLBs load when Gus is within 200 m and unload at 400 m. The core set loads before the title is interactive: Gus (both), pigeon-plain (both, with their morph arrays), bench, lamppost, the three trees, the ranger and parkgoer, and the South zone.
- **Gameplay never comes from GLBs.** Collision proxies, perches, triggers, vehicle bodies and item positions all live in `layout.js`. `__game.ready()` resolves when the current and neighbouring zones are loaded; `goToScheme` and the harness await it.
- **Time:** every timer (ranger reverts, feeder arrivals, slice age, rig time, fights, races, nudges) counts game time on the fixed 1/60 step, never wall-clock time.
- **Asset weight:** `tools/optimize-assets.mjs` (project-local `npm i -D @gltf-transform/cli sharp` in `tools/`, never shipped) resizes textures to each model's "Tex" size in the asset list (2048 for Gus, the hero landmarks and the hot dog cart; 1024 for characters, animals, vehicles and close-up props; 512 for small or distant props) and converts them to WebP. **No mesh quantization** (it overflows in three r186 and breaks shader pivots). Fallback: Pillow re-encode plus meshgen `rebuild --max-texture`. Targets: core set ≤ 18 MB (Gus's 2048 textures and the pigeon morph arrays are in it), everything ≤ 65 MB.
- **Audio memory:** keep music as compressed bytes. Decode only the playing track and the next one (≤ 2 music + 2 ambience buffers), and drop a buffer after its crossfade. Ambiences are mono. Effects are decoded once. `state()` reports decoded audio bytes.
- **Collision:** a height map for the ground. Boxes and capsules around buildings, rocks, landmarks, trunks and bridges (glancing response, ~70% speed kept). Canopies are soft volumes. Water lets ducks and geese swim and makes Gus "splash-hop" out. Perches are tagged points and edges (lampposts, benches, signs, rooftop rims, water towers, fire escapes, bridge rails, branches); landing within 0.6 m snaps Gus on, unless the perch is spiked.
- **Schemes are data:** `{id, title, thread, opensWhen:{flags, anyOf, flock}, steps:[{id, goal, obstacle, nudge, answer, needs:{flags, phase, ally, item, hot, gear, crumbs, near}, alts:[{needs, does}], does:{setFlags, give, take, spawn, dialogue}}]}`, exactly the "Scheme steps" table. The Scheme Board, nudges, the Elders, compass, save and `check-schemes.mjs` all read the same data. Thread meters are computed from flags (signs, spike sites, lines, truces, deals).
- **Humans:** at most 16 / 12 / 6 animated humans near Gus (High / Medium / Low; pooled). Farther ones are frozen, then culled.
- **Saving, offline and installing:** as web-target.md. The service worker caches everything the game needs, including the GLBs (not the fixtures).
- **Feedback:** per feedback.md: the Report-a-bug button in Pause and Settings, and **Ctrl+Shift+L**.
- **Gamepad:** per gamepad.md: polled each update, dead zone 0.25, analog triggers for driving, menu repeat, last-device prompts, disconnect pauses, rumble toggle.
- **Debug hook `window.__game`:**
  - `state()`: screen, zone, time, the player's position and mode (walk, fly, drive; when driving: vehicle, speed, on-ice, hopper fill, ramps), feathers, stamina, crumbs, flock, bread power, carried item (and slice age), crews, parts, flags, open schemes, thread meters, signs, spike sites, input device and gamepad id, Gus's on-screen size, `renderer.info` triangles (with and without the shadow pass) and draw calls, crowd counts drawn, and decoded audio bytes.
  - `audioState()`: context state, music and sfx muted.
  - `ready()`: resolves when the current and neighbouring zones are loaded.
  - `step(n, {render})` and `resume()`: advance n fixed **1/60 s** updates, **simulating only**; it renders every Nth frame or when asked (`render: 'last'` for a screenshot). **Nothing in gameplay depends on rendering:** crowd and tree pool refills, the "?" clue ping (it uses a line-of-sight and distance test, not the rendered frame) and every timer run in the update; only the Auto preset probe reads frame times, and it's off when a preset is forced. All randomness is seeded.
  - `goToScheme(id, step?)`: loads `data/fixtures/<id>.json` (exactly what a player has when that scheme opens), or `<id>.s<n>.json` for a later step, puts Gus at the scheme's start Nest (or the step's start spot), and awaits `ready()`.
  - `autopilot(goal)` (debug builds only): see "Testing".
  - `goTo('biggify'|'stomp'|'climb'|'shout'|'rinkjob'|'wedding')` for the finale pieces and the two showpieces (screenshots and review only).
  - `teleport(id)`: for screenshots only, never inside a solution.
  - `dev.setFlags(…)`, `dev.give(item)`, `dev.setPhase(p)`: only for building fixtures and screenshots, never inside a solution.
### Testing: the autopilot, solutions and fixtures

The builder is an agent and can't fly a pigeon live, so solutions are **recorded from a bot that presses real buttons**:

- **`__game.autopilot(goal)`** (debug builds only) takes a goal and, each update, works out the stick, key and button inputs a player would press to reach it: `flyTo(layoutPoint, {alt})`, `walkTo(point)`, `landOn(perchId)`, `peck(targetId)`, `coo({hold})`, `call(ally)`, `ask(ally)`, `wheelPick(ally)`, `drive(vehicle, path, {speed})`, `dump()`, `spray()`, `nap(phase)`, `grate(from, to)`, `waitFor(flag)`. It never moves Gus directly: it only writes into the same input queue the keyboard and gamepad write to. **Teleports and dev setters stay banned** inside solutions.
- **Recording:** running a goal script with recording on writes the raw inputs it pressed, frame by frame, to `design/solutions/<id>.json`. **Replay** feeds those raw inputs back with the autopilot off. A replay that drifts means the game changed: re-run the goal script to re-record, then review the diff.
- **Camera during recording and replay:** keyboard and stick only, with flight auto-follow on; no pointer lock, no mouse drag. So a replay never depends on pointer events.
- **Fixtures per step**, not just per scheme: `goToScheme(id, n)` loads `<id>.s<n>.json` with crumbs, phase, flock count, carried item and Gus's position pinned, so a broken step can be replayed alone. Each step has its own short solution (`<id>.s<n>.json`); the scheme's full solution is those run in a row.
- **Alternatives:** each alternative route gets its own solution (`<id>.alt.json`): wrench by slice, Vinnie by slice, Prickett by Bully, the cyclist by Bully, Queenie by griddle, the cufflink by Mimic, the remote by the jingle, the jogger by fountain, the gate by Rig, Big Sal by slices.
- **Nap between steps:** for every scheme, a test replays it with a nap inserted between each pair of steps and checks it still completes (the runtime twin of the checker's nap rule).
- **Main-path run:** the autopilot plays New Game to credits in one run with real inputs (naps and grate travel allowed). It also checks the crumb rule: at every trade and feast it already has the crumbs.
- **Cost:** the target is a headless replay at ≥ 5× real time (rendering every 30th frame; every 60th if slower), so 30 schemes plus their alternatives (~2 hours of play) replay in under 25 minutes. It's measured on the first scheme and reported; if it's slower, replays run per changed thread rather than all at once.
- The only shortcuts allowed in any solution are things a player can do: napping and grate travel.

## Cut list (emergency only: for technical problems, not money)

With the $100 budget nothing is cut up front. This list is for performance, download weight or build-time trouble, applied in order and only as far as needed:

1. **Texture weight:** Low already halves textures; next, drop Gus to 1024 and the ground textures to 1024 on Medium too.
2. **Pigeon morphs:** if the texture arrays cost too much GPU memory, use 512² layers on High too, then drop to 9 layers (blue bar, checker, melanistic, white, ash-red, pied, silver-dun, mealy, Dove), keeping every named pigeon's morph by moving the rest to the nearest layer plus a tint; if atlas edits seam, use the free region painting (see Art direction).
3. **Near trees:** halve the full-tree and LOD-tree pool sizes; canopy blobs beyond.
4. Park Postcards drop from 16 to 8 (with them the busker riff, carousel organ and waterfall loops).
5. The pedicab (the Racers keep the flight race only); the stealth and race tracks (reuse the encounter track); the second takes of the day music.
6. The Tier B models not yet made stay on their stand-ins; the trash can; the night skyline edit.
7. Regular favours drop to one per crew.
8. Stray pigeons drop from 40 to 24; Summit Perches from 12 to 8; crowd caps −30% on every preset.
9. **Showpiece fallback** (only if a set piece can't be made solid in time): the Rink Job keeps the launch, the pancake and the door fold, but the avalanche and cone strike become a cut to the aftermath; the Wedding keeps the release and the stampede, and the bouquet catch becomes a held pose.
10. The city ring's 110th Street side becomes a skyline wall except one flyable corner block at 110th & Lenox (the bodega, slice joint and grate stay).

**Never cut:**

- flight and walking, and driving (the Zamboni included);
- the five threads: the sign war with ranger reverts and raccoon sabotage, the Slice Run with slice bribes, Spikes, Feuds & Truces, the Lost & Found;
- the four requested allies with their talents (crows trade, raccoons rig, squirrels dig, ducks dive), rats and turtles, and the new crews (cats, horses, songbirds, geese);
- the 4 pigeon gangs, recruiting every crew, the flock, its colour morphs and Dove;
- every named character's own portrait, which is their accepted character card;
- the fights with the owl, hawk, dog and angry human;
- the Rink Job's Zamboni launch and the Wedding's dove release and geese stampede;
- the 8 parts and the Mecha;
- the iconic landmarks and the perchable city ring (three sides at least);
- the Empire State Building climb, the shout, and the painted post-credits sting.

## Effort and cost estimate

A forecast, not a promise. `--budget` ($100) is the only limit. The goal is no compromises, not spending it all.

**Effort:**

- 6 park zones plus a 4-sided city ring, a far layer (day and night), and a finale scene (BIGGIFY, Fifth Avenue stomp, the ESB).
- 17 crews (4 gangs, 13 others; 3 rivals) with ~700 crowd animals, 17 bosses, 50 named regulars (Dove included) with optional favours, nudges and one star turn per crew, and the Call system. Pigeons in 13 painted colour morphs. Every named character dressed to match their card (`looks.js`).
- 5 threads with meters and rewards; **30 schemes** of 1 to 4 steps (17 crews, 6 parts, 2 sabotages, 3 gear trades, 2 truces), each with per-step fixtures and recorded solutions made by the autopilot, plus 10 alternative-route solutions and the finale. Two scripted showpieces (the Rink Job, the Wedding). Play time: trades ~2 min, others 3–6 min, ≈ 95 min with travel; postcards and the finale bring a full run to about 1.5–2 hours.
- 30 signs, 10 spike sites, 3 carts, 3 slice joints and 3 Slice Lines, 40 strays, 20 pretzels, 12 Summit Perches, 16 postcards, 6 nests and 7 grates.
- 4 fights (dog, owl, hawk, vendor) and a race.
- 4 drivable vehicles (hot dog cart, pedicab, RC boat, Zamboni with its hopper, spray, ramps and launch).
- 58 meshgen models (6 rigged humans) + 13 LODs now, 7 more in priority order; the code-assembled Mecha, and the code-built world and small props.
- 15 accepted mock pictures and 65 accepted character cards (done; the portraits), 1 new card (Dolores), ~50 concept pictures and views (most of them edits of the cards), 73 free portrait crops, 24 morph atlases, 16 textures and bands (+ free window masks and code-rendered icons), the title art and the painted sting.
- 17 music pieces (~21 min), 10 ambiences, 110 effects (+ 10 synthesized) and 58 voice lines.

**Riskiest work:**

- **A recognisable Central Park in code:** terrain, water shapes, paths and 2,500 trees must read as the real park.
- **Performance** with this much world and ~700 animals: desktop High at 60 fps, and the Low preset still playable on phones (per-cell instancing, nearest-N tree and crowd pools, per-preset caps above).
- **Animating birds and animals in code,** above all Gus's head-bob and flight, and the **horse's legs** (proved on the first horse; fallback in the key-pose table).
- **Pigeon morph atlases:** nanogen edits of UV atlases may seam; proved on one morph first, then the free region painting, with morph models only as a last resort.
- **Meshy credits** are the tightest resource (see "Meshy credit plan"): every call has `--max-credits`, Tier A comes first, all tiers fit in the 3,402 on hand with ~900 spare.
- **The Zamboni:** ice handling that feels good and still lets the launch trigger reliably, and a chain reaction that replays identically from a recorded solution.
- **Testing 30 schemes** (and 10 alternatives) in software-rendered headless WebGL: the autopilot that turns goals into real inputs, per-step fixtures, and replay speed.
- The **finale's set pieces** and the code-assembled Mecha.

**Prices used (checked 2026-11-13; credits re-checked 2026-11-14 with `meshgen --dry-run` and `balance`):**

- Meshy: ~$0.02 a credit. Model 30 (also with `--texture 2k`), character 35 + 3 per clip beyond walk and run, remesh 5.
- imagegen2: **measured on the mock set and the 80 card pictures:** ≈ $0.06 for a high-quality 1024² image or edit with its references.
- nanogen: flash 1K $0.034, flash 2K $0.05, pro 2K $0.134.
- audiogen: music ~$0.30 a minute, sfx ~$0.12 each (loops a little dearer, so $0.124 is used), voice lines ~$0.05 each with their tries. `voices` is free.

**What this round changed in the spend** (each because it makes the game better or keeps it buildable):

- **The accepted character cards are the portraits** (≈ $4.80, already spent). The planned 73 new portraits ($4.98) are gone; in-game portraits are free Pillow crops, and only Dolores needs a new card.
- **Models match the cards:** Walter and the bride get their own rigged characters; Prickett is re-posed from his card with his props in code; poodle, dachshund, owlet, night heron, sitting-up rat, mastiff and a goose Bully pose follow in priority order.
- **13 pigeon morphs** (4 more, from the cards), with the cards as colour references instead of 8 new swatch pictures.
- **Sounds the scenes need:** the sax busker's riff, the Delacorte rehearsal and Wollman ambiences, the pizza box and handover, a cab horn, real hoof clip-clops, the RC boat and pedicab loops.
- **An honest Meshy retry allowance** (320 credits for Tier A).

**Cost:**

| Kind | Est. |
|---|---|
| Mock pictures for the shared design (15 accepted, imagegen2 high): **actual** | $1.00 |
| Character card pictures (80 made, 65 accepted; the portraits): **actual** | $4.80 |
| imagegen2: ~51 concept pictures and views (22 card edits, 22 new, ~6 views, Dolores's card) incl. ~15 retries (66 × $0.06) | $3.96 |
| imagegen2: app icon ×2 | $0.12 |
| meshgen: 2,443 credits (Tier A 2,233 with 320 retries; Tier B 210) at $0.02 | $48.86 |
| nanogen: 6 ground textures pro 2K ×2 ($1.61); 7 facade/iron/stone tiles flash 2K with retries ($0.55); ESB deco pro ×2 ($0.27); cloud and skyline bands pro ×2 each ($0.54); night skyline edit ×2 ($0.27); 24 pigeon morph atlases + ~8 retries pro ($4.29); the sting pro ×3 ($0.40) | $7.93 |
| audiogen music: ~21 min (17 pieces) plus ~3 min of retries | $7.38 |
| audiogen effects and ambiences: 120 generations plus ~9 retries (129 × $0.124) | $16.00 |
| audiogen voice: 58 lines, crowd-chant takes and ~16 retries | $4.05 |
| **Planned total** (≈ $5.80 of it already spent) | **$94.10** |
| **Reserve** (≈ 6%: play-test fixes, Tier B retries, anything the build finds missing) | **$5.90** |
| **Budget** | **$100.00** |

**Meshy.** Of the model costs, everything (Tier A, all seven Tier B extras, the five duck species and the retry allowances, 2,738 credits) comes out of the **3,402 credits already in the account** after the person's top-up, leaving about 660 spare. The pigeon-morph last resort (up to 720 credits) would need a small top-up if it were ever needed. Spent so far: ≈ $5.80 (mock pictures $1.00 + character cards $4.80). If real prices run high, spend from the reserve first; the cut list is for technical problems, not for money.

## Definition of done

- [ ] Starts with no errors on desktop at 1280×720 and 1920×1080, with keyboard + mouse and with a controller.
- [ ] Loading shows progress; the title appears once with real fonts and art and doesn't jump; no shader compile hitches after the title (fixed light set).
- [ ] Walking (with head-bob), take-off, flight, boost (Shift, double-tap Flap, L3), perching, diving, landing and napping all feel good on keyboard + mouse and controller. The flight camera auto-follows; the stick edge never drains stamina.
- [ ] Flying into canopies passes through with a leaf burst; walls and trunks deflect with a glancing slide; spiked perches bounce Gus off; scenery, spikes and falls never cost a feather; steam stacks lift.
- [ ] Driving works on keyboard + mouse and controller (gas, brake/reverse, steer, horn, get out) for all 4 vehicles (hot dog cart, pedicab, RC boat, Zamboni); the driving camera frames each vehicle.
- [ ] **The Zamboni** feels good on ice: 4 m/s top, a lazy drift, about 3 m braking slide, a padded bump off the boards; it crawls at 1.5 m/s off the ice. The hopper fills, Dump makes a pile, Spray freezes a pile into a ramp at Night only (slush at Dusk), ramps launch a hop, and naps clear them. It stays drivable in free roam in every phase.
- [ ] Gus's on-screen size meets the camera acceptance numbers; `gus-stand` and `gus-fly` pass the side-by-side match check.
- [ ] The first minute plays as scripted: first flap prompt within 10 s, first sign flip and crumbs by about 45 s.
- [ ] Every landmark in the map table is present, recognisable and where it belongs, south to north, with its NYC life (carriage line, slice joints, bodegas, carts, doormen, construction site, water towers, grates, the rink and its Zamboni, the wedding shoots); the ESB and the park's shape are visible from any Summit Perch, by day and at Night.
- [ ] Every one of the 30 schemes, and so all 17 crews and all 8 parts, can be finished, each proven by replaying its recorded real-input solution (made by the autopilot, replayed raw with the autopilot off) from `goToScheme(id)`, and each step from its own fixture; the 10 alternative routes are proven by their `.alt` solutions; every scheme still completes with a nap inserted between any two steps. `check-schemes.mjs` passes (no cycles, all reachable, phase/ally/gear/roadside rules, alternatives for every `opensWhen` state, hot-slice routes, spike and feud rules, the nap rule, the rink run-up and the wedding's no-bypass rule, never 0 open before the finale).
- [ ] **The Rink Job** (`part-talons`): the Kick-and-rig opens the Zamboni and Ringo's slush demo plays; the launch triggers only from a frozen ramp whose centre is in the launch-lane box, at ≥ 3.5 m/s and within ±30° of north; the full chain reaction (lift-off, pancake, hubcap, door fold, avalanche, strike, the raccoons' sled tag) plays and replays identically from its solution; it sets `cart.south` (South signs permanent, hubcap) and `shed.open` and delivers the Talons with no chore after it; a slow or off-lane attempt hops back toward the rink's centre with no harm; the optional leftover strips can be hoovered for crumbs; Prickett leaves the next Morning and spikes nothing more.
- [ ] **The Wedding** (`part-power`): with Dove in the flock, the basket step releases her and `wedding.doveReleased` survives a nap; geese first gives the "NOBODY moves" line, Mimic gives the "Phones OFF" line, and nothing breaks; Dove then the geese plays the stampede and bouquet catch, brings the battery up (Bubbles) and away (Rhoda) inside the scene, and ends on the polaroid on the Board.
- [ ] The Scheme Board starts with three lanes after the Prologue (4 open cards) and adds each other lane, with its antagonist intro, when its first card opens; the HUD shows a lane's meter only once the lane exists; thread meters tick correctly (Bread Power, Slice Lines, Spikes cleared, Truces, Deals); a thread's reward arrives when its meter fills.
- [ ] Scheme spots show only world clues (no ally icon after a talent's first use); Board cards show goal and obstacle; a nudge appears after ~3 minutes on a step; "Ask the Elders" shows the answer. Clues are ≥ ~16 px at 60 m at 1280×720.
- [ ] Calling allies works from the wheel with mouse, keys and controller; phase and feud limits grey out correctly with their reason (horses' road rule applies only to Pull); a wrong-place Call plays its line and nothing breaks.
- [ ] Slices: picked up from every source, cool after 60 s (steam and ring), warm on the griddle, ride grate travel, are refused cold by hot-only takers, and are accepted by every taker in the slice table; Slice Lines and the Slice Relay deliver once per phase; naps cool or clear them as specified.
- [ ] Signs flip; feeders come and leave a crumb pile that waits until eaten (and a nap clears it); the main-path autopilot run never arrives at a trade or feast short of crumbs; rangers revert them (and naps do); Mimic and Bully delay a revert; naps never undo a finished step; sabotaging a cart makes its region permanent and brings Prickett's two new spike sites (Middle and North); city signs stay; Bread Power counts; permanent signs pay on waking.
- [ ] Spike sites block exactly what the table says; cats clear strips; raccoons or Rhoda clear nets and bolts; P5 and P6 appear after `den-horses`; after the Rink Job no new sites appear.
- [ ] The 4 fights (dog, owl, hawk, vendor) can be won, their rules hold (no flying out of them), the assists and the owl's checkpoints and decoy work, and being Ruffled returns Gus to a Nest with nothing stuck.
- [ ] The race can be finished both ways; rats' fast travel works between all 7 grates (110th after the truce); all 16 Park Postcards can be collected.
- [ ] Crowds: ~700 animals live in their places; crews visibly change mood when they join; Park Support counts them.
- [ ] **Pigeon morphs:** a screenshot of the full flock and of each gang shows at least 6 distinct painted morphs with varied neck sheens and no texture seams at game distance; every named pigeon wears the morph its card shows; Dove is the only pure-white bird and is always in the visible flock; no blue-bar bird sits in the 8 flock slots nearest Gus, and Gus reads from behind in a 24-bird flock.
- [ ] **Portraits:** all 73 named characters show **their accepted character card** (cropped and framed in dialogue and the ally wheel, whole in the roster), none regenerated; Dolores's new card matches the set; every named character's in-game model wears what their card shows (`looks.js`, side-by-side screenshot per crew against the cards); every boss plays their voiced barks (greeting, Call, joining).
- [ ] The Mecha assembles part by part in the Workshop (including the talons, and the cone, megaphone and battery models), BIGGIFY scales it, and a close-up in the shout shot looks finished after asset optimization (as do one code-animated horse, one cat, the Zamboni, the pizza slice in Gus's beak and the near trees).
- [ ] The finale plays from the Workshop doors through BIGGIFY, the Stomp and the Climb to the shout (with its stinger), the credits and the painted post-credits sting, and back to free roam.
- [ ] Night screenshots of the Ramble, the city ring (lit bodegas), Wollman Rink and a Summit Perch view read well.
- [ ] One full playthrough, New Game to credits in one run, **with real input and no jumps** (naps and grate travel allowed), with no stuck states.
- [ ] The Scheme Board, map, ally wheel, roster, pause, settings, controls, credits and report-a-bug all open and close with mouse and controller. Esc under pointer lock opens pause.
- [ ] Controller: PlayStation and Xbox prompts are correct (including Dump/Spray on the Zamboni); no chords; switching devices updates the prompts; unplugging pauses.
- [ ] Every screen looks finished at 1280×720 and 1920×1080, from the first load: no junk text, nothing cut off, no overlapping pop-ups.
- [ ] Music and sound play after the first input (the day loops alternate their two takes; the rink waltz plays while driving the Zamboni); mute (M and the speaker button) and the volume sliders work and are remembered. Decoded audio stays at ≤ 2 music + 2 ambience buffers.
- [ ] Progress is saved and restored (mid-scheme, after a reload, including dropped items, a carried slice's age, spike sites, truces, and the Zamboni's position).
- [ ] Desktop performance: measured from `state()` in the busiest spots (Central Park South at Afternoon; the Ramble, densest trees): every preset stays within its triangle, draw-call, full-tree and crowd caps. Download ≤ 65 MB, core set ≤ 18 MB. Frame rate can't be measured in headless software WebGL, so the wrap-up lists a **manual fps check for the person** (High at 1080p on a desktop GPU, Medium on a laptop with integrated graphics, both aiming at 60 fps, with Auto stepping down below 50).
- [ ] **Phone smoke test** (best-effort, not a full playthrough): at 844×390 landscape with touch, the game loads on Auto → Low, touch controls work (stick, Flap with slide-off camera, Dive, Peck, Coo, wheel, Board, pause), the Prologue and one Act 1 scheme (`den-rats`) can be finished, the HUD, Board and menus have no broken layouts, and Low stays playable (≥ 30 fps on a mid-range phone profile, ≤ 300k triangles, ≤ 150 draw calls). Portrait shows "turn your phone".
- [ ] Installs as an app and works offline.
- [ ] The "Report a bug" button and Ctrl+Shift+L open the report.
