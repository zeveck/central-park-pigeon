#!/usr/bin/env node
// Records and replays scheme solutions in a real (headless) browser, the way
// design/solutions/prologue.json was made: load a fixture with
// __game.goToScheme, run the scheme's goal script with the autopilot (it only
// presses inputs), step the fixed clock, and write the raw inputs it pressed.
// Replay feeds a solution back with the autopilot off and checks the scheme
// (or step) completed. Spikes + Feuds builder's tool (milestone 3b).
//
//   node game/tools/sf-run.mjs record <goal> [--fixture id[.sN]] [--out design/solutions/<goal>.json] [--until flag]
//   node game/tools/sf-run.mjs replay <solution.json> [--fixture id[.sN]] [--until flag]
//   node game/tools/sf-run.mjs fixture <id> <out-name> --from <fixture> --goal <goal>   (run a goal, save the state as a fixture)
//   node game/tools/sf-run.mjs check hop | hop-tap | hop-fly | hold-fly | legacy   (Batch-2: the hop checks, src/debug/hop-checks.js)
//   node game/tools/sf-run.mjs mistake <case> <code> [--cap s] [--fail-dir d]   (#23 mistake sweep: tools/mistake-sweep.mjs; usually a serve job)
// Batch-2 (#5): record writes version 2; replay passes the file's version to __game.replay (none → G.legacyTakeoff).
// Options: --port 8141 · --shots dir (a screenshot whenever the cutscene/dialogue changes) · --max secs
//
// Goals live in src/debug/goals-sf.js (GOALS_SF). The server must be running:
//   python3 -m http.server 8141 --bind 127.0.0.1 --directory game

import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const root = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(root, '@playwright/cli/node_modules/playwright'));

let args = process.argv.slice(2);
let mode = args[0];
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const port = opt('port', '8141');
const maxSecs = +opt('max', '1500');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

async function boot() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +opt('w', '960'), height: +opt('h', '540') } });
  // Fixes-2: no HTTP cache, so a `reload` job always runs the files as they are on disk (python's http.server sends only
  // Last-Modified, and Chrome's heuristic freshness kept serving edited modules from cache across reloads)
  // Fixes-3: Network.enable first (without it setCacheDisabled did nothing, and a `reload` job still ran cached modules)
  try { const cdp = await page.context().newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); page.__cdp = cdp; } catch { /* best effort */ }
  const errors = [];
  page.__errors = errors;   // (the mistake sweep counts them per run)
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?preset=${opt('preset', 'low')}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state().screen !== 'loading', null, { timeout: 900000 }).catch((e) => { console.log('boot failed; page errors:', errors.slice(0, 8)); throw e; });
  await page.evaluate(() => window.__game.ready());
  return { browser, page, errors };
}

async function load(page, fixture) {
  const [id, s] = fixture.split('.s');
  await page.evaluate(() => { const G = window.__sfG; if (!G) return; G.cutscene.skip(); G.dialogue.clear?.(); G.menus.closeAll(); G.napping = null; G.slowT = 0; G.hitStop = 0; G.shakeT = 0; if (G.vehicles.driving) G.vehicles.exit(); G.pilot = null; G.replayer = null; G.rig.setFree(null); for (const id of ['sf-flash', 'sf-stamp', 'sf-freeze', 'polaroid']) { const el = document.getElementById(id); if (el) el.className = ''; } });
  return page.evaluate(([id, s]) => window.__game.goToScheme(id, s ? +s : null).then((st) => ({ x: st.player.x, z: st.player.z, phase: st.time })), [id, s]);
}

