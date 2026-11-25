// #45 Bagels as bribes (design/changes/batch-g-bagels.md). A bagel Gus has put down on the ground is "live": every 0.5 s
// of game time (while Gus is low: "critters don't look up") the nearest fitting crowd animal within 9 m notices it. It
// gets excited (a hop, its species sound, its line in its crew voice), then eats it (walks over, or it comes to the slow
// ones, or a squirrel grabs it and scampers), and as it eats it lets slip its boss's region (#24's lead hint, if new: the
// map marks it) and the crew's TIP: what the boss wants. Friendly crews just say thanks. Ducks, owls, hawks and herons
// refuse (the bagel stays live), but the ducks, owls and hawks still talk. No random draws (eaters first, then wary, then
// nearest, then the lower index), and only bagel drops get here: no recorded solution carries a bagel.
import { BRIBES, BRIBE_KEY, isBagel, QUEST_BAGEL } from '../data/bagels.js';
import { LEAD_HINTS } from '../data/lead-hints.js';

const JUDGE = 0.5, NEAR = 9, NEAR_Y = 2, FLIER_R = 8, HORSE_R = 2.5;
const EXCITE = 1.5, LINE_AT = 0.45, WALK_MAX = 8;
const keyOf = (a) => BRIBE_KEY[a.group] || a.group;

