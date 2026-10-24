// Multi App Item Browsing with Keyboard. At an area's top level (nothing being
// edited: where ← / → change tabs and Ctrl+← / → change areas):
//   ↑, Esc   do nothing here (Esc still steps back from a record's page,
//            and clears a search left in the search box)
//   ↓        Tasks / Day Planner / an open list / a box: start editing the first
//            entry (Tasks and Lists with their new line at the top: that line) (↑ / ↓ then
//            walk the list, as while editing). Elsewhere: into the search box
//            above the items, if there is one; ↓ again starts browsing.
//            With nothing in the list yet, ↓ does what Enter does.
//   Enter    start typing a new one (New task, New note, Add items…)
// Browsing: one item is highlighted (.kb-cur, the same look in every area).
//   ← / →    previous / next item
//   ↑ / ↓    the item above / below, at about the same place across
//            (↑ from the top row goes back to the search box; in Brain
//            Dump, ↑ again goes up into New note, where the arrows are the
//            note's own until Esc)
//   Enter    open it: edit it (cursor at the end), or go into it
//   Alt+Enter  the same, going one level further in: a note opens full
//            screen (in a note being written, Alt+Enter does that too;
//            richtext.js). At the top level: a new one, full screen.
//   Esc      stop browsing. After editing an item, Esc leaves the editing and
//            the same item is highlighted again; Esc once more stops. With
//            items selected, Esc also clears the selection (the view's own Esc).
//   Shift+← / → / ↑ / ↓  select: every item from where it began to the one
//            moved to (the area's selection bar, listkit.js: 'browse-select')
// A click anywhere, or changing page, stops browsing too.
// Rows edited in place (Tasks, the Day Planner, an open list, a box's things):
// Esc out of a row's name leaves that row highlighted, as in Brain Dump, so ↑ / ↓
// carry on from there, Enter edits it again, Shift+↑ / ↓ choose rows, and Esc
// once more stops. ← / → there are the area's own (tabs, days), not the rows.
// Areas with a filter bar (Brain Dump's All / Thought / Idea…, Scans' kinds,
// Contracts' Current / Ended…, the Lists page's Lists / Templates) have it as a
// layer between the search box and the items: ↓ from the search box (or ← / →
// at the top level) highlights the filter showing; ← / → switch filter there
// and then (at either end: a flash, nothing changes); ↓ goes on to the items,
// and ↑ from their top row comes back to the bar, ↑ again to the search box.
// Two rows of them (Contacts' Recent / Directory / Cases, then Open / Closed /
// All) are two layers, top to bottom.
// Esc in the search box goes back to the top level, keeping the search; Esc
// again there clears it.
// Tab / Shift+Tab still walk the page's buttons, links and filters (the
// browser's own ring shows where): Esc takes the cursor off them, back to
// the page, where the keys above work again (in every area).

import { caretTo } from './walk.js';

const $ = s => document.querySelector(s);
const vis = el => !!el && el.getClientRects().length > 0;
const all = sel => [...document.querySelectorAll(sel)].filter(vis);
const focusEnd = el => {
  if (!vis(el)) return false;
  el.focus();
  caretTo(el, 'end');
  return true;
};
const waitFor = (sel, ms = 1500) => new Promise(done => {
  const t0 = Date.now();
  const tick = () => { const e = $(sel); if (vis(e)) done(e); else if (Date.now() - t0 > ms) done(null); else setTimeout(tick, 40); };
  tick();
});
const click = el => { el?.click(); return !!el; };
// After Enter's job: the note now being written, full screen (as its ⤢ does).
const fullNow = () => {
  const rich = document.activeElement?.closest?.('.rich');
  if (rich && !rich.classList.contains('is-full')) rich.querySelector('.md-full')?.click();
};

