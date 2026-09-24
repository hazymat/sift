// Pills under an item while you edit it in place, the same in every list
// (Tasks, Day Planner, Find Things, Lists). Tap an item's text to edit it and
// a row of small pills opens under it (energy, time needed, dates… whatever
// that list offers) plus "More", which opens the item's full panel. They stay
// open while you use them (even when the list redraws), and close when you
// tap somewhere else or press Esc.
//
// On phones the ⋯ button is hidden (CSS, body.pills-only) and More / holding
// the text / tapping the note open the panel; on a laptop ⋯ stays as well.
//
//   editPills(root, {
//     title: '.task-title',                   the editable text of a row
//     row:   'li[data-task]',                 the row it belongs to
//     key:   row => row.dataset.task,         which record the row shows
//     html:  key => '<label class="entry-chip" …><select data-pill="energy">…',
//     change: (key, name, value) => …,        a pill's field changed
//   }) → { destroy() }
//
// A pill is a label.entry-chip holding a real <select> or date <input> with
// data-pill="<name>" (so phones show their own pickers), or a button with
// data-pill-act="<name>" (sent to change() with value null). "More" is added by
// this module: it clicks the row's own details (⋯) button.

import { ENERGY } from './days.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export { esc as escPill };

// Helpers for views building their pills.
export function selectPill(name, label, glyph, options, value) {
  const cur = options.find(o => String(o[0]) === String(value ?? ''));
  const set = value != null && value !== '' && cur;
  const g = typeof glyph === 'function' ? glyph(set ? value : null) : glyph;
  return `<label class="entry-chip${set ? ' set' : ''}" data-chip="${name}">${g} <span class="chip-text">${esc(set ? cur[1] : label)}</span>`
    + `<select data-pill="${name}" aria-label="${esc(label)}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
}
// Energy: a button (not a dropdown) that opens the ⚡ picker (pillmenu.js
// energyMenu); change() gets ('energy', null) and opens it.
export function energyPill(value) {
  const e = ENERGY.find(x => x.id === value);
  return `<button type="button" class="entry-chip${e ? ' set' : ''}" data-chip="energy" data-pill-act="energy" aria-haspopup="menu">${e ? e.bolts : '⚡'} <span class="chip-text">${esc(e ? e.label : 'Energy')}</span></button>`;
}
export function datePill(name, label, glyph, value, shown) {
  return `<label class="entry-chip${value ? ' set' : ''}" data-chip="${name}">${glyph} <span class="chip-text">${esc(value ? shown(value) : label)}</span>`
    + `<input type="date" data-pill="${name}" value="${esc(value || '')}" aria-label="${esc(label)}"></label>`;
}

document.body.classList.toggle('pills-only', matchMedia('(pointer: coarse)').matches);

export function editPills(root, spec) {
  let editing = null; // key of the row whose pills are open
  const rowOf = key => [...root.querySelectorAll(spec.row)].find(r => spec.key(r) === key);
  const place = () => {
    for (const p of root.querySelectorAll('.edit-pills')) if (p.dataset.key !== editing || !p.isConnected) p.remove();
    if (!editing) return;
    const row = rowOf(editing);
    if (!row) { editing = null; return; }
    if (row.querySelector('[data-act$="details"][aria-expanded="true"]')) return; // its full panel is open instead
    const title = row.querySelector(spec.title);
    const host = title?.parentElement || row;
    if (host.querySelector(':scope > .edit-pills')) return;
    const box = document.createElement('div');
    box.className = 'edit-pills';
    box.dataset.key = editing;
    box.innerHTML = `${spec.html(editing)}<button type="button" class="entry-chip pill-more" data-pill-more>More…</button>`;
    // After the note line if there is one, so the pills sit right under the text.
    const sub = host.querySelector(':scope > .item-sub');
    if (sub) sub.after(box); else host.append(box);
    row.classList.add('pills-open');
  };
  const open = key => { editing = key; place(); };
  const close = () => {
    if (!editing) return;
    const row = rowOf(editing);
    row?.classList.remove('pills-open');
    editing = null;
    place();
  };

  const onFocus = ev => {
    const title = ev.target.closest?.(spec.title);
    const row = title?.closest(spec.row);
    if (!row || !root.contains(row)) return;
    const key = spec.key(row);
    if (key !== editing) { close(); open(key); }
  };
  // Tapping outside the row (and its pills) closes them; pickers and menus that
  // float above the page don't count.
  const onPointer = ev => {
    if (!editing) return;
    const row = rowOf(editing);
    if (row?.contains(ev.target) || ev.target.closest?.('.edit-pills, .pill-menu, .ref-picker, dialog, .toast')) return;
    close();
  };
  const onKey = ev => { if (ev.key === 'Escape' && editing && !ev.target.closest?.('.edit-pills select')) close(); };
  const onChange = ev => {
    const f = ev.target.closest?.('.edit-pills [data-pill]');
    if (!f) return;
    ev.stopPropagation();
    spec.change(f.closest('.edit-pills').dataset.key, f.dataset.pill, f.value);
  };
  const onClick = ev => {
    const pills = ev.target.closest?.('.edit-pills');
    if (!pills) return;
    const d = ev.target.closest('input[type="date"]');
    if (d) { try { d.showPicker(); } catch { /* the tap opens it */ } return; }
    const act = ev.target.closest('[data-pill-act]');
    if (act) { ev.stopPropagation(); spec.change(pills.dataset.key, act.dataset.pillAct, null); return; }
    if (ev.target.closest('[data-pill-more]')) {
      ev.stopPropagation();
      const row = rowOf(pills.dataset.key);
      const btn = row?.querySelector('[data-act="details"], [data-act="item-details"]');
      close();
      btn?.click();
    }
  };

  root.addEventListener('focusin', onFocus);
  root.addEventListener('change', onChange, true);
  root.addEventListener('click', onClick, true);
  document.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('keydown', onKey);
  // The list is redrawn after most changes: put the pills back under the same item.
  const watch = new MutationObserver(() => { if (editing) place(); });
  watch.observe(root, { childList: true, subtree: true });

  return {
    close,
    get editing() { return editing; },
    destroy() {
      root.removeEventListener('focusin', onFocus);
      root.removeEventListener('change', onChange, true);
      root.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
      watch.disconnect();
    },
  };
}
