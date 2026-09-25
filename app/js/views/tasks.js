// Tasks: a simple checklist that grows into a project planner.
// #/tasks/<view>/<project id>   views: list, now, next, later, projects, done
// Every extra (day, aim, energy, project, milestone, notes) lives behind a
// task's ⋯ so the list stays simple until you want more.

import { keepDraft, draftCleared } from '../drafts.js';
import { cogHtml } from '../viewcog.js';
import * as store from '../store.js';
import { loadAll, nest, progress, addTask, doneFields, aimDate, isDone, STATUSES, PRIORITIES, HORIZONS, horizonOf } from '../tasks.js';
import { ENERGY, isoDate, addDays, parseDate, addItem, durationChoices, durationLabel } from '../days.js';
import { pillMenu, energyMenu } from '../pillmenu.js';
import { summarise } from '../summary.js';
import { createListKit } from '../listkit.js';
import { toast, undoable } from '../toast.js';
import { richText, toHtml, previewLine, inlineAll } from '../richtext.js';
import { loadContacts } from '../contacts.js';
import * as att from '../attachments.js';
import { editPills, selectPill, datePill, energyPill } from '../editpills.js';
import { ask, askText } from '../ask.js';
import { word } from '../words.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const VIEWS = [...HORIZONS, { id: 'done', label: 'Done' }];
const LISTS = ['inbox', 'now', 'next', 'later'];   // where a task lives
const EMPTY = { get inbox() { return `${word('list_inbox')} is empty.`; }, now: 'Nothing for now.', next: 'Nothing lined up next.', later: 'Nothing for later.' };
const COLOURS = ['#6fb0ff', '#7dd3a8', '#f5a66a', '#e58fd0', '#f0d264', '#a99cff', '#ff8a8a'];

