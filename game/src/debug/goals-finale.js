// Goal script for the finale (debug only). Like every goal it only presses
// inputs: fly to the Workshop cave (the finale scheme's one step), then play
// the finale: steer and high-step over the cabs on Fifth, alternate Flap and
// Peck up the Empire State Building (sidestepping the cradles, answering each
// crew beat's prompt), SHOUT, and sit through the credits and the sting.
// Record with: node game/tools/sf-run.mjs record finale --fixture finale
import { PILOT_EXT } from './pilot-ext.js';
import { PLACES } from '../world/layout.js';
import { CRADLES } from '../finale/climb.js';

const FIN_EXT = (A, g, s, out) => {
  const G = A.G, F = G.finale;
  if (g.finaleReach) {
    // walk (sprinting) to the cave until the finale's step fires
    if (F.running) return true;
    if (G.gus.mode === 'fly') out.held.add('dive');
    A.stickToward(PLACES.workshop.x, PLACES.workshop.z, out, 1);
    out.held.add('sprint');
    return false;
  }
  if (!g.finalePlay) return undefined;
  s.f = (s.f || 0) + 1;
  if (!F.running) return !!G.state.flags.finale && s.f > 2;
  const tap = (a, every = 14) => { if (s.f % every < 2) out.held.add(a); };
  if (F.stage === 'stomp') {
    const S = F.parts.stomp, t = S.t;
    // show off the steering once, early on: a lane right, then back
    if (t > 1.0 && t < 1.25) out.stick.x = 1;
    if (t > 2.4 && t < 2.65) out.stick.x = -1;
    // then step over every cab in the lane (tap Flap a few metres before it)
    const next = S.cabs.filter((c) => c.state === 'idle' && S.z - c.z > 0 && Math.abs(c.x - S.x) < 2.6).sort((a, b) => b.z - a.z)[0];
    if (next && S.z - next.z < 7.5 && S.hopT <= 0.15) out.held.add('flap');
    return false;
  }
  if (F.stage === 'climb') {
    const C = F.parts.climb;
    if (C.beat) { if (C.beat.t > 1.0 && !C.beat.ok) tap(C.beat.id === 'gust' ? 'flap' : C.beat.id === 'chopper' ? 'coo' : 'peck', 30); return false; }
    // sidestep a cradle coming up in our column
    const cr = CRADLES.find((c) => c.y - 9 - C.h < 30 && c.y - 9 > C.h - 1 && Math.abs(C.x - c.x) < 10);
    if (cr) out.stick.x = C.x > cr.x ? -1 : 1;
    // left claw, right claw: one press every 13 updates, alternating
    const k = s.f % 26;
    if (k < 2) out.held.add('flap'); else if (k >= 13 && k < 15) out.held.add('peck');
    return false;
  }
  if (F.stage === 'shout') { if (F.parts.shout.t > 1.5 && F.parts.shout.pressedT == null) tap('flap', 20); return false; }
  return false;   // doors, biggify, credits, sting: just watch
};
PILOT_EXT.push(FIN_EXT);

export const GOALS_FINALE = {
  finale: () => [
    { finaleReach: true, timeout: 120 },
    { finalePlay: true, timeout: 900 },
  ],
};
