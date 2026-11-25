// Guidance (the user: "'Land by the sign' is way too vague. We need something better guiding you to an available next
// thing to do without being too pushy."). Three soft helpers on top of the goal card, all UI only: they read the game,
// never change a rule, a timer or a random stream, and a replay (which never presses "Where to?") runs exactly as before.
//
//   marker         a small bobbing pin over the tracked step's target (the same targets the compass shows: the character
//                  a talk or give step is for, its signs, a named spot, or its place). Subtle: within NEAR m of Gus, or
//                  for REVEAL s after "Where to?" (or a tap on the compass). Normal: always. It fades as Gus arrives and
//                  never shows in a cutscene, dialogue, a menu, the wheel, a nap or the finale.
//   "Where to?"    G / R3 / a tap on the compass: the marker shows, and a line under the compass names the target, where it
//                  is and how far ("Commodore Puddles · on the Lake, just east of Bow Bridge · 240 m north"). While a
//                  "Something to do" card is up, it tracks that scheme instead.
//   something to do after a while with no step done (and not busy on the tracked step), or on the Board: the nearest open
//                  step whose needs hold now (phase, allies, gear, crumbs), else a nap to the soonest phase that opens one.
//                  One line, at most once per few minutes, dismissible. It names where and who, never the answer: steps'
//                  `where` (data/schemes.js) are locations, and the nudge and the Elders keep the how.
//
// Setting "Guidance": subtle (default) | normal | off (nothing beyond the goal card).

import { SCHEME } from '../data/schemes.js';
import { CREW, phaseList, PHASE_LABEL, HAULERS } from '../data/crews.js';
import { PLACES } from '../world/layout.js';
import { derived } from '../state/gamestate.js';
import { glyph } from './glyphs.js';
import { icon } from './icons.js';

const MODES = {
  subtle: { near: 60, idle: 150, every: 300 },
  normal: { near: Infinity, idle: 75, every: 180 },
};
const REVEAL = 6, WHERE_SECS = 6, SUGGEST_SECS = 16;
const ARRIVE = 3, FADE_FROM = 6.5;
const PIN_UP = 35, PIN_DOWN = 4, GAP = 8;   // Polish-2: the pin's extent over its point (ui.css: bottom 4px, 26px tall, a 5px bob); the clear gap to the prompt
const WORKING = 30;   // within this of the tracked step's target, Gus is on it (the idle clock waits for the nudge)   // the marker is gone within ARRIVE m and fades in from FADE_FROM m
const ORDER = ['morning', 'afternoon', 'dusk', 'night'];
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PIN = '<svg viewBox="0 0 24 31" aria-hidden="true"><path d="M12 29.5c-1.2-3.4-3.6-6.2-6.1-8.6A9.8 9.8 0 1 1 18.1 20.9c-2.5 2.4-4.9 5.2-6.1 8.6z" fill="#e07b39" stroke="#fff8ea" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="11.2" r="3.6" fill="#fff8ea"/></svg>';

