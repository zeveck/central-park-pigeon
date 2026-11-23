// The Ally wheel: a radial of up to 12 recruited allies' portraits. Hold R
// (or R1), choose with the mouse, the right stick or 1–9 / 0, release to Call
// (or Ask, if they're already here). Touch: tap the portrait to open, tap an
// ally. Greyed allies say why ("Raccoons sleep until Dusk").
// fix-33: it opens with nobody chosen, so letting go without choosing calls no one; ○ / Esc (uiBack, or Land) closes it
// without calling, even after choosing.

import { glyph } from './glyphs.js';
import { CREW, TALENTS } from '../data/crews.js';

/** polish (P2): portrait size and radius for n allies on this screen. Neighbours sit a portrait plus a gap apart (13 allies
 *  at the old fixed 175 px radius overlapped each other's names), and the whole ring fits the window's height, shrinking
 *  the portraits (never the names) on a phone. */
function layout(n) {
  const avail = Math.min(innerHeight - 16, innerWidth - 16);
  for (let P = 72; ; P -= 4) {
    const chord = P + 26;
    const rad = Math.max(130, n > 1 ? chord / (2 * Math.sin(Math.PI / n)) : 130);
    const box = Math.ceil(2 * rad + P + 24);
    if (box <= avail || P <= 44) return { P, rad: box <= avail ? rad : (avail - P - 24) / 2, box: Math.min(box, avail) };
  }
}

export class Wheel {
  constructor(G) {
    this.G = G;
    const el = this.el = document.createElement('div');
    el.id = 'wheel';
    el.innerHTML = `<div class="ring"><div class="center"><div class="nm"></div><div class="why"></div><div class="act"></div></div></div>`;
    document.body.appendChild(el);
    this.ring = el.querySelector('.ring');
    this.nm = el.querySelector('.nm'); this.why = el.querySelector('.why'); this.act = el.querySelector('.act');
    this.open = false;
    this.sel = -1;
    this.items = [];
    this.cur = { x: 0, y: 0 };
    this.tapMode = false;
    this.ring.addEventListener('click', (e) => {
      const a = e.target.closest('.al');
      if (!a) { if (this.tapMode) this.close(false); return; }
      this.sel = +a.dataset.i;
      this.close(true);
    });
    this.ring.addEventListener('mousemove', (e) => {
      const a = e.target.closest('.al');
      if (a && this.sel !== +a.dataset.i) { this.sel = +a.dataset.i; this.#paint(); }
    });
  }

  show() {
    const G = this.G;
    this.items = G.allies.list();
    this.open = true;
    this.sel = -1;   // fix-33: nobody until the stick, the mouse or a number key chooses (it was the first ally, always called)
    this.cur = { x: 0, y: 0 };
    G.input.captureCursor(true);
    this.ring.querySelectorAll('.al').forEach((e) => e.remove());
    const n = Math.max(this.items.length, 1);
    const { P, rad, box } = layout(n);
    this.ring.style.width = this.ring.style.height = `${box}px`;
    this.ring.style.setProperty('--p', `${P}px`);
    this.el.classList.toggle('keys', G.input.device === 'keyboard');   // polish (P2): number keys only for a keyboard
    this.items.forEach((it, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const d = document.createElement('div');
      d.className = 'al' + (it.reason ? ' off' : '');
      d.dataset.i = i;
      d.style.left = `${box / 2 + Math.cos(a) * rad}px`;
      d.style.top = `${box / 2 + Math.sin(a) * rad - 8}px`;
      d.innerHTML = `<img alt="" src="assets/portraits/${it.portrait}.webp"><div class="nmx">${it.name.split(' ').slice(-1)[0]}</div><span class="k">${i < 10 ? (i + 1) % 10 : ''}</span>`;
      this.ring.appendChild(d);
    });
    this.el.classList.add('on');
    document.body.classList.add('wheel-open');   // Fixes-1: the HUD chips step back (on a phone the ring sat on them)
    this.#paint();
  }

  #paint() {
    const G = this.G;
    this.paintDev = G.input.device;
    this.ring.querySelectorAll('.al').forEach((e) => e.classList.toggle('sel', +e.dataset.i === this.sel));
    const it = this.items[this.sel];
    const dev = G.input.device, fam = G.input.gamepad?.family;
    if (!this.items.length) {
      this.nm.textContent = 'No allies yet';
      this.why.textContent = '';
      this.act.textContent = 'Win over a crew and its boss will come when you call.';
      return;
    }
    if (!it) {
      // fix-33: nobody chosen yet: how to choose, and that letting go calls no one
      this.nm.textContent = 'Call an ally';
      this.why.textContent = '';
      this.act.innerHTML = dev === 'touch' ? 'Tap an ally<br><small>Tap outside to close</small>'
        : dev === 'gamepad' ? `${this.tapMode ? 'Choose' : 'Right stick to choose'}<br><small>${this.tapMode ? glyph('uiBack', dev, fam) + ' Close' : 'Let go to cancel'}</small>`
          : `Move the mouse${this.items.length > 1 ? ' or press 1–' + Math.min(9, this.items.length) : ''}<br><small>${this.tapMode ? 'Click outside to close' : 'Let go to cancel'}</small>`;
      return;
    }
    this.nm.textContent = it.name;
    this.why.textContent = it.reason || '';
    const tal = (CREW[it.crew]?.talents || []).map((t) => TALENTS[t]?.name).filter(Boolean).join(' / ');
    const cancel = dev === 'touch' ? '' : `<br><small>${glyph('uiBack', dev, fam)} Cancel</small>`;   // fix-33
    this.act.innerHTML = (it.reason ? '' : `${dev === 'touch' ? 'Tap' : !this.tapMode ? 'Release' : dev === 'gamepad' ? 'Press' : 'Click'} to <b>${it.here ? 'Ask' : 'Call'}</b>${it.here && tal ? `<br><small>${tal} here</small>` : ''}`) + cancel;
  }

