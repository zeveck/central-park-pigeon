// Gus: ground and flight states, the two-model pose swap, head-bob, peck,
// take-off squash, wingbeat, banking, landing and perching, and his scarf.
// Speeds, stamina and collisions follow the design's Controls section:
// walk 1.2 m/s, waddle-sprint 2.5, cruise 11, boost 17 (2 s), dive up to 20;
// with no input he glides forward slowly and sinks gently. Stamina drains
// only while climbing or boosting and refills perched, landed or gliding
// level. Canopies are soft; walls and trunks deflect him into a glancing
// slide that keeps ~70% of his speed; nothing ever costs a feather.
//
//   const gus = new Gus({ stand, fly, world, input });   // stand/fly from loadBakedModel
//   scene.add(gus.root);
//   each fixed update: gus.update(dt, cameraYaw)
//
// Coordinates are game (data) space: +x east, +z north, yaw 0 faces north and
// the camera's right at yaw 0 is +x. (The world is drawn mirrored; main.js
// counter-mirrors Gus's root so he looks exactly as in the test scene.)
//
// world: { surface(x, z, yRef) → {y, kind}, collision (systems/collision.js) | null,
//          groundAt(x, z, y), boxes, perches (legacy test-scene fields),
//          onLeafBurst(pos), onSplash(pos) (optional effects hooks) }

import * as THREE from 'three';
import { GusSkin } from './gus-skin.js';   // Gus rig
import { Wingbeat } from '../anim/wingbeat.js';
import { Scarf } from './scarf.js';
import { GUS_STAND, GUS_FLY } from './gus-rig.js';

const WALK_SPEED = 1.2;         // m/s (design)
const SPRINT_SPEED = 2.5;       // m/s waddle-sprint
const TURN_RATE = 9;            // rad/s on the ground
const STEP_LEN = 0.32;          // m per step at walking speed (3.75 steps and head thrusts a second; 5.2 at a sprint, 0.48 m). Visual only.
                                // Flight hint / scarf: was 0.12 (10/s and 14/s, far faster than a pigeon's 3-5 bobs a second)
// Flight hint / scarf: the visual step: STEP_LEN at a walk, half as long again at a sprint, and shorter when shuffling
// slowly (so a slow turn still steps instead of dragging a planted foot round). Visual only.
const stepLength = (speed) => STEP_LEN * Math.min(1, Math.max(0.4, speed / WALK_SPEED)) * (1 + 0.5 * Math.max(0, (speed - WALK_SPEED) / (SPRINT_SPEED - WALK_SPEED)));
const PECK_TIME = 0.25;         // s, design: dips 40° and back in 0.25 s
const TAKEOFF_SQUASH = 0.14;    // s
const FLY = { cruise: 11, glide: 7.5, boost: 17, boostTime: 2, dive: 20, turn: 1.9, climb: 3.2, glideSink: 0.8, diveSink: 9, ceiling: 190 };
const STAMINA = { climbDrain: 0.11, boostCost: 0.25, perchFill: 0.6, glideFill: 0.07 };
const BODY_R = { ground: 0.12, air: 0.18 };
// Land/perf: Land / Dive (C, ○/B, L2, the touch Land button). Held, it is the old dive (unchanged: recorded solutions
// press it on exact frames). New: a short TAP (≤ `tap` s, and not right after climbing: no Flap in the `calm` s before it)
// while low (within `alt` m of what's below, not over water) lands too: the
// descent carries on after the key is up (gentler, slower forward speed) until he lands, and a perch within `perchR`
// catches him. Flap, boost, a splash, a cutscene (locked input) or `max` seconds cancel it.
const LAND = { tap: 0.3, calm: 0.25, alt: 10, max: 4, speed: 5, sink: 6.5, perchR: 1.0 };
// Batch-2 (#5): a quick tap of Flap on ordinary ground is a hop. The choice is made when the take-off squash ends
// (TAKEOFF_SQUASH): Flap still held, or pressed again during the squash → the full take-off exactly as before (no added
// delay); let go → a hop: about 1 m up and ~1.8 m forward, then walking again on the same ground. A press during the hop
// takes off at once. Only from ordinary ground: main.js sets gus.hopOk each update (not carrying, no scene, encounter, race,
// scheme script...), and here: walk mode on terrain (no perch, roof, rock or kerb), nothing lower just ahead, no water.
// gus.legacyTakeoff (G.legacyTakeoff: replays of solutions recorded before the hop) never hops: the old take-off exactly.
const HOP = { vy: 4.4, gravity: 9.8, speed: 2.1, turn: 3, max: 1.6 };
// Batch-2 (#5): on touch a double-tapped Flap is Boost; the second tap of a hop-then-fly is not a boost for this long (s)
const BOOST_GRACE = 0.5;
// Batch-2 (#2): the landing snap (up to 0.9 m in a dive, a perch catch) is eased on the visual root over this long (s).
// Render-side only: gus.position, speed and every rule land exactly as before.
const LAND_EASE = 0.24;
// Batch-3 (#1): Gus and the water. On foot the water's edge is a low wall (a small splash, he stops). A gentle arrival on
// the water floats him: walk mode with gus.floating (a tapped Land, or a near-stall touch at up to FLOAT.speed m/s across
// and FLOAT.sink down); any faster touch (a glide, a carry, skimming at cruise, a dive) keeps the old splash-bounce, and
// gus.noFloat (main.js: the Rhoda fight, where floating counts as "over water" and he couldn't paddle out) never floats. Floating: a slow paddle (FLOAT.paddle m/s; the owner asked for no moving at all, the review chose a
// slow paddle so a bank is always reachable), turning, Peck and Drop as on the ground (main.js shows "Flap to take off";
// characters.js reaches 4.5 m), and Flap is a strong take-off (FLOAT.vy, FLOAT.go) that ignores the water for FLOAT.grace s.
const FLOAT = { speed: 3, sink: 7, paddle: 0.5, vy: 5.2, go: 5.5, grace: 1.2, edgeEvery: 0.9 };

