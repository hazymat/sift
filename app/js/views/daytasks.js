// Advanced day tasks (Esc never leaves it: it only steps out of what's being edited; ‹ Day Planner does): one day's tasks as cases, for working on several at once
// (#/planner/<YYYY-MM-DD>/advanced, from the Advanced link under the Day
// Planner's tasks). Each task is a card with its tick, note, comments and
// files all on show; ticked ones drop to Done, crossed out. The day's schedule
// is a plain list on the right. Share copies the day's cases as text, with
// choices of what goes in (comments, notes, the schedule, files added).
//
// The cards are the Day Planner's own day tasks (day items without a time),
// so everything here is the same as there: ticking a copy brought in from
// Tasks ticks the task (link.js), and comments are the task's.

import * as store from '../store.js';
import { isoDate, parseDate, addDays, itemsFor, addItem, dateText, showTime } from '../days.js';
import { undoable, toast } from '../toast.js';
import { richText, toHtml } from '../richtext.js';
import { debounced } from '../autosave.js';
import * as att from '../attachments.js';
import { createListKit, typingIn } from '../listkit.js';
import { byRank, rankOf, reorderWrites, firstKey } from '../order.js';
import { tickWave, fadeFold } from '../tickwave.js';
import { commentsHtml, mountComments, commentsFor, closingComment, attachAsComment, moveComments } from '../comments.js';
import { deleteLinked, deleteAll, makeUnique } from '../link.js';
import { pillMenu } from '../pillmenu.js';
import { askEmptied } from '../ask.js';
import { keys } from '../keys.js';
import { keepDraft, draftCleared } from '../drafts.js';
import { autosizeAll } from '../inline.js';
import { addTask } from '../tasks.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const byPlace = byRank();
const EXPORT_DEFAULTS = { todo: true, done: true, notes: true, comments: true, files: true, schedule: false };

