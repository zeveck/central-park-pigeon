# Photo mode (#9), 2026-11-22

The owner's issue: "This game should have a photo mode in which it lets you kind of snap photos and save them somewhere that you can download them later. It would be okay if to get photo mode you had to somehow steal a camera and that had like a little quest around it."

Their answer (STATUS request 24): "Adding a quest where you get the camera is good, but it should be on the board/available from the beginning and not too hard? Maybe it's just on a balcony of a building outside the park as a way to get you out there for a minute? And you need to get film from a crow maybe? Just ideas." (Loose ideas: use them, or better ones that serve the same purpose.)

## The quest: "Say Cheese" (on the Board from the start; short, easy, no fail state)

1. **The camera.** A tourist's camera sits on a balcony railing of a Central Park West building, a block outside the park wall near 72nd. It's visible from the park, and it gets Gus out over the street for a minute. Gus perches and Pecks to take it (a carried item, light). The Board card shows the building, and the compass marks it once the card is tracked.
2. **The film.** Flicker, a new named crow who hoards film canisters, lives at the crows' haunt. Flicker trades a canister for 5 crumbs, or for any shiny. That uses the crows' trading flavour from the original request, and it works before the crows are recruited. If Gus has neither, Flicker's line says where crumbs come from.
3. **Load it.** At any Nest, a new "Load film" option, while carrying the camera with film, unlocks photo mode. A short celebratory toast, plus a first-photo prompt.

