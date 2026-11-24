# Mistake sweep (#23): a fumbling player can still finish every puzzle

Plan: design/changes/mistake-sweep.md (rounds, one browser). Tool: `node game/tools/mistake-sweep.mjs` (jobs / collect) over
`node game/tools/sf-run.mjs serve` jobs `mistake <case> <code>`; cases, injections, recovery and checks in src/debug/mistakes.js.
Each run: the step's fixture → its goal script to the most loaded moment → ONE mistake (real inputs; Ruffled outside a fight is the
one poke, G.hurt) → the goal script again, planned from wherever things are, until the step's flag. Times are game seconds.

Totals: FAIL-SCRIPT 11 · PASS 35 · LEFTOVERS 5 · HARNESS 5 · PASS-HELPED 2 (58 runs)

Columns: mistake took (game s it took) · recovery (keeper put-backs, sill refills, tows, naps, what repairSpent put back on a Continue,
and any help the driver needed) · retries (re-plans after a stuck goal) · game s / cap (max(600, 3 x the recorded step) after the
mistake) · wall s · console errors · loops (a toast 4x in 60 s, the keeper putting the same item back 3+ times, the step script
starting 4+ times, Ruffled after the mistake) · nudge (the compass, the keeper's toast, the cold card, the nudge after a failure).

| Round | Case | Mistake | Route | Took | Recovery | Retries | Game s / cap | Wall s | Errors | Loops | Nudge | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | den-biscuit.s3 | F: leave Cedar Hill mid-fight | input | yes (12 s) | naps 1 | 3 | 290.7 / 600 | 147 | 0 | step script started 4 times; Ruffled 3x after the injection | compass not at the ball (lies at 54, 398) | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"lying on dry ground","phase":"ok","trigger":"reach: nothing spent"} |
| 1 | den-biscuit.s3 | Q: save, quit, Continue | input | yes (-33.7 s) | - | 0 | 54.2 / 600 | 125 | 0 | - | - | **PASS** |
| 1 | den-cats.s3 | C: wait until the slice is cold | input | yes (57.2 s) | naps 1 | 0 | 118.5 / 600 | 79 | 0 | - | - | **PASS** |
| 1 | den-cats.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 60.8 / 600 | 75 | 0 | - | - | **PASS** |
| 1 | den-choir.s2 | Q: save, quit, Continue | input | yes (0.5 s) | - | 0 | 11.5 / 600 | 106 | 0 | - | - | **PASS** |
| 1 | den-crows.s2 | Q: save, quit, Continue | input | yes (0 s) | naps 1 | 3 | 141.6 / 600 | 164 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"phase":"ok","trigger":"shiny at hand"} |
| 1 | den-ducks.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 20.6 / 600 | 100 | 0 | - | - | **PASS** |
| 1 | den-ducks.s3 | W: drop the peas over the Lake | input | yes (7.5 s) | keeper 1 | 0 | 34.2 / 600 | 11 | 0 | - | NUDGE-WRONG: the compass points at puddles, the peas lies at 46, 293 | **PASS** |
| 1 | den-geese.s2 | Q: save, quit, Continue | input | yes (0.5 s) | naps 1 | 0 | 253.1 / 600 | 164 | 0 | - | - | **LEFTOVERS** |
| 1 | den-horses.s2 | Q: save, quit, Continue | input | yes (-3.9 s) | - | -1 | 0 / 600 | 90 | 0 | - | - | **LEFTOVERS** |
| 1 | den-meermob.s2.alt | C: wait until the slice is cold | input | yes (59.7 s) | naps 1 | 3 | 232 / 600 | 125 | 0 | - | NUDGE-WRONG: the compass points at bigsal, the slice lies at 49, 1066 | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"coo: nothing spent / slice at hand"} |
| 1 | den-meermob.s2.alt | Q:  | - | - | - | - | - / 600 | 115 | - | - | - | **HARNESS**: never reached the mark: none / none / none / none / none / none |
| 1 | den-raccoons.s2 | C: wait until the slice is cold | input | yes (61.3 s) | naps 2, helped: nap round | 3 | 154.5 / 600 | 105 | 0 | - | - | **PASS-HELPED** |
| 1 | den-raccoons.s3 | Q: save, quit, Continue | input | yes (0.7 s) | - | 0 | 67.8 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | den-raccoons.s3 | W: drop the wrench over Turtle Pond | input | yes (7.5 s) | keeper 1 | 0 | 79.8 / 600 | 15 | 0 | - | NUDGE-WRONG: the compass points at rigby, the wrench lies at -42, 429 | **PASS** |
| 1 | den-racers.s2 | F: lose the race | input | NO: races lost: 0 | - | 1 | 123.5 / 600 | 93 | 0 | - | - | **PASS** |
| 1 | den-racers.s2 | Q: save, quit, Continue | input | yes (0.1 s) | - | 0 | 71.3 / 600 | 70 | 0 | - | - | **PASS** |
| 1 | den-racers.s2.alt | F: stop mid-race (lose the wheels race) | input | yes (153.1 s) | keeper 1, tow 1, naps 1 | 1 | 140.1 / 600 | 156 | 0 | - | - | **PASS** |
| 1 | den-rats.s3 | C: wait until the slice is cold | input | yes (60.2 s) | - | 0 | 79.8 / 600 | 27 | 0 | - | - | **PASS** |
| 1 | den-rats.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 18.6 / 600 | 55 | 0 | - | - | **PASS** |
| 1 | den-rhoda.s2 | F: leave the Meer 75 m+ mid-fight | input | yes (12.6 s) | naps 1 | 0 | 32.1 / 600 | 70 | 0 | - | - | **PASS** |
| 1 | den-rhoda.s2 | Q: save, quit, Continue | input | yes (-17.4 s) | naps 1 | 0 | 33.2 / 600 | 72 | 0 | - | - | **PASS** |
| 1 | den-rhoda.s3 | C: wait until the slice is cold | input | yes (59.8 s) | naps 3, helped: nap round | 3 | 235.4 / 600 | 225 | 0 | - | compass not at the slice (lies at -125, 262) | **PASS-HELPED** |
| 1 | den-songbirds.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 42.7 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | den-squirrels.s2 | Q: save, quit, Continue | input | yes (0.3 s) | - | 1 | 602 / 600 | 238 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"phase":"ok","trigger":"hazel.caches3 not yet (redo the action)"} |
| 1 | den-strix.s2 | F: flap in the stealth until spotted | input | yes (3.9 s) | naps 1 | 1 | 601.5 / 600 | 213 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"reach: nothing spent"} |
| 1 | den-strix.s2 | Q: save, quit, Continue | input | yes (-6.6 s) | naps 1 | 1 | 604.9 / 600 | 243 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"reach: nothing spent"} |
| 1 | den-turtles.s2 | Q: save, quit, Continue | input | yes (-6.4 s) | - | 0 | 11.1 / 600 | 98 | 0 | - | - | **PASS** |
| 1 | gear-headlamp.s2 | Q: save, quit, Continue | input | yes (0.6 s) | naps 1 | 0 | 81.4 / 600 | 87 | 0 | - | - | **PASS** |
| 1 | gear-headlamp.s2 | W: drop the key over the Reservoir | input | yes (13.6 s) | keeper 1, naps 1 | 0 | 99.5 / 600 | 65 | 0 | - | - | **PASS** |
| 1 | gear-pen.s2 | A: wander 120 m off for 2 min | input | yes (138.6 s) | - | 0 | 16.6 / 600 | 64 | 0 | - | - | **PASS** |
| 1 | gear-pen.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 29.1 / 600 | 161 | 0 | - | - | **PASS** |
| 1 | gear-sunglasses.s1 | Q: save, quit, Continue | input | yes (0.4 s) | - | 0 | 120 / 600 | 108 | 0 | - | - | **PASS** |
| 1 | part-beak.s2 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 17.6 / 600 | 56 | 0 | - | - | **PASS** |
| 1 | part-beak.s2 | W: drop the sticker on the shed roof | input | NO: still carrying sticker | - | 0 | 19.1 / 600 | 25 | 0 | - | - | **PASS** |
| 1 | part-body.s2 | F: fly off mid-fight (Vinnie spots Rigby) | input | yes (7.6 s) | naps 1 | 1 | 603.7 / 600 | 235 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"phase":"ok","human:vinnie":"out","trigger":"ask: nothing spent"} |
| 1 | part-body.s3 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 96.9 / 600 | 119 | 0 | - | - | **PASS** |
| 1 | part-body.s3 | V: wedge the cart off the route and leave it | input | yes (18.6 s) | - | 0 | 102.4 / 600 | 22 | 0 | - | - | **PASS** |
| 1 | part-eyes.s1 | Q:  | - | - | - | - | - / 600 | 148 | - | - | - | **HARNESS**: never reached the mark: none / none / none / none / none / none |
| 1 | part-legs.s2 | Q: save, quit, Continue | input | yes (0.6 s) | naps 1 | -1 | 0 / 600 | 112 | 0 | - | - | **PASS** |
| 1 | part-power.s3 | O: Ask the geese before the dove is out | input | yes (12.6 s) | - | 0 | 46.6 / 600 | 39 | 0 | - | - | **PASS** |
| 1 | part-power.s3 | Q: save, quit, Continue | input | yes (0.7 s) | - | 0 | 29.5 / 600 | 110 | 0 | - | - | **PASS** |
| 1 | part-talons.s2 | O: pay Rigby before the garage door | input | yes (30.1 s) | naps 1 | 1 | 604.5 / 600 | 157 | 0 | - | - | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"zamboni.rigged not yet (redo the action)"} |
| 1 | part-talons.s3 | Q: save, quit, Continue | input | yes (0.1 s) | naps 1 | 0 | 98.3 / 600 | 125 | 0 | - | - | **LEFTOVERS** |
| 1 | part-talons.s3 | V: wedge the Zamboni in a rink corner and leave it | input | NO: still driving | naps 1 | 0 | 89.3 / 600 | 128 | 0 | - | - | **LEFTOVERS** |
| 1 | part-wings.s1 | W: drop the sail over Conservatory Water | input | yes (5 s) | keeper 2 | 0 | 27.6 / 600 | 61 | 0 | - | - | **PASS** |
| 1 | part-wings.s2 | W:  | - | - | - | - | - / 600 | 76 | - | - | - | **HARNESS**: never reached the mark: none / none / none / none / none / none |
| 1 | part-wings.s3 | Q:  | - | - | - | - | - / 600 | 139 | - | - | - | **HARNESS**: never reached the mark: none / none / none / none / none / none |
| 1 | part-wings.s3 | V:  | - | - | - | - | - / 600 | 152 | - | - | - | **HARNESS**: never reached the mark: none / none / none / none / none / none |
| 1 | prologue.s2 | Q: save, quit, Continue | input | yes (-4.4 s) | - | -1 | 0 / 600 | 137 | 0 | - | - | **LEFTOVERS** |
| 1 | sab-middle.s1 | Q: save, quit, Continue | input | yes (0.6 s) | - | 0 | 4 / 600 | 79 | 0 | - | - | **PASS** |
| 1 | sab-middle.s1 | W: drop the gate-key over the Lake | input | yes (5.5 s) | keeper 1 | 0 | 15.1 / 600 | 8 | 0 | - | - | **PASS** |
| 1 | sab-north.s1 | Q: save, quit, Continue | input | yes (0 s) | naps 1 | 0 | 11.5 / 600 | 106 | 0 | - | - | **PASS** |
| 1 | say-cheese.s2 | Q: save, quit, Continue | input | yes (0.1 s) | - | 0 | 23.6 / 600 | 71 | 0 | - | - | **PASS** |
| 1 | truce-cats-rats.s3 | Q: save, quit, Continue | input | yes (0.5 s) | - | 0 | 267.7 / 600 | 178 | 0 | - | tracked scheme changed to den-songbirds | **PASS** |
| 1 | truce-cats-rats.s3 | W: drop the box over Harlem Meer | input | yes (34.2 s) | keeper 1, naps 1 | 3 | 600.6 / 600 | 258 | 0 | - | compass not at the box (lies at -129, 255) | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"} |
| 1 | truce-dogs-squirrels.s3 | Q: save, quit, Continue | input | yes (0.6 s) | naps 2 | 3 | 385.8 / 600 | 195 | 0 | - | compass not at the tennis-sack (lies at 71, 397) | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"} |
| 1 | truce-dogs-squirrels.s3 | W: drop the tennis-sack over the Lake | input | yes (7.5 s) | keeper 1, naps 2 | 3 | 377.2 / 600 | 158 | 0 | - | compass not at the tennis-sack (lies at -42, 283) | **FAIL-SCRIPT**: not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"} |

