import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
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

  return {
    statusCode: 200,
    headers: { "Content-Type": metadata.contentType },
    body: data,
    isBase64Encoded: true,
  };
};
