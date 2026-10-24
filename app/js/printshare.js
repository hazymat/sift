// Share as picture / Share as PDF on the Print screen (print.js): the printout as it looks in the preview, colour,
// photos and all, made on this device with html2canvas (app/vendor/html2canvas-1.4.1, fetched the first time, then
// kept; see sw.js) and handed to the share sheet as a file (WhatsApp sends it as an attachment), or saved where
// sharing files isn't possible (a picture is also copied, to paste into WhatsApp Web).
//
//   shareAs('png' | 'pdf', doc, { pw, ph, title })  doc: the preview's whole HTML document; pw, ph: the paper in mm
import { toast } from './toast.js';

const LIB = new URL('../vendor/html2canvas-1.4.1/html2canvas.min.js', import.meta.url).href;
const MM = 96 / 25.4; // CSS px in a mm
const SCALE = 2; // sharp on a phone screen
// The preview's look for the screen, undone: no grey desk, shadows or zoom.
const FLAT = '<style>@media screen { html { background: #fff !important; } body { padding: 0 !important; gap: 0 !important; zoom: 1 !important; } .sheet, .flow { box-shadow: none !important; border-radius: 0 !important; } .flow { min-height: 0 !important; } }</style>';

// The printout drawn in a hidden frame at the paper's size, with html2canvas loaded into it.
async function frameOf(doc, pw) {
  const frame = Object.assign(document.createElement('iframe'), { title: 'Picture of the printout' });
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${Math.ceil(pw * MM)}px;height:400px;border:0;visibility:hidden`;
  frame.srcdoc = doc.replace('</head>', `${FLAT}<script src="${LIB}"></script></head>`);
  const loaded = new Promise((done, fail) => { frame.onload = done; frame.onerror = fail; });
  document.body.append(frame);
  await loaded;
  const win = frame.contentWindow, d = frame.contentDocument;
  await Promise.all([...d.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
  await d.fonts?.ready;
  if (!win.html2canvas) { frame.remove(); throw new Error('html2canvas not loaded'); }
  // html2canvas leaves out CSS filters (a scan in black and white): those pictures are drawn with their filter first.
  for (const img of d.images) {
    const filter = win.getComputedStyle(img).filter;
    if (!filter || filter === 'none' || !img.naturalWidth) continue;
    const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
    const ctx = canvas.getContext('2d');
    if (!('filter' in ctx)) continue;
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0);
    img.style.filter = 'none';
    img.src = canvas.toDataURL('image/jpeg', 0.9);
    await img.decode().catch(() => null);
  }
  return frame;
}

const draw = (frame, el) => frame.contentWindow.html2canvas(el, { scale: SCALE, backgroundColor: '#ffffff', logging: false, useCORS: true });

// Where a flowing printout can be cut between pages: the bottoms of its blocks (rows, paragraphs, recipes), in px from its top.
function cutsIn(flow) {
  const top = flow.getBoundingClientRect().top;
  return [...flow.querySelectorAll(':scope > *, :scope > * > *, li, tr, p, article, section, h2')].map(el => el.getBoundingClientRect().bottom - top).sort((a, b) => a - b);
}

// A PDF of JPEG pages, each placed at { x, y, w, h } mm on a pw × ph mm page.
function pdfOf(pages, pw, ph) {
  const pt = mm => +(mm * 72 / 25.4).toFixed(2);
  const enc = new TextEncoder();
  const parts = [], offsets = [];
  let size = 0;
  const add = chunk => { const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk; parts.push(bytes); size += bytes.length; };
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const obj = (n, body) => { offsets[n] = size; add(`${n} 0 obj\n`); body.forEach(add); add('\nendobj\n'); };
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`]);
  pages.forEach((p, i) => {
    const n = 3 + i * 3;
    const draw = `q ${pt(p.w)} 0 0 ${pt(p.h)} ${pt(p.x)} ${pt(ph - p.y - p.h)} cm /Im Do Q`;
    obj(n, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(pw)} ${pt(ph)}] /Resources << /XObject << /Im ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`]);
    obj(n + 1, [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`]);
    obj(n + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.px} /Height ${p.py} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream']);
  });
  const count = 3 + pages.length * 3, xref = size;
  add(`xref\n0 ${count}\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
const jpegOf = canvas => { const data = atob(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]); const bytes = new Uint8Array(data.length); for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i); return bytes; };
const pngOf = canvas => new Promise(done => canvas.toBlob(done, 'image/png'));

// Pictures of the printout: each fixed page (.sheet) as it is, a flowing one (.flow) whole, or cut into pages for a PDF.
async function pagesOf(frame, kind, pw, ph) {
  const d = frame.contentDocument;
  const els = [...d.querySelectorAll('body > .sheet, body > .flow')];
  const out = [];
  for (const el of els) {
    const canvas = await draw(frame, el);
    if (kind === 'png' || el.matches('.sheet')) { out.push({ canvas, x: 0, y: 0, w: pw, h: el.matches('.sheet') ? ph : canvas.height / SCALE / MM }); continue; }
    // A flow: its margins kept (12 × 13 mm, as print.js prints it), cut where a block ends, so lines aren't split.
    const pad = 12 * MM, room = (ph - 24) * MM, end = canvas.height / SCALE - pad, cuts = cutsIn(el);
    for (let from = pad; from < end - 2;) {
      let to = Math.min(end, from + room);
      if (to < end) { const cut = cuts.filter(c => c > from + room * 0.5 && c <= from + room).pop(); if (cut) to = cut; }
      const slice = Object.assign(document.createElement('canvas'), { width: canvas.width, height: Math.ceil((to - from) * SCALE) });
      slice.getContext('2d').drawImage(canvas, 0, Math.floor(from * SCALE), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      out.push({ canvas: slice, x: 0, y: 12, w: pw, h: (to - from) / MM });
      from = to;
    }
  }
  return out;
}

// Pages one under another, for one picture.
function stacked(pages) {
  if (pages.length === 1) return pages[0].canvas;
  const gap = 12 * SCALE, width = Math.max(...pages.map(p => p.canvas.width));
  const canvas = Object.assign(document.createElement('canvas'), { width, height: pages.reduce((sum, p) => sum + p.canvas.height, 0) + gap * (pages.length - 1) });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d9dde3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = 0;
  for (const p of pages) { ctx.drawImage(p.canvas, 0, y); y += p.canvas.height + gap; }
  return canvas;
}

export async function shareAs(kind, doc, { pw, ph, title }) {
  toast(kind === 'png' ? 'Making the picture…' : 'Making the PDF…', { ms: 30000 });
  let frame = null;
  try {
    frame = await frameOf(doc, pw);
    const pages = await pagesOf(frame, kind, pw, ph);
    if (!pages.length) return toast('Nothing to share');
    const name = `${(title || 'Sift').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'Sift'}.${kind}`;
    const blob = kind === 'png' ? await pngOf(stacked(pages)) : pdfOf(pages.map(p => ({ jpeg: jpegOf(p.canvas), px: p.canvas.width, py: p.canvas.height, x: p.x, y: p.y, w: p.w, h: p.h })), pw, ph);
    const file = new File([blob], name, { type: blob.type });
    let can = false;
    try { can = !!navigator.canShare?.({ files: [file] }); } catch { /* no file sharing here */ }
    if (can) {
      // Making it can take long enough that the browser no longer counts the press (iPhone): then a Share button finishes it.
      try { await navigator.share({ files: [file], title }); toast('Shared'); return; } catch (err) {
        if (err?.name === 'AbortError') return toast('Not shared');
        if (err?.name === 'NotAllowedError') return toast(kind === 'png' ? 'The picture is ready' : 'The PDF is ready', { action: 'Share', ms: 15000, onAction: () => navigator.share({ files: [file], title }).catch(() => null) });
      }
    }
    // A computer: saved to Downloads, and a picture copied too (paste it into WhatsApp Web).
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    let copied = false;
    if (kind === 'png' && window.ClipboardItem) try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); copied = true; } catch { /* clipboard blocked */ }
    toast(copied ? 'Picture saved and copied: paste it into a chat' : `Saved: ${name}`);
  } catch (err) {
    console.warn('Share as picture failed:', err);
    toast(navigator.onLine ? "Couldn't make it here" : "Couldn't make it: it needs the internet the first time");
  } finally { frame?.remove(); }
}
