import { getStore } from "@netlify/blobs";
import exampleData from "./example-data.json";

const isDev = process.env.NODE_ENV === "development";

export const GET = async (request, response) => {
  if (isDev) return Response.json(exampleData);

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const store = getStore({ name: "jupiter-images-metadata", siteID, token });

  const searchParams = request.nextUrl.searchParams;
  const image = searchParams.get("image");
  const name = `${image}.json`;

  const data =
    (await store.getWithMetadata(name, {
      type: "json",
    })) || {};

  return Response.json(data);
};
