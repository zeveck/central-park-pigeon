// The map (Tab): a top-down view of the park rendered once from the real
// world geometry (an orthographic render at load), with fog of war over what
// Gus hasn't seen (visit, or land on a Summit Perch), and markers: Nests,
// grates, signs (red, green, green with a stamp), ranger carts, spike sites,
// slice joints and drops, the griddle, feud spots, crews and the tracked
// scheme's targets. Click (or move the cursor with the stick and press ✕) to
// set a waypoint; it shows on the compass.
// fix-34: on a controller the buttons take no focus (the stick moved the cursor AND hopped focus between them, and ✕
// pressed the focused button instead of setting the waypoint): L stick / D-pad move the cursor, ✕ sets the waypoint,
// □ clears it, R1 zooms in, L1 shows the whole park, R stick pans, ○ closes. Setting or clearing says so.

import * as THREE from 'three';
import { WORLD, NESTS, GRATES, SIGNS, SPIKE_SITES, SLICE, RANGER_CARTS, PLACES, ZONES, LANDMARKS, PARK, WATER } from '../world/layout.js';
import { CREWS, CHARACTERS, FEUDS } from '../data/crews.js';
import { LEAD_HINTS } from '../data/lead-hints.js';   // #24
import { overlay } from './menu.js';
import { icon } from './icons.js';
import { gpuIdle, primePrograms, compileQuiet } from '../gfx/warm.js';   // boot fix

const CELL = 10;
const NX = Math.ceil((WORLD.xMax - WORLD.xMin) / CELL), NZ = Math.ceil((WORLD.zMax - WORLD.zMin) / CELL);

export class FogOfWar {
  constructor(state) { this.state = state; this.bits = new Uint8Array(Math.ceil((NX * NZ) / 8)); this.load(); }
  load() {
    this.bits.fill(0);
    const s = this.state.fog;
    if (s) { try { const bin = atob(s); for (let i = 0; i < Math.min(bin.length, this.bits.length); i++) this.bits[i] = bin.charCodeAt(i); } catch { /* fresh */ } }
  }
  save() { let s = ''; for (const b of this.bits) s += String.fromCharCode(b); this.state.fog = btoa(s); }
  idx(ix, iz) { return iz * NX + ix; }
  seen(ix, iz) { const i = this.idx(ix, iz); return (this.bits[i >> 3] >> (i & 7)) & 1; }
  reveal(x, z, r) {
    let changed = false;
    const i0 = Math.max(0, Math.floor((x - r - WORLD.xMin) / CELL)), i1 = Math.min(NX - 1, Math.floor((x + r - WORLD.xMin) / CELL));
    const j0 = Math.max(0, Math.floor((z - r - WORLD.zMin) / CELL)), j1 = Math.min(NZ - 1, Math.floor((z + r - WORLD.zMin) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cx = WORLD.xMin + (i + 0.5) * CELL, cz = WORLD.zMin + (j + 0.5) * CELL;
      if ((cx - x) ** 2 + (cz - z) ** 2 > r * r) continue;
      const k = this.idx(i, j);
      if (!((this.bits[k >> 3] >> (k & 7)) & 1)) { this.bits[k >> 3] |= 1 << (k & 7); changed = true; }
    }
    if (changed) this.save();
    return changed;
  }
  fraction() { let n = 0; for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) n += this.seen(i, j); return n / (NX * NZ); }
}

/** Render the world from straight above into a canvas (once, at load).
 * Boot fix: async. The scene keeps its fog (pushed out of reach) so the map pass reuses the programs the warm-up compiled
 * (fog = null was a second variant of every program: ~8 s of synchronous shader links in software GL, far more on
 * Windows/ANGLE), any program still missing is compiled with compileAsync, and the pixels come back through a PBO
 * (readRenderTargetPixelsAsync) instead of a readPixels that waits for the GPU to finish the whole frame. */
