import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { memoryStores } = require('./helpers/memory-store.cjs');
const { put } = require('../netlify/lib/storage');
const { audit } = require('../netlify/lib/dropbox');
const record = (fileName, extra = {}) => ({ fileName, width: 80, height: 40,
  automaticDate: '2020-01-01', dateSource: 'exif-original', ...extra });

test('audit joins paginated stores without per-image checks or missing-key reads', async (t) => {
  const s = memoryStores();
  for (let i = 0; i < 250; i++) {
    await put(s.metadata, `photo-${i}.json`, record(`photo-${i}`));
    await s.images.set(`photo-${i}`, 'image');
  }
  await put(s.metadata, 'modern.json', record('modern', { imageKey: 'versions/current.jpg' }));
  await s.images.set('versions/current.jpg', 'image');
  await s.images.set('versions/unused.jpg', 'image');
  await s.images.set('orphan.jpg', 'image');
  await s.images.set('invalid', 'image');
  await put(s.metadata, 'invalid.json', record('invalid', { width: 0 }));
  await put(s.metadata, 'deleted.json', null);
  await put(s.metadata, 'missing.json', record('missing', { imageKey: 'versions/missing.jpg' }));
  await s.images.set('missing', 'old image'); // Must check imageKey, not the legacy filename.
  await put(s.metadata, 'photo-0.json', record('photo-0', { dateSource: 'imported' }));
  await put(s.metadata, 'photo-1.json', record('photo-1', { dateSource: 'file-modified' }));
  await put(s.overrides, 'photo-0.json', { createdDate: '2020-01-02' });
  const failed = { id: 'failed', status: 'error', errors: [{ name: 'failed.jpg', error: 'Unavailable' }] };
  const partial = { id: 'partial', status: 'partial' };
  await put(s.jobs, 'failed.json', failed);
  await put(s.jobs, 'partial.json', partial);
  await put(s.jobs, 'complete.json', { status: 'complete' });
  const reads = { metadata: 0, overrides: 0, jobs: 0 };
  let active = 0; let peak = 0;
  for (const name of Object.keys(reads)) {
    const get = s[name].get.bind(s[name]);
    t.mock.method(s[name], 'get', async (...args) => {
      reads[name]++; active++; peak = Math.max(peak, active);
      try {
        await new Promise((resolve) => setImmediate(resolve));
        return await get(...args);
      } finally { active--; }
    });
  }
  t.mock.method(s.images, 'get', () => assert.fail('audit must not download image bytes'));
  t.mock.method(s.images, 'getMetadata', () => assert.fail('use the image listing instead of per-image HEAD requests'));
  const report = await audit(s);
  assert.equal(report.complete.length, 251);
  assert.ok(report.complete.includes('modern'));
  assert.deepEqual(report.missingMetadata, ['orphan.jpg', 'invalid']);
  assert.deepEqual(report.missingImages, ['missing']);
  assert.deepEqual(report.fallbackDates, [{ name: 'photo-1', date: '2020-01-01', source: 'file-modified' }]);
  assert.deepEqual(report.failures, [{ name: 'invalid', error: 'Incomplete gallery metadata' }, failed, partial]);
  assert.deepEqual(reads, { metadata: 254, overrides: 1, jobs: 3 });
  assert.ok(peak > 1 && peak <= 48);
});

test('audit surfaces a failed store read instead of reporting photos missing', async (t) => {
  const s = memoryStores();
  await put(s.metadata, 'photo.json', record('photo'));
  t.mock.method(s.metadata, 'get', async () => { throw new Error('Storage unavailable'); });
  await assert.rejects(audit(s), /Storage unavailable/);
});
