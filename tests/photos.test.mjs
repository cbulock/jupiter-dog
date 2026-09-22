import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { memoryStores } = require('./helpers/memory-store.cjs');
const { put, json } = require('../netlify/lib/storage');
const photos = require('../netlify/lib/photos');
const uploads = require('../netlify/lib/uploads');
const dropbox = require('../netlify/lib/dropbox');
const auth = require('../netlify/lib/auth');
const { withLock } = require('../netlify/lib/locks');
const { queueSync, pendingSyncs, resumePending } = require('../netlify/lib/sync-queue');
const importedAt = '2026-09-22T12:00:00.000Z';
const image = (format = 'jpeg') => sharp({ create: { width: 80, height: 40, channels: 3, background: '#cd7546' } }).toFormat(format).toBuffer();

test('date selection handles missing, invalid and zero EXIF with ordered fallbacks', () => {
  const source = { clientModified: '2020-01-02T00:00:00Z', serverModified: '2021-01-02T00:00:00Z', lastModified: 1700000000000 };
  assert.equal(photos.automaticDate({ DateTimeOriginal: 1714935783, CreateDate: 1700000000 }, source, importedAt).dateSource, 'exif-original');
  assert.equal(photos.automaticDate({ DateTimeOriginal: 0, CreateDate: 1700000000 }, source, importedAt).dateSource, 'exif-created');
  assert.equal(photos.automaticDate({ DateTimeOriginal: 'invalid' }, source, importedAt).dateSource, 'dropbox-client');
  assert.equal(photos.automaticDate({}, { ...source, clientModified: 'bad' }, importedAt).dateSource, 'dropbox-server');
  assert.equal(photos.automaticDate({}, { lastModified: 1700000000000 }, importedAt).dateSource, 'file-modified');
  assert.equal(photos.automaticDate({}, {}, importedAt).dateSource, 'imported');
  assert.equal(photos.calendarDate('2024-02-29'), '2024-02-29T00:00:00.000Z');
  assert.equal(photos.calendarDate('2023-02-29'), null);
});

test('real EXIF-free JPEG, PNG, GIF and WebP publish with private originals and safe public metadata', async () => {
  for (const format of ['jpeg', 'png', 'gif', 'webp']) {
    const s = memoryStores(); const bytes = await image(format);
    const record = await photos.processPhoto(s, { fileName: `snap.${format}`, bytes, importedAt, source: { kind: 'admin', lastModified: '2020-05-04T14:00:00Z' } });
    assert.equal(record.dateSource, 'file-modified'); assert.equal(record.width, 80); assert.equal(record.height, 40);
    assert.equal(record.blurhash.length, 36);
    assert.deepEqual(Buffer.from(await s.originals.get(record.originalKey, { type: 'arrayBuffer' })), bytes);
    const delivered = await sharp(Buffer.from(await s.images.get(record.imageKey, { type: 'arrayBuffer' }))).metadata();
    assert.equal(delivered.format, 'jpeg'); assert.equal(delivered.exif, undefined);
    const [publicRecord] = await photos.catalog(s);
    assert.deepEqual(Object.keys(publicRecord).sort(), ['blurhash', 'createdDate', 'fileName', 'height', 'version', 'width']);
  }
});

test('EXIF capture date and orientation are extracted before converting', async () => {
  const s = memoryStores();
  const bytes = await sharp(await image()).withMetadata({ orientation: 6, exif: { IFD0: { DateTime: '2020:01:02 12:30:00' }, IFD2: { DateTimeOriginal: '2019:07:04 16:30:00' } } }).toBuffer();
  const record = await photos.processPhoto(s, { fileName: 'rotated.jpg', bytes, importedAt });
  assert.equal(record.dateSource, 'exif-original'); assert.equal(record.automaticDate.slice(0, 10), '2019-07-04');
  assert.equal(record.width, 40); assert.equal(record.height, 80);
});

test('corrections survive reprocessing; clearing restores automatic date; output order is stable', async () => {
  const s = memoryStores(); const bytes = await image();
  await photos.processPhoto(s, { fileName: 'b.jpg', bytes, importedAt });
  await photos.processPhoto(s, { fileName: 'a.jpg', bytes, importedAt });
  await put(s.overrides, 'b.jpg.json', { createdDate: photos.calendarDate('2026-09-23') });
  await photos.processPhoto(s, { fileName: 'b.jpg', bytes, importedAt, source: { lastModified: '2000-01-01' } });
  assert.equal((await photos.catalog(s))[0].fileName, 'b.jpg');
  await s.overrides.delete('b.jpg.json');
  assert.equal((await photos.catalog(s))[0].fileName, 'a.jpg');
  await put(s.metadata, 'broken.json', { fileName: 'broken', width: null, createdDate: importedAt });
  assert.equal((await photos.catalog(s)).length, 2);
});

