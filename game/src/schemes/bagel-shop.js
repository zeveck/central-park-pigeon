// #44 Super Jumbo Bagels (110th Street, across from the North Woods gate) and "The Jumbo Order" (design/changes/batch-g-bagels.md).
//
//   the shop     built here, after the world (no rng draws; colliders added after the city keep every earlier array's
//                order): a walk-up window with its counter shelf (a perch; orders sit on it under open sky, so the item
//                keeper's spawn lands on it), an invisible pane in the window, the black fascia (a perch), the blade sign
//                (a perch at 10 m), the neon OPEN, a glass door and the A-frame (a small collider and a perch). All
//                lettering is canvas, flipped for the mirrored world root.
//   Manny        this file's own clone of human-chess-player (not a humans.js agent: PEOPLE's seeds can't shift), with a
//                paper hat and a long apron. Peck him or the bell: the menu ('bagels'), a menu screen (the clock stops).
//   ordering     crumbs go, the bagel is spawned at once (hidden, extra.counter) on the shelf; 1.5 s later it shows ("Order
//                up!"). One order waits at a time. Short of crumbs: one free order a phase (phaseUsed['bagel.free']).
//                A carried bagel goes back to Manny at the counter (not the quest bagel while the Jumbo Order is open).
//   the quest    scripts jumbo.order (the riddle) and jumbo.done (the payoff: postcard, Everything Bagel scarf);
//                G.jumboAnswer (Mama Mask's answer to a carried bagel, data/crews.js TAKERS.mamamask).
//   old saves    G.newsCheck(): a save from before gets the one-time "New in the park" notice (flags news.bagels*).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeHumanClone, makeAccessories, dressClone } from '../entities/humans.js';
import { ruleMaterial } from '../gfx/load-model.js';
import { overlay } from '../ui/menu.js';
import { L, gather, disperse, cheer } from './_ssf-common.js';
import { BASES, SCHMEARS, priceOf, bagelId, bagelParts, isBagel, QUEST_BAGEL, SHOP, SHELF, COUNTER, BELL, MANNY_AT, AFRAME, MANNY, MAMA, RIDDLE } from '../data/bagels.js';

