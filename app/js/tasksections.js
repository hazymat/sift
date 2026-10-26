// Tasks' sections: their tabs, and the ⋯ Task sections sheet (as Batch Book's Edit books) to add, rename,
// reorder and remove them and give each an icon and a colour. The data is in words.js (taskSections).
//
//   sectionTabHtml(section, attrs)  a tab of the bar: its icon (if any), its name, its colour (if any)
//   editSections(tasks)             the sheet; removing a section moves its tasks to Task Dump

import * as store from './store.js';
import { taskSections, sectionEnds } from './words.js';
import { TINTS } from './colours.js';
import { sortable } from './sortable.js';
import { toast, undoable } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const hexOf = colour => TINTS.find(c => c.id === colour)?.hex || '';

// Line drawings: [id, name, lines, the shape a shaded icon fills softly].
export const ICONS = [
  ['inbox', 'Tray', '<path d="M3 13l3-8h12l3 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1.5 3h5l1.5-3h5"/>', '<path d="M3 13h5l1.5 3h5l1.5-3h5v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  ['bolt', 'Lightning', '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>', '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'],
  ['next', 'Arrows', '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>', ''],
  ['tag', 'Label', '<path d="M3 7a2 2 0 0 1 2-2h10l6 7-6 7H5a2 2 0 0 1-2-2z"/>', '<path d="M3 7a2 2 0 0 1 2-2h10l6 7-6 7H5a2 2 0 0 1-2-2z"/>'],
  ['done', 'Tick', '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', '<circle cx="12" cy="12" r="9"/>'],
  ['all', 'Stack', '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5"/>', '<path d="M12 3l9 5-9 5-9-5z"/>'],
  ['cup', 'Cup', '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2M14 3v2"/>', '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/>'],
  ['cal', 'Calendar', '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/><rect x="8" y="13" width="4" height="3.5" rx=".8"/>', '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V10H4z"/>'],
  ['umbrella', 'Umbrella', '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/>', '<path d="M3 12a9 9 0 0 1 18 0z"/>'],
  ['star', 'Star', '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'],
  ['flag', 'Flag', '<path d="M5 21V4M5 4h12l-2.5 4.5L17 13H5"/>', '<path d="M5 4h12l-2.5 4.5L17 13H5z"/>'],
  ['hourglass', 'Hourglass', '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>', '<path d="M8.5 18c1-2 6-2 7 0l1 3h-9z"/>'],
  ['sun', 'Sun', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', '<circle cx="12" cy="12" r="4"/>'],
  ['moon', 'Moon', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'],
  ['home', 'Home', '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>', '<path d="M5 9.5L12 4l7 5.5V20h-5v-6h-4v6H5z"/>'],
  ['work', 'Briefcase', '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M3 12.5h18"/>', '<path d="M3 9.5A2.5 2.5 0 0 1 5.5 7h13A2.5 2.5 0 0 1 21 9.5v3H3z"/>'],
  ['cart', 'Trolley', '<path d="M3 4h2.5l2.2 11h10.5l2-8H6.5"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>', '<path d="M6.5 7h13.7l-2 8H7.7z"/>'],
  ['phone', 'Phone', '<path d="M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', '<path d="M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'],
  ['mail', 'Envelope', '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>', '<path d="M4 7l8 6 8-6V7.5A2.5 2.5 0 0 0 17.5 5h-11A2.5 2.5 0 0 0 4 7.5z"/>'],
  ['chat', 'Speech bubble', '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>', '<path d="M4 5h16v11H9l-5 4z"/>'],
  ['people', 'People', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.8 3.5 5.7"/>', '<circle cx="9" cy="8" r="3.5"/>'],
  ['heart', 'Heart', '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>', '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>'],
  ['bookmark', 'Bookmark', '<path d="M6 3h12v18l-6-4.5L6 21z"/>', '<path d="M6 3h12v18l-6-4.5L6 21z"/>'],
  ['pin', 'Map pin', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/>'],
  ['bell', 'Bell', '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/>'],
  ['bulb', 'Light bulb', '<path d="M9 17.5h6M10 21h4M9 17.5c0-2.5-3-4-3-8a6 6 0 0 1 12 0c0 4-3 5.5-3 8"/>', '<path d="M9 17.5c0-2.5-3-4-3-8a6 6 0 0 1 12 0c0 4-3 5.5-3 8z"/>'],
  ['target', 'Target', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>', '<circle cx="12" cy="12" r="5"/>'],
  ['flame', 'Flame', '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-2.5 2-3 4.5-3 6.5-1.5-.5-2.5-2-2.5-3.5-2 1.5-3 4.5-3 8A6.5 6.5 0 0 0 12 21z"/>', '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-2.5 2-3 4.5-3 6.5-1.5-.5-2.5-2-2.5-3.5-2 1.5-3 4.5-3 8A6.5 6.5 0 0 0 12 21z"/>'],
  ['leaf', 'Leaf', '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-13 15z"/><path d="M5 19c3-5 6-8 10-10"/>', '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-13 15z"/>'],
  ['wrench', 'Spanner', '<path d="M14.5 4.5a4.5 4.5 0 0 0 5 5.9L11 19a2.1 2.1 0 0 1-3-3l8.6-8.5a4.5 4.5 0 0 1-2.1-3z"/>', '<path d="M14.5 4.5a4.5 4.5 0 0 0 5 5.9L11 19a2.1 2.1 0 0 1-3-3l8.6-8.5a4.5 4.5 0 0 1-2.1-3z"/>'],
  ['car', 'Car', '<path d="M4 16v-4l2-5h12l2 5v4z"/><path d="M4 12h16"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>', '<path d="M4 12l2-5h12l2 5z"/>'],
  ['money', 'Money', '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/>', '<circle cx="12" cy="12" r="2.8"/>'],
  ['book', 'Book', '<path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14C17 4 14 4.5 12 6z"/><path d="M12 6v14"/>', '<path d="M12 6c2-1.5 5-2 8-1.5v14c-3-.5-6 0-8 1.5z"/>'],
  ['clock', 'Clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>', '<circle cx="12" cy="12" r="9"/>'],
  ['rocket', 'Rocket', '<path d="M12 3c3.5 2.5 5 6 5 10l-2 3H9l-2-3c0-4 1.5-7.5 5-10z"/><circle cx="12" cy="10" r="1.8"/><path d="M9 16l-2.5 3.5M15 16l2.5 3.5M12 17v4"/>', '<path d="M12 3c3.5 2.5 5 6 5 10l-2 3H9l-2-3c0-4 1.5-7.5 5-10z"/>'],
  ['box', 'Box', '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>', '<rect x="3" y="4" width="18" height="5" rx="1.5"/>'],
];
const drawing = (id, shaded) => { const ic = ICONS.find(x => x[0] === id); return `<svg class="sec-ico" viewBox="0 0 24 24" aria-hidden="true">${shaded && ic[3] ? `<g class="sec-shade">${ic[3]}</g>` : ''}${ic[2]}</svg>`; };
// A section's icon: a line drawing, an emoji typed in, or nothing.
export const iconHtml = x => (!x.icon ? '' : ICONS.some(ic => ic[0] === x.icon) ? drawing(x.icon, x.shaded) : `<span class="sec-emo">${esc(x.icon)}</span>`);
export const sectionTabHtml = (x, attrs) => `<button type="button" ${attrs}${x.colour ? ` class="sec-coloured" style="--sec:${hexOf(x.colour)}"` : ''}>${iconHtml(x)}${esc(x.name)}</button>`;

export function editSections(tasks) {
  const had = taskSections().map(x => x.id);
  let own = taskSections().map(x => ({ id: x.id, name: x.name, icon: x.icon, colour: x.colour, shaded: !!x.shaded }));
  const ends = ['done', 'all'].map(id => Object.assign({}, sectionEnds()[id]));
  let picking = null; // the section whose icon and colour are open below it
  const all = () => own.concat(ends);
  const dumpName = () => own.find(s => s.id === 'inbox').name.trim() || 'Task Dump';
  const count = id => tasks.filter(t => !t.done_at && !t.deleted_at && !t.archived_at && !t.project_id && (t.horizon || 'now') === id).length;
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet bb-sections-sheet task-sections-sheet';
  document.body.append(dlg);
  const look = x => `<button type="button" class="ts-look${x.icon ? '' : ' none'}" data-pick="${esc(x.id)}" aria-label="Icon and colour"${x.colour ? ` style="--sec:${hexOf(x.colour)}"` : ''}>${iconHtml(x) || 'Icon'}</button>`;
  const swatch = x => `<button type="button" class="ts-swatch${x.colour ? '' : ' none'}" data-pick="${esc(x.id)}" aria-label="Colour"${x.colour ? ` style="--sec:${hexOf(x.colour)}"` : ''}></button>`;
  const picker = x => `<li class="ts-picker"${x.colour ? ` style="--sec:${hexOf(x.colour)}"` : ''}>
      <div class="ts-pick-head"><span class="ts-pick-label">Icon</span><div class="segmented ts-shade" role="group" aria-label="Icon style"><button type="button" data-shaded="0" aria-pressed="${!x.shaded}">Line</button><button type="button" data-shaded="1" aria-pressed="${!!x.shaded}">Shaded</button></div></div>
      <div class="ts-icons">${ICONS.map(ic => `<button type="button" data-icon="${ic[0]}" title="${ic[1]}" aria-label="${ic[1]}" aria-pressed="${x.icon === ic[0]}">${drawing(ic[0], x.shaded)}</button>`).join('')}</div>
      <span class="ts-pick-label">Colour</span>
      <div class="ts-colours"><button type="button" class="none" data-colour="" title="No colour" aria-label="No colour" aria-pressed="${!x.colour}"></button>${TINTS.map(c => `<button type="button" data-colour="${c.id}" style="--sw:${c.hex}" title="${c.label}" aria-label="${c.label}" aria-pressed="${x.colour === c.id}"></button>`).join('')}</div>
      <span class="ts-pick-label">Or an emoji</span>
      <div class="ts-emoji"><input data-sec-emoji placeholder="Type or paste one" maxlength="8" value="${ICONS.some(ic => ic[0] === x.icon) ? '' : esc(x.icon)}" aria-label="Emoji"><button type="button" data-icon="">No icon</button><button type="button" class="primary" data-pick-done>Done</button></div>
    </li>`;
  const row = x => `<li class="bb-sec-row ts-row" data-id="${esc(x.id)}">
      <button type="button" class="drag-handle bb-sec-grip" aria-label="Move ${esc(x.name)} up or down" title="Drag to move">${icon('i-grip')}</button>
      ${look(x)}
      <input class="bb-sec-name" data-k="name" value="${esc(x.name)}" placeholder="Name, e.g. Waiting" aria-label="Section name">
      ${swatch(x)}
      ${x.id === 'inbox' ? '<span class="ts-lock" title="New tasks from Brain Dump, notes and the tour land here, so it stays">🔒</span>' : `<button type="button" class="icon-btn bb-x" data-remove="${esc(x.id)}" aria-label="Remove ${esc(x.name)}">×</button>`}
      ${x.id === 'later' ? '<span class="ts-note muted">Contracts and Scans reminders go here.</span>' : x.id === 'inbox' ? '<span class="ts-note muted">New tasks from Brain Dump, notes and the tour land here.</span>' : ''}
    </li>${picking === x.id ? picker(x) : ''}`;
  const endRow = x => `<li class="bb-sec-row ts-row ts-end" data-id="${x.id}"><span></span>${look(x)}<span class="ts-fixed">${esc(x.name)} <span class="muted">${x.id === 'done' ? 'ticked tasks' : 'every task'}</span></span>${swatch(x)}<span class="ts-lock" title="Always shown">🔒</span></li>${picking === x.id ? picker(x) : ''}`;
  const draw = () => {
    const gone = had.filter(id => !own.some(x => x.id === id));
    const moving = gone.reduce((n, id) => n + count(id), 0);
    dlg.innerHTML = `<div class="sheet-handle"></div>
      <h2>Task sections</h2>
      <p class="muted">Rename them, give them an icon or a colour, or add your own. Drag a section by ⠿ to change the order. Removing one moves its tasks to ${esc(dumpName())}.</p>
      <ul class="bb-sec-list ts-list">${own.map(row).join('')}</ul>
      <button type="button" data-add>+ Add a section</button>
      ${moving || gone.includes('later') ? `<p class="ts-warn">${moving ? `${moving} task${moving === 1 ? '' : 's'} will move to ${esc(dumpName())}.` : ''}${gone.includes('later') ? ` Contracts and Scans reminders will go into ${esc(dumpName())} from now on.` : ''}</p>` : ''}
      <h3 class="milestone ts-ends-head">Always at the end</h3>
      <ul class="bb-sec-list ts-list">${ends.map(endRow).join('')}</ul>
      <div class="sheet-actions"><button type="button" data-cancel>Cancel</button><span class="spacer"></span><button type="button" class="primary" data-save>Save</button></div>`;
    sortable(dlg.querySelector('.ts-list'), { onEnd() { read(); const ids = Array.from(dlg.querySelectorAll('.ts-list .ts-row:not(.ts-end)')).map(r => r.dataset.id); own = ids.map(id => own.find(x => x.id === id)); draw(); } });
  };
  const read = () => {
    for (const r of dlg.querySelectorAll('.ts-row:not(.ts-end)')) own.find(x => x.id === r.dataset.id).name = r.querySelector('[data-k="name"]').value;
    const emoji = dlg.querySelector('[data-sec-emoji]')?.value.trim();
    const x = all().find(s => s.id === picking);
    if (x && emoji) x.icon = emoji;
  };
  dlg.addEventListener('click', async ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const x = all().find(s => s.id === picking);
    if (b.dataset.pick) { read(); picking = picking === b.dataset.pick ? null : b.dataset.pick; draw(); dlg.querySelector('.ts-picker')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (b.dataset.pickDone !== undefined) { read(); picking = null; draw(); return; }
    if (b.dataset.shaded && x) { read(); x.shaded = b.dataset.shaded === '1'; draw(); return; }
    if (b.dataset.icon !== undefined && x) { read(); x.icon = b.dataset.icon; draw(); return; }
    if (b.dataset.colour !== undefined && x) { read(); x.colour = b.dataset.colour; draw(); return; }
    if (b.dataset.add !== undefined) { read(); const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; own.push({ id, name: '', icon: '', colour: '', shaded: false }); draw(); dlg.querySelector(`.ts-row[data-id="${id}"] .bb-sec-name`).focus(); return; }
    if (b.dataset.remove) { read(); own = own.filter(s => s.id !== b.dataset.remove); if (picking === b.dataset.remove) picking = null; draw(); return; }
    if (b.dataset.cancel !== undefined) return dlg.close();
    if (b.dataset.save !== undefined) {
      read();
      own = own.filter(s => s.id === 'inbox' || s.name.trim());
      for (const s of own) s.name = s.name.trim();
      if (new Set(own.map(s => s.name.toLowerCase())).size !== own.length) { toast('Two sections have the same name'); return; }
      const before = await store.getSettings();
      const gone = had.filter(id => !own.some(s => s.id === id));
      const moved = tasks.filter(t => gone.includes(t.horizon || 'now'));
      await store.updateMany('tasks', moved.map(t => [t.id, { horizon: 'inbox' }]));
      await store.updateSettings({ task_sections: own, task_section_ends: Object.fromEntries(ends.map(e => [e.id, { icon: e.icon, colour: e.colour, shaded: !!e.shaded }])) });
      dlg.close();
      const words = [moved.length ? `${moved.length} task${moved.length === 1 ? '' : 's'} moved to ${dumpName()}` : '', gone.includes('later') ? `Contracts and Scans reminders now go into ${dumpName()}` : ''].filter(Boolean);
      if (!words.length) { toast('Sections saved'); return; }
      undoable(`Sections saved. ${words.join('. ')}.`, async () => {
        for (const t of moved) await store.update('tasks', t.id, { horizon: t.horizon ?? null });
        await store.updateSettings({ task_sections: before.task_sections ?? null, task_section_ends: before.task_section_ends ?? null });
      });
    }
  });
  dlg.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('[data-sec-emoji]')) { ev.preventDefault(); read(); picking = null; draw(); } });
  dlg.addEventListener('close', () => dlg.remove());
  draw();
  dlg.showModal();
}
