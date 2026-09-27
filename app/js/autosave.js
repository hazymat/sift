// A note that saves itself as you type: `trigger()` after every change starts
// (or restarts) a short pause before `save()` runs, so quick typing doesn't
// hit the database on every keystroke; `flush()` runs it right away instead
// (leaving the box, or about to reload), so nothing typed is ever more than
// `delay` away from being saved. Used by every note editor that saves live
// (Brain Dump, Tasks, the Day Planner).
export function debounced(save, delay = 700) {
  let timer = null;
  return {
    trigger() { clearTimeout(timer); timer = setTimeout(save, delay); },
    flush() { clearTimeout(timer); timer = null; return save(); },
  };
}
