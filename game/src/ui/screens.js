// The menu screens: title, pause, settings, controls cards, credits, confirm,
// the Nest menu (Feather Up, Save, Nap, Scarf), Nap until…, the scarf
// wardrobe and the grate map. Each is plain HTML in a card; menu.js handles
// focus and the controller.

import { overlay, BACK_HINTS } from './menu.js';
import { icon, phaseIcon } from './icons.js';
import { glyph } from './glyphs.js';
import { PHASE_LABEL } from '../data/crews.js';
import { GRATES } from '../world/layout.js';
import { creditsHtml } from '../data/credits.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const btn = (act, label, ic = null, cls = '') => `<button type="button" class="btn ${cls}" data-act="${act}">${ic ? icon(ic) : ''}<span>${label}</span></button>`;
const hints = (pairs = BACK_HINTS) => `<div class="hints" data-auto='${typeof pairs === 'string' ? pairs : JSON.stringify(pairs)}'></div>`;

function wire(el, handlers) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || b.classList.contains('dis')) return;
    const f = handlers[b.dataset.act];
    if (f) f(b);
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button, [tabindex="0"]'); if (b && !b.disabled && el.contains(b) && document.activeElement !== b) b.focus({ preventScroll: true }); });
}

// ------------------------------------------------------------------ title
export function titleScreen(G) {
  const el = document.createElement('div');
  el.id = 'title';
  el.innerHTML = `
    <h1 class="logo">Central Park<br>Pigeon<small>ONE PIGEON. SEVENTEEN CREWS. ONE VERY LARGE ROBOT.</small></h1>
    <div class="menu"></div>
    <div class="press"></div>
    <div class="credit">A game by Rich Conlan · <a class="ext" href="https://github.com/zeveck/central-park-pigeon" target="_blank" rel="noopener" title="Central Park Pigeon on GitHub: how it was made">GitHub</a></div>
    <a class="gallery ext" href="https://synapticnoise.com/" target="_blank" rel="noopener" title="More games at synapticnoise.com">synapticnoise.com</a>`;
  // Publish: the outbound links open in a new tab and never start the game or move menu focus.
  for (const a of el.querySelectorAll('a.ext')) for (const t of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown']) a.addEventListener(t, (e) => e.stopPropagation());
  el.style.backgroundImage = "url('assets/ui/key-art.jpg')";
  document.body.appendChild(el);
  const menuEl = el.querySelector('.menu');
  const press = el.querySelector('.press');
  const s = {
    id: 'title', el, base: true,
    open() {
      const has = G.hasSave();
      menuEl.innerHTML = (has ? btn('continue', 'Continue', 'play', 'primary') : '') + btn('new', 'New Game', has ? 'feather' : 'play', has ? '' : 'primary') + btn('settings', 'Settings', 'settings') + btn('credits', 'Credits', 'postcard');
      s.updatePress();
      G.audio.setMusic('title');
      G.audio.setAmbience([]);
    },
    updatePress() {
      const touch = G.input.device === 'touch' || matchMedia('(pointer: coarse)').matches;
      press.textContent = touch ? 'Tap to start' : 'Press any key or button';
      // Fixes-2: the menu is already up, so "Press any key or button" under it only read as a second, competing step
      // (any key or click still wakes the audio). Kept for a title without a menu (none today).
      press.classList.toggle('hidden', G.input.hadInput || !!menuEl.children.length);
    },
    back() { /* the title has nowhere to go back to */ },
    tick() { if (G.input.hadInput && !press.classList.contains('hidden')) s.updatePress(); },
    preferredFocus: () => menuEl.querySelector('.primary'),
  };
  wire(el, {
    continue: () => G.continueGame(),
    new: () => {
      if (G.hasSave()) G.confirm({ title: 'Start a new game?', text: 'Your saved park will be replaced. Gus starts again on his lamppost.', yes: 'New Game', no: 'Keep my save', onYes: () => G.newGame() });
      else G.newGame();
    },
    settings: () => G.menus.push('settings'),
    credits: () => G.menus.push('credits'),
  });
  return s;
}

// ------------------------------------------------------------------ pause
export function pauseScreen(G) {
  const el = overlay('pause', `
    <h2>Paused</h2>
    <p class="reason hidden"></p>
    <div class="list"></div>
    ${hints()}`);
  const list = el.querySelector('.list');
  const reason = el.querySelector('.reason');
  const s = {
    id: 'pause', el,
    open(why = '') {
      reason.textContent = why;
      reason.classList.toggle('hidden', !why);
      s.render();
    },
    reopen() { s.render(); },
    render() {
      const napWhy = G.napBlocked();
      list.innerHTML = btn('resume', 'Resume', 'play', 'primary')
        + `<button type="button" class="btn${napWhy ? ' dis' : ''}" data-act="nap">${icon('zzz')}<span>Nap until…</span>${napWhy ? `<span class="right">${esc(napWhy)}</span>` : ''}</button>`
        + btn('board', 'Scheme Board', 'board') + btn('map', 'Map', 'map') + btn('roster', 'Crews & Workshop', 'roster')
        + btn('controls', 'Controls', 'controls') + btn('settings', 'Settings', 'settings')
        + btn('mute', G.settings.muted ? 'Sound: off' : 'Sound: on', G.settings.muted ? 'muted' : 'speaker')
        + btn('save', 'Save', 'save')
        + (G.reportAvailable?.() ? btn('report', 'Report a bug', 'bug') : '')
        + btn('quit', 'Save & quit to title', 'home');
      G.menus.refreshHints();
    },
    back() { G.resume(); },
  };
  wire(el, {
    resume: () => G.resume(),
    nap: () => G.menus.push('nap'),
    board: () => G.menus.push('board'),
    map: () => G.menus.push('map'),
    roster: () => G.menus.push('roster'),
    controls: () => G.menus.push('controls'),
    settings: () => G.menus.push('settings'),
    mute: () => { G.toggleMute(); s.render(); s.el.querySelector('[data-act="mute"]').focus(); },
    save: (b) => { const mid = G.midScene?.(), ok = !mid && G.saveNow(); b.querySelector('span').textContent = ok ? 'Saved' : mid ? 'Not mid-scene' : 'Could not save'; },   // Fixes-1
    report: () => G.openReport(),
    quit: () => { if (!G.midScene?.()) G.saveNow(); G.quitToTitle(); },   // Fixes-1: mid-scene, the last autosave stands
  });
  return s;
}

// ------------------------------------------------------------------ settings
export function settingsScreen(G) {
  const el = overlay('settings', `
    <h2>Settings</h2>
    <div class="set"></div>
    <p class="muted gfxnow"></p>
    <p class="muted offline hidden"></p>
    <div class="row more" style="margin-top:10px"></div>
    ${hints([['uiLeft', '−'], ['uiRight', '+'], ['uiOk', 'Select'], ['uiBack', 'Back']])}`);
  const box = el.querySelector('.set');
  const more = el.querySelector('.more');
  const offline = el.querySelector('.offline');
  const sliders = [
    ['music', 'Music volume', 0, 1, 0.1, (v) => `${Math.round(v * 100)}%`],
    ['sfx', 'Effects volume', 0, 1, 0.1, (v) => `${Math.round(v * 100)}%`],
    ['sensitivity', 'Camera sensitivity', 0.3, 2.5, 0.1, (v) => `${v.toFixed(1)}×`],
  ];
  const toggles = [['muted', 'Mute'], ['invertY', 'Invert camera Y'], ['autoFollow', 'Flight camera auto-follow'], ['vibration', 'Vibration'], ['showFps', 'Show FPS']];   // Land/perf: the frame-rate readout
  const render = () => {
    const S = G.settings;
    box.innerHTML = sliders.map(([k, label, lo, hi, , fmt]) => `<label>${label}</label><div class="slider"><div class="track focusable" tabindex="0" data-slider="${k}"><div class="fill" style="width:${((S[k] - lo) / (hi - lo)) * 100}%"></div></div><span class="val">${fmt(S[k])}</span></div>`).join('')
      + toggles.map(([k, label]) => `<label>${label}</label><button type="button" class="btn small" data-toggle="${k}">${S[k] ? 'On' : 'Off'}</button>`).join('')
      + `<label>Graphics</label><div class="choice">${['auto', 'low', 'medium', 'high'].map((g) => `<button type="button" class="btn small ${S.graphics === g ? 'on' : ''}" data-gfx="${g}">${g[0].toUpperCase() + g.slice(1)}</button>`).join('')}</div>`;
    // Land/perf: say what is running (Auto may have stepped down)
    el.querySelector('.gfxnow').textContent = `Running: ${G.preset?.label || ''}${G.presetAuto ? ' (Auto)' : ''}. Changing the graphics reloads the park (your progress is saved first).`;
    more.innerHTML = btn('back', 'Back', 'back', 'primary') + btn('credits', 'Credits', 'postcard') + (G.reportAvailable?.() ? btn('report', 'Report a bug', 'bug') : '');
    s.refreshOffline();
  };
  const nudge = (k, dir) => {
    const def = sliders.find((x) => x[0] === k);
    const [, , lo, hi, step] = def;
    G.settings[k] = Math.round(Math.min(hi, Math.max(lo, G.settings[k] + dir * step)) * 100) / 100;
    G.applySettings();
    render();
    box.querySelector(`[data-slider="${k}"]`).focus();
  };
  const s = {
    id: 'settings', el,
    open() { render(); },
    onLeft() { const k = document.activeElement?.dataset?.slider; if (k) { nudge(k, -1); return true; } return false; },
    onRight() { const k = document.activeElement?.dataset?.slider; if (k) { nudge(k, 1); return true; } return false; },
    back() { G.menus.pop(); },
    reopen() { render(); },
    refreshOffline() {
      const off = G.offlineStatus?.();
      offline.textContent = off ? `Offline play: ${off}` : '';
      offline.classList.toggle('hidden', !off);
    },
  };
  wire(el, { back: () => G.menus.pop(), credits: () => G.menus.push('credits'), report: () => G.openReport() });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle], [data-gfx], [data-slider]');
    if (!t) return;
    if (t.dataset.toggle) {
      const k = t.dataset.toggle;
      G.settings[k] = !G.settings[k];
      G.applySettings();
      render();
      box.querySelector(`[data-toggle="${k}"]`).focus();
    } else if (t.dataset.gfx) {
      // Fixes-3 (B4): compare with what is really running (Auto stepped down, or a stored preset), not the setting alone
      const cur = G.presetAuto && !/forced/.test(G.presetReason || '') ? 'auto' : G.preset.id;
      if (cur === t.dataset.gfx && G.settings.graphics === t.dataset.gfx) return;
      G.settings.graphics = t.dataset.gfx;
      G.applySettings();
      G.setGraphics(t.dataset.gfx);
    } else if (t.dataset.slider) {
      const k = t.dataset.slider;
      const def = sliders.find((x) => x[0] === k);
      const r = t.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      G.settings[k] = Math.round((def[2] + f * (def[3] - def[2])) * 10) / 10;
      G.applySettings();
      render();
      box.querySelector(`[data-slider="${k}"]`).focus();
    }
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button, [tabindex="0"]'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
  return s;
}

