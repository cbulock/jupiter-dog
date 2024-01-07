import * as stylex from "@stylexjs/stylex";
import PawImage from "@/assets/paw.svg?react";

const styles = stylex.create({
  wrapper: {
    height: 48,
    width: 48,
    padding: 16,
    cursor: "url('paw.svg'), auto",
    transition: "transform 0.1s ease",
    ":active": {
      transform: "scale(0.95)",
    },
    ":hover svg": {
      filter: "brightness(120%)",
    },
  },
  svg: {
    transform: "rotate(30deg)",
    color: "var(--secondary-color)",
    transition: "filter 0.5s",
  },
});

const bark = new Audio("/bark.mp3");

const handleClick = () => {
  bark.play();
};

export default () => {
  return (
    <div onClick={handleClick} {...stylex.props(styles.wrapper)}>
      <PawImage {...stylex.props(styles.svg)} />
    </div>
  );
};
