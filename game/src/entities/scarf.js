// Gus's short knitted scarf (slice orange #E07B39): a code-built wrap and knot
// on the neck plus two tails simulated with verlet points. Wind comes from
// the wearer's velocity, so the tails stream behind in flight and flop with
// each head-bob on the ground.
//
// Everything lives in the wearer's model space (a child of the model):
// - the wrap and knot use the wearer's NeckBend shader patch (if any), so they
//   bend with the neck; on a skinned wearer (Gus rig: entities/gus-skin.js) the
//   rig's makeMesh() skins them to the same bones and deformPoint() is CPU skinning;
// - the tails are verlet chains simulated in the wearer's own frame, pinned to
//   the knot (moved through NeckBend.deformPoint). Gravity, the wearer's
//   acceleration and the relative wind are turned into that frame each update.
//   Simulating in world space instead is fragile: in flight the knot moves
//   five segment lengths per update.
// - Polish-2: the tails stay outside the body and the folded wings. cfg.hull builds a "radial hull" from the wearer's
//   own rest geometry (the vertices in a box round the body, binned by direction from a centre: the farthest one per
//   bin), and every tail point inside it is pushed out along its direction to the surface plus a margin. On a skinned
//   wearer the hull rides the named bone (the body: its roll, bob and peck lean). Without a hull, the old body sphere.
//
// Usage:
//   const scarf = new Scarf({ texture: knitTile });   // scarf-slice-orange.jpg (makeKnitTexture() as a fallback)
//   scarf.attach(modelObject3D, rig.scarf, neckBendOrNull);   // on a model swap, attach again
//   each update: scarf.update(dt, wearerVelocityWorld);

import * as THREE from 'three';
import { ruleMaterial } from '../gfx/load-model.js';

export const SLICE_ORANGE = 0xe07b39;
// Linear multiplier that makes scarf-slice-orange.jpg (average sRGB 205,122,56) average
// to slice orange at a distance, where mipmaps blend its dark grooves in.
export const KNIT_TILE_TINT = [1.22, 1.02, 1.035];

/** A small seamless knit texture drawn in code (V stitches in columns). */
export function makeKnitTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#E07B39';
  g.fillRect(0, 0, size, size);
  const cols = 4, rows = 8;
  const cw = size / cols, rh = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw, y = j * rh;
      // two leaning loops make a V stitch
      for (const [dx, lean] of [[0.27, 1], [0.73, -1]]) {
        const grd = g.createLinearGradient(x + cw * dx - cw * 0.2, y, x + cw * dx + cw * 0.2, y + rh);
        grd.addColorStop(0, '#f39a5a');
        grd.addColorStop(1, '#b85a26');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(x + cw * dx, y + rh * 0.5, cw * 0.2, rh * 0.62, lean * 0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(90,40,15,0.35)';
      g.fillRect(x + cw * 0.48, y, cw * 0.04, rh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _grav = new THREE.Vector3();
const _wind = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _bodyC = new THREE.Vector3();
const _rest = new THREE.Vector3();
const _side = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const _w = new THREE.Vector3();
const _prevSide = new THREE.Vector3();
const _hm = new THREE.Matrix4();
const _hmi = new THREE.Matrix4();
const HULL_AZ = 32, HULL_EL = 16;   // direction bins: azimuth round +y, elevation
const hulls = new WeakMap();          // geometry → { key, R } (built once per model and config)

/**
 * The radial hull of a geometry's rest positions: the farthest vertex from `c` in each direction bin, among the vertices
 * inside the box h.x (|x| max), h.y [lo, hi], h.z [lo, hi]. Empty bins borrow their neighbours' largest (one ring).
 */
function buildHull(geometry, h) {
  const key = JSON.stringify(h);
  const got = hulls.get(geometry);
  if (got && got.key === key) return got;
  const pos = geometry.attributes.position;
  const R = new Float32Array(HULL_AZ * HULL_EL);
  const [cx, cy, cz] = h.c;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(x) > h.x || y < h.y[0] || y > h.y[1] || z < h.z[0] || z > h.z[1]) continue;
    const dx = x - cx, dy = y - cy, dz = z - cz, r = Math.hypot(dx, dy, dz);
    if (r < 1e-6) continue;
    const b = hullBin(dx, dy, dz, r);
    if (r > R[b]) R[b] = r;
  }
  const F = R.slice();
  for (let e = 0; e < HULL_EL; e++) for (let a = 0; a < HULL_AZ; a++) {
    if (R[e * HULL_AZ + a] > 0) continue;
    let m = 0;
    for (let de = -1; de <= 1; de++) for (let da = -1; da <= 1; da++) {
      const ee = e + de; if (ee < 0 || ee >= HULL_EL) continue;
      m = Math.max(m, R[ee * HULL_AZ + ((a + da + HULL_AZ) % HULL_AZ)]);
    }
    F[e * HULL_AZ + a] = m;
  }
  const out = { key, R: F, c: new THREE.Vector3(cx, cy, cz), margin: h.margin ?? 0.004, bone: h.bone || null, face: !!h.face };
  hulls.set(geometry, out);
  return out;
}
function hullBin(dx, dy, dz, r) {
  const az = Math.floor(((Math.atan2(dx, dz) / (2 * Math.PI)) + 1) * HULL_AZ) % HULL_AZ;
  const el = Math.min(HULL_EL - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, dy / r))) / Math.PI + 0.5) * HULL_EL));
  return el * HULL_AZ + az;
}
/** The hull's radius in a direction: bilinear between the four nearest bin centres (smooth, so a tail slides). */
function hullRadius(R, dx, dy, dz, r) {
  const fa = ((Math.atan2(dx, dz) / (2 * Math.PI)) + 1) * HULL_AZ - 0.5;
  const fe = (Math.asin(Math.max(-1, Math.min(1, dy / r))) / Math.PI + 0.5) * HULL_EL - 0.5;
  const a0 = Math.floor(fa), e0 = Math.floor(fe), ta = fa - a0, te = fe - e0;
  const A0 = ((a0 % HULL_AZ) + HULL_AZ) % HULL_AZ, A1 = (A0 + 1) % HULL_AZ;
  const E0 = Math.max(0, Math.min(HULL_EL - 1, e0)), E1 = Math.max(0, Math.min(HULL_EL - 1, e0 + 1));
  const r00 = R[E0 * HULL_AZ + A0], r01 = R[E0 * HULL_AZ + A1], r10 = R[E1 * HULL_AZ + A0], r11 = R[E1 * HULL_AZ + A1];
  return (r00 * (1 - ta) + r01 * ta) * (1 - te) + (r10 * (1 - ta) + r11 * ta) * te;
}

