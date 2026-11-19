// The Lost & Found: the crows' market at the Exchange oak (Thread 5).
//   the Wanted board  drawings, no text: one tile for each human who has lost something and is out
//                     this phase (a figure and the item's silhouette), redrawn when the phase changes.
//                     Peck it and Ledger reads it aloud.
//   the stall         what the crows found: Strix's spectacles (10 crumbs) and, at Afternoon, a spare
//                     shiny (15), so you're never stuck for one
//   Ledger's book     every deal is written in it ("Deals 0/6": the trades and the spectacles)
// The trades themselves are an Ask of the crows beside the human (clues.js, layout.js TRADES).

import * as THREE from 'three';
import { MARKET, TRADES } from '../world/layout.js';
import { phaseList } from '../data/crews.js';
import { PEOPLE } from '../data/people.js';
import { ruleMaterial } from '../gfx/load-model.js';

const WHO = { selfie: 'the selfie tourist at the Plaza fountain', artist: 'the sidewalk artist on the Mall', jogger: 'the Reservoir jogger', rckid: 'the kid at Conservatory Water', stagehand: 'the Delacorte stagehand', foreman: 'the foreman at Fifth and 76th' };
const WHAT = { sunglasses: 'sunglasses', pen: 'a paint pen', headlamp: 'a headlamp', remote: 'an RC remote', wrench: 'a wrench', cone: 'a traffic cone' };

