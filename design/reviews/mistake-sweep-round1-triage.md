# Mistake sweep, round 1: triage

The generated results are in design/reviews/mistake-sweep.md (rewritten by `mistake-sweep.mjs collect`). This file says what each
verdict means after tracing; it is not regenerated.
## Round 1 triage (coordinator, 2026-11-24; traced in the browser where marked)

**No FAIL-GAME.** No mistake left a step undoable. The oracle agreed "still doable" on every FAIL-SCRIPT. But the sweep
found **2 game bugs** behind FAIL-SCRIPTs (the step fails with no mistake at all) and **4 things to check**. Ranked by reach × harm:

Game bugs (confirmed by trace or probe):
1. **den-strix: the stealth crossing's first moss island is in the Lake under Bow Bridge** (RAMBLE_STEALTH.islands[0],
   -29.4, 330.6). The crossing starts there, and every Strix catch puts Gus back there, in the water at y -1.0 under the deck.
   Since 5e57455 (#27: collision water = drawn water); the island was always drawn in the water. Only island 0 is wet (all
   moss, leaves, other islands and the branch are dry). Every den-strix player meets it. Not a hard dead end (he can wade east).
2. **truce-dogs-squirrels: the Cedar Hill dog walker walks through the 79th St transverse cut**, down to -6.5 and up its walls
   (her loop's legs cross the cut where there's no deck). Since 25c314c (people on the real ground). Following her with the
   heavy sack pins Gus at the cut's rim, 2 m below her, and the drop there doesn't count. Step 3 fails from its own fixture
   with no mistake (trace). The old recording dodged it by timing.

To check (could be game issues):
3. **Compass after a dropped item** (NUDGE-WRONG ×3 + "compass not at" ×2): the compass keeps pointing at the character, not
   at the dropped item the step needs. Every player who drops one.
4. **den-squirrels.s2 Q**: after a clean Continue, the autopilot's pecks at Hazel's caches never land. Is the caches'
   "seen from above" state lost on a Continue?
5. **Continue lands ahead of the quit** (negative "Took" on Q: den-biscuit −33.7 s, den-rhoda −17.4 s, den-horses −3.9 s), and on
   prologue.s2 / den-horses.s2 the step's scene is already playing right after Continue (by design, a scene repair?).
6. **Zamboni in a rink corner** (part-talons.s3 V, mistake didn't take): Peck didn't get Gus out for 20 s. Exit is refused
   only mid-hop, so a hop loop against the corner boards is suspected.

Not game issues (autopilot / harness), fixes drafted or done:
- Fixed during the round: an overlay counted with any class (#fade keeps .nap) and timed overlays checked too early (aac4947,
  e76644d); every mistake and recovery that started mid-fight waited 120 s on idle (a fight keeps its scheme busy), seen as Gus
  frozen in the Biscuit and Strix fights (c7bc08a). den-biscuit.s3 F and den-strix.s2 F were re-run on the fix.
- LEFTOVERS ×5 (part-talons.s3 ×2, prologue.s2, den-horses.s2, den-geese.s2): the settle stops the autopilot, so a dialogue that
  opens at the step's end (e.g. the auto part-eyes scene) never closes. Fix: settle with the autopilot on.
- HARNESS ×5: part-wings s2/s3 ×3 (planner/segment, being traced); den-meermob.alt Q (lands on the far side of the Blockhouse wall
  from Big Sal); part-eyes Q (sab-middle's goals have no 'sab-middle.s1' wait, so step 1 replays).
- FAIL-SCRIPT, autopilot: walkTo has no stall handling (part-body.s2 F, a bench); the planner replays a spent source (part-talons.s2
  O Carriage Line slice, den-crows.s2 Q ledge shiny, truce-cats-rats.s3 W box from the shelf); stealthCross pushes into a solid
  (den-strix ×2, also bug 1); can't win a restarted Biscuit fight (den-biscuit.s3 F); den-meermob.alt C (as its Q).
  Untimed pecks hung 4 runs.
- PASS-HELPED ×2 (cold slice → nap): by design; bench tourists get a slice back only on a phase change.
- den-racers.s2 F is marked PASS but its mistake didn't take ("races lost: 0"): untested, not a pass.

Next: the two game fixes (re-record den-strix and truce-dogs-squirrels closed loop), then the harness/autopilot fixes, then
round 2: re-run every non-PASS case above + the checks 3–6.

## Rounds 2 and 3 (2026-11-24): where things stand

Every round-1 non-PASS was re-run on the fixed world and harness (22 runs), then a short round 3 for the cases its fixes
touched. Latest result per case (design/reviews/mistake-sweep.md): **PASS 53 · PASS-HELPED 2 · FAIL-SCRIPT 2 · LEFTOVERS 1 ·
FAIL-GAME 0** (58 cases).

Game bugs fixed (each re-recorded closed loop, new recordings replay to completion):
1. The Strix crossing's first island was in the Lake → moved to dry ground (30a2b66).
2. The Cedar Hill dog walker walked through the 79th St cut → her loop stays on the hill (30a2b66).
3. **New in round 2: two sails from the duck.** The sail-1 dive set its flag at the dive; while the duck swam back the item
   keeper "put the sail back" at the shore, then the duck handed Gus another, so a stray sail stayed at the shore after
   delivery. The keeper now waits while an ally is bringing an item back (4100b3c).

Also found: den-biscuit's and den-racers.alt's raw recordings had drifted after fix batch F (not from these fixes: an A/B
with the dog walker's old loop failed identically); both re-recorded (ec8d2c1). Other recordings may have drifted too
(batch F's proof covered closed-loop runs of three schemes and one raw sample).

Checks closed: Hazel's caches after a Continue (not a save bug: the autopilot
re-pecked a found cache), the Zamboni corner (exit works at once; the harness's wedge test never fired), den-geese's nap after a
Continue (the autopilot re-pecked a flipped sign).

Still open:
- **Compass after a dropped item** (NUDGE-WRONG ×3, "compass not at" ×2 in round 1): the compass keeps pointing at the
  character, not at the item the step needs. Every player who drops one; a UX fix, not done here.
- **prologue.s2 Q LEFTOVERS:** after a save/quit inside the Prologue's last scene, the Continue replays it and the +1 CREW
  polaroid stays up. Low reach; needs a trace through continueGame.
- **Continue lands ahead of the quit** on some Q runs (negative "Took", e.g. den-biscuit −33.7 s): not traced.
- FAIL-SCRIPT, autopilot only: truce-cats-rats.s3 W (it fetches a box from the shelf instead of Asking the cats) and
  den-meermob.s2.alt C (a cold slice costs a phase on a one-slice-per-phase step; the harness's attempts run out). Both
  oracles say doable.
- Stealth design note (review): with island 0 moved, a leaf pile sits 0.23 m outside its rim on the way east, and the first
  moss pad is now behind the start.