/** Step the clock in chunks until done() says so (evaluated in the page). */
async function stepUntil(page, doneFn, shots) {
  let secs = 0, lastKey = '';
  for (;;) {
    const r = await page.evaluate(([fn, rnd, ch]) => {
      const G = window.__game;
      const done = new Function('G', 'return (' + fn + ')(G)'); const RENDER = rnd; const CH = ch;
      for (let i = 0; i < CH; i++) {
        G.step(RENDER, { render: RENDER });
        if (window.__sfScheme) { const st = G.state({ measure: false }); const k = st.schemes.steps?.[window.__sfScheme]; if (k != null && k > 0 && k !== window.__sfLastK) { window.__sfLastK = k; window.__sfPending = k + 1; } window.__sfSnapCheck?.(); }
        if (done(G)) return { done: true };
      }
      const s = G.state({ measure: false });
      return { done: false, key: (s.cutscene || '') + '|' + (s.dialogue?.text || ''), pilot: s.pilot, t: s.gameTime };
    }, [doneFn.toString(), +opt('render', shots ? '30' : '60'), shots ? 1 : 4]);
    secs += shots ? 0.5 : 4;
    if (r.done) return true;
    if (shots && r.key !== '|' && (r.key !== lastKey || /rinkjob|wedding|flypast|truce|join|release|vanoff|drink|jingle|lawn|balls|home/.test(r.key))) { lastKey = r.key; fs.mkdirSync(shots, { recursive: true }); const fn = path.join(shots, `t${String(Math.round(r.t * 10)).padStart(6, "0")}`);
      try { await page.screenshot({ timeout: 45000, path: fn + '.png' }); }
      catch {
        // fallback: the canvas only (no HUD), with what was on screen as a caption file
        const cap = await page.evaluate(() => { const G = window.__sfG; G.render(); return { url: G.renderer.domElement.toDataURL('image/jpeg', 0.85), text: [document.querySelector('#dialogue.on')?.innerText, document.getElementById('sf-stamp')?.className === 'on' ? document.getElementById('sf-stamp').innerText : '', document.getElementById('sf-freeze')?.innerText].filter(Boolean).join(' | ') }; });
        fs.writeFileSync(fn + '.jpg', Buffer.from(cap.url.split(',')[1], 'base64'));
        if (cap.text) fs.writeFileSync(fn + '.txt', cap.text);
      } }
    if (secs > +opt('max', '3000')) return false;
  }
}

async function main() {
  const { browser, page, errors } = await boot();
  if (mode === 'serve') {
    // one browser, one load: run job files dropped into --jobs <dir> (<name>.job = an argv line), output to <name>.out;
    // a job reading `exit` closes the browser and ends the server
    const dir = opt('jobs');
    fs.mkdirSync(dir, { recursive: true });
    console.log('serving jobs from', dir);
    for (;;) {
      const jobs = fs.readdirSync(dir).filter((f) => f.endsWith('.job')).sort();
      if (!jobs.length) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      const jf = path.join(dir, jobs[0]);
      const line = fs.readFileSync(jf, 'utf8').trim();
      fs.renameSync(jf, jf + '.running');
      const logs = [];
      const orig = console.log; console.log = (...a) => { logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); orig(...a); };
      errors.length = 0; process.exitCode = 0;
      try {
        if (line === 'exit') { fs.writeFileSync(jf.replace(/\.job$/, '.out'), 'bye\nEXIT 0\n'); fs.unlinkSync(jf + '.running'); await browser.close(); process.exit(0); }   // Fixes-1: stop cleanly (closes the browser)
        if (line === 'reload') { await page.reload({ timeout: 900000 }); await page.waitForFunction(() => window.__game && window.__game.state().screen !== 'loading', null, { timeout: 900000 }); await page.evaluate(() => window.__game.ready()); console.log('reloaded'); }
        else if (line.startsWith('code ')) { console.log(JSON.stringify(await new Function('page', 'return (async () => {' + line.slice(5) + '})()')(page))); }   // fix-16-19-23: real key presses (page.keyboard) between steps
        else if (line.startsWith('eval ')) { console.log(JSON.stringify(await page.evaluate(new Function('return (async () => {' + line.slice(5) + '})()')))); }
        else if (line === 'scan') { await page.addScriptTag({ path: (process.env.GAMEGEN_SCAN_TEXT || 'scan-text.js') }); console.log(JSON.stringify(await page.evaluate(() => window.__scanText()))); }
        else if (line.startsWith('size ')) { const [w, h] = line.slice(5).trim().split(/\s+/).map(Number); await page.setViewportSize({ width: w, height: h }); console.log('size', w, h); }   // Fixes-2: phone-sized shots
        else if (line.startsWith('touch ')) { const on = line.slice(6).trim() === 'on'; await page.__cdp.send('Emulation.setTouchEmulationEnabled', { enabled: on, maxTouchPoints: on ? 5 : 1 }); await page.__cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: on, configuration: 'mobile' }); console.log('touch', on, await page.evaluate(() => matchMedia('(pointer: coarse)').matches)); }   // polish: phone screens (coarse pointer, no hover)
        else if (line.startsWith('shot ')) { await page.screenshot({ timeout: 400000, path: path.resolve(ROOT, line.slice(5).trim()) }); console.log('shot', line.slice(5)); }
        else { args = line.split(/\s+/); mode = args[0]; await runJob(page); }
      } catch (e) { console.log('JOB ERROR', String(e).slice(0, 2000)); }
      const errs = errors.filter((e) => !/favicon/.test(e));
      if (errs.length) console.log('console errors:', errs.slice(0, 10));
      console.log = orig;
      fs.writeFileSync(jf.replace(/\.job$/, '.out'), logs.join('\n') + `\nEXIT ${process.exitCode || 0}\n`);
      fs.unlinkSync(jf + '.running');
    }
  }
  try { await runJob(page); } finally {
    const errs = errors.filter((e) => !/favicon/.test(e));
    if (errs.length) console.log('console errors:', errs.slice(0, 10));
    await browser.close();
  }
}

