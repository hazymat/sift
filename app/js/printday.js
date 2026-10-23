// Print this day (the Day Planner's Share, Advanced's Share sheet): a day sheet to fill in with a pen.
// Schedule down the left, the day's tasks and blank lines to add more on the right, Day focus and Energy at the
// top, then Notes across the whole width (blank, for writing and doodling, unless there are notes to print).
// It prints on an empty day too: every line blank.
import { openPrint, esc } from './print.js';
import { getDay, itemsFor, addDays, parseDate, dateText, toMin, showTime, ENERGY } from './days.js';
import { word } from './words.js';

const CSS = `
.day { padding: 7% 7.5% 6%; display: flex; flex-direction: column; }
.dh { display: flex; align-items: baseline; gap: .9em; border-bottom: .16em solid var(--ink); padding-bottom: .3em; }
.dh .wd { font-size: 3.1em; font-weight: 700; line-height: 1; }
.dh .dt { font-size: 1.9em; font-weight: 600; color: var(--accent); }
.dh .tag { margin-left: auto; font-size: .7em; letter-spacing: .14em; color: var(--soft); }
.fe { display: flex; gap: 2em; margin: 1.1em 0 1.3em; font-size: 1.05em; }
.fe > div { border-bottom: 1px solid var(--rule); padding-bottom: .3em; min-height: 1.9em; }
.fe .focus { flex: 1.5; } .fe .energy { flex: 1; display: flex; gap: .9em; align-items: baseline; }
.fe .lab { font-family: Georgia, serif; letter-spacing: .08em; font-size: .85em; margin-right: .6em; }
.focus .lab { color: #c4615f; } .energy .lab { color: #3f8f5f; }
.bw .focus .lab, .bw .energy .lab { color: var(--ink); }
.bolt { padding: .05em .35em; border-radius: 1em; border: .1em solid transparent; }
.bolt.on { border-color: var(--ink); }
.bw .bolt { filter: grayscale(1); }
h2 { font: 700 1.55em Georgia, serif; color: #a07d1c; margin: 0 0 .35em; }
.bw h2 { color: var(--ink); }
.main { flex: 1 1 0; min-height: 0; display: flex; gap: 2.2em; }
.sched { flex: 1.25; display: flex; flex-direction: column; min-height: 0; }
.hours { flex: 1; position: relative; border-top: 1px solid var(--rule); display: flex; flex-direction: column; }
.hour { flex: 1; display: flex; border-bottom: 1px solid var(--rule); min-height: 0; }
.hour .t { width: 3.7em; text-align: right; padding: .2em .6em 0 0; font: .95em Georgia, serif; color: var(--soft); border-right: .12em solid #e3a3a3; }
.bw .hour .t { border-right-color: var(--rule); }
.hour .half { flex: 1; position: relative; }
.hour .half::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dotted #c3cbd8; }
.nohalf .hour .half::after { display: none; }
.ev { position: absolute; left: 4.3em; right: .4em; padding: .15em .6em; border-left: .25em solid var(--accent); background: var(--fill); font-size: .95em; overflow: hidden; line-height: 1.25; }
.bw .ev { border: 1px solid var(--ink); border-left-width: .25em; }
.ev small { color: var(--soft); font-size: .8em; margin-left: .3em; }
.ev.cal { border-left-style: dashed; background: transparent; border-top: 1px dashed var(--rule); }
.ev.done b { text-decoration: line-through; color: var(--soft); }
.tasks { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.tl { flex: 1; display: flex; flex-direction: column; border-top: 1px solid var(--rule); min-height: 0; }
.tr { display: flex; align-items: flex-end; gap: .7em; border-bottom: 1px solid var(--rule); padding-bottom: .45em; height: 2.4em; flex: none; font-size: 1.05em; }
.tr.blank { height: auto; flex: 1 1 3em; min-height: 2.7em; max-height: 3.4em; }
.box { width: 1em; height: 1em; border: .12em solid var(--ink); border-radius: .2em; flex: none; display: inline-flex; align-items: center; justify-content: center; font-size: .9em; line-height: 1; }
.tr.done span:last-child { text-decoration: line-through; color: var(--soft); }
.notes { flex: 0 0 24%; display: flex; flex-direction: column; margin-top: 1.3em; min-height: 0; }
.notes .space { flex: 1; border: 1px solid var(--rule); border-radius: .5em; padding: .6em .8em; white-space: pre-wrap; font-size: 1em; overflow: hidden; }`;

const HOURS = Array.from({ length: 25 }, (_, h) => [h, `${h}.00`]);

