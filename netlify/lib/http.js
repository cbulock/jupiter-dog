function header(event, name) {
  return Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || '';
}
function body(event) { return Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8'); }
function parse(event) {
  try { return JSON.parse(body(event).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 }); }
}
function reply(statusCode, value, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(value) };
}
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function errorReply(error) {
  if (!error.statusCode) console.error(error);
  return reply(error.statusCode || 500, { error: error.statusCode ? error.message : 'The request could not be completed. Please retry.' });
}
module.exports = { header, body, parse, reply, fail, errorReply };
