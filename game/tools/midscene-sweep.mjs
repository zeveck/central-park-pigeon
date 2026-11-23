#!/usr/bin/env node
// "Quit mid-scene, then Continue" sweep (Fixes-3; bughunter-2 B1 + B2). For every scheme step that runs a
// scripted scene (every step whose `does.script` is set), both showpieces at several points, and the finale's
// stages, in ONE headless browser:
//
//   1. load the step's fixture (data/fixtures/<id>.s<n>.json, or <id>.json for step 1) and save it (the last good save)
//   2. trigger the step the way a player would: the scheme's goal script (src/debug/goals*.js; the autopilot only
//      presses inputs), from the goal after the previous step's flag, until the step's scene is running; then
//      `quitAt` seconds into the scene:
//      (b) Esc → Pause's "Save & quit to title" → the title's Continue (real clicks, same page)
//          → the leftover check (sound loops, scripted vehicles, scripted characters and people, cutscene, busy
//            scripts, the finale, a locked camera, overlays, the cinematic HUD) and a world check against a fresh
//            boot of the same save (what is shown or hidden, where vehicles, carts and characters stand)
//          → the step's goal script again: the step's trigger is available again (the scene starts again)
//      (a) while that scene plays: the page is hidden (visibilitychange) and reloaded (pagehide) → Continue
//          → the leftover check → the goal script until the step is DONE
//   3. a row per case: what the save held after each quit (step index, carried item), the leftovers (none), and
//      whether the step was re-triggered / completed.
//
//   node game/tools/midscene-sweep.mjs [--port 8261] [--only den-ducks.s3,finale] [--out design/reviews/fixes-3-midscene-sweep.json]
//                                      [--w 640 --h 360] [--from <case>]
// The server must be running (python3 -m http.server 8261 --bind 127.0.0.1 --directory game). Run it under
// `taskset -c 0-2`. The browser is closed on every exit path (and on SIGINT / SIGTERM).

import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), '@playwright/cli/node_modules/playwright'));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = opt('port', '8261');
const OUT = path.resolve(ROOT, opt('out', 'design/reviews/fixes-3-midscene-sweep.json'));
const URL0 = `http://127.0.0.1:${PORT}/?preset=low`;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const { SCHEMES } = await import(path.join(ROOT, 'game/src/data/schemes.js'));

// ------------------------------------------------------------------ the cases
// quit points (seconds into the step's scene) for (b) and (a); the showpieces and the finale get several
const SHOW = {
  'part-talons.s3': [[0.5, 6], [14, 26]],                 // the Rink Job: the pancake / the door; the avalanche / the tag
  'part-power.s1': [[0.5, 5]], 'part-power.s2': [[0.5, 4]],
  'part-power.s3': [[0.5, 8], [16, 24]],                  // the Wedding: the stampede; the battery / the photo
};
const FINALE_STAGES = ['doors', 'biggify', 'stomp', 'climb', 'shout', 'credits'];
function cases() {
  const out = [];
  for (const s of SCHEMES) {
    if (s.id === 'finale') continue;
    s.steps.forEach((st, i) => {
      const scripts = [...new Set([st.does?.script, ...(st.alts || []).map((a) => a.does?.script)].filter(Boolean))];
      if (!scripts.length) return;
      const key = `${s.id}.s${i + 1}`;
      for (const [qb, qa] of SHOW[key] || [[0.5, 1.2]]) out.push({ key: SHOW[key] ? `${key}@${qb}` : key, id: s.id, n: i + 1, scripts, qb, qa });
    });
  }
  for (const stage of FINALE_STAGES) out.push({ key: `finale@${stage}`, id: 'finale', n: 1, scripts: ['finale'], stage });
  return out;
}

// ------------------------------------------------------------------ the browser
let browser = null;
const closeAll = async () => { try { await browser?.close(); } catch { /* */ } browser = null; };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await closeAll(); process.exit(130); });

async function boot() {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +opt('w', '640'), height: +opt('h', '360') } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL0, { waitUntil: 'load' });
  await waitTitle(page);
  return { page, errors };
}
async function waitTitle(page) {
  await page.waitForFunction(() => window.__game && window.__game.state({ measure: false }).screen !== 'loading', null, { timeout: 900000, polling: 1000 });
  await page.evaluate(() => window.__game.ready());
  await inject(page);
}

