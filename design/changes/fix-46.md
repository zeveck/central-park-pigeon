# Fix #46: 15 more park people, so the park isn't clones (2026-11-25)

Before: 18 human models, and `human-park` was 46 of the park's people (its 14 roles plus the ambient extras); a
Bethesda crowd was three identical tourists in a row. After: 33 models; `human-park` is down to 3 (the Tavern waiter,
one sunbather, one picnicker), and no model is more than ~10% of the crowd.

## The 15 people

Concept pictures by imagegen2 (same style line, A-pose block and references as the 2026-11-14 batch:
`.gamegen/candidates/people-46/concepts/`, sheet `_sheet.jpg`), then `meshgen character` (Meshy, 9k triangles, 1024
texture, idle + free walk/run + role clips). Every concept and every preview sheet was looked at; all accepted first
time, no retakes. Details per model (clips, action ids, sizes) in design/ASSETS.md.

| Model | Who | Height | Role clips |
|---|---|---|---|
| human-nanny | Black Caribbean woman, 40s, plum puffer | 1.68 | wave, chat |
| human-taichi-elder | East Asian woman, 70s, quilted jacket | 1.56 | taichi (loops), look |
| human-old-man | white man, 70s, flat cap, waxed jacket | 1.70 | sit, wave |
| human-street-musician | Black man, 30s, locs, denim jacket | 1.84 | sway (loops), bow |
| human-cyclist | Latina woman, 20s, hi-vis, helmet | 1.68 | wave |
| human-construction | Latino man, 50s, hard hat, hi-vis vest | 1.78 | pickup, scold |
| human-student | South Asian student, 19, backpack | 1.62 | sit, phone |
| human-runner | white man, 30s, grey hoodie | 1.80 | jog, catch-breath |
| human-newspaper-man | Middle Eastern man, 50s, peacoat | 1.75 | sit, think |
| human-shopper | East Asian woman, 30s, trench coat | 1.66 | sit, wave |
| human-scooter-kid | Black girl, ~8, yellow raincoat | 1.25 | cheer, jump |
| human-painter | white woman, 60s, smock, red beret | 1.60 | look, sit |
| human-photographer | East Asian man, 20s, camera on a strap | 1.72 | photo, gawk, cheer |
| human-delivery | South Asian man, 30s, red rain jacket | 1.72 | call |
| human-dog-sitter | white woman, 20s, ginger, orange fleece | 1.70 | pulled, pickup |

8 women or girls, 7 men. Props that need their own models (stroller, easel, scooter, bike, bags, newspaper) were left
out; the roles' code accessories still apply (sax, guitar, selfie phone, delivery box, slices, corsages).

## Cost

