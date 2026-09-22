const crypto = require('node:crypto');
async function withLock(s, name, work) {
  const key = `locks/${name}`;
  const value = { owner: crypto.randomUUID(), expiresAt: Date.now() + 16 * 60 * 1000 };
  const previous = await s.security.getWithMetadata(key, { type: 'json', consistency: 'strong' });
  if (previous && previous.data.expiresAt > Date.now()) throw new Error('Photo processing is busy; retry shortly');
  const acquired = await s.security.set(key, JSON.stringify(value), previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true });
  if (!acquired.modified) throw new Error('Photo processing is busy; retry shortly');
  try { return await work(); }
  finally {
    // Release with a conditional write, so a timed-out worker cannot release its successor's lease.
    const current = await s.security.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    if (current?.data.owner === value.owner) await s.security.set(key, JSON.stringify({ ...value, expiresAt: 0 }), { onlyIfMatch: current.etag });
  }
}
module.exports = { withLock };
