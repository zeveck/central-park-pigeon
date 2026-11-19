# Fixes-3 progress (crash-safe notes; the fixer keeps this current)

Scope: bughunter-2 B1–B6, playtester-2 R1, R2, R4–R10 (R3 DROPPED by the coordinator after the container restart:
a separate "flow & fun" pass redesigns the early game). Sweep tool: game/tools/midscene-sweep.mjs.

## Done in code (verified in the browser before the restart unless noted)
- B1: main.js G.autosave never saves mid-scene (forced or not); waits (savePending) and saves when the scene ends; nest
  toast "saves when this scene is over". snapshot() writes saveRev 3. continueGame → G.schemes.repairSpent({old}):
  re-arms spent clues/trades, unparks hauls, fixes counts, drops a pickup item, hands back a scripted give's item for
  OLD saves only when Gus stands by the taker. VERIFIED: old den-ducks save → peas back; far / new saves untouched;
  gear-pen trade, den-turtles clue re-armed.
- B5: repairSpent finishes a scheme whose step index ≥ its step count (part-power old step 4: VERIFIED → done, part
  power). Dead battery clue removed from layout.js.
- B2: cutscene.run(name, beats, onDone, onCancel) + G.cutscene.onCancel(fn); G.abandonScene() (main.js) used by
  applyState and quitToTitle (timers, cutscene cancel, finale abort, mods' abandon(), audio.stopLoops(), overlays,
  body classes, camera, touch labels). vehicles.abandon()/restore reset scripted, tilt, auto drive, loops. Rink Job,
  den-rats relay, part-talons stock: onCancel cleanups. market.restore sets stall visibility at once.
- B3: via abandonScene (vehicle exit silent, labels, loops).
- B4: setGraphics(g, {auto}) keeps 'auto-<g>'; boot migrates the bug's footprint; Settings compares the real preset.
  VERIFIED (unforced load → auto-low, "auto stepped down").
- B6: board/map Back pops to Pause when opened from it.
- R1: Nap prompt hidden until the Prologue is done; sign scene walks Gus to 1 m in front of S1, camera behind (VERIFIED).
- R2: swarm targets nearest mobbable person within 5.5 m in a wide cone; ring while F held; toast if nobody (VERIFIED).
- R4: city storefront signs: UVs normalised + flipped (VERIFIED, shot design/screenshots/fixes-3/r4-after-slice-sign.png).
- R5: humans.js: sitters without a seat get an instanced bench; chess on stools.
- R6: interact.js: carrying, talk targets lose to world actions.
- R7: map opens zoomed round Gus, "Whole park" toggle, bigger grate / subway icons.
- R8: Zamboni glances off boards (half speed), freeze ring over sprayed pile, HUD hidden on the launch arc, 92 strips.
- R9: stomp camera centred + persistent step-over prompt; shout: Mecha on deck's south edge facing camera, spire dulled,
  Mecha layers re-enabled in the ESB scene (detail-cull had hidden Gus), head eases forward for the hero shot, bread =
  toast slices; wedding: scatter away from the wedge, photo at real offsets mid-run, veil a trailing tulle (no disc),
  basket at the planner's hand. (VERIFIED by shots in scratchpad/fix3/.)
- R10: tracked scheme follows progress.
- sf-run.mjs: Network.enable before setCacheDisabled (the cache was NOT off before; a reload ran stale modules).

## To do
- R3 reverted (done after the restart; check-schemes passes).
- Notes in main.js "Fixes-3", STATUS.md line.
- Sweep (all scripted steps + showpieces + finale stages) → design/reviews/fixes-3-midscene-sweep.md.
- Re-records (prologue for R1; others only if replays fail for a real input change) with backups in fix3-backup/.
- Replay all solutions; screenshots before/after in design/screenshots/fixes-3/.

## After the second restart (2026-11-19)
- Replays (design/reviews/fixes-3-replays.txt): 37/40 first pass; den-cats.alt completed (its line lost the flag only
  because the loop was restarted mid-job: rp2-den-cats.alt.out says completed true). Failed: prologue (R1, expected),
  part-power (stuck at step 2: the basket moved to the planner's hand, R9), part-talons (stuck driving at step 3: the
  Zamboni now glances off the boards, R8). All three RE-RECORDED (old copies + step fixtures in fix3-backup/).
- Sweep running (scratchpad/fix3/sweep.log → design/reviews/fixes-3-midscene-sweep.{json,md}).
- Sweep finished: 79 cases, design/reviews/fixes-3-midscene-sweep.{md,json}. No softlock; leftovers found and fixed
  (busyTalent, haul rings, rangers, Prickett, geese march). part-eyes skipped (no fixture, auto step).
- Final replays (after every code change): design/reviews/fixes-3-replays-final.txt: prologue, part-power, part-talons,
  den-cats.alt, den-rats, den-geese, den-ducks, den-cats, finale: 9/9 completed, 0 console errors.
- NOT replayed after the last shared-engine fixes (clues/characters/rangers/street restore paths): den-biscuit,
  den-choir, den-crows, den-horses(.alt), den-meermob(.alt), den-raccoons(.alt), den-racers(.alt), den-rhoda,
  den-songbirds, den-squirrels, den-strix, den-turtles, gear-headlamp, gear-pen(.alt), gear-sunglasses, part-beak(.alt),
  part-body, part-legs, part-wings(.alt), sab-middle, sab-north, truce-cats-rats(.alt), truce-dogs-squirrels
  (all passed in the first pass of this round, before those fixes). The flow & fun pass replays everything.
- Browser and server closed.
