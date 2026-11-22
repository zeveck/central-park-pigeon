// Batch-3 (#1): Gus and the water, as state checks (debug only; nothing in the game imports it).
//   const m = await import('/src/debug/float-checks.js'); await m.runFloatChecks(window.__sfG, window.__game)
// (sf-run.mjs serve: an `eval` job, after a fixture is loaded). Each check drives Gus with input.setAuto on the fixed clock.
//   talk   every character out on the water or at its edge: Gus floats at the nearest water within 4.5 m, and Peck's
//          target is that character (and the strip reads "Flap to take off")
//   edge   walking into the water from the bank stops at the edge (on dry ground, a little splash)
//   settle a slow glide down onto the water floats him; a fast skim (cruise, low) still splash-bounces
//   paddle about 0.5 m/s; takeoff: Flap leaves the water and he is still up a second later; drop while afloat floats back

import { CHARACTERS } from '../data/crews.js';

const ext = (G, n, auto = {}) => { G.input.setAuto(auto); for (let i = 0; i < n; i++) G.update(G.DT); };
const r2 = (v) => Math.round(v * 100) / 100;

function waterSpot(G, c, maxR = 4.4) {
  const C = G.collision;
  let best = null;
  for (let d = 0.6; d <= maxR; d += 0.2) {
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      const w = C.waterAt(x, z);
      if (!w || C.deckAt(x, z) !== -Infinity || G.terrain.heightAt(x, z) > w.level - 0.05) continue;
      if (C.solidAt(x, w.level + 0.2, z) || C.surface(x, z, w.level + 0.05).kind !== 'water') continue;   // open water (not a rock's edge)
      best = { x, z, y: w.level, d };
      break;
    }
    if (best) break;
  }
  return best;
}

function floatAt(G, p, yaw) {
  G.gus.place({ x: p.x, z: p.z, y: p.y, yaw, mode: 'walk' });
  G.rig.yaw = yaw;
  ext(G, 3);
  return G.gus.floating;
}

