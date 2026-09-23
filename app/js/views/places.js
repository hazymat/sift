// Find Things: life areas (tabs; stored as kind "edition") → sections → box
// cards. Tapping a card zooms into the box (#/places/<box id>); Back zooms
// out again. Search across all life areas, CSV import/export.

import { loadTree, search, importCsv, exportCsv } from '../places.js';
import { sortable } from '../sortable.js';
import { listEntry, listHint, SHORTCUT } from '../listentry.js';
import { toast, undoable } from '../toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const EDITION_KEY = 'sift-find-edition';
// What the headings holding boxes are called (stored as kind "section").
const GROUP = { one: 'group', One: 'Group' };
const ZOOM = 'box-zoom'; // view-transition-name shared by a card and its box page

function remember(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function recall(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// Animate a DOM change as a zoom between a card and the box page, where the
// browser supports view transitions; otherwise just make the change. With
// "reduce motion" on, the zoom still runs, a little quicker (see app.css).
async function zoom(update) {
  if (!document.startViewTransition) return update();
  const t = document.startViewTransition(update);
  await t.finished.catch(() => {});
}

export default {
  async mount(el, { store }) {
    let tree = [];
    let editionId = recall(EDITION_KEY);
    let query = '';
    let openId = null; // box currently zoomed into
    const selected = new Set(); // item ids selected in the open box
    let anchor = null; // last tapped item, for shift-click ranges
    let gridScroll = 0;

    el.innerHTML = `
      <div id="find-grid">
        <div class="find-bar">
          <input type="search" id="find-q" class="search" placeholder="Find anything… (press /)" autocomplete="off" enterkeyhint="search">
        </div>
        <div class="find-tools">
          <div class="segmented" id="editions" role="tablist" aria-label="Life areas"></div>
          <details class="tool-menu">
            <summary class="icon-btn" aria-label="More actions">${icon('i-more')}</summary>
            <div class="menu">
              <button type="button" data-act="add-box">Add box</button>
              <button type="button" data-act="add-section">Add ${GROUP.one}</button>
              <button type="button" data-act="add-edition">New life area</button>
              <button type="button" data-act="rename-edition">Rename life area</button>
              <button type="button" data-act="import">Import CSV</button>
              <button type="button" data-act="export">Export CSV</button>
            </div>
          </details>
        </div>
        <div id="find-body"></div>
      </div>
      <div id="box-page" hidden></div>

      <dialog class="sheet" id="import-sheet" aria-label="Import CSV">
        <div class="sheet-handle"></div>
        <h2>Import CSV</h2>
        <p class="muted">One row per item. Columns: <code>life_area, group, box_code, box_name, box_location, box_notes, item, item_notes</code>. Only a box name or code is required. Anything already here is kept; importing the same file twice won't duplicate it.</p>
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

    const grid = el.querySelector('#find-grid');
    const body = el.querySelector('#find-body');
    const page = el.querySelector('#box-page');
    const q = el.querySelector('#find-q');
    const importSheet = el.querySelector('#import-sheet');

    // ---------- grid ----------

    const edition = () => tree.find(e => e.id === editionId) || tree[0];

    // Items show as pills so short ones share a line; the pill area is
    // clipped to a few lines and fitPills() fills in "+ n more".
    function card(box, { path, highlight } = {}) {
      const items = highlight ?? box.items;
      return `<div class="box-card${box.label_code ? '' : ' no-code'}" data-box="${box.id}" role="button" tabindex="0" aria-label="${esc(box.label_code ? `${box.label_code} ${box.name}` : box.name)}">
        ${path ? `<span class="box-path">${esc(path)}</span>` : ''}
        <span class="box-head">
          ${box.label_code ? `<span class="box-code">${esc(box.label_code)}</span>` : ''}
          <span class="box-name">${esc(box.name || 'Untitled box')}</span>
        </span>
        ${box.location_note ? `<span class="box-where">${esc(box.location_note)}</span>` : ''}
        <span class="box-pills${highlight ? ' all' : ''}">${items.map(i => `<span class="item-pill${i.depth ? ' sub' : ''}">${esc(i.name)}</span>`).join('')}</span>
        <span class="muted box-more"></span>
        <input class="quick-add" data-add="${box.id}" placeholder="+ item" aria-label="Add item to ${esc(box.label_code || box.name)}" enterkeyhint="done" autocomplete="off">
      </div>`;
    }

    function fitPills(root = body) {
      for (const wrap of root.querySelectorAll('.box-pills:not(.all)')) {
        for (const pill of wrap.children) pill.style.display = '';
        const limit = wrap.getBoundingClientRect().bottom;
        let hidden = 0;
        for (const pill of wrap.children) {
          if (pill.getBoundingClientRect().bottom > limit + 1) hidden++;
        }
        // Measure first, then take the overflow out of the layout.
        if (hidden) [...wrap.children].slice(-hidden).forEach(pill => { pill.style.display = 'none'; });
        wrap.nextElementSibling.textContent = hidden ? `+ ${hidden} more` : (wrap.children.length ? '' : 'Empty');
      }
    }

    function renderGrid() {
      const tabs = el.querySelector('#editions');
      const current = edition();
      tabs.innerHTML = tree.map(e =>
        `<button type="button" role="tab" data-edition="${e.id}" aria-pressed="${e.id === current?.id}">${esc(e.name)}</button>`
      ).join('');
      tabs.hidden = query !== '' || tree.length === 0;

      if (query) {
        const results = search(tree, query);
        const count = results.reduce((n, r) => n + (r.items.length || 1), 0);
        body.innerHTML = results.length
          ? `<p class="muted result-count">${count} match${count === 1 ? '' : 'es'}</p>
             <div class="box-grid">${results.map(r => card(r.box, {
               path: `${r.edition.name} › ${r.section.name}`,
               highlight: r.boxMatch && !r.items.length ? null : r.items,
             })).join('')}</div>`
          : `<div class="empty"><h2>Nothing found</h2><p class="muted">Try fewer or different words.</p></div>`;
        requestAnimationFrame(() => fitPills());
        return;
      }
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
        </section>`).join('') || '<div class="empty"><p class="muted">No boxes in this life area yet.</p></div>';
      requestAnimationFrame(() => fitPills());
    }

    // ---------- box page ----------

    const findBox = id => {
      for (const e of tree) for (const s of e.sections) for (const b of s.boxes) if (b.id === id) return { e, s, b };
      return null;
    };

    function renderPage() {
      const found = findBox(openId);
      if (!found) return false;
      const { e, s, b } = found;
      const sections = tree.flatMap(ed => ed.sections.map(sec => ({ id: sec.id, label: `${ed.name} › ${sec.name}` })));
      page.innerHTML = `
        <div class="box-page-bar">
          <button type="button" class="back" data-act="back">‹ ${esc(s.name)}</button>
          <span class="muted box-path">${esc(e.name)}</span>
        </div>
        <article class="box-page">
          <header class="box-page-head">
            <input class="box-code-input" name="label_code" value="${esc(b.label_code)}" placeholder="Code" aria-label="Code" autocomplete="off">
            <input class="box-name-input" name="name" value="${esc(b.name)}" placeholder="Box name" aria-label="Name" autocomplete="off">
          </header>
          <div class="box-fields">
            <label>Where it lives<input name="location_note" value="${esc(b.location_note)}" placeholder="e.g. Under desk back" autocomplete="off"></label>
            <label>Notes<input name="notes" value="${esc(b.notes)}" placeholder="e.g. 9L Really Useful" autocomplete="off"></label>
          </div>
          <h3>Contents <span class="muted">${b.items.length}</span></h3>
          <ul class="item-list">${b.items.map(i => `
            <li data-item="${i.id}" data-depth="${i.depth}"${selected.has(i.id) ? ' class="selected"' : ''}>
              <button type="button" class="drag-handle" aria-label="Select or move ${esc(i.name)}" aria-pressed="${selected.has(i.id)}">${icon('i-grip')}</button>
              <input name="name" value="${esc(i.name)}" aria-label="Item">
              <input name="notes" value="${esc(i.notes)}" placeholder="note" aria-label="Note" class="item-note">
              <button type="button" class="icon-btn small" data-act="delete-item" aria-label="Remove ${esc(i.name)}">×</button>
            </li>`).join('')}
          </ul>
          <textarea id="new-items" class="list-entry" rows="2" placeholder="Add items"></textarea>
          <p class="muted hint">${listHint()} ≡: tap to select, swipe down the ≡ column to select several, press and hold to drag (sideways to indent; or Tab / Shift+Tab). Changes save as you go; Esc closes.</p>
          <div class="sheet-actions">
            <button type="button" data-act="add-items">Add items <kbd>${SHORTCUT}</kbd></button>
            <span class="spacer"></span>
            <label class="inline">Move to <select name="parent_place_id">${sections.map(o => `<option value="${o.id}" ${o.id === s.id ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
            <button type="button" class="danger" data-act="delete-box">Delete box</button>
          </div>
        </article>
        <div class="select-bar" role="toolbar" aria-label="Selected items" hidden>
          <span class="select-count"></span>
          <button type="button" data-act="sel-indent" title="Make sub-items">Indent</button>
          <button type="button" data-act="sel-outdent" title="Bring back out">Outdent</button>
          <button type="button" data-act="sel-up" aria-label="Move up">↑</button>
          <button type="button" data-act="sel-down" aria-label="Move down">↓</button>
          <button type="button" data-act="sel-delete" class="danger">Delete</button>
          <button type="button" data-act="sel-clear" aria-label="Clear selection">✕</button>
        </div>`;
      const list = page.querySelector('.item-list');
      let carried = []; // selected rows in their order when a drag lifted
      sortable(list, {
        holdMs: 260,
        onTap: (li, ev) => {
          const id = li.dataset.item;
          if (ev.shiftKey && anchor) {
            const ids = [...list.children].map(r => r.dataset.item);
            const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
            ids.slice(a, b + 1).forEach(x => selected.add(x));
          } else {
            selected.has(id) ? selected.delete(id) : selected.add(id);
          }
          anchor = id;
          paintSelection();
        },
        onPaint: (from, to) => {
          const rows = [...list.children];
          const [a, b] = [rows.indexOf(from), rows.indexOf(to)].sort((x, y) => x - y);
          if (!paintBase) paintBase = new Set(selected);
          selected.clear();
          paintBase.forEach(x => selected.add(x));
          rows.slice(a, b + 1).forEach(r => selected.add(r.dataset.item));
          anchor = from.dataset.item;
          paintSelection();
        },
        onLift: li => {
          paintBase = null;
          carried = selected.has(li.dataset.item) && selected.size > 1
            ? [...list.children].filter(r => selected.has(r.dataset.item)) : [];
          if (carried.length) liftGroup(li, carried);
          document.body.classList.add('is-dragging');
        },
        onEnd: ({ item, dx }) => {
          document.body.classList.remove('is-dragging');
          const depth = dx > 30 ? 1 : dx < -30 ? 0 : null;
          if (carried.length) {
            dropGroup(item, carried);
            // Every selected row lands where the dragged one did, in their original order.
            const at = carried.indexOf(item);
            carried.slice(0, at).forEach(r => item.before(r));
            carried.slice(at + 1).reverse().forEach(r => item.after(r));
          }
          const moved = carried.length ? carried : [item];
          carried = [];
          saveOrder(new Map(depth == null ? [] : moved.map(r => [r.dataset.item, depth])));
        },
      });
      list.addEventListener('pointerup', () => { paintBase = null; });
      paintSelection();
      addItems = listEntry(page.querySelector('#new-items'), addLines);
      return true;
    }

    // Lines from the list entry → items; sub-lines go under the line above
    // (or under the last top-level item already in the box).
    let addItems = () => {};
    async function addLines(lines) {
      const existing = findBox(openId)?.b.items || [];
      let parent = existing.filter(i => !i.depth).at(-1)?.id || null;
      let n = existing.length;
      const made = [];
      for (const line of lines) {
        const sub = line.sub && parent;
        const item = await store.create('items', { name: line.text, place_id: openId, parent_item_id: sub ? parent : null, notes: '', quantity: null, sort_order: n++, last_moved_at: null });
        made.push(item.id);
        if (!sub) parent = item.id;
      }
      await reload();
      page.querySelector('#new-items')?.focus();
      undoable(`Added ${made.length} item${made.length === 1 ? '' : 's'}`, async () => {
        for (const id of made) await store.remove('items', id);
        await reload();
      });
    }

    let paintBase = null; // selection before a swipe started

    // Dragging several rows: the others leave the list (so it closes up and
    // behaves like one block moving) and a stack of all of them rides on the
    // held row. A long selection shows a window of rows that fades at the edges.
    function liftGroup(held, rows) {
      const h = held.getBoundingClientRect().height;
      const at = rows.indexOf(held);
      const max = Math.max(3, Math.floor((innerHeight * 0.45) / h));
      let from = Math.max(0, at - Math.floor((max - 1) / 2));
      const to = Math.min(rows.length, from + max);
      from = Math.max(0, to - max);
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.style.setProperty('--row', `${h}px`);
      ghost.style.top = `${-(at - from) * h}px`;
      ghost.classList.toggle('fade-top', from > 0);
      ghost.classList.toggle('fade-bottom', to < rows.length);
      ghost.innerHTML = rows.slice(from, to).map(r => `
        <div class="ghost-row${r.dataset.depth === '1' ? ' sub' : ''}${r === held ? ' lead' : ''}">
          <span>${esc(r.querySelector('input[name="name"]').value)}</span>
          ${r === held ? `<span class="ghost-count">${rows.length} items</span>` : ''}
        </div>`).join('');
      held.append(ghost);
      held.classList.add('group-drag');
      rows.forEach(r => { if (r !== held) r.hidden = true; });
    }

    function dropGroup(held, rows) {
      held.querySelector('.drag-ghost')?.remove();
      held.classList.remove('group-drag');
      rows.forEach(r => { r.hidden = false; });
    }

    function paintSelection() {
      for (const li of page.querySelectorAll('.item-list > li')) {
        const on = selected.has(li.dataset.item);
        li.classList.toggle('selected', on);
        li.querySelector('.drag-handle')?.setAttribute('aria-pressed', on);
      }
      const bar = page.querySelector('.select-bar');
      if (!bar) return;
      bar.hidden = !selected.size;
      document.body.classList.toggle('has-select-bar', !!selected.size);
      bar.querySelector('.select-count').textContent = `${selected.size} selected`;
    }

    function clearSelection() {
      selected.clear();
      anchor = null;
      paintSelection();
    }

    // Persist the list as shown: order, and each sub-item's parent (the
    // nearest top-level item above it). `depths` (id → 0|1) overrides rows.
    async function saveOrder(depths = new Map(), label = 'Moved') {
      const list = page.querySelector('.item-list');
      const before = (findBox(openId)?.b.items || []).map(i => [i.id, { sort_order: i.sort_order, parent_item_id: i.parent_item_id || null }]);
      for (const li of list.children) if (depths.has(li.dataset.item)) li.dataset.depth = depths.get(li.dataset.item);
      let parent = null;
      const changes = [];
      for (const [n, li] of [...list.children].entries()) {
        const sub = li.dataset.depth === '1' && parent;
        li.dataset.depth = sub ? 1 : 0;
        if (!sub) parent = li.dataset.item;
        changes.push([li.dataset.item, { sort_order: n, parent_item_id: sub ? parent : null }]);
      }
      await store.updateMany('items', changes);
      tree = await loadTree();
      undoable(label, async () => {
        await store.updateMany('items', before);
        await reload();
      });
    }

    // Tab / Shift+Tab on an item makes it a sub-item or brings it back out.
    page.addEventListener('keydown', async ev => {
      const li = ev.target.closest('[data-item]');
      if (!li || ev.key !== 'Tab' || ev.target.name !== 'name') return;
      const depth = ev.shiftKey ? 0 : 1;
      if (String(depth) === li.dataset.depth || (depth === 1 && !li.previousElementSibling)) return;
      ev.preventDefault();
      await saveOrder(new Map([[li.dataset.item, depth]]), depth ? 'Indented' : 'Outdented');
    });

    // Show the grid or the open box. `name` pairs the card and page for the zoom.
    function show() {
      const opening = openId && renderPage();
      grid.hidden = !!opening;
      page.hidden = !opening;
      if (!opening) {
        renderGrid();
        const back = el.querySelector(`[data-box="${CSS.escape(page.dataset.was || '')}"]`);
        if (back) back.style.viewTransitionName = ZOOM;
        scrollTo(0, gridScroll);
      } else {
        page.querySelector('.box-page').style.viewTransitionName = ZOOM;
        scrollTo(0, 0);
      }
    }

    async function openBox(id) {
      if (id === openId) return;
      selected.clear();
      anchor = null;
      document.body.classList.remove('has-select-bar');
      const leaving = openId;
      if (id) {
        gridScroll = scrollY;
        el.querySelectorAll('.box-card').forEach(c => { c.style.viewTransitionName = c.dataset.box === id ? ZOOM : ''; });
      } else if (leaving) {
        const open = page.querySelector('.box-page');
        if (open) open.style.viewTransitionName = ZOOM; // shrinks back into its card
      }
      page.dataset.was = leaving || '';
      await zoom(() => { openId = id; show(); });
      el.querySelectorAll('[style*="view-transition-name"]').forEach(n => { n.style.viewTransitionName = ''; });
    }

    async function reload() {
      tree = await loadTree();
      if (openId && !findBox(openId)) openId = null;
      openId ? renderPage() : renderGrid();
    }

    // Returns true if something changed.
    async function saveField(t) {
      if (!t?.name || !page.contains(t) || t.id === 'new-items') return false;
      const itemLi = t.closest('[data-item]');
      const [collection, id] = itemLi ? ['items', itemLi.dataset.item] : ['places', openId];
      const old = (await store.get(collection, id))?.[t.name] ?? '';
      const value = t.value.trim();
      if (value === (old ?? '')) return false;
      await store.update(collection, id, { [t.name]: value });
      if (t.name === 'parent_place_id') await reload();
      tree = await loadTree(); // keep the grid behind in step
      undoable('Saved', async () => {
        await store.update(collection, id, { [t.name]: old });
        await reload();
      });
      return true;
    }
    page.addEventListener('change', ev => saveField(ev.target));

    // Escape anywhere in a box: save what's being typed (including lines not
    // yet added), then zoom back out.
    async function saveAndClose() {
      const active = document.activeElement;
      let changed = false;
      if (active?.id === 'new-items' && active.value.trim()) { await addItems(); changed = true; }
      else changed = await saveField(active);
      active?.blur?.();
      if (!changed) toast('✓ Saved'); // a change shows its own "… · Undo" toast
      act('back');
    }

    // ---------- actions ----------

    async function act(name, target) {
      const current = edition();
      if (name === 'back') {
        history.length > 1 ? history.back() : (location.hash = '#/places');
      } else if (name === 'add-items') {
        await addItems();
      } else if (name === 'sel-clear') {
        clearSelection();
      } else if (name === 'sel-indent' || name === 'sel-outdent') {
        const depth = name === 'sel-indent' ? 1 : 0;
        await saveOrder(new Map([...selected].map(id => [id, depth])), `${depth ? 'Indented' : 'Outdented'} ${selected.size}`);
        paintSelection();
      } else if (name === 'sel-up' || name === 'sel-down') {
        const list = page.querySelector('.item-list');
        const rows = [...list.children].filter(r => selected.has(r.dataset.item));
        if (!rows.length) return;
        if (name === 'sel-up') {
          const prev = rows[0].previousElementSibling;
          if (!prev) return;
          prev.before(...rows);
        } else {
          const next = rows.at(-1).nextElementSibling;
          if (!next) return;
          next.after(...rows);
        }
        await saveOrder(new Map(), `Moved ${rows.length}`);
      } else if (name === 'sel-delete') {
        const items = findBox(openId)?.b.items || [];
        const gone = [...new Set([...selected, ...items.filter(i => selected.has(i.parent_item_id)).map(i => i.id)])];
        const now = new Date().toISOString();
        await store.updateMany('items', gone.map(g => [g, { deleted_at: now }]));
        clearSelection();
        await reload();
        undoable(`Removed ${gone.length} item${gone.length === 1 ? '' : 's'}`, async () => {
          await store.updateMany('items', gone.map(g => [g, { deleted_at: null }]));
          await reload();
        });
      } else if (name === 'delete-item') {
        const id = target.closest('[data-item]').dataset.item;
        const items = findBox(openId)?.b.items || [];
        const gone = [id, ...items.filter(i => i.parent_item_id === id).map(i => i.id)];
        const label = items.find(i => i.id === id)?.name || 'item';
        for (const g of gone) await store.remove('items', g);
        await reload();
        undoable(`Removed "${label}"${gone.length > 1 ? ` and ${gone.length - 1} sub-item${gone.length > 2 ? 's' : ''}` : ''}`, async () => {
          for (const g of gone) await store.restore('items', g);
          await reload();
        });
      } else if (name === 'delete-box') {
        const { b: box } = findBox(openId);
        const boxId = openId;
        const itemIds = box.items.map(i => i.id);
        await store.updateMany('items', itemIds.map(i => [i, { deleted_at: new Date().toISOString() }]));
        await store.remove('places', boxId);
        tree = await loadTree();
        location.hash = '#/places';
        undoable(`Deleted box ${box.label_code || box.name || ''}`.trim(), async () => {
          await store.restore('places', boxId);
          await store.updateMany('items', itemIds.map(i => [i, { deleted_at: null }]));
          await reload();
        });
      } else if (name === 'import') {
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
        const n = prompt('Name for the new life area (e.g. Home, Build, Garage):');
        if (!n?.trim()) return;
        const e = await store.create('places', { kind: 'edition', name: n.trim(), parent_place_id: null, notes: '', sort_order: tree.length });
        editionId = e.id; remember(EDITION_KEY, e.id);
        await reload();
      } else if (name === 'rename-edition' && current) {
        const n = prompt('Rename life area:', current.name);
        if (n?.trim()) { await store.update('places', current.id, { name: n.trim() }); await reload(); }
      } else if (name === 'add-section') {
        const ed = current || await store.create('places', { kind: 'edition', name: 'Standard', parent_place_id: null, notes: '', sort_order: 0 });
        const n = prompt(`${GROUP.One} name (e.g. Wardrobe, Garage shelves):`);
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
        const box = await store.create('places', { kind: 'box', name: '', label_code: '', parent_place_id: sectionId, location_note: '', notes: '', sort_order: count });
        tree = await loadTree();
        location.hash = `#/places/${box.id}`;
      }
    }

    // Inline add on a card: Enter adds the item and keeps the field ready.
    body.addEventListener('keydown', async ev => {
      const input = ev.target.closest('.quick-add');
      if (input) {
        if (ev.key !== 'Enter' || !input.value.trim()) return;
        ev.preventDefault();
        const boxId = input.dataset.add;
        const count = findBox(boxId)?.b.items.length || 0;
        const made = await store.create('items', { name: input.value.trim(), place_id: boxId, notes: '', quantity: null, sort_order: count, last_moved_at: null });
        tree = await loadTree();
        undoable(`Added "${made.name}"`, async () => { await store.remove('items', made.id); await reload(); });
        input.closest('.box-card').outerHTML = card(findBox(boxId).b);
        const fresh = body.querySelector(`.box-card[data-box="${boxId}"]`);
        fitPills(fresh.parentElement);
        fresh.querySelector('.quick-add').focus();
        return;
      }
      const c = ev.target.closest('.box-card[data-box]');
      if (c && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); c.click(); }
    });

    el.addEventListener('click', ev => {
      if (ev.target.closest('.quick-add')) return;
      const t = ev.target.closest('[data-act], [data-box], [data-edition]');
      if (!t || importSheet.contains(t)) return;
      if (t.dataset.edition) {
        editionId = t.dataset.edition; remember(EDITION_KEY, editionId);
        renderGrid();
      } else if (t.dataset.box) {
        location.hash = `#/places/${t.dataset.box}`;
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
          (c.editions ? `, ${c.editions} life area${c.editions === 1 ? '' : 's'}` : '') +
          (c.sections ? `, ${c.sections} ${GROUP.one}${c.sections === 1 ? '' : 's'}` : '') +
          (c.skipped ? `. ${c.skipped} items were already here.` : '.');
        await reload();
      } catch (err) {
        out.textContent = `Couldn't import: ${err.message}`;
      }
    });

    let timer;
    q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { query = q.value.trim(); renderGrid(); }, 120);
    });

    this.onKey = ev => {
      if (ev.key === '/' && !openId && !ev.target.closest('input, textarea, select')) { ev.preventDefault(); q.focus(); }
      if (ev.key === 'Escape' && openId && selected.size && !ev.target.closest('input, textarea')) { ev.preventDefault(); clearSelection(); return; }
      if (ev.key === 'Escape' && openId && !importSheet.open) { ev.preventDefault(); saveAndClose(); return; }
      if (ev.key === 'Escape' && document.activeElement === q && q.value) { q.value = ''; query = ''; renderGrid(); }
    };
    addEventListener('keydown', this.onKey);

    this.onResize = () => { if (!openId) fitPills(); };
    addEventListener('resize', this.onResize);
    this.openBox = openBox;
    tree = await loadTree();
    show();
  },

  // Called by the router with the path after #/places/.
  route([boxId]) {
    return this.openBox?.(boxId || null);
  },

  unmount() {
    document.body.classList.remove('has-select-bar');
    removeEventListener('keydown', this.onKey);
    removeEventListener('resize', this.onResize);
  },

  quickAdd() {
    document.querySelector('[data-act="add-box"]')?.click();
  },
};
