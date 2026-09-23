// Day Planner: a day's battle plan on lined paper. #/planner/<YYYY-MM-DD>
// Title, Day Focus, energy; half-hourly lines (settings) with anything at an
// odd time slotted in as its own line; evening below; a pile for things not
// yet given a time (fed by the dump box); notes. Calendar popup for any date.

import * as store from '../store.js';
import {
  daySettings, ENERGY, PAPERS, isoDate, parseDate, addDays, toMin, fromMin, showTime, parseTimed,
  getDay, saveDay, itemsFor, addItem, unfinishedBefore, datesWithContent,
} from '../days.js';
import { listEntry, listHint } from '../listentry.js';
import { toast, undoable } from '../toast.js';
import { richText } from '../richtext.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default {
  async mount(el) {
    let date = isoDate();
    let settings = await daySettings();
    let items = [];
    let day = null;
    let editing = null; // item id whose details are open
    let calMonth = null;

    el.innerHTML = `<div class="planner" data-paper="notebook">
      <div class="day-nav">
        <button type="button" data-act="prev" aria-label="Previous day">‹</button>
        <button type="button" data-act="today">Today</button>
        <button type="button" data-act="next" aria-label="Next day">›</button>
        <button type="button" data-act="calendar" class="cal-btn">Calendar</button>
        <label class="paper-pick" title="Page style for this day">Paper
          <select id="paper-style"></select>
        </label>
      </div>
      <header class="day-head">
        <h1 class="day-title"><span class="weekday"></span> <span class="date"></span></h1>
        <p class="day-rel muted"></p>
        <div class="down-day" hidden></div>
        <label class="focus"><span>Day focus</span><input id="focus" placeholder="What matters today?" autocomplete="off"></label>
        <div class="energy" role="group" aria-label="Today's energy level"><span>Today's Energy Level</span>
          ${ENERGY.map(e => `<button type="button" data-energy="${e.id}" title="${esc(e.hint)}">${e.label}</button>`).join('')}
        </div>
      </header>
      <div class="carry" hidden></div>
      <section class="paper" aria-label="Plan"><div id="lines"></div></section>
      <section class="pile">
        <h2>To place</h2>
        <ul id="pile" class="pile-list"></ul>
        <textarea id="dump" class="list-entry hand" rows="3" placeholder="What do you want to get done?"></textarea>
        <p class="muted hint">${listHint({ subItems: false })} Start a line with a time (12.45) to put it straight on the plan.</p>
      </section>
      <div class="day-bottom">
        <section class="day-tasks">
          <h2>Tasks</h2>
          <p class="muted" id="tasks-note"></p>
        </section>
        <section class="day-notes">
          <h2>Notes</h2>
          <div id="notes"></div>
        </section>
      </div>
      </div>
      <dialog class="sheet cal-sheet" id="cal" aria-label="Pick a date"></dialog>`;

    const $ = s => el.querySelector(s);
    const linesEl = $('#lines');

    // Notes save as you type (debounced); the date is captured so a quick
    // day change can't write one day's notes into another.
    let notesTimer;
    const notes = richText($('#notes'), {
      placeholder: 'Anything about today…',
      onChange: md => {
        clearTimeout(notesTimer);
        const forDate = date;
        notesTimer = setTimeout(async () => {
          const saved = await saveDay(forDate, { notes: md });
          if (forDate === date) day = saved;
        }, 600);
      },
    });
    const planner = $('.planner');
    let fmt = showTime; // 8.30, or 08:30 on techie paper

    function applyPaper() {
      const paper = day.paper || settings.paper_style;
      planner.dataset.paper = paper;
      fmt = paper === 'techie' ? t => t : showTime;
      const sel = $('#paper-style');
      sel.innerHTML = `<option value="">Default (${PAPERS.find(p => p.id === settings.paper_style)?.label || ''})</option>`
        + PAPERS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
      sel.value = day.paper || '';
    }

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
      notes.setValue(day.notes || '');
      const energy = ENERGY.find(e => e.id === day.energy);
      $('#tasks-note').textContent = `Tasks started or due on this day will show here once Tasks is built.${energy ? ` With ${energy.label.toLowerCase()} energy, Sift will suggest ${energy.hint.toLowerCase()}.` : ''}`;
      el.classList.toggle('is-down-day', down);
    }

    function itemRow(i, label) {
      const span = i.end_time ? `${fmt(i.time)}–${fmt(i.end_time)}` : null;
      return `
        <div class="line has-item${i.done_at ? ' done' : ''}" data-item="${i.id}"${i.time ? ` data-time="${i.time}"` : ''}>
          <span class="margin">${label ?? ''}</span>
          <span class="content">
            <button type="button" class="drag-grip" aria-label="Drag to a time" title="Drag onto a time">⠿</button>
            <input type="checkbox" class="tick" aria-label="Done" ${i.done_at ? 'checked' : ''}>
            <input class="item-title hand" value="${esc(i.title)}" aria-label="Item" autocomplete="off">
            ${span ? `<span class="span-tag">${span}</span>` : i.estimate_min ? `<span class="span-tag">~${i.estimate_min} min</span>` : ''}
            <button type="button" class="more" data-act="details" aria-label="Details">⋯</button>
          </span>
          ${i.time ? '<span class="resize-grip" title="Drag down to set how long" aria-hidden="true"></span>' : ''}
        </div>
        ${editing === i.id ? details(i) : ''}`;
    }

    function details(i) {
      return `
        <div class="item-details" data-for="${i.id}">
          <label>Time<input type="time" name="time" value="${i.time || ''}"></label>
          <label>Until<input type="time" name="end_time" value="${i.end_time || ''}"></label>
          <label>Estimate<select name="estimate_min">
            ${['', 15, 30, 45, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${String(i.estimate_min ?? '') === String(m) ? 'selected' : ''}>${m ? `${m} min` : '—'}</option>`).join('')}
          </select></label>
          <label>Day<input type="date" name="date" value="${i.date}"></label>
          <label class="wide">Note<input name="notes" value="${esc(i.notes)}" autocomplete="off"></label>
          <div class="detail-actions">
            ${i.time ? '<button type="button" data-act="unschedule">Back to pile</button>' : ''}
            <button type="button" class="danger" data-act="delete">Delete</button>
          </div>
        </div>`;
    }

    function emptyRow(time, label, cls = '') {
      return `<div class="line blank ${cls}" data-time="${time}"><span class="margin">${label}</span><span class="content" data-act="add-at"></span></div>`;
    }

    function renderLines() {
      const start = toMin(settings.day_start);
      const end = toMin(settings.day_end);
      const step = Math.max(5, Number(settings.slot_min) || 30);
      const timed = items.filter(i => i.time);
      const at = t => toMin(t);
      const out = [];

      // Before the day starts
      const early = timed.filter(i => at(i.time) < start);
      if (early.length) out.push(...early.map(i => itemRow(i, fmt(i.time))));

      // Covered = inside another item's span, shown as a bracket instead of an empty line
      const spans = timed.map(i => [at(i.time), i.end_time ? at(i.end_time) : i.estimate_min ? at(i.time) + i.estimate_min : at(i.time)]);
      const covered = t => spans.some(([a, b]) => t > a && t < b);

      for (let t = start; t <= end; t += step) {
        const here = timed.filter(i => at(i.time) >= t && at(i.time) < t + step && at(i.time) <= end + step - 1);
        const onLine = here.filter(i => at(i.time) === t);
        const between = here.filter(i => at(i.time) !== t);
        const label = fmt(fromMin(t));
        if (onLine.length) out.push(...onLine.map((i, n) => itemRow(i, n ? '' : label)));
        else out.push(emptyRow(fromMin(t), label, covered(t) ? 'covered' : ''));
        out.push(...between.map(i => itemRow(i, fmt(i.time))));
      }

      // Evening: anything after the last line's slot
      const evening = timed.filter(i => at(i.time) >= end + step);
      out.push(`<div class="line section-label"><span class="margin"></span><span class="content">Evening</span></div>`);
      out.push(...evening.map(i => itemRow(i, fmt(i.time))));
      out.push(`<div class="line blank" data-time="evening"><span class="margin"></span><span class="content" data-act="add-at"></span></div>`);
      linesEl.innerHTML = out.join('');
    }

    function renderPile() {
      const pile = items.filter(i => !i.time);
      $('#pile').innerHTML = pile.map(i => `<li>${itemRow(i, '')}</li>`).join('')
        || '<li class="muted pile-empty">Nothing waiting. Dump things below, then give them times.</li>';
    }

    async function renderCarry() {
      const carry = await unfinishedBefore(date);
      const box = $('.carry');
      box.hidden = !carry.length || date < isoDate();
      if (!box.hidden) {
        box.innerHTML = `<span>${carry.length} unfinished from earlier days</span>
          <button type="button" data-act="carry">Bring them here</button>`;
      }
    }

    async function render() {
      settings = await daySettings();
      [day, items] = await Promise.all([getDay(date), itemsFor(date)]);
      applyPaper();
      header();
      renderLines();
      renderPile();
      renderCarry();
    }

    async function refresh() {
      items = await itemsFor(date);
      renderLines();
      renderPile();
    }

    // ---------- editing ----------

    async function create(fields) {
      const made = await addItem(date, fields);
      await refresh();
      undoable(`Added "${made.title}"`, async () => { await store.remove('day_items', made.id); await refresh(); });
      return made;
    }

    async function change(id, fields, label = 'Saved') {
      const before = await store.get('day_items', id);
      const old = Object.fromEntries(Object.keys(fields).map(k => [k, before[k] ?? null]));
      await store.update('day_items', id, fields);
      await refresh();
      undoable(label, async () => { await store.update('day_items', id, old); await refresh(); });
    }

    // Inline input on an empty line: Enter adds an item at that time.
    function openLine(content) {
      const line = content.closest('.line');
      if (line.querySelector('input')) return;
      const time = line.dataset.time === 'evening' ? fromMin(toMin(settings.day_end) + Number(settings.slot_min)) : line.dataset.time;
      content.innerHTML = '<input class="item-title hand new-line" placeholder="…" autocomplete="off">';
      const input = content.querySelector('input');
      input.focus();
      let finished = false;
      const finish = async save => {
        if (finished) return; // Enter then blur would otherwise save twice
        finished = true;
        const text = input.value.trim();
        input.remove();
        if (save && text) {
          const parsed = parseTimed(text);
          await create({ title: parsed.title, time: parsed.time || time, end_time: parsed.end_time });
        }
      };
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); }
      });
      input.addEventListener('blur', () => finish(true), { once: true });
    }

    el.addEventListener('click', async ev => {
      const t = ev.target.closest('[data-act], [data-energy]');
      if (!t) return;
      const itemEl = t.closest('[data-item], [data-for]');
      const id = itemEl?.dataset.item || itemEl?.dataset.for;
      const act = t.dataset.act;
      if (t.dataset.energy) {
        const energy = day.energy === t.dataset.energy ? null : t.dataset.energy;
        day = await saveDay(date, { energy });
        header();
      } else if (act === 'prev') go(addDays(date, -1));
      else if (act === 'next') go(addDays(date, 1));
      else if (act === 'today') go(isoDate());
      else if (act === 'calendar') openCalendar(date);
      else if (act === 'add-at') openLine(t);
      else if (act === 'details') { editing = editing === id ? null : id; refresh(); }
      else if (act === 'unschedule') { editing = null; await change(id, { time: null, end_time: null }, 'Back to the pile'); }
      else if (act === 'delete') {
        editing = null;
        const gone = items.find(i => i.id === id);
        await store.remove('day_items', id);
        await refresh();
        undoable(`Deleted "${gone?.title || 'item'}"`, async () => { await store.restore('day_items', id); await refresh(); });
      } else if (act === 'carry') {
        const carry = await unfinishedBefore(date);
        const moves = carry.map(i => [i.id, { date, time: null, end_time: null, carried_from: i.date }]);
        const back = carry.map(i => [i.id, { date: i.date, time: i.time, end_time: i.end_time, carried_from: i.carried_from ?? null }]);
        await store.updateMany('day_items', moves);
        await render();
        undoable(`Brought over ${carry.length}`, async () => { await store.updateMany('day_items', back); await render(); });
      }
    });

    el.addEventListener('change', async ev => {
      const t = ev.target;
      const itemEl = t.closest('[data-item], [data-for]');
      const id = itemEl?.dataset.item || itemEl?.dataset.for;
      if (t.classList.contains('tick') && id) {
        await change(id, { done_at: t.checked ? new Date().toISOString() : null }, t.checked ? 'Done' : 'Not done');
      } else if (t.classList.contains('item-title') && id) {
        if (t.value.trim()) await change(id, { title: t.value.trim() });
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
      } else if (t.id === 'focus') {
        day = await saveDay(date, { focus: t.value.trim() });
        toast('✓ Saved');
      }
    });

    // Dump box → pile (or straight onto the plan when a line starts with a time).
    listEntry($('#dump'), async lines => {
      const made = [];
      for (const line of lines) {
        const p = parseTimed(line.text);
        made.push(await addItem(date, { title: p.title, time: p.time, end_time: p.end_time }));
      }
      await refresh();
      undoable(`Added ${made.length} item${made.length === 1 ? '' : 's'}`, async () => {
        await store.updateMany('day_items', made.map(m => [m.id, { deleted_at: new Date().toISOString() }]));
        await refresh();
      });
    });

    // ---------- drag onto a time; drag the bottom handle to set length ----------

    const QUARTER = 15;
    let drag = null;
    const step = () => Math.max(5, Number(settings.slot_min) || 60);
    const duration = i => (i.end_time ? toMin(i.end_time) - toMin(i.time) : i.estimate_min || step());

    // Time under the pointer: a line's own time, plus quarter hours through a slot line.
    function timeAt(y) {
      for (const line of linesEl.querySelectorAll('.line[data-time]')) {
        const r = line.getBoundingClientRect();
        if (y < r.top || y >= r.bottom) continue;
        if (line.dataset.time === 'evening') return { line, time: fromMin(toMin(settings.day_end) + step()) };
        const base = toMin(line.dataset.time);
        const slot = line.classList.contains('blank') ? step() : 0;
        const extra = slot ? Math.min(slot - QUARTER, Math.floor(((y - r.top) / r.height) * slot / QUARTER) * QUARTER) : 0;
        return { line, time: fromMin(base + Math.max(0, extra)) };
      }
      return null;
    }

    const clearMarks = () => el.querySelectorAll('.drop-target, .will-cover').forEach(n => n.classList.remove('drop-target', 'will-cover'));

    el.addEventListener('pointerdown', ev => {
      const grip = ev.target.closest('.drag-grip, .resize-grip');
      if (!grip || ev.button > 0) return;
      ev.preventDefault();
      const row = grip.closest('[data-item]');
      const item = items.find(i => i.id === row.dataset.item);
      if (!item) return;
      try { grip.setPointerCapture(ev.pointerId); } catch {}
      if (grip.classList.contains('resize-grip')) {
        drag = { mode: 'resize', item, row, startY: ev.clientY, base: duration(item), minutes: duration(item) };
        row.classList.add('resizing');
        return;
      }
      const r = row.getBoundingClientRect();
      const ghost = row.cloneNode(true);
      ghost.classList.add('drag-float');
      Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
      el.querySelector('.planner').append(ghost);
      row.classList.add('drag-source');
      drag = { mode: 'move', item, row, ghost, dy: ev.clientY - r.top, target: null };
    });

    el.addEventListener('pointermove', ev => {
      if (!drag) return;
      clearMarks();
      if (drag.mode === 'move') {
        drag.ghost.style.top = `${ev.clientY - drag.dy}px`;
        const overPile = $('.pile').getBoundingClientRect();
        if (ev.clientY >= overPile.top && ev.clientY <= overPile.bottom) {
          drag.target = { pile: true };
          $('#pile').classList.add('drop-target');
          drag.ghost.dataset.when = 'To place';
          return;
        }
        const hit = timeAt(ev.clientY);
        drag.target = hit;
        if (hit) { hit.line.classList.add('drop-target'); drag.ghost.dataset.when = fmt(hit.time); } else delete drag.ghost.dataset.when;
        return;
      }
      // resize: minutes per pixel from the height of one slot line
      const line = linesEl.querySelector('.line.blank') || drag.row;
      const perPx = step() / line.getBoundingClientRect().height;
      const minutes = Math.max(QUARTER, Math.round((drag.base + (ev.clientY - drag.startY) * perPx) / QUARTER) * QUARTER);
      drag.minutes = minutes;
      const start = toMin(drag.item.time);
      const end = start + minutes;
      const tag = drag.row.querySelector('.span-tag') || drag.row.querySelector('.content').insertBefore(Object.assign(document.createElement('span'), { className: 'span-tag' }), drag.row.querySelector('.more'));
      tag.textContent = `${fmt(drag.item.time)}–${fmt(fromMin(end))}`;
      for (const l of linesEl.querySelectorAll('.line[data-time]')) {
        const t = l.dataset.time === 'evening' ? null : toMin(l.dataset.time);
        if (t != null && t > start && t < end) l.classList.add('will-cover');
      }
    });

    const endDrag = async ev => {
      if (!drag) return;
      const d = drag;
      drag = null;
      clearMarks();
      d.ghost?.remove();
      d.row.classList.remove('drag-source', 'resizing');
      if (ev.type === 'pointercancel') { renderLines(); return; }
      if (d.mode === 'resize') {
        const end = fromMin(toMin(d.item.time) + d.minutes);
        if (end !== d.item.end_time) await change(d.item.id, { end_time: end }, `Until ${fmt(end)}`);
        else renderLines();
        return;
      }
      if (!d.target) return;
      if (d.target.pile) {
        if (d.item.time) await change(d.item.id, { time: null, end_time: null }, 'Back to the pile');
        return;
      }
      const time = d.target.time;
      if (time === d.item.time) return;
      const fields = { time };
      if (d.item.time && d.item.end_time) fields.end_time = fromMin(toMin(time) + duration(d.item));
      await change(d.item.id, fields, `Moved to ${fmt(time)}`);
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

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

    // ---------- navigation ----------

    const go = d => { location.hash = `#/planner/${d}`; };

    this.show = async d => {
      date = /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : isoDate();
      editing = null;
      $('#dump').value = '';
      await render();
    };

    this.onKey = ev => {
      if (ev.target.closest('input, textarea, select') || $('#cal').open) return;
      if (ev.key === 'ArrowLeft') go(addDays(date, -1));
      if (ev.key === 'ArrowRight') go(addDays(date, 1));
      if (ev.key === 't') go(isoDate());
    };
    addEventListener('keydown', this.onKey);

    await render();
  },

  route([d]) {
    return this.show?.(d);
  },

  unmount() {
    removeEventListener('keydown', this.onKey);
  },
};
