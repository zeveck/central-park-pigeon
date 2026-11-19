#!/usr/bin/env node
// Stamps sw.js for a deploy: VERSION (the commit) and FILES, every file the
// game can load as [path, hash, bytes]. Leaves out what players never load:
// sw.js itself, the test fixtures (data/fixtures), test/ and tools/, and the
// icon's source picture. Run by .github/workflows/pages.yml on the published
// copy; never on the working copy (an unstamped sw.js caches as it goes).
//
//   node tools/stamp-sw.mjs <game dir> <version>

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const [dir, version] = process.argv.slice(2);
if (!dir || !version) { console.error('usage: stamp-sw.mjs <game dir> <version>'); process.exit(1); }
const SKIP = [/^sw\.js$/, /^data\/fixtures\//, /^test\//, /^tools\//, /^assets\/ui\/app-icon\.png$/, /(^|\/)\./];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    const rel = path.relative(dir, full).split(path.sep).join('/');
    if (SKIP.some((r) => r.test(rel))) continue;
    const stat = fs.statSync(full);   // follows links
    if (stat.isDirectory()) walk(full);
    else if (stat.isFile()) {
      const buf = fs.readFileSync(full);
      files.push([rel, crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12), buf.length]);
    }
  }
})(dir);
files.sort((a, b) => (a[0] < b[0] ? -1 : 1));

const swPath = path.join(dir, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes("'__BUILD__'") || !sw.includes('/*__FILES__*/')) { console.error('sw.js is already stamped'); process.exit(1); }
sw = sw.replace("'__BUILD__'", JSON.stringify(String(version))).replace('/*__FILES__*/', files.map((f) => JSON.stringify(f)).join(','));
fs.writeFileSync(swPath, sw);
const mb = files.reduce((n, f) => n + f[2], 0) / 1e6;
console.log(`sw.js stamped ${version}: ${files.length} files, ${mb.toFixed(1)} MB`);