export class Scarf {
  /**
   * texture: the knit tile (game/assets/textures/scarf-slice-orange.jpg, with tint KNIT_TILE_TINT;
   * makeKnitTexture() is a code fallback). wrapRepeat / tailRepeat: tile repeats [u, v] on the wrap (u round the neck,
   * v round the tube) and on each tail (u across, v along), so a stitch is ~1.7 cm everywhere.
   * tailLength and tailWidth are in the wearer's model units (metres at scale 1).
   */
  constructor({ texture = makeKnitTexture(), tint = [1, 1, 1], wrapRepeat = [2, 0.4], tailRepeat = [0.25, 1.1], segments = 7, tailLength = 0.15, tailWidth = 0.034 } = {}) {
    this.tint = new THREE.Color(...tint);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.texture = texture;
    this.wrapRepeat = wrapRepeat;
    this.segments = segments;
    this.segLen = tailLength / segments;
    this.tailWidth = tailWidth;
    this.tails = new THREE.Group();
    this.tails.name = 'scarf-tails';
    const tailTex = texture.clone();
    tailTex.repeat.set(tailRepeat[0], tailRepeat[1]);
    tailTex.needsUpdate = true;
    this.tailMaterial = ruleMaterial({ map: tailTex, color: this.tint, side: THREE.DoubleSide });
    this.strands = [0, 1].map((k) => this.#makeStrand(k));
    this.anchorLocal = [new THREE.Vector3(), new THREE.Vector3()];
    this.restDir = [new THREE.Vector3(), new THREE.Vector3()];
    this.prevVel = new THREE.Vector3();
    this.time = 0;
  }

  #makeStrand(k) {
    const n = this.segments + 1;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3);
    const uv = new Float32Array(n * 2 * 2);
    const idx = [];
    for (let i = 0; i < n; i++) {
      uv.set([0, i / (n - 1), 1, i / (n - 1)], i * 4);
      if (i < n - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, this.tailMaterial);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    this.tails.add(mesh);
    return {
      mesh,
      p: Array.from({ length: n }, () => new THREE.Vector3()),
      prev: Array.from({ length: n }, () => new THREE.Vector3()),
      phase: k * 1.7,
    };
  }

