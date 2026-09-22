// Run only against tests/helpers/photo-preview.cjs, which creates isolated test storage.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const base = 'http://localhost:8890';

async function main() {
  let cookie = '';
  async function admin(action, data, method = data === undefined ? 'GET' : 'POST', query = '', authorized = true) {
    const binary = Buffer.isBuffer(data);
    return fetch(`${base}/.netlify/functions/photo-admin?action=${action}${query}`, { method,
      headers: { origin: base, ...(authorized ? { cookie } : {}), ...(data === undefined ? {} : { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' }) },
      body: data === undefined ? undefined : binary ? data : JSON.stringify(data) });
  }
  const login = await admin('login', { password: 'local-photo-test-only' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  const original = await sharp({ create: { width: 90, height: 60, channels: 3, background: '#ee7755' } }).jpeg().toBuffer();
  const bytes = Buffer.concat([original, Buffer.alloc(3 * 1024 * 1024 + 30)]);
  const id = crypto.randomUUID();
  const input = { id, name: 'snapchat-http-test.jpg', size: bytes.length, lastModified: Date.parse('2017-04-05T12:00:00Z'), digest: crypto.createHash('sha256').update(bytes).digest('hex') };
  let response = await admin('upload-start', input);
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.chunks, 2);
  response = await admin('upload-chunk', bytes.subarray(0, manifest.chunkBytes), 'PUT', `&id=${id}&index=0`, false);
  assert.equal(response.status, 401);
  response = await admin('upload-chunk', bytes.subarray(0, manifest.chunkBytes), 'PUT', `&id=${id}&index=0`);
  assert.equal(response.status, 200);
  assert.equal((await admin('upload-complete', { id })).status, 409);
  const resumed = await (await admin('upload-start', input)).json();
  assert.deepEqual(resumed.received, [0]);
  assert.equal((await admin('upload-chunk', bytes.subarray(manifest.chunkBytes), 'PUT', `&id=${id}&index=1`)).status, 200);
  const started = Date.now();
  assert.equal((await admin('upload-complete', { id })).status, 202);
  let status;
  do {
    status = await (await admin('upload-status', undefined, 'GET', `&id=${id}`)).json();
    if (status.job?.status === 'error') throw new Error(status.job.error);
    if (status.job?.status === 'published') break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() - started < 30000);
  assert.equal(status.job.status, 'published');
  const listResponse = await fetch(`${base}/api/image/list?page=1&pageSize=100`);
  assert.equal(listResponse.status, 200, await listResponse.clone().text());
  assert.match(listResponse.headers.get('cache-control'), /s-maxage=30/);
  const photo = (await listResponse.json()).data.find((item) => item.fileName === manifest.fileName);
  assert.ok(photo); assert.equal(photo.createdDate, '2017-04-05T12:00:00.000Z');
  assert.equal(photo.exifData, undefined);
  const delivered = await fetch(`${base}/.netlify/functions/get-image?name=${photo.fileName}&v=${photo.version}`);
  assert.equal(delivered.status, 200); assert.match(delivered.headers.get('cache-control'), /immutable/);
  const metadata = await sharp(Buffer.from(await delivered.arrayBuffer())).metadata();
  assert.equal(metadata.width, 90); assert.equal(metadata.height, 60); assert.equal(metadata.exif, undefined);
  assert.equal((await admin('date', { fileName: photo.fileName, date: '2016-02-29' })).status, 200);
  const corrected = (await (await fetch(`${base}/api/image/list?pageSize=100`)).json()).data.find((item) => item.fileName === photo.fileName);
  assert.equal(corrected.createdDate, '2016-02-29T00:00:00.000Z');
  assert.equal((await admin('upload-complete', { id })).status, 202);
  const detail = await (await fetch(`${base}/api/image/details?image=${photo.fileName}`)).json();
  assert.equal(detail.data.createdDate, '2016-02-29T00:00:00.000Z'); assert.equal(detail.data.exifData, undefined);
  assert.equal((await admin('date', { fileName: photo.fileName, date: null })).status, 200);
  const automatic = await (await fetch(`${base}/api/image/details?image=${photo.fileName}`)).json();
  assert.equal(automatic.data.createdDate, '2017-04-05T12:00:00.000Z');
  const audit = await (await admin('audit')).json();
  assert.ok(audit.complete.includes(photo.fileName));
  assert.equal((await admin('logout', {})).status, 200);
  console.log(`HTTP integration passed: upload, resume, processing, gallery delivery, correction, reset and audit (${Date.now() - started}ms).`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
