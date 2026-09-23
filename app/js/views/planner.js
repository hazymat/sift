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
import { loadAll as loadTasks, forDay, suggestions, doneFields, aimDate } from '../tasks.js';

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
          <div id="day-tasks"></div>
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
      el.classList.toggle('is-down-day', down);
    }

    function itemRow(i, label) {
      const span = i.end_time ? `${fmt(i.time)}–${fmt(i.end_time)}` : null;
      return `
        <div class="line has-item${i.done_at ? ' done' : ''}${selected.has(i.id) ? ' selected' : ''}" data-item="${i.id}"${i.time ? ` data-time="${i.time}"` : ''}>
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
      const timed = items.filter(i => i.time && !lifted.has(i.id));
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
      const pile = items.filter(i => !i.time && !lifted.has(i.id));
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

    // Tasks for this day: planned (start date), aim today, ongoing multi-day,
    // and energy-matched suggestions to adopt.
    let tasks = [];
    async function renderTasks() {
      tasks = (await loadTasks()).tasks;
      const { planned, aimed, ongoing } = forDay(tasks, date);
      const onPlan = new Set(items.map(i => i.task_id).filter(Boolean));
      const row = (t, note = '') => `
        <li data-task="${t.id}" class="${t.done_at ? 'done' : ''}">
          <input type="checkbox" class="task-tick" ${t.done_at ? 'checked' : ''} aria-label="Done">
          <a class="task-link" href="#/tasks/list${t.project_id ? `/${t.project_id}` : ''}">${esc(t.title)}</a>
          ${note ? `<span class="span-tag">${note}</span>` : ''}
          ${onPlan.has(t.id) ? '<span class="span-tag">on the plan</span>' : `<button type="button" class="small-btn" data-act="task-to-plan">To place</button>`}
        </li>`;
      const energy = ENERGY.find(e => e.id === day.energy);
      const ideas = suggestions(tasks, day.energy);
      const parts = [];
      if (planned.length) parts.push(`<ul class="day-task-list">${planned.map(t => row(t)).join('')}</ul>`);
      if (aimed.length) parts.push(`<h3>Aim is this day</h3><ul class="day-task-list">${aimed.map(t => row(t, '⚑ aim')).join('')}</ul>`);
      if (ongoing.length) {
        parts.push(`<h3>Ongoing</h3><ul class="day-task-list ongoing">${ongoing.map(t => {
          const total = Math.round((parseDate(aimDate(t)) - parseDate(t.start_date)) / 86400000) + 1;
          const n = Math.round((parseDate(date) - parseDate(t.start_date)) / 86400000) + 1;
          return row(t, `day ${n} of ${total}`);
        }).join('')}</ul>`);
      }
      if (energy && ideas.length) {
        parts.push(`<h3>${energy.label} energy ideas</h3><ul class="day-task-list ideas">${ideas.map(t => `
          <li data-task="${t.id}"><span class="task-link">${esc(t.title)}</span>
            <button type="button" class="small-btn" data-act="adopt">Adopt</button></li>`).join('')}</ul>`);
      } else if (energy) {
        parts.push(`<p class="muted hint">Tag tasks with ${energy.label.toLowerCase()} energy (${energy.hint.toLowerCase()}) and they'll be suggested here.</p>`);
      }
      $('#day-tasks').innerHTML = parts.join('') || '<p class="muted hint">No tasks for this day. In Tasks, use ⋯ → Plan for day, or set today\'s energy level for ideas.</p>';
    }

    async function render() {
      settings = await daySettings();
      [day, items] = await Promise.all([getDay(date), itemsFor(date)]);
      applyPaper();
      header();
      renderLines();
      renderPile();
      renderCarry();
      renderTasks();
    }

    async function refresh() {
      items = await itemsFor(date);
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
        renderTasks();
      } else if (act === 'prev') go(addDays(date, -1));
      else if (act === 'next') go(addDays(date, 1));
      else if (act === 'today') go(isoDate());
      else if (act === 'calendar') openCalendar(date);
      else if (act === 'add-at') openLine(t);
      else if (act === 'adopt' || act === 'task-to-plan') {
        const taskId = t.closest('[data-task]').dataset.task;
        const task = tasks.find(x => x.id === taskId);
        if (act === 'adopt') {
          await store.update('tasks', taskId, { start_date: date });
          await renderTasks();
          undoable(`Adopted "${task.title}"`, async () => { await store.update('tasks', taskId, { start_date: null }); renderTasks(); });
        } else {
          const made = await addItem(date, { title: task.title, task_id: taskId });
          await refresh();
          renderTasks();
          undoable(`"${task.title}" is in To place`, async () => { await store.remove('day_items', made.id); await refresh(); renderTasks(); });
        }
      }
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
      if (t.classList.contains('task-tick')) {
        const taskId = t.closest('[data-task]').dataset.task;
        await store.update('tasks', taskId, doneFields(t.checked));
        renderTasks();
        undoable(t.checked ? 'Task done' : 'Task not done', async () => { await store.update('tasks', taskId, doneFields(!t.checked)); renderTasks(); });
      } else if (t.classList.contains('tick') && id) {
        const item = items.find(i => i.id === id);
        await change(id, { done_at: t.checked ? new Date().toISOString() : null }, t.checked ? 'Done' : 'Not done');
        // A plan item that came from a task offers to tick the task too.
        if (t.checked && item?.task_id) {
          const task = await store.get('tasks', item.task_id);
          if (task && !task.done_at) {
            toast(`Done. Tick off the task "${task.title}" too?`, {
              action: 'Tick task',
              onAction: async () => { await store.update('tasks', task.id, doneFields(true)); renderTasks(); toast('✓ Task done'); },
            });
          }
        }
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
        const old = day.focus || '';
        if (t.value.trim() === old) return;
        const forDate = date;
        day = await saveDay(forDate, { focus: t.value.trim() });
        undoable('Day focus saved', async () => { const d = await saveDay(forDate, { focus: old }); if (forDate === date) { day = d; header(); } });
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

    // ---------- select, pick up and move; resize from the bottom handle ----------
    // ⠿ tap = select / deselect. ⠿ press and move = pick up (the selection if
    // this item is in it): the items leave the page and ride under the pointer,
    // and the lines they'd land on show a preview. Drop on a line = that
    // line's time (snaps to the line, never in between). Timed items keep
    // their spacing; untimed ones fill the following lines. Drop on To place =
    // no time. The bottom handle of a timed item drags its length.

    const selected = new Set();
    const lifted = new Set();
    const step = () => Math.max(5, Number(settings.slot_min) || 60);
    const duration = i => (i.end_time ? toMin(i.end_time) - toMin(i.time) : i.estimate_min || step());
    const eveningTime = () => fromMin(toMin(settings.day_end) + step());

    // Selection bar
    const bar = document.createElement('div');
    bar.className = 'select-bar';
    bar.hidden = true;
    bar.innerHTML = `<span class="select-count"></span>
      <button type="button" data-sel="done">Done</button>
      <button type="button" data-sel="pile">To place</button>
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
      if (b.dataset.sel === 'pile') await moveMany(new Map(ids.map(id => [id, { time: null, end_time: null }])), `${plural} back to To place`);
      if (b.dataset.sel === 'tomorrow') { await moveMany(new Map(ids.map(id => [id, { date: addDays(date, 1), carried_from: date }])), `${plural} moved to tomorrow`); clearSelection(); }
      if (b.dataset.sel === 'delete') { await moveMany(new Map(ids.map(id => [id, { deleted_at: new Date().toISOString() }])), `Deleted ${plural}`); clearSelection(); }
    });

    // Where a drop would land: the line under the middle of what's carried.
    function targetAt(y) {
      const pileBox = $('.pile').getBoundingClientRect();
      if (y >= pileBox.top && y <= pileBox.bottom) return { pile: true };
      for (const line of linesEl.querySelectorAll('.line[data-time]')) {
        const r = line.getBoundingClientRect();
        if (y >= r.top && y < r.bottom) return { line, time: line.dataset.time === 'evening' ? eveningTime() : line.dataset.time };
      }
      return null;
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

    function showPreview(target) {
      el.querySelectorAll('.drop-preview').forEach(n => n.remove());
      el.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target'));
      if (!target) { delete press.ghost.dataset.when; return; }
      if (target.pile) {
        $('#pile').classList.add('drop-target');
        press.ghost.dataset.when = 'To place';
        return;
      }
      press.ghost.dataset.when = fmt(target.time);
      for (const [id, f] of plan(target.time)) {
        const i = items.find(x => x.id === id);
        const line = [...linesEl.querySelectorAll('.line[data-time]')].find(l => (l.dataset.time === 'evening' ? eveningTime() : l.dataset.time) === f.time)
          || (toMin(f.time) >= toMin(eveningTime()) ? linesEl.querySelector('.line[data-time="evening"]') : null);
        if (!line) continue;
        line.classList.add('drop-target');
        line.querySelector('.content')?.insertAdjacentHTML('beforeend', `<span class="drop-preview hand">${esc(i.title)} <span class="span-tag">${fmt(f.time)}${f.end_time ? `–${fmt(f.end_time)}` : ''}</span></span>`);
      }
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
        resizing = { item, row, startY: ev.clientY, base: duration(item), minutes: duration(item) };
        row.classList.add('resizing');
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
      press.target = targetAt(ev.clientY);
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
      el.querySelectorAll('.drop-preview').forEach(n => n.remove());
      el.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target'));
      lifted.clear();
      const t = ev.type === 'pointerup' ? p.target : null;
      press = p; // plan() reads the carried ids
      const fields = t?.pile
        ? new Map(p.ids.map(id => [id, { time: null, end_time: null }]))
        : t ? plan(t.time) : null;
      press = null;
      const n = p.ids.length;
      if (!fields) { renderLines(); renderPile(); paintSelection(); return; }
      await moveMany(fields, t.pile ? `${n > 1 ? `${n} items` : 'Item'} back to To place` : `${n > 1 ? `Moved ${n} items` : 'Moved'} to ${fmt(t.time)}`);
    };
    el.addEventListener('pointerup', endPress);
    el.addEventListener('pointercancel', endPress);

    function resizeMove(ev) {
      el.querySelectorAll('.will-cover').forEach(n => n.classList.remove('will-cover'));
      const line = linesEl.querySelector('.line.blank') || resizing.row;
      const perPx = step() / line.getBoundingClientRect().height;
      const minutes = Math.max(15, Math.round((resizing.base + (ev.clientY - resizing.startY) * perPx) / 15) * 15);
      resizing.minutes = minutes;
      const start = toMin(resizing.item.time);
      const end = start + minutes;
      const tag = resizing.row.querySelector('.span-tag') || resizing.row.querySelector('.content').insertBefore(Object.assign(document.createElement('span'), { className: 'span-tag' }), resizing.row.querySelector('.more'));
      tag.textContent = `${fmt(resizing.item.time)}–${fmt(fromMin(end))}`;
      for (const l of linesEl.querySelectorAll('.line[data-time]')) {
        const t = l.dataset.time === 'evening' ? null : toMin(l.dataset.time);
        if (t != null && t > start && t < end) l.classList.add('will-cover');
      }
    }

    async function resizeEnd(ev) {
      const r = resizing;
      resizing = null;
      el.querySelectorAll('.will-cover').forEach(n => n.classList.remove('will-cover'));
      r.row.classList.remove('resizing');
      if (ev.type === 'pointercancel') return renderLines();
      const end = fromMin(toMin(r.item.time) + r.minutes);
      if (end !== r.item.end_time) await change(r.item.id, { end_time: end }, `Until ${fmt(end)}`);
      else renderLines();
    }

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
      selected.clear();
      $('#dump').value = '';
      await render();
    };

    this.onKey = ev => {
      if (ev.target.closest('input, textarea, select') || $('#cal').open) return;
      if (ev.key === 'Escape' && selected.size) { clearSelection(); return; }
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
    this.bar?.remove();
    document.body.classList.remove('has-select-bar', 'is-dragging');
    removeEventListener('keydown', this.onKey);
  },
};
