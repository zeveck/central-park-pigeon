# Super Jumbo Bagels (#44) and bagels as bribes (#45), 2026-11-25

The owner's issues (#44, #45) ask for a bagel shop on a park-edge street, a raccoon favour called "The Jumbo Order" (worked out from a riddle, ordered from a menu, paid in crumbs, rewarded with a postcard and an Everything Bagel scarf), and plain bagels you can drop to bribe wary animals for #24's lead hints. #45 builds on #44. The structure follows `photo-mode.md`. The budget is $20 per change.

Style reference: `bagel-shop.jpg` in the repo root is a local photo of a real shop. It is never committed and never copied. We take only its look: a black fascia with white raised lettering, a tall blade sign on iron brackets, a pale-brick walk-up with fire escapes above, a neon OPEN in the window and an A-frame board on the pavement.

**Revised after review round 1** (table at the end). The big changes: all lettering is drawn in code; the shop moved to x ≈ −64 so it sits under one building; Mama Mask's union slice entry moves into the crews.js literal; her bagel answers are worked out per step; bagels sink and go at naps like slices (except the order on the counter); a bribe now always gives a **tip** (what the boss wants) as well as the #24 hint, and the game teaches bribes in five places; crowd animals get their own crew voices; Manny wears a paper hat and a long apron; the proof plan adds the sweep fixtures, a goal script, a size-independent menu step and a part-talons replay.

---

## #44 The shop

**Where: 110th Street (Central Park North), centre x ≈ −64, across from the north wall's gate at X(0.2) (x −70…−62).** Why this spot and not the Delacorte:
- **It's the raccoons' neighbourhood.** Mama Mask's spot on the Loch bank (−32, 927) is about 145 m away, through the north gate: a 15-second flight. The Delacorte is about 490 m from her, in mid-park, and its west side is the natural history museum, with no shopfront to use.
- **The look is already there.** The 110th side is low brick walk-ups (15–26 m), and `city.js` gives every north-side building fire escapes (`fireEscape`, from 7 m up). That's the photo's look for free.
- **It sits under one building.** The city's lot loop (replayed in node by the builder review) puts a party wall at x −68 between a 17.5 m and a 24.5 m brick building. The shop spans −67.2…−60.8, all under the 24.5 m building (−68…−42.67), whose fire escape is at −57.3…−53.3: 3.5 m clear of the shop's east end and 10 m from the blade sign at its west end. The layout is fixed by `rngFor('city')`, so this holds on every run; the build-time check below stays as a guard.
- **It's apart from what's there.** It is about 115 m west of the Lenox slice joint, bodega and grate, so it's a different corner of the same street, and the halal cart (110th & Fifth) is far east. No stray, pretzel, sign or crowd haunt is near: the nearest are the Blockhouse strays (st35/36) about 40 m south, inside the wall, and the cats' and rats' pavement haunts at x 30–61.
- **No recorded solution crosses it.** `affected-solutions.mjs --rect -74,1062,-54,1080` returns 0 of 41. A wide box (−90…−40, 1040…1095) finds only den-meermob, its .alt and den-rhoda, in the Blockhouse tiles inside the park (z ≤ 1056), at least 12 m from the shopfront. (`whole-game.json` isn't in the route index; only its legs are. It takes the north gate at most, never the pavement face.)

**Built in code, in its own module** (`world/bagel-shop.js`, run after the world build, not inside `storefront()`, so the collision arrays built later, summit-cps and the landmarks, keep their order). The facade itself is a `CITY.storefronts` entry `{ id: 'bagel-110', name: 'Super Jumbo Bagels', kind: 'bagel', side: 'north', x: -64, z: PARK.zMax + AVENUE + 1 }` so it gets the usual shop facade; the module adds:
- **A walk-up window that sticks out 1.4 m onto the 4 m pavement** (the pavement is z 1066.6–1070.6, so 2.6 m stays clear). The slice joints' countermen stand inside the building face and can't be seen, but Manny must be seen. The window has:
  - side walls and a lower front panel up to the counter, 1.05 m high;
  - a perch edge along the counter (Gus lands on it);
  - an open window from 1.05 to 2.4 m, with the lit back wall (the generated, textless shop interior; see Assets) and the emissive mask the other always-lit windows use;
  - **an invisible collider pane** filling the open window above the counter, so Gus can't fly into the 1.4 m box and through Manny;
  - a glass door beside it (code geometry).
- **The fascia:** a black band 6.4 × 0.9 m above the window. It keeps the slice joints' awning slope and perch edge, but the awning is black. Its lettering is a canvas drawn in code (below).
- **The blade sign:** about 0.9 × 6 m, standing from 4 to 10 m up at the shop's west end (x ≈ −67). It sticks out 1.6 m on two iron brackets (`iron` material boxes), with the lettering on both faces. Its top is a perch edge: it's the tallest thing on the block's front, it can be seen from the North Woods, and Gus will want to sit on it. Guard: at build time, read the span the sign stands on; if a fire escape comes within 2.6 m, put the sign at the east end instead (it won't, per the lot replay). The world's random layout is not re-rolled.
- **Neon OPEN in the window:** an emissive plane that is always on, its letters drawn in code. It glows at Dusk and Night (24 hours: "Bagels don't sleep").
- **An A-frame board on the pavement** at (−59.5, 1067.6), beside the door, 0.6 × 0.95 m, facing the park, with a small collision box and a perch on its top edge.
- **No new rng draws:** the module runs after the city loop, and the chalk jitter below has its own fixed seed, not the game rng.

**All lettering is code** (the game's rule: signs are code text, `signMaterial()` in city.js:466–483). An extended `signMaterial()` draws:
- the fascia (2048×256 canvas) and the blade sign (512×1536 canvas, SUPER / JUMBO / BAGELS stacked): **Fredoka 700** (already loaded, main.js:704), off-white #F4EFE6 on near-black #1E1C1B. The raised look is a two-pass draw: a dark offset shadow 4–6 px down-right, the letter, then a 1–2 px lighter top-left edge. Emissive 0.35, as on the other signs, so it reads at Dusk;
- the A-frame: slate #2E3532 with chalk-white Nunito (a small per-letter wobble from a fixed-seed jitter): "SPECIALS", "SQUIRRELS TALK FOR PLAIN", "PIGEONS WELCOME (FOR ONCE)" and two chalk bagel rings;
- the neon OPEN.
- **The mirror:** every canvas goes through the mirrored world root (main.js), so flip the UVs as `signMaterial` does (`repeat.x = -1`; Fixes-3, R4).

The building above the shop keeps whatever style the random layout gave it (brick, per the lot replay), which reads close to the photo's pale brick, so we don't recolour it.

Add a PLACES entry: `'bagel-110': { name: 'Super Jumbo Bagels (110th St)', x: -64, z: 1068, r: 10 }`. **The shop's map dot shows from New Game** (it's a 24-hour landmark, like the carts; map.js draws it without the `seenAt` test), in the slice joints' style with a bagel-gold ring.