| | |
|---|---|
| Meshy | 657 credits ≈ $13.14 (13 × 44, 2 × 41, +3 for the photographer's cheer clip); balance 841 → 184 |
| imagegen2 | 15 concept pictures ≈ $0.90 |
| **Total** | **≈ $14.04** (cash ≈ $0.90; the Meshy credits were prepaid) |

## Download size

15 GLBs, 73.3 MiB from Meshy → **20.7 MiB (21.7 MB)** after `tools/optimize-assets.mjs` (1024 WebP q88, no
quantization), 1.20–1.58 MiB each, the same pipeline and the same range as the 2026-11-14 batch. A bit over the issue's
~19 MB estimate. The weight is the skinned mesh (~16k vertices after UV seams, ~0.85 MB, unquantized because
quantization breaks the shader pivots in three r186); a lossless keyframe resample was tried and saves only ~2%, so it
was left out. Textures are one 1024 WebP each (0.2–0.3 MB). The service worker list is built at deploy by
`tools/stamp-sw.mjs` walking `game/`, so the new files are picked up with no change; the model registry reads
`assets/models/manifest.json` (regenerated, 116 models).

## Wiring (model swaps only: no seed, position, count or phase changed)

`data/people.js` (each spec's model list is picked by the agent's index, never a random stream) and
`entities/humans.js` (MODELS, `MODEL_HAS`, `DEFAULT_FLAVOUR`, `LOOPS`, a per-model kid scale). Named roles with a
portrait (Vinnie, Dolores, Walter, Prickett, the rangers) and the wedding's bride, groom and planner keep their models.

| Slot | Before | After |
|---|---|---|
| selfie tourist (the Plaza; "he", sunglasses up) | park | runner |
| sidewalk artist (the Mall; "she", beret) | park | painter (beret modelled) |
| busker, Bethesda (sax) / Strawberry Fields (guitar) | park / park | street-musician / old-man |
| Boathouse picnicker | park | painter |
| wedding photographer ("he") | park | photographer (+ a cheer clip the wedding plays) |
| Gapstow selfie | park | student |
| slice eaters ×3 (seated) | park | newspaper-man, student, old-man |
| Reservoir joggers | park, jogger | runner, jogger |
| kids (Zoo gate, Conservatory Water) | child, park | child, scooter-kid |
| East Drive cyclist ("he", box) | vendor | delivery |
| foreman / workers (hard hat) | vendor | construction / construction, vendor |
| mixed crowds (walkers, tourists, Mall, city, sitters, guests) | 5–8 entries, park 1–2 each | 4–14 entries over 25 models |
| ambient extras (chess, kibitzers, runners, tourists, commuters, halal line, dog walkers, kids, Mall strollers, wedding guests) | park in 13 of 20 lists | park in none; the new models spread so neighbours differ |

Every sitter has a sit clip. Kid roles shrink adult models to 0.62 as before; the child models have their own scale
(child 0.88, scooter-kid 0.92). `human-park` no longer pre-builds a full pool at boot (it was `total` clones, now 2 and
grows to 8 on demand like the others).

Spread (people in PEOPLE + AMBIENT): before park 46, tourist 29, businessperson 23, chess-player 23, birder 15;
after tourist 20, businessperson 17, birder 13, chess-player 11, old-man 10, everyone else ≤ 8.

## Proof

**Crowd shots** (design/screenshots/fix-46/{before,after}/crowd-*.png: the den-meermob fixture, Afternoon, a fixed
camera per spot, taken with a small Playwright script in the session scratchpad; plus the perf-probe views
`<spot>-afternoon-high.png`; design/screenshots is gitignored, so they are local to this checkout). Distinct models among the people drawn:

| Spot | Before | After |
|---|---|---|
| the Mall | 24 drawn, 8 models (tourist ×8, park ×4, chess-player ×3, businessperson ×3) | 24 drawn, 13 models (tourist ×5, nothing else over 2) |
| Bethesda terrace | 14 drawn, 6 models (tourist ×4, park ×4: three identical tourists in a row by the steps) | 14 drawn, 10–11 models (nothing over 2) |
| Columbus Circle / Central Park South | 9 drawn, 4 models (businessperson ×4, park ×2) | 9 drawn, 5 models |
| Grand Army Plaza | 4 drawn, 4 models | 4 drawn, 4 models (the selfie tourist: park → runner) |

Looked at every shot: the new people stand on the ground (terrace, paths, sidewalks), walk with their walk clip, sit
on their seats; nobody floats, sinks, T-poses or slides. No console errors.

**Perf** (`game/tools/perf-probe.mjs`, den-meermob, Afternoon; tris / draw calls for the whole frame; caps High 1.2M/300,
Medium 800k/220, Low 300k/150). After equals before within 1k triangles and 1 draw everywhere (each person was
already its own skinned draw; the LOD is built per model at load):

| Spot | High before → after | Medium before → after | Low before → after |
|---|---|---|---|
| the Mall | 1135k/224 → 1135k/223 | 724k/191 → 725k/191 | 268k/100 → 268k/100 |
| Bethesda | 1085k/241 → 1085k/241 | 745k/202 → 745k/202 | 296k/127 → 296k/127 (governor 0.51 both) |
| Columbus | 826k/208 → 826k/208 | 586k/138 → 586k/138 | 207k/77 → 207k/77 |
| Grand Army Plaza | 432k/119 → 432k/119 | 267k/101 → 267k/101 | 127k/70 → 127k/70 |
| Bow Bridge | 1175k/269 → 1175k/269 (governor 0.54 both) | 748k/218 → 748k/218 | 299k/125 → 299k/125 (governor 0.2 both) |
| Sheep Meadow | 964k/228 → 964k/228 | 666k/191 → 665k/191 | 253k/91 → 252k/91 |

All inside the caps.

**Replays** (raw inputs, `game/tools/sf-run.mjs replay`, autopilot off) of four solutions that pass the swapped
crowds: part-power (the wedding: photographer, guests, Bow Bridge crowds), gear-sunglasses (the selfie tourist at the
Plaza), den-choir (FEED signs: the feeders that the swap touched come to the sign) and the finale. All four complete,
end where they were recorded (same x, z, crumbs, flock; the end time is the recorded one + 4 s, the tool's settle), no
console errors. `node game/tools/check-schemes.mjs`: all checks pass.

**Not changed by this fix, noted:** the triangle governor sits below 1 at Bow Bridge (High 0.54, Low 0.2) and at
Bethesda on Low (0.51) with this fixture, the same before and after; perf.md recorded 1 there.