const ID = 'jumbo-order';
const F = SHOP.face;                 // the building face (z); the park is toward smaller z
const X0 = SHOP.x - SHOP.w / 2, X1 = SHOP.x + SHOP.w / 2;   // −67.2 … −60.8
const BOX = { x0: SHELF.x0, x1: SHELF.x1, z0: F - SHOP.out };   // the walk-up window (−66.7 … −62.0, z 1069.2 … face)
const DOOR = { x0: -61.85, x1: -60.95 };
const FASCIA = { y0: SHOP.windowTop + 0.05, y1: 3.35, z0: F - SHOP.out - 0.05 };
const KERB = 0.15;
const COOK_SECS = 1.5;
const OUT = Math.PI;                 // perches on the north side look out over the park (city.js FRAME.north.out)
const FACE_PARK = Math.PI, FACE_OVEN = 0;   // Manny's yaw (checked in shots: π looks out at the park)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ lettering (canvas; flipped for the mirrored world root)
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1;   // (Fixes-3 R4: the world is drawn mirrored)
  const redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  redraw();
  t.userData.redraw = redraw;
  return t;
}
/** Raised lettering: a dark offset shadow, the letter, a lighter top-left edge. */
function raised(g, text, x, y, size, fg = '#F4EFE6') {
  g.font = `700 ${size}px Fredoka, "Arial Black", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const o = Math.max(3, size * 0.05);
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillText(text, x + o, y + o);
  g.fillStyle = '#ffffff'; g.fillText(text, x - o * 0.3, y - o * 0.3);
  g.fillStyle = fg; g.fillText(text, x, y);
}
const fascia = (g, w, h) => {
  g.fillStyle = '#1E1C1B'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3a3633'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  raised(g, 'SUPER JUMBO BAGELS', w / 2, h / 2 + 6, 150);
};
const blade = (g, w, h) => {
  g.fillStyle = '#1E1C1B'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#F4EFE6'; g.lineWidth = 12; g.strokeRect(18, 18, w - 36, h - 36);
  ['SUPER', 'JUMBO', 'BAGELS'].forEach((t, i) => raised(g, t, w / 2, h * (0.2 + i * 0.27), t.length > 5 ? 118 : 138));
  // a bagel ring under the words
  g.strokeStyle = '#E0A83A'; g.lineWidth = 26; g.beginPath(); g.arc(w / 2, h * 0.9, 52, 0, 6.3); g.stroke();
};
function chalk(g, w, h) {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // a fixed-seed wobble (never the game's rng)
  g.fillStyle = '#2E3532'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7a5a36'; g.lineWidth = 22; g.strokeRect(0, 0, w, h);
  const line = (text, y, size) => {
    g.font = `700 ${size}px Nunito, sans-serif`; g.textBaseline = 'middle'; g.fillStyle = 'rgba(244,240,230,0.92)';
    const tw = g.measureText(text).width;
    let x = (w - tw) / 2;
    for (const ch of text) { g.save(); g.translate(x, y + (r() - 0.5) * 4); g.rotate((r() - 0.5) * 0.08); g.fillText(ch, 0, 0); g.restore(); x += g.measureText(ch).width; }
  };
  line('SPECIALS', 70, 58);
  line('SQUIRRELS TALK', 170, 40); line('FOR PLAIN', 218, 40);
  line('PIGEONS WELCOME', 300, 34); line('(FOR ONCE)', 342, 34);
  g.strokeStyle = 'rgba(244,240,230,0.85)'; g.lineWidth = 9;
  for (const [x, y] of [[w * 0.32, 440], [w * 0.68, 440]]) { g.beginPath(); g.arc(x, y, 38, 0, 6.3); g.stroke(); g.beginPath(); g.arc(x, y, 12, 0, 6.3); g.stroke(); }
}
const neon = (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = '700 92px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff3b6b'; g.shadowBlur = 26;
  g.strokeStyle = '#ff6b8f'; g.lineWidth = 9; g.strokeText('OPEN', w / 2, h / 2);
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,220,230,0.9)'; g.fillText('OPEN', w / 2, h / 2);
  g.strokeStyle = '#3ad0ff'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
};

export function installBagelShop(G) {
  const E = G.schemes;
  const st = () => G.state;
  const flags = () => G.state.flags;
  const group = new THREE.Group();
  group.name = 'bagel-shop';
  G.items.group.add(group);
  const C = G.collision;

  // ------------------------------------------------------------ the shop (render + colliders)
  const M = (o) => ruleMaterial(o);
  const black = M({ color: 0x1e1c1b, roughness: 0.6 }), trim = M({ color: 0x3a3633, roughness: 0.5, metalness: 0.2 });
  const steel = M({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.7 }), iron = M({ color: 0x2c3229, roughness: 0.7, metalness: 0.3 });
  const glass = M({ color: 0x24303a, roughness: 0.15, metalness: 0.3 }), wax = M({ color: 0xf2ecd8, roughness: 0.9 });
  const box = (mat, x, y, z, w, h, d, { cast = true } = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = cast; m.receiveShadow = true; group.add(m); return m; };
  const solid = (x0, x1, y0, y1, z0, z1, tag = 'shop') => C.addBox({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y0, h: y1 - y0, w: x1 - x0, d: z1 - z0, tag });
  const signMat = (tex, k = 0.35) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: k });
  {
    // the frame round the whole shopfront, just in front of the building face
    box(black, SHOP.x, 0, F - 0.04, SHOP.w, FASCIA.y1, 0.06, { cast: false });
    // the walk-up window: the counter block (solid), the shelf in front of it (a perch), the side walls, the pane
    const cz = (BOX.z0 + F) / 2, cd = F - BOX.z0;
    box(black, (BOX.x0 + BOX.x1) / 2, 0, cz, BOX.x1 - BOX.x0, SHELF.y - 0.05, cd);
    solid(BOX.x0, BOX.x1, 0, SHELF.y - 0.05, BOX.z0, F);
    box(steel, (SHELF.x0 + SHELF.x1) / 2, SHELF.y - 0.06, (SHELF.z0 + SHELF.z1) / 2, SHELF.x1 - SHELF.x0 + 0.1, 0.06, SHELF.z1 - SHELF.z0);
    solid(SHELF.x0 - 0.05, SHELF.x1 + 0.05, SHELF.y - 0.06, SHELF.y, SHELF.z0, SHELF.z1);
    C.addPerchEdge({ a: { x: SHELF.x0 + 0.2, y: SHELF.y, z: SHELF.z0 + 0.1 }, b: { x: SHELF.x1 - 0.2, y: SHELF.y, z: SHELF.z0 + 0.1 }, id: 'bagel-shelf', kind: 'ledge', out: OUT });
    for (const x of [BOX.x0, BOX.x1]) { box(black, x, SHELF.y, cz, 0.12, FASCIA.y0 - SHELF.y, cd); solid(x - 0.06, x + 0.06, SHELF.y, FASCIA.y0, BOX.z0, F); }
    solid(BOX.x0, BOX.x1, SHELF.y, FASCIA.y0, BOX.z0, BOX.z0 + 0.1, 'shop-pane');   // invisible: Gus can't fly in through Manny
    box(trim, (BOX.x0 + BOX.x1) / 2, SHELF.y - 0.02, BOX.z0 + 0.02, BOX.x1 - BOX.x0, 0.04, 0.04);
    // the back wall (the generated, textless interior), lit like the other always-lit windows
    const back = new THREE.Mesh(new THREE.PlaneGeometry(BOX.x1 - BOX.x0 - 0.12, FASCIA.y0 - SHELF.y), new THREE.MeshStandardMaterial({ roughness: 0.9, color: 0xffffff, emissive: 0xffe2b8, emissiveIntensity: 0.55 }));
    back.position.set((BOX.x0 + BOX.x1) / 2, (SHELF.y + FASCIA.y0) / 2, F - 0.08); back.rotation.y = Math.PI; group.add(back);
    new THREE.TextureLoader().load('assets/textures/bagel-shop-back.webp', (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1;
      back.material.map = t; back.material.emissiveMap = t; back.material.emissive.set(0xffffff); back.material.emissiveIntensity = 0.45; back.material.needsUpdate = true;
    });
    // the ceiling of the window (the fascia's underside, warm-lit) and a strip light
    box(M({ color: 0xf6e6c6, emissive: 0xffe0a0, emissiveIntensity: 0.6 }), (BOX.x0 + BOX.x1) / 2, FASCIA.y0 - 0.06, F - 0.4, BOX.x1 - BOX.x0 - 0.4, 0.04, 0.12, { cast: false });
    // the fascia: a black band over the window and the door (a perch along its top front edge)
    box(black, SHOP.x, FASCIA.y0, (FASCIA.z0 + F) / 2, SHOP.w, FASCIA.y1 - FASCIA.y0, F - FASCIA.z0);
    solid(X0, X1, FASCIA.y0, FASCIA.y1, FASCIA.z0, F);
    C.addPerchEdge({ a: { x: X0 + 0.3, y: FASCIA.y1, z: FASCIA.z0 + 0.15 }, b: { x: X1 - 0.3, y: FASCIA.y1, z: FASCIA.z0 + 0.15 }, id: 'bagel-fascia', kind: 'awning', out: OUT });
    const ft = canvasTex(2048, 256, fascia);
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.w - 0.1, FASCIA.y1 - FASCIA.y0 - 0.06), signMat(ft));
    fp.position.set(SHOP.x, (FASCIA.y0 + FASCIA.y1) / 2, FASCIA.z0 - 0.006); fp.rotation.y = Math.PI; group.add(fp);
    // the glass door beside the window
    const dx = (DOOR.x0 + DOOR.x1) / 2;
    box(glass, dx, KERB, F - 0.1, DOOR.x1 - DOOR.x0, 2.25, 0.05, { cast: false });
    for (const x of [DOOR.x0, DOOR.x1]) box(trim, x, KERB, F - 0.12, 0.06, 2.3, 0.08);
    box(trim, dx, KERB + 2.25, F - 0.12, DOOR.x1 - DOOR.x0 + 0.06, 0.06, 0.08);
    box(steel, DOOR.x0 + 0.12, 1.0, F - 0.16, 0.04, 0.35, 0.04);
    // the neon OPEN, always on (it glows at Dusk and Night: "Bagels don't sleep")
    const nt = canvasTex(256, 128, neon);
    const np = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false, toneMapped: false }));
    np.position.set(BOX.x1 - 0.55, FASCIA.y0 - 0.38, BOX.z0 + 0.16); np.rotation.y = Math.PI; group.add(np);
    // the bell on the shelf (chrome), and the wax paper the orders sit on
    const bell = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel); dome.position.y = 0.012; bell.add(dome);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.014, 16), black); base.position.y = 0.007; bell.add(base);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6), steel); knob.position.y = 0.065; bell.add(knob);
    bell.position.set(BELL.x, BELL.y, BELL.z); bell.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(bell);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.2).rotateX(-Math.PI / 2), wax);
    paper.position.set(COUNTER.x, COUNTER.y + 0.002, COUNTER.z); paper.rotation.y = 0.2; group.add(paper);
    // the A-frame board on the pavement, facing the park (a small collider, a perch on its top edge)
    const at = canvasTex(512, 512, chalk);
    const board = signMat(at, 0.25);
    const ay = KERB, ah = 0.95;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, ah, 0.03), s < 0 ? [trim, trim, trim, trim, trim, board] : trim);
      p.position.set(AFRAME.x, ay + ah / 2 - 0.02, AFRAME.z + s * 0.14); p.rotation.x = s * 0.28; p.castShadow = true; group.add(p);
    }
    solid(AFRAME.x - 0.32, AFRAME.x + 0.32, ay, ay + ah - 0.05, AFRAME.z - 0.25, AFRAME.z + 0.25, 'aframe');
    C.addPerchEdge({ a: { x: AFRAME.x - 0.25, y: ay + ah - 0.05, z: AFRAME.z }, b: { x: AFRAME.x + 0.25, y: ay + ah - 0.05, z: AFRAME.z }, id: 'bagel-aframe', kind: 'edge', out: OUT });
    // the blade sign: 0.9 × 6 m, 4 to 10 m up, on two iron brackets 1.6 m out, at the west end (the east end if a fire
    // escape comes within 2.6 m: it doesn't, by the city's fixed lot layout, but the layout isn't re-rolled to make sure)
    const fireEscapeNear = (x) => {
      const c = C.cell;
      for (let ix = Math.floor((x - 3) / c); ix <= Math.floor((x + 3) / c); ix++) for (let iz = Math.floor((F - 3) / c); iz <= Math.floor((F + 2) / c); iz++) {
        for (const it of C.grid.get(ix * 100003 + iz) || []) if (it.t === 'edge' && it.kind === 'fire-escape' && Math.max(it.a.x, it.b.x) > x - 2.6 && Math.min(it.a.x, it.b.x) < x + 2.6) return true;
      }
      return false;
    };
    const sx = fireEscapeNear(X0 + 0.2) ? X1 - 0.2 : X0 + 0.2;
    const sz0 = F - 1.6, sz1 = F - 0.7, sy0 = 4, sy1 = 10;
    box(black, sx, sy0, (sz0 + sz1) / 2, 0.14, sy1 - sy0, sz1 - sz0);
    solid(sx - 0.07, sx + 0.07, sy0, sy1, sz0, sz1, 'sign');
    C.addPerchEdge({ a: { x: sx, y: sy1, z: sz0 + 0.1 }, b: { x: sx, y: sy1, z: sz1 - 0.1 }, id: 'bagel-blade', kind: 'sign', out: OUT });
    for (const y of [sy0 + 0.35, sy1 - 0.35]) box(iron, sx, y, F - 0.82, 0.06, 0.06, 1.6);
    const bt = canvasTex(512, 1536, blade);
    for (const s of [-1, 1]) {
      const bp = new THREE.Mesh(new THREE.PlaneGeometry(sz1 - sz0 - 0.04, sy1 - sy0 - 0.04), signMat(bt));
      bp.position.set(sx + s * 0.075, (sy0 + sy1) / 2, (sz0 + sz1) / 2); bp.rotation.y = s * Math.PI / 2; group.add(bp);
    }
    // the lettering waits for its fonts (Fredoka is loaded before the world is; Nunito may not be)
    document.fonts?.load('700 40px Nunito').then(() => at.userData.redraw()).catch(() => {});
    document.fonts?.load('700 40px Fredoka').then(() => { ft.userData.redraw(); bt.userData.redraw(); nt.userData.redraw(); }).catch(() => {});
  }

  // ------------------------------------------------------------ Manny (his own clone; visual only)
  const MN = { c: null, yaw: FACE_PARK, want: FACE_PARK, cur: null };
  const play = (name, fade = 0.3) => {
    const c = MN.c, a = c?.actions[name] || c?.actions.idle;
    if (!a || MN.cur === a) return;
    a.reset().play();
    if (MN.cur) a.crossFadeFrom(MN.cur, fade, false);
    MN.cur = a;
  };
  (async () => {
    let g = G.humans?.gltf?.['human-chess-player'];
    if (!g) { try { g = await new GLTFLoader().loadAsync('assets/models/human-chess-player.glb'); } catch { return; } }
    const c = makeHumanClone(g, 'human-chess-player');
    const acc = makeAccessories();
    const white = ruleMaterial({ color: 0xefe9dc }), whiteDS = ruleMaterial({ color: 0xefe9dc, side: THREE.DoubleSide });
    // a long white apron, chest to knee, that follows his front (strips at the measured body surface: a flat board stood
    // out in front of his cardigan); the humans' 'apron' is a waist one
    acc['apron-long'] = { bone: 'Spine02', make: (F2) => {
      const W = F2.waist, Ch = F2.chest;
      const top = Ch.y + 0.02, bot = W.y - 0.62, N = 24;
      const g2 = new THREE.PlaneGeometry(1, 1, 2, N), p = g2.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, y = bot + (top - bot) * v;
        const half = y > W.y + 0.04 ? 0.12 : y > W.y - 0.04 ? 0.16 : 0.2;   // the bib, then the skirt
        const z = Math.max(...[-0.06, 0, 0.06].map((x) => W.surf(x, y))) + 0.016;
        p.setXYZ(i, (u - 0.5) * 2 * half, y, z);
      }
      g2.computeVertexNormals();
      const m = new THREE.Mesh(g2, whiteDS); m.castShadow = true; return m;
    } };
    // a paper deli cap (a white wedge, ridge front to back) on top of his flat cap
    acc['deli-cap'] = { bone: 'Head', make: (F2) => {
      const H = F2.head, r = H.ring(H.band);
      const g2 = new THREE.CylinderGeometry(r.rx * 0.9, r.rx * 0.9, r.rz * 2.1, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI);
      g2.scale(1.15, 0.42, 1);
      const m = new THREE.Mesh(g2, white); m.position.set(r.cx, H.top - 0.012, r.cz); m.castShadow = true; return m;
    } };
    dressClone(c, ['deli-cap', 'apron-long'], acc);
    c.holder.position.set(MANNY_AT.x, MANNY_AT.y, MANNY_AT.z);
    c.holder.rotation.y = MN.yaw;
    c.holder.visible = true;
    group.add(c.holder);
    MN.c = c;
    play('idle', 0);
  })();
  const mannyAt = () => ({ x: MANNY_AT.x, y: MANNY_AT.y + 2.05, z: MANNY_AT.z });
  /** Manny says a line (a bubble and his voice). */
  const manny = (key, ttl = 3.2) => {
    const l = MANNY[key];
    G.bubbles.add(l.text, { at: mannyAt, ttl, range: 40 });
    G.audio.voice(l.voice, { at: mannyAt(), range: 40 });
  };

  // ------------------------------------------------------------ orders
  const order = () => G.items.world.find((w) => w.counter);
  /** a bagel lying on the shelf: an order, or the quest bagel the item keeper put back (Manny and the bell step aside for it) */
  const onShelf = () => G.items.world.find((w) => w.counter || (isBagel(w.id) && w.y > SHELF.y - 0.1 && w.x > SHELF.x0 - 0.2 && w.x < SHELF.x1 + 0.2 && w.z > SHELF.z0 - 0.3 && w.z < SHELF.z1 + 0.1));
  const questOpen = () => E.isOpen(ID);
  let cooking = null;   // { it, t } while Manny's at the oven (runtime only: a load shows the order at once)
  const ordered = new Set();   // uids Manny put on the shelf (the keeper's put-backs are the others)
  // (an order Manny is still making is hidden, and a hidden item has no prompt and can't be pecked: items.js)
  // #44 review: Manny never takes a carried bagel back (a just-bought bribe would be thrown away); a bagel Gus puts down by
  // the counter can't take the Peck from Manny or the bell (priority 6), and picking an order up swaps as anywhere else
  G.bus.on('pickup', (t, e) => { if (isBagel(e.item)) ordered.delete(e.uid); });

  const mannyLine = () => (!flags()['bagel.met'] ? 'welcome' : st().phase === 'night' ? 'night' : 'hello');
  /** Peck Manny or the bell. */
  const counter = (how) => {
    if (G.dialogue.open || G.menus.open) return;
    if (how === 'bell') G.audio.play('bell-ding', { at: BELL, vol: 0.9 });
    if (onShelf()) { manny('waiting', 2.6); return; }
    const c = st().carried;
    let delay = 0;
    if (c && c.id === QUEST_BAGEL && questOpen()) { manny('keep', 3); delay = 1.2; }
    const open = () => {
      const k = mannyLine();
      flags()['bagel.met'] = true;
      G.audio.voice(MANNY[k].voice, { at: mannyAt(), range: 40 });
      G.openMenu('bagels', { line: MANNY[k].text });
    };
    if (delay) G.later(delay, () => { if (!G.dialogue.open && !G.menus.open && !order()) open(); }); else open();
  };
  G.interact.register({
    id: 'bagel:manny', kind: 'shop', x: MANNY_AT.x, y: MANNY_AT.y + 1.05, z: MANNY_AT.z, r: 1.7, dy: 1.8, priority: 6,
    label: () => (onShelf() ? null : 'Talk to Manny'), act: () => counter('manny'),
  });
  // (priority 6: a bagel Gus put down by the counter never takes the Peck from Manny or the bell; while an order waits on the
  // shelf they step aside, so the Peck picks the order up)
  G.interact.register({
    id: 'bagel:bell', kind: 'bell', x: BELL.x, y: BELL.y, z: BELL.z, r: 1.4, dy: 1.6, priority: 6,
    label: () => (onShelf() ? null : 'Ring the bell'), act: () => counter('bell'),
  });

  /** The order button: { ok, free, price, why } for this pick. */
  const canOrder = (schmear) => {
    const price = priceOf(schmear), crumbs = st().crumbs;
    if (crumbs >= price) return { ok: true, free: false, price };
    if (!st().phaseUsed?.['bagel.free']) return { ok: true, free: true, price };
    return { ok: false, price, why: `${price} crumbs. You have ${crumbs}. Signs leave crumbs.` };
  };
  /** Order a bagel: pay, close the menu, the bagel is on the shelf (hidden) at once; it shows 1.5 s later. */
  const placeOrder = (base, schmear) => {
    const can = canOrder(schmear);
    if (!can.ok) return false;
    const s = st();
    G.menus.closeAll();   // (first: the park's sounds, Manny's voice too, are paused while a menu is open)
    if (can.free) { (s.phaseUsed ||= {})['bagel.free'] = true; manny('free', 3.4); }
    else s.crumbs -= can.price;
    G.audio.play('trade-ka-ching', { ui: true });
    const id = bagelId(base, schmear);
    const it = G.items.spawn(id, COUNTER.x, COUNTER.z, { y: COUNTER.y + 0.004, extra: { counter: true } });
    if (it.mesh) { it.mesh.visible = false; it.mesh.rotation.y = 0.4; }
    ordered.add(it.uid);
    cooking = { it, t: 0, plain: id === 'bagel' };
    MN.want = FACE_OVEN;   // to the oven
    G.audio.play('griddle-sizzle', { at: MANNY_AT, vol: 0.35 });
    G.bus.emit('bagelOrdered', { item: id, free: can.free });
    G.autosave('bagel');
    return true;
  };

  // ------------------------------------------------------------ the menu ('bagels')
  {
    const pic = (src, alt = '') => `<img src="${src}" alt="${alt}" style="width:34px;height:34px;object-fit:contain;flex:none">`;
    const noneSvg = '<svg viewBox="0 0 34 34" style="width:34px;height:34px;flex:none" aria-hidden="true"><circle cx="17" cy="17" r="12" fill="none" stroke="#8a7a6a" stroke-width="2.5" stroke-dasharray="4 3"/></svg>';
    const b = (row, col, id, img, name, sub, cls = '') => `<button type="button" class="btn small ${cls}" data-row="${row}" data-col="${col}" data-id="${id}">${img}<span><span style="display:block">${name}</span><small style="display:block;opacity:.75">${sub}</small></span></button>`;
    const el = overlay('bagels', `
      <div class="bh"><img class="mp" src="assets/portraits/manny.webp" alt=""><div><h2>SUPER JUMBO BAGELS</h2><p class="line"></p></div><p class="crumbs"></p></div>
      <p class="riddle"></p>
      <div class="r0">${b(0, 0, 'to-go', pic('assets/ui/bagels/bagel-plain.webp'), 'Plain bagel to go: 2 crumbs', 'For making friends. Critters go nuts for these: drop one near some.')}</div>
      <div class="lbl">Bagel</div><div class="rw r1">${BASES.map((x, i) => b(1, i, 'base:' + x.id, pic(`assets/ui/bagels/bagel-${x.id}.webp`), x.name, x.sub)).join('')}</div>
      <div class="lbl">Schmear</div><div class="rw r2">${SCHMEARS.map((x, i) => b(2, i, 'schmear:' + x.id, x.id === 'none' ? noneSvg : pic(`assets/ui/bagels/schmear-${x.id}.webp`), x.name, x.sub)).join('')}</div>
      <div class="sum"><span class="what"></span><button type="button" class="btn small primary" data-row="3" data-col="0" data-id="order">Order</button><button type="button" class="btn small" data-row="3" data-col="1" data-id="back">Back</button></div>
      <div class="hints" data-auto='[["uiOk","Pick"],["uiBack","Back"]]'></div>`, 'bagel-menu');
    const style = document.createElement('style');
    style.textContent = `
#bagels .card { max-width: min(860px, 96vw); max-height: 96vh; overflow: auto; padding: 14px 16px; }
#bagels .bh { display: flex; align-items: center; gap: 12px; }
#bagels .bh h2 { margin: 0; letter-spacing: .04em; }
#bagels .bh .line { margin: 2px 0 0; font-style: italic; }
#bagels .bh .crumbs { margin: 0 0 0 auto; font-weight: 700; white-space: nowrap; }
#bagels .mp { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex: none; border: 3px solid #1e1c1b; }
#bagels .riddle { margin: 6px 0 0; padding: 6px 10px; background: #fff4d6; border-radius: 8px; font-size: 15px; }
#bagels .riddle:empty { display: none; }
#bagels .lbl { font-weight: 700; margin: 8px 0 4px; font-size: 14px; opacity: .8; }
#bagels .r0 { margin-top: 8px; }
#bagels .rw { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
#bagels .r1 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
#bagels .btn.small { padding: 5px 8px; gap: 6px; font-size: 14px; }
#bagels .btn small { font-size: 11.5px; line-height: 1.15; }
#bagels .btn.picked { background: var(--orange); color: #fff; }
#bagels .sum { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
#bagels .sum .what { margin-right: auto; font-weight: 700; }
#bagels .sum .why { font-weight: 400; opacity: .8; font-size: 13px; display: block; }
.lane b.new, .m b.new { color: #e8642a; font-size: .85em; }
@media (max-height: 460px) {
  #bagels .card { padding: 8px 12px; }
  #bagels .mp { width: 40px; height: 40px; }
  #bagels .bh h2 { font-size: 20px; }
  #bagels .bh .line { font-size: 13px; }
  #bagels .lbl { margin: 4px 0 2px; font-size: 12px; }
  #bagels .riddle { font-size: 13px; padding: 4px 8px; margin-top: 4px; }
  #bagels .btn.small { padding: 3px 6px; font-size: 13px; }
  #bagels .btn small { font-size: 10.5px; }
  #bagels .btn img, #bagels .btn svg { width: 26px !important; height: 26px !important; }
  #bagels .sum { margin-top: 6px; }
}`;
    document.head.appendChild(style);
    const $ = (q) => el.querySelector(q);
    const sel = { base: null, schmear: null };
    const btnOf = (id) => el.querySelector(`[data-id="${id}"]`);
    const refresh = () => {
      $('.crumbs').textContent = `Your crumbs: ${st().crumbs}`;
      for (const x of el.querySelectorAll('[data-id^="base:"]')) { const on = x.dataset.id === 'base:' + sel.base; x.classList.toggle('picked', on); x.setAttribute('aria-pressed', on); }
      for (const x of el.querySelectorAll('[data-id^="schmear:"]')) { const on = x.dataset.id === 'schmear:' + sel.schmear; x.classList.toggle('picked', on); x.setAttribute('aria-pressed', on); }
      const ob = btnOf('order'), what = $('.what');
      const toGo = canOrder('none');
      const tg = btnOf('to-go');
      tg.classList.toggle('dis', !toGo.ok);
      tg.querySelector('small').textContent = toGo.ok ? (toGo.free ? 'On the house (once a phase). For making friends: drop one near some critters.' : 'For making friends. Critters go nuts for these: drop one near some.') : toGo.why;
      if (!sel.base || !sel.schmear) { what.innerHTML = 'Pick a bagel and a schmear.'; ob.classList.add('dis'); ob.querySelector('span') ? null : null; ob.textContent = 'Order'; return; }
      const bn = BASES.find((x) => x.id === sel.base).name, sn = SCHMEARS.find((x) => x.id === sel.schmear).name;
      const can = canOrder(sel.schmear);
      what.innerHTML = `${esc(bn)}${sel.schmear === 'none' ? ', no schmear' : ' + ' + esc(sn)}: ${can.price} crumbs${can.ok ? '' : `<span class="why">${esc(can.why)}</span>`}`;
      ob.textContent = can.ok && can.free ? 'On the house (once a phase)' : 'Order';
      ob.classList.toggle('dis', !can.ok);
    };
    const focus = (b2) => { if (!b2) return; b2.focus({ preventScroll: true }); b2.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); };
    const act = (b2) => {
      if (!b2 || b2.classList.contains('dis')) { G.audio.synth('uiBack'); return; }
      const id = b2.dataset.id;
      if (id === 'back') { s.back(); return; }
      if (id === 'to-go') { placeOrder('plain', 'none'); return; }
      if (id === 'order') { if (sel.base && sel.schmear) placeOrder(sel.base, sel.schmear); return; }
      const [k, v] = id.split(':');
      sel[k] = v;
      refresh();
      // a pick moves on: a bagel to the schmears, a schmear to Order (few presses on a pad)
      focus(k === 'base' ? (sel.schmear ? btnOf('order') : el.querySelector('[data-row="2"][data-col="0"]')) : btnOf('order'));
    };
    const s = {
      id: 'bagels', el,
      open(arg = {}) {
        sel.base = null; sel.schmear = null;
        $('.line').textContent = arg.line ? `Manny: "${arg.line}"` : '';
        $('.riddle').textContent = E.isOpen(ID) && E.stepIndex(ID) === 1 ? RIDDLE : '';
        refresh();
      },
      preferredFocus() { return el.querySelector('[data-row="1"][data-col="0"]'); },
      focusables() { return [...el.querySelectorAll('[data-row]')]; },
      back() { G.menus.closeAll(); G.resume(); },
      // the screen owns its arrows: by row and column, never by on-screen distance (the same presses land on the same
      // button at every window size: the autopilot's bagelOrder step relies on it)
      handleInput(inp) {
        const cur = document.activeElement?.closest?.('[data-row]');
        const rows = [0, 1, 2, 3].map((r) => [...el.querySelectorAll(`[data-row="${r}"]`)]);
        const move = (dr, dc) => {
          if (!cur || !el.contains(cur)) { focus(s.preferredFocus()); return; }
          let r = +cur.dataset.row, c = +cur.dataset.col;
          if (dr) { r = Math.max(0, Math.min(3, r + dr)); c = Math.min(c, rows[r].length - 1); } else c = Math.max(0, Math.min(rows[r].length - 1, c + dc));
          const t = rows[r][c];
          if (t && t !== cur) { focus(t); G.audio.synth('uiMove'); }
        };
        if (inp.pressed('uiUp')) move(-1, 0);
        else if (inp.pressed('uiDown')) move(1, 0);
        else if (inp.pressed('uiLeft')) move(0, -1);
        else if (inp.pressed('uiRight')) move(0, 1);
        else if (inp.pressed('uiOk')) { if (cur && el.contains(cur)) { G.audio.synth('uiSelect'); act(cur); } }
        else if (inp.pressed('uiBack')) { G.audio.synth('uiBack'); s.back(); }
        return true;
      },
    };
    el.addEventListener('click', (e) => { const b2 = e.target.closest('[data-row]'); if (b2) act(b2); });
    el.addEventListener('mouseover', (e) => { const b2 = e.target.closest('[data-row]'); if (b2 && el.contains(b2) && document.activeElement !== b2) b2.focus({ preventScroll: true }); });
    G.menus.add(s);
  }

  // ------------------------------------------------------------ "New in the park" (a save from before the shop)
  {
    const el = overlay('news', `<h2>New in the park</h2><p>Super Jumbo Bagels on 110th, across from the North Woods gate. Open 24 hours.</p><p>There's a new postcard and a new scarf to find, and the critters have opinions about bagels.</p><div class="row" style="margin-top:10px"><button type="button" class="btn primary" data-act="ok"><span>OK</span></button></div><div class="hints" data-auto='[["uiOk","OK"],["uiBack","Close"]]'></div>`);
    const s = { id: 'news', el, back() { G.menus.closeAll(); G.resume(); } };
    el.addEventListener('click', (e) => { if (e.target.closest('[data-act="ok"]')) s.back(); });
    G.menus.add(s);
    // #44 review: the flags are set only once the card is actually up (a scene or menu at Continue: it tries again)
    let tries = 0;
    const show = () => {
      if (flags()['news.bagels'] || G.screen !== 'play') return;
      if (G.menus.open || G.dialogue.open || G.cutscene?.running || G.midScene?.()) { if (++tries < 600) G.later(1, show); return; }
      G.openMenu('news');
      if (!G.menus.is('news')) { if (++tries < 600) G.later(1, show); return; }
      flags()['news.bagels'] = true;
      flags()['news.bagels.old'] = true;
    };
    G.newsCheck = () => { if (flags()['news.bagels']) return; tries = 0; G.later(1.2, show); };
  }

  // ------------------------------------------------------------ Mama Mask: the riddle, her answers, the payoff
  const mm = (k) => ({ who: 'mamamask', text: MAMA[k].text, voice: MAMA[k].voice });
  const faceGus = (id) => { const c = G.chars.find(id); if (c) c.yaw = Math.atan2(G.gus.position.x - c.x, G.gus.position.z - c.z); return c; };
  E.registerScript('jumbo.order', (ctx, done) => {
    const c = faceGus('mamamask');
    if (c) G.chars.animate(c, 'cheer', 1.2);
    G.say([mm('riddle1'), mm('riddle2'), mm('riddle3')], () => {
      G.toast('Super Jumbo Bagels is on 110th Street, across from the North Woods gate. It\'s on your map.', { seconds: 5 });
      done();
    });
  });
  G.jumboAnswer = (id) => {
    if (!isBagel(id)) return null;
    const open = questOpen(), idx = E.stepIndex(ID);
    if (open && idx === 0) return null;   // the talk wins: the riddle plays (she doesn't tell off a bagel she hasn't asked for)
    if (id === QUEST_BAGEL && open && idx === 2) return null;   // the step's give (#44 review: ahead of the union line too)
    if (E.isOpen('part-talons') && E.stepIndex('part-talons') === 1 && !flags()['union.paid']) return [MAMA.union];
    if (id === QUEST_BAGEL) {
      if (open && idx === 2) return null;   // the step's give
      return [E.done(ID) ? MAMA.another : MAMA.holdThat];
    }
    if (!open || (idx !== 1 && idx !== 2)) return [MAMA.notMine];
    // a wrong bagel on step 2 or 3: which half is wrong (Gus keeps it). (No 'fail' here: the prompt asks this every frame;
    // the 'offered' listener below counts the real offer.)
    const [b, s] = bagelParts(id);
    if (b === 'plain' && s === 'none') return [MAMA.plainPlain, MAMA.socket];
    const baseLine = { poppy: MAMA.poppy, everything: MAMA.everything, plain: MAMA.bald }[b];
    const smLine = { scallion: MAMA.scallion, strawberry: MAMA.strawberry, plain: MAMA.plainSchmear, none: MAMA.naked }[s];
    if (b === 'sesame') return [MAMA.seedsRight, smLine, MAMA.socket];
    if (s === 'jalapeno') return [MAMA.fireYes, baseLine, MAMA.socket];
    return [baseLine, MAMA.bothWrong, MAMA.socket];
  };
  G.bus.on('offered', (t, e) => { if (e.to === 'mamamask' && isBagel(e.item) && e.item !== QUEST_BAGEL && questOpen() && E.stepIndex(ID) >= 1) G.bus.emit('fail', { kind: 'wrong-bagel', item: e.item }); });   // (the nudge comes sooner)
  // her voice everywhere she speaks: a greeting the first time she's talked to in a session (not over the riddle)
  let greeted = false;
  G.bus.on('talk', (t, e) => {
    if (e.who !== 'mamamask' || greeted || (questOpen() && E.stepIndex(ID) === 0)) return;
    greeted = true;
    G.later(0.05, () => { if (G.dialogue.open) G.audio.voice(MAMA.greeting.voice); });
  });

  E.registerScript('jumbo.done', (ctx, done) => {
    const c = faceGus('mamamask');
    let crew = [];
    const ears = () => (c ? { x: c.x, y: c.y + 0.45, z: c.z } : G.gus.position);
    const g = G.gus.position;
    // a side-on two-shot of Gus and Mama Mask, a little above them (it plays at Night under trees: close, so it reads)
    const cx = c ? (c.x + g.x) / 2 : g.x, cz = c ? (c.z + g.z) / 2 : g.z;
    const dx = c ? c.x - g.x : Math.sin(G.gus.yaw), dz = c ? c.z - g.z : Math.cos(G.gus.yaw), dl = Math.hypot(dx, dz) || 1;
    const px = dz / dl, pz = -dx / dl, cy = (c ? Math.max(c.y, g.y) : g.y);
    G.cutscene.run('jumbo-done', [
      { do: () => { if (c) G.chars.animate(c, 'sniff', 1.4); } },
      { cam: { pos: [cx + px * 2.3, cy + 0.9, cz + pz * 2.3], look: [cx, cy + 0.3, cz], secs: 1.0 } },
      { say: [mm('done1')] },
      { do: () => {
        G.audio.play('bagel-munch', { at: ears(), vol: 1 });
        G.later(0.5, () => { G.audio.synth('kettle'); for (const s of [-1, 1]) G.particles.burst('steam', ears().x + s * 0.12, ears().y, ears().z, 14, { spread: 0.06 }); });
        if (c) G.chars.animate(c, 'cheer', 2);
        crew = gather(G, ['rigby', 'socket', 'ringo'], { kind: 'hop', d: 1.7 });
      } },
      { wait: 1.2 },
      { do: () => { cheer(G, crew, 1.4); G.collect.award('jumbo-order', { crumbs: 0 }); } },
      { say: [mm('done2')] },
      { say: [mm('done3')] },
      { do: () => {
        const s = st();
        if (!s.scarves.includes('everything-bagel')) s.scarves.push('everything-bagel');
        G.audio.play('scheme-step-chime');
        G.toast('The Everything Bagel scarf is yours! Wear it from any Nest.', { kind: 'stamp', seconds: 5 });
      } },
      { follow: true },
      { do: () => { disperse(G, crew); done(); } },
    ], null, () => { disperse(G, crew); ctx.abort?.(); });
  });

  G.bagelShop = { manny: MN, placeOrder, counter, order };   // (debug and checks: src/debug/bagel-checks.js)

  // ------------------------------------------------------------ the update
  const said = new Set(), atLoad = new Set();   // keeper put-backs Manny has spoken for; quest bagels already lying about at a load
  G.mods.push({
    update(dt) {
      // the order: Manny at the oven, then it shows on the shelf
      if (cooking) {
        cooking.t += dt;
        if (!G.items.world.includes(cooking.it)) cooking = null;
        else if (cooking.t >= COOK_SECS) {
          const it = cooking.it;
          if (it.mesh) it.mesh.visible = true;
          G.audio.play('paper-rustle', { at: COUNTER, vol: 0.7 });
          if (cooking.plain && !flags()['bagel.tipped']) { flags()['bagel.tipped'] = true; manny('tip', 4); }
          else manny(cooking.plain ? 'plain' : (Math.floor(st().time) % 2 ? 'orderUp' : 'hot'), 3);
          cooking = null;
          MN.want = FACE_PARK;
        }
      }
      // the item keeper put the quest bagel back on the shelf: Manny made two
      // (#44 review: only the keeper's own spawn: never placed by Gus, its origin the counter, and not there at the last load)
      const kept = G.items.world.find((w) => w.id === QUEST_BAGEL && !w.counter && !w.placed && !ordered.has(w.uid) && !atLoad.has(w.uid) && w.origin && Math.hypot(w.origin.x - COUNTER.x, w.origin.z - COUNTER.z) < 0.1 && Math.hypot(w.x - COUNTER.x, w.z - COUNTER.z) < 0.6);
      if (kept && !said.has(kept.uid)) {
        said.add(kept.uid);
        const g = G.gus.position;
        if (Math.hypot(g.x - COUNTER.x, g.z - COUNTER.z) < 60) G.later(0.4, () => manny('two', 3.4));
      }
      // Manny: turn to the oven and back; drawn only near
      const c = MN.c;
      if (!c) return;
      const cam = G.dataCam?.position || G.gus.position;
      const near = Math.hypot(cam.x - MANNY_AT.x, cam.z - MANNY_AT.z) < 70;
      c.holder.visible = near;
      MN.yaw += Math.atan2(Math.sin(MN.want - MN.yaw), Math.cos(MN.want - MN.yaw)) * Math.min(1, dt * 5);
      c.holder.rotation.y = MN.yaw;
      if (near) c.mixer.update(dt);
    },
    restore() { cooking = null; MN.want = FACE_PARK; ordered.clear(); for (const w of G.items.world) if (w.counter) { ordered.add(w.uid); if (w.mesh) w.mesh.visible = true; } said.clear(); atLoad.clear(); for (const w of G.items.world) if (w.id === QUEST_BAGEL) atLoad.add(w.uid); },
  });
}
