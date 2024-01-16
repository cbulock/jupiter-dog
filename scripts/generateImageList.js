import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import exifParser from 'exif-parser';
import dayjs from 'dayjs';
import probe from 'probe-image-size';
import sharp from "sharp";
import { encode } from "blurhash";

async function getEXIFData(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    return result.tags;
  } catch (error) {
    console.error('Error reading EXIF data:', error);
    return null;
  }
}

async function getImageDimensions(filePath, orientation) {
  try {
    const stream = createReadStream(filePath);
    const dimensions = await probe(stream);
    stream.close();

    // Check if orientation requires width and height to be swapped
    if (orientation >= 5 && orientation <= 8) {
      return { width: dimensions.height, height: dimensions.width };
    }

    return { width: dimensions.width, height: dimensions.height };
  } catch (error) {
    console.error(`Error getting image dimensions for ${filePath}:`, error.message);
    return { width: null, height: null };
  }
}

async function getBlurhash(filePath, dimensions) {
  try {
    const processingReduction = 8;
    const newDimensions = { width: Math.round(dimensions.width / processingReduction), height: Math.round(dimensions.height / processingReduction) }
    const buffer = await sharp(filePath).raw().ensureAlpha().resize(newDimensions.width, newDimensions.height).toBuffer();
    return encode(new Uint8ClampedArray(buffer), newDimensions.width, newDimensions.height, 4, 4);
  } catch (error) {
    console.error(`Error getting blurhash for ${filePath}:`, error.message);
  }
}

const imagesDirectory = path.join(process.cwd(), 'public', 'images');

async function generateImageList() {
  try {
    const files = await fs.readdir(imagesDirectory);
    const imageFiles = [];

    for (const file of files) {
      if (/\.(jpg|jpeg|png)$/.test(file)) {
        const filePath = path.join(imagesDirectory, file);
        const exifData = await getEXIFData(filePath);

        if (exifData?.DateTimeOriginal) {
          const createdDate = dayjs.unix(exifData.DateTimeOriginal).toISOString();
          const orientation = exifData.Orientation || 1; // Default orientation is 1
          const dimensions = await getImageDimensions(filePath, orientation);
          const blurhash = await getBlurhash(filePath, dimensions);

          imageFiles.push({ blurhash, fileName: file, exifData, createdDate, ...dimensions });
        }
      }
    }

    // Sort images by creation date, newest first
    imageFiles.sort((a, b) => dayjs(b.createdDate).unix() - dayjs(a.createdDate).unix());

    await fs.writeFile(path.join(process.cwd(), 'src', 'imageList.json'), JSON.stringify(imageFiles, null, 2));
    console.log('Image list with EXIF data, creation dates, dimensions, and sorted by date generated successfully.');
  } catch (error) {
    console.error('Error generating image list:', error);
  }
}

generateImageList();
