// Collision without a physics engine: a spatial hash of simple shapes over the
// terrain height map.
//
//   solids   boxes (yawed), vertical cylinders (trunks, posts) and ellipsoids
//            (rocks). Boxes and cylinders are walls below their top and ground
//            on top; rocks behave like terrain (their surface is ground).
//   soft     canopy spheres: Gus passes through with a leaf burst.
//   water    outlines with a level: a surface Gus splash-hops off.
//   perches  points (lamppost caps, finials) and edges (roof rims, rails, walls);
//            landing within 0.6 m snaps Gus on.
//
// Every shape is plain data, so the same tables serve the game, the map and tests.

import { pointInPoly, polyBounds } from '../core/geo.js';

const STEP_UP = 0.3;

export class Collision {
  constructor({ heightAt, cell = 16 }) {
    this.heightAt = heightAt;
    this.cell = cell;
    this.grid = new Map();
    this.stamp = 0;
    this.count = { box: 0, cyl: 0, rock: 0, soft: 0, water: 0, perch: 0, edge: 0 };
    this.perchList = [];
    this.camBlockers = [];   // Fixes-1: camera-only shapes (see addCamBlocker)
  }

  /** Fixes-1: a camera-only cylinder: a part of a model with no collision (a slim spire, a finial) that the follow camera
   *  must not sit behind. Only raySolid(..., { camera: true }) sees it; flight, walking and perches never do. */
  addCamBlocker({ x, z, y0, h, r }) { this.camBlockers.push({ x, z, y0, y1: y0 + h, r }); }

