import * as stylex from "@stylexjs/stylex";

import Image from "@/components/Image";

const styles = stylex.create({
  imageWrapper: {
    height: "fit-content",
    margin: 16,
    padding: 16,
    background: "#FFF",
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

export default ({ imageData }) => {
  const { width, height, fileName } = imageData;
  const newSizes = newImageSize({ width, height });

  return (
    <div {...stylex.props(styles.imageWrapper)}>
      <Image
        src={`/images/${fileName}`}
        width={newSizes.width}
        height={newSizes.height}
        lazyLoad={true}
        style={styles.image}
      />
    </div>
  );
};
