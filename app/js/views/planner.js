// Day Planner: a day's battle plan on lined paper. #/planner/<YYYY-MM-DD>
// Title, Day Focus, energy; half-hourly lines (settings) with anything at an
// odd time slotted in as its own line; evening below; a pile for things not
// yet given a time (fed by the dump box); notes. Calendar popup for any date.

import { spacingHtml, lookHtml } from '../viewcog.js';
import * as store from '../store.js';
import {
  daySettings, ENERGY, PAPERS, durationChoices, durationLabel, isoDate, parseDate, addDays, toMin, fromMin, showTime, parseTimed,
  getDay, saveDay, itemsFor, addItem, unfinishedBefore, datesWithContent, DAY_DEFAULTS,
} from '../days.js';
import { listEntry, listHint } from '../listentry.js';
import { toast, undoable } from '../toast.js';
import { richText, toHtml, previewLine, inlineAll } from '../richtext.js';
import { keepDraft, draftCleared } from '../drafts.js';
import { autosizeAll } from '../inline.js';
import { summarise } from '../summary.js';
import { loadAll as loadTasks, forDay, suggestions, doneFields, aimDate, addTask, horizonOf, planDay } from '../tasks.js';
import * as att from '../attachments.js';
import { editPills, selectPill, energyPill } from '../editpills.js';
import { energyMenu } from '../pillmenu.js';
import { byRank, rankOf, reorderWrites, lastKey } from '../order.js';
import { askYes, askEmptied } from '../ask.js';
import { word } from '../words.js';
import { commentsHtml, mountComments, moveComments, closingComment } from '../comments.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default {
  async mount(el) {
    // Page-wide listeners are all tied to this signal and removed in unmount(),
    // so redrawing the page (after a sync, a words change) doesn't pile them up.
    this.gone?.abort();
    const gone = this.gone = new AbortController();
    const page = { signal: gone.signal };
    const pageCapture = { capture: true, signal: gone.signal };
    let date = isoDate();
    let settings = await daySettings();
    let items = [];
    let day = null;
    let editing = null; // item id whose details are open
    let calMonth = null;

    el.innerHTML = `<div class="planner" data-paper="notebook">
      <div class="day-nav">
        <button type="button" data-act="prev" class="day-step" aria-label="Previous day"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg></button>
        <button type="button" data-act="calendar" class="cal-icon" aria-label="Pick a date" title="Pick a date"><svg class="icon" aria-hidden="true"><use href="#i-calendar"/></svg></button>
        <button type="button" data-act="today">Today</button>
        <button type="button" data-act="next" class="day-step" aria-label="Next day"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button>
        <details class="tool-menu share-menu">
          <summary class="share-btn" role="button"><svg class="icon" aria-hidden="true"><use href="#i-share"/></svg> Share</summary>
          <div class="menu">
            <button type="button" disabled title="Coming later: share and merge your day with someone">Link day plan with another person</button>
            <hr>
            <button type="button" data-share="plain">Copy to clipboard – plain text</button>
            <button type="button" data-share="rich">Copy to clipboard – rich text</button>
            <button type="button" data-share="whatsapp">Copy to clipboard – WhatsApp</button>
          </div>
        </details>
      </div>
      <header class="day-head">
        <h1 class="day-title"><span class="weekday"></span> <span class="date"></span></h1>
        <p class="day-rel muted"></p>
        <div class="down-day" hidden></div>
        <div class="focus-row">
        <label class="focus"><span class="hand-label">${esc(word('day_focus'))}</span><input id="focus" placeholder="${esc(word('day_focus_prompt'))}" autocomplete="off"></label>
        <div class="energy" role="group" aria-label="Today's energy level"><span class="hand-label energy-label">${esc(word('day_energy'))}</span>
          <button type="button" class="energy-level bolts" data-act="energy-edit" hidden></button>
          <input id="energy-note" placeholder="${esc(word('day_energy_prompt'))}" autocomplete="off" aria-label="How you feel today">
          <div class="energy-choose" role="group" aria-label="Energy level">
            ${ENERGY.map(e => `<button type="button" class="bolts" data-energy="${e.id}" title="${esc(`${e.label}: ${e.hint}`)}" aria-label="${e.label}">${e.bolts}</button>`).join('')}
            <button type="button" data-energy="none" title="No energy level" aria-label="No energy level">✕</button>
          </div>
          <details class="tool-menu view-menu">
            <summary class="icon-btn" aria-label="View settings for this day" title="View settings for this day"><svg class="icon" aria-hidden="true"><use href="#i-view"/></svg></summary>
            <div class="menu view-settings"></div>
          </details>
        </div>
        </div>
      </header>
      <div class="carry" hidden></div>
      <h2 class="schedule-title section-title">${esc(word('day_schedule'))}</h2>
      <section class="paper" aria-label="Plan"><div id="lines"></div></section>
      <div class="day-bottom">
        <section class="pile">
          <h2>${esc(word('day_tasks'))} <span class="task-count" hidden></span><button type="button" class="bring-link" data-act="bring-in" title="Claim tasks from the Tasks page for this day"><span class="bring-arrow" aria-hidden="true">↓</span> Bring in from tasks</button></h2>
          <div class="pile-paper">
            <ul id="pile" class="pile-list"></ul>
            <div class="line pile-new"><span class="margin"></span><span class="content"><input id="dump" class="new-task hand no-inline" placeholder="New task" autocomplete="off" enterkeyhint="done" aria-label="New task"><textarea id="dump-note" class="add-note no-inline" rows="1" placeholder="Add note" aria-label="Note"></textarea><div class="new-pills"></div></span></div>
            <ul id="pile-done" class="pile-list pile-done"></ul>
            <div id="pile-blank" aria-hidden="true"></div>
          </div>
          <p class="muted hint">${esc(word('ph_day_tasks'))}</p>
        </section>
        <section class="day-notes">
          <h2>${esc(word('day_notes'))}</h2>
          <div id="notes"></div>
        </section>
      </div>
      <footer class="day-housekeeping">
        <span class="hk-title">Housekeeping:</span>
        <button type="button" class="hk-link" data-act="paper-week">reset this week to this page's paper</button>
        <span class="hk-sep" aria-hidden="true">·</span>
        <button type="button" class="hk-link" data-act="paper-all">reset all pages to today's paper</button>
        <span class="hk-sep" aria-hidden="true">·</span>
        <button type="button" class="hk-link danger" data-act="clear-day">clear this day…</button>
        <p class="muted hint">${esc(word('ph_day_view'))}</p>
      </footer>
      </div>
      <dialog class="sheet cal-sheet" id="cal" aria-label="Pick a date"></dialog>
      <dialog class="sheet review-sheet" id="review" aria-label="Unfinished from earlier days"></dialog>
      <dialog class="sheet review-sheet bring-sheet" id="bring" aria-label="Bring in from tasks"></dialog>`;

    const $ = s => el.querySelector(s);
    const linesEl = $('#lines');
    $('#pile-blank').addEventListener('click', () => $('#dump').focus());
    // The New task line's note: Ctrl+Enter adds the task, as Enter does on the title.
    $('#dump-note').addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); $('#dump').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
    });
    $('#dump-note').addEventListener('input', ev => { ev.target.style.height = 'auto'; ev.target.style.height = `${ev.target.scrollHeight}px`; });

    // Shift+Enter in an item's title: save the title, then type its notes.
    el.addEventListener('keydown', async ev => {
      const t = ev.target;
      if (ev.key === 'Enter' && ev.shiftKey && t.classList?.contains('item-title')) {
        ev.preventDefault();
        const id = t.closest('[data-item]').dataset.item;
        const it = items.find(i => i.id === id);
        const title = t.value.trim();
        noteEditing = id;
        if (title && title !== it.title) {
          await store.update('day_items', id, { title });
          undoable('Saved', async () => { await store.update('day_items', id, { title: it.title }); await refresh(); });
        }
        await refresh();
        el.querySelector(`[data-note-for="${id}"]`)?._editor?.focus();
        return;
      }
      const box = t.closest?.('[data-note-for]');
      if (box) {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); t.blur(); }
        if (ev.key === 'Escape') {
          ev.preventDefault();
          ev.stopPropagation();
          box.dataset.cancel = '1';
          t.blur();
        }
      }
    });
    // The ⋯ panel closes when you click anywhere outside it (or its row), press
    // Esc, or use Close. Whatever you were typing in it is saved first.
    function closeDetails() {
      if (!editing) return;
      const panel = el.querySelector(`.item-details[data-for="${editing}"]`);
      if (panel?.contains(document.activeElement)) document.activeElement.blur();
      editing = null;
      // Its note is saved here too, in case the blur didn't get there first.
      const box = panel?.querySelector('[data-note-for]');
      setTimeout(() => (box?._editor ? leaveNoteBox(box) : refresh()));
    }
    // The day's Energy: clicking the line (or its ⚡) opens the ⚡ pills under
    // it and you can type a few words too; clicking elsewhere, Tab away or
    // Enter / Esc puts the pills away.
    const energyBox = () => el.querySelector('.focus-row .energy');
    function openEnergy() {
      energyBox().classList.add('editing');
      $('.energy-choose').style.left = `${$('#energy-note').offsetLeft}px`;
      if (document.activeElement !== $('#energy-note')) $('#energy-note').focus();
    }
    const closeEnergy = () => energyBox()?.classList.remove('editing');
    el.addEventListener('focusin', ev => { if (ev.target.id === 'energy-note') openEnergy(); });
    el.addEventListener('focusout', ev => {
      if (ev.target.id === 'energy-note' && ev.relatedTarget && !energyBox().contains(ev.relatedTarget)) closeEnergy();
    });
    el.addEventListener('keydown', ev => { if (ev.target.id === 'energy-note' && (ev.key === 'Enter' || ev.key === 'Escape')) closeEnergy(); });
    // Pressing a ⚡ keeps the cursor in the words.
    el.addEventListener('mousedown', ev => { if (ev.target.closest('.energy-choose button, .energy-level')) ev.preventDefault(); });
    document.addEventListener('pointerdown', ev => {
      const box = el.isConnected ? energyBox() : null;
      if (box?.classList.contains('editing') && !box.contains(ev.target)) closeEnergy();
    }, pageCapture);
    document.addEventListener('pointerdown', ev => {
      if (!editing || !el.isConnected) return;
      const t = ev.target;
      if (t.closest(`.item-details[data-for="${editing}"], [data-item="${editing}"], dialog, .toast, #toasts, .pill-menu`)) return;
      closeDetails();
    }, pageCapture);
    el.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape' || !editing || ev.defaultPrevented) return;
      ev.preventDefault();
      closeDetails();
    });

    // An item's notes save when you click away from its notes box (or Esc
    // cancels). Clicks on the box's own toolbar don't count as leaving.
    el.addEventListener('focusout', async ev => {
      const box = ev.target.closest?.('[data-note-for]');
      if (!box || box.contains(ev.relatedTarget) || !box._editor) return;
      const id = box.dataset.noteFor;
      const staying = ev.relatedTarget?.closest?.(`.item-details[data-for="${id}"], [data-item="${id}"]`);
      await leaveNoteBox(box, { redraw: !staying });
    });
    // Buttons in the panel keep the note focused while pressed, and the note
    // is saved (quietly, without redrawing) before the button does its thing,
    // so e.g. Close both saves and closes.
    el.addEventListener('mousedown', ev => {
      if (ev.target.closest('.item-details button') && !ev.target.closest('.rich')) ev.preventDefault();
    });
    async function flushNote(scope) {
      const box = scope?.querySelector('.detail-notes[data-note-for]');
      if (box?._editor) await leaveNoteBox(box, { redraw: false });
    }
    async function leaveNoteBox(box, { redraw = true } = {}) {
      const id = box.dataset.noteFor;
      const it = items.find(i => i.id === id);
      if (!it) return;
      const text = box._editor.value.replace(/\s+$/, '');
      const cancelled = box.dataset.cancel === '1';
      if (!redraw && !cancelled) {
        if (text !== (it.notes || '')) {
          const old = it.notes || '';
          await store.update('day_items', id, { notes: text });
          it.notes = text;
          undoable(text ? 'Note saved' : 'Note removed', async () => { await store.update('day_items', id, { notes: old }); await refresh(); });
        }
        return;
      }
      box._editor = null;
      if (box.classList.contains('note-edit')) noteEditing = null;
      if (!cancelled && text !== (it.notes || '')) {
        await change(id, { notes: text }, text ? 'Note saved' : 'Note removed');
      } else {
        await refresh();
        if (cancelled && text !== (it.notes || '')) {
          toast('Escape cancelled change', { action: 'Undo', onAction: () => change(id, { notes: text }, 'Note saved') });
        }
      }
    }

    // Notes save as you type (debounced); the date is captured so a quick
    // day change can't write one day's notes into another.
    let notesTimer;
    let notesDate = null; // the day whose notes the editor shows
    let notesPending = null; // { forDate, md } not saved yet
    const flushDayNotes = async () => {
      clearTimeout(notesTimer);
      const p = notesPending;
      notesPending = null;
      if (p) { const saved = await saveDay(p.forDate, { notes: p.md }); if (p.forDate === date) day = saved; }
    };
    const notes = richText($('#notes'), {
      placeholder: word('ph_day_notes'),
      origin: () => ({ collection: 'days', id: date, title: `Notes for ${date}`, field: 'notes' }),
      onChange: md => {
        clearTimeout(notesTimer);
        notesPending = { forDate: date, md };
        notesTimer = setTimeout(flushDayNotes, 600);
      },
    });
    const planner = $('.planner');

    // A wide screen: when the plan would be over 1000px wide, Tasks and Notes
    // dock in a column to its right (a little slack so it doesn't flip back
    // and forth at the edge).
    this.dockWatch?.disconnect();
    this.dockWatch = new ResizeObserver(() => {
      const w = planner.offsetWidth;
      if (w > 1000) planner.classList.add('docked');
      else if (w < 960) planner.classList.remove('docked');
    });
    this.dockWatch.observe(planner);
    // When Energy sits under Day focus (a narrow screen), the two labels end
    // at the same place and what's written after them starts at the same place:
    // the shorter label is pushed right by the difference (the words can be
    // changed in the Dictionary, so it's measured, not fixed).
    const alignHeads = () => {
      const fl = $('.focus .hand-label');
      const en = $('.energy .energy-label');
      if (!fl || !en) return;
      fl.style.marginLeft = en.style.marginLeft = '';
      // Side by side only while both texts fit; otherwise Energy goes under Day focus.
      const row = $('.focus-row');
      row.classList.remove('stacked');
      if (!planner.classList.contains('docked')) {
        const cut = i => i.scrollWidth > i.clientWidth + 1;
        const sideBySide = en.getBoundingClientRect().top <= fl.getBoundingClientRect().top + 4;
        if (sideBySide && (cut($('#focus')) || cut($('#energy-note')))) row.classList.add('stacked');
      }
      if (en.getBoundingClientRect().top <= fl.getBoundingClientRect().top + 4) return; // side by side
      const d = fl.getBoundingClientRect().width - en.getBoundingClientRect().width;
      if (d) (d > 0 ? en : fl).style.marginLeft = `${Math.abs(d)}px`;
    };
    this.headWatch?.disconnect();
    this.headWatch = new ResizeObserver(() => alignHeads());
    this.headWatch.observe($('.focus-row'));
    for (const i of [$('#focus'), $('#energy-note')]) i.addEventListener('input', alignHeads);
    document.fonts?.ready.then(alignHeads);
    let fmt = showTime; // 8.30, or 08:30 on techie paper

    function applyPaper() {
      const paper = day.paper || settings.paper_style;
      planner.dataset.paper = paper;
      fmt = paper === 'techie' ? t => t : showTime;
      planner.classList.toggle('tasks-first', day.layout === 'tasks-first');
      paintViewMenu();
    }

    // 👁 View settings for this day: paper, timeslots, layout. Each choice is
    // saved on the day; "default" follows Settings.
    const slotMin = () => Math.max(5, Number(day?.slot_min) || Number(settings.slot_min) || 60);
    function paintViewMenu() {
      const m = $('.view-settings');
      if (!m) return;
      const today = date === isoDate() ? "Today's" : "This day's";
      const opt = (attr, value, label, on) => `<button type="button" ${attr}="${value}" aria-pressed="${on}">${label}</button>`;
      // Each paper's pill looks like that paper.
      const paperPill = (value, label, look, on) => `<button type="button" class="paper-pill" data-look="${look}" data-view-paper="${value}" aria-pressed="${on}">${label}</button>`;
      const defSlot = Number(settings.slot_min) || 60;
      const slotLabel = n => ({ 15: '¼ hour', 30: '½ hour', 60: 'Hourly' }[n] || `${n} min`);
      m.innerHTML = `
        <h4>${today} paper</h4>
        <div class="view-opts">
          ${PAPERS.map(p => (p.id === settings.paper_style
            ? paperPill('', `${p.label} (default)`, p.id, !day.paper || day.paper === p.id) // each paper once; the default follows Settings
            : paperPill(p.id, p.label, p.id, day.paper === p.id))).join('')}
        </div>
        <h4>${today} timeslots</h4>
        <div class="view-opts">
          ${[15, 30, 60].map(n => opt('data-view-slot', n, `${slotLabel(n)}${n === defSlot ? ' (default)' : ''}`, slotMin() === n)).join('')}
        </div>
        <h4>Layout</h4>
        <div class="view-opts">
          ${opt('data-view-layout', 'plan-first', 'Timed plan first', day.layout !== 'tasks-first')}
          ${opt('data-view-layout', 'tasks-first', 'Tasks &amp; notes first', day.layout === 'tasks-first')}
        </div>
        ${lookHtml('planner')}${spacingHtml('planner')}`;
    }
    $('.view-menu').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-view-paper], [data-view-slot], [data-view-layout]');
      if (!b) return;
      const old = { paper: day.paper ?? null, slot_min: day.slot_min ?? null, layout: day.layout ?? null };
      let fields;
      if (b.dataset.viewPaper !== undefined) fields = { paper: b.dataset.viewPaper || null };
      else if (b.dataset.viewSlot) fields = { slot_min: Number(b.dataset.viewSlot) === (Number(settings.slot_min) || 60) ? null : Number(b.dataset.viewSlot) };
      else fields = { layout: b.dataset.viewLayout === 'tasks-first' ? 'tasks-first' : null };
      day = await saveDay(date, fields);
      applyPaper();
      renderLines();
      renderPile();
      undoable('View changed for this day', async () => { day = await saveDay(date, old); applyPaper(); renderLines(); renderPile(); });
    });

    // ---------- rendering ----------

    function header() {
      const d = parseDate(date);
      $('.weekday').textContent = WEEKDAYS[d.getDay()];
      $('.date').textContent = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      const diff = Math.round((d - parseDate(isoDate())) / 86400000);
      $('.day-rel').textContent = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
        : diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
      const down = settings.hint_down_day && settings.down_days.includes(d.getDay());
      $('.down-day').hidden = !down;
      $('.down-day').textContent = down
        ? `${WEEKDAYS[d.getDay()]} is a down day. Pick one or two things; rest counts as part of the plan.` : '';
      $('#focus').value = day.focus || '';
      for (const b of el.querySelectorAll('[data-energy]')) b.setAttribute('aria-pressed', b.dataset.energy === day.energy);
      const lvl = ENERGY.find(e => e.id === day.energy);
      const lvlBtn = $('.energy-level');
      lvlBtn.hidden = !lvl;
      lvlBtn.textContent = lvl?.bolts || '';
      lvlBtn.title = lvl ? `${lvl.label}: ${lvl.hint}. Click to change` : '';
      $('.energy').classList.toggle('has-level', !!lvl);
      if (document.activeElement !== $('#energy-note')) $('#energy-note').value = day.energy_note || '';
      alignHeads();
      // Never replace the note you're writing in (that put the cursor back at the start
      // and could show older text); only when the day shown changes or you're not in it.
      if (notesDate !== date || !$('#notes').contains(document.activeElement)) notes.setValue(day.notes || '');
      notesDate = date;
      el.classList.toggle('is-down-day', down);
    }

    function itemRow(i, label) {
      const span = i.end_time ? `${fmt(i.time)}–${fmt(i.end_time)}` : null;
      return `
        <div class="line has-item${i.done_at ? ' done' : ''}${i.dropped_at ? ' dropped' : ''}${selected.has(i.id) ? ' selected' : ''}${i._mark ? ` ${i._mark}` : ''}${i.time && (i.end_time || i.estimate_min) ? ' spans' : ''}" data-item="${i.id}"${i.time ? ` data-time="${i.time}"` : ''}>
          <span class="margin">${i.time && label ? `<input class="margin-time" value="${label}" data-time-for="${i.id}" aria-label="Start time" inputmode="decimal" autocomplete="off">` : label ?? ''}</span>
          <span class="content">
            <button type="button" class="drag-grip" aria-label="Drag to a time" title="Drag onto a time">⠿</button>
            <input type="checkbox" class="tick" aria-label="Done" ${i.done_at ? 'checked' : ''}>
            <textarea class="item-title one-line hand" rows="1" aria-label="Item" spellcheck="false">${esc(i.title)}</textarea>
            ${span ? `<span class="span-tag">${span}</span>` : i.estimate_min ? `<span class="span-tag">~${durationLabel(Number(i.estimate_min))}</span>` : ''}
            ${i.energy ? `<button type="button" class="span-tag bolts" data-act="energy-pill" title="Energy: ${esc(ENERGY.find(e => e.id === i.energy)?.label || '')}. Click to change" aria-haspopup="menu">${ENERGY.find(e => e.id === i.energy)?.bolts || ''}</button>` : ''}
            ${noteTag(i)}
            <button type="button" class="more" data-act="details" aria-label="Details" aria-expanded="${editing === i.id}">⋯</button>
            ${noteEditing === i.id
              ? `<div class="note-edit" data-note-for="${i.id}"></div>`
              : subLine(i)}
          </span>
          ${i.time ? '<span class="resize-grip" title="Drag down to set how long" aria-hidden="true"></span>' : ''}
        </div>
        ${editing === i.id ? details(i) : ''}`;
    }

    // Under the title: status pills, then the note. A pill says what the item
    // is; hovering shows what clicking it does (e.g. "let go" → "take back?").
    const PILLS = [
      { when: i => i.dropped_at, label: 'let go', hover: 'take back?', act: 'take-back' },
      { when: i => i.estimate_unsure && !i.estimate_min && !i.end_time, label: 'estimate?', hover: 'set it?', act: 'details' },
    ];
    function subLine(i) {
      const pills = PILLS.filter(p => p.when(i)).map(p => `<button type="button" class="pill-act" data-act="${p.act}" title="${esc(p.hover)}"><span class="pill-now">${esc(p.label)}</span><span class="pill-hover">${esc(p.hover)}</span></button>`).join('');
      const note = i.notes && editing !== i.id ? noteHtml(i) : ''; // the open panel already shows the whole note
      return pills || note ? `<div class="item-sub">${pills}${note}</div>` : '';
    }

    // Notes under items: clicking one opens the item's panel.
    let noteEditing = null; // item whose notes are being typed (Shift+Enter)
    // Like Tasks, by the page's spacing (CSS): tight = no note here, just 📝 on
    // the item's line; medium = one line; loose = up to three lines.
    function noteHtml(i) {
      const { html } = previewLine(i.notes);
      if (!html) return '';
      return `<div class="item-note plan-note" data-act="toggle-note" role="button" tabindex="0" aria-expanded="${editing === i.id}" title="${editing === i.id ? 'Close' : 'Open to read or edit'}">${inlineAll(i.notes)}</div>`;
    }
    const noteTag = i => ((i.notes || '').trim() && editing !== i.id
      ? `<button type="button" class="span-tag note-tag" data-act="toggle-note" title="${esc(i.notes.split('\n').map(l => l.trim()).find(Boolean)?.slice(0, 120) || 'Note')}">📝</button>` : '');

    // Mount the notes editor wherever a row or details panel asked for one.
    function mountNoteEditors() {
      for (const box of el.querySelectorAll('[data-note-for]')) {
        if (box._editor) continue;
        const it = items.find(i => i.id === box.dataset.noteFor);
        if (!it) continue;
        box._editor = richText(box, { value: it.notes || '', origin: () => ({ collection: 'day_items', id: it.id, title: it.title, field: 'notes' }) });
      }
      mountComments(el, refresh);
    }

    function details(i) {
      return `
        <div class="item-details" data-for="${i.id}">
          <label>Time<input type="time" name="time" value="${i.time || ''}"></label>
          <label>Until<input type="time" name="end_time" value="${i.end_time || ''}"></label>
          <label>Estimated time<select name="estimate_min">
            <option value="" ${!i.estimate_min && !i.estimate_unsure ? 'selected' : ''}>Not estimated</option>
            <option value="unsure" ${i.estimate_unsure && !i.estimate_min ? 'selected' : ''}>Not sure yet</option>
            ${[...new Set([...durationChoices(settings.duration_max_min), ...(i.estimate_min ? [Number(i.estimate_min)] : [])])].sort((a, b) => a - b)
              .map(m => `<option value="${m}" ${Number(i.estimate_min) === m ? 'selected' : ''}>${durationLabel(m)}</option>`).join('')}
          </select></label>
          <label>Move to another day<input type="date" name="date" value="${i.date}"></label>
          <div class="energy-pick wide" role="group" aria-label="Energy"><span>Energy</span>
            ${ENERGY.map(e => `<button type="button" class="bolts" data-item-energy="${e.id}" aria-pressed="${i.energy === e.id}" title="${esc(`${e.label}: ${e.hint}`)}" aria-label="${e.label}">${e.bolts}</button>`).join('')}
          </div>
          <div class="wide detail-note"><span class="field-label">Note</span><div class="detail-notes" data-note-for="${i.id}"></div></div>
          <div class="wide">${att.rowHtml(atts.get(i.id))}</div>
          <div class="wide">${commentsHtml(i.task_id ? { task_id: i.task_id } : { item_id: i.id })}</div>
          <div class="detail-actions">
            <button type="button" class="close-details" data-act="close-details" title="Close (or click anywhere outside, or Esc)">Close</button>
            ${i.time ? '<button type="button" data-act="unschedule" title="Remove the start and end time and put it back in To place">Unallocate time</button>' : ''}
            ${i.dropped_at
              ? '<button type="button" data-act="take-back" title="It needs doing after all">Take back</button>'
              : i.done_at ? '' : '<button type="button" data-act="let-go" title="Didn\'t do it and it doesn\'t need doing any more">Let go</button>'}
            <button type="button" data-act="to-task" title="Take it off this day and keep it as a task">→ Tasks</button>
            <button type="button" data-act="archive-item" title="Take it off this day into the Archive">Archive</button>
            <button type="button" class="danger" data-act="delete">Delete</button>
          </div>
        </div>`;
    }

    function emptyRow(time, label, cls = '', takenBy = '') {
      return takenBy
        ? `<div class="line blank covered ${cls}" data-time="${time}" title="Taken by ${esc(takenBy)}"><span class="margin">${label}</span><span class="content"></span></div>`
        : `<div class="line blank ${cls}" data-time="${time}"><span class="margin">${label}</span><span class="content" data-act="add-at"></span></div>`;
    }

    // `list` lets a drag or resize draw how the day would look before it's saved.
    // Look → Alternate shading (👁): every other line of the ruled paper is
    // marked, counting down the page whatever group a line sits in (CSS shades it).
    function markAlt(root) {
      [...root.querySelectorAll('.line')].forEach((l, n) => l.classList.toggle('alt-row', n % 2 === 1));
    }

    function renderLines(list = items) {
      const start = toMin(settings.day_start);
      const end = toMin(settings.day_end);
      const step = slotMin();
      const timed = list.filter(i => i.time && (!lifted.has(i.id) || i._mark === 'preview'));
      const at = t => toMin(t);
      // Rows first ({ html, item?, coveredBy? }), then an item and the slot
      // lines it covers are grouped into one block (see below).
      const rows = [];
      const itemEntry = (i, label) => rows.push({ html: itemRow(i, label), item: i });

      // Before the day starts
      timed.filter(i => at(i.time) < start).forEach(i => itemEntry(i, fmt(i.time)));

      // Covered = inside another item's time
      const spans = timed.map(i => [at(i.time), i.end_time ? at(i.end_time) : i.estimate_min ? at(i.time) + i.estimate_min : at(i.time), i]);
      const coveredBy = t => spans.find(([a, b]) => t > a && t < b)?.[2];

      for (let t = start; t <= end; t += step) {
        const here = timed.filter(i => at(i.time) >= t && at(i.time) < t + step && at(i.time) <= end + step - 1);
        const onLine = here.filter(i => at(i.time) === t);
        const between = here.filter(i => at(i.time) !== t);
        const label = fmt(fromMin(t));
        if (onLine.length) onLine.forEach((i, n) => itemEntry(i, n ? '' : label));
        else {
          const by = coveredBy(t);
          rows.push({ html: emptyRow(fromMin(t), label, by?._mark || '', by ? by.title : ''), coveredBy: by });
        }
        between.forEach(i => itemEntry(i, fmt(i.time)));
      }

      // An item that runs over later slot lines becomes one block: the lines
      // keep their times in the margin, and the item sits across them all,
      // text centred, with a bar down the side.
      const out = [];
      for (let n = 0; n < rows.length; n++) {
        const r = rows[n];
        if (!r.item || editing === r.item.id || noteEditing === r.item.id) { out.push(r.html); continue; }
        let k = n + 1;
        while (k < rows.length && rows[k].coveredBy && rows[k].coveredBy.id === r.item.id) k++;
        if (k === n + 1) { out.push(r.html); continue; }
        out.push(`<div class="span-block${r.item._mark ? ` ${r.item._mark}` : ''}" style="--lines:${k - n}">${rows.slice(n, k).map(x => x.html).join('')}</div>`);
        n = k - 1;
      }

      // Evening: anything after the last line's slot. It can be switched off
      // in Settings, but items already there still show.
      const evening = timed.filter(i => at(i.time) >= end + step);
      if (settings.show_evening || evening.length) {
        out.push(`<div class="line section-label"><span class="margin"></span><span class="content">${esc(settings.evening_label || DAY_DEFAULTS.evening_label)}</span></div>`);
        out.push(...evening.map(i => itemRow(i, fmt(i.time))));
        if (settings.show_evening) out.push(`<div class="line blank" data-time="evening"><span class="margin"></span><span class="content" data-act="add-at"></span></div>`);
      }
      linesEl.innerHTML = out.join('');
      mountNoteEditors();
      autosizeAll(linesEl); // long titles wrap onto more lines…
      fitSpanBlocks();
      markAlt(linesEl);
      placeNowMarker(); // …so the ▶ is measured after that
    }

    // ▶ in the margin at the current time: between the line for the current
    // slot and the next line, in proportion to how far through it we are.
    const nowMarker = document.createElement('span');
    nowMarker.className = 'now-marker';
    nowMarker.setAttribute('aria-hidden', 'true');
    nowMarker.textContent = '▶';
    // Wrapped text changes height when the handwriting font arrives or the
    // window changes width: fit again, then put the ▶ back in place.
    const refit = () => { if (!linesEl.isConnected) return; autosizeAll(linesEl); fitSpanBlocks(); placeNowMarker(); };
    document.fonts?.ready.then(refit);
    this.onRefit = () => { clearTimeout(this.refitTimer); this.refitTimer = setTimeout(refit, 150); };
    addEventListener('resize', this.onRefit, page);
    // A block over several lines grows as its title grows while you type, and
    // when the pills open under it, so nothing spills over the lines around it.
    let refitFrame = 0;
    const refitSoon = () => { cancelAnimationFrame(refitFrame); refitFrame = requestAnimationFrame(() => { if (linesEl.isConnected) { fitSpanBlocks(); placeNowMarker(); } }); };
    linesEl.addEventListener('input', ev => { if (ev.target.closest?.('.span-block')) refitSoon(); });
    new MutationObserver(muts => {
      if (muts.some(m => m.target.closest?.('.span-block') && [...m.addedNodes, ...m.removedNodes].some(n => n.classList?.contains('edit-pills')))) refitSoon();
    }).observe(linesEl, { childList: true, subtree: true });

    // A block over several lines whose text needs more room than those lines
    // give it grows: its last line gets taller.
    function fitSpanBlocks() {
      for (const block of linesEl.querySelectorAll('.span-block')) {
        const content = block.querySelector(':scope > .line.has-item > .content');
        const last = block.lastElementChild;
        if (!content || !last) continue;
        last.style.minHeight = '';
        // The text is centred, so it spills both ways: measure it at its own height.
        content.style.bottom = 'auto';
        const natural = content.offsetHeight;
        content.style.bottom = '';
        const short = natural + 8 - block.offsetHeight;
        if (short > 0) last.style.minHeight = `${last.offsetHeight + short}px`;
      }
    }

    function placeNowMarker() {
      const paper = $('.paper');
      if (!paper) return;
      if (!nowMarker.isConnected) paper.append(nowMarker);
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const lines = [...linesEl.querySelectorAll('.line[data-time]')].filter(l => l.dataset.time !== 'evening');
      let show = settings.show_now_marker && date === isoDate() && lines.length;
      let top = 0;
      if (show) {
        const at = lines.map(l => ({ l, t: toMin(l.dataset.time) }));
        const i = at.findLastIndex(x => x.t <= mins);
        const next = at.slice(i + 1).find(x => x.t > (at[i]?.t ?? -1));
        const endOfDay = toMin(settings.day_end) + step();
        if (i < 0 || mins >= endOfDay) show = false;
        else {
          // Each line is its time slot: the 15.00 line runs from 15:00 at its
          // top edge to 16:00 at the next line's top, so 15:45 is three
          // quarters of the way down it. (Lines can be taller than others.)
          const base = paper.getBoundingClientRect().top;
          const topOf = el2 => el2.getBoundingClientRect().top;
          const here = topOf(at[i].l);
          const there = next ? topOf(next.l) : here + at[i].l.getBoundingClientRect().height;
          const span = (next ? next.t : endOfDay) - at[i].t;
          top = here - base + (there - here) * Math.min(1, (mins - at[i].t) / span);
        }
      }
      nowMarker.hidden = !show;
      nowMarker.style.top = `${top}px`;
      nowMarker.title = `Now: ${fmt(fromMin(Math.floor(mins)))}`;
    }
    this.nowTimer = setInterval(placeNowMarker, 30000);

    // Tasks: the untimed items, in order, on lined paper; done ones fold
    // away under "Done (n)". While dragging over the list, a gap opens where
    // the item would land and the others shuffle round it.
    let doneOpen = false;
    const pileOrder = byRank(); // order.js: merges cleanly across devices
    function renderPile(gapAt = null) {
      const all = items.filter(i => !i.time);
      const todo = all.filter(i => !i.done_at && !lifted.has(i.id)).sort(pileOrder);
      const done = all.filter(i => i.done_at && !lifted.has(i.id)).sort(pileOrder);
      const rows = todo.map(i => `<li data-pile="${i.id}">${itemRow(i, '')}</li>`);
      if (gapAt != null) rows.splice(Math.min(gapAt, rows.length), 0, '<li class="pile-gap" aria-hidden="true"></li>');
      $('#pile').innerHTML = rows.join('');
      $('#pile-done').innerHTML = done.length ? `
        <li class="line pile-done-head"><span class="margin"></span><span class="content">
          <button type="button" class="done-toggle" data-act="toggle-done" aria-expanded="${doneOpen}">${doneOpen ? '▾' : '▸'} Done <span class="task-count">${done.length}</span></button>
        </span></li>
        ${doneOpen ? done.map(i => `<li data-pile="${i.id}">${itemRow(i, '')}</li>`).join('') : ''}` : '';
      // A short list gets a few empty ruled lines under it, like a page (tap one to add a task).
      $('#pile-blank').innerHTML = '<div class="line pile-blank"><span class="margin"></span><span class="content"></span></div>'.repeat(Math.max(0, 4 - todo.length));
      const count = $('.pile .task-count');
      count.hidden = !all.length;
      count.textContent = `${all.filter(i => i.done_at).length}/${all.length}`;
      autosizeAll($('.pile-paper'));
      markAlt($('.pile-paper'));
      mountNoteEditors();
    }

    async function renderCarry() {
      const carry = await unfinishedBefore(date);
      const box = $('.carry');
      box.hidden = !carry.length || date < isoDate();
      if (!box.hidden) {
        box.innerHTML = `<span>${carry.length} unfinished from earlier days</span>
          <button type="button" data-act="review">Go through them</button>`;
      }
    }

    // Tasks for this day: planned (start date), aim today, ongoing multi-day,
    // and energy-matched suggestions to adopt.
    let tasks = [];
    // "Bring in from tasks": a list of tasks to go through for this day.
    // At the top, what's planned or aimed for this day and ideas for today's
    // energy; then Now, Next and Later. Each can be claimed into the day,
    // moved to Next or Later, or archived.
    async function renderTasks() {
      tasks = (await loadTasks()).tasks;
      if ($('#bring').open) drawBring();
    }

    async function openBring() {
      tasks = (await loadTasks()).tasks;
      drawBring();
      const dlg = $('#bring');
      if (!dlg.open) dlg.showModal();
    }

    function drawBring() {
      const open = tasks.filter(t => !t.done_at && !t.archived_at && t.status !== 'done');
      const onDay = new Set(items.map(i => i.task_id).filter(Boolean));
      const { planned, aimed, ongoing } = forDay(open, date);
      const top = [...new Set([...planned, ...aimed, ...ongoing])];
      const ideas = suggestions(open, day.energy).filter(t => !top.includes(t));
      const seen = new Set([...top, ...ideas]);
      const by = h => open.filter(t => horizonOf(t) === h && !seen.has(t) && !t.parent_task_id);
      const energy = ENERGY.find(e => e.id === day.energy);
      const card = (t, note = '') => {
        const e = ENERGY.find(x => x.id === t.energy);
        const aim = aimDate(t);
        const first = (t.notes || '').split('\n').map(l => l.trim()).find(Boolean);
        const h = horizonOf(t);
        return `<li data-bring="${t.id}">
          <div class="bring-main">
            <span class="review-title hand">${esc(t.title)}</span>
            <span class="bring-info">
              ${note ? `<span class="span-tag">${esc(note)}</span>` : ''}
              ${e ? `<span class="span-tag bolts" title="Energy: ${e.label}">${e.bolts}</span>` : ''}
              ${aim ? `<span class="span-tag" title="Target end date">⚑ ${esc(aim)}</span>` : ''}
              ${t.start_date && t.start_date !== date ? `<span class="span-tag" title="Planned for">📅 ${esc(t.start_date)}</span>` : ''}
            </span>
            ${first ? `<span class="bring-note muted">${previewLine(t.notes).html}</span>` : ''}
          </div>
          <span class="review-actions">
            ${onDay.has(t.id) ? '<span class="span-tag">on this day</span>' : `<button type="button" class="primary" data-bring-act="claim">Claim for ${date === isoDate() ? 'today' : 'this day'}</button>`}
            ${h !== 'now' ? '<button type="button" data-bring-act="now">Now</button>' : ''}
            ${h !== 'next' ? '<button type="button" data-bring-act="next">Next</button>' : ''}
            ${h !== 'later' ? '<button type="button" data-bring-act="later">Later</button>' : ''}
            <button type="button" data-bring-act="archive">Archive</button>
          </span>
        </li>`;
      };
      const section = (title, list, note) => (list.length ? `<h3 class="milestone">${title}</h3><ul class="review-list bring-list">${list.map(t => card(t, typeof note === 'function' ? note(t) : note)).join('')}</ul>` : '');
      const aimNote = t => (t.start_date === date ? '' : aimDate(t) === date ? 'aim is this day' : 'ongoing');
      $('#bring').innerHTML = `
        <div class="sheet-handle"></div>
        <h2>Bring in from tasks</h2>
        <p class="muted hint">Claim what you'll do ${date === isoDate() ? 'today' : 'on this day'}. Push the rest to Now, Next or Later, or archive what's no longer needed.</p>
        ${section('For this day', top, aimNote)}
        ${energy ? section(`Ideas for ${energy.bolts} energy`, ideas) : ''}
        ${section(esc(word('list_inbox')), by('inbox'))}
        ${section('Now', by('now'))}
        ${section('Next', by('next'))}
        ${section('Later', by('later'))}
        ${open.length ? '' : '<p class="muted">' + esc(word('ph_day_bring_empty')) + '</p>'}
        <div class="review-all"><button type="button" data-bring-act="close" class="primary">Done</button></div>`;
    }

    // Claiming makes a plan item linked to the task (with its note and
    // people) and marks the task as planned for this day.
    $('#bring').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-bring-act]');
      if (!b) return;
      const act = b.dataset.bringAct;
      if (act === 'close') { $('#bring').close(); return; }
      const id = b.closest('[data-bring]')?.dataset.bring;
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const before = { horizon: task.horizon ?? null, start_date: task.start_date ?? null, archived_at: task.archived_at ?? null };
      let undoPlan = null;
      if (act === 'claim') {
        // Onto this day, off any other (a task is on one day only).
        undoPlan = await planDay(task, date);
        await store.update('tasks', task.id, { horizon: 'now' });
      } else if (act === 'now' || act === 'next' || act === 'later') {
        await store.update('tasks', task.id, { horizon: act });
      } else if (act === 'archive') {
        await store.update('tasks', task.id, { archived_at: new Date().toISOString() });
      }
      await refresh();
      await renderTasks();
      const label = { claim: `"${task.title}" is on ${date === isoDate() ? 'today' : 'this day'}`, now: `"${task.title}" is for now`, next: `"${task.title}" is for next`, later: `"${task.title}" is for later`, archive: `Archived "${task.title}"` }[act];
      undoable(label, async () => {
        if (undoPlan) await undoPlan();
        await store.update('tasks', task.id, before);
        await refresh();
        await renderTasks();
      });
    });

    let atts = new Map(); // day item id → its attachments
    async function render() {
      settings = await daySettings();
      [day, items] = await Promise.all([getDay(date), itemsFor(date)]);
      atts = await att.byParent();
      applyPaper();
      header();
      renderLines();
      renderPile();
      renderCarry();
      renderTasks();
    }

    async function refresh() {
      items = await itemsFor(date);
      atts = await att.byParent();
      renderLines();
      renderPile();
      paintSelection?.();
    }

    // ---------- editing ----------

    async function create(fields) {
      const made = await addItem(date, fields);
      await refresh();
      undoable(`Added "${made.title}"`, async () => { await store.remove('day_items', made.id); await refresh(); });
      return made;
    }

    // Tap an item's text to edit it: pills for energy and duration open
    // under it, plus More for the whole panel (js/editpills.js).
    this.pills = editPills(planner, {
      title: '.item-title',
      row: '.line.has-item[data-item]',
      key: r => r.dataset.item,
      html: id => {
        const i = items.find(x => x.id === id);
        if (!i) return '';
        const mins = [...new Set([...durationChoices(settings.duration_max_min), ...(i.estimate_min ? [Number(i.estimate_min)] : [])])].sort((a, b) => a - b);
        const addNote = (i.notes || '').trim() ? '' : '<textarea class="add-note pill-note no-inline" data-pill="notes" rows="1" placeholder="Add note" aria-label="Note"></textarea>';
        return addNote + energyPill(i.energy)
          + selectPill('estimate_min', 'Estimated time', '⏱', [['', 'Not estimated'], ['unsure', 'Not sure yet'], ...mins.map(m => [m, durationLabel(m)])], i.estimate_min || (i.estimate_unsure ? 'unsure' : ''));
      },
      change: async (id, name, v) => {
        if (name === 'notes') { if (v.trim()) await change(id, { notes: v.trim() }, 'Note saved'); return; }
        if (name === 'energy') {
          const i = items.find(x => x.id === id);
          energyMenu(planner.querySelector('.edit-pills [data-pill-act="energy"]'), i?.energy || null, e => change(id, { energy: e }, e ? 'Energy saved' : 'Energy cleared'));
          return;
        }
        if (name === 'estimate_min') {
          return change(id, v === 'unsure' ? { estimate_min: null, estimate_unsure: true } : { estimate_min: v ? Number(v) : null, estimate_unsure: false },
            v === 'unsure' ? 'Estimate: not sure yet' : v ? `Estimate: ${durationLabel(Number(v))}` : 'Estimate cleared');
        }
        if (name === 'date' && v && v !== date) { this.pills.close(); return change(id, { date: v }, `Moved to ${v}`); }
      },
    });

    async function change(id, fields, label = 'Saved', opts) {
      const before = await store.get('day_items', id);
      const old = Object.fromEntries(Object.keys(fields).map(k => [k, before[k] ?? null]));
      await store.update('day_items', id, fields);
      await refresh();
      undoable(label, async () => { await store.update('day_items', id, old); await refresh(); }, opts);
    }

    // Inline input on an empty line: Enter adds an item at that time.
    function openLine(content) {
      const line = content.closest('.line');
      if (line.querySelector('input')) return;
      const time = line.dataset.time === 'evening' ? fromMin(toMin(settings.day_end) + slotMin()) : line.dataset.time;
      // The title, and an "Add note" line under it for anything more.
      content.innerHTML = '<input class="item-title hand new-line" autocomplete="off"><textarea class="add-note no-inline" rows="1" placeholder="Add note" aria-label="Note"></textarea>';
      const input = content.querySelector('input');
      const note = content.querySelector('.add-note');
      input.focus();
      let finished = false;
      const finish = async save => {
        if (finished) return; // Enter then leaving would otherwise save twice
        finished = true;
        const text = input.value.trim();
        const notes = note.value.trim();
        input.remove();
        note.remove();
        if (save && text) {
          const parsed = parseTimed(text);
          await create({ title: parsed.title, time: parsed.time || time, end_time: parsed.end_time, notes });
        }
      };
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
      });
      note.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
      });
      note.addEventListener('input', () => { note.style.height = 'auto'; note.style.height = `${note.scrollHeight}px`; });
      // Leaving both the title and its note saves it.
      content.addEventListener('focusout', ev => {
        if (content.contains(ev.relatedTarget)) return;
        setTimeout(() => { if (!content.contains(document.activeElement)) finish(true); }, 0);
      });
    }

    // (An item spanning several slots is a .span-block: its lower rows take files too.)
    att.enableDrop(el, '.item-details[data-for], .line.has-item[data-item], .span-block', node => ({ collection: 'day_items', id: node.dataset.for || node.dataset.item || node.querySelector('.line.has-item')?.dataset.item }), () => refresh());
    el.addEventListener('click', async ev => {
      if (att.onClick(ev, b => { const id = b.closest('[data-for]')?.dataset.for; return id ? { collection: 'day_items', id } : null; }, () => refresh())) return;
      const t = ev.target.closest('[data-act], [data-energy], [data-item-energy]');
      if (!t) return;
      if (t.dataset.itemEnergy) {
        const eid = t.closest('[data-for]')?.dataset.for;
        const it = items.find(x => x.id === eid);
        if (it) await change(eid, { energy: it.energy === t.dataset.itemEnergy ? null : t.dataset.itemEnergy }, 'Energy saved');
        return;
      }
      if (t.closest('.item-details') && !t.closest('.rich')) await flushNote(t.closest('.item-details'));
      const itemEl = t.closest('[data-item], [data-for]');
      const id = itemEl?.dataset.item || itemEl?.dataset.for;
      const act = t.dataset.act;
      if (act === 'energy-pill' && id) {
        const it = items.find(x => x.id === id);
        energyMenu(t, it?.energy || null, e => change(id, { energy: e }, e ? 'Energy saved' : 'Energy cleared'));
        return;
      }
      if (act === 'energy-edit') { openEnergy(); return; }
      if (t.dataset.energy) {
        const old = day.energy || null;
        const energy = t.dataset.energy === 'none' || day.energy === t.dataset.energy ? null : t.dataset.energy;
        const forDate = date;
        day = await saveDay(forDate, { energy });
        header();
        undoable(energy ? 'Energy saved' : 'Energy cleared', async () => { const d = await saveDay(forDate, { energy: old }); if (forDate === date) { day = d; header(); renderTasks(); } });
        renderTasks();
      } else if (act === 'prev') go(addDays(date, -1));
      else if (act === 'next') go(addDays(date, 1));
      else if (act === 'today') go(isoDate());
      else if (act === 'calendar') openCalendar(date);
      else if (act === 'bring-in') openBring();
      else if (act === 'toggle-done') { doneOpen = !doneOpen; renderPile(); }
      else if (act === 'paper-week' || act === 'paper-all') resetPapers(act === 'paper-week');
      else if (act === 'clear-day') clearDay();
      else if (act === 'add-at') openLine(t);
      else if (act === 'toggle-note') {
        const nid = t.closest('[data-item]').dataset.item;
        if (editing === nid) closeDetails();
        else { editing = nid; refresh(); }
      }
      else if (act === 'adopt' || act === 'task-to-plan') {
        const taskId = t.closest('[data-task]').dataset.task;
        const task = tasks.find(x => x.id === taskId);
        // Onto this day (and off any other: a task is on one day only).
        const undo = await planDay(task, date);
        await refresh();
        renderTasks();
        undoable(act === 'adopt' ? `Adopted "${task.title}"` : `"${task.title}" is in To place`, async () => { await undo(); await refresh(); renderTasks(); });
      }
      else if (act === 'details') { if (editing === id) closeDetails(); else { editing = id; refresh(); } }
      else if (act === 'close-details') closeDetails();
      else if (act === 'unschedule') { editing = null; await change(id, { time: null, end_time: null }, 'Time unallocated'); }
      else if (act === 'archive-item') {
        editing = null;
        const it = items.find(i => i.id === id);
        await change(id, { archived_at: new Date().toISOString() }, `Archived "${it?.title || 'item'}"`);
      } else if (act === 'to-task') {
        editing = null;
        await toTask(items.find(i => i.id === id));
      } else if (act === 'delete') {
        editing = null;
        const gone = items.find(i => i.id === id);
        await store.remove('day_items', id);
        await refresh();
        undoable(`Deleted "${gone?.title || 'item'}"`, async () => { await store.restore('day_items', id); await refresh(); });
      } else if (act === 'let-go' || act === 'take-back') {
        editing = null;
        const it = items.find(i => i.id === id);
        const now = new Date().toISOString();
        await change(id, act === 'let-go' ? { dropped_at: now, archived_at: now } : { dropped_at: null, archived_at: null },
          act === 'let-go' ? `Let go: ${it.title} (it's in the Archive)` : `Taken back: ${it.title}`);
        renderCarry();
      } else if (act === 'review') {
        openReview();
      }
    });

    el.addEventListener('change', async ev => {
      const t = ev.target;
      const itemEl = t.closest('[data-item], [data-for]');
      const id = itemEl?.dataset.item || itemEl?.dataset.for;
      if (t.classList.contains('task-tick')) {
        const taskId = t.closest('[data-task]').dataset.task;
        await store.update('tasks', taskId, doneFields(t.checked));
        renderTasks();
        undoable(t.checked ? 'Task done' : 'Task not done', async () => { await store.update('tasks', taskId, doneFields(!t.checked)); renderTasks(); }, t.checked ? { more: closingComment({ task_id: taskId }) } : undefined);
      } else if (t.classList.contains('tick') && id) {
        // A plan item that came from a task ticks the task too (js/link.js).
        const it = items.find(i => i.id === id);
        await change(id, { done_at: t.checked ? new Date().toISOString() : null }, t.checked ? 'Done' : 'Not done',
          t.checked && it ? { more: closingComment(it.task_id ? { task_id: it.task_id } : { item_id: it.id }) } : undefined);
      } else if (t.classList.contains('item-title') && id) {
        const it = items.find(i => i.id === id);
        if (t.value.trim()) await change(id, { title: t.value.trim() });
        else if (it && await askEmptied('item')) {
          await store.remove('day_items', id);
          await refresh();
          undoable(`Deleted "${it.title}"`, async () => { await store.restore('day_items', id); await refresh(); });
        } else if (it) t.value = it.title;
      } else if (t.classList.contains('margin-time')) {
        // Typed start time in the margin: 12.45, 12:45, 1245 or 14
        const m = t.value.trim().match(/^(\d{1,2})(?:[.:\s]?(\d{2}))?$/);
        const it = items.find(x => x.id === t.dataset.timeFor);
        if (!m || Number(m[1]) > 23 || Number(m[2] || 0) > 59) {
          toast("Couldn't read that time. Try 14.30");
          t.value = fmt(it.time);
          return;
        }
        const time = `${String(Number(m[1])).padStart(2, '0')}:${m[2] || '00'}`;
        if (time === it.time) { t.value = fmt(it.time); return; }
        const moved = items.map(x => (x.id === it.id
          ? { ...x, time, end_time: x.end_time ? fromMin(Math.min(23 * 60 + 59, toMin(time) + duration(x))) : null, _mark: 'preview' }
          : x));
        const preview = withPushes(moved, new Set([it.id]));
        const pushedN = preview.filter(x => x._mark === 'pushed').length;
        await moveMany(diff(preview), `Time: ${fmt(time)}${pushedN ? `, pushed ${pushedN} on` : ''}`);
      } else if (t.name === 'estimate_min' && id) {
        const v = t.value;
        await change(id, v === 'unsure' ? { estimate_min: null, estimate_unsure: true } : { estimate_min: v ? Number(v) : null, estimate_unsure: false },
          v === 'unsure' ? 'Estimate: not sure yet' : v ? `Estimate: ${durationLabel(Number(v))}` : 'Estimate cleared');
      } else if (t.name && id) {
        const value = t.name === 'estimate_min' ? (t.value ? Number(t.value) : null) : (t.value || null);
        if (t.name === 'date' && !value) return;
        await change(id, { [t.name]: value }, t.name === 'date' ? `Moved to ${value}` : 'Saved');
        if (t.name === 'date') editing = null;
      } else if (t.id === 'paper-style') {
        const old = day.paper || null;
        day = await saveDay(date, { paper: t.value || null });
        applyPaper();
        renderLines();
        renderPile();
        undoable('Paper changed for this day', async () => { day = await saveDay(date, { paper: old }); applyPaper(); renderLines(); renderPile(); });
      } else if (t.id === 'energy-note') {
        const old = day.energy_note || '';
        if (t.value.trim() === old) return;
        const forDate = date;
        day = await saveDay(forDate, { energy_note: t.value.trim() });
        undoable('Saved', async () => { const d = await saveDay(forDate, { energy_note: old }); if (forDate === date) { day = d; header(); } });
      } else if (t.id === 'focus') {
        const old = day.focus || '';
        if (t.value.trim() === old) return;
        const forDate = date;
        day = await saveDay(forDate, { focus: t.value.trim() });
        undoable('Day focus saved', async () => { const d = await saveDay(forDate, { focus: old }); if (forDate === date) { day = d; header(); } });
      }
    });

    // Dump box → pile (or straight onto the plan when a line starts with a time).
    const dumpDraft = keepDraft($('#dump'), () => `planner:${date}`);
    // "New task" is the last line of the tasks: Enter adds it and leaves a
    // fresh line ready. A time at the start (12.45 …) puts it on the plan.
    // While you're on it, Add note and pills show under it, as on the Tasks
    // page: Energy, Estimated time and More (adds it and opens its panel). No
    // Day: what you write on a day belongs to that day (moving is in the panel).
    // They stay while anything is typed or set; Esc on an empty line closes them.
    const pileNew = $('.pile-new');
    let draft = { energy: null, estimate_min: null };
    function paintNewPills() {
      $('.new-pills').innerHTML = energyPill(draft.energy)
        + selectPill('estimate_min', 'Estimated time', '⏱', [['', 'Not estimated'], ...durationChoices(settings.duration_max_min).map(m => [m, durationLabel(m)])], draft.estimate_min)
        + '<button type="button" class="entry-chip pill-more" data-pill-more>More…</button>';
    }
    const newIdle = () => !$('#dump').value.trim() && !$('#dump-note').value.trim() && !draft.energy && !draft.estimate_min;
    function resetNew() {
      draft = { energy: null, estimate_min: null };
      const noteEl = $('#dump-note');
      noteEl.value = '';
      noteEl.style.height = '';
      paintNewPills();
    }
    const closeNew = () => pileNew.classList.remove('open');
    pileNew.addEventListener('focusin', () => { if (!pileNew.classList.contains('open')) { paintNewPills(); pileNew.classList.add('open'); } });
    // Leaving by keyboard (Tab / Shift+Tab) closes it too, if nothing's typed or set.
    pileNew.addEventListener('focusout', ev => {
      const to = ev.relatedTarget;
      if (!to || pileNew.contains(to) || to.closest?.('.pill-menu, .dd-menu')) return;
      if (newIdle()) { resetNew(); closeNew(); }
    });
    document.addEventListener('pointerdown', ev => {
      if (!el.isConnected || !pileNew.classList.contains('open')) return;
      if (pileNew.contains(ev.target) || ev.target.closest?.('.pill-menu')) return;
      if (newIdle()) { resetNew(); closeNew(); }
    }, pageCapture);
    $('.new-pills').addEventListener('click', ev => {
      const d = ev.target.closest('input[type="date"]');
      if (d) { try { d.showPicker(); } catch { /* the tap opens it */ } return; }
      const en = ev.target.closest('[data-pill-act="energy"]');
      if (en) { energyMenu(en, draft.energy, v => { draft.energy = v; paintNewPills(); $('#dump').focus(); }); return; }
      if (ev.target.closest('[data-pill-more]')) {
        if ($('#dump').value.trim()) addNew({ open: true });
        else { toast('Type the task first'); $('#dump').focus(); }
      }
    });
    $('.new-pills').addEventListener('change', ev => {
      ev.stopPropagation();
      const f = ev.target.closest('[data-pill]');
      if (!f) return;
      if (f.dataset.pill === 'estimate_min') draft.estimate_min = f.value ? Number(f.value) : null;
      paintNewPills();
    });
    async function addNew({ open = false } = {}) {
      const input = $('#dump');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      draftCleared(input);
      const p = parseTimed(text);
      const { title, notes: longText } = summarise(p.title); // long ones: short title, full text in the note
      const notes = [longText, $('#dump-note').value.trim()].filter(Boolean).join('\n\n');
      const made = await addItem(date, { title, notes, time: p.time, end_time: p.end_time, rank: lastKey(items.filter(i => !i.time)), energy: draft.energy, estimate_min: draft.estimate_min });
      resetNew();
      if (open) { closeNew(); input.blur(); editing = made.id; }
      await refresh();
      if (!open) input.focus();
      undoable(`Added "${made.title}"`, async () => { await store.remove('day_items', made.id); await refresh(); });
    }
    $('#dump').addEventListener('keydown', ev => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.target.value) { ev.target.value = ''; draftCleared(ev.target); return; }
        resetNew();
        closeNew();
        ev.target.blur();
        return;
      }
      if (ev.key !== 'Enter' || ev.isComposing) return;
      ev.preventDefault();
      addNew();
    });

    // ---------- select, pick up and move; resize from the bottom handle ----------
    // ⠿ tap = select / deselect. ⠿ press and move = pick up (the selection if
    // this item is in it): the items leave the page and ride under the pointer,
    // and the lines they'd land on show a preview. Drop on a line = that
    // line's time (snaps to the line, never in between). Timed items keep
    // their spacing; untimed ones fill the following lines. Drop on To place =
    // no time. The bottom handle of a timed item drags its length.

    const selected = new Set();
    const lifted = new Set();
    const step = () => slotMin();
    const duration = i => (i.end_time ? toMin(i.end_time) - toMin(i.time) : i.estimate_min || step());
    const eveningTime = () => fromMin(toMin(settings.day_end) + step());

    // Selection bar
    const bar = document.createElement('div');
    bar.className = 'select-bar';
    bar.hidden = true;
    bar.innerHTML = `<span class="select-count"></span>
      <button type="button" data-sel="done">Done</button>
      <button type="button" data-sel="pile">To place</button>
      <button type="button" data-sel="letgo" title="Didn't do these and they don't need doing">Let go</button>
      <button type="button" data-sel="tomorrow">Tomorrow</button>
      <button type="button" data-sel="delete" class="danger">Delete</button>
      <button type="button" data-sel="clear" aria-label="Clear selection">✕</button>`;
    document.body.append(bar);
    this.bar = bar;

    function paintSelection() {
      for (const id of [...selected]) if (!items.some(i => i.id === id)) selected.delete(id);
      el.querySelectorAll('.line.has-item').forEach(r => r.classList.toggle('selected', selected.has(r.dataset.item)));
      bar.hidden = !selected.size;
      document.body.classList.toggle('has-select-bar', !!selected.size);
      bar.querySelector('.select-count').textContent = `${selected.size} selected`;
    }
    const clearSelection = () => { selected.clear(); paintSelection(); };

    async function moveMany(fieldsById, label) {
      const before = [...fieldsById.keys()].map(id => {
        const i = items.find(x => x.id === id);
        return [id, Object.fromEntries(Object.keys(fieldsById.get(id)).map(k => [k, i?.[k] ?? null]))];
      });
      await store.updateMany('day_items', [...fieldsById]);
      await refresh();
      paintSelection();
      undoable(label, async () => { await store.updateMany('day_items', before); await refresh(); paintSelection(); });
    }

    bar.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-sel]');
      if (!b) return;
      const ids = items.filter(i => selected.has(i.id)).map(i => i.id);
      const n = ids.length;
      const plural = `${n} item${n === 1 ? '' : 's'}`;
      if (b.dataset.sel === 'clear') return clearSelection();
      if (b.dataset.sel === 'done') await moveMany(new Map(ids.map(id => [id, { done_at: new Date().toISOString() }])), `Done: ${plural}`);
      if (b.dataset.sel === 'letgo') { const now = new Date().toISOString(); await moveMany(new Map(ids.map(id => [id, { dropped_at: now, archived_at: now }])), `Let go of ${plural} (in the Archive)`); clearSelection(); }
      if (b.dataset.sel === 'pile') await moveMany(new Map(ids.map(id => [id, { time: null, end_time: null }])), `${plural} back to To place`);
      if (b.dataset.sel === 'tomorrow') { await moveMany(new Map(ids.map(id => [id, { date: addDays(date, 1), carried_from: date }])), `${plural} moved to tomorrow`); clearSelection(); }
      if (b.dataset.sel === 'delete') { await moveMany(new Map(ids.map(id => [id, { deleted_at: new Date().toISOString() }])), `Deleted ${plural}`); clearSelection(); }
    });

    // Where a drop would land: the line under the middle of what's carried.
    function targetAt(x, y) {
      const pileBox = $('.pile').getBoundingClientRect();
      if (y >= pileBox.top && y <= pileBox.bottom && x >= pileBox.left && x <= pileBox.right) {
        // Index among the (not carried) to-do rows: before the first row whose middle is below the pointer.
        const rows = [...$('#pile').querySelectorAll(':scope > li[data-pile]')];
        const index = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 < y; }).length;
        return { pile: true, index };
      }
      for (const line of linesEl.querySelectorAll('.line[data-time]')) {
        const r = line.getBoundingClientRect();
        if (y >= r.top && y < r.bottom) return { line, time: line.dataset.time === 'evening' ? eveningTime() : line.dataset.time };
      }
      return null;
    }

    // Items in the way get pushed later (keeping their length), knock-on down
    // the day. `fixed` are the items being placed on purpose.
    function withPushes(list, fixed) {
      const out = list.map(i => ({ ...i }));
      const len = i => (i.end_time ? toMin(i.end_time) - toMin(i.time) : i.estimate_min || 0);
      const placed = out.filter(i => i.time && fixed.has(i.id));
      if (!placed.length) return out;
      const from = Math.min(...placed.map(i => toMin(i.time)));
      const busy = placed.filter(i => len(i) > 0).map(i => [toMin(i.time), toMin(i.time) + len(i)]);
      const others = out.filter(i => i.time && !fixed.has(i.id) && toMin(i.time) >= from).sort((a, b) => toMin(a.time) - toMin(b.time));
      for (const o of others) {
        const d = len(o);
        let a = toMin(o.time);
        let moved = false;
        for (let guard = 0; guard < 100; guard++) {
          const hit = busy.find(([x, y]) => a < y && a + Math.max(d, 1) > x);
          if (!hit) break;
          a = hit[1];
          moved = true;
        }
        if (moved) {
          o.time = fromMin(Math.min(a, 23 * 60 + 59));
          if (o.end_time) o.end_time = fromMin(Math.min(a + d, 23 * 60 + 59));
          o._mark = 'pushed';
        }
        if (d > 0) busy.push([a, a + d]);
      }
      return out;
    }

    // Field changes between the saved day and a preview.
    function diff(preview) {
      const out = new Map();
      for (const v of preview) {
        const i = items.find(x => x.id === v.id);
        if (!i) continue;
        const f = {};
        if ((v.time ?? null) !== (i.time ?? null)) f.time = v.time ?? null;
        if ((v.end_time ?? null) !== (i.end_time ?? null)) f.end_time = v.end_time ?? null;
        if (Object.keys(f).length) out.set(v.id, f);
      }
      return out;
    }

    // Dropped into the tasks at `index`: no time, and a new place (order.js)
    // for just the dropped items.
    function pileChanges(index) {
      const rest = items.filter(i => !i.time && !i.done_at && !press.ids.includes(i.id)).sort(pileOrder);
      const carried = press.ids.map(id => items.find(i => i.id === id)).filter(Boolean);
      const order = [...rest.slice(0, index), ...carried, ...rest.slice(index)];
      const places = new Map(reorderWrites(order, i => rankOf(i), press.ids).map(([i, k]) => [i.id, k]));
      const out = new Map();
      for (const i of order) {
        const f = {};
        if (i.time) { f.time = null; f.end_time = null; }
        if (places.has(i.id)) f.rank = places.get(i.id);
        if (Object.keys(f).length) out.set(i.id, f);
      }
      return out;
    }

    // Each carried item's new time for a drop at `time`.
    function plan(time) {
      const anchor = items.find(i => i.id === press.id);
      const moving = items.filter(i => press.ids.includes(i.id));
      const base = toMin(time);
      let nextFree = base;
      const out = new Map();
      for (const i of moving) {
        let start;
        if (i.time && anchor.time) start = base + (toMin(i.time) - toMin(anchor.time));
        else if (i.id === anchor.id) start = base;
        else { nextFree += step(); start = nextFree; }
        start = Math.max(0, Math.min(23 * 60 + 45, start));
        const fields = { time: fromMin(start) };
        if (i.time && i.end_time) fields.end_time = fromMin(Math.min(24 * 60 - 1, start + duration(i)));
        else fields.end_time = i.time ? null : i.end_time;
        out.set(i.id, fields);
      }
      return out;
    }

    // Mid-flight preview: redraw the day as it would be if dropped here —
    // carried items at their new times, anything in the way pushed on.
    function showPreview(target) {
      $('#pile').classList.toggle('drop-target', !!target?.pile);
      const key = target ? (target.pile ? `pile:${target.index}` : target.time) : '';
      if (key === press.previewKey) return;
      press.previewKey = key;
      if (!target || target.pile) {
        press.changes = target?.pile ? pileChanges(target.index) : null;
        press.ghost.dataset.when = target?.pile ? 'Tasks' : '';
        if (!target) delete press.ghost.dataset.when;
        renderLines();
        renderPile(target?.pile ? target.index : null);
        return;
      }
      renderPile();
      press.ghost.dataset.when = fmt(target.time);
      const planned = plan(target.time);
      const moved = items.map(i => (planned.has(i.id) ? { ...i, ...planned.get(i.id), _mark: 'preview' } : i));
      const preview = withPushes(moved, new Set(planned.keys()));
      press.changes = diff(preview);
      press.pushedCount = preview.filter(i => i._mark === 'pushed').length;
      renderLines(preview);
    }

    let press = null;  // pointer down on a ⠿ (maybe a tap, maybe a drag)
    let resizing = null;

    el.addEventListener('pointerdown', ev => {
      const grip = ev.target.closest('.drag-grip, .resize-grip');
      if (!grip || ev.button > 0) return;
      ev.preventDefault();
      const row = grip.closest('[data-item]');
      const item = items.find(i => i.id === row.dataset.item);
      if (!item) return;
      try { el.setPointerCapture(ev.pointerId); } catch {} // the row is re-rendered while dragging
      if (grip.classList.contains('resize-grip')) {
        const lineH = (linesEl.querySelector('.line.blank') || row).getBoundingClientRect().height;
        resizing = { item, startY: ev.clientY, base: duration(item), minutes: null, lineH };
        return;
      }
      press = { id: item.id, x: ev.clientX, y: ev.clientY, rowH: row.getBoundingClientRect().height, dragging: false };
    });

    el.addEventListener('pointermove', ev => {
      if (resizing) return resizeMove(ev);
      if (!press) return;
      if (!press.dragging) {
        if (Math.hypot(ev.clientX - press.x, ev.clientY - press.y) < 6) return;
        // Pick up: the selection if this item is in it, otherwise just this one.
        press.dragging = true;
        press.ids = selected.has(press.id) && selected.size > 1 ? items.filter(i => selected.has(i.id)).map(i => i.id) : [press.id];
        const carried = items.filter(i => press.ids.includes(i.id));
        const ghost = document.createElement('div');
        ghost.className = 'pickup-stack';
        ghost.innerHTML = carried.slice(0, 4).map(i => `<div class="pickup-row hand">${esc(i.title)}${i.time ? ` <span class="span-tag">${fmt(i.time)}</span>` : ''}</div>`).join('')
          + (carried.length > 4 ? `<div class="pickup-more">+ ${carried.length - 4} more</div>` : '');
        document.body.append(ghost);
        press.ghost = ghost;
        press.ids.forEach(id => lifted.add(id));
        renderLines();
        renderPile();
        document.body.classList.add('is-dragging');
      }
      const w = Math.min(420, $('.paper').getBoundingClientRect().width - 80);
      Object.assign(press.ghost.style, { left: `${ev.clientX - 20}px`, top: `${ev.clientY - press.rowH / 2}px`, width: `${w}px` });
      press.target = targetAt(ev.clientX, ev.clientY);
      showPreview(press.target);
    });

    const endPress = async ev => {
      if (resizing) return resizeEnd(ev);
      const p = press;
      press = null;
      if (!p) return;
      if (!p.dragging) {
        // A tap: select / deselect.
        selected.has(p.id) ? selected.delete(p.id) : selected.add(p.id);
        return paintSelection();
      }
      p.ghost.remove();
      document.body.classList.remove('is-dragging');
      $('#pile').classList.remove('drop-target');
      lifted.clear();
      const t = ev.type === 'pointerup' ? p.target : null;
      const n = p.ids.length;
      if (!t || !p.changes?.size) { renderLines(); renderPile(); paintSelection(); return; }
      const pushed = p.pushedCount ? `, pushed ${p.pushedCount} on` : '';
      await moveMany(p.changes, t.pile ? `${n > 1 ? `${n} items` : 'Item'} moved in Tasks` : `${n > 1 ? `Moved ${n} items` : 'Moved'} to ${fmt(t.time)}${pushed}`);
    };
    el.addEventListener('pointerup', endPress);
    el.addEventListener('pointercancel', endPress);

    // Stretching an item: redraw the day live (lines it covers blocked out,
    // anything in the way pushed on), save on release.
    function resizeMove(ev) {
      const perPx = step() / resizing.lineH;
      const minutes = Math.max(15, Math.round((resizing.base + (ev.clientY - resizing.startY) * perPx) / 15) * 15);
      if (minutes === resizing.minutes) return;
      resizing.minutes = minutes;
      const it = resizing.item;
      const end = fromMin(Math.min(23 * 60 + 59, toMin(it.time) + minutes));
      const stretched = items.map(i => (i.id === it.id ? { ...i, end_time: end, _mark: 'preview' } : i));
      const preview = withPushes(stretched, new Set([it.id]));
      resizing.changes = diff(preview);
      resizing.end = end;
      resizing.pushedCount = preview.filter(i => i._mark === 'pushed').length;
      renderLines(preview);
    }

    async function resizeEnd(ev) {
      const r = resizing;
      resizing = null;
      if (ev.type === 'pointercancel' || !r.changes?.size) return renderLines();
      await moveMany(r.changes, `Until ${fmt(r.end)}${r.pushedCount ? `, pushed ${r.pushedCount} on` : ''}`);
    }

    // ---------- going through unfinished items one by one ----------

    const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = d => {
      const diff = Math.round((parseDate(d) - parseDate(date)) / 86400000);
      const nice = `${WEEK[parseDate(d).getDay()]} ${parseDate(d).getDate()} ${parseDate(d).toLocaleDateString(undefined, { month: 'short' })}`;
      return diff === -1 ? `Yesterday · ${nice}` : `${nice} · ${-diff} days ago`;
    };

    async function openReview() {
      await drawReview();
      const dlg = $('#review');
      if (!dlg.open) dlg.showModal();
    }

    async function drawReview() {
      const left = await unfinishedBefore(date);
      const dlg = $('#review');
      if (!left.length) {
        if (dlg.open) dlg.close();
        await render();
        return;
      }
      const byDay = new Map();
      for (const i of left) { if (!byDay.has(i.date)) byDay.set(i.date, []); byDay.get(i.date).push(i); }
      dlg.innerHTML = `
        <div class="sheet-handle"></div>
        <h2>Unfinished from earlier days</h2>
        <p class="muted hint">${esc(word('ph_day_review'))}</p>
        ${[...byDay].map(([d, list]) => `
          <h3 class="milestone">${esc(dayName(d))}</h3>
          <ul class="review-list">${list.map(i => `
            <li data-review-id="${i.id}">
              <span class="review-title hand">${esc(i.title)}${i.time ? ` <span class="span-tag">${fmt(i.time)}</span>` : ''}</span>
              <span class="review-actions">
                <button type="button" data-review="done" title="I did this already">✓ Did it</button>
                <button type="button" data-review="bring" title="Put it in today's To place">→ Bring to ${date === isoDate() ? 'today' : 'this day'}</button>
                <button type="button" data-review="letgo" title="Didn't do it and it doesn't need doing any more. It goes to the Archive">Let it go</button>
                <button type="button" data-review="delete" class="danger" title="Get rid of it completely (to the Bin)">Delete</button>
              </span>
            </li>`).join('')}
          </ul>`).join('')}
        <div class="sheet-actions">
          <button type="button" data-review-all="bring">Bring the rest here</button>
          <button type="button" data-review-all="letgo">Let the rest go</button>
          <button type="button" data-review-all="delete" class="danger">Delete the rest</button>
          <span class="spacer"></span>
          <button type="button" data-review-close>Close</button>
        </div>`;
    }

    const reviewFields = (kind, i) => {
      const now = new Date().toISOString();
      return kind === 'done' ? { done_at: now }
        : kind === 'letgo' ? { dropped_at: now, archived_at: now }
        : kind === 'delete' ? { deleted_at: now }
        : { date, time: null, end_time: null, carried_from: i.date };
    };
    const reviewLabel = { done: 'Marked done', letgo: 'Let go (in the Archive)', bring: 'Brought here', delete: 'Deleted' };

    // Closed by dragging the handle, the ✕ or a tap outside (js/sheets.js): redraw the day.
    $('#review').addEventListener('close', () => render());
    $('#review').addEventListener('click', async ev => {
      const dlg = $('#review');
      if (ev.target === dlg || ev.target.closest('[data-review-close]')) { dlg.close(); return; }
      const b = ev.target.closest('[data-review], [data-review-all]');
      if (!b) return;
      const left = await unfinishedBefore(date);
      const targets = b.dataset.reviewAll ? left : left.filter(i => i.id === b.closest('[data-review-id]').dataset.reviewId);
      const kind = b.dataset.review || b.dataset.reviewAll;
      const before = targets.map(i => [i.id, { date: i.date, time: i.time ?? null, end_time: i.end_time ?? null, carried_from: i.carried_from ?? null, done_at: i.done_at ?? null, dropped_at: i.dropped_at ?? null, archived_at: i.archived_at ?? null, deleted_at: null }]);
      const row = !b.dataset.reviewAll && b.closest('li');
      if (row) { row.classList.add('leaving'); await new Promise(r => setTimeout(r, 180)); }
      await store.updateMany('day_items', targets.map(i => [i.id, reviewFields(kind, i)]));
      await drawReview();
      undoable(`${reviewLabel[kind]}: ${targets.length === 1 ? targets[0].title : `${targets.length} items`}`, async () => {
        await store.updateMany('day_items', before);
        await render();
        if (dlg.open) drawReview();
      });
    });

    // ---------- calendar popup ----------

    async function openCalendar(around) {
      calMonth = around.slice(0, 7);
      await drawCalendar();
      const dlg = $('#cal');
      if (!dlg.open) dlg.showModal();
    }

    async function drawCalendar() {
      const s = await store.getSettings();
      const weekStart = Number(s.week_start ?? 1);
      const first = parseDate(`${calMonth}-01`);
      const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const from = `${calMonth}-01`;
      const to = `${calMonth}-${String(lastDay).padStart(2, '0')}`;
      const busy = await datesWithContent(from, to);
      const lead = (first.getDay() - weekStart + 7) % 7;
      const names = [...Array(7)].map((_, n) => WEEKDAYS[(n + weekStart) % 7].slice(0, 2));
      const today = isoDate();
      const cells = [...Array(lead)].map(() => '<span></span>');
      for (let n = 1; n <= lastDay; n++) {
        const d = `${calMonth}-${String(n).padStart(2, '0')}`;
        const cls = [d === today && 'today', d === date && 'current', busy.has(d) && 'busy',
          settings.down_days.includes(parseDate(d).getDay()) && 'down'].filter(Boolean).join(' ');
        cells.push(`<button type="button" class="${cls}" data-day="${d}">${n}</button>`);
      }
      // Always six weeks, so the picker is the same height every month and
      // the ‹ › buttons stay under the pointer when clicked repeatedly.
      while (cells.length < 42) cells.push('<span class="cal-pad"></span>');
      $('#cal').innerHTML = `
        <div class="sheet-handle"></div>
        <div class="cal-head">
          <button type="button" data-cal="-1" aria-label="Previous month">‹</button>
          <strong>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button type="button" data-cal="1" aria-label="Next month">›</button>
        </div>
        <div class="cal-grid">${names.map(n => `<span class="cal-dow">${n}</span>`).join('')}${cells.join('')}</div>
        <p class="muted cal-key"><span class="dot"></span> planned or written in</p>`;
    }

    $('#cal').addEventListener('click', async ev => {
      const dlg = $('#cal');
      if (ev.target === dlg) { dlg.close(); return; }
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.cal) {
        const d = parseDate(`${calMonth}-01`);
        d.setMonth(d.getMonth() + Number(b.dataset.cal));
        calMonth = isoDate(d).slice(0, 7);
        drawCalendar();
      } else if (b.dataset.day) {
        dlg.close();
        go(b.dataset.day);
      }
    });

    // ---------- a plan item back to being a task ----------

    // It leaves the day and shows in Tasks, keeping everything it had. An
    // item that came from a task goes back into that task (notes and people
    // merged); otherwise a new task is made. Undoable.
    async function toTask(it) {
      if (!it) return;
      const from = it.task_id && await store.get('tasks', it.task_id);
      let undo;
      if (from) {
        const before = { notes: from.notes || '', contact_ids: from.contact_ids || [], start_date: from.start_date ?? null };
        const notes = !it.notes || (from.notes || '').includes(it.notes) ? from.notes || '' : [from.notes, it.notes].filter(Boolean).join('\n\n');
        await store.update('tasks', from.id, {
          notes,
          contact_ids: [...new Set([...(from.contact_ids || []), ...(it.contact_ids || [])])],
          start_date: from.start_date === it.date ? null : from.start_date ?? null,
        });
        undo = () => store.update('tasks', from.id, before);
      } else {
        const made = await addTask({
          title: it.title, notes: it.notes || '', contact_ids: it.contact_ids || [], case_id: it.case_id || null,
          source_thought_id: it.source_thought_id || null, done_at: it.done_at || null, status: it.done_at ? 'done' : 'todo',
          // Plan-only fields come along so nothing is lost if it goes back.
          estimate_min: it.estimate_min ?? null, estimate_unsure: !!it.estimate_unsure,
          from_day: { date: it.date, time: it.time || null, end_time: it.end_time || null },
        });
        await moveComments({ item_id: it.id }, { task_id: made.id });
        undo = async () => { await store.remove('tasks', made.id); await moveComments({ task_id: made.id }, { item_id: it.id }); };
      }
      await store.remove('day_items', it.id);
      await refresh();
      renderTasks();
      undoable(`"${it.title}" is now in Tasks`, async () => {
        await undo();
        await store.restore('day_items', it.id);
        await refresh();
        renderTasks();
      });
    }

    // ---------- share: the day as text ----------

    // The day written out: heading, focus and energy, the timed plan in
    // order, what's after the day, untimed tasks, then the day's notes.
    // Formats: plain text, WhatsApp (*bold*, _italic_, ~strike~, ✅/⬜) and
    // rich text (HTML, with plain text alongside for apps that want it).
    const unlink = s => (s || '').replace(/\[([^\]]*)\]\(sift:[^)]*\)/g, '$1');
    function mdTo(kind, s) {
      const t = unlink(s);
      if (kind === 'whatsapp') return t.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/~~(.+?)~~/g, '~$1~').replace(/^(?:#{1,6}|-#|\+#|#\+)\s+(.*)$/gm, '*$1*');
      return t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/(^|\s)_(\S.*?)_(?=$|[\s).,!?:;])/g, '$1$2').replace(/^(?:#{1,6}|-#|\+#|#\+)\s+/gm, '');
    }
    const shareTitle = () => parseDate(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    function dayText(kind) {
      const wa = kind === 'whatsapp';
      const bold = s => (wa ? `*${s}*` : s);
      const endOfDay = toMin(settings.day_end) + step();
      const timed = items.filter(i => i.time).sort((a, b) => a.time.localeCompare(b.time));
      const inDay = timed.filter(i => toMin(i.time) < endOfDay);
      const evening = timed.filter(i => toMin(i.time) >= endOfDay);
      const untimed = items.filter(i => !i.time);
      const mark = i => (i.done_at ? (wa ? '✅' : '[x]') : i.dropped_at ? (wa ? '➖' : '[-]') : (wa ? '⬜' : '[ ]'));
      const when = i => (i.time ? `${fmt(i.time)}${i.end_time ? `–${fmt(i.end_time)}` : ''} ` : '');
      const line = i => {
        const title = i.dropped_at && wa ? `~${i.title}~` : i.title;
        const note = (i.notes || '').trim() ? `\n${mdTo(kind, i.notes).split('\n').filter(l => l.trim()).map(l => `    ${wa && !/^\s*[-*•]\s/.test(l) ? `_${l.trim()}_` : l.trim()}`).join('\n')}` : '';
        return `${mark(i)} ${when(i)}${title}${note}`;
      };
      const energy = ENERGY.find(e => e.id === day.energy);
      const out = [bold(shareTitle())];
      if (day.focus) out.push(`Focus: ${day.focus}`);
      if (energy || day.energy_note) out.push(`Energy: ${[energy && `${energy.bolts} ${energy.label}`, day.energy_note].filter(Boolean).join(' – ')}`);
      const section = (title, list) => { if (list.length) out.push('', bold(title), ...list.map(line)); };
      section('Plan', inDay);
      section(settings.evening_label || 'Evening plans', evening);
      section('Tasks', untimed);
      if ((day.notes || '').trim()) out.push('', bold('Notes'), mdTo(kind, day.notes).trim());
      return out.join('\n');
    }
    function dayHtml() {
      const endOfDay = toMin(settings.day_end) + step();
      const timed = items.filter(i => i.time).sort((a, b) => a.time.localeCompare(b.time));
      const groups = [['Plan', timed.filter(i => toMin(i.time) < endOfDay)], [settings.evening_label || 'Evening plans', timed.filter(i => toMin(i.time) >= endOfDay)], ['Tasks', items.filter(i => !i.time)]];
      const li = i => `<li>${i.done_at ? '☑' : '☐'} ${i.time ? `<b>${esc(fmt(i.time))}${i.end_time ? `–${esc(fmt(i.end_time))}` : ''}</b> ` : ''}${i.dropped_at ? `<s>${esc(i.title)}</s>` : esc(i.title)}${(i.notes || '').trim() ? `<div style="color:#666;font-size:90%">${toHtml(unlink(i.notes))}</div>` : ''}</li>`;
      const energy = ENERGY.find(e => e.id === day.energy);
      return `<h3>${esc(shareTitle())}</h3>`
        + (day.focus ? `<p><b>Focus:</b> ${esc(day.focus)}</p>` : '')
        + (energy || day.energy_note ? `<p><b>Energy:</b> ${esc([energy && `${energy.bolts} ${energy.label}`, day.energy_note].filter(Boolean).join(' – '))}</p>` : '')
        + groups.filter(([, l]) => l.length).map(([t, l]) => `<h4>${esc(t)}</h4><ul style="list-style:none;padding-left:0">${l.map(li).join('')}</ul>`).join('')
        + ((day.notes || '').trim() ? `<h4>Notes</h4>${toHtml(unlink(day.notes))}` : '');
    }
    async function shareDay(kind) {
      try {
        if (kind === 'rich' && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([dayHtml()], { type: 'text/html' }),
            'text/plain': new Blob([dayText('plain')], { type: 'text/plain' }),
          })]);
        } else {
          await navigator.clipboard.writeText(dayText(kind === 'whatsapp' ? 'whatsapp' : 'plain'));
        }
        toast({ plain: 'Copied as plain text', rich: 'Copied as rich text', whatsapp: 'Copied for WhatsApp' }[kind]);
      } catch {
        toast("Couldn't copy: the browser blocked the clipboard");
      }
    }
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-share]');
      if (!b) return;
      b.closest('details')?.removeAttribute('open');
      shareDay(b.dataset.share);
    });

    // ---------- clear the day ----------

    // Every item on this day (timed or not) goes to the Bin; Undo brings
    // them back. Focus, energy and notes stay.
    async function clearDay() {
      const all = await itemsFor(date);
      if (!all.length) return toast('Nothing on this day to clear');
      if (!await askYes(`Remove all ${all.length} item${all.length === 1 ? '' : 's'} from this day?`, { text: 'They go to the Bin, and you can undo.', ok: 'Clear the day', danger: true })) return;
      const now = new Date().toISOString();
      await store.updateMany('day_items', all.map(i => [i.id, { deleted_at: now }]));
      editing = null;
      selected.clear();
      await refresh();
      undoable(`Cleared ${all.length} item${all.length === 1 ? '' : 's'} (in the Bin)`, async () => {
        await store.updateMany('day_items', all.map(i => [i.id, { deleted_at: null }]));
        await refresh();
      });
    }

    // ---------- paper for many days ----------

    // This week (Mon–Sun) gets this page's paper, or every saved day gets
    // today's. A day following the default keeps following it. Undoable.
    async function resetPapers(week) {
      const name = p => (p ? PAPERS.find(x => x.id === p)?.label : `the default (${PAPERS.find(x => x.id === settings.paper_style)?.label})`);
      let paper;
      let dates;
      if (week) {
        paper = day.paper || null;
        const monday = addDays(date, -((parseDate(date).getDay() + 6) % 7));
        dates = Array.from({ length: 7 }, (_, n) => addDays(monday, n));
        if (!await askYes(`Give every day this week ${name(paper)} paper?`, { text: `${monday} to ${dates[6]}.`, ok: 'Change the week' })) return;
      } else {
        paper = (await getDay(isoDate()))?.paper || null;
        dates = (await store.list('days')).map(d => d.date);
        if (!dates.includes(isoDate())) dates.push(isoDate());
        if (!await askYes(`Give every page ${name(paper)} paper, the same as today?`, { text: "Days you haven't opened yet use the default paper from Settings.", ok: 'Change every page' })) return;
      }
      const before = [];
      for (const d of dates) {
        const old = (await getDay(d))?.paper || null;
        if (old === paper) continue;
        before.push([d, old]);
        await saveDay(d, { paper });
      }
      day = await getDay(date) || day;
      applyPaper();
      renderLines();
      renderPile();
      undoable(`Paper reset on ${before.length} day${before.length === 1 ? '' : 's'}`, async () => {
        for (const [d, old] of before) await saveDay(d, { paper: old });
        day = await getDay(date) || day;
        applyPaper();
        renderLines();
        renderPile();
      });
    }

    // ---------- navigation ----------

    const go = d => { location.hash = `#/planner/${d}`; };

    // After a sync: redraw this day from fresh data, keeping what's open.
    this.refresh = () => render();

    this.show = async d => {
      await flushDayNotes(); // the last few words typed are saved before the page changes
      date = /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : isoDate();
      editing = null;
      selected.clear();
      dumpDraft.restore(); // each day keeps its own unsaved "to place" text
      await render();
    };

    this.onKey = ev => {
      // Never while typing (a note is a contenteditable box, not an input) or with Ctrl/Alt/Shift/⌘ held:
      // ← and → move the cursor there, they don't change the day.
      if (ev.target.closest?.('input, textarea, select, [contenteditable]') || ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey || $('#cal').open || document.querySelector('dialog[open]')) return;
      if (ev.key === 'Escape' && selected.size) { clearSelection(); return; }
      if (ev.key === 'ArrowLeft') go(addDays(date, -1));
      if (ev.key === 'ArrowRight') go(addDays(date, 1));
      if (ev.key === 't') go(isoDate());
    };
    addEventListener('keydown', this.onKey, page);

    await render();
  },

  route([d]) {
    return this.show?.(d);
  },

  unmount() {
    this.gone?.abort();
    this.pills?.destroy();
    this.dockWatch?.disconnect();
    this.headWatch?.disconnect();
    clearInterval(this.nowTimer);
    this.bar?.remove();
    document.body.classList.remove('has-select-bar', 'is-dragging');
  },
};
