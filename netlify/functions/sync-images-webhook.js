const { validWebhook } = require('../lib/dropbox');
const { dispatch } = require('../lib/auth');
const { reply, errorReply } = require('../lib/http');
const { stores } = require('../lib/storage');
const { queueSync } = require('../lib/sync-queue');

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const challenge = event.queryStringParameters?.challenge;
    if (typeof challenge !== 'string' || !/^[a-zA-Z0-9_-]{1,512}$/.test(challenge)) return reply(400, { error: 'Missing or invalid challenge' });
    return { statusCode: 200, headers: { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }, body: challenge };
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!validWebhook(event)) return reply(403, { error: 'Invalid Dropbox signature' });
  try { await queueSync(stores(), dispatch); return reply(200, { accepted: true }); }
  catch (error) { return errorReply(error); }
};
