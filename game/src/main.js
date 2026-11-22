// Boot, loading, the world build, renderer.compile() behind the loading
// screen, the title, and the game loop: fixed 1/60 s updates (frozen by
// __game.step), one render per animation frame in two passes (the far layer,
// then the main scene over a cleared depth buffer).
//
// Coordinates: game data (layout.js, gameplay, physics, the camera rig) uses
// the design's frame, +x east and +z north. three.js is right-handed with +y
// up, so drawing that frame directly would show a mirror image of Manhattan
// (facing north, east would be on the left). The world is therefore drawn
// through a mirrored root (scale.x = -1) and the render cameras are the
// data-space camera conjugated by the same mirror. Gus's own root (and every
// model: landmarks, humans, carts, the van) is counter-mirrored so it looks
// as modelled; text drawn on canvases is flipped in its texture.
//
// Milestone 2 adds the game on top of the world: the state and save, audio,
// screens and HUD, naps, crowds, people, the flock, allies, items, the Sign
// War, the scheme engine (with the Prologue) and the debug hook's autopilot.
// `G` is the one context object every system reads.
//
// Milestone 2 builder's notes (for milestone 3):
//   - Game state lives in G.state (state/gamestate.js); it IS the save (save.js, cpp-save-v1).
//     Systems keep runtime objects and write their persistent part into G.state.
//   - Everything is on the fixed 1/60 s clock (G.state.time). Use G.later(secs, fn) for delays and
//     G.cutscene.run(name, beats, done) for scripted scenes; never wall-clock time or Math.random
//     in gameplay (rngFor(name) streams; G.reseed() restarts them for fixtures and replays).
//   - G.bus.emit(type, e) feeds the scheme engine (systems/schemes.js): flip, talk, give, pickup,
//     ask, coo, peck, drop, call, nap, grate. A step completes when its `on` matches and its needs
//     hold; `does.script` names a function registered with G.schemes.registerScript (see
//     schemes/prologue.js). Unregistered scripts are logged and the step completes plainly.
//   - Peck targets: G.interact.register({ id, x, y, z, r, label(), act() }).
//   - World-anchored text: G.bubbles.add(text, { at, kind, ttl }); prompts: G.tutor(action, text);
//     toasts: G.toast(text, { kind: 'stamp' | 'bad' }); dialogue: G.say(lines, onDone).
//   - Allies: G.allies.call(crew) / ask(char); talents act through 'ask' events at PLACES.
//   - People: G.humans.flee(point) (swarm, Bully), lure(point, r, to) (Mimic), summonFeeders().
//   - Debug: window.__game (debug.js); the autopilot and goal scripts are in src/debug/.
//
// Milestone 3a builder's notes (the mechanics; for 3b, the scheme content):
//   - Every 3a system is a "mod" in G.mods (built after the world, before the shader warm-up, which
//     compiles their hidden meshes too). A mod may have build(), update(dt), onNap(phase) → notes,
//     setPhase(p), restore() (after a load), panel() (encounter/race HUD html), music(), napBlock(),
//     compass() → [{x, z, icon}], group, debug(). They are: clues, takers, vehicles, fights,
//     spikeRounds, slices, market, race, collect, scarves.
//   - Clues (systems/clues.js) are DATA: layout.js CLUES (dig, dive, grate, teeter, stuck, rig, net,
//     glint, hidden, nighteyes), DOORS, BLOCKERS ("…" humans: mimic / bully / hold-Coo swarm), TRADES
//     ("!" humans the crows trade with), plus every huge world item (haul) and every spike site.
//     A clue is live when `active: { scheme, step, flags, not, phase }` holds. Asking an ally runs
//     Clues.ask → the ally moves, poses (Characters.moveTo / animate), the `does` happens (item,
//     flags, count, spike, sabotage, rig, door, say), then the bus gets 'talent' {ally, talent, clue}
//     and 'ask'. Nothing fits → the old wrong-place line. A clue's `icon` shows the crew's portrait
//     until that talent has been used once (state.seenTalents).
//   - New scheme `on` types: { type: 'talent', clue, ally? }, { type: 'haul', item, ally?, count },
//     { type: 'trade', id }, { type: 'boxOpened', place }, { type: 'give', …, count } (counted in
//     state.counts), 'reach' with `vehicle` and `reachNeeds`; scripts get ctx.abort() (a lost fight).
//     needs.human is checked (humans.isOut). Most talent steps in data/schemes.js are already wired
//     to their clues; check-schemes.mjs still passes.
//   - Giving (systems/takers.js, data/crews.js TAKERS): Peck someone while carrying what they want.
//     Hot-only takers refuse cold slices; world-effect takers (guard, Walter, Vinnie, Rigby's union
//     slice, Ledger's falafel) set flags; others only take it when a scheme step wanted it.
//   - Fights (systems/fights.js): scripts fight.biscuit / fight.vinnie / fight.rhoda / stealth.strix.
//     Driving (entities/vehicles.js): see its header; part-talons s3 fires on flag rink.launched and
//     runs script 'setpiece.rinkjob' (3b: the chain reaction). The Wedding is script 'setpiece.wedding'.
//   - Persistent state added: vehicles, rink, fights, phaseUsed (cleared on naps), clueCounts,
//     cluePings, dealBook, falafel, raceBest, spikePending, counts.
//   - Autopilot goals (src/debug/pilot-*.js): holdCoo, flyTo3, waitEvent, flyRings, faceTo, fight,
//     stealthCross, enter/drive/drivePath/dump/spray/exit/zamboniLaunch; helper ask(crew, at, {clue}).
//
// Milestone 3b builder's notes (Spikes + Feuds & Truces, with the Rink Job and the Wedding):
//   - Scripts: src/schemes/<id>.js for den-songbirds, den-racers, den-horses, part-talons, den-turtles,
//     den-geese, truce-dogs-squirrels, part-legs, part-power, den-rhoda, den-meermob, installed by
//     src/schemes/spikes-feuds.js (one mod in G.mods that hands update/restore/onNap/setPhase/music to
//     each file). Showpieces: src/setpieces/rinkjob.js ('setpiece.rinkjob'), wedding.js ('wedding.intro',
//     'wedding.release', 'setpiece.wedding'). Helpers: src/schemes/_sf-common.js (truceScene: both bosses
//     shake on the Elders' rock after Slowpoke arrives, a polaroid snaps; joinScene; birds() instanced flocks).
//   - The Workshop (src/systems/workshop.js, G.workshop): a sealed room under the Ramble cave with the
//     scaffold; it watches state.parts and plays a cutaway for each new part (drops on, sparks, clank,
//     a "+ PART" polaroid). Any scheme that adds a part gets it for free. G.workshop.room for the finale.
//   - Juice (here, on the fixed clock): G.shake(amp, secs) (render-only camera shake), G.slowmo(k, secs)
//     (the park runs on a slower clock), G.hitPause(secs) (holds every update; G.hurt uses 80 ms).
//   - Small engine additions: vehicles v.scripted + pose(v) (a showpiece drives a vehicle); clues emit
//     'refused' { blocker, talent } when a blocker turns an ally down; a spike site may carry needs/refuse
//     (P4 only via Walter's stairs); audio.cutMusic() + synth 'needleScratch'; G.sfTween / sfStamp /
//     sfFreeze overlays; G.boardShots[id] (a photo on that scheme's Board card: the shot of the century).
//   - Data: PEDICAB_RACE.posted 115 s (the wheeled division); the ice-cream truck parks at (78, -13) by
//     its vendor; BLOCKERS wedding-early / wedding; CLUES rink-shed-steel; TAKERS.mamamask (at install);
//     extra regular/boss lines in src/data/dialogue-sf.js (merged into TALK at install).
//   - Fixtures: game/tools/sf-fixtures.mjs builds <id>.json (prerequisites applied as the engine would);
//     game/tools/sf-run.mjs records/replays solutions (goals in src/debug/goals-sf.js) and writes the
//     per-step fixtures <id>.s<n>.json from the recording.
//
// Milestone 3b builder's notes (Sign War, Slice Run, Lost & Found):
//   - Scripts: src/schemes/<id>.js for den-ducks, den-squirrels, den-rats, den-cats, den-crows, gear-pen,
//     gear-headlamp, part-wings, den-raccoons, sab-middle, sab-north, part-eyes, part-body, den-choir,
//     part-beak, truce-cats-rats, installed by src/schemes/signs-slices-found.js (helpers: _ssf-common.js:
//     joinScene, gather, mechaLine (a boss's one Mecha line, said once after a part exists), bubbleOver).
//     Script names are on the steps' `does.script` in data/schemes.js; star turns: Bubbles (Lake dives),
//     Ledger (every trade, the Wanted board), Express (Sue's relay, the anchovy through the grates),
//     Pickles (drools at the anchovy fan), Encore ("One more!"), Slowpoke (the cats-rats truce waits).
//   - Small additive changes: Puddles sits by the Lake's south shore and Queenie on the 110th sidewalk
//     (crews.js; both were out of Gus's reach); the Delacorte wrench lies by the stage door, outside the
//     theatre's wall (layout.js CLUES; inside it Gus could never reach it);
//     den-ducks s2 no longer gives a second tub of peas (the picnickers drop one at M7: den-ducks.js);
//     den-raccoons s2 alt 2 no longer re-gives the wrench it just picked up; alt 1 (the earring) completes
//     on the Dusk trade (`before` documents the Night half). The G.workshop mod is added to G.mods here.
//   - Engine fix (humans.js reseed): the joggers' fountain-stop timers reset with everything else, so a
//     replay from a fixture no longer depends on what ran before it in the page.
//   - Autopilot: src/debug/goals-ssf.js (SSF[id] goal lists) + pilot-ssf.js (menuPick, napAt, pickItem,
//     talk, nearHuman, humanStopped, eatPile, peckNear). Solutions: design/solutions/<id>.json, alts
//     <id>.alt.json; fixtures <id>.json (the main-path state when it opens) and <id>.s<n>.json.
//
// Polish-1 builder's notes (the 12 new humans; showpiece and UI polish). No main.js code changed.
//   - humans.js: the 12 rigged humans (design/humans-wiring.md) are on the PEOPLE roles (data/people.js; a spec's
//     model may be a list, picked by index, so no random stream moved) and in data/people.js AMBIENT: scenery
//     people kept in G.humans.extras, NOT G.humans.agents, so no scheme, clue, Mimic/Bully/swarm, feeder call or
//     replay sees them. Keep gameplay humans in PEOPLE (append only: ids seed the agents) and scenery in AMBIENT.
//     Clip variants and idle flavour are per clone (visual only). Pools grow lazily up to the caps; spec.vip
//     agents (the wedding) draw past the caps near the camera. spec.seat: 'carriage' (drawn on street.js's
//     carriage box), 'bench', 'stool'; spec.dogs: leashed baked dogs.
//   - Cutscene beats may use a getter (`{ get cam() {…} }`): it is read when the beat starts (wedding, geese).
//     A scene started from inside another scene's `do` skips its beat 0 (see den-crows' no-op first beat).
//   - Rink Job: floodlights, a light pool on the ice and a fresnel rim (Zamboni, carts, ramps) at Dusk/Night
//     (setpieces/rinkjob.js, visual only). Dialogue hides the portrait frame for unnamed speakers.
//
// Finale builder's notes (the Mecha-Pigeon and Feed the Birds):
//   - entities/mecha.js builds the Mecha from the part GLBs plus code parts (painted canvas-noise textures,
//     a small code env map for the chrome); pivots for walk/climb/shout poses; nodes(part) for the Workshop.
//     systems/workshop.js now mounts those nodes (the old placeholder parts are gone) and has the BIGGIFY lever.
//   - src/finale/: finale.js (the orchestrator, a mod: G.finale; registers script 'finale'), biggify.js,
//     stomp.js, climb.js (the ESB in its own THREE.Scene), shout.js (shout, credits, sting). After the
//     finale (flags finale + won) the 18 m Mecha stands on the Great Lawn in free roam.
//   - Shared-file edits (small, additive): this file imports/installs the finale and render() draws
//     G.altView instead of the two passes when it's set; debug.js goTo() forwards the finale stage names
//     to G.finale.goTo; tools/sf-run.mjs also looks goals up in src/debug/goals-finale.js.
//   - Fixture data/fixtures/finale.json (all 17 crews, all 8 parts); solution design/solutions/finale.json.
//
// M4 builder's notes (the whole game: install, offline, bug reports, credits). Small additive edits here:
//   - Offline: manifest.webmanifest + sw.js (registered by index.html's early script; off on localhost unless
//     ?sw=1). ui/offline.js asks the worker to cache what this launch loaded, then the rest; Settings shows
//     "Offline play: …". Deploys stamp sw.js with tools/stamp-sw.mjs (.github/workflows/pages.yml): each file's
//     hash and size, so unchanged files are reused from the old cache and the worker checks storage first.
//   - Report a bug (feedback.md, on): <gh-feedback id="report"> (vendor/gh-feedback.js) at the end of index.html;
//     repo="" until publishing, so no button and no shortcut until then. ui/report.js: G.openReport(),
//     G.reportAvailable(), G.reportOpen(); the button is in Pause and Settings; Ctrl+Shift+L (index.html's early
//     script, L because F is Coo). G.openMenu takes the picture (G.takePauseShot) before the pause screen goes up;
//     createInput's ignore() and touch.js drop all game input while the form is open.
//   - Focus: window blur pauses (not while G.frozen); a hidden tab or pagehide autosaves (not mid-scene, finale,
//     nap, Ruffled or grate travel) and audio.setHidden() suspends the context; any input resumes a suspended
//     context (iOS); a phone turned to portrait mid-game pauses under the "turn your phone" card.
//   - Credits: data/credits.js is the one text (finale roll and the Credits screen, from the title and Settings).
//
// Perf builder's notes (every preset inside its caps; design/perf.md has the numbers and the method):
//   - Measure: node game/tools/perf-probe.mjs --preset high|medium|low [--phases afternoon,night] [--shots dir]
//     (src/debug/perf.js buckets each draw call and its triangles by pass and by what drew it; drawsOff() lets
//     SwiftShader skip rasterising while the pools settle). The governor (render() below) now sits at 1 almost
//     everywhere; humans.js PEOPLE_FLOOR is down to 4 / 3 / 2.
//   - Render-only rule: visibility, LOD and culling never feed gameplay. New helpers: gfx/shadow-only.js
//     (shadowOnly(mesh): drawn in the shadow pass only), gfx/detail-cull.js (G.detailCull: sub-pixel meshes off
//     layer 0, never `visible`), gfx/simplify.js (load-time, UV-aware meshoptimizer LODs; vendor/meshopt_simplifier
//     .module.js, add it to any offline file list). A `.visible = a && b` that can be `undefined` DRAWS (three.js
//     only skips `=== false`): that was the named animals' bug (all 67 drawn everywhere, ~350k triangles).
//   - Small edits here: installShadowOnly(renderer); G.detailCull (built after the finale, updated in render());
//     FAR_CULL.main = renderCam (far tiles the main pass covers are skipped); static Batcher cells 512 m with
//     LOW_FLATTEN on Low; Streamer lodDist; props range; terrain.lodDistance 130 / 85 / 15; flock shadows on High
//     only, 14 drawn birds on Low, 60% birds (index LOD) on Medium and Low; taxis cast no shadow on Low.
//   - Presets (presets.js): trees full / mid / LOD 36 / 84 / 320 (High), 24 / 40 / 160 (Medium), 30 / – / 150 (Low);
//     Medium farDetail 'medium'; Low prop pools 4 / 3. People: a LOD per model (35%, same skeleton) past
//     24 / 16 / 9 m, no accessories past twice that; Low now draws the design's 6.
//
// Playtest notes (Phase 6; shared-file edits, all small):
//   - Whole game in one run: game/tools/whole-game.mjs (New Game → every scheme by its goal script → finale →
//     free roam; saves after each scheme to scratchpad/playtest/wg/, --resume/--from continues one with the title's
//     Continue). Its input log is design/solutions/whole-game/leg*.json. Raw solutions don't chain (see its header).
//   - G.snapshot() (here): saved while driving, Gus is stored beside the vehicle (where getting out puts him), not
//     in it (on Continue he stood inside the hot dog cart with the camera inside it).
//   - world/trees.js: trees within 1.8 m of a Nest are dropped after placement (Pond and Ramble nests had a trunk
//     1.2 m away; Gus stood in its roots and the camera saw bark). No random draw moved.
//   - systems/collect.js: a stray resolved inside a solid (the two Columbus Circle / Merchants' Gate columns, one
//     city block) is lifted onto its top. ui/wheel.js: the autopilot may press ally11+ (crews past the tenth).
//   - finale/finale.js doors shot: a clear camera spot from G.shot (the fixed one sat in the Ramble's trees).
//   - UI: hud.js compass distance labels never overlap each other or N/E/S/W; ui.css: right-hand chips wrap before the
//     goal card, toasts sit below the chip rows, dialogue slide-in keeps its centring, Workshop part icons sized,
//     Board obstacle text balanced; screens.js: scarf names and status on their own lines.
//   - input.js padFamily(): Xbox ids are tested first ("Xbox Wireless Controller" matched the PlayStation pattern, so
//     Xbox pads showed ✕ ○ □ △). ui.css: the ally wheel scales down on short screens (phone: it ran off the bottom);
//     goal titles balanced. index.html: the loading box layout is inline (it jumped when ui.css arrived late).
//   - debug only: sf-run.mjs record also finds the goals-ssf.js scripts; goals-ssf den-raccoons.alt asks Strix from
//     where Gus lands (re-recorded with den-songbirds and part-talons after the nest-tree fix).
//
// Fixes-1 notes (Phase 7 bug hunter + Phase 6 leftovers; design/reviews/phase7-bughunter.md; shots design/screenshots/fixes-1/):
//   - applyState() now starts clean: the old game's G.later timers, its cutscene (G.cutscene.cancel(): dropped WITHOUT
//     its onDone, which used to complete steps in the next game), grate trip, nap/Ruffled fade and the autosave throttle
//     (lastSave, was never reset: autosaves were skipped after New Game) are all cleared. quitToTitle cancels too.
//   - G.midScene(): a cutscene, a busy scheme script, the finale, a nap, Ruffled or a grate trip. Saving then would keep
//     a spent event with an unfinished step, so leaving the page, the graphics reload, Pause's Save and Save & quit keep
//     the last autosave; the AutoProbe doesn't measure (or reload) mid-scene. G.snapshot() during Ruffled saves 3
//     feathers on the last Nest. Nap is blocked while Ruffled. G.autosave() returns whether it saved (the Nest toast).
//   - grateTravel clears G.travel when the trip ends (it was left set: leaving the page never saved again).
//   - schemes/prologue.js G.resumePrologue() (called by continueGame): a save from before the Prologue card rebuilds the
//     first minute's guidance (the opening again for New Game's own save, else Flap/the "!" over the sign; a cut-short
//     feeders scene puts S1's plate back so the peck counts again).
//   - The resize listener is added right after the renderer (a phone turned while loading kept a 393 px canvas);
//     cameras and particles join through resizeHook at the end of boot.
//   - Elsewhere: audio.js music requests carry a token (A→B→A while decoding played two copies); clues.js sets the
//     cufflink's reveal flag together with its spawn; sw.js fetches misses with cache 'no-cache' and index.html +
//     ui/offline.js reload on a new version (at the title, or at the next Save & quit); index.html enlarges the
//     resource-timing buffer; models.js reads manifest.json (the folder listing only with ?dev on localhost);
//     touch.js ignores camera drags while a menu is open and input.reset() clears pending look; Pause's own button
//     closes Pause (menu.js).
//   - Phase 6 leftovers: Controls lists the on-screen controls on touch (and a coarse pointer starts as touch); the HUD
//     chips/meters/goal/compass fade while the Ally wheel is open; camera-rig.js NEST framing (rig.nests, set below)
//     and collision camera-only blockers (addCamBlocker; raySolid(..., { camera: true }) in the rig only) for the
//     Belvedere finial; the loading text waits for Fredoka (no font swap); the Workshop panel shows the real 3D Mecha
//     with the parts you have (ui/mecha-picture.js renders a copy of G.workshop.mecha to a texture, cached per part set;
//     the copy puts its meshes back on layer 0, which detail-cull takes away while the Workshop is far off).
//   - hudView().gusFeetY: the context prompt sits below Gus's feet when the camera is close (it covered him in a Nest).
//   - debug only: sf-run.mjs serve takes an `exit` job (closes its browser). Note __game.step(n, { render: 0 }) renders on
//     EVERY call (n % 0 is NaN); use render: 'none' in long frame-by-frame loops.
//
// Fixes-2 notes (Phase 7 playtester; design/reviews/phase7-playtester.md; shots design/screenshots/fixes-2/):
//   - Here: G.M / G.worldTex (the world's materials and textures, for the finale's ESB city); frameUi toggles body.cine
//     (while a cutscene holds the controls): ui.css fades the portrait, chips, meters, goal card and compass;
//     the Coo tutor ("tap to gather your flock, hold it to swarm") goes after 10 s of play (not counted under menus); the
//     "□ the sign" tutor hides while the context prompt already says "□ Peck the sign".
//   - schemes.js goal() is null while that scheme is busy (no stale goal during its scene); targets(id) for any open card;
//     cardPlaces() for the map's labels. ui/map.js: place names (open cards' places always, explored zones, landmarks when
//     zoomed), dim dashed rings for untracked cards' targets, smooth fog.
//   - cutscene.js: a { cam } beat may carry fov (eased). camera-rig.js glance(): a render-only look layered over the follow
//     camera (signs.js uses it when a sign is pecked from behind); the rig's yaw/dist/pitch never change, so inputs replay.
//   - interact.js / characters.js: characters on the water have a 3.4 m reach and `air` (pickable in flight); pecked from
//     the air, Gus lands on the nearest bank first.
//   - trees.js: a clear corridor for the first flight (Prologue lamp → S1); after every random draw, ids re-numbered.
//   - humans.js a.lie (visual tip-over), food.js bigger crumbs + glow + twinkle (render only), signs.js post behind the
//     board (render only; collision unchanged), audio.js GAPS for dusk/night.
//   - den-ducks step 2 is a two-lesson twist (flip M7, then hold Coo by the picnickers); part-power has 3 steps (the battery
//     comes up inside setpiece.wedding). Re-recorded: prologue, den-ducks, part-power (+ their step fixtures).
//   - prologue.js: the S1 pile is moved in front of Gus (dry ground, clear of the picnickers) and a render-only glance looks
//     at it (he keeps control: a locked camera beat cost up to 12 s of the first minute while the picnickers walked over).
//   - wedding.js: release camera follows Dove up out of the basket (R.trackDove); setpiece.wedding now carries the battery
//     (Bubbles + Rhoda, flag battery.up), the geese's second pass, the photographer's fall and the composed photo; landward()
//     keeps scattering guests off the Lake. finale/climb.js #city(): Manhattan grid in the world's facades, sidewalks,
//     rivers, the skyline band (spire-free), Central Park from G.mapImage; shout.js hero shot from the south, park behind.
//   - debug only: goals.js prologue eats the pile wherever it lands (eatPile); sf-run.mjs record also finds goals.js goals;
//     sf-run.mjs disables the HTTP cache (a `reload` job had kept running edited modules from Chrome's heuristic cache) and
//     takes a `size W H` job (phone-sized shots).
//
// Fixes-3 notes (Phase 7 round 2: design/reviews/phase7-r2-bughunter.md B1–B6, phase7-r2-playtester.md R1, R2, R4–R10;
// R3 was dropped from this pass; shots design/screenshots/fixes-3/; sweep design/reviews/fixes-3-midscene-sweep.md):
//   - G.autosave() never saves while G.midScene() (forced or not): the request waits (savePending) and is made the moment
//     nothing is mid-way; a throttled request waits too. Returns true | 'later' | false (the Nest toast says which).
//     snapshot() stamps saveRev 3. continueGame runs G.schemes.repairSpent({ old }) (systems/schemes.js): a step whose
//     trigger is spent gets it back (clue / trade re-armed, haul unparked, counts one short, a pickup put down; for OLD saves
//     only, a scripted give's item handed back when Gus stands by the taker), and a scheme past its last step finishes.
//   - G.abandonScene(): applyState and quitToTitle drop timers, the cutscene (cutscene.run(..., onDone, onCancel) and
//     G.cutscene.onCancel(fn): undo hooks), the finale (abort), each mod's abandon() (vehicles: out silently, no scripted
//     vehicle, no auto drive, no engine loop), audio.stopLoops(), overlays, body.cine/finale, camera, touch labels.
//   - Swarm (R2): swarmTarget() = nearest FLEES person within 5.5 m in a wide cone; a ring under them while Coo is held;
//     "Nobody close enough to mob." unless a clue/fight handled the coo (e.handled).
//   - setGraphics(g, { auto }) keeps Auto on through the probe's step-down ('auto-<g>'); boot repairs the old footprint (B4).
//   - frameUi: body.cine also on the Zamboni's launch arc (R8). The Prologue hides "Nap" until it's done (interact.js, R1).
//   - Elsewhere: board/map Back returns to Pause (B6); city sign UVs + mirror flip (R4); seat benches/stools for sitters
//     (R5); interact prefers world actions over talk while carrying (R6); map opens zoomed (R7); Zamboni glances off the
//     boards, freeze ring, 92 strips (R8); stomp camera + prompt, shout framing/spire/bread/Gus layers, wedding scatter,
//     photo, veil, basket (R9); tracked scheme follows progress (R10); dead battery clue removed (B5).
//   - Found by the sweep, fixed: characters.goHome clears busyTalent (an ally whose talent a load cut off refused every Ask
//     until a reload); clues.restore drops its anims, busy spots and huge-item rings ("Flock, lift it!" pointed at the old
//     item); rangers.setPhase / street.setPhase put rangers and Prickett back (busy, unscripted after a load); den-geese's
//     march column hides on a load. R3 (the early-puzzle redesign) was taken out of this pass: den-ducks / den-cats as before.
//   - debug only: tools/midscene-sweep.mjs (the quit-mid-scene sweep: goal scripts, or the recorded solution replayed when a
//     goal script can't pick up from a step fixture); sf-run.mjs now really disables the HTTP cache (Network.enable first:
//     before, setCacheDisabled was a no-op and `reload` jobs could run stale modules); goals.js prologue waits on the string
//     'prologue.s1' (same check) so a run can pick up at step 2. Re-recorded: prologue (R1), part-power (R9 basket),
//     part-talons (R8 boards) + their step fixtures; old copies in design/reviews/fix3-backup/.
//
// Fun pass notes (design/reviews/flow-fun-audit.md P1–P12; progress design/reviews/fun-pass-progress.md; shots
// design/screenshots/fun-pass/; replays design/reviews/fun-replays.txt):
//   - Here: G.gusPortrait() (HUD + dialogue show gus-<scarf>.webp for the scarf he wears; gus.webp is the orange); the
//     'ceiling' gus event (feathers + "Oof. Too heavy to go higher." once: entities/gus.js pushes it at the heavy-carry ceiling).
//   - Engine hooks (small, additive): items.js `guards` ((it) => true stops a pick-up; the guard says why) and items with
//     `low` peck at priority 2; humans.js `clings` ((agent, by) => line: a swarm that fails out loud, the agent keeps what
//     it holds) and feeder `spec.group` (one feeder brings the group); the bus event 'fail' { kind } (cold refusals,
//     wrong-place Calls, clings, blocker swarm refusals, lost fights) which systems/schemes.js turns into "nudge within a
//     minute"; clues.js teeter `prop: 'glass'`, does.smash, blocker `swarm.refuse`, haulNow(); race.js assist after 2 losses.
//   - systems/schemes.js: nudges shown live in state.nudged (saved; a setter ignores the old resets); the nudge clock runs
//     only within 80 m of the step's places/targets (or after a failure); cardInfo().revealed → the Board names allies only
//     after the nudge (ui/board.js "A friend from the Slice Run"); the flock tag only above 6.
//   - Schemes: den-ducks (the picnic moved round its own table ~12 m below M7; FEED sign lure; data/people.js 3 specs, same
//     ids), den-cats (Pickles' sill + knock scene; clears P2 as the cats join), den-racers (3 steps; feast in the win scene),
//     gear-sunglasses (new file: framing on the fountain rim; the selfie tourist now faces away from it), gear-pen (patio
//     table + the cats knock a glass; needs den-cats), gear-headlamp (key down the 86th W grate; needs den-rats), den-choir
//     (4 signs), part-beak (horses haul in the kick scene; step 4 on cone.home), schemes/fun-polish.js (P10), prologue
//     (tracks den-rats first; a ranger fixing a sign during step 2 is called out). Every puzzle step has nudge + answer
//     (check-schemes rule). Fixtures: P2 cleared wherever den-cats is done; clue.turtle-key → clue.key-grate.
//   - From the first-15 check (src/debug/human-check.js, a HUD-only "new player"): schemes.targets() points the compass at
//     the character for any talk/give step (it showed only the place and vanished on arrival) and supports target.at
//     ({x, z, label}: the slice tourist, the picnic, the selfie tourist, the 86th grate); the picnic table takes a landing;
//     the Tavern patio table and the waiter's beat moved onto the open terrace south of the building (the old spot was
//     inside its footprint); schemes/fun-polish.js shows the wheel tutor only to players who never Called anyone.
//   - debug only: src/debug/human-check.js (the first-15 "new player"; driven by scratchpad/fun/human15.mjs); goals-ssf/-sf
//     updated for every changed scheme; pilot-drive drivePath takes thenOut (a scene got him out); sf-run.mjs shot timeout 400 s.
//     Re-recorded: den-ducks, den-cats(+alt), den-racers(+alt), gear-sunglasses, gear-pen(+alt), gear-headlamp, den-choir,
//     part-beak(+alt) (+ their step fixtures); old copies in design/reviews/fun-backup/. 40/40 replay: design/reviews/fun-replays.txt.
//
// Polish notes (Phase 8; design/reviews/phase8-polish.md items 1–17; shots design/screenshots/polish-fixes/; log
// design/reviews/polish-fixes.md). Shared-file edits, all small and render/UI only:
//   - Here: the loading bar is a plain div (index.html now lays the loading screen out exactly like the title: same art,
//     crop, logo, tagline, bar where the buttons go, a tiny inline copy of the key art under the real one); no file names
//     under the bar; body.pad on a controller; the nap fade shows assets/ui/nap-gus.jpg (#fade.nap).
//   - ui/hud.js toasts: a queue, at most two on screen, held while a cutscene holds the controls or dialogue is open (a
//     scene's own note passes { now: true }); stale non-stamp notes drop after 40 s of waiting. No more bare "+ PART"
//     (schemes.js) or "+ PART: Talons" (rinkjob.js): the Workshop cutaway's polaroid and note name the part.
//   - ui/menu.js: focusFirst() skips greyed (.dis) items, except during a replay (recorded raw menu presses count from
//     the old first item); screens with keepTop (Controls, Credits) open at the top; a screen's onDevice() redraws it
//     when the input device or controller family changes (input.js now reports a family change).
//   - ui.css: one selection at a time (an orange .primary gives up its fill while a sibling has focus); wheel layout from
//     wheel.js layout() (no transform scaling); key hints hidden on phones unless a controller is in use.
//   - World/scenes (render only): prologue opening shots (close-up, then a wide side-on shot; rig pitch 0.02), rink
//     hubcap shot reframed, the frozen ramp is a snow kicker (vehicles.js moundGeometry), Workshop dressing
//     (workshop.js #dress), credits camera lifts over canopies, finale captions in a pill and cleared per stage.
//   - Data: crew names "Strix's Parliament", "Rhoda's Family"; Nests "Pond Nest" etc.; postcards title case; the finale
//     fixture now holds the three earned scarves (the engine grants them; the fixture had missed them).
//   - hudView().portrait is always Gus (it showed the wheel's selected ally in the HUD circle, which read as a new player).
//
// Boot fix notes (loading froze under "Planting the trees", Chrome "Page Unresponsive"; design/reviews/boot-fix-progress.md):
//   - Cause: world/terrain.js finish() painted leaf litter as one blur(3px)-filtered arc per tree (~2500) on the 800×2504
//     CPU mask canvas. Each filtered draw is its own blurred layer, all rasterised in CanvasRenderingContext2D::FinalizeFrame
//     at the next paint: 68 s on the main thread (Chrome trace), shown under the stale label. Now: discs unblurred on a scratch
//     canvas, blurred once onto mask B (mask B max diff 8/255; mask A, the heights and the trees are bit-identical).
//     paintMasks()/buildTerrain() are async and yield between shape groups (same draws, same masks).
//   - Warm-up (gfx/warm.js): compileQuiet (compileAsync where KHR_parallel_shader_compile exists, else compile()); gpuIdle (a
//     fence polled from timers); primePrograms (uniforms fetched while the GPU is idle); uploadTextures (batched initTexture);
//     then render() and gpuIdle again. No task waits on the GPU.
//   - ui/map.js renderMapImage is async: keeps the scene's fog pushed out of reach (fog = null had compiled a second
//     variant of every program), compileAsync for the rest, readRenderTargetPixelsAsync (PBO) instead of readPixels.
//   - stage() waits a frame before changing the label too, so work a stage defers to the next paint shows under its own label.
//
// Land/perf notes (the user: "Is there a trick to landing?" and "slow even on my desktop"; design/reviews/land-perf-progress.md;
// shots design/screenshots/land-perf/). Shared-file edits:
//   - entities/gus.js: Land / Dive. Holding it is the old dive, unchanged. New: a short TAP (≤ 0.3 s, not within 0.25 s of
//     holding Flap: that's a trim, and den-meermob.alt's recorded trims latched) while within 10 m of what's below (not water) lands too (gus.landLatch: a gentler descent, 5 m/s forward, 6.5 m/s down, a 1 m perch catch);
//     Flap, boost, a splash, locked input (LOCKED_INPUT.locked, here) or 4 s cancel it. A wing flare in the last 2 m (looks
//     only). gus.glideT / gus.lowAlt are read by the HUD only.
//   - Here: hudView() shows "<Land key> Land" (landPromptWanted: flying and low, a perch below, within 30 m of a target or
//     waypoint, or 3 s gliding; not over water, not in scenes, wheel, encounters/races (panel), or under another prompt or a
//     tutor). glyphs.js / touch.js / screens.js: the action is "Land" on touch and "Land / Dive" in Controls.
//   - Perf, render only (the sim is untouched; same seeds, same results): humans.js pose() and crowds.js draw() do the clip
//     choice, mixers, dogs and the instance refill once per DRAWN frame (render() calls them), mixers at 1/2 or 1/3 rate past
//     14 / 30 m; while render() runs, hidden subtrees skip updateMatrixWorld (the Object3D patch at the top); a frame with no
//     update since the last isn't redrawn (120/144 Hz screens); hud.js / bubbles.js write the DOM only when a value changes
//     (the compass strip reuses its spans). presets.js: High pixelRatio 1.5 (was 2); AutoProbe judged on whole windows
//     (it reset on any single fast frame, so it never stepped down in play) and a toast before and after the reload.
//   - FPS readout: Settings "Show FPS" (settings.showFps) or ?fps=1 → #fpsbox: drawn fps, frame ms (worst), CPU per update
//     and per drawn frame, preset and pixel ratio.
//
// Guidance notes (the user: "'Land by the sign' is way too vague. We need something better guiding you to an available next
// thing to do without being too pushy."; design/reviews/guidance-progress.md; shots design/screenshots/guidance/). UI only:
// no rule, timer or random stream changed, and nothing reads the new input in a replay. Shared-file edits:
//   - Here: G.guide = new Guide(G) (ui/guide.js) after the wheel; update() turns a 'where' press into G.guide.request() (free
//     play only, like Map/Board); gameplay() calls G.guide.tick(dt) after the schemes (reads only: the idle clock);
//     frameUi() calls G.guide.render(project) (the marker, the "Where to?" line, the "Something to do" card); applyState()
//     resets it.
//   - data/schemes.js: every goal names a visible thing and where it is; every step has `where` (a location, never the method;
//     ui/guide.js reads it); a few nudge/obstacle "where" phrases. tools/check-schemes.mjs checks `where` and goal length.
//   - systems/schemes.js targets(): each target also carries y (where the marker sits) and sign (its id); the compass still
//     reads x, z only. input.js: action 'where' (KeyG, pad button 11 = R3/RS); glyphs.js: its key/pad/touch names.
//   - ui/screens.js: Settings "Guidance: Subtle / Normal / Off" (settings.guidance, save.js default 'subtle'); Controls rows.
//     ui/board.js: the foot's "Something to do" line with "Track it". ui/touch.js: a tap on the compass or the card is not a
//     camera drag. ui.css: #guidemarks, #whereto (heads the toast column), #hud .suggest, #board .foot .todo.
//   - Text whose length could move a replay: three dialogue lines changed (den-rats Sue's meet line, den-crows Cawdry's line,
//     Bella's TALK line), each no longer than before, so every recorded "next" press still lands on a finished line.
//     prologue.js: the "find the sign" toast names the sign and comes after 8 s (was 12; a toast only).
//   - debug only: human-check.js presses "Where to?" on each new card and logs the marker, the line and how each card went.
// Gus rig notes (the user: "the head bob animation could be better and the feet should move"; design/reviews/gus-rig-progress.md;
// shots design/screenshots/gus-rig/). Visual only: no position, collision, timing or input change.
//   - anim/skin-rig.js (new): SkinRig turns a baked static geometry into a SkinnedMesh on a procedural skeleton (bones kept
//     out of the scene, DetachedBindMode + identity bind, so bone matrixWorld = model space); weights from a function of
//     the rest position; makeMesh() for attachments, deformPoint() = CPU skinning of one point.
//   - entities/gus-skin.js (new): GusSkin. gus-stand: root, body, neck, head, tail, leg0/foot0, leg1/foot1 (data in
//     gus-rig.js GUS_STAND.skin, measured from the vertex slices and the pink leg texels). gus-fly: root + two legs
//     (GUS_FLY.skin; its wings stay on Wingbeat). Walk: feet swing on the step cycle and are pinned in world space while
//     planted (no sliding); the head is posed in model space (held still, then thrust; never bobs); body roll/bob; idle
//     look/tilt/weight shift and shuffle steps; the head leads the peck. Flight: legs tuck after take-off, reach down in
//     the flare / any low descent; the flare also pitches the fly model up a touch.
//   - entities/gus.js: NeckBend replaced by GusSkin (gus.neck is now the stand SkinRig; gus.skin the animator);
//     STEP_LEN 0.2 → 0.12 (stepPhase is visual only: the feet's reach sets it); #pose hands the ground pose to the
//     skeleton (standPose keeps only the take-off/landing squash); gus.flare / gus.flareK are looks-only fields.
//   - entities/scarf.js: on a wearer whose rig has makeMesh(), the wrap and knot are SkinnedMeshes on the same bones.
//   - The finale's Gus on the Mecha (finale.js gusMesh) still uses the shared static stand geometry, unchanged.
//   - test/gus-test.js: debug.cam() / debug.weights() for the rig shots; state() reports the feet.
// Polish-2 notes (scarf tails, the guide pin, the "Something to do" card; design/reviews/polish2-progress.md; shots
// design/screenshots/gus-rig/scarf-clip-{before,after}-*.png and design/screenshots/polish2/). Visual/UI only: no rule,
// timer, random stream or input changed (prologue and den-ducks replay to the same end times). Shared-file edits:
//   - entities/scarf.js: cfg.hull, a "radial hull" built once from the wearer's rest geometry (farthest vertex per
//     direction bin from a centre, inside a box that leaves out the head, legs and tail feather); tail points inside it
//     are pushed out radially (+ margin), riding the hull's bone (the body: roll, bob, peck lean). cfg.swing: a cone
//     round each tail's rest direction (which also follows the body). hull.face: ribbons lie flat on the body.
//     Without cfg.hull the old body sphere is used.
//   - entities/gus-rig.js: GUS_STAND.scarf.hull / swing 0.6, GUS_FLY.scarf.hull (body only; the wings are on the shader).
//   - ui/guide.js: the pin moves up (clear 8 px gap) when it would touch the context prompt (#prompt, e.g. "C Land");
//     the prompt never moves. pick() returns { id, title, text }; the text no longer starts with "<Title>: ", the card
//     shows the title as a small muted .sch label over the line, and the nap/crumbs lines say "this one" instead.
//     The card keeps the line's last two words together (span.nw, nowrap): no orphans at 960/1280/1366/1920 wide or on a phone.
//   - ui/board.js: the foot's "Something to do" shows the title as a muted <small class="sch">. ui.css: .sch styles.
// Flight hint / scarf notes (the user: "a jittery button telling me how to land all the time I'm flying in the middle of the
// screen", "the scarf is still clipping through my body as it flutters", "the head movement when walking ... much too
// fast"; design/reviews/flight-scarf-progress.md; shots design/screenshots/flight-hints/, scarf-fix/, flight-scarf/).
// Visual/UI only: no rule, timer, random stream or input changed (prologue, den-ducks, part-talons replay to the same end
// times). Shared-file edits:
//   - Here: gameplay() sets gus.scarf.lod from the camera distance (visual only). The floating "C Land" prompt (landPromptWanted) is gone; hudView().flight = flightHints(): a fixed strip at the
//     bottom centre while flying (after 0.5 s) with Flap, Land and Boost in the device's glyphs (touch: only "Tap [Land] to
//     land"); hidden in scenes, dialogue, the wheel, a vehicle, an encounter/race panel and while a tutor bubble shows.
//     learnHint(k) counts uses (gusEvents: a Flap press in flight, a boost, a landing made with Land held or tapped:
//     hintLandArmed is read before gus.update) into settings.hintsLearnt; at Flap 5 / Land 3 / Boost 3 that hint drops out,
//     and with all three learnt the strip is gone. The tap-to-land itself (gus.js landLatch) is unchanged.
//   - save.js: settings.controlHints 'auto' | 'always' | 'off' and settings.hintsLearnt (in the settings key, so it stays
//     learnt across reloads and new games; loadSettings copies the counts). ui/screens.js: Settings "Control hints: Auto /
//     Always / Off". ui/hud.js: #flighthints (never moves; fades in/out over 0.6 s, keeps its text while fading).
//     ui.css: #flighthints (above the bottom safe area; on touch the bottom-centre 40% is clear of the controls; the drive
//     HUD and dialogue never show with it). ui/guide.js: the pin keeps clear of #flighthints the way it does of #prompt.
//   - entities/scarf.js (the tails): a torso-only radial hull (48x24 bins, dilated so the smooth lookup never dips inside;
//     riding the body bone; acting only up to the top of the box it was built from: a radial hull bulges up the neck and
//     out to a raised tail feather and threw tail points there). New: the posed surface itself as a collider
//     (buildSurface/posedSurface/surfacePush: the skinned vertices within reach of the knot, in a 1.5 cm grid rebuilt each
//     update; the 3 nearest in the 3x3x3 cells round a point give a plane; pushed to 8 mm above it on the ground, 5 mm in
//     flight) for the neck and nape (which the head thrust moves; the roots sank into it), the back and the wing tips;
//     the ribbon's EDGES are pushed out too (only the centre line was); the second tail rides 2 mm higher (no z-fight
//     where they overlap); cfg.keep keep-out limits (#keepOut, each pushing along its plane's normal) and
//     cfg.hull.corridor; the tails leave from the back of the knot and gather to half width into it; tails 0.15 → 0.105 m
//     (tile repeat to match); reset() lays them out outside too. Cost kept down: normals skinned only when a push asks;
//     bone matrices in one typed array and the surface re-skinned only when its bones moved (in flight, never: it is all on
//     the root); the stand surface leaves out what the torso hull covers exactly; no allocations. scarf.lod (set in
//     gameplay() from the camera distance): > 12 m no surface pushes, > 40 m or the finale's alt scene the tails freeze.
//     Cost per update in the test container (A/B, design/reviews/flight-scarf-perf.txt): walking ~0.40 ms median (old
//     ~0.15), flying ~0.29 (old ~0.09).
//   - entities/gus-rig.js: GUS_STAND.scarf hull (torso), surface (margin 8 mm: chords between pushed points sagged into
//     the concave nape and neck/chest fillets at 5), keep (behind z -0.055 the tails go up a ramp over the rump /
//     raised-tail crease, where no collider is reliable); GUS_FLY.scarf hull (torso, corridor |x| 0.03), surface (between
//     the wings, above the legs), keep (on a deep downstroke the wings' trailing feathers sweep in under the shoulders to
//     |x| 0.015: below y 0.14 the tails trail off the back, never below y 0.1, the tail fan), knot and wrap 7-9 mm further
//     back (the knot sat 1 cm inside the nape). Checked with an in-page meter (winding number of ~280 ribbon samples
//     against the posed mesh, wingbeat included, plus ribbon-line / triangle crossings) on every update of 14 sequences.
//   - Head bob (visual only; stepPhase feeds nothing else): gus.js STEP_LEN 0.12 → 0.32 via stepLength(speed) (x1.5 at a
//     sprint as before, and down to 0.4x when shuffling slowly so a slow turn keeps stepping): 3.83 thrusts a second
//     walking, 5.17 sprinting (were 10 and 13.8). gus-skin.js REACH 0.055 → 0.075, HEAD_RANGE 0.03 → 0.04, stance-share
//     floor 0.3 → 0.15, the re-plant distance kept at 0.132 m (DRAG; it was REACH * 2.4), and a planted foot keeps its
//     heading (f.wyaw / f.yawOff: its toes no longer swivel round the ankle in a turn). Planted toes drift 0 mm walking,
//     sprinting and turning (shots design/screenshots/flight-scarf/headbob-*). Footstep sounds are timed from speed.
// Fix-16 notes (the owner: peas gave no feedback; shots design/screenshots/fix-16-19-23/16-*). UI only: no rule changed.
//   - systems/items.js guards are (it, peek) => reason | null; guardReason(it, peek). A refused Peck shows the reason as a toast
//     at Gus EVERY time (it was a bubble over a picnicker, often off screen, then only a blip) and the prompt reads "Guarded: …".
//   - den-ducks.js: "They won't leave the peas while they're sat there…"; outside the Afternoon a Peck at the empty picnic spot
//     says when the picnic is out; "Got peas!" (stamp toast); the ducks bubble and quack when Gus arrives carrying peas.
//     All toasts/bubbles, never G.say, so recorded Peck presses are not spent on dialogue.
//   - debug only: sf-run.mjs serve takes `code <js>` (runs with Playwright's page: real key presses between steps).
// Fix-19 notes (the owner: "The Hot Anchovy" slice; shots design/screenshots/fix-16-19-23/19-*). Shared-file edits:
//   - Here: hudView().carried.word = G.items.heatWord(c): 'Hot' / 'Cooling, still counts' (heat ≤ 0.4, still hot by every
//     taker) / 'Cold' (exactly !isHot). ui/hud.js builds the carry label from one key (the old suffix was only written when the
//     ring changed) and shows a Drop hint in the device's glyph under it; ui.css .carry .lbl two lines.
//   - systems/items.js: hover-warm: a CARRIED slice within 3 m of the halal griddle for 3 s comes back hot (same rule as one
//     lying on it, which still works: den-cats.alt drops it there), 'sliceWarmed' { carried: true }, "Warm again!". Only the
//     halal griddle (not Vinnie's cart or the ice-cream truck: a cart by Queenie would remove the puzzle). anchovyMap: the
//     slice's atlas repainted with anchovies (assets/textures/pizza-slice-anchovy.webp, nanogen), for slice-anchovy only;
//     humans.js gives the anchovy fan the real slice model in it.
//   - systems/takers.js Give: Peck a rat, raccoon, dog (Biscuit's crew, a dog walker's dog) or a seated person while carrying
//     a slice nobody's step wants from them: they eat it (a bubble). Takers and hand-ins win; it scores like small talk in
//     interact.js (grate travel keeps the Peck); never by Queenie with the anchovy; never a Called ally (keeps Ask).
//   - systems/schemes.js goal()/targets(): a cold slice where a step wants a hot one → the card says where the griddle is
//     this phase, and the compass marks it. UI only.
//   - schemes/den-cats.js: losing the anchovy any way puts the next one on the sill 4 s later with a toast naming CPW & 72nd
//     (Night: "out again in the morning"); the compass marks the sill; on step 3 (or after the first push) Pickles gives way
//     at once (a bubble; characters.js talk() honours e.quiet, so no chat dialogue). layout.js SLICE.griddle.dusk and the
//     Dusk halal man (data/people.js) moved off 110th Street onto the park-side pavement: den-cats.alt re-recorded.
// Fix-23 notes (the owner: "You shouldn't be able to fail a mission in a way that makes it so you can never do it";
// table design/reviews/fix-23-solvable.md; shots design/screenshots/fix-16-19-23/23-*). Shared-file edits:
//   - Here: G.dryNear(x, z) (the nearest dry ground; nothing comes back onto water, where Gus can't stand to peck it).
//   - systems/items.js: drop() over water: a slice sinks, anything else floats back (homeFor: the keeper's source, else where
//     it was found if dry, else dry ground by Gus); onRuffled never puts an item on water; give() records a dry origin.
//   - systems/schemes.js: the item keeper (#keep, twice a second, not mid-scene; data/item-sources.js ITEM_SOURCES): a
//     one-time quest item that's nowhere is put back at its source; one in water, or with Gus > 40 m away for 90 s, floats
//     back. Toasts only. keeperRule/keeperSpot. repairSpent runs it too (old saves: den-ducks step 3 with no peas, …).
//   - schemes/den-cats.js: an anchovy left lying 90 s with Gus far away floats back (the sill refills). entities/vehicles.js
//     onNap: Vinnie's rigged cart / the pedicab left away from home is towed back while its scheme is open.
//   - tools/check-schemes.mjs 5c: every step that needs a one-time item has an ITEM_SOURCES rule.
// Batch-2 notes, part A (#5 hop, #2 landing, #18 jitter, #4 flight strip, #13 open sky; design/changes/batch-2.md; shots
// design/screenshots/batch-2a/). Shared-file edits:
//   - #5 entities/gus.js mode 'hop': a Flap tap on ordinary ground hops (~1 m up, ~1.9 m on, then walking). Decided when the
//     0.14 s squash ends: held or pressed again → the old take-off, no added delay; a press mid-hop takes off. Here: hopAllowed()
//     (gus.hopOk, set on the ground press: not carrying, no scene/script/panel/wheel/drive, no step.flight or reach alt); gus.js
//     #hopGround() adds terrain only, no water, drop or step just ahead. A hop's touchdown is a 'land' event with hop: true: soft
//     sound only, no bus event (no scheme, spike or postcard sees it); saved as 'walk'. Touch double-tap Boost waits 0.5 s
//     after liftoff (gus.liftT). REPLAYS: G.legacyTakeoff (debug.js replay(frames, { version }): no version → legacy, never hops);
//     sf-run record writes version 2; the autopilot holds Flap through the squash ({ hop: true } goals may tap); human-check
//     holds 12 frames. Checks: node game/tools/sf-run.mjs check hop (src/debug/hop-checks.js). Prologue tutor "hold to fly".
//   - #2 gus.js landEase: the landing snap is eased on standPose (render only, 0.24 s, from last update's drawn spot; squash
//     after). Also gus.js tap-to-land read input.locked (= POINTER LOCK) as "scene lock", so on desktop with mouse look the tap
//     never latched: now LOCKED_INPUT.scripted. Headless replays never lock the pointer: unchanged.
//   - #18 the frame loop calls syncCameras() before frameUi (bubbles/prompts used last frame's camera: ~12 px lag in a turn, now
//     <0.5 px); debug step() too. input.js: mouse jitter (<24 px in 0.5 s) doesn't switch a controller player to keyboard glyphs.
//   - #4 flightHints(): in flight the rows always show ('off' hides); learnt rows dim (.lt); Drop while carrying; Peck over water.
//   - #13 systems/open-sky.js (G.openSky; tick in gameplay, render in frameUi, reset in abandonScene): see its header. gus.skyMul;
//     audio.js swell(dur) → { stop } and synth 'warpArrive'; ui.css #opensky, #warpfx.
//
// Batch-3 notes, the world holds together (#1 water, #7 grounding, #17 bridges; design/changes/batch-3.md, audit
// design/reviews/batch-3-grounding.md, shots design/screenshots/batch-3c/). Shared-file edits:
//   - systems/collision.js: groundFor(x, z, yRef) is the one ground rule for walkers (surface(), but water is a floor for everyone:
//     surface() drops a water body more than a step above yRef, and walkers seeded with terrain.heightAt walked the lake bed);
//     floorAt (the seed: terrain, a bridge deck or the water, never a roof), standable / clearNear (a person's spot, deterministic),
//     walkBlocked / walkFloor (the crowds: 0.5 m cells cached in 16 m tiles, forgotten when a shape is added there), deckAt.
//   - world/terrain.js step 7: every stone and transverse bridge deck height is fixed there (bridgeDecks: the old formula) and the
//     ground is ramped to it at both ends (1 in 6 along, 1 in 2 down the sides; ends more than 3 m apart put the deck halfway:
//     the 79th St bridge by Belvedere had a 5.8 m step); trees placed on an approach are dropped (onRamp, after placement: no
//     random draw moves; a tree on a raised bank lifted its canopy into flight paths). terrain.deckTops →
//     ctx.deckTops (here) → landmarks.js builds the decks at those heights, caps the cut walls under a deck, and leaves a gap in the
//     walls where a shallow crossing has no bridge.
//   - humans.js: homes on water / in solids move to the nearest standable spot (no random draw); wander targets must be standable
//     (same draws); flee targets clearNear; wander/goto steps stop at the water and pushOut of walls (a goto blocked 1 s is done);
//     heights by groundFor; leash dogs by groundFor and never onto water or into solids. Loops (jog, path, route) keep their data.
//   - crowds.js: spawns, wander/scatter/greet targets and every step keep to walkBlocked cells (a roof animal to its roof), the
//     height follows walkFloor each step (it was fixed at spawn: dogs floating downhill, squirrels inside hills), and an animal
//     found in a blocked cell (something built after it spawned) moves to clear ground. Crowds feed no gameplay.
//   - characters.js: #resolve uses groundFor; walk/hop/waddle/slink/road/bound tweens follow the ground (not a straight line
//     through a hill); the water talk reach is 4.5 m while Gus floats (3.4 m otherwise) and def.at.shore gives it to the shore birds.
//   - data: the Pond's picnickers (+ benches) and parkgoers, the Conservatory kid, the Meer parkgoers, the racers' line, the
//     herons, Nightcap, Stilts, Slowpoke (to the bank, shore: true), Mama Mask and Tiny moved to dry, clear ground.
//   - entities/gus.js: gus.floating (walk mode on the water): see FLOAT there. The edge is a wall on foot (event 'edge'), a gentle
//     arrival floats him (event 'float', not 'land'), a fast low touch still splash-bounces, and the water is a floor in flight too
//     (a steep dive used to pass a step below it and land on the bed). Here: 'edge'/'float' splashes, and flightHints() shows
//     "Flap to take off" + the Peck line while afloat (hudView hides the context prompt meanwhile: they overlapped on a phone).
//   - debug only: src/debug/ground-audit.js (runGroundAudit: every walker's feet for ~60 s, and each bridge end's step) and
//     src/debug/float-checks.js (every water conversation from the water; edge, settle, paddle, drop, take-off, skim).
// Batch-3d notes (#12 fences, #10 flock join, #11/#7 the dogs' walk; design/changes/batch-3.md; shots
// design/screenshots/batch-3d/). Visual only: no collision, perch, timer, random stream or input changed.
//   - world/fences.js (new): the Reservoir ring, the ball-field backstops and the Conservatory Garden gate are code-built
//     3D iron / chain-link merged into the static batch (was a tiled alpha plane: doubled, floating). landmarks.js keeps
//     every collision box and perch exactly as it was. gfx/batch.js add(..., { shadow: false }) keeps thin pieces out of
//     the static shadow proxy. tools/perf-probe.mjs has a great-lawn spot.
//   - entities/flock.js arrive(p, { delay, layer, sheen, onArrive }): a joined stray flaps up and arcs ~1 s to its slot (a
//     one-instance flyer past the drawn cap); systems/collect.js: the stray hops first, the stamp toast comes on arrival
//     (state, the 'stray' event and the autosave stay at the Peck). flock.update(0) no longer NaNs the birds' bank.
//   - anim/dog-gait.js (new): a vertex-shader trot for the unrigged dog GLBs (legs by quadrant, diagonal pairs, head nod,
//     tail wag; stride from ground covered; legs straight when still; the lying mastiff gets no legs). Hooks: humans.js
//     leash dogs (uniforms per dog, no bounce), characters.js named dogs and crowds.js crowd dogs (an instanced aGaitI;
//     crowd dogs no longer roll).
import * as THREE from 'three';
import { choosePreset, PRESETS, AutoProbe, savePreset } from './presets.js';
import { Progress, TextureStore } from './gfx/textures.js';
import { loadWorldTextures, createMaterials, U, LOW_FLATTEN } from './gfx/materials.js';
import { ModelRegistry } from './gfx/models.js';
import { Batcher } from './gfx/batch.js';
import { installShadowOnly } from './gfx/shadow-only.js';   // perf pass
import { DetailCull } from './gfx/detail-cull.js';         // perf pass
import { simplifiedGeometry, simplifierReady } from './gfx/simplify.js';   // perf pass
import { gpuIdle, primePrograms, sceneTextures, uploadTextures, compileQuiet } from './gfx/warm.js';   // boot fix
import { Collision } from './systems/collision.js';
import { TimeOfDay, PHASES, PHASE_ORDER } from './systems/timeofday.js';
import { buildTerrain } from './world/terrain.js';
import { buildWater, createWaterMaterial } from './world/water.js';
import { placeTrees, addTreeCollision, TreeSystem } from './world/trees.js';
import { placeProps, buildProps, buildWall, buildNests, buildGrates } from './world/props.js';
import { buildLandmarks, buildTransverses, findCrossings, Streamer, onRamp } from './world/landmarks.js';
import { buildCity, buildTaxis } from './world/city.js';
import { buildFarLayer, FAR, FAR_CULL } from './world/farlayer.js';
import { skyUniforms } from './world/sky.js';
import { createLights, followShadow } from './world/lights.js';
import { SUMMIT_PERCHES, VIEWS, zoneAt, LANDMARKS, NESTS, GRATES, PROLOGUE, PLACES, WATER } from './world/layout.js';
import { createInput } from './input.js';
import { CameraRig } from './camera-rig.js';
import { Gus } from './entities/gus.js';
import { Scarf, KNIT_TILE_TINT } from './entities/scarf.js';
import { GUS_FLY } from './entities/gus-rig.js';
import { Flock, VISIBLE_MAX } from './entities/flock.js';
import { Wingbeat } from './anim/wingbeat.js';
import { Particles } from './fx/particles.js';
import { TouchControls } from './ui/touch.js';
import { installDebug } from './debug.js';
// milestone 2
import { freshState, derived, cloneState } from './state/gamestate.js';
import { loadSettings, saveSettings, loadGame, saveGame, hasSave, clearGame, migrate, setSlot, currentSlot, freeSlot, listSlots, removeSlot, lastSlot } from './save.js';
import { AudioEngine } from './audio.js';
import { Hud, metersFor } from './ui/hud.js';
import { Dialogue } from './ui/dialogue.js';
import { Bubbles } from './ui/bubbles.js';
import { Menus } from './ui/menu.js';
import { titleScreen, pauseScreen, settingsScreen, controlsScreen, creditsScreen, confirmScreen, slotsScreen, napScreen, nestScreen, scarfScreen, grateScreen } from './ui/screens.js';
import { boardScreen } from './ui/board.js';
import { mapScreen, renderMapImage, FogOfWar } from './ui/map.js';
import { rosterScreen } from './ui/roster.js';
import { Wheel } from './ui/wheel.js';
import { Guide } from './ui/guide.js';
import { OpenSky } from './systems/open-sky.js';   // Batch-2 (#13)   // guidance: the soft marker, "Where to?", "Something to do"
import { glyph } from './ui/glyphs.js';
import { Interact } from './systems/interact.js';
import { Items, grateBlockedReason } from './systems/items.js';
import { Food } from './systems/food.js';
import { Signs } from './systems/signs.js';
import { Spikes } from './systems/spikes.js';
import { SchemeEngine } from './systems/schemes.js';
import { Cutscene } from './systems/cutscene.js';
import { Humans } from './entities/humans.js';
import { FLEES } from './data/people.js';
import { SCARVES } from './ui/screens.js';   // fun pass: a Gus portrait per scarf
const SCARF_PORTRAITS = new Set(SCARVES.map((s) => s.id).filter((id) => id !== 'slice-orange'));   // Fixes-3 (R2): who a swarm can mob
import { Crowds } from './entities/crowds.js';
import { Characters } from './entities/characters.js';
import { Allies } from './entities/allies.js';
import { Rangers } from './entities/rangers.js';
import { Street } from './entities/street.js';
import { installPrologue } from './schemes/prologue.js';
// milestone 3a: the mechanics the 30 schemes use (each is a "mod": see G.mods below)
import { Clues } from './systems/clues.js';
import { Takers } from './systems/takers.js';
import { Vehicles } from './entities/vehicles.js';
import { Fights } from './systems/fights.js';
import { SpikeRounds } from './systems/spike-rounds.js';
import { Slices } from './systems/slices.js';
import { Market } from './systems/market.js';
import { Race } from './systems/race.js';
import { Collect } from './systems/collect.js';
import { Scarves } from './systems/scarves.js';
// milestone 3b (Sign War, Slice Run, Lost & Found): the Workshop scaffold and those schemes' scripts
import { Workshop } from './systems/workshop.js';
import { installSignsSlicesFound } from './schemes/signs-slices-found.js';
// milestone 3b (Spikes, Feuds & Truces): those schemes' scripts and the two showpieces
import { installSpikesFeuds } from './schemes/spikes-feuds.js';
// finale: the Mecha-Pigeon (entities/mecha.js, used by the Workshop) and Feed the Birds (src/finale/)
import { installFinale } from './finale/finale.js';
import { SCHEME, NAP_CLEARS } from './data/schemes.js';
import { PHASE_LABEL, CHARACTERS } from './data/crews.js';
import { patchMorphArray, loadMorphArray } from './gfx/morphs.js';
import { installReport } from './ui/report.js';
import { installPhoto } from './ui/photo.js';   // photo mode (#9)
import { installOffline } from './ui/offline.js';

