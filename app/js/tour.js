// The tours: short walks round Sift that have you try things for real. Each step
// dims the page around one thing (or shows a card in the middle), says what
// it's for and, where it can, asks you to try it: the step moves on by itself
// once you have. Keyboard steps show on laptops, tap steps on phones.
// Where it got to is kept on this device, so it carries on from there; ending
// it early leaves the "Take the tour" task (with its ▶ pill) to come back to.
// While a tour runs, Sift is filled with example things (demo.js), cleared away
// when it ends however it ends; the card says so.
// The welcome page (views/welcome.js) is the choice of tours: tasks, notes, the
// Day Planner, and short ones for the rest. Each tour (TOURS below) has its own
// steps, its own place kept, and its own task; finishing one goes back to the choice.
import * as store from './store.js';
import { addTaskFirst, doneFields } from './tasks.js';
import { word } from './words.js';
import { toast, undoable } from './toast.js';
import { closeFull } from './fullnote.js';
import { flash } from './flash.js';
import { seedDemo, clearDemo } from './demo.js';
import { isoDate, addDays } from './days.js';

const KEYS = matchMedia('(hover: hover) and (pointer: fine)').matches; // a mouse, so almost always a keyboard too
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const CTRL = MAC ? '⌘' : 'Ctrl';
// Keys drawn one box each: key('Ctrl', '→') is [Ctrl] + [→]. Arrows are drawn larger.
const key = (...keys) => keys.map(k => `<kbd${/^[←→↑↓]$/.test(k) ? ' class="tour-arrow"' : ''}>${k}</kbd>`).join('<span class="tour-plus">+</span>');

// A step: { id (where the tour carries on from), hash (go there first), at (what
// to point at: the first selector in the list with something showing; none: a
// card in the middle), also (a second thing to outline, e.g. its place in the
// navigation), open (a menu to open while the step shows), title, body, only
// ('keys' or 'touch'), enter (set something up while the step shows; returns
// what undoes it), focus (put the cursor there), done (how trying it is
// noticed: { made: [collections] } something new saved, or { hash } arriving there) }.
// Built when a tour starts, so areas are called what the user calls them. Each
// step says one or two short things; nobody should have to sit through a lecture.
const w = k => `<b>${word(k)}</b>`;
const tap = () => (KEYS ? 'click' : 'tap');
const nav = area => `#topnav-links a[href="#/${area}"], #tabbar a[href="#/${area}"]`;
const try_ = text => `<p class="tour-try">Try it: ${text}</p>`;

const searchStep = () => ({ id: 'search', at: KEYS ? '.top-search, #more-tab' : '#more-tab, .top-search', title: 'Find anything', body: `<p>${KEYS ? `${key(CTRL, 'K')} or ${key('/')}` : 'The box at the top of <b>More</b>'} searches every note, task, contact, list and box, archived ones too.</p>` });