export function installBagelBribes(G) {
  const C = G.crowds;
  const st = () => G.state;
  let judgeT = 0;
  let T = null;                 // the treat under way: { a, key, uid, id, phase, t, friendly, prop, ... }
  const spoke = new Map();      // bagel uid → Set of crew keys that refused it (a refuser speaks once per bagel)
  const munchRate = (key) => 0.9 + ((key.length * 7) % 5) * 0.05;   // one fixed rate per crew (0.9…1.1)

  const live = (w) => isBagel(w.id) && w.placed && !w.counter && !(w.id === QUEST_BAGEL && G.schemes.isOpen('jumbo-order'));
  const posOf = (a, up = 0.6) => ({ x: a.x, y: a.yBase + up + (a.model === 'horse' ? 2 : 0), z: a.z });
  const say = (a, text, voice, ttl = 3.4) => {
    G.bubbles.add(text, { at: () => posOf(a), ttl, range: 30 });
    if (voice) G.audio.voice(voice, { at: posOf(a), range: 40 });
  };
  const sound = (a, B) => { if (B.sound) G.audio.play(B.sound, { at: posOf(a, 0), vol: 0.8, range: 30, rate: B.soundRate || 1 }); };

  // ------------------------------------------------------------ the "Land first" hint, and drops
  G.bus.on('drop', (t, e) => {
    if (!isBagel(e.item) || e.water || e.repair || G.screen !== 'play') return;
    const g = G.gus.position;
    if (G.gus.mode === 'fly' && g.y - G.terrain.heightAt(g.x, g.z) > 1.5) {
      const pu = (st().phaseUsed ||= {});
      if (!pu['bagel.air']) { pu['bagel.air'] = true; G.toast('Land first, Gus. Critters don\'t look up.', { seconds: 4 }); }
    }
  });

  // ------------------------------------------------------------ who notices a bagel
  function pick(w) {
    const used = spoke.get(w.uid) || new Set();
    let best = null, bs = null;
    let others = false;
    const cand = [];
    for (const a of C.animals) {
      if (a.state === 'away' || a.state === 'scatter' || a.state === 'treat' || !C.active(a)) continue;
      const key = keyOf(a), B = BRIBES[key];
      if (!B) continue;
      const dx = a.x - w.x, dz = a.z - w.z, dy = a.yBase - w.y;
      const flier = key === 'strix' || key === 'rhoda';
      const d = flier ? Math.hypot(dx, dz, dy) : Math.hypot(dx, dz);
      if (d > (flier ? FLIER_R : NEAR) || (!flier && Math.abs(dy) > NEAR_Y)) continue;
      const horseFar = key === 'horses' && d > HORSE_R;
      const refuse = B.react === 'refuse' || horseFar;
      if (refuse && used.has(horseFar ? 'horses-far' : key)) continue;
      if (used.has('a' + a.i)) continue;   // it couldn't reach this bagel last time
      if (key !== 'herons') others = true;
      cand.push({ a, key, B, d, refuse, horseFar, wary: !C.friendly(a.crew) });
    }
    for (const c of cand) {
      if (c.key === 'herons' && others) continue;   // a heron only speaks when no one else is near
      const score = [c.refuse ? 1 : 0, c.wary ? 0 : 1, c.d, c.a.i];
      if (!bs || lexLess(score, bs)) { bs = score; best = c; }
    }
    return best;
  }
  const lexLess = (p, q) => { for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return p[i] < q[i]; return false; };

  // ------------------------------------------------------------ the treat
  function begin(w, c) {
    const { a, key, B } = c;
    const friendly = !c.wary;
    if (c.refuse) (spoke.get(w.uid) || spoke.set(w.uid, new Set()).get(w.uid)).add(c.horseFar ? 'horses-far' : key);
    a.state = 'treat'; a.treatSpeed = 0; a.treatHop = true;
    a.yaw = Math.atan2(w.x - a.x, w.z - a.z);
    T = { a, key, B, uid: w.uid, id: w.id, w, phase: 'excited', t: 0, friendly, refuse: c.refuse, horseFar: c.horseFar, said: false, prop: null };
    sound(a, B);
    G.bus.emit('bribe', { crew: a.crew, key, item: w.id });
  }
  function end(keepState = false) {
    if (!T) return;
    const a = T.a;
    // #44 review: it had the bagel (the crew joined, or the phase ended, before it ate): it still says what it knows
    if (T.prop && !T.spoke) words(T);
    T.prop?.removeFromParent();
    a.treatHop = false; a.treatSpeed = 0;
    if (!keepState && a.state === 'treat') { a.state = 'idle'; a.t = 1.5; a.tx = a.x; a.tz = a.z; }
    T = null;
  }
  C.onTreatEnd = (a) => { if (T?.a === a) end(true); };

  /** The words: the excited line (or thanks) first; as it eats, the hint if new, then the tip (or the lead-in, then the tip). */
  function firstLine() {
    const { a, key, B, friendly } = T;
    if (T.horseFar) return say(a, B.closer, `bribe-horses-closer`, 2.8);
    if (B.refuse) return say(a, B.refuse, B.noVoice ? null : `bribe-${key}-refuse`);
    if (friendly && B.thanks) return say(a, B.thanks, `bribe-${key}-thanks`);
    if (B.excited) say(a, B.excited, `bribe-${key}-excited`);
  }
  function words(W = T, at0 = 0) {
    const { a, key, B, friendly } = W;
    W.spoke = true;
    if (W.horseFar || key === 'herons' || friendly || key === 'swells') return;
    const lines = [];
    const H = LEAD_HINTS[key];
    if (!B.noHint && H) {
      const k = (st().flags[`bribe.${key}.n`] || 0) % H.lines.length;
      st().flags[`bribe.${key}.n`] = (st().flags[`bribe.${key}.n`] || 0) + 1;
      if (C.noteLeadHint(key)) lines.push([H.lines[k], `bribe-${key}-hint${k + 1}`]);
      else lines.push([B.lead, `bribe-${key}-lead`]);
    }
    if (B.tip) lines.push([B.tip, `bribe-${key}-tip`]);
    let at = at0;
    for (const [text, voice] of lines) {
      const ttl = Math.max(2.6, Math.min(5.5, text.length * 0.06));
      G.later(at, () => say(a, text, voice, ttl));
      at += ttl + 0.2;
    }
  }

  function grab() {
    const { a, w } = T;
    if (!G.items.world.includes(w)) { end(); return false; }   // Gus snatched it back first
    G.items.remove(w);
    spoke.delete(w.uid);
    const prop = G.items.makeMesh(w.id);
    prop.scale.setScalar(a.group === 'rats' || a.group === 'songbirds' ? 0.8 : 1);
    G.items.group.add(prop);
    T.prop = prop;
    G.bus.emit('bribeTaken', { crew: a.crew, key: T.key, item: w.id });
    return true;
  }

  G.mods.push({
    update(dt) {
      const g = G.gus.position;
      // the Duchess's pointer, the first time a crew's region goes on the map (by a slip or a bribe)
      const f = st().flags;
      if (!f['tip.bagels'] && st().leadHints && Object.keys(st().leadHints).length && st().crews.includes('swells')) {
        f['tip.bagels'] = true;
        G.later(5.6, () => G.toast('Duchess: Darling, a bagel loosens any beak. Super Jumbo Bagels, on 110th.', { seconds: 5 }));
      }
      if (T) { tick(dt); return; }
      if ((judgeT += dt) < JUDGE) return;
      judgeT = 0;
      if (G.cutscene?.locked || G.dialogue?.open || G.midScene?.()) return;
      const gusLow = G.gus.mode !== 'fly' || g.y - G.terrain.heightAt(g.x, g.z) < 1.5;
      if (!gusLow) return;
      const bagels = G.items.world.filter((w) => live(w) && Math.hypot(w.x - g.x, w.z - g.z) < 60).sort((p, q) => Math.hypot(p.x - g.x, p.z - g.z) - Math.hypot(q.x - g.x, q.z - g.z) || (p.uid < q.uid ? -1 : 1));
      for (const w of bagels) { const c = pick(w); if (c) { begin(w, c); break; } }
    },
    onNap() { end(); spoke.clear(); return []; },
    restore() { end(); spoke.clear(); judgeT = 0; },
  });

  function tick(dt) {
    const { a, B } = T;
    T.t += dt;
    if (a.state !== 'treat') { end(true); return; }
    if (T.phase === 'excited') {
      if (!T.said && T.t >= LINE_AT) { T.said = true; firstLine(); }
      if (T.t < EXCITE) return;
      a.treatHop = false;
      if (T.refuse) { const W = T; end(); words(W, 1.9); return; }   // (it stays where it is; the bagel stays live)
      const gd = C.groupDef(a);
      const still = (gd.speed || 0) <= 0.3 || B.react === 'spot';
      if (still) { T.phase = 'come'; T.t = 0; T.from = { x: T.w.x, y: T.w.y, z: T.w.z }; return; }
      T.phase = 'walk'; T.t = 0; a.tx = T.w.x; a.tz = T.w.z; a.treatSpeed = gd.speed * 1.2;
      return;
    }
    if (T.phase === 'come') {
      // the bagel comes to the slow ones (turtles, horses, the geese on the water…): a little hop across
      const k = Math.min(1, T.t / 0.8), w = T.w, to = posOf(a, 0.1);
      if (w.mesh && G.items.world.includes(w)) { w.mesh.position.set(T.from.x + (to.x - T.from.x) * k, T.from.y + (to.y - T.from.y) * k + Math.sin(Math.PI * k) * 0.4, T.from.z + (to.z - T.from.z) * k); }
      if (k >= 1) { if (grab()) startEat(); }
      else if (!G.items.world.includes(w)) end();
      return;
    }
    if (T.phase === 'walk') {
      const d = Math.hypot(a.x - T.w.x, a.z - T.w.z);
      if (!G.items.world.includes(T.w)) { end(); return; }
      if (d < 0.35) { a.treatSpeed = 0; if (!grab()) return; if (B.react === 'scamper') { T.phase = 'run'; T.t = 0; const g = G.gus.position, l = Math.hypot(a.x - g.x, a.z - g.z) || 1; const run = 5; a.tx = a.x + ((a.x - g.x) / l) * run; a.tz = a.z + ((a.z - g.z) / l) * run; C.keepTarget(a); a.treatSpeed = C.groupDef(a).speed * 1.3; } else startEat(); return; }
      if (T.t > WALK_MAX || (a.tx === a.x && a.tz === a.z)) { (spoke.get(T.uid) || spoke.set(T.uid, new Set()).get(T.uid)).add('a' + a.i); end(); return; }   // walled off: the bagel stays live (for someone else)
      return;
    }
    if (T.phase === 'run') {
      if (Math.hypot(a.x - a.tx, a.z - a.tz) < 0.3 || T.t > 4) { a.treatSpeed = 0; startEat(); }
      holdProp();
      return;
    }
    if (T.phase === 'eat') {
      const secs = T.key === 'turtles' ? 6 : 2.2;
      holdProp(1 - Math.min(1, T.t / secs) * 0.9);
      if ((T.munchT = (T.munchT || 0) - dt) <= 0) { T.munchT = T.key === 'turtles' ? 2 : 1; G.audio.play('bagel-munch', { at: posOf(a, 0), vol: 0.7, rate: T.key === 'turtles' ? [0.85, 1.0, 1.1][Math.floor(T.t / 2) % 3] : munchRate(T.key), range: 30 }); G.particles.burst('crumbs', a.x, a.yBase + 0.15, a.z, 4); }
      if (T.t >= secs) end();
    }
  }
  function startEat() {
    T.phase = 'eat'; T.t = 0; T.munchT = 0;
    if (T.key === 'cats') sound(T.a, T.B);   // the cat sits on it (Pickles sleeps on bread)
    words();
  }
  function holdProp(k = 1) {
    const { a, prop } = T;
    if (!prop) return;
    const sit = T.key === 'cats';
    const f = sit ? 0 : 0.18 * a.scale;
    prop.position.set(a.x + Math.sin(a.yaw) * f, a.yBase + (sit ? 0.02 : 0.12 * a.scale), a.z + Math.cos(a.yaw) * f);
    prop.scale.setScalar(Math.max(0.1, k));
  }
}
