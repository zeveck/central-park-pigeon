// Milestone 3b, builder 1: installs the Sign War, Slice Run and Lost & Found
// scheme scripts (one file per scheme). Called once from main.js after the
// Prologue's installer. (den-biscuit and den-strix use the 3a fight/stealth
// scripts; sab-north and part-eyes are here; fun pass: gear-sunglasses' photobomb.)
import { installDenDucks } from './den-ducks.js';
import { installDenSquirrels } from './den-squirrels.js';
import { installDenRats } from './den-rats.js';
import { installDenCats } from './den-cats.js';
import { installDenCrows } from './den-crows.js';
import { installGearPen } from './gear-pen.js';
import { installGearHeadlamp } from './gear-headlamp.js';
import { installPartWings } from './part-wings.js';
import { installDenRaccoons } from './den-raccoons.js';
import { installSabMiddle } from './sab-middle.js';
import { installSabNorth } from './sab-north.js';
import { installPartEyes } from './part-eyes.js';
import { installPartBody } from './part-body.js';
import { installDenChoir } from './den-choir.js';
import { installPartBeak } from './part-beak.js';
import { installTruceCatsRats } from './truce-cats-rats.js';
import { installGearSunglasses } from './gear-sunglasses.js';
import { installFunPolish } from './fun-polish.js';   // fun pass (P10)   // fun pass (P6): the photobomb by framing

export function installSignsSlicesFound(G) {
  for (const f of [installDenDucks, installDenSquirrels, installDenRats, installDenCats, installDenCrows, installGearPen, installGearHeadlamp, installPartWings,
    installDenRaccoons, installSabMiddle, installSabNorth, installPartEyes, installPartBody, installDenChoir, installPartBeak, installTruceCatsRats, installGearSunglasses, installFunPolish]) f(G);
}
