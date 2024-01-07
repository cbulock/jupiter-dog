import * as stylex from "@stylexjs/stylex";
import { useWindowSize } from "@uidotdev/usehooks";

import Image from "@/components/Image";

const styles = stylex.create({
  backdrop: {
    background: "rgb(0 0 0 / 60%);",
    display: "none",
    height: "100lvh",
    width: "100vw",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  modal: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    height: "fit-content",
    maxHeight: "calc(100% - 96px)",
    width: "fit-content",
    maxWidth: "calc(100% - 96px)",
    background: "var(--light-color)",
    padding: 16,
    boxShadow: "10px 10px 25px 0px rgba(0,0,0,0.75)",
  },
  open: {
    display: "block",
  },
  modalContents: {
    display: "flex",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
});

const modalClick = (e) => {
  e.stopPropagation();
};

const scaleToFitWindow = ({windowWidth, windowHeight, imageWidth, imageHeight}) => {
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
}

export default ({ imageData, closeModal }) => {
  const windowSize = useWindowSize();
  const imageSize = scaleToFitWindow({windowWidth:windowSize.width *.8, windowHeight: windowSize.height*.8, imageWidth: imageData?.width, imageHeight:imageData?.height})

  return (
    <div
      onClick={closeModal}
      {...stylex.props(styles.backdrop, imageData && styles.open)}
    >
      <div onClick={modalClick} {...stylex.props(styles.modal)}>
        <div {...stylex.props(styles.modalContents)}>
          {imageData && (
            <Image
              src={`/images/${imageData?.fileName}`}
              alt="Image of Jupiter"
              height={imageSize.height}
              width={imageSize.width}
            />
          )}
        </div>
      </div>
    </div>
  );
};
