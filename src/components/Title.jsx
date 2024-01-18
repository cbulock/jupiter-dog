import * as stylex from "@stylexjs/stylex";
import { scaleTitlebar } from "@/state";

const styles = stylex.create({
  title: {
    fontFamily: "Twinkle Star, sans-serif",
    "-webkit-text-stroke-width": 1,
    "-webkit-text-stroke-color": "var(--secondary-color)",
    color: "var(--secondary-color)",
  },
  smaller: {
    transform: "scale(0.7)",
    transformOrigin: "left",
  },
});

export default () => (
  <h1
    className={`scale-${scaleTitlebar.value}`}
    {...stylex.props(styles.title, scaleTitlebar.value && styles.smaller)}
  >
    Life of Jupiter
  </h1>
);
