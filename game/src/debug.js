// window.__game: the play-test hook (Tech plan, "Debug hook"). It reads state,
// steps time, loads fixtures and runs the autopilot; it never plays for the
// player outside the autopilot's input queue.
//
//   state()                    screen, zone, time, the player (position, mode; driving fields),
//                              feathers, stamina, crumbs, flock, bread power, carried item (slice age),
//                              crews, parts, flags, open schemes, thread meters, signs, spike sites,
//                              input device and gamepad id, Gus's on-screen size, renderer triangles
//                              (with and without the shadow pass) and draw calls, crowds and people
//                              drawn, decoded audio bytes, and whether the preset's caps hold
//   audioState()               context state, music and sfx muted, decoded buffers
//   step(n, {render})          freeze real time and run n fixed 1/60 s updates (simulation only)
//   resume()                   back to real time
//   ready()                    resolves when the world and the current zone's models are loaded
//   goToScheme(id, step?)      load data/fixtures/<id>.json (or <id>.s<n>.json) and put Gus at its start
//   autopilot(goals, opts)     debug only: goals → real inputs (recorded); pilot() reports progress
//   replay(frames)             feed recorded inputs back with the autopilot off
//   goTo(placeId), teleport()  screenshots only, never inside a solution
//   dev.setFlags(…), dev.give(item), dev.setPhase(p), dev.join(crew), dev.crumbs(n), dev.hurt(), dev.snapshot()

import * as THREE from 'three';
import { VIEWS, LANDMARKS, NESTS, zoneAt, SUMMIT_PERCHES } from './world/layout.js';
import { derived } from './state/gamestate.js';
import { SCHEME } from './data/schemes.js';
import { CREW } from './data/crews.js';
import { THREADS } from './data/threads.js';

const round = (v, k = 3) => +(+v).toFixed(k);

