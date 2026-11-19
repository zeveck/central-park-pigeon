# Perf pass: every preset inside its caps

The rendering budget (GAME_DESIGN.md, Tech plan → "Rendering budget") caps a frame, shadow pass included, at
**1.2M triangles / 300 draw calls on High, 800k / 220 on Medium and 300k / 150 on Low**. Before this pass every
busy spot was over the caps (High 1.4–1.6M triangles and 360–470 draws), so the triangle governor in
`main.js render()` sat at its 0.2 floor and squeezed people and named animals out (a temporary `PEOPLE_FLOOR`
kept 8 / 6 / 3 people drawn). About a quarter of the triangles and a third of the draws were one bug: every
named animal that was out drew everywhere.

After it, every measured spot is inside the caps on every preset, day and night, and the governor sits at 1
everywhere (people, named animals and crowds at their intended counts). The world alone (everything but people,
named animals and crowds) now takes about 50–65% of High's triangle cap, 55–70% of Medium's and 55–75% of Low's,
and 40–70% of the draw calls.

## How it was measured

- `node game/tools/perf-probe.mjs --preset high|medium|low --phases afternoon,night [--shots dir]` boots the game
  headless (one browser, `taskset -c 0-2`, port 8171), loads the `den-meermob` fixture (a late game: most crews,
  the wedding party out at Bow Bridge), sets the phase, puts Gus at each spot with `__game.goTo`, steps 40 fixed
  updates with a render every 4 (so the tree, prop, crowd, people and named-animal pools and the governor settle),
  then measures. Same fixture, same inputs, same frames: before and after are comparable.
- `game/src/debug/perf.js` (debug only, never imported by the game) wraps `renderer.renderBufferDirect` for one
  `G.render()` and buckets every draw call and its triangles by pass (far layer, main, shadow) and by what drew it
  (the top-level group under the mirrored world root, refined for trees, static, terrain, props and the far layer).
  `drawsOff(G, true)` turns the GL draw calls into no-ops (three.js still culls, uploads and counts everything), so
  SwiftShader doesn't rasterise the settling frames; the screenshots are real renders of the canvas.
- Totals are `renderer.info` for the whole frame (far pass + main pass + shadow pass), exactly what the governor
  and `__game.state().renderer` see. "No shadow pass" is the same frame with `shadowMap.autoUpdate` off.
- Spots: Bethesda (the Terrace, from above the fountain), Wollman Rink, Columbus Circle, Bow Bridge (with the
  wedding party), the Ramble, Sheep Meadow, the Reservoir, Fifth Ave / 110th (street level), high over mid-park
  (95 m up), the finale stomp on Fifth Avenue and the ESB climb. Day = Afternoon, plus Night.
