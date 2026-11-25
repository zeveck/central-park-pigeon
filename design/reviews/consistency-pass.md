# Consistency pass (#43): every line a player reads or hears vs what's there

Audit stage, 2026-11-25 (read-only); fix stage the same day: see "Fix status". Checked against the code on branch fix/batch9 (worktree wt-fix9).

## Coverage

Every player-facing line in the game is in a table below. Lines that name nothing checkable share a row, and each section gives its count.

| area | files | lines checked | mismatch rows |
|---|---|---|---|
| Talk lines, bios, lead hints, crews data | data/dialogue.js, dialogue-sf.js, lead-hints.js, crews.js (people.js and looks.js have no player text; they were used as references) | ~481 | 37 |
| Den schemes and their 16 goal cards | schemes/den-*.js (14 files) + data/schemes.js den-* cards | 408 | 37 |
| Other schemes and their cards, threads, item sources, credits | schemes/{prologue, _sf-common, fun-polish, gear-*, part-*, sab-*, say-cheese, truce-*} + cards, data/threads.js, item-sources.js, credits.js | 374 | 18 |
| Everything else: toasts, bubbles, postcards, finale, setpieces, UI, map labels, index.html | main.js, systems/*, ui/*, finale/*, setpieces/*, entities/*, world/layout.js, index.html | ~727 | 18 |
| Voice files | game/assets/audio/voice/*.mp3 (62) | 62 files | see the voice table |
| **Total** | | **~1,990 lines + 62 voice files** | **110 rows, ~100 distinct after overlaps** |

Distinct mismatches by kind (roughly): **voice ~38** (spoken words differ from the subtitle; 6 files can't be checked), **prop ~22**, **sound ~10**, **place ~10**, **fact ~15**, **look ~8**.

How the voice check worked: each file's generation text comes from /workspaces/gg-test1/.audiogen-history.jsonl. 56 of the 62 files were found there. The other 6 are on corrupted log lines and appear nowhere else in the repo, so they are listed as **unknown; needs a listen**: vesper-greeting, strix-greeting, duchess-join, puddles-join, vinnie-flying-rat, crowd-chant-take-3. A voiced bark plays on the dialogue line or bubble it's attached to (ui/dialogue.js:86, characters.js:209, allies.js:57), so "shown with" is the subtitle on screen while it plays.

## Fix status (fix stage, 2026-11-25, branch fix/batch9)

Every mismatch row below has been dealt with; this table is the status by fix. "words" = the line changed, "thing" = the game changed to match the line. Scripted dialogue lines (in cutscenes a replay drives) were kept no longer than before, so recorded "next" presses still land on finished lines; where the voiced words couldn't fit, the voice was regenerated instead.

| # | fix | how | status |
|---|---|---|---|
| 5a | Truces meter stuck at 3/4 | thing: den-rhoda `gives.truce: 'hawks-pigeons'` (the design's 4th feud); toast max read from the thread; save migrate adds the truce to old saves with den-rhoda done; thread line "Most of them get settled on the Elders' rock" | done (check-schemes, den-rhoda record + replay) |
| 5b | Completionist "Favours 0/50" | words/UI: the row is gone (nothing awards a favour); Nutmeg, Glint, Ringo, Pickles reworded as flavour (no "Favour") | done (computed from state each time, so old saves show it right) |
| 1 | Mimi's car alarm | thing: synth `carChirp` (two "bwip" blips) replaces `carAlarm`; Mimic rotation = phone ring, car chirp, the real ranger-whistle.mp3; the chirp + an echo play on her stage line; words "car chirp" in dialogue.js (2), dialogue-sf.js (Jay, Mimi), den-songbirds (4), lead hint "*bwip-bwip*"; mimi-greeting regenerated "Bwip-bwip! Ha! Gotcha!"; bribe-songbirds-hint1 regenerated | done |
| 2 | Ducks' tub of peas | thing: `peas` mesh is an open tub heaped with peas (items.js), on the table and in the beak | done |
| 3 | Voiced barks vs subtitles | Prologue Duchess: new duchess-frenzy; Dove's Prologue line unvoiced; greetings: subtitles start with the bark (Duchess talk, Hazel, Puddles, Biscuit, Rigby, Vibrato, Big Sal, Queenie) or the bark regenerated to the line (Eldest, Clementine, Gertrude, Wingate, Mimi, Sue, Rhoda, Vesper, Strix); Big Sal's bark moved to den-meermob, new bigsal-rhoda for den-rhoda; joins: subtitles start with the bark (Hazel, Rigby, Vibrato, Vesper, Queenie, Sue, Wingate, Big Sal, Clementine, Gertrude, Eldest, Mimi), Rhoda/Duchess/Puddles joins regenerated; Biscuit and Strix joins now play on their win lines; the auto join bark after a scene no longer repeats a bark the scene just played (audio.playedRecently); finale rigby-ready and rhoda-hold-still; Wedding Dove "Places, darling. Forty-one weddings. None checked." | done |
| 4 | Ally call bubbles | words: the bubble shows the call voice's words (allies.js CALL_LINES) | done |
| 6 | Cats-rats truce not on the rock | thing: after the kerb lines the bosses go to the Elders' rock via truceScene (Slowpoke walks in, polaroid) | done (truce-cats-rats re-recorded + replayed) |
| 7 | Shopping cart a steel box | thing: wire cart (bars, rim, red handle, legs, 4 wheels) | done |
| 8 | Strix's spectacles | thing: strix-nospecs.webp (imagegen2) in dialogue and roster until den-strix; her model wears spectacles after den-strix | done |
| 9 | Sax busker silent | thing: 'sax' music near him on Afternoons and under the Choir join; line "By the fountain, the sax busker joins in…"; "by the fountain" not "under the arcade" | done |
| 10 | Missing props | key: an iron post with an arm and hook at the key, by the lot gate (clues.js) + words "a hook by the gate" (toast, card, keeper label); north gatehouse drinking fountain; Prickett holds a phone at the van; gold cufflink; sunken rowboat under the glow; Zoo: three sea lions in/on the pool, the sprat now flips from the rim sea lion, postcard "A sea lion flips you a sprat" | done |
| 11 | Looks | Socket holds a welding torch; Rigby wrong-place "Rigby shrugs."; tourist she/her (prompt, toast, card); jogger/RC kid lines neutral ("The jogger", "The kid", "Joggers never stop"); East Drive "delivery man" (the #46 model is a delivery man); "Eight dogs" → "THOSE dogs" / "A pack of dogs" (an 8-dog walker was tried and dropped: not proven RNG-free); bread-print scarf renamed, Ledger "Bread! On a scarf!" | done |
| 12 | Places | "by the south gatehouse"; "Fifty metres"; Pickles' sill under the DELI GROCERY; Clementine/Prickett card wheres; Bella "from the Mall to Cherry Hill"; busker by the fountain; Nutmeg Sheep Meadow; Clementine "by day"; Nightcap "at Dusk"; Gapstow "by"/"east end of" | done |
| 13 | Named things | "Down the grate"; Blockhouse "gap" (no arch: cards, Big Sal, Feathers, the bribe tip); "by the Loch"; Duke's officer "on his break" / "Duke writes a ticket. With a hoof."; Stilts "the joggers"; Queenie "on the step"; Pickles "a slice"; "peck up the wrench by the stage"; "Follow the chittering"; "rushes over to sweep it up"; "Crumbs land at his feet"; 110th bins "on 110th Street"; sneaker charm on the jogger's key (thing); Workshop portrait line cut; "A dove! Stunning!"; "Who PUT that there?!" | done |
| 14 | Sounds | Bubbles' "*dives*" plays duck-dive-bloop (regular lines can carry a sound); carousel band organ (audiogen music, on the ride and near it on Afternoons); pedicab horn = bikeBell synth; "Hopper full! Coo to Dump." | done |
| 15 | Unknown voice files | not transcribable here (speech-to-text was refused by the session's permissions): vesper-greeting, strix-greeting, duchess-join, puddles-join, vinnie-flying-rat regenerated from their lines; vinnie-flying-rat now plays with its bubble; crowd-chant-take-3 unused, left | done / 1 left (unused) |
| — | part-talons "behind one steel door" | words: "His stock inside, and the last ranger cart parked across the door." + card | done |
| — | lead hint "She keeps the books" (Hazel) | words | done |
| — | Wingate's stale "SPIKED"/"Strips on our roost" | words ("Our gatehouse roost. Ruined." / "Always something on our roost. Spikes. Cats.") | done |
| — | item-sources "pecan cache" | words: "Old Pecan's cache on Cherry Hill" | done |
| — | Not changed | Clementine "that's pepperoni" for an anchovy slice; "The CAKE!"; "stage door" (the guard is the door); orphan *-call voices of non-callable crews; the rink door's crumple sfx | left: low or not a mismatch |

### Proof (fix stage)

- check-schemes: 34 schemes, 92 steps, all checks pass (two card `where`s were shortened to stay under 120 characters).
- truce-cats-rats (the scene now goes to the Elders' rock): closed-loop record of the main route (12,489 frames) and of the alt route (11,349 frames; the old alt solution ran out before the longer scene ended), and both replays complete. design/solutions/truce-cats-rats{,.alt}.json re-recorded. design/solutions/whole-game.json passes through this scene too and was not re-run (not asked; it will need a re-record when the whole game is next replayed).
- den-rhoda (its gives now include the truce): closed-loop record OK (14,339 frames) and the committed solution replays to completion.
- Counters, in the game: an old save `{ flags: den-rhoda…, truces: [3] }` migrates to 4 truces; the Feuds meter max is 4; the Completionist rows are pretzels, strays, Summit Perches, postcards, full thread meters, scarves (no Favours).
- Screenshots (design/screenshots/fix-43/, each looked at): peas-tub-table, cufflink-and-keys (gold cufflink, sneaker-charm key, plain gate key), shopping-cart, zoo-sea-lions, sunken-rowboat(-2), lot-key-post, north-gatehouse-fountain, prickett-phone-front, socket-torch-front, strix-dialogue-nospecs (portrait without spectacles), strix-spectacles-after (model wears them after den-strix), ally-call-bubble ("Mimi: "Mimi's on! What sound you need?"").
- Text scanner on the dialogue and the call-bubble screens: nothing from these changes; it flags two things that were there before (the den-songbirds S2 goal card wraps "edge." onto its own line at 960×540, and a compass tick clipped at the bar's end).
- Listen-through, measured (decoded RMS of the loudest 20%, design/screenshots/fix-43/levels.json): every new voice is within 2 dB of the same character's call line except the Strix greeting (−4 dB) and Mimi's (−3 dB), now given gains 1.55 and 1.4 (audio.js SFX_GAIN); the carousel organ (−13.1 dB) sits with the sax riff (−13.5) and the busker riff (−15.6). The words themselves couldn't be machine-checked (speech-to-text wasn't permitted); each file was generated from exactly the text in the table.
- Console errors: 0 in every browser session.

### Bagel shop (#44) and bribes (#45): added in the fix stage

125 voice files (Manny 12, Mama Mask 23, bribes 90) checked against bagels.js and lead-hints.js by their generation text (matched to the shipped file by size), plus every player string in data/bagels.js, schemes/bagel-shop.js and schemes/bagel-bribes.js (menu, A-frame chalk, toasts, overlay, bubbles, labels) and the props and sounds they name (bell + bell-ding, griddle sizzle, kettle steam, munch, the shelf, the A-frame, neon OPEN, blade sign).

| file / line | text (short) | names | checked against | verdict | fix |
|---|---|---|---|---|---|
| MANNY ×12, MAMA ×23 voices | e.g. "Ding ding. What'll it be, pal?", riddle 1-3, the wrong-bagel answers | bell, oven, kettle | voice texts = shown texts (all 35); bell-ding on the bell; griddle sizzle; kettle steam on done2 | OK | — |
| BRIBES ×17 crews: excited/thanks/lead/tip/refuse/closer | | | voice texts = shown texts | OK except two tips | |
| bribe raccoons tip | "The stagehands at the Delacorte got a whole box of 'em." | a box of wrenches | one wrench, the stagehand's trade (den-raccoons) | MISMATCH-prop | words + voice: "The stagehand at the Delacorte's got one. Just sayin'." (regenerated) |
| bribe meermob tip | "Fly the arch at the Blockhouse." | arch | no arch (see den-meermob) | MISMATCH-prop | words + voice: "Fly in through the Blockhouse gap. With STYLE." |
| bribe *-hint1/2 (lead hints voiced) | squirrels 2, racers 1, cats 2, horses 1+2, songbirds 1 | | lead-hints.js after this pass | MISMATCH-voice (the hints were reworded here) | 6 regenerated to the new hints |
| bribe meermob hint2 | "You want the Mob? Big Sal. Up at the Blockhouse. Ask nice." | | the shipped file matched no record of this text | voice unknown | regenerated (QzTKubutNn9TjrB7Xb2Q) |
| bribe songbirds hint1 | voiced "Wee-oo wee-oo!" for "*car alarm*" | | fix 1 | MISMATCH-sound | "Bwip-bwip!" |
| A-frame "SQUIRRELS TALK FOR PLAIN" | | | squirrels take any bagel; plain is the cheap one | OK (advice) | — |
| A-frame "PIGEONS WELCOME (FOR ONCE)", fascia, blade, neon OPEN | | | drawn in code (bagel-shop.js) | OK | — |
| BAGEL_EAT raccoons "Into the drain kitchen." | | | Mama Mask's bio (drain kitchen is her line, not a prop) | OK | — |
| toasts/overlay ("Land first, Gus. Critters don't look up.", the Duchess toast, "New in the park", scarf, map) | | | bagel-bribes.js:37 needs landing; shop on 110th across the North Woods gate | OK | — |

bagel files touched in this pass: data/bagels.js (two BRIBES tips only). bagel-shop.js and bagel-bribes.js were not edited.

## Fixes, ordered by how much a player would notice

1. **Mimi's "car alarm" (sound + 6 lines + 1 voice).** The carAlarm synth (audio.js:494: six quiet rising buzzes, then beeps) reads as a toy siren. Her greeting voice even says "Ring ring!", which is a phone. **Fix:** replace the synth with a car's unlock chirp, a two-blip "bwip-bwip" (code synth, free; an audiogen key-fob sfx is the alternative at ~$0.12). Then say "car chirp" everywhere: dialogue.js:23 (twice), dialogue-sf.js:10 (Jay) and :33, lead-hints.js:22, and den-songbirds.js:41/55-56, where no sound plays at all. Play the chirp on those scene lines too. Regenerate mimi-greeting as "[mischievously] Bwip-bwip! Ha! Gotcha. Mimi, darling." (voice o9B86nZP8mMLaT5FBEzP, ~$0.01). While in that rotation, play the shipped, unused sfx/ranger-whistle.mp3 for her "ranger whistle" instead of the code wolf-whistle (free).
2. **The ducks' "tub of peas" (prop).** items.js:171 draws peas as 5 loose spheres, and `tub: true` (den-ducks.js:109) is only a flag. It's named in den-ducks.js:25 and three times on the card (schemes.js:67). **Fix:** code-built: give the `peas` mesh a small open tub (a cylinder with a rim, ~10 lines). Being in the mesh, it shows on the table and when carried. No world or timing change.
3. **Voiced barks say different words from the subtitle (~30 lines).** The first voiced line every player hears is the Prologue Duchess: the file says "Ah. The pigeon with prospects." over "Well, well. A feeding frenzy, on MY Pond…". Then come 14 of 17 boss greetings, ~12 joins, and the Dove, Rigby (finale) and Rhoda (finale) lines. **Fix, mostly free:** start each subtitle with the words the bark actually says. Most barks are good jokes worth keeping, e.g. "Ooh! A bird! Hi! HI! …Ball? BALL?". Regenerate only where the bark contradicts the scene (~$0.01 each, same voice ids, listed in the rows):
   - Duchess frenzy: "[haughty] Well, well. A feeding frenzy, on MY Pond."
   - Gertrude: "HONK! Off my LAWN!" while she's on the Lake → "[shouting] HONK. This arm of the Lake is GOOSE TERRITORY!"
   - Big Sal: "Show me your crew." plays in Rhoda's hawk scene; move it to den-meermob:165, where those are the words.
   - Rigby finale: new "rigby-ready", "Get in here, boss. She's ready."
   - Rhoda finale: new "rhoda-hold-still", "[straining] Hold STILL, you big lug!"
   - Dove in the Prologue: drop the voice. "I was BORN for this." belongs to the Wedding.
   
   About 8 files, under $0.10. New names must be added to the voice-file pattern at audio.js:124.
4. **Ally calls: the bubble says "<Name> is here." while the boss says their call line** (allies.js:57-58), on every Call, for all 13 callable bosses. **Fix (free):** show the call line itself, e.g. "Mimi: Mimi's on! What sound you need?". The texts are in the voice table.
5. **The Feuds meter can never fill (fact).** threads.js says "Four feuds", "Truces n/4", but only 3 schemes give a truce. The design's fourth, hawks vs pigeons, is den-rhoda's, and its `gives` (schemes.js:296) has no `truce`. **Fix:** add `truce: 'hawks-pigeons'` to den-rhoda's gives (or make the max 3). This is progress the player can see and can't finish, so it's must-fix under triage by player harm. **Also:** Completionist "Favours 0/50" (collect.js:461) can never move, because nothing awards a favour. Four regulars ask for favours that don't exist (Nutmeg, Glint, Ringo, Pickles). **Fix:** hide the Favours row and reword the four lines as flavour (rows in dialogue.js).
6. **Cats-rats truce: "On the Elders' rock, so it sticks"**, but the bosses stay at the 110th kerb and the camera cuts to an empty rock. **Fix:** use `truceScene` from _sf-common, like the other two truces. This changes a scene's timing, so the truce-cats-rats replay must be re-run.
7. **The shopping cart on the Elders' rock is a plain steel box.** The Eldest's joke is "It has… WHEELS" (den-turtles, card S3; items.js:178). **Fix:** a code-built wire cart: basket panels, handle, 4 wheels (~15 lines).
8. **Strix's portrait wears the spectacles she says she lost**, and her model never wears them, even after they're returned. **Fix:** an imagegen2 edit of strix.webp without the spectacles, shown until den-strix (~$0.05), keeping the current portrait for after. Also add the code-built 'spectacles' accessory (characters.js:555) once den-strix is set.
9. **The sax busker never plays.** sax-busker-riff.mp3 and MUSIC.sax exist but nothing plays them. Vibrato, Encore and the choir scene ("The sax busker… joins in… It sounds amazing", den-choir:22) all lean on it. **Fix (free):** play 'sax' near the busker in the Afternoon, and in the choir scene walk him over and play the riff.
10. **Missing props named on cards, toasts and nudges (code-built, render-only, no replays):**
    - The Boathouse lot key "on the booth's hook" floats 2.1 m up with no booth: build a booth with a peg.
    - The north-gatehouse "water fountain" where the jogger stops and says "*gulp*" isn't there: build a drinking fountain.
    - Prickett is "on the phone to nobody" but holds a clipboard: the `phone` accessory and pose exist in humans.js.
    - The cufflink is called gold but is a pale-blue gem: make it a gold mesh.
    - The "sunken rowboat" in the Wedding is only a glow: reuse the Boathouse rowboat shape.
    - The Zoo Wall postcard's "Feeding time! A flung sprat" happens at an empty pool: a few code-built sea lions and a keeper. This is the biggest prop job in the list; the alternative is rewording.
11. **Character looks vs lines:**
    - Socket's model holds a wrench but his portrait holds a welding torch. That also undercuts Rigby's "can't fix nothin' without a wrench" and "Rigby taps his wrench" (Rigby holds nothing). Code-built torch for Socket; reword Rigby's line.
    - The Say Cheese tourist (human-tourist, a woman), the jogger (sometimes human-jogger, a woman) and the RC kid (human-child, a girl) are all "he". Reword to she, or neutral where the model varies.
    - The "East Drive cyclist" has no bicycle and wears Vinnie's model: call him "the delivery man".
    - "Eight dogs" vs a dog walker with 2: set `dogs: 8`, render-only.
    - The bread-print scarf is named for "FEED THE BIRDS" but has no words: rename.
12. **Places that are off (all free rewords):**
    - Wingate isn't "on the south gatehouse roof"; he's on the bridle-path bridge 10 m west. Say "by the south gatehouse".
    - Express's "Fifteen metres, joint to grate" is really ~45-50 m.
    - Pickles' sill is under the DELI GROCERY, not "the red $1 SLICE joint".
    - Clementine is ~100 m from "the trough"; Prickett's van is ~80 m from "the carriage line".
    - Bella's "all the way to the Boathouse" doesn't match the step's four signs.
    - The busker is "under the arcade" but stands by the fountain.
    - Nutmeg's "Cherry Hill caches" are on Sheep Meadow.
    - Clementine's lead hint says "mornings", but she's out all day.
    - Nightcap's rowboat "glows at night", but the glow is hidden at Night: say Dusk.
13. **Named things that don't exist (free rewords):**
    - Sue's "Down the stairs": there are only grates.
    - The Blockhouse "arch" is a gap in the wall: reword, or add a code-built lintel.
    - "North Woods drain": say "by the Loch".
    - Duke's "officer", in two lines: no officer exists.
    - Stilts' "fisherman's radio": nobody fishes.
    - Queenie's "milk crates": say "on the step".
    - Pickles' "garlic knot": the counters teeter slices.
    - The Delacorte "prop table".
    - "Follow the clanking": no clank plays.
    - The waiter's "dustpan".
    - The Strawberry Fields busker's guitar "case".
    - "Bins outside the DELI GROCERY".
    - The "sneaker keyring".
    - The Workshop "portrait".
    - "Two doves! Stunning!" when Gus is alone.
    - "Ow! Stupid TREE!" on anything solid.
    - The "car alarm" postscript in Jay's line follows fix 1.
14. **Smaller sound fixes:**
    - Bubbles' "Watch this! *dives*" is silent: let regular lines carry a sound and play duck-dive-bloop (free).
    - Carousel postcard: "The organ plays your song" over a whoosh. A 15 s band-organ waltz via audiogen music (~$0.07), or reword.
    - The pedicab "Horn" plays a coo: use the unused code bikeBell (free).
    - Zamboni "Tap F to Dump" shows the keyboard key on every device: use the device's Coo button label (vehicles.js:807 already does this).
15. **Voice files to listen to (6, no source text):** vesper-greeting, strix-greeting, duchess-join, puddles-join, vinnie-flying-rat, crowd-chant-take-3. Once transcribed, compare with their lines in the rows below. vinnie-flying-rat is never played: wire it to the "Ya flying RAT!" bubble (fights.js:192). **Orphans:** biscuit-join and strix-join are never played (their joins are silent), so attach them to the join lines in fights.js with subtitles that start with their words. duchess-call, eldest-call, vibrato-call and wingate-call can't play because those crews aren't callable; crowd-chant-take-1..4 are an unused fallback. Leave them.

### What to generate (ElevenLabs creator tier, through audiogen)

| asset | text / prompt | voice id | cost |
|---|---|---|---|
| mimi-greeting (replace) | "[mischievously] Bwip-bwip! Ha! Gotcha. Mimi, darling." | o9B86nZP8mMLaT5FBEzP | ~$0.01 |
| duchess-frenzy (new) | "[haughty] Well, well. A feeding frenzy, on MY Pond." | pFZP5JQG7iQjIQuC4Bku | ~$0.01 |
| gertrude-greeting (replace) | "[shouting] HONK. This arm of the Lake is GOOSE TERRITORY!" | 7sAIIIXrQKek5xiLc1R6 | ~$0.01 |
| rigby-ready (new) | "[gruff] Get in here, boss. She's ready." | LysucvtFmzi1NVAE0rKp | ~$0.01 |
| rhoda-hold-still (new) | "[straining] Hold STILL, you big lug!" | EXAVITQu4vr4xnSDxMaL | ~$0.01 |
| optional regenerations instead of subtitle edits | the current first sentence of each line in the voice rows | per row | ~$0.01 each, ≤ $0.25 for all |
| car unlock chirp (only if the synth doesn't convince) | "car key-fob unlock chirp, two short bright electronic chirps, close, dry" (sfx) | — | ~$0.12 |
| carousel organ (optional) | "15-second cheerful fairground band-organ waltz, loopable" (music) | — | ~$0.07 |
| Strix portrait without spectacles | imagegen2 edit of portraits/strix.webp: "same owl, no spectacles" | — | ~$0.05 |

Total generation if everything is done: well under $1 of the $50 art budget.

---

# Line-by-line tables

## Part 1: data/dialogue.js, dialogue-sf.js, lead-hints.js, crews.js, and the voice-file table

### game/src/data/dialogue.js (96 lines; 17 boss entries = 41 lines, 51 regulars = 105 lines, Prologue = 11 lines)

Voice on boss lines: `voice` plays on the first line of the first-ever talk (entities/characters.js:209), unless a scheme speaks first. Generation texts: /workspaces/gg-test1/.audiogen-history.jsonl.

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 8 | duchess | "Darling, one does not simply WALK up…" + after ("that scarf") | voice duchess-greeting = "[haughty] Ah. The pigeon with prospects." | Swells join in the Prologue (crews.js:56), so the `before` pool is only heard if talked to first; Gus wears scarves | MISMATCH-voice (spoken words differ) | Regenerate duchess-greeting as "Darling, one does not simply WALK up to the Duchess." (voice pFZP5JQG7iQjIQuC4Bku, ~$0.01) — or see the Prologue row, which uses the same file |
| 9 | hazel | "Gus! Gus, right? I put something somewhere…" / after "Call me when you see a plume" | voice hazel-greeting = "Oh! Hi! Wait... did I bury something here?" | dig clue = plume (clues.js:120) | MISMATCH-voice | Regenerate as "Gus! Gus, right? I put something somewhere. Important." (FGY2WhTYpPnrIDTdsKH5, ~$0.01) |
| 10 | puddles | "Commodore Puddles, Lake Mallards. State your business, pigeon." / "fetch me a pea" | voice puddles-greeting = "Ahoy! State your business, landlubber!" | peas item (items.js:28) | MISMATCH-voice (close: "landlubber" vs "pigeon") | Cheapest: subtitle "Ahoy! Commodore Puddles, Lake Mallards. State your business, landlubber." (free; keeps the voiced words) |
| 11 | vesper | "The Exchange doesn't talk to walk-ins, kid." / "Trades are ten crumbs" / "Wanted board after a nap" | voice vesper-greeting: generation text not in history (corrupt line) | TRADES crumbs:10 (layout.js:866-871); Wanted board (market.js:2) | voice: unknown; needs a listen. Rest OK | Transcribe; regenerate if different (N2lVS1w4EtoT3dr4eOWO) |
| 12 | eldest | "Mmm... a pigeon. On our pond." "Something... is on our rock." | voice eldest-greeting = "Ahh... young one... sit a while." | cart on the rock (layout.js:774) | MISMATCH-voice | Regenerate "[slowly] Mmm... a pigeon. On our pond." (pqHfZKP75CvOlQylNhV4, ~$0.01) |
| 13 | biscuit | "Ball? BALL? You got my ball? No? Oh." "*sad dog noises*" | voice biscuit-greeting = "Ooh! A bird! Hi! HI!" | ball item (items.js:34) | MISMATCH-voice | Subtitle-first is better here (the voiced joke is good): make line 1 "Ooh! A bird! Hi! HI! …Ball? BALL? You got my ball?" (free). "*sad dog noises*": no sound plays — low; could set the line's sound to dog whine (no file; skip) |
| 14 | strix | "Hoo. A pigeon, in my woods…" "My spectacles are... elsewhere." | voice strix-greeting: text not in history; portrait strix.webp WEARS round gold spectacles | portrait (assets/portraits/strix.webp); looks.js strix acc [] (never wears them, even after they're returned: no progress-based accessories in characters.js) | voice: unknown; needs a listen. MISMATCH-look (portrait shows the spectacles she says she lost) | Portrait: imagegen2 edit "same owl, no spectacles" as strix.webp before the return, keep current one as strix-specs.webp after (code picks by flag den-strix; ~$0.05). Model: add 'spectacles' accessory once den-strix is set (code-built eyewear already exists, characters.js:555) |
| 15 | rigby | "Night Crew. We fix things…" "Can't fix nothin' without a wrench" / after | voice rigby-greeting = "[gruff] Yeah? Whatcha need fixed?" | wrench item; Socket (regular) holds the wrench accessory (looks.js:104), Rigby holds none | MISMATCH-voice | Subtitle: "Yeah? Whatcha need fixed? Night Crew. We fix things. Mostly other people's things." (free). See Socket row for the wrench |
| 16 | vibrato | "The Choir sings for an audience… That saxophone fellow keeps stealing ours." | voice vibrato-greeting = "Ah! An audience! Bravissimo!" | sax busker at P(10,286) afternoon, plays sax-busker-riff (people.js:46, audio.js:26) | MISMATCH-voice | Subtitle: "Ah! An audience! Bravissimo! …Oh. Only one. The Choir sings for an audience that STAYS." (free, adds a joke) |
| 17 | wingate | "Coach Wingate. Reservoir Racers. No roost, no training." "Somebody SPIKED our gatehouse." | voice wingate-greeting = "Look alive! Wings up, chest out!" | P2 strips on the south gatehouse roof (layout.js:655) | MISMATCH-voice | Subtitle: "Look alive! Wings up, chest out! Coach Wingate. Reservoir Racers." (free) |
| 18 | sue | "Subway Sue. I run the grates." "Bring me a whole slice. HOT. Down the stairs." / "Seven grates" | voice sue-greeting = "[New York accent] Hey, pal. Got any crust?"; no subway stairs are modelled at the Columbus Circle grate (only grates: props.js buildGrates) | GRATES has 7 (layout.js:453) | MISMATCH-voice; MISMATCH-prop ("Down the stairs": there are none) | Subtitle: "Hey, pal. Got any crust? …Subway Sue. I run the grates." and "Bring me a whole slice. HOT. Down the grate." (free) |
| 19 | rhoda | "Screee. Off my Meer, snack." | voice rhoda-greeting = "[cool] Keep your head down, little pigeon." | Rhoda at the Meer (crews.js:158) | MISMATCH-voice | Subtitle: "Screee. Keep your head down, little pigeon. Off my Meer." (free) |
| 20 | bigsal | "Big Sal. The Meer Mob. Show me your crew, kid." "Thirty birds. Through the arch." | voice bigsal-greeting = "[gruff] Show me your crew." | flock 14 (crews.js:68) | voice: near match (voiced words are inside the line) — OK-ish | Optional: "Show me your crew, kid. Big Sal. The Meer Mob." so the voice lines up with the first words (free) |
| 21 | queenie | "Queenie. Of 110th Street. And the bodega…" "anchovy slice. From 72nd. HOT." | voice queenie-greeting = "[regal] Well, well. A pigeon at my door." | anchovy joint = CPW & 72nd (layout.js:718), bodega-110 | MISMATCH-voice | Subtitle: "Well, well. A pigeon at my door. Queenie. Of 110th Street. And the bodega." (free) |
| 22 | clementine | "Morning, kid. That van's parked on our trough again." | voice clementine-greeting = "[warmly] Well, hello there, little fella." | van on the trough (entities/street.js:54) | MISMATCH-voice | Subtitle: "Well, hello there, little fella. That van's parked on our trough again." (free) |
| 23 | mimi | "*a perfect car alarm* Ha! Gotcha. Mimi, darling." / after "Phone ring, car alarm, ranger whistle." | voice mimi-greeting = "[mischievously] Ring ring! Ha! Gotcha!" (a PHONE, not a car alarm); her Mimic plays synth phoneRing / carAlarm / whistle in turn (clues.js:842) | audio.js:494 carAlarm synth | MISMATCH-voice + MISMATCH-sound (issue #43) | Replace the carAlarm synth with a car unlock chirp (two short rising "bwip-bwip" + horn tick; synth code, free) and call it "car chirp" everywhere: line 1 "*bwip-bwip!* A perfect car unlocking. Ha! Gotcha. Mimi, darling."; after "Phone ring, car chirp, ranger whistle." Regenerate mimi-greeting as "[mischievously] Bwip-bwip! Ha! Gotcha. Mimi, darling." (o9B86nZP8mMLaT5FBEzP, ~$0.01) |
| 24 | gertrude | "HONK. This arm of the Lake is GOOSE TERRITORY." | voice gertrude-greeting = "[shouting] HONK! Off my LAWN!" (she is on the Lake water, crews.js:182) | | MISMATCH-voice | Regenerate "[shouting] HONK. This arm of the Lake is GOOSE TERRITORY!" (7sAIIIXrQKek5xiLc1R6, ~$0.01) |
| 26-28 | monty, bunting, tuppence | ranger "new cart. Electric. Silent." / waits for a bench / hates hats | ranger-cart model; Bunting pearls + pink fascinator (looks.js:65); Tuppence wears tophat-big | | OK (Tuppence's hat is the joke) | — |
| 29 | dove | "Shh. Everyone thinks I'm a dove." "Forty weddings" | pure white layer (looks.js:21) | | OK | — |
| 30 | nutmeg (4 convs) | counts acorns; "Favour? The Cherry Hill caches need re-counting. Fly over, peck the plumes. I'll pay in crumbs."; "Plumes only show from up high" | Hazel's peckable plumes are on SHEEP MEADOW (layout.js:763, aboveOnly 10); Cherry Hill has only Pecan's one cache (layout.js:785); favours are never awarded anywhere (no `favours.push` in src; Completionist shows "Favours 0/50", collect.js:461) | | MISMATCH-place + MISMATCH-fact (a task that doesn't exist) | Reword: "Hazel's Sheep Meadow caches need re-counting. Fly over, peck the plumes. Counted crumbs, I pay." only if a favour is built; else "Hazel's caches are on Sheep Meadow. I'd count them, but she moves them." (free) |
| 31 | twitch | Gus-hi-Gus-bye; plume/dog/hawk; "see it from up" | aboveOnly 10 | | OK | — |
| 32 | pecan | 1974 Cherry Hill cache; rangers walked; dogs since '74, frisbee | pecan-cache on Cherry Hill (layout.js:785) | | OK | — |
| 33 | mrspuddles | peas; salutes the Lake; Bubbles will dive it | dive talent | | OK | — |
| 34 | bubbles | "Watch this! *dives* ...did you see?"; nine seconds; bubble rings; "Picnickers at the Boathouse eat peas. Every Afternoon." | no dive or splash sound plays on a talk line (regular lines carry no sound, characters.js:212); Boathouse picnic P(45,292) afternoon (people.js:51-53), ~19 m south of the Boathouse — fine | | MISMATCH-sound (low: "*dives*" is silent) | Let regular lines carry a sound (audio.voice already plays sfx names, audio.js:124): play duck-dive-bloop.mp3 on that line (code, free) |
| 35 | ensign | salutes; "Peas go to the Commodore" | | | OK | — |
| 36 | ledger | trade book; "Ten crumbs a trade"; Wanted board changes when you nap | TRADES crumbs 10; market.js | | OK | — |
| 37 | glint | blue things; "Favour: there's a blue bottle cap down a city grate. The rats could get it."; Conservatory kid's remote for a shiny | no bottle-cap grate clue (layout.js:761-820); favours never awarded; TRADES remote wants shiny (layout.js:869) | Glint wears blue caps (characters.js:565) | MISMATCH-fact (favour that doesn't exist) | Reword as flavour: "There's a blue bottle cap down a city grate. Somewhere. The rats won't tell me which." (free) |
| 38 | cawdry | "Jogger stops once a lap. Water fountain, north gatehouse." | jogger stop at (-4, 759.4) (people.js:72-73) but no drinking fountain is drawn there (no fountain prop in props.js/landmarks.js near it) | | MISMATCH-prop | Build a code-built drinking fountain (pedestal cylinder + bowl, ~15 lines, landmarks.js) at the stop; no scene timing change. Or reword "Jogger stops once a lap. North gatehouse. Like clockwork." |
| 39 | flicker | film canisters; camera | canister acc; camera item | | OK | — |
| 40-45 | moss, shelly, slowpoke, pretzel, fifi, moose | asleep; gossip; slow; ball; Biscuit's ball; Mmmf | | | OK | — |
| 46-47 | hoot, nanny | riddles | | | OK | — |
| 48 | socket | weld a new pigeon; spark plug, hubcap; "rope on the 103rd Street shed? Too high for one pigeon. Fifteen, though…" | portrait socket.webp holds a WELDING TORCH; model holds a 'wrench' (looks.js:104); shed-103 (layout.js:706, sab-north) | spark-plug-pop / hubcap-clang sfx exist | MISMATCH-look (model wrench vs portrait torch, and it undercuts Rigby's "can't fix nothin' without a wrench") | Replace Socket's 'wrench' with a code-built torch accessory (cylinder + bent nozzle, like the wrench case at characters.js:572). Rope line: see Part 3 (sab-north) |
| 49 | ringo | pedicab at Night; "Favour: one lap of the drive in the pedicab under forty seconds."; Delacorte guard loves a hot slice | pedicab race is the Reservoir TRACK, posted 115 s (layout.js:383); pedicab is rigged at Dusk (layout.js:810); favours never awarded; guard taker hot (crews.js:321) | | MISMATCH-fact | "Bet you can't beat Coach's posted time round the Reservoir in the pedicab. Bet you." (free) |
| 50 | mamamask | union rules; slice; "Rigby's pacing by the North Woods drain… wrench at Dusk" | Rigby dusk-night at North Woods | | OK | — |
| 51 | express | 72nd West to 96th East; hot slice through tunnels | grate-72w, grate-96e (layout.js:456-459) | | OK | — |
| 52 | pinstripe | tie; "77th Street grate" lucky; bins | sticker-grate 77th E (layout.js:796) "Lucky sticker" | | OK | — |
| 53 | crumbsy | crust; joint's bench tourists; "Vinnie HATES pizza. Hot pizza on his counter…" | Vinnie taker takes ANY slice, Afternoon (crews.js:323) | | OK (hot not required, harmless) | — |
| 54-55 | rex, pip | dive; scared | | | OK | — |
| 56 | bella | high C; "Four signs, darling! The Mall's two ends, the terrace and Cherry Hill." | den-choir signs: see Part 2 | | see Part 2 (den-choir) | — |
| 57 | lou | coos | | | OK | — |
| 58 | encore | one more; "That sax man plays ONE riff"; "Afternoon! Forty crumbs! A Coo on the terrace!" | sax-busker-riff (audio.js:26) | den-choir: Part 2 | OK | — |
| 59-64 | sprint, lapcount, wheezy, knuckles, tiny, feathers | | Tiny scale 1.35; Feathers glasses | | OK | — |
| 65 | pickles | bread; "anchovy man on the bench? Eats one every day."; "Favour? garlic knot on that counter. Knock it off."; key on a hook = cat job | sliceeater with anchovy slice on the CPW72 bench (people.js:91); counters teeter SLICES, there is no garlic knot (layout.js:814); favours never awarded; lot-key on the booth hook (layout.js:798) | | MISMATCH-prop + fact (garlic knot) | "There's a slice on that counter edge. Knock it off. For science." (free; it is what's there) |
| 66 | tux | Walter's building, back stairs | walter-stairs (layout.js:812) | | OK | — |
| 67 | whiskerton | mayors; 72nd far; rats under the park; halal griddle at Dusk | griddle dusk at 110th & Fifth (layout.js:727) | | OK | — |
| 68-76 | duke, dapple, bigben, jay, ruby, chip, gander, stilts, nightcap | | | | OK | — |
| 80-81, 89, 95 | Prologue shoo / thought / ranger / tooBig | "Hey! Shoo!" | ranger-hey-shoo = "[shouting] Hey! Shoo!" | | OK | — |
| 83 | duchess (Prologue frenzy) | "Well, well. A feeding frenzy, on MY Pond. And it's all yours, little pigeon?" | voice duchess-greeting = "Ah. The pigeon with prospects." | frenzy at The Pond (layout.js:735, PLACES pond) | MISMATCH-voice (the first voiced line every player hears) | Regenerate duchess-greeting as "[haughty] Well, well. A feeding frenzy, on MY Pond." (pFZP5JQG7iQjIQuC4Bku, ~$0.01); TALK line 8 then uses the same file, so also change line 8's first line to start "Well, well." or give line 8 no voice |
| 84-85 | gus / duchess | "Coo." / "Three signs, three piles…" | prologue signs (Part 3) | | OK (count: Part 3) | — |
| 86 | dove (Prologue) | "Shh. Everyone thinks I'm a dove." | voice dove-born-for-this = "[delighted] I was BORN for this." | | MISMATCH-voice | Drop the voice from this line (the file belongs to the Wedding, wedding.js:169) — free |
| 87 | duchess (Prologue) | "The Swells are with you, darling. Coo, and we come. Hold it, and we SWARM." | voice duchess-join: text not in history | | voice: unknown; needs a listen | Transcribe; regenerate if different |
| 91-93 | prickett, duchess | "Spikes on the Plaza, the Reservoir, the museum and the Fifth Avenue ledge." | SPIKE_SITES P1-P4 = Plaza lampposts, Reservoir S gatehouse, museum ledge, Fifth & 74th ledge (layout.js:653-657) | | OK | — |

### game/src/data/dialogue-sf.js (57 lines; 22 regulars + 7 bosses = 64 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 10 | jay | "Want to hear my car alarm? Mimi says it's 'derivative'." | car alarm | Mimi's carAlarm synth (audio.js:494) | MISMATCH-sound (follows the Mimi fix) | "Want to hear my car chirp? Mimi says it's 'derivative'." |
| 11 | ruby | Morning; Mimi steals sounds | | | OK | — |
| 12 | chip | phone ring; "Someday I want the cab horn" | phoneRing synth; cab-horn.mp3 exists | | OK | — |
| 13-15 | sprint, lapcount, wheezy | draft; "wheeled division's posted time is soft" | PEDICAB_RACE posted 115 (layout.js:383) | | OK | — |
| 16 | duke | "A van on a trough is a violation." "The officer and I do the drives at Morning." | no mounted officer exists (people.js has none; Duke wears an empty saddle, looks.js:131) | | MISMATCH-look (low) | "The officer's on his break. Fourteen years, one break. By the book." (free) |
| 17-21 | dapple, bigben, moss, shelly, slowpoke | Ramble; Hup; truces; "hawk's ledge got spiked… And the starlings'" | P3 museum ledge (starlings), P4 Fifth ledge | | OK | — |
| 22 | gander | the wedge, honk on three | wedding wedge (wedding.js) | | OK | — |
| 23 | stilts | "Except for the fisherman's radio." | no fisherman or radio anywhere in the game (grep: only this line) | | MISMATCH-prop/person | "Except for the joggers. One day the geese will deal with them." (free) |
| 24 | nightcap | "The rowboat under Bow Bridge glows at night… Something electric down there." | the glow (wedding.js:373) is hidden at Night (`phase !== 'night'`) and shows only after part-power step 1; Nightcap is out at Dusk only | | MISMATCH-fact | "…glows at Dusk, did you know?" (free) |
| 25-29 | rex, pip, knuckles, tiny, feathers | turn; Fifth Ave; Mob turf; Sal & stomach; swirl | Big Sal slice taker | | OK | — |
| 30 | dove | Forty weddings; better agent; dove's coo; Mimi could teach me | | | OK | — |
| 33 | mimi (boss) | "I do car alarms, ranger whistles, phones." / after "Need a human to wander off… Ice cream works on everybody under ten." | Mimic = phoneRing/carAlarm/whistle (clues.js:842); no ice-cream jingle in the Mimic rotation (synth 'jingle' exists, audio.js:475) | | MISMATCH-sound (car alarm); ice cream: low | "I do car chirps, ranger whistles, phones." Ice cream line: fine as a joke, or add the 'jingle' synth to the Mimic rotation |
| 34 | wingate | strips on our roost; "Ten rings any day" | race rings (layout.js:424-429) | | OK | — |
| 35 | clementine | van every Morning; "Driver's lunch slice is at the Pond carriage stop"; "Need a gate kicked? We kick." | line-carriage drop "The Pond carriage stop" (layout.js:723) | | OK | — |
| 36 | eldest | "Bubbles… by our rock. Something… sank there."; truces on this rock | turtle-cart dive clue by the rock (layout.js:774) | | OK | — |
| 37 | gertrude | Great Lawn picnickers; HONK | picnickers on the Great Lawn afternoon (people.js:66) | | OK | — |
| 38 | rhoda | ledge spiked; Meer ducks slow; Lift | | | OK | — |
| 39 | bigsal | hawk raids; "Fourteen of us in your swirl" | meermob flock 14 (crews.js:68) | | OK | — |

### game/src/data/lead-hints.js (24 lines; 34 hint lines)

| line | crew | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 65 | squirrels | Hazel, Sheep Meadow, by day; "She keeps the books!" | Hazel (-45,160) in Sheep Meadow (-50,165 r35) | Nutmeg is the accountant (crews.js:109); Hazel forgets things | MISMATCH-fact (low) | "Sheep Meadow! She's the boss! Ask her where she put it!" |
| 66 | ducks | Commodore, the Lake, by Bow Bridge | Puddles (-20,300.9) is 15 m from Bow Bridge (-32,310) | | OK | — |
| 67 | crows | Vesper, the Ramble, by day | (-10,365) | | OK | — |
| 68 | turtles | the Eldest, big rock, Turtle Pond | (8.8,432.6) roof of the rock | | OK | — |
| 69 | biscuit | Cedar Hill, daytime, lost his BALL | (44,380) | | OK | — |
| 70 | strix | the Ramble, at night | (-44,391.4) inside the Ramble r45 | | OK | — |
| 71 | raccoons | North Woods, after dark | (-33,930) | | OK | — |
| 72 | choir | Bethesda Terrace | Vibrato (6.6,279) | | OK | — |
| 73 | racers | "The Reservoir, on the south gatehouse roof." / "South gatehouse!" | Wingate and the team stand at x -3…7, z 562-563 (crews.js:148-151), on the bridle-path bridge 7-17 m WEST of the gatehouse (gatehouse x 10.5-17.5, landmarks.js:595) — not on its roof | | MISMATCH-place (low: he is in view) | "The Reservoir, by the south gatehouse." (free). Moving the team onto the roof would touch the race start (RACE.start x 4) — not worth it |
| 74 | rats | Columbus Circle grate; never sleeps | Sue (-99,-17), out any | | OK | — |
| 75 | rhoda | ledge on Fifth spiked; hunts over Harlem Meer | Rhoda (72,1000,y14) | | OK | — |
| 76 | meermob | Big Sal, old Blockhouse, west of the Meer | (-79,1027) vs blockhouse (-81.4,1031) | | OK | — |
| 77 | cats | Queenie at the bodega, 110th & Lenox; "on the milk crates out front" | Queenie (61,1066.3); no milk crates are modelled (no crate prop in world/ or entities/) | | MISMATCH-prop (low) | "She's on the step out front. Always." (free) — or a code-built crate stack (two boxes) under her: ~10 lines |
| 78 | horses | Clementine, CPS, "mornings" | Clementine is out all day (crews.js:172, out 'day') | | MISMATCH-fact (low: sends players to wait for Morning) | when: 'by day', "…Central Park South, by day." |
| 79 | songbirds | Mimi at the museum, CPW & 79th, by day, "*car alarm*" | Mimi (-126,409); museum-79 z = Z(79) = 412 | | MISMATCH-sound (follows the Mimi fix) | "*bwip-bwip*" |
| 80 | geese | Gertrude, the Lake, by Bow Bridge | (-33,316) | | OK | — |

### game/src/data/crews.js (324 lines: 21 talent clue texts, 13 crew names, 82 bios, 26 wrong-place, 52 barks, 4 greets, 17 taker lines, 7 feud reasons, awake reasons 4 = 226 strings)

| line(s) | what | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 25-44 | talent clue texts | "a dust plume with acorn sparkles", "bubble rings and a white splash", "a grate with something glinting below", "something teetering on a high edge", "something stuck that puffs dust" | clue tells (clues.js:120-160 build, 336-360 animate: plume + amber sparkles; rings + spout + splash; glint + shaft; wobble + dust; dust burst on peck) | | OK | — |
| 55-73 | crew names, species | 17 crews | models per species (crowds.js:26-42) | | OK | — |
| 84-87 | awake reasons | "Back in the stable until Morning", "Raccoons sleep until Dusk" | | | OK | — |
| 93-95 | feud reasons | "Not with THEM around", "Cats' block. No way, pal.", "Geese turf, Gus. GEESE." | | | OK | — |
| 102-106 | Swells bios | Duchess judges frenzies; Monty monocle; Bunting pearls + pink fascinator; Tuppence hates hats; Dove pure white | looks.js:63-67 (monocle, fascinator #f08ab8, pearls; Tuppence tophat-big is the joke; Dove layer 8 white) | | OK | — |
| 108-111 | Syndicate bios | Hazel forgets; Nutmeg accountant; Twitch; Old Pecan 1974 | Nutmeg glasses + pencil; Pecan stick | | OK | — |
| 113-116 | Mallards bios | Puddles won't eat bread; Mrs real boss; Bubbles dives; Ensign salutes | mallard + captain cap; hen + pearls; bufflehead + goggles; wood duck + sailor cap | | OK | — |
| 118-122 | Exchange bios | Vesper big oak; Ledger book, knitwear snob; Glint blue; Cawdry lookout; Flicker canisters | pendant; spectacles + plaid scarf + book; blue caps; spyglass; canister | | OK | — |
| 124-127 | Elders bios | | moss + mushroom; daisy; ear-stripe | | OK | — |
| 129-132 | Pack bios | Biscuit huge fluffy off-leash; Pretzel dachshund; Fifi poodle; Moose sleepy mastiff | dog (from biscuit mockup), dog-dachshund, dog-poodle, dog-mastiff | | OK | — |
| 134-136 | Parliament bios | Strix lost her spectacles; Hoot riddles; Nanny harder riddles | owl acc []; owlets, Nanny mortarboard | portrait strix.webp wears spectacles | MISMATCH-look (see dialogue.js:14 row) | portrait variant + spectacles after return |
| 138-141 | Night Crew bios | Rigby mechanic needs a wrench; Socket the welder; Ringo driver; Mama Mask drain kitchen | Socket's model holds a wrench, portrait holds a torch; Ringo aviator + scarf; Mama headscarf + apron + spoon | | MISMATCH-look (Socket) | Socket: code-built torch instead of wrench |
| 143-146 | Choir bios | | berets, waistcoats, baton | | OK | — |
| 148-151 | Racers bios | Wingate no roost; Sprint; Lapcount stopwatch; Wheezy | whistle; stopwatch + notepad | | OK | — |
| 153-156 | Rats bios | Sue grates; Express conductor; Pinstripe tiny tie; Crumbsy crust | token; conductor cap + pocketwatch; tie; crust | | OK | — |
| 158-160 | Rhoda's family | Fifth Avenue hawk raids the Meer; Rex mate; Pip fledgling | hawk-fly; Pip scale 0.75 | | OK | — |
| 162-165 | Meer Mob | Big Sal; Knuckles bandana on his head; Tiny huge; Feathers brains | bandana-head; scale 1.35; glasses | | OK | — |
| 167-170 | Bodega Cats | Queenie regal tabby; Pickles sleeps on the bread at the CPW & 72nd bodega; Tux posh; Whiskerton ancient | portrait queenie.webp tabby with bell collar = looks.js collar-bell; Pickles ginger + bread; tux coat + bowtie; shawl + cushion | | OK | — |
| 172-175 | Horses | Clementine old grey mare; Duke mounted-unit; Dapple young; Big Ben gentle giant "Hup" | horse concept + portrait: dapple grey; Duke bay + saddle; Big Ben scale 1.15 chestnut | | OK | — |
| 177-180 | Racket | Mimi starling; Jay blue jay; Ruby cardinal Shakespeare; Chip house sparrow | starling palette dark (looks.js:54); bluejay crest; cardinal + scroll; sparrow + crumb | | OK | — |
| 182-185 | Honk | Gertrude Canada goose LOUD; Gander enforcer; Stilts great blue heron; Nightcap night heron | goose concept = Canada goose (black neck, white chin strap); cap-peaked; heron; night-heron | | OK | — |
| 187-192 | humans | Walter doorman; Prickett; Vinnie hot dog man on the Mall; Dolores Pigeon Lady; ranger; Gus | human-walter + braid cap; spray tank, wand, clipboard; hotdog-cart.glb; human-dolores (people.js:41) | | OK | — |
| 248-260 | wrong-place lines (26) | "Puddles dives... a bottle cap"; "Rigby taps his wrench."; others | Rigby holds no wrench (looks.js:101, acc []) | | MISMATCH-look (low) | "Rigby cracks his knuckles." (free) — or give Rigby the wrench accessory once he has it (code) |
| 262-276 | barks (52) | wary/friendly per gang | | | OK | — |
| 282-288 | Swells greeting (4) | "Do mind the hats. They're vintage." | tophat-small crowd hat (looks.js:172) | | OK | — |
| 311-323 | taker lines (17) | Sue cold; Queenie anchovy from CPW & 72nd; Puddles cheese; Vesper; Mama Mask; Big Sal "That's one."; Ledger falafel; Clementine/Duke "that's pepperoni"; guard; Walter; Vinnie | pizza-slice model is pepperoni (imagegen2 prompt), anchovy slice is a repaint | | OK (an anchovy slice offered to Clementine still gets "that's pepperoni": rare, low) | optional: "And that's got FISH on it." for slice-anchovy |

### game/src/data/people.js (156 lines)

No player-read text (roles, models, positions only). Used above as the reference for who is where. 0 lines.

### game/src/data/looks.js (172 lines)

No player-read text; used as the reference for every bio and portrait check above. 0 lines.

### Voice files (game/assets/audio/voice/, 62 files)

Generation text from /workspaces/gg-test1/.audiogen-history.jsonl (56 found; the other 6 sit on corrupted lines of that log and appear nowhere else in the repo: vesper-greeting, duchess-join, strix-greeting, puddles-join, vinnie-flying-rat, crowd-chant-take-3). "Shown with" = the subtitle on screen when it plays.

| file | generated from | shown with (where) | verdict | fix |
|---|---|---|---|---|
| *-greeting (17) | see dialogue.js rows 8-24 and the den-scheme rows (Part 2) | first boss line (dialogue.js), den-scheme intros, finale | 14 differ, 1 near (bigsal), 2 unknown | per row above |
| rigby-greeting (finale) | "Yeah? Whatcha need fixed?" | 'Rigby: "Get in here, boss. She's ready."' (finale/finale.js:427) | MISMATCH-voice | bubble: 'Rigby: "Whatcha need fixed? …Kidding. Get in here, boss."' (free) |
| *-call (17) | e.g. "Commodore Puddles, reporting for duty!", "Mimi's on! What sound you need?" | bubble "<Name> is here." (entities/allies.js:57-58) | MISMATCH-voice (bubble paraphrases) for the 13 callable bosses | Show the call line itself in the bubble (a CALL_LINES map of the 13 texts; free) |
| duchess-call, eldest-call, vibrato-call, wingate-call | "The Swells have arrived, darling." / "We... are... here." / "The Choir has ARRIVED!" / "Coach Wingate! Let's GO, people!" | never played (crews callable:false) | orphan | keep (harmless) or delete; no player impact |
| rhoda-call (finale) | "Rhoda, on the wing. Who needs lifting?" | 'Rhoda: "Hold STILL, you big lug!"' (finale/climb.js:520) | MISMATCH-voice | Generate rhoda-hold-still: "[straining] Hold STILL, you big lug!" (EXAVITQu4vr4xnSDxMaL, ~$0.01), or bubble 'Rhoda: "Who needs lifting? …Hold STILL!"' (free) |
| *-join (17) | see Part 2 rows | join scenes | per Part 2 | — |
| biscuit-join, strix-join | "Best friends! Best friends FOREVER!" / "Very well. Class is in session, Gus." | never played (no reference in src) | orphan, and both joins are silent | Attach them to the join lines in their recruit scripts (their scripts are in systems/fights.js) with subtitles starting with those words (free) |
| dove-born-for-this | "I was BORN for this." | Prologue "Shh. Everyone thinks I'm a dove." (dialogue.js:86); Wedding (Part 4) | MISMATCH-voice in the Prologue | drop the voice there |
| ranger-hey-shoo | "Hey! Shoo!" | "Hey! Shoo!" | OK | — |
| vinnie-flying-rat | not in history | never played: fights.js:192 shows the bubble 'Ya flying RAT!' silently | orphan; unknown; needs a listen | play it with that bubble once transcribed (free) |
| crowd-chant-take-1..4 | "Feed the birds! ×3" (take 3: not in history) | never played (the finale plays sfx/crowd-chant-feed-the-birds.mp3, shout.js:111) | orphan (documented fallback) | none |
| mecha-feed-the-birds, prickett-impossible, photographer-*, dove-places-darling | see Part 4 rows | | | |

## Part 2: game/src/schemes/den-*.js (14 files) + the 16 den-* goal cards in game/src/data/schemes.js

Scope note: there are 14 den-*.js files (den-biscuit and den-strix have no scheme file; their scripts live in systems/fights.js, outside this fragment) but 16 den-* goal cards; all 16 cards are covered here.
Coverage: every `L(...)` line, toast, bubble, cling and guard string in the 14 files (192 strings), and every title/goal/where/obstacle/nudge/answer in the 16 den-* cards (46 steps, 216 strings). Total **408 strings checked**.

Voice key: the bark plays on the line it's attached to (characters.js:209, joinScene, `L(who, text, voice)`), so what you hear is the generation text while the box shows the line. Generation text comes from /workspaces/gg-test1/.audiogen-history.jsonl. Voice IDs: mimi o9B86nZP8mMLaT5FBEzP, eldest pqHfZKP75CvOlQylNhV4, clementine 2OEeJcYw2f3bWMzzjVMU, gertrude 7sAIIIXrQKek5xiLc1R6, wingate pNInz6obpgDQGcFmaJgB, bigsal SOYHLrjzK2X1ezoPC6cr, hazel FGY2WhTYpPnrIDTdsKH5, vesper N2lVS1w4EtoT3dr4eOWO, rigby LysucvtFmzi1NVAE0rKp, vibrato JBFqnCBsd6RMkjVDRZzb, sue dmWfLQZJq7wNPv9WmtiM, rhoda EXAVITQu4vr4xnSDxMaL, queenie WQhVGGVQ8EhNpBYHFE8c, puddles 8VJBrRk4O7tFoB5kqxa6. Each regeneration: audiogen voice, eleven_v4, about $0.01 for a short line.

Every sfx a den file plays exists in game/assets/audio/sfx/ (duck-quack-mallard, squirrel-chatter, raccoon-chitter, crowd-cheer, choir-coo-chorus, brass-stinger, rat-squeak, subway-rumble, crow-caw, crow-caw-2, shed-door-fold, turtle-grumble, hawk-screech, hawk-dive-whistle, knock-clatter, cat-meow, starling-chatter, songbird-chatter, crumb-scatter, gang-coo-murmur, goose-honk, paper-rustle, engine-loop, splash-hop, horse-whinny). The synths (`jingle`, `tick`, `uiBack`) exist in audio.js. All crew names in the lines match crews.js.

### den-ducks.js (20 strings) + card den-ducks (3 steps, 14 strings)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 23-24, 26 | puddles, ensign | meet lines, bread, salutes | Lake, bread | crews.js:113 bio "Will not eat bread" | OK | |
| 25 | mrspuddles | "bring a whole **tub** every Afternoon" | a tub of peas | items.js:171 `peas` = 5 green spheres r 0.014; the spawn's `tub: true` (den-ducks.js:109) is only a flag; nothing draws a tub. Table: den-ducks.js:31-40 (round top + red cloth) | **MISMATCH-prop** | Change the thing (code-built, about 10 lines): in items.js makeMesh, give `peas` a tub, e.g. an open white/green cylinder `CylinderGeometry(0.05, 0.045, 0.06, 14, 1, true)` + a base disc, with the 5 peas heaped at the rim. Draw it for every `peas` item (carried too) so "the tub" Gus grabs is the tub he carries. The words then stay. Screenshot at the picnic table and in-beak. |
| 53 (cling), 62 (3 guard bubbles), 63 (guard toast) | picnickers | "The peas STAY", "Hands OFF…", "They won't leave the peas…" | peas | items.js guards | OK (they say "peas", which fits either way) | |
| 69 | toast | "The picnic's here in the afternoons…" | picnic, Nest | people.js:51-53 (afternoon), interact spot | OK | |
| 76, 117 | picnicker | "Ooh, a FEED sign!", "Another round…" | FEED sign M7 | layout.js:610 M7 (43, 305) ~13 m north of the table | OK | |
| 80, 83, 94-95 | toast, picnicker, puddles, mrspuddles | "Got peas!", "The PEAS!", "PEAS? …Peck me!" | peas, Lake | | OK | |
| 126-129 | puddles, bubbles, mrspuddles | join: "Fresh from the Boathouse", "celebration dive", "Bubble rings…" | dive, bubble rings | den-ducks.js:124 dive anim + splash; layout.js:744 dive tell = bubble rings | OK (text) | |
| 129 | puddles + **puddles-join** | "The Lake Mallards stand ready. Bubble rings, Gus: that's our department." | voice | no history entry for puddles-join (the history file has corrupt lines at those points) | **unknown; needs a listen** | Transcribe. If it differs, regenerate the current line, voice 8VJBrRk4O7tFoB5kqxa6, ~$0.01 |
| 132, 134 | puddles, Bubbles bubbles | mecha line; "Triple tuck! TEN!" | | | OK | |
| card title, S1 goal/where/obstacle/nudge | | "Ducks Want Peas"; "out on the Lake by Bow Bridge… just east of Bow Bridge" | place | crews.js:113 puddles (-20, 300.9); layout.js:673 Bow Bridge (-32, 310): Puddles is 12 m east | OK | |
| card S2 goal, obstacle, answer | | "Get the **tub** of peas…", "They never leave that **tub**", "leave the **tub** alone" | tub | as line 25 | **MISMATCH-prop** (same fix) | The tub prop fixes all three. Without the prop, reword to "the peas" / "their bowl of peas"; either way the prop is better and cheap. |
| card S2 where, nudge, target | | "little table on the slope just south of the Loeb Boathouse", "the sign up the path said FEED" | place, benches | table (45.5, 292.5) vs Boathouse (38, 312): south. Sitters get benches (humans.js:153, 245) | OK | |
| card S3 goal/where/nudge/answer | | bring peas, peck him | | | OK | |

### den-squirrels.js (8 strings) + card (3 steps, 11 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 143-146, 151-153 | hazel, nutmeg, twitch | three caches, 212 acorns, "squirrel dust" from up high | caches, dust plumes | layout.js:763 three `dig` clues, aboveOnly 10, inside Sheep Meadow (layout.js:674) | OK | |
| 154 | hazel + **hazel-join** | shown: "The Acorn Syndicate digs for you now. Dust plume? Call us." / heard: "[giggles] Syndicate's in! Now where'd I put my acorn?" | voice | history | **MISMATCH-voice** | Free: make the line "Syndicate's in! Now where'd I put my acorn? …Dust plume? Call us." (keeps her forgetting joke, matches the audio). Or regenerate the current line, FGY2WhTYpPnrIDTdsKH5, ~$0.01 |
| 157 | hazel | mecha line | | | OK | |
| card S1-S3 | | "Sheep Meadow, the big lawn west of the Mall", "plumes only show from above 10 m" | place | Sheep Meadow (-50, 165) vs Mall x 6.6 | OK | |

### den-raccoons.js (9 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 167-172 | rigby, ringo, narrator | wrench in the Harlem Meer, "Stagehand at the Delacorte" | stagehand, wrench | people.js:65 stagehand (headset) at the Delacorte, dusk; items.js wrench (steel bar + open ring) | OK | |
| 176-178 | rigby, socket, mamamask | "Chrome-vanadium", torch, union rules | wrench | steel material | OK | |
| 179 | rigby + **rigby-join** | shown: "The Night Crew's yours. Wheels, latches, ranger carts. Point me at it, boss." / heard: "[gruff] Alright, kid. The union's with ya." | voice | history | **MISMATCH-voice** | Free: put the heard words first: "Alright, kid. The union's with ya. Wheels, latches, ranger carts. Point me at it, boss." Or regenerate, LysucvtFmzi1NVAE0rKp, ~$0.01 |
| 182 | rigby | mecha line | | | OK | |
| card S1 nudge (socket) | | "Rigby's in the North Woods from Dusk. Follow the **clanking**." | sound | no clank plays near Rigby (crowds.js:29 raccoons play `raccoon-chitter`; nothing else) | **MISMATCH-sound** | Free: "Follow the chittering." (Alternative: a periodic `hubcap-clang` near Rigby at Dusk, code only. Rewording is cheaper.) |
| card S1/S3 where | | "North Woods, north of the Reservoir and the North Meadow" | place | north-woods (-33, 930) | OK | |
| card S2 where/goal | | "The Delacorte Theater's **stage door**, just west of Turtle Pond" | place, prop | Delacorte (-38.5, 443) is west of Turtle Pond (8, 430) ✓; landmarks.js:491 builds seating, wall, stage and light towers, but no door; the guard stands outside the wall (people.js:64) | OK (direction) / minor prop | Leave "stage door" (the guard is the door). Low priority. |
| card S2 answer | | "…then peck the wrench off the **prop table**" | prop | layout.js:794 the wrench is a `glint` at (-41.6, 429.4) on the ground; no table anywhere at the Delacorte (landmarks.js:491-517) | **MISMATCH-prop** | Change the thing (code-built, cheap): a small table like the chess tables (landmarks.js:239-242: post + 0.8 m top + collision box) at the glint, the glint at table height. Or reword: "peck up the wrench by the stage". The table is a nice touch for "backstage"; either works. |
| card S2 nudge (ringo) | | "Guard at the stage door loves a hot slice." | | crews.js:321 guard wants a hot slice | OK | |
| card S3 nudge (mamamask) | | "Rigby's pacing by the North Woods **drain**" | prop | no drain or culvert modelled anywhere (grep world/); Mama Mask is on the Loch's bank (crews.js:141) | **MISMATCH-prop** (low) | Free: "by the Loch". (The "drain" entrance in crews.js is an animation kind, not a prop.) |

### den-choir.js (10 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 10, 12, 13 | vibrato, encore | Bethesda Choir, "An audience that STAYS", "whole middle of the park" | | crews.js:64 | OK | |
| 11 | vibrato | "That saxophone fellow **under the arcade** plays **one riff**…" | place, sound | people.js:46 sax busker at (10, 286), Afternoons, by the fountain on the lower terrace (fountain ~ (6.6, 283.5)); the arcade is ~z 270 (layout.js:661/900). Sound: audio.js:26 `sax: ['sax-busker-riff']` exists, **nothing ever plays it** (no mod returns 'sax'; collect.js:447 only uses 'busker' for Strawberry Fields) | **MISMATCH-sound** + MISMATCH-place (low) | Change the thing (free, the asset exists): a mod whose `music()` returns 'sax' when Gus is within ~25 m of the busker at Afternoon (until den-choir is done). Reword place: "That saxophone fellow by the fountain". Listen-through needed. |
| 15 (choir.signs) | bella | "Every sign, all the way **to the Boathouse**!" | place | the step's four signs are M4, M5 (Mall ends), M6 (terrace), M3 (Cherry Hill) (layout.js:606-609); the Boathouse sign M7 isn't one of them | **MISMATCH-place** | Free: "Every sign from the Mall to Cherry Hill!" |
| 20-21, 23 | vibrato, encore, lou | "They are STAYING", "ONE MORE!", lowest coo | | choir-coo-chorus + crowd-cheer + summonFeeders | OK | |
| 22 | narrator | "The sax busker shrugs, wanders over, and joins in instead of competing. It sounds amazing." | action, sound | den-choir.js:17 `extra` summons feeders and plays choir-coo-chorus + brass-stinger; the busker agent never moves and no sax plays | **MISMATCH-sound** (+ unshown action) | Change the thing (code only): in `extra`, walk the busker agent (role 'busker', acc sax) to the terrace and play `sax-busker-riff` under the chorus (both exist). Or reword: "Somewhere under the arcade, a saxophone joins in. It sounds amazing." and just play the riff. |
| 24 | vibrato + **vibrato-join** | shown: "Bravo, Gus! The Choir is yours. And take this megaphone, a gift…" / heard: "[rapturous] Magnifico! Now we sing for YOU!" | voice | history; megaphone exists (mecha.js:238) | **MISMATCH-voice** | Free: start the line "Magnifico! Now we sing for YOU! The Choir is yours, Gus. And take this megaphone…". Or regenerate, JBFqnCBsd6RMkjVDRZzb, ~$0.01 |
| 27 | vibrato | mecha line, megaphone in the chest | | mecha.js:411 | OK | |
| card S1 | | "Maestro Vibrato sings by the fountain on Bethesda Terrace, at the top of the Mall"; obstacle "The sax busker steals our audience" | place | vibrato (6.6, 279), fountain ~4.5 m away | OK (the silent busker is the sound row above) | |
| card S2 | | four signs: both Mall ends, terrace, Cherry Hill; pen, sunglasses | signs | layout.js:606-609 flip types (M5/M6 pen, M6 needs sunglasses) | OK | |
| card S3 | | feast, 40 crumbs, Coo on the terrace | | | OK | |

### den-rats.js (8 strings) + card (3 steps, 12 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 8 | sue | "Seven of 'em" grates | | layout.js:453-461: 7 grates | OK | |
| 9 | sue | "A whole slice from that $1 SLICE joint over there. HOT. **Down the stairs**." | prop | city.js:488 "$1 SLICE" sign ✓; there are no subway stairs anywhere (only grates; grep world/) | **MISMATCH-prop** (low) | Free: "HOT. Down the grate." (also in the card S1 obstacle and dialogue.js:18, which is outside this fragment) |
| 10, 15 | crumbsy, toast | crust; "Slices go cold. Some folks care." | | | OK | |
| 28-30 | express | "ALL ABOARD! … Stand clear of the closing cheese!", relay "down the steps from paw to paw" (comment) | | the relay drops the slice 5 times at Sue's spot; rat-squeak + subway-rumble play | OK (the line names no stairs) | |
| 33-35 | sue, pinstripe | "Hot. All the way down", "rat in a tie", slices to Merchants' Gate | | layout.js:722 Merchants' Gate drop | OK (text) | |
| 35 | sue + **sue-join** | shown: "The Grate Rats are yours. Any grate, any time. And my boys'll bring slices to Merchants' Gate." / heard: "[warmly] Ya did good, kid. The Grate Rats are in." | voice | history | **MISMATCH-voice** | Free: "Ya did good, kid. The Grate Rats are in. Any grate, any time…". Or regenerate, dmWfLQZJq7wNPv9WmtiM, ~$0.01 |
| 41 | sue | mecha line, A train | | | OK | |
| card S1 | | "Subway Sue sits on the subway grate at Columbus Circle"; obstacle "…HOT. **Down the stairs**." | prop | Sue (-99, -17) on grate (-100, -18) ✓; no stairs | **MISMATCH-prop** (low) | "Down the grate." (as line 9) |
| card S2 | | "tourist on the bench outside the red $1 SLICE joint, just west of Columbus Circle"; Coo with flock 6 | place | joint (-150, -24), bench (-143, -17.5), red sign B3432D | OK | |
| card S3 nudge (express) | | "**Fifteen metres**, joint to grate. Fly it straight down, kid." | place/distance | bench (-143, -17.5) to grate (-100, -18) = 43 m; counter (-150, -22.5) to grate = 50 m | **MISMATCH-place** | Free: "Fifty metres, joint to grate." |
| card S3 goal/where/answer | | "inside 60 seconds" | | layout.js:715 hotFor 60 | OK | |

### den-cats.js (25 strings) + card (3 steps, 13 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 28-31 | queenie, whiskerton | 110th Street, the bodega, anchovy slice from CPW & 72nd, "the ONLY joint" | | layout.js:718 only cpw72 has `anchovy: true` | OK | |
| 58-59, 62 | pickles bubbles, guard, cling | "*snore*… anchovy", "Not with Pickles RIGHT there", "Mob me all you like… Go bother the CAT." | | den-cats.js:33-44 sill box (code-built), Pickles on it with his bread (looks.js:129) | OK | |
| 79, 97, 99, 104, 106 | pickles | "Sigh. You AGAIN", "*yawn*", "*paw*", "I didn't do that" | | knock anim + knock-clatter + cat-meow | OK | |
| 122 | queenie | "Under it, perhaps?" / "The halal man's griddle is on 110th at Dusk" | place | layout.js:727 Dusk griddle (108, 1053) at 110th & Fifth | OK | |
| 140, 160 | toasts | "…on Pickles' sill at CPW & 72nd" | | sill at the CPW & 72nd bodega (z 247.25) | OK | |
| 170, 176 | Whiskerton (far off), pickles | "Cold already…", snores | | | OK | |
| 184 | express | "Hot anchovy, express service! Ninety-sixth Street, everybody off!" | | grate-96e | OK | |
| 189-191, 194-195, 199 | queenie, whiskerton, pickles, toast | join; "Pickles. The Reservoir. Those strips on the gatehouse." "For SCIENCE." | | P2 = Racers' roost, south gatehouse | OK | |
| 192 | queenie + **queenie-join** | shown: "The Bodega Cats are yours, darling. Anything on a ledge, we knock it off…" / heard: "[purring] Alright, sugar. The Bodega Cats are yours." | voice | history | **MISMATCH-voice** (near: same sense, "sugar" vs "darling") | Free: "Alright, sugar. The Bodega Cats are yours. Anything on a ledge…". |
| 202 | queenie | mecha line | | | OK | |
| card S1, S3 | | "outside the blue DELI GROCERY at 110th & Lenox"; "820 m… cold by 96th Street"; rats 72nd W to 96th E; griddle at 110th & Fifth | place | city.js:489 blue DELI GROCERY; queenie (61, 1066.3); cpw72 to 110th = ~830 m | OK | |
| card S2 where | | "Pickles dozes on the window sill of the **red $1 SLICE joint** at Central Park West & 72nd" | place | den-cats.js:30 the sill is at z 247.25, under the CPW & 72nd **bodega** (layout.js:513, blue DELI GROCERY, Z(71.0) = 247.2); the slice joint is next door at z 257.5. crews.js:168 Pickles' bio and the card's own answer ("under the bodega window") say bodega | **MISMATCH-place** | Free: "Pickles dozes on the window sill of the blue DELI GROCERY, next door to the red $1 SLICE joint at Central Park West & 72nd". |
| card S2 obstacle/nudge/answer | | fan on the bench, counterman's slice on the sill, wake a cat | | | OK | |

### den-crows.js (14 strings) + card (3 steps, 11 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 53-56 | vesper, cawdry, ledger | three shinies: "a ledge on Central Park West… by 72nd", "Plume just east of this oak", "under the Lake" | places | layout.js:766 shiny-cpw72 glint (-130.2, 276) on a CPW roof edge; :767 plume (-4, 352), 6 m east of the oak (-10, 365); :768 Lake dive (-10, 305) | OK | |
| 59, 90, 97 | Ledger bubbles/line | "Shiny, received. n of 3", "Entered in the book", Wanted board | | MARKET.board | OK | |
| 65 | vesper + **vesper-join** | shown: "Three shinies. Acceptable. More than acceptable. Welcome to the Exchange, kid." / heard: "[sly] Pleasure doing business, pigeon." | voice | history | **MISMATCH-voice** | Free: "Three shinies. Pleasure doing business, pigeon. Welcome to the Exchange, kid." Or regenerate, N2lVS1w4EtoT3dr4eOWO, ~$0.01 |
| 66-68, 80-81 | ledger, glint, vesper | ten-crumb fee, BLUE, the sealed cave "the rangers think it's a rock" | | PLACES.workshop cave, shed-door-fold + dust burst | OK | |
| 84 | toast | "The Workshop is open. Parts 0/8" | | schemes.js:478 8 PARTS | OK | |
| 88 | vesper | mecha line | | | OK | |
| card S1-S3 | | "the Exchange, the big oak in the middle of the Ramble"; "Ledge on CPW by 72nd. Plume east of the oak. Bubbles out on the Lake."; "Follow Vesper to the cave" | | as above | OK | |

### den-turtles.js (12 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 17 | eldest + **eldest-greeting** | shown: "Mmm… a pigeon. On our pond." / heard: "[slowly] Ahh... young one... sit a while." | voice | history | **MISMATCH-voice** | Free: "Ahh… young one… sit a while. Mmm… a pigeon. On our pond." (also dialogue.js:12 uses the same bark and opening, outside this fragment). Or regenerate, pqHfZKP75CvOlQylNhV4, ~$0.01 |
| 18 | eldest | "Something… is on our rock… It has… **WHEELS**." | prop | items.js:178 `cart` = one steel `BoxGeometry(0.6, 0.5, 0.9)`: a plain box, no wheels, no basket, no handle | **MISMATCH-prop** | Change the thing (code-built, ~15 lines): a wire-basket cart in makeMesh `cart`: an open frame from thin boxes (or a box with a wireframe-ish grid texture), a handle bar, 4 small dark wheel cylinders. Fixes lines 18, 19, 29 and the card. Screenshot on the bank. |
| 19-21 | shelly, moss, eldest | "A shopping cart, dear… Tuesday", "Find what is under the water" | prop | as above | MISMATCH-prop (same fix) | |
| 29-30 | bubbles, shelly | "Triple tuck! …Also it's a shopping cart. A HUGE one.", "Wedged on the bank" | prop, place | layout.js:774 surfaces at (9.5, 425.2), haulTo the bank | MISMATCH-prop (same fix) / place OK | |
| 142 | eldest + **eldest-join** | shown: "Our rock… is a rock again. Mmm. We remember you, pigeon." / heard: "[warmly, slowly] The Elders... remember you." | voice | history | **MISMATCH-voice** (near) | Free: "Our rock… is a rock again. Mmm. The Elders… remember you." |
| 143-144, 152, 158, 160 | eldest, shelly, slowpoke | Ask the Elders on the Scheme Board; truces on THIS rock; "Did… I… miss… it?"; "needs a hauler… Big legs"; 1911 | | turtles talent 'hints'; slowpoke walks in | OK | |
| card S1-S3 | | "the rock in Turtle Pond, at the south end of the Great Lawn"; "Bubbles by the rock"; "the **huge shopping cart** on the bank"; Biscuit hauls | place, prop | Turtle Pond z 430 < Great Lawn z 489 ✓; the cart prop as above | place OK / MISMATCH-prop (same fix) | |

### den-rhoda.js (9 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 18 | bigsal + **bigsal-greeting** | shown: "Big Sal. The Meer Mob. You want something, kid? Get in line. Behind HER." / heard: "[gruff] Show me your crew." | voice | history | **MISMATCH-voice** (and he says the next scheme's demand, "Show me your crew", before the hawk scheme even ends) | Free and better: move the bark. Drop `bigsal-greeting` from this line and attach it to den-meermob.js:165 ("Show me your crew, kid. Thirty birds. Through the arch."), whose words it matches. For this line, regenerate a new bark `bigsal-rhoda`: "[gruff] Get in line, kid. Behind HER.", SOYHLrjzK2X1ezoPC6cr, ~$0.01 (or leave it unvoiced). |
| 21 | | hawk-screech when Sal points at the sky | sound | sfx exists | OK | |
| 23-25 | bigsal, feathers | "Every afternoon she comes up here and raids the Meer", "Seventeen raids" | | card S2 needs Afternoon | OK | |
| 39-41 | rhoda, rex | "Home. No bolts, no spikes.", "Did you see that landing?" | | layout.js:657 P4 kind 'bolts'; hawk-dive-whistle + dive arrivals | OK | |
| 42 | rhoda + **rhoda-join** | shown: "I don't forget a favour, snack. Pigeon. Gus. Need something lifted? I LIFT." / heard: "[amused] Fine. You've got a hawk on your side." | voice | history | **MISMATCH-voice** | Free: "Fine. You've got a hawk on your side. Need something lifted? I LIFT." (loses "snack. Pigeon. Gus." and keeps the LIFT). Or regenerate the current line, EXAVITQu4vr4xnSDxMaL, ~$0.01 (keeps the snack/Gus joke: better). |
| 43, 50, 52 | pip, bigsal, rhoda | Pip practising, "She ain't raiding today", mecha line | | | OK | |
| card S1 | | "Big Sal holds court at the old stone Blockhouse, west of Harlem Meer" | place | Sal (-79, 1027), Blockhouse (-81.4, 1031), Meer (64, 1000) | OK | |
| card S2 | | "fly low over Harlem Meer… three times", Afternoon | | fights.js | OK | |
| card S3 | | "Walter's building on Fifth Avenue at 74th", "Walter never lets pigeons up", hot slice, raccoons, back stairs | place | layout.js:698 fifth-74 (128, Z 74.5); walter (129, 318.6); walter-stairs rig clue (130.4, 316.4) | OK | |

### den-songbirds.js (16 strings) + card (3 steps, 15 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 41 | mimi + **mimi-greeting** | shown: "**\*a perfect car alarm\*** …Ha! Gotcha. Oh, it's the pigeon with the scarf." / heard: "[mischievously] **Ring ring!** Ha! Gotcha!" | sound, voice | the only sound in this scene is `starling-chatter` (line 37); no car alarm plays. The voice says a phone ring | **MISMATCH-sound** + **MISMATCH-voice** | Goes with the issue's Mimi decision (a car's unlock chirp). Suggest: rename the impression "*a perfect car chirp* (bweep-bweep!)", play a car unlock chirp at the line's start (synth in audio.js, free: two short square-wave blips ~1.9 kHz, 0.08 s, 0.12 s apart; or audiogen sfx "car remote lock chirp, two short beeps", ~$0.12), and regenerate mimi-greeting as "[mischievously] Ha! Gotcha!" (o9B86nZP8mMLaT5FBEzP, ~$0.01) so the voice no longer says "Ring ring". |
| 42-45 | mimi, jay, ruby | the stage ledge over the columns, "SPIKES. All along the edge", "Glued them on… one dab each", Shakespeare | prop, place | layout.js:647 P3 ledge over the museum columns; strips, starling ring circling (den-songbirds.js:111-131) | OK | |
| 55-56 | mimi | "Our stage! *ahem* **\*a perfect car alarm\*** …Hear that echo? Half of Central Park West just checked their cars." / "they have all heard my car alarm a hundred times" | sound | only `starling-chatter` plays (line 53); no alarm, no echo | **MISMATCH-sound** | With the Mimi fix: play the chirp (with a delayed, quieter copy for the echo, free in code), and reword "car alarm" to "car chirp" in both lines ("Half of Central Park West just checked their cars" still works). |
| 57, 69, 86-87, 103, 105 | chip, mimi, jay, ruby | the ice-cream truck tune, "I've got it", "Phone rings, car alarms, ranger whistles, ice cream", "I'll be by the ice-cream truck", "*CLANK*" | sounds | audio.js:519 `jingle` synth played on the chime (line 65) and as Mimic with wobble (71). Jay's list = clues.js:842 Mimic rotation ['phoneRing', 'carAlarm', 'whistle'] | OK (if the Mimi fix swaps carAlarm for a chirp, change Jay's "car alarms" to "car chirps") | |
| 76, 99 | kids bubble, toast | "ICE CREAM!", "The truck plays its tune. Somewhere, a child gasps." | | | OK | |
| 85 | mimi + **mimi-join** | shown: "Every kid on the Plaza. With ONE tune. Sweetie, you're a genius. The Racket is yours." / heard: "[excited] The Racket's in, honey! Encore!" | voice | history | **MISMATCH-voice** | Free: "Every kid on the Plaza. With ONE tune. The Racket's in, honey! Encore!" Or regenerate, o9B86nZP8mMLaT5FBEzP, ~$0.01 |
| card S1-S3 | | museum CPW & 79th, the starlings circle; strips "one dab each, hanging half off the edge"; cats; "Mimi waits by the ice-cream truck at Grand Army Plaza, Afternoons"; perch on the truck and peck its chime | place, prop | museum-79 (-130, Z 79); truck (78, -13) with a perchable roof (den-songbirds.js:22-32); Mimi moved there in step 3 (line 136) | OK | |

### den-racers.js (16 strings) + card (3 steps, 15 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 21 | wingate + **wingate-greeting** | shown: "Coach Wingate. Reservoir Racers. Drop and give me twenty, rookie. …Wing-beats." / heard: "[energetic] Look alive! Wings up, chest out!" | voice | history | **MISMATCH-voice** | Free: "Look alive! Wings up, chest out! Coach Wingate, Reservoir Racers. Drop and give me twenty…" Or regenerate, pNInz6obpgDQGcFmaJgB, ~$0.01 |
| 22, 27 | wingate, sprint | "Somebody cleared our roost. A CAT", "One orange cat, one shove each" | look | looks.js:129 Pickles' ginger coat; den-cats join clears P2 | OK | |
| 28-30 | wingate, lapcount | race, "Ten rings, in ORDER", wheeled division | | layout.js:423 10 rings; pedicab | OK | |
| 39, 42-43, 48-49, 72-74 | lapcount, sprint, wingate | "*click*", feast 30 crumbs, "*click* GO!", "Pedal, pigeon", mecha line | | tick synth | OK | |
| 62 | wingate + **wingate-join** | shown: "A FEAST. Now THAT'S a cool-down. The Racers fly with you, Gus." / heard: "[cheering] Racers are IN! Now hustle!" | voice | history | **MISMATCH-voice** | Free: "A FEAST! Racers are IN! Now hustle!" Or regenerate, pNInz6obpgDQGcFmaJgB, ~$0.01 |
| 63-64 | wingate, wheezy | draft, "I… finished… a FEAST" | | | OK | |
| card S1-S3 | | "the roof of the Reservoir's south gatehouse", "Somebody cleared their roost", rings, pedicab, feast | place | wingate (4, 563) on the roof; south-gatehouse (14, 566) | OK | |
| (outside this fragment) | wingate TALK | dialogue.js:17 "Somebody SPIKED our gatehouse." and dialogue-sf.js:34 "Strips on our roost…" | fact | den-racers opens only after den-cats, whose join clears P2 | stale after the cats join (for the dialogue fragment) | |

### den-horses.js (17 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 30 | clementine + **clementine-greeting** | shown: "Morning, kid. That van's parked on our trough again." / heard: "[warmly] Well, hello there, little fella." | voice | history | **MISMATCH-voice** | Free: "Well, hello there, little fella. That van's parked on our trough again." (also dialogue.js:22 with the same bark). Or regenerate, 2OEeJcYw2f3bWMzzjVMU, ~$0.01 |
| 30 (2nd), 37 | clementine | "pulling tourists round the park all day", "Big Ben's right" | | | OK | |
| 34-35 | prickett, dapple | "Prickett Pest-Pro, Del speaking! …Hello?", "He leans on that van all morning, **on the phone** to nobody." | prop | street.js:38 Prickett's accessories are spraytank, wand, clipboard: no phone. humans.js:1191 has a `phone` accessory and pose (906) | **MISMATCH-prop** | Change the thing (code only, free): at the van in the Morning give Prickett the `phone` accessory (in place of the clipboard) and the `phone` loop. Screenshot at the van. |
| 49 | Chip bubble | "Watch this one, Gus. My favourite." | | | OK | |
| 60 | Duke bubble | "**\*the officer** writes a ticket\*" | prop | Duke is a horse with a saddle and nobody riding (looks.js:134); there's no officer anywhere (grep entities/, people.js) | **MISMATCH-prop** | Free: "*Duke writes a ticket. With a hoof. By the book.*" (keeps the joke; matches Duke's own line "That's a ticket, by the book"). |
| 62-64 | prickett, duke | "Geese! On Central Park SOUTH!", "A TICKET?", "my stock in the rink shed" | | van drives off, engine-loop | OK | |
| 92 | clementine + **clementine-join** | shown: "Ahh. Cold water, and nobody's van in it. The Carriage Horses are with you, kid." / heard: "[warmly] You've got the whole carriage line, sweetheart." | voice | history | **MISMATCH-voice** | Free: "Ahh. Cold water, and nobody's van in it. You've got the whole carriage line, sweetheart." Or regenerate, 2OEeJcYw2f3bWMzzjVMU, ~$0.01 |
| 93-95, 101 | clementine, dapple, bigben | KICK/PULL, lunch slice at the Pond carriage stop, the Ramble, "Hup.", mecha line | place | layout.js:723 line-carriage drop (30, -8) | OK | |
| trough | | (code-built, den-horses.js:19-25) | prop | box + water at (88, -9.6) | OK | |
| card S1 where | | "Clementine stands with the carriages on Central Park South, **by the trough**" | place | Clementine (-12, -6.5) and the carriages (street.js:71: x -40, -16, 8); the trough is at x 88, about 100 m east, by the Plaza | **MISMATCH-place** | Free: "Clementine stands with the carriages on Central Park South". (Moving the trough would move the van stop and the Prologue van, and needs replays.) |
| card S2 where | | "Prickett leans on his van **by the carriage line**, Central Park South" | place | van (88, -12), 80 m from the nearest carriage | **MISMATCH-place** | Free: "Prickett leans on his van at the trough, east along Central Park South by the Plaza". |
| card S2 obstacle, nudge | | "on the phone to nobody", "So make it RING" | prop | as lines 34-35 | MISMATCH-prop (same fix) | |
| card S3 | | "Let the horses drink" | | | OK | |

### den-geese.js (14 strings) + card (3 steps, 14 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 18 | gertrude + **gertrude-greeting** | shown: "HONK. This arm of the Lake is GOOSE TERRITORY." / heard: "[shouting] HONK! Off my **LAWN**!" | voice | history; she's on the Lake (crews.js:182 `water:lake`) and her whole scheme is that she has no lawn yet | **MISMATCH-voice** (contradicts the line) | Regenerate: "[shouting] HONK! GOOSE TERRITORY!", 7sAIIIXrQKek5xiLc1R6, ~$0.01 (dialogue.js:24 uses the same bark and line). "Off my LAWN" would suit her after the truce, when the Great Lawn is hers. |
| 21, 24-26 | puddles bubble, puddles, gander, gertrude | "Some of us LIVE here", "Boxed out", "Lieutenant Gander", "A lawn of our OWN" | | goose-honk | OK | |
| 40-42 | gertrude, gander | "BREAD! On a LAWN!", "goose territory now", "On the Elders' rock" | | the 9-goose march (den-geese.js:151-160) | OK | |
| 50-51, 53-55 | gertrude, puddles, gander | truce, "We hiss. They run.", "Ducks to stations!" | sound | goose-hiss exists | OK | |
| 54 | gertrude + **gertrude-join** | shown: "And YOU, pigeon. The Honk chases anything you point at. ANYTHING." / heard: "[shouting] FINE! The Honk is WITH YOU!" | voice | history | **MISMATCH-voice** (near) | Free: "FINE! The Honk is WITH YOU, pigeon! We chase anything you point at. ANYTHING." |
| 61, 63 | gertrude | Great Lawn picnickers eat SANDWICHES; mecha line | | people.js:66 four Great Lawn picnickers, Afternoon | OK | |
| card S1-S3 | | "float on the Lake by Bow Bridge"; "The Great Lawn's two signs, on its west and east sides"; Elders' rock | place | gertrude (-33, 316); N1 (-52, 489) west, N2 (39, 489) east | OK | |

### den-meermob.js (14 strings) + card (2 steps, 11 strings)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 130, 134-135 | feathers counting bubbles, feathers, bigsal, knuckles | counts to THIRTY, "Huh.", "Thirty, kid. Through the **arch**. Come back when you got a CREW." | prop | landmarks.js:658-667 the Blockhouse is four schist walls, 4.6 m high, with a 3.2 m gap in one; no arch (no lintel). The flypast trigger is the interior, r 5.5, up to 6 m (layout.js:889) | **MISMATCH-prop** (low) | Cheapest: a code-built lintel over the gap (one schist box across it at ~3.4 m) makes it an arch, and the flypast through it reads. Or reword to "Through the Blockhouse". |
| 142-143 | bigsal, feathers | "Now we eat, like gentlemen", sixty crumbs or slices | | card alts | OK | |
| 155 | bigsal + **bigsal-join** | shown: "That's a feast. The Meer Mob's with you, kid. All fourteen." / heard: "[gruff, warm] You got heart, kid. The Mob's with ya." | voice | history | **MISMATCH-voice** | Free: "That's a feast. You got heart, kid. The Mob's with ya. All fourteen." |
| 156-158 | bigsal, tiny, feathers | Muscle; "I'm Tiny."; "forty-four of us in your swirl" | | 30 needed + 14 = 44 ✓ | OK | |
| 165 | bigsal, feathers | "Show me your crew, kid. Thirty birds. Through the arch." | voice opportunity | unvoiced; its words are bigsal-greeting's | OK (see den-rhoda row 18: attach bigsal-greeting here) | |
| 167 | bigsal | mecha line | | | OK | |
| card S1 goal/where/nudge/answer | | "Fly the flypast through the Blockhouse **arch**", "low and in a line" | prop | as above | MISMATCH-prop (same fix) | |
| card S2 | | 60 crumbs or three slices | | | OK | |

### Cards with no den-*.js file

| card | text | checked against | verdict | proposed fix |
|---|---|---|---|---|
| den-biscuit S1-S3 (14 strings) | "Biscuit mopes on his blanket on Cedar Hill, the grassy slope east of the Ramble"; "Bubble rings out on the Lake's east arm, by the Loeb Boathouse"; "hide behind a bench"; tennis ball | fights.js:93-99 red-and-white check blanket; fights.js:78-91 benches; layout.js:772 ball-lake (23.5, 314) by the Boathouse (38, 312); items.js:35 tennis ball | OK | |
| den-strix S1-S2 (10 strings) | "The stall under the Exchange oak", 10 crumbs; "The path into the night woods, just north of Bow Bridge"; moss; headlamp | market.js:50 crate-table stall; layout.js:879-881 spectacles 10; ramble-stealth (-25.5, 339) north of Bow Bridge (-32, 310); layout.js:414 moss islands | OK | |

### Counts

- Strings checked: 408 (192 in the 14 den files, 216 on the 16 den cards).
- Mismatches: **37** in total.
  - **voice: 19** mismatches + 1 unknown (puddles-join has no history: needs a listen). 16 clear: mimi-greeting, eldest-greeting, clementine-greeting, gertrude-greeting (contradicts), wingate-greeting, bigsal-greeting (wrong scene), hazel-join, rigby-join, vibrato-join, sue-join, vesper-join, rhoda-join, mimi-join, wingate-join, clementine-join, bigsal-join. 3 near: queenie-join, eldest-join, gertrude-join.
  - **prop: 8**: peas tub (5 strings), shopping cart with no wheels (6 strings), Delacorte prop table, Prickett's phone (4 strings), Duke's "officer", subway "stairs" (2), Blockhouse "arch" (5), North Woods "drain".
  - **place: 6**: Express's "Fifteen metres" (really 45-50 m), Pickles' sill under the bodega and not the $1 SLICE joint, Clementine "by the trough" and Prickett "by the carriage line" (100 m apart), Bella "all the way to the Boathouse", the busker "under the arcade" (he's by the fountain).
  - **sound: 4**: Mimi's car alarm in two scenes, which never plays (and her voice says "Ring ring"); the sax busker's riff, which never plays (`sax-busker-riff.mp3` exists but is unused); the busker "joins in" with no sax and no movement; "Follow the clanking" with no clank.
  - **look: 0** in these files (Pickles is ginger, as Sprint says).
- Generation cost if every voice is regenerated instead of reworded: 20 × ~$0.01 ≈ $0.20, plus the Mimi chirp: $0 as a synth or ~$0.12 as an sfx. All the prop fixes are code-built.

## Part 3: non-den scheme files, their goal cards, threads.js, item-sources.js, credits.js

Scope: schemes/_sf-common, _ssf-common, fun-polish, gear-*, part-*, prologue, sab-*, say-cheese, signs-slices-found, spikes-feuds, truce-*; their cards in data/schemes.js (goal, where, obstacle, nudge, answer); data/threads.js, item-sources.js, credits.js.
Coverage: every player-visible string in these files (bubbles, say lines, narration, toasts, tutor prompts, interact labels, polaroid titles, canvas text, card fields). Comments are not counted. Lines checked: **374** (per-file counts in each heading). Prologue lines that live in dialogue.js (PROLOGUE_LINES) are included because prologue.js plays them; the parent's dialogue.js table may list them too.

Mismatches: **18** (prop 7, fact 4, look 2, voice 3 (2 wrong + 1 unknown), place 2).

### schemes/prologue.js (21 lines, 10 of them PROLOGUE_LINES from dialogue.js:79-96)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 17, 81, 121 | toast | "Fly east to the sign with the red DON'T strip, by the Pond's east path." | red DON'T strip; east of the lamppost; Pond east path | signs.js:49-53 (red #c4302b DON'T plate); layout.js:596 S1 x92 z18; lamp near layout.js:732 (62,12): S1 is +x (east) | OK | |
| 30 | bubble | "Zzz…" | | | OK | |
| 49-50 | ranger (voiced) | "Hey! Shoo!" + voice ranger-hey-shoo | voice | history: "[shouting] Hey! Shoo!" | OK | |
| 59, 119, 164, 230 | tutor | "hold to fly", "the sign", "over the crumbs to eat", "to gather your flock, hold it to swarm" | | | OK | |
| 80, 99 | clue | "!" over S1 | | | OK | |
| 115 | Gus thought | "FEED the birds…?" | the sign's text | signs.js (DON'T plate over FEED THE BIRDS) | OK | |
| 169 | Duchess bubble | "Hmm. Interesting." + gang-coo-murmur | Duchess on the Plaza fountain rim | layout.js:734 duchessPerch (97,-34.95) = fountain rim r5 | OK | |
| 174 | toast | "New scheme on your Board: Crumbs" | card title | schemes.js:33 title 'Crumbs' | OK | |
| 184-185 | toast | "The ranger fixed your first sign / the Gapstow sign / the south shore sign. Flip it again!" | | layout.js:596-598 names | OK | |
| dialogue.js:83 (frenzy, played by 200) | Duchess (voiced) | "Well, well. A feeding frenzy, on MY Pond. And it's all yours, little pigeon?" + voice duchess-greeting | voice | history: duchess-greeting = "[haughty] Ah. The pigeon with prospects." | **MISMATCH-voice** | Generate a frenzy line: audiogen voice, Lily `pFZP5JQG7iQjIQuC4Bku`, eleven_v4, text "[haughty] Well, well. A feeding frenzy, on MY Pond." → voice/duchess-frenzy.mp3 (add to audio.js's voice-dir regex), point line 83 at it. ~$0.01. (Or cheaper still: drop the voice from this line; the greeting is also used by her talk line dialogue.js:8.) |
| dialogue.js:84 | Gus | "Coo." | | | OK | |
| dialogue.js:85 | Duchess | "Three signs, three piles, and not a ranger in sight…" | 3 signs, 3 food piles | step 2 signsLive S1-S3; food piles per live sign | OK | |
| dialogue.js:86 | Dove (voiced) | "Shh. Everyone thinks I'm a dove." + voice dove-born-for-this | voice | history: "[delighted] I was BORN for this." (and wedding.js:169 uses the same file for its own line) | **MISMATCH-voice** | Generate voice/dove-shh.mp3: Sally `jkUnCsbErmJrcbWk1Hmh`, text "[conspiratorial whisper] Shh. Everyone thinks I'm a dove." ~$0.01 (the `dove-` prefix already routes to voice/). Or drop the voice here and keep the file for the Wedding. |
| dialogue.js:87 | Duchess (voiced) | "The Swells are with you, darling. Coo, and we come. Hold it, and we SWARM." + voice duchess-join | voice | no duchess-join entry in .audiogen-history.jsonl (the file has corrupt lines round it) | **MISMATCH-voice (unknown; needs a listen)** | Transcribe. If it doesn't say this, regenerate with Lily `pFZP5JQG7iQjIQuC4Bku`: "The Swells are with you, darling. Coo, and we come." ~$0.01 |
| dialogue.js:89 | ranger | "Who keeps doing this? It says DON'T. Don't feed the birds." | | | OK | |
| dialogue.js:91-92 | Prickett | "…Prickett Pest-Pro… Spikes on the Plaza, the Reservoir, the museum and the Fifth Avenue ledge…" | 4 sites | layout.js:654-657 P1 Plaza lampposts, P2 Reservoir gatehouse, P3 museum ledge, P4 Fifth & 74th ledge; spray-hiss on install | OK | |
| dialogue.js:93 | Duchess | "Our LAMPPOSTS!…" | lampposts | P1 = Grand Army Plaza lampposts | OK | |

#### Prologue card (schemes.js:33-57, 13 lines)

| line(s) | field | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 39-40 | s1 goal/where/obstacle/nudge/answer | "the sign with the red DON'T strip, on the Pond's east path" / "A loose plate, darling. Give it a PECK." | | as above | OK | |
| 45-47 | s2 goal/where/obstacle/nudge/answer | "…east path, Gapstow Bridge, south shore" / "on Gapstow Bridge" / Monty "one on Gapstow Bridge and one on the south shore" | S2 on the bridge; S3 south shore | S2 layout.js:597 at (71,47); bridge layout.js:288 centre (60.5,43.3), span 15 along x → ends at x≈53-68: the sign is ~3.5 m past the east end. S3 (50,4.6) is on the Pond's south side (pond centre z30) | **MISMATCH-place** (small) | Words: "by Gapstow Bridge" / "at the east end of Gapstow Bridge" in s2 goal, where, nudge and answer. (Or move S2 onto the deck: world change, needs replays; not worth it.) |
| 52 | s3 goal/where/obstacle | "Uh-oh." / "A ranger. And a van." | | prologue.end | OK | |

### schemes/_sf-common.js (4 lines) and _ssf-common.js (0 player lines: helpers only)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 115, 118 | Eldest, Slowpoke | "Mm. A truce… is sealed… when everyone… is here." / "Wait… for… me…" / "…Now." | Elders' rock, Slowpoke walks up | truceScene moves both bosses to rock (8.8,432.6), Slowpoke walks in; turtle-grumble | OK | |
| 98 | polaroid | default title "TRUCE" | | snapPolaroid + camera-shutter | OK | |

### schemes/fun-polish.js (2 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 13 | Express bubble | "Sixty seconds, kid. That's all a slice has." | 60 s | layout.js:714 SLICE.hotFor 60 | OK | |
| 28 | tutor | "to call a friend (hold it, pick a crew)" | | | OK | |

### schemes/gear-headlamp.js (4 lines) + card schemes.js:384-396 (10 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 9 | Express | "A KEY! On a little sneaker keyring! Somebody runs a LOT." | a sneaker keyring | items.js:22 key → code 'key', items.js:169: a plain gold ring + bar | **MISMATCH-prop** (small) | Change the thing (keeps the joke): give 'key' its own code with a tiny sneaker charm (two boxes, white + coral, ~2 cm) beside the ring; 'gate-key' keeps the plain key. Code-built, 2 lines. |
| 9 | Pinstripe | "Smells of sweat and determination. Jogger's, for sure." | | | OK | |
| 11 | narration | "The jogger jogs on the spot, pockets the key, and tosses the crows his old headlamp…" | "his" | people.js:73 jogger models ['human-park', 'human-jogger']; human-jogger is a young woman (imagegen2 concept "A fit young Latina woman…"), so the jogger you trade with can be her | **MISMATCH-look** (pronoun) | Words: "…tosses the crows an old headlamp". Card s2 obstacle "He never stops running." → "The jogger never stops." (layout.js:849 "He speeds up" is outside this fragment: same fix.) Or make the jogger role human-park only (code, but the joggers' look changes). |
| 12 | Cawdry | "A light for the night woods. The owl won't like it…" | | | OK | |
| 390 | s1 goal/where/obstacle/nudge/answer | "The subway grate on Central Park West at 86th, by the Reservoir" / Pinstripe "Something jingly down OUR grate at 86th" | grate 86 W | layout.js:458, 701, 776 (-128, Z(85.6)=548): on CPW, ~16 m south of the Reservoir's south edge | OK | |
| 391 | s2 goal/where/obstacle/nudge/answer | "wait with the crows at the water fountain by the Reservoir's north gatehouse: the jogger stops there once a lap" / Cawdry "Water fountain, north gatehouse." | a water fountain | jogger stop people.js:73 (-4,759.4) beside north gatehouse layout.js:319 (-12,758); landmarks.js:595 gatehouse builder draws no fountain; no drinking-fountain prop anywhere (grep "drink": none). The jogger stops on bare path and bubbles "*gulp*" | **MISMATCH-prop** | Change the thing: a code-built drinking fountain at (-4.6, 759.4) (a stone pedestal cylinder ~0.9 m + a little bowl + a spout nub). Render-only, no collider, so no route changes and no replay. ~12 lines in props or gear-headlamp.js. Also fixes Cawdry's line (dialogue.js:38). |

### schemes/gear-pen.js (4 lines) + card schemes.js:369-382 (10 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 15 | narration | "A gold cufflink, warm from under a very expensive shoe." | gold | items.js:24 cufflink → code 'shiny': a pale blue-white octahedron (items.js:123 #cfe7ff) | **MISMATCH-prop** | Change the thing: a 'cufflink' code (a small gold disc on a stud, mats.gold). Code-built, 1-2 lines. Also matches Ledger's nudge "for a gold cufflink" (card s2). |
| 17 | narration | "The artist dashes off a portrait of Gus in thanks: three lines and an attitude." | | | OK | |
| 18 | Vesper | "A paint pen. Enamel signs, kid… And the picture goes in the Workshop." | the portrait in the Workshop | workshop.js:90, 206: wall dressing is a spare hubcap, cone, can, box; no portrait anywhere (grep) | **MISMATCH-prop** | Change the thing (it's a good gag): a code-built framed doodle on the Workshop wall (canvas texture: three-line pigeon + scowl; flip the canvas, the world is mirrored), shown once gear 'pen' is owned. Render-only. ~15 lines. Cheaper: cut "And the picture goes in the Workshop." |
| 40 | waiter bubble | "My CRYSTAL! Who— Coming, coming!" | the glass | clues.js:136 wineGlass prop at layout.js:817; smash | OK | |
| 375 | s1 goal/where/obstacle/nudge/answer | "…Call the cats… by the wine glass teetering on the table edge: the waiter rushes over with a dustpan…" | a dustpan | people.js:54 waiter acc ['apron'] only; gear-pen.js:42 plays 'pickup' | **MISMATCH-prop** (small) | Words: "the waiter rushes over to sweep it up". (A dustpan acc would be code-built, but it'd show all Afternoon.) |
| 375 | s1 where | "The waiter on the Tavern on the Green patio, west of Sheep Meadow" | | tavern (-100,162) vs Sheep Meadow (Hazel -45,160) | OK | |
| 380 | s2 goal/where/obstacle/nudge/answer | "The sidewalk artist in the beret, at the north end of the Mall" / Ledger "She'd draw ANYTHING for a gold cufflink" | beret; north Mall | people.js:42 artist human-park + beret at (13,228): upper Mall (Mall z≈150-268) | OK (gold: see cufflink row) | (human-park is a deliberately neutral "generic adult" model, so "She" is fine.) |

### schemes/gear-sunglasses.js (3 lines) + card schemes.js:359-367 (9 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 45-47 | selfie tourist, toast | "Wait… a pigeon in my… that's actually a GREAT shot." / "Look! Is that a DOVE back there too?!" / "He's showing his friend the shot…" | phone, camera-shutter | people.js:35 human-park + acc selfie stick & phone (humans.js:1192) + sunglasses-up | OK | |
| 363 | s1 | "the Plaza Hotel's roof, beside the corner turret with the flagpole" / Glint "by the turret with the flag" | turret + flagpole | city.js:264-274 (fix-25 flagpole on the GAP turret, shiny beside it) | OK | |
| 365 | s2 | "by the Grand Army Plaza fountain… Stand on the fountain rim right behind him" / Monty "Behind him, on the rim" | fountain rim | gear-sunglasses.js:10 fountain (97,-40) r5; tourist faces away from it | OK | |

### schemes/part-beak.js (4 lines) + card schemes.js:414-438 (20 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 9 | Sue | "One lucky hard-hat sticker. Smells of drain…" | | items.js:26 sticker = gold disc (default) | OK | |
| 10 | narration | "The foreman slaps the sticker on his hat. 'Take a cone, kid. They're behind the shed gate. It sticks.'" | foreman's hard hat | people.js:85 human-vendor + hardhat | OK (narrated; optional: a gold disc on his hardhat after the deal) | |
| 13 | narration | "One orange traffic cone, regulation size, slightly squashed." | | traffic-cone.glb ≈0.70 m tall (glb bounds × node scale) | OK | |
| 18 | bubble | "Hup." (Big Ben) | | bigben looks.js:136 | OK | |
| 418-433 | s1-s4 cards | "The grate on Fifth Avenue at 77th, by the construction site" / "The foreman in the hard hat… Fifth Avenue & 76th" / "jammed sidewalk-shed gate" / "The huge cone on the kerb" / Biscuit "A big orange one!" | 77th E grate; site at 76th; shed gate | sticker-grate (128,377) = Z(77.3); fifth-76 (128, Z(76.5)); foreman (129,359); shed-gate door layout.js:832 (126.6,361.5) | OK | |

### schemes/part-body.js (5 lines) + card schemes.js:148-161 (14 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 11-12 | Vinnie | "PIGEONS! At MY cart! Twenty-two years on this Mall…" | | | OK | |
| 14 | Rigby | "She's rigged, boss. Hop on. Mind the mustard." | | hotdog-cart.glb | OK | |
| 16-17 | Rigby, Vesper | "A hot dog cart. In a cave…" / "That's a body, kid…" | | mecha.js:4 body = hotdog-cart | OK | |
| 152-157 | cards | "Vinnie's hot dog cart, halfway up the Mall" / "Vinnie has a broom" / "Flip M4 and M5… or peck a hot slice onto his counter" / Ringo "Over Bow Bridge, through the Ramble" / "The Workshop cave in the Ramble, just north-west of the Exchange oak" | cart, broom, workshop place | layout.js:369 cart (8.7,206) in Mall (z150-268); humans.js:1200 broom acc; workshop (-26.4,381) vs Vesper's oak (-10,365): north-west | OK | |

### schemes/part-eyes.js (3 lines) + card schemes.js:105-108 (2 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 7-9 | Rigby, Socket | "Two carts, two hubcaps… it needs EYES." / "Polished 'em…" / "The Crew'll carry 'em to the cave…" | hubcaps as eyes | mecha.js:9 eyes = two chrome hubcaps | OK | |
| 107 | card | "Rigby hands you two hubcaps." / "Rigby, in the North Woods" | | rigby (-33,930) North Woods | OK | |

### schemes/part-legs.js (8 lines) + card schemes.js:276-283 (15 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 15-16 | Strix | "Two of them, dear. Iron. Long as a bench. Under the lawn since 1890…" | iron pipes | items.js:177 pipe = rust cylinder 3 m × 0.3 m | OK | |
| 21-23 | Hazel, Biscuit, Pretzel | "Two drainpipes! On a DOG lawn!…" / "We GUARDED…" / "Huge, though. Right by the road…" | road | great-lawn-pipes (-7,541) beside the 86th transverse (Z(86)=556) | OK | |
| 33, 37 | bubbles | "On guard! GUARDING!" / "*very serious guard face*" / "Hup." | | | OK | |
| 280-282 | cards | "the Great Lawn's north edge, by the transverse road" / Hoot riddle / Pretzel "Two plumes on the north edge" / Big Ben "Hup." | 2 plumes | layout.js:787 two dig spots | OK | |

### schemes/part-power.js (2 lines) + card schemes.js:285-292 (14 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 13-14 | Dove | "An empty basket, darling, and a crowd that wants a dove…" / "Come and see me on Bow Bridge some Afternoon, darling. Two doves…" | Bow Bridge Afternoon postcard | layout.js:935 bow-bridge postcard, afternoon, "Two doves! Stunning!" | OK | |
| 289-291 | cards | "Bow Bridge on the Lake, where a wedding party waits" / "The planner with the empty wicker basket" / Gander "EVERYBODY moves for a goose." | basket | people.js:59 planner; basket mesh in setpieces/wedding.js | OK | |

### schemes/part-talons.js (15 lines) + card schemes.js:238-246 (14 lines)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 28 | notice (canvas) | "RANGER CART" / "PARKING: NIGHTS" + cart in dashed box | | drawn mirrored on the shed door | OK | |
| 66-68 | Prickett | "In you go, my beauties. Every strip I own, safe and sound in the rink shed." / "…the rangers park their last cart right across this door, every night…" / "Morning, birds! Nothing personal!" | pallet of strips, steel door | pallet mesh (red strips), rink-shed rollup layout.js:829 | OK | |
| 72 | narration | "A ranger's notice on the steel door: a cart, in a parking box. The South cart sleeps right here." | | | OK | |
| 72 + card 241 obstacle | narration | "Prickett's stock AND the last ranger cart, behind one steel door. Nothing with paws opens that." | the cart "behind" the door | Prickett's own line and the notice: the cart parks *across* (in front of) the door; card s3 also says "the parked cart stand[s] between the ice and the shed" | **MISMATCH-fact** (small) | Words: "Prickett's stock behind one steel door, and the last ranger cart parked across it. Nothing with paws opens that." (narration and card s1 obstacle). |
| 88, 90, 92-93 | Mama Mask, Ringo | "Union rules, sweetie. One slice first." / "Ooh, she's fed…" / "…One slice. Any slice. Union rules." / "She'd FLY off a big enough bump… KEEP CLEAR bit…" | KEEP CLEAR | landmarks.js:135 chevrons painted on the ice | OK | |
| 98-101 | Ringo quips | "More SPEED, boss!…" / "Wrong spot! The KEEP CLEAR bit…" / "Told ya. Needs to be COLDER…" / "That's not the KEEP CLEAR bit, boss." | | | OK | |
| 241-243 | cards | "Wollman Rink's yard, by the north boards" / "The Zamboni garage at Wollman Rink's south end… buckled" / "drive laps till the hopper's full, Dump… KEEP CLEAR chevrons… hold Spray…" | garage at south end, buckled | layout.js:827 rink-garage z72.5 (rink centre 88.6) buckled: true; shed z104 north | OK | |
| spikes-feuds.js:46 | taker line | "Mama Mask takes it. 'Union rules. NOW we work.'" | | | OK | |

### schemes/part-wings.js (3 lines) + card schemes.js:399-412 (12 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 8-10 | Vesper, narration, Ledger | "One sail. Lean it by the scaffold…" / "An RC remote, slightly sticky. The tug on the pond blinks awake." / "Two sails. That's a wingspan…" | sail, remote, tug | items.js:175 sail (cream sheet), 179 remote (dark box); vehicles.js rc-boat | OK | |
| 403-410 | cards | "The bubbles on Conservatory Water, the model-boat pond near Fifth Avenue" / Bubbles nudge / "buy a shiny at the Exchange stall (15 crumbs)… or the ice-cream jingle" / "The sailboat under the fountain spout" / "That's a SHOWER, Gus." | spout, jingle | vehicles.js:141 spout plume; layout.js:783; audio.js:519 jingle; layout.js:850 rckid mimic sound 'jingle' | OK | |

### schemes/sab-middle.js (3 lines) + card schemes.js:89-95 (10 lines)

| line(s) | who | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 8 | Queenie | "A key on a hook. Honestly, darling, they make it too easy." | a hook | see next row | (covered below) | |
| 93 | s1 goal/where/obstacle/answer/nudge | "The locked gate of the Loeb Boathouse lot, on the Lake's east arm" / "The key hangs on the booth's hook, teetering." / Pickles "A key on a hook, wobbling?" | a booth with a hook | layout.js:798 lot-key teeter at (45.4, 310.4, y 2.1); clues.js:128-139 draws only the key mesh rocking; landmarks.js:426 boathouse builder and DOORS layout.js:830 (a free-standing bar gate): no booth, no hook anywhere (grep). The key wobbles in mid-air 2.1 m up. Same words in the locked-gate toast (clues.js:225) and the keeper label "the Boathouse lot booth" (item-sources.js:53) | **MISMATCH-prop** | Change the thing: a code-built parking booth (box ~1.4 × 2.3 × 1.4 m, a window, a little roof) with a peg hook at the key's spot, (45.4, 310.4), say 0.5 m behind the key. Render-only keeps routes and replays unchanged (or with a collider: then re-check the sab-middle replay). ~15 lines. |
| 10-11 | Rigby | "Spark plug's in my pocket. Hubcap's under my arm…" / "Every sign in the middle of the park stays flipped now…" | | | OK | |
| 94 | s2 | "The ranger cart parked in the Loeb Boathouse lot" / Ringo "Parked cart, no ranger…" | | cart-middle (46,318) | OK | |

### schemes/sab-north.js (2 lines) + card schemes.js:97-103 (10 lines)

| line(s) | who | text | names | checked against | verdict | fix |
|---|---|---|---|---|---|---|
| 8-9 | Rigby, Socket | "North cart: retired. Hubcap: liberated." / "Nice shine on this one…" | | | OK | |
| 101-102 | cards | "The ranger shed at 103rd Street, south of Harlem Meer" / "The door's latch rope is high up." / "Hold Coo at the rope with a flock of 15" / Socket "Fifteen, though…" | rope, shed | DOORS layout.js:831 shed-103 rollup, rope y 2.9 flock 15; clues.js:208-210 rope mesh; (62,862) = Z(101) south of the Meer | OK | |

### schemes/say-cheese.js (17 lines) + card schemes.js:444-468 (15 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 110 | interact label | "Guarded: the old film camera" / "Pick up the old film camera" | | items.js:39 tourist-camera.glb (~13 cm vintage rangefinder) | OK | |
| 117 | tourist bubbles | "Hey! That's my OLD camera, buddy. Shoo." / "Nope. Mine. Go be in somebody else's picture." | | | OK | |
| 118 | guard prompt | "He's watching his camera. Get in his shot, or give him a Coo." | "he/his" | say-cheese.js:67-68 the tourist is a clone of human-tourist.glb: "a clearly middle-aged woman" (design/ASSETS.md:244, concept redone for exactly that) | **MISMATCH-look** (pronouns) | Words: she/her in every line about the tourist: this prompt, toast :145 "She's gone in for her lens…", card s1 obstacle "She's guarding it while she snaps the skyline. Get in her shot…", nudge "Stand in her shot and she forgets everything.", answer "beside her balcony… in front of her lens… Coo below her. When she turns away…". (The bubbles' own "buddy"/"little guy" are about the pigeon: fine.) |
| 142, 144, 154 | tourist bubbles | "Huh? Who said that? …Oh! A pigeon!…" / "Ha! A pigeon right in my shot!…" / "Wait right there! I need my good lens…" / "My old film camera?! …Eh, it never had film in it anyway." | camera-shutter | human-tourist has a modelled camera (ASSETS.md:259) | OK | |
| 145 | toast | "He's gone in for his lens. Peck the old camera on the ledge." | he/his | as above | (MISMATCH-look, same fix) | |
| 163-165 | Flicker | "Ooh. OOH. A real film camera…" / "Film is my business… Beak-certified." / "There. Loaded… the first picture is of ME." | | looks.js:98 flicker crow + canister | OK | |
| 168, 174-176 | toast, polaroid, bubble, toast | "New gear: Film camera. Photo mode is open: …" / "PHOTO MODE · Say Cheese!" / "Flicker: Gorgeous. Frame it. Frame ME." / "Your photos are in the Album (Pause, then Album)…" | | ui/photo.js | OK | |
| 451-466 | cards | "Borrow the old film camera from the tourist's window ledge over CPW" / "between 71st and 72nd" / Cawdry "Tourist in a window over CPW, past 71st" / "Flicker the crow, on the slope below Belvedere Castle, at the Ramble's north-east edge" / "the crow with a film canister on a red cord" / "Open photo mode (Pause, then Photo)…" / Flicker "Both sides are my good side." | place; canister on red cord | CAMERA_AT z 262.35 between Z(71)=247 and Z(72)=268; flicker (8,392) ~26 m SE below Belvedere (P(0.45,79.3) = (-11,418)); characters.js:594-595 canister: black body, yellow band, red cord | OK (pronouns: see above) | |

### schemes/signs-slices-found.js (0 player lines), spikes-feuds.js (1 line, listed under part-talons)

### schemes/truce-cats-rats.js (11 lines) + card schemes.js:163-181 (13 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 14 | narration | "Hssss! Squeak! The cats chase the rats off the bodega bins. Again." + cat-hiss, rat-squeak | sounds; bins | sfx cat-hiss, rat-squeak (match); bins: see card row | OK (sounds) | |
| 15-17 | Queenie, Sue, Whiskerton | "Our bins, darling. Our street. Our ANCHOVIES." / "…before the STREET." / "…enough for everyone…" | | | OK | |
| 28-29 | Crumbsy, Queenie | "Three slices. Six crusts…" / "…One each. Fine. FINE. A whole box changes things." | 3 slices | items.js header: a box pecked open gives 3 slices | OK | |
| 30, 34-36 | Sue, Eldest, Slowpoke | "A slice for us, a slice for you. Deal. On the Elders' rock, so it sticks." / "Mm. A truce… is sealed… when everyone… is here." / "Wait… for… me…" / "…Now. Paws, please." | the shake on the Elders' rock; Slowpoke arriving | truce-cats-rats.js:24-41: Queenie, Sue, Whiskerton and Crumbsy gather round Gus at the 110th kerb; the camera cuts to the rock (Turtle Pond, ~640 m south), where no boss is; Slowpoke doesn't walk in; the cheer is back at the kerb. Every other truce (dogs, geese) uses _sf-common truceScene, which flies both bosses to the rock. threads.js:27 "Settle them on the Elders' rock." | **MISMATCH-fact** | Change the thing: run truceScene(G, 'catsrats-truce', { a: 'queenie', b: 'sue', caption: 'Cats & rats', lines: [Crumbsy, Queenie, Sue lines], after: [Express line] }, done). Code only; it lengthens the scene, so re-record or re-run the truce-cats-rats replay. (Words-only fallback: drop "On the Elders' rock" and the rock shot; worse, since every truce is meant to happen there.) |
| 39 | Express | "Slice Relay's open, Gus! Any grate, once a phase: a hot one pops right up. And the cats send slices to the Meer now." | Slice Relay; Harlem line | GAME_DESIGN.md:118, 454; gives line 'harlem' | OK | |
| 167 | s1 goal/where/obstacle | "See the bins outside the DELI GROCERY at 110th & Lenox." / "The bins outside the blue DELI GROCERY" | blue DELI GROCERY sign; bins | city.js:489 'DELI GROCERY' on #2F4F8F (blue) OK; city.js:495-516 storefront builder draws no bins; the only bin on that block is the slice joint's back-door bin, layout.js:719 (47,1071), 14 m west of the bodega front (x≈61) | **MISMATCH-place** (small) | Change the thing: two code-built bins (the slices.js bin material, a lid each) at the bodega front, render-only. ~6 lines. Or words: "the bins on 110th & Lenox". |
| 169-179 | s2 goal/where/obstacle/nudge/answer | "Whole boxes sit on the pickup shelf at the CPW & 72nd $1 SLICE, and ride with the East Drive cyclist in the Afternoon" / Pinstripe "The cyclist on East Drive carries one every Afternoon" / "have the songbirds ring the East Drive cyclist's phone, or the geese chase him, so he drops his box" | $1 SLICE; pickup shelf; a *cyclist* | city.js:488 '$1 SLICE' OK; layout.js:819 pickup-shelf teeter (a box rocking at 1.7 m) OK; people.js:74 cyclist = human-vendor (Vinnie's own model) + helmet + box, act 'path': he walks; no bicycle anywhere (humans.js has a 'helmet' acc and no bike: grep "bike"/"wheel": none) | **MISMATCH-prop** | Words (cheaper): "the East Drive delivery man" in where, nudge and answer; the helmet and box still read. Better, if the owner wants the cyclist: a code-built bike (two torus wheels + tube frame) on the holder with a slow ride pose: ~30 lines plus pose work; screenshots needed. Also worth a model swap off human-vendor (players may read him as Vinnie): human-park + helmet. |
| 172-179 | s3 goal/where/obstacle/nudge/answer | "Open the box on the kerb at 110th & Lenox" / "carry it low, or take the grates to 96th E" / Express "in at 72nd, out at 96th" | | items.js HEAVY_LIMITS | OK | |

### schemes/truce-dogs-squirrels.js (15 lines) + card schemes.js:267-274 (14 lines)

| line(s) | who | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 23, 25 | sounds, bubbles | dog-bark, squirrel-chatter; "WOOF!" / "EEK!" | | sfx files exist | OK | |
| 28 + card 273 obstacle | Hazel | "See? SEE? Every Morning. Eight dogs. No squirrel digs where the dogs run, Gus." / card s3 obstacle "Eight dogs. One sack." | eight dogs with the walker | people.js:70 dogwalker `dogs: 2` (two leashed dogs; humans.js:270-294) | **MISMATCH-fact** | Change the thing (keeps the joke, and a pro walker with a fistful of leashes is very New York): `dogs: 8` on the Cedar Hill dogwalker. Render-only (leash dogs follow the walker); morning only, one walker. Words fallback: "That walker. Those dogs." / "A pack of dogs. One sack." |
| 29-30 | Biscuit, Pecan | "They're not MY dogs!…" / "…Nineteen seventy-four. I buried it on Cherry Hill." | | | OK | |
| 38-39 | Pecan, Hazel | "A whole sack of tennis balls!…" / "Heavy, Gus. Carry it low. And drop it by the dog walker. In the MORNING." | sack | items.js:176 sack (tan) | OK | |
| 57, 61, 64 | Pretzel, walker, Hazel, Biscuit | "BALLS! BALLS! BALLS!" / "Hey! HEY! Come back!" / "They're chasing BALLS…" / "…Can we do the shaking first? Quickly?" | 14 tennis balls burst | truce-dogs-squirrels.js:17-18 14 yellow-green spheres; drop-thud, dog-happy-bark | OK | |
| 69-71 | truce lines, caption | "Squirrels dig on the dog lawns. Dogs stand guard. Deal?" / "DEAL! Guard!…" / "Fifty years I've waited…" / "Dig and FETCH, Gus!" / polaroid "Dogs & squirrels" | | truceScene (rock) | OK | |
| 270-272 | cards | "Cedar Hill, the grassy slope east of the Ramble" / "The dust plume on Cherry Hill, just west of Bethesda Terrace" / Pecan nudge / Pretzel nudge | places | cedar-hill (44,380) east of the Ramble; pecan-cache (-42,283), Bethesda ≈ (6.6,279) | OK | |

### data/threads.js (20 lines shown: name, goal, meter label, antagonist line × 5; `reward` is never shown in the UI, grep `.reward`: no use)

| line(s) | thread | text | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 7-9 | Sign War | "Make the park feed the birds, for good." / Bread Power, carts / "The rangers fix every sign you flip. Unless their carts stop running." | 3 carts | sab-middle, sab-north, part-talons (cart.south) | OK | |
| 13-15 | Slice Run | "Get pizza flowing into the park." / Slice Lines /3 / "Vinnie sells hot dogs on the Mall. He does NOT like pizza." | | 3 lines (columbus, carriage, harlem) | OK | |
| 19-21 | Spikes | Spikes cleared /10 / "Del Prickett bolts spikes onto every perch pigeons love…" | 10 sites | layout.js:654-663 P1-P10 | OK | |
| 25-27 + systems/schemes.js:266 toast | Feuds & Truces | meter "Truces" max 4 / "Four feuds keep the park divided. Settle them on the Elders' rock." / toast "Truces n/4" | four truces | only three schemes give a truce: schemes.js:163 cats-rats, :258 geese-ducks, :267 dogs-squirrels. The design's fourth (GAME_DESIGN.md:486 "Hawks vs pigeons … den-rhoda") isn't wired: den-rhoda gives (schemes.js:296) has no `truce`. The meter stops at 3/4 forever | **MISMATCH-fact** | Data (one field): add `truce: 'hawks-pigeons'` to den-rhoda's `gives`; the meter then fills as designed. (Words fallback: max 3, "Three feuds".) Check tools/check-schemes and any replay that asserts the truce count. |
| 31-33 | Lost & Found | "Work the crows' market for gear you can't get alone." / Deals /6 / "Humans lose things everywhere. The crows trade them back, for a fee." | | TRADES layout.js:867+ | OK | |

### data/item-sources.js (12 labels; shown in the keeper's toasts "X is back at <label>" / "floated back to <label>", systems/schemes.js:381, 396)

| line(s) | item | label | checked against | verdict | fix |
|---|---|---|---|---|---|
| 51 | peas | "the Boathouse picnic table" | den-ducks (fork A's scope: the "tub of peas") | see den-ducks | |
| 52 | wrench | "the Delacorte stage door" | den-raccoons | OK | |
| 53 | gate-key | "the Boathouse lot booth" | no booth (see sab-middle) | **(same MISMATCH-prop as sab-middle)** | fixed by the booth |
| 54 | tennis-sack | "the squirrels' pecan cache" | it's Old Pecan's 1974 cache on Cherry Hill; "pecan cache" reads as a stash of pecans | OK (minor wording: "Old Pecan's cache on Cherry Hill" reads better) | |
| 55-62 | ball, spectacles, cufflink, key, sail ×2, camera, sticker | "the Lake shore by the Boathouse", "Ledger's stall at the Exchange", "the Tavern patio", "the 86th Street W grate", "the Conservatory Water shore", "the tourist's window ledge on CPW", "the 77th Street E grate" | positions match their PLACES | OK | |

### data/credits.js (≈20 lines)

| line(s) | text | names | checked against | verdict |
|---|---|---|---|---|
| 81-105 | title, "A game by", "Starring… the Mecha-Pigeon (one hot dog cart, two drainpipes, two sails, a traffic cone, two hubcaps, a megaphone, a rowboat battery and a lot of spike strips)", crews list, tools, licences, thanks | Mecha parts | mecha.js:4-11 (cart, pipes, sails, hubcaps, cone, megaphone, battery, strips); the battery comes from under Bow Bridge's rowboat (Nightcap's line) | OK |

### Out of this fragment's scope, noticed in passing
- layout.js:851 rckid "He hugs the remote tighter" — the RC kid is human-child, an 8-year-old girl (imagegen2 concept). Same pronoun fix.
- layout.js:849 jogger "He speeds up. Cardio!" — see the jogger row.
- part-talons.js:63 rolls the shed door down with `shed-door-fold` ("steel roll-up door crumpling and folding, metal crunch"): no line names it, but a plain roll-down rattle would suit better (the crumple is the Rink Job's payoff).

## Part 4: strings outside game/src/data and game/src/schemes

Scope: every player-read or player-heard string in game/src/{main.js, systems, ui, finale, setpieces, entities, world, gfx, anim, core, state} and game/index.html.
Method: a literal-string extractor over every file (scratchpad strings-C.txt / strings-W.txt), plus a grep for short toasts/bubbles/captions the extractor misses (`'BONK.'`, `'HONK!'`, `'Now! Coo!'`, etc.). Shader code, SVG paths, CSS, debug and console strings were counted and set aside (no player sees them).

Counts: about 700 player-facing strings checked (per-file counts below; the extractor counts are approximate by ±5% because of template fragments) plus 27 short toasts/bubbles found by grep. Mismatches: 18 rows (voice 5, one of them covering all 17 ally-call bubbles; sound 4; prop 5; look 1; fact/UI 3).

### Sound reference: Mimi's mimic sounds (audio.js synth, played by clues.js)

| sound | where it plays | what the synth does (audio.js) | reads as |
|---|---|---|---|
| `carAlarm` (audio.js:494-497) | only in `#genericBlock` (clues.js:842): Mimi asked at a human with no scheme behind it, rotating `['phoneRing','carAlarm','whistle'][floor(time)%3]` with wobble | 6 sawtooth sweeps 600→1400 Hz, 0.3 s each at 0.32 s spacing (~1.9 s of "wee-wee-wee"), then 6 square 900 Hz beeps 0.12 s each at 0.18 s spacing; very quiet (vol 0.06 / 0.05) and buzzy | a cheap siren / toy laser, not a car alarm |
| `phoneRing` (489-493) | all the scheme blockers' Mimic (layout.js:846/849/854/857) + the generic rotation | two 0.8 s bursts of square 440/480 Hz alternating every 50 ms (US ring trill) | a phone ringing: OK |
| `whistle` (509) | generic rotation; race start (race.js:84); RC tug horn (vehicles.js:519) | sine 2300→2600 Hz 0.35 s, then 2600→2000 Hz 0.4 s | a "wheet-whoo" slide/wolf whistle, not a ranger's pea whistle. A real referee whistle sample exists, unused: `sfx/ranger-whistle.mp3` ("sharp referee whistle blast, single") |
| `jingle` (498) | rckid blocker, den-songbirds | music-box ice-cream tune | OK |

Unlock-chirp replacement for `carAlarm` (recommended; the owner's idea, and it suits a starling): a synth code change, $0, keeps the wobble:
`case 'carChirp': for (const t0 of [0, 0.16]) { this.#tone({ type: 'square', f: 2050, t0, dur: 0.07, vol: 0.09 * vol, detune: dt() }); this.#tone({ type: 'sine', f: 4100, t0, dur: 0.05, vol: 0.03 * vol }); } break;` (two short bright "bwip-bwip" blips, ~0.25 s; optionally a third longer 0.12 s blip at 0.32 s for "lock-honk").
Alternative: audiogen sfx "car key-fob unlock chirp, two short electronic beeps, close, dry, no engine" (~$0.12 per take; play with `rate` jitter for the wobble). The synth is cheaper and wobble-able; the sample sounds more real. Either way, rename `carAlarm` → `carChirp` in clues.js:842 and the audio.js doc comment, and change every line that says "car alarm" (dialogue.js:23 and :23 after, dialogue-sf.js:10/33, lead-hints.js:22: parent's/fork's scope) to "car-unlock chirp" / "*bwip-bwip!* (a car unlocking)". Also swap the generic `'whistle'` for `G.audio.play('ranger-whistle', { rate: 1 + wobble })` so the "ranger whistle" she claims is the real whistle sample (free; the file is already shipped and unused).

### Voice reference used
Generation text per file from /workspaces/gg-test1/.audiogen-history.jsonl (scratchpad voices.txt). `vinnie-flying-rat`, `crowd-chant-take-3`, `duchess-join`, `vesper-greeting`, `strix-greeting`: no history entry (corrupt lines in the log) → unknown, needs a listen.

### main.js (38 strings)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 757-1007, 1861, 1890 | loading screen | "Laying out the park", "Planting the trees", "Painting the skyline", "Inviting the crews"… (11) | build steps | main.js boot order | OK | |
| 1167 | toast | "Oof. Too heavy to go higher." | heavy item height cap | items.js:3 (heavy ≤ 2 m) | OK | |
| 1189-1191, 1637, 1684, 1691 | toasts | save / can't save / welcome back | saves | | OK | |
| 1200 | toast | "Summit Perch n/12: the map opens up" | 12 summit perches | layout.js summit list | OK | |
| 1244-1251 | toasts | swarm needs flock of 6; nobody to mob | | collect/flock | OK | |
| 1280-1296 | nap screen | "Napping until…", "What a nap changes, exactly" | nap-gus.jpg | assets/ui/nap-gus.jpg | OK | |
| 1333, 1352, 1355 | toasts | "Ruffled! Back to your nest.", Feather Up 15 | nest, price | hud.js:300 (15) | OK | |
| 1366, 1392 | grate | "The rats haven't joined", "Express punches your ticket…" | Express (rat) | crews.js rats regulars | OK | |
| 1417, 1738-1780, 1910-1916 | portrait card, control prompts, graphics toast | | glyphs | glyphs.js | OK | |

### systems/clues.js (27 + 6 short)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 98, 102 | prompts/toast | "Peck the plume", "Peck the door", "It's stuck fast…" | plume, door | clue tells (clues.js #tell), DOORS meshes | OK | |
| 224-225 | Boathouse lot gate | "Locked. The key hangs on the booth's hook." | a booth, a hook | layout.js:798 key teeters at ground+2.1 m by x 45.4 (the Boathouse's east wall, landmarks.js:426-449); no booth or hook is built anywhere (grep "booth" hits only comments) | MISMATCH-prop (minor) | Words: "Locked. The key hangs on a hook by the Boathouse door." plus a code-built hook (a 2 cm bent cylinder on the wall under the key, ~5 lines in clues.js teeter case). Same fix for sab-middle.js:2/8 ("A key on a hook") which then matches |
| 243, 397/409, 542, 611-612, 622, 699, 753, 844, 858, 871-874 | toasts | door open, "Flock, lift it!", "You've got X", cart out of action, counts, hauled, new gear, rangers distracted, flock needed, "Wait for Night", "The flock yanks the rope!" | rope | clues.js:208 rope mesh on the 103rd St shed door | OK | |
| 667-668 | horses/dogs refusing water | "I'm a HORSE, Gus. I don't swim." / DOG / "harnessed to a carriage… 15 metres" | | | OK | |
| 738-740 | Vesper trades | "He'd swap, kid. For a …", "Ten crumbs, kid. Vesper's fee." | fee 10 | layout.js TRADES crumbs:10 | OK | |
| 772 | Mimi | "I don't know that one yet, sweetie." | | B.needs | OK | |
| 816 | van bubble | "Grumble grumble…" | Prickett's van | van.drive | OK | |
| 842 | Mimi generic lure (sound only) | `carAlarm` synth | "car alarm" in her lines | audio.js:494 (see Sound reference) | MISMATCH-sound | Replace `carAlarm` with a synth `carChirp` (code, $0) and reword the lines to "car-unlock chirp"; swap `whistle` for the shipped `ranger-whistle.mp3` |
| 702 | bubble | "Hup." (horse) | | | OK | |

### systems/collect.js (19 + 2 short)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 21 | stray pigeon join lines (6) | "Is that pigeon carrying a SLICE?" etc | | | OK | |
| 101, 126, 207, 225 | prompts/toasts | stray (n/40), golden pretzel n/20, +5 crumbs view | 40 strays, 20 pretzels | layout.js STRAY_SPOTS (40), PRETZELS (20) | OK | |
| 237 | prompt | "Ride a carousel horse" | carousel | landmarks.js:202 carousel GLB | OK | |
| 241, 322-324 | chess | "Peck a chess piece", "Hey! That was MY rook!" | chess players, board | people.js:31 chess role; landmarks chess | OK | |
| 267, 275 | toast | "Park Postcard n/16" | 16 postcards | layout.js POSTCARDS (16) | OK | |
| 311 | birder | "Oh! A…" / "…just a pigeon." | birders | people.js:63 birder + binoculars | OK | |
| 396 | Delacorte | "…and ENTER, a bird!" | rehearsal | | OK | |

### world/layout.js (174 strings: place names, door names, blocker/trade lines, postcards)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 34-560 | place, landmark and camera names (~70) | "Sled Dog Statue", "Girl-on-a-mushroom statue", "Chess & Checkers House", "The Meer boathouse", "Great Lawn ball fields"… | landmarks | landmarks.js B[...] builders and GLBs (statue-sled-dog, statue-mushroom, carousel, bow-bridge, bethesda-fountain, belvedere-castle) | OK | |
| 594-724 | sign, spike, cart, nest, grate, joint names (~60) | "Pond east path", "Reservoir south gatehouse roof", "Columbus Circle grate"… | positions | coordinates beside each name; signs.js:596 etc | OK | |
| 657 | spike P4 note | Rigby: "Twelve floors, boss. We need the back stairs. Walter lets raccoons up… for a price." | Walter's building | DOORS walter-door, gp11 roof | OK | |
| 768, 772 | Bubbles dives | "Watch THIS, Gus! Triple tuck!", "One soggy tennis ball" | dive, tennis ball | duck-dive-bloop; items.js:33 ball (fix-40) | OK | |
| 783, 785, 788, 806, 808, 812 | clue lines | spout "SHOWER", Pecan "Nineteen seventy-four!", "Two old drainpipes", Clementine "BONK… steel", Mama Mask "One slice first", Tux "Mind the carpet" | spout, drainpipes, steel shed door | vehicles.js:141 spout spray; items.js pipe; DOORS rink-shed | OK | |
| 787 (turtle-cart clue) / items.js:40 | the Elders' rock: "Something… is on our rock" → item `cart` "Shopping cart" | shopping cart | items.js:178 builds it as one plain steel box 0.6×0.5×0.9 | MISMATCH-prop | Code-built cart (no generation): 5 thin steel-grid panels (open top) with a wire texture or `wireframe` material, a handle bar, 4 small wheel cylinders, ~15 lines in items.js `case 'cart'`. Keeps the joke; the player hauls it, so it is seen up close |
| 827-833 | door names | "Zamboni garage door", "Prickett's shed door", "Walter's service door"… | | DOORS meshes | OK | |
| 841-860 | blocker lines (13) | selfie "turns his back", waiter "flaps a napkin", jogger "Huh? Who's calling?", rckid "ICE CREAM!", Prickett "Del speaking!", cyclist "Is that my phone?", wedding "wall of tulle" | phone ring, jingle, napkin, tulle | sounds: phoneRing/jingle synth (OK); waiter acc ['apron'] (no napkin: a refusal line only, fine); wedding.js:77 tulle | OK | |
| 867-872 | trade lines | "He won't look up from his selfies", "The artist dashes off a portrait", "Take a cone, kid. It's behind the shed gate." | cone, shed gate | part-beak shed-gate DOORS + cone at 123.6,362.5 | OK | |
| 895-925 | stray/pretzel notes | "under Gapstow Bridge"… | | not shown to the player (notes) | OK (not player-facing) | |
| 933 | postcard Carousel | "Round and round. The organ plays your song." | band organ music | collect.js:329-358 ride plays only `whoosh`; no organ/carousel track in audio.js MUSIC | MISMATCH-sound | Either words ("Round and round. Wheee. And again.") or, better, generate a 15 s band-organ waltz loop with audiogen music (prompt: "carousel band organ, cheerful waltz, calliope pipes and bass drum, 15 s loop") ~$0.07 (busker-riff 15 s cost $0.07), add `carousel: ['carousel-organ']` to MUSIC and return it from collect.js music() while `this.ride?.kind === 'carousel'` |
| 934 | postcard Strawberry Fields | "He plays a riff for you. Crumbs land in the case." | guitar case | people.js:47 busker acc ['guitar'] only; no case drawn | MISMATCH-prop (minor) | Words: "Crumbs land at his feet." ($0) or a code-built open case (dark box + red lining plane) at his feet, ~6 lines |
| 935 | postcard Bow Bridge | '"Two doves! Stunning!"' | two doves | collect.js:379 needs only Gus perched after wedding.cleared; Dove need not be there | MISMATCH-fact (minor) | Words: '"A dove! Stunning!" (It's Gus. Nobody checks.)' — echoes Dove's running joke and works alone |
| 936-939, 941-944, 946-948 | postcards | selfie skyline, rook, sunbathing (towel), Delacorte, belly-slide, waterfall, sled dog pats, mushroom kids, birders, coyote, Pigeon Lady's hat | towel, skaters, waterfall, statues, coyote, felt hat | collect.js:244 towel; people.js:32 skaters; WATERFALLS; statue GLBs; collect.js:250 coyote (tinted dog); human-dolores felt hat (design/ASSETS.md:244) | OK | |
| 945 | postcard Zoo Wall | "Feeding time! A flung sprat. Caught it!" | sea lions, a keeper flinging | landmarks.js:183-184 sea lion pool is an empty stone disc + dark water; collect.js:411 plays sea-lion-bark and the sprat flies from (88.3,115.6) with nobody there | MISMATCH-prop | Code-built: 2-3 sea lions (dark grey capsules with a cone head, a little bob), and a keeper (existing human-park model, `acc: ['bucket']` or a code bucket) standing at the throw point in the Afternoon. ~20 lines. Words-only alternative: "A sprat flies over the wall from somewhere. Caught it!" (weaker) |

### systems/fights.js (37 + 7 short)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 136, 532 | Biscuit fight | "Get the ball to his blanket!", "Benches hide you" | blanket | fights.js:93-99 red check blanket | OK | |
| 142-143, 537 | Strix stealth | "Flapping is the loudest sound", "moss island", "Moss is silent" | moss islands | fights.js:105-117 moss meshes | OK | |
| 153, 154, 540 | Vinnie | "Hey! That's MY cart!", "Broom!" | cart, broom | vehicles.js hotdog-cart; fights.js:66 broom accessory; broom-swish sfx | OK | |
| 192 | Vinnie bubble | "Ya flying RAT!" | voice `vinnie-flying-rat.mp3` | file shipped and listed in audio.js:124 but never played (bubble only); its generation text is not in the history | MISMATCH-voice (unused file) | Play it with the bubble: `G.audio.voice('vinnie-flying-rat', { at: f.vin })` at fights.js:192 (free). Needs a listen first to confirm it says "Ya flying rat!" (unknown text) |
| 185, 188, 193, 196 | win lines | Biscuit "MY BALL!", Strix "My spectacles!", Rigby "Mind the mustard.", Rhoda "They spiked my ledge." | spectacles, mustard (hot dog cart) | items.js spectacles; hotdog-cart | OK | |
| 209-221 | assist/leave toasts | "Biscuit's tiring", "Watch Pip", "Vinnie spotted Rigby!" | Pip | fights.js f.pip | OK | |
| 288, 367, 386, 409, 412, 276, 293, 311, 497 | bubbles | "Where'd he GO?", "Decoy!", "Hoo. I HEARD that.", "BONK.", "Now! Coo!" | owl hoot | owl-hoot sfx; drop-thud | OK | |
| 439 | Vinnie's broom blocked | "Ow! Stupid TREE!" | a tree | fights.js:434 `raySolid`: any solid (lamppost, bench, his own cart, a statue on the Mall) | MISMATCH-fact (minor) | Words: "Ow! Who PUT that there?!" ($0) |
| 519-552 | HUD meters | Noise, Rigging, Rhoda pips | | | OK | |

### systems/items.js (19 + names)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 18-40 | item names (23) | Pizza slice, Pizza box, Lost key, Wrench, Lucky sticker, Peas, Spectacles, RC remote, Falafel ball, Sprat, Biscuit's tennis ball, Sail, Sack of tennis balls, Drainpipe, Traffic cone, Battery, Old film camera, Shopping cart | each code/model builder | items.js:168-181 builders; GLBs pizza-slice/pizza-box/traffic-cone/battery/tourist-camera | OK except Peas (no tub: parent's #43 item) and Shopping cart (see layout.js row) | |
| 206, 215, 253, 257, 266, 293, 295, 309, 425, 447, 458-463, 469, 482 | toasts/prompts | "Peck the box open", "Too big. That needs a hauler.", "Warm again! Hot off the griddle.", rats took your slice, floated back | griddle | layout.js:727 griddle | OK | |

### systems/market.js (15) — OK
WHO/WHAT (16-17): selfie tourist at the Plaza fountain (people.js:35 at 93,-36 by the fountain at 97,-40), sidewalk artist on the Mall (13,228), Reservoir jogger, kid at Conservatory Water (62,296), Delacorte stagehand, foreman at Fifth & 76th (129,359): all where they say. Prices/Ledger/Wanted board lines OK.

### systems/open-sky.js (7) — OK (Great Lawn, open sky ×2, slice cold).

### systems/race.js (17)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 83 | toast | "Sprint will show you the line. Follow the orange pigeon!" | orange guide | race.js:55 guide is a glowing orange pigeon (Sprint's own look is grey with an orange sweatband, looks.js:75) | OK (the line describes what's shown) | |
| 85 | Lapcount | "Coach goes on the horn. Three…" | horn | race.js:127 race-start-horn sfx | OK | |
| 60, 80, 102-107, 129, 158, 181-204 | race HUD/lines | ten rings, Coach's time | 10 rings | RACE rings | OK | |

### systems/scarves.js (17) + ui/screens.js scarf names (10)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 19 (COMMENTS), screens.js 423-433 | Ledger / wardrobe | taxi checker, subway blue, maple stripes, Ramble cable knit, cream mohair, rainbow stripe, racing red, wedding white | colours | assets/textures/scarf-*.jpg (nanogen, prompts per name) | OK | |
| screens.js:433, scarves.js:19 | wardrobe / Ledger | '"FEED THE BIRDS" bread-print' / "FEED THE BIRDS! On a scarf!" | the words on the scarf | scarf-bread-print.jpg: loaves and baguettes knitted on cream, no words | MISMATCH-look (minor) | Words: name "Bread-print (the FEED THE BIRDS scarf)", comment "Bread! On a scarf! Very on-message." ($0). Lettering on a tiling knit texture would read badly |
| 32-112 | Ledger stash UI | falafel prices, "Hand-knit?" | falafel from the halal cart | halal cart people.js:36/75 | OK | |

### systems/schemes.js (22) — OK
Toasts/board text; 481-482 griddle "Grand Army Plaza in the Afternoon, 110th & Fifth at Dusk" matches layout.js:727 and people.js:36/75; 454-458 "Ask the Elders… Something is on their rock" OK.

### systems/signs.js (10) — OK
113 "It's enamel. You'd need a paint pen." (pen gear), 114 waiter/terrace, 151 "FEED THE BIRDS" stamp, 178/263 rangers flipped, 215 spikes nearby. guide.js:119's "red DON'T strip" matches signs.js:50-53 (#c4302b strip).

### systems/slices.js (6), spike-rounds.js (3), spikes.js (2: "Perch back!", "Spikes! Boing." + boing synth), takers.js (18), workshop.js (2), food.js (1) — all OK
Bin lid (slices.js:64-72 bin with lid mesh), Express relay steam, takers' dog/vendor/doorman lines.

### entities/vehicles.js (19)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 35-38, 132, 195, 226, 239, 262-264, 352, 370, 529, 544, 576-579, 733, 807-812 | towed back, rigged, ramps, tow hints | | Zamboni, pedicab, RC tug, spout, sunk boat | vehicles.js:136-142 sunk sailboat + spout spray | OK | |
| 445 | toast | "Hopper full! Tap F to Dump." | the F key | Dump is Coo: F only on keyboard (glyphs.js:7); touch = Coo button, pad = top face button | MISMATCH-fact (UI) | Use the glyph: `Hopper full! ${glyph('coo', dev, fam)} to Dump.` as vehicles.js:807 already does |
| 519 (sound) / screens.js 299/306 "Horn" | driving controls card says Coo = "Horn" | horn | pedicab plays `coo` (a pigeon coo); RC tug plays synth `whistle`; others cab-horn | MISMATCH-sound (minor) | Pedicab: `G.audio.synth('bikeBell')` (exists in audio.js:500, unused; free). RC tug whistle is fine as a toy horn |

### entities/characters.js (3), crowds.js (1), allies.js
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| allies.js:57-58 | every ally Call (17 bosses) | voice `<boss>-call.mp3` plays with the bubble "<Name> is here." | voiced words | call texts: Duchess "The Swells have arrived, darling." Hazel "Hazel's here! What are we digging?" Puddles "Commodore Puddles, reporting for duty!" Vesper "You rang? The Exchange is open." Eldest "We... are... here." Biscuit "I'm here! I'm here! What do I fetch?" Strix "Professor Strix. Present, if not thrilled." Rigby "Night Crew's here. Where's the job?" Vibrato "The Choir has ARRIVED!" Wingate "Coach Wingate! Let's GO, people!" Sue "Next stop: you. Sue's here." Rhoda "Rhoda, on the wing. Who needs lifting?" Big Sal "Meer Mob's here. Who we leanin' on?" Queenie "Queenie's here, baby. Make it quick." Clementine "Easy now. Clementine's here." Mimi "Mimi's on! What sound you need?" Gertrude "GERTRUDE IS HERE! MOVE IT!" | MISMATCH-voice (17 lines, one code spot) | Show the voiced words as the bubble: add `call: '…'` to each boss in crews.js CHARACTERS (texts above, tags stripped) and use it in allies.js:58 (fallback "<Name> is here."). Free; no regeneration |
| characters.js 89, crowds.js 494 | prompts/toast | "Talk to X", "<crew>: marked on your map" | | | OK | |

### finale/* (33)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| finale.js:427 | doors | bubble 'Rigby: "Get in here, boss. She's ready."' with voice `rigby-greeting` | voiced words | rigby-greeting = "[gruff] Yeah? Whatcha need fixed?" | MISMATCH-voice | Generate "[gruff] Get in here, boss. She's ready." with Rigby's voice LysucvtFmzi1NVAE0rKp (eleven_v4) → `voice/rigby-ready.mp3`, ~$0.01; add `rigby-ready` to the voice regex in audio.js:124. ($0 alternative: bubble "Yeah? Whatcha need fixed? …Kidding. Get in, boss." — the voice then covers only half) |
| climb.js:520 | gust beat | 'Rhoda: "Hold STILL, you big lug!"' with voice `rhoda-call` | voiced words | rhoda-call = "Rhoda, on the wing. Who needs lifting?" | MISMATCH-voice | Generate "[amused] Hold STILL, you big lug!" with Rhoda's voice EXAVITQu4vr4xnSDxMaL → `voice/rhoda-hold-still.mp3`, ~$0.01; add to the regex. ($0 alternative: bubble 'Rhoda: "On the wing! Who needs lifting?"' loses the joke) |
| climb.js:73, 408, 445, 458-469, 493-502, 538, 561 | captions/prompts | "The Empire State Building. Up we go.", window cleaners "Excuse me!", "A gust! Rhoda and Rex dive in.", "A news chopper. Spotlight!", "The 80th floor: the Grate Rats!", '"Coo!"', 'Subway Sue: "THAT'S OUR PIGEON!"' (squeak, no voice) | cradles, hawks, chopper + spotlight, rat row/banner | climb.js CRADLES, hawks, #chopper (341-351), ratMesh/banner; chopper-loop sfx | OK | |
| biggify.js:63, 68 | Rigby bubble, "BIGGIFY!" | lever | raccoon-chitter (no voice claimed) | OK | |
| stomp.js:107, 162, 174-176, 208, 210 | captions | "Fifth Avenue. Every crew…", "HONK!", "Step over the cab!", "Grand Army Plaza. The carriage horses salute.", "Twenty-five blocks south…" | cab horn, horses | cab-horn sfx; stomp.js:27/77 horses at the Plaza + horse-whinny; 59th→34th = 25 blocks | OK | |
| shout.js:93-155, finale.js:223 | "Press ✕ to SHOUT", "FEED THE BIRDS!" | voice mecha-feed-the-birds = "[shouting, delighted] FEED THE BIRDS!" | OK | |
| finale.js:90, 461 | "The park is yours. Free roam…" | | | OK | |

### setpieces/wedding.js (22)
| line(s) | who/where | text (short) | names | checked against | verdict | proposed fix |
|---|---|---|---|---|---|---|
| 142 | Bubbles | "There's a sunken rowboat down there, Gus! Something in it GLOWS!" | a sunken rowboat | wedding.js:66 only a glow disc at BATTERY (-28,312); no boat mesh | MISMATCH-prop (minor) | Code-built: reuse the Boathouse rowboat capsule (landmarks.js:441) tilted ~25°, under the water at BATTERY, dark wood; ~4 lines |
| 146-149, 161-162, 197, 294, 300, 315, 350-364 | planner/photographer/bride/Dove; basket; "GOT IT!"; Rhoda "Mine. …For the Workshop." | wicker basket, bride, veil, tulle | wedding.js:55-65 basket; people.js:57 bride veil+bouquet | OK | |
| 169 | Dove | "I was BORN for this." voice dove-born-for-this | "[delighted] I was BORN for this." | OK | |
| 186 | Dove | "Forty-one weddings, darling. Still nobody checked." with voice `dove-places-darling` | voiced words | dove-places-darling = "[theatrical] Places, darling." | MISMATCH-voice | $0: subtitle "Places, darling. Forty-one weddings, and still nobody checked." (the voice says the first two words). Or regenerate the whole line with voice jkUnCsbErmJrcbWk1Hmh (~$0.01) |
| 252 | guest cries | "The CAKE!" | a cake | no cake at the wedding | OK (a panicked cry; leave) | |
| 319, 322, 356 | photographer | fall yelp (no subtitle); "…THAT'S the shot." | voice text "[awed whisper] ...THAT'S the shot." | OK | |

### setpieces/rinkjob.js (10) — OK
294 Rigby "Prickett's whole stock. On OUR ice.", 308/313 "Mind the paintwork.", 326-327 toasts, 478 nap line "Somebody is standing in front of the rink shed's door" (Prickett is placed there, 475-476), 491 "This park is IMPOSSIBLE!" with voice prickett-impossible = "[exasperated] This park is IMPOSSIBLE!" (match), 493 his quitting lines.

### ui/* (≈260 strings)
| file | count | verdict | note |
|---|---|---|---|
| board.js | 16 | OK | thread names, "A part for the Mecha-Pigeon.", "A truce, sealed on the rock." |
| guide.js | 16 | OK | "The sign with the red DON'T strip, beside the Pond's east path" matches signs.js:50 and S1 at 92,18 |
| hud.js | 8 | OK | crumbs 15 / Feather Up, Bread Power 30 |
| map.js | 5 | OK | |
| offline.js | 3 | OK | |
| photo.js | 35 | OK | "Flicker: Stunning. Frame it!", Say Cheese, "Greetings from Central Park" |
| report.js | 22 | OK | (bug report; 17 crews / 8 parts) |
| roster.js | 3 | OK | 17 crews, 8 parts |
| screens.js | 82 | 1 mismatch (bread-print, above); "Horn" on the driving card (pedicab, above) | controls cards match glyphs.js bindings; nap text |
| wheel.js | 8 | OK | |
| dialogue.js | 2 | OK | |
| glyphs.js, icons.js, menu.js, bubbles.js | 0 player text | — | SVG/markup |

### index.html (10) — OK
Title/meta: "seventeen crews" (crews.js 17), og:image alt "Gus the pigeon perched on a lamppost above autumn Central Park, with the Empire State Building behind him" matches game/social-card.jpg.

### Files with no player-facing text
gfx/*, anim/*, world/{city,farlayer,landmarks,props,terrain,trees,water}.js, presets.js, saves.js: shader/debug/tag strings only.

### Unused voice files (no line plays them)
- `vinnie-flying-rat.mp3`: has a line (fights.js:192 bubble) but is never played → wire it up (row above).
- `crowd-chant-take-1..4.mp3`: the finale uses `sfx/crowd-chant-feed-the-birds.mp3` instead (shout.js:111); the takes were the layered fallback. No line; fine to leave or delete. take-3's text is not in the history (takes 1/2/4 = "Feed the birds! ×3").
