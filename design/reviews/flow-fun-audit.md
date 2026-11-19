# Flow and fun audit: Central Park Pigeon (2026-11-18)

Analysis and proposals only: no game files were changed and no browser was run. The audit reads `design/GAME_DESIGN.md`, `game/src/data/schemes.js`, `dialogue*.js`, `crews.js`, `people.js`, `game/src/schemes/*.js`, `systems/schemes.js`, `ui/board.js`, `tools/check-schemes.mjs` (it passes today: 32 schemes, 87 steps, 4 open after the Prologue) and both Phase 7 playtester reviews.

**Baseline.** A Fixes-3 "R3" attempt was in the tree earlier today. It made the ducks' step a sign lure and the anchovy step a "lead Pickles to the bench" stalk. At 16:41 it was rolled back to the Fixes-2 state. This audit is against the rolled-back code (ducks: flip M7 and swarm; cats: swarm). Section 5 says which R3 ideas to keep and which to drop.

---

## 0. Executive summary (for approval)

1. **The first hour is one trick in four costumes.** Hold Coo to mob a human is *the* answer for Sue, the ducks' peas, Queenie's anchovy, the sunglasses photobomb and the Tavern cufflink: 5 of the first ~9 schemes. Calling the ducks to bubble rings is the answer 5 times in Act 1.
2. **The Board gives the answers away.** Each card's tag row names the ally the step needs ("Cats", "Songbirds · Spikes") and shows "Flock 6" on every swarm step. The design says that working out *who* fits the clue is the puzzle; the tag answers it for about 20 steps.
3. **The clever puzzles are real but late.** Walter and the raccoons, Vinnie's slice, the tennis balls, the Rink Job and the Wedding all sit in Acts 2–3. Act 1 has one genuine "aha", Queenie's grate relay, and it comes after a third swarm and two 1 km flights.
4. **Proposed fix (about 2–3 builder-days, no new systems, one optional $0.12 sound):**
   - hide the ally and flock tags until the nudge (S);
   - track Sue first so the swarm is learnt cleanly (S);
   - ducks: the swarm deliberately fails, and a FEED sign lures the picnic away from its tub (M);
   - cats: provoke Pickles into knocking the slice off the sill, keeping the relay as the aha (M);
   - sunglasses: get into his selfie instead of mobbing him (S);
   - cufflink: the cats knock a glass to distract the waiter (M);
   - headlamp key: down a grate for the rats instead of a 5th dive (S–M);
   - cut the Racers' duplicate "cats knock strips" step and fold their feast into the win (S);
   - give the 3-minute nudge to every step that lacks one, and add "almost" lines (S).
5. **Result:** the first four recruits teach four different tricks (mob, lure, look from above, provoke a cat plus relay underground), and there are three early "I worked that out!" moments.
6. **Safe:** the 4 schemes open after the Prologue stay the same. check-schemes needs two small rule updates. About 8 solutions need re-recording: den-ducks, den-cats(+alt), den-racers(+alt), gear-sunglasses, gear-pen(+alt), gear-headlamp(+alt).

---

## 1. Verb and talent matrix (all 32 schemes)

### 1a. When each verb or talent becomes available

The minute is for the likely order in §2.

| Verb / talent | Unlocked by | ≈ minute | Scheme steps that need it |
|---|---|---|---|
| Fly, perch, peck, carry a light item, eat | start | 0 | everywhere |
| Peck a sign (flip) | Prologue s1 | 1 | prologue 1–2, ducks 2, geese 2, choir 2, body 1 (alt) |
| **Hold Coo: swarm a human** (flock ≥ 6) | end of the Prologue | 8 | rats 2, ducks 2, cats 2, sunglasses 2, pen 1 (alt A); sab-north 1 (flock 15 rope) |
| Tap Coo (feast) | end of the Prologue | 8 | racers 4, choir 3, meermob 2 |
| Nap to a phase | the Prologue (Nap hidden until it ends) | ~12 | first needed at ducks 2 (Afternoon) |
| Fly above 10 m to reveal plumes | den-squirrels | ~18 | squirrels 2 only |
| Carry a hot slice against the clock | den-rats | ~10 | rats 3, cats 3, raccoons 2 (alt), body 1 (alt), rhoda 3 |
| Grate travel | den-rats | ~11 | cats 3 (alt), truce-cats-rats 3 |
| Halal griddle (warm a cold slice) | always (A Plaza / D 110th) | — | cats 3 (alt) |
| Call / Ask an ally (the wheel) | first callable crew | ~15 | most steps from den-crows on |
| Dig (squirrels) | den-squirrels | ~18 | crows 2, truce-dogs 2, legs 2 |
| Dive (ducks) | den-ducks | ~16 | crows 2, biscuit 2, turtles 2, headlamp 1, wings 1 |
| Heavy carry (≤ 2 m, slow) | den-biscuit | ~30 | biscuit 3, wings 1/3, truce-dogs 3, truce-cats-rats 3 |
| Trade (crows, 10 crumbs) | den-crows | ~27 | sunglasses 2, pen 2, headlamp 2, wings 2 (alt), beak 2, raccoons 2 (alt) |
| Fetch / haul (Biscuit) | den-biscuit | ~32 | turtles 3, legs 3, beak 4 |
| Knock (cats) | den-cats | ~45 | songbirds 2, racers 2, sab-middle 1, truce-cats-rats 2 (alt) |
| Grate Fetch (rats) | den-rats | ~11 | **first used at part-beak 1 (Act 2–3)** |
| Mimic (songbirds) | den-songbirds | ~50 | horses 2, pen 1 (alt B), headlamp 2 (alt), wings 2 (alt), truce-cats-rats 2 (alt) |
| Bully (geese) | den-geese | ~65 | horses 2 (alt), truce-cats-rats 2 (alt), power 3 |
| Kick / Pull (horses) | den-horses | ~60 | beak 3/4, talons 2, legs 3 |
| Drive | part-wings (RC tug) | ~75 | wings 3, body 3, racers 3 (alt), talons 3 |
| Rig / Sabotage (raccoons) | den-raccoons (Dusk) | ~85 | sab-middle 2, sab-north 2, body 2, talons 2, racers 3 (alt), beak 3 (alt) |
| Night Eyes (Strix) | den-strix | ~95 | legs 1, raccoons 2 (alt) |
| Lift (Rhoda), Muscle (Meer Mob) | Act 2–3 | ~110+ | hauls, power 3 (scripted) |
| Hints (Elders) | den-turtles | ~35 | the Board |
| Fights / stealth / race / flypast | biscuit, strix, body, rhoda / racers / meermob | — | one each |

