// Ledger's Scarf Stash (an optional side collection; purely for fun).
//   falafel   the halal cart man tosses a falafel ball to any pigeon who coos at his cart while he works
//             (Afternoon at Grand Army Plaza, Dusk at 110th & Fifth): one per visit per phase. It's a light
//             item; Peck Ledger with it and it goes in your falafel account ("It's documented.").
//   Ledger    the first time Gus lands near him he admires the slice-orange scarf; from then on, talking
//             to him opens his stash: six scarves to buy with falafel, four to earn (the Choir's rainbow
//             stripe, Ringo's racing red, Dove's wedding white, the bread-print when all 30 signs are permanent)
//   wearing   any Nest's Scarf wardrobe (screens.js); Gus swaps it with a twirl; crews comment now and then
// Scarves change nothing in play and count toward Completionist.

import { MARKET } from '../world/layout.js';
import { SCARVES } from '../ui/screens.js';
import { overlay } from '../ui/menu.js';
import { icon } from '../ui/icons.js';
import { derived } from '../state/gamestate.js';
import { CHARACTERS } from '../data/crews.js';

const PRICE = MARKET.ledger.pricesFalafel;
const COMMENTS = { 'taxi-checker': 'Ooh, the taxi one!', 'subway-blue': 'Very express. Very blue.', 'maple-stripes': 'Autumnal! Love it.', 'ramble-cable': 'Cable knit. Classy.', 'cream-mohair': 'So FLUFFY.', 'rainbow-stripe': 'The Choir colours! Bravo!', 'racing-red': 'Fast scarf. FAST.', 'wedding-white': 'Bridal. Bold.', 'bread-print': 'FEED THE BIRDS! On a scarf!', 'everything-bagel': 'Smells like a Sunday morning.', 'slice-orange': 'The classic.' };

export class Scarves {
  constructor(G) { this.G = G; this.t = 0; }
  get st() { return this.G.state; }

