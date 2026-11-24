#!/usr/bin/env node
// The mistake sweep (design/changes/mistake-sweep.md): can a player who fumbles still finish every puzzle?
// Each run loads a step's fixture, plays it with the goal script up to the most loaded moment (carrying the item, in the
// vehicle, mid-race, mid-fight), makes ONE mistake (real inputs; the one poke is G.hurt for Ruffled outside a fight;
// Q is real Esc / clicks / a page reload / the title's Continue), then recovers with the scheme's goal script planned
// from wherever things are (src/debug/mistakes.js) until the step's flag is set. The cases, injections, recovery
// planner, checks and oracle are in src/debug/mistakes.js; the autopilot goals they add are in src/debug/pilot-mistake.js.
//
// Runs go through sf-run's job server (one browser, one game load):
//   python3 -m http.server <port> --bind 127.0.0.1 --directory game        (or a server of your own on <port>)
//   node game/tools/sf-run.mjs serve --jobs <dir> --port <port>
//   node game/tools/mistake-sweep.mjs jobs --round 1 --dir <dir> [--fail-dir <d>] [--only key[:CODE],…]   writes NNN-<case>-<code>.job
//   node game/tools/mistake-sweep.mjs collect --dir <dir> [--dir <dir2>] [--round 1]   → design/reviews/mistake-sweep.md (+ .json)
//   node game/tools/mistake-sweep.mjs list                                  every case and code the plan names
// A single run by hand: a job file with `mistake <case> <CODE> [--cap secs] [--fail-dir d]`.
//
// Verdicts: PASS · PASS-HELPED (finished, but only after a nap round or a save-quit-Continue repair) · SLOW (finished past
// the cap) · LOOP / LEFTOVERS / ERRORS (finished, a check failed) · FAIL-SCRIPT (not finished, but the oracle says the step
// is still doable: an autopilot gap) · FAIL-GAME (not finished and not doable even after a nap and a Continue: a dead end,
// must-fix for #23) · UNSURE · HARNESS (the run never reached its mark: fix the harness, not a finding).

import fs from 'fs';
import path from 'path';
import { CASES, roundOne, allJobs, fixtureFor, stepFlag } from '../src/debug/mistakes.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FX = (n) => path.join(ROOT, 'game/data/fixtures', n + '.json');
const fxTime = (n) => (fs.existsSync(FX(n)) ? JSON.parse(fs.readFileSync(FX(n), 'utf8')).state?.time ?? null : null);

/** The recorded game seconds of step n (fixture to fixture; the last step to the solution's end), or null. */
export function recordedSecs(c) {
  const t0 = c.n > 1 ? fxTime(`${c.id}.s${c.n}`) : fxTime(c.id);
  let t1 = fxTime(`${c.id}.s${c.n + 1}`);
  if (t1 == null) { const sol = path.join(ROOT, 'design/solutions', c.goal + '.json'); if (fs.existsSync(sol)) t1 = JSON.parse(fs.readFileSync(sol, 'utf8')).end?.t ?? null; }
  return t0 != null && t1 != null && t1 > t0 && c.goal === c.id ? +(t1 - t0).toFixed(1) : null;
}
const capFor = (c, given) => (given ? +given : Math.max(600, 3 * (recordedSecs(c) || 200)));

// ------------------------------------------------------------------ one run (called by sf-run.mjs: `mistake <case> <code>`)
let lastBad = false;   // the last run failed or errored: start this one on a fresh page
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function waitTitle(page) {
  await page.waitForFunction(() => window.__game && window.__game.state({ measure: false }).screen !== 'loading', null, { timeout: 900000, polling: 1000 });
  await page.evaluate(() => window.__game.ready());
}
async function installPage(page) {
  await page.evaluate(async () => { const m = await import('/src/debug/mistakes.js?v=' + Date.now()); await m.install(); });
}
async function freshPage(page) {
  await page.reload({ waitUntil: 'load', timeout: 900000 });
  await waitTitle(page);
}
async function loadFixture(page, fixture) {
  const [id, s] = fixture.split('.s');
  await page.evaluate(() => { const G = window.__sfG; if (!G) return; G.cutscene.skip(); G.dialogue.clear?.(); G.menus.closeAll(); G.napping = null; G.slowT = 0; G.hitStop = 0; G.shakeT = 0; if (G.vehicles.driving) G.vehicles.exit(); G.pilot = null; G.replayer = null; G.rig.setFree(null); for (const k of ['sf-flash', 'sf-stamp', 'sf-freeze', 'polaroid']) { const el = document.getElementById(k); if (el) el.className = ''; } });
  await page.evaluate(([id, s]) => window.__game.goToScheme(id, s ? +s : null), [id, s]);
  // the slot gets this state, so a Save & quit later has a save of this run (never an older one)
  await page.evaluate(() => { window.__game.step(30, { render: 'none' }); window.__sfG.saveNow(); });
}

