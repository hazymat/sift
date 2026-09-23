// Day Planner data: one `days` record per date (focus, energy, notes; id is
// the date so every device edits the same record) and `day_items`.

import * as store from './store.js';

export const DAY_DEFAULTS = {
  day_start: '08:30',
  day_end: '18:30',
  slot_min: 30,
  down_days: [0], // 0 = Sunday … 6 = Saturday
  hint_down_day: true,
  hint_walk_breaks: true,
  paper_style: 'notebook',
};

// Page styles for the planner (default in Settings, overridable per day).
export const PAPERS = [
  { id: 'notebook', label: 'Notebook' },
  { id: 'techie', label: 'Techie' },
  { id: 'dots', label: 'Dot journal' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'glass', label: 'Glass' },
];

export const ENERGY = [
  { id: 'high', label: 'High', hint: 'Big tidy-ups, starting big projects' },
  { id: 'medium', label: 'Medium', hint: 'Pottering jobs' },
  { id: 'low', label: 'Low', hint: 'Laptop work: coding, accounts, design' },
];

export async function daySettings() {
  const s = await store.getSettings();
  return { ...DAY_DEFAULTS, ...Object.fromEntries(Object.keys(DAY_DEFAULTS).filter(k => s[k] != null).map(k => [k, s[k]])) };
}

// ---------- dates and times (local, not UTC) ----------

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const showTime = t => { const [h, m] = t.split(':'); return `${Number(h)}.${m}`; }; // 8.30, as on paper

// "12.45 speak to L", "12:45-13:30 speak to L", "9.00 gym" → { time, end_time, title }
export function parseTimed(text) {
  const m = text.match(/^(\d{1,2})[.:](\d{2})(?:\s*[-–]\s*(\d{1,2})[.:](\d{2}))?[\s\t]+(.+)$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { time: null, end_time: null, title: text.trim() };
  const t = (h, mm) => `${String(Number(h)).padStart(2, '0')}:${mm}`;
  return { time: t(m[1], m[2]), end_time: m[3] ? t(m[3], m[4]) : null, title: m[5].trim() };
}

// ---------- records ----------

export async function getDay(date) {
  return (await store.get('days', date)) || { id: date, date, focus: '', energy: null, notes: '', paper: null };
}

// Saves run one at a time: two quick edits on a new day must not both create it.
let queue = Promise.resolve();
export function saveDay(date, fields) {
  const run = async () => {
    const existing = await store.get('days', date, { includeDeleted: true });
    return existing
      ? store.update('days', date, fields)
      : store.create('days', { id: date, date, focus: '', energy: null, notes: '', ...fields });
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || (a.sort_order ?? 0) - (b.sort_order ?? 0);

export async function itemsFor(date) {
  return (await store.list('day_items', { filter: i => i.date === date && !i.archived_at })).sort(byTime);
}

export async function addItem(date, fields) {
  const count = (await itemsFor(date)).length;
  return store.create('day_items', {
    date, title: '', notes: '', time: null, end_time: null, estimate_min: null, done_at: null,
    sort_order: count, task_id: null, case_id: null, contact_ids: [], source_thought_id: null, carried_from: null,
    ...fields,
  });
}

// Unfinished items from the last `days` days before `date`.
export async function unfinishedBefore(date, days = 7) {
  const from = addDays(date, -days);
  return (await store.list('day_items', { filter: i => i.date < date && i.date >= from && !i.done_at && !i.archived_at }))
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
}

// Dates between from and to (inclusive) that have anything planned or written.
export async function datesWithContent(from, to) {
  const out = new Set();
  for (const i of await store.list('day_items', { filter: i => i.date >= from && i.date <= to })) out.add(i.date);
  for (const d of await store.list('days', { filter: d => d.date >= from && d.date <= to && (d.focus || d.notes || d.energy) })) out.add(d.date);
  return out;
}
