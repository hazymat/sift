// Notifications (Settings → Notifications): each morning, what's on the Day
// Planner today; and after a week of Sift not being opened, a gentle nudge.
//
// The server can't read anything. A device that syncs writes the digests for
// the next 7 days and seals each one for each phone's own push keys (RFC 8291,
// aes128gcm) before uploading; the server just sends the sealed bytes at their
// time. Every device rewrites every phone's queue, so a change made on the
// laptop reaches the phone's morning digest. A day with nothing on it sends
// nothing. Left alone, the queue runs dry after 7 days and the server sends at
// most 3 weekly nudges with no content (the phone's sw.js supplies the words),
// then stops until Sift is opened again.

import * as store from './store.js';
import * as sync from './sync.js';
import { isoDate, addDays, showTime } from './days.js';
import { forDay } from './tasks.js';
import { isIOS, isStandalone } from './install.js';

const DIGEST_DAYS = 7;
const MAX_LINES = 6;
const text_encoder = new TextEncoder();
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const fromB64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
const toB64url = bytes => btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const myTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function joinBytes(byte_parts) {
  const joined = new Uint8Array(byte_parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of byte_parts) { joined.set(part, offset); offset += part.length; }
  return joined;
}
async function hkdf(salt, input_key, info, length) {
  const hkdf_key = await crypto.subtle.importKey('raw', input_key, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, hkdf_key, length * 8));
}

// RFC 8291: a message only this phone can open (its p256dh and auth keys).
export async function sealForPhone(phone_keys, message_text) {
  const phone_public = fromB64url(phone_keys.p256dh), auth_secret = fromB64url(phone_keys.auth);
  const sender_pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sender_public = new Uint8Array(await crypto.subtle.exportKey('raw', sender_pair.publicKey));
  const phone_key = await crypto.subtle.importKey('raw', phone_public, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared_secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: phone_key }, sender_pair.privateKey, 256));
  const input_key = await hkdf(auth_secret, shared_secret, joinBytes([text_encoder.encode('WebPush: info\0'), phone_public, sender_public]), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const content_key = await crypto.subtle.importKey('raw', await hkdf(salt, input_key, text_encoder.encode('Content-Encoding: aes128gcm\0'), 16), 'AES-GCM', false, ['encrypt']);
  const nonce = await hkdf(salt, input_key, text_encoder.encode('Content-Encoding: nonce\0'), 12);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, content_key, joinBytes([text_encoder.encode(message_text), new Uint8Array([2])])));
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = sender_public.length;
  return toB64url(joinBytes([header, sender_public, sealed]));
}

// What a day's digest says: timed items in order, then the pile, then the
// day's tasks (not those already on the plan as linked copies). Null: nothing on.
async function digestFor(date, all_tasks, all_items) {
  const open_items = all_items.filter(item => item.date === date && !item.done_at && !item.dropped_at);
  const linked_task_ids = new Set(open_items.map(item => item.task_id).filter(Boolean));
  const { planned, aimed } = forDay(all_tasks, date);
  const day_tasks = planned.concat(aimed).filter(task => !task.done_at && !linked_task_ids.has(task.id));
  const timed_items = open_items.filter(item => item.time).sort((first, second) => first.time.localeCompare(second.time));
  const short = title => (String(title || '').length > 60 ? `${String(title).slice(0, 59)}…` : String(title || ''));
  const lines = timed_items.map(item => `${showTime(item.time)} ${short(item.title)}`).concat(open_items.filter(item => !item.time).map(item => short(item.title)), day_tasks.map(task => short(task.title)));
  if (!lines.length) return null;
  const focus = (await store.local.get('days', date))?.focus?.trim();
  const shown_lines = lines.slice(0, MAX_LINES);
  if (lines.length > MAX_LINES) shown_lines.push(`and ${lines.length - MAX_LINES} more`);
  if (focus) shown_lines.unshift(`Focus: ${short(focus)}`);
  return { title: `Today: ${lines.length} ${lines.length === 1 ? 'thing' : 'things'}`, body: shown_lines.join('\n'), tag: `sift-digest-${date}`, url: `#/planner/${date}` };
}

