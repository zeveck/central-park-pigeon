# Batch 3: the world holds together (2026-11-22)

Issues by the owner (the person). Their answers are in design/STATUS.md request 24 ("the bigger problem is them passing into hills, buildings, etc."). Triage: design/reviews/issue-triage-2026-11-22.md.

## Problems, in the owner's words
- **#1:** humans walk on the surface of the water; one walked under the lake; there are benches under the water, with people and birds down there. Gus can walk on the lake bottom: "We should just Bob on the top like a bird on the water… not be able to move. Just take off… If we make it so that you can't just walk underwater, we need to make sure that you can have all necessary conversations without walking underwater. We could make it so you float."
- **#7:** dogs walk by bouncing; dogs pass into hills; a dog floating in mid-air ("is he standing on something we can't see?").
- **#11 (dogs only for now):** squirrels, geese and dogs waddle side to side. The owner: "try coded on the dogs so I can see. Though the bigger problem is them passing into hills, buildings, etc."
- **#17:** bridges whose ground doesn't line up with the deck; NPCs stuck trying to cross a bridge that doesn't connect to the ground.
- **#12:** fences are a flat 2D graphic that looks wrong at an angle, doubled (one floating above the other), and neither touches the ground.
- **#10:** when a pigeon joins your flock it just vanishes; it should take off and fly to join.

