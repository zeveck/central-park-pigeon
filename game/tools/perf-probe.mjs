#!/usr/bin/env node
// Perf pass: measures the renderer at representative spots on one preset and
// writes a JSON breakdown (game/src/debug/perf.js buckets every draw call and
// its triangles by pass and by what drew it), plus a screenshot per spot.
//
//   node game/tools/perf-probe.mjs --preset high --port 8171 --out <file.json> [--shots <dir>] [--spots a,b] [--phases afternoon,night]
//
// Each spot loads the same fixture (so people and animals are where a player
// would find them), sets the phase, puts Gus there with __game.goTo, then
// steps 40 fixed updates with a render every 4 (GL draws off: perf.js
// drawsOff, so SwiftShader doesn't rasterise) so the pools and the triangle
// governor settle, then measures with and without the shadow pass. Same
// inputs, same frames: before/after runs are comparable. Screenshots are real
// renders of the canvas (no HUD). The server must be running:
//   taskset -c 0-2 python3 -m http.server 8171 --bind 127.0.0.1 --directory game
// and run this under taskset -c 0-2 too (one software-WebGL browser).

import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), '@playwright/cli/node_modules/playwright'));

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const preset = opt('preset', 'high');
const port = opt('port', '8171');
const settle = +opt('settle', '40');
const fixture = opt('fixture', 'den-meermob');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// data-frame positions (+x east, +z north); yaw 0 looks north
const SPOTS = {
  bethesda: { view: 'bethesda-fountain' },
  rink: { view: 'wollman' },
  columbus: { view: 'columbus-column' },
  'bow-bridge': { view: 'bow-bridge' },
  ramble: { view: 'ramble' },
  'sheep-meadow': { view: { gus: { x: -52, z: 138, mode: 'walk', yaw: 0.15 } } },
  reservoir: { view: 'reservoir' },
  'fifth-110th': { view: { gus: { x: 119, z: 1062, mode: 'walk', yaw: -2.5 } } },
  'high-midpark': { view: { gus: { x: 0, z: 330, y: 95, mode: 'fly', yaw: 0 } } },
  stomp: { finale: 'stomp', settle: 120 },
  climb: { finale: 'climb', settle: 120 },
};

const only = opt('spots') ? opt('spots').split(',') : Object.keys(SPOTS);
const phases = (opt('phases') || 'afternoon,night').split(',');
const shots = opt('shots');
const out = opt('out') || path.join(ROOT, `design/perf-${preset}.json`);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: +opt('w', '800'), height: +opt('h', '450') } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?preset=${preset}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state().screen !== 'loading', null, { timeout: 900000 });
  await page.evaluate(() => window.__game.ready());
  for (const phase of phases) {
    for (const name of only) {
      const spot = SPOTS[name];
      if (!spot) { console.log('no spot', name); continue; }
      if (spot.finale && phase !== phases[0]) continue;   // the finale has its own lighting
      const r = await page.evaluate(async ([name, spot, phase, fixture, settle]) => {
        const g = window.__game, G = window.__G;
        const t0 = performance.now();
        const { profile, drawsOff } = await import('/src/debug/perf.js');
        drawsOff(G, true);
        G.finale?.running && G.finale.parts?.climb?.cleanup?.();
        G.altView = null;
        await g.goToScheme(spot.finale ? 'finale' : fixture);
        if (spot.finale) g.goTo(spot.finale);
        else { g.dev.setPhase(phase); g.goTo(spot.view); }
        const t1 = performance.now();
        G.budgetScale = 1;
        g.step(spot.settle || settle, { render: 4 });
        await g.ready();
        g.step(2, { render: 1 });
        const t2 = performance.now();
        const noShadow = profile(G, { shadow: false });
        const full = profile(G);
        const s = g.state({ measure: false });
        return {
          spot: name, phase, budgetScale: +(G.budgetScale ?? 1).toFixed(3), total: full.total, noShadow: noShadow.total, passes: full.passes,
          rows: full.rows.map((q) => ({ ...q, tris: Math.round(q.tris) })), trees: s.trees, crowds: s.crowds.drawn, humans: s.humans, characters: s.characters,
          player: { x: s.player.x, y: s.player.y, z: s.player.z }, ms: [Math.round(t1 - t0), Math.round(t2 - t1), Math.round(performance.now() - t2)],
        };
      }, [name, spot, phase, fixture, spot.settle || settle]);
      results.push(r);
      console.log(`${preset} ${phase.padEnd(9)} ${name.padEnd(13)} tris ${(r.total.triangles / 1000).toFixed(0).padStart(5)}k calls ${String(r.total.calls).padStart(4)}  (no shadow ${(r.noShadow.triangles / 1000).toFixed(0)}k/${r.noShadow.calls})  budget ${r.budgetScale}  people ${r.humans.animated}+${r.humans.frozen} chars ${r.characters.drawn} crowd ${r.crowds.full}/${r.crowds.lod}  ms ${r.ms}`);
      if (shots) {
        fs.mkdirSync(path.resolve(ROOT, shots), { recursive: true });
        // the canvas only (a page screenshot waits on the compositor, which is very slow under SwiftShader)
        const url = await page.evaluate(async () => { const G = window.__G; (await import('/src/debug/perf.js')).drawsOff(G, false); G.render(); return G.renderer.domElement.toDataURL('image/png'); });
        fs.writeFileSync(path.resolve(ROOT, shots, `${name}-${spot.finale ? 'finale' : phase}-${preset}.png`), Buffer.from(url.split(',')[1], 'base64'));
      }
    }
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
} finally {
  fs.writeFileSync(out, JSON.stringify({ preset, when: new Date().toISOString(), fixture, settle, results }, null, 1));
  await browser.close();
}
