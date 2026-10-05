// A task and the day items made from it share some fields, and they stay the
// same whichever side you edit (Tasks or the Day Planner):
//
//   title, notes, energy, estimated time, people, case
//
// For each shared field the more recently edited copy wins and the other side
// follows (by each field's own clock, so it is "last edit wins", not "whoever
// saved last"). Ticking (or unticking) either side ticks the other. Day-only things (which
// day, start and end time, order, let go, carried over) and task-only things
// (project, dates, list, priority) are not touched, with one exception: when
// an item moves to another day and no copy is left on the task's Plan for day,
// the task's Plan for day follows it.
//
// Run once at start-up. It works on every change, including ones that arrive
// from another device, and settles by itself: a value that is already the same
// isn't written again.

import * as store from './store.js';
import { ask, askYes } from './ask.js';
import { dateText } from './days.js';

export const SHARED = ['title', 'notes', 'energy', 'estimate_min', 'contact_ids', 'case_id'];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const newer = (a, b, field) => store.compareHlc(a._field_clocks?.[field], b._field_clocks?.[field]) > 0;

// What must change on `to` so it matches `from`, for fields where `from` is newer.
function follow(from, to) {
  const diff = {};
  for (const f of SHARED) {
    if (from[f] === undefined || same(from[f], to[f])) continue;
    if (newer(from, to, f)) diff[f] = from[f] ?? null;
  }
  return diff;
}

async function reconcile(change) {
  if (change.deleted) return;
  if (change.collection === 'tasks') {
    const task = await store.get('tasks', change.id);
    if (!task) return;
    const items = await store.list('day_items', { filter: i => i.task_id === task.id && !i.archived_at });
    for (const item of items) {
      const diff = follow(task, item);
      // Ticked (or unticked) in Tasks: the day item follows.
      if (newer(task, item, 'done_at') && !same(task.done_at, item.done_at)) diff.done_at = task.done_at ?? null;
      if (Object.keys(diff).length) await store.update('day_items', item.id, diff);
    }
  } else if (change.collection === 'day_items') {
    const item = await store.get('day_items', change.id);
    if (!item?.task_id) return;
    const task = await store.get('tasks', item.task_id);
    if (!task || task.archived_at) return;
    const diff = follow(item, task);
    // Ticked (or unticked) on the Day Planner: the task follows.
    if (newer(item, task, 'done_at') && !same(item.done_at, task.done_at)) Object.assign(diff, { done_at: item.done_at ?? null, status: item.done_at ? 'done' : 'todo' });
    // Moved to another day: the task's Plan for day follows, unless another copy is still on that day.
    if (task.start_date && item.date && item.date !== task.start_date && store.compareHlc(item._field_clocks?.date, task._field_clocks?.start_date) > 0) {
      const copies = await store.list('day_items', { filter: i => i.task_id === task.id && !i.archived_at });
      if (!copies.some(i => i.date === task.start_date)) diff.start_date = item.date;
    }
    if (Object.keys(diff).length) await store.update('tasks', task.id, diff);
    // …and on to the task's other day items.
    const fresh = await store.get('tasks', task.id);
    for (const other of await store.list('day_items', { filter: i => i.task_id === task.id && i.id !== item.id && !i.archived_at })) {
      const d = follow(fresh, other);
      if (newer(fresh, other, 'done_at') && !same(fresh.done_at, other.done_at)) d.done_at = fresh.done_at ?? null;
      if (Object.keys(d).length) await store.update('day_items', other.id, d);
    }
  }
}

let installed = false;
export function installMirror() {
  if (installed) return;
  installed = true;
  let chain = Promise.resolve();
  store.subscribe(change => {
    if (change.collection !== 'tasks' && change.collection !== 'day_items') return;
    chain = chain.then(() => reconcile(change)).catch(err => console.warn('Linking task and day item failed:', err));
  });
}

// ---------- linked copies: deleting, and keeping one copy only ----------
// A task and the Day Planner items made from it are linked copies. Deleting
// either asks whether the other copies go too (deleteLinked); Make unique keeps
// a day's copy and takes the task out of Tasks or its project (makeUnique).
// Brain Dump notes are never touched by either: a task or item made from one
// only remembers where it came from.

