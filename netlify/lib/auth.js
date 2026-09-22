const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { header, fail } = require('./http');
const { entries, put } = require('./storage');
const scrypt = promisify(crypto.scrypt);
const COOKIE = 'jupiter_admin';
const SESSION_SECONDS = 8 * 60 * 60;
function equal(a, b) {
  const x = Buffer.from(a || ''); const y = Buffer.from(b || '');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function configured(env = process.env) {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH || '') && (env.ADMIN_SESSION_SECRET || '').length >= 32;
}
function sign(value, secret) { return crypto.createHmac('sha256', secret).update(value).digest('base64url'); }
function makeSession(env = process.env, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_SECONDS * 1000, nonce: crypto.randomUUID(), password: sign(env.ADMIN_PASSWORD_HASH, env.ADMIN_SESSION_SECRET) })).toString('base64url');
  return `${payload}.${sign(payload, env.ADMIN_SESSION_SECRET)}`;
}
function authenticated(event, env = process.env, now = Date.now()) {
  if (!configured(env)) return false;
  const token = header(event, 'cookie').split(';').map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (extra || !equal(signature, sign(payload, env.ADMIN_SESSION_SECRET))) return false;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url')); return data.exp > now && equal(data.password, sign(env.ADMIN_PASSWORD_HASH, env.ADMIN_SESSION_SECRET)); }
  catch { return false; }
}
function cookie(value = '', local = false) {
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value ? SESSION_SECONDS : 0}${local ? '' : '; Secure'}`;
}
function origin(event, env = process.env) {
  const allowed = env.ADMIN_ORIGIN || env.URL;
  if (!allowed || header(event, 'origin') !== new URL(allowed).origin) fail('Request origin is not allowed', 403);
}
function requireAdmin(event, env = process.env) {
  if (!configured(env)) fail('Photo administration is not configured', 503);
  if (!authenticated(event, env)) fail('Please sign in', 401);
  if (!['GET', 'HEAD'].includes(event.httpMethod)) origin(event, env);
}
async function login(event, password, s, env = process.env, now = Date.now()) {
  if (!configured(env)) fail('Photo administration is not configured', 503);
  origin(event, env);
  if (typeof password !== 'string' || password.length > 1024) fail('Invalid password', 401);
  const ip = header(event, 'x-nf-client-connection-ip') || 'local';
  const key = crypto.createHash('sha256').update(ip).digest('hex');
  const prefix = `attempts/${key}/`;
  const attempts = await entries(s.security, prefix);
  const recent = attempts.filter((x) => Number(x.key.slice(prefix.length).split('-')[0]) > now - 15 * 60 * 1000);
  if (recent.length >= 10) fail('Too many sign-in attempts. Try again in 15 minutes.', 429);
  await put(s.security, `${prefix}${now}-${crypto.randomUUID()}`, { at: now });
  const [, salt, hash] = env.ADMIN_PASSWORD_HASH.split(':');
  const calculated = await scrypt(password, salt, 64);
  if (!equal(calculated.toString('hex'), hash)) fail('Invalid password', 401);
  return makeSession(env, now);
}
function internal(event, env = process.env) {
  const secret = env.PHOTO_WORKER_SECRET;
  return Boolean(secret && secret.length >= 32 && equal(header(event, 'x-photo-worker-secret'), secret));
}
async function dispatch(name, payload, env = process.env) {
  if (!env.PHOTO_WORKER_SECRET || env.PHOTO_WORKER_SECRET.length < 32) fail('Photo processing is not configured', 503);
  const base = env.PHOTO_FUNCTIONS_ORIGIN || env.DEPLOY_PRIME_URL || env.URL;
  if (!base) fail('Photo function address is not configured', 503);
  const response = await fetch(new URL(`/.netlify/functions/${name}`, base), { method: 'POST', headers: {
    'Content-Type': 'application/json', 'x-photo-worker-secret': env.PHOTO_WORKER_SECRET,
  }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Worker dispatch failed: ${response.status}`);
}
module.exports = { configured, makeSession, authenticated, cookie, origin, requireAdmin, login, equal, internal, dispatch };
