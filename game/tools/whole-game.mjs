#!/usr/bin/env node
// The whole game in one run (play-test, Phase 6): a fresh page, an empty
// save, New Game clicked on the title, the Prologue's recorded solution fed
// back raw, then every scheme in a valid completion order played by its goal
// script (the autopilot only presses inputs; src/debug/goals*.js), the
// finale, the credits and back to free roam. No fixtures and no jumps.
//
// Recorded solutions were made from fixtures (Gus placed on a Nest, the
// camera behind him, the random streams reseeded), so fed back raw in the
// chained park they drift within seconds; --raw still tries that (after a
// bridge to the solution's starting spot), but the default is the goal scripts.
// Bridges (all autopilot inputs, recorded as their own segments): getting out
// of a vehicle a scheme ended in, finding strays when the scheme's fixture had
// more birds in the flock (sab-north needs 15), napping to the phase a Spikes /
// Feuds script starts in, flying to the cave before the finale. A goal script
// that gets stuck (a walk blocked by a bank or a fountain rim, the stock flyTo
// circling) is picked up again from where Gus is, skipping steps already done.
// After each scheme the game is saved (the Pause screen's Save) to
// scratchpad/playtest/wg/save-*.json; --resume <save> --from <id> loads one
// with the title's Continue, the way a player picks the game up again.
//
//   node game/tools/whole-game.mjs [--port 8191] [--out design/solutions/whole-game.json] [--shots dir]
//                                   [--resume save.json --from <scheme>] [--raw]
//
// The server must be running: python3 -m http.server 8191 --bind 127.0.0.1 --directory game

import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), '@playwright/cli/node_modules/playwright'));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const port = opt('port', '8191');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(ROOT, opt('out', 'design/solutions/whole-game.json'));
const RAW = args.includes('--raw');   // also try each recorded solution raw after a bridge (they drift: see the header)
const SHOTS = opt('shots') ? path.resolve(ROOT, opt('shots')) : null;

