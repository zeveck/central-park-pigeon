// Shared staging helpers for the 3b Spikes and Feuds & Truces scheme scripts
// (one file per scheme beside this one; the showpieces are in src/setpieces/).
// Everything runs on the game clock (G.later, G.cutscene), so recorded
// solutions replay exactly.

export const L = (who, text, voice) => (voice ? { who, text, voice } : { who, text });

/** A point `d` metres from Gus at angle `a` from his heading (on the ground). */
export function beside(G, a, d = 1.4, from = G.gus.position) {
  const yaw = G.gus.yaw + a;
  const x = from.x + Math.sin(yaw) * d, z = from.z + Math.cos(yaw) * d;
  return { x, z, y: G.surfaceY(x, z, (from.y ?? G.gus.position.y) + 0.6) };
}

/** Bring characters round a spot (default: Gus) for a scene. Returns the list. */
export function gather(G, ids, { kind = 'hop', d = 1.5, spread = 2.2, at = null, secs = 1.4 } = {}) {
  const out = [];
  ids.forEach((id, i) => {
    const c = G.chars.find(id);
    if (!c) return;
    const a = Math.PI + (i - (ids.length - 1) / 2) * (spread / Math.max(1, ids.length - 1 || 1));
    const p = at ? { x: at.x + Math.sin(a + (at.yaw || 0)) * (d + (i % 2) * 0.4), z: at.z + Math.cos(a + (at.yaw || 0)) * (d + (i % 2) * 0.4) } : beside(G, a, d + (i % 2) * 0.4);
    p.y = G.surfaceY(p.x, p.z, (at?.y ?? G.gus.position.y) + 1);
    c.here = { x: p.x, z: p.z, scripted: true };
    c.script = true;
    G.chars.moveTo(c, p, { kind, secs: secs + i * 0.15 });
    out.push(c);
  });
  return out;
}

/** Send gathered characters home again. */
export function disperse(G, list) { for (const c of list) if (c) G.chars.goHome(c); }

/** Everyone in `list` cheers (a little hop pose). */
export function cheer(G, list, secs = 1.6) { for (const c of list) if (c) G.chars.animate(c, 'cheer', secs); }

/** Face a character toward a point. */
export function face(c, p) { if (c) c.yaw = Math.atan2(p.x - c.x, p.z - c.z); }

/** A camera shot framing a point (default: Gus). */
export function shotAt(G, t = G.gus.position, { dist = 4.2, height = 1.4, side = 0.6, lookY = 0.3, yaw = null, secs = 1.0 } = {}) {
  return { ...G.shot({ x: t.x, y: t.y ?? G.surfaceY(t.x, t.z, 50), z: t.z }, { dist, height, yaw: yaw ?? G.gus.yaw + Math.PI + side, lookY }), secs };
}

/** A world line over a character (a bubble, not a dialogue box). */
export function bubbleOver(G, id, text, ttl = 3, dy = 0.7) {
  const c = typeof id === 'string' ? G.chars.find(id) : id;
  if (!c) return null;
  return G.bubbles.add(text, { at: () => ({ x: c.x, y: c.y + dy, z: c.z }), ttl, range: 70 });
}

/** A world line over a human agent. */
export function bubbleHuman(G, a, text, ttl = 2.4) { if (a) G.bubbles.add(text, { at: () => ({ x: a.x, y: (a.y ?? 0) + 2.1, z: a.z }), ttl, range: 70 }); }

/** Is this scheme on step n (1-based) right now? */
export const onStep = (G, id, n) => G.schemes.isOpen(id) && G.schemes.stepIndex(id) === n - 1 && !G.schemes.busy.has(id);

/** A polaroid of the scene as it is now (a render snapshot), with a title and caption. */
export function snapPolaroid(G, title, caption, { secs = 3.4, big = false } = {}) {
  let url = null;
  try { G.render(); url = G.renderer.domElement.toDataURL('image/jpeg', 0.62); } catch { /* a snapshot is a nicety */ }
  G.audio.play('camera-shutter');
  const el = document.getElementById('polaroid');
  if (el) {
    el.innerHTML = `${url ? `<img alt="" src="${url}">` : ''}<b>${title}</b><span>${caption}</span>`;
    el.className = 'on postcard' + (big ? ' big' : '');
    G.later(secs, () => { el.className = ''; });
  }
  return url;
}

/** The boss's after-joining line about the Mecha's progress (once, when the Workshop has a part). */
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

/** Lines a character says when Gus talks to them during a step (instead of their generic ones). */
export function stepTalk(G, who, scheme, step, lines) {
  G.bus.on('talk', (t, e) => {
    if (e.who !== who || !onStep(G, scheme, step) || G.dialogue.open) return;
    G.say(lines);
  });
}

/**
 * A truce: both bosses come to the Elders' rock, everyone waits for Slowpoke
 * (every truce does), they shake (paw and wing), a polaroid snaps.
 * a, b: character ids. lines: what they say before the shake. after: lines after.
 */