export function installDebug(G) {
  const _box = new THREE.Box3();
  const _c = new THREE.Vector3();
  function onScreen() {
    const mesh = G.gus.activeMesh;
    mesh.updateWorldMatrix(true, false);
    _box.copy(mesh.geometry.boundingBox);
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
    for (let i = 0; i < 8; i++) {
      _c.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z)
        .applyMatrix4(mesh.matrixWorld).project(G.renderCam);
      x0 = Math.min(x0, _c.x); x1 = Math.max(x1, _c.x); y0 = Math.min(y0, _c.y); y1 = Math.max(y1, _c.y);
    }
    return { height: round((y1 - y0) / 2), width: round((x1 - x0) / 2) };
  }

  function measure() {
    const r = G.renderer;
    const full = G.render();
    const auto = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    const noShadow = G.render();
    r.shadowMap.autoUpdate = auto;
    return { full, noShadow };
  }

  const screenName = () => {
    if (!G.ready) return 'loading';
    if (G.screen === 'title') return G.menus.top?.id === 'title' ? 'title' : G.menus.top?.id || 'title';
    if (G.menus.open) return G.menus.top.id;
    if (G.napping) return 'nap';
    if (G.ruffling) return 'ruffled';
    if (G.dialogue.open) return 'dialogue';
    if (G.cutscene.running) return 'cutscene';
    if (G.wheel.open) return 'wheel';
    return 'play';
  };

  const api = {
    state({ measure: doMeasure = true } = {}) {
      if (!G.ready) return { screen: 'loading', progress: round(G.progress?.fraction ?? 0, 2) };
      const g = G.gus, p = g.position, st = G.state, d = derived(st);
      const m = doMeasure && G.screen === 'play' ? measure() : { full: G.lastStats, noShadow: G.lastStats };
      const caps = G.preset.caps;
      const trees = G.trees.drawn;
      const crowd = G.crowds.stats();
      const c = st.carried;
      const meters = {};
      for (const t of THREADS) meters[t.id] = { label: t.meter.label, value: d[t.meter.of], max: t.meter.max, shown: st.lanes.includes(t.id) };
      return {
        screen: screenName(),
        zone: zoneAt(p.x, p.z),
        time: st.phase,
        gameTime: round(st.time, 2),
        simTime: round(G.simTime, 2),
        updates: G.updates,
        player: {
          x: round(p.x, 2), y: round(p.y, 2), z: round(p.z, 2), yaw: round(g.yaw), mode: g.mode, model: g.activeMesh.name,
          speed: round(g.speed, 2), vy: round(g.vy, 2), stamina: round(g.stamina), boosting: g.boostT > 0, sprinting: g.sprinting,
          perch: g.mode === 'perch' ? (g.perch?.id || g.perch?.perch?.id || g.perch?.kind || 'perch') : null, inCanopy: g.inCanopy, lastHit: g.lastHit,
          headShift: round(g.headShift()), carryLimits: g.carryLimits,
          ...G.vehicles.debug(),
        },
        feathers: st.feathers,
        stamina: round(g.stamina),
        crumbs: st.crumbs,
        flock: d.flock, flockVisible: G.flock.count, flockBirds: G.flock.describe(),
        breadPower: d.breadPower,
        parkSupport: d.support,
        carried: c ? { id: c.id, age: c.born != null ? round(st.time - c.born, 1) : null, hot: G.items.isHot(c), heat: G.items.heat(c) } : null,
        items: G.items.world.map((it) => ({ id: it.id, x: round(it.x, 1), z: round(it.z, 1), age: it.born != null ? round(st.time - it.born, 1) : null })),
        crews: [...st.crews], parts: [...st.parts], gear: [...st.gear],
        flags: Object.keys(st.flags).filter((k) => st.flags[k]),
        schemes: G.schemes.summary(),
        openSchemes: G.schemes.openList(),
        tracked: st.tracked,
        goal: G.schemes.goal(),
        lanes: [...st.lanes],
        threadMeters: meters,
        signs: G.signs.summary(),
        piles: st.piles.map((q) => ({ sign: q.sign, amount: round(q.amount, 1), x: round(q.x, 1), z: round(q.z, 1) })),
        carts: G.rangers.summary(),
        spikeSites: G.spikes.summary(),
        lastNest: st.lastNest, waypoint: st.waypoint,
        prompt: G.interact.label || null,
        tutor: G.tutorState,
        dialogue: G.dialogue.open ? { who: G.dialogue.line.who, text: G.dialogue.line.text } : null,
        cutscene: G.cutscene.name,
        menu: G.menus.top?.id || null,
        input: { device: G.input.device, gamepad: G.input.gamepad.connected ? G.input.gamepad.id : null, padFamily: G.input.gamepad.family, pointerLocked: G.input.locked },
        gusOnScreen: onScreen(),
        viewport: { w: innerWidth, h: innerHeight, pixelRatio: G.renderer.getPixelRatio() },
        camera: { mode: G.rig.free ? 'free' : 'follow', yaw: round(G.rig.yaw), pitch: round(G.rig.pitch), far: G.renderCam.far },
        renderer: { triangles: m.full.triangles, trianglesNoShadow: m.noShadow.triangles, calls: m.full.calls, callsNoShadow: m.noShadow.calls, farPass: G.lastFarStats },
        trees: { ...trees, total: G.trees.trees.length },
        crowds: { total: crowd.total, active: crowd.active, drawn: crowd.drawn, caps: crowd.caps },
        humans: G.humans.stats(),
        characters: { total: G.chars.list.length, drawn: G.chars.drawnCount() },
        audio: G.audio.state(),
        preset: { id: G.preset.id, auto: G.presetAuto, reason: G.presetReason },
        caps: { triangles: caps.triangles, calls: caps.calls, fullTrees: G.preset.trees.full, lodTrees: G.preset.trees.lod, crowd: G.preset.crowd, humans: G.preset.humans },
        withinCaps: {
          triangles: m.full.triangles <= caps.triangles,
          calls: m.full.calls <= caps.calls,
          fullTrees: trees.full <= G.preset.trees.full,
          lodTrees: trees.lod <= G.preset.trees.lod,
          crowdFull: crowd.drawn.full <= G.preset.crowd.full,
          crowdLod: crowd.drawn.lod <= G.preset.crowd.lod,
          songbirds: crowd.drawn.songbirds <= G.preset.crowd.songbirds,
          horses: crowd.drawn.horses <= G.preset.crowd.horses,
          humans: G.humans.drawn.animated <= G.preset.humans,
        },
        world: { ...G.worldStats, modelsStreamed: G.streamer.loaded },
        particles: G.particles.active,
        fog: round(G.fog.fraction(), 3),
        pilot: api.pilot(),
        finale: G.finale?.debug(),
        fight: G.fights.debug(), race: G.race.debug(), clues: G.clues.debug(), collect: G.collect.debug(),
        falafel: st.falafel || 0, scarf: st.scarf, scarves: [...st.scarves], postcards: [...st.postcards], deals: st.deals, lines: [...st.lines], truces: [...st.truces],
        fps: round(G.fps, 1),
      };
    },

    step(n = 1, { render = 'last' } = {}) {
      G.frozen = true;
      n = Math.max(0, Math.round(n));
      for (let i = 0; i < n; i++) {
        G.update(G.DT);
        if (typeof render === 'number' && render > 0 && (i + 1) % render === 0) { G.syncCameras(); G.frameUi(G.DT); G.render(); }   // Batch-2 (#18): the live loop's order
      }
      if (render === 'last' || (typeof render === 'number' && n % render !== 0)) { G.syncCameras(); G.frameUi(G.DT * Math.max(1, n)); if (G.screen === 'play') G.render(); }
      return api.state({ measure: false });
    },

    resume() { G.frozen = false; G.resetClock(); },

    async ready() {
      while (!G.ready) await new Promise((r) => setTimeout(r, 50));
      await G.streamer.ready();
      await G.registry.idle();
      return true;
    },

    /** Load a fixture: exactly what a player has when that scheme (or step n) opens. */
    async goToScheme(id, step = null) {
      await api.ready();
      const name = step && step > 1 ? `${id}.s${step}` : id;
      const r = await fetch(`./data/fixtures/${name}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error('no fixture ' + name);
      const fx = await r.json();
      G.reseed();
      if (fx.newGame) { G.newGame(); }
      else {
        G.loadState(fx.state);
        if (!fx.state.gus) {
          const nest = NESTS.find((q) => q.id === (SCHEME[id]?.start || 'nest-pond')) || NESTS[0];
          G.gus.place({ x: nest.x, z: nest.z, y: G.terrain.heightAt(nest.x, nest.z) + 0.1, yaw: 0, mode: 'perch' });
          G.flock.place(G.leader());
        }
      }
      G.frozen = true;
      G.update(0);
      await api.ready();
      return api.state({ measure: false });
    },

    async autopilot(goals, opts = {}) {
      const { Autopilot } = await import('./debug/autopilot.js');
      G.pilot = G.pilot || new Autopilot(G);
      G.replayer = null;
      G.legacyTakeoff = false;   // Batch-2 (#5): the autopilot records against today's take-off (and writes version 2)
      const p = G.pilot.run(typeof goals === 'string' ? (await import('./debug/goals.js')).GOALS[goals](G) : goals, opts);
      p.then((res) => { G.pilotResult = res; });
      G.pilotResult = null;
      return 'started';
    },
    pilot() { return G.pilot?.active ? { running: true, goal: G.pilot.i, of: G.pilot.goals.length, frame: G.pilot.frame } : { running: false, result: G.pilotResult || null }; },
    recording() { return G.pilot?.recording || null; },

    async replay(frames, { version } = {}) {
      const { Replay } = await import('./debug/autopilot.js');
      // Batch-2 (#5): recordings made before the hop (no version) replay with the old take-off; version 2+ with the hop
      G.legacyTakeoff = !(version >= 2);
      G.replayer = new Replay(G, frames);
      return { frames: G.replayer.total };
    },
    replayStatus() { return G.replayer ? { active: G.replayer.active, played: G.replayer.played, total: G.replayer.total } : null; },

    goTo(id) {
      if (G.finale && ['doors', 'biggify', 'stomp', 'climb', 'shout', 'credits', 'sting'].includes(id)) { G.finale.goTo(id); return api.state({ measure: false }); }   // finale pieces (screenshots and review only)
      const v = resolveView(id);
      if (!v) throw new Error('unknown place ' + id);
      G.rig.setFree(v.cam || null);
      if (v.gus) {
        let { x, y, z } = v.gus;
        if (v.gus.on) { const s = G.summits[v.gus.on]; if (!s) throw new Error('no summit ' + v.gus.on); ({ x, y, z } = s); }
        G.gus.place({ x, y, z, yaw: v.gus.yaw ?? 0, mode: v.gus.mode || 'walk', speed: v.gus.speed });
        G.flock.place(G.leader());
      }
      G.rig.yaw = v.look?.yaw ?? G.gus.yaw;
      G.rig.pitch = v.look?.pitch ?? 0;
      G.input.consumeLook();
      G.rig.update(G.DT, G.gus, { snap: true, collision: G.collision });
      G.trees.update(G.dataCam, true);
      G.terrain.updateLod(G.dataCam.position);
      G.props.userData.update(G.dataCam, true);
      G.streamer.update(G.gus.position, G.dataCam.position);
      G.humans.update(0, G.dataCam);
      G.crowds.update(0, G.dataCam);
      G.chars.update(0);
      G.syncCameras();
      G.render();
      return api.state({ measure: false });
    },

    teleport(x, z, y) {
      if (typeof x === 'string') { const n = NESTS.find((q) => q.id === x); if (n) return api.goTo({ gus: { x: n.x, z: n.z, mode: 'walk', yaw: 0 } }); return api.goTo(x); }
      return api.goTo({ gus: { x, z, y, yaw: G.gus.yaw, mode: y != null ? 'fly' : 'walk' } });
    },
    views: () => Object.keys(VIEWS),
    summits: () => G.summits,
    audioState: () => G.audio.state(),
    buttons: () => [...document.querySelectorAll('button, [role=button]')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim() || b.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height }; }),
    dev: {
      setPhase(p) { G.state.phase = p; G.setPhase(p); G.humans.setPhase(p); G.rangers.setPhase(p); G.street.setPhase(p); for (const m of G.mods) m.setPhase?.(p); G.render(); return G.tod.phase; },
      setPreset(id) { G.setGraphics(id); },
      setFlags(f) { const list = Array.isArray(f) ? f : typeof f === 'string' ? [f] : Object.keys(f); for (const k of list) G.state.flags[k] = true; G.schemes.refreshLanes(); return list; },
      give(item, opts) { G.items.give(item, opts); return G.state.carried; },
      join(crew) { if (!G.state.crews.includes(crew)) { G.state.crews.push(crew); const c = CREW[crew]; if (c.flock) G.state.flockFrom[crew] = c.flock; G.flock.setRoster(G.state.flockFrom); } return G.state.crews; },
      crumbs(n) { G.state.crumbs = n; return n; },
      gear(id) { if (!G.state.gear.includes(id)) G.state.gear.push(id); return G.state.gear; },
      hurt(n = 1) { G.hurt(n); return G.state.feathers; },
      flip(id) { return G.signs.flip(id); },
      snapshot() { return G.snapshot(); },
      freeCam(cam) { G.rig.setFree(cam); G.trees.update(G.dataCam, true); G.render(); },
      view(v) { G.rig.setView(v); G.rig.update(0, G.gus, { collision: G.collision }); G.render(); },
      spikes(ids) { G.spikes.install(ids); return G.spikes.summary(); },
    },
  };

  function resolveView(id) {
    if (typeof id === 'object') return id;
    if (VIEWS[id]) return VIEWS[id];
    const s = SUMMIT_PERCHES.find((q) => q.id === id);
    if (s) return { gus: { on: s.id, mode: 'perch', yaw: 0 } };
    const n = NESTS.find((q) => q.id === id);
    if (n) return { gus: { x: n.x, z: n.z, mode: 'walk', yaw: 0 } };
    const L = LANDMARKS.find((q) => q.id === id);
    if (L) return { gus: { x: L.x, z: L.z - 25, y: 12, mode: 'fly', yaw: 0 } };
    return null;
  }

  window.__game = api;
  return api;
}