/** Run a goal list (built in the page by `src`, a method name on __ms with args) and step until `until` or the pilot ends. */
async function pilot(page, build, until, { maxGame = 900, maxWall = 1800, onChunk = null } = {}) {
  const n = await page.evaluate(async ([m, a]) => { const r = window.__ms[m](...a); const goals = Array.isArray(r) ? r : r.goals; window.__msLast = { how: r.how || '', replan: !!r.replan, n: goals.length }; await window.__ms.start(goals, 300); return window.__msLast; }, build);
  const w0 = Date.now();
  let t = 0, r = null;
  for (;;) {
    r = await page.evaluate(([u]) => window.__ms.run(u, 4), [until]);
    t += 4;
    if (onChunk) onChunk(r);
    if (r.hit || r.pilot !== 'running') break;
    if (t > maxGame || Date.now() - w0 > maxWall * 1000) { await page.evaluate(() => window.__ms.stop()); r.pilot = 'stopped: cap'; break; }
  }
  return { ...r, plan: n };
}

async function saveQuitContinue(page, key, code) {
  await page.evaluate(() => window.__ms.stop());
  const mon = await page.evaluate(() => window.__ms.snapshotMon());
  const t0 = await page.evaluate(() => window.__sfG.state.time);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__game.step(2, { render: 'last' }));
  if (!(await page.evaluate(() => document.querySelector('#pause.on, #pause:not([hidden])') && window.__sfG.menus.top?.id === 'pause'))) await page.evaluate(() => window.__sfG.pause());
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  const saved = await page.evaluate(() => window.__sw?.save());
  await freshPage(page);
  await page.waitForSelector('#title button[data-act=continue]', { timeout: 120000 });
  await page.click('#title button[data-act=continue]');
  await page.waitForFunction(() => window.__game.state({ measure: false }).screen !== 'title', null, { timeout: 120000 });
  await page.evaluate(() => window.__game.step(1, { render: 'last' }));
  await installPage(page);
  await page.evaluate(([k, c, m]) => window.__ms.begin(k, c, m), [key, code, mon]);
  const after = await page.evaluate(() => ({ t: window.__sfG.state.time, repaired: window.__sfG.repaired || null, leftovers: window.__sw.leftovers() }));
  return { quitAt: +t0.toFixed(1), saved, continuedAt: +after.t.toFixed(1), lostSecs: +(t0 - after.t).toFixed(1), repaired: after.repaired, leftoversAfterContinue: after.leftovers };
}

