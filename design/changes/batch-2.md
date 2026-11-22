# Batch 2: quick fixes, controls and feel (2026-11-22)

Issues by the owner (the person). Their answers are in design/STATUS.md request 24. Triage: design/reviews/issue-triage-2026-11-22.md.

## Bugs (fresh code review each, no design review)
- **#6, #14 (hats), #22: misplaced accessories.**
  - #6: Fifi's collar and bow "glitchy weird floaty things that cut through her eyes and hover above her head"; other dogs too.
  - #14: top hats sit inside the pigeons' heads.
  - #22: Dapple looks like two 3D models, both cued as Dapple.
  - All three probably come from the accessory attachment in data/looks.js `acc` and the code that places accessories. Find the shared cause and fix it there.
- **#14 (dialogue):** the top-hat gang says nothing when you meet them; there's only different music. Give them a line on approach, in their voice.
- **#15: crumbs and Bread Power.**
  - The crumbs icon looks like meat, and it's unclear what crumbs are for (Feather Up costs 15 at a Nest).
  - "Bread Power 0/30" only counts signs made permanent (which needs the cart sabotage), so flipping signs seems to do nothing.
  - Fix: a crumb or seed icon in the game's icon style; a one-line explanation where crumbs and the meter are first shown, or on hover/focus of the chips; and a meter that shows flips, e.g. "Bread Power 0/30 · 3 flipped".
- **#20:** "A rat got it" after a nap: name the item, e.g. "A rat took your slice while you napped."
- **#21:** "Mind the gap" is London; use NYC subway talk. It's in schemes/den-rats.js:28, and the line timing matters (a no-break space keeps the length).
- **#18:** the controller hint at the bottom of the screen, hint bubbles and pop-ups jitter while moving. Snap their screen positions to whole pixels and smooth them (a short lerp); never move per frame by sub-pixel amounts.

## Feel and features (one short design review)
- **#4: controls on screen.** The owner: "Especially on desktop. It's perfectly fine to show the key controls along the bottom… the land and control and any other controls you can use while flying should show at the bottom while you're flying… without it getting annoying." Agreed: while Gus is in the air, always show the flight controls (Flap, Land, Boost, and any others in flight) in the bottom strip, compact and low-contrast. The other hints keep retiring once learnt. The Settings "Control hints" option (auto/always/off) keeps working; Off still hides them.
- **#2: landing.** "Landing seems abrupt. Probably coming down a little too fast?" Make the final approach gentler: ease the descent rate over the last few metres and give a short flare, so the touchdown is soft without making landing slower to trigger or harder to aim. Keep the forgiving landing (Land prompt).
- **#5: hop flight.** "A really quick press of the flight button should probably do a kind of hop flight and then anything longer or multiple presses and you start flying." The owner: "just land it and I'll try it deployed and we'll adjust if needed." A tap from the ground gives a short hop (up about 1 m and forward, then back down walking). Holding, or a second press during the hop, takes off as now. Make sure nothing that needs flight is harder: takeoff from perches, from water, and the recorded solutions' flap presses (check how the replays press flap; a tap that used to take off must still take off where a solution depends on it, or the solution gets re-recorded).
- **#13: outside the city.** "If the player flies far enough outside of the city like they totally leave the rendered buildings whatsoever. They should get some kind of badge/buff that doubles their flying speed or something. Eventually there should be some kinda of reality bending effect/sound and they should appear in the center of the park." Past the last buildings: a small "Open sky" badge and double flying speed. Fly on far enough: a shimmer or warp effect and sound, then Gus appears over the park centre (the Great Lawn, in the air, safely). Uses existing sounds or synth (no spend), unless a generated sound is clearly better and cheap.

## Proof (efficient)
- One game load per check session (sf-run serve jobs).
- State checks for #15, #20 and #21.
- Screenshots for #6, #14, #22, #15, #18 (before and after), #4, and #13's effect, at 1280; 844 only for new HUD text.
- Replays once at the end: the solutions that pass through the changed code. For #5 and #2, which are flight code every scheme uses, that's all 40 unless flight input is provably unchanged for recorded inputs; decide from the code first. For #21: den-rats. For #20: whatever naps with an item.
- check-schemes passes. 0 console errors.