const ease = (t) => 1 - Math.pow(1 - t, 3);
const approach = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Gus {
  constructor({ stand, fly, world, input, scarf = new Scarf() }) {
    this.world = world;
    this.input = input;
    this.root = new THREE.Group();
    this.root.name = 'gus';

    // Gus rig: both models are SkinnedMeshes on procedural skeletons (entities/gus-skin.js); the pose is visual only.
    // Ground model: root → standPose (take-off/landing squash) → standMesh (model space; body, neck, head, tail, legs, feet bones)
    this.wings = new Wingbeat(GUS_FLY.wings);
    const flyMat = fly.makeMaterial();
    this.wings.patch(flyMat);
    this.skin = new GusSkin(stand, stand.makeMaterial(), fly, flyMat);
    this.neck = this.skin.stand;    // the scarf follows the neck and head bones through it (deformPoint / makeMesh)
    this.standMesh = this.skin.standMesh;
    this.standMesh.name = 'gus-stand';
    this.standPose = new THREE.Group();
    this.standPose.add(this.standMesh);
    this.root.add(this.standPose);

    // Flight model: root → flyPose (at the body centre: pitch, bank, stretch) → flyMesh (offset so its body centre is the pivot)
    this.flyMesh = this.skin.flyMesh;
    this.flyMesh.name = 'gus-fly';
    const c = GUS_FLY.bodyCenter;
    this.flyMesh.position.set(-c.x, -c.y, -c.z);
    this.flyScale = new THREE.Group();
    this.flyScale.scale.setScalar(GUS_FLY.scale);
    this.flyScale.add(this.flyMesh);
    this.flyPose = new THREE.Group();
    this.flyPose.position.y = c.y * GUS_FLY.scale;
    this.flyPose.add(this.flyScale);
    this.root.add(this.flyPose);
    for (const m of [this.standMesh, this.flyMesh]) { m.castShadow = true; m.receiveShadow = true; }

    this.scarf = scarf;

    // state
    this.mode = 'walk';             // walk | takeoff | fly | perch
    this.yaw = 0;
    this.speed = 0;                 // forward speed (m/s)
    this.vy = 0;
    this.velocity = new THREE.Vector3();
    this.stepPhase = 0;
    this.peckT = -1;
    this.modeT = 0;
    this.bank = 0;
    this.pitch = 0;
    this.landSquash = 0;
    this.perch = null;
    this.flyAnim = { freq: 4, amp: 0.8, offset: -0.5 };
    this.stamina = 1;
    this.boostT = 0;
    this.sprinting = false;
    this.carryLimits = null;        // { maxAlt, maxSpeed } while carrying a heavy item
    this.inCanopy = false;
    this.lastHit = null;            // tag of the last wall he glanced off
    this.events = [];               // effect events since the last read: {type, x, y, z}
    this.driveCam = null;           // { dist, height, look } while driving (the camera rig reads it)
    this.twirlT = 0;                // the wardrobe twirl (s left)
    this.staminaBonus = 0;          // golden pretzels: each one trims the climb drain a little
    this.slideV = 0; this.slideDist = 0;   // belly-sliding on the ice
    this.diveHeldT = 0;             // Land/perf: how long Land / Dive has been held (for the tap-to-land)
    this.landLatch = 0;             // Land/perf: > 0 while a tapped Land is carrying him down (s left)
    this.glideT = 0;                // Land/perf: seconds flying without Flap or Land (the HUD's Land prompt reads it)
    this.sinceFlap = 0;             // Land/perf: seconds since Flap was last held in the air (a tap right after a climb is a trim, not a landing)
    this.lowAlt = Infinity;         // Land/perf: height over what's below him while flying (HUD only)
    this.hopOk = false;             // Batch-2 (#5): set by main.js each update (ordinary play: a tap may hop)
    this.legacyTakeoff = false;     // Batch-2 (#5): set by main.js from G.legacyTakeoff (old replays: never hop)
    this.hopArmed = false; this.flapAgain = false; this.hopFrom = null;
    this.landEase = null;           // Batch-2 (#2): { t, x, y, z } the visual offset (data space) eased out after a landing
    this.floating = false;          // Batch-3 (#1): walk mode on the water's surface (see FLOAT)
    this.noFloat = false;           // Batch-3 (review): set by main.js during the Rhoda fight (water touches always bounce)
    this.fromWater = false; this.waterGrace = 0; this.edgeT = 0;
    this._prevPos = new THREE.Vector3();
    this.useModel('stand');
  }

  get position() { return this.root.position; }
  get grounded() { return this.mode === 'walk' || this.mode === 'perch' || this.mode === 'takeoff'; }
  get activeMesh() { return this.flyPose.visible ? this.flyMesh : this.standMesh; }

  useModel(which) {
    const standOn = which === 'stand';
    this.standPose.visible = standOn;
    this.flyPose.visible = !standOn;
    this.root.updateMatrixWorld(true);
    if (standOn) this.scarf.attach(this.standMesh, GUS_STAND.scarf, this.neck);
    else this.scarf.attach(this.flyMesh, GUS_FLY.scarf, null);
    this.onModelSwap?.();   // #41: the carried item moves to the model now showing (systems/items.js; photo mode swaps while paused)
  }

  /** Place Gus (tests, respawn). mode: 'walk' | 'fly' | 'perch'. */
  place({ x = 0, y, z = 0, yaw = 0, mode = 'walk', speed } = {}) {
    this.root.position.set(x, y ?? this.#ground(x, z, 1e9), z);
    this.yaw = yaw;
    this.mode = mode;
    this.modeT = 0;
    this.peckT = -1;
    this.vy = 0;
    this.perch = mode === 'perch' ? this.#nearestPerch(0.8, 0.5, 0.5) : null;
    this.boostT = 0;
    this.stamina = 1;
    this.bank = 0;
    this.landSquash = 0;
    this.stepPhase = 0;
    this.inCanopy = false;
    this.events = [];
    this.diveHeldT = 0; this.landLatch = 0; this.glideT = 0; this.lowAlt = Infinity; this.sinceFlap = 0;
    this.hopArmed = false; this.flapAgain = false; this.hopFrom = null; this.landEase = null;
    this.floating = false; this.fromWater = false; this.waterGrace = 0;   // Batch-3: placed on the water, the first step floats him
    this.speed = speed ?? (mode === 'fly' ? FLY.cruise : 0);
    this.velocity.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(this.speed);
    this.useModel(mode === 'fly' ? 'fly' : 'stand');
    this.skin.replant = true; this.skin.legExt = mode === 'fly' ? 0 : 1;   // Gus rig: feet back under him
    this.#pose(0);
    this.root.updateMatrixWorld(true);
    this.scarf.reset();
  }

  update(dt, cameraYaw) {
    if (this.waterGrace > 0) this.waterGrace = Math.max(0, this.waterGrace - dt);
    const prev = _prev.copy(this.root.position);
    this._prevPos.copy(prev);
    this.modeT += dt;
    switch (this.mode) {
      case 'walk':
      case 'perch': this.#updateGround(dt, cameraYaw); break;
      case 'takeoff': this.#updateTakeoff(dt); break;
      case 'hop': this.#updateHop(dt, cameraYaw); break;
      case 'fly': this.#updateFly(dt, cameraYaw); break;
      case 'drive': break;   // vehicles.js seats him and moves him with the vehicle
    }
    this.velocity.subVectors(this.root.position, prev).divideScalar(Math.max(dt, 1e-4));
    this.#pose(dt);
    this.scarf.update(dt, this.velocity);
  }

  // ---------------------------------------------------------------- ground
  #updateGround(dt, cameraYaw) {
    const inp = this.input;
    const mv = inp.move ? inp.move() : { x: inp.axis('left', 'right'), y: inp.axis('back', 'forward'), edge: false };
    const amount = Math.min(1, Math.hypot(mv.x, mv.y));
    let moving = false;
    this.sprinting = amount > 0.1 && (inp.held('sprint') || mv.edge);
    if (this.peckT < 0 && amount > 0.1) {
      // camera-relative: forward is where the camera looks, right is its right (+X at yaw 0)
      const sn = Math.sin(cameraYaw), cs = Math.cos(cameraYaw);
      const dx = mv.y * sn + mv.x * cs;
      const dz = mv.y * cs - mv.x * sn;
      const target = Math.atan2(dx, dz);
      const diff = wrapAngle(target - this.yaw);
      this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * dt);
      moving = Math.abs(diff) < 1.2;
    }
    if (this.floating) this.sprinting = false;
    const top = this.floating ? FLOAT.paddle : (this.sprinting ? SPRINT_SPEED : WALK_SPEED) * Math.max(amount, 0.35);
    if (this.slideV > 0) {
      // a belly-slide on the ice: he keeps his landing speed and it bleeds off slowly
      const onIce = this.#surface(this.root.position.x, this.root.position.z, this.root.position.y + 0.05).kind === 'ice';
      this.slideV = Math.max(0, this.slideV - (onIce ? 1.6 : 12) * dt);
      this.speed = this.slideV;
      this.slideDist += this.slideV * dt;
      moving = false;
    } else this.speed = approach(this.speed, moving ? top : 0, moving ? 8 : 12, dt);
    this.stamina = Math.min(1, this.stamina + STAMINA.perchFill * dt);

    const p = this.root.position;
    const ox = p.x, oz = p.z;
    p.x += Math.sin(this.yaw) * this.speed * dt;
    p.z += Math.cos(this.yaw) * this.speed * dt;
    this.#collide(p, BODY_R.ground, 0.28);
    let surf = this.#surface(p.x, p.z, p.y + 0.05);
    // a perch is support while he stays on it (a lamppost cap, a rail, a roof rim)
    const ps = this.mode === 'perch' ? this.#perchSupport(p) : null;
    if (ps != null && ps >= surf.y - 0.05) { surf.y = ps; surf.kind = 'perch'; }
    // Batch-3 (#1): the water (its surface, never the bed under it: whatever yRef found)
    this.edgeT = Math.max(0, this.edgeT - dt);
    const wl = ps == null ? this.#waterFloor(p.x, p.z, surf) : null;
    if (this.floating) {
      if (wl != null) surf = { y: wl, kind: 'float' };
      else if (surf.y > p.y + 0.3 || surf.y < p.y - 0.25) { p.x = ox; p.z = oz; this.speed *= 0.5; surf = { y: p.y, kind: 'float' }; }   // a high bank (a stone basin's rim): stay afloat
      else this.floating = false;   // out onto a low bank
    } else if (wl != null) {
      const w0 = this.#waterFloor(ox, oz, this.#surface(ox, oz, p.y + 0.05));
      if (w0 != null) { this.floating = true; surf = { y: w0, kind: 'float' }; p.x = ox; p.z = oz; this.speed = 0; }   // placed on the water (or an old save on its bed): up and afloat
      else {
        // the water's edge: a low wall, with a small splash
        p.x = ox; p.z = oz; this.speed = 0;
        if (this.edgeT <= 0) { this.edgeT = FLOAT.edgeEvery; this.events.push({ type: 'edge', x: p.x + Math.sin(this.yaw) * 0.3, y: wl, z: p.z + Math.cos(this.yaw) * 0.3 }); }
        surf = { y: p.y, kind: 'terrain' };
      }
    }
    if (surf.kind === 'float') {
      p.y = surf.y;   // Batch-3 (review): afloat, always on the surface (an old save on the lake bed rises to it; no step check)
    } else if (surf.y > p.y + 0.3) {
      // too steep a step: stay put
      p.x = ox; p.z = oz;
      this.speed *= 0.5;
    } else if (surf.y < p.y - 0.25) {
      // walked off an edge: flutter into the air
      this.#startFly(0.4, Math.max(2, this.speed));
      return;
    } else if (surf.kind === 'water') {
      this.#splash();
      this.#startFly(3, 2.5);
      return;
    } else {
      p.y = surf.y;
    }
    if (this.mode === 'perch' && ps == null) this.mode = 'walk';

    // step cycle drives the head-bob; it keeps running until the head is back at rest
    const stepLen = stepLength(this.speed);
    const stepRate = this.speed / stepLen;
    if (stepRate > 0.3) this.stepPhase += stepRate * dt;
    else if (this.stepPhase % 1 !== 0) this.stepPhase = Math.min(Math.ceil(this.stepPhase), this.stepPhase + dt * 5);

    if (this.peckT >= 0) {
      this.peckT += dt;
      if (this.peckT >= PECK_TIME) this.peckT = -1;
    }
    if (inp.pressed('peck') && this.peckT < 0) this.peckT = 0;
    if (inp.pressed('flap')) {
      // Batch-3 (#1): off the water, the strong take-off (no hop)
      this.fromWater = this.floating;
      // Batch-2 (#5): may this one become a hop? Decided now (where he stands), used when the squash ends
      this.hopArmed = !this.fromWater && !this.legacyTakeoff && this.hopOk && this.mode === 'walk' && this.slideV <= 0 && this.#hopGround();
      this.hopOk = false;   // used up: main.js sets it again on the next ground press
      this.flapAgain = false;
      this.mode = 'takeoff'; this.modeT = 0; this.peckT = -1; this.slideV = 0;
    }
  }

  /** Batch-2 (#5): ordinary ground: terrain under him and along the hop (no water, no drop or wall-top just ahead). */
  #hopGround() {
    const p = this.root.position;
    const here = this.#surface(p.x, p.z, p.y + 0.05);
    if (here.kind !== 'terrain' || Math.abs(here.y - p.y) > 0.05) return false;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const d of [0.6, 1.2, 1.9, 2.6]) {
      const s = this.#surface(p.x + fx * d, p.z + fz * d, p.y + 0.6);
      if (s.kind === 'water' || s.y < p.y - 0.35 || s.y > p.y + 0.5) return false;
    }
    return true;
  }

  /** Sit in a vehicle (vehicles.js moves him) or get out. cam: { dist, height, look }. */
  sit(cam) { this.floating = false; this.mode = 'drive'; this.modeT = 0; this.speed = 0; this.vy = 0; this.perch = null; this.slideV = 0; this.driveCam = cam; this.useModel('stand'); }
  stand() { this.mode = 'walk'; this.modeT = 0; this.driveCam = null; this.speed = 0; }
  twirl() { this.twirlT = 0.8; }

  /** Head offset (m, + forward of rest) of the walk's head thrust: held still in space, then a snap forward (Gus rig). */
  headShift() {
    if (this.mode !== 'walk' && this.mode !== 'perch') return 0;
    return this.skin.headShift;
  }

  // ---------------------------------------------------------------- take-off
  #updateTakeoff() {
    if (this.input.pressed('flap')) this.flapAgain = true;   // Batch-2 (#5): a second press during the squash flies
    if (this.modeT >= TAKEOFF_SQUASH) {
      // Batch-2 (#5): released before the squash ended (and not pressed again) → a hop; otherwise the take-off as before
      if (this.fromWater) { this.#startFly(FLOAT.vy, FLOAT.go); this.waterGrace = FLOAT.grace; }   // Batch-3 (#1): up and away
      else if (this.hopArmed && !this.flapAgain && !this.input.held('flap') && !this.input.scripted) this.#startHop();
      else this.#startFly(3.2, Math.max(4.5, this.speed));
      this.hopArmed = false; this.fromWater = false;
    }
  }

  // ---------------------------------------------------------------- hop (Batch-2, #5)
  #startHop() {
    this.mode = 'hop';
    this.modeT = 0;
    this.vy = HOP.vy;
    this.speed = Math.max(HOP.speed, this.speed);
    this.perch = null;
    this.hopFrom = { x: this.root.position.x, y: this.root.position.y, z: this.root.position.z };
    this.flyAnim.freq = 7; this.flyAnim.amp = 0.9;
    this.useModel('fly');
    this.events.push({ type: 'hop', x: this.hopFrom.x, y: this.hopFrom.y, z: this.hopFrom.z });
  }

  #updateHop(dt, cameraYaw) {
    const inp = this.input;
    // pressed again in the air: the full take-off at once (from the hop's height and speed)
    if (inp.pressed('flap') && !inp.scripted) { this.#startFly(3.2, Math.max(4.5, this.speed)); return; }
    const mv = inp.move ? inp.move() : { x: inp.axis('left', 'right'), y: inp.axis('back', 'forward') };
    if (Math.hypot(mv.x, mv.y) > 0.1) {
      const sn = Math.sin(cameraYaw), cs = Math.cos(cameraYaw);
      const dx = mv.y * sn + mv.x * cs, dz = mv.y * cs - mv.x * sn;
      const diff = wrapAngle(Math.atan2(dx, dz) - this.yaw);
      this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), HOP.turn * dt);
    }
    const p = this.root.position;
    p.x += Math.sin(this.yaw) * this.speed * dt;
    p.z += Math.cos(this.yaw) * this.speed * dt;
    this.vy -= HOP.gravity * dt;
    p.y += this.vy * dt;
    if (this.#collide(p, BODY_R.ground, 0.28)) this.speed *= 0.5;
    const surf = this.#surface(p.x, p.z, p.y + 0.05);
    this.lowAlt = p.y - surf.y;
    this.flare = this.vy < 0;   // the legs reach down on the way back (looks only)
    const a = this.flyAnim;
    a.freq = approach(a.freq, this.vy > 0 ? 8 : 6, 6, dt);
    a.amp = approach(a.amp, this.vy > 0 ? 0.95 : 0.8, 6, dt);
    a.offset = approach(a.offset, this.vy > 0 ? -0.5 : -0.2, 8, dt);
    this.wings.advance(dt, a.freq);
    this.wings.setStroke(a.amp, a.offset);
    if (this.vy <= 0 && p.y <= surf.y + 0.01) {
      if (surf.kind === 'water') {
        // never into the water and never into flight: a splash and back where he hopped from
        this.#splash();
        const h = this.hopFrom;
        p.set(h.x, h.y, h.z);
      } else p.y = surf.y;
      this.#land('walk', null, true);
      return;
    }
    if (this.modeT > HOP.max) this.#startFly(0.4, Math.max(2, this.speed));   // off an unseen drop: flutter, as walking off an edge does
  }

  #startFly(vy, speed) {
    this.liftT = this.mode === 'fly' ? this.liftT : 0;   // Batch-2 (#5): seconds since leaving the ground (the touch boost grace)
    this.floating = false;   // Batch-3
    this.mode = 'fly';
    this.modeT = 0;
    this.vy = vy;
    this.speed = speed;
    this.perch = null;
    this.boostT = 0;
    this.diveHeldT = 0; this.landLatch = 0; this.glideT = 0; this.sinceFlap = 0;
    this.useModel('fly');
  }

  // ---------------------------------------------------------------- flight
  #updateFly(dt, cameraYaw) {
    const inp = this.input;
    const mv = inp.move ? inp.move() : { x: inp.axis('left', 'right'), y: inp.axis('back', 'forward') };
    const amount = Math.min(1, Math.hypot(mv.x, mv.y));
    const diveIn = inp.held('dive');
    const canClimb = this.stamina > 0.001;
    const flapping = inp.held('flap') && canClimb;
    // Land/perf: a short tap of Land while low lands too (see LAND). Holding it is the dive exactly as before.
    this.sinceFlap = inp.held('flap') ? 0 : this.sinceFlap + dt;
    if (diveIn) this.diveHeldT += dt;
    else {
      if (this.diveHeldT > 0 && this.diveHeldT <= LAND.tap + 1e-6 && this.sinceFlap - this.diveHeldT >= LAND.calm - 1e-6 && !inp.scripted) {
        const pp = this.root.position, below = this.#surface(pp.x, pp.z, pp.y + 0.05);
        if (pp.y - below.y <= LAND.alt) this.landLatch = LAND.max;   // Batch-3 (#1): over the water too (he floats)
      }
      this.diveHeldT = 0;
    }
    if (this.landLatch > 0) {
      this.landLatch -= dt;
      if (inp.scripted || inp.held('flap') || inp.pressed('sprint') || inp.pressed('boost') || this.boostT > 0) this.landLatch = 0;
    }
    const landing = this.landLatch > 0 && !diveIn;
    const diving = diveIn || landing;
    this.glideT = flapping || diving ? 0 : this.glideT + dt;
    // boost: Shift (or L3) pressed in the air, or a double-tapped Flap on touch
    // Batch-2 (#5): the touch double-tap is no boost in the first BOOST_GRACE s after leaving the ground (tap-hop, tap-fly)
    this.liftT = (this.liftT || 0) + dt;
    const tapBoost = inp.pressed('boost') && (this.legacyTakeoff || this.liftT >= BOOST_GRACE);
    if ((inp.pressed('sprint') || tapBoost) && this.boostT <= 0 && this.stamina >= STAMINA.boostCost * 0.5) {
      this.boostT = FLY.boostTime * (this.boostMul || 1);   // Draft: the Racers double it
      this.stamina = Math.max(0, this.stamina - STAMINA.boostCost);
      this.events.push({ type: 'boost' });
    }
    if (this.boostT > 0) this.boostT -= dt;

    // steer toward the stick's direction in the camera's horizontal plane
    const prevYaw = this.yaw;
    if (amount > 0.1) {
      const sn = Math.sin(cameraYaw), cs = Math.cos(cameraYaw);
      const dx = mv.y * sn + mv.x * cs, dz = mv.y * cs - mv.x * sn;
      const diff = wrapAngle(Math.atan2(dx, dz) - this.yaw);
      this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), FLY.turn * dt * Math.min(1, 0.4 + amount));
    }
    const yawRate = wrapAngle(this.yaw - prevYaw) / Math.max(dt, 1e-4);

    const lim = this.carryLimits;
    if (lim) this.boostT = 0;   // a heavy item: low and slow
    let targetSpeed = this.boostT > 0 ? FLY.boost : landing ? LAND.speed : diving ? FLY.dive : amount > 0.1 ? FLY.cruise : FLY.glide;
    if (this.skyMul > 1) targetSpeed *= this.skyMul;   // Batch-2 (#13): Open sky (main.js sets it far outside the city), before the heavy clamp
    if (lim) targetSpeed = Math.min(targetSpeed, lim.maxSpeed);
    this.speed = approach(this.speed, targetSpeed, this.boostT > 0 ? 4 : landing ? 2.5 : diving ? 1.8 : 1.6, dt);
    const targetVy = landing ? -LAND.sink : diving ? -FLY.diveSink : flapping ? FLY.climb : -FLY.glideSink;
    this.vy = approach(this.vy, targetVy, flapping ? 3 : diving ? 2.2 : 1.5, dt);
    if (inp.pressed('flap') && canClimb) this.vy += 1.2;

    // stamina: climbing and boosting drain it; level gliding refills it
    if (flapping) this.stamina = Math.max(0, this.stamina - STAMINA.climbDrain * (1 - this.staminaBonus) * dt);
    else if (this.boostT <= 0 && this.vy > -2) this.stamina = Math.min(1, this.stamina + STAMINA.glideFill * dt);

    const p = this.root.position;
    p.x += Math.sin(this.yaw) * this.speed * dt;
    p.z += Math.cos(this.yaw) * this.speed * dt;
    p.y += this.vy * dt;
    if (p.y > FLY.ceiling) { p.y = FLY.ceiling; this.vy = Math.min(this.vy, 0); }
    if (lim) {
      const gy = this.#surface(p.x, p.z, p.y + 0.05).y;
      if (p.y > gy + lim.maxAlt) { p.y = Math.max(gy + lim.maxAlt, p.y - 3 * dt); this.vy = Math.min(this.vy, 0); if (!(this.ceilT > 0)) this.events.push({ type: 'ceiling', x: p.x, y: p.y, z: p.z }); this.ceilT = 2; }   // fun pass (P10): felt, not just stated
      this.ceilT = Math.max(0, (this.ceilT || 0) - dt);
      if (this.speed > lim.maxSpeed) this.speed = lim.maxSpeed;
    }

    // walls and trunks: a glancing slide (about 70% of the speed kept)
    const hit = this.#collide(p, BODY_R.air, 0.3);
    if (hit) {
      const hx = Math.sin(this.yaw), hz = Math.cos(this.yaw);
      const into = hx * hit.x + hz * hit.z;
      if (into < -0.05) {
        // slide along the wall: drop the into-wall part of the heading
        const tx = hx - hit.x * into, tz = hz - hit.z * into;
        const tl = Math.hypot(tx, tz);
        if (tl > 0.05) this.yaw = Math.atan2(tx / tl, tz / tl);
        else this.yaw += Math.PI * 0.5;
        this.speed *= Math.max(0.7, 1 - Math.abs(into) * 0.3);
        this.events.push({ type: 'bump', x: p.x, y: p.y, z: p.z, tag: hit.tag });
      }
      this.lastHit = hit.tag;
    }
    // soft canopies: pass through with a leaf burst and a slight slowdown
    const soft = this.world.collision ? this.world.collision.softAt(_mid.set(p.x, p.y + 0.15, p.z)) : null;
    if (soft) {
      if (!this.inCanopy) this.events.push({ type: 'leaves', x: p.x, y: p.y + 0.15, z: p.z });
      this.speed = Math.max(this.speed * (1 - 0.9 * dt), FLY.glide * 0.75);
    }
    this.inCanopy = !!soft;

    // rocks and rising ground: ride up over them rather than through
    const surf = this.#surface(p.x, p.z, p.y + 0.05);
    if (p.y < surf.y && surf.kind !== 'water' && this.vy > -0.5) {
      p.y = surf.y;
    }
    this.lowAlt = p.y - surf.y;   // Land/perf: for the HUD's Land prompt (read only)
    // Batch-3 (#1): the water's surface is a floor in flight too. A steep dive (or one in the first 0.3 s, before landings
    // count) could pass more than a step below it in one frame; surface() then dropped the water and he landed on the bed.
    const wf = this.#waterFloor(p.x, p.z, surf);
    if (wf != null && p.y < wf) {
      p.y = wf;
      if (this.waterGrace > 0) this.vy = Math.max(this.vy, 0.5);   // just off the water: up, not back down
      else if (this.#gentle(landing)) { this.#floatDown(); return; }
      else { this.vy = 3.2; this.speed = Math.max(this.speed * 0.6, 4); this.landLatch = 0; this.#splash(); return; }   // the splash-bounce
    }

    this.bank = approach(this.bank, THREE.MathUtils.clamp(yawRate * 0.42, -0.85, 0.85), 4, dt);
    // wings: fast hard beats when climbing, slower beats in a glide, tucked in a dive
    const a = this.flyAnim;
    const takeoffBoost = Math.max(0, 1 - this.modeT / 0.6);
    const beating = flapping || takeoffBoost > 0 || this.boostT > 0;
    // Land/perf: the last couple of metres of a landing, wings spread and back-beating (a flare; looks only)
    const flare = diving && this.lowAlt < 2.2 && surf.kind !== 'water';
    this.flare = flare;   // Gus rig: the legs reach down for the landing (looks only)
    a.freq = approach(a.freq, flare ? 6.5 : diving ? 1.5 : beating ? 7.5 : amount > 0.1 ? 4.6 : 3.4, 6, dt);
    a.amp = approach(a.amp, flare ? 0.85 : diving ? 0.12 : beating ? 0.95 : amount > 0.1 ? 0.72 : 0.45, flare ? 12 : 5, dt);
    a.offset = approach(a.offset, flare ? -0.2 : diving ? 0.35 : -0.5, flare ? 12 : 5, dt);
    this.wings.advance(dt, a.freq);
    this.wings.setStroke(a.amp, a.offset);

    // perch or land
    if (this.vy <= 0.2 && this.modeT > 0.3) {
      const perch = this.#nearestPerch(landing ? LAND.perchR : 0.6, 0.15, 0.6);   // Land/perf: a tapped Land catches a perch a little wider
      if (perch) {
        p.set(perch.x, perch.y, perch.z);
        if (perch.yaw != null) this.yaw = perch.yaw;
        this.#land('perch', perch);
        return;
      }
      const ground = this.#surface(p.x, p.z, p.y + 0.05);
      const nearGround = diving && p.y - ground.y < 0.9;
      if (p.y <= ground.y + 0.02 || nearGround) {
        if (ground.kind === 'water' && this.waterGrace > 0) { p.y = Math.max(p.y, ground.y + 0.02); this.vy = Math.max(this.vy, 0.5); return; }   // Batch-3: just off the water
        if (ground.kind === 'water' && this.#gentle(landing)) { p.y = ground.y; this.#floatDown(); return; }   // Batch-3 (#1): a gentle arrival floats him
        if (ground.kind === 'water') {
          // splash-hop back up: water never swallows a pigeon
          p.y = ground.y + 0.02;
          this.vy = 3.2;
          this.speed = Math.max(this.speed * 0.6, 4);
          this.landLatch = 0;   // Land/perf: water is no landing
          this.#splash();
          return;
        }
        p.y = ground.y;
        const slide = ground.kind === 'ice' && this.speed > 3 ? Math.min(9, this.speed) : 0;
        this.#land('walk', null);
        if (slide) { this.slideV = slide; this.slideDist = 0; this.events.push({ type: 'slide', x: p.x, y: p.y, z: p.z }); }
      }
    }
  }

  /** Spiked perch: a springy bounce back into the air (no damage). */
  bounce() {
    this.yaw += Math.PI;
    this.#startFly(4.2, 3.5);
    this.events.push({ type: 'boing', x: this.root.position.x, y: this.root.position.y, z: this.root.position.z });
  }

  /** Take off from a script (the shoo in the first minute). */
  launch(vy = 3.2, speed = 4.5) { this.#startFly(vy, speed); }

  /** Batch-3 (#1, review): a touch on the water that floats him: a tapped Land, or a near-stall; never with noFloat. */
  #gentle(landing) { return !this.noFloat && (landing || (this.speed <= FLOAT.speed && this.vy > -FLOAT.sink)); }

  /** Batch-3 (#1): settle on the water (walk mode, floating). Not a 'land' event: nothing that waits for a landing counts it. */
  #floatDown() {
    this.#land('walk', null);
    this.floating = true;
    this.events.pop();
    const p = this.root.position;
    this.events.push({ type: 'float', x: p.x, y: p.y, z: p.z });
  }

  #splash() { const p = this.root.position; this.events.push({ type: 'splash', x: p.x, y: p.y, z: p.z }); }

  #land(mode, perch, hop = false) {
    // Batch-2 (#2): the visual root starts where he was drawn last update and eases onto the landing spot (looks only)
    const pv = this._prevPos, pp = this.root.position;
    const ex = pv.x - pp.x, ey = pv.y - pp.y, ez = pv.z - pp.z;
    this.landEase = !hop && Math.hypot(ex, ey, ez) > 0.02 && Math.hypot(ex, ey, ez) < 3 ? { t: 0, x: ex, y: ey, z: ez } : null;
    this.mode = mode;
    this.modeT = 0;
    this.perch = perch ? { ...perch, r: perch.perch?.r ?? 0.15, edge: perch.perch?.t === 'edge', id: perch.perch?.id, kind: perch.perch?.kind } : null;
    this.boostT = 0;
    this.landLatch = 0; this.diveHeldT = 0;
    this.events.push({ type: mode === 'perch' ? 'perch' : 'land', x: this.root.position.x, y: this.root.position.y, z: this.root.position.z, hop });
    this.vy = 0;
    this.speed = 0;
    this.stepPhase = Math.ceil(this.stepPhase);
    this.landSquash = hop ? 0.7 : 1;
    this.skin.replant = true;   // Gus rig: he lands with both feet on their rest spots
    this.useModel('stand');
  }

  #nearestPerch(radius, below = 0.15, above = 0.6) {
    const p = this.root.position;
    if (this.world.collision) return this.world.collision.nearestPerch(p, radius, below, above);
    // legacy test-scene world: perch points only
    let best = null, bd = radius;
    for (const q of this.world.perches) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < bd && p.y >= q.y - below && p.y <= q.y + above) { bd = d; best = { x: q.x, y: q.y, z: q.z, yaw: null, perch: { r: q.r } }; }
    }
    return best;
  }

  /** Height of the current perch under p, or null once he has stepped off it. */
  #perchSupport(p) {
    const q = this.perch;
    if (!q) return null;
    const it = q.perch;
    if (it && it.t === 'edge') {
      const a = it.a, b = it.b, ex = b.x - a.x, ez = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.z - a.z) * ez) / (ex * ex + ez * ez || 1e-9)));
      const d = Math.hypot(p.x - (a.x + ex * t), p.z - (a.z + ez * t));
      return d <= 0.25 ? a.y + (b.y - a.y) * t : null;
    }
    return Math.hypot(p.x - q.x, p.z - q.z) <= (q.r ?? q.perch?.r ?? 0.15) + 0.05 ? q.y : null;
  }

  #surface(x, z, yRef) {
    if (this.world.surface) return this.world.surface(x, z, yRef);
    return { y: this.world.groundAt(x, z, yRef), kind: 'terrain' };
  }

  #ground(x, z, yRef) { return this.#surface(x, z, yRef).y; }

  /** Batch-3 (#1): the water's level if the water is the floor here (over the surface found, or that surface itself), else
   *  null. A bridge deck or a rock above the water is not water. */
  #waterFloor(x, z, surf) {
    if (surf.kind === 'water') return surf.y;
    const w = this.world.collision?.waterAt(x, z);
    return w && w.level > surf.y ? w.level : null;
  }

  /** Push Gus out of walls; returns the hit normal {x, z, tag} or null. */
  #collide(p, r, h) {
    if (this.world.collision) return this.world.collision.pushOut(p, r, h, _hit);
    let hit = null;
    for (const b of this.world.boxes) {
      if (p.y >= b.max.y - 0.001 || p.y + h < b.min.y) continue;
      const cx = Math.max(b.min.x, Math.min(p.x, b.max.x));
      const cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
      const dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-5) { p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; hit = { x: dx / d, z: dz / d, tag: 'box' }; }
    }
    return hit;
  }

  /** Drain effect events (leaf bursts, splashes, bumps, landings). */
  takeEvents() { const e = this.events; this.events = []; return e; }

  // ---------------------------------------------------------------- pose
  #pose(dt) {
    let spin = 0;
    if (this.twirlT > 0) { this.twirlT = Math.max(0, this.twirlT - dt); spin = Math.PI * 2 * ease(1 - this.twirlT / 0.8); }
    this.root.rotation.set(0, this.yaw + spin, 0);
    if (this.mode === 'fly' || this.mode === 'hop') {
      const climb = THREE.MathUtils.clamp(this.vy * 0.07, -0.35, 0.3);
      // Gus rig: in the landing flare he pitches up a little and reaches down with his feet (looks only)
      this.flareK = approach(this.flareK || 0, this.flare ? 1 : 0, 8, dt);
      this.pitch = approach(this.pitch, GUS_FLY.flightPitch - climb - this.flareK * 0.45, 6, dt);
      this.flyPose.rotation.set(this.pitch, 0, this.bank, 'YXZ');
      const stretch = this.mode === 'hop' ? 0 : Math.max(0, 1 - this.modeT / 0.25) * 0.15;
      this.flyPose.scale.set(1 - stretch * 0.4, 1 + stretch, 1 - stretch * 0.4);
      this.skin.poseFly({ dt, modeT: this.modeT, flare: this.flare, lowAlt: this.lowAlt, vy: this.vy });
      return;
    }
    this.flare = false; this.flareK = 0;
    // ground poses: the take-off / landing squash stays on standPose; everything else is the skeleton (Gus rig)
    let sq = 0;
    if (this.mode === 'takeoff') sq = Math.sin(Math.min(1, this.modeT / TAKEOFF_SQUASH) * Math.PI * 0.5) * 0.24;
    // Batch-2 (#2): the eased landing: the stand model glides the last bit forward and down onto the spot; the squash
    // waits until the feet are down (looks only)
    const le = this.landEase;
    let ox = 0, oy = 0, oz = 0;
    if (le) {
      le.t += dt;
      const k = le.t >= LAND_EASE ? 0 : 1 - ease(le.t / LAND_EASE);
      if (k <= 0) this.landEase = null;
      else {
        // data-space offset → root space (root: yaw about y, then its x mirror)
        const c = Math.cos(this.yaw), s = Math.sin(this.yaw), sx = this.root.scale.x || 1;
        ox = (le.x * c - le.z * s) * k / sx; oy = le.y * k; oz = (le.x * s + le.z * c) * k;
      }
    }
    if (this.landSquash > 0 && !(le && le.t < LAND_EASE * 0.7)) {
      sq = Math.max(sq, Math.sin(this.landSquash * Math.PI) * 0.18);
      this.landSquash = Math.max(0, this.landSquash - dt / 0.18);
    }
    if (this.floating && this.mode === 'walk') oy += -0.035 + Math.sin((this.bobT = (this.bobT || 0) + dt) * 2.4) * 0.018;   // Batch-3: a gentle bob, low in the water (looks only)
    this.standPose.position.set(ox, oy, oz);
    this.standPose.rotation.set(0, 0, 0);
    this.standPose.scale.set(1 + sq * 0.45, 1 - sq, 1 + sq * 0.45);
    const stepLen = stepLength(this.speed);
    this.skin.poseGround({
      dt, root: this.root, speed: this.mode === 'drive' ? 0 : this.speed, walkSpeed: WALK_SPEED, stepPhase: this.stepPhase, stepLen,
      peck: this.peckT >= 0 ? Math.min(1, this.peckT / PECK_TIME) : -1, spin: this.twirlT > 0, ride: this.mode === 'drive',
    });
  }
}

const _prev = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _hit = { x: 0, z: 0, tag: null };