- Viewport 800 × 450 (16:9, the same frustum as 1080p; counts don't depend on resolution).
- Raw data: the JSON per preset (before/after) was kept in the session scratchpad; the tables below are generated
  from it. Screenshots: `design/screenshots/perf/before/` and `design/screenshots/perf/after/`, one per spot,
  phase and preset (`<spot>-<phase>-<preset>.png`).

## What was costing what (before)

The breakdown tables are at the end. The big items, High at Bow Bridge (1.64M / 471):

| Cost | Triangles | Draws | Why |
|---|---|---|---|
| Named animals | 352k | 131 | **a bug**: `c.root.visible = out && (near…)` is `undefined` (not `false`) for every animal that's out but far away, and three.js only skips `visible === false`. All 67 named animals drew everywhere, shadow pass too (High), frustum culling off. |
| Trees | 514k | 21 | 120 full trees × 2.4k, 400 LOD trees × 570, blobs; zero-scaled blob instances (trees moved to a pool) still counted their triangles |
| People | 197k | 48 | 9.3k-triangle rigged humans, no LOD |
| Far layer | 118k | 7 | the far canopy and Manhattan filler as two un-culled meshes, drawn again under the main pass's own trees and city |
| Flock | 75k | 2 | 24 birds × 1,560, cast shadows |
| Static batch | 38k | 74 | ~13 materials × each 256 m cell, ~25 shadow draws (one per material and cell) |
| Workshop | 3k | 38 | the room 46 m under the Ramble: frustum culling can't tell it's underground |
| Songbird ring, geese wedge | 33k | 2 | `frustumCulled = false` instanced flocks drawn from anywhere |
| Golden pretzels | 17k | 1 | 20 × 864 triangles, drawn park-wide |

Low was dominated by the same named-animal bug (174k of a 300k cap) plus the landmark GLBs (60k at Bethesda),
the far layer (55k), the flock (37k), the static batch (27 draws) and the finale stomp (385k on its own).

## Before and after

Triangles / draw calls for the whole frame (far layer + main pass + shadow pass), the governor's scale after
settling (1 = people, named animals and crowds at their intended counts), and what was drawn after. ⚠ = over a cap.
People at night: the park's people go home after dark (data/people.js), so night frames have none.

### High (cap 1200k triangles / 300 draws, shadow pass included)

| Spot | Phase | Before: tris / draws | governor | After: tris / draws | no shadow pass | governor | people (anim+frozen) · named · crowd full/LOD |
|---|---|---|---|---|---|---|---|
| Bethesda | day | 1525k / 419 ⚠ | 0.2 | **998k / 237** | 839k / 197 | 1 | 25+3 · 12 · 0/77 |
| Wollman Rink | day | 1417k / 421 ⚠ | 0.2 | **839k / 201** | 715k / 160 | 1 | 15+0 · 0 · 0/5 |
| Columbus Circle | day | 1344k / 363 ⚠ | 0.2 | **744k / 178** | 627k / 143 | 1 | 9+0 · 3 · 2/0 |
| Bow Bridge | day | 1637k / 471 ⚠ | 0.2 | **1060k / 271** | 877k / 211 | 1 | 20+0 · 12 · 8/83 |
| The Ramble | day | 1505k / 396 ⚠ | 0.2 | **1005k / 225** | 753k / 175 | 1 | 2+0 · 19 · 13/58 |
| Sheep Meadow | day | 1474k / 410 ⚠ | 0.2 | **873k / 197** | 728k / 166 | 1 | 15+0 · 2 · 6/12 |
| Reservoir | day | 1206k / 312 ⚠ | 0.2 | **647k / 157** | 554k / 128 | 1 | 0+0 · 4 · 0/10 |
| Fifth Ave / 110th | day | 1373k / 316 ⚠ | 0.2 | **743k / 156** | 655k / 134 | 1 | 0+0 · 1 · 0/23 |
| High over mid-park | day | 1159k / 281 | 0.538 | **698k / 150** | 605k / 126 | 1 | 0+0 · 20 · 0/0 |
| Finale: the Stomp | finale | 962k / 268 | 1 | **897k / 240** | 727k / 182 | 1 | 0+0 · 3 · 4/5 |
| Finale: the climb | finale | 145k / 74 | 1 | **145k / 74** | 145k / 74 | 1 | 0+0 · 3 · 0/0 |
| Bethesda | night | 1210k / 326 ⚠ | 0.2 | **802k / 173** | 671k / 142 | 1 | 0+0 · 4 · 0/11 |
| Wollman Rink | night | 1193k / 369 ⚠ | 0.2 | **711k / 199** | 615k / 158 | 1 | 0+0 · 0 · 0/0 |
| Columbus Circle | night | 1086k / 286 | 1 | **667k / 157** | 581k / 130 | 1 | 0+0 · 2 · 2/0 |
| Bow Bridge | night | 1281k / 376 ⚠ | 0.2 | **821k / 193** | 682k / 163 | 1 | 0+0 · 4 · 0/12 |
| The Ramble | night | 1302k / 318 ⚠ | 0.2 | **861k / 181** | 660k / 143 | 1 | 0+0 · 6 · 7/18 |
| Sheep Meadow | night | 1206k / 331 ⚠ | 0.2 | **732k / 164** | 633k / 141 | 1 | 0+0 · 0 · 0/0 |
| Reservoir | night | 1057k / 252 | 1 | **636k / 145** | 546k / 117 | 1 | 0+0 · 4 · 0/0 |
| Fifth Ave / 110th | night | 1222k / 259 ⚠ | 0.2 | **732k / 151** | 647k / 130 | 1 | 0+0 · 1 · 0/5 |
| High over mid-park | night | 1036k / 236 | 1 | **657k / 134** | 556k / 110 | 1 | 0+0 · 4 · 0/0 |

### Medium (cap 800k triangles / 220 draws, shadow pass included)

| Spot | Phase | Before: tris / draws | governor | After: tris / draws | no shadow pass | governor | people (anim+frozen) · named · crowd full/LOD |
|---|---|---|---|---|---|---|---|
| Bethesda | day | 1173k / 333 ⚠ | 0.2 | **662k / 196** | 597k / 174 | 1 | 21+4 · 8 · 0/49 |
| Wollman Rink | day | 1014k / 289 ⚠ | 0.2 | **535k / 165** | 467k / 127 | 1 | 11+0 · 0 · 0/1 |
| Columbus Circle | day | 971k / 238 ⚠ | 0.2 | **508k / 131** | 462k / 111 | 1 | 7+0 · 3 · 0/2 |
| Bow Bridge | day | 1222k / 370 ⚠ | 0.2 | **641k / 217** | 576k / 182 | 1 | 17+0 · 8 · 4/67 |
| The Ramble | day | 1100k / 293 ⚠ | 0.2 | **667k / 180** | 561k / 153 | 1 | 2+0 · 11 · 10/53 |
| Sheep Meadow | day | 1062k / 323 ⚠ | 0.2 | **574k / 161** | 507k / 137 | 1 | 9+0 · 2 · 5/13 |
| Reservoir | day | 841k / 216 ⚠ | 0.2 | **462k / 117** | 423k / 98 | 1 | 0+0 · 4 · 0/7 |
| Fifth Ave / 110th | day | 928k / 234 ⚠ | 0.2 | **472k / 136** | 428k / 117 | 1 | 0+0 · 0 · 0/14 |
| High over mid-park | day | 829k / 206 ⚠ | 0.2 | **486k / 121** | 453k / 105 | 1 | 0+0 · 11 · 0/0 |
| Finale: the Stomp | finale | 910k / 258 ⚠ | 0.2 | **628k / 205** | 574k / 173 | 1 | 0+0 · 2 · 4/4 |
| Finale: the climb | finale | 145k / 74 | 1 | **102k / 74** | 102k / 74 | 1 | 0+0 · 0 · 0/0 |
| Bethesda | night | 957k / 274 ⚠ | 0.2 | **550k / 151** | 485k / 130 | 1 | 0+0 · 4 · 0/6 |
| Wollman Rink | night | 873k / 260 ⚠ | 0.2 | **473k / 166** | 419k / 129 | 1 | 0+0 · 0 · 0/0 |
| Columbus Circle | night | 819k / 204 ⚠ | 0.2 | **457k / 118** | 421k / 100 | 1 | 0+0 · 2 · 0/2 |
| Bow Bridge | night | 976k / 315 ⚠ | 0.2 | **536k / 164** | 473k / 142 | 1 | 0+0 · 0 · 0/8 |
| The Ramble | night | 998k / 258 ⚠ | 0.2 | **591k / 152** | 486k / 127 | 1 | 0+0 · 0 · 6/19 |
| Sheep Meadow | night | 908k / 266 ⚠ | 0.2 | **497k / 143** | 437k / 122 | 1 | 0+0 · 0 · 0/0 |
| Reservoir | night | 758k / 180 | 0.328 | **448k / 105** | 416k / 88 | 1 | 0+0 · 4 · 0/0 |
| Fifth Ave / 110th | night | 849k / 201 ⚠ | 0.2 | **463k / 131** | 422k / 113 | 1 | 0+0 · 0 · 0/0 |
| High over mid-park | night | 775k / 182 | 0.512 | **461k / 111** | 422k / 94 | 1 | 0+0 · 0 · 0/0 |

### Low (cap 300k triangles / 150 draws, shadow pass included)

| Spot | Phase | Before: tris / draws | governor | After: tris / draws | no shadow pass | governor | people (anim+frozen) · named · crowd full/LOD |
|---|---|---|---|---|---|---|---|
| Bethesda | day | 587k / 258 ⚠ | 0.2 | **272k / 123** | 263k / 117 | 1 | 12+0 · 4 · 0/4 |
| Wollman Rink | day | 477k / 182 ⚠ | 0.2 | **226k / 102** | 201k / 81 | 1 | 6+0 · 0 · 0/1 |
| Columbus Circle | day | 458k / 168 ⚠ | 0.2 | **189k / 77** | 171k / 70 | 1 | 3+0 · 0 · 0/2 |
| Bow Bridge | day | 638k / 286 ⚠ | 0.2 | **284k / 130** | 270k / 123 | 1 | 14+0 · 2 · 3/23 |
| The Ramble | day | 522k / 225 ⚠ | 0.2 | **236k / 114** | 219k / 105 | 1 | 2+0 · 3 · 2/24 |
| Sheep Meadow | day | 510k / 177 ⚠ | 0.2 | **230k / 85** | 212k / 78 | 1 | 3+0 · 0 · 2/15 |
| Reservoir | day | 413k / 154 ⚠ | 0.2 | **177k / 79** | 166k / 73 | 1 | 0+0 · 4 · 0/1 |
| Fifth Ave / 110th | day | 438k / 167 ⚠ | 0.2 | **189k / 79** | 171k / 72 | 1 | 0+0 · 0 · 0/0 |
| High over mid-park | day | 412k / 156 ⚠ | 0.2 | **163k / 75** | 156k / 70 | 1 | 0+0 · 1 · 0/0 |
| Finale: the Stomp | finale | 609k / 213 ⚠ | 0.2 | **275k / 147** | 261k / 144 | 1 | 0+0 · 0 · 4/1 |
| Finale: the climb | finale | 145k / 74 | 1 | **102k / 74** | 102k / 74 | 1 | 0+0 · 0 · 0/0 |
| Bethesda | night | 430k / 208 ⚠ | 0.2 | **230k / 103** | 222k / 97 | 1 | 0+0 · 4 · 0/0 |
| Wollman Rink | night | 379k / 171 ⚠ | 0.2 | **206k / 111** | 182k / 88 | 1 | 0+0 · 0 · 0/0 |
| Columbus Circle | night | 357k / 142 ⚠ | 0.2 | **175k / 74** | 158k / 67 | 1 | 0+0 · 0 · 0/2 |
| Bow Bridge | night | 483k / 250 ⚠ | 0.2 | **233k / 114** | 219k / 109 | 1 | 0+0 · 0 · 0/1 |
| The Ramble | night | 431k / 196 ⚠ | 0.2 | **214k / 107** | 197k / 98 | 1 | 0+0 · 0 · 3/5 |
| Sheep Meadow | night | 403k / 148 ⚠ | 0.2 | **202k / 78** | 185k / 71 | 1 | 0+0 · 0 · 0/0 |
| Reservoir | night | 336k / 125 ⚠ | 0.2 | **170k / 73** | 163k / 68 | 1 | 0+0 · 4 · 0/0 |
| Fifth Ave / 110th | night | 369k / 144 ⚠ | 0.2 | **189k / 79** | 171k / 72 | 1 | 0+0 · 0 · 0/0 |
| High over mid-park | night | 342k / 133 ⚠ | 0.2 | **162k / 74** | 155k / 69 | 1 | 0+0 · 0 · 0/0 |


### The world alone (everything but people, named animals and crowds), day

| Preset (cap) | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park |
|---|---|---|---|---|---|---|---|---|---|
| High before (1200k / 300) | 986k / 251 | 980k / 282 | 875k / 215 | 1026k / 274 | 1061k / 244 | 989k / 258 | 853k / 186 | 1016k / 193 | 810k / 159 |
| High **after** (1200k / 300) | 763k / 163 | 707k / 180 | 656k / 148 | 743k / 172 | 787k / 171 | 724k / 168 | 617k / 141 | 728k / 149 | 621k / 124 |
| Medium before (800k / 220) | 832k / 234 | 772k / 214 | 718k / 167 | 848k / 253 | 868k / 218 | 799k / 237 | 665k / 154 | 749k / 171 | 654k / 143 |
| Medium **after** (800k / 220) | 528k / 146 | 473k / 150 | 458k / 114 | 513k / 156 | 558k / 150 | 490k / 144 | 447k / 110 | 466k / 132 | 455k / 110 |
| Low before (300k / 150) | 327k / 179 | 273k / 118 | 256k / 104 | 351k / 191 | 320k / 158 | 297k / 109 | 239k / 94 | 265k / 108 | 239k / 97 |
| Low **after** (300k / 150) | 218k / 104 | 204k / 94 | 178k / 72 | 214k / 106 | 202k / 104 | 201k / 78 | 164k / 74 | 189k / 79 | 162k / 74 |


## What changed

Everything is render-only: no gameplay code reads any of it (visibility, LOD, culling, pool sizes). The one place
gameplay-adjacent code read a visibility flag (`scarves.js`: a crew member "near and visible" comments on a new
scarf, a speech bubble only) now asks `G.chars.out(q)` instead.

**Bugs (the biggest win)**
- `entities/characters.js`: named animals' visibility is a real boolean (was `undefined` → drawn everywhere).
  Also `entities/street.js` (the van) and `systems/clues.js` (clue tells), same pattern.
- `schemes/_sf-common.js` `birds()`: instanced flocks (songbird ring, geese march, the wedding wedge) get a
  bounding sphere round the birds set since the last commit, instead of `frustumCulled = false`.
- `systems/workshop.js`: the underground room's meshes are hidden unless the camera is within 40 m of it (never
  its lamps: hiding a light would recompile every shader).