test('interrupted uploads resume; checksums and byte limits are enforced; retries publish once', async () => {
  const s = memoryStores();
  // Legal JPEG trailing bytes make a real multi-chunk upload without an expensive huge image.
  const bytes = Buffer.concat([await image(), Buffer.alloc(photos.CHUNK_BYTES + 10)]);
  const data = { id: crypto.randomUUID(), name: 'snap.jpg', size: bytes.length, lastModified: 1700000000000,
    digest: crypto.createHash('sha256').update(bytes).digest('hex') };
  let state = await uploads.startUpload(s, data);
  assert.equal(state.chunks, 2);
  await uploads.saveChunk(s, data.id, 0, bytes.subarray(0, photos.CHUNK_BYTES));
  state = await uploads.startUpload(s, data);
  assert.deepEqual(state.received, [0]);
  await assert.rejects(uploads.completeUpload(s, data.id, async () => {}), /incomplete/);
  await assert.rejects(uploads.saveChunk(s, data.id, 1, Buffer.from('wrong')), /incorrect size/);
  await uploads.saveChunk(s, data.id, 1, bytes.subarray(photos.CHUNK_BYTES));
  await assert.rejects(uploads.completeUpload(s, data.id, async () => { throw new Error('offline'); }), /offline/);
  assert.equal((await uploads.uploadStatus(s, data.id)).job.status, 'error');
  await uploads.completeUpload(s, data.id, async () => {});
  await uploads.processUpload(s, data.id);
  await uploads.processUpload(s, data.id);
  assert.equal((await photos.catalog(s)).length, 1);
  assert.equal((await uploads.uploadStatus(s, data.id)).job.status, 'published');
  assert.equal((await uploads.uploadStatus(s, data.id)).received.length, 0);
  await assert.rejects(uploads.startUpload(s, { ...data, name: 'different.jpg' }), /different file/);
  await assert.rejects(uploads.startUpload(s, { ...data, id: crypto.randomUUID(), size: photos.MAX_BYTES + 1 }), /50 MiB/);
  const second = { ...data, id: crypto.randomUUID() };
  await uploads.startUpload(s, second);
  assert.notEqual((await uploads.uploadStatus(s, data.id)).fileName, (await uploads.uploadStatus(s, second.id)).fileName);
  await uploads.cleanup(s, Date.now() + 86400001);
  await assert.rejects(uploads.uploadStatus(s, second.id), /not found/);
});

test('corrupt image processing leaves a retryable error and no gallery entry', async () => {
  const s = memoryStores(); const bytes = Buffer.from('not an image');
  const data = { id: crypto.randomUUID(), name: 'bad.png', size: bytes.length, digest: crypto.createHash('sha256').update(bytes).digest('hex') };
  await uploads.startUpload(s, data); await uploads.saveChunk(s, data.id, 0, bytes);
  await assert.rejects(uploads.processUpload(s, data.id));
  assert.equal((await uploads.uploadStatus(s, data.id)).job.status, 'error');
  assert.deepEqual(await photos.catalog(s), []);
});

test('Dropbox paginates, repairs invisible images, isolates failures, and detects revisions', async () => {
  const s = memoryStores(); const bytes = await image();
  const files = [
    { '.tag': 'file', id: 'id:1', name: 'snap.jpg', rev: '1', size: bytes.length, client_modified: '2020-01-01T00:00:00Z' },
    { '.tag': 'file', id: 'id:bad', name: 'bad.jpg', rev: '1', size: 20 },
    { '.tag': 'file', id: 'id:2', name: 'later.jpg', rev: '1', size: bytes.length },
  ];
  let downloads = 0; let pages = 0;
  const client = { filesListFolder: async () => ({ result: { entries: files.slice(0, 2), has_more: true, cursor: 'next' } }),
    filesListFolderContinue: async () => { pages++; return { result: { entries: files.slice(2), has_more: false } }; },
    filesDownload: async ({ path }) => { downloads++; if (path === 'id:bad') throw new Error('Unavailable'); return { result: { fileBinary: bytes } }; } };
  await s.images.set('snap.jpg', bytes); // The original Snapchat failure: bytes exist without metadata.
  const before = await dropbox.audit(s);
  assert.deepEqual(before.missingMetadata, ['snap.jpg']);
  const result = await dropbox.runSync(s, client);
  assert.equal(pages, 1); assert.equal(result.added, 2); assert.equal(result.errors.length, 1);
  assert.equal((await photos.catalog(s)).length, 2);
  assert.equal((await json(s.metadata, 'snap.jpg.json')).dateSource, 'dropbox-client');
  const repeat = await dropbox.runSync(s, client);
  assert.equal(repeat.unchanged, 2); assert.equal(downloads, 4);
  files[0].rev = '2'; files[0].name = 'renamed.jpg';
  const changed = await dropbox.runSync(s, client);
  assert.equal(changed.updated, 1); assert.equal((await json(s.metadata, 'snap.jpg.json')).source.rev, '2');
  assert.equal((await photos.catalog(s)).length, 2);
});

