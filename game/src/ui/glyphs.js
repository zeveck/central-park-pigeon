// Button prompts that follow whatever was used last: key caps on the
// keyboard, the controller's own symbols (PlayStation ✕ ○ □ △ drawn as SVG
// shapes, never font glyphs; Xbox and Nintendo letters in coloured circles),
// or the on-screen button's name on touch.

const KEYS = {
  flap: 'Space', dive: 'C', peck: 'E', coo: 'F', drop: 'Q', sprint: 'Shift', boost: 'Shift', wheel: 'R', map: 'Tab', board: 'J', where: 'G',
  mute: 'M', pause: 'Esc', uiOk: 'Enter', uiBack: 'Esc', move: 'WASD', look: 'Mouse', nap: 'E',
  uiLeft: '←', uiRight: '→', uiUp: '↑', uiDown: '↓',   // polish (P19): arrow key caps
};
const TOUCH = { uiLeft: 'Tap', uiRight: 'Tap', flap: 'Flap', dive: 'Land', peck: 'Peck', coo: 'Coo', drop: 'Hold Peck', sprint: 'Stick edge', boost: 'Double-tap Flap', wheel: 'Portrait', map: 'Map', board: 'Board', where: 'Compass', pause: 'Pause', uiOk: 'Tap', uiBack: 'Back', move: 'Stick', look: 'Drag', nap: 'Peck' };
// position: bottom right left top (standard mapping 0 1 2 3)
const PAD_POS = { flap: 'bottom', uiOk: 'bottom', dive: 'right', uiBack: 'right', peck: 'left', nap: 'left', coo: 'top' };
const PAD_OTHER = {
  playstation: { uiLeft: 'D-pad left', uiRight: 'D-pad right', drop: 'L1', wheel: 'R1', sprint: 'L3', boost: 'L3', map: 'Create', board: 'D-pad up', where: 'R3', pause: 'Options', move: 'L stick', look: 'R stick' },
  xbox: { uiLeft: 'D-pad left', uiRight: 'D-pad right', drop: 'LB', wheel: 'RB', sprint: 'LS', boost: 'LS', map: 'View', board: 'D-pad up', where: 'RS', pause: 'Menu', move: 'L stick', look: 'R stick' },
  nintendo: { uiLeft: 'D-pad left', uiRight: 'D-pad right', drop: 'L', wheel: 'R', sprint: 'LS', boost: 'LS', map: '−', board: 'D-pad up', where: 'RS', pause: '+', move: 'L stick', look: 'R stick' },
};
const LETTERS = {
  xbox: { bottom: ['A', '#3c9a3c'], right: ['B', '#c8352e'], left: ['X', '#2f6fc0'], top: ['Y', '#d8a91f'] },
  nintendo: { bottom: ['B', '#666'], right: ['A', '#666'], left: ['Y', '#666'], top: ['X', '#666'] },
};

/** PlayStation face-button shapes, drawn in code. */
export function psShape(pos) {
  const ring = '<circle cx="12" cy="12" r="11" fill="#2b2b33"/>';
  const s = {
    bottom: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#8fb4ff" stroke-width="2.4" stroke-linecap="round"/>',
    right: '<circle cx="12" cy="12" r="5.2" fill="none" stroke="#ff7b7b" stroke-width="2.4"/>',
    left: '<rect x="7" y="7" width="10" height="10" rx="1" fill="none" stroke="#f59ad8" stroke-width="2.3"/>',
    top: '<path d="M12 6.5 17.6 16H6.4z" fill="none" stroke="#5fe0b8" stroke-width="2.2" stroke-linejoin="round"/>',
  }[pos];
  return `<svg class="pad" viewBox="0 0 24 24" aria-hidden="true">${ring}${s}</svg>`;
}

const DPAD = { uiLeft: 'left', uiRight: 'right', uiUp: 'up', uiDown: 'down', board: 'up' };
/** A d-pad with one arm lit. */
function dpad(dir) {
  const arms = { up: 'M9.2 2.5h5.6v6.7H9.2z', down: 'M9.2 14.8h5.6v6.7H9.2z', left: 'M2.5 9.2h6.7v5.6H2.5z', right: 'M14.8 9.2h6.7v5.6h-6.7z' };
  const body = '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#2b2b33"/>';
  return `<span title="D-pad ${dir}"><svg class="pad" viewBox="0 0 24 24" aria-hidden="true">${body}<path d="${arms[dir]}" fill="#f2c230"/></svg></span>`;
}

const PS_NAMES = { bottom: 'Cross', right: 'Circle', left: 'Square', top: 'Triangle' };

/** HTML for the prompt of an action on a device. device: 'keyboard' | 'gamepad' | 'touch'; family: 'playstation' | 'xbox' | 'nintendo'. */
export function glyph(action, device = 'keyboard', family = 'xbox') {
  if (device === 'touch') return `<span class="padpill">${TOUCH[action] || action}</span>`;
  if (device === 'gamepad') {
    const pos = PAD_POS[action];
    if (pos) {
      if (family === 'playstation') return `<span title="${PS_NAMES[pos]}">${psShape(pos)}</span>`;
      const [l, c] = (LETTERS[family] || LETTERS.xbox)[pos];
      return `<span class="padtxt" style="background:${c}">${l}</span>`;
    }
    if (DPAD[action]) return dpad(DPAD[action]);   // polish (P19): a drawn d-pad, not "D-pad left" in words
    return `<span class="padpill">${(PAD_OTHER[family] || PAD_OTHER.xbox)[action] || action}</span>`;
  }
  return `<span class="key">${KEYS[action] || action}</span>`;
}

/** A row of hints: [[action, label], …] */
export function hintRow(pairs, device, family) {
  return pairs.map(([a, label]) => `<span>${glyph(a, device, family)} ${label}</span>`).join('');
}
