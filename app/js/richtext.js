// Notes editor used for free text across the app. Stored as a small
// markdown subset (**bold**, _italic_, ~~cross out~~, "- " lists, "## heading"), shown
// formatted while you type. A "Markdown" toggle shows the raw text; it
// always starts in formatted mode.
//
//   const editor = richText(container, { value, onChange(markdown), placeholder, origin, spot })
//   editor.setValue(markdown)
//
// `origin()` says what the note belongs to ({ collection, id, title, field })
// so links and new contacts can point back to it. `spot: false` turns off
// spotting phone numbers and emails (e.g. in a contact's own notes).
//
// Links to other things are chips: [label](sift:<collection>/<id>). Typing or
// picking 📞, 📝 or ⚠️ opens a search to link a contact, anything, or anything
// important (or just keep the emoji). A phone number or email typed in becomes
// a linked contact (a new transient one unless it's already known), with Undo.
// While you're in a note, the rest of the page dims.
//
// Typing "- " or "* " at the start of a line starts a bulleted list, and "1. " a numbered one; Enter on
// an empty bullet ends it, so you carry on writing underneath. The toolbar also
// inserts a few emoji.
//
// Two toolbars: compact (bold, italic, cross out, list, emoji) and full, which
// adds Smaller / Bigger text for the line you're on. "Aa" switches, and the
// choice is remembered on this device. Sizes are kept in the note as "# " (bigger)
// and "-# " (smaller) at the start of a line. They are relative to the app's own
// Text size setting, which they don't change.

export const EMOJI = [
  ['📝', 'Note'],
  ['📞', 'Phone'],
  ['⏰', 'Alarm'],
  ['⚠️', 'Warning'],
];