// This device's push subscription, made (or remade for a new server key) if needed.
async function phoneSubscription(server_public_key, create) {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const current_key = subscription?.options?.applicationServerKey;
  if (subscription && current_key && toB64url(new Uint8Array(current_key)) !== server_public_key) { await subscription.unsubscribe(); subscription = null; }
  if (!subscription && create) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(server_public_key) });
  return subscription;
}
async function tellServer(subscription) {
  const subscription_json = subscription.toJSON();
  return sync.call('POST', '/api/push/subscribe', { endpoint: subscription_json.endpoint, p256dh: subscription_json.keys.p256dh, auth: subscription_json.keys.auth });
}

// A phone that had notifications on but lost its place on the server (signed
// out and in again, a password change) quietly signs back up.
async function keepThisDeviceOn(push_state) {
  if (!(await store.getDeviceSettings()).notify_on || Notification.permission !== 'granted') return;
  const subscription = await phoneSubscription(push_state.public_key, true);
  if (push_state.subs.some(existing => existing.endpoint === subscription.endpoint)) return;
  const subscription_json = subscription.toJSON();
  const { id: subscription_id } = await tellServer(subscription);
  push_state.subs.push({ id: subscription_id, endpoint: subscription_json.endpoint, p256dh: subscription_json.keys.p256dh, auth: subscription_json.keys.auth, mine: true });
}

