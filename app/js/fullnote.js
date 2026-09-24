// A note editor filling the screen, for a calmer, more native feel on phones.
//
// On a phone, tapping into any note opens it like this: the note fills the
// screen and nothing scrolls behind it, "Done" is at the top, and the
// formatting toolbar sits just above the keyboard. Done (or leaving the note)
// zooms it back into its place on the page. On a laptop the ⤢ button on the
// toolbar does the same, for when you want to focus on one note.
//
// The editor isn't moved in the page (the view that owns it keeps working as
// before, including saving when you leave it); it is just shown fixed on top.
// Following the visible part of the screen (visualViewport) also stops iPhone
// drawing the note's shading out of line with its text when the keyboard
// scrolls the page.

export const PHONE = matchMedia('(pointer: coarse) and (max-width: 760px)');

let current = null; // { box, follow, done }

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

export function isFull(box) { return current?.box === box; }

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
  box.classList.add('is-full');
  document.documentElement.classList.add('note-full');
  current = { box };
  follow();
  window.visualViewport?.addEventListener('resize', follow);
  window.visualViewport?.addEventListener('scroll', follow);
  box.animate?.([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
}

// Done: a little zoom out, then the note is back in its place. `blur` also
// takes the cursor out of it (so the page saves it the usual way).
export function closeFull({ animate = true, blur = true } = {}) {
  if (!current) return;
  const { box } = current;
  current = null;
  window.visualViewport?.removeEventListener('resize', follow);
  window.visualViewport?.removeEventListener('scroll', follow);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    box.classList.remove('is-full');
    box.style.top = '';
    box.style.height = '';
    document.documentElement.classList.remove('note-full');
    if (blur && box.contains(document.activeElement)) document.activeElement.blur();
  };
  if (!animate || !box.animate || !box.isConnected) { finish(); return; }
  const a = box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], { duration: 170, easing: 'ease-in' });
  a.onfinish = finish;
  a.oncancel = finish;
  setTimeout(finish, 260); // in case the animation never runs (a hidden page)
}
