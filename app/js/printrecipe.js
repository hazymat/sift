// Batch Book printing (an open recipe's or batch's Share, a card's ⋯ 🖨 Print…, print.js):
//   printRecipes({ items, title, back, times, book })  the whole recipe (or a batch: its recipe, readings, diary, tasting),
//       scaled up or down; short ones share a page. items: [{ title, emoji, colour, book, description, fields, rec, photo,
//       batch: { date, status, readings, diary, tasting } }], rec: what has the ingredients and steps (recipe or batch);
//       book: [items] for "Every recipe in this book".
//   printLabels(item)  🏷 labels for jars, bottles, tins and boxes on standard A4 label sheets.
//       item: { title, emoji, colour, book, sub, description, date, abv, og, fg, ings }
import { openPrint, esc, filePicture } from './print.js';
import { stepsOf, stepHtml, amountText, qtyText } from './batchbook.js';

const SCALES = [[1 / 3, '×⅓'], [0.5, '×½'], [2 / 3, '×⅔'], [1, '×1 (as written)'], [1.5, '×1½'], [2, '×2'], [2.5, '×2½'], [3, '×3'], [4, '×4'], [5, '×5'], [6, '×6'], [8, '×8'], [10, '×10']];
// Markdown notes (tasting) as plain lines for paper.
const plainMd = md => String(md || '').replace(/\*\*|__|~~|^#+\s*/gm, '').trim();

const RECIPE_CSS = `
.rc { --c: var(--accent); padding: 0 0 1.4em; break-inside: avoid; }
.rc + .rc { border-top: 1px dashed var(--rule); padding-top: 1.4em; }
.per1 .rc + .rc { break-before: page; border-top: 0; padding-top: 0; }
.colour .rc { --accent: var(--c); }
.rh { display: flex; gap: 1em; align-items: flex-start; border-bottom: .16em solid var(--accent); padding-bottom: .5em; margin-bottom: .7em; }
.rh .em { font-size: 2.6em; line-height: 1; } .bw .rh .em { filter: grayscale(1); }
.rh .tt { flex: 1; min-width: 0; }
.rh .bk { font-size: .7em; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); font-weight: 700; }
.rh h1 { font: 700 2.1em/1.08 Georgia, serif; margin: .05em 0 0; }
.rh .ds { font: italic 1.05em Georgia, serif; color: var(--soft); margin: .25em 0 0; }
.rh .sc { display: inline-block; margin-left: .5em; font: 700 .42em/1 system-ui, sans-serif; vertical-align: middle; padding: .35em .6em; border-radius: 1em; border: .14em solid var(--accent); color: var(--accent); }
.rh img.photo { width: calc(7.5em * var(--ps, 1)); height: calc(5.6em * var(--ps, 1)); max-width: 45%; object-fit: cover; border-radius: .3em; flex: none; }
.facts { display: flex; flex-wrap: wrap; gap: .3em 1.4em; font-size: .9em; margin: 0 0 .8em; }
.facts span { color: var(--soft); } .facts b { font-weight: 600; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); gap: 1.6em; }
.stack .cols { display: block; } .stack .ing { margin-bottom: 1em; }
h2 { font: 700 1.15em Georgia, serif; color: var(--accent); margin: 0 0 .4em; }
.ing table { border-collapse: collapse; width: 100%; } .ing td { padding: .22em 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
.ing td.a { text-align: right; font-weight: 700; white-space: nowrap; padding-right: .6em; width: 1%; }
.ing td small { color: var(--soft); }
.st ol { margin: 0; padding: 0; list-style: none; counter-reset: st; }
.st li { counter-increment: st; display: flex; gap: .7em; margin: 0 0 .55em; line-height: 1.4; }
.st li::before { content: counter(st); flex: none; width: 1.55em; height: 1.55em; border-radius: 50%; background: var(--accent); color: #fff; font: 700 .8em/1.55em system-ui, sans-serif; text-align: center; margin-top: .1em; }
.bw .st li::before { background: none; color: var(--ink); border: .12em solid var(--ink); line-height: 1.4em; }
.st .ref { font-weight: 600; }
.more { margin-top: 1em; } .more h2 { margin-top: .6em; }
.rd { border-collapse: collapse; width: 100%; font-size: .92em; } .rd td, .rd th { text-align: left; padding: .2em .5em .2em 0; border-bottom: 1px solid var(--rule); } .rd th { color: var(--soft); font-weight: 600; }
.diary p, .tasting { margin: 0 0 .4em; white-space: pre-wrap; line-height: 1.4; } .diary b { margin-right: .5em; }
.lines div { height: 2em; border-bottom: 1px solid var(--rule); }`;

export async function printRecipes({ items, title, back, times = 1, book = null }) {
  const one = items[0];
  const pictures = new Map();
  return openPrint({
    kind: 'recipe', title, back, photos: true,
    defaults: { _times: times, _by: '', which: 'this', per: 'auto', layout: 'side', photo: true, details: true, batch: true, lines: 0 },
    options: [
      ['Scale'], { select: '_times', words: 'Amounts', items: SCALES }, { text: '_by', words: 'Or by', placeholder: 'like 1.25 or 750/1000' },
      { hint: 'Every amount, in the list and in the steps, is scaled. Only this printout changes.' },
      ...(book && book.length > 1 ? [['Which'], { seg: 'which', items: [['this', 'This one'], ['book', `Every recipe in ${one.book || 'this book'} (${book.length})`]] }] : []),
      ['Layout'], { seg: 'per', items: [['auto', 'Short ones share a page'], ['1', 'One per page']], hint: 'Short recipes print two or three to a page, with a dashed line to cut along.' },
      { seg: 'layout', items: [['side', 'Ingredients beside the method'], ['stack', 'Ingredients above']] },
      ['What goes in'], { check: 'photo', words: 'Its picture' }, { check: 'details', words: 'Details (book, tags and the rest)' },
      ...(one.batch ? [{ check: 'batch', words: 'Readings, diary and tasting notes' }] : []),
      { range: 'lines', words: 'Lines for notes', min: 0, max: 12 },
    ],
    build: async (ch, keep) => {
      const typed = String(ch._by || '').trim().replace(/^[×x*]\s*/i, '');
      const frac = typed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      const by = frac ? +frac[1] / +frac[2] : parseFloat(typed);
      const k = by > 0 && Number.isFinite(by) ? by : ch._times;
      const list = ch.which === 'book' && book ? book : items;
      const blocks = [];
      for (const it of list) {
        let pic = null;
        if (ch.photo && it.photo) { if (!pictures.has(it.photo.id)) pictures.set(it.photo.id, await filePicture(it.photo, keep, 500)); pic = pictures.get(it.photo.id); }
        const ings = it.rec.ingredients || [];
        const steps = stepsOf(it.rec);
        const facts = ch.details ? Object.entries(Object.assign({}, it.extra, it.fields)).filter(([, v]) => String(v || '').trim()) : [];
        const b = it.batch;
        blocks.push(`<article class="rc" style="--c:${esc(it.colour || '#2f6f8f')}">
          <header class="rh"><span class="em">${esc(it.emoji || '')}</span><div class="tt">${it.book ? `<div class="bk">${esc(it.book)}</div>` : ''}<h1>${esc(it.title || 'Untitled')}${k !== 1 ? `<span class="sc">×${esc(qtyText(k))}</span>` : ''}</h1>${it.description ? `<p class="ds">${esc(it.description)}</p>` : ''}</div>${pic ? `<img class="photo" src="${pic}" alt="">` : ''}</header>
          ${facts.length ? `<div class="facts">${facts.map(([key, v]) => `<div><span>${esc(key)}</span> <b>${esc(v)}</b></div>`).join('')}</div>` : ''}
          <div class="cols">${ings.length ? `<section class="ing"><h2>Ingredients</h2><table>${ings.map(i => `<tr><td class="a">${esc(amountText(i, k))}</td><td>${esc(i.item)}${i.note ? ` <small>${esc(i.note)}</small>` : ''}</td></tr>`).join('')}</table></section>` : ''}
            ${steps.length ? `<section class="st"><h2>Method</h2><ol>${steps.map(x => `<li><span>${stepHtml(x.text, ings, k, esc).replace(/<span class="bb-ref[^"]*"[^>]*>/g, '<span class="ref">')}</span></li>`).join('')}</ol></section>` : ''}</div>
          ${b && ch.batch ? `<div class="more">${b.readings.length ? `<h2>Readings</h2><table class="rd"><tr><th>Date</th><th>Reading</th><th>Note</th></tr>${b.readings.map(e => `<tr><td>${esc(e.day)}</td><td>${esc(e.what)}</td><td>${esc(e.text || '')}</td></tr>`).join('')}</table>` : ''}
            ${b.diary.length ? `<h2>Diary</h2><div class="diary">${b.diary.map(e => `<p>${e.day ? `<b>${esc(e.day)}</b>` : ''}${esc(e.text || '')}</p>`).join('')}</div>` : ''}
            ${plainMd(b.tasting) ? `<h2>Tasting notes</h2><p class="tasting">${esc(plainMd(b.tasting))}</p>` : ''}</div>` : ''}
          ${ch.lines ? `<div class="more"><h2>Notes</h2><div class="lines">${'<div></div>'.repeat(ch.lines)}</div></div>` : ''}
        </article>`);
      }
      return { flow: true, css: RECIPE_CSS, html: `<div class="flow ${ch.layout === 'stack' ? 'stack' : ''} ${ch.per === '1' ? 'per1' : ''}">${blocks.join('')}</div>`,
        count: `${list.length === 1 ? '1 recipe' : `${list.length} recipes`}${k !== 1 ? ` · ×${qtyText(k)}` : ''}`, note: ch.per === 'auto' ? 'Short ones share a page when printed' : '' };
    },
  });
}

// Label sheets (A4): size in mm, columns × rows, the sheet's top and left margins and the gap between columns.
const SHEETS = {
  s: { w: 63.5, h: 38.1, cols: 3, rows: 7, top: 15.15, left: 7.25, gap: 2.5, fs: 6.4 },
  m: { w: 99.1, h: 67.7, cols: 2, rows: 4, top: 13, left: 4.65, gap: 2.5, fs: 9.5 },
  l: { w: 99.1, h: 139, cols: 2, rows: 2, top: 9.5, left: 4.65, gap: 2.5, fs: 12.5 },
};
const LABEL_CSS = `
.lab { position: absolute; overflow: hidden; display: flex; background: #fffaf0; }
.bw .lab { background: #fff; }
@media screen { .lab { outline: 1px dashed #c9c9c9; } .lab.skip { background: repeating-linear-gradient(45deg, #fff, #fff 6px, #f3f3f3 6px, #f3f3f3 12px); } }
.lab .bar { width: .9em; background: var(--c); flex: none; } .bw .lab .bar { background: none; border-right: .18em solid var(--ink); }
.lab .in { flex: 1; min-width: 0; padding: .9em 1em .7em; display: flex; flex-direction: column; }
.lab .top { display: flex; justify-content: space-between; align-items: flex-start; gap: .5em; }
.lab .eye { font-size: .62em; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; color: var(--c); } .bw .lab .eye { color: var(--ink); }
.lab .emo { font-size: 1.6em; line-height: 1; } .bw .lab .emo { filter: grayscale(1); }
.lab h1 { font: 700 1.75em/1.05 Georgia, serif; margin: .1em 0 0; color: #2a1a20; } .bw .lab h1 { color: var(--ink); }
.lab .sub { font: italic .8em Georgia, serif; color: #6b5a60; margin-top: .2em; } .bw .lab .sub { color: var(--ink); }
.lab .own { font-size: .78em; margin-top: .35em; }
.lab .ings { font-size: .68em; color: #6b5a60; margin-top: .3em; } .bw .lab .ings { color: var(--ink); }
.lab .sp { flex: 1; }
.lab .facts { display: flex; border-top: .1em solid var(--c); padding-top: .4em; font-size: .66em; color: #5b4650; gap: .6em; } .bw .lab .facts { border-top-color: var(--ink); color: var(--ink); }
.lab .facts > div { flex: 1; } .lab .facts b { display: block; font-size: 1.25em; color: #2a1a20; } .bw .lab .facts b { color: var(--ink); }
.lab .facts .big b { font: 700 1.9em/1 Georgia, serif; }
.lab .wl { font-size: .72em; display: flex; gap: .8em; margin-top: .35em; } .lab .wl span { flex: 1; border-bottom: 1px solid #999; padding-bottom: .1em; color: #6b5a60; }
.s .lab .ings, .s .lab .own { display: none; }`;

export async function printLabels(it) {
  const isBatch = !!it.batch;
  return openPrint({
    kind: 'labels', title: `${it.title} labels`, back: it.back || it.title, paper: false,
    defaults: { size: 'm', count: 8, start: 1, eye: true, sub: true, date: true, abv: true, gravity: true, ings: false, write: !isBatch, own: '' },
    options: [
      ['Label size'], { seg: 'size', items: [['s', '63 × 38 mm (21)'], ['m', '99 × 67 mm (8)'], ['l', '99 × 139 mm (4)']], hint: 'The usual A4 label sheets. Try one on plain paper first, held up to a sheet.' },
      { range: 'count', words: 'How many', min: 1, max: 42 }, { range: 'start', words: 'Start at label', min: 1, max: 21 }, { hint: 'To use up a part-used sheet.' },
      ['On the label'], { check: 'eye', words: isBatch ? 'Book and batch' : 'Book' }, { check: 'sub', words: 'Description' },
      ...(isBatch ? [{ check: 'date', words: 'Date made' }, ...(it.abv ? [{ check: 'abv', words: 'ABV' }, { check: 'gravity', words: 'OG → FG' }] : [])] : []),
      ...(it.ings?.length ? [{ check: 'ings', words: 'Main ingredients' }] : []),
      { check: 'write', words: 'Lines to write on (Made, Use by)' }, { text: 'own', words: 'A line of your own', placeholder: 'Best after Jan 2027' },
    ],
    build: async ch => {
      const g = SHEETS[ch.size] || SHEETS.m, per = g.cols * g.rows;
      const start = Math.min(ch.start, per) - 1, total = start + ch.count;
      const facts = [isBatch && ch.abv && it.abv ? `<div class="big"><b>${esc(it.abv)}</b>ABV</div>` : '', isBatch && ch.gravity && it.og ? `<div><b>${esc(it.og)} → ${esc(it.fg)}</b>OG → FG</div>` : '',
        isBatch && ch.date && it.date ? `<div><b>${esc(it.date)}</b>made</div>` : ''].filter(Boolean);
      const label = `<div class="in"><div class="top">${ch.eye && it.eye ? `<div class="eye">${esc(it.eye)}</div>` : '<span></span>'}<div class="emo">${esc(it.emoji || '')}</div></div>
        <h1>${esc(it.title)}</h1>${ch.sub && it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}${ch.own ? `<div class="own">${esc(ch.own)}</div>` : ''}
        ${ch.ings && it.ings?.length ? `<div class="ings">${esc(it.ings.slice(0, 4).join(' · '))}</div>` : ''}<div class="sp"></div>
        ${facts.length ? `<div class="facts">${facts.join('')}</div>` : ''}${ch.write ? '<div class="wl"><span>Made</span><span>Use by</span></div>' : ''}</div>`;
      const sheets = [];
      for (let first = 0; first < total; first += per) {
        let cells = '';
        for (let n = 0; n < per; n++) {
          const at = first + n;
          if (at >= total && first > 0) break;
          const x = g.left + (n % g.cols) * (g.w + g.gap), y = g.top + Math.floor(n / g.cols) * g.h;
          const used = at >= start && at < total;
          cells += `<div class="lab${used ? '' : ' skip'}" style="left:${x}mm;top:${y}mm;width:${g.w}mm;height:${g.h}mm">${used ? `<div class="bar"></div>${label}` : ''}</div>`;
        }
        sheets.push(`<section class="sheet ${ch.size}" style="font-size:${g.fs}pt">${cells}</section>`);
      }
      return { css: LABEL_CSS + `.lab { --c: ${it.colour || '#9b2f52'}; }`, html: sheets.join(''), page: { size: '210mm 297mm', margin: '0' },
        count: `${ch.count} ${ch.count === 1 ? 'label' : 'labels'} on ${sheets.length} ${sheets.length === 1 ? 'sheet' : 'sheets'}`, note: "Dashed lines and shaded labels don't print" };
    },
  });
}
