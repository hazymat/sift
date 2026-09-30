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
// What finishes a line on a phone keyboard: New task asks for a "done" key, which iOS draws as ✓ or "done"
// (by version) and Android as ✓; a page can't tell which, so both are named.
const enterKey = () => (KEYS ? `press ${key('Enter')}` : 'tap <b>✓</b> (or <b>Done</b>) on your keyboard');

// Phones: the keyboard only opens for a tap, and a tour gets going a moment after it. So the tap puts the
// cursor in a hidden box straight away (the keyboard opens), and the step's own field takes it over once
// it's there (the keyboard stays). startTour's caller calls this in the tap itself.
let primer = null;
export function primeKeyboard() {
  if (KEYS) return;
  primer?.remove();
  primer = Object.assign(document.createElement('input'), { type: 'text', autocomplete: 'off' });
  primer.setAttribute('aria-hidden', 'true');
  primer.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0';
  document.body.append(primer);
  primer.focus();
  setTimeout(() => { primer?.remove(); primer = null; }, 8000); // (never taken over: gone again)
}
const primed = () => primer && document.activeElement === primer;
// Several things to do in turn: one yellow line (and green arrow) each.
const tries = (...lines) => lines.map(l => `<p class="tour-try">${l}</p>`).join('');
const handle = '<span class="tour-handle" aria-label="grab handle">⠿</span>';

const searchStep = () => ({ id: 'search', at: KEYS ? '.top-search, #more-tab' : '#more-tab, .top-search', title: 'Find anything', body: `<p>${KEYS ? `${key(CTRL, 'K')} or ${key('/')}` : 'The box at the top of <b>More</b>'} searches every note, task, contact, list and box, archived ones too.</p>` });

