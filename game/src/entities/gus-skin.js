// Gus rig: Gus's procedural skeletons and his pose animation (visual only:
// nothing here feeds back into movement, collision or timing).
//
// gus-stand becomes a SkinnedMesh with 9 bones: root, body, neck, head, tail,
// and a leg + foot (toes) on each side. gus-fly gets root + two legs (its wings
// stay on the Wingbeat shader). Weights come from vertex positions with
// smooth falloffs (see GUS_STAND.skin / GUS_FLY.skin in gus-rig.js).
//
// Ground (poseGround, once per fixed update):
//   - walk: the existing step cycle drives a two-foot gait. A foot swings
//     (lifts, toes curl, lands ahead) and is then PINNED in world space until
//     its next swing, so it never slides; stance length = reach / step length.
//   - the pigeon head thrust: the head is held still in space (the body walks
//     under it), then snaps forward; it never bobs up and down (the head is
//     posed in model space, so the body's bob and roll don't reach it).
//   - the body rolls over the stance foot and rises a touch mid-step.
//   - idle: look-arounds, head cocks, weight shifts, small shuffle steps when
//     a foot ends up off its rest spot (stopping, turning on the spot).
//   - peck: the head leads (neck bends, beak tips down), the body leans after.
// Flight (poseFly): legs tuck back after take-off and swing forward and down
// for a landing (the flare in the last 2 m, or any low descent).

import * as THREE from 'three';
import { SkinRig, smoothstep } from '../anim/skin-rig.js';
import { GUS_STAND, GUS_FLY } from './gus-rig.js';

const REACH = 0.075;         // m: a planted foot travels ±REACH (local z) under the hip during stance (Flight hint / scarf: 0.055 → 0.075 for the longer, slower step)
const DRAG = 0.132;          // m: a planted foot dragged this far from its rest spot re-plants (Flight hint / scarf: was REACH * 2.4; kept when REACH grew)
const LIFT = 0.028;          // m: foot lift at mid-swing (walk)
const TOE = 0.062;           // m: ankle to the front toe tips
const HEAD_RANGE = 0.04;     // m: the head's forward/back travel relative to the body (each way; Flight hint / scarf: 0.03 → 0.04, a longer hold)
const PECK_ANGLE = THREE.MathUtils.degToRad(40);
const PECK_LEAN = THREE.MathUtils.degToRad(16);

const ease = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (t) => t * t * (3 - 2 * t);
const approach = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ weights
function standWeights(S) {
  const [lc0, lc1] = S.legCol, [lt0, lt1] = S.legTop, [ty0, ty1] = S.toesY, [fy0, fy1] = S.footY;
  const legs = S.legs.map((l) => ({ x: l.hip[0], z: l.hip[2], s: Math.sign(l.hip[0]) }));
  // joints: 0 root, 1 body, 2 neck, 3 head, 4 tail, 5 leg0, 6 foot0, 7 leg1, 8 foot1
  return (x, y, z, w) => {
    let legSum = 0;
    for (let k = 0; k < 2; k++) {
      const L = legs[k];
      const col = 1 - smoothstep(lc0, lc1, Math.hypot(x - L.x, z - L.z));
      const toes = (x * L.s > 0.004 ? 1 : 0) * (1 - smoothstep(ty0, ty1, y));
      const lw = Math.max(col, toes) * (1 - smoothstep(lt0, lt1, y));
      const ff = 1 - smoothstep(fy0, fy1, y);
      w[5 + k * 2] = lw * (1 - ff);
      w[6 + k * 2] = lw * ff;
      legSum += lw;
    }
    const r = Math.max(0, 1 - legSum);
    const zm = smoothstep(S.neckZ[0], S.neckZ[1], z);
    const nw = smoothstep(S.neckY[0], S.neckY[1], y) * zm;
    const hw = smoothstep(S.headY[0], S.headY[1], y) * zm;
    const tw = smoothstep(S.tailZ[0], S.tailZ[1], z) * smoothstep(S.tailY[0], S.tailY[1], y) * (1 - nw);
    w[3] = r * hw;
    w[2] = r * (nw - hw);
    w[4] = r * tw;
    w[1] = r * (1 - nw) * (1 - tw);
  };
}

