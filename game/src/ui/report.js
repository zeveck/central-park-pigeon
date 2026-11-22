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
// - While the form is open the game ignores every key and touch (G.reportOpen();
//   input.js and touch.js check it). Escape closes the form and leaves the game
//   on its pause menu.
// - Controllers (Fixes-4, #8: a pad player was stuck in the form): input.js keeps
//   tracking the pad but hands its presses to padPress below. ○ / B closes the
//   form, the D-pad and stick move focus through it, ✕ / A presses the focused
//   button. A pad can't type, so the form has one-press choices that fill the
//   title. Sending opens GitHub in a new tab; a controller press isn't a browser
//   "user gesture", so the browser may block that tab: the form then says
//   plainly that the last step needs a mouse, touch or keyboard.

import { glyph } from './glyphs.js';

const FEEDBACK = 'on';                 // 'on' or 'hidden' (design/STATUS.md)
const KEY = 'cpp-feedback';
// Fixes-4 (#8): one press fills the title (a controller can't type)
const CHOICES = ['I\u2019m stuck', 'A button doesn\u2019t work', 'Something looks wrong', 'Confusing', 'I lost progress', 'Other'];

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
    }
      /* Fixes-4 (#8): the one-press choices, and a clear focus ring for a controller */
      .quick { margin: 0 0 12px; }
      .quick-label { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #26351f; }
      .quick-row { display: flex; flex-wrap: wrap; gap: 6px; }
      .quick-pill { font: 600 13px/1.2 'Fredoka', sans-serif; padding: 6px 11px; border-radius: 999px; cursor: pointer;
        border: 1.5px solid rgba(38, 53, 31, 0.25); background: #fffaf0; color: #26351f; }
      .quick-pill:hover { border-color: #E07B39; }
      .quick-pill.active { background: #E07B39; border-color: #E07B39; color: #fff; }
      .quick-hint, .pad-send { font-size: 13px; line-height: 1.35; color: #5a4a2e; text-wrap: balance; }
      .quick-hint { margin-top: 6px; color: #9a3d12; font-weight: 700; }
      .pad-send { margin-top: 8px; text-align: center; }
      .pad-note { margin-top: 10px; font-weight: 700; color: #9a3d12; text-wrap: balance; border-radius: 8px; }
      .pad-note.flash { animation: padflash 0.9s ease-out 2; }
      @keyframes padflash { 0% { background: #ffd8a8; } 100% { background: transparent; } }
      :host(.ghf-pad) .link-hint { display: none; }
      :host(:not(.ghf-pad)) .pad-send { display: none; }
      :host(.ghf-pad) .popup :focus { outline: 3px solid #26351f; outline-offset: 2px; }
      svg.pad { display: inline-block; width: 1.5em; height: 1.5em; vertical-align: middle; }
      .padtxt { display: inline-flex; align-items: center; justify-content: center; width: 1.5em; height: 1.5em; border-radius: 50%;
        color: #fff; font-family: 'Fredoka', sans-serif; font-weight: 700; font-size: 0.85em; vertical-align: middle; }
      @media (max-height: 820px) and (min-height: 501px) {
        .header { margin-bottom: 10px; }
        .type-selector, .severity-selector { margin-bottom: 10px; }
        .field { margin-bottom: 10px; }
        .field textarea { height: 58px; min-height: 58px; }
        .char-count { display: none; }
        .shot { margin: 4px 0 10px; } .shot img { height: 40px; width: auto; }
      }
      @media (max-height: 500px) {
        .quick { margin-bottom: 6px; } .quick-label { margin-bottom: 3px; font-size: 13px; }
        .quick-row { gap: 4px; } .quick-pill { padding-top: 3px; padding-bottom: 3px; }
      }`);
    if (fb.shadowRoot) fb.shadowRoot.adoptedStyleSheets = [...fb.shadowRoot.adoptedStyleSheets, sheet];
  } catch { /* older browsers: the form scrolls */ }
  if (window.desktop) fb.openLink = (url) => { window.open(url, '_blank'); return true; };

  // pause first (taking the picture), then open the form; the game stays paused after it closes
  const pauseFirst = () => { if (G.screen === 'play') G.pause(); };
  // Ctrl+Shift+L: the keyboard opened it (the game never sees that key, so its last device may still be the pad)
  window.reportShortcut = () => { G.reportByKeys = true; pauseFirst(); };
  G.openReport = () => {
    if (!G.reportAvailable()) return;
    pauseFirst();
    fb.open();
  };
  installQuickAndPad(G, fb);
  // when the form closes, put the focus back on the menu underneath (controller and keys keep working)
  fb.addEventListener('focusout', () => setTimeout(() => {
    if (!G.reportOpen() && G.menus.open && !G.menus.top.el.contains(document.activeElement)) G.menus.focusFirst();
  }, 200));
}

// Fixes-4 (#8): the one-press choices (added to the form's open shadow root each time it opens, since the form
// re-renders itself when its attributes change) and controller support while the form is open.
function installQuickAndPad(G, fb) {
  // the shadow root is looked up as it's needed (review: a form without one at install still gets B to close it)
  const root = () => fb.shadowRoot;
  const fam = () => G.input?.gamepad?.family || 'xbox';
  const pg = (a) => glyph(a, 'gamepad', fam());
  const setPad = (on) => fb.classList.toggle('ghf-pad', on);
  // the last device used decides which hints show; a mouse, touch or key in the form switches back
  for (const t of ['pointerdown', 'keydown']) fb.addEventListener(t, () => setPad(false), true);

  const ensure = () => {
    const sr = root();
    if (!sr) return null;
    let q = sr.querySelector('.quick');
    if (!q) {
      q = document.createElement('div');
      q.className = 'quick';
      q.setAttribute('role', 'group');
      q.setAttribute('aria-labelledby', 'quick-label');
      q.innerHTML = `<div class="quick-label" id="quick-label">What happened? Pick one, or type your own title.</div>
        <div class="quick-row">${CHOICES.map((c) => `<button type="button" class="quick-pill">${c}</button>`).join('')}</div>
        <div class="quick-hint" role="status" hidden></div>`;
      sr.querySelector('.header')?.after(q);
      q.querySelectorAll('.quick-pill').forEach((b) => b.addEventListener('click', () => pick(b)));
    }
    let ps = sr.querySelector('.pad-send');
    if (!ps) {
      ps = document.createElement('div');
      ps.className = 'pad-send';
      sr.querySelector('.submit-btn')?.after(ps);
    }
    // honest about what a controller can do: GitHub's page is where the report is finished
    ps.innerHTML = `Opens GitHub to finish, which needs a mouse, touch or keyboard (and a GitHub account). ${pg('uiBack')} closes this.`;
    const hint = sr.querySelector('.quick-hint');
    if (hint) hint.hidden = true;
    sr.querySelectorAll('.quick-pill').forEach((b) => b.classList.remove('active'));
    return q;
  };
  const pick = (b) => {
    const sr = root();
    const title = sr?.querySelector('#ghf-title');
    if (!title) return;
    title.value = b.textContent;
    title.dispatchEvent(new Event('input', { bubbles: true }));   // the form clears its "title needed" error
    sr.querySelectorAll('.quick-pill').forEach((p) => p.classList.toggle('active', p === b));
    const hint = sr.querySelector('.quick-hint');
    if (hint) hint.hidden = true;
    const send = sr.querySelector('.submit-btn');
    send?.focus();
    (fb.classList.contains('ghf-pad') ? sr.querySelector('.pad-send') : send)?.scrollIntoView?.({ block: 'nearest' });
  };

  // nothing held as the form opens stays held after it closes (the form keeps its keyups from the game)
  fb.addEventListener('gh-feedback:open', () => {
    G.input?.releaseAll?.();
    ensure();
    const pad = !G.reportByKeys && G.input?.device === 'gamepad';
    setPad(pad);
    G.reportByKeys = false;
    // with a controller, focus starts on the first choice; otherwise the form focuses the title box itself (50 ms
    // later), so a keyboard player can type at once
    if (pad) root()?.querySelector('.quick-pill')?.focus();
  });
  fb.addEventListener('gh-feedback:close', () => G.input?.releaseAll?.());
  // a send that couldn't open the tab: say what finishing takes, and wait for that click
  fb.addEventListener('gh-feedback:opened', (e) => {
    if (e.detail?.opened || !fb.classList.contains('ghf-pad')) return;
    const note = root()?.querySelector('.link-note');
    if (!note || note.querySelector('.pad-note')) return;
    const p = document.createElement('p');
    p.className = 'pad-note';
    p.innerHTML = `A controller can’t open GitHub here. To finish, click or tap the link above (or Tab to it and press Enter). ${pg('uiBack')} closes this.`;
    note.querySelector('.done-btn')?.before(p);
  });

  const focusables = () => [...(root()?.querySelectorAll('.popup a[href], .popup button:not([disabled]), .popup input:not([disabled]), .popup textarea:not([disabled])') || [])]
    .filter((e) => e.getClientRects().length > 0);
  const move = (dir) => {
    const f = focusables();
    if (!f.length) return;
    const cur = root()?.activeElement;
    if (!f.includes(cur)) { f[0].focus(); return; }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // up/down go to the nearest row first (the choices wrap in rows of uneven pills), then the closest in it
    const cands = [];
    for (const e of f) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect();
      const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      const [along, across] = dir === 'uiUp' ? [-dy, Math.abs(dx)] : dir === 'uiDown' ? [dy, Math.abs(dx)] : dir === 'uiLeft' ? [-dx, Math.abs(dy)] : [dx, Math.abs(dy)];
      if (along > 2) cands.push({ e, along, across });
    }
    let best = null, bs = Infinity;
    const vertical = dir === 'uiUp' || dir === 'uiDown';
    const near = Math.min(...cands.map((c) => c.along));
    for (const c of cands) {
      if (vertical && c.along > near + 8) continue;
      const score = vertical ? c.across : c.along + c.across * 2.2;
      if (score < bs) { bs = score; best = c.e; }
    }
    if (!best && (dir === 'uiUp' || dir === 'uiDown')) {
      const i = f.indexOf(cur);
      best = f[(i + (dir === 'uiDown' ? 1 : f.length - 1)) % f.length];
    }
    if (best) { best.focus(); best.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); G.audio?.synth('uiMove'); }
  };
  const padPress = (a) => {
    if (!G.reportOpen()) return;
    // B / ○ always closes, whatever state the form's markup is in
    if (a === 'uiBack') { G.audio?.synth('uiBack'); try { fb.close(); } catch { fb._close?.(); } return; }
    const sr = root();
    if (!sr) return;
    setPad(true);
    if (a === 'uiUp' || a === 'uiDown' || a === 'uiLeft' || a === 'uiRight') { move(a); return; }
    if (a !== 'uiOk') return;
    const cur = sr.activeElement;
    if (!cur || !focusables().includes(cur)) { focusables()[0]?.focus(); return; }
    if (cur.matches('input, textarea')) {
      // a controller can't type here (Chrome on a computer has no on-screen keyboard): point at the choices
      const hint = sr.querySelector('.quick-hint');
      if (hint) { hint.hidden = false; hint.textContent = 'Typing needs a keyboard. With a controller, pick one of these instead.'; }
      sr.querySelector('.quick-pill')?.focus();
      sr.querySelector('.quick')?.scrollIntoView?.({ block: 'nearest' });
      return;
    }
    if (cur.matches('a[target="_blank"]')) {
      // the browser blocks a new tab from a controller press too: point at the note instead of silently doing nothing
      const n = sr.querySelector('.pad-note');
      if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); n.scrollIntoView?.({ block: 'nearest' }); }
      G.audio?.synth('uiBack');
      return;
    }
    G.audio?.synth('uiSelect');
    cur.click();
  };
  if (G.input) G.input.onIgnoredPad = padPress;
  G.reportPad = padPress;   // for play-tests
}
