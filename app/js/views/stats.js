// Usage stats: for the Sift server's owner only (the server says who may see them).
// Reached from Settings, This device. Everything is worked out here from the raw tallies.
import * as store from '../store.js';
import { STATS_SERVER } from '../stats.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DAY_MS = 864e5;
const AREA_NAMES = { dump: 'Brain Dump', tasks: 'Tasks', projects: 'Projects', planner: 'Day Planner', lists: 'Lists', 'find-things': 'Find Things', places: 'Find Things', contacts: 'Contacts', scans: 'Scans', contracts: 'Contracts', recipes: 'Batch Book', bin: 'Archive and Bin', settings: 'Settings', history: 'History', welcome: 'Welcome', stats: 'Usage stats', home: 'Home' };
const areaName = id => AREA_NAMES[id] || id;
const mins = s => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);
const pct = (n, of) => (of ? `${Math.round((100 * n) / of)}%` : '-');
const dateOf = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const sum = list => list.reduce((total, n) => total + n, 0);
const tally = (list, keyOf) => { const out = {}; for (const item of list) { const key = keyOf(item); if (key != null) out[key] = (out[key] || 0) + 1; } return out; };
const merge = (bags) => { const out = {}; for (const bag of bags) for (const [key, n] of Object.entries(bag || {})) out[key] = (out[key] || 0) + n; return out; };
const isoDay = ms => new Date(ms).toLocaleDateString('en-CA');

