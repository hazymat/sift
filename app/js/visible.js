// How much of the window can be seen, for placing menus and lifting things above the keyboard.
// visualViewport shrinks while the on-screen keyboard is up. An iPad can get stuck reporting it tiny
// (24px tall, #499) after Split View or switching apps, until Sift is closed, so it only counts while
// something is being typed in (the keyboard can't be up otherwise).
export function typing() {
  return !!document.activeElement?.closest?.('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select, [contenteditable]:not([contenteditable="false"])');
}
export function visibleHeight() {
  const vv = window.visualViewport;
  return vv && typing() ? vv.height : innerHeight;
}
// The keyboard is up: the visible part is well short of the window, and not just zoomed in.
export function keyboardUp() {
  const vv = window.visualViewport;
  return !!vv && typing() && innerHeight - vv.height > 120 && Math.abs(vv.scale - 1) < .01;
}
