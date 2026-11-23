# Design review log

## Round 1 (2026-11-13)

Reviewers: Player, Builder, Art & sound director. 30 findings (7 must-fix). Full findings: .gamegen/review/r1-*.md

| Finding | Severity | Outcome |
|---|---|---|
| P1 Ally combining → escort missions | must-fix | Fixed: allies are Called to scheme spots (~3 s), several can wait; only the flock follows |
| P2 Flight camera vs right thumb | must-fix | Fixed: camera auto-eases behind in flight; R2/L2 climb/dive; slide-off Flap on touch; scheme line top-left |
| P3+B9 Ctrl sprint / chords / mute | must-fix | Fixed: Shift sprint, C dive, M mute + button, Tab map, no pad chords; bug shortcut Ctrl+Shift+L (F is Coo) |
| P4 Nap trips | should-fix | Fixed: nap on any perch / pause / Board button |
| P5 Flight trivialises fights | should-fix | Fixed: per-fight rules (heavy carry caps flight, flapping alerts owl, vendor leash, hawk over water) |
| P6+B8 Bread Power gate / sign rules | should-fix | Fixed: gate = 13 denizens + 8 parts; 30-sign table; schemes cycle-check script |
| P7+B7 Fog vs perch views / ESB | should-fix | Fixed: unfogged far layer incl. ESB; fog pushed out on Summit Perch |
| P8 First minute | should-fix | Fixed: scripted first 60 s, in-world prompts |
| P9 Landmarks with nothing to do | should-fix | Fixed: 12 Park Postcards; ~8 lines per denizen |
| P10 One-off vehicles | nice | Fixed: vehicles stay drivable in free roam |
| B1 Gus is a speck | must-fix | Fixed: camera 1.2 m/0.45 m ground, 2.4 m flight; on-screen size pass mark |
| B2 Triangle budget / instancing | must-fix | Fixed: polycount per model, InstancedMesh, ≤300k/600k tris, ≤150 draws |
| B3 Quantization breaks code anim | must-fix | Fixed: no quantization; textures resized/WebP only |
| B4 solve() teleports | must-fix | Fixed: goToScheme fixtures + real-input solutions, 1/60 step, seeded RNG |
| B5 Fused parts | should-fix | Fixed: crow-fly, owl-fly; key-pose table; Gus proven first |
| B6 Audio memory | should-fix | Fixed: decode only current + next |
| B10+A4 Budget | should-fix | Fixed: $46.80 + $3.20 reserve = $50; drafts for simple props |
| A1 Mecha one model | must-fix | Fixed: Mecha assembled in code from the real parts |
| A2 Landmark texture/style | should-fix | Fixed: 2k textures for Bethesda/Belvedere; bridges in code; one material rule |
| A3 NPC pigeons = Gus clones | should-fix | Fixed: pigeon-plain + pigeon-plain-fly |
| A5 Missing asset lines | should-fix | Fixed: all listed with tool |
| A6 Rat/turtle text route | should-fix | Fixed: concept pictures; portraits from each character's own concept |
| A7 Missing sounds | should-fix | Fixed: 66 effects incl. species voices |
| A8 Too few music tracks | should-fix | Fixed: 10 tracks incl. stealth, race, 2nd day |
| A9 Gus concept views | should-fix | Fixed: views specified + back view |
| A10 Sky ratio | nice | Fixed: code sky + nanogen cloud/skyline bands |
| Refiner: scheme logic gaps | — | Fixed: Legs via Biscuit; Wings via crow-traded RC remote |

Converged? No (must-fix findings were found) → round 2.

## Round 2 (2026-11-13)

Reviewers: Player, Builder, Art & sound director (fresh agents). 30 findings (4 must-fix), merged to 26. Full findings: .gamegen/review/r2-*.md

