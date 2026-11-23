// Autopilot goals for the 3b Sign War / Slice Run / Lost & Found solutions
// (debug only; real inputs only). Registered when goals-ssf.js is imported.
//   { menuPick: act }      in the open menu, move the focus (uiDown/uiUp) to the button with
//                          data-act=act and press uiOk (e.g. the Nest's "Nap until…")
//   { napAt: nestId, phase }  (helper) fly to a Nest, Peck it, pick Nap, pick the phase
import { PILOT_EXT } from './pilot-ext.js';
import { NESTS } from '../world/layout.js';

// (re-importing this file with a cache-busting query replaces its handlers, so a live page can pick up changes)
let regN = 0;
function reg(fn) {
  const tag = 'ssf' + regN++;
  fn._tag = tag;
  const i = PILOT_EXT.findIndex((h) => h._tag === tag);
  if (i >= 0) PILOT_EXT.splice(i, 1, fn); else PILOT_EXT.push(fn);
}

reg((P, g, s, out) => {
  const G = P.G;
  if (g.menuPick) {
    if (s.picked) return ++s.after > 8;
    if (!G.menus.open) return false;
    const root = G.menus.top?.el || document;
    const btns = [...root.querySelectorAll('button')].filter((b) => b.offsetParent);
    const want = btns.findIndex((b) => b.dataset.act === g.menuPick && (!g.id || b.dataset.id === g.id) && (!g.phase || b.dataset.phase === g.phase));
    if (want < 0) throw new Error('no menu button ' + g.menuPick);
    const cur = btns.indexOf(document.activeElement);
    s.m = (s.m || 0) + 1;
    if (s.m % 4) return false;
    if (cur < want) out.held.add('uiDown');
    else if (cur > want) out.held.add('uiUp');
    else { out.held.add('uiOk'); s.picked = true; s.after = 0; }
    return false;
  }
  return undefined;
});

// { pickItem: itemId, near?: {x,z} }   walk to the nearest such item lying in the world and Peck it up
// { talk: charId }                     walk up to a named character and Peck (talk, or give what Gus carries)
reg((P, g, s, out) => {
  const G = P.G, gus = G.gus, p = gus.position;
  if (g.pickItem) {
    if (s.pressed && (G.state.carried?.id === g.pickItem || (s.uid && !G.items.world.some((w) => w.uid === s.uid)))) return true;   // (gear like the remote goes straight to the gear slot)
    const ref = g.near || p;
    const it = G.items.world.filter((w) => w.id === g.pickItem).sort((a, b) => Math.hypot(a.x - ref.x, a.z - ref.z) - Math.hypot(b.x - ref.x, b.z - ref.z))[0];
    if (!it) return false;
    if (gus.mode === 'fly') { out.held.add('dive'); P.stickToward(it.x, it.z, out, 0.5); return false; }
    if (G.interact.current?.t.id === 'item:' + it.uid) { s.uid = it.uid; s.k = (s.k || 0) + 1; if (s.k % 6 < 2) out.held.add('peck'); s.pressed = true; return false; }
    const d = P.stickToward(it.x, it.z, out, 0.7);
    if (d > 3) out.held.add('sprint');
    if (d < 0.2) out.stick.x = out.stick.y = 0;
    return false;
  }
  if (g.talk) {
    const c = G.chars.find(g.talk);
    if (!c) throw new Error('no char ' + g.talk);
    if (s.pressed) { s.n = (s.n || 0) + 1; return s.n > 6 && !G.dialogue.open && !G.cutscene.running; }
    if (gus.mode === 'fly') { out.held.add('dive'); P.stickToward(c.x, c.z, out, 0.5); return false; }
    if (G.interact.current?.t.id === 'char:' + g.talk) { out.held.add('peck'); s.pressed = true; return false; }
    // batch-3: on foot and no closer for 2 s (the water's edge stops a walk now; it used to splash-launch him): fly over
    if (s.lift > 0) { s.lift--; out.held.add('flap'); return false; }
    const d = P.stickToward(c.x, c.z, out, 0.6);
    if (d < (s.best ?? Infinity) - 0.05) { s.best = d; s.stall = 0; } else if ((s.stall = (s.stall || 0) + 1 / 60) > 2) { s.stall = 0; s.best = Infinity; s.lift = 18; }
    if (d > 3) out.held.add('sprint');
    return false;
  }
  return undefined;
});

// { nearHuman: role, d }   walk (or fly, if far) to within d m of the nearest out human with that role
// { humanStopped: role, r } wait until a human of that role within r m of Gus has stopped (the jogger's fountain)
reg((P, g, s, out) => {
  const G = P.G, gus = G.gus, p = gus.position;
  const nearest = (role) => G.humans.agents.filter((a) => a.role === role && a.out).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  if (g.nearHuman) {
    const a = nearest(g.nearHuman);
    if (!a) return false;
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    if (d < (g.d ?? 2.5) && gus.mode !== 'fly') { out.stick.x = out.stick.y = 0; return true; }
    if (gus.mode === 'fly') { P.stickToward(a.x, a.z, out, 1); if (d < 4 || p.y - G.terrain.heightAt(p.x, p.z) > 6) out.held.add('dive'); return false; }
    if (d > 25) { s.k = (s.k || 0) + 1; if (s.k % 30 < 4) out.held.add('flap'); return false; }
    P.stickToward(a.x, a.z, out, 1); if (d > 3) out.held.add('sprint');
    return false;
  }
  if (g.humanStopped) {
    return G.humans.agents.some((a) => a.role === g.humanStopped && a.out && a.stopped && Math.hypot(a.x - p.x, a.z - p.z) < (g.r ?? 8));
  }
  return undefined;
});