function shortDate(iso) {
  if (!iso) return '';
  const today = isoDate();
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const d = parseDate(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default {
  async mount(el) {
    // Page-wide listeners are tied to this signal and removed in unmount().
    this.gone?.abort();
    const gone = this.gone = new AbortController();
    // Whether a press on the new-task entry is under way (one page-wide listener,
    // not one per redraw of the list).
    let pressing = false;
    addEventListener('pointerup', () => setTimeout(() => { pressing = false; }, 400), { passive: true, signal: gone.signal });
    const state = this.state = { view: 'now', project: null, showDone: false };
    let aimTimeFor = null; // a task whose panel is showing the aim time field
    let data = { tasks: [], projects: [], milestones: [] };
    let people = { contacts: [], cases: [] };
    let atts = new Map(); // task id → its attachments
    let open = null; // task id with details open
    // Notes typed in the panel save shortly after typing stops, or at once
    // when the panel closes.
    let pendingNote = null;
    let noteTimer;
    async function flushNote() {
      clearTimeout(noteTimer);
      const p = pendingNote;
      pendingNote = null;
      if (p) await store.update('tasks', p.id, { notes: p.md });
    }
    const collapsed = new Set();
    let notesEditor = null;

    el.innerHTML = `
      <div class="tasks-head">
        <div class="segmented" id="task-views" role="tablist" aria-label="Views">
          ${VIEWS.map(v => `<button type="button" data-view="${v.id}">${v.label}</button>`).join('')}
        </div>
        ${cogHtml('tasks')}
        <details class="tool-menu">
          <summary class="icon-btn" aria-label="More actions">${icon('i-more')}</summary>
          <div class="menu">
            <button type="button" data-view="list">All tasks</button>
            <button type="button" data-view="projects">Projects</button>
            <hr>
            <button type="button" data-act="new-project">New project</button>
            <button type="button" data-act="toggle-done">Show / hide done</button>
            <hr>
            <a href="#/bin/archive/tasks">Archive</a>
            <a href="#/bin/bin/tasks">Bin</a>
          </div>
        </details>
      </div>
      <div id="task-body"></div>`;

    const body = el.querySelector('#task-body');
    const go = (view, project = state.project) => {
      const url = `#/tasks/${view}${project ? `/${project}` : ''}`;
      if (location.hash !== url) location.hash = url; else render();
    };

    // ---------- pieces ----------

    const projectOf = t => data.projects.find(p => p.id === t.project_id);
    const kidsOf = t => data.tasks.filter(k => k.parent_task_id === t.id);

    function chips(t) {
      const out = [];
      const p = projectOf(t);
      if (p && !state.project) out.push(`<span class="chip" style="--c:${p.colour || COLOURS[0]}">${esc(p.name)}</span>`);
      if (t.start_date) out.push(`<span class="chip" title="Planned for">📅 ${shortDate(t.start_date)}</span>`);
      const aim = aimDate(t);
      if (aim) out.push(`<span class="chip${!isDone(t) && aim < isoDate() ? ' late' : ''}" title="Completion aim">⚑ ${shortDate(aim)}${t.aim_at.length > 10 ? ` ${t.aim_at.slice(11, 16)}` : ''}</span>`);
      if (t.estimate_min) out.push(`<span class="chip" title="Estimated time">⏱ ${durationLabel(t.estimate_min)}</span>`);
      if (t.priority && t.priority < 3) out.push(`<span class="chip pri-${t.priority}">${PRIORITIES.find(p => p.id === t.priority)?.label}</span>`);
      if (t.status === 'doing' || t.status === 'waiting') out.push(`<span class="chip">${STATUSES.find(s => s.id === t.status)?.label}</span>`);
      const kids = kidsOf(t);
      if (kids.length) {
        const pr = progress(kids);
        out.push(`<button type="button" class="chip kids" data-act="collapse" aria-expanded="${!collapsed.has(t.id)}">${collapsed.has(t.id) ? '▸' : '▾'} ${pr.done}/${pr.total}</button>`);
      }
      const files = atts.get(t.id)?.length;
      if (files) out.push(`<span class="chip" title="Attachments">📎 ${files}</span>`);
      for (const cid of t.contact_ids || []) {
        const c = people.contacts.find(x => x.id === cid);
        if (c) out.push(`<a class="chip" href="#/contacts/c/${c.id}" title="Contact">👤 ${esc(c.name || '?')}</a>`);
      }
      const kase = t.case_id && people.cases.find(k => k.id === t.case_id);
      if (kase) out.push(`<a class="chip" href="#/contacts/cases/${kase.id}" title="Case">📁 ${esc(kase.title)}</a>`);
      return out.join('');
    }

    function row(t, { draggable = true, group = '' } = {}) {
      return `
        <li data-task="${t.id}" data-id="${t.id}" data-depth="${t.depth ?? 0}" class="${isDone(t) ? 'done' : ''} ${group}">
          <button type="button" class="drag-handle" aria-label="Select${draggable ? ' or move' : ''} ${esc(t.title)}">${icon('i-grip')}</button>
          <input type="checkbox" class="tick" ${isDone(t) ? 'checked' : ''} aria-label="Done">
          <input class="task-title" value="${esc(t.title)}" aria-label="Task" autocomplete="off">
          <button type="button" class="more" data-act="details" aria-label="Details" aria-expanded="${open === t.id}">⋯</button>
          ${subLine(t)}
        </li>
        ${open === t.id ? `<li class="task-details" data-for="${t.id}">${details(t)}</li>` : ''}`;
    }

    // Under the title: status pills, then the note (the app-wide convention).
    // Clicking a pill changes it in place.
    function subLine(t) {
      const e = ENERGY.find(x => x.id === t.energy);
      const h = horizonOf(t);
      const pills = (e ? `<button type="button" class="pill-act bolts" data-act="energy-pill" title="Energy: ${e.label}. Click to change" aria-label="Energy ${e.label}, change">${e.bolts}</button>` : '')
        + (h !== 'now' && state.view !== h && !isDone(t) ? `<button type="button" class="pill-act" data-act="horizon-pill" title="For ${h}. Click to change">${h}</button>` : '');
      const note = t.notes && open !== t.id ? noteHtml(t) : ''; // the open panel already shows the whole note
      const c = chips(t);
      return pills || c || note ? `<div class="item-sub">${pills}${c ? `<span class="chips">${c}</span>` : ''}${note}</div>` : '';
    }

    // Notes under tasks: the first line; clicking it opens (or closes) the
    // task's panel, where the whole note can be read and edited.
    function noteHtml(t) {
      const { html } = previewLine(t.notes);
      if (!html) return '';
      // All three spacings are drawn; the page's spacing shows one (CSS):
      // tight = just 📝 beside the pills, medium = every line run together (two
      // lines at most), loose = the note as written, about 8 lines at most
      // ("… more" if longer). Medium and loose start on their own line under the pills.
      const long = t.notes.split('\n').length > 8 || t.notes.length > 480;
      return `<span class="item-note task-note${long ? ' is-long' : ''}" data-act="toggle-note" role="button" tabindex="0" aria-expanded="${open === t.id}" title="${open === t.id ? 'Close' : 'Open to read or edit'}">`
        + `<span class="note-icon" title="${esc(t.notes.split('\n').map(l => l.trim()).find(Boolean)?.slice(0, 120) || 'Note')}">📝</span>`
        + `<span class="note-medium">${inlineAll(t.notes)}</span>`
        + `<span class="note-loose">${toHtml(t.notes)}</span>${long ? '<span class="note-more">… more</span>' : ''}</span>`;
    }

    // The panel: the note first, then the plan (list, time needed, dates,
    // energy), then a folded "More" for project, people, case, priority.
    function details(t) {
      const ms = data.milestones.filter(m => m.project_id === t.project_id);
      const aim = aimDate(t) || '';
      const aimTime = t.aim_at && t.aim_at.length > 10 ? t.aim_at.slice(11, 16) : '';
      const showTime = !!aimTime || aimTimeFor === t.id;
      const moreSet = t.project_id || (t.contact_ids || []).length || t.case_id || (t.priority && Number(t.priority) !== 3) || (t.status && t.status !== 'todo');
      return `
        <div class="task-notes"></div>
        ${att.rowHtml(atts.get(t.id))}
        <div class="energy-pick" role="group" aria-label="Energy"><span>Energy</span>
          ${ENERGY.map(e => `<button type="button" class="bolts" data-energy="${e.id}" aria-pressed="${t.energy === e.id}" title="${esc(`${e.label}: ${e.hint}`)}" aria-label="${e.label}">${e.bolts}</button>`).join('')}
        </div>
        <div class="detail-grid">
          <label>List<select name="horizon">${HORIZONS.map(x => `<option value="${x.id}" ${horizonOf(t) === x.id ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
          <label>Estimated time<select name="estimate_min"><option value="">Not estimated</option>${durationChoices(480).map(m => `<option value="${m}" ${Number(t.estimate_min) === m ? 'selected' : ''}>${durationLabel(m)}</option>`).join('')}</select></label>
          <label>Plan for day<input type="date" name="start_date" value="${t.start_date || ''}"></label>
          <label>Aim to finish by<input type="date" name="aim_date" value="${aim}"></label>
          ${aim && showTime ? `<label>…at<input type="time" name="aim_time" value="${aimTime}"></label>` : ''}
          ${aim && !showTime ? `<button type="button" class="linklike" data-act="aim-time">+ add a time</button>` : ''}
        </div>
        <details class="detail-more"${moreSet ? ' open' : ''}>
          <summary>More: project, people, case, priority</summary>
          <div class="detail-grid">
            <label>Priority<select name="priority">${PRIORITIES.map(p => `<option value="${p.id}" ${Number(t.priority) === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select></label>
            <label>Status<select name="status">${STATUSES.map(s => `<option value="${s.id}" ${t.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
            <label>Project<select name="project_id"><option value="">None</option>${data.projects.map(p => `<option value="${p.id}" ${t.project_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="__new">+ New project…</option></select></label>
            ${t.project_id ? `<label>Milestone<select name="milestone_id"><option value="">None</option>${ms.map(m => `<option value="${m.id}" ${t.milestone_id === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}<option value="__new">+ New milestone…</option></select></label>` : ''}
            <label>People<select name="add_contact"><option value="">+ Add a contact…</option>${people.contacts.filter(c => !(t.contact_ids || []).includes(c.id)).map(c => `<option value="${c.id}">${esc(c.name || '(no name)')}</option>`).join('')}</select></label>
            <label>Case<select name="case_id"><option value="">None</option>${people.cases.map(k => `<option value="${k.id}" ${t.case_id === k.id ? 'selected' : ''}>${esc(k.title)}</option>`).join('')}</select></label>
            ${(t.contact_ids || []).length ? `<div class="energy-pick"><span>With</span>${t.contact_ids.map(cid => people.contacts.find(c => c.id === cid)).filter(Boolean).map(c => `<span class="chip">${esc(c.name)} <button type="button" class="chip-x" data-act="remove-contact" data-id="${c.id}" aria-label="Remove">×</button></span>`).join('')}</div>` : ''}
          </div>
        </details>
        <div class="detail-actions">
          <button type="button" class="close-details" data-act="close-details" title="Close (or click anywhere outside, or Esc)">Close</button>
          <button type="button" data-act="plan-today">Put on today's plan</button>
          <button type="button" data-act="add-sub">+ Sub-task</button>
          <span class="spacer"></span>
          <button type="button" data-act="archive">Archive</button>
          <button type="button" class="danger" data-act="delete">Delete</button>
        </div>`;
    }

    // New tasks: a line at the end of the list (or, on an empty page, a big ＋).
    // Focus it and it opens out like Reminders: a note space and the things you can
    // set while adding. Enter adds it and leaves the line ready for the next one.
    const dateChip = (name, label, glyph) => `<label class="entry-chip" data-chip="${name}">${glyph} <span class="chip-text" data-empty="${label}">${label}</span><input type="date" data-entry="${name}" aria-label="${label}"></label>`;
    function addBox(placeholder, empty = false, listName = null) {
      const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${t}</option>`;
      return `
        <div class="task-entry${empty ? ' is-empty' : ''}" id="task-entry">
          ${empty ? `<button type="button" class="entry-plus" data-act="focus-entry" aria-label="New task"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>` : ''}
          <div class="task-add-line">
            <span class="add-mark" aria-hidden="true"></span>
            <input id="task-new" class="new-task-line no-inline" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="done" aria-label="New task">
          </div>
          <div class="task-entry-more">
            <textarea id="task-new-note" class="entry-note add-note no-inline" rows="1" placeholder="Add note" aria-label="Note"></textarea>
            <div class="entry-actions">
              <button type="button" class="entry-chip" data-chip="energy" aria-haspopup="menu"><span class="chip-glyph">⚡</span> <span class="chip-text" data-empty="Energy">Energy</span></button>
              <input type="hidden" data-entry="energy" value="">
              ${dateChip('start_date', 'Plan for day', '📅')}
              ${dateChip('aim_date', 'Aim to finish', '⚑')}
              <label class="entry-chip" data-chip="estimate_min">⏱ <span class="chip-text" data-empty="Estimated time">Estimated time</span>
                <select data-entry="estimate_min" aria-label="Estimated time"><option value="">Not estimated</option>${durationChoices(480).map(m => opt(m, durationLabel(m))).join('')}</select></label>
              <label class="entry-chip" data-chip="horizon">📥 <span class="chip-text" data-empty="${esc(listName || word('list_inbox'))}">${esc(listName || word('list_inbox'))}</span>
                <select data-entry="horizon" aria-label="Which list">${HORIZONS.map(x => opt(x.id, x.label, x.label === (listName || word('list_inbox')))).join('')}</select></label>
            </div>
            <p class="muted hint">${esc(word('ph_tasks_entry'))}</p>
          </div>
        </div>`;
    }

    // Views render one <ul> with heading rows between groups, so selection
    // (and, in List, dragging) works across the whole view.
    const head = (html, attrs = '') => `<li class="list-head"${attrs}>${html}</li>`;
    // A task and its sub-tasks share one card: the parent opens it, sub-tasks
    // sit inside, the last one closes it.
    const rowsOf = (tasks, opts) => tasks.map((t, n) => {
      const d = t.depth ?? 0;
      const next = tasks[n + 1];
      const nd = next ? next.depth ?? 0 : 0;
      const group = d === 0 ? (nd > 0 ? 'group-top' : '') : `group-kid${nd === 0 ? ' group-end' : ''}`;
      return row(t, { ...opts, group });
    }).join('');
    const listOf = (inner, empty = '') => (inner ? `<ul class="task-list">${inner}</ul>` : empty);

    // Tasks in list order, hiding done ones (unless shown) and collapsed sub-trees.
    function visible(tasks) {
      const nested = nest(tasks);
      const out = [];
      let hideBelow = null;
      for (const t of nested) {
        if (hideBelow != null && t.depth > hideBelow) continue;
        hideBelow = null;
        if (!state.showDone && isDone(t) && !(t.done_at > new Date(Date.now() - 60000).toISOString())) continue;
        out.push(t);
        if (collapsed.has(t.id)) hideBelow = t.depth;
      }
      return out;
    }

    // ---------- views ----------

    function viewList() {
      const project = data.projects.find(p => p.id === state.project);
      const scoped = data.tasks.filter(t => !project || t.project_id === project.id);
      let html = '';
      if (project) {
        const pr = progress(scoped);
        html += `
          <div class="project-head" style="--c:${project.colour || COLOURS[0]}">
            <button type="button" class="back" data-act="all-tasks">‹ All tasks</button>
            <input class="project-name" value="${esc(project.name)}" aria-label="Project name" data-project="${project.id}">
            <div class="bar"><span style="width:${pr.pct}%"></span></div>
            <span class="muted">${pr.done} of ${pr.total} done</span>
            <button type="button" data-act="new-milestone">+ Milestone</button>
          </div>`;
      }
      const ph = project ? `New task in ${project.name}` : 'New task';
      let entry = addBox(ph, false, word('list_inbox'));
      if (project) {
        const ms = data.milestones.filter(m => m.project_id === project.id);
        const groups = [{ id: null, name: ms.length ? 'No milestone' : '' }, ...ms];
        // Top-level tasks group by milestone; sub-tasks follow their parent.
        const top = scoped.filter(t => !t.parent_task_id || !scoped.some(p => p.id === t.parent_task_id));
        const under = id => {
          const out = [];
          const walk = pid => scoped.filter(k => k.parent_task_id === pid).forEach(k => { out.push(k); walk(k.id); });
          walk(id);
          return out;
        };
        html += listOf(groups.map(g => {
          const roots = top.filter(t => (t.milestone_id || null) === g.id);
          const tasks = visible(roots.flatMap(t => [t, ...under(t.id)]));
          const pr = progress(scoped.filter(t => t.milestone_id === g.id));
          const label = g.name ? `${esc(g.name)}${g.due_date ? ` <span class="muted">⚑ ${shortDate(g.due_date)}</span>` : ''}${g.id ? ` <span class="muted">${pr.done}/${pr.total}</span>` : ''}` : '';
          return (label ? head(label, ` data-milestone="${g.id || ''}"`) : '') + rowsOf(tasks);
        }).join(''));
      } else {
        const tasks = visible(scoped);
        html += listOf(rowsOf(tasks));
        entry = addBox(ph, !tasks.length, word('list_inbox'));
      }
      html += entry;
      const doneCount = scoped.filter(isDone).length;
      if (doneCount) html += `<p class="muted done-toggle"><button type="button" data-act="toggle-done">${state.showDone ? 'Hide' : 'Show'} ${doneCount} done</button></p>`;
      return html;
    }

    // Inbox / Now / Next / Later: the open tasks on that list (a task with no list
    // is in Now), with anything overdue or planned for today first in Now.
    function viewHorizon(h) {
      const today = isoDate();
      const open = data.tasks.filter(t => !isDone(t) && horizonOf(t) === h && (!state.project || t.project_id === state.project));
      const flat = list => rowsOf(list.map(t => ({ ...t, depth: 0 })));
      const urgent = h === 'now' ? open.filter(t => (aimDate(t) && aimDate(t) <= today) || (t.start_date && t.start_date <= today)) : [];
      const rest = open.filter(t => !urgent.includes(t));
      const body = (urgent.length ? head('Due or planned') + flat(urgent) + (rest.length ? head('Everything else') : '') : '') + flat(rest);
      const label = HORIZONS.find(x => x.id === h).label;
      return listOf(open.length ? body : '') + addBox(h === 'inbox' ? 'New task' : `New task for ${word(`list_${h}`)}`, !open.length, label);
    }

    function viewProjects() {
      const cards = data.projects.map(p => {
        const tasks = data.tasks.filter(t => t.project_id === p.id);
        const pr = progress(tasks);
        const next = tasks.filter(t => !isDone(t) && !t.parent_task_id).slice(0, 3);
        return `
          <button type="button" class="project-card" data-open-project="${p.id}" style="--c:${p.colour || COLOURS[0]}">
            <span class="project-title">${esc(p.name)}</span>
            <span class="bar"><span style="width:${pr.pct}%"></span></span>
            <span class="muted">${pr.done} of ${pr.total} done${p.due_date ? ` · ⚑ ${shortDate(p.due_date)}` : ''}</span>
            ${next.length ? `<span class="project-next">${next.map(t => `<span>${esc(t.title)}</span>`).join('')}</span>` : ''}
          </button>`;
      }).join('');
      return `<div class="project-grid">${cards}<button type="button" class="project-card add-card" data-act="new-project">+ New project</button></div>
        <p class="muted hint">${esc(word('ph_tasks_projects'))}</p>`;
    }

    function viewDone() {
      const done = data.tasks.filter(isDone).sort((a, b) => b.done_at.localeCompare(a.done_at));
      if (!done.length) return '<div class="empty"><h2>Nothing ticked off yet.</h2></div>';
      const byDay = new Map();
      for (const t of done) {
        const d = isoDate(new Date(t.done_at));
        if (!byDay.has(d)) byDay.set(d, []);
        byDay.get(d).push({ ...t, depth: 0 });
      }
      return listOf([...byDay].map(([d, list]) => head(`${shortDate(d)} <span class="muted">${list.length}</span>`) + rowsOf(list, { draggable: false })).join(''));
    }

    // ---------- render ----------

    // After a sync the app calls refresh(): redraw from fresh data, keeping what's open.
    const render = this.render = this.refresh = async () => {
      data = await loadAll();
      people = await loadContacts();
      atts = await att.byParent();
      for (const b of el.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', b.dataset.view === state.view);
      body.innerHTML = { list: viewList, inbox: () => viewHorizon('inbox'), now: () => viewHorizon('now'), next: () => viewHorizon('next'), later: () => viewHorizon('later'), projects: viewProjects, done: viewDone }[state.view]();
      wireEntry();
      const ul = body.querySelector('.task-list');
      const ordered = state.view === 'list';
      const flatOrder = LISTS.includes(state.view); // Task Dump, Now, Next, Later: drag to reorder, no nesting
      kitOrdered.attach(ordered ? ul : null);
      kitFlat.attach(flatOrder ? ul : null);
      kitPlain.attach(ordered || flatOrder ? null : ul);
      const notesBox = body.querySelector('.task-notes');
      if (notesBox && open) {
        const id = open;
        const t = data.tasks.find(x => x.id === id);
        notesEditor = richText(notesBox, {
          value: t?.notes || '',
          placeholder: word('ph_notes'),
          origin: () => ({ collection: 'tasks', id, title: t?.title, field: 'notes' }),
          onChange: md => {
            clearTimeout(noteTimer);
            pendingNote = { id, md };
            noteTimer = setTimeout(flushNote, 600);
          },
        });
      }
    };

    // ---------- adding ----------

    let lastTop = null; // the last top-level task added here ("- " lines go under it)
    async function addLines(lines, { parent: startParent = null, extras = {} } = {}) {
      const made = [];
      let parent = startParent;
      const base = { project_id: state.project || null, horizon: LISTS.includes(state.view) ? state.view : 'inbox', ...extras.fields };
      let shortened = 0;
      for (const line of lines) {
        // A long line gets a short title; the note keeps it all.
        const { title, notes } = summarise(line.text);
        if (notes) shortened++;
        const note = [notes, extras.note].filter(Boolean).join('\n');
        const t = await addTask({ ...base, title, notes: note, parent_task_id: line.sub && parent ? parent : null });
        made.push(t.id);
        if (!line.sub) { parent = t.id; lastTop = t.id; }
      }
      await render();
      body.querySelector('#task-new')?.focus();
      undoable(`Added ${made.length} task${made.length === 1 ? '' : 's'} to ${HORIZONS.find(x => x.id === base.horizon)?.label || word('list_inbox')}${shortened ? ` (${shortened} long one${shortened === 1 ? '' : 's'} shortened, full text in the note)` : ''}`, async () => {
        await store.updateMany('tasks', made.map(id => [id, { deleted_at: new Date().toISOString() }]));
        await render();
      });
    }

    // Open the new-task entry (on an empty page it unfolds from the ＋) and put the cursor in it.
    function focusEntry() {
      body.querySelector('#task-entry')?.classList.add('open');
      body.querySelector('#task-new')?.focus();
    }

    // The new-task entry: title, note and the extras chips.
    function wireEntry() {
      const entry = body.querySelector('#task-entry');
      const ta = body.querySelector('#task-new');
      if (!entry || !ta) return;
      const noteEl = entry.querySelector('#task-new-note');
      keepDraft(ta, `tasks:${state.view}:${state.project || ''}`);
      const chipOf = name => entry.querySelector(`[data-chip="${name}"]`);
      const field = name => entry.querySelector(`[data-entry="${name}"]`);
      // Show the choice on its chip.
      const paint = name => {
        const c = chipOf(name);
        const f = field(name);
        const text = c.querySelector('.chip-text');
        let shown = '';
        if (name === 'energy') { const e = ENERGY.find(x => x.id === f.value); shown = e ? e.label : ''; c.querySelector('.chip-glyph').textContent = e ? e.bolts : '⚡'; }
        else if (f.tagName === 'SELECT') shown = f.value ? f.selectedOptions[0].textContent : '';
        else shown = f.value ? shortDate(f.value) : '';
        if (name === 'horizon' && f.value === defaultList()) shown = '';
        text.textContent = shown || text.dataset.empty;
        c.classList.toggle('set', !!shown);
      };
      const defaultList = () => (LISTS.includes(state.view) ? state.view : 'inbox');
      field('horizon').value = defaultList();
      entry.addEventListener('change', ev => { const n = ev.target.dataset?.entry; if (n) paint(n); });
      chipOf('energy').addEventListener('click', ev => {
        energyMenu(ev.currentTarget, field('energy').value || null, v => { field('energy').value = v || ''; paint('energy'); ta.focus(); });
      });
      for (const d of entry.querySelectorAll('input[type="date"]')) d.addEventListener('click', () => { try { d.showPicker(); } catch { /* not supported: the tap opens it */ } });
      const reset = () => {
        noteEl.value = '';
        for (const f of entry.querySelectorAll('[data-entry]')) f.value = f.dataset.entry === 'horizon' ? defaultList() : '';
        for (const n of ['energy', 'start_date', 'aim_date', 'estimate_min', 'horizon']) paint(n);
        noteEl.style.height = '';
      };
      noteEl.addEventListener('input', () => { noteEl.style.height = 'auto'; noteEl.style.height = `${noteEl.scrollHeight}px`; });
      // The extras stay open while the entry is in use. They are shown by the
      // .open class, not by focus: on an iPhone a tap takes the focus away
      // before it lands, so focus-based showing hid them under your finger.
      entry.addEventListener('focusin', () => entry.classList.add('open'));
      entry.addEventListener('pointerdown', () => { pressing = true; });
      // Leaving it with nothing typed or set puts the extras away.
      const idle = () => !ta.value.trim() && !noteEl.value.trim() && ![...entry.querySelectorAll('[data-entry]')].some(f => f.value && !(f.dataset.entry === 'horizon' && f.value === defaultList()));
      entry.addEventListener('focusout', () => {
        setTimeout(() => {
          if (pressing || entry.contains(document.activeElement) || !idle()) return;
          reset();
          entry.classList.remove('open');
        }, 300);
      });
      const submit = () => {
        const raw = ta.value;
        const text = raw.replace(/^[\s\-*•]+/, '').trim();
        if (!text) return;
        const sub = /^(\s|[-*•])/.test(raw);
        const aim = field('aim_date').value;
        const fields = {
          energy: field('energy').value || null,
          start_date: field('start_date').value || null,
          aim_at: aim || null,
          estimate_min: field('estimate_min').value ? Number(field('estimate_min').value) : null,
        };
        if (field('horizon').value !== defaultList()) fields.horizon = field('horizon').value;
        const note = noteEl.value.trim();
        ta.value = '';
        draftCleared(ta);
        reset();
        addLines([{ text, sub }], { parent: sub ? lastTop : null, extras: { fields, note } });
      };
      entry.addEventListener('keydown', ev => {
        if (ev.target === ta && ev.key === 'Escape' && ta.value) { ev.preventDefault(); ev.stopPropagation(); ta.value = ''; draftCleared(ta); return; }
        // Esc on an empty line (or its empty note) closes the entry: the extras go away, unset.
        if ((ev.target === ta || (ev.target === noteEl && !noteEl.value.trim())) && ev.key === 'Escape' && !ta.value) {
          ev.preventDefault(); ev.stopPropagation();
          reset();
          entry.classList.remove('open');
          ev.target.blur();
          return;
        }
        if (ev.key !== 'Enter' || ev.isComposing || ev.shiftKey) return;
        if (ev.target !== ta && ev.target !== noteEl) return;
        ev.preventDefault();
        submit();
      });
      entry.submitEntry = submit;
    }

    // ---------- reorder, nest, select (shared list behaviour) ----------

    // Persist what the kit reports: order, parents from depth, and in a
    // project the milestone of the heading a top-level task sits under.
    async function persistOrder(rows, label, ul) {
      const before = rows.map(r => {
        const t = data.tasks.find(x => x.id === r.id);
        return [t.id, { sort_order: t.sort_order, parent_task_id: t.parent_task_id || null, milestone_id: t.milestone_id || null }];
      });
      const minOrder = Math.min(...before.map(b => b[1].sort_order ?? 0));
      const milestoneOf = new Map();
      let current = null;
      for (const li of ul.children) {
        if (li.matches('.list-head[data-milestone]')) current = li.dataset.milestone || null;
        else if (li.dataset.id) milestoneOf.set(li.dataset.id, current);
      }
      const stack = [];
      const changes = rows.map((r, n) => {
        const depth = Math.min(r.depth, stack.length);
        const parent = depth ? stack[depth - 1] : null;
        stack.length = depth;
        stack.push(r.id);
        const fields = { sort_order: minOrder + n, parent_task_id: parent };
        if (state.project && !parent && ul.querySelector('.list-head[data-milestone]')) fields.milestone_id = milestoneOf.get(r.id) ?? null;
        return [r.id, fields];
      });
      await store.updateMany('tasks', changes);
      await render();
      undoable(label, async () => { await store.updateMany('tasks', before); await render(); });
    }

    // Selected tasks plus everything under them.
    const withSubs = ids => {
      const out = new Set(ids);
      const walk = pid => data.tasks.filter(k => k.parent_task_id === pid).forEach(k => { out.add(k.id); walk(k.id); });
      ids.forEach(walk);
      return [...out];
    };
    async function batchSet(ids, fields, label, { subs = false } = {}) {
      const all = subs ? withSubs(ids) : ids;
      const before = all.map(id => { const t = data.tasks.find(x => x.id === id); return [id, Object.fromEntries(Object.keys(fields).map(k => [k, t?.[k] ?? null]))]; });
      await store.updateMany('tasks', all.map(id => [id, fields]));
      await render();
      undoable(`${label} ${all.length} task${all.length === 1 ? '' : 's'}`, async () => { await store.updateMany('tasks', before); await render(); });
    }
    const taskActions = [
      { id: 'done', label: 'Done', run: ids => batchSet(ids, doneFields(true), 'Done:') },
      { id: 'now', label: 'Now', run: ids => batchSet(ids, { horizon: 'now' }, 'Now:') },
      { id: 'next', label: 'Next', run: ids => batchSet(ids, { horizon: 'next' }, 'Next:') },
      { id: 'later', label: 'Later', run: ids => batchSet(ids, { horizon: 'later' }, 'Later:') },
      { id: 'archive', label: 'Archive', run: ids => batchSet(ids, { archived_at: new Date().toISOString() }, 'Archived', { subs: true }) },
      { id: 'delete', label: 'Delete', danger: true, run: ids => batchSet(ids, { deleted_at: new Date().toISOString() }, 'Deleted', { subs: true }) },
    ];
    const kitOrdered = this.kitOrdered = createListKit({ reorder: true, indent: true, maxDepth: 4, noun: 'task', actions: taskActions, onReorder: persistOrder });
    const kitPlain = this.kitPlain = createListKit({ reorder: false, noun: 'task', actions: taskActions });
    // In Task Dump / Now / Next / Later only the order changes: the moved tasks
    // swap their places among themselves, so tasks on other lists keep theirs.
    const kitFlat = this.kitFlat = createListKit({ reorder: true, noun: 'task', actions: taskActions, onReorder: async (rows, label) => {
      const before = rows.map(r => [r.id, { sort_order: data.tasks.find(x => x.id === r.id)?.sort_order ?? 0 }]);
      let orders = before.map(b => b[1].sort_order).sort((a, b) => a - b);
      if (new Set(orders).size < orders.length) orders = orders.map((_, n) => orders[0] + n);
      await store.updateMany('tasks', rows.map((r, n) => [r.id, { sort_order: orders[n] }]));
      await render();
      undoable(label, async () => { await store.updateMany('tasks', before); await render(); });
    } });

        // ---------- editing ----------

    async function change(id, fields, label = 'Saved') {
      const before = data.tasks.find(t => t.id === id);
      const old = Object.fromEntries(Object.keys(fields).map(k => [k, before?.[k] ?? null]));
      await store.update('tasks', id, fields);
      await render();
      undoable(label, async () => { await store.update('tasks', id, old); await render(); });
    }

    async function newProject() {
      const name = await askText('New project', { ok: 'Add' });
      if (!name?.trim()) return null;
      return store.create('projects', {
        name: name.trim(), description: '', status: 'active', colour: COLOURS[data.projects.length % COLOURS.length],
        sort_order: data.projects.length, due_date: null,
      });
    }

    body.addEventListener('change', async ev => {
      const t = ev.target;
      const li = t.closest('[data-task], [data-for]');
      const id = li?.dataset.task || li?.dataset.for;
      if (t.dataset.project) {
        const p = data.projects.find(x => x.id === t.dataset.project);
        if (!t.value.trim() || t.value.trim() === p?.name) return;
        const old = p.name;
        await store.update('projects', p.id, { name: t.value.trim() });
        undoable('Saved', async () => { await store.update('projects', p.id, { name: old }); render(); });
        return;
      }
      if (!id) return;
      const task = data.tasks.find(x => x.id === id);
      if (t.classList.contains('tick')) {
        await change(id, doneFields(t.checked), t.checked ? `Done: ${task.title}` : 'Not done');
      } else if (t.classList.contains('task-title')) {
        if (t.value.trim() && t.value.trim() !== task.title) await change(id, { title: t.value.trim() });
      } else if (t.name === 'aim_date' || t.name === 'aim_time') {
        const d = body.querySelector(`[data-for="${id}"] [name="aim_date"]`).value;
        const tm = body.querySelector(`[data-for="${id}"] [name="aim_time"]`).value;
        await change(id, { aim_at: d ? (tm ? `${d}T${tm}` : d) : null }, d ? `Aim: ${shortDate(d)}` : 'Aim cleared');
      } else if (t.name === 'add_contact') {
        if (t.value) await change(id, { contact_ids: [...(task.contact_ids || []), t.value] }, 'Added a person');
      } else if (t.name === 'project_id' && t.value === '__new') {
        const p = await newProject();
        if (p) await change(id, { project_id: p.id, milestone_id: null }, `Moved to ${p.name}`); else render();
      } else if (t.name === 'milestone_id' && t.value === '__new') {
        const name = await askText('New milestone', { placeholder: word('ph_milestone'), ok: 'Add' });
        if (!name?.trim()) { render(); return; }
        const m = await store.create('milestones', { project_id: task.project_id, name: name.trim(), due_date: null, done_at: null, sort_order: data.milestones.length });
        await change(id, { milestone_id: m.id });
      } else if (t.name) {
        let value = t.value || null;
        if (t.name === 'priority') value = Number(t.value);
        if (t.name === 'estimate_min') value = t.value ? Number(t.value) : null;
        const fields = { [t.name]: value };
        if (t.name === 'status') Object.assign(fields, value === 'done' ? doneFields(true) : { done_at: null });
        if (t.name === 'project_id') fields.milestone_id = null;
        await change(id, fields, t.name === 'start_date' && value ? `Planned for ${shortDate(value)}` : t.name === 'horizon' ? `In ${HORIZONS.find(x => x.id === value)?.label || value}` : 'Saved');
      }
    });

    const attParent = b => { const id = b.closest('[data-for]')?.dataset.for; return id ? { collection: 'tasks', id } : null; };
    const attDone = async () => { await flushNote(); await render(); };
    att.enableDrop(el, '.task-details[data-for], li[data-task]', node => ({ collection: 'tasks', id: node.dataset.for || node.dataset.task }), attDone);
    el.addEventListener('click', async ev => {
      if (att.onClick(ev, attParent, attDone)) return;
      const b = ev.target.closest('[data-act], [data-view], [data-energy], [data-horizon], [data-open-project]');
      if (!b) return;
      if (b.dataset.view) { b.closest('details')?.removeAttribute('open'); state.project = null; go(b.dataset.view, null); return; }
      if (b.dataset.act === 'focus-entry') { focusEntry(); return; }
      if (b.dataset.act === 'aim-time') { aimTimeFor = b.closest('[data-for]')?.dataset.for; render(); return; }
      if (b.dataset.openProject) { go('list', b.dataset.openProject); return; }
      const li = b.closest('[data-task], [data-for]');
      const id = li?.dataset.task || li?.dataset.for;
      const task = data.tasks.find(x => x.id === id);
      const act = b.dataset.act;
      b.closest('details')?.removeAttribute('open');
      if (act === 'remove-contact' && id) {
        await change(id, { contact_ids: (task.contact_ids || []).filter(x => x !== b.dataset.id) }, 'Removed a person');
        return;
      }
      if (b.dataset.horizon && id) {
        await change(id, { horizon: b.dataset.horizon }, `For ${b.dataset.horizon}`);
        return;
      }
      if (act === 'horizon-pill' && id) {
        pillMenu(b, HORIZONS.map(x => ({ value: x.id, label: x.label, current: horizonOf(task) === x.id })),
          v => change(id, { horizon: v }, `For ${v}`));
        return;
      }
      if (act === 'energy-pill' && id) {
        energyMenu(b, task.energy, v => change(id, { energy: v }, v ? 'Energy saved' : 'Energy cleared'));
        return;
      }
      if (b.dataset.energy && id) {
        await change(id, { energy: task.energy === b.dataset.energy ? null : b.dataset.energy }, 'Energy saved');
      } else if (act === 'close-details') {
        await closeDetails();
      } else if (act === 'details' || act === 'toggle-note') {
        await flushNote();
        open = open === id ? null : id;
        render();
      } else if (act === 'collapse') {
        collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
        render();
      } else if (act === 'add') {
        body.querySelector('#task-new')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
      } else if (act === 'toggle-done') {
        state.showDone = !state.showDone;
        render();
      } else if (act === 'all-tasks') {
        go('list', null);
      } else if (act === 'new-project') {
        const p = await newProject();
        if (p) go('list', p.id);
      } else if (act === 'new-milestone') {
        const r = await ask({ title: 'New milestone', ok: 'Add', fields: [{ name: 'name', label: 'Name', placeholder: word('ph_milestone') }, { name: 'due', label: 'Aim date (optional)', type: 'date' }] });
        const name = r?.name;
        if (!name?.trim()) return;
        const due = r.due || null;
        await store.create('milestones', { project_id: state.project, name: name.trim(), due_date: /^\d{4}-\d{2}-\d{2}$/.test(due || '') ? due : null, done_at: null, sort_order: data.milestones.length });
        render();
      } else if (act === 'add-sub' && task) {
        const sub = await addTask({ title: 'New sub-task', parent_task_id: task.id, project_id: task.project_id, milestone_id: task.milestone_id, sort_order: task.sort_order + 0.5 });
        open = null;
        collapsed.delete(task.id);
        await render();
        const input = body.querySelector(`li[data-task="${sub.id}"] .task-title`);
        input?.focus();
        input?.select();
        undoable('Added a sub-task', async () => { await store.remove('tasks', sub.id); await render(); });
      } else if (act === 'plan-today' && task) {
        const made = await addItem(isoDate(), { title: task.title, task_id: task.id, estimate_min: task.estimate_min ?? null, energy: task.energy ?? null, notes: task.notes || '', contact_ids: task.contact_ids || [], case_id: task.case_id || null });
        if (!task.start_date) await store.update('tasks', task.id, { start_date: isoDate() });
        await render();
        undoable(`On today's plan: ${task.title}`, async () => {
          await store.remove('day_items', made.id);
          if (!task.start_date) await store.update('tasks', task.id, { start_date: null });
          await render();
        });
      } else if ((act === 'delete' || act === 'archive') && task) {
        const field = act === 'delete' ? 'deleted_at' : 'archived_at';
        const ids = [task.id];
        const collect = pid => data.tasks.filter(k => k.parent_task_id === pid).forEach(k => { ids.push(k.id); collect(k.id); });
        collect(task.id);
        const now = new Date().toISOString();
        await store.updateMany('tasks', ids.map(x => [x, { [field]: now }]));
        open = null;
        await render();
        undoable(`${act === 'delete' ? 'Deleted' : 'Archived'} "${task.title}"${ids.length > 1 ? ` and ${ids.length - 1} sub-task${ids.length > 2 ? 's' : ''}` : ''}`, async () => {
          await store.updateMany('tasks', ids.map(x => [x, { [field]: null }]));
          await render();
        });
      }
    });

    // Tap on the empty part of the page (like Reminders): a new task line opens.
    body.addEventListener('click', ev => {
      if (ev.target === body || ev.target.matches('.task-entry, .task-list, .list-head')) focusEntry();
    });

    this.closeDetails = () => { open = null; };

    // Tap a task's title to edit it: pills for energy, time, dates and list
    // open under it, plus More for the whole panel (js/editpills.js).
    const hours = durationChoices(480).map(m => [m, durationLabel(m)]);
    this.pills = editPills(body, {
      title: '.task-title',
      row: 'li[data-task]',
      key: r => r.dataset.task,
      html: id => {
        const t = data.tasks.find(x => x.id === id);
        if (!t) return '';
        const aim = t.aim_at ? t.aim_at.slice(0, 10) : '';
        // No note yet: an "Add note" line under the title, like adding a new task.
        const addNote = (t.notes || '').trim() ? '' : `<textarea class="entry-note add-note pill-note no-inline" data-pill="notes" rows="1" placeholder="Add note" aria-label="Note"></textarea>`;
        return addNote + energyPill(t.energy)
          + selectPill('estimate_min', 'Estimated time', '⏱', [['', 'Not estimated'], ...hours], t.estimate_min)
          + datePill('start_date', 'Plan for day', '📅', t.start_date, shortDate)
          + datePill('aim_date', 'Aim to finish', '⚑', aim, shortDate)
          + selectPill('horizon', 'List', '📥', HORIZONS.map(h => [h.id, h.label]), horizonOf(t));
      },
      change: async (id, name, value) => {
        const t = data.tasks.find(x => x.id === id);
        if (!t) return;
        if (name === 'aim_date') {
          const time = t.aim_at?.length > 10 ? t.aim_at.slice(10) : '';
          return change(id, { aim_at: value ? `${value}${time}` : null }, value ? `Aim: ${shortDate(value)}` : 'Aim cleared');
        }
        if (name === 'notes') { if (value.trim()) await change(id, { notes: value.trim() }, 'Note saved'); return; }
        if (name === 'energy') {
          energyMenu(body.querySelector('.edit-pills [data-pill-act="energy"]'), t.energy, v => change(id, { energy: v }, v ? 'Energy saved' : 'Energy cleared'));
          return;
        }
        const v = name === 'estimate_min' ? (value ? Number(value) : null) : value || null;
        await change(id, { [name]: v }, name === 'start_date' && v ? `Planned for ${shortDate(v)}` : name === 'horizon' ? `In ${HORIZONS.find(x => x.id === v)?.label || v}` : 'Saved');
      },
    });

    // The panel closes when you click anywhere outside it (or its task), press
    // Esc, or use Close. Whatever you were typing in it is saved first.
    async function closeDetails() {
      if (!open) return;
      const panel = body.querySelector(`.task-details[data-for="${open}"]`);
      if (panel?.contains(document.activeElement)) document.activeElement.blur();
      await flushNote();
      open = null;
      setTimeout(render);
    }
    this.onPointer = ev => {
      if (!open || !el.isConnected) return;
      if (ev.target.closest(`.task-details[data-for="${open}"], [data-task="${open}"], dialog, .toast, .ref-picker, .pill-menu`)) return;
      closeDetails();
    };
    document.addEventListener('pointerdown', this.onPointer, true);
    // Buttons in the panel don't take focus from the notes while pressed.
    body.addEventListener('mousedown', ev => {
      if (ev.target.closest('.task-details .detail-actions button')) ev.preventDefault();
    });

    this.onKey = ev => {
      if (ev.key === 'Escape' && !ev.target.closest('input, textarea, select, [contenteditable]') && (kitOrdered.escape() || kitFlat.escape() || kitPlain.escape())) return;
      if (ev.key === 'Escape' && open && !ev.defaultPrevented && !document.querySelector('.ref-picker, .pill-menu')) { ev.preventDefault(); closeDetails(); }
    };
    addEventListener('keydown', this.onKey);

    // Opens on the Inbox if anything is waiting there, otherwise Now.
    const first = await loadAll();
    state.view = first.tasks.some(t => !isDone(t) && !t.parent_task_id && t.horizon === 'inbox') ? 'inbox' : 'now';
    await render();
  },

  async route([view, project]) {
    // Old links to Today / Upcoming land on Now.
    const v = { today: 'now', upcoming: 'now' }[view] || view;
    this.state.view = ['inbox', 'now', 'next', 'later', 'list', 'projects', 'done'].includes(v) ? v : 'now';
    this.state.project = view === 'list' ? project || null : null;
    this.closeDetails?.();
    await this.render();
  },

  unmount() {
    this.kitOrdered?.destroy();
    this.kitPlain?.destroy();
    this.kitFlat?.destroy();
    this.gone?.abort();
    removeEventListener('keydown', this.onKey);
    document.removeEventListener('pointerdown', this.onPointer, true);
    this.pills?.destroy();
  },

  quickAdd() {
    document.querySelector('#task-entry')?.classList.add('open');
    document.querySelector('#task-new')?.focus();
  },
};
