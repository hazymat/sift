// Help hints: small callouts at various places in the app, each with a ✕ that dismisses it for good.
// Settings has Reset and show all, and Hide all. Settings' own explanations aren't hints: they always show.
//
//   hintHtml(id, html, cls)  a hint for a page's HTML, or nothing once it's dismissed; id is its own, for good
//   installHints(settings)   once, in app.js: wires the ✕ and follows other devices
//   resetHints() / hideHints()   Settings' two buttons
//
// Kept in the synced settings: show_hints, and hint_off:<id> for each one dismissed, so two
// devices dismissing different hints both count.

import * as store from './store.js';
import { toast } from './toast.js';

const PREFIX = 'hint_off:';
let off = new Set();
const follow = settings => {
  off = new Set(Object.keys(settings).filter(k => k.startsWith(PREFIX) && settings[k]).map(k => k.slice(PREFIX.length)));
  document.documentElement.classList.toggle('show-hints', !!settings.show_hints);
  for (const el of document.querySelectorAll('[data-hint]')) if (off.has(el.dataset.hint)) el.remove();
};

export function hintHtml(id, html, cls = '') {
  if (off.has(id)) return '';
  return `<div class="hint hint-callout${cls ? ` ${cls}` : ''}" data-hint="${id}"><span class="hint-bulb" aria-hidden="true">💡</span><div class="hint-words">${html}</div><button type="button" class="hint-x" data-hint-x title="Dismiss this hint for good" aria-label="Dismiss this hint for good">✕</button></div>`;
}

export function installHints(settings) {
  follow(settings);
  store.subscribe(change => { if (change?.collection === 'settings') store.getSettings().then(follow); });
  // Before the page's own handlers: pressing it mustn't take the cursor out of a line being typed in, or count as a press on what's behind it.
  document.addEventListener('mousedown', ev => { if (ev.target.closest?.('[data-hint-x]')) ev.preventDefault(); }, true);
  document.addEventListener('click', ev => {
    const x = ev.target.closest?.('[data-hint-x]');
    if (!x) return;
    ev.preventDefault();
    ev.stopPropagation();
    const el = x.closest('[data-hint]');
    off.add(el.dataset.hint);
    store.updateSettings({ [PREFIX + el.dataset.hint]: true });
    el.classList.add('hint-going');
    setTimeout(() => el.remove(), 180);
    toast('Hint dismissed. Settings can bring them all back.');
  }, true);
}

export async function resetHints() {
  const settings = await store.getSettings();
  const cleared = Object.fromEntries(Object.keys(settings).filter(k => k.startsWith(PREFIX)).map(k => [k, null]));
  off = new Set();
  await store.updateSettings({ ...cleared, show_hints: true });
}

export async function hideHints() {
  await store.updateSettings({ show_hints: false });
}
