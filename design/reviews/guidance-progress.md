# Guidance pass progress

The user: "'Land by the sign' is way too vague. We need something better guiding you to an available next thing to do without being too pushy."

- 12:41 Started. Read builder notes, GAME_DESIGN hint rules, flow-fun-audit, scheme engine and data.
- 12:47 Built src/ui/guide.js (marker, Where to? on G/R3/compass tap, Something to do card + Board line, Guidance setting Subtle/Normal/Off); wired into main.js, input.js, glyphs.js, screens.js (Controls + Settings), board.js, touch.js, save.js, ui.css; schemes.targets() now carries y. Next: rewrite goal/where text.
- 12:59 Goal + where text for all 86 steps (data/schemes.js), prologue toast, 3 dialogue lines (no longer than before: same typewriter timing), check-schemes rule for where/goal length (passes). GAME_DESIGN.md: Guidance section, controls, settings. First screenshots in design/screenshots/guidance/; fixed: where-line overlapped the chip row (now heads the toast column), idle rule used the 80 m nudge radius (now 30 m).
- 13:00 First-15 run started (scratchpad/guidance/human15.mjs → design/screenshots/guidance/first-15).
- 13:05 first-15 in progress: prologue s2 done in 29 s, Sue 22 s, tourist 16 s, all without nudges; marker seen on each. Where-to line now names the signs still to flip.
- 13:12 first-15: Prologue → Sue → tourist → Sue → Puddles → peas (nudge after 56 s waiting: the puzzle, as designed) → Puddles → Queenie (84 s, 770 m flight) all found without nudges; now on Pickles.
- 13:21 first-15 still running (den-cats leg).
- 13:21 first-15 running/finished
- 13:22 first-15 stopped by hand at 660 s (the bot can't pick up the anchovy slice Pickles knocks down: a bot limit, not a guidance one). Every card's target found without its nudge except the peas puzzle (nudge by design); 0 console errors; log design/screenshots/guidance/first-15/log.txt. Replays started: prologue, den-ducks, den-cats(+alt), den-rats, den-crows, finale.
- 13:29 replays: prologue yes (t 103.4 = baseline), den-ducks yes (196.38 = baseline); rest running.
- 13:38 replays so far all match baseline end times exactly: prologue, den-ducks, den-cats(+alt), den-rats, den-crows. finale running.
- 13:46 Done. Replays 7/7 (design/reviews/guidance-replays.txt), end times identical to the land-perf baseline, so the other 33 weren't re-run. Final shots design/screenshots/guidance/01–11 (text scanner: no orphans, nothing clipped). check-schemes passes. Server and browsers closed.
