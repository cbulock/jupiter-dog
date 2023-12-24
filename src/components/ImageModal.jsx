import * as stylex from "@stylexjs/stylex";

import Image from "@/components/Image";

const styles = stylex.create({
  backdrop: {
    background: "rgb(0 0 0 / 60%);",
    display: "none",
    height: "100vh",
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
    height: "calc(100% - 96px)",
    width: "fit-content",
    maxWidth: "calc(100% - 96px)",
    background: "#FFF",
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

export default ({ imageData, closeModal }) => {
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
            />
          )}
        </div>
      </div>
    </div>
  );
};