**No dead ends (#23 rules):**
- The camera and the film are keeper items: a lost one floats back to its source.
- The camera never leaves the balcony for good until loaded.
- The canister can be traded for again.

## Photo mode

- **Open it:**
  - Pause, "Photo";
  - a key: F2 or C, choosing one free key;
  - on a controller, the View/Share button;
  - on touch, a camera button in the HUD once unlocked.

  It only opens in free play: not mid-scene, in a race or fight, or while driving.
- **While it's open:**
  - Time pauses. The HUD hides.
  - A free camera orbits Gus within about 12 m, with zoom and a tilt limit, never inside solids.
  - Options: a few looks (Natural, Film, Black & White, Postcard frame), and Gus poses (Coo, Flap, Puff), which cycle.
  - Allies in view stay in frame.
- **Snap** saves a JPEG of the canvas (UI hidden) with a small "Central Park Pigeon" mark and the date.
  - Shutter sound and a flash.
  - Stored in an in-game album in IndexedDB, up to 60 photos. Past that, it asks to delete old ones. If storage fails, it says so.
- **Album:** from Pause or the photo-mode panel.
  - A grid of thumbnails. Open one to Download (a file), Share (where the browser supports it, e.g. on phones), or Delete (asks first).
  - The album is shared by all save slots. Photos are the player's, not a game save.
- **Input:** mouse, touch, keyboard and controller, matching the existing menus (menu.js focus).

## Assets (within the $20 per-change default)

- A camera prop (a small vintage camera): meshgen, about 30 credits (≈ $0.60), or code-built if a generated model looks wrong.
- A film canister: code-built (simple), or generated with the camera if cheap.
- Flicker: the crow model plus an accessory (a canister on a cord, from the accessory system), and a character-card portrait (imagegen2, ≈ $0.10) like the other named characters.
- A shutter sound (audiogen, ≈ $0.05), unless the synth one is clearly fine.
- Icons: a camera icon for the HUD and Pause (code SVG, in the game's icon set).

## Proof (efficient, per gamegen#52 and #54)

- A recorded solution for the quest (`design/solutions/photo-quest.json`), and the route index updated.
- A state check that photo mode can't open mid-scene, in races or while driving.
- Snap and the album at 1280 and 844: take a photo, find it in the album, download it, delete it. Text scan, and 0 console errors. Controller checked with the fake pad.
- The quest's steps join the risk-based mistake sweep that follows.
- Replays: only solutions whose routes cross the new balcony or Flicker's spot (the route index).

## Design review
(appended below)

Player and Builder reviews. Decisions (these override the plan above):

**Opening and controls**
- V on the keyboard; D-pad right on a controller (Map keeps View and D-pad down: View stays Map to avoid moving a known binding); a HUD camera button (top-right row, ui/hud.js:45) once unlocked; Pause gets "Photo" (check the 11-row Pause list at 844×390).
- Inside photo mode:

  | Device | Controls |
  |---|---|
  | Pad | A snap · X pose · Y look · LB/RB zoom · stick orbit · B exit |
  | Keyboard | Space/Enter snap, P pose, L look, wheel or +/- zoom, mouse or arrows orbit, Esc exit |
  | Touch | drag orbit, pinch zoom, big shutter bottom-right, Pose and Look chips, ✕ top-left |

- Esc/B leaves photo mode (not into Pause).

**The quest, "Say Cheese"**
- It opens after the Prologue (`opensWhen: { flags: ['prologue'] }`), and the entry goes last in SCHEMES before the finale, so `openList()[0]` and the Prologue's tracking don't change.
- **Step 1, the camera:** a tourist leans out of a fire escape on a plain building at 71st–72nd CPW, snapping the skyline, with the camera on the rail. Use an existing perchable fire-escape edge (city.js:134-141): no new collider, well apart from the den-crows ledge shiny (layout.js:747). Gus photobombs (stands in the shot) or Coos to distract him, then Pecks the camera. It's a carried item with an ITEM_SOURCES keeper rule. Add a PLACES entry.
- **Step 2, Flicker** (a new named crow, out in every phase):
  - Flicker stands more than 6 m from every existing interactable, in a tile no indexed route uses (near the crows' haunt but not on the Exchange routes).
  - Flicker wants a portrait instead of crumbs: bring the camera, and Flicker loads the film ("beak-certified"). That sets the flag `photo.film`; film is not a carried item.
  - Flicker poses, and the first photo is of Flicker. That snap completes the quest and unlocks photo mode, which teaches Snap with a payoff. There's no Nest step.
  - Flicker never takes shinies, so there's no clash with the crows' entry fee.
- Every step gets a nudge and an answer (check-schemes). A new CHARACTERS entry, look, accessory (a canister on a cord), dialogue and a portrait.

**Photo mode itself**
- **It's a menu** (G.openMenu), so the clock, schemes, keeper and autosave stop.
- **Camera:** a photo orbit mode on the follow rig, with its ray push-in and ground clamp and dist ≤ 12, never `rig.free`. Each photo tick calls the camera-following world updates (terrain, trees, props, model loading) with the photo camera, and holds `budgetScale` steady.
- **Gus's poses** (Coo, Flap, Puff, Look at camera) are visual only, as are the allies' poses.
- **"Call the crew":** Called or nearby allies gather around Gus for the shot. It's visual only and restores on exit.
- **Options:** a "Hide Gus" toggle, a thirds grid, and the watermark on or off.
- **Capture:** G.render() then drawImage to a 2D canvas capped at 1920 px wide. The looks are done in a pixel loop or shader (no ctx.filter, for Safari), then the mark and date, then toBlob('image/jpeg', 0.9). Snap at full resolution even if Auto lowered the render scale. The live preview uses a CSS filter. Use the existing shutter sound (assets/audio/sfx/camera-shutter.mp3).
- **Album:**
  - **Storage:** an IndexedDB database `cpp-album` v1 with one `photos` store (a Blob plus a thumbnail). A save counts as done on tx.oncomplete; QuotaExceeded or an abort shows a message. 60 photos max, with "delete oldest" in one tap.
  - **Saving and sharing:** the line "Download photos to keep them". Share is the main button where `navigator.canShare({files})` allows, with `<a download>` otherwise; check the desktop wrapper (window.desktop).
  - **Shared by slots:** the album is shared by all save slots. The unlock lives in each slot's state.
- **Assets:** the camera prop via meshgen (about 30 credits; stop and ask if credits run short) and Flicker's portrait (imagegen2, about $0.10). The canister and icon are drawn in code. About $0.70.

**Proof**
- Refresh the route index for all 40 solutions first.
- Replay what crosses the changes: the fire-escape spot (den-cats, den-crows, den-raccoons, den-rhoda, truce-cats-rats and its .alt) and Flicker's tile; plus the prologue (opening tracking).
- Record a solution for the quest.
- Check photo mode at 1280 and 844 with a pad. The quest steps join the mistake sweep.