// Tasks and projects.
const tasksSteps = () => [
  { id: 'tasks', hash: '#/tasks/now', at: '#task-entry, #task-body', also: nav('tasks'), focus: '#task-new', title: `${word('list_now')}, ${word('list_next')}, ${word('list_later')}`, done: { made: ['tasks'] },
    body: `<p>Three lists instead of deadlines that nag: now, next, and one day. ${w('list_inbox')} holds anything not sorted yet.</p>
      ${try_(`type a task and ${KEYS ? `press ${key('Enter')}` : 'tap Add'}.`)}` },
  { id: 'task', hash: '#/tasks/now', at: '.task-list > li[data-task]', title: 'Everything about a task', body: `<p><b>More</b> on a task opens its note, energy, time and day. <b>Repeats</b> never pile up: tick one and the next appears on its day.</p>` },
  { id: 'select', hash: '#/tasks/now', at: '.task-list, #task-body', title: 'Move and choose', body: `<p>Hold <b>⠿</b> to move a task; move it sideways to make it a sub-task. ${tap().replace(/^./, c => c.toUpperCase())} ⠿ to choose several, then act on them all from the bar at the bottom.</p>` },
  { id: 'projects', hash: '#/tasks/now', at: '.task-list, #task-body', title: 'Projects', body: `<p><b>Projects</b> at the top: each shows how far along it is, with its own tasks and milestones. Share one with the people working on it.</p>` },
  { id: 'view', hash: '#/tasks/now', at: '#main .view-menu .menu, #main .view-menu', open: '#main .view-menu', title: '👁 Lay it out your way', body: `<p><b>👁</b> on every page: lined paper, a margin, shading, spacing, and which parts show. Try a few; nothing here can break anything.</p>` },
  { id: 'more', hash: '#/tasks/now', at: '#main .page-more .menu, #main .page-more', open: '#main .page-more', title: '⋯ for the rarely needed', body: `<p><b>⋯</b> keeps the odd jobs out of the way: Show Archive, Show Bin, and on some pages import and export.</p>` },
  { id: 'energy', hash: '#/tasks/now', at: '.task-list > li[data-task], #task-body', title: 'Matched to your energy', body: `<p><b>⚡</b> low, <b>⚡⚡</b> medium, <b>⚡⚡⚡</b> high. Tell the ${w('area_planner')} how you feel today and it suggests tasks that fit: gentle ones on a flat day, the big ones on a good day.</p>` },
];

// Brain Dump: for people who write, jot and take notes.
const notesSteps = () => [
  { id: 'dump', hash: '#/dump', at: '.dump-capture', focus: '#dump-body .rich-edit', title: 'Empty your head', done: { made: ['thoughts'] },
    body: `<p>A worry, an idea, a phone number. No title, no folder, nothing to decide first.</p>
      ${try_(KEYS ? `write something, then ${key(CTRL, 'Enter')} or Save.` : 'write something, then Done, then Save.')}` },
  { id: 'becomes', hash: '#/dump', at: '#thoughts > li.thought', title: 'From note to action', done: { made: ['tasks', 'day_items'] },
    body: `<p>A note's <b>⋯</b> turns it into a task, or puts it on your day. The note stays here, linked to what it became.</p>
      ${try_(`${tap()} <b>⋯</b>, then <b>→ Task</b>.`)}` },
  { id: 'kinds', hash: '#/dump', at: '#dump-filter, .dump-filter-row', title: 'Your own categories', body: `<p>Notes can be filed as <b>Idea</b>, <b>Shopping</b> or categories of your own: here, <b>Menus</b>, <b>Home projects</b> and <b>Days out</b>. ${tap().replace(/^./, c => c.toUpperCase())} one to see just those.</p>
      <p><b>⋯</b> at the end of the row adds your own, renames them or puts them in order.</p>` },
  { id: 'kindsheet', hash: '#/dump', at: '.filter-more', title: 'Make your own', body: `<p>${tap().replace(/^./, c => c.toUpperCase())} <b>⋯</b> here to add a category: Recipes to try, Work, Gift ideas, whatever suits you.</p>` },
  { id: 'safe', hash: '#/dump', at: '.dump-capture', title: 'Never lost', body: `<p>Everything is kept as you type it, even a note you hadn't saved when the battery died.</p>` },
  { id: 'undo', hash: '#/dump', at: '#dump-body', only: 'keys', title: 'Undo that remembers yesterday', body: `<p>${key(CTRL, 'Z')} in a note goes back past what you just typed: yesterday's version, last week's, even ones from your other devices.</p>` },
  { id: 'undo', hash: '#/dump', at: '#dump-body', only: 'touch', title: 'Undo that remembers yesterday', body: `<p><b>Aa</b>, then <b>🕘</b>, lists a note's earlier versions: yesterday's, last week's, from any of your devices.</p>` },
  { id: 'look', hash: '#/dump', at: '#main .view-menu .menu, #main .view-menu', open: '#main .view-menu', title: '👁 Look and spacing', body: `<p>Plain notes or <b>Multicolour</b> ones, packed tight or roomy. Try one: nothing here can break anything.</p>` },
  { id: 'rich', hash: '#/dump', at: '#dump-body', title: 'Notes that do things', body: `<p>Type a phone number and it becomes a contact. Paste a screenshot or a PDF and it's attached. Format with the toolbar${KEYS ? `, ${key(CTRL, 'B')}` : ''} or Markdown.</p>` },
  searchStep(),
  { id: 'why', title: 'Why not Apple Notes or Notepad?', body: `<ul><li>Nothing is ever lost, and undo goes back days.</li><li>A line becomes a task or a contact, and stays linked.</li><li>The same notes on every device, readable by nobody else.</li></ul>` },
];

