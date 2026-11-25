// The Scheme Board (J): a cork board with up to five lanes, one per thread,
// each appearing (with a 5 s antagonist intro) when its first card opens.
// Each lane header: the thread's name, one-line goal, icon and meter. Under
// it, polaroid cards for open and finished schemes: goal and obstacle, the
// phase it needs ("Nap until Dusk"), the crumb cost and tags for other
// threads' friends it uses (fix-39: no red string; the tag says it). A header
// strip shows the finale gate. Layered hints: card → a regular's nudge after
// ~3 minutes on a step → "Ask the Elders".

import { SCHEME, SCHEMES } from '../data/schemes.js';
import { THREADS, THREAD } from '../data/threads.js';
import { CREW, CHARACTERS, PHASE_LABEL, CREW_COUNT, portraitOf } from '../data/crews.js';
import { icon } from './icons.js';
import { overlay } from './menu.js';
import { derived } from '../state/gamestate.js';

// fun pass (P1): how a card names another thread's friend before the nudge
const FRIEND_FROM = { sign: 'the Sign War', slice: 'the Slice Run', spikes: 'the Spikes fight', feuds: 'Feuds & Truces', lost: 'the Lost & Found' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function boardScreen(G) {
  // Fixes-3 (bughunter-2 B6): opened from Pause, Back goes back to Pause (closeMenus unpaused a controller player)
  const leave = () => { if (G.menus.stack.length > 1) G.menus.pop(); else G.closeMenus(); };
  const el = overlay('board', `
    <div class="head"><h2>Scheme Board</h2><span class="gate"></span><span class="sp"></span>
      <button type="button" class="btn small" data-act="elders">${icon('elders')}<span>Ask the Elders</span></button>
      <button type="button" class="btn small" data-act="roster">${icon('roster')}<span>Crews</span></button>
      <button type="button" class="btn small" data-act="collection">${icon('postcard')}<span>Collection</span></button>
      <button type="button" class="btn small" data-act="close">${icon('close')}<span>Close</span></button></div>
    <div class="lanes"></div>
    <div class="foot"><span class="todo"></span><span class="elders-out" style="color:#fff8ea;font-weight:700;max-width:60%"></span><div class="hints" data-auto='[["uiOk","Track / select"],["uiBack","Close"]]'></div></div>`);
  const lanes = el.querySelector('.lanes');
  const gate = el.querySelector('.gate');
  const eldersOut = el.querySelector('.elders-out');
  const todo = el.querySelector('.todo');
  // guidance (ui/guide.js): the nearest thing to do now (or the nap that opens one), on request, so no cooldown
  const todoLine = () => {
    const p = !showCollection && G.guide?.boardLine();
    todo.innerHTML = p ? `<span><b>Something to do:</b>${p.title ? ` <small class="sch">${esc(p.title)}</small>` : ''} ${esc(p.text)}</span>${p.id && p.id !== G.state.tracked && G.schemes.isOpen(p.id) ? `<button type="button" class="btn small" data-act="track" data-id="${p.id}">Track it</button>` : ''}` : '';
  };
  let introT = 0;

  const card = (id, done) => {
    const s = SCHEME[id];
    const E = G.schemes;
    const step = E.step(id);
    const info = E.cardInfo(id);
    const rot = ((id.length * 37) % 5) - 2;
    const tracked = G.state.tracked === id;
    let body = '';
    const shot = G.boardShots?.[id];   // 3b: a photo pinned to the card (the Wedding's shot of the century)
    if (shot) body += `<img alt="" src="${shot}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;margin:4px 0 6px;border:4px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">`;
    if (done) body += `<div class="ob">${esc(doneLine(s))}</div>`;
    else if (step) {
      body += `<div class="st">Step ${E.stepIndex(id) + 1} of ${s.steps.length}</div><div class="gl">${esc(step.goal)}</div>${step.obstacle ? `<div class="ob">${esc(step.obstacle)}</div>` : ''}`;
      if (E.nudgeShown(id) && step.nudge) body += `<div class="nd"><b>${esc(CHARACTERS[step.nudge.by]?.name)}:</b> ${esc(step.nudge.text)}</div>`;
      if (G.ui.eldersFor === id) { const a = E.eldersAnswer(id); body += `<div class="an">${a.icon ? `<img src="assets/portraits/${portraitOf(CREW[a.icon]?.boss, G.state)}.webp" alt="" style="width:26px;height:26px;border-radius:50%;vertical-align:middle;margin-right:4px">` : ''}${esc(a.text)}</div>`; }
      const tags = [];
      if (info.phases) tags.push(`<span class="tag phase">${phaseTag(info.phases)}</span>`);
      if (info.crumbs) tags.push(`<span class="tag cost">${info.crumbs} crumbs${G.state.crumbs < info.crumbs ? ` (you have ${G.state.crumbs})` : ''}</span>`);
      if (info.flock) tags.push(`<span class="tag cost">Flock ${info.flock}: you have ${derived(G.state).flock}</span>`);
      // Fun pass (P1): no ally names until the nudge (or the Elders): a friend from another thread is a riddle-level hint
      for (const t of info.tags) {
        if (info.revealed) tags.push(`<span class="tag">${esc(CREW[t.crew].short)}${t.other ? ' · ' + esc(THREAD[t.thread]?.name.replace('The ', '')) : ''}</span>`);
        else if (t.other && THREAD[t.thread]) tags.push(`<span class="tag friend">${icon(THREAD[t.thread].icon)}A friend from ${esc(FRIEND_FROM[t.thread] || THREAD[t.thread].name)}</span>`);
      }
      if (tags.length) body += `<div class="tags">${tags.join('')}</div>`;
      const acts = [];
      acts.push(`<button type="button" class="btn small" data-act="track" data-id="${id}">${tracked ? 'Tracking' : 'Track'}</button>`);
      if (info.napTo) acts.push(`<button type="button" class="btn small${G.napBlocked() ? ' dis' : ''}" data-act="napto" data-phase="${info.napTo}">${icon('zzz')}Nap until ${PHASE_LABEL[info.napTo]}</button>`);
      body += `<div class="acts">${acts.join('')}</div>`;
    }
    return `<div class="pc${done ? ' done' : ''}${tracked ? ' tracked' : ''}" style="--r:${rot}deg" data-card="${id}" tabindex="0"><div class="ti">${esc(s.title)}</div>${body}</div>`;
  };

  let showCollection = false;
  const collection = () => {
    const c = G.collect.completion();
    const P = G.collect.P || {};
    const cards = Object.values(P).map((p) => {
      const got = G.state.postcards.includes(p.id), shot = G.collect.shots[p.id];
      return `<div class="pc pcard${got ? '' : ' todo'}" style="--r:${((p.id.length * 37) % 5) - 2}deg"><div class="ti">${esc(p.name)}</div>${got ? (shot ? `<img alt="" src="${shot}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;margin-top:4px">` : '<div class="ob">Collected.</div>') : '<div class="ob">Not yet.</div>'}</div>`;
    }).join('');
    // #44: "New!" on the rows the bagel update added to, for a save from before it (flag news.bagels.old), until they're full
    const fresh = (r) => G.state.flags['news.bagels.old'] && ['postcards', 'scarves'].includes(r.id) && r.have < r.of;
    const rows = c.rows.map((r) => `<div class="m"><span>${esc(r.label)} ${r.have}/${r.of}${fresh(r) ? ' <b class="new">New!</b>' : ''}</span><span class="bar"><i style="width:${Math.min(100, (r.have / r.of) * 100)}%"></i></span></div>`).join('');
    return `<div class="lane"><div class="lh"><div class="t">${icon('postcard')}<span>${c.complete ? 'COMPLETIONIST' : 'Completionist'}</span></div><div class="g">Everything to find in the park.</div>${rows}</div></div>
      <div class="lane" style="grid-column: span 3"><div class="lh"><div class="t">${icon('postcard')}<span>Park Postcards ${G.state.postcards.length}/${Object.keys(P).length}</span></div><div class="g">Little park moments.</div></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${cards}</div></div>`;
  };

  const render = () => {
    const st = G.state, d = derived(st);
    todoLine();
    if (showCollection) { gate.textContent = `Crews ${d.crews}/${CREW_COUNT} · Parts ${d.parts}/8`; lanes.innerHTML = collection(); eldersOut.textContent = ''; G.menus.refreshHints(); return; }
    gate.textContent = `Crews ${d.crews}/${CREW_COUNT} · Parts ${d.parts}/8`;
    const open = G.schemes.openList(), done = G.schemes.doneList();
    const html = [];
    for (const t of THREADS) {
      if (!st.lanes.includes(t.id)) continue;
      const cards = SCHEMES.filter((s) => s.thread === t.id && (open.includes(s.id) || done.includes(s.id)));
      const m = t.meter, val = d[m.of];
      html.push(`<div class="lane" data-lane="${t.id}"><div class="lh"><div class="t">${icon(t.icon)}<span>${esc(t.name)}</span></div><div class="g">${esc(t.goal)}</div><div class="m"><span>${esc(m.label)} ${val}/${m.max}</span><span class="bar"><i style="width:${Math.min(100, (val / m.max) * 100)}%"></i></span></div></div>
        ${cards.filter((s) => open.includes(s.id)).map((s) => card(s.id, false)).join('')}
        ${cards.filter((s) => done.includes(s.id)).map((s) => card(s.id, true)).join('')}</div>`);
    }
    if (!html.length) html.push(`<div class="lane"><div class="lh"><div class="t">${icon('board')}<span>Nothing pinned yet</span></div><div class="g">Schemes show up here as Gus gets ideas. Look around the Pond.</div></div></div>`);
    lanes.innerHTML = html.join('');
    eldersOut.textContent = '';
    G.menus.refreshHints();
  };

  const s = {
    id: 'board', el,
    open(arg) {
      G.audio.play('paper-rustle', { ui: true });
      G.ui.eldersFor = null;
      render();
      const t = arg?.intro === 'pending' ? G.ui.introQueue.shift() : arg?.intro;
      if (t && THREAD[t]) s.intro(t);
    },
    reopen() { render(); },
    intro(thread) {
      const t = THREAD[thread];
      const div = document.createElement('div');
      div.className = 'intro';
      div.innerHTML = `<div class="box">${t.antagonist.portrait ? `<img src="assets/portraits/${t.antagonist.portrait}.webp" alt="">` : icon(t.icon)}<div><h3 style="margin:0">${esc(t.name)}</h3><p>${esc(t.antagonist.line)}</p></div></div>`;
      div.addEventListener('click', () => { introT = 0.001; });
      el.querySelector('.card').appendChild(div);
      introT = 5;
    },
    tick(dt) {
      if (introT > 0) { introT -= dt; if (introT <= 0) el.querySelector('.intro')?.remove(); }
      else if (G.ui.introQueue.length) s.intro(G.ui.introQueue.shift());   // the next new lane's intro
    },
    handleInput(inp) {
      if (inp.pressed('board') && !inp.pressed('uiUp')) { leave(); return true; }
      if (introT > 0 && (inp.pressed('uiOk') || inp.pressed('uiBack'))) { introT = 0.001; inp.consume('uiOk'); inp.consume('uiBack'); return true; }
      return false;
    },
    preferredFocus: () => el.querySelector('.pc.tracked') || el.querySelector('.pc'),
    back() { leave(); },
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const pc = e.target.closest('.pc');
    if (b) {
      const a = b.dataset.act;
      if (a === 'close') leave();
      else if (a === 'roster') G.menus.push('roster');
      else if (a === 'collection') { showCollection = !showCollection; b.querySelector('span').textContent = showCollection ? 'Schemes' : 'Collection'; render(); }
      else if (a === 'elders') {
        const ans = G.schemes.eldersAnswer();
        if (ans.locked) eldersOut.textContent = ans.text;
        else { G.ui.eldersFor = G.state.tracked; render(); G.audio.play('turtle-grumble', { ui: true }); }
      } else if (a === 'track') { G.state.tracked = b.dataset.id; render(); el.querySelector(`[data-card="${b.dataset.id}"]`)?.focus(); G.guide?.dismiss(); }
      else if (a === 'napto' && !b.classList.contains('dis')) { G.closeMenus(); G.nap(b.dataset.phase); }
      return;
    }
    if (pc && !pc.classList.contains('done') && pc.dataset.card) { G.state.tracked = pc.dataset.card; render(); el.querySelector(`[data-card="${pc.dataset.card}"]`)?.focus(); }
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button, [tabindex="0"]'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
  return s;
}

function phaseTag(ph) {
  if (ph.length === 4) return 'Any time';
  if (ph.length === 3 && !ph.includes('night')) return 'By day';
  return ph.map((p) => PHASE_LABEL[p]).join(' or ');
}

function doneLine(s) {
  const g = s.gives || {};
  if (g.crew) return `${CREW[g.crew].name} joined.`;
  if (g.part) return 'A part for the Mecha-Pigeon.';   // polish (P12): one name for it
  if (g.gear) return 'New gear.';
  if (g.truce) return 'A truce, sealed on the rock.';
  return 'Done.';
}
