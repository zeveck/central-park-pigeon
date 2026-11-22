// The autopilot (debug builds only; loaded on demand by __game.autopilot).
// It turns goals into the inputs a player would press, every update, and
// writes them into the same input queue the keyboard and gamepad use
// (input.setAuto). It never moves Gus directly. With recording on it keeps
// the raw inputs frame by frame; a replay feeds them back with the autopilot
// off, so a run that drifts means the game changed.
//
// Goals: { flyTo: {x,z}, alt } · { walkTo: {x,z}, r } · { landOn: perchId } · { peck: targetId }
//        { coo: { hold } } · { call: crew } · { ask: crew } · { nap: phase } · { press: action, frames }
//        { waitFor: flag | fn } · { wait: seconds } · { closeMenus: true }
// Dialogue lines are advanced automatically (uiOk once a line is typed out).

import { PILOT_EXT } from './pilot-ext.js';
import './pilot-3a.js';
import './pilot-drive.js';
import './pilot-fights.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Autopilot {
  constructor(G) {
    this.G = G;
    this.goals = [];
    this.i = 0;
    this.state = {};
    this.recording = null;
    this.done = null;
    this.log = [];
    this.frame = 0;
    this.timeout = 0;
  }

  run(goals, { record = true, timeout = 600 } = {}) {
    this.goals = goals.flat(Infinity);   // goal helpers (pilot-3a.js) return lists
    this.i = 0;
    this.state = {};
    this.frame = 0;
    this.timeout = timeout;
    this.recording = record ? [] : null;
    this.log = [];
    this.failed = null;
    return new Promise((res) => { this.done = res; });
  }

  get active() { return this.i < this.goals.length && !!this.done; }

  // ------------------------------------------------------------ one update
  tick(dt) {
    const G = this.G, inp = G.input;
    if (!this.active) return;
    this.frame++;
    const out = { held: new Set(), stick: { x: 0, y: 0 } };
    // background behaviours: advance dialogue, skip the board's intro, close it when told
    if (G.dialogue.open && G.dialogue.shown >= (G.dialogue.line?.text.length || 0) && this.frame % 12 === 0) out.held.add('uiOk');
    const g = this.goals[this.i];
    const s = this.state;
    s.t = (s.t || 0) + dt;
    let finished = false;
    try { finished = this.#goal(g, s, out, dt); } catch (e) { this.#fail(String(e)); }
    // Batch-2 (#5): a Flap from the ground is a hold through the take-off squash (12+ frames), never a hop, unless the goal
    // asks for a tap ({ hop: true }, the hop checks). The goals' own 4-frame ground taps stay as written.
    if (G.gus.mode === 'takeoff' && !g?.hop) out.held.add('flap');
    if (s.t > (g.timeout || this.timeout)) this.#fail('timeout on goal ' + this.i + ' ' + JSON.stringify(g).slice(0, 80));
    if (finished) { this.log.push({ goal: this.i, frame: this.frame, t: +G.state.time.toFixed(2) }); this.i++; this.state = {}; }
    // the stick is quantised before it's applied, so the recording is exactly what was pressed
    out.stick.x = Math.round(out.stick.x * 1000) / 1000;
    out.stick.y = Math.round(out.stick.y * 1000) / 1000;
    inp.setAuto({ held: out.held, stick: out.stick });
    if (this.recording) this.#record(out);
    if (!this.active && this.done) { const d = this.done; this.done = null; inp.clearAuto(); d({ ok: !this.failed, failed: this.failed, frames: this.frame, log: this.log }); }
  }

  #fail(msg) { this.failed = msg; this.i = this.goals.length; }

  #record(out) {
    const held = [...out.held].sort().join(',');
    const x = +out.stick.x.toFixed(3), y = +out.stick.y.toFixed(3);
    const last = this.recording[this.recording.length - 1];
    if (last && last.h === held && last.x === x && last.y === y) last.n++;
    else this.recording.push({ n: 1, h: held, x, y });
  }

  // ------------------------------------------------------------ steering helpers
  stickToward(tx, tz, out, mag = 1) {
    const G = this.G, p = G.gus.position;
    const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz) || 1;
    const yaw = G.rig.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw);
    out.stick.x = ((dx / l) * cs - (dz / l) * sn) * mag;
    out.stick.y = ((dx / l) * sn + (dz / l) * cs) * mag;
    return l;
  }

  #goal(g, s, out, dt) {
    const G = this.G, gus = G.gus, p = gus.position;
    if (g.wait != null) return s.t >= g.wait;
    if (g.waitFor) {
      const ok = typeof g.waitFor === 'function' ? g.waitFor(G) : !!G.state.flags[g.waitFor];
      return ok;
    }
    if (g.press) {
      s.n = (s.n || 0) + 1;
      if (s.n <= (g.frames || 3)) { out.held.add(g.press); return false; }
      return s.n > (g.frames || 3) + 1;
    }
    if (g.closeMenus) {
      if (!G.menus.open) return true;
      if (this.frame % 10 === 0) out.held.add('uiBack');
      return false;
    }
    if (g.walkTo) {
      const r = g.r ?? 0.35;
      if (gus.mode === 'fly') { out.held.add('dive'); return false; }
      if (gus.mode === 'perch') { /* walk off the perch edge */ }
      const d = this.stickToward(g.walkTo.x, g.walkTo.z, out, 1);
      if (d > 3) out.held.add('sprint');
      if (d < r) { out.stick.x = out.stick.y = 0; return true; }
      return false;
    }
    if (g.flyTo) {
      const t = g.flyTo;
      const ground = G.terrain.heightAt(p.x, p.z);
      const alt = (g.alt ?? 6) + Math.max(ground, G.terrain.heightAt(t.x, t.z));
      const dist = Math.hypot(t.x - p.x, t.z - p.z);
      if (gus.grounded && !s.flying) {
        if (dist < (g.r ?? 3)) return true;
        s.k = (s.k || 0) + 1;
        if (s.k < 4) out.held.add('flap');
        else if (gus.mode === 'fly') s.flying = true;
        else if (s.k > 20) s.k = 0;
        return false;
      }
      if (gus.mode === 'fly') {
        s.flying = true;
        const land = dist < Math.max(5, (p.y - ground) * 1.4);
        if (!land) {
          this.stickToward(t.x, t.z, out, 1);
          if (p.y < alt) out.held.add('flap');
        } else {
          // come down onto the spot: keep steering, glide down, dive only over it
          if (dist > 1.2) this.stickToward(t.x, t.z, out, Math.min(1, dist / 4));
          if (dist < 2.5 || p.y - ground > 3) out.held.add('dive');
        }
        return false;
      }
      // landed
      return s.flying && gus.grounded;
    }
    if (g.peck) {
      const T = G.interact.get(g.peck);
      if (!T) throw new Error('no target ' + g.peck);
      if (gus.mode === 'fly') { out.held.add('dive'); return false; }
      if (s.pressed) {
        s.pressed++;
        if (s.pressed <= 3) out.held.add('peck');
        return s.pressed > 4;
      }
      if (G.interact.current?.t.id === g.peck) { s.pressed = 1; out.held.add('peck'); return false; }
      const d = this.stickToward(T.x, T.z, out, 0.6);
      if (d < 0.25) { out.stick.x = out.stick.y = 0; }
      return false;
    }
    if (g.coo) {
      s.n = (s.n || 0) + 1;
      const frames = g.coo.hold ? 40 : 3;
      if (s.n <= frames) { out.held.add('coo'); return false; }
      return true;
    }
    if (g.call || g.ask) {
      const crew = g.call || g.ask;
      const list = G.allies.list();
      const k = list.findIndex((a) => a.crew === crew);
      if (k < 0) throw new Error('no ally ' + crew);
      s.n = (s.n || 0) + 1;
      if (s.n < 4) out.held.add('wheel');
      else if (s.n < 7) { out.held.add('wheel'); out.held.add('ally' + (k + 1)); }
      else if (s.n < 9) out.held.add('wheel');
      else return s.n > 12;
      return false;
    }
    if (g.nap) {
      // perched: Peck shows Nap; then pick the phase in the list (fixed order, current phase left out)
      if (!G.menus.is('nap')) {
        s.k = (s.k || 0) + 1;
        if (s.k % 6 < 2) out.held.add('peck');
        if (s.k > 120) throw new Error('nap: not on a perch');
        return false;
      }
      const order = ['morning', 'afternoon', 'dusk', 'night'].filter((q) => q !== G.state.phase);
      const want = order.indexOf(g.nap);
      s.m = (s.m || 0) + 1;
      const focusIdx = [...document.querySelectorAll('#nap .list button')].indexOf(document.activeElement);
      if (focusIdx < want) { if (s.m % 4 === 0) out.held.add('uiDown'); return false; }
      if (s.m % 4 === 0) out.held.add('uiOk');
      return G.napping != null;
    }
    if (g.landOn) {
      const perch = G.collision.perchById(g.landOn);
      if (!perch) throw new Error('no perch ' + g.landOn);
      if (gus.mode === 'perch' && Math.hypot(p.x - perch.x, p.z - perch.z) < 0.5) return true;
      if (gus.grounded && !s.up) { s.k = (s.k || 0) + 1; if (s.k < 4) out.held.add('flap'); if (gus.mode === 'fly') s.up = true; return false; }
      s.up = true;
      const dist = Math.hypot(perch.x - p.x, perch.z - p.z);
      this.stickToward(perch.x, perch.z, out, dist > 6 ? 1 : 0.5);
      if (p.y < perch.y + (dist > 8 ? 2 : 0.35)) out.held.add('flap');
      return false;
    }
    for (const h of PILOT_EXT) { const r = h(this, g, s, out, dt); if (r !== undefined) return r; }
    throw new Error('unknown goal ' + JSON.stringify(g));
  }
}

/** Feed recorded raw inputs back, one frame per update (the autopilot is off). */
export class Replay {
  constructor(G, frames) {
    this.G = G;
    this.frames = frames;
    this.k = 0; this.n = 0;
    this.total = frames.reduce((a, f) => a + f.n, 0);
    this.played = 0;
  }
  get active() { return this.k < this.frames.length; }
  tick() {
    const inp = this.G.input;
    if (!this.active) return;
    const f = this.frames[this.k];
    inp.setAuto({ held: f.h ? f.h.split(',') : [], stick: { x: f.x, y: f.y } });
    this.played++;
    if (++this.n >= f.n) { this.k++; this.n = 0; }
    if (!this.active) inp.setAuto({});
  }
}
