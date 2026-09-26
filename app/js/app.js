import * as store from './store.js';
import { installInlineEditing } from './inline.js';
import { installRefLinks } from './refs.js';
import { installHoldToOpen } from './holdopen.js';
import { installSheets } from './sheets.js';
import { installSearchClear } from './searchclear.js';
import { installFlash } from './flash.js';
import { mountSearch } from './search.js';
import { installViewCog } from './viewcog.js';
import { installDropdowns, installMenuFlip } from './dropdown.js';
import { installFileDrop } from './attachments.js';
import { word, applyWords } from './words.js';

// Adding an area is one entry here plus a view module (spec §5.1). Names come
// from the Dictionary (words.js), so people can call them what they like.
export const AREAS = [
  { id: 'dump', get label() { return word('area_dump'); }, icon: 'i-dump', view: './views/dump.js' },
  { id: 'tasks', get label() { return word('area_tasks'); }, icon: 'i-tasks', view: './views/tasks.js' },
  { id: 'planner', get label() { return word('area_planner'); }, icon: 'i-planner', view: './views/planner.js' },
  { id: 'lists', get label() { return word('area_lists'); }, icon: 'i-lists', view: './views/lists.js' },
  // Internally "places" (saved nav order etc. use it); the address is #/find-things.
  { id: 'places', slug: 'find-things', get label() { return word('area_places'); }, icon: 'i-places', view: './views/places.js' },
  { id: 'contacts', get label() { return word('area_contacts'); }, icon: 'i-contacts', view: './views/contacts.js' },
  { id: 'scans', get label() { return word('area_scans'); }, icon: 'i-scans', view: './views/scans.js' },
  { id: 'contracts', get label() { return word('area_contracts'); }, icon: 'i-contracts', view: './views/contracts.js' },
  { id: 'recipes', get label() { return word('area_recipes'); }, icon: 'i-recipes', view: './views/recipes.js' },
  { id: 'settings', label: 'Settings', icon: 'i-settings', view: './views/settings.js', pinnable: false },
  // Not in the nav: reached from each area's ⋯ menu and from Settings.
  { id: 'bin', label: 'Archive & Bin', icon: 'i-archive', view: './views/bin.js', pinnable: false, hidden: true },
  { id: 'history', label: 'History', icon: 'i-history', view: './views/history.js', pinnable: false, hidden: true },
];

export const MAX_PINNED = 4;
// The first one is where the app opens.
const DEFAULT_PINNED = ['dump', 'tasks', 'planner', 'lists'];
const OLD_DEFAULT = 'tasks,dump,places,scans'; // before 2026-09-24: moved to the new default

const $ = sel => document.querySelector(sel);
const area = id => AREAS.find(a => a.id === id || a.slug === id);
const path = a => a.slug || a.id; // what the address bar shows
const icon = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

let pinned = DEFAULT_PINNED;
let current = null;
let currentView = null;
let applyDensity = () => {};

export function pinnedAreas() {
  return pinned;
}

export async function setPinned(ids) {
  pinned = ids.filter(id => area(id)?.pinnable !== false).slice(0, MAX_PINNED);
  await store.updateSettings({ pinned_areas: pinned });
  renderNav();
}

// ---------- theme ----------

export const THEMES = [
  { id: 'blue', label: 'Glass' }, // id stays "blue" (saved on devices)
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'auto', label: 'Auto' },
];
const THEME_COLOURS = { blue: '#0f172a', dark: '#121316', light: '#eef2f8' };
const prefersLight = matchMedia('(prefers-color-scheme: light)');
let theme = 'blue';

function applyTheme() {
  const resolved = theme === 'auto' ? (prefersLight.matches ? 'light' : 'blue') : theme;
  document.documentElement.dataset.theme = resolved;
  $('meta[name="theme-color"]').content = THEME_COLOURS[resolved];
  try { localStorage.setItem('sift-theme', theme); } catch {} // read by index.html before first paint
}

export function currentTheme() {
  return theme;
}

export async function setTheme(id) {
  theme = THEMES.some(t => t.id === id) ? id : 'blue';
  applyTheme();
  await store.updateSettings({ theme });
}

