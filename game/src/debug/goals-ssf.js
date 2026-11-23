// Goal scripts (debug only) for the 3b Sign War, Slice Run and Lost & Found
// solutions. Each returns the goal list for one scheme (or one alternative),
// built from layout data, never from positions read off the screen. Run with
//   const m = await import('./src/debug/goals-ssf.js'); __game.autopilot(m.SSF['den-ducks'](__G))
// The recorded raw inputs are design/solutions/<id>.json (alternatives <id>.alt.json).
import './pilot-ssf.js';
import { ask } from './pilot-3a.js';
import { SIGNS, CLUES, PLACES, SLICE, GRATES, NESTS } from '../world/layout.js';
import { CHARACTERS } from '../data/crews.js';

/** Fly to a Nest, open it, Nap until `phase`. */
function napAt(nestId, phase) { return [{ napNest: nestId, phase, timeout: 150 }, { wait: 0.5 }]; }

const sign = (id) => SIGNS.find((s) => s.id === id);
const front = (s, d = 1.2) => ({ x: s.x + Math.sin(s.yaw) * d, z: s.z + Math.cos(s.yaw) * d });
const clue = (id) => CLUES.find((c) => c.id === id);

/** Dry ground next to a character's home (for characters sitting on water). */
function besideChar(G, id, want = 1.0) {
  const c = G.chars.find(id) || CHARACTERS[id].at;
  const x0 = c.home?.x ?? c.x, z0 = c.home?.z ?? c.z;
  for (let r = want; r < 25; r += 0.25) for (let a = 0; a < 6.28; a += 0.2) {
    const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (!G.collision.waterAt(x, z)) return { x, z };
  }
  return { x: x0, z: z0 };
}
/** Dry ground near a point (a shore spot for a dive). */
function dryNear(G, x0, z0, want = 0.5) {
  for (let r = want; r < 30; r += 0.25) for (let a = 0; a < 6.28; a += 0.2) { const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (!G.collision.waterAt(x, z)) return { x, z }; }
  return { x: x0, z: z0 };
}
const goTalk = (G, id, alt = 7) => { const b = besideChar(G, id); return [{ landNear: b, alt, r: 5, timeout: 120 }, { talk: id, timeout: 40 }]; };
const flipSign = (id, alt = 7) => { const s = sign(id); return [{ landNear: front(s, 2.2), alt, r: 2.5 }, { walkTo: front(s, 0.9), r: 0.8, timeout: 20 }, { peck: 'sign:' + id, timeout: 20 }]; };
const idle = (G) => !G.cutscene.running && !G.dialogue.open && !G.schemes.busy.size;
const settle = [{ waitFor: idle, timeout: 60 }, { wait: 0.5 }];

const grate = (id) => GRATES.find((g) => g.id === id);
/** Walk onto a grate, Peck it, ride to another (the rats' fast travel). */
const rideGrate = (from, to) => { const a = grate(from); return [{ landNear: { x: a.x + 1.5, z: a.z }, alt: 6, r: 2 }, { walkTo: { x: a.x + 0.4, z: a.z }, r: 0.3 }, { peck: 'grate:' + from }, { waitFor: (G) => G.menus.is('grates'), timeout: 5 }, { menuPick: 'go', id: to, timeout: 10 }, { waitFor: (G) => !G.menus.open && Math.hypot(G.gus.position.x - grate(to).x, G.gus.position.z - grate(to).z) < 4, timeout: 20 }, { wait: 0.4 }]; };
// fun pass (P4): the anchovy slice is on the bodega sill by Pickles: land south of him, peck him awake, pick it up where it falls
const anchovy = () => [{ landNear: { x: -125.3, z: 245.6 }, alt: 7, r: 1.5 }, { talk: 'pickles', timeout: 30 }, { waitFor: (G) => G.items.world.some((w) => w.id === 'slice-anchovy' && !w.sill), timeout: 15 }, settle, { pickItem: 'slice-anchovy', near: { x: -128.6, z: 248 }, timeout: 20 }, { waitFor: 'den-cats.s2', timeout: 10 }, settle];

