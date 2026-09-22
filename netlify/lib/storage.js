const { getStore } = require('@netlify/blobs');

function stores() {
  // Let Netlify (and Netlify Dev) supply its endpoint when runtime context exists.
  // Explicit credentials otherwise support the standalone audit/repair commands.
  const credentials = process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext ? {} : {
    siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN,
  };
  const open = (name) => getStore({ name: `${process.env.PHOTO_STORE_PREFIX || 'jupiter'}-${name}`, consistency: 'strong',
    ...credentials });
  return { images: open('images'), metadata: open('images-metadata'),
    originals: open('originals'), overrides: open('photo-dates'),
    uploads: open('uploads'), jobs: open('photo-jobs'), security: open('admin-security') };
}

async function entries(store, prefix = '') {
  const result = [];
  for await (const page of store.list({ prefix, paginate: true })) result.push(...page.blobs);
  return result;
}
const json = (store, key) => store.get(key, { type: 'json', consistency: 'strong' });
const put = (store, key, value) => store.set(key, JSON.stringify(value));

async function readJsonEntries(store) {
  const keys = await entries(store);
  const result = new Array(keys.length);
  let next = 0;
  // Bound network concurrency while avoiding one round trip at a time per blob.
  await Promise.all(Array.from({ length: Math.min(16, keys.length) }, async () => {
    while (next < keys.length) {
      const index = next++;
      const { key } = keys[index];
      result[index] = { key, value: await json(store, key) };
    }
  }));
  return result;
}
module.exports = { stores, entries, json, put, readJsonEntries };