// Tasks and projects.
// A task on the page picked out while a step shows (a class on its row; the step's at: points at it).
// Put back whenever the list is drawn again (photos arriving, a sync) while the step shows.
const markTask = (match, cls) => ({ cls, apply: () => {
  const li = [...document.querySelectorAll('#main .task-list > li[data-task]')].find(l => match(l.querySelector('.task-title')?.value || ''));
  li?.classList.add(cls);
  return !!li;
} });
// Leaving a step that had a task opened: closed again, as Esc would.
const closeEditing = () => { const el = document.querySelector('#main .task-list > li.pills-open, #main .task-list > li.task-details'); if (!el) return; (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.activeElement?.blur?.(); };
// Tasks typed by hand while a tour runs (startTour watches), for the step that has them tidied away.
const madeInTour = new Set();
const tidied = () => { let ok = false; return () => {
  Promise.all([...madeInTour].map(id => store.get('tasks', id, { includeDeleted: true })))
    .then(rs => { ok = rs.length > 0 && rs.every(r => !r || r.done_at || r.deleted_at || r.archived_at); });
  return ok;
}; };
const Tap = () => (KEYS ? 'Click' : 'Tap');
// Where a task's ⠿ is: on a computer it only shows when the task is pointed at.
const grab = () => (KEYS ? 'hover your mouse over a task and its <b>⠿</b> appears on the left' : 'each task has a <b>⠿</b> on its left');
const green = label => `<span class="tour-green">${label}</span>`;

// Tasks: capture first, sort later (the Getting Things Done way), then what a task can do.
// Tried-it checks that look at the page (polled): a factory, so each showing of a step starts afresh.
const shows = sel => () => () => !!document.querySelector(sel);
const openedThenClosed = sel => () => { let seen = false; return () => { const open = !!document.querySelector(sel); if (open) seen = true; return seen && !open; }; };
const changes = get => () => { const was = get(); return () => get() !== was; };

const tasksSteps = () => [
  { id: 'add', hash: '#/tasks/inbox', at: '#task-entry, #task-body', also: nav('tasks'), focus: '#task-new', title: 'Add a task', done: { made: ['tasks'] },
    body: `<p class="tour-try">Try typing something you need to do, like <b>Buy milk</b>, then ${enterKey()}.</p>` },
  { id: 'tabs', hash: '#/tasks/inbox', at: '#task-entry, #task-body', also: '#task-views [data-view="inbox"]', focus: '#task-new', title: `You just used the ${word('list_inbox')}`, done: { made: ['tasks'] }, doneText: "✓ That's the idea: no buttons, just type.",
    body: `<p>The <b>${word('list_inbox')}</b> is for whatever pops into your head. It's built to have you typing within seconds of opening Sift: type, ${KEYS ? key('Enter') : '✓'}, type the next one. Nothing to decide; just get your thoughts down.</p>
      ${try_('add another one, straight away, like <b>Call Mum</b>.')}` },
  { id: 'capture', hash: '#/tasks/inbox', at: '#main .task-list, #task-body', title: 'Empty your head first, sort it later',
    body: `<blockquote class="tour-quote"><span class="tour-quote-icon" aria-hidden="true">📘</span><span><span class="tour-quote-text">"Your mind is for having ideas, not holding them."</span><span class="tour-quote-who">David Allen, <i>Getting Things Done</i></span></span></blockquote>
      <p><b>1. Get it all down.</b> Everything goes in here as it comes, without deciding anything.</p>
      <p><b>2. Now and again, sort the pile,</b> one task at a time:</p>
      <ul class="tour-list"><li>⚡ <b>Two minutes or less?</b> Do it there and then.</li><li>🗑️ <b>Doesn't matter?</b> Bin it.</li><li>📥 <b>Otherwise</b> move it to ${w('list_now')}, ${w('list_next')} or ${w('list_later')}, by how soon it matters.</li></ul>` },
  { id: 'process', hash: '#/tasks/inbox', at: '#main .task-list, #task-body', title: 'Sort a couple', done: { moved: 2 }, cardTop: true, liftBar: true, doneText: '✓ Two sorted. A little and often keeps the pile small.',
    body: `<p>Let's clear two from the pile.</p>${tries(
      KEYS ? `Hover your mouse over the left side of a task, then click its grab handle ${handle}.` : `Tap the grab handle ${handle} on the left of a task.`,
      'Do it again on another task, to choose two.',
      `Look at the bar at the bottom: ${tap()} <b>Move ▸</b>, then <b>${word('list_now')}</b>.`)}` },
  { id: 'tidy', hash: '#/tasks/inbox', at: '#main .task-list, #task-body', title: 'Tidy up your practice tasks', done: { check: tidied }, cardTop: true, liftBar: true, doneText: "✓ Gone. That's the Task Dump: in fast, out when it's dealt with.",
    body: `<p>The tasks you just typed were practice, so clear them away and your list starts clean. (If one was something real, just add it again after the tour.)</p>${try_('tick them off, or choose them with <b>⠿</b> and press <b>Delete</b> in the bar at the bottom.')}` },
  { id: 'spacing', hash: '#/tasks/now', at: '#main .view-menu .density-opts, #main .view-menu .menu', also: '#main .task-list', open: '#main .view-menu', title: 'View settings: spacing', doneText: '✓ Medium shows dates, energy, repeats and durations under each task.',
    // Done once Medium is picked after being on something else (so a device already on Medium tries Tight first).
    done: { check: () => { let away = false; return () => { const d = densityOf('tasks'); if (d !== 'medium') away = true; return away && d === 'medium'; }; } },
    body: densityOf('tasks') === 'medium'
      ? `<p>Here's ${w('list_now')}, and its <b>👁</b> View settings (every page has them). You're on <b>Medium</b> spacing: dates, energy and durations under each task. <b>Tight</b> gives you a clean, short list instead.</p>${tries('Under <b>Spacing</b>, pick <b>Tight</b> (the first one) to see the difference.', 'Then pick <b>Medium</b> (the middle one) again.')}`
      : `<p>Here's ${w('list_now')}, and its <b>👁</b> View settings (every page has them). We started you on <b>Tight</b> spacing: a nice clean list. When you want more to go on, dial it up.</p>${try_('under <b>Spacing</b>, pick the middle one, <b>Medium</b>.')}` },
  { id: 'view', hash: '#/tasks/now', at: '#main .view-menu .menu, #main .view-menu', also: '#main .view-menu > summary', open: '#main .view-menu', title: 'View settings: lined paper', done: { layout: ['tasks', 'margin'] },
    body: `<p>The same menu also puts your tasks on paper.</p>${try_('tick <b>Lined Paper</b>, then <b>Show margin</b>, to see your tasks on paper.')}` },
  { id: 'more', hash: '#/tasks/now', at: '#main .task-list, #task-body', leave: closeEditing, title: 'Everything about a task', done: { check: shows('#main .task-list > li.pills-open, #main .task-list > li.task-details') }, doneText: "✓ That's everything about a task, in one place.",
    body: `<p>A green ${green('More')} button opens a task's note, dates, energy and how long it'll take. It only appears once you ${KEYS ? 'point at' : 'tap'} a task.</p>${try_(KEYS ? `hover your mouse over a task, and its green ${green('More')} appears on the right. Click it.` : `tap a task, and its green ${green('More')} appears on the right. Tap it.`)}` },
  { id: 'select', hash: '#/tasks/now', at: '#main .task-list, #task-body', title: 'Move and nest', done: { nested: true }, doneText: '✓ Nested. Drag it back out whenever you like.',
    body: `<p>The same grab handle ${handle} moves tasks: hold it and drag a task up or down, or drop it onto another task to make it a sub-task.</p>${try_('drag one task onto another.')}` },
  { id: 'tips', title: 'Tips', body: `<ul><li>There's plenty more when you need it: start and end dates, sub-tasks, checklists and repeating tasks.</li>
      <li>A repeating task comes back by itself: make <b>Put the bins out</b> repeat every week, tick it off, and next week's is already waiting.</li>
      <li>Give tasks a <b>Duration</b> and you'll see how much work you really have, and how long each thing will take. Later you'll see the ${w('area_planner')} use it to fit them into your day.</li></ul>` },
  { id: 'dots', hash: '#/tasks/now', at: '#main .page-more > summary, #main .page-more', title: 'The Triple Dot menu', done: { check: shows('#main .page-more[open]') }, doneText: '✓ Show Archive and Show Bin are in here.',
    body: `<p>The <b>⋯</b> Triple Dot menu is where you'll find tasks you've archived, or even deleted (they wait in the Bin for 30 days).</p>${try_(`${tap()} <b>⋯</b> at the top right.`)}` },
  { id: 'done', hash: '#/tasks/now', at: '#task-views [data-view="done"], #task-views', title: 'Done: your last month', done: { hash: '#/tasks/done' },
    body: `<p>Ticked-off tasks stay in <b>Done</b> for 30 days, then tidy themselves away into the Archive, so Done never becomes a long list. (Settings → Tasks changes how long.)</p>${try_(`${tap()} <b>Done</b>.`)}` },
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
    </table><p>Hover your mouse over a button to see its key.</p>` },
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
  { id: 'kinds', hash: '#/dump', at: '#dump-filter, .dump-filter-row', title: 'Your own categories', done: { check: () => () => [...document.querySelectorAll('#dump-filter [aria-pressed="true"]')].some(b => /Menus/.test(b.textContent)) }, doneText: '✓ Just the menus.', body: `<p>Notes can be filed as <b>Idea</b>, <b>Shopping</b> or categories of your own: here, <b>Menus</b>, <b>Home projects</b> and <b>Days out</b>. <b>⋯</b> at the end of the row adds your own, renames them or puts them in order.</p>${try_(`${tap()} <b>Menus</b> to see just those.`)}` },
  { id: 'kindsheet', hash: '#/dump', at: '.filter-more', title: 'Make your own', body: `<p>${tap().replace(/^./, c => c.toUpperCase())} <b>⋯</b> here to add a category: Recipes to try, Work, Gift ideas, whatever suits you.</p>` },
  { id: 'safe', hash: '#/dump', at: '.dump-capture', title: 'Never lost', body: `<p>Everything is kept as you type it, even a note you hadn't saved when the battery died.</p>` },
  { id: 'undo', hash: '#/dump', at: '#dump-body', only: 'keys', title: 'Undo that remembers yesterday', body: `<p>${key(CTRL, 'Z')} in a note goes back past what you just typed: yesterday's version, last week's, even ones from your other devices.</p>` },
  { id: 'undo', hash: '#/dump', at: '#dump-body', only: 'touch', title: 'Undo that remembers yesterday', body: `<p><b>Aa</b>, then <b>🕘</b>, lists a note's earlier versions: yesterday's, last week's, from any of your devices.</p>` },
  { id: 'look', hash: '#/dump', at: '#main .view-menu .menu, #main .view-menu', open: '#main .view-menu', title: '👁 Look and spacing', done: { check: shows('#main[data-shade="colour"]') }, doneText: '✓ Each note in its own colour.', body: `<p>Plain notes or colourful ones, packed tight or roomy. Nothing here can break anything.</p>${try_('pick <b>Multicolour</b>.')}` },
  { id: 'rich', hash: '#/dump', at: '#dump-body', title: 'Notes that do things', body: `<p>Type a phone number and it becomes a contact. Paste a screenshot or a PDF and it's attached. Format with the toolbar${KEYS ? `, ${key(CTRL, 'B')}` : ''} or Markdown.</p>` },
  searchStep(),
  { id: 'why', title: 'Why not Apple Notes or Notepad?', body: `<ul><li>Nothing is ever lost, and undo goes back days.</li><li>A line becomes a task or a contact, and stays linked.</li><li>The same notes on every device, readable by nobody else.</li></ul>` },
];

// The Day Planner: for lovers of a real notebook or planner.
const plannerSteps = () => [
  { id: 'paper', hash: '#/planner', at: '.planner .paper', also: nav('planner'), title: 'Your day on paper', body: `<p>Write on a time to plan it. Pick your paper in <b>👁</b>: Notebook, Dot journal, Glass…</p>` },
  { id: 'drag', hash: '#/planner', at: '.planner .pile, .planner .paper', title: 'Tasks to times', done: { timed: true }, doneText: "✓ It's in your plan. Drag its bottom edge to say how long.",
    body: `<p>The day's tasks wait here, until you give them a time.</p>${try_(KEYS ? 'drag <b>Post the parcel</b> by its <b>⠿</b> onto a time in the plan.' : 'tap <b>Post the parcel</b> once to pick it up, then drag it onto a time.')}` },
  { id: 'bring', hash: '#/planner', at: '.planner .bring-link', title: 'Bring items in', done: { check: openedThenClosed('#bring[open]') }, doneText: '✓ Everything waiting, in one calm place.',
    body: `<p>Your task list, anything unfinished from earlier days, and your Google Calendar, all in one place instead of cluttering the page.</p>${try_(`${tap()} <b>↓ Bring items in</b>, have a look, then <b>Done</b>.`)}` },
  { id: 'ahead', hash: '#/planner', at: '.planner [data-act="next"], .planner .day-nav', title: 'Plan ahead', done: { check: changes(() => location.hash) }, doneText: '✓ Any day, any week. (Three days on, there\'s a dentist and a pizza night.)',
    body: `<p><b>›</b> goes forward a day, <b>‹</b> back, <b>📅</b> jumps to any date.</p>${try_(`${tap()} <b>›</b>.`)}` },
  { id: 'pview', hash: `#/planner/${isoDate()}`, at: '.planner .view-menu .menu, .planner .view-menu', open: '.planner .view-menu', title: '👁 Your kind of paper', done: { check: changes(() => document.querySelector('.planner')?.dataset.paper) }, doneText: '✓ Every day can have its own paper.',
    body: `<p>Notebook, Dot journal, Glass; quarter, half or whole hours; the plan first or your tasks first.</p>${try_('pick a different <b>Paper</b>.')}` },
  { id: 'focus', hash: `#/planner/${isoDate()}`, at: '.planner .focus-row', focus: '#focus', title: 'Plan around how you feel', done: { updated: ['days'] }, doneText: "✓ Today's focus, right at the top.",
    body: `<p><b>Day focus</b>: the one thing that matters today. <b>Energy</b>: how you feel, so it suggests tasks that fit.</p>${try_(`type your focus for today, then ${KEYS ? key('Enter') : 'Done'}.`)}` },
  { id: 'daynotes', hash: `#/planner/${isoDate()}`, at: '.planner .day-notes', title: 'A diary without trying', body: `<p>Who rang, what happened, what to remember. Written as you go, the day's notes become a journal.</p>` },
  { id: 'share', hash: `#/planner/${isoDate()}`, at: '.planner .share-menu', title: 'Share your day', body: `<p>Copy it into WhatsApp for the school run, or share your day, week or whole diary with someone who uses Sift.</p>` },
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
  toast(`📌 Saved to your ${word('list_next')} list (its tab is flashing). Feel free to move it to ${word('list_now')} or ${word('list_later')} if you prefer :)`, { ms: 8000 });
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
  toast(`📌 The tour's on your ${word('list_next')} list (flashing): ▶ Start the tour carries on where you left it. Feel free to move it to ${word('list_now')} or ${word('list_later')} if you prefer :)`, { ms: 9000 });
}

let tour = null; // the tour running: { n, end }

export async function startTour({ which = 'new', fromStart = false } = {}) {
  await tour?.end();
  await seedDemo();
  madeInTour.clear();
  const stopNoting = store.subscribe(async change => {
    if (change?.collection !== 'tasks' || !change.id || change.remote || store.isDemo(change.id) || madeInTour.has(change.id)) return;
    const t = await store.get('tasks', change.id);
    if (t && !t.tour && t.created_at === t.updated_at) madeInTour.add(t.id); // just made (not an old one changed)
  });
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
    if (step?.mark && !document.querySelector(`.${step.mark.cls}`) && step.mark.apply()) target = null; // drawn again: marked again, pointed at again
    // A step's field keeps the cursor when the page is drawn again under it (the examples' photos arriving
    // redraw it); only when the cursor has gone nowhere, never taken from somewhere it was put.
    if (step?.focus && KEYS) {
      const f = document.querySelector(step.focus), a = document.activeElement;
      if (f && a !== f && (!a || a === document.body)) f.focus({ preventScroll: true });
    }
    if (step?.at && !target?.isConnected) target = find(step.at);
    if (step?.also && !extra?.isConnected) extra = find(step.also);
    const r = shown(target), x = shown(extra);
    ring.classList.toggle('whole', !r);
    fit(ring, r || { left: 6, top: 6, width: innerWidth - 12, height: innerHeight - 12 });
    also.hidden = !x;
    if (x) fit(also, x);
    if (moved) return; // put somewhere by hand: left there
    // The card: under what it points at, or over it, or beside it; when none of
    // those fits, in the bottom corner, away from the top of it (where its heading usually is).
    const ch = card.offsetHeight, cw = card.offsetWidth, gap = 14;
    let top, left = r ? Math.min(Math.max(12, r.left), innerWidth - cw - 12) : (innerWidth - cw) / 2;
    const beside = r && Math.min(Math.max(12, r.top), innerHeight - ch - 12);
    if (step?.cardTop) { top = topEdge + 12; left = innerWidth - cw - 12; }
    else if (!r) top = (innerHeight - ch) / 2;
    else if (r.bottom + gap + ch < innerHeight - 8) top = r.bottom + gap;
    else if (r.top - gap - ch > 8) top = r.top - gap - ch;
    else if (r.left - gap - cw > 8) { top = beside; left = r.left - gap - cw; }
    else if (r.right + gap + cw < innerWidth - 8) { top = beside; left = r.right + gap; }
    else { top = innerHeight - ch - 12; left = innerWidth - cw - 12; }
    card.style.top = `${Math.round(Math.max(12, top))}px`;
    card.style.left = `${Math.round(Math.max(12, left))}px`;
  };

  let undoEnter = null; // what the step's enter() set up, undone when it's left
  let moved = false; // the card dragged by hand this step
  let inField = false; // the step's field has the cursor
  const shut = () => {
    step?.leave?.();
    if (opened) { opened.open = false; opened = null; }
    undoEnter?.(); undoEnter = null;
    if (step?.mark) for (const el of document.querySelectorAll(`.${step.mark.cls}, .tour-pill`)) el.classList.remove(step.mark.cls, 'tour-pill');
  };
  async function show(n) {
    stopWaiting();
    shut();
    t.n = n;
    step = all[n];
    document.documentElement.classList.toggle('tour-lift-bar', !!step.liftBar);
    keepPlace(which, step.id); // carried on from here next time
    const last = n === all.length - 1;
    if (step.hash && !location.hash.startsWith(step.hash)) location.hash = step.hash;
    target = extra = null;
    if (step.enter) { for (let tries = 0; tries < 40 && current(n) && !(undoEnter = step.enter()); tries++) await new Promise(ok => setTimeout(ok, 75)); } // (once the page is drawn)
    const k = letter => (KEYS ? ` <kbd>${letter}</kbd>` : '');
    // Already done before arriving (e.g. coming Back to it): nothing to wait for; it says so, with a plain Next.
    const already = step.done?.layout && layoutOn(...step.done.layout);
    const doneStep = step.done && !already;
    const demoNote = n === 0 ? '<p class="tour-demo-note">🧪 We\'ve filled Sift with example things so there\'s something to see. They\'re all cleared away when the tour ends; anything you make yourself stays.</p>' : '';
    moved = false;
    inField = false;
    card.innerHTML = `<div class="tour-head" title="Drag to move"><span class="tour-grip" aria-hidden="true"></span><span class="tour-count">${n + 1} of ${all.length}</span><span class="tour-demo" title="Example things fill Sift during the tour; they're cleared away when it ends">🧪 Example data</span><button type="button" class="tour-x" data-tour="later" aria-label="End the tour early" title="End the tour early: it waits on your task list">✕</button></div>
      <h3>${step.title}</h3><div class="tour-body">${demoNote}${step.body}${already ? '<p class="tour-already">✓ You&#39;ve already got these switched on.</p>' : ''}</div>
      <div class="tour-foot">${n ? `<button type="button" data-tour="back">Back${k('B')}</button>` : ''}
        <button type="button" data-tour="later" class="tour-later">End tour early</button><span class="spacer"></span>
        ${step.offer ? `<button type="button" class="primary" data-tour="save">📌 Save for later</button><button type="button" data-tour="next">${last ? 'Skip and finish' : 'Skip'}${k('N')}</button>`
          : doneStep ? `<button type="button" data-tour="next">Skip${k('N')}</button>` : `<button type="button" class="primary" data-tour="next">${last ? 'Finish' : 'Next'}${k('N')}</button>`}</div>`;
    // What it points at may take a moment to be drawn (the page changing, a toolbar showing once the note is in use).
    for (let tries = 0; tries < 40 && current(n); tries++) {
      // (Not on a phone: the cursor in a note opens it full screen, with the keyboard. That's left to a tap.)
      if (step.focus && (KEYS || primed())) {
        const f = document.querySelector(step.focus);
        if (f && document.activeElement !== f) { f.focus(); if (primer && document.activeElement === f) { primer.remove(); primer = null; } }
        if (f && document.activeElement === f) inField = true;
      }
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
    if (!inField) card.querySelector('[data-tour="next"]').focus({ preventScroll: true }); // (never taking the cursor from the step's own field)
    if (!doneStep) return;
    const stop = await waitFor(step.done, id => { if (current(n)) tried(n, id); });
    if (current(n)) stopWaiting = stop; else stop(); // moved on while it was being set up
  }
  // Tried it: a tick, then on to the next step. (On a phone, saving a note puts
  // the cursor back in an empty New note, full screen: that's closed, so the tour shows again.)
  function tried(n, id) {
    stopWaiting();
    if (id) all[n].onDone?.(id);
    card.querySelector('.tour-foot').innerHTML = `<span class="tour-nice">${all[n].doneText || '✓ That\'s it'}</span>`;
    setTimeout(() => {
      if (!current(n)) return;
      const full = document.querySelector('.rich.is-full .rich-edit');
      if (full && !full.textContent.trim()) closeFull();
      show(n + 1);
    }, all[n].doneWait || (all[n].doneText ? 2200 : 1100));
  }
  const act = what => {
    if (what === 'back' && t.n > 0) show(t.n - 1);
    else if (what === 'next') t.n === all.length - 1 ? finish() : show(t.n + 1);
    else if (what === 'later') t.end().then(() => showTourTask(which));
    else if (what === 'save') {
      saveTourForLater(step.offer);
      card.querySelector('.tour-foot').innerHTML = `<span class="tour-nice">📌 Saved to your ${word('list_next')} list (flashing up there). Move it to ${word('list_now')} or ${word('list_later')} any time.</span>`;
      const at = t.n;
      setTimeout(() => { if (current(at)) (at === all.length - 1 ? finish() : show(at + 1)); }, 3200);
    }
  };
  card.addEventListener('click', e => act(e.target.closest('[data-tour]')?.dataset.tour));
  // Dragging the card by its top row (not its ✕): it stays where it's put until the next step.
  card.addEventListener('pointerdown', e => {
    const head = e.target.closest('.tour-head');
    if (!head || e.target.closest('button') || e.button > 0) return;
    e.preventDefault();
    const r = card.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    try { head.setPointerCapture(e.pointerId); } catch { /* (a pointer that can't be captured: moves are still followed) */ }
    card.classList.add('dragging');
    const move = ev => {
      moved = true;
      card.style.left = `${Math.round(Math.min(Math.max(4, ev.clientX - dx), innerWidth - card.offsetWidth - 4))}px`;
      card.style.top = `${Math.round(Math.min(Math.max(4, ev.clientY - dy), innerHeight - 40))}px`;
    };
    const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); card.classList.remove('dragging'); };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
    head.addEventListener('pointercancel', up);
  });
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
    stopNoting();
    stopWaiting();
    shut();
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true);
    ring.remove();
    also.remove();
    card.remove();
    document.documentElement.classList.remove('touring', 'tour-lift-bar');
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
  // Something on the page (a factory making the check, polled).
  if (done.check) {
    const ok = done.check();
    const id = setInterval(() => { if (ok()) { clearInterval(id); then(); } }, 250);
    return () => clearInterval(id);
  }
  // A task made a sub-task (dropped onto another).
  if (done.nested) {
    const had = new Set((await store.list('tasks')).filter(t => t.parent_task_id).map(t => t.id));
    return store.subscribe(async change => {
      if (change?.collection !== 'tasks' || had.has(change.id)) return;
      if ((await store.get('tasks', change.id))?.parent_task_id) then();
    });
  }
  // A Day Planner item given a time.
  if (done.timed) {
    const untimed = new Set((await store.list('day_items')).filter(i => !i.time).map(i => i.id));
    return store.subscribe(async change => {
      if (change?.collection !== 'day_items' || !untimed.has(change.id)) return;
      if ((await store.get('day_items', change.id))?.time) then();
    });
  }
  // Anything saved in these (e.g. the day's focus).
  if (done.updated) return store.subscribe(change => { if (done.updated.includes(change?.collection) && change.id) then(); });
  // A task moved out of the Task Dump (to Now, Next or Later).
  if (done.moved) {
    const inbox = new Set((await store.list('tasks')).filter(t => t.horizon === 'inbox' && !t.done_at).map(t => t.id));
    const need = done.moved === true ? 1 : done.moved, gone = new Set();
    return store.subscribe(async change => {
      if (change?.collection !== 'tasks' || !inbox.has(change.id)) return;
      const t = await store.get('tasks', change.id);
      if (t && t.horizon && t.horizon !== 'inbox') gone.add(t.id);
      if (gone.size >= need) then();
    });
  }
  // A 👁 Layout switch on (both, when it needs another).
  if (done.layout) {
    const [area, id] = done.layout;
    const check = () => { if (layoutOn(area, id)) then(); };
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
    return store.subscribe(change => { if (done.made.includes(change?.collection) && !change.deleted && !had.has(change.id)) then(change.id); });
  }
  const check = () => { if (location.hash.startsWith(done.hash)) then(); };
  addEventListener('hashchange', check);
  return () => removeEventListener('hashchange', check);
}