**Trees** (`world/trees.js`, `presets.js`)
- A "mid" pool between full and LOD: the full GLB simplified to ~60% at load. High draws 36 full + 84 mid
  (the old 120 "full"), Medium 24 + 40. The LOD GLB is simplified to ~60% (~350 triangles); High 320 LOD trees,
  Medium 160 (was 400 / 300). Low unchanged (30 / 150, its LOD is the code stand-in).
- Blob cells pack and count only the trees not in a pool (a zero-scaled instance still costs its triangles), and
  cells past ~170 m use the 20-triangle blob.
- The near shadow casters are shadow-only (`gfx/shadow-only.js`); they used to cost a main-pass draw too.

**People** (`entities/humans.js`, `gfx/simplify.js`, `vendor/meshopt_simplifier.module.js`)
- A load-time LOD per model: meshoptimizer's simplifier with the UVs weighted as attributes in a permissive
  simplify (35% of the triangles, ~3k, no texture smearing across UV islands; a plain simplify stops at ~53%
  because every island border is a seam), sharing the vertex buffers and bound to each clone's own skeleton. Drawn
  past 24 / 16 / 9 m from the camera; accessories hidden past twice that. Two-part accessories are one
  vertex-coloured mesh (one draw). Leashed dogs cast shadows on High only.