// The Day Planner: for lovers of a real notebook or planner.
const plannerSteps = () => [
  { id: 'paper', hash: '#/planner', at: '.planner .paper', also: nav('planner'), title: 'Your day on paper', body: `<p>Write on a time to plan it. Pick your paper in <b>👁</b>: Notebook, Dot journal, Glass…</p>` },
  { id: 'drag', hash: '#/planner', at: '.planner .pile', title: 'Tasks to times', body: `<p>The day's tasks wait here. Drag one onto a time, then drag its bottom edge to say how long.</p>${KEYS ? '' : '<p>On a phone: tap once to pick it up, then drag.</p>'}` },
  { id: 'bring', hash: '#/planner', at: '.planner .bring-link', title: 'Bring items in', body: `<p>Your task list, anything unfinished from earlier days, and your Google Calendar, all in one calm place instead of cluttering the page.</p>` },
  { id: 'ahead', hash: `#/planner/${addDays(isoDate(), 3)}`, at: '.planner .paper', title: 'Plan ahead', body: `<p>Any day, any week: <b>›</b> goes forward, <b>📅</b> jumps to a date. Here's three days from now, dentist and all.</p>` },
  { id: 'pview', hash: '#/planner', at: '.planner .view-menu .menu, .planner .view-menu', open: '.planner .view-menu', title: '👁 Your kind of paper', body: `<p>Notebook, Dot journal, Glass; quarter, half or whole hours; the plan first or your tasks first. Have a play.</p>` },
  { id: 'focus', hash: '#/planner', at: '.planner .focus-row', title: 'Plan around how you feel', body: `<p><b>Day focus</b>: the one thing that matters. <b>Energy</b>: how you feel, so it suggests tasks that fit.</p>` },
  { id: 'daynotes', hash: '#/planner', at: '.planner .day-notes', title: 'A diary without trying', body: `<p>Who rang, what happened, what to remember. Written as you go, the day's notes become a journal.</p>` },
  { id: 'share', hash: '#/planner', at: '.planner .share-menu', title: 'Share your day', body: `<p>Copy it into WhatsApp for the school run, or share your day, week or whole diary with someone who uses Sift.</p>` },
];

