# Mistake sweep (#23): a fumbling player can still finish every puzzle

Plan: design/changes/mistake-sweep.md (rounds, one browser). Tool: `node game/tools/mistake-sweep.mjs` (jobs / collect) over
`node game/tools/sf-run.mjs serve` jobs `mistake <case> <code>`; cases, injections, recovery and checks in src/debug/mistakes.js.
Each run: the step's fixture → its goal script to the most loaded moment → ONE mistake (real inputs; Ruffled outside a fight is the
one poke, G.hurt) → the goal script again, planned from wherever things are, until the step's flag. Times are game seconds.

Totals: PASS 53 · PASS-HELPED 2 · FAIL-SCRIPT 2 · LEFTOVERS 1 (58 runs)

Columns: mistake took (game s it took) · recovery (keeper put-backs, sill refills, tows, naps, what repairSpent put back on a Continue,
and any help the driver needed) · retries (re-plans after a stuck goal) · game s / cap (max(600, 3 x the recorded step) after the
mistake) · wall s · console errors · loops (a toast 4x in 60 s, the keeper putting the same item back 3+ times, the step script
starting 4+ times, Ruffled after the mistake) · nudge (the compass, the keeper's toast, the cold card, the nudge after a failure).

| Round | Case | Mistake | Route | Took | Recovery | Retries | Game s / cap | Wall s | Errors | Loops | Nudge | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | den-biscuit.s3 | Q: save, quit, Continue | input | yes (-33.7 s) | - | 0 | 54.2 / 600 | 125 | 0 | - | - | **PASS** |
| 1 | den-cats.s3 | C: wait until the slice is cold | input | yes (57.2 s) | naps 1 | 0 | 118.5 / 600 | 79 | 0 | - | - | **PASS** |
| 1 | den-cats.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 60.8 / 600 | 75 | 0 | - | - | **PASS** |
| 1 | den-choir.s2 | Q: save, quit, Continue | input | yes (0.5 s) | - | 0 | 11.5 / 600 | 106 | 0 | - | - | **PASS** |
| 1 | den-ducks.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 20.6 / 600 | 100 | 0 | - | - | **PASS** |
| 1 | den-raccoons.s2 | C: wait until the slice is cold | input | yes (61.3 s) | naps 2, helped: nap round | 3 | 154.5 / 600 | 105 | 0 | - | - | **PASS-HELPED** |
| 1 | den-raccoons.s3 | Q: save, quit, Continue | input | yes (0.7 s) | - | 0 | 67.8 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | den-racers.s2 | Q: save, quit, Continue | input | yes (0.1 s) | - | 0 | 71.3 / 600 | 70 | 0 | - | - | **PASS** |
| 1 | den-racers.s2.alt | F: stop mid-race (lose the wheels race) | input | yes (153.1 s) | keeper 1, tow 1, naps 1 | 1 | 140.1 / 600 | 156 | 0 | - | - | **PASS** |
| 1 | den-rats.s3 | C: wait until the slice is cold | input | yes (60.2 s) | - | 0 | 79.8 / 600 | 27 | 0 | - | - | **PASS** |
| 1 | den-rats.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 18.6 / 600 | 55 | 0 | - | - | **PASS** |
| 1 | den-rhoda.s2 | F: leave the Meer 75 m+ mid-fight | input | yes (12.6 s) | naps 1 | 0 | 32.1 / 600 | 70 | 0 | - | - | **PASS** |
| 1 | den-rhoda.s2 | Q: save, quit, Continue | input | yes (-17.4 s) | naps 1 | 0 | 33.2 / 600 | 72 | 0 | - | - | **PASS** |
| 1 | den-songbirds.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 42.7 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | den-turtles.s2 | Q: save, quit, Continue | input | yes (-6.4 s) | - | 0 | 11.1 / 600 | 98 | 0 | - | - | **PASS** |
| 1 | gear-headlamp.s2 | Q: save, quit, Continue | input | yes (0.6 s) | naps 1 | 0 | 81.4 / 600 | 87 | 0 | - | - | **PASS** |
| 1 | gear-headlamp.s2 | W: drop the key over the Reservoir | input | yes (13.6 s) | keeper 1, naps 1 | 0 | 99.5 / 600 | 65 | 0 | - | - | **PASS** |
| 1 | gear-pen.s2 | A: wander 120 m off for 2 min | input | yes (138.6 s) | - | 0 | 16.6 / 600 | 64 | 0 | - | - | **PASS** |
| 1 | gear-pen.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 29.1 / 600 | 161 | 0 | - | - | **PASS** |
| 1 | gear-sunglasses.s1 | Q: save, quit, Continue | input | yes (0.4 s) | - | 0 | 120 / 600 | 108 | 0 | - | - | **PASS** |
| 1 | part-beak.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 17.6 / 600 | 56 | 0 | - | - | **PASS** |
| 1 | part-beak.s2 | W: drop the sticker on the shed roof | input | NO: still carrying sticker | - | 0 | 19.1 / 600 | 25 | 0 | - | - | **PASS** |
| 1 | part-body.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 96.9 / 600 | 119 | 0 | - | - | **PASS** |
| 1 | part-body.s3 | V: wedge the cart off the route and leave it | input | yes (18.6 s) | - | 0 | 102.4 / 600 | 22 | 0 | - | - | **PASS** |
| 1 | part-legs.s2 | Q: save, quit, Continue | input | yes (0.6 s) | naps 1 | -1 | 0 / 600 | 112 | 0 | - | - | **PASS** |
| 1 | part-power.s3 | O: Ask the geese before the dove is out | input | yes (12.6 s) | - | 0 | 46.6 / 600 | 39 | 0 | - | - | **PASS** |
| 1 | part-power.s3 | Q: save, quit, Continue | input | yes (0.7 s) | - | 0 | 29.5 / 600 | 110 | 0 | - | - | **PASS** |
| 1 | part-wings.s1 | W: drop the sail over Conservatory Water | input | yes (5 s) | keeper 2 | 0 | 27.6 / 600 | 61 | 0 | - | - | **PASS** |
| 1 | sab-middle.s1 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 4 / 600 | 79 | 0 | - | - | **PASS** |
| 1 | sab-middle.s1 | W: drop the gate-key over the Lake | input | yes (5.5 s) | keeper 1 | 0 | 15.1 / 600 | 8 | 0 | - | - | **PASS** |
| 1 | sab-north.s1 | Q: save, quit, Continue | input | yes (0 s) | naps 1 | 0 | 11.5 / 600 | 106 | 0 | - | - | **PASS** |
| 1 | say-cheese.s2 | Q: save, quit, Continue | input | yes (0.1 s) | - | 0 | 23.6 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | truce-cats-rats.s3 | Q: save, quit, Continue | input | yes (0.5 s) | - | 0 | 267.7 / 600 | 178 | 0 | - | tracked scheme changed to den-songbirds | **PASS** |
| 2 | den-horses.s2 | Q: save, quit, Continue | input | yes (-3.6 s) | - | -1 | 0 / 600 | 68 | 0 | - | - | **PASS** |
| 2 | den-meermob.s2.alt | Q: save, quit, Continue | input | yes (0.6 s) | naps 1 | 0 | 47.7 / 600 | 148 | 0 | - | NUDGE-WRONG: the compass points at bigsal, the slice lies at 49, 1066 | **PASS** |
| 2 | den-squirrels.s2 | Q: save, quit, Continue | input | yes (0.1 s) | - | 0 | 30.6 / 600 | 67 | 0 | - | - | **PASS** |
| 2 | den-strix.s2 | F: flap in the stealth until spotted | input | yes (3.9 s) | naps 1 | 0 | 74.8 / 600 | 21 | 0 | - | - | **PASS** |
| 2 | den-strix.s2 | Q: save, quit, Continue | input | yes (-5.3 s) | naps 1 | 0 | 81.8 / 600 | 69 | 0 | - | - | **PASS** |
| 2 | part-body.s2 | F: fly off mid-fight (Vinnie spots Rigby) | input | yes (3 s) | naps 1 | 0 | 38.1 / 600 | 18 | 0 | - | - | **PASS** |
| 2 | part-eyes.s1 | Q: save, quit, Continue | input | yes (0.2 s) | - | -1 | 0 / 600 | 107 | 0 | - | - | **PASS** |
| 2 | part-talons.s2 | O: pay Rigby before the garage door | input | yes (30.1 s) | naps 1 | 0 | 26.6 / 600 | 91 | 0 | - | - | **PASS** |
| 2 | part-talons.s3 | Q: save, quit, Continue | input | yes (0.1 s) | naps 1 | 0 | 98.3 / 600 | 100 | 0 | - | - | **PASS** |
| 2 | part-wings.s2 | W: drop the shiny over the Lake | input | yes (8 s) | keeper 1, naps 1 | 0 | 37.2 / 600 | 25 | 0 | - | - | **PASS** |
| 2 | part-wings.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 40.2 / 600 | 145 | 0 | - | - | **PASS** |
| 2 | part-wings.s3 | V: leave the RC tug on the far side | input | yes (9 s) | - | 0 | 46.2 / 600 | 159 | 0 | - | - | **PASS** |
| 2 | truce-cats-rats.s3 | W: drop the box over Harlem Meer | input | yes (34.2 s) | keeper 1, naps 1 | 3 | 600.6 / 600 | 195 | 0 | - | compass not at the box (lies at -129, 255) | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"} |
| 2 | truce-dogs-squirrels.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 59.3 / 600 | 83 | 0 | - | - | **PASS** |
| 2 | truce-dogs-squirrels.s3 | W: drop the tennis-sack over the Lake | input | yes (8 s) | keeper 1 | 0 | 70.8 / 600 | 63 | 0 | - | compass not at the tennis-sack (lies at -42, 283) | **PASS** |
| 3 | den-crows.s2 | Q: save, quit, Continue | input | yes (0 s) | - | 0 | 54.7 / 600 | 89 | 0 | - | - | **PASS** |
| 3 | den-geese.s2 | Q: save, quit, Continue | input | yes (0.5 s) | naps 1 | 0 | 14.1 / 600 | 90 | 0 | - | - | **PASS** |
| 3 | den-racers.s2 | F: lose the race | input | yes (62.3 s) | - | 0 | 83.4 / 600 | 24 | 0 | - | - | **PASS** |
| 3 | part-talons.s3 | V: wedge the Zamboni in a rink corner and leave it | input | yes (23.1 s) | naps 1 | 0 | 103.3 / 600 | 85 | 0 | - | - | **PASS** |
| 3 | prologue.s2 | Q: save, quit, Continue | input | yes (-4.4 s) | - | -1 | 0 / 600 | 81 | 0 | - | - | **LEFTOVERS** |
| 4 | den-biscuit.s3 | F: leave Cedar Hill mid-fight | input | yes (12 s) | - | 0 | 36.7 / 600 | 15 | 0 | - | - | **PASS** |
| 4 | den-ducks.s3 | W: drop the peas over the Lake | input | yes (7.5 s) | keeper 1 | 0 | 34.2 / 600 | 17 | 0 | - | - | **PASS** |
| 4 | den-meermob.s2.alt | C: wait until the slice is cold | input | yes (59.7 s) | naps 1 | 3 | 225 / 600 | 139 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"coo: nothing spent / slice NOT at hand"} |
| 4 | den-raccoons.s3 | W: drop the wrench over Turtle Pond | input | yes (7.5 s) | keeper 1 | 0 | 79.8 / 600 | 14 | 0 | - | - | **PASS** |
| 4 | den-rhoda.s3 | C: wait until the slice is cold | input | yes (59.8 s) | naps 3, helped: nap round | 3 | 235.4 / 600 | 132 | 0 | - | - | **PASS-HELPED** |

## Not passed

- **truce-cats-rats.s3 W** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"}
  Reproduce: a job file `mistake truce-cats-rats.s3 W` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (truce-cats-rats.s3-W.png / .json).
  Oracle: {"checks":{"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"},"fails":[],"ok":true}
- **den-meermob.s2.alt C** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"coo: nothing spent / slice NOT at hand"}
  Reproduce: a job file `mistake den-meermob.s2.alt C` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-meermob.s2.alt-C.png / .json).
  Oracle: {"checks":{"item":"renews","phase":"ok","trigger":"coo: nothing spent / slice NOT at hand"},"fails":[],"ok":true}
