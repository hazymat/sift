// Sync with sift-server (spec §8). Local data is always the source the app
// works from; sync just exchanges encrypted records in the background.
//
//   pull  everything since the last seq, merge field by field
//   push  the outbox; on a conflict merge the server's copy and push again
//
// Runs on start, on regaining network, a few seconds after local changes,
// every 5 minutes, and on "Sync now".

import * as store from './store.js';
import * as cx from './crypto.js';

let keys = null;       // { records, ids } CryptoKeys
let account = null;    // { server, email, user_id, token, device_id }
let running = null;
let timer = null;
const listeners = new Set();
// state: off | idle | syncing | ok | offline | error. last = when the records
// last finished syncing; tried = when a sync last started; reached = when the
// server last answered; received = records that came in last time; files =
// the separate file queue (idle | syncing | error) and how many are waiting.
export let status = { state: 'off', pending: 0, last: null, tried: null, reached: null, received: 0, files: 'idle', filesWaiting: 0, error: null };

function setStatus(next) {
  status = { ...status, ...next };
  for (const fn of listeners) fn(status);
}
export const onStatus = fn => { listeners.add(fn); fn(status); return () => listeners.delete(fn); };

// ---------- how the connection is doing ----------
// Every request is timed; the last few (from the past minute) say whether the
// connection is good, slow or failing. A request that takes longer than its
// limit is given up (and tried again soon), so a poor signal can't leave sync
// stuck on "Syncing…".
const samples = []; // { at, ms, ok }
function sample(ms, ok) {
  samples.push({ at: Date.now(), ms, ok });
  while (samples.length > 20 || (samples.length && Date.now() - samples[0].at > 60000)) samples.shift();
  setStatus({ link: linkQuality(), checked: new Date().toISOString(), ...(ok ? { reached: new Date().toISOString() } : {}) });
}
// good | slow | weak | down | unknown
export function linkQuality() {
  const recent = samples.filter(s => Date.now() - s.at < 60000);
  if (!recent.length) return 'unknown';
  const last = recent.at(-1);
  if (!last.ok && recent.slice(-3).every(s => !s.ok)) return 'down';
  if (recent.some(s => !s.ok)) return 'weak';
  const okMs = recent.filter(s => s.ok).map(s => s.ms);
  const avg = okMs.reduce((a, b) => a + b, 0) / okMs.length;
  return avg > 1500 ? 'slow' : 'good';
}
async function timedFetch(url, opts = {}, limit = 20000) {
  const ctl = new AbortController();
  const t0 = performance.now();
  const timer = setTimeout(() => ctl.abort(), limit);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    sample(performance.now() - t0, true);
    return res;
  } catch (e) {
    sample(performance.now() - t0, false);
    throw e.name === 'AbortError' ? new TypeError('The server took too long to answer') : e;
  } finally {
    clearTimeout(timer);
  }
}
// A quick "are you there?" (Settings asks every 10 s while it's open).
export async function checkLink() {
  if (!account) return;
  try { await timedFetch(`${account.server}/api/health`, {}, 8000); } catch { /* counted */ }
}

