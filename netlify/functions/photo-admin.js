const { stores, readJsonEntries, json, put } = require('../lib/storage');
const { reply, parse, body, fail, errorReply } = require('../lib/http');
const auth = require('../lib/auth');
const { catalog, calendarDate } = require('../lib/photos');
const uploads = require('../lib/uploads');
const { audit } = require('../lib/dropbox');
const { queueSync } = require('../lib/sync-queue');

exports.handler = async (event) => {
  try {
    const action = event.queryStringParameters?.action || 'session';
    const method = event.httpMethod;
    const local = process.env.NETLIFY_DEV === 'true';
    if (action === 'session' && method === 'GET') return reply(200, { configured: auth.configured(), authenticated: auth.authenticated(event) });
    if (action === 'login' && method === 'POST') {
      if (!auth.configured()) fail('Photo administration is not configured', 503);
      const token = await auth.login(event, parse(event).password, stores());
      return reply(200, { authenticated: true }, { 'Set-Cookie': auth.cookie(token, local) });
    }
    auth.requireAdmin(event);
    if (action === 'logout' && method === 'POST') return reply(200, { authenticated: false }, { 'Set-Cookie': auth.cookie('', local) });
    const s = stores();
    if (action === 'photos' && method === 'GET') {
      const [photos, activity] = await Promise.all([catalog(s, true), readJsonEntries(s.jobs)]);
      const jobs = activity.map(({ value }) => value).filter(Boolean);
      return reply(200, { photos, jobs: jobs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 100) });
    }
    if (action === 'date' && method === 'POST') {
      const data = parse(event);
      if (typeof data.fileName !== 'string' || !await json(s.metadata, `${data.fileName}.json`)) fail('Photo not found', 404);
      if (data.date === null) await s.overrides.delete(`${data.fileName}.json`);
      else {
        const createdDate = calendarDate(data.date);
        if (!createdDate) fail('Enter a valid calendar date');
        await put(s.overrides, `${data.fileName}.json`, { createdDate, updatedAt: new Date().toISOString() });
      }
      return reply(200, { saved: true });
    }
    if (action === 'upload-start' && method === 'POST') return reply(200, await uploads.startUpload(s, parse(event)));
    if (action === 'upload-status' && method === 'GET') return reply(200, await uploads.uploadStatus(s, event.queryStringParameters.id));
    if (action === 'upload-chunk' && method === 'PUT') {
      await uploads.saveChunk(s, event.queryStringParameters.id, Number(event.queryStringParameters.index), body(event));
      return reply(200, { received: true });
    }
    if (action === 'upload-complete' && method === 'POST') return reply(202, await uploads.completeUpload(s, parse(event).id, auth.dispatch));
    if (action === 'audit' && method === 'GET') return reply(200, await audit(s));
    if (action === 'sync' && method === 'POST') {
      const repair = parse(event).repair === true;
      return reply(202, await queueSync(s, auth.dispatch, repair));
    }
    fail('Unknown operation or method', 405);
  } catch (error) { return errorReply(error); }
};
