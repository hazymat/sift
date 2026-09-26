// One list behaviour for the whole app (it started as Find Things' box
// contents). Rows are <li data-id data-depth> with a ⠿ grip (.drag-handle).
//
//   ⠿ tap                select / deselect (Shift: range, Ctrl/⌘: toggle)
//   swipe down the ⠿s    select a range
//   ⠿ press and hold     drag (the selection moves as one stack; a parent
//                        carries its children); sideways = indent / outdent
//   Tab / Shift+Tab      indent / outdent the row being edited
//   Esc                  clear the selection
//   Delete / Backspace   the bar's Delete (not while typing; Undo in the message)
// A bar appears while anything is selected: built-in Indent / Outdent / ↑ / ↓
// (when enabled) plus the caller's actions.
//
//   const kit = createListKit({ reorder, indent, maxDepth, actions, onReorder, noun, grid, families })
//   families: rows keep their depth and a parent carries its children, but there's no indenting
//   grid: true for cards laid out in rows and columns (drag follows the pointer both ways)
//   after each render: kit.attach(ul)        on leaving the view: kit.destroy()
//   onReorder(rows, label, ul, moved): rows = [{ id, depth }] in the new order; moved =
//     the ids that were moved (so only they need a new place: order.js); persist them
//   actions: [{ id, label, danger?, run(ids) }]; ids are in list order
//   onNest(ids, targetId): rows dropped onto the middle of another row (e.g. to
//     make them its sub-tasks); while dragging, the row shows indented with ↳

import { sortable } from './sortable.js';
import { toast } from './toast.js';