// ------------------------------------------------------------------ controls cards
const CARDS = [
  { title: 'Move and fly', rows: [['move', 'Waddle / steer'], ['look', 'Camera'], ['flap', 'Hop, take off; hold to climb'], ['dive', 'Land / Dive: tap when low to land, hold to dive'], ['sprint', 'Waddle-sprint; boost in the air']] },
  { title: 'Peck and coo', rows: [['peck', 'Peck: talk, pick up, give, flip a sign'], ['coo', 'Coo: tap to gather the flock, hold to swarm'], ['drop', 'Drop what you carry'], ['nap', 'Nap (on a perch, when it shows)']] },
  { title: 'Calling allies', rows: [['wheel', 'Hold the Ally wheel, pick, release'], ['peck', 'Peck an ally who is here: Ask'], ['board', 'Scheme Board'], ['map', 'Map']] },
  { title: 'Driving', rows: [['move', 'Steer'], ['flap', 'Gas'], ['dive', 'Brake, reverse'], ['coo', 'Horn (Dump / Spray on the Zamboni)'], ['peck', 'Get out']] },
];
// Fixes-1: on touch the cards name the on-screen controls (the key list made no sense on a phone)
const TOUCH_CARDS = [
  { title: 'Move and fly', rows: [['Stick', 'Waddle / steer; push to the edge to sprint'], ['Drag', 'Camera: drag on the right half'], ['Flap', 'Hop, take off; hold to climb'], ['Land', 'Land / Dive: tap when low to land, hold to dive'], ['Double-tap Flap', 'Boost in the air']] },
  { title: 'Peck and coo', rows: [['Peck', 'Talk, pick up, give, flip a sign'], ['Coo', 'Tap to gather the flock, hold to swarm'], ['Hold Peck', 'Drop what you carry'], ['Peck', 'Nap (on a perch, when it shows)']] },
  { title: 'Calling allies', rows: [['Gus', 'Tap his picture (top left): the Ally wheel'], ['Tap', 'Tap an ally on the wheel: Call or Ask'], ['Peck', 'Peck an ally who is here: Ask'], ['Board', 'Board and Map: the top-right buttons']] },
  { title: 'Driving', rows: [['Stick', 'Steer'], ['Gas', 'Gas (the Flap button)'], ['Brake', 'Brake, reverse (the Land button)'], ['Horn', 'Horn; Dump / Spray on the Zamboni (Coo)'], ['Out', 'Get out (Peck)']] },
];
export function controlsScreen(G) {
  const el = overlay('controls', `<h2>Controls</h2><div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px"></div><p class="muted pad-note hidden">Controllers work best in Chrome or Edge.</p><p class="muted report-note hidden">Ctrl+Shift+L: report a bug</p>${hints([['uiBack', 'Back']])}<div class="row" style="margin-top:8px">${btn('back', 'Back', 'back')}</div>`);
  const grid = el.querySelector('.cards');
  const s = {
    keepTop: true, id: 'controls', el,
    open() {
      const d = G.input.device, f = G.input.gamepad.family;
      const card = (c, rows) => `<div style="background:#fff;border-radius:12px;padding:10px 14px"><h3 style="margin-top:0">${c.title}</h3>${rows}</div>`;
      const row = (g, l) => `<div style="display:flex;gap:10px;align-items:center;margin:6px 0">${g}<span>${l}</span></div>`;
      if (d === 'touch') grid.innerHTML = TOUCH_CARDS.map((c) => card(c, c.rows.map(([t, l]) => row(`<span class="padpill">${t}</span>`, l)).join(''))).join('');
      else grid.innerHTML = CARDS.map((c) => `<div style="background:#fff;border-radius:12px;padding:10px 14px"><h3 style="margin-top:0">${c.title}</h3>${c.rows.map(([a, l]) => `<div style="display:flex;gap:10px;align-items:center;margin:6px 0">${glyph(a, d, f)}<span>${l}</span></div>`).join('')}</div>`).join('');
      el.querySelector('.pad-note').classList.toggle('hidden', !(G.input.gamepad.connected && !G.input.gamepad.standard));
      el.querySelector('.report-note').classList.toggle('hidden', !G.reportAvailable?.() || G.input.device === 'touch');
    },
    onDevice() { const c = el.querySelector('.card'), top = c?.scrollTop || 0; s.open(); if (c) c.scrollTop = top; },   // polish (P19): live
    back() { G.menus.pop(); },
  };
  wire(el, { back: () => G.menus.pop() });
  return s;
}

