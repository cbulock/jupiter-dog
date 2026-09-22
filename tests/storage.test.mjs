import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { MemoryStore } = require('./helpers/memory-store.cjs');
const { readJsonEntries, put } = require('../netlify/lib/storage');

test('bulk reads paginate, bound concurrency and preserve keys despite out-of-order completion', async (t) => {
  const store = new MemoryStore();
  for (let i = 0; i < 65; i++) await put(store, `record-${i}`, { i });
  const get = store.get.bind(store);
  let active = 0; let peak = 0;
  t.mock.method(store, 'get', async (key, options) => {
    active++; peak = Math.max(peak, active);
    try {
      assert.equal(options.consistency, 'strong');
      await new Promise((resolve) => setTimeout(resolve, Number(key.slice(7)) % 3));
      // A blob can be deleted between listing and reading.
      return key === 'record-3' ? null : get(key, options);
    } finally { active--; }
  });
  const records = await readJsonEntries(store);
  assert.ok(peak > 1, 'storage reads must overlap instead of running serially');
  assert.ok(peak <= 16, 'large stores must not launch unbounded requests');
  assert.deepEqual(records, Array.from({ length: 65 }, (_, i) => ({
    key: `record-${i}`, value: i === 3 ? null : { i },
  })));
  assert.deepEqual(await readJsonEntries(new MemoryStore()), []);
});

test('bulk reads propagate storage failures instead of returning an incomplete collection', async (t) => {
  const store = new MemoryStore();
  await put(store, 'record', {});
  t.mock.method(store, 'get', async () => { throw new Error('Storage unavailable'); });
  await assert.rejects(readJsonEntries(store), /Storage unavailable/);
});