### 1b. Every step

**T** = told: the card, the meeting lines or a regular's ambient line give the action. **T\*** = told only because the Board's ally or flock tag names it (see proposal 1). **H** = half: a riddle-ish card, and the answer is easy from the world clue. **W** = worked out: the answer is only in the nudge. Steps that are just "talk to the boss" or "go there" are marked *walk-on*.

| Scheme | Step: core action | Kind |
|---|---|---|
| prologue | 1 peck S1 (scripted prompt) · 2 peck S2 + S3 while S1 is live · 3 auto (ranger, van, spikes) | T · T · — |
| den-rats | 1 *walk-on* Sue · 2 **hold Coo** at the slice tourist · 3 hot slice 50 m to Sue | T · T (Flock 6 tag, Crumbsy's ambient line, the Duchess's "hold it and we SWARM") · T |
| den-ducks | 1 *walk-on* Puddles on the water · 2 nap to A, peck M7 **and hold Coo** at the picnickers · 3 give peas | T · H (the riddle names both halves; it repeats the swarm) · T |
| den-squirrels | 1 *walk-on* · 2 climb above 10 m, spot and peck 3 plumes · 3 *walk-on* | T · T (the card and Hazel both say "from up high") · T |
| den-cats | 1 *walk-on* 110th (≈1 km) · 2 back to CPW 72nd (≈830 m), **hold Coo** at the anchovy fan · 3 820 m hot: grate relay 72W→96E, or nap to D and use the griddle | T · T (Flock 6 tag, Pickles's nudge "except maybe a flock") · **W** (the only real Act 1 aha) |
| den-crows | 1 *walk-on* · 2 peck the ledge shiny, Call squirrels to a plume, Call ducks to bubbles (icons shown) · 3 auto, Workshop | T · T (Vesper names all three places) · — |
| den-biscuit | 1 *walk-on* · 2 Call ducks to Lake bubbles · 3 heavy ball, dodge charges | T · T\* (a dive clue plus the Ducks tag; no nudge) · T (a fight) |
| den-turtles | 1 *walk-on* · 2 Call ducks to bubbles · 3 Call a hauler (Biscuit's Fetch, first use) | T · T\* · H |
| gear-sunglasses | 1 peck the flagpole shiny · 2 land in his shot and **hold Coo** (flock 6), then the crows trade | T · H (riddle "won't look up", but Flock + Crows tags; **no nudge**) |
| gear-pen | 1 **hold Coo** at the bread basket, or Mimic the patio phone · 2 crows trade with the artist | H · T |
| gear-headlamp | 1 Call ducks to Turtle Pond bubbles (dive no. 4) · 2 Mimic the jogger, or wait at the gatehouse fountain | T\* · **W** (a nice observation puzzle; Cawdry's ambient line half-gives it) |
| part-wings | 1 Call ducks (dive no. 5), carry the heavy sail · 2 shiny trade or the ice-cream jingle · 3 drive the RC tug, tow, carry | T\* · H · T (new verb: driving) |
| den-songbirds | 1 *walk-on* museum · 2 Call cats to strips (Knock, first use) · 3 nap to A, perch on the truck, peck the chime | T · T\* · H (Chip tells it) |
| den-racers | 1 *walk-on* · 2 Call cats to strips (**identical to songbirds 2**) · 3 flight race (rings), or the pedicab at Dusk · 4 30-crumb feast | T · T\* · T (a skill test, no assist) · T (a chore after the payoff) |
| den-horses | 1 *walk-on* (Morning) · 2 Mimic Prickett's phone "to nobody", or Bully him · 3 auto | T · W→T\* (a great clue, spoiled by the Songbirds tag) · — |
| den-geese | 1 *walk-on* Bow Bridge · 2 nap to A, flip N1 + N2 together · 3 Elders' rock | T · H · T |
| truce-dogs-squirrels | 1 Morning, Cedar Hill · 2 Call squirrels to the Cherry Hill plume · 3 sack low, drop by the walker | T · T\* · T (a funny payoff) |
| den-strix | 1 buy spectacles, 10 crumbs (padding) · 2 night stealth on foot | T · T (a skill test, with assist) |
| den-raccoons | 1 *walk-on* Dusk · 2 hot slice to the stage-door guard, or Night Eyes earring then trade · 3 give the wrench | T · H (Ringo's ambient line gives it) · T |
| sab-middle | 1 Call cats to the teetering key, peck it, peck the gate · 2 Call raccoons to the cart | T\* · T\* |
| sab-north | 1 **hold Coo** at the rope (flock 15) · 2 raccoons at the cart | T · T\* (no nudge) |
| part-eyes | auto | — |
| den-choir | 1 *walk-on* · 2 make all of M1–M8 live (pen, sunglasses) · 3 40-crumb feast | T · T (an 8-sign chore) · T |
| part-body | 1 M4 + M5 live, or a hot slice on Vinnie's counter · 2 Call raccoons, broom fight · 3 drive the cart home | **W/H** · T · T |
| truce-cats-rats | 1 *walk-on* bins · 2 box: Mimic or Bully the cyclist, or cats knock it off the shelf · 3 heavy box, grates, open on the kerb | T · H (**no nudge, no answer**) · T |
| part-legs | 1 Call Strix (N) · 2 Call squirrels ×2 · 3 haul by road | T\* · T\* · T\* |
| part-power | 1 *walk-on* · 2 peck the empty basket with Dove · 3 Call geese → stampede | T · **W** · H→T\* |
| part-beak | 1 Call rats at the grate (Grate Fetch, first use) · 2 crows trade · 3 Kick or Rig the gate · 4 haul the cone | T\* · T · T\* · T\* (4 steps, all errands) |
| den-rhoda | 1 *walk-on* Sal · 2 hawk fight · 3 hot slice to Walter, then raccoons up the stairs in the same phase | T · T · **W** |
| den-meermob | 1 flypast with flock 30 · 2 60-crumb feast or 3 slices | T · T |
| part-talons | 1 Morning, watch the yard · 2 Dusk: Kick the garage, slice for Mama Mask, Rig · 3 Night: hopper, Dump in the lane, Spray to freeze, launch | T · T · **W** (the best puzzle in the game) |
| finale | reach the Workshop, then on-rails | — |

**Totals.**
- *Hold-Coo swarm is the answer:* 6 times, 5 of them in the first hour.
- *Ducks to bubbles:* 5 times, all in Act 1.
- *Cats to strips:* 2 identical steps that open together.
- *Tap-Coo feasts:* 3. *Crow trades:* 6. *Talk-to-the-boss openers:* 20 of 32 schemes.
- *Kinds:* about 9 W steps in the game, and only one of them before the cats join. About 20 steps are T\*: the Board tag is the only thing between them and a real "who fits?" puzzle.

---

## 2. First-hour flow (simulated new player)

**Likely order.** The Board tracks `openList()[0]`, which is **den-ducks** (the Sign War is first in `SCHEMES`), so a new player starts with the ducks. Cats is 1 km north and most players leave it for later. The likely run is:

Prologue → Ducks → Squirrels → Rats → Crows → Biscuit → Turtles → (a gear trade or two) → Cats → Songbirds → Racers.

That is 8–9 crews at about 60 minutes.

### Prologue: Crumbs (≈ 8 min)
- **Teaches:** flap, land, peck a sign, eat, "signs bring feeders", and (in the outro) Coo.
- **Repeats:** nothing; it is the base.
- **Confusion:**
  - the sign behind the camera (R1, being fixed separately);
  - finding S2 and S3: the card says "all three"; Monty's nudge gives the places only after 3 minutes, and the map labels now help;
  - the 3-minute ranger revert can undo S1 while a slow player searches. The card says "get all three live at once", but nothing in the world says "your first one just got reverted, go again". A toast on the revert during step 2 would fix it.
- **Fun:** good. Two antagonists in one minute is a strong hook.

### Ducks Want Peas (≈ 5 min, including the first nap)
- **Teaches:** napping to a phase (the card's "Nap until Afternoon" button) and talking to a character on the water.
- **Combines:** sign flip + swarm (Fixes-2).
- **Repeats:** both halves are the Prologue's two lessons. M7 sits 3 m from the picnic table (people.js P(42,302); M7 at 43,305), so the scene is "flip, then mob, in the same spot". It reads as a checklist, not a trick. Coming *before* Sue, the ducks also steal the swarm's debut.
- **Confusion:**
  - a first nap with no explanation of what it costs (flips revert, piles vanish);
  - the riddle "nobody lets go of lunch for just ONE pigeon" is fair, but the Flock tag doesn't show here (the step has no `flock` need), so a player who swarms without the flip gets "Can't you READ?". That line is good "almost" feedback; keep its spirit.
  - picnickers seated on thin air (R5).

### Hazel Forgot (≈ 3–4 min)
- **Teaches:** altitude as a sense (plumes show only above 10 m).
- **Repeats:** none. It is the one honest change of pace.
- **But:** it's fully told: the card says "only show from above 10 m" and Hazel says "from up high you'd see the dust". After that it is three pecks and a walk back.
- **Confusion:** none. That's fine for a breather.

### A Whole Hot Slice (≈ 3 min)
- **Teaches:** slices are hot for 60 s; the first hot route.
- **Repeats:** the swarm, now for the second time in ten minutes (third, if the player did the ducks with the swarm).
- **Confusion:**
  - Express sits on the grate during the hot run, and "Talk to Express" beats "Give slice" (R6);
  - the swarm aim (R2, fixed in Fixes-3: target ring plus the "Nobody close enough to mob" toast; keep).
- **Fun:** fine, but it no longer feels like a lesson because it isn't the first time.

### Three Shinies (≈ 6 min)
- **Teaches:** the Ally wheel, Call / Ask, Dig and Dive (first-use icons), the Workshop reveal.
- **Repeats:** a fetch-three.
- **Confusion:**
  - the wheel needs **hold R**, and the only teaching is the pause card (the only in-world tutors are flap, peck, eat and coo);
  - the CPW 72nd ledge shiny is ~130 m west of the Ramble with no clue but Vesper's words (Cawdry's "ledge, way west" helps).
- **Fun:** the cave reveal is a good beat.

### Biscuit's Ball (≈ 5 min)
- **Teaches:** heavy carry and the first fight.
- **Repeats:** dive no. 2.
- **Confusion:** carrying the heavy ball ~300 m from the Lake to Cedar Hill at 6 m/s is low-altitude padding (~50 s). Steps 2 and 3 have no nudge.

### Something on Our Rock (≈ 4 min)
- **Teaches:** haul (Biscuit's Fetch) and the Elders' hints.
- **Repeats:** dive no. 3 (Bubbles's showing-off lines help).
- **Fun:** the "who hauls a shopping cart?" moment is the right shape, and Shelly's nudge has a good joke.

### Photobomb (sunglasses) (≈ 3 min)
- **Teaches:** the first trade's "catch".
- **Repeats:** **swarm no. 4.** The catch ("he won't look up from his selfies") is clever on paper, but the solution is the same button on a flock of 6.
- **Confusion:** step 2 has **no nudge**, so a stuck casual player gets nothing until the Elders (only if the turtles are done).

### The Hot Anchovy (≈ 8–10 min)
- **Teaches:** that 60 s is a real constraint; grate travel as a *puzzle tool*; the griddle.
- **Combines:** the rats' tunnels with the slice clock: **the first genuine "I worked that out!"**
- **Repeats:** the swarm, now the third to fifth time, plus two ~90 s flights (Pond → 110th → 72nd) before the interesting part.
- **Confusion:**
  - when the slice goes cold the only feedback is Queenie's "It's COLD". A retry needs a **nap** (the fan's slice only restocks on a phase change, humans.js:333) plus an 820 m flight back;
  - if the player hasn't done the rats, only the Dusk griddle works, and nothing on the card hints that phases matter;
  - the 3-minute nudge timer runs during the flights, so the nudge can fire mid-air, before the player has even tried.

### A New Sound (songbirds) and No Roost, No Training (racers) (≈ 5 + 6 min)
- **Teaches:** Knock (first-use icon), the chime, the race, Draft.
- **Repeats:** both step 2s are "Call the cats to glued strips"; both open on den-cats and sit side by side on the new Spikes lane. The Racers then add a feast chore after the race.
- **Confusion:**
  - Coach's flight race has a 12 s margin (Coach ≈ 70 s, Gus ≈ 58 s at cruise) and **no assist**: the first pure skill gate for a casual player. The wheeled division needs the raccoons (Act 2).

**First-hour verdict.**
- About 9 schemes, of which the swarm solves 4–5, a duck dive solves 3 and a cats Knock solves 1–2.
- New verbs arrive at a good rate (nap, altitude, slice clock, wheel, heavy, haul, fight, trade, drive), but the **solutions** don't vary.
- One W step (the relay), and it arrives at ~45 min behind two long flights.

---

## 3. Repetition, variety and the cleverness curve (whole game)

1. **The swarm is overloaded.** Six solutions, five in Act 1. The Prologue outro teaches it with the line "Hold it, and we SWARM", and a "hold F" tutor reminds you. After Sue it stops being a discovery. Keep it for Sue (the clean lesson) and sab-north (the flock *size* is the point), plus pen and photobomb fallbacks only if needed.
2. **Bubble rings equal ducks, five times.** The clue *is* the answer by design ("bubble rings and a white splash: dive"), so each repeat is a pure errand. Bubbles's lines dress it up but don't change it.
3. **Strips equal cats, twice in a row** (songbirds 2, racers 2), then once more with the key (sab-middle). The key is fine: different object, different context.
4. **Feasts after payoffs.** Racers (straight after the race) and Choir (after 8 signs) put a "Coo with N crumbs" chore after the high point, against "Showpieces end on the laugh / no chore follows a big payoff".
5. **Talk-to-boss openers** in 20 of 32 schemes are fine as setup. Combined with travel, though, the first hour is mostly "fly to boss, fly to target, fly back".
6. **Board tags spoil the "who".** About 20 Call steps become T\*. This is the biggest single drain on cleverness, and it's a UI detail.
7. **Grate Fetch is dormant.** The rats join in the first 15 minutes, but their second talent isn't used until part-beak (Act 2–3). It's the cheapest new verb to bring forward.
8. **The Choir's 8-sign chore** (M1–M8, pen and sunglasses) is the longest pure collection step on the main path.
9. **Beak is four errands** (rats → crows → kick → pull), each told.
10. **Strix step 1** ("buy at the stall") is a crumb sink with no catch.

**Where the "aha" moments sit:**

| Act | Aha steps today |
|---|---|
| Act 1 (~40 min) | cats 3 (relay / griddle) · headlamp 2 (fountain wait) · horses 2 (the phone, if not tag-spoiled) |
| Act 2 (~35 min) | raccoons 2 (slice to the guard) · body 1 (Vinnie) · truce-dogs 3 (tennis balls; mostly told) · truce-cats-rats 2 (box: three routes) · legs (chain) |
| Act 3 (~25 min) | rhoda 3 (Walter + raccoons) · power 2–3 (Dove + geese) · talons 3 (Zamboni ramp) |

The **cleverness curve is back-loaded**: flat and low for 40–50 minutes, then very good. The difficulty curve is fine: no step is hard, and the skill gates (race, owl, fights) have assists, except the race, which has none.

---

## 4. Game-feel and feedback gaps that hurt fun

1. **No nudge on these steps:** gear-sunglasses 2, den-biscuit 2–3, den-strix 1–2, sab-north 2, part-body 2–3, truce-cats-rats 1–3, part-beak 2 and 4, part-talons 1, part-power 1, den-choir 1, and the "talk" openers. Of these, **gear-sunglasses 2** and **truce-cats-rats 2** are real puzzles with no nudge. truce-cats-rats 2 has no `answer` either, so the Elders fall back to "goal + obstacle", which is no answer. The 3-minute promise is broken exactly where it's needed.
2. **The nudge clock is wall-time on the tracked card,** not time spent being stuck. It runs through 90 s flights and naps, so long-travel schemes (cats, songbirds) nudge before the player has tried, and short ones nudge late. It should count only near the step's place, and should speed up after a failed attempt.
3. **Silent or flat failures:**
   - a cold slice gets "It's COLD" and nothing points toward a fix, even on the second try;
   - a swarm on a target that ignores swarms gets nothing in places (the photobomb tourist, the waiter's table);
   - a race lost twice gives no assist;
   - the anchovy fan only restocks after a nap, and nothing says so.
4. **The prologue revert:** S1 can revert while you hunt S2/S3, with no "the ranger just fixed your first sign" callout.
5. **Prompt conflicts while carrying** (R6: Express on the grate, Chip at the joint). This matters most on hot-slice steps, where seconds count.
6. **Travel padding:**
   - den-cats needs about 2.7 km of flying before and around its one puzzle;
   - biscuit 3 is a ~300 m low, slow carry;
   - songbirds 1 → 3 runs from the museum (CPW 79th) to Grand Army Plaza (~500 m) and needs a nap.

   Flight is "the joy", so one long leg per scheme is fine. Two before the interesting part is not.
7. **Waiting with nothing to do:**
   - the jogger's fountain stop (4 joggers on a ~650 m loop, a 6 s stop each; ~40 s waits; fine);
   - Rhoda and Walter's door must happen inside one Dusk;
   - the Zamboni's 25 s hopper fill (fine: you're driving);
   - no real problem spots.
8. **Unclear affordances:**
   - the Ally wheel (hold R) has no in-world first-use prompt;
   - "heavy, carry it low" is stated, not felt: the 2 m ceiling should bump with a "too heavy" puff;
   - plumes say nothing until you're above 10 m, which is fine once you know.

---

## 5. Ranked proposals (highest fun-per-effort first)

Every proposal keeps the opener the same: after the Prologue, den-ducks, den-squirrels, den-rats and den-cats are open. "Re-record" means the recorded solution and its step fixtures, done by the existing autopilot goal scripts in `game/src/debug/goals-*.js`. Later fixtures whose saved state includes changed flags need regenerating too; that's noted where it applies. The `whole-game.mjs` goal script must follow every data change.

---

### P1. The Board stops naming the ally and the swarm (S)

**Problem.** Card tags show the crew that solves the step, and "Flock 6: you have 6" on every swarm step. This makes about 20 Call steps "told" and contradicts the design's own rule that *who* fits the clue is the puzzle.

**Change** (`systems/schemes.js` `cardInfo()`, `ui/board.js` lines 50–55, about 15 lines):
- **Ally tags.** Until `nudgeShown(id)` is true (or the step is done), don't show the crew's name.
  - If the ally belongs to another thread, show that thread's icon with "a friend from the Slice Run". That keeps the interlock flavour and the red string, and it is a riddle-level hint.
  - If the ally belongs to the same thread, show nothing.
  - After the nudge, show the crew name as today.
- **Flock tag.** Show it only when `needs.flock > 6`, i.e. when the size itself is the obstacle (sab-north 15, Meer Mob 30).
- Remove `flock: 6` from steps whose real need is "your Swells are with you": every player has 6 after the Prologue.
- **Answer icons.** Keep `answer.icon` for the Elders.
- Keep the first-use world icon (clues.js:294): it's the teaching moment.

**Touches:** board UI only; no scheme data.

**Risk:** none to replays or check-schemes (UI only). Screenshots of the Board change.

**Art/sound:** none.

---

### P2. Track Sue first after the Prologue (S)

**Problem.** The Board tracks den-ducks first, so the swarm debuts in a muddled double-step, and Sue's clean lesson comes second.

**Change:** in `prologue.end`, set `G.state.tracked = 'den-rats'` when the Board opens. Sue is also the shortest trip (~170 m from the Pond). Order on the Board doesn't change.

**Touches:** `schemes/prologue.js` (one line).

**Risk:** the prologue solution's inputs don't depend on `tracked`. Nudge timing in later fixtures does, but fixtures pin `tracked`. Re-run the prologue replay to confirm. The whole-game script may pick a different first goal; harmless.

---

### P3. Ducks: the swarm fails on purpose, and the sign is a lure (M) ★ early aha no. 1

**Problem.** It repeats the swarm, and the sign sits 3 m from the table, so "flip + mob" is a checklist.

**Change.**
- **Data.** `den-ducks` step 2:
  - goal "Get the Boathouse picnickers' peas.";
  - obstacle "They never leave that tub. Well… hardly ever. What gets a picnic up off its blanket?";
  - nudge (Bubbles) "Those picnickers can't resist feeding the birds, Gus! What if the sign up the path said FEED?";
  - answer "At Afternoon, peck sign M7 up the path: the picnic walks over to feed the birds and leaves the tub alone. Grab it.";
  - `needs: { phase: 'afternoon', place: 'boathouse' }` (no flock); `target: { sign: 'M7' }`.
- **World.** Move the Boathouse picnic (people.js:48, `P(42,302)`) to about 12–14 m from M7. M7 stays put because den-choir and part-body use it. The picnic must stay inside `summonFeeders`' 16 m radius, with a clear sightline so the empty table reads.
- **Script.** Re-use the rolled-back R3 code (`G.items.guards`, `G.humans.clings`, the tub spawn):
  - peck the tub → "Hands OFF, pigeon!";
  - hold Coo → "We've been mobbed by better pigeons. The peas STAY." (the "almost" line that points away from the swarm);
  - flip M7 → "Ooh, a FEED sign! Crumbs for the birdies!": all three walk to it; the tub is alone for about 10 s.
- **No dead state.** While M7 is live, the picnic gets up again at each feeder top-up (≈ every 45 s), so a missed grab just means wait. The ranger's 3-minute revert also re-arms it.
- **Pickup feedback.** "Hey! HEY! The PEAS!" on pickup.

**Why it's better.** The swarm has just worked on Sue. Here it fails, out loud, and the answer is a thing the player already owns (a FEED sign) used for a new purpose (moving people). It also sets up the geese's lawn, Vinnie and the Choir.

**Touches:** `data/schemes.js`, `schemes/den-ducks.js`, `data/people.js`.

**Risk:**
- re-record den-ducks (+ s2/s3 fixtures);
- the picnic move changes nothing else (only den-ducks uses that group, and its feeders come from `spec.feeder`);
- check-schemes unaffected;
- design doc row update.

---

### P4. Cats: "Don't wake the cat" for the slice, so the relay is the aha (M) ★ early aha no. 2

**Problem.** A third swarm, behind 1 km of flying, in front of the act's only W step.

**Change.**
- **Data.** `den-cats` step 2:
  - goal "Get an anchovy slice at CPW & 72nd.";
  - obstacle "The fan on the bench never lets go. But the counterman's left a fresh one cooling on the sill, right next to Pickles. Pickles is asleep. Pickles is a CAT.";
  - nudge (Whiskerton) "Wake a cat beside something on a ledge, dear, and see what happens. Every time.";
  - answer "Peck Pickles awake (or Coo under her window): she stares at you and slowly pushes the slice off the sill.";
  - `needs: { phase: 'day', place: 'slice-cpw72' }` (drop flock 6).
- **World and script.**
  - While on step 2 by day, spawn `slice-anchovy` on the bodega window sill beside Pickles. It's a placed item that can't be picked up from the sill (an items guard: "It's right next to the CAT.").
  - Peck Pickles or tap Coo within 4 m → the Juice "Knock" beat already specced for cats: stare 1 s, slow paw push, the slice falls (spawned with `born = now`, so it's hot), "…I didn't do that. You didn't see that.", then back to sleep.
  - It doubles as a preview of the cats' talent, so the "who knocks things off edges?" clue lands later (songbirds 2, sab-middle 1, pen).
  - The anchovy fan stays as the red herring. Swarm → cling "Mob me all you like. This one's MINE. Go bother the CAT." (the almost line).
- **Step 3 "almost" feedback** (`den-cats.js`):
  - the first time the anchovy slice goes cold while on step 3, a Whiskerton bubble: "Cold already. Over the park's too slow, dear.";
  - the first time Queenie refuses a cold one, she adds "Under it, perhaps?" if `den-rats` is done, or "The halal man's griddle is on 110th at Dusk." if not;
  - the sill slice re-spawns every phase, and **also** 60 s after a cold refusal while on step 3 ("the counterman's put out another"), so a failed run never needs a nap to retry;
  - keep the card's step 3 obstacle a riddle: "820 m. Over the park, it'll be cold by 96th Street." The answer stays in the existing nudge.

**Touches:** `data/schemes.js`, `schemes/den-cats.js`, the Pickles staging (the cat paw-push pose exists per Key poses), `data/people.js` (cling line only).

**Risk:**
- re-record den-cats and den-cats.alt (+ fixtures);
- check-schemes' hot-route check is unchanged (same joint, same routes);
- design row update.

**Art/sound:** none new (cat meow, knock clatter and slice pick-up exist).

**Why not the R3 "lead Pickles to the bench" stalk:** it's an escort in all but name (the design says "no escort missions"), its rule is invisible (tap-Coo makes her stalk), and it was fiddly (she gets bored at 12 m altitude or 30 m distance). Keep only its best line, "…I MEANT to do that.", for the knock.

---

### P5. Racers: cut the duplicate Knock, fold the feast into the win (S)

**Problem.** songbirds 2 and racers 2 are the same Call, opening together. The feast after the race is a chore after the payoff.

**Change.**
- **The cats clear P2.** `den-cats` `gives.setFlags += ['spike.P2.cleared']`. In `cats.join`, add one beat after Queenie's join line:
  - Queenie: "First job's on the house, darling. Pickles. The Reservoir."
  - Toast: "Spikes cleared: the Racers' roost (Pickles: 'For SCIENCE.')".

  The songbirds' cornice stays the cats' first *player-driven* Knock, with its icon.
- **Racers.** `den-racers` loses step 2: coach → race → (feast). Coach's intro line becomes "Somebody cleared our roost. No excuses now. Race me." In `racers.won`, if crumbs ≥ 30, take them and play the feast in the same scene, completing the scheme. If not, step 3 "Throw the Racers a feast" stays as today.
- **Race assist** (`systems/race.js`), matching the fights:
  - after 2 lost races, Coach "eases off" to 8 m/s and Sprint flies one ring ahead as a guide;
  - toast "Sprint will show you the line."

**Touches:** `data/schemes.js` (den-cats gives, den-racers steps), `schemes/den-racers.js`, `schemes/den-cats.js` join beat, `systems/race.js`.

**Risk:**
- check-schemes' "P2, P3 only after the cats" still holds (P2 now cleared by den-cats itself; update the rule's message);
- the Spikes meter gets +1 at cats join;
- re-record den-racers and den-racers.alt;
- den-cats is re-recorded anyway (P4);
- regenerate fixtures captured after den-cats (they gain `spike.P2.cleared`: den-songbirds, den-racers, truce-cats-rats, sab-middle and later);
- the replay harness compares outcomes, so other solutions should still pass. Run all 40.

---

### P6. Photobomb by framing, not mobbing (S) ★ early aha no. 3

**Problem.** Swarm no. 4, and no nudge.

**Change.**
- **Data.** `gear-sunglasses` step 2:
  - obstacle "He won't look up from his phone. So get IN it.";
  - nudge (Monty) "A selfie, darling, is a stage. Be IN the shot. Behind him, on the rim. Hold still.";
  - answer "Land on the fountain rim behind him (where his phone points) and stay put a moment; then Call the crows.";
  - `needs`: drop `flock`; keep crows, crumbs 10, shiny and selfie.
- **Script.** A 2 × 1 m "in frame" box on the rim behind the selfie tourist, facing his phone. Gus standing there for 1.5 s → the tourist: "Wait… a pigeon in my… that's actually a GREAT shot." He lowers the phone to show his friend and is now tradeable for 15 s. If Dove is in the flock: "Is that a DOVE?!" (just a laugh).
- **Swarm.** A swarm gets "Ugh. Pigeons. *turns his back*" (the almost line).

**Touches:** `data/schemes.js`, the sunglasses trade gate (market.js or a gear script), a layout point on the fountain rim.

**Risk:** re-record gear-sunglasses (+ fixture); check-schemes unaffected.

---

### P7. Every puzzle step gets its 3-minute nudge, and the clock counts real stuck time (S)

**Change.**
- **Data:**
  - add `nudge` + `answer` to gear-sunglasses 2 (P6), truce-cats-rats 2 (Pinstripe: "A whole box? The cyclist on East Drive carries one every Afternoon. Or that shelf at 72nd is VERY close to the edge.") and truce-cats-rats 3, den-biscuit 2/3, sab-north 2, part-body 2/3, part-beak 2/4 and den-strix 2;
  - add a check-schemes rule: every non-auto step whose `on.type` isn't `talk` or `reach` has both `nudge` and `answer`.
- **Clock** (`systems/schemes.js` `update`): `stepTime` advances only while Gus is within 80 m of any of the step's places (needs/alts), or after a failure event for that step. On a failure event (cling line, shoo, "It's COLD", wrong-place Call, lost race or fight), set the remaining time to `min(remaining, 60 s)`.
- **Prologue.** Toast "The ranger fixed your first sign. Flip it again!" when S1 reverts during step 2.

**Touches:** data, `systems/schemes.js`, `tools/check-schemes.mjs` (new rule).

**Risk:** nudges are runtime-only (`this.nudged` in `systems/schemes.js`, not saved), and bubbles and toasts don't change state, so replays should pass. Verify on one replay, then run all.

---

### P8. The cufflink: cats knock a glass to distract the waiter (M)

**Problem.** Alt A is swarm no. 5 (hold Coo at the bread basket).

**Change.**
- **Data.** `gear-pen.opensWhen.flags += ['den-cats']`. Step 1 alts become:
  - **(A)** day A · tavern · sunglasses · ally cats · waiter: Ask the cats at the wine glass teetering on the next table's edge (a "knock" clue) → crash → the waiter rushes over with a dustpan, off the cufflink;
  - **(B)** songbirds Mimic the patio phone (unchanged).
- Obstacle "He won't move off it. Unless something more expensive than a cufflink needs him."
- Nudge (Pickles) "A glass, right on the edge of a table? Darling. It's practically a REQUEST."
- **Why A is always satisfiable:** den-songbirds needs den-cats, so the cats are recruited in every state that opens gear-pen.

**Touches:** `data/schemes.js`, `systems/clues.js` + layout (a `knock` clue at the Tavern patio, re-using the clue type and a code glass prop), `schemes/gear-pen.js`.

**Risk:**
- check-schemes alternative rule passes (A needs cats, which `opensWhen` guarantees);
- the Choir's gating (`gear-pen`) now implies cats, but den-choir already needs sab-middle, which needs den-cats, so there's no change in practice;
- re-record gear-pen and gear-pen.alt;
- regenerate the gear-pen fixture.

**Art/sound:** a glass-smash SFX is nice to have (audiogen, about $0.12). The existing knock clatter works as a stand-in.

---

### P9. The jogger's key is down a grate: Grate Fetch in Act 1, one fewer dive (S–M)

**Problem.** Dive no. 4 of 5, and the rats' second talent goes unused until Act 2–3.

**Change.**
- **Data.** `gear-headlamp.opensWhen.flags += ['den-rats']`. Step 1:
  - goal "Find the jogger's lost key.";
  - obstacle "It went through a grate by the Reservoir, mid-lap.";
  - `needs: { phase: 'day', place: <a PLACES entry at grate-86w, layout.js:448>, ally: 'rats' }`, `on: talent clue 'key-grate'`;
  - nudge (Pinstripe) "Something jingly down OUR grate at 86th. Ask us.";
  - answer "Call the rats to the 86th Street West grate and Ask them."
- Move the `turtle-key` clue to a grate-fetch clue at grate 86W (glint below; the clue type exists, see `sticker-grate`).
- Lines: Express replaces Bubbles: "A KEY! On a little sneaker! Somebody runs a LOT."
- Step 2 is unchanged. The fountain-wait observation puzzle is good.

**Touches:** `data/schemes.js`, `systems/clues.js` and layout clue list, `schemes/gear-headlamp.js`.

**Risk:**
- the chain to den-strix / part-legs now also needs den-rats, which opens right after the Prologue, so the never-0-open walk still passes;
- re-record gear-headlamp and gear-headlamp.alt;
- regenerate the gear-headlamp fixture and the fixtures that pin `clue.turtle-key`.

---

### P10. "Almost" and affordance polish (S each)

- **Cold-slice refusal by any hot-only taker** (Sue, the guard, Walter, Queenie): the second time, a bubble from the nearest regular names the *problem* ("Sixty seconds, kid. That's all a slice has."), never the answer.
- **The 2 m heavy-carry ceiling:** a feather puff and "Oof. Too heavy to go higher." the first time Gus hits it.
- **The Ally wheel:** a first-use in-world tutor "Hold R: call a friend" when the first Call step becomes tracked.
- **Nap confirm:** "Nap? Your 2 flipped signs will be fixed and 1 crumb pile will go." the first time only.

**Risk:** none to replays (text and toasts only).

---

### P11. Choir: 4 signs that matter, not 8 (S–M)

**Problem.** An 8-sign collection chore in Act 2.

**Change.** `den-choir` step 2 becomes `signs: ['M4','M5','M6','M3']` (the Mall's two, the Bethesda terrace and Cherry Hill: the crowd's path to the terrace). Obstacle "An audience that STAYS needs feeding on the way in." Bread Power still rewards the rest.

**Touches:** data.

**Risk:**
- the pen is still needed (M5), and so are the sunglasses (M6), so the `opensWhen` stays valid;
- re-record den-choir;
- check-schemes' pen rule still holds.

---

### P12. Beak: Big Ben kicks *and* pulls (M)

**Problem.** Four errands in a row.

**Change.** Step 3's horses alt also sets `cone.home` and hauls the cone in the same scene (Big Ben: "Hup." ×2). Step 4 becomes `on: { type: 'flag', flag: 'cone.home' }` with the haul alts unchanged, so the raccoons-then-Biscuit route still works; for the horses route it completes at once.

**Risk:**
- re-record part-beak and part-beak.alt;
- check the nap rule (`cone.home` is a persistent flag).

---

### Considered and not recommended

- **Biscuit's ball by other means.** It's the ducks' Dive teaching moment for many players. Keep it, and keep turtles (dive + haul is a real combination), crows (the Call tutorial) and wings (the RC tug makes it its own).
- **Racers' roost as a raccoon/Rhoda net (Act 2).** Varied, but it moves +10 flock behind the raccoons, close to sab-north's flock-15 gate. P5 is cheaper and safer.
- **Squirrels twist.** Leave it as the breather. Optional (S): drop Hazel's "From up high you'd see the dust" and the card's "above 10 m", and make the card "Squirrel dust. Unmistakable. From the right angle.", so Twitch's 3-minute nudge carries the answer.
- **New systems.** None are needed. Every proposal re-uses feeders, clings, item guards, clues, takers and existing poses.

---

### The first hour after P1–P9

| # | Recruit | The trick | Kind |
|---|---|---|---|
| 1 | Sue (rats) | mob a human (the swarm, learnt cleanly) | T, the lesson |
| 2 | Puddles (ducks) | the swarm *fails*; a FEED sign lures the picnic off its peas | **W** |
| 3 | Hazel (squirrels) | look from above | T, breather |
| 4 | Queenie (cats) | wake a cat beside a slice, then get it 820 m hot under the park (rats) or via the Dusk griddle | **W + W**, a cross-thread combination |
| then | Crows | Call tutorial | T |
| then | Sunglasses | get into the selfie | **W** |
| then | Headlamp | Grate Fetch + observe the fountain stop | H/W |
| then | Cufflink | cats knock a glass as a distraction | H/W |
| then | Racers | the race, no chore after | T (skill, now with an assist) |

The swarm drops from 5 first-hour solutions to 1 (plus sab-north's flock-size rope later), and the dives from 5 to 4.

**Re-record list:** den-ducks, den-cats(+alt), den-racers(+alt), gear-sunglasses, gear-pen(+alt), gear-headlamp(+alt), plus den-choir and part-beak(+alt) if P11 and P12 are taken.

**check-schemes:** the 4 schemes open after the Prologue are unchanged. Update the P2 message, add the nudge/answer rule, and re-run the full walk.

**Design doc rows to update:** den-ducks, den-cats, den-racers, gear-sunglasses, gear-pen, gear-headlamp, den-choir, part-beak, the Board tag sentence in "Screens", and the nudge rule in "Difficulty".