  /** Each fixed update while open (held mode): steer the selection. Returns true while open. */
  tick() {
    const G = this.G, inp = G.input;
    // playtest: fetch the allies' portraits ahead of time, so the wheel's first opening isn't a ring of blank circles
    if (!this.open && ((this._pk = (this._pk || 0) + 1) % 300) === 1) {
      this._pre = this._pre || new Set();
      for (const it of G.allies.list()) if (!this._pre.has(it.portrait)) { this._pre.add(it.portrait); new Image().src = `assets/portraits/${it.portrait}.webp`; }
    }
    if (!this.open) return false;
    if (this.paintDev !== inp.device) this.#paint();   // (the prompts follow a device change while it's open)
    // fix-33: ○ / Esc (or Land) closes it without calling anyone
    if (inp.pressed('uiBack') || inp.pressed('dive')) { inp.consume?.('uiBack'); inp.consume?.('dive'); G.audio.synth('uiBack'); this.close(false); return false; }
    if (!this.tapMode && !inp.held('wheel')) { this.close(true); return false; }
    const n = this.items.length;
    if (n) {
      const c = inp.consumeCursor();
      this.cur.x += c.dx; this.cur.y += c.dy;
      const l = Math.hypot(this.cur.x, this.cur.y);
      if (l > 60) { this.cur.x *= 60 / l; this.cur.y *= 60 / l; }
      const rs = inp.rightStick;
      let ax = null, ay = null;
      if (Math.hypot(rs.x, rs.y) > 0.5) { ax = rs.x; ay = rs.y; }
      else if (l > 25) { ax = this.cur.x; ay = this.cur.y; }
      if (ax != null) {
        const a = Math.atan2(ay, ax) + Math.PI / 2;
        const i = ((Math.round((a / (Math.PI * 2)) * n) % n) + n) % n;
        if (i !== this.sel) { this.sel = i; this.#paint(); G.audio.synth('uiMove'); }
      }
      // keys 1–9, 0 pick the first ten; the autopilot may also press ally11+ (its stand-in for a mouse or stick pick)
      for (let k = 1; k <= Math.max(10, n); k++) if (inp.pressed('ally' + k) && k - 1 < n) { this.sel = k - 1; this.#paint(); }
    }
    return true;
  }

  toggleTap() {
    if (this.open) { this.close(false); return; }
    this.tapMode = true;
    this.show();
  }

  close(act) {
    if (!this.open) return;
    this.open = false;
    this.tapMode = false;
    this.el.classList.remove('on');
    document.body.classList.remove('wheel-open');
    this.G.input.captureCursor(false);
    const it = this.items[this.sel];
    if (act && it) {
      if (it.reason) { this.G.toast(it.reason, { kind: 'bad' }); return; }
      this.G.audio.synth('uiSelect');
      this.G.allies.use(it.crew);
    }
  }
}
