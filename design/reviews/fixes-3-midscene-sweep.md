# Fixes-3: quit mid-scene, then Continue (sweep)

Tool: `node game/tools/midscene-sweep.mjs` (one headless browser, port 8261, Low preset, 640×360). For every scheme step with a
scripted scene, the Rink Job and the Wedding at several points, and the finale's stages: the step's fixture is loaded and saved,
the scheme's goal script (real inputs) plays until the step's scene runs, then **(b)** Esc → Save & quit → Continue in the same
page (leftover check, and the world compared with a fresh boot of the same save), the goal script triggers the step again, and
**(a)** while that scene plays the page is hidden and reloaded → Continue → leftover check → the goal script completes the step.

"Continue state" is what the save held: the step it was on (the last autosave before the trigger: no save is made mid-scene).

## Reading the results (fixer's summary)

- **No case ends in a softlock.** After every quit (b: Save & quit, a: hide + close), Continue lands on the last autosave
  from BEFORE the trigger (no save is made mid-scene any more): the step is not done and its trigger is there again
  (an unspent clue, an open trade, the item at hand, or nothing consumable). For 52 of 79 cases the step's goal script then
  completed the step from the Continue'd save ("yes"); where a goal script can't pick up from a step fixture the
  scene was reached by replaying the recorded solution ("[via replay]") and the Continue'd save was checked instead
  ("trigger available: …", 26 cases). "redo the action" means the player has to do the step's action again (e.g. the Rink Job:
  launch the Zamboni again): rolled back, never stuck.
- **Leftovers after the in-page Continue: none,** except where an auto / flag step legitimately re-fires its scene the
  moment the game is back (prologue.s3, den-horses.s3, den-crows.s3: the column shows that scene starting).
  prologue.s1: a save from the first second of New Game restarts the opening (Fixes-1 design).
- **World diffs** "mod:clues/GroupN/Mesh3" are the dive tell's water spout, which blinks on a timer (benign). The
  diffs this sweep found and that are FIXED (the rows predate the fix where noted): rangers kept walking after a load
  (rangers.setPhase); Prickett left unscripted (street.setPhase; den-horses.s3 / part-talons.s1 rows are from before);
  a stale "huge item" ring and "Flock, lift it!" pointing at the old item (clues.restore; den-turtles); the geese's march
  column frozen on the lawn (den-geese restore/abandon); an ally whose talent was cut off refused every later Ask until
  a reload (characters.goHome clears busyTalent: found by den-songbirds.s2).
- **Skipped:** part-eyes.s1 (no fixture: an auto step after the second sabotage, nothing spent). Per the coordinator's
  scope trim, talk-only and auto scenes where nothing is spent were not re-run after the trim; all of them had run
  once already (above).
- Rows with "goalsFailed" in the JSON: the goal script couldn't start from that step fixture (a test-tool limit, not a
  game fault); those cases used the replay trigger.

