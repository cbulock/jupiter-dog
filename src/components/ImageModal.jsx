"use client";

import { useEffect, useRef, useState } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import Image from "./Image";
import { imageList, modalImage, galleryHasMore, galleryError, galleryLoading, loadMoreImages, photoDate, photoUrl } from "@/state";
import styles from "./ImageModal.module.css";

export default function ImageModal() {
  useSignals();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const touch = useRef(null);
  const navigating = useRef(false);
  const [retry, setRetry] = useState(0);
  const [failedImage, setFailedImage] = useState(null);
  const photo = modalImage.value;
  const imageKey = `${photo?.fileName}-${retry}`;
  const open = Boolean(photo);
  const index = imageList.value.findIndex((item) => item.fileName === photo?.fileName);
  const hasNext = index < imageList.value.length - 1 || galleryHasMore.value;
  const loading = galleryLoading.value;
  const date = photoDate(photo?.createdDate);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  function close() { modalImage.value = null; setFailedImage(null); }

  async function navigate(direction) {
    if (navigating.current) return;
    const selected = modalImage.value;
    if (!selected) return;
    const currentIndex = imageList.value.findIndex((item) => item.fileName === selected.fileName);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0) return;
    navigating.current = true;
    try {
      if (targetIndex >= imageList.value.length && galleryHasMore.value) {
        if (!await loadMoreImages()) return;
      }
      // A close or route change while loading must not reopen the viewer.
      if (modalImage.value !== selected) return;
      const next = imageList.value[targetIndex];
      if (next) { modalImage.value = next; setRetry(0); setFailedImage(null); }
    } finally {
      navigating.current = false;
    }
  }

  function onKeyDown(event) {
    if (event.key === "Tab") {
      const controls = [...dialogRef.current.querySelectorAll("button:not(:disabled)")];
      const current = controls.indexOf(document.activeElement);
      const next = event.shiftKey
        ? (current <= 0 ? controls.length - 1 : current - 1)
        : (current + 1) % controls.length;
      event.preventDefault();
      controls[next]?.focus();
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      navigate(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function onTouchEnd(event) {
    const start = touch.current;
    touch.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="viewer-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={onKeyDown}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      {photo && (
        <div className={styles.viewer}>
          <header className={styles.topbar}>
            <h2 id="viewer-title">A moment with Jupiter<span>.</span></h2>
            <button ref={closeRef} onClick={close} aria-label="Close photo viewer" className={styles.close}>×</button>
          </header>
          <div className={styles.stage}
            onTouchStart={(event) => { touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
            onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null; }}
          >
            <Image key={imageKey} className={styles.photo}
              src={photoUrl(photo)}
              alt={`Jupiter${date ? ` on ${date}` : ""}`}
              blurhash={photo.blurhash} width={photo.width} height={photo.height}
              sizes="(max-width: 700px) 95vw, 85vw"
              onError={() => setFailedImage(imageKey)}
            />
          </div>
          <footer className={styles.controls}>
            <div className={styles.details} aria-live="polite" aria-atomic="true">
              {date && <time dateTime={photo.createdDate}>{date}</time>}
              <span>Photo {index + 1}{!galleryHasMore.value && ` of ${imageList.value.length}`}</span>
            </div>
            {failedImage === imageKey && (
              <button className={styles.retry} onClick={() => {
                closeRef.current?.focus();
                setRetry((value) => value + 1);
              }}>Try photo again</button>
            )}
            <div className={styles.arrows}>
              <button onClick={() => navigate(-1)} disabled={index <= 0 || loading} aria-label="Previous photo">←</button>
              <button onClick={() => navigate(1)} disabled={!hasNext || loading} aria-label="Next photo">→</button>
            </div>
          </footer>
          {loading && <p className={styles.status} role="status">Fetching the next photos…</p>}
          {galleryError.value && <div className={styles.status} role="status">{galleryError.value} <button onClick={() => navigate(1)}>Try again</button></div>}
        </div>
      )}
    </dialog>
  );
}
