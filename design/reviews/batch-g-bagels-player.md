# Player review: Super Jumbo Bagels (#44) and bagels as bribes (#45)

Reviewer: Player. Design: `design/changes/batch-g-bagels.md`. Code-only read, no browser.

Overall: the Jumbo Order is a good small quest. The riddle can be solved from what is on screen, every wrong guess says which half is wrong, it costs very little and nothing can be lost. The shop is a nice landmark, with a perch on top. The weak part is #45. As designed, most players will get no hint from a bribe, and none of them will know bribes exist. Findings, most important first.

---

### 1. A bribe almost never gives a new hint: the free hint has already fired
Severity: should-fix
Who meets it: most (everyone who tries #45). How bad: misleads (the feature looks pointless). Fix: medium
What's wrong: The design treats the bribe as the way to get a crew's #24 lead hint. But in `crowds.js` the passive hint fires on the **first** scatter of any wary animal of a crew: in `#leadHintLine`, `n % 3 !== 1` is false when n = 1 and `last` is null. To drop a bagel near a squirrel, Gus has to walk up to squirrels. That scatters one, and the region is marked before the bagel touches the ground. The crews that never flee (horses, owls, hawks) give it away in their first bark. So in normal play the bribe nearly always ends in the "Already heard" line. The table even has a whole column for it. The excitement, the munch and the voice are good, but the reward is a line the player has already read.
Why it matters: #45 is the issue's headline ("tells you where its leader is"). A player who buys a bagel, flies it across the park and drops it, only to hear "I TOLD you!", learns that bagels are a joke and stops buying them. Crumbs still have nothing to buy.
Suggestion: give the bribe something the passive path never gives, and keep the owner's #24 rule ("soft guidance, never a pin"). Best option: a **bribe tip** per crew, a second line about **what the boss wants** or how to win them over, taken from step 1 of the crew's den scheme. Examples: "Hazel's in a state. Somebody's been in her books." "Big Sal only respects a crowd. Bring thirty." "The Professor can't see a thing without her specs." It plays when the hint is already known, and after the hint when it isn't. It is clever, it rewards the bribe every time, and it is still not a pin. That's 16 lines, about $0.10 of TTS. Lighter option: the bribed animal also says **when** the boss is out, and the map region shrinks to half its radius. Either way, rewrite the "Already heard" column to lead into the tip rather than end on a rebuff.
Evidence: `game/src/entities/crowds.js` lines 353–360 (a scatter calls `#leadHint`) and 483–497 (`n % 3 !== 1`, first call n = 1 → hint).

### 2. Nothing tells the player that bagels are bribes
Severity: should-fix
Who meets it: most. How bad: the whole of #45 goes unseen. Fix: small
What's wrong: the design has no teaching moment for #45. The menu's Row 0 is "Plain bagel to go: 2 crumbs" with no sub-line about animals. Manny's plain line is "One plain. A classic. Like me." No nudge, Elder, card or sign mentions dropping a bagel. Dropping an item near an animal to see what happens is not something a player tries on their own. The shop is also on the far north edge (Gus starts at the Pond, about 2 km south), its map dot only shows "once seen", and the design says "#45 matters most early".
Why it matters: an unseen feature is wasted voice work (75 lines) and wasted fun.
Suggestion (all cheap):
- Give Row 0 a sub-line: "Critters go nuts for these. Drop one near some."
- Give Manny a line the first time someone buys a plain bagel: "Word of advice, pal: drop that near a squirrel and watch it sing."
- Put a line on the A-frame: "SQUIRRELS TALK FOR PLAIN" (in the generated art, or as a code decal).
- Show the shop's map dot from New Game (it's a 24-hour landmark, like the carts).
- Add one Act 1 pointer, e.g. a Swell or Dolores: "Want a squirrel to talk? Super Jumbo on 110th. Works every time."
Evidence: design §#45, the Row 0 spec and Manny's lines; there is no teaching text anywhere in the design.

