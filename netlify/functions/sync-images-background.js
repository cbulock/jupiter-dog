const { Dropbox } = require("dropbox");
const { getStore } = require("@netlify/blobs");
const fs = require("fs");
const path = require("path");
const os = require("os");

exports.handler = async (event, context) => {
  try {
    // Set up the Dropbox API client
    const dropboxAccessToken = process.env.DROPBOX_ACCESS_TOKEN;
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

    // Get the Netlify Blobs store
    const store = getStore("jupiter-images");

    // Download and save the images to Netlify Blobs
    for (const file of imageFiles) {
      const imagePath = file.path_display;
      const imageName = file.name;

      // Check if the image file already exists in the Netlify Blobs store
      const existingImage = await store.get(imageName);
      if (!existingImage) {
        // Download the image from Dropbox
        const response = await dropbox.filesDownload({ path: imagePath });
        const imageData = response.result.fileBinary;

        // Save the image to Netlify Blobs
        await store.set(imageName, imageData, { metadata: { contentType: response.result.fileMetadata.mimeType } });
        console.log(`Added new image: ${imageName}`);
      } else {
        console.log(`Image already exists: ${imageName}`);
      }
    }

    return {
      statusCode: 200,
      body: "Images synced successfully",
    };
  } catch (error) {
    console.error("Error syncing images:", error);
    return {
      statusCode: 500,
      body: "Error syncing images",
    };
  }
};