// A PDF's first page as a small picture, its number of pages and the text in
// it, made on this device with pdf.js (app/vendor/pdfjs-5.4.296, fetched from
// Sift's own site the first time a PDF needs it, then kept; see sw.js).
//
//   pdfPreview(blob, size)   { thumb (JPEG data URL, size px on its long edge), pages, text }, or null
//   pdfPages(blob, size, max)  every page (up to max) as a JPEG data URL, for printing (print.js), or []

const BASE = new URL('../vendor/pdfjs-5.4.296/', import.meta.url).href;
const TEXT_PAGES = 30; // text is taken from this many pages at most

let lib = null;
async function pdfjs() {
  if (!lib) {
    lib = import(`${BASE}pdf.min.mjs`).then(mod => { mod.GlobalWorkerOptions.workerSrc = `${BASE}pdf.worker.min.mjs`; return mod; });
    lib.catch(() => { lib = null; });
  }
  return lib;
}

export async function pdfPreview(blob, size = 240) {
  let doc = null;
  try {
    const mod = await pdfjs();
    doc = await mod.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), standardFontDataUrl: `${BASE}standard_fonts/`, wasmUrl: `${BASE}wasm/`, isEvalSupported: false }).promise;
    const first = await doc.getPage(1);
    const plain = first.getViewport({ scale: 1 });
    const viewport = first.getViewport({ scale: size / Math.max(plain.width, plain.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // pages without a background of their own are white paper
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await first.render({ canvasContext: ctx, canvas, viewport }).promise;
    const lines = [];
    for (let n = 1; n <= Math.min(doc.numPages, TEXT_PAGES); n++) {
      const content = await (n === 1 ? first : await doc.getPage(n)).getTextContent();
      lines.push(content.items.map(item => item.str + (item.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim());
    }
    return { thumb: canvas.toDataURL('image/jpeg', 0.7), pages: doc.numPages, text: lines.filter(Boolean).join('\n\n') };
  } catch (err) {
    console.warn('PDF preview not made:', err);
    return null;
  } finally { doc?.destroy(); }
}

export async function pdfPages(blob, size = 1600, max = 30) {
  let doc = null;
  try {
    const mod = await pdfjs();
    doc = await mod.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), standardFontDataUrl: `${BASE}standard_fonts/`, wasmUrl: `${BASE}wasm/`, isEvalSupported: false }).promise;
    const out = [];
    for (let n = 1; n <= Math.min(doc.numPages, max); n++) {
      const page = await doc.getPage(n);
      const plain = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: size / Math.max(plain.width, plain.height) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      out.push(canvas.toDataURL('image/jpeg', 0.85));
    }
    return out;
  } catch (err) {
    console.warn('PDF pages not made:', err);
    return [];
  } finally { doc?.destroy(); }
}
