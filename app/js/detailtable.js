// A details table, like a file explorer's details view or a spreadsheet: a
// header per column whose right edge drags to change its width (double-click:
// back to its own width), a click on its name to sort (again: the other way),
// and ▾ for sorting and filtering that column (ticking values, words it
// contains, or a period for dates). Widths, sort and filters are the view's
// state, kept by the page (e.g. with viewcog's choice()).
//
//   cols: [{ id, label, type: 'text' | 'list' | 'date' | 'num', width, value(row) (sorting, dates as ISO),
//            text(row) (filtering and list values), html(row) (the cell), cls }]
//   tableHtml({ cols, rows, view, rowAttrs(row), cls })   rows already through shown()
//   shown(rows, cols, view)                                the rows filtered and sorted
//   wireTable(root, { cols, rows: () => allRows, view: () => view, save(view) })  once per page;
//     save gets the new view and redraws

const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const DAY = 86400000;
export const PERIODS = [['', 'Any time'], ['today', 'Today'], ['week', 'Last 7 days'], ['month', 'Last 30 days'], ['year', 'This year'], ['older', 'Before this year']];
const inPeriod = (iso, period) => {
  if (!period) return true;
  if (!iso) return false;
  const at = Date.parse(iso);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  if (period === 'today') return new Date(at).toDateString() === new Date().toDateString();
  if (period === 'week') return at >= Date.now() - 7 * DAY;
  if (period === 'month') return at >= Date.now() - 30 * DAY;
  if (period === 'year') return at >= yearStart;
  return at < yearStart;
};
const filterOn = filter => !!filter && (filter.values?.length > 0 || !!filter.q || !!filter.period);
export const anyFilter = view => Object.values(view.filters || {}).some(filterOn);

export function shown(rows, cols, view) {
  const filters = view.filters || {};
  const kept = rows.filter(row => cols.every(col => {
    const filter = filters[col.id];
    if (!filterOn(filter)) return true;
    if (filter.values?.length && !filter.values.includes(col.text(row))) return false;
    if (filter.q && !col.text(row).toLowerCase().includes(filter.q.toLowerCase())) return false;
    return inPeriod(col.value(row), filter.period);
  }));
  const sortCol = cols.find(col => col.id === view.sort?.id);
  if (!sortCol) return kept;
  const dir = view.sort.dir === 'desc' ? -1 : 1;
  const blank = value => value === '' || value == null;
  // Empty cells always last, whichever way.
  return kept.sort((first, second) => {
    const one = sortCol.value(first), two = sortCol.value(second);
    if (blank(one) || blank(two)) return blank(one) - blank(two);
    return (typeof one === 'number' ? one - two : String(one).localeCompare(String(two), undefined, { numeric: true, sensitivity: 'base' })) * dir;
  });
}

