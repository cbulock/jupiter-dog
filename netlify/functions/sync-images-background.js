const { Dropbox } = require("dropbox");
const { getStore } = require("@netlify/blobs");
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  try {
    // Dropbox credentials
    const clientId = process.env.DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

    // Function to refresh the Dropbox access token
    async function refreshAccessToken() {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Error refreshing access token: ${data.error_description}`);
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
        const imageData = Buffer.from(response.result.fileBinary, 'binary');

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