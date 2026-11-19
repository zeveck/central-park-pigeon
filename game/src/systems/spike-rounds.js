// Thread 3, Spikes: Prickett's install rounds ("Prickett follows the pigeons").
//   the Prologue's end   P1–P4 (the Prologue's own script installs them)
//   den-horses           his van leaves the trough and he spikes P5 and P6 on his way
//   sab-middle           P7 and P8 go up the next Morning (the Middle signs drew pigeons)
//   sab-north            P9 and P10 the next Morning
//   the Rink Job         his stock is gone: he quits (`prickett.quit`), pending rounds are dropped,
//                        and sites he never installed count as cleared (gamestate.derived)
// Clearing is a talent at the site (clues.js: strips are Knocked off by the cats, nets
// and bolts are cut by the raccoons at Dusk/Night or Lifted off by Rhoda by day).

import { SPIKE_SITES } from '../world/layout.js';

const ROUNDS = { 'den-horses': { ids: ['P5', 'P6'], now: true }, 'sab-middle': { ids: ['P7', 'P8'] }, 'sab-north': { ids: ['P9', 'P10'] } };
const NAME = Object.fromEntries(SPIKE_SITES.map((s) => [s.id, s.name]));

export class SpikeRounds {
  constructor(G) { this.G = G; }
  get st() { return this.G.state; }

  build() {
    const G = this.G;
    G.bus.on('schemeDone', (t, e) => {
      const r = ROUNDS[e.scheme];
      if (!r || this.st.flags['prickett.quit']) return;
      if (r.now) G.later(2.5, () => this.#install(r.ids, 'on his way'));
      else { const p = this.st.spikePending || (this.st.spikePending = []); for (const id of r.ids) if (!p.includes(id)) p.push(id); }
    });
  }

  #install(ids, when) {
    const G = this.G, st = this.st;
    if (st.flags['prickett.quit']) return [];
    const fresh = ids.filter((id) => st.spikes[id] == null);
    if (!fresh.length) return [];
    G.spikes.install(fresh);
    for (const id of fresh) st.flags['spikes.' + id] = true;
    G.audio.play('spray-hiss', { vol: 0.6 });
    const note = `Prickett spiked ${fresh.map((id) => NAME[id]).join(' and ')} ${when}.`;
    G.toast(note, { kind: 'bad', seconds: 5 });
    G.bus.emit('spikesInstalled', { ids: fresh });
    return [note];
  }

  onNap(phase) {
    const st = this.st;
    if (st.flags['prickett.quit']) { st.spikePending = []; return []; }
    if (phase !== 'morning' || !st.spikePending?.length) return [];
    const ids = st.spikePending; st.spikePending = [];
    const fresh = ids.filter((id) => st.spikes[id] == null);
    if (!fresh.length) return [];
    this.G.spikes.install(fresh);
    for (const id of fresh) st.flags['spikes.' + id] = true;
    return [`Prickett was out early: he spiked ${fresh.map((id) => NAME[id]).join(' and ')}.`];
  }

  debug() { return { pending: this.st.spikePending || [] }; }
}
