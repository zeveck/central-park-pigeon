// The roster and Workshop: Crews x/17 and the Park Support headcount; each
// crew's page shows the boss and the regulars as their character cards
// (portrait, name, one-line bio, favour tick), the crew's talents and its
// crowd count; plus the 8 Mecha parts on a picture of the real Mecha (Fixes-1).

import { CREWS, CHARACTERS, TALENTS, CREW_COUNT } from '../data/crews.js';
import { PARTS, PART_NAMES } from '../data/schemes.js';
import { overlay } from './menu.js';
import { icon } from './icons.js';
import { derived } from '../state/gamestate.js';
import { mechaPicture } from './mecha-picture.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function rosterScreen(G) {
  const el = overlay('roster', `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 style="margin:0">Crews & Workshop</h2><span class="sum muted"></span><span style="flex:1"></span>
      <button type="button" class="btn small" data-act="close">${icon('close')}<span>Close</span></button></div>
    <div class="body" style="margin-top:10px"><div class="crews"></div><div class="page"></div></div>
    <div class="hints" data-auto='[["uiOk","Open"],["uiBack","Back"]]'></div>`);
  const list = el.querySelector('.crews'), page = el.querySelector('.page'), sum = el.querySelector('.sum');
  let current = 'workshop';
  const renderList = () => {
    const st = G.state, d = derived(st);
    sum.textContent = `Crews ${d.crews}/${CREW_COUNT} · Park Support ${d.support} · Flock ${d.flock}`;
    list.innerHTML = `<button type="button" class="btn${current === 'workshop' ? ' primary' : ''}" data-crew="workshop">${icon('part')}<span>The Workshop (${d.parts}/8)</span></button>`
      + CREWS.map((c) => `<button type="button" class="btn${st.crews.includes(c.id) ? ' joined' : ''}${current === c.id ? ' primary' : ''}" data-crew="${c.id}"><img src="assets/portraits/${c.boss}.webp" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;${st.crews.includes(c.id) ? '' : 'filter:grayscale(1)'}"><span>${esc(c.name)}</span></button>`).join('');
  };
  const renderPage = () => {
    const st = G.state;
    if (current === 'workshop') {
      page.innerHTML = `<h3 style="margin-top:0">The Mecha-Pigeon</h3><div class="mecha">${mechaImg(G, st.parts)}<div>${PARTS.map((p) => `<p>${st.parts.includes(p) ? icon('part') : '<span style="display:inline-block;width:22px"></span>'} <b>${PART_NAMES[p]}</b>: ${st.parts.includes(p) ? 'bolted on' : 'missing'}</p>`).join('')}</div></div><p class="muted">The finale needs all 17 crews and all 8 parts.</p>`;
      return;
    }
    const c = CREWS.find((x) => x.id === current);
    const joined = st.crews.includes(c.id);
    const people = [c.boss, ...c.regulars];
    page.innerHTML = `<h3 style="margin-top:0">${esc(c.name)} ${joined ? '· joined' : '· not yet'}</h3>
      <p><b>Talent:</b> ${c.talents.map((t) => esc(TALENTS[t].name)).join(', ')}${c.flock ? ` · +${c.flock} flock` : ''} · <b>Crowd:</b> about ${c.count}</p>
      <div class="chars">${people.map((id) => { const ch = CHARACTERS[id]; return `<div class="ch${joined ? '' : ' locked'}"><img src="assets/portraits/${ch.portrait}.webp" alt=""><div class="n">${esc(ch.name)}${id === c.boss ? ' (boss)' : ''}</div><div class="b">${esc(ch.bio)}</div>${st.favours.includes(id) ? '<div class="b"><b>Favour done</b></div>' : ''}</div>`; }).join('')}</div>`;
  };
  const s = {
    id: 'roster', el,
    open() { renderList(); renderPage(); },
    back() { G.menus.pop(); },
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-crew], [data-act]');
    if (!b) return;
    if (b.dataset.act === 'close') { G.menus.pop(); return; }
    current = b.dataset.crew;
    renderList(); renderPage();
    list.querySelector(`[data-crew="${current}"]`)?.focus();
  });
  el.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }); });
  return s;
}

/** Fixes-1: the real 3D Mecha with the parts you have (ui/mecha-picture.js); the sketch only if it isn't built. */
function mechaImg(G, parts) {
  const url = mechaPicture(G, parts);
  return url ? `<img class="mecha-pic" src="${url}" alt="The Mecha-Pigeon with ${parts.length} of 8 parts">` : mechaSvg(parts);
}

function mechaSvg(parts) {
  const on = (p) => (parts.includes(p) ? '#e07b39' : 'rgba(80,70,60,.25)');
  return `<svg viewBox="0 0 200 220" aria-label="The Mecha-Pigeon">
    <path d="M70 40 q30 -30 60 0 v30 h-60z" fill="#7a8597"/>
    <path d="M130 50 l28 8 -28 8z" fill="${on('beak')}"/>
    <circle cx="95" cy="52" r="7" fill="${on('eyes')}"/><circle cx="115" cy="52" r="7" fill="${on('eyes')}"/>
    <rect x="60" y="75" width="80" height="60" rx="10" fill="${on('body')}"/>
    <rect x="88" y="88" width="24" height="16" rx="4" fill="${on('voice')}"/>
    <rect x="92" y="110" width="16" height="16" rx="3" fill="${on('power')}"/>
    <path d="M60 85 l-50 25 50 10z" fill="${on('wings')}"/><path d="M140 85 l50 25 -50 10z" fill="${on('wings')}"/>
    <rect x="75" y="135" width="12" height="55" fill="${on('legs')}"/><rect x="113" y="135" width="12" height="55" fill="${on('legs')}"/>
    <path d="M65 192 h32 l-6 14 h-20z M103 192 h32 l-6 14 h-20z" fill="${on('talons')}"/>
  </svg>`;
}
