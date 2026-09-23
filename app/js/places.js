// Find Things data: editions → sections → boxes (all in `places`, told apart
// by `kind`) → items. Plus CSV import/export and search.

import * as store from './store.js';
import { parseCsvObjects, toCsv } from './csv.js';

export const CSV_COLUMNS = ['edition', 'section', 'box_code', 'box_name', 'box_location', 'box_notes', 'item', 'item_notes'];
const DEFAULT_EDITION = 'Standard';
const DEFAULT_SECTION = 'Boxes';

const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.created_at.localeCompare(b.created_at);
const same = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Everything in one pass, nested and sorted.
export async function loadTree() {
  const [places, items] = await Promise.all([store.list('places'), store.list('items')]);
  const children = new Map();
  for (const p of places) {
    const key = p.parent_place_id || null;
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(p);
  }
  const itemsByBox = new Map();
  for (const i of items) {
    if (!itemsByBox.has(i.place_id)) itemsByBox.set(i.place_id, []);
    itemsByBox.get(i.place_id).push(i);
  }
  const kids = id => (children.get(id) || []).sort(byOrder);
  return kids(null).filter(p => p.kind === 'edition').map(edition => ({
    ...edition,
    sections: kids(edition.id).map(section => ({
      ...section,
      boxes: kids(section.id).map(box => ({
        ...box,
        items: (itemsByBox.get(box.id) || []).sort(byOrder),
      })),
    })),
  }));
}

export function boxTitle(box) {
  return box.label_code ? `${box.label_code} · ${box.name}` : box.name;
}

// ---------- search ----------

// Plain substring match on every word, across codes, names, locations,
// notes and items. Full-text search across the app comes in step 9.
export function search(tree, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hit = text => words.every(w => text.toLowerCase().includes(w));
  const results = [];
  for (const edition of tree) {
    for (const section of edition.sections) {
      for (const box of section.boxes) {
        const path = [edition.name, section.name];
        const boxText = [box.label_code, box.name, box.location_note, box.notes].join(' ');
        const boxMatch = hit(boxText);
        // Words may be split between box and item ("BB microphone").
        const items = box.items.filter(i => hit(`${i.name} ${i.notes || ''}`) || (!boxMatch && hit(`${boxText} ${i.name} ${i.notes || ''}`)));
        if (boxMatch || items.length) results.push({ edition, section, box, items, path, boxMatch });
      }
    }
  }
  return results;
}

// ---------- import / export ----------

function normalise(row) {
  const pick = (...keys) => keys.map(k => row[k]).find(v => v != null && v !== '') || '';
  return {
    edition: pick('edition') || DEFAULT_EDITION,
    section: pick('section', 'area', 'group') || DEFAULT_SECTION,
    box_code: pick('box_code', 'label_code', 'code'),
    box_name: pick('box_name', 'box', 'name', 'desc'),
    box_location: pick('box_location', 'location', 'location_note'),
    box_notes: pick('box_notes'),
    item: pick('item', 'item_name', 'contents'),
    item_notes: pick('item_notes', 'notes'),
  };
}

// Merge a CSV into what's already here. Matching is by name (and code for
// boxes), so importing the same file twice doesn't create duplicates.
export async function importCsv(text) {
  const rows = parseCsvObjects(text).map(normalise).filter(r => r.box_name || r.box_code);
  const count = { editions: 0, sections: 0, boxes: 0, items: 0, skipped: 0 };
  const places = await store.list('places');
  const items = await store.list('items');
  const nextOrder = parentId => places.filter(p => (p.parent_place_id || null) === parentId).length;

  async function place(kind, parentId, match, fields) {
    let found = places.find(p => p.kind === kind && (p.parent_place_id || null) === parentId && match(p));
    if (found) return found;
    found = await store.create('places', { kind, parent_place_id: parentId, sort_order: nextOrder(parentId), ...fields });
    places.push(found);
    count[kind === 'box' ? 'boxes' : `${kind}s`]++;
    return found;
  }

  for (const r of rows) {
    const edition = await place('edition', null, p => same(p.name, r.edition), { name: r.edition, notes: '' });
    const section = await place('section', edition.id, p => same(p.name, r.section), { name: r.section, location_note: '', notes: '' });
    const box = await place('box', section.id,
      p => (r.box_code ? same(p.label_code, r.box_code) : !p.label_code && same(p.name, r.box_name)),
      { name: r.box_name || r.box_code, label_code: r.box_code, location_note: r.box_location, notes: r.box_notes });
    if (!r.item) continue;
    if (items.some(i => i.place_id === box.id && same(i.name, r.item))) { count.skipped++; continue; }
    const order = items.filter(i => i.place_id === box.id).length;
    items.push(await store.create('items', {
      name: r.item, place_id: box.id, notes: r.item_notes, quantity: null, sort_order: order, last_moved_at: null,
    }));
    count.items++;
  }
  return count;
}

export async function exportCsv() {
  const rows = [CSV_COLUMNS];
  for (const edition of await loadTree()) {
    for (const section of edition.sections) {
      for (const box of section.boxes) {
        const base = [edition.name, section.name, box.label_code, box.name, box.location_note, box.notes];
        if (!box.items.length) rows.push([...base, '', '']);
        for (const i of box.items) rows.push([...base, i.name, i.notes]);
      }
    }
  }
  return toCsv(rows);
}
