// den-ducks, "Ducks Want Peas" (Sign War). The Commodore won't touch bread;
// the Boathouse picnickers bring a tub of peas every Afternoon and never let
// go of it. Fun pass (P3): the swarm Sue just taught fails here, out loud ("We've
// been mobbed by better pigeons"), and the answer is the other thing the
// Prologue taught, used for something new: a FEED sign gets a picnic up off its
// benches. Flip M7 up the path and the whole picnic walks over to feed the
// birds, leaving the tub alone on its table for a few seconds. While M7 stays
// live they get up again every half minute, so a missed grab only means a wait.
// Star turn: Bubbles, who does every Lake dive in Act 1, showing off.
import * as THREE from 'three';
import { L, joinScene, mechaLine, onStep, bubbleOver } from './_ssf-common.js';
import { ruleMaterial } from '../gfx/load-model.js';

const PICNIC = { x: 45.5, z: 292.5 };   // the table (data/people.js: three sitters round it)
const TABLE_Y = 0.62;                  // the table top, above the grass
const GUARD_R = 3.2;                   // a picnicker this close to the tub keeps hold of it
const AGAIN = 30;                      // seconds between rounds of bird-feeding while M7 stays live

export function installDenDucks(G) {
  const E = G.schemes;
  // Fixes-2 (P6): the meeting no longer reads out the answer; the card's riddle and the 3-minute nudge carry it
  E.registerScript('ducks.meet', (ctx, done) => G.say([
    L('puddles', 'Commodore Puddles, Lake Mallards. You\'re the sign-flipping pigeon the whole Lake is quacking about.'),
    L('puddles', 'If you\'ve come with BREAD, turn your tail feathers around. Do you KNOW what bread does to a duck?'),
    L('mrspuddles', 'Peas, dear. We like peas. The Boathouse picnickers bring a whole tub every Afternoon… and never share a single one.'),
    L('ensign', '*salutes the sign* *salutes Gus* *salutes a passing leaf*'),
  ], done));

  // the picnic table (visual; it's out with the picnic, Afternoons)
  const ground = () => G.terrain.heightAt(PICNIC.x, PICNIC.z);
  const table = new THREE.Group();
  {
    const wood = ruleMaterial({ color: 0x8a5a34, roughness: 0.85 }), cloth = ruleMaterial({ color: 0xd8443a, roughness: 0.9 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 18), wood); top.position.y = TABLE_Y - 0.025;
    const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.66, 0.06, 18), cloth); cl.position.y = TABLE_Y - 0.03; cl.scale.set(1, 0.5, 1);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, TABLE_Y, 8).translate(0, TABLE_Y / 2, 0), wood);
    for (const m of [top, cl, leg]) { m.castShadow = true; m.receiveShadow = true; table.add(m); }
    table.position.set(PICNIC.x, ground(), PICNIC.z);
    table.visible = false;
    G.items.group.add(table);
    // (first-15 check: walking up, the tub on the table was just out of a peck's reach; now Gus can hop up onto the table)
    G.collision.addCylinder({ x: PICNIC.x, z: PICNIC.z, y0: ground() + TABLE_Y - 0.05, h: 0.05, r: 0.62, tag: 'table' });
  }

  const onPeasStep = () => onStep(G, 'den-ducks', 2) && G.state.phase === 'afternoon';
  const tubItem = () => G.items.world.find((w) => w.id === 'peas' && w.tub);
  const peasAround = () => G.items.world.some((w) => w.id === 'peas') || G.state.carried?.id === 'peas';
  const picnic = () => G.humans.agents.filter((a) => a.out && a.spec.group === 'boathouse');
  const near = (it, r) => picnic().filter((a) => Math.hypot(a.x - it.x, a.z - it.z) < r);
  const sayOver = (a, text, ttl = 2.8) => G.bubbles.add(text, { at: () => ({ x: a.x, y: (a.y ?? 0) + 2.15, z: a.z }), ttl, range: 60 });

  // the swarm fails here, out loud (humans.js clings): the "almost" line points away from mobbing
  G.humans.clings.push((a) => (a.spec.group === 'boathouse' && onPeasStep() && tubItem() && !a.busy ? 'We\'ve been mobbed by better pigeons. The peas STAY.' : null));
  let guardSaid = null;
  // the tub can't be taken while somebody's sat by it (items.js guards)
  G.items.guards.push((it) => {
    if (!it.tub || !onPeasStep()) return false;
    const a = near(it, GUARD_R)[0];
    if (!a) return false;
    if (G.state.time - (guardSaid || -99) > 2.8) { guardSaid = G.state.time; sayOver(a, ['Hands OFF, pigeon! Those are OUR peas.', 'Nice try. The peas stay with US.', 'Shoo! Go and get your own lunch!'][Math.floor(G.state.time / 7) % 3]); G.audio.synth('uiBack'); }   // (one at a time)
    return true;
  });

  // a FEED sign up the path: the whole picnic gets up to feed the birds (summonFeeders brings the group)
  G.bus.on('fed', (t, e) => {
    if (e.sign !== 'M7' || !onPeasStep()) return;
    const a = picnic().find((q) => q.busy) || picnic()[0];
    if (a) sayOver(a, 'Ooh, a FEED sign! Crumbs for the birdies!', 3.2);
  });
  G.bus.on('pickup', (t, e) => {
    if (e.item !== 'peas' || !onStep(G, 'den-ducks', 2)) return;
    const g = G.gus.position;
    const a = picnic().sort((p, q) => Math.hypot(p.x - g.x, p.z - g.z) - Math.hypot(q.x - g.x, q.z - g.z))[0];
    if (a) G.later(0.3, () => sayOver(a, 'Hey! HEY! The PEAS!', 2.6));
  });

  let lastRound = -99;
  G.bus.on('flip', (t, e) => { if (e.sign === 'M7') lastRound = G.state.time; });
  G.mods.push({
    update() {
      const st = G.state;
      table.visible = st.phase === 'afternoon';
      const tub = tubItem();
      // the tub is on the table while the step wants it (Afternoons only: out of hours it isn't lying about for free)
      if (onPeasStep() && !peasAround()) G.items.spawn('peas', PICNIC.x, PICNIC.z, { y: ground() + TABLE_Y, extra: { tub: true } });
      else if (tub && (st.phase !== 'afternoon' || !G.schemes.isOpen('den-ducks') || G.schemes.stepIndex('den-ducks') !== 1)) G.items.remove(tub);
      // M7 still live and everybody back at the table: another round for the birdies
      if (tub && onPeasStep() && G.signs.live('M7') && st.time - lastRound > AGAIN && picnic().length && picnic().every((a) => a.mode === 'home' && !a.busy)) {
        lastRound = st.time;
        const s = G.signs.byId.M7;
        G.humans.summonFeeders(s, 3, () => { G.food.addPile(s.x + Math.sin(s.yaw) * 1.1, s.z + Math.cos(s.yaw) * 1.1, 4, { sign: 'M7', kind: 'crumbs' }); });
        const a = picnic()[0];
        if (a) sayOver(a, 'Another round for the birdies!', 2.6);
      }
    },
  });

  E.registerScript('ducks.join', (ctx, done) => joinScene(G, 'ducks-join', {
    members: ['puddles', 'mrspuddles', 'bubbles', 'ensign'], kind: 'popup', sfx: 'duck-quack-mallard',
    extra: () => G.later(0.8, () => { const b = G.chars.find('bubbles'); if (b) { G.chars.animate(b, 'dive', 1.4); G.particles.splash(b.x, b.y, b.z, 14); } }),
    lines: [
      L('puddles', 'PEAS. Fresh from the Boathouse. Mallards, attention!'),
      L('bubbles', 'Watch this, Gus! A celebration dive! …Did you SEE that? Did you see it?'),
      L('mrspuddles', 'You\'ll do, dear. When something\'s under the water, call us.'),
      L('puddles', 'The Lake Mallards stand ready. Bubble rings, Gus: that\'s our department.', 'puddles-join'),
    ],
  }, done));
  mechaLine(G, 'puddles', 'ducks', 'A giant iron pigeon in the Ramble? Hmph. As long as it doesn\'t eat bread.');
  // Bubbles shows off on every Lake dive in Act 1
  G.bus.on('talent', (t, e) => { if (e.ally === 'ducks' && e.talent === 'dive' && ['ball-lake', 'sail-1'].includes(e.clue)) bubbleOver(G, 'puddles', ['Bubbles: Triple tuck! TEN!', 'Bubbles: Did you SEE that one?', 'Bubbles: Sticked the landing!'][G.state.time % 3 | 0], 3); });
}
