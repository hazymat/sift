// Files attached to a note: photos, PDFs and text files. The file itself is
// kept on this device (the `blobs` store); an `attachments` record (name, type,
// size and, for photos, a small thumbnail) says which note it belongs to.
//
//   byParent()                         → Map(note id → attachments)
//   rowHtml(atts, { addButton })       → thumbnails / file chips, plus a 📎 Attach button
//   addFiles({ collection, id }, files) → the new records (other kinds of file are skipped)
//   enableDrop(root, selector, parentOf, done) → drop files onto matching elements
//   onClick(ev, parentOf, done)        → handles the row's buttons; true if it did
//
// Rows are plain HTML, so a view just re-renders in `done()`.

import * as store from './store.js';
import { toast, undoable } from './toast.js';

const MAX_BYTES = 25 * 1024 * 1024;
const THUMB = 240;
export const ACCEPT = 'image/*,application/pdf,text/plain,text/markdown,text/csv,.txt,.md,.csv,.pdf';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

export function kindOf(mime, name = '') {
  if (/^image\//.test(mime)) return 'image';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (/^text\//.test(mime) || /\.(txt|md|csv)$/i.test(name)) return 'text';
  return null;
}

export const sizeLabel = n => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

// A short name for a chip: keeps the extension, cuts the middle.
export function shortName(name, max = 22) {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : '';
  return `${name.slice(0, max - ext.length - 1)}…${ext}`;
}

async function thumbnail(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, THUMB / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return null; }   // a format this browser can't draw: it shows as a file chip
}

export async function addFiles(parent, files) {
  const made = [];
  const skipped = [];
  for (const file of files) {
    const kind = kindOf(file.type, file.name);
    if (!kind) { skipped.push(`${file.name} (only photos, PDFs and text files)`); continue; }
    if (file.size > MAX_BYTES) { skipped.push(`${file.name} (over ${sizeLabel(MAX_BYTES)})`); continue; }
    const id = store.uuidv7();
    await store.putBlob(id, file);
    made.push(await store.create('attachments', {
      id, parent_collection: parent.collection, parent_id: parent.id, blob_id: id,
      name: file.name || 'file', mime: file.type || (kind === 'pdf' ? 'application/pdf' : 'text/plain'), kind, size: file.size,
      thumb: kind === 'image' ? await thumbnail(file) : null,
    }));
  }
  if (skipped.length) toast(`Not added: ${skipped.join(', ')}`);
  return made;
}

export async function byParent() {
  const map = new Map();
  for (const a of (await store.list('attachments')).sort((x, y) => x.created_at.localeCompare(y.created_at))) {
    if (!map.has(a.parent_id)) map.set(a.parent_id, []);
    map.get(a.parent_id).push(a);
  }
  return map;
}

export function rowHtml(atts = [], { addButton = true } = {}) {
  const items = atts.map(a => {
    const label = `${a.name} (${sizeLabel(a.size)})`;
    const asPhoto = a.kind === 'image' && a.thumb;
    const body = asPhoto
      ? `<img src="${a.thumb}" alt="" loading="lazy">`
      : `${icon('i-note')}<span class="att-name">${a.kind === 'pdf' ? 'PDF · ' : ''}${esc(shortName(a.name))}</span>`;
    return `<span class="att att-${asPhoto ? 'img' : 'file'}">
      <button type="button" class="att-open" data-att-open="${a.id}" title="${esc(label)}" aria-label="Open ${esc(a.name)}">${body}</button>
      <button type="button" class="att-x" data-att-remove="${a.id}" title="Remove" aria-label="Remove ${esc(a.name)}">×</button>
    </span>`;
  }).join('');
  const add = addButton ? `<button type="button" class="att-add" data-att-add title="Attach photos, PDFs or text files (or drop them here)">${icon('i-clip')}<span>Attach</span></button>` : '';
  return `<div class="att-row">${items}${add}</div>`;
}

// Tight view: just a count.
export const countChip = atts => (atts?.length ? `<span class="chip att-count" title="${atts.length} attached">${icon('i-clip')} ${atts.length}</span>` : '');

async function openFile(a) {
  const blob = await store.getBlob(a.blob_id);
  if (!blob) { toast("That file isn't on this device yet"); return; }
  const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: a.mime }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

function afterAdd(made, done) {
  done?.();
  undoable(`Attached ${made.length === 1 ? made[0].name : `${made.length} files`}`, async () => {
    for (const m of made) await store.remove('attachments', m.id);
    done?.();
  });
}

let picker = null;
function pick(parent, done) {
  picker?.remove();
  picker = document.createElement('input');
  Object.assign(picker, { type: 'file', multiple: true, accept: ACCEPT, hidden: true });
  picker.onchange = async () => {
    const made = await addFiles(parent, [...picker.files]);
    picker.remove();
    picker = null;
    if (made.length) afterAdd(made, done);
  };
  document.body.append(picker);
  picker.click();
}

// `parentOf(button)` says which note the row belongs to (for Attach).
export function onClick(ev, parentOf, done) {
  const b = ev.target.closest('[data-att-open], [data-att-remove], [data-att-add]');
  if (!b) return false;
  ev.preventDefault();
  ev.stopPropagation();
  if (b.dataset.attAdd !== undefined) { const p = parentOf(b); if (p) pick(p, done); return true; }
  const id = b.dataset.attOpen || b.dataset.attRemove;
  store.get('attachments', id).then(async a => {
    if (!a) return;
    if (b.dataset.attOpen) return openFile(a);
    await store.remove('attachments', a.id);
    done?.();
    undoable(`Removed ${a.name}`, async () => { await store.restore('attachments', a.id); done?.(); });
  });
  return true;
}

// Dropping files on an element matching `selector` inside `root` attaches
// them to the note `parentOf(element)` names.
export function enableDrop(root, selector, parentOf, done) {
  const hasFiles = ev => [...(ev.dataTransfer?.types || [])].includes('Files');
  let over = null;
  const clear = () => { over?.classList.remove('drop-over'); over = null; };
  root.addEventListener('dragover', ev => {
    if (!hasFiles(ev)) return;
    const t = ev.target.closest(selector);
    if (!t) return clear();
    ev.preventDefault();
    if (over !== t) { clear(); over = t; t.classList.add('drop-over'); }
  });
  root.addEventListener('dragleave', ev => { if (over && !over.contains(ev.relatedTarget)) clear(); });
  root.addEventListener('drop', async ev => {
    const t = hasFiles(ev) && ev.target.closest(selector);
    clear();
    if (!t) return;
    ev.preventDefault();
    const p = parentOf(t);
    if (!p) return;
    const made = await addFiles(p, [...ev.dataTransfer.files]);
    if (made.length) afterAdd(made, done);
  });
}
