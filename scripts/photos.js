require('dotenv').config();
const { stores } = require('../netlify/lib/storage');
const { audit, connect, runSync } = require('../netlify/lib/dropbox');
const { withLock } = require('../netlify/lib/locks');

async function main() {
  const s = stores();
  if (process.argv.includes('--repair')) {
    const dropbox = await connect();
    let result;
    do {
      result = await withLock(s, 'dropbox-sync', () => runSync(s, dropbox, { repair: true }));
      console.log(JSON.stringify(result, null, 2));
    } while (result.remaining);
    if (result.errors.length) process.exitCode = 1;
  } else console.log(JSON.stringify(await audit(s), null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
