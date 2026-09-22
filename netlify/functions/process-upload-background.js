const { stores } = require('../lib/storage');
const { internal } = require('../lib/auth');
const { parse, reply } = require('../lib/http');
const { processUpload, validId } = require('../lib/uploads');
const { withLock } = require('../lib/locks');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' || !internal(event)) return reply(403, { error: 'Forbidden' });
  const { id } = parse(event);
  if (!validId(id)) return reply(400, { error: 'Invalid upload ID' });
  const s = stores();
  return withLock(s, `upload-${id}`, async () => { await processUpload(s, id); return reply(200, { complete: true }); });
};
