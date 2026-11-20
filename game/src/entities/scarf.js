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
   * direction of each tail), body {x,y,z,r} (sphere the tails must stay out of).
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
    const segLen = this.segLen;
    const damp = 0.92;
    const dt2 = dt * dt;

    this.strands.forEach((s, k) => {
      const anchor = this.#anchor(k, _a);
      const rest = _rest.copy(this.restDir[k]);
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
          _v.subVectors(p, _bodyC);
          const bd = _v.length();
          if (bd < body.r) p.addScaledVector(_v, (body.r - bd) / (bd || 1));
        }
        s.p[0].copy(anchor);
      }
      // knit doesn't stretch: a last follow-the-leader pass makes every segment exactly segLen
      for (let i = 1; i < s.p.length; i++) {
        _v.subVectors(s.p[i], s.p[i - 1]);
        const d = _v.length();
        if (d > 1e-6) s.p[i].copy(s.p[i - 1]).addScaledVector(_v, segLen / d);
      }
      this.#writeRibbon(s);
    });
  }

  #writeRibbon(s) {
    const pos = s.mesh.geometry.attributes.position;
    const n = s.p.length;
    // ribbon width across the wearer's right (keeps the tail flat, like knit)
    for (let i = 0; i < n; i++) {
      const a = s.p[Math.max(0, i - 1)], c = s.p[Math.min(n - 1, i + 1)];
      _v.subVectors(c, a).normalize();
      _side.copy(X).addScaledVector(_v, -X.dot(_v)).normalize();
      const w = this.tailWidth * (i === n - 1 ? 0.8 : 1) * 0.5;
      const p = s.p[i];
      pos.setXYZ(i * 2, p.x - _side.x * w, p.y - _side.y * w, p.z - _side.z * w);
      pos.setXYZ(i * 2 + 1, p.x + _side.x * w, p.y + _side.y * w, p.z + _side.z * w);
    }
    pos.needsUpdate = true;
    s.mesh.geometry.computeVertexNormals();
  }
}
