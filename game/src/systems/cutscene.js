// Cutscenes: a list of beats run on the game clock (so recorded runs replay
// them exactly). While one runs Gus has no control and the camera can be
// eased between shots. A beat is one of:
//   { do: fn }                       run once
//   { wait: seconds }
//   { until: () => bool }            wait for a condition
//   { say: [lines] }                 dialogue; waits until it's closed
//   { cam: { pos: [x,y,z], look: [x,y,z], secs } }   ease the camera to a shot (game coordinates)
//   { follow: true }                 hand the camera back to the follow rig
//   { control: true }                give Gus control back early (the rest runs alongside play)

export class Cutscene {
  constructor(G) {
    this.G = G;
    this.beats = null;
    this.i = 0;
    this.t = 0;
    this.onDone = null;
    this.locked = false;
    this.shot = null;
    this.name = null;
  }

  get running() { return !!this.beats; }

  /** onCancel (Fixes-3, B2): runs instead of onDone when the scene is dropped (quit to the title, a load): it undoes
   *  what the scene had under way (a scripted vehicle, a sound loop, hidden or moved actors, an overlay). A beat's `do`
   *  may add more with G.cutscene.onCancel(fn) while the scene runs. */
  run(name, beats, onDone = null, onCancel = null) {
    if (this.beats) this.#end();
    this.name = name;
    this.beats = beats;
    this.i = 0; this.t = 0;
    this.onDone = onDone;
    this.cancels = onCancel ? [onCancel] : [];
    this.locked = true;
    this.started = false;
  }

  update(dt) {
    if (!this.beats) return;
    const G = this.G;
    this.#camera(dt);
    let guard = 0;
    while (this.beats && this.i < this.beats.length && guard++ < 50) {
      const b = this.beats[this.i];
      if (!b._started) { b._started = true; this.t = 0; this.#start(b); }
      this.t += guard === 1 ? dt : 0;
      if (!this.#done(b)) return;
      this.i++;
    }
    if (this.beats && this.i >= this.beats.length) this.#end();
  }

  #start(b) {
    const G = this.G;
    if (b.do) b.do();
    if (b.say) { this.talking = true; G.say(b.say, () => { this.talking = false; }); }
    if (b.cam) {
      const cam = G.dataCam;
      const from = { pos: cam.position.clone(), look: cam.position.clone().add(cam.getWorldDirection(new cam.position.constructor()).multiplyScalar(10)) };
      from.fov = G.dataCam.fov;   // Fixes-2: a shot may set its fov (a tighter lens for close-ups); it eases like the rest
      this.shot = { from, to: { pos: new from.pos.constructor(...b.cam.pos), look: new from.pos.constructor(...b.cam.look), fov: b.cam.fov || 60 }, t: 0, secs: b.cam.secs ?? 1.5 };
    }
    if (b.follow) { this.shot = null; G.rig.setFree(null); }
    if (b.control) this.locked = false;
  }

  #done(b) {
    if (b.wait != null) return this.t >= b.wait;
    if (b.until) return b.until();
    if (b.say) return !this.talking;
    return true;
  }

  #camera(dt) {
    const s = this.shot;
    if (!s) return;
    s.t += dt;
    const k = Math.min(1, s.t / s.secs);
    const e = k * k * (3 - 2 * k);
    const p = s.from.pos.clone().lerp(s.to.pos, e), l = s.from.look.clone().lerp(s.to.look, e);
    this.G.rig.setFree({ pos: [p.x, p.y, p.z], look: [l.x, l.y, l.z], fov: s.from.fov + (s.to.fov - s.from.fov) * e });
  }

  /** Fixes-3: add an undo for the running scene (see run()). */
  onCancel(fn) { if (this.beats) this.cancels.push(fn); }

  #end() {
    const f = this.onDone;
    this.beats = null; this.onDone = null; this.locked = false; this.name = null; this.cancels = [];
    if (this.shot) { this.shot = null; this.G.rig.setFree(null); }
    f?.();
  }

  skip() { if (this.beats) this.#end(); }

  /** Fixes-1: drop the scene without running its onDone (loading a save, quitting to the title): the onDone belongs
   *  to the game being left (it completes scheme steps, gives items). */
  cancel() {
    if (!this.beats) return;
    const undo = this.cancels || [];
    this.onDone = null; this.#end();
    for (const fn of undo.reverse()) { try { fn(); } catch (e) { console.warn('cutscene onCancel', e); } }   // Fixes-3 (B2)
  }
}
