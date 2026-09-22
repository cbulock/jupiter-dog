import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const storage = require('../netlify/lib/storage');
const { memoryStores } = require('./helpers/memory-store.cjs');
const s = memoryStores();
storage.stores = () => s;
const admin = require('../netlify/functions/photo-admin').handler;
const getImage = require('../netlify/functions/get-image').handler;
const oldUpload = require('../netlify/functions/upload-image').handler;
const worker = require('../netlify/functions/process-upload-background').handler;
const webhook = require('../netlify/functions/sync-images-webhook').handler;
const auth = require('../netlify/lib/auth');
const salt = 'a'.repeat(32);
Object.assign(process.env, { ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync('testing-password', salt, 64).toString('hex')}`,
  ADMIN_SESSION_SECRET: 's'.repeat(64), ADMIN_ORIGIN: 'https://jupiter.dog', PHOTO_WORKER_SECRET: 'w'.repeat(64) });
function event(action, method = 'GET', data, session = false) {
  return { httpMethod: method, queryStringParameters: { action }, headers: {
    origin: 'https://jupiter.dog', ...(session ? { cookie: `jupiter_admin=${auth.makeSession()}` } : {}) },
    body: data === undefined ? '' : JSON.stringify(data) };
}

test('admin handlers reject anonymous writes and missing configuration', async () => {
  for (const action of ['photos', 'date', 'upload-start', 'upload-chunk', 'upload-complete', 'sync', 'audit']) {
    assert.equal((await admin(event(action, action === 'photos' || action === 'audit' ? 'GET' : 'POST', {}))).statusCode, 401);
  }
  const previous = process.env.ADMIN_PASSWORD_HASH;
  delete process.env.ADMIN_PASSWORD_HASH;
  assert.equal((await admin(event('login', 'POST', { password: 'test' }))).statusCode, 503);
  process.env.ADMIN_PASSWORD_HASH = previous;
});

test('handler sessions, CSRF checks, correction writes and clearing operate together', async () => {
  const loggedIn = await admin(event('login', 'POST', { password: 'testing-password' }));
  assert.equal(loggedIn.statusCode, 200); assert.match(loggedIn.headers['Set-Cookie'], /HttpOnly/);
  const evil = event('date', 'POST', { fileName: 'test.jpg', date: '2020-01-02' }, true);
  evil.headers.origin = 'https://evil.example';
  assert.equal((await admin(evil)).statusCode, 403);
  await storage.put(s.metadata, 'test.jpg.json', { fileName: 'test.jpg', width: 20, height: 10, createdDate: '2019-01-01', exifData: { GPSLatitude: 40 } });
  assert.equal((await admin(event('date', 'POST', { fileName: 'test.jpg', date: '2020-01-02' }, true))).statusCode, 200);
  const list = JSON.parse((await admin(event('photos', 'GET', undefined, true))).body);
  assert.equal(list.photos[0].createdDate, '2020-01-02T00:00:00.000Z');
  assert.equal(list.photos[0].exifData, undefined);
  await admin(event('date', 'POST', { fileName: 'test.jpg', date: null }, true));
  assert.equal(await storage.json(s.overrides, 'test.jpg.json'), null);
  const logout = await admin(event('logout', 'POST', {}, true));
  assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
});

test('image delivery requires a published record and blocks raw original storage keys', async () => {
  const missing = await getImage({ httpMethod: 'GET', queryStringParameters: { name: 'originals/secret' } });
  assert.equal(missing.statusCode, 404);
  await s.images.set('versions/abc.jpg', Buffer.from('jpeg data'), { metadata: { contentType: 'image/jpeg' } });
  await storage.put(s.metadata, 'versioned.jpg.json', { fileName: 'versioned.jpg', width: 20, height: 10,
    createdDate: '2020-01-01', imageKey: 'versions/abc.jpg', version: 'abc' });
  const image = await getImage({ httpMethod: 'GET', queryStringParameters: { name: 'versioned.jpg', v: 'abc' } });
  assert.equal(image.statusCode, 200); assert.match(image.headers['Cache-Control'], /immutable/);
  assert.equal(Buffer.from(image.body, 'base64').toString(), 'jpeg data');
  assert.equal((await getImage({ httpMethod: 'GET', queryStringParameters: {} })).statusCode, 400);
});

test('retired uploads, worker authorization and webhook verification reject unsafe requests', async () => {
  assert.equal((await oldUpload(event('anything', 'POST', {}))).statusCode, 410);
  assert.equal((await worker(event('anything', 'POST', {}))).statusCode, 403);
  assert.equal((await webhook({ httpMethod: 'POST', body: '{}', headers: {} })).statusCode, 403);
  assert.equal((await webhook({ httpMethod: 'GET', queryStringParameters: {} })).statusCode, 400);
  const challenge = await webhook({ httpMethod: 'GET', queryStringParameters: { challenge: 'test_123' } });
  assert.equal(challenge.statusCode, 200); assert.equal(challenge.body, 'test_123');
});
