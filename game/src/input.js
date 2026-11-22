// Keyboard, mouse, gamepad and touch → one set of game actions, with "just
// pressed" edges that survive sub-frame taps. The game asks
// input.held('flap') / input.pressed('peck') / input.move() / input.consumeLook();
// call input.poll(dt) at the start of each fixed update and input.endUpdate() after it.
//
// - Mouse: pointer lock after the first click on the canvas; losing the lock
//   during play calls onPointerLockLost (the game pauses). Drag works too.
// - Gamepad (gamepad.md): polled each update, dead zone 0.25 on the stick's
//   length, edges like keys, analog triggers, last-used device.
// - Touch: ui/touch.js drives the virtual stick and buttons through setStick /
//   setVirtual / addLook.
// - Menus: uiUp/uiDown/uiLeft/uiRight/uiOk/uiBack come from the arrows, WASD,
//   Enter/Space and Esc/Backspace, and from the pad's D-pad, left stick, ✕ and
//   ○. Directions repeat after 350 ms, then every 120 ms (on the game clock).
// - ignore(e): while it says so (the bug report form is open), keys and clicks
//   do nothing and nothing is preventDefault-ed, so the form can type. The pad
//   is still tracked but drives no game action: its presses go to onIgnoredPad
//   (the form's controller support, ui/report.js).
// - Autopilot (debug): setAuto({ held, stick }) writes into the same queue as
//   the keyboard and pad, so a recorded run replays exactly.

const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  flap: ['Space'],
  dive: ['KeyC'],
  peck: ['KeyE'],
  coo: ['KeyF'],
  drop: ['KeyQ'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  wheel: ['KeyR'],
  map: ['Tab'],
  board: ['KeyJ'],
  where: ['KeyG'],   // guidance: "Where to?"
  mute: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  debugPhase: ['KeyT'],
  uiUp: ['ArrowUp', 'KeyW'],
  uiDown: ['ArrowDown', 'KeyS'],
  uiLeft: ['ArrowLeft', 'KeyA'],
  uiRight: ['ArrowRight', 'KeyD'],
  uiOk: ['Enter', 'NumpadEnter', 'Space'],
  uiBack: ['Escape', 'Backspace'],
  ally1: ['Digit1'], ally2: ['Digit2'], ally3: ['Digit3'], ally4: ['Digit4'], ally5: ['Digit5'],
  ally6: ['Digit6'], ally7: ['Digit7'], ally8: ['Digit8'], ally9: ['Digit9'], ally10: ['Digit0'],
};

// standard-mapping button → actions (each pad button does one thing in play; menus read the ui* twins)
const PAD_BUTTONS = {
  0: ['flap', 'uiOk'], 1: ['dive', 'uiBack'], 2: ['peck'], 3: ['coo'], 4: ['drop'], 5: ['wheel'],
  8: ['map'], 9: ['pause'], 10: ['sprint'], 11: ['where'], 12: ['board', 'uiUp'], 13: ['map', 'uiDown'], 14: ['uiLeft'], 15: ['uiRight'],
};
const DEAD = 0.25;
const UI_DIRS = ['uiUp', 'uiDown', 'uiLeft', 'uiRight'];
const REPEAT_FIRST = 0.35, REPEAT_NEXT = 0.12;

export function padFamily(id = '') {
  // playtest: "Xbox Wireless Controller" matched the PlayStation test below ("wireless controller"), so Xbox pads got ✕ ○ □ △
  if (/045e|xbox|xinput/i.test(id)) return 'xbox';
  if (/054c|dualsense|dualshock|playstation|wireless controller/i.test(id)) return 'playstation';
  if (/057e|pro controller|joy-con/i.test(id)) return 'nintendo';
  return 'xbox';
}

