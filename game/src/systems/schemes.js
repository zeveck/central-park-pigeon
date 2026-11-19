// The scheme engine: reads src/data/schemes.js (the same data the Board, the
// compass, the nudges, the Elders, the save and tools/check-schemes.mjs read).
//
//   open schemes   every scheme whose opensWhen holds and that isn't done
//   steps          each scheme's current step completes when its `on` event (or
//                  condition) happens while its needs hold (or one alternative's)
//   does           setFlags, give, take, and an optional script (a cutscene;
//                  the step completes when the script calls done())
//   lanes          a thread's lane appears on the Board (and its meter on the HUD)
//                  when its first card opens, with a 5 s antagonist intro
//   hints          card (goal + obstacle) → after ~3 min on a step, a regular's
//                  nudge → on request, the Elders' answer (once the turtles join)
// Thread meters are computed from state (gamestate.derived).

import { SCHEMES, SCHEME } from '../data/schemes.js';
import { THREAD } from '../data/threads.js';
import { CREW, CHARACTERS, phaseList, PHASE_LABEL, awakeReason, HAULERS } from '../data/crews.js';
import { PLACES, SIGNS, CLUES, TRADES } from '../world/layout.js';
import { derived } from '../state/gamestate.js';
import { FEUDS } from '../data/crews.js';

const NUDGE_AFTER = 180;   // game seconds on one step
// Fun pass (P7): the nudge clock counts time spent stuck, not time flying about: only within NEAR m of one of the step's
// places (or its targets), and a failure (a cling, a shoo, a cold slice, a wrong-place Call, a lost race or fight) brings
// the nudge to at most AFTER_FAIL seconds away.
const NEAR = 80, AFTER_FAIL = 60;

export class SchemeEngine {
  constructor(G) {
    this.G = G;
    this.scripts = {};       // name → (ctx, done) => void
    this.busy = new Set();   // schemes whose step script is running
    this.pollT = 0;
    this.stepTime = {};      // scheme → game seconds on its current step
    this.lastOpen = [];
    G.bus.on('*', (type, e) => this.onEvent(type, e));
    G.bus.on('fail', () => this.failed());
    G.bus.on('refused', () => this.failed());
    G.bus.on('raceEnd', (t, e) => { if (!e.won) this.failed(); });
  }

  /** Fun pass (P1, P7): which nudges have been shown ('scheme.sN' → true). In the save, so the Board's ally names stay
   *  revealed after a load. */
  get nudged() { return this.st.nudged || (this.st.nudged = {}); }
  set nudged(v) { /* (applyState / reseed used to clear a runtime map here: the map now lives in the loaded state) */ }

  /** Fun pass (P7): something the player tried on the tracked step didn't work: its nudge comes within a minute. */
  failed(id = this.st.tracked) {
    if (!id || !this.isOpen(id)) return;
    this.stepTime[id] = Math.max(this.stepTime[id] || 0, NUDGE_AFTER - AFTER_FAIL);
  }

  /** Fun pass (P7): is Gus near enough to the tracked step's places (needs and alternatives) or targets to be working on it? */
  nearStep(id) {
    const step = this.step(id);
    if (!step) return false;
    const pts = [];
    for (const n of [step.needs, ...(step.alts || []).map((a) => a.needs)]) if (n?.place && PLACES[n.place]) pts.push({ ...PLACES[n.place] });
    const tg = step.target || {};
    for (const sid of tg.signs || (tg.sign ? [tg.sign] : [])) { const s = SIGNS.find((q) => q.id === sid); if (s) pts.push({ x: s.x, z: s.z, r: 0 }); }
    if (tg.who) { const c = this.G.chars?.find(tg.who); if (c) pts.push({ x: c.x, z: c.z, r: 0 }); }
    if (tg.at) pts.push({ x: tg.at.x, z: tg.at.z, r: 0 });
    if (!pts.length) return true;
    const g = this.G.gus.position;
    return pts.some((p) => Math.hypot(g.x - p.x, g.z - p.z) <= (p.r || 0) + NEAR);
  }

