import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  const construction = getStore('jupiter-images');
  const { name } = event.queryStringParameters;

  const { data, metadata } = await construction.getWithMetadata(name, { type: 'blob' });

  if (!data) {
    return {
      statusCode: 404,
      body: 'Image not found',
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': metadata.contentType },
    body: data,
    isBase64Encoded: true,
  };
};