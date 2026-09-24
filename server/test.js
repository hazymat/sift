// End-to-end check of sift-server against a throwaway database.
//   node test.js      (starts its own server on a spare port)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sift-test-'));
const PORT = 18000 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT, DATA_DIR: dir, REGISTRATION: 'first' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => child.stdout.once('data', r));
const base = `http://127.0.0.1:${PORT}`;

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), json: await res.json().catch(() => null) };
}

try {
  let r = await call('GET', '/api/health');
  assert.equal(r.json.registration, 'open');

  r = await call('POST', '/api/register', { email: 'Mat@Example.com', auth_hash: 'a'.repeat(44), kdf: { name: 'PBKDF2-SHA256', iterations: 600000, salt: 's' }, wrapped_data_key: 'wrapped', recovery_hash: 'r'.repeat(44), device_name: 'Laptop' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.cors, 'http://localhost:5173');
  const laptop = r.json.token;

  r = await call('POST', '/api/register', { email: 'other@example.com', auth_hash: 'b'.repeat(44), kdf: {}, wrapped_data_key: 'x' });
  assert.equal(r.status, 403, 'second registration refused');

  r = await call('POST', '/api/prelogin', { email: 'mat@example.com' });
  assert.equal(r.json.kdf.salt, 's');

  r = await call('POST', '/api/login', { email: 'mat@example.com', auth_hash: 'wrong'.repeat(9), device_name: 'Phone' });
  assert.equal(r.status, 401);
  r = await call('POST', '/api/login', { email: 'mat@example.com', auth_hash: 'a'.repeat(44), device_name: 'Phone' });
  assert.equal(r.status, 200);
  assert.equal(r.json.wrapped_data_key, 'wrapped');
  const phone = r.json.token;

  // push two new records from the laptop
  r = await call('POST', '/api/sync/push', { records: [{ record_id: 'r1', base_seq: 0, ciphertext: 'c1' }, { record_id: 'r2', base_seq: 0, ciphertext: 'c2' }] }, laptop);
  assert.deepEqual(r.json.accepted.map(a => a.seq), [1, 2]);

  // the phone pulls them
  r = await call('GET', '/api/sync/pull?since=0', null, phone);
  assert.equal(r.json.records.length, 2);
  assert.equal(r.json.last_seq, 2);

  // the phone edits r1 (knows seq 1): accepted
  r = await call('POST', '/api/sync/push', { records: [{ record_id: 'r1', base_seq: 1, ciphertext: 'c1-phone' }] }, phone);
  assert.equal(r.json.accepted[0].seq, 3);

  // the laptop still thinks r1 is at seq 1: conflict, gets the phone's copy back
  r = await call('POST', '/api/sync/push', { records: [{ record_id: 'r1', base_seq: 1, ciphertext: 'c1-laptop' }] }, laptop);
  assert.equal(r.json.accepted.length, 0);
  assert.equal(r.json.conflicts[0].ciphertext, 'c1-phone');
  assert.equal(r.json.conflicts[0].seq, 3);

  // after merging, the laptop pushes on top of seq 3
  r = await call('POST', '/api/sync/push', { records: [{ record_id: 'r1', base_seq: 3, ciphertext: 'c1-merged' }] }, laptop);
  assert.equal(r.json.accepted[0].seq, 4);

  r = await call('GET', '/api/sync/pull?since=2', null, phone);
  assert.deepEqual(r.json.records.map(x => [x.record_id, x.seq, x.ciphertext]), [['r1', 4, 'c1-merged']]);

  r = await call('GET', '/api/devices', null, laptop);
  assert.equal(r.json.devices.length, 2);

  r = await call('GET', '/api/sync/pull?since=0', null, 'nonsense');
  assert.equal(r.status, 401);

  r = await call('GET', '/api/me', null, laptop);
  assert.equal(r.json.wrapped_data_key, 'wrapped');

  // change the password: needs the old one; other devices are signed out
  r = await call('POST', '/api/password', { old_auth_hash: 'nope'.repeat(11), auth_hash: 'c'.repeat(44), kdf: { salt: 's2' }, wrapped_data_key: 'wrapped2' }, laptop);
  assert.equal(r.status, 401);
  r = await call('POST', '/api/password', { old_auth_hash: 'a'.repeat(44), auth_hash: 'c'.repeat(44), kdf: { salt: 's2' }, wrapped_data_key: 'wrapped2' }, laptop);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call('GET', '/api/sync/pull?since=0', null, phone);
  assert.equal(r.status, 401, 'other devices signed out');
  r = await call('GET', '/api/sync/pull?since=0', null, laptop);
  assert.equal(r.status, 200, 'this device stays signed in');
  r = await call('POST', '/api/login', { email: 'mat@example.com', auth_hash: 'a'.repeat(44) });
  assert.equal(r.status, 401, 'old password no longer works');
  r = await call('POST', '/api/login', { email: 'mat@example.com', auth_hash: 'c'.repeat(44) });
  assert.equal(r.json.wrapped_data_key, 'wrapped2');

  // forgot the password: the recovery code sets a new one and signs everything else out
  r = await call('POST', '/api/recover', { email: 'mat@example.com', recovery_hash: 'x'.repeat(44), auth_hash: 'd'.repeat(44), kdf: {}, wrapped_data_key: 'w3' });
  assert.equal(r.status, 401);
  r = await call('POST', '/api/recover', { email: 'mat@example.com', recovery_hash: 'r'.repeat(44), auth_hash: 'd'.repeat(44), kdf: { salt: 's3' }, wrapped_data_key: 'w3', device_name: 'Recovered' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const recovered = r.json.token;
  r = await call('GET', '/api/sync/pull?since=0', null, laptop);
  assert.equal(r.status, 401, 'recovery signs out every other device');
  r = await call('GET', '/api/sync/pull?since=0', null, recovered);
  assert.equal(r.json.records.length, 2, 'data is still there');
  r = await call('POST', '/api/login', { email: 'mat@example.com', auth_hash: 'd'.repeat(44) });
  assert.equal(r.json.wrapped_data_key, 'w3');

  // attachment files: raw encrypted bytes under an opaque id
  const fid = 'ab'.repeat(20);
  const raw = (method, path, body, token) => fetch(base + path, { method, headers: { Origin: 'http://localhost:5173', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  let f = await raw('PUT', `/api/blobs/${fid}`, Buffer.from([1, 2, 3, 4, 5]), 'nonsense');
  assert.equal(f.status, 401, 'files need a signed-in device');
  f = await raw('PUT', `/api/blobs/${fid}`, Buffer.from([1, 2, 3, 4, 5]), recovered);
  assert.equal(f.status, 200);
  f = await raw('PUT', '/api/blobs/not-an-id', Buffer.from([1]), recovered);
  assert.equal(f.status, 400, 'ids are 40 hex characters');
  f = await raw('GET', `/api/blobs/${fid}`, undefined, recovered);
  assert.deepEqual([...new Uint8Array(await f.arrayBuffer())], [1, 2, 3, 4, 5]);
  assert.equal(f.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  f = await raw('GET', '/api/blobs', undefined, recovered);
  assert.deepEqual((await f.json()).blobs, [{ id: fid, size: 5 }]);
  r = await call('GET', '/api/usage', null, recovered);
  assert.ok(r.json.bytes >= 5 + 'c2'.length, 'files count towards the quota');
  f = await raw('GET', `/api/blobs/${'cd'.repeat(20)}`, undefined, recovered);
  assert.equal(f.status, 404);
  f = await raw('DELETE', `/api/blobs/${fid}`, undefined, recovered);
  assert.equal(f.status, 200);
  f = await raw('GET', `/api/blobs/${fid}`, undefined, recovered);
  assert.equal(f.status, 404, 'deleted');

  console.log('all server checks passed');
} finally {
  child.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
