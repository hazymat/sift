// What's new: after Reload on "A new version of Sift is ready" (or Settings,
// Check for updates), a sheet lists what changed in every version since the
// one this device had, each with Show me. Settings: Show update info (on unless
// turned off) and What's new (the last update's list again).
//
// Every version bump adds its entry to WHATS_NEW (docs/working-notes.md):
//   'x.y.zz': [{ text, go, open, at, more }]
//   text  one plain line: what changed and where
//   go    the address to go to, e.g. '#/find-things'
//   open  selectors clicked in turn to get there (e.g. open the first box)
//   at    the element that changed: it's scrolled to and pulses
//   more  other places the same change reached, in words (one Show me covers them)
// No `at`: no Show me (a bug fix, a phone gesture).
import * as store from './store.js';
import { VERSION } from './version.js';
import { flash } from './flash.js';
import { toast } from './toast.js';
import { keys } from './keys.js';

const FIRST_BOX = ['#main .box-card[data-box]'];
export const WHATS_NEW = {
  '1.59.02': [{ text: "iPhone, Find Things: Share, 👁 and ⋯ stay on the first line with + New box; the other + New buttons slide sideways.", go: '#/find-things', at: '#main .find-new' }],
  '1.59.01': [{ text: 'Lists: Lists and Templates are underlined tabs at the top instead of plain headings, and + New makes whichever the tab shows.', go: '#/lists', at: '#main #list-tabs' }, { text: "iPhone: Scans' and Contracts' 👁 and ⋯ stay on the first line with Scan or + New, the search under them; Lists' ⋯ stays up too." }],
  '1.59.00': [{ text: "What's new: after an update, this list shows what changed, each with Show me. Turn it off in Settings, Show update info.", go: '#/settings', at: '#main label:has(#show-update-info)' }],
  '1.58.15': [{ text: "Day Planner, Tight spacing: a task's pills stay together beside its name or all under it, no lone 📝 on its own line." }],
  '1.58.14': [{ text: 'Brain Dump: pressing and holding a note selects it without starting text selection, and a chosen note has a clear ring.', go: '#/dump', at: '#main li.thought', more: 'Contacts, Find Things boxes and Recipes cards behave the same.' }],
  '1.58.13': [{ text: 'Brain Dump: a note starting with a link no longer shows part of the link as raw text under its title.' }],
  '1.58.12': [{ text: '"A new version of Sift is ready" now sits above a selection bar, and toasts sit above both.' }],
  '1.58.11': [{ text: 'Day Planner: More no longer covers the time or 📝 pill on a task with a note.' }],
  '1.58.10': [{ text: 'Contacts: Recent, Directory and Cases are underlined tabs, like the filters in Tasks and Brain Dump.', go: '#/contacts', at: '#main .dump-filter-row', more: "Scans' kinds, Contracts' views and Tidied's areas are the same tabs." }],
  '1.58.09': [{ text: 'Day Planner schedule: a task edits as in Tasks. More shows its note and pills, then More (full) opens the full panel.', go: '#/planner', at: '#main #lines' }],
  '1.58.08': [{ text: 'iPhone: typing near the bottom of a long page no longer slides the top off the screen, and the bottom tabs hide while the keyboard is up.' }],
  '1.58.07': [{ text: "Find Things: an open box's lid no longer slides under the search bar or turns darker when scrolling on a phone." }],
  '1.58.06': [{ text: "Day Planner: More on a task goes straight to its full panel, which no longer has start and end times.", go: '#/planner', at: '#main .pile-paper' }],
  '1.58.05': [{ text: 'Find Things: a box\'s Notes example reads "e.g. Clear 9-litre box".' }],
  '1.58.04': [{ text: "Find Things: things in an open box move as tasks do (press, hold and drag, drop onto another to put it inside), and a thing's quantity sits before its name.", go: '#/find-things', open: FIRST_BOX, at: '#main .box-page .item-list' }],
  '1.58.03': [{ text: 'Tasks: the top of the page (+ New, the tabs, 👁 and ⋯) stays in view while scrolling.', go: '#/tasks', at: '#main .tasks-head', more: 'Projects and Contacts do the same.' }],
  '1.58.02': [{ text: "Find Things: an open box keeps its whole lid in view while its things scroll, with + Add note and + Add photo on the lid.", go: '#/find-things', open: FIRST_BOX, at: '#main .box-lid', more: "A project's top (name, progress, + Milestone) stays in view too." }],
  '1.58.01': [{ text: "Find Things: box cards list what's inside as running text, 👁 Spacing makes boxes smaller or bigger, and + Add item is always there.", go: '#/find-things', at: '#main .box-card[data-box]', more: 'The dashed + New box tiles are gone (use + New box at the top), and the whole top of the page stays in view.' }],
  '1.58.00': [{ text: 'Find Things: the ⋯ at the end of the life areas opens one Life areas / groups sheet, groups indented under their life area, moved by holding and dragging.', go: '#/find-things', at: '#main .area-more' }],
  '1.57.09': [{ text: 'Find Things: scrolling a long box keeps the back button, the search and the lid at the top.', go: '#/find-things', open: FIRST_BOX, at: '#main .box-page-bar' }],
  '1.57.08': [{ text: 'Find Things: the line at the top of an open box just says Add, with a faint cube, in line with the things.', go: '#/find-things', open: FIRST_BOX, at: '#main .box-page :has(> #new-items)', more: 'This covers 1.57.06 and 1.57.07 too: the add line moved to the top and became a single line.' }],
  '1.57.05': [{ text: 'Phone: swiping sideways on an open box, list, contact, case, recipe, batch, scan or contract goes back.' }],
  '1.57.04': [{ text: 'Find Things: each box card has its ⠿ in the top left corner (on hover on a computer, always on a phone).', go: '#/find-things', at: '#main .box-card[data-box]', more: 'Contacts cards have it in the same place.' }],
  '1.57.02': [{ text: 'Key hints on buttons (Alt Enter, Ctrl Enter, Esc) sit centred in their pill everywhere.' }],
  '1.57.01': [{ text: "Find Things: the life areas are underlined tabs, like Brain Dump's and Tasks' filters; ← / → switch between them.", go: '#/find-things', at: '#main .find-areas' }],
  '1.57.00': [{ text: "Brain Dump: a note's → Task, Plan it and → Find Things are in its ⋯ menu; with notes chosen (press and hold), the bar's Move ▸ has them for all.", go: '#/dump', at: '#main li.thought .note-more > summary', more: 'Find Things boxes show a ⠿ to choose them.' }],
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => v.split('.').map(Number).reduce((sum, part) => sum * 1000 + part, 0);
// Entries newer than `from`, up to this version, newest first.
const since = from => Object.keys(WHATS_NEW).filter(v => num(v) > num(from) && num(v) <= num(VERSION)).sort((a, b) => num(b) - num(a)).flatMap(v => WHATS_NEW[v].map(entry => ({ version: v, entry })));

// Called just before an update reloads: remember which version this was.
export async function markUpdating() {
  await store.updateDeviceSettings({ whatsnew_from: VERSION });
}

// After the reload: the sheet, once, if there's something to show and it's wanted.
export async function afterUpdate() {
  const device = await store.getDeviceSettings();
  const from = device.whatsnew_from;
  if (!from) return;
  await store.updateDeviceSettings({ whatsnew_from: null, whatsnew_last: from });
  if ((await store.getSettings()).show_update_info === false) return;
  if (since(from).length) showWhatsNew(from);
}

// Settings' What's new: the last update's list again (or the last few versions).
export async function lastWhatsNew() {
  const device = await store.getDeviceSettings();
  const recent = Object.keys(WHATS_NEW).sort((a, b) => num(b) - num(a))[5] || '0.0.0';
  showWhatsNew(device.whatsnew_last && since(device.whatsnew_last).length ? device.whatsnew_last : recent);
}

export function showWhatsNew(from) {
  const rows = since(from);
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet whatsnew-sheet';
  dlg.innerHTML = `<div class="sheet-handle"></div>
    <div class="whatsnew-head"><h2>What's new in Sift ${esc(VERSION)}</h2><button type="button" class="entry-chip close-top" data-act="close">✓ Close${keys('Esc')}</button></div>
    <p class="muted">Since ${esc(from)}. Show me takes you to each change.</p>
    <ul class="whatsnew-list">${rows.map(({ version, entry }, n) => `<li>
      <div class="whatsnew-text">${esc(entry.text)}${entry.more ? `<span class="muted whatsnew-more">${esc(entry.more)}</span>` : ''}<span class="muted whatsnew-v">${esc(version)}</span></div>
      ${entry.at ? `<button type="button" class="pill-act" data-show="${n}">Show me</button>` : ''}</li>`).join('')}</ul>
    <div class="sheet-actions"><button type="button" data-act="dump">Save to Brain Dump</button></div>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', async ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.act === 'close') return dlg.close();
    if (btn.dataset.show) { dlg.close(); return showMe(rows[btn.dataset.show].entry, from); }
    if (btn.dataset.act === 'dump') {
      dlg.close();
      const body = [`What's new in Sift ${VERSION}`, ...rows.map(({ entry }) => `- ${entry.text}${entry.more ? ` ${entry.more}` : ''}`)].join('\n');
      const { addNote } = await import('./views/dump.js');
      const note = await addNote(body);
      if (location.hash.startsWith('#/dump')) dispatchEvent(new Event('sift:refresh'));
      const { pointTo } = await import('./flash.js');
      toast("✓ Saved to Brain Dump", { action: 'Show me', onAction: () => { pointTo('thoughts', note.id); location.hash = '#/dump'; } });
    }
  });
  dlg.showModal();
  if (!matchMedia('(pointer: coarse)').matches) dlg.querySelector('[data-show], [data-act="dump"]')?.focus(); // keys ready on a computer
}

// Wait for something to be drawn (views draw a moment after the address changes).
function drawn(sel, ms = 4000) {
  const until = Date.now() + ms;
  return new Promise(done => {
    const look = () => {
      const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length);
      if (el || Date.now() > until) return done(el || null);
      setTimeout(look, 120);
    };
    look();
  });
}

async function showMe(entry, from) {
  if (entry.go && location.hash !== entry.go) location.hash = entry.go;
  for (const sel of entry.open || []) {
    const el = await drawn(sel);
    if (!el) return toast("Couldn't find it here (there may be nothing to open yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from) });
    el.click();
  }
  let el = await drawn(entry.at);
  await new Promise(done => setTimeout(done, 350));
  if (el && !el.isConnected) el = await drawn(entry.at); // the page drew itself again (Contacts picks its tab)
  if (!el) return toast("Couldn't find it here (there may be nothing to show yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from) });
  flash(el, { pulses: 3 });
  toast('Here it is', { action: "‹ What's new", onAction: () => showWhatsNew(from), ms: 9000 });
}
