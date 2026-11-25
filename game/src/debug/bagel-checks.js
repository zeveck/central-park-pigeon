// #44/#45 checks (debug only): run in the page through sf-run's job server, e.g.
//   eval const C = await import('/src/debug/bagel-checks.js'); return await C.bribe(window.__sfG, 'squirrels')
// Each sets the scene up from the jumbo-order fixture, acts through the game's own systems, steps the fixed clock and
// returns what happened (the bubbles said, the map regions, the bagel's fate), stopping where a picture is worth taking.
import { BRIBES } from '../data/bagels.js';

const A = () => window.__game;
const step = (n, render = 'none') => A().step(n, { render });

/** Bubbles said from now on (texts). */
function listen(G) {
  const said = [];
  if (!G.bubbles.__bagelSpy) {
    const add = G.bubbles.add.bind(G.bubbles);
    G.bubbles.add = (text, o) => { (G.bubbles.__said ||= []).push(text); return add(text, o); };
    G.bubbles.__bagelSpy = true;
  }
  G.bubbles.__said = said;
  return said;
}

const PHASE = { owls: 'night', raccoons: 'dusk', herons: 'morning', horses: 'morning' };

/** Put Gus by an animal of `group` (active, not mid-anything), drop a bagel `d` m short of it and step until the treat is
 *  over (or `until` says stop: 'tip' = the tip bubble is up). opts: { friendly, item, d, until, air, phase, near } */
export async function bribe(G, group, opts = {}) {
  const { friendly = false, item = 'bagel', d = 3.2, until = null, air = false } = opts;
  if (!opts.keep) {
    G.menus.closeAll();
    await A().goToScheme('jumbo-order');
    step(2);
    G.menus.closeAll();
  }
  const key = { dogs: 'biscuit', owls: 'strix', hawks: 'rhoda' }[group] || group;
  A().dev.setPhase(opts.phase || PHASE[group] || 'morning');
  step(4);
  const crew = G.crowds.animals.find((a) => a.group === group)?.crew;
  if (friendly && crew && !G.state.crews.includes(crew)) G.state.crews.push(crew);
  if (!friendly && crew) G.state.crews = G.state.crews.filter((c) => c !== crew || c === 'swells');
  if (opts.clearHint && crew) delete (G.state.leadHints || {})[key];
  const C = G.crowds;
  const pool = C.animals.filter((a) => a.group === group && C.active(a) && a.state !== 'treat' && (!opts.near || Math.hypot(a.x - opts.near.x, a.z - opts.near.z) < 40));
  if (!pool.length) return { group, error: 'no active animal' };
  // the first animal (by index) with somewhere Gus can stand d m from it, at its own level (a roof, a ledge, the shore)
  let a = null, gx = 0, gz = 0, gy = 0;
  for (const b of pool.sort((p, q) => p.i - q.i).slice(opts.pick || 0)) {
    for (let k = 0; k < 16 && !a; k++) {
      const ang = k * 0.785 + (k >= 8 ? 0.39 : 0), dd = k >= 8 ? d * 1.4 : d;
      const x = b.x + Math.cos(ang) * dd, z = b.z + Math.sin(ang) * dd;
      const sf = G.collision.surface(x, z, b.yBase + 1.0);
      if (sf.kind === 'water' || Math.abs(sf.y - b.yBase) > 0.6) continue;
      if (Math.abs(sf.y - G.terrain.heightAt(x, z)) < 0.3 && G.collision.standable(x, z) == null) continue;
      a = b; gx = x; gz = z; gy = sf.y;
    }
    if (a) break;
  }
  if (!a && (group === 'owls' || group === 'hawks')) { a = pool[0]; gx = a.x + 1.5; gz = a.z + 1.5; gy = G.surfaceY(gx, gz, G.terrain.heightAt(gx, gz) + 0.5); }   // (under it)
  if (!a) return { group, error: 'nowhere to stand by one' };
  const yaw = Math.atan2(a.x - gx, a.z - gz);
  G.gus.place({ x: gx, y: air ? gy + 4 : gy, z: gz, yaw, mode: air ? 'fly' : 'walk' });
  a.state = 'idle'; a.t = 5;
  // a camera behind Gus looking past him at the animal (the follow camera kept its old heading after the place)
  { const dl = Math.hypot(a.x - gx, a.z - gz) || 1, ux = (a.x - gx) / dl, uz = (a.z - gz) / dl;
    A().dev.freeCam({ pos: [gx - ux * 2.6 + uz * 0.8, gy + (air ? 5.2 : 1.3), gz - uz * 2.6 - ux * 0.8], look: [(gx + a.x) / 2, a.yBase + 0.3, (gz + a.z) / 2] }); }
  step(20);
  const said = listen(G);
  const hint0 = !!G.state.leadHints?.[key];
  G.items.give(item);
  const it = G.items.drop();
  const uid = it?.uid;
  const log = [];
  let treated = null, bubbleTip = false;
  const B = BRIBES[key] || {};
  for (let k = 0; k < 900; k++) {
    step(1);
    const t = G.crowds.animals.find((x) => x.state === 'treat');
    if (t && !treated) treated = { group: t.group, i: t.i, d: +Math.hypot(t.x - (it?.x ?? 0), t.z - (it?.z ?? 0)).toFixed(1) };
    if (B.tip && said.includes(B.tip)) bubbleTip = true;
    if (until === 'tip' && bubbleTip) break;
    if (until === 'excited' && treated && said.length) break;
    if (until === 'eat' && G.crowds.animals.some((x) => x.state === 'treat') && !G.items.world.some((w) => w.uid === uid)) break;
    if (k > 60 && !G.crowds.animals.some((x) => x.state === 'treat') && !until) { step(240); break; }
  }
  log.push(...said);
  return {
    group, key, wary: !friendly, treated, said: log, tip: bubbleTip, hintBefore: hint0, hintAfter: !!G.state.leadHints?.[key],
    bagelLeft: G.items.world.some((w) => w.uid === uid), toast: G.hud?.toasts?.map?.((q) => q.text) || null,
  };
}

/** The menu at this window size: open it at the bell, and report the layout (every button inside the viewport?). */
export async function menu(G, { pick = null } = {}) {
  G.menus.closeAll();
  await A().goToScheme(pick?.fixture || 'jumbo-order', pick?.step);
  step(2);
  G.menus.closeAll();
  G.gus.place({ x: -62.6, y: 0.15, z: 1068.4, yaw: 0, mode: 'walk' });
  step(20);
  G.bagelShop.counter('bell');
  step(3, 'last');
  const el = G.menus.top?.el, card = el?.querySelector('.card');
  const out = [...el.querySelectorAll('[data-row]')].filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > innerHeight || r.right > innerWidth || r.top < 0 || r.left < 0; }).map((b) => b.dataset.id);
  return { open: G.menus.is('bagels'), focus: document.activeElement?.dataset?.id, offscreen: out, cardH: card?.getBoundingClientRect().height, scroll: card ? card.scrollHeight > card.clientHeight : null };
}