export async function printDay(date, back = 'Day Planner') {
  const titleOf = d => dateText(parseDate(d), { weekday: 'long', day: 'numeric', month: 'long' });
  return openPrint({
    kind: 'day', title: titleOf(date), back,
    defaults: { days: 1, from: 7, to: 22, half: true, cal: true, tasks: true, ticked: true, blank: 12, top: true, notes: true, old_notes: false, paper: 'A5' },
    options: [
      ['Days'], { seg: 'days', items: [[1, 'This day'], [3, 'Next 3 days'], [7, 'This week']], hint: 'One page per day.' },
      ['Schedule'], { select: 'from', words: 'From', items: HOURS.slice(0, 24) }, { select: 'to', words: 'To', items: HOURS.slice(1) },
      { check: 'half', words: 'Half-hour lines' }, { check: 'cal', words: 'Google Calendar events' },
      ['Tasks'], { check: 'tasks', words: "This day's tasks" }, { check: 'ticked', words: 'Ticked ones (crossed out)' }, { range: 'blank', words: 'Blank lines', min: 0, max: 25 },
      ['Also'], { check: 'top', words: `${word('day_focus')} and Energy` }, { check: 'notes', words: 'Notes space (blank, to write or doodle)' }, { check: 'old_notes', words: "What's already in this day's Notes" },
    ],
    build: async ch => {
      const from = Math.min(ch.from, ch.to - 1), to = Math.max(ch.to, from + 1);
      let gcal = null;
      if (ch.cal) try { gcal = await import('./gcal.js'); } catch { /* offline */ }
      const pages = [];
      for (let n = 0; n < ch.days; n++) {
        const d = addDays(date, n);
        const day = await getDay(d);
        const items = (await itemsFor(d)).filter(i => !i.dropped_at);
        const minutes = t => toMin(t) - from * 60, span = (to - from) * 60;
        const box = (startMin, endMin, html, cls) => {
          const top = Math.max(0, startMin), bottom = Math.min(span, endMin);
          return bottom <= 0 || top >= span ? '' : `<div class="ev ${cls}" style="top:${(top / span * 100).toFixed(2)}%;height:${((Math.max(bottom, top + 20) - top) / span * 100).toFixed(2)}%">${html}</div>`;
        };
        const timed = items.filter(i => i.time).map(i => box(minutes(i.time), i.end_time ? minutes(i.end_time) : minutes(i.time) + 30,
          `<b>${esc(i.title)}</b><small>${esc(showTime(i.time))}${i.end_time ? `–${esc(showTime(i.end_time))}` : ''}</small>`, i.done_at ? 'done' : ''));
        const events = (gcal && ch.cal ? (await gcal.dayEvents(d)) || [] : []).filter(e => !e.allDay).map(e => {
          const local = iso => { const t = new Date(iso); return t.getHours() * 60 + t.getMinutes(); };
          return box(local(e.start) - from * 60, local(e.end) - from * 60, `${esc(e.title)}<small>${esc(showTime(`${new Date(e.start).getHours()}:${String(new Date(e.start).getMinutes()).padStart(2, '0')}`))}</small>`, 'cal');
        });
        const hours = Array.from({ length: to - from }, (_, k) => `<div class="hour"><div class="t">${from + k}.00</div><div class="half"></div></div>`).join('');
        const tasks = ch.tasks ? items.filter(i => !i.time && (ch.ticked || !i.done_at)) : [];
        const rows = tasks.map(i => `<div class="tr${i.done_at ? ' done' : ''}"><span class="box">${i.done_at ? '✓' : ''}</span><span>${esc(i.title)}</span></div>`).join('')
          + '<div class="tr blank"><span class="box"></span></div>'.repeat(ch.blank);
        const energy = ENERGY.map(e => `<span class="bolt${day.energy === e.id ? ' on' : ''}">${e.bolts}</span>`).join('');
        const p = parseDate(d);
        pages.push(`<section class="sheet day${ch.half ? '' : ' nohalf'}">
          <header class="dh"><span class="wd serif">${esc(dateText(p, { weekday: 'long' }))}</span><span class="dt">${esc(dateText(p, { day: 'numeric', month: 'long', year: 'numeric' }))}</span><span class="tag">SIFT · DAY SHEET</span></header>
          ${ch.top ? `<div class="fe"><div class="focus"><span class="lab">${esc(word('day_focus').toUpperCase())}</span>${esc(day.focus || '')}</div><div class="energy"><span class="lab">ENERGY</span>${energy}</div></div>` : '<div style="height:1em"></div>'}
          <div class="main"><div class="sched"><h2>Schedule</h2><div class="hours">${hours}${events.join('')}${timed.join('')}</div></div>
            <div class="tasks"><h2>Tasks</h2><div class="tl">${rows}</div></div></div>
          ${ch.notes || (ch.old_notes && day.notes) ? `<div class="notes"><h2>Notes</h2><div class="space">${ch.old_notes ? esc(plain(day.notes)) : ''}</div></div>` : ''}
        </section>`);
      }
      return { css: CSS, html: pages.join(''), count: `${ch.days} ${ch.days === 1 ? 'page' : 'pages'}`, note: 'An empty day still prints, every line blank' };
    },
  });
}

// A day's notes are rich text: just their words for paper.
const plain = html => { const div = document.createElement('div'); div.innerHTML = String(html || '').replace(/<(br|\/p|\/div|\/li)>/gi, '\n$&'); return div.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
