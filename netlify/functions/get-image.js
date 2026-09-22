const { stores, json } = require('../lib/storage');
const { publicPhoto } = require('../lib/photos');
const { reply, errorReply } = require('../lib/http');
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed' });
    const name = event.queryStringParameters?.name;
    if (!name || name.length > 512) return reply(400, { error: 'Photo name is required' });
    const s = stores();
    const record = await json(s.metadata, name + '.json');
    if (!publicPhoto(record)) return reply(404, { error: 'Photo not found' });
    const requestedVersion = event.queryStringParameters?.v;
    // Caller input never selects an original or staging object.
    const result = await s.images.getWithMetadata(record.imageKey || name, { type: 'arrayBuffer' });
    if (!result?.data) return reply(404, { error: 'Photo not found' });
    const buffer = Buffer.from(result.data);
    return { statusCode: 200, headers: {
      'Content-Type': result.metadata?.contentType || 'image/jpeg', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': requestedVersion && requestedVersion === record.version ? 'public, max-age=31536000, immutable' : 'public, max-age=30',
    }, body: buffer.toString('base64'), isBase64Encoded: true };
  } catch (error) { return errorReply(error); }
};