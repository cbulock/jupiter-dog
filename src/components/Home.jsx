import styles from "./Home.module.css";
import { useSignals } from "@preact/signals-react/runtime";
import ImageCard from "@/components/ImageCard";
import ImageLoader from "@/components/ImageLoader";
import JupiterHead from "@/components/JupiterHead";
import Paw from "@/components/Paw";
import Title from "@/components/Title";
import { imageList } from "@/state";

const Home = () => {
  useSignals();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.titleContainer}>
          <JupiterHead />
          <Title />
        </div>
        <Paw />
      </header>

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
    </main>
  );
};

export default Home;