// ---------- hints ----------
// The grey help text under lists and boxes ("Enter adds a task…") shows only
// when Settings → Appearance → Show hints is on (off at first). Settings' own
// explanations always show.
export function setHints(on) {
  document.documentElement.classList.toggle('show-hints', on);
}

// ---------- navigation ----------

function renderNav() {
  const more = AREAS.filter(a => !a.hidden && !pinned.includes(a.id));
  const activeInMore = more.some(a => a.id === current);

  // Bottom bar (phone): pinned areas + More.
  $('#tabbar').innerHTML = pinned.map(id => {
    const a = area(id);
    return `<a href="#/${path(a)}" class="tab" ${a.id === current ? 'aria-current="page"' : ''}>
      ${icon(a.icon)}<span>${a.label}</span></a>`;
  }).join('') + `<button type="button" class="tab" id="more-tab" ${activeInMore ? 'aria-current="page"' : ''}>
      ${icon(activeInMore ? area(current).icon : 'i-more')}<span>${activeInMore ? area(current).label : 'More'}</span></button>`;

  $('#more-list').innerHTML = more.map(a =>
    `<a href="#/${path(a)}" ${a.id === current ? 'aria-current="page"' : ''}>${icon(a.icon)}<span>${a.label}</span></a>`
  ).join('');

  // Top nav (laptop): everything, pinned first; overflow goes into a dropdown.
  const ordered = [...pinned.map(area), ...more];
  // The dropdown is refilled by fitTopNav; empty it first or old overflow
  // links get put back alongside the new ones (entries repeated).
  $('#topnav-more-menu').innerHTML = '';
  $('#topnav-links').innerHTML = ordered.map(a =>
    `<a href="#/${path(a)}" data-area="${a.id}" ${a.id === current ? 'aria-current="page"' : ''}>${icon(a.icon)}<span>${a.label}</span></a>`
  ).join('');
  fitTopNav();

  $('#more-tab').onclick = openMoreSheet;
}

// Move trailing links into the More dropdown until the top nav fits.
function fitTopNav() {
  const links = $('#topnav-links');
  const overflow = $('#topnav-overflow');
  const menu = $('#topnav-more-menu');
  links.append(...menu.children); // start from everything back in the bar
  overflow.hidden = true;
  if (!links.offsetParent) return; // top nav hidden (phone layout)
  while (links.scrollWidth > links.clientWidth && links.children.length > 1) {
    overflow.hidden = false;
    menu.prepend(links.lastElementChild);
  }
  const btn = $('#topnav-more');
  btn.toggleAttribute('aria-current', !!menu.querySelector('[aria-current]'));
}

function openMoreSheet() {
  const sheet = $('#more-sheet');
  if (!sheet.open) sheet.showModal();
}

// ---------- routing ----------

async function route(force = false) {
  const [id, ...rest] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const next = area(id);
  if (!next) {
    location.replace(`#/${path(area(pinned[0]))}`);
    return;
  }
  const sheet = $('#more-sheet');
  if (sheet.open) sheet.close();
  $('#topnav-more-menu').parentElement.removeAttribute('open');
  if (next.id === current && force !== true) {
    currentView?.route?.(rest); // same area, deeper path (e.g. a box)
    return;
  }

  current = next.id;
  renderNav();
  document.title = `${next.label} · Sift`;
  $('#page-title').textContent = next.label;

  currentView?.unmount?.();
  // A fresh #main for each page: the old one still carries the click handlers
  // of every page shown in it before, which would all fire again.
  const stale = $('#main');
  const main = stale.cloneNode(false);
  stale.replaceWith(main);
  main.dataset.area = next.id;
  applyDensity();
  const module = await import(next.view);
  if (current !== next.id) return; // navigated away while loading
  currentView = module.default;
  await currentView.mount(main, { store, app: appApi });
  if (rest.length) await currentView.route?.(rest);
}

const appApi = { AREAS, MAX_PINNED, pinnedAreas, setPinned, THEMES, currentTheme, setTheme, setHints, checkForUpdate, applyUpdate };

// ---------- header status ----------

