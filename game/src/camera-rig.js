// Third-person camera for a 0.32 m bird (design: Art direction → Camera).
//   ground: 1.2 m behind, 0.45 m up, looking 0.15 m above Gus's head, FOV 60
//   flight: 2.4 m behind, 0.6 m up, FOV 60 → 70 with speed; eases back behind
//           his travel 1.5 s after the last manual camera move
//   perched: eases out to 4 m for a look-out view
//   in a Nest: 1.8 m behind, 1.2 m up, looking down into it (Fixes-1)
// The mouse, right stick and touch drag turn it (yaw) and tilt it (pitch). It
// pushes in against walls, trunks and rims (collision.raySolid).
//
// Everything here is in game (data) coordinates: +x east, +z north. The world
// is drawn through a mirrored root, so main.js mirrors this camera's pose into
// the render camera (see world root in main.js).
//
// A debug `view` override frames fixed shots; `free` places the camera anywhere (screenshots).

import * as THREE from 'three';

const GROUND = { dist: 1.2, height: 0.45, look: 0.32 + 0.15 };
const FLIGHT = { dist: 2.4, height: 0.6, look: 0.18 };
const PERCH = { dist: 4, height: 1.3, look: 0.4 };
// Fixes-1: in a Nest (walking in or perched) the ground camera sat level with the rim and hid most of Gus (he stands
// in the straw, below the rim); look down into the nest from a little higher and closer instead.
const NEST = { dist: 1.8, height: 1.2, look: 0.22 };
const NEST_R = 0.6;
const FOLLOW_DELAY = 1.5;