  build() {
    const G = this.G;
    G.menus.add(stashScreen(G, this));
    G.bus.on('coo', (t, e) => { if (!e.hold) this.#coo(); });
    G.bus.on('given', (t, e) => {
      if (e.item !== 'falafel' || e.to !== 'ledger') return;
      this.st.falafel = (this.st.falafel || 0) + 1;
      G.toast(`Falafel in Ledger's book: ${this.st.falafel}`);
    });
    G.bus.on('talk', (t, e) => {
      if (e.who !== 'ledger' || !this.st.flags['ledger.met'] || this.st.carried?.id === 'falafel') return;
      // #44: the first time he sees the Everything Bagel scarf
      const eb = this.st.scarves.includes('everything-bagel') && !this.st.flags['ledger.everything'];
      if (eb) this.st.flags['ledger.everything'] = true;
      G.say([...(eb ? [{ who: 'ledger', text: 'Sesame stitch. From a RACCOON. …It\'s documented.' }] : []), { who: 'ledger', text: this.st.falafel ? `Your account: ${this.st.falafel} falafel. Shall we look at the stash?` : 'The stash is open. Falafel only. It\'s documented.' }], () => G.openMenu('stash'));
    });
    G.bus.on('schemeDone', (t, e) => { if (['den-choir', 'part-talons', 'part-power'].includes(e.scheme)) G.later(4, () => G.toast('A new scarf for the stash!', { kind: 'stamp' })); });
    G.bus.on('scarf', (t, e) => { this.comment = { id: e.id, t: 0 }; });
  }

  /** Coo at the halal cart while he works: a falafel ball, once a phase. */
  #coo() {
    const G = this.G, st = this.st, g = G.gus.position;
    const man = G.humans.agents.find((a) => a.out && a.role === 'halal' && Math.hypot(a.x - g.x, a.z - g.z) < 4);
    if (!man) return;
    if (st.flags['falafel.got']) { G.bubbles.add('One per bird, pal.', { at: () => ({ x: man.x, y: (man.y ?? 0) + 2.05, z: man.z }), ttl: 1.8 }); return; }
    st.flags['falafel.got'] = true;
    G.humans.play(man, 'throw', 1.2);
    G.bubbles.add('Here, little guy.', { at: () => ({ x: man.x, y: (man.y ?? 0) + 2.05, z: man.z }), ttl: 1.8 });
    const to = { x: g.x + Math.sin(G.gus.yaw) * 0.45, z: g.z + Math.cos(G.gus.yaw) * 0.45 };
    const y1 = G.surfaceY(to.x, to.z, g.y + 0.3), y0 = (man.y ?? 0) + 1.3;
    G.later(0.5, () => {
      const it = G.items.spawn('falafel', man.x, man.z, { y: y0 });
      G.clues.anims.push({ t: 0, secs: 0.7, step: (k) => { it.x = man.x + (to.x - man.x) * k; it.z = man.z + (to.z - man.z) * k; it.y = y0 + (y1 - y0) * k + Math.sin(Math.PI * k) * 1.2; it.mesh.position.set(it.x, it.y, it.z); },
        done: () => { const sv = st.items.find((q) => q.uid === it.uid); if (sv) { sv.x = it.x; sv.y = it.y; sv.z = it.z; } G.audio.play('drop-thud', { at: to, vol: 0.4 }); } });
    });
  }

  buy(id) {
    const G = this.G, st = this.st;
    const p = PRICE[id];
    if (!p || st.scarves.includes(id)) return false;
    if ((st.falafel || 0) < p) { G.toast(`${p} falafel for that one. You have ${st.falafel || 0}.`, { kind: 'bad' }); return false; }
    st.falafel -= p;
    st.scarves.push(id);
    G.audio.play('trade-ka-ching', { ui: true });
    G.toast('Ledger wraps it up. "A fine choice."', { kind: 'stamp' });
    G.autosave('scarf');
    return true;
  }

  update(dt) {
    const G = this.G, st = this.st, g = G.gus.position;
    this.t += dt;
    // Ledger notices the scarf, the first time Gus lands near him
    if (!st.flags['ledger.met'] && G.gus.grounded && !G.dialogue.open && !G.cutscene.locked) {
      const L = G.chars.find('ledger');
      if (L && G.chars.out(L) && Math.hypot(L.x - g.x, L.z - g.z) < 4) {
        st.flags['ledger.met'] = true;
        G.say([{ who: 'ledger', text: 'Now THAT is a scarf. Hand-knit? Tell me it\'s hand-knit.' }, { who: 'ledger', text: 'I keep a little stash myself. Bring me falafel from the halal cart and we\'ll talk knitwear.' }]);
      }
    }
    // the bread-print: all 30 signs permanent (fix-38: Bread Power now counts live flips too)
    if (!st.scarves.includes('bread-print') && derived(st).permanentSigns >= 30) { st.scarves.push('bread-print'); G.toast('The bread-print scarf is yours!', { kind: 'stamp' }); }
    // crews comment on a new scarf now and then
    const c = this.comment;
    if (c && (c.t += dt) > 1.5) {
      const who = G.chars.list.find((q) => G.chars.out(q) && Math.hypot(q.x - g.x, q.z - g.z) < 7 && st.crews.includes(CHARACTERS[q.id]?.crew));
      if (who) { G.bubbles.add(COMMENTS[c.id] || 'Nice scarf!', { at: () => ({ x: who.x, y: who.y + 0.6, z: who.z }), ttl: 2.5 }); this.comment = null; }
      else if (c.t > 120) this.comment = null;
    }
  }

  debug() { return { falafel: this.st.falafel || 0, scarf: this.st.scarf, owned: [...this.st.scarves], ledgerMet: !!this.st.flags['ledger.met'] }; }
}

/** Ledger's stash: buy scarves with falafel (the Nest wardrobe is where you wear them). */
function stashScreen(G, S) {
  const el = overlay('stash', `<h2>Ledger's Scarf Stash</h2><p class="muted bal"></p><div class="list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px"></div><div class="hints" data-auto='[["uiOk","Buy"],["uiBack","Back"]]'></div>`);
  const list = el.querySelector('.list'), bal = el.querySelector('.bal');
  const s = {
    id: 'stash', el,
    open() {
      const st = G.state;
      bal.textContent = `Your falafel: ${st.falafel || 0}. Wear scarves from any Nest's wardrobe.`;
      list.innerHTML = SCARVES.map((sc) => {
        const own = st.scarves.includes(sc.id), price = PRICE[sc.id];
        const sub = own ? 'In your stash' : price ? `${price} falafel` : sc.how;
        const can = !own && price && (st.falafel || 0) >= price;
        return `<button type="button" class="btn small${can ? '' : ' dis'}" data-act="buy" data-id="${sc.id}"><img src="assets/textures/scarf-${sc.id}.jpg" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover"><span>${sc.name}<br><small style="opacity:.75">${sub}</small></span></button>`;
      }).join('') + `<button type="button" class="btn small" data-act="close">${icon('close')}<span>Done</span></button>`;
    },
    back() { G.menus.closeAll(); G.resume(); },
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.classList.contains('dis')) return;
    if (b.dataset.act === 'buy') { if (S.buy(b.dataset.id)) s.open(); }
    else if (b.dataset.act === 'close') s.back();
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
  return s;
}
