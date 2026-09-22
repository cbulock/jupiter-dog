import assert from "node:assert/strict";
import { test } from "node:test";

let instance = 0;
const freshState = () => import(`../src/state.js?test=${instance++}`);
const photo = (name) => ({ fileName: name, width: 3000, height: 4000 });
const response = (data, hasNextPage) => ({ ok: true, json: async () => ({ data, hasNextPage }) });

test("gallery and viewer share an in-flight request and retain ordered unique photos", async (t) => {
  const state = await freshState();
  const requests = [];
  let resolve;
  t.mock.method(globalThis, "fetch", (url) => {
    requests.push(url);
    return new Promise((done) => { resolve = done; });
  });
  const gallery = state.loadMoreImages();
  const viewer = state.loadMoreImages();
  assert.equal(gallery, viewer);
  assert.equal(requests.length, 1);
  assert.equal(state.galleryLoading.value, true);
  resolve(response([photo("a"), photo("b"), photo("b")], true));
  assert.equal(await gallery, true);
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a", "b"]);
  const next = state.loadMoreImages();
  assert.match(requests[1], /page=2&pageSize=9/);
  resolve(response([photo("b"), photo("c")], false));
  await next;
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a", "b", "c"]);
  assert.equal(state.galleryLoading.value, false);
  assert.equal(state.galleryHasMore.value, false);
  await state.loadMoreImages();
  assert.equal(requests.length, 2);
});

test("a failed page keeps existing photos and retries the same page", async (t) => {
  const state = await freshState();
  const urls = [];
  let attempt = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    attempt += 1;
    if (attempt === 1) return response([photo("a")], true);
    if (attempt === 2) return { ok: false, status: 503 };
    return response([photo("b")], false);
  });
  await state.loadMoreImages();
  assert.equal(await state.loadMoreImages(), false);
  assert.equal(state.galleryLoading.value, false);
  assert.ok(state.galleryError.value);
  assert.equal(state.galleryHasMore.value, true);
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a"]);
  assert.equal(await state.loadMoreImages(), true);
  assert.equal(urls[1], urls[2]);
  assert.equal(state.galleryError.value, "");
  assert.equal(state.imageList.value.length, 2);
});

test("network and malformed responses are retryable; an empty catalog completes", async (t) => {
  const state = await freshState();
  let attempt = 0;
  t.mock.method(globalThis, "fetch", async () => {
    attempt += 1;
    if (attempt === 1) throw new TypeError("Offline");
    if (attempt === 2) return { ok: true, json: async () => ({ data: null }) };
    return response([], false);
  });
  assert.equal(await state.loadMoreImages(), false);
  assert.equal(await state.loadMoreImages(), false);
  assert.equal(await state.loadMoreImages(), true);
  assert.equal(state.imageList.value.length, 0);
  assert.equal(state.galleryHasMore.value, false);
  assert.equal(state.galleryError.value, "");
});

test("catalog dates retain their calendar day and missing dates stay absent", async () => {
  const { photoDate } = await freshState();
  assert.equal(photoDate("2018-09-01T00:10:00.000Z"), "September 1, 2018");
  assert.equal(photoDate(undefined), "");
  assert.equal(photoDate(null), "");
  assert.equal(photoDate("invalid"), "");
});
