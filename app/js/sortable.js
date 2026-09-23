// Drag-to-reorder for a list, driven by a grip handle in each item.
// Pointer events rather than HTML5 drag and drop, which doesn't work on
// iOS touch. Keyboard: focus a handle and use the arrow keys.
//
//   sortable(ul, { onMove(item), onEnd({ item, dx }) })
//   onMove runs after each step so callers can enforce rules (e.g. a limit);
//   onEnd({ item, dx }) runs once when the drag finishes; dx is the sideways
//   distance dragged (used for indenting), 0 for keyboard moves.

export function sortable(list, { handle = '.drag-handle', onMove, onEnd } = {}) {
  let dragging = null;
  let offsetY = 0;
  let startX = 0;
  let lastX = 0;

  const siblings = () => [...list.children].filter(el => el !== dragging);

  // Where the dragged item's visual centre now is, so the DOM follows it.
  function place(clientY) {
    for (const el of siblings()) {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const before = dragging.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING;
      if (before && clientY < mid) {
        list.insertBefore(dragging, el);
        onMove?.(dragging);
        return;
      }
      if (!before && clientY > mid && el.nextElementSibling !== dragging) {
        el.after(dragging);
        onMove?.(dragging);
      }
    }
  }

  function follow(clientY) {
    // Translate so the item stays under the finger even after DOM moves.
    dragging.style.transform = '';
    const top = dragging.getBoundingClientRect().top;
    dragging.style.transform = `translate(var(--dx, 0px), ${clientY - offsetY - top}px)`;
  }

  list.addEventListener('pointerdown', e => {
    const grip = e.target.closest(handle);
    if (!grip || !list.contains(grip) || e.button > 0) return;
    e.preventDefault();
    dragging = grip.closest('li');
    offsetY = e.clientY - dragging.getBoundingClientRect().top;
    startX = lastX = e.clientX;
    dragging.classList.add('dragging');
    grip.setPointerCapture(e.pointerId);
  });

  list.addEventListener('pointermove', e => {
    if (!dragging) return;
    lastX = e.clientX;
    dragging.style.setProperty('--dx', `${Math.max(-40, Math.min(40, lastX - startX))}px`);
    place(e.clientY);
    follow(e.clientY);
  });

  const finish = () => {
    if (!dragging) return;
    const item = dragging;
    item.classList.remove('dragging');
    item.style.transform = '';
    item.style.removeProperty('--dx');
    dragging = null;
    onEnd?.({ item, dx: lastX - startX });
  };
  list.addEventListener('pointerup', finish);
  list.addEventListener('pointercancel', finish);

  list.addEventListener('keydown', e => {
    const grip = e.target.closest(handle);
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const item = grip.closest('li');
    const target = e.key === 'ArrowUp' ? item.previousElementSibling : item.nextElementSibling;
    if (!target) return;
    if (e.key === 'ArrowUp') target.before(item); else target.after(item);
    onMove?.(item);
    grip.focus();
    onEnd?.({ item, dx: 0 });
  });
}
