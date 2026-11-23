// World-anchored bubbles: speech ("Hey! Shoo!"), thoughts ("FEED the
// birds…?"), clue marks ("…" over a human in the way, "!" over a wanted item)
// and crowd barks. Each follows a point in the world (game coordinates) and
// fades with distance. Timers run on the game clock.

export class Bubbles {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'bubbles';
    document.body.appendChild(this.el);
    this.list = new Map();
    this.seq = 0;
  }

  /** opts: { kind: 'speech'|'thought'|'clue', at: {x,y,z} | () => {x,y,z}, ttl: s (0 = until removed), range } */
  add(text, { id = null, kind = 'speech', at, ttl = 2.5, range = 45, html = null } = {}) {
    id = id || 'b' + ++this.seq;
    let b = this.list.get(id);
    if (!b) {
      const el = document.createElement('div');
      this.el.appendChild(el);
      b = { el };
      this.list.set(id, b);
    }
    b.el.className = 'bubble ' + (kind === 'speech' ? '' : kind);
    if (html) b.el.innerHTML = html; else b.el.textContent = text;
    Object.assign(b, { at, ttl, range, text });
    return id;
  }

  remove(id) { const b = this.list.get(id); if (b) { b.el.remove(); this.list.delete(id); } }
  has(id) { return this.list.has(id); }
  clear() { for (const id of [...this.list.keys()]) this.remove(id); }

  tick(dt) {
    for (const [id, b] of this.list) {
      if (b.ttl > 0) { b.ttl -= dt; if (b.ttl <= 0) this.remove(id); }
    }
  }

  /** project(x, y, z) → { x, y, dist, visible } in CSS pixels. */
  render(project) {
    // Land/perf: style writes only when a value changed (bubbles are positioned every drawn frame)
    // photo mode review (#9): a bubble that would overlap the toast column is pushed below it (toasts and speech were unreadable together)
    const te = document.getElementById('toasts');
    const tr = te && te.childElementCount && te.offsetParent ? te.getBoundingClientRect() : null;
    for (const b of this.list.values()) {
      const p = typeof b.at === 'function' ? b.at() : b.at;
      const s = p ? project(p.x, p.y, p.z) : null;
      const show = !!s && s.visible && s.dist <= b.range;
      const c = b._c || (b._c = {});
      if (c.show !== show) { b.el.style.display = show ? '' : 'none'; c.show = show; }
      if (!show) continue;
      let sy = s.y;
      if (tr && tr.height > 0) {
        if (c.y !== `${s.y.toFixed(0)}px`) { b.el.style.top = `${s.y.toFixed(0)}px`; c.y = `${s.y.toFixed(0)}px`; }
        if (c.x !== `${s.x.toFixed(0)}px`) { b.el.style.left = `${s.x.toFixed(0)}px`; c.x = `${s.x.toFixed(0)}px`; }
        const r = b.el.getBoundingClientRect();
        if (r.right > tr.left && r.left < tr.right && r.bottom > tr.top && r.top < tr.bottom) sy += tr.bottom + 6 - r.top;
      }
      const x = `${s.x.toFixed(0)}px`, y = `${sy.toFixed(0)}px`, far = s.dist > b.range * 0.6;
      if (c.x !== x) { b.el.style.left = x; c.x = x; }
      if (c.y !== y) { b.el.style.top = y; c.y = y; }
      if (c.far !== far) { b.el.classList.toggle('far', far); c.far = far; }
    }
  }
}
