import styles from "./ImageModal.module.css";
import { useSignals } from "@preact/signals-react/runtime";
import clsx from "clsx";
import { useWindowSize } from "@uidotdev/usehooks";
import { useState, useEffect } from "react";
import { merriweatherSans } from "@/fonts";

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
  const [imageDetails, setImageDetails] = useState({});

  const windowSize = useWindowSize();
  const imageSize = scaleToFitWindow({
    windowWidth: windowSize.width * 0.8,
    windowHeight: windowSize.height * 0.8,
    imageWidth: modalImage.value?.width,
    imageHeight: modalImage.value?.height,
  });

  const fileName = modalImage.value?.fileName;
  useEffect(() => {
    setImageDetails({});
    const loadImageDetails = async () => {
      const response = await fetch(`/api/image/details?image=${fileName}`);
      setImageDetails(await response.json());
    };

    loadImageDetails();
  }, [fileName]);

  const dateString = imageDetails?.data?.createdDate;
  let formattedDate;
  if (dateString) {
    const date = new Date(dateString);
    formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }

  return (
    <div
      onClick={() => (modalImage.value = null)}
      className={clsx(styles.backdrop, modalImage.value && styles.open)}
    >
      <div onClick={modalClick} className={styles.modal}>
        <div className={clsx(styles.modalContents, merriweatherSans.className)}>
          {modalImage.value && (
            <>
              <div className={styles.imageContainer}>
                <Image
                  src={`/.netlify/functions/get-image?name=${modalImage.value?.fileName}`}
                  alt="Image of Jupiter"
                  blurhash={modalImage.value?.blurhash}
                  height={imageSize.height}
                  width={imageSize.width}
                />
              </div>
              <div className={styles.dateContainer}>
                <p>{formattedDate}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
