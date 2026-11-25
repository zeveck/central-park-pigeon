// Milestone 3b, builder 2: installs the Spikes and Feuds & Truces scheme
// scripts (one file per scheme) and the two showpieces (src/setpieces/: the
// Rink Job, the Wedding). Called once from main.js after the other
// installers. Everything here is one mod in G.mods (update, restore, onNap,
// setPhase, music) that hands each update to the scheme files that need one.
//
// Small shared helpers it adds to G (all on the game clock):
//   G.sfTween(secs, step(k), done)   a tween (k 0→1)
//   G.sfStamp(text)                  a big stamp in the middle of the screen ("STRIKE!")
//   G.sfFreeze(url, caption, secs)   a big freeze-frame polaroid (the Wedding's shot of the century)
import { TALK } from '../data/dialogue.js';
import { TAKERS } from '../data/crews.js';
import { mergeTalk } from '../data/dialogue-sf.js';
import { installDenSongbirds } from './den-songbirds.js';
import { installDenRacers } from './den-racers.js';
import { installDenHorses } from './den-horses.js';
import { installPartTalons } from './part-talons.js';
import { installRinkJob } from '../setpieces/rinkjob.js';
import { installDenTurtles } from './den-turtles.js';
import { installDenGeese } from './den-geese.js';
import { installTruceDogsSquirrels } from './truce-dogs-squirrels.js';
import { installPartLegs } from './part-legs.js';
import { installPartPower } from './part-power.js';
import { installDenRhoda } from './den-rhoda.js';
import { installDenMeerMob } from './den-meermob.js';

const CSS = `
#sf-flash { position: fixed; inset: 0; z-index: 27; background: #fff; opacity: 0; pointer-events: none; transition: opacity .12s; }
#sf-flash.on { opacity: .75; } #sf-flash.on.big { opacity: 1; }
#sf-stamp { position: fixed; left: 50%; top: 34%; z-index: 26; transform: translate(-50%, -50%) rotate(-6deg) scale(.6); opacity: 0; pointer-events: none;
  font: 700 clamp(48px, 9vw, 112px) 'Fredoka', sans-serif; color: #ff7a2a; -webkit-text-stroke: 3px #fff8ea; text-shadow: 0 6px 0 #6b3a1a, 0 12px 26px rgba(0,0,0,.35); transition: opacity .18s, transform .25s cubic-bezier(.2,1.6,.4,1); white-space: nowrap; }
#sf-stamp.on { opacity: 1; transform: translate(-50%, -50%) rotate(-6deg) scale(1); }
#sf-freeze { position: fixed; left: 50%; top: 46%; z-index: 26; transform: translate(-50%, -50%) rotate(-2deg); opacity: 0; pointer-events: none; background: #fff; padding: 14px 14px 18px; border-radius: 4px;
  box-shadow: 0 16px 40px rgba(0,0,0,.45); display: flex; flex-direction: column; align-items: center; gap: 8px; transition: opacity .3s, transform .9s cubic-bezier(.5,0,.4,1); }
#sf-freeze.on { opacity: 1; }
#sf-freeze.away { opacity: 0; transform: translate(10vw, -40vh) rotate(8deg) scale(.25); }
#sf-freeze img { width: min(56vw, 560px); aspect-ratio: 16 / 9; object-fit: cover; background: #d8cfc0; }
#sf-freeze b { font: 700 28px 'Fredoka', sans-serif; color: #e8642a; }
`;

export async function installSpikesFeuds(G) {
  mergeTalk(TALK);
  window.__sfG = G;
   // debug: the record/replay tool resets cutscenes and dialogue between jobs (tools/sf-run.mjs)
  // Mama Mask takes the union slice too (the same deal as Rigby's): #44 moved her entry into data/crews.js TAKERS
  // the overlays
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  for (const id of ['sf-flash', 'sf-stamp', 'sf-freeze']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); }
  // tweens on the game clock
  const tweens = [];
  G.sfTween = (secs, step, done = null) => { tweens.push({ t: 0, secs, step, done }); step(0); };
  G.sfStamp = (text, secs = 1.8) => { const el = document.getElementById('sf-stamp'); el.textContent = text; el.className = 'on'; G.later(secs, () => { el.className = ''; }); };
  G.sfFreeze = (url, caption, secs = 3.4) => {
    const el = document.getElementById('sf-freeze');
    el.innerHTML = `${url ? `<img alt="" src="${url}">` : ''}<b>${caption}</b>`;
    el.className = 'on';
    G.later(secs, () => { el.className = 'on away'; });
    G.later(secs + 1.0, () => { el.className = ''; });
  };
  const parts = [];
  for (const f of [installDenSongbirds, installDenRacers, installDenHorses, installPartTalons, installRinkJob, installDenTurtles, installDenGeese, installTruceDogsSquirrels, installPartLegs, installPartPower, installDenRhoda, installDenMeerMob]) {
    const m = await f(G);
    if (m) parts.push(m);
  }
  const mod = {
    name: 'spikes-feuds',
    update(dt) {
      for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.secs); w.step(k); if (k >= 1) { tweens.splice(i, 1); w.done?.(); } }
      for (const p of parts) p.update?.(dt);
    },
    abandon() {   // Fixes-3 (B2): a load or quitting to the title drops the running tweens (a half-done fold, a pallet)
      tweens.length = 0;
      for (const p of parts) p.abandon?.();
    },
    restore() {
      tweens.length = 0;
      // after a load (a fixture, a replay) everything starts identical: who-said-what counters and nudge timers restart
      if (G.chars) G.chars.talkIdx = {}; if (G.allies) G.allies.wrongIdx = {}; if (G.schemes) { G.schemes.nudged = {}; G.schemes.stepTime = {}; }
      // a load drops pending timers: no overlay (or polaroid) may stay up from before it
      for (const id of ['sf-flash', 'sf-stamp', 'sf-freeze', 'polaroid']) { const el = document.getElementById(id); if (el) el.className = ''; }
      for (const p of parts) p.restore?.();
    },
    setPhase(ph) { for (const p of parts) p.setPhase?.(ph); },
    onNap(ph) { const notes = []; for (const p of parts) notes.push(...(p.onNap?.(ph) || [])); return notes; },
    music() { for (const p of parts) { const m = p.music?.(); if (m) return m; } return null; },
    debug() { return Object.fromEntries(parts.filter((p) => p.debug).map((p, i) => [i, p.debug()])); },
  };
  const THREE = await import('three');
  mod.group = new THREE.Group(); mod.group.name = 'spikes-feuds';
  for (const p of parts) if (p.group) mod.group.add(p.group);
  G.world.add(mod.group);
  G.sfMod = mod;
  G.mods.push(mod);
}