export function truceScene(G, name, { a, b, lines = [], after = [], title = 'TRUCE', caption = '' }, done) {
  const rock = { x: 8.8, z: 432.6 };
  const top = G.surfaceY(rock.x, rock.z, 40);
  const A = G.chars.find(a), B = G.chars.find(b), eld = G.chars.find('eldest'), slow = G.chars.find('slowpoke');
  const sp = (dx, dz) => ({ x: rock.x + dx, z: rock.z + dz, y: G.surfaceY(rock.x + dx, rock.z + dz, top + 1) });
  const pa = sp(-0.55, -0.25), pb = sp(0.55, -0.25);
  const cam = { ...G.shot({ x: rock.x, y: top, z: rock.z - 0.2 }, { dist: 4.2, height: 1.3, yaw: Math.PI + 0.25, lookY: 0.25 }), secs: 1.2 };
  const list = [A, B, slow].filter(Boolean);
  G.cutscene.run(name, [
    { do: () => {
      for (const [c, p] of [[A, pa], [B, pb]]) if (c) { c.script = true; c.here = { x: p.x, z: p.z, scripted: true }; G.chars.arrive(c, p, 'swoop', 1.6); }
      if (slow) { slow.script = true; const s0 = sp(2.4, -1.6); slow.x = s0.x; slow.z = s0.z; slow.y = s0.y; slow.here = { x: s0.x, z: s0.z, scripted: true }; }
    } },
    { cam },
    { wait: 1.7 },
    { do: () => { face(A, B); face(B, A); } },
    ...(lines.length ? [{ say: lines }] : []),
    { say: [L('eldest', 'Mm. A truce… is sealed… when everyone… is here.'), L('slowpoke', 'Wait… for… me…')] },
    { do: () => { if (slow) G.chars.moveTo(slow, sp(0.2, -0.9), { kind: 'walk', secs: 3.2 }); } },
    { wait: 3.3 },
    { say: [L('eldest', '…Now.')] },
    { do: () => {
      // the shake: they lean in, paw and wing
      for (const c of [A, B]) if (c) G.chars.animate(c, 'cheer', 1.2);
      if (A && B) { G.chars.moveTo(A, { x: (pa.x * 2 + pb.x) / 3, z: pa.z, y: pa.y }, { kind: 'hop', secs: 0.5 }); G.chars.moveTo(B, { x: (pb.x * 2 + pa.x) / 3, z: pb.z, y: pb.y }, { kind: 'hop', secs: 0.5 }); }
      G.particles.burst('sparkle', rock.x, top + 0.5, rock.z - 0.25, 24, { spread: 0.8 });
      G.audio.play('turtle-grumble', { at: rock });
    } },
    { wait: 0.9 },
    { do: () => { snapPolaroid(G, title, caption); G.audio.play('crowd-ooh', { vol: 0.5 }); if (eld) G.chars.animate(eld, 'cheer', 1); } },
    { wait: 1.2 },
    ...(after.length ? [{ say: after }] : []),
    { follow: true },
    { do: () => { disperse(G, list); done?.(); } },
  ]);
}

/** The "+1 CREW" scene: the boss and regulars round Gus, a cheer, the lines. The engine then shows the polaroid and jingle. */
export function joinScene(G, name, { members, lines, kind = 'hop', sfx = null, extra = null, at = null }, done) {
  let list = [];
  G.cutscene.run(name, [
    { do: () => { list = gather(G, members, { kind, at }); if (sfx) G.audio.play(sfx, { at: G.gus.position }); } },
    { cam: shotAt(G, at || G.gus.position) },
    { wait: 1.6 },
    { do: () => { cheer(G, list); G.particles.burst('feathers', G.gus.position.x, G.gus.position.y + 0.4, G.gus.position.z, 10); extra?.(list); } },
    { say: lines },
    { follow: true },
    { do: () => { disperse(G, list); done(); } },
  ]);
}

/**
 * A little flock of instanced models (circling starlings, the honk wedge): n copies of a baked
 * model, `len` metres long, counter-mirrored like every model. set(i, x, y, z, yaw, bob) then commit().
 */
export async function birds(G, model, n, len, { tint = null } = {}) {
  const THREE = await import('three');
  const b = await G.registry.baked(model);
  const geo = b ? b.geometry : new THREE.BoxGeometry(0.2, 0.1, 0.3);
  const mat = b ? b.makeMaterial(tint ? { color: tint } : {}) : new THREE.MeshStandardMaterial({ color: 0x333333 });
  const bb = b?.bounds || new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
  const s = len / Math.max(0.01, bb.max.z - bb.min.z);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.castShadow = true; mesh.visible = false;
  // perf pass: culled by a sphere round the birds set since the last commit (it was frustumCulled = false, so a
  // songbird ring or a goose wedge drew from anywhere in the park, shadow pass too)
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const box = new THREE.Box3(), rad = len * 2;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(-s, s, s);
  return {
    mesh, n,
    set(i, x, y, z, yaw, bob = 0, pitch = 0) { q.setFromEuler(e.set(pitch, yaw, Math.sin(bob) * 0.25, 'YXZ')); m4.compose(v.set(x, y - bb.min.y * s, z), q, sc); mesh.setMatrixAt(i, m4); box.expandByPoint(v); },
    hide(i) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); },
    commit() { mesh.instanceMatrix.needsUpdate = true; if (!box.isEmpty()) { box.getBoundingSphere(mesh.boundingSphere); mesh.boundingSphere.radius += rad; box.makeEmpty(); } },
  };
}
