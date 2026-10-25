// Kitchen timers (Batch Book's Follow along): count down or stopwatch, as many as you like, each a synced record
// in `timers` (your own space always), so closing Sift, a flat battery or another device loses nothing:
//   { name, kind: 'down' | 'up', length_ms, started, paused (ms or null), paused_ms, recipe_id, make_id, owner, title, step_id, step_no (the step that set it), device (the one that started it) }
// The time is always worked out from the clock (started, paused, paused_ms), never counted, so it survives anything.
// A countdown at 0 rings (sound, red pill) until it's dismissed (✕), which removes it everywhere.
// installTimers() adds the dock: the timers as pills at the bottom right of every page (Follow along shows its own).
// The ring here only works while Sift is open; alerts with Sift closed come from the server (push.js).

import * as store from './store.js';
import { askText } from './ask.js';
import { toast } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const RING_FRESH = 15 * 60e3; // a timer that finished longer ago than this shows as done but no longer sounds
const BACK_RING = 60e3; // with Sift in the background, it beeps this long
// Which devices beep: the one that started it, and any that had Follow along open since it started (the rest just show it red).
let followSeen = 0;
try { followSeen = +localStorage.getItem('sift_follow_seen') || 0; } catch {}
const seenFollow = now => { if (now - followSeen < 10e3) return; followSeen = now; try { localStorage.setItem('sift_follow_seen', String(now)); } catch {} };
const ringsHere = t => !t.device || t.device === store.getDeviceId() || followSeen > t.started;
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let timers = [];
const watchers = new Set();
let ticker = null;
let lastBeep = 0;
let audio = null;
let baseTitle = '';

