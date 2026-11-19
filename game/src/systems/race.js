// The Reservoir race (den-racers; "Puzzle tuning: Race").
//   wings   10 rings round the Reservoir (layout.js RACE_RINGS, 3 to 12 m up, two low past the
//           gatehouses). Peck Lapcount by the start to race. Coach flies a fixed line through the ring
//           centres at 9 m/s (about 70 s); Gus at cruise does it in about 58 s. Rings in order; a missed
//           ring shows a big arrow back. Beat Coach to the last ring to win.
//   wheels  the wheeled division: the pedicab (raccoons Rig it at Dusk), one lap of the running track
//           against Coach's posted time (layout.js PEDICAB_RACE.posted, 115 s). Drive up to the start line and the countdown begins.
// Fun pass (P5): after two lost flight races Coach eases off (8 m/s) and Sprint flies ahead to show the line: he waits at
// the next ring, then darts on to the one after as Gus goes through (an orange guide pigeon; the toast says so).
// A win sets `race.won` (den-racers step 2 listens). Racing blocks naps; the race music plays.
// Draft (the Racers' talent): once they've joined, a boost with 6 or more in the flock lasts twice as long.

import * as THREE from 'three';
import { RACE_RINGS, RACE, PEDICAB_RACE } from '../world/layout.js';
import { derived } from '../state/gamestate.js';

const TRACK = { cx: 0, cz: 662, rx: 94.5, rz: 97.5, exp: 2.25 };
const trackPt = (t) => {
  const a = -Math.PI / 2 + t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = 2 / TRACK.exp;
  return { x: TRACK.cx + TRACK.rx * Math.sign(c) * Math.abs(c) ** k, z: TRACK.cz + TRACK.rz * Math.sign(s) * Math.abs(s) ** k };
};

