// Share (the pill left of 👁 and ⋯, like the Day Planner's): copies what the
// page shows, as plain text, rich text, for WhatsApp or as Markdown, or prints it (🖨 Print…, print.js) or shares
// the printout as a picture or PDF file (the same Print screen, ending in Share; printshare.js).
// The Day Planner shares its own day; every other area reads its rows off the page, only the chosen ones
// when some are chosen. An opened thing with its own printout (a case) sets it in `printers`.
import { toast } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// top: the menu's first items (an opened list's 👥 Share with someone…), then a line; bottom: more after Print… (🏷 Print labels…); title: the pill's tip.
export const shareHtml = ({ top = '', bottom = '', title = 'Share (S)', cls = '' } = {}) => `<details class="tool-menu share-menu page-share${cls ? ` ${cls}` : ''}">
  <summary class="share-btn" role="button" title="${esc(title)}"><svg class="icon" aria-hidden="true"><use href="#i-share"/></svg> Share</summary>
  <div class="menu">
    ${top ? `${top}<hr>` : ''}
    <button type="button" data-page-share="plain">Copy to clipboard – plain text</button>
    <button type="button" data-page-share="rich">Copy to clipboard – rich text</button>
    <button type="button" data-page-share="whatsapp">Copy to clipboard – WhatsApp</button>
    <button type="button" data-page-share="markdown">Copy to clipboard – Markdown</button>
    <hr>
    <button type="button" data-page-print>🖨 Print…</button>
    <button type="button" data-page-print="png">🖼 Share as picture…</button>
    <button type="button" data-page-print="pdf">📄 Share as PDF…</button>${bottom}
  </div>
</details>`;

// Per area: the rows on the page, and the words of one.
const valueOf = (row, sel) => row.querySelector(sel)?.value?.trim() || '';
const firstLine = el => (el?.innerText || '').trim().split('\n')[0].trim();
const ROWS = {
  tasks: { rows: '#main .task-list li[data-task][data-id]', text: row => valueOf(row, ':scope > .task-title') },
  dump: { rows: '#thoughts > li[data-id]', text: row => (row.querySelector('.thought-flat')?.textContent || '').trim() },
  lists: { rows: '#main li[data-id]:has(> input[name="text"]), #main .project-grid .list-card', text: row => valueOf(row, ':scope > input[name="text"]') || firstLine(row) },
  places: { rows: '#main .box-card, #main li[data-item]:not(.thing-panel)', text: row => valueOf(row, 'input[name="name"]') || firstLine(row) },
  // A case open: its Timeline, each event on one line, under the case's name.
  contacts: { rows: '#main .c-card, #main .ctl-item', text: row => (row.matches('.ctl-item') ? (row.querySelector('.ctl-card')?.innerText || '').replace(/✎/g, '').replace(/\s+/g, ' ').trim() : firstLine(row.querySelector('a.c-main') || row)), title: () => document.querySelector('#main .kase-title')?.value.trim() },
  scans: { rows: '#main .scan-card', text: firstLine },
  contracts: { rows: '#main tr[data-id], #main .contract-card', text: row => (row.matches('tr') ? [...row.cells].map(cell => cell.innerText.trim()).filter(Boolean).join(' · ') : firstLine(row)) },
};

// An opened thing whose words aren't rows (a scan) sets sharers[area]: () => ({ title, lines }) or null; its lines go as they are, no bullets.
export const sharers = {};
function pageRows(area) {
  const own = sharers[area]?.();
  if (own) return own.lines.filter(Boolean).map(text => ({ text, depth: 0, bare: true }));
  const how = ROWS[area];
  if (!how) return [];
  return [...document.querySelectorAll(how.rows)].filter(row => row.offsetParent && !row.closest('[hidden]'))
    .map(row => ({ text: how.text(row), depth: +row.dataset.depth || 0, done: row.classList.contains('done'), chosen: row.classList.contains('selected') })).filter(row => row.text)
    .filter((row, n, all) => row.chosen || !all.some(x => x.chosen));
}
const ticksIn = area => ['tasks', 'lists'].includes(area);

function pageText(area, title, kind) {
  const whatsapp = kind === 'whatsapp', md = kind === 'markdown';
  if (md) return [`# ${title}`, '', ...pageRows(area).map(row => (row.bare ? `${row.text}\n` : `${'  '.repeat(row.depth)}- ${ticksIn(area) ? (row.done ? '[x] ' : '[ ] ') : ''}${row.text}`))].join('\n').trim();
  const mark = row => (!ticksIn(area) ? '•' : row.done ? (whatsapp ? '✅' : '[x]') : (whatsapp ? '⬜' : '[ ]'));
  return [whatsapp ? `*${title}*` : title, '', ...pageRows(area).map(row => (row.bare ? `${row.text}\n` : `${'    '.repeat(row.depth)}${mark(row)} ${row.text}`))].join('\n').trim();
}

function pageHtml(area, title) {
  const ticks = ticksIn(area);
  const rows = pageRows(area);
  if (rows[0]?.bare) return `<h3>${esc(title)}</h3>${rows.map(row => `<p>${esc(row.text).replace(/\n/g, '<br>')}</p>`).join('')}`;
  const items = rows.map(row => `<li style="margin-left:${row.depth * 1.5}em">${ticks ? (row.done ? '☑ ' : '☐ ') : ''}${esc(row.text)}</li>`).join('');
  return `<h3>${esc(title)}</h3><ul style="list-style:${ticks ? 'none;padding-left:0' : 'disc'}">${items}</ul>`;
}