export const elapsed = (t, now = Date.now()) => Math.max(0, (t.paused ?? now) - t.started - (t.paused_ms || 0));
export const leftOf = (t, now = Date.now()) => t.length_ms - elapsed(t, now);
export const ringing = (t, now = Date.now()) => t.kind === 'down' && leftOf(t, now) <= 0;
export const endsAt = t => (t.kind === 'down' && t.paused == null ? t.started + (t.paused_ms || 0) + t.length_ms : null);
export function clock(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60, s = secs % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export const lengthText = secs => (secs % 3600 === 0 ? `${secs / 3600} h` : secs % 60 === 0 && secs < 3600 ? `${secs / 60} min` : clock(secs));
// A countdown that has run out keeps counting how long it's been over: "0:00 (+2:35)".
const shown = (t, now) => (t.kind === 'down' ? (leftOf(t, now) <= 0 ? `${clock(0)} <span class="tm-over">(+${clock(Math.floor(-leftOf(t, now) / 1000))})</span>` : clock(Math.ceil(leftOf(t, now) / 1000))) : clock(Math.floor(elapsed(t, now) / 1000)));
export const list = () => timers;
export const watch = fn => { watchers.add(fn); return () => watchers.delete(fn); };
const changed = () => { if (bar) drawBar(); for (const fn of watchers) fn(timers); drawDock(); run(); };

async function load() {
  const all = await store.local.list('timers');
  timers = all.filter(t => !t.deleted_at && t.started).sort((a, b) => a.started - b.started);
  changed();
}

// The next free "Timer n".
export function nextName() {
  const used = timers.map(t => +(/^Timer (\d+)$/.exec(t.name || '') || [])[1] || 0);
  return `Timer ${Math.max(0, ...used) + 1}`;
}

export async function start({ name, kind = 'down', secs = 600, recipe_id = null, make_id = null, owner = null, title = '', step_id = null, step_no = null }) {
  unlockSound();
  const t = await store.local.create('timers', { name: name || nextName(), kind, length_ms: kind === 'down' ? secs * 1000 : 0, started: Date.now(), paused: null, paused_ms: 0, recipe_id, make_id, owner, title, step_id, step_no, device: store.getDeviceId() });
  await load();
  return t;
}
const put = async (t, changes) => { await store.local.update('timers', t.id, changes); await load(); };
export const pause = t => (t.paused == null && !ringing(t) ? put(t, { paused: Date.now() }) : null);
export const resume = t => (t.paused != null ? put(t, { paused: null, paused_ms: (t.paused_ms || 0) + Date.now() - t.paused }) : null);
// More (or less) time on a countdown; one that has rung starts again from now with the time added.
export function addTime(t, secs) {
  if (t.kind !== 'down') return null;
  const used = elapsed(t);
  const base = ringing(t) ? used : t.length_ms;
  // What was added or taken off is kept, so it can be taken back (base_ms: its length before the first change).
  return put(t, { length_ms: Math.max(used + 1000, base + secs * 1000), base_ms: t.base_ms ?? t.length_ms, added_ms: (t.added_ms || 0) + secs * 1000, muted: false });
}
// ↺ Revert, with Undo in the message (a tap by mistake gets the change back).
export async function undoTime(t) {
  if (t.base_ms == null) return;
  const was = { length_ms: t.length_ms, base_ms: t.base_ms, added_ms: t.added_ms || 0, muted: !!t.muted };
  await put(t, { length_ms: t.base_ms, base_ms: null, added_ms: 0 });
  toast(`${t.name} reverted`, { action: 'Undo', onAction: () => put(t, was) });
}
// What a changed countdown would show had it not been changed (counting down live in its menu's ↺ Revert to).
// Restart: back to its first length (before any change), from now, with Undo in the message.
export async function restart(t) {
  const was = { length_ms: t.length_ms, started: t.started, paused: t.paused, paused_ms: t.paused_ms || 0, base_ms: t.base_ms ?? null, added_ms: t.added_ms || 0, muted: !!t.muted };
  await put(t, { length_ms: t.base_ms ?? t.length_ms, started: Date.now(), paused: null, paused_ms: 0, base_ms: null, added_ms: 0, muted: false });
  toast(`${t.name} restarted`, { action: 'Undo', onAction: () => put(t, was) });
}
// Set to: the countdown shows exactly this much left (kept as a change, so ↺ Revert still goes back).
export function setTo(t, secs) {
  if (t.kind !== 'down') return null;
  const length_ms = elapsed(t) + secs * 1000;
  return put(t, { length_ms, base_ms: t.base_ms ?? t.length_ms, added_ms: (t.added_ms || 0) + length_ms - t.length_ms, muted: false });
}
const revertText = (t, now) => clock(Math.max(0, Math.ceil((t.base_ms - elapsed(t, now)) / 1000)));
const signed = ms => `${ms < 0 ? '−' : '+'}${lengthText(Math.round(Math.abs(ms) / 1000))}`;
// A rung countdown: silenced, it stays (with ✕ to remove it) and stops beeping.
export const mute = t => put(t, { muted: true });
export const dismiss = async t => { await store.local.remove('timers', t.id); await load(); };
// Remove timers, with Undo in the message (no asking first).
export async function removeAll(list) {
  for (const t of list) { await store.local.remove('timers', t.id); chosen.delete(t.id); }
  await load();
  toast(list.length === 1 ? `${list[0].name} removed` : `${list.length} timers removed`, { action: 'Undo', onAction: async () => { for (const t of list) await store.local.restore('timers', t.id); await load(); } });
}
export async function rename(t) {
  const name = await askText('Timer name', { value: t.name || '', ok: 'Save' });
  if (name != null) await put(t, { name: name.trim() || t.name });
}

// ---------- the pills ----------

// One timer as a pill: its time and name, ⏸ / ▶, and ✕ once it has rung. Tap the time for its menu; press and hold to choose several.
// recipe: also say which recipe it's for (Follow along with more than one open).
export function pillHtml(t, now = Date.now(), { recipe = false } = {}) {
  const ring = ringing(t, now);
  return `<span class="tm-pill${ring ? ' tm-ring' : ''}${ring && t.muted ? ' tm-muted' : ''}${menu?.id === t.id ? ' tm-open' : ''}${t.paused != null ? ' tm-paused' : ''}${chosen.has(t.id) ? ' tm-chosen' : ''}" data-timer="${t.id}">
    <button type="button" class="tm-main" data-tm="menu" title="More for this timer (press and hold to choose several)"><b class="tm-time" data-tm-time>${t.kind === 'up' ? '⏱ ' : ''}${shown(t, now)}</b><span class="tm-name">${ring ? `${esc(t.name)} · done` : esc(t.name)}${recipe && t.title ? ` · ${esc(t.title)}` : ''}</span></button>
    ${ring ? (t.muted ? '<button type="button" class="tm-btn" data-tm="dismiss" title="Remove this timer (Undo in the message)" aria-label="Remove">✕</button>' : '<button type="button" class="tm-btn" data-tm="mute" title="Silence it (it stays here, still counting)" aria-label="Silence">🔕</button>')
      : `<button type="button" class="tm-btn" data-tm="${t.paused != null ? 'resume' : 'pause'}" aria-label="${t.paused != null ? 'Carry on' : 'Pause'}" title="${t.paused != null ? 'Carry on' : 'Pause'}">${t.paused != null ? '▶' : '⏸'}</button>`}
  </span>`;
}
const STEPS = [[-300, '−5'], [-60, '−1'], [60, '+1'], [300, '+5']];

// Clicks on any timer pill (the dock, Follow along). While some are chosen, a tap chooses or unchooses.
// places: other recipes it could be moved to ([{ recipe_id, make_id, owner, title }], Follow along's open ones).
export function onClick(ev, { open, places = [] } = {}) {
  const b = ev.target.closest('[data-tm]');
  const pill = ev.target.closest('[data-timer]');
  if (!b || !pill) return false;
  const t = timers.find(x => x.id === pill.dataset.timer);
  if (!t) return true;
  unlockSound();
  if (held) { held = false; return true; } // the click that ends a press and hold
  if (chosen.size) { choose(t.id); return true; }
  const act = b.dataset.tm;
  if (act === 'pause') pause(t);
  else if (act === 'resume') resume(t);
  else if (act === 'dismiss') removeAll([t]);
  else if (act === 'mute') mute(t);
  else if (act === 'menu') { if (menu?.id === t.id) closeMenu(); else timerMenu(pill, t, open, places); } // tapped again: it closes
  return true;
}

// ---------- one timer's menu (a column under its pill) ----------

let menu = null;
const closeMenu = () => { menu?.close(); menu = null; document.querySelectorAll('.tm-open').forEach(x => x.classList.remove('tm-open')); };
function timerMenu(pill, t, open, places = []) {
  const others = places.filter(x => (x.make_id || x.recipe_id) !== (t.make_id || t.recipe_id));
  closeMenu();
  const box = document.createElement('div');
  box.className = 'tm-menu';
  box.setAttribute('role', 'menu');
  box.dataset.timerMenu = t.id;
  // Changed by the tiles: what it was set for and the change, with ↺ Revert to go back to it.
  // A summary: the time, its name and recipe, what it was set for and when; then any change, with ↺ Revert.
  const at = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const changes = x => (x.added_ms ? `<button type="button" role="menuitem" data-m="undo" class="tm-revert">↺ Revert to <b data-tm-revert>${revertText(x, Date.now())}</b></button>` : '');
  box.innerHTML = `<div class="tm-menu-head"><b data-tm-time>${shown(t, Date.now())}</b>
      <span class="tm-sum-line"><span class="tm-sum-name">${t.step_no ? `Step ${t.step_no}` : esc(t.name)}${t.title ? ` · ${esc(t.title)}` : ''}</span>${open && t.recipe_id && t.step_no ? `<button type="button" role="menuitem" data-m="step" class="tm-go">Go to step ${t.step_no} ›</button>` : ''}</span>
      <span class="tm-sum-set">${t.kind === 'down' ? `Set for ${lengthText(Math.round((t.base_ms ?? t.length_ms) / 1000))} at ${at(t.started)}` : `Started at ${at(t.started)}`}</span></div>
    <div class="tm-adjust">${t.kind === 'down' ? `<div class="tm-adjust-head">Change time <b class="tm-adjust-by">${t.added_ms ? signed(t.added_ms) : ''}</b></div><div class="tm-menu-steps">${STEPS.map(([secs, label]) => `<button type="button" role="menuitem" class="tm-tile${secs < 0 ? ' tm-less' : ''}" data-m="${secs}" aria-label="${label} min"><i>⏰</i><b>${label}</b><small>min</small></button>`).join('')}</div>` : ''}
    <div class="tm-adjust-foot"><span class="tm-changed"${t.added_ms ? '' : ' hidden'}>${changes(t)}</span><span class="tm-foot-row"><button type="button" role="menuitem" data-m="restart" class="tm-restart">↻ Restart</button>${t.kind === 'down' ? '<button type="button" role="menuitem" data-m="setto" class="tm-restart">⏲ Set to…</button>' : ''}</span></div></div>
<hr>
    ${open && t.recipe_id ? '<button type="button" role="menuitem" data-m="open">▶ Follow recipe</button>' : ''}
    ${others.length ? `<button type="button" role="menuitem" data-m="move" aria-expanded="false">➜ Move to another recipe</button><div class="tm-move" hidden>${others.map((x, n) => `<button type="button" role="menuitem" data-move="${n}">${esc(x.title || 'Untitled')}</button>`).join('')}</div>` : ''}
    <button type="button" role="menuitem" data-m="choose">☑ Choose several</button>
    <button type="button" role="menuitem" data-m="rename">✎ Rename timer</button>
    <button type="button" role="menuitem" data-m="remove" class="danger">✕ Remove timer</button>`;
  document.body.append(box);
  const place = () => {
    const anchor = [...document.querySelectorAll(`[data-timer="${t.id}"]`)].find(el => el.getClientRects().length) || pill; // the one showing (Follow along has a phone row too)
    const r = anchor.getBoundingClientRect(), room = visualViewport?.height ?? innerHeight;
    box.style.left = `${Math.max(8, Math.min(r.right - box.offsetWidth, document.documentElement.clientWidth - box.offsetWidth - 8))}px`;
    box.style.top = `${r.bottom + 6 + box.offsetHeight <= room - 8 ? r.bottom + 6 : Math.max(8, r.top - 6 - box.offsetHeight)}px`;
  };
  place();
  // Closes on a tap elsewhere or Esc only (not on scrolling: a tap on iPad can scroll the page under it).
  const outside = ev => { if (!box.contains(ev.target) && !ev.target.closest?.(`[data-timer="${t.id}"]`)) closeMenu(); };
  const keys = ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeMenu(); return; }
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && box.contains(document.activeElement)) {
      const all = [...box.querySelectorAll('button')];
      all[all.indexOf(document.activeElement) + (ev.key === 'ArrowUp' ? -1 : 1)]?.focus();
      ev.preventDefault(); ev.stopPropagation();
    }
  };
  addEventListener('pointerdown', outside, true);
  addEventListener('keydown', keys, true);
  const unwatch = watch(() => {
    const now = timers.find(x => x.id === t.id);
    if (!now) return closeMenu();
    const line = box.querySelector('.tm-changed');
    if (line && line.dataset.same !== `${now.added_ms || 0}`) { line.dataset.same = `${now.added_ms || 0}`; line.hidden = !now.added_ms; line.innerHTML = changes(now); const by = box.querySelector('.tm-adjust-by'); if (by) by.textContent = now.added_ms ? signed(now.added_ms) : ''; }
    document.querySelectorAll(`[data-timer="${t.id}"]`).forEach(x => x.classList.add('tm-open'));
    place();
  });
  box.addEventListener('click', ev => {
    const mv = ev.target.closest('[data-move]');
    if (mv) { const x = others[+mv.dataset.move], now = timers.find(y => y.id === t.id) || t; closeMenu(); put(now, { recipe_id: x.recipe_id || null, make_id: x.make_id || null, owner: x.owner || null, title: x.title || '' }); return toast(`${now.name} moved to ${x.title || 'Untitled'}`); }
    const b = ev.target.closest('[data-m]');
    if (!b) return;
    if (b.dataset.m === 'move') { const list = box.querySelector('.tm-move'); list.hidden = !list.hidden; b.setAttribute('aria-expanded', String(!list.hidden)); place(); return; }
    const now = timers.find(x => x.id === t.id) || t, what = b.dataset.m;
    if (/^-?\d+$/.test(what)) { addTime(now, +what); return; } // stays open, so +1 can be tapped again
    if (what === 'undo') { undoTime(now); return; }
    if (what === 'restart') { restart(now); return; } // stays open
    if (what === 'setto') { closeMenu(); newTimerSheet({}, { setFor: now }).then(secs => { if (secs) setTo(timers.find(x => x.id === now.id) || now, secs); }); return; }
    closeMenu();
    if (what === 'open') open(now);
    else if (what === 'step') open(now, { step: true });
    else if (what === 'rename') rename(now);
    else if (what === 'remove') removeAll([now]);
    else if (what === 'choose') choose(now.id);
  });
  document.querySelectorAll(`[data-timer="${t.id}"]`).forEach(x => x.classList.add('tm-open')); // the whole pill shows it's the one
  menu = { id: t.id, close: () => { box.remove(); unwatch(); removeEventListener('pointerdown', outside, true); removeEventListener('keydown', keys, true); } };
  if (matchMedia('(hover: hover)').matches) box.querySelector('button')?.focus({ preventScroll: true });
}