// Per area: the search box above the items, the items, what Enter does to one
// (open), and what ↓ / Enter do at the top level (down / enter).
const AREAS = {
  dump: {
    search: '#dump-q',
    bars: ['#dump-filter [data-filter]'],
    aboveSearch: () => focusEnd($('.dump-capture .rich-edit')),
    items: '#thoughts > li[data-id]',
    enter: () => focusEnd($('.dump-capture .rich-edit')),
    async open(li) {
      click(li.querySelector('[data-act="edit"]'));
      const ed = await waitFor(`#thoughts [data-id="${li.dataset.id}"] .thought-edit [contenteditable]`);
      if (ed) focusEnd(ed);
    },
  },
  tasks: {
    rows: '#task-body .task-list > li[data-id]',
    rowEdit: '.task-title',
    // The New task line is at the top: ↓ starts typing there too.
    down: () => focusEnd($('#task-new')),
    enter: () => focusEnd($('#task-new')),
  },
  planner: {
    rows: '#main .line.has-item[data-item]',
    rowEdit: '.item-title',
    down: () => focusEnd(all('#lines .line.has-item .item-title')[0] || all('#main .line.has-item .item-title')[0]) || focusEnd($('#dump')),
    enter: () => focusEnd($('#dump')),
  },
  // An open list, like Tasks: ↓ starts editing (the new item line at the top), and ↑ / ↓ then
  // walk the items as while editing (Shift+↑ / ↓ there selects). The lists page browses its cards.
  lists: {
    bars: ['#list-tabs [data-list-tab]'],
    items: '#main .project-grid .list-card',
    rows: '#main .list-page .task-list > li[data-id]',
    rowEdit: '.task-title',
    down: () => focusEnd($('#list-new')) || false,
    enter: () => focusEnd($('#list-new')),
    open: el => click(el),
  },
  // A box's page, the same: ↓ into its first thing's name (or Add items). The grid browses boxes.
  places: {
    search: '#find-q, #box-q',
    bars: ['#editions [data-edition]'],
    items: '#main .box-card',
    rows: '#box-page .item-list > li[data-id]',
    rowEdit: 'input[name="name"]',
    down: () => focusEnd($('#new-items')) || focusEnd(all('#main .item-list > li[data-item] > input[name="name"]')[0]) || false,
    enter: () => focusEnd($('#new-items')),
    open: el => click(el),
  },
  contacts: {
    search: '#c-q',
    bars: ['#c-tabs [data-tab]', '.case-show-row [data-case-show]'],
    items: '#main .c-card, #main .case-card, #main tr[data-case-row], #c-body .project-grid a.project-card',
    enter: () => focusEnd($('#c-new')),
    open: el => click(el.querySelector('a.c-main, a.bb-card') || el),
  },
  scans: { search: '.scan-search', bars: ['.scan-kinds [data-kind]'], items: '#main .scan-card', open: el => click(el) },
  recipes: { search: '.bb-search', bars: ['#main .bb-sections [data-section]'], items: '#main .bb-cards > li[data-id], #main .bb-shared > li, #main .bb-batch-list > li[data-id], #main div.bb-batches > .bb-batch-row', open: el => click(el.querySelector('.bb-card, .bb-batch-row') || el) },
  contracts: { search: '.contract-search', bars: ['.scan-kinds [data-view]'], items: '#main tr[data-id], #main .contract-card', open: el => click(el.querySelector('a') || el) },
  // Archive and Bin: no Enter (each row's Restore and Delete are its buttons); Shift+arrows choose rows for the selection bar.
  bin: { search: '#bin-q', bars: ['#bin-tabs [data-tab]', '#bin-areas [data-area]', '#bin-filters [data-filter]'], items: '#bin-body li[data-key]' },
};

let on = false;
let goTo = null;
// Outline this item (e.g. the next note, after the outlined one was archived).
export const browseTo = el => { if (el) goTo?.(el); };
let inBar = -1; // the filter bar being browsed (its place in the area's bars), -1 for the items
let barPick = null; // the filter just switched to (the page marks it a moment later)
let keepOnHash = false; // a filter that changes the address (Contacts' tabs) keeps browsing
let key = null;
let selFrom = null; // the item Shift+arrows began selecting from
const keyOf = el => el.dataset.id || el.dataset.item || el.dataset.box || el.getAttribute('href') || '';
let escAt = 0; // when Esc was last pressed (only Esc out of a row highlights it; not a click away or a phone's keyboard closing)

