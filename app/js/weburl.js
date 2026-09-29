// Web addresses written in text: https://…, www.… or a bare example.com/page.
// They show as links wherever text is shown (notes, steps), and stay ordinary
// text to change. The first click (or tap) on one asks: Open ↗ or Edit text.
// Once you're writing in that text, a click just moves the cursor (Ctrl/⌘ +
// click still opens it). In a text box (a title, a name) the address is found
// where the click put the cursor.
//
//   linkUrls(html)       marks the addresses in HTML's text (never inside its tags)
//   urlAt(text, offset)  the address at that spot in plain text, or ''
//   offerUrlAt(field, x, y)  after a page puts the cursor in a text box itself: asks if (x, y) is on an address

const TLDS = 'com|org|net|io|co|uk|dev|app|ai|gov|edu|info|me|eu|de|fr|nl|ie|es|it|us|ca|au|nz|tv|shop|store|blog|site|online|xyz';
// `chars`: what an address is made of (in HTML, & is written &amp;).
const pattern = chars => new RegExp(String.raw`(^|[^\w@/.&-])((?:https?:\/\/|www\.)(?:${chars})+|[a-z0-9][\w-]*(?:\.[\w-]+)*\.(?:${TLDS})\b(?:\/(?:${chars})*)?)`, 'gi');
const IN_TEXT = pattern(String.raw`[^\s<>"']`);
const IN_HTML = pattern(String.raw`[^\s<&"']|&amp;`);
const trim = url => url.replace(/[.,;:!?)\]]+$/, ''); // "(see example.com)." ends before the ")."

export function linkUrls(html) {
  return String(html ?? '').split(/(<[^>]*>)/).map((part, index) => index % 2 ? part : part.replace(IN_HTML, (whole, before, url) => {
    const bare = trim(url);
    return `${before}<span class="web-url">${bare}</span>${url.slice(bare.length)}`;
  })).join('');
}

export function urlAt(text, offset) {
  for (const found of String(text ?? '').matchAll(IN_TEXT)) {
    const url = trim(found[2]), from = found.index + found[1].length;
    if (offset >= from && offset <= from + url.length) return url;
  }
  return '';
}

// A text box given the cursor by a page's own tap handling (not a click): the address under the finger, if any, is offered too.
export function offerUrlAt(field, pointX, pointY) {
  const spot = document.caretPositionFromPoint?.(pointX, pointY);
  if (!spot || (spot.offsetNode !== field && !field.contains(spot.offsetNode))) return;
  const url = urlAt(field.value, spot.offset);
  if (url) ask(pointX, pointY, url, field, field);
}

const hrefOf = url => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const openUrl = url => window.open(hrefOf(url), '_blank', 'noopener');

// ---------- the Open / Edit text menu ----------

let menu = null;
let passing = false; // a click sent on by Edit text: not asked about again
const close = () => {
  menu?.remove();
  menu = null;
  removeEventListener('pointerdown', outside, true);
  removeEventListener('keydown', escKey, true);
};
const outside = ev => { if (!menu?.contains(ev.target)) close(); };
const escKey = ev => { if (ev.key === 'Escape' && menu) { ev.preventDefault(); ev.stopPropagation(); close(); } };

function ask(pointX, pointY, url, field, target) {
  close();
  menu = document.createElement('div');
  menu.className = 'pill-menu word-menu url-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = '<button type="button" role="menuitem" data-url="open">Open ↗</button><button type="button" role="menuitem" data-url="edit">Edit text</button>';
  (target.closest('dialog[open]') || document.body).append(menu); // in a sheet, inside it (the page behind can't be pressed)
  if (menu.showPopover) { menu.popover = 'manual'; menu.showPopover(); } // on top of everything
  const room = (visualViewport?.height ?? innerHeight) - 8;
  menu.style.left = `${Math.max(8, Math.min(pointX - menu.offsetWidth / 2, document.documentElement.clientWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${pointY + 14 + menu.offsetHeight <= room ? pointY + 14 : Math.max(8, pointY - 14 - menu.offsetHeight)}px`;
  // Pressing the menu doesn't take the cursor out of the text (which would end the editing).
  menu.addEventListener('pointerdown', ev => ev.preventDefault());
  menu.addEventListener('mousedown', ev => ev.preventDefault());
  menu.addEventListener('click', ev => {
    const choice = ev.target.closest('[data-url]');
    if (!choice) return;
    close();
    if (choice.dataset.url === 'open') { if (field) field.blur(); openUrl(url); return; }
    if (field) { if (!field.contains(document.activeElement) && document.activeElement !== field) field.focus(); return; }
    // Shown text: carry on with what the click would have done (usually starting to edit it).
    passing = true;
    try { target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: pointX, clientY: pointY, view: window })); } finally { passing = false; }
  });
  addEventListener('pointerdown', outside, true);
  addEventListener('keydown', escKey, true);
}

const TEXT_BOX = 'textarea, input[type="text"]:not(.search), input:not([type]):not(.search)';
let pressedIn = null; // what had the cursor as this press began
document.addEventListener('pointerdown', () => { pressedIn = document.activeElement; }, true);
document.addEventListener('click', ev => {
  if (passing || ev.button !== 0 || !(ev.target instanceof Element)) return;
  const target = ev.target;
  if (target.closest('.ref, a, button, select, .url-menu')) return;
  let url = '', field = null;
  const shown = target.closest('.web-url');
  // A text box: the one clicked, or the one this press put the cursor in (a row that opens up as its title
  // gets the cursor, e.g. with its pills, can take the click itself).
  const active = document.activeElement;
  const box = target.matches(TEXT_BOX) ? target : active !== pressedIn && active?.matches?.(TEXT_BOX) && target.contains(active) ? active : null;
  if (shown) {
    url = shown.textContent.trim();
    field = shown.closest('[contenteditable="true"]');
  } else if (box && box.selectionStart === box.selectionEnd) {
    url = urlAt(box.value, box.selectionStart);
    field = box;
  }
  if (!url) return;
  if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); ev.stopImmediatePropagation(); openUrl(url); return; }
  if (field && pressedIn && (pressedIn === field || field.contains(pressedIn))) return; // writing in it already: just the cursor
  if (!field) { ev.preventDefault(); ev.stopImmediatePropagation(); } // shown text: its own click waits for Edit text
  ask(ev.clientX, ev.clientY, url, field, target);
}, true);