export class Race {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'race';
    this.run = null;
  }
  get st() { return this.G.state; }

  build() {
    const G = this.G;
    const gold = new THREE.MeshBasicMaterial({ color: 0xf2c230, fog: true });
    const next = new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: true });
    const geo = new THREE.TorusGeometry(3.2, 0.16, 8, 40);
    this.rings = RACE_RINGS.map((r, i) => {
      const m = new THREE.Mesh(geo, gold);
      const nx = RACE_RINGS[(i + 1) % RACE_RINGS.length], pv = RACE_RINGS[(i + RACE_RINGS.length - 1) % RACE_RINGS.length];
      m.position.set(r.x, r.y, r.z);
      m.rotation.y = Math.atan2(nx.x - pv.x, nx.z - pv.z);   // the hoop faces along the loop
      m.visible = false;
      this.group.add(m);
      return m;
    });
    this.mats = { gold, next };
    // Coach: a flying pigeon drawn with the flock's own mesh and wingbeat
    const fm = G.flock.mesh;
    this.coach = new THREE.InstancedMesh(fm.geometry, fm.material, 1);
    this.coach.frustumCulled = false;
    this.coach.visible = false;
    this.coach.castShadow = true;
    this.group.add(this.coach);
    // fun pass (P5): Sprint, the guide (after two losses)
    this.sprint = new THREE.InstancedMesh(fm.geometry, new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0x662200, roughness: 0.6 }), 1);
    this.sprint.frustumCulled = false; this.sprint.visible = false; this.sprint.castShadow = true;
    this.group.add(this.sprint);
    // the start: Peck Lapcount (the Racers' stopwatch)
    G.interact.register({ id: 'race-start', kind: 'race', x: RACE.start.x, y: G.surfaceY(RACE.start.x, RACE.start.z, 5), z: RACE.start.z, r: 2.4, dy: 3, priority: 7,
      label: () => (this.available() && !this.run && !G.vehicles.driving ? 'Race Coach (Lapcount starts you)' : null), act: () => this.start('wings') });
    // the coach's line: start → the ten ring centres
    this.line = [{ x: RACE.start.x, y: RACE.start.y + 3, z: RACE.start.z }, ...RACE_RINGS.map((r) => ({ x: r.x, y: r.y, z: r.z }))];
    this.lineLen = [0];
    for (let i = 1; i < this.line.length; i++) this.lineLen.push(this.lineLen[i - 1] + Math.hypot(this.line[i].x - this.line[i - 1].x, this.line[i].y - this.line[i - 1].y, this.line[i].z - this.line[i - 1].z));
    // the wheeled division's checkpoints round the running track
    // (the drivable route round the track, past the gatehouses, when layout.js has one)
    const R = PEDICAB_RACE.route;
    this.checks = R ? [...R.filter((_, i) => i % 3 === 2), PEDICAB_RACE.finish] : Array.from({ length: PEDICAB_RACE.checkpoints }, (_, i) => trackPt((i + 1) / PEDICAB_RACE.checkpoints));
  }

  /** The flight race is on when den-racers is at its race step, or any time once the Racers have joined. */
  available() {
    const E = this.G.schemes;
    return (E.isOpen('den-racers') && E.stepIndex('den-racers') === 1) || this.st.crews.includes('racers');
  }

  start(kind) {
    const G = this.G;
    if (this.run) return;
    if (kind === 'wings' && this.st.phase === 'night') { G.say([{ who: 'wingate', text: 'Night? No. We train in daylight, rookie.' }]); return; }
    const assist = kind === 'wings' && (this.st.raceLosses || 0) >= 2;   // fun pass (P5)
    this.run = { kind, t: -3, ring: 0, check: 0, coachD: 0, missed: false, best: null, countdown: 3, assist, guide: assist ? { x: RACE.start.x, y: RACE.start.y + 3, z: RACE.start.z } : null };
    if (assist) G.later(0.6, () => G.toast('Sprint will show you the line. Follow the orange pigeon!', { seconds: 4 }));
    G.audio.synth('whistle');
    G.say([{ who: 'lapcount', text: kind === 'wings' ? 'Ten rings, in order. Coach goes on the horn. Three…' : `One lap of the track. Coach's time is ${PEDICAB_RACE.posted} seconds. Three…` }]);
    G.bus.emit('raceStart', { kind });
  }

  #end(won) {
    const G = this.G, r = this.run;
    this.run = null;
    this.coach.visible = false;
    this.sprint.visible = false;
    if (!won && r.kind === 'wings' && r.t > 0) this.st.raceLosses = (this.st.raceLosses || 0) + 1;   // fun pass (P5): two losses bring the assist
    const secs = r.t.toFixed(1);
    if (won) {
      this.st.flags['race.won'] = true;
      this.st.flags[r.kind === 'wings' ? 'race.wonWings' : 'race.wonWheels'] = true;
      const best = this.st.raceBest || (this.st.raceBest = {});
      if (!best[r.kind] || r.t < best[r.kind]) best[r.kind] = +r.t.toFixed(1);
      G.audio.play('race-finish');
      G.toast(`You win! ${secs} s`, { kind: 'stamp', seconds: 4 });
      G.later(0.5, () => G.say([{ who: 'lapcount', text: `${secs} seconds. That's a WIN.` }, { who: 'wingate', text: 'Hm. Not bad, rookie. Not bad at all.' }]));
    } else {
      G.audio.synth('uiBack');
      G.toast('Coach wins this one.', { kind: 'bad' });
      G.later(0.3, () => G.say([{ who: 'wingate', text: r.kind === 'wings' ? 'Again. Rings in ORDER, rookie.' : 'Too slow. Again.' }]));
    }
    G.bus.emit('raceEnd', { won, kind: r.kind, t: r.t });
  }

  update(dt) {
    const G = this.G, g = G.gus;
    // Draft: the Racers' boost
    g.boostMul = this.st.talents.includes('draft') && derived(this.st).flock >= 6 ? 2 : 1;
    const show = this.run?.kind === 'wings' || (this.available() && Math.hypot(g.position.x - 0, g.position.z - 662) < 160 && this.st.phase !== 'night');
    this.rings.forEach((m, i) => { m.visible = show; m.material = this.run?.kind === 'wings' && i === this.run.ring ? this.mats.next : this.mats.gold; });
    // the wheeled division starts when the pedicab rolls up to the start line
    const v = G.vehicles.driving;
    if (!this.run && v?.id === 'pedicab' && Math.hypot(g.position.x - PEDICAB_RACE.start.x, g.position.z - PEDICAB_RACE.start.z) < 4) {
      if (!this.pedicabArmed) { this.pedicabArmed = true; this.start('wheels'); }
    } else if (!this.run) this.pedicabArmed = false;
    const r = this.run;
    if (!r) return;
    r.t += dt;
    if (r.t < 0) { const n = Math.ceil(-r.t); if (n !== r.countdown) { r.countdown = n; G.audio.synth('meterTick'); } return; }
    if (!r.go) { r.go = true; G.audio.play('race-start-horn'); }
    const p = g.position;
    if (Math.hypot(p.x, p.z - 662) > 175) { this.#end(false); G.toast('You left the course.'); return; }
    if (r.kind === 'wings') {
      // Coach along his line
      r.coachD += (r.assist ? 8 : RACE.coachSpeed) * dt;
      if (r.guide) {
        // Sprint flies to the ring Gus needs next and waits there, wings going
        const tgt = RACE_RINGS[Math.min(r.ring, RACE_RINGS.length - 1)], gd = r.guide;
        const dx = tgt.x - gd.x, dy = tgt.y - gd.y, dz = tgt.z - gd.z, d = Math.hypot(dx, dy, dz), step = Math.min(d, 14 * dt);
        if (d > 0.01) { gd.x += (dx / d) * step; gd.y += (dy / d) * step; gd.z += (dz / d) * step; gd.yaw = Math.atan2(dx, dz); }
        const bob = Math.sin(r.t * 6) * 0.25;
        _m4.compose(_v.set(gd.x, gd.y + 0.9 + bob, gd.z), _q.setFromEuler(_e.set(0.6, gd.yaw || 0, 0, 'YXZ')), _sc.setScalar(G.flock.scale * 1.15)).multiply(G.flock.centerOffset);
        this.sprint.setMatrixAt(0, _m4); this.sprint.instanceMatrix.needsUpdate = true; this.sprint.visible = true;
      }
      const total = this.lineLen[this.lineLen.length - 1];
      const k = this.#lineAt(Math.min(r.coachD, total));
      _m4.compose(_v.set(k.x, k.y, k.z), _q.setFromEuler(_e.set(0.8, k.yaw, 0, 'YXZ')), _sc.setScalar(G.flock.scale)).multiply(G.flock.centerOffset);
      this.coach.setMatrixAt(0, _m4); this.coach.instanceMatrix.needsUpdate = true; this.coach.visible = true;
      // Gus through the rings, in order
      const ring = RACE_RINGS[r.ring];
      const d = Math.hypot(p.x - ring.x, p.y - ring.y, p.z - ring.z);
      if (d < ring.r + 0.4) {
        G.audio.synth('ding'); G.particles.burst('sparkle', ring.x, ring.y, ring.z, 16, { spread: 2 });
        r.ring++; r.missed = false;
        if (r.ring >= RACE_RINGS.length) { this.#end(r.coachD < total); return; }
      } else {
        // missed: past the next ring along the loop without going through it
        const nx = RACE_RINGS[(r.ring + 1) % RACE_RINGS.length];
        r.missed = Math.hypot(p.x - nx.x, p.z - nx.z) < Math.hypot(ring.x - nx.x, ring.z - nx.z) * 0.6 || d > RACE.missBehind * 2.2;
      }
      if (r.coachD >= total && !r.coachDone) { r.coachDone = true; G.toast('Coach is home. Finish anyway!'); }
    } else {
      if (v?.id !== 'pedicab') { this.#end(false); return; }
      const c = this.checks[r.check];
      if (Math.hypot(p.x - c.x, p.z - c.z) < 9) {
        r.check++; G.audio.synth('ding');
        if (r.check >= this.checks.length) { this.#end(r.t <= PEDICAB_RACE.posted); return; }
      }
      if (r.t > PEDICAB_RACE.posted + 40) this.#end(false);
    }
  }

  #lineAt(d) {
    const L = this.line, S = this.lineLen;
    let i = 1;
    while (i < S.length - 1 && S[i] < d) i++;
    const a = L[i - 1], b = L[i], k = (d - S[i - 1]) / Math.max(1e-6, S[i] - S[i - 1]);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  panel() {
    const r = this.run;
    if (!r) return '';
    if (r.t < 0) return `<div class="big">${Math.ceil(-r.t)}</div><div class="sub">${r.kind === 'wings' ? 'Ten rings, in order' : `Beat ${PEDICAB_RACE.posted} s`}</div>`;
    const tm = r.t.toFixed(1);
    if (r.kind === 'wings') {
      let arrow = '';
      if (r.missed) {
        const ring = RACE_RINGS[r.ring], g = this.G.gus.position;
        const rel = Math.atan2(ring.x - g.x, ring.z - g.z) - this.G.rig.yaw;
        const deg = Math.round((Math.atan2(Math.sin(rel), Math.cos(rel)) * 180) / Math.PI);
        arrow = `<div class="row warn"><span class="arrow" style="display:inline-block;transform:rotate(${deg}deg)">↑</span><span>Missed ring ${r.ring + 1}: back this way</span></div>`;
      }
      const ahead = this.#coachAhead();
      return `<div class="row"><span class="big">${tm}</span><span>Ring ${Math.min(r.ring + 1, 10)}/10</span></div><div class="sub">${ahead}</div>${arrow}`;
    }
    return `<div class="row"><span class="big">${tm}</span><span>Lap ${Math.round((r.check / this.checks.length) * 100)}%</span></div><div class="sub">Coach's time: ${PEDICAB_RACE.posted} s</div>`;
  }

  #coachAhead() {
    const r = this.run;
    const gusD = this.lineLen[Math.min(r.ring, this.lineLen.length - 1)];
    return r.coachD > gusD + 15 ? 'Coach is ahead' : r.coachD < gusD - 15 ? "You're ahead of Coach" : 'Neck and neck with Coach';
  }

  music() { return this.run ? 'race' : null; }
  napBlock() { return this.run ? 'Not during the race' : null; }
  onNap() { this.run = null; this.coach.visible = false; this.sprint.visible = false; return []; }
  restore() { this.run = null; if (this.coach) this.coach.visible = false; if (this.sprint) this.sprint.visible = false; }
  debug() { const r = this.run; return r ? { kind: r.kind, t: +r.t.toFixed(2), ring: r.ring, check: r.check, coach: +r.coachD.toFixed(1), missed: r.missed } : { available: this.available(), best: this.st.raceBest || null }; }
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();
