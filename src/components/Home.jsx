"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useEffect } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import ImageCard from "./ImageCard";
import ImageLoader from "./ImageLoader";
import ImageModal from "./ImageModal";
import { imageList, modalImage, initializeGallery } from "@/state";
import styles from "./Home.module.css";

export default function Home({ initialPage }) {
  useSignals();
  const photos = imageList.value.length ? imageList.value : initialPage?.data || [];
  useEffect(() => { initializeGallery(initialPage); }, [initialPage]);
  useEffect(() => () => { modalImage.value = null; }, []);
  return (
    <>
      <section className={styles.intro} aria-labelledby="intro-title">
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}><span aria-hidden="true">✳</span> THE LIFE &amp; TIMES OF JUPITER</p>
          <h1 id="intro-title">A very good dog.<br />A very full <span>camera roll<svg viewBox="0 0 370 18" fill="none" aria-hidden="true"><path d="M4 12C80 1 216 2 364 8M48 16C127 8 267 8 329 13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>.</h1>
          <p className={styles.description}>Little moments. Big ears. All Jupiter.</p>
          <Link href="/facts" className={styles.meetLink}>Meet the dog behind the photos <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.portrait}>
          <div className={styles.portraitCircle} />
          <NextImage src="/jupiter.png" alt="Jupiter, ears out and ready for his close-up" width={340} height={340} sizes="(max-width: 479px) 106px, (max-width: 700px) 135px, (max-width: 1000px) 240px, 300px" priority className={styles.dog} />
          <span className={styles.spark} aria-hidden="true">✳</span>
          <span className={styles.hello} aria-hidden="true">oh, hi!<svg viewBox="0 0 80 55" fill="none"><path d="M6 3C62 0 67 16 45 45M44 31L43 46L58 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className={styles.sticker}>100%<br /><strong>good boy</strong></span>
        </div>
      </section>
      <section className={styles.gallery} aria-labelledby="gallery-title">
        <div className={styles.galleryHeading}>
          <h2 id="gallery-title">The camera roll<span aria-hidden="true">.</span></h2>
          <span className={styles.galleryNote}>Life, one photo at a time.</span>
          <span className={styles.sort}><span aria-hidden="true">↓</span> Newest first</span>
        </div>
        <div className={styles.imageContainer}>
          {photos.map((photo, index) => <ImageCard key={photo.fileName} imageData={photo} index={index} lazyLoad={index > 0} />)}
        </div>
        <ImageLoader />
      </section>
      <ImageModal />
    </>
  );
}
