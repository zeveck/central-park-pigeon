# Mistake sweep: plan (2026-11-22)

Goal: prove a fumbling player can still finish every puzzle. Each run starts a step from its fixture, injects one
mistake, then the step's goal script recovers and finishes it. Code-read only: nothing has been run yet.

Codes: **W** drop or lose the item (water, roof, far) · **C** go cold or wait out a timer · **F** fail the race or fight once · **R** get Ruffled ·
**N** nap past the window · **A** wander 2+ min · **O** wrong order · **V** vehicle lost or stuck · **Q** save, quit, Continue.

## 1. Chosen steps (26 of 86; line = game/src/data/schemes.js)

| # | Case (line) | Why it can dead-end | Mistakes |
|---|---|---|---|
| 1 | den-ducks.s3 (68) | One-time peas | W Lake (0,300) · R · A |
| 2 | den-rats.s3 (127) | Hot slice (60 s) | C · N (cools) · W roof |
| 3 | den-cats.s3 (139) | Hot anchovy, sill refill | C · W (sinks) · N to Night |
| 4 | den-raccoons.s2 (77) | Hot slice to guard, one trade, Dusk | C · N Night · O peck guard empty-beaked |
| 5 | den-raccoons.s3 (85) | One-time wrench | W Turtle Pond · A · R |
| 6 | sab-middle.s1 (92) | Key falls once (lot.keyDown), Night | W Lake · N Morning · R |
| 7 | part-body.s2 (158) | Vinnie fight, Dusk | F walk into Vinnie · N · O Ask off-cart |
| 8 | part-body.s3 (159) | Drive rigged cart, Dusk | V wedge + leave · V into the Lake edge · N |
| 9 | den-racers.s2 (201) | Race; assist after 2 losses | F ×1 · F ×2 · N mid-race (blocked) |
| 10 | den-racers.s2 alt (fixture den-racers.alt) | Pedicab, Dusk, wheels race | F · V abandon 100 m off · N |
| 11 | part-talons.s2 (242) | Slice + union.paid + door, Dusk | O pay Rigby first · C · N |
| 12 | part-talons.s3 (243) | Zamboni, Night; **no tow** | V wedge in a corner · F failed launch · N |
| 13 | part-wings.s1 (402) | Sail 1, one dive | W Conservatory Water · A · R |
| 14 | part-wings.s2 (404) | Shiny for the remote, Afternoon | W · N Dusk · O Ask with nothing |
| 15 | part-wings.s3 (410) | RC tug + sail 2; **no tow** | V leave the tug far side · V exit mid-tow · W sail |
| 16 | den-biscuit.s3 (347) | One-time ball; fight | F leave arena · R on the shore · W Lake |
| 17 | den-strix.s2 (355) | Spectacles sold once, Night, stealth | F spotted · N Morning · A |
| 18 | gear-pen.s2 (380) | One-time cufflink, Afternoon artist | A · N Dusk · R |
| 19 | gear-headlamp.s2 (390) | One-time key; jogger Morning/Dusk | W Reservoir · N Afternoon · A |
| 20 | part-beak.s2 (418) | One-time sticker; foreman Mor/Aft | W shed roof · N Night · R |
| 21 | truce-dogs-squirrels.s3 (272) | One-time sack; walker Morning | W Lake · N · O drop early |
| 22 | truce-cats-rats.s3 (177) | Box; naps clear boxes | W Meer · N box on ground · A |
| 23 | den-rhoda.s2 (300) | Rhoda fight over the Meer | F 75 m off · R over water · N (blocked) |
| 24 | den-rhoda.s3 (301) | Hot slice; doorOpen clears on nap | C · N after the door · O Ask first |
| 25 | part-power.s3 (290) | One-time wedding, day only | O geese before dove · N Night · A |
| 26 | den-meermob.s2 alt (310) | 3 slices across phases | C cold one · N between · Q after 2 |

**Q for all 32 schemes.** For the 26 rows, quit at the most loaded moment: carrying the item, in the vehicle, or mid-race
or mid-fight. For the rest, quit mid-way through the middle step. part-eyes (auto, no fixture): quit at the end of
sab-middle.s2.

Left out, because the item renews or the action repeats: den-crows.s2, gear-sunglasses.s2, den-choir.s3, part-legs.s3,
den-turtles.s3, sab-north.s1, den-horses.s2. Their Q runs still cover them.

**Total: 78 mistake runs + 32 Q = 110 runs.**

## 2. Harness

**Tool.** A new mode in game/tools/sf-run.mjs runJob, `mistake <case> <code> [--cap s]`, about 40 lines. Behind it:
- src/debug/mistakes.js (debug-only): per case, the inject goals and the checks.
- src/debug/sweep-lib.js: midscene-sweep.mjs:94-170 (`slice`, `retry`, `leftovers`, `avail`), moved out so both sweeps share it.

No game code changes.

**One run:**
1. `goToScheme(case)` (sf-run.mjs:51).
2. Run `slice(id)` up to a `{ msMark }` goal, for example right after `pickItem: 'peas'`.
3. Inject the mistake.
4. Recover with the same goal script, from wherever things are (`recover(id, n)`):
   - **ensurePhase:** if the phase is wrong, napAt the nearest Nest (goals-sf.js:4).
   - **ensureItem:** if needs.item is not carried, `pickItem` it where `items.world` has it (keeper or refill; wait up to 6 s).
     Otherwise re-run the goals of the step that produced it.
   - **ensureVehicle:** if the vehicle is away from home, nap (tow) or `enter` it where it stands.
   - **segment:** the goals between the `s<n-1>` and `s<n>` waitFors, with `retry` up to 3 times (midscene-sweep.mjs:189).

