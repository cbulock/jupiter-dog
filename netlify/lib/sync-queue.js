const crypto = require('node:crypto');
const { entries, json, put } = require('./storage');

async function queueSync(s, dispatch, repair = false) {
  const id = crypto.randomUUID();
  const job = { id, kind: 'sync', repair, status: 'queued', updatedAt: new Date().toISOString() };
  await put(s.jobs, `sync-${id}.json`, job);
  try { await dispatch('sync-images-background', { runId: id, repair }); }
  catch (error) {
    await put(s.jobs, `sync-${id}.json`, { ...job, status: 'error', errors: [{ name: 'Dropbox sync', error: 'Could not start sync. Retry from the photo manager.' }] });
    throw error;
  }
  return job;
}
async function pendingSyncs(s) {
  const jobs = [];
  for (const entry of await entries(s.jobs, 'sync-')) {
    const job = await json(s.jobs, entry.key);
    if (job?.status === 'queued') jobs.push(job);
  }
  return jobs.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
async function resumePending(s, dispatch) {
  const [next] = await pendingSyncs(s);
  if (next) await dispatch('sync-images-background', { runId: next.id, repair: next.repair });
}
module.exports = { queueSync, pendingSyncs, resumePending };
