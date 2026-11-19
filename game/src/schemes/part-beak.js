// part-beak, "Take a Cone, Kid" (Lost & Found). The foreman's lucky sticker
// went down the 77th E grate; the rats fetch it, the crows trade it for a
// cone, the horses Kick (or the raccoons Rig) the jammed sidewalk-shed gate,
// and a hauler takes the cone home (Big Ben: "Hup."; with the horses he does both in one go, fun pass P12).
import { L } from './_ssf-common.js';

export function installPartBeak(G) {
  const E = G.schemes;
  E.registerScript('beak.sticker', (ctx, done) => G.say([L('sue', 'One lucky hard-hat sticker. Smells of drain. Still lucky, probably.')], done));
  E.registerScript('beak.deal', (ctx, done) => G.later(1.4, () => G.say([L(null, 'The foreman slaps the sticker on his hat. "Take a cone, kid. They\'re behind the shed gate. It sticks."')], done)));
  // fun pass (P12): with the horses, Big Ben kicks the gate AND pulls the cone home in the same scene (step 4 then completes at
  // once on cone.home); after the raccoons it's step 4's haul, and the cone reaching the Workshop sets cone.home (below)
  E.registerScript('beak.gate', (ctx, done) => G.say([L(null, 'The gate swings open. One orange traffic cone, regulation size, slightly squashed.')], () => {
    if (ctx.opt?.on?.ally !== 'horses') { done(); return; }
    const cone = G.items.world.find((w) => w.id === 'cone' && !w.parked && !w.hauling);
    const c = ['clementine', 'bigben'].map((id) => G.chars.find(id)).find((q) => q?.here) || null;   // the horse who kicked it
    if (!cone || !G.clues.haulNow(cone, 'horses', c)) { done(); return; }
    G.later(0.4, () => G.bubbles.add('Hup.', { at: () => ({ x: G.gus.position.x, y: G.gus.position.y + 0.8, z: G.gus.position.z }), ttl: 1.6 }));
    done();
  }));
  G.bus.on('haul', (t, e) => { if (e.item === 'cone' && e.workshop) G.state.flags['cone.home'] = true; });
}
