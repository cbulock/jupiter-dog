'use client';

import { useEffect } from 'react';
import { useSignals } from "@preact/signals-react/runtime";
import { useWindowScroll } from "@uidotdev/usehooks";

import { scaleTitlebar } from "@/state";

const ScrollHandler = () => {
  useSignals();
  const [{ y: scrollY }] = useWindowScroll();

  useEffect(() => {
    scaleTitlebar.value = scrollY > 100;
  }, [scrollY]);

  return null;
};

export default ScrollHandler;