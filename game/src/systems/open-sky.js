// Batch-2 (#13): Open sky. The owner: fly far enough out of the city and Gus gets a badge and double flying speed;
// fly on and reality bends and he's back over the middle of the park.
//
//   - The trigger is a fixed distance outside layout.js WORLD (the park and its streets, ±200 m east-west), never the
//     rendered buildings (they vary by preset). Past OUT.badge m: the "Open sky ×2" badge, gus.skyMul = 2 (gus.js applies
//     it to the target speed before the heavy-carry clamp) and a toast the first time each trip.
//   - Past OUT.warp m: a shimmer (#warpfx, a CSS overlay plus a light canvas filter) and a rising synth swell build over
//     BUILD s. Turning back (heading towards the park) or dropping back inside cancels them. Then Gus arrives gliding
//     ARRIVE_ALT m over the Great Lawn, with a line from him (a bubble). The flock comes along (flock.place); a carried hot
//     slice goes cold (no shortcut for the 820 m slice puzzle).
//   - Never during races or encounters (a mod's panel), scenes, dialogue, the wheel, driving, a running scheme script, a nap,
//     Ruffled or a grate trip (G.midScene), or a replay of an old recording (G.legacyTakeoff). Uses the Ruffled teleport
//     path (gus.place, flock.place, a snapped camera).
// Gameplay state is on the fixed clock (tick(dt) from gameplay()); render(dt) only draws the badge and the shimmer.

import { WORLD, P } from '../world/layout.js';

const OUT = { badge: 150, badgeOff: 130, warp: 600 };
const BUILD = 2.6;          // s of shimmer before the warp
const ARRIVE_ALT = 40;      // m over the Great Lawn
const LAWN = P(0.47, 82.8);
const LINES = ['Whoa. Where… the Great Lawn? Home sweet park.', 'Huh. All roads lead back to the park.', 'Too much sky. Back to the middle of things!'];

/** Distance (m) from (x, z) to the WORLD rectangle (0 inside). */
export const outside = (x, z) => Math.hypot(Math.max(WORLD.xMin - x, 0, x - WORLD.xMax), Math.max(WORLD.zMin - z, 0, z - WORLD.zMax));

export class OpenSky {
  constructor(G) {
    this.G = G;
    this.on = false;        // the badge and the ×2
    this.warpT = 0;         // the shimmer's build-up (s)
    this.swell = null;      // the audio handle while it builds
    this.arriveT = 0;       // the arrival flash (s left; render only)
    this.trips = 0;
    this.lineI = 0;
    this.badge = document.createElement('div');
    this.badge.id = 'opensky';
    this.badge.innerHTML = '<b>Open sky</b><span>×2</span>';
    this.fx = document.createElement('div');
    this.fx.id = 'warpfx';
    document.body.append(this.badge, this.fx);
    this.shown = { badge: false, k: -1 };
  }

  allowed() {
    const G = this.G;
    return G.gus.mode === 'fly' && !G.legacyTakeoff && !G.cutscene.locked && !G.dialogue.open && !G.wheel.open && !G.vehicles.driving && !G.midScene() && !G.mods.some((m) => m.panel?.());
  }

  tick(dt) {
    const G = this.G, gus = G.gus, p = gus.position;
    const d = outside(p.x, p.z);
    // cheap first: well inside the city nothing else is looked at
    const ok = d > OUT.badgeOff && this.allowed();
    const was = this.on;
    this.on = ok && (this.on ? d > OUT.badgeOff : d > OUT.badge);
    gus.skyMul = this.on ? 2 : 1;
    if (this.on && !was) { this.trips++; G.toast(this.trips === 1 ? 'The city\'s behind you… open sky! Double speed.' : 'Open sky! Double speed.'); }
    // the warp: building while he keeps heading out; turning back (or anything above) cancels it
    const out = this.#heading(p.x, p.z, gus.yaw);
    if (this.on && d > OUT.warp && out > 0) {
      if (this.warpT === 0) this.swell = G.audio.swell?.(BUILD) || null;
      this.warpT += dt;
      if (this.warpT >= BUILD) this.#warp();
    } else if (this.warpT > 0) this.cancel();
  }

  /** Cosine between his heading and the way out (the outward normal of the nearest part of WORLD). */
  #heading(x, z, yaw) {
    const cx = Math.min(Math.max(x, WORLD.xMin), WORLD.xMax), cz = Math.min(Math.max(z, WORLD.zMin), WORLD.zMax);
    const ox = x - cx, oz = z - cz, l = Math.hypot(ox, oz) || 1;
    return (Math.sin(yaw) * ox + Math.cos(yaw) * oz) / l;
  }

  cancel() {
    this.warpT = 0;
    this.swell?.stop();
    this.swell = null;
  }

  #warp() {
    const G = this.G, gus = G.gus;
    this.cancel();
    const y = G.terrain.heightAt(LAWN.x, LAWN.z) + ARRIVE_ALT;
    gus.place({ x: LAWN.x, z: LAWN.z, y, yaw: Math.cos(gus.yaw) >= 0 ? 0 : Math.PI, mode: 'fly', speed: 7.5 });   // along the park, never straight back out
    G.flock.place(G.leader());
    G.rig.yaw = gus.yaw;
    G.rig.update(G.DT, gus, { snap: true, collision: G.collision });
    this.on = false; gus.skyMul = 1;
    // a hot slice doesn't survive the trip (no shortcut for the slice run)
    const c = G.state.carried;
    let note = '';
    if (c && G.items.isHot(c)) { c.born = -1e9; note = ' (The slice went cold on the way.)'; }
    G.audio.synth('warpArrive');
    this.arriveT = 1.2;
    const line = LINES[this.lineI++ % LINES.length];
    G.bubbles.add(line + note, { at: { x: gus.position.x, y: gus.position.y + 0.6, z: gus.position.z }, kind: 'thought', ttl: 4 });
    G.bus.emit('warp', { x: LAWN.x, z: LAWN.z });
  }

  /** Drop everything (applyState, quit to title). */
  reset() { this.cancel(); this.on = false; this.arriveT = 0; if (this.G.gus) this.G.gus.skyMul = 1; }

  /** Render only: the badge and the shimmer. */
  render(dt) {
    const k = this.arriveT > 0 ? (this.arriveT -= dt, Math.max(0, this.arriveT / 1.2)) : Math.min(1, this.warpT / BUILD);
    const badge = this.on && this.G.screen === 'play';
    if (badge !== this.shown.badge) { this.badge.classList.toggle('on', badge); this.shown.badge = badge; }
    const kr = Math.round(k * 40) / 40;
    if (kr !== this.shown.k) {
      this.shown.k = kr;
      this.fx.style.opacity = String(kr);
      this.fx.classList.toggle('on', kr > 0);
      const cv = this.G.renderer?.domElement;
      if (cv) cv.style.filter = kr > 0 ? `hue-rotate(${Math.round(kr * 70)}deg) saturate(${(1 + kr * 0.8).toFixed(2)}) blur(${(kr * 1.6).toFixed(2)}px)` : '';
    }
  }
}
