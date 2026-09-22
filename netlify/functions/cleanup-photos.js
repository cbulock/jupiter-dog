const { stores, entries, json, put } = require('../lib/storage');
const { cleanup } = require('../lib/uploads');
const { dispatch } = require('../lib/auth');
const { resumePending } = require('../lib/sync-queue');
exports.handler = async () => {
  const s = stores();
  await cleanup(s);
  // Durable requests survive exhausted platform retries; admin can also retry immediately.
  if (process.env.PHOTO_WORKER_SECRET) {
    for (const entry of await entries(s.jobs, 'sync-')) {
      const job = await json(s.jobs, entry.key);
      if (job?.status === 'processing' && Date.parse(job.updatedAt) < Date.now() - 16 * 60 * 1000) {
        await put(s.jobs, entry.key, { ...job, status: 'queued' });
      }
    }
    await resumePending(s, dispatch);
    for (const entry of await entries(s.jobs, 'upload-')) {
      const job = await json(s.jobs, entry.key);
      if (['queued', 'processing'].includes(job?.status) && Date.parse(job.updatedAt) < Date.now() - 16 * 60 * 1000) {
        await dispatch('process-upload-background', { id: job.id });
      }
    }
  }
  return { statusCode: 200 };
};
exports.config = { schedule: '@hourly' };