/** In-page helpers: the goal lists, the leftover fingerprint, the world summary (src/debug/sweep-lib.js, shared with
 *  tools/mistake-sweep.mjs). */
async function inject(page) {
  await page.evaluate(async () => { await (await import('/src/debug/sweep-lib.js')).install(); });
}

// ------------------------------------------------------------------ steps on the fixed clock
async function stepUntil(page, src, maxSecs, chunk = 30, render = 'none') {
  for (let secs = 0; secs < maxSecs; secs += chunk / 60 * 4) {
    const r = await page.evaluate(([s, ch, rd]) => {
      const G = window.__game, done = new Function('G', 'return (' + s + ')(G)');
      for (let i = 0; i < 4; i++) { G.step(ch, { render: rd }); if (done(G)) return true; }
      return false;
    }, [src, chunk, render]);
    if (r) return true;
  }
  return false;
}
const sceneOn = (c) => `(G) => window.__sfG.schemes.busy.has(${JSON.stringify(c.id)}) && window.__sfG.schemes.stepIndex(${JSON.stringify(c.id)}) === ${c.n - 1}${c.stage ? ` && window.__sfG.finale.stage === ${JSON.stringify(c.stage)}` : ''}`;
const stepDone = (c) => `(G) => !!window.__sfG.state.flags[${JSON.stringify(c.n === SCHEMES.find((s) => s.id === c.id).steps.length ? c.id : `${c.id}.s${c.n}`)}]`;

/** Run the step's goal script until `until` holds (retrying a stuck script twice). */
async function playUntil(page, c, until, maxSecs = 2400) {
  let goals = 'slice', at = null, lastWhy = '';
  for (let k = 0; k <= 2; k++) {
    await page.evaluate(async ([id, mode, at]) => { const goals = mode === 'slice' ? window.__sw.slice(id) : window.__sw.retry(id, at); await window.__game.autopilot(goals, { timeout: 300, record: false }); }, [c.id, goals, at]);
    const ok = await stepUntil(page, `(G) => (${until})(G) || !G.pilot().running`, maxSecs);
    if (await page.evaluate(`(${until})(window.__game)`)) return { ok: true, retries: k };
    const res = await page.evaluate(() => window.__game.pilot().result);
    if (!ok) return { ok: false, why: 'stepped past max' };
    if (res?.ok) {
      // the script ran out: give the scene time to start / finish
      if (await stepUntil(page, until, 120)) return { ok: true, retries: k };
      return { ok: false, why: 'goal script ended, condition not met' };
    }
    lastWhy = (res?.failed || '').slice(0, 160);
    at = +((res?.failed || '').match(/goal (\d+)/)?.[1] ?? -1);
    goals = 'retry';
    log('   goal script stuck:', (res?.failed || '').slice(0, 120), '- retry', k + 1);
  }
  const diag = await page.evaluate(() => { const g = window.__sfG; return { busy: [...g.schemes.busy], cut: g.cutscene.name, beat: g.cutscene.i, dlg: g.dialogue.open ? g.dialogue.line?.text?.slice(0, 40) : null, menu: g.menus.top?.id || null, t: +g.state.time.toFixed(1) }; });
  return { ok: false, why: 'goal script stuck 3 times: ' + lastWhy + ' ' + JSON.stringify(diag) };
}

/** Into the scene and `secs` on. Returns the scene's name, or null if it ended first (or never started). */
async function intoScene(page, c, secs) {
  const p = await playUntil(page, c, sceneOn(c));
  if (!p.ok) return { ok: false, why: p.why };
  await page.evaluate(() => window.__sw.stopPilot());
  const t0 = await page.evaluate(() => window.__sfG.state.time);
  // step on to the quit point, frame by frame near the end, stopping if the scene is over
  const r = await page.evaluate(([id, secs, t0]) => {
    const G = window.__game, g = window.__sfG;
    while (g.state.time - t0 < secs) { G.step(1, { render: 'none' }); if (!g.schemes.busy.has(id)) return { over: true, t: g.state.time - t0 }; }
    return { over: false, t: g.state.time - t0, scene: g.cutscene.name, stage: g.finale?.stage || null };
  }, [c.id, secs ?? 0, t0]);
  if (r.over) return { ok: false, why: `scene over after ${r.t.toFixed(2)} s` };
  await page.evaluate(() => window.__game.step(1, { render: 'last' }));
  return { ok: true, scene: r.scene, stage: r.stage, t: +r.t.toFixed(2) };
}