| Finding | Severity | Outcome |
|---|---|---|
| P1 No driving controls | must-fix | Fixed: Driving controls for keyboard/touch/pad, per-vehicle camera and speed, ice sliding |
| P2 Puzzles show answers | must-fix | Fixed: world clues only; Board = goal + obstacle; Elders give answers; alternative solutions |
| P3 Stick edge drains stamina | should-fix | Fixed: edge = ground sprint only; air boost on Shift / double-tap Flap / L3 |
| P4 Crumb economy numbers | should-fix | Fixed: payouts, permanent-sign income, prices for trades/feasts/Feather Up |
| P5+B4 Body vs nap rule | should-fix | Fixed: one nap rule; Vinnie "fed up" flag persists |
| P6 Owl stealth gate | should-fix | Fixed: moss checkpoints, slow meter, readable leaves, hint + flock decoy after 2nd catch |
| P7 Collisions in flight | should-fix | Fixed: soft canopies, glancing walls, no scenery damage, no fall damage |
| P8 Clue readability | should-fix | Fixed: big tells, ≥12 px at 60 m, compass ping |
| P9 Scheme length | nice | Fixed: 3–6 min per scheme |
| P10 Whistle vs Coo | nice | Fixed: tap gathers; hold swarms or sends to highlighted target |
| B1 Tree culling | must-fix | Fixed: per-cell InstancedMesh, far blobs, near shadow casters |
| B2 Deterministic replays | must-fix | Fixed: gameplay data in layout.js, ready(), game-time timers |
| B3 Fixtures path | should-fix | Fixed: game/data/fixtures |
| B4 Schemes underspecified | should-fix | Fixed: 27-scheme step table; engine prop; Grate Fetch; ice/race/stealth data; graph walk, no dead states |
| B5+A4 Raccoon | should-fix | Fixed: raccoon-stand + raccoon-scurry pose models; no rig |
| B6+A3 Mecha scale/texture | should-fix | Fixed: 3.5 m workshop build + BIGGIFY to 18 m; cart at 2k |
| B7 Light recompiles | should-fix | Fixed: fixed light set, intensity only, emissive city |
| B8 Path z-fighting | should-fix | Fixed: paths in terrain material; far layer own pass |
| B9 Esc under pointer lock | nice | Fixed: lock loss opens pause |
| B10+A9 throw/point clips | nice | Fixed: ids pinned (throw 389, scold 311, stomp 26); no point |
| A1 Environment style line | should-fix | Fixed: environment line, key-art reference, facade scale |
| A2 Night art | should-fix | Fixed: window masks, night skyline, lit ESB crown, headlamp spot |
| A5 Missing sounds | should-fix | Fixed: organ, fountain, waterfall, busker, shutter, choir, ooh, stinger |
| A6 Ducks fly in | should-fix | Fixed: ducks pop up from water |
| A7 Gus models match | should-fix | Fixed: same polycount/texture; side-by-side check |
| A8 Role props | should-fix | Fixed: code accessories per role; kid clone |
| A10 Finale music etc. | nice | Fixed: 150 s finale, stinger, voice pick, crop rules |

Open after round 2 (noted, not blocking): throw clip 389 may read as a slam (fallbacks listed); "≥2 open schemes" softened to "never a dead end"; imagegen2 medium price unmeasured (budgeted at high).

Converged? Round limit (2) reached. All must-fix findings were fixed in this round; final faithfulness check done by gamegen against the brief checklist.

## Round 3 (2026-11-14), after the person-driven rework

The design was restructured from the person's feedback (requests #2–#13: crews and crowds, cats/horses/songbirds/geese, NYC life, pizza slices, five parallel threads, casual-but-clever, desktop-first, the Zamboni "Rink Job", $100 budget, Dove, pigeon morphs). Fresh Player, Builder and Art & sound reviews: 26 findings (5 must-fix). Full findings: .gamegen/review/r3-*.md.

| Finding | Severity | Outcome |
|---|---|---|
| P1 Crumbs = standing by a sign | should-fix | Fixed: flips leave crumb piles; feasts 30/40/60 |
| P2 Empty lanes at Board intro | should-fix | Fixed: lanes appear as their first card opens; den-cats opens after the Prologue |
| P3 Lost & Found fetch | should-fix | Fixed: a twist per trade |
| P4 Rink Job not set up | should-fix | Fixed: Ringo's slush demo, kids' bump, chevrons |
| P5 Rink Job cleanup chore | should-fix | Fixed: part arrives in the showpiece tag; hoovering optional |
| P6 Availability rules | should-fix | Fixed: fewer rules, one water rule |
| P7 Wedding Mimic | nice | Fixed: wrong-tool line |
| P8 Finale climb | nice | Fixed: ~50 s with 3 crew beats |
| P9 Wallpaper regulars | nice | Fixed: a star-turn regular per crew; boss gimmicks |
| B1 Tree budget | must-fix | Fixed: nearest-N tree pools per preset |
| B2 Solutions can't be authored | must-fix | Fixed: autopilot recording real inputs; per-step fixtures; sim-only step() |
| B3 Nap dead states | must-fix | Fixed: nap rule per object; persistent flags; nap-between-steps checked |
| B4 Scheme check violations | should-fix | Fixed |
| B5 Launch spec | should-fix | Fixed: lane box, heading rule, deterministic arc |
| B6 Meshy headroom | should-fix | Fixed: free morph fallback; retries itemised; --max-credits |
| B7 Medium perf | should-fix | Fixed: Medium preset lighter; caps measured; manual fps check |
| B8 Neck stretching | should-fix | Fixed: two-pivot necks; goose-bully + night-heron extras |
| B9 STATUS stale | nice | Fixed by gamegen |
| A1 Cards are the portraits | must-fix | Fixed |
| A2 Prickett/Walter models | must-fix | Fixed: A-pose Prickett; Walter own character |
| A3 Concept sources | should-fix | Fixed: column per model |
| A4 Pigeon morphs | should-fix | Fixed: 13 layers from the cards |
| A5 Dogs, owlets, accessories | should-fix | Fixed: extras in priority order; "Who wears what" table |
| A6 Meshy credit limit | should-fix | Fixed: tiered credit plan (now vs Dec 1 reset / top-up) |
| A7 Bride, skaters | should-fix | Fixed: rigged bride; skate glide in code |
| A8 Missing sounds | should-fix | Fixed: 9 more |
| A9 Gus in the flock | nice | Fixed: rim light; no blue-bar near Gus |

