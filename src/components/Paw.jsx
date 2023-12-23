import { useState } from "react";
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
  },
  svg: {
    transform: "rotate(30deg)",
    color: "#153a5e",
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
