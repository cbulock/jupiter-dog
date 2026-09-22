import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Dropbox } = require('dropbox');
const { Response } = require('node-fetch');
const sharp = require('sharp');
const { memoryStores } = require('./helpers/memory-store.cjs');
const { json } = require('../netlify/lib/storage');
const { runSync } = require('../netlify/lib/dropbox');
const file = (name, rev) => ({ '.tag': 'file', id: `id:${name}`, name, rev, size: 100,
  client_modified: '2024-02-03T12:20:29Z', server_modified: '2024-02-03T12:20:29Z' });

test('real Dropbox SDK sends a revision-pinned download and processes binary response bytes', async () => {
  const s = memoryStores();
  const entry = file('IMG_20240203_122029_482.jpg', 'abcdef12345');
  const bytes = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#cd7546' } }).jpeg().toBuffer();
  let downloads = 0;
  const client = new Dropbox({ accessToken: 'test-only', fetch: async (url, options) => {
    if (url === 'https://api.dropboxapi.com/2/files/list_folder') {
      return new Response(JSON.stringify({ entries: [entry], has_more: false }));
    }
    assert.equal(url, 'https://content.dropboxapi.com/2/files/download');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.headers['Dropbox-API-Arg']), { path: 'rev:abcdef12345' });
    assert.equal(options.body, undefined);
    downloads++;
    return new Response(bytes, { headers: { 'dropbox-api-result': JSON.stringify(entry) } });
  } });
  const result = await runSync(s, client);
  assert.equal(result.status, 'complete');
  assert.equal(result.added, 1);
  assert.equal(downloads, 1);
  const stored = await json(s.metadata, `${entry.name}.json`);
  assert.equal(stored.source.id, entry.id);
  assert.equal(stored.source.rev, entry.rev);
  assert.deepEqual(Buffer.from(await s.originals.get(stored.originalKey, { type: 'arrayBuffer' })), bytes);
});

test('real SDK plain-text 400 and structured errors retain the Dropbox explanation in activity', async () => {
  const s = memoryStores();
  const files = [file('Snapchat-415352760.jpg', '111111111'), file('Snapchat-893305920.jpg', '222222222')];
  const detail = 'Error in call to API function "files/download": invalid download argument';
  const client = new Dropbox({ accessToken: 'test-only', fetch: async (url, options) => {
    if (url.endsWith('/files/list_folder')) return new Response(JSON.stringify({ entries: files, has_more: false }));
    const { path } = JSON.parse(options.headers['Dropbox-API-Arg']);
    return path === 'rev:111111111' ? new Response(detail, { status: 400 })
      : new Response(JSON.stringify({ error_summary: 'path/not_found/', error: { '.tag': 'path' } }), { status: 409 });
  } });
  const result = await runSync(s, client);
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.errors, [
    { name: files[0].name, error: `Downloading from Dropbox: Dropbox (400): ${detail}` },
    { name: files[1].name, error: 'Downloading from Dropbox: Dropbox (409): path/not_found/' },
  ]);
  assert.deepEqual((await json(s.jobs, `sync-${result.id}.json`)).errors, result.errors);
});

test('folder-list failures retain their explanation and stop before downloading', async () => {
  const client = new Dropbox({ accessToken: 'test-only', fetch: async (url) => {
    assert.ok(url.endsWith('/files/list_folder'));
    return new Response(JSON.stringify({ error_summary: 'missing_scope/files.metadata.read' }), { status: 401 });
  } });
  const result = await runSync(memoryStores(), client);
  assert.equal(result.status, 'error');
  assert.equal(result.errors[0].error, 'Dropbox (401): missing_scope/files.metadata.read');
});
