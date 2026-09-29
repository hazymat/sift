// The one sheet for managing a set of named things: add, rename, drag to reorder and remove.
// Brain Dump types (Settings → Your words, and the ⋯ at the end of the Brain Dump's type
// filters; types are labels for filtering only), and Find Things' life areas and groups.
// Adding a type straight from the New note's "+ New" pill: addType.
//
//   openTypesSheet(changed)   changed() runs after every change (to redraw the page)
//   addType(label) → { id, label }
//   openManager({ title, intro, placeholder, list, rename, reorder, remove, add, defaults, keepOne })
//     list() → [{ id, label }] (read again after every change); rename(id, label), reorder(ids, movedId),
//     remove(id) (may ask first), add(label), defaults() (optional "Put back the defaults"); all may be async.
//     keepOne: the last one can't be removed.

import { sortable } from './sortable.js';
import { toast } from './toast.js';
import { word, dumpTypes, setDumpTypes, DEFAULT_TYPES, applyWords } from './words.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

const idFor = (label, list) => {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'type';
  return list.some(t => t.id === slug) ? `${slug}_${Math.random().toString(36).slice(2, 6)}` : slug;
};

export async function addType(label) {
  await applyWords();
  const list = dumpTypes().map(t => ({ ...t }));
  const made = { id: idFor(label, list), label };
  list.push(made);
  await setDumpTypes(list);
  return made;
}

export async function openTypesSheet(changed) {
  await applyWords();
  let list = dumpTypes().map(t => ({ ...t }));
  const save = async () => { await setDumpTypes(list); changed?.(); };
  openManager({
    title: 'Brain Dump types', intro: word('ph_set_types'), placeholder: word('ph_set_new_type'), keepOne: true,
    list: () => list,
    rename: async (id, label) => { list.find(t => t.id === id).label = label; await save(); },
    reorder: async ids => { list = ids.map(id => list.find(t => t.id === id)); await save(); },
    remove: async id => { list = list.filter(t => t.id !== id); await save(); },
    add: async label => { list.push({ id: idFor(label, list), label }); await save(); },
    defaults: async () => { list = DEFAULT_TYPES.map(t => ({ ...t })); await save(); toast('✓ Back to the defaults'); },
  });
}

export function openManager({ title, intro = '', placeholder = '', list, rename, reorder, remove, add, defaults = null, keepOne = false }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet words-sheet';
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  const draw = () => {
    const items = list();
    dlg.innerHTML = `<div class="sheet-handle"></div><h2>${esc(title)}</h2>
      ${intro ? `<p class="muted">${esc(intro)}</p>` : ''}
      <ul class="types-list">${items.map(t => `
        <li data-id="${esc(t.id)}">
          <button type="button" class="drag-handle" aria-label="Move ${esc(t.label)}">${icon('i-grip')}</button>
          <input data-type-label value="${esc(t.label)}" aria-label="Name" autocomplete="off">
          <button type="button" class="icon-btn small" data-type="remove" ${items.length > 1 || !keepOne ? '' : 'disabled'} aria-label="Remove">×</button>
        </li>`).join('')}
      </ul>
      <form class="types-add"><input name="new" placeholder="${esc(placeholder)}" autocomplete="off"><button type="submit">Add</button></form>
      ${defaults ? '<div class="backup-row"><button type="button" data-type="defaults">Put back the defaults</button></div>' : ''}`;
    // Drag one by its grip (or focus the grip and use the arrow keys).
    sortable(dlg.querySelector('.types-list'), {
      async onEnd({ item }) {
        const moved = item.dataset.id;
        await reorder([...dlg.querySelectorAll('.types-list > li')].map(li => li.dataset.id), moved);
        draw();
        dlg.querySelector(`.types-list > li[data-id="${CSS.escape(moved)}"] .drag-handle`)?.focus();
      },
    });
  };
  draw();
  dlg.addEventListener('change', async e => {
    if (!e.target.matches('[data-type-label]')) return;
    const id = e.target.closest('li').dataset.id;
    const was = list().find(t => t.id === id)?.label ?? '';
    const label = e.target.value.trim();
    if (!label) { e.target.value = was; return; }
    if (label === was) return;
    await rename(id, label);
    draw();
    toast('✓ Saved');
  });
  dlg.addEventListener('click', async e => {
    const act = e.target.closest('[data-type]')?.dataset.type;
    if (!act) return;
    if (act === 'defaults') { await defaults(); draw(); return; }
    if (act === 'remove' && (list().length > 1 || !keepOne)) { await remove(e.target.closest('li').dataset.id); draw(); }
  });
  dlg.addEventListener('submit', async e => {
    e.preventDefault();
    const label = e.target.elements.new.value.trim();
    if (!label) return;
    await add(label);
    draw();
    dlg.querySelector('.types-add input')?.focus();
  });
  dlg.showModal();
}
