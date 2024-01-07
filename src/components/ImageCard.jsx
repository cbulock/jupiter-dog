import * as stylex from "@stylexjs/stylex";

import Image from "@/components/Image";

const styles = stylex.create({
  imageWrapper: {
    height: "fit-content",
    margin: 16,
    padding: 16,
    background: "var(--light-color)",
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
    ":hover": {
      cursor: "pointer",
      transform: "scale(1.05)",
      boxShadow: "8px 8px 20px 0px rgba(0,0,0,0.75)",
    },
  },
  image: {
    borderRadius: 4,
  },
});

const newImageSize = ({ width: originalWidth, height: originalHeight }) => {
  const maxSize = 400;
  let newWidth, newHeight;

  if (originalWidth > originalHeight) {
    // Width is the larger dimension
    newWidth = maxSize;
    newHeight = (originalHeight / originalWidth) * maxSize;
  } else {
    // Height is the larger dimension or they are equal
    newHeight = maxSize;
    newWidth = (originalWidth / originalHeight) * maxSize;
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) };
};

export default ({ imageData, lazyLoad = true, setModalImage }) => {
  const { width, height, fileName } = imageData;
  const newSizes = newImageSize({ width, height });

  return (
    <div
      onClick={() => setModalImage(imageData)}
      {...stylex.props(styles.imageWrapper)}
    >
      <Image
        src={`/images/${fileName}`}
        width={newSizes.width}
        height={newSizes.height}
        lazyLoad={lazyLoad}
        style={styles.image}
      />
    </div>
  );
};