// ------------------------------------------------------------------ credits
export function creditsScreen(G) {
  const el = overlay('credits', `<h2>Credits</h2>
    <div class="credits-wrap"><div class="credits-body" tabindex="0">${creditsHtml()}</div><div class="more">Scroll for more</div></div>
    <div class="row" style="margin-top:12px">${btn('back', 'Back', 'back', 'primary')}</div>${hints([['uiDown', 'Scroll'], ['uiBack', 'Back']])}`);
  const body = el.querySelector('.credits-body');
  // polish (P19): a soft fade where the roll is cut off, and a "Scroll for more" cue until the end is reached
  const wrapEl = el.querySelector('.credits-wrap');
  const atEnds = () => { wrapEl.classList.toggle('top', body.scrollTop < 4); wrapEl.classList.toggle('end', body.scrollTop + body.clientHeight >= body.scrollHeight - 4); };
  body.addEventListener('scroll', atEnds);
  const s = {
    keepTop: true, id: 'credits', el,
    open() { body.scrollTop = 0; requestAnimationFrame(atEnds); },
    // the stick and arrows scroll the roll; Back is the only button
    handleInput(inp) {
      if (inp.pressed('uiUp') || inp.held('uiUp')) body.scrollTop -= inp.pressed('uiUp') ? 60 : 8;
      if (inp.pressed('uiDown') || inp.held('uiDown')) body.scrollTop += inp.pressed('uiDown') ? 60 : 8;
      return false;
    },
    preferredFocus: () => el.querySelector('[data-act="back"]'),
    back() { G.menus.pop(); },
  };
  wire(el, { back: () => G.menus.pop() });
  return s;
}