export async function runMistake(page, args, { errors = [] } = {}) {
  const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const key = args[1], code = args[2];
  const c = CASES[key];
  if (!c) throw new Error('no case ' + key);
  const cap = capFor(c, opt('cap'));
  const failDir = opt('fail-dir');
  const w0 = Date.now();
  const row = { case: key, code, round: +(opt('round') || 1), fixture: fixtureFor(c, code), cap, recorded: recordedSecs(c) };
  const out = () => { row.wallSecs = Math.round((Date.now() - w0) / 1000); console.log('MS ' + JSON.stringify(row)); };
  try {
    if (lastBad) { log('fresh page (the last run failed)'); await freshPage(page); }
    lastBad = true;
    errors.length = 0;
    await installPage(page);
    await loadFixture(page, row.fixture);
    await installPage(page);   // (goToScheme can swap the state object: begin after it)
    row.begin = await page.evaluate(([k, cd]) => window.__ms.begin(k, cd), [key, code]);
    // 1. play the step up to the mark
    const half = c.mark === 'half' ? (recordedSecs(c) || 120) / 2 : 0;
    await page.evaluate((h) => window.__ms.beginMark(h), half);
    const atMark = await page.evaluate(() => window.__ms.cond('mark'));
    if (!atMark) {
      // the step's own goals (planned like a recovery: a nap first, a fetch, …) until the mark; a goal that sticks is
      // picked up where it stuck, once
      row.toMark = [];
      let hit = false, failedAt = -1, resumed = false;
      for (let k = 0; k < 6 && !hit; k++) {
        const build = c.markGoal && k === 0 ? ['markGoals', []] : ['plan', [failedAt >= 0 && !resumed ? 1 : 0, failedAt]];
        if (build[1][0] === 1) resumed = true;
        const r = await pilot(page, build, 'mark', { maxGame: 900 });
        const how = await page.evaluate(() => window.__msLast);
        row.toMark.push({ how: how.how || undefined, pilot: r.pilot, at: r.sample });
        hit = r.hit;
        if (hit || (how.replan && r.pilot === 'ok')) continue;
        if (r.pilot === 'ok' || (failedAt >= 0 && resumed && r.pilot.startsWith('failed') && k >= 3)) break;   // the script ran out, or stuck twice
        failedAt = r.failedAt;
      }
      if (!hit) { row.verdict = 'HARNESS'; row.why = 'never reached the mark: ' + row.toMark.map((q) => q.pilot).join(' / '); await keepFail(page, failDir, key, code); return out(); }
    }
    await page.evaluate(() => window.__ms.stop());
    row.mark = await page.evaluate(() => window.__ms.brief());
    // 2. the mistake
    const g0 = await page.evaluate(() => window.__sfG.state.time);
    if (code === 'Q') {
      row.mistake = 'save, quit, Continue'; row.route = 'input';
      await page.evaluate(() => { window.__ms.mon.inject0 = +window.__sfG.state.time.toFixed(1); });
      row.q = await saveQuitContinue(page, key, code);
      await page.evaluate(() => window.__ms.took());
      row.took = true;
    } else {
      const r = await pilot(page, ['injectGoals', []], 'pilotEnd', { maxGame: 600 });
      const tk = await page.evaluate(() => window.__ms.took());
      row.mistake = tk.name; row.route = tk.route; row.took = tk.took; if (!tk.took) row.tookWhy = tk.why;
      if (r.pilot.startsWith('failed')) row.injectNote = r.pilot;
    }
    const g1 = await page.evaluate(() => window.__sfG.state.time);
    row.mistakeSecs = +(g1 - g0).toFixed(1);
    row.afterMistake = await page.evaluate(() => window.__ms.brief());
    // 3. recover: plan from here; on a stuck goal pick it up there; plan afresh; then a nap round
    const done = () => page.evaluate(() => window.__ms.cond('stepDone'));
    row.attempts = [];
    let attempt = 0, failedAt = -1, replans = 0;
    while (!(await done()) && attempt <= 3) {
      const left = cap - ((await page.evaluate(() => window.__sfG.state.time)) - g1);
      if (left <= 0) break;
      const r = await pilot(page, ['plan', [attempt, failedAt]], 'stepDone', { maxGame: left });
      const how = await page.evaluate(() => window.__msLast);
      row.attempts.push({ attempt, how: how.how, replan: how.replan || undefined, result: r.hit ? 'done' : r.pilot, at: r.sample });
      log(`  attempt ${attempt}${how.how ? ' (' + how.how + ')' : ''}: ${r.hit ? 'done' : r.pilot}`);
      if (r.hit) break;
      if (how.replan && r.pilot === 'ok' && replans++ < 4) continue;   // a nap or the keeper's wait first: plan again (not an attempt)
      failedAt = r.failedAt;
      attempt++;
    }
    let ok = await done();
    row.gameSecs = +((await page.evaluate(() => window.__sfG.state.time)) - g1).toFixed(1);
    // 4. not done: is the step still doable? (autopilot gap vs dead end)
    if (!ok) {
      const away = await page.evaluate(() => window.__ms.vehicleAway());
      if (away && !away.home) { await pilot(page, ['wiggleGoals', []], 'pilotEnd', { maxGame: 240 }); }
      row.oracle = await page.evaluate(() => window.__ms.satisfiable());
      if (row.oracle.ok) { row.verdict = 'FAIL-SCRIPT'; row.why = 'not finished; the oracle says the step is still doable: ' + JSON.stringify(row.oracle.checks).slice(0, 300); }
      else {
        // a nap, then Save & quit → Continue (repairSpent), then look again and try once more
        await pilot(page, ['repairGoals', []], 'pilotEnd', { maxGame: 400 });
        row.repair = await saveQuitContinue(page, key, code);
        const away2 = await page.evaluate(() => window.__ms.vehicleAway());
        if (away2 && !away2.home) await pilot(page, ['wiggleGoals', []], 'pilotEnd', { maxGame: 240 });
        row.oracle2 = await page.evaluate(() => window.__ms.satisfiable());
        const r = await pilot(page, ['plan', [0, -1]], 'stepDone', { maxGame: cap });
        row.attempts.push({ attempt: 'after repair', result: r.hit ? 'done' : r.pilot, at: r.sample });
        ok = await done();
        if (ok) row.helped = 'nap + Continue repair';
        else if (row.oracle2.ok) { row.verdict = 'FAIL-SCRIPT'; row.why = 'doable after the repair, the script still could not: ' + row.oracle2.fails.join('; '); }
        else { row.verdict = 'FAIL-GAME'; row.why = 'not doable after a nap and a Continue: ' + row.oracle2.fails.join('; '); }
      }
    }
    // 5. the checks
    if (ok) {
      // let the step's scene play out (up to a minute) before looking for leftovers
      await page.evaluate(() => window.__ms.stop());
      for (let k = 0; k < 15; k++) { const r = await page.evaluate(() => window.__ms.run('idle', 4, false)); if (r.hit) break; }
      // timed overlays (a join's polaroid closes 3.5 s after it opens) get up to 12 s more; one still up after that is stuck
      for (let k = 0; k < 3; k++) { if (!(await page.evaluate(() => window.__sw.leftovers().overlays))) break; await page.evaluate(() => window.__ms.run('idle', 4, false)); }
    }
    const fin = await page.evaluate(() => window.__ms.finish());
    row.recovery = fin.recovery; row.loops = fin.loops; row.nudge = fin.nudge; row.leftovers = fin.leftovers;
    row.retries = row.attempts.filter((a) => typeof a.attempt === 'number').length - 1;
    if (row.attempts.some((a) => a.attempt === 3) && ok && !row.helped) row.helped = 'nap round';
    const errs = errors.filter((e) => !/favicon/.test(e));
    row.errors = errs.length; if (errs.length) row.errorList = errs.slice(0, 5);
    if (ok) {
      // (only what a player would be stuck with counts: a scene, a script, a locked camera, an overlay, a scripted vehicle)
      const left = Object.keys(row.leftovers || {}).filter((k) => ['cutscene', 'busy', 'finale', 'altView', 'cameraLocked', 'overlays', 'bodyClass', 'slowmo', 'autoDrive', 'scriptedVehicles'].includes(k));
      row.verdict = row.helped ? 'PASS-HELPED' : 'PASS';
      if (row.gameSecs > cap) row.verdict = 'SLOW';
      if (row.loops.length) row.verdict = 'LOOP';
      if (left.length) row.verdict = 'LEFTOVERS';
      if (errs.length) row.verdict = 'ERRORS';
    }
    if (!row.verdict) row.verdict = 'UNSURE';
    lastBad = !/^PASS/.test(row.verdict);
    if (lastBad) await keepFail(page, failDir, key, code);
  } catch (e) {
    row.verdict = row.verdict || 'HARNESS'; row.why = (row.why ? row.why + ' / ' : '') + 'JOB ERROR ' + String(e).slice(0, 400);
    lastBad = true;
    await keepFail(page, failDir, key, code).catch(() => {});
  }
  out();
  if (!/^PASS/.test(row.verdict)) process.exitCode = 1;
}