async function renderSyncStatus() {
  const { status } = await import('./sync.js');
  const pill = $('#sync-status');
  const text = { off: 'Local only', idle: 'Sync on', syncing: 'Syncing…', ok: 'In sync', offline: 'Offline', error: 'Sync problem' }[status.state] || 'Local only';
  pill.textContent = status.state === 'ok' && status.pending ? `${status.pending} to sync` : text;
  pill.dataset.state = status.state;
  pill.title = status.state === 'off' ? `${await store.outboxSize()} changes stored on this device only` : status.error || text;
}

// ---------- service worker ----------

// Look for a new version now: 'ready' when one is waiting (it goes in when
// applyUpdate() is called or the banner's Reload is pressed), 'latest' when
// this is the newest, 'offline' when the server can't be reached.
export async function checkForUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return 'latest';
  try { await reg.update(); } catch { return 'offline'; }
  if (reg.installing) await new Promise(ok => { const w = reg.installing; w.addEventListener('statechange', () => { if (w.state !== 'installing') ok(); }); });
  return reg.waiting ? 'ready' : 'latest';
}
export async function applyUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg?.waiting) reg.waiting.postMessage('skip-waiting'); else location.reload();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // An app left open (the iPhone Home Screen app, say) looks for a new version
  // whenever it comes back to the front, at most once a minute.
  let lastCheck = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
  });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const offer = worker => {
      const banner = $('#update-banner');
      banner.hidden = false;
      banner.querySelector('button').onclick = () => worker.postMessage('skip-waiting');
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
  }).catch(err => console.warn('Offline support unavailable:', err.message));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

// ---------- boot ----------

