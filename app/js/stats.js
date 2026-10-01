// Usage stats for the Sift server's owner (privacy.html). Settings, This device can turn them off.
//   track(kind, data)  something that happened once
//   feature(name)      one more use of a feature today
import * as store from './store.js';
import { VERSION } from './version.js';

export const STATS_SERVER = 'https://sift.hazymat.co.uk';
const KEY = 'sift_stats'; // { install, installed_at, ref, day, events, last_active, session_start }
const TICK_S = 5;
const IDLE_S = 60; // no tap, key or scroll for this long: not counted as using Sift
const SESSION_GAP_S = 30 * 60;
const SEND_EVERY_S = 5 * 60;
const MAX_EVENTS = 300; // kept while the server can't be reached

let state = null;
let lastInput = 0;
let sentAt = 0;
let changed = false;
const live = () => location.hostname === 'hazymat.github.io' && location.pathname.startsWith('/sift/');

function load() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { state = null; }
  return state;
}
function keep() { changed = true; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* counted for now only */ } }
const today = () => new Date().toLocaleDateString('en-CA');
function day() {
  if (state.day?.date !== today()) {
    if (state.day) state.pending_day = state.day; // yesterday's, until it has gone
    state.day = { date: today(), version: VERSION, active_s: 0, sessions: 0, session_s: [], first_area: null, areas: {}, hours: {}, made: {}, ticked: {}, features: {}, input: {}, errors: 0 };
  }
  return state.day;
}
const add = (bag, name, by = 1) => { bag[name] = (bag[name] || 0) + by; };

export function track(kind, data = {}) {
  if (!load()) return;
  state.events.push({ id: crypto.randomUUID(), at: new Date().toISOString(), kind, data });
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
  keep();
}
export function feature(name) {
  if (!load()) return;
  add(day().features, name);
  keep();
}
// From store.js: a record made or ticked off on this device (not the tour's examples, not another device's).
export function made(collection) {
  if (!load()) return;
  if (!state.first_made) { state.first_made = collection; track('first_made', { collection, after_s: Math.round((Date.now() - Date.parse(state.installed_at)) / 1000) }); }
  add(day().made, collection);
  keep();
}
export function ticked(collection) { if (load()) { add(day().ticked, collection); keep(); } }