  // ---------------------------------------------------------------- building
  #insert(item, x0, z0, x1, z1) {
    const c = this.cell;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) {
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const k = ix * 100003 + iz;
        let a = this.grid.get(k);
        if (!a) this.grid.set(k, (a = []));
        a.push(item);
      }
    }
    item._s = 0;
    return item;
  }

  /** Box standing on y0 (bottom) with height h, centred on x/z. walkable: its top is ground. */
  addBox({ x, z, y0 = 0, h, w, d, yaw = 0, walkable = true, tag = 'solid', id }) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const r = Math.hypot(w, d) / 2;
    this.count.box++;
    return this.#insert({ t: 'box', x, z, y0, y1: y0 + h, hx: w / 2, hz: d / 2, c, s, walkable, tag, id }, x - r, z - r, x + r, z + r);
  }

  addCylinder({ x, z, y0 = 0, h, r, walkable = true, tag = 'solid', id }) {
    this.count.cyl++;
    return this.#insert({ t: 'cyl', x, z, y0, y1: y0 + h, r, walkable, tag, id }, x - r, z - r, x + r, z + r);
  }

  /** Rock: an ellipsoid (centre x/y/z, radii, yaw). Its upper surface is ground. */
  addRock({ x, y, z, rx, ry, rz, yaw = 0, id }) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const r = Math.max(rx, rz);
    this.count.rock++;
    return this.#insert({ t: 'rock', x, y, z, rx, ry, rz, c, s, id }, x - r, z - r, x + r, z + r);
  }

  addSoft({ x, y, z, r, tag = 'canopy', id }) {
    this.count.soft++;
    return this.#insert({ t: 'soft', x, y, z, r, tag, id }, x - r, z - r, x + r, z + r);
  }

  addWater({ outline, level, id, name }) {
    const b = polyBounds(outline);
    this.count.water++;
    return this.#insert({ t: 'water', outline, level, id, name, b }, b.x0, b.z0, b.x1, b.z1);
  }

  /** Perch point: Gus snaps to (x, y, z). r: how far he can walk before he steps off. */
  addPerch({ x, y, z, r = 0.15, id, kind = 'post', summit = null }) {
    this.count.perch++;
    const p = { t: 'perch', x, y, z, r, id, kind, summit };
    this.perchList.push(p);
    return this.#insert(p, x - 1, z - 1, x + 1, z + 1);
  }

  /** Perch edge from a to b ({x,y,z}); `out` is the yaw Gus faces when he lands (the look-out side). */
  addPerchEdge({ a, b, id, kind = 'edge', out = null }) {
    this.count.edge++;
    const e = { t: 'edge', a, b, id, kind, out };
    return this.#insert(e, Math.min(a.x, b.x) - 1, Math.min(a.z, b.z) - 1, Math.max(a.x, b.x) + 1, Math.max(a.z, b.z) + 1);
  }

  // ---------------------------------------------------------------- queries
  #near(x, z, r, fn) {
    const c = this.cell;
    const st = ++this.stamp;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++) {
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const a = this.grid.get(ix * 100003 + iz);
        if (!a) continue;
        for (const it of a) {
          if (it._s === st) continue;
          it._s = st;
          if (it.off) continue;
          if (fn(it) === false) return;
        }
      }
    }
  }

  /** Rock surface height at x/z, or -Infinity outside its footprint. */
  static rockTop(it, x, z) {
    const dx = x - it.x, dz = z - it.z;
    const lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
    const q = (lx / it.rx) ** 2 + (lz / it.rz) ** 2;
    return q < 1 ? it.y + it.ry * Math.sqrt(1 - q) : -Infinity;
  }

  static inBox(it, x, z, margin = 0) {
    const dx = x - it.x, dz = z - it.z;
    const lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
    return Math.abs(lx) <= it.hx + margin && Math.abs(lz) <= it.hz + margin;
  }

  /**
   * The surface under (x, z) at or below yRef (+ a small step): terrain, box and
   * cylinder tops, rocks and water. Returns { y, kind, item }.
   */
  surface(x, z, yRef = Infinity, out = { y: 0, kind: 'terrain', item: null }) {
    out.y = this.heightAt(x, z);
    out.kind = 'terrain';
    out.item = null;
    const lim = yRef + STEP_UP;
    this.#near(x, z, 0, (it) => {
      let top = -Infinity, kind = null;
      if (it.t === 'box') { if (it.walkable && it.y1 <= lim && Collision.inBox(it, x, z)) { top = it.y1; kind = it.tag; } }
      else if (it.t === 'cyl') { if (it.walkable && it.y1 <= lim && (x - it.x) ** 2 + (z - it.z) ** 2 <= it.r * it.r) { top = it.y1; kind = it.tag; } }
      else if (it.t === 'rock') { top = Collision.rockTop(it, x, z); if (top > lim + 1.5) top = -Infinity; kind = 'rock'; }
      else if (it.t === 'water') {
        if (it.level <= lim && x >= it.b.x0 && x <= it.b.x1 && z >= it.b.z0 && z <= it.b.z1 && pointInPoly(x, z, it.outline)) { top = it.level; kind = 'water'; }
      }
      if (top > out.y) { out.y = top; out.kind = kind; out.item = it; }
    });
    return out;
  }

  groundAt(x, z, yRef = Infinity) { return this.surface(x, z, yRef, _surf).y; }

  waterAt(x, z) {
    let res = null;
    this.#near(x, z, 0, (it) => {
      if (it.t === 'water' && pointInPoly(x, z, it.outline)) { res = it; return false; }
    });
    return res;
  }

  /**
   * Push a vertical capsule (feet at p.y, height h, radius r) out of walls.
   * Box and cylinder tops within a step of the feet are ground, not walls.
   * Returns the summed push normal (x, z) in `n`, or null if nothing was hit.
   */
  pushOut(p, r, h, n = { x: 0, z: 0, tag: null }) {
    n.x = 0; n.z = 0; n.tag = null;
    let hit = false;
    this.#near(p.x, p.z, r, (it) => {
      if (it.t === 'box') {
        if (p.y + h < it.y0 || p.y >= it.y1 - STEP_UP) return;
        const dx = p.x - it.x, dz = p.z - it.z;
        const lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
        const cx = Math.max(-it.hx, Math.min(lx, it.hx)), cz = Math.max(-it.hz, Math.min(lz, it.hz));
        let ox = lx - cx, oz = lz - cz;
        let d = Math.hypot(ox, oz);
        if (d >= r) return;
        if (d < 1e-6) {
          // centre inside: leave by the nearest side
          const px = it.hx - Math.abs(lx), pz = it.hz - Math.abs(lz);
          if (px < pz) { ox = Math.sign(lx) || 1; oz = 0; d = -px; } else { ox = 0; oz = Math.sign(lz) || 1; d = -pz; }
        } else { ox /= d; oz /= d; }
        const push = r - d;
        const wx = ox * it.c + oz * it.s, wz = -ox * it.s + oz * it.c;
        p.x += wx * push; p.z += wz * push;
        n.x += wx; n.z += wz; n.tag = it.tag;
        hit = true;
      } else if (it.t === 'cyl') {
        if (p.y + h < it.y0 || p.y >= it.y1 - STEP_UP) return;
        let dx = p.x - it.x, dz = p.z - it.z;
        const d = Math.hypot(dx, dz);
        const rr = it.r + r;
        if (d >= rr) return;
        if (d < 1e-6) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        p.x = it.x + dx * rr; p.z = it.z + dz * rr;
        n.x += dx; n.z += dz; n.tag = it.tag;
        hit = true;
      }
    });
    if (!hit) return null;
    const l = Math.hypot(n.x, n.z) || 1;
    n.x /= l; n.z /= l;
    return n;
  }

  /** The canopy sphere containing p (point), or null. */
  softAt(p) {
    let res = null;
    this.#near(p.x, p.z, 0, (it) => {
      if (it.t === 'soft' && (p.x - it.x) ** 2 + (p.y - it.y) ** 2 + (p.z - it.z) ** 2 < it.r * it.r) { res = it; return false; }
    });
    return res;
  }

  /**
   * Nearest perch within `radius` (horizontal) whose height is within [-below, +above] of p.y.
   * Returns { x, y, z, yaw, perch } (yaw: the look-out direction for edges) or null.
   */
  nearestPerch(p, radius = 0.6, below = 0.2, above = 0.8) {
    let best = null, bd = radius;
    this.#near(p.x, p.z, radius, (it) => {
      if (it.t === 'perch') {
        if (p.y < it.y - below || p.y > it.y + above) return;
        const d = Math.hypot(p.x - it.x, p.z - it.z);
        if (d < bd) { bd = d; best = { x: it.x, y: it.y, z: it.z, yaw: null, perch: it }; }
      } else if (it.t === 'edge') {
        const a = it.a, b = it.b;
        const ex = b.x - a.x, ez = b.z - a.z;
        const l2 = ex * ex + ez * ez || 1e-9;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.z - a.z) * ez) / l2));
        const qx = a.x + ex * t, qz = a.z + ez * t, qy = a.y + (b.y - a.y) * t;
        if (p.y < qy - below || p.y > qy + above) return;
        const d = Math.hypot(p.x - qx, p.z - qz);
        if (d < bd) { bd = d; best = { x: qx, y: qy, z: qz, yaw: it.out, perch: it }; }
      }
    });
    return best;
  }

  /** Is the point inside something solid (box, cylinder, rock or the ground)? */
  solidAt(x, y, z) {
    if (y < this.heightAt(x, z)) return true;
    let res = false;
    this.#near(x, z, 0, (it) => {
      if (it.t === 'box' && y > it.y0 && y < it.y1 && Collision.inBox(it, x, z)) res = true;
      else if (it.t === 'cyl' && y > it.y0 && y < it.y1 && (x - it.x) ** 2 + (z - it.z) ** 2 < it.r * it.r) res = true;
      else if (it.t === 'rock' && y < Collision.rockTop(it, x, z)) res = true;
      if (res) return false;
    });
    return res;
  }

  /** First fraction (0..1) along a→b that is inside a solid, or 1. */
  raySolid(a, b, steps = 12, { camera = false } = {}) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      if (this.solidAt(x, y, z)) return (i - 1) / steps;
      if (camera && this.camBlockers.some((c) => y > c.y0 && y < c.y1 && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r)) return (i - 1) / steps;
    }
    return 1;
  }

  perchById(id) { return this.perchList.find((p) => p.id === id) || null; }
}

const _surf = { y: 0, kind: 'terrain', item: null };
