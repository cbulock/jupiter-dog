'use client';

import styles from './KeyboardHandler.module.scss';
import { useSignals } from "@preact/signals-react/runtime";

import { modalImage } from "@/state";

const handleKeyDown = (event) => {
  event.preventDefault();

  switch (event.key) {
    case "Escape":
      modalImage.value = null;
      break;
  }
};

const KeyboardHandler = ({ children }) => { 
  useSignals();
  return (
  <div
    onKeyDown={handleKeyDown}
    tabIndex={-1}
    className={styles.keyboard}
  >
    {children}
  </div>
)};

export default KeyboardHandler;