// { eatPile: signId }   walk over the crumb pile under a flipped sign until it's eaten (or gone)
// { peckNear: prefix }  Peck the nearest interact target whose id starts with prefix (a box Gus just set down)
reg((P, g, s, out) => {
  const G = P.G, gus = G.gus, p = gus.position;
  if (g.eatPile) {
    s.t2 = (s.t2 || 0) + G.DT;
    const pile = G.food.pileFor(g.eatPile);
    if (!pile) return s.t2 > 12;    // the feeders come within ~10 s
    if (gus.mode === 'fly') { out.held.add('dive'); return false; }
    const d = P.stickToward(pile.x, pile.z, out, 0.8);
    if (d < 0.25) out.stick.x = out.stick.y = 0;
    return pile.amount < 0.5;
  }
  if (g.peckNear) {
    if (s.pressed) { s.pressed++; if (s.pressed <= 3) out.held.add('peck'); return s.pressed > 5; }
    const cur = G.interact.current?.t.id || '';
    if (cur.startsWith(g.peckNear)) { s.pressed = 1; out.held.add('peck'); }
    return false;
  }
  return undefined;
});

// { landNear: {x,z}, alt, r }   fly there at `alt` m, and from ~10 m out hold dive and come straight down
//                               (the stock flyTo can circle a spot for minutes); done when he's on the ground
reg((P, g, s, out) => {
  const G = P.G, gus = G.gus, p = gus.position;
  if (!g.landNear) return undefined;
  const t = g.landNear, dist = Math.hypot(t.x - p.x, t.z - p.z);
  if (gus.grounded && !s.flying) {
    if (dist < (g.r ?? 3)) return true;
    s.k = (s.k || 0) + 1;
    if (s.k < 4) out.held.add('flap'); else if (gus.mode === 'fly') s.flying = true; else if (s.k > 20) s.k = 0;
    return false;
  }
  if (gus.mode === 'fly') {
    s.flying = true;
    const ground = Math.max(G.terrain.heightAt(p.x, p.z), G.terrain.heightAt(t.x, t.z));
    if (dist > 10) { P.stickToward(t.x, t.z, out, 1); if (p.y < ground + (g.alt ?? 6)) out.held.add('flap'); }
    else { P.stickToward(t.x, t.z, out, Math.min(1, dist / 6)); out.held.add('dive'); }
    return false;
  }
  return s.flying && gus.grounded;
});

// { climbTo: h }   take off and flap straight up until h m above the ground
reg((P, g, s, out) => {
  const G = P.G, gus = G.gus, p = gus.position;
  if (g.climbTo == null) return undefined;
  if (p.y - G.terrain.heightAt(p.x, p.z) >= g.climbTo && gus.mode === 'fly') return true;
  s.k = (s.k || 0) + 1;
  if (gus.mode !== 'fly') { if (s.k % 20 < 4) out.held.add('flap'); return false; }
  out.held.add('flap');
  return false;
});

// { napNest: nestId, phase }   Nap at a Nest until `phase` (fly there, Peck it, "Nap until…", pick the phase).
//                              Done at once if it already is that phase.
reg((P, g, s, out, dt) => {
  if (!g.napNest) return undefined;
  const G = P.G, gus = G.gus, p = gus.position;
  if (!s.started) { s.started = true; if (G.state.phase === g.phase) return true; s.i = 0; s.sub = {}; }
  const n = NESTS.find((q) => q.id === g.napNest);
  const steps = [
    { landNear: { x: n.x, z: n.z + 2.5 }, alt: 8, r: 3 },
    { walk: { x: n.x, z: n.z + 0.6 } },
    { peckNest: true },
    { menuPick: 'nap' },
    { menuPick: 'p', phase: g.phase },
    { awake: true },
  ];
  const sg = steps[s.i];
  if (!sg) return true;
  let done = false;
  if (sg.walk) { const d = P.stickToward(sg.walk.x, sg.walk.z, out, 0.8); if (gus.mode === 'fly') out.held.add('dive'); done = d < 0.35 && gus.mode !== 'fly'; if (done) out.stick.x = out.stick.y = 0; }
  else if (sg.peckNest) { s.sub.k = (s.sub.k || 0) + 1; if (G.menus.is('nest')) done = true; else if (G.interact.current?.t.id === 'nest:' + g.napNest && s.sub.k % 8 < 2) out.held.add('peck'); else if (G.interact.current?.t.id !== 'nest:' + g.napNest) P.stickToward(n.x, n.z, out, 0.4); }
  else if (sg.awake) done = !G.napping && !G.menus.open && G.state.phase === g.phase;
  else { for (const h of PILOT_EXT) { const r = h(P, sg, s.sub, out, dt); if (r !== undefined) { done = r; break; } } }
  if (done) { s.i++; s.sub = {}; }
  return false;
});
