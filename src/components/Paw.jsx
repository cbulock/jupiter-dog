'use client';

import styles from "./Paw.module.scss";
import { useSignals } from "@preact/signals-react/runtime";
import clsx from "clsx";
import { scaleTitlebar } from "@/state";
import PawImage from "@/assets/paw.svg";

const handleClick = () => {
  const bark = new Audio("bark.mp3");
  bark.play();
};

const Paw = () => {
  useSignals();
  return (
    <div
      onClick={handleClick}
      className={clsx(styles.wrapper, `scale-${scaleTitlebar.value}`)}
    >
      <PawImage className={styles.svg} />
    </div>
  );
};

export default Paw;
