// Calling allies ("Calling allies"): no escorts. Pick an ally on the wheel and
// Call: they arrive in about 3 s from the nearest cover with their entrance
// (squirrels drop out of a tree, ducks pop up from the water, crows swoop
// down, raccoons climb out of a drain, rats pop out of a grate, cats slink in,
// horses clop in along the road, songbirds flutter down, geese waddle up,
// Biscuit bounds in, Rhoda dives). Ask (from the wheel, or Peck them) to use
// their talent here. Who can come when, and the feuds, grey them out with a
// reason. A Call to the wrong place plays a funny line and nothing is lost.
// Called allies go home when Gus naps.

import { CREW, CREWS, CHARACTERS, FEUDS, WRONG_PLACE, awakeReason } from '../data/crews.js';
import { PLACES } from '../world/layout.js';

// #43: what each boss's <voice>-call.mp3 says (the generation texts, tags stripped): the Call bubble shows it
const CALL_LINES = {
  hazel: 'Hazel\'s here! What are we digging?', puddles: 'Commodore Puddles, reporting for duty!', vesper: 'You rang? The Exchange is open.',
  biscuit: 'I\'m here! I\'m here! What do I fetch?', strix: 'Professor Strix. Present, if not thrilled.', rigby: 'Night Crew\'s here. Where\'s the job?',
  sue: 'Next stop: you. Sue\'s here.', rhoda: 'Rhoda, on the wing. Who needs lifting?', bigsal: 'Meer Mob\'s here. Who we leanin\' on?',
  queenie: 'Queenie\'s here, baby. Make it quick.', clementine: 'Easy now. Clementine\'s here.', mimi: 'Mimi\'s on! What sound you need?',
  gertrude: 'GERTRUDE IS HERE! MOVE IT!', duchess: 'The Swells have arrived, darling.', eldest: 'We... are... here.', vibrato: 'The Choir has ARRIVED!',
  wingate: 'Coach Wingate! Let\'s GO, people!',
};

export class Allies {
  constructor(G) {
    this.G = G;
    this.wrongIdx = {};
  }

  get st() { return this.G.state; }

  /** Recruited allies the wheel shows (up to 12), in crew order. */
  list() {
    return CREWS.filter((c) => c.callable && this.st.crews.includes(c.id)).slice(0, 12).map((c) => ({ crew: c.id, name: CHARACTERS[c.boss].name, boss: c.boss, portrait: c.boss, reason: this.reason(c.id), here: this.isHere(c.id) }));
  }

  /** Why this ally can't come here and now, or null. */
  reason(crewId, p = this.G.gus.position) {
    const r = awakeReason(crewId, this.st.phase);
    if (r) return r;
    for (const f of FEUDS) {
      if (f.crew !== crewId || this.st.flags[f.until]) continue;
      for (const pl of f.places) { const P = PLACES[pl]; if (P && Math.hypot(p.x - P.x, p.z - P.z) < P.r + 4) return f.why; }
    }
    return null;
  }

  isHere(crewId) {
    const c = this.G.chars.find(CREW[crewId].boss);
    return !!c?.here && Math.hypot(c.x - this.G.gus.position.x, c.z - this.G.gus.position.z) < 12;
  }

  call(crewId) {
    const G = this.G, crew = CREW[crewId];
    const why = this.reason(crewId);
    if (why) { G.toast(why, { kind: 'bad' }); G.audio.synth('uiBack'); return false; }
    const c = G.chars.find(crew.boss);
    if (!c) return false;
    const g = G.gus;
    const to = { x: g.position.x + Math.sin(g.yaw + 0.7) * 1.3, z: g.position.z + Math.cos(g.yaw + 0.7) * 1.3 };
    to.y = G.surfaceY(to.x, to.z, g.position.y + 0.4);
    c.here = { x: to.x, z: to.z, at: G.state.time };
    G.chars.arrive(c, to, crew.entrance, 3);
    this.st.called = this.st.called.filter((q) => q.crew !== crewId).concat([{ crew: crewId, x: to.x, z: to.z }]);
    G.audio.play(crew.blip === 'coo' ? 'coo-gather' : crew.blip, { at: to });
    G.later(3, () => {
      if (CHARACTERS[crew.boss]?.voice) G.audio.voice(CHARACTERS[crew.boss].voice + '-call');
      const said = CALL_LINES[crew.boss];   // #43: the bubble shows what the boss's call voice actually says
      G.bubbles.add(said ? `${CHARACTERS[crew.boss].name.split(' ').pop()}: "${said}"` : CHARACTERS[crew.boss].name.split(' ').pop() + ' is here.', { at: () => ({ x: c.x, y: c.y + 0.7, z: c.z }), ttl: said ? 2.8 : 2 });
    });
    G.bus.emit('call', { ally: crewId, x: to.x, z: to.z });
    return true;
  }

  /** Ask an ally who is here to use their talent. */
  ask(c) {
    const G = this.G;
    const crewId = c.def.crew;
    // a talent at a clue spot, a huge item, a trade, a human in the way, a grate (systems/clues.js)
    if (G.clues?.ask(c, crewId)) return;
    const before = G.schemes.summary().steps;
    G.bus.emit('ask', { ally: crewId, x: c.x, z: c.z });
    const after = G.schemes.summary().steps;
    if (JSON.stringify(before) === JSON.stringify(after) && !G.schemes.busy.size) this.wrongPlace(crewId, c);
  }

  wrongPlace(crewId, c) {
    const lines = WRONG_PLACE[crewId] || ['Nothing here, Gus.'];
    const i = (this.wrongIdx[crewId] = ((this.wrongIdx[crewId] ?? -1) + 1)) % lines.length;
    this.G.say([{ who: CREW[crewId].boss, text: lines[i] }]);
    this.G.bus.emit('fail', { kind: 'wrongPlace', ally: crewId });   // fun pass (P7): the nudge clock
  }

  /** The wheel's action: Call if they're not here yet, else Ask. */
  use(crewId) {
    if (this.isHere(crewId)) this.ask(this.G.chars.find(CREW[crewId].boss));
    else this.call(crewId);
  }

  onNap() {
    for (const q of this.st.called) { const c = this.G.chars.find(CREW[q.crew].boss); if (c) this.G.chars.goHome(c); }
    this.st.called = [];
  }

  /** After loading a save: put Called allies back where they were. */
  restore() {
    for (const q of this.st.called) {
      const c = this.G.chars.find(CREW[q.crew].boss);
      if (!c) continue;
      c.here = { x: q.x, z: q.z };
      c.x = q.x; c.z = q.z; c.y = this.G.surfaceY(q.x, q.z, 50);
    }
  }
}
