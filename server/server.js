// sift-server: stores each user's records as encrypted envelopes and hands
// them back in order. It never sees the data: the app encrypts every record
// with a key only the user's devices hold, and names records with opaque ids.
//
// No dependencies: node:http, node:crypto and node:sqlite (Node 22.5+).
//
// Environment:
//   PORT              default 8787 (Caddy in front does HTTPS)
//   HOST              default 127.0.0.1
//   DATA_DIR          default ./data  (sift.db lives here)
//   ALLOWED_ORIGINS   comma list, e.g. https://hazymat.github.io,http://localhost:5173
//   REGISTRATION      first (default: only while there are no users) | open | closed
//   QUOTA_MB          default 1024 per user

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://hazymat.github.io,http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
const REGISTRATION = process.env.REGISTRATION || 'first';
const QUOTA = Number(process.env.QUOTA_MB || 1024) * 1024 * 1024;
const MAX_BODY = 20 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'sift.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    auth_hash TEXT NOT NULL,          -- scrypt(auth_hash sent by the app)
    auth_salt TEXT NOT NULL,
    kdf TEXT NOT NULL,                -- JSON: the app's key-derivation parameters
    wrapped_data_key TEXT NOT NULL,   -- the data key, encrypted by the app
    last_seq INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    last_seen TEXT
  );
  CREATE TABLE IF NOT EXISTS records (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id TEXT NOT NULL,          -- opaque (keyed hash made by the app)
    seq INTEGER NOT NULL,
    ciphertext TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    PRIMARY KEY (user_id, record_id)
  );
  CREATE INDEX IF NOT EXISTS records_by_seq ON records (user_id, seq);
