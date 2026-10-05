// A Day Planner item's full panel (More / ⋯): details, energy, note, files, comments
// and its actions. The same panel in the Day Planner and in Advanced day tasks; each
// view wires its own buttons (data-act) and fields (name=…, data-item-energy).
//
//   dayPanelHtml(item, { atts, durationMax, linked })
//     atts: the item's attachments; durationMax: daySettings' duration_max_min;
//     linked: brought in from Tasks or a project (adds Make unique)

import { ENERGY, durationChoices, durationLabel } from './days.js';
import * as att from './attachments.js';
import { commentsHtml } from './comments.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Time and Until only on the schedule: a day task gets its time by being dragged onto it.
export function dayPanelHtml(i, { atts = [], durationMax, linked = false } = {}) {
  const mins = [...new Set([...durationChoices(durationMax), ...(i.estimate_min ? [Number(i.estimate_min)] : [])])].sort((a, b) => a - b);
  return `
    <div class="item-details" data-for="${i.id}">
      <div class="panel-sec detail-sec wide"><span class="panel-h">Details</span><div class="detail-grid">
      ${i.time ? `<label>Time<input type="time" name="time" value="${i.time}"></label>
      <label>Until<input type="time" name="end_time" value="${i.end_time || ''}"></label>` : ''}
      <label>Estimated time<select name="estimate_min">
        <option value="" ${!i.estimate_min && !i.estimate_unsure ? 'selected' : ''}>Not estimated</option>
        <option value="unsure" ${i.estimate_unsure && !i.estimate_min ? 'selected' : ''}>Not sure yet</option>
        ${mins.map(m => `<option value="${m}" ${Number(i.estimate_min) === m ? 'selected' : ''}>${durationLabel(m)}</option>`).join('')}
      </select></label>
      <label>Move to another day<input type="date" name="date" value="${i.date}"></label>
      </div>
      <div class="energy-pick" role="group" aria-label="Energy"><span>Energy</span>
        ${ENERGY.map(e => `<button type="button" class="bolts" data-item-energy="${e.id}" aria-pressed="${i.energy === e.id}" title="${esc(`${e.label}: ${e.hint}`)}" aria-label="${e.label}">${e.bolts}</button>`).join('')}
      </div></div>
      <div class="wide detail-note"><span class="field-label">Note</span><div class="detail-notes" data-note-for="${i.id}"></div></div>
      <div class="wide">${att.rowHtml(atts, { parent: i.id })}</div>
      <div class="wide">${commentsHtml(i.task_id ? { task_id: i.task_id } : { item_id: i.id })}</div>
      <div class="detail-actions">
        ${i.time ? '<button type="button" data-act="unschedule" title="Remove the start and end time and put it back in To place">Unallocate time</button>' : ''}
        ${i.dropped_at
          ? '<button type="button" data-act="take-back" title="It needs doing after all">Take back</button>'
          : i.done_at ? '' : '<button type="button" data-act="let-go" title="Didn\'t do it and it doesn\'t need doing any more">Let go</button>'}
        <button type="button" data-act="to-task" title="Take it off this day and keep it as a task">→ Tasks</button>
        ${linked ? '<button type="button" data-act="make-unique" title="Keep only this copy: the original leaves Tasks or its project">Make unique</button>' : ''}
        <button type="button" data-act="archive-item" title="Take it off this day into the Archive">Archive</button>
        <button type="button" class="danger" data-act="delete">Delete</button>
      </div>
    </div>`;
}
