const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const secret = process.env.UPLOAD_SECRET;
  if (secret && event.headers['x-upload-secret'] !== secret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const store = getStore({ name: "jupiter-images", siteID, token });
  const { filename, content, contentType } = JSON.parse(event.body);

  await store.set(filename, content, { metadata: { contentType } });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Image uploaded successfully', filename }),
  };
};