// The mini-tours.
const recipesSteps = () => [
  { id: 'recipes', hash: '#/recipes', at: '.bb-sections-bar, .bb-head, #main', also: nav('recipes'), title: 'Your Recipe Archive', body: `<p>Your recipes, with photos, in books you name (here, <b>Pizza</b> and <b>Breakfasts</b>). <b>{salt}</b> in a step shows its amount, and scales with the recipe. <b>🧪 Make this</b> starts a batch, with <b>🛒 Add to list</b> for anything you're out of.</p>` },
];
const listsSteps = () => [
  { id: 'lists', hash: '#/lists', at: '.lists-head, #main', also: nav('lists'), title: `${word('area_lists')}, shared`, body: `<p>Shopping, packing, the swimming bag. Make a <b>template</b> once and start a fresh list from it each time. <b>👥 Share</b> it, and the milk only gets bought once.</p>` },
];
const placesSteps = () => [
  { id: 'places', hash: '#/find-things', at: '#find-grid .find-bar, #main', also: nav('find-things'), title: `${word('area_places')}: for a leaky memory`, body: `<p>Where things are kept: the loft, box 4, the drawer in the hall. Photos of what's inside, and search in every box: where did we put the passports?</p>` },
];
const filingSteps = () => [
  { id: 'scans', hash: '#/scans', at: '.scans .scans-head, #main', title: 'Your digital filing cabinet', body: `<p>${w('area_scans')}: photograph a letter, a receipt or an ID card, and find it again in seconds. Expiry dates show when they're coming up.</p>` },
  { id: 'contracts', hash: '#/contracts', at: '.contracts-head, #main', title: word('area_contracts'), body: `<p>Phone, insurance, energy: renewal dates, costs and notice periods, so nothing rolls over by surprise.</p>` },
  { id: 'contacts', hash: '#/contacts', at: '.c-capture, #c-tabs, #main', title: word('area_contacts'), body: `<p>Keep the people worth keeping. A number you only need for a week goes in <b>Recent</b> and quietly sinks away.</p>` },
  { id: 'cases', hash: '#/contacts', at: '#c-tabs, #main', title: 'Cases', body: `<p>A complaint, a claim, a repair: every call, letter and task about it in one timeline.</p>` },
  searchStep(),
  { id: 'tidied', hash: '#/bin', at: '#bin-tabs, #main', title: 'Nothing lost by tidying', body: `<p><b>Archive</b> what you're done with: it's out of the way in ${w('area_bin')}, and search still finds it.</p>` },
];
const yoursSteps = () => [
  { id: 'themes', hash: '#/settings', at: '#theme, #appearance-card', title: 'Themes', body: `<p>Glass, Dark, Light, or with handwriting. Or <b>Custom</b>: press anything on the sample page to change its colour or font.</p>` },
  { id: 'words', hash: '#/settings', at: '#words-card, #appearance-card', title: 'Your words', body: `<p>Rename anything: call ${w('area_dump')} "Inbox", or ${w('area_tasks')} "Jobs".</p>` },
  { id: 'sync', hash: '#/settings', at: '#sync-card, #main', title: 'On all your devices', body: `<p><b>Sync</b> keeps your phone and laptop in step. Everything is encrypted first, so only your devices can read it.</p>` },
  { id: 'keys', only: 'keys', title: 'Hands on the keyboard', body: `<table class="tour-keys">
      <tr><td>${key(CTRL, '←')} ${key(CTRL, '→')}</td><td>the area before or after</td></tr>
      <tr><td>${key('←')} ${key('→')}</td><td>the page's tabs, or the ${word('area_planner')}'s days</td></tr>
      <tr><td>${key('Esc')}</td><td>step back out, keeping what you wrote</td></tr>
      <tr><td>${key(CTRL, 'K')}</td><td>search everything</td></tr>
    </table><p>Point at a button to see its key.</p>` },
];

// Each tour: the name of its task (when it's left for later), and its steps.
// 'new' is the choice of tours itself (the welcome page): its task opens that.
const TOURS = {
  new: { title: 'Take the tour of Sift', steps: () => [] },
  tasks: { title: 'Tour: tasks and projects', steps: tasksSteps },
  notes: { title: 'Tour: writing things down', steps: notesSteps },
  planner: { title: 'Tour: the Day Planner', steps: plannerSteps },
  recipes: { title: 'Tour: your recipe archive', steps: recipesSteps },
  lists: { title: 'Tour: lists', steps: listsSteps },
  places: { title: 'Tour: finding things', steps: placesSteps },
  filing: { title: 'Tour: your digital filing cabinet', steps: filingSteps },
  yours: { title: 'Tour: making Sift yours', steps: yoursSteps },
};
const forThisDevice = which => (TOURS[which]?.steps() || []).filter(s => !s.only || (s.only === 'keys') === KEYS);
export const tourLength = which => forThisDevice(which).length;
// Tours finished on this device (the choice shows them with a ✓).
export const toursSeen = async () => (await store.getDeviceSettings()).tours_seen || {};
// Which tour a task starts (tasks made before there were several say true: the new user tour).
export const tourOf = task => (task?.tour === true ? 'new' : task?.tour) || null;