// ------------------------------------------------------------------ confirm
export function confirmScreen(G) {
  const el = overlay('confirm', `<h2></h2><p class="txt"></p><div class="row" style="margin-top:14px"></div>${hints()}`);
  let cfg = null;
  const s = {
    id: 'confirm', el,
    open(c) {
      cfg = c;
      el.querySelector('h2').textContent = c.title;
      el.querySelector('.txt').textContent = c.text || '';
      el.querySelector('.row').innerHTML = btn('no', c.no || 'Cancel', 'close', 'primary') + btn('yes', c.yes || 'OK', 'play');
    },
    back() { G.menus.pop(); cfg?.onNo?.(); },
  };
  wire(el, { yes: () => { const c = cfg; G.menus.pop(); c?.onYes?.(); }, no: () => s.back() });
  return s;
}

// ------------------------------------------------------------------ nap until…
export function napScreen(G) {
  const el = overlay('nap', `<h2>Nap until…</h2><p class="muted">Rangers fix any sign that isn't permanent while you sleep. Uneaten crumbs, slices on the ground and allies you called don't wait.</p><div class="list"></div>${hints()}`);
  const list = el.querySelector('.list');
  const s = {
    id: 'nap', el,
    open() {
      const cur = G.state.phase;
      // fun pass (P10): what a nap would cost right now, in numbers (the first time it matters)
      const flips = Object.values(G.signs.st || {}).filter((q) => q.flipped && !q.permanent).length, piles = G.food.piles?.length || 0;
      el.querySelector('p.muted').textContent = flips || piles ? `Nap? ${flips ? `Your ${flips} flipped sign${flips > 1 ? 's' : ''} will be fixed` : ''}${flips && piles ? ' and ' : ''}${piles ? `${piles} crumb pile${piles > 1 ? 's' : ''} will go` : ''}. Slices on the ground and allies you called don't wait either.` : 'Rangers fix any sign that isn\'t permanent while you sleep. Uneaten crumbs, slices on the ground and allies you called don\'t wait.';
      list.innerHTML = ['morning', 'afternoon', 'dusk', 'night'].filter((p) => p !== cur).map((p) => `<button type="button" class="btn" data-act="p" data-phase="${p}">${phaseIcon(p)}<span>${PHASE_LABEL[p]}</span></button>`).join('') + btn('cancel', 'Stay awake', 'close');
    },
    back() { G.menus.pop(); },
  };
  wire(el, { p: (b) => { G.menus.closeAll(); G.nap(b.dataset.phase); }, cancel: () => G.menus.pop() });
  return s;
}

