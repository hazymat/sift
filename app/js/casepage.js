// A task as a case (like an IT support case): the one task full screen, its details first, then its whole
// history in time order (opened, put on a day, ticked and unticked, comments with their photos and files,
// let go, archived, and the edits this device made). ‹ Back or Esc closes it.
//
//   openCase({ task_id } | { item_id }, { closed, back })   View case in a task's full panel (Tasks, the Day Planner),
//                                                           and Advanced's View case beside each name: its own address (#/planner/<date>/advanced/case/<id>):
//                                                           back() goes there, and the address changing closes it
//                                                     and the full panel in Tasks and the Day Planner
//
// A day item brought in from Tasks is the same case as its task (link.js): both records are read.
// Only what Sift keeps is shown. Ticks, comments and files are kept with the task (every device); edits to
// its fields are only in this device's History (store.js, the last 1000 changes), so other devices' edits
// show only as the time each field last changed (its clock), beside the field.

import * as store from './store.js';
import { toHtml } from './richtext.js';
import { undoable, toast } from './toast.js';
import * as att from './attachments.js';
import { attachAsComment } from './comments.js';
import { ENERGY, dateText, dateTimeText, parseDate, durationLabel, showTime } from './days.js';
import { STATUSES, PRIORITIES, HORIZONS, doneFields, projectMembers } from './tasks.js';
import { repeatLabel } from './repeat.js';
import { keys } from './keys.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const noComma = s => s.replace(/^(\w+),/, '$1');
const thisYear = d => d.getFullYear() === new Date().getFullYear();
const whenText = iso => { const d = new Date(iso); return noComma(dateTimeText(d, { weekday: 'short', day: 'numeric', month: 'short', ...(thisYear(d) ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit' })); };
const dayHead = iso => { const d = new Date(iso); return dateText(d, { weekday: 'long', day: 'numeric', month: 'long', ...(thisYear(d) ? {} : { year: 'numeric' }) }); };
const timeOnly = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayText = iso => noComma(dateText(parseDate(iso), { weekday: 'short', day: 'numeric', month: 'short', ...(thisYear(parseDate(iso)) ? {} : { year: 'numeric' }) }));
const clockTime = (rec, field) => { const c = rec?._field_clocks?.[field]; return c ? new Date(store.parseHlc(c).wall).toISOString() : null; };
const unlink = s => (s || '').replace(/\[([^\]]*)\]\(sift:[^)]*\)/g, '$1');
// Field names as the panels call them, for edits from this device's History.
const FIELD_WORDS = { title: 'Name', notes: 'Note', energy: 'Energy', estimate_min: 'Estimated time', project_id: 'Project', milestone_id: 'Milestone', horizon: 'List', start_date: 'Plan for day', aim_at: 'Target end date', priority: 'Priority', status: 'Status', date: 'Day', time: 'Time', end_time: 'Until', contact_ids: 'People', case_id: 'Case', owner_id: 'Owner', waiting_on: 'Waiting on', repeat: 'Repeats' };

let current = null; // the open case: { close }

export async function openCase(owner, { closed, back } = {}) {
  current?.close();
  const page = document.createElement('div');
  page.className = 'case-page';
  page.tabIndex = -1;
  page.setAttribute('role', 'dialog');
  page.setAttribute('aria-modal', 'true');
  document.body.append(page);
  document.documentElement.classList.add('case-open');
  const gone = new AbortController();
  const sig = { signal: gone.signal };
  let typedComment = '';
  let data = null;

  async function load() {
    const getAny = (collection, id) => store.get(collection, id, { includeDeleted: true });
    let task = owner.task_id ? await getAny('tasks', owner.task_id) : null;
    const item = owner.item_id ? await getAny('day_items', owner.item_id) : null;
    if (!task && item?.task_id) task = await getAny('tasks', item.task_id);
    const days = task ? await store.list('day_items', { includeDeleted: true, filter: i => i.task_id === task.id }) : [];
    if (item && !days.some(i => i.id === item.id)) days.push(item);
    days.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const ids = new Set([task?.id, ...days.map(i => i.id)].filter(Boolean));
    const comments = (await store.list('comments', { filter: c => ids.has(c.task_id) || ids.has(c.item_id) })).sort((a, b) => (a.at || '').localeCompare(b.at || ''));
    const files = await att.byParent();
    const lookup = async (collection, id) => (id ? store.get(collection, id) : null);
    const main = task || item;
    const project = await lookup('projects', task?.project_id);
    return {
      task, item, days, main, comments, files, project,
      milestone: await lookup('milestones', task?.milestone_id),
      people: (await Promise.all((main?.contact_ids || []).map(id => lookup('contacts', id)))).filter(Boolean),
      kase: await lookup('cases', main?.case_id),
      thought: await lookup('thoughts', main?.source_thought_id),
      members: project ? projectMembers(project.id) : [],
      history: (await store.historyList()).filter(e => e.changes.some(c => ids.has(c.id))),
      ids,
    };
  }

  // A value as the panels show it (also the before → after of an edit).
  function show(field, value) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return 'none';
    if (field === 'energy') { const e = ENERGY.find(x => x.id === value); return e ? `${e.bolts} ${e.label}` : value; }
    if (field === 'estimate_min') return durationLabel(Number(value));
    if (field === 'priority') return PRIORITIES.find(p => p.id === Number(value))?.label || value;
    if (field === 'status') return STATUSES.find(s => s.id === value)?.label || value;
    if (field === 'horizon') return HORIZONS.find(h => h.id === value)?.label || value;
    if (field === 'start_date' || field === 'date') return dayText(value);
    if (field === 'aim_at') return value.length > 10 ? `${dayText(value.slice(0, 10))}, ${value.slice(11, 16)}` : dayText(value);
    if (field === 'time' || field === 'end_time') return showTime(value);
    if (field === 'repeat') return repeatLabel(value);
    if (field === 'project_id') return data.project?.id === value ? data.project.name : 'another project';
    if (field === 'milestone_id') return data.milestone?.id === value ? data.milestone.name : 'another milestone';
    if (field === 'owner_id') return data.members.find(m => m.user_id === value)?.name || 'someone sharing the project';
    if (field === 'case_id') return data.kase?.id === value ? data.kase.title : 'another case';
    if (field === 'contact_ids') return `${value.length} ${value.length === 1 ? 'person' : 'people'}`;
    if (field === 'notes' || field === 'title') { const s = unlink(String(value)).replace(/\s+/g, ' ').trim(); return s.length > 60 ? `${s.slice(0, 60)}…` : s; }
    return String(value);
  }

  function stateOf(main) {
    if (!main) return { word: 'Gone', cls: 'gone' };
    if (main.deleted_at) return { word: 'In the Bin', cls: 'gone' };
    if (main.dropped_at) return { word: 'Let go', cls: 'gone' };
    if (main.done_at) return { word: 'Closed', cls: 'closed' };
    if (main.archived_at) return { word: 'Archived', cls: 'gone' };
    return { word: main.status === 'doing' ? 'In progress' : main.status === 'waiting' ? 'Waiting' : 'Open', cls: 'open' };
  }

  // The details: only what's set, each with when it last changed (from any device).
  // basic: status, opened, closed, project, day (at the top); else the rest (under the history).
  const BASIC = ['Status', 'Opened', 'Closed', 'Project', 'Day Planner'];
  function fieldsHtml(basic) {
    const { task, item, days, main, project, milestone, people, kase, thought } = data;
    const live = days.filter(i => !i.deleted_at && !i.archived_at);
    const onDay = item || live[live.length - 1];
    const rows = [];
    const add = (label, value, rec, field, raw = false) => { if (value) rows.push({ label, value: raw ? value : esc(value), at: rec && field ? clockTime(rec, field) : null }); };
    add('Status', task ? show('status', task.status || (task.done_at ? 'done' : 'todo')) : main.done_at ? 'Done' : 'To do', task || main, task ? 'status' : 'done_at');
    add('Opened', whenText(task?.created_at || days[0]?.created_at || main.created_at));
    if (main.done_at) add('Closed', whenText(main.done_at));
    if (project) add('Project', `📁 ${project.name}`, task, 'project_id');
    if (milestone) add('Milestone', milestone.name, task, 'milestone_id');
    if (task && !project) add('List', show('horizon', task.horizon || 'now'), task, 'horizon');
    if (onDay) add('Day Planner', `${dayText(onDay.date)}${onDay.time ? `, ${showTime(onDay.time)}${onDay.end_time ? `–${showTime(onDay.end_time)}` : ''}` : ''}`, onDay, 'date');
    if (task?.start_date) add('Plan for day', show('start_date', task.start_date), task, 'start_date');
    if (task?.aim_at) add('Target end date', show('aim_at', task.aim_at), task, 'aim_at');
    if (task?.repeat) add('Repeats', show('repeat', task.repeat), task, 'repeat');
    if (main.estimate_min) add('Estimated time', show('estimate_min', main.estimate_min), main, 'estimate_min');
    if (main.energy) add('Energy', show('energy', main.energy), main, 'energy');
    if (task?.priority && Number(task.priority) !== 3) add('Priority', show('priority', task.priority), task, 'priority');
    if (task?.owner_id) add('Owner', `👤 ${show('owner_id', task.owner_id)}`, task, 'owner_id');
    if (main.waiting_on) add('Waiting on', `⏳ ${main.waiting_on}`, main, 'waiting_on');
    if (people.length) add('People', people.map(p => p.name || '(no name)').join(', '), main, 'contact_ids');
    if (kase) add('Case', kase.title, main, 'case_id');
    if (thought) add('Made from', 'a Brain Dump note', main, null);
    const shown = rows.filter(r => BASIC.includes(r.label) === basic);
    if (!shown.length) return '';
    return `<dl class="case-grid">${shown.map(r => `<div><dt>${esc(r.label)}</dt><dd>${r.value}${r.at ? `<span class="case-changed muted">changed ${esc(whenText(r.at))}</span>` : ''}</dd></div>`).join('')}</dl>`;
  }

  const fileButtons = list => list.map(a => (a.kind === 'image' && a.thumb
    ? `<button type="button" class="case-pic" data-att-open="${a.id}" title="${esc(a.name)}" aria-label="Look at ${esc(a.name)}"><img src="${a.thumb}" alt="" loading="lazy"></button>`
    : `<button type="button" class="case-file" data-att-open="${a.id}" title="${esc(a.name)}">${icon('i-note')} ${esc(att.shortName(a.name, 32))}</button>`)).join('');

  // Everything that happened, oldest first.
  function events() {
    const { task, days, comments, files, history, ids } = data;
    const out = [];
    const push = (at, what, body = '', cls = '') => { if (at) out.push({ at, what, body, cls }); };
    if (task) push(task.created_at, data.thought ? 'Opened, from a Brain Dump note' : 'Opened', '', 'is-opened');
    for (const i of days) {
      push(i.created_at, task ? `Put on the Day Planner for ${dayText(i.date)}` : `Opened on the Day Planner for ${dayText(i.date)}`, '', task ? '' : 'is-opened');
      if (i.unique_from) push(clockTime(i, 'unique_from'), 'Kept only on the Day Planner (the task it came from went to the Bin)');
    }
    // Ticks: a day item and its task tick together (link.js), so the same tick is listed once.
    const ticks = [];
    for (const rec of [task, ...days].filter(Boolean)) {
      const log = rec.done_log?.length ? rec.done_log : rec.done_at ? [{ at: rec.done_at, done: true }] : [];
      for (const t of log) if (!ticks.some(x => x.done === t.done && Math.abs(Date.parse(x.at) - Date.parse(t.at)) < 10000)) ticks.push(t);
    }
    for (const t of ticks) push(t.at, t.done ? 'Closed: ticked done' : 'Reopened: unticked', '', t.done ? 'closed' : 'is-opened');
    for (const rec of [task, ...days].filter(Boolean)) {
      if (rec.dropped_at) push(rec.dropped_at, 'Let go', '', 'is-closed');
      else if (rec.archived_at) push(rec.archived_at, 'Archived', '', 'is-closed');
      if (rec.deleted_at) push(rec.deleted_at, 'Put in the Bin', '', 'is-closed');
    }
    if (task?.owner_id && task.owner_at) push(task.owner_at, `Owner set to ${show('owner_id', task.owner_id)}${task.owner_by && task.owner_by !== task.owner_id ? ` by ${show('owner_id', task.owner_by)}` : ''}`);
    for (const c of comments) {
      const own = files.get(c.id) || [];
      const text = (c.body || '').trim();
      const what = text ? (own.length ? 'Comment, with files' : 'Comment') : own.some(a => a.kind === 'image') ? (own.length > 1 ? `${own.length} photos added` : 'Photo added') : own.length > 1 ? `${own.length} files added` : 'File added';
      push(c.at, what, `${text ? `<div class="case-said">${toHtml(unlink(c.body))}</div>` : ''}${own.length ? `<div class="case-pics">${fileButtons(own)}</div>` : ''}`, 'is-comment');
    }
    for (const id of ids) for (const a of files.get(id) || []) push(a.created_at, a.kind === 'image' ? 'Photo added' : `File added: ${a.name}`, `<div class="case-pics">${fileButtons([a])}</div>`, 'is-comment');
    // Edits made on this device (History): what changed from what.
    for (const e of history) {
      // A task and its Day Planner copy change together (link.js): each change once. Status to or from Done is the tick, listed already.
      const parts = new Set();
      for (const c of e.changes.filter(x => ids.has(x.id) && !x.created)) for (const f of Object.keys(c.after).filter(k => FIELD_WORDS[k] && !(k === 'status' && [c.before?.[k], c.after[k]].includes('done')))) parts.add(f === 'notes' ? 'Note edited' : `${FIELD_WORDS[f]}: ${show(f, c.before?.[f])} → ${show(f, c.after[f])}`);
      if (parts.size) push(e.at, 'Changed on this device', `<ul class="case-edits">${[...parts].map(p => `<li>${esc(p)}</li>`).join('')}</ul>`, 'is-edit');
    }
    return out.sort((a, b) => a.at.localeCompare(b.at));
  }

  function historyHtml() {
    let day = '';
    return events().map(e => {
      const d = dayHead(e.at);
      const head = d !== day ? `<li class="case-day">${esc(d)}</li>` : '';
      day = d;
      return `${head}<li class="case-ev ${e.cls}"><time datetime="${esc(e.at)}" title="${esc(whenText(e.at))}">${esc(timeOnly(e.at))}</time><div class="case-ev-body"><span class="case-what">${esc(e.what)}</span>${e.body}</div></li>`;
    }).join('');
  }

  async function render() {
    const scroll = page.scrollTop;
    const focusedAdd = document.activeElement?.classList?.contains('case-add-box');
    data = await load();
    const { main, task, item, days, files } = data;
    if (!main) { page.innerHTML = `<div class="case-wrap"><div class="case-top"><button type="button" class="back" data-case="back">‹ Back${keys('Esc')}</button></div><p class="muted">This task isn't here any more.</p></div>`; return; }
    const state = stateOf(main);
    const where = task ? (data.project ? `📁 ${esc(data.project.name)}` : 'Tasks') : 'Day Planner only';
    const direct = [...data.ids].flatMap(id => files.get(id) || []);
    page.setAttribute('aria-label', `Task: ${main.title}`);
    page.innerHTML = `<div class="case-wrap">
      <div class="case-top">
        <button type="button" class="back" data-case="back">‹ Back${keys('Esc')}</button>
      </div>
      <p class="case-where muted">${where}${days.length && task ? ` · on the Day Planner ${days.filter(i => !i.deleted_at).length === 1 ? 'once' : `${days.filter(i => !i.deleted_at).length} times`}` : ''}</p>
      <h1 class="case-title"><span class="case-state ${state.cls}">${state.word}</span> <span class="case-name${main.done_at ? ' done' : ''}">${esc(main.title)}</span></h1>
      ${(main.notes || '').trim() ? `<section class="case-sec"><div class="case-notes">${toHtml(unlink(main.notes))}</div></section>` : ''}
      <section class="case-sec" aria-label="Status">${fieldsHtml(true)}
        ${main.deleted_at || main.dropped_at ? '' : `<div class="case-acts"><button type="button" class="case-tick${main.done_at ? '' : ' primary'}" data-case="tick">${main.done_at ? 'Reopen case' : '✓ Mark case done'}</button></div>`}
      </section>
      <section class="case-sec"><h2 class="case-h">History</h2>
        <ol class="case-log">${historyHtml()}</ol>
        <div class="case-add">
          <input class="case-add-box no-inline" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off" enterkeyhint="send">
          <button type="button" class="case-attach" data-case="attach" title="Attach photos, PDFs or text files, as a comment with its time (or drop them here)">${icon('i-clip')}</button>
        </div>
      </section>
      ${direct.length ? `<section class="case-sec"><h2 class="case-h">Attached</h2>${att.rowHtml(direct, { addButton: false, parent: (task || item).id })}</section>` : ''}
      ${fieldsHtml(false) ? `<section class="case-sec"><h2 class="case-h">Details</h2>${fieldsHtml(false)}</section>` : ''}
      <p class="case-honest muted">Ticks, comments, photos and files are kept with the task on every device. Edits to its details are listed only when made on this device (its History); "changed" beside each detail is the last time it changed on any device.</p>
    </div>`;
    const box = page.querySelector('.case-add-box');
    box.value = typedComment;
    if (focusedAdd) box.focus();
    page.scrollTop = scroll;
  }

  const commentOwner = () => (data.task ? { task_id: data.task.id } : { item_id: data.item.id });
  async function addComment() {
    const box = page.querySelector('.case-add-box');
    const text = box.value.trim();
    if (!text) return;
    const made = await store.create('comments', { ...commentOwner(), at: new Date().toISOString(), body: text });
    typedComment = '';
    await render();
    page.querySelector('.case-add-box')?.focus();
    page.scrollTop = page.scrollHeight;
    undoable('Comment added', async () => { await store.remove('comments', made.id); await render(); });
  }
  async function toggleDone() {
    const { task, item, main } = data;
    const done = !main.done_at;
    const rec = item && !item.deleted_at ? ['day_items', item] : task ? ['tasks', task] : ['day_items', item];
    const before = { done_at: rec[1].done_at ?? null, ...(rec[0] === 'tasks' ? { status: rec[1].status ?? null } : {}) };
    await store.update(rec[0], rec[1].id, rec[0] === 'tasks' ? doneFields(done) : { done_at: done ? new Date().toISOString() : null });
    await render();
    undoable(`${done ? 'Done' : 'Not done'}: ${main.title}`, async () => { await store.update(rec[0], rec[1].id, before); await render(); });
  }

  page.addEventListener('click', ev => {
    if (att.onClick(ev, () => null, () => render())) return;
    const act = ev.target.closest('[data-case]')?.dataset.case;
    if (act === 'back') leave();
    else if (act === 'tick') toggleDone();
    else if (act === 'attach') {
      const picker = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: att.ACCEPT, hidden: true });
      picker.onchange = async () => { await attachAsComment(commentOwner(), [...picker.files], render); picker.remove(); page.scrollTop = page.scrollHeight; };
      document.body.append(picker);
      picker.click();
    }
  }, sig);
  page.addEventListener('input', ev => { if (ev.target.classList.contains('case-add-box')) typedComment = ev.target.value; }, sig);
  page.addEventListener('paste', async ev => {
    const files = [...(ev.clipboardData?.files || [])];
    if (!ev.target.closest('.case-add-box') || !files.length) return;
    ev.preventDefault();
    if (page.querySelector('.case-add-box').value.trim()) await addComment();
    await attachAsComment(commentOwner(), files, render);
  }, sig);
  page.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.types || [])].includes('Files')) ev.preventDefault(); }, sig);
  page.addEventListener('drop', async ev => {
    const files = [...(ev.dataTransfer?.files || [])];
    if (!files.length) return;
    ev.preventDefault();
    await attachAsComment(commentOwner(), files, render);
  }, sig);
  // Keys stay on this page: nothing reaches the page underneath (its arrows, Delete, Esc going up a level).
  page.addEventListener('keydown', ev => {
    if (ev.target.classList?.contains('case-add-box') && ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); addComment(); }
    if (ev.key !== 'Escape') ev.stopPropagation();
  }, sig);
  // Esc: out of the comment line first (what's typed stays), then closes. Not while a file or a question is open over it.
  addEventListener('keydown', ev => {
    if (ev.key !== 'Escape' || document.querySelector('dialog[open], .pill-menu')) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (ev.target.closest?.('.case-page input')) ev.target.blur(); else leave();
  }, { capture: true, signal: gone.signal });
  addEventListener('hashchange', () => close(), sig);
  // Changes from elsewhere (another device, the toast's Undo) show straight away.
  let redraw = null;
  const unsubscribe = store.subscribe(change => {
    if (!['tasks', 'day_items', 'comments', 'attachments'].includes(change?.collection)) return;
    clearTimeout(redraw);
    redraw = setTimeout(render, 250);
  });

  const leave = () => (back ? back() : close());
  const opener = document.activeElement;
  function close() {
    if (current?.page !== page) return;
    current = null;
    gone.abort();
    unsubscribe();
    clearTimeout(redraw);
    page.remove();
    document.documentElement.classList.remove('case-open');
    if (opener?.isConnected) opener.focus?.({ preventScroll: true });
    closed?.();
  }
  current = { page, close };
  await render();
  page.focus({ preventScroll: true });
  if (!data.main) toast("That task isn't here any more");
}
