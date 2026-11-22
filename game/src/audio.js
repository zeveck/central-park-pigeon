// Web Audio: music with crossfades, ambience beds, effects with variants,
// voiced barks, chatter blips and the sounds made in code (UI, typewriter
// tick, stamina warning, ring ding, nap chime, phone ring, car alarm, the
// ice-cream truck's jingle, bike bell, spike boing, meter tick). Mute on M and
// the speaker button; music and effects volumes; everything remembered in
// the settings.
//
// Decode policy (Tech plan, "Audio memory"): music stays as compressed bytes;
// only the playing track and the next one are decoded (≤ 2 music buffers), and
// a buffer is dropped once its crossfade is over. Ambiences are downmixed to
// mono and at most 2 are decoded. Effects are decoded once, on first use.
//
// Audio never feeds back into gameplay, so it can run on real time.

const BASE = './assets/audio/';
const XFADE = 4;          // s, loop and track crossfades
const SWITCH_FADE = 2.5;  // s, when the zone or phase changes the music

// tracks: [file, ...alternate takes]
export const MUSIC = {
  title: ['title-pigeon-strut'],
  'day-a': ['park-day-a', 'park-day-a-2'],
  'day-b': ['park-day-b', 'park-day-b-2'],
  dusk: ['park-dusk', 'park-dusk-b'], night: ['park-night', 'park-night-b'], city: ['city-ring'],   // fun pass: second takes (clarinet waltz, lounge piano), alternating after each gap
  scheme: ['scheme-workshop'], encounter: ['encounter'], stealth: ['stealth'], race: ['race'], rink: ['rink-waltz'],
  wedding: ['wedding-quartet'], finale: ['finale-stomp-and-climb'], busker: ['busker-riff'], sax: ['sax-busker-riff'],
};
const DAY_GAP = [30, 60];   // day loops: an ambience-only stretch between takes
// Fixes-2 (P10): Dusk and Night have one ~90 s take each, so they get gaps too (a little longer: the night bed carries it)
// (fun pass: and now two takes each, played in turn with a gap between)
const GAPS = { 'day-a': DAY_GAP, 'day-b': DAY_GAP, dusk: [35, 70], night: [40, 80] };

const SFX_VARIANTS = {
  coo: ['coo', 'coo-2', 'coo-3'], flap: ['flap', 'flap-2', 'flap-3'], peck: ['peck', 'peck-2', 'peck-3'],
  footstep: ['footstep-pat', 'footstep-pat-2', 'footstep-pat-3'], gulp: ['gulp', 'gulp-2'], landing: ['landing', 'landing-2'],
  'crow-caw': ['crow-caw', 'crow-caw-2'], 'squirrel-chatter': ['squirrel-chatter', 'squirrel-chatter-2'],
};
// files that came out quiet (audio report): gain in code
const SFX_GAIN = { 'bread-rain': 10, 'pedicab-pedal': 6, 'rc-boat-whine': 7, 'photographer-thats-the-shot': 1.6,
  // fun pass (levels measured against their neighbours: decoded RMS of the loudest 20%): the glow hum sat ~12 dB under the
  // splashes, the photographer's yelp ~5 dB over his "THAT'S the shot", the glass ~8 dB under the knock clatter
  'battery-glow': 2.5, 'photographer-fall': 0.6, 'glass-smash': 1.5 };