// ------------------------------------------------------------------ the Nest
export function nestScreen(G) {
  const el = overlay('nest', `<h2>The Nest</h2><p class="muted where"></p><div class="list"></div>${hints()}`);
  const list = el.querySelector('.list');
  const s = {
    id: 'nest', el,
    open() { s.render(); },
    reopen() { s.render(); },
    render() {
      const st = G.state;
      el.querySelector('.where').textContent = G.nestName() + ' · a save point';
      const full = st.feathers >= 3, poor = st.crumbs < 15;
      list.innerHTML = `<button type="button" class="btn${full || poor ? ' dis' : ''}" data-act="feather">${icon('featherOn')}<span>Feather Up</span><span class="right">${full ? 'feathers full' : '15 crumbs'}</span></button>`
        + btn('save', 'Save', 'save')
        + `<button type="button" class="btn${G.napBlocked() ? ' dis' : ''}" data-act="nap">${icon('zzz')}<span>Nap until…</span></button>`
        + btn('scarf', 'Scarf', 'scarf') + btn('close', 'Back to the park', 'play');
      G.menus.refreshHints();
    },
    back() { G.menus.closeAll(); G.resume(); },
  };
  wire(el, {
    feather: () => { G.featherUp(); s.render(); },
    save: (b) => { const mid = G.midScene?.(), ok = !mid && G.saveNow(); b.querySelector('span').textContent = ok ? 'Saved' : mid ? 'Not mid-scene' : 'Could not save'; },   // Fixes-1
    nap: () => G.menus.push('nap'),
    scarf: () => G.menus.push('scarf'),
    close: () => s.back(),
  });
  return s;
}