// Is the keyboard busy with text (so Delete / Backspace edit it, not the list)?
export const typingIn = el => !!el?.closest?.('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select, [contenteditable]:not([contenteditable="false"])');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createListKit({
  reorder = true, indent = false, maxDepth = 1, actions = [], onReorder, noun = 'item', grid = false, families = false, onNest = null,
} = {}) {
  const selected = new Set();
  let anchor = null;
  let paintBase = null;
  let ul = null;

  // ---------- selection bar (one per kit, fixed at the bottom) ----------
  const bar = document.createElement('div');
  bar.className = 'select-bar';
  bar.setAttribute('role', 'toolbar');
  bar.hidden = true;
  bar.innerHTML = `
    <span class="select-count"></span>
    ${indent ? '<button type="button" data-kit="indent">Indent</button><button type="button" data-kit="outdent">Outdent</button>' : ''}
    ${reorder ? '<button type="button" data-kit="up" aria-label="Move up">↑</button><button type="button" data-kit="down" aria-label="Move down">↓</button>' : ''}
    ${actions.map(a => `<button type="button" data-kit-action="${a.id}"${a.danger ? ' class="danger"' : ''}>${esc(a.label)}</button>`).join('')}
    <button type="button" data-kit="clear" aria-label="Clear selection">✕</button>`;
  document.body.append(bar);

  const rows = () => (ul ? [...ul.querySelectorAll(':scope > li[data-id]')] : []);
  const depthOf = r => Number(r.dataset.depth || 0);
  const idsInOrder = () => rows().map(r => r.dataset.id).filter(id => selected.has(id));

  function paint() {
    for (const r of rows()) {
      const on = selected.has(r.dataset.id);
      r.classList.toggle('selected', on);
      r.querySelector('.drag-handle')?.setAttribute('aria-pressed', on);
    }
    // Forget selections whose rows are gone (deleted, filtered out).
    const present = new Set(rows().map(r => r.dataset.id));
    for (const id of [...selected]) if (!present.has(id)) selected.delete(id);
    bar.hidden = !selected.size;
    document.body.classList.toggle('has-select-bar', !!selected.size);
    bar.querySelector('.select-count').textContent = `${selected.size} ${noun}${selected.size === 1 ? '' : 's'} selected`;
  }

  function clear() {
    selected.clear();
    anchor = null;
    paint();
  }

  // How far sideways a drag must go to indent / outdent. With drop-onto (onNest)
  // it takes a clear move, so drifting right while aiming at a row and
  // missing its middle doesn't make a sub-item.
  const sideStep = onNest ? 70 : 30;

  // A row plus everything nested under it.
  function withChildren(r) {
    const out = [r];
    if (!indent && !families) return out;
    const d = depthOf(r);
    for (let n = r.nextElementSibling; n && n.matches('li[data-id]') && depthOf(n) > d; n = n.nextElementSibling) out.push(n);
    return out;
  }

  // Current order and (valid) depths, handed to the caller to persist.
  function commit(label, moved = []) {
    let prev = -1;
    const out = rows().map((r, i) => {
      let d = indent ? Math.min(depthOf(r), maxDepth, prev + 1) : families ? depthOf(r) : 0;
      if (i === 0) d = 0;
      d = Math.max(0, d);
      r.dataset.depth = d;
      prev = d;
      return { id: r.dataset.id, depth: d };
    });
    return onReorder?.(out, label, ul, moved);
  }

  function shiftDepth(targets, by) {
    for (const r of targets) r.dataset.depth = Math.max(0, Math.min(maxDepth, depthOf(r) + by));
  }

  // ---------- group drag: the others ride along as a stack ----------
  let carried = [];
  let liftParent = null; // the row the dragged one was nested under when lifted
  function liftGroup(held, group) {
    const h = held.getBoundingClientRect().height;
    const at = group.indexOf(held);
    const max = Math.max(3, Math.floor((innerHeight * 0.45) / h));
    let from = Math.max(0, at - Math.floor((max - 1) / 2));
    const to = Math.min(group.length, from + max);
    from = Math.max(0, to - max);
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.setProperty('--row', `${h}px`);
    ghost.style.top = `${-(at - from) * h}px`;
    ghost.classList.toggle('fade-top', from > 0);
    ghost.classList.toggle('fade-bottom', to < group.length);
    const text = r => r.querySelector('input[name="name"], .task-title, .kit-text, input')?.value ?? r.textContent.trim();
    ghost.innerHTML = group.slice(from, to).map(r => `
      <div class="ghost-row${depthOf(r) ? ' sub' : ''}${r === held ? ' lead' : ''}">
        <span>${esc(typeof text(r) === 'string' ? text(r) : '')}</span>
        ${r === held ? `<span class="ghost-count">${group.length} ${noun}s</span>` : ''}
      </div>`).join('');
    held.append(ghost);
    held.classList.add('group-drag');
    group.forEach(r => { if (r !== held) r.hidden = true; });
  }
  function dropGroup(held, group) {
    held.querySelector('.drag-ghost')?.remove();
    held.classList.remove('group-drag');
    group.forEach(r => { r.hidden = false; });
  }

  // ---------- wiring a freshly rendered list ----------
  const wired = new WeakSet(); // a list element that survives re-renders is wired once
  function attach(list) {
    ul = list;
    if (!ul) { paint(); return; }
    if (wired.has(ul)) { paint(); return; }
    wired.add(ul);
    sortable(ul, {
      handle: '.drag-handle',
      holdMs: reorder ? 260 : 100000, // without reordering, a hold does nothing
      keyboard: reorder,
      grid,
      onTap: (li, ev) => {
        const id = li.dataset.id;
        if (ev.shiftKey && anchor) {
          const ids = rows().map(r => r.dataset.id);
          const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
          ids.slice(a, b + 1).forEach(x => selected.add(x));
        } else {
          selected.has(id) ? selected.delete(id) : selected.add(id);
        }
        anchor = id;
        paint();
      },
      onPaint: (from, to) => {
        const all = rows();
        const [a, b] = [all.indexOf(from), all.indexOf(to)].sort((x, y) => x - y);
        if (!paintBase) paintBase = new Set(selected);
        selected.clear();
        paintBase.forEach(x => selected.add(x));
        all.slice(a, b + 1).forEach(r => selected.add(r.dataset.id));
        anchor = from.dataset.id;
        paint();
      },
      onLift: li => {
        paintBase = null;
        document.body.classList.add('is-dragging');
        carried = selected.has(li.dataset.id) && selected.size > 1
          ? rows().filter(r => selected.has(r.dataset.id)).flatMap(r => withChildren(r))
          : withChildren(li);
        carried = [...new Set(carried)];
        // Where it came from: the row it was nested under (for dragging it out).
        liftParent = null;
        for (let p = li.previousElementSibling; p; p = p.previousElementSibling) if (p.matches('li[data-id]') && depthOf(p) < depthOf(li)) { liftParent = p; break; }
        if (carried.length > 1) liftGroup(li, carried);
      },
      // While dragging sideways, the row snaps to the depth it will land at
      // and says so ("sub-item" / "top level").
      onDrag: ({ item, dx }) => {
        if (!indent) return 0;
        const by = dx > sideStep ? 1 : dx < -sideStep ? -1 : 0;
        const from = depthOf(item);
        const prev = item.previousElementSibling?.matches('li[data-id]') ? item.previousElementSibling : null;
        const limit = prev ? Math.min(maxDepth, depthOf(prev) + 1) : 0;
        const to = Math.max(0, Math.min(limit, from + by));
        if (to !== from) item.dataset.dropDepth = String(to);
        else delete item.dataset.dropDepth;
        item.dataset.dropLabel = to > from ? 'sub-item' : to < from ? 'top level' : '';
        return (to - from) * 28;
      },
      // Over the middle of another row: preview the dragged one as its sub-item.
      ...(onNest ? {
        onOnto: target => {
          for (const r of ul.querySelectorAll('.nest-target')) r.classList.remove('nest-target');
          const held = ul.querySelector('li.dragging');
          held?.classList.toggle('nest-preview', !!target);
          target?.classList.add('nest-target');
        },
      } : {}),
      onEnd: ({ item, dx, onto }) => {
        item.classList.remove('nest-preview');
        if (onto && onNest) {
          document.body.classList.remove('is-dragging');
          onto.classList.remove('nest-target');
          const heads = carried.length > 1 ? carried.filter(r => !carried.some(p => p !== r && depthOf(p) < depthOf(r) && carried.indexOf(p) < carried.indexOf(r) && withChildren(p).includes(r))) : [item];
          if (carried.length > 1) dropGroup(item, carried);
          carried = [];
          onNest(heads.map(r => r.dataset.id), onto.dataset.id);
          return;
        }
        document.body.classList.remove('is-dragging');
        delete item.dataset.dropDepth;
        delete item.dataset.dropLabel;
        const group = carried.length > 1 ? carried : [item];
        if (carried.length > 1) {
          dropGroup(item, carried);
          const at = carried.indexOf(item);
          carried.slice(0, at).forEach(r => item.before(r));
          carried.slice(at + 1).reverse().forEach(r => item.after(r));
        }
        carried = [];
        let by = indent ? (dx > sideStep ? 1 : dx < -sideStep ? -1 : 0) : 0;
        if (by) shiftDepth(group, by);
        // A nested row dropped between two top-level rows (and not back under
        // the row it came from) comes out to the top level: dragged out.
        if (indent && !by && depthOf(group[0]) > 0) {
          const prev = [...rows()].slice(0, rows().indexOf(group[0])).reverse().find(r => !group.includes(r));
          const next = group.at(-1).nextElementSibling?.matches('li[data-id]') ? group.at(-1).nextElementSibling : null;
          if ((!prev || depthOf(prev) === 0) && (!next || depthOf(next) === 0) && prev !== liftParent) { by = -depthOf(group[0]); shiftDepth(group, by); }
        }
        // Dropped between a parent and its children (or among them) at a
        // shallower level: it would split the family, so it goes after it.
        if (indent || families) {
          const head = depthOf(group[0]);
          let last = group.at(-1);
          let next = last.nextElementSibling;
          if (next?.matches('li[data-id]') && depthOf(next) > head) {
            while (next?.matches('li[data-id]') && depthOf(next) > head) { last = next; next = next.nextElementSibling; }
            last.after(...group);
          }
        }
        commit(by ? (by > 0 ? 'Indented' : 'Outdented') : 'Moved', group.map(r => r.dataset.id));
      },
    });
    ul.addEventListener('pointerup', () => { paintBase = null; });

    // Tab / Shift+Tab while editing a row
    if (indent) {
      ul.addEventListener('keydown', ev => {
        // In the row's own text field (not a note, and not a bullet the note
        // indented itself), Tab always indents and Shift+Tab outdents: when it
        // can't, it says why rather than moving on to the next field.
        if (ev.key !== 'Tab' || ev.defaultPrevented || ev.ctrlKey || ev.altKey || ev.metaKey) return;
        if (!ev.target.matches('input:not([type="checkbox"])')) return;
        const li = ev.target.closest('li[data-id]');
        if (!li || li.parentElement !== ul) return;
        ev.preventDefault();
        const d = depthOf(li);
        const prev = li.previousElementSibling?.matches('li[data-id]') ? li.previousElementSibling : null;
        if (ev.shiftKey && d === 0) { toast(`Already a ${noun} of its own`); return; }
        if (!ev.shiftKey) {
          if (!prev) { toast(`Nothing above to go under`); return; }
          if (depthOf(prev) < d) { toast(`Already as far in as it goes here`); return; }
          if (d + 1 + Math.max(0, ...withChildren(li).map(r => depthOf(r) - d)) > maxDepth) { toast(`Sub-${noun}s go ${maxDepth >= 2 ? 'three levels deep at most' : 'one level deep'}`); return; }
        }
        shiftDepth(withChildren(li), ev.shiftKey ? -1 : 1);
        const id = li.dataset.id;
        const at = ev.target.selectionStart ?? null;
        Promise.resolve(commit(ev.shiftKey ? 'Outdented' : 'Indented')).then(() => {
          // Back in the row's text, where you were typing (not its tick box).
          const f = ul?.querySelector(`li[data-id="${CSS.escape(id)}"] input:not([type="checkbox"])`);
          f?.focus();
          if (f && at != null) try { f.setSelectionRange(at, at); } catch { /* not a text field */ }
        });
      });
    }
    paint();
  }

  // Delete / Backspace with rows selected does what the bar's Delete does: no
  // "are you sure", the message's Undo is the safety net. Not while typing,
  // and never "Delete forever".
  const onKey = ev => {
    if ((ev.key !== 'Delete' && ev.key !== 'Backspace') || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!selected.size || !ul?.isConnected || typingIn(ev.target) || document.querySelector('dialog[open]')) return;
    const del = actions.find(a => a.id === 'delete' || a.id === 'to-bin');
    if (!del) return;
    ev.preventDefault();
    bar.querySelector(`[data-kit-action="${del.id}"]`)?.click();
  };
  document.addEventListener('keydown', onKey);

  // ---------- the bar ----------
  bar.addEventListener('click', async ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const k = b.dataset.kit;
    if (k === 'clear') return clear();
    if (k === 'indent' || k === 'outdent') {
      const targets = rows().filter(r => selected.has(r.dataset.id)).flatMap(withChildren);
      shiftDepth([...new Set(targets)], k === 'indent' ? 1 : -1);
      await commit(`${k === 'indent' ? 'Indented' : 'Outdented'} ${selected.size}`);
      return paint();
    }
    if (k === 'up' || k === 'down') {
      const group = [...new Set(rows().filter(r => selected.has(r.dataset.id)).flatMap(withChildren))];
      if (!group.length) return;
      if (k === 'up') {
        let prev = group[0].previousElementSibling;
        if (!prev) return;
        // Step over a whole sibling block, not into it.
        while (indent && prev.previousElementSibling && depthOf(prev) > depthOf(group[0])) prev = prev.previousElementSibling;
        prev.before(...group);
      } else {
        const last = group.at(-1);
        let next = last.nextElementSibling;
        if (!next) return;
        const block = withChildren(next);
        block.at(-1).after(...group);
      }
      await commit(`Moved ${selected.size}`, group.map(r => r.dataset.id));
      return paint();
    }
    const action = actions.find(a => a.id === b.dataset.kitAction);
    if (action) {
      const ids = idsInOrder();
      await action.run(ids);
      if (action.keepSelection !== true) clear();
    }
  });

  return {
    attach,
    clear,
    get selected() { return selected; },
    get size() { return selected.size; },
    // Call from the view's Escape handler; returns true if it cleared something.
    escape() { if (!selected.size) return false; clear(); return true; },
    destroy() {
      document.removeEventListener('keydown', onKey);
      bar.remove();
      document.body.classList.remove('has-select-bar', 'is-dragging');
    },
  };
}
