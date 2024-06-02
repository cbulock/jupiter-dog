'use client';

import styles from "./Home.module.css";
import { useSignals } from "@preact/signals-react/runtime";
import ImageCard from "@/components/ImageCard";
import ImageLoader from "@/components/ImageLoader";
import ImageModal from "@/components/ImageModal";
import { imageList } from "@/state";

const Home = () => {
  useSignals();

  return (
    <>
      <div className={styles.imageContainer}>
        {imageList.value.map((imageData, index) => (
          <ImageCard
            key={imageData.fileName}
            imageData={imageData}
            lazyLoad={index > 7}
          />
        ))}
      </div>
      <ImageLoader />
      <ImageModal />
    </>
  );
};

export default Home;
