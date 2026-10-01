// Google Calendar, read only, for the Day Planner (in ↓ Bring items in).
// Signing in happens in the browser (Google's own sign-in, in a popup): no
// server, and nothing goes through Sift's sync. Google's permission lasts an
// hour; after that, a tap on Refresh (or Load, or Connect) asks again, which is
// usually just a quick popup that closes itself.
// What's fetched stays small: the calendars chosen (your main one to start
// with; the list of your calendars is kept on this device), a range of days at a time,
// only each event's name, times, place, description and link. Each day fetched is kept on
// this device (sync_meta, not synced) until it's fetched again: today and the
// next 7 days load by themselves; further days when you press Load; Refresh
// fetches again the days already loaded, from today on. Past days are never
// fetched again.
//
//   connected()            has this device connected (and not disconnected)?
//   ready()                 is there a live permission (no popup needed)?
//   connect()               sign in (needs a tap: it opens Google's popup)
//   disconnect()
//   dayEvents(date)         { at, events } for a day fetched, or null
//   load(from, to)          fetch the days from … to (ISO dates, inclusive) and keep them
//   refreshDays(date)       the days a Refresh fetches: today + 7, those loaded since, and this one
//   calendars()             fetch the list of your calendars { id, name, colour, primary } and keep it
//   knownCalendars()        that list as last fetched, or null
//   chosen() / choose(ids)  which calendars show ('primary' is your main one); choosing forgets the days fetched
//   AHEAD                   days after today that load by themselves (7)

import * as store from './store.js';
import { track } from './stats.js';

const CLIENT_ID = '608204699309-s1aumq1dur7r79pu1al0t8gmggheeml5.apps.googleusercontent.com';
// The narrowest scopes that read event details, and the names of your calendars (Google reviews them).
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
const CONNECTED = 'sift-gcal';
const TOKEN = 'sift-gcal-token';
export const AHEAD = 7;

let token = null;
let expires = 0;
try { const t = JSON.parse(sessionStorage.getItem(TOKEN) || 'null'); if (t && t.exp > Date.now()) { token = t.token; expires = t.exp; } } catch { /* none */ }

export const connected = () => { try { return localStorage.getItem(CONNECTED) === '1'; } catch { return false; } };
export const ready = () => !!token && Date.now() < expires - 60000;

// Google's sign-in script, fetched the first time it's needed.
let gis = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gis ??= new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true });
    s.onload = () => ok();
    s.onerror = () => { gis = null; fail(new Error("Couldn't reach Google")); };
    document.head.append(s);
  });
  return gis;
}

// again: ask for permission afresh (Google's full consent screen), e.g. when the list of calendars was refused.
export async function connect(again = false) {
  track('gcal', { step: 'try' });
  await loadGis();
  await new Promise((ok, fail) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (r.error || !r.access_token) return fail(new Error(r.error_description || r.error || 'Not connected'));
        token = r.access_token;
        expires = Date.now() + (Number(r.expires_in) || 3600) * 1000;
        try { sessionStorage.setItem(TOKEN, JSON.stringify({ token, exp: expires })); localStorage.setItem(CONNECTED, '1'); } catch { /* kept for now only */ }
        ok();
      },
      error_callback: e => fail(new Error(e?.type === 'popup_closed' ? 'Closed before connecting' : e?.message || 'Not connected')),
    });
    client.requestAccessToken({ prompt: connected() && !again ? '' : 'consent' });
  }).catch(e => { track('gcal', { step: 'failed', why: e.message }); throw e; });
  track('gcal', { step: 'connected' });
}

export async function disconnect() {
  track('gcal', { step: 'disconnected' });
  const t = token;
  token = null;
  expires = 0;
  try { sessionStorage.removeItem(TOKEN); localStorage.removeItem(CONNECTED); } catch { /* fine */ }
  await forgetDays();
  await store.metaSet('gcal:cals', undefined);
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {});
}

async function forgetDays() {
  const days = (await store.metaGet('gcal:days')) || [];
  for (const d of days) await store.metaSet(`gcal:${d}`, undefined);
  await store.metaSet('gcal:days', undefined);
}

