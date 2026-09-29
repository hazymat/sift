// Drag-to-reorder for a list, driven by a grip handle in each item.
// Pointer events rather than HTML5 drag and drop, which doesn't work on
// iOS touch. Keyboard: focus a handle and use the arrow keys.
//
//   sortable(ul, { onMove(item), onEnd({ item, dx }), onCancel({ item }) })
//   onMove runs after each step so callers can enforce rules (e.g. a limit);
//   onEnd({ item, dx }) runs once when the drag finishes; dx is the sideways
//   distance dragged (used for indenting), 0 for keyboard moves.
//
// Esc while dragging puts it back where it was picked up, and nothing is
// saved: onCancel({ item }) instead of onEnd, to undo the view's own marks.
// So does a drag whose release never came (a mouse moving with no button
// held, or a new press while it's still up).
//
// With `holdMs`, the grip does three things:
//   tap                       → onTap(item, event)
//   press and move straight away → onPaint(firstItem, itemUnderPointer) (swipe-select)
//   press and hold, then drag → drag as above (onLift(item) when it lifts)

// With `anywhere` (a hold in ms): press and hold anywhere on a row (not on its
// buttons or tick box; also while its name is being edited) lifts it too
// (hold.js: the shading, and the keyboard kept down).
// While dragging, the other rows slide out of the way (not jump). onDrag({ item,
// dx, dy }) may return the sideways shift to show (e.g. snapped to a depth).

// With `grid: true` the items sit in rows and columns (cards): the dragged one
// follows the pointer both ways and drops into the card it is over.
//
// With `onOnto(target | null)`, the middle of a row means "onto it" (e.g. make
// it a sub-task) rather than before or after it: the list isn't reordered
// there, onOnto says which row it's over, and onEnd gets it as `onto`. The
// dragged row keeps following the finger; the row it's over gets a dashed
// outline (.nest-target), and the gap it would drop into otherwise has the same
// dashed outline (.drop-slot), so there's always one outline saying where it lands.
import { holdToLift, HOLD_SKIP } from './hold.js';

const TILT = -.8; // degrees: the slight twist of a carried row
// A springy wobble, as a physical thing picked up or put down: from `from` it swings past `to`, back,
// and again, less each time, settling at `to` (degrees; keyframes for the rotate property).
const wobble = (from, to, kick) => Array.from({ length: 41 }, (_, n) => {
  const t = n / 40 * 0.7, fade = Math.exp(-t / 0.16), turn = 2 * Math.PI * 3.2 * t;
  return { rotate: `${(to + (from - to) * fade * Math.cos(turn) + kick * fade * Math.sin(turn)).toFixed(3)}deg` };
});

