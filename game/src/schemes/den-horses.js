// den-horses, "The Van on the Trough" (Spikes). Prickett parks his van on the
// carriage horses' water trough on Central Park South every Morning. Move him:
// the songbirds Mimic his phone (Chip's favourite trick: he wanders off to
// "answer" it while Duke's officer writes a ticket) or the geese Bully him off
// the kerb. He drives off grumbling and moves his stock into the Wollman Rink
// shed (spiking two South perches on the way); the horses drink and join
// (Kick, Pull, and the Carriage Slice Line).
import * as THREE from 'three';
import { L, gather, disperse, cheer, shotAt, bubbleOver, onStep, mechaLine, face } from './_sf-common.js';
import { PROLOGUE } from '../world/layout.js';
import { ruleMaterial } from '../gfx/load-model.js';

export const TROUGH = { x: 88, z: -9.6, w: 2.6, d: 0.7, h: 0.62 };

export function installDenHorses(G) {
  const E = G.schemes;
  const V = PROLOGUE.vanStop;
  // the trough itself, on the park-side kerb (the van parks across it)
  const group = new THREE.Group();
  const y0 = G.surfaceY(TROUGH.x, TROUGH.z, 3);
  const box = new THREE.Mesh(new THREE.BoxGeometry(TROUGH.w, TROUGH.h, TROUGH.d).translate(0, TROUGH.h / 2, 0), ruleMaterial({ color: 0x7c8186, metalness: 0.3, roughness: 0.6 }));
  box.position.set(TROUGH.x, y0, TROUGH.z); box.castShadow = true; group.add(box);
  const water = new THREE.Mesh(new THREE.BoxGeometry(TROUGH.w - 0.14, 0.02, TROUGH.d - 0.14), new THREE.MeshStandardMaterial({ color: 0x3f7f9c, roughness: 0.15, metalness: 0.1 }));
  water.position.set(TROUGH.x, y0 + TROUGH.h - 0.08, TROUGH.z); group.add(water);
  G.collision.addBox({ x: TROUGH.x, z: TROUGH.z, y0, h: TROUGH.h, w: TROUGH.w, d: TROUGH.d, tag: 'trough' });

  E.registerScript('horses.trough', (ctx, done) => {
    const vy = G.surfaceY(V.x, V.z, 3);
    G.cutscene.run('horses-trough', [
      { say: [L('clementine', 'Morning, kid. That van\'s parked on our trough again.', 'clementine-greeting'), L('clementine', 'A horse gets thirsty, pulling tourists round the park all day. And there he is. Every Morning.')] },
      { cam: { ...G.shot({ x: V.x, y: vy, z: V.z }, { dist: 11, height: 3.5, yaw: -0.5, lookY: 1.2 }), secs: 1.4 } },
      { wait: 1.2 },
      { say: [
        L('prickett', 'Prickett Pest-Pro, Del speaking! …Hello? …Hello? Huh. Nobody.'),
        L('dapple', 'He leans on that van all morning, on the phone to nobody.'),
        L('bigben', 'Hup.'),
        L('clementine', 'Big Ben\'s right. Somebody ought to MOVE him.'),
      ] },
      { follow: true },
      { do: () => done() },
    ]);
  });

  // step 2: Chip shows how it's done when the songbirds come; Duke's officer writes a ticket
  G.bus.on('call', (t, e) => {
    if (!onStep(G, 'den-horses', 2)) return;
    if (e.ally === 'songbirds') {
      const chip = G.chars.find('chip');
      if (chip) { chip.script = true; G.chars.arrive(chip, { x: e.x + 0.9, z: e.z - 0.6, y: G.surfaceY(e.x + 0.9, e.z - 0.6, G.gus.position.y + 1) }, 'flutter', 3); G.later(3.4, () => { bubbleOver(G, chip, 'Watch this one, Gus. My favourite.', 2.6); chip.script = false; }); }
    }
  });
  E.registerScript('horses.vanOff', (ctx, done) => {
    const bully = ctx.opt?.i === 1;
    const duke = G.chars.find('duke');
    const vy = G.surfaceY(V.x, V.z, 3);
    G.cutscene.run('horses-vanoff', [
      { do: () => { if (duke) { duke.script = true; duke.here = { x: V.x - 4, z: V.z + 3.4, scripted: true }; G.chars.arrive(duke, { x: V.x - 4, z: V.z + 3.4, y: G.surfaceY(V.x - 4, V.z + 3.4, 3) }, 'road', 1.6); } } },
      { cam: { ...G.shot({ x: V.x - 2, y: vy, z: V.z }, { dist: 12, height: 3.5, yaw: -0.4, lookY: 1.2 }), secs: 1.2 } },
      { wait: 1.6 },
      { do: () => { if (duke) { face(duke, V); bubbleOver(G, duke, '*Duke writes a ticket. With a hoof.*', 2.4, 2.4); } G.audio.play('paper-rustle', { at: V }); } },
      { say: bully
        ? [L('prickett', 'Whoa! Easy, birds! Geese! On Central Park SOUTH!'), L('duke', 'Parked on a horse trough. That\'s a ticket, by the book.')]
        : [L('prickett', 'A TICKET? I was answering my PHONE! …Which nobody was on.'), L('duke', 'Parked on a horse trough. That\'s a ticket, by the book.')] },
      { say: [L('prickett', 'Fine. FINE. I\'ll keep my stock in the rink shed. Rink\'s paying me to keep you lot off the boards anyway!')] },
      { do: () => { G.van.drive({ ...G.van.pos }, { x: -150, z: -12, yaw: -1.57 }, 7); const p = G.street.prickett; if (p) p.out = false; G.audio.play('engine-loop', { at: V, vol: 0.5, duration: 2 }); } },
      { wait: 2.2 },
      { follow: true },
      { do: () => { if (duke) G.chars.goHome(duke); done(); } },
    ]);
  });
  E.registerScript('horses.drink', (ctx, done) => {
    const ids = ['clementine', 'dapple', 'bigben'];
    let list = [];
    G.cutscene.run('horses-drink', [
      { do: () => {
        list = ids.map((id, i) => {
          const c = G.chars.find(id);
          if (!c) return null;
          const p = { x: TROUGH.x - 0.9 + i * 0.9, z: TROUGH.z + 1.5 };
          p.y = G.surfaceY(p.x, p.z, 3);
          c.script = true; c.here = { x: p.x, z: p.z, scripted: true };
          G.chars.arrive(c, p, 'road', 2 + i * 0.3);
          return c;
        }).filter(Boolean);
      } },
      { cam: { ...G.shot({ x: TROUGH.x, y: y0 + 0.4, z: TROUGH.z }, { dist: 6.5, height: 2.2, yaw: 0.5, lookY: 0.6 }), secs: 1.3 } },
      { wait: 2.8 },
      { do: () => { for (const c of list) { c.yaw = Math.PI; G.chars.animate(c, 'sniff', 2.6); } for (const k of [0, 0.6, 1.2, 1.8]) G.later(k, () => G.particles.splash(TROUGH.x, y0 + TROUGH.h, TROUGH.z, 6)); G.audio.play('splash-hop', { at: TROUGH }); } },
      { wait: 2.6 },
      { do: () => { cheer(G, list); G.audio.play('horse-whinny', { at: TROUGH }); } },
      { say: [
        L('clementine', 'You\'ve got the whole carriage line, sweetheart. Cold water, and no van in it.', 'clementine-join'),
        L('clementine', 'Stuck gates, jammed doors: we KICK. Anything huge by a road: we PULL. And I\'ll save you the driver\'s lunch slice at the Pond carriage stop.'),
        L('dapple', 'Can we see the Ramble now? The REAL woods?'),
        L('bigben', 'Hup.'),
      ] },
      { follow: true },
      { do: () => { disperse(G, list); done(); } },
    ]);
  });
  mechaLine(G, 'clementine', 'horses', 'A pigeon the size of a carriage? Kid, I\'ve pulled worse. I\'ve pulled TOURISTS.');
  return { group };
}