async function keepFail(page, dir, key, code) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${key}-${code}`);
  try { await page.evaluate(() => window.__game.step(1, { render: 'last' })); await page.screenshot({ path: base + '.png', timeout: 120000 }); } catch { /* best effort */ }
  try { fs.writeFileSync(base + '.json', JSON.stringify(await page.evaluate(() => window.__game.dev.snapshot()))); } catch { /* best effort */ }
}

// ------------------------------------------------------------------ CLI: jobs, collect, list
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const all = (k) => args.flatMap((a, i) => (a === '--' + k ? [args[i + 1]] : []));
  const cmd = args[0];
  if (cmd === 'list') {
    for (const j of allJobs()) { const c = CASES[j.key]; console.log(`${j.key.padEnd(26)} ${j.code.padEnd(3)} ${(c.m[j.code]?.name || 'save, quit, Continue').padEnd(58)} fixture ${fixtureFor(c, j.code)}  step flag ${stepFlag(c)}  rec ${recordedSecs(c) ?? '-'} s  cap ${capFor(c)} s`); }
    const r1 = roundOne();
    console.log(`round 1: ${r1.length} runs (${r1.filter((j) => j.code !== 'Q').length} mistakes + ${r1.filter((j) => j.code === 'Q').length} save-quit-Continue); all: ${allJobs().length}`);
    const miss = allJobs().filter((j) => !fs.existsSync(FX(fixtureFor(CASES[j.key], j.code))));
    if (miss.length) { console.log('MISSING fixtures:', miss.map((j) => `${j.key}:${j.code}`).join(' ')); process.exitCode = 1; }
  } else if (cmd === 'jobs') {
    const dir = path.resolve(opt('dir'));
    const round = +(opt('round') || 1);
    let list = round === 1 ? roundOne() : allJobs();
    if (opt('only')) { const only = opt('only').split(','); list = list.filter((j) => only.some((o) => o === j.key || o === `${j.key}:${j.code}`)); }
    if (opt('codes')) { const want = opt('codes').split(','); list = list.filter((j) => want.some((o) => o === `${j.key}:${j.code}`)); }
    fs.mkdirSync(dir, { recursive: true });
    const failDir = opt('fail-dir') || path.join(dir, 'fail');
    let n = +(opt('start') || 1), runs = 0;
    const put = (line, name) => { fs.writeFileSync(path.join(dir, `${String(n).padStart(3, '0')}-${name}.job`), line + '\n'); n++; };
    let sinceReload = 0;
    for (const j of list) {
      const c = CASES[j.key];
      if (sinceReload >= 8) { put('reload', 'reload'); sinceReload = 0; }
      put(`mistake ${j.key} ${j.code} --round ${round} --fail-dir ${failDir}`, `${j.key}-${j.code}`);
      runs++; sinceReload = j.code === 'Q' ? 0 : sinceReload + 1;   // (a Q run reloads the page itself)
      // a fresh page after vehicle and fight runs (SwiftShader memory, scripted leftovers)
      if (j.code !== 'Q' && (c.vehicle || c.fight)) { put('reload', 'reload'); sinceReload = 0; }
    }
    console.log(`wrote ${runs} runs (+ reloads) to ${dir}, jobs ${String(+(opt('start') || 1)).padStart(3, '0')}–${String(n - 1).padStart(3, '0')}`);
  } else if (cmd === 'collect') {
    const dirs = all('dir').map((d) => path.resolve(d));
    const outJson = path.join(ROOT, 'design/reviews/mistake-sweep.json');
    const db = fs.existsSync(outJson) && !args.includes('--fresh') ? JSON.parse(fs.readFileSync(outJson, 'utf8')) : { runs: {} };
    for (const d of dirs) for (const f of fs.readdirSync(d).filter((q) => q.endsWith('.out')).sort()) {
      for (const line of fs.readFileSync(path.join(d, f), 'utf8').split('\n')) {
        const m = line.match(/^MS (\{.*\})\s*$/);
        if (!m) continue;
        const r = JSON.parse(m[1]);
        db.runs[`${r.case}|${r.code}`] = { ...r, job: f };
      }
    }
    fs.writeFileSync(outJson, JSON.stringify(db, null, 1));
    writeMd(db, outJson.replace(/\.json$/, '.md'));
    console.log('collected', Object.keys(db.runs).length, 'runs →', path.relative(ROOT, outJson.replace(/\.json$/, '.md')));
  } else {
    console.log('usage: jobs --round 1 --dir <dir> | collect --dir <dir> [--dir <dir2>] | list   (see the header)');
  }
}

function writeMd(db, file) {
  const runs = Object.values(db.runs).sort((a, b) => (a.round - b.round) || a.case.localeCompare(b.case) || a.code.localeCompare(b.code));
  const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
  const rec = (r) => { const x = r.recovery || {}; const p = []; if (x.keeper) p.push(`keeper ${x.keeper}`); if (x.refill) p.push(`refill ${x.refill}`); if (x.tow) p.push(`tow ${x.tow}`); if (x.naps) p.push(`naps ${x.naps}`); if (r.q?.repaired || x.repaired) p.push(`repairSpent: ${esc((r.q?.repaired || x.repaired).join(' / '))}`); if (r.helped) p.push(`helped: ${r.helped}`); return p.join(', ') || '-'; };
  const count = {}; for (const r of runs) count[r.verdict] = (count[r.verdict] || 0) + 1;
  const rows = runs.map((r) => `| ${r.round} | ${r.case} | ${r.code}: ${esc(r.mistake)} | ${r.route || '-'} | ${r.took === false ? 'NO: ' + esc(r.tookWhy) : r.took ? `yes (${r.mistakeSecs} s)` : '-'} | ${rec(r)} | ${r.retries ?? '-'} | ${r.gameSecs ?? '-'} / ${r.cap} | ${r.wallSecs} | ${r.errors ?? '-'} | ${esc((r.loops || []).join('; ')) || '-'} | ${esc((r.nudge || []).join('; ')) || '-'} | **${r.verdict}**${r.why ? ': ' + esc(r.why).slice(0, 220) : ''} |`);
  const bad = runs.filter((r) => /FAIL|UNSURE|HARNESS/.test(r.verdict));
  fs.writeFileSync(file, `# Mistake sweep (#23): a fumbling player can still finish every puzzle

