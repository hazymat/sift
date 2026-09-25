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
//   mountComments(root)           fill every such box under root and wire it up
//   commentTexts()                every owner's comments as one string each (search)
//   moveComments(from, to)        e.g. a day-only item became a task: { item_id } → { task_id }

import * as store from './store.js';
import { toHtml } from './richtext.js';
import { pillMenu } from './pillmenu.js';
import { undoable } from './toast.js';

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

export async function moveComments(from, to) {
  for (const c of await commentsFor(from)) await store.update('comments', c.id, { task_id: null, item_id: null, ...to });
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
  box.querySelector('.comment-items').innerHTML = (list.length ? `<div class="field-label">Comments</div><ol class="comment-list">${list.map(c => `
      <li class="comment" data-comment="${c.id}">
        <span class="comment-when" title="${esc(new Date(c.at).toLocaleString('en-GB'))}">${when(c.at)}</span>
        <div class="comment-body">${toHtml(c.body)}</div>
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

function wire(box) {
  box.addEventListener('keydown', async ev => {
    const ta = ev.target.closest('.comment-add');
    if (!ta) return;
    if (ev.key === 'Escape' && ta.value) { ev.preventDefault(); ev.stopPropagation(); ta.value = ''; grow(ta); return; }
    if (ev.key !== 'Enter' || ev.shiftKey) return;
    ev.preventDefault();
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    grow(ta);
    const made = await store.create('comments', { ...ownerOf(box.dataset.comments), at: new Date().toISOString(), body: text });
    await draw(box);
    undoable('Comment added', async () => { await store.remove('comments', made.id); await draw(box); });
  });
  box.addEventListener('input', ev => { if (ev.target.matches('.comment-add')) grow(ev.target); });
  box.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-cmt="menu"]');
    if (!btn) return;
    const li = btn.closest('[data-comment]');
    const c = await store.get('comments', li.dataset.comment);
    if (!c) return;
    pillMenu(btn, [{ value: 'edit', label: 'Edit' }, { value: 'delete', label: 'Delete' }], async v => {
      if (v === 'edit') return edit(box, li, c);
      await store.remove('comments', c.id);
      await draw(box);
      undoable('Comment deleted', async () => { await store.restore('comments', c.id); await draw(box); });
    }, { className: 'comment-menu' });
  });
}

export async function mountComments(root) {
  for (const box of root.querySelectorAll('[data-comments]')) {
    if (box._wired) continue;
    box._wired = true;
    box.innerHTML = '<div class="comment-items"></div><textarea class="comment-add no-inline" rows="1" placeholder="Add a comment…" aria-label="Add a comment"></textarea>';
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
