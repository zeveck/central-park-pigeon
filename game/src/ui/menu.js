// Menus: a stack of screens, every one usable by mouse, touch, keyboard and
// controller. The stick and D-pad (and arrows/WASD) move focus between the
// screen's buttons spatially; ✕ / Enter confirms; ○ / Esc goes back. The
// focused button has a bright gold outline. Footer hints follow the last
// device used.
//
// A screen is { id, el, open(arg), close(), back(), tick(dt), focusables(), keepsGame }.

import { hintRow } from './glyphs.js';

export class Menus {
  constructor(G) {
    this.G = G;
    this.stack = [];
    this.screens = new Map();
  }

  add(screen) { this.screens.set(screen.id, screen); screen.menus = this; return screen; }
  get top() { return this.stack[this.stack.length - 1] || null; }
  get open() { return this.stack.length > 0; }
  is(id) { return this.stack.some((s) => s.id === id); }

  push(id, arg) {
    const s = this.screens.get(id);
    if (!s) throw new Error('no screen ' + id);
    if (this.top === s) return s;
    if (this.stack.includes(s)) this.stack = this.stack.filter((x) => x !== s);
    if (this.top && !this.top.base) this.top.el.classList.remove('on');
    this.stack.push(s);
    s.el.classList.add('on');
    s.open?.(arg);
    this.refreshHints();
    this.focusFirst();
    this.G.onMenusChanged?.();
    return s;
  }

  pop() {
    const s = this.stack.pop();
    if (!s) return;
    if (!s.base || !this.stack.length) s.el.classList.remove('on');
    s.close?.();
    if (this.top) { this.top.el.classList.add('on'); this.top.reopen?.(); this.refreshHints(); this.focusFirst(); }
    this.G.onMenusChanged?.();
  }

  closeAll() { while (this.stack.length) this.pop(); }

  focusables() {
    const s = this.top;
    if (!s) return [];
    const list = s.focusables ? s.focusables() : [...s.el.querySelectorAll('button:not([disabled]), [tabindex="0"]')];
    return list.filter((e) => e.offsetParent !== null || e === document.activeElement);
  }

  focusFirst() {
    const G = this.G;
    const f = this.focusables();
    const s = this.top;
    const pref = s?.preferredFocus?.();
    // polish (P19): the default is the first item you can actually use (the Nest opened on a greyed-out Feather Up).
    // A recorded solution's raw menu presses (uiDown ×n from the old first item) were made with the old default, so a
    // replay (G.replayer) keeps it; focus is UI only, nothing in the park depends on it.
    // fix-19: the autopilot RECORDING a solution gets the same old default, or its presses don't match the replay's (a
    // re-recorded den-cats.alt napped to Morning instead of Dusk on replay)
    const usable = G.replayer?.active || G.pilot?.active ? f[0] : (f.find((e) => !e.classList.contains('dis')) || f[0]);
    (pref && f.includes(pref) ? pref : usable)?.focus({ preventScroll: !!s?.keepTop });
    // polish (P9): a reading screen (Controls, Credits) opens at its top, even when its only button is at the bottom
    if (s?.keepTop) { const c = s.el.querySelector('.card'); if (c) c.scrollTop = 0; }
  }

  move(dir) {
    const f = this.focusables();
    if (!f.length) return;
    const cur = document.activeElement;
    if (!f.includes(cur)) { f[0].focus(); return; }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const e of f) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      let along, across;
      if (dir === 'up') { along = -dy; across = Math.abs(dx); }
      else if (dir === 'down') { along = dy; across = Math.abs(dx); }
      else if (dir === 'left') { along = -dx; across = Math.abs(dy); }
      else { along = dx; across = Math.abs(dy); }
      if (along <= 2) continue;
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = e; }
    }
    if (!best && (dir === 'up' || dir === 'down')) {
      // wrap within the list order
      const i = f.indexOf(cur);
      best = f[(i + (dir === 'down' ? 1 : f.length - 1)) % f.length];
    }
    if (best) { best.focus({ preventScroll: false }); best.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); this.G.audio?.synth('uiMove'); }
  }

  /** Each update while a menu is open: the controller and the autopilot steer focus through the input layer. */
  tick(dt) {
    const s = this.top;
    if (!s) return;
    const inp = this.G.input;
    s.tick?.(dt);
    if (this.top !== s) return;
    if (s.handleInput?.(inp)) return;
    // Fixes-1: the button that opened Pause (Options / Menu / +, Esc, P) closes it again
    if (s.id === 'pause' && this.stack.length === 1 && inp.pressed('pause')) { this.G.audio?.synth('uiBack'); this.G.resume(); return; }
    if (inp.pressed('uiUp')) this.move('up');
    if (inp.pressed('uiDown')) this.move('down');
    if (inp.pressed('uiLeft')) { if (!s.onLeft?.()) this.move('left'); }
    if (inp.pressed('uiRight')) { if (!s.onRight?.()) this.move('right'); }
    if (inp.pressed('uiOk')) {
      const el = document.activeElement;
      if (el && this.focusables().includes(el)) { this.G.audio?.synth('uiSelect'); el.click(); }
    }
    if (inp.pressed('uiBack')) { this.G.audio?.synth('uiBack'); s.back ? s.back() : this.pop(); }
  }

  refreshHints() {
    const G = this.G;
    this.top?.onDevice?.();   // polish (P19): a screen drawn from the device (Controls) redraws when it changes
    for (const el of document.querySelectorAll('.hints[data-auto]')) {
      const pairs = JSON.parse(el.dataset.auto);
      el.innerHTML = hintRow(pairs, G.input?.device || 'keyboard', G.input?.gamepad.family || 'xbox');
    }
  }
}

/** Build an overlay screen element with a card. */
export function overlay(id, inner, cls = '') {
  const el = document.createElement('div');
  el.id = id;
  el.className = 'overlay ' + cls;
  el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="card">${inner}</div>`;
  document.body.appendChild(el);
  return el;
}

export const BACK_HINTS = JSON.stringify([['uiOk', 'Select'], ['uiBack', 'Back']]);
