import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  const construction = getStore('jupiter-images');
  const { filename, content, contentType } = JSON.parse(event.body);

  await construction.set(filename, content, { metadata: { contentType } });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Image uploaded successfully', filename }),
  };
};