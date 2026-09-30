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
import { layoutOn, densityOf } from './viewcog.js';

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
// A task on the page picked out while a step shows (a class on its row; the step's at: points at it).
const markTask = (match, cls) => () => {
  const li = [...document.querySelectorAll('#main .task-list > li[data-task]')].find(l => match(l.querySelector('.task-title')?.value || ''));
  if (!li) return null;
  li.classList.add(cls);
  return () => li.classList.remove(cls);
};
const Tap = () => (KEYS ? 'Click' : 'Tap');
const green = label => `<span class="tour-green">${label}</span>`;

// Tasks: capture first, sort later (the Getting Things Done way), then what a task can do.
const tasksSteps = () => [
  { id: 'add', hash: '#/tasks/inbox', at: '#task-entry, #task-body', also: nav('tasks'), focus: '#task-new', title: 'Add a task', done: { made: ['tasks'] },
    body: `<p>Anything you need to do. Don't worry where it goes yet.</p>${try_(`type it and ${KEYS ? `press ${key('Enter')}` : 'tap Add'}.`)}` },
  { id: 'tabs', hash: '#/tasks/inbox', at: '#task-views', title: `${word('list_inbox')}, ${word('list_now')}, ${word('list_next')}, ${word('list_later')}`,
    body: `<p><b>${word('list_inbox')}</b> is where tasks land when you can't be bothered to sort them yet: yours is there now.</p>
      <p><b>${word('list_now')}</b>, <b>${word('list_next')}</b> and <b>${word('list_later')}</b> group them by how soon they matter.</p>` },
  { id: 'capture', hash: '#/tasks/inbox', at: '#main .task-list, #task-body', title: 'Empty your head first, sort it later',
    body: `<p>"Your mind is for having ideas, not holding them," says David Allen, who wrote <i>Getting Things Done</i>.</p>
      <p>So get everything down here as it comes, without deciding anything. Then, now and again, go through the pile one at a time: do it there and then if it takes two minutes, bin it if it doesn't matter, or move it to ${w('list_now')}, ${w('list_next')} or ${w('list_later')}.</p>` },
  { id: 'process', hash: '#/tasks/inbox', at: '#main .task-list, #task-body', title: 'Sort one', done: { moved: true }, doneText: '✓ One sorted. A little and often keeps the pile small.',
    body: `<p>Let's clear one from the pile.</p>${try_(`${tap()} <b>⠿</b> next to a task to choose it, then <b>Move ▸</b> in the bar at the bottom, and pick <b>${word('list_now')}</b>.`)}` },
  { id: 'more', hash: '#/tasks/now', at: '.tour-more, #main .task-list', enter: markTask(() => true, 'tour-more'), title: 'Everything about a task',
    body: `<p>${KEYS ? 'Point at any task' : 'Tap any task'} and a green ${green('More')} button appears on its right (it's showing on this one). It opens the task's note, dates, energy and how long it'll take.</p>` },
  { id: 'repeat', hash: '#/tasks/now', at: '.tour-this, #main .task-list', enter: markTask(t => /bins/i.test(t), 'tour-this'), title: 'Tasks that repeat',
    body: `<p><b>Put the bins out</b> comes round every week. Tick it off and next week's appears by itself, on the right day. Any task can repeat: choose how often in its ${green('More')}.</p>` },
  { id: 'select', hash: '#/tasks/now', at: '#main .task-list, #task-body', title: 'Move, nest and choose',
    body: `<ul><li>Hold <b>⠿</b> to move a task up or down.</li><li>Drop it onto another task to make it a sub-task; drag a sub-task out on its own to make it a task again.</li><li>${Tap()} <b>⠿</b> on a few to choose them, then act on them all from the bar at the bottom.</li></ul>` },
  { id: 'tips', title: 'Tips', body: `<ul><li>There's plenty more when you need it: start and end dates, repeats, sub-tasks and checklists.</li>
      <li>Give tasks a <b>Duration</b> and you'll see how much work you really have, and how long each thing will take. Later you'll see the ${w('area_planner')} use it to fit them into your day.</li></ul>` },
  { id: 'view', hash: '#/tasks/now', at: '#main .view-menu .menu, #main .view-menu', also: '#main .view-menu > summary', open: '#main .view-menu', title: 'View settings', done: { layout: ['tasks', 'margin'] },
    body: `<p><b>👁</b> on every page changes how it looks.</p>${try_('tick <b>Lined Paper</b>, then <b>Show margin</b>, to see your tasks on paper.')}` },
  { id: 'spacing', hash: '#/tasks/now', at: '#main .view-menu .density-opts, #main .view-menu .menu', also: '#main .task-list', open: '#main .view-menu', title: 'Dial it up a notch', done: { density: ['tasks', 'medium'] }, doneText: '✓ Now you can see dates, energy and durations under each task.',
    body: `<p>We started you on <b>Tight</b> spacing: a nice clean list. When you want more to go on, dial it up.</p>${try_('under <b>Spacing</b>, pick the middle one, <b>Medium</b>.')}` },
  { id: 'dots', hash: '#/tasks/now', at: '#main .page-more .menu, #main .page-more', also: '#main .page-more > summary', open: '#main .page-more', title: 'The Triple Dot menu',
    body: `<p>The <b>⋯</b> Triple Dot menu is where you'll find tasks you've archived, or even deleted (they wait in the Bin for 30 days).</p>` },
  { id: 'done', hash: '#/tasks/now', at: '#task-views [data-view="done"], #task-views', title: 'Done: your last month',
    body: `<p>Ticked-off tasks stay in <b>Done</b> for 30 days, then tidy themselves away into the Archive. So Done always shows what you've got through lately, and never becomes a long list. (Settings → Tasks changes how long.)</p>` },
  { id: 'projects', hash: '#/tasks/now', at: '.task-mode [data-mode="projects"], .task-mode', title: 'Projects', offer: 'projects',
    body: `<p><b>Projects</b> are for bigger things: milestones and deadlines, and sharing with the people working on it with you.</p><p>Save the Projects tour for later, or skip it for now.</p>` },
  { id: 'keysoffer', only: 'keys', title: 'Keyboard lover?', offer: 'keys',
    body: `<p>Sift is easy to drive from the keyboard: moving between areas, pages and tasks without touching the mouse.</p><p>Save the keyboard tour for later, or skip it.</p>` },
];

