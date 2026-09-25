// Comments on a task: a dated running record of what actually happened
// ("started the partner form, need their reseller number"), shown only in the
// task's panel. Each comment is its own record in `comments`, so two devices
// adding comments merge cleanly.
//
// A comment belongs to a task (task_id). A task brought into the Day Planner
// shows the same comments; a day-only item has its own (item_id), which move
// to the task if it's sent to Tasks (moveComments).
//
//   commentsHtml(owner)           an empty box for a panel; owner = { task_id } or { item_id }
//   mountComments(root, changed)  fill every such box under root and wire it up;
//                                 changed() redraws the page after a comment makes
//                                 a sub-task or a plan item, or sets a check-back date
//   commentTexts()                every owner's comments as one string each (search)
//   closingComment(owner)         the toast button after ticking something done
//   moveComments(from, to)        e.g. a day-only item became a task: { item_id } → { task_id }

import * as store from './store.js';
import { toHtml } from './richtext.js';
import { pillMenu } from './pillmenu.js';
import { undoable } from './toast.js';
import { addTask } from './tasks.js';
import { addItem, isoDate } from './days.js';
import { ask, askText } from './ask.js';
import * as att from './attachments.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const keyOf = o => o.task_id ? `task_id:${o.task_id}` : `item_id:${o.item_id}`;
const ownerOf = key => { const [f, id] = key.split(':'); return { [f]: id }; };

export function commentsHtml(owner) {
  return `<div class="comments" data-comments="${esc(keyOf(owner))}"></div>`;
}

export async function commentsFor(owner) {
  const [f, id] = Object.entries(owner)[0];
  const list = await store.list('comments', { filter: c => c[f] === id });
  return list.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
}

// After ticking a task done, the toast offers "Comment": a closing comment
// ("done, cost £40") without ever having to write one.
export const closingComment = owner => ({
  label: 'Comment',
  onAction: async () => {
    const text = await askText('Closing comment', { placeholder: 'e.g. done, cost £40', ok: 'Add' });
    if (!text?.trim()) return;
    const made = await store.create('comments', { ...owner, at: new Date().toISOString(), body: text.trim() });
    undoable('Comment added', () => store.remove('comments', made.id));
  },
});

export async function moveComments(from, to) {
  for (const c of await commentsFor(from)) await store.update('comments', c.id, { task_id: null, item_id: null, ...to });
}

const short = iso => new Date(`${iso}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(iso.slice(0, 4) !== isoDate().slice(0, 4) ? { year: 'numeric' } : {}) });
// A comment's first line, as the title of what it turns into.
const titleOf = c => (c.body.split('\n').map(l => l.replace(/^\s*[-*]\s+/, '').trim()).find(Boolean) || 'Comment').slice(0, 120);

// What a comment has turned into, and when to check back, under its text.
async function marks(c) {
  const out = [];
  const sub = c.sub_task_id && await store.get('tasks', c.sub_task_id);
  if (sub) out.push(`<span class="comment-mark">${sub.done_at ? '✓' : '↳'} Sub-task</span>`);
  const item = c.plan_item_id && await store.get('day_items', c.plan_item_id);
  if (item) out.push(`<a class="comment-mark" href="#/planner/${item.date}">${item.done_at ? '✓' : '↳'} On the plan, ${short(item.date)}</a>`);
  if (c.check_back) out.push(`<span class="comment-mark${c.check_back <= isoDate() ? ' due' : ''}">⏰ Check back ${short(c.check_back)}</span>`);
  return out.length ? `<div class="comment-marks">${out.join('')}</div>` : '';
}

function when(iso) {
  const d = new Date(iso);
  const now = new Date();
  const day = d.toDateString() === now.toDateString() ? 'Today'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
  return `${day} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

// Enter adds (or saves), Shift+Enter makes a new line, Esc leaves.
const grow = ta => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; };

