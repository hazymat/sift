// The 👁 view menu every page has (same style as the Day Planner's). It always
// offers Spacing: tight / medium / loose, remembered per page on this device,
// and on pages with lists of things a Look: Original, Multicolour (each item
// in its own soft colour) and/or Alternate shading (every other item a touch
// darker). The look is remembered the same way and put on <main data-shade>.
// Pages can add their own sections above it. Some pages have a Layout: on /
// off switches (all off by default), remembered the same way, put on <main> as
// data-layout-<id> and announced with a "sift-layout" event on document.
//
//   cogHtml(extraSectionsHtml)   the 👁 view button and its menu, for a page header
//   spacingHtml(area)            just the Spacing section (the Day Planner adds
//                                it to its own menu)
//   installViewCog(getArea)      once, in app.js: wires the switch and applies
//                                each page's spacing to <main data-density>

export const DENSITIES = [
  { id: 'tight', label: 'Tight', icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 7h12M2 10h12M2 13h12"/></svg>' },
  { id: 'medium', label: 'Medium', icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h12M2 8h12M2 12.5h12"/></svg>' },
  { id: 'loose', label: 'Loose', icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 13h12"/><path d="M2 8h8" opacity=".55"/></svg>' },
];

// Which looks each page offers (the first is the default).
const LOOKS = {
  dump: ['plain', 'colour', 'alt'],
  places: ['plain', 'colour', 'alt'],
  contacts: ['plain', 'colour', 'alt'],
  lists: ['plain', 'colour', 'alt'],
  tasks: ['plain', 'alt'],
  planner: ['plain', 'alt'],
};
const LOOK_LABEL = { plain: 'Original', colour: 'Multicolour', alt: 'Alternate shading' };
const shadeKey = area => `sift-shade:${area}`;
export function shadeOf(area) {
  const opts = LOOKS[area];
  if (!opts) return 'plain';
  try { const v = localStorage.getItem(shadeKey(area)); return opts.includes(v) ? v : opts[0]; } catch { return opts[0]; }
}
export function lookHtml(area) {
  const opts = LOOKS[area];
  if (!opts) return '';
  const on = shadeOf(area);
  return `<h4>Look</h4>
    <div class="view-opts shade-opts" role="group" aria-label="Look">
      ${opts.map(o => `<button type="button" data-shade-set="${o}" aria-pressed="${o === on}">${LOOK_LABEL[o]}</button>`).join('')}
    </div>`;
}

// Layout switches per page (trying out layouts; the labels are rough for now).
// needs: a switch that only works with another on (greyed out without it). def: true for
// one that starts on. flat: not indented under the one it needs.
const LAYOUTS = {
  tasks: [
    { id: 'lined', label: 'Lined paper layout', def: true },
    { id: 'new-top', label: 'New task line at the top', needs: 'lined', flat: true },
    { id: 'new-focus', label: 'Start typing a new task on arriving' },
    { id: 'add-top', label: 'New tasks added at the top' },
    { id: 'margin', label: 'Show margin', needs: 'lined', flat: true },
    { id: 'added-flash', label: 'Highlight item when added' },
    { id: 'pills-hide', label: 'Hide pills behind More (editing / new)' },
    { id: 'more-panel', label: 'More goes straight to the full panel', needs: 'pills-hide' },
    { id: 'empty-lines', label: 'Show additional lines when list is empty', def: true, needs: 'lined', flat: true },
  ],
};
const layoutKey = (area, id) => `sift-layout:${area}:${id}`;
export function layoutOn(area, id) {
  const needs = LAYOUTS[area]?.find(o => o.id === id)?.needs;
  if (needs && !layoutOn(area, needs)) return false;
  return setOn(area, id);
}
function setOn(area, id) {
  const def = !!LAYOUTS[area]?.find(o => o.id === id)?.def;
  try { const v = localStorage.getItem(layoutKey(area, id)); return v === null ? def : v === '1'; } catch { return def; }
}
export function layoutHtml(area) {
  const opts = LAYOUTS[area];
  if (!opts) return '';
  return `<h4>Layout</h4>
    <div class="layout-opts" role="group" aria-label="Layout">
      ${opts.map(o => `<label class="layout-opt${o.needs && !o.flat ? ' layout-sub' : ''}"><input type="checkbox" data-layout-set="${o.id}"${o.needs ? ` data-layout-needs="${o.needs}"` : ''}${setOn(area, o.id) ? ' checked' : ''}${o.needs && !setOn(area, o.needs) ? ' disabled' : ''}> ${o.label}</label>`).join('')}
    </div>`;
}

const key = area => `sift-density:${area}`;
export function densityOf(area) {
  try { return localStorage.getItem(key(area)) || 'medium'; } catch { return 'medium'; }
}

export function spacingHtml(area) {
  const on = densityOf(area);
  return `<h4>Spacing</h4>
    <div class="view-opts density-opts" role="group" aria-label="Spacing">
      ${DENSITIES.map(d => `<button type="button" class="density-btn" data-density-set="${d.id}" aria-pressed="${d.id === on}" title="${d.label}" aria-label="${d.label}">${d.icon}</button>`).join('')}
    </div>`;
}

export function cogHtml(area, extra = '') {
  return `<details class="tool-menu view-menu page-cog">
      <summary class="icon-btn" aria-label="View settings" title="View settings"><svg class="icon" aria-hidden="true"><use href="#i-view"/></svg></summary>
      <div class="menu view-settings">${extra}${layoutHtml(area)}${lookHtml(area)}${spacingHtml(area)}</div>
    </details>`;
}

export function installViewCog(getArea) {
  const apply = () => {
    const main = document.querySelector('#main');
    if (!main) return;
    main.dataset.density = densityOf(getArea());
    main.dataset.shade = shadeOf(getArea());
    for (const o of LAYOUTS[getArea()] || []) main.toggleAttribute(`data-layout-${o.id}`, layoutOn(getArea(), o.id));
  };
  document.addEventListener('change', ev => {
    const box = ev.target.closest?.('[data-layout-set]');
    if (!box) return;
    try { localStorage.setItem(layoutKey(getArea(), box.dataset.layoutSet), box.checked ? '1' : '0'); } catch { /* not kept */ }
    for (const sub of box.closest('.layout-opts').querySelectorAll(`[data-layout-needs="${box.dataset.layoutSet}"]`)) sub.disabled = !box.checked;
    apply();
    document.dispatchEvent(new CustomEvent('sift-layout', { detail: { area: getArea(), id: box.dataset.layoutSet } }));
  });
  document.addEventListener('click', ev => {
    const sh = ev.target.closest?.('[data-shade-set]');
    if (sh) {
      try { localStorage.setItem(shadeKey(getArea()), sh.dataset.shadeSet); } catch { /* not kept */ }
      for (const x of sh.parentElement.querySelectorAll('[data-shade-set]')) x.setAttribute('aria-pressed', String(x === sh));
      apply();
      return;
    }
    const b = ev.target.closest?.('[data-density-set]');
    if (!b) return;
    try { localStorage.setItem(key(getArea()), b.dataset.densitySet); } catch { /* not kept */ }
    for (const x of b.parentElement.querySelectorAll('[data-density-set]')) x.setAttribute('aria-pressed', String(x === b));
    apply();
  });
  return apply;
}
