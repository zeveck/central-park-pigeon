// gear-pen, "The Cufflink" (Lost & Found). In sunglasses the Tavern waiter
// takes Gus for a regular, but he's standing on the cufflink. Fun pass (P8): a
// flock at the bread basket just gets shooed (layout.js BLOCKERS); a wine glass
// teeters on the edge of the next table, and a glass on an edge is a cat job:
// the cats knock it, it smashes, and the waiter rushes over with a dustpan,
// stepping off the cufflink. (Or the songbirds ring the patio phone, as before.)
// Then the crows trade it to the sidewalk artist for a paint pen.
import * as THREE from 'three';
import { L, onStep } from './_ssf-common.js';
import { TAVERN_TABLE } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

export function installGearPen(G) {
  const E = G.schemes;
  E.registerScript('pen.cufflink', (ctx, done) => G.say([L(null, 'A gold cufflink, warm from under a very expensive shoe.')], done));
  E.registerScript('pen.portrait', (ctx, done) => G.later(1.2, () => G.say([
    L(null, 'The artist dashes off a portrait of Gus in thanks: three lines and an attitude.'),
    L('vesper', 'A paint pen. Enamel signs, kid. The ones a peck won\'t shift. And the picture goes in the Workshop.'),
  ], done)));

  // the patio table (furniture: always there; Gus can land on it)
  const T = TAVERN_TABLE, gy = G.terrain.heightAt(T.x, T.z);
  {
    const g = new THREE.Group(), white = ruleMaterial({ color: 0xf3efe6, roughness: 0.6 }), iron = ruleMaterial({ color: 0x2c3229, roughness: 0.7 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.04, 20), white); top.position.y = T.h - 0.02;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, T.h, 6).translate(0, T.h / 2, 0), iron);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 12), iron); foot.position.y = 0.02;
    for (const m of [top, leg, foot]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
    g.position.set(T.x, gy, T.z);
    G.items.group.add(g);
    G.collision.addCylinder({ x: T.x, z: T.z, y0: gy + T.h - 0.04, h: 0.04, r: T.r, tag: 'table' });
  }

  // the glass smashes: the waiter rushes over with a dustpan, off the cufflink
  G.bus.on('talent', (t, e) => {
    if (e.clue !== 'tavern-glass' || !onStep(G, 'gear-pen', 1)) return;
    const st = G.state, ag = G.humans.agents.find((a) => a.role === 'waiter' && a.out);
    if (!ag) return;
    const at = { x: ag.x, z: ag.z };
    G.bubbles.add('My CRYSTAL! Who— Coming, coming!', { at: () => ({ x: ag.x, y: (ag.y ?? 0) + 2.1, z: ag.z }), ttl: 2.8, range: 60 });
    ag.busy = true;
    G.humans.goTo(ag, { x: T.x + 0.9, z: T.z - 0.5 }, 2.6, () => { ag.mode = 'linger'; ag.t = 40; ag.yaw = Math.atan2(T.x - ag.x, T.z - ag.z); G.humans.play(ag, 'pickup', 2.5); });
    // (as the blockers' reveal does, clues.js #move: the flag with the spawn, so a save between can't lose the cufflink)
    const rk = 'clue.reveal.waiter';
    G.later(0.8, () => { if (G.state !== st || st.flags[rk]) return; st.flags[rk] = true; G.items.spawn('cufflink', at.x, at.z, { origin: at }); G.particles.burst('sparkle', at.x, G.surfaceY(at.x, at.z, 5) + 0.1, at.z, 10, { spread: 0.3 }); });
  });
}
