"use client";

import { useEffect, useRef } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { imageList, modalImage, galleryLoading, galleryError, galleryHasMore, loadMoreImages } from "@/state";
import styles from "./ImageLoader.module.css";

export default function ImageLoader() {
  useSignals();
  const sentinel = useRef(null);
  const loading = galleryLoading.value;
  const error = galleryError.value;
  const hasMore = galleryHasMore.value;
  const viewerOpen = Boolean(modalImage.value);
  useEffect(() => {
    if (viewerOpen || loading || error || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMoreImages();
    }, { rootMargin: "300px" });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, error, hasMore, viewerOpen]);

  return (
    <div className={styles.loader} ref={sentinel}>
      {loading && imageList.value.length === 0 && (
        <div className={styles.skeletons} aria-hidden="true"><span /><span /><span /></div>
      )}
      <div role="status" aria-live="polite">
        {loading && <p className={styles.loading}><span aria-hidden="true">✳</span> Fetching the good stuff…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && !hasMore && (
          <p className={styles.end}>{imageList.value.length ? "You’re all caught up. Good human." : "The camera roll is waiting for its first adventure."}<span aria-hidden="true"> ♡</span></p>
        )}
      </div>
      {error && <button onClick={loadMoreImages}>Try again <span aria-hidden="true">↻</span></button>}
      {!loading && !error && hasMore && <button onClick={loadMoreImages}>More Jupiter <span aria-hidden="true">↓</span></button>}
    </div>
  );
}
