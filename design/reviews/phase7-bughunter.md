# Phase 7 Bug hunter findings (2026-11-16)

## Coordinator re-triage (overrides the reviewer's labels below)
Rule: rate each finding on reach (how many players hit it, how often) × harm (softlock / lost progress > broken presentation > annoyance). Anything that can softlock or lose progress is a must-fix, and so is anything that most players will hit.

MUST-FIX, in order of how many players it hurts:
- #5 save-on-leave dead after the first grate trip (grates are core travel; phones kill tabs without warning) → lost progress for most players.
- #6 music doubling at zone edges and phase changes → heard by most players, often.
- #3 Prologue guidance lost on Continue or the auto graphics drop → new players on weak laptops are stuck in minute one.
- #4 the old game's timers leak into the next game, plus the cufflink softlock window (clues.js:724) → wrong progress and a possible softlock.
- #2 autosaves skipped after New Game in the same tab → lost progress.
- #7 service worker keeps stale assets after deploys → every returning player after each update.
- #1 phone rotate during load → the usual phone start path (phones are best-effort, but this is the first thing they see).
SHOULD-FIX: the small items (Ruffled pause/save at 0 feathers, Nap during Ruffled, Nest toast "saved" on failure).
NICE: #8, #9, #10, and the Options button not closing Pause.
Repro scripts: <scratchpad>/repro/ (run: playwright-cli -s=<session> run-code "$(cat <file>)"). Screens: design/screenshots/review-bughunter/.

1. MUST-FIX: rotating the phone during load leaves the canvas at its old size (393 px strip). main.js ~l.271 setSize at boot; resize listener only added at the end of boot() ~l.1271. Fix: add the listener early (guard camera/particles), or run the resize once before the title. Repro: iPhone 15, start in portrait, rotate after 25 s.
2. MUST-FIX: autosave throttle `lastSave` (main.js ~l.1108) is never reset on newGame/continueGame/loadState, so after New Game every non-forced autosave is skipped until the new clock passes the old one. Fix: reset in applyState() or use real time. Repro: autosave-after-newgame.js.
3. MUST-FIX: Continue during the Prologue intro (incl. AutoProbe → setGraphics('low') → saveNow+reload in the first 3 s on weak laptops) leaves the Prologue with no goal, tutor or open schemes: applyState nulls G.intro; the card is gated by prologue.card (schemes.js:56). Fix: rebuild the Prologue guidance on Continue when !prologue.card; delay AutoProbe until no scene is running; don't save mid-scene in setGraphics. Repro: pad-init.js.
4. SHOULD-FIX: quitToTitle runs cutscene onDone and never clears G.later timers, so old callbacks leak into the next game (e.g. gear-pen step 2 completes in a fresh New Game; "Pidgeley is here."). Also clues.js:724 sets clue.reveal.waiter immediately but spawns the cufflink 0.8 s later; saving in that window softlocks gear-pen step 1. Fix: clear timers in applyState and quitToTitle; skip without onDone; clear schemes.busy/fights/race; set the flag together with the spawn. Repro: timers-leak-step.js, timers-leak.js.
5. SHOULD-FIX: G.travel set by grateTravel (main.js ~l.877) is never cleared, so saveOnLeave (~l.1294) never saves again that session. Fix: clear at the end of the travel tick and in applyState. Repro: travel-save.js.
6. SHOULD-FIX: music A→B→A during decode plays two tracks; the orphan never fades (audio.js #startTrack ~l.150). Fix: request token, or fade out the existing src in #play. Repro: music-stack.js.
7. SHOULD-FIX: service worker: the fetch handler fills misses via the HTTP cache (Pages max-age=600) and stampedCopy labels stale content with the new hash; updates are one launch late with no reload prompt. Fix: fetch(req,{cache:'reload'}) / only stamp in fetchInto; controllerchange → "New version — reload" toast or reload at the title.
8. NICE: phone swipes on Board/Map/Settings pile up camera look and apply on resume (touch.js window listener). Fix: ignore while G.menus.open; clear look in input.reset(). Repro: phone-menu-swipe.js.
9. NICE: offline.js uses performance resource entries, capped at 250 (boot loads ~390). Fix: performance.setResourceTimingBufferSize(1000) early, or collect from the loaders.
10. NICE: the bare assets/models/ request = ModelRegistry.init() listFolder on localhost; it 404s on servers without listings and gets cached with ?sw=1. Fix: manifest.json first; folder listing only behind ?dev.
Small: pausing during Ruffled via blur → Save stores 0 feathers at the hazard; Nap not blocked by G.ruffling. The Nest toast says "saved" even when saveGame fails (quota). The Options button opens Pause but doesn't close it.
