// Photo mode (#9) review follow-up checks (debug only):
//   (await import('/src/debug/photo-checks2.js')).runReviewChecks(window.__sfG)
// 1 shutter plays as UI sound · 2 a null toBlob saves nothing, scratch canvases are zeroed, an unreadable album record
// offers Delete · 3 the camera answers a Peck from beside the balcony · 6 Flicker drawn on step 3 at the lowest cap ·
// 8 blur / Pause never stack over photo mode · 9 a refused V doesn't skip the park's update
export async function runReviewChecks(G) {
  const A = window.__game, out = {};
  const step = (n) => A.step(n, { render: 'none' });
  const press = (a) => { G.input.inject(a, true); step(2); G.input.inject(a, false); step(2); };
  const goto = async (id, s) => { G.menus.closeAll(); await A.goToScheme(id, s); step(2); G.menus.closeAll(); step(2); };

  // 3: beside the balcony (where the photobomb lands him) the Peck is the camera, guarded, then a pick-up
  await goto('say-cheese');
  G.gus.place({ x: -129.72, y: 3.63, z: 265.6, yaw: Math.PI, mode: 'perch' });
  step(2);
  const l0 = G.interact.label;
  for (let i = 0; i < 20 && !G.state.flags['photo.distracted']; i++) step(10);
  step(2);
  const l1 = G.interact.label;
  press('peck'); step(4);
  out.c3 = { before: l0, after: l1, carried: G.state.carried?.id || null, ok: /Guarded: the old film camera/.test(l0 || '') && l1 === 'Pick up the old film camera' && G.state.carried?.id === 'camera' };

  // 6: step 3 at the lowest character cap, Gus 25 m off with others nearer: Flicker still drawn
  await goto('say-cheese', 3);
  const f = G.chars.find('flicker');
  G.gus.place({ x: f.x - 18, z: f.z - 17, yaw: 0, mode: 'walk' });
  G.budgetScale = 0.01;
  step(6);
  out.c6 = { always: !!f.always, visible: f.root.visible, drawn: G.chars.drawnCount(), ok: !!f.always && f.root.visible === true };
  G.budgetScale = 1;

  // 9: a refused V (a race running) still runs the park's update that frame
  await goto('say-cheese', 3);
  const r0 = G.race.run; G.race.run = { check: true };
  const t0 = G.state.time;
  G.input.inject('photo', true); step(1); G.input.inject('photo', false);
  const t1 = G.state.time;
  G.race.run = r0; step(2);
  out.c9 = { advanced: +(t1 - t0).toFixed(4), menu: G.menus.open, ok: t1 > t0 && !G.menus.open };

  // 8: blur, Pause and a hidden tab over photo mode: no Pause stacked, photo mode stays
  press('photo');
  const open8 = G.menus.is('photo');
  window.dispatchEvent(new Event('blur')); step(2);
  G.pause('check'); step(2);
  const stack8 = G.menus.stack.map((s) => s.id);
  press('uiBack');
  out.c8 = { opened: open8, stack: stack8, ok: open8 && stack8.join() === 'photo' };

  // 1: the shutter goes through the audio as a UI sound (the menu pauses the park's sounds)
  press('photo');
  const calls = [], play0 = G.audio.play.bind(G.audio);
  G.audio.play = (name, o = {}) => { const r = play0(name, o); calls.push({ name, ui: !!o.ui, played: r != null, paused: !!G.audio.paused, ctx: !!G.audio.ctx }); return r; };
  // 2a: scratch canvases zeroed after a snap
  const made = [], ce0 = document.createElement.bind(document);
  document.createElement = (t, ...a) => { const e = ce0(t, ...a); if (String(t).toLowerCase() === 'canvas') made.push(e); return e; };
  const n0 = G.photo.state.saves || 0;
  try { await G.photo.snap(); } finally { document.createElement = ce0; }
  G.audio.play = play0;
  const shutter = calls.find((c) => c.name === 'camera-shutter');
  out.c1 = { shutter, ok: !!shutter && shutter.ui && (shutter.played || !shutter.ctx) };
  out.c2scratch = { canvases: made.length, zeroed: made.every((c) => c.width === 0 && c.height === 0), saved: (G.photo.state.saves || 0) === n0 + 1 };

  // 2b: toBlob gives null: no save, says so
  const count0 = await G.photo.album.count();
  const tb0 = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (cb) { setTimeout(() => cb(null), 0); };
  const s0 = G.photo.state.saves || 0;
  try { await G.photo.snap(); } finally { HTMLCanvasElement.prototype.toBlob = tb0; }
  out.c2null = { saves: (G.photo.state.saves || 0) - s0, count: (await G.photo.album.count()) - count0, note: document.querySelector('#photo .note')?.textContent };
  out.c2null.ok = out.c2null.saves === 0 && out.c2null.count === 0 && /didn't come out/.test(out.c2null.note || '');

  // 2c: an unreadable record in the album: a tile that offers Delete, and Delete removes it
  await G.photo.album.add({ at: Date.now() + 1e6, blob: 'not a blob', thumb: null, w: 1, h: 1, look: 'natural' });
  G.photo.act.album(); for (let i = 0; i < 20 && !document.querySelector('#album .thumb'); i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 200));
  const bad = document.querySelector('#album .thumb.bad');
  const badText = bad?.textContent;
  bad?.click(); step(2);
  const asked = G.menus.top?.id === 'confirm' ? document.querySelector('#confirm h2').textContent : null;
  document.querySelector('#confirm [data-act="yes"]')?.click();
  await new Promise((r) => setTimeout(r, 300)); step(2);
  const left = (await G.photo.album.list()).filter((p) => !(p.blob instanceof Blob)).length;
  out.c2bad = { tile: badText, asked, left, ok: !!bad && !!asked && left === 0 };
  G.menus.closeAll(); step(2);
  out.ok = [out.c1, out.c3, out.c6, out.c8, out.c9, out.c2null, out.c2bad].every((c) => c.ok) && out.c2scratch.zeroed && out.c2scratch.saved;
  return out;
}
