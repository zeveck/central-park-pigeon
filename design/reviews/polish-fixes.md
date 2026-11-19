# Phase 8 polish fixes (2026-11-19)

Fix list: design/reviews/phase8-polish.md (items 1–17, in its order). After shots: design/screenshots/polish-fixes/
(`<finding>-<screen>-<size>.png`; sizes d1280 = 1280×720, d1920 = 1920×1080, p844 = 844×390 phone with touch emulation
(coarse pointer, no hover), pad = a fake controller through navigator.getGamepads). Before shots (the reviewer's) are copied
to design/screenshots/polish-fixes/before/. Main.js "Polish notes" lists the shared-file edits.

| # | Finding | What changed | Before → after |
|---|---|---|---|
| 1 | First gameplay shot: lamppost in the way, Gus tiny, ranger cut off (P5) | prologue.js: a close-up of Gus dozing at his own height while the ranger walks up (fov 45), then (camera beats take no game time) a wide side-on shot with the ranger, the whole lamppost and Gus for "Hey! Shoo!"; the follow rig's starting pitch 0.15 → 0.02 (render only); the Zzz bubble sits closer | before/d1280-newgame-1.png → p05-open-1-closeup-*.png, p05-open-2-shoo-*.png, p05-open-3-control-*.png |
| 2 | First load: title twice in two layouts, raw "Loading far-skyline-night.png", blank blue, leaf bar (P6) | index.html: the loading screen copies the title's layout exactly (art, crop, logo + tagline, bar where the buttons go, credit line); a 1.3 KB inline copy of the key art shows from the first frame under the real one; a plain rounded bar; the label says "Unpacking the park" then the stage names (no file names); ui.css's old loading rules removed | before/first-load-*.png, before/d1280-loading.png → first-load-desktop.png, first-load-phone.png (films) |
| 3 | Reward toasts 3–4 deep over the Workshop cutscene; bare "+ PART"; toasts over dialogue (P3) | hud.js toast queue: at most two on screen; while a cutscene holds the controls or dialogue is open only the scene's own note ({ now: true }: the Workshop's "… bolted on") shows, the rest follow one by one after; no "+ PART" (schemes.js) / "+ PART: Talons" (rinkjob.js) toasts (the cutaway's polaroid names the part) | before/sheet-wedb.png, before/sheet-rinkb.png → scratchpad shots in part-talons replay (see below), p03-after-nap-toasts-d1280.png |
| 4 | Ally wheel: portraits over names, badges on text, 7 px names on phone, badges on touch (P2) | wheel.js layout(): radius from the ally count (neighbours a portrait + gap apart), the ring sized to the window (portraits shrink on a phone, names never do; no transform scale); names in dark pills (gold when selected); number keys as small badges on the portrait rim, keyboard only; "Click/Press/Tap to Call" in tap mode | before/d1280-wheel.png, before/p844-wheel.png → p02-wheel-d1280/d1920/p844.png, p02-wheel-pad-no-badges.png |
| 5 | Crews list: selected joined crew white on pale green (P1) | ui.css: the open crew is orange/white even when joined | before/d1280-crew-strix.png → p01-crews-selected-*.png, p01-crews-focus-moved-*.png |
| 6 | Orange primary + gold focus ring = two "selected" buttons (P4) | ui.css: a .primary button gives up its fill while a sibling has focus (keeps an orange left edge) | before/d1280-pause.png → p04-pause-focus-*.png, p01-crews-focus-moved-*.png |
| 7 | Finale: bare captions lingering into the next stage; credits camera through canopies; HUD fades in over the sting (P16, P17) | finale.js: captions in a dark pill, cleared on every stage change; body.after-finale fades the HUD in only after the sting has faded (1.1 s delay); shout.js credits orbit lifts over any canopy between it and the Mecha (looks 2.5 s ahead, eased) | before/sheet-fin-b.png, sheet-cred.png, sheet-after-sting.png → finale-*.png |
| 8 | Rink Job: debug-sphere dome ramp; empty-plaza shots with the Zamboni cut off (P14) | vehicles.js: piles are a lumpy snow mound / grey slush heap, the frozen ramp a packed-snow kicker rising north (the launch direction) with an icy glazed face (vertex colours; collision unchanged); rinkjob.js hubcap shot stands back to frame the pancaked cart, Zamboni and hubcap | before/sheet-rink.png, sheet-rinkb.png → rink-*.png |
| 9 | Workshop room unfinished (P15) | workshop.js #dress(): schist rock walls (the park's texture), pipes + valve wheel, three strings of festoon bulbs (unlit material, no new lights), crates, a heap of spare spike strips, a painted "THE WORKSHOP · Night Crew Engineering" board, generated Mecha-Pigeon blueprints on a cork board, a cone/trash can/pizza box, four raccoons and a rat watching (existing models). All hidden with the room when the camera is away (perf rule) | before/d1280-workshop-full.png (panel), sheet-wedb.png → p15-workshop-d1280/d1920/p844.png |
| 10 | Board: DONE stamp over titles; lone-word wraps (P10). Postcards wrap at ~100 px, mixed case (P11) | ui.css: titles take the card's width except done cards (52 px for the smaller stamp); postcards full width; names title case (Sled Dog Statue, Mushroom Statue, Zoo Wall) | before/d1280-board-finale-schemes.png, d1280-board-finale.png → p10-board-finale-*.png, p11-postcards-*.png |
| 11 | Naming (P12) | "Strix's Parliament", "Rhoda's Family", "Pond Nest" … "North Woods Nest", Board "A part for the Mecha-Pigeon." | p01-crews-*.png, p19-nest-focus-d1280.png, p19-credits-*.png |
| 12 | Map whole view 80% empty; speckled water; THE POND on the grass (P13) | map.js: in a landscape window the whole park is turned a quarter (north to the right, a N arrow), every lake painted flat blue with a pale shoreline, zone names on their namesake water | before/d1280-map-whole.png, d1280-map.png → p13-map-whole-*.png, p13-map-zoomed-*.png |
| 13 | Phone: Board key hints (P8); Controls opens at the bottom (P9); scarf Back cut off | ui.css: key hints never show on a no-hover coarse-pointer screen unless a controller is in use; menu.js keepTop (Controls, Credits open at the top); compact scarf list and Board header on short screens | before/p844-board.png, p844-controls.png, p844-scarf.png → p08-board-hints-p844.png, p09-controls-*.png, p13-scarf-*.png |
| 14 | Report-a-bug form (P7) | report.js: Fredoka/Nunito and the game's ink, title "Report a bug", darker backdrop, balanced hint (no lone "account)."), no screenshot row from the title/Settings (no park on the canvas there) | before/d1280-report-form.png → p07-report-*.png |
| 15 | Nap: bare navy screen, invisible moon, spacing, "called", "…" (P18) | main.js + ui.css: a dusk-to-night gradient and a generated vignette of Gus asleep on his lamppost (breathing); the moon icon purple on the light buttons; paragraph spacing; "allies you called"; "Nap until…"/"Napping until …" both use "…" | before/sheet-nap.png, d1280-nap-menu.png → p18-nap-menu-*.png, p18-nap-fade-*.png |
| 16 | Smaller (P19) | Credits screen: fades at the cut edges, dashed section breaks, crews as one flowing list, "Scroll for more" cue, ↓ hint. Back buttons use ← (× read as PlayStation's ✕ = Select). Controller family switch redraws hints/Controls live (input.js reports it). D-pad drawn as a d-pad; arrow keys as ← → ↑ ↓. Empty carry ring hidden. Pause/Nest/Nap/Confirm/Grates one width (460 px). Menus open on the first usable item (Nest: Save, not the greyed Feather Up) | before/d1280-credits.png, pad-ps-settings.png, pad-ps-pause.png, d1280-nest-menu.png → p19-credits-*.png, p19-pad-*.png, p19-nest-focus-d1280.png |
| 17 | Scarves locked in the finale fixture | Verified in a real save: scratchpad/playtest/wg/save-failed-28-part-power.json (whole-game run, after den-choir and part-talons) holds rainbow-stripe and racing-red; the engine grants gives.scarf (systems/schemes.js). The finale fixture had been built without them: data/fixtures/finale.json now has the three earned scarves (scarves change nothing in play) | p13-scarf-*.png |

## Generation
imagegen2: workshop-blueprints.jpg ($0.06), nap-gus.jpg ($0.07). ≈ $0.13; ledger ≈ $102.91 (design/ASSETS.md).

## Replays
All 40 recorded solutions (32 schemes + 7 alts + finale) replayed after the last gameplay-relevant edit: **40/40 completed, 0 console
errors**, every end time identical to the fun pass's (design/reviews/polish-replays.txt). All 40 rather than the minimum because
shared code changed: hud.js toasts (UI only), menu.js default focus (guarded so replays keep the old first item: recorded raw
menu presses count from it), input.js controller-family refresh, vehicles.js pile meshes. Before that, part-talons and finale were
replayed on their own with screenshots (both completed). check-schemes passes.

Edits after the replay run, all render/CSS only: the loading bar fades at once when the title appears; the wheel's verb for a
controller ("Press"); map legend hints hidden on touch; the HUD portrait always Gus (see below).

## First minutes
human-check (scratchpad/fun/human15.mjs → design/screenshots/polish-fixes/first-15/, 960×540, New Game clicked with the mouse):
reached den-ducks at 331 game-s (same as the fun pass), no console errors; never more than two toasts on screen; new opening
(close-up → wide shoo shot → control) in 001–004. First-load films: first-load-desktop.png, first-load-phone.png (software
WebGL, cache off: the title at ~103 s; the key art, logo, tagline and bar are in the title's place from the first frame).

## Coordinator follow-up
The HUD portrait showed the wheel's highlighted ally (Hazel) while the wheel was open: deliberate older code in main.js hudView()
(not the scarf-portrait wiring), but it read as the player character changing. Now the HUD circle is always Gus (scarf portrait);
the wheel shows the pick (gold ring + gold name pill + centre card). Re-shot: p02-wheel-d1280.png.

## Left / notes
- Credits orbit: the canopy no longer fills the screen, but late in the roll (t ≈ 40 s) big trees still frame the left and right
  edges (finale-credits-t40-d1280.png).
- Whole-park map in landscape still has dark bands above and below (the world box includes the city), much less than before.
- The follow camera right after the opening (perched on the lamppost, PERCH framing 4 m) still shows Gus small; the cutscene
  shots carry the moment now.
- Phone first-film frame 0 is a one-frame mobile-emulation artefact (page laid out before the viewport meta applied).
