import { lazy, useState } from "react";
import * as stylex from "@stylexjs/stylex";

import ImageCard from "@/components/ImageCard";
import ImageModal from "@/components/ImageModal";
import JupiterHead from "@/components/JupiterHead";
const Paw = lazy(() => import("@/components/Paw"));
import Title from "@/components/Title";

import imageList from "./imageList.json";
import "./App.css";

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  main: {
    margin: 8,
  },
  imageContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
});

export default () => {
  const [modalImage, setModalImage] = useState(null);

  const closeModal = () => {
    setModalImage(null);
  };

  return (
    <>
      <main {...stylex.props(styles.main)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.titleContainer)}>
            <JupiterHead />
            <Title />
          </div>
          <Paw />
        </header>

        <div {...stylex.props(styles.imageContainer)}>
          {imageList.map((imageData, index) => (
            <ImageCard
              key={imageData.fileName}
              imageData={imageData}
              setModalImage={setModalImage}
              lazyLoad={index > 7}
            />
          ))}
        </div>
      </main>
      <ImageModal imageData={modalImage} closeModal={closeModal} />
    </>
  );
};