**Injection:**

| Code | How | Route |
|---|---|---|
| W | `flyTo` the spot (roofs: `landOn` a roof perch), then `press: 'drop'` | input |
| C | `wait: 65` perched | input |
| F | Race: peck `race-start`, hover off-route until it is lost. Fight: leave the arena (fights.js:264/331/451) or touch Vinnie (:412) | input |
| R | In a fight: idle until hit 3 times. Elsewhere: `G.dev.hurt(3)` (debug.js:261), the real G.hurt path. Nothing outside fights hurts Gus (fights.js:212 is the only caller) | input / poke |
| N | napAt to the wrong phase | input |
| A | `flyTo` 120 m off, then `wait: 125` | input |
| O | Run a later fragment first | input |
| V | `drivePath` into an obstacle until speed < 0.1 for 3 s, then `exit` and fly 60 m off | input |
| Q | Esc → "Save & quit" → `reload` job → the title's Continue (midscene-sweep.mjs:271) | input |

**Pass** (all of these):
- **Time:** the step flag is set within `max(600, 3 × the recorded step time) + the injected wait` game seconds.
- **Errors:** 0 console errors (sf-run.mjs:43, :114).
- **No loops:** with G.toast wrapped, fail if the same toast shows more than 3 times in 60 s, the keeper puts back the
  same item more than twice, a step script restarts more than twice, or Gus is Ruffled outside the injection.
- **Nudge consistent:**
  - the tracked scheme and the step did not change;
  - the keeper toast names where the item actually lies (within 3 m of item-sources.js `at`);
  - the cold card shows when the slice is cold (schemes.js:468);
  - `targets()` (schemes.js:479) points within 10 m of the item or its recipient;
  - after a fail event, stepTime is at least 120 (schemes.js:49).

  Log NUDGE-WRONG when the compass points at the recipient while the item lies elsewhere. Give steps are likely to
  show this: targets() reads only `on.to` (:487-489).
- **Leftovers:** `leftovers()` is empty at the end.

**Batching.**
- One http.server on port 8301 and two `sf-run serve --jobs scratchpad/mistake/{A,B}`, each with one game load.
- `free -m` first; at most 2 browsers.
- Jobs are named `NNN-<case>-<code>.job` and split by estimated length, longest first.
- A `reload` job goes before each Q, after any FAIL or JOB ERROR, after vehicle and fight runs, and every 8 runs.

**Logging.** Each run prints one `MS {json}` line. `tools/mistake-sweep.mjs collect` merges A and B into
design/reviews/mistake-sweep.md (+ .json):

`case | mistake | route | mistake took | recovery (keeper/refill/tow/nap/repairSpent) | retries | game s / cap | wall s | errors | loops | nudge | verdict`

A failure also keeps a screenshot and the save in scratchpad/mistake/fail/.

## 3. Estimate

Basis: the scratchpad/playtest/jobs timestamps, where a scheme replay takes 1.5 to 8 minutes.

| Runs | min each | min |
|---|---|---|
| 52 W/C/O/R/F | 5 | 260 |
| 26 N/A/V | 7 | 182 |
| 32 Q | 6 | 192 |
| ~25 reloads | 2 | 50 |
| ~16 re-runs | 6 | 96 |

That is about 780 browser-minutes, **about 6.5 hours on two browsers**. Building the harness adds about half a day.

## 4. Risks: script limit or real dead end

Likely goal-script limits, where a human could recover:
- The scripts are linear. After W, den-ducks' step 3 (goals-ssf.js:145) flies to Puddles empty-beaked; ensureItem covers this.
- Fixed routes (part-body's drivePath, goals-ssf.js:371; the pedicab route) assume where Gus starts, and `flyTo` can circle.
- anchovy() and rideGrate assume a first-try hot slice, but Pickles talks differently on a retry.
- `fight: 'rhoda'` waits for `rhoda.beaten` (pilot-fights.js:66), and `flyRings` returns true after a loss
  (pilot-3a.js:53). Both need `retry`.
- Possibly real: the Zamboni and the RC tug have no tow (vehicles.js:186 tows only the hotdog-cart and the pedicab).

**Telling them apart.** On a failure, run the oracle `satisfiable(id, n)`:
- the item is carried, on dry ground (`G.wetAt` false), keeper-ruled or renewing;
- the phase can be reached by a nap (no napBlock);
- the needed human or character is out in that phase;
- the vehicle moves at least 1 m under 10 s of reverse-and-steer;
- the trigger is unspent (`avail()`, midscene-sweep.mjs:250).

If all of these hold, the verdict is **FAIL-SCRIPT**: improve the goal script and re-run. If any fails, nap once, then
Save & quit → Continue (repairSpent, schemes.js:283) and check again. Still failing means **FAIL-GAME**, a must-fix
softlock. Anything unclear is **UNSURE**: check it once by hand with real inputs and screenshots, no pokes.
NUDGE-WRONG is ranked separately by reach × harm; it is usually polish, because the keeper toast still names the place.

## Decision (2026-11-23): rounds, one browser
The owner chose option 3 (one browser at a time on this machine):
- **Round 1:** the single most likely mistake for each of the 26 risky steps, plus save-quit-Continue for every scheme (including say-cheese): about 58 runs.
- **Round 2:** wherever a step or a kind of mistake fails (a real dead end, or a recovery that needed help), run that step's other mistakes and the same kind of mistake on similar steps.
- Stop when a round finds nothing new.
- Results go in design/reviews/mistake-sweep.md. Real dead ends are must-fixes for #23.
- Autopilot gaps are fixed in the autopilot, never by changing the game.