## Not passed

- **den-biscuit.s3 F** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"lying on dry ground","phase":"ok","trigger":"reach: nothing spent"}
  Reproduce: a job file `mistake den-biscuit.s3 F` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-biscuit.s3-F.png / .json).
  Oracle: {"checks":{"item":"lying on dry ground","phase":"ok","trigger":"reach: nothing spent"},"fails":[],"ok":true}
- **den-crows.s2 Q** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"phase":"ok","trigger":"shiny at hand"}
  Reproduce: a job file `mistake den-crows.s2 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-crows.s2-Q.png / .json).
  Oracle: {"checks":{"phase":"ok","trigger":"shiny at hand"},"fails":[],"ok":true}
- **den-meermob.s2.alt C** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"coo: nothing spent / slice at hand"}
  Reproduce: a job file `mistake den-meermob.s2.alt C` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-meermob.s2.alt-C.png / .json).
  Oracle: {"checks":{"item":"carried","phase":"ok","trigger":"coo: nothing spent / slice at hand"},"fails":[],"ok":true}
- **den-meermob.s2.alt Q** (HARNESS): never reached the mark: none / none / none / none / none / none
  Reproduce: a job file `mistake den-meermob.s2.alt Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-meermob.s2.alt-Q.png / .json).
- **den-squirrels.s2 Q** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"phase":"ok","trigger":"hazel.caches3 not yet (redo the action)"}
  Reproduce: a job file `mistake den-squirrels.s2 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-squirrels.s2-Q.png / .json).
  Oracle: {"checks":{"phase":"ok","trigger":"hazel.caches3 not yet (redo the action)"},"fails":[],"ok":true}
- **den-strix.s2 F** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"reach: nothing spent"}
  Reproduce: a job file `mistake den-strix.s2 F` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-strix.s2-F.png / .json).
  Oracle: {"checks":{"item":"carried","phase":"ok","trigger":"reach: nothing spent"},"fails":[],"ok":true}
- **den-strix.s2 Q** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","trigger":"reach: nothing spent"}
  Reproduce: a job file `mistake den-strix.s2 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (den-strix.s2-Q.png / .json).
  Oracle: {"checks":{"item":"carried","phase":"ok","trigger":"reach: nothing spent"},"fails":[],"ok":true}