export function tableHtml({ cols, rows, view, rowAttrs = () => '', cls = '' }) {
  const widths = view.widths || {};
  const total = cols.reduce((sum, col) => sum + (widths[col.id] || col.width), 0);
  return `<div class="dt-wrap"><table class="dt ${cls}" style="width:${total}px">
    <colgroup>${cols.map(col => `<col data-col="${col.id}" style="width:${widths[col.id] || col.width}px">`).join('')}</colgroup>
    <thead><tr>${cols.map(col => {
      const sorted = view.sort?.id === col.id;
      return `<th scope="col" data-col="${col.id}"${sorted ? ` aria-sort="${view.sort.dir === 'desc' ? 'descending' : 'ascending'}"` : ''}><span class="dt-th">
        <button type="button" class="dt-sort" data-dt-sort="${col.id}" title="Sort by ${esc(col.label.toLowerCase())}">${esc(col.label)}${sorted ? `<span class="dt-arrow">${view.sort.dir === 'desc' ? '↓' : '↑'}</span>` : ''}</button>
        <button type="button" class="dt-menu-btn${filterOn(view.filters?.[col.id]) ? ' on' : ''}" data-dt-menu="${col.id}" title="Sort and filter" aria-label="Sort and filter ${esc(col.label)}">▾</button></span>
        <span class="dt-resize" data-dt-resize="${col.id}" title="Drag to change the width (double-click: back to normal)"></span></th>`;
    }).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr ${rowAttrs(row)} tabindex="0">${cols.map(col => `<td class="${col.cls || ''}">${col.html(row)}</td>`).join('')}</tr>`).join('') || `<tr class="dt-none"><td colspan="${cols.length}" class="muted">Nothing matches${anyFilter(view) ? ' these filters' : ''}.</td></tr>`}</tbody>
  </table></div>`;
}

// The ▾ menu: sort either way, then the filter for that kind of column.
function menuHtml(col, rows, view) {
  const filter = view.filters?.[col.id] || {};
  const [up, down] = col.type === 'date' ? ['Oldest first', 'Newest first'] : col.type === 'num' ? ['Smallest first', 'Largest first'] : ['A to Z', 'Z to A'];
  let filterPart = '';
  if (col.type === 'list') {
    const counts = new Map();
    for (const row of rows) counts.set(col.text(row), (counts.get(col.text(row)) || 0) + 1);
    const values = Array.from(counts.keys()).sort((one, two) => one.localeCompare(two));
    filterPart = `<label class="dt-check dt-all"><input type="checkbox" data-dt-all${filter.values?.length ? '' : ' checked'}> Show all</label>
      ${values.map(value => `<label class="dt-check"><input type="checkbox" data-dt-value="${esc(value)}"${!filter.values?.length || filter.values.includes(value) ? ' checked' : ''}> ${esc(value || '(empty)')} <span class="muted">${counts.get(value)}</span></label>`).join('')}`;
  } else if (col.type === 'date') {
    filterPart = PERIODS.map(([id, label]) => `<label class="dt-check"><input type="radio" name="dt-period" data-dt-period="${id}"${(filter.period || '') === id ? ' checked' : ''}> ${label}</label>`).join('');
  } else {
    filterPart = `<input type="search" class="search dt-q" data-dt-q placeholder="Contains…" value="${esc(filter.q || '')}" autocomplete="off" aria-label="Show only ${esc(col.label.toLowerCase())} containing">`;
  }
  return `<div class="dt-pop-sort"><button type="button" data-dt-dir="asc" aria-pressed="${view.sort?.id === col.id && view.sort.dir !== 'desc'}">↑ ${up}</button><button type="button" data-dt-dir="desc" aria-pressed="${view.sort?.id === col.id && view.sort.dir === 'desc'}">↓ ${down}</button></div>
    <div class="dt-pop-h muted">Show</div><div class="dt-pop-filter">${filterPart}</div>
    <div class="dt-pop-foot">${filterOn(filter) ? '<button type="button" data-dt-clear>Clear this filter</button>' : ''}${anyFilter(view) ? '<button type="button" data-dt-clear-all>Clear all filters</button>' : ''}</div>`;
}

export function wireTable(root, { cols, rows, view, save }) {
  let pop = null;
  const colOf = id => cols.find(col => col.id === id);
  const copy = () => JSON.parse(JSON.stringify(view()));
  const closePop = () => { pop?.remove(); pop = null; removeEventListener('pointerdown', outside, true); removeEventListener('keydown', popKeys, true); };
  const outside = ev => { if (pop && !pop.contains(ev.target) && !ev.target.closest?.('[data-dt-menu]')) closePop(); };
  const popKeys = ev => { if (ev.key === 'Escape' && pop) { ev.preventDefault(); ev.stopPropagation(); const id = pop.dataset.col; closePop(); root.querySelector(`[data-dt-menu="${id}"]`)?.focus(); } };
  const setFilter = (id, change) => {
    const next = copy();
    next.filters = next.filters || {};
    next.filters[id] = Object.assign(next.filters[id] || {}, change);
    if (!filterOn(next.filters[id])) delete next.filters[id];
    save(next);
  };
  const drawPop = () => { if (!pop) return; const keepQ = pop.querySelector('[data-dt-q]') === document.activeElement; pop.innerHTML = menuHtml(colOf(pop.dataset.col), rows(), view()); if (keepQ) { const box = pop.querySelector('[data-dt-q]'); box.focus(); box.setSelectionRange(box.value.length, box.value.length); } };
  function openPop(button) {
    const id = button.dataset.dtMenu;
    if (pop?.dataset.col === id) return closePop();
    closePop();
    pop = document.createElement('div');
    pop.className = 'dt-pop';
    pop.dataset.col = id;
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', `Sort and filter ${colOf(id).label}`);
    document.body.append(pop);
    drawPop();
    const box = button.closest('th').getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(box.left, document.documentElement.clientWidth - pop.offsetWidth - 8))}px`;
    pop.style.top = `${box.bottom + 4}px`;
    addEventListener('pointerdown', outside, true);
    addEventListener('keydown', popKeys, true);
    (pop.querySelector('[data-dt-q]') || pop.querySelector('button'))?.focus();
    pop.addEventListener('click', ev => {
      const target = ev.target.closest('button');
      if (!target) return;
      if (target.dataset.dtDir) { const next = copy(); next.sort = { id, dir: target.dataset.dtDir }; save(next); }
      else if (target.hasAttribute('data-dt-clear')) setFilter(id, { values: [], q: '', period: '' });
      else if (target.hasAttribute('data-dt-clear-all')) { const next = copy(); next.filters = {}; save(next); }
      drawPop();
    });
    pop.addEventListener('change', ev => {
      const target = ev.target;
      if (target.hasAttribute('data-dt-all')) setFilter(id, { values: [] });
      else if (target.dataset.dtValue !== undefined) {
        const all = Array.from(pop.querySelectorAll('[data-dt-value]'));
        const ticked = all.filter(box => box.checked).map(box => box.dataset.dtValue);
        // All ticked is no filter; none ticked shows nothing, as a spreadsheet does.
        setFilter(id, { values: ticked.length === all.length ? [] : ticked.length ? ticked : ['\u0000none'] });
      } else if (target.dataset.dtPeriod !== undefined) setFilter(id, { period: target.dataset.dtPeriod });
      drawPop();
    });
    let typing = null;
    pop.addEventListener('input', ev => { if (!ev.target.hasAttribute('data-dt-q')) return; clearTimeout(typing); typing = setTimeout(() => { setFilter(id, { q: ev.target.value.trim() }); drawPop(); }, 200); });
  }
  root.addEventListener('click', ev => {
    const sortBtn = ev.target.closest('[data-dt-sort]');
    if (sortBtn) {
      const id = sortBtn.dataset.dtSort;
      const now = view().sort;
      const next = copy();
      // A date starts newest first; anything else A to Z.
      next.sort = { id, dir: now?.id === id ? (now.dir === 'desc' ? 'asc' : 'desc') : colOf(id).type === 'date' ? 'desc' : 'asc' };
      return save(next);
    }
    const menuBtn = ev.target.closest('[data-dt-menu]');
    if (menuBtn) openPop(menuBtn);
  });
  // Dragging a header's right edge sets its width; the table grows or shrinks with it (and scrolls sideways inside its box).
  root.addEventListener('pointerdown', ev => {
    const grip = ev.target.closest('[data-dt-resize]');
    if (!grip) return;
    ev.preventDefault();
    const id = grip.dataset.dtResize;
    const table = grip.closest('table');
    const col = table.querySelector(`col[data-col="${id}"]`);
    const startX = ev.clientX, startWidth = col.getBoundingClientRect().width || parseFloat(col.style.width), startTable = table.getBoundingClientRect().width;
    let width = startWidth;
    grip.setPointerCapture(ev.pointerId);
    table.classList.add('dt-resizing');
    const move = moveEv => { width = Math.max(56, Math.round(startWidth + moveEv.clientX - startX)); col.style.width = `${width}px`; table.style.width = `${startTable + width - startWidth}px`; };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      table.classList.remove('dt-resizing');
      if (width === startWidth) return;
      const next = copy();
      next.widths = Object.assign(next.widths || {}, { [id]: width });
      save(next);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });
  root.addEventListener('dblclick', ev => {
    const grip = ev.target.closest('[data-dt-resize]');
    if (!grip) return;
    const next = copy();
    if (next.widths) delete next.widths[grip.dataset.dtResize];
    save(next);
  });
  return { close: closePop };
}