export const SSF = {
  // part-eyes: automatic after the 2nd sabotage (Rigby hands over two hubcaps; the Workshop bolts them on)
  'part-eyes': (G) => [{ waitFor: 'part-eyes', timeout: 60 }, settle, { waitFor: (G) => !G.workshop?.queue?.length && !G.cutscene.running, timeout: 30 }, settle],
  'den-ducks': (G) => [
    goTalk(G, 'puddles'), { waitFor: 'den-ducks.s1', timeout: 30 }, settle,
    napAt('nest-mall', 'afternoon'),
    // fun pass (P3): flip M7 up the path; the whole picnic walks over to feed the birds; grab the tub off their table
    flipSign('M7'),
    { waitFor: (G) => { const t = G.items.world.find((w) => w.id === 'peas' && w.tub); return t && !G.humans.agents.some((a) => a.out && a.spec.group === 'boathouse' && Math.hypot(a.x - t.x, a.z - t.z) < 3.6); }, timeout: 40 },
    { pickItem: 'peas', timeout: 30 }, { waitFor: 'den-ducks.s2', timeout: 10 }, settle,
    goTalk(G, 'puddles'), { waitFor: 'den-ducks', timeout: 60 }, settle,
  ],
  'den-squirrels': (G) => [
    goTalk(G, 'hazel'), { waitFor: 'den-squirrels.s1', timeout: 30 }, settle,
    // up above 10 m over the meadow so the plumes show
    { climbTo: 13, timeout: 30 },
    ...[1, 2, 3].flatMap((i) => { const c = clue('hazel-cache-' + i); return [{ landNear: { x: c.x + 1.2, z: c.z }, alt: 12, r: 2.5 }, { peck: 'clue:hazel-cache-' + i }, { wait: 2.6 }]; }),
    { waitFor: 'den-squirrels.s2', timeout: 20 }, settle,
    goTalk(G, 'hazel'), { waitFor: 'den-squirrels', timeout: 60 }, settle,
  ],
  'den-rats': (G) => {
    const j = SLICE.joints[0];
    return [
      goTalk(G, 'sue'), { waitFor: 'den-rats.s1', timeout: 30 }, settle,
      { landNear: { x: j.bench.x + 2, z: j.bench.z + 2 }, alt: 6, r: 2 }, { walkTo: { x: j.bench.x + 1.2, z: j.bench.z + 1 }, r: 0.4 }, { faceTo: j.bench },
      { holdCoo: 1.2 }, { waitFor: (G) => G.items.world.some((w) => w.id === 'slice'), timeout: 15 },
      { pickItem: 'slice', near: j.bench, timeout: 20 }, { waitFor: 'den-rats.s2', timeout: 10 }, settle,
      goTalk(G, 'sue', 5), { waitFor: 'den-rats', timeout: 60 }, settle,
    ];
  },
  // den-cats, main route: the rats relay the hot anchovy 72nd W → 96th E, then 300 m low to Queenie
  'den-cats': (G) => [
    goTalk(G, 'queenie'), { waitFor: 'den-cats.s1', timeout: 30 }, settle,
    anchovy(),
    rideGrate('grate-72w', 'grate-96e'),
    goTalk(G, 'queenie', 8), { waitFor: 'den-cats', timeout: 60 }, settle,
  ],
  // den-cats, alternative: Dusk, warm it on the halal griddle at 110th & Fifth, then 120 m to Queenie
  'den-cats.alt': (G) => {
    const gr = SLICE.griddle.dusk;
    return [
      goTalk(G, 'queenie'), { waitFor: 'den-cats.s1', timeout: 30 }, settle,
      napAt('nest-north', 'dusk'),
      anchovy(),
      { landNear: { x: gr.x - 1.6, z: gr.z }, alt: 10, r: 2 }, { walkTo: { x: gr.x - 0.9, z: gr.z }, r: 0.25 }, { faceTo: { x: gr.x, z: gr.z } },
      { press: 'drop', frames: 3 },
      { waitFor: (G) => G.items.world.some((w) => w.id === 'slice-anchovy' && !w.sill && w.born != null && G.state.time - w.born < 2), timeout: 15 },
      { pickItem: 'slice-anchovy', timeout: 10 },
      goTalk(G, 'queenie', 8), { waitFor: 'den-cats', timeout: 60 }, settle,
    ];
  },
  'den-crows': (G) => {
    const ledge = clue('shiny-cpw72'), plume = clue('shiny-ramble-plume'), lake = clue('shiny-lake');
    const toVesper = [goTalk(G, 'vesper', 8), settle];
    return [
      goTalk(G, 'vesper'), { waitFor: 'den-crows.s1', timeout: 30 }, settle,
      // A: the CPW ledge (a glint on a roof edge): fly up and peck it
      { climbTo: 12, timeout: 20 }, { landNear: { x: ledge.x, z: ledge.z }, alt: G.collision.surface(ledge.x, ledge.z, 400).y + 4, r: 2, timeout: 90 },
      { pickItem: 'shiny', timeout: 20 }, toVesper,
      // B: the plume by the Ramble: squirrels dig
      ask('squirrels', { x: plume.x + 1.5, z: plume.z }, { clue: 'shiny-ramble-plume' }), { pickItem: 'shiny', timeout: 20 }, toVesper,
      // C: Lake bubbles: ducks (Bubbles) dive
      ask('ducks', dryNear(G, lake.x, lake.z), { clue: 'shiny-lake' }), { pickItem: 'shiny', timeout: 20 }, toVesper,
      { waitFor: 'den-crows', timeout: 90 }, settle,
    ];
  },
  'gear-sunglasses': (G) => {
    const f = clue('shiny-flagpole');
    return [
      { landNear: { x: f.x, z: f.z - 18 }, alt: 8, r: 6, timeout: 150 }, { climbTo: G.collision.surface(f.x, f.z, 400).y + 4, timeout: 60 }, { landNear: { x: f.x, z: f.z - 3 }, alt: G.collision.surface(f.x, f.z, 400).y + 3, r: 3, timeout: 60 }, { pickItem: 'shiny', timeout: 20 }, { waitFor: 'gear-sunglasses.s1', timeout: 10 }, settle,
      // fun pass (P6): land on the fountain rim right behind him (his phone's view) and hold still
      { landNear: { x: 93.55, z: -36.5 }, alt: 2.5, r: 0.5, timeout: 90 }, { walkTo: { x: 93.6, z: -36.45 }, r: 0.4, timeout: 20 }, { waitFor: 'selfie.attention', timeout: 12 }, settle,
      { nearHuman: 'selfie', d: 2.5, timeout: 30 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' },
      { waitFor: 'gear-sunglasses', timeout: 30 }, settle,
    ];
  },
  // gear-pen, main: the cats knock a wine glass off the patio table, the waiter rushes over; then the artist
  'gear-pen': (G) => [
    napAt('nest-mall', 'afternoon'),
    // fun pass (P8): the cats knock the wine glass off the table's edge; the waiter rushes over with a dustpan
    ask('cats', { x: -98.6, z: 150.6 }, { clue: 'tavern-glass' }), { waitFor: 'waiter.moved', timeout: 15 },
    { waitFor: (G) => G.items.world.some((w) => w.id === 'cufflink'), timeout: 10 }, { pickItem: 'cufflink', timeout: 30 }, { waitFor: 'gear-pen.s1', timeout: 10 }, settle,
    { landNear: { x: 13, z: 225 }, alt: 8, r: 3 }, { nearHuman: 'artist', d: 2.5, timeout: 30 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' },
    { waitFor: 'gear-pen', timeout: 40 }, settle,
  ],
  // gear-pen, alternative: the songbirds Mimic the patio phone and the waiter hurries inside
  'gear-pen.alt': (G) => [
    napAt('nest-mall', 'afternoon'),
    { landNear: { x: -97, z: 148.5 }, alt: 7, r: 2 }, { nearHuman: 'waiter', d: 3, timeout: 30 }, { call: 'songbirds' }, { wait: 3.6 }, { ask: 'songbirds' }, { waitFor: 'waiter.moved', timeout: 15 },
    { waitFor: (G) => G.items.world.some((w) => w.id === 'cufflink'), timeout: 10 }, { pickItem: 'cufflink', timeout: 30 }, { waitFor: 'gear-pen.s1', timeout: 10 }, settle,
    { landNear: { x: 13, z: 225 }, alt: 8, r: 3 }, { nearHuman: 'artist', d: 2.5, timeout: 30 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' },
    { waitFor: 'gear-pen', timeout: 40 }, settle,
  ],
  // gear-headlamp, main: the rats fetch the key up the 86th W grate; at Morning wait at the north gatehouse fountain where the jogger stops each lap
  'gear-headlamp': (G) => { const k = clue('key-grate'); return [
    ask('rats', { x: k.x + 1.6, z: k.z }, { clue: 'key-grate' }), { pickItem: 'key', timeout: 20 }, { waitFor: 'gear-headlamp.s1', timeout: 10 }, settle,
    napAt('nest-reservoir', 'morning'),
    { landNear: { x: -4, z: 757 }, alt: 8, r: 2 }, { walkTo: { x: -3, z: 757.6 }, r: 0.5 }, { call: 'crows' }, { wait: 3.6 },
    { humanStopped: 'jogger', r: 6, timeout: 200 }, { ask: 'crows' },
    { waitFor: 'gear-headlamp', timeout: 40 }, settle,
  ]; },
  // gear-headlamp, alternative: the songbirds Mimic the jogger's phone on the track
  'gear-headlamp.alt': (G) => { const k = clue('key-grate'); return [
    ask('rats', { x: k.x + 1.6, z: k.z }, { clue: 'key-grate' }), { pickItem: 'key', timeout: 20 }, { waitFor: 'gear-headlamp.s1', timeout: 10 }, settle,
    napAt('nest-reservoir', 'morning'),
    { landNear: { x: 0, z: 565 }, alt: 8, r: 3 }, { nearHuman: 'jogger', d: 6, timeout: 60 }, { call: 'songbirds' }, { call: 'crows' }, { wait: 3.6 },
    { nearHuman: 'jogger', d: 8, timeout: 60 }, { ask: 'songbirds' }, { waitFor: 'jogger.stopped', timeout: 15 }, { nearHuman: 'jogger', d: 3, timeout: 20 }, { ask: 'crows' },
    { waitFor: 'gear-headlamp', timeout: 40 }, settle,
  ]; },
  // part-wings, main: Bubbles raises sail 1; trade a spare shiny (the stall's, Afternoon) for the remote; tow boat 2
  'part-wings': (G) => wings(G, false),
  // part-wings, alternative: the songbirds Mimic the ice-cream jingle; every kid runs, the remote's left on the bench
  'part-wings.alt': (G) => wings(G, true),
  // den-raccoons, main: a hot slice to the Delacorte stage-door guard at Dusk, then the wrench off the prop table
  'den-raccoons': (G) => {
    const j = SLICE.joints[1], w = clue('wrench');
    return [
      napAt('nest-north', 'dusk'),
      goTalk(G, 'rigby'), { waitFor: 'den-raccoons.s1', timeout: 30 }, settle,
      { landNear: { x: j.bench.x + 2, z: j.bench.z }, alt: 12, r: 2 }, { walkTo: { x: j.bench.x + 1.3, z: j.bench.z }, r: 0.4 }, { faceTo: j.bench }, { holdCoo: 1.2 },
      { waitFor: (G) => G.items.world.some((q) => q.id.startsWith('slice') && Math.hypot(q.x - j.bench.x, q.z - j.bench.z) < 4), timeout: 15 },
      { pickItem: 'slice-anchovy', near: j.bench, timeout: 20 },
      { landNear: { x: -44, z: 429 }, alt: 10, r: 2.5 }, { nearHuman: 'guard', d: 1.6, timeout: 30 }, { peck: 'taker:guard' }, { waitFor: 'delacorte.backstage', timeout: 10 }, settle,   // batch-3: the guard stands 0.75 m out of the stage-door wall now (he was inside it); 1.6 m is within his Peck reach
      { pickItem: 'wrench', timeout: 40 }, { waitFor: 'den-raccoons.s2', timeout: 10 }, settle,
      goTalk(G, 'rigby', 12), { waitFor: 'den-raccoons', timeout: 60 }, settle,
    ];
  },
  // den-raccoons, alternative: Night Eyes shows the stagehand's earring (Night); the crows trade it at Dusk
  'den-raccoons.alt': (G) => {
    const e = clue('earring');
    return [
      napAt('nest-north', 'dusk'),
      goTalk(G, 'rigby'), { waitFor: 'den-raccoons.s1', timeout: 30 }, settle,
      napAt('nest-ramble', 'night'),
      { landNear: { x: -37, z: 416 }, alt: 6, r: 1.0, timeout: 120 },   // playtest: the stock flyTo + walk got stuck on the way in once the Ramble nest's tree was gone
      ask('strix', null, { clue: 'earring-eyes' }),   // the Night Eyes clue reaches 30 m: Ask from where Gus lands
      { waitFor: (G) => G.items.world.some((q) => q.id === 'earring'), timeout: 10 }, { pickItem: 'earring', timeout: 30 },
      napAt('nest-ramble', 'dusk'),
      { landNear: { x: -40, z: 436 }, alt: 8, r: 2.5 }, { nearHuman: 'stagehand', d: 2.5, timeout: 30 }, { call: 'crows' }, { wait: 3.6 }, { nearHuman: 'stagehand', d: 2.5, timeout: 30 }, { ask: 'crows' },
      { waitFor: 'den-raccoons.s2', timeout: 30 }, settle,
      goTalk(G, 'rigby', 12), { waitFor: 'den-raccoons', timeout: 60 }, settle,
    ];
  },
  'sab-north': (G) => [
    napAt('nest-north', 'night'),
    { landNear: { x: 55.5, z: 862 }, alt: 8, r: 2 }, { walkTo: { x: 56.2, z: 862 }, r: 0.4 },
    { holdCoo: 1.2 }, { waitFor: 'shed103.open', timeout: 10 }, settle,
    { walkTo: { x: 58.6, z: 862 }, r: 0.4 }, { call: 'raccoons' }, { wait: 3.6 }, { ask: 'raccoons' }, { waitEvent: 'talent', match: { clue: 'cart-north' }, timeout: 20 },
    { waitFor: 'sab-north', timeout: 30 }, settle,
  ],
  'sab-middle': (G) => {
    const k = clue('lot-key');
    return [
      napAt('nest-mall', 'night'),
      ask('cats', { x: 43.4, z: 309.6 }, { clue: 'lot-key' }),
      { pickItem: 'gate-key', timeout: 20 }, { walkTo: { x: 43.2, z: 312 }, r: 0.5 }, { peck: 'door:boathouse-gate' }, { waitFor: 'boathouse.gateOpen', timeout: 10 }, settle,
      { walkTo: { x: 45.5, z: 314 }, r: 0.5 }, { call: 'raccoons' }, { wait: 3.6 }, { ask: 'raccoons' }, { waitEvent: 'talent', match: { clue: 'cart-middle' }, timeout: 20 },
      { waitFor: 'sab-middle', timeout: 30 }, settle,
    ];
  },

  // part-body, main: M4 (peck) and M5 (pen) live at once, Afternoon; Dusk: raccoons rig while Gus keeps Vinnie busy; drive it home
  'part-body': (G) => body(G, false),
  // part-body, alternative: a hot slice on Vinnie's counter while customers queue
  'part-body.alt': (G) => body(G, true),
  'den-choir': (G) => [
    napAt('nest-mall', 'afternoon'),
    { landNear: { x: 6.6, z: 276 }, alt: 8, r: 2.5 }, { talk: 'vibrato', timeout: 40 }, { waitFor: 'den-choir.s1', timeout: 30 }, settle,
    // (signs already permanent, like the two Mall signs from Vinnie's cart, need nothing)
    ...['M6', 'M5', 'M4', 'M3'].filter((id) => !G.signs.live(id)).flatMap((id) => [...flipSign(id, 9), eatPile(id)]),   // fun pass (P11): the four on the crowd's way in
    { waitFor: 'den-choir.s2', timeout: 30 }, settle,
    { landNear: { x: 6.6, z: 272 }, alt: 8, r: 2.5 }, { walkTo: { x: 6.6, z: 272 }, r: 1.0 }, { coo: { hold: false } },
    { waitFor: 'den-choir', timeout: 90 }, settle,
  ],
  // part-beak, main (no horses): rats fetch the sticker, crows trade it; Dusk, raccoons Rig the latch; Morning, Biscuit fetches the cone home
  'part-beak': (G) => beak(G, false),
  // part-beak, alternative: the horses Kick the gate and Big Ben pulls the cone home ("Hup.")
  'part-beak.alt': (G) => beak(G, true),
  // truce-cats-rats, main: cats Knock a whole box off the CPW & 72nd pickup shelf; grates to 96th E; low to the 110th kerb
  'truce-cats-rats': (G) => catsrats(G, 'shelf'),
  // alternatives: the delivery cyclist on East Drive at Afternoon (songbirds Mimic his phone / geese Bully him)
  'truce-cats-rats.alt': (G) => catsrats(G, 'songbirds'),
  'truce-cats-rats.alt2': (G) => catsrats(G, 'geese'),

  'den-biscuit': (G) => { const b = clue('ball-lake'); return [
    goTalk(G, 'biscuit'), { waitFor: 'den-biscuit.s1', timeout: 30 }, settle,
    ask('ducks', dryNear(G, b.x, b.z), { clue: 'ball-lake' }), { pickItem: 'ball', timeout: 20 }, { waitFor: 'den-biscuit.s2', timeout: 10 }, settle,
    { fight: 'biscuit', timeout: 240 }, { waitFor: 'den-biscuit', timeout: 60 }, settle,
  ]; },
  'den-strix': (G) => [
    { landNear: { x: -12.6, z: 360.4 }, alt: 8, r: 2 }, { walkTo: { x: -12.6, z: 361 }, r: 0.4 }, { peck: 'stall-spectacles' }, { waitFor: 'den-strix.s1', timeout: 10 }, settle,
    napAt('nest-ramble', 'night'),
    { landNear: { x: -29.4, z: 328 }, alt: 4, r: 2 }, { walkTo: { x: -29.4, z: 330.6 }, r: 0.5 },
    { stealthCross: true, timeout: 400 }, { waitFor: 'den-strix', timeout: 60 }, settle,
  ],
};

function wings(G, jingle) {
  const s1 = clue('sail-1');
  const W = PLACES.workshop;
  const shore = { x: 63.2, z: 301 };
  return [
    ask('ducks', dryNear(G, s1.x, s1.z), { clue: 'sail-1' }), { pickItem: 'sail', timeout: 20 },
    { landNear: { x: W.x + 1, z: W.z - 2 }, alt: 1.2, r: 2.5, timeout: 120 }, { walkTo: { x: W.x, z: W.z - 3 }, r: 1.5, timeout: 60 }, { waitFor: 'part-wings.s1', timeout: 20 }, settle,
    napAt('nest-mall', 'afternoon'),
    // crumbs for the stall and Vesper's fee: the Afternoon picnickers at the Boathouse and Conservatory Water
    ...flipSign('M7', 8), eatPile('M7'), ...flipSign('M8', 8), eatPile('M8'),
    ...(jingle
      ? [{ landNear: { x: 64, z: 298 }, alt: 6, r: 2 }, { nearHuman: 'rckid', d: 4, timeout: 20 }, { call: 'songbirds' }, { wait: 3.6 }, { ask: 'songbirds' }, { waitFor: 'remote.left', timeout: 15 }, { wait: 1.2 }, { pickItem: 'remote', timeout: 30 }]
      : [{ landNear: { x: -12.6, z: 360.4 }, alt: 8, r: 2 }, { walkTo: { x: -12.6, z: 361 }, r: 0.4 }, { peck: 'stall-shiny' }, { waitFor: (G) => G.state.carried?.id === 'shiny', timeout: 10 },
         { landNear: { x: 64, z: 298 }, alt: 8, r: 2 }, { nearHuman: 'rckid', d: 2.5, timeout: 20 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' }, { waitFor: 'trade.remote', timeout: 20 }]),
    { waitFor: 'part-wings.s2', timeout: 20 }, settle,
    { landNear: { x: shore.x - 1, z: shore.z }, alt: 6, r: 2 }, { enter: 'rc-boat' },
    { drivePath: [{ x: 74, z: 312 }, { x: 77, z: 317.8 }], r: 1.0, speed: 2.5 }, { waitFor: (G) => G.vehicles.tow?.hooked || G.state.flags['wings.sail2'], timeout: 20 },
    { drivePath: [{ x: 72, z: 308 }, { x: 67.6, z: 302.5 }], r: 1.2, speed: 2.5 }, { waitFor: 'wings.sail2', timeout: 30 }, { exit: true },
    { pickItem: 'sail', timeout: 30 },
    { landNear: { x: W.x + 1, z: W.z - 2 }, alt: 1.2, r: 2.5, timeout: 120 }, { walkTo: { x: W.x, z: W.z - 3 }, r: 1.5, timeout: 60 }, { waitFor: 'part-wings', timeout: 30 }, settle,
  ];
}

const eatPile = (signId) => ({ eatPile: signId, timeout: 25 });

function body(G, slice) {
  const v = { x: 8.7, z: 206 }, W = PLACES.workshop;
  const j = SLICE.joints[0];
  return [
    napAt('nest-mall', 'afternoon'),
    ...(slice
      ? [ask('cats', { x: -146.5, z: -19 }, { clue: 'counter-slice-columbus' }), { landNear: { x: -146.5, z: -18.5 }, alt: 2, r: 1.5, timeout: 30 }, { pickItem: 'slice', timeout: 30 }, { landNear: { x: v.x + 2.5, z: v.z }, alt: 10, r: 2 }, { nearHuman: 'vinnie', d: 1.2, timeout: 20 }, { peck: 'taker:vinnie' }]
      : [...flipSign('M4', 8), ...flipSign('M5', 8), { landNear: { x: v.x + 3, z: v.z }, alt: 6, r: 3 }]),
    { waitFor: 'vinnie.fedup', timeout: 20 }, { waitFor: 'part-body.s1', timeout: 30 }, settle,
    napAt('nest-mall', 'dusk'),
    { landNear: { x: v.x + 3, z: v.z + 2 }, alt: 6, r: 2 }, { walkTo: { x: v.x + 2.2, z: v.z + 1 }, r: 0.5 }, { call: 'raccoons' }, { wait: 3.6 }, { ask: 'raccoons' },
    { fight: 'vinnie', timeout: 120 }, { waitFor: 'part-body.s2', timeout: 30 }, settle,
    { enter: 'hotdog-cart', timeout: 30 },
    // over Bow Bridge, then a route through the Ramble's trees found by a search over the tree trunks
    { drivePath: [{ x: 6, z: 250 }, { x: -20, z: 262 }, { x: -38, z: 280 }, { x: -34, z: 296 }, { x: -31, z: 318 }, { x: -29.5, z: 329 }, { x: -27.3, z: 334.3 }, { x: -26.5, z: 340.3 }, { x: -21.3, z: 346.3 }, { x: -23.5, z: 352.3 }, { x: -27.3, z: 358.3 }, { x: -33.3, z: 364.3 }, { x: -34.8, z: 370.3 }, { x: -30.3, z: 373.3 }], r: 2, speed: 3, timeout: 300 },
    { waitFor: 'part-body', timeout: 60 }, settle,
  ];
}

function beak(G, horses) {
  const sg = clue('sticker-grate');
  return [
    napAt('nest-reservoir', 'morning'),
    ask('rats', { x: sg.x - 1.6, z: sg.z }, { clue: 'sticker-grate' }), { pickItem: 'sticker', timeout: 20 }, { waitFor: 'part-beak.s1', timeout: 10 }, settle,
    { nearHuman: 'foreman', d: 2.5, timeout: 30 }, { call: 'crows' }, { wait: 3.6 }, { ask: 'crows' }, { waitFor: 'part-beak.s2', timeout: 30 }, settle,
    ...(horses
      ? [ask('horses', { x: 124.6, z: 361.5 }, { clue: 'shed-gate' }), { waitFor: 'part-beak.s3', timeout: 20 }, settle]   // fun pass (P12): the kick scene hauls the cone too
      : [napAt('nest-reservoir', 'dusk'), ask('raccoons', { x: 124.6, z: 361.5 }, { clue: 'shed-gate' }), { waitFor: 'part-beak.s3', timeout: 20 }, settle,
         napAt('nest-reservoir', 'morning'), { landNear: { x: 122.4, z: 362.5 }, alt: 8, r: 2 }, { walkTo: { x: 122.4, z: 362.5 }, r: 0.5 }, { call: 'biscuit' }, { wait: 3.6 }, { ask: 'biscuit' }]),
    { waitFor: 'part-beak', timeout: 60 }, settle,
  ];
}

function catsrats(G, how) {
  const shelf = clue('pickup-shelf'), b110 = PLACES['bodega-110'];
  const kerb = { x: b110.x - 4, z: b110.z - 6 };
  const get = how === 'shelf'
    ? [ask('cats', { x: shelf.x + 3.2, z: shelf.z - 0.4 }, { clue: 'pickup-shelf' }), { landNear: { x: shelf.x + 3.6, z: shelf.z }, alt: 2, r: 1.5, timeout: 30 }, { pickItem: 'box', timeout: 30 }]
    : [napAt('nest-reservoir', 'afternoon'), { landNear: { x: 100, z: 650 }, alt: 8, r: 3 }, { nearHuman: 'cyclist', d: 10, timeout: 60 }, { call: how }, { wait: 3.6 }, { nearHuman: 'cyclist', d: 9, timeout: 30 }, { ask: how },
       { waitFor: (G) => G.items.world.some((w) => w.id === 'box'), timeout: 20 }, { pickItem: 'box', timeout: 30 }];
  return [
    { landNear: { x: b110.x, z: b110.z - 4 }, alt: 8, r: 3 }, { waitFor: 'truce-cats-rats.s1', timeout: 20 }, settle,
    ...(how === 'shelf' ? [napAt('nest-north', 'morning')].filter(() => G.state.phase === 'night') : []),
    ...get, { waitFor: 'truce-cats-rats.s2', timeout: 20 }, settle,
    ...(how === 'shelf' ? rideGrate('grate-72w', 'grate-96e') : []),
    // carried low, the box can't go over the park wall: out through the north gate at Lenox
    { landNear: { x: 33.2, z: 1042 }, alt: 1.5, r: 3, timeout: 200 }, { landNear: kerb, alt: 1.8, r: 1.5, timeout: 60 }, { walkTo: kerb, r: 0.8, timeout: 30 }, { press: 'drop', frames: 3 }, { wait: 0.4 },
    { peckNear: 'boxopen:', timeout: 10 },
    { waitFor: 'truce-cats-rats', timeout: 90 }, settle,
  ];
}
