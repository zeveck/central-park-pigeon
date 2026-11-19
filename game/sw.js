// sw.js: offline play (web-target.md's template, extended for a 3D game's
// ~130 MB of models, textures and sound).
//
// The GitHub Pages workflow stamps VERSION with the commit and FILES with
// every file the game can load, as [path, hash, bytes] (see
// .github/workflows/pages.yml; not data/fixtures, test/ or tools/). Unstamped
// (local, `?sw=1`) copies cache as they go.
//
// - install: the page shell (every file outside assets/, plus assets/ui) is
//   cached before the new version takes over. Files whose hash didn't change
//   are copied from the previous version's cache instead of downloaded again,
//   so a deploy that changes one script doesn't re-download 130 MB.
// - fill: once the title is up, the page posts {type: 'fill', urls} with what it
//   loaded at boot. Those are cached first (so the next launch works offline),
//   then the rest of FILES, three at a time, if storage has room for them (and
//   the player hasn't asked to save data). Each message works for at most four
//   minutes (browsers stop a busy worker after five); the page asks again.
// - fetch: cache first, then the network past the HTTP cache (and the answer is cached).
// - update: a new version activates and takes over at once (skipWaiting + claim); the page (ui/offline.js) reloads
//   at the title, or after "Save & quit" when it happened mid-game, so nobody runs old scripts on new files.
'use strict';
const VERSION = '__BUILD__';
const FILES = [/*__FILES__*/].map((f) => (typeof f === 'string' ? [f, '', 0] : f));   // web-target.md's plain list works too (no hashes)
const PREFIX = 'central-park-pigeon-';
const CACHE = PREFIX + VERSION;
const HASH = 'x-cpp-hash';
const stamped = !VERSION.startsWith('__');
const hashOf = new Map(FILES.filter(([, h]) => h).map(([p, h]) => [p, h]));
const isShell = (p) => !p.startsWith('assets/') || p.startsWith('assets/ui/');
const SHELL = stamped ? FILES.filter(([p]) => isShell(p)).map(([p]) => p) : ['manifest.webmanifest', 'favicon.png', 'icon-192.png'];
const scopePath = () => new URL(self.registration.scope).pathname;
const rel = (url) => { const u = new URL(url, self.registration.scope); return u.pathname.startsWith(scopePath()) ? decodeURIComponent(u.pathname.slice(scopePath().length)) : null; };

/** A response stamped with the file's hash, ready to cache. */
function stampedCopy(res, path) {
  const h = hashOf.get(path === '' ? 'index.html' : path);
  if (!h) return res;
  const headers = new Headers(res.headers);
  headers.set(HASH, h);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function fetchInto(cache, path) {
  const key = path === '' ? './' : path;   // '' is the page itself
  const res = await fetch(new Request(key, { cache: 'reload' }));
  if (!res.ok) throw new Error(key + ' ' + res.status);
  await cache.put(key, stampedCopy(res, path));
}

/** Copy every unchanged file from older versions' caches into this one. */
async function reuseOld(cache) {
  if (!stamped) return;
  const old = (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE);
  for (const name of old) {
    const oc = await caches.open(name);
    for (const req of await oc.keys()) {
      const path = rel(req.url);
      if (path == null || !hashOf.has(path) || await cache.match(path)) continue;
      const res = await oc.match(req);
      if (res && res.headers.get(HASH) === hashOf.get(path)) await cache.put(path, res);
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await reuseOld(cache);
    const need = [];
    for (const p of ['', ...SHELL]) if (!(await cache.match(p === '' ? './' : p))) need.push(p);
    for (let i = 0; i < need.length; i += 6) await Promise.all(need.slice(i, i + 6).map((p) => fetchInto(cache, p)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const path = req.mode === 'navigate' ? '' : rel(req.url);
  const key = req.mode === 'navigate' ? './' : req;
  // Fixes-1 (#7): a miss is fetched past the HTTP cache (no-cache: revalidated with the server), so a file the
  // browser cached from the last deploy (Pages max-age=600) is never stored here under this version's hash.
  const fresh = stamped && path != null && req.mode !== 'navigate' ? new Request(req, { cache: 'no-cache' }) : req;
  event.respondWith(caches.open(CACHE).then((cache) =>
    cache.match(key, { ignoreSearch: true }).then((hit) => hit || fetch(fresh).then((res) => {
      if (res.ok && res.status === 200 && path != null) cache.put(key, fresh === req && stamped ? res.clone() : stampedCopy(res.clone(), path)).catch(() => {});
      return res;
    }))));
});

// ---------------------------------------------------------------- the background fill
let filling = null;
async function tell(msg) { for (const c of await self.clients.matchAll()) c.postMessage(msg); }

async function fill({ urls = [], saveData = false }) {
  const cache = await caches.open(CACHE);
  const have = new Set((await cache.keys()).map((r) => rel(r.url)));
  const first = urls.map(rel).filter((p) => p != null && p !== '' && !p.startsWith('data/fixtures/') && !have.has(p));
  let rest = FILES.filter(([p]) => !have.has(p) && !first.includes(p));
  const restBytes = rest.reduce((n, [, , b]) => n + (b || 0), 0);
  let why = '';
  if (saveData) { rest = []; why = 'data saver'; }
  else if (rest.length && navigator.storage?.estimate) {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    if (quota - usage < restBytes * 1.2 + 50e6) { rest = []; why = 'not enough storage'; }
  }
  const todo = [...first, ...rest.map(([p]) => p)];
  const total = FILES.length || todo.length + have.size;
  let done = total - todo.length, failed = 0;
  const until = Date.now() + 4 * 60e3;
  for (let i = 0; i < todo.length && Date.now() < until; i += 3) {
    await Promise.all(todo.slice(i, i + 3).map((p) => fetchInto(cache, p).then(() => { done++; }, () => { failed++; })));
    if (i % 30 === 0) tell({ type: 'fill', done, total, version: VERSION });
  }
  if (!stamped) why = 'local copy';   // no file list: what this launch loaded, plus whatever is fetched later
  tell({ type: 'fill', done, total, complete: stamped && done >= total, partial: !!why, why, failed, version: VERSION });
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'fill') return;
  filling = filling || fill(event.data).finally(() => { filling = null; });
  event.waitUntil(filling);
});