const DT = 1 / 60;
// Land/perf: while the renderer walks the scene for a frame, a hidden subtree (pooled people and their 50-bone skeletons,
// the Workshop, parked clue props, …) skips its matrix update: it isn't drawn, and it is brought up to date the frame it
// shows again (updateMatrix() flags it, and a skipped node is flagged too). Outside render() nothing changes, so
// getWorldPosition() and the sim see exactly what they saw before. Render only.
let skipHiddenMatrices = false;
const _umw = THREE.Object3D.prototype.updateMatrixWorld;
THREE.Object3D.prototype.updateMatrixWorld = function (force) {
  if (skipHiddenMatrices && this.visible === false) { this.matrixWorldNeedsUpdate = true; return; }
  return _umw.call(this, force);
};
const MIRROR = new THREE.Matrix4().makeScale(-1, 1, 1);
const NAP_SECS = 3;
const LOCKED_INPUT = { locked: true, scripted: true, held: () => false, pressed: () => false, axis: () => 0, move: () => ({ x: 0, y: 0, edge: false }) };

const G = {
  DT, ready: false, frozen: false, paused: false, simTime: 0, updates: 0, fps: 60, lastStats: { triangles: 0, calls: 0 }, lastFarStats: null,
  screen: 'loading', ui: { introQueue: [] },
};
window.__G = G;
installDebug(G);