- **part-body.s2 F** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"phase":"ok","human:vinnie":"out","trigger":"ask: nothing spent"}
  Reproduce: a job file `mistake part-body.s2 F` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-body.s2-F.png / .json).
  Oracle: {"checks":{"phase":"ok","human:vinnie":"out","trigger":"ask: nothing spent"},"fails":[],"ok":true}
- **part-eyes.s1 Q** (HARNESS): never reached the mark: none / none / none / none / none / none
  Reproduce: a job file `mistake part-eyes.s1 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-eyes.s1-Q.png / .json).
- **part-talons.s2 O** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"zamboni.rigged not yet (redo the action)"}
  Reproduce: a job file `mistake part-talons.s2 O` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-talons.s2-O.png / .json).
  Oracle: {"checks":{"item":"renews","phase":"ok","trigger":"zamboni.rigged not yet (redo the action)"},"fails":[],"ok":true}
- **part-wings.s2 W** (HARNESS): never reached the mark: none / none / none / none / none / none
  Reproduce: a job file `mistake part-wings.s2 W` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-wings.s2-W.png / .json).
- **part-wings.s3 Q** (HARNESS): never reached the mark: none / none / none / none / none / none
  Reproduce: a job file `mistake part-wings.s3 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-wings.s3-Q.png / .json).
