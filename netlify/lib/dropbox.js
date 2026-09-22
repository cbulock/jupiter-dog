const crypto = require('node:crypto');
const { json, put, entries } = require('./storage');
const { processPhoto, publicPhoto, MAX_BYTES } = require('./photos');
const { equal } = require('./auth');
const { body, header } = require('./http');

function validWebhook(event, secret = process.env.DROPBOX_CLIENT_SECRET) {
  if (!secret) return false;
  return equal(header(event, 'x-dropbox-signature'), crypto.createHmac('sha256', secret).update(body(event)).digest('hex'));
}
async function connect(env = process.env) {
  if (!env.DROPBOX_CLIENT_ID || !env.DROPBOX_CLIENT_SECRET || !env.DROPBOX_REFRESH_TOKEN) throw new Error('Dropbox credentials are not configured');
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST',
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.DROPBOX_REFRESH_TOKEN,
      client_id: env.DROPBOX_CLIENT_ID, client_secret: env.DROPBOX_CLIENT_SECRET }) });
  if (!response.ok) throw new Error(`Dropbox authorization failed (${response.status})`);
  const { access_token } = await response.json();
  return new (require('dropbox').Dropbox)({ accessToken: access_token });
}
async function listPhotos(dropbox) {
  let page = (await dropbox.filesListFolder({ path: '/Jupiter Website' })).result;
  const files = [];
  while (true) {
    files.push(...page.entries.filter((file) => file['.tag'] === 'file' && /\.(jpe?g|png|gif|webp)$/i.test(file.name)));
    if (!page.has_more) break;
    page = (await dropbox.filesListFolderContinue({ cursor: page.cursor })).result;
  }
  return files;
}
async function runSync(s, dropbox, { repair = false, runId = crypto.randomUUID(), timeBudgetMs = 12 * 60 * 1000 } = {}) {
  const started = Date.now();
  const result = { id: runId, kind: 'sync', status: 'processing', added: 0, updated: 0, unchanged: 0, errors: [], updatedAt: new Date().toISOString() };
  const key = `sync-${runId}.json`;
  await put(s.jobs, key, result);
  try {
    const files = await listPhotos(dropbox);
    const records = new Map(); const byId = new Map();
    for (const item of await entries(s.metadata)) {
      const record = await json(s.metadata, item.key);
      if (!record?.fileName) continue;
      records.set(record.fileName, record);
      if (record.source?.id) byId.set(record.source.id, record);
    }
    for (const file of files) {
      if (Date.now() - started > timeBudgetMs) { result.remaining = true; break; }
      const old = byId.get(file.id) || records.get(file.name);
      const fileName = old?.fileName || file.name;
      try {
        const complete = publicPhoto(old) && await s.images.getMetadata(old.imageKey || fileName);
        if (complete && (old.source?.rev === file.rev || !old.source?.id)) {
          if (!old.source?.id) {
            // Adopt legacy records without recalculating dates or changing their URLs.
            await put(s.metadata, `${fileName}.json`, { ...old, source: { kind: 'dropbox', id: file.id, rev: file.rev, path: file.path_display } });
          }
          result.unchanged++;
          continue;
        }
        if (file.size > MAX_BYTES) throw new Error('Photo exceeds the 50 MiB limit');
        const downloaded = (await dropbox.filesDownload({ path: file.id, rev: file.rev })).result;
        const bytes = Buffer.from(downloaded.fileBinary, 'binary');
        await processPhoto(s, { fileName, displayName: file.name, bytes,
          source: { kind: 'dropbox', id: file.id, rev: file.rev, path: file.path_display,
            clientModified: file.client_modified, serverModified: file.server_modified },
          importedAt: old?.importedAt || new Date().toISOString(),
          preserveDate: old && !old.dateSource ? old.createdDate : undefined });
        if (old) result.updated++; else result.added++;
      } catch (error) { result.errors.push({ name: file.name, error: error.message }); }
      await put(s.jobs, key, result);
    }
    if (repair && !result.remaining) {
      const sourceNames = new Set(files.map((file) => file.name));
      for (const image of await entries(s.images)) {
        if (image.key.startsWith('versions/') || sourceNames.has(image.key)) continue;
        if (Date.now() - started > timeBudgetMs) { result.remaining = true; break; }
        const old = await json(s.metadata, `${image.key}.json`);
        if (publicPhoto(old)) continue;
        try {
          const bytes = Buffer.from(await s.images.get(image.key, { type: 'arrayBuffer' }));
          await processPhoto(s, { fileName: image.key, bytes, source: { kind: 'recovered' },
            importedAt: old?.importedAt || new Date().toISOString(), preserveDate: old?.createdDate });
          result.added++;
        } catch (error) { result.errors.push({ name: image.key, error: error.message }); }
      }
    }
    result.status = result.errors.length ? 'partial' : result.remaining ? 'pending' : 'complete';
  } catch (error) { result.status = 'error'; result.errors.push({ name: 'Dropbox sync', error: error.message }); }
  result.updatedAt = new Date().toISOString();
  await put(s.jobs, key, result);
  return result;
}
async function audit(s) {
  const report = { complete: [], missingMetadata: [], missingImages: [], fallbackDates: [], failures: [] };
  for (const entry of await entries(s.images)) {
    if (entry.key.startsWith('versions/')) continue;
    const metadata = await json(s.metadata, `${entry.key}.json`);
    if (!publicPhoto(metadata)) report.missingMetadata.push(entry.key);
  }
  for (const entry of await entries(s.metadata)) {
    const metadata = await json(s.metadata, entry.key);
    if (!metadata?.fileName) continue;
    if (!publicPhoto(metadata)) { report.failures.push({ name: metadata.fileName, error: 'Incomplete gallery metadata' }); continue; }
    if (!await s.images.getMetadata(metadata.imageKey || metadata.fileName)) report.missingImages.push(metadata.fileName);
    else report.complete.push(metadata.fileName);
    const override = await json(s.overrides, `${metadata.fileName}.json`);
    if (!override?.createdDate && metadata.dateSource && !['exif-original', 'exif-created', 'legacy'].includes(metadata.dateSource)) report.fallbackDates.push({ name: metadata.fileName, date: metadata.automaticDate, source: metadata.dateSource });
  }
  for (const entry of await entries(s.jobs)) {
    const job = await json(s.jobs, entry.key);
    if (['error', 'partial'].includes(job?.status)) report.failures.push(job);
  }
  return report;
}
module.exports = { validWebhook, connect, listPhotos, runSync, audit };