  registerScript(name, fn) { this.scripts[name] = fn; }

  get st() { return this.G.state; }
  flag(f) { return !!this.st.flags[f]; }
  done(id) { return this.flag(id); }
  stepIndex(id) { return this.st.steps[id] ?? 0; }
  step(id) { const s = SCHEME[id]; return s ? s.steps[this.stepIndex(id)] || null : null; }

  opensWhen(s) {
    const w = s.opensWhen || {};
    const st = this.st;
    if (w.flags && !w.flags.every((f) => this.flag(f))) return false;
    if (w.anyOf && !w.anyOf.every((group) => group.some((f) => this.flag(f)))) return false;
    if (w.atLeast && w.atLeast.of.filter((f) => this.flag(f)).length < w.atLeast.n) return false;
    if (w.crews != null && st.crews.length < w.crews) return false;
    if (w.parts != null && st.parts.length < w.parts) return false;
    if (w.flock != null && derived(st).flock < w.flock) return false;
    return true;
  }

  visible(s) { return s.id !== 'prologue' || this.flag('prologue.card') || this.flag('prologue'); }
  isOpen(id) { const s = SCHEME[id]; return !!s && !this.done(id) && this.opensWhen(s); }
  /** Open schemes the player can see (the Board, the HUD). */
  openList() { return SCHEMES.filter((s) => !this.done(s.id) && this.opensWhen(s) && this.visible(s)).map((s) => s.id); }
  /** Open schemes the engine runs (the Prologue's first step runs before its card shows). */
  activeList() { return SCHEMES.filter((s) => !this.done(s.id) && this.opensWhen(s)).map((s) => s.id); }
  doneList() { return SCHEMES.filter((s) => this.done(s.id)).map((s) => s.id); }

  // ------------------------------------------------------------ needs
  /** Why a step's needs don't hold right now (a short reason), or null. */
  needsReason(needs = {}, ctx = {}) {
    const G = this.G, st = this.st;
    if (needs.phase && !phaseList(needs.phase).includes(st.phase)) return 'Nap until ' + PHASE_LABEL[phaseList(needs.phase)[0]];
    if (needs.flags && !needs.flags.every((f) => this.flag(f))) return 'Not yet';
    if (needs.gear && !st.gear.includes(needs.gear)) return 'Needs the ' + needs.gear;
    if (needs.crumbs && st.crumbs < needs.crumbs) return `Needs ${needs.crumbs} crumbs`;
    if (needs.flock && derived(st).flock < needs.flock) return `Flock ${needs.flock} needed: you have ${derived(st).flock}`;
    if (needs.dove && !st.crews.includes('swells')) return 'Needs Dove in your flock';
    if (needs.item) {
      const c = st.carried;
      const want = needs.item;
      const ok = c && (c.id === want || (want === 'slice' && c.id.startsWith('slice')));
      if (!ok && !ctx.ignoreItem) return 'Needs ' + want;
      if (ok && needs.hot && !G.items.isHot(c)) return "It's COLD.";
    }
    if (needs.signs && !needs.signs.every((id) => G.signs.live(id))) return 'Not all live';
    if (needs.human && G.humans.isOut && !G.humans.isOut(needs.human)) return 'Not around right now';
    if (needs.place && !ctx.anywhere && !this.atPlace(needs.place)) return 'Somewhere else';
    return null;
  }

  atPlace(placeId, p = this.G.gus.position) {
    const pl = PLACES[placeId];
    if (!pl) return true;
    return Math.hypot(p.x - pl.x, p.z - pl.z) <= pl.r + 6;
  }

