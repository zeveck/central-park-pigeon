# Phase 7 round 2: Playtester (2026-11-18)
Screens: design/screenshots/review-playtester-2/. The reviewer's full report is relayed in the coordinator log; summary and re-triage below.

## Coordinator re-triage (reach × harm)
MUST-FIX:
- R1 First 30 s: after the prologue-sign scene Gus is at (92,22), 4 m past S1 (92,18), with the camera facing away. "E the sign" does nothing until you turn and walk back. Also "E Nap" shows on the lamppost under "Space to fly" on the first frame. Fix: end the scene with Gus ~1 m in front of S1, facing it, camera behind; hide Nap until the Prologue is done (schemes/prologue.js 79–93; layout.js:586).
- R2 Hold-Coo swarm aims at a fixed point 3 m ahead (main.js 797–808), so standing 2 m from the target off-axis silently fails. It's the core early verb. Fix: target the nearest fleeable human within ~5 m in a wide forward cone, show a ring on the target while F is held, toast "Nobody close enough to mob" otherwise.
- R4 City-ring storefront signs ("$1 SLICE", "DELI GROCERY") are mirrored: city.js signMaterial (437–456) doesn't flip for the mirrored root. Sweep all code-drawn texts (Prickett van, rink PA, banners, finale, etc.).
SHOULD-FIX (high value):
- R3 The first hour is samey: Sue, the ducks' peas (the Fixes-2 twist) and Queenie's anchovy step 2 all = "mob a human with the flock". The user's top priority is FUN + clever, not repetitive. Keep the swarm for Sue (the lesson). Give the ducks' peas and the anchovy fan each a DIFFERENT small, clever catch using things available at that point (the sign flip, the rats' grate relay, Pickles/cat distraction, nap/phase timing, a Call from a recruited ally...). Each of the first ~4 recruits should teach or use a different trick. Keep it casual: a riddle-ish card, the answer in the 3-minute nudge. Update data/schemes.js, dialogue, goal scripts, GAME_DESIGN.md; re-record the affected solutions; check-schemes (4 open after the Prologue).
- R6 With an item carried, world actions (grate travel, give, pick up) must win the E prompt over "Talk to <regular>" (Express sits on the 72nd W grate during the 60 s hot-slice run; Chip at the slice joint).
- R5 Seated people on thin air, incl. puzzle targets: the Columbus slice tourist (SLICE.joints[].bench) and the Boathouse picnickers (P(42,302), people.js:46). Give act:'sit' agents a seat prop automatically (bench/picnic table/blanket).
- R10 Goal tracking: when a scheme's step 1 completes, track it; when the tracked one finishes, track the most recently progressed open scheme.
- R9 Staging:
  - Wedding guests stand in a neat line during the stampede (flee outward from the wedge, pose mid-run in the photo); the planner's basket floats ~1 m from her hand.
  - Stomp camera hugs the left building (centre it) and add an "✕/Space to step over cabs" prompt.
  - The ESB spire runs through the Mecha in the shout. ALSO (coordinator): the shout hero shot sees the Mecha from BEHIND with Gus not visible, a blown-out spire stripe, and bread as flat yellow cubes. Want: Mecha facing camera, Gus on its head, bread that reads as bread.
  - Wedding photo has a glowing white dotted disc floating top-left (the veil?).
- R8 Rink Job: board hits stick and grind (vehicles.js 431–447; make them glance, keeping ~half speed); a freeze-progress ring on the pile while spraying (3 s); hide the driving HUD in the launch cutscene; double the strips in the avalanche.
- R7 The map opens too small: open zoomed to the player's zone; bigger grate icons (subway icon once the rats join).
