// The page slides sideways, as a phone's own screens do: the old page out and
// the next one in over it from the side (View Transitions: iOS 18 on, and
// Chrome; before that the next one just slides in). Used for side swipes on a
// phone (app.js) and for Brain Dump's filters. The bars stay put (app.css).
//
//   slide(forward, change)  change(): makes the change and resolves once it's
//                           drawn, or rejects when there was nothing to change
//                           to (then the page gives a nudge instead)
//   drawnAfter(fn)          runs fn, then resolves once #main has been drawn
//                           again, or rejects if nothing changed
//   nudge(forward)          a small push that goes nowhere: "nothing that way"

const main = () => document.getElementById('main');
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function drawnAfter(fn) {
  const el = main();
  return new Promise((done, none) => {
    let changed = false, over = false, quiet = 0;
    const finish = () => { if (over) return; over = true; seen.disconnect(); changed ? done() : none(); };
    const seen = new MutationObserver(() => { changed = true; clearTimeout(quiet); quiet = setTimeout(finish, 30); });
    seen.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
    fn();
    quiet = setTimeout(finish, 120);
    setTimeout(finish, 600);
  });
}

export function nudge(forward) {
  if (still()) return;
  main().animate([{ transform: 'none' }, { transform: `translateX(${forward ? -24 : 24}px)` }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
}

export function slide(forward, change) {
  if (still()) return Promise.resolve(change()).catch(() => {});
  if (document.startViewTransition) {
    const root = document.documentElement;
    root.dataset.slide = forward ? 'next' : 'back'; // app.css: which way the snapshots go
    const moving = document.startViewTransition(change);
    moving.updateCallbackDone.catch(() => nudge(forward));
    moving.ready.catch(() => {}); // nothing to go to: skipped, which isn't an error
    const after = () => { delete root.dataset.slide; };
    return moving.finished.then(after, after);
  }
  return Promise.resolve(change()).then(
    () => { main().animate([{ transform: `translateX(${forward ? 40 : -40}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' }); },
    () => nudge(forward));
}
