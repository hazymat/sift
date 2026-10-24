// Contacts (spec §4.4, §4.4a).
//   #/contacts                 Recent: transient numbers + recently used, quick capture
//   #/contacts/directory/<cat> Stored contacts by category; research mode per category
//   #/contacts/cases           Cases list;  #/contacts/cases/<id>  one case's timeline
//   #/contacts/c/<id>          One contact (opening it stamps "looked up")

import { cogHtml, menuHtml, separateHtml, choiceOf, setChoice } from '../viewcog.js';
import { tableHtml, shown as tableRows, wireTable, anyFilter } from '../detailtable.js';
import { rankOf, byRank, reorderWrites } from '../order.js';
import { shareHtml, printers, sharers } from '../share.js';
import * as store from '../store.js';
import {
  loadContacts, createContact, contactFromText, extractDetails, logInteraction, lastActivity,
  detailHref, howFor, HOW, RESEARCH, CASE_STATUS, withCapturedText, CAPTURED_HEADING,
} from '../contacts.js';
import { listEntry, listHint, SHORTCUT } from '../listentry.js';
import { toast, undoable } from '../toast.js';
import { richText, previewLine, plainLines, inlineAll, toHtml } from '../richtext.js';
import { debounced } from '../autosave.js';
import { mentionsOf } from '../refs.js';
import { keepDraft, draftCleared } from '../drafts.js';
import { addTask } from '../tasks.js';
import { isoDate, dateText, dateTimeText } from '../days.js';
import { createListKit } from '../listkit.js';
import { askText } from '../ask.js';
import { word } from '../words.js';
import { tintHex, tintId, colourMenu } from '../colours.js';
import { keys } from '../keys.js';
import { pillMenu } from '../pillmenu.js';
import * as att from '../attachments.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const OLDER_DAYS = 60;
// What a case's logged entry says: "Letter received", "Call made".
const SAID_IN = { call: 'Call received', text: 'Text received', email: 'Email received', letter: 'Letter received', visit: 'They visited', meeting: 'Meeting', other: 'Received' };
const SAID_OUT = { call: 'Call made', text: 'Text sent', email: 'Email sent', letter: 'Letter sent', visit: 'Visit made', meeting: 'Meeting', other: 'Sent' };
const KIND_ORDER = ['call', 'letter', 'email', 'note', 'text', 'visit', 'meeting', 'other']; // a case's New entry: the usual ones first
const STATUS_COLOUR = { open: 'var(--accent)', waiting: '#d9a441', closed: '#4caf7a' };
const STATUS_EMOJI = { open: '📂', waiting: '⏳', closed: '✅' };
// Cases never dragged sort newest opened first.
const openedOrder = kase => -(Date.parse(kase.opened_at || kase.created_at) / 1e4 || 0);
const rankOfCase = kase => rankOf(kase, openedOrder);
// Contacts never dragged sort latest activity first.
const activityOrder = contact => -(Date.parse(lastActivity(contact)) / 1e4 || 0);
const byContact = byRank(activityOrder);
const shortDay = iso => (iso ? dateText(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric' }) : '');
// Time since, in a few letters: "now", "3h", "2d", "5w".
const shortAgo = iso => { const mins = (Date.now() - Date.parse(iso)) / 60000; return mins < 60 ? 'now' : mins < 1440 ? `${Math.round(mins / 60)}h` : mins < 20160 ? `${Math.round(mins / 1440)}d` : `${Math.round(mins / 10080)}w`; };
// A datetime-local field's value for a moment, in local time.
const pad2 = n => String(n).padStart(2, '0');
const localValue = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
// When a log entry happened: a When field still following the clock is "now", to the second.
const atFrom = input => (input.dataset.live === '1' || !input.value ? new Date().toISOString() : new Date(input.value).toISOString());
const whenField = (iso, live) => `<span class="log-when"><input type="datetime-local" name="at" value="${localValue(iso ? new Date(iso) : new Date())}"${live ? ' data-live="1"' : ' class="no-inline"'} aria-label="When"><button type="button" data-act="log-now" title="Set to the time now">Now</button></span>`;

function ago(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? '' : 's'} ago`;
  return dateText(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric' });
}
// Another year's date says which year.
const when = iso => dateTimeText(new Date(iso), { weekday: 'short', day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: '2-digit', minute: '2-digit' });

export default {
  async mount(el) {
    const state = this.state = { tab: 'recent', id: null, q: '' };
    let data = { contacts: [], categories: [], cases: [], interactions: [] };
    let editors = [];
    let editing = null; // the log entry being edited: 'interactions:<id>' or 'case_notes:<id>'
    let atts = new Map();
    let pending = []; // files chosen for the entry about to be logged (attached once it's saved)
    let printable = null; // the open case, as drawn, for its 🖨 Print… (printCase)
    let factsEdit = false; // a case's references and people open to change
    let draft = { how: 'call', dir: 'out' }; // the New entry's kind and Received / Sent, kept between redraws
    // A new entry's When follows the clock until it's changed by hand (Now puts it back).
    this.clock = setInterval(() => { for (const f of el.querySelectorAll('input[name="at"][data-live="1"]')) { f.value = localValue(new Date()); drawWhen(f); } }, 15000);

    el.innerHTML = `
      <div class="sticky-top-mark" aria-hidden="true"></div>
      <div class="sticky-top">
      <div class="tasks-head">
        <button type="button" class="primary c-new-btn" data-act="new-here">+ New contact</button>
        ${shareHtml()}
          ${cogHtml('contacts')}
        <details class="tool-menu page-more">
          <summary class="icon-btn" aria-label="More actions">${icon('i-more')}</summary>
          <div class="menu">
            <button type="button" data-act="new-category">New category</button>
            <hr>
            <a href="#/bin/archive/contacts">Show Archive</a>
            <a href="#/bin/bin/contacts">Show Bin</a>
          </div>
        </details>
      </div>
      <!-- Recent | Directory | Cases: the area's main tabs, coloured with an emoji each as Batch Book's books. -->
      <div class="dump-filter-row c-tabs-row">
        <div class="dump-filter" id="c-tabs" role="tablist" aria-label="Show">
          <button type="button" data-tab="recent" style="--bb:#5aa9e6">🕘 Recent</button>
          <button type="button" data-tab="directory" style="--bb:#9b7fe0">📇 Directory</button>
          <button type="button" data-tab="cases" style="--bb:#e0a040">🗂️ Cases</button>
        </div>
      </div>
      </div>
      <div id="c-body"></div>`;
    const body = el.querySelector('#c-body');
    // The top stays while the page scrolls; glass once it's stuck (as Find Things' and Batch Book's).
    const stickyTop = el.querySelector('.sticky-top');
    this.topWatch?.disconnect();
    this.topWatch = new IntersectionObserver(([e]) => stickyTop.classList.toggle('stuck', !e.isIntersecting && e.boundingClientRect.top < 200), { rootMargin: `-${(parseFloat(getComputedStyle(stickyTop).top) || 0) + (parseFloat(getComputedStyle(stickyTop).paddingTop) || 0)}px 0px 0px 0px` });
    this.topWatch.observe(el.querySelector('.sticky-top-mark'));
    // View choices arriving from another device redraw the Cases list.
    this.gone = new AbortController();
    document.addEventListener('sift-layout', ev => { if (ev.detail?.id === null && state.tab === 'cases' && !state.id) render(); }, { signal: this.gone.signal });
    const go = hash => { if (location.hash !== hash) location.hash = hash; else render(); };

    const byId = id => data.contacts.find(c => c.id === id);
    // First real line of the notes, for cards (not the "Captured" heading).
    const noteLine = c => (c.notes || '').split('\n').map(l => l.trim()).find(l => { const plain = plainLines(l)[0] || ''; return plain && !CAPTURED_HEADING.includes(plain) && !(c.body || '').includes(plain); }) || ''; // not the captured text again
    const catName = id => data.categories.find(k => k.id === id)?.name || '';

    // ---------- shared bits ----------

    function detailChips(c, { log = true } = {}) {
      return (c.details || []).map(d => {
        const href = detailHref(d);
        return href
          ? `<a class="chip detail-chip" href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} ${log ? `data-log="${esc(d.value)}" data-contact="${c.id}"` : ''}>${esc(d.value)}</a>`
          : `<span class="chip">${esc(d.label)}: ${esc(d.value)}</span>`;
      }).join('');
    }

    // A contact can be just a bit of text with a number ("man about the van
    // 07…"): the text is its name. "What was this?" only asks when there is no
    // text at all, just a number.
    const label = c => c.name?.trim() || (c.body || '').split('\n').map(l => l.trim()).find(Boolean) || '(no name)';
    const needsLabel = c => c.status === 'transient' && !c.about && !/\p{L}/u.test((c.details || []).reduce((text, detail) => text.split(detail.value).join(' '), c.name?.trim() || c.body || ''));

    function contactCard(c) {
      return `
        <li class="c-card${c.pinned ? ' pinned' : ''}" data-contact-card="${c.id}" data-id="${c.id}" style="--tint: ${tintHex(c)}">
          <button type="button" class="drag-handle kit-grip" aria-label="Select">${icon('i-grip')}</button>
          <a class="c-main" href="#/contacts/c/${c.id}">
            <span class="c-name">${esc(label(c))}</span>
            ${c.about ? `<span class="muted c-about">${esc(c.about)}</span>` : needsLabel(c) ? '<span class="what-was-this">What was this?</span>' : ''}
            ${c.category_ids?.length ? `<span class="muted c-about">${c.category_ids.map(catName).filter(Boolean).map(esc).join(' · ')}</span>` : ''}
            ${noteLine(c) ? `<span class="muted c-about c-note">${previewLine(noteLine(c)).html}</span>` : ''}
          </a>
          <span class="c-details">${detailChips(c)}</span>
          <span class="muted c-when">${ago(lastActivity(c))}${c.research_status ? ` · ${RESEARCH.find(r => r.id === c.research_status)?.label}` : ''}</span>
        </li>`;
    }

    // ---------- Recent ----------

    function viewRecent() {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const match = c => words.every(w => `${c.name} ${c.about} ${c.body} ${c.notes} ${(c.details || []).map(d => d.value).join(' ')}`.toLowerCase().includes(w));
      const cutoff = new Date(Date.now() - OLDER_DAYS * 86400000).toISOString();
      const sorted = data.contacts.filter(match).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || byContact(a, b));
      const recent = sorted.filter(c => c.pinned || lastActivity(c) >= cutoff || c.status === 'stored' && lastActivity(c) >= cutoff);
      const older = sorted.filter(c => !recent.includes(c));
      return `
        <div class="c-capture">
          <textarea id="c-new" rows="2" placeholder="${esc(word('ph_contact_capture'))}"></textarea>
          <button type="button" class="primary" data-act="capture">Save ${keys(SHORTCUT)}</button>
        </div>
        <input type="search" id="c-q" class="search" placeholder="${esc(word('ph_contact_search'))}" value="${esc(state.q)}" autocomplete="off">
        <ul class="c-list kit-list recent-list">${recent.map(contactCard).join('') || (older.length ? '' : '<li class="empty"><h2>No contacts yet. Paste a number above.</h2></li>')}
          ${older.length ? `<li class="list-head older-head">Older <span class="muted">(untouched for ${OLDER_DAYS} days)</span></li>${older.map(contactCard).join('')}` : ''}
        </ul>`;
    }

    // ---------- Directory ----------

    function viewDirectory() {
      const stored = data.contacts.filter(c => c.status === 'stored');
      const cat = data.categories.find(k => k.id === state.id);
      if (cat) {
        const inCat = stored.filter(c => c.category_ids?.includes(cat.id))
          .sort((a, b) => RESEARCH.findIndex(r => r.id === a.research_status) - RESEARCH.findIndex(r => r.id === b.research_status) || (a.name || '').localeCompare(b.name || ''));
        return `
          <div class="project-head">
            <button type="button" class="back" data-act="dir-home">‹ Directory${keys('Esc')}</button>
            <input class="project-name" value="${esc(cat.name)}" data-category="${cat.id}" aria-label="Category name">
            <span class="muted">${inCat.length} contact${inCat.length === 1 ? '' : 's'}</span>
          </div>
          <details class="research" ${inCat.length ? '' : 'open'}>
            <summary>Research mode: add lots at once</summary>
            <p class="muted hint">One per line: name, number, website, a note, in any order. Numbers, emails and links are recognised. Each becomes a candidate in ${esc(cat.name)}. ${SHORTCUT} to add.</p>
            <textarea id="research-new" rows="4" placeholder="Smith Plumbing 0161 555 0101 smithplumbing.co.uk good reviews&#10;Joe (a neighbour's plumber) 07700 900123 maybe"></textarea>
          </details>
          <ul class="c-list research-list kit-list">${inCat.map(c => `
            ${contactCard(c)}
            <li class="research-row" data-research="${c.id}">
              ${RESEARCH.map(r => `<button type="button" data-status="${r.id}" aria-pressed="${c.research_status === r.id}">${r.label}</button>`).join('')}
              <span class="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${n}" aria-pressed="${(c.rating || 0) >= n}">★</button>`).join('')}</span>
            </li>`).join('') || '<li class="muted hint">' + esc(word('ph_contact_none')) + '</li>'}
          </ul>`;
      }
      const uncategorised = stored.filter(c => !c.category_ids?.length);
      return `
        <div class="cat-grid">
          ${data.categories.map(k => {
            const n = stored.filter(c => c.category_ids?.includes(k.id)).length;
            return `<a class="project-card" href="#/contacts/directory/${k.id}"><span class="project-title">${esc(k.name)}</span><span class="muted">${n} contact${n === 1 ? '' : 's'}</span></a>`;
          }).join('')}
          <button type="button" class="project-card add-card" data-act="new-category">+ New category</button>
        </div>
        <p class="muted hint">${esc(word('ph_categories'))}</p>
        ${uncategorised.length ? `<h3 class="milestone">Stored, no category</h3><ul class="c-list">${uncategorised.map(contactCard).join('')}</ul>` : ''}`;
    }

    // ---------- one contact ----------

    function linkedTo(c) {
      return {
        tasks: [], cases: data.cases.filter(k => k.contact_ids?.includes(c.id)),
        log: data.interactions.filter(i => i.contact_id === c.id).sort((a, b) => b.at.localeCompare(a.at)),
      };
    }

    // openTasks: the contact's open tasks; when there are any, the log can also
    // go on one of them as a comment (js/comments.js).
    // A case's log also takes a plain Note (a case note, no one contacted).
    function logForm(prefix, openTasks = []) {
      const hows = prefix === 'case' ? HOW : HOW.filter(h => !h.caseOnly);
      return `
        <div class="log-form log-box" data-log-form="${prefix}">
          <div class="log-row log-kind"><select name="how" aria-label="What kind">${hows.map(h => `<option value="${h.id}">${h.icon} ${h.label}</option>`).join('')}</select>
            <select name="direction"><option value="out">Sent</option><option value="in">Received</option></select></div>
          <input name="summary" placeholder="${esc(word('ph_log_what'))}" autocomplete="off">
          ${openTasks.length ? `<select name="task_id" aria-label="Also a comment on a task"><option value="">Not about a task</option>${openTasks.map(t => `<option value="${t.id}">💬 ${esc(t.title)}</option>`).join('')}</select>` : ''}
          <div class="log-pending">${pendingHtml()}</div>
          <div class="log-row log-foot">${whenField(null, true)}
            <button type="button" class="att-add" data-act="log-attach" title="Attach photos, PDFs or text files to this entry (or drop them here)">${icon('i-clip')}<span>Attach</span></button>
            <button type="button" class="primary" data-act="log-${prefix}">Log it</button></div>
        </div>`;
    }
    const pendingHtml = () => pending.map((f, n) => `<span class="chip">📎 ${esc(att.shortName(f.name))} <button type="button" class="chip-x" data-act="pending-x" data-n="${n}" aria-label="Don't attach ${esc(f.name)}">×</button></span>`).join('');
    const drawPending = () => { for (const p of el.querySelectorAll('.log-pending')) p.innerHTML = pendingHtml(); };
    function pickPending(camera = false) {
      const input = Object.assign(document.createElement('input'), { type: 'file', multiple: !camera, accept: camera ? 'image/*' : att.ACCEPT, hidden: true });
      if (camera) input.setAttribute('capture', 'environment');
      input.onchange = () => { pending = pending.concat(Array.from(input.files)); input.remove(); drawPending(); };
      document.body.append(input);
      input.click();
    }
    // The chosen files go onto the entry just logged; Undo takes them away with it.
    async function attachPending(collection, id) {
      const files = pending;
      pending = [];
      return files.length ? att.addFiles({ collection, id }, files) : [];
    }
    // A case's New entry: the kind as big tiles, Received | Sent, what happened, then When, 📷, 📎 and Log it in one bar.
    // (Hidden how and direction fields keep the Log it handler the same as the contact page's.)
    function composer() {
      const tiles = KIND_ORDER.map(id => HOW.find(h => h.id === id)).map(h => `<button type="button" class="kc-kind" data-kind="${h.id}" aria-pressed="${draft.how === h.id}"><b aria-hidden="true">${h.icon}</b>${h.label}</button>`).join('');
      const now = new Date();
      return `<div class="log-form kc" data-log-form="case">
        <input type="hidden" name="how" value="${draft.how}"><input type="hidden" name="direction" value="${draft.dir}">
        <div class="kc-kinds" role="group" aria-label="What kind">${tiles}</div>
        <div class="kc-seg" role="group" aria-label="Received or sent"${draft.how === 'note' ? ' hidden' : ''}><button type="button" data-dir="in" aria-pressed="${draft.dir === 'in'}">↙ Received</button><button type="button" data-dir="out" aria-pressed="${draft.dir === 'out'}">↗ Sent</button></div>
        <textarea name="summary" class="kc-text" rows="3" placeholder="${esc(word(draft.how === 'note' ? 'ph_case_note' : 'ph_log_what'))}"></textarea>
        <div class="log-pending">${pendingHtml()}</div>
        <div class="kc-bar">
          <label class="kc-btn kc-when"><input type="datetime-local" name="at" value="${localValue(now)}" data-live="1" aria-label="When"><span class="kc-ico" aria-hidden="true">🕘</span><span class="kc-when-t"><b>Now</b><small>${esc(when(now.toISOString()))}</small></span></label>
          <button type="button" class="kc-btn round" data-act="log-now" title="Back to the time now" aria-label="Back to now" hidden>↺</button>
          <button type="button" class="kc-btn round" data-act="log-camera" title="Take a photo" aria-label="Take a photo">📷</button>
          <button type="button" class="kc-btn round" data-act="log-attach" title="Attach photos, PDFs or text files" aria-label="Attach files">📎</button>
          <button type="button" class="kc-btn primary" data-act="log-case">Log it</button>
        </div></div>`;
    }
    // The When button's words: "Now" while it follows the clock, else the date and time chosen.
    function drawWhen(input) {
      const box = input.closest('.kc-when');
      if (!box) return;
      const live = input.dataset.live === '1', at = input.value ? new Date(input.value) : new Date();
      box.querySelector('.kc-when-t').innerHTML = live ? `<b>Now</b><small>${esc(when(at.toISOString()))}</small>`
        : `<b>${esc(dateText(at, { weekday: 'short', day: 'numeric', month: 'short' }))}</b><small>${esc(dateTimeText(at, { hour: '2-digit', minute: '2-digit' }))}</small>`;
      box.parentElement.querySelector('[data-act="log-now"]').hidden = live;
    }
    const filesOf = id => (atts.get(id)?.length ? `<div class="entry-files">${att.rowHtml(atts.get(id), { addButton: false, parent: id })}</div>` : '');

    // A saved log entry (a call, visit... or a case note) opened to change its when, kind and words.
    function entryEditor(coll, r) {
      const isNote = coll === 'case_notes';
      return `<li class="entry-edit" data-entry="${coll}:${r.id}"><div class="log-form log-box">
        ${isNote ? '' : `<div class="log-row log-kind"><select name="how" aria-label="What kind">${HOW.filter(h => !h.caseOnly).map(h => `<option value="${h.id}"${h.id === r.how ? ' selected' : ''}>${h.icon} ${h.label}</option>`).join('')}</select>
        <select name="direction"><option value="out">Sent</option><option value="in"${r.direction === 'in' ? ' selected' : ''}>Received</option></select></div>`}
        <input name="summary" class="no-inline" value="${esc(isNote ? r.body : r.summary)}" placeholder="${esc(word(isNote ? 'ph_case_note' : 'ph_log_what'))}" autocomplete="off" aria-label="${isNote ? 'Note' : 'What happened'}">
        ${att.rowHtml(atts.get(r.id) || [], { parent: r.id })}
        <div class="log-row log-foot">${whenField(r.at, false)}</div>
        <div class="log-row log-foot"><button type="button" class="danger" data-act="entry-delete">Delete</button><span class="spacer"></span>
          <button type="button" data-act="entry-cancel">Cancel${keys('Esc')}</button>
          <button type="button" class="primary" data-act="entry-save">Save${keys('Enter')}</button></div>
      </div></li>`;
    }
    const editBtn = (coll, id) => `<button type="button" class="icon-btn small entry-edit-btn" data-act="entry-edit" data-entry="${coll}:${id}" title="Edit (when, words)" aria-label="Edit">✎</button>`;

    async function viewContact() {
      const c = byId(state.id);
      if (!c) return '<div class="empty"><h2>That contact has gone.</h2></div>';
      const { cases, log } = linkedTo(c);
      const tasks = await store.list('tasks', { filter: t => t.contact_ids?.includes(c.id) && !t.archived_at });
      const dayItems = await store.list('day_items', { filter: i => i.contact_ids?.includes(c.id) && !i.archived_at });
      const known = new Set([...tasks, ...dayItems].map(r => r.id));
      const mentions = (await mentionsOf('contacts', c.id)).filter(m => !known.has(m.id) && m.id !== c.id);
      const scans = await store.list('scans', { filter: s => s.linked?.collection === 'contacts' && s.linked.id === c.id && !s.archived_at });
      atts = await att.byParent();
      const timeline = [
        { at: c.captured_at, text: 'Recorded', kind: 'captured' },
        ...log.map(i => ({ at: i.at, text: `${HOW.find(h => h.id === i.how)?.icon || ''} ${i.direction === 'in' ? 'They' : 'I'} ${i.how === 'call' ? 'called' : i.how === 'email' ? 'emailed' : i.how === 'text' ? 'texted' : i.how}${i.detail_used ? ` (${i.detail_used})` : ''}${i.summary ? `: ${i.summary}` : ''}`, kind: 'log', id: i.id })),
        ...(c.looked_up_at || []).slice(0, 5).map(at => ({ at, text: 'Looked up', kind: 'look' })),
      ].filter(e => e.at).sort((a, b) => b.at.localeCompare(a.at));
      contactShown = { c, timeline, cases, tasks: tasks.filter(t => !t.done_at) };
      return `
        <div class="project-head">
          <button type="button" class="back" data-act="back">‹ Back${keys('Esc')}</button>
          <input class="project-name" name="name" value="${esc(c.name)}" placeholder="${esc(word('ph_contact_name'))}" data-edit="${c.id}" aria-label="Name">
          <button type="button" class="pin" data-act="pin-contact" aria-pressed="${!!c.pinned}" title="Pin">${c.pinned ? '★' : '☆'}</button>
          ${shareHtml()}
        </div>
        <div class="c-page" data-contact="${c.id}">
          <div class="detail-grid">
            <label class="wide">What was this? / who are they<input name="about" value="${esc(c.about)}" data-edit="${c.id}" placeholder="${esc(word('ph_contact_about'))}" autocomplete="off"></label>
            <label>Kind<select name="kind" data-edit="${c.id}"><option value="person" ${c.kind === 'person' ? 'selected' : ''}>Person</option><option value="organisation" ${c.kind === 'organisation' ? 'selected' : ''}>Organisation</option></select></label>
            <div class="energy-pick"><span>Keep as</span>
              <button type="button" data-act="status" data-value="transient" aria-pressed="${c.status !== 'stored'}">Transient</button>
              <button type="button" data-act="status" data-value="stored" aria-pressed="${c.status === 'stored'}">Stored</button>
            </div>
            ${c.status === 'stored' ? `<div class="energy-pick wide"><span>Categories</span>
              ${data.categories.map(k => `<button type="button" data-act="toggle-cat" data-cat="${k.id}" aria-pressed="${!!c.category_ids?.includes(k.id)}">${esc(k.name)}</button>`).join('')}
              <button type="button" data-act="new-category-here">+ New</button></div>` : ''}
          </div>
          <h3 class="milestone">Details</h3>
          <ul class="detail-rows">${(c.details || []).map((d, n) => `
            <li data-n="${n}">
              <input name="label" value="${esc(d.label)}" class="d-label" aria-label="Label">
              <input name="value" value="${esc(d.value)}" aria-label="Value">
              ${detailHref(d) ? `<a class="icon-btn small" href="${esc(detailHref(d))}" data-log="${esc(d.value)}" data-contact="${c.id}" title="${howFor(d) === 'call' ? 'Call' : 'Open'}">${howFor(d) === 'call' ? '📞' : howFor(d) === 'email' ? '✉️' : '↗'}</a>` : ''}
              <button type="button" class="icon-btn small" data-act="del-detail" aria-label="Remove">×</button>
              ${d.last_used_at ? `<span class="muted d-used">used ${ago(d.last_used_at)}</span>` : ''}
            </li>`).join('')}
          </ul>
          <button type="button" data-act="add-detail">+ Detail</button>
          <h3 class="milestone">Notes</h3>
          <div id="c-notes"></div>
          <h3 class="milestone">Log</h3>
          ${logForm('contact', tasks.filter(t => !t.done_at))}
          <ul class="timeline">${timeline.map(e => (e.id && editing === `interactions:${e.id}` ? entryEditor('interactions', log.find(i => i.id === e.id))
            : `<li class="${e.kind}"${e.id ? ` data-entry="interactions:${e.id}"` : ''}><span class="muted">${when(e.at)}</span> ${esc(e.text)}${e.id ? editBtn('interactions', e.id) + filesOf(e.id) : ''}</li>`)).join('')}</ul>
          ${cases.length || tasks.length || dayItems.length || mentions.length || scans.length ? `<h3 class="milestone">Connected</h3><ul class="links">
            ${cases.map(k => `<li><a href="#/contacts/cases/${k.id}">Case: ${esc(k.title)}</a></li>`).join('')}
            ${tasks.map(t => `<li><a href="#/tasks/list${t.project_id ? `/${t.project_id}` : ''}">Task: ${esc(t.title)}</a></li>`).join('')}
            ${dayItems.map(i => `<li><a href="#/planner/${i.date}">Plan ${i.date}: ${esc(i.title)}</a></li>`).join('')}
            ${mentions.map(m => `<li><a href="${m.route}">${m.icon} Mentioned in ${esc(m.label.toLowerCase())}: ${esc(m.title)}</a></li>`).join('')}
            ${scans.map(s => `<li><a href="#/scans/${s.id}">🧾 Scan: ${esc(s.title)}</a></li>`).join('')}
          </ul>` : ''}
          <div class="detail-actions">
            <button type="button" data-act="contact-task">+ Task with this contact</button>
            <span class="spacer"></span>
            <button type="button" class="thing-colour" data-act="colour-contact"><span class="swatch" style="--sw:${tintHex(c)}"></span> Colour</button>
            <button type="button" data-act="archive-contact">Archive</button>
            <button type="button" class="danger" data-act="delete-contact">Delete</button>
          </div>
        </div>`;
    }

    // ---------- cases ----------

    // The Cases list: Open, Closed or All (its filter bar), as a Details table (the default: columns that
    // resize, sort and filter, detailtable.js) or as Batch Book style cards (👁, Show cases as). Cards drag
    // into your own order (`rank`); in All, a card dropped under Closed closes the case, under Open reopens it.
    const caseShow = () => choiceOf('contacts', 'case-show', 'open');
    const caseLook = () => choiceOf('contacts', 'case-look', 'table');
    const caseView = () => { try { return Object.assign({ sort: { id: 'opened', dir: 'desc' } }, JSON.parse(choiceOf('contacts', 'case-table', '{}'))); } catch { return { sort: { id: 'opened', dir: 'desc' } }; } };
    const isClosed = kase => kase.status === 'closed';
    const caseOf = id => data.cases.find(kase => kase.id === id);
    const statusOf = kase => CASE_STATUS.find(option => option.id === kase.status) || CASE_STATUS[0];
    const badge = kase => `<span class="case-badge" style="--st:${STATUS_COLOUR[statusOf(kase).id]}">${statusOf(kase).label}</span>`;
    const peopleOf = kase => (kase.contact_ids || []).map(id => byId(id)).filter(Boolean).map(label);
    const refOf = kase => (kase.references || []).find(ref => ref.value)?.value || '';
    let caseInfo = new Map(); // per case: entries, latest entry (its words), last activity, files
    async function loadCaseInfo() {
      const notes = await store.list('case_notes');
      atts = await att.byParent();
      caseInfo = new Map(data.cases.map(kase => {
        const entries = data.interactions.filter(entry => entry.case_id === kase.id).concat(notes.filter(note => note.case_id === kase.id)).sort((one, two) => (two.at || '').localeCompare(one.at || ''));
        const latest = entries[0];
        const latestText = !latest ? '' : latest.how ? `${HOW.find(how => how.id === latest.how)?.icon || '•'} ${latest.summary || (latest.direction === 'in' ? SAID_IN : SAID_OUT)[latest.how] || ''}` : `📝 ${plainLines(latest.body || '')[0] || 'Note'}`;
        const files = (atts.get(kase.id) || []).concat(entries.flatMap(entry => atts.get(entry.id) || []));
        const last = [kase.opened_at || kase.created_at, kase.closed_at, latest?.at].concat(files.map(file => file.created_at)).filter(Boolean).sort().at(-1);
        return [kase.id, { entries: entries.length, latest, latestText, files, last }];
      }));
    }
    const info = kase => caseInfo.get(kase.id) || { entries: 0, latestText: '', files: [], last: '' };
    const CASE_COLS = [
      { id: 'opened', label: 'Opened', type: 'date', width: 112, value: kase => kase.opened_at || kase.created_at, text: kase => shortDay(kase.opened_at || kase.created_at), html: kase => `<time>${shortDay(kase.opened_at || kase.created_at)}</time>`, cls: 'dt-date' },
      { id: 'name', label: 'Name', type: 'text', width: 250, value: kase => kase.title || '', text: kase => kase.title || '', html: kase => `<b title="${esc(kase.title)}">${esc(kase.title || 'Untitled')}</b>`, cls: 'dt-name' },
      { id: 'status', label: 'Status', type: 'list', width: 104, value: kase => CASE_STATUS.indexOf(statusOf(kase)), text: kase => statusOf(kase).label, html: badge },
      { id: 'people', label: 'People', type: 'text', width: 150, value: kase => peopleOf(kase).join(', '), text: kase => peopleOf(kase).join(', '), html: kase => esc(peopleOf(kase).join(', ')) },
      { id: 'latest', label: 'Latest entry', type: 'text', width: 260, value: kase => info(kase).latestText, text: kase => info(kase).latestText, html: kase => `<span class="muted" title="${esc(info(kase).latestText)}">${esc(info(kase).latestText)}</span>` },
      { id: 'updated', label: 'Updated', type: 'date', width: 120, value: kase => info(kase).last, text: kase => ago(info(kase).last), html: kase => `<span class="muted" title="${esc(info(kase).last ? when(info(kase).last) : '')}">${ago(info(kase).last)}</span>`, cls: 'dt-date' },
      { id: 'entries', label: 'Entries', type: 'num', width: 96, value: kase => info(kase).entries, text: kase => String(info(kase).entries), html: kase => info(kase).entries || '', cls: 'num' },
      { id: 'files', label: 'Files', type: 'num', width: 76, value: kase => info(kase).files.length, text: kase => String(info(kase).files.length), html: kase => (info(kase).files.length ? `📎 ${info(kase).files.length}` : ''), cls: 'num' },
      { id: 'ref', label: 'Reference', type: 'text', width: 130, value: refOf, text: refOf, html: kase => esc(refOf(kase)) },
    ];
    const casesShown = () => data.cases.filter(kase => caseShow() === 'all' || (caseShow() === 'closed') === isClosed(kase));

    function caseCard(kase) {
      const facts = info(kase);
      const photo = facts.files.find(file => file.kind === 'image' && file.thumb);
      const chips = peopleOf(kase).map(name => `<span class="chip">👤 ${esc(name)}</span>`).concat(refOf(kase) ? [`<span class="chip"># ${esc(refOf(kase))}</span>`] : []);
      return `<li class="bb-card-li case-card" data-id="${kase.id}" data-depth="0" style="--bb:${STATUS_COLOUR[statusOf(kase).id]}">
        <button type="button" class="drag-handle kit-grip" aria-label="Select">${icon('i-grip')}</button>
        <a class="bb-card" href="#/contacts/cases/${kase.id}">
          <span class="bb-card-pic">${photo ? `<img src="${photo.thumb}" alt="" loading="lazy">` : `<span class="bb-card-emoji">${STATUS_EMOJI[statusOf(kase).id]}</span>`}${badge(kase)}</span>
          <span class="bb-card-body">
            <span class="bb-card-title">${esc(kase.title || 'Untitled')}</span>
            ${kase.summary || facts.latestText ? `<span class="muted bb-card-desc">${esc(kase.summary || facts.latestText)}</span>` : ''}
            ${chips.length ? `<span class="bb-card-tags">${chips.join('')}</span>` : ''}
            <span class="muted bb-card-made">Opened ${shortDay(kase.opened_at || kase.created_at)}${facts.entries ? ` · ${facts.entries} entr${facts.entries === 1 ? 'y' : 'ies'}` : ''}${facts.files.length ? ` · 📎 ${facts.files.length}` : ''}</span>
          </span>
        </a>
        <div class="bb-card-acts"><span class="muted case-card-when">${facts.last ? `Updated ${ago(facts.last)}` : ''}</span>
          <details class="tool-menu bb-card-menu">
            <summary class="icon-btn" aria-label="More" title="More">${icon('i-more')}</summary>
            <div class="menu"><span class="menu-label muted">Status</span>
              ${CASE_STATUS.map(option => `<button type="button" data-case-card-status="${option.id}"><i class="kase-dot" style="--st:${STATUS_COLOUR[option.id]}"></i> ${option.label}${option.id === kase.status ? ' ✓' : ''}</button>`).join('')}
              <hr><button type="button" data-case-card="archive">Archive</button><button type="button" class="danger" data-case-card="delete">Delete</button></div>
          </details></div>
      </li>`;
    }
    function caseCards(cases) {
      const ordered = cases.slice().sort(byRank(openedOrder));
      if (caseShow() !== 'all') return `<ul class="bb-grid bb-cards case-cards">${ordered.map(caseCard).join('')}</ul>`;
      const section = (id, title, list) => `<li class="bb-chapter-title case-group" data-sec="${id}" style="--bb:${STATUS_COLOUR[id]}"><span>${STATUS_EMOJI[id]}</span> ${title} <span class="muted">${list.length}</span></li>${list.map(caseCard).join('')}`;
      return `<ul class="bb-grid bb-cards case-cards">${section('open', 'Open', ordered.filter(kase => !isClosed(kase)))}${section('closed', 'Closed', ordered.filter(isClosed))}</ul>`;
    }

    async function viewCases() {
      if (state.id) return viewCase();
      await loadCaseInfo();
      const cases = casesShown();
      const open = data.cases.filter(kase => !isClosed(kase)).length;
      const view = caseView();
      const list = !data.cases.length ? '' : caseLook() === 'cards'
        ? (cases.length ? caseCards(cases) : `<div class="empty"><h2>No ${caseShow()} cases.</h2></div>`)
        : tableHtml({ cols: CASE_COLS, rows: tableRows(cases, CASE_COLS, view), view, cls: 'case-table', rowAttrs: kase => `data-id="${kase.id}" data-case-row="${kase.id}"` });
      return `
        <div class="dump-filter-row case-show-row"><div class="dump-filter" role="tablist" aria-label="Which cases">
          ${[['open', 'Open', open], ['closed', 'Closed', data.cases.length - open], ['all', 'All', data.cases.length]].map(([id, title, count]) => `<button type="button" data-case-show="${id}" aria-pressed="${caseShow() === id}">${title} <span class="muted">${count}</span></button>`).join('')}
          </div>${caseLook() === 'table' && anyFilter(view) ? '<button type="button" class="case-unfilter" data-act="case-unfilter">✕ Clear filters</button>' : ''}</div>
        ${list || `<div class="empty"><h2>No cases yet.</h2><p class="muted">${esc(word('ph_cases'))}</p></div>`}`;
    }
    // 👁 on the Cases list: Show cases as Details or Cards, instead of Spacing (which doesn't fit a table).
    const casesMenuHtml = () => `<h4>Show cases as</h4><div class="view-opts" role="group" aria-label="Show cases as">
        ${[['table', '☰ Details'], ['cards', '▦ Cards']].map(([id, title]) => `<button type="button" data-case-look="${id}" aria-pressed="${caseLook() === id}">${title}</button>`).join('')}</div>${separateHtml()}`;
    const statusPatch = (kase, status) => ({ status, closed_at: status === 'closed' ? (kase.closed_at || new Date().toISOString()) : null });
    async function changeCases(ids, patchOf, label) {
      const writes = ids.filter(caseOf).map(id => [id, patchOf(caseOf(id))]);
      const before = writes.map(([id, patch]) => [id, Object.fromEntries(Object.keys(patch).map(field => [field, caseOf(id)[field] ?? null]))]);
      await store.updateMany('cases', writes);
      await render();
      undoable(`${label}${writes.length > 1 ? ` ${writes.length} cases` : ''}`, async () => { await store.updateMany('cases', before); await render(); });
    }
    async function persistCaseOrder(rows, label, ul, moved) {
      const sectionAt = id => { for (let prev = ul.querySelector(`li[data-id="${CSS.escape(id)}"]`)?.previousElementSibling; prev; prev = prev.previousElementSibling) if (prev.dataset.sec) return prev.dataset.sec; return null; };
      const patch = new Map(reorderWrites(rows, row => rankOfCase(caseOf(row.id)), moved).map(([row, key]) => [row.id, { rank: key }]));
      let into = null;
      for (const id of moved) {
        const kase = caseOf(id), section = sectionAt(id);
        if (!kase || !section || (section === 'closed') === isClosed(kase)) continue;
        into = section;
        patch.set(id, Object.assign(patch.get(id) || {}, statusPatch(kase, section)));
      }
      if (!patch.size) return;
      const before = Array.from(patch.keys()).map(id => [id, Object.fromEntries(Object.keys(patch.get(id)).map(field => [field, caseOf(id)?.[field] ?? null]))]);
      await store.updateMany('cases', Array.from(patch.entries()));
      await render();
      undoable(into === 'closed' ? 'Closed' : into ? 'Reopened' : 'Moved a case', async () => { await store.updateMany('cases', before); await render(); });
    }
    const caseTable = this.caseTable = wireTable(body, { cols: CASE_COLS, rows: casesShown, view: caseView, save: next => { setChoice('contacts', 'case-table', JSON.stringify(next)); render(); } });

    // Share, 🖨 Print… on an open case: a case report (print.js), its photos as thumbnails in the Timeline and/or full size at the end.
    // An open contact: Share copies its name, details and notes; Print… a contact sheet (print.js printRecord).
    let contactShown = null;
    const openContact = () => (state.tab === 'contact' && state.id && contactShown?.c.id === state.id ? contactShown : null);
    sharers.contacts = () => {
      const shown = openContact();
      if (!shown) return null;
      const { c } = shown;
      return { title: c.name || 'Contact', lines: [c.about, (c.details || []).filter(d => d.value).map(d => `${d.label ? `${d.label}: ` : ''}${d.value}`).join('\n'), plainLines(c.notes).join('\n')] };
    };
    printers.contacts = () => {
      const shown = openContact();
      if (shown) {
        const { c, timeline, cases, tasks } = shown;
        import('../print.js').then(({ printRecord }) => printRecord({ kind: 'contact', title: c.name || 'Contact', back: 'Contact', eyebrow: c.kind === 'organisation' ? 'Organisation' : 'Contact', colour: c.colour ? tintHex(c) : '',
          facts: [['About', c.about], ...(c.details || []).map(d => [d.label || 'Detail', d.value])],
          parts: [{ key: 'notes', words: 'Notes', html: c.notes?.trim() ? toHtml(c.notes) : '' },
            { key: 'log', words: 'Log', html: timeline.length ? `<ul>${timeline.map(e => `<li><b>${esc(when(e.at))}</b> ${esc(e.text)}</li>`).join('')}</ul>` : '' },
            { key: 'connected', words: 'Cases and tasks', html: cases.length || tasks.length ? `<ul>${cases.map(k => `<li>Case: ${esc(k.title)}</li>`).join('')}${tasks.map(t => `<li>Task: ${esc(t.title)}</li>`).join('')}</ul>` : '' }] }));
        return true;
      }
      return state.tab === 'cases' && state.id && printable?.k.id === state.id ? (printCase(), true) : false;
    };
    async function printCase() {
      const { openPrint, filePicture } = await import('../print.js');
      const { k, events, status, refs, people, days } = printable;
      const words = html => { const div = document.createElement('div'); div.innerHTML = html || ''; div.querySelectorAll('button, a').forEach(x => x.replaceWith(x.textContent)); return div.innerHTML; };
      const fileOf = new Map([...atts.values()].flat().map(a => [a.id, a]));
      const filesFor = e => (e.type === 'file' ? [fileOf.get(/data-att-open="([^"]+)"/.exec(e.body)?.[1])].filter(Boolean) : e.entry ? atts.get(e.entry[1].id) || [] : []);
      const CSS = `.chead { padding: 1.1em 1.3em; border-radius: .3em; background: #1f3a5f; color: #fff; display: flex; justify-content: space-between; align-items: flex-end; gap: 1em; }
        .chead .eye { font-size: .72em; letter-spacing: .14em; text-transform: uppercase; color: #b8c7dc; } .chead h1 { font-size: 1.9em; margin: .1em 0 0; line-height: 1.15; }
        .chead .right { text-align: right; font-size: .9em; color: #dbe4f0; white-space: nowrap; }
        .pill { display: inline-block; padding: .1em .7em; border-radius: 1em; font-size: .78em; font-weight: 700; letter-spacing: .06em; color: #fff; background: var(--st); }
        .bw .chead { background: none; color: var(--ink); border-top: .25em solid var(--ink); border-bottom: 1px solid var(--ink); border-radius: 0; padding: .8em 0; }
        .bw .chead .eye, .bw .chead .right { color: var(--soft); } .bw .pill { background: none; color: var(--ink); border: 1px solid var(--ink); }
        .facts { width: 100%; border-collapse: collapse; margin: 1em 0 .4em; font-size: .92em; } .facts td { padding: .25em 0; vertical-align: top; } .facts td:first-child { color: var(--soft); width: 7.5em; }
        .sum { border-left: .2em solid var(--rule); padding: .3em 0 .3em .9em; margin: .8em 0 1.3em; }
        .sec { font-size: .8em; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #1f3a5f; background: #e8eef6; padding: .55em .9em; margin: 1.2em 0 .5em; break-after: avoid; }
        .bw .sec { color: var(--ink); background: none; border-bottom: 1.5px solid var(--ink); padding: .4em 0; }
        .ev { display: flex; gap: .9em; padding: .55em 0 .7em; border-bottom: 1px solid #eef2f7; break-inside: avoid; }
        .ic { width: 2.2em; height: 2.2em; border-radius: 50%; border: .15em solid #94a3b8; display: flex; align-items: center; justify-content: center; flex: none; font-size: .95em; }
        .ev.in .ic { border-color: #2b6cb0; } .ev.out .ic { border-color: #d69e2e; } .bw .ev .ic { border-color: var(--ink); filter: grayscale(1); }
        .ev .hd { font-size: .85em; color: var(--soft); } .ev .hd b { color: var(--ink); font-size: 1.08em; } .ev .bd { margin-top: .15em; } .ev .bd p { margin: .2em 0; }
        .thumbs { display: flex; flex-wrap: wrap; gap: .6em; margin-top: .45em; } .thumbs img { height: calc(6.5em * var(--ps, 1)); max-width: 100%; border: 1px solid var(--rule); border-radius: .2em; } .fname { font-size: .85em; color: var(--soft); }
        .full { break-inside: avoid; margin: 0 0 1.4em; } .full img { max-width: 100%; max-height: calc(10cm * var(--ps, 1)); border: 1px solid var(--rule); display: block; } .full div { font-size: .8em; color: var(--soft); margin-top: .3em; }
`;
      openPrint({ kind: 'case', title: k.title || 'Case', back: 'Case', photos: true, defaults: { details: true, timeline: true, times: true, tasks: true, order: 'old', photos: 'both' },
        options: [['What goes in'], { check: 'details', words: 'Summary and details (references, people)' }, { check: 'timeline', words: 'Timeline' }, { check: 'times', words: 'Times on each entry' },
          { check: 'tasks', words: "Tasks, their comments and filed scans" },
          ['Timeline order'], { seg: 'order', items: [['old', 'Oldest first'], ['new', 'Newest first']] },
          ['Photos and documents'], { seg: 'photos', items: [['thumbs', 'Thumbnails in the Timeline'], ['both', 'Thumbnails, and full size at the end'], ['full', 'Full size at the end'], ['names', 'File names only'], ['none', 'Leave out']], hint: 'PDFs print their first page.' }],
        build: async (ch, keep) => {
          const pics = new Map();
          const picOf = async a => { if (!pics.has(a.id)) pics.set(a.id, await filePicture(a, keep)); return pics.get(a.id); };
          const shown = events.filter(e => ch.tasks || !/^(task|comment|scan)/.test(e.type)).slice().sort((x, y) => (ch.order === 'old' ? x.at.localeCompare(y.at) : y.at.localeCompare(x.at)));
          const all = [];
          const evHtml = async e => {
            const files = filesFor(e);
            all.push(...files);
            const thumbs = ['thumbs', 'both'].includes(ch.photos) ? (await Promise.all(files.map(async a => { const src = await picOf(a); return src ? `<img class="photo" src="${src}" alt="">` : `<span class="fname">📎 ${esc(a.name)}</span>`; }))).join('') : '';
            const names = ch.photos === 'names' || ch.photos === 'full' ? files.map(a => `<span class="fname">📎 ${esc(a.name)}</span>`).join(' ') : '';
            const body = e.type === 'file' ? (thumbs ? '' : ch.photos === 'none' ? '' : names) : words(e.body);
            return `<div class="ev ${/ctl-in/.test(e.type) ? 'in' : /ctl-out/.test(e.type) ? 'out' : ''}"><div class="ic">${e.icon}</div><div><div class="hd">${ch.times ? `${esc(when(e.at))} · ` : ''}<b>${words(e.head)}</b></div>${body ? `<div class="bd">${body}</div>` : ''}${thumbs ? `<div class="thumbs">${thumbs}</div>` : e.type !== 'file' && names ? `<div class="bd">${names}</div>` : ''}</div></div>`;
          };
          const timeline = ch.timeline ? (await Promise.all(shown.filter(e => e.type !== 'file' || ch.photos !== 'none').map(evHtml))).join('') : '';
          if (!ch.timeline) for (const e of events) all.push(...filesFor(e));
          const full = ['both', 'full'].includes(ch.photos) ? (await Promise.all(all.map(async a => { const src = await picOf(a); return src ? `<div class="full"><img class="photo" src="${src}" alt=""><div>${esc(a.name)} · ${esc(dateText(new Date(a.created_at), { day: 'numeric', month: 'short', year: 'numeric' }))}</div></div>` : ''; }))).join('') : '';
          const opened = dateText(new Date(k.opened_at || k.created_at), { day: 'numeric', month: 'short', year: 'numeric' });
          return { flow: true, css: CSS, html: `<div class="flow" style="--st:${status.id === 'closed' ? '#2f855a' : status.id === 'waiting' ? '#d69e2e' : '#2b6cb0'}">
            <div class="chead"><div><div class="eye">Case</div><h1>${esc(k.title)}</h1></div><div class="right"><span class="pill">${esc(status.label.toUpperCase())}</span><br>Opened ${esc(opened)} · ${days} day${days === 1 ? '' : 's'}</div></div>
            ${ch.details ? `<table class="facts">${refs.map(r => `<tr><td>${esc(r.label || 'Reference')}</td><td><b>${esc(r.value)}</b></td></tr>`).join('')}
              ${people.length ? `<tr><td>People</td><td>${people.map(c => esc([c.name, ...(c.details || []).filter(d => d.value && /phone|email/.test(d.kind || '')).map(d => d.value)].join(' · '))).join('<br>')}</td></tr>` : ''}
              <tr><td>Printed</td><td>${esc(dateText(new Date(), { day: 'numeric', month: 'short', year: 'numeric' }))}</td></tr></table>${k.summary ? `<div class="sum">${esc(k.summary)}</div>` : ''}` : ''}
            ${timeline ? `<div class="sec">Timeline (${ch.order === 'old' ? 'oldest' : 'newest'} first)</div>${timeline}` : ''}
            ${full ? `<div class="sec">Photos and documents</div>${full}` : ''}</div>` };
        } });
    }

    async function viewCase() {
      const k = data.cases.find(x => x.id === state.id);
      if (!k) return '<div class="empty"><h2>That case has gone.</h2></div>';
      const log = data.interactions.filter(i => i.case_id === k.id);
      const notes = await store.list('case_notes', { filter: n => n.case_id === k.id });
      const tasks = await store.list('tasks', { filter: t => t.case_id === k.id && !t.archived_at });
      const scans = await store.list('scans', { filter: s => s.linked?.collection === 'cases' && s.linked.id === k.id });
      // Comments on the case's tasks (js/comments.js), each under its task's name.
      const taskIds = new Map(tasks.map(t => [t.id, t]));
      const comments = await store.list('comments', { filter: c => taskIds.has(c.task_id) });
      atts = await att.byParent();
      const files = atts.get(k.id) || [];
      // The Timeline: one callout per event, its kind's emoji on the rail at the left, newest first.
      const who = i => (i.contact_id && byId(i.contact_id)?.name) || '';
      const said = i => `${(i.direction === 'in' ? SAID_IN : SAID_OUT)[i.how] || (i.direction === 'in' ? 'Received' : 'Sent')}${who(i) ? ` · ${who(i)}` : ''}`;
      const events = files.map(a => ({ at: a.created_at, type: 'file', icon: '📎', head: 'Attached to the case', body: `<button type="button" class="link-btn" data-att-open="${a.id}">${esc(a.name)}</button>` }))
        .concat(log.map(i => ({ at: i.at, type: `log ctl-${i.direction === 'in' ? 'in' : 'out'}`, icon: HOW.find(h => h.id === i.how)?.icon || '•', entry: ['interactions', i], head: esc(said(i)), body: `${i.detail_used ? `<span class="muted">${esc(i.detail_used)}</span> ` : ''}${esc(i.summary || '')}` })))
        .concat(notes.map(n => ({ at: n.at, type: 'note', icon: '📝', entry: ['case_notes', n], head: 'Note', body: n.body ? inlineAll(n.body) : '' })))
        .concat(tasks.map(t => ({ at: t.created_at, type: `task${t.done_at ? ' ctl-done' : ''}`, icon: t.done_at ? '✅' : '☑️', head: t.done_at ? 'Task (done)' : 'Task', body: `<a href="#/tasks/list">${esc(t.title)}</a>` })))
        .concat(comments.map(c => ({ at: c.at, type: 'comment', icon: '💬', head: `On <a href="#/tasks/list">${esc(taskIds.get(c.task_id).title)}</a>`, body: c.body ? inlineAll(c.body) : '📎' })))
        .concat(scans.map(sc => ({ at: sc.letter_date || sc.created_at, type: 'scan', icon: '🧾', head: 'Scan', body: `<a href="#/scans/${sc.id}">${esc(sc.title)}</a>${sc.summary ? `: ${esc(sc.summary)}` : ''}` })))
        .sort((a, b) => b.at.localeCompare(a.at));
      const monthOf = iso => dateText(new Date(iso), { month: 'long', year: 'numeric' });
      const timeline = events.map((e, n) => {
        const month = n === 0 || monthOf(e.at) !== monthOf(events[n - 1].at) ? `<li class="ctl-month"><span>${esc(monthOf(e.at))}</span></li>` : '';
        if (e.entry && editing === `${e.entry[0]}:${e.entry[1].id}`) return month + entryEditor(e.entry[0], e.entry[1]);
        return `${month}<li class="ctl-item ctl-${e.type}"${e.entry ? ` data-entry="${e.entry[0]}:${e.entry[1].id}"` : ''}>
          <span class="ctl-icon" aria-hidden="true">${e.icon}</span>
          <div class="ctl-card"><div class="ctl-head"><time>${when(e.at)}</time> <b>${e.head}</b>${e.entry ? editBtn(e.entry[0], e.entry[1].id) : ''}</div>
            ${e.body ? `<div class="ctl-body">${e.body}</div>` : ''}${e.entry ? filesOf(e.entry[1].id) : ''}</div></li>`;
      }).join('');
      const status = CASE_STATUS.find(x => x.id === k.status) || CASE_STATUS[0];
      const entries = log.concat(notes);
      const last = entries.map(x => x.at).sort().at(-1);
      const days = Math.max(0, Math.floor((Date.parse(k.closed_at || new Date().toISOString()) - Date.parse(k.opened_at || k.created_at)) / 86400000));
      const refs = (k.references || []).filter(r => r.value);
      const people = (k.contact_ids || []).map(id => byId(id)).filter(Boolean);
      printable = { k, events, status, refs, people, days };
      return `
        <div class="kase-top"><button type="button" class="back" data-act="cases-home">‹ Cases${keys('Esc')}</button>
          <span class="spacer"></span>${shareHtml()}
          <details class="tool-menu page-more">
            <summary class="icon-btn" aria-label="More actions">${icon('i-more')}</summary>
            <div class="menu"><button type="button" data-act="facts-edit">Edit references and people</button><button type="button" data-act="case-task">Add a task for this case</button><hr>
              <button type="button" data-act="archive-case">Archive case</button><button type="button" class="danger" data-act="delete-case">Delete case</button></div>
          </details></div>
        <div class="c-page kase" data-case-page="${k.id}">
          <header class="kase-hero" style="--st:${STATUS_COLOUR[status.id]}">
            <div class="kase-eyebrow"><span class="kase-fold" aria-hidden="true">📁</span>Case<span aria-hidden="true">·</span>opened ${esc(dateText(new Date(k.opened_at || k.created_at), { day: 'numeric', month: 'short', year: 'numeric' }))}</div>
            <textarea class="kase-title one-line" name="title" data-case="${k.id}" rows="1" aria-label="Case title">${esc(k.title)}</textarea>
            <textarea class="kase-summary one-line" name="summary" data-case="${k.id}" rows="1" placeholder="Add a summary" aria-label="Summary">${esc(k.summary)}</textarea>
            <button type="button" class="kase-status" data-act="case-status-menu" aria-haspopup="menu" title="Change the status"><i aria-hidden="true"></i>${status.label}<span class="kase-caret" aria-hidden="true">▾</span></button>
            <div class="kase-stats"><div><b>${days}</b><span>day${days === 1 ? '' : 's'} ${k.status === 'closed' ? 'it took' : 'open'}</span></div><div><b>${entries.length}</b><span>entr${entries.length === 1 ? 'y' : 'ies'}</span></div><div><b>${last ? shortAgo(last) : '–'}</b><span>since last</span></div></div>
            ${factsEdit ? `<div class="kase-edit">
              <ul class="detail-rows">${(k.references || []).map((r, n) => `
                <li data-ref="${n}"><input name="label" value="${esc(r.label)}" class="d-label" aria-label="What it is"><input name="value" value="${esc(r.value)}" aria-label="Reference">
                  <button type="button" class="kc-btn round" data-act="del-ref" aria-label="Remove">×</button></li>`).join('')}</ul>
              <div class="kase-edit-people">${people.map(c => `<span class="kase-fact"><em aria-hidden="true">👤</em>${esc(c.name)}<button type="button" class="chip-x" data-act="case-unlink" data-id="${c.id}" aria-label="Take ${esc(c.name)} off the case">×</button></span>`).join('')}</div>
              <div class="kase-edit-bar"><button type="button" class="kc-btn" data-act="add-ref">+ Reference</button>
                <select id="case-add-contact" class="kc-btn" aria-label="Add a person"><option value="">+ Person…</option>${data.contacts.filter(c => !k.contact_ids?.includes(c.id)).map(c => `<option value="${c.id}">${esc(c.name || '(no name)')}</option>`).join('')}</select>
                <span class="spacer"></span><button type="button" class="kc-btn primary" data-act="facts-done">Done</button></div></div>`
            : `<div class="kase-facts">${refs.map(r => `<button type="button" class="kase-fact" data-act="copy-ref" data-value="${esc(r.value)}" title="Copy ${esc(r.value)}"><em aria-hidden="true">#</em>${esc(r.value)}${r.label ? ` <small>${esc(r.label)}</small>` : ''}</button>`).join('')}
              ${people.map(c => `<a class="kase-fact" href="#/contacts/c/${c.id}"><em aria-hidden="true">👤</em>${esc(c.name)}</a>`).join('')}
              <button type="button" class="kase-fact add" data-act="facts-edit">${refs.length || people.length ? '✎ Edit' : '+ Reference or person'}</button></div>`}
          </header>
          ${composer()}
          <h2 class="kase-lab"><span>Photos and documents</span><span>${files.length || ''}</span></h2>
          <div class="kase-files">${att.rowHtml(files, { parent: k.id, addButton: 'Add' })}</div>
          <h2 class="kase-lab"><span>Timeline</span><span>${events.length || ''}</span></h2>
          <ol class="ctl">${timeline || '<li class="ctl-empty muted">Nothing yet. Log a call, letter or note above.</li>'}</ol>
          <div class="kase-foot"><button type="button" class="kc-btn" data-act="case-task">+ Task</button><button type="button" class="kc-btn" data-act="archive-case">Archive</button><button type="button" class="kc-btn danger" data-act="delete-case">Delete</button></div>
        </div>`;
    }

    // ---------- render ----------

    // After a sync the app calls refresh(): redraw from fresh data, keeping what's open.
    const render = this.render = this.refresh = async () => {
      data = await loadContacts();
      for (const b of el.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', b.dataset.tab === (state.tab === 'contact' ? '' : state.tab));
      // An opened case or contact is a page of its own: no + New, tabs, Share or menus above it, its ‹ back top left.
      el.classList.toggle('c-opened', state.tab === 'contact' || (state.tab === 'cases' && !!state.id));
      el.querySelector('.c-new-btn').textContent = state.tab === 'cases' ? '+ New case' : '+ New contact';
      const casesList = state.tab === 'cases' && !state.id;
      const menu = el.querySelector('.page-cog .view-settings');
      if (menu.dataset.cases !== String(casesList)) { menu.innerHTML = casesList ? casesMenuHtml() : menuHtml('contacts'); menu.dataset.cases = String(casesList); }
      if (!casesList) caseTable.close();
      body.innerHTML = state.tab === 'directory' ? viewDirectory()
        : state.tab === 'cases' ? await viewCases()
        : state.tab === 'contact' ? await viewContact()
        : viewRecent();
      // The chosen kind tile in view, even when it's one the row has to scroll to.
      const kindOn = body.querySelector('.kc-kind[aria-pressed="true"]');
      if (kindOn) kindOn.parentElement.scrollLeft = kindOn.offsetLeft - kindOn.parentElement.offsetLeft - 14;
      const ed = body.querySelector('.entry-edit [name="summary"]');
      if (ed && !body.contains(document.activeElement)) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); }
      const cap = body.querySelector('#c-new');
      if (cap) keepDraft(cap, 'contacts:new');
      if (cap) cap.addEventListener('keydown', ev => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); capture(); } });
      kit.attach(body.querySelector('.recent-list'));
      dirKit.attach(body.querySelector('.research-list'));
      caseKit.attach(body.querySelector('.case-cards'));
      const research = body.querySelector('#research-new');
      if (research) listEntry(research, addCandidates, { draft: `contacts:research:${state.id}` });
      // Esc leaves the box, keeping what's typed (as a draft); the next Esc leaves the case.
      research?.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !ev.isComposing) { ev.preventDefault(); research.blur(); } });
      const q = body.querySelector('#c-q');
      if (q) q.addEventListener('input', () => { clearTimeout(this.qt); this.qt = setTimeout(() => { state.q = q.value.trim(); render().then(() => { const n = body.querySelector('#c-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }, 200); });
      const notesBox = body.querySelector('#c-notes');
      if (notesBox) {
        const c = byId(state.id);
        let pend = null;
        const auto = debounced(async () => { const md = pend; pend = null; if (md !== null) await store.update('contacts', c.id, { notes: md }); }, 600);
        richText(notesBox, { value: c.notes || '', placeholder: word('ph_contact_notes'), spot: false, origin: () => ({ collection: 'contacts', id: c.id, title: c.name, field: 'notes' }), onChange: md => { pend = md; auto.trigger(); } });
        notesBox.addEventListener('focusout', ev => { if (!notesBox.contains(ev.relatedTarget)) auto.flush(); });
      }
    };

    // ---------- selecting several ----------

    async function batch(ids, fields, label) {
      const before = ids.map(id => { const c = byId(id); return [id, Object.fromEntries(Object.keys(fields).map(k => [k, c?.[k] ?? null]))]; });
      await store.updateMany('contacts', ids.map(id => [id, fields]));
      await render();
      undoable(`${label} ${ids.length} contact${ids.length === 1 ? '' : 's'}`, async () => { await store.updateMany('contacts', before); await render(); });
    }
    const contactActions = [
      { id: 'colour', label: 'Colour…', run: ids => { colourMenu(document.querySelector('[data-kit-action="colour"]'), null, v => batch(ids, { colour: v }, 'Colour of')); } },
      { id: 'store', label: 'Store', run: ids => batch(ids, { status: 'stored' }, 'Stored') },
      { id: 'pin', label: 'Pin', run: ids => batch(ids, { pinned: true }, 'Pinned') },
      { id: 'archive', label: 'Archive', key: 'A', run: ids => batch(ids, { archived_at: new Date().toISOString() }, 'Archived') },
      { id: 'delete', label: 'Delete', key: 'D', danger: true, run: ids => batch(ids, { deleted_at: new Date().toISOString() }, 'Deleted') },
    ];
    // Recent's cards drag into your own order (`rank`); never dragged, they keep to latest activity first.
    async function contactOrder(rows, label, ul, moved) {
      const writes = reorderWrites(rows, row => rankOf(byId(row.id), activityOrder), moved);
      const before = writes.map(([row]) => [row.id, { rank: byId(row.id)?.rank ?? null }]);
      await store.updateMany('contacts', writes.map(([row, rank]) => [row.id, { rank }]));
      await render();
      undoable('Moved a contact', async () => { await store.updateMany('contacts', before); await render(); });
    }
    const kit = this.kit = createListKit({ reorder: true, grid: true, holdSelect: true, noun: 'contact', onReorder: contactOrder, actions: contactActions }); // hold to choose, drag by the ⠿
    // A Directory category lists research buttons under each card, so its cards are chosen but not dragged.
    const dirKit = this.dirKit = createListKit({ reorder: false, holdSelect: true, noun: 'contact', actions: contactActions });
    const now = () => new Date().toISOString();
    const caseKit = this.caseKit = createListKit({
      reorder: true, grid: true, holdSelect: true, noun: 'case', onReorder: persistCaseOrder, // as Batch Book's cards: hold to choose, drag by the ⠿
      actions: CASE_STATUS.map(option => ({ id: `status-${option.id}`, label: `${STATUS_EMOJI[option.id]} ${option.label}`, group: 'Status', run: ids => changeCases(ids, kase => statusPatch(kase, option.id), `Marked ${option.label.toLowerCase()}`) }))
        .concat([
          { id: 'archive', label: 'Archive', key: 'A', run: ids => changeCases(ids, () => ({ archived_at: now() }), 'Archived') },
          { id: 'delete', label: 'Delete', key: 'D', danger: true, run: ids => changeCases(ids, () => ({ deleted_at: now() }), 'Deleted') },
        ]),
    });
    this.onKey = ev => {
      if (ev.key === 'Escape' && !ev.target.closest('input, textarea, select, [contenteditable]') && (kit.escape() || dirKit.escape() || caseKit.escape())) ev.preventDefault();
      // A row of the Cases table opens with Enter, as a click.
      const row = ev.key === 'Enter' && ev.target.closest?.('tr[data-case-row]');
      if (row) { ev.preventDefault(); go(`#/contacts/cases/${row.dataset.caseRow}`); }
    };
    addEventListener('keydown', this.onKey);

    // ---------- actions ----------

    async function capture() {
      const ta = body.querySelector('#c-new');
      const text = ta.value.trim();
      if (!text) return;
      const c = await contactFromText(text);
      ta.value = '';
      draftCleared(ta);
      await render();
      undoable(`Saved ${c.name || 'contact'}`, async () => { await store.remove('contacts', c.id); render(); });
    }

    async function addCandidates(lines) {
      const made = [];
      for (const line of lines) {
        made.push(await contactFromText(line.text, { status: 'stored', category_ids: [state.id], research_status: 'candidate' }));
      }
      await render();
      undoable(`Added ${made.length} candidate${made.length === 1 ? '' : 's'}`, async () => {
        await store.updateMany('contacts', made.map(c => [c.id, { deleted_at: new Date().toISOString() }]));
        render();
      });
    }

    async function newCategory() {
      const name = await askText('New category', { placeholder: word('ph_new_category'), ok: 'Add' });
      if (!name?.trim()) return null;
      return store.create('contact_categories', { name: name.trim(), colour: null, sort_order: data.categories.length });
    }

    async function newCase() {
      const title = await askText('New case', { placeholder: word('ph_new_case'), ok: 'Add' });
      if (!title?.trim()) return;
      const k = await store.create('cases', { title: title.trim(), status: 'open', summary: '', references: [], contact_ids: [], project_id: null, opened_at: new Date().toISOString(), closed_at: null });
      go(`#/contacts/cases/${k.id}`);
    }

    async function updateContact(id, fields, label = 'Saved') {
      const before = byId(id);
      const old = Object.fromEntries(Object.keys(fields).map(k => [k, before?.[k] ?? null]));
      await store.update('contacts', id, fields);
      await render();
      undoable(label, async () => { await store.update('contacts', id, old); render(); });
    }

    // Saving (or deleting) the log entry being edited. The time is kept to the second unless it was changed.
    async function entryDone(row, del) {
      const [coll, id] = row.dataset.entry.split(':');
      const r = await store.get(coll, id);
      editing = null;
      if (!r) return render();
      if (del) {
        await store.remove(coll, id);
        await render();
        undoable(coll === 'case_notes' ? 'Note deleted' : 'Log entry deleted', async () => { await store.restore(coll, id); render(); });
        return;
      }
      const atField = row.querySelector('[name="at"]');
      const text = row.querySelector('[name="summary"]').value.trim();
      const fields = { at: atField.value && atField.value !== localValue(new Date(r.at)) ? new Date(atField.value).toISOString() : r.at };
      if (coll === 'case_notes') {
        if (!text && !atts.get(id)?.length) { editing = row.dataset.entry; toast('A note needs some words: Delete takes it away'); return; }
        fields.body = text;
      } else Object.assign(fields, { summary: text, how: row.querySelector('[name="how"]').value, direction: row.querySelector('[name="direction"]').value });
      const old = Object.fromEntries(Object.keys(fields).map(x => [x, r[x] ?? null]));
      if (Object.keys(fields).every(x => fields[x] === old[x])) return render();
      await store.update(coll, id, fields);
      await render();
      undoable('Saved', async () => { await store.update(coll, id, old); render(); });
    }
    el.addEventListener('keydown', ev => {
      const row = ev.target.closest('.entry-edit');
      if (row && ev.key === 'Enter' && !ev.isComposing && ev.target.matches('input')) { ev.preventDefault(); entryDone(row, false); }
      else if (row && ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); editing = null; render(); }
      else if (ev.key === 'Enter' && !ev.isComposing && ev.target.matches('.log-form [name="summary"]') && (ev.target.matches('input') || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); ev.target.closest('.log-form').querySelector('[data-act="log-case"], [data-act="log-contact"]').click(); }
    });
    // Changing a new entry's When by hand stops it following the clock; a Note has no "who contacted whom".
    el.addEventListener('input', ev => { if (ev.target.matches('input[name="at"]')) { delete ev.target.dataset.live; drawWhen(ev.target); } });
    el.addEventListener('change', ev => {
      if (!ev.target.matches('.log-form [name="how"]')) return;
      const f = ev.target.closest('.log-form'), note = ev.target.value === 'note';
      f.querySelector('[name="direction"]').hidden = note;
      f.querySelector('[name="summary"]').placeholder = word(note ? 'ph_case_note' : 'ph_log_what');
    });
    // Files go onto the log entry they're on (its row in the Timeline, or it open to edit), else onto the case.
    const entryParent = node => {
      const row = node.closest('[data-entry]');
      if (row && !row.matches('[data-act]')) { const [collection, id] = row.dataset.entry.split(':'); return { collection, id }; }
      return state.tab === 'cases' && state.id ? { collection: 'cases', id: state.id } : null;
    };
    // An entry open to edit keeps what's typed: only its files row is redrawn.
    const attDone = async parent => { if (parent?.collection === 'cases' || !el.querySelector(`.entry-edit[data-entry$=":${parent?.id}"]`)) return render(); atts = await att.byParent(); await att.redrawRows(el, parent.id); };
    att.enableDrop(el, '.timeline li[data-entry], [data-case-page]', entryParent, attDone);
    // Files dropped on the New entry box wait to go on the entry when it's logged.
    el.addEventListener('dragover', ev => { if (ev.target.closest?.('.log-box[data-log-form]') && [...(ev.dataTransfer?.types || [])].includes('Files')) ev.preventDefault(); });
    el.addEventListener('drop', ev => {
      if (!ev.target.closest?.('.log-box[data-log-form]') || !ev.dataTransfer?.files.length) return;
      ev.preventDefault();
      ev.stopPropagation();
      pending = pending.concat(Array.from(ev.dataTransfer.files));
      drawPending();
    }, true);

    // Tapping a number/email logs a contact attempt, then lets the link work.
    el.addEventListener('click', async ev => {
      const link = ev.target.closest('a[data-log]');
      if (!link) return;
      const c = byId(link.dataset.contact);
      const d = c?.details.find(x => x.value === link.dataset.log);
      if (!c || !d) return;
      await logInteraction({ contact_id: c.id, how: howFor(d), direction: 'out', detail_used: d.value });
      toast(`Logged: ${howFor(d) === 'call' ? 'called' : 'contacted'} ${c.name || ''}`.trim());
    }, true);

    el.addEventListener('click', async ev => {
      if ((state.tab === 'cases' || state.tab === 'contact') && state.id && att.onClick(ev, entryParent, attDone)) return;
      // The New entry's kind tiles and Received | Sent: changed in place, so what's typed stays.
      const tile = ev.target.closest('[data-kind], [data-dir]');
      if (tile) {
        const form = tile.closest('.kc');
        if (tile.dataset.kind) {
          draft.how = tile.dataset.kind;
          for (const x of form.querySelectorAll('[data-kind]')) x.setAttribute('aria-pressed', x === tile);
          form.querySelector('[name="how"]').value = draft.how;
          form.querySelector('.kc-seg').hidden = draft.how === 'note';
          form.querySelector('[name="summary"]').placeholder = word(draft.how === 'note' ? 'ph_case_note' : 'ph_log_what');
        } else {
          draft.dir = tile.dataset.dir;
          for (const x of form.querySelectorAll('[data-dir]')) x.setAttribute('aria-pressed', x === tile);
          form.querySelector('[name="direction"]').value = draft.dir;
        }
        return;
      }
      // Tapping When opens the date and time picker (a phone opens it itself).
      const whenBox = ev.target.closest('.kc-when');
      if (whenBox && ev.target.matches('input')) { try { ev.target.showPicker?.(); } catch {} return; }
      if (whenBox) { const f = whenBox.querySelector('input'); try { f.showPicker ? f.showPicker() : f.focus(); } catch { f.focus(); } return; }
      const caseBtn = ev.target.closest('[data-case-show], [data-case-look], [data-case-card-status], [data-case-card], tr[data-case-row]');
      if (caseBtn) {
        if (caseBtn.dataset.caseShow) { caseKit.escape(); setChoice('contacts', 'case-show', caseBtn.dataset.caseShow); return render(); }
        if (caseBtn.dataset.caseLook) { setChoice('contacts', 'case-look', caseBtn.dataset.caseLook); for (const other of caseBtn.parentElement.children) other.setAttribute('aria-pressed', String(other === caseBtn)); return render(); }
        if (caseBtn.dataset.caseRow) return ev.target.closest('a, button') ? undefined : go(`#/contacts/cases/${caseBtn.dataset.caseRow}`);
        caseBtn.closest('details')?.removeAttribute('open');
        const id = caseBtn.closest('li[data-id]').dataset.id;
        if (caseBtn.dataset.caseCardStatus) return changeCases([id], kase => statusPatch(kase, caseBtn.dataset.caseCardStatus), `Marked ${caseBtn.dataset.caseCardStatus}`);
        return caseBtn.dataset.caseCard === 'delete' ? changeCases([id], () => ({ deleted_at: now() }), 'Deleted') : changeCases([id], () => ({ archived_at: now() }), 'Archived');
      }
      const b = ev.target.closest('[data-act], [data-tab], [data-status], [data-rate]');
      if (!b) return;
      if (b.dataset.act === 'log-now') { const f = b.parentElement.querySelector('[name="at"]'); f.value = localValue(new Date()); if (!b.closest('.entry-edit')) f.dataset.live = '1'; drawWhen(f); return; }
      if (b.dataset.act === 'log-camera') return pickPending(true);
      if (b.dataset.act === 'log-attach') return pickPending();
      if (b.dataset.act === 'pending-x') { pending.splice(Number(b.dataset.n), 1); return drawPending(); }
      if (b.dataset.act === 'entry-edit') { editing = b.dataset.entry; return render(); }
      if (b.dataset.act === 'entry-cancel') { editing = null; return render(); }
      if (b.dataset.act === 'entry-save' || b.dataset.act === 'entry-delete') return entryDone(b.closest('.entry-edit'), b.dataset.act === 'entry-delete');
      if (b.dataset.tab) { go(b.dataset.tab === 'recent' ? '#/contacts' : `#/contacts/${b.dataset.tab}`); return; }
      b.closest('details.tool-menu')?.removeAttribute('open');
      const act = b.dataset.act;
      const c = state.tab === 'contact' ? byId(state.id) : null;
      const k = state.tab === 'cases' && state.id ? data.cases.find(x => x.id === state.id) : null;

      if (b.dataset.status || b.dataset.rate) {
        const id = b.closest('[data-research]').dataset.research;
        const cur = byId(id);
        if (b.dataset.status) await updateContact(id, { research_status: cur.research_status === b.dataset.status ? 'candidate' : b.dataset.status }, RESEARCH.find(r => r.id === b.dataset.status).label);
        else await updateContact(id, { rating: Number(b.dataset.rate) === cur.rating ? null : Number(b.dataset.rate) }, 'Rated');
        return;
      }
      if (act === 'capture') return capture();
      if (act === 'new-here' && state.tab === 'cases') return newCase();
      if (act === 'new-contact' || act === 'new-here') { const n = await createContact({ name: '' }); go(`#/contacts/c/${n.id}`); return; }
      if (act === 'new-category') { const cat = await newCategory(); if (cat) go(`#/contacts/directory/${cat.id}`); return; }
      if (act === 'new-case') return newCase();
      if (act === 'dir-home') return go('#/contacts/directory');
      if (act === 'cases-home') return go('#/contacts/cases');
      if (act === 'case-unfilter') { const view = caseView(); view.filters = {}; setChoice('contacts', 'case-table', JSON.stringify(view)); return render(); }
      if (act === 'back') { history.length > 1 ? history.back() : go('#/contacts'); return; }

      if (c) {
        if (act === 'pin-contact') return updateContact(c.id, { pinned: !c.pinned }, c.pinned ? 'Unpinned' : 'Pinned');
        if (act === 'status') {
          const stored = b.dataset.value === 'stored';
          return updateContact(c.id, { status: b.dataset.value }, stored ? 'Stored in your directory' : 'Back to transient');
        }
        if (act === 'toggle-cat') {
          const ids = c.category_ids || [];
          const next = ids.includes(b.dataset.cat) ? ids.filter(x => x !== b.dataset.cat) : [...ids, b.dataset.cat];
          return updateContact(c.id, { category_ids: next }, 'Categories saved');
        }
        if (act === 'new-category-here') { const cat = await newCategory(); if (cat) await updateContact(c.id, { category_ids: [...(c.category_ids || []), cat.id] }); return; }
        if (act === 'add-detail') return updateContact(c.id, { details: [...(c.details || []), { label: 'Phone', value: '' }] }, 'Added a detail');
        if (act === 'del-detail') { const n = Number(b.closest('[data-n]').dataset.n); return updateContact(c.id, { details: c.details.filter((_, i) => i !== n) }, 'Removed'); }
        if (act === 'log-contact') {
          const f = b.closest('.log-form');
          const taskId = f.querySelector('[name="task_id"]')?.value || null;
          const made = await logInteraction({ contact_id: c.id, how: f.querySelector('[name="how"]').value, direction: f.querySelector('[name="direction"]').value, summary: f.querySelector('[name="summary"]').value.trim(), task_id: taskId, at: atFrom(f.querySelector('[name="at"]')) });
          const files = await attachPending('interactions', made.id);
          // On a task too: a comment in words ("I called Sam: left a message").
          const how = made.how === 'call' ? 'called' : made.how === 'email' ? 'emailed' : made.how === 'text' ? 'texted' : made.how;
          const said = taskId && await store.create('comments', { task_id: taskId, at: made.at, body: `${HOW.find(h => h.id === made.how)?.icon || ''} ${made.direction === 'in' ? `${c.name || 'They'} ${how} me` : `I ${how} ${c.name || 'them'}`}${made.summary ? `: ${made.summary}` : ''}`.trim(), from_interaction_id: made.id });
          await render();
          undoable(said ? 'Logged, and on the task' : 'Logged', async () => { await store.remove('interactions', made.id); for (const a of files) await store.remove('attachments', a.id); if (said) await store.remove('comments', said.id); render(); });
          return;
        }
        if (act === 'contact-task') {
          const t = await addTask({ title: `Contact ${c.name || 'them'}`, contact_ids: [c.id] });
          toast('Task added', { action: 'Open', onAction: () => go('#/tasks/list') });
          return void t;
        }
        if (act === 'colour-contact') {
          const old = c.colour ?? null;
          colourMenu(b, tintId(c), async v => {
            await store.update('contacts', c.id, { colour: v });
            await render();
            undoable('Contact colour', async () => { await store.update('contacts', c.id, { colour: old }); await render(); });
          });
          return;
        }
        if (act === 'archive-contact' || act === 'delete-contact') {
          const field = act === 'delete-contact' ? 'deleted_at' : 'archived_at';
          await store.update('contacts', c.id, { [field]: new Date().toISOString() });
          go('#/contacts');
          undoable(act === 'delete-contact' ? 'Deleted' : 'Archived', async () => { await store.update('contacts', c.id, { [field]: null }); render(); });
          return;
        }
      }

      if (k) {
        const upd = async (fields, label = 'Saved') => {
          const old = Object.fromEntries(Object.keys(fields).map(x => [x, k[x] ?? null]));
          await store.update('cases', k.id, fields);
          await render();
          undoable(label, async () => { await store.update('cases', k.id, old); render(); });
        };
        if (act === 'case-status') return upd({ status: b.dataset.value, closed_at: b.dataset.value === 'closed' ? new Date().toISOString() : null }, CASE_STATUS.find(s => s.id === b.dataset.value).label);
        if (act === 'add-ref') factsEdit = true;
        if (act === 'add-ref') return upd({ references: [...(k.references || []), { label: 'Case no', value: '' }] }, 'Added a reference');
        if (act === 'del-ref') { const n = Number(b.closest('[data-ref]').dataset.ref); return upd({ references: k.references.filter((_, i) => i !== n) }, 'Removed'); }
        if (act === 'copy-ref') { await navigator.clipboard?.writeText(b.dataset.value); toast(`Copied ${b.dataset.value}`); return; }
        if (act === 'facts-edit' || act === 'facts-done') { factsEdit = act === 'facts-edit'; await render(); if (factsEdit) body.querySelector('.kase-edit input, .kase-edit select')?.focus(); return; }
        if (act === 'case-status-menu') {
          return pillMenu(b, CASE_STATUS.map(x => ({ value: x.id, label: `<i class="kase-dot" style="--st:${STATUS_COLOUR[x.id]}"></i>${x.label}${x.id === k.status ? ' ✓' : ''}`, current: x.id === k.status })),
            v => { if (v !== k.status) upd({ status: v, closed_at: v === 'closed' ? new Date().toISOString() : null }, CASE_STATUS.find(x => x.id === v).label); }, { className: 'list-menu kase-menu' });
        }
        if (act === 'case-unlink') return upd({ contact_ids: k.contact_ids.filter(x => x !== b.dataset.id) }, 'Removed from case');
        if (act === 'log-case') {
          const f = b.closest('.log-form');
          const how = f.querySelector('[name="how"]').value, summary = f.querySelector('[name="summary"]').value.trim(), at = atFrom(f.querySelector('[name="at"]'));
          if (how === 'note') {
            if (!summary && !pending.length) { toast('Write the note first'); f.querySelector('[name="summary"]').focus(); return; }
            const n = await store.create('case_notes', { case_id: k.id, at, body: summary });
            const files = await attachPending('case_notes', n.id);
            await store.update('cases', k.id, { status: k.status });
            await render();
            undoable('Note added', async () => { await store.remove('case_notes', n.id); for (const a of files) await store.remove('attachments', a.id); render(); });
            return;
          }
          const made = await logInteraction({ case_id: k.id, contact_id: k.contact_ids?.[0] || null, how, direction: f.querySelector('[name="direction"]').value, summary, at });
          const files = await attachPending('interactions', made.id);
          await store.update('cases', k.id, { status: k.status });
          await render();
          undoable('Logged', async () => { await store.remove('interactions', made.id); for (const a of files) await store.remove('attachments', a.id); render(); });
          return;
        }
        if (act === 'case-task') {
          const title = await askText('New task', { placeholder: word('ph_new_task'), ok: 'Add' });
          if (!title?.trim()) return;
          const t = await addTask({ title: title.trim(), case_id: k.id, contact_ids: k.contact_ids || [] });
          await render();
          undoable('Task added', async () => { await store.remove('tasks', t.id); render(); });
          return;
        }
        if (act === 'archive-case' || act === 'delete-case') {
          const field = act === 'delete-case' ? 'deleted_at' : 'archived_at';
          await store.update('cases', k.id, { [field]: new Date().toISOString() });
          go('#/contacts/cases');
          undoable(act === 'delete-case' ? 'Deleted case' : 'Archived case', async () => { await store.update('cases', k.id, { [field]: null }); render(); });
        }
      }
    });

    el.addEventListener('change', async ev => {
      const t = ev.target;
      if (t.dataset.category) {
        const cat = data.categories.find(k => k.id === t.dataset.category);
        if (!t.value.trim() || t.value.trim() === cat?.name) return;
        const old = cat.name;
        await store.update('contact_categories', cat.id, { name: t.value.trim() });
        undoable('Saved', async () => { await store.update('contact_categories', cat.id, { name: old }); render(); });
        return;
      }
      if (t.id === 'case-add-contact' && t.value) {
        const k = data.cases.find(x => x.id === state.id);
        await store.update('cases', k.id, { contact_ids: [...(k.contact_ids || []), t.value] });
        return render();
      }
      if (t.dataset.case && t.name) {
        const k = data.cases.find(x => x.id === t.dataset.case);
        const old = k?.[t.name] ?? '';
        // A case's title removed: put it back (deleting a case stays a deliberate act).
        if (t.name === 'title' && !t.value.trim() && old) { t.value = old; toast('A case needs a title, so it was put back'); return; }
        if (t.value.trim() === old) return;
        await store.update('cases', k.id, { [t.name]: t.value.trim() });
        data = await loadContacts();
        undoable('Saved', async () => { await store.update('cases', k.id, { [t.name]: old }); render(); });
        return;
      }
      const refRow = t.closest('[data-ref]');
      if (refRow) {
        const k = data.cases.find(x => x.id === state.id);
        const refs = structuredClone(k.references);
        refs[Number(refRow.dataset.ref)][t.name] = t.value.trim();
        const oldRefs = k.references;
        await store.update('cases', k.id, { references: refs });
        data = await loadContacts();
        undoable('Saved', async () => { await store.update('cases', k.id, { references: oldRefs }); render(); });
        return;
      }
      if (t.dataset.edit && t.name) return updateContact(t.dataset.edit, { [t.name]: t.value.trim() });
      const row = t.closest('[data-n]');
      if (row && state.tab === 'contact') {
        const c = byId(state.id);
        const details = structuredClone(c.details);
        details[Number(row.dataset.n)][t.name] = t.value.trim();
        await updateContact(c.id, { details }, 'Saved');
      }
    });

    this.stopEditing = () => { editing = null; pending = []; factsEdit = false; };
    await render();
  },

  async route([tab, id]) {
    if (tab === 'c' && id) {
      Object.assign(this.state, { tab: 'contact', id });
      // Opening a contact counts as looking it up.
      const c = await store.get('contacts', id);
      if (c) {
        const fields = { looked_up_at: [new Date().toISOString(), ...(c.looked_up_at || [])].slice(0, 20) };
        const notes = withCapturedText(c.notes || '', c.body || '');
        if (notes !== (c.notes || '')) fields.notes = notes;
        await store.update('contacts', id, fields);
      }
    } else {
      Object.assign(this.state, { tab: ['directory', 'cases'].includes(tab) ? tab : 'recent', id: id || null });
    }
    this.stopEditing?.();
    return this.render();
  },

  unmount() {
    clearInterval(this.clock);
    this.kit?.destroy();
    this.dirKit?.destroy();
    this.caseKit?.destroy();
    this.caseTable?.close();
    this.gone?.abort();
    this.topWatch?.disconnect();
    removeEventListener('keydown', this.onKey);
  },

  quickAdd() {
    location.hash = '#/contacts';
    setTimeout(() => document.querySelector('#c-new')?.focus(), 50);
  },
};
