import * as stylex from "@stylexjs/stylex";
import { scaleTitlebar } from "@/state";
import PawImage from "@/assets/paw.svg?react";

const styles = stylex.create({
  wrapper: {
    height: 48,
    width: 48,
    padding: 16,
    cursor: "url('paw.svg'), auto",
    ":active": {
      transform: "scale(0.95)",
    },
    ":hover svg": {
      filter: "brightness(120%)",
    },
  },
  smaller: {
    transform: "scale(0.7)",
    transformOrigin: "right",
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

export default () => (
  <div
    onClick={handleClick}
    className={`scale-${scaleTitlebar.value}`}
    {...stylex.props(styles.wrapper, scaleTitlebar.value && styles.smaller)}
  >
    <PawImage {...stylex.props(styles.svg)} />
  </div>
);
