// The top, the credits and the post-credits sting.
//   shout    on the mooring mast's top deck: "Press ✕ to SHOUT" (it waits; it can't be missed). A close-up
//            of Gus on the Mecha's head, "FEED THE BIRDS!" (the voice, pitched down a little, with a code
//            echo for a reverb tail), the brass stinger, the city's chant, and the camera swings out wide
//            while bread (and one slice) rains from every window.
//   credits  back in the park, sunny: the Mecha stands on the Great Lawn, every crew partying round it,
//            the flock overhead; the credits roll (skippable after a few seconds).
//   sting    the painted still (assets/bg/sting.jpg): pigeons in Paris, Tokyo and Cairo look up and coo
//            back… "Next: the world?"
import * as THREE from 'three';
import { glyph } from '../ui/glyphs.js';
import { GIANT, hash, ease, clamp01 } from './finale.js';

// The credits live in data/credits.js (the title's Credits screen shows the same text).
export { CREDIT_NAME } from '../data/credits.js';
import { creditsHtml } from '../data/credits.js';
const CREDITS = creditsHtml({ roll: true });

export class Shout {
  constructor(F) { this.F = F; this.G = F.G; }

  start(stage) {
    const F = this.F, G = this.G;
    this.stage = stage; this.t = 0; this.ev = {};
    const C = F.parts.climb;
    if (stage === 'shout') {
      if (G.altView !== C.view) C.enterScene();
      C.atTop();
      this.pressedT = null;
      G.audio.cutMusic();
      G.audio.play('mecha-step-boom', { vol: 0.9 });
      C.slice.visible = false;
      C.heroLight(true);
    }
    if (stage === 'credits') {
      this.lift = null;
      C.heroLight(false);
      C.cleanup();
      F.$.shout.className = 'shout';
      // sunny, the park celebrating, the Mecha on the Great Lawn
      G.state.phase = 'afternoon';
      G.setPhase('afternoon'); G.humans.setPhase('afternoon'); G.rangers.setPhase('afternoon'); G.street.setPhase('afternoon');
      const p = F.monument();
      F.group.add(F.mecha.root);
      F.mecha.root.position.set(p.x, p.y, p.z); F.mecha.root.rotation.set(0, p.yaw, 0);
      F.setScale(GIANT);
      if (F.gusMesh) F.gusMesh.visible = true;
      this.c = { x: p.x, y: p.y, z: p.z };
      G.gus.root.position.set(p.x + 9, p.y, p.z - 14);
      F.parts.stomp.partyAt(this.c);
      F.parts.stomp.lighten(true);
      G.leader = () => ({ position: new THREE.Vector3(p.x, p.y + 22, p.z), velocity: new THREE.Vector3(0, 0, 0), yaw: 0, grounded: false });
      F.$.roll.innerHTML = CREDITS;
      F.$.credits.className = 'credits on';
      this.rollH = null;
      G.audio.play('crowd-cheer', { vol: 0.8 });
    }
    if (stage === 'sting') {
      F.$.credits.className = 'credits';
      F.$.sting.style.backgroundImage = "url('assets/bg/sting.jpg')";
      F.$.sting.className = 'sting on';
      F.$.skip.className = 'skip';
    }
  }

  update(dt) {
    const F = this.F, G = this.G, t = (this.t += dt);
    const once = (k, fn) => { if (!this.ev[k]) { this.ev[k] = true; fn(); } };
    if (this.stage === 'shout') return this.#shout(dt, t, once);
    if (this.stage === 'credits') return this.#credits(dt, t, once);
    // ---- the sting
    if (t > 1.6) F.$.sting.className = 'sting on words';
    once('coo', () => { G.audio.play('choir-coo-chorus', { vol: 0.8 }); G.later(1.8, () => G.audio.play('coo-gather', { vol: 0.8 })); });
    const skip = t > 2.5 && (G.input.pressed('flap') || G.input.pressed('uiOk'));
    if (t > 8.5 || skip) { F.$.sting.className = 'sting'; return true; }
    return false;
  }

