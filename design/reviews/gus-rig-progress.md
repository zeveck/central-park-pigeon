# Gus rig progress

- 12:43 Started. Read builder notes (Land/perf), gus.js, neck-bend.js, scarf.js, wingbeat.js, gus-rig.js, finale gusMesh. Measured gus-stand vertex slices: feet y<0.02 (toes x ±0.03..0.105), legs y 0.02-0.05 at x≈±0.045, belly from 0.05, neck 0.17-0.22, head above 0.22 (z>0.05), tail z<-0.1.
- 12:53 Built anim/skin-rig.js (generic procedural SkinRig, detached bind) + entities/gus-skin.js (GusSkin: 9-bone stand rig, 3-bone fly rig, gait/head-thrust/idle/peck/flight legs). gus.js now poses through it; scarf wrap skinned via rig.makeMesh. First weight + walk sheets look sane; checking sliding next.
- 13:00 Capture sheets done (weights, walk side/front, fixed-cam ground, sprint, peck, idle, stop-turn, takeoff, landing, landing-close, fly-legs, scarf). No sliding (toe tips measured 0 mm drift in stance at walk and sprint), head held level (beak y constant to 0.1 mm). Starting replays (prologue, den-ducks, finale).
- 13:07 check-schemes passes (32 schemes, 86 steps). Replays running.
- 13:14 First replay batch exited cleanly but its pass line was cut by tail; re-running prologue/den-ducks/finale with the full result parsed.
- 13:28 Replays (cache off, port 8331): prologue, den-ducks, finale all completed with end positions identical to the recordings. In-game shots (mirrored root) ingame-walk-*.png / ingame-idle / ingame-peck look right. check-schemes passes. Server closed. Done.
