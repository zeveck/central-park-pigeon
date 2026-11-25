# Art and sound review: batch G, Super Jumbo Bagels (#44) and bagels as bribes (#45)

Reviewer: Art and sound director, 2026-11-25. Design: `design/changes/batch-g-bagels.md`.
Compared against: GAME_DESIGN.md "Art direction" and "Audio direction", ASSETS.md, `game/src/world/city.js` `signMaterial()`/`storefront()`, `tex-facade-storefront.jpg`, the 10 scarf tiles and 9 Gus scarf portraits, the cards (`design/mockups/cards/`), the `human-chess-player` concept, the voice map in `.gamegen/candidates/audio/jobs.py`, `game/src/audio.js`, `game/src/ui/icons.js`, and the local style photo (look only).

Overall: the budget is right (about $3.4 of $20, voice costs in line with the game's own record of $0.25 for 62 clips), the code-built shop fits how the city is made, the photo's look is captured without its name, menus or boards, and the voice casting for Manny and Mama Mask is sound. The problems are in how the text and the bagel get made, and in the crowd voices.

---

### Sign and board lettering is baked into generated images, and the fascia size can't be generated
Severity: must-fix
Who meets it: most (everyone who visits the shop; it's the quest's landmark). How bad: looks broken (and blocks the asset step). Fix: small
What's wrong: The asset list has "Fascia texture: SUPER JUMBO BAGELS, white raised letters on matte black, 2048×256 | imagegen2 high", "Blade sign face: stacked SUPER / JUMBO / BAGELS … 512×1536", and "A-frame chalkboard: 'SPECIALS', bagel doodles, 'PIGEONS WELCOME (FOR ONCE)' | imagegen2 medium". That's text inside generated images. Three problems:
1. asset-guide.md "No text or logos in images. Generators misspell words … Draw it in code", and the game's own rule: "signs ('$1 SLICE', 'DELI GROCERY', 'PIZZA') are code text on code awnings" (GAME_DESIGN.md, Art direction, Facade scale). Every existing sign is `signMaterial()` canvas text (city.js:468).
2. The A-frame's joke, "PIGEONS WELCOME (FOR ONCE)", is a long mixed-case phrase: the exact thing generators garble, and the only bit of it the player is meant to read.
3. 2048×256 is 8:1 and 524,288 px. imagegen2 refuses it: "Long-edge to short-edge ratio must be <= 3:1" and total pixels must be 655,360 or more.
Why it matters: A misspelled or wobbly SUPER JUMBO BAGELS on the quest's landmark looks broken. Even a clean one wouldn't match the other street signs. And the fascia job fails as written.
Suggestion: Draw all three in code with an extended `signMaterial()`:
- the fascia (2048×256 canvas) and the blade sign (512×1536 canvas, three stacked words): **Fredoka 700** (already loaded, main.js:704) in off-white #F4EFE6 on near-black #1E1C1B. Give the "raised" look with a 2-pass draw: a dark offset shadow (4–6 px down-right), then the letter, then a 1–2 px lighter top-left edge. Flip the UVs as `signMaterial` does (repeat.x = -1). Keep emissive at 0.35, as on the other signs, so it reads at Dusk.
- the A-frame: a canvas in slate #2E3532 with chalk-white Nunito (a hand-drawn wobble from a tiny random jitter per letter, seeded, not from the game rng), "SPECIALS", "PIGEONS WELCOME (FOR ONCE)" and two code-drawn bagel rings in chalk.
- optional, only if the black looks flat in shots: one **textless** nanogen tile (environment line, "worn black enamel sign panel") under the canvas text. That's about $0.06, and it replaces the $0.38 of the three lettered images.
Evidence: `grep -n "ratio must be" ~/.claude/plugins/cache/gamegen/imagegen2/2026.11.6/imagegen2/generate.cjs` (line 341; size rule on line 93); asset-guide.md "Asset rules of thumb"; city.js:468–483.

### Crowd animals speaking in their boss's voice, sped up, will sound like the boss (or a chipmunk)
Severity: should-fix
Who meets it: some (every player who bribes; up to 16 crews × 3 lines). How bad: misleads / a little off. Fix: small
What's wrong: "The voice is each crew's existing boss voice, played 10–25% faster in code so it sounds like a smaller crew member." `audio.play` sets `src.playbackRate` (audio.js:347), which raises pitch and tempo together. ×1.2 is +3.2 semitones and ×1.25 (Mimi) is +3.9: past "a bit younger" and into novelty chipmunk, especially on voices already cast high or quirky (Laura for Hazel, Kathie for Mimi). At ×1.1–1.15 the voice is still clearly the boss's, so a nameless squirrel saying "I TOLD you! Hazel! Sheep Meadow!" sounds like Hazel talking about herself in the third person. The same goes for the Turtle Elder's deliberately slow delivery, and the Duchess's voice coming out of a random Swell. The game cast all 17 bosses with distinct voices so you can tell who's who (Audio direction, "Boss barks"); this undoes that for the crowd. #45 also asks for "an excited line in **its own** voice".
Why it matters: Players will think the boss is nearby or speaking ("is Hazel here?"). That muddles the very thing the bribe is for: pointing them to where the boss is.
Suggestion: Cast **one "crew member" voice per crew** from the ElevenLabs catalogue (`audiogen voices`: a free browse, so TTS costs the same ≈ $0.45). Pick each as a younger or smaller sibling of the boss's register, and never the same voice ID as any boss, Manny, Mama Mask or the existing humans in the `V` map. A starting brief:
- squirrels: breathless and young;
- ducks: a nasal young sailor;
- crows: a low, sly teen;
- raccoons: a scrappy NY kid;
- rats: a fast-talking subway kid;
- turtles: an old, slow voice, not Bill's;
- Choir: an over-trained tenor;
- Racers: a peppy cadet;
- Meer Mob: a heavy goon;
- dogs: a goofy puppy;
- cats: a bored drawl;
- horses: a gentle country voice;
- songbirds: a chirpy little girl;
- geese: a shouty one;
- Swells: a posh young voice.

Add them to `V` as `crew-<crew>`. Apply one mild species rate in code (1.0–1.08) only where it helps. Keep owls and hawks on Strix and Rhoda only if those lines come from the boss (they're refusals by a lone bird, so a crew voice is better there too). Name the files `bribe-<crew>-*`, as planned.
Evidence: audio.js:347 (`playbackRate`), GAME_DESIGN.md Audio direction "Each has a distinct voice"; issue #45 "in its own voice"; jobs.py:164–188 (V map). Pitch maths: 12·log2(1.2) = 3.16 st.

### Manny has twins walking past his own counter
Severity: should-fix
Who meets it: most (who visit the shop; 110th is city crowd). How bad: looks a little off to misleading. Fix: small
What's wrong: The design picks `human-chess-player` because it's "the only reused man who isn't already on 110th". But `people.js` puts `human-chess-player` in the `walkers`, `tourists`, `city` and `sitters` pools (lines 16, 17, 19, 20). The city-ring pavement crowd walks right past the walk-up window, so identical grey-bearded men in the same mustard cardigan and tweed cap will stroll by Manny. The only difference is an apron.
Why it matters: A named character who's a visible copy of passers-by reads as a crowd extra, not "the bagel guy". It undercuts the shop's main character and his portrait card.
Suggestion: Give Manny code accessories that change his silhouette and colour at a glance:
- a white paper deli hat over or instead of the flat cap (Vinnie's paper hat is a code prop already; reuse it);
- the long white apron, `apron:#efe9dc`, chest to knee;
- a code white shirt-front panel or sleeve garters if cheap.

Make his card (the imagegen2 edit of the chess-player concept) show exactly those: the paper hat, a white apron over the mustard cardigan, and a dusting of flour. Say so in the card prompt, with `vinnie.png` as the second (card-style) reference, so card and model agree. Also confirm in the shop shots that no chess-player clone stands within frame of Manny. If one does, the crowd pass's spawn exclusion (if it has one) should keep the clone pool off the 10 m PLACES radius.
Evidence: `grep -n chess game/src/data/people.js` → lines 16, 17, 19, 20; the concept `.gamegen/candidates/concepts/human-chess-player.png`.

### The bagel isn't "made once": the menu picture, the crust atlas, the 3D prop and the HUD icon are four separate designs, and two pictures are missing
Severity: should-fix
Who meets it: most bagel buyers (the menu, then the bagel in Gus's beak right in front of the camera). How bad: looks a little off. Fix: small
What's wrong:
- "Menu pictures: 4 bagels and 4 schmear tubs (imagegen2)" and "Bagel crust atlas (nanogen)" are made independently, and the prop is code tori with "schmear in code colours". So a sesame bagel can look different on the menu and in the beak. asset-guide "Check that things fit": an object in several images is designed once and the rest made from it.
- The schmear row has **five** buttons (None, Plain, Scallion, Strawberry, Jalapeño) but only 4 tub pictures, and Row 0 "Plain bagel to go" needs one too.
- The carried-item HUD icon isn't mentioned. `icons.js` maps item ids to SVGs (line 70–71) and falls back to the generic `item` icon, so every bagel would show a grey placeholder.
Why it matters: The bagel is the quest's object and the bribe. It's seen on the menu, in the beak, on the ground and in the HUD, and it should be one bagel. A missing "None" picture leaves an empty or broken tile on the menu.
Suggestion: Order it as follows.
1. Make the menu sheet first: imagegen2 medium, `--background transparent`, the style line and the gus-stand anchor as reference. Show the 4 bagels from above at 3/4 and the 4 tubs, each colour named in the prompt (pale gold sesame, black poppy, white onion and garlic flecks for Everything; schmears: off-white, pale green with dark-green flecks, pink with red bits, pale green with red and green jalapeño chips). Cut them to 128² WebP.
2. Make the crust atlas as a nanogen edit with that sheet as the reference: "seamless in both directions" per tile, checked on the torus at beak distance.
3. Sample the code schmear disc colours from the tub pictures.
4. Draw the "None" picture in code: a plain dashed ring or the plain bagel greyed. Reuse the Plain bagel picture for Row 0.
5. Add a `bagel` SVG to icons.js (a golden ring with a hole and 3–4 seed dots; the schmear colour as an inner arc for schmeared ones) and map `bagel*` to it.
Evidence: asset-guide.md "Check that things fit"; game/src/ui/icons.js:70–71; the design's menu table (5 schmear options).

### The Everything Bagel scarf will read as one more cream or mustard scarf, and its flecks will vanish
Severity: should-fix
Who meets it: some (who finish the quest and wear it). How bad: a little off. Fix: small
What's wrong: "golden knit flecked with pale sesame, black poppy and onion bits" sits in the same warm band as `scarf-bread-print` (cream with golden loaves), `scarf-slice-orange` and `scarf-cream-mohair`. Seed-sized flecks on a 512 tile wrapped round a 0.32 m bird are sub-pixel at camera distance (1.2 m behind), so it reads as plain mustard. The other ten scarves earn their identity with bold motifs or stripes (bread-print's knitted loaves, taxi checker, rainbow stripe).
Why it matters: It's the reward. If it looks like a recolour of one Gus already owns, the payoff is flat, and the owner has asked for colour variety.
Suggestion: Make it a knitted motif scarf in the bread-print manner: a **deep charcoal or poppy-black base** (no scarf has one yet) with intarsia **golden bagel rings** in rows, and white sesame and black poppy dots knitted large (2–3 stitches) round each ring. That's nanogen, a seamless tile, with `scarf-bread-print.jpg` as the reference for stitch scale. Make the Gus portrait edit with the accepted tile as the second reference so the two match. Check it on Gus at flight distance next to the bread-print scarf before accepting.
Evidence: game/assets/textures/scarf-*.jpg (10 tiles); scarf-bread-print.jpg; the camera distances in GAME_DESIGN.md Art direction.

### The shopfront back wall is planned as a rendered picture, not a game texture
Severity: should-fix
Who meets it: most visitors (the lit window is the shop's face, and Gus stands at the counter). How bad: a little off. Fix: small
What's wrong: "Shopfront: walk-up window frame, glass door, warm-lit interior; no text or logos | imagegen2 medium". Every facade and texture in the game uses nanogen with the **environment line** ("hand-painted stylized texture, flat even light, no cast shadows, no perspective … no text") and the key art as reference. The neighbours on the same street use `tex-facade-storefront.jpg`, which is flat, painterly brick and green wood. An imagegen2 "warm-lit interior" will come back with perspective, depth and lighting, and look like a photo pasted behind glass next to the painted slice joints. The window frame and glass door are also already code geometry in the design ("side walls and a lower front panel", "a glass door beside it"), so painting them again doubles them up.
Why it matters: The one new shopfront on a street of painted ones would stand out as a different style.
Suggestion: Make it nanogen (flash 2K), environment line, with `tex-facade-storefront.jpg` and key-art as references. Ask for "a flat, frontal back wall of a bagel shop interior seen straight on: wire bagel bins, a deck oven, a tiled wall in cream and black; flat even warm light, no perspective, no text". Drop the frame and door from the prompt (code builds them). Keep the warmth with the emissive mask, as the other always-lit shop windows do (Night section), not by painting it in.
Evidence: GAME_DESIGN.md Art direction, the "Environment line"; game/assets/textures/tex-facade-storefront.jpg.

### Mama Mask gets a voice in this quest only; her other lines stay silent
Severity: nice
Who meets it: some. How bad: a little off. Fix: small
What's wrong: She's the first regular to get a voice (≈16 clips), but her existing talk lines (dialogue.js:50) and her den-raccoons nudge (schemes.js:85) stay text. After the quest she speaks aloud on the bank, then goes silent in the same conversation set.
Suggestion: Give her a voiced **greeting bark** in the new voice, like the bosses' `-greeting` (one clip, about $0.01). Hook it to her talk, so her voice is hers everywhere she speaks. Name it `mamamask-greeting` so audio.js's existing voice regex (`-(greeting|call|join)$`, line 124) already routes it.
Evidence: game/src/data/dialogue.js:50; game/src/audio.js:124.

### Several moments have no sound named
Severity: nice
Who meets it: most bagel buyers. How bad: a little off. Fix: small
What's wrong: Only `bell-ding` and `bagel-munch` are new. These are silent or unassigned:
- paying crumbs;
- Manny's 1.5 s turn to the oven;
- "Order up!" (the bagel appearing);
- the steam out of Mama Mask's ears;
- the scarf toast;
- the turtle's 6 s eat (a 2 s munch);
- the cat sitting on it.

The species bark and the voiced line are both "first" in step 2 and will overlap.
Suggestion: Reuse existing sounds and map each in the design:
- `trade-ka-ching` (pay);
- `griddle-sizzle` quiet (oven);
- `paper-rustle` (wax paper, order up);
- the code `whistle` synth pitched up as a kettle (steam);
- `crew-joined-jingle` or `scheme-step-chime` (scarf);
- `bagel-munch` ×3 at rates 0.85, 1.0, 1.1 for the turtle, and one random rate per bribe so 16 crews don't sound the same;
- `cat-meow` low (sit).

Play the species bark at t = 0 and the voice line at about t = 0.45 s. Optionally, a soft code-synth neon hum near the window at Night.
Evidence: game/assets/audio/sfx/ listing; audio.js:475 (synth kinds incl. `whistle`).

### Portrait crop, postcard snapshot and proof shots
Severity: nice
Who meets it: some. How bad: a little off. Fix: small
What's wrong / Suggestion:
- Manny's portrait is a Pillow crop of his card: add his box to `tools/portrait-crops.json` and rerun `tools/portrait-crops.py`. Don't generate a separate portrait.
- The "Jumbo Order" postcard is an in-game snapshot (collect.js:260–278). It will usually happen at Night by the Loch, under trees. Add the resulting polaroid to the proof shots (step 4), and give the scene a warm code key light on Mama Mask (a lantern from "the drain kitchen") if it comes out murky.
- Board and postcard need no new art (thread icon, portraits and snapshot are all code).
Evidence: collect.js:260–278; GAME_DESIGN.md "Portraits = the accepted character cards".

---

## Budget check

As designed, ≈ $3.4. With the changes above:
- the three lettered images ($0.38) become code, plus an optional $0.06 blank panel;
- the shopfront moves to nanogen (about the same cost);
- the crew voices cost the same as the boss-voice plan (TTS is charged per character, not per voice);
- add about $0.01 for Mama Mask's greeting.

It's still about $3.1–3.4, well inside $20, with the $1.50 retake allowance kept.

## Covered and fine

- The shop's photo look (black fascia, blade sign on iron brackets, fire escapes, neon OPEN, A-frame) is taken without the real name, menus or photos.
- The neon is code.
- Building it in code like `storefront()` matches the city.
- Manny's and Mama Mask's new catalogue voices are well cast, and kept distinct from Vinnie and Rigby.
- The Gus scarf portrait follows the 9 earlier edits.
- No Meshy is needed.
- Every bribe species already has a species sound.
