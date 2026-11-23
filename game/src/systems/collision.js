// Collision without a physics engine: a spatial hash of simple shapes over the
// terrain height map.
//
//   solids   boxes (yawed), vertical cylinders (trunks, posts) and ellipsoids
//            (rocks). Boxes and cylinders are walls below their top and ground
//            on top; rocks behave like terrain (their surface is ground).
//   soft     canopy spheres: Gus passes through with a leaf burst.
//   water    outlines with a level: a surface Gus splash-hops off (or floats on: batch-3); a floor for every walker
//            (groundFor), never a lake bed under it.
//   perches  points (lamppost caps, finials) and edges (roof rims, rails, walls);
//            landing within 0.6 m snaps Gus on.
//
// Every shape is plain data, so the same tables serve the game, the map and tests.

import { pointInPoly, polyBounds, offsetClosed } from '../core/geo.js';

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
    this.decks = [];         // Batch-3: the bridge deck boxes (tag 'bridge'), for deckAt (the crowds' cheap ground)
  }

  /** Fixes-1: a camera-only cylinder: a part of a model with no collision (a slim spire, a finial) that the follow camera
   *  must not sit behind. Only raySolid(..., { camera: true }) sees it; flight, walking and perches never do. */
  addCamBlocker({ x, z, y0, h, r }) { this.camBlockers.push({ x, z, y0, y1: y0 + h, r }); }

  // ---------------------------------------------------------------- building
  #insert(item, x0, z0, x1, z1) {
    const c = this.cell;
    if (this.walkTiles?.size) {   // batch-3: a shape added after the crowds' cells were cached (a scheme's table): forget those tiles
      for (let tx = Math.floor((x0 - 0.6) / 16); tx <= Math.floor((x1 + 0.6) / 16); tx++) for (let tz = Math.floor((z0 - 0.6) / 16); tz <= Math.floor((z1 + 0.6) / 16); tz++) this.walkTiles.delete(tx * 100003 + tz);
    }
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
    const it = this.#insert({ t: 'box', x, z, y0, y1: y0 + h, hx: w / 2, hz: d / 2, c, s, walkable, tag, id }, x - r, z - r, x + r, z + r);
    if (tag === 'bridge') this.decks.push({ it, x0: x - r, x1: x + r, z0: z - r, z1: z + r });
    return it;
  }

  /** fix-25: a gable roof (a prism): a box whose top slopes from the ridge (y0 + h, along local z when alongZ, else local x)
   *  down to its eaves (y0). Gus lands, walks and perches on the slopes; nothing is solid above them. */
  addPrism({ x, z, y0, h, w, d, yaw = 0, alongZ = false, tag = 'roof', id }) {
    const it = this.addBox({ x, z, y0, h, w, d, yaw, tag, id });
    it.roof = alongZ ? 'z' : 'x';
    it.rh = h;
    return it;
  }

  /** fix-25: a four-sided pyramid roof (a spire, a corner turret's cap): half = half the base's side, axis-aligned in yaw. */
  addPyramid({ x, z, y0, h, half, yaw = 0, tag = 'roof', id }) {
    const it = this.addBox({ x, z, y0, h, w: half * 2, d: half * 2, yaw, tag, id });
    it.roof = 'pyr';
    it.rh = h;
    return it;
  }

  /** The top of a box at (x, z): its flat top, or a roof's slope there (fix-25). (x, z) inside the box's footprint. */
  static topAt(it, x, z) {
    if (!it.roof) return it.y1;
    const dx = x - it.x, dz = z - it.z;
    const ax = Math.abs(dx * it.c - dz * it.s) / it.hx, az = Math.abs(dx * it.s + dz * it.c) / it.hz;
    const across = it.roof === 'z' ? ax : it.roof === 'x' ? az : Math.max(ax, az);
    return it.y0 + it.rh * Math.max(0, 1 - across);
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

  /** fix-27: `margin` widens the outline to the drawn water's (water.js waterMargin); together with the ground-below-level
   *  test in waterAt it puts the shore where the terrain rises through the drawn water. (The plain outline left a strip up
   *  to ~3 m wide outside it where the ground was under the drawn water but counted as dry: Gus walked on the lake bed.) */
  addWater({ outline, level, id, name, margin = 0 }) {
    const core = outline;
    if (margin > 0) outline = offsetClosed(outline, margin);
    const b = polyBounds(outline);
    this.count.water++;
    return this.#insert({ t: 'water', outline, core, level, id, name, b }, b.x0, b.z0, b.x1, b.z1);
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
      if (it.t === 'box') { if (it.walkable && (it.roof ? it.y0 : it.y1) <= lim && Collision.inBox(it, x, z)) { const t = Collision.topAt(it, x, z); if (t <= lim) { top = t; kind = it.tag; } } }
      else if (it.t === 'cyl') { if (it.walkable && it.y1 <= lim && (x - it.x) ** 2 + (z - it.z) ** 2 <= it.r * it.r) { top = it.y1; kind = it.tag; } }
      else if (it.t === 'rock') { top = Collision.rockTop(it, x, z); if (top > lim + 1.5) top = -Infinity; kind = 'rock'; }
      else if (it.t === 'water') {
        if (it.level <= lim && x >= it.b.x0 && x <= it.b.x1 && z >= it.b.z0 && z <= it.b.z1 && pointInPoly(x, z, it.outline) && this.heightAt(x, z) < it.level - 0.02) { top = it.level; kind = 'water'; }   // (fix-27: the same waterline as waterAt)
      }
      if (top > out.y) { out.y = top; out.kind = kind; out.item = it; }
    });
    return out;
  }

  groundAt(x, z, yRef = Infinity) { return this.surface(x, z, yRef, _surf).y; }

  /**
   * Batch-3 (#1, #7): the one ground rule for everything that walks (people, dogs, named animals): surface() at or below
   * yRef, except that water is a floor for everyone. surface() drops a water body whose level is more than a step above
   * yRef, so a walker seeded with terrain.heightAt (the lake bed) walked the bed under the water. Seed with yRef 400 (or
   * surfaceY) the first time, then the walker's own height. A bridge deck over the water is still the deck.
   */
  groundFor(x, z, yRef = Infinity, out = { y: 0, kind: 'terrain', item: null }) {
    this.surface(x, z, yRef, out);
    if (out.kind !== 'water') {
      const w = this.waterAt(x, z);
      if (w && w.level > out.y) { out.y = w.level; out.kind = 'water'; out.item = w; }
    }
    return out;
  }

  /** Batch-3: the highest bridge deck top under (x, z) at or below yRef + a step, or -Infinity (cheap: decks only). */
  deckAt(x, z, yRef = Infinity) {
    let top = -Infinity;
    const lim = yRef + STEP_UP;
    for (const d of this.decks) {
      if (x < d.x0 || x > d.x1 || z < d.z0 || z > d.z1) continue;
      const it = d.it;
      if (it.y1 <= lim && it.y1 > top && Collision.inBox(it, x, z)) top = it.y1;
    }
    return top;
  }

  /** Batch-3: a walker's floor with nothing on it: the terrain, a bridge deck over it, or the water's surface. The seed for
   *  groundFor (never a roof or a lamppost cap, which yRef 400 would find). */
  floorAt(x, z, yRef = Infinity) {
    let y = this.heightAt(x, z);
    const dk = this.deckAt(x, z, yRef);
    if (dk > y) return dk;
    const w = this.waterAt(x, z);
    return w && w.level > y ? w.level : y;
  }

  /** Batch-3: small walkers (the crowds): is the 0.5 m cell at (x, z) water (with no deck over it: 1) or inside a solid at
   *  ground level (a box, a cylinder, a rock taller than a step: 2), or clear (0)? Cached in 16 m tiles, built when first
   *  asked, with each clear cell's floor when it isn't the terrain (a kerb, a bridge deck: walkFloor). */
  #walkTile(x, z) {
    const ix = Math.floor(x * 2), iz = Math.floor(z * 2);
    const tx = ix >> 5, tz = iz >> 5, key = tx * 100003 + tz;
    let tile = (this.walkTiles ||= new Map()).get(key);
    if (!tile) {
      tile = { b: new Uint8Array(1024), y: new Float32Array(1024).fill(NaN) };
      for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
        const cx = ((tx << 5) + i + 0.5) / 2, cz = ((tz << 5) + j + 0.5) / 2, k = j * 32 + i;
        // the whole cell: wet if its centre or any corner is (a shore cell is water), solid within a cell's reach of the centre
        let wet = false;
        for (const [ox, oz] of _CORNERS) {
          const x = cx + ox, z = cz + oz;
          if (this.deckAt(x, z) !== -Infinity) continue;
          const w = this.waterAt(x, z);
          if (w && w.level > this.heightAt(x, z) - 0.05) { wet = true; break; }
        }
        if (wet) { tile.b[k] = 1; continue; }
        if (this.standable(cx, cz, { r: 0.3, h: 0.45 }) == null) { tile.b[k] = 2; continue; }
        const t = this.heightAt(cx, cz), g = this.surface(cx, cz, this.floorAt(cx, cz) + 0.05, _surf).y;
        if (g > t + 0.02) tile.y[k] = g;
      }
      this.walkTiles.set(key, tile);
    }
    _cell.tile = tile; _cell.k = (iz - (tz << 5)) * 32 + (ix - (tx << 5));
    return _cell;
  }

  walkBlocked(x, z) { const c = this.#walkTile(x, z); return c.tile.b[c.k]; }

  /** Batch-3: a crowd animal's floor at (x, z): the terrain, or the kerb or deck its cell stands on. */
  walkFloor(x, z, yRef = Infinity) { const c = this.#walkTile(x, z), y = c.tile.y[c.k]; return y === y && y <= yRef + 0.5 ? y : this.heightAt(x, z); }   // (a deck above an animal under it isn't its floor)

  /** Batch-3 (review): queue the walk tiles round (x, z) out to r, built warmStep(n) a few per update (no first-touch hitch). */
  warmWalk(x, z, r) {
    const q = (this.warmQ ||= []);
    for (let tx = Math.floor((x - r) / 16); tx <= Math.floor((x + r) / 16); tx++) for (let tz = Math.floor((z - r) / 16); tz <= Math.floor((z + r) / 16); tz++) q.push([tx * 16 + 8, tz * 16 + 8]);
  }
  warmStep(n = 1) {
    const q = this.warmQ;
    for (let i = 0; i < n && q?.length; i++) { const [x, z] = q.pop(); this.#walkTile(x, z); }
  }

  /** Batch-3: can a walker (radius r, height h) stand at (x, z)? Not on water (a deck over it is fine) and not inside a
   *  box, cylinder or rock. Returns the ground y, or null. */
  standable(x, z, { r = 0.3, h = 1.5 } = {}) {
    // the walkers' ground: the terrain or a bridge deck (never a roof, a wall top or a lamppost cap)
    let y = this.heightAt(x, z);
    const dk = this.deckAt(x, z);
    if (dk > y) y = dk;
    else { const w = this.waterAt(x, z); if (w && w.level > y - 0.05) return null; }
    let bad = false;
    this.#near(x, z, r, (it) => {
      if (it.t === 'box') { if (y + h > it.y0 && y < (it.roof ? Collision.topAt(it, x, z) : it.y1) - STEP_UP && Collision.inBox(it, x, z, r)) bad = true; }
      else if (it.t === 'cyl') { if (y + h > it.y0 && y < it.y1 - STEP_UP && (x - it.x) ** 2 + (z - it.z) ** 2 < (it.r + r) ** 2) bad = true; }
      else if (it.t === 'rock') { const lim = y + STEP_UP; if (Collision.rockTop(it, x, z) > lim || Collision.rockTop(it, x + r, z) > lim || Collision.rockTop(it, x - r, z) > lim || Collision.rockTop(it, x, z + r) > lim || Collision.rockTop(it, x, z - r) > lim) bad = true; }
      if (bad) return false;
    });
    return bad ? null : y;
  }

  /** Batch-3: the nearest standable spot to (x, z) (rings 0.75 m apart, 16 bearings, out to maxR), or null. Deterministic:
   *  no random draw, so moving a spawn or a target off the water moves no one else's stream. */
  clearNear(x, z, { r = 0.3, h = 1.5, maxR = 40 } = {}) {
    // (and not in a shore cell the crowds' and walkers' step guard counts as water: never stuck at the edge)
    if (this.standable(x, z, { r, h }) != null && this.walkBlocked(x, z) !== 1) return { x, z };
    for (let d = 0.75; d <= maxR; d += 0.75) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (this.standable(px, pz, { r, h }) != null && this.walkBlocked(px, pz) !== 1) return { x: px, z: pz };
      }
    }
    return null;
  }

  waterAt(x, z) {
    let res = null;
    this.#near(x, z, 0, (it) => {
      // fix-27: water is where the drawn water is AND the ground is under its surface (the shore is the waterline)
      if (it.t === 'water' && pointInPoly(x, z, it.outline) && this.heightAt(x, z) < it.level - 0.02) { res = it; return false; }
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
        if (p.y + h < it.y0 || p.y >= (it.roof ? Collision.topAt(it, p.x, p.z) : it.y1) - STEP_UP) return;   // (a roof: its slope where Gus is)
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
      if (it.t === 'box' && y > it.y0 && y < it.y1 && Collision.inBox(it, x, z) && (!it.roof || y < Collision.topAt(it, x, z))) res = true;
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
const _cell = { tile: null, k: 0 };
const _CORNERS = [[0, 0], [-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