### 3. "Judged once where it lands" misses the animals that just fled
Severity: should-fix
Who meets it: some (anyone who walks up and drops). How bad: misleads (the bagel sits there and nothing happens). Fix: small
What's wrong: the design says "A wary animal scatters only 3–6 m from a low Gus, so it stays within range." In the code, an animal scatters at `WARY_R = 2.6` m and runs 3–6 m **further away**, so it ends up 5.6–8.6 m from Gus. The bagel lands 0.25 m in front of him. The animal Gus was walking towards often ends up outside the 6 m circle, and the drop is judged once. To try again the player has to land, pick the bagel up (which scatters them again) and drop it again.
Suggestion: keep a dropped bagel "live" as a lure. Re-judge it every 0.5 s (deterministic: lowest animal index first) for as long as it lies on the ground, so the first eligible animal that wanders within 6 m (or 9 m) notices it. Animals that are scattering should count once their scatter ends. It still runs only when a bagel is on the ground, so replays don't change. It also makes "the bagel stays, not wasted" true without the pick-up-and-retry routine.
Evidence: `game/src/entities/crowds.js` line 46 (`WARY_R = 2.6`) and 353–358 (`run = 3 + rnd*3` from the animal's own position); `systems/items.js` `drop()` (0.25 m in front).

### 4. Pecking at the counter grabs the wrong bagel you just put down
Severity: should-fix
Who meets it: some (anyone who orders wrong twice). How bad: looks broken (Peck takes the old bagel instead of ringing the bell). Fix: small
What's wrong: taking a new order while Gus holds a bagel swaps them (`pickUp` → `drop()`), so the wrong bagel lands on the counter or pavement right by the bell. The design relies on "an item within reach beats the bell". After two wrong guesses there are bagels lying in reach of the bell. The next Peck picks one up again instead of ringing. The player sees Gus juggling bagels at the window and can't open the menu.
Suggestion: Manny takes bagels back. Add a `TAKERS.manny` / bell rule: Peck the bell while holding a bagel and Manny says "I'll toss that one to the pigeons out back. No refunds, pal." He takes it, then the menu opens. Also, a bagel lying on the counter that isn't the waiting order should not beat the bell. Alternatively, the ground-item priority applies only to the counter's order slot.
Evidence: `game/src/systems/items.js` `pickUp` (swap drops the held item first); design "Peck it to take it (an item within reach beats the bell, a1d8ca5)".

### 5. Pecking Manny himself must open the menu
Severity: should-fix
Who meets it: most visitors. How bad: misleads (the obvious target does nothing useful). Fix: small
What's wrong: Manny gets a CHARACTERS entry, a portrait and a name, so he will show up as a Peck/Talk target. The design says what the bell does, but not what pecking Manny does. Players peck the man behind the counter before they spot a bell 14 cm wide.
Suggestion: make Peck on Manny the same as the bell: his greeting, then the menu. While an order waits, he says "Your order's right there, pal." Then the bell becomes a bonus (the ding).
Evidence: design "Name and portrait: a CHARACTERS entry `manny`", with no talk behaviour specified.

### 6. The riddle talk clashes with the Rink Job's union-slice talk
Severity: should-fix
Who meets it: some (players with part-talons step 2 open at the same time, which is likely: both open after den-raccoons). How bad: could break step 1 (the riddle never shows) or show two scripts. Fix: small
What's wrong: `part-talons.js` hooks `talk` on `mamamask` during step 2: `G.later(0, …)` says "One slice. Union rules." unless a dialogue is already open. Jumbo step 1 is also a talk on Mama Mask. The design doesn't say which wins. During that step she can also be at the rink (Called with the raccoons), while the Jumbo card says "the Loch's bank".
Suggestion: state the order. The Jumbo riddle plays first (as its own talk step), and the union line plays on the next peck. Make the cards say "Mama Mask (by the Loch, or wherever the raccoons are)". The `{ who }` compass target already follows her. Add "Jumbo step 1 with part-talons step 2 open" to the mistakes sweep.
Evidence: `game/src/schemes/part-talons.js` lines 79–93.

### 7. The free order should not be spent on a wrong guess without a warning
Severity: nice
Who meets it: few (players who are broke). How bad: a little off. Fix: small
What's wrong: a broke player who spends the once-a-phase free order on a wrong combination has to nap or flip signs. That isn't a dead end, but it stings.
Suggestion: when the free order is taken, Manny adds "Make it a good one, pal." The menu could also show the riddle from the card under the header ("Mama Mask wants: little seeds, like sand…") while the quest is open. That doubles as the clever bit's reminder.

### 8. The plain bagel bought in the to-go row is identical to Plain + None
Severity: nice
Who meets it: some. How bad: a little off. Fix: small
Suggestion: fine to keep, since it's a one-press shortcut. Give it a different sub-line ("for making friends") so it reads as the bribe and not as a duplicate.

### 9. A plain bagel dropped in the Lake "floats back to where you found it" (110th Street)
Severity: nice
Who meets it: few (a bribe attempt near the ducks dropped on the water). How bad: a little off. Fix: small
Suggestion: bagels follow the slice rule and sink ("It sank. Manny's got more."). The quest bagel still uses its ITEM_SOURCES keeper.
Evidence: `systems/items.js` `drop()` water branch (only `d.slice` sinks; everything else goes to `homeFor`).

### 10. The riddle could be a notch more clever without getting harder
Severity: nice
Who meets it: most. How bad: a little off (it's solvable by reading the menu's sub-lines). Fix: small
Suggestion: keep the descriptions but make one of them oblique, so the player matches colours rather than words. Jalapeño's sub-line could be "green, with a kick" (not "HOT"), so "green fire" takes a moment's thought against Scallion's "green and oniony". The per-half rejections still guarantee two or three tries at most.

---

## Completionist: count or bonus?

**Count them, and say so on old saves.** Reasons:
- Completionist is computed live (`collect.js` `completion()`), not stamped. Any save that reached 100% has finished the finale, so it has `den-raccoons` and the Jumbo Order is open. Getting back to 100% is a five-minute, fun quest, which is exactly what the post-credits free roam is for.
- Bonus items outside the list would be the only postcard and scarf that don't count. That's confusing on the Board ("17 postcards… of 16?") and goes against the design's own rule that scarves "count toward Completionist".
- What makes the drop to 16/17 feel like lost progress is the silence. Fix that with a one-time notice when an older save loads (or when the Board opens): "New in the park: Super Jumbo Bagels on 110th. A new postcard and scarf to find." Mark the Postcards and Scarves rows with "New!" until they're full again. The `{ who: 'mamamask' }` card is already on the Board.

So: the default (count) is right, with that notice added as part of the change.
