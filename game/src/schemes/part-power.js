// part-power, "The Wedding" (Feuds & Truces, with Dove from the Sign War's
// Swells): the scheme's scripts are the showpiece's own, in
// src/setpieces/wedding.js (wedding.intro, wedding.release, setpiece.wedding;
// Fixes-2: the battery now comes up inside the stampede, so the scheme ends on
// the photo). This file installs it and Dove's lines.
import { installWedding } from '../setpieces/wedding.js';
import { L, onStep } from './_sf-common.js';

export async function installPartPower(G) {
  const mod = await installWedding(G);
  G.bus.on('talk', (t, e) => {
    if (e.who !== 'dove') return;
    if (onStep(G, 'part-power', 2)) G.later(0, () => { if (!G.dialogue.open) G.say([L('dove', 'An empty basket, darling, and a crowd that wants a dove. I have been in rehearsal for this my ENTIRE life.')]); });
    else if (G.state.flags['wedding.cleared'] && !G.state.flags['said.dove.after']) { G.state.flags['said.dove.after'] = true; G.later(0, () => { if (!G.dialogue.open) G.say([L('dove', 'Come and see me on Bow Bridge some Afternoon, darling. Two doves. Stunning. Nobody will check.')]); }); }
  });
  return mod;
}
