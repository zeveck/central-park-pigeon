// In-page helpers shared by the sweeps (debug only): tools/midscene-sweep.mjs (quit mid-scene, then Continue) and
// tools/mistake-sweep.mjs (make a mistake, then recover). Moved here from midscene-sweep.mjs (its inject()) unchanged,
// so both sweeps run the same code. install() puts them on window.__sw (once per page load).
//
//   __sw.goalsFor(id)     the goal list builder for a scheme (or an alternative: 'den-cats.alt'), flattened
//   __sw.slice(id)        the scheme's goals from the one after the last step flag already set (flyTo → landNear)
//   __sw.retry(id, at)    a goal script that stuck: pick it up again at the last move-to goal before goal `at`
//   __sw.stopPilot()      stop the autopilot where it is
//   __sw.leftovers()      transient state that must be gone (after a Continue, or at the end of a run)
//   __sw.world()          the world as the load built it (shown/hidden scene groups, where the actors stand)
//   __sw.save()           a summary of the current save slot
//   __sw.avail(id, n)     is step n's trigger there to be used (not spent)?

export async function install() {
  if (window.__sw) return window.__sw;
  const [a, b, c, d, ph] = await Promise.all(['goals.js', 'goals-ssf.js', 'goals-sf.js', 'goals-finale.js', 'goals-photo.js'].map((f) => import('/src/debug/' + f)));
  const { SCHEME } = await import('/src/data/schemes.js');
  const G = () => window.__sfG;
  const goalsFor = (id) => {
    const f = c.GOALS_SF[id] || b.SSF[id] || d.GOALS_FINALE[id] || ph.GOALS_PHOTO[id] || a.GOALS[id];
    if (!f) throw new Error('no goals for ' + id);
    return (gg) => (c.GOALS_SF[id] || d.GOALS_FINALE[id] || ph.GOALS_PHOTO[id] ? f() : f(gg)).flat(Infinity);
  };
  const sid = (id) => id.replace(/\.(alt\d*|s\d+).*$/, '');   // 'den-cats.alt' → 'den-cats' (the step flags are the scheme's)
  window.__sw = {
    goalsFor,
    /** the scheme's goals from the one after the last step flag already set */
    slice(id) {
      // the stock flyTo can circle a spot for minutes (whole-game.mjs saw it too): land near it instead
      const s = sid(id);
      const all = goalsFor(id)(G()).map((g) => (g.flyTo && !g.alt3 ? { landNear: g.flyTo, alt: g.alt ?? 6, r: g.r ?? 3, timeout: 200 } : g));
      let k = -1;
      all.forEach((g, i) => { if (typeof g.waitFor === 'string' && g.waitFor.startsWith(s + '.s') && G().state.flags[g.waitFor]) k = i; });
      if (id === 'finale') return [{ landNear: { x: -12, z: 338 }, alt: 8, r: 2, timeout: 200 }, ...all];
      return k >= 0 ? all.slice(k + 1) : all;
    },
    /** a goal script that stuck: pick it up again at the last move-to goal before the one that stuck (whole-game.mjs) */
    retry(id, at) {
      const s = sid(id);
      const g0 = G(), all = goalsFor(id)(g0);
      let kd = -1;
      all.forEach((g, i) => { if (typeof g.waitFor === 'string' && g.waitFor.startsWith(s + '.s') && g0.state.flags[g.waitFor]) kd = i; });
      if (at <= kd) at = kd + 1;
      if (at < 0) return all;
      let j = at;
      while (j > 0 && !['landNear', 'sfLandNear', 'flyTo', 'napNest', 'sfTalk', 'talk', 'finaleReach'].some((key) => all[j][key] != null)) j--;
      const g = all[at] || {};
      let t = null;
      if (g.talk || g.sfTalk) { const ch = g0.chars.find(g.talk || g.sfTalk); if (ch) t = { x: ch.x, z: ch.z }; }
      else if (g.peck) { const q = g0.interact.get(g.peck); if (q) t = { x: q.x, z: q.z }; }
      else if (g.walkTo) t = g.walkTo;
      else if (g.flyTo) all[at] = { landNear: g.flyTo, alt: g.alt ?? 6, r: g.r ?? 3, timeout: 200 };
      else if (g.pickItem || g.sfPick) { const q = g0.items.world.find((w) => w.id === (g.pickItem || g.sfPick)); if (q) t = { x: q.x, z: q.z }; }
      const hop = t ? [{ climbTo: 4, timeout: 20 }, { landNear: { x: t.x + 0.9, z: t.z }, alt: 4, r: 1.2, timeout: 90 }] : [];
      return [{ sfIdle: true, frames: 20, timeout: 60 }, ...hop, ...all.slice(t ? at : j)];
    },
    stopPilot() { const g = G(); if (g.pilot) { g.pilot.done = null; g.pilot.i = g.pilot.goals.length; } g.input.clearAuto?.(); },
    /** transient state that must be gone after a Continue */
    leftovers() {
      const g = G(), out = {};
      const loops = g.audio.loops ? g.audio.loops.size : 0;
      if (loops) out.soundLoops = loops;
      const sv = g.vehicles.list.filter((v) => v.scripted).map((v) => v.id); if (sv.length) out.scriptedVehicles = sv;
      if (g.vehicles.auto) out.autoDrive = true;
      if (g.vehicles.cur) out.driving = g.vehicles.cur.id;
      const sc = g.chars.list.filter((ch) => ch.script || ch.tween || ch.act || ch.busyTalent).map((ch) => ch.def.id); if (sc.length) out.scriptedChars = sc;
      const sh = g.humans.agents.filter((h) => h.script && h !== g.street.prickett && !/ranger/.test(h.role || '')).map((h) => h.role || h.id); if (sh.length) out.scriptedPeople = sh;
      const lie = g.humans.agents.filter((h) => h.lie).map((h) => h.role || h.id); if (lie.length) out.lyingPeople = lie;
      if (g.cutscene.running) out.cutscene = g.cutscene.name;
      if (g.schemes.busy.size) out.busy = [...g.schemes.busy];
      if (g.finale?.running) out.finale = g.finale.stage;
      if (g.altView) out.altView = true;
      if (g.rig.free) out.cameraLocked = true;
      if (g.rig.glanceShot) out.cameraGlance = true;
      const ov = ['sf-flash', 'sf-stamp', 'sf-freeze', 'polaroid', 'fade'].filter((id) => document.getElementById(id)?.className); if (ov.length) out.overlays = ov;
      const bc = [...document.body.classList].filter((k) => ['cine', 'finale'].includes(k)); if (bc.length) out.bodyClass = bc;
      if (g.slowT > 0) out.slowmo = true;
      if (g.dialogue.open) out.dialogue = true;
      if (g.van && !g.van.arrived) out.vanDriving = true;
      const fin = document.querySelector('#finale-ui'); if (fin) { const on = [...fin.querySelectorAll('.on')].map((e) => e.className); if (on.length) out.finaleUi = on; }
      return out;
    },
    /** the world as the load built it: what is shown or hidden in the scene groups, where the actors stand */
    world() {
      const g = G(), w = {};
      const r = (v) => Math.round(v * 2) / 2;
      const walk = (o, p, depth) => { if (depth > 5) return; o.children.forEach((ch, i) => { const k = p + '/' + (ch.name || ch.type) + i; if (ch.isMesh || ch.isInstancedMesh || ch.isGroup || ch.isLight) w[k] = ch.visible ? 1 : 0; walk(ch, k, depth + 1); }); };
      for (const m of g.mods) if (m.group) walk(m.group, 'mod:' + (m.name || m.group.name), 0);
      for (const v of g.vehicles.list) { w['veh:' + v.id] = [r(v.x), r(v.z), v.holder.visible ? 1 : 0]; }
      for (const ch of g.chars.list) w['char:' + ch.def.id] = [r(ch.x), r(ch.z)];
      for (const c0 of ['south', 'middle', 'north']) { const cc = g.rangers.cart?.(c0); if (cc) w['cart:' + c0] = [r(cc.holder.position.x), r(cc.holder.position.z), cc.holder.visible ? 1 : 0, +cc.holder.scale.y.toFixed(2)]; }
      w.items = g.items.world.map((i) => i.id).sort().join(',');
      w.itemMeshes = g.items.group.children.length;
      if (g.street?.vanMesh) w.van = [r(g.street.vanMesh.position.x), r(g.street.vanMesh.position.z), g.street.vanMesh.visible ? 1 : 0];
      const pk = g.street?.prickett; if (pk) w.prickett = [pk.out ? 1 : 0, r(pk.x), r(pk.z), pk.script ? 1 : 0];
      w.peopleOut = g.humans.agents.filter((h) => h.out).length;
      w.busyPeople = g.humans.agents.filter((h) => h.busy).map((h) => h.role).sort().join(',');
      w.workshop = g.workshop?.offStage ? 'off' : 'on';
      w.doors = (g.clues.doors || []).map((dd) => (dd.g?.visible === false ? 0 : 1) + (dd.open ? 'o' : 'c')).join('');
      w.carried = g.state.carried?.id || null;
      return w;
    },
    save() { const s = (JSON.parse(localStorage.getItem('cpp-slot-' + (window.__sfG?.saves?.current() || 1)) || 'null')?.data || null); return s && { t: +s.time.toFixed(1), steps: s.steps, carried: s.carried?.id || null, saveRev: s.saveRev || null }; },
    /** After a Continue: is step n's trigger there to be used again? (what a spent trigger looked like in B1) */
    avail(id, n) {
      const g = G(), st = g.state;
      const idx = g.schemes.stepIndex(id);
      if (st.flags[id] || idx >= n) return 'step already done';
      if (idx < n - 1) return `back on step ${idx + 1} (an earlier step's save): replay from there`;
      const step = SCHEME[id].steps[n - 1], out = [];
      const fits = (want, iid) => !!iid && (want === iid || (want === 'slice' && iid.startsWith('slice')));
      for (const o of step.alts || [step]) {
        const on = o.on || {};
        if (on.type === 'talent') out.push(g.clues.debug().active.includes(on.clue) || !st.flags['clue.' + on.clue] ? `clue ${on.clue} unspent` : `clue ${on.clue} SPENT`);
        else if (on.type === 'give') out.push(fits(on.item, st.carried?.id) || g.items.world.some((w) => fits(on.item, w.id)) ? `${on.item} at hand` : `${on.item} NOT at hand`);
        else if (on.type === 'trade') out.push(st.flags['trade.' + on.id] ? `trade ${on.id} SPENT` : `trade ${on.id} open`);
        else if (on.type === 'haul') out.push(g.items.world.some((w) => w.id === on.item && !w.parked) ? `${on.item} haulable` : `${on.item} not haulable`);
        else if (on.type === 'flag') out.push(st.flags[on.flag] ? `${on.flag} set (re-fires)` : `${on.flag} not yet (redo the action)`);
        else out.push(`${on.type}: nothing spent`);
      }
      return out.join(' / ');
    },
  };
  return window.__sw;
}