// The item above / below: one overlapping the same place across if there is
// one (a grid's column, a masonry column), the nearest such; else the closest
// across in the nearest row.
function nearest(list, from, dir) {
  const r = from.getBoundingClientRect();
  const x = (r.left + r.right) / 2;
  const cand = list.filter(e => e !== from).map(e => ({ e, q: e.getBoundingClientRect() }))
    .filter(({ q }) => (dir > 0 ? q.top >= r.bottom - 4 : q.bottom <= r.top + 4));
  if (!cand.length) return null;
  const gap = ({ q }) => (dir > 0 ? q.top - r.bottom : r.top - q.bottom);
  const over = cand.filter(({ q }) => q.left <= x && q.right >= x);
  if (over.length) return over.reduce((a, b) => (gap(b) < gap(a) ? b : a)).e;
  const row = Math.min(...cand.map(gap));
  return cand.filter(c => gap(c) <= row + 8)
    .reduce((a, b) => (Math.abs((b.q.left + b.q.right) / 2 - x) < Math.abs((a.q.left + a.q.right) / 2 - x) ? b : a)).e;
}

// Going up, scrollIntoView stops at the window's top edge, under the app bar and the area's sticky bar: scroll on until it clears them.
const STICKY = '.appbar, .find-bar, .find-sticky, .sticky-top, .dump-bar, .bb-sticky, .list-top, .box-top, .box-lid';
function clearSticky(el) {
  const elTop = el.getBoundingClientRect().top;
  let barsBottom = 0;
  for (const bar of document.querySelectorAll(STICKY)) {
    const barRect = bar.getBoundingClientRect();
    if (barRect.height && barRect.top < innerHeight / 2 && !bar.contains(el)) barsBottom = Math.max(barsBottom, barRect.bottom);
  }
  if (elTop < barsBottom + 8) scrollBy(0, elTop - barsBottom - 8);
}

