const { Dropbox } = require("dropbox");
const { getStore } = require("@netlify/blobs");
const fetch = require("node-fetch");
const mime = require("mime-types");
const fs = require("fs");
const path = require("path");
const exifParser = require("exif-parser");
const dayjs = require("dayjs");
const probe = require("probe-image-size");
const sharp = require("sharp");
const { encode } = require("blurhash");
const os = require("os");

const maxImageSize = 4 * 1024 * 1024; // 4MB in bytes

async function getEXIFData(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    return result.tags;
  } catch (error) {
    console.error("Error reading EXIF data:", error);
    return null;
  }
}

async function getImageDimensions(filePath, orientation) {
  try {
    const stream = fs.createReadStream(filePath);
    const dimensions = await probe(stream);
    stream.close();

    // Check if orientation requires width and height to be swapped
    if (orientation >= 5 && orientation <= 8) {
      return { width: dimensions.height, height: dimensions.width };
    }

    return { width: dimensions.width, height: dimensions.height };
  } catch (error) {
    console.error(
      `Error getting image dimensions for ${filePath}:`,
      error.message
    );
    return { width: null, height: null };
  }
}

async function getBlurhash(filePath, dimensions) {
  try {
    const processingReduction = 8;
    const newDimensions = {
      width: Math.round(dimensions.width / processingReduction),
      height: Math.round(dimensions.height / processingReduction),
    };
    const buffer = await sharp(filePath)
      .raw()
      .ensureAlpha()
      .resize(newDimensions.width, newDimensions.height)
      .toBuffer();
    return encode(
      new Uint8ClampedArray(buffer),
      newDimensions.width,
      newDimensions.height,
      4,
      4
    );
  } catch (error) {
    console.error(`Error getting blurhash for ${filePath}:`, error.message);
  }
}

exports.handler = async (event, context) => {
  try {
    // Dropbox credentials
    const clientId = process.env.DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;

    // Function to refresh the Dropbox access token
    async function refreshAccessToken() {
      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          `Error refreshing access token: ${data.error_description}`
        );
      }
      return data.access_token;
    }

    // Get a new access token
    const dropboxAccessToken = await refreshAccessToken();
    const dropbox = new Dropbox({ accessToken: dropboxAccessToken });

    // Define the Dropbox folder path
    const folderPath = "/Jupiter Website";

    // List the files in the Dropbox folder
    const response = await dropbox.filesListFolder({ path: folderPath });
    const files = response.result.entries;

    // Filter the files to get only the image files
    const imageFiles = files.filter((file) =>
      file.name.match(/\.(jpg|jpeg|png|gif)$/i)
    );

    // Get the Netlify Blobs store for images and metadata
    const imageStore = getStore({ name: "jupiter-images", siteID, token });
    const metadataStore = getStore({
      name: "jupiter-images-metadata",
      siteID,
      token,
    });

    // Download, process, and save the images and metadata to Netlify Blobs
    for (const file of imageFiles) {
      const imagePath = file.path_display;
      const imageName = file.name;

      // Check if the image file already exists in the Netlify Blobs store
      const existingImage = await imageStore.get(imageName);
      if (!existingImage) {
        // Download the image from Dropbox
        const response = await dropbox.filesDownload({ path: imagePath });
        const imageData = Buffer.from(response.result.fileBinary, "binary");

        // Resize the image if it exceeds the maximum size
        let resizedImageData = imageData;
        if (imageData.length > maxImageSize) {
          const image = sharp(imageData);
          const metadata = await image.metadata();
          const aspectRatio = metadata.width / metadata.height;

          // Calculate the new dimensions while maintaining the aspect ratio
          let newWidth, newHeight;
          if (aspectRatio > 1) {
            newWidth = Math.sqrt(maxImageSize / aspectRatio);
            newHeight = newWidth / aspectRatio;
          } else {
            newHeight = Math.sqrt(maxImageSize * aspectRatio);
            newWidth = newHeight * aspectRatio;
          }

          resizedImageData = await image
            .resize(Math.round(newWidth), Math.round(newHeight))
            .toBuffer();
        }

        // Save the image to Netlify Blobs
        await imageStore.set(imageName, resizedImageData, {
          metadata: {
            contentType: mime.lookup(imageName) || "application/octet-stream",
          },
        });
        console.log(`Added new image: ${imageName}`);

        // Process metadata
        const tempFilePath = path.join(os.tmpdir(), imageName);
        await fs.promises.writeFile(tempFilePath, resizedImageData);

        const exifData = await getEXIFData(tempFilePath);
        if (exifData?.DateTimeOriginal) {
          const createdDate = dayjs
            .unix(exifData.DateTimeOriginal)
            .toISOString();
          const orientation = exifData.Orientation || 1; // Default orientation is 1
          const dimensions = await getImageDimensions(
            tempFilePath,
            orientation
          );
          const blurhash = await getBlurhash(tempFilePath, dimensions);

          const metadata = {
            blurhash,
            fileName: imageName,
            exifData,
            createdDate,
            ...dimensions,
          };
          const metadataKey = `${imageName}.json`;

          // Save metadata to Netlify Blobs
          await metadataStore.set(
            metadataKey,
            JSON.stringify(metadata, null, 2)
          );
          console.log(`Added metadata for image: ${imageName}`);
        }

        // Clean up temporary file
        await fs.promises.unlink(tempFilePath);

        // Trigger a new build on the Netlify app
        const netlifyApiUrl = `https://api.netlify.com/api/v1/sites/${siteID}/builds`;

        const buildResponse = await fetch(netlifyApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });

        if (buildResponse.ok) {
          console.log("Build triggered successfully");
        } else {
          console.error("Error triggering build:", buildResponse.statusText);
        }
      } else {
        console.log(`Image already exists: ${imageName}`);
      }
    }

    return {
      statusCode: 200,
      body: "Images and metadata synced successfully",
    };
  } catch (error) {
    console.error("Error syncing images and metadata:", error);
    return {
      statusCode: 500,
      body: "Error syncing images and metadata",
    };
  }
};
