// Goal scripts (debug only) for photo mode (#9): Say Cheese, recorded with
//   node game/tools/sf-run.mjs record say-cheese        (design/solutions/say-cheese → photo-quest.json via --out)
// Built from layout and character data, never from positions read off the screen.
import './pilot-ssf.js';
import { CHARACTERS } from '../data/crews.js';
import { TOURIST, CAMERA_AT } from '../schemes/say-cheese.js';
import { BELL, COUNTER } from '../data/bagels.js';   // #44

const idle = (G) => !G.cutscene.running && !G.dialogue.open && !G.schemes.busy.size;
const settle = [{ waitFor: idle, timeout: 60 }, { wait: 0.5 }];

export const GOALS_PHOTO = {
  // main: photobomb the tourist from the ledge beside his balcony, take the camera off the ledge, give it to
  // Flicker, then open photo mode and snap Flicker
  'say-cheese': () => {
    const f = CHARACTERS.flicker.at;
    return [
      // 1: fly in and drop onto the ledge right beside his balcony, and hold still until he notices (the photobomb)
      { flyTo: { x: CAMERA_AT.x + 12, z: CAMERA_AT.z + 0.7 }, alt: 9, r: 4, timeout: 150 },
      { flyTo3: { x: CAMERA_AT.x - 0.1, y: CAMERA_AT.y, z: CAMERA_AT.z + 0.7 }, r: 4, timeout: 40 }, { waitFor: 'photo.distracted', timeout: 15 }, settle,
      // then Peck the old camera beside him on the ledge
      { peck: 'saycheese:camera', timeout: 30 }, { waitFor: 'say-cheese.s1', timeout: 10 }, settle,
      // 2: Flicker loads the film
      { landNear: { x: f.x + 1.6, z: f.z - 1.2 }, alt: 9, r: 2.5, timeout: 150 }, { talk: 'flicker', timeout: 40 }, { waitFor: 'say-cheese.s2', timeout: 40 }, settle,
      // 3: photo mode (V), snap (Enter), leave (Esc)
      { press: 'photo', frames: 3 }, { waitFor: (G) => G.menus.is('photo'), timeout: 3 }, { wait: 0.6 },
      { press: 'uiOk', frames: 3 }, { waitFor: 'photo.flicker', timeout: 3 }, { wait: 1.0 },
      { press: 'uiBack', frames: 3 }, { waitFor: (G) => !G.menus.open, timeout: 3 },
      { waitFor: 'say-cheese', timeout: 10 }, settle,
    ];
  },
  // #44 The Jumbo Order: the riddle; a wrong order (Poppy + Jalapeño), shown to Mama Mask (the rejection), given to Socket;
  // the right order (Sesame + Jalapeño), given to her (the payoff). From the jumbo-order fixture (Dusk, 10 crumbs).
  'jumbo-order': () => {
    const mm = CHARACTERS.mamamask.at, so = CHARACTERS.socket.at;
    const shop = { x: BELL.x - 0.4, z: COUNTER.z - 0.9 };
    const toShop = [{ landNear: shop, alt: 10, r: 1.5, timeout: 200 }, { peck: 'bagel:bell', timeout: 30 }, { waitFor: (G) => G.menus.is('bagels'), timeout: 8 }, { wait: 0.4 }];
    const order = (b, s) => [...toShop, { bagelOrder: [b, s], timeout: 20 }, { waitFor: (G) => !G.menus.open, timeout: 5 }, { wait: 2.4 }, { pickItem: `bagel-${b}-${s}`, timeout: 30 }, { waitFor: (G) => G.state.carried?.id === `bagel-${b}-${s}`, timeout: 5 }, settle];
    const toMama = { landNear: { x: mm.x + 1.2, z: mm.z - 1.0 }, alt: 10, r: 2, timeout: 200 };
    // the wrong-guess detour costs 4 crumbs: a recovery (the mistake sweep) that's short skips it, so the right order still
    // has a crumb or the phase's free order (the recording, with 10 crumbs, takes it)
    const G = typeof window !== 'undefined' ? window.__sfG : null, rich = !G || G.state.crumbs >= 8;
    return [
      // 1: the riddle
      toMama, { talk: 'mamamask', timeout: 40 }, { waitFor: 'jumbo-order.s1', timeout: 60 }, settle,
      // a wrong guess: Poppy + Jalapeño (the seeds are BLACK), shown to her, then given to Socket
      ...(rich ? [...order('poppy', 'jalapeno'),
        toMama, { talk: 'mamamask', timeout: 40 }, settle,
        { landNear: { x: so.x + 1.0, z: so.z - 1.0 }, alt: 6, r: 2, timeout: 120 }, { talk: 'socket', timeout: 40 }, { waitFor: (G2) => !G2.state.carried, timeout: 10 }, settle] : []),
      // 2: the right one
      ...order('sesame', 'jalapeno'), { waitFor: 'jumbo-order.s2', timeout: 10 },
      // 3: to Mama Mask
      toMama, { talk: 'mamamask', timeout: 40 }, { waitFor: 'jumbo-order', timeout: 60 }, settle,
    ];
  },
};
