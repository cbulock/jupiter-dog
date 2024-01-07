import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  modal: {
    display: "none",
    position: "absolute",
    top: 75,
    left: 75,
    zIndex: 500,
    padding: 32,
    background: "var(--raspberry)",
    fontSize: "2rem",
    borderRadius: '12px',
    boxShadow: "5px 5px 30px 0px rgba(0,0,0,0.75)",
  },
  open: {
    display: "block",
  },
  modalContents: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: "100%",
    width: "calc(90vw - 150px)",
    fontFamily: "Merriweather Sans, sans-serif",
    color: "var(--secondary-color)",
  },
  triangle: {
    position: 'absolute',
    top: '-20px',
    left: '-10px',
    transform: 'rotate(320deg)',
    width: 0,
    height: 0,
    "border-left": '15px solid transparent', // this seems like a styleX bug, can't used borderLeft
    borderRight: '15px solid transparent',
    borderBottom: '40px solid var(--raspberry)',
  },
  header: {
    fontWeight: 800,
  },
});

const modalClick = (e) => {
  e.stopPropagation();
};

export default ({ isOpen = false, closeModal }) => {
  return (
    <div
      onClick={modalClick}
      {...stylex.props(styles.modal, isOpen && styles.open)}
    >
      <div {...stylex.props(styles.triangle)} />
      <div {...stylex.props(styles.modalContents)}>
        <h3 {...stylex.props(styles.header)}>Jupiter Facts</h3>
        <ul>
          <li>Born June 27, 2018</li>
          <li>30 Pounds</li>
          <li>Gottcha Day: Sept 1, 2018</li>
          <li>Breed</li>
        </ul>
      </div>
    </div>
  );
};
