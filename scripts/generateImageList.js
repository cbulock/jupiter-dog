const { getStore } = require("@netlify/blobs");
const fs = require('fs').promises;
const path = require('path');
const dayjs = require('dayjs');

async function generateImageList() {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    const metadataStore = getStore({ name: 'jupiter-images-metadata', siteID, token });

    // List all metadata files in the store
    const metadataList = await metadataStore.list();

    const imageFiles = [];

    for (const metadata of metadataList.blobs) {
      const metadataKey = metadata.key;
      const metadataContent = await metadataStore.get(metadataKey, { type: 'json' });

      if (metadataContent) {
        const { exifData, ...metadataWithoutExif } = metadataContent;
        imageFiles.push(metadataWithoutExif);
      }
    }

    // Sort images by creation date, newest first
    imageFiles.sort((a, b) => dayjs(b.createdDate).unix() - dayjs(a.createdDate).unix());

    // Write the combined metadata to a file
    const outputFilePath = path.join(process.cwd(), 'src', 'imageList.json');
    await fs.writeFile(outputFilePath, JSON.stringify(imageFiles, null, 2));
    console.log('Combined image metadata file generated successfully.');
  } catch (error) {
    console.error('Error building metadata file:', error);
  }
}

generateImageList();