const CORE_SFX = ['coo', 'coo-2', 'flap', 'flap-2', 'peck', 'peck-2', 'gulp', 'landing', 'take-off', 'sign-plate-pop', 'crumb-scatter', 'scheme-step-chime', 'pick-up', 'drop-thud', 'whoosh'];

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.bytes = new Map();       // url → Promise<ArrayBuffer> (compressed)
    this.sfx = new Map();         // name → Promise<AudioBuffer>
    this.musicBufs = new Map();   // file → AudioBuffer (≤ 2)
    this.ambBufs = new Map();     // file → AudioBuffer (mono, ≤ 2)
    this.music = { want: null, track: null, take: 0, src: null, gain: null, file: null, endsAt: 0, gapUntil: 0, fading: [] };
    this.amb = new Map();         // file → { src, gain, target }
    this.ambWant = [];
    this.loops = new Set();
    this.lastVariant = {};
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.paused = false;
    this.blipCool = 0;
  }

  // ------------------------------------------------------------ setup
  /** Create or resume the context: call from the first user input. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.busMusic = c.createGain(); this.busMusic.connect(this.master);
      this.busSfx = c.createGain(); this.busSfx.connect(this.master);
      this.busAmb = c.createGain(); this.busAmb.connect(this.master);
      this.duck = c.createGain(); this.duck.connect(this.busMusic);
      this.applyVolumes();
      for (const n of CORE_SFX) this.#sfxBuffer(n);
      if (this.music.want) this.#startTrack(this.music.want, true);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.03);
    this.busMusic.gain.setTargetAtTime(s.music * 0.6, t, 0.05);
    this.busSfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.busAmb.gain.setTargetAtTime(s.sfx * 0.55, t, 0.05);
  }

  setMuted(m) { this.settings.muted = m; this.applyVolumes(); }
  toggleMute() { this.setMuted(!this.settings.muted); return this.settings.muted; }
  /** M4: a hidden tab is silent; showing it again resumes (the context was unlocked by an earlier input). */
  setHidden(h) {
    if (!this.ctx) return;
    if (h) this.ctx.suspend().catch(() => {});
    else if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setPaused(p) {
    this.paused = p;
    if (!this.ctx) return;
    this.duck.gain.setTargetAtTime(p ? 0.35 : 1, this.ctx.currentTime, 0.15);
    this.busAmb.gain.setTargetAtTime(p ? 0 : this.settings.sfx * 0.55, this.ctx.currentTime, 0.15);
    for (const l of this.loops) l.gain.gain.setTargetAtTime(p ? 0 : l.vol, this.ctx.currentTime, 0.1);
  }

  // ------------------------------------------------------------ loading
  #fetchBytes(url) {
    if (!this.bytes.has(url)) {
      this.bytes.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); }));
    }
    return this.bytes.get(url);
  }
  async #decode(url) {
    const b = await this.#fetchBytes(url);
    return this.ctx.decodeAudioData(b.slice(0));   // decodeAudioData detaches its input: keep the compressed copy
  }
  #sfxBuffer(name) {
    if (!this.ctx) return Promise.resolve(null);
    if (!this.sfx.has(name)) {
      const dir = /-(greeting|call|join)$|^(ranger-hey-shoo|vinnie-flying-rat|prickett-impossible|photographer-thats-the-shot|photographer-fall|mecha-feed-the-birds|dove-|crowd-chant-take)/.test(name) ? 'voice/' : 'sfx/';
      this.sfx.set(name, this.#decode(BASE + dir + name + '.mp3').catch((e) => { console.warn('sfx', name, e.message); return null; }));
    }
    return this.sfx.get(name);
  }

  // ------------------------------------------------------------ music
  /** Ask for a music track (a MUSIC key) or null for none; the engine crossfades to it. */
  setMusic(key) {
    if (this.music.want === key) return;
    this.music.want = key;
    if (this.ctx) this.#startTrack(key, false);
  }

  /** 3b: cut the music at once (the Wedding's needle scratch); the next setMusic starts fresh. */
  cutMusic() { const m = this.music; if (this.ctx && m.src) this.#fadeOut(m, 0.05); m.src = null; m.track = null; m.want = '__cut'; m.req = (m.req || 0) + 1; }

  async #startTrack(key, immediate) {
    const m = this.music;
    const list = key ? MUSIC[key] : null;
    // Fixes-1 (#6): every request gets a token; only the latest may start a track. (A→B→A while A decoded left two
    // awaits both seeing track === A: two copies played, and the orphan never faded.)
    const req = m.req = (m.req || 0) + 1;
    // fade out what's playing
    if (m.src) this.#fadeOut(m, immediate ? 0.2 : SWITCH_FADE);
    m.src = null; m.track = key; m.take = 0; m.gapUntil = 0;
    if (!list) return;
    const file = list[0];
    const buf = await this.#musicBuffer(file);
    if (!buf || m.req !== req || m.track !== key) return;
    this.#play(file, buf, immediate ? 0.3 : SWITCH_FADE);
  }

  async #musicBuffer(file) {
    if (this.musicBufs.has(file)) return this.musicBufs.get(file);
    const buf = await this.#decode(BASE + 'music/' + file + '.mp3').catch((e) => { console.warn('music', file, e.message); return null; });
    if (buf) {
      this.musicBufs.set(file, buf);
      this.#trimMusic(file);
    }
    return buf;
  }

  /** Keep only the playing buffer and the one just asked for. */
  #trimMusic(keep) {
    const playing = new Set([keep, this.music.file, ...this.music.fading.map((f) => f.file)]);
    for (const f of [...this.musicBufs.keys()]) if (!playing.has(f)) this.musicBufs.delete(f);
    while (this.musicBufs.size > 2) {
      const drop = [...this.musicBufs.keys()].find((f) => f !== keep && f !== this.music.file);
      if (!drop) break;
      this.musicBufs.delete(drop);
    }
  }

  #play(file, buf, fadeIn) {
    const c = this.ctx, m = this.music;
    if (m.src) this.#fadeOut(m, Math.min(fadeIn, 1));   // never two tracks at once: a source still playing fades out
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(1, c.currentTime + fadeIn);
    src.connect(g).connect(this.duck);
    src.start();
    m.src = src; m.gain = g; m.file = file;
    m.endsAt = c.currentTime + buf.duration;
  }

  #fadeOut(m, secs) {
    const c = this.ctx;
    const f = { src: m.src, gain: m.gain, file: m.file };
    try {
      f.gain.gain.cancelScheduledValues(c.currentTime);
      f.gain.gain.setValueAtTime(f.gain.gain.value, c.currentTime);
      f.gain.gain.linearRampToValueAtTime(0, c.currentTime + secs);
      f.src.stop(c.currentTime + secs + 0.05);
    } catch { /* already stopped */ }
    m.fading.push(f);
    f.src.onended = () => {
      m.fading = m.fading.filter((x) => x !== f);
      if (f.file !== m.file && !m.fading.some((x) => x.file === f.file)) this.musicBufs.delete(f.file);   // drop after its crossfade
    };
  }

  /** Called every frame: loop crossfades, the day loops' ambience-only gaps, prefetching the next take. */
  update(dt) {
    if (!this.ctx) return;
    this.blipCool = Math.max(0, this.blipCool - dt);
    const m = this.music, c = this.ctx;
    const list = m.track ? MUSIC[m.track] : null;
    if (!list) return;
    const gap = GAPS[m.track];   // Fixes-2: the gapped tracks (was day-a/day-b only)
    const now = c.currentTime;
    if (m.src) {
      const left = m.endsAt - now;
      const nextFile = list[(m.take + 1) % list.length];
      if (left < 25 && !this.musicBufs.has(nextFile) && !m.prefetching) {
        m.prefetching = true;
        this.#musicBuffer(nextFile).finally(() => { m.prefetching = false; });
      }
      if (left < XFADE) {
        if (gap) {
          // let it end; ambience only for a while (day 30–60 s, dusk 35–70 s, night 40–80 s), then the next take
          this.#fadeOut(m, Math.max(0.5, left));
          m.src = null;
          m.gapUntil = now + gap[0] + Math.random() * (gap[1] - gap[0]);
          m.take = (m.take + 1) % list.length;
        } else {
          const buf = this.musicBufs.get(nextFile);
          if (buf) {
            this.#fadeOut(m, XFADE);
            m.src = null;   // (it's fading: #play below must not fade it again)
            m.take = (m.take + 1) % list.length;
            this.#play(nextFile, buf, XFADE);
          }
        }
      }
    } else if (m.gapUntil && now >= m.gapUntil) {
      m.gapUntil = 0;
      const file = list[m.take];
      const key = m.track, req = m.req;
      this.#musicBuffer(file).then((buf) => { if (buf && m.req === req && m.track === key && !m.src) this.#play(file, buf, 3); });
    }
  }

  // ------------------------------------------------------------ ambience
  /** beds: [{ name, vol }], at most 2. */
  setAmbience(beds) {
    const key = beds.map((b) => b.name + ':' + b.vol.toFixed(2)).join('|');
    if (key === this.ambKey) return;
    this.ambKey = key;
    this.ambWant = beds.slice(0, 2);
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime;
    const wantNames = new Set(this.ambWant.map((b) => b.name));
    for (const [name, a] of this.amb) {
      if (!wantNames.has(name)) {
        a.gain.gain.setTargetAtTime(0, now, 0.8);
        a.src.stop(now + 4);
        this.amb.delete(name);
        setTimeout(() => { if (!this.amb.has(name)) this.ambBufs.delete(name); }, 4200);
      }
    }
    for (const b of this.ambWant) {
      const a = this.amb.get(b.name);
      if (a) { a.gain.gain.setTargetAtTime(b.vol, now, 0.8); continue; }
      this.#ambBuffer(b.name).then((buf) => {
        if (!buf || this.amb.has(b.name) || !this.ambWant.some((w) => w.name === b.name)) return;
        const src = c.createBufferSource();
        src.buffer = buf; src.loop = true;
        const g = c.createGain();
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.setTargetAtTime(this.ambWant.find((w) => w.name === b.name)?.vol ?? b.vol, c.currentTime, 1);
        src.connect(g).connect(this.busAmb);
        src.start(0, Math.random() * buf.duration);
        this.amb.set(b.name, { src, gain: g });
      });
    }
  }

  async #ambBuffer(name) {
    if (this.ambBufs.has(name)) return this.ambBufs.get(name);
    const buf = await this.#decode(BASE + 'amb/' + name + '.mp3').catch(() => null);
    if (!buf) return null;
    const mono = this.#downmix(buf);
    this.ambBufs.set(name, mono);
    while (this.ambBufs.size > 2) {
      const drop = [...this.ambBufs.keys()].find((k) => !this.amb.has(k) && k !== name);
      if (!drop) break;
      this.ambBufs.delete(drop);
    }
    return mono;
  }

  #downmix(buf) {
    if (buf.numberOfChannels === 1) return buf;
    const out = this.ctx.createBuffer(1, buf.length, buf.sampleRate);
    const o = out.getChannelData(0);
    const n = buf.numberOfChannels;
    for (let ch = 0; ch < n; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) o[i] += d[i] / n;
    }
    // smooth the loop seam: a short crossfade of the tail into the head
    const fade = Math.min(Math.floor(buf.sampleRate * 0.25), Math.floor(o.length / 4));
    for (let i = 0; i < fade; i++) { const k = i / fade; o[i] = o[i] * k + o[o.length - fade + i] * (1 - k); }
    return out;
  }

  // ------------------------------------------------------------ effects
  setListener(x, y, z, yaw) { Object.assign(this.listener, { x, y, z, yaw }); }

  #spatial(at, vol, range = 40) {
    if (!at) return { vol, pan: 0 };
    const L = this.listener;
    const dx = at.x - L.x, dz = at.z - L.z, dy = (at.y ?? L.y) - L.y;
    const d = Math.hypot(dx, dy, dz);
    if (d > range) return null;
    const fall = 1 / (1 + (d / (range * 0.18)) ** 2);
    // camera right at yaw is (cos yaw, -sin yaw) in game space (+x east)
    const right = dx * Math.cos(L.yaw) - dz * Math.sin(L.yaw);
    return { vol: vol * fall, pan: Math.max(-0.8, Math.min(0.8, right / Math.max(d, 1))) };
  }

  /** Play a sound file (or a variant group). opts: { vol, rate, at: {x,y,z}, range, offset, duration } */
  play(name, opts = {}) {
    if (!this.ctx || this.paused && !opts.ui) return null;
    const files = SFX_VARIANTS[name];
    let file = name;
    if (files) {
      const last = this.lastVariant[name];
      const pool = files.filter((f) => f !== last);
      file = pool[Math.floor(Math.random() * pool.length)];
      this.lastVariant[name] = file;
    }
    const sp = this.#spatial(opts.at, opts.vol ?? 1, opts.range);
    if (!sp || sp.vol < 0.01) return null;
    const handle = { stopped: false };
    this.#sfxBuffer(file).then((buf) => {
      if (!buf || handle.stopped) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (opts.rate ?? 1) * (files ? 0.94 + Math.random() * 0.12 : 1);
      const g = c.createGain();
      g.gain.value = sp.vol * (SFX_GAIN[file] || 1);
      const p = c.createStereoPanner();
      p.pan.value = sp.pan;
      src.connect(g).connect(p).connect(this.busSfx);
      src.start(0, opts.offset || 0, opts.duration);
      handle.src = src;
    });
    return handle;
  }

  /** A looping effect (engine hum, gang murmur). Returns { setVolume, stop }. */
  loop(name, { vol = 1 } = {}) {
    if (!this.ctx) return { setVolume() {}, stop() {} };
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(this.busSfx);
    const entry = { gain: g, vol: vol * (SFX_GAIN[name] || 1), src: null, stopped: false };
    this.loops.add(entry);
    this.#sfxBuffer(name).then((buf) => {
      if (!buf || entry.stopped) return;
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(g); src.start();
      entry.src = src;
      g.gain.setTargetAtTime(entry.vol, c.currentTime, 0.1);
    });
    return {
      setVolume: (v) => { entry.vol = v * (SFX_GAIN[name] || 1); g.gain.setTargetAtTime(this.paused ? 0 : entry.vol, c.currentTime, 0.1); },
      stop: () => { entry.stopped = true; g.gain.setTargetAtTime(0, c.currentTime, 0.1); try { entry.src?.stop(c.currentTime + 0.4); } catch { /* */ } this.loops.delete(entry); },
    };
  }

  /** Fixes-3 (B2, B3): stop every looping effect (a load or quitting to the title: a jammed cab horn, an engine, the
   *  chopper must not play on over the title or into the next game). Their owners' handles become no-ops. */
  stopLoops() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const e of [...this.loops]) { e.stopped = true; e.gain.gain.setTargetAtTime(0, t, 0.05); try { e.src?.stop(t + 0.2); } catch { /* */ } }
    this.loops.clear();
  }

  voice(name, opts = {}) { return this.play(name, { vol: 1, ...opts }); }

  /** One chatter blip for the typewriter: a short slice of the species' voice, pitched. */
  blip(base = 'coo', pitch = 1) {
    if (!this.ctx || this.blipCool > 0) return;
    this.blipCool = 0.07;
    this.#sfxBuffer(base).then((buf) => {
      if (!buf) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * 0.35);
      const g = c.createGain();
      const t = c.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.32, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      src.connect(g).connect(this.busSfx);
      src.start(t, Math.min(buf.duration * 0.6, 0.05 + Math.random() * buf.duration * 0.4), 0.08);
    });
  }

  // ------------------------------------------------------------ made in code
  #tone({ type = 'sine', f = 440, f2 = null, t0 = 0, dur = 0.15, vol = 0.3, attack = 0.005, bus = this.busSfx, detune = 0 }) {
    const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  #noise({ t0 = 0, dur = 0.03, vol = 0.2, hp = 2000 }) {
    const c = this.ctx, t = c.currentTime + t0;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.busSfx);
    s.start(t);
  }

  /** Batch-2 (#13): a rising shimmer over `dur` s (the open-sky warp). Returns { stop() } (a fade), or null without audio. */
  swell(dur = 2.6) {
    const c = this.ctx;
    if (!c) return null;
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + dur);
    g.connect(this.busSfx);
    const oscs = [196, 293.66, 392, 587.33].map((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 2, t + dur);
      o.detune.value = (i - 1.5) * 7;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5 + i * 1.3; lg.gain.value = 14;
      lfo.connect(lg).connect(o.detune);
      o.connect(g); o.start(t); lfo.start(t);
      return [o, lfo];
    });
    let done = false;
    const stop = () => {
      if (done) return; done = true;
      const n = c.currentTime;
      g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.08);
      for (const [o, l] of oscs) { o.stop(n + 0.5); l.stop(n + 0.5); }
    };
    setTimeout(stop, (dur + 3) * 1000);   // a safety net only: the warp (or a cancel) stops it first
    return { stop };
  }

  /** Synthesized sounds. kind: uiMove uiSelect uiBack tick staminaLow ding napChime phoneRing carAlarm jingle bikeBell boing meterTick. wobble: Mimic's pitch wobble. */
  synth(kind, { wobble = false, vol = 1 } = {}) {
    if (!this.ctx) return;
    const w = wobble ? 30 : 0;
    const dt = () => (wobble ? (Math.random() - 0.5) * 60 : 0);
    switch (kind) {
      case 'uiMove': this.#tone({ type: 'triangle', f: 760, dur: 0.05, vol: 0.12 * vol }); break;
      case 'uiSelect': this.#tone({ type: 'triangle', f: 660, dur: 0.07, vol: 0.16 * vol }); this.#tone({ type: 'triangle', f: 990, t0: 0.06, dur: 0.1, vol: 0.16 * vol }); break;
      case 'uiBack': this.#tone({ type: 'triangle', f: 700, dur: 0.07, vol: 0.14 * vol }); this.#tone({ type: 'triangle', f: 470, t0: 0.06, dur: 0.1, vol: 0.14 * vol }); break;
      case 'tick': this.#noise({ dur: 0.012, vol: 0.06 * vol, hp: 3500 }); break;
      case 'staminaLow': this.#tone({ f: 520, dur: 0.09, vol: 0.12 }); this.#tone({ f: 520, t0: 0.14, dur: 0.09, vol: 0.12 }); break;
      case 'ding': this.#tone({ f: 1320, dur: 0.9, vol: 0.2 }); this.#tone({ f: 2640, dur: 0.5, vol: 0.07 }); break;
      case 'meterTick': this.#tone({ type: 'triangle', f: 880, dur: 0.12, vol: 0.15 }); this.#tone({ type: 'sine', f: 1760, t0: 0.03, dur: 0.18, vol: 0.06 }); break;
      case 'napChime': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.#tone({ f, t0: i * 0.22, dur: 1.4, vol: 0.12 })); break;
      case 'phoneRing':
        for (let r = 0; r < 2; r++) for (let k = 0; k < 16; k++) {
          this.#tone({ type: 'square', f: (k % 2 ? 480 : 440), t0: r * 1.6 + k * 0.05, dur: 0.05, vol: 0.06 * vol, detune: dt() });
        }
        break;
      case 'carAlarm':
        for (let k = 0; k < 6; k++) this.#tone({ type: 'sawtooth', f: 600, f2: 1400, t0: k * 0.32, dur: 0.3, vol: 0.06 * vol, detune: dt() });
        for (let k = 0; k < 6; k++) this.#tone({ type: 'square', f: 900, t0: 2 + k * 0.18, dur: 0.12, vol: 0.05 * vol, detune: dt() });
        break;
      case 'jingle': this.jingle({ wobble, vol }); break;
      case 'needleScratch': this.#tone({ type: 'sawtooth', f: 2400, f2: 160, dur: 0.22, vol: 0.12 * vol }); this.#noise({ dur: 0.18, vol: 0.25 * vol, hp: 1200 }); this.#tone({ type: 'sawtooth', f: 300, f2: 1900, t0: 0.2, dur: 0.12, vol: 0.08 * vol }); break;   // 3b
      case 'bikeBell': for (const t0 of [0, 0.16]) { this.#tone({ f: 2200, t0, dur: 0.5, vol: 0.12 * vol, detune: dt() }); this.#tone({ f: 3410, t0, dur: 0.35, vol: 0.06 * vol }); } break;
      case 'boing': {
        const o = this.#tone({ f: 180, f2: 620, dur: 0.45, vol: 0.22 });
        const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain();
        lfo.frequency.value = 18; lg.gain.value = 60; lfo.connect(lg).connect(o.frequency);
        lfo.start(); lfo.stop(this.ctx.currentTime + 0.5);
        break;
      }
      case 'warpArrive': [392, 523.25, 783.99, 1046.5].forEach((f, i) => this.#tone({ type: 'sine', f: f * 1.5, f2: f, t0: i * 0.05, dur: 1.1, vol: 0.09 * vol, detune: (i - 1.5) * 9 })); this.#noise({ dur: 0.5, vol: 0.05 * vol, hp: 5000 }); break;   // Batch-2 (#13)
      case 'whistle': this.#tone({ f: 2300, f2: 2600, dur: 0.35, vol: 0.12 * vol, detune: dt() }); this.#tone({ f: 2600, f2: 2000, t0: 0.4, dur: 0.4, vol: 0.12 * vol }); break;
      default: break;
    }
    return w;
  }

  /**
   * The ice-cream truck's jingle: an original 8-bar music-box melody (C major,
   * 4 beats a bar at 152 bpm), written as notes. Mimic plays it with a wobble.
   */
  jingle({ wobble = false, vol = 1 } = {}) {
    if (!this.ctx) return;
    const beat = 60 / 152;
    // [midi note, beats]
    const tune = [
      [67, 1], [72, 1], [76, 1], [72, 1], /* 1 */ [74, 1], [77, 1], [76, 1], [74, 1], /* 2 */
      [72, 1], [76, 1], [79, 1], [76, 1], /* 3 */ [77, 1], [74, 1], [71, 1], [67, 1], /* 4 */
      [69, 1], [72, 1], [77, 1], [81, 1], /* 5 */ [79, 1], [76, 1], [72, 1], [76, 1], /* 6 */
      [74, 1], [77, 1], [76, 0.5], [74, 0.5], [71, 1], /* 7 */ [72, 2], [67, 1], [72, 1], /* 8 */
    ];
    let t = 0;
    for (const [n, b] of tune) {
      const f = 440 * 2 ** ((n - 69) / 12);
      const det = wobble ? (Math.random() - 0.5) * 70 : 0;
      this.#tone({ type: 'sine', f, t0: t, dur: beat * b * 1.6, vol: 0.14 * vol, detune: det });
      this.#tone({ type: 'triangle', f: f * 2, t0: t, dur: beat * b * 0.7, vol: 0.05 * vol, detune: det });
      t += beat * b;
    }
    // a soft bass on the bar's first beat
    const bass = [48, 53, 48, 55, 53, 48, 55, 48];
    bass.forEach((n, i) => this.#tone({ type: 'triangle', f: 440 * 2 ** ((n - 69) / 12), t0: i * 4 * beat, dur: beat * 2, vol: 0.07 * vol }));
  }

  // ------------------------------------------------------------ debug
  state() {
    let bytes = 0;
    const count = (b) => { if (b) bytes += b.length * b.numberOfChannels * 4; };
    for (const b of this.musicBufs.values()) count(b);
    for (const b of this.ambBufs.values()) count(b);
    let sfxBytes = 0;
    return {
      context: this.ctx ? this.ctx.state : 'none',
      musicMuted: this.settings.muted || this.settings.music === 0,
      sfxMuted: this.settings.muted || this.settings.sfx === 0,
      muted: this.settings.muted,
      music: { track: this.music.track, file: this.music.file, decoded: [...this.musicBufs.keys()], inGap: !!this.music.gapUntil },
      ambience: { playing: [...this.amb.keys()], decoded: [...this.ambBufs.keys()] },
      decodedBytes: bytes,
      sfxDecoded: this.sfx.size, sfxBytes,
    };
  }
}
