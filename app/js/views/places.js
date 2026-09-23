// Find Things: editions (tabs) → sections → box cards. Search across all
// editions, box editor, CSV import/export.

import { loadTree, search, importCsv, exportCsv } from '../places.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const PREVIEW_ITEMS = 8;
const EDITION_KEY = 'sift-find-edition';

function remember(key, value) {
  try { value === undefined ? localStorage.getItem(key) : localStorage.setItem(key, value); } catch {}
}
function recall(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export default {
  async mount(el, { store }) {
    let tree = [];
    let editionId = recall(EDITION_KEY);
    let query = '';

    el.innerHTML = `
      <div class="find-bar">
        <input type="search" id="find-q" class="search" placeholder="Find anything… (press /)" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="find-tools">
        <div class="segmented" id="editions" role="tablist" aria-label="Editions"></div>
        <details class="tool-menu">
          <summary class="icon-btn" aria-label="More actions">${icon('i-more')}</summary>
          <div class="menu">
            <button type="button" data-act="add-box">Add box</button>
            <button type="button" data-act="add-section">Add section</button>
            <button type="button" data-act="add-edition">New edition</button>
            <button type="button" data-act="rename-edition">Rename edition</button>
            <button type="button" data-act="import">Import CSV</button>
            <button type="button" data-act="export">Export CSV</button>
          </div>
        </details>
      </div>
      <div id="find-body"></div>

      <dialog class="sheet box-sheet" id="box-sheet" aria-label="Box"></dialog>
      <dialog class="sheet" id="import-sheet" aria-label="Import CSV">
        <div class="sheet-handle"></div>
        <h2>Import CSV</h2>
        <p class="muted">One row per item. Columns: <code>edition, section, box_code, box_name, box_location, box_notes, item, item_notes</code>. Only a box name or code is required. Anything already here is kept; importing the same file twice won't duplicate it.</p>
        <p><input type="file" id="import-file" accept=".csv,text/csv"></p>
        <p class="muted">or paste it:</p>
        <textarea id="import-text" rows="6" placeholder="box_code,box_name,item&#10;A,Electronics,555 timers"></textarea>
        <p id="import-result" class="muted"></p>
        <div class="sheet-actions">
          <button type="button" data-close>Close</button>
          <button type="button" class="primary" id="import-go">Import</button>
        </div>
      </dialog>
    `;

    const body = el.querySelector('#find-body');
    const q = el.querySelector('#find-q');
    const boxSheet = el.querySelector('#box-sheet');
    const importSheet = el.querySelector('#import-sheet');

    // ---------- rendering ----------

    const edition = () => tree.find(e => e.id === editionId) || tree[0];

    function card(box, { path, highlight } = {}) {
      const items = highlight ?? box.items;
      const shown = items.slice(0, highlight ? items.length : PREVIEW_ITEMS);
      const more = items.length - shown.length;
      return `<button type="button" class="box-card${box.label_code ? '' : ' no-code'}" data-box="${box.id}">
        ${path ? `<span class="box-path">${esc(path)}</span>` : ''}
        <span class="box-head">
          ${box.label_code ? `<span class="box-code">${esc(box.label_code)}</span>` : ''}
          <span class="box-name">${esc(box.name)}</span>
        </span>
        ${box.location_note ? `<span class="box-where">${esc(box.location_note)}</span>` : ''}
        ${box.notes ? `<span class="box-notes">${esc(box.notes)}</span>` : ''}
        ${shown.length ? `<ul class="box-items">${shown.map(i => `<li>${esc(i.name)}${i.notes ? ` <span class="muted">(${esc(i.notes)})</span>` : ''}</li>`).join('')}</ul>` : ''}
        ${more > 0 ? `<span class="muted box-more">+ ${more} more</span>` : ''}
        ${!items.length && !highlight ? '<span class="muted box-more">Empty</span>' : ''}
      </button>`;
    }

    function renderEditions() {
      const tabs = el.querySelector('#editions');
      const current = edition();
      tabs.innerHTML = tree.map(e =>
        `<button type="button" role="tab" data-edition="${e.id}" aria-pressed="${e.id === current?.id}">${esc(e.name)}</button>`
      ).join('');
      tabs.hidden = query !== '' || tree.length === 0;
    }

    function render() {
      renderEditions();
      if (query) {
        const results = search(tree, query);
        const count = results.reduce((n, r) => n + (r.items.length || 1), 0);
        body.innerHTML = results.length
          ? `<p class="muted result-count">${count} match${count === 1 ? '' : 'es'}</p>
             <div class="box-grid">${results.map(r => card(r.box, {
               path: `${r.edition.name} › ${r.section.name}`,
               highlight: r.boxMatch && !r.items.length ? r.box.items : r.items,
             })).join('')}</div>`
          : `<div class="empty"><h2>Nothing found</h2><p class="muted">Try fewer or different words.</p></div>`;
        return;
      }
      const current = edition();
      if (!current) {
        body.innerHTML = `<div class="empty">
          <h2>Where is everything?</h2>
          <p class="muted">Import a CSV of your boxes, or start adding them.</p>
          <p><button type="button" class="primary" data-act="import">Import CSV</button>
             <button type="button" data-act="add-box">Add a box</button></p>
        </div>`;
        return;
      }
      body.innerHTML = current.sections.map(s => `
        <section class="find-section">
          <h2>${esc(s.name)}${s.location_note ? ` <span class="box-where">${esc(s.location_note)}</span>` : ''}</h2>
          <div class="box-grid">${s.boxes.map(b => card(b)).join('')}
            <button type="button" class="box-card add-card" data-act="add-box" data-section="${s.id}">+ Add box</button>
          </div>
        </section>`).join('') || '<div class="empty"><p class="muted">No boxes in this edition yet.</p></div>';
    }

    async function reload() {
      tree = await loadTree();
      render();
    }

    // ---------- box editor ----------

    const findBox = id => {
      for (const e of tree) for (const s of e.sections) for (const b of s.boxes) if (b.id === id) return { e, s, b };
      return null;
    };

    function openBox(id) {
      const found = findBox(id);
      if (!found) return;
      const { e, s, b } = found;
      const sections = tree.flatMap(ed => ed.sections.map(sec => ({ id: sec.id, label: `${ed.name} › ${sec.name}` })));
      boxSheet.innerHTML = `
        <div class="sheet-handle"></div>
        <p class="muted box-path">${esc(e.name)} › ${esc(s.name)}</p>
        <div class="box-fields">
          <label>Code<input name="label_code" value="${esc(b.label_code)}" placeholder="e.g. BA" autocomplete="off"></label>
          <label class="grow">Name<input name="name" value="${esc(b.name)}" autocomplete="off"></label>
          <label class="full">Where it lives<input name="location_note" value="${esc(b.location_note)}" placeholder="e.g. Under desk back" autocomplete="off"></label>
          <label class="full">Notes<input name="notes" value="${esc(b.notes)}" placeholder="e.g. 9L Really Useful" autocomplete="off"></label>
          <label class="full">Section<select name="parent_place_id">${sections.map(o => `<option value="${o.id}" ${o.id === s.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
        </div>
        <h3>Contents</h3>
        <ul class="item-list">${b.items.map(i => `
          <li data-item="${i.id}">
            <input name="name" value="${esc(i.name)}" aria-label="Item">
            <input name="notes" value="${esc(i.notes)}" placeholder="note" aria-label="Note" class="item-note">
            <button type="button" class="icon-btn small" data-act="delete-item" aria-label="Remove ${esc(i.name)}">×</button>
          </li>`).join('')}
        </ul>
        <textarea id="new-items" rows="3" placeholder="Add items, one per line"></textarea>
        <div class="sheet-actions">
          <button type="button" class="danger" data-act="delete-box">Delete box</button>
          <span class="spacer"></span>
          <button type="button" id="add-items">Add items</button>
          <button type="button" class="primary" data-close>Done</button>
        </div>`;
      boxSheet.dataset.box = b.id;
      if (!boxSheet.open) boxSheet.showModal();
    }

    boxSheet.addEventListener('change', async ev => {
      const t = ev.target;
      const boxId = boxSheet.dataset.box;
      const itemLi = t.closest('[data-item]');
      if (itemLi) {
        await store.update('items', itemLi.dataset.item, { [t.name]: t.value.trim() });
      } else if (t.name) {
        await store.update('places', boxId, { [t.name]: t.value.trim() });
      }
    });

    boxSheet.addEventListener('click', async ev => {
      const b = ev.target.closest('button');
      if (ev.target === boxSheet || b?.hasAttribute('data-close')) { boxSheet.close(); return; }
      if (!b) return;
      const boxId = boxSheet.dataset.box;
      if (b.id === 'add-items') {
        const ta = boxSheet.querySelector('#new-items');
        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        const start = findBox(boxId)?.b.items.length || 0;
        for (const [n, name] of lines.entries()) {
          await store.create('items', { name, place_id: boxId, notes: '', quantity: null, sort_order: start + n, last_moved_at: null });
        }
        await reload();
        openBox(boxId);
        boxSheet.querySelector('#new-items').focus();
      } else if (b.dataset.act === 'delete-item') {
        await store.remove('items', b.closest('[data-item]').dataset.item);
        b.closest('li').remove();
      } else if (b.dataset.act === 'delete-box') {
        const { b: box } = findBox(boxId);
        if (!confirm(`Delete ${box.label_code || box.name} and its ${box.items.length} items?`)) return;
        for (const i of box.items) await store.remove('items', i.id);
        await store.remove('places', boxId);
        boxSheet.close();
      }
    });

    boxSheet.addEventListener('close', reload);

    // ---------- actions ----------

    async function act(name, target) {
      const current = edition();
      if (name === 'import') {
        importSheet.querySelector('#import-result').textContent = '';
        importSheet.showModal();
      } else if (name === 'export') {
        const blob = new Blob([await exportCsv()], { type: 'text/csv' });
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(blob),
          download: `sift-find-things-${new Date().toISOString().slice(0, 10)}.csv`,
        });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if (name === 'add-edition') {
        const n = prompt('Name for the new edition (e.g. Build, Garage):');
        if (!n?.trim()) return;
        const e = await store.create('places', { kind: 'edition', name: n.trim(), parent_place_id: null, notes: '', sort_order: tree.length });
        editionId = e.id; remember(EDITION_KEY, e.id);
        await reload();
      } else if (name === 'rename-edition' && current) {
        const n = prompt('Rename edition:', current.name);
        if (n?.trim()) { await store.update('places', current.id, { name: n.trim() }); await reload(); }
      } else if (name === 'add-section') {
        const ed = current || await store.create('places', { kind: 'edition', name: 'Standard', parent_place_id: null, notes: '', sort_order: 0 });
        const n = prompt('Section name (e.g. Wardrobe, Garage shelves):');
        if (!n?.trim()) return;
        await store.create('places', { kind: 'section', name: n.trim(), parent_place_id: ed.id, location_note: '', notes: '', sort_order: current?.sections.length || 0 });
        await reload();
      } else if (name === 'add-box') {
        let sectionId = target?.dataset.section;
        if (!sectionId) {
          const ed = current || await store.create('places', { kind: 'edition', name: 'Standard', parent_place_id: null, notes: '', sort_order: 0 });
          const sec = current?.sections.at(-1) || await store.create('places', { kind: 'section', name: 'Boxes', parent_place_id: ed.id, location_note: '', notes: '', sort_order: 0 });
          sectionId = sec.id;
        }
        const count = tree.flatMap(e => e.sections).find(s => s.id === sectionId)?.boxes.length || 0;
        const box = await store.create('places', { kind: 'box', name: 'New box', label_code: '', parent_place_id: sectionId, location_note: '', notes: '', sort_order: count });
        await reload();
        openBox(box.id);
        boxSheet.querySelector('input[name="label_code"]').focus();
      }
    }

    el.addEventListener('click', ev => {
      const t = ev.target.closest('[data-act], [data-box], [data-edition]');
      if (!t || boxSheet.contains(t) || importSheet.contains(t)) return;
      if (t.dataset.edition) {
        editionId = t.dataset.edition; remember(EDITION_KEY, editionId);
        render();
      } else if (t.dataset.box) {
        openBox(t.dataset.box);
      } else {
        t.closest('details')?.removeAttribute('open');
        act(t.dataset.act, t);
      }
    });

    importSheet.addEventListener('click', async ev => {
      if (ev.target === importSheet || ev.target.closest('[data-close]')) { importSheet.close(); return; }
      if (!ev.target.closest('#import-go')) return;
      const file = importSheet.querySelector('#import-file').files[0];
      const text = file ? await file.text() : importSheet.querySelector('#import-text').value;
      const out = importSheet.querySelector('#import-result');
      if (!text.trim()) { out.textContent = 'Choose a file or paste some CSV first.'; return; }
      out.textContent = 'Importing…';
      try {
        const c = await importCsv(text);
        out.textContent = `Added ${c.boxes} boxes and ${c.items} items` +
          (c.editions ? `, ${c.editions} edition${c.editions === 1 ? '' : 's'}` : '') +
          (c.sections ? `, ${c.sections} section${c.sections === 1 ? '' : 's'}` : '') +
          (c.skipped ? `. ${c.skipped} items were already here.` : '.');
        await reload();
      } catch (err) {
        out.textContent = `Couldn't import: ${err.message}`;
      }
    });

    let timer;
    q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { query = q.value.trim(); render(); }, 120);
    });

    this.onKey = ev => {
      if (ev.key === '/' && !ev.target.closest('input, textarea, select')) { ev.preventDefault(); q.focus(); }
      if (ev.key === 'Escape' && document.activeElement === q && q.value) { q.value = ''; query = ''; render(); }
    };
    addEventListener('keydown', this.onKey);

    await reload();
  },

  unmount() {
    removeEventListener('keydown', this.onKey);
  },

  quickAdd() {
    document.querySelector('[data-act="add-box"]')?.click();
  },
};
