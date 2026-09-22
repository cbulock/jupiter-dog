import assert from "node:assert/strict";
import { test } from "node:test";

let instance = 0;
const freshState = () => import(`../src/state.js?test=${instance++}`);
const photo = (name) => ({ fileName: name, width: 3000, height: 4000 });
const response = (data, hasNextPage, currentPage = 1) => ({ ok: true, json: async () => ({ data, hasNextPage, currentPage }) });

test("server-rendered photos seed pagination without fetching page one again", async (t) => {
  const state = await freshState();
  state.initializeGallery({ data: [photo("a")], currentPage: 1, hasNextPage: true });
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    return response([photo("b")], false, 2);
  });
  await state.loadMoreImages();
  assert.match(urls[0], /page=2&pageSize=9/);
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a", "b"]);
  state.initializeGallery({ data: [photo("c")], currentPage: 1, hasNextPage: true });
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a", "b"]);
  assert.equal(state.galleryHasMore.value, false);
});

test("an empty server catalog completes, while a failed server load remains retryable", async (t) => {
  const empty = await freshState();
  empty.initializeGallery({ data: [], currentPage: 1, hasNextPage: false });
  assert.equal(empty.galleryHasMore.value, false);
  const retry = await freshState();
  retry.initializeGallery(null);
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.match(url, /page=1&pageSize=9/);
    return response([photo("a")], false);
  });
  assert.equal(await retry.loadMoreImages(), true);
  assert.equal(retry.imageList.value.length, 1);
});

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
  resolve(response([photo("b"), photo("c")], false, 2));
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
    return response([photo("b")], false, 2);
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

test("a cached page-one response halts automatic loading and retries page two explicitly", async (t) => {
  const state = await freshState();
  state.initializeGallery({ data: [photo("a")], currentPage: 1, hasNextPage: true });
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    return urls.length === 1 ? response([photo("a")], true, 1) : response([photo("b")], false, 2);
  });
  assert.equal(await state.loadMoreImages({ automatic: true }), false);
  assert.ok(state.galleryError.value);
  assert.equal(state.galleryLoading.value, false);
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a"]);
  for (let callback = 0; callback < 5; callback += 1) {
    assert.equal(await state.loadMoreImages({ automatic: true }), false);
  }
  assert.equal(urls.length, 1);
  assert.equal(await state.loadMoreImages(), true);
  assert.equal(urls[0], urls[1]);
  assert.match(urls[1], /page=2&pageSize=9/);
  assert.deepEqual(state.imageList.value.map((item) => item.fileName), ["a", "b"]);
  assert.equal(state.galleryError.value, "");
});

for (const [label, rows] of [["duplicates", [photo("a")]], ["empty page", []]]) {
  test(`a matching page number with ${label} and has-more stops instead of requesting endlessly`, async (t) => {
    const state = await freshState();
    state.initializeGallery({ data: [photo("a")], currentPage: 1, hasNextPage: true });
    let requests = 0;
    t.mock.method(globalThis, "fetch", async () => {
      requests += 1;
      return response(rows, true, 2);
    });
    assert.equal(await state.loadMoreImages({ automatic: true }), false);
    assert.equal(await state.loadMoreImages({ automatic: true }), false);
    assert.equal(requests, 1);
    assert.equal(state.galleryHasMore.value, true);
    assert.ok(state.galleryError.value);
  });
}

test("an empty final page ends pagination without an error or more requests", async (t) => {
  const state = await freshState();
  state.initializeGallery({ data: [photo("a")], currentPage: 1, hasNextPage: true });
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests += 1; return response([], false, 2); });
  assert.equal(await state.loadMoreImages({ automatic: true }), true);
  assert.equal(await state.loadMoreImages({ automatic: true }), true);
  assert.equal(requests, 1);
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
