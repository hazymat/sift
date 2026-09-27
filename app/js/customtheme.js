// The Custom theme (Settings → Appearance → Custom…): a starting theme plus
// the fonts and colours the user picked, section by section. Only what was
// picked changes; everything else stays as the starting theme draws it.
// Saved in settings.custom_theme { base, values: { 'section.field': value } }
// and turned into one <style> (see css()); index.html puts the last one back
// before first paint from localStorage 'sift-custom'.
import { askYes } from './ask.js';

export const HAND = '"Segoe Print", "Bradley Hand", "Noteworthy", "Chalkboard SE", "Comic Sans MS", cursive';
// Only fonts already on phones and computers (nothing is downloaded).
export const FONTS = [
  ['system', 'Plain', 'system-ui, -apple-system, "Segoe UI", sans-serif'],
  ['hand', 'Handwriting', HAND], // the Schedule times' font on the Sift test site
  ['marker', 'Marker', '"Marker Felt", "Segoe Script", "Bradley Hand", cursive'],
  ['rounded', 'Rounded', 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif'],
  ['serif', 'Serif', 'Georgia, "Times New Roman", serif'],
  ['book', 'Book', '"Palatino Linotype", Palatino, "Book Antiqua", serif'],
  ['typewriter', 'Typewriter', '"American Typewriter", "Courier New", Courier, monospace'],
  ['mono', 'Code', 'ui-monospace, "Cascadia Code", "SF Mono", Consolas, Menlo, monospace'],
  ['narrow', 'Narrow', '"Avenir Next Condensed", "Arial Narrow", sans-serif-condensed, sans-serif'],
];
const fontStack = id => FONTS.find(f => f[0] === id)?.[2];
export const BASES = ['glass', 'glass-fancy', 'dark', 'light'];

// A field: [key, label, what it sets]. What it sets is either a CSS variable
// list for the section's scope ('--text') or [selector inside the scope,
// property]. A field's key ending in "font" takes a font, anything else a colour.
const everyArea = [['text', 'Text', '--text'], ['muted', 'Faint text', '--muted'], ['accent', 'Links and highlights', '--accent'], ['panel', 'Panels', '--glass'], ['font', 'Font', '--font'], ['handfont', 'Headings font', '--hand-keep']];
const area = (id, label, extra = []) => ({ id, label, scope: `#main[data-area="${id}"]`, fields: everyArea.concat(extra) });
export const SECTIONS = [
  { id: 'app', label: 'Whole app', scope: '', fields: [
    ['bg', 'Background', '--bg'], ['text', 'Text', '--text'], ['muted', 'Faint text', '--muted'], ['accent', 'Links and highlights', '--accent'],
    ['panel', 'Panels', '--glass'], ['edge', 'Panel edges', '--glass-border'], ['sheet', 'Sheets and pop-ups', '--glass-strong'], ['menu', 'Menus', '--menu-bg'],
    ['font', 'Font', '--font'], ['notesfont', 'Notes and lists font', '--hand'], ['handfont', 'Headings font', '--hand-keep'],
  ] },
  { id: 'bars', label: 'Top and bottom bars', scope: '', fields: [['bg', 'Background', ['.appbar, .tabbar', 'background']], ['text', 'Text', ['.appbar, .tab, .tab[aria-current]', 'color']], ['font', 'Font', ['.appbar, .tabbar', 'font-family']]] },
  area('dump', 'Brain Dump', [['note', 'Notes', ['.thought-body', 'color']], ['notefont', 'Notes font', ['.thought-body, .thought-edit', 'font-family']]]),
  area('tasks', 'Tasks', [['title', 'Task names', ['.task-title', 'color']], ['titlefont', 'Task names font', ['.task-title', 'font-family']], ['note', 'Task notes', ['.item-note, .task-notes .rich-edit', 'color']], ['notefont', 'Task notes font', ['.item-note, .task-notes .rich-edit', 'font-family']]]),
  { id: 'planner', label: 'Day Planner', scope: '#main[data-area="planner"] .planner', fields: [
    ['text', 'Text', '--text'], ['muted', 'Faint text', '--muted'], ['ink', 'Ink', '--ink'],
    ['day', 'Day title', ['.day-title .weekday, .day-title .date', 'color']], ['dayfont', 'Day title font', ['.day-title .weekday, .day-title .date', 'font-family']],
    ['heads', 'Schedule, Tasks and Notes titles', ['.schedule-title, .pile h2, .day-tasks h2, .day-notes h2', 'color']], ['headsfont', 'Schedule, Tasks and Notes titles font', ['.schedule-title, .pile h2, .day-tasks h2, .day-notes h2', 'font-family']],
    ['labels', 'Day focus and Energy', ['.focus > span, .hand-label', 'color']], ['labelsfont', 'Day focus and Energy font', ['.focus > span, .hand-label', 'font-family']],
    ['times', 'Schedule times', ['.line .margin', 'color']], ['timesfont', 'Schedule times font', ['.line .margin', 'font-family']],
    ['items', 'Schedule and Tasks lines', ['.line .item-title, .day-task-list .task-link', 'color']], ['itemsfont', 'Schedule and Tasks lines font', ['.line .item-title, .day-task-list .task-link', 'font-family']],
    ['notesfont', 'Notes font', ['.day-notes .rich-edit', 'font-family']],
    ['rule', 'Ruled lines', '--rule'], ['margin', 'Margin line', '--margin-rule'], ['focusink', 'Day focus ink', '--focus-ink'], ['energyink', 'Energy ink', '--energy-ink'],
  ] },
  area('lists', 'Lists', [['title', 'List items', ['.task-title', 'color']], ['titlefont', 'List items font', ['.task-title', 'font-family']]]),
  area('places', 'Find Things'), area('contacts', 'Contacts'), area('scans', 'Scans'), area('contracts', 'Contracts'), area('recipes', 'Recipes'), area('bin', 'Archive and Bin'), area('settings', 'Settings'),
];
export const isFont = key => key.endsWith('font');

// The CSS for the picked values. html:root[data-custom] outweighs every theme
// and paper rule it replaces, and #main (or the planner) the area's own rules.
export function css(values = {}) {
  const out = [];
  for (const sec of SECTIONS) {
    const vars = [];
    for (const [key, , sets] of sec.fields) {
      const raw = values[`${sec.id}.${key}`];
      const value = isFont(key) ? fontStack(raw) : /^#[0-9a-f]{6}$/i.test(raw || '') ? raw : null;
      if (!value) continue;
      const scope = `html:root[data-custom] ${sec.scope}`.trim();
      if (typeof sets === 'string') {
        vars.push(`${sets}: ${value};`);
        if (sets === '--bg') vars.push('--bg-image: none;');
      } else out.push(`${sets[0].split(', ').map(s => `${scope} ${s}`).join(', ')} { ${sets[1]}: ${value} !important; }`);
    }
    if (vars.length) out.unshift(`${`html:root[data-custom] ${sec.scope}`.trim()} { ${vars.join(' ')} }`);
  }
  return out.join('\n');
}

// A colour as #rrggbb for <input type="color"> (see-through colours lose their see-through).
const probe = document.createElement('canvas').getContext('2d');
function hex(colour) {
  probe.fillStyle = '#000';
  probe.fillStyle = colour || '#000';
  const m = String(probe.fillStyle).match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? '#' + m.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('') : probe.fillStyle;
}

// What a field shows now, for a field not picked yet: read off the page.
function shownNow(sec, key, sets) {
  const scopeEl = sec.scope ? document.querySelector(sec.scope) : document.documentElement;
  if (typeof sets === 'string') {
    const from = scopeEl || document.documentElement;
    return sets.startsWith('--') ? getComputedStyle(from).getPropertyValue(sets).trim() : '';
  }
  const el = document.querySelector(sets[0].split(', ').map(s => `${sec.scope} ${s}`.trim()).join(', '));
  return el ? getComputedStyle(el).getPropertyValue(sets[1]) : '';
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The large overlay: the starting theme, then every section's fonts and colours.
// Changes show straight away; each one is saved as it's made.
export function openEditor({ app, store }) {
  let dlg = document.getElementById('custom-theme');
  if (dlg) { dlg.showModal(); return; }
  dlg = document.createElement('dialog');
  dlg.id = 'custom-theme';
  dlg.className = 'custom-theme';
  dlg.setAttribute('aria-label', 'Custom theme');
  document.body.append(dlg);
  const draw = () => {
    const { base, values } = app.customTheme();
    const row = (sec, [key, label, sets]) => {
      const id = `${sec.id}.${key}`;
      const picked = values[id];
      const control = isFont(key)
        ? `<select data-field="${id}"><option value="">As the theme</option>${FONTS.map(([f, name, stack]) => `<option value="${f}" style="font-family:${esc(stack)}"${picked === f ? ' selected' : ''}>${name}</option>`).join('')}</select>`
        : `<input type="color" data-field="${id}" value="${picked || hex(shownNow(sec, key, sets))}">`;
      return `<div class="ct-row${picked ? ' is-set' : ''}"><span class="ct-label">${label}</span>${control}<button type="button" class="ct-reset" data-reset="${id}" aria-label="Back to the theme's ${esc(label.toLowerCase())}" title="Back to the theme's"${picked ? '' : ' hidden'}>↺</button></div>`;
    };
    dlg.innerHTML = `
      <div class="ct-head"><h2>Custom theme</h2><button type="button" class="primary" data-act="done">Done</button></div>
      <div class="ct-body">
        <p class="muted">Pick a font or colour for anything below; it changes straight away. Anything not picked stays as the starting theme has it. ↺ puts one back.</p>
        <label class="ct-row ct-base"><span class="ct-label">Start from</span><select data-base>${BASES.map(b => `<option value="${b}"${b === base ? ' selected' : ''}>${esc(app.THEMES.find(t => t.id === b).label)}</option>`).join('')}</select></label>
        ${SECTIONS.map(sec => `<section class="ct-section"><h3>${sec.label}</h3>${sec.fields.map(f => row(sec, f)).join('')}</section>`).join('')}
        <p><button type="button" class="danger" data-act="reset-all">Put everything back</button></p>
      </div>`;
  };
  const save = changes => app.setCustomTheme(changes);
  dlg.addEventListener('input', e => {
    const f = e.target.dataset.field;
    if (f && e.target.type === 'color') app.previewCustom(f, e.target.value); // live while dragging; saved on change
  });
  dlg.addEventListener('change', async e => {
    const t = e.target;
    if (t.matches('[data-base]')) { await save({ base: t.value }); draw(); return; }
    const f = t.dataset.field;
    if (!f) return;
    await save({ values: { [f]: t.value || null } });
    const row = t.closest('.ct-row');
    row.classList.toggle('is-set', !!t.value);
    row.querySelector('.ct-reset').hidden = !t.value;
  });
  dlg.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reset) { await save({ values: { [b.dataset.reset]: null } }); draw(); }
    else if (b.dataset.act === 'done') dlg.close();
    else if (b.dataset.act === 'reset-all' && await askYes('Put every font and colour back to the starting theme?', { ok: 'Put back', danger: true })) { await save({ values: null }); draw(); }
  });
  draw();
  dlg.showModal();
}