// ---------- which calendars ----------
export const knownCalendars = async () => (await store.metaGet('gcal:cals')) || null;
export const chosen = async () => (await store.metaGet('gcal:chosen')) || ['primary'];
export async function choose(ids) {
  await store.metaSet('gcal:chosen', ids.length ? ids : ['primary']);
  await forgetDays();
}
export async function calendars() {
  if (!ready()) throw Object.assign(new Error('Not connected'), { auth: true });
  const r = await api('users/me/calendarList', { maxResults: '250', fields: 'items(id,summary,summaryOverride,backgroundColor,primary)' });
  const cals = (r.items || []).map(c => ({ id: c.primary ? 'primary' : c.id, name: c.summaryOverride || c.summary || c.id, colour: c.backgroundColor || '', primary: !!c.primary }))
    .sort((a, b) => (b.primary - a.primary) || a.name.localeCompare(b.name));
  await store.metaSet('gcal:cals', cals);
  return cals;
}

// ---------- dates (the device's own time zone) ----------
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const today = () => iso(new Date());

export async function dayEvents(date) {
  return (await store.metaGet(`gcal:${date}`)) || null;
}

export async function refreshDays(date) {
  const t = today();
  const days = new Set(((await store.metaGet('gcal:days')) || []).filter(d => d >= t));
  for (let n = 0; n <= AHEAD; n++) days.add(addDays(t, n));
  if (date) days.add(date);
  return [...days].sort();
}

// An event's description as plain text (Google keeps it as simple HTML).
function plain(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
  return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

async function api(path, params) {
  const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { token = null; expires = 0; try { sessionStorage.removeItem(TOKEN); } catch { /* fine */ } throw Object.assign(new Error('Google needs you to connect again'), { auth: true }); }
  if (res.status === 403 && path.startsWith('users/me/calendarList')) throw Object.assign(new Error("Google didn't allow the list of calendars"), { scope: true });
  if (!res.ok) throw Object.assign(new Error(`Google Calendar said ${res.status}`), { status: res.status });
  return res.json();
}

// Fetch the days from … to (inclusive; ISO dates) in one go, and keep each one
// (also the days with nothing on, so they show as loaded). `only`: keep just these days.
export async function load(from, to, only = null) {
  if (!ready()) throw Object.assign(new Error('Not connected'), { auth: true });
  const cals = await chosen();
  const known = (await knownCalendars()) || [];
  const items = [];
  for (const cal of cals) {
    const about = known.find(c => c.id === cal);
    try { items.push(...(await calEvents(cal, from, to)).map(e => ({ ...e, cal, calName: about?.name || (cal === 'primary' ? 'Main calendar' : cal), calColour: about?.colour || '' }))); }
    catch (err) { if (err.auth || cals.length === 1 || cal === 'primary') throw err; } // a calendar since removed: the others still load
  }
  const at = Date.now();
  const byDay = new Map();
  for (let d = from; d <= to; d = addDays(d, 1)) if (!only || only.includes(d)) byDay.set(d, []);
  for (const e of items) {
    if (e.status === 'cancelled') continue;
    const allDay = !!e.start?.date;
    const start = allDay ? e.start.date : iso(new Date(e.start.dateTime));
    // The last day it's on: an all-day event's end date is the day after; a timed one ending at midnight ends the day before.
    const endAt = allDay ? addDays(e.end.date, -1) : iso(new Date(new Date(e.end.dateTime).getTime() - 1));
    const event = { id: e.id, title: e.summary || '(No title)', allDay, start: allDay ? null : e.start.dateTime, end: allDay ? null : e.end.dateTime, location: e.location || '', link: e.htmlLink || '', note: plain(e.description), cal: e.cal, calName: e.calName, calColour: e.calColour };
    // The same event in two calendars (an invitation) shows once.
    for (let d = start; d <= endAt; d = addDays(d, 1)) if (byDay.has(d) && !byDay.get(d).some(x => x.id === e.id)) byDay.get(d).push(event);
  }
  for (const [d, events] of byDay) await store.metaSet(`gcal:${d}`, { at, events });
  const days = new Set((await store.metaGet('gcal:days')) || []);
  for (const d of byDay.keys()) days.add(d);
  await store.metaSet('gcal:days', [...days].sort());
}

async function calEvents(cal, from, to) {
  const items = [];
  let pageToken;
  do {
    const r = await api(`calendars/${encodeURIComponent(cal)}/events`, {
      timeMin: parse(from).toISOString(),
      timeMax: parse(addDays(to, 1)).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      fields: 'items(id,summary,description,start,end,location,status,htmlLink),nextPageToken',
      ...(pageToken ? { pageToken } : {}),
    });
    items.push(...(r.items || []));
    pageToken = r.nextPageToken;
  } while (pageToken);
  return items;
}