  // ------------------------------------------------------------ events
  matches(on, type, e) {
    if (!on || on.type !== type) return false;
    switch (type) {
      case 'flip': return !on.sign || on.sign === e.sign;
      case 'talk': return on.who === e.who;
      case 'give': return (on.item === e.item || (on.item === 'slice' && e.item?.startsWith('slice'))) && on.to === e.to && (!on.hot || e.hot);
      case 'pickup': return on.item === e.item || (on.item === 'slice' && e.item?.startsWith('slice') && on.item !== 'slice-anchovy');
      case 'ask': return this.allyFits(on.ally, e.ally) && (!on.place || this.atPlace(on.place, e)) && (!on.clue || on.clue === e.clue);
      case 'talent': return (!on.clue || on.clue === e.clue) && (!on.ally || this.allyFits(on.ally, e.ally)) && (!on.talent || on.talent === e.talent) && (!on.place || this.atPlace(on.place, e));
      case 'haul': return (!on.item || on.item === e.item) && (!on.ally || this.allyFits(on.ally, e.ally));
      case 'trade': return on.id === e.id;
      case 'fed': return !on.sign || on.sign === e.sign;
      case 'boxOpened': return !on.place || this.atPlace(on.place, e);
      case 'coo': return (!on.hold || e.hold) && (!on.place || this.atPlace(on.place));
      case 'peck': return on.target === e.target;
      case 'drop': return on.item === e.item && (!on.place || this.atPlace(on.place, e));
      default: return false;
    }
  }

  /** Does the ally who acted fit the step's ally? 'haul' (any hauler), 'haul-road' (horses only by a road), 'haul-water' (fliers). */
  allyFits(want, got) {
    if (!want || want === got) return true;
    if (!want.startsWith?.('haul')) return false;
    return HAULERS.some((h) => h.crew === got && (want !== 'haul-water' || h.flier));
  }

