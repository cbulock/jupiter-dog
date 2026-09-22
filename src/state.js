import { batch, signal } from "@preact/signals-react";

export const imageList = signal([]);
export const modalImage = signal(null);
export const galleryLoading = signal(false);
export const galleryError = signal("");
export const galleryHasMore = signal(true);
let nextPage = 1;
let pendingRequest;

export function initializeGallery(page) {
  // Route changes retain the collection already loaded by the visitor.
  if (!page || imageList.value.length || pendingRequest || nextPage !== 1) return;
  imageList.value = page.data;
  galleryHasMore.value = Boolean(page.hasNextPage);
  nextPage = page.currentPage + 1;
}

// Shared by the gallery and viewer; route changes retain the loaded collection.
export function loadMoreImages({ automatic = false } = {}) {
  if (pendingRequest) return pendingRequest;
  // A queued observer callback must not restart a failed page. Only an explicit
  // retry from the gallery/viewer may clear the error.
  if (automatic && galleryError.value) return Promise.resolve(false);
  if (!galleryHasMore.value) return Promise.resolve(true);
  const requestedPage = nextPage;
  galleryLoading.value = true;
  galleryError.value = "";
  pendingRequest = (async () => {
    try {
      const response = await fetch(`/api/image/list?page=${requestedPage}&pageSize=9`);
      if (!response.ok) throw new Error("Unable to load photos");
      const result = await response.json();
      if (!Array.isArray(result.data) || result.currentPage !== requestedPage ||
          typeof result.hasNextPage !== "boolean" ||
          result.data.some((photo) => !photo || typeof photo.fileName !== "string" || !photo.fileName)) {
        throw new Error("Invalid photo response");
      }
      const seen = new Set(imageList.value.map((photo) => photo.fileName));
      const newPhotos = result.data.filter((photo) => {
        if (seen.has(photo.fileName)) return false;
        seen.add(photo.fileName);
        return true;
      });
      // Wrong/stale cached pages must not create an endless observer request loop.
      if (!newPhotos.length && result.hasNextPage) throw new Error("Photo page made no progress");
      batch(() => {
        imageList.value = [...imageList.value, ...newPhotos];
        galleryHasMore.value = result.hasNextPage;
        nextPage = requestedPage + 1;
      });
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

export function photoUrl(photo) {
  return `/.netlify/functions/get-image?name=${encodeURIComponent(photo.fileName)}${photo.version ? `&v=${encodeURIComponent(photo.version)}` : ''}`;
}
