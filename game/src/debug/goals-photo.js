// Goal scripts (debug only) for photo mode (#9): Say Cheese, recorded with
//   node game/tools/sf-run.mjs record say-cheese        (design/solutions/say-cheese → photo-quest.json via --out)
// Built from layout and character data, never from positions read off the screen.
import './pilot-ssf.js';
import { CHARACTERS } from '../data/crews.js';
import { TOURIST, CAMERA_AT } from '../schemes/say-cheese.js';

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
      { pickItem: 'camera', timeout: 30 }, { waitFor: 'say-cheese.s1', timeout: 10 }, settle,
      // 2: Flicker loads the film
      { landNear: { x: f.x + 1.6, z: f.z - 1.2 }, alt: 9, r: 2.5, timeout: 150 }, { talk: 'flicker', timeout: 40 }, { waitFor: 'say-cheese.s2', timeout: 40 }, settle,
      // 3: photo mode (V), snap (Enter), leave (Esc)
      { press: 'photo', frames: 3 }, { waitFor: (G) => G.menus.is('photo'), timeout: 3 }, { wait: 0.6 },
      { press: 'uiOk', frames: 3 }, { waitFor: 'photo.flicker', timeout: 3 }, { wait: 1.0 },
      { press: 'uiBack', frames: 3 }, { waitFor: (G) => !G.menus.open, timeout: 3 },
      { waitFor: 'say-cheese', timeout: 10 }, settle,
    ];
  },
};
