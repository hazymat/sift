// The tour: a walk round Sift that has you try things for real. Each step
// dims the page around one thing (or shows a card in the middle), says what
// it's for and, where it can, asks you to try it: the step moves on by itself
// once you have. Keyboard steps show on laptops, tap steps on phones.
// Started from the welcome page, the "Take the tour" task's pill, or Settings.
import * as store from './store.js';
import { doneFields } from './tasks.js';
import { word } from './words.js';
import { undoable } from './toast.js';
import { closeFull } from './fullnote.js';

const KEYS = matchMedia('(hover: hover) and (pointer: fine)').matches; // a mouse, so almost always a keyboard too
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const ctrl = MAC ? '⌘' : 'Ctrl+';
const kbd = (...keys) => keys.map(k => `<kbd>${k}</kbd>`).join(' ');

// A step: { hash (go there first), at (what to point at: the first one showing
// of a selector list; none: a card in the middle), title, body, only ('keys'
// or 'touch'), focus (put the cursor there), done (how trying it is noticed:
// { made: [collections] } something new saved, or { hash } arriving there) }.
// Built when the tour starts, so areas are called what the user calls them.
function steps() {
  const w = key => `<b>${word(key)}</b>`;
  return [
    { title: 'Welcome to Sift', body: `<p>Sift is where everything in your head goes, and where it turns into tasks, plans, lists and things you can find again, without you ever having to tidy up first.</p>
      <p>This takes about five minutes. You'll try things for real: anything you make is yours to keep or delete. ✕ leaves the tour whenever you like, and Settings starts it again.</p>` },

    // ---------- Brain Dump ----------
    { hash: '#/dump', at: '.dump-capture', focus: '#dump-body .rich-edit', title: `${word('area_dump')}: empty your head`, done: { made: ['thoughts'] },
      body: `<p>Anything goes here: a worry, an idea, a phone number, "ring the dentist". No title, no folder, nothing to decide first.</p>
        <p class="tour-try">Try it: ${KEYS ? `write something, then press ${kbd(`${ctrl}Enter`)} or Save` : 'tap the box and write something, then Done, then Save'}.</p>` },
    { hash: '#/dump', at: '#thoughts > li.thought', title: 'It becomes something, and stays', done: { made: ['tasks', 'day_items'] },
      body: `<p>Your note is kept. When you're ready, <b>→ Task</b> makes it a task, <b>Plan it</b> puts it on a day's plan, <b>→ Find Things</b> records where something is kept.</p>
        <p>The note isn't emptied or thrown away, as it would be in other apps: it stays, linked to what it became, and the task links back to it. You never have to decide whether it's safe to delete.</p>
        <p class="tour-try">Try it: press <b>→ Task</b>.</p>` },
    { hash: '#/dump', at: '#dump-body', focus: '#dump-body .rich-edit', title: 'Notes that do things', body: `<p>Bold, crossed out, lists and five text sizes, kept wherever the note appears. Pick a line and <b>↗ Make</b> turns it into tasks or a contact; the words stay, as a link.</p>
        <p>Write a phone number or an email and it becomes a real contact, with a record of every call. Paste a screenshot and it's attached.</p>` },
    { hash: '#/dump', at: '#dump-body', only: 'keys', title: 'Undo that remembers yesterday', body: `<p>${kbd(`${ctrl}Z`)} in a note steps back through what you just typed, then keeps going: yesterday's version, last week's, even changes made on your other devices. ${kbd(`${ctrl}Y`)} goes forward again.</p>
        <p>Anything else you do shows a message at the bottom with <b>Undo</b>, and ${kbd(`${ctrl}Z`)} does the same while it shows.</p>` },
    { hash: '#/dump', at: '#dump-body', only: 'touch', title: 'Undo that remembers yesterday', body: `<p>Every note keeps its earlier versions: yesterday's, last week's, even changes made on your other devices. <b>Aa</b> in a note's toolbar, then 🕘, lists them to go back to.</p>
        <p>Anything else you do shows a message at the bottom with <b>Undo</b>.</p>` },

    // ---------- Tasks ----------
    { hash: '#/tasks/now', at: '#task-entry, #task-body', focus: '#task-new', title: `${word('area_tasks')}: ${word('list_now')}, ${word('list_next')}, ${word('list_later')}`, done: { made: ['tasks'] },
      body: `<p>Three lists instead of deadlines: what you're doing now, what's next, and one day. ${w('list_inbox')} holds anything not sorted yet, like a task made from a note.</p>
        <p class="tour-try">Try it: type a task and ${KEYS ? `press ${kbd('Enter')}` : 'press Add'}.</p>
        ${KEYS ? `<p>Start it with ${kbd('-')} and a space to make it a sub-task of the one above. ${kbd('Shift+Enter')} opens <b>More</b>: energy, a day, how long it takes.</p>` : ''}` },
    { hash: '#/tasks/now', at: '.task-list > li[data-task]', title: 'Everything about a task', body: `<p><b>⋯</b> opens a task: its note, the energy it needs, how long it takes, which day to do it.</p>
        <p><b>Repeats</b>: "put the bins out, every Tuesday". Ticking it makes the next one, on the right day, with its checklist ready again. Missed ones never pile up.</p>
        <p><b>Comments</b> keep a record of what actually happened: "rang them, need their reference number", "done, cost £40".</p>` },

    // ---------- getting around ----------
    { only: 'keys', title: 'Your hands can stay on the keyboard', done: { hash: '#/planner' }, body: `<table class="tour-keys">
        <tr><td>${kbd(`${ctrl}←`)} ${kbd(`${ctrl}→`)}</td><td>the next area</td></tr>
        <tr><td>${kbd('←')} ${kbd('→')}</td><td>the page's tabs (${word('list_now')}, ${word('list_next')}…), or the ${word('area_planner')}'s days</td></tr>
        <tr><td>${kbd('↓')} ${kbd('Enter')}</td><td>go down the page and open things</td></tr>
        <tr><td>${kbd('Esc')}</td><td>step back out, keeping what you wrote</td></tr>
        <tr><td>${kbd(`${ctrl}Enter`)}</td><td>save and finish</td></tr>
        <tr><td>${kbd('Alt+Enter')}</td><td>a note full screen</td></tr>
        <tr><td>${kbd(`${ctrl}K`)} or ${kbd('/')}</td><td>search everything</td></tr>
      </table>
      <p>Point at a button to see its key, if it has one.</p>
      <p class="tour-try">Try it: press ${kbd(`${ctrl}→`)} to go to the ${word('area_planner')}. (If nothing happens, ${kbd('Esc')} first closes what's open.)</p>` },
    { only: 'touch', at: '#tabbar, #topnav-links', title: 'Getting around', done: { hash: '#/planner' }, body: `<p>The areas are along here; <b>More</b> has the rest, and a search box that finds anything you've written.</p>
        <p class="tour-try">Try it: tap ${w('area_planner')}.</p>` },

    // ---------- Day Planner ----------
    { hash: '#/planner', at: '.planner .paper', title: 'Your day on paper', body: `<p>Write on a time to plan it. Drag a task's ⠿ onto a time, and its bottom edge to say how long it takes.</p>
        <p>Give a task a day in ${w('area_tasks')} and it's here on that day by itself; change the day and it moves. Anything unfinished is offered again the next day, or you can let it go.</p>` },
    { hash: '#/planner', at: '.planner .focus-row', title: 'Plan around how you feel', body: `<p><b>Day focus</b>: the one thing that matters today. <b>Energy</b>: how you feel, so the planner can suggest tasks that fit, low-effort ones on a low day.</p>
        <p>Days you'd rather rest (Settings → ${word('area_planner')}) get a gentle reminder to do less.</p>` },
    { hash: '#/planner', at: '.planner .view-menu', title: 'Your kind of paper', body: `<p>👁 changes this day's paper: Glass, Notebook, Dot journal, Techie or Minimal, and how long each line of the plan is. The default is in Settings.</p>` },
    { hash: '#/planner', at: '.planner .share-menu', title: 'Share your day', body: `<p><b>Share</b> gives someone on your Sift server this day, this week or your whole diary, and you can both change it:</p>
        <ul><li>a partner sees who's doing the school run, and adds the dentist;</li><li>a colleague sees when you're free;</li><li>a family keeps one plan for the holiday.</li></ul>
        <p>Or copy the day as text, to paste into a message or an email.</p>` },

    // ---------- Lists and the rest ----------
    { hash: '#/lists', at: '.lists-head', title: `${word('area_lists')}, shared with the people who need them`, body: `<p>Shopping, packing, the kids' swimming bag. Make a <b>template</b> once and start a fresh list from it every time.</p>
        <p><b>👥 Share</b> a list and everyone ticks off the same one: two of you in the supermarket, and the milk is only bought once. Notes in ${w('area_dump')} share the same way, so a family plan or a meeting's notes live in one place instead of a chat.</p>` },
    { hash: '#/find-things', at: '#find-grid .find-bar, #main', title: word('area_places'), body: `<p>Where things are kept: the loft, box 4, the drawer in the hall. Photos of what's inside, and search inside every box: "where did we put the passports?" Already have a spreadsheet of your boxes? Import it.</p>` },
    { hash: '#/contacts', at: '#c-tabs, #main', title: `${word('area_contacts')} and Cases`, body: `<p>Paste a number and a few words, "window cleaner 07700 900123", and it's a contact. Each one keeps a record of every call.</p>
        <p>A <b>case</b> keeps a whole saga in one timeline: a complaint, an insurance claim, a repair. Every call, letter and task about it, in order, so you can say exactly what happened and when.</p>` },
    { at: KEYS ? '.top-search, #more-tab' : '#more-tab, .top-search', title: 'Search everything', body: `<p>${KEYS ? `${kbd(`${ctrl}K`)} or ${kbd('/')}, or 🔍 at the top` : 'The box at the top of <b>More</b>'}: one search over every note, task, comment, contact, list and box. Archived things are found too.</p>` },
    { hash: '#/bin', at: '#bin-tabs, #main', title: 'Nothing is lost by tidying up', body: `<p><b>Archive</b> anything you've finished with: it's out of the way here, in ${w('area_bin')}, and still found by search. Deleted things wait here for 30 days.</p>
        <p><b>History</b> (in ⋯ on any page) lists every change, and any of them can be undone, in any order.</p>` },

    // ---------- making it yours ----------
    { hash: '#/settings', at: '#appearance-card', title: 'Make it yours', body: `<p>Themes, and <b>Custom</b>: press anything on a sample page to change its colour or font. <b>Your words</b> renames anything: call ${w('area_dump')} "Inbox", or ${w('area_tasks')} "Jobs".</p>
        <p><b>Sync</b> keeps your phone and laptop in step through a small server you own. Everything is encrypted on your device first, so the server only holds scrambled copies. It works offline, on Windows, Mac, iPhone and Android alike.</p>` },
    { title: 'Why not just use Apple Notes?', body: `<p>Notes apps are good at keeping notes. Sift is for what happens after you've written one:</p>
        <ul><li>a line becomes a task or a contact, and stays in the note, linked;</li><li>undo goes back past yesterday, across your devices;</li><li>your day on paper, planned around your energy;</li><li>tasks that repeat, carry over and keep a record of what happened;</li><li>lists and days shared with the people in them;</li><li>on every device you own, and nobody else holds your data.</li></ul>
        <p>That's the tour. Now empty your head.</p>` },
  ];
}

