// Example things for the tours (tour.js): a lived-in Sift to look round, made
// when a tour starts and cleared away when it ends (store.js createDemo /
// clearDemo: this device only, never synced, never in History). Anything made
// by hand during the tour stays. What's made is demo/demo.json, with its
// photos in demo/: only fetched when a tour starts, never with an update.
// Its categories are shown but never saved (words.js setDemoTypes).
import * as store from './store.js';
import { isoDate, addDays } from './days.js';
import { keyBetween } from './order.js';
import { setDemoTypes } from './words.js';

const make = (collection, fields) => store.createDemo(collection, fields);
const now = () => new Date().toISOString();

// Photos come after the rest (the tour starts straight away); a set cleared meanwhile stops them.
let generation = 0;
let photoJobs = [];
const attachLater = (collection, id, names) => { if (names?.length) photoJobs.push(() => attach(collection, id, names)); };

// Photos from demo/, attached to a record as its own would be (their ids marked first: the file is saved before its record).
async function attach(collection, id, names = []) {
  const g = generation;
  const files = [], ids = [];
  for (const name of names) {
    try {
      const res = await fetch(`demo/${name}`);
      if (!res.ok) continue;
      files.push(new File([await res.blob()], name, { type: 'image/jpeg' }));
      ids.push(store.uuidv7());
    } catch { /* offline: it comes without the photo */ }
  }
  if (!files.length || g !== generation) return; // the tour ended while they were fetched
  for (const fileId of ids) store.markDemo(fileId);
  await (await import('./attachments.js')).addFiles({ collection, id }, files, ids);
}