// ------------------------------------------------------------------ scarf wardrobe (Ledger's Scarf Stash)
export const SCARVES = [
  { id: 'slice-orange', name: 'Slice orange', how: 'Your own' },
  { id: 'taxi-checker', name: 'Taxi checker', how: 'Ledger sells it (falafel)' },
  { id: 'subway-blue', name: 'Deep subway blue', how: 'Ledger sells it (falafel)' },
  { id: 'maple-stripes', name: 'Autumn maple stripes', how: 'Ledger sells it (falafel)' },
  { id: 'ramble-cable', name: 'Ramble-green cable knit', how: 'Ledger sells it (falafel)' },
  { id: 'cream-mohair', name: 'Fluffy cream mohair', how: 'Ledger sells it (falafel)' },
  { id: 'rainbow-stripe', name: "The Choir's rainbow stripe", how: 'A gift when the Choir joins' },
  { id: 'racing-red', name: "Ringo's racing red", how: 'After the Rink Job' },
  { id: 'wedding-white', name: "Dove's wedding white", how: 'After the Wedding' },
  { id: 'bread-print', name: '"FEED THE BIRDS" bread-print', how: 'Bread Power 30' },
];
export function scarfScreen(G) {
  const el = overlay('scarf', `<h2>Scarf</h2><p class="muted">Ledger's Scarf Stash. Pick one and Gus swaps it with a twirl.</p><div class="list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px"></div><div class="row" style="margin-top:10px">${btn('back', 'Back', 'back')}</div>${hints()}`);
  const list = el.querySelector('.list');
  const s = {
    id: 'scarf', el,
    open() {
      const st = G.state;
      list.innerHTML = SCARVES.map((sc) => {
        const own = st.scarves.includes(sc.id);
        return `<button type="button" class="btn small${own ? '' : ' dis'}${st.scarf === sc.id ? ' primary' : ''}" data-act="pick" data-id="${sc.id}"><img src="assets/textures/scarf-${sc.id}.jpg" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover"><span><span style="display:block">${sc.name}</span><small style="display:block;opacity:.75">${own ? (st.scarf === sc.id ? 'Wearing' : 'Owned') : sc.how}</small></span></button>`;
      }).join('');
    },
    back() { G.menus.pop(); },
  };
  wire(el, { pick: (b) => { G.setScarf(b.dataset.id); s.open(); }, back: () => G.menus.pop() });
  return s;
}

// ------------------------------------------------------------------ the grates (rats' fast travel)
export function grateScreen(G) {
  const el = overlay('grates', `<h2>Grate travel</h2><p class="muted">Express punches your ticket. Whatever you carry comes too.</p><div class="list"></div>${hints()}`);
  const list = el.querySelector('.list');
  let from = null;
  const s = {
    id: 'grates', el,
    open(id) {
      from = id;
      list.innerHTML = GRATES.filter((g) => g.id !== id).map((g) => {
        const why = G.grateBlocked(g.id);
        return `<button type="button" class="btn${why ? ' dis' : ''}" data-act="go" data-id="${g.id}">${icon('grate')}<span>${g.name}</span>${why ? `<span class="right">${why}</span>` : ''}</button>`;
      }).join('') + btn('cancel', 'Stay here', 'close');
    },
    back() { G.menus.closeAll(); G.resume(); },
  };
  wire(el, { go: (b) => { G.menus.closeAll(); G.grateTravel(from, b.dataset.id); }, cancel: () => s.back() });
  return s;
}
