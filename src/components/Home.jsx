// import { lazy } from "react";
import styles from "./Home.module.css";

import ImageCard from "@/components/ImageCard";
import JupiterHead from "@/components/JupiterHead";
// const Paw = lazy(() => import("@/components/Paw"));
import Paw from "@/components/Paw";
import Title from "@/components/Title";

import imageList from "../imageList.json";

const Home = () => (
  <main className={styles.main}>
    <header className={styles.header}>
      <div className={styles.titleContainer}>
        <JupiterHead />
        <Title />
      </div>
      <Paw />
    </header>

    <div className={styles.imageContainer}>
      {imageList?.map((imageData, index) => (
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
