// localStorage saving: three save slots (src/saves.js, gamegen's saves.md: keys `cpp-saves` and `cpp-slot-1..3`),
// each versioned, every access in try/catch. The one save the game kept before it had slots (`cpp-save-v1`) moves into
// slot 1 the first time this loads. Settings (volumes, mute, camera, vibration, graphics) stay in their own key, shared
// by every slot, so the title screen has them before any game is saved.
//
// Autosave runs on every scheme step, nap and Nest, into the slot being played (main.js calls saveGame()).

import { SAVE_VERSION, freshState } from './state/gamestate.js';

export const SAVE_KEY = 'cpp-save-v1';
export const SETTINGS_KEY = 'cpp-settings-v1';

export const DEFAULT_SETTINGS = {
  music: 0.7, sfx: 0.85, muted: false,
  sensitivity: 1, invertY: false, autoFollow: true, vibration: true, graphics: 'auto', showFps: false,   // Land/perf: showFps
  guidance: 'subtle',   // guidance: 'subtle' | 'normal' | 'off' (ui/guide.js)
  // Flight hint / scarf: the flight control hints ('auto': each of Flap, Land, Boost drops out once learnt; 'always'; 'off')
  // and how often each has been used (main.js flightHints; kept here so it stays learnt across reloads and new games)
  controlHints: 'auto', hintsLearnt: { flap: 0, land: 0, boost: 0 },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) { const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; s.hintsLearnt = { ...DEFAULT_SETTINGS.hintsLearnt, ...s.hintsLearnt }; return s; }
  } catch { /* private mode or broken JSON */ }
  return { ...DEFAULT_SETTINGS, hintsLearnt: { ...DEFAULT_SETTINGS.hintsLearnt } };   // Flight hint / scarf: its own copy of the counts
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export const SLOT_COUNT = 3;

// Saves: the old single save carried a copy of the settings. They already live in SETTINGS_KEY; if that key is missing
// (it never should be), copy them over before the save moves into slot 1, so nothing the player set is lost.
try {
  const old = localStorage.getItem(SAVE_KEY);
  if (old && !localStorage.getItem(SETTINGS_KEY)) { const o = JSON.parse(old); if (o?.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(o.settings)); }
} catch { /* unreadable old save: saves.js leaves it alone */ }

/** What a slot shows on the Load screen. */
export function summaryOf(st) {
  return {
    phase: st.phase || 'morning',
    crews: (st.crews || []).length,
    parts: (st.parts || []).length,
    time: Math.round(st.time || 0),
    won: !!st.flags?.won,
  };
}

const slots = window.gameSaves.setup({
  key: 'cpp', slots: SLOT_COUNT, version: 1, oldKey: SAVE_KEY,
  fromOld: (old) => { const d = { ...old }; delete d.settings; return { data: d, summary: summaryOf(d) }; },
});

let current = null;   // the slot being played
export const currentSlot = () => current;
export const setSlot = (id) => { current = id == null ? null : Number(id); };
/** The Load screen's rows: { id, empty?, broken?, savedAt, summary }. */
export const listSlots = () => slots.list();
/** A free slot for a new game, or null when all three are taken (ask which to replace). */
export const freeSlot = () => slots.create();
export const removeSlot = (id) => { slots.remove(id); if (current === Number(id)) current = null; };
/** The slot Continue picks (played last), or null. */
export const lastSlot = () => slots.last();

export function hasSave() { return lastSlot() !== null; }

/** The saved state in a slot (default: the one Continue picks), migrated, or null. */
export function loadGame(id = lastSlot()) {
  if (id == null) return null;
  try {
    const st = migrate(slots.load(id));
    if (st) current = Number(id);
    return st;
  } catch (e) {
    console.warn('save unreadable', e);
    return null;
  }
}

/** Save into the slot being played. false: no slot, or the browser refused (storage full). */
export function saveGame(state) {
  if (current == null) return false;
  try {
    const data = { ...state, v: SAVE_VERSION, savedAt: Date.now() };
    delete data.settings;
    return slots.save(current, data, summaryOf(data));
  } catch (e) {
    console.warn('could not save', e);
    return false;
  }
}

/** Empty the slot being played (a new game in it starts clean). */
export function clearGame() { if (current != null) slots.remove(current); }

/** Fill in anything a save from an older version lacks; reject what we can't read. */
export function migrate(data) {
  if (!data || typeof data !== 'object' || typeof data.v !== 'number') return null;
  if (data.v > SAVE_VERSION) return null;
  const fresh = freshState();
  const out = { ...fresh, ...data };
  for (const k of ['signs', 'spikes', 'carts', 'collectibles', 'stats']) out[k] = { ...fresh[k], ...(data[k] || {}) };
  // #43: progress recomputed from what's done, so older saves show counts that can complete
  out.truces = [...(out.truces || [])];
  if (out.flags?.['den-rhoda'] && !out.truces.includes('hawks-pigeons')) out.truces.push('hawks-pigeons');   // den-rhoda now gives the 4th truce
  out.v = SAVE_VERSION;
  delete out.settings;
  return out;
}