export function createInput(target = window, { canvas = null, bindings = DEFAULT_BINDINGS, onPointerLockLost = null, onDevice = null, onFirstInput = null, ignore = null } = {}) {
  const down = new Set();       // keyboard
  const virt = new Set();       // touch buttons
  const auto = new Set();       // autopilot
  const padDown = new Set();
  const edges = new Set();
  const codeToActions = new Map();
  for (const [action, codes] of Object.entries(bindings)) for (const c of codes) {
    if (!codeToActions.has(c)) codeToActions.set(c, []);
    codeToActions.get(c).push(action);
  }
  const look = { dx: 0, dy: 0 };
  const cursor = { dx: 0, dy: 0 };   // mouse motion while a radial menu captures it
  const stick = { x: 0, y: 0 };      // touch stick (x right, y forward)
  const autoStick = { x: 0, y: 0 };
  const pad = { x: 0, y: 0, rx: 0, ry: 0, id: null, connected: false, sprintLatch: false, family: 'xbox', standard: true, seen: false };
  let device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';   // Fixes-1: a phone starts on touch (prompts, Controls)
  let lastLookManual = -1e9;           // time (s) of the last manual camera move
  let clock = 0;
  let wantLock = false;
  let sensitivity = 0.0024;
  let invertY = false;
  let lastFlapTap = -1;
  let captureCursor = false;
  let first = false;
  const repeat = { dir: null, t: 0 };
  const listeners = new Set();

  const setDevice = (d) => { if (device !== d) { device = d; onDevice?.(d); for (const f of listeners) f(d); } };
  const firstInput = () => { if (!first) { first = true; onFirstInput?.(); } input.onAnyInput?.(); };
  const press = (set, a) => { if (!set.has(a)) edges.add(a); set.add(a); };

  const onKeyDown = (e) => {
    if (ignore?.(e)) return;
    if (e.ctrlKey || e.metaKey) return;       // no Ctrl in gameplay (Ctrl+W must never close the tab via us)
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.code !== 'Escape') return;
    firstInput();
    const actions = codeToActions.get(e.code);
    setDevice('keyboard');
    if (!actions) return;
    e.preventDefault();
    if (e.repeat) return;
    for (const a of actions) press(down, a);
  };
  const onKeyUp = (e) => {
    const actions = codeToActions.get(e.code);
    if (!actions) return;
    if (!ignore?.(e)) e.preventDefault();
    for (const a of actions) down.delete(a);
  };
  const onBlur = () => { down.clear(); virt.clear(); };

  // mouse look (pointer lock, or drag with a button held)
  let dragging = false;
  const onMouseMove = (e) => {
    const locked = document.pointerLockElement === canvas;
    if (captureCursor && (locked || dragging || true)) {
      cursor.dx += e.movementX; cursor.dy += e.movementY;
      if (locked) setDevice('keyboard');
      return;
    }
    if (!locked && !dragging) return;
    look.dx += e.movementX * sensitivity;
    look.dy += e.movementY * sensitivity * (invertY ? -1 : 1);
    lastLookManual = clock;
    setDevice('keyboard');
  };
  const onMouseDown = (e) => {
    if (ignore?.(e)) return;
    firstInput();
    if (e.target !== canvas) return;
    dragging = true;
    if (wantLock && document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch { /* not allowed here */ }
    }
  };
  const onMouseUp = () => { dragging = false; };
  const onLockChange = () => {
    if (document.pointerLockElement !== canvas && wantLock) onPointerLockLost?.();
  };
  const onTouch = () => { firstInput(); setDevice('touch'); };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('pointerlockchange', onLockChange);
  window.addEventListener('gamepadconnected', (e) => { pad.connected = true; pad.id = e.gamepad.id; pad.family = padFamily(pad.id); pad.standard = e.gamepad.mapping === 'standard'; });
  window.addEventListener('gamepaddisconnected', () => { pad.connected = false; padDown.clear(); pad.x = pad.y = pad.rx = pad.ry = 0; input.onPadLost?.(); });

  function pollPad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    if (!gp) return;
    pad.connected = true;
    pad.id = gp.id;
    // polish (P19): a different controller (Xbox ↔ PlayStation) redraws the hints at once, not at the next device change
    const fam = padFamily(gp.id);
    if (fam !== pad.family) { pad.family = fam; if (device === 'gamepad') { onDevice?.(device); for (const f of listeners) f(device); } }
    pad.standard = gp.mapping === 'standard';
    const b = (i) => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3);
    let any = false;
    const now = new Set();
    for (const [i, acts] of Object.entries(PAD_BUTTONS)) if (b(+i)) { for (const a of acts) now.add(a); any = true; }
    if (gp.buttons[7] && gp.buttons[7].value > 0.3) { now.add('flap'); any = true; }   // hold R2 to climb
    if (gp.buttons[6] && gp.buttons[6].value > 0.3) { now.add('dive'); any = true; }   // hold L2 to dive
    const dz = (x, y) => { const l = Math.hypot(x, y); if (l < DEAD) return [0, 0]; const k = Math.min(1, (l - DEAD) / (1 - DEAD)) / l; return [x * k, y * k]; };
    [pad.x, pad.y] = dz(gp.axes[0] || 0, -(gp.axes[1] || 0));
    [pad.rx, pad.ry] = dz(gp.axes[2] || 0, gp.axes[3] || 0);
    // the left stick also moves menu focus
    if (Math.abs(pad.y) > 0.5 && Math.abs(pad.y) >= Math.abs(pad.x)) now.add(pad.y > 0 ? 'uiUp' : 'uiDown');
    else if (Math.abs(pad.x) > 0.5) now.add(pad.x > 0 ? 'uiRight' : 'uiLeft');
    // Fixes-4 (#8): while the bug report form is open the pad keeps being tracked (so the press that closes the form
    // does nothing in the game afterwards) but drives no game action: its new presses go to onIgnoredPad (the form's
    // own focus, ✕ / A and ○ / B), and the sticks move nothing.
    if (ignore?.()) {
      for (const a of now) if (!padDown.has(a)) input.onIgnoredPad?.(a);
      padDown.clear();
      for (const a of now) padDown.add(a);
      pad.x = pad.y = pad.rx = pad.ry = 0; pad.sprintLatch = false;
      if (any || now.size) { setDevice('gamepad'); firstInput(); }
      return;
    }
    for (const a of now) if (!padDown.has(a)) edges.add(a);
    padDown.clear();
    for (const a of now) padDown.add(a);
    // L3 latches sprint until the stick is released
    if (edges.has('sprint') && now.has('sprint')) pad.sprintLatch = true;
    if (Math.hypot(pad.x, pad.y) < 0.05) pad.sprintLatch = false;
    if ((pad.rx || pad.ry) && !captureCursor) { look.dx += pad.rx * 2.6 * dt * sensitivity / 0.0024; look.dy += pad.ry * 1.8 * dt * (invertY ? -1 : 1) * sensitivity / 0.0024; lastLookManual = clock; any = true; }
    if (any || pad.x || pad.y || pad.rx || pad.ry) { setDevice('gamepad'); if (!pad.seen) { pad.seen = true; } firstInput(); }
  }

  const isHeld = (a) => down.has(a) || virt.has(a) || padDown.has(a) || auto.has(a) || (a === 'sprint' && pad.sprintLatch);

  function pollRepeat(dt) {
    // Fixes-4 (#8): a direction held on the pad while the report form is open repeats into the form, never the menu under it
    const blocked = !!ignore?.();
    const held = UI_DIRS.find((d) => (blocked ? padDown.has(d) : isHeld(d)));
    if (!held) { repeat.dir = null; repeat.hold = false; return; }
    if (repeat.hold) return;   // released by releaseAll (the report form closed): wait for the direction to be let go
    if (repeat.dir !== held) { repeat.dir = held; repeat.t = REPEAT_FIRST; return; }
    repeat.t -= dt;
    if (repeat.t <= 0) { if (blocked) input.onIgnoredPad?.(held); else edges.add(held); repeat.t += REPEAT_NEXT; }
  }

  const input = {
    held: isHeld,
    pressed: (a) => edges.has(a),
    /** Clear an edge once something has used it (so one Esc doesn't close two menus). */
    consume: (a) => { const had = edges.has(a); edges.delete(a); return had; },
    /** -1, 0 or 1 from two actions (keys and pad buttons). */
    axis: (neg, pos) => (isHeld(pos) ? 1 : 0) - (isHeld(neg) ? 1 : 0),
    /** Analog movement {x: right, y: forward}, length ≤ 1: keys, then the pad's left stick, the touch stick, the autopilot. */
    move() {
      let x = input.axis('left', 'right'), y = input.axis('back', 'forward');
      if (!x && !y) { x = pad.x; y = pad.y; }
      if (!x && !y) { x = stick.x; y = stick.y; }
      if (!x && !y) { x = autoStick.x; y = autoStick.y; }
      const l = Math.hypot(x, y);
      return l > 1 ? { x: x / l, y: y / l, edge: false } : { x, y, edge: l > 0.95 && (stick.x || stick.y) !== 0 };
    },
    consumeLook() { const r = { dx: look.dx, dy: look.dy }; look.dx = look.dy = 0; return r; },
    consumeCursor() { const r = { dx: cursor.dx, dy: cursor.dy }; cursor.dx = cursor.dy = 0; return r; },
    captureCursor(on) { captureCursor = on; cursor.dx = cursor.dy = 0; },
    get rightStick() { return { x: pad.rx, y: pad.ry }; },
    /** Seconds since the last manual camera move (mouse, right stick, touch drag). */
    sinceLook: () => clock - lastLookManual,
    poll(dt) { clock += dt; pollPad(dt); pollRepeat(dt); },
    endUpdate: () => edges.clear(),
    get clock() { return clock; },
    get device() { return device; },
    get gamepad() { return { connected: pad.connected, id: pad.id, family: pad.family, standard: pad.standard, seen: pad.seen }; },
    onDeviceChange(f) { listeners.add(f); return () => listeners.delete(f); },
    // touch and autopilot hooks
    setVirtual(a, on) { if (on) press(virt, a); else virt.delete(a); },
    setStick(x, y) { stick.x = x; stick.y = y; if (x || y) setDevice('touch'); },
    addLook(dx, dy) { look.dx += dx; look.dy += dy; lastLookManual = clock; setDevice('touch'); },
    flapTap() {
      // double-tap Flap boosts (touch)
      if (clock - lastFlapTap < 0.3) edges.add('boost');
      lastFlapTap = clock;
    },
    /** Autopilot / replay: the whole frame's injected state. held: iterable of actions; stick: {x, y}. */
    setAuto({ held = [], stick: s = { x: 0, y: 0 } } = {}) {
      const want = new Set(held);
      for (const a of [...auto]) if (!want.has(a)) auto.delete(a);
      for (const a of want) press(auto, a);
      autoStick.x = s.x; autoStick.y = s.y;
    },
    clearAuto() { auto.clear(); autoStick.x = autoStick.y = 0; },
    get autoState() { return { held: [...auto], stick: { ...autoStick } }; },
    inject(a, on) { if (on) press(auto, a); else auto.delete(a); },
    /** Let go of every key and touch button (the bug report form opening or closing: it keeps its keyups from the
     *  game). The pad's buttons stay tracked, so the B that closed the form doesn't also act in the menu under it; a
     *  direction held on the pad stops repeating until it's let go. */
    releaseAll() { down.clear(); virt.clear(); repeat.dir = null; repeat.hold = true; },
    /** Forget held keys and edges (after a menu closes, so nothing leaks into play). */
    reset() { edges.clear(); look.dx = look.dy = 0; },   // Fixes-1 (#8): and camera turns piled up while a menu was open
    enablePointerLock(on) { wantLock = on; if (!on && document.pointerLockElement === canvas) document.exitPointerLock?.(); },
    get locked() { return document.pointerLockElement === canvas; },
    setSensitivity(s) { sensitivity = 0.0024 * s; },
    setInvertY(v) { invertY = v; },
    onPadLost: null,
    /** Fixes-4 (#8): called with each new pad press (uiOk, uiBack, uiUp…) while ignore() holds (the report form is open). */
    onIgnoredPad: null,
    onAnyInput: null,
    get hadInput() { return first; },
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onLockChange);
    },
  };
  return input;
}