## Design review
(appended below)

Player and Builder reviews. Decisions (these override the text above):

- **#5 hop flight.**
  - The hop/fly decision happens at the end of the existing 0.14 s takeoff squash. Released before then: a hop. Held, or pressed again: the normal takeoff continues with no added delay.
  - Hop only from ordinary ground. Always do a full takeoff from a perch, roof or edge, from water, in a chase or encounter, while carrying, during a scene, and wherever a scheme expects flight.
  - Hopping into water splashes Gus back, never into flight.
  - Touch: a double-tapped Flap is Boost, so ignore the boost for 0.5 s after leaving the ground.
  - **Replays:** solutions recorded before this change replay with the old takeoff (no version field → `G.legacyTakeoff` in replay and sf-run). New recordings carry a version. The pilots' ground tap becomes a hold of 12+ frames. The prologue's flap tutor says "hold to fly".
  - Add two new checks: a tap gives a hop that ends walking on the same ground; a tap then hold takes off.
- **#2 landing.** Render side only: a visual ease of about 0.15–0.3 s on the snap (gus.js:402-405 `nearGround`, and `#land` zeroing speed), with a visual y offset easing down plus a short glide forward of the visual root, and the existing flare pose. The simulation is unchanged. Prove it with 2–3 replays whose end states match exactly.
- **#18 jitter.** Call `syncCameras()` before `frameUi` (main.js:1801 vs 840). Bubbles and prompts were placed with last frame's camera. Also check the bottom strip's glyph flipping when mouse and pad are both active (input.js:125/132/200, hud.js:181): don't switch the device on tiny mouse jitter, and keep the strip's width stable.
- **#4 flight hints.** While flying, the flight rows ignore the learnt counts ('auto' = always in flight; 'off' still hides them). Learnt rows dim to 13 px at about 0.7 opacity. Add Drop (while carrying) and Peck over water (talk to water characters). Name Boost as Shift/L3 and Flap as "hold to climb". Check the strip against the prompt at 844.
- **#6 and #14 accessories.** The cause is shared: the unit size is per species, not per model (characters.js:24), and the anchors are guesses (:158-161), so Fifi's collar ring reaches her eyes. The crowd Swells' hats sit at headPoint, 2 cm below the crown (crowds.js:173/442/487-505). Fix: derive the unit from each model's bounds, and add a crown point (the highest vertex over the head point). Take shots of every species that wears an accessory.
- **#22 Dapple.** A crowd horse stands 1.3 m from Dapple, inside the 2.9 m talk radius (crews.js:230 crowd line). The same goes for Clementine and Big Ben. Skip crowd slots within about 4 m of a named character. Replay den-horses and den-horses.alt.
- **#13 open sky.**
  - The trigger is a fixed distance outside WORLD (±200), not the rendered buildings, which vary by preset.
  - Past about WORLD + 150 m: an "Open sky ×2" badge, double speed applied before the heavy-carry clamp, and a toast ("The city's behind you…").
  - Past about WORLD + 600 m: the shimmer and a rising synth swell build over 2–3 s. Turning back cancels them. Then Gus arrives gliding about 40 m over the Great Lawn, with a line from him.
  - Never during races, encounters, scenes, driving or a running scheme script.
  - A carried hot slice goes cold on the warp, so it's no shortcut for the 820 m puzzle.
  - Called allies come along (flock.place).
  - Reuse the Ruffled/Express teleport path.
- **#15, #20, #21:** as above.

**Replays:**
- At the end, a representative set rather than all 40. The legacy takeoff keeps the old recordings on the old code, the landing change is visual, and the open-sky trigger lies outside every route.
- The set: prologue, finale, den-horses, den-horses.alt, den-rats, plus the short-tap files the review named (den-turtles, den-geese, den-crows, part-talons, den-meermob, den-rhoda), plus whatever the #20 nap path touches.
- Plus the 2 new hop checks.
- If any of these diverge, widen to all 40.
