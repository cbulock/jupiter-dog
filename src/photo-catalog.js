import { unstable_cache } from "next/cache";
import imageList from "./imageList.json";
import storage from "../netlify/lib/storage";
import photos from "../netlify/lib/photos";

// Cache the first server-rendered page's catalog at runtime.
// Never read photo stores at build time; updates remain visible within 30 seconds.
const cachedCatalog = unstable_cache(
  () => photos.catalog(storage.stores()),
  ["public-photo-catalog"],
  { revalidate: 30 },
);

export async function photoPage(page = 1, pageSize = 9, cached = true) {
  const fixture = process.env.PHOTO_CATALOG_MODE === "fixture" && process.env.NODE_ENV === "development";
  const list = fixture ? imageList.map((photo) => photos.publicPhoto(photo)).filter(Boolean)
    : await (cached ? cachedCatalog() : photos.catalog(storage.stores()));
  const totalPages = Math.ceil(list.length / pageSize);
  return { currentPage: page, currentPageSize: pageSize,
    data: list.slice((page - 1) * pageSize, page * pageSize),
    hasNextPage: page < totalPages, hasPrevPage: page > 1, totalPages };
}
