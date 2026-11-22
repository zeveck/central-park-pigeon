// Debug only (fun pass): a "new player" for the first-15-minutes check. It plays from a fresh New Game using only
// what the screen shows a player: the HUD goal card and its compass target, the context prompt under Gus, the
// dialogue box, a world bubble ("!" over the first sign, "…" over someone in the way), the Board's "Nap until"
// button, and the tutor line. It never reads layout data or scheme internals, never teleports and never sets
// state: each update it writes the inputs a player would press into the same queue the keyboard uses
// (input.setAuto), like the autopilot, and the clock steps. game/tools (scratchpad) human15.mjs drives it from
// node, with screenshots.
//
// Behaviour (a casual player's habits): follow the compass; when there, look for the prompt and press it; when the
// card says someone is "eating it" or the Coo tutor says "hold it to swarm", try a swarm at whoever is nearest; when
// something can't be taken, try the obvious other things (peck, swarm), then wait near the spot for the nudge and do
// what it says (signs it names are found by the "Peck the sign" prompt round the place); read every dialogue line
// (a second or so per line); close the Board after a look.

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class HumanCheck {
  constructor(G) {
    this.G = G;
    this.log = [];
    this.mode = 'idle';
    this.s = {};
    this.goalKey = null;
    this.seen = new Set();
  }
  note(msg) { const t = +this.G.state.time.toFixed(1); this.log.push(`[${t}] ${msg}`); }

  /** What the screen shows right now (for the log and the decisions). */
  screen() {
    const G = this.G, gl = G.schemes.goal();
    const tg = G.schemes.targets()[0] || null;   // the HUD compass's target marker (what the goal card points at)
    return {
      goal: gl?.goal || null, obstacle: gl?.obstacle || null, key: gl?.key || null,
      target: tg ? { x: tg.x, z: tg.z, label: tg.label } : null,
      prompt: G.interact.label || null, dialogue: G.dialogue.open ? (G.dialogue.line?.text || '') : null,
      tutor: G.tutorState?.text ? `${G.tutorState.action}: ${G.tutorState.text}` : null,
      // guidance: what the soft marker and the "Where to?" line show (a player sees these)
      markers: [...document.querySelectorAll('#guidemarks .gmark')].filter((m) => m.style.display !== 'none').length,
      where: document.querySelector('#whereto.on')?.textContent || null,
      suggest: document.querySelector('#hud .suggest:not(.off) .tx')?.textContent || null,
      menu: G.menus.open ? G.menus.top?.id || 'menu' : null, cine: !!G.cutscene.locked, cutscene: G.cutscene.running ? G.cutscene.name : null,
      carried: G.state.carried?.id || null, phase: G.state.phase,
      near: G.items.world.filter((w) => Math.hypot(w.x - G.gus.position.x, w.z - G.gus.position.z) < 15).map((w) => `${w.id}@${Math.hypot(w.x - G.gus.position.x, w.z - G.gus.position.z).toFixed(1)}m,y${(w.y - G.gus.position.y).toFixed(1)}`).join(' '),
    };
  }

  steer(tx, tz, out, mag = 1) {
    const G = this.G, p = G.gus.position;
    const dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz) || 1;
    const yaw = G.rig.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw);
    out.stick.x = ((dx / l) * cs - (dz / l) * sn) * mag;
    out.stick.y = ((dx / l) * sn + (dz / l) * cs) * mag;
    return l;
  }

  /** Get to (x, z): fly if it's far, come down near it, walk the last bit. Returns the distance. */
  goTo(t, out, { r = 1.2, alt = 8 } = {}) {
    const G = this.G, gus = G.gus, p = gus.position, s = this.s;
    const d = Math.hypot(t.x - p.x, t.z - p.z);
    if (gus.mode === 'fly' || gus.mode === 'takeoff') {
      const ground = Math.max(G.terrain.heightAt(p.x, p.z), G.terrain.heightAt(t.x, t.z));
      if (d > 9) { this.steer(t.x, t.z, out, 1); if (p.y < ground + alt) out.held.add('flap'); }
      else { this.steer(t.x, t.z, out, Math.min(1, d / 6)); out.held.add('dive'); }
      return d;
    }
    if (d > 22) { s.fk = (s.fk || 0) + 1; if (s.fk % 24 < 4) out.held.add('flap'); this.steer(t.x, t.z, out, 0.6); return d; }
    if (d > r) { this.steer(t.x, t.z, out, d > 3 ? 1 : 0.6); if (d > 4) out.held.add('sprint'); }
    // stuck walking (a rim, a bench): hop
    s.stuckT = (s.lastD != null && Math.abs(s.lastD - d) < 0.002 && d > r) ? (s.stuckT || 0) + 1 : 0;
    s.lastD = d;
    if (s.stuckT > 40) { out.held.add('flap'); s.stuckT = 0; }
    return d;
  }

  /** One update's inputs. */
  tick(dt) {
    const G = this.G, out = { held: new Set(), stick: { x: 0, y: 0 } }, sc = this.screen(), s = this.s;
    s.t = (s.t || 0) + dt;
    // the goal card changed: a fresh plan
    if (sc.key !== this.goalKey) {
      // guidance: how the last card went (found and done without the nudge?)
      if (this.goalKey && this.cardT != null) this.note(`card done in ${(G.state.time - this.cardT).toFixed(0)} s; nudge shown first: ${this.cardNudge ? 'yes' : 'no'}; marker first seen ${this.markerAt != null ? `${this.markerAt.toFixed(0)} s in, ${this.markerD} m from the target` : 'never'}`);
      this.goalKey = sc.key; this.mode = 'follow'; this.s = { t: 0, askWhere: sc.goal ? 30 : 0 }; this.cardT = G.state.time; this.cardNudge = false; this.markerAt = null;
      if (sc.goal) this.note(`goal card: "${sc.goal}" / "${sc.obstacle}" → compass: ${sc.target ? sc.target.label : 'none'}`);
    }
    if (G.state.tracked && G.schemes.nudgeShown(G.state.tracked)) this.cardNudge = true;
    if (sc.markers && this.markerAt == null && sc.target) { this.markerAt = G.state.time - this.cardT; this.markerD = Math.round(Math.hypot(sc.target.x - G.gus.position.x, sc.target.z - G.gus.position.z)); }
    // guidance: a new card, half a second to read it, then "Where to?" (G), like a player asking where that is
    if (s.askWhere > 0 && --s.askWhere === 0 && !sc.dialogue && !sc.menu && !G.cutscene.locked) { out.held.add('where'); G.input.setAuto(out); s.whereAsked = true; return out; }
    if (sc.where && sc.where !== this.lastWhere) { this.lastWhere = sc.where; this.note(`"Where to?" says: ${sc.where}`); }
    // reading: dialogue lines (a second or so each once typed out), the Board (a look, then close it)
    if (sc.dialogue != null) {
      if (!this.seen.has(sc.dialogue)) { this.seen.add(sc.dialogue); this.note(`reads: ${G.dialogue.line?.who || ''}: ${sc.dialogue}`); s.readT = 0; }
      s.readT = (s.readT || 0) + dt;
      if (G.dialogue.shown >= (G.dialogue.line?.text.length || 0) && s.readT > 1.2 && Math.floor(s.readT * 60) % 20 === 0) out.held.add('uiOk');
      G.input.setAuto(out); return out;
    }
    if (sc.menu) { s.menuT = (s.menuT || 0) + dt; if (s.menuT > 2.5) { out.held.add('uiBack'); s.menuT = 0; } G.input.setAuto(out); return out; }
    s.menuT = 0;
    if (sc.cutscene && G.cutscene.locked) { G.input.setAuto(out); return out; }
    // the tutor line says to fly: fly (a tap now and then, like a player trying the key)
    if (/^flap:/.test(sc.tutor || '')) { s.fl = (s.fl || 0) + 1; if (s.fl % 20 < 4) out.held.add('flap'); G.input.setAuto(out); return out; }
    // the Prologue's crumbs: "move over the crumbs to eat"
    if (/crumbs to eat/.test(sc.tutor || '')) { const pile = this.nearestPile(); if (pile) { this.goTo(pile, out, { r: 0.3 }); G.input.setAuto(out); return out; } }
    const plan = this.plan(sc, out);
    if (!plan) this.follow(sc, out);
    G.input.setAuto(out);
    return out;
  }

  nearestPile() {
    const p = this.G.gus.position;
    return (this.G.food.piles || []).filter((q) => Math.hypot(q.x - p.x, q.z - p.z) < 25).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] || null;
  }
  /** People and things in plain view near Gus (what a player can see standing there). */
  nearHumans(r = 9) { const p = this.G.gus.position; return this.G.humans.agents.filter((a) => a.out && Math.hypot(a.x - p.x, a.z - p.z) < r).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); }
  nearItem(id, r = 12) { const p = this.G.gus.position; return this.G.items.world.filter((w) => (!id || w.id === id || (id === 'slice' && w.id.startsWith('slice'))) && Math.hypot(w.x - p.x, w.z - p.z) < r).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] || null; }
  nearSign(r = 30, wantLive = false) { const p = this.G.gus.position; return this.G.signs.list.filter((q) => q.flip === 'peck' && this.G.signs.live(q.id) === wantLive && Math.hypot(q.x - p.x, q.z - p.z) < r).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] || null; }

  /** Hold Coo at someone: walk up to ~2 m, face them, hold it for a moment. Returns true when done. */
  swarmAt(a, out) {
    const s = this.s, p = this.G.gus.position;
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    if ((s.cooT || 0) === 0 && (d > 2.4 || !this.G.gus.grounded)) { this.goTo({ x: a.x + (p.x - a.x) * 1.8 / Math.max(d, 0.1), z: a.z + (p.z - a.z) * 1.8 / Math.max(d, 0.1) }, out, { r: 0.4, alt: 4 }); return false; }   // (on the ground, a couple of metres off)
    s.cooT = (s.cooT || 0) + 1;
    if (s.cooT < 4) { this.steer(a.x, a.z, out, 0.15); return false; }
    if (s.cooT < 52) { out.held.add('coo'); return false; }
    if (s.cooT === 52) this.note(`holds Coo at the ${a.role} (swarm)`);
    s.cooT = s.cooT < 120 ? s.cooT : 0;
    return s.cooT === 0;
  }

  /** Goal-card driven habits on top of "follow the compass". Returns true when it handled this update. */
  plan(sc, out) {
    const G = this.G, s = this.s, g = sc.goal || '';
    // the card says to nap: the Board's "Nap until …" button (opened with the Board key, clicked)
    const nap = G.schemes.cardInfo(G.state.tracked)?.napTo;
    if (nap && G.state.tracked && !G.menus.open && G.gus.grounded && !G.napping && s.t - (s.napAt ?? -99) > 20) {
      s.napAt = s.t; this.note(`card says "Nap until ${nap}": opens the Board and clicks its button`);
      G.openMenu('board');
      const b = document.querySelector(`#board .pc[data-card="${G.state.tracked}"] [data-act="napto"]`) || document.querySelector('#board [data-act="napto"]');
      if (b) b.click(); else this.note('…no Nap button on the card');
      return true;
    }
    // "…a slice off the tourist… eating it": the Coo tutor said hold it to swarm
    if (/slice off the tourist/i.test(g)) {
      const it = this.nearItem('slice', 10);
      if (it) { s.override = { x: it.x, z: it.z }; return false; }
      const t = sc.target, p = G.gus.position;
      if (t && Math.hypot(t.x - p.x, t.z - p.z) > 9) return false;
      const eater = this.nearHumans(30).find((a) => a.holds || a.spec.acc?.includes('slice'));   // (someone eating a slice: plain to see)
      if (eater) { this.swarmAt(eater, out); return true; }
      return false;
    }
    // the peas: try the obvious (peck the tub, swarm them), wait for the nudge, then do what it says
    if (/tub of peas|picnickers' peas/i.test(g)) {   // (guidance: the card names the tub now)
      const tub = this.nearItem('peas', 30);
      const t = sc.target, p = G.gus.position;
      if (!s.stage) s.stage = 'go';
      if (s.stage === 'go') { if (tub) s.stage = 'peck'; else return false; }
      if (s.stage === 'peck') {
        if (/^(Pick up|Guarded:) the peas/.test(sc.prompt || '') && G.gus.grounded) { s.pk = (s.pk || 0) + 1; if (s.pk % 40 === 1) { out.held.add('peck'); this.note(`tries to take the tub: presses Peck at "${sc.prompt}"`); } if (s.pk > 90) s.stage = 'swarm'; return true; }
        this.goTo({ x: tub.x + 0.3, z: tub.z - 0.3 }, out, { r: 0.25 }); return true;   // (up onto the table if need be: a hop)
      }
      if (s.stage === 'swarm') { const a = this.nearHumans(8).find((q) => q.role === 'picnicker'); if (!a || this.swarmAt(a, out)) { s.stage = 'wait'; s.waitT = 0; this.note('nothing works: waits around the picnic'); } return true; }
      if (s.stage === 'wait') {
        s.waitT += 1 / 60;
        if (G.schemes.nudgeShown(G.state.tracked)) { this.note(`the nudge came after ${s.waitT.toFixed(0)} s of waiting: "${G.schemes.step(G.state.tracked).nudge.text}"`); s.stage = 'sign'; }
        return true;
      }
      if (s.stage === 'sign') {
        const sg = this.nearSign(40, false);
        if (!sg) { s.stage = 'grab'; return true; }
        const front = { x: sg.x + Math.sin(sg.yaw) * 1.0, z: sg.z + Math.cos(sg.yaw) * 1.0 };
        this.goTo(front, out, { r: 0.6 });
        if (sc.prompt?.startsWith('Peck the sign')) { s.pk = (s.pk || 0) + 1; if (s.pk % 30 === 1) { out.held.add('peck'); this.note(`pecks the sign up the path (${sg.name})`); } }
        if (G.signs.live(sg.id)) s.stage = 'grab';
        return true;
      }
      if (s.stage === 'grab') {
        if (!tub) return false;
        const guard = G.humans.agents.some((a) => a.out && a.spec.group && Math.hypot(a.x - tub.x, a.z - tub.z) < 3.4);
        if (guard) { this.goTo({ x: tub.x + 4, z: tub.z + 4 }, out, { r: 1 }); return true; }
        this.goTo({ x: tub.x + 0.3, z: tub.z - 0.3 }, out, { r: 0.25 });
        if (sc.prompt?.startsWith('Pick up the peas')) { s.pk = (s.pk || 0) + 1; if (s.pk % 20 === 1) { out.held.add('peck'); this.note('the picnic has walked off: grabs the tub'); } }
        return true;
      }
    }
    return false;
  }

  /** The default: follow the compass; there, press the prompt if it's one that does something. */
  follow(sc, out) {
    const G = this.G, s = this.s;
    const t = s.override || sc.target;
    if (!t) return;
    const d = this.goTo(t, out, { r: s.override ? 0.3 : 1.0 });   // (right up to a thing on the ground)
    const chat = /^Talk to/.test(sc.prompt || '') && !(t.label && sc.prompt.includes(t.label.split(' ').pop()));   // (small talk with whoever's there isn't the goal)
    if (sc.prompt && !chat && d < 6 && /^(Peck the sign|Talk to|Pick up|Guarded:|Give|Offer|Peck the|Unlock)/.test(sc.prompt) && G.gus.grounded) {
      s.pk = (s.pk || 0) + 1;
      if (s.pk % 30 === 1) { out.held.add('peck'); this.note(`presses Peck at "${sc.prompt}"`); }
    }
  }
}