export class Market {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'market';
    this.key = '';
  }
  get st() { return this.G.state; }

  build() {
    const G = this.G, B = MARKET.board;
    // the board: a plank on two posts under the oak
    const y = G.surfaceY(B.x, B.z, 30);
    const g = new THREE.Group();
    g.position.set(B.x, y, B.z); g.rotation.y = B.yaw;
    const wood = ruleMaterial({ color: 0x6b4a2a });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, B.y + B.h, 6).translate(0, (B.y + B.h) / 2, 0), wood); p.position.x = sx * (B.w / 2 - 0.05); g.add(p); }
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512; this.canvas.height = 352;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.wrapS = THREE.RepeatWrapping; this.tex.repeat.x = -1; this.tex.offset.x = 1;   // the world is mirrored
    // perf pass: a plain wood board and the painted front as its own plane (the 6-material box was 6 draw calls)
    const face = new THREE.Mesh(new THREE.BoxGeometry(B.w, B.h, 0.05).translate(0, B.y + B.h / 2, 0), wood);
    face.castShadow = true;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h).translate(0, B.y + B.h / 2, 0.0255), ruleMaterial({ map: this.tex }));
    g.add(face, front);
    this.group.add(g);
    G.collision.addBox({ x: B.x, z: B.z, y0: y, h: B.y + B.h, w: B.w, d: 0.2, yaw: B.yaw, tag: 'board', walkable: false });
    G.interact.register({ id: 'wanted-board', kind: 'board', x: B.x + Math.sin(B.yaw) * 0.6, y: y + 0.2, z: B.z + Math.cos(B.yaw) * 0.6, r: 1.6, dy: 2.5, priority: 2,
      label: () => 'Look at the Wanted board', act: () => this.#readBoard() });
    // the stall: a crate table with what the crows found
    const S = MARKET.stall, sy = G.surfaceY(S.x, S.z, 30);
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.6).translate(0, 0.25, 0), ruleMaterial({ color: 0x9a7448 }));
    tbl.position.set(S.x, sy, S.z); tbl.rotation.y = S.yaw; tbl.castShadow = true;
    this.group.add(tbl);
    G.collision.addBox({ x: S.x, z: S.z, y0: sy, h: 0.5, w: 1.1, d: 0.6, yaw: S.yaw, tag: 'stall' });
    this.stall = MARKET.stallItems.map((s, i) => {
      const m = G.items.makeMesh(s.item);
      const ox = (i - 0.5) * 0.45;
      m.position.set(S.x + Math.cos(S.yaw) * ox, sy + 0.5, S.z - Math.sin(S.yaw) * ox);
      this.group.add(m);
      const it = { def: s, m };
      G.interact.register({ id: 'stall-' + s.id, kind: 'stall', x: m.position.x, y: sy + 0.5, z: m.position.z, r: 1.3, dy: 2, priority: 6,
        label: () => (this.#forSale(s) ? `Buy the ${s.item} (${s.price} crumbs)` : null), act: () => this.#buy(it) });
      return it;
    });
    this.redraw();
  }

  #forSale(s) {
    const st = this.st, a = s.active || {};
    if (a.flags && !a.flags.every((f) => st.flags[f])) return false;
    if (a.not && a.not.some((f) => st.flags[f])) return false;
    if (s.phase && !phaseList(s.phase).includes(st.phase)) return false;
    if (s.perPhase && st.phaseUsed?.['stall.' + s.id]) return false;
    return true;
  }

  #buy(it) {
    const G = this.G, st = this.st, s = it.def;
    if (!this.#forSale(s)) return;
    if (st.crumbs < s.price) { G.say([{ who: 'ledger', text: `${s.price} crumbs, my friend. You have ${st.crumbs}. I can count.` }]); G.hud.flashCrumbs(); return; }
    st.crumbs -= s.price;
    if (s.flag) st.flags[s.flag] = true;
    if (s.perPhase) (st.phaseUsed || (st.phaseUsed = {}))['stall.' + s.id] = true;
    G.audio.play('trade-ka-ching', { at: it.m.position });
    G.items.give(s.item);
    if (s.id === 'spectacles') this.recordDeal({ id: 'spectacles' });
    G.bus.emit('pickup', { item: s.item, bought: true });
    G.bus.emit('buy', { item: s.item });
    G.autosave('buy');
  }

  /** Ledger writes a deal in his book (a trade or the spectacles). */
  recordDeal(def) {
    const G = this.G, st = this.st;
    const book = st.dealBook || (st.dealBook = []);
    if (book.includes(def.id)) return;
    book.push(def.id);
    st.deals = book.length;
    G.audio.synth('meterTick');
    G.later(0.6, () => G.toast(`Ledger writes it in the book. Deals ${Math.min(6, st.deals)}/6`, { kind: 'stamp' }));
  }

  /** Who has lost something and is out this phase. */
  wanted() {
    const ph = this.st.phase;
    return TRADES.filter((t) => !this.st.flags[`trade.${t.id}`] && PEOPLE.some((p) => p.role === t.human && phaseList(p.phases).includes(ph)) && this.G.schemes.isOpen(t.scheme));
  }

  redraw() {
    const list = this.wanted();
    const key = list.map((t) => t.id).join(',');
    if (key === this.key && this.drawn) return;
    this.key = key; this.drawn = true;
    const c = this.canvas, g = c.getContext('2d');
    g.fillStyle = '#c9a46a'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#7a5530'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
    for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(90,60,30,0.12)'; g.fillRect((k * 97) % c.width, (k * 53) % c.height, 30, 2); }
    list.slice(0, 6).forEach((t, i) => {
      const x = 22 + (i % 3) * 160, y = 22 + Math.floor(i / 3) * 160;
      g.save(); g.translate(x, y);
      g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, 148, 146);
      g.fillStyle = '#c4302b'; g.beginPath(); g.arc(74, 6, 7, 0, 7); g.fill();   // the pin
      drawFigure(g, t.human); drawItem(g, t.wanted);
      g.restore();
    });
    this.tex.needsUpdate = true;
  }

  #readBoard() {
    const G = this.G;
    const list = this.wanted();
    if (!list.length) { G.say([{ who: 'ledger', text: 'Nobody out this phase has lost anything we can help with. Check back after a nap.' }]); return; }
    G.say([{ who: 'ledger', text: 'The Wanted board. Out right now:' }, ...list.map((t) => ({ who: 'ledger', text: `${WHO[t.human] || 'Someone'} lost ${WHAT[t.wanted] || 'something'}. Bring the right swap, and get their attention.` }))]);
  }

  setPhase() { this.redraw(); }
  restore() { this.drawn = false; this.redraw(); this.t = 0; for (const s of this.stall) s.m.visible = this.#forSale(s.def); }   // Fixes-3: the stall as the save has it at once
  update(dt) {
    if ((this.t = (this.t || 0) + dt) > 1) { this.t = 0; this.redraw(); for (const s of this.stall) s.m.visible = this.#forSale(s.def); }
  }
  debug() { return { wanted: this.wanted().map((t) => t.id), book: this.st.dealBook || [] }; }
}

// ------------------------------------------------------------------ the board's drawings (no text)
function drawFigure(g, role) {
  g.fillStyle = '#4a4440';
  g.beginPath(); g.arc(44, 46, 13, 0, 7); g.fill();                         // head
  g.fillRect(32, 60, 24, 44); g.fillRect(30, 104, 10, 30); g.fillRect(48, 104, 10, 30);
  g.fillStyle = '#c4302b';
  if (role === 'jogger') { g.fillRect(31, 38, 26, 5); }
  if (role === 'artist') { g.beginPath(); g.ellipse(46, 34, 15, 6, -0.2, 0, 7); g.fill(); }
  if (role === 'foreman') { g.fillStyle = '#f2c230'; g.beginPath(); g.arc(44, 40, 15, Math.PI, 0); g.fill(); }
  if (role === 'stagehand') { g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.arc(44, 46, 15, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  if (role === 'rckid') { g.fillStyle = '#4a4440'; g.clearRect(20, 20, 0, 0); }
  if (role === 'selfie') { g.fillStyle = '#222'; g.fillRect(62, 30, 5, 34); g.fillRect(58, 22, 13, 12); }
}
function drawItem(g, item) {
  g.save(); g.translate(104, 74);
  g.fillStyle = '#26351f'; g.strokeStyle = '#26351f'; g.lineWidth = 5;
  switch (item) {
    case 'sunglasses': g.beginPath(); g.ellipse(-14, 0, 13, 9, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(14, 0, 13, 9, 0, 0, 7); g.fill(); g.fillRect(-2, -3, 4, 3); break;
    case 'pen': g.rotate(-0.7); g.fillRect(-5, -30, 10, 50); g.beginPath(); g.moveTo(-5, 20); g.lineTo(5, 20); g.lineTo(0, 30); g.fill(); break;
    case 'headlamp': g.beginPath(); g.arc(0, 0, 20, Math.PI, 0); g.stroke(); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, -18, 9, 0, 7); g.fill(); break;
    case 'remote': g.fillRect(-14, -22, 28, 44); g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(0, -8, 6, 0, 7); g.fill(); g.fillRect(-2, -34, 4, 12); break;
    case 'wrench': g.rotate(0.7); g.fillRect(-4, -26, 8, 44); g.beginPath(); g.arc(0, -28, 11, 0, 7); g.fill(); g.fillStyle = '#fbf6ea'; g.fillRect(-4, -40, 8, 12); break;
    case 'cone': g.fillStyle = '#e07b39'; g.beginPath(); g.moveTo(0, -30); g.lineTo(18, 24); g.lineTo(-18, 24); g.fill(); g.fillStyle = '#fbf6ea'; g.fillRect(-9, -2, 18, 6); break;
    default: g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
  }
  g.restore();
  // "?" mark of a lost thing, drawn as a little dashed circle
  g.setLineDash([5, 5]); g.strokeStyle = '#c4302b'; g.lineWidth = 3; g.beginPath(); g.arc(104, 74, 34, 0, 7); g.stroke(); g.setLineDash([]);
}