// Kick-off tours: offered during a big tour and saved to Next, to take whenever.
const projectsSteps = () => [
  { id: 'list', hash: '#/tasks/projects', at: '#main .project-grid, #main', title: 'Your projects', done: { hash: '#/tasks/list/' },
    body: `<p>Each shows how far along it is and what's next.</p>${try_('open <b>Kitchen renovation</b>.')}` },
  { id: 'milestones', at: '#main .project-head, #main', title: 'Milestones and deadlines', body: `<p>Break a project into milestones, each with its own date. Its tasks sit under them, and the bar shows how far along you are.</p>` },
  { id: 'together', at: '#main .project-head, #main', title: 'Do it together', body: `<p><b>👥 Share</b> a project and everyone works from the same tasks, ticks and comments.</p>` },
];
const keysSteps = () => [
  { id: 'table', title: 'Hands on the keyboard', body: `<table class="tour-keys">
      <tr><td>${key(CTRL, '←')} ${key(CTRL, '→')}</td><td>the area before or after</td></tr>
      <tr><td>${key('←')} ${key('→')}</td><td>the page's tabs, or the ${word('area_planner')}'s days</td></tr>
      <tr><td>${key('↓')} then ${key('Enter')}</td><td>go down the page, and open what you're on</td></tr>
      <tr><td>${key('Esc')}</td><td>step back out, keeping what you wrote</td></tr>
      <tr><td>${key(CTRL, 'Enter')}</td><td>save and finish</td></tr>
      <tr><td>${key('Alt', 'Enter')}</td><td>a note full screen</td></tr>
      <tr><td>${key(CTRL, 'K')} ${key('/')}</td><td>search everything</td></tr>
    </table><p>Point at a button to see its key.</p>` },
  { id: 'areas', hash: '#/dump', title: 'Between areas', done: { hash: '#/tasks' }, body: `${try_(`press ${key(CTRL, '→')} to go to ${w('area_tasks')}.`)}` },
  searchStep(),
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
  projects: { title: 'Tour: projects', steps: projectsSteps },
  keys: { title: 'Tour: the keyboard', steps: keysSteps },
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

// A tour's task (made if there isn't one, put back if it was ticked or moved), on Next.
async function tourTask(which) {
  let task = (await store.list('tasks')).find(t => tourOf(t) === which);
  if (!task) task = await addTaskFirst({ title: TOURS[which].title, notes: which === 'new' ? '▶ Pick a tour whenever you like.' : '▶ Start the tour whenever you like; it carries on where you left it.', horizon: 'next', tour: which });
  else if (task.done_at || task.horizon !== 'next' || task.archived_at) await store.update('tasks', task.id, Object.assign(doneFields(false), { horizon: 'next', archived_at: null }));
  return task;
}
// Saved for later from inside a tour (a kick-off tour): its task on Next, the Next tab pulsing if it's on the page.
export async function saveTourForLater(which) {
  await tourTask(which);
  const tab = document.querySelector('#task-views [data-view="next"]');
  if (tab) flash(tab, { pulses: 3 });
  toast(`📌 Saved to your ${word('list_next')} list: ▶ start it from there whenever you like`, { ms: 6000 });
}
// The tour's task, shown on Tasks → Next with its outline pulsing so it can be found.
export async function showTourTask(which = 'new') {
  const task = await tourTask(which);
  if (location.hash === '#/tasks/next') dispatchEvent(new Event('sift:refresh')); // already there: drawn again with it
  else location.hash = '#/tasks/next';
  for (let tries = 0; tries < 40; tries++) {
    const el = document.querySelector(`#main li[data-task="${task.id}"]`);
    if (el) { flash(el); break; }
    await new Promise(ok => setTimeout(ok, 100));
  }
  toast(`The tour waits on your ${word('list_next')} list: ▶ Start the tour carries on where you left it`, { ms: 6000 });
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
        ${step.offer ? `<button type="button" class="primary" data-tour="save">📌 Save for later</button><button type="button" data-tour="next">${last ? 'Skip and finish' : 'Skip'}${k('N')}</button>`
          : step.done ? `<button type="button" data-tour="next">Skip${k('N')}</button>` : `<button type="button" class="primary" data-tour="next">${last ? 'Finish' : 'Next'}${k('N')}</button>`}</div>`;
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
    card.querySelector('.tour-foot').innerHTML = `<span class="tour-nice">${all[n].doneText || '✓ That\'s it'}</span>`;
    setTimeout(() => {
      if (!current(n)) return;
      const full = document.querySelector('.rich.is-full .rich-edit');
      if (full && !full.textContent.trim()) closeFull();
      show(n + 1);
    }, all[n].doneText ? 2200 : 1100);
  }
  const act = what => {
    if (what === 'back' && t.n > 0) show(t.n - 1);
    else if (what === 'next') t.n === all.length - 1 ? finish() : show(t.n + 1);
    else if (what === 'later') t.end().then(() => showTourTask(which));
    else if (what === 'save') {
      saveTourForLater(step.offer);
      card.querySelector('.tour-foot').innerHTML = `<span class="tour-nice">📌 Saved to your ${word('list_next')} list</span>`;
      const at = t.n;
      setTimeout(() => { if (current(at)) (at === all.length - 1 ? finish() : show(at + 1)); }, 1800);
    }
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
  const soon = () => setTimeout(then); // (after the caller has kept how to stop)
  // A task moved out of the Task Dump (to Now, Next or Later).
  if (done.moved) {
    const inbox = new Set((await store.list('tasks')).filter(t => t.horizon === 'inbox' && !t.done_at).map(t => t.id));
    return store.subscribe(async change => {
      if (change?.collection !== 'tasks' || !inbox.has(change.id)) return;
      const t = await store.get('tasks', change.id);
      if (t && t.horizon && t.horizon !== 'inbox') then();
    });
  }
  // A 👁 Layout switch on (both, when it needs another).
  if (done.layout) {
    const [area, id] = done.layout;
    const check = () => { if (layoutOn(area, id)) then(); };
    if (layoutOn(area, id)) soon();
    document.addEventListener('sift-layout', check);
    return () => document.removeEventListener('sift-layout', check);
  }
  // A 👁 Spacing picked.
  if (done.density) {
    const [area, value] = done.density;
    const check = () => setTimeout(() => { if (densityOf(area) === value) then(); });
    if (densityOf(area) === value) soon();
    document.addEventListener('click', check, true);
    return () => document.removeEventListener('click', check, true);
  }
  if (done.made) {
    const had = new Set();
    for (const c of done.made) for (const r of await store.list(c)) had.add(r.id);
    return store.subscribe(change => { if (done.made.includes(change?.collection) && !change.deleted && !had.has(change.id)) then(); });
  }
  const check = () => { if (location.hash.startsWith(done.hash)) then(); };
  addEventListener('hashchange', check);
  return () => removeEventListener('hashchange', check);
}