  #shout(dt, t, once) {
    const F = this.F, G = this.G, C = F.parts.climb, m = F.mecha;
    const head = F.wpos(m.seat);
    m.ventGlow(t, 2);
    C.flock.center.set(0, 400, -20); C.flock.radius = 40; C.flock.height = 20; C.flock.update(dt);
    if (this.pressedT == null) {
      m.pose('stand', t);
      // the close-up: Gus on the Mecha's head, the city glowing behind (a slow push from the beak to him)
      const k = ease(clamp01(t / 3));
      F.cam([head.x + 1.3 - 0.3 * k, head.y + 0.5 + 0.1 * k, head.z - 2.1 + 0.6 * k], [head.x, head.y + 0.28, head.z], 42);
      if (t > 0.8) {
        const inp = G.input;
        const el = F.$.prompt;
        const key = 'shout|' + inp.device + inp.gamepad.family;
        if (F.promptKey !== key) { F.promptKey = key; el.innerHTML = `<span>Press</span>${glyph('flap', inp.device, inp.gamepad.family)}<span>to SHOUT</span>`; }
        el.className = 'prompt on pulse';
        if (inp.pressed('flap')) { this.pressedT = t; F.prompt(null); }
      }
      return false;
    }
    const u = t - this.pressedT;
    // Fixes-3 (R9): the head rears back for the shout, then comes proudly forward again for the hero shot (reared back
    // the whole time, from the pull-back camera the face and Gus were hidden and it read as the Mecha's back)
    m.pose('shout', u < 2.6 ? clamp01(u / 0.4) : 1 - 0.75 * ease(clamp01((u - 2.6) / 1.6)));
    once('shout', () => {
      G.audio.voice('mecha-feed-the-birds', { vol: 1, rate: 0.92 });
      G.later(0.17, () => G.audio.voice('mecha-feed-the-birds', { vol: 0.35, rate: 0.92 }));
      G.later(0.36, () => G.audio.voice('mecha-feed-the-birds', { vol: 0.15, rate: 0.92 }));
      F.$.shout.className = 'shout on';
      G.shake(0.6, 1.4); G.rumble?.(1, 1, 600);
    });
    once('brass', () => G.later(1.25, () => { G.audio.play('brass-stinger', { vol: 1 }); }));
    once('chant', () => G.later(2.0, () => { G.audio.play('crowd-chant-feed-the-birds', { vol: 0.9 }); G.audio.play('crowd-cheer', { vol: 0.8 }); G.audio.play('bread-rain', { vol: 1 }); }));
    if (u > 3.2) F.$.shout.className = 'shout';
    if (u > 1.6) C.rain(u - 1.6, dt);
    // the camera: the close-up on the shout, then it pulls back and up to the SOUTH (Fixes-2, P1: it used to swing
    // west and end on the grey city), ending on the hero shot: the Mecha facing us on the mast, the lit crown below,
    // and behind it Midtown running north to the green of Central Park and the skyline on the horizon
    const k = ease(clamp01((u - 1.0) / 6.5));
    const a = 0.4 - k * 0.66, r = 12 + k * 19;   // Fixes-3 (R9): a little closer, so the Mecha's face holds the frame
    // Fixes-3 (R9): Gus grows a little as the camera pulls out, so he still reads on the Mecha's head in the hero shot
    if (F.gusMesh) { F.gusMesh.visible = true; F.gusMesh.scale.setScalar((1.5 + 3.0 * k) / GIANT); }
    if (u >= 1.0) F.cam([head.x + Math.sin(a) * r, head.y + 2 + k * 3, head.z - Math.cos(a) * r], [head.x - k * 6, head.y - k * 9, head.z + k * 60], 50 - k * 2);
    // the one slice, tumbling past the camera
    if (u > 3.5 && u < 7) {
      const cp = G.dataCam.position;
      if (!C.slice.visible) { C.slice.visible = true; this.sliceY = cp.y + 14; }
      this.sliceY -= dt * 9;
      const dir = new THREE.Vector3(head.x - cp.x, 0, head.z - cp.z).normalize();
      C.slice.position.set(cp.x + dir.x * 22 + 3, this.sliceY, cp.z + dir.z * 22);
      C.slice.rotation.set(u * 2.1, u * 1.3, 0.4);
    } else C.slice.visible = false;
    return u > 10.5;
  }

  #credits(dt, t, once) {
    const F = this.F, G = this.G, c = this.c, m = F.mecha;
    m.ventGlow(t, 1);
    // a little celebratory bounce: the Mecha's pose loops between standing and cheering
    m.pose('shout', 0.35 + 0.35 * Math.sin(t * 2.2));
    F.parts.stomp.partyUpdate(t, dt);
    if (Math.floor(t / 3) !== this.cheerN) { this.cheerN = Math.floor(t / 3); G.audio.play(['crowd-cheer', 'gang-coo-murmur', 'squirrel-chatter', 'goose-honk', 'cat-meow', 'dog-happy-bark', 'horse-whinny'][this.cheerN % 7], { vol: 0.5 }); }
    // a slow orbit from the south-west round to the west (clear of Cleopatra's Needle, east of the lawn)
    // polish (P17): the orbit dipped through the canopies round the lawn (several seconds of leaves); it now lifts over any
    // tree between it and the Mecha, looking a couple of seconds ahead so the rise is gentle (render only)
    const at = (tt) => { const a = Math.PI + 0.5 - tt * 0.045, r = 44 - 6 * Math.sin(tt * 0.1); return new THREE.Vector3(c.x + Math.sin(a) * r, c.y + 12 + 5 * Math.sin(tt * 0.13), c.z + Math.cos(a) * r); };
    const look = new THREE.Vector3(c.x, c.y + 10, c.z);
    const need = Math.max(this.#lift(at(t), look), this.#lift(at(t + 2.5), look));
    this.lift = (this.lift ?? need) + (need - (this.lift ?? need)) * Math.min(1, dt * (need > (this.lift ?? 0) ? 2.5 : 0.8));
    const cp = at(t); cp.y += this.lift;
    F.cam([cp.x, cp.y, cp.z], [c.x, c.y + 10, c.z], 58);
    // the roll
    const roll = F.$.roll;
    if (this.rollH == null) this.rollH = roll.offsetHeight || 1800;
    const H = innerHeight, dur = 44;
    roll.style.top = `${(H - (t / dur) * (this.rollH + H)).toFixed(1)}px`;
    if (t > 3) { const inp = G.input; F.$.skip.innerHTML = `${glyph('flap', inp.device, inp.gamepad.family)}<span>Skip</span>`; F.$.skip.className = 'skip on'; }
    const skip = t > 3 && (G.input.pressed('flap') || G.input.pressed('uiOk'));
    if (t > dur || skip) { F.$.skip.className = 'skip'; return true; }
    return false;
  }

  /** How far up (m) the camera at p must go so neither it nor its view of `look` is in a tree's canopy. */
  #lift(p, look) {
    const col = this.G.collision;
    for (let up = 0; up <= 24; up += 2) {
      const q = p.clone(); q.y += up;
      let clear = !col.softAt(q);
      for (let i = 1; clear && i < 8; i++) if (col.softAt(q.clone().lerp(look, i / 10))) clear = false;
      if (clear) return up;
    }
    return 24;
  }

  end() {}
  cleanup() { this.F.$.shout.className = 'shout'; this.F.$.credits.className = 'credits'; this.F.$.sting.className = 'sting'; this.F.$.skip.className = 'skip'; }
  debug() { return { sub: this.stage, t: +(this.t || 0).toFixed(2), shouted: this.pressedT != null }; }
}