// ---------- choosing several (press and hold a pill, or ☑ Choose several) ----------

const chosen = new Set();
let held = false;
let bar = null;
function choose(id) {
  if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
  changed();
}
const clearChosen = () => { if (chosen.size) { chosen.clear(); changed(); } };
function drawBar() {
  for (const id of chosen) if (!timers.some(t => t.id === id)) chosen.delete(id);
  bar.hidden = !chosen.size;
  document.body.classList.toggle('has-timer-bar', !!chosen.size);
  if (!chosen.size) return;
  const sel = timers.filter(t => chosen.has(t.id)), downs = sel.filter(t => t.kind === 'down');
  bar.querySelector('.select-count').textContent = `${chosen.size} chosen`;
  bar.querySelector('[data-bar="all"]').hidden = chosen.size === timers.length;
  bar.querySelectorAll('[data-bar^="+"], [data-bar^="-"]').forEach(b => { b.hidden = !downs.length; });
  bar.querySelector('[data-bar="pause"]').hidden = !sel.some(t => t.paused == null && !ringing(t));
  bar.querySelector('[data-bar="resume"]').hidden = !sel.some(t => t.paused != null);
}
function installBar() {
  bar = document.createElement('div');
  bar.className = 'select-bar tm-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Chosen timers');
  bar.hidden = true;
  bar.innerHTML = `<button type="button" data-bar="clear" aria-label="Clear the choice (Esc)">✕</button><span class="select-count"></span>
    <button type="button" data-bar="all">All</button>${STEPS.map(([secs, label]) => `<button type="button" data-bar="${secs > 0 ? '+' : ''}${secs}">${label}</button>`).join('')}
    <button type="button" data-bar="pause">⏸ Pause</button><button type="button" data-bar="resume">▶ Carry on</button><button type="button" data-bar="remove" class="danger">Remove</button>`;
  document.body.append(bar);
  bar.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-bar]');
    if (!b) return;
    const what = b.dataset.bar, sel = timers.filter(t => chosen.has(t.id));
    if (what === 'clear') clearChosen();
    else if (what === 'all') { for (const t of timers) chosen.add(t.id); changed(); }
    else if (what === 'remove') removeAll(sel);
    else if (what === 'pause') for (const t of sel) await pause(t);
    else if (what === 'resume') for (const t of sel) await resume(t);
    else { for (const t of sel) await addTime(t, +what); toast(`${b.textContent} on ${sel.filter(t => t.kind === 'down').length === 1 ? '1 timer' : `${sel.filter(t => t.kind === 'down').length} timers`}`); }
  });
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && chosen.size && !document.querySelector('dialog[open]') && !menu) { ev.preventDefault(); ev.stopImmediatePropagation(); clearChosen(); } }, true);
  // Press and hold a pill to choose it (as cards everywhere).
  let hold = null;
  const cancel = () => { clearTimeout(hold); hold = null; };
  addEventListener('pointerdown', ev => {
    const pill = ev.target.closest?.('[data-timer]');
    if (!pill || ev.button > 0) return;
    held = false;
    const x = ev.clientX, y = ev.clientY;
    hold = setTimeout(() => { hold = null; held = true; closeMenu(); if (!chosen.has(pill.dataset.timer)) choose(pill.dataset.timer); navigator.vibrate?.(15); }, 480);
    const moved = e => { if (Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel(); };
    addEventListener('pointermove', moved, { passive: true });
    addEventListener('pointerup', () => { cancel(); removeEventListener('pointermove', moved); }, { once: true });
  }, true);
  addEventListener('pointercancel', cancel, true);
  addEventListener('contextmenu', ev => { if (ev.target.closest?.('[data-timer]')) ev.preventDefault(); }, true);
}