| Case | Script | (b) quit in | (b) Continue state | (b) leftovers / world diff | trigger again | (a) quit in → Continue state | step completed after (a) |
|---|---|---|---|---|---|---|---|
| prologue.s1 | prologue.feeders | prologue-crumbs @0.5s | step 1 | cutscene: "prologue-intro"; bodyClass: ["cine"] | flip: nothing spent; scene started again | prologue-crumbs @1.22s → step 1; leftovers cutscene: "prologue-intro"; cameraLocked: true; bodyClass: ["cine"] | yes |
| prologue.s2 | prologue.frenzy | prologue-frenzy @0.52s | step 2 | none | signsLive: nothing spent; scene run again (replay from the fixture) [via replay] | prologue-frenzy @1.22s → step 2; leftovers none | trigger available: signsLive: nothing spent |
| prologue.s3 | prologue.end | prologue-end @0.52s | step 3 | none | auto: nothing spent; scene run again (replay from the fixture) [via replay] | prologue-end @1.22s → step 3; leftovers cutscene: "prologue-end"; busy: ["prologue"]; bodyClass: ["cine"] | trigger available: auto: nothing spent |
| den-ducks.s1 | ducks.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-ducks.s3 | ducks.join | ducks-join @0.5s | step 3, carrying peas | none | peas at hand; scene started again | ducks-join @1.2s → step 3, carrying peas; leftovers none | yes |
| den-raccoons.s1 | raccoons.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-raccoons.s2 | raccoons.wrench | (script) @0.52s | step 2 | none | trade wrench open / pickup: nothing spent; scene started again | (script) @1.22s → step 2; leftovers none | yes |
| den-raccoons.s3 | raccoons.join | raccoons-join @0.52s | step 3, carrying wrench | none | wrench at hand; scene started again | raccoons-join @1.22s → step 3, carrying wrench; leftovers none | yes |
| sab-middle.s1 | sab.middle.gate | (script) @0.52s | step 1 | none | boathouse.gateOpen not yet (redo the action); scene run again (replay from the fixture) [via replay] | (script) @1.22s → step 1; leftovers none | trigger available: boathouse.gateOpen not yet (redo the action) |
| sab-middle.s2 | sab.middle.done | (script) @0.52s | step 2 | none | clue cart-middle unspent; scene run again (replay from the fixture) [via replay] | (script) @1.22s → step 2; leftovers none | trigger available: clue cart-middle unspent |
| sab-north.s2 | sab.north.done | (script) @0.52s | step 2 | none | clue cart-north unspent; scene started again | (script) @1.22s → step 2; leftovers none | yes |
| part-eyes.s1 |  | ERROR: Error: page.evaluate: Error: no fixture part-eyes
    at Object.goToScheme (http://127.0.0.1:8261/src/debug.js:178:24)
    at async <anonymous>:381:23 | | | | | |
| den-choir.s1 | choir.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-choir.s2 | choir.signs | (script) @0.5s | step 2 | none | signsLive: nothing spent; scene started again | (script) @1.2s → step 2; leftovers none | yes |
| den-choir.s3 | choir.join | choir-join @0.5s | step 3 | none | coo: nothing spent; scene started again | choir-join @1.2s → step 3; leftovers none | yes |
| den-rats.s1 | rats.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-rats.s3 | rats.join | rats-relay @0.52s | step 3, carrying slice | none | slice at hand; scene started again | rats-relay @1.22s → step 3, carrying slice; leftovers none | yes |
| den-cats.s1 | cats.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-cats.s3 | cats.join | cats-join @0.52s | step 3, carrying slice-anchovy | none | slice-anchovy at hand / slice-anchovy at hand; scene started again | cats-join @1.22s → step 3, carrying slice-anchovy; leftovers none | yes |
| part-body.s1 | body.fedup | (script) @0.52s | step 1 | none | signsLive: nothing spent / slice NOT at hand; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| part-body.s2 | fight.vinnie | (script) @0.52s | step 2 | none | ask: nothing spent; scene started again | (script) @1.22s → step 2; leftovers none | yes |
| part-body.s3 | body.home | (script) @0.52s | step 3 | none | reach: nothing spent; scene started again | (script) @1.22s → step 3; leftovers none | yes |
| truce-cats-rats.s1 | catsrats.bins | (script) @0.5s | step 1 | none | reach: nothing spent; scene started again | (script) @1.2s → step 1; leftovers none | yes |
| truce-cats-rats.s3 | catsrats.truce | catsrats-truce @0.5s | step 3, carrying box | none | boxOpened: nothing spent; scene started again | catsrats-truce @1.2s → step 3, carrying box; leftovers none | yes |
| den-songbirds.s1 | songbirds.roost | songbirds-roost @0.5s | step 1 | none | reach: nothing spent; scene started again | songbirds-roost @1.2s → step 1; leftovers none | yes |
| den-songbirds.s2 | songbirds.cornice | (script) @0.5s | step 2 | none | spike.P3.cleared not yet (redo the action); scene run again (replay from the fixture) [via replay] | (script) @1.2s → step 2; leftovers none | trigger available: spike.P3.cleared not yet (redo the action) |
| den-songbirds.s3 | songbirds.jingle | songbirds-jingle @0.5s | step 3 | none | peck: nothing spent; scene run again (replay from the fixture) [via replay] | songbirds-jingle @1.2s → step 3; leftovers none | trigger available: peck: nothing spent |
| den-racers.s1 | racers.coach | racers-coach @0.5s | step 1 | none | talk: nothing spent; scene run again (replay from the fixture) [via replay] | racers-coach @1.2s → step 1; leftovers none | trigger available: talk: nothing spent |
| den-racers.s2 | racers.roost | (script) @0.5s | step 2 | none | spike.P2.cleared not yet (redo the action); scene run again (replay from the fixture) [via replay] | (script) @1.2s → step 2; leftovers none | trigger available: spike.P2.cleared not yet (redo the action) |
| den-racers.s3 | racers.won | (script) @0.5s | step 3 | none | race.won not yet (redo the action) / race.won not yet (redo the action); scene run again (replay from the fixture) [via replay] | (script) @1.2s → step 3; leftovers none | trigger available: race.won not yet (redo the action) / race.won not yet (redo the action) |
| den-racers.s4 | racers.feast | racers-feast @0.5s | step 4 | none | coo: nothing spent; scene run again (replay from the fixture) [via replay] | racers-feast @1.2s → step 4; leftovers none | trigger available: coo: nothing spent |
| den-horses.s1 | horses.trough | horses-trough @0.52s | step 1 | none | talk: nothing spent; scene run again (replay from the fixture) [via replay] | horses-trough @1.22s → step 1; leftovers none | trigger available: talk: nothing spent |
| den-horses.s2 | horses.vanOff | horses-vanoff @0.52s | step 2 | none | prickett.moved set (re-fires) / prickett.moved set (re-fires); scene started again | horses-vanoff @1.22s → step 2; leftovers none | yes |
| den-horses.s3 | horses.drink | horses-drink @0.52s | step 3 | none; world: char:clementine: [-12,-6.5] vs fresh [73.5,-7]; char:dapple: [-24,-6.5] vs fresh [74.5,-7]; char:bigben: [0,-6.5] vs fresh [75,-7]; prickett: [1,86.5,-10,0] vs fresh [1,86.5,-10,1] | auto: nothing spent; scene run again (replay from the fixture) [via replay] | horses-drink @1.22s → step 3; leftovers scriptedChars: ["clementine","dapple","bigben"]; cutscene: "horses-drink"; busy: ["den-horses"]; cameraLocked: true; bodyClass: ["cine"] | trigger available: auto: nothing spent |
| part-talons.s1 | rink.stock | rink-stock @0.52s | step 1 | none; world: prickett: [0,86.5,-10,0] vs fresh [0,86.5,-10,1] | reach: nothing spent; scene run again (replay from the fixture) [via replay] | rink-stock @1.22s → step 1; leftovers none | trigger available: reach: nothing spent |
| part-talons.s3@0.5 | setpiece.rinkjob | rinkjob @0.52s | step 3 | none | rink.launched not yet (redo the action); scene run again (replay from the fixture) | rinkjob @6.02s → step 3; leftovers none | trigger available: rink.launched not yet (redo the action) |
| part-talons.s3@14 | setpiece.rinkjob | rinkjob @14.02s | step 3 | none; world: mod:clues/Group10/Mesh3: 0 vs fresh 1 | rink.launched not yet (redo the action); scene run again (replay from the fixture) [via replay] | rinkjob @26.02s → step 3; leftovers none | trigger available: rink.launched not yet (redo the action) |
| den-turtles.s1 | turtles.rock | turtles-rock @0.5s | step 1 | none | talk: nothing spent; scene started again | turtles-rock @1.2s → step 1; leftovers none | yes |
| den-turtles.s2 | turtles.surfaced | (script) @0.5s | step 2 | none; world: mod:clues/Group7/Mesh3: 0 vs fresh 1 | clue turtle-cart unspent; scene started again | (script) @1.2s → step 2; leftovers none | yes |
| den-turtles.s3 | turtles.join | turtles-join @0.5s | step 3 | none | cart haulable; scene started again | turtles-join @1.2s → step 3; leftovers none | yes |
| den-geese.s1 | geese.arm | geese-arm @0.5s | step 1 | none | talk: nothing spent; scene started again | geese-arm @1.2s → step 1; leftovers none | yes |
| den-geese.s2 | geese.lawn | geese-lawn @0.5s | step 2 | none; world: mod:spikes-feuds/Mesh4: 1 vs fresh 0 | signsLive: nothing spent; scene run again (replay from the fixture) [via replay] | geese-lawn @1.2s → step 2; leftovers none | trigger available: signsLive: nothing spent |
| den-geese.s3 | geese.truce | geese-truce @0.5s | step 3 | none | auto: nothing spent; scene run again (replay from the fixture) [via replay] | geese-truce @1.2s → step 3; leftovers none | trigger available: auto: nothing spent |
| truce-dogs-squirrels.s1 | dogs.chase | dogs-chase @0.5s | step 1 | none | reach: nothing spent; scene started again | dogs-chase @1.2s → step 1; leftovers none | yes |
| truce-dogs-squirrels.s2 | dogs.cache | (script) @0.5s | step 2 | none | clue pecan-cache unspent; scene started again | (script) @1.2s → step 2; leftovers none | yes |
| truce-dogs-squirrels.s3 | dogs.balls | dogs-balls @0.5s | step 3 | none | drop: nothing spent; scene run again (replay from the fixture) [via replay] | dogs-balls @1.2s → step 3; leftovers none | trigger available: drop: nothing spent |
| part-legs.s1 | legs.marked | (script) @0.52s | step 1 | none | clue pipe-marks unspent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| part-legs.s2 | legs.dug | (script) @0.52s | step 2 | none | legs.dug not yet (redo the action); scene run again (replay from the fixture) | (script) @1.22s → step 2; leftovers none | trigger available: legs.dug not yet (redo the action) |
| part-power.s1@0.5 | wedding.intro | wedding-intro @0.52s | step 1 | none; world: mod:clues/Group8/Mesh3: 0 vs fresh 1 | reach: nothing spent; scene started again | wedding-intro @5.02s → step 1; leftovers none | yes |
| part-power.s2@0.5 | wedding.release | wedding-release @0.52s | step 2 | none | peck: nothing spent; scene started again | wedding-release @4.02s → step 2; leftovers none | yes (1 retry) |
| part-power.s3@0.5 | setpiece.wedding | wedding @0.52s | step 3 | none; world: mod:clues/Group10/Mesh3: 1 vs fresh 0 | ask: nothing spent; scene started again | wedding @8.02s → step 3; leftovers none | yes |
| part-power.s3@16 | setpiece.wedding | wedding @16.02s | step 3 | none | ask: nothing spent; scene started again | wedding @24.02s → step 3; leftovers none | yes |
| den-rhoda.s1 | rhoda.sal | rhoda-sal @0.5s | step 1 | none; world: mod:clues/Group8/Mesh3: 0 vs fresh 1 | talk: nothing spent; scene started again | rhoda-sal @1.2s → step 1; leftovers none | yes |
| den-rhoda.s2 | fight.rhoda | (script) @0.5s | step 2 | none | reach: nothing spent; scene run again (replay from the fixture) | (script) @1.2s → step 2; leftovers none | trigger available: reach: nothing spent |
| den-rhoda.s3 | rhoda.home | rhoda-home @0.5s | step 3 | none; world: mod:clues/Group10/Mesh3: 0 vs fresh 1 | clue walter-stairs unspent; scene run again (replay from the fixture) | rhoda-home @1.2s → step 3; leftovers none | trigger available: clue walter-stairs unspent |
| den-meermob.s1 | meer.flypast | (script) @0.52s | step 1 | none | meer.flypast not yet (redo the action); scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-meermob.s2 | meer.join | meer-join @0.52s | step 2 | none | coo: nothing spent / slice NOT at hand; scene started again | meer-join @1.22s → step 2; leftovers none | yes |
| den-squirrels.s1 | squirrels.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-squirrels.s3 | squirrels.join | squirrels-join @0.52s | step 3 | none | talk: nothing spent; scene started again | squirrels-join @1.22s → step 3; leftovers none | yes |
| den-crows.s1 | crows.meet | (script) @0.52s | step 1 | none | talk: nothing spent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| den-crows.s3 | crows.join | crows-join @0.52s | step 3, carrying shiny | none; world: char:ledger: [-7,363] vs fresh [-7,363.5]; char:glint: [-14,368] vs fresh [-13.5,368] | auto: nothing spent; scene started again | crows-join @1.22s → step 3, carrying shiny; leftovers scriptedChars: ["vesper","ledger","glint","cawdry"]; cutscene: "crows-join"; busy: ["den-crows"]; cameraLocked: true; bodyClass: ["cine"] | yes |
| den-biscuit.s3 | fight.biscuit | (script) @0.52s | step 3 | none; world: mod:clues/Group6/Mesh3: 0 vs fresh 1 | reach: nothing spent; scene run again (replay from the fixture) [via replay] | (script) @1.22s → step 3; leftovers none | trigger available: reach: nothing spent |
| den-strix.s2 | stealth.strix | (script) @0.52s | step 2, carrying spectacles | none | reach: nothing spent; scene started again | (script) @1.22s → step 2, carrying spectacles; leftovers none | yes |
| gear-pen.s1 | pen.cufflink | (script) @0.52s | step 1 | none; world: mod:clues/Group10/Mesh3: 0 vs fresh 1 | pickup: nothing spent / pickup: nothing spent; scene run again (replay from the fixture) | (script) @1.22s → step 1; leftovers none | trigger available: pickup: nothing spent / pickup: nothing spent |
| gear-pen.s2 | pen.portrait | (script) @0.52s | step 2, carrying cufflink | none; world: mod:clues/Group10/Mesh3: 0 vs fresh 1 | trade pen open; scene started again | (script) @1.22s → step 2, carrying cufflink; leftovers none | yes |
| gear-headlamp.s1 | headlamp.key | (script) @0.52s | step 1 | none; world: mod:clues/Group8/Mesh3: 0 vs fresh 1; mod:clues/Group10/Mesh3: 0 vs fresh 1 | clue turtle-key unspent; scene started again | (script) @1.22s → step 1; leftovers none | yes |
| gear-headlamp.s2 | headlamp.trade | (script) @0.52s | step 2, carrying key | none; world: mod:clues/Group8/Mesh3: 0 vs fresh 1 | trade headlamp open / trade headlamp open; scene run again (replay from the fixture) [via replay] | (script) @1.22s → step 2, carrying key; leftovers none | trigger available: trade headlamp open / trade headlamp open |
| part-wings.s1 | wings.sail1 | (script) @0.52s | step 1 | none | reach: nothing spent; scene started again | (script) @1.22s → step 1, carrying sail; leftovers none | yes |
| part-wings.s2 | wings.remote | (script) @0.52s | step 2, carrying shiny | none | trade remote open / pickup: nothing spent; scene run again (replay from the fixture) | (script) @1.22s → step 2, carrying shiny; leftovers none | trigger available: trade remote open / pickup: nothing spent |
| part-wings.s3 | wings.sail2 | (script) @0.52s | step 3 | none; world: mod:clues/Group11/Mesh3: 1 vs fresh 0 | reach: nothing spent; scene started again | (script) @1.22s → step 3; leftovers none | yes |
| part-beak.s1 | beak.sticker | (script) @0.5s | step 1 | none; world: mod:clues/Group11/Mesh3: 0 vs fresh 1 | clue sticker-grate unspent; scene started again | (script) @1.2s → step 1; leftovers none | yes |
| part-beak.s2 | beak.deal | (script) @0.5s | step 2 | none | trade cone open; scene run again (replay from the fixture) [via replay] | (script) @1.2s → step 2; leftovers none | trigger available: trade cone open |
| part-beak.s3 | beak.gate | (script) @0.5s | step 3 | none | clue shed-gate unspent / clue shed-gate unspent; scene started again | (script) @1.2s → step 3; leftovers none | yes |
| finale@doors | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
| finale@biggify | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
| finale@stomp | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
| finale@climb | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
| finale@shout | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
| finale@credits | finale | finale @0.52s | step 1 | none | reach: nothing spent; scene started again | finale @0.52s → step 1; leftovers none | yes |
