// "Here it is": after following a link to an item in a list (a task from a
// note, the note a task came from, …), that item's outline pulses yellow five
// times, then stops. One look, used everywhere.
//
//   pointTo(collection, id)   before changing page: which item to show
//   flash(el, { scroll })     pulse an element now (and scroll it into view,
//                             unless scroll: false)
//
// installFlash() (from app.js) watches for the item to appear after the page
// changes, since views draw a moment after the address changes.

const KEY = 'sift:focus';
const PULSE_MS = 700;
const PULSES = 5;

// Where each kind of item is drawn.
const FIND = {
  tasks: id => `#main li[data-task="${id}"]`,
  thoughts: id => `#main li.thought[data-id="${id}"]`,
  capture: () => '#main .dump-capture', // the New note box (a note not saved yet)
  day_items: id => `#main .line[data-item="${id}"]`,
  items: id => `#main li[data-item="${id}"]`,
  list_items: id => `#main .checklist li[data-id="${id}"]`,
  contacts: id => `#main [data-contact-card="${id}"], #main .c-page[data-contact="${id}"]`,
};

export function flash(el, { scroll = true } = {}) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // restart the animation
  el.classList.add('flash');
  if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  clearTimeout(el._flashT);
  el._flashT = setTimeout(() => el.classList.remove('flash'), PULSE_MS * PULSES + 100);
}

export function pointTo(collection, id) {
  try { sessionStorage.setItem(KEY, `${collection}:${id}`); } catch { /* the page still opens */ }
  lookSoon();
}

let timer = null;
function lookSoon() {
  clearInterval(timer);
  const until = Date.now() + 4000;
  timer = setInterval(() => {
    let want;
    try { want = sessionStorage.getItem(KEY); } catch { want = null; }
    if (!want || Date.now() > until) { clearInterval(timer); if (want) try { sessionStorage.removeItem(KEY); } catch { /* fine */ } return; }
    const at = want.indexOf(':');
    const find = FIND[want.slice(0, at)];
    const el = find && document.querySelector(find(CSS.escape(want.slice(at + 1))));
    if (!find) { try { sessionStorage.removeItem(KEY); } catch { /* fine */ } return; }
    if (!el) return;
    try { sessionStorage.removeItem(KEY); } catch { /* fine */ }
    clearInterval(timer);
    flash(el);
  }, 150);
}

export function installFlash() {
  addEventListener('hashchange', lookSoon);
  lookSoon();
}