export function sortable(list, { handle = '.drag-handle', holdMs = 0, anywhere = 0, keyboard = true, grid = false, onMove, onEnd, onCancel, onTap, onPaint, onLift, onDrag, onOnto } = {}) {
  let origin = null; // where the dragged row was picked up: { parent, next }
  let onto = null; // the row the dragged one is over the middle of (onOnto)
  const setOnto = el => {
    if (el === onto) return;
    onto = el;
    onOnto?.(el);
    if (slot) slot.hidden = !!el; // the row it's over has the dashed outline instead (.nest-target)
    // Going under that row, it takes no place of its own in the list meanwhile: no empty gap.
    if (dragging) dragging.style.marginBottom = el ? `${baseMargin - dragging.offsetHeight - (parseFloat(getComputedStyle(list).rowGap) || 0)}px` : '';
  };
  let baseMargin = 0; // the dragged row's own bottom margin
  // A row's place as if the dragged one still took its room (rows after it move up while it takes none),
  // so going onto a row doesn't move that row out from under the finger.
  // Rows still sliding to make room count where they're going, not where they show mid-slide.
  const rectOf = el => {
    const b = el.getBoundingClientRect(), t = getComputedStyle(el).transform;
    const sliding = t !== 'none' && el.getAnimations().some(a => a.id === 'make-room') ? new DOMMatrixReadOnly(t).m42 : 0;
    const r = { top: b.top - sliding, bottom: b.bottom - sliding };
    const closed = dragging && el !== dragging && (dragging.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) ? baseMargin - parseFloat(getComputedStyle(dragging).marginBottom) : 0;
    return { top: r.top + closed, bottom: r.bottom + closed, height: b.height };
  };
  let slot = null; // the dashed outline of the gap it will drop into (with onOnto)
  let dragging = null;
  let pending = null; // pressed; waiting to see if it's a tap, swipe or hold
  let painting = null;
  let offsetY = 0;
  let offsetX = 0;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  // Hidden rows (e.g. the rest of a group being dragged) don't take part.
  const siblings = () => [...list.children].filter(el => el !== dragging && !el.hidden);

  const rowAt = y => {
    const rows = [...list.children].filter(el => !el.hidden);
    return rows.find(r => { const b = r.getBoundingClientRect(); return y >= b.top && y < b.bottom; })
      || (y < rows[0]?.getBoundingClientRect().top ? rows[0] : rows.at(-1));
  };

  // The other rows slide to their new places rather than jump (from where they're showing now).
  function slid(move) {
    const others = siblings();
    const was = new Map(others.map(el => [el, el.getBoundingClientRect().top]));
    for (const el of others) for (const a of el.getAnimations()) if (a.id === 'make-room') a.cancel();
    move();
    for (const el of others) {
      const d = was.get(el) - el.getBoundingClientRect().top;
      if (Math.abs(d) > 1) el.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 150, easing: 'cubic-bezier(.2, .8, .2, 1)', id: 'make-room' });
    }
  }

  // Where the dragged item's visual centre now is, so the DOM follows it.
  function place(clientY, clientX = 0) {
    if (grid) {
      // The card under the pointer (its middle part, so cards of different sizes don't jitter).
      const under = siblings().find(el => {
        const r = el.getBoundingClientRect();
        return clientX > r.left + r.width * 0.2 && clientX < r.right - r.width * 0.2 && clientY > r.top + r.height * 0.2 && clientY < r.bottom - r.height * 0.2;
      });
      if (!under) return;
      if (dragging.compareDocumentPosition(under) & Node.DOCUMENT_POSITION_PRECEDING) list.insertBefore(dragging, under); else under.after(dragging);
      onMove?.(dragging);
      return;
    }
    if (onOnto) {
      // Over the middle third of a row: onto it, no reordering.
      const over = siblings().find(el => { const r = rectOf(el); return clientY > r.top + r.height / 3 && clientY < r.bottom - r.height / 3; });
      if (over) { if (over !== onto) slid(() => setOnto(over)); return; }
      // Off it again: its own room comes back and it takes its new place in one go, so the rows
      // only slide to where they end up (not back to where they were first).
      if (onto) { const to = spotFor(clientY); slid(() => { setOnto(null); if (to) to.before ? list.insertBefore(dragging, to.el) : to.el.after(dragging); }); if (to) onMove?.(dragging); return; }
    }
    const to = spotFor(clientY);
    if (!to) return;
    slid(() => to.before ? list.insertBefore(dragging, to.el) : to.el.after(dragging));
    onMove?.(dragging);
  }
  // Where the dragged row belongs for the pointer at clientY: before or after which row (null: where it is).
  function spotFor(clientY) {
    let after = null;
    for (const el of siblings()) {
      const r = rectOf(el), mid = r.top + r.height / 2;
      const before = dragging.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING;
      if (before && clientY < mid) return { el, before: true };
      if (!before && clientY > mid && el.nextElementSibling !== dragging) after = { el };
    }
    return after;
  }

  function follow(clientY, clientX = 0) {
    // Translate so the item stays under the finger even after DOM moves.
    dragging.style.transform = '';
    // Its own box, untwisted: a turned row's bounding box is taller (the twist turns it about its middle).
    const turned = dragging.getBoundingClientRect(), w = dragging.offsetWidth, h = dragging.offsetHeight;
    const box = { left: turned.left + turned.width / 2 - w / 2, top: turned.top + turned.height / 2 - h / 2, width: w, height: h };
    // Where it is in the list, before it's moved to follow the pointer; its corners as the row's are now (e.g. coming out of a group).
    if (slot) Object.assign(slot.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: getComputedStyle(dragging).borderRadius });
    dragging.style.transform = grid
      ? `translate(${clientX - offsetX - box.left}px, ${clientY - offsetY - box.top}px)`
      : `translate(var(--dx, 0px), ${clientY - offsetY - box.top}px)`; // (and a slight twist while carried, as in the Day Planner: TILT)
  }

  function lift(item, x, y) {
    dragging = item;
    origin = { parent: item.parentNode, next: item.nextSibling };
    offsetY = y - item.getBoundingClientRect().top;
    offsetX = x - item.getBoundingClientRect().left;
    startX = lastX = x;
    startY = lastY = y;
    item.classList.add('dragging');
    if (!grid) { item.style.rotate = `${TILT}deg`; item.animate(wobble(0, TILT, -2.2), { duration: 700 }); } // it twists in with a wobble
    baseMargin = parseFloat(getComputedStyle(item).marginBottom) || 0;
    // The finger's events can stop reaching the list once it lifts (the view redraws the row, or
    // the phone doesn't hand the touch over): follow them on the whole page till let go.
    addEventListener('pointermove', strayMove);
    addEventListener('pointerup', strayEnd);
    addEventListener('pointercancel', strayEnd);
    addEventListener('keydown', escKey, true);
    onLift?.(item);
    if (onOnto && !grid) {
      slot = document.createElement('div');
      slot.className = 'drop-slot';
      slot.setAttribute('aria-hidden', 'true');
      slot.style.borderRadius = getComputedStyle(item).borderRadius;
      document.body.append(slot);
      follow(y, x);
    }
    navigator.vibrate?.(10);
  }

  // A hold anywhere on a row lifts it too (hold.js).
  const hold = anywhere ? holdToLift(list, {
    rowAt: t => { const li = t.closest('li'); return li && li.parentElement === list && !li.hidden ? li : null; },
    skip: `${handle}, ${HOLD_SKIP}`,
    ms: anywhere,
    busy: () => !!dragging,
    onLift: (li, x, y, pointerId) => {
      li.dispatchEvent(new CustomEvent('sortable-lift', { bubbles: true })); // e.g. its editing pills close
      try { list.setPointerCapture(pointerId); } catch {}
      lastX = x; lastY = y;
      lift(li, x, y);
    },
  }) : null;

  // A drag still on from a touch whose end never came: put back before a new press starts.
  list.addEventListener('pointerdown', () => { if (dragging) putBack(); }, true);

  // Put back where it was picked up (the view's own marks undone by onCancel), nothing saved.
  function putBack() {
    if (!dragging) return;
    const item = dragging;
    if (origin?.parent?.isConnected) origin.parent.insertBefore(item, origin.next?.parentNode === origin.parent ? origin.next : null);
    lastX = startX; lastY = startY; // no sideways shift either
    setOnto(null);
    finish({ type: 'pointercancel' }, true);
  }
  const escKey = e => { if (e.key === 'Escape' && dragging) { e.preventDefault(); e.stopImmediatePropagation(); putBack(); } }; // only the drag: not also the selection or the editing

  list.addEventListener('pointerdown', e => {
    const grip = e.target.closest(handle);
    if (!grip || !list.contains(grip) || e.button > 0) return;
    e.preventDefault();
    try { grip.setPointerCapture(e.pointerId); } catch {} // synthetic events have no real pointer
    const item = grip.closest('li');
    lastX = e.clientX;
    lastY = e.clientY;
    if (!holdMs) return lift(item, e.clientX, e.clientY);
    pending = {
      item, x: e.clientX, y: e.clientY, event: e,
      timer: setTimeout(() => {
        if (!pending) return;
        const p = pending;
        pending = null;
        lift(p.item, lastX, lastY);
      }, holdMs),
    };
  });

  list.addEventListener('pointermove', e => onMove(e));
  function onMove(e) {
    if (e.pointerType === 'mouse' && !e.buttons && (dragging || pending)) { if (dragging) putBack(); else { clearTimeout(pending.timer); pending = null; } return; } // let go where it wasn't seen
    lastX = e.clientX;
    lastY = e.clientY;
    if (pending) {
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < 6) return;
      clearTimeout(pending.timer);
      painting = pending.item;
      pending = null;
    }
    if (painting) {
      onPaint?.(painting, rowAt(e.clientY));
      return;
    }
    if (!dragging) return;
    // onDrag may return the sideways shift to show (e.g. snapped to a depth).
    if (!grid) {
      const shown = onDrag?.({ item: dragging, dx: lastX - startX, dy: lastY - startY });
      dragging.style.setProperty('--dx', `${shown ?? Math.max(-40, Math.min(40, lastX - startX))}px`);
    }
    place(e.clientY, e.clientX);
    follow(e.clientY, e.clientX);
  }
  // Events outside the list while carrying (inside it, the list's own listeners have them).
  const stray = e => dragging && !list.contains(e.target);
  const strayMove = e => { if (stray(e)) onMove(e); };
  const strayEnd = e => { if (stray(e)) finish(e); };

  function finish(e, cancelled = false) {
    hold?.cancel();
    hold?.letGo();
    if (pending) {
      clearTimeout(pending.timer);
      const { item, event } = pending;
      pending = null;
      if (e.type === 'pointerup') onTap?.(item, event);
      return;
    }
    if (painting) {
      painting = null;
      return;
    }
    if (!dragging) return;
    removeEventListener('pointermove', strayMove);
    removeEventListener('pointerup', strayEnd);
    removeEventListener('pointercancel', strayEnd);
    removeEventListener('keydown', escKey, true);
    const item = dragging;
    slot?.remove();
    slot = null;
    const from = getComputedStyle(item).transform, dx = lastX - startX;
    item.classList.remove('dragging');
    item.style.transform = '';
    item.style.rotate = '';
    item.style.marginBottom = '';
    item.style.removeProperty('--dx');
    dragging = null;
    const target = onto;
    if (onto) setOnto(null);
    const id = item.dataset.id;
    const put = () => {
      if (item.isConnected) { if (cancelled) onCancel?.({ item }); else onEnd?.({ item, dx, onto: target }); }
      else document.body.classList.remove('is-dragging'); // the view drew the list again meanwhile: nothing to put down
      if (!grid && id) settle(item, id);
    };
    // Into its gap: it glides there, then it's put down (onto a row, it goes under it at once).
    if (!grid && !target && item.isConnected) item.animate([{ transform: from === 'none' ? 'none' : from, rotate: `${TILT}deg` }, { transform: 'none', rotate: `${TILT}deg` }], { duration: 160, easing: 'cubic-bezier(.2, .8, .2, 1)' }).finished.then(put, put);
    else put();
  }
  // Put down, it wobbles straight. The view usually draws the list again after a drop: the new row
  // carries on the same wobble from where the old one was.
  function settle(item, id) {
    const keys = wobble(TILT, 0, 1.2), start = performance.now();
    let row = item;
    if (item.isConnected) item.animate(keys, { duration: 700 });
    const watch = () => {
      const gone = performance.now() - start;
      if (gone > 700) return;
      const now = [...document.querySelectorAll('li[data-id]')].find(r => r.dataset.id === id);
      if (now && now !== row) { row = now; const a = now.animate(keys, { duration: 700 }); a.currentTime = gone; }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }
  list.addEventListener('pointerup', finish);
  list.addEventListener('pointercancel', finish);

  list.addEventListener('keydown', e => {
    const grip = e.target.closest(handle);
    if (!keyboard || !grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
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