function flyWeights(F) {
  const [b0, b1] = F.box, [t0, t1] = F.top, [z0, z1] = F.tailZ;
  // joints: 0 root, 1 leg0, 2 leg1
  return (x, y, z, w) => {
    let sum = 0;
    for (let k = 0; k < 2; k++) {
      const h = F.legs[k].hip;
      const lw = (1 - smoothstep(b0, b1, Math.abs(x - h[0]))) * (1 - smoothstep(t0, t1, y)) * smoothstep(z0, z1, z);
      w[1 + k] = lw;
      sum += lw;
    }
    w[0] = Math.max(0, 1 - sum);
  };
}

// ------------------------------------------------------------------ the rig
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _one = new THREE.Vector3(1, 1, 1);
const _s = new THREE.Vector3();

// deterministic idle choices (never touches the game's rng streams)
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export class GusSkin {
  /** stand / fly: { geometry, makeMaterial } from loadBakedModel; flyMat already carries the Wingbeat patch. */
  constructor(stand, standMat, fly, flyMat) {
    const S = GUS_STAND.skin;
    const legJ = S.legs.flatMap((l, k) => [
      { name: 'leg' + k, parent: 'root', at: l.hip },
      { name: 'foot' + k, parent: 'leg' + k, at: l.ankle },
    ]);
    this.stand = new SkinRig([
      { name: 'root', parent: null, at: [0, 0, 0] },
      { name: 'body', parent: 'root', at: S.body },
      { name: 'neck', parent: 'body', at: S.neck },
      { name: 'head', parent: 'neck', at: S.head },
      { name: 'tail', parent: 'body', at: S.tail },
      ...legJ,
    ], standWeights(S));
    this.stand.patch = () => {};   // the scarf calls patch() on its rig (NeckBend's interface); skinning needs none
    this.standMesh = this.stand.makeMesh(stand.geometry, standMat);

    const F = GUS_FLY.skin;
    this.fly = new SkinRig([
      { name: 'root', parent: null, at: [0, 0, 0] },
      ...F.legs.map((l, k) => ({ name: 'leg' + k, parent: 'root', at: l.hip })),
    ], flyWeights(F));
    this.flyMesh = this.fly.makeMesh(fly.geometry, flyMat);

    // rest geometry for the solvers
    this.body0 = new THREE.Vector3(...S.body);
    this.neck0 = new THREE.Vector3(...S.neck);
    this.head0 = new THREE.Vector3(...S.head);
    this.neckVec0 = this.head0.clone().sub(this.neck0).normalize();
    this.feet = S.legs.map((l) => ({
      hip: new THREE.Vector3(...l.hip),
      ankle: new THREE.Vector3(...l.ankle),
      neutral: new THREE.Vector3(l.ankle[0], 0, l.ankle[2]),   // where the foot rests (local, on the ground)
      local: new THREE.Vector3(l.ankle[0], 0, l.ankle[2]),      // current foot (local; y = lift)
      wx: 0, wz: 0,               // planted spot (game space)
      swinging: false, k: -1, u: 0, curl: 0,
      from: new THREE.Vector3(), to: new THREE.Vector3(),
    }));
    this.headDz = 0;
    this.idle = { t: 0, next: 1.2, n: 0, look: 0, tilt: 0, shift: 0, lookT: 0, tiltT: 0, shiftT: 0, hold: 0 };
    this.peckP = 0;
    this.legExt = 1;     // flight: 0 tucked, 1 reaching down for a landing
    this.prevS = 0;
    this.lastPos = new THREE.Vector3(1e9, 0, 0);
    this.lastYaw = 0;
  }

  // ------------------------------------------------------------ helpers
  #toWorld(f, root) {
    const yaw = root.rotation.y, sx = root.scale.x, c = Math.cos(yaw), s = Math.sin(yaw);
    f.wyaw = yaw; f.yawOff = 0;   // Flight hint / scarf: a planted foot keeps its heading too (its toes don't swivel as he turns)
    const lx = f.local.x * sx, lz = f.local.z;
    f.wx = root.position.x + lx * c + lz * s;
    f.wz = root.position.z - lx * s + lz * c;
  }

  #toLocal(f, root, out) {
    const yaw = root.rotation.y, sx = root.scale.x, c = Math.cos(yaw), s = Math.sin(yaw);
    const dx = f.wx - root.position.x, dz = f.wz - root.position.z;
    out.x = (dx * c - dz * s) / sx;
    out.z = dx * s + dz * c;
    return out;
  }

  /** Plant both feet where they rest (a teleport, a model swap, a twirl). */
  resetFeet(root) {
    for (const f of this.feet) {
      f.local.copy(f.neutral);
      f.swinging = false; f.u = 0; f.curl = 0; f.k = -1;
      this.#toWorld(f, root);
    }
    this.lastPos.copy(root.position);
    this.lastYaw = root.rotation.y;
  }

  /** Model-space head offset (m, + forward) of the thrust: what headShift() reports. */
  get headShift() { return this.headDz; }

  // ------------------------------------------------------------ ground
  /**
   * o: { dt, root, speed, walkSpeed, stepPhase, stepLen, peck (0..1 progress or -1), mode, spin (twirl active) }
   */
  poseGround(o) {
    const { dt, root } = o;
    const R = this.stand, B = R.bones;
    R.reset();
    // a jump in position (place, respawn, a vehicle) or a twirl: feet re-plant under him
    const moved = Math.hypot(root.position.x - this.lastPos.x, root.position.z - this.lastPos.z);
    if (this.replant || moved > o.speed * dt * 1.5 + 0.03 || Math.abs(root.position.y - this.lastPos.y) > 0.3 || o.spin || o.ride) this.resetFeet(root);
    this.replant = false;
    this.lastPos.copy(root.position);

    const s = o.stepPhase;
    const sl = o.stepLen;
    const walkK = Math.min(1, o.speed / o.walkSpeed);
    const stepping = s !== this.prevS && o.speed > 0.05;
    this.prevS = s;

    // -------- feet
    const D = THREE.MathUtils.clamp(REACH / sl, 0.15, 0.72);   // stance share of a stride (Flight hint / scarf: min 0.3 → 0.15, so a long step never drags a planted foot past its reach)
    const sw = 2 * (1 - D);                                       // swing length, in steps
    const ahead = REACH * Math.min(1, o.speed / (0.5 * o.walkSpeed));
    let idleSwing = false;
    for (let k = 0; k < 2; k++) {
      const f = this.feet[k];
      if (stepping) {
        let kk = Math.floor(s);
        if (((kk % 2) + 2) % 2 !== k) kk -= 1;
        const u = (s - kk) / sw;
        const mine = f.swinging && f.k === kk;
        if (u < 1 && (mine || (u < 0.35 && f.k !== kk))) {   // a window already half gone (walking off from a stop) waits for the next
          if (!mine) { if (f.swinging) this.#endSwing(f, root); this.#beginSwing(f, root, kk); }
          f.u = u;
          f.to.set(f.neutral.x, 0, f.neutral.z + ahead);
        } else if (f.swinging) this.#endSwing(f, root);
      } else if (f.swinging) {
        f.u += dt / 0.13;   // a step that was under way finishes on its own
        f.to.copy(f.neutral);
        if (f.u >= 1) this.#endSwing(f, root);
      }
      idleSwing ||= f.swinging;
    }
    // stance feet: stay where they were planted (in the world)
    for (const f of this.feet) {
      if (f.swinging) {
        const e = smooth(Math.min(1, f.u));
        f.yawOff = (f.yawOff0 || 0) * (1 - e);   // the heading comes back round in the air
        f.local.x = lerp(f.from.x, f.to.x, e);
        f.local.z = lerp(f.from.z, f.to.z, e);
        const lift = (stepping ? LIFT * (0.55 + 0.45 * walkK) : LIFT * 0.6) * Math.sin(Math.PI * Math.min(1, f.u));
        f.local.y = lift;
        // toes curl down in the air, never into the ground (toe tip ~TOE m ahead of the ankle)
        f.curl = Math.min(0.8 * Math.sin(Math.PI * Math.min(1, f.u * 1.15)), Math.asin(Math.min(1, Math.max(0, (f.ankle.y + lift - 0.009) / TOE))));
      } else {
        this.#toLocal(f, root, f.local);
        f.local.y = 0;
        f.curl = 0;
        f.yawOff = Math.atan2(Math.sin(f.wyaw - root.rotation.y), Math.cos(f.wyaw - root.rotation.y));
        // dragged too far (a hard turn, a shove): a quick re-plant
        if (Math.hypot(f.local.x - f.neutral.x, f.local.z - f.neutral.z) > DRAG || Math.abs(f.yawOff) > 0.9) { f.local.copy(f.neutral); this.#toWorld(f, root); }
      }
    }
    // standing: shuffle a foot that isn't on its rest spot (after stopping or turning on the spot)
    if (!stepping && !idleSwing && o.peck < 0) {
      this.idle.hold += dt;
      if (this.idle.hold > 0.12) {
        let best = null, bd = 0.008;
        for (const f of this.feet) { const d = Math.hypot(f.local.x - f.neutral.x, f.local.z - f.neutral.z); if (d > bd) { bd = d; best = f; } }
        if (best) { this.#beginSwing(best, root, -1); best.u = 0; best.to.copy(best.neutral); }
      }
    } else this.idle.hold = 0;

    // -------- body: roll over the stance foot, rise a touch mid-step, lean for a peck
    const peck = o.peck >= 0 ? o.peck : -1;
    const headP = peck >= 0 ? Math.sin(Math.PI * Math.min(1, peck / 0.8)) : 0;     // the head leads...
    const leanP = peck >= 0 ? Math.sin(Math.PI * Math.max(0, (peck - 0.12) / 0.88)) : 0;   // ...the body follows
    const id = this.#idle(dt, o, stepping);
    const sp = Math.sin(Math.PI * s);
    const roll = -sp * 0.075 * walkK + id.shift * 0.05;
    const bob = (0.5 - 0.5 * Math.cos(2 * Math.PI * s)) * 0.004 * walkK;
    const lean = leanP * PECK_LEAN + 0.05 * walkK;     // a slight forward lean when walking
    B.body.position.y += bob;
    B.body.position.x += id.shift * 0.006;
    B.body.quaternion.setFromEuler(_e.set(lean, sp * 0.05 * walkK, roll, 'YXZ'));
    B.tail.quaternion.setFromEuler(_e.set(-0.12 * Math.abs(Math.sin(Math.PI * s)) * walkK - leanP * 0.2, -sp * 0.1 * walkK, 0, 'YXZ'));

    // -------- head: thrust while walking (locked in space, then a snap forward), peck, idle
    const u = ((s % 1) + 1) % 1;
    const hold = Math.min(0.6, (2 * HEAD_RANGE) / sl);
    const A = (sl * hold) / 2;
    let dz = u < hold ? A - sl * u : -A + 2 * A * ease((u - hold) / (1 - hold));
    dz *= Math.min(1, o.speed / 0.25);
    this.headDz = dz;
    // where the head goes, in model space: rest + thrust, then carried by the peck lean about the body pivot
    const bend = PECK_ANGLE * headP;
    const hd = _v.copy(this.head0).sub(this.neck0).applyAxisAngle(_X, bend * 0.75).add(this.neck0);
    hd.sub(this.body0).applyAxisAngle(_X, lean).add(this.body0);
    hd.z += dz;            // after the lean: the thrust is level, so the head never bobs up and down
    hd.y += id.lift;
    _q.setFromEuler(_e.set(lean + bend, id.look, id.tilt, 'YXZ'));
    // neck: aim from its (moved) base at the head
    R.update();
    const neckBase = _v2.setFromMatrixPosition(B.neck.matrixWorld);
    const dir = _s.subVectors(hd, neckBase);
    _q2.copy(B.body.quaternion).invert();
    dir.applyQuaternion(_q2).normalize();
    B.neck.quaternion.setFromUnitVectors(this.neckVec0, dir);
    B.neck.updateMatrixWorld(true);
    // head: exactly at hd with orientation _q (model space), whatever the neck did
    _m.compose(hd, _q, _one);
    _m2.copy(B.neck.matrixWorld).invert().multiply(_m);
    _m2.decompose(B.head.position, B.head.quaternion, _s);

    // -------- legs: each ankle to its foot target
    for (let k = 0; k < 2; k++) this.#solveLeg(B['leg' + k], B['foot' + k], this.feet[k]);
    R.update();
  }

  #beginSwing(f, root, kk) {
    f.yawOff0 = f.yawOff || 0;
    f.swinging = true;
    f.k = kk;
    f.u = 0;
    f.from.set(f.local.x, 0, f.local.z);
  }

  #endSwing(f, root) {
    f.swinging = false;
    f.local.set(f.to.x, 0, f.to.z);
    f.u = 0;
    this.#toWorld(f, root);
  }

  /** Leg bone (child of root, pivot at the hip): rotate most of the way, translate the rest, so the ankle lands on target. */
  #solveLeg(leg, foot, f) {
    const L = f.hip.y - f.ankle.y;
    const dx = f.local.x - f.neutral.x, dz = f.local.z - f.neutral.z;
    const ax = -Math.atan2(dz, L) * 0.8, az = Math.atan2(dx, L) * 0.8;
    leg.quaternion.setFromEuler(_e.set(ax, 0, az, 'XYZ'));
    // ankle target (model space): neutral + offsets, lifted
    const tgt = _v.set(f.local.x, f.ankle.y + f.local.y, f.local.z);
    const rel = _v2.subVectors(f.ankle, f.hip).applyQuaternion(leg.quaternion);
    leg.position.copy(tgt).sub(rel);          // root is identity: the leg's local position is its model-space pivot
    // the foot stays level on the ground, toes curl down in the swing
    _q.copy(leg.quaternion).invert();
    foot.quaternion.setFromEuler(_e.set(f.curl, f.yawOff || 0, 0, 'YXZ')).premultiply(_q);
  }

  #idle(dt, o, stepping) {
    const I = this.idle;
    const still = !stepping && o.speed < 0.05 && o.peck < 0;
    if (still) I.t += dt; else { I.t = 0; I.next = 0.9; I.lookT = 0; I.tiltT = 0; I.shiftT = 0; }
    if (still && I.t > I.next) {
      I.n++;
      const r = hash(I.n), r2 = hash(I.n + 0.5);
      if (r < 0.4) I.lookT = (r2 < 0.5 ? -1 : 1) * (0.45 + 0.35 * hash(I.n + 0.2));
      else if (r < 0.7) { I.tiltT = (r2 < 0.5 ? -1 : 1) * (0.3 + 0.15 * hash(I.n + 0.3)); I.lookT = I.tiltT * 0.5; }
      else if (r < 0.88) I.shiftT = r2 < 0.5 ? -1 : 1;
      else { I.lookT = 0; I.tiltT = 0; I.shiftT = 0; }   // back to centre
      I.next = I.t + 1.1 + 2.2 * hash(I.n + 0.7);
    }
    // quick head moves (birds snap their heads), slow weight shifts
    I.look = approach(I.look, I.lookT, 14, dt);
    I.tilt = approach(I.tilt, I.tiltT, 12, dt);
    I.shift = approach(I.shift, I.shiftT, 3, dt);
    const breathe = still ? Math.sin(I.t * 2.4) * 0.0012 : 0;
    return { look: I.look, tilt: I.tilt, shift: I.shift, lift: breathe };
  }

  // ------------------------------------------------------------ flight
  /** o: { dt, modeT, flare (0..1), lowAlt, vy } */
  poseFly(o) {
    const R = this.fly, B = R.bones;
    R.reset();
    // tucked after the take-off; reaching down for a landing (the flare, or a low descent)
    const landing = Math.max(o.flare ? 1 : 0, o.vy < -0.3 ? 1 - smoothstep(0.6, 2.2, o.lowAlt) : 0);
    const takeoff = Math.max(0, 1 - o.modeT / 0.35);
    const target = Math.max(landing, takeoff);
    this.legExt = approach(this.legExt, target, target > this.legExt ? 7 : 4, o.dt);
    const e = this.legExt;
    for (let k = 0; k < 2; k++) {
      const leg = B['leg' + k];
      // tucked: feet back against the belly; extended: forward and down, a little splayed
      const pitch = lerp(0.95, -0.75, e);
      const splay = (k ? 1 : -1) * 0.12 * e;
      leg.quaternion.setFromEuler(_e.set(pitch, 0, splay, 'XYZ'));
      leg.position.y -= 0.012 * e;
    }
    R.update();
  }

  /** Back to rest (the finale or anything else borrowing the model). */
  rest() { this.stand.reset(); this.stand.update(); this.fly.reset(); this.fly.update(); }
}

const _X = new THREE.Vector3(1, 0, 0);
