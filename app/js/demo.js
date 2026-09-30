// Example records for the tours (tour.js): a lived-in Sift to look round, made
// when a tour starts and cleared away when it ends (store.js createDemo /
// clearDemo: this device only, never synced, never in History). Anything made
// by hand during the tour stays. Dates are around today, so the Day Planner
// has something on today and in three days' time.
import * as store from './store.js';
import { isoDate, addDays } from './days.js';
import { keyBetween } from './order.js';
import { dumpTypes } from './words.js';

const make = (collection, fields) => store.createDemo(collection, fields);

// Clears any examples left from before, then makes a fresh set.
export async function seedDemo() {
  await store.clearDemo();
  const today = isoDate();
  const inDays = n => addDays(today, n);
  const at = n => `${inDays(n)}T12:00:00.000Z`;

  // ---------- Brain Dump ----------
  const kind = dumpTypes()[0]?.id || 'thought';
  let rank = null;
  const firstRank = (await store.list('thoughts')).map(t => t.rank).filter(Boolean).sort()[0] || null;
  for (const body of [
    'Wi-fi password for guests is on the back of the router',
    'Ring the dentist about moving Thursday',
    'Idea: a weekend in the Lake District in May? Ask Sam about dates',
    'Plumber Dave 07700 900123, fixed the boiler last winter',
    'Shopping: oat milk, bin bags, a birthday card for Mum',
  ]) {
    rank = keyBetween(null, rank || firstRank);
    await make('thoughts', { title: body.split('\n')[0].slice(0, 80), body, kind, pinned: body.startsWith('Wi-fi'), converted_to: null, rank });
  }

  // ---------- Tasks and a project ----------
  let order = (await store.list('tasks')).length;
  const task = fields => make('tasks', {
    title: '', notes: '', project_id: null, milestone_id: null, parent_task_id: null,
    status: 'todo', priority: 3, energy: null, start_date: null, aim_at: null, done_at: null,
    calendar_event_id: null, calendar_sync: 'none', recurrence_rule: null, horizon: 'inbox', estimate_min: null,
    source_thought_id: null, source_scan_id: null, source_contract_id: null, contact_ids: [], case_id: null, sort_order: order++,
    ...fields,
  });
  await task({ title: 'Renew the car insurance', horizon: 'now', energy: 'low', aim_at: at(3), notes: 'Compare at least two quotes first.' });
  await task({ title: 'Book the MOT', horizon: 'now', energy: 'low', start_date: today });
  await task({ title: 'Pay the window cleaner', horizon: 'now', energy: 'low', estimate_min: 5 });
  await task({ title: 'Sort out the loft', horizon: 'next', energy: 'high', estimate_min: 120 });
  await task({ title: 'Clear the garage for the bikes', horizon: 'next', energy: 'high' });
  await task({ title: 'Learn to make sourdough', horizon: 'later', energy: 'medium' });
  await task({ title: 'Look into solar panels', horizon: 'inbox' });
  const project = await make('projects', { name: 'Kitchen makeover', description: 'New worktops and a lick of paint before the summer.', status: 'active', colour: null, sort_order: (await store.list('projects')).length, due_date: null });
  const milestone = await make('milestones', { project_id: project.id, name: 'Worktops ordered', due_date: inDays(21), done_at: null, sort_order: 0 });
  const quotes = await task({ title: 'Get three quotes for the worktops', horizon: 'now', energy: 'medium', project_id: project.id, milestone_id: milestone.id });
  await task({ title: 'Measure the worktops', horizon: 'now', energy: 'low', project_id: project.id, parent_task_id: quotes.id, milestone_id: milestone.id });
  await task({ title: 'Choose paint colours', horizon: 'now', energy: 'low', project_id: project.id, done_at: new Date().toISOString(), status: 'done' });
  await task({ title: 'Book a decorator', horizon: 'next', energy: 'medium', project_id: project.id });

  // ---------- Day Planner: today and in three days ----------
  const item = (date, fields) => make('day_items', {
    date, title: '', notes: '', time: null, end_time: null, energy: null, estimate_min: null, estimate_unsure: false, done_at: null, dropped_at: null,
    sort_order: 0, task_id: null, case_id: null, contact_ids: [], source_thought_id: null, carried_from: null, ...fields,
  });
  await item(today, { title: 'Team call', time: '09:00', end_time: '09:30' });
  await item(today, { title: 'Lunch with Priya', time: '12:30', end_time: '13:30', notes: 'The new café on the high street' });
  await item(today, { title: 'Pick the kids up from football', time: '17:30', end_time: '18:00' });
  await item(today, { title: 'Post the parcel', sort_order: 1 });
  await item(today, { title: 'Water the tomatoes', sort_order: 2, done_at: new Date().toISOString() });
  await item(inDays(3), { title: 'Dentist', time: '10:00', end_time: '10:45', notes: 'Bring the new-patient form' });
  await item(inDays(3), { title: 'Buy a birthday card for Mum', sort_order: 1 });
  await item(inDays(3), { title: 'Gym', time: '18:00', end_time: '19:00', energy: 'high' });

  // ---------- Lists ----------
  const list = await make('lists', { name: 'Weekly shop', kind: 'list', template_id: null, notes: '', sort_order: Date.now(), used_at: null });
  let n = 0;
  for (const [text, got] of [['Oat milk', true], ['Bread', false], ['Apples', false], ['Bin bags', true], ['Coffee', false], ['Birthday card', false]]) {
    await make('list_items', { list_id: list.id, text, notes: '', parent_id: null, sort_order: n++, checked_at: got ? new Date().toISOString() : null });
  }
  const bag = await make('lists', { name: 'Swimming bag', kind: 'template', template_id: null, notes: '', sort_order: Date.now() + 1, used_at: null });
  n = 0;
  for (const text of ['Towel', 'Goggles', '£1 for the locker', 'Shampoo', 'A snack for after']) {
    await make('list_items', { list_id: bag.id, text, notes: '', parent_id: null, sort_order: n++, checked_at: null });
  }

  // ---------- Find Things: in the first life area there is (or a new one) ----------
  const places = await store.list('places');
  const area = places.find(p => p.kind === 'edition') || await make('places', { kind: 'edition', name: 'Home', parent_place_id: null, notes: '', sort_order: 0 });
  const group = await make('places', { kind: 'section', name: 'Loft and hall', parent_place_id: area.id, location_note: '', notes: '', sort_order: places.filter(p => p.parent_place_id === area.id).length });
  const box = async (name, where, things) => {
    const b = await make('places', { kind: 'box', name, label_code: '', parent_place_id: group.id, location_note: where, notes: '', sort_order: 0 });
    let i = 0;
    for (const [thing, qty] of things) await make('items', { name: thing, quantity: qty, place_id: b.id, parent_item_id: null, notes: '', sort_order: i++, last_moved_at: null });
  };
  await box('Christmas', 'Loft, left of the hatch', [['Fairy lights', 3], ['Baubles', null], ['Tree stand', null], ['Wrapping paper', null]]);
  await box('Hall drawer', 'Hall, under the mirror', [['Passports', 4], ['Spare house keys', null], ['AA batteries', 8], ['Torch', null]]);

  // ---------- Contacts and a case ----------
  const contact = fields => make('contacts', {
    name: '', kind: 'person', status: 'transient', category_ids: [], about: '', details: [], body: '', notes: '',
    research_status: null, rating: null, would_use_again: null, area_covered: '',
    captured_at: new Date().toISOString(), source_thought_id: null, looked_up_at: [], last_contacted_at: null, pinned: false, ...fields,
  });
  await contact({ name: 'Dave (plumber)', about: 'Fixed the boiler last winter. Reliable, fair prices.' });
  await contact({ name: 'Window cleaner', about: 'Comes every four weeks, cash or bank transfer.' });
  await make('cases', { title: 'Washing machine repair claim', status: 'open', summary: 'Broke two weeks after the warranty ran out. They said they would call back.', references: [], contact_ids: [], project_id: null, opened_at: new Date().toISOString(), closed_at: null });

  // ---------- Contracts ----------
  const contract = fields => make('contracts', {
    name: '', category: 'other', provider: '', provider_phone: '', provider_url: '', reference: '', covers: '',
    start_date: null, end_date: null, renewal_date: null, auto_renew: false, notice_days: null,
    cost: null, cost_frequency: 'monthly', payment_method_note: '', status: 'current',
    previous_contract_id: null, contact_id: null, custom_fields: [], notes: '', ...fields,
  });
  await contract({ name: 'Home insurance', provider: 'Example Insurance', start_date: inDays(-325), renewal_date: inDays(40), auto_renew: true, notice_days: 14, cost: 24.5 });
  await contract({ name: 'Mobile phone', provider: 'Example Mobile', start_date: inDays(-215), renewal_date: inDays(150), notice_days: 30, cost: 12 });
}

export const clearDemo = () => store.clearDemo();
