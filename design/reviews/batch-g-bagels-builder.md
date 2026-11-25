# Builder (devil's advocate) review: batch-g-bagels.md (#44, #45), 2026-11-25

Checked against `game/src` at HEAD 3eaffe5. Other helpers' uncommitted edits (the #42 compass work in systems/schemes.js,
slices.js, guide.js) are not counted, apart from one note where #42 touches the same code. Code only: no browser.

Claims I checked and found **true**: the coordinates (FACE.north 1070.6, pavement z 1066.6–1070.6, gate X(0.2) = −66 w 8,
Mama Mask 145 m away); `affected-solutions --rect -76,1062,-56,1080` → 0 of 41, and the wide box → den-meermob, .alt and
den-rhoda only; storefronts are built after the city loop with no `rnd` (city.js:102, 485–520); signMaterial's mirror flip
(city.js:481); the audio voice regex (audio.js:124); `phaseUsed` is cleared on naps (clues.js:880); the leaf-scheme rule in
check-schemes (check-schemes.mjs:274–282); PEOPLE seeds by list position (humans.js:151, 163); Say Cheese's own-clone pattern
(say-cheese.js:13–14, 57–100).

I also replayed the city's `rngFor('city')` lot loop in node (it copies city.js:69–100 and building()'s draws exactly). The
north side near the shop comes out as: lots −85.5…−68 (brick, h 17.5, fire escape at mid −76.75) and −68…−42.67 (brick,
h 24.5, fire escape at mid −55.33). So **neither end of the blade sign meets a fire escape**. But the shop (−69.5…−62.5)
**straddles the party wall at x −68** between a 17.5 m and a 24.5 m building (see the nice list).

---

### TAKERS.mamamask already exists, so a static entry would quietly break the union slice
Severity: must-fix
Who meets it: some (every part-talons player who pecks Mama Mask with the slice, as the answer tells them). How bad: breaks. Fix: small
What's wrong: The design says "add bagels to takers.js" and talks about `TAKERS.mamamask` as if it were new ("TAKERS.mamamask keeps it"). But Mama Mask's union-slice entry is created at runtime: `if (!TAKERS.mamamask) TAKERS.mamamask = [{ wants: 'slice', any: true, flags: ['union.paid'], … }]`. If the builder adds a `mamamask:` key to the TAKERS literal in crews.js, that guard never runs. A slice given to Mama Mask then falls through to `eaterGive`, so she *eats* it and `union.paid` is never set. Meanwhile the part-talons step-2 answer says "Peck Rigby or Mama Mask with any slice".
Why it matters: The Rink Job's union payment silently stops working through Mama Mask, and the player loses the slice.
Suggestion: Put the union entry into the crews.js literal (`mamamask: [{ wants: 'slice', any: true, flags: ['union.paid'], line: … }, …bagel entries]`) and delete the runtime guard, or push the bagel entries in the same install that makes it. Test: give Mama Mask a slice on part-talons step 2 → `union.paid`.
Evidence: game/src/schemes/spikes-feuds.js:45–46; data/crews.js:310–324 (no mamamask key); data/schemes.js:242 (the answer text); systems/takers.js:126–134 (no entry → eaterGive → eat).

