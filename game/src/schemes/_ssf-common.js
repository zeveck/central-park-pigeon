// Shared staging helpers for the 3b Sign War / Slice Run / Lost & Found
// scheme scripts (one file per scheme beside this one). Everything runs on the
// game clock (G.later, G.cutscene), so recorded solutions replay exactly.

export const L = (who, text, voice) => (voice ? { who, text, voice } : { who, text });

/** A point beside Gus, `d` metres off at angle `a` (relative to his heading). */
export function beside(G, a, d = 1.4) {
  const g = G.gus.position, yaw = G.gus.yaw + a;
  const x = g.x + Math.sin(yaw) * d, z = g.z + Math.cos(yaw) * d;
  return { x, z, y: G.surfaceY(x, z, g.y + 0.6) };
}

/** Bring characters round Gus (they arrive their own way) for a scene. Returns the list. */
export function gather(G, ids, { kind = 'hop', d = 1.5, spread = 2.2 } = {}) {
  const out = [];
  ids.forEach((id, i) => {
    const c = G.chars.find(id);
    if (!c) return;
    const a = Math.PI + (i - (ids.length - 1) / 2) * (spread / Math.max(1, ids.length - 1 || 1));
    const p = beside(G, a, d + (i % 2) * 0.4);
    c.here = { x: p.x, z: p.z, scripted: true };
    c.script = true;
    G.chars.moveTo(c, p, { kind, secs: 1.4 + i * 0.15 });
    out.push(c);
  });
  return out;
}

/** Send gathered characters home again. */
export function disperse(G, list) { for (const c of list) G.chars.goHome(c); }

/** Everyone in `list` cheers (a little hop pose). */
export function cheer(G, list, secs = 1.6) { for (const c of list) G.chars.animate(c, 'cheer', secs); }

/** A camera shot framing Gus and whoever came. */
export function groupShot(G, { dist = 4.2, height = 1.4, side = 0.6, lookY = 0.3 } = {}) {
  const g = G.gus.position;
  return { ...G.shot({ x: g.x, y: g.y, z: g.z }, { dist, height, yaw: G.gus.yaw + Math.PI + side, lookY }), secs: 1.0 };
}

/**
 * The "+1 CREW" scene that ends a crew's recruit scheme: the boss and regulars
 * gather round Gus and cheer, the lines play, everyone goes home. The engine
 * then shows the polaroid and the joining jingle.
 */
export function joinScene(G, name, { members, lines, kind = 'hop', sfx = null, extra = null }, done) {
  let list = [];
  G.cutscene.run(name, [
    { do: () => { list = gather(G, members, { kind }); if (sfx) G.audio.play(sfx, { at: G.gus.position }); } },
    { cam: groupShot(G) },
    { wait: 1.6 },
    { do: () => { cheer(G, list); G.particles.burst('feathers', G.gus.position.x, G.gus.position.y + 0.4, G.gus.position.z, 10); extra?.(list); } },
    { say: lines },
    { follow: true },
    { do: () => { disperse(G, list); done(); } },
  ]);
}

/** Simple lines as a step's script (no camera). */
export function talkStep(G, lines) { return (ctx, done) => G.say(lines, done); }

/**
 * After a crew joins, its boss has one line about the Mecha once the
 * Workshop has a part (said once, the next time Gus talks to them).
 */
export function mechaLine(G, boss, crew, text) {
  G.bus.on('talk', (t, e) => {
    const st = G.state;
    if (e.who !== boss || !st.crews.includes(crew) || !st.parts.length) return;
    const k = 'said.mecha.' + boss;
    if (st.flags[k]) return;
    st.flags[k] = true;
    G.say([L(boss, text)]);
  });
}

/** Is this scheme on step n (1-based) right now? */
export const onStep = (G, id, n) => G.schemes.isOpen(id) && G.schemes.stepIndex(id) === n - 1 && !G.schemes.busy.has(id);

/** A one-off bubble over a character (a world line, not a dialogue box). */
export function bubbleOver(G, id, text, ttl = 3) {
  const c = G.chars.find(id);
  if (!c) return;
  G.bubbles.add(text, { at: () => ({ x: c.x, y: c.y + 0.7, z: c.z }), ttl, range: 60 });
}
