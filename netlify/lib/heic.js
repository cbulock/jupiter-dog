// Sharp's prebuilt libvips can read HEIC metadata, but does not ship an HEVC
// decoder. Keep decoding on the server so phones upload their untouched files.
async function decodeHeic(bytes) {
  const libheif = require('libheif-js/wasm-bundle');
  const decoder = new libheif.HeifDecoder();
  let images = [];
  try {
    images = decoder.decode(bytes);
    const image = images.find((item) => item.is_primary()) || images[0];
    if (!image) throw new Error('Unable to decode this HEIC/HEIF photo');
    const width = image.get_width();
    const height = image.get_height();
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 100000000) {
      throw new Error('Photo exceeds the 100 megapixel limit');
    }
    const data = new Uint8ClampedArray(width * height * 4);
    await new Promise((resolve, reject) => {
      image.display({ data, width, height }, (result) => {
        if (result) resolve();
        else reject(new Error('Unable to decode this HEIC/HEIF photo'));
      });
    });
    // libheif applies the container's crop, rotation and mirror transforms.
    // Do not apply EXIF orientation again when Sharp consumes these pixels.
    return { data: Buffer.from(data.buffer), raw: { width, height, channels: 4 } };
  } finally {
    for (const image of images) image.free();
    if (decoder.decoder) libheif.heif_context_free(decoder.decoder);
  }
}

module.exports = { decodeHeic };
