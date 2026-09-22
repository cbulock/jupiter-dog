"use client";

import { useRef, useState, useEffect } from "react";
import PawImage from "@/assets/paw.svg";
import styles from "./Paw.module.scss";

export default function Paw() {
  const audio = useRef(null);
  const timer = useRef(null);
  const [message, setMessage] = useState("");
  useEffect(() => () => {
    clearTimeout(timer.current);
    audio.current?.pause();
  }, []);
  async function bark() {
    audio.current ??= new Audio("/bark.mp3");
    audio.current.currentTime = 0;
    try {
      await audio.current.play();
      setMessage("Woof!");
    } catch {
      setMessage("Sound couldn’t play. Try again!");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 2400);
  }
  return (
    <div className={styles.wrapper}>
      <span className={styles.hint} aria-hidden="true">say hello</span>
      <button className={styles.button} onClick={bark} aria-label="Say hello — play Jupiter’s bark" title="Give me a boop!">
        <PawImage aria-hidden="true" />
      </button>
      <span className={styles.message} role="status">{message}</span>
    </div>
  );
}
