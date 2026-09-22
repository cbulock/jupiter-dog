const crypto = require('node:crypto');
const { readJsonEntries, put } = require('./storage');

const MAX_BYTES = 50 * 1024 * 1024;
const CHUNK_BYTES = 3 * 1024 * 1024;
const FORMATS = new Set(['jpeg', 'png', 'gif', 'webp']);
function iso(value, seconds = false) {
  if (value === null || value === undefined || value === '') return null;
  if (seconds && (!Number.isFinite(Number(value)) || Number(value) <= 0)) return null;
  const date = new Date(seconds ? Number(value) * 1000 : value);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 1900 && date.getUTCFullYear() <= 2100
    ? date.toISOString() : null;
}
function automaticDate(exif = {}, source = {}, importedAt) {
  const candidates = [
    [iso(exif.DateTimeOriginal, true), 'exif-original'],
    [iso(exif.CreateDate, true), 'exif-created'],
    [iso(source.clientModified), 'dropbox-client'],
    [iso(source.serverModified), 'dropbox-server'],
    [iso(source.lastModified), 'file-modified'],
    [iso(importedAt), 'imported'],
  ];
  const selected = candidates.find(([date]) => date);
  if (!selected) throw new Error('No valid date available');
  return { automaticDate: selected[0], dateSource: selected[1] };
}
function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = iso(`${value}T00:00:00.000Z`);
  return result?.slice(0, 10) === value ? result : null;
}
function publicPhoto(record, override) {
  if (!record || !record.fileName || !(record.width > 0) || !(record.height > 0) ||
      (record.status && record.status !== 'published')) return null;
  const createdDate = iso(override?.createdDate) || iso(record.automaticDate) || iso(record.createdDate);
  if (!createdDate) return null;
  return { fileName: record.fileName, width: record.width, height: record.height,
    blurhash: record.blurhash || null, createdDate,
    ...(record.version ? { version: record.version } : {}) };
}
async function catalog(s, admin = false) {
  const [records, corrections] = await Promise.all([
    readJsonEntries(s.metadata), readJsonEntries(s.overrides),
  ]);
  const overrides = new Map(corrections.map(({ key, value }) => [key, value]));
  const rows = [];
  for (const { value: record } of records) {
    if (!record?.fileName) continue;
    const override = overrides.get(`${record.fileName}.json`);
    const photo = publicPhoto(record, override);
    if (!photo) continue;
    rows.push(admin ? { ...photo, displayName: record.displayName || record.fileName,
      automaticDate: record.automaticDate || record.createdDate,
      dateSource: record.dateSource || 'legacy', manualDate: override?.createdDate || null,
      estimated: !override?.createdDate && !['exif-original', 'exif-created', 'legacy'].includes(record.dateSource || 'legacy'),
      source: record.source?.kind || 'legacy', importedAt: record.importedAt } : photo);
  }
  return rows.sort((a, b) => b.createdDate.localeCompare(a.createdDate) || a.fileName.localeCompare(b.fileName));
}
async function processPhoto(s, { fileName, displayName, bytes, source = {}, importedAt = new Date().toISOString(), preserveDate }) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES) throw new Error('Photo must be between 1 byte and 50 MiB');
  const sharp = require('sharp');
  const input = sharp(bytes, { limitInputPixels: 100000000, animated: false });
  const info = await input.metadata();
  const heic = info.format === 'heif' && info.compression === 'hevc';
  if (!FORMATS.has(info.format) && !heic) throw new Error('Use JPEG, PNG, GIF, WebP, or HEIC/HEIF photos');
  let exif = {};
  try { exif = require('exif-parser').create(bytes).parse().tags || {}; } catch { /* EXIF is optional. */ }
  // Sharp exposes EXIF from HEIC/PNG/WebP as an EXIF segment, too.
  if (!exif.DateTimeOriginal && info.exif) {
    try {
      // PNG eXIf chunks can contain bare TIFF bytes without the JPEG EXIF prefix.
      const prefix = Buffer.from('Exif\0\0');
      const payload = info.exif.subarray(0, 6).equals(prefix) ? info.exif : Buffer.concat([prefix, info.exif]);
      const segment = Buffer.alloc(4); segment[0] = 0xff; segment[1] = 0xe1;
      segment.writeUInt16BE(payload.length + 2, 2);
      const tags = require('exif-parser').create(Buffer.concat([Buffer.from([0xff, 0xd8]), segment, payload, Buffer.from([0xff, 0xd9])])).parse().tags;
      exif = { ...exif, ...tags };
    } catch { /* Fall through to file timestamps. */ }
  }
  const dates = preserveDate && iso(preserveDate)
    ? { automaticDate: iso(preserveDate), dateSource: 'legacy' }
    : automaticDate(exif, source, importedAt);
  const decoded = heic ? await require('./heic').decodeHeic(bytes) : null;
  const deliveryInput = () => decoded
    ? sharp(decoded.data, { raw: decoded.raw })
    : sharp(bytes, { limitInputPixels: 100000000, animated: false }).rotate();
  let dimension = 2560;
  let output;
  do {
    output = await deliveryInput()
      .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    dimension = Math.floor(dimension * 0.75);
  } while (output.data.length > 4 * 1024 * 1024 && dimension >= 256);
  if (output.data.length > 4 * 1024 * 1024) throw new Error('Unable to create a delivery-sized photo');
  const { data: pixels, info: tiny } = await sharp(output.data).resize({ width: 32, height: 32, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blurhash = require('blurhash').encode(new Uint8ClampedArray(pixels), tiny.width, tiny.height, 4, 4);
  const version = crypto.createHash('sha256').update(bytes).digest('hex');
  const imageKey = `versions/${version}.jpg`;
  const originalKey = `${version}/original`;
  await s.originals.set(originalKey, bytes, { metadata: { contentType: heic ? 'image/heic' : `image/${info.format}`, displayName } });
  await s.images.set(imageKey, output.data, { metadata: { contentType: 'image/jpeg' } });
  // Keep all parsed EXIF, including GPS coordinates, altitude and direction,
  // for future location features even though delivery JPEGs omit metadata.
  const record = { fileName, displayName: displayName || fileName, status: 'published', version, imageKey, originalKey,
    width: output.info.width, height: output.info.height, blurhash, ...dates, createdDate: dates.automaticDate,
    importedAt, source, exifData: exif };
  // Publish last. Originals/derivatives are immutable; interrupted work stays invisible and can be retried.
  await put(s.metadata, `${fileName}.json`, record);
  return record;
}
module.exports = { MAX_BYTES, CHUNK_BYTES, iso, automaticDate, calendarDate, publicPhoto, catalog, processPhoto };
