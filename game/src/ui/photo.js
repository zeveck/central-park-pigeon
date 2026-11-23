// Photo mode (issue #9) and the Album. Photo mode is a MENU (G.openMenu('photo')), so while it's open the park's
// clock, the schemes, the item keeper and the autosave all stand still, exactly as under Pause. It only opens in free
// play (canOpen(): not mid-scene, not in a race, fight or encounter, not driving, not in dialogue) and only once Gus has
// the camera (gear 'camera', from Say Cheese: src/schemes/say-cheese.js).
//
//   camera   CameraRig.photo: an orbit round Gus (yaw, elevation, distance 0.6–12 m) on the follow rig, with its ray
//            push-in against solids and its ground clamp (never rig.free). Each photo tick runs the camera-following
//            world updates (G.followCamWorld: terrain LOD, trees, props, landmark streaming) and G.photoHold keeps the
//            triangle governor (budgetScale) steady.
//   poses    Gus: Natural, Coo, Flap, Puff, Look at camera. "Call the crew": Called allies and recruited ones nearby
//            gather round Gus, facing the lens. Hide Gus. All visual only, put back on exit.
//   looks    Natural, Film, Black & White, Postcard. The live view is a CSS filter (plus a vignette or frame); the
//            saved JPEG gets the same look in a pixel loop (no ctx.filter: Safari has none), then the watermark.
//   capture  G.render() then drawImage in the same task (no preserveDrawingBuffer), at full resolution even if Auto
//            lowered the render scale, capped at 1920 px wide; toBlob('image/jpeg', 0.9) plus a 320 px thumbnail.
//   album    IndexedDB 'cpp-album' v1, store 'photos' ({ id, at, blob, thumb, w, h, look }): shared by every save slot
//            (the photos are the player's, not a save). A save counts on tx.oncomplete; a quota error or an abort says
//            so. 60 photos at most: past that it offers "Delete oldest". Each photo: Share (navigator.canShare with
//            files: phones), Download (<a download>; the desktop app saves it through its own dialog), Delete (asks).
//   input    pad: A snap (the focused button), X pose, Y look, LB/RB zoom, sticks orbit, D-pad moves between the
//            buttons, B exit. Keyboard: Space/Enter snap, P pose, L look, wheel or +/- zoom, mouse drag or arrows/WASD
//            orbit, Esc exit. Touch: drag orbit, pinch zoom, the big shutter, Pose and Look chips, ✕ top-left.
// Nothing here reads or writes the park's random streams or its state, except the Say Cheese flag photo.flicker (a
// snap with Flicker in the picture while that step is open).
import * as THREE from 'three';
import { icon } from './icons.js';
import { glyph } from './glyphs.js';
import { CHARACTERS, CREW } from '../data/crews.js';