### Bagel "keep" entries would block step 1's talk and step 3's give: TAKERS can't express this rule
Severity: must-fix
Who meets it: some (anyone who brings any bagel to Mama Mask on step 1, including the plain bribe bagels #45 has players carrying from New Game). How bad: looks stuck. Fix: small–medium
What's wrong: `Takers.give()` returns the `keep` line *before* it emits `give` (takers.js:121). Characters route every Peck to `takers.give` whenever `labelFor` is non-null (characters.js:91). TAKERS entries can only be gated by `phase` (takers.js:94–101). So:
(a) On step 1 ("talk to Mama Mask"), carrying any bagel turns the prompt into "Offer the bagel". Pecking gives a rejection ("Where are the SEEDS?"), or "Hold that thought" for the right bagel, and the talk never fires. The player has to think of dropping the bagel. They hear rejections for a riddle they haven't been told yet.
(b) Step 3 has the same problem. If the right bagel matches a keep entry, the give event never fires. If it doesn't, the "Hold that thought" line can't exist.
Why it matters: The quest's first step stalls for players who carry bagels, and the card says "Talk to Mama Mask" while the prompt says "Offer".
Suggestion: Don't do this through static `keep` strings. Add a `when(G)` predicate (or `keep` as a function of the carried id) to `entryFor`, and have a jumbo-order install supply it:
- step 1, or a bagel shown before the quest opens: no bagel entry, so the talk wins. If the talk ends with Gus carrying the right bagel, complete step 2 at once (see the next finding).
- step 2, or step 3 with a wrong bagel: the computed rejection (prefix + reason).
- step 3 with the right bagel: no entry, so `#stepWants` fires the give.
Add the step-1-with-bagel case to the mistake list.
Evidence: systems/takers.js:94–101, 108–116, 118–122; entities/characters.js:89–91.

### "The #23 re-arm already puts a carried pickup-step item at his feet" is only true on Continue
Severity: should-fix
Who meets it: few–some (ordered the right bagel before step 2: the out-of-order case the design lists as handled). How bad: looks stuck until you re-order. Fix: small
What's wrong: That re-arm is `repairSpent`, which runs only in continueGame (main.js:1688). Live, a carried item never re-fires a pickup step. Step 2 also needs `place: 'bagel-110'`, so picking the right bagel up again anywhere else (by the Loch, say) doesn't count either (schemes.js `onEvent` checks needs other than the item). A player holding the right bagel when step 2 opens gets "Hold that thought" from Mama Mask and no progress.
Why it matters: The design's out-of-order path doesn't work as described, and the sweep case "ordering before the quest opens" will fail.
Suggestion: Give step 2 an alternative `{ needs: { item: 'bagel-sesame-jalapeno' }, on: { type: 'auto' } }` with no place. `#poll` completes `auto` steps from needs, and needs.item is "carried". Keep the pickup option for the normal path.
Evidence: main.js:1688; systems/schemes.js (HEAD) 285–336 (repairSpent pickup case), 168–198 (`onEvent` / `#poll` 'auto').

### Bagels dropped in water float back to the counter, not "lost as now"
Severity: should-fix
Who meets it: some (#45 has players dropping bagels by the Lake for ducks and geese). How bad: looks broken (a bagel teleports 700 m) and can jam the counter. Fix: small
What's wrong: The design says a drop is skipped "not in water, where items are lost as now". In fact only slices sink. Any other light item floats back to `homeFor(c)`: the keeper spot, else its origin. A bagel's origin is the counter, where it was spawned. Ruffled does the same. Floated-back bagels then pile up on the counter. If "one order waits at a time" is judged by "a bagel lies on the counter", a floated-back wrong bagel blocks new orders.
Suggestion: Add a `food: true` (or `sinks`) flag to the bagel ITEM_DEFS and use it wherever `d.slice` decides "gone": drop over water (items.js:288) and Ruffled (items.js:458). The quest bagel then comes back through its keeper rule, which already handles "nowhere". Track the waiting order by uid in a flag, not by what's on the counter.
Evidence: game/src/systems/items.js:278–297, 452–463.

### A nap deletes the paid-for order waiting on the counter
Severity: should-fix
Who meets it: some (order, wander off, nap to Dusk for Mama Mask: the natural sequence). How bad: lost crumbs and a lost step-2 item, with a "the rats took it" toast. Fix: small
What's wrong: "Bagels on the ground go at a nap, like slices" will be built by extending `onNap`'s `def.slice` filter, and that also catches the order still on the counter (it was never carried). ITEM_SOURCES covers only step 3, so a right bagel ordered on step 2 and not yet picked up is simply gone. The design's own mistake case, "a nap with the order waiting on the counter", has no stated outcome.
Suggestion: Mark the counter order (`extra: { counter: true }`) and skip it in onNap. It's indoors, and Manny's "I ALWAYS make two" fits. Or put the keeper rule on steps [2, 3] with the flag set at order time.
Evidence: systems/items.js:434–449; data/item-sources.js (the keeper only covers the listed steps).

### #45 "who notices": 6 m is smaller than where the scatter leaves them
Severity: should-fix
Who meets it: most bribe attempts made on foot. How bad: looks broken ("nobody wants it"). Fix: small
What's wrong: "A wary animal scatters only 3–6 m from a low Gus, so it stays within range" is not what the code does. A scatter starts when Gus is within WARY_R 2.6 m and runs 3–6 m *further*, along the line away from Gus. Fleeing animals end up 5.6–8.6 m from Gus, and the bagel lands 0.25 m in front of him. Small haunts (4 cats on the pavement, 3 songbirds) will often have nobody within 6 m. "Pick it up and drop it nearer" just scatters them again.
Suggestion: Use a 9–10 m radius in plan (keep the 2 m height band). Also note in the design that dropping from flight (more than 1.5 m up, so `gusLow` is false) scares nobody, and say so in a hint line.
Evidence: entities/crowds.js:52 (WARY_R 2.6), 353–358 (`run = 3 + rnd*3` added to the current distance), 305 (gusLow); items.js:281 (0.25 m in front).

### #45 refusers and slow or still animals: the bagel sits unclaimed, and the treat state gets overwritten
Severity: should-fix
Who meets it: some (anyone bribing geese at Bow Bridge, since ducks are nearly always nearest; anyone bribing turtles). How bad: looks broken. Fix: small–medium
What's wrong:
(1) Nearest-wins plus "judged once" means a duck (or an owl, hawk or heron) that refuses leaves the bagel for nobody. At the Lake, ducks shadow the geese, so the goose hint is almost never reachable by bribe.
(2) Turtles have speed 0.15 m/s. At 1.2× that, 6 m is a 33 s walk before the 6 s eat.
(3) For speed-0 groups (horses, owls, hawks), `#decide` forces `a.state = 'idle'` every decision. An inactive animal is set to 'away'. A cheer return also short-circuits. So the treat branch has to come first, and it must say what happens when the phase ends mid-treat.
(4) Nothing handles Gus picking the bagel back up while an animal is walking to it.
Suggestion:
- A refusal hands the bagel on: after the refusal line, the next eligible eater within the radius tries. Or refusers rank after every eater.
- For groups with speed ≤ 0.3 (turtles, horses), the bagel tweens to the animal (it "eats on the spot").
- Specify the treat branch as the first line of `#decide`, ending the treat if `!active(a)`.
- At the grab, remove the item (`G.items.remove`), set `st.leadHints`, and draw the bagel as a prop. One moment then covers the save and Gus can't snatch it. If the item is gone before the grab, cancel.
- Add `uid` to the `drop` event (items.js:301) so the handler gets the right item. It changes nothing for replays.
Evidence: entities/crowds.js:29, 31 (turtles 0.15, horses 0), 334–349, 385–394; items.js:299–301.

### The quest bagel is protected only on step 3, and Continue drops it with a `drop` event
Severity: should-fix
Who meets it: few. How bad: the quest item gets eaten, so you re-order. Fix: small
What's wrong: `repairSpent` puts a carried pickup-step item down with `G.items.drop()`, which emits `drop`. That is the event #45 listens on, so on a Continue a nearby (friendly) raccoon can eat the right bagel. The right bagel is also eatable before step 3 (the out-of-order path). Separately, "add `bagel*` to RENEWING" won't work: RENEWING is matched with exact `includes()`. If the quest bagel were listed, check-schemes 5c would stop asking for its keeper rule.
Suggestion: The bribe ignores the right bagel whenever jumbo-order is open and not done, and it ignores drops made during load or repair (pass `{ repair: true }` in the event). List the 19 non-quest bagel ids explicitly in RENEWING (or add a prefix test in all three readers) and leave `bagel-sesame-jalapeno` to its keeper rule.
Evidence: systems/schemes.js (HEAD) 332–334; data/item-sources.js:30; tools/check-schemes.mjs:255–260; debug/mistakes.js:700.

### The proof plan is missing the sweep and autopilot work, and replays the wrong route
Severity: should-fix
Who meets it: the build (the sweep would fail at once). How bad: proof can't run. Fix: medium
What's wrong:
- The mistake sweep adds a save/quit/Continue case for **every** scheme automatically, at its middle step, using fixture `jumbo-order.s2`. Recovery uses `sweep-lib.goalsFor(id)`, which only looks in the five goal files it imports and throws "no goals for jumbo-order" otherwise.
- The design lists sweep mistakes but none of the debug work: fixtures `jumbo-order.json`, `.s2` and `.s3`; a GOALS entry; and an autopilot way to order from the menu. Raw `uiRight`/`uiDown` presses are spatial (getBoundingClientRect), so a recording made at one window size navigates differently at another. During a replay or pilot, `focusFirst` takes `f[0]`, which is the "Plain bagel to go" row, not the first bagel the design wants.
- On replays: the change rewrites takers.js and TAKERS.mamamask. `affected-solutions --system item:slice` names part-talons.json, the one route that gives the union slice. Replay that one, not den-meermob: nothing at its tiles changes.
Suggestion:
- Add to the proof: a GOALS_PHOTO-style entry `'jumbo-order'`; fixtures for each step (sf-fixtures.mjs); a pilot goal `{ bagelOrder: ['sesame', 'jalapeno'] }` that presses through a fixed focus order (the screen's `preferredFocus` plus the auto-advance, not spatial search).
- Replay part-talons.json (and den-meermob only if collision is added near it).
- Keep the closed-loop record as the solvability proof, as planned.
Evidence: debug/mistakes.js:294–303; debug/sweep-lib.js:16–22; ui/menu.js:56–64, 66–90; `node game/tools/affected-solutions.mjs --system item:slice` → part-talons.json.

### Lettering inside generated images (fascia, blade sign, A-frame)
Severity: should-fix
Who meets it: most visitors to the shop. How bad: looks broken if a word comes out misspelt. Fix: small
What's wrong: The asset list asks imagegen2 for "SUPER JUMBO BAGELS" twice (once stacked) and for "SPECIALS … PIGEONS WELCOME (FOR ONCE)" in chalk. Long phrases in generated pictures often come out garbled, and a retake loop is costly. The game already draws its sign lettering in code (`signMaterial`, a canvas), and that path already has the mirror flip worked out.
Suggestion: Generate only the textures with no text: black fascia grain, blade-sign enamel, a chalkboard with bagel doodles. Draw the lettering on a canvas over them, in a raised-letter style (a bevel shadow) and a chalk font for the A-frame. Keep the generated look and cut the retakes.
Evidence: world/city.js:466–483; review-roles.md "Assets" (text inside images).

---

## Nice (below the bar, one line each)

- **The shop straddles a party wall at x −68** (the lot replay above: a 17.5 m building and a 24.5 m one). Centre it at x ≈ −64 (−67.2…−60.8, inside the gate's −70…−62 span) so the walk-up sits under one building.
- **The owner question has a false premise.** No save can be at 100% today: the Favours row is `of: 50` and `st.favours` is never added to (collect.js:461; dialogue-sf.js:5–6 "not built yet"). The question can be dropped or reworded.
- `G.collect.award(id)` takes no options and always pays +10 (collect.js:261–266). The 0-crumb award needs that signature change, so say so.
- **Eaters:** `eaterGive` and `#eaterHuman` gate on `isSlice`, not `fits` (takers.js:43, 70), so "add to fits" isn't enough. `#wantsTalk` also counts nudge givers: Socket gives step 1's and 3's nudges and Ringo step 2's. So "Give that one to Socket" gets "Not for me, Gus" on step 3. Let bagels skip the nudge-giver rule.
- Give the bell a priority below the item's 5. a1d8ca5 only makes pick-ups beat a character's Ask or Talk; the bell and the item compete on score alone (interact.js:47–52).
- **Manny's clone** needs the `holder.scale.x = -1` counter-mirror, as in say-cheese.js:84. The open window (1.05–2.4 m) lets Gus fly into the 1.4 m box and through Manny: add an invisible collider pane above the counter.
- **Mid-order crumbs:** crumbs are spent before a 1.5 s pause. A pagehide autosave in that window loses the order. Spawn the item (hidden) at Order time.
- "The only reused man who isn't on 110th" isn't true: `MIX.city` includes human-chess-player, and two street parkgoers wander 110th at x 10–70 (people.js:21, 97). It's harmless at 120 m away.
- Build the walk-up, blade sign and A-frame in the shop's own module after the world build, not inside `storefront()`. Then the collision arrays built later keep their order (summit-cps and the landmarks come after storefronts, city.js:102–110).
- `whole-game.json` isn't in the route index (only its legs are), so "0 of 41" says nothing about it.
- Keep all new saved state in flags, `phaseUsed` and items (the waiting order's uid, `bagel.free`, the first ring). freshState has no slot for new top-level keys, so old saves load untouched (state/gamestate.js:20–53).
- #42 (in progress) points the compass at the keeper spot on step 3 by itself. Step 2's `target.at` should be the bell, as written.