const approach = (v, t, rate, dt) => v + (t - v) * Math.min(1, rate * dt);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CameraRig {
  constructor(camera) {
    this.camera = camera;          // data-space camera (frustum tests use it)
    this.yaw = 0;
    this.pitch = 0;                // manual tilt, radians (+ looks down more)
    this.dist = GROUND.dist;
    this.height = GROUND.height;
    this.look = GROUND.look;
    this.fov = 60;
    this.view = null;              // null = follow; or { yawOffset, dist, height, look }
    this.free = null;              // { pos: Vector3, look: Vector3, fov, up }
    this.photo = null;             // photo mode (#9): { yaw, elev, dist, fov, look } (ui/photo.js)
    this.autoFollow = true;
    this.target = new THREE.Vector3();
    this.pushIn = 1;
  }

  /** Debug framing: 'follow' | 'side' | 'front' | {yawOffset, dist, height, look} */
  setView(v) {
    const views = {
      follow: null,
      side: { yawOffset: -Math.PI / 2, dist: 2.0, height: 0.15, look: 0.18 },
      front: { yawOffset: Math.PI, dist: 1.3, height: 0.25, look: 0.2 },
    };
    this.view = typeof v === 'string' ? (v in views ? views[v] : null) : v;
    this.snap = true;
  }

  /** A sweeping orbit round Gus (Summit Perch reveals). */
  sweep({ secs = 5, dist = 22, height = 9, done = null } = {}) { this.orbit = { t: 0, secs, dist, height, yaw0: this.yaw, done }; }

  /** Fixes-2: a short look at something (a sign's face) layered over the follow camera: eases in, holds, eases out.
   *  Render only: the rig's yaw, distance and pitch carry on underneath, so movement input never changes. */
  glance({ pos, look, secs = 1.8 }) { this.glanceShot = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), t: 0, secs }; }

  setFree(f) { this.glanceShot = null; this.free = f ? { pos: new THREE.Vector3(...f.pos), look: new THREE.Vector3(...f.look), fov: f.fov || 60, up: f.up ? new THREE.Vector3(...f.up) : null } : null; }

  /** look: {dx, dy} manual input (radians); sinceLook: seconds since the last manual move. */
  update(dt, gus, { snap = false, look = null, sinceLook = 1e9, collision = null } = {}) {
    const cam = this.camera;
    if (this.free) {
      cam.position.copy(this.free.pos);
      cam.up.copy(this.free.up || _up);
      cam.lookAt(this.free.look);
      if (cam.fov !== this.free.fov) { cam.fov = this.free.fov; cam.updateProjectionMatrix(); }
      return;
    }
    cam.up.copy(_up);
    if (this.photo) { this.#photoCam(gus, collision); return; }   // photo mode (#9): ui/photo.js
    const flying = gus.mode === 'fly';
    const perched = gus.mode === 'perch';
    const driving = gus.mode === 'drive' && gus.driveCam;
    const gp = gus.position;
    const inNest = !flying && !driving && !!this.nests?.some((n) => (gp.x - n.x) ** 2 + (gp.z - n.z) ** 2 < NEST_R * NEST_R);
    const want = driving ? gus.driveCam : flying ? FLIGHT : inNest ? NEST : perched ? PERCH : GROUND;
    const k = snap || this.snap ? 1e9 : 1;
    this.snap = false;
    this.dist = approach(this.dist, want.dist, 2.5 * k, dt);
    this.height = approach(this.height, want.height, 2.5 * k, dt);
    this.look = approach(this.look, want.look, 3 * k, dt);
    const fov = flying ? 60 + 10 * THREE.MathUtils.clamp((gus.speed - 6) / 11, 0, 1) : 60;
    this.fov = approach(this.fov, fov, 2 * k, dt);

    if (look && (look.dx || look.dy)) {
      this.yaw += look.dx;
      this.pitch = THREE.MathUtils.clamp(this.pitch + look.dy, -0.55, 0.95);
    }
    // ease behind travel: in flight after 1.5 s without a manual move; on the
    // ground gently while walking (unless the player is steering the camera)
    const diff = wrap((gus.camYaw ?? gus.yaw) - this.yaw);   // camYaw: the RC tug (the camera follows the boat, not Gus)
    let rate = 0;
    if (this.autoFollow && sinceLook > FOLLOW_DELAY) {
      if (driving) rate = 2.2;
      else if (flying) rate = 1.6;
      else if (gus.speed > 0.3 && !perched) rate = 1.2;
    }
    this.yaw += diff * Math.min(1, rate * k * dt);
    if ((flying || driving) && sinceLook > FOLLOW_DELAY) this.pitch = approach(this.pitch, 0, 1.2, dt);
    if (this.orbit) {
      // a Summit Perch reveal: a slow sweep round Gus, pulled out wide
      const o = this.orbit;
      o.t += dt;
      const k = Math.min(1, o.t / o.secs), e = k * k * (3 - 2 * k);
      this.yaw = o.yaw0 + e * Math.PI * 2;
      this.dist = o.dist * Math.sin(Math.PI * Math.min(1, k * 1.2)) + want.dist;
      this.height = o.height * Math.sin(Math.PI * Math.min(1, k * 1.2)) + want.height;
      if (k >= 1) { this.orbit = null; o.done?.(); }
    }

    // #47: on foot the camera follows the drawn bird (gus.viewOff: a landing's last bit, eased; looks only)
    const p = gus.camTarget || (gus.viewOff ? _gp.copy(gus.position).add(gus.viewOff) : gus.position);
    const v = this.view;
    const yaw = v ? gus.yaw + v.yawOffset : this.yaw;
    const dist = v ? v.dist : this.dist;
    const height = v ? v.height : this.height;
    const lookUp = v ? v.look : this.look;
    const base = Math.atan2(height, dist);
    const elev = v ? base : THREE.MathUtils.clamp(base + this.pitch, -0.35, 1.35);
    const R = Math.hypot(height, dist);
    this.target.set(p.x, p.y + lookUp, p.z);
    _want.set(p.x - Math.sin(yaw) * Math.cos(elev) * R, p.y + Math.sin(elev) * R, p.z - Math.cos(yaw) * Math.cos(elev) * R);
    _want.y = Math.max(_want.y, p.y + 0.05);
    // push in against solids between Gus and the camera
    if (collision && !v) {
      const f = collision.raySolid(this.target, _want, 20, { camera: true });   // Fixes-1: camera-only blockers (spires), finer steps
      const goal = f < 1 ? Math.max(0.12, f - 0.06) : 1;
      this.pushIn = goal < this.pushIn ? goal : approach(this.pushIn, goal, 3 * k, dt);
      _want.lerpVectors(this.target, _want, this.pushIn);
    }
    cam.position.copy(_want);
    const ground = collision ? collision.heightAt(cam.position.x, cam.position.z) : -1e9;
    if (cam.position.y < ground + 0.08) cam.position.y = ground + 0.08;
    cam.lookAt(this.target);
    const gl = this.glanceShot;
    if (gl) {
      gl.t += dt;
      const ein = Math.min(1, gl.t / 0.35), eout = Math.min(1, Math.max(0, (gl.secs - gl.t) / 0.4));
      const w = Math.min(ein * ein * (3 - 2 * ein), eout * eout * (3 - 2 * eout));
      cam.position.lerp(gl.pos, w);
      cam.lookAt(_look.copy(this.target).lerp(gl.look, w));
      if (gl.t >= gl.secs || snap) this.glanceShot = null;
    }
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }

  /** Photo mode (#9): an orbit round Gus, { yaw, elev, dist (≤ 12), fov, look }, with the follow camera's push-in against
   *  solids and its ground clamp. The rig's own yaw / dist / pitch are left alone, so play resumes where it was. */
  #photoCam(gus, collision) {
    const cam = this.camera, ph = this.photo, p = gus.viewOff ? _gp.copy(gus.position).add(gus.viewOff) : gus.position;   // #47: the drawn bird
    const R = Math.min(12, Math.max(0.3, ph.dist)), e = ph.elev;
    this.target.set(p.x, p.y + (ph.look ?? 0.18), p.z);
    _pt.set(p.x - Math.sin(ph.yaw) * Math.cos(e) * R, this.target.y + Math.sin(e) * R, p.z - Math.cos(ph.yaw) * Math.cos(e) * R);
    if (collision) {
      const f = collision.raySolid(this.target, _pt, 20, { camera: true });
      if (f < 1) _pt.lerpVectors(this.target, _pt, Math.max(0.06, f - 0.05));
    }
    const ground = collision ? collision.heightAt(_pt.x, _pt.z) : -1e9;
    if (_pt.y < ground + 0.08) _pt.y = ground + 0.08;
    cam.position.copy(_pt);
    cam.lookAt(this.target);
    const fov = ph.fov || 60;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}

const _look = new THREE.Vector3();
const _pt = new THREE.Vector3();

const _want = new THREE.Vector3();
const _gp = new THREE.Vector3();   // #47
const _up = new THREE.Vector3(0, 1, 0);