// ---------- ticking and ringing ----------

function tick() {
  const now = Date.now();
  let ring = false;
  for (const el of document.querySelectorAll('[data-timer]')) {
    const t = timers.find(x => x.id === el.dataset.timer);
    if (!t) continue;
    const r = ringing(t, now);
    if (r !== el.classList.contains('tm-ring')) { el.outerHTML = pillHtml(t, now, { recipe: el.querySelector('.tm-name')?.textContent.includes(' · ') }); continue; }
    const time = el.querySelector('[data-tm-time]');
    if (time) time.innerHTML = `${t.kind === 'up' ? '⏱ ' : ''}${shown(t, now)}`;
  }
  const head = document.querySelector('.tm-menu [data-tm-time]'), open = head && timers.find(x => x.id === head.closest('[data-timer-menu]').dataset.timerMenu);
  if (open) { head.innerHTML = shown(open, now); const back = document.querySelector('.tm-menu [data-tm-revert]'); if (back && open.base_ms != null) back.textContent = revertText(open, now); }
  if (document.body.classList.contains('follow-open') && !document.hidden) seenFollow(now);
  // In the background (another app, or the screen off) a finished timer beeps for a minute, then Sift lets go of the sound so it can't go on unseen.
  const fresh = document.hidden ? BACK_RING : RING_FRESH;
  for (const t of timers) if (ringing(t, now) && !t.muted && ringsHere(t) && now - (t.started + (t.paused_ms || 0) + t.length_ms) < fresh) ring = true;
  if (document.hidden && !ring && audio?.state === 'running' && !timers.some(t => t.paused == null && ringsHere(t) && !ringing(t, now))) audio.suspend().catch(() => {});
  if (ring && now - lastBeep > 2400) { lastBeep = now; beep(); navigator.vibrate?.([200, 100, 200]); }
  const done = timers.filter(t => ringing(t, now));
  if (done.length && !document.title.startsWith('⏰')) { baseTitle = document.title; document.title = `⏰ ${done[0].name} done`; }
  else if (!done.length && document.title.startsWith('⏰')) document.title = baseTitle || 'Sift';
}
function run() {
  if (timers.length && !ticker) ticker = setInterval(tick, 500);
  else if (!timers.length && ticker) { clearInterval(ticker); ticker = null; }
  tick();
}