export const printers = {};
const pageTitle = () => {
  const tab = [...document.querySelectorAll('#main [role="tablist"] [aria-pressed="true"], #main [role="tablist"] [aria-selected="true"]')].find(btn => btn.offsetParent);
  return document.title.replace(/ · Sift$/, '') + (tab ? ` – ${tab.textContent.trim()}` : '');
};

// 🖨 Print… on an area's page: what it shows, as a tidy list.
export async function printPage(area, title = pageTitle()) {
  const rows = pageRows(area);
  if (!rows.length) return toast('Nothing on this page to print');
  const { openPrint } = await import('./print.js');
  const ticks = ticksIn(area), chosen = rows.some(row => row.chosen);
  const CSS = `h1 { font: 700 2em Georgia, serif; margin: 0 0 .1em; } .when { color: var(--soft); font-size: .9em; margin-bottom: 1.2em; border-bottom: .15em solid var(--accent); padding-bottom: .5em; }
    ul { list-style: none; margin: 0; padding: 0; } li { display: flex; gap: .7em; align-items: baseline; padding: .45em 0; border-bottom: 1px solid var(--rule); break-inside: avoid; }
    .box { width: .95em; height: .95em; border: .12em solid var(--ink); border-radius: .2em; flex: none; display: inline-flex; align-items: center; justify-content: center; font-size: .85em; }
    .dot { color: var(--accent); flex: none; } li.done .t { text-decoration: line-through; color: var(--soft); }`;
  openPrint({ kind: `page-${area}`, title, back: title.split(' – ')[0], defaults: { ticked: true, boxes: true },
    options: ticks ? [['What goes in'], { check: 'ticked', words: 'Ticked ones (crossed out)' }, { check: 'boxes', words: 'Tick boxes' }] : [{ hint: 'What the page shows, as a list.' }],
    build: async ch => ({ flow: true, css: CSS, count: chosen ? `only the ${rows.length} chosen` : '',
      html: `<div class="flow"><h1>${esc(title)}</h1><div class="when">${esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div><ul>${rows.filter(row => !ticks || ch.ticked || !row.done)
        .map(row => `<li class="${row.done ? 'done' : ''}" style="margin-left:${row.depth * 1.6}em">${ticks && ch.boxes ? `<span class="box">${row.done ? '✓' : ''}</span>` : '<span class="dot">•</span>'}<span class="t">${esc(row.text)}</span></li>`).join('')}</ul></div>` }) });
}

export function installShare(getArea) {
  document.addEventListener('click', async ev => {
    const printBtn = ev.target.closest('[data-page-print]');
    if (printBtn) {
      printBtn.closest('details')?.removeAttribute('open');
      const area = getArea();
      if (printBtn.dataset.pagePrint) (await import('./print.js')).shareNext(printBtn.dataset.pagePrint); // Share as picture / PDF: the same Print screen, ending in Share
      if (!(await printers[area]?.())) printPage(area);
      return;
    }
    const btn = ev.target.closest('[data-page-share]');
    if (!btn) return;
    btn.closest('details')?.removeAttribute('open');
    const area = getArea();
    const kind = btn.dataset.pageShare;
    const tab = [...document.querySelectorAll('#main [role="tablist"] [aria-pressed="true"], #main [role="tablist"] [aria-selected="true"]')].find(btn => btn.offsetParent);
    const title = sharers[area]?.()?.title || ROWS[area]?.title?.() || document.title.replace(/ · Sift$/, '') + (tab ? ` – ${tab.textContent.trim()}` : '');
    if (!pageRows(area).length) return toast('Nothing on this page to share');
    try {
      if (kind === 'rich' && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([pageHtml(area, title)], { type: 'text/html' }),
          'text/plain': new Blob([pageText(area, title, 'plain')], { type: 'text/plain' }),
        })]);
      } else await navigator.clipboard.writeText(pageText(area, title, kind));
      toast({ plain: 'Copied as plain text', rich: 'Copied as rich text', whatsapp: 'Copied for WhatsApp', markdown: 'Copied as Markdown' }[kind]);
    } catch {
      toast("Couldn't copy: the browser blocked the clipboard");
    }
  });
  // At the top level (nothing picked, not typing): V opens 👁, S Share, . the page's ⋯.
  const MENUS = { v: 'details.view-menu', s: 'details.share-menu', '.': 'details.page-more' };
  addEventListener('keydown', ev => {
    if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.isComposing || ev.defaultPrevented) return;
    const sel = MENUS[(ev.key || '').toLowerCase()];
    if (!sel) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused !== document.documentElement) return;
    if (document.querySelector('dialog[open], details.tool-menu[open], .kb-cur')) return;
    const menu = [...document.querySelectorAll(`#main ${sel}`)].find(details => details.offsetParent);
    if (!menu) return;
    ev.preventDefault();
    menu.open = true;
    menu.dataset.byKey = '1'; // Esc then leaves it with nothing picked
    menu.querySelector(':scope > summary').focus();
  });
}
