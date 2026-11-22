// Photo mode (#9) state checks (debug only). Run in the page:
//   (await import('/src/debug/photo-checks.js')).runPhotoChecks(window.__sfG)
// refuse   photo mode won't open mid-scene, in dialogue, a fight, a race or while driving (the real guard, then V pressed)
// frozen   while it's open the clock, the schemes' step clocks, the item keeper and the autosave stand still
// album    a snap saves (count + 1), the album lists it, delete removes it, and a quota error says so (IDB add throws)
export async function runPhotoChecks(G, { only = null } = {}) {
  const out = {};
  const A = window.__game;
  const step = (n) => A.step(n, { render: 'none' });
  const press = (action) => { G.input.inject(action, true); step(2); G.input.inject(action, false); step(2); };
  const want = (k) => !only || only.includes(k);
  if (!G.state.gear.includes('camera')) G.state.gear.push('camera');
  G.menus.closeAll(); step(2);

  if (want('refuse')) {
    const r = {};
    const tryOpen = () => { press('photo'); const opened = G.menus.is('photo'); if (opened) { G.menus.closeAll(); step(2); } return opened; };
    r.free = { reason: G.photo.blockedReason(), opened: tryOpen() };
    // mid-scene: a real cutscene that holds the controls
    G.cutscene.run('photo-check', [{ wait: 5 }], () => {});
    step(2);
    r.scene = { reason: G.photo.blockedReason(), opened: tryOpen() };
    G.cutscene.cancel?.(); step(2);
    // dialogue
    G.say([{ who: 'flicker', text: 'Checking.' }]); step(2);
    r.dialogue = { reason: G.photo.blockedReason(), opened: tryOpen() };
    G.dialogue.clear?.(); step(2);
    // a fight, a race, driving: the systems' own "busy" fields, set for the check and put back
    const f0 = G.fights.f; G.fights.f = { name: 'check' };
    r.fight = { reason: G.photo.blockedReason(), opened: tryOpen() }; G.fights.f = f0;
    const r0 = G.race.run; G.race.run = { check: true };
    r.race = { reason: G.photo.blockedReason(), opened: tryOpen() }; G.race.run = r0;
    const d0 = G.vehicles.cur; G.vehicles.cur = { id: 'check' };
    r.driving = { reason: G.photo.blockedReason() }; G.vehicles.cur = d0;
    r.ok = r.free.opened && !r.free.reason && ['scene', 'dialogue', 'fight', 'race'].every((k) => r[k].reason && !r[k].opened) && !!r.driving.reason;
    out.refuse = r;
  }

  if (want('frozen')) {
    const r = {};
    G.menus.closeAll(); step(2);
    const saveKey = Object.keys(localStorage).find((k) => /cpp-save/.test(k));
    const before = { time: G.state.time, phase: G.state.phase, stepTime: JSON.stringify(G.schemes.stepTime), save: saveKey ? localStorage.getItem(saveKey)?.length + ':' + (JSON.parse(localStorage.getItem(saveKey) || '{}').savedAt || '') : null, gus: G.gus.position.toArray().map((v) => +v.toFixed(3)), keepT: G.schemes.keepT };
    press('photo');
    r.opened = G.menus.is('photo');
    step(600);   // 10 s of updates with photo mode open
    const during = { time: G.state.time, phase: G.state.phase, stepTime: JSON.stringify(G.schemes.stepTime), save: saveKey ? localStorage.getItem(saveKey)?.length + ':' + (JSON.parse(localStorage.getItem(saveKey) || '{}').savedAt || '') : null, gus: G.gus.position.toArray().map((v) => +v.toFixed(3)), keepT: G.schemes.keepT };
    r.before = before; r.during = during;
    r.saveUnchanged = before.save === during.save;
    r.frozen = r.saveUnchanged && before.time === during.time && before.stepTime === during.stepTime && before.phase === during.phase && JSON.stringify(before.gus) === JSON.stringify(during.gus) && before.keepT === during.keepT;
    press('uiBack');
    r.closed = !G.menus.open;
    step(60);
    r.runsAfter = G.state.time > during.time;
    r.ok = r.opened && r.frozen && r.closed && r.runsAfter;
    out.frozen = r;
  }

  if (want('album')) {
    const r = {};
    G.menus.closeAll(); step(2);
    const n0 = await G.photo.album.count();
    press('photo');
    await G.photo.snap();
    const n1 = await G.photo.album.count();
    const list = await G.photo.album.list();
    r.saved = n1 === n0 + 1; r.counts = [n0, n1];
    r.newest = list[0] ? { w: list[0].w, h: list[0].h, bytes: list[0].blob.size, thumb: list[0].thumb?.size } : null;
    await G.photo.album.remove(list[0].id);
    r.deleted = (await G.photo.album.count()) === n0;
    // a quota error: the store's add throws QuotaExceededError (as a full origin does)
    const add0 = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
    try { await G.photo.snap(); } finally { IDBObjectStore.prototype.add = add0; }
    r.quota = { lastError: G.photo.state.lastError, note: document.querySelector('#photo .note')?.textContent, count: await G.photo.album.count() };
    r.quotaOk = r.quota.lastError === 'QuotaExceededError' && /out of room/.test(r.quota.note || '') && r.quota.count === n0;
    press('uiBack');
    r.ok = r.saved && r.deleted && r.quotaOk && !!r.newest;
    out.album = r;
  }
  out.ok = Object.values(out).every((v) => v.ok !== false);
  return out;
}
