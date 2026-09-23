// Inline editing, the same everywhere: any single-line field you click into
// remembers what was there.
//   Enter        saves (the field loses focus; the view saves with "Saved · Undo")
//   click away   saves the same way
//   Esc          puts the old text back, with an "Escape cancelled change" toast
//                whose Undo brings your edit back (and saves it)
// Fields with their own Enter/Escape handling (e.g. "+ item", a new line on
// the planner) handle those keys first and are left alone.

import { toast } from './toast.js';

const SKIP = '.new-line, .quick-add, #case-note, input[type="search"], input[type="checkbox"], input[type="radio"], input[type="file"], input[type="date"], input[type="time"], .no-inline';
const original = new WeakMap();

const inline = el => el instanceof HTMLInputElement && !el.matches(SKIP) && !el.closest('dialog.sheet form');

export function installInlineEditing() {
  document.addEventListener('focusin', ev => {
    if (inline(ev.target)) original.set(ev.target, ev.target.value);
  });

  // Capture phase so Esc is handled here before a view's own Esc (which may
  // close a box or clear a selection).
  document.addEventListener('keydown', ev => {
    const el = ev.target;
    if (!inline(el) || !original.has(el)) return;
    if (ev.key === 'Escape') {
      const before = original.get(el);
      const typed = el.value;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (typed === before) { el.blur(); return; }
      el.value = before; // setting it in code means no "change" fires on blur
      el.blur();
      toast('Escape cancelled change', {
        action: 'Undo',
        onAction: () => {
          if (!el.isConnected) return;
          el.value = typed;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        },
      });
    }
  }, true);

  // Enter saves: leaving the field fires "change", which the view saves.
  document.addEventListener('keydown', ev => {
    const el = ev.target;
    if (ev.key !== 'Enter' || ev.defaultPrevented || ev.isComposing || !inline(el)) return;
    ev.preventDefault();
    el.blur();
  });

  // After a save the field's new value becomes the one to go back to.
  document.addEventListener('change', ev => {
    if (inline(ev.target)) original.set(ev.target, ev.target.value);
  }, true);
}