**The bagel guy: Manny.** He's an old-timer, warm and dry ("A pigeon. Sure. Why not.").
- **Model:** `human-chess-player` (grey beard, mustard cardigan) plus code accessories that change his silhouette at a glance, because the same model walks 110th in the `city` pool (people.js:21) and sits in parks: **a white deli paper hat** (the existing `paperhat` accessory, humans.js:1219, sitting on the cap band) and **a long white apron, chest to knee** (a new `apron-long` variant of humans.js's `apron`, `#efe9dc`, 1.0 m instead of 0.5 m). He's always behind his counter, so a clone walking past is a passer-by in a cardigan; Manny is the man in the hat and apron. The proof shots check no chess-player clone stands in frame with him.
- **Not a humans.js agent.** He behaves like `act: 'work'` (idle at his post, facing the park, turning to the oven when an order comes in), but he is the shop module's own clone, as Say Cheese's tourist is (with the `holder.scale.x = -1` counter-mirror, say-cheese.js:84). The reason: PEOPLE seeds every agent by its place in the list (`human:<role>:<id>`), and the shared crowd systems (swarm, lure, feeder) read agents. A new PEOPLE entry would shift the seeds and could move every replay.
- **Name and portrait:** a CHARACTERS entry `manny: { name: 'Manny', role: 'human', bio: 'Super Jumbo Bagels. Open 24 hours.', at: { x: -64, z: 1070.1 }, out: 'any' }` (characters.js skips `role: 'human'` entries, so it builds no model; the shop module registers his targets). His card is an imagegen2 edit of the chess-player concept (see Assets) and his portrait is a Pillow crop of it (`tools/portrait-crops.json`).

**Pecking Manny or the bell opens the menu.**
- **Manny:** the shop module registers an interact target on him, "Talk to Manny" (r 1.6, dy 1.8, priority 3 like characters): his line, then `G.openMenu('bagels')`. Players peck the man before they spot a bell.
- **The bell:** a code-built chrome service bell on the counter, `bagel-bell`, "Ring the bell" (r 1.4, dy 1.6, priority 2: below a pick-up's 5, so an item in reach still wins, interact.js:46–52). Peck → `bell-ding` → the same as Manny.
- The game clock stops, as in every menu.
- **Carrying a bagel at the counter:** Peck Manny or the bell while carrying a bagel, and Manny takes it back first ("I'll toss that one to the pigeons out back. No refunds, pal."), then the menu opens. The same happens when Gus picks up a waiting order while carrying a bagel: the old bagel goes to Manny, not onto the counter. So wrong bagels never pile up in reach of the bell. The one exception is the quest bagel (Sesame + Jalapeño while the Jumbo Order is open and not done): Manny says "Hang on to that one, pal. Somebody's waiting on it." and keeps out of it.
- **The screen:** built like Ledger's stash (`overlay`, a grid of `.btn small` with a 34 px picture and a sub-line, the shared Menus focus):

  | | |
  |---|---|
  | Header | SUPER JUMBO BAGELS, Manny's portrait, his line, "Your crumbs: N". While the Jumbo Order is on step 2, the riddle from the card sits under the header ("Mama Mask wants: little seeds, like sand…"). |
  | Row 0 | **Plain bagel to go: 2 crumbs**, sub-line "For making friends. Critters go nuts for these: drop one near some." (one press; the #45 bribe) |
  | Row 1: Bagel | Plain ("golden and plain") · Sesame ("toasty pale seeds") · Poppy ("tiny black seeds") · Everything ("seeds, garlic, onion, salt: everything") |
  | Row 2: Schmear | None · Plain ("cool and plain") · Scallion ("green and oniony") · Strawberry ("pink and sweet") · Jalapeño ("green, with a kick") |
  | Summary | "Sesame + Jalapeño: 4 crumbs" · **Order** (primary) · Back |

- **Prices:** a bagel with no schmear costs 2 crumbs; with a schmear, 4. That's cheap: players have more crumbs than uses.
- **Focus:** the screen's `preferredFocus()` returns the first bagel (Plain in Row 1). `focusFirst` honours `preferredFocus` before its replay default (menu.js:62–64), so this holds in a replay too. Picking a bagel moves focus to the schmear row, and picking a schmear moves it to Order, so a pad needs few presses. The picked button shows `primary` and `aria-pressed`.
- **Input and navigation:** mouse hover focuses (as in the stash) and a click picks; touch taps. **The screen owns its arrow keys:** each button carries `data-row` and `data-col`, and the stick, D-pad or arrows move by row and column (left/right within a row, up/down to the same column clamped to the row's length), not by on-screen distance, so the same presses land on the same button at every window size. ✕/Enter picks, ○/Esc goes back. The hint row is `[["uiOk","Pick"],["uiBack","Back"]]`.
- **Phone, 844×390:** five 150 px columns fit, and the whole screen is about 300 px tall. If it overflows, the card scrolls, and Order stays in view (`scrollIntoView` on focus).
- **Ordering:**
  1. Crumbs go down (`trade-ka-ching`), the menu closes, **and the bagel is spawned at once, hidden, on its wax paper on the counter, 0.6 m from the bell** (so a pagehide autosave in the next 1.5 s keeps both the crumbs spent and the bagel). It carries `extra: { counter: true }`.
  2. Manny turns to the oven (a yaw tween, `griddle-sizzle` quiet, a 1.5 s pause), then the bagel shows (`paper-rustle`) and he says "Order up!".
  3. Peck it to take it (an item within reach beats the bell). Taking it clears `counter`.
  4. One order waits at a time: "an item with `counter: true` lies in the world". While one waits, Manny and the bell get "Your order's right there, pal.", so Gus can order with his beak full and come back for it.
- **Broke:** if Gus has fewer crumbs than the price, Order reads "On the house (once a phase)", and Manny lets one slide ("Short? Eh. You're good for it. Make it a good one, pal."), using `phaseUsed['bagel.free']`. Once that's used this phase, Order is greyed out with "4 crumbs. You have 1. Signs leave crumbs." A nap starts a new phase (clues.js:880 clears `phaseUsed`), so there is never a dead end.

**Bagels as items** (`ITEM_DEFS`, all light, code-built):
- **Shape:** two tori, about 14 cm across. They're "jumbo" for a pigeon, carried in the beak like the slice, and big next to Gus.
- **Look:** a crust texture per base, from the generated atlas (made from the menu sheet, so menu and prop are one bagel). The 5 schmear options are a flat disc between the halves (none for None), in colours sampled from the menu tubs, with flecks.
- **Ids:** `bagel` (plain, no schmear) and `bagel-<base>-<schmear>` for the other 19 combinations, made in a loop. Names like "Sesame bagel, jalapeño schmear". Each def has **`food: true`**.
- **Food, like slices:** everywhere `d.slice` decides "gone", `d.food` does too: dropped over water a bagel sinks ("The bagel sank. Manny's got more.", items.js:288), Ruffled loses it (items.js:458), and a nap takes bagels on the ground (`onNap`, items.js:441: "A rat took your bagel while you napped."). **Except:** a bagel with `extra.counter` (the order waiting indoors on the counter) is skipped at naps, and the quest bagel goes back through its keeper rule instead of sinking (below). Carried bagels keep at naps, since they don't cool.
- **Renewing:** RENEWING is matched with exact `includes()` (item-sources.js:30, mistakes.js:700, check-schemes.mjs:260), so list the 19 non-quest ids explicitly (built by the same loop, exported from items data). `bagel-sesame-jalapeno` stays off it, so check-schemes 5c still asks for its keeper rule.
- **HUD icon:** a `bagel` SVG in icons.js (a golden ring with a hole and 3–4 seed dots; the schmear colour as an inner arc), and `itemIcon` maps `bagel*` to it (icons.js:70 falls back to the grey `item` otherwise).

## #44 The quest: "The Jumbo Order"

**Who asks: Mama Mask, not Rigby.** She "runs the drain kitchen", wears an apron and carries a spoon (looks.js:108), and she's the crew's food boss ("union rules": a slice before a job). A bagel order is hers. Rigby's story is wrenches and carts, and he already has his own scheme, the Eyes hubcaps and the finale lines. Her talk lines are all about food, so a sideways food riddle fits her voice ("sweetie").

**When:** `opensWhen: { flags: ['den-raccoons'] }`, because she calls Gus family once the Night Crew joins (Rigby's after-line). The shop and the plain bagel are there from New Game, since #45 matters most early. The scheme is the last entry before `finale`, after `say-cheese`, so `openList()[0]` doesn't change. It goes in the Slice Run lane (`thread: 'slice'`: food over a counter). It's a leaf scheme (`gives: {}`, sets nothing any other scheme reads), so check-schemes leaves it out of the completion-order walk. `start: 'nest-north'`, act 2.

| # | Goal (card) | Needs → on | Nudge (3 min) | Answer (Elders) |
|---|---|---|---|---|
| 1 | Talk to Mama Mask in the North Woods (by the Loch, or wherever the raccoons are), from Dusk. | dusk-night · `north-woods` → talk `mamamask`; script `jumbo.order` (her riddle) | Socket: "Mama's been on her feet all night, boss. Go say hi. She's on the bank by the Loch." | (a talk step) "From Dusk, find Mama Mask (red headscarf, apron, spoon) on the Loch's bank in the North Woods and peck her." |
| 2 | Order Mama Mask's bagel at Super Jumbo Bagels on 110th Street. Obstacle: *Mama Mask wants: "Little seeds, like sand. Just the one kind. And the schmear with the green fire in it."* | any · `bagel-110` → pickup `bagel-sesame-jalapeno`. **Alt:** needs `{ item: 'bagel-sesame-jalapeno' }` (carried, no place) → `auto` | Ringo: "Peck Manny or the bell, boss. Then read that menu slow. Mama's riddles are all colours." | "At Super Jumbo Bagels on 110th Street (the black sign across from the North Woods gate), peck Manny and order a Sesame bagel with Jalapeño schmear. Peck it on the counter to take it." |
| 3 | Bring the bagel to Mama Mask in the North Woods, from Dusk. | dusk-night · `north-woods` · item → give `bagel-sesame-jalapeno` to `mamamask`; script `jumbo.done` | **Ringo:** "Mama only comes out from Dusk, boss. She'll be by the Loch." | "From Dusk, carry the Sesame + Jalapeño bagel to Mama Mask on the Loch's bank and peck her." |

Step targets: 1 and 3 `{ who: 'mamamask' }` (the compass follows her, even to the rink); 2 `{ at: bell, label: 'Super Jumbo Bagels' }`. The riddle sits on the card for good (no chain the player has to remember), and on the menu while step 2 is current.

Step 2's `auto` alt covers the out-of-order case live: `#poll` completes `auto` steps from needs, and needs.item means "carried", so a player who bought the right bagel before step 2 opened completes it the moment the riddle ends. (The #23 `repairSpent` re-arm only runs on Continue, main.js:1688, so it can't be relied on.)

Steps 2 and 3's nudges are Ringo's, not Socket's, because takers.js won't let a step's nudge giver eat (`#wantsTalk`, takers.js:63–71), and Mama Mask's "Give that one to Socket" has to work on steps 2 and 3.

**The clever bit:** three of the four bagels have seeds, and two of the schmears are green. The menu's descriptions and Mama Mask's words are the only key:
- "sand" means pale, which rules out Poppy;
- "just the one kind" rules out Everything;
- "green fire" against "green, with a kick" and "green and oniony" means Jalapeño, not Scallion (a moment's thought, not a word match).

Every rejection says which half is wrong, so a guesser gets there in two or three orders at 4 crumbs each.

**How Mama Mask answers a bagel (takers.js).** Static `keep` entries can't do this (takers.js returns the keep line before it emits `give`, and entries can only be gated by phase), so:
- **Move the union slice into the crews.js TAKERS literal:** `mamamask: [{ wants: 'slice', any: true, flags: ['union.paid'], line: 'Mama Mask takes it. "Union rules. NOW we work."' }, { wants: 'bagel*', when: jumboAnswer }]`, and delete the runtime guard in spikes-feuds.js:45 (with a key in the literal it would never run, and a slice would fall through to `eaterGive` and be eaten). Test: give her a slice on part-talons step 2 → `union.paid`.
- **`entryFor` gains a `when(G, itemId)` test:** an entry with `when` applies only if `when` returns a line (used as `keep`), and is skipped if it returns null. Entries without `when` behave exactly as now.
- **`jumboAnswer`** (in the jumbo-order install), for a carried bagel:
  - part-talons step 2 open and no `union.paid`: "A BAGEL? Union rules say SLICE, sweetie.";
  - Jumbo step 1 current: **null**, so the talk wins and the riddle plays (a player carrying bribe bagels isn't told off for a riddle they haven't heard);
  - Jumbo step 3 with the right bagel: **null**, so `#stepWants` fires the give;
  - the right bagel when the quest isn't open yet, or after it's done: "Ooh, sesame and jalapeño! You got taste, sweetie. Hold that thought." (before) / "Another one? Sweetie, you spoil me. Save it for the squirrels." (after);
  - any other bagel on step 2 or 3: the computed rejection below;
  - any other bagel otherwise: "That's a nice bagel, sweetie. Not my order, though." (she keeps out of it; Gus keeps it).

**Rejections** (Gus keeps the bagel). The line is a prefix for the half that's right, then a line for the half that's wrong:

| What's wrong | Line |
|---|---|
| Base right, schmear wrong: prefix | "The seeds are right, sweetie." |
| Schmear right, base wrong: prefix | "The green fire, YES." |
| Poppy | "But these seeds are BLACK. I said sand, not pepper." |
| Everything | "EVERYTHING? I asked for one kind of seed, not the whole spice rack." |
| Plain base | "Where are the SEEDS? This one's bald." |
| Scallion | "Green, yes. Fire, no. That's an onion with ambitions." |
| Strawberry | "Pink? Do I look like I'm having DESSERT?" |
| Plain schmear | "Plain schmear. Where's the FIRE, sweetie?" |
| No schmear | "Naked? A bagel with no schmear is a hockey puck." |
| Both wrong | the base line, then "…and the schmear's wrong too. Back you go, sweetie." |
| Plain bagel, no schmear | "A plain bagel. PLAIN. That's what they throw to the pigeons, sweetie. No offence." |

**A wrong bagel** stays in Gus's beak, and Mama Mask adds "Give that one to Socket. He'll eat anything." He can:
- **give it to any eater:** takers.js's eater paths gate on `isSlice` (takers.js:12, 59, 87), so add `isFood = slice or bagel` and use it in `eaterGive` and `#eaterHuman`; bagel lines in `EAT_LINES`. Socket says "Mama's leftovers? Don't mind if I do." Ringo says "Fuel! Thanks, boss." The rats, Biscuit, and a seated person ("Ooh, a bagel! Thanks, little guy.") take it too;
- **take it back to Manny** (above);
- **drop it near animals** (#45);
- **drop it anywhere:** it stays until a nap.

**The Rink Job at the same time.** Both schemes open after den-raccoons, and part-talons hooks `talk` on Mama Mask during its step 2 (part-talons.js:91–93) with `G.later(0, …)` guarded by `!G.dialogue.open`. The Jumbo step-1 talk opens its script in the same tick, so the riddle plays and the union line is skipped; the next peck gets the union line. During part-talons step 2 Gus is normally carrying the slice, and her slice entry wins over any talk, as now. If she's been Called to the rink, the step-1 card says "or wherever the raccoons are" and the compass follows her.

**The payoff** (`jumbo.done`, a short scene, about 8 s):
1. Mama Mask sniffs and says "Sesame. Jalapeño. Jumbo. …Sweetie, you LISTENED."
2. She bites (`bagel-munch`), steam puffs from her ears (particles, the code `whistle` synth pitched up as a kettle), and she says "THAT'S the stuff. Whoo! Somebody get me a milk." Rigby, Socket and Ringo crowd in. A warm code key light (a drain-kitchen lantern) sits on her for the scene, since it plays at Night under trees.
3. The postcard snapshot is taken here, with the bite framed.
4. She takes a scarf out of her apron: "Knitted it on my break. Everything stitch. Keeps your neck warm and smells like Sunday."
5. Toast (`scheme-step-chime`): "The Everything Bagel scarf is yours! Wear it from any Nest." The scarf goes in the stash, not on Gus, as with every earned scarf.

**Rewards:**
- **Postcard "The Jumbo Order":** a POSTCARDS entry with `kind: 'scheme'` and no world trigger. `G.collect.award(id)` takes no options today and always pays +10 (collect.js:261–266), so it gains an options argument: `award('jumbo-order', { crumbs: 0 })`. The issue says no crumb pile, so this is the one postcard that pays 0.
- **The Everything Bagel scarf:** a SCARVES entry `{ id: 'everything-bagel', name: 'Everything bagel', how: "Mama Mask's thank-you" }`, with no price (it can't be bought). Its comment: "Smells like a Sunday morning." Ledger, the first time he sees it: "Sesame stitch. From a RACCOON. …It's documented."
- **No Mecha part, no crew, no crumbs:** `gives: {}`.
- **They count toward Completionist** (owner's call). The counts read the lists: `POSTCARDS.length` and `SCARVES.length`, not 16 and 10, in the collect.js toast (line 267), the board.js lane title and "Sixteen little park moments" (board.js:86, now "Little park moments." with the count beside it), and the completion rows (collect.js:460, 463). The table then reads 17 and 11.
- **"New in the park" for older saves:** on Continue, a save without the flag `news.bagels` gets a one-time notice card: "New in the park: Super Jumbo Bagels on 110th, across from the North Woods gate. Open 24 hours. There's a new postcard and a new scarf to find, and the critters have opinions about bagels." (OK closes it.) Then the flag is set. New Game sets `news.bagels` at the start, so a new player never sees it. The Board's Postcards and Scarves rows show "New!" while the save has the flag `news.bagels.old` (set with the notice) and the row isn't full. Flags only: freshState gains no keys, so old saves load untouched (gamestate.js:20–53).

**Other lines:**
- **Manny** (bubbles and voice):
  - first time: "Welcome to Super Jumbo! A pigeon. Sure. Why not. What'll it be?"
  - later: "Ding ding. What'll it be, pal?"
  - at Night: "Twenty-four hours, pal. Bagels don't sleep."
  - order up: "Order up! One jumbo. Don't eat it all at once." / "Hot outta the oven, pal."
  - a plain one: "One plain. A classic. Like me."
  - **the first plain bagel to go** (flag `bagel.tipped`): "Word of advice, pal: drop that near a squirrel and watch it sing."
  - take-back: "I'll toss that one to the pigeons out back. No refunds, pal."
  - quest bagel kept: "Hang on to that one, pal. Somebody's waiting on it."
  - waiting order: "Your order's right there, pal."
  - free order: "Short? Eh. You're good for it. Make it a good one, pal."
  - lost quest bagel back: "Lost it? I made two. I ALWAYS make two."
- **Mama Mask:**
  - the riddle (step 1): "Sweetie. I been on my feet all night, and I want a JUMBO from that bagel place on 110th." / "The one dressed for the beach. Little seeds, like sand. Just the one kind, mind." / "And the schmear with the green fire in it. Ringo calls it 'the spicy grass'. Go on, sweetie."
  - the bagel answers above;
  - **a voiced greeting** `mamamask-greeting`, hooked to her talk, so her voice is hers everywhere she speaks (audio.js:124's `-(greeting|call|join)$` regex already routes it).

**No dead ends (#23, adventure.md):**
- **Can't be undone:**
  - crumbs spent (at most 4 an order, plus the free order each phase);
  - a bagel eaten by Socket or an animal, or taken back by Manny;
  - giving the right bagel, which is the last step.
- **Lost quest bagel:** an ITEM_SOURCES rule `{ item: 'bagel-sesame-jalapeno', scheme: 'jumbo-order', steps: [3], flag: 'jumbo.ordered', at: <counter>, label: 'the Super Jumbo Bagels counter' }`. If it's lost on step 3 (water, Ruffled, a nap on the ground, forgotten), it comes back on the counter, and Manny says "Lost it? I made two." check-schemes 5c needs this rule. On step 2 the bagel is either on the counter (safe at naps, `extra.counter`) or carried (step 2 is then already done), so step 2 needs no rule.
- **Out of order:**
  - Gus orders the right bagel before step 1 or 2. He keeps it ("Hold that thought" if he shows her); step 2's `auto` alt completes the moment step 2 is current.
  - Gus carries any bagel on step 1: the talk wins.
  - A wrong bagel at any step: the rejection, and Gus keeps it.
- **Time:** Mama Mask is out only at Dusk and Night. The card's "Nap until Dusk" button covers that. The shop is open in all four phases.
- **Broke:** one free order a phase; naps renew it.
- **#45 never takes the quest bagel:** while the Jumbo Order is open and not done, a dropped Sesame + Jalapeño bagel draws no animal and stays where it fell. Drops made by `repairSpent` on Continue (it calls `G.items.drop()`, which emits `drop`) carry `{ repair: true }` and are ignored by the bribe.

---

## #45 Bagels as bribes

**The plain bagel is on the menu from New Game**, at 2 crumbs (Row 0). Any bagel works as a bribe, schmeared ones too; only the quest bagel is held back, as above.

**What a bribe gives that walking up doesn't.** The passive #24 hint fires on a crew's first scatter (`#leadHintLine`: `n % 3 !== 1` is false when n = 1, crowds.js:483–497), so by the time Gus drops a bagel the region is usually already marked. So a bribe always gives the crew's **tip: what the boss wants**, a line the passive path never says, taken from the crew's den scheme. It's still soft guidance, never a pin (the owner's #24 rule). If the #24 hint isn't known yet, the animal says it first and the region goes on the map; then the tip. The `when` part (by day, at night) is already in every #24 line, so the tip doesn't repeat it.

**How the game teaches it** (five places):
1. the menu's Row 0 sub-line: "For making friends. Critters go nuts for these: drop one near some.";
2. Manny's line on the first plain bagel: "Word of advice, pal: drop that near a squirrel and watch it sing.";
3. the A-frame: "SQUIRRELS TALK FOR PLAIN";
4. the shop's map dot from New Game;
5. **one early pointer:** the first time a #24 region is marked (the "…: marked on your map" toast), 3 s later a one-time toast from the Duchess (the Swells join in the Prologue): "Duchess: Darling, a bagel loosens any beak. Super Jumbo Bagels, on 110th." (flag `tip.bagels`; UI only).

Plus a hint line in the same vein if Gus drops a bagel from the air: "Land first, Gus. Critters don't look up." (a toast, at most once a phase), since a drop from more than 1.5 m up (`gusLow` false, crowds.js:308) spooks no one and gets no one's attention either.

**What happens when a bagel is dropped** (the `drop` bus event, which gains the item's `uid`, items.js:301; not on water, where the bagel sinks; not with `repair: true`):

1. **The bagel is live while it lies on the ground.** Every 0.5 s (game time) the shop module re-judges it, so an animal that wanders in, or finishes a scatter, notices it. Candidates are animals that are:
   - in a crew, out this phase, not `away`, and not mid-scatter;
   - within **9 m** in plan and 2 m up or down of the bagel (a scatter starts at WARY_R 2.6 m and runs 3–6 m further, crowds.js:46, 353–358, so a fled animal ends 5.6–8.6 m from Gus).

   **Eaters rank before refusers** (so a duck at the Lake never blocks the geese); then wary crews before friendly ones; then the nearest; ties go to the lower animal index. No random draws, so seeded crowd decisions repeat. Horses can't leave their harness, so they count only within 2.5 m to eat (further off they may only say "Closer, sugar"). Owls and hawks count within 8 m in 3D. Herons count only when no one else is near. Gus's own flock and the strays never count. **A refuser speaks once per bagel**, then the next judging moves on to eaters only.
2. **Excitement first:** about 1.5 s. The animal's existing `cheer` state (a hop or a little dance), its species sound (`dog-happy-bark`, `goose-honk`, `crow-caw`…) at t = 0, and its excited line as a bubble and in its crew voice at t ≈ 0.45 s.
3. **It eats or scampers.**
   - Most walk to the bagel at 1.2× their speed.
   - **Slow or still groups (speed ≤ 0.3: turtles, horses) don't walk:** the bagel tweens to the animal ("eats on the spot").
   - **The grab** is one moment: `G.items.remove` the item, set the hint state, and draw the bagel as a prop in the mouth. Gus can't snatch it after that, and a save in the middle is clean. If the item has gone before the grab (Gus picked it up), the treat ends.
   - Then it either eats it on the spot (2 s: the prop shrinks, crumbs puff, `bagel-munch` at one fixed per-crew rate in 0.9–1.1 so crews don't all sound the same), or scampers 4–6 m away from Gus (`#keepTarget`) and eats it there. If it can't reach the bagel (walled off), the treat ends and the bagel stays live for the next one.
4. **As it eats, the words.** If the crew's #24 hint is new: the hint (both `LEAD_HINTS` lines per crew are voiced, in its crew voice), `st.leadHints[crew] = 1` and the "…: marked on your map" toast, the same as #24. Then the tip. If the hint is known: the "Already heard" lead-in, then the tip.

**How it's built, so no existing behaviour changes:**
- A new `crowds.offerTreat(item)` puts one animal into a new `treat` state. **The treat branch is the first line of `#decide`** (crowds.js:334), ahead of the speed-0 `idle` forcing, the inactive → `away` rule and the cheer return. It ends the treat (and leaves the bagel, if not yet grabbed) when `!active(a)` (the phase ends mid-treat). A `treat` animal doesn't scatter until it's done.
- `#leadHintLine` gets a `force` option for the bribe path: no 1-in-3 rule, no 90 s wait. It still sets `hintAt`, so a passive hint doesn't repeat straight after. The passive #24 path is untouched, and its bubbles stay text only.
- Only bagel drops reach it, and no recorded solution carries a bagel, so no replay changes.

**Edge cases:**
- **Already friendly:** the excited thank-you instead of the hint and tip. It still eats the bagel.
- **No animal near:** the bagel stays live on the ground until a nap. Gus can pick it up and move it.

**Crowd voices:** each crew gets **its own small crew-member voice** from the ElevenLabs catalogue (`V` map in `.gamegen/candidates/audio/jobs.py`, as `crew-<crew>`), never the same voice ID as any boss, Manny, Mama Mask or the human cast, cast as a younger or smaller sibling of the boss's register. A mild species rate in code only where it helps (1.0–1.08; never the ×1.1–1.25 speed-up, which raises the pitch 2–4 semitones and still sounds like the boss). Briefs are in the table.

| Crew (group) | Crew voice | Reaction | Excited (wary) | Thank-you (friendly) | Already heard (lead-in) | Tip: what the boss wants |
|---|---|---|---|---|---|---|
| Squirrels | breathless and young | grab, scamper | "Is that… a BAGEL?! Dibs! DIBS!" | "A bagel! For ME? You're the best, Gus!" | "You know where Hazel is. Here's what you DON'T know:" | "Hazel lost her caches. Three of 'em, on Sheep Meadow. She can't find a THING." |
| Ducks | a nasal young sailor | **refuse; the bagel stays live; hint and tip anyway** | "BREAD? Do you KNOW what bread does to a duck?!" | "Still bread, Gus. Still NO. Thank you, sailor." | "Still no. But since you asked:" | "The Commodore's mad for peas. The picnickers south of the Boathouse have a tub." |
| Crows | a low, sly teen | grab, hop-fly 4 m | "A bagel. Not shiny. Still taking it." | "Noted in the book. Much obliged." | "Already paid you, pigeon. Here's interest:" | "Vesper trades in shinies. Bring her three and she'll talk business." |
| Raccoons (D/N) | a scrappy NY kid | grab, scamper | "Is that a JUMBO? From 110th? Ohhh, ya shouldn't have." | "Union thanks ya, boss. Mmf." | "I told ya where. Now here's what:" | "Rigby's lost his good wrench. The stagehands at the Delacorte got a whole box of 'em." |
| Rats | a fast-talking subway kid | drag it off (it's bigger than the rat) | "A WHOLE bagel?! That's a week of crust!" | "Ya spoil us, pal." | "Ya know where Sue is. Here's the inside track:" | "Sue wants a slice. HOT. The tourist by the $1 joint never finishes his." |
| Turtles | an old, slow voice (not the Eldest's) | eat on the spot (the bagel comes to them), slowly (6 s, `bagel-munch` at 0.85, 1.0, 1.1) | "A… bagel… for… me…? How… kind…" | "Thank… you… young… one…" | "We… told you… where… But…" | "Something's… under the water… by our rock… Look… down…" |
| Choir | an over-trained tenor | eat on the spot | "A BAGEL! Bravo! Bravissimo!" | "Grazie, Gus! Mi-mi-MMF!" | "You know the stage, darling. Now the plot:" | "The Maestro needs a CROWD. Flip the signs on their way to the Terrace!" |
| Racers | a peppy cadet | eat on the spot, fast | "Carbs! CARB-LOADING! Yes!" | "Fuel for lap four! Thanks, Gus!" | "You know where Coach is! Here's the play:" | "Coach respects a winner. Beat us round the Reservoir. Bet you can't!" |
| Meer Mob | a heavy goon | eat on the spot | "A bagel? For the Mob? …Respect." | "You're good people, kid." | "Ya know the place. Here's the etiquette:" | "Big Sal likes an entrance. Fly the arch at the Blockhouse. With STYLE." |
| Dogs (Biscuit's) | a goofy puppy | grab, a happy circle, eat | "BAGEL! BAGEL! Is it for ME? It's for ME!" | "Best friend! Best BAGEL!" | "You KNOW where! But GUESS WHAT:" | "Biscuit's BALL went in the LAKE! He's SO sad! The LAKE!" |
| Cats | a bored drawl | **sits on it** (`cat-meow` low; Pickles sleeps on bread), then it's gone | "A bagel. Warm. …I'm going to sit on it." | "Tribute accepted, sugar." | "You know where Queenie sits. Here's what she likes:" | "Queenie takes her slice with anchovies. From 72nd. Hot. Don't ask why." |
| Horses | a gentle country voice | eat on the spot within 2.5 m (the bagel comes to them); further off: "Closer, sugar. I'm in harness." and it stays live | "Now THAT'S a herbivore's breakfast, sugar." | "Why, thank you, little fella." | "You know where we stand, sugar. Here's our trouble:" | "Somebody's hogging our trough. Prickett. Move him and Clementine's all ears." |
| Songbirds | a chirpy little girl | 3 sparrows mob it on the spot | "BAGEL! Not a crumb! A WHOLE ONE!" | "Tweet-tweet! That's my thank-you sound." | "You know where Mimi is! But LISTEN:" | "Spikes on the museum ledge! Mimi can't even SIT! Get 'em off!" |
| Geese | a shouty one | eat on the spot, wings up | "HONK! BREAD! Finally, some RESPECT!" | "HONK. Thank you. HONK." | "HONK! YOU KNOW WHERE! HONK! BUT:" | "Gertrude wants a LAWN. A whole LAWN. Geese ONLY. HONK." |
| Owls (N) | a hooty young owl | **refuse; the bagel stays live; tip, no hint** (the owls' own close-approach hint from #24 still works) | "Who brings an OWL a bagel? Do your reading." (wary or friendly) | | | "The Professor can't see a THING without her spectacles. The Exchange oak sells everything." |
| Hawks | a sharp young hawk | **refuse; the bagel stays live; tip, no hint** | "I eat things that RUN, kid. Bagels don't." | | | "Rhoda's sore about her ledge on Fifth. Big Sal knows the story." |
| Herons (only when no one else is near) | none (bubble and `heron-croak`) | refuse; the bagel stays live | "Bread is not the way." | | | |
| Swells | a posh young voice | eat on the spot | (never wary) | "A plain bagel? How… rustic. Thank you, darling." | | |

The tips follow each den scheme's first real ask (den-squirrels 2, den-ducks 2, den-crows 2, den-raccoons 2, den-rats 2, den-turtles 2, den-choir 2, den-racers 2, den-meermob 1, den-biscuit 2, den-cats 2, den-horses 2, den-songbirds 2, den-geese 2, den-strix 1, den-rhoda 1). They live in `LEAD_HINTS[crew].tip` (data/lead-hints.js), so a change to a den scheme's text is one place to look.

Where a bagel makes no sense (owls and hawks eat meat; herons eat fish; ducks have the game's running joke about bread), the animal refuses. Nothing is lost: the bagel stays live for someone else.

---

## Assets (tools and cost; each change well inside $20)

| Asset | Tool | Est. |
|---|---|---|
| Fascia, blade sign, A-frame and neon lettering | code canvas (extended `signMaterial()`) | $0 |
| Optional, only if the black reads flat in shots: one **textless** "worn black enamel sign panel" tile under the canvas text (environment line) | nanogen | $0.06 |
| Shop back wall: "a flat, frontal back wall of a bagel shop interior seen straight on: wire bagel bins, a deck oven, a tiled wall in cream and black; flat even warm light, no perspective, no text" (environment line; refs `tex-facade-storefront.jpg` and the key art; frame and door are code) | nanogen flash 2K | $0.08 |
| Menu sheet first: 4 bagels from above at ¾ and 4 schmear tubs, each colour named (pale gold sesame; black poppy; white onion and garlic flecks for Everything; off-white, pale green with dark-green flecks, pink with red bits, pale green with red and green jalapeño chips), transparent, the style line and the gus-stand anchor as reference; cut to 128² WebP. "None" is drawn in code (a dashed ring); Row 0 reuses the Plain picture | imagegen2 medium ×2 | $0.16 |
| Bagel crust atlas (plain, sesame, poppy, everything; 2×2 seamless tiles, 1024), an edit **from the menu sheet**, checked on the torus at beak distance | nanogen | $0.16 |
| Manny's card: an edit of the chess-player concept with the white paper deli hat, a long white apron over the mustard cardigan and a dusting of flour, `vinnie.png` as the card-style reference → portrait by Pillow crop (`tools/portrait-crops.json`) | imagegen2 high | $0.10 |
| Scarf `scarf-everything-bagel.jpg`: a knitted motif scarf in the bread-print manner, **deep charcoal / poppy-black base** (no scarf has one) with intarsia golden bagel rings in rows and large (2–3 stitch) white sesame and black poppy dots round each; seamless tile, `scarf-bread-print.jpg` as stitch-scale reference; checked on Gus at flight distance next to bread-print | nanogen | $0.06 |
| Gus portrait `gus-everything-bagel.webp` (an edit of gus-scarf.png with the accepted tile as second reference, like the 9 others) | imagegen2 medium | $0.06 |
| SFX: `bell-ding` (a counter service bell), `bagel-munch` | audiogen sfx ×2 | $0.24 |
| Reused SFX, no cost: `trade-ka-ching` (pay), `griddle-sizzle` quiet (oven), `paper-rustle` (order up), the `whistle` synth as a kettle (steam), `scheme-step-chime` (scarf), `cat-meow` low (the cat sits), the species barks | | $0 |
| Voice #44: Manny about 12 lines (a **new** catalogue voice: an older, warm, dry New Yorker; not Vinnie's or Rigby's); Mama Mask about 17 clips incl. `mamamask-greeting` (a **new** voice: a warm, raspy kitchen mom) | audiogen TTS (eleven_v4) | $0.22 |
| Voice #45: about 96 lines in 17 **new crew-member voices** (`crew-<crew>` in the V map; catalogue browse is free, TTS is per character): 15 crews × (excited, thank-you, lead-in, tip, 2 lead hints), owls and hawks × (refusal, tip), the Swells' thank-you and the horses' "Closer" | audiogen TTS | $0.58 |
| Retakes allowance | | $1.50 |
| **Total** | | **≈ $3.2** (#44 ≈ $2.3 with $1.2 of the retakes, #45 ≈ $0.9 with $0.3) |

Code-built: the shop geometry, all lettering, the bell, the bagel props and schmear discs, the neon, the A-frame, the "None" menu picture, the bagel HUD icon, Manny's paper hat and long apron. No Meshy. New voice names must be added to audio.js's voice-folder regex (line 124), or a `voice:` prefix used: `manny-*`, `mamamask-*`, `bribe-<crew>-*`. Log every asset in ASSETS.md as before.

## What it could break, and the proof

**Risks:**
- **Replays:**
  - Manny is not in PEOPLE, so the humans' seeds can't shift.
  - The bribe only runs on a bagel drop, and no route carries a bagel.
  - The storefront adds no rng draws and no collision on any indexed route (0 of 41 in the new rect).
  - **takers.js changes for every give:** Mama Mask's union entry moves into the literal, and `entryFor` gains `when`. `affected-solutions --system item:slice` names part-talons.json, den-rats.json and den-meermob.alt.json. **Replay part-talons.json** (the one route that gives Mama Mask the union slice: the moved entry). den-rats and den-meermob.alt give slices to takers with no `when` entries, which behave exactly as before, so they aren't rerun.
- **Counts:**
  - Postcards go from 16 to 17 and scarves from 10 to 11. The hard-coded "16" and "10" become list lengths.
  - A save at 16/16 postcards drops to 16/17; the "New in the park" notice says why.
  - GAME_DESIGN needs updating: Postcards, Ledger's Stash, Food (bagels are a crumb spend; they sink and go at naps like slices), the shop under "NYC life", and #24's lead hints (the bribe tip).
- **Givers:**
  - takers.js: the union slice still works through Mama Mask (part-talons replay, and the sweep case below).
  - Bagels never pay union dues.
  - Eaters take bagels as well as slices; the nudge-giver rule stays as is.
- **Screens and art:**
  - the menu on a phone and on a pad, with the row/column navigation;
  - the canvas signs on the mirrored root;
  - one more skinned clone (Manny) for perf (well under the caps).
- **The postcard snapshot** must be taken while the bite is framed.

**Proof (one browser at a time):**
1. `check-schemes`: the new leaf scheme, its PLACES entry, the ITEM_SOURCES rule, the RENEWING list, nudges and answers.
2. **Debug work for the sweep and autopilot** (or the sweep fails at once: it adds a save/quit/Continue case for every scheme at its middle step, fixture `jumbo-order.s2`, mistakes.js:294–303, and `sweep-lib.goalsFor` throws without a goals entry, sweep-lib.js:16–22):
   - fixtures `jumbo-order.json` (after den-raccoons, at Dusk, 10 crumbs), `jumbo-order.s2` and `jumbo-order.s3` in `sf-fixtures.mjs`;
   - a `GOALS_PHOTO`-style entry `'jumbo-order'` (in goals-photo.js, which sweep-lib already imports), built from layout and character data;
   - a pilot step **`{ bagelOrder: [base, schmear] }`** (pilot-ssf.js): it reads the focused button's `data-row`/`data-col` and presses uiLeft/uiRight/uiDown to reach the wanted `data-id`, then uiOk, through the screen's own row/column navigation (not `menuPick`'s uiDown/uiUp, which go through the spatial `move()` and land differently at different sizes). A `{ bagelOrder: 'to-go' }` form picks Row 0.
3. **A recorded closed-loop solution `design/solutions/jumbo-order.json`** with that goal script: talk; fly to 110th; order Poppy + Jalapeño (wrong); give it (the rejection); give it to Socket; order Sesame + Jalapeño; give it; postcard and scarf. Record at 1280×720 and replay at 844×390 (proves the menu step is size-independent). Add its footprint to the route index.
4. **Replay part-talons.json.**
5. **Mistakes to add to the sweep** (the goal autopilot must still finish each one):
   - 0 crumbs: the free order, then the shortfall message, then a nap and free again;
   - the right bagel dropped in the Pool on step 3 (the keeper puts it back on the counter);
   - a nap with the order waiting on the counter (it's still there);
   - ordering the right bagel before the quest opens (step 2 completes by `auto` the moment the riddle ends);
   - step 1 while carrying a plain bagel (the talk still plays);
   - Jumbo step 1 with part-talons step 2 open (the riddle plays; the next peck gets the union line; a slice still sets `union.paid`);
   - two wrong orders in a row (Manny takes the old one back; the bell still opens the menu);
   - save, quit and Continue at each step (with the quest bagel carried on Continue: the repair drop draws no animal).
6. **Shots** at 1280×720, 844×390 and a pad (fake pad, focus ring), plus touch: the shop by day from the pavement and from over the North Woods (no chess-player clone in frame with Manny), the fascia and blade sign close up (lettering reads the right way round), the neon at Night, the A-frame, Manny, and the menu at each size with a selection made and with the step-2 riddle line. Then the scarf in the wardrobe, on Gus next to bread-print and in his HUD portrait; the Jumbo Order polaroid; the bagel HUD icon; the "New in the park" notice on an old save. Text scan; 0 console errors.
7. **#45, for each of the 16 crews:** a fixture with the crew not joined, Gus placed by its haunt (goTo), walking up (so the passive hint fires first), then a bagel dropped. Shots of the excitement, the eat or scamper, the tip bubble and the map with its region. A second drop for the lead-in + tip, and one with the crew joined for the thank-you. Plus: the refusals (ducks at the Lake with geese near: the geese get it; an owl; a heron alone; a horse out of reach), a drop with nobody near (the bagel stays; an animal that wanders in later takes it), a drop from the air (the "Land first" toast), Gus snatching the bagel back before the grab, and the quest bagel being ignored. Check the Duchess pointer after the first region mark. One scripted run in a single browser session; shots in `design/screenshots/bagels/`.

## Open questions I settled

- **Spot:** 110th, opposite the north gate, centred at x −64 under one building.
- **Who asks:** Mama Mask, not Rigby.
- **When:** after den-raccoons; the shop and plain bagels from New Game.
- **Lane:** the Slice Run.
- **Manny:** the chess-player model with a paper hat and a long apron, as his own clone. No new model; it saves about $0.90 and the replay risk.
- **The postcard pays no crumbs** (the issue's "no crumb pile").
- **Broke players** get one free order a phase.
- **Schmeared bagels bribe too;** the quest bagel never does.
- **Refusals:** ducks refuse but still tell (the bread joke); owls and hawks refuse but tip; herons just refuse; horses need it within reach. Refusers rank after eaters.
- **Voicing:** lead hints are voiced only in the bribe path, and passive #24 stays text ("nothing existing changes"). Crowd members get their own crew voices. Mama Mask and Manny get new voices.

## Owner decisions (recorded)

1. **Completionist:** the new postcard and scarf count (17 and 11), with the one-time "New in the park" notice for older saves. (The Favours row that can never fill today, collect.js:461, is being fixed separately under #43.)
2. **Lettering:** all of it is drawn in code; generated textures carry no text.
3. **Crowd voices:** their own small per-crew voices; a mild species rate only.
4. **Manny:** paper hat and long white apron, his own card and portrait.
5. **Bribes give something new** (the tip), and the game teaches bribes.

---

## Review round 1

Evidence: V = verified in code at HEAD 3eaffe5 (worktree), P = partly verified, N = not reproduced.

| Finding | Severity | Evidence | Outcome |
|---|---|---|---|
| Builder: TAKERS.mamamask exists at runtime; a static key kills the union slice | must-fix | V: spikes-feuds.js:45, crews.js (no key), takers.js:126–134 | Fixed: union entry moves into the crews.js literal with the bagel entry; runtime guard deleted; part-talons replay and sweep case added. |
| Builder: bagel keep entries block step 1's talk and step 3's give | must-fix | V: takers.js:108–122 (keep before `give`), characters.js:91 | Fixed: `entryFor` gains `when(G, id)`; `jumboAnswer` returns null on step 1 and for the right bagel on step 3; per-step answers spelled out; step-1-with-bagel sweep case. |
| Builder: the #23 re-arm only runs on Continue | should-fix | V: main.js:1688 | Fixed: step 2 gets an `auto` alt on the carried item. |
| Builder: bagels float back to the counter from water | should-fix | V: items.js:288–295 (only `d.slice` sinks) | Fixed: `food: true` treated like `slice` on water, Ruffled and naps; quest bagel via its keeper; waiting order tracked by `extra.counter`. (Player #9 too.) |
| Builder: a nap deletes the paid order on the counter | should-fix | V: items.js:441 | Fixed: `extra.counter` items skipped at naps; sweep case states the outcome. |
| Builder / Player #3: 6 m is inside the scatter distance | should-fix | V: crowds.js:46, 353–358 | Fixed: 9 m radius, and the bagel stays live (re-judged every 0.5 s, deterministic order), mid-scatter animals excluded; "Land first" toast for air drops (gusLow, crowds.js:308). |
| Builder: refusers block the bagel; turtles too slow; treat overwritten; snatch-back | should-fix | V: crowds.js:29–31 (speeds), 334–349 | Fixed: eaters rank before refusers, a refuser speaks once; speed ≤ 0.3 → the bagel tweens to them; treat branch first in `#decide`, ends on `!active(a)`; grab = remove + hint + prop; cancel if gone; `uid` on `drop`. |
| Builder: quest bagel only protected on step 3; repair drop emits `drop`; RENEWING is exact-match | should-fix | V: schemes.js (HEAD) 332–334, item-sources.js:30, check-schemes.mjs:260, mistakes.js:700 | Fixed: bribe ignores the right bagel while the quest is open and not done, and drops with `repair: true`; 19 ids listed explicitly in RENEWING. |
| Builder: proof misses sweep fixtures, goals, size-independent menu step; replays wrong route | should-fix | V: mistakes.js:294–303, sweep-lib.js:16–22, menu.js:66–90; `--system item:slice` → part-talons, den-rats, den-meermob.alt | Fixed: fixtures, GOALS_PHOTO entry, `bagelOrder` step over the screen's own row/column nav, record at one size and replay at another; part-talons replay (den-rats / den-meermob.alt not rerun: their entries have no `when`). P: `focusFirst` honours `preferredFocus` even in replays (menu.js:62–64), so the "first bagel" focus already works; the spatial-press point stands. |
| Builder / Art: lettering inside generated images; 2048×256 can't be generated | should-fix / must-fix | V: city.js:466–483; art's imagegen2 ratio rule (not rerun: no generator call in this pass) | Fixed: all lettering in code (Fredoka 700 raised, chalk Nunito, mirror flip); optional textless panel only. |
| Builder nice: shop straddles the party wall at −68 | nice | Builder's lot replay (not rerun; the layout is fixed by `rngFor('city')`) | Fixed: centre x −64 (−67.2…−60.8), A-frame to −59.5, PLACES and Manny moved; new rect 0 of 41 (rerun). |
| Builder nice: owner question's false premise (Favours `of: 50`) | nice | V: collect.js:461 | Fixed: question replaced by the recorded decision; Favours left to #43 as the coordinator said. |
| Builder nice: `award(id)` takes no options | nice | V: collect.js:261–266 | Fixed: signature change stated. |
| Builder nice: eaters gate on `isSlice`; Socket is a nudge giver | nice | V: takers.js:12, 59, 63–71, 87 | Fixed: `isFood` in both eater paths; steps 2–3 nudges moved to Ringo so Socket can eat (rather than bypassing the nudge-giver rule, which protects nudges). |
| Builder nice: bell priority vs item | nice | V: interact.js:46–52 | Fixed: bell priority 2. |
| Builder nice: Manny's counter-mirror; fly through the window | nice | say-cheese.js:84 (not opened; builder's citation) | Fixed: `holder.scale.x = -1` and an invisible collider pane. |
| Builder nice: crumbs spent before the 1.5 s pause | nice | design-level | Fixed: item spawned hidden at Order time. |
| Builder nice / Art: chess-player is also on 110th | nice / should-fix | V: people.js:21–23 (`city`, `sitters`, `guests` pools) | Fixed: false claim removed; paper hat (humans.js:1219) + new long apron; card prompt matches; shot check. |
| Builder nice: build in its own module | nice | city.js:102–110 (builder's citation) | Fixed: `world/bagel-shop.js` after the world build. |
| Builder nice: whole-game.json not in the index | nice | builder's claim | Fixed: noted under "No recorded solution crosses it". |
| Builder nice: new state in flags / items only | nice | gamestate.js:20–53 (builder's citation) | Fixed: all new state is flags, `phaseUsed` and item `extra`. |
| Builder nice: #42 compass on step 3; step 2 target is the bell | nice | — | Not changed: already as written. |
| Player #1: the bribe's hint has almost always fired already | should-fix | V: crowds.js:483–497 (n = 1 fires) | Fixed: every bribe gives a per-crew **tip** (what the boss wants, from the den scheme), hint first if new; "Already heard" rewritten as a lead-in. The "when" part is already in every LEAD_HINTS line, so the tip is the "what". |
| Player #2: nothing teaches bribes | should-fix | design | Fixed: Row 0 sub-line, Manny's first-plain line, A-frame line, map dot from New Game, the Duchess pointer after the first region mark. |
| Player #4: old bagels on the counter beat the bell | should-fix | V: interact.js:48 (items ≥ 5 win) | Fixed: Manny takes carried bagels back at the counter (bell, Manny, and when picking up an order), except the quest bagel. |
| Player #5: pecking Manny must open the menu | should-fix | V: characters.js:47–48 skips `role: 'human'` | Fixed: the shop module registers "Talk to Manny" = the bell. |
| Player #6: riddle talk vs the Rink Job's union talk | should-fix | V: part-talons.js:91–93 | Fixed: order stated (riddle wins via `dialogue.open`); card says "or wherever the raccoons are"; sweep case. |
| Player #7: free order spent on a wrong guess | nice | — | Fixed: "Make it a good one, pal." and the riddle on the menu during step 2. |
| Player #8: Row 0 duplicates Plain + None | nice | — | Fixed: kept as a shortcut with its "For making friends" sub-line. |
| Player #9: bagel in the Lake floats to 110th | nice | V: items.js:288 | Fixed: bagels sink (see the water row). |
| Player #10: make one description oblique | nice | — | Fixed: Jalapeño's sub-line is "green, with a kick". |
| Player: Completionist count or bonus | — | collect.js `completion()` is live | Fixed: count, plus the one-time "New in the park" notice and "New!" on the rows (owner's call). |
| Art: crowd animals in the boss's voice sped up | should-fix | V: audio.js:347 (`playbackRate`) | Fixed: 17 crew-member voices (briefs in the table), mild species rate 1.0–1.08 only. |
| Art: the bagel isn't made once; "None" and HUD icon missing | should-fix | V: icons.js:70–71 | Fixed: menu sheet first, atlas edited from it, disc colours sampled from it, "None" in code, `bagel` SVG. |
| Art: Everything scarf too close to existing warm scarves | should-fix | art's tile comparison (not reopened) | Fixed: charcoal base with intarsia bagel rings and large seed dots; check next to bread-print. |
| Art: shop back wall as a rendered imagegen2 picture | should-fix | GAME_DESIGN environment line | Fixed: nanogen, environment line, textless, frame and door left to code. |
| Art: Mama Mask voiced only here | nice | V: audio.js:124 regex | Fixed: `mamamask-greeting` on her talk. |
| Art: moments with no sound | nice | — | Fixed: reused SFX mapped; bark at t 0, line at t 0.45 s; per-crew munch rate. |
| Art: portrait crop, postcard light, proof shots | nice | collect.js:260–278 | Fixed: Pillow crop, a lantern key light in the payoff, polaroid in the shots. |

No must-fix is left open.