export function installBrowse({ busy, area }) {
  const cfg = () => AREAS[area()];
  const items = c => { const sel = [c?.items, c?.rows].filter(Boolean).join(', '); return sel ? all(sel) : []; };
  const isRow = (c, el) => !!(c?.rows && el?.matches(c.rows));
  const openIt = (c, el) => (isRow(c, el) ? focusEnd(el.querySelector(c.rowEdit)) : c.open?.(el));
  const current = c => items(c).find(e => keyOf(e) === key) || null;
  const bar = (c, at) => (c?.bars?.[at] ? all(c.bars[at]) : []);
  const layers = c => (c?.bars || []).map((sel, at) => at).filter(at => bar(c, at).length); // the bars showing, top to bottom
  const barId = b => Object.values(b.dataset)[0] || b.textContent;
  const pressed = (c, at) => (barPick && bar(c, at).find(b => barId(b) === barPick))
    || bar(c, at).find(b => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true') || bar(c, at)[0] || null;
  const paint = () => {
    const c = cfg();
    const cur = on && !busy() ? (inBar >= 0 ? pressed(c, inBar) : current(c)) : null;
    for (const e of document.querySelectorAll('.kb-cur')) if (e !== cur) e.classList.remove('kb-cur');
    cur?.classList.add('kb-cur');
  };
  let queued = 0;
  const later = () => { if (!queued) queued = setTimeout(() => { queued = 0; paint(); }, 30); };
  const go = el => {
    key = keyOf(el);
    on = true;
    inBar = -1;
    paint();
    el.scrollIntoView({ block: 'nearest' });
    clearSticky(el);
  };
  goTo = go;
  const stop = () => { on = false; inBar = -1; key = null; barPick = null; selFrom = null; paint(); };
  const goBar = at => { if (at !== inBar) barPick = null; on = true; inBar = at; paint(); const b = pressed(cfg(), at); b?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); if (b) clearSticky(b); };
  const firstBar = c => layers(c)[0] ?? -1;
  // The stops above the items, top to bottom as on screen: the search box ('search') and each bar showing (its place).
  const searchBox = c => (c?.search ? all(c.search)[0] : null);
  const stops = c => {
    const out = layers(c).map(at => ({ stop: at, top: bar(c, at)[0].getBoundingClientRect().top }));
    const box = searchBox(c);
    if (box) out.push({ stop: 'search', top: box.getBoundingClientRect().top });
    return out.sort((a, b) => a.top - b.top).map(x => x.stop);
  };
  // The stop above or below this one (null: none; undefined from: the last, coming up from the items).
  const stopBy = (c, from, dir) => { const list = stops(c); return from === undefined ? list.at(-1) ?? null : list[list.indexOf(from) + dir] ?? null; };
  const goStop = (c, to) => { if (to === 'search') { stop(); searchBox(c).focus(); } else goBar(to); };
  const flash = el => {
    if (!el) return;
    el.classList.remove('kb-flash');
    void el.offsetWidth; // start the animation again
    el.classList.add('kb-flash');
    setTimeout(() => el.classList.remove('kb-flash'), 600);
  };
  // ← / → on the bar: the next filter, switched to at once; at an end, a flash.
  const moveBar = (c, dir, layer = inBar) => {
    const btns = bar(c, layer);
    const at = btns.indexOf(pressed(c, layer));
    const to = btns[at + dir];
    goBar(layer);
    if (to) { barPick = barId(to); keepOnHash = true; to.click(); setTimeout(() => { keepOnHash = false; }, 300); paint(); } else flash(btns[at]);
  };
  const take = ev => { ev.preventDefault(); ev.stopPropagation(); };

  // The item one step that way: ← / → in order, ↑ / ↓ the one above or below.
  const step = (list, cur, k) => (k === 'ArrowLeft' || k === 'ArrowRight' ? list[list.indexOf(cur) + (k === 'ArrowLeft' ? -1 : 1)] : nearest(list, cur, k === 'ArrowDown' ? 1 : -1));
  const select = (from, to) => document.dispatchEvent(new CustomEvent('browse-select', { detail: { from, to } }));
  addEventListener('keydown', ev => {
    if (!ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey || ev.isComposing || !ev.key?.startsWith('Arrow') || busy()) return;
    const t = ev.target;
    if (t !== document.body && t !== document.documentElement && t.closest?.('a, button, summary, [role="button"], [tabindex], input, textarea, select')) return;
    const c = cfg(), list = items(c);
    if (!list.length || inBar >= 0) return;
    take(ev);
    let cur = on ? current(c) : null;
    if (!cur) { // not browsing yet: from the first item chosen, or the first item
      cur = list.find(e => e.matches('.selected') || e.closest('.selected') || e.querySelector(':scope > .selected')) || list[0];
      go(cur); selFrom = keyOf(cur);
      if (!cur.matches('.selected') && !cur.closest('.selected')) select(cur, cur);
      return;
    }
    const from = list.find(e => keyOf(e) === selFrom) || cur;
    selFrom = keyOf(from);
    const to = step(list, cur, ev.key);
    if (!to) return;
    go(to); selFrom = keyOf(from);
    select(from, to);
  }, true);

  addEventListener('keydown', ev => {
    const deeper = ev.altKey && ev.key === 'Enter';
    if ((ev.altKey && !deeper) || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.isComposing) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(ev.key)) return;
    const t = ev.target;
    if (ev.key === 'Escape' && !deeper && t !== document.body && t.matches?.('a, button, summary, [tabindex]:not([contenteditable]), input[type="checkbox"], input[type="radio"]')
      && !t.closest('dialog, .pill-menu, .dd-menu, .ref-picker, .thought-pop, details[open], .item-details, .task-details, .thing-panel, .list-panel')) {
      if (!document.querySelector('.select-bar:not([hidden])')) take(ev); // with a selection, the view's Esc clears it too
      t.blur();
      later();
      return;
    }
    const c = cfg();
    if (!c) return;
    // In the search box: ↓ goes on to browse what it found.
    if (c.search && t.matches?.(c.search)) {
      const first = items(c)[0];
      const below = stopBy(c, 'search', 1), above = stopBy(c, 'search', -1);
      if (ev.key === 'Escape') { take(ev); t.blur(); stop(); }
      else if (ev.key === 'ArrowDown' && below !== null) { take(ev); t.blur(); goStop(c, below); }
      else if (ev.key === 'ArrowDown' && first) { take(ev); t.blur(); go(first); }
      else if (ev.key === 'ArrowDown' && c.enter?.()) take(ev);
      else if (ev.key === 'ArrowUp' && above !== null) { take(ev); t.blur(); goStop(c, above); }
      else if (ev.key === 'ArrowUp' && c.aboveSearch?.()) take(ev);
      return;
    }
    if (busy()) return;
    const list = items(c);
    if (on) {
      if (ev.key === 'Escape') { const chosen = document.querySelector('.select-bar:not([hidden])'); stop(); if (!chosen) take(ev); return; } // with a selection, the view's Esc clears it too
      if (inBar >= 0) {
        take(ev);
        if (!bar(c, inBar).length) { const to = firstBar(c); if (to >= 0) goBar(to); else if (list[0]) go(list[0]); else stop(); return; } // that bar went with the page it was on
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') moveBar(c, ev.key === 'ArrowLeft' ? -1 : 1);
        else if (ev.key === 'ArrowDown' || ev.key === 'Enter') { const below = stopBy(c, inBar, 1); if (below !== null) goStop(c, below); else if (list[0]) go(list[0]); else flash(pressed(c, inBar)); }
        else if (ev.key === 'ArrowUp') { const above = stopBy(c, inBar, -1); if (above !== null) goStop(c, above); else flash(pressed(c, inBar)); }
        return;
      }
      const cur = current(c);
      if (ev.key === 'Enter') { if (cur) { take(ev); Promise.resolve(openIt(c, cur)).then(() => { if (deeper) setTimeout(fullNow, 50); }); } return; }
      if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && isRow(c, cur)) { stop(); return; } // the area's tabs or days (app.js)
      take(ev);
      selFrom = null;
      if (!cur) { if (list[0]) go(list[0]); return; }
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        const to = step(list, cur, ev.key);
        if (to) go(to);
        return;
      }
      const to = step(list, cur, ev.key);
      if (to) go(to);
      else if (ev.key === 'ArrowUp' && stopBy(c, undefined) !== null) goStop(c, stopBy(c, undefined));
      return;
    }
    // The top level: only when nothing in particular has the keyboard (a
    // button or link with focus keeps its own Enter).
    if (t !== document.body && t !== document.documentElement && t.closest?.('a, button, summary, [role="button"], [tabindex], input, textarea, select')) return;
    // Esc after leaving the search box (the search kept): a second Esc clears it.
    if (ev.key === 'Escape') {
      const s = c.search && all(c.search).find(e => e.value);
      if (s) { take(ev); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); }
      return;
    }
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && firstBar(c) >= 0) { take(ev); moveBar(c, ev.key === 'ArrowLeft' ? -1 : 1, firstBar(c)); return; }
    if (ev.key === 'ArrowDown') {
      let done = !!c.down?.(); // (false when there's nothing of its kind on this page: then as elsewhere)
      if (done) { /* taken */ } else if (stops(c).length) { goStop(c, stops(c)[0]); done = true; }
      else if (list[0]) { go(list[0]); done = true; }
      else done = !!c.enter?.();
      if (done) take(ev);
    } else if (ev.key === 'Enter' && c.enter?.()) { take(ev); if (deeper) fullNow(); }
  }, true);

  addEventListener('pointerdown', () => { escAt = 0; if (on) stop(); }, true);
  addEventListener('keydown', ev => { if (ev.key === 'Escape') escAt = Date.now(); }, true);
  // Esc out of a row's name (the focus left to the page, not clicked or tabbed away): that row highlighted.
  addEventListener('focusout', ev => {
    const c = cfg();
    const row = c?.rows && !ev.relatedTarget && Date.now() - escAt < 300 && ev.target.closest?.(c.rows);
    if (!row) return;
    const rowKey = keyOf(row);
    let tries = 8; // the row's pills take a moment to fold away
    const settle = () => {
      const a = document.activeElement;
      if ((a && a !== document.body) || on || !escAt) return;
      if (busy()) { if (--tries) setTimeout(settle, 40); return; }
      if (items(c).some(e => keyOf(e) === rowKey && isRow(c, e))) { key = rowKey; on = true; inBar = -1; selFrom = null; paint(); }
    };
    setTimeout(settle, 0);
  }, true);
  addEventListener('hashchange', () => { if (keepOnHash) return; barPick = null; if (on) stop(); });
  // Editing hides the highlight; leaving the editing (or a redraw) brings it back.
  addEventListener('focusin', later);
  addEventListener('focusout', later);
  new MutationObserver(() => { if (on) later(); }).observe(document.body, { childList: true, subtree: true });
}