// A bar per row, longest first unless kept in order.
function bars(counts, { label = key => key, value = n => n, ordered = false, limit = 30 } = {}) {
  const rows = Object.entries(counts);
  if (!ordered) rows.sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<p class="muted">Nothing yet</p>';
  const most = Math.max(...rows.map(row => row[1]), 1);
  return `<div class="stats-bars">${rows.slice(0, limit).map(([key, n]) => `<div class="stats-bar"><span class="stats-bar-label">${esc(label(key))}</span><span class="stats-bar-track"><span style="width:${(100 * n) / most}%"></span></span><span class="stats-bar-n">${esc(value(n))}</span></div>`).join('')}</div>`;
}
// Columns in order (days, hours): a small chart, the number on hover.
function columns(counts, { label = key => key, value = n => n } = {}) {
  const rows = Object.entries(counts);
  const most = Math.max(...rows.map(row => row[1]), 1);
  return `<div class="stats-cols">${rows.map(([key, n]) => `<span title="${esc(label(key))}: ${esc(value(n))}"><span style="height:${(100 * n) / most}%"></span></span>`).join('')}</div><div class="stats-cols-ends muted"><span>${esc(label(rows[0]?.[0] ?? ''))}</span><span>most ${esc(value(most))}</span><span>${esc(label(rows.at(-1)?.[0] ?? ''))}</span></div>`;
}
const card = (title, body, hint = '') => `<section class="card stats-card"><h2>${esc(title)}</h2>${hint ? `<p class="muted hint">${esc(hint)}</p>` : ''}${body}</section>`;
const table = (heads, rows) => (rows.length ? `<div class="stats-table-wrap"><table class="stats-table"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nothing yet</p>');

function draw(data, period) {
  const now = Date.now();
  const from = now - period * DAY_MS;
  const fromDay = isoDay(from);
  const installs = data.installs;
  const byId = Object.fromEntries(installs.map(i => [i.id, i]));
  const who = id => { const i = byId[id]; return i?.account ? esc(i.account.split('@')[0]) : `<span class="muted">#${esc(id.slice(-4))}</span>`; };
  const days = data.days.filter(d => d.date >= fromDay && d.active_s > 0);
  const events = data.events.filter(e => Date.parse(e.at) >= from);
  const daysOf = id => days.filter(d => d.install === id);
  const out = [];

  // 1-3: new installs, where from, active people
  const fresh = installs.filter(i => Date.parse(i.first_seen) >= from);
  const activeIn = n => new Set(data.days.filter(d => d.active_s > 0 && d.date >= isoDay(now - n * DAY_MS)).map(d => d.install)).size;
  const perDay = tally(days, d => d.date);
  const dauAvg = Object.keys(perDay).length ? sum(Object.values(perDay)) / Object.keys(perDay).length : 0;
  out.push(card('At a glance', `<dl class="facts">
    <dt>Installs seen</dt><dd>${installs.length} (${installs.filter(i => i.account).length} signed in to your server)</dd>
    <dt>New in this period</dt><dd>${fresh.length}</dd>
    <dt>Active today</dt><dd>${activeIn(1)}</dd>
    <dt>Active last 7 days</dt><dd>${activeIn(7)}</dd>
    <dt>Active last 30 days</dt><dd>${activeIn(30)}</dd>
    <dt>Stickiness</dt><dd>${pct(dauAvg, activeIn(30))} <span class="muted">(people on an average day, out of the month's)</span></dd>
    <dt>Time spent, all</dt><dd>${mins(sum(days.map(d => d.active_s)))}</dd></dl>`));
  const newPerDay = {};
  for (let t = from; t <= now; t += DAY_MS) newPerDay[isoDay(t)] = 0;
  for (const i of fresh) newPerDay[isoDay(Date.parse(i.first_seen))] = (newPerDay[isoDay(Date.parse(i.first_seen))] || 0) + 1;
  out.push(card('New installs per day', columns(newPerDay, { label: dateOf })));
  const activePerDay = {};
  for (let t = from; t <= now; t += DAY_MS) activePerDay[isoDay(t)] = perDay[isoDay(t)] || 0;
  out.push(card('Active people per day', columns(activePerDay, { label: dateOf })));
  out.push(card('Where they came from', bars(tally(fresh, i => i.info?.ref || 'Typed in or no link')), 'The link that brought each new install, or its ?ref= tag'));
  out.push(card('Where in the world', bars(tally(installs.filter(i => Date.parse(i.last_seen) >= from), i => i.info?.tz || 'Not known')) + bars(tally(installs.filter(i => Date.parse(i.last_seen) >= from), i => i.info?.lang || 'Not known')), 'Time zone and language of each device'));

  // 4: do they come back
  const weeks = {};
  for (const i of installs) {
    const start = Date.parse(i.first_seen);
    const week = isoDay(start - ((new Date(start).getDay() + 6) % 7) * DAY_MS);
    const mine = data.days.filter(d => d.install === i.id && d.active_s > 0).map(d => Date.parse(d.date));
    const back = n => mine.some(t => t - start >= (n - 0.5) * DAY_MS);
    const w = weeks[week] ||= { n: 0, d1: 0, d7: 0, d30: 0, start: Date.parse(week) };
    w.n++;
    if (back(1)) w.d1++;
    if (back(7)) w.d7++;
    if (back(30)) w.d30++;
  }
  out.push(card('Do they come back?', table(['Installed week of', 'New', 'After a day', 'After a week', 'After a month'], Object.entries(weeks).sort().reverse().map(([week, w]) => [dateOf(week), w.n].concat([['d1', 1], ['d7', 7], ['d30', 30]].map(([key, n]) => (now - w.start < (n + 7) * DAY_MS ? '<span class="muted">too soon</span>' : pct(w[key], w.n)))))), 'Of the installs made each week, how many were used again that long or more after'));

  // 5, 6, 8, 18: each person
  const people = installs.filter(i => Date.parse(i.last_seen) >= from).map(i => {
    const mine = daysOf(i.id);
    const active = sum(mine.map(d => d.active_s));
    const sessions = sum(mine.map(d => d.sessions || 0));
    const top = Object.entries(merge(mine.map(d => d.areas))).sort((a, b) => b[1] - a[1])[0];
    const info = i.info || {};
    return [who(i.id), esc(`${info.kind || ''} ${info.os || ''} ${info.browser || ''}`), info.home_screen ? 'Home Screen' : 'Browser', dateOf(i.first_seen), dateOf(i.last_seen), mine.length, mine.length ? mins(active / mine.length) : '-', mine.length ? (sessions / mine.length).toFixed(1) : '-', top ? esc(areaName(top[0])) : '-', esc(info.things || '-'), esc(info.sync || '-'), info.gcal ? 'Yes' : 'No', esc(info.version || '-')];
  });
  out.push(card('Each install', table(['Who', 'Device', 'Runs as', 'First seen', 'Last seen', 'Days used', 'Time a day', 'Sessions a day', 'Most used', 'Things in Sift', 'Sync', 'Google Calendar', 'Version'], people), 'Names only for devices signed in to your server; everyone else is a number'));
  const lengths = days.flatMap(d => d.session_s || []).filter(s => s > 0);
  const lengthBands = { 'Under 1 min': 0, '1-5 min': 0, '5-15 min': 0, '15-60 min': 0, 'Over an hour': 0 };
  for (const s of lengths) lengthBands[s < 60 ? 'Under 1 min' : s < 300 ? '1-5 min' : s < 900 ? '5-15 min' : s < 3600 ? '15-60 min' : 'Over an hour']++;
  out.push(card('How long a visit lasts', bars(lengthBands, { ordered: true }), 'Time actually using Sift in each visit (a gap of 30 minutes starts a new one)'));
  const hours = merge(days.map(d => d.hours));
  const allHours = {};
  for (let h = 0; h < 24; h++) allHours[h] = hours[h] || 0;
  out.push(card('Time of day', columns(allHours, { label: h => `${String(h).padStart(2, '0')}:00`, value: mins }), "In each person's own time"));

  // 7: areas
  out.push(card('Which parts of Sift', bars(merge(days.map(d => d.areas)), { label: areaName, value: mins }) + '<h3>Opened first each day</h3>' + bars(tally(days, d => d.first_area), { label: areaName })));
  const devices = installs.filter(i => Date.parse(i.last_seen) >= from);
  out.push(card('Devices', ['kind', 'os', 'browser'].map(key => bars(tally(devices, i => i.info?.[key] || 'Not known'))).join('') + bars(tally(devices, i => (i.info?.home_screen ? 'Home Screen app' : 'Browser tab')))));

  // 9-11: welcome, tours, first real use
  const evs = kind => events.filter(e => e.kind === kind);
  out.push(card('Welcome screen', bars(tally(evs('welcome'), e => e.data.picked)), 'What people picked the first time'));
  const tours = {};
  for (const e of evs('tour')) {
    const t = tours[e.data.tour] ||= { start: new Set(), finished: new Set(), early: {}, furthest: {} };
    if (e.data.step === 'start') t.start.add(e.install);
    else if (e.data.step === 'finished') t.finished.add(e.install);
    else if (e.data.step === 'ended early') t.early[e.data.at] = (t.early[e.data.at] || 0) + 1;
    else if (e.data.n) t.furthest[e.install] = Math.max(t.furthest[e.install] || 0, e.data.n);
  }
  out.push(card('Tours', table(['Tour', 'Started', 'Finished', 'Ended early at'], Object.entries(tours).map(([name, t]) => [esc(name), t.start.size, `${t.finished.size} (${pct(t.finished.size, t.start.size)})`, esc(Object.entries(t.early).map(([at, n]) => `${at} ×${n}`).join(', ') || '-')]))
    + Object.entries(tours).map(([name, t]) => `<h3>${esc(name)}: furthest step reached</h3>${bars(tally(Object.values(t.furthest), n => n), { ordered: true, label: n => `Step ${n}` })}`).join('')));
  const first = evs('first_made');
  out.push(card('First real use', bars(tally(first, e => e.data.collection)) + `<p class="muted">Typical time from opening Sift to making something: ${first.length ? mins(first.map(e => e.data.after_s).sort((a, b) => a - b)[Math.floor(first.length / 2)]) : '-'}</p>`));

  // 12, 13: making and ticking off
  out.push(card('Things made', bars(merge(days.map(d => d.made)))));
  out.push(card('Things ticked off', bars(merge(days.map(d => d.ticked))) + `<p class="muted">Per active day: ${days.length ? (sum(days.map(d => sum(Object.values(d.ticked || {})))) / days.length).toFixed(1) : '-'}</p>`));

  // 14-16: Google Calendar, sync, sharing
  const funnel = (kind, keyOf = e => e.data.step) => bars(tally(evs(kind), keyOf));
  out.push(card('Google Calendar', funnel('gcal') + table(['Who', 'When', 'Why it failed'], evs('gcal').filter(e => e.data.step === 'failed').slice(-20).map(e => [who(e.install), dateOf(e.at), esc(e.data.why)]))));
  out.push(card('Sync', funnel('sync', e => `${e.data.how}: ${e.data.step} (${e.data.server})`) + table(['Who', 'When', 'Why it failed'], evs('sync').filter(e => e.data.step === 'failed').slice(-20).map(e => [who(e.install), dateOf(e.at), esc(e.data.why)]))));
  out.push(card('Sharing', funnel('share', e => `${e.data.step}${e.data.kind ? ` (${e.data.kind})` : ''}`)));

  // 17, 18: features, how they work Sift, looks
  out.push(card('Features used', bars(merge(days.map(d => d.features)))));
  out.push(card('Keys, mouse or touch', bars(merge(days.map(d => d.input))), 'Key presses outside typing (shortcuts), clicks, taps'));
  out.push(card('Looks', bars(tally(devices, i => i.info?.theme || 'Not known')) + bars(tally(devices, i => (i.info?.dark ? 'Device in dark mode' : 'Device in light mode')))));

  // 19: updates
  out.push(card('Versions', bars(tally(devices, i => i.info?.version || 'Not known')) + table(['Who', 'When', 'From', 'To'], evs('updated').slice(-30).reverse().map(e => [who(e.install), dateOf(e.at), esc(e.data.from), esc(e.data.to)]))));

  // 20: errors
  const errors = {};
  for (const e of evs('error')) { const key = `${e.data.message} @ ${e.data.where}`; const x = errors[key] ||= { n: 0, who: new Set(), area: e.data.area, last: e.at }; x.n++; x.who.add(e.install); x.last = e.at; }
  out.push(card('Errors', table(['Error', 'Where', 'Area', 'Times', 'Installs', 'Last'], Object.entries(errors).sort((a, b) => b[1].n - a[1].n).map(([key, x]) => { const [message, where] = key.split(' @ '); return [esc(message), `<code>${esc(where)}</code>`, esc(areaName(x.area)), x.n, x.who.size, dateOf(x.last)]; }))));

  // Bonus: how full, gone quiet
  out.push(card('How full Sift is', bars(tally(devices, i => i.info?.things || 'Not known'), { label: band => `${band} things` })));
  const quiet = installs.filter(i => now - Date.parse(i.last_seen) > 14 * DAY_MS).map(i => {
    const last = data.days.filter(d => d.install === i.id && d.active_s > 0).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const top = last && Object.entries(last.areas || {}).sort((a, b) => b[1] - a[1])[0];
    return [who(i.id), dateOf(i.first_seen), dateOf(i.last_seen), top ? esc(areaName(top[0])) : '-'];
  });
  out.push(card('Gone quiet', table(['Who', 'First seen', 'Last seen', 'Used last'], quiet), 'Not seen for two weeks or more'));
  return out.join('');
}

export default {
  refresh() {}, // a sync doesn't change these: no fetching again
  async mount(el) {
    el.innerHTML = '<p class="muted">Loading usage stats…</p>';
    const account = await store.metaGet('sync_account');
    if (!account || account.server !== STATS_SERVER) { el.innerHTML = '<p class="muted">Usage stats are only for the Sift server\'s owner, signed in to sync.</p>'; return; }
    let data;
    try {
      const res = await fetch(`${STATS_SERVER}/api/stats`, { headers: { Authorization: `Bearer ${account.token}` }, cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `The server answered ${res.status}`);
      data = await res.json();
    } catch (e) { el.innerHTML = `<p class="muted">Usage stats couldn't be loaded: ${esc(e.message)}</p>`; return; }
    let period = 30;
    const render = () => {
      el.innerHTML = `<div class="stats-period">${[7, 30, 90].map(n => `<button type="button" class="seg-link${n === period ? ' on' : ''}" data-period="${n}">Last ${n} days</button>`).join('')}</div>${draw(data, period)}`;
    };
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-period]'); if (b) { period = Number(b.dataset.period); render(); } });
    render();
  },
};
