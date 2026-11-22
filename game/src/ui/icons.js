// One consistent set of icons, drawn as inline SVG (no emoji or symbol
// characters, so they show the same on every device). 24×24 viewBox, filled
// with currentColor unless an icon carries its own colours.

const P = {
  feather: '<path d="M19.5 3.5c-5 .5-9.5 4-11.6 9.2L6.2 17l-2.6 3.3 1.2 1 2.4-3.1 4.3-1.2c5-1.6 8.3-6 8.5-11.6l-.5-1.9zM9.5 15.2l1.4-3.4 4.1-4.1-3.3 5.6z"/>',
  featherOn: '<path fill="#f6efe2" stroke="#5a4a3a" stroke-width="1" d="M19.5 3.5c-5 .5-9.5 4-11.6 9.2L6.2 17l-2.6 3.3 1.2 1 2.4-3.1 4.3-1.2c5-1.6 8.3-6 8.5-11.6l-.5-1.9z"/><path fill="none" stroke="#7a8597" stroke-width="1.3" d="M5 20 16 7"/>',
  // batch-2 (#15): a torn bread crust with its crumbs (the old blob read as meat); own colours, like slice and box
  crumb: '<path d="M3.6 12.2c-.9-3.6 1.6-7.2 5.6-7.9 3.2-.6 6.3.4 8.3 2.6 1.6 1.7 1.9 3.9 1 5.6l-1.4.3.6 1.6-2.1.4.2 1.7-2.3-.3-.8 1.6-1.8-1-1.6 1.1-.9-1.6-2 .3.1-1.9-1.6-.6z" fill="#c9823e"/><path d="M5.6 11.6c-.4-2.4 1.3-4.6 4-5.1 2.4-.4 4.8.3 6.2 1.9.9 1 1.2 2.1.9 3.1l-1.2.3.4 1.2-1.7.3.1 1.2-1.7-.3-.6 1.1-1.3-.7-1.2.7-.6-1.1-1.4.2v-1.3z" fill="#f6dfae"/><circle cx="9" cy="9.3" r=".7" fill="#d9a864"/><circle cx="12.3" cy="8.4" r=".6" fill="#d9a864"/><circle cx="14.4" cy="10.6" r=".7" fill="#d9a864"/><circle cx="10.8" cy="11.6" r=".5" fill="#d9a864"/><path d="M17.6 16.4l2.3-.6.9 1.9-1.7 1.5-1.9-.9z" fill="#f0d29a" stroke="#c9823e" stroke-width=".9"/><path d="M12.6 18.6l1.7-.2.5 1.5-1.4.9-1.2-.9z" fill="#f0d29a" stroke="#c9823e" stroke-width=".8"/><circle cx="21" cy="12.6" r=".9" fill="#e2b878"/><circle cx="7.4" cy="19.6" r=".8" fill="#e2b878"/>',
  pigeon: '<path d="M15.5 5.2c1.6 0 2.8 1.2 2.8 2.7v.3l2.2 1-2.3.6c-.4 2.6-1.6 4.8-3.8 6.3l-1.2 3h-1.6l.6-2.4c-.7.2-1.4.3-2.2.3l-.6 2.1H7.8l.5-2.4C5.3 15.9 3.5 13.4 3 10.6l5.8 1.6c1.7.4 3.4-.6 3.9-2.3l.2-1.2c.2-2 1.2-3.5 2.6-3.5z"/><circle cx="16" cy="7.6" r=".9" fill="#fff"/>',
  paw: '<ellipse cx="12" cy="15.5" rx="4.6" ry="3.9"/><ellipse cx="6" cy="10" rx="1.9" ry="2.4"/><ellipse cx="9.6" cy="6.6" rx="1.9" ry="2.5"/><ellipse cx="14.4" cy="6.6" rx="1.9" ry="2.5"/><ellipse cx="18" cy="10" rx="1.9" ry="2.4"/>',
  gear: '<path d="M10.3 2h3.4l.5 2.6 1.8.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.8 2.6.5v3.4l-2.6.5-.8 1.8 1.5 2.2-2.4 2.4-2.2-1.5-1.8.8-.5 2.6h-3.4l-.5-2.6-1.8-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.8L2 13.7v-3.4l2.6-.5.8-1.8-1.5-2.2 2.4-2.4 2.2 1.5 1.8-.8zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  map: '<path d="M3 5.5 8.5 3l7 2.5L21 3v15.5L15.5 21l-7-2.5L3 21zM8.5 5v11.5l7 2.5V7.5z"/>',
  board: '<path d="M3 4h18v14H3z" opacity=".35"/><path d="M3 3h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8l1.5 3h-2l-1.5-3-1.5 3h-2L9 19H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm2 3v5h5V6zm7 0v3h7V6zm0 5v5h7v-5zm-7 2v3h5v-3z"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  muted: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.3"/><rect x="14" y="4.5" width="4" height="15" rx="1.3"/>',
  sun: '<circle cx="12" cy="12" r="5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>',
  morning: '<path d="M3 17h18v2H3z"/><path d="M6.5 17a5.5 5.5 0 0 1 11 0z" fill="#f2c230"/><g stroke="#f2c230" stroke-width="2" stroke-linecap="round"><path d="M12 6.5V9M5.2 10.2l1.6 1.4M18.8 10.2l-1.6 1.4"/></g>',
  afternoon: '<circle cx="12" cy="12" r="5.2" fill="#f6c03a"/><g stroke="#f6c03a" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g>',
  dusk: '<path d="M3 16h18v2H3z"/><path d="M6.8 16a5.2 5.2 0 0 1 10.4 0z" fill="#ef8a4c"/><path d="M4 20h16v1.6H4z" opacity=".55"/>',
  night: '<path d="M15.5 3.2a8.5 8.5 0 1 0 5.3 13.3 7 7 0 0 1-5.3-13.3z" fill="#f3ecc8"/><circle cx="6" cy="6" r="1" fill="#f3ecc8"/><circle cx="19.5" cy="9" r=".8" fill="#f3ecc8"/>',
  slice: '<path d="M3.5 6.2C9.2 3 15.5 3 21 5.6L12 21z" fill="#f2c230"/><path d="M3.5 6.2C9.2 3 15.5 3 21 5.6l-.9 2C15 5.2 9.6 5.2 4.4 8z" fill="#c9823e"/><circle cx="10" cy="9.5" r="1.6" fill="#c4492d"/><circle cx="14.6" cy="10.4" r="1.4" fill="#c4492d"/><circle cx="12" cy="14.5" r="1.3" fill="#c4492d"/>',
  box: '<path d="M2.5 8 12 4l9.5 4v9L12 21l-9.5-4z" fill="#d9b07a"/><path d="M2.5 8 12 12l9.5-4M12 12v9" fill="none" stroke="#8a5e30" stroke-width="1.2"/>',
  shiny: '<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6z" fill="#cfe7ff" stroke="#6a8fb8" stroke-width="1"/>',
  key: '<circle cx="7.5" cy="12" r="4" fill="none" stroke="#d4a02a" stroke-width="2.4"/><path d="M11.4 11h9.6v2.2h-1.8v2.6h-2.2v-2.6h-5.6z" fill="#d4a02a"/>',
  peas: '<circle cx="8" cy="11" r="3.3" fill="#7fbf3a"/><circle cx="14" cy="9" r="3" fill="#8ccc44"/><circle cx="13" cy="15.5" r="3.3" fill="#6fae33"/>',
  item: '<circle cx="12" cy="12" r="7" fill="#d9c8a0" stroke="#7a6a5a" stroke-width="1.5"/>',
  ball: '<circle cx="12" cy="12" r="8" fill="#e8462f"/><path d="M5 9c4 2 10 2 14 0M5 15c4-2 10-2 14 0" fill="none" stroke="#fff" stroke-width="1.6"/>',
  sign: '<path d="M11 13h2v9h-2z"/><rect x="3" y="3" width="18" height="11" rx="2" fill="#3e5b3a"/><path d="M6 7h12M6 10h8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  spike: '<path d="M2 20h20v2H2z"/><path d="M3 20 5.5 9 8 20zM8 20l2.5-13L13 20zM13 20l2.5-11L18 20zM17.5 20l2-8 2 8z" fill="#c4492d"/>',
  truce: '<path d="M2 13c3-1 5-4 7.5-4.5L13 10l-3 2.2c-.7.5-.4 1.6.5 1.6l3.5-.6 5-3 1 4.6-5.8 4.4c-1 .7-2.3.9-3.5.5L5 17z"/><path d="M15 6.5c1.5-1.2 3.8-1.6 6-1.1l-1.1 3.8-3.6.8z" opacity=".7"/>',
  crowkey: '<path d="M4 15c2-6 7-9 13-8l3 2-3 1c0 4-3 7-8 7l-3 3v-3z"/><circle cx="16" cy="8.8" r=".9" fill="#fff"/><circle cx="20" cy="17" r="2" fill="none" stroke="#d4a02a" stroke-width="1.6"/><path d="M18.6 18.5 15 22" stroke="#d4a02a" stroke-width="1.6"/>',
  nest: '<ellipse cx="12" cy="15" rx="9" ry="4.5" fill="#a07444"/><ellipse cx="12" cy="13.5" rx="6" ry="2.5" fill="#d9c08a"/><path d="M4 14c3 2 13 2 16 0" stroke="#6b4a2a" fill="none"/>',
  grate: '<rect x="3" y="7" width="18" height="10" rx="1.5" fill="#555"/><path d="M6 8v8M9 8v8M12 8v8M15 8v8M18 8v8" stroke="#999" stroke-width="1.2"/>',
  question: '<circle cx="12" cy="12" r="10" fill="#f2c230"/><path d="M9.2 9.2a2.9 2.9 0 1 1 4.3 2.5c-1 .6-1.5 1.2-1.5 2.3v.5" fill="none" stroke="#26351f" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#26351f"/>',
  target: '<circle cx="12" cy="12" r="8.5" fill="#e07b39" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="#fff"/>',
  waypoint: '<path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="#2fa39a" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>',
  part: '<path d="M7 3h10l2 4-2 4H7L5 7z" fill="#9aa4b4"/><path d="M8 11h8v8l-4 3-4-3z" fill="#7a8597"/>',
  back: '<path d="M19 12H6M11.5 6 5.5 12l6 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',   // polish (P19): Back (× read as PlayStation\'s ✕ = Select)
  close: '<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
  wheel: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="5" r="2.2"/><circle cx="18.5" cy="14" r="2.2"/><circle cx="5.5" cy="14" r="2.2"/>',
  save: '<path d="M4 3h13l3 3v15H4z"/><path d="M7 3h8v5H7z" fill="#fff" opacity=".7"/><rect x="7" y="13" width="10" height="6" fill="#fff" opacity=".7"/>',
  scarf: '<path d="M5 6c4 2 10 2 14 0l1 3c-4 2.5-12 2.5-16 0z" fill="#e07b39"/><path d="M13 10l3 10-3 1-2-10z" fill="#e07b39"/><path d="M15 20l1 2M13 21l.5 2" stroke="#e07b39"/>',
  zzz: '<path d="M4 6h6l-6 7h6M13 4h5l-5 6h5M15 13h4l-4 5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  roster: '<circle cx="8" cy="8" r="3.5"/><circle cx="16.5" cy="9" r="3"/><path d="M2 20c.5-4 3-6 6-6s5.5 2 6 6zM13.5 20c.3-2.8 1.5-4.6 3-5.3 2.6-.2 4.6 1.8 5 5.3z"/>',
  controls: '<path d="M7 7h10a5 5 0 0 1 4.6 7l-1.3 3a2.4 2.4 0 0 1-4 .5L14.5 15h-5l-1.8 2.5a2.4 2.4 0 0 1-4-.5l-1.3-3A5 5 0 0 1 7 7z"/><path d="M7 10v4M5 12h4" stroke="#fff" stroke-width="1.6"/><circle cx="16" cy="11" r="1.1" fill="#fff"/><circle cx="18" cy="13" r="1.1" fill="#fff"/>',
  settings: '<path d="M10.3 2h3.4l.5 2.6 1.8.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.8 2.6.5v3.4l-2.6.5-.8 1.8 1.5 2.2-2.4 2.4-2.2-1.5-1.8.8-.5 2.6h-3.4l-.5-2.6-1.8-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.8L2 13.7v-3.4l2.6-.5.8-1.8-1.5-2.2 2.4-2.4 2.2 1.5 1.8-.8zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  bug: '<ellipse cx="12" cy="14" rx="5.2" ry="6.4"/><circle cx="12" cy="6.4" r="3"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.8 11 3 9M6.6 15H2.5M7.2 18.6 4 21M17.2 11 21 9M17.4 15h4.1M16.8 18.6 20 21M10 4 8.4 2M14 4l1.6-2"/></g><path d="M12 8.5v11.5" stroke="#f6efe2" stroke-width="1.2"/>',
  home: '<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/>',
  elders: '<ellipse cx="12" cy="14" rx="8" ry="5" fill="#6f9a4a"/><path d="M6 13l3-3 3 3 3-3 3 3" fill="none" stroke="#3e5b3a" stroke-width="1.4"/><circle cx="20.5" cy="12" r="2" fill="#8bb05a"/>',
  postcard: '<rect x="2.5" y="5" width="19" height="14" rx="1.5" fill="#fffaf0" stroke="#8a7a6a"/><path d="M13 8v8M15 9h4M15 12h4" stroke="#8a7a6a"/><rect x="4.5" y="7.5" width="6" height="5" fill="#9fd0f0"/>',
};

export function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.item}</svg>`;
}
export const ICONS = P;

/** The time-of-day icon. */
export const phaseIcon = (phase) => icon(phase, 'ic tod');

/** Item icon by item id. */
export function itemIcon(id) {
  if (!id) return '';
  if (id.startsWith('slice')) return icon('slice');
  return icon({ box: 'box', shiny: 'shiny', key: 'key', 'gate-key': 'key', peas: 'peas', ball: 'ball' }[id] || 'item');
}
