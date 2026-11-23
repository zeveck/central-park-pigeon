#!/usr/bin/env node
// Which recorded solutions does a change touch? Reads design/solutions/route-index.json (written from a full replay run:
// for each solution file, the 16 m world tiles Gus passed through, sampled every 10 updates, and the systems it used) and
// prints the solutions that cross what you changed, so a change can replay only those.
//
//   node game/tools/affected-solutions.mjs --rect x0,z0,x1,z1 [--rect …]   world metres (+x east, +z north), any corners
//   node game/tools/affected-solutions.mjs --tile tx,tz [--tile …]          16 m tiles: tx = floor(x / 16), tz = floor(z / 16)
//   node game/tools/affected-solutions.mjs --point x,z[,r]                  a spot (r metres round it, default 8)
//   node game/tools/affected-solutions.mjs --system water|grate|race|fight[:name]|vehicle[:id]|item:<id>|step:<flag>
//   options: --margin m (grow every rect and point, default 4) · --json
//
// It covers only where GUS went (and the systems he used). A change to an NPC's route, a vehicle, a timer or anything global can
// move a solution that never crosses the changed tiles: those need judgment (or a full replay).
//
// Systems recorded: water (floating, or within 1 m above water with no deck over it), vehicle:<id>, grate (grate travel),
// fight:<name>, race, plus the carried item ids (item:<id>) and the scheme flags set during the run (step:<flag>).
// Keep the index fresh: it is rewritten whenever all solutions are replayed (see design/reviews/batch-3-grounding.md).

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const all = (k) => args.flatMap((a, i) => (a === '--' + k ? [args[i + 1]] : []));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/solutions/route-index.json'), 'utf8'));
const margin = +opt('margin', '4');
const nums = (v, n, what) => { const a = String(v).split(',').map(Number); if (a.length < n || a.slice(0, n).some((q) => !Number.isFinite(q))) { console.error(`bad ${what}: ${v}`); process.exit(2); } return a; };

const tiles = new Set(all('tile').map((t) => { const [a, b] = nums(t, 2, '--tile tx,tz'); return a + ',' + b; }));
const addRect = (x0, z0, x1, z1) => {
  const [ax, bx] = [Math.min(x0, x1) - margin, Math.max(x0, x1) + margin], [az, bz] = [Math.min(z0, z1) - margin, Math.max(z0, z1) + margin];
  for (let tx = Math.floor(ax / 16); tx <= Math.floor(bx / 16); tx++) for (let tz = Math.floor(az / 16); tz <= Math.floor(bz / 16); tz++) tiles.add(tx + ',' + tz);
};
for (const r of all('rect')) { const [x0, z0, x1, z1] = nums(r, 4, '--rect x0,z0,x1,z1'); addRect(x0, z0, x1, z1); }
for (const p of all('point')) { const [x, z, r = 8] = nums(p, 2, '--point x,z[,r]'); addRect(x - r, z - r, x + r, z + r); }
const systems = all('system');
if (!tiles.size && !systems.length) { console.log('usage: --rect x0,z0,x1,z1 | --tile tx,tz | --point x,z[,r] | --system name  (see the header)'); process.exit(1); }

const hits = [];
for (const [file, fp] of Object.entries(idx.solutions)) {
  const why = [];
  const crossed = fp.tiles.filter((t) => tiles.has(t));
  if (crossed.length) why.push(`tiles ${crossed.slice(0, 6).join(' ')}${crossed.length > 6 ? ' …' : ''}`);
  for (const s of systems) {
    if (s.startsWith('item:')) { if (fp.items.includes(s.slice(5))) why.push(s); }
    else if (s.startsWith('step:')) { if (fp.steps.includes(s.slice(5))) why.push(s); }
    else if (fp.systems.some((q) => q === s || q.startsWith(s + ':'))) why.push(s);
  }
  if (why.length) hits.push({ file, why });
}
if (args.includes('--json')) console.log(JSON.stringify(hits, null, 1));
else { for (const h of hits) console.log(`${h.file}  (${h.why.join('; ')})`); console.log(`${hits.length} of ${Object.keys(idx.solutions).length} solutions (index from ${idx.made})`); }
