import * as stylex from "@stylexjs/stylex";

const isDev = import.meta.env.DEV;

export default ({ src, width, height, lazyLoad = false, style }) => {
  const imagePath = isDev
    ? src
    : `https://jupiter.dog/.netlify/images?url=${src}&w=${width}&h=${height}`;
  return (
    <img
      src={imagePath}
      width={width}
      height={height}
      loading={lazyLoad ? "lazy" : "eager"}
      {...stylex.props(style)}
    />
  );
};
