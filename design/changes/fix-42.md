# Fix #42: the compass points at where you can get the item now (2026-11-25)

Report (the #23 mistake sweep): with the item a step needs dropped, lost or cooled, the compass and the map marker kept
pointing at whoever the step delivers to.

## The rule (`game/src/systems/schemes.js` `targets()` → `#itemTarget()`)

A step's item is read from the step data, for every option (alternatives included): `needs.item`, `reachNeeds.item`, a
give's or drop's `on.item`, `does.take.item`. Fits as the engine accepts it (any slice where a plain one is wanted; the
anchovy only where the anchovy is). When Gus isn't carrying one that fits:

| Situation | Compass / map marker |
|---|---|
| Carrying it, usable | the delivery target (unchanged) |
| Carrying a cold slice the step needs hot | the halal griddle (unchanged, fix-19 `coldSlice()`) |
| Lying within reach, hot or cold | the item (the nearest copy) |
| Lying within 3 m of the step's target | stay on the target |
| An ally is fetching it (`clues.fetching`, < 30 s) | the step's own target |
| Out of reach (on the water) or gone, with an item-keeper rule | the keeper's spot (the place its toast names) |
| Gone, no keeper rule | a live source: someone holding one (the slice tourists), a Slice Line with a slice waiting; else where an earlier step of the scheme had Gus pick it up (Pickles for the anchovy) |

Not counted as "lying": a different item, one still guarded (Pickles' sill, the picnickers' tub: `items.guardReason(it,
true)`, no side effects), a huge one. Items not yet obtainable (the shelf box before the Knock, a grate's key) aren't in
`items.world`, so they never show.

Spoiler guard: an item Gus has never had on this step (and no earlier step picked it up, no keeper rule) keeps the step's
own target, so a glint on a roof (den-crows' shiny) isn't pointed out. Slices and boxes (the pizza economy) always count.
What Gus has carried on each step is kept in the save (`state.had`, 'scheme.sN' → item ids; noted on every pickup and
every half second).

When every route of a step needs the item, the item target replaces the delivery target; when one route needs none (an
alternative), it's added beside it and the guide picks the nearer. The "Where to?" line names the item target
(`ui/guide.js`). `systems/slices.js` gained `waitingDrops()` (the Slice Lines with a slice waiting).

A visible change beyond the issue's cases: on a step that needs a slice, before Gus has one, the compass now points at the
nearest slice to be had (one lying, a tourist holding one, a Slice Line) instead of the step's place; the goal card still
names the place, and once he carries a slice it's back on the target.

## What reads it

`targets()` feeds the HUD compass (main.js `hudView`), the map's tracked marker and other cards' rings (`ui/map.js`), the
soft world marker and the "Where to?" line / suggestion (`ui/guide.js`), and two debug tools: `debug/mistakes.js` (only
checks it: the Nudge column) and `debug/human-check.js` (the scratchpad-driven first-15 check, not part of sf-run or
whole-game). No autopilot or goal script steers by it, so no closed-loop records or replays were needed.

## Proof

- `node game/tools/check-schemes.mjs`: 33 schemes, 89 steps, all checks pass.
- Mistake sweep round 4 (`--only den-ducks.s3:W,den-raccoons.s3:W,den-meermob.s2.alt:C,den-biscuit.s3:F,den-rhoda.s3:C`):
  round 4 in design/reviews/mistake-sweep.md. The Nudge column is clean for all five (it read NUDGE-WRONG / "compass not
  at" in rounds 1-2). Verdicts unchanged: ducks W, raccoons W, biscuit F PASS; rhoda C PASS-HELPED (nap round, as round
  1); meermob alt C FAIL-SCRIPT (the known harness limit on a one-slice-per-phase step, as round 2; oracle: doable). 0
  console errors. A first pass still flagged rhoda and meermob: the slice lying was the bench tourist's (Gus had never
  carried it), so slices and boxes were made to always count; the re-run is clean.
  Not re-run: the round-2 "compass not at" notes on truce-cats-rats.s3 W (box) and truce-dogs-squirrels.s3 W (tennis-sack)
  and meermob alt Q; the rule covers them (boxes always count; the sack has a keeper rule).
- Screenshots, one per row (compass + map): design/screenshots/fix-42/ in the fix-9 worktree (`<row>-compass.png`, `<row>-map.png`; design/screenshots/ is gitignored, so they stay local).
  1-carried (den-ducks s3, peas carried → Commodore Puddles) · 2-cold (den-rats s3, cold slice → Subway Sue + the halal
  griddle) · 3-dropped (den-raccoons s3, wrench dropped → the wrench) · 3b-dropped-cold (den-rhoda s3, cold slice dropped
  → the slice) · 4-out-of-reach (den-ducks s3, peas on the Lake, keeper held for the shot → the Boathouse picnic table;
  with the keeper on, the peas come back there and the compass is on them) · 5-gone (den-cats s3, anchovy eaten → the
  bench tourist holding one) · 5b-gone-slice (den-rhoda s3, no slice → the nearest tourist with one) · 6-beside
  (den-raccoons s3, wrench put down 1.95 m from Rigby → stays on Rigby). Each setup's targets() output matched.