  /**
   * Put the scarf on a model. `cfg` (model space): neck {x,y,z}, radius [rx, rz],
   * tube, tilt (radians, front dips), knot {x,y,z}, tails [{x,y,z},{x,y,z}] (rest
   * direction of each tail), body {x,y,z,r} (sphere the tails must stay out of, when there's no hull),
   * hull { c: [x,y,z], x: max |x|, y: [lo,hi], z: [lo,hi], margin, bone, face } (Polish-2: the radial hull, see buildHull;
   * face: the ribbons lie flat on it rather than across the wearer's right),
   * swing (Polish-2, radians): how far a tail may swing from its rest direction (0: free).
   */
  attach(model, cfg, neckBend = null) {
    // carry the tails' current shape across a model swap (world → new model space)
    const carried = this.model && this.model !== model ? this.#tailsInWorld() : null;
    if (this.wrap) this.wrap.removeFromParent();
    this.model = model;
    this.cfg = cfg;
    this.neckBend = neckBend;

    // an elliptical ring round the neck, a little taller than it is thick (a folded knit band)
    const r = (cfg.radius[0] + cfg.radius[1]) / 2;
    const wrapGeo = new THREE.TorusGeometry(r, cfg.tube, 10, 28);
    wrapGeo.rotateX(Math.PI / 2);
    wrapGeo.scale(cfg.radius[0] / r, 1.3, cfg.radius[1] / r);
    wrapGeo.rotateX(cfg.tilt);
    wrapGeo.translate(cfg.neck.x, cfg.neck.y, cfg.neck.z);
    const knotGeo = new THREE.SphereGeometry(cfg.tube * 1.5, 10, 8);
    knotGeo.scale(1.1, 0.9, 0.8);
    knotGeo.translate(cfg.knot.x, cfg.knot.y, cfg.knot.z);
    const tex = this.texture.clone();
    tex.repeat.set(this.wrapRepeat[0], this.wrapRepeat[1]);
    tex.needsUpdate = true;
    const mat = ruleMaterial({ map: tex, color: this.tint });
    if (neckBend) neckBend.patch(mat);
    this.wrap = new THREE.Group();
    this.wrap.name = 'scarf-wrap';
    for (const g of [wrapGeo, knotGeo]) {
      // Gus rig: on a skinned wearer the wrap and knot are skinned to the same neck/head bones (makeMesh)
      const m = neckBend?.makeMesh ? neckBend.makeMesh(g, mat) : new THREE.Mesh(g, mat);
      m.castShadow = true;
      this.wrap.add(m);
    }
    model.add(this.wrap, this.tails);

    this.anchorLocal[0].set(cfg.knot.x - cfg.tube * 0.8, cfg.knot.y, cfg.knot.z);
    this.anchorLocal[1].set(cfg.knot.x + cfg.tube * 0.8, cfg.knot.y, cfg.knot.z);
    cfg.tails.forEach((d, i) => this.restDir[i].set(d.x, d.y, d.z).normalize());
    this.hull = cfg.hull && model.geometry ? buildHull(model.geometry, cfg.hull) : null;
    this.hullC = this.hull ? this.hull.c.clone() : null;   // the hull's centre as posed (for the ribbon's facing)
    if (carried) this.#tailsFromWorld(carried);
    else this.reset();
  }

  /** Swap the knit (the Scarf Stash). */
  setTexture(texture, tint = [1, 1, 1]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.texture = texture;
    this.tint.setRGB(...tint);
    const tt = texture.clone();
    tt.repeat.copy(this.tailMaterial.map.repeat);
    tt.needsUpdate = true;
    this.tailMaterial.map = tt;
    this.tailMaterial.color.copy(this.tint);
    if (this.wrap) for (const m of this.wrap.children) {
      const w = texture.clone();
      w.repeat.set(this.wrapRepeat[0], this.wrapRepeat[1]);
      w.needsUpdate = true;
      m.material.map = w;
      m.material.color.copy(this.tint);
    }
  }