// Only the list is redrawn; the add box stays put, so typing carries on.
async function draw(box) {
  const list = await commentsFor(ownerOf(box.dataset.comments));
  const extra = await Promise.all(list.map(marks));
  const files = list.length ? await att.byParent() : new Map();
  box.querySelector('.comment-items').innerHTML = (list.length ? `<div class="field-label">Comments</div><ol class="comment-list">${list.map((c, n) => `
      <li class="comment" data-comment="${c.id}">
        <span class="comment-when" title="${esc(new Date(c.at).toLocaleString('en-GB'))}">${when(c.at)}</span>
        <div class="comment-body">${toHtml(c.body)}${files.get(c.id)?.length ? att.rowHtml(files.get(c.id), { addButton: false }) : ''}${extra[n]}</div>
        <button type="button" class="comment-more" data-cmt="menu" aria-label="Comment options">⋯</button>
      </li>`).join('')}</ol>` : '');
}

function edit(box, li, c) {
  const body = li.querySelector('.comment-body');
  body.innerHTML = '<textarea class="comment-edit no-inline" rows="1" aria-label="Edit comment"></textarea>';
  const ta = body.querySelector('textarea');
  ta.value = c.body;
  grow(ta);
  ta.focus();
  let done = false;
  const finish = async save => {
    if (done) return;
    done = true;
    const text = ta.value.trim();
    if (save && text && text !== c.body) {
      await store.update('comments', c.id, { body: text });
      undoable('Comment saved', async () => { await store.update('comments', c.id, { body: c.body }); await draw(box); });
    }
    await draw(box);
  };
  ta.addEventListener('input', () => grow(ta));
  ta.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); finish(true); }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
  });
  ta.addEventListener('blur', () => finish(true));
}

async function act(box, v, c, owner) {
  const changed = async () => { await draw(box); await box._changed?.(); };
  const task = owner.task_id && await store.get('tasks', owner.task_id);
  if (v === 'attach') return att.pick({ collection: 'comments', id: c.id }, () => draw(box));
  if (v === 'sub' && task) {
    const sub = await addTask({ title: titleOf(c), parent_task_id: task.id, project_id: task.project_id || null, milestone_id: task.milestone_id || null, horizon: task.horizon || 'now', from_comment_id: c.id });
    await store.update('comments', c.id, { sub_task_id: sub.id });
    await changed();
    undoable('Made a sub-task', async () => { await store.remove('tasks', sub.id); await store.update('comments', c.id, { sub_task_id: null }); await changed(); });
  } else if (v === 'plan') {
    const made = await addItem(isoDate(), { title: titleOf(c), from_comment_id: c.id, case_id: task?.case_id || null, contact_ids: task?.contact_ids || [] });
    await store.update('comments', c.id, { plan_item_id: made.id });
    await changed();
    undoable("On today's plan", async () => { await store.remove('day_items', made.id); await store.update('comments', c.id, { plan_item_id: null }); await changed(); });
  } else if (v === 'back' || v === 'noback') {
    let date = null;
    if (v === 'back') {
      const got = await ask({ title: 'Check back on', text: task ? 'The task comes back on the Day Planner that day.' : '', fields: [{ name: 'date', type: 'date', value: c.check_back || isoDate(new Date(Date.now() + 7 * 864e5)) }], ok: 'Set' });
      date = got?.date;
      if (!date) return;
    }
    const before = { check_back: c.check_back || null };
    const taskBefore = task && { start_date: task.start_date ?? null };
    await store.update('comments', c.id, { check_back: date });
    // The task is planned for that day, so it's offered on the Day Planner then.
    if (task && date && !task.done_at) await store.update('tasks', task.id, { start_date: date });
    await changed();
    undoable(date ? `Check back ${short(date)}` : 'Check-back removed', async () => {
      await store.update('comments', c.id, before);
      if (task && date) await store.update('tasks', task.id, taskBefore);
      await changed();
    });
  }
}

function setPending(box, files) {
  box._pending = files;
  const note = box.querySelector('.comment-pending');
  note.hidden = !files.length;
  note.textContent = files.length ? `📎 ${files.length === 1 ? files[0].name : `${files.length} files`} will go with this comment (Enter)` : '';
}

