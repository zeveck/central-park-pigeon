# Phase 7 Playtester findings (2026-11-18)
Screens: design/screenshots/review-playtester/r2-*.png. The reviewer's report follows the re-triage.

## Coordinator re-triage (reach × harm; overrides the reviewer's labels)
MUST-FIX, first 15 minutes (most players, confusing):
- P3 Prologue crumbs invisible (the first "eat" instruction can't be followed): spawn the pile in front of Gus, bigger, glow/sparkle, camera beat.
- P4 first flight from the start lamppost goes into a tree canopy: clear the line to S1 (move the tree/lamp), or start with a short climb.
- P5 talking to characters on the water (Puddles, the first recruit) needs a 0.3 m window: radius ≥3 m or from the nearest shore point, prompt while hovering (characters.js:62).
- P2 the map has no place names, but every goal is a place name: label explored zones/landmarks, always label places named by open cards, dim rings for untracked cards' targets (ui/map.js).
- P6 (the user's top priority: "clever bits, not just obvious fetch quests") the first recruit, Ducks Want Peas, reads out its own answer: add a small twist that combines two just-learned things (e.g. the picnickers only drop peas while the 6-bird flock swarms them), and keep the obstacle line as a riddle with the answer saved for the 3-minute nudge. Re-record the den-ducks solution and check-schemes.
MUST-FIX, climax/showpiece (every finisher):
- P1 finale city under the ESB climb/shout = grey void + identical noise cubes: reuse the far skyline, ground and street textures, a visible green Central Park to the north, frame the shout with the park and skyline behind.
- P7 Wedding: the dove release framed on sky (doves as specks), the polaroid misses the geese chaos, and a chore (raise the battery) follows the payoff against the design's "Showpieces end on the laugh": frame on the basket, take the photo during the stampede, the ducks surface the battery inside the stampede scene (schemes.js:275). Re-record part-power.
SHOULD-FIX (cheap, most players):
- P9 the sign post runs in front of the FEED THE BIRDS board, cutting the lettering (the central icon); camera behind sign backs (M7); phone title crops Gus's head.
- P8 HUD meter pills and a stale goal card stay up during cutscenes/showpieces/finale.
- P10 Dusk/Night: one ~90 s loop each; add the ambience-only gaps like DAY_GAP (audio.js:223). A second take needs audio generation (pending user approval of paid generation).
NICE: "F to gather your flock" tutor lingers; duplicate "E the sign" / "Peck the sign" prompts; raccoons near-black at Night in the Rink Job; "Press any key or button" under the title menu.

## Coordinator notes after Fixes-2 (for the next fix pass)
- after-P1-shout-hero.png: much better (park, rivers, skyline), but the Mecha is seen from BEHIND (wheels/rear plate; the cone points away), Gus isn't visible, the spire has a blown-out bright stripe, and the bread reads as flat yellow cubes. Want: Mecha facing the camera with Gus on its head, bread that reads as bread.
- after-P7-shot-of-the-century.png: works and is funny; a large glowing white disc with a dotted rim (the veil?) floats top-left in both the frame and the photo and reads as a glitch.