// Rewrite every phone's digest queue. Skipped when nothing has changed since
// the last upload from this device.
let last_upload = '';
let refreshing = null;
export function refresh(force = false) {
  if (!sync.signedIn() || !supported()) return Promise.resolve();
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const push_state = await sync.call('GET', '/api/push');
    await keepThisDeviceOn(push_state);
    const settings = push_state.settings;
    const digests = [];
    if (settings.digest && push_state.subs.length) {
      const all_tasks = await store.local.list('tasks', { filter: task => !task.archived_at });
      const today = isoDate();
      const last_day = addDays(today, DIGEST_DAYS - 1);
      const all_items = await store.local.list('day_items', { filter: item => item.date >= today && item.date <= last_day && !item.archived_at });
      for (let day_offset = 0; day_offset < DIGEST_DAYS; day_offset++) {
        const date = addDays(today, day_offset);
        const send_at = new Date(`${date}T${settings.time}:00`);
        if (send_at <= new Date()) continue;
        const message = await digestFor(date, all_tasks, all_items);
        if (message) digests.push({ send_at: send_at.toISOString(), message });
      }
    }
    const fingerprint = JSON.stringify([push_state.subs.map(subscription => `${subscription.id}:${subscription.p256dh}`), settings, digests]);
    if (!force && fingerprint === last_upload) return;
    const queues = [];
    for (const subscription of push_state.subs) {
      const sealed_items = [];
      for (const digest of digests) sealed_items.push({ send_at: digest.send_at, body: await sealForPhone(subscription, JSON.stringify(digest.message)) });
      queues.push({ sub_id: subscription.id, items: sealed_items });
    }
    await sync.call('POST', '/api/push/queue', { queues });
    last_upload = fingerprint;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

// From app.js: after every sync that finishes, the queues follow.
export function init() {
  let last_sync_seen = null;
  sync.onStatus(status => {
    if (status.state !== 'ok' || status.last === last_sync_seen) return;
    last_sync_seen = status.last;
    refresh().catch(error => { if (error.status !== 404) console.warn('Notifications not updated:', error.message); });
  });
}

// ---------- Settings → Notifications ----------

export async function mountCard(card_body) {
  const draw = async (message = '') => {
    if (!sync.signedIn()) { card_body.innerHTML = '<p class="muted">Notifications come from your Sift server: turn on Sync (above) first.</p>'; return; }
    if (!supported()) { card_body.innerHTML = `<p class="muted">${isIOS() && !isStandalone() ? 'On an iPhone or iPad, add Sift to your Home Screen (see the top of Settings) and open it from there to turn notifications on.' : "This browser can't show notifications from Sift."}</p>`; return; }
    let push_state;
    try { push_state = await sync.call('GET', '/api/push'); } catch (error) {
      card_body.innerHTML = `<p class="muted">${error.status === 404 ? 'Your Sift server needs updating before it can send notifications.' : `Couldn't reach your Sift server (${esc(error.message)}).`}</p>`;
      return;
    }
    const settings = push_state.settings;
    const subscription = Notification.permission === 'granted' ? await phoneSubscription(push_state.public_key, false) : null;
    const this_device_on = !!subscription && (await store.getDeviceSettings()).notify_on && push_state.subs.some(existing => existing.endpoint === subscription.endpoint);
    const blocked = Notification.permission === 'denied';
    card_body.innerHTML = `
      <div class="backup-row">
        ${this_device_on ? '<span>On for this device</span><button type="button" data-notify="off">Turn off</button><button type="button" class="link-btn" data-notify="test">Send a test</button>' : `<button type="button" class="primary" data-notify="on"${blocked ? ' disabled' : ''}>Turn on for this device</button>`}
        <span class="muted" data-notify-msg>${esc(message)}</span>
      </div>
      ${blocked ? '<p class="muted">Notifications are blocked for Sift on this device: allow them in the device\'s settings, then come back here.</p>' : ''}
      <label class="check-row"><input type="checkbox" data-setting="digest"${settings.digest ? ' checked' : ''}> Each morning, what's on today's Day Planner <input type="time" data-setting="time" value="${esc(settings.time)}"></label>
      <label class="check-row"><input type="checkbox" data-setting="nudge"${settings.nudge ? ' checked' : ''}> A gentle reminder if Sift hasn't been opened for a week <span class="muted">(once a week, 3 at most)</span></label>
      <p class="muted">These go to every device with notifications turned on. They're written and sealed on your devices, so the server can't read them; days with nothing planned send nothing.</p>`;
  };

  card_body.addEventListener('change', async event => {
    const field = event.target.closest('[data-setting]');
    if (!field) return;
    const changes = { tz: myTimeZone() };
    changes[field.dataset.setting] = field.type === 'checkbox' ? field.checked : field.value;
    try { await sync.call('POST', '/api/push/settings', changes); await refresh(true); } catch (error) { return draw(`Not saved: ${error.message}`); }
  });

  card_body.addEventListener('click', async event => {
    const button = event.target.closest('[data-notify]');
    if (!button) return;
    button.disabled = true;
    try {
      // Asked first, while the tap still counts (Safari only asks from a tap).
      if (button.dataset.notify === 'on' && (await Notification.requestPermission()) !== 'granted') return draw('Notifications weren\'t allowed.');
      const push_state = await sync.call('GET', '/api/push');
      if (button.dataset.notify === 'on') {
        await tellServer(await phoneSubscription(push_state.public_key, true));
        await store.updateDeviceSettings({ notify_on: true });
        if (!push_state.subs.length && !push_state.settings.digest) await sync.call('POST', '/api/push/settings', { digest: true, tz: myTimeZone() }); // the first device on: the digest starts on
        await refresh(true);
        return draw('On.');
      }
      if (button.dataset.notify === 'off') {
        const subscription = await phoneSubscription(push_state.public_key, false);
        if (subscription) { await sync.call('POST', '/api/push/unsubscribe', { endpoint: subscription.endpoint }); await subscription.unsubscribe(); }
        await store.updateDeviceSettings({ notify_on: false });
        return draw('Off for this device.');
      }
      if (button.dataset.notify === 'test') {
        const subscription = await phoneSubscription(push_state.public_key, false);
        const mine = push_state.subs.find(existing => existing.endpoint === subscription?.endpoint);
        if (!mine) return draw('Turn notifications on first.');
        await sync.call('POST', '/api/push/test', { sub_id: mine.id, body: await sealForPhone(mine, JSON.stringify({ title: 'Sift', body: 'Notifications are working.', tag: 'sift-test', url: '#/settings' })) });
        return draw('Sent: it should arrive in a few seconds.');
      }
    } catch (error) {
      return draw(`Didn't work: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  });

  // Signing in or out of Sync (above) changes what this card can offer.
  let drawn_signed_in = !!sync.signedIn();
  let stop_watching = null;
  stop_watching = sync.onStatus(() => {
    if (!card_body.isConnected) return stop_watching?.();
    if (drawn_signed_in === !!sync.signedIn()) return;
    drawn_signed_in = !!sync.signedIn();
    draw();
  });
  await sync.ready;
  await draw();
}
