// What's new: after Reload on "A new version of Sift is ready" (or Settings,
// Check for updates), a sheet lists what changed, each with Show me. One update
// (everything published at once) at a time, headed with when it went live;
// ‹ Older and Newer › (or ← / →) step through every update there has been.
// Settings: Show update info (on unless turned off) and What's new (opens on
// the newest update).
//
// Every version bump adds its entry to WHATS_NEW (docs/working-notes.md):
//   'x.y.zz': [{ text, go, open, at, more }]
//   text  one plain line: what changed and where
//   go    the address to go to, e.g. '#/find-things'
//   open  selectors clicked in turn to get there (e.g. open the first box)
//   at    the element that changed: it's scrolled to and pulses
//   more  other places the same change reached, in words (one Show me covers them)
// No `at`: no Show me (a bug fix, a phone gesture).
// PUBLISHED: when each version went live (UTC), filled in by
// tools/published_times.py when publishing; versions with the same time went
// live together and show as one update. None yet: "Not published yet" (the dev page).
import * as store from './store.js';
import { VERSION } from './version.js';
import { flash } from './flash.js';
import { toast } from './toast.js';
import { keys } from './keys.js';

const FIRST_BOX = ['#main .box-card[data-box]'];
export const WHATS_NEW = {
  '1.60.09': [{ text: "Day Planner, Bring items in: ticking calendars on and off keeps the events showing (faded) while they're fetched again, so nothing jumps about." }],
  '1.60.08': [{ text: "Alt+Enter opens a note full screen wherever its ⤢ shows Alt Enter, even when the cursor isn't in the note (a task's name, a button, nowhere); the hint only shows when the key will do that." }],
  '1.60.07': [{ text: 'Pages with attached photos and files redraw a little faster.' }],
  '1.60.06': [{ text: "What's new: each update shows the date and time it went live, and ‹ Older and Newer › (or ← / →) step back and forward through every update there has been.", go: '#/settings', at: '#main [data-act="whats-new"]', more: 'Settings, What\'s new opens on the newest update.' }],
  '1.60.05': [{ text: "Day Planner: ↓ Bring items in gathers what's waiting for the day in one sheet: your tasks, anything unfinished from earlier days and Google Calendar (now from several calendars). The boxes above the schedule are gone; Not today sets anything aside.", go: '#/planner', at: '#main .bring-link', more: "A calendar event goes onto the schedule at its time or into the day's tasks. Connect Google Calendar and choose its calendars in the sheet's Google Calendar tab." }],
  '1.60.04': [{ text: "Day Planner: Esc closes a task's full panel, however it was opened." }],
  '1.60.03': [{ text: 'Day Planner: a task on the schedule has Time and Until in its full panel (More, then More (full)), to set an exact start and end.', go: '#/planner', at: '#main #lines' }],
  '1.60.02': [{ text: "Windows: the key labels on buttons (Alt Enter on a note's ⤢, Ctrl Enter on Save, Esc on ‹ Back and ✓ Close, the selection bar's keys) sit in the middle of the button instead of low.", go: '#/dump', at: '#main button[data-act="save"]', more: "The same fix covers every button that shows its key." }],
  '1.60.01': [{ text: 'Day Planner: typing a new task on the schedule shows More at the right straight away, as in Tasks; it adds the task and shows its note and pills. More now sits in the middle of the line.', go: '#/planner', at: '#main #lines', more: 'The New task line under Tasks shows More too, which adds it and opens its full panel.' }],
  '1.60.00': [{ text: 'Lists: press and hold a list or template card to choose it (then tap more), hold its ⠿ to drag it into place, and opening a list zooms out of its card as Find Things\' boxes do.', go: '#/lists', at: '#main .list-grid', more: 'The Templates tab works the same; shared lists zoom open too.' }],
  '1.59.03': [{ text: "New app icon: a hand sifting golden sand under a rainbow. On an iPhone, remove Sift from the Home Screen and add it again to see it (sync first: removing it clears that copy).", go: '#/settings', at: '#main a[href="about.html"]', more: 'The browser tab and the About and Privacy pages show it too.' }],
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

export const PUBLISHED = {
  '1.60.06': '2026-09-30T11:36:07Z',
  '1.60.05': '2026-09-30T11:36:07Z',
  '1.60.04': '2026-09-30T08:33:37Z',
  '1.60.03': '2026-09-30T08:31:00Z',
  '1.60.02': '2026-09-30T08:28:16Z',
  '1.60.01': '2026-09-30T08:25:57Z',
  '1.60.00': '2026-09-29T23:28:05Z',
  '1.59.03': '2026-09-29T23:23:37Z',
  '1.59.02': '2026-09-29T22:24:12Z',
  '1.59.01': '2026-09-29T22:19:27Z',
  '1.59.00': '2026-09-29T22:17:44Z',
  '1.58.15': '2026-09-29T22:14:31Z',
  '1.58.14': '2026-09-29T22:13:03Z',
  '1.58.13': '2026-09-29T22:11:53Z',
  '1.58.12': '2026-09-29T22:11:04Z',
  '1.58.11': '2026-09-29T22:09:04Z',
  '1.58.10': '2026-09-29T22:04:48Z',
  '1.58.09': '2026-09-29T22:02:55Z',
  '1.58.08': '2026-09-29T22:00:08Z',
  '1.58.07': '2026-09-29T21:55:43Z',
  '1.58.06': '2026-09-29T21:51:27Z',
  '1.58.05': '2026-09-29T21:45:40Z',
  '1.58.04': '2026-09-29T21:45:03Z',
  '1.58.03': '2026-09-29T21:44:04Z',
  '1.58.02': '2026-09-29T21:42:45Z',
  '1.58.01': '2026-09-29T21:41:25Z',
  '1.58.00': '2026-09-29T21:39:18Z',
  '1.57.09': '2026-09-29T21:35:35Z',
  '1.57.08': '2026-09-29T21:31:01Z',
  '1.57.05': '2026-09-29T21:12:53Z',
  '1.57.04': '2026-09-29T21:07:17Z',
  '1.57.02': '2026-09-29T20:21:40Z',
  '1.57.01': '2026-09-29T20:20:08Z',
  '1.57.00': '2026-09-29T20:17:41Z',
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => v.split('.').map(Number).reduce((sum, part) => sum * 1000 + part, 0);
// Entries newer than `from`, up to this version, newest first.
const since = from => Object.keys(WHATS_NEW).filter(v => num(v) > num(from) && num(v) <= num(VERSION)).sort((a, b) => num(b) - num(a)).flatMap(v => WHATS_NEW[v].map(entry => ({ version: v, entry })));
// Every update up to this version, newest first: { at (ISO time, or null: not published yet), versions, rows }.
function updates() {
  const out = [];
  for (const v of Object.keys(WHATS_NEW).filter(x => num(x) <= num(VERSION)).sort((a, b) => num(b) - num(a))) {
    const at = PUBLISHED[v] || null;
    const last = out.at(-1);
    if (last && last.at === at) last.versions.push(v);
    else out.push({ at, versions: [v] });
  }
  for (const u of out) u.rows = u.versions.flatMap(v => WHATS_NEW[v].map(entry => ({ version: v, entry })));
  return out;
}
const whenText = at => (at ? new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not published yet');

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

// Settings' What's new: the newest update, and ‹ Older from there.
export async function lastWhatsNew() {
  const device = await store.getDeviceSettings();
  showWhatsNew(device.whatsnew_last || VERSION);
}

// `from`: the version this device had (how many updates it missed); `page`: which update, 0 the newest.
export function showWhatsNew(from, page = 0) {
  const all = updates();
  if (!all.length) return;
  const missed = all.filter(u => u.versions.some(v => num(v) > num(from))).length;
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet whatsnew-sheet';
  let rows = [];
  const draw = () => {
    const u = all[page];
    rows = u.rows;
    dlg.innerHTML = `<div class="sheet-handle"></div>
    <div class="whatsnew-head"><h2>What's new in Sift</h2><button type="button" class="entry-chip close-top" data-act="close">✓ Close${keys('Esc')}</button></div>
    <div class="whatsnew-nav">
      <button type="button" class="pill-act" data-step="1"${page >= all.length - 1 ? ' disabled' : ''} title="The update before this one">‹ Older</button>
      <span class="whatsnew-when"><b>${esc(whenText(u.at))}</b><span class="muted"> · ${esc(u.versions.length > 1 ? `${u.versions.at(-1)} to ${u.versions[0]}` : u.versions[0])}</span></span>
      <button type="button" class="pill-act" data-step="-1"${page <= 0 ? ' disabled' : ''} title="The update after this one">Newer ›</button>
    </div>
    ${page === 0 && missed > 1 ? `<p class="muted">${missed} updates since you last looked: ‹ Older for the others.</p>` : ''}
    <ul class="whatsnew-list">${rows.map(({ version, entry }, n) => `<li>
      <div class="whatsnew-text">${esc(entry.text)}${entry.more ? `<span class="muted whatsnew-more">${esc(entry.more)}</span>` : ''}${u.versions.length > 1 ? `<span class="muted whatsnew-v">${esc(version)}</span>` : ''}</div>
      ${entry.at ? `<button type="button" class="pill-act" data-show="${n}">Show me</button>` : ''}</li>`).join('')}</ul>
    <div class="sheet-actions"><button type="button" data-act="dump">Save to Brain Dump</button></div>`;
  };
  const step = by => { const next = page + by; if (next < 0 || next >= all.length) return; page = next; draw(); dlg.querySelector(`[data-step="${by}"]:not([disabled])`)?.focus(); };
  draw();
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(-1); }
  });
  dlg.addEventListener('click', async ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.act === 'close') return dlg.close();
    if (btn.dataset.step) return step(Number(btn.dataset.step));
    if (btn.dataset.show) { dlg.close(); return showMe(rows[btn.dataset.show].entry, from, page); }
    if (btn.dataset.act === 'dump') {
      dlg.close();
      const u = all[page];
      const body = [`What's new in Sift (${whenText(u.at)}, ${u.versions[0]})`, ...rows.map(({ entry }) => `- ${entry.text}${entry.more ? ` ${entry.more}` : ''}`)].join('\n');
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

async function showMe(entry, from, page = 0) {
  if (entry.go && location.hash !== entry.go) location.hash = entry.go;
  for (const sel of entry.open || []) {
    const el = await drawn(sel);
    if (!el) return toast("Couldn't find it here (there may be nothing to open yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from, page) });
    el.click();
  }
  let el = await drawn(entry.at);
  await new Promise(done => setTimeout(done, 350));
  if (el && !el.isConnected) el = await drawn(entry.at); // the page drew itself again (Contacts picks its tab)
  if (!el) return toast("Couldn't find it here (there may be nothing to show yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from, page) });
  flash(el, { pulses: 3 });
  toast('Here it is', { action: "‹ What's new", onAction: () => showWhatsNew(from), ms: 9000 });
}
