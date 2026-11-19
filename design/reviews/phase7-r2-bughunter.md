# Phase 7 round 2: Bug hunter (2026-11-18)
Repro scripts: design/reviews/bughunter-2-repro/ (run from /workspaces/gg-test1: playwright-cli -s=<s> run-code "$(cat <file>)"). Screens: design/screenshots/review-bughunter-2/.

## Coordinator re-triage (reach × harm)
MUST-FIX:
- B1 A non-forced autosave fires right after give/talent/trade/haul (takers.js:91; clues.js:566, 750, 689, 637) while the scripted step is still busy, so the item or clue is already spent but the step isn't done. Fixes-1 made this the save that survives leaving or Save & quit mid-scene, so Continue gives a PERMANENT softlock (verified on den-ducks step 3; the same pattern on many steps). Fix: G.autosave skips non-forced saves while G.midScene() / schemes.busy; plus a backstop in continueGame that repairs a step whose trigger is spent (return the item, re-arm the clue). Repros: give-autosave-midscript.js, give-then-save-quit.js.
- B2 Leaving during the Rink Job (cutscene.cancel drops onDone) leaves zamboni.scripted=true (the Zamboni won't move after Continue → softlock until reload) and the cab-horn loop playing forever on the title and in the next game. Fix: vehicles.restore resets scripted; keep the horn handle reachable and stop it on restore; add an onCancel cleanup hook to cutscenes and audit the other setpieces/finale for the same pattern. Repros: rink-zamboni-frozen.js, rink-horn-loop.js.
SHOULD-FIX:
- B4 The auto-probe step-down overwrites the stored preset with a plain 'low', so Auto is locked out forever while Settings still shows Auto and ignores clicks (main.js:1014-1016, 1355; presets.js:38-42; screens.js:177). Any desktop that stutters once stays on Low for good.
- B3 Save & quit while driving leaves the engine loops and the Gas/Brake/Out/Dump touch labels on the title. Fix: exit the vehicle silently and reset the labels in quitToTitle. Repro: vehicle-loop-on-title.js.
- B6 Back from Board/Map opened from Pause skips Pause (board.js:147, map.js:206 use closeMenus; others pop). Controller players get unpaused unexpectedly.
- B5 save migrate(): mark schemes whose step index ≥ step count as done (old part-power step-4 saves); remove the dead battery clue (layout.js:767).
