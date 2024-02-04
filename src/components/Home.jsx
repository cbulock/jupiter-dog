import { lazy } from "react";
import * as stylex from "@stylexjs/stylex";

import ImageCard from "@/components/ImageCard";
import JupiterHead from "@/components/JupiterHead";
const Paw = lazy(() => import("@/components/Paw"));
import Title from "@/components/Title";

import imageList from "../imageList.json";

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    top: 8,
    left: 0,
    zIndex: 2,
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

const Home = () => (
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
          lazyLoad={index > 7}
        />
      ))}
    </div>
  </main>
);

export default Home;