export async function renderMapImage(G, { w = 384, h = 1200 } = {}) {
  const r = G.renderer;
  const W = WORLD.xMax - WORLD.xMin, H = WORLD.zMax - WORLD.zMin;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 600);
  const cx = (WORLD.xMin + WORLD.xMax) / 2, cz = (WORLD.zMin + WORLD.zMax) / 2;
  cam.position.set(-cx, 400, cz);   // render space (the world root is mirrored in x)
  cam.up.set(0, 0, 1);
  cam.lookAt(-cx, 0, cz);
  cam.updateMatrixWorld();
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 0 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const scene = G.scene;
  const fog = scene.fog, fogNear = fog?.near, fogFar = fog?.far;
  const hide = [G.gus.root, G.flock.mesh, G.particles.points, G.humans?.group, G.crowds?.group, G.chars?.group].filter(Boolean);
  const vis = hide.map((o) => o.visible);
  const setUp = () => {
    if (fog) { fog.near = 1e7; fog.far = 1e7 + 1; }   // no fog on the map, same shader programs
    hide.forEach((o) => { o.visible = false; });
    G.terrain.updateLod(new THREE.Vector3(0, 0, -5000));
  };
  const restore = () => {
    if (fog) { fog.near = fogNear; fog.far = fogFar; }
    hide.forEach((o, i) => { o.visible = vis[i]; });
  };
  setUp();
  r.setRenderTarget(rt);
  await compileQuiet(r, scene, cam);   // whatever the warm-up missed (compileAsync where the browser has it)
  r.setRenderTarget(null);
  await gpuIdle(r);
  primePrograms(r);
  setUp();
  r.setRenderTarget(rt);
  r.setClearColor(0x2a3a2a, 1);
  r.clear();
  r.render(scene, cam);
  const px = new Uint8Array(w * h * 4);
  const read = r.readRenderTargetPixelsAsync(rt, 0, 0, w, h, px);   // issues the read now, resolves when the GPU is done
  r.setRenderTarget(null);
  r.setClearColor(0x000000, 0);
  restore();
  await read;
  await gpuIdle(r);
  rt.dispose();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  // GL rows are bottom-up; the top of the canvas is north
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  g.putImageData(img, 0, 0);
  // polish (P13): the water shader rendered from above was a noisy speckle; paint every body of water as a flat tint
  // with a pale shoreline, like a park map
  const toC = (q) => [((q.x - WORLD.xMin) / W) * w, ((WORLD.zMax - q.z) / H) * h];
  for (const wt of WATER) {
    if (!wt.outline?.length) continue;
    g.beginPath();
    wt.outline.forEach((q, i) => { const [x, y] = toC(q); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath();
    g.fillStyle = '#5d9cc4'; g.fill();
    g.lineJoin = 'round'; g.lineWidth = 1.6; g.strokeStyle = '#d7ecf5'; g.stroke();
  }
  return c;
}

/** polish (P13): where a zone's name goes on the map: on its namesake water (THE POND sat on the grass), else mid-zone. */
const ZONE_WATER = { south: 'pond', reservoir: 'reservoir' };
function zoneAnchor(zn) {
  const wt = WATER.find((q) => q.id === ZONE_WATER[zn.id]);
  if (wt?.outline?.length) { const n = wt.outline.length; return { x: wt.outline.reduce((a, q) => a + q.x, 0) / n, z: wt.outline.reduce((a, q) => a + q.z, 0) / n }; }
  return { x: (PARK.xMin + PARK.xMax) / 2, z: (zn.z[0] + zn.z[1]) / 2 };
}

export function mapScreen(G) {
  // Fixes-3 (bughunter-2 B6): opened from Pause, Back goes back to Pause (closeMenus unpaused a controller player)
  const leave = () => { if (G.menus.stack.length > 1) G.menus.pop(); else G.closeMenus(); };
  const el = overlay('map', `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="margin:0">Map</h2><span class="muted seen"></span><span class="wpnote" style="font-weight:700;color:#2fa39a"></span><span style="flex:1"></span>
      <button type="button" class="btn small" data-act="zoom">${icon('map')}<span>Whole park</span></button>
      <button type="button" class="btn small" data-act="clear">${icon('waypoint')}<span>Clear waypoint</span></button>
      <button type="button" class="btn small" data-act="close">${icon('close')}<span>Close</span></button></div>
    <div class="wrap" style="margin-top:8px"><canvas></canvas></div><div class="muted howto" style="font-size:13px;margin-top:4px"></div>
    <div class="legend"><span><i style="background:#e07b39"></i>You</span><span><i style="background:#a07444"></i>Nest</span><span><i style="background:#2f7d46"></i>Grate (subway)</span><span><i style="background:#c4302b"></i>Sign</span><span><i style="background:#6f9a4a"></i>Flipped</span><span><i style="background:#3e5b3a;border-radius:2px"></i>Ranger cart</span><span><i style="background:#f2c230"></i>Slice</span><span><i style="background:#1e1c1b;border:2px solid #e0a83a"></i>Bagels</span><span><i style="background:#2fa39a"></i>Waypoint</span><span><i style="background:#fff;border:2px solid #e07b39"></i>Scheme target</span><span><i style="background:transparent;border:2px dashed #fff"></i>Other cards</span>
      <span class="hints" data-auto='[["move","Cursor"],["uiOk","Waypoint"],["uiBack","Close"]]' style="margin:0 0 0 auto"></span></div>`);
  const wrap = el.querySelector('.wrap');
  const OPEN_ZOOM = 2.6;
  const zoomLabel = () => { const sp = el.querySelector('[data-act="zoom"] span'); if (sp) sp.textContent = zoom > 1 ? 'Whole park' : 'Zoom in'; };
  const canvas = el.querySelector('canvas');
  const g = canvas.getContext('2d');
  let zoom = 1, cursor = null, pan = { x: 0, z: 0 }, noteT = 0;
  const pad = () => G.input.device === 'gamepad';
  // (keys and mouse: the map is clicked, so the row names only what the keys do; a line above it says to click or tap)
  const hints = () => (pad() ? [['move', 'Cursor'], ['uiOk', 'Set waypoint'], ['peck', 'Clear'], ...(zoom > 1 ? [['look', 'Pan'], ['zoomOut', 'Whole park']] : [['zoomIn', 'Zoom in']]), ['uiBack', 'Close']] : [['uiBack', 'Close']]);
  const howTo = () => (pad() ? '' : G.input.device === 'touch' ? 'Tap the map to set a waypoint.' : 'Click the map to set a waypoint.');
  // fix-34 review: on a pad the reticle shows from the start (on Gus), so ✕ always sets the waypoint where it's drawn
  const padCursor = () => { if (!cursor && pad() && canvas.width) { const v = view(), p = G.gus.position, [px, py] = v.toPx(p.x, p.z); cursor = { x: Math.max(0, Math.min(canvas.width, px)), y: Math.max(0, Math.min(canvas.height, py)) }; } };
  const note = (t) => { const n = el.querySelector('.wpnote'); if (n) n.textContent = t; clearTimeout(noteT); noteT = setTimeout(() => { if (n) n.textContent = ''; }, 2500); };
  const setZoom = (z) => { if (z === zoom) return; zoom = z; pan = { x: 0, z: 0 }; zoomLabel(); s.onDevice(); G.menus.refreshHints(); draw(); G.audio.synth('uiMove'); };
  const clearWaypoint = () => {
    if (G.state.waypoint) { G.state.waypoint = null; G.audio.synth('uiBack'); note('Waypoint cleared'); draw(); }
    else { G.audio.synth('uiMove'); note('No waypoint to clear'); }
  };
  const view = () => {
    const ww = wrap.clientWidth, wh = wrap.clientHeight;
    const W = WORLD.xMax - WORLD.xMin, H = WORLD.zMax - WORLD.zMin;
    const s0 = Math.min(ww / W, wh / H);
    // Fixes-3 (R7): zoomed in = the map's whole width across the window (the zone Gus is in, ~0.5 km tall), kept inside
    // the map (centred on Gus it showed half a screen of nothing at the park's ends)
    // polish (P13): the whole park in a landscape window is turned a quarter (north to the right), so the long park
    // fills the width instead of a thin strip in 80% empty space
    if (zoom <= 1 && ww > wh) {
      const s = Math.min(ww / H, wh / W), cx = (WORLD.xMin + WORLD.xMax) / 2, cz = (WORLD.zMin + WORLD.zMax) / 2;
      return { ww, wh, s, cx, cz, rot: true, toPx: (x, z) => [ww / 2 + (z - cz) * s, wh / 2 + (x - cx) * s], toW: (px, py) => [cx + (py - wh / 2) / s, cz + (px - ww / 2) / s] };
    }
    const s = zoom > 1 ? Math.max(s0 * 1.5, ww / W) : s0;
    const p = G.gus.position;
    const clampC = (v, lo, hi, half) => (hi - lo <= half * 2 ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, v)));
    const cx = zoom > 1 ? clampC(p.x + pan.x, WORLD.xMin, WORLD.xMax, ww / 2 / s) : (WORLD.xMin + WORLD.xMax) / 2;   // fix-34: + the stick's pan
    const cz = zoom > 1 ? clampC(p.z + pan.z, WORLD.zMin, WORLD.zMax, wh / 2 / s) : (WORLD.zMin + WORLD.zMax) / 2;
    return { ww, wh, s, cx, cz, rot: false, toPx: (x, z) => [ww / 2 + (x - cx) * s, wh / 2 - (z - cz) * s], toW: (px, py) => [cx + (px - ww / 2) / s, cz - (py - wh / 2) / s] };
  };
  const draw = () => {
    const v = view();
    canvas.width = v.ww; canvas.height = v.wh;
    g.fillStyle = '#26301f'; g.fillRect(0, 0, v.ww, v.wh);
    const base = G.mapImage;
    // a north-up picture covering world x0..x1, z0..z1, drawn through the view (turned a quarter when v.rot)
    const worldImage = (img, x0, x1, z0, z1) => {
      const [px, py] = v.toPx((x0 + x1) / 2, (z0 + z1) / 2), w = (x1 - x0) * v.s, h = (z1 - z0) * v.s;
      g.save(); g.translate(px, py); if (v.rot) g.rotate(Math.PI / 2); g.drawImage(img, -w / 2, -h / 2, w, h); g.restore();
    };
    if (base) worldImage(base, WORLD.xMin, WORLD.xMax, WORLD.zMin, WORLD.zMax);
    // fog of war (Fixes-2: one pixel per cell, scaled up smoothly: soft edges, no grid of seams)
    const fog = G.fog;
    if (!fogCanvas) { fogCanvas = document.createElement('canvas'); fogCanvas.width = NX; fogCanvas.height = NZ; }
    const fc = fogCanvas.getContext('2d'), img = fc.createImageData(NX, NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const o = ((NZ - 1 - j) * NX + i) * 4;
      img.data[o] = 28; img.data[o + 1] = 34; img.data[o + 2] = 48; img.data[o + 3] = fog.seen(i, j) ? 0 : 209;
    }
    fc.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; worldImage(fogCanvas, WORLD.xMin, WORLD.xMin + NX * CELL, WORLD.zMin, WORLD.zMin + NZ * CELL);
    const seenAt = (x, z) => fog.seen(Math.floor((x - WORLD.xMin) / CELL), Math.floor((z - WORLD.zMin) / CELL));
    const dot = (x, z, color, r = 4, ring = null) => { const [px, py] = v.toPx(x, z); g.beginPath(); g.arc(px, py, r, 0, 6.3); g.fillStyle = color; g.fill(); if (ring) { g.lineWidth = 2; g.strokeStyle = ring; g.stroke(); } };
    const sq = (x, z, color, r = 4) => { const [px, py] = v.toPx(x, z); g.fillStyle = color; g.fillRect(px - r, py - r, r * 2, r * 2); };
    for (const n of NESTS) dot(n.x, n.z, '#a07444', 5, '#f2e0b0');
    // Fixes-3 (R7): grates big enough to find; once the rats have joined, a subway bullet (they're Gus's fast travel)
    const subway = G.state.crews.includes('rats');
    for (const gr of GRATES) if (seenAt(gr.x, gr.z)) {
      const [px, py] = v.toPx(gr.x, gr.z), r = subway ? 8 : 6;
      if (subway) {
        g.beginPath(); g.arc(px, py, r, 0, 6.3); g.fillStyle = '#2f7d46'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
        g.fillStyle = '#fff'; g.fillRect(px - 4, py - 4, 8, 6); g.fillStyle = '#2f7d46'; g.fillRect(px - 3, py - 3, 2.5, 2.5); g.fillRect(px + 0.5, py - 3, 2.5, 2.5);
        g.fillStyle = '#fff'; g.fillRect(px - 4, py + 3, 2, 2); g.fillRect(px + 2, py + 3, 2, 2);
      } else {
        g.fillStyle = '#4a4a4a'; g.fillRect(px - r, py - r, r * 2, r * 2); g.strokeStyle = '#bbb'; g.lineWidth = 1.5;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(px + k * 3.5, py - r + 1.5); g.lineTo(px + k * 3.5, py + r - 1.5); g.stroke(); }
      }
    }
    for (const s of SIGNS) {
      if (!seenAt(s.x, s.z)) continue;
      const st = G.state.signs[s.id];
      dot(s.x, s.z, st.flipped ? '#6f9a4a' : '#c4302b', 3.5, st.permanent ? '#f2c230' : null);
    }
    for (const c of RANGER_CARTS) { const cart = G.rangers?.cart(c.id); if (cart && seenAt(cart.x, cart.z)) sq(cart.x, cart.z, G.state.carts[c.id] ? '#888' : '#3e5b3a', 4); }
    for (const sp of SPIKE_SITES) if (G.state.spikes[sp.id] === 'installed' && seenAt(sp.x, sp.z)) { const [px, py] = v.toPx(sp.x, sp.z); g.fillStyle = '#c4302b'; g.beginPath(); g.moveTo(px - 5, py + 4); g.lineTo(px - 2.5, py - 5); g.lineTo(px, py + 4); g.lineTo(px + 2.5, py - 5); g.lineTo(px + 5, py + 4); g.fill(); }
    for (const j of SLICE.joints) if (seenAt(j.counter.x, j.counter.z)) dot(j.counter.x, j.counter.z, '#f2c230', 4, '#b85e25');
    dot(-64, 1068, '#1e1c1b', 4.5, '#e0a83a');   // #44: Super Jumbo Bagels, from New Game (a 24-hour landmark, like the carts)
    if (G.state.lines.length) for (const d of SLICE.drops) dot(d.x, d.z, '#f2c230', 3);
    const gr = SLICE.griddle[G.state.phase];
    if (gr && seenAt(gr.x, gr.z)) sq(gr.x, gr.z, '#f2c230', 3);
    for (const f of FEUDS) if (!G.state.flags[f.until] && G.state.crews.includes(f.crew)) for (const pl of f.places) { const P = PLACES[pl]; const [px, py] = v.toPx(P.x, P.z); g.strokeStyle = 'rgba(196,48,43,.8)'; g.setLineDash([4, 3]); g.beginPath(); g.arc(px, py, P.r * v.s, 0, 6.3); g.stroke(); g.setLineDash([]); }
    for (const c of CREWS) { const b = G.chars?.find(c.boss); if (b && seenAt(b.x, b.z) && G.state.crews.includes(c.id)) dot(b.x, b.z, '#9fd0f0', 3); }
    // #24: a crew whose lead hint Gus has heard (and hasn't joined): a soft region round its haunt, with when to look; not a
    // pin, and drawn under the fog too (it's what he was told)
    const usedAt = {};
    for (const c of CREWS) {
      // (review: hidden once the crew's quest card is open: the card says where to go)
      if (!G.state.leadHints?.[c.id] || G.state.crews.includes(c.id) || (c.recruit && G.schemes.isOpen(c.recruit))) continue;
      const pid = LEAD_HINTS[c.id]?.place || c.haunt, P = PLACES[pid];
      if (!P) continue;
      const [px, py] = v.toPx(P.x, P.z), R = Math.max(30, (P.r || 0) + 12) * v.s;
      const grd = g.createRadialGradient(px, py, R * 0.2, px, py, R);
      grd.addColorStop(0, 'rgba(242, 194, 48, 0.28)'); grd.addColorStop(1, 'rgba(242, 194, 48, 0)');
      g.fillStyle = grd; g.beginPath(); g.arc(px, py, R, 0, 6.3); g.fill();
      g.setLineDash([5, 5]); g.strokeStyle = 'rgba(242, 194, 48, 0.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, R, 0, 6.3); g.stroke(); g.setLineDash([]);
      const when = LEAD_HINTS[c.id]?.when;
      g.font = '700 12px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20, 24, 32, 0.85)';
      const label = `${c.name.replace(/^The /, '')}: ${P.name}${when ? ', ' + when : ''}`;
      const ly = py + (usedAt[pid] ? R * 0.55 : -R * 0.55);   // (two crews on one place: the second label below, review)
      usedAt[pid] = true;
      g.strokeText(label, px, ly); g.fillStyle = '#f2c230'; g.fillText(label, px, ly);
    }
    // Fixes-2 (P2): every open card's target gets a dim ring; the tracked one keeps its bright marker
    const tracked = G.state.tracked;
    for (const id of G.schemes.openList()) if (id !== tracked) for (const t of G.schemes.targets(id)) { const [px, py] = v.toPx(t.x, t.z); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([3, 3]); g.beginPath(); g.arc(px, py, 6, 0, 6.3); g.stroke(); g.setLineDash([]); }
    for (const t of G.schemes.targets()) dot(t.x, t.z, '#ffffff', 5, '#e07b39');
    if (G.state.waypoint) { const w = G.state.waypoint; dot(w.x, w.z, '#2fa39a', 6, '#ffffff'); }
    labels(v, seenAt);
    // Gus
    const [gx, gy] = v.toPx(G.gus.position.x, G.gus.position.z);
    g.save(); g.translate(gx, gy); g.rotate(G.gus.yaw + (v.rot ? Math.PI / 2 : 0)); g.fillStyle = '#e07b39'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
    if (cursor) { g.strokeStyle = '#f2c230'; g.lineWidth = 2; g.beginPath(); g.arc(cursor.x, cursor.y, 9, 0, 6.3); g.moveTo(cursor.x - 14, cursor.y); g.lineTo(cursor.x + 14, cursor.y); g.moveTo(cursor.x, cursor.y - 14); g.lineTo(cursor.x, cursor.y + 14); g.stroke(); }
    if (v.rot) {   // which way is north, now that it's turned
      g.save(); g.translate(28, 26); g.fillStyle = 'rgba(20, 24, 32, 0.7)'; g.beginPath(); g.arc(0, 0, 17, 0, 6.3); g.fill();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-4, -7); g.lineTo(-1, 0); g.lineTo(-4, 7); g.closePath(); g.fill();
      g.font = '700 11px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('N', -9, 4); g.restore();
    }
    el.querySelector('.seen').textContent = `${Math.round(G.fog.fraction() * 100)}% explored`;
  };
  // Fixes-2 (P2): place names. Every goal names a place, so: the zones and (zoomed in) the landmarks you've explored,
  // and ALWAYS the places your open cards name (bold, even under the fog; the tracked card's in orange).
  const labels = (v, seenAt) => {
    const placed = [];
    const text = (str, x, z, { size = 12, color = '#fffaf0', weight = 600, force = false } = {}) => {
      const [px, py] = v.toPx(x, z);
      if (px < -40 || py < -10 || px > v.ww + 40 || py > v.wh + 10) return;
      g.font = `${weight} ${size}px Fredoka, sans-serif`;
      const w = g.measureText(str).width, box = { x0: px - w / 2 - 3, x1: px + w / 2 + 3, y0: py - size, y1: py + 3 };
      if (!force && placed.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) return;
      placed.push(box);
      g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(20, 24, 32, 0.85)';
      g.strokeText(str, px, py); g.fillStyle = color; g.fillText(str, px, py);
    };
    // the open cards' places first (they win any overlap)
    for (const p of G.schemes.cardPlaces()) {
      const [px, py] = v.toPx(p.x, p.z);
      g.lineWidth = 2; g.strokeStyle = p.tracked ? 'rgba(224,123,57,.95)' : 'rgba(255,250,240,.6)'; g.beginPath(); g.arc(px, py, Math.max(7, p.r * v.s), 0, 6.3); g.stroke();
      text(p.name, p.x, p.z - p.r - 3 / v.s, { size: 13, weight: 700, color: p.tracked ? '#f6b26b' : '#fffaf0', force: true });
    }
    // explored zones (at their middle, where you've been) and, zoomed in, the landmarks
    for (const zn of ZONES) {
      const an = zoneAnchor(zn), zc = an.z, xc = an.x;
      let seen = false;
      for (let a = 0; a < 5 && !seen; a++) for (let b = 0; b < 5 && !seen; b++) seen = !!seenAt(PARK.xMin + (PARK.xMax - PARK.xMin) * (a + 0.5) / 5, zn.z[0] + (zn.z[1] - zn.z[0]) * (b + 0.5) / 5);
      if (seen) text(zn.name.toUpperCase(), xc, zc, { size: zoom > 1 ? 15 : 12, weight: 700, color: 'rgba(255,250,240,.78)' });
    }
    if (zoom > 1) for (const L of LANDMARKS) if (seenAt(L.x, L.z)) text(L.name, L.x, L.z, { size: 11, weight: 500 });
  };
  let fogCanvas = null;
  const setWaypoint = (px, py) => {
    const [x, z] = view().toW(px, py);
    G.state.waypoint = { x: +x.toFixed(1), z: +z.toFixed(1) };
    G.audio.synth('uiSelect');
    note('Waypoint set: follow it on the compass');
    draw();
  };
  const s = {
    id: 'map', el,
    // Fixes-3 (R7): it opens zoomed in round Gus (the whole 4 km park in a landscape window was a thin strip); the
    // button toggles the whole park
    open() { G.audio.play('paper-rustle', { ui: true }); cursor = null; pan = { x: 0, z: 0 }; zoom = OPEN_ZOOM; zoomLabel(); s.onDevice(); const n = el.querySelector('.wpnote'); if (n) n.textContent = ''; requestAnimationFrame(() => { draw(); padCursor(); draw(); }); },
    // fix-34: a controller never focuses the buttons (its stick and ✕ belong to the map); mouse, keys and touch keep them
    focusables() { return pad() ? [] : [...el.querySelectorAll('button')]; },
    onDevice() {
      if (pad() && document.activeElement?.closest?.('#map')) document.activeElement.blur();
      const h = el.querySelector('.hints');
      if (h) h.dataset.auto = JSON.stringify(hints());
      const t = el.querySelector('.howto');
      if (t) t.textContent = howTo();
      if (!pad()) cursor = null; else padCursor();
    },
    tick() {
      const inp = G.input;
      if (!pad()) return;
      const m = inp.move();
      const startCursor = padCursor;
      let moved = false;
      if (Math.hypot(m.x, m.y) > 0.3) {
        startCursor();
        cursor.x = Math.max(0, Math.min(canvas.width, cursor.x + m.x * 6));
        cursor.y = Math.max(0, Math.min(canvas.height, cursor.y - m.y * 6));
        moved = true;
      }
      // the right stick pans the zoomed map (the view stays inside the park's map; the pan is kept within it too)
      const rs = inp.rightStick;
      if (zoom > 1 && Math.hypot(rs.x, rs.y) > 0.3) {
        const v = view(), k = 9 / v.s;
        pan.x += rs.x * k; pan.z -= rs.y * k;
        // (kept within the same bounds view() holds the centre to, so pushing past an end builds no slack to undo)
        const p = G.gus.position, hx = v.ww / 2 / v.s, hz = v.wh / 2 / v.s;
        const lim = (c, lo, hi, half) => (hi - lo <= half * 2 ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, c)));
        pan.x = lim(p.x + pan.x, WORLD.xMin, WORLD.xMax, hx) - p.x;
        pan.z = lim(p.z + pan.z, WORLD.zMin, WORLD.zMax, hz) - p.z;
        moved = true;
      }
      if (moved) draw();
    },
    handleInput(inp) {
      if (inp.pressed('map') && !inp.pressed('uiDown')) { leave(); return true; }
      if (pad()) {
        const startCursor = padCursor;
        if (inp.pressed('uiOk')) { startCursor(); setWaypoint(cursor.x, cursor.y); return true; }
        if (inp.pressed('peck')) { clearWaypoint(); return true; }
        if (inp.pressed('wheel') || inp.pressed('zoomIn')) { setZoom(OPEN_ZOOM); return true; }
        if (inp.pressed('drop') || inp.pressed('zoomOut')) { setZoom(1); return true; }
        // the D-pad nudges the cursor (the left stick makes the same ui edges as it moves: it already moved the cursor in tick)
        const d = [['uiUp', 0, -12], ['uiDown', 0, 12], ['uiLeft', -12, 0], ['uiRight', 12, 0]].filter(([a]) => inp.pressed(a));
        if (d.length && Math.hypot(inp.move().x, inp.move().y) > 0.3) return true;
        if (d.length) { startCursor(); for (const [, dx, dy] of d) { cursor.x = Math.max(0, Math.min(canvas.width, cursor.x + dx)); cursor.y = Math.max(0, Math.min(canvas.height, cursor.y + dy)); } draw(); return true; }
        return false;   // (○ closes, through back())
      }
      if (inp.pressed('zoomIn')) { setZoom(OPEN_ZOOM); return true; }
      if (inp.pressed('zoomOut')) { setZoom(1); return true; }
      if (cursor && inp.pressed('uiOk') && document.activeElement?.tagName !== 'BUTTON') { setWaypoint(cursor.x, cursor.y); return true; }
      return false;
    },
    back() { leave(); },
  };
  canvas.addEventListener('click', (e) => { const r = canvas.getBoundingClientRect(); setWaypoint(e.clientX - r.left, e.clientY - r.top); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'close') leave();
    else if (b.dataset.act === 'zoom') setZoom(zoom > 1 ? 1 : OPEN_ZOOM);
    else if (b.dataset.act === 'clear') clearWaypoint();   // fix-34: it says so (it did nothing you could see)
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
  return s;
}