// ------------------------------------------------------------------ a tiny event bus (game-time, synchronous)
function makeBus() {
  const subs = new Map();
  return {
    on(type, fn) { if (!subs.has(type)) subs.set(type, new Set()); subs.get(type).add(fn); return () => subs.get(type).delete(fn); },
    emit(type, e = {}) {
      for (const fn of subs.get(type) || []) fn(type, e);
      for (const fn of subs.get('*') || []) fn(type, e);
    },
  };
}

const loadingEl = document.getElementById('loading');
const barEl = document.getElementById('loading-bar');
const labelEl = document.getElementById('loading-label');
let loadingShown = 0;
const setLoading = (f, label) => {
  // Never move backwards: downloads that finish during the build stages (and the texture-upload sub-progress)
  // report their own, lower fractions, which used to make the bar jump back and forth.
  loadingShown = Math.max(loadingShown, Math.max(0.03, Math.min(1, f)));
  if (barEl) barEl.style.width = (loadingShown * 100).toFixed(1) + '%';   // polish: a plain bar (index.html)
  if (labelEl && label) labelEl.textContent = label;
};
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function boot() {
  await document.fonts?.load('700 40px Fredoka').catch(() => {});
  const settings = loadSettings();
  G.settings = settings;
  // Fixes-3 (bughunter-2 B4): the auto probe's step-down used to store a plain 'low' (setGraphics overwrote its
  // 'auto-low'), so Auto was gone for good while Settings still said Auto. That footprint (Settings on Auto, a plain
  // preset stored) is read as the auto step-down it was.
  try { const sp = localStorage.getItem('cpp-preset'); if (settings.graphics === 'auto' && PRESETS[sp] && sp !== 'high') savePreset('auto-' + sp); } catch { /* */ }
  const { preset, auto, reason } = choosePreset();
  G.preset = preset; G.presetAuto = auto; G.presetReason = reason;
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

  // ---------------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: preset.id !== 'low', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  installShadowOnly(renderer);   // perf pass: shadow-only casters (gfx/shadow-only.js)
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.domElement.id = 'game';
  document.body.prepend(renderer.domElement);
  G.renderer = renderer;
  // Fixes-1 (bughunter #1): a phone turned while loading kept the canvas at its old size, because the listener
  // came at the end of boot. Listen from here on; the cameras and particles join in once they exist (resizeHook).
  let resizeHook = null;
  const onResize = () => { renderer.setSize(innerWidth, innerHeight); resizeHook?.(); G.needRender = true; };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);

  // polish (P6): no raw file names under the bar ("Loading far-skyline-night.png"); the label set in index.html stays
  const progress = new Progress((f) => setLoading(f * 0.6, null));
  G.progress = progress;
  const store = new TextureStore({ scale: preset.textureScale, anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()), progress });
  const registry = new ModelRegistry({ progress });
  G.registry = registry;
  await registry.init();

  // ---------------------------------------------------------------- assets
  const [tex, bands, stand, fly, knit, treeGlbs, propGlbs, flockFly] = await Promise.all([
    loadWorldTextures(store, { facadeMax: preset.facadeMax }),
    Promise.all([
      store.load('bg/sky-clouds-band.png', { maxSize: 2048, wrap: 'mirror' }),
      store.load('bg/far-skyline.png', { maxSize: 2048 }),
      store.load('bg/far-skyline-night.png', { maxSize: 2048 }),
    ]),
    registry.baked('gus-stand'),
    registry.baked('gus-fly'),
    store.load('textures/scarf-slice-orange.jpg', { maxSize: 512 }),
    Promise.all(['tree-elm', 'tree-maple', 'tree-oak', 'tree-elm-lod', 'tree-maple-lod', 'tree-oak-lod'].map((id) => registry.baked(id).then((b) => [id.replace('tree-', ''), b]))),
    Promise.all(['lamppost', 'bench'].map((id) => registry.baked(id).then((b) => [id, b]))),
    registry.baked('pigeon-plain-fly'),
  ]);
  if (!stand || !fly) throw new Error('Gus models are missing from assets/models/');
  const textures = { ...tex, clouds: bands[0], skylineDay: bands[1], skylineNight: bands[2] };
  G.store = store;

  // ---------------------------------------------------------------- world
  // Boot fix: a frame BEFORE the new label too. Work a stage defers to the next frame (a 2D canvas is rasterised when the
  // page paints, textures upload at a render) then lands under that stage's own label, never under the next one.
  const stage = async (label, f) => { await nextFrame(); setLoading(0.6 + f * 0.4, label); await nextFrame(); };
  await stage('Laying out the park', 0);
  const terrain = await buildTerrain({ textures });   // boot fix: async (world/terrain.js paintMasks yields)
  const collision = new Collision({ heightAt: terrain.heightAt });
  for (const wb of terrain.shapes.water) collision.addWater({ outline: wb.poly, level: wb.level, id: wb.id, name: wb.name });
  G.terrain = terrain; G.collision = collision;
  G.surfaceY = (x, z, yRef = 400) => collision.surface(x, z, yRef).y;
  // fix-23: the nearest dry ground to a point (items never come back onto the water, where Gus can't stand to peck them):
  // rings out 1 m at a time, 24 bearings; the first dry spot, then 1.2 m further from the water
  // fix-23 review: is a point ON the water (a lying item, a drop from height y)? collision.waterAt is 2D and counts a bridge
  // deck over the Lake as water; the landing surface's kind does not
  G.wetAt = (x, z, y = 400) => collision.surface(x, z, y + 0.1).kind === 'water';
  G.dryNear = (x, z) => {
    if (!collision.waterAt(x, z)) return { x, z };
    for (let r = 1; r <= 60; r += 1) for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!collision.waterAt(px, pz)) { const qx = px + Math.cos(a) * 1.2, qz = pz + Math.sin(a) * 1.2; return collision.waterAt(qx, qz) ? { x: px, z: pz } : { x: qx, z: qz }; }
    }
    return { x, z };
  };
  const { M, noise } = createMaterials(textures);
  G.M = M; G.worldTex = textures;   // Fixes-2: the finale's ESB scene reuses the world's materials, facades and skyline
  const batch = new Batcher(M, { name: 'static', cell: 512, castShadow: preset.casters.static, flatten: preset.id === 'low' ? LOW_FLATTEN : null });   // perf pass: 512 m cells (was 256): fewer draws per material
  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic';
  const ctx = { batch, collision, heightAt: terrain.heightAt, deckTops: terrain.deckTops, registry, dynamic, blockers: [], summits: {}, streams: [], M };

  await stage('Building the landmarks', 0.08);
  buildLandmarks(ctx);
  buildTransverses(ctx, findCrossings(terrain.shapes));
  await stage('Building the city', 0.16);
  const city = buildCity(ctx);
  buildWall(batch, collision);
  buildNests(batch, collision, terrain.heightAt);
  const grates = buildGrates(batch);
  await stage('Planting the trees', 0.24);
  const propsData = placeProps(terrain, { blockers: ctx.blockers });
  const props = buildProps(propsData, { noise, collision, glb: Object.fromEntries(propGlbs.filter(([, b]) => b)), pools: preset.propPool, range: { high: 300, medium: 220, low: 120 }[preset.id] });   // perf pass: range
  const trees = placeTrees(terrain, ctx.blockers).filter((t) => !onRamp(terrain.deckRamps, t.x, t.z));   // batch-3 (review): none on a bridge approach
  addTreeCollision(trees, collision);
  terrain.finish(trees);
  terrain.lodDistance = { high: 130, medium: 85, low: 15 }[preset.id];   // perf pass: was 130 / 100 / 60
  const water = buildWater(terrain.shapes, createWaterMaterial());
  const treeSys = new TreeSystem({ trees, textures, caps: { ...preset.trees, casters: preset.casters.trees }, fullModel: preset.fullTreeModel, lodModel: preset.lodTreeModel || 'glb', glb: Object.fromEntries(treeGlbs.filter(([, b]) => b)), lowDetail: preset.blobDetail === 0 });
  G.trees = treeSys;
  G.props = props;
  G.propsData = propsData;
  treeSys.shadowRadius = preset.shadowBox / 2;
  const taxis = buildTaxis(collision);
  taxis.castShadow = preset.id !== 'low';   // perf pass: Low casts from Gus and near props only

  G.summits = {};
  for (const s of SUMMIT_PERCHES) {
    let p = null;
    if (s.on === 'ground') { p = { x: s.x, y: terrain.heightAt(s.x, s.z), z: s.z }; collision.addPerch({ ...p, r: 1, id: s.id, kind: 'summit' }); }
    else if (s.on === 'hero:twin-towers') p = ctx.summits[s.on]?.[s.tower];
    else p = ctx.summits[s.on];
    if (p) G.summits[s.id] = { x: p.x, y: p.y, z: p.z, name: s.name };
    else console.warn('summit perch not resolved', s.id);
  }

  await stage('Painting the skyline', 0.32);
  const scene = new THREE.Scene();
  scene.name = 'main';
  scene.fog = new THREE.Fog(0xe6dccb, preset.fog[0], preset.fog[1]);
  const world = new THREE.Group();
  world.name = 'world (mirrored root)';
  world.scale.x = -1;
  scene.add(world);
  const staticGroup = batch.build();
  world.add(terrain.mesh, water.group, staticGroup, dynamic, props, treeSys.group, taxis);
  G.scene = scene; G.world = world;

  const far = buildFarLayer({ terrain, trees, masses: city.masses, waterBodies: water.bodies, textures, detail: preset.farDetail });
  far.scene.fog = new THREE.Fog(0xe6dccb, preset.fog[0], preset.fog[1]);
  const farRoot = new THREE.Group();
  farRoot.name = 'far (mirrored root)';
  farRoot.scale.x = -1;
  while (far.scene.children.length) farRoot.add(far.scene.children[0]);
  far.scene.add(farRoot);
  const farHemi = new THREE.HemisphereLight(0xbfe0f5, 0x6f9a4a, 1.2);
  const farSun = new THREE.DirectionalLight(0xffd29a, 2.4);
  farRoot.add(farHemi, farSun, farSun.target);
  G.far = far;

  const lights = createLights(world, preset);
  const tod = new TimeOfDay({ lights, scene, farScene: far.scene });
  G.tod = tod;
  G.setPhase = (p) => {
    const P = tod.set(p);
    farHemi.color.copy(lights.hemi.color); farHemi.groundColor.copy(lights.hemi.groundColor); farHemi.intensity = lights.hemi.intensity;
    farSun.color.copy(lights.sun.color); farSun.intensity = lights.sun.intensity;
    farSun.position.copy(lights.sunOffset).multiplyScalar(100);
    far.ring.glow.material.opacity = P.night;
    return P;
  };

  // ---------------------------------------------------------------- state, input, audio, UI
  G.state = freshState();
  G.bus = makeBus();
  const audio = new AudioEngine(settings);
  G.audio = audio;
  const input = createInput(window, {
    canvas: renderer.domElement,
    onPointerLockLost: () => { if (G.screen === 'play' && !G.menus.open) G.pause(); },
    onFirstInput: () => audio.unlock(),
    ignore: (e) => G.reportOwns?.(e),   // M4: the bug report form is open (or the event is aimed at it)
    onDevice: () => { G.menus?.refreshHints(); document.body.classList.toggle('touch', input.device === 'touch'); document.body.classList.toggle('pad', input.device === 'gamepad'); },   // polish: .pad (ui.css hides key hints on phones)
  });
  input.onPadLost = () => { if (G.screen === 'play') G.pause('Controller disconnected'); };
  G.input = input;
  const particles = new Particles();
  particles.setPixelScale(innerHeight * renderer.getPixelRatio());
  G.particles = particles;
  for (const s of city.stacks) particles.addEmitter({ x: s.x, y: s.y + 0.1, z: s.z, rate: 7, spread: 0.4 });
  for (const g of grates) particles.addEmitter({ x: g.x, y: g.y + 0.05, z: g.z, rate: 2.5, spread: 1.2 });
  world.add(particles.points);

  const worldApi = {
    collision,
    surface: (x, z, yRef) => collision.surface(x, z, yRef, { y: 0, kind: 'terrain', item: null }),
    groundAt: (x, z, yRef) => collision.groundAt(x, z, yRef),
  };
  knit.anisotropy = 4;
  const scarf = new Scarf({ texture: knit, tint: KNIT_TILE_TINT });
  const gus = new Gus({ stand, fly, world: worldApi, input, scarf });
  gus.root.scale.x = -1;
  world.add(gus.root);
  G.gus = gus;
  G.scarfObj = scarf;
  const headTarget = new THREE.Object3D();
  headTarget.position.set(0, 0, 6);
  lights.headlamp.position.set(0, 0.3, 0.12);
  gus.root.add(lights.headlamp, headTarget);
  lights.headlamp.target = headTarget;

  // the flock: pigeon-plain-fly with its morph array (13 painted layers)
  await stage('Colouring the pigeons', 0.4);
  const flockBase = flockFly || fly;
  const flockWings = new Wingbeat(GUS_FLY.wings);
  flockWings.setStroke(0.8, -0.5);
  const flockMat = flockBase.makeMaterial();
  flockWings.patch(flockMat, { instanced: true });
  const flyMorphs = flockFly ? await loadMorphArray('pigeon-plain-fly', preset.id === 'high' ? 1024 : 512) : null;
  if (flyMorphs) patchMorphArray(flockMat, flyMorphs.texture, { sheen: true });
  const flock = new Flock({
    geometry: flockBase.geometry, material: flockMat, wingbeat: flockWings, count: preset.id === 'low' ? 14 : VISIBLE_MAX, seed: 11,   // perf pass: Low draws 14
    scale: GUS_FLY.scale * 0.96, pitch: 0.8, morph: !!flyMorphs,
    bodyCenter: new THREE.Vector3(GUS_FLY.bodyCenter.x, GUS_FLY.bodyCenter.y, GUS_FLY.bodyCenter.z),
  });
  flock.mesh.castShadow = preset.id === 'high';   // perf pass: High only (was High and Medium)
  world.add(flock.mesh);
  G.flock = flock;
  if (preset.id !== 'high') simplifierReady.then(() => flock.mesh.geometry.setIndex(simplifiedGeometry(flock.mesh.geometry, 0.6, 0.05, 4).index));   // perf pass: 60% birds on Medium and Low
  G.leader = () => ({ position: gus.position, velocity: gus.velocity, yaw: gus.yaw, grounded: gus.grounded || gus.mode === 'hop' });   // Batch-2 (#5): a hop keeps the flock in ground formation

  const aspect = innerWidth / innerHeight;
  const dataCam = new THREE.PerspectiveCamera(60, aspect, 0.05, preset.far);
  const renderCam = new THREE.PerspectiveCamera(60, aspect, 0.05, preset.far);
  const farCam = new THREE.PerspectiveCamera(60, aspect, FAR.near, FAR.far);
  FAR_CULL.main = renderCam;   // perf pass: far tiles the main pass covers are skipped
  G.dataCam = dataCam; G.renderCam = renderCam; G.farCam = farCam;
  const rig = new CameraRig(dataCam);
  G.rig = rig;
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
  const syncCameras = () => {
    dataCam.updateMatrixWorld();
    _m.copy(MIRROR).multiply(dataCam.matrixWorld).multiply(MIRROR);
    for (const c of [renderCam, farCam]) {
      _m.decompose(c.position, c.quaternion, _s);
      if (c.fov !== dataCam.fov || c.aspect !== dataCam.aspect) { c.fov = dataCam.fov; c.aspect = dataCam.aspect; c.updateProjectionMatrix(); }
      c.updateMatrixWorld();
    }
    far.followers.position.copy(dataCam.position);
  };
  G.syncCameras = syncCameras;
  // photo mode (#9): the camera-following world updates, for a camera that moves while the park is paused
  G.followCamWorld = () => { terrain.updateLod(dataCam.position); treeSys.update(dataCam); props.userData.update(dataCam); streamer.update(gus.position, dataCam.position); };

  const streamer = new Streamer(registry, dynamic, ctx.streams, { shadows: preset.casters.static, lodDist: { high: 80, medium: 55, low: 35 }[preset.id] });   // perf pass: landmark LODs
  G.streamer = streamer;

  // systems
  G.interact = new Interact(G);
  G.items = new Items(G);
  G.food = new Food(G);
  G.signs = new Signs(G);
  G.spikes = new Spikes(G);
  G.cutscene = new Cutscene(G);
  G.humans = new Humans(G);
  G.crowds = new Crowds(G, preset);
  G.chars = new Characters(G);
  G.allies = new Allies(G);
  G.rangers = new Rangers(G);
  G.street = new Street(G);
  G.schemes = new SchemeEngine(G);
  G.fog = new FogOfWar(G.state);
  // milestone 3a mods: each may have build(), update(dt), onNap(phase) → notes, setPhase(phase),
  // restore() (after a load), panel() → HUD html, music() → track, group (a three.js group)
  G.clues = new Clues(G);
  G.takers = new Takers(G);
  G.vehicles = new Vehicles(G);
  G.fights = new Fights(G);
  G.spikeRounds = new SpikeRounds(G);
  G.slices = new Slices(G);
  G.market = new Market(G);
  G.race = new Race(G);
  G.collect = new Collect(G);
  G.scarves = new Scarves(G);
  G.mods = [G.clues, G.takers, G.vehicles, G.fights, G.spikeRounds, G.slices, G.market, G.race, G.collect, G.scarves];
  G.workshop = new Workshop(G); G.mods.push(G.workshop);   // 3b: the shared Workshop scaffold
  // UI
  G.hud = new Hud(G);
  G.dialogue = new Dialogue(G);
  G.bubbles = new Bubbles();
  G.wheel = new Wheel(G);
  G.guide = new Guide(G);   // guidance (UI only)
  G.openSky = new OpenSky(G);   // Batch-2 (#13)
  G.menus = new Menus(G);
  for (const f of [titleScreen, pauseScreen, settingsScreen, controlsScreen, creditsScreen, confirmScreen, slotsScreen, napScreen, nestScreen, scarfScreen, grateScreen, boardScreen, mapScreen, rosterScreen]) G.menus.add(f(G));
  installReport(G);
  installPhoto(G);   // photo mode (#9): the 'photo', 'album' and 'photoview' screens, G.photo
  new TouchControls(input, { onPause: () => G.pause(), blocked: () => G.menus.open || G.screen !== 'play' });

  await stage('Waking the park', 0.48);
  await Promise.all([G.items.load(registry), G.humans.load(preset)]);
  G.signs.build();
  G.spikes.build();
  await G.crowds.build();
  await stage('Inviting the crews', 0.62);
  await G.chars.build(G.crowds);
  await G.rangers.build();
  await G.street.build();
  world.add(G.signs.group, G.spikes.group, G.food.mesh, G.items.group, G.humans.group, G.crowds.group, G.chars.group, G.rangers.group, G.street.group);
  G.city = city;
  await stage('Rigging the vehicles', 0.7);
  for (const m of G.mods) { await m.build?.(); if (m.group) world.add(m.group); }
  installPrologue(G);
  installSignsSlicesFound(G);   // 3b: one file per scheme in src/schemes/
  await installSpikesFeuds(G);  // 3b: Spikes + Feuds scheme files, src/setpieces/ (the Rink Job, the Wedding)
  await installFinale(G);       // finale: script 'finale', G.finale (a mod), the climb's own scene via G.altView
  // perf pass: small-detail culling for everything but the big pooled/instanced layers (gfx/detail-cull.js)
  G.detailCull = new DetailCull({ k: { high: 0.0015, medium: 0.002, low: 0.004 }[preset.id] });
  G.detailCull.add(...world.children.filter((o) => !['terrain', 'water', 'static', 'props', 'trees', 'taxis', 'gus', 'flock', 'particles', 'humans', 'crowds', 'characters', 'crumbs'].includes(o.name)));
  // the Prologue's lamppost: the one nearest the Pond's south shore
  const lamps = propsData.lamps.filter((l) => l.z > 2);
  const lamp = lamps.reduce((b, l) => (Math.hypot(l.x - PROLOGUE.lampNear.x, l.z - PROLOGUE.lampNear.z) < Math.hypot(b.x - PROLOGUE.lampNear.x, b.z - PROLOGUE.lampNear.z) ? l : b), lamps[0]);
  G.prologueLamp = { x: lamp.x, y: lamp.y + 3.9 + 0.04, z: lamp.z };

  G.worldStats = {
    trees: trees.length, lamps: propsData.lamps.length, benches: propsData.benches.length, waterBodies: water.bodies.length,
    landmarks: LANDMARKS.length, glbLandmarks: ctx.streams.length, buildings: city.masses.length, waterTowers: city.towers.length, grates: grates.length, nests: NESTS.length,
    collision: { ...collision.count }, staticMeshes: staticGroup.children.length, summits: Object.keys(G.summits).length,
  };

  // ---------------------------------------------------------------- the loop
  function update(dt) {
    input.poll(dt);
    if (G.replayer?.active) G.replayer.tick();
    else if (G.pilot?.active) G.pilot.tick(dt);
    if (G.screen !== 'play') { G.menus.tick(dt); input.endUpdate(); return; }
    if (input.pressed('mute')) G.toggleMute();
    if (G.menus.open) { G.menus.tick(dt); input.endUpdate(); return; }
    if (G.napping) { napTick(dt); input.endUpdate(); return; }
    if (G.ruffling) { ruffleTick(dt); input.endUpdate(); return; }
    if (input.pressed('pause')) { input.endUpdate(); G.pause(); return; }
    const free = !G.cutscene.locked && !G.dialogue.open;
    if (free && !G.wheel.open) {
      if (input.pressed('map')) { input.endUpdate(); G.openMenu('map'); return; }
      if (input.pressed('board')) { input.endUpdate(); G.openMenu('board'); return; }
      if (input.pressed('where')) G.guide.request();   // guidance: "Where to?" (G / R3 / a tap on the compass)
      if (input.pressed('photo') && G.photo?.unlocked()) { input.endUpdate(); G.photo.request(); return; }   // photo mode (#9): V / D-pad right
    }
    if (G.hitStop > 0) { G.hitStop--; input.endUpdate(); return; }   // 3b juice: a hit pause holds the whole park for a few updates
    if (G.shakeT > 0) G.shakeT -= dt;
    gameplay(G.slowT > 0 ? (G.slowT -= dt, dt * G.slowK) : dt);       // 3b juice: slow motion runs the park on a slower clock
    input.endUpdate();
  }
  // 3b juice, on the fixed clock (so replays match): camera shake (render only), slow motion, hit pause
  G.shakeT = 0; G.slowT = 0; G.slowK = 1; G.hitStop = 0;
  G.shake = (amp, secs) => { G.shakeAmp = G.shakeT > 0 ? Math.max(G.shakeAmp, amp) : amp; G.shakeT = Math.max(G.shakeT, secs); G.shakeDur = Math.max(G.shakeT, 0.01); };
  G.slowmo = (k, secs) => { G.slowK = k; G.slowT = secs; };
  G.hitPause = (secs = 0.08) => { G.hitStop = Math.max(G.hitStop, Math.round(secs / DT)); };
  const _shake = new THREE.Vector3();

  let lowStamT = 0, autosaveT = 0, fogT = 0, ambT = 0, footT = 0, flapT = 0, cooHeld = 0;
  function gameplay(dt) {
    const st = G.state;
    let control = !G.cutscene.locked && !G.dialogue.open;
    // the Ally wheel
    if (control && !G.wheel.open && input.pressed('wheel')) G.wheel.show();
    if (G.wheel.open) { G.wheel.tick(); control = false; } else G.wheel.tick();   // (closed: it only prefetches portraits)
    G.dialogue.tick(dt);
    G.cutscene.update(dt);
    G.prologueTick?.(dt);
    runTimers(dt);
    gus.input = control ? input : LOCKED_INPUT;
    const prevMode = gus.mode;
    hintLandArmed = control && gus.mode === 'fly' && (gus.landLatch > 0 || input.held('dive'));   // Flight hint / scarf (read only)
    // Batch-2 (#5): old recordings replay with the old take-off (no hop); a Flap press on the ground learns whether a tap
    // may hop here (gus.js decides when the squash ends; it also checks the ground itself)
    gus.legacyTakeoff = !!G.legacyTakeoff;
    // (any ground Flap press: a perch can turn to walk inside the same update, so a perch press must not leave a stale yes)
    if ((gus.mode === 'walk' || gus.mode === 'perch') && input.pressed('flap')) gus.hopOk = control && hopAllowed();
    gus.noFloat = G.fights.f?.name === 'rhoda';   // Batch-3 (review): in the Rhoda fight a touch on the Meer always splash-bounces
    { const cd = dataCam.position.distanceTo(gus.position); gus.scarf.lod = G.altView || cd > 40 ? 2 : cd > 12 ? 1 : 0; }   // Flight hint / scarf: scarf LOD (visual only)
    const driving = G.vehicles.driving;
    if (driving) G.vehicles.drive(dt, control ? input : LOCKED_INPUT, rig.yaw);
    else gus.update(dt, rig.yaw);
    G.openSky.tick(dt);   // Batch-2 (#13): the badge, the ×2 and the warp (far outside WORLD only)
    // the lamppost wobble in the first minute
    if (G.wobble > 0) { G.wobble -= dt; gus.root.rotation.z = Math.sin(G.wobble * 22) * 0.06 * G.wobble; }
    gusEvents(prevMode, dt);
    if (control && driving) { G.interact.current = null; G.interact.prompt = ''; G.interact.label = null; cooHeld = 0; swarmRingTick(false); }
    else if (control) {
      G.interact.update();
      // Coo: tap gathers the flock, hold swarms what's ahead
      if (input.held('coo')) cooHeld += dt;
      swarmRingTick(input.held('coo') && cooHeld > 0.12);   // Fixes-3 (R2)
      if (cooHeld > 0.35 && !G.swarming) startSwarm();
      if (!input.held('coo') && cooHeld > 0) { if (!G.swarming) coo(); cooHeld = 0; G.swarming = false; }
      if (input.pressed('drop')) G.items.drop();
    } else { G.interact.current = null; G.interact.prompt = ''; cooHeld = 0; swarmRingTick(false); }
    const look = control ? input.consumeLook() : (input.consumeLook(), { dx: 0, dy: 0 });
    if (look.dx || look.dy) rig.free = null;
    flock.update(dt, G.leader(), dataCam.position);
    rig.update(dt, gus, { look, sinceLook: input.sinceLook(), collision });
    followShadow(lights, gus.position, preset);
    treeSys.shadowFocus = gus.position;
    terrain.updateLod(dataCam.position);
    treeSys.update(dataCam);
    props.userData.update(dataCam);
    streamer.update(gus.position, dataCam.position);
    particles.update(dt, gus.position);
    const P = G.profile ? (G.prof = G.prof || {}) : null;
    const t0 = P ? performance.now() : 0;
    G.items.update(dt);
    G.food.update(dt);
    G.signs.update(dt);
    G.rangers.update(dt);
    const t1 = P ? performance.now() : 0;
    G.humans.update(dt, dataCam);
    const t2 = P ? performance.now() : 0;
    G.crowds.update(dt, dataCam);
    const t3 = P ? performance.now() : 0;
    G.chars.update(dt);
    G.street.update(dt);
    for (const m of G.mods) m.update?.(dt);
    G.schemes.update(dt);
    G.guide.tick(dt);   // guidance: reads only (the idle clock for "Something to do")
    if (P) { const t4 = performance.now(); P.systems = (P.systems || 0) + (t1 - t0); P.humans = (P.humans || 0) + (t2 - t1); P.crowds = (P.crowds || 0) + (t3 - t2); P.rest = (P.rest || 0) + (t4 - t3); P.n = (P.n || 0) + 1; }
    U.uTime.value += dt;
    skyUniforms.uTime.value = U.uTime.value;
    st.time += dt;
    G.simTime += dt;
    G.updates++;
    // map fog of war
    if ((fogT += dt) > 0.5) { fogT = 0; const alt = gus.position.y - terrain.heightAt(gus.position.x, gus.position.z); G.fog.reveal(gus.position.x, gus.position.z, alt > 25 ? 110 : 55); }
    // the stamina warning
    if (gus.stamina < 0.2 && gus.mode === 'fly') { lowStamT -= dt; if (lowStamT <= 0) { audio.synth('staminaLow'); lowStamT = 1.6; } } else lowStamT = 0;
    // Fixes-2: the Coo tutor goes after 10 s of play (it lingered 25 s, over menus too)
    if (G.cooTutor) { if (!G.menus.open) G.cooTutorT = (G.cooTutorT || 0) + dt; if (input.pressed('coo') || G.cooTutorT > 10) { G.cooTutor = false; G.cooTutorT = 0; G.tutor(null); } }
    G.hud.tickToasts(dt);
    G.bubbles.tick(dt);
    autosaveT += dt;
    pendingSaveTick();
  }

  /** Batch-2 (#5): a tap of Flap may hop only in ordinary play: not carrying, no scene or scheme script, no encounter, race
   *  or chase (a mod's panel), not on the wheel, and not on a step that wants flight (step.flight or a reach with alt). */
  function hopAllowed() {
    if (G.state.carried || G.midScene() || G.cutscene.locked || G.dialogue.open || G.wheel.open || G.vehicles.driving) return false;
    if (G.mods.some((m) => m.panel?.())) return false;
    const id = G.state.tracked, step = id ? G.schemes.step(id) : null;
    if (step && (step.flight || step.on?.alt != null)) return false;
    return true;
  }

  let hintLandArmed = false;
  function gusEvents(prevMode, dt) {
    const p = gus.position;
    if (gus.mode === 'fly' && gus.input === input && input.pressed('flap')) learnHint('flap');   // Flight hint / scarf
    if (prevMode !== 'takeoff' && gus.mode === 'takeoff') audio.play('take-off', { at: p, vol: 0.8 });
    if (gus.mode === 'fly' && input.held('flap') && gus.stamina > 0) { flapT -= dt; if (flapT <= 0) { audio.play('flap', { at: p, vol: 0.45 }); flapT = 0.32; } }
    if (gus.mode === 'walk' && gus.speed > 0.3) { footT -= dt * gus.speed; if (footT <= 0) { audio.play('footstep', { at: p, vol: 0.25 }); footT = 0.22; } }
    for (const e of gus.takeEvents()) {
      if (e.type === 'leaves') { particles.leafBurst(e.x, e.y, e.z); audio.play('leaves-crunch', { at: e, vol: 0.6 }); }
      else if (e.type === 'splash') { particles.splash(e.x, e.y, e.z); audio.play('splash-hop', { at: e }); }
      else if (e.type === 'edge') { particles.splash(e.x, e.y, e.z, 6); audio.play('splash-hop', { at: e, vol: 0.35 }); }   // Batch-3 (#1): the water's edge stops him
      else if (e.type === 'float') { particles.splash(e.x, e.y, e.z, 14); audio.play('splash-hop', { at: e, vol: 0.7 }); }   // Batch-3 (#1): he settles on the water
      else if (e.type === 'boost') { audio.play('whoosh', { at: p, rate: 1.1 }); if (gus.input === input) learnHint('boost'); }
      else if (e.type === 'bump') { audio.synth('tick'); G.rumble(0.2, 0.1, 80); }
      else if (e.type === 'ceiling') { particles.burst('feathers', e.x, e.y + 0.2, e.z, 4); if (!G.saidCeiling) { G.saidCeiling = true; G.toast('Oof. Too heavy to go higher.'); } }   // fun pass (P10)
      else if (e.type === 'hop') audio.play('flap', { at: e, vol: 0.4 });   // Batch-2 (#5)
      else if (e.type === 'land' && e.hop) audio.play('landing', { at: e, vol: 0.3 });   // Batch-2 (#5): a hop's touchdown is no landing for the schemes
      else if (e.type === 'land' || e.type === 'perch') {
        if (hintLandArmed || (gus.input === input && input.held('dive'))) learnHint('land');   // Flight hint / scarf: a landing made with Land (tap or hold)
        if (G.spikes.onLanding(e)) continue;
        audio.play('landing', { at: e, vol: 0.6 });
        particles.burst('feathers', e.x, e.y + 0.15, e.z, 3);
        if (e.type === 'perch') onPerch();
        else for (const [id, sm] of Object.entries(G.summits)) if (Math.hypot(sm.x - gus.position.x, sm.z - gus.position.z) < 2.5 && Math.abs(sm.y - gus.position.y) < 1.5) summitReveal(id);   // landing on the roof by it counts too
        G.bus.emit(e.type, e);
      }
    }
  }

  function onPerch() {
    const pr = gus.perch;
    if (!pr) return;
    if (pr.kind === 'nest' && pr.id) {
      G.state.lastNest = pr.id;
      // Fixes-1: say "saved" only when it did (a full storage quota fails quietly)
      const saved = G.autosave('nest', true);
      if (saved === true) G.toast(`${G.nestName(pr.id)}: saved`);
      else if (saved === 'later') G.toast(`${G.nestName(pr.id)}: saves when this scene is over`);   // Fixes-3 (B1)
      else G.toast(`${G.nestName(pr.id)}: couldn't save (storage full?)`, { kind: 'bad' });
    }
    if (pr.kind === 'summit' || (pr.id && pr.id.startsWith('summit'))) summitReveal(pr.id);
    for (const [id, s] of Object.entries(G.summits)) if (Math.hypot(s.x - gus.position.x, s.z - gus.position.z) < 2 && Math.abs(s.y - gus.position.y) < 2) summitReveal(id);
  }
  function summitReveal(id) {
    const c = G.state.collectibles.summits;
    G.fog.reveal(gus.position.x, gus.position.z, 280);
    const first = !!id && !c.includes(id);
    if (first) { c.push(id); audio.play('summit-perch-reveal'); G.toast(`Summit Perch ${c.length}/12: the map opens up`, { kind: 'stamp' }); }
    if (id && G.summits[id]) G.bus.emit('summit', { id, first });
  }

  function coo() {
    const st = G.state, n = derived(st).flock;
    audio.play(n ? 'coo-gather' : 'coo', { at: gus.position });
    if (n) flock.coo();
    G.bus.emit('coo', { hold: false, x: gus.position.x, z: gus.position.z });
  }
  /** Fixes-3 (R2): who a hold-Coo swarm goes for: the nearest person who can be mobbed within 5.5 m, in a wide cone
   *  ahead (anyone right beside Gus counts too). It used to aim at a fixed point 3 m ahead, so standing 2 m off the
   *  target, a little off-axis, silently missed: the core early verb. */
  function swarmTarget() {
    const p = gus.position;
    let best = null, bs = Infinity;
    for (const a of G.humans.agents) {
      if (!a.out || a.script || !FLEES.includes(a.role)) continue;
      const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz);
      if (d > 5.5) continue;
      const off = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - gus.yaw), Math.cos(Math.atan2(dx, dz) - gus.yaw)));
      if (off > 1.35 && d > 1.8) continue;
      const score = d + off * 1.5;
      if (score < bs) { bs = score; best = a; }
    }
    return best;
  }
  G.swarmTarget = swarmTarget;
  const swarmRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  swarmRing.visible = false; swarmRing.renderOrder = 4; swarmRing.name = 'swarm-target';
  world.add(swarmRing);
  /** While Coo is held (before and during the swarm), a ring under whoever the swarm will go for. Render only. */
  function swarmRingTick(holding) {
    const n = holding ? derived(G.state).flock : 0;
    const t = holding && n >= 6 ? swarmTarget() : null;
    swarmRing.visible = !!t;
    if (t) { swarmRing.position.set(t.x, (t.y ?? G.surfaceY(t.x, t.z, 5)) + 0.05, t.z); swarmRing.scale.setScalar(1 + 0.08 * Math.sin(G.state.time * 9)); }
  }
  function startSwarm() {
    G.swarming = true;
    const n = derived(G.state).flock;
    const p = gus.position;
    const tgt = n >= 6 ? swarmTarget() : null;
    const pt = tgt ? new THREE.Vector3(tgt.x, (tgt.y ?? p.y) + 0.8, tgt.z) : new THREE.Vector3(p.x + Math.sin(gus.yaw) * 3, p.y + 0.8, p.z + Math.cos(gus.yaw) * 3);
    if (n < 1) { audio.play('coo', { at: p }); G.toast('No flock to swarm with yet.'); return; }
    flock.swarmAt(pt, 3);
    audio.play('flock-swarm', { at: pt });
    if (n >= 6 && tgt) G.humans.flee(pt, 3.5, { by: 'swarm' });
    else if (n < 6) G.toast(`Swarming needs a flock of 6 (you have ${n}).`);
    const e = { hold: true, x: pt.x, z: pt.z, flock: n, target: tgt };
    G.bus.emit('coo', e);
    if (n >= 6 && !tgt && !e.handled) G.toast('Nobody close enough to mob.');
  }

  // ---------------------------------------------------------------- timers on the game clock
  const timers = [];
  G.later = (secs, fn) => { timers.push({ t: secs, fn }); };
  let lastSave = -9;   // the autosave throttle (game seconds); reset with every applyState (Fixes-1, bughunter #2)
  let saveWarnAt = -Infinity, savePending = null;   // Fixes-3 (B1): an autosave asked for mid-scene, made when the scene is over
  function runTimers(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  }

  // ---------------------------------------------------------------- naps
  G.napBlocked = () => {
    if (G.screen !== 'play') return 'Not now';
    if (G.cutscene.running || G.ruffling || G.napping || G.travel) return 'Not now';   // Fixes-1: not while Ruffled (or mid-nap, mid-trip)
    if (G.blockNap) return G.blockNap;
    for (const m of G.mods) { const b = m.napBlock?.(); if (b) return b; }
    if (gus.mode === 'fly') return 'Land first';
    return null;
  };
  G.nap = (phase) => {
    const why = G.napBlocked();
    if (why) { G.toast(why); return false; }
    if (phase === G.state.phase) return false;
    G.closeMenus(true);
    G.napping = { t: 0, phase, applied: false, notes: [] };
    const fade = document.getElementById('fade');
    fade.className = 'on';
    fade.querySelector('.msg').innerHTML = `<img class="napimg" src="assets/ui/nap-gus.jpg" alt="">Napping until ${PHASE_LABEL[phase]}…`;   // polish (P18): Gus asleep, not a bare navy screen
    fade.classList.add('nap');
    audio.synth('napChime');
    return true;
  };
  function napTick(dt) {
    const n = G.napping;
    n.t += dt;
    if (!n.applied && n.t >= NAP_SECS / 2) { n.applied = true; n.notes = applyNapRule(n.phase); }
    if (n.t >= NAP_SECS) {
      document.getElementById('fade').className = 'nap';   // polish: fades out as the nap sky
      G.napping = null;
      for (const note of n.notes) G.toast(note, { seconds: 4 });
      G.autosave('nap', true);
    }
  }
  /** The nap rule ("What a nap changes, exactly"). Returns the wake-up notes. */
  function applyNapRule(phase) {
    const st = G.state;
    const notes = [];
    notes.push(...G.signs.onNap());          // non-permanent signs flipped back; permanent ones pay
    notes.push(...G.food.onNap());           // uneaten piles gone
    G.allies.onNap();                        // Called allies go home
    notes.push(...G.items.onNap());          // a carried slice goes cold; slices and boxes on the ground are gone
    for (const f of NAP_CLEARS) delete st.flags[f];   // Walter's door shut, ramps melted, once-a-phase things renewed
    st.phase = phase;
    st.stats.naps++;
    G.setPhase(phase);
    G.humans.setPhase(phase);                // humans move to their new phase spots
    G.rangers.setPhase(phase);
    G.street.setPhase(phase);
    G.crowds.onNap();
    for (const m of G.mods) { notes.push(...(m.onNap?.(phase) || [])); m.setPhase?.(phase); }
    G.bus.emit('nap', { phase });
    notes.unshift(`${PHASE_LABEL[phase]}.`);
    return notes;
  }

  // ---------------------------------------------------------------- Ruffled
  G.hurt = (n = 1) => {
    if (G.ruffling) return;
    G.state.feathers = Math.max(0, G.state.feathers - n);
    G.hitPause(0.08); G.shake?.(0.06, 0.25);   // 3b juice: the hit pause when a feather is lost
    audio.play('feather-lost', { at: gus.position });
    particles.burst('feathers', gus.position.x, gus.position.y + 0.2, gus.position.z, 14);
    G.rumble(0.7, 0.4, 160);
    G.bus.emit('hurt', { feathers: G.state.feathers });
    if (G.state.feathers <= 0) {
      G.bus.emit('ruffled', {});
      const note = G.items.onRuffled();
      G.ruffling = { t: 0, note };
      const fade = document.getElementById('fade');
      fade.className = 'on feathers';
      fade.querySelector('.msg').innerHTML = `Ruffled! Back to your nest.${note ? `<small>${note}</small>` : ''}`;
      audio.play('ruffled');
    }
  };
  function ruffleTick(dt) {
    const r = G.ruffling;
    r.t += dt;
    if (r.t > 1.2 && !r.moved) {
      r.moved = true;
      const n = NESTS.find((q) => q.id === G.state.lastNest) || NESTS[0];
      gus.place({ x: n.x, z: n.z, y: terrain.heightAt(n.x, n.z) + 0.1, yaw: 0, mode: 'perch' });
      flock.place(G.leader());
      rig.yaw = gus.yaw; rig.update(DT, gus, { snap: true, collision });
      G.state.feathers = 3;
    }
    if (r.t > 3) { document.getElementById('fade').className = ''; G.ruffling = null; }
  }
  G.featherUp = () => {
    const st = G.state;
    if (st.feathers >= 3 || st.crumbs < 15) { if (st.crumbs < 15) { G.toast(`Feather Up: 15. You have ${st.crumbs}.`); G.hud.flashCrumbs(); } return false; }
    st.crumbs -= 15; st.feathers = 3;
    audio.play('pretzel-chime');
    G.toast('Feathers full!');
    return true;
  };

  // ---------------------------------------------------------------- nests, scarves, grates
  G.registerNests = () => {
    for (const n of NESTS) {
      G.interact.register({ id: 'nest:' + n.id, kind: 'nest', x: n.x, y: terrain.heightAt(n.x, n.z) + 0.1, z: n.z, r: 0.9, priority: 1, label: () => 'Nest', act: () => G.openNest(n.id) });
    }
    for (const gr of GRATES) {
      G.interact.register({ id: 'grate:' + gr.id, kind: 'grate', x: gr.x, y: 0.15, z: gr.z, r: 1.2, priority: 2,
        label: () => (grateBlockedReason(G.state, gr.id) === "The rats haven't joined" ? null : 'Grate travel'),
        act: () => { const why = grateBlockedReason(G.state, gr.id); if (why) G.toast(why); else G.openMenu('grates', gr.id); } });
    }
  };
  G.nestName = (id = G.state.lastNest) => NESTS.find((n) => n.id === id)?.name || 'Nest';
  G.openNest = (id) => { G.state.lastNest = id; G.autosave('nest', true); G.openMenu('nest'); };
  /** Fun pass: Gus's portrait (HUD, dialogue) wears the scarf he's wearing (assets/portraits/gus-<scarf>.webp; gus.webp is the orange). */
  G.gusPortrait = () => (G.state?.scarf && G.state.scarf !== 'slice-orange' && SCARF_PORTRAITS.has(G.state.scarf) ? 'gus-' + G.state.scarf : 'gus');
  G.setScarf = (id, { quiet = false } = {}) => {
    if (!G.state.scarves.includes(id)) return;
    const changed = G.state.scarf !== id;
    G.state.scarf = id;
    store.load(`textures/scarf-${id}.jpg`, { maxSize: 512 }).then((t) => { scarf.setTexture(t, id === 'slice-orange' ? KNIT_TILE_TINT : [1, 1, 1]); });
    if (quiet) return;
    gus.twirl();   // the wardrobe swap: a little twirl
    particles.burst('sparkle', gus.position.x, gus.position.y + 0.25, gus.position.z, 14, { spread: 0.35 });
    audio.play('pick-up', { rate: 0.8 });
    if (changed) G.bus.emit('scarf', { id });
  };
  G.grateBlocked = (id) => grateBlockedReason(G.state, id);
  G.grateTravel = (from, to) => {
    const dest = GRATES.find((g) => g.id === to);
    if (!dest) return;
    G.napping = null;
    const fade = document.getElementById('fade');
    fade.className = 'on';
    fade.querySelector('.msg').innerHTML = 'Express punches your ticket…';
    audio.play('grate-whoosh');
    G.later(0.01, () => {});
    G.travel = { t: 0, dest };
    G.resume();
    const tick = () => {
      gus.place({ x: dest.x + 0.9, z: dest.z, y: 0.15, yaw: gus.yaw, mode: 'walk' });
      flock.place(G.leader());
      rig.yaw = gus.yaw; rig.update(DT, gus, { snap: true, collision });
      G.state.time += 8;   // the tunnel takes a few seconds; a hot slice stays hot
      fade.className = '';
      G.travel = null;   // Fixes-1 (#5): the trip is over (left set, leaving the page never saved again this session)
      audio.play('subway-rumble', { vol: 0.6 });
      G.bus.emit('grate', { from, to });
    };
    G.later(0.6, tick);
  };

  // ---------------------------------------------------------------- HUD helpers
  G.toast = (text, opts) => G.hud.toast(text, opts);
  G.say = (lines, onDone) => G.dialogue.say(lines, onDone);
  G.tutorState = null;
  G.tutor = (action, text) => { G.tutorState = action ? { action, text } : null; };
  G.polaroid = ({ title, name, portrait }) => {
    const el = document.getElementById('polaroid');
    el.innerHTML = `<img alt="" src="assets/portraits/${portrait}.webp"><b>${title}</b><span>${name}</span>`;
    el.className = 'on';
    G.later(3.5, () => { el.className = ''; });
  };
  G.laneIntro = (thread) => { G.ui.introQueue.push(thread); };
  G.rumble = (strong, weak, ms) => {
    if (!G.settings.vibration || input.device !== 'gamepad') return;
    try { const pad = [...navigator.getGamepads()].find((p) => p && p.connected); pad?.vibrationActuator?.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch { /* none */ }
  };

  // ---------------------------------------------------------------- menus, pause
  G.openMenu = (id, arg) => {
    if (G.screen !== 'play') { G.menus.push(id, arg); return; }
    if (!G.paused) G.takePauseShot?.();   // M4: the bug report's picture, before the menu goes up
    G.paused = true;
    audio.setPaused(true);
    input.enablePointerLock(false);
    G.wheel.close(false);
    G.menus.push(id, arg);
  };
  G.pause = (reason = '') => { if (G.screen !== 'play' || G.napping) return; if (G.menus.is('pause')) return; G.openMenu('pause', reason); };
  G.closeMenus = (silent = false) => { G.menus.closeAll(); };
  G.resume = () => { G.menus.closeAll(); };
  G.onMenusChanged = () => {
    if (G.screen === 'play' && !G.menus.open) {
      G.paused = false;
      G.clearPauseShot?.();
      audio.setPaused(false);
      input.enablePointerLock(true);
      input.reset();
      G.resetClock?.();
    }
  };
  G.confirm = (cfg) => G.menus.push('confirm', cfg);

  // ---------------------------------------------------------------- settings, audio
  G.applySettings = () => {
    const s = G.settings;
    audio.applyVolumes();
    input.setSensitivity(s.sensitivity);
    input.setInvertY(s.invertY);
    rig.autoFollow = s.autoFollow;
    G.showFps?.();   // Land/perf
    saveSettings(s);
  };
  G.toggleMute = () => { audio.toggleMute(); saveSettings(G.settings); G.menus.top?.reopen?.(); };
  /** g: 'auto' | 'high' | 'medium' | 'low'. auto: the auto probe stepping down (keeps Auto on: 'auto-<g>'). */
  G.setGraphics = (g, { auto = false } = {}) => {
    if (G.screen === 'play' && !G.midScene()) G.saveNow();   // Fixes-1 (#3): mid-scene, the last autosave stands
    savePreset(auto ? 'auto-' + g : g === 'auto' ? 'auto' : g);   // Fixes-3 (B4): a step-down no longer turns Auto off
    G.resumeAfterReload = G.screen === 'play';
    try { sessionStorage.setItem('cpp-resume', G.resumeAfterReload ? '1' : ''); } catch { /* */ }
    document.body.classList.add('fading');
    setTimeout(() => location.reload(), 350);
  };
  G.applySettings();

  function musicFor() {
    if (G.screen === 'title') return 'title';
    for (const m of G.mods) { const mu = m.music?.(); if (mu) return mu; }
    const st = G.state;
    const z = zoneAt(gus.position.x, gus.position.z);
    if (st.phase === 'dusk') return 'dusk';
    if (st.phase === 'night') return 'night';
    if (z === 'city') return 'city';
    return z === 'south' || z === 'middle' ? 'day-a' : 'day-b';
  }
  function ambienceFor() {
    const st = G.state, p = gus.position;
    const z = zoneAt(p.x, p.z);
    const beds = [];
    if (z === 'city') beds.push({ name: 'city-street', vol: 0.7 });
    else if (st.phase === 'night') beds.push({ name: 'park-night', vol: 0.75 });
    else if (z === 'ramble' && st.phase === 'morning') beds.push({ name: 'ramble-woods', vol: 0.8 });
    else beds.push({ name: 'park-day', vol: 0.7 });
    const near = (x, zz, r) => Math.hypot(p.x - x, p.z - zz) < r;
    if (near(6.6, 286, 40) || near(97, -40, 35)) beds.push({ name: 'fountain', vol: 0.55 });
    else if (near(51.7, 88.6, 45) && st.phase !== 'night') beds.push({ name: 'wollman-rink', vol: 0.5 });
    else if (near(-38.5, 443, 50) && st.phase === 'dusk') beds.push({ name: 'delacorte-rehearsal', vol: 0.6 });
    else if (near(-17.6, 106, 35) && st.phase === 'afternoon') beds.push({ name: 'carousel-organ', vol: 0.5 });
    else if (near(-60, 873, 30)) beds.push({ name: 'waterfall', vol: 0.6 });
    else if (terrain.shapes.water.some((w) => !w.stream && Math.hypot(p.x - (w.b.x0 + w.b.x1) / 2, p.z - (w.b.z0 + w.b.z1) / 2) < Math.max(w.b.x1 - w.b.x0, w.b.z1 - w.b.z0) / 2 + 15)) beds.push({ name: 'water-lapping', vol: 0.45 });
    return beds;
  }

  // ---------------------------------------------------------------- state in and out
  /** Fixes-3 (bughunter-2 B2, B3): drop everything the running game had under way, WITHOUT finishing it (finishing
   *  would complete steps): its G.later timers, its cutscene (whose onCancel undoes what it had going), the finale, the
   *  vehicle Gus is in (out silently, the touch labels back), scripted vehicles, every sound loop (engines, the cab horn,
   *  the chopper), a grate trip, a nap or Ruffled fade, overlays, slow motion, a locked or glancing camera, the cinematic
   *  HUD, a pending autosave. Each mod's abandon() does its own part. Run by applyState (a load) and quitToTitle. */
  G.abandonScene = () => {
    timers.length = 0;
    G.cutscene.cancel();
    if (G.finale?.running) G.finale.abort();
    for (const m of G.mods) { try { m.abandon?.(); } catch (e) { console.warn('abandon', m.name || '', e); } }
    audio.stopLoops?.();
    G.schemes.busy.clear();
    G.travel = null; G.napping = null; G.ruffling = null;
    document.getElementById('fade').className = '';
    for (const id of ['sf-flash', 'sf-stamp', 'sf-freeze', 'polaroid']) { const el = document.getElementById(id); if (el) el.className = ''; }
    document.body.classList.remove('cine', 'finale');
    G.altView = null;
    G.slowT = 0; G.hitStop = 0; G.shakeT = 0;
    rig.setFree(null);
    G.dialogue.clear(); G.bubbles.clear();
    G.openSky?.reset();   // Batch-2 (#13)
    TouchControls.current?.setLabels(null);
    savePending = null;
  };
  function applyState(st, { placeGus = true } = {}) {
    // Fixes-1 (bughunter #2, #4, #5): nothing from the game that was running carries over: its pending G.later
    // callbacks (a Call's "<Boss> is here.", a scheme script's done()), its cutscene (dropped, not finished: its
    // onDone would complete a step in the new game), a grate trip, a nap or a Ruffled fade, the autosave throttle.
    // Fixes-3: all of that (and the rest of a scene's leftovers) is G.abandonScene().
    G.abandonScene();
    G.guide?.reset();   // guidance
    lastSave = -9;
    G.state = st;
    // runtime leftovers that would make a fixture or a replay start differently
    G.schemes.pollT = 0; G.schemes.stepTime = {}; G.schemes.nudged = {};
    for (const sg of G.signs.list) { sg.pending = false; sg.feedAt = null; }
    G.food.eatAcc = 0; G.food.gulpT = 0;
    G.swarming = false; cooHeld = 0;
    G.wheel.close(false);
    G.fog.state = st; G.fog.load();
    G.setPhase(st.phase);
    G.signs.refresh();
    G.spikes.refresh();
    G.items.restore();
    G.food.restore();
    flock.setRoster(st.flockFrom);
    G.humans.setPhase(st.phase);
    G.rangers.setPhase(st.phase);
    G.street.setPhase(st.phase);
    for (const c of G.chars.list) G.chars.goHome(c);
    G.allies.restore();
    for (const m of G.mods) m.restore?.();
    G.schemes.busy.clear();
    G.schemes.refreshLanes();
    G.setScarf(st.scarf || 'slice-orange', { quiet: true });
    if (placeGus) {
      const g = st.gus;
      if (g) gus.place({ x: g.x, y: g.y, z: g.z, yaw: g.yaw, mode: g.mode === 'fly' ? 'fly' : g.mode === 'perch' ? 'perch' : 'walk' });
      else { const n = NESTS.find((q) => q.id === st.lastNest) || NESTS[0]; gus.place({ x: n.x, z: n.z, y: terrain.heightAt(n.x, n.z) + 0.1, yaw: 0, mode: 'perch' }); }
      flock.place(G.leader());
      rig.yaw = gus.yaw; rig.pitch = 0; rig.setFree(null);
      rig.update(DT, gus, { snap: true, collision });
    }
    G.cutscene.cancel();   // (a mod's restore may not start one, but be sure; cancel, never skip: see the top)
    G.dialogue.clear();
    G.bubbles.clear();
    G.intro = null;
    G.tutor(null);
    G.hud.clearToasts();
  }
  G.applyState = applyState;
  /** A clear cutscene shot of a target: tries angles round a preferred yaw until nothing (trunk, wall, canopy) is in the way. */
  G.shot = (t, { dist = 4, height = 1.5, yaw = gus.yaw + Math.PI, lookY = 0.3 } = {}) => {
    const look = new THREE.Vector3(t.x, (t.y ?? G.surfaceY(t.x, t.z, 50)) + lookY, t.z);
    let best = null, bestScore = -1;
    for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
      for (const k of [1, 0.75, 0.5]) {
        const a = yaw + off, d = dist * k;
        const p = new THREE.Vector3(t.x + Math.sin(a) * d, 0, t.z + Math.cos(a) * d);
        p.y = Math.max(look.y + height * k, terrain.heightAt(p.x, p.z) + 0.4, G.surfaceY(p.x, p.z, look.y + height) + 0.4);
        let clear = !collision.softAt(p) && !collision.solidAt(p.x, p.y, p.z) && collision.raySolid(p, look, 16) >= 1;
        if (clear) for (let i = 1; i < 6; i++) { const q = p.clone().lerp(look, i / 6); if (collision.softAt(q)) { clear = false; break; } }
        const score = (clear ? 10 : 0) + k - Math.abs(off) * 0.2;
        if (score > bestScore) { bestScore = score; best = p; }
        if (clear) break;
      }
      if (bestScore >= 10) break;
    }
    return { pos: [best.x, best.y, best.z], look: [look.x, look.y, look.z] };
  };
  G.reseed = () => {
    G.humans.reseed();
    G.crowds.reseed();
    flock.time = 0;
    timers.length = 0;
    G.later = (secs, fn) => { timers.push({ t: secs, fn }); };
  };

  G.snapshot = () => {
    const st = cloneState(G.state);
    st.saveRev = 3;   // Fixes-3: made by a build that never saves mid-scene (continueGame's repair treats saves without it as old)
    st.gus = { x: +gus.position.x.toFixed(3), y: +gus.position.y.toFixed(3), z: +gus.position.z.toFixed(3), yaw: +gus.yaw.toFixed(4), mode: gus.mode === 'takeoff' || gus.mode === 'hop' ? 'walk' : gus.mode };
    if (gus.mode === 'hop' && gus.hopFrom) { st.gus.x = +gus.hopFrom.x.toFixed(3); st.gus.y = +gus.hopFrom.y.toFixed(3); st.gus.z = +gus.hopFrom.z.toFixed(3); }   // Batch-2 (#5): mid-hop: where he hopped from
    // playtest: saved while driving, Gus came back standing inside the vehicle (camera inside the cart). Save him
    // where getting out would put him: beside it, on the left (or the right), as vehicles.js #exit does.
    const v = G.vehicles?.cur;
    if (v && !v.def.remote) {
      for (const side of [-1, 1]) {
        const a = v.yaw + side * Math.PI / 2, d = (v.def.radius || 1) + 0.6;
        const x = v.x + Math.sin(a) * d, z = v.z + Math.cos(a) * d, y = G.surfaceY(x, z, v.y + 0.5);
        if (Math.abs(y - v.y) < 1 && !collision.waterAt(x, z) && !collision.solidAt(x, y + 0.2, z)) { Object.assign(st.gus, { x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3), mode: 'walk' }); break; }
        if (side === 1) Object.assign(st.gus, { x: +v.x.toFixed(3), y: +(v.y + 1.6).toFixed(3), z: +v.z.toFixed(3), mode: 'walk' });
      }
    } else if (st.gus.mode === 'drive') st.gus.mode = 'walk';
    // Fixes-1: saved while Ruffled (before ruffleTick moves him), Gus came back with 0 feathers at the hazard. Save what
    // Ruffled is about to do: 3 feathers, on his last Nest.
    if (G.ruffling) {
      const n = NESTS.find((q) => q.id === st.lastNest) || NESTS[0];
      st.feathers = 3;
      st.gus = { x: n.x, y: +(terrain.heightAt(n.x, n.z) + 0.1).toFixed(3), z: n.z, yaw: 0, mode: 'perch' };
    }
    return st;
  };
  /** Fixes-1: a scene, a scheme's script, the finale, a nap, Ruffled or a grate trip is mid-way. A save taken now would
   *  keep half of it (the event that started a script is spent, but its step isn't done), so the menus, the graphics
   *  reload and leaving the page keep the last autosave instead. */
  G.midScene = () => !!(G.cutscene.running || G.schemes.busy.size || G.finale?.running || G.altView || G.napping || G.ruffling || G.travel);
  G.saveNow = () => {
    if (G.screen !== 'play') return false;
    G.fog.save();
    const st = G.snapshot();
    G.state.gus = st.gus;
    const ok = saveGame(st);
    // Saves: the browser refused (storage full). Say so once a while, and keep playing; the last good save is still there.
    if (!ok && currentSlot() != null && performance.now() - saveWarnAt > 120000) { saveWarnAt = performance.now(); G.toast?.("Couldn't save: this browser's storage is full."); }
    return ok;
  };
  /** Returns true when it saved (false: throttled, not in play, or the save failed). */
  // Fixes-3 (bughunter-2 B1): NO autosave while a scene, a scheme's script, the finale, a nap, Ruffled or a grate trip is
  // mid-way, forced or not. The 'give' / 'talent' / 'trade' / 'haul' saves used to fire right after the item or clue was
  // spent while the step's script was still running; quitting then kept a save with the trigger gone and the step not done
  // (a permanent softlock). Now the request waits (savePending) and is made the moment the scene is over; a throttled
  // request waits too (it used to be dropped). Returns true (saved), 'later' (waiting for the scene) or false.
  G.autosave = (reason, force = false) => {
    if (G.screen !== 'play') return false;
    if (G.midScene()) { savePending = savePending || reason; return 'later'; }
    if (!force && G.state.time - lastSave < 1) { savePending = savePending || reason; return false; }
    lastSave = G.state.time;
    savePending = null;
    return G.saveNow();
  };
  /** Fixes-3: a save that waited for a scene (or the throttle) is made once nothing is mid-way. */
  function pendingSaveTick() {
    if (savePending && G.screen === 'play' && !G.menus.open && !G.midScene() && G.state.time - lastSave >= 1) G.autosave(savePending, true);
  }
  G.savePending = () => savePending;
  G.hasSave = () => hasSave();
  // Saves: three slots (save.js). The title's Load screen lists them; New Game takes a free one or asks which to replace.
  G.saves = { list: listSlots, free: freeSlot, remove: removeSlot, last: lastSlot, current: currentSlot };

  function enterPlay() {
    G.screen = 'play';
    G.menus.closeAll();
    document.getElementById('title').classList.remove('on');
    G.hud.show(true);
    input.enablePointerLock(true);
    input.reset();
    audio.unlock();
    G.resetClock?.();
  }
  G.newGame = (slot = freeSlot() ?? currentSlot() ?? 1) => {
    setSlot(slot);
    clearGame();
    applyState(freshState(), { placeGus: false });
    enterPlay();
    G.startPrologue();
    G.saveNow();
  };
  G.continueGame = (slot = lastSlot()) => {
    const st = loadGame(slot);
    // Saves: an unreadable slot never starts a game over it; the Load screen shows it with Delete
    if (!st) { if (slot == null) G.newGame(); else G.toast?.("This save can't be read."); return false; }
    const old = !st.saveRev;   // Fixes-3: saves made before the mid-scene autosave fix carry no saveRev
    applyState(st);
    // Fixes-3 (B1 backstop, B5): a step whose trigger is already spent gets it back; a scheme past its last step finishes
    const fixed = G.schemes.repairSpent({ old });
    if (fixed.length) { console.info('Continue: repaired', fixed); G.repaired = fixed; }
    enterPlay();
    G.toast(`Welcome back. ${PHASE_LABEL[st.phase]}.`);
    G.resumePrologue?.();   // Fixes-1 (#3): a save from the first minute gets its guidance back
  };
  G.loadState = (st, opts) => { if (currentSlot() == null) setSlot(freeSlot() ?? lastSlot() ?? 1); applyState(migrate(st) || st, opts); if (G.screen !== 'play') enterPlay(); };
  G.quitToTitle = () => {
    G.menus.closeAll();
    G.screen = 'title';
    G.hud.show(false);
    G.cutscene.cancel();   // Fixes-1 (#4): skip() ran the scene's onDone (a step completed in the game being left)
    G.abandonScene();      // Fixes-3 (B2, B3): and everything else the scene or the drive had going (loops, vehicles, finale)
    input.enablePointerLock(false);
    G.menus.push('title');
    if (G.updateReady) location.reload();   // Fixes-1 (#7): a new version took over while playing: load it now
  };

  // ---------------------------------------------------------------- render
  const _v = new THREE.Vector3();
  function project(x, y, z) {
    _v.set(-x, y, z).project(renderCam);
    const vis = _v.z < 1 && _v.z > -1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2;
    return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, visible: vis, dist: Math.hypot(x - dataCam.position.x, y - dataCam.position.y, z - dataCam.position.z) };
  }
  G.project = project;

  function hudView(dt = 0) {
    const st = G.state, d = derived(st);
    const camYaw = Math.atan2(gus.position.x - dataCam.position.x, gus.position.z - dataCam.position.z);
    const c = st.carried;
    const marks = [];
    const add = (x, z, icon) => {
      const dx = x - gus.position.x, dz = z - gus.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) return;
      marks.push({ bearing: Math.atan2(dx, dz), dist: Math.round(dist), icon });
    };
    for (const t of G.schemes.targets()) add(t.x, t.z, 'target');
    for (const m of G.mods) for (const k of m.compass?.() || []) add(k.x, k.z, k.icon);
    if (st.waypoint) add(st.waypoint.x, st.waypoint.z, 'waypoint');
    for (const n of NESTS) { const dd = Math.hypot(n.x - gus.position.x, n.z - gus.position.z); if (dd < 160) marks.push({ bearing: Math.atan2(n.x - gus.position.x, n.z - gus.position.z), dist: null, icon: 'nest' }); }
    for (const it of G.items.world) if (G.items.def(it.id).cls !== 'light') add(it.x, it.z, 'box');
    const sp = project(gus.position.x, gus.position.y + 0.25, gus.position.z);
    const feet = project(gus.position.x, gus.position.y - 0.02, gus.position.z);   // Fixes-1: the prompt goes below these
    const tu = G.tutorState;
    const dev = input.device, fam = input.gamepad.family;
    let prompt = G.cutscene.locked || G.dialogue.open ? '' : (G.vehicles.driving ? G.vehicles.prompt : G.interact.prompt);
    const panel = G.mods.map((m) => m.panel?.()).filter(Boolean).join('');
    // Fixes-2: no second "□ the sign" bubble while the context prompt already says "□ Peck the sign"
    const tutor = tu && !G.dialogue.open && !G.wheel.open && !(tu.action === 'peck' && G.interact.prompt && !G.cutscene.locked) ? `${glyph(tu.action, dev, fam)}<span>${tu.text}</span>` : '';
    const flight = flightHints(dev, fam, tutor, dt);   // Flight hint / scarf: the fixed strip at the bottom (replaces the floating "C Land")
    if (flight && gus.floating) prompt = '';   // Batch-3 (#1): afloat, the strip carries the Peck too (the two overlapped on a phone)
    return {
      stamina: gus.stamina, boosting: gus.boostT > 0, portrait: G.gusPortrait(),   // polish: the HUD circle is always Gus (it previewed the wheel's selected ally, which read as the player changing; the wheel itself shows the pick)
      device: dev, family: fam, feathers: st.feathers,
      carried: c ? { id: c.id, heat: G.items.heat(c), word: G.items.heatWord(c) } : null,   // fix-19: word = Hot / Cooling, still counts / Cold
      goal: G.schemes.goal(), crumbs: st.crumbs, flock: d.flock, crews: d.crews, parts: d.parts,
      phase: st.phase, phaseLabel: PHASE_LABEL[st.phase], meters: metersFor(st, d), muted: G.settings.muted,
      compass: marks, camYaw, gusScreen: sp.visible ? sp : null, gusFeetY: feet.visible ? feet.y : null,
      prompt, panel, drive: G.vehicles.hud(), tutor, flight,
    };
  }
  /** Flight hint / scarf: the flight control hints, a steady strip at the bottom centre while flying (render/UI only: it
   *  reads Gus and the input, never changes them). Each of Flap, Land and Boost drops out of the strip once learnt
   *  (settings.controlHints 'auto'; counts in settings.hintsLearnt, bumped by learnHint()); 'always' keeps all three, 'off'
   *  shows none. On touch the buttons are on screen, so only Land (its button) is named. Shown after 0.5 s of flight, not in
   *  scenes, dialogue, the wheel, a vehicle, an encounter/race panel or while a tutor bubble teaches something. */
  const HINT_LEARNT = { flap: 5, land: 3, boost: 3 };
  // Batch-2 (#4): while flying the flight rows always show ('auto' and 'always'; 'off' hides them); a learnt row only dims
  // (.lt). Drop joins while carrying, Peck while over water (the swimmers can be talked to from the air).
  const HINT_ROWS = [['flap', 'flap', 'Flap · hold to climb'], ['land', 'dive', 'Land'], ['boost', 'boost', 'Boost']];
  let hintWaterT = 0;
  function flightHints(dev, fam, tutor, dt = 0) {
    const mode = G.settings.controlHints || 'auto';
    // Batch-3 (#1): afloat on the water, the strip says how to leave it (and that the swimmers can be talked to)
    if (gus.floating && gus.mode === 'walk' && mode !== 'off' && !(G.vehicles.driving || G.cutscene.locked || G.dialogue.open || G.wheel.open || G.altView || tutor || G.mods.some((m) => m.panel?.()))) {
      if (dev === 'touch') return `<span class="t">Tap${glyph('flap', dev, fam)}to take off</span>` + (G.interact.label ? `<span>${glyph('peck', dev, fam)}${G.interact.label}</span>` : '');
      // one strip: take off, and what Peck does here (the context prompt's own line; hudView hides that bubble meanwhile)
      const rows = [['flap', 'Flap to take off']];
      if (G.interact.label) rows.push(['peck', G.interact.label]);
      if (G.state.carried) rows.push(['drop', 'Drop']);
      return rows.map(([a, label]) => `<span>${glyph(a, dev, fam)}${label}</span>`).join('');
    }
    if (mode === 'off' || gus.mode !== 'fly' || gus.modeT < 0.5 || G.vehicles.driving || G.cutscene.locked || G.dialogue.open || G.wheel.open || G.altView || tutor) return '';
    if (G.mods.some((m) => m.panel?.())) return '';
    if (dev === 'touch') return `<span class="t">Tap${glyph('dive', dev, fam)}to land</span>`;
    const learnt = G.settings.hintsLearnt || {};
    const rows = HINT_ROWS.map(([k, a, label]) => [a, label, mode !== 'always' && (learnt[k] || 0) >= HINT_LEARNT[k]]);
    if (G.state.carried) rows.push(['drop', 'Drop', false]);
    // over water (held a moment after the shore, so the strip doesn't flicker along a bank)
    hintWaterT = collision.surface(gus.position.x, gus.position.z, gus.position.y + 0.1).kind === 'water' ? 1.5 : Math.max(0, hintWaterT - dt);
    if (hintWaterT > 0) rows.push(['peck', 'Peck to talk', false]);
    return rows.map(([a, label, dim]) => `<span${dim ? ' class="lt"' : ''}>${glyph(a, dev, fam)}${label}</span>`).join('');
  }
  /** Flight hint / scarf: count a use toward retiring a hint (saved with the settings; a few writes in all). */
  function learnHint(k) {
    const L = (G.settings.hintsLearnt ||= { flap: 0, land: 0, boost: 0 });
    if ((L[k] || 0) >= HINT_LEARNT[k]) return;
    L[k] = (L[k] || 0) + 1;
    saveSettings(G.settings);
  }
  G.learnHint = learnHint;

  function render() {
    const shaking = G.shakeT > 0 && G.screen === 'play';
    if (shaking) { const a = G.shakeAmp * Math.min(1, G.shakeT / G.shakeDur), u = G.updates; _shake.set(Math.sin(u * 1.7) * a, Math.sin(u * 2.3 + 1) * a * 0.7, Math.cos(u * 1.9) * a); dataCam.position.add(_shake); dataCam.updateMatrixWorld(); }
    syncCameras();
    if (shaking) dataCam.position.sub(_shake);
    renderer.info.reset();
    renderer.clear();
    if (G.altView) {   // finale: the climb's scene (its own sky, city and the ESB) replaces both passes
      G.altView.render(renderer, renderCam);
      G.lastFarStats = { triangles: 0, calls: 0 };
      G.lastStats = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
      return G.lastStats;
    }
    G.humans.pose(); G.crowds.draw();   // Land/perf: their visual-only work, once per drawn frame
    skipHiddenMatrices = true;
    try {
      renderer.render(far.scene, farCam);
      G.lastFarStats = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
      renderer.clearDepth();
      G.detailCull.update(renderCam);   // perf pass
      renderer.render(scene, renderCam);
    } finally { skipHiddenMatrices = false; }
    G.lastStats = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
    // keep the preset's triangle cap: the crowds, people and named characters give way first
    const cap = preset.caps.triangles, t = G.lastStats.triangles;   // (info isn't reset between the passes: this counts both)
    if (G.photoHold) { /* photo mode (#9): the governor holds still while the shot is framed */ }
    else if (t > cap * 0.96) G.budgetScale = Math.max(0.2, (G.budgetScale ?? 1) * 0.8);
    else if (t < cap * 0.85) G.budgetScale = Math.min(1, (G.budgetScale ?? 1) * 1.05);
    return G.lastStats;
  }
  G.render = render;
  G.update = update;

  let musicT = 0;
  function frameUi(dt) {
    if (G.screen === 'play') {
      // Fixes-2 (P8): cinematic HUD while a cutscene holds the controls (scenes, showpieces, joins)
      const cine = !!G.cutscene.locked || !!G.vehicles.byId?.zamboni?.hop?.lane;   // Fixes-3 (R8): and the Zamboni's launch arc
      if (cine !== G.cineHud) { G.cineHud = cine; document.body.classList.toggle('cine', cine); }
      G.hud.update(dt, hudView(dt));
      G.bubbles.render(project);
    }
    G.openSky.render(dt);   // Batch-2 (#13): the badge and the shimmer (render only)
    G.guide.render(project);   // guidance: the world marker, the "Where to?" line, the "Something to do" card
    audio.setListener(dataCam.position.x, dataCam.position.y, dataCam.position.z, Math.atan2(gus.position.x - dataCam.position.x, gus.position.z - dataCam.position.z));
    audio.update(dt);
    if ((musicT -= dt) <= 0) {
      musicT = 0.5;
      audio.setMusic(musicFor());
      if (G.screen === 'play') audio.setAmbience(ambienceFor());
    }
  }
  G.frameUi = frameUi;

  // ---------------------------------------------------------------- start
  rig.nests = NESTS;   // Fixes-1: the camera's nest framing (camera-rig.js NEST)
  G.registerNests();
  G.state = freshState();
  const start = VIEWS.start.gus;
  gus.place({ x: start.x, z: start.z, yaw: start.yaw, mode: 'walk' });
  rig.yaw = gus.yaw;
  flock.setRoster({});
  flock.place(G.leader());
  G.setPhase('morning');
  rig.update(DT, gus, { snap: true, collision });
  treeSys.update(dataCam, true);
  terrain.updateLod(dataCam.position);
  props.userData.update(dataCam, true);
  streamer.update(gus.position, dataCam.position);
  await stage('Warming up the shaders', 0.8);
  // compile with everything visible once (crowds, people, items, fx), so nothing compiles mid-game
  for (const m of Object.values(G.crowds.meshes)) { m.full.count = 1; m.full.visible = true; }
  for (const h of Object.values(G.crowds.hats || {})) { h.count = 1; h.visible = true; }
  for (const pool of Object.values(G.humans.pools)) for (const c of pool) c.holder.visible = true;
  flock.mesh.count = 1;
  G.food.mesh.count = 1;
  // milestone 3a: every mod's hidden meshes (clue tells, doors, vehicles, fights, rings, collectibles) compile now too
  const warm = [];
  for (const m of G.mods) m.group?.traverse((o) => { if (!o.visible) { o.visible = true; warm.push(o); } });
  syncCameras();
  terrain.updateLod(dataCam.position);
  // Boot fix: compileAsync (KHR_parallel_shader_compile) instead of compile(), and every GPU step waited for with a fence
  // (gfx/warm.js) instead of a synchronous query. compile() + the first render waited on each program and then on the
  // GPU's pipeline builds inside one task (12 s in software GL; Windows/ANGLE HLSL compiles can take far longer).
  await compileQuiet(renderer, far.scene, farCam);
  await compileQuiet(renderer, scene, renderCam);
  await gpuIdle(renderer);   // compile() also drew the shadow maps
  primePrograms(renderer);
  const warmTex = sceneTextures(far.scene, scene);
  await uploadTextures(renderer, warmTex, { onProgress: (f) => setLoading(0.6 + (0.8 + f * 0.06) * 0.4, null) });
  render();
  await gpuIdle(renderer);   // the first draws build the GPU pipelines: wait here, not in the next stage's first query
  for (const m of Object.values(G.crowds.meshes)) { m.full.count = 0; m.full.visible = false; }
  for (const h of Object.values(G.crowds.hats || {})) { h.count = 0; h.visible = false; }
  for (const pool of Object.values(G.humans.pools)) for (const c of pool) c.holder.visible = !!c.agent;
  flock.mesh.count = 0;
  G.food.mesh.count = 0;
  for (const o of warm) o.visible = false;
  await stage('Drawing the map', 0.92);
  G.mapImage = await renderMapImage(G);   // Boot fix: async (no synchronous shader links or readPixels; ui/map.js)
  await streamer.ready();
  setLoading(1, 'Ready');

  // title (or straight back into play after a graphics change)
  let resume = false;
  try { resume = sessionStorage.getItem('cpp-resume') === '1'; sessionStorage.removeItem('cpp-resume'); } catch { /* */ }
  G.screen = 'title';
  G.menus.push('title');
  document.getElementById('title').classList.add('on');
  loadingEl?.classList.add('done');
  setTimeout(() => loadingEl?.remove(), 600);
  G.ready = true;
  if (resume && hasSave()) G.continueGame();

  // Land/perf: Auto's step-down tells the player (a toast now, and another after the reload)
  if (auto) G.autoProbe = new AutoProbe(preset, (next, fps) => {   // Fixes-3 (B4)
    const label = PRESETS[next]?.label || next;
    console.info(`Auto graphics: ${Math.round(fps || 0)} fps on ${preset.label}, stepping down to ${label}`);
    G.toast(`Running slowly: graphics to ${label}…`);
    try { sessionStorage.setItem('cpp-autodrop', label); } catch { /* */ }
    G.setGraphics(next, { auto: true });
  });
  try {
    const dropped = sessionStorage.getItem('cpp-autodrop');
    if (dropped) { sessionStorage.removeItem('cpp-autodrop'); G.later(1.5, () => G.toast(`Graphics set to ${dropped} to keep things smooth (Settings to change).`, { seconds: 5 })); }
  } catch { /* */ }
  G.setPreset = (id) => G.setGraphics(id);

  // Land/perf: the FPS / frame-time readout (Settings "Show FPS", or ?fps=1): frames per second, average and worst frame
  // time, and the CPU time of the updates and the render (the GPU's share is the rest of the frame). Updated twice a second.
  const fpsEl = document.createElement('div');
  fpsEl.id = 'fpsbox';
  document.body.appendChild(fpsEl);
  const fpsForced = new URLSearchParams(location.search).get('fps') === '1';
  const fpsStat = { n: 0, t: 0, worst: 0, upd: 0, rnd: 0, updN: 0 };
  G.showFps = () => { const on = fpsForced || !!G.settings.showFps; fpsEl.classList.toggle('on', on); return on; };
  G.showFps();
  let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0;
  G.resetClock = () => { last = performance.now(); acc = 0; G.autoProbe?.interrupt(); };
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    fpsT += elapsed; fpsN++;
    if (fpsT > 1) { G.fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
    if (!G.frozen && !G.paused && G.screen === 'play' && !G.midScene()) G.autoProbe?.frame(elapsed);   // Fixes-1 (#3): not during the opening scene
    else G.autoProbe?.interrupt();   // Land/perf: a pause or a scene breaks the slow run
    const t0 = performance.now();
    let n = 0;
    if (!G.frozen) {
      acc += elapsed;
      while (acc >= DT && n < 8) { update(DT); acc -= DT; n++; }
      if (n === 8) acc = 0;
    }
    const t1 = performance.now();
    syncCameras();   // Batch-2 (#18): bubbles, prompts and the marker are placed with THIS frame's camera (was last frame's: jitter)
    frameUi(elapsed);
    // Land/perf: a frame with no update since the last one would draw the very same picture (everything moves on the
    // fixed clock), so on a 120/144 Hz screen it isn't drawn again: the canvas keeps showing the last frame. A resize
    // (or G.needRender) draws regardless.
    const drew = !G.frozen && G.screen === 'play' && (n > 0 || G.needRender);
    if (drew) { G.needRender = false; render(); }
    if (fpsEl.classList.contains('on')) {
      // fps = frames actually drawn per second; ms = average time between them (and the worst); cpu = this page's own
      // JavaScript per update and per drawn frame (UI + render calls). A frame much longer than the cpu numbers is GPU-bound.
      const S = fpsStat;
      S.t += elapsed; S.upd += t1 - t0; S.updN += n;
      if (drew) { S.n++; S.rnd += performance.now() - t1; const gap = S.lastDraw ? now - S.lastDraw : 0; S.worst = Math.max(S.worst, gap); S.lastDraw = now; }
      if (S.t >= 0.5 && S.n) {
        fpsEl.textContent = `${Math.round(S.n / S.t)} fps · ${(1000 * S.t / S.n).toFixed(1)} ms (worst ${S.worst.toFixed(0)}) · cpu: update ${(S.upd / Math.max(1, S.updN)).toFixed(1)} ms ×${(S.updN / S.n).toFixed(1)}, draw ${(S.rnd / S.n).toFixed(1)} ms · ${preset.label}${auto ? ' (Auto)' : ''} ×${renderer.getPixelRatio().toFixed(2)}`;
        S.n = 0; S.t = 0; S.worst = 0; S.upd = 0; S.updN = 0; S.rnd = 0;
      } else if (S.t >= 0.5 && !S.n) { fpsEl.textContent = `${Math.round(G.fps)} fps (${G.screen !== 'play' ? 'menu' : 'not drawing'}) · ${preset.label}${auto ? ' (Auto)' : ''} ×${renderer.getPixelRatio().toFixed(2)}`; S.t = 0; S.upd = 0; S.updN = 0; }
    }
  }
  requestAnimationFrame(frame);

  resizeHook = () => {
    const a = innerWidth / innerHeight;
    for (const c of [dataCam, renderCam, farCam]) { c.aspect = a; c.updateProjectionMatrix(); }
    particles.setPixelScale(innerHeight * renderer.getPixelRatio());
  };
  onResize();   // catch a turn that happened after the cameras were made
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') { G.pause(); saveOnLeave(); }
    audio.setHidden(document.hidden);   // M4: silence in a background tab
    G.resetClock();
  });
  // M4 (web-target.md): losing focus pauses too (not under the test clock, not while typing a bug report);
  // leaving the page saves where Gus is, unless a scene, the finale or a nap is mid-way
  addEventListener('blur', () => { if (G.screen === 'play' && !G.frozen && !G.reportOpen?.()) G.pause(); });
  addEventListener('pagehide', () => saveOnLeave());
  matchMedia('(orientation: portrait) and (pointer: coarse)').addEventListener?.('change', (e) => { if (e.matches && G.screen === 'play' && !G.frozen) G.pause(); });   // the "turn your phone" card is up
  function saveOnLeave() {
    if (G.screen !== 'play' || G.frozen || G.midScene()) return;
    G.autosave('leave', true);
  }
  input.onAnyInput = () => { if (audio.ctx?.state === 'suspended' && !document.hidden) audio.unlock(); };   // iOS suspends audio after a call or the lock screen
  installOffline(G);
}

boot().catch((e) => {
  console.error(e);
  if (labelEl) labelEl.textContent = 'Failed to load: ' + e.message;
});

export { G, PRESETS, zoneAt };
