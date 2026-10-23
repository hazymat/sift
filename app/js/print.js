// Print (1.61.00): the 🖨 Print… at the end of every Share menu opens this screen, a page of its own over the app:
// choices on the left, a live preview on the right, 🖨 Print (Ctrl+P) under the choices, ‹ Back or Esc to leave.
// The preview is the page that prints (an iframe printed as it is), so what shows is what comes out.
// Each kind of thing (a day, a case, a list...) remembers its own choices on this device (device setting `print`).
// Every kind gets Look (Colour, or Black and white: line art, no blocks of colour, photos in grey) and Paper.
import * as store from './store.js';
import { keys, MAC } from './keys.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const PAPERS = { A5: [148, 210], A4: [210, 297], A3: [297, 420], Letter: [216, 279] };
export const printItem = (attr, words = 'Print…') => `<button type="button" ${attr}>🖨 ${words}</button>`;

// Shared look of every printout. --pw / --ph: the paper in mm; 1em grows with the paper (11pt on A4).
const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "Segoe UI", system-ui, -apple-system, Calibri, Arial, sans-serif; color: #1a202c; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { width: calc(var(--pw) * 1mm); height: calc(var(--ph) * 1mm); font-size: calc(var(--pw) / 210 * 11pt); position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
.flow { width: calc(var(--pw) * 1mm); min-height: calc(var(--ph) * 1mm); font-size: calc(var(--pw) / 210 * 11pt); background: #fff; padding: 12mm 13mm; }
.serif { font-family: Georgia, "Times New Roman", serif; }
.bw img.photo { filter: grayscale(1) contrast(1.25); }
:root { --accent: #2b6cb0; --soft: #5b6b80; --rule: #d9e1ec; --fill: #eef3fb; --ink: #1a202c; }
.bw { --accent: #1a202c; --soft: #555; --rule: #bbb; --fill: transparent; }
@media screen {
  html { background: #3b4252; }
  body { padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 18px; zoom: var(--z, 1); }
  .sheet, .flow { box-shadow: 0 10px 34px rgba(0, 0, 0, .45); border-radius: 2px; }
}
@media print { .flow { padding: 0; width: auto; min-height: 0; } }`;

const screenCss = `
.print-screen { position: fixed; inset: 0; z-index: 900; background: var(--bg); background-image: var(--bg-image, none); color: var(--text); display: flex; flex-direction: column; padding: 12px clamp(10px, 2vw, 22px) 12px; }
.print-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; min-width: 0; }
.print-top .back { padding: 6px 14px 6px 10px; flex: none; }
.print-top h1 { font-size: 1.3rem; margin: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.print-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(250px, 330px) 1fr; gap: 16px; }
.print-opts { overflow: auto; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 18px; padding: 12px 16px 14px; }
.print-opts h3 { font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 14px 0 6px; font-weight: 700; }
.print-opts h3:first-child { margin-top: 2px; }
.print-opts label.pc { display: flex; gap: 10px; align-items: center; padding: 3px 0; }
.print-opts input[type=checkbox] { width: 18px; height: 18px; margin: 0; flex: none; accent-color: var(--accent); }
.print-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.print-seg button { padding: 4px 12px; font-size: .88rem; border-radius: 999px; }
.print-seg button[aria-pressed="true"] { background: var(--active-bg); border-color: var(--active-border); }
.print-row { display: flex; align-items: center; gap: 10px; padding: 3px 0; }
.print-row input[type=range] { flex: 1; min-width: 60px; accent-color: var(--accent); }
.print-row b { min-width: 2.2em; text-align: right; font-variant-numeric: tabular-nums; }
.print-row select { width: auto; padding: 4px 8px; }
.print-row input[type=text] { flex: 1; padding: 5px 9px; }
.print-hint { color: var(--muted); font-size: .8rem; margin: 4px 0 0; }
.print-actions { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
.print-actions .spacer { flex: 1; }
.print-view { min-height: 0; display: flex; flex-direction: column; background: rgba(0, 0, 0, .28); border: 1px solid var(--glass-border); border-radius: 18px; overflow: hidden; }
.print-view-head { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: .8rem; padding: 8px 14px 0; }
.print-frame { flex: 1; width: 100%; border: 0; background: transparent; }
@media (max-width: 760px) {
  .print-screen { overflow: auto; }
  .print-grid { display: flex; flex-direction: column-reverse; }
  .print-view { min-height: 62vh; flex: none; }
  .print-opts { overflow: visible; }
}`;

const settingsOf = async () => (await store.getDeviceSettings()).print || {};

// opts: { kind, title, back, options: [...], defaults: {...}, build: async choices => ({ css, html, count?, note? }), paper: false, look: false }
// An option is ['Heading'], { seg: key, items: [[value, words]], hint }, { check: key, words }, { range: key, words, min, max },
// { select: key, words, items: [[value, words]] }, { text: key, words, placeholder } or { hint: words }.
export async function openPrint(opts) {
  document.querySelector('.print-screen')?.remove();
  if (!document.getElementById('print-screen-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'print-screen-css', textContent: screenCss }));
  const saved = (await settingsOf())[opts.kind] || {};
  const choices = Object.assign({ look: 'colour', paper: 'A4' }, opts.defaults, saved);
  const options = [...opts.options];
  if (opts.look !== false) options.push(['Look'], { seg: 'look', items: [['colour', 'Colour'], ['bw', 'Black and white']], hint: 'Black and white: lines only, no blocks of colour, photos in grey.' });
  if (opts.paper !== false) options.push(['Paper'], { seg: 'paper', items: Object.keys(PAPERS).map(p => [p, p]) });
  const el = document.createElement('div');
  el.className = 'print-screen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `Print ${opts.title}`);
  const control = o => {
    if (Array.isArray(o)) return `<h3>${esc(o[0])}</h3>`;
    if (o.hint && !o.seg) return `<p class="print-hint">${esc(o.hint)}</p>`;
    if (o.seg) return `<div class="print-seg" data-seg="${o.seg}">${o.items.map(([v, w]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(choices[o.seg]) === String(v)}">${esc(w)}</button>`).join('')}</div>${o.hint ? `<p class="print-hint">${esc(o.hint)}</p>` : ''}`;
    if (o.check) return `<label class="pc"><input type="checkbox" data-check="${o.check}"${choices[o.check] ? ' checked' : ''}> ${esc(o.words)}</label>`;
    if (o.range) return `<label class="print-row">${esc(o.words)} <input type="range" data-range="${o.range}" min="${o.min}" max="${o.max}" value="${choices[o.range]}"><b>${choices[o.range]}</b></label>`;
    if (o.select) return `<label class="print-row">${esc(o.words)} <select data-select="${o.select}">${o.items.map(([v, w]) => `<option value="${esc(v)}"${String(choices[o.select]) === String(v) ? ' selected' : ''}>${esc(w)}</option>`).join('')}</select></label>`;
    if (o.text) return `<label class="print-row">${esc(o.words)} <input type="text" data-text="${o.text}" value="${esc(choices[o.text] || '')}" placeholder="${esc(o.placeholder || '')}"></label>`;
    return '';
  };
  el.innerHTML = `<div class="print-top"><button type="button" class="back" data-print="close">‹ ${esc(opts.back || 'Back')}${keys('Esc')}</button><h1>Print: ${esc(opts.title)}</h1></div>
    <div class="print-grid"><div class="print-opts">${options.map(control).join('')}
      <div class="print-actions"><button type="button" data-print="close">Cancel</button><span class="spacer"></span><button type="button" class="primary" data-print="go">🖨 Print${keys(MAC ? '⌘+P' : 'Ctrl+P')}</button></div></div>
    <div class="print-view"><div class="print-view-head"><span class="print-count"></span><span class="print-note"></span></div><iframe class="print-frame" title="Print preview"></iframe></div></div>`;
  document.body.append(el);
  document.body.classList.add('printing-open');
  const frame = el.querySelector('.print-frame');
  const urls = [];
  let drawn = 0;
  const fit = () => {
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    const [pw] = PAPERS[choices.paper] || PAPERS.A4;
    doc.body.style.setProperty('--z', Math.min(1, (frame.clientWidth - 8) / (pw * 3.7795 + 36)).toFixed(3));
  };
  async function draw() {
    const mine = ++drawn;
    const out = await opts.build(choices, url => { urls.push(url); return url; });
    if (mine !== drawn) return;
    const [pw, ph] = PAPERS[choices.paper] || PAPERS.A4;
    const page = out.page || { size: `${pw}mm ${ph}mm`, margin: out.flow ? '12mm 13mm' : '0' };
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>:root { --pw: ${pw}; --ph: ${ph}; } @page { size: ${page.size}; margin: ${page.margin}; }${BASE_CSS}${out.css || ''}</style></head>
      <body class="${choices.look === 'bw' ? 'bw' : 'colour'}">${out.html}</body></html>`;
    el.querySelector('.print-count').textContent = `Preview · ${choices.paper}${out.count ? ` · ${out.count}` : ''}`;
    el.querySelector('.print-note').textContent = out.note || 'Your choices are kept for next time';
  }
  frame.addEventListener('load', fit);
  const ro = new ResizeObserver(fit);
  ro.observe(frame);
  const save = async () => { const all = await settingsOf(); all[opts.kind] = Object.fromEntries(Object.entries(choices).filter(([k]) => !k.startsWith('_'))); await store.updateDeviceSettings({ print: all }); };
  let timer;
  const changed = () => { clearTimeout(timer); timer = setTimeout(() => { draw(); save(); }, 120); };
  const close = () => {
    ro.disconnect();
    removeEventListener('keydown', onKey, true);
    el.remove();
    document.body.classList.remove('printing-open');
    urls.forEach(url => URL.revokeObjectURL(url));
    opts.onClose?.();
  };
  const go = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); };
  function onKey(ev) {
    if (ev.key === 'Escape') { if (ev.target.matches?.('input[type=text]') && ev.target.value !== (choices[ev.target.dataset.text] ?? '')) return; ev.preventDefault(); ev.stopPropagation(); close(); }
    else if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'p' || ev.key === 'P')) { ev.preventDefault(); ev.stopPropagation(); go(); }
  }
  addEventListener('keydown', onKey, true);
  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.print === 'close') return close();
    if (b.dataset.print === 'go') return go();
    const seg = b.closest('[data-seg]');
    if (seg) {
      const k = seg.dataset.seg, v = b.dataset.v;
      choices[k] = typeof opts.defaults?.[k] === 'number' ? Number(v) : v;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      changed();
    }
  });
  el.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.check) choices[t.dataset.check] = t.checked;
    else if (t.dataset.range) { choices[t.dataset.range] = Number(t.value); t.nextElementSibling.textContent = t.value; }
    else if (t.dataset.select) choices[t.dataset.select] = typeof opts.defaults?.[t.dataset.select] === 'number' ? Number(t.value) : t.value;
    else if (t.dataset.text) choices[t.dataset.text] = t.value;
    else return;
    changed();
  });
  await draw();
  el.querySelector('[data-print="go"]').focus();
  return { close, redraw: draw };
}

// A file's picture as a URL the preview can show (made into the printout's own URL list, freed on leaving).
export async function fileUrl(a, keep) {
  const { blobOf } = await import('./attachments.js');
  const blob = await blobOf(a);
  return blob ? keep(URL.createObjectURL(blob)) : '';
}
