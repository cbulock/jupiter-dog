import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { memoryStores } = require('./helpers/memory-store.cjs');
const { json } = require('../netlify/lib/storage');
const photos = require('../netlify/lib/photos');
const uploads = require('../netlify/lib/uploads');
const dropbox = require('../netlify/lib/dropbox');
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

test('HEIC and HEIF uploads publish browser-safe JPEGs and retain originals across retries', async () => {
  const bytes = fixture('rainbow.heic');
  for (const name of ['phone.HEIC', 'phone.heif']) {
    const s = memoryStores();
    const data = { id: crypto.randomUUID(), name, size: bytes.length,
      digest: crypto.createHash('sha256').update(bytes).digest('hex'), lastModified: '2020-05-04T14:00:00Z' };
    const state = await uploads.startUpload(s, data);
    await uploads.saveChunk(s, data.id, 0, bytes);
    await uploads.completeUpload(s, data.id, async () => {});
    await uploads.processUpload(s, data.id);
    await uploads.processUpload(s, data.id);
    assert.equal((await uploads.uploadStatus(s, data.id)).job.status, 'published');
    assert.equal((await photos.catalog(s)).length, 1);
    const record = await json(s.metadata, `${state.fileName}.json`);
    assert.equal(record.displayName, name);
    assert.equal(record.dateSource, 'file-modified');
    assert.equal(record.blurhash.length, 36);
    assert.deepEqual(Buffer.from(await s.originals.get(record.originalKey, { type: 'arrayBuffer' })), bytes);
    assert.equal((await s.originals.getMetadata(record.originalKey)).metadata.contentType, 'image/heic');
    const jpeg = Buffer.from(await s.images.get(record.imageKey, { type: 'arrayBuffer' }));
    const info = await sharp(jpeg).metadata();
    assert.equal(info.format, 'jpeg');
    assert.equal(info.width, 451); assert.equal(info.height, 461);
    assert.equal(info.exif, undefined);
    await sharp(jpeg).raw().toBuffer(); // Force a full decode of the delivery image.
  }
});

test('Dropbox includes HEIC/HEIF files and keeps the iPhone capture date and GPS data', async () => {
  const s = memoryStores(); const bytes = fixture('iphone.heic');
  const files = ['iphone.HEIC', 'copy.heif', 'movie.mov', 'folder.heic'].map((name, i) => ({
    '.tag': i === 3 ? 'folder' : 'file', name, id: `id:${i}`, rev: `${i + 1}`.repeat(9),
    size: bytes.length, client_modified: '2026-09-22T12:00:00Z',
  }));
  let downloads = 0;
  const client = {
    filesListFolder: async () => ({ result: { entries: files, has_more: false } }),
    filesDownload: async () => { downloads++; return { result: { fileBinary: bytes } }; },
  };
  const result = await dropbox.runSync(s, client);
  assert.equal(result.status, 'complete'); assert.equal(result.added, 2); assert.equal(downloads, 2);
  const record = await json(s.metadata, 'iphone.HEIC.json');
  assert.equal(record.automaticDate, '2019-08-21T10:57:23.000Z');
  assert.equal(record.dateSource, 'exif-original');
  assert.ok(Math.abs(record.exifData.GPSLatitude - 7.8314305555555555) < 1e-8);
  assert.ok(Math.abs(record.exifData.GPSLongitude - 98.29665277777778) < 1e-8);
  assert.equal(record.exifData.GPSLatitudeRef, 'N');
  assert.equal(record.exifData.GPSLongitudeRef, 'E');
  assert.ok(Math.abs(record.exifData.GPSAltitude - 12.766179500510273) < 1e-8);
  assert.ok(Math.abs(record.exifData.GPSImgDirection - 163.6655656482246) < 1e-8);
  assert.equal(record.width, 2560); assert.equal(record.height, 1920);
  assert.equal((await dropbox.runSync(s, client)).unchanged, 2);
  assert.equal(downloads, 2);
  assert.deepEqual((await json(s.metadata, 'iphone.HEIC.json')).exifData, record.exifData);
});

test('damaged HEIC uploads fail without publishing a gallery record', async () => {
  const s = memoryStores(); const bytes = fixture('rainbow.heic').subarray(0, 128);
  const data = { id: crypto.randomUUID(), name: 'broken.heic', size: bytes.length,
    digest: crypto.createHash('sha256').update(bytes).digest('hex') };
  await uploads.startUpload(s, data);
  await uploads.saveChunk(s, data.id, 0, bytes);
  await assert.rejects(uploads.processUpload(s, data.id));
  assert.equal((await uploads.uploadStatus(s, data.id)).job.status, 'error');
  assert.deepEqual(await photos.catalog(s), []);
});

test('HEIC container rotation is applied once, before JPEG resizing', async () => {
  const bytes = fixture('iphone.heic');
  // The fixture has an existing, associated irot property set to zero.
  // Set it to 90 degrees counterclockwise without changing box sizes/offsets.
  const offset = bytes.indexOf('irot');
  assert.equal(bytes.readUInt32BE(offset - 4), 9);
  bytes[offset + 4] = 1;
  const s = memoryStores();
  const record = await photos.processPhoto(s, { fileName: 'portrait.heic', bytes });
  assert.equal(record.width, 1920); assert.equal(record.height, 2560);
  assert.equal(record.automaticDate, '2019-08-21T10:57:23.000Z');
  const jpeg = Buffer.from(await s.images.get(record.imageKey, { type: 'arrayBuffer' }));
  const info = await sharp(jpeg).metadata();
  assert.equal(info.orientation, undefined);
  assert.equal(info.width, 1920); assert.equal(info.height, 2560);
});
