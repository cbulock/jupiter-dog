# Life of Jupiter

A personal photo gallery built with Next.js and hosted on Netlify.

## Development

Use Node.js 22 (x64 on Windows; the existing Sharp package does not load in the Windows ARM64 runtime) and install with `npm ci`.

- `npm run dev`: Next.js only. Set `PHOTO_CATALOG_MODE=fixture` to explicitly use the checked-in gallery catalog offline. Image delivery and administration still require function endpoints.
- `npm run dev:netlify`: Next.js and Netlify Functions together. Configure the environment using [.env.example](.env.example). Local admin origin and function dispatch origin should match the Netlify Dev address, usually `http://localhost:8888`.
- `npm run build`: build the application without accessing photo stores or rewriting the catalog.
- `npm run lint`, `npm test`: lint and automated gallery/import/authentication checks.

## How photos reach the gallery

There are two sources: files placed directly inside Dropbox's `/Jupiter Website` folder, and uploads through `/admin`. Admin uploads stay in Netlify and are not copied to Dropbox. Subfolders, videos, and HEIC are not imported.

Both sources use the same processor. It reads EXIF if available, preserves a private original, auto-orients the image, and creates a JPEG gallery version (up to 2560 pixels and 4 MiB) with a matching preview and dimensions. GIF originals retain animation; the gallery shows a still frame. Photos may be up to 50 MiB and 100 megapixels.

The gallery reads completed metadata directly from Netlify Blobs. Adding photos or correcting dates does **not** trigger a deployment. The first page is rendered on the server with a runtime catalog cache that revalidates every 30 seconds; pagination has a separate 30-second edge cache. An already-open gallery retains its loaded collection until refreshed. Gallery cards use responsive Next.js images (Netlify Image CDN in production), with the first photo preloaded and later photos lazy-loaded.

Date precedence is: manual correction, EXIF capture date, EXIF creation date, source file timestamp, first import time. Dropbox uses `client_modified` followed by `server_modified`; browser uploads use `File.lastModified`. File timestamps can describe an export or save rather than when the photo was taken. The admin page marks these estimates and lets you correct them. Clearing a correction restores the automatic date. Corrections are stored separately and survive subsequent syncs.

Legacy photo identifiers, dates, and unversioned URLs are preserved. New/reprocessed images have content-versioned URLs. Public APIs whitelist gallery fields and do not return raw EXIF, originals, or administrative metadata. Dropbox deletions do not remove published photos.

## Enable the photo manager

1. Run `npm run admin:password` in an interactive terminal. Enter a password of at least 12 characters. The script prints a password hash, session secret, and worker secret; save these in Netlify environment variables scoped to Functions/runtime. It does not write credentials to disk.
2. Set `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `PHOTO_WORKER_SECRET`, and `ADMIN_ORIGIN=https://jupiter.dog`. Set the existing `NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN`, and Dropbox credentials from [.env.example](.env.example). Keep them out of Git and client-side variables.
3. Internal dispatch defaults to the deploy's `DEPLOY_PRIME_URL`, then `URL`. Set `PHOTO_FUNCTIONS_ORIGIN` only when an explicit override is needed.
4. Deploy the code and open `/admin`. Missing admin configuration disables sign-in. Sessions expire after eight hours; changing the password hash or session secret invalidates existing sessions. Login allows ten attempts per IP per 15 minutes.
5. Verify Dropbox's webhook points to `https://jupiter.dog/.netlify/functions/sync-images-webhook`. Verification GETs echo the challenge; notification POSTs require Dropbox's HMAC signature. Background functions require the separate worker secret.

The previous `upload-image` endpoint is retired and returns HTTP 410. `UPLOAD_SECRET` and `BACKGROUND_FUNCTION_URL` are no longer used.

The manager supports batch uploads, filename search, an estimated-date filter, date corrections, collection audit, repair, and retry controls. Uploads use 3 MiB chunks and verify the complete file's SHA-256 checksum before processing. Reselect the same file in the same browser within 24 hours to resume; do not clear local browser storage during an upload. Completed chunks are removed immediately. The hourly cleanup task expires abandoned uploads after 24 hours and removes old activity records.

## Audit and recover previously invisible photos

The previous importer saved image bytes before checking EXIF, then omitted metadata when `DateTimeOriginal` was absent. Subsequent syncs skipped those images because bytes already existed.

- Run `npm run photos:audit` for a **read-only** report, or use **Check collection** in admin. The report covers missing metadata/images, estimated dates, and recorded failures. It does not invoke Dropbox, change photos, or trigger builds.
- Review the report and retain an export/backup of the existing Blobs stores before production recovery.
- Run `npm run photos:repair`, or choose **Repair missing photos**. Repair imports Dropbox originals first, then recovers legacy image-only Blobs absent from Dropbox. Recoveries without an original cannot restore discarded source metadata; they use available EXIF or the recovery date and are marked for correction.
- Repair is repeatable and skips complete, unchanged records. Files are processed independently, so a corrupt image does not block the rest. Existing dates are preserved when legacy records are adopted.
- Dropbox sync records IDs and revisions, follows every listing page, and picks up replacements and renames. Overlapping work uses conditional storage leases. A failed run can be retried from admin.

Stores retain the existing `jupiter-images` and `jupiter-images-metadata` names. Additional private stores hold originals, date overrides, upload staging, processing activity, and admin security state. Set `PHOTO_STORE_PREFIX=jupiter-preview` in a test deploy to isolate **all** stores from production. Never point an experimental deploy at production stores.

## Validation and deployment checks

Automated tests use real Sharp conversion with an in-memory implementation of the Blobs interface. They verify EXIF-free formats, orientation, date precedence, corruption, chunk resume/size/checksum handling, idempotency, Dropbox pagination/revisions, missing-record repair, date overrides, authentication, webhook signatures, and concurrent processing leases.

For local HTTP/browser integration, build first, then run `node tests/helpers/photo-preview.cjs`. This starts the production build and real function handlers against Netlify's local Blobs emulator at `http://localhost:8890/admin`; the disposable test password is `local-photo-test-only`. In a second terminal run `node tests/helpers/photo-http-check.cjs` to exercise chunked uploads, public APIs, image delivery, date corrections, and audit. Ctrl+C stops the preview. This harness uses temporary local storage and never production credentials. The hourly cleanup also retries durable sync requests left queued after platform retries are exhausted.

Use an isolated Netlify test deployment to verify the actual platform integration:

1. Configure isolated stores and test secrets; confirm sign-in, sign-out, and rejection of anonymous/cross-origin mutations.
2. Upload EXIF-free JPEG/PNG and a photo larger than one chunk. Interrupt/reselect an upload and confirm it publishes only once.
3. Refresh the gallery after processing and verify the photo appears within 30 seconds without a deployment; check orientation, dimensions, and delivery.
4. Correct a date, refresh the gallery, then reimport and confirm the correction survives. Clear the correction and verify the automatic date returns.
5. Run audit and repair against test image-only records. Confirm signed webhook dispatch, background retries, and hourly cleanup in Netlify logs.
6. Check `/`, `/facts`, and `/admin` at 320, 390, 768, and 1440 pixels. Check keyboard focus, date forms, upload progress/errors, the gallery viewer, and image retry behavior.

The local preview emulates Image CDN resizing for function-backed images with Sharp; production CDN behavior must still be checked on Netlify. Local/mocked integration success does not establish that production credentials, webhook configuration, or Netlify background execution are working.