- Low now draws the design's 6 animated people (it was held at 4 for the triangle cap).
- `PEOPLE_FLOOR` is 4 / 3 / 2 (was 8 / 6 / 3, set while the world alone was over the caps).

**Named animals** (`entities/characters.js`): on High only the nearest 6 cast shadows; accessories hidden past
40 / 26 / 14 m.

**Landmarks** (`world/landmarks.js` Streamer): each streamed GLB mesh over 1k triangles gets the same UV-aware
simplified LOD (35%), drawn past 80 / 55 / 35 m from the camera.

**Static batch** (`gfx/batch.js`, `main.js`)
- 512 m cells (was 256), offset so the park's centre line and Central Park South don't split them: half the
  draws per material.
- Shadows: the opaque, single-sided casters of each 256 m area draw into the shadow map as one merged,
  position-only, shadow-only proxy instead of one shadow draw per material and cell (alpha-tested rails and the
  double-sided canvas still cast from their own meshes).
- Low: the small textured materials (stone, dark stone, schist, pavers, gravel, hedge, plain brick, ice) are baked
  to a colour on the shared vertex-coloured `coded` material (`LOW_FLATTEN` in `gfx/materials.js`), so one draw
  per cell covers them. Facades keep their textures.

**Far layer** (`world/farlayer.js`)
- The far canopy and Manhattan filler are tiled (320 / 800 m on High, 640 / 1600 on Medium, 1200 / 1600 on Low)
  and a tile is skipped when it lies entirely inside the main camera's far distance (the main pass draws those
  trees and buildings again over a cleared depth buffer). Box bottoms dropped.
- Medium's filler reaches 540 m (was 720), Low's 340 (was 420); Low's far ground is a 16 m grid (was 8).

**Props** (`world/props.js`): lamp and bench stand-in cells are 256 m and pack only the instances outside the GLB
pool and within 300 / 220 / 120 m. Low pools 4 lamps / 3 benches (was 6 / 4).

**Small-detail culling** (`gfx/detail-cull.js`): every few frames, meshes in the mod groups, signs, items, rangers,
street and streamed landmarks whose bounding sphere is under about a pixel and a half (Low: ~4 px) are taken off
the camera's layer. It uses layers, not `visible`, so it never fights the code that shows and hides them.

**Golden pretzels** (`systems/collect.js`): cheaper geometry (432 triangles, was 864), packed, and drawn only
within 220 / 160 / 80 m of the camera. **Market board**: the 6-material box (6 draws) is a wood box + a painted
front plane.

**Flock** (`main.js`): shadows on High only (was High and Medium); Medium and Low draw a 60% index LOD of the bird
(same vertices, so the wingbeat and morph shaders are untouched); Low draws at most 14 birds (was 24).

