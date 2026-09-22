# HEIC regression fixtures

- `rainbow.heic`: `tests/data/rainbow-451x461.heic` from https://github.com/strukturag/libheif (451 x 461; no EXIF capture date). Upstream license is included in `libheif-COPYING.txt`.
- `iphone.heic`: `test/fixtures/heic-iphone.heic` from https://github.com/MikeKovarik/exifr. Real landscape iPhone HEIC with EXIF dates. The rotation test changes its existing `irot` property in memory to exercise portrait output. Upstream license is included in `exifr-LICENSE.txt`.

These files are used only by local tests and are not served by the site.