// Where each tour got to on this device: { tour: step id }.
const placeKept = async which => (await store.getDeviceSettings()).tour_at?.[which] || null;
async function keepPlace(which, id) {
  const at = Object.assign({}, (await store.getDeviceSettings()).tour_at, { [which]: id });
  await store.updateDeviceSettings({ tour_at: at });
}

// What a step points at: the first selector in its list with something showing.
function find(list) {
  for (const sel of list.split(',')) {
    const el = Array.from(document.querySelectorAll(sel)).find(e => e.getClientRects().length);
    if (el) return el;
  }
  return null;
}

// Where a tour got to on this device: { n, total }, or null (not started, or finished).
export async function progress(which = 'new') {
  const all = forThisDevice(which);
  const kept = await placeKept(which);
  const n = all.findIndex(s => s.id === kept);
  return n > 0 ? { n, total: all.length } : null;
}
export const resetTour = (which = 'new') => keepPlace(which, null);
// Every tour from the beginning again, none marked as seen.
export const resetTours = () => store.updateDeviceSettings({ tour_at: {}, tours_seen: {} });

// The "Take the tour" task (made if there isn't one, put back on the list if it
// was ticked or moved), shown on Tasks → Now with its outline pulsing so it can be found.
export async function showTourTask(which = 'new') {
  let task = (await store.list('tasks')).find(t => tourOf(t) === which);
  if (!task) task = await addTaskFirst({ title: TOURS[which].title, notes: which === 'new' ? '▶ Pick a tour whenever you like.' : '▶ Start the tour whenever you like; it carries on where you left it.', horizon: 'now', tour: which });
  else if (task.done_at || task.horizon !== 'now' || task.archived_at) await store.update('tasks', task.id, Object.assign(doneFields(false), { horizon: 'now', archived_at: null }));
  if (location.hash === '#/tasks/now') dispatchEvent(new Event('sift:refresh')); // already there (ended during the Tasks tour): drawn again with it
  else location.hash = '#/tasks/now';
  for (let tries = 0; tries < 40; tries++) {
    const el = document.querySelector(`#main li[data-task="${task.id}"]`);
    if (el) { flash(el); break; }
    await new Promise(ok => setTimeout(ok, 100));
  }
  toast(`The tour waits on your ${word('list_now')} list: ▶ Start the tour carries on where you left it`, { ms: 6000 });
}

let tour = null; // the tour running: { n, end }

