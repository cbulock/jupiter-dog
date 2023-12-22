import * as stylex from "@stylexjs/stylex";

import Image from "@/components/Image";
import ImageCard from "@/components/ImageCard";
import Title from "@/components/Title";

import imageList from "./imageList.json";
import "./App.css";

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  imageContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
});

function App() {
  return (
    <>
      <header {...stylex.props(styles.header)}>
        <Image src={"/android-chrome-192x192.png"} width={64} height={64} />
        <Title />
      </header>

      <div {...stylex.props(styles.imageContainer)}>
        {imageList.map((imageData) => (
          <ImageCard key={imageData.fileName} imageData={imageData} />
        ))}
      </div>
    </>
  );
}

export default App;
