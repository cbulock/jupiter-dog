// Isolated local integration harness: real handlers, real Next build, and Netlify's local Blobs server.
// No production credentials or stores are used. Run after npm run build; Ctrl+C shuts it down.
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { BlobsServer } = require('@netlify/blobs/server');
const { setEnvironmentContext } = require('@netlify/blobs');

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jupiter-photo-test-'));
  const blobs = new BlobsServer({ directory, token: 'local-test-token' });
  const address = await blobs.start();
  setEnvironmentContext({ edgeURL: `http://localhost:${address.port}`, uncachedEdgeURL: `http://localhost:${address.port}`,
    siteID: 'local-photo-test', token: 'local-test-token' });
  Object.assign(process.env, { NETLIFY_SITE_ID: 'local-photo-test', NETLIFY_ACCESS_TOKEN: 'local-test-token',
    PHOTO_STORE_PREFIX: 'jupiter-test', ADMIN_ORIGIN: 'http://localhost:8890', PHOTO_FUNCTIONS_ORIGIN: 'http://localhost:8890',
    NETLIFY_DEV: 'true', ADMIN_SESSION_SECRET: 'local-session-secret-'.repeat(3), PHOTO_WORKER_SECRET: 'local-worker-secret-'.repeat(3) });
  const salt = 'a'.repeat(32);
  process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt}:${crypto.scryptSync('local-photo-test-only', salt, 64).toString('hex')}`;
  const storage = require('../../netlify/lib/storage');
  const photos = require('../../netlify/lib/photos');
  const s = storage.stores();
  const photoBytes = await fs.readFile(path.join(__dirname, '../../public/jupiter.png'));
  await photos.processPhoto(s, { fileName: 'preview-jupiter.jpg', displayName: 'Jupiter on an adventure.jpg', bytes: photoBytes,
    importedAt: '2026-09-22T12:00:00Z', source: { kind: 'admin', lastModified: '2020-07-04T12:00:00Z' } });
  await photos.processPhoto(s, { fileName: 'preview-jupiter-2.jpg', displayName: 'A very good dog.jpg', bytes: photoBytes,
    importedAt: '2026-09-22T12:00:00Z', source: { kind: 'dropbox', clientModified: '2021-08-06T12:00:00Z' } });
  const handlers = Object.fromEntries(['photo-admin', 'get-image', 'upload-image', 'process-upload-background', 'sync-images-webhook'].map((name) => [name, require(`../../netlify/functions/${name}`).handler]));
  const web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '8892'], { stdio: 'inherit', env: process.env, windowsHide: true });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:8890');
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const name = url.pathname.split('/').pop();
      if (!handlers[name]) { res.writeHead(404); res.end('Not available in local preview'); return; }
      const parts = []; for await (const part of req) parts.push(part);
      const event = { httpMethod: req.method, headers: req.headers, queryStringParameters: Object.fromEntries(url.searchParams),
        body: Buffer.concat(parts).toString('base64'), isBase64Encoded: true };
      try {
        if (name.endsWith('-background')) {
          res.writeHead(202); res.end(); handlers[name](event).catch(console.error); return;
        }
        const result = await handlers[name](event);
        res.writeHead(result.statusCode, result.headers);
        res.end(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body);
      } catch (error) { res.writeHead(500); res.end(error.message); }
      return;
    }
    const proxy = http.request({ hostname: 'localhost', port: 8892, path: req.url, method: req.method, headers: req.headers }, (response) => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(503); res.end('Next.js is starting'); });
    req.pipe(proxy);
  });
  server.listen(8890, 'localhost', () => console.log('Isolated photo preview: http://localhost:8890/admin (password: local-photo-test-only)'));
  async function stop() { web.kill(); server.close(); await blobs.stop(); process.exit(); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch((error) => { console.error(error); process.exit(1); });