// Clears any examples left from before, then makes a fresh set.
export async function seedDemo() {
  await clearDemo();
  const mine = generation;
  photoJobs = [];
  let d;
  try { d = await (await fetch('demo/demo.json')).json(); } catch { return; } // offline and never fetched: the tour runs on what's there
  const today = isoDate();
  const day = n => addDays(today, n || 0);
  const noon = n => `${day(n)}T12:00:00.000Z`;
  await setDemoTypes(d.categories || []);

  // ---------- Brain Dump (the first in the file on top) ----------
  const notes = {};
  let rank = (await store.list('thoughts')).map(t => t.rank).filter(Boolean).sort()[0] || null;
  for (const n of [...d.notes].reverse()) {
    rank = keyBetween(null, rank);
    const t = await make('thoughts', { title: n.body.split('\n')[0].slice(0, 80), body: n.body, kind: n.type || 'thought', pinned: !!n.pinned, converted_to: null, rank });
    if (n.key) notes[n.key] = t;
    attachLater('thoughts', t.id, n.photos);
  }

  // ---------- projects and tasks ----------
  const projects = {}, milestones = {}, tasks = {};
  let order = (await store.list('projects')).length;
  for (const p of d.projects || []) {
    projects[p.key] = await make('projects', { name: p.name, description: p.description || '', status: 'active', colour: null, sort_order: order++, due_date: null });
    let m = 0;
    for (const ms of p.milestones || []) milestones[ms.key] = await make('milestones', { project_id: projects[p.key].id, name: ms.name, due_date: ms.due == null ? null : day(ms.due), done_at: null, sort_order: m++ });
  }
  order = (await store.list('tasks')).length;
  for (const t of d.tasks || []) {
    const made = await make('tasks', {
      title: t.title, notes: t.notes || '', project_id: projects[t.project]?.id || null, milestone_id: milestones[t.milestone]?.id || null, parent_task_id: tasks[t.parent]?.id || null,
      status: t.done ? 'done' : 'todo', priority: 3, energy: t.energy || null, start_date: t.plan == null ? null : day(t.plan), aim_at: t.aim == null ? null : noon(t.aim), done_at: t.done ? now() : null,
      calendar_event_id: null, calendar_sync: 'none', recurrence_rule: null, repeat: t.repeat || null, horizon: t.list || 'inbox', estimate_min: t.minutes || null,
      source_thought_id: notes[t.from_note]?.id || null, source_scan_id: null, source_contract_id: null, contact_ids: [], case_id: null, sort_order: order++,
    });
    if (t.key) tasks[t.key] = made;
  }

  // ---------- Day Planner ----------
  let place = 0;
  for (const it of d.planner || []) {
    const made = await make('day_items', {
      date: day(it.day), title: it.title, notes: it.notes || '', time: it.time || null, end_time: it.until || null, energy: it.energy || null, estimate_min: null, estimate_unsure: false,
      done_at: it.done ? now() : null, dropped_at: null, sort_order: place++, task_id: null, case_id: null, contact_ids: [], source_thought_id: null, carried_from: null,
    });
    attachLater('day_items', made.id, it.photos);
  }

  // ---------- Lists ----------
  let when = Date.now();
  for (const l of d.lists || []) {
    const list = await make('lists', { name: l.name, kind: l.template ? 'template' : 'list', template_id: null, notes: '', sort_order: when++, used_at: null });
    let n = 0;
    for (const [text, got] of l.items) await make('list_items', { list_id: list.id, text, notes: '', parent_id: null, sort_order: n++, checked_at: got ? now() : null });
  }

  // ---------- Find Things: in the first life area there is, or a new one ----------
  if (d.places) {
    const all = await store.list('places');
    const area = all.find(p => p.kind === 'edition') || await make('places', { kind: 'edition', name: d.places.area || 'Home', parent_place_id: null, notes: '', sort_order: 0 });
    const group = await make('places', { kind: 'section', name: d.places.group, parent_place_id: area.id, location_note: '', notes: '', sort_order: all.filter(p => p.parent_place_id === area.id).length });
    let b = 0;
    for (const box of d.places.boxes || []) {
      const made = await make('places', { kind: 'box', name: box.name, label_code: '', parent_place_id: group.id, location_note: box.where || '', notes: '', sort_order: b++ });
      let i = 0;
      for (const [name, qty] of box.things) await make('items', { name, quantity: qty ?? null, place_id: made.id, parent_item_id: null, notes: '', sort_order: i++, last_moved_at: null });
      attachLater('places', made.id, box.photos);
    }
  }

  // ---------- Contacts, cases, contracts ----------
  for (const c of d.contacts || []) {
    await make('contacts', {
      name: c.name, kind: 'person', status: 'transient', category_ids: [], about: c.about || '', details: [], body: '', notes: '',
      research_status: null, rating: null, would_use_again: null, area_covered: '',
      captured_at: now(), source_thought_id: null, looked_up_at: [], last_contacted_at: null, pinned: false,
    });
  }
  for (const k of d.cases || []) await make('cases', { title: k.title, status: 'open', summary: k.summary || '', references: [], contact_ids: [], project_id: null, opened_at: now(), closed_at: null });
  for (const c of d.contracts || []) {
    await make('contracts', {
      name: c.name, category: c.category || 'other', provider: c.provider || '', provider_phone: '', provider_url: '', reference: '', covers: '',
      start_date: c.started == null ? null : day(c.started), end_date: null, renewal_date: c.renews == null ? null : day(c.renews), auto_renew: !!c.auto_renew, notice_days: c.notice_days ?? null,
      cost: c.cost ?? null, cost_frequency: c.frequency || 'monthly', payment_method_note: '', status: 'current',
      previous_contract_id: null, contact_id: null, custom_fields: [], notes: '',
    });
  }

  // ---------- Scans (photographed receipts) ----------
  for (const s of d.scans || []) {
    const task = tasks[s.task];
    const scan = await make('scans', { title: s.title, kind: s.kind || 'receipt', expiry_date: null, letter_date: null, summary: s.summary || '', note: '', linked: task ? { collection: 'tasks', id: task.id, title: task.title } : null });
    attachLater('scans', scan.id, [s.photo]);
  }

  // ---------- Recipe Archive (a recipe's book shows by itself; none is added to settings) ----------
  if (d.recipes?.length) {
    const { parseRecipes } = await import('./batchbook.js');
    for (const r of d.recipes) {
      for (const recipe of parseRecipes(r.text)) {
        const made = await make('recipes', Object.assign(recipe, { colour: null }));
        attachLater('recipes', made.id, r.photo ? [r.photo] : []);
      }
    }
  }

  // The photos, in the background: the page is drawn again once they're in.
  const jobs = photoJobs;
  (async () => {
    for (const job of jobs) { if (generation !== mine) return; await job(); }
    // Drawn again to show them, unless something's being typed (a redraw would take the cursor, and on a
    // phone the keyboard with it): then they show with the next redraw.
    const typing = document.activeElement?.matches?.('input, textarea, [contenteditable="true"]');
    if (generation === mine && jobs.length && !typing) dispatchEvent(new Event('sift:refresh'));
  })();
}

export async function clearDemo() {
  generation++;
  photoJobs = [];
  await setDemoTypes([]);
  return store.clearDemo();
}