// Which area is open: the first part of the address (Tasks' Projects counted on its own).
function area() {
  const [first, second] = location.hash.replace(/^#\/?/, '').split('/');
  if (first === 'tasks' && second === 'projects') return 'projects';
  return first || 'home';
}

// Every few seconds: if Sift is on screen and was used in the last minute, that's time spent.
function tick() {
  if (document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_S * 1000) return;
  const d = day();
  const now = Date.now();
  if (!state.last_active || now - state.last_active > SESSION_GAP_S * 1000) {
    d.sessions++;
    state.session_start = now;
    d.session_s.push(0);
    if (d.session_s.length > 50) d.session_s.shift();
  }
  state.last_active = now;
  d.active_s += TICK_S;
  if (d.session_s.length) d.session_s[d.session_s.length - 1] += TICK_S;
  d.first_area ||= area();
  add(d.areas, area(), TICK_S);
  add(d.hours, String(new Date().getHours()), TICK_S);
  keep();
  if (now - sentAt > SEND_EVERY_S * 1000) send();
}

function device() {
  const ua = navigator.userAgent;
  const kind = /iPad|Tablet/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet' : /Mobi|iPhone|Android/.test(ua) ? 'phone' : 'computer';
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other';
  const os = /iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { kind, browser, os };
}
const band = n => (n === 0 ? '0' : n < 10 ? '1-9' : n < 100 ? '10-99' : n < 1000 ? '100-999' : '1000+');

async function info(account) {
  const counts = await Promise.all(['thoughts', 'tasks', 'day_items', 'lists', 'list_items', 'items', 'recipes', 'contacts'].map(c => store.list(c).then(list => list.length, () => 0)));
  let storage = null;
  try { storage = Math.round(((await navigator.storage?.estimate())?.usage || 0) / 1e6); } catch { /* not known */ }
  const own = account && account.server === STATS_SERVER;
  let gcal = false;
  try { gcal = localStorage.getItem('sift-gcal') === '1'; } catch { /* not known */ }
  return Object.assign(device(), {
    version: VERSION,
    installed_at: state.installed_at,
    ref: state.ref,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    home_screen: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    theme: document.documentElement.dataset.theme || null,
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
    things: band(counts.reduce((a, b) => a + b, 0)),
    storage_mb: storage,
    sync: account ? (own ? 'this server' : 'another server') : 'off',
    gcal,
  });
}

// Sends the tally so far (and yesterday's, if it hasn't gone yet); keeps it all if the server can't be reached.
export async function send() {
  if (!load() || !live()) return;
  if ((await store.getDeviceSettings()).usage_stats === false) return dropWaiting();
  sentAt = Date.now();
  if (!changed && !state.events.length && !state.pending_day) return;
  const account = await store.metaGet('sync_account').catch(() => null);
  const token = account && account.server === STATS_SERVER ? account.token : undefined;
  const events = state.events.slice();
  const days = state.pending_day ? [state.pending_day, day()] : [day()];
  const facts = await info(account);
  try {
    for (const [n, d] of days.entries()) {
      // text/plain: no extra "may I" request first, and it still goes as the page closes
      const res = await fetch(`${STATS_SERVER}/api/stats/report`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ install: state.install, token, info: facts, day: d, events: n === days.length - 1 ? events : [] }) });
      if (!res.ok) return;
    }
  } catch { return; }
  state.events = state.events.filter(e => !events.includes(e));
  delete state.pending_day;
  keep();
  changed = false;
}

// Turning it off in Settings: what's waiting is dropped (the install id is kept, so turning it on again isn't a new install).
export function dropWaiting() {
  if (!load()) return;
  state.events = [];
  delete state.pending_day;
  keep();
}

// From app.js on every start. fresh: the first time Sift is opened on this device.
export function start(fresh) {
  if (!live()) return;
  if (!load()) {
    const query = new URLSearchParams(location.search);
    let ref = null;
    try { ref = query.get('ref') || (document.referrer && new URL(document.referrer).origin !== location.origin ? document.referrer.slice(0, 200) : null); } catch { /* none */ }
    state = { install: crypto.randomUUID(), installed_at: new Date().toISOString(), ref, events: [] };
    keep();
    track('install', { ref, fresh }); // fresh false: Sift was already in use before stats were counted
  }
  day();
  lastInput = Date.now();
  const used = ev => {
    lastInput = Date.now();
    if (ev.type === 'keydown' && !ev.target.closest?.('input, textarea, [contenteditable]:not([contenteditable="false"])')) add(day().input, 'keys');
    if (ev.type === 'pointerdown') add(day().input, ev.pointerType || 'mouse');
  };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']) addEventListener(type, used, { passive: true, capture: true });
  // Searching (any search box), dragging (hold.js / sortable.js mark the page while carrying).
  let searched = 0;
  addEventListener('input', ev => { if (ev.target.matches?.('input[type="search"]') && Date.now() - searched > 60000) { searched = Date.now(); feature('search'); } }, true);
  new MutationObserver(() => { if (document.body.classList.contains('is-dragging')) feature('drag'); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Something in Sift broke: the message and where, never what was on screen.
  const broke = (message, where) => {
    const d = day();
    if (d.errors++ < 20) track('error', { message: String(message || '').slice(0, 200), where: String(where || '').replace(location.origin, '').slice(0, 200), area: area() });
  };
  addEventListener('error', ev => broke(ev.message, ev.filename && `${ev.filename}:${ev.lineno}:${ev.colno}`));
  addEventListener('unhandledrejection', ev => broke(ev.reason?.message || ev.reason, ev.reason?.stack?.split('\n')[1]?.trim()));
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
  setInterval(tick, TICK_S * 1000);
  send();
}