/** Fallback trigger: the scheme's recorded solution (design/solutions/<id>.json) replayed from its own fixture (real,
 *  recorded inputs) until the step's scene runs, then `secs` on. Used where a goal script can't pick up from a step fixture. */
async function replayInto(page, c, secs) {
  const sol = JSON.parse(fs.readFileSync(path.join(ROOT, `design/solutions/${c.id}.json`), 'utf8'));
  const m = (sol.start || '').match(/goToScheme\('([^']+)'(?:,\s*(\d+))?\)/);
  await page.evaluate(([id, n]) => window.__game.goToScheme(id, n), [m ? m[1] : c.id, m?.[2] ? +m[2] : null]);
  await page.evaluate(([f, version]) => window.__game.replay(f.map(([n, h, x, y]) => ({ n, h, x, y })), { version }), [sol.inputs, sol.version || 0]);   // Batch-2 (#5)
  const ok = await stepUntil(page, sceneOn(c), 3000, 60, 60);   // stepped exactly as sf-run.mjs replays (60 updates, a render)
  await page.evaluate(() => { const G = window.__sfG; G.replayer = null; G.input.clearAuto?.(); });
  if (!ok) return { ok: false, why: 'the replay never reached the scene' };
  const t0 = await page.evaluate(() => window.__sfG.state.time);
  const r = await page.evaluate(([id, secs, t0]) => {
    const G = window.__game, g = window.__sfG;
    while (g.state.time - t0 < secs) { G.step(1, { render: 'none' }); if (!g.schemes.busy.has(id)) return { over: true, t: g.state.time - t0 }; }
    return { over: false, t: g.state.time - t0, scene: g.cutscene.name, stage: g.finale?.stage || null };
  }, [c.id, secs ?? 0, t0]);
  if (r.over) return { ok: false, why: `scene over after ${r.t.toFixed(2)} s` };
  await page.evaluate(() => window.__game.step(1, { render: 'last' }));
  return { ok: true, scene: r.scene, stage: r.stage, t: +r.t.toFixed(2), via: 'replay' };
}

/** After a Continue: is step n's trigger there to be used again? (what a spent trigger looked like in B1; sweep-lib.js) */
async function avail(page, c) {
  return page.evaluate(([id, n]) => window.__sw.avail(id, n), [c.id, c.n]);
}

async function clickContinue(page) {
  await page.waitForSelector('#title button[data-act=continue]', { timeout: 120000 });
  await page.click('#title button[data-act=continue]');
  await page.waitForFunction(() => window.__game.state({ measure: false }).screen !== 'title', null, { timeout: 60000 });
  await page.evaluate(() => window.__game.step(1, { render: 'last' }));   // freeze the clock again
}

