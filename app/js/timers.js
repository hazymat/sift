// Kitchen timers (Batch Book's Follow along): count down or stopwatch, as many as you like, each a synced record
// in `timers` (your own space always), so closing Sift, a flat battery or another device loses nothing:
//   { name, kind: 'down' | 'up', length_ms, started, paused (ms or null), paused_ms, recipe_id, make_id, owner, title }
// The time is always worked out from the clock (started, paused, paused_ms), never counted, so it survives anything.
// A countdown at 0 rings (sound, red pill) until it's dismissed (✕), which removes it everywhere.
// installTimers() adds the dock: the timers as pills at the bottom right of every page (Follow along shows its own).
// The ring here only works while Sift is open; alerts with Sift closed come from the server (push.js).

import * as store from './store.js';
import { pillMenu } from './pillmenu.js';
import { askText } from './ask.js';
import { toast } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const RING_FRESH = 15 * 60e3; // a timer that finished longer ago than this shows as done but no longer sounds
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
const shown = (t, now) => (t.kind === 'down' ? clock(Math.max(0, Math.ceil(leftOf(t, now) / 1000))) : clock(Math.floor(elapsed(t, now) / 1000)));
export const list = () => timers;
export const watch = fn => { watchers.add(fn); return () => watchers.delete(fn); };
const changed = () => { for (const fn of watchers) fn(timers); drawDock(); run(); };

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

export async function start({ name, kind = 'down', secs = 600, recipe_id = null, make_id = null, owner = null, title = '' }) {
  unlockSound();
  const t = await store.local.create('timers', { name: name || nextName(), kind, length_ms: kind === 'down' ? secs * 1000 : 0, started: Date.now(), paused: null, paused_ms: 0, recipe_id, make_id, owner, title });
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
  return put(t, { length_ms: Math.max(used + 1000, base + secs * 1000) });
}
export const dismiss = async t => { await store.local.remove('timers', t.id); await load(); };
export async function rename(t) {
  const name = await askText('Timer name', { value: t.name || '', ok: 'Save' });
  if (name != null) await put(t, { name: name.trim() || t.name });
}

// ---------- the pills ----------

// One timer as a pill: its time and name, ⏸ / ▶, and ✕ once it has rung. Tap the name for +1, +5, −1 min, rename, remove.
// recipe: also say which recipe it's for (Follow along with more than one open).
export function pillHtml(t, now = Date.now(), { recipe = false } = {}) {
  const ring = ringing(t, now);
  return `<span class="tm-pill${ring ? ' tm-ring' : ''}${t.paused != null ? ' tm-paused' : ''}" data-timer="${t.id}">
    <button type="button" class="tm-main" data-tm="menu" title="More for this timer"><b class="tm-time" data-tm-time>${t.kind === 'up' ? '⏱ ' : ''}${shown(t, now)}</b><span class="tm-name">${ring ? `${esc(t.name)} · done` : esc(t.name)}${recipe && t.title ? ` · ${esc(t.title)}` : ''}</span></button>
    ${ring ? '<button type="button" class="tm-btn" data-tm="dismiss" title="Stop the alarm and remove this timer" aria-label="Stop">✕</button>'
      : `<button type="button" class="tm-btn" data-tm="${t.paused != null ? 'resume' : 'pause'}" aria-label="${t.paused != null ? 'Carry on' : 'Pause'}" title="${t.paused != null ? 'Carry on' : 'Pause'}">${t.paused != null ? '▶' : '⏸'}</button>`}
  </span>`;
}

