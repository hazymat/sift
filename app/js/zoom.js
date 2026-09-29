// A card opening into its page and closing back into it (Find Things' boxes, Lists' cards).
// The card and the page share one view-transition-name for the change, so the card grows
// into the page and the page shrinks back into its card (app.css: box-zoom). Where the
// browser has no view transitions, the change just happens. With "reduce motion" on,
// the zoom still runs, a little quicker.

export const ZOOM = 'box-zoom';

export async function zoom(update) {
  if (!document.startViewTransition) return update();
  const t = document.startViewTransition(update);
  await t.finished.catch(() => {});
}
