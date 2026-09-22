import { signal } from "@preact/signals-react";

export const imageList = signal([]);
export const modalImage = signal(null);
export const galleryLoading = signal(false);
export const galleryError = signal("");
export const galleryHasMore = signal(true);
let nextPage = 1;
let pendingRequest;

// Shared by the gallery and viewer; route changes retain the loaded collection.
export function loadMoreImages() {
  if (pendingRequest) return pendingRequest;
  if (!galleryHasMore.value) return Promise.resolve(true);
  galleryLoading.value = true;
  galleryError.value = "";
  pendingRequest = (async () => {
    try {
      const response = await fetch(`/api/image/list?page=${nextPage}&pageSize=9`);
      if (!response.ok) throw new Error("Unable to load photos");
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error("Invalid photo response");
      const seen = new Set(imageList.value.map((photo) => photo.fileName));
      imageList.value = [...imageList.value, ...result.data.filter((photo) => {
        if (seen.has(photo.fileName)) return false;
        seen.add(photo.fileName);
        return true;
      })];
      galleryHasMore.value = Boolean(result.hasNextPage);
      nextPage += 1;
      return true;
    } catch {
      galleryError.value = "The photos took a detour. Let’s try that again.";
      return false;
    } finally {
      galleryLoading.value = false;
      pendingRequest = null;
    }
  })();
  return pendingRequest;
}

export function photoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
