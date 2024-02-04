import { useEffect } from 'react';
import { useWindowScroll } from "@uidotdev/usehooks";

import { scaleTitlebar } from "@/state";

const ScrollHandler = () => {
  const [{ y: scrollY }] = useWindowScroll();

  useEffect(() => {
    scaleTitlebar.value = scrollY > 100;
  }, [scrollY]);

  return null;
};

export default ScrollHandler;