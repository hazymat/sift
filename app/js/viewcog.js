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
//
// Sync: every view choice is also kept in the settings record (so it syncs),
// one copy for phones and one for computers (view_phone:<key>, view_computer:<key>).
// The latest change wins. "Keep this device's view separate" (this device only)
// stops sending and receiving them.

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
  lists: ['plain', 'colour'], // Alternate shading is Lined paper's own (SKINS)
  tasks: ['plain'],
  planner: ['plain', 'alt'],
};
import * as store from './store.js';

const kind = () => Math.min(screen.width, screen.height) < 600 ? 'phone' : 'computer';
const SEPARATE = 'sift-view-separate';
const separate = () => { try { return localStorage.getItem(SEPARATE) === '1'; } catch { return false; } };
const isViewKey = k => /^sift-(layout|shade|density|view):/.test(k);
// A view choice: kept on this device and, unless it's kept separate, synced to the same kind of device.
function saveView(k, value) {
  try { localStorage.setItem(k, value); } catch { /* not kept */ }
  if (!separate()) store.updateSettings({ [`view_${kind()}:${k}`]: value }).catch(err => console.warn('View setting not synced:', err));
}
// The synced view choices for this kind of device onto this device. True if any changed.
async function pullViews() {
  if (separate()) return false;
  const settings = await store.getSettings();
  const prefix = `view_${kind()}:`;
  let changed = false;
  for (const [field, value] of Object.entries(settings)) {
    const k = field.slice(prefix.length);
    if (!field.startsWith(prefix) || !isViewKey(k) || typeof value !== 'string') continue;
    try { if (localStorage.getItem(k) !== value) { localStorage.setItem(k, value); changed = true; } } catch { /* not kept */ }
  }
  return changed;
}
export function separateHtml() {
  return `<div class="layout-opts view-separate"><label class="layout-opt"><input type="checkbox" data-view-separate${separate() ? ' checked' : ''}> Keep this device's view separate</label></div>`;
}

const LOOK_LABEL = { plain: 'Original', colour: 'Multicolour', alt: 'Alternate shading' };
const shadeKey = area => `sift-shade:${area}`;
export function shadeOf(area) {
  const opts = LOOKS[area];
  if (!opts) return 'plain';
  if (SKIN_AREAS.includes(area) && layoutOn(area, 'alt')) return 'alt';
  try { const v = localStorage.getItem(shadeKey(area)); return opts.includes(v) ? v : opts[0]; } catch { return opts[0]; }
}
export function lookHtml(area) {
  const opts = LOOKS[area];
  if (!(opts?.length > 1)) return '';
  const on = shadeOf(area);
  return `<h4>Look</h4>
    <div class="view-opts shade-opts" role="group" aria-label="Look">
      ${opts.map(o => `<button type="button" data-shade-set="${o}" aria-pressed="${o === on}">${LOOK_LABEL[o]}</button>`).join('')}
    </div>`;
}

// Layout switches per page (trying out layouts; the labels are rough for now).
// needs: a switch that only works with another on: shown under it (indented, joined by a
// line) only while that one is ticked. def: true for one that starts on.
const LAYOUTS = {
  tasks: [
    { id: 'margin', label: 'Show margin', skin: 'lined' },
    { id: 'alt', label: 'Alternate shading', skin: 'lined', def: area => localStorage.getItem(shadeKey(area)) === 'alt' }, // was a Look
    { id: 'add-top', label: 'New tasks appear at top', def: true },
    { id: 'pad', label: 'Write like a pad: after Enter, the next line opens under the task just added (Tab for a sub-task; Advanced too)', def: true, needs: 'add-top' },
    { id: 'pills-hide', label: 'Hide pills behind More (editing / new)', def: true },
    { id: 'more-panel', label: 'More goes straight to the full panel', needs: 'pills-hide' },
  ],
  lists: [
    { id: 'margin', label: 'Show margin', skin: 'lined' },
    { id: 'alt', label: 'Alternate shading', skin: 'lined', def: area => localStorage.getItem(shadeKey(area)) === 'alt' }, // was a Look
    { id: 'added-flash', label: 'Highlight item when added', def: true },
  ],
  recipes: [
    { id: 'lined', label: 'Lined paper', def: true },
    { id: 'margin', label: 'Show margin', def: true, needs: 'lined' },
  ],
  scans: [
    { id: 'scan-edges', label: 'Camera photos are cut to the edges of the page and straightened', def: true },
    { id: 'scan-look', label: 'Camera photos get a scanned look (the paper white, shadows gone)', def: true },
    { id: 'scan-grey', label: 'In black and white', needs: 'scan-look' },
    { id: 'scan-read', label: 'Read the text on scanned pages (on this device, English)', def: true },
    { id: 'keep-all', label: "Keep every scan's pages on this device (untick to keep only the scans you choose; with sync on, the rest stay on your server and come back when opened)", def: true },
  ],
  planner: [
    { id: 'day-rel', label: 'Show "Today" or "In 5 days" under the date', def: true },
    { id: 'achievements', label: 'Show achievement count when tasks completed' },
    { id: 'done-on-plan', label: 'Show ticked-off tasks on the schedule at the time they were done', def: true },
    { id: 'focus', label: 'Show day focus', def: true },
    { id: 'energy', label: 'Show energy', def: true },
  ],
};
const layoutKey = (area, id) => `sift-layout:${area}:${id}`;
export function layoutOn(area, id) {
  if (id === 'lined' && SKIN_AREAS.includes(area)) return !!skinDef(area).lined;
  const forced = forcedBy(area, id);
  if (forced !== undefined) return forced;
  const opt = LAYOUTS[area]?.find(o => o.id === id);
  if (opt?.skin && skinOf(area) !== opt.skin) return false;
  if (opt?.needs && !layoutOn(area, opt.needs)) return false;
  return setOn(area, id);
}
function setOn(area, id) {
  let def = LAYOUTS[area]?.find(o => o.id === id)?.def;
  try { def = typeof def === 'function' ? def(area) : !!def; } catch { def = false; }
  try { const v = localStorage.getItem(layoutKey(area, id)); return v === null ? def : v === '1'; } catch { return def; }
}
const optHtml = (area, opts, label) => `<div class="layout-opts" role="group" aria-label="${label}">
      ${opts.map(o => `<label class="layout-opt${o.needs ? ' layout-sub' : ''}"${optHidden(area, o) ? ' hidden' : ''}><input type="checkbox" data-layout-set="${o.id}"${o.needs ? ` data-layout-needs="${o.needs}"` : ''}${setOn(area, o.id) ? ' checked' : ''}> ${o.label}</label>`).join('')}
    </div>`;
