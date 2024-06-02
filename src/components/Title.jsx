"use client";

import styles from "./Title.module.css";
import { useSignals } from "@preact/signals-react/runtime";
import { twinkleStar } from "@/fonts";

import clsx from "clsx";
import { scaleTitlebar } from "@/state";

const Title = () => {
  useSignals();
  return (
    <h1
      className={clsx(
        styles.title,
        `scale-${scaleTitlebar.value}`,
        scaleTitlebar.value && styles.smaller,
        twinkleStar.className
      )}
    >
      <a href="/" className={styles.titleLink}>
        Life of Jupiter
      </a>
    </h1>
  );
};

export default Title;
