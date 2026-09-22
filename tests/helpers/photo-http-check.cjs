// Run only against tests/helpers/photo-preview.cjs, which creates isolated test storage.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const base = 'http://localhost:8890';

async function main() {
  const paginated = [];
  for (let page = 1; page <= 3; page += 1) {
    const result = await fetch(`${base}/api/image/list?page=${page}&pageSize=9`);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('netlify-vary'), 'query=page|pageSize');
    const body = await result.json();
    assert.equal(body.currentPage, page);
    assert.equal(body.hasNextPage, page < 3);
    assert.equal(body.data.length, page < 3 ? 9 : 5);
    paginated.push(...body.data.map((photo) => photo.fileName));
  }
  assert.equal(new Set(paginated).size, 23);
  const smallerPage = await (await fetch(`${base}/api/image/list?page=2&pageSize=1`)).json();
  assert.equal(smallerPage.currentPageSize, 1);
  assert.equal(smallerPage.data[0].fileName, paginated[1]);
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
  const heic = require('node:fs').readFileSync(require('node:path').join(__dirname, '../fixtures/iphone.heic'));
  const heicId = crypto.randomUUID();
  const heicStart = await admin('upload-start', { id: heicId, name: 'phone.HEIC', size: heic.length,
    digest: crypto.createHash('sha256').update(heic).digest('hex'), lastModified: Date.now() });
  assert.equal(heicStart.status, 200);
  const heicManifest = await heicStart.json();
  assert.equal((await admin('upload-chunk', heic, 'PUT', `&id=${heicId}&index=0`)).status, 200);
  assert.equal((await admin('upload-complete', { id: heicId })).status, 202);
  const heicStarted = Date.now();
  let heicStatus;
  do {
    heicStatus = await (await admin('upload-status', undefined, 'GET', `&id=${heicId}`)).json();
    if (heicStatus.job?.status === 'error') throw new Error(heicStatus.job.error);
    if (heicStatus.job?.status === 'published') break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() - heicStarted < 30000);
  assert.equal(heicStatus.job.status, 'published');
  const heicDetail = await (await fetch(`${base}/api/image/details?image=${heicManifest.fileName}`)).json();
  assert.equal(heicDetail.data.createdDate, '2019-08-21T10:57:23.000Z');
  const heicDelivery = await fetch(`${base}/.netlify/functions/get-image?name=${heicManifest.fileName}&v=${heicDetail.data.version}`);
  assert.equal(heicDelivery.status, 200); assert.equal(heicDelivery.headers.get('content-type'), 'image/jpeg');
  const heicInfo = await sharp(Buffer.from(await heicDelivery.arrayBuffer())).metadata();
  assert.equal(heicInfo.format, 'jpeg'); assert.equal(heicInfo.width, 2560); assert.equal(heicInfo.height, 1920);
  assert.equal(heicInfo.exif, undefined);
  assert.equal((await admin('logout', {})).status, 200);
  console.log(`HTTP integration passed: upload, resume, processing, gallery delivery, correction, reset, audit and iPhone HEIC (${Date.now() - started}ms).`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
