// Offline play, the page's half (sw.js is the other). Once the title is up, ask
// the service worker to cache what this launch loaded first (so the next launch
// works with no network), then the rest of the game, while there's room for it.
// Settings shows how far it got (G.offlineStatus()).

export function installOffline(G) {
  const sw = navigator.serviceWorker;
  let status = null;        // null: no service worker (local copies without ?sw=1)
  let asks = 0;
  const ask = () => {
    const ctl = sw?.controller;
    if (!ctl) return;
    asks++;
    const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin));
    ctl.postMessage({ type: 'fill', urls, saveData: !!navigator.connection?.saveData });
  };
  G.offlineStatus = () => status;
  if (!sw) return;
  // Fixes-1 (#7): a new version took over (index.html's early script). On the title, reload now; mid-game, say so
  // once and reload at the next "Save & quit" (G.quitToTitle), so the game never runs old scripts on new files.
  const onUpdate = () => {
    if (G.screen !== 'play') { location.reload(); return; }
    if (G.updateReady) return;
    G.updateReady = true;
    G.toast('A new version of the park is ready: it loads when you Save & quit.', { seconds: 6 });
  };
  window.__onSwUpdate = onUpdate;
  if (window.__swUpdated) onUpdate();
  sw.addEventListener('message', (e) => {
    const m = e.data;
    if (m?.type !== 'fill') return;
    const pct = m.total ? Math.floor((m.done / m.total) * 100) : 0;
    if (m.complete) status = 'ready';
    else if (m.partial) status = `the places you've visited (${{ 'data saver': 'data saver is on', 'local copy': 'a local copy' }[m.why] || 'not enough storage for the whole park'})`;
    else status = `saving the park, ${pct}%`;
    if ('complete' in m && !m.complete && !m.partial && asks < 20) setTimeout(ask, 3000);   // the worker stops after a few minutes: carry on
    G.menus?.screens.get('settings')?.refreshOffline?.();
  });
  sw.ready.then(() => {
    status = status || 'getting ready';
    // installed as an app: ask the browser to keep the cache (no prompt there)
    if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) navigator.storage?.persist?.().catch(() => {});
    if (sw.controller) ask();
    else sw.addEventListener('controllerchange', ask, { once: true });
  });
}
