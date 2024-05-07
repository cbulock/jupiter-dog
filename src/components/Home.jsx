import styles from "./Home.module.css";

import ImageCard from "@/components/ImageCard";
import JupiterHead from "@/components/JupiterHead";
import Paw from "@/components/Paw";
import Title from "@/components/Title";

const Home = async () => {
  const response = await fetch('/api/image/list?pageSize=500');
  const data = await response.json();

  const imageList = data.data;

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
};

export default Home;