function wire(box) {
  box.addEventListener('keydown', async ev => {
    const ta = ev.target.closest('.comment-add');
    if (!ta) return;
    if (ev.key === 'Escape' && ta.value) { ev.preventDefault(); ev.stopPropagation(); ta.value = ''; grow(ta); return; }
    if (ev.key !== 'Enter' || ev.shiftKey) return;
    ev.preventDefault();
    const text = ta.value.trim();
    const pending = box._pending || [];
    if (!text && !pending.length) return;
    ta.value = '';
    grow(ta);
    setPending(box, []);
    const made = await store.create('comments', { ...ownerOf(box.dataset.comments), at: new Date().toISOString(), body: text });
    if (pending.length) await att.addFiles({ collection: 'comments', id: made.id }, pending);
    await draw(box);
    undoable('Comment added', async () => { await store.remove('comments', made.id); await draw(box); });
  });
  // Files pasted or dropped into "Add a comment…" go with the next comment;
  // dropped on a comment, they're attached to it.
  box.addEventListener('paste', ev => {
    const files = [...(ev.clipboardData?.files || [])];
    if (!files.length || !ev.target.closest('.comment-add')) return;
    ev.preventDefault();
    setPending(box, [...(box._pending || []), ...files]);
  });
  box.addEventListener('dragover', ev => { if ([...(ev.dataTransfer?.types || [])].includes('Files')) { ev.preventDefault(); ev.stopPropagation(); } });
  box.addEventListener('drop', async ev => {
    const files = [...(ev.dataTransfer?.files || [])];
    if (!files.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    const li = ev.target.closest('[data-comment]');
    if (!li) { setPending(box, [...(box._pending || []), ...files]); box.querySelector('.comment-add').focus(); return; }
    const made = await att.addFiles({ collection: 'comments', id: li.dataset.comment }, files);
    await draw(box);
    if (made.length) undoable(`Attached ${made.length === 1 ? made[0].name : `${made.length} files`}`, async () => { for (const m of made) await store.remove('attachments', m.id); await draw(box); });
  });
  box.addEventListener('click', ev => { att.onClick(ev, () => null, () => draw(box)); }, true);
  box.addEventListener('input', ev => { if (ev.target.matches('.comment-add')) grow(ev.target); });
  box.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-cmt="menu"]');
    if (!btn) return;
    const li = btn.closest('[data-comment]');
    const c = await store.get('comments', li.dataset.comment);
    if (!c) return;
    const owner = ownerOf(box.dataset.comments);
    const options = [{ value: 'edit', label: 'Edit' }];
    if (owner.task_id && !c.sub_task_id) options.push({ value: 'sub', label: '→ Sub-task', title: 'Make this a sub-task of the task' });
    if (!c.plan_item_id) options.push({ value: 'plan', label: "→ Today's plan", title: "Put this on today's plan" });
    options.push({ value: 'attach', label: '📎 Attach…', title: 'Attach photos, PDFs or text files (or drop them on the comment)' });
    options.push({ value: 'back', label: c.check_back ? '⏰ Change check-back' : '⏰ Check back…', title: 'Bring the task back on a day, e.g. when waiting on someone' });
    if (c.check_back) options.push({ value: 'noback', label: 'No check-back' });
    options.push({ value: 'delete', label: 'Delete' });
    pillMenu(btn, options, async v => {
      if (v === 'edit') return edit(box, li, c);
      if (v !== 'delete') return act(box, v, c, owner);
      await store.remove('comments', c.id);
      await draw(box);
      undoable('Comment deleted', async () => { await store.restore('comments', c.id); await draw(box); });
    }, { className: 'comment-menu' });
  });
}

export async function mountComments(root, changed) {
  for (const box of root.querySelectorAll('[data-comments]')) {
    box._changed = changed;
    if (box._wired) continue;
    box._wired = true;
    box.innerHTML = '<div class="comment-items"></div><textarea class="comment-add no-inline" rows="1" placeholder="Add a comment…" aria-label="Add a comment"></textarea><div class="comment-pending muted" hidden></div>';
    wire(box);
    await draw(box);
  }
}

// Every comment's text by owner, for search: "task_id:…" → "text text".
export async function commentTexts() {
  const out = new Map();
  for (const c of await store.list('comments')) {
    const k = keyOf(c);
    out.set(k, `${out.get(k) || ''} ${c.body || ''}`);
  }
  return out;
}
