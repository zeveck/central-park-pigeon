// Dialogue: a bottom panel with the speaker's portrait (their character card,
// cropped, in a polaroid frame), name and typewriter text with species
// chatter blips. Tap, click, ✕ / Space / Enter / E to advance (first press
// finishes the line, the next one moves on). Runs on the game clock.
//
//   dialogue.say([{ who: 'duchess', text: '…', voice: 'duchess-greeting' }, …], onDone)

import { CHARACTERS, CREW } from '../data/crews.js';
import { glyph } from './glyphs.js';

const CPS = 42;   // characters a second
// the portraits on file (game/assets/portraits/<id>.webp): one per named character (animals, Gus and the named humans)
const PORTRAITS = new Set(Object.keys(CHARACTERS));

export class Dialogue {
  constructor(G) {
    this.G = G;
    const el = this.el = document.createElement('div');
    el.id = 'dialogue';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="panel"><div class="frame"><img alt=""></div><div><div class="name"></div><div class="text" aria-live="polite"></div></div></div><div class="next"></div>`;
    document.body.appendChild(el);
    this.img = el.querySelector('img');
    this.panel = el.querySelector('.panel');
    this.img.onerror = () => this.panel.classList.add('noportrait');
    this.nameEl = el.querySelector('.name');
    this.textEl = el.querySelector('.text');
    this.nextEl = el.querySelector('.next');
    this.queue = [];
    this.line = null;
    this.shown = 0;
    this.onDone = null;
    this.clicked = false;
    this.age = 0;
    el.addEventListener('click', () => { this.clicked = true; });
  }

  get open() { return !!this.line; }

  say(lines, onDone = null) {
    this.queue.push(...lines);
    if (onDone) {
      const prev = this.onDone;
      this.onDone = prev ? () => { prev(); onDone(); } : onDone;
    }
    if (!this.line) this.#next();
  }

  #next() {
    this.line = this.queue.shift() || null;
    if (!this.line) {
      this.el.classList.remove('on');
      const f = this.onDone; this.onDone = null;
      f?.();
      return;
    }
    const L = this.line;
    const c = CHARACTERS[L.who] || { name: L.name || L.who, portrait: L.who };
    this.nameEl.textContent = L.name || c.name;
    // Polish-1: narrators and unnamed humans (who: null, or no portrait on file) get no frame at all
    const pic = L.who && PORTRAITS.has(c.portrait || L.who) ? (c.portrait || L.who) : null;
    if (pic) this.img.src = `assets/portraits/${pic === 'gus' && this.G.gusPortrait ? this.G.gusPortrait() : pic}.webp`;   // fun pass: Gus in the scarf he's wearing
    this.panel.classList.toggle('noportrait', !pic);
    this.textEl.textContent = '';
    this.shown = 0;
    this.age = 0;
    this.blipBase = blipFor(L.who);
    this.blipPitch = pitchFor(L.who);
    this.el.classList.add('on');
    this.nextEl.innerHTML = '';
    if (L.voice) this.G.audio.voice(L.voice);
  }

  tick(dt) {
    if (!this.line) return;
    const inp = this.G.input;
    this.age += dt;
    const text = this.line.text;
    const before = Math.floor(this.shown);
    this.shown = Math.min(text.length, this.shown + CPS * dt);
    const now = Math.floor(this.shown);
    if (now !== before) {
      this.textEl.textContent = text.slice(0, now);
      if (now % 3 === 0 && /\w/.test(text[now - 1] || '')) {
        if (this.blipBase) this.G.audio.blip(this.blipBase, this.blipPitch);
        else this.G.audio.synth('tick');
      }
    }
    const done = this.shown >= text.length;
    if (done && !this.nextEl.innerHTML) this.nextEl.innerHTML = `${glyph('uiOk', inp.device, inp.gamepad.family)} Next`;
    const adv = this.clicked || inp.pressed('uiOk') || inp.pressed('peck');
    this.clicked = false;
    if (adv && this.age > 0.15) {
      inp.consume('peck'); inp.consume('flap'); inp.consume('uiOk');
      if (!done) { this.shown = text.length; this.textEl.textContent = text; }
      else this.#next();
    }
  }

  clear() { this.queue = []; this.line = null; this.onDone = null; this.el.classList.remove('on'); }
}

function blipFor(who) {
  const c = CHARACTERS[who];
  if (!c) return null;
  if (c.role === 'human' || who === 'gus') return who === 'gus' ? 'coo' : null;
  return CREW[c.crew]?.blip || 'coo';
}
function pitchFor(who) {
  const c = CHARACTERS[who];
  if (!c) return 1.2;
  if (who === 'gus') return 1.25;
  if (c.role === 'boss') return 1.0;
  return 1.15 + ((who.charCodeAt(0) % 5) * 0.06);
}