async function runJob(page) {
  {
    if (mode === 'record' || mode === 'fixture') {
      const goal = mode === 'record' ? args[1] : opt('goal');
      const fixture = opt('fixture') || opt('from') || goal;
      await load(page, fixture);
      // per-step fixtures: the state at the start of each step (taken when the park is calm again)
      await page.evaluate(([sid]) => {
        const G = window.__game; window.__sfSnaps = {}; window.__sfPending = null;
        window.__sfSnapCheck = () => {
          const n = window.__sfPending; if (!n) return;
          const s = G.state({ measure: false });
          if (s.cutscene || s.dialogue || s.menu || s.schemes.busy.length || s.player.mode === 'fly' || s.player.driving) return;
          window.__sfSnaps[n] = G.dev.snapshot(); window.__sfPending = null;
        };
                window.__sfScheme = sid; window.__sfLastK = 0;
      }, [goal.replace(/\.(alt|s\d+).*$/, '')]);
      await page.evaluate(async ([goal]) => { const { GOALS_SF } = await import('/src/debug/goals-sf.js?v=' + Date.now()); if (!GOALS_SF[goal]) Object.assign(GOALS_SF, (await import('/src/debug/goals-finale.js?v=' + Date.now())).GOALS_FINALE); if (!GOALS_SF[goal]) { const SSF = (await import('/src/debug/goals-ssf.js')).SSF; if (SSF[goal]) GOALS_SF[goal] = () => SSF[goal](window.__sfG); } if (!GOALS_SF[goal]) { const B = (await import('/src/debug/goals.js')).GOALS; if (B[goal]) GOALS_SF[goal] = () => B[goal](window.__sfG); }   /* Fixes-2: the base goals (prologue) too */ if (!GOALS_SF[goal]) { const Ph = (await import('/src/debug/goals-photo.js?v=' + Date.now())).GOALS_PHOTO; if (Ph[goal]) GOALS_SF[goal] = Ph[goal]; }   /* photo mode (#9): goals-photo.js */   /* playtest: SSF goals too */ if (!GOALS_SF[goal]) throw new Error('no goal ' + goal); await window.__game.autopilot(GOALS_SF[goal]()); }, [goal]);
      const ok = await stepUntil(page, (G) => !G.pilot().running, opt('shots'));
      const res = await page.evaluate(() => { const G = window.__game; const s = G.state({ measure: false }); return { pilot: s.pilot.result, rec: G.recording(), end: { t: s.gameTime, phase: s.time, crumbs: s.crumbs, flock: s.flock, x: s.player.x, z: s.player.z, crews: s.crews, parts: s.parts, open: s.openSchemes, flags: s.flags.length }, flags: s.flags }; });
      console.log(JSON.stringify({ stepped: ok, result: res.pilot, end: res.end }, null, 1).slice(0, 3000));
      if (!res.pilot?.ok) { console.log('FAILED', res.pilot?.failed); process.exitCode = 1; }
      const until = opt('until');
      if (until && !res.flags.includes(until)) { console.log('flag not set:', until); process.exitCode = 1; }
      if (mode === 'record' && res.pilot?.ok) {
        const out = opt('out') || `design/solutions/${goal}.json`;
        const frames = res.rec.reduce((a, f) => a + f.n, 0);
        const sol = {
          scheme: goal.replace(/\.(alt|s\d+).*$/, ''), start: `__game.goToScheme('${fixture.split('.s')[0]}'${fixture.includes('.s') ? ', ' + fixture.split('.s')[1] : ''})`, fixture: `game/data/fixtures/${fixture}.json`,
          recordedBy: `__game.autopilot(GOALS_SF['${goal}']()) (game/src/debug/goals-sf.js), game/tools/sf-run.mjs`,
          note: 'Raw inputs per fixed 1/60 s update, run-length encoded: [frames, held actions (comma list), stick x, stick y]. Replay with __game.replay() (autopilot off): node game/tools/sf-run.mjs replay <this file>.',
          version: 2,   // Batch-2 (#5): recorded with the hop take-off (no version = replay with G.legacyTakeoff)
          frames, end: res.end, inputs: res.rec.map((f) => [f.n, f.h, f.x, f.y]),
        };
        fs.writeFileSync(path.join(ROOT, out), JSON.stringify(sol));
        console.log('wrote', out, frames, 'frames');
      }
      if (mode === 'record' && res.pilot?.ok && !args.includes('--no-step-fixtures')) {
        const snaps = await page.evaluate(() => window.__sfSnaps || {});
        const sid = goal.replace(/\.(alt|s\d+).*$/, '');
        for (const [n, st] of Object.entries(snaps)) {
          const name = `${sid}.s${n}${goal.includes('.alt') ? '.alt' : ''}`;
          if (goal.includes('.alt')) continue;   // the main route's step fixtures only
          fs.writeFileSync(path.join(ROOT, 'game/data/fixtures', name + '.json'), JSON.stringify({ scheme: sid, step: +n, note: `The state at the start of ${sid} step ${n}, taken while recording design/solutions/${goal}.json (game/tools/sf-run.mjs).`, state: st }));
          console.log('wrote step fixture', name);
        }
      }
      if (mode === 'fixture') {
        const out = args[2];
        const st = await page.evaluate(() => window.__game.dev.snapshot());
        const fx = { scheme: args[1], note: opt('note') || `State recorded at the end of goal ${goal} from fixture ${fixture} (game/tools/sf-run.mjs).`, state: st };
        fs.writeFileSync(path.join(ROOT, 'game/data/fixtures', out + '.json'), JSON.stringify(fx));
        console.log('wrote fixture', out);
      }
    } else if (mode === 'replay') {
      const file = args[1];
      const sol = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
      // (perf pass: an alt that starts from its own fixture names it only in `start`, e.g. goToScheme('gear-pen.alt'))
      const st = (sol.start || '').match(/goToScheme\('([^']+)'(?:,\s*(\d+))?\)/);
      const fixture = opt('fixture') || (sol.fixture ? path.basename(sol.fixture, '.json') : st ? st[1] + (st[2] ? '.s' + st[2] : '') : sol.scheme);
      await load(page, fixture);
      const frames = sol.inputs.map(([n, h, x, y]) => ({ n, h, x, y }));
      await page.evaluate(([f, version]) => window.__game.replay(f, { version }), [frames, sol.version || 0]);   // Batch-2 (#5)
      console.log('takeoff:', sol.version >= 2 ? 'hop (version ' + sol.version + ')' : 'legacy');
      const ok = await stepUntil(page, (G) => !G.replayStatus().active, opt('shots'));
      // let the last cutscene settle
      await page.evaluate(() => window.__game.step(240, { render: 60 }));
      const until = opt('until') || sol.scheme;
      const res = await page.evaluate((u) => { const s = window.__game.state({ measure: false }); return { flag: s.flags.includes(u), end: { t: s.gameTime, crumbs: s.crumbs, flock: s.flock, x: s.player.x, z: s.player.z, crews: s.crews, parts: s.parts } }; }, until);
      console.log(JSON.stringify({ replayed: ok, completed: res.flag, until, end: res.end, recordedEnd: sol.end }, null, 1));
      if (!res.flag) process.exitCode = 1;
    } else if (mode === 'check') {
      // Batch-2 (#5): the hop checks (src/debug/hop-checks.js): check hop-tap | hop-fly | hold-fly | legacy | hop (all four)
      const names = args[1] === 'hop' ? ['hop-tap', 'hop-fly', 'hold-fly', 'legacy'] : [args[1]];
      await load(page, opt('fixture') || 'den-ducks');
      for (const n of names) {
        const r = await page.evaluate(async (n) => (await import('/src/debug/hop-checks.js')).runHopCheck(window.__game, n), n);
        console.log(JSON.stringify(r));
        if (!r.ok) process.exitCode = 1;
      }
    } else if (mode === 'mistake') {
      // #23 mistake sweep: one (case, mistake) run; prints one `MS {json}` line (tools/mistake-sweep.mjs collects them)
      await (await import('./mistake-sweep.mjs')).runMistake(page, args, { errors: page.__errors });
    } else {
      console.log('usage: record <goal> | replay <file> | fixture <id> <out> --from <fx> --goal <goal> | mistake <case> <code> | serve --jobs <dir>');
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
