import * as stylex from "@stylexjs/stylex";
import { scaleTitlebar } from "@/state";

const styles = stylex.create({
  title: {
    fontFamily: "Twinkle Star, sans-serif",
    "-webkit-text-stroke-width": 1,
    "-webkit-text-stroke-color": "var(--secondary-color)",
    color: "var(--secondary-color)",
    position: 'fixed',
    left: 85,
    transition: "transform 0.2s ease, left 0.2s ease",
    zIndex: 2,
  },
  smaller: {
    transform: "scale(0.7)",
    transformOrigin: "left",
    left: 24,
  },
});

const Title = () => (
  <h1
    className={`scale-${scaleTitlebar.value}`}
    {...stylex.props(styles.title, scaleTitlebar.value && styles.smaller)}
  >
    Life of Jupiter
  </h1>
);

export default Title;