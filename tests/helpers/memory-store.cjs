const crypto = require('node:crypto');
class MemoryStore {
  constructor() { this.data = new Map(); }
  async set(key, data, options = {}) {
    const previous = this.data.get(key);
    if ((options.onlyIfNew && previous) || (options.onlyIfMatch && previous?.etag !== options.onlyIfMatch)) return { modified: false };
    const bytes = Buffer.isBuffer(data) ? Buffer.from(data) : Buffer.from(data);
    const etag = crypto.randomUUID();
    this.data.set(key, { bytes, etag, metadata: options.metadata || {} });
    return { modified: true, etag };
  }
  async get(key, { type = 'text' } = {}) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (type === 'json') return JSON.parse(entry.bytes.toString());
    if (type === 'arrayBuffer') return entry.bytes.buffer.slice(entry.bytes.byteOffset, entry.bytes.byteOffset + entry.bytes.byteLength);
    return entry.bytes.toString();
  }
  async getMetadata(key) { const entry = this.data.get(key); return entry ? { etag: entry.etag, metadata: entry.metadata } : null; }
  async getWithMetadata(key, options) {
    const metadata = await this.getMetadata(key);
    return metadata ? { ...metadata, data: await this.get(key, options) } : null;
  }
  async delete(key) { this.data.delete(key); }
  list({ prefix = '', paginate = false } = {}) {
    const blobs = [...this.data.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, etag: value.etag }));
    if (paginate) return (async function* () { for (let i = 0; i < blobs.length; i += 2) yield { blobs: blobs.slice(i, i + 2) }; })();
    return Promise.resolve({ blobs });
  }
}
function memoryStores() { return Object.fromEntries(['images', 'metadata', 'originals', 'overrides', 'uploads', 'jobs', 'security'].map((name) => [name, new MemoryStore()])); }
module.exports = { MemoryStore, memoryStores };
