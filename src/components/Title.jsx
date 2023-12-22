import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  title: {
    fontFamily: "Twinkle Star",
    "-webkit-text-stroke-width": 1,
    "-webkit-text-stroke-color": "#e5eb35",
    color: "#e5eb35",
  },
});

export default () => (
  <h1 {...stylex.props(styles.title)}>Life of Jupiter</h1>
);
