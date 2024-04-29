import styles from './ImageCard.module.scss';
import { useSignals } from "@preact/signals-react/runtime";
import Image from "@/components/Image";
import { modalImage } from "@/state";

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

const ImageCard = ({ imageData, lazyLoad = true }) => {
  useSignals();
  const { blurhash, width, height, fileName } = imageData;
  const newSizes = newImageSize({ width, height });

  return (
    <div
      onClick={() => (modalImage.value = imageData)}
      className={styles.imageWrapper}
    >
      <Image
        src={`/images/${fileName}`}
        blurhash={blurhash}
        width={newSizes.width}
        height={newSizes.height}
        lazyLoad={lazyLoad}
        className={styles.image}
      />
    </div>
  );
};

export default ImageCard;