async function boot() {
  await store.open();
  const settings = await store.getSettings();
  if (Array.isArray(settings.pinned_areas)) {
    pinned = settings.pinned_areas.filter(id => area(id)).slice(0, MAX_PINNED);
    if (pinned.join(',') === OLD_DEFAULT) pinned = DEFAULT_PINNED; // never changed by hand: take the new order
  }
  theme = THEMES.some(t => t.id === settings.theme) ? settings.theme : 'blue';
  setHints(!!settings.show_hints);
  applyTheme();
  prefersLight.addEventListener('change', applyTheme);

  // Ask once for persistent storage so the browser won't evict our data.
  if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
    navigator.storage.persist();
  }

  $('#more-sheet').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.close(); // backdrop tap
  });
  installInlineEditing();
  installRefLinks();
  installHoldToOpen();
  installSheets();
  installSearchClear();
  installFlash();
  installDropdowns();
  installMenuFlip();
  installFileDrop();
  // Search everything: the laptop's top bar, and the top of the phone's More list.
  {
    const top = $('#top-search');
    const topBox = $('#top-results');
    const topSearch = mountSearch(top, topBox, { onOpen: () => { topBox.hidden = true; top.blur(); } });
    document.addEventListener('pointerdown', ev => { if (!ev.target.closest('.top-search')) topBox.hidden = true; });
    // Clicking away shrinks it back to the round button, empty.
    $('.top-search').addEventListener('focusout', ev => {
      if (ev.relatedTarget && ev.currentTarget.contains(ev.relatedTarget)) return;
      setTimeout(() => { if (!$('.top-search').contains(document.activeElement)) { top.value = ''; topBox.hidden = true; topBox.innerHTML = ''; } }, 150);
    });
    const more = $('#more-search');
    const moreBox = $('#more-results');
    mountSearch(more, moreBox, {
      onShow: () => { $('#more-list').hidden = true; },
      onClear: () => { $('#more-list').hidden = false; },
      onOpen: () => { $('#more-sheet').close(); },
    });
    $('#more-sheet').addEventListener('close', () => { more.value = ''; moreBox.hidden = true; moreBox.innerHTML = ''; $('#more-list').hidden = false; });
    // Ctrl+K (⌘K) anywhere, or / when not typing (Find Things keeps its own /).
    addEventListener('keydown', ev => {
      const typing = ev.target.closest?.('input, textarea, select, [contenteditable="true"]');
      const k = (ev.key === 'k' || ev.key === 'K') && (ev.ctrlKey || ev.metaKey);
      const slash = ev.key === '/' && !typing && !location.hash.startsWith('#/find-things');
      if (!k && !slash) return;
      ev.preventDefault();
      if (top.offsetParent) { top.focus(); top.select(); topSearch.show(); }
      else { openMoreSheet(); more.focus(); }
    });
  }
  applyDensity = installViewCog(() => current);
  // A dropdown menu opens inside the screen: flipped to the other side if
  // it would run off the left or right edge.
  document.addEventListener('toggle', ev => {
    const d = ev.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    const m = d.querySelector(':scope > .menu');
    if (!m) return;
    m.style.left = '';
    m.style.right = '';
    const r = m.getBoundingClientRect();
    if (r.left < 8) { m.style.left = '0'; m.style.right = 'auto'; }
    else if (r.right > innerWidth - 8) { m.style.right = '0'; m.style.left = 'auto'; }
  }, true);
  // An open dropdown menu (<details class="tool-menu">) closes on a click elsewhere.
  document.addEventListener('pointerdown', ev => {
    for (const d of document.querySelectorAll('details.tool-menu[open]')) if (!d.contains(ev.target)) d.removeAttribute('open');
  }, true);
  addEventListener('hashchange', route);
  addEventListener('resize', fitTopNav);
  // Fit the areas again whenever the bar's room changes (fonts arriving, the search box settling).
  new ResizeObserver(() => fitTopNav()).observe($('.topnav'));
  document.fonts?.ready.then(fitTopNav);
  store.subscribe(renderSyncStatus);

  // What each energy level means (Settings → Your words → Dictionary) feeds the hover text everywhere.
  const days = await import('./days.js');
  await days.applyEnergyMeanings();
  let wordsSig = JSON.stringify(await applyWords());
  import('./link.js').then(m => m.installMirror()); // a task and its day items share title, note, energy, time, people, case
  // Words changed (Settings → Dictionary, or on another device): names and headings follow.
  store.subscribe(async change => {
    if (change?.collection !== 'settings') return;
    days.applyEnergyMeanings();
    const sig = JSON.stringify(await applyWords());
    if (sig === wordsSig) return;
    wordsSig = sig;
    renderNav();
    // (not while you're typing: redrawing the page would take the cursor away)
    if (!location.hash.startsWith('#/settings') && !document.activeElement?.closest('input, textarea, [contenteditable]')) route(true);
  });
  // Another device's changes arrived: the page you're on is updated in place
  // (what's open stays open, the page stays where it was scrolled to). Pages
  // without a refresh() are drawn again.
  const refreshPage = async () => {
    const y = scrollY;
    if (currentView?.refresh) await currentView.refresh(); else await route(true);
    requestAnimationFrame(() => scrollTo(0, y));
  };

  await route();
  renderSyncStatus();
  import('./install.js').then(m => m.showBanner());
  // Sync: runs in the background once signed in. When another device's
  // changes arrive, the page you're on is updated (unless you're typing).
  import('./sync.js').then(sync => {
    let was = null;
    let wasFiles = null;
    // Typing somewhere the page would redraw (a note being edited, a task's
    // title…): the update waits until you leave that box. Boxes the redraw
    // doesn't touch (the Brain Dump's new-note box, search, anything outside
    // the page) don't hold it up.
    const typing = () => {
      const a = document.activeElement?.closest('input, textarea, [contenteditable]');
      return !!a && !!a.closest('#main') && !a.closest('[data-sync-safe]');
    };
    let waiting = false;
    const update = () => {
      if (typing()) { waiting = true; return; }
      waiting = false;
      refreshPage().catch(err => console.warn('Refresh after sync failed:', err));
    };
    document.addEventListener('focusout', () => setTimeout(() => { if (waiting) update(); }, 50));
    sync.onStatus(st => {
      renderSyncStatus();
      // New records, or files that were "still arriving" now here: update the page.
      const records = was === 'syncing' && st.state === 'ok' && st.changed;
      const files = wasFiles === 'syncing' && st.files === 'idle' && st.filesArrived;
      if (records || files) update();
      was = st.state;
      wasFiles = st.files;
    });
    sync.init();
  });
  import('./bin.js').then(bin => bin.autoEmpty()).catch(err => console.warn('Bin clean-up failed:', err));
  registerServiceWorker();
}

boot().catch(err => {
  console.error(err);
  $('#main').innerHTML = `<div class="empty"><h2>Sift couldn't start</h2><p></p></div>`;
  $('#main .empty p').textContent = err.message;
});