// Clicks on any timer pill (the dock, Follow along).
export function onClick(ev, { open } = {}) {
  const b = ev.target.closest('[data-tm]');
  const pill = ev.target.closest('[data-timer]');
  if (!b || !pill) return false;
  const t = timers.find(x => x.id === pill.dataset.timer);
  if (!t) return true;
  unlockSound();
  const act = b.dataset.tm;
  if (act === 'pause') pause(t);
  else if (act === 'resume') resume(t);
  else if (act === 'dismiss') dismiss(t);
  else if (act === 'menu') {
    const down = t.kind === 'down';
    pillMenu(b, [
      ...(open && t.recipe_id ? [{ value: 'open', label: '🥄 Open its recipe' }] : []),
      ...(down ? [{ value: 60, label: '+1 min' }, { value: 300, label: '+5 min' }, { value: -60, label: '−1 min' }] : []),
      { value: 'rename', label: '✎ Rename' }, { value: 'remove', label: '✕ Remove' },
    ], v => {
      if (v === 'open') open(t);
      else if (v === 'rename') rename(t);
      else if (v === 'remove') dismiss(t).then(() => toast(`${t.name} removed`));
      else addTime(t, v);
    });
  }
  return true;
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
    if (time) time.textContent = `${t.kind === 'up' ? '⏱ ' : ''}${shown(t, now)}`;
  }
  for (const t of timers) if (ringing(t, now) && now - (t.started + (t.paused_ms || 0) + t.length_ms) < RING_FRESH) ring = true;
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
function unlockSound() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
}
function beep() {
  if (!audio) return;
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
export function openTimerOf(t) {
  const path = `#/recipes/${t.recipe_id}${t.make_id ? `/make/${t.make_id}` : ''}${t.owner ? `/from/${t.owner}` : ''}`;
  try { sessionStorage.setItem('sift_follow', t.make_id || t.recipe_id); } catch {}
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
  dock.addEventListener('click', ev => onClick(ev, { open: openTimerOf }));
  addEventListener('pointerdown', () => { if (timers.length) unlockSound(); }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  store.subscribe(ev => { if (!ev.collection || ev.collection === 'timers') load(); });
  load();
}

// ---------- the New timer sheet ----------

const WHEELS = [['h', 'hours', 24, 1], ['m', 'min', 60, 1], ['s', 'sec', 12, 5]];
const ROW = 44;
const QUICK = [120, 300, 600, 900, 1800];

// { name, secs, ...where } → starts a timer, or nothing when the sheet is closed.
export async function newTimerSheet(where = {}, { secs = 600, name = '' } = {}) {
  unlockSound();
  const dev = await store.getDeviceSettings();
  let kind = 'down';
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet tm-sheet';
  const wheel = ([k, unit, count, step]) => `<div class="tm-wheel"><div class="tm-col" data-wheel="${k}" data-step="${step}" tabindex="0" aria-label="${unit}"><div class="tm-roll">${Array.from({ length: count }, (_, n) => `<div class="tm-n">${k === 'h' ? n : String(n * step).padStart(2, '0')}</div>`).join('')}</div></div><span class="tm-unit">${unit}</span></div>`;
  dlg.innerHTML = `<div class="sheet-handle"></div>
    <form method="dialog">
      <div class="tm-sheet-head"><h2>New timer</h2><span class="segmented"><button type="button" data-kind="down" aria-pressed="true">⏲ Count down</button><button type="button" data-kind="up" aria-pressed="false">⏱ Stopwatch</button></span></div>
      <div class="tm-down"><div class="tm-picker"><div class="tm-band"></div>${WHEELS.map(wheel).join('')}</div>
      <div class="tm-quick">${QUICK.map(s => `<button type="button" data-quick="${s}">${lengthText(s)}</button>`).join('')}</div></div>
      <label class="ask-field"><span>Name</span><input name="name" value="${esc(name || nextName())}" autocomplete="off" autocapitalize="sentences"></label>
      ${IOS ? `<label class="tm-clock tm-down"><input type="checkbox" name="clock"${dev.timer_clock ? ' checked' : ''}> Also set it on this ${/iPad/.test(navigator.userAgent) ? 'iPad' : 'iPhone'}'s Clock app <button type="button" class="link-btn" data-act="clock-help">How to set this up</button></label>` : ''}
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
    go.textContent = kind === 'up' ? 'Start stopwatch' : `Start ${clock(s)}`;
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
    answer = { kind, secs: total(), name: f.name.value.trim(), clock: !!f.clock?.checked };
    dlg.close();
  });
  const closed = new Promise(resolve => dlg.addEventListener('close', () => { dlg.remove(); resolve(); }));
  dlg.showModal();
  set(secs);
  dlg.querySelector('[data-wheel="m"]').focus();
  await closed;
  if (!answer || (answer.kind === 'down' && !answer.secs)) return null;
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
.tm-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 3px; border-radius: 18px; background: var(--glass-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight), var(--shadow-sm); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur); font-variant-numeric: tabular-nums; max-width: 100%; }
.tm-pill .tm-main { display: flex; flex-direction: column; align-items: flex-start; gap: 0; padding: 3px 10px; background: none; box-shadow: none; line-height: 1.15; min-width: 0; text-align: left; }
.tm-time { font-size: 1.15rem; font-weight: 700; }
.tm-name { font-size: .74rem; color: var(--muted); max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-btn { width: 34px; height: 34px; padding: 0; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: .9rem; }
.tm-paused .tm-time { opacity: .55; }
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
