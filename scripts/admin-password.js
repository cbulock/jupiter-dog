const crypto = require('node:crypto');
const readline = require('node:readline');

// Never take passwords in command-line arguments or write them to disk.
const terminal = process.stdin.isTTY;
const input = readline.createInterface({ input: process.stdin, output: process.stdout, terminal });
if (terminal) {
  process.stdout.write('New admin password (at least 12 characters; input hidden): ');
  input._writeToOutput = () => {};
}
input.once('line', (password) => {
  input.close();
  if (password.length < 12) { console.error('\nUse at least 12 characters.'); process.exitCode = 1; return; }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  console.log(`\nADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
  console.log(`ADMIN_SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`);
  console.log(`PHOTO_WORKER_SECRET=${crypto.randomBytes(32).toString('hex')}`);
});
