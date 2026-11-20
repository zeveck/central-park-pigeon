// localStorage saving: one slot (`cpp-save-v1`), versioned, every access in
// try/catch, a broken or missing save falls back to a fresh one. Settings
// (volumes, mute, camera, vibration, graphics) are saved in the slot and in
// their own key, so the title screen has them before any game is saved.
//
// Autosave runs on every scheme step, nap and Nest (main.js calls save()).

import { SAVE_VERSION, freshState } from './state/gamestate.js';

export const SAVE_KEY = 'cpp-save-v1';
export const SETTINGS_KEY = 'cpp-settings-v1';

export const DEFAULT_SETTINGS = {
  music: 0.7, sfx: 0.85, muted: false,
  sensitivity: 1, invertY: false, autoFollow: true, vibration: true, graphics: 'auto', showFps: false,   // Land/perf: showFps
  guidance: 'subtle',   // guidance: 'subtle' | 'normal' | 'off' (ui/guide.js)
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* private mode or broken JSON */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function hasSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); return !!raw && !!migrate(JSON.parse(raw)); } catch { return false; }
}

/** The saved state, migrated to the current version, or null. */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('save unreadable, starting fresh', e);
    return null;
  }
}

export function saveGame(state, settings) {
  try {
    const data = { ...state, v: SAVE_VERSION, savedAt: Date.now(), settings };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('could not save', e);
    return false;
  }
}

export function clearGame() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }

/** Fill in anything a save from an older version lacks; reject what we can't read. */
export function migrate(data) {
  if (!data || typeof data !== 'object' || typeof data.v !== 'number') return null;
  if (data.v > SAVE_VERSION) return null;
  const fresh = freshState();
  const out = { ...fresh, ...data };
  for (const k of ['signs', 'spikes', 'carts', 'collectibles', 'stats']) out[k] = { ...fresh[k], ...(data[k] || {}) };
  out.v = SAVE_VERSION;
  delete out.settings;
  return out;
}
