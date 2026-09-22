# Life of Jupiter

A personal photo gallery for Jupiter, built with Next.js and hosted on Netlify.

## Development

Use Node.js 22 and install the locked dependencies with `npm ci`.

- `npm run dev` starts Next.js. The local portraits and photo catalog work without credentials; gallery image requests require the Netlify function runtime.
- `npm run dev:netlify` starts the app and functions together using the Netlify CLI. Configure `NETLIFY_SITE_ID` and `NETLIFY_ACCESS_TOKEN` locally to access the existing photo stores. Keep credentials out of Git.

The gallery reads `src/imageList.json` through `/api/image/list`. Photos are served by `/.netlify/functions/get-image`. Photo dates come from the catalog, and the existing upload and sync functions remain responsible for the photo collection.

## Checks

- `npm run lint`
- `npm test` tests shared pagination, concurrent requests, deduplication, failure recovery, empty catalogs, and date formatting.
- `npx next build` validates the site using the checked-in catalog, without contacting the photo stores or rewriting the catalog. The first build needs network access for Google Fonts.

`npm run build` is the deployment build: it first refreshes the catalog from Netlify Blobs, then builds Next.js.

For browser verification, check `/` and `/facts` at 320, 390, 540, 768, and 1440 pixels wide. Verify image failures and retry, gallery route return, viewer focus restoration, Tab containment, arrow keys, Escape, touch swipes, collection boundaries, and explicit bark activation. Real gallery image delivery requires the Netlify runtime; mocked image responses do not validate that integration.
