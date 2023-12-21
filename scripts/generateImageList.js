import { promises as fs, statSync } from "fs";
import path from "path";
import exifParser from "exif-parser";
import dayjs from "dayjs";

async function getEXIFData(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    return result.tags;
  } catch (error) {
    console.error("Error reading EXIF data:", error);
    return null;
  }
}

function getFileCreationDate(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.birthtime;
  } catch (error) {
    console.error("Error reading file creation date:", error);
    return null;
  }
}

const imagesDirectory = path.join(process.cwd(), "public", "images");

async function generateImageList() {
  try {
    const files = await fs.readdir(imagesDirectory);
    const imageFiles = [];

    for (const file of files) {
      if (/\.(jpg|jpeg|png)$/.test(file)) {
        const filePath = path.join(imagesDirectory, file);
        const exifData = await getEXIFData(filePath);
        let createdDate = exifData?.DateTimeOriginal;

        if (createdDate) {
          createdDate = dayjs.unix(createdDate).toISOString();
        } else {
          const fileCreationDate = getFileCreationDate(filePath);
          createdDate = fileCreationDate
            ? dayjs(fileCreationDate).toISOString()
            : null;
        }

        imageFiles.push({ fileName: file, exifData, createdDate });
      }
    }

    // Sort images by creation date, newest first
    imageFiles.sort(
      (a, b) => dayjs(b.createdDate).unix() - dayjs(a.createdDate).unix()
    );

    await fs.writeFile(
      path.join(process.cwd(), "src", "imageList.json"),
      JSON.stringify(imageFiles, null, 2)
    );
    console.log(
      "Image list with EXIF data, creation dates, and sorted by date generated successfully."
    );
  } catch (error) {
    console.error("Error generating image list:", error);
  }
}

generateImageList();
