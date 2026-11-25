# Central Park Pigeon: Assets

Pricing notes (2026-11-13): imagegen2 gpt-image-2.6-flare ≈ $30 per 1M image output tokens (third-party quotes of OpenAI's calculator; rounded up). nanogen per its SKILL.md. audiogen ≈ $0.30/min music, ≈ $0.12/sfx. Meshy ≈ $0.02/credit.

## Mock pictures (shared design; reused as concept pictures)

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| gus-stand (STYLE ANCHOR) | design/mockups/gus-stand.png | imagegen2 high | Gus, side 3/4, visible neck | 1 | $0.06 |
| gus-stand-back | design/mockups/gus-stand-back.png | imagegen2 medium, anchor ref | Gus from behind | 1 | $0.05 |
| gus-fly | design/mockups/gus-fly.png | imagegen2 high, anchor ref | wings spread, front 3/4 from above | 1 | $0.06 |
| gus-fly-back | design/mockups/gus-fly-back.png | imagegen2 medium | flying, from behind | 1 | $0.05 |
| pigeon-plain | design/mockups/pigeon-plain.png | imagegen2 high, anchor ref | neutral round-faced pigeon (v1 too Gus-like) | 2 | $0.12 |
| ranger | design/mockups/ranger.png | imagegen2 high | ranger, A-pose | 1 | $0.06 |
| bethesda-fountain | design/mockups/bethesda-fountain.png | imagegen2 high | angel fountain | 1 | $0.06 |
| belvedere-castle | design/mockups/belvedere-castle.png | imagegen2 high | castle on rock | 1 | $0.06 |
| key-art | design/mockups/key-art.png | imagegen2 high 1536×1024 | Gus on lamppost, park, skyline + ESB | 1 | $0.06 |
| rigby | design/mockups/rigby.png | imagegen2 high | raccoon mechanic, A-pose | 1 | $0.06 |
| vesper | design/mockups/vesper.png | imagegen2 high | crow broker | 1 | $0.06 |
| hazel | design/mockups/hazel.png | imagegen2 high | squirrel with acorn | 1 | $0.06 |
| puddles | design/mockups/puddles.png | imagegen2 high | mallard with captain's cap | 1 | $0.06 |
| biscuit | design/mockups/biscuit.png | imagegen2 high | big fluffy dog | 1 | $0.06 |
| mecha-pigeon | design/mockups/mecha-pigeon.png | imagegen2 high | Mecha concept (look reference for the code build) | 1 | $0.06 |

Mock pictures total: ≈ $1.00 (25.3k output tokens, rounded up) of the $5 mock allowance. Remaining ≈ $4 joins the reserve.

**Running total: ≈ $1.00 of $50.**

## Character card pictures (2026-11-14; double as concept pictures and portrait sources)

All imagegen2 high, 1024², in .gamegen/candidates/cards/ (accepted ones copied to design/mockups/cards/ when the page is built).

| Batch | Count | Notes | Est. cost |
|---|---|---|---|
| Bosses + key humans | 15 | Duchess, Vibrato, Wingate, Big Sal, the Eldest, Sue, Strix, Rhoda, Queenie, Clementine, Mimi, Gertrude, Vinnie, Prickett, Walter (Walter came out as a pigeon: redone) | $0.90 |
| Regulars | 50 | all 49 regulars + Walter redo, each an edit of their boss | $3.00 |
| Recolours + new | 15 | 12 pigeons recoloured into real morphs (ash-red, silver-dun, pied, checker, black, red checker, grizzle, brown pied, dark checker, white, mealy, blue bar); owlets redone as babies; **Dove** (new) | $0.90 |

| Dolores (the Pigeon Lady) | 1 | new card, round 3 | $0.06 |

| Gus with scarf | 1 | card update (the person chose the scarf) | $0.06 |

| Squirrel and duck variety | 5 | Nutmeg (cinnamon), Twitch (black), Old Pecan (near-white), Bubbles (bufflehead), Ensign Drake (wood duck) | $0.30 |

Card pictures total: ≈ $5.22. **Running total: ≈ $6.22 of $100.**

## Concept pictures for the models (2026-11-14)

55 accepted pictures for 49 models (64 imagegen2 high calls), in .gamegen/candidates/concepts/ (sheet: _sheet.jpg; full table: .gamegen/concepts-report.md). Edits of the accepted cards/mocks with the anchor as style reference; new ones for vehicles, props, landmarks, trees and the three new humans.

| Batch | Count | Est. cost |
|---|---|---|
| Model concepts and extra views | 55 accepted / 64 calls | $4.48 |

**Running total: ≈ $10.70 of $100** (pictures only; models, textures and audio in progress).

## Audio (2026-11-14)

205 files in game/assets/audio/ (17 music, 10 ambience loops, 116 sfx, 62 voice). Full table: .gamegen/audio-report.md. Build notes: boost bread-rain ~+20 dB, pedicab-pedal and rc-boat-whine need gain; downmix ambiences to mono; crossfade music loops; crowd chant: try the sfx, fall back to layering 4 voice takes.

| Kind | Cost |
|---|---|
| Music (17 pieces) | $6.40 |
| Ambience (10) | $1.20 |
| Sfx (116, 139 generations) | $15.48 |
| Voice (62) | $0.25 |
| **Audio total** | **$23.33** |

**Running total: ≈ $34.03 of $100** (pictures $10.70 + audio $23.33; models and textures in progress).

## Textures, bands, sting, icon (2026-11-14)

Full table: .gamegen/pictures-report.md. Builder notes: tex-iron-rail is RGBA PNG (cut-out); storefront tile = one storey × one shopfront (~3.5 m), repeats horizontally only; pavers and leaves are large-scale: repeat at ~1.5 m; the ESB-style spire sits ~22% along the skyline band: rotate the ring to put it south; maskable icon art at 76%.

| Batch | Est. cost |
|---|---|
| 6 ground + 6 facade/ESB + rail + arch textures, 6 window masks (free) | $2.25 |
| 10 scarf knit tiles | $0.56 |
| sky clouds, skyline day + night, sting | $0.67 |
| app icon (+ 5 sizes via Pillow) | $0.20 |
| **Total** | **≈ $3.45** (rounded up from the parts) |

**Running total: ≈ $37.50 of $100** (pictures $14.15 + audio $23.33; Meshy models next).

## Meshy models (2026-11-14)

Gus proof first (see design/screenshots/gus-test/). Originals and preview sheets in .gamegen/candidates/models/<name>/; the game copies in game/assets/models/ are optimized by tools/optimize-assets.mjs (2048 WebP, no quantization).

| ID | Source pictures | Options | Tris | Credits | Cost | Verdict | GLB (original → optimized) |
|---|---|---|---|---|---|---|---|
| gus-stand | gus-stand + gus-stand-back | `--texture 2k --max-texture 2048 --polycount 6000 --height 0.32` | 6,223 | 30 | $0.60 | accepted, first try | 2.89 MB → 0.84 MB |
| gus-fly | gus-fly + gus-fly-back | same | 6,174 | 30 | $0.60 | accepted, first try (replaced 2026-11-24 for #28 by a symmetric model at scale 1.0, below) | 3.11 MB → 0.99 MB |

Meshy so far: 60 credits ($1.20); 3,342 credits left. **Running total: ≈ $38.70 of $100.**


## Meshy models: animals (2026-11-14)

27 Tier A animals and birds, 7 Tier B extras and 15 crowd LODs (~400 tris, 256 px textures; the remesh adds two PBR maps, all at 256). Each was made from its concept picture (the direct mocks and cards, or the edits in .gamegen/candidates/concepts/): a dry run first, then the real run capped with `--max-credits`. Originals and preview sheets are in .gamegen/candidates/models/<name>/. The game copies in game/assets/models/ were optimized with tools/optimize-assets.mjs (WebP, no quantization). Every model faces +Z, stands on y = 0, and came back with no meshgen warnings. Fliers keep their picture's upright pose, so lean them forward in code. Each lean brings that flier to Gus's flight attitude (gus-fly is 66°, leaned 0.7 rad). The scales are starting values; settle them with the two-model match check.

| ID | Kind | Tris | Credits | Cost | Verdict | GLB (original → optimized) | Notes |
|---|---|---|---|---|---|---|---|
| pigeon-plain | model | 3124 | 30 | $0.60 | accepted, first try | 3.52 → 0.41 MB | `--texture 2k`; the 2048 JPEG original stays in .gamegen for the morph atlases |
| pigeon-plain-fly | model | 1560 | 30 | $0.60 | accepted, first try | 2.94 → 0.33 MB | 2 views; body axis 72° from horizontal → lean ≈ 0.80 rad; scale ≈ 1.05–1.15 vs pigeon-plain; wings asymmetric, as in its picture |
| crow | model | 3074 | 30 | $0.60 | accepted, first try | 3.18 → 0.39 MB |  |
| crow-fly | model | 3088 | 30 | $0.60 | accepted, first try | 2.87 → 0.42 MB | 2 views; body axis 57° → lean ≈ 0.54 rad; scale ≈ 1.2–1.3 |
| squirrel | model | 3047 | 30 | $0.60 | accepted, first try | 3.75 → 0.47 MB | acorn kept on the model |
| duck | model | 3099 | 30 | $0.60 | accepted, first try | 3.76 → 0.47 MB |  |
| duck-hen | model | 3086 | 30 | $0.60 | accepted, first try | 4.06 → 0.52 MB |  |
| duck-wood | model | 2993 | 30 | $0.60 | accepted, first try | 3.95 → 0.50 MB |  |
| duck-shoveler | model | 3107 | 30 | $0.60 | accepted, first try | 3.88 → 0.48 MB |  |
| duck-bufflehead | model | 3050 | 30 | $0.60 | accepted, first try | 3.48 → 0.42 MB |  |
| duck-white | model | 3119 | 30 | $0.60 | accepted, first try | 2.95 → 0.33 MB |  |
| duck-stranger | model | 3116 | 30 | $0.60 | accepted, first try | 3.95 → 0.50 MB |  |
| raccoon-stand | model | 4161 | 30 | $0.60 | accepted, first try | 3.84 → 0.51 MB |  |
| raccoon-scurry | model | 4177 | 30 | $0.60 | accepted, first try | 3.90 → 0.54 MB |  |
| rat | model | 2078 | 30 | $0.60 | accepted, first try | 3.74 → 0.39 MB | 0.2 m tall, 0.43 m long with the tail |
| turtle | model | 2047 | 30 | $0.60 | accepted, first try | 4.06 → 0.43 MB |  |
| owl | model | 3115 | 30 | $0.60 | accepted, first try | 3.75 → 0.48 MB |  |
| owl-fly | model | 3057 | 30 | $0.60 | accepted, first try | 3.95 → 0.52 MB | body axis 73° → lean ≈ 0.82 rad; scale ≈ 1.15–1.3 |
| hawk-perch | model | 3116 | 30 | $0.60 | accepted, first try | 4.07 → 0.52 MB |  |
| hawk-fly | model | 3084 | 30 | $0.60 | accepted, first try | 4.06 → 0.51 MB | body axis 49° → lean ≈ 0.40 rad; scale ≈ 1.0 (span already 1.03 m) |
| dog | model | 4152 | 30 | $0.60 | accepted, first try | 3.79 → 0.54 MB | rebuilt (free) to 1.38 m overall = 0.9 m at the shoulder |
| cat | model | 2588 | 30 | $0.60 | accepted, first try | 3.82 → 0.42 MB | rebuilt to 0.5 m overall = 0.3 m at the shoulder |
| cat-sit | model | 2601 | 30 | $0.60 | accepted, first try | 3.40 → 0.36 MB |  |
| horse | model | 5212 | 30 | $0.60 | accepted, first try | 3.06 → 0.56 MB | 2 views; rebuilt to 2.4 m overall = 1.6 m at the withers; stocky cartoon build, like its picture |
| songbird | model | 1019 | 30 | $0.60 | accepted, first try | 3.38 → 0.14 MB | 512 px texture |
| goose | model | 3123 | 30 | $0.60 | accepted, first try | 3.58 → 0.43 MB |  |
| heron | model | 3112 | 30 | $0.60 | accepted, first try | 3.63 → 0.47 MB |  |
| dog-poodle | model | 3087 | 30 | $0.60 | accepted, first try | 3.01 → 0.32 MB |  |
| dog-dachshund | model | 3118 | 30 | $0.60 | accepted, first try | 3.79 → 0.47 MB |  |
| owlet | model | 2049 | 30 | $0.60 | accepted, first try | 3.80 → 0.41 MB |  |
| night-heron | model | 3094 | 30 | $0.60 | accepted, first try | 3.40 → 0.42 MB |  |
| rat-stand | model | 2061 | 30 | $0.60 | accepted, first try | 3.60 → 0.37 MB |  |
| dog-mastiff | model | 3005 | 30 | $0.60 | accepted, first try | 3.99 → 0.49 MB | lying; rebuilt to 0.9 m long (0.52 m tall) |
| goose-bully | model | 3115 | 30 | $0.60 | accepted, first try | 3.75 → 0.47 MB |  |
| pigeon-plain-lod | remesh of pigeon-plain | 416 | 5 | $0.10 | accepted, first try | 0.25 → 0.07 MB |  |
| crow-lod | remesh of crow | 410 | 5 | $0.10 | accepted, first try | 0.24 → 0.07 MB |  |
| squirrel-lod | remesh of squirrel | 411 | 5 | $0.10 | accepted, first try | 0.26 → 0.08 MB |  |
| duck-lod | remesh of duck | 417 | 5 | $0.10 | accepted, first try | 0.26 → 0.08 MB |  |
| duck-hen-lod | remesh of duck-hen | 413 | 5 | $0.10 | accepted, first try | 0.28 → 0.08 MB |  |
| duck-wood-lod | remesh of duck-wood | 388 | 5 | $0.10 | accepted, first try | 0.27 → 0.08 MB |  |
| duck-shoveler-lod | remesh of duck-shoveler | 417 | 5 | $0.10 | accepted, first try | 0.26 → 0.08 MB |  |
| duck-bufflehead-lod | remesh of duck-bufflehead | 405 | 5 | $0.10 | accepted, first try | 0.26 → 0.07 MB |  |
| duck-white-lod | remesh of duck-white | 414 | 5 | $0.10 | accepted, first try | 0.24 → 0.07 MB |  |
| duck-stranger-lod | remesh of duck-stranger | 420 | 5 | $0.10 | accepted, first try | 0.27 → 0.08 MB |  |
| raccoon-scurry-lod | remesh of raccoon-scurry | 418 | 5 | $0.10 | accepted, first try | 0.27 → 0.08 MB |  |
| rat-lod | remesh of rat | 413 | 5 | $0.10 | accepted, first try | 0.26 → 0.08 MB | legs and tail mostly merged into the body (fine at distance) |
| turtle-lod | remesh of turtle | 416 | 5 | $0.10 | accepted, first try | 0.27 → 0.08 MB |  |
| dog-lod | remesh of dog | 413 | 5 | $0.10 | accepted, first try | 0.26 → 0.08 MB |  |
| goose-lod | remesh of goose | 419 | 5 | $0.10 | accepted, first try | 0.25 → 0.07 MB |  |
| **Total** | 34 models + 15 remeshes | | **1095** | **$21.90** | no retries | 127.5 → 16.2 MB | |

Meshy for animals: 1095 credits ($21.90) of the 1,400 approved for them, leaving 305 of that allowance unused. Meshy balance afterwards (shared with the other model batches): 994 credits.

## Meshy models: people, vehicles, props, landmarks (2026-11-14)

6 rigged characters, 28 models and 3 tree LODs (~600 tris, 256 px textures; the remesh adds two PBR maps). Each was made from its concept picture (the direct mocks and the Vinnie card, or the pictures in .gamegen/candidates/concepts/). The bench, lamppost, trash can, rowboat, sailboat and taxi came from text prompts with the style line, no text and no logos. Every job ran as a dry run first, then for real capped with `--max-credits`. Originals and preview sheets are in .gamegen/candidates/models/<name>/. Rejected takes are kept there as bench-rejected, taxi-rejected and trash-can-rejected1/2. The game copies in game/assets/models/ were optimized with tools/optimize-assets.mjs (WebP, no quantization). Its texture table now also lists the 2048 landmarks, the 512 props and the 256 tree LODs. Everything stands on y = 0 with no meshgen warnings.

Two kinds of fix were made after generation:
- **Size:** a free `rebuild --height` brought each model to the design's size. Vehicles, the bridge, bench, rowboat, pizza props, megaphone and battery are sized by their length or width, so their heights follow from that.
- **Facing:** Meshy built the vehicles, boats and megaphone side-on, facing -X. Their originals were turned to face +Z with a "facing-fix" root node: +90° about Y for van, carriage, ice-cream-truck, zamboni, ranger-cart, pedicab, rc-boat, rowboat, sailboat and megaphone; -90° for the taxi. A meshgen `rebuild` would undo this, so turn them again after any rebuild.

The bow bridge spans X (27 m), and the hot dog cart runs along X with its handle at -X and its cabinet doors facing +Z. No fallback was needed: the bridge lattice is clean, the trees are usable, and the `throw=389` clip reads as a throw.

| ID | Kind | Tris | Credits | Cost | Verdict | GLB (original → optimized) | Notes |
|---|---|---|---|---|---|---|---|
| human-ranger | character (ranger mock) | 9337 | 50 | $1.00 | accepted, first try | 4.95 → 1.63 MB | 1.75 m; idle, walk, run, pickup, wave, cheer, scold (311 Stand_Talking_Angry); idle turns the body away for a moment around 2.7 s |
| human-park | character | 9340 | 50 | $1.00 | accepted, first try | 4.67 → 1.38 MB | idle, walk, run, cheer, sit, wave, throw (389 Grip_and_Throw_Down, no fallback); sit is a seated crouch, so the game supplies the bench |
| human-vendor | character (vinnie card) | 9368 | 50 | $1.00 | accepted, first try | 5.06 → 1.55 MB | idle, walk, run, attack, taunt, scold 311, stomp (26 Angry_Stomp); the apron flexes a little in run and attack but doesn't smear |
| human-prickett | character | 9396 | 50 | $1.00 | accepted, first try | 5.11 → 1.68 MB | idle, walk, run, pickup, taunt, scold 311, stomp 26 |
| human-walter | character | 9335 | 44 | $0.88 | accepted, first try | 4.99 → 1.43 MB | idle, walk, wave, scold 311; the coat holds |
| human-wedding | character | 9328 | 44 | $0.88 | accepted, first try | 4.18 → 1.20 MB | 1.7 m; idle, walk, run, cheer, throw 389; the skirt swings with the legs without smearing |
| carriage | model | 4080 | 30 | $0.60 | accepted, first try | 3.86 → 0.59 MB | 2.97 m long; turned +90° |
| van | model | 3834 | 30 | $0.60 | accepted, first try | 2.77 → 0.41 MB | 5 m long (3.16 m tall, a chunky 3.3 m wide); turned +90°; no lettering |
| ice-cream-truck | model | 5065 | 30 | $0.60 | accepted, first try | 3.19 → 0.49 MB | 5 m long, 4.9 m to the top of the cone; turned +90°; the serving hatch is on the truck's left side (+X after the turn) |
| zamboni | model (front + side) | 5612 | 30 | $0.60 | accepted, first try | 2.98 → 0.57 MB | 3.6 m long; turned +90° |
| bethesda-fountain | model (mock) | 18537 | 30 | $0.60 | accepted, first try | 5.25 → 2.42 MB | 8 m wide; 2048 texture |
| belvedere-castle | model (mock) | 18415 | 30 | $0.60 | accepted, first try | 5.11 → 2.39 MB | 20 m tall; 2048 texture; the back wall is plainer |
| bow-bridge | model (side + 3/4) | 15162 | 30 | $0.60 | accepted, first try | 4.27 → 1.79 MB | 27 m along X; clean lattice, so the code-bridge fallback isn't needed; 2048 texture |
| carousel | model (front + 3/4) | 11796 | 30 | $0.60 | accepted, first try | 4.02 → 1.11 MB | 14 m wide |
| statue-sled-dog | model | 5211 | 30 | $0.60 | accepted, first try | 4.22 → 0.61 MB | 2 m |
| statue-mushroom | model | 8341 | 30 | $0.60 | accepted, first try | 3.70 → 0.72 MB | 3 m |
| hotdog-cart | model | 4880 | 30 | $0.60 | accepted, first try | 3.48 → 1.05 MB | 2 m with the umbrella; runs along X; 2048 texture |
| ranger-cart | model | 4091 | 30 | $0.60 | accepted, first try | 2.79 → 0.45 MB | 2.8 m long; turned +90° |
| pedicab | model | 4068 | 30 | $0.60 | accepted, first try | 3.59 → 0.54 MB | 2.5 m long; turned +90° |
| rc-boat | model | 2074 | 30 | $0.60 | accepted, first try | 3.49 → 0.37 MB | 0.6 m long; turned +90° |
| bench | model (text) | 1355 | 60 | $1.20 | accepted, second try | 2.18 → 0.20 MB | first try had shattered backrest slats and orange wood; remake is green slats on cast iron, 1.8 m long |
| lamppost | model (text) | 1529 | 30 | $0.60 | accepted, first try | 2.79 → 0.27 MB | 4 m |
| trash-can | model (text) | 678 | 90 | $1.80 | accepted, third try | 1.06 → 0.06 MB | tries 1–2 made the wire mesh as jagged shards; try 3 is a clean solid green bin with a rain hood (not an open wire basket) |
| rowboat | model (text) | 1946 | 30 | $0.60 | accepted, first try | 2.82 → 0.19 MB | 3 m long; turned +90°; the oars from the prompt weren't made |
| sailboat | model (text) | 1839 | 30 | $0.60 | accepted, first try | 2.75 → 0.18 MB | 0.9 m; turned +90° |
| taxi | model (text) | 3917 | 60 | $1.20 | accepted, second try | 3.25 → 0.52 MB | first try had "TAXI" on the doors; remake has no lettering, just a checker patch on the hood and the rear wings; 4.5 m long; turned -90° |
| tree-elm | model | 2361 | 30 | $0.60 | accepted, first try | 0.99 → 0.22 MB | 9 m |
| tree-maple | model | 2446 | 30 | $0.60 | accepted, first try | 3.09 → 0.33 MB | 6 m |
| tree-oak | model | 2313 | 30 | $0.60 | accepted, first try | 3.14 → 0.34 MB | 7.5 m |
| tree-elm-lod | remesh of tree-elm | 571 | 5 | $0.10 | accepted, first try | 2.05 → 0.09 MB |  |
| tree-maple-lod | remesh of tree-maple | 584 | 5 | $0.10 | accepted, first try | 2.18 → 0.08 MB |  |
| tree-oak-lod | remesh of tree-oak | 566 | 5 | $0.10 | accepted, first try | 2.37 → 0.09 MB | canopy a little sparser (fine at mid range) |
| pizza-slice | model | 1537 | 30 | $0.60 | accepted, first try | 3.44 → 0.33 MB | lies flat, 0.25 m long, tip toward +Z |
| pizza-box | model | 317 | 30 | $0.60 | accepted, first try | 1.32 → 0.05 MB | 0.4 m wide, 0.07 m tall; closed |
| traffic-cone | model | 828 | 30 | $0.60 | accepted, first try | 2.93 → 0.10 MB | 0.7 m |
| megaphone | model | 1550 | 30 | $0.60 | accepted, first try | 3.41 → 0.33 MB | 0.5 m long; bell turned to +Z |
| battery | model | 1493 | 30 | $0.60 | accepted, first try | 2.84 → 0.28 MB | 0.5 m wide with cables, 0.3 m tall |
| **Total** | 6 characters + 28 models + 3 remeshes | | **1263** | **$25.26** | 4 remakes (bench 1, taxi 1, trash-can 2) | 124.3 → 26.1 MB | |

Meshy for people, vehicles, props and landmarks: 1263 credits ($25.26) of the 1,350 approved, leaving 87 of that allowance unused. Meshy balance afterwards (shared with the animal batch): 984 credits, all permanent (the monthly credits are used up).

## Totals after the Meshy models (2026-11-14)

Meshy: Gus 60 + animals 1,095 + people/vehicles/props/landmarks 1,263 = **2,418 credits ≈ $48.36** (balance left: 984 permanent credits). All accepted; no fallbacks, nothing skipped. Vehicle facing fix: tools/rotate-glb.mjs (re-run after any meshgen rebuild of a vehicle).

**Running total: ≈ $85.84 of $100** (pictures $14.15 + audio $23.33 + Meshy $48.36). **Past 80% of the budget.** Meshy's share was prepaid in the account; cash spend so far ≈ $37.50. Still to make: pigeon and squirrel morph atlases (~$3.70).

## Colour morphs and portrait crops (2026-11-14)

Morph layers: one nanogen pro 2K edit of each model's own Meshy atlas per morph (the morph's card as colour reference), then free Pillow fixes by region from a baked position map (`tools/bake-posmap.mjs`, `tools/morph-paint.py`, `tools/morph-build.py`). Every edit kept the UV layout (gradient correlation peaks at zero shift, 0.6–0.94). Coral legs, feet and eyes are copied back from the base on every pigeon layer. 3D contact sheets: `.gamegen/candidates/morphs/_sheet-<model>.jpg`. Output: `game/assets/textures/morphs/` (1024² WebP, `manifest.json` gives the layer order; layer 0 is the base texture).

| Layer | Morph (card) | pigeon-plain | pigeon-plain-fly | Verdict |
|---|---|---|---|---|
| 0 | blue bar (Duchess) | base texture | base texture | — |
| 1 | blue checker (Bella) | region paint (the edit came back nearly unchanged) | region paint (no edit bought) | accepted |
| 2 | dark checker (Knuckles) | edit + painted chequer | edit + painted chequer | accepted |
| 3 | melanistic (Lou) | edit | edit | accepted |
| 4 | mostly white (Tiny) | edit (feet restored) | edit | accepted |
| 5 | ash-red (Monty) | edit (the proof morph) | edit | accepted |
| 6 | red checker (Encore) | edit + painted chequer | edit + painted chequer | accepted |
| 7 | pied (Tuppence) | edit | edit | accepted |
| 8 | pure white (Dove) | edit + painted lift | edit + painted lift | accepted |
| 9 | silver-dun (Bunting) | edit | edit | accepted |
| 10 | grizzle (Lapcount) | edit | edit + painted speckle | accepted |
| 11 | brown pied (Wheezy) | edit | edit + grey bars tinted brown | accepted |
| 12 | mealy (Feathers) | edit | edit | accepted |
| squirrel | grey (Hazel) / cinnamon (Nutmeg) / black (Twitch) / near-white (Pecan) | base / edit + grey clean-up / edit / edit + lift | — | accepted |

Cost: 26 nanogen pro 2K edits × $0.134 = **$3.48** (11 + 11 pigeon, 3 squirrel, plus the ash-red proof; no retakes). Meshy morph models: not needed, none bought.

Portrait crops: **72** 512² WebP in `game/assets/portraits/` (67 cards, Gus from `gus-scarf`, plus hazel, puddles, vesper, rigby, biscuit), free with Pillow; boxes in `tools/portrait-crops.json`, rebuilt by `python3 tools/portrait-crops.py`. Horse heads (Clementine, Dapple) sit near the left edge because they do on the cards.

**Running total: ≈ $89.32 of $100** (previous $85.84 + morphs $3.48).

## Meshy models: 12 more park people (2026-11-14)

12 rigged meshgen characters, so the park's crowd has real variety: 7 women or girls and 5 men or boys, of mixed ages and ethnicities (no real people, no logos, no text). Each one comes from an imagegen2 high concept picture in `.gamegen/candidates/concepts/human-<id>.png`, made with `gen.sh` (kind `human`). The references were human-park plus human-walter (the men) or human-wedding (the women), with the gus-stand anchor for style. Dolores is an edit of her card, `design/mockups/cards/dolores.png`, turned into an A-pose: the pigeon, crumb bag and crumbs are removed, and the coat is shortened to just above the knee. One concept was redone: the first tourist read as young and androgynous, so it was remade as a clearly middle-aged woman (`human-tourist-rejected1.png`). All 12 were checked side by side with human-park and share one look.

Every character is 9k tris with a 1024 texture, faces +Z and stands on y = 0 with no meshgen warnings. Each was a dry run first, then run for real with `--max-credits`, at most 2 jobs at a time. walk (30 Casual_Walk) and run (14 Run_02) come free with the rig. idle is 0. Originals and preview sheets are in `.gamegen/candidates/models/human-<id>/`. The game copies were optimized with `tools/optimize-assets.mjs` (listed at 1024), and `game/tools/list-models.mjs` regenerated the manifest.

Two clip fixes:
- **Skater:** `glide=516` (slide_light) turned out to be a baseball-style slide to the ground. `wobble=123` (Unsteady_Walk) was added for 3 credits, glide was taken out of the manifest, and the model was rebuilt for free.
- **Dog walker:** Meshy has retired 674 (Stumble_Walk_inplace), so the first animation step failed after the model and rig were already paid for. `animate` added `pulled=562` (Stumble_Walk, made in place by meshgen) on the same rig for 9 credits.

The library has no clip for jogging, skating, taking photos or cooking, so the nearest clips stand in (see the table).

| ID | Kind | Tris | Credits | Cost | Verdict | GLB (original → optimized) | Clips (action ids) / notes |
|---|---|---|---|---|---|---|---|
| human-dolores | character (card edit) | 9296 | 44 | $0.88 | accepted, first try | 5.60 → 1.59 MB | idle 0, walk, run, throw 389 Grip_and_Throw_Down, sit 32 Chair_Sit_Idle_F; the coat and scarf hold; no pigeon (it is a code prop) |
| human-chess-player | character | 9316 | 47 | $0.94 | accepted, first try | 5.44 → 1.39 MB | idle, walk, run, sit 33 Chair_Sit_Idle_M, think 364 Sit_on_Chair_Arms_Crossed, argue 355 Sit_Finger_Wag_No (both seated) |
| human-jogger | character | 9367 | 47 | $0.94 | accepted, first try | 4.77 → 1.28 MB | idle, walk, run, jog 15 Run_03, warmup 326 jumping_jacks, catch-breath 31 Catching_Breath |
| human-tourist | character | 9306 | 44 | $0.88 | accepted, first try (concept redone once) | 4.94 → 1.43 MB | idle, walk, run, wave 28 Big_Wave_Hello, gawk 333 Look_Around_Dumbfounded; there is no photo clip in the library; the camera and backpack are modelled on the body |
| human-child | character (1.3 m) | 9288 | 47 | $0.94 | accepted, first try | 4.77 → 1.61 MB | idle, walk, run, cheer 298 Cheer_with_Both_Hands_Up, jump 44 Happy_jump_f, skip 668 Skip_Forward_inplace |
| human-teen-skater | character | 9375 | 47 | $0.94 | accepted (one clip swapped) | 4.82 → 1.25 MB | idle, walk, run, balance 390 Stand_on_Pole_and_Balance, wobble 123 Unsteady_Walk; wears ice skates; glide 516 removed |
| human-birder | character | 9289 | 44 | $0.88 | accepted, first try | 4.94 → 1.57 MB | idle, walk, run, look 336 Long_Breathe_and_Look_Around, scan-walk 341 Walk_Slowly_and_Look_Around (a long 31 s clip) |
| human-businessperson | character | 9234 | 44 | $0.88 | accepted, first try | 4.38 → 1.17 MB | idle, walk, run, phone 312 Phone_Conversation, phone-walk 693 Walking_with_Phone_inplace; the hand is at the ear, so a phone prop can go on RightHand |
| human-halal-cart-man | character | 9315 | 47 | $0.94 | accepted, first try | 5.00 → 1.33 MB | idle, walk, run, wave 290 Wave_One_Hand, cook 318 Scheming_Hand_Rub (stands in for cooking), call 29 Call_Gesture; the apron holds |
| human-pizza-counterman | character | 9328 | 44 | $0.88 | accepted, first try | 4.97 → 1.39 MB | idle, walk, run, shrug 317 Shrug, scold 311 Stand_Talking_Angry; the apron holds |
| human-dog-walker | character | 9323 | 44 | $0.88 | accepted (one clip id swapped) | 4.90 → 1.42 MB | idle, walk, run, pulled 562 Stumble_Walk, pickup 276; 35 for the model and rig plus 9 for the clips; the leashes are a code prop |
| human-carriage-driver | character | 9295 | 44 | $0.88 | accepted, first try | 4.98 → 1.38 MB | idle, walk, run, sit 33 Chair_Sit_Idle_M (a seated crouch: the game supplies the box seat), bow 42 Gentlemans_Bow; the coat holds |

Meshy: **543 credits ($10.86)** of the 700 approved, with 157 of that allowance unused. Meshy balance afterwards: 441 credits. imagegen2: 13 pictures (12 + 1 retake) × ≈ $0.06 = **≈ $0.78**.

**Running total: ≈ $100.96 of $100** (previous $89.32 + Meshy $10.86 + pictures $0.78). The coordinator pre-approved this batch over the budget line. Meshy credits were prepaid in the account, so the cash spend is about $0.78.

## Fix-pass generation (2026-11-18, approved by the user: "Yes, I approve the regeneration fixes")
| What | Tool | ≈ Cost |
|---|---|---|
| 9 Gus portraits, one per extra scarf (imagegen2 edits of gus-scarf.png, medium, complexity low) → game/assets/portraits/gus-<scarf>.webp | imagegen2 | $0.55 |
| park-dusk-b.mp3 (clarinet jazz waltz, 100 s), park-night-b.mp3 (lounge piano, 75 s; 2 timeouts first) | audiogen music | $0.90 |
| battery-splash.mp3, battery-glow.mp3 | audiogen sfx | $0.24 |
| photographer-fall.mp3 (same voice as "THAT'S the shot") | audiogen voice | $0.01 |
| **Batch total** | | **≈ $1.70** |

**Running total: ≈ $102.66** (working cap $150, raised by the user).

## Fun pass (2026-11-19, paid generation approved)
| What | Tool | ≈ Cost |
|---|---|---|
| glass-smash.mp3 (a wine glass knocked off the Tavern patio table: gear-pen, the cats' knock) → game/assets/audio/sfx/ | audiogen sfx | $0.12 |

**Running total: ≈ $102.78** (working cap $150).

## Polish fixes (Phase 8, 2026-11-19, paid generation approved)
| What | Tool | ≈ Cost |
|---|---|---|
| workshop-blueprints.jpg (the Mecha-Pigeon blueprints pinned on a cork board, Workshop wall) → game/assets/ui/ (1536×1024 medium, resized to 1024 wide) | imagegen2 (gpt-image-2.6-flare) | $0.06 |
| nap-gus.jpg (Gus asleep on his lamppost, circular vignette for the nap screen; edit with gus.webp as the reference) → game/assets/ui/ (1024² medium, resized to 512) | imagegen2 (gpt-image-2.6-flare) | $0.07 |
| **Batch total** | | **≈ $0.13** |

The snow ramp is code (a vertex-coloured kicker mesh in entities/vehicles.js), so no texture was generated for it. Workshop props otherwise reuse existing models (raccoon-stand, rat-stand, traffic-cone, trash-can, pizza-box) and the park's schist texture.

**Running total: ≈ $102.91** (working cap $150).

## Fix #19 (2026-11-22): the anchovy slice's texture
| What | Tool | Tries | ≈ Cost |
|---|---|---|---|
| pizza-slice-anchovy.webp (the pizza-slice GLB's own 1024² atlas, pulled out of game/assets/models/pizza-slice.glb, edited in place: every pepperoni patch repainted as silver-and-olive anchovy, UV islands kept) → game/assets/textures/. Take 1 painted fillets over the sauce but left the pepperoni discs red on the model (rejected after a render); take 2 accepted. Takes in .gamegen/candidates/anchovy/ | nanogen (gemini-nano-banana-2.1, 1K edit, `--image`) | 2 | $0.10 (2 × ≈$0.05: 2.1 isn't in the skill's price table, so this is estimated from 3.1 Flash 1K plus thinking tokens) |

Used only by slice-anchovy items and the anchovy fan's prop (systems/items.js, entities/humans.js); other slices stay pepperoni.

**Running total: ≈ $103.01** (working cap $150).

## Photo mode #9 (2026-11-22; this change's budget $20)
| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| tourist-camera | game/assets/models/tourist-camera.glb (original and preview in .gamegen/candidates/photo/tourist-camera/) | meshgen (Meshy text-to-3D, ~600 tris, 512 px WebP after tools/optimize-assets.mjs) | a small vintage tourist film camera: silver top plate, tan leatherette, round lens; style line | 3 (take 1: orange body, black top, shards round the lens; take 2: beige top, blob lens, ribbon strap; take 3 accepted: 0.13 × 0.098 × 0.066 m, lens faces +Z, no strap stubs) | 90 credits ≈ $1.80 |
| flicker | design/mockups/cards/flicker.png → game/assets/portraits/flicker.webp (tools/portrait-crops.json box [120, 18, 632, 530]) | imagegen2 (gpt-image-2.6-flare, high, 1024², edit of cawdry.png) | Flicker, a glossy black crow with a film canister on a red cord, posing; style line | 1 | ≈ $0.05 |
| **Batch total** | | | | | **≈ $1.85** |

The camera cost more than the ≈ $0.60 forecast (two retakes); the change stays far inside its $20. The film canister (Flicker's accessory), the balcony, the window and the camera / album icons are code. The shutter is the existing camera-shutter.mp3. Meshy balance afterwards: 871 credits.

**Running total: ≈ $104.86** (working cap $150).

## Issue fixes #28, #35 (2026-11-24; the person's art budget for these fixes: $50)

| Asset | File | Tool | Notes | Cost |
|---|---|---|---|---|
| Gus in flight, front and back references | .gamegen/candidates/fix-art/gus-fly/gus-fly-{front,back}-v1.png | imagegen2 high ×2 | symmetric: level wings, tail fanned straight back, one eye a side (the old turned views put a second eye on his head and swept the tail to his left, #28) | ≈ $0.12 |
| gus-fly | game/assets/models/gus-fly.glb | meshgen (30 credits; 841 left) | 6,148 tris, 2K texture, same frame and height as before; its head is bigger, so it is scaled ×1.0 in code (was ×1.15) to match gus-stand's head; 3.51 MB → 1.14 MB | $0.60 |
| Coats: Pickles, Tux, Duke, Big Ben | game/assets/textures/coats/{cat-sit-pickles,cat-sit-tux,horse-duke,horse-bigben}.webp | nanogen pro 2K edit ×4 + Pillow region fixes | each model's own atlas, same UVs, the portrait as colour reference (#35) | ≈ $0.54 |
| **Total** | | | | **≈ $1.26** |

**Running total: ≈ $106.12** (working cap $150; $1.26 of the $50 for these fixes).

## Meshy models: 15 more park people (#46, 2026-11-25; the owner approved the Meshy spend, cap ~700 credits)

15 rigged meshgen characters so the park isn't clones: 8 women or girls and 7 men, a NYC autumn mix of ages (8 to 70s), builds and skin tones (no real people, no logos, no text). Each comes from an imagegen2 high concept picture, `.gamegen/candidates/people-46/concepts/<id>.png` (contact sheet `_sheet.jpg`), made with `people-46/gen.sh`: the same style line and A-pose block as `concepts/gen.sh` kind `human`, with human-park plus human-walter (men), human-wedding (women) or human-child (the kid) and the gus-stand anchor as style references. All 15 concepts were accepted first time. Props that would need their own models (the stroller, easel, scooter, bike, newspaper, shopping bags) were left out; the role accessories in code (sax, guitar, selfie phone, box, helmet, hard hat, beret, slice) still apply, and a model that wears one already skips it (`MODEL_HAS`).

Same pipeline as the 12 of 2026-11-14: `meshgen character --polycount 9000` at the height below, a dry run first and then `--max-credits 44`, 2 jobs at a time; idle (0) plus the free walk and run plus one or two role clips. Every model faces +Z, stands on y = 0, ~9.3k triangles, no meshgen warnings; each preview sheet was checked. Originals and sheets: `.gamegen/candidates/people-46/models/human-<id>/`. Game copies optimised with `tools/optimize-assets.mjs --originals .gamegen/candidates/people-46/models` (1024 WebP q88, no quantization); the distance LOD is built at load (`gfx/simplify.js`), as for every person. `game/tools/list-models.mjs` regenerated the manifest.

| ID | Kind | Tris | Credits | Cost | Verdict | GLB (original → optimized, MiB) | Clips (action ids) / notes |
|---|---|---|---|---|---|---|---|
| human-nanny | character, 1.68 m | 9383 | 44 | $0.88 | accepted, first try | 4.81 → 1.27 | Black Caribbean woman, 40s, plum puffer, mustard beanie; wave 290 Wave_One_Hand, chat 56 Stand_and_Chat |
| human-taichi-elder | character, 1.56 m | 9380 | 44 | $0.88 | accepted, first try | 4.82 → 1.29 | East Asian woman, 70s, red quilted jacket; taichi 377 (a slow wide-stance palm form, loops), look 336 |
| human-old-man | character, 1.70 m | 9301 | 44 | $0.88 | accepted, first try | 5.06 → 1.41 | white man, 70s, flat cap, waxed jacket; sit 33 Chair_Sit_Idle_M, wave 290 |
| human-street-musician | character, 1.84 m | 9333 | 44 | $0.88 | accepted, first try | 5.21 → 1.49 | Black man, 30s, locs, rust beanie, denim jacket; sway 415 Happy_Sway_Standing (loops), bow 42 |
| human-cyclist | character, 1.68 m | 9356 | 41 | $0.82 | accepted, first try | 4.61 → 1.22 | Latina woman, 20s, hi-vis jacket, helmet modelled; wave 290 |
| human-construction | character, 1.78 m | 9312 | 44 | $0.88 | accepted, first try | 5.42 → 1.56 | heavyset Latino man, 50s, hard hat modelled, hi-vis vest; pickup 276, scold 311 |
| human-student | character, 1.62 m | 9340 | 44 | $0.88 | accepted, first try | 4.86 → 1.37 | South Asian student, 19, glasses, backpack; sit 32 Chair_Sit_Idle_F, phone 312 |
| human-runner | character, 1.80 m | 9346 | 44 | $0.88 | accepted, first try | 5.00 → 1.30 | white man, 30s, grey hoodie; jog 15 Run_03, catch-breath 31 |
| human-newspaper-man | character, 1.75 m | 9318 | 44 | $0.88 | accepted, first try | 4.90 → 1.35 | Middle Eastern man, 50s, glasses, peacoat; sit 33, think 364 (seated) |
| human-shopper | character, 1.66 m | 9317 | 44 | $0.88 | accepted, first try | 4.54 → 1.36 | East Asian woman, 30s, trench coat, crossbody bag; sit 32, wave 28 |
| human-scooter-kid | character, 1.25 m | 9310 | 44 | $0.88 | accepted, first try | 4.82 → 1.58 | Black girl, ~8, yellow raincoat; cheer 298, jump 44 |
| human-painter | character, 1.60 m | 9241 | 44 | $0.88 | accepted, first try | 4.89 → 1.51 | white woman, 60s, paint-smeared smock, red beret modelled; look 336, sit 32 |
| human-photographer | character, 1.72 m | 9354 | 47 | $0.94 | accepted, first try | 4.65 → 1.30 | East Asian man, 20s, bomber, camera on a strap; photo 258 CrouchLookAroundBow, gawk 333, cheer 298 (added with `animate` for 3: the wedding script plays cheer on him) |
| human-delivery | character, 1.72 m | 9322 | 41 | $0.82 | accepted, first try | 4.54 → 1.20 | South Asian man, 30s, red rain jacket, knit hat; call 29 |
| human-dog-sitter | character, 1.70 m | 9288 | 44 | $0.88 | accepted, first try | 5.13 → 1.47 | white woman, 20s, ginger bun, orange fleece; pulled 562 Stumble_Walk, pickup 276 |
| **Total** | 15 characters | | **657** | **$13.14** | no retakes | 73.3 → 20.7 MiB (21.7 MB) | |

Meshy: **657 credits ($13.14)** of the ~700 approved; balance afterwards 184. imagegen2: 15 pictures × ≈ $0.06 = **≈ $0.90** (1758 output tokens each, no retakes). This change: **≈ $14.04**.

**Running total: ≈ $120.16** (previous $106.12 + Meshy $13.14 + pictures $0.90). The Meshy credits were prepaid, so the cash spend is about $0.90.

## Super Jumbo Bagels (#44) and bagel bribes (#45), 2026-11-25 (budget $20 per change)

All lettering (fascia, blade sign, A-frame chalk, neon OPEN) is drawn in code; no generated image carries text. Takes in `.gamegen/candidates/bagels/` (img/, audio/); `bagel-shop.jpg` (a local photo) was a mood reference only and was never an input. Prices as in the earlier sections (imagegen2 from logged tokens; nanogen and audiogen from their skills' price notes).

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| Menu sheet: 4 bagels | game/assets/ui/bagels/bagel-{plain,sesame,poppy,everything}.webp (128² cut-outs) | imagegen2 medium, transparent, gus-stand reference | four chunky bagels from above at ¾: plain, pale sesame, black poppy, everything; style line | 1 | $0.06 |
| Menu sheet: 4 schmear tubs | game/assets/ui/bagels/schmear-{plain,scallion,strawberry,jalapeno}.webp | imagegen2 medium, transparent | open tubs: off-white, pale green + dark flecks, pink + red bits, pale green + jalapeño chips (scallion's cream paled in Pillow so jalapeño is the green one) | 1 | $0.05 |
| Bagel crust atlas | game/assets/textures/bagel-crust.webp (1024², 2×2 seamless tiles) | nanogen (edit from the bagel sheet) + Pillow (grid lines trimmed, light evened, edges blended; plain from poppy minus dots) | crust close-ups: plain, sesame, poppy, everything | 3 | $0.12 |
| Shop back wall | game/assets/textures/bagel-shop-back.webp (1024×400) | nanogen flash 2K 21:9, refs tex-facade-storefront + key art | flat frontal bagel-shop interior: wire bins, deck oven, cream/black tiles; no text, no people | 1 | $0.06 |
| Manny's card | design/mockups/cards/manny.png → game/assets/portraits/manny.webp (crop [274, 0, 738, 464]) | imagegen2 high, edit of concepts/human-chess-player.png, vinnie.png card reference | the chess player with a paper deli hat, long floury white apron, a bagel in hand | 1 | $0.07 |
| Scarf: Everything bagel | game/assets/textures/scarf-everything-bagel.jpg (512²) | nanogen, scarf-bread-print reference | charcoal knit with intarsia golden bagel rings and sesame/poppy dots, seamless | 2 | $0.08 |
| Gus in the Everything bagel scarf | game/assets/portraits/gus-everything-bagel.webp (crop [146, 0, 658, 512] of the edit) | imagegen2 medium, edit of gus-scarf.png + the scarf tile | same Gus, the new scarf | 1 | $0.06 |
| SFX bell-ding, bagel-munch | game/assets/audio/sfx/{bell-ding,bagel-munch}.mp3 (1.07 s, 1.54 s) | audiogen sfx | a chrome counter service bell struck once; a cartoon animal munching a chewy bagel | 1 each | $0.24 |
| Voices #44: Manny ×12, Mama Mask ×23 | game/assets/audio/voice/{manny,mamamask}-*.mp3 | audiogen TTS eleven_v4 | new voices: Manny = "Frank Sullivan" (bRlp5mUWs01wX4H4oW4X, warm late-60s New Yorker); Mama Mask = "Jasper Arnold" (cibGBHebxgbzkwF6iySQ, warm brassy, [raspy, New York]) | 1 each | $0.28 |
| Voices #45: 90 crew-member lines in 17 new voices | game/assets/audio/voice/bribe-<crew>-{excited,thanks,lead,tip,hint1,hint2,refuse,closer}.mp3 | audiogen TTS eleven_v4 | a younger/smaller sibling of each boss's register (catalogue voices; none shared with any boss or human: `V` map in .gamegen/candidates/audio/jobs.py, `crew-<crew>`) | 1 each | $0.66 |
| **Total** | | | | | **≈ $1.68** (#44 ≈ $1.02, #45 ≈ $0.66) |

Voice lines: the full list with texts is game/src/data/bagels.js (MANNY, MAMA, BRIBES) plus data/lead-hints.js (hint1/hint2). Words couldn't be machine-checked (the key has no speech-to-text); durations were checked per clip (0.30–1.02 s per word) and the levels were checked in the browser against the existing voices (see the fix-44 notes).

**Running total: ≈ $121.84** (previous $120.16 + $1.68).

## Consistency pass fixes (#43), 2026-11-25 (budget $20)

Takes in `.gamegen/candidates/consistency/`. Every voice uses its character's existing voice id (eleven_v4); the generation text is the line's opening words as now shown (design/reviews/consistency-pass.md has the rows). The six voice files with no readable source text could not be transcribed (speech-to-text was not permitted in this session), so the four that play were regenerated from their current lines; crowd-chant-take-3 is unused and was left.

| ID | File | Tool | Text / prompt | Tries | Est. cost |
|---|---|---|---|---|---|
| Boss voices: replaced (13) | voice/{mimi,gertrude,eldest,clementine,wingate,sue,rhoda,vesper,strix}-greeting, {duchess,puddles,rhoda}-join, vinnie-flying-rat | audiogen TTS | e.g. mimi "[mischievously] Bwip-bwip! Ha! Gotcha!"; gertrude "[shouting] HONK. This arm of the Lake is GOOSE TERRITORY!"; vinnie (new voice for him: Mister Gruff mSOmKHC6GZcZbSTGlqHO) "Ya flying RAT!" | 1 each | ≈ $0.13 |
| Boss voices: new (4) | voice/duchess-frenzy, rigby-ready, rhoda-hold-still, bigsal-rhoda | audiogen TTS | "Well, well. A feeding frenzy, on MY Pond." / "Get in here, boss. She's ready." / "Hold STILL, you big lug!" / "Big Sal. The Meer Mob. You want something, kid?" | 1 each | ≈ $0.04 |
| Bribe voices (9) | voice/bribe-{cats-hint2,horses-hint1,horses-hint2,meermob-hint2,racers-hint1,songbirds-hint1,squirrels-hint2,raccoons-tip,meermob-tip} | audiogen TTS, the crews' #45 voices | the lead hints / tips as reworded (step, by day, by the gatehouse, bwip-bwip, gap, the stagehand's wrench) | 1 each | ≈ $0.09 |
| Carousel band organ | music/carousel-organ.mp3 (15 s) | audiogen music | cheerful fairground carousel band organ waltz, calliope pipes, glockenspiel, bass drum, instrumental | 1 | ≈ $0.08 |
| Strix without spectacles | portraits/strix-nospecs.webp (512²) | imagegen2 medium, edit of strix.webp | the same owl, no spectacles (shown until den-strix) | 1 | ≈ $0.06 |
| **Total** | | | | | **≈ $0.40** |

Code-built, no generation: the peas tub, the wire shopping cart, the gold cufflink, the sneaker key charm, the sunken rowboat, the sea lions, the key bracket at the Boathouse lot gate, the north gatehouse drinking fountain, Prickett's phone, Socket's welding torch, Strix's spectacles after den-strix, the car unlock chirp (synth); the shipped ranger-whistle.mp3 and duck-dive-bloop.mp3 are now played.

**Running total: ≈ $122.24** (previous $121.84 + $0.40).
