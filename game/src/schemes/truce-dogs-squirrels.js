// truce-dogs-squirrels, "No Squirrel Digs Where the Dogs Run" (Feuds &
// Truces). Mornings on Cedar Hill, the dog walker's eight dogs chase the
// squirrels off. Old Pecan's 1974 cache on Cherry Hill (the squirrels dig it)
// is a sack of tennis balls; dropped by the dog walker it bursts: balls
// everywhere, eight dogs (Pretzel first) chase balls, not squirrels. Hazel and
// Biscuit shake on the Elders' rock: Dig & Fetch, squirrels dig on dog lawns.
import * as THREE from 'three';
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, truceScene } from './_sf-common.js';
import { PLACES } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

export function installTruceDogsSquirrels(G) {
  const E = G.schemes;
  const hill = PLACES['cedar-hill'];
  const group = new THREE.Group();
  const balls = [];
  const ballGeo = new THREE.SphereGeometry(0.07, 10, 8), ballMat = ruleMaterial({ color: 0xd8f03a, roughness: 0.9 });
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(ballGeo, ballMat); m.visible = false; m.castShadow = true; group.add(m); balls.push(m); }
  let burst = null;
  E.registerScript('dogs.chase', (ctx, done) => {
    const w = G.humans.agents.find((a) => a.role === 'dogwalker' && a.out);
    G.cutscene.run('dogs-chase', [
      { do: () => { G.audio.play('dog-bark', { at: hill }); G.later(0.4, () => G.audio.play('squirrel-chatter', { at: hill })); } },
      { cam: { ...G.shot({ x: w?.x ?? hill.x, y: G.surfaceY(w?.x ?? hill.x, w?.z ?? hill.z, 30), z: w?.z ?? hill.z }, { dist: 12, height: 4.5, yaw: G.gus.yaw + Math.PI + 0.6, lookY: 0.6 }), secs: 1.3 } },
      { do: () => { for (let k = 0; k < 4; k++) G.later(k * 0.35, () => G.bubbles.add(k % 2 ? 'EEK!' : 'WOOF!', { at: { x: hill.x + (k - 2) * 2.5, y: G.surfaceY(hill.x, hill.z, 30) + 1.2, z: hill.z + (k % 2) * 3 }, ttl: 1.2, range: 80 })); } },
      { wait: 1.6 },
      { say: [
        L('hazel', 'See? SEE? Every Morning. THOSE dogs. No squirrel digs where the dogs run, Gus.'),
        L('biscuit', 'They\'re not MY dogs! …They\'re my FRIENDS\' dogs. They just really like squirrels.'),
        L('pecan', 'In my day we had a trick for dogs. Nineteen seventy-four. I buried it on Cherry Hill.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });
  E.registerScript('dogs.cache', (ctx, done) => {
    G.later(0.6, () => G.say([
      L('pecan', 'A whole sack of tennis balls! I was saving it for a rainy decade.'),
      L('hazel', 'Heavy, Gus. Carry it low. And drop it by the dog walker. In the MORNING.'),
    ], done));
  });
  E.registerScript('dogs.balls', (ctx, done) => {
    const g = G.gus.position;
    const at = { x: g.x, y: g.y, z: g.z };
    const pretzel = G.chars.find('pretzel'), biscuit = G.chars.find('biscuit');
    G.cutscene.run('dogs-balls', [
      { do: () => {
        // the sack bursts: balls everywhere
        const it = G.items.world.find((q) => q.id === 'tennis-sack'); if (it) G.items.remove(it);
        G.audio.play('drop-thud', { at }); G.particles.burst('dust', at.x, at.y + 0.2, at.z, 14, { spread: 0.8 });
        burst = { t: 0, at };
        G.audio.play('dog-happy-bark', { at });
      } },
      { cam: shotAt(G, at, { dist: 9, height: 3.4, side: 0.5, lookY: 0.4 }) },
      { wait: 0.6 },
      { do: () => {
        if (pretzel) { pretzel.script = true; G.chars.moveTo(pretzel, { x: at.x + 6, z: at.z + 4 }, { kind: 'bound', secs: 1.4 }); bubbleOver(G, pretzel, 'BALLS! BALLS! BALLS!', 2.2); }
        if (biscuit) { biscuit.script = true; G.chars.moveTo(biscuit, { x: at.x - 5, z: at.z + 5 }, { kind: 'bound', secs: 1.6 }); }
        for (const k of [0.3, 0.9, 1.5]) G.later(k, () => G.audio.play('dog-bark', { at, rate: 0.9 + k * 0.2 }));
        const w = G.humans.agents.find((a) => a.role === 'dogwalker' && a.out);
        if (w) G.bubbles.add('Hey! HEY! Come back!', { at: () => ({ x: w.x, y: (w.y ?? 0) + 2.1, z: w.z }), ttl: 2.4 });
      } },
      { wait: 2.6 },
      { say: [L('hazel', 'They\'re chasing BALLS. Not squirrels. BALLS!'), L('biscuit', 'I would also like to chase the balls. Can we do the shaking first? Quickly?')] },
      { do: () => { if (pretzel) pretzel.script = false; if (biscuit) biscuit.script = false; } },
      { follow: true },
    ], () => {
      truceScene(G, 'dogs-truce', {
        a: 'hazel', b: 'biscuit', caption: 'Dogs & squirrels',
        lines: [L('hazel', 'Squirrels dig on the dog lawns. Dogs stand guard. Deal?'), L('biscuit', 'DEAL! Guard! I\'m GREAT at guard!')],
        after: [L('pecan', 'Fifty years I\'ve waited to dig on Cedar Hill. Worth it.'), L('pretzel', 'Squirrels dig, dogs guard. Dig and FETCH, Gus!')],
      }, done);
    });
  });
  return {
    group,
    update(dt) {
      if (!burst) return;
      burst.t += dt;
      const t = burst.t, a = burst.at;
      balls.forEach((m, i) => {
        const ang = (i / balls.length) * Math.PI * 2 + 0.3, sp = 2.2 + (i % 4) * 0.9;
        const r = sp * Math.min(t, 2.5) * (1 - Math.min(t, 2.5) / 6);
        const x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
        const bounce = Math.abs(Math.sin(t * (5 + (i % 3)))) * Math.max(0, 1.2 - t * 0.4);
        m.visible = t < 9; m.position.set(x, G.surfaceY(x, z, 30) + 0.07 + bounce, z);
      });
      if (t > 9) { burst = null; balls.forEach((m) => { m.visible = false; }); }
    },
    restore() { burst = null; balls.forEach((m) => { m.visible = false; }); },
  };
}
