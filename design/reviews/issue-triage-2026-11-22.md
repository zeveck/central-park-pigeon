# Open issues: triage and plan (2026-11-22)

All 22 open issues on zeveck/central-park-pigeon were filed by the person, so each counts as their own request. Sizes: S = under an hour, M = a few hours, L = a day or more, or new models.
Run order agreed: batch 1 now (`/gamegen --fix #8 #23 #19 #16`), then sync up before batch 2.

## Batch 1: players getting stuck or lost (run now)

- **#8 (+ the report remark in #7): Report a bug traps controller players.** No way out of the form with a controller (softlock until reload), and no way to type.
  - Fix: B / Circle closes the form; focus can always reach Cancel.
  - Browsers give a controller no on-screen keyboard, so add preset choices ("I'm stuck", "Looks wrong", "Confusing", "Other") plus the screenshot, with typing optional.
  - Size: S for the way out; M with the presets.
- **#23 (+ the failure parts of #19): puzzles must stay solvable.** A failed attempt should reset the puzzle, never block it for good.
  - Fix: go through all 31 schemes for ways to end up permanently stuck (failure states, not just quitting mid-scene, which design/reviews/fixes-3-midscene-sweep.md already covered) and make each one reset.
  - Size: M–L (mostly the audit).
- **#19: the slice puzzle.**
  - The anchovy order is drawn as pepperoni: change the art or the wording.
  - The HUD says "hot" on a cold slice.
  - No way to get rid of a slice after failing: give it to a person or animal who'd eat it (the person's preferred idea), and/or a Drop button while carrying.
  - Reheating is unclear and the carts are hard to land on: reheat by getting near any food cart, no landing needed.
  - The cart man stands in the street: move him.
  - Size: M.
- **#16: peas give no feedback.** Pressing Peck/□ at the table makes a sound but shows nothing, and the ducks then act as if Gus has no peas.
  - Fix: first reproduce whether the pickup actually fails. Then add a carried-peas icon and a reaction from the ducks.
  - Size: S–M.

Proof for batch 1: these change puzzle rules, so replay the solutions that pass through each changed scheme, plus any shared code the fixes touch (items, carry, the report UI). Per the person (and gamegen#52), skip the full 40 and the whole-game run unless a fix changes shared play code. Re-record any solution whose scheme changed.

## Batch 2: quick wins (after syncing up)

- **#6, #14, #22: character accessories misplaced.** Fifi's bow and collar float through her eyes (other dogs too), top hats sink into heads, Dapple looks like two horses. Probably all from one bug in how accessories attach (data/looks.js `acc`); check Dapple's plume first. S–M.
- **#15: HUD clarity.** The crumbs icon reads as meat, and crumbs don't say what they're for. "Bread Power 0/30" counts only signs that stay changed for good (which needs the cart sabotage), so flipping signs seems to do nothing. Fix: a better icon, and a meter that explains itself or counts flips. S.
- **#20: "A rat got it."** It's about a dropped item that disappeared during a nap (systems/items.js). Name the item: "A rat took your slice." S.
- **#21: "Mind the gap" is London.** Use NYC subway talk (schemes/den-rats.js). S.
- **#14 (dialogue part): the top-hat gang says nothing** when you meet them. Add a line. S.
- **#18: jittery controller hints and pop-ups while moving.** Round positions to whole pixels and smooth the movement. S.

## Batch 3: the world (changes the world, so full replays)

- **#1, #17, + #7 (hills and floating): ground, water and bridges.** People walk on and under water, benches are underwater, dogs sink into hills or float, bridges don't meet the ground and characters get stuck.
  - Fix: keep characters on the ground and off water, and connect bridge ends to the ground.
  - Gus in water: he floats and can only take off (the person's idea), with a check that every water conversation can still be reached.
  - Size: M–L.
- **#12: fences** are flat, doubled and floating. Make solid low fences on the ground. M.
- **#10: a pigeon joining the flock vanishes.** It should take off and fly out of view. S–M.

## Needs the person's decision

- **#11 + the walking part of #7: walking animations.** Squirrels, geese and dogs waddle side to side. Options: new rigged four-legged models from Meshy (credits; whether Meshy can rig four-legged animals is uncertain), or hand-made procedural walks like Gus's (time, no cost). Suggest: try a procedural walk on the dogs first and judge it. L.
- **#5: hop flight.** A quick tap hops, a hold or second press flies. The person asked for it only if it's reliable, so build a prototype for them to try. M.
- **#2: landing.** Too vague to act on: ask whether it's the speed, the flare or the camera.
- **#4: showing controls.** This reverses the earlier "retire hints once learnt" decision. Likely answer: keep the in-flight controls visible while flying, and drop the rest once learnt. A quick yes or no. S.
- **#9: photo mode.** A new feature, optionally unlocked by a quest to steal a camera. M–L; after the fixes.

## Fine to build as written

- **#13: outside the city.** A speed boost far beyond the buildings, then a strange effect and sound that drops Gus back in the park centre. M.
