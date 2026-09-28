// Phones: swipe a row of a list sideways, as in a phone's mail app. The row
// stays where it is (its title still readable) and its actions slide in over
// it from the side the finger comes from: swipe left for the right-hand ones
// (e.g. ✓ Done, ⋯ More), right for the left-hand ones (e.g. Delete). Let go
// past half of them and it stays open for a tap; less and it springs back; a
// tap anywhere else closes it. Not from a grab bar, a tick, a button or a
// field being typed in, nor while things are chosen (the actions bar is up).
// A row's swipe isn't also the page's (app.js: a side swipe changes page). One
// place for every list that swipes: Tasks and the Day Planner so far.
//
//   rowSwipe(root, { rows, face, actions })
//     rows: the swipeable rows inside root (a selector)
//     face: the part of a row the actions cover (a selector inside it; none: the whole row),
//       e.g. a Day Planner line from its grab bar on, leaving the time uncovered
//     actions(row): { left: [{ label, cls, run(row) }], right: [...] }
//       left: shown on the right when swiped left; right: on the left when swiped right

const SKIP = '.drag-handle, .drag-grip, .resize-grip, .tick, button, .row-acts, input:focus, textarea:focus, [contenteditable="true"]';

export function rowSwipe(root, { rows, face = null, actions }) {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const faceOf = row => (face && row.querySelector(face)) || row;
  let sw = null, openRow = null, shown = null; // shown: the open row's actions
  let closing = false; // this touch closes the open row, and does nothing else
  let quietUntil = 0; // just after a swipe: a click on the row isn't a tap on it
  // The actions cover x of the row, from its edge.
  const slideTo = (row, x, animate) => {
    row.classList.toggle('swipe-anim', animate);
    row.style.setProperty('--swipe-w', `${Math.abs(x)}px`);
  };
  const shut = () => {
    const row = openRow;
    openRow = null;
    if (!row) return;
    slideTo(row, 0, true);
    setTimeout(() => {
      if (openRow === row) return;
      row.classList.remove('swiping', 'swipe-anim');
      row.querySelector(':scope > .row-acts')?.remove();
    }, 220);
  };
  // The actions for that side, over the face's end (its rounded corners too); returns how far it opens.
  const reveal = (row, side) => {
    row.querySelector(':scope > .row-acts')?.remove();
    shown = actions(row)[side] || [];
    const acts = document.createElement('div');
    acts.className = `row-acts ${side}`;
    acts.innerHTML = shown.map((a, n) => `<button type="button" class="${a.cls || ''}" data-ra="${n}">${a.label}</button>`).join('');
    row.classList.add('swiping');
    const rowBox = row.getBoundingClientRect(), rowStyle = getComputedStyle(row), f = faceOf(row), faceBox = f.getBoundingClientRect(), faceStyle = getComputedStyle(f);
    const top = faceBox.top - rowBox.top - parseFloat(rowStyle.borderTopWidth);
    Object.assign(acts.style, { top: `${top}px`, height: `${faceBox.height}px` });
    if (side === 'left') Object.assign(acts.style, { right: `${rowBox.right - faceBox.right - parseFloat(rowStyle.borderRightWidth)}px`, borderRadius: `0 ${faceStyle.borderTopRightRadius} ${faceStyle.borderBottomRightRadius} 0` });
    else Object.assign(acts.style, { left: `${faceBox.left - rowBox.left - parseFloat(rowStyle.borderLeftWidth)}px`, borderRadius: `${faceStyle.borderTopLeftRadius} 0 0 ${faceStyle.borderBottomLeftRadius}` });
    row.append(acts);
    acts.style.width = 'max-content'; // its buttons' own width: how far it opens
    const wide = Math.min(acts.offsetWidth, faceBox.width);
    acts.style.width = '';
    return wide;
  };
  root.addEventListener('touchstart', ev => {
    closing = false;
    if (openRow && !ev.target.closest('.row-acts')) {
      closing = openRow.contains(ev.target); // on the open row: closing it, not editing it
      shut();
      if (closing) { sw = null; return; }
    }
    const row = ev.target.closest(rows);
    sw = row && root.contains(row) && ev.touches.length === 1 && !ev.target.closest(SKIP) && !document.body.classList.contains('has-select-bar')
      ? { row, x: ev.touches[0].clientX, y: ev.touches[0].clientY, dx: 0, side: null, wide: 0 } : null;
  }, { passive: true });
  root.addEventListener('touchmove', ev => {
    if (!sw) return;
    const dx = ev.touches[0].clientX - sw.x, dy = ev.touches[0].clientY - sw.y;
    if (!sw.side) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } // scrolling the page
      if (Math.abs(dx) < 12) return;
      sw.side = dx < 0 ? 'left' : 'right';
      sw.wide = reveal(sw.row, sw.side);
      if (!sw.wide) { sw.row.classList.remove('swiping'); sw = null; return; } // nothing on that side
    }
    ev.preventDefault(); // the page doesn't scroll while a row is swiped
    const most = sw.wide + 40;
    sw.dx = sw.side === 'left' ? Math.max(-most, Math.min(0, dx)) : Math.min(most, Math.max(0, dx));
    slideTo(sw.row, sw.dx, false);
  }, { passive: false });
  root.addEventListener('touchend', ev => {
    const s = sw;
    sw = null;
    // A swipe, or the touch that closed an open row, isn't also a tap (which would start editing the row).
    if (closing || s?.side) { ev.preventDefault(); quietUntil = Date.now() + 400; }
    if (closing) { closing = false; ev.stopPropagation(); return; }
    if (!s?.side) return;
    ev.stopPropagation(); // the row's swipe, not the page's
    openRow = s.row;
    if (Math.abs(s.dx) > s.wide / 2) slideTo(s.row, s.side === 'left' ? -s.wide : s.wide, true);
    else shut();
  }, { passive: false });
  root.addEventListener('click', ev => {
    const b = ev.target.closest('.row-acts [data-ra]');
    if (!b && Date.now() < quietUntil && ev.target.closest(rows)) { ev.preventDefault(); ev.stopPropagation(); return; }
    if (!b || !root.contains(b)) return;
    ev.stopPropagation();
    const row = b.closest(rows), act = shown?.[Number(b.dataset.ra)];
    shut();
    if (row && act) act.run(row);
  }, true);
}