async function api(method, path, body, server = account?.server) {
  const res = await timedFetch(`${server}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Server said ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const deviceName = () => {
  const ua = navigator.userAgent;
  const kind = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : 'Device';
  const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'app' : 'browser';
  return `${kind} (${app})`;
};

// ---------- account ----------

export async function serverInfo(server) {
  server = server.trim().replace(/\/+$/, '');
  const res = await fetch(`${server}/api/health`);
  if (!res.ok) throw new Error(`Server said ${res.status}`);
  return res.json();
}

async function keep(server, email, login, dataKeyRaw) {
  keys = await cx.workingKeys(dataKeyRaw);
  account = { server, email, user_id: login.user_id, token: login.token, device_id: login.device_id };
  await store.metaSet('sync_keys', keys);
  await store.metaSet('sync_account', account);
  await store.updateDeviceSettings({ server_url: server });
}

// New account: returns the recovery code to show once.
export async function register(server, email, password) {
  server = server.replace(/\/+$/, '');
  const kdf = cx.newKdf();
  const master = await cx.deriveMaster(password, kdf);
  const dataKeyRaw = cx.newDataKey();
  const login = await api('POST', '/api/register', {
    email, kdf,
    auth_hash: await cx.loginHash(master, password),
    wrapped_data_key: await cx.wrapDataKey(master, dataKeyRaw),
    recovery_hash: await cx.recoveryHash(dataKeyRaw),
    device_name: deviceName(),
  }, server);
  await keep(server, email, login, dataKeyRaw);
  return cx.recoveryCode(dataKeyRaw);
}

// A new password, and the data key wrapped by it, for recover / changePassword.
async function newPassword(password, dataKeyRaw) {
  const kdf = cx.newKdf();
  const master = await cx.deriveMaster(password, kdf);
  return { kdf, auth_hash: await cx.loginHash(master, password), wrapped_data_key: await cx.wrapDataKey(master, dataKeyRaw) };
}

// Forgot the password: the recovery code opens the data; every other device is
// signed out and this one signs in with the new password.
export async function recover(server, email, code, password) {
  server = server.replace(/\/+$/, '');
  const dataKeyRaw = cx.fromRecoveryCode(code);
  const login = await api('POST', '/api/recover', {
    email, recovery_hash: await cx.recoveryHash(dataKeyRaw), device_name: deviceName(), ...await newPassword(password, dataKeyRaw),
  }, server);
  await keep(server, email, login, dataKeyRaw);
}

// While signed in: the old password must be right; other devices are signed out.
export async function changePassword(oldPassword, password) {
  const me = await api('GET', '/api/me');
  const oldMaster = await cx.deriveMaster(oldPassword, me.kdf);
  let dataKeyRaw;
  try { dataKeyRaw = await cx.unwrapDataKey(oldMaster, me.wrapped_data_key); } catch { throw new Error('The current password is wrong'); }
  await api('POST', '/api/password', { old_auth_hash: await cx.loginHash(oldMaster, oldPassword), ...await newPassword(password, dataKeyRaw) });
}

export async function signIn(server, email, password) {
  server = server.replace(/\/+$/, '');
  const { kdf } = await api('POST', '/api/prelogin', { email }, server);
  const master = await cx.deriveMaster(password, kdf);
  const login = await api('POST', '/api/login', { email, auth_hash: await cx.loginHash(master, password), device_name: deviceName() }, server);
  await keep(server, email, login, await cx.unwrapDataKey(master, login.wrapped_data_key));
}

// Turning sync on for data already on this device: everything is queued,
// the account's data is pulled and merged, then everything is pushed.
export async function start() {
  await store.queueAll();
  await store.metaSet('sync_last_seq', 0);
  wire();
  setStatus({ state: 'idle', pending: await store.outboxSize(), error: null });
  schedule(0);
}

export async function signOut() {
  try { await api('POST', '/api/logout'); } catch { /* offline: forget locally anyway */ }
  keys = null;
  account = null;
  await store.metaSet('sync_keys', undefined);
  await store.metaSet('sync_account', undefined);
  await store.metaSet('sync_last_seq', undefined);
  clearTimeout(timer);
  setStatus({ state: 'off', error: null });
}

export const signedIn = () => (account ? { ...account, token: undefined } : null);

export async function devices() { return (await api('GET', '/api/devices')).devices; }

// ---------- the sync itself ----------

const strip = r => { const { _dirty_fields, _server_seq, ...rest } = r; return rest; };

async function pull() {
  let changed = 0;
  let since = (await store.metaGet('sync_last_seq')) || 0;
  for (;;) {
    const page = await api('GET', `/api/sync/pull?since=${since}&limit=500`);
    for (const row of page.records) {
      const { c, r } = await cx.openJson(keys, row.ciphertext);
      if (store.COLLECTIONS.includes(c) && r?.id && await store.applyRemote(c, r, row.seq)) changed++;
    }
    since = page.last_seq;
    await store.metaSet('sync_last_seq', since);
    if (!page.more) break;
  }
  return changed;
}

async function push() {
  for (let round = 0; round < 5; round++) {
    const entries = await store.outboxAll();
    if (!entries.length) return;
    let conflicts = 0;
    for (let i = 0; i < entries.length; i += 200) {
      const batch = [];
      const meta = new Map();
      for (const e of entries.slice(i, i + 200)) {
        const rec = await store.get(e.collection, e.id, { includeDeleted: true });
        if (!rec) { await store.markPushed(e.collection, e.id, 0, e.queued_at); continue; }
        const rid = await cx.opaqueId(keys, e.collection, e.id);
        meta.set(rid, e);
        batch.push({ record_id: rid, base_seq: rec._server_seq || 0, ciphertext: await cx.sealJson(keys, { c: e.collection, r: strip(rec) }) });
      }
      if (!batch.length) continue;
      const res = await api('POST', '/api/sync/push', { records: batch });
      for (const a of res.accepted) { const e = meta.get(a.record_id); await store.markPushed(e.collection, e.id, a.seq, e.queued_at); }
      for (const c of res.conflicts) {
        const { c: coll, r } = await cx.openJson(keys, c.ciphertext);
        await store.applyRemote(coll, r, c.seq); // merged; still queued, pushed again next round
        conflicts++;
      }
    }
    if (!conflicts) return;
  }
}

// ---------- attachment files ----------
// The records (name, type, thumbnail) sync like everything else; the files
// travel separately, encrypted with the same key, under opaque ids.

const MAX_AUTO_DOWNLOAD = 5 * 1024 * 1024; // bigger files are fetched when you open them

async function fileRequest(method, id, body) {
  const res = await timedFetch(`${account.server}/api/blobs/${await cx.opaqueId(keys, 'blobs', id)}`, {
    method, headers: { Authorization: `Bearer ${account.token}` }, body,
  }, 5 * 60 * 1000); // files may be big: up to 5 minutes
  if (res.status === 401 || (!res.ok && res.status !== 404)) {
    const err = new Error(res.status === 507 ? 'Storage quota reached on the server' : `Server said ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function pushFiles() {
  for (const row of await store.blobsToUpload()) {
    const att = await store.get('attachments', row.blob_id, { includeDeleted: true });
    if (!att || att.deleted_at) continue; // removed again: nothing to send
    const sealed = await cx.sealBlob(keys, new Uint8Array(await row.data.arrayBuffer()));
    await fileRequest('PUT', row.blob_id, sealed);
    await store.markBlobUploaded(row.blob_id);
  }
}

// Fetch one attachment's file from the server (null if it isn't there yet).
export async function downloadFile(a) {
  if (!account || !keys) return null;
  const res = await fileRequest('GET', a.blob_id);
  if (res.status === 404) return null;
  const plain = await cx.openBlob(keys, new Uint8Array(await res.arrayBuffer()));
  const blob = new Blob([plain], { type: a.mime });
  await store.putBlob(a.blob_id, blob, { uploaded: true });
  return blob;
}

async function pullFiles() {
  let arrived = 0;
  for (const a of await store.list('attachments')) {
    if (a.size > MAX_AUTO_DOWNLOAD || await store.hasBlob(a.blob_id)) continue;
    await downloadFile(a);
    arrived++;
    setStatus({ filesWaiting: Math.max(0, status.filesWaiting - 1) });
  }
  return arrived;
}
// How many files are still to go up or come down to this device.
async function filesWaiting() {
  let n = (await store.blobsToUpload()).length;
  for (const a of await store.list('attachments')) if (a.size <= MAX_AUTO_DOWNLOAD && !await store.hasBlob(a.blob_id)) n++;
  return n;
}

// Files (photos, PDFs…) go in their own queue after the records, so a big or
// slow file never holds up the text: new tasks and notes show as soon as
// they arrive, and a file shows "still arriving" until it's here.
let filesRunning = null;
function syncFiles() {
  if (filesRunning) return filesRunning;
  filesRunning = (async () => {
    try {
      setStatus({ files: 'syncing', filesWaiting: await filesWaiting(), filesWaitingUp: (await store.blobsToUpload()).length });
      await pushFiles();
      const arrived = await pullFiles();
      setStatus({ files: 'idle', fileError: null, filesWaiting: await filesWaiting(), filesWaitingUp: (await store.blobsToUpload()).length, filesArrived: arrived });
    } catch (e) {
      console.warn('Files not synced:', e.message);
      setStatus({ files: 'error', fileError: e.message });
    } finally {
      filesRunning = null;
    }
  })();
  return filesRunning;
}

export async function syncNow() {
  if (!account || !keys) return;
  if (running) return running;
  running = (async () => {
    setStatus({ state: 'syncing', error: null, tried: new Date().toISOString() });
    try {
      const changed = await pull();
      await push();
      setStatus({ state: 'ok', last: new Date().toISOString(), pending: await store.outboxSize(), error: null, changed, received: changed });
      failures = 0;
      syncFiles(); // in the background: doesn't hold up the records
    } catch (e) {
      const offline = !navigator.onLine || e instanceof TypeError; // fetch failed: no network, or the server can't be reached
      setStatus({ state: offline ? 'offline' : 'error', error: offline ? null : e.message, pending: await store.outboxSize() });
      failures++;
      if (e.status === 401) { await store.metaSet('sync_account', undefined); account = null; setStatus({ state: 'off', error: `The server signed this device out (${e.message}). Sign in again.` }); }
    } finally {
      running = null;
      // Next try: every 30 s while the app is on screen (5 min when it isn't);
      // after a failure sooner: 10, 20, 40, then every 60 s.
      if (account) schedule(failures ? Math.min(60000, 10000 * 2 ** (failures - 1)) : document.visibilityState === 'visible' ? 30000 : 300000);
    }
  })();
  return running;
}
let failures = 0;

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

// Background triggers, set up once a device is signed in.
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  store.subscribe(ch => { if (!ch.remote && account) { setStatus({ pending: status.pending + 1 }); schedule(4000); } });
  addEventListener('online', () => schedule(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(500); });
  // (the next try is scheduled after each one: see syncNow)
}

// Called once from app.js. `ready` settles once the saved sign-in has been
// read, so pages don't show "Sign in" to a device that is signed in.
let markReady;
export const ready = new Promise(ok => { markReady = ok; });
export async function init() {
  try { await load(); } finally { markReady(); }
}
async function load() {
  account = await store.metaGet('sync_account');
  keys = await store.metaGet('sync_keys');
  if (!account || !keys) { setStatus({ state: 'off', pending: await store.outboxSize() }); return; }
  setStatus({ state: 'idle', pending: await store.outboxSize() });
  wire();
  schedule(300);
}

// ---------- is this device in step? ----------

// A short code for all the records on this device (every record's id and
// the time each of its fields last changed), shown as three words. Two devices
// with the same words hold the same data. Device settings and files aren't in
// it (they differ between devices on purpose).
const CODE_WORDS = [
  'apple', 'arrow', 'badge', 'baker', 'bamboo', 'banjo', 'beach', 'beacon', 'berry', 'bison', 'blaze', 'bloom',
  'bottle', 'bramble', 'breeze', 'brick', 'bridge', 'brook', 'bucket', 'butter', 'cabin', 'cactus', 'camel', 'candle',
  'canyon', 'carpet', 'castle', 'cedar', 'chalk', 'cherry', 'chimney', 'cinder', 'circus', 'citrus', 'clover', 'cobalt',
  'comet', 'copper', 'coral', 'cotton', 'cradle', 'crane', 'crater', 'cricket', 'crystal', 'cupboard', 'dagger', 'daisy',
  'dancer', 'delta', 'desert', 'diamond', 'dolphin', 'dragon', 'drum', 'eagle', 'ember', 'engine', 'falcon', 'feather',
  'fern', 'fiddle', 'flame', 'flute', 'forest', 'fossil', 'fountain', 'fox', 'galaxy', 'garden', 'garnet', 'ginger',
  'glacier', 'globe', 'goose', 'granite', 'grape', 'gravel', 'harbour', 'harvest', 'hazel', 'hedge', 'helmet', 'heron',
  'hollow', 'honey', 'horizon', 'island', 'ivory', 'jacket', 'jasmine', 'jelly', 'jungle', 'kettle', 'kite', 'ladder',
  'lagoon', 'lantern', 'lemon', 'lily', 'linen', 'lizard', 'lobster', 'magnet', 'mango', 'maple', 'marble', 'meadow',
  'melon', 'meteor', 'mint', 'mirror', 'monkey', 'moss', 'mountain', 'mushroom', 'needle', 'nest', 'nickel', 'oasis',
  'ocean', 'olive', 'onion', 'orchard', 'otter', 'oyster', 'paddle', 'palace', 'panda', 'paper', 'parrot', 'pebble',
  'pepper', 'pickle', 'pigeon', 'pillow', 'pine', 'planet', 'plum', 'pocket', 'pony', 'poppy', 'puddle', 'pumpkin',
  'quartz', 'quill', 'rabbit', 'radar', 'raven', 'reef', 'ribbon', 'river', 'robin', 'rocket', 'rose', 'ruby',
  'saddle', 'salmon', 'sandal', 'satin', 'scarf', 'shadow', 'shell', 'shovel', 'silver', 'sketch', 'sledge', 'slipper',
  'spark', 'sparrow', 'spider', 'spoon', 'spruce', 'squirrel', 'stable', 'star', 'stone', 'storm', 'sugar', 'summit',
  'sunset', 'swan', 'table', 'tangle', 'temple', 'thistle', 'thunder', 'tiger', 'timber', 'toast', 'topaz', 'torch',
  'tower', 'trumpet', 'tulip', 'tunnel', 'turtle', 'umbrella', 'valley', 'velvet', 'violet', 'volcano', 'wagon', 'walnut',
  'walrus', 'wand', 'whale', 'wheat', 'whistle', 'willow', 'window', 'winter', 'wizard', 'wolf', 'yacht', 'zebra',
  'acorn', 'anchor', 'atlas', 'basket', 'beetle', 'blossom', 'button', 'canoe', 'carrot', 'cello', 'cobweb', 'compass',
  'cookie', 'dune', 'easel', 'falafel', 'ferry', 'fig', 'goblet', 'hammock', 'igloo', 'jigsaw', 'kayak', 'koala',
  'lemur', 'locket', 'marsh', 'mitten', 'muffin', 'nutmeg', 'orbit', 'paprika', 'pelican', 'pixel', 'prism', 'quiver',
  'raisin', 'rhubarb', 'sapphire', 'scooter',
];
export async function dataCode() {
  const parts = [];
  for (const c of store.COLLECTIONS) {
    for (const r of await store.list(c, { includeDeleted: true })) {
      const clocks = r._field_clocks || {};
      parts.push(`${c}/${r.id}/${Object.keys(clocks).sort().map(k => `${k}=${clocks[k]}`).join(',')}`);
    }
  }
  parts.sort();
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('\n'))));
  return { words: [hash[0], hash[1], hash[2]].map(b => CODE_WORDS[b]).join(' '), records: parts.length };
}
