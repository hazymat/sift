// A note editor filling the screen, for a calmer, more native feel on phones.
//
// On a phone, tapping into any note opens it like this: the note fills the
// screen and nothing scrolls behind it, "Done" is at the top, and the
// formatting toolbar sits just above the keyboard. Only Done (or Esc) closes
// it: taps outside it and putting the keyboard away don't. On a laptop the ⤢
// button on the toolbar does the same, for when you want to focus on one note.
//
// The editor isn't moved in the page (the view that owns it keeps working as
// before); it is just shown fixed on top. While it's open, the cursor leaving
// the note is kept from the page (so the page doesn't finish editing and
// redraw it away); on Done the page gets its usual "left the note" and saves.
// Following the visible part of the screen (visualViewport) also stops iPhone
// drawing the note out of line when the keyboard scrolls the page.

export const PHONE = matchMedia('(pointer: coarse) and (max-width: 760px)');

let current = null; // { box, backdrop, left: element the cursor left, or null }

function follow() {
  if (!current) return;
  const vv = window.visualViewport;
  const s = current.box.style;
  if (vv) {
    s.top = `${vv.offsetTop}px`;
    s.height = `${vv.height}px`;
  } else {
    s.top = '0px';
    s.height = `${innerHeight}px`;
  }
}

// The cursor leaving a full-screen note: the page isn't told (yet).
function holdFocusOut(ev) {
  if (!current?.box.contains(ev.target)) return;
  if (ev.relatedTarget && current.box.contains(ev.relatedTarget)) return;
  ev.stopImmediatePropagation();
  current.left = ev.target;
}

export function isFull(box) { return current?.box === box; }

export function setFullLabel(box, label) {
  if (current?.box !== box) return;
  const el = box.querySelector(':scope > .note-full-head .note-full-label');
  if (el && el.textContent !== label) el.textContent = label;
}

export function openFull(box, { label = 'Note' } = {}) {
  if (current?.box === box) return;
  if (current) closeFull({ animate: false });
  let head = box.querySelector(':scope > .note-full-head');
  if (!head) {
    head = document.createElement('div');
    head.className = 'note-full-head';
    head.innerHTML = '<span class="note-full-label"></span><button type="button" class="primary note-full-done">Done</button>';
    box.prepend(head);
  }
  head.querySelector('.note-full-label').textContent = label;
  // Behind the note: catches taps so nothing on the page reacts to them.
  const backdrop = document.createElement('div');
  backdrop.className = 'note-full-backdrop';
  backdrop.addEventListener('pointerdown', ev => ev.preventDefault());
  document.body.append(backdrop);
  box.classList.add('is-full');
  document.documentElement.classList.add('note-full');
  current = { box, backdrop, left: null };
  addEventListener('focusout', holdFocusOut, true);
  follow();
  window.visualViewport?.addEventListener('resize', follow);
  window.visualViewport?.addEventListener('scroll', follow);
  box.animate?.([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
}

// Done: a little zoom out, then the note is back in its place. `blur` also
// takes the cursor out of it (so the page saves it the usual way).
export function closeFull({ animate = true, blur = true } = {}) {
  if (!current) return;
  const { box, backdrop, left } = current;
  current = null;
  removeEventListener('focusout', holdFocusOut, true);
  window.visualViewport?.removeEventListener('resize', follow);
  window.visualViewport?.removeEventListener('scroll', follow);
  backdrop.remove();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    box.classList.remove('is-full');
    box.style.top = '';
    box.style.height = '';
    document.documentElement.classList.remove('note-full');
    if (!blur) return;
    if (box.contains(document.activeElement)) document.activeElement.blur();
    // The cursor had already left (keyboard put away): tell the page now.
    else if (left?.isConnected) left.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  };
  if (!animate || !box.animate || !box.isConnected) { finish(); return; }
  const a = box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], { duration: 170, easing: 'ease-in' });
  a.onfinish = finish;
  a.oncancel = finish;
  setTimeout(finish, 260); // in case the animation never runs (a hidden page)
}
