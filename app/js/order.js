// The order of things in a list, in a way that merges cleanly across devices.
//
// Each record can carry a `rank`: a short text key, and lists are sorted by
// it. Moving an item gives only that item a new key, one that sorts between
// its new neighbours' keys, so two devices moving different items never
// overwrite each other (each move is one field on one record), the same item
// moved on two devices ends up where the later move put it, and two items
// dropped into the same gap end up next to each other in the same order on
// every device (ties are broken by creation time, then id). There is always
// room between two keys, so nothing is ever renumbered.
//
// Records made before this (or never moved) have no rank: their old order
// number (`sort_order`, or whatever a list uses) is turned into a key on the
// fly, the same way on every device, so nothing needs converting.
//
//   keyBetween(a, b)            a key after a and before b (either may be null)
//   rankOf(rec, legacy?)        the key a record sorts by
//   byRank(legacy?)             a sort comparator
//   reorderWrites(rows, keyOf)  after a move: [[row, key]] for just the rows that need a new key
//   firstKey(recs, legacy?) / lastKey(…)   for adding at the top / bottom

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; // ascending in text order

// A key strictly between a and b (a may be '', b may be null for "no limit").
// Keys never end in '0', so there is always room in between.
function midpoint(a, b) {
  if (b !== null) {
    let n = 0;
    while ((a[n] || '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const da = a ? DIGITS.indexOf(a[0]) : 0;
  const db = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (db - da > 1) return DIGITS[Math.round((da + db) / 2)];
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[da] + midpoint(a.slice(1), null);
}

export function keyBetween(a, b) {
  a = a || '';
  b = b || null;
  if (b !== null && a >= b) throw new Error(`keyBetween: ${a} is not before ${b}`);
  return midpoint(a, b);
}

// An old order number as a key: fixed width, so text order = number order.
function legacyKey(x) {
  let v = Math.round(((Number(x) || 0) + 2e9) * 1e3);
  if (v < 0) v = 0;
  let s = '';
  for (let i = 0; i < 11; i++) { s = DIGITS[v % 62] + s; v = Math.floor(v / 62); }
  return `${s}V`;
}

const oldOrder = rec => rec.sort_order ?? 0;
export const rankOf = (rec, legacy = oldOrder) => rec.rank || legacyKey(legacy(rec));

export const byRank = (legacy = oldOrder) => (a, b) => {
  const ka = rankOf(a, legacy);
  const kb = rankOf(b, legacy);
  return ka < kb ? -1 : ka > kb ? 1 : (a.created_at || '').localeCompare(b.created_at || '') || String(a.id).localeCompare(String(b.id));
};

export const firstKey = (recs, legacy = oldOrder) => keyBetween(null, recs.length ? recs.map(r => rankOf(r, legacy)).sort()[0] : null);
export const lastKey = (recs, legacy = oldOrder) => keyBetween(recs.length ? recs.map(r => rankOf(r, legacy)).sort().at(-1) : null, null);

// The rows in their new order → new keys for as few rows as possible: the
// longest run of rows already in order keeps its keys; every other row gets a
// key between its new neighbours.
export function reorderWrites(rows, keyOf) {
  const keys = rows.map(keyOf);
  // Longest strictly increasing subsequence (patience sorting).
  const tails = [];
  const prev = new Array(keys.length).fill(-1);
  for (let i = 0; i < keys.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[tails[mid]] < keys[i]) lo = mid + 1; else hi = mid; }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const keep = new Set();
  for (let i = tails.at(-1) ?? -1; i >= 0; i = prev[i]) keep.add(i);
  const writes = [];
  let lower = null;
  for (let i = 0; i < rows.length; i++) {
    if (keep.has(i)) { lower = keys[i]; continue; }
    let j = i + 1;
    while (j < rows.length && !keep.has(j)) j++;
    const key = keyBetween(lower, j < rows.length ? keys[j] : null);
    writes.push([rows[i], key]);
    lower = key;
  }
  return writes;
}
