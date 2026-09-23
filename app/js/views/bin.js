// Archive & Bin page: #/bin/<archive|bin>/<area|all>/<search>
// Reached from each area's ⋯ menu (already filtered to that area) and from
// Settings.

import { binProviders, restoreEntries, returnEntries, purgeEntries, BIN_DAYS } from '../bin.js';
import { undoable } from '../toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function ago(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default {
  async mount(el) {
    const state = this.state = { tab: 'archive', area: 'all', q: '' };
    let shown = []; // entries currently listed, for actions
    const pending = new Map(); // entry key → timer for delayed "delete forever"
    const key = e => `${e.collection}:${e.id}`;

    el.innerHTML = `
      <div class="bin-head">
        <div class="segmented" id="bin-tabs" role="tablist" aria-label="Archive or bin">
          <button type="button" data-tab="archive">Archive</button>
          <button type="button" data-tab="bin">Bin</button>
        </div>
        <div class="segmented" id="bin-areas" aria-label="Area"></div>
      </div>
      <input type="search" id="bin-q" class="search" placeholder="Search…" autocomplete="off">
      <p class="muted bin-note" id="bin-note"></p>
      <div id="bin-body"></div>`;

    const body = el.querySelector('#bin-body');
    const q = el.querySelector('#bin-q');

    const render = this.render = async () => {
      q.value = state.q;
      for (const b of el.querySelectorAll('#bin-tabs button')) b.setAttribute('aria-pressed', b.dataset.tab === state.tab);
      const providers = binProviders();
      el.querySelector('#bin-areas').innerHTML = [{ area: 'all', label: 'All' }, ...providers]
        .map(p => `<button type="button" data-area="${p.area}" aria-pressed="${p.area === state.area}">${esc(p.label)}</button>`).join('');

      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const groups = [];
      for (const p of binProviders(state.area)) {
        const entries = (await p.entries(state.tab))
          .filter(e => !pending.has(key(e)))
          .filter(e => words.every(w => `${e.title} ${e.subtitle} ${e.search}`.toLowerCase().includes(w)));
        if (entries.length) groups.push({ label: p.label, entries });
      }
      shown = groups.flatMap(g => g.entries);

      el.querySelector('#bin-note').innerHTML = state.tab === 'bin'
        ? `Deleted things stay here for ${BIN_DAYS} days, then they're gone for good.${shown.length ? ' <button type="button" class="danger small-btn" data-act="empty">Empty bin</button>' : ''}`
        : 'Archived things are out of the way but not gone. Search still finds them.';

      body.innerHTML = groups.length ? groups.map(g => `
        <section class="bin-group">
          <h2>${esc(g.label)}</h2>
          <ul class="bin-list">${g.entries.map(e => `
            <li data-key="${esc(key(e))}">
              <div class="bin-main">
                <span class="bin-kind">${esc(e.kind)}</span>
                <span class="bin-title">${esc(e.title || 'Untitled')}</span>
                ${e.subtitle ? `<span class="muted bin-sub">${esc(e.subtitle)}</span>` : ''}
                <span class="muted bin-sub">${esc([e.detail, `${state.tab === 'bin' ? 'Deleted' : 'Archived'} ${ago(e.at)}`].filter(Boolean).join(' · '))}</span>
              </div>
              <div class="bin-actions">
                <button type="button" data-act="restore">Restore</button>
                ${state.tab === 'bin' ? '<button type="button" class="danger" data-act="purge">Delete forever</button>' : ''}
              </div>
            </li>`).join('')}
          </ul>
        </section>`).join('')
        : `<div class="empty"><h2>${state.q ? 'Nothing matches' : state.tab === 'bin' ? 'The bin is empty' : 'Nothing archived'}</h2></div>`;
    };

    // "Delete forever" and "Empty bin" wait for the undo toast to run out.
    function purgeLater(entries, message) {
      for (const e of entries) pending.set(key(e), null);
      const timer = setTimeout(async () => {
        await purgeEntries(entries);
        for (const e of entries) pending.delete(key(e));
      }, 6500);
      render();
      undoable(message, () => {
        clearTimeout(timer);
        for (const e of entries) pending.delete(key(e));
        render();
      });
    }

    el.addEventListener('click', async ev => {
      const t = ev.target.closest('button');
      if (!t) return;
      if (t.dataset.tab) { state.tab = t.dataset.tab; go(); return; }
      if (t.dataset.area) { state.area = t.dataset.area; go(); return; }
      if (t.dataset.act === 'empty') { purgeLater([...shown], `Emptied the bin (${shown.length})`); return; }
      const li = t.closest('[data-key]');
      const entry = li && shown.find(e => key(e) === li.dataset.key);
      if (!entry) return;
      if (t.dataset.act === 'restore') {
        const tab = state.tab;
        await restoreEntries([entry], tab);
        await render();
        undoable(`Restored ${entry.title}`, async () => { await returnEntries([entry], tab); await render(); });
      } else if (t.dataset.act === 'purge') {
        purgeLater([entry], `Deleted ${entry.title} forever`);
      }
    });

    let timer;
    q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = q.value.trim(); render(); }, 150);
    });

    // Keep the URL in step so Back and links work.
    const go = () => {
      const url = `#/bin/${state.tab}/${state.area}${state.q ? `/${encodeURIComponent(state.q)}` : ''}`;
      if (location.hash !== url) location.hash = url; else render();
    };

    await render();
  },

  route([tab, area, q]) {
    Object.assign(this.state, {
      tab: tab === 'bin' ? 'bin' : 'archive',
      area: area || 'all',
      q: q || '',
    });
    return this.render();
  },
};
