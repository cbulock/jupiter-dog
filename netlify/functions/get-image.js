const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const store = getStore({ name: "jupiter-images", siteID, token });
  const { name } = event.queryStringParameters;

  const { data, metadata } = await store.getWithMetadata(name, {
    type: "blob",
  });

  if (!data) {
    return {
      statusCode: 404,
      body: "Image not found",
    };
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": metadata.contentType,
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
    },
    body: buffer.toString("base64"), // Return as base64
    isBase64Encoded: true,
  };
};