// Sound has to be started from a tap once (iPhone), so any tap on a timer does that.
// iPhone and iPad: only a touchend or click starts it, and it can be 'interrupted' (not just 'suspended') after the
// screen locks or another app plays; a silent sound makes the start stick, and 'playback' plays past the silent switch.
let primed = false;
function unlockSound() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    if (audio.state !== 'running') audio.resume().catch(() => {});
    if (!primed) { const src = audio.createBufferSource(); src.buffer = audio.createBuffer(1, 1, 22050); src.connect(audio.destination); src.start(0); primed = true; }
  } catch { audio = null; }
}
function beep() {
  if (!audio) return;
  if (audio.state !== 'running') audio.resume().catch(() => {});
  const at = audio.currentTime;
  for (const [n, f] of [[0, 880], [0.22, 880], [0.44, 1175]]) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = f; o.type = 'triangle';
    g.gain.setValueAtTime(0.0001, at + n); g.gain.exponentialRampToValueAtTime(0.35, at + n + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + n + 0.18);
    o.connect(g).connect(audio.destination); o.start(at + n); o.stop(at + n + 0.2);
  }
}

// ---------- the dock (every page) ----------

let dock = null;
export function openTimerOf(t, { step = false } = {}) {
  const path = `#/recipes/${t.recipe_id}${t.make_id ? `/make/${t.make_id}` : ''}${t.owner ? `/from/${t.owner}` : ''}`;
  try { sessionStorage.setItem('sift_follow', t.make_id || t.recipe_id); if (step) sessionStorage.setItem('sift_follow_step', JSON.stringify({ id: t.step_id, no: t.step_no })); } catch {}
  if (location.hash === path) dispatchEvent(new CustomEvent('sift-follow')); else location.hash = path;
}
function drawDock() {
  if (!dock) return;
  dock.innerHTML = timers.map(t => pillHtml(t, Date.now(), { recipe: true })).join('');
  dock.hidden = !timers.length;
  document.body.classList.toggle('has-timers', !!timers.length);
}
export function installTimers() {
  document.head.append(Object.assign(document.createElement('style'), { textContent: TIMER_CSS }));
  dock = document.createElement('div');
  dock.id = 'timer-dock';
  dock.hidden = true;
  dock.setAttribute('aria-label', 'Timers');
  document.body.append(dock);
  installBar();
  dock.addEventListener('click', ev => onClick(ev, { open: openTimerOf }));
  for (const kind of ['touchend', 'click', 'keydown']) addEventListener(kind, () => unlockSound(), { capture: true, passive: true }); // any tap gets sound ready, before a timer runs out
  document.addEventListener('visibilitychange', () => tick()); // hidden: lets go of the sound once nothing can ring
  store.subscribe(ev => { if (!ev.collection || ev.collection === 'timers') load(); });
  load();
}

// ---------- the New timer sheet ----------

const WHEELS = [['h', 'hours', 24, 1], ['m', 'min', 60, 1], ['s', 'sec', 12, 5]];
const ROW = 44;
const QUICK = [120, 300, 600, 900, 1800];

