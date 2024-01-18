import { useWindowScroll } from "@uidotdev/usehooks";

import { scaleTitlebar } from "@/state";

export default () => {
  const [{ y: scrollY }] = useWindowScroll();

  scaleTitlebar.value = scrollY > 100
  return null;
};