test('migration preserves legacy dates; recovery reports fallback dates without deleting originals', async () => {
  const s = memoryStores(); const bytes = await image();
  await s.images.set('legacy.jpg', bytes); await s.images.set('orphan.png', await image('png'));
  await put(s.metadata, 'legacy.jpg.json', { fileName: 'legacy.jpg', createdDate: '2018-01-01T00:00:00Z', width: 80, height: 40 });
  const client = { filesListFolder: async () => ({ result: { entries: [{ '.tag': 'file', id: 'legacy', name: 'legacy.jpg', rev: '1' }], has_more: false } }),
    filesDownload: async () => { throw new Error('Legacy photo should not be downloaded'); } };
  await dropbox.runSync(s, client, { repair: true });
  assert.equal((await json(s.metadata, 'legacy.jpg.json')).createdDate, '2018-01-01T00:00:00Z');
  assert.equal((await json(s.metadata, 'orphan.png.json')).dateSource, 'imported');
  assert.ok(await s.images.getMetadata('orphan.png'));
  assert.equal((await dropbox.audit(s)).fallbackDates.length, 1);
});

test('sessions expire, password changes revoke sessions, and cross-origin writes fail', () => {
  const env = { ADMIN_PASSWORD_HASH: `scrypt:${'a'.repeat(32)}:${'b'.repeat(128)}`, ADMIN_SESSION_SECRET: 'c'.repeat(32), ADMIN_ORIGIN: 'https://jupiter.dog' };
  const session = auth.makeSession(env, 1000);
  const event = { httpMethod: 'POST', headers: { Cookie: `jupiter_admin=${session}`, Origin: 'https://jupiter.dog' } };
  assert.equal(auth.authenticated(event, env, 2000), true);
  assert.equal(auth.authenticated(event, env, 9 * 60 * 60 * 1000), false);
  assert.equal(auth.authenticated(event, { ...env, ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH.replace(/b/g, 'd') }, 2000), false);
  assert.equal(auth.authenticated(event, {}, 2000), false);
  assert.throws(() => auth.origin({ headers: { origin: 'https://other.example' } }, env), /not allowed/);
  assert.match(auth.cookie(session), /HttpOnly.*SameSite=Strict.*Secure/);
});

test('sign-in attempts are limited and webhook signatures use the exact raw body', async () => {
  const s = memoryStores(); const salt = 'a'.repeat(32); const hash = crypto.scryptSync('test-only-password', salt, 64).toString('hex');
  const env = { ADMIN_PASSWORD_HASH: `scrypt:${salt}:${hash}`, ADMIN_SESSION_SECRET: 's'.repeat(32), ADMIN_ORIGIN: 'https://jupiter.dog' };
  const event = { headers: { origin: 'https://jupiter.dog', 'x-nf-client-connection-ip': '127.0.0.1' } };
  assert.ok(await auth.login(event, 'test-only-password', s, env));
  for (let i = 0; i < 9; i++) await assert.rejects(auth.login(event, 'bad', s, env), /Invalid password/);
  await assert.rejects(auth.login(event, 'test-only-password', s, env), /Too many/);
  const payload = '{"list_folder":{"accounts":["test"]}}';
  const signature = crypto.createHmac('sha256', 'secret').update(payload).digest('hex');
  assert.equal(dropbox.validWebhook({ body: Buffer.from(payload).toString('base64'), isBase64Encoded: true, headers: { 'X-Dropbox-Signature': signature } }, 'secret'), true);
  assert.equal(dropbox.validWebhook({ body: payload + ' ', headers: { 'x-dropbox-signature': signature } }, 'secret'), false);
});

test('conditional processing leases reject overlapping work and release after failure', async () => {
  const s = memoryStores(); let release;
  const first = withLock(s, 'sync', () => new Promise((resolve) => { release = resolve; }));
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(withLock(s, 'sync', async () => {}), /busy/);
  release(); await first;
  await assert.rejects(withLock(s, 'sync', async () => { throw new Error('processing failed'); }), /processing failed/);
  assert.equal(await withLock(s, 'sync', async () => 'released'), 'released');
});

test('sync requests survive dispatch and remain visible for retry if dispatch fails', async () => {
  const s = memoryStores(); const dispatched = [];
  const dispatch = async (name, options) => { dispatched.push({ name, options }); };
  const job = await queueSync(s, dispatch, true);
  assert.equal((await pendingSyncs(s))[0].id, job.id);
  await resumePending(s, dispatch);
  assert.equal(dispatched[1].options.runId, job.id);
  assert.equal(dispatched[1].options.repair, true);
  await assert.rejects(queueSync(s, async () => { throw new Error('offline'); }), /offline/);
  const report = await dropbox.audit(s);
  assert.equal(report.failures.length, 1);
  assert.equal((await pendingSyncs(s)).length, 1);
});