export class Guide {
  constructor(G) {
    this.G = G;
    this.revealT = 0; this.whereT = 0; this.idleT = 0; this.lastSuggest = -1e9;
    this.sugg = null;      // { id, title, text, t } the "Something to do" card on screen
    this.marks = [];
    // world markers (over the canvas, under the HUD, like the bubbles)
    const box = this.box = document.createElement('div');
    box.id = 'guidemarks';
    document.body.appendChild(box);
    // the "Where to?" line under the compass, and the "Something to do" card under the goal card (inside the HUD, so the
    // cutscene fade and the wheel fade apply)
    const hud = G.hud.el;
    this.line = document.createElement('div');
    this.line.id = 'whereto';
    hud.querySelector('#toasts').prepend(this.line);   // at the head of the toast column (below the right-hand chip rows)
    this.card = document.createElement('div');
    this.card.className = 'suggest off';
    this.card.innerHTML = `<button type="button" class="x" aria-label="Dismiss">${icon('close')}</button><i>Something to do</i><span class="sch"></span><span class="tx"></span><span class="hk"></span>`;
    hud.querySelector('.tl').appendChild(this.card);
    this.card.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); this.dismiss(); });
    this.card.addEventListener('click', () => this.request());
    // a tap or click on the compass is "Where to?" (a glance at it with the mouse shows the marker too)
    const compass = hud.querySelector('#compass');
    compass.addEventListener('click', () => this.request());
    compass.addEventListener('mouseenter', () => { if (this.mode) this.revealT = Math.max(this.revealT, 3); });
    G.bus.on('step', () => { this.idleT = 0; });
    G.bus.on('schemeDone', () => { this.idleT = 0; });
    this.L = {};
  }

  /** 'subtle' | 'normal' | null (off). */
  get modeId() { const m = this.G.settings.guidance; return MODES[m] ? m : m === 'off' ? 'off' : 'subtle'; }
  get mode() { return MODES[this.modeId] || null; }

  /** Is the park on screen with nothing scripted, read or picked? (the marker and the cards hide otherwise) */
  free() {
    const G = this.G;
    return G.screen === 'play' && !G.paused && !G.menus.open && !G.cutscene.running && !G.dialogue.open && !G.wheel.open && !G.napping && !G.ruffling && !G.travel && !G.altView && !G.finale?.running;
  }

  // ------------------------------------------------------------------ the fixed clock (reads only)
  tick(dt) {
    const G = this.G;
    if (this.revealT > 0) this.revealT -= dt;
    if (this.whereT > 0) this.whereT -= dt;
    if (this.sugg && (this.sugg.t -= dt) <= 0) this.sugg = null;
    const M = this.mode;
    if (!M || !G.state.flags.prologue || !this.free()) return;
    // busy on the tracked step (at it, it can be done now, its nudge still to come): that's the nudge's job, not ours
    const E = G.schemes, id = G.state.tracked;
    const step = id ? E.step(id) : null;
    if (step && !E.nudgeShown(id) && this.atStep(id, step) && this.readiness(step).ok) return;
    this.idleT += dt;
    if (this.idleT >= M.idle && G.state.time - this.lastSuggest >= M.every) {
      this.idleT = 0;
      const p = this.pick();
      if (p) { this.lastSuggest = G.state.time; this.sugg = { ...p, t: SUGGEST_SECS }; }
    }
  }

  /** "Where to?" (G, R3, or a tap on the compass). */
  request() {
    const G = this.G;
    if (G.screen !== 'play') return;
    if (!this.mode) { this.say('Guidance is off (Settings).'); return; }
    if (this.sugg) {   // the card's own suggestion: track it
      if (this.sugg.id && SCHEME[this.sugg.id] && G.schemes.isOpen(this.sugg.id)) G.state.tracked = this.sugg.id;
      this.sugg = null;
    }
    this.revealT = REVEAL;
    this.say(this.whereText());
  }
  dismiss() { this.sugg = null; this.idleT = 0; }
  say(text) { this.lineText = text; this.whereT = text ? WHERE_SECS : 0; }

  /** The "Where to?" line: the tracked step's target, where it is and how far. */
  whereText() {
    const G = this.G, E = G.schemes, id = G.state.tracked, step = id && G.schemes.goal() ? E.step(id) : null;
    if (!step) {
      if (E.isOpen('prologue') && !G.state.flags['prologue.card']) return 'The sign with the red DON\'T strip, beside the Pond\'s east path.';
      const p = this.pick();
      return p ? p.text : 'Nothing pinned yet. Have a look round.';
    }
    const where = step.where || step.goal.replace(/\.$/, '');
    const ts = E.targets(id), t = this.nearestTarget(ts);
    // a sign step: name the signs still to flip (the step's own `where` lists them all)
    if (t && ts.every((q) => q.sign)) return `${ts.length > 1 ? 'Signs' : 'The sign'} still to flip: ${ts.map((q) => q.label).join(', ')} · nearest ${this.distText(t)}`;
    if (t?.item) return `${t.label} · ${this.distText(t)}`;   // #42: the compass is on the item (dropped, lost, gone), not the step's place
    if (t) return `${where} · ${this.distText(t)}`;
    // no target on the compass: the step's place (any alternative's) if Gus isn't there yet, else he's there
    const places = [step.needs, ...(step.alts || []).map((a) => a.needs)].map((n) => n?.place).filter((p) => PLACES[p]);
    if (places.length && !places.some((p) => E.atPlace(p))) return `${where} · ${this.distText(this.nearestTarget(places.map((p) => PLACES[p])))}`;
    return places.length ? `${where}. You're there.` : `${where}.`;
  }
  distText(t) {
    const g = this.G.gus.position, dx = t.x - g.x, dz = t.z - g.z, d = Math.hypot(dx, dz);
    if (d < 12) return 'right here';
    const k = Math.round(((Math.atan2(dx, dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
    return `${d < 100 ? Math.round(d / 5) * 5 : Math.round(d / 10) * 10} m ${DIRS[k]}`;
  }
  nearestTarget(ts) {
    const g = this.G.gus.position;
    let best = null, bd = Infinity;
    for (const t of ts) { const d = Math.hypot(t.x - g.x, t.z - g.z); if (d < bd) { bd = d; best = t; } }
    return best;
  }

  // ------------------------------------------------------------------ what's available now
  /** Does one option's needs hold now? { ok } or { phase: next phase it wants } / { crumbs } / { hard } (and soft: item). */
  option(n = {}) {
    const G = this.G, st = G.state;
    const out = { ok: true, item: false };
    const phases = n.phase ? phaseList(n.phase) : null;
    if (phases && !phases.includes(st.phase)) { out.ok = false; out.phase = this.nextPhase(phases); }
    for (const a of [n.ally, ...(n.allies || [])].filter(Boolean)) {
      const have = a.startsWith('haul') ? HAULERS.some((h) => st.crews.includes(h.crew)) : st.crews.includes(a);
      if (!have) { out.ok = false; out.hard = true; }
    }
    if (n.flags && !n.flags.every((f) => st.flags[f])) { out.ok = false; out.hard = true; }
    if (n.gear && !st.gear.includes(n.gear)) { out.ok = false; out.hard = true; }
    if (n.flock && derived(st).flock < n.flock) { out.ok = false; out.hard = true; }
    if (n.dove && !st.crews.includes('swells')) { out.ok = false; out.hard = true; }
    if (n.crumbs && st.crumbs < n.crumbs) { out.ok = false; out.crumbs = n.crumbs; }
    if (n.human && !out.phase && G.humans.isOut && !G.humans.isOut(n.human)) { out.ok = false; out.hard = true; }
    if (n.item) { const c = st.carried; if (!(c && (c.id === n.item || (n.item === 'slice' && c.id.startsWith('slice'))))) out.item = true; }
    return out;
  }
  readiness(step) {
    const opts = (step.alts || [step]).map((o) => this.option(o.needs || {}));
    const ok = opts.find((o) => o.ok);
    if (ok) return { ok: true, item: opts.every((o) => !o.ok || o.item) };
    const nap = opts.filter((o) => o.phase && !o.hard && !o.crumbs).map((o) => o.phase).sort((a, b) => this.ahead(a) - this.ahead(b))[0];
    const crumbs = opts.filter((o) => o.crumbs && !o.hard && !o.phase).map((o) => o.crumbs).sort((a, b) => a - b)[0];
    return { ok: false, nap, crumbs };
  }
  nextPhase(phases) { const i = ORDER.indexOf(this.G.state.phase); for (let k = 1; k <= 4; k++) { const p = ORDER[(i + k) % 4]; if (phases.includes(p)) return p; } return phases[0]; }
  ahead(p) { return (ORDER.indexOf(p) - ORDER.indexOf(this.G.state.phase) + 4) % 4; }
  /** Is Gus at the step's target (or place): within WORKING m? */
  atStep(id, step) {
    const p = this.stepPos(id, step), g = this.G.gus.position;
    if (!p) return true;
    return Math.hypot(p.x - g.x, p.z - g.z) <= (p.r || 0) + WORKING;
  }
  stepPos(id, step) {
    const t = this.nearestTarget(this.G.schemes.targets(id));
    if (t) return t;
    const pl = [step.needs, ...(step.alts || []).map((a) => a.needs)].map((n) => n?.place).find((p) => PLACES[p]);
    return pl ? PLACES[pl] : null;
  }

  /** The suggestion: { id, title, text } for the nearest open step that can be done now, else a nap, else crumbs.
   *  Polish-2: the line no longer starts with the scheme's title ("Hazel Forgot: Hazel scurries about…"); the card and
   *  the Board show `title` as a small label of its own. */
  pick() {
    const G = this.G, E = G.schemes, st = G.state, g = G.gus.position;
    const now = [], nap = [], broke = [];
    for (const id of E.openList()) {
      if (id === 'prologue' || id === 'finale' || E.busy.has(id)) continue;
      const step = E.step(id);
      if (!step || step.auto) continue;
      const r = this.readiness(step);
      const pos = this.stepPos(id, step);
      const d = pos ? Math.hypot(pos.x - g.x, pos.z - g.z) : 2000;
      const e = { id, step, d, r, pos };
      if (r.ok) now.push({ ...e, score: d * (id === st.tracked ? 0.6 : 1) * (r.item ? 1.6 : 1) });
      else if (r.nap) nap.push({ ...e, score: this.ahead(r.nap) * 3000 + d });
      else if (r.crumbs) broke.push({ ...e, score: r.crumbs - st.crumbs });
    }
    const title = (id) => SCHEME[id].title;
    const where = (step) => step.where || step.goal.replace(/\.$/, '');
    now.sort((a, b) => a.score - b.score);
    if (now.length) {
      const b = now[0], ph = b.step.needs?.phase || b.step.alts?.[0]?.needs?.phase;
      const limited = ph && phaseList(ph).length <= 2;
      const far = b.pos && b.d >= 12 ? ` (${this.distText(b.pos)})` : '';
      // #42 review: the distance is to the item when the compass is on it: say so (it was "…out on the Lake (12 m)" with the 12 m to the peas)
      const first = b.pos?.item ? `. First: ${/^(The|Someone) /.test(b.pos.label) ? b.pos.label[0].toLowerCase() + b.pos.label.slice(1) : b.pos.label}` : '';
      return { id: b.id, title: title(b.id), text: `${where(b.step)}${first}${far}.${limited ? ` ${PHASE_LABEL[st.phase]} is the time for it.` : ''}` };
    }
    nap.sort((a, b) => a.score - b.score);
    if (nap.length) {
      const b = nap[0];
      return { id: b.id, title: title(b.id), text: `Nothing more to do this ${PHASE_LABEL[st.phase]}. Nap at a Nest until ${PHASE_LABEL[b.r.nap]}, and this one can go on.` };
    }
    broke.sort((a, b) => a.score - b.score);
    if (broke.length) {
      const b = broke[0];
      return { id: b.id, title: title(b.id), text: `This one needs ${b.r.crumbs} crumbs (you have ${st.crumbs}). Every sign you flip to FEED brings feeders.` };
    }
    return null;
  }

  /** The Board's line (on request, so no cooldown): the same pick. */
  boardLine() { return this.mode ? this.pick() : null; }

  // ------------------------------------------------------------------ drawn frames
  render(project) {
    const G = this.G, L = this.L, M = this.mode, free = this.free();
    // the markers
    const want = [];
    // (the first minute has no card yet, but it has a target: the Prologue's sign)
    if (M && free && (G.schemes.goal() || G.state.tracked === 'prologue')) {
      const g = G.gus.position;
      for (const t of G.schemes.targets()) {
        if (t.sign && G.bubbles.has(`${t.sign}-clue`)) continue;   // the Prologue's own "!" is already over it
        const d = Math.hypot(t.x - g.x, t.z - g.z);
        if (d > M.near && this.revealT <= 0) continue;
        let a = Math.min(1, Math.max(0, (d - ARRIVE) / (FADE_FROM - ARRIVE)));
        if (M.near < Infinity && this.revealT <= 0) a *= Math.min(1, (M.near - d) / 8);   // subtle: fades in at the edge of range
        if (a <= 0.02) continue;
        const y = t.y ?? (G.terrain.heightAt(t.x, t.z) + 2);
        const s = project(t.x, y, t.z);
        if (!s.visible) continue;
        want.push({ x: s.x, y: s.y, a, label: this.revealT > 0 ? `${Math.round(d)} m` : '' });
        if (want.length >= 4) break;
      }
    }
    // Polish-2: never on the context prompt ("C Land" under Gus): a pin that would touch it (with a clear GAP) goes up
    // above it. The prompt has just been placed this frame (hud.update runs first); it never moves for the pin.
    // Flight hint / scarf: the same for the flight hint strip at the bottom centre (#flighthints)
    for (const pr of want.length ? [G.hud.$?.prompt, G.hud.$?.flight] : []) {
      if (!pr || !pr.classList.contains('on')) continue;
      const r = pr.getBoundingClientRect();
      if (r.width > 0) for (const w of want) {
        const half = w.label ? 24 : 10;                          // the pin, or its "240 m" label
        const top = w.y - PIN_UP - (w.label ? 17 : 0), bottom = w.y - PIN_DOWN;
        if (w.x + half + GAP > r.left && w.x - half - GAP < r.right && top - GAP < r.bottom && bottom + GAP > r.top) w.y = r.top - GAP + PIN_DOWN;
      }
    }
    while (this.marks.length < want.length) {
      const el = document.createElement('div');
      el.className = 'gmark';
      el.innerHTML = `<div class="bob">${PIN}<span class="gd"></span></div>`;
      this.box.appendChild(el);
      this.marks.push({ el, d: el.querySelector('.gd'), c: {} });
    }
    this.marks.forEach((m, i) => {
      const w = want[i], c = m.c;
      const show = !!w;
      if (c.show !== show) { m.el.style.display = show ? '' : 'none'; c.show = show; }
      if (!show) return;
      const tf = `translate(${w.x.toFixed(0)}px, ${w.y.toFixed(0)}px)`, op = w.a.toFixed(2);
      if (c.tf !== tf) { m.el.style.transform = tf; c.tf = tf; }
      if (c.op !== op) { m.el.style.opacity = op; c.op = op; }
      if (c.label !== w.label) { m.d.textContent = w.label; c.label = w.label; }
    });
    // the "Where to?" line
    const lt = this.whereT > 0 && free ? this.lineText : '';
    if (L.line !== lt) { this.line.textContent = lt; this.line.classList.toggle('on', !!lt); L.line = lt; }
    // the "Something to do" card
    const sg = this.sugg && free ? this.sugg.text : '';
    const dev = G.input.device + G.input.gamepad.family;
    if (L.sugg !== sg || L.dev !== dev) {
      this.card.querySelector('.sch').textContent = sg ? this.sugg.title || '' : '';
      // Polish-2: the last two words never part (no lone "north-west)." on a line of its own; text-wrap: pretty alone let it)
      const cut = sg.lastIndexOf(' ', sg.lastIndexOf(' ') - 1);
      this.card.querySelector('.tx').innerHTML = cut > 0 ? `${esc(sg.slice(0, cut + 1))}<span class="nw">${esc(sg.slice(cut + 1))}</span>` : esc(sg);
      this.card.querySelector('.hk').innerHTML = sg ? `${glyph('where', G.input.device, G.input.gamepad.family)}<span>Show me</span>` : '';
      this.card.classList.toggle('off', !sg);
      L.sugg = sg; L.dev = dev;
    }
  }

  /** New Game / Continue: nothing carried over from the last game. */
  reset() { this.revealT = 0; this.whereT = 0; this.idleT = 0; this.lastSuggest = -1e9; this.sugg = null; }
}
