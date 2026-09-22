const { stores, json, put } = require('../lib/storage');
const { internal, dispatch } = require('../lib/auth');
const { connect, runSync } = require('../lib/dropbox');
const { parse, reply } = require('../lib/http');
const { withLock } = require('../lib/locks');
const { queueSync, resumePending, pendingSyncs } = require('../lib/sync-queue');
const { validId } = require('../lib/uploads');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' || !internal(event)) return reply(403, { error: 'Forbidden' });
  const options = parse(event);
  if (!validId(options.runId)) return reply(400, { error: 'Invalid sync ID' });
  const s = stores();
  const result = await withLock(s, 'dropbox-sync', async () => {
    const job = await json(s.jobs, `sync-${options.runId}.json`);
    if (!job || job.status === 'complete') return job || {};
    const started = Date.now();
    let completed;
    try { completed = await runSync(s, await connect(), options); }
    catch (error) {
      completed = { ...job, status: 'error', errors: [{ name: 'Dropbox sync', error: error.message }], updatedAt: new Date().toISOString() };
      await put(s.jobs, `sync-${options.runId}.json`, completed);
    }
    // One full scan satisfies earlier duplicate notifications. Notifications received during
    // the scan remain queued and trigger another pass after the lease is released.
    if (completed.status === 'complete') for (const pending of await pendingSyncs(s)) {
      if (Date.parse(pending.updatedAt) <= started && (!pending.repair || options.repair)) {
        await put(s.jobs, `sync-${pending.id}.json`, { ...completed, id: pending.id });
      }
    }
    return completed;
  });
  if (result.remaining) await queueSync(s, dispatch, options.repair === true);
  else await resumePending(s, dispatch);
  return reply(200, result);
};
