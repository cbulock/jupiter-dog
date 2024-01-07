import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  title: {
    fontFamily: "Twinkle Star, sans-serif",
    "-webkit-text-stroke-width": 1,
    "-webkit-text-stroke-color": "var(--secondary-color)",
    color: "var(--secondary-color)",
  },
});

export default () => (
  <h1 {...stylex.props(styles.title)}>Life of Jupiter</h1>
);
