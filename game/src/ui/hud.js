// The gameplay HUD ("Screens"):
//   top-left   feathers, the stamina wing ring round the Ally-wheel portrait,
//              the carried-item slot (a slice shows a cooling ring), and the
//              one-line "Current goal" (dismissible)
//   top-centre the compass strip: scheme targets, Nests, dropped items, "?" pings, the waypoint
//   top-right  map / board / speaker / pause buttons, crumbs, flock, Crews and
//              Parts, the meters of the lanes that have appeared, the time of day
//   near Gus   the context prompt ("□ Give slice") and the tutorial prompts
//   toasts     small notes when a meter ticks or something happens
// Plain HTML/SVG over the canvas, so the text scanner can read it.

import { icon, itemIcon, phaseIcon } from './icons.js';
import { glyph } from './glyphs.js';
import { THREADS } from '../data/threads.js';
import { CREW_COUNT } from '../data/crews.js';
import { ITEM_DEFS } from '../systems/items.js';

const R = 31, CIRC = 2 * Math.PI * R;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor(G) {
    this.G = G;
    const el = this.el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="tl">
        <div class="portrait" title="Ally wheel">
          <img alt="" src="assets/portraits/gus.webp">
          <svg viewBox="0 0 70 70"><circle class="trk" cx="35" cy="35" r="${R}"/><circle class="stam" cx="35" cy="35" r="${R}" stroke-dasharray="${CIRC} ${CIRC}" transform="rotate(-90 35 35)"/></svg>
          <span class="rkey"></span>
        </div>
        <div class="feathers"></div>
        <div class="carry"><div class="slot empty"><svg class="ring" viewBox="0 0 46 46"><circle cx="23" cy="23" r="20" stroke="rgba(255,255,255,0.25)"/><circle class="cool" cx="23" cy="23" r="20" stroke="#ef8a3c" stroke-dasharray="125.7 125.7"/></svg><span class="ico"></span></div><span class="lbl"></span></div>
        <div class="goal off"><button type="button" class="x" aria-label="Hide goal">${icon('close')}</button><b></b><span class="obst"></span></div>
      </div>
      <div id="compass"><div class="mid"></div><div class="marks"></div></div>
      <div id="toasts"></div>
      <div class="tr">
        <div class="btns">
          <button type="button" class="hb" data-act="map" aria-label="Map">${icon('map')}</button>
          <button type="button" class="hb" data-act="board" aria-label="Scheme Board">${icon('board')}</button>
          <button type="button" class="hb" data-act="mute" aria-label="Sound">${icon('speaker')}</button>
          <button type="button" class="hb" data-act="pause" aria-label="Pause">${icon('pause')}</button>
        </div>
        <div class="stats">
          <span class="chip crumbs" title="Crumbs">${icon('crumb')}<b>0</b></span>
          <span class="chip flock" title="Flock">${icon('pigeon')}<b>0</b></span>
          <span class="chip crews" title="Crews and Mecha parts">${icon('paw')}<b>0/17</b>${icon('part')}<b class="parts">0/8</b></span>
          <span class="chip phase" title="Time of day"></span>
        </div>
        <div class="meters"></div>
      </div>
      <div id="prompt"></div>
      <div id="tutor"></div>
      <div id="flighthints"></div>
      <div id="panel"></div>
      <div id="drivehud"><div class="dial"><svg viewBox="0 0 120 70"><path class="trk" d="M10 64 A50 50 0 0 1 110 64"/><path class="val" d="M10 64 A50 50 0 0 1 110 64" pathLength="100" stroke-dasharray="0 100"/></svg><b class="spd">0</b><span class="unit">m/s</span><span class="vn"></span></div><div class="hopper"><span class="hl">Hopper</span><span class="bar"><i></i></span></div><div class="dp"></div></div>`;
    document.body.appendChild(el);
    const $ = (s) => el.querySelector(s);
    this.$ = { portrait: $('.portrait'), pimg: $('.portrait img'), stam: $('.stam'), rkey: $('.rkey'), feathers: $('.feathers'), slot: $('.slot'), cool: $('.cool'), slotIco: $('.slot .ico'), carryLbl: $('.carry .lbl'), goal: $('.goal'), goalT: $('.goal b'), goalO: $('.goal .obst'), marks: $('#compass .marks'), toasts: $('#toasts'), crumbs: $('.chip.crumbs b'), crumbsChip: $('.chip.crumbs'), flock: $('.chip.flock b'), crews: $('.chip.crews b'), parts: $('.chip.crews .parts'), tod: $('.chip.phase'), meters: $('.meters'), prompt: $('#prompt'), tutor: $('#tutor'), flight: $('#flighthints'), mute: $('[data-act="mute"]'), panel: $('#panel'), drive: $('#drivehud'), spd: $('#drivehud .spd'), dial: $('#drivehud .val'), vn: $('#drivehud .vn'), hop: $('#drivehud .hopper'), hopBar: $('#drivehud .hopper i'), dp: $('#drivehud .dp') };
    el.querySelector('.btns').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'map') G.openMenu('map');
      else if (a === 'board') G.openMenu('board');
      else if (a === 'pause') G.pause();
      else if (a === 'mute') G.toggleMute();
    });
    this.$.portrait.addEventListener('click', () => G.wheel?.toggleTap());
    this.$.goal.querySelector('.x').addEventListener('click', () => { this.goalHidden = this.goalKey; this.$.goal.classList.add('off'); });
    this.goalHidden = null;
    this.last = {};
    this.toastList = [];
    this.toastQueue = [];   // polish (P3): waiting toasts (see toast())
    this.G = G;
    this.compassPool = [];
    for (let i = 0; i < 4; i++) this.$.feathers.insertAdjacentHTML('beforeend', '');
  }

  show(on) { this.el.classList.toggle('on', on); }

  /** Called every rendered frame with the current view of the game. */
  update(dt, v) {
    const $ = this.$, L = this.last;
    // stamina ring
    const s = v.stamina;
    if (Math.abs((L.stam ?? -1) - s) > 0.002) { $.stam.style.strokeDashoffset = (CIRC * (1 - s)).toFixed(2); L.stam = s; }
    $.portrait.classList.toggle('low', s < 0.2);
    $.portrait.classList.toggle('boost', v.boosting);
    if (L.portrait !== v.portrait) { $.pimg.src = `assets/portraits/${v.portrait}.webp`; L.portrait = v.portrait; }
    const dev = v.device + v.family;
    if (L.dev !== dev) { $.rkey.innerHTML = glyph('wheel', v.device, v.family); L.dev = dev; }
    // feathers
    if (L.feathers !== v.feathers) {
      $.feathers.innerHTML = [0, 1, 2].map((i) => icon('featherOn', i < v.feathers ? 'ic' : 'ic off')).join('');
      L.feathers = v.feathers;
    }
    // carried item. fix-19: the label is the name + Hot / Cooling, still counts / Cold, built from ONE key (the suffix was
    // only written when the ring changed, so a new item with the same ring value kept a bare or stale label), and a Drop
    // hint under it in the device's glyph (the owner: "stuck on your face with no obvious way to drop it")
    const c = v.carried;
    if (!!c !== !L.slotOn) { $.slot.classList.toggle('empty', !c); L.slotOn = !!c; }
    const ckey = c ? c.id : '';
    if (L.carry !== ckey) { $.slotIco.innerHTML = c ? itemIcon(c.id) : ''; L.carry = ckey; }
    const heat = c && c.heat != null ? c.heat : null;
    // Land/perf: written only when they change
    const hk = heat == null ? 'none' : (125.7 * (1 - heat)).toFixed(1);
    if (L.heat !== hk) {
      L.heat = hk;
      $.cool.style.display = heat == null ? 'none' : '';
      if (heat != null) $.cool.style.strokeDashoffset = hk;
    }
    const lk = c ? `${c.id}|${c.word || ''}|${dev}` : '';
    if (L.lbl !== lk) {
      L.lbl = lk;
      $.carryLbl.classList.toggle('cold', c?.word === 'Cold');
      $.carryLbl.innerHTML = c ? `<b>${ITEM_DEFS[c.id]?.name || c.id}${c.word ? ' · ' + c.word : ''}</b><small>${glyph('drop', v.device, v.family)} Drop</small>` : '';
    }
    // current goal
    const g = v.goal;
    const gk = g ? g.key : '';
    if (L.goal !== gk) {
      L.goal = gk;
      if (g && this.goalHidden !== gk) {
        $.goalT.textContent = g.goal;
        $.goalO.textContent = g.obstacle || '';
        $.goal.classList.remove('off');
      } else $.goal.classList.add('off');
    }
    // stats
    if (L.crumbs !== v.crumbs) { if (L.crumbs != null && v.crumbs > L.crumbs) this.bump($.crumbsChip); $.crumbs.textContent = v.crumbs; L.crumbs = v.crumbs; }
    if (L.flock !== v.flock) { $.flock.textContent = v.flock; L.flock = v.flock; }
    const cp = `${v.crews}/${CREW_COUNT}|${v.parts}/8`;
    if (L.cp !== cp) { $.crews.textContent = `${v.crews}/${CREW_COUNT}`; $.parts.textContent = `${v.parts}/8`; L.cp = cp; }
    if (L.phase !== v.phase) { $.tod.innerHTML = phaseIcon(v.phase) + `<b>${v.phaseLabel}</b>`; L.phase = v.phase; }
    const mk = v.meters.map((m) => m.id + m.value).join('|');
    if (L.meters !== mk) {
      $.meters.innerHTML = v.meters.map((m) => `<span class="chip" title="${esc(m.label)}">${icon(m.icon)}<b>${esc(m.label)} ${m.value}/${m.max}</b></span>`).join('');
      L.meters = mk;
    }
    if (L.muted !== v.muted) { $.mute.innerHTML = icon(v.muted ? 'muted' : 'speaker'); L.muted = v.muted; }
    // compass
    this.#compass(v.compass, v.camYaw);
    // the encounter / race panel under the compass (fights.js, race.js and the rest fill it)
    const pk = v.panel || '';
    if (L.panel !== pk) { $.panel.innerHTML = pk; $.panel.classList.toggle('on', !!pk); this.el.classList.toggle('panelon', !!pk); L.panel = pk; }
    // the driving HUD: a speed dial, and on the Zamboni the hopper gauge and the Dump/Spray prompt
    const dr = v.drive;
    $.drive.classList.toggle('on', !!dr);
    if (dr) {
      const sp = Math.abs(dr.speed);
      const st = sp.toFixed(1);
      if (L.spd !== st) { $.spd.textContent = st; $.dial.setAttribute('stroke-dasharray', `${Math.min(100, (sp / dr.top) * 100).toFixed(1)} 100`); L.spd = st; }
      if (L.vn !== dr.name) { $.vn.textContent = dr.name; L.vn = dr.name; }
      $.hop.style.display = dr.hopper == null ? 'none' : '';
      if (dr.hopper != null) { $.hopBar.style.width = `${Math.round(dr.hopper * 100)}%`; $.hop.classList.toggle('full', dr.hopper >= 1); }
      const dpk = dr.prompt || '';
      if (L.dp !== dpk) { $.dp.innerHTML = dpk; L.dp = dpk; }
    }
    // prompts near Gus
    const sp = v.gusScreen;
    if (v.prompt && sp) {
      if (L.prompt !== v.prompt) { $.prompt.innerHTML = v.prompt; L.prompt = v.prompt; }
      const pl = `${Math.round(sp.x)}px`, pt = `${Math.round(Math.max(sp.y + 34, (v.gusFeetY ?? 0) + 10))}px`;   // Fixes-1: below his feet when the camera is close
      if (L.pl !== pl) { $.prompt.style.left = pl; L.pl = pl; }   // Land/perf: style writes only when it moved a pixel
      if (L.pt !== pt) { $.prompt.style.top = pt; L.pt = pt; }
      if (!L.promptOn) { $.prompt.classList.add('on'); L.promptOn = true; }
    } else if (L.promptOn !== false) { $.prompt.classList.remove('on'); L.promptOn = false; }
    if (v.tutor && sp) {
      if (L.tutor !== v.tutor) { $.tutor.innerHTML = v.tutor; L.tutor = v.tutor; }
      const tl = `${Math.round(sp.x)}px`, tt = `${Math.round(sp.y - 56)}px`;
      if (L.tl !== tl) { $.tutor.style.left = tl; L.tl = tl; }
      if (L.tt !== tt) { $.tutor.style.top = tt; L.tt = tt; }
      if (!L.tutorOn) { $.tutor.classList.add('on'); L.tutorOn = true; }
    } else if (L.tutorOn !== false) { $.tutor.classList.remove('on'); L.tutorOn = false; }
    // Flight hints: a fixed strip at the bottom centre while flying (Flap, Land, Boost; each drops out once learnt).
    // It never moves; it fades (ui.css), and keeps its last text while fading out.
    const fh = v.flight || '';
    if (fh && L.fh !== fh) { $.flight.innerHTML = fh; L.fh = fh; }
    if (L.fhOn !== !!fh) { $.flight.classList.toggle('on', !!fh); L.fhOn = !!fh; }
  }

  /** Toasts age on the game clock (each fixed update), so stepped runs see what a player sees. */
  tickToasts(dt) {
    for (const t of this.toastList) t.t -= dt;
    while (this.toastList.length && this.toastList[0].t <= 0) { this.toastList.shift().el.remove(); }
    for (const q of this.toastQueue) q.wait += dt;
    // a note that waited through a long scene is stale; rewards (stamps) still show
    this.toastQueue = this.toastQueue.filter((q) => q.kind === 'stamp' || q.wait < 40);
    this.#drainToasts();
  }

  /** polish (P3): while a cutscene or dialogue holds the screen, only that scene's own toasts ({ now: true }) show; the
   *  rest wait and come one after another once it's over, at most two on screen at a time. They age on the game clock. */
  #drainToasts() {
    const G = this.G;
    const busy = !!(G.cutscene?.locked || G.dialogue?.open);   // (a scene that gave control back doesn't hold them)
    while (this.toastQueue.length && this.toastList.length < 2) {
      const i = busy ? this.toastQueue.findIndex((q) => q.now) : 0;
      if (i < 0) break;
      const [q] = this.toastQueue.splice(i, 1);
      const el = document.createElement('div');
      el.className = 'toast ' + q.kind;
      el.textContent = q.text;
      this.$.toasts.appendChild(el);
      this.toastList.push({ el, t: q.seconds, text: q.text });
    }
  }

  bump(chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  flashCrumbs() { const c = this.$.crumbsChip; c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }

  #compass(marks, camYaw) {
    const box = this.$.marks;
    const html = [];
    const span = Math.PI / 2;   // ±90°
    const card = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]];
    const letters = [];   // playtest: where the cardinal letters sit (%), so distance labels never print over them
    for (const [l, a] of card) {
      const rel = wrap(a - camYaw);
      if (Math.abs(rel) < span) { const x = 50 + (rel / span) * 50; letters.push(x); html.push(['tick', x.toFixed(1), '', l]); }
    }
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2 / 2;
      const rel = wrap(a - camYaw);
      if (k % 2 === 0 && Math.abs(rel) < span) html.push(['tick minor', (50 + (rel / span) * 50).toFixed(1), '', '']);
    }
    // playtest: one distance label per stretch of the strip (the nearest mark's), none over a cardinal letter
    const labelled = [];
    const order = marks.map((m, i) => i).sort((a, b) => (marks[a].dist ?? 1e9) - (marks[b].dist ?? 1e9));
    const showDist = new Set();
    for (const i of order) {
      const m = marks[i];
      if (m.dist == null) continue;
      const rel = wrap(m.bearing - camYaw);
      if (Math.abs(rel) > span * 0.96) continue;
      const x = 50 + (rel / span) * 50;
      if (labelled.some((q) => Math.abs(q - x) < 13) || letters.some((q) => Math.abs(q - x) < 7)) continue;
      labelled.push(x); showDist.add(i);
    }
    marks.forEach((m, i) => {
      let rel = wrap(m.bearing - camYaw);
      const edge = Math.abs(rel) > span * 0.96;
      if (edge) rel = Math.sign(rel) * span * 0.96;
      html.push(['mk', (50 + (rel / span) * 50).toFixed(1), edge ? '0.55' : '', `${icon(m.icon)}${showDist.has(i) ? `<span class="d">${m.dist} m</span>` : ''}`]);
    });
    // Land/perf: the strip's spans are kept and only what changed is written (it was a full innerHTML rewrite on every
    // frame the camera turned: new nodes, style and layout each frame)
    const kids = box.children;
    while (kids.length < html.length) box.appendChild(document.createElement('span'));
    while (kids.length > html.length) box.lastChild.remove();
    for (let i = 0; i < html.length; i++) {
      const [cls, left, op, inner] = html[i], el = kids[i], c = el._c || (el._c = {});
      if (c.cls !== cls) { el.className = cls; c.cls = cls; }
      if (c.left !== left) { el.style.left = left + '%'; c.left = left; }
      if (c.op !== op) { el.style.opacity = op; c.op = op; }
      if (c.inner !== inner) { el.innerHTML = inner; c.inner = inner; }
    }
  }

  toast(text, { kind = '', seconds = 2.6, now = false } = {}) {
    if (this.toastList.some((t) => t.text === text) || this.toastQueue.some((q) => q.text === text)) return;
    // a scene's own note jumps the queue; a full screen makes room for it
    if (now && this.toastList.length >= 2) this.toastList.shift().el.remove();
    this.toastQueue.push({ text, kind, seconds, now, wait: 0 });
    while (this.toastQueue.length > 5) this.toastQueue.splice(Math.max(0, this.toastQueue.findIndex((q) => q.kind !== 'stamp')), 1);
    this.#drainToasts();
  }

  clearToasts() { for (const t of this.toastList) t.el.remove(); this.toastList = []; this.toastQueue = []; }
}

export function metersFor(state, d) {
  const out = [];
  for (const t of THREADS) {
    if (!state.lanes.includes(t.id)) continue;
    out.push({ id: t.id, label: t.meter.label, value: d[t.meter.of], max: t.meter.max, icon: t.icon });
  }
  return out;
}