- **part-wings.s3 V** (HARNESS): never reached the mark: none / none / none / none / none / none
  Reproduce: a job file `mistake part-wings.s3 V` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (part-wings.s3-V.png / .json).
- **truce-cats-rats.s3 W** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"}
  Reproduce: a job file `mistake truce-cats-rats.s3 W` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (truce-cats-rats.s3-W.png / .json).
  Oracle: {"checks":{"item":"renews","phase":"ok","trigger":"boxOpened: nothing spent"},"fails":[],"ok":true}
- **truce-dogs-squirrels.s3 Q** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"}
  Reproduce: a job file `mistake truce-dogs-squirrels.s3 Q` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (truce-dogs-squirrels.s3-Q.png / .json).
  Oracle: {"checks":{"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"},"fails":[],"ok":true}
- **truce-dogs-squirrels.s3 W** (FAIL-SCRIPT): not finished; the oracle says the step is still doable: {"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"}
  Reproduce: a job file `mistake truce-dogs-squirrels.s3 W` for `node game/tools/sf-run.mjs serve`; screenshot and save in the fail dir (truce-dogs-squirrels.s3-W.png / .json).
  Oracle: {"checks":{"item":"carried","phase":"ok","human:dogwalker":"out","trigger":"drop: nothing spent"},"fails":[],"ok":true}