`);

// A per-install secret so unknown emails get stable made-up KDF salts
// (the answer doesn't reveal whether an account exists).
let secret = db.prepare('SELECT value FROM meta WHERE key = ?').get('secret')?.value;
if (!secret) {
  secret = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('secret', secret);
}

const now = () => new Date().toISOString();
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const id = () => crypto.randomUUID();
const b64url = buf => buf.toString('base64url');

function scrypt(value, salt) {
  return new Promise((resolve, reject) => crypto.scrypt(value, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k.toString('hex')))));
}
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ---------- tiny router ----------

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Bad JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, origin) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (origin && ORIGINS.includes(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
  res.writeHead(status, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function authed(req) {
  const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
  if (!m) throw new HttpError(401, 'Sign in first');
  const dev = db.prepare('SELECT d.id, d.user_id FROM devices d WHERE d.token_hash = ?').get(sha256(m[1]));
  if (!dev) throw new HttpError(401, 'This device has been signed out');
  db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(now(), dev.id);
  return dev;
}

// Login attempts: after 10 failures for an email or address, wait 15 minutes.
const failures = new Map();
function checkLimit(key) {
  const f = failures.get(key);
  if (f && f.count >= 10 && Date.now() - f.first < 15 * 60 * 1000) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
}
function fail(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > 15 * 60 * 1000) failures.set(key, { count: 1, first: Date.now() });
  else f.count++;
}

function newDevice(userId, name) {
  const token = b64url(crypto.randomBytes(32));
  const deviceId = id();
  db.prepare('INSERT INTO devices (id, user_id, name, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)')
    .run(deviceId, userId, String(name || 'Device').slice(0, 80), sha256(token), now(), now());
  return { token, device_id: deviceId };
}

const usage = userId => db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM records WHERE user_id = ?').get(userId).bytes;

// ---------- endpoints ----------

const routes = {
  'GET /api/health': () => ({ ok: true, registration: REGISTRATION === 'first' ? (db.prepare('SELECT COUNT(*) n FROM users').get().n ? 'closed' : 'open') : REGISTRATION }),

  // The app needs its key-derivation settings before it can make the login hash.
  'POST /api/prelogin': async ({ body }) => {
    const email = String(body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT kdf FROM users WHERE email = ?').get(email);
    if (user) return { kdf: JSON.parse(user.kdf) };
    return { kdf: { name: 'PBKDF2-SHA256', iterations: 600000, salt: crypto.createHmac('sha256', secret).update(email).digest('base64') } };
  },

  'POST /api/register': async ({ body }) => {
    const users = db.prepare('SELECT COUNT(*) n FROM users').get().n;
    if (REGISTRATION === 'closed' || (REGISTRATION === 'first' && users > 0)) throw new HttpError(403, 'Registration is closed on this server');
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (typeof body.auth_hash !== 'string' || body.auth_hash.length < 32) throw new HttpError(400, 'Missing auth_hash');
    if (typeof body.wrapped_data_key !== 'string' || !body.kdf) throw new HttpError(400, 'Missing keys');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'That email already has an account');
    const salt = b64url(crypto.randomBytes(16));
    const userId = id();
    db.prepare('INSERT INTO users (id, email, auth_hash, auth_salt, kdf, wrapped_data_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, email, await scrypt(body.auth_hash, salt), salt, JSON.stringify(body.kdf), body.wrapped_data_key, now());
    return { user_id: userId, ...newDevice(userId, body.device_name) };
  },

  'POST /api/login': async ({ body, ip }) => {
    const email = String(body.email || '').trim().toLowerCase();
    checkLimit(`e:${email}`);
    checkLimit(`i:${ip}`);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = user && typeof body.auth_hash === 'string' && same(await scrypt(body.auth_hash, user.auth_salt), user.auth_hash);
    if (!ok) { fail(`e:${email}`); fail(`i:${ip}`); throw new HttpError(401, 'Email or password is wrong'); }
    failures.delete(`e:${email}`);
    return { user_id: user.id, wrapped_data_key: user.wrapped_data_key, kdf: JSON.parse(user.kdf), ...newDevice(user.id, body.device_name) };
  },

  'POST /api/logout': ({ req }) => {
    const dev = authed(req);
    db.prepare('DELETE FROM devices WHERE id = ?').run(dev.id);
    return { ok: true };
  },

  'GET /api/devices': ({ req }) => {
    const dev = authed(req);
    return { devices: db.prepare('SELECT id, name, created_at, last_seen FROM devices WHERE user_id = ? ORDER BY last_seen DESC').all(dev.user_id).map(d => ({ ...d, this: d.id === dev.id })) };
  },

  'DELETE /api/devices/:id': ({ req, params }) => {
    const dev = authed(req);
    db.prepare('DELETE FROM devices WHERE id = ? AND user_id = ?').run(params.id, dev.user_id);
    return { ok: true };
  },

  // Push: each record is accepted only if the server's copy is the one the
  // app last saw (base_seq). Otherwise the current copy comes back as a
  // conflict for the app to merge field by field and push again.
  'POST /api/sync/push': ({ req, body }) => {
    const dev = authed(req);
    const list = Array.isArray(body.records) ? body.records : [];
    if (list.length > 2000) throw new HttpError(413, 'Push at most 2000 records at a time');
    const accepted = [];
    const conflicts = [];
    const current = db.prepare('SELECT seq, ciphertext FROM records WHERE user_id = ? AND record_id = ?');
    const bump = db.prepare('UPDATE users SET last_seq = last_seq + 1 WHERE id = ? RETURNING last_seq');
    const put = db.prepare(`INSERT INTO records (user_id, record_id, seq, ciphertext, size_bytes) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, record_id) DO UPDATE SET seq = excluded.seq, ciphertext = excluded.ciphertext, size_bytes = excluded.size_bytes`);
    let bytes = usage(dev.user_id);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const r of list) {
        if (typeof r.record_id !== 'string' || typeof r.ciphertext !== 'string') continue;
        const have = current.get(dev.user_id, r.record_id);
        if ((have?.seq ?? 0) !== (Number(r.base_seq) || 0)) { conflicts.push({ record_id: r.record_id, seq: have.seq, ciphertext: have.ciphertext }); continue; }
        const size = Buffer.byteLength(r.ciphertext);
        bytes += size - (have ? Buffer.byteLength(have.ciphertext) : 0);
        if (bytes > QUOTA) throw new HttpError(507, 'Storage quota reached');
        const seq = bump.get(dev.user_id).last_seq;
        put.run(dev.user_id, r.record_id, seq, r.ciphertext, size);
        accepted.push({ record_id: r.record_id, seq });
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { accepted, conflicts };
  },

  // Pull: everything changed since `since`, in order, a page at a time.
  'GET /api/sync/pull': ({ req, query }) => {
    const dev = authed(req);
    const since = Number(query.get('since')) || 0;
    const limit = Math.min(1000, Number(query.get('limit')) || 500);
    const rows = db.prepare('SELECT record_id, seq, ciphertext FROM records WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?').all(dev.user_id, since, limit + 1);
    const more = rows.length > limit;
    const records = rows.slice(0, limit);
    return { records, last_seq: records.at(-1)?.seq ?? since, more };
  },

  'GET /api/usage': ({ req }) => {
    const dev = authed(req);
    return { bytes: usage(dev.user_id), quota: QUOTA };
  },
};

function match(method, pathname) {
  for (const [key, fn] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const names = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; })}$`);
    const hit = re.exec(pathname);
    if (hit) return { fn, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])])) };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') {
    // Chrome asks before a public site (the app on github.io) talks to a
    // server on a private network; this says it may.
    const headers = { 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600', 'Access-Control-Allow-Private-Network': 'true' };
    if (origin && ORIGINS.includes(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    res.writeHead(204, headers);
    return res.end();
  }
  const url = new URL(req.url, 'http://x');
  const route = match(req.method, url.pathname);
  if (!route) return send(res, 404, { error: 'Not found' }, origin);
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const out = await route.fn({ req, body, params: route.params, query: url.searchParams, ip });
    send(res, 200, out, origin);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? 'Server error' : e.message }, origin);
  }
});

server.listen(PORT, HOST, () => console.log(`sift-server listening on ${HOST}:${PORT} (registration: ${REGISTRATION}, origins: ${ORIGINS.join(' ')})`));
