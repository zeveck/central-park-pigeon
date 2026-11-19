// gear-sunglasses, "Photobomb" (Lost & Found). Fun pass (P6): the selfie
// tourist at Grand Army Plaza won't look up from his phone, and mobbing him
// only gets "Ugh. Pigeons." (layout.js BLOCKERS). So get IN the shot: he poses
// with his back to the fountain, so the rim right behind him is what his phone
// sees. Stand there a moment and he lowers the phone to show his friend ("that's
// actually a GREAT shot"): now the crows can trade him the shiny for his
// sunglasses (the trade wants `selfie.attention`, as before).
import { onStep } from './_ssf-common.js';

const FOUNTAIN = { x: 97, z: -40 };   // layout.js LANDMARKS grand-army-fountain (r 5; its rim collides to 5.3)
const RIM = [3.0, 5.8];               // metres from the centre that count (the rim, or the basin's edge just inside it: be generous)
const ARC = 0.5;                      // radians either side of the line through him (about 2.6 m of rim)
const HOLD = 1.5;                     // seconds standing in his shot

/** The middle of the rim stretch behind him (for the goal script, screenshots). */
export function frameSpot(a) {
  const dx = a.x - FOUNTAIN.x, dz = a.z - FOUNTAIN.z, l = Math.hypot(dx, dz) || 1;
  return { x: FOUNTAIN.x + (dx / l) * 5.0, z: FOUNTAIN.z + (dz / l) * 5.0 };
}

export function installGearSunglasses(G) {
  let held = 0;
  const tourist = () => G.humans.agents.find((a) => a.role === 'selfie' && a.out);
  const inFrame = (a) => {
    const g = G.gus.position;
    if (G.gus.mode === 'fly' || G.gus.mode === 'takeoff') return false;
    const ux = a.x - FOUNTAIN.x, uz = a.z - FOUNTAIN.z, px = g.x - FOUNTAIN.x, pz = g.z - FOUNTAIN.z;
    const r = Math.hypot(px, pz);
    if (r < RIM[0] || r > RIM[1]) return false;
    const off = Math.atan2(ux * pz - uz * px, ux * px + uz * pz);
    return Math.abs(off) < ARC && g.y > G.terrain.heightAt(g.x, g.z) + 0.4;   // up on the rim, not on the pavement by it
  };
  G.mods.push({
    update(dt) {
      const st = G.state;
      if (!onStep(G, 'gear-sunglasses', 2) || st.flags['selfie.attention'] || G.cutscene.running) { held = 0; return; }
      const a = tourist();
      if (!a || !inFrame(a)) { held = Math.max(0, held - dt * 2); return; }
      held += dt;
      if (held < HOLD) return;
      held = 0;
      st.flags['selfie.attention'] = true;
      G.audio.play('camera-shutter', { at: a, vol: 0.8 });
      const at = () => ({ x: a.x, y: (a.y ?? 0) + 2.15, z: a.z });
      G.bubbles.add('Wait… a pigeon in my… that\'s actually a GREAT shot.', { at, ttl: 3.4, range: 60 });
      G.later(3.6, () => G.bubbles.add('Look! Is that a DOVE back there too?!', { at, ttl: 2.8, range: 60 }));
      G.later(1.0, () => G.toast('He\'s showing his friend the shot. Now\'s your chance to trade.', { seconds: 4 }));
      G.bus.emit('photobomb', {});
    },
    restore() { held = 0; },
  });
}
