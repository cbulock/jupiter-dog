import * as stylex from "@stylexjs/stylex";

import ImageCard from "@/components/ImageCard";
import JupiterHead from "@/components/JupiterHead";
import Paw from "@/components/Paw";
import Title from "@/components/Title";

import imageList from "./imageList.json";
import "./App.css";

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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

function App() {
  return (
    <>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.titleContainer)}>
          <JupiterHead />
          <Title />
        </div>
        <Paw />
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