// What a step points at: the first selector in its list with something showing.
function find(list) {
  for (const sel of list.split(',')) {
    const el = Array.from(document.querySelectorAll(sel)).find(e => e.getClientRects().length);
    if (el) return el;
  }
  return null;
}

let tour = null; // the tour running: { n, end }

export function startTour() {
  tour?.end(false);
  const all = steps().filter(s => !s.only || (s.only === 'keys') === KEYS);
  const ring = Object.assign(document.createElement('div'), { className: 'tour-ring' });
  const card = Object.assign(document.createElement('div'), { className: 'tour-card' });
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Tour of Sift');
  document.body.append(ring, card);
  document.documentElement.classList.add('touring');
  let target = null, step = null, raf = 0, stopWaiting = () => {};
  const t = tour = { n: 0 };
  const current = n => t === tour && t.n === n;
  // Scrolling to what a step points at leaves it clear of the top bar (and a phone's bottom bar).
  const bar = sel => { const b = document.querySelector(sel); return b?.getClientRects().length ? b.getBoundingClientRect() : null; };
  const topEdge = bar('.appbar')?.bottom || 0;
  const bottomEdge = Math.min(innerHeight, bar('#tabbar')?.top ?? innerHeight);
  const root = document.documentElement.style;
  root.scrollPaddingTop = `${topEdge + 12}px`;
  root.scrollPaddingBottom = `${innerHeight - bottomEdge + 12}px`;

  // The ring follows what it points at (pages scroll, panels open, a page drawn
  // again finds it afresh); with nothing to point at the whole page dims.
  const place = () => {
    raf = requestAnimationFrame(place);
    if (step?.at && !target?.isConnected) target = find(step.at);
    const r = target?.isConnected && target.getClientRects().length ? target.getBoundingClientRect() : null;
    ring.classList.toggle('whole', !r);
    const box = r ? [r.left - 6, r.top - 6, r.width + 12, r.height + 12] : [0, 0, innerWidth, innerHeight];
    Object.assign(ring.style, { left: `${box[0]}px`, top: `${box[1]}px`, width: `${box[2]}px`, height: `${box[3]}px` });
    // The card: under what it points at, or over it; when neither fits, in the
    // bottom corner, away from the top of it (where its heading usually is).
    const ch = card.offsetHeight, cw = card.offsetWidth, gap = 14;
    let top, left = r ? Math.min(Math.max(12, r.left), innerWidth - cw - 12) : (innerWidth - cw) / 2;
    if (!r) top = (innerHeight - ch) / 2;
    else if (r.bottom + gap + ch < innerHeight - 8) top = r.bottom + gap;
    else if (r.top - gap - ch > 8) top = r.top - gap - ch;
    else { top = innerHeight - ch - 12; left = innerWidth - cw - 12; }
    card.style.top = `${Math.round(Math.max(12, top))}px`;
    card.style.left = `${Math.round(Math.max(12, left))}px`;
  };

  async function show(n) {
    stopWaiting();
    t.n = n;
    step = all[n];
    const last = n === all.length - 1;
    if (step.hash && !location.hash.startsWith(step.hash)) location.hash = step.hash;
    target = null;
    card.innerHTML = `<div class="tour-head"><span class="tour-count">${n + 1} of ${all.length}</span><button type="button" class="tour-x" data-tour="end" aria-label="Leave the tour" title="Leave the tour">✕</button></div>
      <h3>${step.title}</h3><div class="tour-body">${step.body}</div>
      <div class="tour-foot">${n ? '<button type="button" data-tour="back">Back</button>' : ''}<span class="spacer"></span>
        ${step.done ? '<button type="button" data-tour="next">Skip</button>' : `<button type="button" class="primary" data-tour="next">${last ? 'Finish' : 'Next'}</button>`}</div>`;
    // What it points at may take a moment to be drawn (the page changing, a toolbar showing once the note is in use).
    for (let tries = 0; tries < 40 && current(n); tries++) {
      // (Not on a phone: the cursor in a note opens it full screen, with the keyboard. That's left to a tap.)
      if (step.focus && KEYS) { const f = document.querySelector(step.focus); if (f && document.activeElement !== f) f.focus(); }
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

  card.addEventListener('click', e => {
    const act = e.target.closest('[data-tour]')?.dataset.tour;
    if (act === 'end') t.end(false);
    else if (act === 'back') show(t.n - 1);
    else if (act === 'next') t.n === all.length - 1 ? t.end(true) : show(t.n + 1);
  });
  // Esc on the card leaves the tour (elsewhere it steps out of notes and menus, as usual).
  const onEsc = e => { if (e.key === 'Escape' && card.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); t.end(false); } };
  addEventListener('keydown', onEsc, true);

  t.end = async finished => {
    stopWaiting();
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onEsc, true);
    ring.remove();
    card.remove();
    document.documentElement.classList.remove('touring');
    root.scrollPaddingTop = root.scrollPaddingBottom = '';
    if (tour === t) tour = null;
    if (!finished) return;
    // Finished: back to the start, and the "Take the tour" task ticked off.
    location.hash = '#/dump';
    const open = (await store.list('tasks')).filter(task => task.tour && !task.done_at);
    if (!open.length) return;
    for (const task of open) await store.update('tasks', task.id, doneFields(true));
    undoable('Ticked off: Take the tour of Sift', async () => { for (const task of open) await store.update('tasks', task.id, doneFields(false)); });
  };
  raf = requestAnimationFrame(place);
  show(0);
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