// A note as plain lines for one-line previews: no markdown marks, bullets as "•".
export function plainLines(md) {
  return (md || '').split('\n')
    .map(l => l.replace(LINK_RE, '$1').replace(/^(?:#{1,6}|-#)\s+/, '').replace(/^\s*[-*]\s+/, '• ').replace(/\*\*|~~/g, '').replace(/(^|\s)_(\S.*?)_(?=$|[\s).,!?:;])/g, '$1$2').trim())
    .filter(Boolean);
}

import { openPicker } from './linkpicker.js';
import { openRef, findDetails, detailKey, loadDetailIndex, createDetailContact, spotSettings, attachContact, detachContact, unlinkInRecord } from './refs.js';
import * as store from './store.js';
import { toast } from './toast.js';
import { openFull, closeFull, isFull, setFullLabel, PHONE } from './fullnote.js';
import { titleFrom } from './summary.js';

const LINK_RE = /\[([^\]]+)\]\(sift:([a-z_]+)\/([\w-]+)\)/g;

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A note's first line as HTML for one-line previews (links stay clickable),
// and how many more lines there are.
export function previewLine(md) {
  const lines = (md || '').split('\n').map(l => l.replace(/^(?:#{1,6}|-#)\s+/, '').replace(/^\s*[-*]\s+/, '• ').trim()).filter(Boolean);
  return { html: lines.length ? inline(lines[0]) : '', more: Math.max(0, lines.length - 1) };
}

// All of a note's lines run together on one line ("a · b · c"), as HTML.
export function inlineAll(md) {
  return (md || '').split('\n').map(l => l.replace(/^(?:#{1,6}|-#)\s+/, '').replace(/^\s*[-*]\s+/, '• ').trim()).filter(Boolean).map(inline).join(' <span class="sep">·</span> ');
}

// A link chip carries its own icon (CSS: ☑️ task, 📞 contact, 📝 note …), so a
// 📞 or 📝 typed just before a link (to open the search) isn't shown twice.
const TRIGGER_BEFORE_LINK = /(?:📞|📝)[\s\u00a0]*(?=\[[^\]]+\]\(sift:)/gu;

function inline(text) {
  return esc(text)
    .replace(TRIGGER_BEFORE_LINK, '')
    .replace(LINK_RE, (m, label, c, id) => `<span class="ref" data-ref="${c}/${id}" contenteditable="false">${label}</span>`)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/(^|[\s(])_(.+?)_(?=$|[\s).,!?:;])/g, '$1<i>$2</i>');
}

// Bullet and numbered lines as nested lists. `items` are { d: depth, ordered, html };
// a line can only sit one level deeper than the one before it, and a list is
// numbered or bulleted by the line that opens it.
function listHtml(items) {
  let html = '';
  const open = []; // the list tags open now, one per depth
  for (const { d: want, ordered, html: text } of items) {
    const tag = ordered ? 'ol' : 'ul';
    const d = Math.max(0, Math.min(want, open.length));
    if (!open.length || d >= open.length) { html += `<${tag}>`; open.push(tag); }
    else {
      html += '</li>';
      while (open.length - 1 > d) html += `</${open.pop()}></li>`;
      // Bulleted after numbered (or the other way round) at the same level: a new list.
      if (open[d] !== tag) { html += `</${open.pop()}><${tag}>`; open.push(tag); }
    }
    html += `<li>${text}`;
  }
  html += '</li>';
  while (open.length > 1) html += `</${open.pop()}></li>`;
  return `${html}</${open.pop()}>`;
}

export function toHtml(md) {
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(listHtml(list)); list = null; } };
  for (const line of (md || '').split('\n')) {
    const big = line.match(/^#\s+(.*)$/);
    const small = line.match(/^-#\s+(.*)$/);
    const heading = big || small || line.match(/^#{2,6}\s+(.*)$/);
    if (heading) {
      flush();
      const text = inline(heading[1]) || '<br>';
      out.push(big ? `<h3>${text}</h3>` : small ? `<div data-sz="s">${text}</div>` : `<h4>${text}</h4>`);
      continue;
    }
    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    const numbered = !bullet && line.match(/^(\s*)\d{1,3}[.)]\s+(.*)$/);
    const item = bullet || numbered;
    if (item) {
      list ??= [];
      list.push({ d: Math.floor(item[1].replace(/\t/g, '  ').length / 2), ordered: !!numbered, html: inline(item[2]) || '<br>' });
      continue;
    }
    flush();
    out.push(`<div>${inline(line) || '<br>'}</div>`);
  }
  flush();
  return out.join('');
}

export function toMarkdown(root) {
  // A list's lines, two spaces of indent per level. (The browser nests a list either
  // inside an <li> or straight inside the <ul>; both come out the same.)
  const listLines = (ul, depth) => {
    let n = 0;
    return [...ul.children].flatMap(child => {
      if (child.tagName === 'UL' || child.tagName === 'OL') return listLines(child, depth + 1);
      if (child.tagName !== 'LI') return [];
      n++;
      const own = [...child.childNodes].filter(x => x.nodeName !== 'UL' && x.nodeName !== 'OL').map(walk).join('').replace(/\n+$/, '');
      const nested = [...child.children].filter(x => x.tagName === 'UL' || x.tagName === 'OL').flatMap(x => listLines(x, depth + 1));
      return [`${'  '.repeat(depth)}${ul.tagName === 'OL' ? `${n}.` : '-'} ${own}`, ...nested];
    });
  };
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/ /g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const inner = () => [...node.childNodes].map(walk).join('');
    if (node.dataset?.ref) return `[${node.textContent.replace(/[[\]\n]/g, ' ').trim()}](sift:${node.dataset.ref})`;
    const tag = node.tagName;
    const style = node.style || {};
    if (tag === 'BR') return '\n';
    if (tag === 'B' || tag === 'STRONG' || style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) return wrap(inner(), '**');
    if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') return wrap(inner(), '_');
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(style.textDecoration || '')) return wrap(inner(), '~~');
    if (tag === 'H3') return `# ${inner().replace(/\n+$/, '')}\n`;
    if (/^H[1-6]$/.test(tag)) return `## ${inner().replace(/\n+$/, '')}\n`;
    if (node.dataset?.sz === 's') return `-# ${inner().replace(/\n+$/, '')}\n`;
    if (tag === 'UL' || tag === 'OL') return `${listLines(node, 0).join('\n')}\n`;
    if (tag === 'DIV' || tag === 'P') {
      const text = inner();
      return text.endsWith('\n') ? text : `${text}\n`;
    }
    return inner();
  };
  return [...root.childNodes].map(walk).join('').replace(/\n+$/, '');
}

// Keep markers outside surrounding spaces: "** word**" → " **word**".
function wrap(text, mark) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

// A toolbar too wide for its space scrolls sideways; with a mouse it can be
// grabbed and dragged too (a drag doesn't press the button it started on).
let barDrag = null;
document.addEventListener('pointerdown', ev => {
  const bar = ev.target.closest?.('.md-bar');
  if (!bar || ev.pointerType !== 'mouse' || bar.scrollWidth <= bar.clientWidth) return;
  barDrag = { bar, x: ev.clientX, left: bar.scrollLeft, moved: false };
});
document.addEventListener('pointermove', ev => {
  if (!barDrag) return;
  const dx = ev.clientX - barDrag.x;
  if (!barDrag.moved && Math.abs(dx) < 5) return;
  barDrag.moved = true;
  barDrag.bar.classList.add('drag-scrolling');
  barDrag.bar.scrollLeft = barDrag.left - dx;
});
document.addEventListener('pointerup', () => {
  if (!barDrag) return;
  const { bar, moved } = barDrag;
  barDrag = null;
  bar.classList.remove('drag-scrolling');
  if (moved) {
    const stop = e => { e.stopPropagation(); e.preventDefault(); };
    bar.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => bar.removeEventListener('click', stop, { capture: true }), 50);
  }
});

// While a note is being typed in, the rest of the page dims: a layer over
// everything with a hole where the note (and any dropdown) is. Clicks go
// straight through it. It is placed in page coordinates, not fixed to the
// screen: when the iPhone keyboard opens, iOS scrolls the visible part of the
// page and a fixed layer ended up out of line with the note it should frame.
let beam = null;
let beamHost = null;
let beamFrame = 0;
function spotlight(host) {
  beamHost = host;
  if (!beam) {
    beam = document.createElement('div');
    beam.className = 'note-spotlight';
    beam.setAttribute('aria-hidden', 'true');
    document.body.append(beam);
  }
  cancelAnimationFrame(beamFrame);
  const follow = () => {
    if (!beamHost?.isConnected) return unspotlight(beamHost);
    const rects = [beamHost, ...beamHost.querySelectorAll('.ref-picker, .ref-menu')].map(e => e.getBoundingClientRect());
    const left = Math.min(...rects.map(r => r.left)) - 6;
    const top = Math.min(...rects.map(r => r.top)) - 6;
    const right = Math.max(...rects.map(r => r.right)) + 6;
    const bottom = Math.max(...rects.map(r => r.bottom)) + 6;
    Object.assign(beam.style, { left: `${left + scrollX}px`, top: `${top + scrollY}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    beamFrame = requestAnimationFrame(follow);
  };
  follow();
}
function unspotlight(host) {
  if (host && host !== beamHost) return;
  cancelAnimationFrame(beamFrame);
  beam?.remove();
  beam = null;
  beamHost = null;
}

export function richText(container, { value = '', onChange, placeholder = '', origin = null, spot = true } = {}) {
  container.classList.add('rich');
  container.innerHTML = `
    <div class="md-bar" role="toolbar" aria-label="Formatting">
      <button type="button" class="md-full" title="Full screen: just this note" aria-label="Edit full screen">⤢</button>
      <button type="button" class="md-mode" aria-pressed="false" title="Full toolbar: text size">Aa</button>
      <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button type="button" data-cmd="strikeThrough" title="Cross out"><s>S</s></button>
      <button type="button" data-cmd="insertUnorderedList" title="List (or type - at the start of a line)">• List</button>
      <button type="button" data-cmd="insertOrderedList" title="Numbered list (or type 1. at the start of a line)">1. List</button>
      <span class="md-sizes"><button type="button" data-size="-1" title="Smaller text (this line)" aria-label="Smaller text">A<small>−</small></button><button type="button" data-size="1" title="Bigger text (this line)" aria-label="Bigger text">A<sup>+</sup></button></span>
      <span class="md-sep" aria-hidden="true"></span>
      <button type="button" class="md-make" title="Make this line (or the selected lines) into tasks or a contact; the text stays here, linked" aria-haspopup="menu">↗ Make</button>
      <span class="md-sep" aria-hidden="true"></span>
      <span class="md-emoji">${EMOJI.map(([e, name]) => `<button type="button" data-emoji="${e}" title="${name}" aria-label="Insert ${name.toLowerCase()} emoji">${e}</button>`).join('')}</span>
      <span class="md-sep" aria-hidden="true"></span>
      <button type="button" class="md-toggle" aria-pressed="false" title="Show the raw markdown">Markdown</button>
    </div>
    <div class="rich-edit hand" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${esc(placeholder)}"></div>
    <textarea class="rich-raw hand" hidden spellcheck="true"></textarea>`;

  // Compact or full toolbar, remembered on this device.
  const FULL_KEY = 'sift:notes-toolbar';
  const setFull = (full, keep = true) => {
    container.classList.toggle('bar-full', full);
    container.querySelector('.md-mode').setAttribute('aria-pressed', full);
    if (keep) try { localStorage.setItem(FULL_KEY, full ? 'full' : 'compact'); } catch { /* not kept */ }
  };
  try { setFull(localStorage.getItem(FULL_KEY) === 'full', false); } catch { setFull(false, false); }

  const edit = container.querySelector('.rich-edit');
  const raw = container.querySelector('.rich-raw');
  const toggle = container.querySelector('.md-toggle');
  let md = value || '';
  let rawMode = false;

  const paint = () => {
    edit.innerHTML = toHtml(md);
    edit.classList.toggle('is-empty', !md.trim());
  };
  const changed = next => {
    if (next === md) return;
    md = next;
    edit.classList.toggle('is-empty', !md.trim());
    onChange?.(md);
  };

  edit.addEventListener('input', ev => {
    // Just after this input event: the browser ignores edits made during one.
    // (Any typed input, not just a space: phone keyboards don't always send the space on its own.)
    if (/^insert(Text|CompositionText|ReplacementText)$/.test(ev.inputType)) queueMicrotask(() => { if (autoList()) changed(toMarkdown(edit)); });
    const trigger = ev.inputType === 'insertText' && triggerFor(ev.data);
    if (trigger) queueMicrotask(() => pick(trigger));
    else if (ev.inputType === 'insertParagraph' || ev.inputType === 'insertText' && /^[\s\u00a0,;:!?)]$/.test(ev.data || '')) queueMicrotask(() => spotNow(false));
    changed(toMarkdown(edit));
  });

  // ---------- links: 📞 📝 ⚠️ open a search ----------
  const triggerFor = e => (!e ? null : e.startsWith('📞') ? 'contact' : e.startsWith('📝') ? 'note' : e.startsWith('⚠') ? 'important' : null);
  const from = () => (typeof origin === 'function' ? origin() : origin);

  function caretRect(range) {
    const r = range.getClientRects()[0] || range.startContainer.parentElement?.getBoundingClientRect?.();
    return r || edit.getBoundingClientRect();
  }
  function restoreRange(range) {
    edit.focus();
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  // Put in by hand: the browser's own HTML insert moves chips off the line.
  function insertChips(list) {
    const sel = getSelection();
    const range = sel.getRangeAt(0);
    range.deleteContents();
    // The 📞 / 📝 that opened the search goes: the chip shows its own icon.
    const at = range.startContainer;
    if (at.nodeType === Node.TEXT_NODE) {
      const m = at.nodeValue.slice(0, range.startOffset).match(/(?:📞|📝)[\s\u00a0]*$/u);
      if (m) at.deleteData(range.startOffset - m[0].length, m[0].length);
    }
    const frag = document.createDocumentFragment();
    frag.append(' ');
    list.forEach((t, n) => {
      if (n) frag.append(', ');
      const chip = document.createElement('span');
      chip.className = 'ref';
      chip.contentEditable = 'false';
      chip.dataset.ref = `${t.collection}/${t.id}`;
      chip.textContent = t.title;
      frag.append(chip);
    });
    const tail = document.createTextNode(' ');
    frag.append(tail);
    range.insertNode(frag);
    sel.collapse(tail, 1);
    changed(toMarkdown(edit));
    for (const t of list) if (t.collection === 'contacts') attachContact(from(), t.id);
  }
  function pick(kind) {
    const sel = getSelection();
    if (rawMode || !sel.rangeCount || !edit.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0).cloneRange();
    openPicker({
      host: container, at: caretRect(range), kind,
      exclude: from()?.id ? `${from().collection}/${from().id}` : null,
      onPick: list => { restoreRange(range); insertChips(list); },
      onNewContact: async name => {
        const o = from();
        const { createContact, CAPTURED_HEADING } = await import('./contacts.js');
        const made = await createContact({ name, notes: o?.id ? `${CAPTURED_HEADING}\nFrom [${(o.title || 'a note').replace(/[[\]]/g, ' ')}](sift:${o.collection}/${o.id})` : '', source_ref: o?.id ? { collection: o.collection, id: o.id } : null });
        restoreRange(range);
        insertChips([{ collection: 'contacts', id: made.id, title: name }]);
        toast(`New contact: ${name}`, { action: 'Undo', onAction: () => store.remove('contacts', made.id) });
      },
      onClose: ({ restore }) => { if (restore) restoreRange(range); },
    });
  }

  // Chips while editing: click for Open / Unlink; Ctrl+click opens.
  edit.addEventListener('click', ev => {
    const chip = ev.target.closest('.ref[data-ref]');
    if (!chip) return;
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) return openChip(chip);
    container.querySelector('.ref-menu')?.remove();
    const menu = document.createElement('div');
    menu.className = 'ref-menu';
    menu.innerHTML = '<button type="button" data-m="open">Open</button><button type="button" data-m="unlink">Unlink</button>';
    const hr = container.getBoundingClientRect();
    const cr = chip.getBoundingClientRect();
    menu.style.left = `${Math.max(0, cr.left - hr.left)}px`;
    menu.style.top = `${cr.bottom - hr.top + 4}px`;
    container.append(menu);
    const gone = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('pointerdown', gone, true); } };
    document.addEventListener('pointerdown', gone, true);
    menu.addEventListener('mousedown', e => e.preventDefault());
    menu.addEventListener('click', e => {
      const m = e.target.closest('[data-m]')?.dataset.m;
      if (!m) return;
      menu.remove();
      document.removeEventListener('pointerdown', gone, true);
      if (m === 'open') openChip(chip);
      else { chip.replaceWith(document.createTextNode(chip.textContent)); changed(toMarkdown(edit)); }
    });
  });
  function openChip(chip) {
    const ref = chip.dataset.ref;
    document.activeElement?.blur(); // leaving the note saves it
    setTimeout(() => openRef(ref), 30);
  }

  // ---------- spotting numbers and emails ----------
  let spotCfg = null;
  let index = new Map();
  const ignored = new Set(); // ones you said no to (Undo)
  if (spot) spotSettings().then(async s => { spotCfg = s; if (s.spot_details) index = await loadDetailIndex(s.phone_country); });

  function spotNow(final) {
    if (!spot || !spotCfg?.spot_details || rawMode) return;
    const cc = spotCfg.phone_country;
    const sel = getSelection();
    const walker = document.createTreeWalker(edit, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest('.ref') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let made = false;
    for (const node of nodes) {
      const here = sel.anchorNode === node;
      const found = findDetails(node.nodeValue, { caret: here ? sel.anchorOffset : -1, final: final || !here, cc }).filter(m => !ignored.has(m.raw));
      for (const m of found.reverse()) {
        const line = (node.parentElement.closest('li, p, div:not(.rich-edit)') || edit).textContent;
        const after = here && sel.anchorOffset >= m.end ? sel.anchorOffset - m.end : null;
        const key = detailKey(m.type, m.raw, cc);
        const known = index.get(key);
        const id = known?.id || store.uuidv7();
        const r = document.createRange();
        r.setStart(node, m.start);
        r.setEnd(node, m.end);
        r.deleteContents();
        const chip = document.createElement('span');
        chip.className = 'ref ref-new';
        chip.contentEditable = 'false';
        chip.dataset.ref = `contacts/${id}`;
        chip.textContent = m.raw;
        r.insertNode(chip);
        if (after != null && chip.nextSibling?.nodeType === Node.TEXT_NODE) sel.collapse(chip.nextSibling, Math.min(after, chip.nextSibling.length));
        made = true;
        linked({ ...m, id, known, key, chip, line });
      }
    }
    if (made) changed(toMarkdown(edit));
  }

  async function linked({ type, raw, id, known, key, chip, line }) {
    const o = from();
    if (!known) {
      index.set(key, { id, name: '' });
      await createDetailContact({ id, type, raw }, { origin: o, line });
    }
    const wasAttached = o?.id && (await store.get(o.collection, o.id))?.contact_ids?.includes(id);
    await attachContact(o, id);
    const icon = type === 'phone' ? '📞' : '✉️';
    toast(known ? `${icon} ${raw}: linked to ${known.name || 'a contact'}` : `${icon} ${raw}: new contact`, {
      action: 'Undo',
      onAction: async () => {
        ignored.add(raw);
        if (chip.isConnected) { chip.replaceWith(document.createTextNode(raw)); changed(toMarkdown(edit)); }
        else await unlinkInRecord(o, `contacts/${id}`, o?.field);
        if (!wasAttached) await detachContact(o, id);
        if (!known) { index.delete(key); await store.remove('contacts', id); }
      },
    });
  }

  // Leaving the note: anything finished gets spotted; the page un-dims.
  // On a phone the note opens full screen as soon as you tap into it
  // (fullnote.js); a full-screen note needs no dimming.
  container.addEventListener('focusin', () => {
    if (PHONE.matches && !isFull(container)) openFull(container, { label: fullLabel() });
    if (!isFull(container)) spotlight(container);
  });
  container.addEventListener('focusout', ev => {
    if (container.contains(ev.relatedTarget)) return;
    spotNow(true);
    unspotlight(container);
  });
  // The name at the top of a full-screen note: a note's own title (worked out
  // from what is typed, so it changes as you write), or what the note belongs to.
  const fullLabel = () => {
    const o = from();
    if (o?.field === 'body') return titleFrom(md) || 'New note';
    return o?.title && o.title !== 'Brain dump' ? o.title : 'Note';
  };
  edit.addEventListener('input', () => { if (isFull(container)) setFullLabel(container, fullLabel()); });
  raw.addEventListener('input', () => { if (isFull(container)) setFullLabel(container, fullLabel()); });
  container.addEventListener('click', ev => {
    if (ev.target.closest('.note-full-done')) closeFull();
  });
  edit.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && isFull(container) && !document.querySelector('.ref-picker')) { ev.preventDefault(); ev.stopPropagation(); closeFull({ blur: false }); edit.focus(); }
  }, true);

  // What has been typed on the caret's line so far (a line starts at the block's
  // start or after a line break).
  function lineBefore(node, offset) {
    let text = node.nodeValue.slice(0, offset);
    let n = node;
    while (n && n !== edit) {
      for (let prev = n.previousSibling; prev; prev = prev.previousSibling) {
        if (/^(BR|DIV|P|UL|OL|H[1-6])$/.test(prev.nodeName)) return text;
        text = prev.textContent + text;
      }
      n = n.parentNode;
      if (n === edit || /^(DIV|P)$/.test(n.nodeName)) break;
    }
    return text;
  }

  // "- " or "* " typed at the start of a line (not already in a list) → bullet.
  function autoList() {
    const sel = getSelection();
    const node = sel.anchorNode;
    if (!sel.rangeCount || !sel.isCollapsed || node?.nodeType !== Node.TEXT_NODE || !edit.contains(node) || node.parentElement.closest('li')) return;
    const typed = lineBefore(node, sel.anchorOffset);
    const bullet = /^[-*][ \u00a0]$/.test(typed);
    const number = !bullet && /^\d{1,3}[.)][ \u00a0]$/.exec(typed);
    if (!bullet && !number) return;
    for (let k = 0; k < typed.length; k++) document.execCommand('delete');
    document.execCommand(number ? 'insertOrderedList' : 'insertUnorderedList');
    return true;
  }

  // Leaving the box: a "- " line that never became a bullet (however it was typed) does now.
  edit.addEventListener('blur', () => {
    if ([...edit.children].some(c => c.tagName !== 'UL' && c.tagName !== 'OL' && /^([-*]|\d{1,3}[.)])[ \u00a0]/.test(c.textContent))) { md = toMarkdown(edit); paint(); }
  });
  raw.addEventListener('input', () => changed(raw.value));

  // Paste as plain text so web pages don't bring their styling along.
  edit.addEventListener('paste', ev => {
    ev.preventDefault();
    document.execCommand('insertText', false, ev.clipboardData.getData('text/plain'));
  });

  // Bigger / Smaller for the lines the selection touches: -1 small, 0 normal, 1 big.
  function setSize(dir) {
    const sel = getSelection();
    if (!sel.rangeCount || !edit.contains(sel.anchorNode)) placeCaretAtEnd();
    const range = getSelection().getRangeAt(0);
    const blocks = [...edit.children].filter(b => range.intersectsNode(b) && b.tagName !== 'UL');
    if (!blocks.length) return;
    const levelOf = b => (b.tagName === 'H3' ? 1 : b.dataset?.sz === 's' ? -1 : 0);
    let touched = false;
    for (const b of blocks) {
      if (b.tagName === 'H4') continue; // a label line keeps its own look
      const level = levelOf(b);
      const next = Math.max(-1, Math.min(1, level + dir));
      if (next === level) continue;
      const nb = document.createElement(next === 1 ? 'h3' : 'div');
      if (next === -1) nb.dataset.sz = 's';
      nb.append(...b.childNodes);
      if (!nb.childNodes.length) nb.innerHTML = '<br>';
      for (const edge of ['start', 'end']) if (range[`${edge}Container`] === b) range[edge === 'start' ? 'setStart' : 'setEnd'](nb, range[`${edge}Offset`]);
      b.replaceWith(nb);
      touched = true;
    }
    if (!touched) return;
    const after = getSelection();
    after.removeAllRanges();
    after.addRange(range);
    changed(toMarkdown(edit));
  }

  // Tab / Shift+Tab in a bullet indents / outdents it (elsewhere Tab moves on as usual).
  edit.addEventListener('keydown', ev => {
    if (ev.key !== 'Tab' || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    const sel = getSelection();
    const li = sel.anchorNode && (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode).closest?.('li');
    if (!li || !edit.contains(li)) return;
    ev.preventDefault();
    if (ev.shiftKey) {
      if (li.parentElement.closest('li') || li.parentElement.parentElement?.tagName === 'UL') document.execCommand('outdent');
    } else if (li.previousElementSibling) {
      document.execCommand('indent');
    }
    for (const span of edit.querySelectorAll('span[style]')) span.replaceWith(...span.childNodes); // the browser adds these
    changed(toMarkdown(edit));
  });

  container.querySelector('.md-bar').addEventListener('mousedown', ev => {
    if (ev.target.closest('[data-cmd], [data-emoji], [data-size], .md-full, .md-make')) ev.preventDefault(); // keep the selection in the editor
  });
  container.querySelector('.md-bar').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.classList.contains('md-mode')) { setFull(!container.classList.contains('bar-full')); return; }
    if (b.classList.contains('md-make')) { toggleMakeMenu(b); return; }
    if (b.classList.contains('md-full')) {
      if (isFull(container)) { closeFull({ blur: false }); spotlight(container); edit.focus(); }
      else { unspotlight(container); openFull(container, { label: fullLabel() }); if (!container.contains(document.activeElement)) placeCaretAtEnd(); }
      return;
    }
    if (b.dataset.size) { if (!rawMode) { edit.focus(); setSize(Number(b.dataset.size)); } return; }
    if (b === toggle) {
      rawMode = !rawMode;
      toggle.setAttribute('aria-pressed', rawMode);
      container.classList.toggle('raw', rawMode);
      if (rawMode) { raw.value = md; raw.hidden = false; edit.hidden = true; raw.focus(); }
      else { paint(); raw.hidden = true; edit.hidden = false; edit.focus(); }
      return;
    }
    if (b.dataset.emoji) {
      const e = b.dataset.emoji;
      if (rawMode) {
        raw.focus();
        raw.setRangeText(e, raw.selectionStart, raw.selectionEnd, 'end');
        changed(raw.value);
      } else {
        if (!edit.contains(getSelection().anchorNode)) placeCaretAtEnd();
        edit.focus();
        document.execCommand('insertText', false, e);
        changed(toMarkdown(edit));
      }
      return;
    }
    if (rawMode) return;
    edit.focus();
    document.execCommand(b.dataset.cmd);
    changed(toMarkdown(edit));
  });

  // ↗ Make: the line the cursor is on (or the selected lines) becomes tasks in
  // the Inbox or a contact; the text stays, linked to them (linemake.js). The
  // menu sits inside the note so using it doesn't count as leaving the note.
  let makeRange = null;
  container.querySelector('.md-bar').addEventListener('pointerdown', ev => {
    if (!ev.target.closest('.md-make')) return;
    const s = getSelection();
    if (s.rangeCount && edit.contains(s.anchorNode)) makeRange = s.getRangeAt(0).cloneRange();
  });
  function toggleMakeMenu(btn) {
    const old = container.querySelector('.md-make-menu');
    if (old) { old.remove(); return; }
    const m = document.createElement('div');
    m.className = 'md-make-menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = '<span class="muted">This line (or the selected lines) →</span>'
      + '<button type="button" role="menuitem" data-make="tasks">☐ Tasks in the Inbox</button>'
      + '<button type="button" role="menuitem" data-make="contact">👤 A contact</button>';
    btn.closest('.md-bar').after(m);
  }
  container.addEventListener('mousedown', ev => { if (ev.target.closest('.md-make-menu')) ev.preventDefault(); });
  container.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-make]');
    if (!b) return;
    b.closest('.md-make-menu').remove();
    if (rawMode) { toast('Switch off Markdown first'); return; }
    if (makeRange && edit.contains(makeRange.startContainer)) restoreRange(makeRange);
    const before = md;
    const { makeFromLines } = await import('./linemake.js');
    const res = await makeFromLines(edit, b.dataset.make, from());
    if (!res) { toast('Put the cursor on a line first, or select some lines'); return; }
    changed(toMarkdown(edit));
    toast(res.label, {
      action: 'Undo',
      onAction: async () => {
        for (const x of res.made) await store.remove(x.collection, x.id);
        md = before;
        paint();
        onChange?.(md);
      },
    });
  });

  function placeCaretAtEnd() {
    edit.focus();
    const r = document.createRange();
    r.selectNodeContents(edit);
    r.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  paint();
  return {
    focus: placeCaretAtEnd,
    setValue(next) {
      md = next || '';
      if (rawMode) raw.value = md; else paint();
    },
    get value() { return md; },
  };
}