export async function startTour({ which = 'new', fromStart = false } = {}) {
  await tour?.end();
  await seedDemo();
  dispatchEvent(new Event('sift:refresh'));
  const all = forThisDevice(which);
  const kept = fromStart ? null : await placeKept(which);
  const saved = all.findIndex(s => s.id === kept);
  const ring = Object.assign(document.createElement('div'), { className: 'tour-ring' });
  const also = Object.assign(document.createElement('div'), { className: 'tour-ring tour-also' });
  const card = Object.assign(document.createElement('div'), { className: 'tour-card' });
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Tour of Sift');
  document.body.append(ring, also, card);
  document.documentElement.classList.add('touring');
  let target = null, extra = null, step = null, opened = null, raf = 0, stopWaiting = () => {};
  const t = tour = { n: 0 };
  const current = n => t === tour && t.n === n;
  // Scrolling to what a step points at leaves it clear of the top bar (and a phone's bottom bar).
  const bar = sel => { const b = document.querySelector(sel); return b?.getClientRects().length ? b.getBoundingClientRect() : null; };
  const topEdge = bar('.appbar')?.bottom || 0;
  const bottomEdge = Math.min(innerHeight, bar('#tabbar')?.top ?? innerHeight);
  const root = document.documentElement.style;
  root.scrollPaddingTop = `${topEdge + 12}px`;
  root.scrollPaddingBottom = `${innerHeight - bottomEdge + 12}px`;
  const shown = el => (el?.isConnected && el.getClientRects().length ? el.getBoundingClientRect() : null);
  const fit = (el, r) => Object.assign(el.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });

  // The ring follows what it points at (pages scroll, panels open, a page drawn
  // again finds it afresh); with nothing to point at the whole page dims.
  const place = () => {
    raf = requestAnimationFrame(place);
    if (step?.at && !target?.isConnected) target = find(step.at);
    if (step?.also && !extra?.isConnected) extra = find(step.also);
    const r = shown(target), x = shown(extra);
    ring.classList.toggle('whole', !r);
    fit(ring, r || { left: 6, top: 6, width: innerWidth - 12, height: innerHeight - 12 });
    also.hidden = !x;
    if (x) fit(also, x);
    // The card: under what it points at, or over it, or beside it; when none of
    // those fits, in the bottom corner, away from the top of it (where its heading usually is).
    const ch = card.offsetHeight, cw = card.offsetWidth, gap = 14;
    let top, left = r ? Math.min(Math.max(12, r.left), innerWidth - cw - 12) : (innerWidth - cw) / 2;
    const beside = r && Math.min(Math.max(12, r.top), innerHeight - ch - 12);
    if (!r) top = (innerHeight - ch) / 2;
    else if (r.bottom + gap + ch < innerHeight - 8) top = r.bottom + gap;
    else if (r.top - gap - ch > 8) top = r.top - gap - ch;
    else if (r.left - gap - cw > 8) { top = beside; left = r.left - gap - cw; }
    else if (r.right + gap + cw < innerWidth - 8) { top = beside; left = r.right + gap; }
    else { top = innerHeight - ch - 12; left = innerWidth - cw - 12; }
    card.style.top = `${Math.round(Math.max(12, top))}px`;
    card.style.left = `${Math.round(Math.max(12, left))}px`;
  };

  let undoEnter = null; // what the step's enter() set up, undone when it's left
  const shut = () => { if (opened) { opened.open = false; opened = null; } undoEnter?.(); undoEnter = null; };
  async function show(n) {
    stopWaiting();
    shut();
    t.n = n;
    step = all[n];
    keepPlace(which, step.id); // carried on from here next time
    const last = n === all.length - 1;
    if (step.hash && !location.hash.startsWith(step.hash)) location.hash = step.hash;
    target = extra = null;
    if (step.enter) { for (let tries = 0; tries < 40 && current(n) && !(undoEnter = step.enter()); tries++) await new Promise(ok => setTimeout(ok, 75)); } // (once the page is drawn)
    const k = letter => (KEYS ? ` <kbd>${letter}</kbd>` : '');
    const demoNote = n === 0 ? '<p class="tour-demo-note">🧪 We\'ve filled Sift with example things so there\'s something to see. They\'re all cleared away when the tour ends; anything you make yourself stays.</p>' : '';
    card.innerHTML = `<div class="tour-head"><span class="tour-count">${n + 1} of ${all.length}</span><span class="tour-demo" title="Example things fill Sift during the tour; they're cleared away when it ends">🧪 Example data</span><button type="button" class="tour-x" data-tour="later" aria-label="End the tour early" title="End the tour early: it waits on your task list">✕</button></div>
      <h3>${step.title}</h3><div class="tour-body">${demoNote}${step.body}</div>
      <div class="tour-foot">${n ? `<button type="button" data-tour="back">Back${k('B')}</button>` : ''}
        <button type="button" data-tour="later" class="tour-later">End tour early</button><span class="spacer"></span>
        ${step.done ? `<button type="button" data-tour="next">Skip${k('N')}</button>` : `<button type="button" class="primary" data-tour="next">${last ? 'Finish' : 'Next'}${k('N')}</button>`}</div>`;
    // What it points at may take a moment to be drawn (the page changing, a toolbar showing once the note is in use).
    for (let tries = 0; tries < 40 && current(n); tries++) {
      // (Not on a phone: the cursor in a note opens it full screen, with the keyboard. That's left to a tap.)
      if (step.focus && KEYS) { const f = document.querySelector(step.focus); if (f && document.activeElement !== f) f.focus(); }
      if (step.open && !opened) { opened = find(step.open); if (opened) opened.open = true; }
      target = step.at ? find(step.at) : null;
      if (!step.at || target) break;
      await new Promise(ok => setTimeout(ok, 75));
    }
    if (!current(n)) return;
    if (target) {
      // In view, with room for the card beside it: to the top when both fit on the screen, otherwise just into view.
      const r = target.getBoundingClientRect(), room = card.offsetHeight + 40;
      const clear = r.top >= topEdge && r.bottom <= bottomEdge;
      const cardFits = bottomEdge - r.bottom > room || r.top - topEdge > room;
      if (!clear || !cardFits) target.scrollIntoView({ block: r.height + room < bottomEdge - topEdge ? 'start' : 'nearest', behavior: 'smooth' });
    }
    if (!step.focus || !KEYS) card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
    if (!step.done) return;
    const stop = await waitFor(step.done, () => { if (current(n)) tried(n); });
    if (current(n)) stopWaiting = stop; else stop(); // moved on while it was being set up
  }
  // Tried it: a tick, then on to the next step. (On a phone, saving a note puts
  // the cursor back in an empty New note, full screen: that's closed, so the tour shows again.)
  function tried(n) {
    stopWaiting();
    card.querySelector('.tour-foot').innerHTML = '<span class="tour-nice">✓ That\'s it</span>';
    setTimeout(() => {
      if (!current(n)) return;
      const full = document.querySelector('.rich.is-full .rich-edit');
      if (full && !full.textContent.trim()) closeFull();
      show(n + 1);
    }, 1100);
  }
  const act = what => {
    if (what === 'back' && t.n > 0) show(t.n - 1);
    else if (what === 'next') t.n === all.length - 1 ? finish() : show(t.n + 1);
    else if (what === 'later') t.end().then(() => showTourTask(which));
  };
  card.addEventListener('click', e => act(e.target.closest('[data-tour]')?.dataset.tour));
  // N for Next and B for Back (not while typing); Esc on the card ends the tour early.
  const onKey = e => {
    if (e.key === 'Escape' && card.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); act('later'); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const what = { n: 'next', b: 'back' }[e.key.toLowerCase()];
    if (!what || card.querySelector('.tour-nice')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    act(what);
  };
  addEventListener('keydown', onKey, true);

  t.end = async () => {
    stopWaiting();
    shut();
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true);
    ring.remove();
    also.remove();
    card.remove();
    document.documentElement.classList.remove('touring');
    root.scrollPaddingTop = root.scrollPaddingBottom = '';
    if (tour === t) tour = null;
    if (await clearDemo()) dispatchEvent(new Event('sift:refresh')); // the examples go, the page drawn without them
  };
  // Finished: next time from the beginning, marked as seen, back to the choice of
  // tours, and its task (and "Take the tour of Sift") ticked off.
  async function finish() {
    await t.end();
    await resetTour(which);
    await store.updateDeviceSettings({ tours_seen: Object.assign({}, await toursSeen(), { [which]: true }) });
    location.hash = '#/welcome';
    const open = (await store.list('tasks')).filter(task => (tourOf(task) === which || tourOf(task) === 'new') && !task.done_at);
    if (!open.length) return toast('✓ Tour finished. Pick another, or just start using Sift');
    for (const task of open) await store.update('tasks', task.id, doneFields(true));
    undoable(`Ticked off: ${open.map(task => task.title).join(', ')}`, async () => { for (const task of open) await store.update('tasks', task.id, doneFields(false)); });
  }
  raf = requestAnimationFrame(place);
  show(Math.max(0, saved));
}

// Watches for a step being tried; returns how to stop watching.
async function waitFor(done, then) {
  if (done.made) {
    const had = new Set();
    for (const c of done.made) for (const r of await store.list(c)) had.add(r.id);
    return store.subscribe(change => { if (done.made.includes(change?.collection) && !change.deleted && !had.has(change.id)) then(); });
  }
  const check = () => { if (location.hash.startsWith(done.hash)) then(); };
  addEventListener('hashchange', check);
  return () => removeEventListener('hashchange', check);
}
