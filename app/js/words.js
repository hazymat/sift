// Your own words for the things Sift shows (Settings → Dictionary), and your
// Brain Dump types (Settings → Brain Dump types). Each word has a default; a
// word you've changed is kept in the synced settings under its key (empty =
// the default), so it follows you to your other devices.
//
//   word('list_inbox')  → "Task Dump", or what you called it
//   dumpTypes()         → [{ id, label }] in your order
//   applyWords()        → reload both from the settings (start-up, and when they change)

import * as store from './store.js';

export const WORDS = [
  { group: 'Areas', key: 'area_dump', default: 'Brain Dump', hint: 'Where you jot anything down. Some people like "Notes", "Inbox" or "Scratchpad".' },
  { group: 'Areas', key: 'area_tasks', default: 'Tasks', hint: 'Things to do: "To do", "Jobs"…' },
  { group: 'Areas', key: 'area_planner', default: 'Day Planner', hint: 'The page for one day: "Today", "My day"…' },
  { group: 'Areas', key: 'area_lists', default: 'Lists', hint: 'Packing lists, the weekly shop, checklists.' },
  { group: 'Areas', key: 'area_places', default: 'Find Things', hint: 'Where things are kept: "Storage", "Boxes"…' },
  { group: 'Areas', key: 'area_contacts', default: 'Contacts', hint: 'People, numbers and cases: "People", "Numbers"…' },
  { group: 'Areas', key: 'area_scans', default: 'Scans', hint: 'Photos of letters, receipts and documents.' },
  { group: 'Areas', key: 'area_contracts', default: 'Contracts', hint: 'Insurance, utilities, subscriptions: "Bills", "Policies"…' },
  { group: 'Areas', key: 'area_recipes', default: 'Batch Book', hint: 'Recipes and batches: "Recipes", "Brewing"…' },

  { group: 'Task lists', key: 'list_inbox', default: 'Task Dump', hint: "Where new tasks land before you've decided when to do them: \"Inbox\", \"To sort\"…" },
  { group: 'Task lists', key: 'list_now', default: 'Now', hint: 'What you are working on these days: "This week", "Doing"…' },
  { group: 'Task lists', key: 'list_next', default: 'Next', hint: 'What comes after: "Soon", "Next week"…' },
  { group: 'Task lists', key: 'list_later', default: 'Later', hint: 'One day: "Someday", "Maybe"…' },

  { group: 'Energy levels', key: 'energy_low', default: 'Desk work, small tasks, admin', hint: 'What a ⚡ low-energy day, or a task that needs little energy, means for you. Shown when you hover over or hold the ⚡.' },
  { group: 'Energy levels', key: 'energy_medium', default: 'Meetings, some project work', hint: 'What ⚡⚡ medium energy means for you.' },
  { group: 'Energy levels', key: 'energy_high', default: 'Physically active work, starting new projects', hint: 'What ⚡⚡⚡ high energy means for you.' },

  { group: 'Day Planner', key: 'day_focus', default: 'Day focus', hint: 'The line at the top of each day for what matters most: "Main thing", "Intention"…' },
  { group: 'Day Planner', key: 'day_focus_prompt', default: 'What matters today?', hint: 'The grey prompt in that line before you type.' },
  { group: 'Day Planner', key: 'day_schedule', default: 'Schedule', hint: 'The heading over the timed plan: "Plan", "Timeline"…' },
  { group: 'Day Planner', key: 'day_tasks', default: 'Tasks', hint: 'The heading over the day\'s own tasks: "To do today"…' },
  { group: 'Day Planner', key: 'day_notes', default: 'Notes', hint: 'The heading over the day\'s notes: "Journal", "Log"…' },

  { group: 'Brain Dump', key: 'dump_new', default: 'New note', hint: 'The heading over the box where you write something new.' },
  { group: 'Brain Dump', key: 'dump_mine', default: 'Your notes', hint: 'The heading over everything you have written.' },
  { group: 'Brain Dump', key: 'dump_kind', default: 'This is a:', hint: 'The words before the types (Thought, Idea…) when you write a new note.' },
];

export const DEFAULT_TYPES = [
  { id: 'thought', label: 'Thought' },
  { id: 'idea', label: 'Idea' },
  { id: 'task', label: 'Task' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'journal', label: 'Journal' },
  { id: 'place_item', label: 'Thing to store' },
];

const defaults = Object.fromEntries(WORDS.map(w => [w.key, w.default]));
let custom = {};
let types = DEFAULT_TYPES;

export const word = key => custom[key] || defaults[key] || key;
export const isCustom = key => !!custom[key];
export const dumpTypes = () => types;

export async function applyWords() {
  const s = await store.getSettings();
  custom = {};
  for (const w of WORDS) {
    const v = String(s[w.key] ?? '').trim();
    if (v && v !== w.default) custom[w.key] = v;
  }
  types = Array.isArray(s.dump_types) && s.dump_types.length ? s.dump_types.filter(t => t?.id && t.label) : DEFAULT_TYPES;
  return { custom, types };
}

// Save one word (empty or the default = back to the default).
export async function setWord(key, text) {
  const v = String(text ?? '').trim();
  await store.updateSettings({ [key]: !v || v === defaults[key] ? null : v });
  await applyWords();
}

export async function setDumpTypes(list) {
  const same = JSON.stringify(list) === JSON.stringify(DEFAULT_TYPES);
  await store.updateSettings({ dump_types: same ? null : list });
  await applyWords();
}