  /** A counted event (three slices for Big Sal, two pipes): true once the count is reached. */
  #counted(id, idx, on) {
    if (!on.count || on.count <= 1) return true;
    const k = `${id}.s${idx + 1}`;
    const c = this.st.counts || (this.st.counts = {});
    c[k] = (c[k] || 0) + 1;
    if (c[k] < on.count) { this.G.toast(`${c[k]} of ${on.count}`); return false; }
    return true;
  }

  onEvent(type, e) {
    if (type === 'tick') return;
    for (const id of this.activeList()) {
      if (this.busy.has(id)) continue;
      const step = this.step(id);
      if (!step) continue;
      const opts = step.alts ? step.alts.map((a, i) => ({ ...a, i })) : [{ needs: step.needs, on: step.on, does: step.does, reachNeeds: step.reachNeeds, i: -1 }];
      for (const o of opts) {
        if (!this.matches(o.on, type, e)) continue;
        if (this.needsReason(o.needs, { anywhere: true, ignoreItem: type === 'give' || type === 'drop' || type === 'pickup' || type === 'trade' || type === 'talent' || type === 'haul' })) continue;
        if (!this.#counted(id, this.stepIndex(id), o.on)) { e.counted = true; break; }
        this.complete(id, o);
        e.completed = true;
        break;
      }
    }
  }

  /** Conditions that are states, not events: signs live at once, flags a script set, places reached, auto steps. */
  #poll() {
    for (const id of this.activeList()) {
      if (this.busy.has(id)) continue;
      const step = this.step(id);
      if (!step) continue;
      const opts = step.alts ? step.alts.map((a, i) => ({ ...a, i })) : [{ needs: step.needs, on: step.on, does: step.does, reachNeeds: step.reachNeeds, i: -1 }];
      for (const o of opts) {
        const on = o.on || {};
        let hit = false;
        if (on.type === 'signsLive') hit = on.signs.every((s) => this.G.signs.live(s)) && !this.needsReason({ ...o.needs, signs: null, place: null });
        else if (on.type === 'flag') hit = this.flag(on.flag);
        else if (on.type === 'auto') hit = !this.needsReason(o.needs || {}, { anywhere: true });
        else if (on.type === 'reach') hit = this.atPlace(on.place) && (!on.vehicle || this.G.vehicles.driving?.id === on.vehicle) && !this.needsReason({ ...o.needs, ...(o.reachNeeds || {}), place: null });
        if (hit) { this.complete(id, o); break; }
      }
    }
  }

  complete(id, opt) {
    const G = this.G, s = SCHEME[id];
    const idx = this.stepIndex(id);
    const step = s.steps[idx];
    const does = { ...(step.does || {}), ...(opt?.does || {}) };
    const finish = () => {
      this.busy.delete(id);
      this.#apply(does);
      G.state.flags[`${id}.s${idx + 1}`] = true;
      G.state.steps[id] = idx + 1;
      this.stepTime[id] = 0;
      // Fixes-3 (R10): the scheme the player is working on is the one the HUD follows: its first step done, it's tracked
      (G.state.progressAt ||= {})[id] = G.state.time;
      if (idx === 0 && idx + 1 < s.steps.length && this.visible(s)) G.state.tracked = id;
      if (idx + 1 >= s.steps.length) this.#finishScheme(s);
      else { G.audio.play('scheme-step-chime'); if (id !== 'prologue') G.toast(`${s.title}: step ${idx + 1} of ${s.steps.length} done`); }
      G.bus.emit('step', { scheme: id, step: idx + 1 });
      G.autosave('step');
      this.refreshLanes();
    };
    if (does.script) {
      const fn = this.scripts[does.script];
      // abort(): the script gave up (Ruffled, fled the fight); the step stays where it was and can start again
      if (fn) { this.busy.add(id); fn({ scheme: id, step: idx, opt, abort: () => this.busy.delete(id) }, finish); return; }
      console.info('scheme script not built yet (milestone 3):', does.script);
    }
    finish();
  }

  #apply(does) {
    const G = this.G, st = this.st;
    for (const f of does.setFlags || []) st.flags[f] = true;
    const t = does.take || {};
    if (t.crumbs) st.crumbs = Math.max(0, st.crumbs - t.crumbs);
    if (t.item && st.carried?.id === t.item) G.items.take();
    const g = does.give || {};
    if (g.item) G.items.give(g.item);
    if (g.gear && !st.gear.includes(g.gear)) st.gear.push(g.gear);
    if (g.deal) st.deals += g.deal;
  }

  #finishScheme(s) {
    const G = this.G, st = this.st, g = s.gives || {};
    st.flags[s.id] = true;
    for (const f of g.setFlags || []) st.flags[f] = true;
    if (g.crew && !st.crews.includes(g.crew)) {
      st.crews.push(g.crew);
      if (g.flock) { st.flockFrom[g.crew] = g.flock; G.flock?.setRoster(st.flockFrom); }
      if (g.talent && !st.talents.includes(g.talent)) st.talents.push(g.talent);
      const c = CREW[g.crew];
      G.audio.play('crew-joined-jingle');
      G.polaroid?.({ title: '+1 CREW', name: c.name, portrait: c.boss });
      G.crowds?.setFriendly(g.crew, true);
      const boss = CHARACTERS[c.boss];
      if (boss?.voice) G.later(0.6, () => G.audio.voice(boss.voice + '-join'));
    }
    if (g.part && !st.parts.includes(g.part)) { st.parts.push(g.part); G.audio.play('part-fanfare'); }   // polish (P3): no bare "+ PART" toast: the Workshop cutaway's polaroid and note say which part
    if (g.gear && !st.gear.includes(g.gear)) st.gear.push(g.gear);
    if (g.line && !st.lines.includes(g.line)) { st.lines.push(g.line); G.toast(`Slice Lines ${st.lines.length}/3`); G.audio.synth('meterTick'); }
    if (g.truce && !st.truces.includes(g.truce)) { st.truces.push(g.truce); G.toast(`Truces ${st.truces.length}/4`); G.audio.synth('meterTick'); }
    if (g.deal) st.deals += g.deal;
    if (g.scarf && !st.scarves.includes(g.scarf)) st.scarves.push(g.scarf);
    G.bus.emit('schemeDone', { scheme: s.id });
    // Fixes-3 (R10): finishing the tracked scheme tracks the open one most recently moved on (else the first open)
    if (st.tracked === s.id) {
      const at = st.progressAt || {}, open = this.openList();
      st.tracked = [...open].sort((a, b) => (at[b] ?? -1) - (at[a] ?? -1))[0] || null;
    }
  }

  // ------------------------------------------------------------ Fixes-3 (bughunter-2 B1, B5): repairs on Continue
  /** A step whose trigger is already spent but which isn't done can never complete. Saves made by the old autosave
   *  right after a give / talent / trade / haul (while the step's scene was still playing) are exactly that: the item or
   *  clue gone, the step not done. Autosaves now wait for the scene (main.js G.autosave), so this is the backstop for
   *  saves made before that, and for anything that slips through. It gives the trigger back:
   *    talent   the clue is re-armed (its `clue.<id>` flag and the flags it set that would hide it are cleared)
   *    trade    the trade is re-armed, the item it took is handed back, Vesper's fee refunded
   *    haul     a parked huge item can be hauled again; a counted haul/give that reached its count is set one short
   *    pickup   an item already in Gus's beak is put down at his feet (picking it up fires the step)
   *    give     (old saves only: they carry no saveRev) a scripted give whose item is neither carried nor lying in the
   *             park hands the item back (hot, if it's a slice)
   *  A scheme left on a step index past its last step (old part-power step-4 saves) is finished now. Returns notes. */
  repairSpent({ old = false } = {}) {
    const G = this.G, st = this.st, notes = [];
    const fits = (want, id) => !!id && (want === id || (want === 'slice' && id.startsWith('slice') && id !== 'slice-anchovy'));
    const inWorld = (want) => G.items.world.some((w) => fits(want, w.id));
    const carrying = (want) => fits(want, st.carried?.id);
    const handBack = (item) => {
      if (carrying(item) || inWorld(item)) return;
      if (!st.carried) G.items.give(item);
      else { const p = G.gus.position; G.items.spawn(item, p.x + 0.6, p.z + 0.4, { born: item.startsWith('slice') ? st.time : null }); }
    };
    for (const s of SCHEMES) {
      if (this.done(s.id) || !this.opensWhen(s)) continue;
      const idx = this.stepIndex(s.id);
      if (idx >= s.steps.length) { this.#finishScheme(s); notes.push(`${s.id}: finished (step ${idx + 1} of ${s.steps.length})`); continue; }
      const step = s.steps[idx];
      for (const o of step.alts || [step]) {
        const on = o.on || {}, does = { ...(step.does || {}), ...(o.does || {}) };
        const k = `${s.id}.s${idx + 1}`;
        if (on.type === 'talent' && on.clue) {
          const def = CLUES.find((c) => c.id === on.clue);
          if (!def) continue;
          const used = def.perPhase ? st.phaseUsed?.[def.id] : st.flags[`clue.${def.id}`];
          if (!used) continue;
          if (def.perPhase) delete st.phaseUsed[def.id]; else delete st.flags[`clue.${def.id}`];
          for (const f of def.does?.flags || []) if (def.active?.not?.includes(f)) delete st.flags[f];
          // the item it brought up (if it is lying about, not carried) goes back where it came from
          const it = def.does?.item && G.items.world.filter((w) => w.id === def.does.item).pop();
          if (it && !carrying(def.does.item)) G.items.remove(it);
          notes.push(`${k}: clue ${def.id} re-armed`);
        } else if (on.type === 'trade') {
          const def = TRADES.find((t) => t.id === on.id);
          if (!def || !st.flags[`trade.${def.id}`]) continue;
          delete st.flags[`trade.${def.id}`];
          handBack(def.wants);
          st.crumbs += def.crumbs || 0;
          notes.push(`${k}: trade ${def.id} re-armed`);
        } else if (on.type === 'haul' && on.item) {
          if (on.count > 1 && (st.counts?.[k] || 0) >= on.count) { st.counts[k] = on.count - 1; notes.push(`${k}: haul count set to ${on.count - 1}`); }
          for (const w of G.items.world) if (w.id === on.item && w.parked) {
            w.parked = false;
            const sv = st.items.find((q) => q.uid === w.uid); if (sv) sv.parked = false;
            notes.push(`${k}: ${on.item} can be hauled again`);
          }
        } else if (on.type === 'pickup' && on.item && carrying(on.item)) {
          G.items.drop();
          notes.push(`${k}: ${on.item} put down (pick it up again)`);
        } else if (on.type === 'give' && on.item) {
          if (on.count > 1 && (st.counts?.[k] || 0) >= on.count) { st.counts[k] = on.count - 1; handBack(on.item); notes.push(`${k}: give count set to ${on.count - 1}, item handed back`); }
          // (the old autosave was made the moment the item changed hands: Gus stands right by whoever took it)
          else if (old && does.script && !carrying(on.item) && !inWorld(on.item) && this.#byTaker(on.to)) { handBack(on.item); notes.push(`${k}: ${on.item} handed back (old save)`); }
        }
      }
    }
    if (notes.length) { G.clues?.refresh(); this.refreshLanes(); }
    return notes;
  }
  /** Is Gus within 5 m of this taker (a character id, or a human role)? */
  #byTaker(to) {
    const G = this.G, p = G.gus.position;
    const c = G.chars?.find(to);
    const a = c ? null : G.humans.agents.find((h) => h.role === to && h.out);
    const t = c || a;
    return !!t && Math.hypot(t.x - p.x, t.z - p.z) < 5;
  }

  // ------------------------------------------------------------ lanes, nudges, the fixed update
  refreshLanes() {
    const G = this.G, st = this.st;
    for (const id of [...this.openList(), ...this.doneList()]) {
      const t = SCHEME[id].thread;
      if (!t || st.lanes.includes(t)) continue;
      st.lanes.push(t);
      G.bus.emit('lane', { thread: t });
      const th = THREAD[t];
      if (G.cutscene?.name !== 'prologue-end') G.toast(`New on your Scheme Board: ${th.name}`, { kind: 'stamp', seconds: 5 });
      G.laneIntro?.(t);
    }
    if (!st.tracked || this.done(st.tracked) || !this.isOpen(st.tracked)) st.tracked = this.openList()[0] || null;
  }

  update(dt) {
    const G = this.G;
    this.pollT += dt;
    if (this.pollT >= 0.25) { this.pollT = 0; this.#poll(); }
    // the nudge timer for the tracked step
    if (!this.st.tracked && this.activeList().includes('prologue')) this.st.tracked = 'prologue';
    const id = this.st.tracked;
    if (id && !this.busy.has(id)) {
      if (this.stepTime[id] >= NUDGE_AFTER - AFTER_FAIL || this.nearStep(id)) this.stepTime[id] = (this.stepTime[id] || 0) + dt;   // fun pass (P7)
      const step = this.step(id);
      const key = `${id}.s${this.stepIndex(id) + 1}`;
      if (step?.nudge && this.stepTime[id] > NUDGE_AFTER && !this.nudged[key]) {
        this.nudged[key] = true;
        const who = CHARACTERS[step.nudge.by];
        G.toast(`${who?.name || 'Someone'} has a hint for you (Scheme Board).`, { seconds: 4 });
        G.bubbles.add(step.nudge.text, { at: () => ({ x: G.gus.position.x, y: G.gus.position.y + 0.9, z: G.gus.position.z }), ttl: 6, range: 200 });
      }
    }
  }

  nudgeShown(id) { return !!this.nudged[`${id}.s${this.stepIndex(id) + 1}`]; }

  /** "Ask the Elders": the current step's answer, once the turtles have joined. */
  eldersAnswer(id = this.st.tracked) {
    if (!this.st.crews.includes('turtles')) return { locked: true, text: 'The Elders haven\'t joined yet. Something is on their rock.' };
    const step = this.step(id);
    if (!step) return { text: 'Nothing to ask about.' };
    return { text: step.answer?.text || `${step.goal} ${step.obstacle || ''}`.trim(), icon: step.answer?.icon || null };
  }

  /** The HUD's one-line goal for the tracked scheme. */
  goal() {
    const id = this.st.tracked;
    if (!id || !this.visible(SCHEME[id])) return null;
    if (this.busy.has(id)) return null;   // Fixes-2 (P8): the step just done is playing out; its old goal would be stale
    const step = this.step(id);
    if (!step) return null;
    return { key: `${id}.${this.stepIndex(id)}`, goal: step.goal, obstacle: step.obstacle, scheme: id };
  }

  /** Compass targets for the tracked step (or, Fixes-2, any open scheme's current step: the map's dim rings). */
  targets(id = this.st.tracked) {
    const step = id ? this.step(id) : null;
    const out = [];
    if (!step || this.busy.has(id)) return out;
    const tg = step.target || {};
    const signs = tg.signs || (tg.sign ? [tg.sign] : []);
    for (const sid of signs) if (!this.G.signs.live(sid)) { const s = SIGNS.find((q) => q.id === sid); out.push({ x: s.x, z: s.z, icon: 'target', label: s.name }); }
    // fun pass (first-15 check): a talk or give step with no target of its own points at whoever it's for (the compass
    // showed only the place, and vanished on arrival: "Meet Subway Sue" left a new player circling Columbus Circle)
    if (tg.at) out.push({ x: tg.at.x, z: tg.at.z, icon: 'target', label: tg.at.label });   // fun pass: a spot (the tourist's bench, the picnic)
    const who = tg.who || [step.on, ...(step.alts || []).map((a) => a.on)].map((o) => (o?.type === 'talk' ? o.who : o?.type === 'give' ? o.to : null)).find((w) => w && CHARACTERS[w]);
    if (who) { const c = this.G.chars?.find(who); if (c) out.push({ x: c.x, z: c.z, icon: 'target', label: CHARACTERS[who].name }); }
    if (!out.length && step.needs?.place && !this.atPlace(step.needs.place)) { const p = PLACES[step.needs.place]; out.push({ x: p.x, z: p.z, icon: 'target', label: p.name }); }
    return out;
  }

  /** What a card shows: phase need, cost, other threads' friends. */
  cardInfo(id) {
    const s = SCHEME[id];
    const step = this.step(id);
    const needs = step?.needs || step?.alts?.[0]?.needs || {};
    const phases = needs.phase ? phaseList(needs.phase) : null;
    const napTo = phases && !phases.includes(this.st.phase) ? phases[0] : null;
    const allies = [needs.ally, ...(needs.allies || [])].filter(Boolean).filter((a) => CREW[a]);
    const tags = allies.map((a) => ({ crew: a, thread: CREW[a].thread, other: CREW[a].thread !== s.thread }));
    // Fun pass (P1): working out WHO fits the clue is the puzzle, so the ally's name shows only once the nudge has (or the
    // Elders were asked); before that a friend from another thread is "a friend from the Slice Run", and the flock size
    // only when the size itself is the obstacle (more than the Swells' 6)
    const revealed = this.nudgeShown(id) || this.G.ui?.eldersFor === id;
    return { phases, napTo, crumbs: needs.crumbs || 0, flock: needs.flock > 6 ? needs.flock : 0, tags, revealed, awake: allies.map((a) => awakeReason(a, this.st.phase)).filter(Boolean) };
  }

  /** Fixes-2 (P2): the places the open cards name (each one's current step, alternatives included), for the map. */
  cardPlaces() {
    const out = new Map();
    for (const id of this.openList()) {
      const step = this.step(id);
      if (!step) continue;
      for (const n of [step.needs, ...(step.alts || []).map((a) => a.needs)]) if (n?.place && PLACES[n.place]) {
        const e = out.get(n.place) || { place: n.place, ...PLACES[n.place], tracked: false };
        if (id === this.st.tracked) e.tracked = true;
        out.set(n.place, e);
      }
    }
    return [...out.values()];
  }

  summary() {
    return {
      open: this.openList(), done: this.doneList(), tracked: this.st.tracked,
      steps: Object.fromEntries(this.openList().map((id) => [id, this.stepIndex(id)])),
      busy: [...this.busy],
    };
  }
}

export { FEUDS };