const live = r => r && !r.deleted_at && !r.archived_at;
// The firm warning before a task leaves a project shared with others: its own red sheet, Cancel first.
const sharedWarning = (names, what) => askYes(`Remove from a project shared with ${names.join(', ')}?`, {
  text: `${names.join(' and ')} will no longer see ${what} in the shared project. Only do this if you're sure it shouldn't be there for everyone.`,
  ok: 'Remove for everyone', danger: true, safe: true,
});
// Shares (yours or others') that a task is in, e.g. a project shared with Anna, and who else is in them.
async function sharedWith(tasks) {
  const { sharesNow, inShare, personName, myUserId } = await import('./sync.js');
  const shares = sharesNow().filter(sh => tasks.some(t => inShare(sh, 'tasks', t)));
  return [...new Set(shares.flatMap(sh => (sh.members || []).filter(m => m.user_id !== myUserId()).map(m => personName(m.email))))];
}
// A task and every sub-task under it.
async function withSubs(ids) {
  const all = await store.list('tasks');
  const out = new Set(ids);
  const add = pid => all.filter(t => t.parent_task_id === pid && !out.has(t.id)).forEach(t => { out.add(t.id); add(t.id); });
  ids.forEach(add);
  return [...out];
}

// Before deleting tasks or day items: the linked copies elsewhere. Asks only
// when there are some. → { tasks, items } (ids) to delete, or null: cancelled.
//   here: the words for where the delete was made ('Tasks', 'the Day Planner')
export async function deleteLinked({ tasks = [], items = [] }, here = 'here') {
  const dayItems = (await Promise.all(items.map(id => store.get('day_items', id)))).filter(Boolean);
  const fromItems = [...new Set(dayItems.map(i => i.task_id).filter(Boolean))].filter(id => !tasks.includes(id));
  const linkedTasks = (await Promise.all(fromItems.map(id => store.get('tasks', id)))).filter(live);
  const linkedItems = tasks.length ? await store.list('day_items', { filter: i => tasks.includes(i.task_id) && !i.archived_at && !items.includes(i.id) }) : [];
  if (!linkedTasks.length && !linkedItems.length) return { tasks, items };
  const parts = [];
  if (linkedTasks.length) parts.push(`${linkedTasks.length === 1 ? 'It is' : `${linkedTasks.length} of them are`} also in Tasks${linkedTasks.some(t => t.project_id) ? ' or a project' : ''}.`);
  if (linkedItems.length) parts.push(`${linkedItems.length === 1 ? 'A copy is' : `${linkedItems.length} copies are`} on the Day Planner (${[...new Set(linkedItems.map(i => i.date))].sort().map(d => dateText(new Date(`${d}T12:00`), { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}).`);
  const names = await sharedWith(linkedTasks);
  if (names.length) parts.push(`⚠️ Deleting everywhere takes it out of a project shared with ${names.join(', ')}, so it goes for them too.`);
  const subs = linkedTasks.length ? (await withSubs(linkedTasks.map(t => t.id))).length - linkedTasks.length : 0;
  if (subs) parts.push(`Its ${subs} sub-task${subs === 1 ? '' : 's'} go too.`);
  const answer = await ask({ title: 'Delete the linked copies too?', text: parts.join('\n\n'), ok: 'Delete everywhere', skip: `Only in ${here}`, danger: true });
  if (!answer) return null;
  if (answer === 'skip') return { tasks, items };
  if (names.length && !await sharedWarning(names, linkedTasks.length === 1 ? 'this task' : 'these tasks')) return null;
  return { tasks: tasks.concat(linkedTasks.length ? await withSubs(linkedTasks.map(t => t.id)) : []), items: items.concat(linkedItems.map(i => i.id)) };
}

// Delete (soft, to the Bin) what deleteLinked chose. Returns an undo.
export async function deleteAll({ tasks = [], items = [] }) {
  const now = new Date().toISOString();
  const wasTask = (await Promise.all(tasks.map(id => store.get('tasks', id)))).filter(Boolean).map(t => t.id);
  const wasItem = (await Promise.all(items.map(id => store.get('day_items', id)))).filter(Boolean).map(i => i.id);
  if (wasTask.length) await store.updateMany('tasks', wasTask.map(id => [id, { deleted_at: now }]));
  if (wasItem.length) await store.updateMany('day_items', wasItem.map(id => [id, { deleted_at: now }]));
  return async () => {
    if (wasTask.length) await store.updateMany('tasks', wasTask.map(id => [id, { deleted_at: null }]));
    if (wasItem.length) await store.updateMany('day_items', wasItem.map(id => [id, { deleted_at: null }]));
  };
}