function diffWorld(a, b) {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k}: ${JSON.stringify(a[k])} vs fresh ${JSON.stringify(b[k])}`);
  return out;
}

// ------------------------------------------------------------------ one case
async function runCase(env, c) {
  const { page } = env;
  const row = { key: c.key, scripts: c.scripts.join(' '), b: {}, a: {} };
  const t0 = Date.now();
  // 1. the fixture, saved as the last good save
  const fx = c.n > 1 && fs.existsSync(path.join(ROOT, `game/data/fixtures/${c.id}.s${c.n}.json`)) ? c.n : null;
  await page.evaluate(([id, n]) => window.__game.goToScheme(id, n), [c.id, fx]);
  await page.evaluate(() => { window.__game.step(30, { render: 'none' }); window.__sfG.saveNow(); });
  row.fixture = fx ? `${c.id}.s${fx}` : c.id;
  // 2b. into the scene; Esc → Save & quit → Continue
  const qb = c.stage ? 0.5 : c.qb;
  let s = REPLAY_FIRST.has(c.key) ? { ok: false, why: 'goal script could not pick up here (an earlier pass)' } : await intoScene(page, c, qb), via = 'goals';
  if (!s.ok && fs.existsSync(path.join(ROOT, `design/solutions/${c.id}.json`))) { row.goalsFailed = s.why; await page.evaluate(() => window.__sw.stopPilot()); s = await replayInto(page, c, qb); via = 'replay'; }
  if (!s.ok) { row.b = { error: s.why }; return row; }
  row.via = via;
  row.b.quitIn = `${s.scene || s.stage || '(script)'} @${s.t}s`;
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__game.step(2, { render: 'last' }));
  if (!(await page.evaluate(() => document.querySelector('#pause.on, #pause:not([hidden])') && window.__sfG.menus.top?.id === 'pause'))) { await page.evaluate(() => window.__sfG.pause()); }
  await page.click('#pause [data-act="quit"]');
  row.b.save = await page.evaluate(() => window.__sw.save());
  const rawB = await page.evaluate(() => localStorage.getItem('cpp-slot-' + (window.__sfG?.saves?.current() || 1)));
  await clickContinue(page);
  row.b.after = await page.evaluate(() => ({ step: window.__sfG.schemes.stepIndex(window.__swId), carried: window.__sfG.state.carried?.id || null, repaired: window.__sfG.repaired || null }));
  row.b.leftovers = await page.evaluate(() => window.__sw.leftovers());
  const worldB = await page.evaluate(() => window.__sw.world());
  row.b.trigger = await avail(page, c);
  // the trigger again (this is also the setup for (a))
  const qa = c.stage ? 0.5 : c.qa;
  if (via === 'goals') {
    s = await intoScene(page, c, qa);
    // a goal script that can't run twice from the same spot (it napped already, so its nap menu has nothing to pick): replay
    if (!s.ok && fs.existsSync(path.join(ROOT, `design/solutions/${c.id}.json`))) { row.b.goalsAgainFailed = s.why; await page.evaluate(() => { window.__sw.stopPilot(); window.__sfG.closeMenus(); }); s = await replayInto(page, c, qa); if (s.ok) via = 'replay'; }
  } else s = await replayInto(page, c, qa);
  row.b.retrigger = s.ok ? (via === 'goals' ? 'scene started again' : 'scene run again (replay from the fixture)') : 'FAILED: ' + s.why;
  if (!s.ok) return row;
  row.a.quitIn = `${s.scene || s.stage || '(script)'} @${s.t}s`;
  // 2a. the page is hidden, then closed (reload) mid-scene → Continue
  await page.evaluate(() => { window.__game.resume(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  row.a.save = await page.evaluate(() => window.__sw.save());
  await page.reload({ waitUntil: 'load' }); await waitTitle(page);
  row.a.saveAfterClose = await page.evaluate(() => window.__sw.save());
  const rawA = await page.evaluate(() => localStorage.getItem('cpp-slot-' + (window.__sfG?.saves?.current() || 1)));
  await page.evaluate((id) => { window.__swId = id; }, c.id);
  await clickContinue(page);
  // (b)'s world check: the in-page Continue against a fresh boot of the same save (this one, when nothing saved since)
  const same = (x, y) => { const f = (r) => { const o = JSON.parse(r); delete o.savedAt; if (o.data) delete o.data.savedAt; return JSON.stringify(o); }; return f(x) === f(y); };
  if (same(rawA, rawB)) row.b.worldDiff = diffWorld(worldB, await page.evaluate(() => window.__sw.world()));
  row.a.after = await page.evaluate(() => ({ step: window.__sfG.schemes.stepIndex(window.__swId), carried: window.__sfG.state.carried?.id || null, repaired: window.__sfG.repaired || null }));
  row.a.leftovers = await page.evaluate(() => window.__sw.leftovers());
  row.a.trigger = await avail(page, c);
  if (via === 'goals') {
    const done = await playUntil(page, c, stepDone(c), 3000);
    row.a.completed = done.ok ? `yes${done.retries ? ` (${done.retries} retr${done.retries > 1 ? 'ies' : 'y'})` : ''}` : 'NO: ' + done.why;
  } else row.a.completed = /SPENT|NOT at hand|not haulable/.test(row.a.trigger) ? 'NO: ' + row.a.trigger : 'trigger available: ' + row.a.trigger;
  if (!row.b.worldDiff) {
    // a save was made between the two quits: boot (b)'s save fresh for the world check
    await page.evaluate((r) => localStorage.setItem('cpp-slot-' + (window.__sfG?.saves?.current() || 1), r), rawB);
    await page.reload({ waitUntil: 'load' }); await waitTitle(page);
    await clickContinue(page);
    row.b.worldDiff = diffWorld(worldB, await page.evaluate(() => window.__sw.world()));
  }
  row.secs = Math.round((Date.now() - t0) / 1000);
  return row;
}

// ------------------------------------------------------------------ the table (design/reviews/fixes-3-midscene-sweep.md)
function writeTable(results) {
  const md = OUT.replace(/\.json$/, '.md');
  const lo = (o) => (o && Object.keys(o).length ? Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('; ') : 'none');
  const sv = (x) => (x ? `step ${x.step + 1}${x.carried ? `, carrying ${x.carried}` : ''}${x.repaired ? `, repaired ${x.repaired.join(' / ')}` : ''}` : '-');
  const rows = Object.values(results.rows).map((r) => {
    if (r.error || r.b?.error) return `| ${r.key} | ${r.scripts || ''} | ERROR: ${(r.error || r.b.error).replace(/\|/g, '/')} | | | | | |`;
    return `| ${r.key} | ${r.scripts} | ${r.b.quitIn} | ${sv(r.b.after)} | ${lo(r.b.leftovers)}${r.b.worldDiff?.length ? `; world: ${r.b.worldDiff.join('; ').replace(/\|/g, '/')}` : ''} | ${r.b.trigger ? r.b.trigger + '; ' : ''}${r.b.retrigger}${r.via === 'replay' ? ' [via replay]' : ''} | ${r.a.quitIn || '-'} → ${sv(r.a.after)}; leftovers ${lo(r.a.leftovers)} | ${r.a.completed || '-'}${r.consoleErrors?.length ? ` (console: ${r.consoleErrors.length})` : ''} |`;
  });
  fs.writeFileSync(md, `# Fixes-3: quit mid-scene, then Continue (sweep)