export function layoutHtml(area, heading = true) {
  const opts = LAYOUTS[area]?.filter(o => !o.skin);
  if (!opts?.length) return '';
  return `${heading ? '<h4>Layout</h4>' : ''}${optHtml(area, opts, 'Layout')}`;
}

// Styles (skins) for pages of rows: Tasks (its projects too) and Lists. One is picked in 👁 Style,
// put on <main data-skin>; lined: true styles also set data-layout-lined (the paper CSS). A style's
// own options are LAYOUTS entries with skin: <its id>, shown under the picker only while it's picked.
// forces: Layout switches the style sets itself (hidden from Layout while it's picked); areas: where
// it's offered (all SKIN_AREAS when left out).
// A new style: add it here (sample: the pill's own look) and its CSS under #main[data-skin="<id>"].
export const SKINS = [
  { id: 'cards', label: 'Cards' },
  { id: 'lined', label: 'Lined paper', lined: true },
  { id: 'minimal', label: 'Minimal', lined: true, forces: { 'add-top': true, pad: false } },
];
const SKIN_AREAS = ['tasks', 'lists'];
const skinsFor = area => SKINS.filter(x => !x.areas || x.areas.includes(area));
const forcedBy = (area, id) => (SKIN_AREAS.includes(area) ? skinDef(area).forces?.[id] : undefined);
const optHidden = (area, o) => forcedBy(area, o.id) !== undefined || (o.needs && !setOn(area, o.needs));
const skinKey = area => `sift-view:${area}:skin`;
export function skinOf(area) {
  try {
    const v = localStorage.getItem(skinKey(area));
    if (skinsFor(area).some(x => x.id === v)) return v;
    return localStorage.getItem(`sift-layout:${area}:lined`) === '1' ? 'lined' : 'cards'; // the old Lined Paper tick box
  } catch { return 'cards'; }
}
const skinDef = area => SKINS.find(x => x.id === skinOf(area));
function styleHtml(area) {
  if (!SKIN_AREAS.includes(area)) return '';
  const on = skinOf(area);
  return `<h4>Style</h4>
    <div class="view-opts skin-opts" role="group" aria-label="Style">
      ${skinsFor(area).map(x => `<button type="button" class="skin-pill" data-skin="${x.id}" data-skin-set="${x.id}" aria-pressed="${x.id === on}"><span class="skin-sample" aria-hidden="true"><i></i><i></i><i></i></span>${x.label}</button>`).join('')}
    </div>
    ${skinsFor(area).map(x => { const opts = (LAYOUTS[area] || []).filter(o => o.skin === x.id); return opts.length ? `<div class="skin-own" data-skin-own="${x.id}"${x.id === on ? '' : ' hidden'}>${optHtml(area, opts, x.label)}</div>` : ''; }).join('')}`;
}

const key = area => `sift-density:${area}`;
// Tasks starts Tight (a clean list; 👁 Spacing shows more of each); everything else Medium.
const DENSITY_DEFAULT = { tasks: 'tight' };
export function densityOf(area) {
  const def = DENSITY_DEFAULT[area] || 'medium';
  try { return localStorage.getItem(key(area)) || def; } catch { return def; }
}

export function spacingHtml(area) {
  const on = densityOf(area);
  return `<h4>Spacing</h4>
    <div class="view-opts density-opts" role="group" aria-label="Spacing">
      ${DENSITIES.map(d => `<button type="button" class="density-btn" data-density-set="${d.id}" aria-pressed="${d.id === on}" title="${d.label}" aria-label="${d.label}">${d.icon}</button>`).join('')}
    </div>`;
}