const POSES = [['natural', 'Natural'], ['coo', 'Coo'], ['flap', 'Flap'], ['puff', 'Puff'], ['look', 'Look at camera']];
const LOOKS = [['natural', 'Natural'], ['film', 'Film'], ['bw', 'Black & White'], ['postcard', 'Postcard']];
const CSS_LOOK = { natural: '', film: 'sepia(0.38) saturate(1.15) contrast(0.92) brightness(1.05)', bw: 'grayscale(1) contrast(1.12)', postcard: 'saturate(1.25) contrast(1.04)' };
const DIST = { min: 0.6, max: 12 };
const ELEV = { min: -0.15, max: 1.35 };
const MAX_W = 1920;
export const ALBUM_MAX = 60;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- the album (IndexedDB)
export class Album {
  constructor() { this.db = null; }
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open('cpp-album', 1); } catch (e) { rej(e); return; }
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true }).createIndex('at', 'at'); };
      req.onsuccess = () => { this.db = req.result; this.db.onversionchange = () => { this.db.close(); this.db = null; }; res(this.db); };
      req.onerror = () => rej(req.error);
      req.onblocked = () => rej(new Error('blocked'));
    });
  }
  async #tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      let out, tx;
      try { tx = db.transaction('photos', mode); out = fn(tx.objectStore('photos')); } catch (e) { rej(e); return; }
      // a save is done when the transaction is: a quota error or an abort lands in onabort / onerror
      tx.oncomplete = () => res(out && 'result' in out ? out.result : out);
      tx.onabort = () => rej(tx.error || out?.error || new Error('aborted'));
      tx.onerror = (e) => { e.preventDefault?.(); };
    });
  }
  add(rec) { return this.#tx('readwrite', (s) => s.add(rec)); }
  remove(id) { return this.#tx('readwrite', (s) => s.delete(id)); }
  count() { return this.#tx('readonly', (s) => s.count()); }
  async list() { const all = await this.#tx('readonly', (s) => s.getAll()); return (all || []).sort((a, b) => b.at - a.at); }
  async oldest() { const all = await this.list(); return all[all.length - 1] || null; }
}

/** Why a storage error happened, in words. */
function storageWords(e) {
  const n = e?.name || '';
  if (n === 'QuotaExceededError' || /quota/i.test(String(e?.message || ''))) return 'Your browser is out of room for photos. Download the ones you love, then delete some to make space.';
  if (n === 'InvalidStateError' || n === 'SecurityError' || n === 'UnknownError') return 'This browser won\'t keep photos here (private browsing, perhaps). Download each one as you take it.';
  return 'The photo couldn\'t be saved to the album. Try again, or download photos as you take them.';
}

const fileName = (at) => { const d = new Date(at), p = (n) => String(n).padStart(2, '0'); return `central-park-pigeon-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`; };
const dateWords = (at) => new Date(at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// ---------------------------------------------------------------- the looks, in pixels (the saved JPEG)
function applyLook(ctx, w, h, look) {
  if (look === 'natural') return;
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const cx = w / 2, cy = h / 2, rr = 1 / (cx * cx + cy * cy);
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (look === 'bw') {
        let l = 0.299 * r + 0.587 * g + 0.114 * b;
        l = (l - 128) * 1.12 + 128;
        r = g = b = l;
      } else if (look === 'film') {
        // warm, lifted blacks, a little sepia, grain and a soft vignette
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = (r * 0.62 + l * 0.38) * 1.04 + 18; g = (g * 0.62 + l * 0.38) * 0.98 + 12; b = (b * 0.62 + l * 0.38) * 0.84 + 8;
        const n = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 - 0.5;
        r += n * 14; g += n * 14; b += n * 14;
        const dx = x - cx, dy = y - cy, v = 1 - 0.38 * Math.pow((dx * dx + dy * dy) * rr, 1.3);
        r *= v; g *= v; b *= v;
      } else if (look === 'postcard') {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * 1.3; g = l + (g - l) * 1.3; b = l + (b - l) * 1.3;
      }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** The postcard frame: a cream border with a caption strip (drawn in code, in the game's font). */
function postcardFrame(src) {
  const pad = Math.round(src.width * 0.035), cap = Math.round(src.width * 0.06);
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const c = out.getContext('2d');
  c.fillStyle = '#f6efe0'; c.fillRect(0, 0, out.width, out.height);
  const iw = out.width - pad * 2, ih = out.height - pad - cap;
  c.drawImage(src, 0, 0, src.width, src.height, pad, pad, iw, ih);
  c.strokeStyle = 'rgba(90, 70, 50, 0.35)'; c.lineWidth = Math.max(1, out.width / 900); c.strokeRect(pad, pad, iw, ih);
  c.fillStyle = '#c4302b';
  c.font = `600 ${Math.round(cap * 0.5)}px Fredoka, sans-serif`;
  c.textBaseline = 'middle';
  c.fillText('Greetings from Central Park', pad, out.height - cap / 2);
  // a stamp-ish corner mark
  const s = cap * 0.62, sx = out.width - pad - s, sy = out.height - cap / 2 - s / 2;
  c.strokeStyle = '#c4302b'; c.setLineDash([s / 8, s / 10]); c.lineWidth = Math.max(1, s / 18); c.strokeRect(sx, sy, s, s); c.setLineDash([]);
  c.fillStyle = '#3a6a9a'; c.fillRect(sx + s * 0.18, sy + s * 0.18, s * 0.64, s * 0.64);
  return out;
}

function watermark(c, w, h, at, onFrame) {
  const fs = Math.max(12, Math.round(w * 0.016));
  c.save();
  c.font = `600 ${fs}px Fredoka, sans-serif`;
  c.textAlign = 'right'; c.textBaseline = 'alphabetic';
  // (on the postcard it ends left of the stamp: postcardFrame's pad 3.5 % + stamp 0.62 × 6 % of the width)
  const x = onFrame ? w - Math.round(w * 0.035 + w * 0.06 * 0.62 + fs * 0.8) : w - Math.round(fs * 1.1), y = h - Math.round(onFrame ? fs * 0.9 : fs * 1.1);
  const text = `Central Park Pigeon · ${dateWords(at)}`;
  c.fillStyle = onFrame ? 'rgba(90, 70, 50, 0.75)' : 'rgba(255, 250, 240, 0.92)';
  if (!onFrame) { c.shadowColor = 'rgba(0, 0, 0, 0.55)'; c.shadowBlur = fs * 0.35; c.shadowOffsetY = fs * 0.08; }
  c.fillText(text, x, onFrame ? y - Math.round(w * 0.02) : y);
  c.restore();
}

// ---------------------------------------------------------------- install
export function installPhoto(G) {
  const album = new Album();
  const P = {
    open: false, pose: 0, look: 0, grid: false, mark: true, hideGus: false, crew: false,
    yaw: 0, elev: 0.3, dist: 2.2, saved: null, gathered: [], busy: false, flashT: 0, t: 0, fov: 55,
  };

  const unlocked = () => !!G.state?.gear?.includes('camera');
  /** Why photo mode can't open right now (a short line), or null. */
  const blockedReason = () => {
    if (G.screen !== 'play') return 'Not now.';
    if (!unlocked()) return G.schemes?.isOpen('say-cheese') ? 'No camera yet. "Say Cheese" on the Board says where one is.' : 'No camera yet.';
    if (G.midScene?.() || G.cutscene?.locked || G.dialogue?.open) return 'Not in the middle of a scene.';
    if (G.vehicles?.driving) return 'Not while driving.';
    if (G.fights?.f) return 'Not in the middle of a fight.';
    if (G.race?.run) return 'Not in the middle of a race.';
    if (G.mods?.some((m) => m.panel?.())) return 'Not in the middle of this.';
    if (G.openSky?.busy?.()) return 'Not right now.';
    return null;
  };
  const howToOpen = () => {
    const dev = G.input?.device || 'keyboard', fam = G.input?.gamepad?.family || 'xbox';
    if (dev === 'touch') return 'the camera button, top right';
    if (dev === 'gamepad') return `D-pad right, or Pause, then Photo`;
    return 'press V, or Pause, then Photo';
  };
  const request = () => {
    const why = blockedReason();
    if (why) { G.toast(why, { seconds: 3 }); return false; }
    G.openMenu('photo');
    return true;
  };

  // ------------------------------------------------------------ the photo screen
  const el = document.createElement('div');
  el.id = 'photo';
  el.className = 'photo-mode';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Photo mode');
  el.innerHTML = `
    <div class="catch" aria-hidden="true"></div>
    <div class="vig" aria-hidden="true"></div>
    <div class="frame" aria-hidden="true"><span>Greetings from Central Park</span></div>
    <div class="grid3" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="flash" aria-hidden="true"></div>
    <button type="button" class="x" data-act="exit" aria-label="Leave photo mode">${icon('close')}</button>
    <div class="title"><span>Photo mode</span></div>
    <div class="panel">
      <button type="button" class="chip" data-act="pose">${icon('pigeon')}<span>Pose: <b class="pv"></b></span></button>
      <button type="button" class="chip" data-act="look">${icon('sun')}<span>Look: <b class="lv"></b></span></button>
      <button type="button" class="chip" data-act="crew">${icon('paw')}<span class="cv">Call the crew</span></button>
      <button type="button" class="chip tog" data-act="hide"><span>Hide Gus</span></button>
      <button type="button" class="chip tog" data-act="grid"><span>Grid</span></button>
      <button type="button" class="chip tog on" data-act="mark"><span>Watermark</span></button>
      <button type="button" class="chip" data-act="album">${icon('album')}<span>Album</span></button>
    </div>
    <button type="button" class="shutter" data-act="snap" aria-label="Take a photo"><i></i></button>
    <div class="phints"></div>
    <div class="note"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const note = (text, secs = 3) => { const n = $('.note'); n.textContent = text; n.classList.add('on'); clearTimeout(note.t); note.t = setTimeout(() => n.classList.remove('on'), secs * 1000); };

  const renderChips = () => {
    $('.pv').textContent = POSES[P.pose][1];
    $('.lv').textContent = LOOKS[P.look][1];
    $('.cv').textContent = P.crew ? 'Crew: gathered' : 'Call the crew';
    el.querySelector('[data-act="crew"]').classList.toggle('on', P.crew);
    el.querySelector('[data-act="hide"]').classList.toggle('on', P.hideGus);
    el.querySelector('[data-act="grid"]').classList.toggle('on', P.grid);
    el.querySelector('[data-act="mark"]').classList.toggle('on', P.mark);
    el.classList.toggle('g', P.grid);
    const look = LOOKS[P.look][0];
    el.dataset.look = look;
    G.renderer.domElement.style.filter = CSS_LOOK[look] || '';
  };
  const renderHints = () => {
    const dev = G.input?.device || 'keyboard', fam = G.input?.gamepad?.family || 'xbox';
    const k = (a) => glyph(a, dev, fam);
    const rows = dev === 'touch' ? [['Drag', 'Orbit'], ['Pinch', 'Zoom']].map(([g, l]) => `<span><span class="padpill">${g}</span> ${l}</span>`)
      : dev === 'gamepad' ? [[k('uiOk'), 'Snap'], [k('photoPose'), 'Pose'], [k('photoLook'), 'Look'], [`${k('zoomOut')}${k('zoomIn')}`, 'Zoom'], [k('look'), 'Orbit'], [k('uiBack'), 'Exit']].map(([g, l]) => `<span>${g} ${l}</span>`)
        : [[k('uiOk'), 'Snap'], [k('photoPose'), 'Pose'], [k('photoLook'), 'Look'], [`${k('zoomOut')} ${k('zoomIn')}`, 'Zoom'], [`<span class="key">Drag</span>`, 'Orbit'], [k('uiBack'), 'Exit']].map(([g, l]) => `<span>${g} ${l}</span>`);
    $('.phints').innerHTML = rows.join('');
  };

  // ------------------------------------------------------------ Gus and the crew, posed (visual only, put back on exit)
  const gus = () => G.gus;
  const saveGus = () => {
    const g = gus();
    P.saved = {
      rootRot: g.root.rotation.clone(), standVis: g.standPose.visible, flyVis: g.flyPose.visible,
      sPos: g.standPose.position.clone(), sRot: g.standPose.rotation.clone(), sScale: g.standPose.scale.clone(),
      fRot: g.flyPose.rotation.clone(), fPos: g.flyPose.position.clone(), rootVis: g.root.visible,
      scarfVis: g.scarf?.group?.visible,
    };
  };
  const restoreGus = () => {
    const g = gus(), s = P.saved;
    if (!s) return;
    if (g.flyPose.visible !== s.flyVis) g.useModel(s.flyVis ? 'fly' : 'stand');
    g.root.rotation.copy(s.rootRot); g.root.visible = s.rootVis;
    g.standPose.position.copy(s.sPos); g.standPose.rotation.copy(s.sRot); g.standPose.scale.copy(s.sScale);
    g.flyPose.rotation.copy(s.fRot); g.flyPose.position.copy(s.fPos);
    P.saved = null;
  };
  const poseGus = (dt) => {
    const g = gus(), s = P.saved;
    if (!s) return;
    g.root.visible = !P.hideGus;
    const pose = POSES[P.pose][0];
    const wantFly = pose === 'flap' ? true : s.flyVis;
    if (g.flyPose.visible !== wantFly) g.useModel(wantFly ? 'fly' : 'stand');
    g.standPose.position.copy(s.sPos); g.standPose.rotation.copy(s.sRot); g.standPose.scale.copy(s.sScale);
    g.flyPose.rotation.copy(s.fRot); g.flyPose.position.copy(s.fPos);
    g.root.rotation.copy(s.rootRot);
    const t = P.t;
    if (pose === 'coo') { const b = 1 + 0.06 * Math.sin(t * 7); g.standPose.scale.set(1.1 * b, 0.96, 1.1 * b); g.standPose.rotation.x = -0.12; }
    else if (pose === 'puff') g.standPose.scale.set(1.28, 1.06, 1.28);
    else if (pose === 'flap') { g.flyPose.rotation.set(-0.45, 0, 0, 'YXZ'); g.flyPose.position.y = s.fPos.y + 0.12 + 0.02 * Math.sin(t * 5); }
    else if (pose === 'look') { const c = G.dataCam.position; g.root.rotation.y = Math.atan2(c.x - g.position.x, c.z - g.position.z); }
  };
  /** Call the crew: Called allies and recruited ones nearby gather round Gus for the shot (their drawn spots only). */
  const gather = (on) => {
    for (const r of P.gathered) { r.c.root.position.copy(r.pos); r.c.root.rotation.copy(r.rot); r.c.root.visible = r.vis; }
    P.gathered = [];
    if (!on) return 0;
    const g = gus().position, st = G.state;
    const pick = G.chars.list.filter((c) => {
      const def = CHARACTERS[c.id];
      if (!def || !G.chars.out?.(c)) return false;
      if (c.here) return true;   // Called
      return st.crews.includes(def.crew) && Math.hypot(c.x - g.x, c.z - g.z) < 25;
    }).sort((a, b) => (b.here ? 1 : 0) - (a.here ? 1 : 0) || Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z)).slice(0, 6);
    const cam = G.dataCam.position, toCam = Math.atan2(cam.x - g.x, cam.z - g.z);
    pick.forEach((c, i) => {
      P.gathered.push({ c, pos: c.root.position.clone(), rot: c.root.rotation.clone(), vis: c.root.visible });
      const side = i % 2 ? 1 : -1, ring = Math.floor(i / 2);
      const a = toCam + Math.PI + side * (0.7 + ring * 0.45), d = 0.75 + ring * 0.45 + (CHARACTERS[c.id] && c.look?.scale > 1.5 ? 0.6 : 0);
      const x = g.x + Math.sin(a) * d, z = g.z + Math.cos(a) * d;
      const y = G.surfaceY(x, z, g.y + 0.8);
      c.root.position.set(x, Number.isFinite(y) && Math.abs(y - g.y) < 2 ? y : g.y, z);
      c.root.rotation.set(0, Math.atan2(cam.x - x, cam.z - z), 0, 'YXZ');
      c.root.visible = true;
    });
    return pick.length;
  };
  const poseCrew = () => {
    const t = P.t;
    P.gathered.forEach((r, i) => { r.c.root.position.y = r.base ?? (r.base = r.c.root.position.y); r.c.root.position.y = r.base + Math.abs(Math.sin(t * 5 + i)) * 0.04; });
    // Flicker poses for any camera nearby
    const f = G.chars.find('flicker');
    if (f && f.root.visible && Math.hypot(f.x - gus().position.x, f.z - gus().position.z) < 30) {
      const cam = G.dataCam.position;
      f.root.rotation.y = Math.atan2(cam.x - f.x, cam.z - f.z);
      f.root.rotation.z = 0.12 * Math.sin(t * 2.2);
    }
  };

  // ------------------------------------------------------------ the camera
  const setCamera = (dt) => {
    G.rig.photo = { yaw: P.yaw, elev: P.elev, dist: P.dist, fov: P.fov, look: 0.18 };
    G.rig.update(dt, gus(), { collision: G.collision });
    G.followCamWorld?.();
  };

  // ------------------------------------------------------------ capture and save
  const flicker = () => {
    const f = G.chars.find('flicker');
    if (!f || !f.root.visible) return false;
    const cam = G.dataCam;
    cam.updateMatrixWorld();
    const p = new THREE.Vector3(f.x, f.y + 0.25, f.z);
    if (p.distanceTo(cam.position) > 18) return false;
    const v = p.clone().project(cam);
    if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95 || v.z > 1) return false;
    const hit = G.collision.raySolid(cam.position, p, 20, { camera: true });
    return hit > 0.92;
  };
  const scratch = [];
  const snap = async () => {
    if (P.busy) return;
    P.busy = true;
    try {
      const look = LOOKS[P.look][0];
      const at = Date.now();
      const r = G.renderer, canvas = r.domElement;
      const pr0 = r.getPixelRatio();
      // review: the LONG side is capped at 1920 px (a portrait phone's height, not only a landscape width), and the
      // particles' size follows the capture's pixel ratio (their size is in device pixels), then goes back
      const cssW = canvas.clientWidth || innerWidth, cssH = canvas.clientHeight || innerHeight;
      const full = Math.min(Math.max(pr0, window.devicePixelRatio || 1), MAX_W / Math.max(cssW, cssH));
      const swap = Math.abs(full - pr0) > 0.01;
      if (swap) { r.setPixelRatio(full); G.particles?.setPixelScale?.(cssH * full); }
      G.render();
      const sw = canvas.width, sh = canvas.height;
      const k = Math.min(1, MAX_W / Math.max(sw, sh));
      let out = document.createElement('canvas');
      out.width = Math.round(sw * k); out.height = Math.round(sh * k);
      out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
      if (swap) { r.setPixelRatio(pr0); G.particles?.setPixelScale?.(cssH * pr0); G.render(); }
      scratch.push(out);
      // Say Cheese step 3: the first photo is of Flicker (set now, before any await, so a replay sees it on this update)
      if (flicker() && G.schemes.isOpen('say-cheese') && G.schemes.stepIndex('say-cheese') === 2) {
        G.state.flags['photo.flicker'] = true;
        P.flickerNote = true;
      }
      // the shutter and the flash, straight away
      G.audio.play('camera-shutter', { vol: 0.9, ui: true });   // review: ui (the menu pauses the park's sounds)
      P.flashT = 1;
      const c = out.getContext('2d', { willReadFrequently: true });
      applyLook(c, out.width, out.height, look);
      if (look === 'postcard') { out = postcardFrame(out); scratch.push(out); }
      if (P.mark) watermark(out.getContext('2d'), out.width, out.height, at, look === 'postcard');
      const blob = await new Promise((res) => out.toBlob(res, 'image/jpeg', 0.9));
      if (!(blob instanceof Blob)) throw new Error('toBlob gave nothing (out of memory?)');   // review: never "Saved" with no picture
      const th = document.createElement('canvas');
      scratch.push(th);
      th.width = 320; th.height = Math.round(320 * out.height / out.width);
      th.getContext('2d').drawImage(out, 0, 0, th.width, th.height);
      const thumb = await new Promise((res) => th.toBlob(res, 'image/jpeg', 0.8));
      if (!(thumb instanceof Blob)) throw new Error('toBlob gave no thumbnail');
      P.last = { blob, thumb, at, w: out.width, h: out.height, look };
      await store(P.last);
    } catch (e) {
      console.warn('photo: capture failed', e);
      note('That photo didn\'t come out. Try again?', 3.5);
    } finally {
      // review (iOS): give the scratch canvases' memory back at once (a 1920 px canvas is ~8 MB until it's collected)
      for (const c of scratch) { c.width = 0; c.height = 0; }
      scratch.length = 0;
      P.busy = false;
    }
  };
  /** Save to the album; at 60, ask to delete the oldest first. */
  const store = async (rec) => {
    let n = 0;
    try { n = await album.count(); } catch (e) { note(storageWords(e), 6); P.lastError = e?.name || String(e); return false; }
    if (n >= ALBUM_MAX) {
      // review: the count is async; if photo mode was closed meanwhile, never open the question over play
      if (!P.open) { G.toast(`Not saved: the album is full (${ALBUM_MAX} photos). Open it from Pause to make room.`, { seconds: 5 }); return false; }
      G.confirm({
        title: 'The album is full', text: `It holds ${ALBUM_MAX} photos. Delete the oldest one to make room? (Download any you want to keep first.)`,
        yes: 'Delete oldest', no: 'Cancel',
        onYes: async () => { try { const o = await album.oldest(); if (o) await album.remove(o.id); await save(rec); } catch (e) { note(storageWords(e), 6); } },
        onNo: () => note('Not saved: the album is full.', 3),
      });
      return false;
    }
    return save(rec);
  };
  const save = async (rec) => {
    try {
      await album.add({ at: rec.at, blob: rec.blob, thumb: rec.thumb, w: rec.w, h: rec.h, look: rec.look });
      P.saves = (P.saves || 0) + 1;
      P.count = (P.count || 0) + 1;
      note(P.flickerNote ? 'Flicker: "Stunning. Frame it!" Saved to the album.' : 'Saved to the album.', P.flickerNote ? 4 : 2.2);
      P.flickerNote = false;
      return true;
    } catch (e) {
      P.lastError = e?.name || String(e);
      note(storageWords(e), 6);
      return false;
    }
  };

  // ------------------------------------------------------------ pointer: drag to orbit, wheel and pinch to zoom
  const catcher = $('.catch');
  const ptrs = new Map();
  let pinch0 = 0, dist0 = 0;
  catcher.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); catcher.setPointerCapture?.(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = P.dist; } });
  catcher.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) P.dist = THREE.MathUtils.clamp(dist0 * pinch0 / Math.max(20, d), DIST.min, DIST.max); return; }
    P.yaw -= dx * 0.006; P.elev = THREE.MathUtils.clamp(P.elev + dy * 0.005, ELEV.min, ELEV.max);
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
  catcher.addEventListener('pointerup', up); catcher.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { if (!P.open) return; e.preventDefault(); P.dist = THREE.MathUtils.clamp(P.dist * Math.exp(e.deltaY * 0.0012), DIST.min, DIST.max); }, { passive: false });

  const act = {
    exit: () => G.menus.pop(),
    snap: () => snap(),
    pose: () => { P.pose = (P.pose + 1) % POSES.length; renderChips(); },
    look: () => { P.look = (P.look + 1) % LOOKS.length; renderChips(); },
    crew: () => { P.crew = !P.crew; const n = gather(P.crew); if (P.crew && !n) { P.crew = false; note('Nobody from your crews is close enough. Call someone first.', 3.5); } renderChips(); },
    hide: () => { P.hideGus = !P.hideGus; renderChips(); },
    grid: () => { P.grid = !P.grid; renderChips(); },
    mark: () => { P.mark = !P.mark; renderChips(); },
    album: () => G.menus.push('album'),
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !el.contains(b)) return;
    act[b.dataset.act]?.();
    // (a pad press on a toggle hands focus back to the shutter, so ✕ / A snaps again)
    if (G.input?.device === 'gamepad' && b.dataset.act !== 'snap' && b.dataset.act !== 'album' && P.open) $('.shutter').focus({ preventScroll: true });
  });

  const screen = {
    id: 'photo', el,
    focusables: () => [...el.querySelectorAll('button')],
    preferredFocus: () => $('.shutter'),
    open() {
      P.open = true; P.t = 0;
      const g = gus().position, c = G.dataCam.position;
      P.yaw = Math.atan2(g.x - c.x, g.z - c.z);
      P.dist = THREE.MathUtils.clamp(Math.hypot(c.x - g.x, c.y - g.y, c.z - g.z), 1.2, 6);
      P.elev = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp((c.y - g.y - 0.18) / Math.max(0.01, P.dist), -1, 1)), ELEV.min, ELEV.max);
      P.fov = G.dataCam.fov;
      P.budget = G.budgetScale;
      G.photoHold = true;
      saveGus();
      document.body.classList.add('photo');
      renderChips(); renderHints();
      setCamera(0);
      G.bus.emit('photoMode', { open: true });
    },
    reopen() { el.classList.add('on'); renderChips(); renderHints(); document.body.classList.add('photo'); },
    close() {
      P.open = false;
      gather(false); P.crew = false;
      restoreGus();
      G.rig.photo = null;
      G.rig.snap = true;
      G.photoHold = false;
      if (P.budget != null) G.budgetScale = P.budget;
      G.renderer.domElement.style.filter = '';
      document.body.classList.remove('photo');
      el.classList.remove('g');
      G.bus.emit('photoMode', { open: false });
    },
    back() { G.menus.pop(); },
    onDevice() { renderHints(); },
    tick(dt) {
      P.t += dt;
      if (P.flashT > 0) { P.flashT = Math.max(0, P.flashT - dt * 3); $('.flash').style.opacity = P.flashT.toFixed(2); }
      poseCrew();
      poseGus(dt);
      setCamera(dt);
    },
    handleInput(inp) {
      if (G.menus.top !== screen) return false;
      if (inp.pressed('uiBack')) { G.audio?.synth('uiBack'); G.menus.pop(); return true; }
      const dev = inp.device;
      if (inp.pressed('photoPose') || (dev === 'gamepad' && inp.pressed('peck'))) act.pose();
      if (inp.pressed('photoLook') || (dev === 'gamepad' && inp.pressed('coo'))) act.look();
      if (inp.pressed('uiOk')) {
        const f = document.activeElement;
        if (dev === 'gamepad' && f && el.contains(f) && f !== $('.shutter')) { G.audio?.synth('uiSelect'); f.click(); }
        else snap();
      }
      // orbit: sticks, arrows/WASD; mouse/touch drags come through the catcher; the right stick through look
      const dt = G.DT || 1 / 60;
      const m = inp.move();
      const lk = inp.consumeLook();
      P.yaw -= m.x * 1.7 * dt + lk.dx * 0.9;
      P.elev = THREE.MathUtils.clamp(P.elev - m.y * 1.1 * dt + lk.dy * 0.9, ELEV.min, ELEV.max);
      const zin = inp.held('zoomIn') || (dev === 'gamepad' && inp.held('wheel'));
      const zout = inp.held('zoomOut') || (dev === 'gamepad' && inp.held('drop'));
      if (zin) P.dist = Math.max(DIST.min, P.dist * Math.exp(-1.4 * dt));
      if (zout) P.dist = Math.min(DIST.max, P.dist * Math.exp(1.4 * dt));
      // the D-pad moves between the buttons (the stick orbits)
      if (dev === 'gamepad' && Math.hypot(m.x, m.y) < 0.3) for (const d of ['uiUp', 'uiDown', 'uiLeft', 'uiRight']) if (inp.pressed(d)) G.menus.move(d.slice(2).toLowerCase());
      return true;
    },
  };
  G.menus.add(screen);

  // ------------------------------------------------------------ the album and one photo
  const urls = [];
  const freeUrls = () => { while (urls.length) URL.revokeObjectURL(urls.pop()); };
  const albumEl = document.createElement('div');
  albumEl.id = 'album';
  albumEl.className = 'overlay';
  albumEl.setAttribute('role', 'dialog');
  albumEl.innerHTML = `<div class="card wide"><h2>Album <small class="n"></small></h2><p class="muted keep">Download photos to keep them. The album lives in this browser and every save slot shares it.</p><div class="thumbs"></div><div class="row"><button type="button" class="btn primary" data-act="back">${icon('close')}<span>Back</span></button></div><div class="hints" data-auto='[["uiOk","Open"],["uiBack","Back"]]'></div></div>`;
  document.body.appendChild(albumEl);
  let photos = [];
  const albumScreen = {
    id: 'album', el: albumEl,
    async open() { await albumScreen.render(); },
    reopen() { albumScreen.render(); },
    async render() {
      freeUrls();
      const box = albumEl.querySelector('.thumbs');
      try { photos = await album.list(); } catch (e) { photos = []; box.innerHTML = `<p class="muted">${esc(storageWords(e))}</p>`; albumEl.querySelector('.n').textContent = ''; return; }
      P.count = photos.length;
      albumEl.querySelector('.n').textContent = `${photos.length} of ${ALBUM_MAX}`;
      // review: a record whose picture can't be read (no Blob) gets a plain tile that offers to delete it
      const ok = (p) => p.blob instanceof Blob;
      box.innerHTML = photos.length ? photos.map((p, i) => { if (!ok(p)) return `<button type="button" class="thumb bad" data-i="${i}"><span>This photo can't be read. Delete it?</span></button>`; const u = URL.createObjectURL(p.thumb instanceof Blob ? p.thumb : p.blob); urls.push(u); return `<button type="button" class="thumb" data-i="${i}" aria-label="Photo from ${esc(dateWords(p.at))}"><img alt="" src="${u}"></button>`; }).join('')
        : `<p class="muted empty">No photos yet. ${unlocked() ? 'Open photo mode and snap one!' : 'Find a camera first.'}</p>`;
      if (G.menus.top === albumScreen) G.menus.focusFirst();
    },
    close() { freeUrls(); },
    back() { G.menus.pop(); },
  };
  albumEl.addEventListener('click', (e) => {
    const t = e.target.closest('.thumb');
    if (t) {
      const p = photos[+t.dataset.i];
      if (!(p?.blob instanceof Blob)) {
        G.confirm({ title: 'Delete this photo?', text: 'Its picture can\'t be read, so it can\'t be shown or downloaded.', yes: 'Delete', no: 'Keep it',
          onYes: async () => { try { await album.remove(p.id); P.count = Math.max(0, (P.count || 1) - 1); } catch (err) { G.toast(storageWords(err)); } albumScreen.render(); } });
        return;
      }
      G.menus.push('photoview', p);
      return;
    }
    if (e.target.closest('[data-act="back"]')) G.menus.pop();
  });
  G.menus.add(albumScreen);

  const viewEl = document.createElement('div');
  viewEl.id = 'photoview';
  viewEl.className = 'overlay';
  viewEl.setAttribute('role', 'dialog');
  viewEl.innerHTML = `<div class="card wide"><img class="big" alt="Your photo"><p class="muted when"></p><div class="row acts"></div><div class="hints" data-auto='[["uiOk","Select"],["uiBack","Back"]]'></div></div>`;
  document.body.appendChild(viewEl);
  let cur = null, curUrl = null;
  const canShare = (file) => { try { return !window.desktop && !!navigator.canShare && navigator.canShare({ files: [file] }); } catch { return false; } };
  const download = (p) => {
    const u = URL.createObjectURL(p.blob);
    const a = document.createElement('a');
    a.href = u; a.download = fileName(p.at); a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    P.downloads = (P.downloads || 0) + 1;
  };
  const viewScreen = {
    id: 'photoview', el: viewEl,
    open(p) {
      if (!(p?.blob instanceof Blob)) { G.menus.pop(); return; }   // review: (the album never opens one; a stale call can't throw)
      cur = p;
      if (curUrl) URL.revokeObjectURL(curUrl);
      curUrl = URL.createObjectURL(p.blob);
      viewEl.querySelector('.big').src = curUrl;
      viewEl.querySelector('.when').textContent = `${dateWords(p.at)} · ${LOOKS.find((l) => l[0] === p.look)?.[1] || 'Natural'}`;
      const file = new File([p.blob], fileName(p.at), { type: 'image/jpeg' });
      const share = canShare(file);
      const b = (a, label, ic, cls = '') => `<button type="button" class="btn ${cls}" data-act="${a}">${icon(ic)}<span>${label}</span></button>`;
      viewEl.querySelector('.acts').innerHTML = (share ? b('share', 'Share', 'play', 'primary') + b('download', 'Download', 'save') : b('download', 'Download', 'save', 'primary')) + b('delete', 'Delete', 'close') + b('back', 'Back', 'album');
      viewScreen.file = file;
    },
    close() { if (curUrl) { URL.revokeObjectURL(curUrl); curUrl = null; } },
    back() { G.menus.pop(); },
  };
  viewEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !cur) return;
    const a = b.dataset.act;
    if (a === 'back') G.menus.pop();
    else if (a === 'download') { download(cur); b.querySelector('span').textContent = 'Downloaded'; }
    else if (a === 'share') { try { await navigator.share({ files: [viewScreen.file], title: 'Central Park Pigeon' }); } catch (err) { if (err?.name !== 'AbortError') download(cur); } }
    else if (a === 'delete') {
      const p = cur;
      G.confirm({ title: 'Delete this photo?', text: 'It goes from the album for good (a copy you downloaded stays).', yes: 'Delete', no: 'Keep it',
        onYes: async () => { try { await album.remove(p.id); P.count = Math.max(0, (P.count || 1) - 1); } catch (err) { G.toast(storageWords(err)); } G.menus.pop(); } });
    }
  });
  G.menus.add(viewScreen);

  album.count().then((n) => { P.count = n; }).catch(() => {});   // (the Pause row shows the Album to a slot without the camera too)
  G.photo = {
    hasPhotos: () => (P.count || 0) > 0,
    album, request, canOpen: () => !blockedReason(), blockedReason, unlocked, howToOpen,
    get isOpen() { return P.open; }, get state() { return { ...P, saved: !!P.saved, gathered: P.gathered.length, last: P.last ? { w: P.last.w, h: P.last.h, look: P.last.look, bytes: P.last.blob?.size } : null }; },
    snap, act, lastBlob: () => P.last?.blob || null,
  };
  return G.photo;
}