Converged: no must-fix remains. Open for the person: reserve size, Meshy top-up vs Dec 1 reset, rim light vs scarf.

## Change review: fix #8 #16 #19 #23 (2026-11-22, one round)
Player + Builder on design/changes/fix-8-16-19-23.md. Must-fix:
- #8 the controller can't complete a link-mode send (no user gesture): be honest on the controller path.
- Give must not eat scheme hand-ins.
- Drop must not delete the slice (the griddle route).
- Give on any item creates dead ends: slices only.
- #8 the softlock is input.js:162, and vendor/gh-feedback.js must be re-copied unchanged.
Should-fix:
- Any-cart rewarming flattens the puzzle: narrowed to hover-warm at the halal griddles.
- Vinnie's cart excluded.
- Label wording plus the suffix bug.
- #16: the guard's reason as a toast at Gus.
- Quest items float back.
- Non-blocking cues only.
- Anchovy as a second texture.
- Refill timer on every way of losing the slice.
- New check-schemes rule.
- repairSpent extension.
Nice-to-have, kept: Pickles gives way quickly on a retry; extra report choices. All adopted (see the plan's decisions).

## Change review: batch 2 (2026-11-22, one round)
Player + Builder on design/changes/batch-2.md. Must-fix:
- Hop must not delay or swallow takeoffs, and only from ordinary ground.
- Hop can't be replay-safe with a release threshold (every recorded takeoff is a 3–4 frame tap) → legacy takeoff for old recordings.
Should-fix:
- Touch double-tap = Boost.
- Landing abruptness is a 0.9 m snap → render-side ease.
- Jitter is the stale camera in frameUi, not rounding.
- Accessories share a cause: per-species unit and guessed anchors.
- #22 is a crowd horse next to Dapple.
- Open sky must be telegraphed and cancellable, cool a hot slice, use a fixed distance, and stay out of scenes and races.
- Flight hint rows and wording.
All adopted (see the decisions in batch-2.md).

## Change review: batch 3 (2026-11-22, one round)
Player + Builder on design/changes/batch-3.md. Must-fix:
- The water-surface rule (collision.js:139) and heightAt seeding put people and Gus on the lake bed.
- Data: people, birds, benches and three named characters in water.
- Crowd animals keep a fixed height; humans have no wall collision.
- Gus floating as a flag on walk mode, keeping the skim-bounce and the edge-as-wall.
- Replays: all 40 at the end.
Should-fix:
- Bridge deck steps at the ends.
- Fences are flat planes tiled twice.
- Dogs are unrigged, so a vertex-shader gait.
- Water talk reach.
Nice-to-have: a visible flock arrival.
All adopted (see the decisions in batch-3.md).

## Change review: photo mode #9 (2026-11-22, one round)
Player + Builder on design/changes/photo-mode.md. Must-fix:
- The proposed keys are taken (C = Dive, View = Map).
- Photo-mode controls weren't specified.
- Camera and film can't both be carried: film becomes a flag.
- "Open from the start" hijacks the Prologue's tracking: open after the Prologue, placed last.
- The route index is stale: refresh first.
Should-fix:
- Give each step a catch (photobomb the tourist; Flicker's portrait).
- A shiny payment clashes with the crows' fee: no shinies.
- Flicker is out in every phase.
- "Call the crew".
- Phone Share and full-resolution capture.
- Reuse an existing fire-escape perch (no new collider).
- Photo mode as a menu, with a collision-safe orbit and world updates while paused.
- Capture without preserveDrawingBuffer.
- IndexedDB eviction and quota.
- Flicker placed away from routes.
- No Nest step.
All adopted (see the decisions in photo-mode.md).