export async function runFloatChecks(G, api) {
  const out = { talk: [], checks: {} };
  const phaseFor = (def) => { const o = def.out; return o === 'dusk' ? 'dusk' : o === 'dusk-night' ? 'dusk' : o === 'night' ? 'night' : 'afternoon'; };
  // ---- talk from the water
  const seen = [];
  const te = G.gus.takeEvents.bind(G.gus);
  G.gus.takeEvents = () => { const e = te(); for (const q of e) seen.push(q.type); return e; };
  const ids = Object.entries(CHARACTERS).filter(([, d]) => d.at && (d.at.on?.startsWith('water:') || d.at.shore)).map(([id]) => id);
  for (const id of ['eldest', 'moss', 'shelly']) if (!ids.includes(id)) ids.push(id);   // the Elders on their rock in Turtle Pond
  for (const id of ids) {
    const def = CHARACTERS[id], c = G.chars.byId[id];
    if (!c) { out.talk.push({ id, ok: false, why: 'no character' }); continue; }
    api.dev.setPhase(phaseFor(def));
    G.chars.update(0);
    const p = waterSpot(G, c);
    if (!p) { out.talk.push({ id, ok: false, why: 'no water within 4.4 m' }); continue; }
    const floating = floatAt(G, p, Math.atan2(c.x - p.x, c.z - p.z));
    G.interact.update();
    const cur = G.interact.current;
    G.syncCameras(); G.frameUi(G.DT);
    const el = document.getElementById('flighthints'), strip = el?.classList.contains('on') ? el.innerText : '';
    const ok = floating && cur?.t?.id === 'char:' + id;
    out.talk.push({ id, ok, floating, d: r2(p.d), label: cur?.label || null, target: cur?.t?.id || null, strip: strip.replace(/\s+/g, ' ').trim() });
  }
  api.dev.setPhase('afternoon');
  const C = G.collision;
  // ---- Peck while afloat: talk to Commodore Puddles
  {
    const c = G.chars.byId.puddles, p = waterSpot(G, c);
    floatAt(G, p, Math.atan2(c.x - p.x, c.z - p.z));
    ext(G, 1, { held: ['peck'] }); ext(G, 30);
    out.checks.peck = { ok: G.gus.floating && !!G.dialogue.open, floating: G.gus.floating, dialogue: !!G.dialogue.open };
    G.dialogue.clear?.(); G.cutscene.skip?.(); ext(G, 2);
  }
  // ---- the water's edge: walk south-west into the Lake from its south shore by Puddles (-20, 300.9)
  {
    let bank = null;
    for (let d = 0; d < 12 && !bank; d += 0.25) { const x = -20, z = 300.9 - d; if (!C.waterAt(x, z) && C.standable(x, z, { r: 0.15, h: 0.3 }) != null) bank = { x, z }; }
    G.gus.place({ x: bank.x, z: bank.z - 1.5, y: C.floorAt(bank.x, bank.z - 1.5), yaw: 0, mode: 'walk' });
    G.rig.yaw = 0;
    let wet = 0; seen.length = 0;
    for (let i = 0; i < 240; i++) {
      ext(G, 1, { stick: { x: 0, y: 1 } });
      const g = G.gus.position;
      if (C.waterAt(g.x, g.z) && G.terrain.heightAt(g.x, g.z) < C.waterAt(g.x, g.z).level - 0.05) wet++;
    }
    ext(G, 1);
    const g = G.gus.position;
    out.checks.edge = { ok: wet === 0 && G.gus.mode === 'walk' && !G.gus.floating, mode: G.gus.mode, floating: G.gus.floating, framesOverWater: wet, edgeSplashes: seen.filter((t) => t === 'edge').length, at: { x: r2(g.x), z: r2(g.z) }, distToBankStart: r2(Math.hypot(g.x - bank.x, g.z - bank.z)) };
  }
  // ---- a slow glide down onto the Lake floats him
  const open = { x: -16, z: 303 };   // by Mrs Puddles, open water north of her
  const lv = C.waterAt(open.x, open.z).level;
  {
    G.gus.place({ x: open.x, z: open.z, y: lv + 1.2, yaw: 0, mode: 'fly', speed: 6 }); seen.length = 0;
    let n = 0; while (G.gus.mode === 'fly' && n++ < 600) ext(G, 1);
    out.checks.settle = { ok: G.gus.mode === 'walk' && G.gus.floating && Math.abs(G.gus.position.y - lv) < 0.01, floatEvent: seen.includes('float'), mode: G.gus.mode, floating: G.gus.floating, y: r2(G.gus.position.y), level: lv, secs: r2(n / 60) };
  }
  // ---- paddle: hold forward 3 s
  {
    const a = { x: G.gus.position.x, z: G.gus.position.z };
    G.rig.yaw = G.gus.yaw;
    ext(G, 180, { stick: { x: 0, y: 1 } });
    const d = Math.hypot(G.gus.position.x - a.x, G.gus.position.z - a.z);
    out.checks.paddle = { ok: G.gus.floating && d > 1 && d < 1.7, metres: r2(d), speed: r2(G.gus.speed), floating: G.gus.floating };
  }
  // ---- drop while floating: the ball floats back
  {
    G.items.give?.('ball');
    const had = G.state.carried?.id;
    let toast = '';
    const t0 = G.toast; G.toast = (m, o) => { toast = m; return t0.call(G, m, o); };
    ext(G, 1, { held: ['drop'] }); ext(G, 2);
    G.toast = t0;
    out.checks.drop = { ok: had === 'ball' && !G.state.carried && /float/i.test(toast), had, toast, floating: G.gus.floating };
  }
  // ---- take off from the water: Flap held 0.4 s, then let go; a second later he is still well up
  {
    ext(G, 24, { held: ['flap'] });
    const mode = G.gus.mode;
    ext(G, 60);
    out.checks.takeoff = { ok: mode === 'fly' && G.gus.mode === 'fly' && G.gus.position.y > lv + 1.2, modeAfterFlap: mode, mode1s: G.gus.mode, height: r2(G.gus.position.y - lv) };
  }
  // ---- a fast low skim (cruise) still bounces
  {
    G.gus.place({ x: open.x, z: open.z, y: lv + 0.6, yaw: 0, mode: 'fly', speed: 11 });
    let floated = false; seen.length = 0;
    for (let i = 0; i < 40; i++) { ext(G, 1, { stick: { x: 0, y: 1 }, held: ['dive'] }); if (G.gus.floating) floated = true; }
    const bounced = seen.includes('splash');
    ext(G, 1);
    out.checks.skim = { ok: bounced && !floated, bounced, floated, mode: G.gus.mode };
  }
  G.input.setAuto({});
  G.gus.takeEvents = te;
  out.ok = out.talk.every((t) => t.ok) && Object.values(out.checks).every((c) => c.ok);
  return out;
}