Plan: design/changes/mistake-sweep.md (rounds, one browser). Tool: \`node game/tools/mistake-sweep.mjs\` (jobs / collect) over
\`node game/tools/sf-run.mjs serve\` jobs \`mistake <case> <code>\`; cases, injections, recovery and checks in src/debug/mistakes.js.
Each run: the step's fixture → its goal script to the most loaded moment → ONE mistake (real inputs; Ruffled outside a fight is the
one poke, G.hurt) → the goal script again, planned from wherever things are, until the step's flag. Times are game seconds.

Totals: ${Object.entries(count).map(([k, v]) => `${k} ${v}`).join(' · ')} (${runs.length} runs)

Columns: mistake took (game s it took) · recovery (keeper put-backs, sill refills, tows, naps, what repairSpent put back on a Continue,
and any help the driver needed) · retries (re-plans after a stuck goal) · game s / cap (max(600, 3 x the recorded step) after the
mistake) · wall s · console errors · loops (a toast 4x in 60 s, the keeper putting the same item back 3+ times, the step script
starting 4+ times, Ruffled after the mistake) · nudge (the compass, the keeper's toast, the cold card, the nudge after a failure).

| Round | Case | Mistake | Route | Took | Recovery | Retries | Game s / cap | Wall s | Errors | Loops | Nudge | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Not passed

${bad.length ? bad.map((r) => `- **${r.case} ${r.code}** (${r.verdict}): ${esc(r.why)}\n  Reproduce: a job file \`mistake ${r.case} ${r.code}\` for \`node game/tools/sf-run.mjs serve\`; screenshot and save in the fail dir (${r.case}-${r.code}.png / .json).${r.oracle ? `\n  Oracle: ${esc(JSON.stringify(r.oracle2 || r.oracle).slice(0, 400))}` : ''}`).join('\n') : 'None.'}
`);
}
