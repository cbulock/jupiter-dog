const crypto = require('node:crypto');
const { json, put, entries } = require('./storage');
const { MAX_BYTES, CHUNK_BYTES, iso, processPhoto } = require('./photos');
const { fail } = require('./http');
const DAY = 86400000;
const validId = (id) => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
const jobKey = (id) => `upload-${id}.json`;
async function upload(s, id, now = Date.now()) {
  if (!validId(id)) fail('Invalid upload ID');
  const item = await json(s.uploads, `${id}/manifest.json`);
  if (!item) fail('Upload not found. Select the file again.', 404);
  if (item.expiresAt < now) fail('Upload expired. Select the file again.', 410);
  return item;
}
async function startUpload(s, data, now = Date.now()) {
  if (!validId(data.id)) fail('Invalid upload ID');
  if (!Number.isInteger(data.size) || data.size < 1 || data.size > MAX_BYTES) fail('Photos must be no larger than 50 MiB');
  if (typeof data.name !== 'string' || data.name.length > 255 || !/\.(jpe?g|png|gif|webp)$/i.test(data.name)) fail('Use JPEG, PNG, GIF, or WebP photos');
  if (!/^[a-f0-9]{64}$/.test(data.digest || '')) fail('Photo checksum is required');
  const existing = await json(s.uploads, `${data.id}/manifest.json`);
  if (existing) {
    if (existing.size !== data.size || existing.name !== data.name || existing.digest !== data.digest || existing.lastModified !== iso(data.lastModified)) fail('Upload ID belongs to a different file', 409);
    if (existing.expiresAt < now) fail('Upload expired. Select the file again.', 410);
    return uploadStatus(s, data.id, now);
  }
  const manifest = { id: data.id, name: data.name, size: data.size, digest: data.digest, lastModified: iso(data.lastModified),
    chunks: Math.ceil(data.size / CHUNK_BYTES), fileName: `admin-${data.id}.jpg`,
    importedAt: new Date(now).toISOString(), expiresAt: now + DAY };
  await put(s.uploads, `${data.id}/manifest.json`, manifest);
  await put(s.jobs, jobKey(data.id), { id: data.id, kind: 'upload', name: data.name, status: 'uploading', updatedAt: new Date(now).toISOString() });
  return uploadStatus(s, data.id, now);
}
async function uploadStatus(s, id, now = Date.now()) {
  const manifest = await upload(s, id, now);
  const job = await json(s.jobs, jobKey(id));
  const chunks = (await entries(s.uploads, `${id}/chunks/`)).map((x) => Number(x.key.split('/').pop()));
  return { ...manifest, received: chunks, chunkBytes: CHUNK_BYTES, job };
}
async function saveChunk(s, id, index, bytes) {
  const manifest = await upload(s, id);
  if (!Number.isInteger(index) || index < 0 || index >= manifest.chunks) fail('Invalid chunk number');
  const job = await json(s.jobs, jobKey(id));
  if (['queued', 'processing', 'published'].includes(job?.status)) fail('Upload is already processing or complete', 409);
  const expected = index === manifest.chunks - 1 ? manifest.size - index * CHUNK_BYTES : CHUNK_BYTES;
  if (bytes.length !== expected) fail('Chunk has an incorrect size');
  await s.uploads.set(`${id}/chunks/${index}`, bytes);
}
async function completeUpload(s, id, dispatch) {
  const manifest = await upload(s, id);
  const job = await json(s.jobs, jobKey(id));
  if (job?.status === 'published') return job;
  for (let index = 0; index < manifest.chunks; index++) {
    if (!await s.uploads.getMetadata(`${id}/chunks/${index}`)) fail('Upload is incomplete', 409);
  }
  const queued = { id, kind: 'upload', name: manifest.name, status: 'queued', updatedAt: new Date().toISOString() };
  await put(s.jobs, jobKey(id), queued);
  try { await dispatch('process-upload-background', { id }); }
  catch (error) {
    await put(s.jobs, jobKey(id), { ...queued, status: 'error', error: 'Could not start processing. Retry this upload.' });
    throw error;
  }
  return queued;
}
async function processUpload(s, id) {
  const manifest = await upload(s, id);
  const existing = await json(s.metadata, `${manifest.fileName}.json`);
  const base = { id, kind: 'upload', name: manifest.name, updatedAt: new Date().toISOString() };
  try {
    if (!existing) {
      await put(s.jobs, jobKey(id), { ...base, status: 'processing' });
      const parts = [];
      for (let i = 0; i < manifest.chunks; i++) {
        const part = await s.uploads.get(`${id}/chunks/${i}`, { type: 'arrayBuffer' });
        if (!part) throw new Error('A chunk is missing. Select the original file and retry.');
        parts.push(Buffer.from(part));
      }
      const bytes = Buffer.concat(parts);
      if (bytes.length !== manifest.size) throw new Error('Upload size does not match');
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== manifest.digest) throw new Error('Photo checksum does not match. Start a new upload.');
      await processPhoto(s, { fileName: manifest.fileName, displayName: manifest.name, bytes,
        importedAt: manifest.importedAt, source: { kind: 'admin', lastModified: manifest.lastModified } });
    }
    await put(s.jobs, jobKey(id), { ...base, status: 'published', fileName: manifest.fileName });
    for (const part of await entries(s.uploads, `${id}/chunks/`)) await s.uploads.delete(part.key);
  } catch (error) {
    await put(s.jobs, jobKey(id), { ...base, status: 'error', error: error.message });
    throw error;
  }
}
async function cleanup(s, now = Date.now()) {
  for (const entry of await entries(s.uploads)) {
    if (!entry.key.endsWith('/manifest.json')) continue;
    const manifest = await json(s.uploads, entry.key);
    if (manifest?.expiresAt < now) {
      for (const part of await entries(s.uploads, `${manifest.id}/`)) await s.uploads.delete(part.key);
      const job = await json(s.jobs, jobKey(manifest.id));
      if (job && !['published', 'error', 'expired'].includes(job.status)) {
        await put(s.jobs, jobKey(manifest.id), { ...job, status: 'expired', error: 'Upload expired. Select the file again.' });
      }
    }
  }
  for (const entry of await entries(s.security, 'attempts/')) {
    const timestamp = Number(entry.key.split('/').pop().split('-')[0]);
    if (timestamp < now - DAY) await s.security.delete(entry.key);
  }
  for (const entry of await entries(s.jobs)) {
    const job = await json(s.jobs, entry.key);
    if (['published', 'complete', 'expired'].includes(job?.status) && new Date(job.updatedAt).getTime() < now - 30 * DAY) await s.jobs.delete(entry.key);
  }
}
module.exports = { startUpload, uploadStatus, saveChunk, completeUpload, processUpload, cleanup, validId };
