import * as stylex from "@stylexjs/stylex";

const isDev = import.meta.env.DEV;

const imagePath = ({ src, width, height }) => {
  if (isDev) return src;
  return width && height
    ? `/cdn/images?url=${src}&w=${width}&h=${height}`
    : `/cdn/images?url=${src}`;
};

export default ({ alt = "", src, width, height, lazyLoad = false, style }) => {
  const srcSet =
    width && height
      ? `${imagePath({ src, width, height })}, ${imagePath({
          src,
          width: width * 2,
          height: height * 2,
        })} 2x, ${imagePath({ src, width: width * 3, height: height * 3 })} 3x`
      : imagePath({ src });

  return (
    <img
      loading={lazyLoad ? "lazy" : "eager"}
      alt={alt}
      src={imagePath({ src, width, height })}
      srcSet={srcSet}
      width={width}
      height={height}
      {...stylex.props(style)}
    />
  );
};
