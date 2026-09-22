const { reply } = require('../lib/http');
exports.handler = async () => reply(410, { error: 'Use the authenticated photo manager at /admin to upload photos.' });