export default {
  async mount(el) {
    this.gone?.abort();
    const gone = this.gone = new AbortController();
    const page = { signal: gone.signal };
    let date = /^#\/planner\/(\d{4}-\d{2}-\d{2})/.exec(location.hash)?.[1] || isoDate();
    let items = [];
    let tasks = new Map(); // task id → task, for the cards brought in from Tasks
    let projects = new Map();

    el.innerHTML = `<div class="adv">
      <div class="adv-top">
        <button type="button" class="back" data-act="back">‹ Day Planner</button>
        <div class="day-nav adv-nav">
          <button type="button" data-act="prev" class="day-step" aria-label="Previous day"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg></button>
          <button type="button" data-act="today">Today</button>
          <button type="button" data-act="next" class="day-step" aria-label="Next day"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button>
        </div>
        <span class="spacer"></span>
        <button type="button" class="share-btn" data-act="share" title="Share or export this day's tasks"><svg class="icon" aria-hidden="true"><use href="#i-share"/></svg><span class="share-word"> Share</span></button>
      </div>
      <h1 class="adv-day"><span class="adv-date"></span> <span class="adv-word muted">Advanced</span></h1>
      <div class="adv-body">
        <section class="adv-main" aria-label="Tasks">
          <div class="adv-new"><input id="adv-new" class="no-inline" placeholder="New task" autocomplete="off" enterkeyhint="done" aria-label="New task"></div>
          <h2 class="adv-h">To do <span class="adv-count muted" data-count="todo"></span></h2>
          <ul class="adv-list adv-todo"></ul>
          <p class="adv-empty muted" hidden>Nothing to do on this day. Type a task above, or bring tasks in from the Day Planner.</p>
          <h2 class="adv-h adv-done-h">Done <span class="adv-count muted" data-count="done"></span></h2>
          <ul class="adv-list adv-done"></ul>
        </section>
        <aside class="adv-schedule" aria-label="Schedule"><h2 class="adv-h">Schedule</h2><ol class="adv-sched"></ol></aside>
      </div>
    </div>
    <dialog class="sheet adv-export" aria-label="Share this day's tasks"></dialog>`;
    const $ = s => el.querySelector(s);

    const go = d => { location.hash = `#/planner/${d}/advanced`; };
    const dayTitle = () => dateText(parseDate(date), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // ---------- the rows ----------
    // A row: ⠿, tick, the name with its note beside it (smaller, in italics), then on the right the
    // latest comments, a line to add one, 📎 and All n. Clicking the comments (or All n) opens all
    // of the case's comments over the page, scrolling, to add, edit, remove and attach.
    const LATEST = 2;
    const filesOf = new Map(); // parent id → its files
    let commentsOf = new Map(); // 'task_id:…' / 'item_id:…' → comments, oldest first
    const keyOf = o => (o.task_id ? `task_id:${o.task_id}` : `item_id:${o.item_id}`);
    const at = iso => { const d = new Date(iso); const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); return isoDate(d) === date ? time : `${dateText(d, { day: 'numeric', month: 'short' })} ${time}`; };
    const oneLine = md => (md || '').replace(/\[([^\]]*)\]\(sift:[^)]*\)/g, '$1').replace(/\*\*|~~/g, '').replace(/^\s*[-*]\s+/gm, '• ').replace(/^(?:#{1,6}|-#|\+#|#\+)\s+/gm, '').split('\n').map(l => l.trim()).filter(Boolean).join(' · ');
    function row(i) {
      const task = i.task_id && tasks.get(i.task_id);
      const project = task?.project_id && projects.get(task.project_id);
      const from = task ? `<a class="adv-from" href="#/tasks${project ? `/list/${project.id}` : ''}" title="Brought in from ${project ? 'a project' : 'Tasks'}: linked">${project ? `📁 ${esc(project.name)}` : '🔗 Tasks'}</a>` : '';
      const own = (filesOf.get(i.id) || []).concat(task ? filesOf.get(task.id) || [] : []);
      const list = commentsOf.get(keyOf(ownerOf(i.id))) || [];
      const latest = list.slice(-LATEST).map(c => {
        const files = filesOf.get(c.id) || [];
        const text = oneLine(c.body) || (files.length ? '' : '…');
        return `<li><span class="adv-at">${esc(at(c.at))}</span> <span class="adv-said">${esc(text)}${files.length ? ` <span class="adv-files">${files.some(f => f.kind === 'image') ? '📷' : '📎'}${files.length > 1 ? ` ${files.length}` : ''}</span>` : ''}</span></li>`;
      }).join('');
      const note = oneLine(i.notes);
      return `<li class="adv-row${i.done_at ? ' done' : ''}" data-id="${i.id}">
        <span class="drag-handle" role="button" tabindex="-1" aria-label="Choose or move">⠿</span>
        <input type="checkbox" class="tick" aria-label="Done"${i.done_at ? ' checked' : ''}>
        <div class="adv-text">
          <textarea class="item-title adv-title no-inline" rows="1" aria-label="Task">${esc(i.title)}</textarea>${from}<button type="button" class="adv-note-peek${note ? '' : ' empty'}" data-act="note" title="${note ? 'Edit the note' : 'Add a note'}">${note ? esc(note) : '+ Note'}</button>
          <div class="adv-note" data-note-for="${i.id}" hidden></div>
        </div>
        <div class="adv-side">
          ${latest ? `<ol class="adv-latest" data-act="all" title="All comments">${latest}</ol>` : ''}
          <div class="adv-quick">
            <input class="adv-quick-add no-inline" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off">
            <button type="button" class="adv-attach" data-act="attach" title="Attach photos, PDFs or text files, as a comment with its time (or drop them on the row)">${icon('i-clip')}</button>
            ${own.length ? att.countChip(own) : ''}
            ${list.length > LATEST ? `<button type="button" class="adv-all" data-act="all" title="All comments: add, edit, remove">All ${list.length}</button>` : ''}
          </div>
        </div>
        <button type="button" class="adv-more" data-act="menu" aria-label="More for this task">⋯</button>
      </li>`;
    }

    function schedule() {
      const timed = items.filter(i => i.time).sort((a, b) => a.time.localeCompare(b.time));
      $('.adv-sched').innerHTML = timed.length
        ? timed.map(i => `<li class="${i.done_at ? 'done' : ''}${i.dropped_at ? ' dropped' : ''}"><span class="adv-when">${showTime(i.time)}${i.end_time ? `–${showTime(i.end_time)}` : ''}</span> <span class="adv-what">${esc(i.title)}</span></li>`).join('')
        : '<li class="muted adv-sched-empty">Nothing on the schedule.</li>';
    }

    async function load() {
      items = await itemsFor(date);
      const ids = [...new Set(items.map(i => i.task_id).filter(Boolean))];
      tasks = new Map((await Promise.all(ids.map(id => store.get('tasks', id)))).filter(Boolean).map(t => [t.id, t]));
      projects = new Map((await store.list('projects')).map(p => [p.id, p]));
      filesOf.clear();
      for (const [parent, list] of await att.byParent()) filesOf.set(parent, list);
      commentsOf = new Map();
      for (const c of (await store.list('comments')).sort((x, y) => (x.at || '').localeCompare(y.at || ''))) {
        const k = keyOf(c);
        if (!commentsOf.has(k)) commentsOf.set(k, []);
        commentsOf.get(k).push(c);
      }
    }

    // What's being typed on a row's Add a comment line, kept through every redraw (and a reload: drafts.js), with the cursor.
    const typed = new Map();
    el.addEventListener('input', ev => { const box = ev.target.closest?.('.adv-quick-add'); if (box) typed.set(box.closest('.adv-row').dataset.id, box.value); }, page);
    async function render() {
      $('.adv-date').textContent = dayTitle();
      const focus = document.activeElement?.closest?.('.adv-quick-add, .adv-title, #adv-new');
      const kept = focus && { id: focus.closest('.adv-row')?.dataset.id, cls: focus.id ? '#adv-new' : focus.classList.contains('adv-title') ? '.adv-title' : '.adv-quick-add', value: focus.value, at: focus.selectionStart };
      await load();
      const all = items.filter(i => !i.time && !i.dropped_at);
      const todo = all.filter(i => !i.done_at).sort(byPlace);
      const done = all.filter(i => i.done_at).sort(byPlace);
      closePop();
      $('.adv-todo').innerHTML = todo.map(row).join('');
      $('.adv-done').innerHTML = done.map(row).join('');
      $('.adv-empty').hidden = !!todo.length;
      $('.adv-done-h').hidden = !done.length;
      el.querySelector('[data-count="todo"]').textContent = todo.length ? todo.length : '';
      el.querySelector('[data-count="done"]').textContent = done.length ? `${done.length}/${all.length}` : '';
      schedule();
      for (const box of el.querySelectorAll('.adv-quick-add')) { const id = box.closest('.adv-row').dataset.id; if (typed.get(id)) box.value = typed.get(id); keepDraft(box, `adv-comment:${id}`); }
      if (kept) {
        const back = kept.cls === '#adv-new' ? $('#adv-new') : el.querySelector(`.adv-row[data-id="${CSS.escape(kept.id || '')}"] ${kept.cls}`);
        if (back) { back.value = kept.value; back.focus(); back.setSelectionRange?.(kept.at ?? kept.value.length, kept.at ?? kept.value.length); }
      }
      autosizeAll($('.adv-body'));
      kit.attach($('.adv-todo'));
    }
    // Nothing is redrawn from under someone typing (a sync, the link following a change).
    const refresh = async () => { if ((typingIn(document.activeElement) && el.contains(document.activeElement)) || pop) return; await render(); };

    // The note: its line beside the name opens the notes editor (no toolbar, as in Tasks) under it; leaving closes it.
    function openNote(rowEl) {
      const box = rowEl.querySelector('[data-note-for]');
      const it = items.find(i => i.id === box.dataset.noteFor);
      if (!it) return;
      box.hidden = false;
      rowEl.classList.add('noting');
      if (!box._editor) {
        const auto = debounced(async () => {
          const text = box._editor?.value.replace(/\s+$/, '');
          if (text === undefined || text === (it.notes || '')) return;
          await store.update('day_items', it.id, { notes: text });
          it.notes = text;
        }, 700);
        box._editor = richText(box, { value: it.notes || '', placeholder: 'Note', origin: () => ({ collection: 'day_items', id: it.id, title: it.title, field: 'notes' }), onChange: () => auto.trigger(), bare: true });
        box.addEventListener('focusout', () => setTimeout(async () => { if (box.contains(document.activeElement)) return; await auto.flush(); render(); }, 150));
      }
      box._editor.focus?.();
      if (!box.contains(document.activeElement)) box.querySelector('[contenteditable]')?.focus();
    }

    // All of a case's comments, over the page under its row: the full comments box (add, edit, remove, attach), scrolling.
    let pop = null;
    function openPop(rowEl) {
      if (pop?._row === rowEl) return;
      closePop();
      pop = document.createElement('div');
      pop.className = 'adv-pop';
      pop._row = rowEl;
      pop.innerHTML = commentsHtml(ownerOf(rowEl.dataset.id));
      rowEl.querySelector('.adv-side').append(pop);
      mountComments(pop, () => {});
      rowEl.classList.add('popped');
    }
    function closePop() {
      if (!pop) return;
      const was = pop;
      pop = null;
      was._row.classList.remove('popped');
      was.remove();
    }
    // It opens only on a click (the latest comments, or All n). A press anywhere else closes it and still does what was pressed
    // (a tick ticks): the row's latest comments are drawn again only after that click has happened.
    document.addEventListener('pointerdown', ev => { if (pop && !pop.contains(ev.target) && !ev.target.closest('.adv-latest, .adv-all, .pill-menu, dialog, .toast')) { closePop(); setTimeout(refresh, 400); } }, page);
    addEventListener('keydown', ev => { if (ev.key === 'Escape' && pop && !ev.defaultPrevented && !typingIn(ev.target)) { ev.preventDefault(); closePop(); render(); } }, { capture: true, signal: gone.signal });

    // A comment typed on the row's own line: added there, and the row shows it.
    el.addEventListener('keydown', async ev => {
      const box = ev.target.closest?.('.adv-quick-add');
      if (!box) return;
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); box.blur(); return; } // what's typed stays, as in comments
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const text = box.value.trim();
      if (!text) return;
      const id = box.closest('.adv-row').dataset.id;
      const made = await store.create('comments', { ...ownerOf(id), at: new Date().toISOString(), body: text });
      box.value = '';
      typed.delete(id);
      draftCleared(box);
      await render();
      el.querySelector(`.adv-row[data-id="${CSS.escape(id)}"] .adv-quick-add`)?.focus();
      undoable('Comment added', async () => { await store.remove('comments', made.id); await render(); });
    }, page);

    // ---------- choosing several (the selection bar) ----------
    const label = ids => (ids.length === 1 ? `"${items.find(i => i.id === ids[0])?.title || 'task'}"` : `${ids.length} tasks`);
    async function setMany(ids, fields, words) {
      const before = ids.map(id => { const i = items.find(x => x.id === id); return [id, Object.fromEntries(Object.keys(fields).map(k => [k, i?.[k] ?? null]))]; });
      await store.updateMany('day_items', ids.map(id => [id, fields]));
      kit.clear();
      await render();
      undoable(`${words} ${label(ids)}`, async () => { await store.updateMany('day_items', before); await render(); });
    }
    async function tickMany(ids) {
      const cards = ids.map(id => el.querySelector(`.adv-row[data-id="${CSS.escape(id)}"]`)).filter(Boolean);
      await store.updateMany('day_items', ids.map(id => [id, { done_at: new Date().toISOString() }]));
      kit.clear();
      cards.forEach(c => { c.querySelector('.tick').checked = true; });
      await Promise.all(cards.map((c, n) => tickWave(c, { title: c.querySelector('.adv-title'), lane: c.querySelector('.adv-text'), delay: 100 + n * 200 }).done));
      await fadeFold(cards);
      await render();
      undoable(`Done: ${label(ids)}`, async () => { await store.updateMany('day_items', ids.map(id => [id, { done_at: null }])); await render(); }, ids.length === 1 ? { more: closingComment(ownerOf(ids[0])) } : undefined);
    }
    const ownerOf = id => { const i = items.find(x => x.id === id); return i?.task_id && tasks.has(i.task_id) ? { task_id: i.task_id } : { item_id: id }; };
    async function deleteMany(ids) {
      const pick = await deleteLinked({ items: ids }, 'the Day Planner');
      if (!pick) return;
      const undo = await deleteAll(pick);
      kit.clear();
      await render();
      undoable(`Deleted ${label(ids)}${pick.tasks.length ? ' everywhere' : ''}`, async () => { await undo(); await render(); });
    }
    async function uniqueMany(ids) {
      const linked = ids.filter(id => tasks.has(items.find(i => i.id === id)?.task_id));
      if (!linked.length) { toast(ids.length === 1 ? "This one is only here already" : 'These are only here already'); return; }
      const undo = await makeUnique(linked);
      if (!undo) return;
      kit.clear();
      await render();
      undoable(`Kept only here: ${label(linked)}`, async () => { await undo(); await render(); });
    }
    // → Tasks: it leaves the day and becomes a task (one brought in from a task just leaves the day).
    async function toTasks(ids) {
      const undo = [];
      for (const id of ids) {
        const it = items.find(i => i.id === id);
        if (!it) continue;
        if (!(it.task_id && tasks.has(it.task_id))) {
          const made = await addTask({ title: it.title, notes: it.notes || '', contact_ids: it.contact_ids || [], case_id: it.case_id || null, source_thought_id: it.source_thought_id || null, done_at: it.done_at || null, status: it.done_at ? 'done' : 'todo', estimate_min: it.estimate_min ?? null, from_day: { date: it.date, time: null, end_time: null } });
          await moveComments({ item_id: it.id }, { task_id: made.id });
          undo.push(async () => { await store.remove('tasks', made.id); await moveComments({ task_id: made.id }, { item_id: it.id }); });
        }
        await store.remove('day_items', it.id);
        undo.push(() => store.restore('day_items', it.id));
      }
      kit.clear();
      await render();
      undoable(`${label(ids)} ${ids.length === 1 ? 'is' : 'are'} now in Tasks`, async () => { for (const u of undo.reverse()) await u(); await render(); });
    }
    const letGo = ids => { const now = new Date().toISOString(); return setMany(ids, { dropped_at: now, archived_at: now }, 'Let go (in the Archive):'); };
    const archive = ids => setMany(ids, { archived_at: new Date().toISOString() }, 'Archived');

    // Choosing and dragging are listkit.js and sortable.js, the same code as Tasks (hold anywhere on a row to lift it,
    // the tilt and wobble, rows sliding aside, the dashed outline where it lands), so a change there reaches both.
    // Day tasks have no sub-tasks, so no indenting or dropping onto a row.
    const kit = this.kit = createListKit({
      reorder: true, holdAnywhere: true, sideways: false, noun: 'task',
      actions: [
        { id: 'done', label: 'Done', key: 'Ctrl+Enter', run: tickMany },
        { id: 'letgo', label: 'Let go', run: letGo },
        { id: 'to-tasks', label: '→ Tasks', run: toTasks },
        { id: 'unique', label: 'Keep only here', run: uniqueMany, when: () => [...el.querySelectorAll('.adv-todo .adv-row.selected')].some(c => tasks.has(items.find(i => i.id === c.dataset.id)?.task_id)) },
        { id: 'archive', label: 'Archive', key: 'A', run: archive },
        { id: 'delete', label: 'Delete', key: 'D', danger: true, run: deleteMany },
      ],
      onReorder: async (rows, words, ul, moved) => {
        const order = rows.map(r => items.find(i => i.id === r.id)).filter(Boolean);
        const writes = reorderWrites(order, i => rankOf(i), moved);
        const before = writes.map(([i]) => [i.id, { rank: i.rank ?? null }]);
        await store.updateMany('day_items', writes.map(([i, rank]) => [i.id, { rank }]));
        await render();
        undoable(words || 'Moved', async () => { await store.updateMany('day_items', before); await render(); });
      },
    });

    // ---------- on a card ----------
    el.addEventListener('change', async ev => {
      const t = ev.target;
      const cardEl = t.closest('.adv-row');
      if (!cardEl) return;
      const id = cardEl.dataset.id;
      const it = items.find(i => i.id === id);
      if (t.classList.contains('tick')) {
        if (t.checked) return tickMany([id]);
        await store.update('day_items', id, { done_at: null });
        await render();
        undoable(`Not done: ${it?.title || ''}`, async () => { await store.update('day_items', id, { done_at: it.done_at }); await render(); });
      } else if (t.classList.contains('adv-title')) {
        const title = t.value.trim();
        if (title) { if (title !== it.title) { await store.update('day_items', id, { title }); it.title = title; } }
        else if (await askEmptied('task')) await deleteMany([id]);
        else t.value = it.title;
      }
    }, page);
    el.addEventListener('keydown', ev => {
      const t = ev.target;
      if (t.classList?.contains('adv-title') && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); t.blur(); }
      if (t.classList?.contains('adv-title') && ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { const tick = t.closest('.adv-row').querySelector('.tick'); tick.checked = !tick.checked; tick.dispatchEvent(new Event('change', { bubbles: true })); }
      if (t.classList?.contains('adv-title') && ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); t.blur(); }
    }, page);
    el.addEventListener('input', ev => { if (ev.target.classList?.contains('adv-title')) { ev.target.style.height = 'auto'; ev.target.style.height = `${ev.target.scrollHeight}px`; } }, page);

    // 📎 on a card: the files go in as a comment of their own, with its time.
    let picker = null;
    function attachTo(cardEl) {
      picker?.remove();
      picker = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: att.ACCEPT, hidden: true });
      picker.onchange = async () => { await attachAsComment(ownerOf(cardEl.dataset.id), [...picker.files], render); picker.remove(); picker = null; };
      document.body.append(picker);
      picker.click();
    }
    // A screenshot pasted into a row's Add a comment line: added as a comment of its own (with what's typed, if anything).
    el.addEventListener('paste', async ev => {
      const box = ev.target.closest?.('.adv-quick-add');
      const files = [...(ev.clipboardData?.files || [])];
      if (!box || !files.length) return;
      ev.preventDefault();
      const id = box.closest('.adv-row').dataset.id;
      const text = box.value.trim();
      if (text) { await store.create('comments', { ...ownerOf(id), at: new Date().toISOString(), body: text }); box.value = ''; typed.delete(id); draftCleared(box); }
      await attachAsComment(ownerOf(id), files, render);
    }, page);
    // Files dropped on a card (not on its comments, which take them themselves): the same.
    el.addEventListener('dragover', ev => { if (ev.target.closest('.adv-row') && [...(ev.dataTransfer?.types || [])].includes('Files')) ev.preventDefault(); }, page);
    el.addEventListener('drop', async ev => {
      const cardEl = ev.target.closest('.adv-row');
      const files = [...(ev.dataTransfer?.files || [])];
      if (!cardEl || !files.length) return;
      ev.preventDefault();
      await attachAsComment(ownerOf(cardEl.dataset.id), files, render);
    }, page);

    el.addEventListener('click', async ev => {
      if (att.onClick(ev, () => null, () => render())) return;
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'back') { location.hash = `#/planner/${date}`; return; }
      if (act === 'prev') return go(addDays(date, -1));
      if (act === 'next') return go(addDays(date, 1));
      if (act === 'today') return go(isoDate());
      if (act === 'share') return openExport();
      const cardEl = b.closest('.adv-row');
      if (!cardEl) return;
      const id = cardEl.dataset.id;
      const it = items.find(i => i.id === id);
      if (act === 'attach') return attachTo(cardEl);
      if (act === 'note') return openNote(cardEl);
      if (act === 'all') return pop?._row === cardEl ? (closePop(), render()) : openPop(cardEl);
      if (act === 'menu') {
        const linked = it?.task_id && tasks.has(it.task_id);
        const options = [
          { value: 'letgo', label: 'Let go', title: "Didn't do it and it doesn't need doing (to the Archive)" },
          { value: 'to-tasks', label: '→ Tasks', title: linked ? 'Off this day; it stays in Tasks' : 'Off this day, into Tasks' },
          linked && { value: 'unique', label: 'Keep only here', title: 'Take the original out of Tasks or its project; only this copy stays' },
          { value: 'archive', label: 'Archive' },
          { value: 'delete', label: 'Delete' },
        ].filter(Boolean);
        pillMenu(b, options, v => ({ letgo: letGo, 'to-tasks': toTasks, unique: uniqueMany, archive, delete: deleteMany })[v]?.([id]), { className: 'list-menu' });
      }
    }, page);

    // New task: at the top of To do.
    $('#adv-new').addEventListener('keydown', async ev => {
      if (ev.key === 'Escape') { ev.target.blur(); return; }
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const title = ev.target.value.trim();
      if (!title) return;
      ev.target.value = '';
      const made = await addItem(date, { title, rank: firstKey(items.filter(i => !i.time)) });
      await render();
      $('#adv-new').focus();
      undoable(`Added "${title}"`, async () => { await store.remove('day_items', made.id); await render(); });
    });

    // ---------- share: the day's cases as text ----------
    let choices = { ...EXPORT_DEFAULTS };
    store.getDeviceSettings().then(d => { choices = Object.assign({}, EXPORT_DEFAULTS, d.advanced_export || {}); });
    const unlink = s => (s || '').replace(/\[([^\]]*)\]\(sift:[^)]*\)/g, '$1');
    const plainNote = s => unlink(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/(^|\s)_(\S.*?)_(?=$|[\s).,!?:;])/g, '$1$2').replace(/^(?:#{1,6}|-#|\+#|#\+)\s+/gm, '');
    // A file added: when, and its name unless it's a photo.
    const fileLine = a => (a.kind === 'image' ? '📷 Photo added' : `📎 File added: ${a.name}`);
    // One case: its updates in time order (comments, and the files added to it).
    async function caseOf(i) {
      const owner = ownerOf(i.id);
      const comments = choices.comments ? await commentsFor(owner) : [];
      const files = await att.byParent();
      const log = [];
      for (const c of comments) {
        if ((c.body || '').trim()) log.push({ at: c.at, text: plainNote(c.body).trim(), html: toHtml(unlink(c.body)) });
        if (choices.files) for (const a of files.get(c.id) || []) log.push({ at: a.created_at, text: fileLine(a), html: esc(fileLine(a)) });
      }
      if (choices.files) for (const a of (files.get(i.id) || []).concat(owner.task_id ? files.get(owner.task_id) || [] : [])) log.push({ at: a.created_at, text: fileLine(a), html: esc(fileLine(a)) });
      log.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
      return { i, note: choices.notes ? plainNote(i.notes).trim() : '', noteHtml: choices.notes && (i.notes || '').trim() ? toHtml(unlink(i.notes)) : '', log };
    }
    async function exportParts() {
      const all = items.filter(i => !i.time && !i.dropped_at);
      const todo = choices.todo ? all.filter(i => !i.done_at).sort(byPlace) : [];
      const done = choices.done ? all.filter(i => i.done_at).sort(byPlace) : [];
      const timed = choices.schedule ? items.filter(i => i.time).sort((a, b) => a.time.localeCompare(b.time)) : [];
      return { todo: await Promise.all(todo.map(caseOf)), done: await Promise.all(done.map(caseOf)), timed };
    }
    function asText({ todo, done, timed }, wa = false) {
      const bold = s => (wa ? `*${s}*` : s);
      const out = [bold(dayTitle())];
      const cases = (title, list) => {
        if (!list.length) return;
        out.push('', bold(title));
        for (const c of list) {
          out.push(`${c.i.done_at ? (wa ? '✅' : '[x]') : (wa ? '⬜' : '[ ]')} ${c.i.title}${c.i.done_at ? ` (done ${at(c.i.done_at)})` : ''}`);
          if (c.note) out.push(...c.note.split('\n').filter(l => l.trim()).map(l => `    ${l.trim()}`));
          for (const e of c.log) out.push(`    ${at(e.at)}  ${e.text.split('\n').join('\n           ')}`);
        }
      };
      cases('To do', todo);
      cases('Done', done);
      if (timed.length) out.push('', bold('Schedule'), ...timed.map(i => `${i.done_at ? (wa ? '✅' : '[x]') : (wa ? '⬜' : '[ ]')} ${showTime(i.time)}${i.end_time ? `–${showTime(i.end_time)}` : ''} ${i.title}`));
      return out.join('\n');
    }
    function asHtml({ todo, done, timed }) {
      const cases = (title, list) => (list.length ? `<h4>${esc(title)}</h4>${list.map(c => `
        <p style="margin:.8em 0 .2em"><b>${c.i.done_at ? '☑' : '☐'} ${c.i.done_at ? `<s>${esc(c.i.title)}</s>` : esc(c.i.title)}</b>${c.i.done_at ? ` <span style="color:#666">(done ${esc(at(c.i.done_at))})</span>` : ''}</p>
        ${c.noteHtml ? `<div style="color:#444;margin-left:1.5em">${c.noteHtml}</div>` : ''}
        ${c.log.length ? `<table style="margin-left:1.5em;border-collapse:collapse">${c.log.map(e => `<tr><td style="color:#666;padding:2px 12px 2px 0;vertical-align:top;white-space:nowrap">${esc(at(e.at))}</td><td style="padding:2px 0">${e.html}</td></tr>`).join('')}</table>` : ''}`).join('')}` : '');
      return `<h3>${esc(dayTitle())}</h3>${cases('To do', todo)}${cases('Done', done)}`
        + (timed.length ? `<h4>Schedule</h4><ul style="list-style:none;padding-left:0">${timed.map(i => `<li>${i.done_at ? '☑' : '☐'} <b>${esc(showTime(i.time))}${i.end_time ? `–${esc(showTime(i.end_time))}` : ''}</b> ${esc(i.title)}</li>`).join('')}</ul>` : '');
    }
    const CHOICES = [['todo', 'To do'], ['done', 'Done'], ['notes', 'Notes'], ['comments', 'Comments, with their times'], ['files', 'Photos and files added (when, and file names; not the files)'], ['schedule', "The day's schedule (timed items)"]];
    function openExport() {
      const dlg = $('.adv-export');
      dlg.innerHTML = `<div class="sheet-handle"></div>
        <h2>Share ${esc(dayTitle())}</h2>
        <p class="muted">What goes in:</p>
        <div class="adv-choices">${CHOICES.map(([k, words]) => `<label><input type="checkbox" data-choice="${k}"${choices[k] ? ' checked' : ''}> ${esc(words)}</label>`).join('')}</div>
        <div class="sheet-actions adv-export-actions">
          <button type="button" data-export="close">Cancel</button>
          <span class="spacer"></span>
          <button type="button" data-export="plain">Copy as plain text</button>
          <button type="button" data-export="whatsapp">Copy for WhatsApp</button>
          ${navigator.share ? '<button type="button" data-export="share">Share…</button>' : ''}
          <button type="button" class="primary" data-export="rich">Copy as rich text</button>
        </div>`;
      dlg.showModal();
    }
    $('.adv-export').addEventListener('change', async ev => {
      const k = ev.target.dataset.choice;
      if (!k) return;
      choices[k] = ev.target.checked;
      await store.updateDeviceSettings({ advanced_export: choices });
    });
    $('.adv-export').addEventListener('click', async ev => {
      const dlg = $('.adv-export');
      if (ev.target === dlg) return dlg.close();
      const how = ev.target.closest('[data-export]')?.dataset.export;
      if (!how) return;
      if (how === 'close') return dlg.close();
      const parts = await exportParts();
      try {
        if (how === 'share') await navigator.share({ title: dayTitle(), text: asText(parts) });
        else if (how === 'rich' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([asHtml(parts)], { type: 'text/html' }), 'text/plain': new Blob([asText(parts)], { type: 'text/plain' }) })]);
        else await navigator.clipboard.writeText(asText(parts, how === 'whatsapp'));
        if (how !== 'share') toast({ plain: 'Copied as plain text', rich: 'Copied as rich text', whatsapp: 'Copied for WhatsApp' }[how]);
        dlg.close();
      } catch (err) {
        if (err?.name !== 'AbortError') toast("Couldn't copy: the browser blocked the clipboard");
      }
    });

    this.refresh = refresh;
    this.show = async d => { date = /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : isoDate(); kit.clear(); await render(); };
    await render();
  },

  route([d]) { return this.show?.(d); },

  unmount() {
    this.gone?.abort();
    this.kit?.destroy();
    document.body.classList.remove('has-select-bar');
  },
};
