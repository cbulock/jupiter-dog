import styles from "./ImageModal.module.css";
import { useSignals } from "@preact/signals-react/runtime";
import clsx from "clsx";
import { useWindowSize } from "@uidotdev/usehooks";

import Image from "@/components/Image";
import { modalImage } from "@/state";

const modalClick = (e) => {
  e.stopPropagation();
};

const scaleToFitWindow = ({
  windowWidth,
  windowHeight,
  imageWidth,
  imageHeight,
}) => {
  let newWidth, newHeight;

  // Calculate the aspect ratios
  const windowAspectRatio = windowWidth / windowHeight;
  const imageAspectRatio = imageWidth / imageHeight;

  // Compare aspect ratios to decide whether to fit to width or height
  if (imageAspectRatio > windowAspectRatio) {
    // Image is wider in proportion to the window - fit to window width
    newWidth = windowWidth;
    newHeight = windowWidth / imageAspectRatio;
  } else {
    // Image is taller in proportion to the window - fit to window height
    newHeight = windowHeight;
    newWidth = windowHeight * imageAspectRatio;
  }

  // Ensure the image does not exceed window size
  newWidth = Math.min(newWidth, windowWidth);
  newHeight = Math.min(newHeight, windowHeight);

  return { width: Math.round(newWidth), height: Math.round(newHeight) };
};

const ImageModal = () => {
  useSignals();
  const windowSize = useWindowSize();
  const imageSize = scaleToFitWindow({
    windowWidth: windowSize.width * 0.8,
    windowHeight: windowSize.height * 0.8,
    imageWidth: modalImage.value?.width,
    imageHeight: modalImage.value?.height,
  });

  return (
    <div
      onClick={() => (modalImage.value = null)}
      className={clsx(styles.backdrop, modalImage.value && styles.open)}
    >
      <div onClick={modalClick} className={styles.modal}>
        <div className={styles.modalContents}>
          {modalImage.value && (
            <Image
              src={`/images/${modalImage.value?.fileName}`}
              alt="Image of Jupiter"
              blurhash={modalImage.value?.blurhash}
              height={imageSize.height}
              width={imageSize.width}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