// Make unique: these day items stay, and the tasks they were brought in from
// leave Tasks or their project (to the Bin, with their sub-tasks). The task's
// comments and files move onto the day item first, so nothing is lost.
// confirm: 'always' asks first; 'caveats' asks only when something more is
// at stake (sub-tasks, a repeating task); 'never' doesn't. Taking a task out of
// a shared project always gets the firm warning as well, whatever confirm says.
// → an undo, or null (nothing linked, or cancelled).
export async function makeUnique(itemIds, { confirm = 'always' } = {}) {
  const dayItems = (await Promise.all(itemIds.map(id => store.get('day_items', id)))).filter(i => i?.task_id);
  const pairs = (await Promise.all(dayItems.map(async i => [i, await store.get('tasks', i.task_id)]))).filter(([, t]) => t);
  if (!pairs.length) return null;
  const tasks = [...new Map(pairs.map(([, t]) => [t.id, t])).values()];
  const all = await withSubs(tasks.map(t => t.id));
  const subs = all.length - tasks.length;
  const names = await sharedWith(tasks);
  const repeats = tasks.filter(t => t.recurrence_rule).length;
  const caveats = [];
  if (subs) caveats.push(`${subs} sub-task${subs === 1 ? '' : 's'} go to the Bin with ${tasks.length === 1 ? 'it' : 'them'}.`);
  if (repeats) caveats.push(`${repeats === 1 ? 'A repeating task stops' : `${repeats} repeating tasks stop`} repeating.`);
  if (confirm === 'always' || (confirm === 'caveats' && caveats.length)) {
    const where = tasks.some(t => t.project_id) ? 'Tasks or their project' : 'Tasks';
    const text = [`Only this day's copy stays. The original${tasks.length === 1 ? '' : 's'} in ${where} go${tasks.length === 1 ? 'es' : ''} to the Bin; comments and files move onto the day's copy.`].concat(caveats).join('\n\n');
    if (!await askYes(`Keep ${tasks.length === 1 ? 'only this copy' : `only these ${tasks.length}`}?`, { text, ok: 'Make unique' })) return null;
  }
  if (names.length && !await sharedWarning(names, tasks.length === 1 ? 'this task' : 'these tasks')) return null;
  const now = new Date().toISOString();
  const undo = [];
  for (const [item, task] of pairs) {
    const target = pairs.find(([, t]) => t.id === task.id)[0]; // a task brought in twice: its comments go to the first copy
    if (target !== item) { await store.update('day_items', item.id, { task_id: null, unique_from: task.id }); undo.push(() => store.update('day_items', item.id, { task_id: task.id, unique_from: null })); continue; }
    const comments = await store.list('comments', { filter: c => c.task_id === task.id });
    if (comments.length) await store.updateMany('comments', comments.map(c => [c.id, { task_id: null, item_id: item.id }]));
    const files = await store.list('attachments', { filter: a => a.parent_id === task.id });
    if (files.length) await store.updateMany('attachments', files.map(a => [a.id, { parent_collection: 'day_items', parent_id: item.id }]));
    await store.update('day_items', item.id, { task_id: null, unique_from: task.id });
    undo.push(async () => {
      await store.update('day_items', item.id, { task_id: task.id, unique_from: null });
      if (comments.length) await store.updateMany('comments', comments.map(c => [c.id, { task_id: task.id, item_id: null }]));
      if (files.length) await store.updateMany('attachments', files.map(a => [a.id, { parent_collection: 'tasks', parent_id: task.id }]));
    });
  }
  await store.updateMany('tasks', all.map(id => [id, { deleted_at: now }]));
  return async () => {
    await store.updateMany('tasks', all.map(id => [id, { deleted_at: null }]));
    for (const u of undo.reverse()) await u();
  };
}