// A page's own view choice (e.g. Cases as Details or Cards, a table's columns), kept and synced as the others.
const choiceKey = (area, id) => `sift-view:${area}:${id}`;
export function choiceOf(area, id, def = '') {
  try { return localStorage.getItem(choiceKey(area, id)) ?? def; } catch { return def; }
}
export const setChoice = (area, id, value) => saveView(choiceKey(area, id), value);

// The menu's usual contents (a page that changes them by tab puts them back with this).
export const menuHtml = (area, extra = '') => `${extra}${styleHtml(area)}${layoutHtml(area)}${lookHtml(area)}${spacingHtml(area)}${separateHtml()}`;
export function cogHtml(area, extra = '') {
  return `<details class="tool-menu view-menu page-cog">
      <summary class="icon-btn" aria-label="View settings" title="View settings"><svg class="icon" aria-hidden="true"><use href="#i-view"/></svg></summary>
      <div class="menu view-settings">${menuHtml(area, extra)}</div>
    </details>`;
}

// A 👁 menu brought in line with the stored choices (another device's, or a new style's).
function syncMenu(m, area) {
  if (!m) return;
  for (const b of m.querySelectorAll('[data-layout-set]')) { b.checked = setOn(area, b.dataset.layoutSet); b.closest('.layout-opt').hidden = optHidden(area, LAYOUTS[area]?.find(o => o.id === b.dataset.layoutSet) || {}); }
  for (const b of m.querySelectorAll('[data-skin-set]')) b.setAttribute('aria-pressed', String(b.dataset.skinSet === skinOf(area)));
  for (const b of m.querySelectorAll('[data-skin-own]')) b.hidden = b.dataset.skinOwn !== skinOf(area);
  for (const b of m.querySelectorAll('[data-shade-set]')) b.setAttribute('aria-pressed', String(b.dataset.shadeSet === shadeOf(area)));
  for (const b of m.querySelectorAll('[data-density-set]')) b.setAttribute('aria-pressed', String(b.dataset.densitySet === densityOf(area)));
}

export function installViewCog(getArea) {
  const apply = () => {
    const main = document.querySelector('#main');
    if (!main) return;
    main.dataset.density = densityOf(getArea());
    main.dataset.shade = shadeOf(getArea());
    if (SKIN_AREAS.includes(getArea())) main.dataset.skin = skinOf(getArea()); else delete main.dataset.skin;
    main.toggleAttribute('data-layout-lined', layoutOn(getArea(), 'lined'));
    for (const o of LAYOUTS[getArea()] || []) main.toggleAttribute(`data-layout-${o.id}`, layoutOn(getArea(), o.id));
  };
  // Another device's (or tab's) view choices arrived: the page follows them.
  const follow = async () => {
    if (!(await pullViews())) return;
    apply();
    for (const m of document.querySelectorAll('.view-settings')) syncMenu(m, getArea());
    document.dispatchEvent(new CustomEvent('sift-layout', { detail: { area: getArea(), id: null } }));
  };
  store.subscribe(change => { if (change?.collection === 'settings') follow(); });
  follow();
  document.addEventListener('change', ev => {
    const sep = ev.target.closest?.('[data-view-separate]');
    if (sep) {
      try { localStorage.setItem(SEPARATE, sep.checked ? '1' : '0'); } catch { /* not kept */ }
      for (const b of document.querySelectorAll('[data-view-separate]')) b.checked = sep.checked;
      if (!sep.checked) follow(); // back in step: this device takes the shared view
      return;
    }
    const box = ev.target.closest?.('[data-layout-set]');
    if (!box) return;
    saveView(layoutKey(getArea(), box.dataset.layoutSet), box.checked ? '1' : '0');
    syncMenu(box.closest('.view-settings'), getArea());
    apply();
    document.dispatchEvent(new CustomEvent('sift-layout', { detail: { area: getArea(), id: box.dataset.layoutSet } }));
  });
  document.addEventListener('click', ev => {
    const sk = ev.target.closest?.('[data-skin-set]');
    if (sk) {
      saveView(skinKey(getArea()), sk.dataset.skinSet);
      syncMenu(sk.closest('.view-settings'), getArea());
      apply();
      document.dispatchEvent(new CustomEvent('sift-layout', { detail: { area: getArea(), id: 'skin' } }));
      return;
    }
    const sh = ev.target.closest?.('[data-shade-set]');
    if (sh) {
      saveView(shadeKey(getArea()), sh.dataset.shadeSet);
      for (const x of sh.parentElement.querySelectorAll('[data-shade-set]')) x.setAttribute('aria-pressed', String(x === sh));
      apply();
      return;
    }
    const b = ev.target.closest?.('[data-density-set]');
    if (!b) return;
    saveView(key(getArea()), b.dataset.densitySet);
    for (const x of b.parentElement.querySelectorAll('[data-density-set]')) x.setAttribute('aria-pressed', String(x === b));
    apply();
  });
  return apply;
}
