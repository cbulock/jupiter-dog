"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";
import clsx from "clsx";
import styles from "./Image.module.css";

export default function Image({ alt = "", blurhash, src, width, height, lazyLoad = false, className, sizes, onError }) {
  const [background, setBackground] = useState();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef(null);
  useEffect(() => {
    setLoaded(Boolean(imageRef.current?.complete && imageRef.current?.naturalWidth));
    setFailed(false);
    setBackground(undefined);
    if (!blurhash) return;
    try {
      // A tiny placeholder is sufficient; avoid decoding full-resolution canvases.
      const pixels = decode(blurhash, 32, 32);
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d");
      context.putImageData(new ImageData(pixels, 32, 32), 0, 0);
      setBackground(`url(${canvas.toDataURL()})`);
    } catch {
      // A malformed optional placeholder must not prevent the photo from loading.
    }
  }, [src, blurhash]);
  return (
    <span className={clsx(styles.frame, className)} style={{ aspectRatio: `${width} / ${height}`, backgroundImage: loaded || failed ? undefined : background }}>
      {!failed ? (
        <NextImage
          ref={imageRef}
          src={src} alt={alt} width={width} height={height}
          sizes={sizes} loading={lazyLoad ? "lazy" : "eager"}
          className={clsx(styles.image, loaded && styles.loaded)}
          onLoad={() => setLoaded(true)} onError={() => { setFailed(true); onError?.(); }}
          // The importer already creates the delivery-sized image. Serve that version directly
          // so function URLs do not depend on a second Next.js image-optimization request.
          unoptimized
        />
      ) : (
        <span className={styles.failed} role="img" aria-label={`${alt} — unavailable`}>
          <span aria-hidden="true">☁</span>
          Photo taking a little nap.
          <small>Please try again in a moment.</small>
        </span>
      )}
    </span>
  );
}
