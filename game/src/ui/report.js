// "Report a bug" (feedback.md; design: Feedback on). The form is gh-feedback
// (vendor/gh-feedback.js, the <gh-feedback id="report"> at the end of
// index.html). Its repo attribute stays empty until publishing fills it in, and
// with no repo there is no button anywhere and the shortcut does nothing.
//
// - The button is in Pause and Settings (screens.js asks G.reportAvailable()).
// - Ctrl+Shift+L (index.html's early script; L because F is Coo) calls
//   window.reportShortcut, which pauses the game, then opens the form.
// - The screenshot is the play canvas taken as the game pauses (G.takePauseShot,
//   called by G.openMenu before the pause screen goes up), rendered and read in
//   the same task, since WebGL's picture is gone once the frame ends.
// - While the form is open the game ignores every key, touch and controller
//   input (G.reportOpen(); input.js and touch.js check it). Escape closes the
//   form and leaves the game on its pause menu.

const FEEDBACK = 'on';                 // 'on' or 'hidden' (design/STATUS.md)
const KEY = 'cpp-feedback';

export function installReport(G) {
  const fb = document.getElementById('report');
  const q = new URLSearchParams(location.search);
  if (q.has('feedback')) {
    try { if (q.get('feedback') === 'off') localStorage.removeItem(KEY); else localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
  }
  const allowed = () => FEEDBACK === 'on' || (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
  G.reportAvailable = () => !!fb?.getAttribute('repo') && typeof fb.open === 'function' && allowed();
  G.reportOpen = () => !!fb && (document.activeElement === fb || fb._isOpen === true);
  /** True for input the game must ignore: anything aimed at the form, or anything while it's open. */
  G.reportOwns = (e) => !!fb && ((e && e.composedPath?.().includes(fb)) || G.reportOpen());
  if (!fb) return;

  const canvas = G.renderer.domElement;
  let pauseShot = null;
  G.takePauseShot = () => {
    if (G.screen === 'play') { try { G.render(); } catch { /* draw what's there */ } }
    pauseShot = new Promise((r) => canvas.toBlob(r, 'image/png'));
  };
  G.clearPauseShot = () => { pauseShot = null; };
  // polish (P7): from the title or its Settings there's no park on the canvas (the screenshot row showed an empty frame)
  fb.getScreenshot = () => pauseShot ?? (G.screen === 'play' ? new Promise((r) => canvas.toBlob(r, 'image/png')) : null);

  const flat = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const r1 = (v) => Math.round(v * 10) / 10;
  fb.getContext = () => {
    let s = {};
    try { s = window.__game?.state?.({ measure: false }) ?? {}; } catch (e) { s = { error: e.message }; }
    const p = s.player || {};
    const state = s.screen === 'loading' ? `loading ${Math.round((s.progress || 0) * 100)}%`
      : [s.screen, s.menu && `menu ${s.menu}`, s.zone, s.time, p.x != null && `Gus ${r1(p.x)},${r1(p.y)},${r1(p.z)} ${p.mode}${p.vehicle ? ' in ' + p.vehicle : ''}`,
        s.crews && `crews ${s.crews.length}/17`, s.parts && `parts ${s.parts.length}/8`, s.feathers != null && `feathers ${s.feathers}`, s.crumbs != null && `crumbs ${s.crumbs}`,
        s.flock != null && `flock ${s.flock}`, s.tracked && `tracking ${s.tracked}`, s.goal && `step ${s.goal.key}: ${s.goal.goal || ''}`,
        s.cutscene && `cutscene ${s.cutscene}`, G.finale?.stage && `finale ${G.finale.stage}`, s.preset && `graphics ${s.preset.id}${s.preset.auto ? ' (auto)' : ''}`].filter(Boolean).join(' · ');
    return {
      game: 'Central Park Pigeon',
      address: location.origin + location.pathname,
      updated: document.lastModified,
      build: window.desktop ? `desktop app (${window.desktop.platform})` : 'web',
      browser: navigator.userAgent,
      screen: `${innerWidth}x${innerHeight} @${devicePixelRatio}x`,
      input: flat(s.input ? `${s.input.device}${s.input.gamepad ? ' · ' + s.input.gamepad : ''}` : ''),
      state: flat(state).slice(0, 600),
      errors: (window.__errors || []).join(' | ') || 'none',
    };
  };
  // phones held sideways (~390 px tall): a tighter form, so "Continue on GitHub" shows without scrolling.
  // Added to the form's open shadow root as an adopted sheet (it survives the form's re-renders; the
  // vendored file stays unchanged).
  try {
    const sheet = new CSSStyleSheet();
    // polish (P7): the game's fonts and colours, a darker backdrop, no lone last word in the hint
    sheet.replaceSync(`.popup { font-family: 'Nunito', system-ui, sans-serif; }
      .header h2 { font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 22px; color: #26351f; }
      .type-pill, .severity-pill, .submit-btn { font-family: 'Fredoka', sans-serif; font-weight: 600; }
      .submit-btn { font-size: 17px; }
      .field label { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 14px; }
      .backdrop { background: rgba(20, 24, 34, 0.6); }
      .link-hint { text-wrap: balance; }
      @media (max-height: 500px) {
      .header { margin-bottom: 6px; } .header h2 { font-size: 16px; }
      .type-selector, .severity-selector { margin-bottom: 6px; }
      .type-pill, .severity-pill { padding-top: 3px; padding-bottom: 3px; }
      .field { margin-bottom: 6px; } .field label { margin-bottom: 2px; }
      .field input { padding-top: 6px; padding-bottom: 6px; }
      .field textarea { height: 46px; min-height: 46px; padding-top: 6px; padding-bottom: 6px; }
      .char-count { display: none; }
      .shot { margin: 2px 0 6px; } .shot img { height: 34px; width: auto; }
      .submit-btn { padding-top: 7px; padding-bottom: 7px; }
      .link-hint { margin-top: 4px; }
    }`);
    if (fb.shadowRoot) fb.shadowRoot.adoptedStyleSheets = [...fb.shadowRoot.adoptedStyleSheets, sheet];
  } catch { /* older browsers: the form scrolls */ }
  // polish (P7): the form's title says what it is in this game ("Send Feedback" is the component's generic one);
  // it re-renders its shadow DOM, so rename it whenever it does
  const rename = () => { const h = fb.shadowRoot?.querySelector('.header h2'); if (h && h.textContent !== 'Report a bug') h.textContent = 'Report a bug'; const pop = fb.shadowRoot?.querySelector('.popup'); if (pop && pop.getAttribute('aria-label') !== 'Report a bug') pop.setAttribute('aria-label', 'Report a bug'); };
  if (fb.shadowRoot) { rename(); new MutationObserver(rename).observe(fb.shadowRoot, { childList: true, subtree: true }); }
  if (window.desktop) fb.openLink = (url) => { window.open(url, '_blank'); return true; };

  // pause first (taking the picture), then open the form; the game stays paused after it closes
  window.reportShortcut = () => { if (G.screen === 'play') G.pause(); };
  G.openReport = () => {
    if (!G.reportAvailable()) return;
    window.reportShortcut();
    fb.open();
  };
  // when the form closes, put the focus back on the menu underneath (controller and keys keep working)
  fb.addEventListener('focusout', () => setTimeout(() => {
    if (!G.reportOpen() && G.menus.open && !G.menus.top.el.contains(document.activeElement)) G.menus.focusFirst();
  }, 200));
}
