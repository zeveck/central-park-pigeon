// Touch controls (best-effort): a virtual stick (bottom-left, 140 px zone),
// Flap (96 px, bottom-right; hold to climb, slide off it to turn the camera
// with the same thumb, double-tap to boost), Land (72 px; Land / Dive: tap when low to land, hold to dive), Peck (80 px) and
// Coo (72 px; long-press Peck drops). Pause, map and board are HUD buttons. A drag on the right half that isn't a
// button turns the camera. Shown only on touch devices, 55% opaque, inside the
// safe areas; the bottom-centre 40% stays clear so they never cover Gus.

export class TouchControls {
  /** Relabel the buttons (driving: Gas, Brake, Out, Horn / Dump / Spray); null puts the defaults back. */
  setLabels(map) {
    for (const b of this.el.querySelectorAll('.tb[data-a]')) {
      const a = b.dataset.a;
      if (map && !(a in map)) continue;
      const t = (map && map[a]) || this.defaults?.[a] || b.textContent;
      if (b.textContent !== t) { b.textContent = t; b.setAttribute('aria-label', t); }
    }
  }

  constructor(input, { onPause, root = document.body, blocked = () => false }) {
    this.input = input;
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.innerHTML = `
      <div class="stick"><div class="knob"></div></div>
      <button type="button" class="tb flap" data-a="flap" aria-label="Flap">Flap</button>
      <button type="button" class="tb dive" data-a="dive" aria-label="Land">Land</button>
      <button type="button" class="tb peck" data-a="peck" aria-label="Peck">Peck</button>
      <button type="button" class="tb coo" data-a="coo" aria-label="Coo">Coo</button>`;
    root.appendChild(this.el);
    TouchControls.current = this;
    this.visible = false;
    const show = () => { if (!this.visible) { this.visible = true; this.el.classList.add('on'); } };
    if (matchMedia('(pointer: coarse)').matches) show();
    window.addEventListener('touchstart', show, { passive: true, once: true });

    const stick = this.el.querySelector('.stick'), knob = this.el.querySelector('.knob');
    const touches = new Map();   // pointerId → role
    const R = 56;
    let stickO = null;
    const setStick = (x, y) => { this.input.setStick(x, y); knob.style.transform = `translate(${x * R}px, ${-y * R}px)`; };
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      stickO = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
      move(e);
    });
    const move = (e) => {
      if (!stickO || e.pointerId !== stickO.id) return;
      let x = (e.clientX - stickO.x) / R, y = -(e.clientY - stickO.y) / R;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      setStick(x, y);
    };
    stick.addEventListener('pointermove', move);
    const end = (e) => { if (stickO && e.pointerId === stickO.id) { stickO = null; setStick(0, 0); } };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    for (const b of this.el.querySelectorAll('.tb[data-a]')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        touches.set(e.pointerId, { a, x: e.clientX, y: e.clientY, off: false });
        this.input.setVirtual(a, true);
        if (a === 'flap') this.input.flapTap();
        if (a === 'peck') { clearTimeout(this.longPeck); this.longPeck = setTimeout(() => { this.input.setVirtual('drop', true); setTimeout(() => this.input.setVirtual('drop', false), 80); }, 550); }
        b.classList.add('down');
      });
      b.addEventListener('pointermove', (e) => {
        const t = touches.get(e.pointerId);
        if (!t) return;
        const r = b.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (outside && t.a === 'flap') t.off = true;   // slide off Flap: keep climbing, turn the camera
        if (t.off) this.input.addLook((e.clientX - t.x) * 0.006, (e.clientY - t.y) * 0.006);
        t.x = e.clientX; t.y = e.clientY;
      });
      const up = (e) => { if (touches.delete(e.pointerId)) { this.input.setVirtual(a, false); b.classList.remove('down'); if (a === 'peck') clearTimeout(this.longPeck); } };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    }

    this.defaults = Object.fromEntries([...this.el.querySelectorAll('.tb[data-a]')].map((b) => [b.dataset.a, b.textContent]));
    // camera drag on the right half (anywhere that isn't a button)
    let drag = null;
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || e.target.closest('#touch .tb, #touch .stick, #pause, gh-feedback')) return;
      if (e.clientX < innerWidth / 2) return;
      if (blocked()) return;   // Fixes-1 (#8): a swipe on the Board, Map or Settings scrolls them, it doesn't turn the camera
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (blocked()) { drag = null; return; }
      this.input.addLook((e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.006);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const dragEnd = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
    window.addEventListener('pointerup', dragEnd);
    window.addEventListener('pointercancel', dragEnd);
  }
}