// { name, secs, ...where } → starts a timer, or nothing when the sheet is closed.
// setFor (a timer): the same wheel as Set to, giving back the seconds picked instead of starting one.
export async function newTimerSheet(where = {}, { secs = 600, name = '', setFor = null } = {}) {
  if (setFor) secs = Math.max(5, Math.round(Math.max(0, leftOf(setFor)) / 5000) * 5) || 300;
  unlockSound();
  const dev = await store.getDeviceSettings();
  let kind = 'down';
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet tm-sheet';
  const wheel = ([k, unit, count, step]) => `<div class="tm-wheel"><div class="tm-col" data-wheel="${k}" data-step="${step}" tabindex="0" aria-label="${unit}"><div class="tm-roll">${Array.from({ length: count }, (_, n) => `<div class="tm-n">${k === 'h' ? n : String(n * step).padStart(2, '0')}</div>`).join('')}</div></div><span class="tm-unit">${unit}</span></div>`;
  dlg.innerHTML = `<div class="sheet-handle"></div>
    <form method="dialog">
      <div class="tm-sheet-head">${setFor ? `<h2>Set ${esc(setFor.name)} to</h2>` : '<h2>New timer</h2><span class="segmented"><button type="button" data-kind="down" aria-pressed="true">⏰ Count down</button><button type="button" data-kind="up" aria-pressed="false">⏱ Stopwatch</button></span>'}</div>
      <div class="tm-down"><div class="tm-picker"><div class="tm-band"></div>${WHEELS.map(wheel).join('')}</div>
      <div class="tm-quick">${QUICK.map(s => `<button type="button" data-quick="${s}">${lengthText(s)}</button>`).join('')}</div></div>
      ${setFor ? '' : `<label class="ask-field"><span>Name</span><input name="name" value="${esc(name || nextName())}" autocomplete="off" autocapitalize="sentences"></label>`}
      ${IOS && !setFor ? `<label class="tm-clock tm-down"><input type="checkbox" name="clock"${dev.timer_clock ? ' checked' : ''}> Also set it on this ${/iPad/.test(navigator.userAgent) ? 'iPad' : 'iPhone'}'s Clock app <button type="button" class="link-btn" data-act="clock-help">How to set this up</button></label>` : ''}
      <div class="sheet-actions"><button type="button" data-act="cancel">Cancel</button><span class="spacer"></span><button type="submit" class="primary tm-go">Start</button></div>
    </form>`;
  document.body.append(dlg);
  const cols = [...dlg.querySelectorAll('[data-wheel]')];
  const valueOf = col => Math.round(col.scrollTop / ROW) * +col.dataset.step;
  const total = () => cols.reduce((sum, c) => sum + valueOf(c) * ({ h: 3600, m: 60, s: 1 })[c.dataset.wheel], 0);
  const set = s => { const parts = { h: Math.floor(s / 3600), m: Math.floor(s / 60) % 60, s: Math.floor((s % 60) / 5) }; for (const c of cols) c.scrollTop = parts[c.dataset.wheel] * ROW; shade(); };
  const go = dlg.querySelector('.tm-go');
  function shade() {
    for (const c of cols) {
      const mid = c.scrollTop / ROW;
      [...c.querySelectorAll('.tm-n')].forEach((n, i) => { const d = Math.min(3, Math.abs(i - mid)); n.style.fontSize = `${1.75 - d * 0.28}rem`; n.style.opacity = String(1 - d * 0.3); });
    }
    const s = total();
    go.textContent = setFor ? `Set to ${clock(s)}` : kind === 'up' ? 'Start stopwatch' : `Start ${clock(s)}`;
    go.disabled = kind === 'down' && !s;
    for (const q of dlg.querySelectorAll('[data-quick]')) q.setAttribute('aria-pressed', String(+q.dataset.quick === s));
  }
  for (const c of cols) {
    c.addEventListener('scroll', () => requestAnimationFrame(shade), { passive: true });
    c.addEventListener('keydown', ev => { if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); c.scrollBy({ top: ev.key === 'ArrowUp' ? -ROW : ROW, behavior: 'smooth' }); } });
    c.addEventListener('click', ev => { const n = ev.target.closest('.tm-n'); if (n) c.scrollTo({ top: [...c.querySelectorAll('.tm-n')].indexOf(n) * ROW, behavior: 'smooth' }); });
  }
  let answer = null;
  dlg.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.kind) { kind = b.dataset.kind; for (const k of dlg.querySelectorAll('[data-kind]')) k.setAttribute('aria-pressed', String(k === b)); for (const d of dlg.querySelectorAll('.tm-down')) d.hidden = kind === 'up'; shade(); }
    else if (b.dataset.quick) { cols.forEach(c => { c.style.scrollBehavior = 'smooth'; }); set(+b.dataset.quick); }
    else if (b.dataset.act === 'cancel') dlg.close();
    else if (b.dataset.act === 'clock-help') clockHelp();
  });
  dlg.querySelector('form').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target.elements;
    answer = { kind, secs: total(), name: f.name?.value.trim() || '', clock: !!f.clock?.checked };
    dlg.close();
  });
  const closed = new Promise(resolve => dlg.addEventListener('close', () => { dlg.remove(); resolve(); }));
  dlg.showModal();
  set(secs);
  dlg.querySelector('[data-wheel="m"]').focus();
  await closed;
  if (!answer || (answer.kind === 'down' && !answer.secs)) return null;
  if (setFor) return answer.secs;
  if (IOS && answer.kind === 'down' && !!dev.timer_clock !== answer.clock) store.updateDeviceSettings({ timer_clock: answer.clock });
  const t = await start(Object.assign({}, where, { name: answer.name, kind: answer.kind, secs: answer.secs }));
  if (answer.clock && answer.kind === 'down') toClock(answer.secs);
  return t;
}

// The iPhone's own Clock timer, through a shortcut called "Sift timer" that starts a timer for the seconds it's given.
export const toClock = secs => { location.href = `shortcuts://run-shortcut?name=${encodeURIComponent('Sift timer')}&input=text&text=${secs}`; };
function clockHelp() {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet ask-sheet';
  dlg.innerHTML = `<div class="sheet-handle"></div><h2>Timers on the Clock app too</h2>
    <p class="muted">Sift can't start the Clock app's timer itself, but a shortcut can. Make it once:</p>
    <ol class="tm-steps"><li>Open the Shortcuts app and tap + for a new shortcut.</li><li>Search for <b>Start Timer</b> and add it.</li><li>Tap the number in it and choose <b>Shortcut Input</b>, then tap <b>minutes</b> and pick <b>seconds</b>.</li><li>Tap the name at the top, call it <b>Sift timer</b>, and tap Done.</li></ol>
    <p class="muted">Then tick "Also set it on the Clock app" when you start a timer. The Clock timer rings even when Sift is closed, but pausing or adding time in Sift doesn't change it.</p>
    <div class="sheet-actions"><span class="spacer"></span><button type="button" class="primary" data-act="ok">OK</button></div>`;
  document.body.append(dlg);
  dlg.querySelector('[data-act="ok"]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

export const TIMER_CSS = `
#timer-dock { position: fixed; right: 12px; bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 14px + var(--sel-lift) + var(--upd-lift)); z-index: 890; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; max-width: calc(100vw - 24px); }
#timer-dock[hidden], body.follow-open #timer-dock { display: none; }
@media (min-width: 768px) { #timer-dock { bottom: calc(20px + var(--sel-lift) + var(--upd-lift)); } }
body.has-timers .toast { margin-bottom: 52px; }
.tm-pill { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 3px; border-radius: 18px; background: var(--glass-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight), var(--shadow-sm); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur); font-variant-numeric: tabular-nums; max-width: 100%; }
.tm-pill .tm-main { display: flex; flex-direction: column; align-items: flex-start; gap: 0; padding: 3px 10px; background: none; box-shadow: none; line-height: 1.15; min-width: 0; text-align: left; }
.tm-time { font-size: 1.15rem; font-weight: 700; }
.tm-over { font-size: .8em; font-weight: 700; } /* how long a countdown has been over */
.tm-name { font-size: .74rem; color: var(--muted); max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-btn { width: 34px; height: 34px; padding: 0; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: .9rem; }
.tm-paused .tm-time { opacity: .55; }
@keyframes tm-flash { 30% { box-shadow: 0 0 0 5px var(--accent); transform: scale(1.06); } }
.tm-flash { animation: tm-flash .9s ease-in-out 2; }
.tm-chosen { box-shadow: 0 0 0 3px var(--accent), var(--shadow-sm); }
.tm-menu { position: fixed; z-index: 960; display: flex; flex-direction: column; gap: 4px; width: 250px; max-width: calc(100vw - 16px); padding: 8px; border-radius: 18px; background: color-mix(in srgb, var(--bg) 92%, transparent); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur); border: 1px solid var(--glass-border); box-shadow: var(--shadow); }
.tm-menu-head { display: flex; flex-direction: column; gap: 1px; padding: 2px 8px 6px; min-width: 0; }
.tm-menu-head b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.tm-menu-head span { color: var(--muted); font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-menu-head .tm-sum-name { color: var(--text); font-weight: 600; }
.tm-menu-head b { font-size: 1.6rem; line-height: 1.1; }
.tm-menu button { display: flex; align-items: center; justify-content: flex-start; width: 100%; min-height: 44px; padding: 0 14px; font-size: 1rem; letter-spacing: normal; word-spacing: normal; text-align: left; box-shadow: none; }
.tm-menu-head .tm-sum-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; overflow: visible; }
.tm-sum-line .tm-sum-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); font-weight: 600; }
.tm-menu .tm-go { flex: none; width: auto; min-height: 0; padding: 0; border: 0; background: none; color: var(--accent); font-size: .85rem; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
/* The tiles and ↺ Revert are one box: Revert takes back what the tiles changed. */
.tm-adjust { display: flex; flex-direction: column; padding: 6px; border-radius: 14px; background: color-mix(in srgb, var(--text) 5%, transparent); border: 1px solid var(--glass-border); }
.tm-adjust-head { display: flex; justify-content: space-between; padding: 0 4px 4px; font-size: .8rem; color: var(--muted); }
.tm-adjust-by { font-variant-numeric: tabular-nums; color: var(--text); }
.tm-menu-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 0; }
.tm-menu .tm-tile { flex-direction: column; justify-content: center; gap: 0; min-height: 62px; padding: 4px 0; border-radius: 14px; text-align: center; line-height: 1.05; font-variant-numeric: tabular-nums; background: color-mix(in srgb, rgb(52, 168, 83) 22%, var(--glass)); border: 1px solid color-mix(in srgb, rgb(52, 168, 83) 45%, transparent); }
.tm-menu .tm-tile.tm-less { background: color-mix(in srgb, rgb(230, 150, 40) 22%, var(--glass)); border-color: color-mix(in srgb, rgb(230, 150, 40) 45%, transparent); }
.tm-menu .tm-tile:hover:not(:disabled), .tm-menu .tm-tile:focus-visible { background: color-mix(in srgb, rgb(52, 168, 83) 38%, var(--glass)); }
.tm-menu .tm-tile.tm-less:hover:not(:disabled), .tm-menu .tm-tile.tm-less:focus-visible { background: color-mix(in srgb, rgb(230, 150, 40) 38%, var(--glass)); }
.tm-tile i { font-style: normal; font-size: .8rem; }
.tm-tile b { font-size: 1.2rem; font-weight: 800; }
.tm-tile small { font-size: .7rem; color: var(--muted); }
.tm-adjust-foot { display: flex; flex-direction: column; gap: 6px; }
.tm-menu-steps + .tm-adjust-foot { margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--glass-border); }
.tm-changed { display: flex; }
.tm-changed[hidden] { display: none; }
.tm-adjust-foot .tm-revert, .tm-adjust-foot .tm-restart { flex: 1 1 auto; justify-content: center; min-height: 44px; font-weight: 600; white-space: nowrap; }
.tm-foot-row { display: flex; gap: 6px; }
.tm-foot-row .tm-restart { flex: 1 1 0; padding: 0 8px; }
.tm-menu .tm-revert { min-height: 44px; font-weight: 600; }
.tm-revert b { margin-left: 6px; font-variant-numeric: tabular-nums; }
.tm-move { display: flex; flex-direction: column; gap: 4px; padding-left: 14px; }
.tm-menu hr { width: 100%; margin: 2px 0; border: 0; border-top: 1px solid var(--glass-border); }
.tm-menu [hidden] { display: none !important; }
.tm-pill .tm-main:hover:not(:disabled), .tm-pill .tm-main:active { background: none; }
@media (hover: hover) { .tm-pill:not(.tm-ring):hover { background: color-mix(in srgb, var(--text) 10%, var(--glass-strong)); } }
.tm-pill.tm-open:not(.tm-ring) { background: var(--active-bg); border-color: var(--active-border); }
.tm-ring.tm-open { box-shadow: 0 0 0 3px rgba(255, 140, 110, .9), var(--shadow-sm); } /* a finished one stays red while its menu is open */
.tm-ring.tm-muted { animation: none; background: rgba(230, 80, 55, .32); }
.tm-bar { z-index: 955; }
.tm-bar[hidden] { display: none; }
body.follow-open .tm-bar { bottom: calc(14px + var(--safe-bottom)); }
body.has-timer-bar #timer-dock { bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 72px + var(--upd-lift)); }
@media (min-width: 768px) { body.has-timer-bar #timer-dock { bottom: calc(78px + var(--upd-lift)); } }
.tm-ring { background: rgba(230, 80, 55, .5); border-color: rgba(255, 140, 110, .9); animation: tm-pulse 1s ease-in-out infinite; }
.tm-ring .tm-name { color: inherit; }
@keyframes tm-pulse { 50% { box-shadow: 0 0 0 6px rgba(255, 110, 80, .3); } }
@media (prefers-reduced-motion: reduce) { .tm-ring { animation: none; } }
.tm-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.tm-sheet-head h2 { margin: 0; }
.tm-picker { position: relative; display: flex; justify-content: center; height: ${ROW * 5}px; margin: 14px 0 10px; -webkit-mask-image: linear-gradient(transparent, #000 25%, #000 75%, transparent); mask-image: linear-gradient(transparent, #000 25%, #000 75%, transparent); }
.tm-band { position: absolute; left: 0; right: 0; top: ${ROW * 2}px; height: ${ROW}px; border-radius: 12px; background: color-mix(in srgb, var(--text) 9%, transparent); pointer-events: none; }
.tm-wheel { position: relative; width: 104px; height: 100%; }
.tm-col { height: 100%; overflow-y: auto; scroll-snap-type: y mandatory; scroll-padding-top: ${ROW * 2}px; scrollbar-width: none; overscroll-behavior: contain; outline: none; }
.tm-col::-webkit-scrollbar { display: none; }
.tm-roll { padding: ${ROW * 2}px 0; }
.tm-n { height: ${ROW}px; line-height: ${ROW}px; width: 52px; text-align: right; font-size: 1.45rem; font-weight: 600; scroll-snap-align: start; font-variant-numeric: tabular-nums; cursor: pointer; }
.tm-unit { position: absolute; top: ${ROW * 2}px; left: 60px; height: ${ROW}px; line-height: ${ROW}px; font-size: .9rem; font-weight: 600; pointer-events: none; }
.tm-col:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); border-radius: 12px; }
.tm-quick { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.tm-quick button[aria-pressed="true"] { background: var(--active-bg); border-color: var(--active-border); }
.tm-clock { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 10px 0 0; font-size: .9rem; color: var(--muted); }
.tm-clock input { width: 18px; height: 18px; accent-color: var(--accent); }
.tm-steps { padding-left: 1.3em; line-height: 1.5; }
.tm-steps li { margin: 4px 0; }
`;