// A valid completion order (every scheme's opensWhen holds when it starts; check-schemes.mjs).
const ORDER = ['prologue', 'den-ducks', 'den-squirrels', 'den-rats', 'den-cats', 'den-crows', 'gear-sunglasses', 'gear-pen',
  'gear-headlamp', 'part-wings', 'den-biscuit', 'den-strix', 'den-raccoons', 'sab-north', 'sab-middle', 'part-eyes', 'part-body',
  'den-choir', 'part-beak', 'den-turtles', 'truce-cats-rats', 'den-songbirds', 'den-racers', 'den-geese', 'truce-dogs-squirrels',
  'den-horses', 'part-talons', 'den-rhoda', 'part-power', 'den-meermob', 'part-legs', 'finale'];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const run = { started: new Date().toISOString(), segments: [], schemes: [] };
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const url = `http://127.0.0.1:${port}/?preset=low`;
    await page.goto(url, { waitUntil: 'load' });
    const resume = opt('resume') ? fs.readFileSync(path.resolve(ROOT, opt('resume')), 'utf8') : null;
    await page.evaluate((sv) => { localStorage.removeItem('cpp-saves'); for (const n of [1, 2, 3]) localStorage.removeItem('cpp-slot-' + n); if (sv) localStorage.setItem('cpp-slot-1', JSON.stringify({ version: 1, savedAt: Date.now(), summary: {}, data: JSON.parse(sv) })); }, resume);   // Saves: slot 1
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.state().screen === 'title', null, { timeout: 900000, polling: 2000 });
    await page.evaluate(() => window.__game.ready());
    log('title up; save present:', await page.evaluate(() => window.__game && !!document.querySelector('#title button[data-act=continue]')));
    // New Game (or, resuming a save this run made, Continue) with a real click
    await page.click(resume ? '#title button[data-act=continue]' : '#title button[data-act=new]', { timeout: 60000 });
    if (resume) { run.continuedFrom = opt('resume'); log('Continue from', opt('resume')); }
    await page.waitForFunction(() => window.__game.state({ measure: false }).screen !== 'title', null, { timeout: 60000 });
    await page.evaluate(async () => {
      window.__game.step(0);
      const [a, b, c, d] = await Promise.all(['goals.js', 'goals-ssf.js', 'goals-sf.js', 'goals-finale.js'].map((f) => import('/src/debug/' + f)));
      const { PILOT_EXT } = await import('/src/debug/pilot-ext.js');
      // { wgStray: id }: fly to a stray, come down beside it and Peck it (Talk to the stray); done when it has joined
      PILOT_EXT.push((P, g, s, out) => {
        if (!g.wgStray) return undefined;
        const G = P.G, gus = G.gus, p = gus.position, id = 'stray:' + g.wgStray;
        if (G.state.flockFrom[id]) return true;
        const T = G.interact.get(id); if (!T) throw new Error('no ' + id);
        const d = Math.hypot(T.x - p.x, T.z - p.z);
        if (gus.mode === 'fly') {
          if (d > 1.6) { P.stickToward(T.x, T.z, out, d > 6 ? 1 : 0.5); if (p.y < T.y + (d > 8 ? 4 : 1.5)) out.held.add('flap'); }
          else out.held.add('dive');
          return false;
        }
        if (G.interact.current?.t.id === id) { s.k = (s.k || 0) + 1; if (s.k % 10 < 3) out.held.add('peck'); return false; }
        if (d > 2.5 || Math.abs(p.y - T.y) > 1.2) { s.f = (s.f || 0) + 1; if (s.f % 20 < 4) out.held.add('flap'); return false; }
        P.stickToward(T.x, T.z, out, 0.4);
        return false;
      });
      window.__wg = { GOALS: a.GOALS, SSF: b.SSF, SF: c.GOALS_SF, FIN: d.GOALS_FINALE, NESTS: (await import('/src/world/layout.js')).NESTS };
    });
    const t0 = Date.now();

    const stepUntil = async (fnSrc, maxSecs = 2400) => {
      let secs = 0, k = 0;
      for (;;) {
        const r = await page.evaluate(([src]) => {
          const G = window.__game, done = new Function('G', 'return (' + src + ')(G)');
          for (let i = 0; i < 4; i++) { G.step(60, { render: 60 }); if (done(G)) return true; }
          return false;
        }, [fnSrc]);
        secs += 4;
        if (r) return true;
        if (SHOTS && ++k % 15 === 0) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `wg-${String(Math.round((Date.now() - t0) / 1000)).padStart(6, '0')}.png`), timeout: 60000 }).catch(() => {}); }
        if (secs > maxSecs) return false;
      }
    };
    const st = () => page.evaluate(() => { const s = window.__game.state({ measure: false }); return { t: s.gameTime, phase: s.time, x: s.player.x, z: s.player.z, mode: s.player.mode, crumbs: s.crumbs, flock: s.flock, crews: s.crews.length, parts: s.parts.length, screen: s.screen, flags: s.flags, carried: s.carried?.id || null, feathers: s.feathers }; });

    /** Run a goal list (built in the page by `build`, a function source taking (G, W, fx)); returns the pilot result and the recorded inputs. */
    const pilot = async (build, fx = null, maxSecs = 2400) => {
      await page.evaluate(async ([src, fx]) => { const G = window.__sfG; const goals = new Function('G', 'W', 'fx', 'return (' + src + ')(G, W, fx)')(G, window.__wg, fx); await window.__game.autopilot(goals, { timeout: 240 }); }, [build.toString(), fx]);
      const ok = await stepUntil('(G) => !G.pilot().running', maxSecs);
      const res = await page.evaluate(() => ({ result: window.__game.pilot().result, rec: window.__game.recording() }));
      return { ok: ok && res.result?.ok, failed: res.result?.failed || (ok ? null : 'stepped past max'), inputs: (res.rec || []).map((f) => [f.n, f.h, f.x, f.y]) };
    };
    const replay = async (inputs) => {
      await page.evaluate((f) => window.__game.replay(f.map(([n, h, x, y]) => ({ n, h, x, y }))), inputs);
      const ok = await stepUntil('(G) => !G.replayStatus().active');
      await page.evaluate(() => window.__game.step(240, { render: 60 }));
      return ok;
    };
    const save = () => fs.writeFileSync(OUT, JSON.stringify({
      note: 'The whole game in one run from New Game (game/tools/whole-game.mjs): segments in order, each [frames, held actions, stick x, stick y] per fixed 1/60 s update. "bridge" and "pilot" segments were pressed by the autopilot; "replay" segments are the recorded solutions fed back raw. A replay that failed was rolled back to the autosave before it (rolledBack) and its scheme played by its goal script instead.',
      ...run, wallSecs: Math.round((Date.now() - t0) / 1000),
    }));

    const CKPT = path.join(ROOT, 'scratchpad/playtest/wg');
    fs.mkdirSync(CKPT, { recursive: true });
    const checkpoint = async (name) => { const sv = await page.evaluate(() => { window.__sfG.saveNow(); const r = localStorage.getItem('cpp-slot-' + (window.__sfG.saves.current() || 1)); return r && JSON.stringify(JSON.parse(r).data); }); fs.writeFileSync(path.join(CKPT, `save-${name}.json`), sv); };
    const from = opt('from') ? ORDER.indexOf(opt('from')) : 0;
    for (const id of ORDER.slice(Math.max(0, from))) {
      let before = await st();
      // bridge: the last scheme can end at the wheel (part-body parks the hot dog cart in the Workshop): get out first
      if (await page.evaluate(() => !!window.__sfG.vehicles.cur)) {
        const b = await pilot(() => [{ sfIdle: true, frames: 20, timeout: 60 }, { exit: true, timeout: 20 }, { sfIdle: true, frames: 20, timeout: 30 }]);
        run.segments.push({ id, kind: 'bridge-exit', ok: b.ok, failed: b.failed, inputs: b.inputs });
        log('bridge: got out of the vehicle', b.ok ? 'ok' : 'FAILED ' + b.failed);
        before = await st();
      }
      // bridge: strays the scheme's starting state counts on (its fixture had them found); found on the way, by the autopilot
      if (id !== 'prologue' && id !== 'part-eyes' && fs.existsSync(path.join(ROOT, 'game/data/fixtures', id + '.json'))) {
        const fx0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/data/fixtures', id + '.json'), 'utf8'));
        const need = Object.values(fx0.state?.flockFrom || {}).reduce((a, b) => a + b, 0) - before.flock;
        if (need > 0) {
          // one stray at a time, nearest first; a stray Gus can't get to (a roost he can't land by) is skipped
          const tried = [];
          for (let n = 0; n < need && tried.length < 30;) {
            const pick = await page.evaluate((tried) => {
              const G = window.__sfG, C = G.collect, p = G.gus.position;
              const free = C.strays.filter((q) => q.p && !tried.includes(q.def.id) && !G.state.flockFrom['stray:' + q.def.id] && !(q.def.spike && G.state.spikes[q.def.spike] === 'installed') && q.p.y - G.terrain.heightAt(q.p.x, q.p.z) < 2.5 && !G.collision.waterAt(q.p.x, q.p.z));
              free.sort((a, b) => Math.hypot(a.p.x - p.x, a.p.z - p.z) - Math.hypot(b.p.x - p.x, b.p.z - p.z));
              return free[0] ? { id: free[0].def.id, x: free[0].p.x, z: free[0].p.z } : null;
            }, tried);
            if (!pick) break;
            tried.push(pick.id);
            const b = await pilot((G, W, q) => [{ sfIdle: true, frames: 10, timeout: 60 }, { landNear: { x: q.x + 1.0, z: q.z }, alt: 6, r: 1.5, timeout: 120 }, { peck: 'stray:' + q.id, timeout: 30 }, { waitFor: (G) => !!G.state.flockFrom['stray:' + q.id], timeout: 5 }], pick);
            run.segments.push({ id, kind: 'bridge-stray', stray: pick.id, ok: b.ok, failed: b.failed, inputs: b.inputs });
            if (b.ok) n++; else log('stray', pick.id, 'skipped:', b.failed);
          }
          before = await st();
          log('bridge strays: needed', need, 'flock now', before.flock, 'tried', tried.join(' '));
        }
      }
      const entry = { id, start: { t: before.t, phase: before.phase, crumbs: before.crumbs, flock: before.flock } };
      run.schemes.push(entry);
      log('==', id, JSON.stringify(entry.start), 'crews', before.crews, 'parts', before.parts);
      if (before.flags.includes(id)) { entry.how = 'already done (finished on the way)'; log('already done'); continue; }
      const solFile = path.join(ROOT, 'design/solutions', id + '.json');
      const sol = (RAW || id === 'prologue') && fs.existsSync(solFile) ? JSON.parse(fs.readFileSync(solFile, 'utf8')) : null;
      const fx = sol && id !== 'prologue' ? JSON.parse(fs.readFileSync(path.join(ROOT, 'game/data/fixtures', id + '.json'), 'utf8')) : null;
      if (sol && id !== 'prologue' && fx) {
        // bridge: calm, then to the scheme's start Nest (napping there if the solution starts in another phase), then onto its exact spot
        const b = await pilot((G, W, fx) => {
          const nest = W.NESTS.find((q) => q.id === fx.nest) || W.NESTS[0];
          const g = fx.gus || { x: nest.x, z: nest.z, yaw: 0 };
          const goals = [{ sfIdle: true, frames: 30, timeout: 120 }, { closeMenus: true }];
          if (G.state.phase !== fx.phase) goals.push({ napNest: nest.id, phase: fx.phase, timeout: 300 }, { sfIdle: true, frames: 30, timeout: 120 });
          // land 5 m behind the spot and walk onto it facing the solution's start yaw, so the follow camera eases
          // round behind Gus the way a fixture load leaves it (the recorded stick inputs are camera-relative)
          const yw = g.yaw || 0, bx = g.x - Math.sin(yw) * 5, bz = g.z - Math.cos(yw) * 5;
          goals.push({ landNear: { x: bx, z: bz }, alt: 10, r: 1.5, timeout: 300 }, { walkTo: { x: bx, z: bz }, r: 0.4, timeout: 30 },
            { faceTo: { x: g.x, z: g.z }, timeout: 10 }, { walkTo: { x: g.x, z: g.z }, r: 0.2, timeout: 30 }, { sfIdle: true, frames: 90, timeout: 60 });
          return goals;
        }, { phase: fx.state.phase, gus: fx.state.gus, nest: fx.state.lastNest });
        run.segments.push({ id, kind: 'bridge', ok: b.ok, failed: b.failed, inputs: b.inputs });
        log('bridge', b.ok ? 'ok' : 'FAILED ' + b.failed, b.inputs.reduce((a, f) => a + f[0], 0), 'frames');
      }
      if (sol) {
        await page.evaluate(() => { window.__wgSave = window.__game.dev.snapshot(); window.__wgSaveT = window.__sfG.state.time; });
        const ok = await replay(sol.inputs);
        const after = await st();
        if (after.flags.includes(id)) {
          entry.how = 'recorded solution replayed raw';
          run.segments.push({ id, kind: 'replay', file: `design/solutions/${id}.json`, frames: sol.frames });
          log('replay OK', id, 't', after.t);
          save();
          continue;
        }
        const steps = after.flags.filter((f) => f.startsWith(id + '.s'));
        log('replay FAILED', id, 'steps reached:', steps.join(' '), 'at', after.x, after.z, after.phase, 'carried', after.carried);
        run.segments.push({ id, kind: 'replay', file: `design/solutions/${id}.json`, frames: sol.frames, failed: true, stepsReached: steps, rolledBack: true });
        entry.replayFailed = steps;
        await page.evaluate(() => window.__sfG.loadState(window.__wgSave));
        await page.evaluate(() => window.__game.step(1));
      }
      // bridge: the Spikes / Feuds goal scripts start in their fixture's phase (they were recorded from built fixtures): nap to it at the nearest Nest
      const fxp = fs.existsSync(path.join(ROOT, 'game/data/fixtures', id + '.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'game/data/fixtures', id + '.json'), 'utf8')).state?.phase : null;
      const isSF = await page.evaluate((id) => !!window.__wg.SF[id], id);
      if (isSF && fxp && (await st()).phase !== fxp) {
        const b = await pilot((G, W, ph) => {
          const p = G.gus.position, n = [...W.NESTS].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
          return [{ sfIdle: true, frames: 30, timeout: 120 }, { napNest: n.id, phase: ph, timeout: 300 }, { sfIdle: true, frames: 30, timeout: 120 }];
        }, fxp);
        run.segments.push({ id, kind: 'bridge-nap', ok: b.ok, failed: b.failed, inputs: b.inputs });
        log('bridge nap to', fxp, b.ok ? 'ok' : 'FAILED ' + b.failed);
      }
      // the scheme's goal script (adaptive; it only presses inputs)
      await page.evaluate((id) => { window.__wgId = id; }, id);
      const p = await pilot((G, W) => {
        const f = W.SF[window.__wgId] || W.SSF[window.__wgId] || W.FIN[window.__wgId] || W.GOALS[window.__wgId];
        // picking a scheme up part-way (after a Continue): skip the goals up to the last step flag already set
        const all = f(G).flat(Infinity);
        let k = -1;
        all.forEach((g, i) => { if (typeof g.waitFor === 'string' && g.waitFor.startsWith(window.__wgId + '.s') && G.state.flags[g.waitFor]) k = i; });
        // the finale's goal walks straight at the Workshop cave from wherever Gus is: fly to where its fixture starts first (by the cave)
        if (window.__wgId === 'finale') return [{ landNear: { x: -12, z: 338 }, alt: 8, r: 2, timeout: 200 }, ...all];
        return k >= 0 ? all.slice(k + 1) : all;
      }, null, 3600).catch((e) => ({ ok: false, failed: String(e), inputs: [] }));
      run.segments.push({ id, kind: 'pilot', ok: p.ok, failed: p.failed, inputs: p.inputs });
      let after = await st();
      for (let k = 1; k <= 2 && !after.flags.includes(id); k++) {
        // the goal script got stuck (a person in the way, a landing short): keep playing from where Gus is, picking the
        // script up again at the last move-to goal before the one that stuck (earlier goals are already done)
        const at = +((p.failed || '').match(/goal (\d+)/)?.[1] ?? -1);
        log('pilot', id, 'stuck:', p.failed, '- picking it up again from goal', at, '(retry ' + k + ')');
        entry.retries = k;
        const q = await pilot((G, W, at) => {
          const all = (W.SF[window.__wgId] || W.SSF[window.__wgId] || W.FIN[window.__wgId] || W.GOALS[window.__wgId])(G).flat(Infinity);
          let kd = -1;
          all.forEach((g, i) => { if (typeof g.waitFor === 'string' && g.waitFor.startsWith(window.__wgId + '.s') && G.state.flags[g.waitFor]) kd = i; });
          if (at <= kd) at = kd + 1;   // never go back over a step that is already done
          if (at < 0) { window.__wgJ = 0; return all; }
          let j = at;
          while (j > 0 && !['landNear', 'sfLandNear', 'flyTo', 'napNest', 'sfTalk', 'talk', 'finaleReach'].some((key) => all[j][key] != null)) j--;
          window.__wgJ = j;
          // a walk that can't get there (a bank, a wall, a fountain rim): hop up and come down right by the target first
          const g = all[at] || {};
          let t = null;
          if (g.talk || g.sfTalk) { const c = G.chars.find(g.talk || g.sfTalk); if (c) t = { x: c.x, z: c.z }; }
          else if (g.peck) { const q = G.interact.get(g.peck); if (q) t = { x: q.x, z: q.z }; }
          else if (g.walkTo) t = g.walkTo;
          else if (g.flyTo) { all[at] = { landNear: g.flyTo, alt: g.alt ?? 6, r: g.r ?? 3, timeout: 200 }; }   // the stock flyTo can circle a spot for minutes
          else if (g.pickItem) { const q = G.items.world.find((w) => w.id === g.pickItem); if (q) t = { x: q.x, z: q.z }; }
          const hop = t ? [{ climbTo: 4, timeout: 20 }, { landNear: { x: t.x + 0.9, z: t.z }, alt: 4, r: 1.2, timeout: 90 }] : [];
          const base = t ? at : j;
          window.__wgJ = base - hop.length;
          return [{ sfIdle: true, frames: 20, timeout: 60 }, ...hop, ...all.slice(base)];
        }, at, 3600).catch((e) => ({ ok: false, failed: String(e), inputs: [] }));
        run.segments.push({ id, kind: 'pilot-retry', from: at, ok: q.ok, failed: q.failed, inputs: q.inputs });
        const j = await page.evaluate(() => window.__wgJ ?? 0);
        if (q.failed) p.failed = q.failed.replace(/goal (\d+)/, (m, n) => 'goal ' + (+n - 1 + j));
        after = await st();
      }
      entry.how = (entry.replayFailed ? 'recorded solution drifted; ' : '') + 'played by its goal script (autopilot)';
      entry.done = after.flags.includes(id);
      log('pilot', id, entry.done ? 'DONE' : 'NOT DONE ' + p.failed, 't', after.t);
      save();
      await checkpoint((entry.done ? 'after-' : 'failed-') + String(ORDER.indexOf(id)).padStart(2, '0') + '-' + id);
      if (!entry.done) { log('STOPPING: scheme not finished'); break; }
    }
    // after the finale: the credits and the sting, back to free roam
    await stepUntil('(G) => G.state({ measure: false }).screen === "play" && !G.state({ measure: false }).finale?.running', 600);
    const end = await st();
    run.end = { ...end, flags: undefined, won: end.flags.includes('won'), finale: end.flags.includes('finale') };
    run.consoleErrors = errors.filter((e) => !/favicon/.test(e));
    log('END', JSON.stringify(run.end), 'errors', run.consoleErrors.length, 'wall', Math.round((Date.now() - t0) / 60000), 'min');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'wg-end.png'), timeout: 120000 }).catch(() => {});
    save();
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