  #tailsInWorld() {
    this.model.updateWorldMatrix(true, false);
    return this.strands.map((s) => s.p.map((p) => p.clone().applyMatrix4(this.model.matrixWorld)));
  }

  #tailsFromWorld(world) {
    this.model.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(this.model.matrixWorld).invert();
    this.strands.forEach((s, k) => {
      s.p.forEach((p, i) => p.copy(world[k][i]).applyMatrix4(inv));
      s.prev.forEach((p, i) => p.copy(s.p[i]));
      this.#anchor(k, _a);
      const shift = _v.subVectors(_a, s.p[0]);           // re-pin to the new knot
      s.p.forEach((p, i) => { p.add(shift); s.prev[i].add(shift); });
      this.#writeRibbon(s);
    });
    this.hasPrevVel = false;
  }

  /** Lay the tails out along their rest directions (after a swap or a teleport). */
  reset() {
    this.strands.forEach((s, k) => {
      this.#anchor(k, _a);
      s.p.forEach((p, i) => p.copy(_a).addScaledVector(this.restDir[k], i * this.segLen));
      s.prev.forEach((p, i) => p.copy(s.p[i]));
      this.#writeRibbon(s);
    });
    this.prevVel.set(0, 0, 0);
    this.hasPrevVel = false;
  }

  #anchor(k, out) {
    out.copy(this.anchorLocal[k]);
    if (this.neckBend) this.neckBend.deformPoint(out, _v.copy(this.anchorLocal[k]));
    return out;
  }

  /** velocity: the wearer's world velocity (m/s). */
  update(dt, velocity) {
    if (!this.model || dt <= 0) return;
    this.time += dt;
    this.model.updateMatrixWorld(true);
    this.model.matrixWorld.decompose(_pos, _q, _scl);
    _qi.copy(_q).invert();
    const ws = _scl.x;
    // the wearer's acceleration (a fictitious force in its frame), clamped against teleports
    if (this.hasPrevVel) _acc.subVectors(velocity, this.prevVel).divideScalar(dt).clampLength(0, 40);
    else _acc.set(0, 0, 0);
    this.prevVel.copy(velocity);
    this.hasPrevVel = true;
    // accelerations in the wearer's frame and units
    _grav.set(0, -9.8, 0).sub(_acc).applyQuaternion(_qi).divideScalar(ws);
    // air drag towards "behind": weak enough that a cruising tail still sags ~25-30 deg below
    // the horizontal, above his back (pitched ~40 deg), so it reads from behind (a level tail is end-on)
    _wind.copy(velocity).multiplyScalar(-3).applyQuaternion(_qi).divideScalar(ws);
    const speed = velocity.length();
    const flutterAmp = Math.min(1, speed / 3);
    const body = this.cfg.body;
    _bodyC.set(body.x, body.y, body.z);
    this.#hullPose();
    const segLen = this.segLen;
    const damp = 0.92;
    const dt2 = dt * dt;

    const swing = this.cfg.swing || 0, cosSw = Math.cos(swing), sinSw = Math.sin(swing);
    this.strands.forEach((s, k) => {
      const anchor = this.#anchor(k, _a);
      const rest = _rest.copy(this.restDir[k]);
      if (this.hullPosed) rest.transformDirection(_hm);   // the rest direction leans and rolls with the body
      const flutter = Math.sin(this.time * (9 + speed * 2.2) + s.phase) * flutterAmp;
      const side = k ? 1 : -1;
      for (let i = 1; i < s.p.length; i++) {
        const p = s.p[i], pv = s.prev[i];
        const t = i / (s.p.length - 1);
        _v.subVectors(p, pv).multiplyScalar(damp);
        _v.addScaledVector(_grav, dt2);
        _v.addScaledVector(_wind, dt2 * (0.6 + 0.6 * t));
        _v.addScaledVector(rest, dt2 * 6);                      // a knit tail has a little stiffness
        _v.y += flutter * dt2 * 10 * t;
        _v.x += flutter * dt2 * 26 * t * side;                  // side-to-side flap
        pv.copy(p);
        p.add(_v);
      }
      // constraints: pinned root, segment lengths, stay outside the body
      s.p[0].copy(anchor);
      s.prev[0].copy(anchor);
      for (let it = 0; it < 3; it++) {
        for (let i = 1; i < s.p.length; i++) {
          const a = s.p[i - 1], p = s.p[i];
          _v.subVectors(p, a);
          const d = _v.length() || 1e-6;
          const corr = (d - segLen) / d;
          if (i === 1) p.addScaledVector(_v, -corr);
          else { p.addScaledVector(_v, -corr * 0.5); a.addScaledVector(_v, corr * 0.5); }
          if (swing) this.#cone(p, anchor, rest, cosSw, sinSw);
          if (this.hull) this.#collide(p);
          else {
            _v.subVectors(p, _bodyC);
            const bd = _v.length();
            if (bd < body.r) p.addScaledVector(_v, (body.r - bd) / (bd || 1));
          }
        }
        s.p[0].copy(anchor);
      }
      // knit doesn't stretch: a last follow-the-leader pass makes every segment exactly segLen
      // (Polish-2: each point pushed out of the hull again as it goes, so the last word is "outside")
      for (let i = 1; i < s.p.length; i++) {
        _v.subVectors(s.p[i], s.p[i - 1]);
        const d = _v.length();
        if (d > 1e-6) s.p[i].copy(s.p[i - 1]).addScaledVector(_v, segLen / d);
        if (swing) this.#cone(s.p[i], anchor, rest, cosSw, sinSw);
        if (this.hull) this.#collide(s.p[i]);
      }
      this.#writeRibbon(s);
    });
  }

  /** Polish-2: the hull's pose this update (its bone's skinning matrix, or none). */
  #hullPose() {
    const h = this.hull, rig = this.neckBend;
    this.hullPosed = false;
    if (!h || !h.bone || !rig?.bones?.[h.bone] || !rig.skeleton) return;
    const i = rig.index[h.bone];
    _hm.multiplyMatrices(rig.bones[h.bone].matrixWorld, rig.skeleton.boneInverses[i]);
    _hmi.copy(_hm).invert();
    this.hullPosed = true;
    this.hullC.copy(h.c).applyMatrix4(_hm);
  }

  /** Polish-2: keep a tail point within `swing` of its rest direction, seen from the knot (cfg.swing; same distance). */
  #cone(p, anchor, rest, cosSw, sinSw) {
    _w.subVectors(p, anchor);
    const d = _w.length();
    if (d < 1e-6) return;
    const along = _w.dot(rest);
    if (along >= d * cosSw) return;
    _w.addScaledVector(rest, -along);          // the part across the rest direction
    const across = _w.length();
    if (across < 1e-6) _w.set(rest.y, -rest.x, 0).normalize(); else _w.divideScalar(across);
    p.copy(anchor).addScaledVector(rest, d * cosSw).addScaledVector(_w, d * sinSw);
  }

  /** Polish-2: push a model-space point out of the radial hull (to its surface plus the margin, along its direction). */
  #collide(p) {
    const h = this.hull;
    if (this.hullPosed) p.applyMatrix4(_hmi);
    const dx = p.x - h.c.x, dy = p.y - h.c.y, dz = p.z - h.c.z, r = Math.hypot(dx, dy, dz);
    if (r > 1e-6) {
      const R = hullRadius(h.R, dx, dy, dz, r) + h.margin;
      if (r < R && R > h.margin) p.set(h.c.x + (dx * R) / r, h.c.y + (dy * R) / r, h.c.z + (dz * R) / r);
    }
    if (this.hullPosed) p.applyMatrix4(_hm);
  }

  #writeRibbon(s) {
    const pos = s.mesh.geometry.attributes.position;
    const n = s.p.length;
    // ribbon width across the wearer's right (keeps the tail flat, like knit); Polish-2: with a hull, across the body's
    // surface instead (lying flat on the wings and back, not edge-on to them), kept from flipping along the strand
    const hc = this.hull?.face ? this.hullC : null;
    for (let i = 0; i < n; i++) {
      const a = s.p[Math.max(0, i - 1)], c = s.p[Math.min(n - 1, i + 1)];
      _v.subVectors(c, a).normalize();
      if (hc) {
        _w.subVectors(s.p[i], hc);
        _side.crossVectors(_v, _w);
        const l = _side.length();
        if (l > 1e-6 * _w.length()) {
          _side.divideScalar(l);
          if (i ? _side.dot(_prevSide) < 0 : _side.x < 0) _side.negate();
        } else _side.copy(X).addScaledVector(_v, -X.dot(_v)).normalize();
        _prevSide.copy(_side);
      } else _side.copy(X).addScaledVector(_v, -X.dot(_v)).normalize();
      const w = this.tailWidth * (i === n - 1 ? 0.8 : 1) * 0.5;
      const p = s.p[i];
      pos.setXYZ(i * 2, p.x - _side.x * w, p.y - _side.y * w, p.z - _side.z * w);
      pos.setXYZ(i * 2 + 1, p.x + _side.x * w, p.y + _side.y * w, p.z + _side.z * w);
    }
    pos.needsUpdate = true;
    s.mesh.geometry.computeVertexNormals();
  }
}