**Shadows on Low**: signs, spike cones, taxis and the Mecha no longer cast (Low's design is "Gus and near props
only"). The Mecha keeps fewer, bigger casters on Medium.

**Finale stomp** (`finale/stomp.js`): Medium and Low draw a seeded share of the turnout and the big flock (60% /
20%); the 14 cabs cast shadows on High only; the mid tree pool is capped with the others while it walks.

**Terrain**: full-detail chunks within 130 / 85 / 15 m (was 130 / 100 / 60).

**Tooling**: `game/tools/perf-probe.mjs`, `game/src/debug/perf.js`.

## Breakdown by what's drawn

Per spot, day; main + far pass, with the shadow pass in brackets (triangles in thousands / draw calls).
Rows under ~1.5k triangles and two draws a spot are left out (the small mod meshes, particles).

#### Before: High, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trees (full/mid/LOD pools + blobs) | 501k/14 | 573k/18 (4k/3) | 469k/16 (1k/1) | 514k/18 (5k/3) | 491k/19 (35k/3) | 548k/16 (1k/2) | 471k/16 (2k/2) | 635k/17 (2k/2) | 407k/16 | 198k/15 (4k/2) | – |
| named animals | 176k/65 (174k/63) | 176k/69 (174k/59) | 176k/69 (174k/61) | 176k/65 (176k/66) | 176k/67 (177k/69) | 179k/78 (174k/59) | 174k/59 (175k/63) | 174k/59 (174k/59) | 175k/63 (174k/59) | – | – |
| far layer (ground, canopy, city) | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | – |
| the flock | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | – |
| people | 159k/26 (9k/3) | 76k/9 (9k/1) | 76k/10 (9k/2) | 187k/37 (10k/11) | 19k/2 (9k/1) | 76k/9 (9k/1) | – | – | – | – | – |
| terrain | 51k/17 | 47k/14 | 47k/13 | 66k/17 | 55k/15 | 51k/15 | 64k/16 | 37k/20 | 61k/15 | 39k/14 | – |
| finale (Mecha, turnout, doors) | 0k/7 | 0k/7 | – | 0k/7 | 0k/7 | 0k/7 | – | – | – | 302k/80 (83k/40) | – |
| static batch (city ring, code landmarks, walls) | 20k/46 (20k/26) | 24k/57 (17k/32) | 25k/58 (13k/29) | 21k/49 (18k/25) | 20k/49 (19k/30) | 24k/53 (21k/30) | 17k/43 (17k/29) | 22k/52 (13k/22) | 18k/44 (18k/24) | 18k/38 (16k/24) | – |
| lamps + benches | 22k/18 (2k/1) | 24k/17 (3k/2) | 32k/19 (10k/2) | 25k/18 (7k/2) | 44k/20 (25k/2) | 34k/18 (13k/2) | 13k/16 | 28k/20 (15k/2) | 17k/15 | 25k/15 (11k/2) | – |
| crowds | 21k/11 | 2k/1 | 17k/3 (17k/3) | 41k/14 (20k/4) | 42k/10 (21k/3) | 27k/3 (21k/2) | 4k/4 | 10k/5 | – | 10k/3 (8k/1) | – |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 60k/4 (19k/1) | 5k/2 | 12k/2 | 42k/3 (15k/1) | 18k/1 (34k/2) | 34k/3 | – | – | 18k/1 | – | – |
| collectibles (golden pretzels, strays) | 24k/2 (6k/1) | 17k/1 | 20k/3 (3k/1) | 20k/2 (3k/1) | 27k/2 (9k/1) | 17k/2 | 20k/2 (3k/1) | 20k/2 (3k/1) | 24k/2 (6k/1) | 20k/2 (3k/1) | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 145k/74 |
| water | 19k/4 | 5k/4 | 3k/2 | 19k/4 | 18k/3 | 4k/3 | 16k/7 | 19k/8 | 18k/3 | 16k/2 | – |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/6 (8k/10) | 0k/6 | 17k/6 (17k/6) | 16k/1 (17k/6) | 0k/5 | – | – | – | – | – |
| vehicles | 4k/1 (2k/1) | 9k/3 (6k/1) | 9k/3 | 4k/1 | 4k/1 | 9k/3 | 0k/0 (4k/1) | – | 4k/1 | 4k/1 | – |
| parked taxis | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | – |
| ranger carts | 4k/1 (4k/1) | 8k/2 | 8k/2 | 4k/1 | – | 4k/1 | 4k/1 | 4k/1 | – | – | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | 7k/8 | 4k/5 | 7k/8 | 7k/8 (1k/1) | 7k/8 | – | – | – | – | – |
| signs | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | – |
| spike sites | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| the Workshop (46 m underground) | 3k/38 | 3k/38 | – | 3k/38 | – | 3k/38 | – | – | – | – | – |
| clue tells and doors | 0k/3 (0k/3) | 1k/5 (0k/3) | 0k/3 (2k/1) | 2k/17 | 2k/18 | 0k/3 | 0k/8 | 0k/8 | – | 0k/0 (0k/1) | – |
| race rings | – | – | – | – | – | – | 4k/7 | – | – | – | – |
| the market (Wanted board, stall) | 0k/12 | 0k/10 | 0k/10 | 0k/10 | 0k/10 (0k/8) | 0k/10 | – | – | – | – | – |
| **total** | **1525k/419** | **1417k/421** | **1344k/363** | **1637k/471** | **1505k/396** | **1474k/410** | **1206k/312** | **1373k/316** | **1159k/281** | **962k/268** | **145k/74** |

#### Before: Medium, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trees (full/mid/LOD pools + blobs) | 372k/12 | 381k/16 (4k/3) | 337k/13 | 375k/15 (2k/2) | 348k/17 (26k/3) | 376k/14 (1k/2) | 317k/16 (2k/2) | 389k/15 (1k/2) | 272k/12 | 163k/14 (2k/1) | – |
| named animals | 174k/63 | 175k/66 | 174k/59 | 176k/65 | 175k/64 | 178k/75 | 174k/59 | 174k/59 | 175k/63 | – | – |
| far layer (ground, canopy, city) | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | 118k/7 | – |
| the flock | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | – |
| people | 140k/24 (9k/3) | 58k/7 (9k/1) | 57k/8 (9k/1) | 159k/34 (10k/8) | 19k/2 (9k/1) | 57k/7 (9k/1) | – | – | – | – | – |
| terrain | 45k/13 | 41k/10 | 47k/12 | 41k/13 | 51k/12 | 39k/11 | 45k/12 | 31k/16 | 49k/11 | 39k/14 | – |
| finale (Mecha, turnout, doors) | 0k/7 | – | – | 0k/7 | 0k/7 | 0k/7 | – | – | – | 302k/80 (83k/40) | – |
| static batch (city ring, code landmarks, walls) | 20k/45 (20k/24) | 24k/49 (17k/29) | 22k/51 (13k/25) | 19k/44 (18k/23) | 18k/42 (19k/28) | 22k/42 (21k/30) | 13k/36 (17k/27) | 18k/43 (12k/21) | 18k/42 (18k/23) | 18k/38 (15k/20) | – |
| lamps + benches | 19k/15 (2k/1) | 22k/15 (3k/2) | 27k/16 (10k/2) | 22k/14 (7k/2) | 42k/16 (25k/2) | 31k/14 (13k/2) | 10k/12 | 25k/16 (15k/2) | 14k/11 | 25k/15 (11k/2) | – |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 60k/4 (19k/1) | 5k/2 | 12k/2 | 42k/3 (15k/1) | 18k/1 (15k/1) | 34k/3 | – | – | 18k/1 | – | – |
| collectibles (golden pretzels, strays) | 20k/2 | 17k/1 | 20k/3 | 17k/1 | 24k/2 | 17k/2 | 20k/2 | 17k/1 | 24k/2 | 17k/1 | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 145k/74 |
| water | 19k/4 | 5k/3 | 3k/1 | 19k/4 | 18k/3 | 4k/3 | 15k/2 | 19k/8 | 18k/3 | 16k/2 | – |
| crowds | 17k/9 | 0k/1 | 13k/3 | 29k/10 | 30k/8 | 19k/3 | 3k/3 | 6k/4 | – | 10k/3 | – |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/6 (8k/10) | 0k/1 | 17k/6 (17k/6) | 16k/1 (16k/1) | 0k/5 | – | – | – | – | – |
| vehicles | 4k/1 | 9k/3 (6k/1) | 5k/1 | 4k/1 | 4k/1 | 9k/3 | 0k/0 (4k/1) | – | 4k/1 | 4k/1 | – |
| parked taxis | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | 4k/5 | – | 7k/8 | 7k/8 | 7k/8 | – | – | – | – | – |
| signs | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | – |
| ranger carts | 4k/1 | 8k/2 | 4k/1 | 4k/1 | – | 4k/1 | – | 4k/1 | – | – | – |
| spike sites | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| the Workshop (46 m underground) | 3k/38 | – | – | 3k/38 | – | 3k/38 | – | – | – | – | – |
| clue tells and doors | 0k/3 (0k/1) | 1k/5 (0k/3) | – | 2k/17 | 2k/18 | 0k/3 | – | 0k/8 | – | – | – |
| race rings | – | – | – | – | – | – | 4k/7 | – | – | – | – |
| the market (Wanted board, stall) | 0k/12 | 0k/10 | – | 0k/10 | 0k/10 (0k/8) | 0k/10 | – | – | – | – | – |
| **total** | **1173k/333** | **1014k/289** | **971k/238** | **1222k/370** | **1100k/293** | **1062k/323** | **841k/216** | **928k/234** | **829k/206** | **910k/258** | **145k/74** |

#### Before: Low, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| named animals | 174k/60 | 174k/59 | 174k/59 | 174k/60 | 174k/62 | 174k/62 | 174k/59 | 174k/59 | 174k/59 | – | – |
| far layer (ground, canopy, city) | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | 55k/7 | – |
| trees (full/mid/LOD pools + blobs) | 46k/13 | 53k/14 | 38k/14 | 47k/14 | 45k/15 | 48k/13 | 33k/15 | 62k/14 | 31k/15 | 27k/14 | – |
| finale (Mecha, turnout, doors) | 0k/7 | – | – | 0k/7 | 0k/7 | – | – | – | – | 302k/80 (83k/40) | – |
| the flock | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | 37k/1 | – |
| people | 84k/16 | 29k/4 | 28k/4 | 103k/25 (0k/3) | 19k/2 | 29k/4 | – | – | – | – | – |
| terrain | 33k/9 | 23k/6 | 23k/5 | 31k/7 | 18k/7 | 33k/7 | 33k/8 | 17k/10 | 25k/7 | 23k/7 | – |
| lamps + benches | 15k/11 (2k/1) | 11k/8 (3k/2) | 21k/12 (10k/2) | 20k/11 (7k/2) | 28k/12 (15k/2) | 24k/10 (12k/2) | 6k/8 | 19k/11 (13k/2) | 11k/7 | 23k/12 (11k/2) | – |
| collectibles (golden pretzels, strays) | 17k/1 | 17k/1 | 17k/1 | 17k/1 | 17k/1 | 17k/2 | 20k/2 | 17k/1 | 17k/1 | 17k/1 | – |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 60k/4 | 5k/1 | 12k/1 | 42k/3 | 18k/1 | 19k/2 | – | – | 18k/1 | – | – |
| static batch (city ring, code landmarks, walls) | 17k/27 | 19k/30 | 14k/31 | 16k/26 | 16k/29 | 19k/33 | 8k/19 | 16k/31 | 16k/28 | 16k/27 | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 145k/74 |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/1 (8k/10) | 0k/1 | 17k/6 (16k/1) | 16k/1 (16k/1) | – | – | – | – | – | – |
| parked taxis | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | – |
| water | 4k/3 | 1k/1 | – | 4k/3 | 3k/2 | 3k/1 | 15k/1 | 3k/2 | 3k/2 | 1k/1 | – |
| crowds | 2k/3 | 0k/1 | 1k/1 | 10k/7 | 10k/3 | 10k/2 | 0k/1 | – | – | 4k/3 | – |
| signs | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | – | – | 7k/8 | 7k/8 | – | – | – | – | – | – |
| vehicles | – | 5k/1 (6k/1) | – | – | – | 5k/1 | 0k/0 (4k/1) | – | – | – | – |
| spike sites | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | – |
| ranger carts | 4k/1 | 4k/1 | 4k/1 | 4k/1 | – | – | – | – | – | – | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| the Workshop (46 m underground) | 3k/38 | – | – | 3k/38 | – | – | – | – | – | – | – |
| clue tells and doors | 0k/3 | 0k/2 (0k/3) | – | 2k/17 | 2k/18 | – | – | – | – | – | – |
| race rings | – | – | – | – | – | – | 3k/4 | – | – | – | – |
| the market (Wanted board, stall) | 0k/12 | – | – | 0k/10 | 0k/10 (0k/8) | – | – | – | – | – | – |
| **total** | **587k/258** | **477k/182** | **458k/168** | **638k/286** | **522k/225** | **510k/177** | **413k/154** | **438k/167** | **412k/156** | **609k/213** | **145k/74** |

#### After: High, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trees (full/mid/LOD pools + blobs) | 329k/15 | 352k/17 (4k/3) | 306k/17 (1k/1) | 330k/17 (5k/3) | 301k/18 (35k/3) | 348k/15 (1k/2) | 289k/15 (2k/2) | 391k/17 (2k/2) | 273k/19 | 168k/15 (4k/2) | – |
| far layer (ground, canopy, city) | 84k/17 | 84k/17 | 97k/19 | 78k/16 | 74k/15 | 84k/17 | 74k/15 | 94k/19 | 74k/15 | 84k/17 | – |
| the flock | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | 37k/1 (37k/1) | – |
| people | 116k/32 (31k/6) | 99k/16 (31k/4) | 31k/11 (13k/5) | 139k/35 (38k/15) | 6k/2 (6k/2) | 56k/16 (19k/4) | – | – | – | – | – |
| terrain | 51k/17 | 47k/14 | 47k/13 | 66k/17 | 55k/15 | 51k/15 | 64k/16 | 37k/20 | 61k/15 | 39k/14 | – |
| static batch (city ring, code landmarks, walls) | 32k/26 (27k/7) | 32k/32 (23k/7) | 28k/24 (18k/6) | 32k/26 (22k/6) | 32k/26 (22k/6) | 32k/31 (29k/8) | 22k/24 (22k/6) | 22k/23 (16k/5) | 31k/25 (22k/6) | 31k/25 (19k/5) | – |
| finale (Mecha, turnout, doors) | 0k/4 | 0k/4 | – | 0k/4 | 0k/4 | 0k/4 | – | – | – | 302k/80 (83k/40) | – |
| crowds | 32k/11 | 2k/1 | 17k/3 (17k/3) | 58k/16 (24k/5) | 76k/12 (52k/3) | 33k/3 (28k/2) | 4k/4 | 10k/5 | – | 10k/3 (8k/1) | – |
| named animals | 37k/15 (19k/10) | – | 5k/3 (5k/5) | 39k/17 (20k/11) | 59k/24 (18k/11) | 6k/2 (6k/2) | 12k/4 (13k/8) | 3k/1 (3k/1) | 61k/20 (16k/6) | – | – |
| lamps + benches | 20k/10 (2k/1) | 16k/8 (3k/2) | 17k/8 (10k/2) | 19k/8 (7k/2) | 37k/9 (25k/2) | 28k/10 (13k/2) | 7k/6 | 21k/10 (15k/2) | 13k/6 | 23k/9 (11k/2) | – |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 43k/4 (19k/1) | 2k/2 | 4k/2 | 25k/3 (15k/1) | 18k/1 (34k/2) | 12k/3 | – | – | 6k/1 | – | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 145k/74 |
| water | 19k/4 | 5k/4 | 3k/2 | 19k/4 | 18k/3 | 4k/3 | 16k/7 | 19k/8 | 18k/3 | 16k/2 | – |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| collectibles (golden pretzels, strays) | 10k/2 (6k/1) | 3k/1 | 5k/3 (3k/1) | 7k/2 (3k/1) | 13k/2 (9k/1) | 2k/2 | 6k/2 (3k/1) | 4k/2 (3k/1) | 10k/2 (6k/1) | 6k/2 (3k/1) | – |
| vehicles | 4k/1 (2k/1) | 7k/2 (6k/1) | 5k/1 | 4k/1 | 4k/1 | 9k/3 | 0k/0 (4k/1) | – | 4k/1 | 4k/1 | – |
| parked taxis | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | – |
| ranger carts | 4k/1 (4k/1) | 8k/2 | 8k/2 | 4k/1 | – | 4k/1 | 4k/1 | 4k/1 | – | – | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | 7k/8 | 4k/5 | 7k/8 | 7k/8 (1k/1) | 7k/8 | – | – | – | – | – |
| signs | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | – |
| spike sites | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/1 (8k/10) | 0k/1 | 0k/5 (0k/5) | 0k/0 (0k/5) | 0k/4 | – | – | – | – | – |
| clue tells and doors | 0k/1 (0k/1) | 1k/5 (0k/3) | 0k/3 (2k/1) | 1k/7 | 1k/10 | 0k/3 | 0k/8 | 0k/8 | – | 0k/0 (0k/1) | – |
| race rings | – | – | – | – | – | – | 4k/7 | – | – | – | – |
| the market (Wanted board, stall) | 0k/5 | 0k/5 | 0k/5 | 0k/5 | 0k/6 (0k/3) | 0k/5 | – | – | – | – | – |
| **total** | **998k/237** | **839k/201** | **744k/178** | **1060k/271** | **1005k/225** | **873k/197** | **647k/157** | **743k/156** | **698k/150** | **897k/240** | **145k/74** |

#### After: Medium, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trees (full/mid/LOD pools + blobs) | 184k/15 | 190k/15 (4k/3) | 190k/16 | 185k/16 (2k/2) | 188k/17 (26k/3) | 187k/15 (1k/2) | 203k/15 (2k/2) | 201k/14 (1k/2) | 178k/15 | 143k/15 (2k/1) | – |
| far layer (ground, canopy, city) | 84k/11 | 84k/11 | 87k/12 | 84k/11 | 84k/11 | 84k/11 | 74k/10 | 91k/15 | 84k/11 | 84k/11 | – |
| static batch (city ring, code landmarks, walls) | 32k/26 (26k/6) | 28k/24 (23k/7) | 26k/20 (18k/6) | 32k/26 (22k/6) | 31k/25 (22k/6) | 31k/25 (29k/8) | 21k/20 (22k/6) | 21k/22 (16k/5) | 31k/25 (22k/6) | 31k/25 (19k/5) | – |
| terrain | 45k/13 | 41k/10 | 47k/12 | 41k/13 | 39k/12 | 39k/11 | 45k/12 | 31k/16 | 43k/11 | 39k/14 | – |
| people | 81k/26 (7k/3) | 50k/12 (13k/2) | 24k/9 (7k/2) | 57k/32 (7k/9) | 6k/2 (6k/2) | 37k/10 (13k/2) | – | – | – | – | – |
| lamps + benches | 16k/8 (2k/1) | 12k/7 (3k/2) | 13k/7 (10k/2) | 16k/6 (7k/2) | 35k/8 (25k/2) | 24k/8 (13k/2) | 5k/4 | 18k/8 (15k/2) | 11k/6 | 18k/7 (11k/2) | – |
| the flock | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | 22k/1 | – |
| finale (Mecha, turnout, doors) | 0k/4 | – | – | 0k/4 | 0k/4 | 0k/4 | – | – | – | 197k/80 (18k/19) | – |
| crowds | 20k/11 | 0k/1 | 13k/3 | 40k/11 | 64k/11 | 29k/3 | 3k/3 | 6k/4 | – | 10k/3 | – |
| named animals | 25k/10 | – | 5k/3 | 25k/9 | 33k/15 | 6k/2 | 12k/4 | – | 32k/11 | – | – |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 33k/4 (19k/1) | 2k/2 | 4k/2 | 25k/3 (15k/1) | 6k/1 (15k/1) | 12k/3 | – | – | 6k/1 | – | – |
| water | 19k/4 | 5k/3 | 3k/1 | 19k/4 | 18k/3 | 4k/3 | 15k/2 | 19k/8 | 18k/3 | 16k/2 | – |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 102k/74 |
| parked taxis | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | 2k/1 (2k/1) | – |
| vehicles | 4k/1 | 7k/2 (6k/1) | 5k/1 | 4k/1 | 4k/1 | 7k/2 | 0k/0 (4k/1) | – | 4k/1 | 4k/1 | – |
| collectibles (golden pretzels, strays) | 6k/2 | 1k/1 | 4k/3 | 3k/1 | 10k/2 | 1k/2 | 4k/2 | 0k/1 | 10k/2 | 3k/1 | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | 4k/5 | – | 7k/8 | 7k/8 | 7k/8 | – | – | – | – | – |
| signs | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | 2k/6 (1k/2) | – |
| ranger carts | 4k/1 | 8k/2 | 4k/1 | 4k/1 | – | 4k/1 | – | 4k/1 | – | – | – |
| spike sites | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | 1k/2 (1k/2) | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/1 (8k/10) | 0k/1 | 0k/5 (0k/5) | – | – | – | – | – | – | – |
| race rings | – | – | – | – | – | – | 4k/7 | – | – | – | – |
| clue tells and doors | 0k/1 (0k/1) | 1k/5 (0k/3) | – | 1k/7 | 0k/8 | 0k/3 | – | 0k/8 | – | – | – |
| the market (Wanted board, stall) | 0k/5 | 0k/5 | – | 0k/5 | 0k/6 (0k/3) | 0k/5 | – | – | – | – | – |
| **total** | **662k/196** | **535k/165** | **508k/131** | **641k/217** | **667k/180** | **574k/161** | **462k/117** | **472k/136** | **486k/121** | **628k/205** | **102k/74** |

#### After: Low, day (triangles k / draws; shadow pass in brackets)

| What | Bethesda | Wollman Rink | Columbus Circle | Bow Bridge | The Ramble | Sheep Meadow | Reservoir | Fifth Ave / 110th | High over mid-park | Finale: the Stomp | Finale: the climb |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trees (full/mid/LOD pools + blobs) | 43k/13 | 49k/14 | 36k/14 | 44k/14 | 42k/15 | 45k/13 | 31k/15 | 59k/13 | 30k/15 | 26k/14 | – |
| far layer (ground, canopy, city) | 32k/9 | 32k/9 | 32k/9 | 32k/9 | 32k/9 | 32k/9 | 32k/9 | 35k/13 | 32k/9 | 32k/9 | – |
| static batch (city ring, code landmarks, walls) | 31k/8 | 31k/11 | 31k/11 | 31k/10 | 32k/12 | 31k/11 | 14k/7 | 21k/10 | 32k/12 | 32k/12 | – |
| terrain | 21k/9 | 23k/6 | 16k/5 | 25k/7 | 18k/7 | 20k/7 | 27k/8 | 17k/10 | 18k/7 | 16k/7 | – |
| lamps + benches | 8k/8 (2k/1) | 6k/6 (3k/2) | 11k/5 (10k/2) | 11k/5 (7k/2) | 16k/6 (10k/2) | 15k/6 (10k/2) | 3k/4 | 11k/4 (10k/2) | 6k/4 | 11k/4 (7k/2) | – |
| people | 39k/12 | 21k/7 | 10k/4 | 46k/14 | 6k/2 | 11k/4 | – | – | – | – | – |
| the flock | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | 13k/1 | – |
| Gus | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | 7k/5 (7k/5) | – | – |
| finale (Mecha, turnout, doors) | 0k/4 | – | – | 0k/4 | 0k/4 | – | – | – | – | 114k/80 (6k/1) | – |
| the climb (its own scene) | – | – | – | – | – | – | – | – | – | – | 102k/74 |
| landmark GLBs (Bethesda, Bow Bridge, Carousel…) | 33k/4 | 2k/1 | 4k/1 | 15k/3 | 6k/1 | 7k/2 | – | – | 6k/1 | – | – |
| crowds | 2k/3 | 0k/1 | 1k/1 | 19k/7 | 20k/4 | 17k/3 | 0k/1 | – | – | 9k/2 | – |
| named animals | 12k/4 | – | – | 6k/3 | 7k/4 | – | 12k/4 | – | 1k/1 | – | – |
| water | 4k/3 | 1k/1 | – | 4k/3 | 3k/2 | 3k/1 | 15k/1 | 3k/2 | 3k/2 | 1k/1 | – |
| parked taxis | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | 2k/1 | – |
| fight arenas (Biscuit, the Ramble stealth) | 7k/8 | – | – | 7k/8 | 7k/8 | – | – | – | – | – | – |
| vehicles | – | 5k/1 (6k/1) | – | – | – | 5k/1 | 0k/0 (4k/1) | – | – | – | – |
| ranger carts | 4k/1 | 4k/1 | 4k/1 | 4k/1 | – | – | – | – | – | – | – |
| signs | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | 2k/6 | – |
| far layer (sky, skyline ring) | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/3 | 2k/4 | 2k/3 | 2k/3 | – |
| scheme props (songbird ring, wedding, rink) | 0k/5 | 0k/1 (8k/10) | – | 0k/5 | – | – | – | – | – | – | – |
| spike sites | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | 1k/2 | – |
| collectibles (golden pretzels, strays) | 1k/1 | 0k/1 | – | 1k/1 | 2k/1 | 0k/1 | 3k/1 | – | – | 0k/1 | – |
| race rings | – | – | – | – | – | – | 3k/4 | – | – | – | – |
| clue tells and doors | 0k/1 | 0k/2 (0k/3) | – | 0k/5 | 0k/6 | – | – | – | – | – | – |
| **total** | **272k/123** | **226k/102** | **189k/77** | **284k/130** | **236k/114** | **230k/85** | **177k/79** | **189k/79** | **163k/75** | **275k/147** | **102k/74** |

## Headroom and what's left

- **Nothing measured is over a cap.** The tightest spots: Medium at Bow Bridge in the day (the wedding party, 17
  people, 8 named animals and 67 crowd animals in view) is 3 draws under its cap (217 / 220); High at Bow Bridge
  uses 271 of 300 draws; the Low stomp uses 147 of 150 draws and 275k of 300k triangles. Triangles have more room
  than draws everywhere.
- Draw calls are now the binding constraint. The big remaining ones: people (about two per person: body and
  accessories, plus a shadow pass on the nearest few), named animals (body + accessory each), the static batch's
  textured materials (one per material per visible 512 m cell), the Mecha (64 meshes: one per pivot and painted
  material; a texture atlas would take it to ~15), signs (six instanced layers).
- The governor (`render()` in main.js) only watches triangles. If a future scene stacks people and animals past
  the draw cap, a draw-call term there is the next step.
- The wedding party (`spec.vip`) is drawn past the people caps near the camera by design (Polish-1); at Bow Bridge
  it is most of the people on Low.
- Not measured: real GPU time. SwiftShader in this container can't say anything about frame rate; these are the
  design's counts, not fps.

## Gameplay

Nothing in gameplay reads any of this. All 40 recorded solutions in `design/solutions/` (the scheme solutions, the
nine `.alt` routes and `finale.json`) replay from their fixtures with the final code, one after another in one
job server (`node game/tools/sf-run.mjs serve`, the default Low preset, port 8171): 40 / 40 complete, no console
errors, none re-recorded. `tools/check-schemes.mjs` passes.

One harness fix on the way: six `.alt` solutions start from their own fixture (`goToScheme('gear-pen.alt')`) but
have no `fixture` field, and `sf-run.mjs replay` fell back to the main scheme's fixture, so they failed when run
plainly (they pass with `--fixture <id>.alt`). `replay` now takes the fixture from the solution's `start`.