Tool: \`node game/tools/midscene-sweep.mjs\` (one headless browser, port 8261, Low preset, 640×360). For every scheme step with a
scripted scene, the Rink Job and the Wedding at several points, and the finale's stages: the step's fixture is loaded and saved,
the scheme's goal script (real inputs) plays until the step's scene runs, then **(b)** Esc → Save & quit → Continue in the same
page (leftover check, and the world compared with a fresh boot of the same save), the goal script triggers the step again, and
**(a)** while that scene plays the page is hidden and reloaded → Continue → leftover check → the goal script completes the step.

"Continue state" is what the save held: the step it was on (the last autosave before the trigger: no save is made mid-scene).

| Case | Script | (b) quit in | (b) Continue state | (b) leftovers / world diff | trigger again | (a) quit in → Continue state | step completed after (a) |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`);
}

// ------------------------------------------------------------------ main
// --replay-first <earlier results.json>: cases whose goal script failed there go straight to the replay trigger
const REPLAY_FIRST = new Set();
if (opt('replay-first')) for (const r of Object.values(JSON.parse(fs.readFileSync(path.resolve(ROOT, opt('replay-first')), 'utf8')).rows)) if (/goal script/.test(r.error || r.b?.error || r.b?.retrigger || '')) REPLAY_FIRST.add(r.key);
const only = opt('only') ? opt('only').split(',') : null;
let list = cases().filter((c) => !only || only.some((o) => c.key === o || c.key.startsWith(o + '@') || c.id === o));
if (opt('from')) list = list.slice(Math.max(0, list.findIndex((c) => c.key === opt('from'))));
const results = fs.existsSync(OUT) && !args.includes('--fresh') ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { rows: {} };
log('cases:', list.length);
let env = null;
try {
  env = await boot();
  let n = 0;
  for (const c of list) {
    await env.page.evaluate((id) => { window.__swId = id; }, c.id);
    log('==', c.key);
    let row;
    try { row = await runCase(env, c); } catch (e) { row = { key: c.key, error: String(e).slice(0, 400) }; }
    row.consoleErrors = env.errors.filter((e) => !/favicon/.test(e)).slice(0, 5); env.errors.length = 0;
    results.rows[c.key] = { ...row, at: new Date().toISOString() };
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
    writeTable(results);
    log('  ', JSON.stringify(row).slice(0, 900));
    // a fresh browser every 12 cases (SwiftShader memory)
    if (++n % 12 === 0) { await closeAll(); env = await boot(); }
  }
} finally {
  await closeAll();
}
log('done');