## Planned
1. **Grounding (#7, #1, #11's "bigger problem").**
   - Every walking character (named, crowd, ambient people, dogs, squirrels, geese) is placed on the real walkable surface each update: terrain, bridge decks and paths. Never inside hills, buildings or solids, and never in the air over nothing.
   - Their routes and wander targets stay off water and out of solids. Reroute or clamp anything that would enter them.
   - Find out why dogs float (a stale surface height, a hidden collider, a dog-walker leash offset?).
   - Audit every placed character and bench for water and solids, and move offenders to dry ground nearby (benches under the lake → the bank).
2. **Bridges (#17).** Every bridge's deck ends meet the terrain at both ends (the terrain is raised or ramped there, or the deck is extended), and the walk graph or routes that cross bridges are reachable. No NPC gets stuck at a bridge end.
3. **Gus and water (#1).**
   - Gus can't walk under water. Over or into water he floats on the surface (a gentle bob), can turn but not paddle about, and Flap takes off. Landing on water floats him.
   - All water conversations (ducks, turtles, Puddles, and anything else) must still be reachable while floating or hovering: check the 3.4 m water talk reach for every water character, and any step that needs Gus in water.
   - Fixing #23 meant items dropped in water float back, so keep that consistent.
4. **Dog walk (#11, coded, dogs only).** Replace the bounce with a procedural gait: legs, or a body roll and step if the dog GLBs aren't rigged; check what they have. In the spirit of Gus's procedural walk. Tie the gait speed to the movement speed, and idle when stopped. Dogs only, so the owner can judge it.
5. **Fences (#12).** Replace the doubled flat fence with a real low 3D park fence (posts and rails, or the classic NYC hoop fence), drawn once, sitting on the ground and following the terrain. Instanced, so perf holds. Code-built geometry, no generated art unless clearly better.
6. **Flock join (#10).** A recruited stray pigeon takes off from where it stands and flies to its place in the flock (a short visible flight), instead of vanishing.

## Proof (efficient)
- **One game load per check session:**
  - The grounding audit as a scripted scan, not visual: sample every character's feet against the surface each second for N seconds, and list any inside solids, under or on water, or floating.
  - Before and after counts.
  - Shots only of the fixed spots: a bridge end, the lake shore, a dog walking, fences close up and at an angle, a flock join.
- **Replays:** this changes the world everyone walks on, so the wider set is warranted. Run all 40 once at the end, unless the change provably can't touch routes: placement fixes don't move Gus, but Gus-on-water, bridge decks and terrain ramps can.
- Run check-schemes, and the perf probe (game/tools/perf-probe.mjs) at the worst spots on the Low preset if fences or the walk add draw calls.

## Design review
(appended below)

Player and Builder reviews. Decisions (these override the plan above):

- **One ground rule (the root cause of #1):** collision.js:139 drops water as a surface when yRef starts more than 0.3 m below the level, so walkers seeded with terrain.heightAt (the lake bed) walk the bed. Add `groundFor(x, z, yRef)`: where waterAt is true, the floor is at least the water level for everyone. Seed it with surfaceY(x, z, 400), not heightAt.
- **Data fixes:**
  - The picnicker at (52, 22) (all in the Pond) moves to the bank, and their benches with them.
  - gapstow-selfie stands on Gapstow's deck.
  - The parkgoers at (60, 18) r 18 and (60, 960) r 25 and the kid at (77, 325) r 3 move to dry ground.
  - The racers line at z 572 moves out of the Reservoir.
  - The heron haunts move to the shore.
  - Nightcap, Stilts and Slowpoke move to the bank, keeping their water feel at the edge, with the water talk reach.
  - In code: reject water and solids at spawn and on every wander and scatter target (humans.js:563, crowds.js:200/213/325/343). The scripted audit lists everything before and after.
- **Heights every update:**
  - Crowd animals: y from heightAt plus a precomputed deck-zone list (crowds.js:463 used a fixed yBase).
  - Humans: pushOut against solids.
  - Leash dogs: the same ground rule.
  - Named characters' tweens follow the terrain, not a straight line through hills (characters.js:274).
  - Keep it cheap: no full surface() call per animal per frame.
- **Gus and water:**
  - On foot, the water's edge stops him like a low wall, with a small splash.
  - A slow descent or a chosen landing over water floats him: walk mode with a `floating` flag, not a new mode. While floating: a slow paddle (about 0.5 m/s; this goes beyond the owner's "not be able to move", so the report says so), turning, a "Flap to take off" prompt, and a strong takeoff that can't drop him back.
  - A fast low touch keeps today's splash-bounce (skimming, and the Rhoda fight at fights.js:453).
  - The water talk reach goes to 4.5 m while floating, so Mrs Puddles, Gertrude and Gander are easy to reach.
  - Peck and drop work while floating; dropped items follow the #23 rules.
- **Bridges:** ramp the terrain up to the deck height at both ends of the stone bridges (landmarks.js:96-108: Gapstow, Huddlestone…) and the transverse bridges (:723-737, including crossings under 1.5 m that have no bridge at all). Measure the per-end gaps in the audit. Bow Bridge is probably fine.
- **Fences:**
  - Replace the flat planes (Reservoir ring landmarks.js:581, backstops :560, Conservatory gate :633) with instanced 3D geometry: the knee-high dark hoop fence of the park on paths and the Reservoir, rustic branch rail in the Ramble if any, real chain-link for backstops.
  - Ground them with per-post heights.
  - Keep the collision boxes and perches exactly the same.
- **Dogs (#11 demo):** the GLBs have no rig. Add a vertex-shader leg swing (vertices below ~35% height grouped by quadrant: a diagonal trot, stride tied to speed), plus a level back, a head nod and a tail wag if separable; when stopped, stand. Apply it to leash dogs and named dogs (Biscuit, Pretzel, Fifi, Moose), and to crowd dogs only if a per-instance phase is cheap.
- **Flock join:** `flock.arrive(p)` seeds the bird at the stray's spot. A coo, a hop and a flap-up with feathers, a ~1 s arc to its slot; the toast and stamp fire on arrival. Past VISIBLE_MAX, use a temporary flyer. Control stays with the player.
- **Replays:** this changes the ground every scheme walks on, so run all 40 once at the end (two browsers). Re-record only solutions that diverge because of an intended change, e.g. one that took the old splash-takeoff, with the reason noted. Plus the whole-game check is not run (gamegen#52 agreement: only if progression changes). check-schemes. The perf probe at the Mall, the Lake and the Reservoir on Low.
