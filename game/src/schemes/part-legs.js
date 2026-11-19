// part-legs, "Two Old Drainpipes" (Feuds & Truces). At Night Strix's Night
// Eyes marks two old iron drainpipes under the Great Lawn's north edge (their
// plumes show by day from then on). By day the squirrels dig them up while the
// dogs stand guard (the Dig & Fetch truce combo). Each pipe is huge and lies
// beside the transverse road, so the horses can Pull them home (Big Ben:
// "Hup."). The Legs bolt onto the Workshop scaffold.
import { L, bubbleOver, onStep } from './_sf-common.js';
import { PLACES } from '../world/layout.js';

export function installPartLegs(G) {
  const E = G.schemes;
  const P = PLACES['great-lawn-pipes'];
  E.registerScript('legs.marked', (ctx, done) => {
    G.later(0.3, () => G.say([
      L('strix', 'Two of them, dear. Iron. Long as a bench. Under the lawn since 1890, by the look of them.'),
      L('strix', 'Come back by day. Your diggers will see the plumes now.'),
    ], done));
  });
  E.registerScript('legs.dug', (ctx, done) => {
    G.later(0.4, () => G.say([
      L('hazel', 'Two drainpipes! On a DOG lawn! And not one dog chased us!'),
      L('biscuit', 'We GUARDED. Did you see us guard? We were very good at it.'),
      L('pretzel', 'Huge, though. Right by the road. The horses could pull those, Gus.'),
    ], done));
  });
  // the dogs stand guard while the squirrels dig (the truce combo), and Big Ben hauls
  G.bus.on('call', (t, e) => {
    if (e.ally !== 'squirrels' || !onStep(G, 'part-legs', 2) || Math.hypot(e.x - P.x, e.z - P.z) > P.r + 10) return;
    for (const [id, dx] of [['biscuit', 2.4], ['pretzel', -2.2]]) {
      const c = G.chars.find(id); if (!c || c.here) continue;
      const p = { x: e.x + dx, z: e.z - 1.6 }; p.y = G.surfaceY(p.x, p.z, 40);
      c.script = true; G.chars.arrive(c, p, 'bound', 2.4);
      G.later(2.6, () => { c.yaw = Math.atan2(-dx, 1); bubbleOver(G, c, id === 'biscuit' ? 'On guard! GUARDING!' : '*very serious guard face*', 2.4); });
      G.later(9, () => { if (c.script && !c.here) G.chars.goHome(c); });
    }
  });
  G.bus.on('haul', (t, e) => { if (e.item === 'pipe' && e.ally === 'horses') G.later(0.4, () => bubbleOver(G, 'bigben', 'Hup.', 1.8)); });
  return {};
}
