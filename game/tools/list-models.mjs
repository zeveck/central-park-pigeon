// Writes assets/models/manifest.json: the GLBs that exist, for the model
// registry when the game is served without folder listings (GitHub Pages).
// Run from game/: node tools/list-models.mjs
import { readdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../assets/models/', import.meta.url);
const names = readdirSync(dir).filter((n) => n.endsWith('.glb')).sort();
writeFileSync(new URL('manifest.json', dir), JSON.stringify(names, null, 1) + '\n');
console.log(`${names.length} models:`, names.join(', '));
